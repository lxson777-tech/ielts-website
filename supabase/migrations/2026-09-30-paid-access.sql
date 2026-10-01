-- Paid access: orders, confirmed payments and the access they grant.
--
-- PROPOSAL, NOT APPLIED to any real Supabase project. Written 29 September
-- 2026 for the audit remediation (docs/paid-access/CONTRACT.md, finding F01
-- of docs/audits/combined-paid-platform-2026-09-29/REPORT.md) and tested
-- only against a local in-memory Postgres (PGlite) through
-- tests/paid-sql.test.ts, tests/paid-worker.test.ts, tests/paid-gates.test.ts
-- and the local stand-in tools/mr-ez-dev-server.mjs --trial. Nobody but Alex
-- applies it.
--
-- Runs AFTER supabase/migrations/2026-09-23-trial.sql: it redefines two of
-- that file's functions (trial_state and trial_can_open) to know about paid
-- access. Idempotent: running it twice changes nothing. Migrates no existing
-- row and touches no other table's data.
--
-- WHAT IT ENFORCES
--   - The price of a plan lives here (access_plans), mirrored by PAID_PLANS in
--     src/lib/access/plans.ts; tests/paid-sql.test.ts fails if they drift. An
--     order is created at the server's price for the signed-in student. The
--     browser never names a price and never names a user.
--   - Paid access exists only as a GRANT, and a grant is written only when the
--     payments Worker (workers/payments, service role) reports a payment the
--     provider confirmed, for the order's exact amount and currency. One grant
--     per order, however many times the confirmation is replayed.
--   - A failed or cancelled payment never touches a paid order. A refund
--     revokes that order's grant at once, and pulls any grant bought after it
--     back so the student's remaining paid time has no gap.
--   - Buying again while access is running extends it: the new grant starts
--     when the current one ends.
--   - While a grant is running, trial_can_open opens every lesson, test,
--     practice set, Writing question, model answer and pack. When paid access
--     ends, the trial's own rules apply again exactly as before, and nothing
--     the student saved is touched.
--
-- WHO CAN DO WHAT
--   - The browser (role `authenticated`) can read its own orders and grants,
--     create an order for a plan and read one of its own orders. It cannot
--     insert, update or delete any row, and cannot mark anything paid.
--   - The payments Worker (service role) moves an order through pending,
--     paid, failed, cancelled and refunded.
--   - `anon` can read the public price list and nothing else.
--
-- Deleting a sign-in that has payment records is REFUSED (on delete
-- restrict) until Alex decides how long payment records are kept.

-- ── The plans and their prices ──────────────────────────────────────────
create table if not exists public.access_plans (
  id       text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  days     int not null check (days between 1 and 400),
  amount   int not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  enabled  boolean not null default true
);

alter table public.access_plans enable row level security;

drop policy if exists "access_plans readable" on public.access_plans;
create policy "access_plans readable" on public.access_plans
  for select to anon, authenticated using (true);

-- ── Orders ──────────────────────────────────────────────────────────────
create table if not exists public.payment_orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete restrict,
  plan_id        text not null references public.access_plans (id),
  -- The price when the order was made, in the currency's smallest whole
  -- unit the plan is sold in (tenge). A confirmation must match it exactly.
  amount         int not null check (amount > 0),
  currency       text not null check (currency ~ '^[A-Z]{3}$'),
  provider       text check (provider ~ '^[a-z0-9-]{2,40}$'),
  -- The provider's own id for this payment. Unique, so one provider payment
  -- can never pay for two orders.
  provider_ref   text unique check (provider_ref ~ '^[A-Za-z0-9_.:-]{4,200}$'),
  status         text not null default 'created'
                 check (status in ('created', 'pending', 'paid', 'failed', 'cancelled', 'refunded')),
  failure_reason text check (char_length(failure_reason) <= 200),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  paid_at        timestamptz,
  refunded_at    timestamptz,
  receipt_number text unique
);

create index if not exists payment_orders_by_user on public.payment_orders (user_id, created_at desc);

alter table public.payment_orders enable row level security;

drop policy if exists "payment_orders select own" on public.payment_orders;
create policy "payment_orders select own" on public.payment_orders
  for select to authenticated using (auth.uid() = user_id);

-- Receipt numbers: the year and a running number, e.g. 2026-000001.
create sequence if not exists public.payment_receipt_seq;

-- ── Grants: the paid access itself ──────────────────────────────────────
create table if not exists public.access_grants (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete restrict,
  order_id   uuid not null unique references public.payment_orders (id) on delete restrict,
  plan_id    text not null references public.access_plans (id),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint access_grants_order check (ends_at > starts_at)
);

create index if not exists access_grants_by_user on public.access_grants (user_id, ends_at);

alter table public.access_grants enable row level security;

drop policy if exists "access_grants select own" on public.access_grants;
create policy "access_grants select own" on public.access_grants
  for select to authenticated using (auth.uid() = user_id);

-- No insert, update or delete policy on any of the three tables, and the
-- table privileges are withdrawn as well. Every write goes through the
-- functions below.
revoke insert, update, delete, truncate on public.access_plans from anon, authenticated;
revoke insert, update, delete, truncate on public.payment_orders from anon, authenticated;
revoke insert, update, delete, truncate on public.access_grants from anon, authenticated;
revoke all on sequence public.payment_receipt_seq from anon, authenticated;

-- ── Helpers (not callable by anyone but their owner) ────────────────────

-- When the account's running paid access ends, or null when none is
-- running right now.
create or replace function public.access_paid_until(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select max(ends_at) from public.access_grants
   where user_id = p_user and revoked_at is null and starts_at <= now() and ends_at > now()
$$;

-- The paid part of trial_state: null, or the unrevoked grants taken
-- together (the plan of the grant that ends last, the earliest start still
-- counting, the latest end). Also answers after paid access ended, so the
-- site can say "your paid access ended on ...".
create or replace function public.access_paid_state(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  last_grant public.access_grants;
  first_start timestamptz;
begin
  select * into last_grant from public.access_grants
    where user_id = p_user and revoked_at is null
    order by ends_at desc
    limit 1;
  if not found then
    return null;
  end if;
  select min(starts_at) into first_start from public.access_grants
    where user_id = p_user and revoked_at is null and ends_at > now();
  return jsonb_build_object(
    'planId', last_grant.plan_id,
    'startsAt', coalesce(first_start, last_grant.starts_at),
    'endsAt', last_grant.ends_at);
end
$$;

-- The one read model of an order the student and the Worker get back.
create or replace function public.access_order_json(o public.payment_orders)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'orderId', o.id,
    'planId', o.plan_id,
    'amount', o.amount,
    'currency', o.currency,
    'provider', o.provider,
    'status', o.status,
    'createdAt', o.created_at,
    'paidAt', o.paid_at,
    'refundedAt', o.refunded_at,
    'receiptNumber', o.receipt_number,
    'grant', (select jsonb_build_object('startsAt', g.starts_at, 'endsAt', g.ends_at, 'revokedAt', g.revoked_at)
                from public.access_grants g where g.order_id = o.id))
$$;

-- ── trial_state and trial_can_open, now paid-aware ──────────────────────
-- Identical to 2026-09-23-trial.sql except for the `paid` key (trial_state)
-- and the paid-first rule (trial_can_open).

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
      'paid', public.access_paid_state(p_user),
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
    'paid', public.access_paid_state(p_user),
    'questionnaire', t.questionnaire,
    'limits', jsonb_build_object('hours', 72, 'testsPerSection', 1, 'tutorPerSection', 5),
    'sections', sections);
end
$$;

-- p_item is 'lesson:<key>', 'test:<id>', 'practice:<id>', 'pack:<name>',
-- 'writing-prompt:<id>' or 'writing-model:<id>'.
--   ok      a running paid grant opens every one of them; otherwise, exactly
--           as the trial file: the trial's own lesson and test while the
--           trial runs, and a test the student has begun, at any time
--   reason  trial-required | trial-ended | not-included
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
  -- Paid first: while a grant runs, the account opens everything.
  if v_kind in ('lesson', 'test', 'practice', 'pack', 'writing-prompt', 'writing-model')
     and v_id ~ '^[a-z0-9][a-z0-9-]{0,99}$'
     and public.access_paid_until(p_user) is not null then
    return jsonb_build_object('ok', true, 'paid', true);
  end if;

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

-- ── Called by the browser, as the signed-in student ─────────────────────

-- Creates an order for the caller at the plan's server-side price.
--   ok      {orderId, planId, amount, currency, days}
--   reason  plan-unavailable | too-many-open-orders
-- At most ten unpaid orders in the last hour, so the table cannot be
-- flooded; a real checkout needs one.
create or replace function public.access_order_create(p_plan text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  plan public.access_plans;
  open_orders int;
  new_id uuid;
begin
  if uid is null then
    raise exception 'sign in required' using errcode = '28000';
  end if;
  select * into plan from public.access_plans where id = p_plan and enabled;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'plan-unavailable');
  end if;
  perform pg_advisory_xact_lock(hashtext('access:' || uid::text));
  select count(*) into open_orders from public.payment_orders
    where user_id = uid and status in ('created', 'pending') and created_at > now() - interval '1 hour';
  if open_orders >= 10 then
    return jsonb_build_object('ok', false, 'reason', 'too-many-open-orders');
  end if;
  insert into public.payment_orders (user_id, plan_id, amount, currency)
    values (uid, plan.id, plan.amount, plan.currency)
    returning id into new_id;
  return jsonb_build_object('ok', true, 'orderId', new_id, 'planId', plan.id,
    'amount', plan.amount, 'currency', plan.currency, 'days', plan.days);
end
$$;

-- The caller's orders, newest first, each with its grant: purchase history
-- and receipts.
create or replace function public.access_orders()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'sign in required' using errcode = '28000';
  end if;
  return coalesce(
    (select jsonb_agg(public.access_order_json(o) order by o.created_at desc)
       from public.payment_orders o where o.user_id = uid),
    '[]'::jsonb);
end
$$;

-- One of the caller's own orders, or null (someone else's order is null
-- too, so an order id reveals nothing about another account).
create or replace function public.access_order(p_order uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  o public.payment_orders;
begin
  if uid is null then
    raise exception 'sign in required' using errcode = '28000';
  end if;
  select * into o from public.payment_orders where id = p_order and user_id = uid;
  if not found then
    return null;
  end if;
  return public.access_order_json(o);
end
$$;

-- ── Called by the payments Worker only (service role) ───────────────────

-- The checkout was opened with the provider.
--   reason  not-found | not-open (already paid, failed, cancelled or
--           refunded) | ref-in-use | plan-unavailable (the plan was
--           paused after the order was made)
create or replace function public.access_order_mark_pending(p_order uuid, p_provider text, p_ref text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  o public.payment_orders;
begin
  select * into o from public.payment_orders where id = p_order for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not-found');
  end if;
  if o.status not in ('created', 'pending') then
    return jsonb_build_object('ok', false, 'reason', 'not-open', 'status', o.status);
  end if;
  if not exists (select 1 from public.access_plans where id = o.plan_id and enabled) then
    return jsonb_build_object('ok', false, 'reason', 'plan-unavailable');
  end if;
  if p_ref is not null and exists (
    select 1 from public.payment_orders where provider_ref = p_ref and id <> p_order) then
    return jsonb_build_object('ok', false, 'reason', 'ref-in-use');
  end if;
  update public.payment_orders
    set status = 'pending', provider = p_provider, provider_ref = coalesce(p_ref, provider_ref), updated_at = now()
    where id = p_order;
  return jsonb_build_object('ok', true, 'status', 'pending');
end
$$;

-- The provider confirmed the payment. Idempotent: a replayed confirmation
-- returns the same answer and never a second grant.
--   ok      {status: 'paid', replay, receiptNumber, grant: {startsAt, endsAt}}
--   reason  not-found | amount-mismatch | provider-mismatch | ref-mismatch |
--           ref-in-use | refunded | plan-unavailable
-- A plan that is no longer on sale is never granted (review P2-11): the
-- confirmation is refused and changes nothing, so the payment shows in the
-- provider's log as refused and is refunded by hand. A replay of an order
-- that was already paid still answers paid.
create or replace function public.access_order_paid(
  p_order uuid, p_provider text, p_ref text, p_amount int, p_currency text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  o public.payment_orders;
  plan public.access_plans;
  chain_end timestamptz;
  g_start timestamptz;
  g public.access_grants;
begin
  select * into o from public.payment_orders where id = p_order for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not-found');
  end if;
  -- Serialise every grant decision for this student.
  perform pg_advisory_xact_lock(hashtext('access:' || o.user_id::text));

  if o.provider is not null and o.provider <> p_provider then
    return jsonb_build_object('ok', false, 'reason', 'provider-mismatch');
  end if;
  if o.provider_ref is not null and p_ref is distinct from o.provider_ref then
    return jsonb_build_object('ok', false, 'reason', 'ref-mismatch');
  end if;
  if p_amount is distinct from o.amount or p_currency is distinct from o.currency then
    return jsonb_build_object('ok', false, 'reason', 'amount-mismatch');
  end if;
  if o.status = 'refunded' then
    return jsonb_build_object('ok', false, 'reason', 'refunded');
  end if;
  if o.status = 'paid' then
    select * into g from public.access_grants where order_id = o.id;
    return jsonb_build_object('ok', true, 'replay', true, 'status', 'paid', 'receiptNumber', o.receipt_number,
      'grant', jsonb_build_object('startsAt', g.starts_at, 'endsAt', g.ends_at));
  end if;
  if p_ref is not null and exists (
    select 1 from public.payment_orders where provider_ref = p_ref and id <> o.id) then
    return jsonb_build_object('ok', false, 'reason', 'ref-in-use');
  end if;

  -- created, pending, and also failed or cancelled: money the provider
  -- confirms taking is honoured, even after an earlier failed attempt, as
  -- long as the plan is still on sale.
  select * into plan from public.access_plans where id = o.plan_id;
  if not found or not plan.enabled then
    return jsonb_build_object('ok', false, 'reason', 'plan-unavailable');
  end if;
  select max(ends_at) into chain_end from public.access_grants
    where user_id = o.user_id and revoked_at is null;
  g_start := greatest(now(), coalesce(chain_end, now()));

  update public.payment_orders
    set status = 'paid', provider = p_provider, provider_ref = coalesce(p_ref, provider_ref),
        paid_at = now(), updated_at = now(), failure_reason = null,
        receipt_number = to_char(now(), 'YYYY') || '-' || lpad(nextval('public.payment_receipt_seq')::text, 6, '0')
    where id = o.id
    returning * into o;
  insert into public.access_grants (user_id, order_id, plan_id, starts_at, ends_at)
    values (o.user_id, o.id, o.plan_id, g_start, g_start + make_interval(days => plan.days))
    returning * into g;
  return jsonb_build_object('ok', true, 'replay', false, 'status', 'paid', 'receiptNumber', o.receipt_number,
    'grant', jsonb_build_object('startsAt', g.starts_at, 'endsAt', g.ends_at));
end
$$;

-- The payment failed or was cancelled. p_reason 'cancelled' records
-- cancelled; anything else records failed, with the reason kept (trimmed).
-- A paid or refunded order is never touched: the answer says so.
create or replace function public.access_order_failed(p_order uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  o public.payment_orders;
  v_status text := case when p_reason = 'cancelled' then 'cancelled' else 'failed' end;
begin
  select * into o from public.payment_orders where id = p_order for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not-found');
  end if;
  if o.status in ('paid', 'refunded') then
    return jsonb_build_object('ok', true, 'unchanged', true, 'status', o.status);
  end if;
  update public.payment_orders
    set status = v_status, failure_reason = left(coalesce(p_reason, v_status), 200), updated_at = now()
    where id = p_order;
  return jsonb_build_object('ok', true, 'unchanged', false, 'status', v_status);
end
$$;

-- The provider refunded the payment. Revokes that order's grant now, and
-- pulls every grant bought after it back by the time it no longer covers,
-- so the student's remaining paid time has no gap. Idempotent.
--   reason  not-found | not-paid | ref-mismatch
create or replace function public.access_order_refunded(p_order uuid, p_provider_ref text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  o public.payment_orders;
  g public.access_grants;
  unused interval;
begin
  select * into o from public.payment_orders where id = p_order for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not-found');
  end if;
  perform pg_advisory_xact_lock(hashtext('access:' || o.user_id::text));
  if o.provider_ref is not null and p_provider_ref is not null and p_provider_ref <> o.provider_ref then
    return jsonb_build_object('ok', false, 'reason', 'ref-mismatch');
  end if;
  if o.status = 'refunded' then
    return jsonb_build_object('ok', true, 'replay', true, 'status', 'refunded');
  end if;
  if o.status <> 'paid' then
    return jsonb_build_object('ok', false, 'reason', 'not-paid', 'status', o.status);
  end if;

  update public.payment_orders
    set status = 'refunded', refunded_at = now(), updated_at = now()
    where id = o.id;
  select * into g from public.access_grants where order_id = o.id for update;
  if found and g.revoked_at is null then
    update public.access_grants set revoked_at = now() where id = g.id;
    -- What the revoked grant still covered: all of it if it had not begun,
    -- the rest of it if it was running, nothing if it had already ended.
    unused := greatest(interval '0', g.ends_at - greatest(now(), g.starts_at));
    if unused > interval '0' then
      update public.access_grants
        set starts_at = starts_at - unused, ends_at = ends_at - unused
        where user_id = o.user_id and revoked_at is null and starts_at >= g.ends_at;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'replay', false, 'status', 'refunded');
end
$$;

-- For the Workers: is paid access running for this account right now?
--   {paid: true, endsAt} or {paid: false}
create or replace function public.access_paid_now(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_until timestamptz := public.access_paid_until(p_user);
begin
  if v_until is null then
    return jsonb_build_object('paid', false);
  end if;
  return jsonb_build_object('paid', true, 'endsAt', v_until);
end
$$;

-- ── Who may call what ───────────────────────────────────────────────────
-- Supabase grants EXECUTE on new public functions to anon and authenticated
-- by default, so every grant here is preceded by an explicit revoke.

revoke all on function public.access_paid_until(uuid) from public, anon, authenticated;
revoke all on function public.access_paid_state(uuid) from public, anon, authenticated;
revoke all on function public.access_order_json(public.payment_orders) from public, anon, authenticated;

-- Redefined above; the grants are restated so this file stands on its own.
revoke all on function public.trial_state(uuid) from public, anon, authenticated;
revoke all on function public.trial_can_open(uuid, text) from public, anon, authenticated;
grant execute on function public.trial_can_open(uuid, text) to service_role;

revoke all on function public.access_order_create(text) from public, anon;
revoke all on function public.access_orders() from public, anon;
revoke all on function public.access_order(uuid) from public, anon;
grant execute on function public.access_order_create(text) to authenticated;
grant execute on function public.access_orders() to authenticated;
grant execute on function public.access_order(uuid) to authenticated;

revoke all on function public.access_order_mark_pending(uuid, text, text) from public, anon, authenticated;
revoke all on function public.access_order_paid(uuid, text, text, int, text) from public, anon, authenticated;
revoke all on function public.access_order_failed(uuid, text) from public, anon, authenticated;
revoke all on function public.access_order_refunded(uuid, text) from public, anon, authenticated;
revoke all on function public.access_paid_now(uuid) from public, anon, authenticated;
grant execute on function public.access_order_mark_pending(uuid, text, text) to service_role;
grant execute on function public.access_order_paid(uuid, text, text, int, text) to service_role;
grant execute on function public.access_order_failed(uuid, text) to service_role;
grant execute on function public.access_order_refunded(uuid, text) to service_role;
grant execute on function public.access_paid_now(uuid) to service_role;

-- ── The plans (the approved offer, 30 September 2026) ───────────────────
-- Mirrors PAID_PLANS in src/lib/access/plans.ts; a test fails if they drift.
-- 12,990 KZT for 30 days. The 90-day plan is paused for new orders and kept
-- only so its historical orders and receipts still read correctly.
-- Re-running this file (or 2026-09-30-profitable-offer.sql) keeps exactly
-- these rows: it never brings back an earlier draft's price (review P1-1,
-- 1 October 2026). An order keeps the price it was made at.
insert into public.access_plans (id, days, amount, currency, enabled) values
  ('month-1', 30, 12990, 'KZT', true),
  ('month-3', 90, 25000, 'KZT', false)
on conflict (id) do update
  set days = excluded.days, amount = excluded.amount, currency = excluded.currency, enabled = excluded.enabled;

-- ── Rollback (run by hand, never by a script) ───────────────────────────
-- Payment records are money records: export them before dropping anything.
-- First re-run supabase/migrations/2026-09-23-trial.sql, which restores its
-- own trial_state and trial_can_open (they stop calling the helpers below),
-- then run these.
-- drop function if exists public.access_paid_now(uuid);
-- drop function if exists public.access_order_refunded(uuid, text);
-- drop function if exists public.access_order_failed(uuid, text);
-- drop function if exists public.access_order_paid(uuid, text, text, int, text);
-- drop function if exists public.access_order_mark_pending(uuid, text, text);
-- drop function if exists public.access_order(uuid);
-- drop function if exists public.access_orders();
-- drop function if exists public.access_order_create(text);
-- drop function if exists public.access_order_json(public.payment_orders);
-- drop function if exists public.access_paid_state(uuid);
-- drop function if exists public.access_paid_until(uuid);
-- drop table if exists public.access_grants;
-- drop table if exists public.payment_orders;
-- drop sequence if exists public.payment_receipt_seq;
-- drop table if exists public.access_plans;
