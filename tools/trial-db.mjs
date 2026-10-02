/* The trial migration, running for real in an in-memory Postgres.
 *
 * supabase/migrations/2026-09-23-trial.sql is the only place the trial's
 * clock and allowances are decided. Rather than copy those rules into
 * JavaScript for the tests and for the local stand-in (a second copy that
 * could quietly disagree with the first), this file boots PGlite, a real
 * Postgres compiled to WebAssembly, gives it the small part of Supabase the
 * migration relies on, runs the migration file itself and answers calls the
 * way PostgREST's `/rest/v1/rpc/<function>` does.
 *
 * What it models from Supabase, and nothing else:
 *   - the three roles `anon`, `authenticated` and `service_role`, with
 *     Supabase's default grants (every role may use every table, and row
 *     security decides what it sees; service_role bypasses row security);
 *   - `auth.users` and `auth.uid()`, which reads the signed-in user from the
 *     request's JWT claim exactly as Supabase's own definition does.
 *
 * Every migration the access model needs is applied, in the order a real
 * project runs them (ALL_MIGRATIONS): the trial, the admin and profile
 * files, paid access, the approved offer and, last, the free-account model
 * (supabase/migrations/2026-10-01-free-account.sql), which retires the
 * trial. Tests that prove how the trial behaved BEFORE it was retired pass
 * PRE_FREE_MIGRATIONS instead: that is the history of those files, kept
 * provable, not what a project runs today.
 *
 * Used by tests/trial-*.test.ts, tests/paid-*.test.ts and
 * tools/mr-ez-dev-server.mjs. Never by the site or a Worker.
 *
 * Local only. Nothing here can reach a real database.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TRIAL_MIGRATION = resolve(REPO, 'supabase/migrations/2026-09-23-trial.sql');
/** Paid access (docs/paid-access/CONTRACT.md). Runs after the trial file,
    whose trial_state and trial_can_open it redefines. */
export const PAID_MIGRATION = resolve(REPO, 'supabase/migrations/2026-09-30-paid-access.sql');
export const ADMIN_MIGRATION = resolve(REPO, 'supabase/migrations/2026-09-24-admin.sql');
export const PROFILES_MIGRATION = resolve(REPO, 'supabase/migrations/2026-09-24-profiles.sql');
export const OFFER_MIGRATION = resolve(REPO, 'supabase/migrations/2026-09-30-profitable-offer.sql');
/** The free-account model (docs/paid-access/FREE-ACCOUNT-MODEL.md): every
    lesson for a signed-in account, practice and guidance paid or
    complimentary, the trial retired. Runs after every other file. */
export const FREE_MIGRATION = resolve(REPO, 'supabase/migrations/2026-10-01-free-account.sql');
/** A student deleting their own account (2 October 2026). Runs after the
    free-account migration, whose access_grants shape it relies on. */
export const DELETION_MIGRATION = resolve(REPO, 'supabase/migrations/2026-10-02-account-deletion.sql');
/** What a project runs today, in order. */
export const ALL_MIGRATIONS = [TRIAL_MIGRATION, ADMIN_MIGRATION, PROFILES_MIGRATION, PAID_MIGRATION, OFFER_MIGRATION, FREE_MIGRATION, DELETION_MIGRATION];
/** The stack as it stood before the trial was retired (1 October 2026),
    for the tests that keep the trial's own history provable. */
export const PRE_FREE_MIGRATIONS = [TRIAL_MIGRATION, PAID_MIGRATION, OFFER_MIGRATION];

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
  -- The few objects of supabase/schema.sql the admin and profile migrations
  -- name (the profile trigger's clock, and the tables the admin list reads),
  -- reduced to the columns those files use. Stand-in only.
  create function public.touch_user_state_updated_at() returns trigger language plpgsql as $$
  begin
    new.updated_at := now();
    return new;
  end $$;
  create table public.user_state (
    user_id uuid primary key references auth.users (id) on delete cascade,
    progress jsonb not null default '{}'::jsonb,
    study_plan jsonb,
    updated_at timestamptz not null default now()
  );
  create table public.mr_ez_turns (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users (id) on delete cascade);
  create table public.live_examiner_sessions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users (id) on delete cascade);
`;

export class TrialDbError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function toDbError(err) {
  const code = err?.code ?? '';
  const message = err?.message ?? String(err);
  if (code === '42501') return new TrialDbError(message, code, 403);
  if (code === '28000') return new TrialDbError(message, code, 401);
  if (code === '42883') return new TrialDbError(message, code, 404);
  return new TrialDbError(message, code || 'XX000', 400);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_RE = /^[a-z_][a-z0-9_]{0,62}$/;

/** Boots a fresh database with the migrations applied (both, in order, by
    default; `migration` alone runs just that one file). Every call is a new,
    empty world, so tests cannot leak into one another. */
export async function createTrialDb({ migration = null, migrations = ALL_MIGRATIONS } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of migration ? [migration] : migrations) await db.exec(readFileSync(file, 'utf8'));

  /** Runs `work` as `role`, with `userId` as the signed-in user when given,
      inside one transaction, the way a PostgREST request runs. */
  async function as(role, userId, work) {
    if (!['anon', 'authenticated', 'service_role'].includes(role)) throw new Error(`unknown role ${role}`);
    if (userId && !UUID_RE.test(userId)) throw new Error('user id must be a uuid');
    try {
      return await db.transaction(async (tx) => {
        await tx.exec(`set local role ${role}`);
        await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
        return await work(tx);
      });
    } catch (err) {
      throw err instanceof TrialDbError ? err : toDbError(err);
    }
  }

  return {
    raw: db,

    /** A user in auth.users, as a sign-up creates one. */
    async addUser(id, email = null) {
      await db.query('insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing', [id, email]);
    },

    /** PostgREST's /rest/v1/rpc/<fn>: named arguments, one JSON result. */
    async rpc(fn, args = {}, { role = 'authenticated', userId = null } = {}) {
      if (!NAME_RE.test(fn)) throw new TrialDbError(`bad function name ${fn}`, 'PGRST202', 404);
      const names = Object.keys(args);
      for (const name of names) {
        if (!NAME_RE.test(name)) throw new TrialDbError(`bad argument name ${name}`, 'PGRST202', 400);
      }
      const values = names.map((name) => {
        const value = args[name];
        return value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
      });
      const call = `select public.${fn}(${names.map((name, i) => `${name} => $${i + 1}`).join(', ')}) as result`;
      return as(role, userId, async (tx) => (await tx.query(call, values)).rows[0]?.result ?? null);
    },

    /** A plain read through row security, as a browser's REST select is. */
    async select(sql, params = [], { role = 'authenticated', userId = null } = {}) {
      return as(role, userId, async (tx) => (await tx.query(sql, params)).rows);
    },

    /** Test and stand-in only: moves one student's trial back in time, as if
        it had been started `minutes` earlier. Only the trial's own clock
        moves; its usage rows keep their times. Never exposed to the site. */
    async rewind(userId, minutes) {
      await db.query(
        `update public.trial_accounts
           set started_at = started_at - make_interval(mins => $2::int),
               ends_at = ends_at - make_interval(mins => $2::int)
         where user_id = $1`,
        [userId, minutes],
      );
    },

    /** Test only: ages one student's reservations, to exercise the stale rule. */
    async ageUsage(userId, minutes) {
      await db.query(
        `update public.trial_usage
           set reserved_at = reserved_at - make_interval(mins => $2::int),
               lease_until = case when lease_until is null then null else lease_until - make_interval(mins => $2::int) end
         where user_id = $1`,
        [userId, minutes],
      );
    },

    /** Test and stand-in only: ends one student's paid access now, as if
        every grant had run out a minute ago. Grants stay (unrevoked), so the
        student is "paid before, now ended". Never exposed to the site. */
    async expirePaid(userId) {
      const result = await db.query(
        `update public.access_grants
           set starts_at = least(starts_at, now() - interval '2 minutes'),
               ends_at = now() - interval '1 minute'
         where user_id = $1 and revoked_at is null and ends_at > now() - interval '1 minute'`,
        [userId],
      );
      return result.affectedRows ?? 0;
    },

    /** Test only: moves one student's grants back in time by `minutes`. */
    async rewindPaid(userId, minutes) {
      await db.query(
        `update public.access_grants
           set starts_at = starts_at - make_interval(mins => $2::int),
               ends_at = ends_at - make_interval(mins => $2::int)
         where user_id = $1`,
        [userId, minutes],
      );
    },

    /** A completed student profile (supabase/migrations/2026-09-24-
        profiles.sql), as the profile form saves one: an adult in Almaty.
        The free account's lessons need it. */
    async addProfile(userId, firstName = 'Test') {
      await db.query(
        `insert into public.student_profiles
           (user_id, first_name, last_name, date_of_birth, phone, city, occupation, source)
         values ($1, $2, 'Student', date '2000-01-01', '+77001234567', 'Almaty', 'University', 'other')
         on conflict (user_id) do nothing`,
        [userId, firstName],
      );
    },

    /** Test and stand-in only: makes an account an admin (public.admins),
        as Alex's own row is made. */
    async makeAdmin(userId, note = 'stand-in admin') {
      await db.query('insert into public.admins (user_id, note) values ($1, $2) on conflict (user_id) do nothing', [userId, note]);
    },

    async close() {
      await db.close();
    },
  };
}
