/* One student's work for the admin panel, for the local stand-in
 * (tools/mr-ez-dev-server.mjs), in both its open and --trial modes.
 *
 * Answers, as PostgREST would:
 *   POST /rest/v1/rpc/admin_student_work   {p_user}
 *
 * with the REAL function (supabase/migrations/2026-10-05-admin-student-work.sql)
 * running in PGlite on top of the real files it reads from: supabase/schema.sql
 * (user_state), 2026-09-21-learning.sql (learning_events) and
 * 2026-09-24-admin.sql (admins, is_admin). Nothing in this file decides who
 * may see what: the function's own admin check does.
 *
 * The stand-in keeps its accounts, progress and learning events in memory
 * (the `db` object in mr-ez-dev-server.mjs). Before each call they are
 * copied into this database, so the function reads exactly what the browser
 * saved. Who is an admin is copied from the support stand-in's database
 * (tools/stand-in/support.mjs), which is what the panel's is_admin asks, plus
 * MR_EZ_ADMIN_EMAILS, so the two can never disagree.
 *
 * createAdminWorkDb() is also what tests/admin-student-work-sql.test.ts boots.
 *
 * Local only. Nothing here can reach a real database.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SCHEMA_FILE = resolve(REPO, 'supabase/schema.sql');
export const LEARNING_MIGRATION = resolve(REPO, 'supabase/migrations/2026-09-21-learning.sql');
export const ADMIN_MIGRATION = resolve(REPO, 'supabase/migrations/2026-09-24-admin.sql');
export const PROFILES_MIGRATION = resolve(REPO, 'supabase/migrations/2026-09-24-profiles.sql');
export const ADMIN_WORK_MIGRATION = resolve(REPO, 'supabase/migrations/2026-10-05-admin-student-work.sql');
/** Exactly what production has, in the order it was applied, then the new file. */
export const ADMIN_WORK_FILES = [SCHEMA_FILE, LEARNING_MIGRATION, ADMIN_MIGRATION, PROFILES_MIGRATION, ADMIN_WORK_MIGRATION];

/* The small part of Supabase these files rely on: the three roles with
   Supabase's default grants, auth.users and auth.uid(). Unlike
   tools/trial-db.mjs, no table of schema.sql is faked here: the real file runs. */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    created_at timestamptz not null default now(),
    last_sign_in_at timestamptz,
    email_confirmed_at timestamptz default now(),
    raw_app_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function dbError(err) {
  const e = new Error(err?.message ?? String(err));
  e.code = err?.code ?? 'XX000';
  e.status = e.code === '42501' ? 403 : e.code === '42883' ? 404 : 400;
  return e;
}

/** A fresh in-memory Postgres with the real files applied. */
export async function createAdminWorkDb({ files = ADMIN_WORK_FILES } = {}) {
  const pg = new PGlite();
  await pg.exec(SUPABASE_STUB);
  for (const file of files) await pg.exec(readFileSync(file, 'utf8'));

  async function as(role, userId, work) {
    if (!['anon', 'authenticated', 'service_role'].includes(role)) throw new Error(`unknown role ${role}`);
    if (userId && !UUID_RE.test(userId)) throw new Error('user id must be a uuid');
    try {
      return await pg.transaction(async (tx) => {
        await tx.exec(`set local role ${role}`);
        await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
        return await work(tx);
      });
    } catch (err) {
      throw dbError(err);
    }
  }

  return {
    raw: pg,
    async addUser(id, email = null) {
      await pg.query('insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing', [id, email]);
    },
    async makeAdmin(id, note = 'local admin') {
      await pg.query('insert into public.admins (user_id, note) values ($1, $2) on conflict (user_id) do nothing', [id, note]);
    },
    /** PostgREST's /rest/v1/rpc/admin_student_work, as `role`. */
    async studentWork(pUser, { role = 'authenticated', userId = null } = {}) {
      return as(role, userId, async (tx) => (await tx.query('select public.admin_student_work(p_user => $1) as result', [pUser])).rows[0]?.result ?? null);
    },
    /** A plain query through row security, as `role`. */
    async select(sql, params = [], { role = 'authenticated', userId = null } = {}) {
      return as(role, userId, async (tx) => (await tx.query(sql, params)).rows);
    },
    close: () => pg.close(),
  };
}

/**
 * The stand-in route. `db` is the stand-in's in-memory store, `support` the
 * support stand-in (for its admins), `userByToken`, `send` and `readBody`
 * the stand-in's own helpers.
 */
export function createAdminWorkStandIn({ db, support, userByToken, send, readBody }) {
  let ready = null;
  const database = () => (ready ??= createAdminWorkDb());
  const adminEmails = () =>
    new Set(
      String(process.env.MR_EZ_ADMIN_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    );

  /** Copies the stand-in's accounts, admins, progress and learning events in,
      replacing what the last call copied. */
  async function sync(wdb) {
    const pg = wdb.raw;
    await pg.exec('delete from public.learning_events; delete from public.user_state; delete from public.admins; delete from auth.users;');
    const listed = adminEmails();
    let supportAdmins = new Set();
    try {
      const sdb = await support.database();
      supportAdmins = new Set((await sdb.raw.query('select user_id from public.admins')).rows.map((r) => r.user_id));
    } catch {
      /* The support database not booted yet: the listed emails still count. */
    }
    for (const user of db.users.values()) {
      if (!UUID_RE.test(String(user.id))) continue;
      await wdb.addUser(user.id, user.email);
      if (listed.has(String(user.email).toLowerCase()) || supportAdmins.has(user.id)) await wdb.makeAdmin(user.id, 'stand-in admin (local only)');
    }
    const known = new Set([...db.users.values()].map((u) => u.id));
    for (const [userId, row] of db.userState) {
      if (!known.has(userId)) continue;
      await pg.query('insert into public.user_state (user_id, progress, study_plan) values ($1, $2, $3)', [
        userId,
        JSON.stringify(row?.progress ?? {}),
        row?.study_plan == null ? null : JSON.stringify(row.study_plan),
      ]);
    }
    for (const e of db.learningEvents) {
      if (!known.has(e.user_id)) continue;
      await pg.query(
        `insert into public.learning_events (user_id, event_id, event, occurred_at, activity_id, paper, mode)
         values ($1, $2, $3, $4, $5, $6, $7) on conflict do nothing`,
        [e.user_id, e.event_id, JSON.stringify(e.event ?? {}), e.occurred_at, e.activity_id, e.paper ?? null, e.mode],
      );
    }
  }

  /* One call at a time: each call replaces the copied rows, so two at once
     must not interleave. */
  let queue = Promise.resolve();

  /** True when this request was this route and has been answered. */
  async function handle(req, res, url) {
    if (url.pathname !== '/rest/v1/rpc/admin_student_work' || req.method !== 'POST') return false;
    const caller = userByToken(req);
    const opts = (req.headers.apikey ?? '') === 'local-service-role-key'
      ? { role: 'service_role' }
      : caller
        ? { role: 'authenticated', userId: caller }
        : { role: 'anon' };
    const args = (await readBody(req)) ?? {};
    const run = queue.then(async () => {
      const wdb = await database();
      await sync(wdb);
      const pUser = typeof args.p_user === 'string' && UUID_RE.test(args.p_user) ? args.p_user : null;
      return wdb.studentWork(pUser, opts);
    });
    queue = run.catch(() => {});
    try {
      send(res, 200, await run);
    } catch (err) {
      send(res, err.status ?? 400, { message: err.message, code: err.code });
    }
    return true;
  }

  return { handle };
}
