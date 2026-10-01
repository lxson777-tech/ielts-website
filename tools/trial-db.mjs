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
 * Both migrations are applied, in order: the trial file and then the paid
 * access file (supabase/migrations/2026-09-30-paid-access.sql), because that
 * is what a real project would run. The trial tests therefore also prove the
 * trial still behaves the same with paid access installed.
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

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
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
export async function createTrialDb({ migration = null, migrations = [TRIAL_MIGRATION, PAID_MIGRATION, resolve(REPO, "supabase/migrations/2026-09-30-profitable-offer.sql")] } = {}) {
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

    async close() {
      await db.close();
    },
  };
}
