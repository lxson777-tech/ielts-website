-- IELTS Portal — account sync schema.
-- Run this once in your Supabase project: SQL Editor → paste → Run.
-- Safe to re-run (uses IF NOT EXISTS / idempotent policy drops).
--
-- Model: one row per user holding the whole client-side state as JSONB — the
-- same `ielts.progress.v1` blob the site already keeps in localStorage, plus
-- the study plan. This mirrors localStorage 1:1 so sync is a straight
-- pull/merge/push with no per-field schema to keep in step with the frontend.
-- Row-Level Security guarantees a signed-in user can only ever touch their own
-- row; the anon key shipped in the browser can do nothing else.

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  progress   jsonb not null default '{}'::jsonb,   -- ProgressV1 blob
  study_plan jsonb,                                 -- SavedPlan blob, or null
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- Idempotent: drop then recreate so re-running the script never errors.
drop policy if exists "user_state select own" on public.user_state;
drop policy if exists "user_state insert own" on public.user_state;
drop policy if exists "user_state update own" on public.user_state;

create policy "user_state select own" on public.user_state
  for select using (auth.uid() = user_id);

create policy "user_state insert own" on public.user_state
  for insert with check (auth.uid() = user_id);

create policy "user_state update own" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep updated_at honest on every write (used for last-write-wins on the plan).
create or replace function public.touch_user_state_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch
  before update on public.user_state
  for each row execute function public.touch_user_state_updated_at();

-- Live examiner (paid GPT-Live sessions): one row per session, written only by
-- the live-examiner Worker with the service role key. Used for per-student and
-- site-wide limits and for validating stage directions. No client policies:
-- RLS is on and nothing is granted, so the anon key can neither read nor write.
create table if not exists public.live_examiner_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  provider            text not null,
  mode                text not null,
  provider_session_id text unique,
  stage               text not null default 'created',
  created_at          timestamptz not null default now(),
  ended_at            timestamptz,
  last_cue_at         timestamptz
);
alter table public.live_examiner_sessions enable row level security;
create index if not exists live_examiner_sessions_user_created on public.live_examiner_sessions (user_id, created_at desc);
create index if not exists live_examiner_sessions_created on public.live_examiner_sessions (created_at desc);

-- The Worker needs SUPABASE_URL and the service_role key as Worker secrets
-- (npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY from workers/live-examiner)
-- to read and write this table. Never put the service role key in the site
-- itself, it bypasses Row-Level Security entirely and must stay server-side.

-- ────────────────────────────────────────────────────────────────────────────
-- Mr EZ, the AI tutor (workers/mr-ez).
--
-- Access model, deliberately mixed:
--   * WRITES are Worker-only (service role). The browser must never be able to
--     invent a tutor message, forge a usage row, or fabricate a summary — all
--     three would let a modified client put words in Mr EZ's mouth or dodge a
--     spending limit.
--   * READS and DELETES of a student's own conversation ARE granted to the
--     browser under RLS, so the panel can restore a conversation without a
--     paid round trip, and "clear my history" is a direct, immediate delete
--     rather than a request the student has to trust us to honour.
--
-- Separation of memory, which the product depends on: assessment records live
-- in `user_state.progress` and are NOT touched by any of this. Clearing the
-- conversation removes what Mr EZ was told and what he said, including the
-- rolling summary and any cached welcome text. It does not remove a single
-- band, essay or test attempt.

create table if not exists public.mr_ez_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- Rolling précis of the turns that have fallen out of the live window, so a
  -- long conversation costs a roughly constant amount per turn instead of
  -- re-sending its whole history forever. Dropped with the conversation.
  summary     text,
  -- How many turns the summary already covers, so the Worker knows when it is
  -- worth paying to refresh it.
  summarised_turns integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.mr_ez_conversations enable row level security;
create index if not exists mr_ez_conversations_user on public.mr_ez_conversations (user_id, updated_at desc);

create table if not exists public.mr_ez_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.mr_ez_conversations (id) on delete cascade,
  -- Denormalised on purpose: it makes the RLS policy a single-column check
  -- with no join, which is both faster and much harder to get subtly wrong.
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null check (role in ('student', 'tutor')),
  content         text not null,
  created_at      timestamptz not null default now()
);
alter table public.mr_ez_messages enable row level security;
create index if not exists mr_ez_messages_conversation on public.mr_ez_messages (conversation_id, created_at);

-- One row per billable tutor turn: what it cost, and the reply itself so a
-- duplicate request (double click, retry after a timeout) replays the stored
-- answer instead of paying for a second one.
create table if not exists public.mr_ez_turns (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  conversation_id     uuid references public.mr_ez_conversations (id) on delete set null,
  task                text not null,
  model               text not null,
  input_tokens        integer not null default 0,
  cached_input_tokens integer not null default 0,
  output_tokens       integer not null default 0,
  cost_usd            numeric(12, 6) not null default 0,
  idempotency_key     text,
  reply               jsonb,
  created_at          timestamptz not null default now()
);
alter table public.mr_ez_turns enable row level security;
create index if not exists mr_ez_turns_user_created on public.mr_ez_turns (user_id, created_at desc);
create index if not exists mr_ez_turns_created on public.mr_ez_turns (created_at desc);
-- The repeat-send guard. A unique index rather than application logic, so two
-- requests racing in different Worker instances cannot both win.
create unique index if not exists mr_ez_turns_idem on public.mr_ez_turns (user_id, idempotency_key)
  where idempotency_key is not null;

-- The dashboard welcome, kept until the student's record actually changes.
-- `fingerprint` is a hash of everything the recommendation depends on (see
-- insightsFingerprint in src/lib/tutor/insights.ts): same fingerprint means
-- the same advice is still correct, so opening the dashboard again costs
-- nothing.
create table if not exists public.mr_ez_recommendations (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  fingerprint text not null,
  reply       jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.mr_ez_recommendations enable row level security;

-- Client policies: read and delete your own, never insert or update. Dropped
-- first so re-running this file is safe.
drop policy if exists "mr_ez_conversations select own" on public.mr_ez_conversations;
drop policy if exists "mr_ez_conversations delete own" on public.mr_ez_conversations;
drop policy if exists "mr_ez_messages select own" on public.mr_ez_messages;
drop policy if exists "mr_ez_messages delete own" on public.mr_ez_messages;
drop policy if exists "mr_ez_recommendations select own" on public.mr_ez_recommendations;
drop policy if exists "mr_ez_recommendations delete own" on public.mr_ez_recommendations;

create policy "mr_ez_conversations select own" on public.mr_ez_conversations
  for select using (auth.uid() = user_id);
create policy "mr_ez_conversations delete own" on public.mr_ez_conversations
  for delete using (auth.uid() = user_id);

create policy "mr_ez_messages select own" on public.mr_ez_messages
  for select using (auth.uid() = user_id);
create policy "mr_ez_messages delete own" on public.mr_ez_messages
  for delete using (auth.uid() = user_id);

create policy "mr_ez_recommendations select own" on public.mr_ez_recommendations
  for select using (auth.uid() = user_id);
create policy "mr_ez_recommendations delete own" on public.mr_ez_recommendations
  for delete using (auth.uid() = user_id);

-- `mr_ez_turns` is where the spending limit is counted, so a student must not
-- be able to delete or edit those rows: doing so would reset their own cap.
-- But the row also carries `reply`, a short-lived copy of Mr EZ's answer kept
-- only so a double-click or a retry replays it instead of paying twice. That
-- copy is conversation content, and "clear my history" has to mean it goes.
--
-- The resolution is a COLUMN-scoped grant: an authenticated student may update
-- exactly one column, `reply`, and only on their own rows. The counters, the
-- cost, the task and the timestamps are not grantable through this and stay
-- ours. Postgres enforces the column list, so this cannot be widened by a
-- cleverly-worded request.
--
-- The Worker also only ever replays a reply written in the last few minutes
-- (see IDEMPOTENCY_WINDOW_MS in workers/mr-ez/src/index.ts), so a nulled or
-- stale reply is simply a cache miss, never a broken request.
revoke update on public.mr_ez_turns from authenticated;
grant update (reply) on public.mr_ez_turns to authenticated;

drop policy if exists "mr_ez_turns clear own reply" on public.mr_ez_turns;
create policy "mr_ez_turns clear own reply" on public.mr_ez_turns
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists mr_ez_conversations_touch on public.mr_ez_conversations;
create trigger mr_ez_conversations_touch
  before update on public.mr_ez_conversations
  for each row execute function public.touch_user_state_updated_at();

drop trigger if exists mr_ez_recommendations_touch on public.mr_ez_recommendations;
create trigger mr_ez_recommendations_touch
  before update on public.mr_ez_recommendations
  for each row execute function public.touch_user_state_updated_at();
