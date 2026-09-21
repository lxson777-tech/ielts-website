-- Personal learning build: evidence, plan and companion sync.
--
-- THIS IS A PROPOSAL. It has not been run against the production project.
-- Nobody but the project owner applies it, and only after reading
-- supabase/README.md. Safe to re-run once applied (uses IF NOT EXISTS and
-- idempotent policy/trigger drops, the same convention schema.sql already
-- uses).
--
-- Depends on schema.sql already being applied: it reuses
-- public.touch_user_state_updated_at(), defined there, for one of the three
-- tables below. It does not create, alter or drop user_state,
-- live_examiner_sessions or any mr_ez_* table, and it migrates no existing
-- rows. Those stores keep working exactly as they do today (architecture
-- section 3, "What stays untouched").
--
-- Adds three tables, one per thing that needs to travel between devices and
-- does not already have a home:
--
--   learning_events       the append-only evidence log
--                          (src/lib/learning/contracts/evidence.ts, EvidenceEvent)
--   learning_plan          one row per student's current plan, guarded so a
--                          stale device can never overwrite a newer plan
--                          (src/lib/learning/contracts/plan.ts, PersonalPlanV1)
--   learning_companions     vocabulary review state, notes, preferences and
--                          what Mr EZ remembers, one jsonb document per
--                          (student, kind)
--                          (src/lib/learning/contracts/sync.ts, CompanionSyncPayload)
--
-- ────────────────────────────────────────────────────────────────────────────
-- learning_events
--
-- One row per EvidenceEvent. `event` holds the whole thing as jsonb; the
-- columns beside it are the fields worth indexing or filtering on, not a
-- second source of truth, they are always written together with `event` by
-- the same caller.
--
-- Insert-only for the student: contracts/evidence.ts is explicit that
-- evidence is "APPEND ONLY, MERGE BY ID", corrections are later events
-- (retryOf, supersedes), never a rewrite of an old one. There is
-- deliberately no update or delete policy below. With row level security on
-- and no policy for a command, that command matches zero rows for the
-- anon/authenticated role: a client that tries either gets a normal, empty
-- success, never a way to alter or remove a stored event.
--
-- The primary key IS the idempotency guarantee: re-sending a batch that
-- includes an event the server already has inserts nothing for that row.
-- The browser sync layer gets this by writing with
-- `Prefer: resolution=ignore-duplicates` and `on_conflict=user_id,event_id`
-- (see supabase/README.md for the exact call).
create table if not exists public.learning_events (
  user_id     uuid not null references auth.users (id) on delete cascade,
  event_id    text not null,
  event       jsonb not null,
  occurred_at timestamptz not null,
  activity_id text not null,
  paper       text check (paper is null or paper in ('reading', 'listening', 'writing', 'speaking')),
  mode        text not null check (mode in ('lesson-check', 'practice', 'diagnostic', 'assessment', 'review')),
  created_at  timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists learning_events_user_occurred on public.learning_events (user_id, occurred_at desc);
create index if not exists learning_events_user_activity on public.learning_events (user_id, activity_id);

alter table public.learning_events enable row level security;

drop policy if exists "learning_events select own" on public.learning_events;
drop policy if exists "learning_events insert own" on public.learning_events;

create policy "learning_events select own" on public.learning_events
  for select using (auth.uid() = user_id);

create policy "learning_events insert own" on public.learning_events
  for insert with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- learning_plan
--
-- One row per student. Unlike every other table in this file, `updated_at`
-- is NOT bumped to server time on write: it carries the plan's own
-- `updatedAt` field exactly as the caller sent it, because the conflict rule
-- below reads the plan's own clock, not the moment the request happened to
-- arrive. A slow network write from an hour ago must lose to a plan the
-- student actually edited five minutes ago, whichever one reaches the
-- server first.
--
-- The columns beside `plan` mirror three of its own fields (revision,
-- confirmed, updatedAt). They are not a second source of truth either; a
-- caller writes them alongside `plan` in the same request, and the guard
-- below reads the columns, not the jsonb, because comparing plain columns is
-- what an ordinary trigger can do without parsing jsonb on every write.
create table if not exists public.learning_plan (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  plan       jsonb not null,
  revision   integer not null default 0,
  confirmed  boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.learning_plan enable row level security;

drop policy if exists "learning_plan select own" on public.learning_plan;
drop policy if exists "learning_plan insert own" on public.learning_plan;
drop policy if exists "learning_plan update own" on public.learning_plan;

create policy "learning_plan select own" on public.learning_plan
  for select using (auth.uid() = user_id);

create policy "learning_plan insert own" on public.learning_plan
  for insert with check (auth.uid() = user_id);

create policy "learning_plan update own" on public.learning_plan
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The conflict guard. Row level security says WHO may write; this trigger
-- says WHICH write wins, so a stale device's upsert can never clobber a
-- newer plan however the client phrases the request. This is
-- PLAN_CONFLICT_RULE stated once in src/lib/learning/contracts/sync.ts and
-- repeated here so the two agree by construction, not by two people
-- remembering the same sentence:
--
--   confirmed beats unconfirmed, then the higher revision wins, then the
--   later updatedAt wins on an exact tie.
--
-- The browser writes with an upsert
-- (`on_conflict=user_id`, `Prefer: resolution=merge-duplicates`), which
-- Postgres turns into INSERT ... ON CONFLICT (user_id) DO UPDATE, so every
-- write after the first one fires this BEFORE UPDATE trigger, including the
-- second of two racing writers.
--
-- When the incoming row does not outrank what is stored, NEW is overwritten
-- with OLD's own values, which makes the UPDATE a no-op write: nothing
-- changes, but the UPDATE still succeeds and still runs the RETURNING
-- clause. With `Prefer: return=representation`, that hands the caller back
-- the row that actually won, exactly the one the loser needs to reconcile
-- against, rather than a bare rejection with no way to recover.
create or replace function public.guard_learning_plan_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    return new;
  end if;

  if (new.confirmed and not old.confirmed)
     or (new.confirmed = old.confirmed and new.revision > old.revision)
     or (new.confirmed = old.confirmed and new.revision = old.revision and new.updated_at > old.updated_at)
  then
    return new;
  end if;

  new.plan := old.plan;
  new.revision := old.revision;
  new.confirmed := old.confirmed;
  new.updated_at := old.updated_at;
  return new;
end;
$$;

drop trigger if exists learning_plan_guard on public.learning_plan;
create trigger learning_plan_guard
  before update on public.learning_plan
  for each row execute function public.guard_learning_plan_write();

-- ────────────────────────────────────────────────────────────────────────────
-- learning_companions
--
-- Vocabulary review state, notes and saved lessons, interface preferences,
-- and whatever Mr EZ remembers about a student that is not an assessment
-- record. One jsonb document per (student, kind): 'vocab', 'notes',
-- 'preferences' are the kinds CompanionSyncPayload names today
-- (contracts/sync.ts); the column is free text rather than a fixed enum so a
-- new kind (a memory store for Mr EZ, say) is one additive row shape away
-- and never a migration.
--
-- No conflict guard here, on purpose, unlike learning_plan. The sync
-- contract already resolves the union client-side, by the payload's own
-- natural key, before it is ever pushed (contracts/sync.ts:
-- "All three are union-merged by their own natural key"). What arrives here
-- is already the merged document, so the server only has to hold the latest
-- one: a plain upsert, last write wins, exactly the pattern
-- touch_user_state_updated_at already exists for.
create table if not exists public.learning_companions (
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null,
  data       jsonb not null,
  revision   integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.learning_companions enable row level security;

drop policy if exists "learning_companions select own" on public.learning_companions;
drop policy if exists "learning_companions insert own" on public.learning_companions;
drop policy if exists "learning_companions update own" on public.learning_companions;

create policy "learning_companions select own" on public.learning_companions
  for select using (auth.uid() = user_id);

create policy "learning_companions insert own" on public.learning_companions
  for insert with check (auth.uid() = user_id);

create policy "learning_companions update own" on public.learning_companions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists learning_companions_touch on public.learning_companions;
create trigger learning_companions_touch
  before update on public.learning_companions
  for each row execute function public.touch_user_state_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Rollback (NOT executed by this file, and not run by anyone but the owner).
-- If this needs to come out, run these statements by hand, in this order,
-- after confirming nothing already depends on the data:
--
-- drop trigger if exists learning_companions_touch on public.learning_companions;
-- drop trigger if exists learning_plan_guard on public.learning_plan;
-- drop function if exists public.guard_learning_plan_write();
-- drop table if exists public.learning_companions;
-- drop table if exists public.learning_plan;
-- drop table if exists public.learning_events;
--
-- None of this touches user_state, live_examiner_sessions or any mr_ez_*
-- table: this migration never referenced them, and dropping these three new
-- tables cannot cascade into anything this file did not create.
