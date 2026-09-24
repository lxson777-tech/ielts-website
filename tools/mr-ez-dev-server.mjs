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
 *
 * Failure states can be forced with query flags on the tutor URL, so the
 * loading, retry, unavailable and limit-reached screens can all be seen:
 *   ?fail=unavailable   ?fail=busy   ?fail=limit   ?slow=3000
 */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.MR_EZ_DEV_PORT ?? 8787);
const LIVE = process.argv.includes('--live');
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
    return send(res, 200, { external: { email: true, google: false }, disable_signup: false });
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

async function handleRest(req, res, url) {
  const table = url.pathname.replace('/rest/v1/', '');
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
const LIVE_SITE_DATA_URL = 'http://localhost:4321/ielts-website/data/tests';
/* And the published lesson blocks, which contextual help is grounded in.
   Same Astro dev server, same reasoning. */
const LIVE_LESSON_BLOCKS_URL = 'http://localhost:4321/ielts-website/data/lesson-blocks';

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
    ALLOWED_ORIGINS: 'http://localhost:4321,http://127.0.0.1:4321,http://localhost:4322,http://127.0.0.1:4322',
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

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') return send(res, 204, null);

  try {
    if (url.pathname.startsWith('/auth/v1')) return await handleAuth(req, res, url);
    if (url.pathname.startsWith('/rest/v1/')) return await handleRest(req, res, url);
    if (url.pathname.startsWith('/tutor')) return await handleTutor(req, res, url);
    if (url.pathname === '/__force') {
      const body = await readBody(req);
      db.forcedFailure = body.fail ?? null;
      return send(res, 200, { forcedFailure: db.forcedFailure });
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

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mr EZ dev backend on http://127.0.0.1:${PORT}`);
  console.log('  Supabase stand-in : /auth/v1/*  /rest/v1/*');
  if (LIVE) {
    console.log('  Tutor             : /tutor  *** LIVE: real Worker, real model, REAL MONEY ***');
    console.log('                      roughly $0.0005 per message');
    console.log(`  Test data         : ${LIVE_SITE_DATA_URL} (needs \`npm run dev\` running)`);
    console.log(`  Lesson blocks     : ${LIVE_LESSON_BLOCKS_URL}`);
  } else {
    console.log('  Tutor stand-in    : /tutor  (every reply is flagged simulated)');
  }
});
