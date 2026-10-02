-- Account deletion by the student, immediately (Alex, 2 October 2026:
-- "The account deletion should be in the account tab, we delete all the user
-- data right away when they delete their account").
--
-- One function, delete_my_account(), callable only by a signed-in student
-- and only ever for that student's own account (auth.uid()). It deletes the
-- sign-in from auth.users. Every table that holds the student's data names
-- auth.users with ON DELETE CASCADE, so the same statement removes them all:
--   user_state, student_profiles, learning_events, learning_plan,
--   learning_companions, mr_ez_conversations, mr_ez_messages, mr_ez_turns,
--   mr_ez_recommendations, mr_ez_notes, live_examiner_sessions,
--   admins, trial_accounts, trial_usage, assessment_usage,
--   assessment_provider_usage, access_grants, support_requests.
--
-- The one exception is purchase records. A sole trader must keep sales
-- records for tax, so payment_orders rows stay, but as anonymous sales: the
-- link to the person (user_id, the only personal field the table has) is
-- cleared. Before this file an account with any order could not be deleted
-- at all (payment_orders.user_id was ON DELETE RESTRICT).
--
-- Safe to run on a database that does not have the paid-access tables yet
-- (production on 2 October 2026): those steps are skipped when the table is
-- absent, and the function simply deletes the sign-in.
--
-- Rollback: drop function public.delete_my_account(); and, if the orders
-- step ran, set user_id not null again once no anonymous order exists
-- (anonymous orders must be kept, so in practice keep the column nullable).

do $$
begin
  if to_regclass('public.payment_orders') is not null then
    alter table public.payment_orders alter column user_id drop not null;
    alter table public.payment_orders drop constraint if exists payment_orders_user_id_fkey;
    alter table public.payment_orders add constraint payment_orders_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete set null;
  end if;
end $$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'sign in to delete your account' using errcode = '28000';
  end if;
  -- An access record that came from a purchase points at its order, and the
  -- order stays; the access itself goes with the account.
  if to_regclass('public.access_grants') is not null then
    execute 'delete from public.access_grants where user_id = $1' using me;
  end if;
  delete from auth.users where id = me;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
