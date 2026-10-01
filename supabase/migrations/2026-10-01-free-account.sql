-- The free account: every lesson for any signed-in student, practice and
-- guidance for paid or complimentary access, and the trial retired.
--
-- PROPOSAL, NOT APPLIED to any real Supabase project. Alex's decision of
-- 1 October 2026 (docs/paid-access/FREE-ACCOUNT-MODEL.md, second brain:
-- "Decisions/2026-10-01 IELTS free account opens all lessons, practice and
-- guidance are paid"). Tested only against a local in-memory Postgres
-- (PGlite) through tests/free-account-sql.test.ts and
-- tests/free-account-gates.test.ts, and clicked through on the local
-- stand-in (tools/mr-ez-dev-server.mjs --trial). Nobody but Alex applies it.
--
-- Runs AFTER every other migration: 2026-09-23-trial.sql,
-- 2026-09-24-admin.sql (public.is_admin), 2026-09-24-profiles.sql
-- (public.student_profiles), 2026-09-30-paid-access.sql and
-- 2026-09-30-profitable-offer.sql. It redefines trial_can_open, trial_start,
-- trial_test_begin, the trial's service functions, trial_status,
-- access_paid_state, assessment_reserve and assessment_balance.
-- Idempotent: running it twice changes nothing. It deletes no table, no
-- column and no row: the trial's tables and history all stay.
-- ALWAYS RUN IT LAST. Re-running an older file after it (for example
-- 2026-09-30-paid-access.sql on its own) puts back that file's versions of
-- the functions this one redefines, trial rules included; re-run this file
-- afterwards to restore the free-account rules.
--
-- WHAT IT ENFORCES (the server decides; the browser only displays)
--   signed-out      nothing (the content gate refuses before asking)
--   free            a signed-in account with a completed profile opens every
--                   `lesson:*` item: the lesson body in either language, its
--                   worked example and its own short quiz. Nothing else.
--   paid            a running paid grant opens every item, within the
--                   purchase's allowances (12 essays, 6 recorded Speaking,
--                   2 live interviews, 2 mock interviews, placement once per
--                   account), all counted per grant as before.
--   complimentary   a grant Alex gives in /admin: exactly what paid opens,
--                   with the same allowances, 30 days at a time.
--   paid-ended      back to free: every lesson still opens, results stay.
--   `test:*`, `practice:*` (other than a lesson's own quiz, which the gate
--   names as its lesson), `pack:*`, `writing-prompt:*` and `writing-model:*`
--   (the bank) open only for paid or complimentary access.
--
-- THE TRIAL IS RETIRED
--   trial_start refuses with code 'trial-retired'. Existing trial rows grant
--   nothing any more: no lesson, no test, no Mr EZ message and no AI
--   assessment. The trial tables and every row in them are kept.
--
-- COMPLIMENTARY ACCESS
--   A row of public.access_grants with kind 'complimentary', no order and no
--   plan, recording who gave it (granted_by) and an optional note. Given,
--   renewed and stopped only through the admin functions below, each
--   guarded by public.is_admin() (the caller's own verified sign-in): a
--   student cannot give themselves anything, and the table itself stays
--   unwritable from the browser.
--     give    30 days from now, or queued after a grant already running
--     renew   another 30 days, queued after the last one
--     stop    ends it now (a queued one never starts); later grants move
--             up so the student's paid time has no gap
--   Deleting an account: complimentary grants go with it. Only real payment
--   records (payment_orders, and a paid grant's order) still refuse it.

-- ── Grants learn their kind ─────────────────────────────────────────────
alter table public.access_grants add column if not exists kind text not null default 'paid';
alter table public.access_grants add column if not exists granted_by uuid;
alter table public.access_grants add column if not exists note text;
alter table public.access_grants add column if not exists stopped_at timestamptz;
alter table public.access_grants add column if not exists stopped_by uuid;
alter table public.access_grants alter column order_id drop not null;
alter table public.access_grants alter column plan_id drop not null;

-- A paid grant always has its order and plan; a complimentary one has
-- neither. Every existing row is paid, so the check holds for all of them.
alter table public.access_grants drop constraint if exists access_grants_kind_check;
alter table public.access_grants add constraint access_grants_kind_check check (
  (kind = 'paid' and order_id is not null and plan_id is not null)
  or (kind = 'complimentary' and order_id is null and plan_id is null));
alter table public.access_grants drop constraint if exists access_grants_note_check;
alter table public.access_grants add constraint access_grants_note_check
  check (note is null or char_length(note) <= 200);

-- Deleting a sign-in removes its grants. A paid grant cannot outlive its
-- order, and payment_orders still refuses the deletion (on delete restrict),
-- so an account with payment records stays undeletable exactly as before.
alter table public.access_grants drop constraint if exists access_grants_user_id_fkey;
alter table public.access_grants add constraint access_grants_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.access_grants drop constraint if exists access_grants_granted_by_fkey;
alter table public.access_grants add constraint access_grants_granted_by_fkey
  foreign key (granted_by) references auth.users (id) on delete set null;
alter table public.access_grants drop constraint if exists access_grants_stopped_by_fkey;
alter table public.access_grants add constraint access_grants_stopped_by_fkey
  foreign key (stopped_by) references auth.users (id) on delete set null;

-- The allowance ledger names a grant; when a grant goes with its account,
-- so do that account's uses (assessment_usage.user_id cascades already).
alter table public.assessment_usage drop constraint if exists assessment_usage_grant_id_fkey;
alter table public.assessment_usage add constraint assessment_usage_grant_id_fkey
  foreign key (grant_id) references public.access_grants (id) on delete cascade;

-- ── Helpers (owner only) ────────────────────────────────────────────────

-- Has the student completed the required profile (2026-09-24-profiles.sql)?
-- The table stores a profile whole, so one row is a completed profile.
create or replace function public.access_profile_complete(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user is not null and exists (select 1 from public.student_profiles where user_id = p_user)
$$;

-- The grant running right now, or none.
create or replace function public.access_running_grant(p_user uuid)
returns public.access_grants
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from public.access_grants
   where user_id = p_user and revoked_at is null and starts_at <= now() and ends_at > now()
   order by starts_at desc
   limit 1
$$;

-- The paid part of trial_state, now with the KIND of access: 'paid' or
-- 'complimentary' (src/lib/access/model.ts tierOf reads `paid.kind`). The
-- grant described is the one running now, or else the last one. startsAt
-- and endsAt still cover the whole unbroken run of grants, as before.
-- planId is the plan's id, or 'complimentary' for a complimentary grant.
create or replace function public.access_paid_state(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  last_grant public.access_grants;
  current_grant public.access_grants;
  first_start timestamptz;
begin
  select * into last_grant from public.access_grants
    where user_id = p_user and revoked_at is null
    order by ends_at desc
    limit 1;
  if not found then
    return null;
  end if;
  current_grant := public.access_running_grant(p_user);
  if current_grant.id is null then
    current_grant := last_grant;
  end if;
  select min(starts_at) into first_start from public.access_grants
    where user_id = p_user and revoked_at is null and ends_at > now();
  return jsonb_build_object(
    'planId', coalesce(current_grant.plan_id, 'complimentary'),
    'kind', current_grant.kind,
    'startsAt', coalesce(first_start, last_grant.starts_at),
    'endsAt', last_grant.ends_at);
end
$$;

-- The access tier the server sees, for the status reply and the admin
-- panel. Mirrors AccessTier in src/lib/access/model.ts (a signed-in caller
-- is never 'signed-out' here).
create or replace function public.access_tier(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  g public.access_grants := public.access_running_grant(p_user);
begin
  if g.id is not null then
    return g.kind;
  end if;
  if exists (select 1 from public.access_grants where user_id = p_user and revoked_at is null and starts_at <= now()) then
    return 'paid-ended';
  end if;
  return 'free';
end
$$;

-- Moves every grant that has not begun up against the one before it, in
-- order, keeping each one's length, so the account's paid time never has a
-- gap (after a stop). Grants are created back to back, so this only ever
-- moves a grant earlier.
create or replace function public.access_rechain(p_user uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  g public.access_grants;
  chain_end timestamptz;
  len interval;
begin
  select max(ends_at) into chain_end from public.access_grants
    where user_id = p_user and revoked_at is null and starts_at <= now() and ends_at > now();
  chain_end := greatest(now(), coalesce(chain_end, now()));
  for g in select * from public.access_grants
            where user_id = p_user and revoked_at is null and starts_at > now()
            order by starts_at
  loop
    len := g.ends_at - g.starts_at;
    if g.starts_at > chain_end then
      update public.access_grants set starts_at = chain_end, ends_at = chain_end + len where id = g.id;
      chain_end := chain_end + len;
    else
      chain_end := greatest(chain_end, g.ends_at);
    end if;
  end loop;
end
$$;

-- ── The open check (service role only) ──────────────────────────────────
-- workers/content-gate asks this before it hands anything out. p_item is
-- 'lesson:<key>', 'test:<id>', 'practice:<id>', 'pack:<name>',
-- 'writing-prompt:<id>' or 'writing-model:<id>'. The gate names a lesson's
-- own quiz and its worked example as 'lesson:<key>'.
--   ok        {ok: true, tier: 'free' | 'paid' | 'complimentary'}
--   reason    sign-in-required    no such account
--             profile-required    a lesson, but the profile is not done yet
--             paid-required       anything but a lesson, without paid or
--                                 complimentary access
--             not-included        not an item the gate knows
create or replace function public.access_can_open(p_user uuid, p_item text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_kind text := split_part(coalesce(p_item, ''), ':', 1);
  v_id text := substr(coalesce(p_item, ''), length(split_part(coalesce(p_item, ''), ':', 1)) + 2);
  g public.access_grants;
begin
  if v_kind not in ('lesson', 'test', 'practice', 'pack', 'writing-prompt', 'writing-model')
     or v_id !~ '^[a-z0-9][a-z0-9-]{0,99}$' then
    return jsonb_build_object('ok', false, 'reason', 'not-included');
  end if;
  if p_user is null or not exists (select 1 from auth.users where id = p_user) then
    return jsonb_build_object('ok', false, 'reason', 'sign-in-required');
  end if;
  -- Paid or complimentary first: a running grant opens everything.
  g := public.access_running_grant(p_user);
  if g.id is not null then
    return jsonb_build_object('ok', true, 'tier', g.kind, 'paid', true);
  end if;
  if v_kind = 'lesson' then
    if not public.access_profile_complete(p_user) then
      return jsonb_build_object('ok', false, 'reason', 'profile-required');
    end if;
    return jsonb_build_object('ok', true, 'tier', 'free');
  end if;
  return jsonb_build_object('ok', false, 'reason', 'paid-required');
end
$$;

-- The old name, which the content gate and earlier tools call. It now asks
-- exactly the question above; the trial's own rules no longer apply.
create or replace function public.trial_can_open(p_user uuid, p_item text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.access_can_open(p_user, p_item)
$$;

-- For the Workers: may this account use paid practice and guidance right
-- now? {paid: true, kind, endsAt} or {paid: false}. Complimentary access
-- counts exactly like paid access.
create or replace function public.access_paid_now(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  g public.access_grants := public.access_running_grant(p_user);
  v_until timestamptz := public.access_paid_until(p_user);
begin
  if g.id is null or v_until is null then
    return jsonb_build_object('paid', false);
  end if;
  return jsonb_build_object('paid', true, 'kind', g.kind, 'endsAt', v_until);
end
$$;

-- ── The trial, retired ──────────────────────────────────────────────────
-- Starting a trial is refused. The answer still carries the caller's status
-- so a screen that asked can show what the account does have.
create or replace function public.trial_start(p_questionnaire jsonb default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'sign in required' using errcode = '28000';
  end if;
  return jsonb_build_object('ok', false, 'code', 'trial-retired', 'reason', 'trial-retired',
    'status', public.trial_status_for(uid));
end
$$;

-- A trial test can no longer be begun (tests are paid practice now).
create or replace function public.trial_test_begin(p_section text, p_activity text, p_request text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'sign in required' using errcode = '28000';
  end if;
  return jsonb_build_object('ok', false, 'reason', 'trial-retired', 'status', public.trial_status_for(uid));
end
$$;

-- The Workers' trial functions answer the same way, so a Worker that still
-- asks them can never spend on a trial allowance.
create or replace function public.trial_tutor_reserve(
  p_user uuid, p_section text, p_request text, p_activity text)
returns jsonb
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('ok', false, 'reason', 'trial-retired')
$$;

create or replace function public.trial_test_lease(p_user uuid, p_section text, p_request text)
returns jsonb
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('ok', false, 'reason', 'trial-retired')
$$;

create or replace function public.trial_speaking_session_start(p_user uuid, p_request text)
returns jsonb
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('ok', false, 'reason', 'trial-retired')
$$;

-- ── The AI allowance: paid or complimentary only ────────────────────────
-- Identical to 2026-09-30-profitable-offer.sql except the branch for an
-- account with no running grant: it no longer gives a trial assessment, it
-- answers paid-required for every kind. Feedback on a live interview begun
-- while access was valid still finishes within 24 hours, as before.
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
    -- No running paid or complimentary access: no AI assessment of any kind
    -- (the trial's one assessment is retired, 1 October 2026).
    return jsonb_build_object('ok',false,'reason','paid-required');
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

-- The student's own counts. As before, plus `kind` of the running grant;
-- trialLimit is always 0 now (no trial assessment), trialUsed stays as a
-- record of what an old trial used.
create or replace function public.assessment_balance()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare g public.access_grants; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in required' using errcode='28000'; end if;
  g := public.access_running_grant(uid);
  return jsonb_build_object(
    'trialUsed',(select count(*) from public.assessment_usage u where u.user_id=uid and u.grant_id is null and public.assessment_counts(u)),
    'trialLimit',0,
    'kind',g.kind,
    'endsAt',g.ends_at,
    'writingUsed',(select count(*) from public.assessment_usage u where u.user_id=uid and u.grant_id=g.id and u.kind='writing' and public.assessment_counts(u)),
    'speakingUsed',(select count(*) from public.assessment_usage u where u.user_id=uid and u.grant_id=g.id and u.kind='speaking' and public.assessment_counts(u)),
    'liveUsed',(select count(*) from public.assessment_usage u where u.user_id=uid and u.grant_id=g.id and u.kind='live' and u.purpose='practice' and public.assessment_counts(u)),
    'mockUsed',(select count(*) from public.assessment_usage u where u.user_id=uid and u.grant_id=g.id and u.kind='live' and u.purpose='mock' and public.assessment_counts(u)),
    'placementUsed',exists(select 1 from public.assessment_usage u where u.user_id=uid and u.kind='live' and u.purpose='placement' and public.assessment_counts(u)),
    'pending',(select count(*) from public.assessment_usage u where u.user_id=uid and u.status='reserved' and public.assessment_counts(u)),
    'limits',case when g.id is null then null else jsonb_build_object('writing',12,'speaking',6,'live',2,'mock',2,'placement',1) end);
end $$;

-- What one account may do, as the site reads it:
--   access    {tier: 'free' | 'paid' | 'complimentary' | 'paid-ended',
--              profileComplete: boolean}
--   trialRetired  true: no screen should offer a trial
-- on top of everything trial_state already reports (paid now carries kind).
create or replace function public.trial_status_for(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  return public.trial_state(p_user) || jsonb_build_object(
    'trialRetired', true,
    'access', jsonb_build_object(
      'tier', public.access_tier(p_user),
      'profileComplete', public.access_profile_complete(p_user)));
end $$;

create or replace function public.trial_status()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'sign in required' using errcode='28000'; end if;
  return public.trial_status_for(auth.uid()) || jsonb_build_object('assessments',public.assessment_balance());
end $$;

-- ── Complimentary access (admin only) ───────────────────────────────────
-- Every function here refuses (SQLSTATE 42501) unless the CALLER is an
-- admin (public.is_admin(), 2026-09-24-admin.sql, which reads the caller's
-- own verified sign-in). The admin's id is recorded from that sign-in.

-- One account's grants, newest first, each with the allowances used in it,
-- plus the account's tier and whether the placement interview is used.
--   {tier, profileComplete, placementUsed, grants: [{id, kind, planId,
--    orderId, startsAt, endsAt, revokedAt, stoppedAt, grantedBy,
--    grantedByEmail, note, running, used: {writing, speaking, live, mock},
--    limits}]}
create or replace function public.access_admin_grants(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'userId', p_user,
    'tier', public.access_tier(p_user),
    'profileComplete', public.access_profile_complete(p_user),
    'placementUsed', exists(select 1 from public.assessment_usage u where u.user_id=p_user and u.kind='live' and u.purpose='placement' and public.assessment_counts(u)),
    'grants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'kind', g.kind, 'planId', g.plan_id, 'orderId', g.order_id,
        'startsAt', g.starts_at, 'endsAt', g.ends_at, 'revokedAt', g.revoked_at,
        'stoppedAt', g.stopped_at, 'grantedBy', g.granted_by,
        'grantedByEmail', (select a.email from auth.users a where a.id = g.granted_by),
        'note', g.note,
        'running', g.revoked_at is null and g.starts_at <= now() and g.ends_at > now(),
        'used', jsonb_build_object(
          'writing', (select count(*) from public.assessment_usage u where u.grant_id=g.id and u.kind='writing' and public.assessment_counts(u)),
          'speaking', (select count(*) from public.assessment_usage u where u.grant_id=g.id and u.kind='speaking' and public.assessment_counts(u)),
          'live', (select count(*) from public.assessment_usage u where u.grant_id=g.id and u.kind='live' and u.purpose='practice' and public.assessment_counts(u)),
          'mock', (select count(*) from public.assessment_usage u where u.grant_id=g.id and u.kind='live' and u.purpose='mock' and public.assessment_counts(u))),
        'limits', jsonb_build_object('writing',12,'speaking',6,'live',2,'mock',2))
        order by g.starts_at desc)
      from public.access_grants g where g.user_id = p_user), '[]'::jsonb));
end $$;

-- Every account's access at a glance, for the admin list:
--   [{userId, tier, kind, endsAt}] (kind and endsAt of the running grant, or
--   of the last one)
create or replace function public.access_admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'userId', u.id,
      'tier', public.access_tier(u.id),
      'kind', (public.access_paid_state(u.id)) ->> 'kind',
      'endsAt', (public.access_paid_state(u.id)) ->> 'endsAt'))
    from auth.users u), '[]'::jsonb);
end $$;

-- The one writer of complimentary grants. p_action:
--   give    refused (already-given) while a complimentary grant is running
--           or queued; otherwise 30 days, from now or after the grant
--           already running
--   renew   refused (not-given) if the account never had one; otherwise
--           another 30 days after the last grant. At most three
--           complimentary grants waiting or running at once (too-far-ahead),
--           so a double click cannot quietly give a year.
--   stop    ends the running complimentary grant now and cancels any queued
--           one (nothing-to-stop if there is none); later paid grants move
--           up with no gap.
-- Answers {ok: true, action, grant?, stopped?, status: <access_admin_grants>}
-- or {ok: false, reason: no-account | already-given | not-given |
-- too-far-ahead | nothing-to-stop | invalid-action}.
create or replace function public.access_admin_complimentary(p_user uuid, p_action text, p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_note text := left(nullif(btrim(coalesce(p_note, '')), ''), 200);
  chain_end timestamptz;
  g_start timestamptz;
  g public.access_grants;
  n int;
  queued int;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_action is null or p_action not in ('give', 'renew', 'stop') then
    return jsonb_build_object('ok', false, 'reason', 'invalid-action');
  end if;
  if p_user is null or not exists (select 1 from auth.users where id = p_user) then
    return jsonb_build_object('ok', false, 'reason', 'no-account');
  end if;
  -- The same per-account lock as payments and allowances.
  perform pg_advisory_xact_lock(hashtext('access:' || p_user::text));

  if p_action = 'stop' then
    -- The running one ends now (its uses stay recorded against it) ...
    update public.access_grants
       set ends_at = now(), stopped_at = now(), stopped_by = auth.uid()
     where user_id = p_user and kind = 'complimentary' and revoked_at is null
       and starts_at < now() and ends_at > now();
    get diagnostics n = row_count;
    -- ... and one that has not begun never will.
    update public.access_grants
       set revoked_at = now(), stopped_at = now(), stopped_by = auth.uid()
     where user_id = p_user and kind = 'complimentary' and revoked_at is null
       and starts_at >= now() and ends_at > now();
    get diagnostics queued = row_count;
    if n + queued = 0 then
      return jsonb_build_object('ok', false, 'reason', 'nothing-to-stop');
    end if;
    perform public.access_rechain(p_user);
    return jsonb_build_object('ok', true, 'action', 'stop', 'stopped', n + queued,
      'status', public.access_admin_grants(p_user));
  end if;

  if p_action = 'give' and exists (
    select 1 from public.access_grants where user_id = p_user and kind = 'complimentary'
      and revoked_at is null and ends_at > now()) then
    return jsonb_build_object('ok', false, 'reason', 'already-given');
  end if;
  if p_action = 'renew' then
    if not exists (select 1 from public.access_grants where user_id = p_user and kind = 'complimentary') then
      return jsonb_build_object('ok', false, 'reason', 'not-given');
    end if;
    if (select count(*) from public.access_grants where user_id = p_user and kind = 'complimentary'
          and revoked_at is null and ends_at > now()) >= 3 then
      return jsonb_build_object('ok', false, 'reason', 'too-far-ahead');
    end if;
  end if;

  select max(ends_at) into chain_end from public.access_grants
    where user_id = p_user and revoked_at is null and ends_at > now();
  g_start := greatest(now(), coalesce(chain_end, now()));
  insert into public.access_grants (user_id, kind, order_id, plan_id, starts_at, ends_at, granted_by, note)
    values (p_user, 'complimentary', null, null, g_start, g_start + interval '30 days', auth.uid(), v_note)
    returning * into g;
  return jsonb_build_object('ok', true, 'action', p_action,
    'grant', jsonb_build_object('id', g.id, 'kind', g.kind, 'startsAt', g.starts_at, 'endsAt', g.ends_at),
    'status', public.access_admin_grants(p_user));
end $$;

-- ── Who may call what ───────────────────────────────────────────────────
-- Supabase grants EXECUTE on new public functions to anon and authenticated
-- by default, so every grant here is preceded by an explicit revoke.
revoke all on function public.access_profile_complete(uuid) from public, anon, authenticated;
revoke all on function public.access_running_grant(uuid) from public, anon, authenticated;
revoke all on function public.access_paid_state(uuid) from public, anon, authenticated;
revoke all on function public.access_tier(uuid) from public, anon, authenticated;
revoke all on function public.access_rechain(uuid) from public, anon, authenticated;
revoke all on function public.trial_status_for(uuid) from public, anon, authenticated;

revoke all on function public.access_can_open(uuid, text) from public, anon, authenticated;
revoke all on function public.trial_can_open(uuid, text) from public, anon, authenticated;
revoke all on function public.access_paid_now(uuid) from public, anon, authenticated;
revoke all on function public.trial_tutor_reserve(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.trial_test_lease(uuid, text, text) from public, anon, authenticated;
revoke all on function public.trial_speaking_session_start(uuid, text) from public, anon, authenticated;
revoke all on function public.assessment_reserve(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.access_can_open(uuid, text) to service_role;
grant execute on function public.trial_can_open(uuid, text) to service_role;
grant execute on function public.access_paid_now(uuid) to service_role;
grant execute on function public.trial_tutor_reserve(uuid, text, text, text) to service_role;
grant execute on function public.trial_test_lease(uuid, text, text) to service_role;
grant execute on function public.trial_speaking_session_start(uuid, text) to service_role;
grant execute on function public.assessment_reserve(uuid, text, text, text, text) to service_role;

revoke all on function public.trial_start(jsonb) from public, anon;
revoke all on function public.trial_test_begin(text, text, text) from public, anon;
revoke all on function public.trial_status() from public, anon;
revoke all on function public.assessment_balance() from public, anon;
grant execute on function public.trial_start(jsonb) to authenticated;
grant execute on function public.trial_test_begin(text, text, text) to authenticated;
grant execute on function public.trial_status() to authenticated;
grant execute on function public.assessment_balance() to authenticated;

-- The admin functions check is_admin() themselves; signed-out callers are
-- refused by the grant before they get that far.
revoke all on function public.access_admin_grants(uuid) from public, anon;
revoke all on function public.access_admin_overview() from public, anon;
revoke all on function public.access_admin_complimentary(uuid, text, text) from public, anon;
grant execute on function public.access_admin_grants(uuid) to authenticated;
grant execute on function public.access_admin_overview() to authenticated;
grant execute on function public.access_admin_complimentary(uuid, text, text) to authenticated;

-- ── Rollback (run by hand, never by a script) ───────────────────────────
-- Complimentary grants are access records: export them first
--   (select * from public.access_grants where kind = 'complimentary').
-- 1. Remove the complimentary rows, which the old order/plan constraints
--    cannot hold:   delete from public.access_grants where kind = 'complimentary';
-- 2. Restore the old shape of access_grants:
-- alter table public.access_grants drop constraint if exists access_grants_kind_check;
-- alter table public.access_grants drop constraint if exists access_grants_note_check;
-- alter table public.access_grants alter column order_id set not null;
-- alter table public.access_grants alter column plan_id set not null;
-- alter table public.access_grants drop constraint if exists access_grants_user_id_fkey;
-- alter table public.access_grants add constraint access_grants_user_id_fkey
--   foreign key (user_id) references auth.users (id) on delete restrict;
-- alter table public.access_grants drop constraint if exists access_grants_granted_by_fkey;
-- alter table public.access_grants drop constraint if exists access_grants_stopped_by_fkey;
-- alter table public.access_grants drop column if exists stopped_by;
-- alter table public.access_grants drop column if exists stopped_at;
-- alter table public.access_grants drop column if exists note;
-- alter table public.access_grants drop column if exists granted_by;
-- alter table public.access_grants drop column if exists kind;
-- alter table public.assessment_usage drop constraint if exists assessment_usage_grant_id_fkey;
-- alter table public.assessment_usage add constraint assessment_usage_grant_id_fkey
--   foreign key (grant_id) references public.access_grants (id);
-- 3. Drop this file's own functions:
-- drop function if exists public.access_admin_complimentary(uuid, text, text);
-- drop function if exists public.access_admin_overview();
-- drop function if exists public.access_admin_grants(uuid);
-- drop function if exists public.trial_status_for(uuid);
-- drop function if exists public.access_rechain(uuid);
-- drop function if exists public.access_tier(uuid);
-- drop function if exists public.access_can_open(uuid, text);
-- drop function if exists public.access_running_grant(uuid);
-- drop function if exists public.access_profile_complete(uuid);
-- 4. Re-run, in order, 2026-09-23-trial.sql, 2026-09-30-paid-access.sql and
--    2026-09-30-profitable-offer.sql: they restore their own trial_start,
--    trial_test_begin, trial service functions, trial_can_open,
--    access_paid_state, access_paid_now, assessment_reserve,
--    assessment_balance and trial_status. Re-running them keeps every
--    record and the approved prices.
