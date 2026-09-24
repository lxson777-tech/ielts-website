-- Student profiles (2026-09-24). NOT yet applied to production.
--
-- One row per account with the details every student must give before using
-- the course: name, date of birth, phone, city, what they do, how they found
-- us, and for anyone under 18 a parent's name and phone plus the parent's
-- agreement. The site greets students by first name and Mr EZ uses it; the
-- admin panel (public.admin_list_users) shows the rest to the owner only.
--
-- Access model, the same as user_state: a student reads and writes their own
-- row only, under Row Level Security, using the user id proved by their own
-- access token. There is no delete policy. The Worker reads it with the
-- service role key. Nobody else can see anyone else's row.
--
-- Idempotent: safe to run more than once. Depends on schema.sql
-- (touch_user_state_updated_at) and on 2026-09-24-admin.sql (is_admin).

create table if not exists public.student_profiles (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  first_name        text not null,
  last_name         text not null,
  date_of_birth     date not null,
  phone             text not null,
  city              text not null,
  occupation        text not null,          -- school, university or job, free text
  source            text not null,          -- how they found us: friend | instagram | centre | other
  parent_name       text,                   -- required while the student is under 18
  parent_phone      text,
  parent_consent_at timestamptz,            -- when the "a parent agrees" box was ticked
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint student_profiles_first_name_len check (length(btrim(first_name)) between 1 and 60),
  constraint student_profiles_last_name_len  check (length(btrim(last_name)) between 1 and 60),
  constraint student_profiles_city_len       check (length(btrim(city)) between 1 and 80),
  constraint student_profiles_occupation_len check (length(btrim(occupation)) between 1 and 120),
  constraint student_profiles_parent_name_len check (parent_name is null or length(btrim(parent_name)) between 1 and 80),
  constraint student_profiles_source         check (source in ('friend', 'instagram', 'centre', 'other')),
  -- Digits with an optional leading plus, 7 to 15 digits (E.164 length).
  constraint student_profiles_phone_shape    check (phone ~ '^\+?[0-9]{7,15}$'),
  constraint student_profiles_parent_phone_shape check (parent_phone is null or parent_phone ~ '^\+?[0-9]{7,15}$'),
  constraint student_profiles_dob_range      check (date_of_birth > date '1900-01-01')
);

alter table public.student_profiles enable row level security;

drop policy if exists "student_profiles select own" on public.student_profiles;
create policy "student_profiles select own" on public.student_profiles
  for select using (auth.uid() = user_id);
drop policy if exists "student_profiles insert own" on public.student_profiles;
create policy "student_profiles insert own" on public.student_profiles
  for insert with check (auth.uid() = user_id);
drop policy if exists "student_profiles update own" on public.student_profiles;
create policy "student_profiles update own" on public.student_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The rules a browser cannot skip: a date of birth in the past and not
-- absurdly young, and for anyone under 18 a parent's name, phone and
-- agreement. Checked here because a CHECK constraint cannot use today's date.
-- "Today" is Almaty's date, where the students are, not the server's (UTC),
-- so an 18th birthday counts from local midnight. The agreement time is
-- stamped HERE, by the server, the first time the parent fields arrive: the
-- browser may send any value and it is ignored.
create or replace function public.guard_student_profile_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Almaty')::date;
  age_years integer;
begin
  if new.date_of_birth >= today then
    raise exception 'date of birth must be in the past' using errcode = '23514';
  end if;
  age_years := extract(year from age(today, new.date_of_birth))::integer;
  if age_years < 5 then
    raise exception 'date of birth is too recent' using errcode = '23514';
  end if;
  if age_years < 18 then
    if new.parent_name is null or length(btrim(new.parent_name)) = 0
       or new.parent_phone is null or new.parent_consent_at is null then
      raise exception 'a parent''s name, phone and agreement are required under 18' using errcode = '23514';
    end if;
    -- Keep the first recorded agreement; stamp a new one with the server clock.
    if tg_op = 'UPDATE' and old.parent_consent_at is not null then
      new.parent_consent_at := old.parent_consent_at;
    else
      new.parent_consent_at := now();
    end if;
  end if;
  new.first_name := btrim(new.first_name);
  new.last_name := btrim(new.last_name);
  new.city := btrim(new.city);
  new.occupation := btrim(new.occupation);
  if new.parent_name is not null then
    new.parent_name := btrim(new.parent_name);
  end if;
  return new;
end $$;

drop trigger if exists student_profiles_guard on public.student_profiles;
create trigger student_profiles_guard
  before insert or update on public.student_profiles
  for each row execute function public.guard_student_profile_write();

drop trigger if exists student_profiles_touch on public.student_profiles;
create trigger student_profiles_touch
  before update on public.student_profiles
  for each row execute function public.touch_user_state_updated_at();

-- The admin list gains the profile. The return type changes, so the function
-- is dropped and recreated (create or replace cannot change a return type).
-- Everything else about it is unchanged from 2026-09-24-admin.sql.
drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  user_id           uuid,
  email             text,
  provider          text,
  email_confirmed   boolean,
  is_admin          boolean,
  joined_at         timestamptz,
  last_sign_in_at   timestamptz,
  last_synced_at    timestamptz,
  last_active_day   text,
  active_days       integer,
  minutes_studied   integer,
  lessons_done      integer,
  tests_taken       integer,
  best_reading      numeric,
  best_listening    numeric,
  writing_count     integer,
  best_writing      numeric,
  speaking_count    integer,
  best_speaking     numeric,
  target_band       text,
  test_date         text,
  daily_minutes     integer,
  plan_chosen       boolean,
  tutor_messages    integer,
  examiner_sessions integer,
  recent            jsonb,
  -- Profile. All null when the student has not filled it in yet.
  first_name        text,
  last_name         text,
  date_of_birth     date,
  phone             text,
  city              text,
  occupation        text,
  source            text,
  parent_name       text,
  parent_phone      text,
  parent_consent_at timestamptz,
  profile_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return query
  with st as (
    select
      s.user_id,
      s.updated_at,
      case when jsonb_typeof(s.progress) = 'object' then s.progress else '{}'::jsonb end as p,
      case when jsonb_typeof(s.study_plan) = 'object' then s.study_plan else null end as plan
    from public.user_state s
  ),
  tests as (
    select st.user_id, t.key as test_id, a.value as att
    from st
    cross join lateral jsonb_each(case when jsonb_typeof(st.p -> 'tests') = 'object' then st.p -> 'tests' else '{}'::jsonb end) t
    cross join lateral jsonb_array_elements(case when jsonb_typeof(t.value) = 'array' then t.value else '[]'::jsonb end) a
  ),
  writing as (
    select st.user_id, w.key as prompt_id, a.value as att
    from st
    cross join lateral jsonb_each(case when jsonb_typeof(st.p -> 'writing') = 'object' then st.p -> 'writing' else '{}'::jsonb end) w
    cross join lateral jsonb_array_elements(case when jsonb_typeof(w.value) = 'array' then w.value else '[]'::jsonb end) a
  ),
  speaking as (
    select st.user_id, a.value as att
    from st
    cross join lateral jsonb_array_elements(case when jsonb_typeof(st.p -> 'speaking') = 'array' then st.p -> 'speaking' else '[]'::jsonb end) a
  ),
  activity as (
    select st.user_id, d.key as day, d.value as v
    from st
    cross join lateral jsonb_each(case when jsonb_typeof(st.p -> 'activity') = 'object' then st.p -> 'activity' else '{}'::jsonb end) d
  ),
  recent_all as (
    select user_id, att ->> 'at' as at, 'test' as kind, test_id as item,
           (att ->> 'band')::numeric as band,
           coalesce(att ->> 'kind', 'full') as detail
    from tests where jsonb_typeof(att -> 'band') = 'number'
    union all
    select user_id, att ->> 'at', 'writing', coalesce(att ->> 'promptTitle', prompt_id),
           (att ->> 'overallBand')::numeric, coalesce(att ->> 'task', '')
    from writing where jsonb_typeof(att -> 'overallBand') = 'number'
    union all
    select user_id, att ->> 'at', 'speaking', coalesce(att ->> 'topic', ''),
           (att ->> 'overallBand')::numeric, coalesce(att ->> 'mode', '')
    from speaking where jsonb_typeof(att -> 'overallBand') = 'number'
  ),
  recent_ranked as (
    select r.*, row_number() over (partition by r.user_id order by r.at desc nulls last) as n
    from recent_all r
  )
  select
    u.id,
    u.email::text,
    coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
    u.email_confirmed_at is not null,
    exists (select 1 from public.admins a where a.user_id = u.id),
    u.created_at,
    u.last_sign_in_at,
    st.updated_at,
    (select max(day) from activity x where x.user_id = u.id),
    (select count(*)::integer from activity x where x.user_id = u.id),
    (select coalesce(sum(case when jsonb_typeof(x.v -> 'minutes') = 'number' then (x.v ->> 'minutes')::numeric else 0 end), 0)::integer
       from activity x where x.user_id = u.id),
    (select count(*)::integer from jsonb_object_keys(case when jsonb_typeof(st.p -> 'lessons') = 'object' then st.p -> 'lessons' else '{}'::jsonb end)),
    (select count(*)::integer from tests x where x.user_id = u.id),
    (select max((x.att ->> 'band')::numeric) from tests x
       where x.user_id = u.id and jsonb_typeof(x.att -> 'band') = 'number'
         and coalesce(x.att ->> 'kind', 'full') <> 'drill'
         and coalesce(x.att ->> 'skill', 'reading') = 'reading'),
    (select max((x.att ->> 'band')::numeric) from tests x
       where x.user_id = u.id and jsonb_typeof(x.att -> 'band') = 'number'
         and coalesce(x.att ->> 'kind', 'full') <> 'drill'
         and x.att ->> 'skill' = 'listening'),
    (select count(*)::integer from writing x where x.user_id = u.id),
    (select max((x.att ->> 'overallBand')::numeric) from writing x
       where x.user_id = u.id and jsonb_typeof(x.att -> 'overallBand') = 'number'),
    (select count(*)::integer from speaking x where x.user_id = u.id),
    (select max((x.att ->> 'overallBand')::numeric) from speaking x
       where x.user_id = u.id and jsonb_typeof(x.att -> 'overallBand') = 'number'),
    nullif(st.plan ->> 'targetBand', ''),
    nullif(st.plan ->> 'testDate', ''),
    case when jsonb_typeof(st.plan -> 'dailyMinutes') = 'number' then (st.plan ->> 'dailyMinutes')::numeric::integer end,
    st.plan is not null and (st.plan -> 'defaulted') is distinct from 'true'::jsonb,
    (select count(*)::integer from public.mr_ez_turns m where m.user_id = u.id),
    (select count(*)::integer from public.live_examiner_sessions l where l.user_id = u.id),
    coalesce((
      select jsonb_agg(jsonb_build_object('at', r.at, 'kind', r.kind, 'item', r.item, 'band', r.band, 'detail', r.detail) order by r.at desc nulls last)
      from recent_ranked r where r.user_id = u.id and r.n <= 8
    ), '[]'::jsonb),
    pr.first_name,
    pr.last_name,
    pr.date_of_birth,
    pr.phone,
    pr.city,
    pr.occupation,
    pr.source,
    pr.parent_name,
    pr.parent_phone,
    pr.parent_consent_at,
    pr.updated_at
  from auth.users u
  left join st on st.user_id = u.id
  left join public.student_profiles pr on pr.user_id = u.id
  order by u.created_at desc;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
