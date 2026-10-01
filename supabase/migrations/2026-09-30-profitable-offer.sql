-- The approved paid offer: price, and the assessment allowances it buys.
--
-- PROPOSAL, NOT APPLIED to any real Supabase project. Approved by Alex on
-- 30 September 2026 (docs/paid-access/PROFITABLE-OFFER.md), revised after the
-- review of 1 October 2026 (docs/paid-access/OFFER-REVIEW-2026-10-01.md).
-- Tested only against a local in-memory Postgres (PGlite) through
-- tests/profitable-offer.test.ts, tests/paid-sql.test.ts,
-- tests/trial-graders.test.ts and tests/paid-gates.test.ts.
--
-- Runs AFTER 2026-09-23-trial.sql and 2026-09-30-paid-access.sql. The two
-- admin-only functions at the end also need 2026-09-24-admin.sql
-- (public.is_admin); without it they refuse every caller. Idempotent:
-- running it twice changes nothing and keeps every record.
--
-- WHAT ONE 30-DAY PURCHASE INCLUDES (enforced here, nowhere else)
--   12 essay assessments, 6 recorded Speaking assessments, 2 live interviews
--   with feedback. Separately, and NOT taken from the 2 live interviews
--   (Alex, 1 October 2026):
--     - the placement test's live interview: ONCE PER ACCOUNT, ever;
--     - the full mock exam's live interview: 2 PER PURCHASE.
--   A trial has one Writing OR recorded Speaking assessment and no live
--   interview of any kind.
--
-- HOW "PLACEMENT" AND "MOCK" ARE KEPT HONEST
--   Every live interview is a row here with a purpose: practice, placement
--   or mock. The purpose only chooses which allowance is used. Each one is
--   capped by this file, so no label can buy more than 2 practice + 2 mock
--   interviews per purchase and 1 placement interview per account. The live
--   examiner Worker also refuses a purpose that does not match the session
--   the server itself builds: a mock must be the full three-part test, a
--   placement a single-topic Part 1 interview (workers/live-examiner).
--   Essays written inside a mock exam or the placement test are ordinary
--   essay assessments and count against the 12 (or the trial's one): that
--   is the simpler rule, and a mock still fits (2 essays of 12).
--
-- WHEN A USE IS GIVEN BACK (status 'released', with release_reason)
--   failed      the Worker reported that grading failed
--   stale       a reservation still open after 15 minutes with no successful
--               answer from the AI provider (the phone slept, the tab closed,
--               the Worker stopped). Released the next time the account asks
--               for anything, and never counted in the meantime.
--   given-back  a live interview the examiner never began (the connection
--               dropped first), ended within 90 seconds of opening
--   admin       Alex gave it back by hand, with a note
--   A Worker that reports SUCCESS after a stale release still settles the
--   use: the student did get the grade.
--
-- WHO CAN DO WHAT
--   Workers (service role): reserve, finish, meter, give back a live
--   interview. Browser (authenticated): read its own balance and rows. Admin
--   (authenticated + is_admin): list one account's uses, give one back.
--   anon: nothing.
--
-- COMPLIMENTARY ACCESS (a later phase): every allowance here is counted per
-- row of public.access_grants. A complimentary 30-day grant written into that
-- table gets exactly the paid allowances with no change to this file.

-- ── Price (approved 30 September 2026) ──────────────────────────────────
-- Also seeded by 2026-09-30-paid-access.sql, so re-running either file keeps
-- it. Historical orders keep the amount they were made at.
update public.access_plans set amount = 12990, enabled = true where id = 'month-1';
update public.access_plans set enabled = false where id = 'month-3';

-- ── The ledger ──────────────────────────────────────────────────────────
-- Reservations count immediately, across all Worker instances.
create table if not exists public.assessment_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_id uuid references public.access_grants(id),
  kind text not null check (kind in ('writing','speaking','live','feedback')),
  request_id text not null check (length(request_id) between 8 and 128),
  status text not null default 'reserved' check (status in ('reserved','settled','released')),
  provider_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,kind,request_id)
);
-- Added 1 October 2026 (review P1-4, P1-5, P1-6).
alter table public.assessment_usage add column if not exists purpose text not null default 'practice';
alter table public.assessment_usage add column if not exists release_reason text;
alter table public.assessment_usage add column if not exists released_by uuid;
alter table public.assessment_usage add column if not exists release_note text;
alter table public.assessment_usage drop constraint if exists assessment_usage_purpose_check;
alter table public.assessment_usage add constraint assessment_usage_purpose_check
  check (purpose in ('practice','placement','mock') and (purpose = 'practice' or kind = 'live'));
alter table public.assessment_usage drop constraint if exists assessment_usage_release_check;
alter table public.assessment_usage add constraint assessment_usage_release_check
  check ((release_reason is null or release_reason in ('failed','stale','given-back','admin'))
     and (release_note is null or length(release_note) <= 200));
-- Review P2-3: deleting a sign-in removes its uses. An account with payment
-- records is still refused, by payment_orders and access_grants.
alter table public.assessment_usage drop constraint if exists assessment_usage_user_id_fkey;
alter table public.assessment_usage add constraint assessment_usage_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
create index if not exists assessment_usage_by_user on public.assessment_usage (user_id, created_at desc);
create index if not exists assessment_usage_by_session on public.assessment_usage (provider_session_id) where provider_session_id is not null;

alter table public.assessment_usage enable row level security;
revoke all on public.assessment_usage from public, anon, authenticated;
grant select on public.assessment_usage to authenticated;
drop policy if exists "assessment usage own" on public.assessment_usage;
create policy "assessment usage own" on public.assessment_usage for select to authenticated using (auth.uid() = user_id);

-- Provider usage metadata per call: never essays, audio or model replies.
create table if not exists public.assessment_provider_usage (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessment_usage(id) on delete cascade,
  created_at timestamptz not null default now(),
  status int not null,
  model text,
  usage jsonb
);
alter table public.assessment_provider_usage drop constraint if exists assessment_provider_usage_assessment_id_fkey;
alter table public.assessment_provider_usage add constraint assessment_provider_usage_assessment_id_fkey
  foreign key (assessment_id) references public.assessment_usage(id) on delete cascade;
create index if not exists assessment_provider_usage_by_assessment on public.assessment_provider_usage (assessment_id);
alter table public.assessment_provider_usage enable row level security;
revoke all on public.assessment_provider_usage from public,anon,authenticated;

-- ── Helpers (owner only) ────────────────────────────────────────────────
-- Did the AI provider answer this use successfully at least once? Then it
-- cost money, whatever happened afterwards.
create or replace function public.assessment_charged(u public.assessment_usage)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.assessment_provider_usage p
                  where p.assessment_id = u.id and p.status between 200 and 299)
$$;

-- Does this use count against an allowance right now? Settled ones do; a
-- reservation does while it is fresh (15 minutes) or once the provider has
-- answered it. Released ones never do.
create or replace function public.assessment_counts(u public.assessment_usage)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select u.status = 'settled'
      or (u.status = 'reserved'
          and (u.created_at > now() - interval '15 minutes' or public.assessment_charged(u)))
$$;

-- ── Called by the Workers (service role) ────────────────────────────────
-- Reserve one use BEFORE the provider is called.
--   ok      {used, limit, kind, purpose}
--   reason  sign-in-required | invalid-request | already-requested |
--           daily-limit | unknown-session | paid-required | trial-ended |
--           allowance-used | placement-used | mock-allowance-used
--           (the last three also carry kind, purpose, used, limit)
drop function if exists public.assessment_reserve(uuid,text,text,text);
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
  -- Serialise every allowance and payment decision for this account: the
  -- same per-account lock the payment functions take (2026-09-30-paid-access
  -- .sql), so a purchase and a reservation never interleave either. An
  -- advisory lock needs no privilege on auth.users (review P2-2).
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

  -- Abandoned reservations are given back before anything is counted.
  update public.assessment_usage u
     set status = 'released', release_reason = 'stale', updated_at = now()
   where u.user_id = p_user and u.status = 'reserved' and not public.assessment_counts(u);

  select * into previous from public.assessment_usage where user_id=p_user and kind=p_kind and request_id=p_request;
  if found and previous.status <> 'released' then
    return jsonb_build_object('ok',false,'reason','already-requested');
  end if;

  -- The rolling-day safeguard, separate from the monthly allowance (review
  -- P2-4): it counts uses that are counted or that the provider charged
  -- for, so a provider outage (errors, timeouts, nothing charged) does not
  -- lock a student out for a day. A flood of attempts of any kind is still
  -- stopped at 60.
  select count(*) filter (where u.status <> 'released' or public.assessment_charged(u)), count(*)
    into charged, attempts
    from public.assessment_usage u where u.user_id=p_user and u.created_at > now()-interval '1 day';
  if charged >= 24 or attempts >= 60 then return jsonb_build_object('ok',false,'reason','daily-limit'); end if;

  select * into g from public.access_grants where user_id=p_user and revoked_at is null
    and starts_at <= now() and ends_at > now() order by starts_at desc limit 1;

  if p_kind='feedback' then
    -- Finish an interview admitted while access was valid, even if that
    -- period just expired. Refunded grants never qualify. Placement and
    -- mock interviews get feedback exactly like practice ones.
    select grants.* into g from public.access_grants grants join public.assessment_usage u on u.grant_id=grants.id
      where u.user_id=p_user and u.kind='live' and u.provider_session_id=p_session and u.status='settled'
      and u.created_at>now()-interval '1 day' and grants.revoked_at is null limit 1;
    if g.id is null then return jsonb_build_object('ok',false,'reason','unknown-session'); end if;
    if exists(select 1 from public.assessment_usage where user_id=p_user and kind='feedback' and provider_session_id=p_session and status <> 'released') then
      return jsonb_build_object('ok',false,'reason','already-requested');
    end if;
    allowance := 1; n := 0;
  elsif g.id is null then
    -- No running paid access. A trial has no live interview of any kind.
    if p_kind not in ('writing','speaking') then return jsonb_build_object('ok',false,'reason','paid-required'); end if;
    if not exists(select 1 from public.trial_accounts where user_id=p_user and ends_at > now()) then
      return jsonb_build_object('ok',false,'reason','trial-ended');
    end if;
    -- One Writing OR recorded Speaking assessment for the whole trial.
    allowance := 1;
    select count(*) into n from public.assessment_usage u
      where u.user_id=p_user and u.grant_id is null and public.assessment_counts(u);
  elsif v_purpose = 'placement' then
    -- Once per account, across every purchase.
    allowance := 1; used_up := 'placement-used';
    select count(*) into n from public.assessment_usage u
      where u.user_id=p_user and u.kind='live' and u.purpose='placement' and public.assessment_counts(u);
  elsif v_purpose = 'mock' then
    -- Two full mock exams per purchase, apart from the two live interviews.
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
  -- Every retry has a new request id; a released id cannot bypass the daily cap.
  if previous.id is not null then return jsonb_build_object('ok',false,'reason','already-requested'); end if;
  insert into public.assessment_usage(user_id,grant_id,kind,request_id,provider_session_id,purpose)
    values(p_user,g.id,p_kind,p_request,p_session,v_purpose);
  return jsonb_build_object('ok',true,'used',n+1,'limit',allowance,'kind',p_kind,'purpose',v_purpose);
end $$;

-- Settle (success) or release (failure) one reservation. A success that
-- arrives after a stale release still settles it.
create or replace function public.assessment_finish(p_user uuid, p_kind text, p_request text, p_success boolean, p_session text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.assessment_usage
     set status = case when p_success then 'settled' else 'released' end,
         release_reason = case when p_success then null else 'failed' end,
         provider_session_id = coalesce(p_session, provider_session_id),
         updated_at = now()
   where user_id=p_user and kind=p_kind and request_id=p_request
     and (status = 'reserved' or (p_success and status = 'released' and release_reason = 'stale'));
  return jsonb_build_object('ok',found);
end $$;

-- A live interview the examiner never began gives its use back (review
-- P1-4). The live examiner Worker calls this from POST /end only when its
-- own session record shows the begin cue was never delivered and the
-- session ended within 90 seconds of opening; this function checks again
-- what the database itself holds: the caller's own settled interview,
-- opened at most 2 minutes ago (90 seconds plus the handshake), with no
-- feedback requested on it.
--   ok      {kind: 'live', purpose}
--   reason  unknown-session | not-counted | too-late | feedback-requested
create or replace function public.assessment_live_give_back(p_user uuid, p_session text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare u public.assessment_usage;
begin
  perform pg_advisory_xact_lock(hashtext('access:' || p_user::text));
  select * into u from public.assessment_usage
   where user_id=p_user and kind='live' and provider_session_id=p_session limit 1;
  if not found then return jsonb_build_object('ok',false,'reason','unknown-session'); end if;
  if u.status <> 'settled' then return jsonb_build_object('ok',false,'reason','not-counted'); end if;
  if u.created_at < now() - interval '2 minutes' then return jsonb_build_object('ok',false,'reason','too-late'); end if;
  if exists (select 1 from public.assessment_usage f where f.user_id=p_user and f.kind='feedback'
              and f.provider_session_id=p_session and f.status <> 'released') then
    return jsonb_build_object('ok',false,'reason','feedback-requested');
  end if;
  update public.assessment_usage set status='released', release_reason='given-back', updated_at=now() where id=u.id;
  return jsonb_build_object('ok',true,'kind','live','purpose',u.purpose);
end $$;

create or replace function public.assessment_meter(p_user uuid,p_kind text,p_request text,p_status int,p_model text,p_usage jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a uuid;
begin
  select id into a from public.assessment_usage where user_id=p_user and kind=p_kind and request_id=p_request;
  if a is null then return jsonb_build_object('ok',false); end if;
  insert into public.assessment_provider_usage(assessment_id,status,model,usage) values(a,p_status,p_model,p_usage);
  return jsonb_build_object('ok',true);
end $$;

-- ── Called by the browser (the signed-in student) ───────────────────────
-- The student's own counts. Stale reservations already read as released.
--   trialUsed, trialLimit (1 while a trial runs, else 0), endsAt (of the
--   running purchase, or null), writingUsed, speakingUsed, liveUsed (the 2
--   practice interviews), mockUsed, placementUsed (true/false, per account),
--   pending (reservations still being graded), limits (null without a
--   running purchase).
create or replace function public.assessment_balance()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare g public.access_grants; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in required' using errcode='28000'; end if;
  select * into g from public.access_grants where user_id=uid and revoked_at is null
    and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
  return jsonb_build_object(
    'trialUsed',(select count(*) from public.assessment_usage u where u.user_id=uid and u.grant_id is null and public.assessment_counts(u)),
    'trialLimit',case when exists(select 1 from public.trial_accounts t where t.user_id=uid and t.ends_at>now()) then 1 else 0 end,
    'endsAt',g.ends_at,
    'writingUsed',(select count(*) from public.assessment_usage u where u.user_id=uid and u.grant_id=g.id and u.kind='writing' and public.assessment_counts(u)),
    'speakingUsed',(select count(*) from public.assessment_usage u where u.user_id=uid and u.grant_id=g.id and u.kind='speaking' and public.assessment_counts(u)),
    'liveUsed',(select count(*) from public.assessment_usage u where u.user_id=uid and u.grant_id=g.id and u.kind='live' and u.purpose='practice' and public.assessment_counts(u)),
    'mockUsed',(select count(*) from public.assessment_usage u where u.user_id=uid and u.grant_id=g.id and u.kind='live' and u.purpose='mock' and public.assessment_counts(u)),
    'placementUsed',exists(select 1 from public.assessment_usage u where u.user_id=uid and u.kind='live' and u.purpose='placement' and public.assessment_counts(u)),
    'pending',(select count(*) from public.assessment_usage u where u.user_id=uid and u.status='reserved' and public.assessment_counts(u)),
    'limits',case when g.id is null then null else jsonb_build_object('writing',12,'speaking',6,'live',2,'mock',2,'placement',1) end);
end $$;

create or replace function public.trial_status()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'sign in required' using errcode='28000'; end if;
  return public.trial_state(auth.uid()) || jsonb_build_object('assessments',public.assessment_balance());
end $$;

-- ── Admin only (needs 2026-09-24-admin.sql) ─────────────────────────────
-- One account's uses, newest first, so a support request can be checked
-- against the record. Refuses (42501) unless the caller is an admin.
create or replace function public.assessment_admin_usage(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',u.id,'kind',u.kind,'purpose',u.purpose,'status',u.status,
      'counts',public.assessment_counts(u),'charged',public.assessment_charged(u),
      'createdAt',u.created_at,'updatedAt',u.updated_at,'releaseReason',u.release_reason,
      'releaseNote',u.release_note,'grantId',u.grant_id) order by u.created_at desc)
    from public.assessment_usage u where u.user_id = p_user), '[]'::jsonb);
end $$;

-- Give one use back by hand, with a short note. Refuses (42501) unless the
-- caller is an admin. The admin's own id is recorded from their sign-in.
--   ok      {id, kind, purpose}
--   reason  not-found | already-released
create or replace function public.assessment_admin_give_back(p_id uuid, p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare u public.assessment_usage;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select * into u from public.assessment_usage where id = p_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','not-found'); end if;
  if u.status = 'released' then return jsonb_build_object('ok',false,'reason','already-released'); end if;
  update public.assessment_usage
     set status='released', release_reason='admin', released_by=auth.uid(),
         release_note=left(nullif(btrim(coalesce(p_note,'')),''),200), updated_at=now()
   where id = u.id;
  return jsonb_build_object('ok',true,'id',u.id,'kind',u.kind,'purpose',u.purpose);
end $$;

-- ── Who may call what ───────────────────────────────────────────────────
revoke all on function public.assessment_charged(public.assessment_usage) from public,anon,authenticated;
revoke all on function public.assessment_counts(public.assessment_usage) from public,anon,authenticated;
revoke all on function public.assessment_reserve(uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.assessment_finish(uuid,text,text,boolean,text) from public,anon,authenticated;
revoke all on function public.assessment_live_give_back(uuid,text) from public,anon,authenticated;
revoke all on function public.assessment_meter(uuid,text,text,int,text,jsonb) from public,anon,authenticated;
grant execute on function public.assessment_reserve(uuid,text,text,text,text) to service_role;
grant execute on function public.assessment_finish(uuid,text,text,boolean,text) to service_role;
grant execute on function public.assessment_live_give_back(uuid,text) to service_role;
grant execute on function public.assessment_meter(uuid,text,text,int,text,jsonb) to service_role;
revoke all on function public.assessment_balance() from public,anon;
grant execute on function public.assessment_balance() to authenticated;
revoke all on function public.trial_status() from public,anon;
grant execute on function public.trial_status() to authenticated;
revoke all on function public.assessment_admin_usage(uuid) from public,anon;
revoke all on function public.assessment_admin_give_back(uuid,text) from public,anon;
grant execute on function public.assessment_admin_usage(uuid) to authenticated;
grant execute on function public.assessment_admin_give_back(uuid,text) to authenticated;

-- ── Rollback (run by hand, never by a script) ───────────────────────────
-- The ledger is a record of paid use: export both tables first. Rolling
-- back does NOT restore the old price; that is a separate pricing decision
-- (re-enable month-3 or change month-1 in public.access_plans by hand).
-- Afterwards re-run 2026-09-23-trial.sql so trial_status no longer reports
-- assessments, and redeploy the Workers without ACCESS_MODE=trial.
-- drop function if exists public.assessment_admin_give_back(uuid, text);
-- drop function if exists public.assessment_admin_usage(uuid);
-- drop function if exists public.assessment_balance();
-- drop function if exists public.assessment_meter(uuid, text, text, int, text, jsonb);
-- drop function if exists public.assessment_live_give_back(uuid, text);
-- drop function if exists public.assessment_finish(uuid, text, text, boolean, text);
-- drop function if exists public.assessment_reserve(uuid, text, text, text, text);
-- drop function if exists public.assessment_counts(public.assessment_usage);
-- drop function if exists public.assessment_charged(public.assessment_usage);
-- drop table if exists public.assessment_provider_usage;
-- drop table if exists public.assessment_usage;
