-- Support messages: how long a signed-out visitor's message is kept, and a
-- student's own copy of their messages (2 October 2026,
-- docs/legal/BUILD-PLAN-2026-10-02.md, Builder C).
--
-- LOCAL ONLY. NOT applied to production, and not to be applied without
-- Alex's explicit yes. Proven in PGlite by
-- tests/support-retention-sql.test.ts (through tools/stand-in/support.mjs).
-- Depends on 2026-09-30-support.sql. Idempotent. Touches no table's shape.
--
-- 1. RETENTION. A message sent through the support form while signed out
--    belongs to no account, so nothing else would ever remove it. It is
--    deleted 12 months after it arrived, answered or not. A signed-in
--    student's messages are not touched here: they are kept with the
--    account and deleted with it (user_id references auth.users on delete
--    cascade, 2026-09-30-support.sql).
--    support_visitor_retention() does the deleting. The support Worker
--    (workers/support) calls it once an hour on its schedule, right after
--    support_source_cleanup(), so a message does not outlive its year even
--    when nobody is writing. Signed-out messages only ever arrive through
--    that Worker, so wherever such a message exists, the Worker that runs
--    this cleanup exists too.
--
-- 2. A STUDENT'S OWN MESSAGES. Nobody but an admin can read the table
--    (row security on, no policy, every privilege revoked). The student's
--    right to a copy of their own data (Personal Data Law Art. 24) is met by
--    one function that returns the CALLER's own messages and nothing else,
--    used by "Download my data" (src/lib/legal/export.ts). It never returns
--    the source hash, which only signed-out messages carry anyway.

-- ── How long, in one place ─────────────────────────────────────────────────
--   visitorKeepMonths 12  A signed-out visitor's message, from when it
--                         arrived.
create or replace function public.support_retention()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('visitorKeepMonths', 12)
$$;

revoke execute on function public.support_retention() from public, anon, authenticated;
grant execute on function public.support_retention() to service_role;

-- Deletes every signed-out message older than visitorKeepMonths. Returns
-- {ok, deleted}. Service role only.
create or replace function public.support_visitor_retention()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_months  integer := (public.support_retention()->>'visitorKeepMonths')::int;
  v_deleted integer;
begin
  delete from public.support_requests
   where user_id is null
     and created_at < now() - make_interval(months => v_months);
  get diagnostics v_deleted = row_count;
  return jsonb_build_object('ok', true, 'deleted', v_deleted);
end;
$$;

revoke execute on function public.support_visitor_retention() from public, anon, authenticated;
grant execute on function public.support_visitor_retention() to service_role;

-- The signed-in caller's own messages, newest first, as a JSON array.
-- Refuses (42501) without a signed-in user.
create or replace function public.support_my_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'support-sign-in-required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (
      select r.id, r.created_at, r.topic, r.message, r.contact_email, r.context, r.page, r.locale, r.answered_at
      from public.support_requests r
      where r.user_id = v_user
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.support_my_requests() from public, anon;
grant execute on function public.support_my_requests() to authenticated;

-- ── Rollback (run by hand, only if this migration must be undone) ───────
-- Removes no message. Signed-out messages are then kept until deleted by
-- hand.
--
-- drop function if exists public.support_my_requests();
-- drop function if exists public.support_visitor_retention();
-- drop function if exists public.support_retention();
