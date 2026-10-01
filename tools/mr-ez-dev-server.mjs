/* A local stand-in for the two backends Mr EZ needs, so the whole experience
   can be exercised in a real browser without a Supabase project and without
   spending a cent on the OpenAI API.
 *
 * WHAT IT IS NOT: this is not the production code path and it is not a test
 * of the production code path. The Worker's real security, limits and
 * ownership logic is tested directly in tests/mr-ez-worker.test.ts, against
 * the actual handler. This file exists so a human can click through the
 * interface: sign in as two different students, hold a conversation, walk
 * between pages, clear the history, and watch the failure states.
 *
 * Every tutor reply it produces is flagged `live: false`, which makes the
 * interface label it "Simulated, not a real AI reply" everywhere it appears.
 * Nothing here should ever be presented as evidence that the live model
 * integration works.
 *
 * It speaks two protocols on one port:
 *   /auth/v1/*  and  /rest/v1/*   a minimal, in-memory Supabase
 *   /tutor                        the Mr EZ Worker's request/response shape
 *
 * /tutor answers the seven original tasks AND the three learning ones
 * (lesson-help, evaluate-practice, propose-next). The simulated versions of
 * those three are deterministic and clearly labelled, so the interface
 * packages that call them can be built and clicked through for nothing. The
 * assistance boundary (no help while a timed paper is running) and the two
 * separate daily allowances are modelled here as well, because those are
 * behaviour an interface has to handle rather than details of the Worker.
 *
 * /rest/v1/* also serves the three personal learning tables proposed in
 * supabase/migrations/2026-09-21-learning.sql (learning_events,
 * learning_plan, learning_companions), NOT applied to any real project. See
 * that file and supabase/README.md for the schema; tests/learning-sync-
 * server.test.ts exercises this stand-in's copy of it: the same batch
 * pushed twice stores one copy, one student can never read or write
 * another's rows, and a losing plan write gets back the plan that won.
 *
 * Two modes:
 *
 *   node tools/mr-ez-dev-server.mjs
 *     Simulated. No model, no key, no spend. Every reply is flagged
 *     `live: false` and the interface labels it.
 *
 *   node --import ./tests/ts-extension-loader.mjs tools/mr-ez-dev-server.mjs --live
 *     LIVE AND BILLABLE. Runs the REAL Worker handler
 *     (workers/mr-ez/src/index.ts) against the REAL OpenAI API, with this
 *     server's in-memory store standing in for Supabase. Everything on the
 *     production path is exercised except the database itself. Each message
 *     costs about $0.0005. The key is read out of the Workers' gitignored
 *     .dev.vars by this script and never printed.
 *
 * Run:  node tools/mr-ez-dev-server.mjs
 * Then point the site at it in .env:
 *   PUBLIC_SUPABASE_URL=http://127.0.0.1:8787
 *   PUBLIC_SUPABASE_ANON_KEY=local-anon-key
 *   PUBLIC_MR_EZ_URL=http://127.0.0.1:8787/tutor
 *   PUBLIC_SUPPORT_URL=http://127.0.0.1:8787/support   [R01 support] the real
 *     support Worker for signed-out visitors, see tools/stand-in/support.mjs
 *
 * Failure states can be forced with query flags on the tutor URL, so the
 * loading, retry, unavailable and limit-reached screens can all be seen:
 *   ?fail=unavailable   ?fail=busy   ?fail=limit   ?slow=3000
 *
 * THE THREE-DAY TRIAL (--trial, under the TypeScript loader):
 *
 *   node --import ./tests/ts-extension-loader.mjs tools/mr-ez-dev-server.mjs --trial
 *
 *   Still free: no model is called and no key is read. Three things change.
 *   - /rest/v1/rpc/trial_* is answered by the REAL trial migration
 *     (supabase/migrations/2026-09-23-trial.sql) running in PGlite
 *     (tools/trial-db.mjs), as the signed-in student, as anon, or as the
 *     service role, exactly as PostgREST would call it.
 *   - /tutor is answered by the REAL Mr EZ Worker handler with
 *     ACCESS_MODE=trial and TUTOR_SIMULATE=on: its auth, trial allowances,
 *     reservations, idempotency and persistence all run for real, and every
 *     reply is flagged simulated.
 *   - /grade-essay is answered by the REAL essay grader handler with
 *     ACCESS_MODE=trial. Its call to the model is answered here with a fixed
 *     assessment whose every comment says SIMULATED, so a trial Writing test
 *     can be clicked through end to end. It is not a grade.
 *   Point the site at it with PUBLIC_ACCESS_MODE=trial and
 *   PUBLIC_GRADER_URL=http://127.0.0.1:8787/grade-essay (see
 *   docs/TRIAL-IMPLEMENTATION.md). Local helpers: POST /__trial/rewind
 *   {email, minutes} ages one student's trial; GET /__trial/state shows the
 *   trial tables. POST /__force {fail: 'grader'} makes the next essay grades
 *   fail; {fail: 'save-turn', times: 2} makes Mr EZ's next two saves fail after
 *   his answer (two, because the site retries a failed request once).
 *
 *   PAID ACCESS (docs/paid-access/CONTRACT.md), also only with --trial:
 *   - the paid-access migration (supabase/migrations/2026-09-30-paid-access.sql)
 *     runs after the trial one, so /rest/v1/rpc/access_* and the paid-aware
 *     trial_status / trial_can_open answer for real;
 *   - /payments/* is the REAL payments Worker with its SIMULATED provider
 *     (point the site at it with PUBLIC_PAYMENTS_URL=http://127.0.0.1:<port>/payments
 *     and PUBLIC_PAYMENTS_SIMULATED=1);
 *   - /__pay/<orderId> is the SIMULATED provider's page, with Pay, Fail and
 *     Cancel; each sends a signed webhook to the Worker and then returns the
 *     browser to <MR_EZ_SITE_ORIGIN>/ielts-website/plans/return?order=<id>;
 *   - POST /__pay/refund {orderId} sends a signed refund; POST /__pay/expire
 *     {email} ends that student's paid access now; GET /__trial/state lists
 *     orders and grants too.
 *   No money moves, and every screen says SIMULATED.
 *
 *   THE FREE-ACCOUNT MODEL (docs/paid-access/FREE-ACCOUNT-MODEL.md), also
 *   only with --trial: every migration a project runs is loaded, ending with
 *   supabase/migrations/2026-10-01-free-account.sql, so a signed-in account
 *   with a completed profile opens every lesson through /content, practice
 *   and AI answer 402 paid-required, and the trial is refused.
 *   - Profiles saved through /rest/v1/student_profiles are copied into the
 *     database too, because the lesson door asks for a completed profile.
 *   - The STAND-IN admin is the account that signs up as
 *     MR_EZ_STAND_IN_ADMIN (default admin@example.test): it is added to
 *     public.admins, so /admin and the complimentary-access functions work
 *     for it exactly as they do for Alex, and refuse everyone else.
 *   - POST /__access/complimentary {email, action: give|renew|stop}, a
 *     STAND-IN TEST HELPER: runs the real admin function
 *     access_admin_complimentary as the stand-in admin, for scripts. The
 *     browser's admin panel calls the same function itself.
 *   - GET /__trial/state lists every grant with its kind.
 */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSupportStandIn } from './stand-in/support.mjs'; // [E trust] support requests, see that file

const PORT = Number(process.env.MR_EZ_DEV_PORT ?? 8787);
const LIVE = process.argv.includes('--live');
const TRIAL = process.argv.includes('--trial');
if (LIVE && TRIAL) {
  console.error('--trial runs simulated only, so it never spends. Drop --live.');
  process.exit(1);
}
/** The trial migration in PGlite, only with --trial. */
let trialDb = null;
/** STAND-IN ONLY: the account that becomes an admin in the local database
    when it signs up (see the header). Synthetic, never a real address. */
const STAND_IN_ADMIN = String(process.env.MR_EZ_STAND_IN_ADMIN || 'admin@example.test').trim().toLowerCase();

/** Copies a saved profile into the local database (the free account's
    lesson door asks access_profile_complete there). The database's own
    trigger checks it again. Only with --trial. */
async function mirrorProfile(row) {
  if (!trialDb || !row?.user_id) return;
  try {
    await trialDb.raw.query(
      `insert into public.student_profiles
         (user_id, first_name, last_name, date_of_birth, phone, city, occupation, source, parent_name, parent_phone, parent_consent_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (user_id) do update set
         first_name = excluded.first_name, last_name = excluded.last_name, date_of_birth = excluded.date_of_birth,
         phone = excluded.phone, city = excluded.city, occupation = excluded.occupation, source = excluded.source,
         parent_name = excluded.parent_name, parent_phone = excluded.parent_phone, parent_consent_at = excluded.parent_consent_at`,
      [row.user_id, row.first_name, row.last_name, row.date_of_birth, row.phone, row.city, row.occupation, row.source,
        row.parent_name ?? null, row.parent_phone ?? null, row.parent_consent_at ?? null],
    );
  } catch (err) {
    console.error('stand-in: could not copy a profile into the local database', err?.message ?? err);
  }
}
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ── In-memory database ────────────────────────────────────────────────── */

const db = {
  /** email -> { id, email, password, user_metadata, new_email? } */
  users: new Map(),
  /** access token -> user id */
  tokens: new Map(),
  /** user id -> { progress, study_plan } */
  userState: new Map(),
  /** student_profiles rows, keyed by user_id (supabase/migrations/
      2026-09-24-profiles.sql): one row per account, own row only for an
      anon-key caller, every row for the service role, and the same rules
      the guard_student_profile_write() trigger enforces. */
  profiles: new Map(),
  conversations: [],
  messages: [],
  turns: [],
  recommendations: new Map(),
  /** mr_ez_notes rows: { user_id, kind, note_key, fingerprint, reply }.
      Primary key is (user_id, kind, note_key), so a write with a new
      fingerprint replaces the row rather than adding one. */
  notes: [],
  /** learning_events rows: { user_id, event_id, event, occurred_at,
      activity_id, paper, mode, created_at }. Insert-only from the client,
      deduped on (user_id, event_id) exactly like the unique primary key in
      supabase/migrations/2026-09-21-learning.sql. */
  learningEvents: [],
  /** learning_plan: user_id -> { user_id, plan, revision, confirmed,
      updated_at }. One row per user, guarded by the same PLAN_CONFLICT_RULE
      (src/lib/learning/contracts/sync.ts) the migration's trigger enforces
      in the real project: confirmed beats unconfirmed, then the higher
      revision, then the later updatedAt. */
  learningPlans: new Map(),
  /** learning_companions rows: { user_id, kind, data, revision, updated_at },
      keyed by (user_id, kind). Plain last-write-wins: the sync contract
      already union-merges vocab/notes/preferences client-side by their own
      natural key before a push, so what arrives here is already merged. */
  learningCompanions: [],
  /** Set through POST /__force to make the next requests fail, so the
      interface's unavailable, busy and limit-reached states can be seen
      without restarting anything. */
  forcedFailure: null,
};

function userByToken(req) {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const id = db.tokens.get(auth.slice(7).trim());
  return id ?? null;
}

function send(res, status, body, extraHeaders = {}) {
  const payload = body === null ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Expose-Headers': 'content-range',
    ...extraHeaders,
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** The user object Supabase's auth API returns. */
function publicUser(user) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    ...(user.new_email ? { new_email: user.new_email } : {}),
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: user.user_metadata ?? {},
    identities: [],
  };
}

function session(user) {
  const accessToken = `local-${randomUUID()}`;
  db.tokens.set(accessToken, user.id);
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `refresh-${randomUUID()}`,
    user: publicUser(user),
  };
}

function userById(id) {
  return [...db.users.values()].find((u) => u.id === id) ?? null;
}

/* ── Supabase: auth ────────────────────────────────────────────────────── */

async function handleAuth(req, res, url) {
  const path = url.pathname.replace('/auth/v1', '');

  if (path === '/settings') {
    return send(res, 200, { external: { email: true, google: true }, disable_signup: false });
  }

  // A pretend Google sign-in, so the "Continue with Google" path can be
  // clicked through locally. The real project sends the browser to Google;
  // here the browser is sent straight back to `redirect_to` with a session
  // in the URL fragment, the same shape supabase-js reads after a real
  // Google round trip, for one fixed demo account that carries the name
  // Google would (so the profile form's pre-fill can be seen).
  if (path === '/authorize' && req.method === 'GET') {
    const provider = url.searchParams.get('provider');
    if (provider !== 'google') return send(res, 400, { message: 'unsupported provider' });
    const email = 'google-demo@example.test';
    const user = db.users.get(email) ?? {
      id: randomUUID(),
      email,
      password: null,
      user_metadata: { full_name: 'Aigerim Google', given_name: 'Aigerim', family_name: 'Google', provider: 'google' },
    };
    db.users.set(email, user);
    // The local database needs the account too (access checks, profile).
    if (trialDb) await trialDb.addUser(user.id, email);
    const s = session(user);
    const back = url.searchParams.get('redirect_to') || 'http://127.0.0.1:4321/';
    const fragment = new URLSearchParams({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_in: String(s.expires_in),
      expires_at: String(s.expires_at),
      token_type: 'bearer',
      provider_token: 'local-google-demo',
    });
    res.writeHead(302, { Location: `${back}#${fragment.toString()}` });
    return res.end();
  }

  if (path === '/signup') {
    const body = await readBody(req);
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!email || !body.password) return send(res, 400, { message: 'Email and password are required' });
    // Sign-up doubles as sign-in here: a local dev server has no inbox, so
    // waiting for a confirmation link would make the flow untestable.
    const existing = db.users.get(email);
    const user = existing ?? { id: randomUUID(), email, password: body.password, user_metadata: {} };
    // `options.data` in supabase-js arrives as `data` and becomes the
    // account's user_metadata, as in the real project.
    if (body.data && typeof body.data === 'object') user.user_metadata = { ...(user.user_metadata ?? {}), ...body.data };
    db.users.set(email, user);
    if (trialDb) {
      await trialDb.addUser(user.id, email);
      // STAND-IN ONLY: the one local admin (see the header).
      if (email === STAND_IN_ADMIN) await trialDb.makeAdmin(user.id, 'stand-in admin (local only)');
    }
    return send(res, 200, session(user));
  }

  // "Forgot password": the real project emails a link; there is no inbox
  // here, so it only answers the way Supabase does (always 200, whether or
  // not the address has an account, so nobody can probe for accounts).
  if (path === '/recover') {
    await readBody(req);
    return send(res, 200, {});
  }

  if (path === '/token') {
    const body = await readBody(req);
    const email = String(body.email ?? '').trim().toLowerCase();
    const user = db.users.get(email);
    if (!user || user.password !== body.password) {
      return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
    }
    return send(res, 200, session(user));
  }

  if (path === '/user') {
    const userId = userByToken(req);
    if (!userId) return send(res, 401, { message: 'invalid token' });
    const user = userById(userId);
    if (!user) return send(res, 401, { message: 'invalid token' });
    if (req.method === 'PUT') {
      // updateUser(): a new password takes effect at once; a new email is
      // only recorded as pending, because the real project changes it only
      // once the link sent to that address is opened; `data` merges into
      // user_metadata.
      const body = await readBody(req);
      if (typeof body.password === 'string') {
        if (body.password === user.password) {
          return send(res, 422, { code: 'same_password', message: 'New password should be different from the old password.' });
        }
        user.password = body.password;
      }
      if (typeof body.email === 'string' && body.email.trim()) {
        const next = body.email.trim().toLowerCase();
        if (next !== user.email) user.new_email = next;
      }
      if (body.data && typeof body.data === 'object') user.user_metadata = { ...(user.user_metadata ?? {}), ...body.data };
      return send(res, 200, publicUser(user));
    }
    return send(res, 200, publicUser(user));
  }

  if (path === '/logout') {
    const auth = req.headers.authorization ?? '';
    const token = auth.slice(7).trim();
    const scope = url.searchParams.get('scope') ?? 'global';
    const userId = db.tokens.get(token);
    if (userId && (scope === 'global' || scope === 'others')) {
      // Every session this account holds, on every device, or every one but
      // this, exactly as supabase-js's signOut({ scope }) asks.
      for (const [other, owner] of [...db.tokens]) {
        if (owner === userId && (scope === 'global' || other !== token)) db.tokens.delete(other);
      }
    } else {
      db.tokens.delete(token);
    }
    return send(res, 204, null);
  }

  return send(res, 404, { message: `unhandled auth path ${path}` });
}

/* ── Supabase: REST ────────────────────────────────────────────────────── */

/** Reads `col=eq.value` filters out of a PostgREST-style query string. */
function filters(url) {
  const out = {};
  for (const [key, value] of url.searchParams) {
    if (typeof value === 'string' && value.startsWith('eq.')) out[key] = value.slice(3);
  }
  return out;
}

/** supabase-js's .single() / .maybeSingle() on a write ask PostgREST for one
    object rather than an array with this Accept header. */
function wantsObject(req) {
  return String(req.headers.accept ?? '').includes('application/vnd.pgrst.object+json');
}

const PROFILE_PHONE = /^\+?[0-9]{7,15}$/;
const PROFILE_SOURCES = ['friend', 'instagram', 'centre', 'other'];

/** The rules supabase/migrations/2026-09-24-profiles.sql enforces, as the
    table's CHECK constraints and its guard_student_profile_write() trigger
    do: lengths, the phone shape, a known source, a date of birth in the
    past and at least 5 years ago, and under 18 a parent's name, phone and
    agreement. Returns the row to store (trimmed, stamped) or the message
    Postgres would raise. */
function guardProfileRow(row, existing) {
  const text = (value) => (typeof value === 'string' ? value.trim() : '');
  const lengths = { first_name: 60, last_name: 60, city: 80, occupation: 120 };
  for (const [column, max] of Object.entries(lengths)) {
    const value = text(row[column]);
    if (value.length < 1 || value.length > max) {
      return { error: `new row for relation "student_profiles" violates check constraint "student_profiles_${column}_len"` };
    }
  }
  if (!PROFILE_SOURCES.includes(row.source)) {
    return { error: 'new row for relation "student_profiles" violates check constraint "student_profiles_source"' };
  }
  if (typeof row.phone !== 'string' || !PROFILE_PHONE.test(row.phone)) {
    return { error: 'new row for relation "student_profiles" violates check constraint "student_profiles_phone_shape"' };
  }
  if (row.parent_phone != null && !PROFILE_PHONE.test(String(row.parent_phone))) {
    return { error: 'new row for relation "student_profiles" violates check constraint "student_profiles_parent_phone_shape"' };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(row.date_of_birth ?? ''));
  if (!match) return { error: 'invalid input syntax for type date' };
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const birth = new Date(Date.UTC(y, m - 1, d));
  if (birth.getUTCFullYear() !== y || birth.getUTCMonth() !== m - 1 || birth.getUTCDate() !== d) {
    return { error: 'date/time field value out of range' };
  }
  if (y < 1900 || (y === 1900 && m === 1 && d === 1)) {
    return { error: 'new row for relation "student_profiles" violates check constraint "student_profiles_dob_range"' };
  }
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (birth.getTime() >= today) return { error: 'date of birth must be in the past' };
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  if (age < 5) return { error: 'date of birth is too recent' };
  if (age < 18 && (!text(row.parent_name) || row.parent_phone == null || row.parent_consent_at == null)) {
    return { error: "a parent's name, phone and agreement are required under 18" };
  }
  const stamp = new Date().toISOString();
  return {
    row: {
      user_id: row.user_id,
      first_name: text(row.first_name),
      last_name: text(row.last_name),
      date_of_birth: row.date_of_birth,
      phone: row.phone,
      city: text(row.city),
      occupation: text(row.occupation),
      source: row.source,
      parent_name: row.parent_name == null ? null : text(row.parent_name),
      parent_phone: row.parent_phone ?? null,
      parent_consent_at: row.parent_consent_at ?? null,
      created_at: existing?.created_at ?? stamp,
      updated_at: stamp,
    },
  };
}

/* The service role bypasses row security; the anon key does not. The dev
   server models that distinction, because "a student can only read their own
   rows" is one of the things worth seeing work in a browser. */
function isServiceRole(req) {
  return (req.headers.apikey ?? '') === 'local-service-role-key';
}

/* PostgREST's /rest/v1/rpc/<function>, answered by the real trial migration
   in PGlite. The caller's role is decided exactly as Supabase decides it:
   the service key is the service role, a student's token is that student,
   anything else is anon. The database's own grants then refuse what that
   role may not call. */
async function handleRpc(req, res, fn) {
  if (!trialDb) return send(res, 404, { message: 'the trial database is off: start this server with --trial' });
  const args = await readBody(req);
  const caller = userByToken(req);
  const opts = isServiceRole(req)
    ? { role: 'service_role' }
    : caller
      ? { role: 'authenticated', userId: caller }
      : { role: 'anon' };
  try {
    /* admin_list_users returns a table (one row per account), which
       PostgREST answers as a JSON array; every other function here returns
       one value. The local database's user_state is empty (this server keeps
       study progress in memory), so the counts read zero: labelled a
       stand-in in the panel's own data, not hidden. */
    if (fn === 'admin_list_users') {
      const rows = await trialDb.select('select * from public.admin_list_users()', [], opts);
      return send(res, 200, rows);
    }
    const result = await trialDb.rpc(fn, args, opts);
    /* PostgREST answers a function that returns SQL null with the JSON
       literal `null`, not an empty body (send() writes '' for null, which
       made the payments Worker read "someone else's order" as a failure). */
    if (result === null || result === undefined) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' });
      return res.end('null');
    }
    return send(res, 200, result);
  } catch (err) {
    return send(res, err.status ?? 400, { message: err.message, code: err.code });
  }
}

async function handleRest(req, res, url) {
  const table = url.pathname.replace('/rest/v1/', '');
  if (table.startsWith('rpc/')) return handleRpc(req, res, table.slice(4));
  const where = filters(url);
  const caller = userByToken(req);
  const service = isServiceRole(req);

  /** Rows this caller may see. Service role sees everything; anyone else sees
      only rows carrying their own user_id, which is what RLS does in the real
      project. */
  const visible = (rows) => (service ? rows : rows.filter((r) => r.user_id === caller));

  if (req.method === 'GET') {
    const wantsCount = String(req.headers.prefer ?? '').includes('count=exact');

    let rows = [];
    if (table === 'user_state') {
      // The real table has `for select using (auth.uid() = user_id)`, so a
      // browser can only ever read its own row however it phrases the query.
      // This stand-in got that wrong at first and happily returned another
      // student's progress to an anon-key caller, which looked like a leak in
      // the product and was only a leak in the harness. A harness that cannot
      // catch the real thing is worse than no harness, so it models the
      // policy now.
      const id = service ? (where.user_id ?? caller) : caller;
      if (!service && where.user_id && where.user_id !== caller) {
        rows = [];
      } else {
        const row = db.userState.get(id);
        rows = row ? [{ user_id: id, ...row }] : [];
      }
    } else if (table === 'mr_ez_conversations') {
      rows = visible(db.conversations).filter((c) => !where.id || c.id === where.id);
      if (!service && where.user_id && where.user_id !== caller) rows = [];
      if (service && where.user_id) rows = rows.filter((c) => c.user_id === where.user_id);
      rows = [...rows].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    } else if (table === 'mr_ez_messages') {
      rows = visible(db.messages).filter((m) => !where.conversation_id || m.conversation_id === where.conversation_id);
      rows = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
      if (url.searchParams.get('order')?.includes('desc')) rows.reverse();
    } else if (table === 'mr_ez_turns') {
      rows = db.turns.filter((t) => (!where.user_id || t.user_id === where.user_id));
      if (where.idempotency_key) {
        rows = rows.filter((t) => t.idempotency_key === decodeURIComponent(where.idempotency_key));
      }
    } else if (table === 'mr_ez_recommendations') {
      const row = db.recommendations.get(where.user_id ?? caller);
      rows = row && (!where.fingerprint || row.fingerprint === where.fingerprint) ? [row] : [];
    } else if (table === 'mr_ez_notes') {
      // Every filter the Worker actually sends, honoured: a note only comes
      // back for the right student, the right kind, the right week or unit,
      // AND the right fingerprint. Ignoring the last one would turn a stale
      // note into a cache hit, which is the exact bug this table exists to
      // avoid.
      // `filters` reads these off URLSearchParams, which has already decoded
      // them, so they are compared as-is.
      rows = visible(db.notes).filter(
        (n) =>
          (!where.user_id || n.user_id === where.user_id) &&
          (!where.kind || n.kind === where.kind) &&
          (!where.note_key || n.note_key === where.note_key) &&
          (!where.fingerprint || n.fingerprint === where.fingerprint),
      );
    } else if (table === 'learning_events') {
      // Same RLS shape as user_state above: an anon-key caller asking for
      // someone else's user_id gets nothing back, whatever else they filter
      // on, because the real policy is "auth.uid() = user_id", not "the
      // user_id you happened to ask for".
      if (!service && where.user_id && where.user_id !== caller) {
        rows = [];
      } else {
        rows = visible(db.learningEvents);
        if (where.event_id) rows = rows.filter((e) => e.event_id === where.event_id);
        if (where.activity_id) rows = rows.filter((e) => e.activity_id === where.activity_id);
        rows = [...rows].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
      }
    } else if (table === 'learning_plan') {
      const id = service ? (where.user_id ?? caller) : caller;
      if (!service && where.user_id && where.user_id !== caller) {
        rows = [];
      } else {
        const row = db.learningPlans.get(id);
        rows = row ? [row] : [];
      }
    } else if (table === 'learning_companions') {
      if (!service && where.user_id && where.user_id !== caller) {
        rows = [];
      } else {
        rows = visible(db.learningCompanions);
        if (where.kind) rows = rows.filter((c) => c.kind === where.kind);
      }
    } else if (table === 'student_profiles') {
      // "student_profiles select own": an anon-key caller sees their own row
      // and nothing else, whatever user_id they ask for.
      rows = visible([...db.profiles.values()]);
      if (where.user_id) rows = rows.filter((r) => r.user_id === where.user_id);
      if (wantsObject(req)) {
        if (rows.length !== 1) return send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
        return send(res, 200, rows[0]);
      }
    }

    const limit = Number(url.searchParams.get('limit'));
    if (Number.isFinite(limit) && limit > 0) rows = rows.slice(0, limit);

    if (wantsCount) {
      return send(res, 206, [], { 'content-range': `0-0/${rows.length}` });
    }
    return send(res, 200, rows);
  }

  if (req.method === 'POST') {
    // The three personal learning tables (supabase/migrations/2026-09-21-
    // learning.sql, not applied anywhere real) each need write behaviour the
    // generic path below does not model, so they are handled first and
    // return directly: real RLS "with check (auth.uid() = user_id)" fails
    // the whole write when a row names someone else as owner, which is
    // checked once here for all three rather than duplicated per table.
    if (table === 'learning_events' || table === 'learning_plan' || table === 'learning_companions') {
      const body = await readBody(req);
      const items = Array.isArray(body) ? body : [body];
      if (!service && items.some((item) => item.user_id !== caller)) {
        return send(res, 403, { message: 'new row violates row-level security policy' });
      }
      const prefer = String(req.headers.prefer ?? '');
      const wantsRepresentation = prefer.includes('return=representation');

      if (table === 'learning_events') {
        // Idempotent insert: the primary key on (user_id, event_id) in the
        // real migration makes a duplicate id a silent no-op, matching
        // `Prefer: resolution=ignore-duplicates`, never a second row and
        // never an error, so a retried push (a dropped connection, two tabs
        // syncing at once) is always safe.
        const inserted = [];
        for (const item of items) {
          const exists = db.learningEvents.some(
            (e) => e.user_id === item.user_id && e.event_id === item.event_id,
          );
          if (exists) continue;
          const row = {
            user_id: item.user_id,
            event_id: item.event_id,
            event: item.event,
            occurred_at: item.occurred_at,
            activity_id: item.activity_id,
            paper: item.paper ?? null,
            mode: item.mode,
            created_at: new Date().toISOString(),
          };
          db.learningEvents.push(row);
          inserted.push(row);
        }
        return send(res, 201, wantsRepresentation ? inserted : []);
      }

      if (table === 'learning_plan') {
        const item = items[0];
        const owner = item.user_id;
        const existing = db.learningPlans.get(owner) ?? null;
        const incoming = {
          user_id: owner,
          plan: item.plan,
          revision: Number(item.revision ?? 0),
          confirmed: Boolean(item.confirmed),
          updated_at: item.updated_at ?? new Date().toISOString(),
        };
        // PLAN_CONFLICT_RULE (src/lib/learning/contracts/sync.ts), the same
        // rule the migration's guard_learning_plan_write() trigger enforces
        // in the real project: confirmed beats unconfirmed, then the higher
        // revision wins, then the later updatedAt breaks an exact tie. An
        // incoming plan that does not outrank what is stored is dropped,
        // and the row that actually won is what comes back, so a losing
        // device can rebuild from the reply instead of assuming its write
        // took.
        let winner = incoming;
        if (existing) {
          const outranks =
            (incoming.confirmed && !existing.confirmed) ||
            (incoming.confirmed === existing.confirmed && incoming.revision > existing.revision) ||
            (incoming.confirmed === existing.confirmed &&
              incoming.revision === existing.revision &&
              incoming.updated_at > existing.updated_at);
          winner = outranks ? incoming : existing;
        }
        db.learningPlans.set(owner, winner);
        return send(res, 201, wantsRepresentation ? [winner] : []);
      }

      // learning_companions: plain upsert by (user_id, kind). The sync
      // contract already union-merges vocab/notes/preferences client-side
      // by their own natural key before a push (contracts/sync.ts,
      // CompanionSyncPayload), so the document arriving here is already the
      // merged result and the server only needs to hold the latest one,
      // unlike the plan above.
      const written = [];
      for (const item of items) {
        const row = {
          user_id: item.user_id,
          kind: item.kind,
          data: item.data,
          revision: Number(item.revision ?? 1),
          updated_at: new Date().toISOString(),
        };
        db.learningCompanions = db.learningCompanions.filter(
          (c) => !(c.user_id === row.user_id && c.kind === row.kind),
        );
        db.learningCompanions.push(row);
        written.push(row);
      }
      return send(res, 201, wantsRepresentation ? written : []);
    }

    if (table === 'student_profiles') {
      // Upsert on the primary key (`?on_conflict=user_id` with
      // `Prefer: resolution=merge-duplicates`, which is what supabase-js's
      // upsert sends). Without merge-duplicates a second row for the same
      // student is a unique violation, as in Postgres.
      const body = await readBody(req);
      const items = Array.isArray(body) ? body : [body];
      if (!service && items.some((item) => item.user_id !== caller)) {
        return send(res, 403, { code: '42501', message: 'new row violates row-level security policy for table "student_profiles"' });
      }
      const prefer = String(req.headers.prefer ?? '');
      const merge = prefer.includes('resolution=merge-duplicates') || url.searchParams.get('on_conflict') === 'user_id';
      const written = [];
      for (const item of items) {
        const existing = db.profiles.get(item.user_id) ?? null;
        if (existing && !merge) {
          return send(res, 409, { code: '23505', message: 'duplicate key value violates unique constraint "student_profiles_pkey"' });
        }
        const result = guardProfileRow({ ...(existing ?? {}), ...item }, existing);
        if (result.error) return send(res, 400, { code: '23514', message: result.error });
        db.profiles.set(result.row.user_id, result.row);
        await mirrorProfile(result.row);
        written.push(result.row);
      }
      if (!prefer.includes('return=representation')) return send(res, 201, null);
      return send(res, 201, wantsObject(req) ? written[0] : written);
    }

    const body = await readBody(req);
    const items = Array.isArray(body) ? body : [body];
    const stamped = items.map((item) => ({
      id: item.id ?? randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    }));

    if (table === 'user_state') {
      for (const item of stamped) db.userState.set(item.user_id, { progress: item.progress, study_plan: item.study_plan });
    } else if (table === 'mr_ez_conversations') {
      for (const item of stamped) db.conversations.push({ summary: null, summarised_turns: 0, ...item });
    } else if (table === 'mr_ez_messages') {
      db.messages.push(...stamped);
    } else if (table === 'mr_ez_turns') {
      if (db.forcedFailure === 'save-turn') {
        db.forcedTimes = (db.forcedTimes || 1) - 1;
        if (db.forcedTimes <= 0) db.forcedFailure = null;
        return send(res, 500, { message: 'forced save failure (local)' });
      }
      db.turns.push(...stamped);
    } else if (table.startsWith('mr_ez_recommendations')) {
      for (const item of stamped) db.recommendations.set(item.user_id, item);
    } else if (table.startsWith('mr_ez_notes')) {
      // Upsert on the real primary key, matching
      // `?on_conflict=user_id,kind,note_key` with merge-duplicates.
      for (const item of stamped) {
        db.notes = db.notes.filter(
          (n) => !(n.user_id === item.user_id && n.kind === item.kind && n.note_key === item.note_key),
        );
        db.notes.push(item);
      }
    }

    const prefer = String(req.headers.prefer ?? '');
    return send(res, 201, prefer.includes('return=representation') ? stamped : []);
  }

  if (req.method === 'PATCH') {
    const body = await readBody(req);
    if (table === 'student_profiles') {
      // "student_profiles update own": an anon-key caller naming someone
      // else's user_id matches no rows, a successful no-op, as in Postgres.
      const owner = service ? where.user_id : caller;
      if (!owner || (!service && where.user_id && where.user_id !== caller)) return send(res, 204, null);
      const existing = db.profiles.get(owner);
      if (!existing) return send(res, 204, null);
      const result = guardProfileRow({ ...existing, ...body, user_id: owner }, existing);
      if (result.error) return send(res, 400, { code: '23514', message: result.error });
      db.profiles.set(owner, result.row);
      await mirrorProfile(result.row);
      const prefer = String(req.headers.prefer ?? '');
      if (!prefer.includes('return=representation')) return send(res, 204, null);
      return send(res, 200, wantsObject(req) ? result.row : [result.row]);
    }
    if (table === 'mr_ez_turns') {
      // Mirrors the column-scoped grant in supabase/schema.sql: a student may
      // blank the stored reply on their own rows and nothing else. Any other
      // column in the payload is ignored rather than applied.
      const owner = service ? (where.user_id ?? caller) : caller;
      // `json` is the test harness's helper, not this file's: calling it here
      // threw a ReferenceError instead of refusing the write. A student
      // naming someone else's id gets an empty, successful no-op, which is
      // what the real policy produces (zero rows match).
      if (!service && where.user_id && where.user_id !== caller) return send(res, 204, null);
      for (const t of db.turns) {
        if (t.user_id !== owner) continue;
        if (service) Object.assign(t, body);
        else if ('reply' in body) t.reply = body.reply;
      }
      return send(res, 204, null);
    }
    if (table === 'mr_ez_conversations') {
      for (const c of db.conversations) {
        if (where.id && c.id !== where.id) continue;
        if (where.user_id && c.user_id !== where.user_id) continue;
        Object.assign(c, body, { updated_at: new Date().toISOString() });
      }
    }
    return send(res, 204, null);
  }

  if (req.method === 'DELETE') {
    // A delete only ever removes the caller's own rows, exactly like the RLS
    // policy in supabase/schema.sql.
    const owner = where.user_id && (service || where.user_id === caller) ? where.user_id : caller;
    let removed = [];
    if (table === 'mr_ez_messages') {
      removed = db.messages.filter((m) => m.user_id === owner);
      db.messages = db.messages.filter((m) => m.user_id !== owner);
    } else if (table === 'mr_ez_conversations') {
      removed = db.conversations.filter((c) => c.user_id === owner);
      db.conversations = db.conversations.filter((c) => c.user_id !== owner);
    } else if (table === 'mr_ez_recommendations') {
      const row = db.recommendations.get(owner);
      if (row) removed = [row];
      db.recommendations.delete(owner);
    } else if (table === 'mr_ez_notes') {
      removed = db.notes.filter((n) => n.user_id === owner);
      db.notes = db.notes.filter((n) => n.user_id !== owner);
    }
    const prefer = String(req.headers.prefer ?? '');
    return send(res, 200, prefer.includes('return=representation') || url.searchParams.has('select') ? removed : []);
  }

  return send(res, 405, { message: 'method not allowed' });
}

/* ── The tutor ─────────────────────────────────────────────────────────── */

/* The real Worker imports the deterministic layer from src/lib/tutor and only
   replaces the model call when TUTOR_SIMULATE is on. This dev server cannot
   import that TypeScript directly from plain Node, so it reproduces only the
   SHAPE of a reply, and marks every one of them as simulated. The wording is
   deliberately blunt about that. */
/* A plain-JS echo of the rules in parseTutorRequest (src/lib/tutor/schema.ts),
   so clicking through the interface hits the same 400s a real deployment
   would. It is deliberately only the SHAPE rules: whether a week is actually
   complete, whether a unit is actually finished, and whether a question id
   actually exists are facts about the student's record, and those are decided
   by the real Worker (in --live mode, or by the unit tests). Returns an error
   body, or null when the request is well formed. */
const TASKS = ['chat', 'welcome', 'explain', 'weekly', 'unit', 'debrief', 'item'];
/* The three learning tasks (src/lib/learning/contracts/ai.ts). They ride on
   the same endpoint and, in this stand-in, on the same store, the same
   caps and the same replay guard. Every reply they produce here is flagged
   `live: false` and says "simulated" in its own first sentence, so an
   interface package can be built and clicked through for nothing. */
const LEARNING_TASKS = ['lesson-help', 'evaluate-practice', 'propose-next'];
const MAX_REVIEW_ITEMS = 40;
const MAX_PRACTICE_SUBMISSION_CHARS = 1200;
const PUBLISHED_TEST_ID = /^(?:reading|listening)-full-\d{3}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_:-]{0,79}$/;
const LESSON_SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const BLOCK_ID = /^b\d{1,3}-[0-9a-f]{4,32}$/;

function badRequest(message) {
  return { error: message, code: 'bad-request' };
}

/** The shape rules for the three learning tasks, the same way
    validateRequest below echoes parseTutorRequest: only the SHAPE, because
    whether a block id still resolves, whether an exercise has been
    regenerated and what the student's plan revision actually is are facts
    the real Worker decides. Returns an error body, or null. */
function validateLearningRequest(request) {
  const versions = request.versions;
  if (!versions || typeof versions !== 'object') return badRequest('versions must be an object.');
  if (!Number.isInteger(versions.planRevision) || versions.planRevision < 0) {
    return badRequest('versions.planRevision must be a whole number.');
  }
  if (!Number.isInteger(versions.evidenceVersion) || versions.evidenceVersion < 0) {
    return badRequest('versions.evidenceVersion must be a whole number.');
  }
  if (!SAFE_ID.test(String(versions.indexVersion ?? ''))) return badRequest('versions.indexVersion is malformed.');

  if (request.task === 'lesson-help') {
    if (!['explain', 'hint', 'example'].includes(request.kind)) return badRequest('kind must be explain, hint or example.');
    if (!LESSON_SLUG.test(String(request.lessonKey ?? ''))) return badRequest('lessonKey is not a lesson on this site.');
    if (!BLOCK_ID.test(String(request.blockId ?? ''))) return badRequest('blockId is malformed.');
    if (request.previousHints !== undefined && !Array.isArray(request.previousHints)) {
      return badRequest('previousHints must be an array.');
    }
  }

  if (request.task === 'evaluate-practice') {
    if (!SAFE_ID.test(String(request.activityId ?? ''))) return badRequest('activityId is malformed.');
    if (!Number.isInteger(request.contentVersion)) return badRequest('contentVersion must be a whole number.');
    if (typeof request.submission !== 'string') return badRequest('submission must be a string.');
    if (request.submission.length > MAX_PRACTICE_SUBMISSION_CHARS) {
      return {
        error: `That is longer than ${MAX_PRACTICE_SUBMISSION_CHARS} characters, which is more than this exercise is for. A full essay goes to the writing grader instead.`,
        code: 'too-long',
      };
    }
  }

  if (request.task === 'propose-next') {
    if (!Array.isArray(request.candidateActivityIds)) return badRequest('candidateActivityIds must be an array.');
    if (!Number.isInteger(request.budgetMinutes)) return badRequest('budgetMinutes must be a whole number of minutes.');
    if (!SAFE_ID.test(String(request.deterministicChoiceId ?? ''))) return badRequest('deterministicChoiceId is malformed.');
  }

  return null;
}

function validateRequest(request) {
  if (!request || typeof request !== 'object') return badRequest('Request body must be a JSON object.');
  if (LEARNING_TASKS.includes(request.task)) return validateLearningRequest(request);
  if (!TASKS.includes(request.task)) return badRequest('Unknown task.');

  if (request.task === 'chat' && typeof request.message !== 'string') return badRequest('A message is required.');
  if (request.task === 'explain' && !request.attempt) {
    return badRequest('Explaining a result needs which result to explain.');
  }

  if (request.task === 'unit') {
    const unit = request.unit;
    if (!unit || typeof unit !== 'object') return badRequest('A unit note needs which unit it is about.');
    if (!Number.isInteger(unit.unitId) || unit.unitId < 1 || unit.unitId > 8) {
      return badRequest('unit.unitId must be a whole number from 1 to 8.');
    }
    if (unit.kind !== 'intro' && unit.kind !== 'wrap') return badRequest('unit.kind must be intro or wrap.');
  }

  if (request.task === 'debrief' || request.task === 'item') {
    const review = request.review;
    if (!review || typeof review !== 'object') return badRequest('Reviewing answers needs which questions to review.');
    const testId = String(review.testId ?? '').replace(/-drill-p\d+$/, '');
    if (!PUBLISHED_TEST_ID.test(testId)) return badRequest('review.testId is not a practice paper on this site.');
    if (!Array.isArray(review.items)) return badRequest('review.items must be an array.');
    if (review.items.length === 0) return badRequest('review.items must name at least one question.');
    if (review.items.length > MAX_REVIEW_ITEMS) {
      return badRequest(`review.items must name at most ${MAX_REVIEW_ITEMS} questions.`);
    }
    for (const item of review.items) {
      if (!item || typeof item !== 'object') return badRequest('Each review item must be an object.');
      if (!SAFE_ID.test(String(item.questionId ?? ''))) return badRequest('review.items[].questionId is malformed.');
      if (typeof item.given !== 'string') return badRequest('review.items[].given must be a string.');
    }
    if (request.task === 'item' && review.items.length !== 1) {
      return badRequest('Explaining one question needs exactly one question.');
    }
  }

  return null;
}

/** The (kind, note_key) a one-shot note would be cached under, or null when
    the task is not one. The real Worker derives note_key from counted facts
    (a week's Monday, a unit id); this stand-in cannot count, so it uses a
    stable stand-in key and caches per student, which is enough to see the
    "reopening this page is free" behaviour in the interface. */
function noteKeyFor(request) {
  if (request.task === 'weekly') return { kind: 'weekly', note_key: 'last-week' };
  if (request.task === 'unit' && request.unit) {
    return { kind: request.unit.kind === 'intro' ? 'unit-intro' : 'unit-wrap', note_key: String(request.unit.unitId) };
  }
  return null;
}

/* The stand-in speaks Russian too, so a Russian interface can be clicked
   through end to end. It cannot import src/lib/tutor/ru.ts (that is
   TypeScript and this is plain Node), and it is not meant to: the real
   Worker's own wording is covered by the unit tests. These are this
   server's own sentences, and they say "simulated" just as loudly in both
   languages. */
const SIM_RU = {
  welcome:
    'Симулированный ответ репетитора от локального dev-сервера. Запрос к ИИ не отправлялся и ничего не потрачено. С настоящей моделью здесь было бы приветствие и причина следующего шага.',
  welcomeReason: 'Симулированная причина. Настоящую пишет модель по вашей собственной истории.',
  explain: (kind, at) =>
    `Симулированный ответ репетитора от локального dev-сервера. Запрос к ИИ не отправлялся. Разбирается результат (${kind}), записанный ${at}.\n\nЛюбой балл на этой платформе получен по ИИ-проверке и не является официальным результатом IELTS.`,
  explainReason: 'Симулированная причина.',
  weekly:
    'Симулированный еженедельный обзор от локального dev-сервера. Запрос к ИИ не отправлялся и ничего не потрачено. Настоящий называет только посчитанные факты: сколько дней из запланированных, минуты против цели, пройденные уроки, тренировочные попытки и те же четыре числа за прошлую неделю. Он никогда не называет одно изменение балла тенденцией.',
  weeklyReason: 'Симулированная причина. Настоящую выбирает код по вашей собственной истории.',
  unit: (kind, unitId) =>
    `Симулированная заметка по разделу ${unitId} (${kind}) от локального dev-сервера. Запрос к ИИ не отправлялся. Заметка по разделу никогда не несёт рекомендации: уроки этого раздела и так прямо под ней.`,
  unitIntro: 'вступление',
  unitWrap: 'итог',
  review: (count, ids, testId) =>
    `Симулированный разбор ответов от локального dev-сервера. Запрос к ИИ не отправлялся. Спрошено про ${count} вопрос(ов) (${ids}) в ${testId}.\n\nНастоящий Worker берёт эти вопросы из опубликованного JSON самого сайта и никогда не читает формулировку, ответ или объяснение из запроса. Это разбор ответов, а не оценка, поэтому о балле здесь ничего не говорится.`,
  reviewReason: 'Симулированная причина. Настоящую выбирает код по типам вопросов, в которых были ошибки.',
  chat: (message) =>
    `Симулированный ответ репетитора от локального dev-сервера. Запрос к ИИ не отправлялся и ничего не потрачено.\n\nВы спросили: "${message}"\n\nС настоящей моделью Mr EZ ответил бы, опираясь только на ваши цели, результаты и открытый урок.`,
  labels: {
    'Your progress report': 'Ваш отчёт о прогрессе',
    'Write an essay and get an AI band': 'Написать эссе и получить балл от ИИ',
    'Short Reading drills': 'Короткие тренировки Reading',
  },
};

/** 'ru' only when the request says so, exactly like parseTutorRequest. */
function localeOf(request) {
  return request?.locale === 'ru' ? 'ru' : 'en';
}

/* ── The three learning tasks, simulated ───────────────────────────────── */

/* Deterministic, free, and unmistakably not a model. The interface packages
   (the Explain / Hint / Example controls, the focused exercise, the
   proposal card) can be built and clicked through against these without a
   key and without a cent, and none of them can be mistaken for live AI:
   every reply says "simulated" in its own first sentence and carries
   `live: false`, which is what the interface labels.

   What the real Worker does that this cannot: fetch the lesson block from
   the site's published JSON and ground the reply in it, judge a submission,
   build the eligible shortlist from the student's plan. Those are covered
   by tests/learning-ai.test.ts against the real handler. */
const SIM_LEARNING_RU = {
  head: 'Симулированный ответ репетитора от локального dev-сервера. Запрос к ИИ не отправлялся и ничего не потрачено.',
  hint: 'Настоящая подсказка строится на том самом фрагменте урока, который вы читаете, на вашем ответе и на подсказках, которые уже были, и она никогда не выдаёт ответ до вашей попытки.',
  example: 'Настоящий пример разбирает тот же приём на ДРУГОМ материале, а не на вашем вопросе.',
  explain: 'Настоящее объяснение доступно только после вашей попытки: сначала вы пробуете сами.',
  evaluate:
    'Настоящая проверка смотрит только на одну заявленную цель задания, цитирует ваши собственные слова и никогда не называет балл.',
  evaluateNext: 'Перечитайте свой ответ рядом с целью задания и отметьте слова, которые ей отвечают.',
  propose: 'Симулированная причина. Настоящую пишет модель, а сам шаг выбирает код из вашего плана.',
};

function simulatedLearningReply(request, turnsToday, turnsPerDay) {
  const ru = localeOf(request) === 'ru';
  const head = ru
    ? SIM_LEARNING_RU.head
    : 'Simulated tutor reply from the local dev server. No AI was called and nothing was charged.';
  const usage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, costUsd: 0, turnsToday, turnsPerDay };
  const base = { live: false, model: 'simulated (local dev server)', usage };

  if (request.task === 'lesson-help') {
    /* The level is decided by the server, not asked for: an explanation
       before any attempt is served as a hint, exactly like the real Worker
       (effectiveHelpKind in src/lib/learning/ai-prompt.ts). */
    const attempted = Boolean(request.item?.given?.trim()) || (request.assistanceSoFar ?? 'none') !== 'none';
    const kind = request.kind === 'explain' && !attempted ? 'hint' : request.kind;
    const body = ru
      ? { hint: SIM_LEARNING_RU.hint, example: SIM_LEARNING_RU.example, explain: SIM_LEARNING_RU.explain }[kind]
      : {
          hint: 'A real hint is built from the exact lesson block you are reading, your own answer and the hints you have already had, and it never gives the answer away before you have tried.',
          example:
            'A real example works the same method on DIFFERENT content, never on the question you are answering.',
          explain:
            'A real explanation is only offered after your own attempt, and it starts from what your answer assumed.',
        }[kind];
    const assistance =
      kind === 'hint' ? 'hint' : kind === 'example' ? 'worked-example' : 'tutor-explained';
    const order = ['none', 'hint', 'worked-example', 'answer-shown', 'tutor-explained'];
    const before = request.assistanceSoFar ?? 'none';
    return {
      ...base,
      task: 'lesson-help',
      kind,
      text: `${head} ${body}`,
      assistanceAfter: order.indexOf(before) > order.indexOf(assistance) ? before : assistance,
      revealedAnswer: false,
    };
  }

  if (request.task === 'evaluate-practice') {
    const observations = ru
      ? [SIM_LEARNING_RU.head, SIM_LEARNING_RU.evaluate]
      : [
          head,
          'A real evaluation looks at the one stated objective of the exercise, quotes your own words back to you, and never produces a band or a score.',
        ];
    const nextMove = ru
      ? SIM_LEARNING_RU.evaluateNext
      : 'Read your own answer against the exercise\'s one objective and mark the words that meet it.';
    return {
      ...base,
      task: 'evaluate-practice',
      // Nothing judged it, so nothing is claimed about the objective.
      verdict: 'not-yet',
      judged: false,
      met: false,
      observations,
      feedback: observations.join(' '),
      suggestions: [nextMove],
      isBand: false,
    };
  }

  // propose-next. The stand-in always agrees with the deterministic choice,
  // because inventing a disagreement would be inventing evidence.
  const reason = ru
    ? SIM_LEARNING_RU.propose
    : 'A simulated reason. The real one is written by the model, and the step itself is chosen in code from your own plan.';
  return {
    ...base,
    task: 'propose-next',
    activityId: request.deterministicChoiceId ?? null,
    reason,
    accepted: true,
    recommendation: null,
    disagreement: undefined,
  };
}

function simulatedReply(request, conversationId, turnsToday, turnsPerDay) {
  if (LEARNING_TASKS.includes(request.task)) return simulatedLearningReply(request, turnsToday, turnsPerDay);
  const ru = localeOf(request) === 'ru';
  const label = (english) => (ru ? SIM_RU.labels[english] ?? english : english);
  const base = {
    task: request.task,
    conversationId,
    recommendation: null,
    mood: 'explaining',
    live: false,
    model: 'simulated (local dev server)',
    usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, costUsd: 0, turnsToday, turnsPerDay },
  };

  if (request.task === 'welcome') {
    return {
      ...base,
      mood: 'encouraging',
      text: ru
        ? SIM_RU.welcome
        : 'Simulated tutor reply from the local dev server. No AI was called and nothing was charged. With a real model configured, this is where the greeting and the reason for the next step would be written.',
      recommendation: {
        id: 'tool:report',
        label: label('Your progress report'),
        href: '/report',
        reason: ru
          ? SIM_RU.welcomeReason
          : 'A simulated reason. The real one is written by the model from your own record.',
      },
    };
  }

  if (request.task === 'explain') {
    return {
      ...base,
      text: ru
        ? SIM_RU.explain(request.attempt?.kind, request.attempt?.at)
        : `Simulated tutor reply from the local dev server. No AI was called. The result being explained is the ${request.attempt?.kind} attempt recorded at ${request.attempt?.at}.\n\nEvery band on this platform is an estimate from its own AI marking, not an official IELTS result.`,
      recommendation: {
        id: 'trainer:writing',
        label: label('Write an essay and get an AI band'),
        href: '/trainers/writing',
        reason: ru ? SIM_RU.explainReason : 'A simulated reason.',
      },
    };
  }

  if (request.task === 'weekly') {
    return {
      ...base,
      text: ru
        ? SIM_RU.weekly
        : 'Simulated weekly review from the local dev server. No AI was called and nothing was charged. The real one states only counted facts: days studied out of days planned, minutes against the goal, lessons finished, practice attempts, and the same four numbers for the week before. It never calls one band change a trend.',
      recommendation: {
        id: 'tool:report',
        label: label('Your progress report'),
        href: '/report',
        reason: ru ? SIM_RU.weeklyReason : 'A simulated reason. The real one is chosen in code from your own record.',
      },
    };
  }

  if (request.task === 'unit') {
    const wrap = request.unit?.kind === 'wrap';
    const kind = wrap ? 'wrap-up' : 'introduction';
    return {
      ...base,
      mood: wrap ? 'celebrating' : 'explaining',
      text: ru
        ? SIM_RU.unit(wrap ? SIM_RU.unitWrap : SIM_RU.unitIntro, request.unit?.unitId)
        : `Simulated unit ${kind} from the local dev server for unit ${request.unit?.unitId}. No AI was called. A unit note never carries a recommendation: the unit's own lessons are right beneath it.`,
      // Deliberately null, exactly like the real thing.
      recommendation: null,
    };
  }

  if (request.task === 'debrief' || request.task === 'item') {
    const items = request.review?.items ?? [];
    const ids = items.map((i) => i.questionId).join(', ');
    return {
      ...base,
      text: ru
        ? SIM_RU.review(items.length, ids, request.review?.testId)
        : `Simulated answer review from the local dev server. No AI was called. Asked about ${items.length} ` +
          `${items.length === 1 ? 'question' : 'questions'} (${ids}) in ` +
          `${request.review?.testId}.\n\nThe real Worker fetches those questions from the site's own published ` +
          'JSON and never reads a prompt, an answer or an explanation out of the request. This is a review of ' +
          'answers, not a mark, so it says nothing about a band.',
      recommendation: {
        id: 'trainer:reading',
        label: label('Short Reading drills'),
        href: '/trainers/reading',
        reason: ru
          ? SIM_RU.reviewReason
          : 'A simulated reason. The real one is chosen in code from the question types that went wrong.',
      },
    };
  }

  return {
    ...base,
    text: ru
      ? SIM_RU.chat(request.message)
      : `Simulated tutor reply from the local dev server. No AI was called and nothing was charged.\n\nYou asked: "${request.message}"\n\nWith a real model configured, Mr EZ would answer this using only your own goals, results and the lesson you have open.`,
  };
}

async function handleTutor(req, res, url) {
  if (req.method === 'GET') {
    return send(res, 200, {
      model: LIVE ? 'gpt-5.6-luna' : 'simulated (local dev server)',
      live: LIVE,
      requiresSignIn: true,
      turnsPerDay: 40,
      helpPerDay: 60,
      configured: true,
    });
  }

  const userId = userByToken(req);
  if (!userId) return send(res, 401, { error: 'Sign in to talk to Mr EZ.', code: 'sign-in-required' });

  const forced = url.searchParams.get('fail') ?? db.forcedFailure;
  if (forced === 'unavailable') return send(res, 503, { error: 'Mr EZ is not available at the moment.', code: 'unavailable' });
  if (forced === 'busy') return send(res, 429, { error: 'Mr EZ is busy right now. Give it a few seconds and ask again.', code: 'busy', retryAfter: 10 });
  if (forced === 'limit') {
    return send(res, 429, { error: 'That is 40 questions today, which is the daily limit. Mr EZ will be back tomorrow.', code: 'limit-reached' });
  }

  const slow = Number(url.searchParams.get('slow'));
  if (Number.isFinite(slow) && slow > 0) await new Promise((r) => setTimeout(r, slow));

  const bodyChunks = [];
  for await (const chunk of req) bodyChunks.push(chunk);
  const bodyText = Buffer.concat(bodyChunks).toString('utf8') || '{}';

  if (TRIAL && liveHandler) {
    // The real Worker handler in trial mode, simulated: its trial allowances
    // run against the real migration, and no model is called.
    const resp = await liveHandler(bodyText, req.headers.authorization);
    const text = await resp.text();
    return send(res, resp.status, text ? JSON.parse(text) : null);
  }

  if (LIVE && liveHandler) {
    // The real Worker handler answers, using the real model. Its own auth,
    // ownership, limits, idempotency and persistence run against this file's
    // store, so what is exercised here is production logic.
    const resp = await liveHandler(bodyText, req.headers.authorization);
    const text = await resp.text();
    return send(res, resp.status, text ? JSON.parse(text) : null);
  }

  let request;
  try {
    request = JSON.parse(bodyText);
  } catch {
    request = {};
  }

  const invalid = validateRequest(request);
  if (invalid) return send(res, invalid.code === 'too-long' ? 413 : 400, invalid);

  /* The assistance boundary, the same way the real Worker enforces it: a
     hidden button is not a boundary, so a help request made while a timed
     paper is running is refused here too, whichever surface asked. The
     wording is this file's own; the real one is localised properly in
     src/lib/learning/ai-prompt.ts. */
  if (request.place?.underExam) {
    const blocked =
      LEARNING_TASKS.includes(request.task) ||
      request.task === 'debrief' ||
      request.task === 'item' ||
      (request.task === 'chat' && /answer|ответ/i.test(String(request.message ?? '')));
    if (blocked) {
      return send(res, 400, {
        error:
          localeOf(request) === 'ru'
            ? 'Идёт работа на время, поэтому подсказок и ответов не будет, пока она не закончится.'
            : 'A timed paper is running, so there are no hints or answers until it is finished.',
        code: 'bad-request',
      });
    }
  }

  // Repeat-send guard, same contract as the Worker.
  if (request.idempotencyKey) {
    const since = Date.now() - 10 * 60 * 1000; // same window as the Worker
    const existing = db.turns.find(
      (t) =>
        t.user_id === userId &&
        t.idempotency_key === request.idempotencyKey &&
        t.reply &&
        Date.parse(t.created_at) >= since,
    );
    if (existing) return send(res, 200, { ...existing.reply, cached: true });
  }

  // Ownership: a conversation you do not own does not exist as far as you
  // are concerned.
  let conversation = null;
  if (request.conversationId) {
    conversation = db.conversations.find((c) => c.id === request.conversationId && c.user_id === userId) ?? null;
    if (!conversation) return send(res, 404, { error: 'That conversation is not available.', code: 'not-found' });
  }
  if (request.task === 'chat' && !conversation) {
    conversation = {
      id: randomUUID(),
      user_id: userId,
      summary: null,
      summarised_turns: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.conversations.push(conversation);
  }

  /* The welcome is cached per student, so reopening the dashboard costs
     nothing. The real Worker keys this on a fingerprint of the student's
     whole record (insightsFingerprint) and re-answers the moment that
     changes; this stand-in cannot compute that fingerprint from plain Node,
     so it caches per student until the history is cleared. The fingerprint
     behaviour itself is covered by tests/mr-ez-worker.test.ts. */
  const locale = localeOf(request);
  if (request.task === 'welcome') {
    const cached = db.recommendations.get(userId);
    if (cached && cached.fingerprint === `dev-${locale}`) return send(res, 200, { ...cached.reply, cached: true });
  }

  /* The weekly review and the unit notes are cached the same way, in
     mr_ez_notes, so the "you have read this already, it costs nothing to
     look again" path is visible in the interface too. */
  const note = noteKeyFor(request);
  if (note) {
    const stored = db.notes.find(
      (n) => n.user_id === userId && n.kind === note.kind && n.note_key === note.note_key && n.fingerprint === `dev-${locale}`,
    );
    if (stored) return send(res, 200, { ...stored.reply, cached: true });
  }

  /* Two per-student allowances, counted separately, exactly like the real
     Worker since lead decision Q3: contextual lesson help and focused
     practice evaluation share 60; everything else, including plan
     proposals, shares the conversation's 40. */
  const helpFamily = request.task === 'lesson-help' || request.task === 'evaluate-practice';
  const turnsPerDay = helpFamily ? 60 : 40;
  const turnsToday = db.turns.filter(
    (t) =>
      t.user_id === userId &&
      (t.task === 'lesson-help' || t.task === 'evaluate-practice') === helpFamily,
  ).length;
  const reply = simulatedReply(request, conversation?.id ?? '', turnsToday + 1, turnsPerDay);

  db.turns.push({
    id: randomUUID(),
    user_id: userId,
    conversation_id: conversation?.id ?? null,
    task: request.task,
    idempotency_key: request.idempotencyKey ?? null,
    reply,
    cost_usd: 0,
    created_at: new Date().toISOString(),
  });

  if (request.task === 'welcome') {
    db.recommendations.set(userId, { user_id: userId, fingerprint: `dev-${locale}`, reply });
  }

  if (note) {
    db.notes = db.notes.filter((n) => !(n.user_id === userId && n.kind === note.kind && n.note_key === note.note_key));
    db.notes.push({ user_id: userId, ...note, fingerprint: `dev-${locale}`, reply, created_at: new Date().toISOString() });
  }

  if (conversation && request.message) {
    const now = new Date().toISOString();
    db.messages.push(
      { id: randomUUID(), conversation_id: conversation.id, user_id: userId, role: 'student', content: request.message, created_at: now },
      { id: randomUUID(), conversation_id: conversation.id, user_id: userId, role: 'tutor', content: reply.text, created_at: new Date(Date.now() + 1).toISOString() },
    );
    conversation.updated_at = now;
  }

  return send(res, 200, reply);
}

/* ── Server ────────────────────────────────────────────────────────────── */

/* -- Live bridge -----------------------------------------------------------
   Hands the request to the real Worker handler, with this file's in-memory
   store playing Supabase. Loaded only when --live is passed, so the default
   path needs no TypeScript loader and cannot spend anything. */

let liveHandler = null;

/** Reads OPENAI_API_KEY out of the Workers' gitignored .dev.vars. Used for the
    Authorization header only: never logged, never stored, never sent anywhere
    but OpenAI. */
function readOpenAiKey() {
  const candidates = [
    'workers/mr-ez/.dev.vars',
    '../../../workers/mr-ez/.dev.vars',
    '../../../workers/grade-essay/.dev.vars',
    '../../../workers/grade-speaking/.dev.vars',
    '../../../workers/live-examiner/.dev.vars',
  ].map((rel) => resolve(REPO, rel));
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = /^\s*OPENAI_API_KEY\s*=\s*"?([^"\s]+)"?\s*$/.exec(line);
      if (m && m[1] && m[1].length > 20) {
        console.log('live mode: key loaded from a workers/*/.dev.vars (value not shown)');
        return m[1];
      }
    }
  }
  throw new Error('--live needs an OPENAI_API_KEY in one of the workers/*/.dev.vars');
}

const STUB_SUPABASE = 'https://stub.invalid';

/* In --live mode the real Worker fetches each practice paper's published JSON.
   Pointed at the Astro dev server, which serves the same route the deployed
   site does (src/pages/data/tests/[id].json.ts), so the debrief and item tasks
   run against real question content with no network beyond this machine.
   Start the site separately with `npm run dev`. */
/* MR_EZ_SITE_ORIGIN moves both of these when the site runs on another port
   (a second checkout's dev server, for instance). */
const SITE_ORIGIN = process.env.MR_EZ_SITE_ORIGIN || 'http://localhost:4321';
/* Every stand-in Worker also accepts the site at MR_EZ_SITE_ORIGIN, so the
   site can run on any port without its requests being refused (the fixed
   lists below are the ports the earlier journeys were written for). */
const withSiteOrigin = (list) =>
  [...new Set([...list.split(','), SITE_ORIGIN, SITE_ORIGIN.replace('//localhost', '//127.0.0.1')])].join(',');
const LIVE_SITE_DATA_URL = `${SITE_ORIGIN}/ielts-website/data/tests`;
/** Where the simulated provider sends the student back (the site's return
    page, built by the purchase UI); `?order=<id>` is added. */
const PAYMENTS_RETURN_URL = `${SITE_ORIGIN}/ielts-website/plans/return`;
/* And the published lesson blocks, which contextual help is grounded in.
   Same Astro dev server, same reasoning. */
const LIVE_LESSON_BLOCKS_URL = `${SITE_ORIGIN}/ielts-website/data/lesson-blocks`;

async function initLive() {
  const { createHandler } = await import('../workers/mr-ez/src/index.ts');
  const key = readOpenAiKey();
  const realFetch = globalThis.fetch;

  /* The Worker talks to Supabase over REST. Those calls are routed back into
     this file's own store, so the real handler's auth, ownership, limits,
     idempotency and persistence all run for real against a database it cannot
     tell is fake. OpenAI calls go straight out. */
  const deps = {
    now: () => new Date(),
    uuid: () => randomUUID(),
    fetch: async (input, init) => {
      const url = typeof input === 'string' ? input : (input.url ?? String(input));
      if (url.startsWith('https://api.openai.com/')) return realFetch(input, init);
      // The published test JSON is a real HTTP request to the Astro dev
      // server, not a stub: the point of --live is that everything except the
      // database is the production path.
      if (url.startsWith(LIVE_SITE_DATA_URL) || url.startsWith(LIVE_LESSON_BLOCKS_URL)) return realFetch(input, init);
      if (!url.startsWith(STUB_SUPABASE)) throw new Error('unexpected fetch to ' + url);

      const parsed = new URL(url);
      const rawHeaders = Object.fromEntries(Object.entries(init && init.headers ? init.headers : {}));
      const lower = {};
      for (const [k, v] of Object.entries(rawHeaders)) lower[k.toLowerCase()] = v;
      // The Worker always uses the service role; this store honours that the
      // same way the real project's row-level security does.
      lower.apikey = 'local-service-role-key';

      const fakeReq = {
        method: (init && init.method) || 'GET',
        headers: lower,
        [Symbol.asyncIterator]: async function* () {
          if (init && init.body) yield Buffer.from(String(init.body));
        },
      };

      return await new Promise((done) => {
        const fakeRes = {
          writeHead(status, h) { this._status = status; this._headers = h; },
          end(body) {
            done(new Response(body || null, { status: this._status || 200, headers: this._headers || {} }));
          },
        };
        if (parsed.pathname.startsWith('/auth/v1')) void handleAuth(fakeReq, fakeRes, parsed);
        else void handleRest(fakeReq, fakeRes, parsed);
      });
    },
  };

  const env = {
    ALLOWED_ORIGINS: withSiteOrigin('http://localhost:4321,http://127.0.0.1:4321,http://localhost:4322,http://127.0.0.1:4322'),
    SUPABASE_URL: STUB_SUPABASE,
    SUPABASE_SERVICE_ROLE_KEY: 'local-service-role-key',
    SITE_DATA_URL: LIVE_SITE_DATA_URL,
    LESSON_BLOCKS_URL: LIVE_LESSON_BLOCKS_URL,
    OPENAI_API_KEY: key,
  };

  const handler = createHandler(deps);
  liveHandler = (bodyText, authHeader) =>
    handler(
      new Request('http://localhost:4321/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:4321',
          Authorization: authHeader || '',
        },
        body: bodyText,
      }),
      env,
    );
}

/* -- Trial bridge (--trial) -----------------------------------------------
   The real Mr EZ Worker and the real essay grader, both with
   ACCESS_MODE=trial, both answering from this file's store and the trial
   migration in PGlite. Nothing leaves this machine: the tutor is simulated,
   and the grader's model call is answered here with a labelled SIMULATED
   assessment. */

let essayHandler = null;
/** The live examiner and the speaking grader, both real Workers with
    ACCESS_MODE=trial, only with --trial. Keyed by the path below /live. */
let liveExaminerHandler = null;
let speakingHandler = null;
/** The live examiner's session rows (live_examiner_sessions in Supabase). */
const liveSessions = [];
/** The content gate (workers/content-gate), serving gated-content/ from
    disk, only with --trial. */
let contentHandler = null;
const CONTENT_SERVICE_KEY = 'local-content-service-key';
const selfBase = () => `http://127.0.0.1:${server.address()?.port ?? PORT}`;
const gateBase = () => `${selfBase()}/content`;
/** The payments Worker (workers/payments) with the SIMULATED provider, only
    with --trial. */
let paymentsHandler = null;
let signPayment = null;
let paymentsSignatureHeader = 'X-Simulated-Signature';
const PAYMENTS_WEBHOOK_SECRET = 'local-simulated-webhook-secret';

/** The speaking grader's three model calls, answered here. Every text the
    student sees says SIMULATED. */
function simulatedSpeakingModel(url) {
  const note = 'SIMULATED: no AI examiner was called. This local stand-in is not a grade.';
  const criterion = { evidence: note, band: 6, comment: note, tip: note, nextBand: simulatedNextBand(note) };
  if (url === 'https://api.openai.com/v1/audio/transcriptions') {
    const text = 'SIMULATED transcript of the local stand-in interview.';
    return { text, duration: 40, words: [], segments: [{ type: 'speech', text, speaker: 'A', start: 0, end: 40, id: 'seg_0' }] };
  }
  if (url === 'https://api.openai.com/v1/responses') {
    const assessment = {
      fluencyCoherence: criterion,
      lexicalResource: criterion,
      grammaticalRange: criterion,
      moments: [{ quote: 'SIMULATED', note }],
      strengths: [note],
      improvements: [note],
    };
    return { output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(assessment) }] }] };
  }
  if (url === 'https://api.openai.com/v1/chat/completions') {
    return { choices: [{ message: { tool_calls: [{ function: { name: 'submit_pronunciation', arguments: JSON.stringify(criterion) } }] } }] };
  }
  return null;
}

/** The live examiner's own table, the way the Worker reads and writes it
    through PostgREST. Only what the Worker asks: eq / is.null / gte / lt. */
function liveSessionsRest(url, init) {
  const u = new URL(url);
  const method = init?.method ?? 'GET';
  if (method === 'POST') {
    const row = { id: randomUUID(), created_at: new Date().toISOString(), ended_at: null, provider_session_id: null, ...JSON.parse(String(init.body)) };
    liveSessions.push(row);
    return new Response(JSON.stringify([row]), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }
  const matches = (row, key, raw) => {
    const value = row[key];
    if (raw === 'is.null') return value === null || value === undefined;
    if (raw === 'not.is.null') return value !== null && value !== undefined;
    const [op, ...rest] = raw.split('.');
    const want = decodeURIComponent(rest.join('.'));
    if (op === 'eq') return String(value) === want;
    if (op === 'gte') return String(value) >= want;
    if (op === 'lt') return String(value) < want;
    return true;
  };
  const rows = liveSessions.filter((row) => [...u.searchParams.entries()].every(([k, v]) => k === 'select' || matches(row, k, v)));
  if (method === 'PATCH') {
    for (const row of rows) Object.assign(row, JSON.parse(String(init.body)));
    return new Response(null, { status: 204 });
  }
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
}

/* A real grade also says how to reach the next band on each criterion, and
   the band report shows the band guide step beneath that advice; the
   stand-in says it too, labelled, so the local report takes the same path. */
const simulatedNextBand = (note) => ({ target: 7, gap: note, actions: [{ do: note, from: 'SIMULATED', to: 'SIMULATED' }] });

function simulatedAssessment() {
  const note = 'SIMULATED: no AI examiner was called. This local stand-in is not a grade.';
  const criterion = { evidence: note, band: 6, comment: note, tip: note, nextBand: simulatedNextBand(note) };
  return {
    criteria: { taskResponse: criterion, coherenceCohesion: criterion, lexicalResource: criterion, grammaticalRange: criterion },
    moments: [{ quote: 'SIMULATED', note }],
    strengths: [note],
    improvements: [note],
  };
}

function bridgeFetch({ onModel }) {
  const realFetch = globalThis.fetch;
  return async (input, init) => {
    const url = typeof input === 'string' ? input : (input.url ?? String(input));
    if (url.startsWith('https://api.openai.com/')) return onModel(input, init);
    // The trial's papers and lesson blocks come from the content gate, in
    // process, exactly as the deployed Worker would fetch them from it.
    if (contentHandler && url.startsWith(gateBase())) {
      return contentHandler(url.slice(gateBase().length) || '/', { ...(init?.headers ?? {}) });
    }
    if (url.startsWith(LIVE_SITE_DATA_URL) || url.startsWith(LIVE_LESSON_BLOCKS_URL)) return realFetch(input, init);
    if (!url.startsWith(STUB_SUPABASE)) throw new Error('unexpected fetch to ' + url);
    const parsed = new URL(url);
    const lower = {};
    for (const [k, v] of Object.entries(init && init.headers ? init.headers : {})) lower[k.toLowerCase()] = v;
    const fakeReq = {
      method: (init && init.method) || 'GET',
      headers: lower,
      [Symbol.asyncIterator]: async function* () {
        if (init && init.body) yield Buffer.from(String(init.body));
      },
    };
    return await new Promise((done) => {
      const fakeRes = {
        writeHead(status, h) { this._status = status; this._headers = h; },
        end(body) {
          done(new Response(body || null, { status: this._status || 200, headers: this._headers || {} }));
        },
      };
      if (parsed.pathname.startsWith('/auth/v1')) void handleAuth(fakeReq, fakeRes, parsed);
      else void handleRest(fakeReq, fakeRes, parsed);
    });
  };
}

async function initTrial() {
  const { createTrialDb } = await import('./trial-db.mjs');
  trialDb = await createTrialDb();

  /* The locked door. Its private store is gated-content/, written by
     tools/build-gated-content.mjs. The REAL gate handler answers, asking the
     real migration whether each student may open each item.
     Rebuilt on EVERY start (a few seconds): building it only when missing
     left an old copy serving stale material, e.g. no paid packs at all
     (verification, 30 September 2026). A custom MR_EZ_GATED_DIR is taken
     as given and only built when missing. */
  const gatedDir = resolve(REPO, process.env.MR_EZ_GATED_DIR || 'gated-content');
  if (!process.env.MR_EZ_GATED_DIR || !existsSync(resolve(gatedDir, 'manifest.json'))) {
    const { buildGatedContent } = await import('./build-gated-content.mjs');
    await buildGatedContent();
  }
  const { createHandler: createGate } = await import('../workers/content-gate/src/index.ts');
  /* Recordings stay where the site keeps them (public/audio/listening):
     the private bucket holds the same files under audio/listening/, and
     copying 530 MB here would only duplicate them. */
  const audioDir = resolve(REPO, 'public/audio/listening');
  const store = {
    async get(key, options = {}) {
      const audio = /^audio\/listening\/(test-\d{3}\.mp3)$/.exec(key);
      const base = audio ? audioDir : gatedDir;
      const path = resolve(base, audio ? audio[1] : key);
      // The gate only ever asks for keys it built from validated ids; this
      // is belt and braces against leaving the folder.
      if (!path.startsWith(base) || !existsSync(path)) return null;
      const size = statSync(path).size;
      const range = options.range;
      const bytes = () => {
        if (!range) return readFileSync(path);
        const length = Math.min(range.length ?? size - range.offset, size - range.offset);
        const buffer = Buffer.alloc(Math.max(0, length));
        const fd = openSync(path, 'r');
        try {
          readSync(fd, buffer, 0, buffer.length, range.offset);
        } finally {
          closeSync(fd);
        }
        return buffer;
      };
      return {
        size,
        text: async () => readFileSync(path, 'utf8'),
        arrayBuffer: async () => {
          const b = bytes();
          return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
        },
      };
    },
  };
  const gate = createGate({ fetch: bridgeFetch({ onModel: async () => { throw new Error('the gate never calls a model'); } }), store });
  const gateEnv = {
    ALLOWED_ORIGINS: withSiteOrigin('http://localhost:4331,http://127.0.0.1:4331,http://localhost:4321,http://127.0.0.1:4321'),
    SUPABASE_URL: STUB_SUPABASE,
    SUPABASE_SERVICE_ROLE_KEY: 'local-service-role-key',
    CONTENT_SERVICE_KEY,
    AUDIO_SIGNING_KEY: 'local-audio-signing-key',
    AUDIO_BASE_URL: gateBase(),
  };
  contentHandler = (pathAndQuery, headers) =>
    gate.fetch(new Request(`http://gate.local${pathAndQuery}`, { headers }), gateEnv);
  const { createHandler } = await import('../workers/mr-ez/src/index.ts');
  const { createHandler: createEssayHandler } = await import('../workers/grade-essay/src/index.ts');

  const noModel = async () => {
    throw new Error('trial stand-in: the tutor is simulated and must not call a model');
  };
  const tutor = createHandler({ now: () => new Date(), uuid: () => randomUUID(), fetch: bridgeFetch({ onModel: noModel }) });
  const tutorEnv = {
    ALLOWED_ORIGINS: withSiteOrigin('http://localhost:4321,http://127.0.0.1:4321,http://localhost:4322,http://127.0.0.1:4322'),
    SUPABASE_URL: STUB_SUPABASE,
    SUPABASE_SERVICE_ROLE_KEY: 'local-service-role-key',
    // A trial build publishes no paper or lesson data: the tutor reads them
    // from the content gate, with the key the two Workers share.
    SITE_DATA_URL: `${gateBase()}/data/tests`,
    LESSON_BLOCKS_URL: `${gateBase()}/data/lesson-blocks`,
    CONTENT_SERVICE_KEY,
    TUTOR_SIMULATE: 'on',
    ACCESS_MODE: 'trial',
  };
  liveHandler = (bodyText, authHeader) =>
    tutor(
      new Request('http://localhost:4321/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4321', Authorization: authHeader || '' },
        body: bodyText,
      }),
      tutorEnv,
    );

  const essay = createEssayHandler({
    fetch: bridgeFetch({
      onModel: async () => {
        if (db.forcedFailure === 'grader') {
          return new Response('{}', { status: 500 });
        }
        return new Response(
          JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(simulatedAssessment()) }] }] }),
          { status: 200 },
        );
      },
    }),
  });
  const essayEnv = {
    ALLOWED_ORIGINS: withSiteOrigin('http://localhost:4321'),
    OPENAI_API_KEY: 'sk-trial-stand-in-never-used',
    GRADING_SAMPLES: '1',
    ACCESS_MODE: 'trial',
    SUPABASE_URL: STUB_SUPABASE,
    SUPABASE_SERVICE_ROLE_KEY: 'local-service-role-key',
  };
  /* The live examiner: the REAL Worker. Creating a voice session is
     answered here with a SIMULATED session and a placeholder answer, so no
     voice call is ever made or paid for. A browser cannot connect to that
     placeholder: the automated journey (tests/browser/t01_trial_journey.py)
     supplies its own in-page stand-in peer for the conversation itself. */
  const { createHandler: createLiveHandler } = await import('../workers/live-examiner/src/index.ts');
  const { createHandler: createSpeakingHandler } = await import('../workers/grade-speaking/src/index.ts');
  const liveBridge = bridgeFetch({
    onModel: async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url === 'https://api.openai.com/v1/live/sessions') {
        // /__force {fail:'live'}: the voice service refuses, once.
        if (db.forcedFailure === 'live') {
          db.forcedFailure = null;
          return new Response('{}', { status: 500 });
        }
        const id = `simulated_live_${randomUUID().slice(0, 8)}`;
        return new Response(
          JSON.stringify({ session: { id }, transport: { type: 'webrtc', sdp: 'v=0\r\ns=SIMULATED placeholder answer\r\n' }, model: 'simulated' }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error('trial stand-in: unexpected model call ' + url);
    },
  });
  const liveExaminer = createLiveHandler({
    fetch: async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.startsWith(`${STUB_SUPABASE}/rest/v1/live_examiner_sessions`)) return liveSessionsRest(url, init);
      return liveBridge(input, init);
    },
    now: () => new Date(),
    sideband: async () => ({ ok: true }),
  });
  const localOrigins = 'http://localhost:4331,http://127.0.0.1:4331,http://localhost:4321,http://127.0.0.1:4321';
  const liveEnv = {
    ALLOWED_ORIGINS: withSiteOrigin(localOrigins),
    OPENAI_API_KEY: 'sk-trial-stand-in-never-used',
    SUPABASE_URL: STUB_SUPABASE,
    SUPABASE_SERVICE_ROLE_KEY: 'local-service-role-key',
    LIVE_MODEL: 'unused',
    ACCESS_MODE: 'trial',
  };
  liveExaminerHandler = (request) => liveExaminer.fetch(request, liveEnv);

  const speaking = createSpeakingHandler({
    fetch: bridgeFetch({
      onModel: async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        if (db.forcedFailure === 'grader') return new Response('{}', { status: 500 });
        const body = simulatedSpeakingModel(url);
        if (!body) throw new Error('trial stand-in: unexpected model call ' + url);
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    }),
  });
  const speakingEnv = {
    ALLOWED_ORIGINS: withSiteOrigin(localOrigins),
    OPENAI_API_KEY: 'sk-trial-stand-in-never-used',
    GRADING_SAMPLES: '1',
    ACCESS_MODE: 'trial',
    SUPABASE_URL: STUB_SUPABASE,
    SUPABASE_SERVICE_ROLE_KEY: 'local-service-role-key',
  };
  speakingHandler = (request) => speaking.fetch(request, speakingEnv);

  /* Payments: the REAL payments Worker (workers/payments) with its
     SIMULATED provider, which the Worker accepts only because both local
     switches are set here. No money moves; the provider's page is
     /__pay/<orderId> below, and every screen says SIMULATED. */
  const paymentsModule = await import('../workers/payments/src/index.ts');
  const payments = paymentsModule.createHandler({
    fetch: bridgeFetch({ onModel: async () => { throw new Error('payments never call a model'); } }),
  });
  signPayment = (raw) => paymentsModule.signSimulatedEvent(PAYMENTS_WEBHOOK_SECRET, raw);
  paymentsSignatureHeader = paymentsModule.SIMULATED_SIGNATURE_HEADER;
  paymentsHandler = (request) =>
    payments.fetch(request, {
      ALLOWED_ORIGINS: withSiteOrigin(localOrigins),
      SUPABASE_URL: STUB_SUPABASE,
      SUPABASE_ANON_KEY: 'local-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'local-service-role-key',
      PAYMENTS_PROVIDER: 'simulated',
      PAYMENTS_ALLOW_SIMULATED: 'local',
      PAYMENTS_WEBHOOK_SECRET,
      PAYMENTS_RETURN_URL: PAYMENTS_RETURN_URL,
      SIMULATED_PAY_URL: `${selfBase()}/__pay`,
    });

  essayHandler = (bodyText, authHeader) =>
    essay.fetch(
      new Request('http://localhost:4321/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4321', Authorization: authHeader || '' },
        body: bodyText,
      }),
      essayEnv,
    );
}

/* -- Payments (--trial) ----------------------------------------------------
   /payments/*        the REAL payments Worker, SIMULATED provider
   /__pay/<orderId>   the SIMULATED provider's payment page: Pay, Fail, Cancel.
                      Each button sends a signed webhook to the Worker, the
                      way a provider's server would, then sends the browser
                      back to <site>/ielts-website/plans/return?order=<id>.
   POST /__pay/refund {orderId}   a signed refund, for tests
   POST /__pay/expire {email}     ends that student's paid access now, for tests
   Nothing here takes or moves money. */

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function orderRow(orderId) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const rows = await trialDb.select(
    'select id, user_id, plan_id, amount, currency, status, provider_ref from public.payment_orders where id = $1',
    [orderId],
    { role: 'service_role' },
  );
  return rows[0] ?? null;
}

/** Sends one signed event to the payments Worker, as the provider would. */
async function simulatedWebhook(event) {
  const raw = JSON.stringify(event);
  const resp = await paymentsHandler(
    new Request('http://payments.local/webhook/simulated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [paymentsSignatureHeader]: await signPayment(raw) },
      body: raw,
    }),
  );
  return { status: resp.status, body: await resp.json().catch(() => null) };
}

function simulatedPayPage(order, returnUrl) {
  const emailOf = [...db.users.values()].find((u) => u.id === order.user_id)?.email ?? 'unknown account';
  const amount = `${Number(order.amount).toLocaleString('en-US')} ${escapeHtml(order.currency)}`;
  const button = (action, label, tone) =>
    `<form method="post" action="/__pay/${escapeHtml(order.id)}/${action}"><input type="hidden" name="return" value="${escapeHtml(returnUrl)}"><button class="${tone}" type="submit">${label}</button></form>`;
  const open = order.status === 'created' || order.status === 'pending';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SIMULATED payment</title>
<style>
  :root { color-scheme: light; --ink: #17332b; --muted: #5d6b66; --line: #e4dfd6; --canvas: #f6f3ee; --warn: #8a4b00; --warn-bg: #fff2dc; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--canvas); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; padding: 24px 16px; }
  main { width: 100%; max-width: 440px; background: #fff; border: 1px solid var(--line); border-radius: 20px; padding: 28px; box-shadow: 0 12px 40px rgba(23, 51, 43, 0.08); }
  .banner { background: var(--warn-bg); color: var(--warn); border-radius: 12px; padding: 12px 14px; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p { margin: 0 0 16px; color: var(--muted); }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 0 0 24px; font-size: 15px; }
  dt { color: var(--muted); } dd { margin: 0; font-weight: 600; word-break: break-all; }
  .actions { display: grid; gap: 10px; }
  button { width: 100%; border: 0; border-radius: 999px; padding: 13px 18px; font: inherit; font-weight: 600; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
  button:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(23, 51, 43, 0.12); }
  .pay { background: var(--ink); color: #fff; } .fail { background: #f3e1de; color: #7a1f12; } .cancel { background: #eeeae3; color: var(--ink); }
  form { margin: 0; }
</style></head><body><main>
<div class="banner" role="note">SIMULATED payment provider. No money is taken and no card is asked for. Local stand-in only.</div>
<h1>SIMULATED checkout</h1>
<p>This page stands in for a real payment provider so the purchase can be tested end to end.</p>
<dl><dt>Plan</dt><dd>${escapeHtml(order.plan_id)}</dd><dt>Amount</dt><dd>${amount}</dd><dt>Account</dt><dd>${escapeHtml(emailOf)}</dd><dt>Order</dt><dd>${escapeHtml(order.id)}</dd><dt>Status</dt><dd id="order-status">${escapeHtml(order.status)}</dd></dl>
${open ? `<div class="actions">${button('pay', 'Pay (SIMULATED)', 'pay')}${button('fail', 'Payment fails (SIMULATED)', 'fail')}${button('cancel', 'Cancel (SIMULATED)', 'cancel')}</div>` : `<p>This order is already ${escapeHtml(order.status)}.</p><form method="get" action="${escapeHtml(returnUrl)}"><button class="cancel" type="submit">Back to the site</button></form>`}
</main></body></html>`;
}

/** The return address a pay page may send the browser to: the site's own
    return page for this order, never anywhere a query names. */
function payReturnUrl(orderId, asked) {
  const fallback = `${PAYMENTS_RETURN_URL}?order=${orderId}`;
  return typeof asked === 'string' && asked === fallback ? asked : fallback;
}

async function handlePay(req, res, url) {
  if (!paymentsHandler) return send(res, 404, { message: 'the simulated payment provider runs only with --trial' });
  const parts = url.pathname.split('/').filter(Boolean); // ['__pay', ...]
  if (req.method === 'POST' && parts[1] === 'refund') {
    const body = await readBody(req);
    const order = await orderRow(String(body.orderId ?? ''));
    if (!order) return send(res, 404, { message: 'no such order' });
    const answer = await simulatedWebhook({ event: 'refunded', orderId: order.id, providerRef: order.provider_ref ?? `sim_${order.id.replace(/-/g, '')}` });
    return send(res, answer.status, { simulated: true, ...answer.body });
  }
  if (req.method === 'POST' && parts[1] === 'expire') {
    const body = await readBody(req);
    const user = db.users.get(String(body.email ?? '').trim().toLowerCase());
    if (!user) return send(res, 404, { message: 'no such local user' });
    const grants = await trialDb.expirePaid(user.id);
    return send(res, 200, { simulated: true, expired: user.email, grants });
  }
  const order = parts[1] ? await orderRow(parts[1]) : null;
  if (!order) return send(res, 404, { message: 'no such order' });
  if (req.method === 'GET' && parts.length === 2) {
    const page = simulatedPayPage(order, payReturnUrl(order.id, url.searchParams.get('return')));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(page);
  }
  if (req.method === 'POST' && parts.length === 3 && ['pay', 'fail', 'cancel'].includes(parts[2])) {
    const form = new URLSearchParams(await readRaw(req));
    const providerRef = order.provider_ref ?? `sim_${order.id.replace(/-/g, '')}`;
    const event =
      parts[2] === 'pay'
        ? { event: 'paid', orderId: order.id, providerRef, amount: order.amount, currency: order.currency }
        : parts[2] === 'fail'
          ? { event: 'failed', orderId: order.id, providerRef, reason: 'declined (simulated)' }
          : { event: 'cancelled', orderId: order.id, providerRef };
    const answer = await simulatedWebhook(event);
    const back = payReturnUrl(order.id, form.get('return'));
    if (String(req.headers.accept ?? '').includes('application/json')) {
      return send(res, answer.status, { simulated: true, webhook: answer.body, returnUrl: back });
    }
    res.writeHead(303, { Location: back, 'Cache-Control': 'no-store' });
    return res.end();
  }
  return send(res, 404, { message: 'not found' });
}

async function handlePayments(req, res, url) {
  if (!paymentsHandler) return send(res, 404, { message: 'the payments Worker runs only with --trial' });
  const headers = {};
  for (const name of ['authorization', 'origin', 'content-type']) if (req.headers[name]) headers[name] = req.headers[name];
  const body = req.method === 'POST' ? await readRaw(req) : undefined;
  const resp = await paymentsHandler(
    new Request(`http://payments.local${url.pathname.slice('/payments'.length) || '/'}${url.search}`, { method: req.method, headers, body }),
  );
  const text = await resp.text();
  res.writeHead(resp.status, Object.fromEntries(resp.headers));
  return res.end(text);
}
const support = createSupportStandIn({ db, userByToken, send, readBody }); // [E trust]

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') return send(res, 204, null);

  try {
    if (await support.handle(req, res, url)) return; // [E trust] before /rest/v1, which would refuse these rpc names
    if (url.pathname.startsWith('/auth/v1')) return await handleAuth(req, res, url);
    if (url.pathname.startsWith('/rest/v1/')) return await handleRest(req, res, url);
    if (url.pathname.startsWith('/tutor')) return await handleTutor(req, res, url);
    if (url.pathname.startsWith('/content/')) {
      if (!contentHandler) return send(res, 404, { message: 'the content gate runs only with --trial' });
      const resp = await contentHandler(url.pathname.slice('/content'.length) + url.search, {
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        ...(req.headers.origin ? { Origin: req.headers.origin } : {}),
        ...(req.headers.range ? { Range: req.headers.range } : {}),
      });
      // Bytes, not text: a recording passes through here too.
      const body = Buffer.from(await resp.arrayBuffer());
      res.writeHead(resp.status, Object.fromEntries(resp.headers));
      return res.end(body);
    }
    if (url.pathname === '/grade-essay' && req.method === 'POST') {
      if (!essayHandler) return send(res, 404, { message: 'the essay grader stand-in runs only with --trial' });
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const resp = await essayHandler(Buffer.concat(chunks).toString('utf8') || '{}', req.headers.authorization);
      const text = await resp.text();
      return send(res, resp.status, text ? JSON.parse(text) : null);
    }
    if (url.pathname === '/live' || url.pathname.startsWith('/live/') || url.pathname === '/grade-speaking') {
      const handler = url.pathname === '/grade-speaking' ? speakingHandler : liveExaminerHandler;
      if (!handler) return send(res, 404, { message: 'the speaking stand-ins run only with --trial' });
      const chunks = [];
      if (req.method === 'POST') for await (const chunk of req) chunks.push(chunk);
      const path = url.pathname === '/grade-speaking' ? '/' : url.pathname.slice('/live'.length) || '/';
      const headers = { 'Content-Type': 'application/json' };
      if (req.headers.authorization) headers.Authorization = req.headers.authorization;
      if (req.headers.origin) headers.Origin = req.headers.origin;
      const resp = await handler(
        new Request(`http://localhost${path}`, {
          method: req.method,
          headers,
          body: req.method === 'POST' ? Buffer.concat(chunks).toString('utf8') : undefined,
        }),
      );
      const text = await resp.text();
      res.writeHead(resp.status, Object.fromEntries(resp.headers));
      return res.end(text);
    }
    if (url.pathname === '/payments' || url.pathname.startsWith('/payments/')) return await handlePayments(req, res, url);
    if (url.pathname.startsWith('/__pay/')) return await handlePay(req, res, url);
    if (url.pathname === '/__trial/rewind' && req.method === 'POST') {
      // Local only: age one student's trial, to see the ended state.
      if (!trialDb) return send(res, 404, { message: 'start with --trial' });
      const body = await readBody(req);
      const user = db.users.get(String(body.email ?? '').trim().toLowerCase());
      if (!user) return send(res, 404, { message: 'no such local user' });
      await trialDb.rewind(user.id, Number(body.minutes) || 0);
      return send(res, 200, { rewound: user.email, minutes: Number(body.minutes) || 0 });
    }
    if (url.pathname === '/__access/complimentary' && req.method === 'POST') {
      /* STAND-IN TEST HELPER (local only, never a site route): runs the real
         admin function as the stand-in admin, for scripts. The admin panel
         in the browser calls the same function with Alex's own sign-in. */
      if (!trialDb) return send(res, 404, { message: 'start with --trial' });
      const body = await readBody(req);
      const user = db.users.get(String(body.email ?? '').trim().toLowerCase());
      if (!user) return send(res, 404, { message: 'no such local user' });
      const action = String(body.action ?? '');
      if (!['give', 'renew', 'stop'].includes(action)) return send(res, 400, { message: 'action must be give, renew or stop' });
      let admin = db.users.get(STAND_IN_ADMIN);
      if (!admin) {
        admin = { id: randomUUID(), email: STAND_IN_ADMIN, password: randomUUID(), user_metadata: {} };
        db.users.set(STAND_IN_ADMIN, admin);
        await trialDb.addUser(admin.id, STAND_IN_ADMIN);
      }
      await trialDb.makeAdmin(admin.id, 'stand-in admin (local only)');
      const result = await trialDb.rpc(
        'access_admin_complimentary',
        { p_user: user.id, p_action: action, p_note: typeof body.note === 'string' ? body.note : 'stand-in helper' },
        { role: 'authenticated', userId: admin.id },
      );
      return send(res, 200, { standIn: true, email: user.email, ...result });
    }
    if (url.pathname === '/__trial/state') {
      if (!trialDb) return send(res, 404, { message: 'start with --trial' });
      const emailOf = (id) => [...db.users.values()].find((u) => u.id === id)?.email ?? id;
      const accounts = await trialDb.select('select user_id, started_at, ends_at, questionnaire from public.trial_accounts', [], { role: 'service_role' });
      const usage = await trialDb.select(
        'select user_id, kind, section, request_id, activity_id, status, sessions, reserved_at, settled_at from public.trial_usage order by reserved_at',
        [],
        { role: 'service_role' },
      );
      const orders = await trialDb.select(
        'select id, user_id, plan_id, amount, currency, provider, provider_ref, status, created_at, paid_at, refunded_at, receipt_number from public.payment_orders order by created_at',
        [],
        { role: 'service_role' },
      );
      const grants = await trialDb.select(
        'select id, user_id, kind, order_id, plan_id, starts_at, ends_at, revoked_at, stopped_at, granted_by, note, (revoked_at is null and starts_at <= now() and ends_at > now()) as running from public.access_grants order by starts_at',
        [],
        { role: 'service_role' },
      );
      return send(res, 200, {
        accounts: accounts.map((a) => ({ ...a, email: emailOf(a.user_id) })),
        usage: usage.map((u) => ({ ...u, email: emailOf(u.user_id) })),
        orders: orders.map((o) => ({ ...o, email: emailOf(o.user_id) })),
        grants: grants.map((g) => ({ ...g, email: emailOf(g.user_id), grantedByEmail: g.granted_by ? emailOf(g.granted_by) : null })),
        tiers: await Promise.all(
          [...db.users.values()].map(async (u) => ({
            email: u.email,
            tier: (await trialDb.select('select public.access_tier($1) as tier', [u.id], { role: 'service_role' }).catch(() => [{ tier: null }]))[0]?.tier ?? null,
          })),
        ),
      });
    }
    if (url.pathname === '/__force') {
      const body = await readBody(req);
      db.forcedFailure = body.fail ?? null;
      // How many requests the failure applies to; 'save-turn' only.
      db.forcedTimes = Number(body.times) || 1;
      return send(res, 200, { forcedFailure: db.forcedFailure, times: db.forcedTimes });
    }
    if (url.pathname === '/__state') {
      // A read-only window into the fake database, so a verification run can
      // assert what was actually stored rather than only what was rendered.
      return send(res, 200, {
        users: [...db.users.values()].map((u) => ({ id: u.id, email: u.email })),
        conversations: db.conversations,
        messages: db.messages.map(({ id, user_id, conversation_id, role, content }) => ({ id, user_id, conversation_id, role, content })),
        turns: db.turns.length,
        turnsWithStoredReply: db.turns.filter((t) => t.reply).length,
        recommendations: [...db.recommendations.keys()],
        notes: db.notes.map(({ user_id, kind, note_key, fingerprint }) => ({ user_id, kind, note_key, fingerprint })),
        learningEvents: db.learningEvents.map(({ user_id, event_id, activity_id, occurred_at }) => ({
          user_id,
          event_id,
          activity_id,
          occurred_at,
        })),
        learningPlans: [...db.learningPlans.values()].map(({ user_id, revision, confirmed, updated_at }) => ({
          user_id,
          revision,
          confirmed,
          updated_at,
        })),
        learningCompanions: db.learningCompanions.map(({ user_id, kind, revision }) => ({ user_id, kind, revision })),
      });
    }
  } catch (err) {
    console.error('dev server error', err);
    return send(res, 500, { error: String(err) });
  }

  return send(res, 404, { message: 'not found' });
});

// Exported so tests/learning-sync-server.test.ts can start this same server
// on an OS-assigned free port (MR_EZ_DEV_PORT=0) and close it when done,
// without spawning a second process or duplicating any of the logic above.
// Exporting does not change plain `node tools/mr-ez-dev-server.mjs` usage at
// all: nothing here reads these exports back.
export { server, db };

if (LIVE) await initLive();
if (TRIAL) await initTrial();

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mr EZ dev backend on http://127.0.0.1:${PORT}`);
  console.log('  Supabase stand-in : /auth/v1/*  /rest/v1/*');
  console.log('  Support           : /support  (real Worker for signed-out visitors, real migration in PGlite)'); // [R01 support]
  if (TRIAL) {
    console.log('  Trial database    : /rest/v1/rpc/trial_*  (the real migration, in PGlite)');
    console.log('  Tutor             : /tutor  (real Worker, ACCESS_MODE=trial, simulated replies)');
    console.log('  Essay grader      : /grade-essay  (real Worker, ACCESS_MODE=trial, SIMULATED assessment)');
    console.log('  Content gate      : /content/*  (real Worker, private copy in gated-content/)');
    console.log('  Live examiner     : /live  (real Worker, ACCESS_MODE=trial, SIMULATED session, no voice call)');
    console.log('  Speaking grader   : /grade-speaking  (real Worker, ACCESS_MODE=trial, SIMULATED assessment)');
    console.log('  Payments          : /payments  (real Worker, SIMULATED provider at /__pay, no money moves)');
    console.log(`  Free accounts     : lessons open with a profile; practice and AI 402 paid-required; trial retired`);
    console.log(`  Stand-in admin    : ${STAND_IN_ADMIN} (sign up with it; /admin and complimentary access, local only)`);
    console.log('  Test helper       : POST /__access/complimentary {email, action}  (STAND-IN ONLY)');
  } else if (LIVE) {
    console.log('  Tutor             : /tutor  *** LIVE: real Worker, real model, REAL MONEY ***');
    console.log('                      roughly $0.0005 per message');
    console.log(`  Test data         : ${LIVE_SITE_DATA_URL} (needs \`npm run dev\` running)`);
    console.log(`  Lesson blocks     : ${LIVE_LESSON_BLOCKS_URL}`);
  } else {
    console.log('  Tutor stand-in    : /tutor  (every reply is flagged simulated)');
  }
});
