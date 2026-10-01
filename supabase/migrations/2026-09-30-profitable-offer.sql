-- Approved 30 September 2026. Local proposal, not applied to production.
-- Historical orders keep their original price. Future purchases use this offer.
update public.access_plans set amount = 12990 where id = 'month-1';
update public.access_plans set enabled = false where id = 'month-3';

-- Reservations count immediately, across all Worker instances. A lost response
-- cannot silently restore paid use. Only an explicit server failure releases it.
create table if not exists public.assessment_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  grant_id uuid references public.access_grants(id),
  kind text not null check (kind in ('writing','speaking','live','feedback')),
  request_id text not null check (length(request_id) between 8 and 128),
  status text not null default 'reserved' check (status in ('reserved','settled','released')),
  provider_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,kind,request_id)
);
alter table public.assessment_usage enable row level security;
revoke all on public.assessment_usage from public, anon, authenticated;
grant select on public.assessment_usage to authenticated;
drop policy if exists "assessment usage own" on public.assessment_usage;
create policy "assessment usage own" on public.assessment_usage for select to authenticated using (auth.uid() = user_id);

create or replace function public.assessment_reserve(p_user uuid, p_kind text, p_request text, p_session text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  g public.access_grants;
  n int;
  allowance int;
  previous public.assessment_usage;
begin
  -- Serialize all categories for this account, including the shared free try.
  perform 1 from auth.users where id = p_user for update;
  if not found then return jsonb_build_object('ok',false,'reason','sign-in-required'); end if;
  if p_kind not in ('writing','speaking','live','feedback') or length(p_request) not between 8 and 128 then
    return jsonb_build_object('ok',false,'reason','invalid-request');
  end if;
  select * into previous from public.assessment_usage where user_id=p_user and kind=p_kind and request_id=p_request;
  if found and previous.status <> 'released' then
    return jsonb_build_object('ok',false,'reason','already-requested');
  end if;
  -- Count even released failures, so repeated upstream errors cannot fund an
  -- unbounded retry loop. This is separate from the student's monthly balance.
  select count(*) into n from public.assessment_usage where user_id=p_user and created_at > now()-interval '1 day';
  if n >= 24 then return jsonb_build_object('ok',false,'reason','daily-limit'); end if;
  select * into g from public.access_grants where user_id=p_user and revoked_at is null
    and starts_at <= now() and ends_at > now() order by starts_at desc limit 1;
  if p_kind='feedback' then
    -- Finish an interview admitted while access was valid, even if that
    -- period just expired. Refunded grants never qualify.
    select grants.* into g from public.access_grants grants join public.assessment_usage u on u.grant_id=grants.id
      where u.user_id=p_user and u.kind='live' and u.provider_session_id=p_session and u.status='settled'
      and u.created_at>now()-interval '1 day' and grants.revoked_at is null limit 1;
    if g.id is null then return jsonb_build_object('ok',false,'reason','unknown-session'); end if;
    if exists(select 1 from public.assessment_usage where user_id=p_user and kind='feedback' and provider_session_id=p_session and status <> 'released') then
      return jsonb_build_object('ok',false,'reason','already-requested');
    end if;
    allowance := 1; n := 0;
  elsif g.id is null then
    if p_kind not in ('writing','speaking') then return jsonb_build_object('ok',false,'reason','paid-required'); end if;
    if not exists(select 1 from public.trial_accounts where user_id=p_user and ends_at > now()) then
      return jsonb_build_object('ok',false,'reason','trial-ended');
    end if;
    allowance := 1;
    select count(*) into n from public.assessment_usage where user_id=p_user and grant_id is null and status <> 'released';
  else
    allowance := case p_kind when 'writing' then 12 when 'speaking' then 6 when 'live' then 2 end;
    select count(*) into n from public.assessment_usage where user_id=p_user and grant_id=g.id and kind=p_kind and status <> 'released';
  end if;
  if n >= allowance then return jsonb_build_object('ok',false,'reason','allowance-used'); end if;
  -- Every retry has a new request id; a released id cannot bypass the daily cap.
  if previous.id is not null then return jsonb_build_object('ok',false,'reason','already-requested'); end if;
  insert into public.assessment_usage(user_id,grant_id,kind,request_id,provider_session_id)
    values(p_user,g.id,p_kind,p_request,p_session);
  return jsonb_build_object('ok',true,'used',n+1,'limit',allowance);
end $$;

create or replace function public.assessment_finish(p_user uuid, p_kind text, p_request text, p_success boolean, p_session text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.assessment_usage set status=case when p_success then 'settled' else 'released' end,
    provider_session_id=coalesce(p_session,provider_session_id),updated_at=now()
    where user_id=p_user and kind=p_kind and request_id=p_request and status='reserved';
  return jsonb_build_object('ok',found);
end $$;

revoke all on function public.assessment_reserve(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.assessment_finish(uuid,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.assessment_reserve(uuid,text,text,text) to service_role;
grant execute on function public.assessment_finish(uuid,text,text,boolean,text) to service_role;

create or replace function public.assessment_balance()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare g public.access_grants; result jsonb; n int;
begin
  if auth.uid() is null then raise exception 'sign in required' using errcode='28000'; end if;
  select * into g from public.access_grants where user_id=auth.uid() and revoked_at is null
    and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
  select count(*) into n from public.assessment_usage where user_id=auth.uid() and grant_id is null and status<>'released';
  result := jsonb_build_object('trialUsed',n,'endsAt',g.ends_at);
  return result || jsonb_build_object(
    'writingUsed',(select count(*) from public.assessment_usage where user_id=auth.uid() and grant_id=g.id and kind='writing' and status<>'released'),
    'speakingUsed',(select count(*) from public.assessment_usage where user_id=auth.uid() and grant_id=g.id and kind='speaking' and status<>'released'),
    'liveUsed',(select count(*) from public.assessment_usage where user_id=auth.uid() and grant_id=g.id and kind='live' and status<>'released'));
end $$;
revoke all on function public.assessment_balance() from public,anon;
grant execute on function public.assessment_balance() to authenticated;

create or replace function public.trial_status()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'sign in required' using errcode='28000'; end if;
  return public.trial_state(auth.uid()) || jsonb_build_object('assessments',public.assessment_balance());
end $$;

-- Rollback is an operator decision: retain this ledger and historical orders.
-- Re-enable the old offer only after an explicit pricing decision.

create table if not exists public.assessment_provider_usage (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessment_usage(id),
  created_at timestamptz not null default now(),
  status int not null,
  model text,
  usage jsonb
);
alter table public.assessment_provider_usage enable row level security;
revoke all on public.assessment_provider_usage from public,anon,authenticated;
create or replace function public.assessment_meter(p_user uuid,p_kind text,p_request text,p_status int,p_model text,p_usage jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a uuid;
begin
  select id into a from public.assessment_usage where user_id=p_user and kind=p_kind and request_id=p_request;
  if a is null then return jsonb_build_object('ok',false); end if;
  insert into public.assessment_provider_usage(assessment_id,status,model,usage) values(a,p_status,p_model,p_usage);
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.assessment_meter(uuid,text,text,int,text,jsonb) from public,anon,authenticated;
grant execute on function public.assessment_meter(uuid,text,text,int,text,jsonb) to service_role;
