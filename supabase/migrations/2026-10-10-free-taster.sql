-- Free AI tries: a free account may try the AI a little, once, for its whole
-- life, before it buys anything.
--
-- PROPOSAL, NOT APPLIED to any real Supabase project, and it must not be
-- applied without Alex's yes (his decision of 10 October 2026, recorded in
-- docs/paid-access/FREE-ACCOUNT-MODEL.md, "Free AI tries"). Tested only
-- against a local in-memory Postgres (PGlite) through tests/free-taster.test.ts
-- and clicked through on the local stand-in (tools/mr-ez-dev-server.mjs --trial).
--
-- Runs AFTER 2026-10-01-free-account.sql (and every file before it), because
-- it redefines two of that file's functions, assessment_reserve and
-- trial_status_for. Idempotent: running it twice changes nothing. It deletes
-- no table, no column and no row. ALWAYS RUN IT AFTER free-account.sql:
-- re-running the older file afterwards puts back its "no AI of any kind"
-- rule, so re-run this file after it.
--
-- WHAT IT ENFORCES (the database decides; the Workers and the screens obey)
--   A free account (signed in, no running paid or complimentary grant, which
--   includes an account whose paid access has ENDED) may use, in total and
--   once per account, ever:
--     tutor     10 Mr EZ requests (his chat and the lesson help buttons)
--     writing    1 AI essay check
--     speaking   1 AI recorded Speaking check
--   The numbers live in ONE place, taster_limit() below, and must equal
--   TASTER_LIMITS in src/lib/access/taster.ts (a test holds them together).
--   Setting one to 0 switches that try off.
--   Never a free try: a live interview, a mock exam, the placement test, or
--   feedback on a live interview. Those keep answering paid-required.
--   Signed-out visitors get nothing (the Workers refuse before asking).
--
-- HOW EACH TRY IS COUNTED
--   writing, speaking  the existing ledger public.assessment_usage. A try is
--                      a row with grant_id NULL (no running grant), counted
--                      exactly like a paid use (settled, or reserved and
--                      fresh, never released; a failed grading is released
--                      and costs nothing). It is LIFETIME: it counts every
--                      grant-less practice row of that kind the account ever
--                      made, including the one assessment an old three-day
--                      trial allowed (the retired trial recorded it with no
--                      grant). An account that already used its trial
--                      assessment has therefore already had its one try.
--                      Simple and fair.
--   tutor              a new table, public.tutor_taster_uses, one row per
--                      request id. A row is 'reserved' (counted) or
--                      'released' (a failed answer, given back). A Worker
--                      that dies mid-answer leaves the row reserved, so a
--                      crash costs the student one try rather than risk a
--                      free answer: the safe direction for money.
--
-- PAID ACCOUNTS ARE UNCHANGED. assessment_reserve still counts a paid grant's
-- uses against that grant (12 / 6 / 2 / mock 2 / placement 1) and never writes
-- a grant-less row for them. tutor_taster_reserve answers without recording
-- anything when paid access is running. The daily caps are untouched. A paid
-- grant's uses (grant_id set) never count against the lifetime tries, and the
-- lifetime tries never count against a grant.
--
-- WHAT THE REFUSALS LOOK LIKE (service role only; the Workers turn them into
-- HTTP 402 { error, code: 'taster-used', reason: 'taster-used', ... })
--   assessment_reserve      {ok:false, reason:'taster-used', kind, purpose, used, limit}
--   tutor_taster_reserve    {ok:false, reason:'taster-used', kind:'tutor', used, limit}

-- ── The limits, in one place ────────────────────────────────────────────
create or replace function public.taster_limit(p_kind text)
returns int
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_kind when 'tutor' then 10 when 'writing' then 1 when 'speaking' then 1 else 0 end
$$;

-- ── Mr EZ tries ─────────────────────────────────────────────────────────
create table if not exists public.tutor_taster_uses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check (length(request_id) between 8 and 128),
  status text not null default 'reserved' check (status in ('reserved','released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_id)
);
create index if not exists tutor_taster_uses_by_user on public.tutor_taster_uses (user_id);

alter table public.tutor_taster_uses enable row level security;
revoke all on public.tutor_taster_uses from public, anon, authenticated;
grant select on public.tutor_taster_uses to authenticated;
drop policy if exists "tutor taster own" on public.tutor_taster_uses;
create policy "tutor taster own" on public.tutor_taster_uses for select to authenticated using (auth.uid() = user_id);

-- Reserve one Mr EZ try BEFORE the model is called. The Worker calls this
-- only for an account without paid access; if paid access is running anyway
-- it records nothing and says so (paid: true).
--   ok      {fresh, used, limit, kind:'tutor'}
--             fresh false: this request id was already reserved (a retry or
--             a replay), so nothing more is charged and the caller must not
--             release it; paid: true when no try was needed
--   reason  sign-in-required | invalid-request | taster-used
create or replace function public.tutor_taster_reserve(p_user uuid, p_request text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit int := public.taster_limit('tutor');
  n int;
  previous public.tutor_taster_uses;
begin
  perform pg_advisory_xact_lock(hashtext('access:' || p_user::text));
  if p_user is null or not exists (select 1 from auth.users where id = p_user) then
    return jsonb_build_object('ok', false, 'reason', 'sign-in-required');
  end if;
  if p_request is null or length(p_request) not between 8 and 128 then
    return jsonb_build_object('ok', false, 'reason', 'invalid-request');
  end if;
  if (public.access_running_grant(p_user)).id is not null then
    return jsonb_build_object('ok', true, 'paid', true, 'fresh', false, 'kind', 'tutor', 'used', 0, 'limit', v_limit);
  end if;

  select count(*) into n from public.tutor_taster_uses where user_id = p_user and status = 'reserved';
  select * into previous from public.tutor_taster_uses where user_id = p_user and request_id = p_request;
  if found and previous.status = 'reserved' then
    return jsonb_build_object('ok', true, 'fresh', false, 'kind', 'tutor', 'used', n, 'limit', v_limit);
  end if;
  if n >= v_limit then
    return jsonb_build_object('ok', false, 'reason', 'taster-used', 'kind', 'tutor', 'used', n, 'limit', v_limit);
  end if;
  if found then
    update public.tutor_taster_uses set status = 'reserved', updated_at = now() where id = previous.id;
  else
    insert into public.tutor_taster_uses (user_id, request_id) values (p_user, p_request);
  end if;
  return jsonb_build_object('ok', true, 'fresh', true, 'kind', 'tutor', 'used', n + 1, 'limit', v_limit);
end
$$;

-- Give one try back (the model call failed, so no answer was delivered).
-- Only a reserved row is released; releasing twice or an unknown id is a
-- harmless {ok:false}.
create or replace function public.tutor_taster_release(p_user uuid, p_request text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtext('access:' || p_user::text));
  update public.tutor_taster_uses
     set status = 'released', updated_at = now()
   where user_id = p_user and request_id = p_request and status = 'reserved';
  return jsonb_build_object('ok', found);
end
$$;

-- ── Counts, as the status reply shows them ──────────────────────────────
create or replace function public.taster_status(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'tutor', jsonb_build_object(
      'used', (select count(*) from public.tutor_taster_uses t where t.user_id = p_user and t.status = 'reserved'),
      'limit', public.taster_limit('tutor')),
    'writing', jsonb_build_object(
      'used', (select count(*) from public.assessment_usage u
                where u.user_id = p_user and u.grant_id is null and u.kind = 'writing' and u.purpose = 'practice' and public.assessment_counts(u)),
      'limit', public.taster_limit('writing')),
    'speaking', jsonb_build_object(
      'used', (select count(*) from public.assessment_usage u
                where u.user_id = p_user and u.grant_id is null and u.kind = 'speaking' and u.purpose = 'practice' and public.assessment_counts(u)),
      'limit', public.taster_limit('speaking')))
$$;

-- What one account may do, as the site reads it: everything free-account.sql
-- reports, plus `taster` {tutor, writing, speaking} each {used, limit}, for
-- every signed-in account (the screens decide whether to offer it).
create or replace function public.trial_status_for(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  return public.trial_state(p_user) || jsonb_build_object(
    'trialRetired', true,
    'access', jsonb_build_object(
      'tier', public.access_tier(p_user),
      'profileComplete', public.access_profile_complete(p_user)),
    'taster', public.taster_status(p_user));
end $$;

-- ── The AI allowance: paid, complimentary, or a free account's one try ──
-- Identical to 2026-10-01-free-account.sql except the branch for an account
-- with NO running grant: writing and speaking practice are allowed while the
-- account's lifetime grant-less count of that kind is below taster_limit();
-- every other kind or purpose still answers paid-required. The daily caps,
-- the stale-release rule, idempotency and every paid branch are unchanged.
create or replace function public.assessment_reserve(
  p_user uuid, p_kind text, p_request text, p_session text default null, p_purpose text default 'practice')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  g public.access_grants;
  n int;
  charged int;
  attempts int;
  allowance int;
  used_up text := 'allowance-used';
  previous public.assessment_usage;
  v_purpose text := coalesce(p_purpose, 'practice');
begin
  perform pg_advisory_xact_lock(hashtext('access:' || p_user::text));
  if not exists (select 1 from auth.users where id = p_user) then
    return jsonb_build_object('ok',false,'reason','sign-in-required');
  end if;
  if p_kind is null or p_kind not in ('writing','speaking','live','feedback')
     or p_request is null or length(p_request) not between 8 and 128
     or v_purpose not in ('practice','placement','mock')
     or (v_purpose <> 'practice' and p_kind <> 'live') then
    return jsonb_build_object('ok',false,'reason','invalid-request');
  end if;

  update public.assessment_usage u
     set status = 'released', release_reason = 'stale', updated_at = now()
   where u.user_id = p_user and u.status = 'reserved' and not public.assessment_counts(u);

  select * into previous from public.assessment_usage where user_id=p_user and kind=p_kind and request_id=p_request;
  if found and previous.status <> 'released' then
    return jsonb_build_object('ok',false,'reason','already-requested');
  end if;

  select count(*) filter (where u.status <> 'released' or public.assessment_charged(u)), count(*)
    into charged, attempts
    from public.assessment_usage u where u.user_id=p_user and u.created_at > now()-interval '1 day';
  if charged >= 24 or attempts >= 60 then return jsonb_build_object('ok',false,'reason','daily-limit'); end if;

  select * into g from public.access_grants where user_id=p_user and revoked_at is null
    and starts_at <= now() and ends_at > now() order by starts_at desc limit 1;

  if p_kind='feedback' then
    select grants.* into g from public.access_grants grants join public.assessment_usage u on u.grant_id=grants.id
      where u.user_id=p_user and u.kind='live' and u.provider_session_id=p_session and u.status='settled'
      and u.created_at>now()-interval '1 day' and grants.revoked_at is null limit 1;
    if g.id is null then return jsonb_build_object('ok',false,'reason','unknown-session'); end if;
    if exists(select 1 from public.assessment_usage where user_id=p_user and kind='feedback' and provider_session_id=p_session and status <> 'released') then
      return jsonb_build_object('ok',false,'reason','already-requested');
    end if;
    allowance := 1; n := 0;
  elsif g.id is null then
    -- No running paid or complimentary access: the free account's lifetime
    -- tries, for a writing or speaking practice assessment only. Anything
    -- else (live, mock, placement) is paid.
    if p_kind in ('writing','speaking') and v_purpose = 'practice' and public.taster_limit(p_kind) > 0 then
      allowance := public.taster_limit(p_kind); used_up := 'taster-used';
      select count(*) into n from public.assessment_usage u
        where u.user_id=p_user and u.grant_id is null and u.kind=p_kind and u.purpose='practice' and public.assessment_counts(u);
    else
      return jsonb_build_object('ok',false,'reason','paid-required');
    end if;
  elsif v_purpose = 'placement' then
    allowance := 1; used_up := 'placement-used';
    select count(*) into n from public.assessment_usage u
      where u.user_id=p_user and u.kind='live' and u.purpose='placement' and public.assessment_counts(u);
  elsif v_purpose = 'mock' then
    allowance := 2; used_up := 'mock-allowance-used';
    select count(*) into n from public.assessment_usage u
      where u.user_id=p_user and u.grant_id=g.id and u.kind='live' and u.purpose='mock' and public.assessment_counts(u);
  else
    allowance := case p_kind when 'writing' then 12 when 'speaking' then 6 when 'live' then 2 end;
    select count(*) into n from public.assessment_usage u
      where u.user_id=p_user and u.grant_id=g.id and u.kind=p_kind and u.purpose='practice' and public.assessment_counts(u);
  end if;
  if n >= allowance then
    return jsonb_build_object('ok',false,'reason',used_up,'kind',p_kind,'purpose',v_purpose,'used',n,'limit',allowance);
  end if;
  if previous.id is not null then return jsonb_build_object('ok',false,'reason','already-requested'); end if;
  insert into public.assessment_usage(user_id,grant_id,kind,request_id,provider_session_id,purpose)
    values(p_user,g.id,p_kind,p_request,p_session,v_purpose);
  return jsonb_build_object('ok',true,'used',n+1,'limit',allowance,'kind',p_kind,'purpose',v_purpose);
end $$;

-- ── Grants: exactly like the functions they sit beside ──────────────────
revoke all on function public.taster_limit(text) from public, anon, authenticated;
revoke all on function public.taster_status(uuid) from public, anon, authenticated;
revoke all on function public.tutor_taster_reserve(uuid, text) from public, anon, authenticated;
revoke all on function public.tutor_taster_release(uuid, text) from public, anon, authenticated;
revoke all on function public.trial_status_for(uuid) from public, anon, authenticated;
revoke all on function public.assessment_reserve(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.tutor_taster_reserve(uuid, text) to service_role;
grant execute on function public.tutor_taster_release(uuid, text) to service_role;
grant execute on function public.assessment_reserve(uuid, text, text, text, text) to service_role;
