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
