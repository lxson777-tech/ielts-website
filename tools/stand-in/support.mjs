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
 *   POST /rest/v1/rpc/support_request_create
 *   POST /rest/v1/rpc/support_admin_list
 *   POST /rest/v1/rpc/support_admin_mark
 *   POST /rest/v1/rpc/is_admin
 *   POST /rest/v1/rpc/admin_list_users   (a plain stand-in, see below)
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

const HANDLED_RPC = new Set(['support_request_create', 'support_admin_list', 'support_admin_mark', 'is_admin', 'admin_list_users']);

/** A fresh in-memory Postgres with Supabase's roles, the admin migration
    and the support migration applied. Used by the stand-in and by
    tests/support-sql.test.ts. Returns the same object tools/trial-db.mjs
    returns, plus makeAdmin(). */
export async function createSupportDb() {
  const db = await createTrialDb({ migration: ADMIN_MIGRATION });
  await db.raw.exec(readFileSync(SUPPORT_MIGRATION, 'utf8'));
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

  const userById = (id) => [...db.users.values()].find((u) => u.id === id) ?? null;

  /** Puts a local account into auth.users (and into admins when listed). */
  async function known(sdb, user) {
    if (!user) return;
    await sdb.addUser(user.id, user.email);
    if (adminEmails.has(String(user.email).toLowerCase())) await sdb.makeAdmin(user.id);
  }

  function roleOf(req) {
    if ((req.headers.apikey ?? '') === 'local-service-role-key') return { role: 'service_role' };
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

  return { handle };
}
