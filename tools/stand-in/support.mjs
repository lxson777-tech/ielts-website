/* The support requests ("Report a problem / ask a person") for the local
 * stand-in, tools/mr-ez-dev-server.mjs, in both its open and --trial modes.
 *
 * Owned by Builder E (trust). Kept in its own file so the stand-in itself
 * only needs three marked lines to mount it (an import, one call, one line
 * at the top of the request handler).
 *
 * What it answers, exactly as PostgREST would, from the REAL migrations
 * running in PGlite (supabase/migrations/2026-09-24-admin.sql for
 * is_admin, then 2026-09-30-support.sql), as the signed-in student, as the
 * service role or as anon:
 *   POST /rest/v1/rpc/support_request_create    signed-in students only
 *   POST /rest/v1/rpc/support_request_visitor   service role only; anon and
 *   POST /rest/v1/rpc/support_source_cleanup    students are refused by the
 *   POST /rest/v1/rpc/support_limits            database itself, as for real
 *   POST /rest/v1/rpc/support_admin_list
 *   POST /rest/v1/rpc/support_admin_mark
 *   POST /rest/v1/rpc/support_retention        2026-10-02-support-
 *   POST /rest/v1/rpc/support_visitor_retention  retention.sql
 *   POST /rest/v1/rpc/support_my_requests
 *   POST /rest/v1/rpc/is_admin
 *   POST /rest/v1/rpc/admin_list_users   (a plain stand-in, see below)
 *
 * And the REAL support Worker (workers/support), for signed-out visitors
 * (re-audit R01, 30 September 2026), in both modes:
 *   GET  /support
 *   POST /support/request
 * Point the site at it with PUBLIC_SUPPORT_URL=http://127.0.0.1:<port>/support.
 * Its database calls are answered in this process by the same PGlite
 * database, as the service role. No bot-check secret is set, so it makes no
 * outside call at all.
 *
 * THE SENDER'S ADDRESS. The Worker reads it from CF-Connecting-IP only,
 * which Cloudflare sets for real. Cloudflare is not in front of a local
 * server, so THIS BRIDGE plays that part: it sets the header from the
 * connection's own address and drops any copy the client sent. FOR TESTS
 * ONLY it also honours an `X-Standin-Source` request header, to play a
 * visitor on a different address. That override exists only here, in the
 * stand-in. The Worker has no such header and never will.
 *
 * THE BOT CHECK. Off by default, as on any local run. Start the stand-in
 * with MR_EZ_SUPPORT_CHALLENGE=stub to switch the Worker's check ON with a
 * pretend secret: Cloudflare's verification call is then answered here, in
 * this process (a token beginning `stub-pass` passes, anything else fails),
 * so the whole path can be clicked through with nothing leaving the
 * machine. It proves the Worker and the form, never Cloudflare itself.
 *
 * Local helpers, never part of the site:
 *   POST /__support/admin  {email}   makes that local account an admin
 *   GET  /__support/state            every stored request, for test runs
 * MR_EZ_ADMIN_EMAILS=a@example.test,b@example.test does the same as the
 * first helper for accounts as they sign in.
 *
 * admin_list_users is answered here only so /admin opens without an error
 * in the stand-in: one row per local account with its profile and zeros for
 * the study counts. The real function (2026-09-24-profiles.sql) reads tables
 * this stand-in does not have. It refuses non-admins exactly as the real one.
 *
 * Local only. Nothing here can reach a real database.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTrialDb } from '../trial-db.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const ADMIN_MIGRATION = resolve(REPO, 'supabase/migrations/2026-09-24-admin.sql');
export const SUPPORT_MIGRATION = resolve(REPO, 'supabase/migrations/2026-09-30-support.sql');
/** Visitor-message retention and a student's own copy (2 October 2026). */
export const SUPPORT_RETENTION_MIGRATION = resolve(REPO, 'supabase/migrations/2026-10-02-support-retention.sql');

const HANDLED_RPC = new Set([
  'support_request_create',
  'support_request_visitor',
  'support_source_cleanup',
  'support_limits',
  'support_admin_list',
  'support_admin_mark',
  'support_retention',
  'support_visitor_retention',
  'support_my_requests',
  'is_admin',
  'admin_list_users',
]);

/* The support Worker's local settings. The "Supabase" address is never
   dialled: the bridge below answers it in this process. */
const STUB_SUPABASE = 'http://supabase.stand-in.local';
const SERVICE_KEY = 'local-service-role-key';
const LOCAL_SOURCE_SALT = 'local-stand-in-source-salt-not-a-secret';
const STUB_TURNSTILE_SECRET = 'local-stub-turnstile-secret-not-a-secret';
/** The test-only header that plays a visitor on another address. Read here
    and nowhere else. */
export const STANDIN_SOURCE_HEADER = 'x-standin-source';

/** The origins the local Worker accepts: the usual dev ports, plus wherever
    MR_EZ_SITE_ORIGIN says the site is running. */
function localOrigins() {
  const site = process.env.MR_EZ_SITE_ORIGIN || 'http://localhost:4321';
  return [...new Set(['http://localhost:4321', 'http://127.0.0.1:4321', site, site.replace('//localhost', '//127.0.0.1')])].join(',');
}

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

/** A fresh in-memory Postgres with Supabase's roles, the admin migration
    and the support migration applied. Used by the stand-in and by
    tests/support-sql.test.ts. Returns the same object tools/trial-db.mjs
    returns, plus makeAdmin(). */
export async function createSupportDb() {
  const db = await createTrialDb({ migration: ADMIN_MIGRATION });
  await db.raw.exec(readFileSync(SUPPORT_MIGRATION, 'utf8'));
  await db.raw.exec(readFileSync(SUPPORT_RETENTION_MIGRATION, 'utf8'));
  return Object.assign(db, {
    async makeAdmin(userId, note = 'local stand-in admin') {
      await db.raw.query('insert into public.admins (user_id, note) values ($1, $2) on conflict (user_id) do nothing', [userId, note]);
    },
  });
}

/**
 * The stand-in's support routes. `db` is the stand-in's in-memory store
 * (users, profiles), `userByToken`, `send` and `readBody` its own helpers.
 * The database boots on the first support request, so starting the stand-in
 * costs nothing extra.
 */
export function createSupportStandIn({ db, userByToken, send, readBody }) {
  let ready = null;
  const adminEmails = new Set(
    String(process.env.MR_EZ_ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );

  function database() {
    ready ??= createSupportDb();
    return ready;
  }

  /** The REAL support Worker handler, loaded on the first request to it. */
  let workerReady = null;
  function worker() {
    workerReady ??= (async () => {
      // The Worker's imports are extensionless TypeScript, and this stand-in
      // can be started with plain `node`. Registering the tests' resolver
      // here makes both ways of starting it work (twice is harmless).
      await import('../../tests/ts-extension-loader.mjs');
      const mod = await import('../../workers/support/src/index.ts');
      const sdb = await database();
      /* The Worker's only outside calls. The database one is answered here,
         by the role its key proves, exactly as PostgREST would. Anything
         else (the bot check, which is not configured locally) is an error:
         nothing leaves this machine. */
      const stubChallenge = process.env.MR_EZ_SUPPORT_CHALLENGE === 'stub';
      const bridge = async (input, init) => {
        const target = String(input);
        if (stubChallenge && target === mod.SITEVERIFY_URL) {
          // Cloudflare's part, played here. See "THE BOT CHECK" above.
          const form = new URLSearchParams(String(init?.body ?? ''));
          const passed = form.get('secret') === STUB_TURNSTILE_SECRET && String(form.get('response') ?? '').startsWith('stub-pass');
          return new Response(JSON.stringify(passed ? { success: true } : { success: false, 'error-codes': ['invalid-input-response'] }));
        }
        const prefix = `${STUB_SUPABASE}/rest/v1/rpc/`;
        if (!target.startsWith(prefix)) throw new Error(`the support stand-in makes no outside call: ${target}`);
        const role = (init?.headers ?? {}).apikey === SERVICE_KEY ? 'service_role' : 'anon';
        try {
          const result = await sdb.rpc(target.slice(prefix.length), JSON.parse(String(init?.body ?? '{}')), { role });
          return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (err) {
          return new Response(JSON.stringify({ message: err.message, code: err.code }), { status: err.status ?? 400 });
        }
      };
      return {
        handler: mod.createHandler({ fetch: bridge }),
        sourceHeader: mod.SOURCE_HEADER,
        env: {
          ALLOWED_ORIGINS: localOrigins(),
          SUPABASE_URL: STUB_SUPABASE,
          SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
          SUPPORT_SOURCE_SALT: LOCAL_SOURCE_SALT,
          // No real bot check locally, ever. Unset unless the stub is asked for.
          ...(stubChallenge ? { TURNSTILE_SECRET_KEY: STUB_TURNSTILE_SECRET } : {}),
        },
      };
    })();
    return workerReady;
  }

  /** The address this request came from, as Cloudflare would report it. */
  function sourceOf(req) {
    const played = req.headers[STANDIN_SOURCE_HEADER];
    if (typeof played === 'string' && played.trim()) return played.trim(); // tests only
    return req.socket?.remoteAddress ?? '';
  }

  async function handleWorker(req, res, url) {
    const { handler, sourceHeader, env } = await worker();
    const headers = {};
    // X-Forwarded-For is passed through so a run can show the Worker ignores it.
    for (const name of ['origin', 'content-type', 'x-forwarded-for']) if (req.headers[name]) headers[name] = req.headers[name];
    // Set here and only here; a client's own copy of the header is dropped.
    headers[sourceHeader] = sourceOf(req);
    const body = req.method === 'POST' ? await readRaw(req) : undefined;
    const resp = await handler.fetch(
      new Request(`http://support.stand-in.local${url.pathname.slice('/support'.length) || '/'}${url.search}`, { method: req.method, headers, body }),
      env,
    );
    const text = await resp.text();
    res.writeHead(resp.status, Object.fromEntries(resp.headers));
    res.end(text);
  }

  const userById = (id) => [...db.users.values()].find((u) => u.id === id) ?? null;

  /** Puts a local account into auth.users (and into admins when listed). */
  async function known(sdb, user) {
    if (!user) return;
    await sdb.addUser(user.id, user.email);
    if (adminEmails.has(String(user.email).toLowerCase())) await sdb.makeAdmin(user.id);
  }

  function roleOf(req) {
    if ((req.headers.apikey ?? '') === SERVICE_KEY) return { role: 'service_role' };
    const caller = userByToken(req);
    return caller ? { role: 'authenticated', userId: caller } : { role: 'anon' };
  }

  async function adminListUsers(sdb, opts) {
    const isAdmin = await sdb.rpc('is_admin', {}, opts);
    if (isAdmin !== true) {
      const err = new Error('admin only');
      err.code = '42501';
      err.status = 403;
      throw err;
    }
    const profiles = db.profiles instanceof Map ? db.profiles : new Map();
    const admins = new Set((await sdb.raw.query('select user_id from public.admins')).rows.map((r) => r.user_id));
    return [...db.users.values()].map((u) => {
      const p = profiles.get(u.id) ?? null;
      return {
        user_id: u.id,
        email: u.email,
        provider: 'email',
        email_confirmed: true,
        is_admin: admins.has(u.id),
        joined_at: u.created_at ?? new Date().toISOString(),
        last_sign_in_at: null,
        last_synced_at: null,
        last_active_day: null,
        active_days: 0,
        minutes_studied: 0,
        lessons_done: 0,
        tests_taken: 0,
        best_reading: null,
        best_listening: null,
        writing_count: 0,
        best_writing: null,
        speaking_count: 0,
        best_speaking: null,
        target_band: null,
        test_date: null,
        daily_minutes: null,
        plan_chosen: false,
        tutor_messages: 0,
        examiner_sessions: 0,
        recent: [],
        first_name: p?.first_name ?? null,
        last_name: p?.last_name ?? null,
        date_of_birth: p?.date_of_birth ?? null,
        phone: p?.phone ?? null,
        city: p?.city ?? null,
        occupation: p?.occupation ?? null,
        source: p?.source ?? null,
        parent_name: p?.parent_name ?? null,
        parent_phone: p?.parent_phone ?? null,
        parent_consent_at: p?.parent_consent_at ?? null,
        profile_updated_at: p?.updated_at ?? null,
      };
    });
  }

  /** True when this request was a support route and has been answered. */
  async function handle(req, res, url) {
    const path = url.pathname;
    if (path === '/support' || path.startsWith('/support/')) return await handleWorker(req, res, url), true;
    const rpc = path.startsWith('/rest/v1/rpc/') ? path.slice('/rest/v1/rpc/'.length) : null;
    if (rpc && HANDLED_RPC.has(rpc) && req.method === 'POST') {
      const sdb = await database();
      const opts = roleOf(req);
      if (opts.userId) await known(sdb, userById(opts.userId));
      const args = await readBody(req);
      try {
        if (rpc === 'admin_list_users') return send(res, 200, await adminListUsers(sdb, opts)), true;
        return send(res, 200, await sdb.rpc(rpc, args ?? {}, opts)), true;
      } catch (err) {
        return send(res, err.status ?? 400, { message: err.message, code: err.code }), true;
      }
    }

    if (path === '/__support/admin' && req.method === 'POST') {
      const sdb = await database();
      const body = await readBody(req);
      const user = db.users.get(String(body.email ?? '').trim().toLowerCase());
      if (!user) return send(res, 404, { message: 'no such local user' }), true;
      await known(sdb, user);
      await sdb.makeAdmin(user.id);
      return send(res, 200, { admin: user.email }), true;
    }

    if (path === '/__support/state' && req.method === 'GET') {
      const sdb = await database();
      // Read as the database owner: this is a local inspection helper.
      const { rows } = await sdb.raw.query(
        'select r.*, u.email as account_email from public.support_requests r left join auth.users u on u.id = r.user_id order by r.created_at desc',
      );
      return send(res, 200, { requests: rows }), true;
    }

    return false;
  }

  // `database` is read by tools/stand-in/admin-work.mjs for the admins list.
  return { handle, database };
}
