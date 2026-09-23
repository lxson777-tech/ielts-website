-- Three-day trial: server-owned clock and per-section allowances.
--
-- PROPOSAL, NOT APPLIED to any real Supabase project. Written 23 September
-- 2026 for the trial handoff (docs/CLAUDE-TRIAL-IMPLEMENTATION-HANDOFF.md)
-- and tested only against a local in-memory Postgres (PGlite) through
-- tests/trial-sql.test.ts, tests/trial-worker.test.ts and the local stand-in
-- tools/mr-ez-dev-server.mjs. Nobody but Alex applies it. How to apply,
-- verify and roll back: docs/TRIAL-IMPLEMENTATION.md.
--
-- Depends on schema.sql (auth.users exists in every Supabase project). Does
-- not touch user_state, live_examiner_sessions, any mr_ez_* table or the
-- learning_* tables, and migrates no existing row.
--
-- WHAT IT ENFORCES
--   - One trial per account, started explicitly, 72 hours from the moment
--     the SERVER recorded the start. Starting again returns the same trial:
--     signing out, changing device or following a sign-up link twice never
--     restarts the clock.
--   - One test per section (Reading, Listening, Writing, Speaking) for the
--     whole trial, bound at start to one activity, so the same test can be
--     resumed but a different one cannot be started.
--   - The Speaking test is a Part 1 interview of about five minutes (Alex,
--     23 September 2026), with at most two interviews started under it.
--   - Five successfully answered Mr EZ requests per section for the whole
--     trial, no daily reset. A request reserves one message before any money
--     is spent, and is either SETTLED (answered, counted) or RELEASED
--     (failed, not counted). A released message is never counted.
--
-- WHO CAN DO WHAT
--   - The browser (role `authenticated`) can read its own trial and usage,
--     start its own trial, begin its own section test and mark a Reading or
--     Listening test finished (those are scored in the browser). It cannot
--     insert, update or delete a row directly, and cannot release anything,
--     so it can never refund its own allowance.
--   - The Workers (service role) reserve, settle and release Mr EZ messages
--     and lease, settle and release the Writing and Speaking tests they grade.
--   - `anon` can read the public list of what the trial includes and nothing
--     else.
--
-- The limits below (72 hours, 1 test, 5 messages, 5-minute stale window,
-- 2 Speaking interviews) are
-- mirrored in src/lib/trial/offer.ts, and tests/trial-sql.test.ts fails if
-- the two ever disagree.

-- ── What the trial includes ─────────────────────────────────────────────
-- One row per lesson or test a trial student may open. The rows seeded at
-- the bottom (one introductory lesson and one test per section) were
-- confirmed by Alex on 23 September 2026. `enabled = false` keeps an item
-- listed but unavailable.
create table if not exists public.trial_offer_items (
  item_id    text primary key check (item_id ~ '^(lesson|test):[a-z0-9-]{2,80}$'),
  section    text not null check (section in ('reading', 'listening', 'writing', 'speaking')),
  kind       text not null check (kind in ('lesson', 'test')),
  enabled    boolean not null default true,
  constraint trial_offer_items_kind_prefix check (item_id like kind || ':%')
);

alter table public.trial_offer_items enable row level security;

drop policy if exists "trial_offer_items readable" on public.trial_offer_items;
create policy "trial_offer_items readable" on public.trial_offer_items
  for select to anon, authenticated using (true);

-- ── One trial per account ───────────────────────────────────────────────
create table if not exists public.trial_accounts (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  started_at    timestamptz not null,
  ends_at       timestamptz not null,
  -- The marketing questionnaire's choices, validated by
  -- trial_clean_questionnaire. A SUGGESTED starting plan, never a level.
  questionnaire jsonb,
  constraint trial_accounts_three_days check (ends_at = started_at + interval '72 hours')
);

alter table public.trial_accounts enable row level security;

drop policy if exists "trial_accounts select own" on public.trial_accounts;
create policy "trial_accounts select own" on public.trial_accounts
  for select to authenticated using (auth.uid() = user_id);

-- ── Everything the trial allowances are counted from ────────────────────
-- One row per reserved Mr EZ message or per section test. The request id is
-- the identity a retry re-uses: the tutor's idempotency key, or the test
-- sitting's id. (user_id, kind, request_id) is the primary key, so the same
-- request can never be counted twice.
create table if not exists public.trial_usage (
  user_id     uuid not null references public.trial_accounts (user_id) on delete cascade,
  kind        text not null check (kind in ('tutor', 'test')),
  section     text not null check (section in ('reading', 'listening', 'writing', 'speaking')),
  request_id  text not null check (request_id ~ '^[A-Za-z0-9_:-]{8,128}$'),
  activity_id text not null check (activity_id ~ '^[A-Za-z0-9_:-]{1,160}$'),
  status      text not null check (status in ('reserved', 'settled', 'released')),
  reserved_at timestamptz not null default now(),
  settled_at  timestamptz,
  released_at timestamptz,
  -- A grading Worker holds this while it is grading a Writing or Speaking
  -- test, so two submissions of the same test cannot both be paid for.
  lease_until timestamptz,
  -- Speaking only: live interviews started under this test. Capped at two
  -- (the first, and one retry after a dropped connection) so the one test
  -- cannot become an open-ended series of paid voice sessions.
  sessions    int not null default 0 check (sessions >= 0),
  primary key (user_id, kind, request_id)
);

-- For a database that ran an earlier draft of this file.
alter table public.trial_usage add column if not exists sessions int not null default 0;

-- At most one live test per section per account, enforced by the database
-- itself, so two tabs racing to start different tests cannot both win.
create unique index if not exists trial_usage_one_test_per_section
  on public.trial_usage (user_id, section)
  where kind = 'test' and status <> 'released';

create index if not exists trial_usage_counting
  on public.trial_usage (user_id, kind, section, status);

alter table public.trial_usage enable row level security;

drop policy if exists "trial_usage select own" on public.trial_usage;
create policy "trial_usage select own" on public.trial_usage
  for select to authenticated using (auth.uid() = user_id);

-- No insert, update or delete policy on any of the three tables. Every write
-- goes through the functions below.

-- ── Helpers (not callable by anyone but their owner) ────────────────────

create or replace function public.trial_clean_questionnaire(p jsonb)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p is null or jsonb_typeof(p) <> 'object' then null
    when (p ->> 'band') in ('7', '7.5', '8')
     and (p ->> 'skill') in ('reading', 'listening', 'writing', 'speaking')
     and (p ->> 'focus') in ('method', 'confidence')
     and (p ->> 'time') in ('15', '30', '60')
    then jsonb_build_object(
      'band', p ->> 'band', 'skill', p ->> 'skill', 'focus', p ->> 'focus', 'time', p ->> 'time')
    else null
  end
$$;

-- The one read model every caller gets back. `serverNow` lets the browser
-- show time remaining from the server's clock rather than its own.
create or replace function public.trial_state(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  t public.trial_accounts;
  sections jsonb := '{}'::jsonb;
  s text;
  claim public.trial_usage;
  tutor_used int;
  tutor_pending int;
begin
  select * into t from public.trial_accounts where user_id = p_user;
  if not found then
    return jsonb_build_object(
      'state', 'none', 'serverNow', now(),
      'limits', jsonb_build_object('hours', 72, 'testsPerSection', 1, 'tutorPerSection', 5));
  end if;

  foreach s in array array['reading', 'listening', 'writing', 'speaking'] loop
    select * into claim from public.trial_usage
      where user_id = p_user and kind = 'test' and section = s and status <> 'released'
      limit 1;
    select count(*) filter (where status = 'settled'),
           count(*) filter (where status = 'reserved' and reserved_at > now() - interval '5 minutes')
      into tutor_used, tutor_pending
      from public.trial_usage
      where user_id = p_user and kind = 'tutor' and section = s;
    sections := sections || jsonb_build_object(s, jsonb_build_object(
      'test', case when claim.request_id is null then null else jsonb_build_object(
        'activityId', claim.activity_id,
        'requestId', claim.request_id,
        'status', claim.status,
        'startedAt', claim.reserved_at,
        'finishedAt', claim.settled_at) end,
      'tutorUsed', tutor_used,
      'tutorPending', tutor_pending));
  end loop;

  return jsonb_build_object(
    'state', case when now() < t.ends_at then 'active' else 'ended' end,
    'startedAt', t.started_at,
    'endsAt', t.ends_at,
    'serverNow', now(),
    'questionnaire', t.questionnaire,
    'limits', jsonb_build_object('hours', 72, 'testsPerSection', 1, 'tutorPerSection', 5),
    'sections', sections);
end
$$;

-- ── Called by the browser, as the signed-in student ─────────────────────

create or replace function public.trial_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in required' using errcode = '28000';
  end if;
  return public.trial_state(auth.uid());
end
$$;

-- Starts the caller's trial, or returns the one they already have. The
-- clock is the server's; nothing the browser sends can move it.
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
  insert into public.trial_accounts (user_id, started_at, ends_at, questionnaire)
    values (uid, now(), now() + interval '72 hours', public.trial_clean_questionnaire(p_questionnaire))
    on conflict (user_id) do nothing;
  return public.trial_state(uid);
end
$$;

-- Binds the section's one test to one activity. Beginning the SAME activity
-- again resumes it (any time, even after the trial ended, because it was
-- admitted while the trial was active); beginning a DIFFERENT one is refused.
-- A new test needs an active trial.
create or replace function public.trial_test_begin(p_section text, p_activity text, p_request text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  t public.trial_accounts;
  claim public.trial_usage;
begin
  if uid is null then
    raise exception 'sign in required' using errcode = '28000';
  end if;
  -- Serialise every allowance decision for this student on their own row.
  select * into t from public.trial_accounts where user_id = uid for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'trial-required', 'status', public.trial_state(uid));
  end if;

  select * into claim from public.trial_usage
    where user_id = uid and kind = 'test' and section = p_section and status <> 'released'
    limit 1;
  if found then
    if claim.activity_id = p_activity and claim.status = 'reserved' then
      return jsonb_build_object('ok', true, 'resumed', true, 'requestId', claim.request_id,
        'status', public.trial_state(uid));
    end if;
    return jsonb_build_object('ok', false,
      'reason', case when claim.status = 'settled' then 'test-used' else 'test-in-progress' end,
      'status', public.trial_state(uid));
  end if;

  if now() >= t.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'trial-ended', 'status', public.trial_state(uid));
  end if;
  if not exists (select 1 from public.trial_offer_items
                 where item_id = 'test:' || p_activity and section = p_section and kind = 'test' and enabled) then
    return jsonb_build_object('ok', false, 'reason', 'not-in-trial', 'status', public.trial_state(uid));
  end if;

  insert into public.trial_usage (user_id, kind, section, request_id, activity_id, status)
    values (uid, 'test', p_section, p_request, p_activity, 'reserved');
  return jsonb_build_object('ok', true, 'resumed', false, 'requestId', p_request,
    'status', public.trial_state(uid));
end
$$;

-- Reading and Listening are marked in the browser, so the browser reports
-- the submission. It can only ever use up its own test, never restore one.
create or replace function public.trial_test_finish(p_section text, p_request text)
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
  if p_section not in ('reading', 'listening') then
    return jsonb_build_object('ok', false, 'reason', 'graded-by-server', 'status', public.trial_state(uid));
  end if;
  update public.trial_usage
    set status = 'settled', settled_at = coalesce(settled_at, now())
    where user_id = uid and kind = 'test' and section = p_section and request_id = p_request
      and status = 'reserved';
  return jsonb_build_object('ok', true, 'status', public.trial_state(uid));
end
$$;

-- ── Called by the Workers only (service role) ───────────────────────────

-- Reserves one Mr EZ message in a section before the model is called.
--   ok + replay     this request was already answered: serve the stored reply,
--                   charge nothing again
--   ok              reserved, call the model, then settle or release
--   not ok          reason: trial-required | trial-ended | allowance-used |
--                   in-flight (the same request is already being answered)
create or replace function public.trial_tutor_reserve(
  p_user uuid, p_section text, p_request text, p_activity text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  t public.trial_accounts;
  existing public.trial_usage;
  used int;
begin
  select * into t from public.trial_accounts where user_id = p_user for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'trial-required');
  end if;

  select * into existing from public.trial_usage
    where user_id = p_user and kind = 'tutor' and request_id = p_request;
  if found and existing.status = 'settled' then
    return jsonb_build_object('ok', true, 'replay', true);
  end if;
  if found and existing.status = 'reserved' and existing.reserved_at > now() - interval '5 minutes' then
    return jsonb_build_object('ok', false, 'reason', 'in-flight');
  end if;

  if now() >= t.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'trial-ended');
  end if;

  -- A reservation nobody settled or released within five minutes belonged to
  -- a request that died (a Worker crash, a lost connection). It stops
  -- counting. Every Worker request finishes well inside that window.
  update public.trial_usage
    set status = 'released', released_at = now()
    where user_id = p_user and kind = 'tutor' and status = 'reserved'
      and reserved_at <= now() - interval '5 minutes';

  select count(*) into used from public.trial_usage
    where user_id = p_user and kind = 'tutor' and section = p_section
      and status in ('reserved', 'settled');
  if used >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'allowance-used', 'used', used, 'limit', 5);
  end if;

  insert into public.trial_usage (user_id, kind, section, request_id, activity_id, status)
    values (p_user, 'tutor', p_section, p_request, p_activity, 'reserved')
    on conflict (user_id, kind, request_id) do update
      set status = 'reserved', section = excluded.section, activity_id = excluded.activity_id,
          reserved_at = now(), released_at = null, settled_at = null;
  return jsonb_build_object('ok', true, 'replay', false, 'used', used + 1, 'limit', 5);
end
$$;

-- A Writing or Speaking grader takes the test's lease before it spends money.
--   ok      the test is the student's reserved one, not yet graded, and no
--           other grading of it is running
--   reason  trial-required | no-test | test-used | in-flight
-- Works after the trial ended: the test was admitted while it was active.
create or replace function public.trial_test_lease(p_user uuid, p_section text, p_request text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  claim public.trial_usage;
begin
  perform 1 from public.trial_accounts where user_id = p_user for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'trial-required');
  end if;
  select * into claim from public.trial_usage
    where user_id = p_user and kind = 'test' and section = p_section and request_id = p_request;
  if not found or claim.status = 'released' then
    return jsonb_build_object('ok', false, 'reason', 'no-test');
  end if;
  if claim.status = 'settled' then
    return jsonb_build_object('ok', false, 'reason', 'test-used');
  end if;
  if claim.lease_until is not null and claim.lease_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'in-flight');
  end if;
  update public.trial_usage set lease_until = now() + interval '5 minutes'
    where user_id = p_user and kind = 'test' and request_id = p_request;
  return jsonb_build_object('ok', true, 'activityId', claim.activity_id);
end
$$;

-- Marks a reserved message or leased test as used. Settling a reservation
-- that was already given up as stale still counts it: the student did get
-- the answer.
create or replace function public.trial_usage_settle(p_user uuid, p_kind text, p_request text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  n int;
begin
  update public.trial_usage
    set status = 'settled', settled_at = coalesce(settled_at, now()), released_at = null, lease_until = null
    where user_id = p_user and kind = p_kind and request_id = p_request
      and status in ('reserved', 'released');
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end
$$;

-- Gives back a message whose request failed, or drops a test's grading lease
-- so the student can submit it again. A settled row is never touched: a
-- successful answer is not refunded because the browser closed.
create or replace function public.trial_usage_release(p_user uuid, p_kind text, p_request text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  n int;
begin
  if p_kind = 'test' then
    update public.trial_usage set lease_until = null
      where user_id = p_user and kind = 'test' and request_id = p_request and status = 'reserved';
  else
    update public.trial_usage set status = 'released', released_at = now()
      where user_id = p_user and kind = p_kind and request_id = p_request and status = 'reserved';
  end if;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end
$$;

-- ── The Speaking test's live interviews (service role only) ─────────────
-- Alex, 23 September 2026: the trial Speaking test is Part 1 only, about five
-- minutes. The live examiner Worker asks here before it opens a paid voice
-- session: the student must have begun their Speaking test, it must not be
-- graded yet, and at most two interviews may have started under it.
--   ok      counted; open the session (release it again if opening fails)
--   reason  trial-required | no-test | test-used | sessions-used
create or replace function public.trial_speaking_session_start(p_user uuid, p_request text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  claim public.trial_usage;
begin
  perform 1 from public.trial_accounts where user_id = p_user for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'trial-required');
  end if;
  select * into claim from public.trial_usage
    where user_id = p_user and kind = 'test' and section = 'speaking' and request_id = p_request;
  if not found or claim.status = 'released' then
    return jsonb_build_object('ok', false, 'reason', 'no-test');
  end if;
  if claim.status = 'settled' then
    return jsonb_build_object('ok', false, 'reason', 'test-used');
  end if;
  if claim.sessions >= 2 then
    return jsonb_build_object('ok', false, 'reason', 'sessions-used');
  end if;
  update public.trial_usage set sessions = sessions + 1
    where user_id = p_user and kind = 'test' and request_id = p_request;
  return jsonb_build_object('ok', true, 'sessions', claim.sessions + 1, 'limit', 2);
end
$$;

-- An interview that never opened (the voice service refused or failed) gives
-- its count back.
create or replace function public.trial_speaking_session_release(p_user uuid, p_request text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  n int;
begin
  update public.trial_usage set sessions = greatest(sessions - 1, 0)
    where user_id = p_user and kind = 'test' and section = 'speaking' and request_id = p_request
      and status = 'reserved';
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end
$$;

-- ── The content gate (service role only) ────────────────────────────────
-- workers/content-gate asks this before it hands out a lesson body or a
-- practice paper (Alex, 23 September 2026: protect the content itself, not
-- only the screen). p_item is 'lesson:<key>' or 'test:<id>'.
--   ok      the trial's own lesson while the trial runs; the section's
--           trial test while the trial runs; and a test the student has
--           begun, at any time, since its questions are already theirs
--   reason  trial-required | trial-ended | not-included
-- There is no full-access state yet (no payment): when there is, it is
-- checked here, in one place, for every item.
create or replace function public.trial_can_open(p_user uuid, p_item text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  t public.trial_accounts;
  v_kind text := split_part(p_item, ':', 1);
  v_id text := substr(p_item, length(split_part(p_item, ':', 1)) + 2);
  offered boolean;
begin
  if v_kind not in ('lesson', 'test') or v_id = '' then
    return jsonb_build_object('ok', false, 'reason', 'not-included');
  end if;
  select * into t from public.trial_accounts where user_id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'trial-required');
  end if;
  if v_kind = 'test' and exists (
    select 1 from public.trial_usage
    where trial_usage.user_id = p_user and trial_usage.kind = 'test' and trial_usage.activity_id = v_id
      and trial_usage.status <> 'released'
  ) then
    return jsonb_build_object('ok', true);
  end if;
  select exists (select 1 from public.trial_offer_items where item_id = p_item and enabled) into offered;
  if not offered then
    return jsonb_build_object('ok', false, 'reason', 'not-included');
  end if;
  if now() >= t.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'trial-ended');
  end if;
  return jsonb_build_object('ok', true);
end
$$;

-- ── Who may call what ───────────────────────────────────────────────────
-- Supabase grants EXECUTE on new public functions to anon and authenticated
-- by default, so every grant here is preceded by an explicit revoke.

revoke all on function public.trial_clean_questionnaire(jsonb) from public, anon, authenticated;
revoke all on function public.trial_state(uuid) from public, anon, authenticated;

revoke all on function public.trial_status() from public, anon;
revoke all on function public.trial_start(jsonb) from public, anon;
revoke all on function public.trial_test_begin(text, text, text) from public, anon;
revoke all on function public.trial_test_finish(text, text) from public, anon;
grant execute on function public.trial_status() to authenticated;
grant execute on function public.trial_start(jsonb) to authenticated;
grant execute on function public.trial_test_begin(text, text, text) to authenticated;
grant execute on function public.trial_test_finish(text, text) to authenticated;

revoke all on function public.trial_tutor_reserve(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.trial_test_lease(uuid, text, text) from public, anon, authenticated;
revoke all on function public.trial_usage_settle(uuid, text, text) from public, anon, authenticated;
revoke all on function public.trial_usage_release(uuid, text, text) from public, anon, authenticated;
grant execute on function public.trial_tutor_reserve(uuid, text, text, text) to service_role;
grant execute on function public.trial_test_lease(uuid, text, text) to service_role;
grant execute on function public.trial_usage_settle(uuid, text, text) to service_role;
grant execute on function public.trial_usage_release(uuid, text, text) to service_role;
revoke all on function public.trial_speaking_session_start(uuid, text) from public, anon, authenticated;
revoke all on function public.trial_speaking_session_release(uuid, text) from public, anon, authenticated;
grant execute on function public.trial_speaking_session_start(uuid, text) to service_role;
revoke all on function public.trial_can_open(uuid, text) from public, anon, authenticated;
grant execute on function public.trial_can_open(uuid, text) to service_role;
grant execute on function public.trial_speaking_session_release(uuid, text) to service_role;

-- ── The trial content (confirmed by Alex, 23 September 2026) ────────────
-- Mirrors TRIAL_OFFER in src/lib/trial/offer.ts; a test fails if they drift.
-- Re-running this file brings an earlier draft's rows up to date.
insert into public.trial_offer_items (item_id, section, kind, enabled) values
  ('lesson:reading-paraphrase',    'reading',   'lesson', true),
  ('lesson:listening-part1',       'listening', 'lesson', true),
  ('lesson:writing-task2-method',  'writing',   'lesson', true),
  ('lesson:speaking-part1',        'speaking',  'lesson', true),
  ('test:reading-full-001',        'reading',   'test',   true),
  ('test:listening-full-001',      'listening', 'test',   true),
  ('test:writing-checker',         'writing',   'test',   true),
  ('test:speaking-test',           'speaking',  'test',   true)
on conflict (item_id) do update
  set section = excluded.section, kind = excluded.kind, enabled = excluded.enabled;

-- ── Rollback (run by hand, never by a script) ───────────────────────────
-- drop function if exists public.trial_can_open(uuid, text);
-- drop function if exists public.trial_speaking_session_release(uuid, text);
-- drop function if exists public.trial_speaking_session_start(uuid, text);
-- drop function if exists public.trial_usage_release(uuid, text, text);
-- drop function if exists public.trial_usage_settle(uuid, text, text);
-- drop function if exists public.trial_test_lease(uuid, text, text);
-- drop function if exists public.trial_tutor_reserve(uuid, text, text, text);
-- drop function if exists public.trial_test_finish(text, text);
-- drop function if exists public.trial_test_begin(text, text, text);
-- drop function if exists public.trial_start(jsonb);
-- drop function if exists public.trial_status();
-- drop function if exists public.trial_state(uuid);
-- drop function if exists public.trial_clean_questionnaire(jsonb);
-- drop table if exists public.trial_usage;
-- drop table if exists public.trial_accounts;
-- drop table if exists public.trial_offer_items;
