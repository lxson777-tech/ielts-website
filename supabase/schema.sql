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
