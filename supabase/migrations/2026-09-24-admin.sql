-- Owner-only admin access (2026-09-24).
--
-- The site is static (GitHub Pages), so there is no server of ours that could
-- hide an admin page. The lock therefore lives here, in Postgres: a page can
-- be opened by anyone, but the data behind it is only handed out by functions
-- that check the caller against `public.admins` first. A modified browser
-- cannot get past that, because the check runs on the database using the user
-- id proved by the caller's own access token (auth.uid()), never a value the
-- browser supplies.
--
-- Adding a second admin later is one row:
--   insert into public.admins (user_id, note) select id, 'why' from auth.users where email = '...';
--
-- Idempotent: safe to run more than once. Depends on schema.sql (user_state,
-- live_examiner_sessions, mr_ez_turns) already being applied.

create table if not exists public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  note     text,
  added_at timestamptz not null default now()
);

-- Row security on and no policy at all: the browser keys can neither read nor
-- write this table, so nobody can list the admins or add themselves. Supabase
-- grants table privileges to anon/authenticated by default, so revoke those too.
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

insert into public.admins (user_id, note)
select id, 'Site owner' from auth.users where email = 'lxson777@gmail.com'
on conflict (user_id) do nothing;

-- "Am I an admin?" Only ever answers for the caller themselves, so it reveals
-- nothing about anyone else. The site uses it to decide whether to show the
-- admin link and page.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Every account on the platform with a summary of its study, for the admin
-- panel. Refuses (SQLSTATE 42501, insufficient privilege) unless the caller is
-- in public.admins. The best-band rules mirror src/lib/progress.ts: a reading
-- or listening best counts full tests only (kind is not 'drill'), and an
-- attempt with no skill recorded is Reading.
create or replace function public.admin_list_users()
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
  recent            jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
-- The returned column names (user_id, email, ...) are also variables inside
-- this function; without this, every unqualified user_id below is ambiguous.
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
  -- One row per recorded test attempt, with its test id.
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
  -- The latest few pieces of work across all three kinds, newest first.
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
    -- A plan the student set up themselves, as opposed to the default one
    -- the site fills in (study-plan.ts marks that one `defaulted: true`).
    st.plan is not null and (st.plan -> 'defaulted') is distinct from 'true'::jsonb,
    (select count(*)::integer from public.mr_ez_turns m where m.user_id = u.id),
    (select count(*)::integer from public.live_examiner_sessions l where l.user_id = u.id),
    coalesce((
      select jsonb_agg(jsonb_build_object('at', r.at, 'kind', r.kind, 'item', r.item, 'band', r.band, 'detail', r.detail) order by r.at desc nulls last)
      from recent_ranked r where r.user_id = u.id and r.n <= 8
    ), '[]'::jsonb)
  from auth.users u
  left join st on st.user_id = u.id
  order by u.created_at desc;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
