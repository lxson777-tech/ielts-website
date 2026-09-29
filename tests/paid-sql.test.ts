/* Paid access, run for real: supabase/migrations/2026-09-30-paid-access.sql
 * applied after the trial migration to an in-memory Postgres (PGlite) with
 * Supabase's roles, grants and auth.uid() (tools/trial-db.mjs). Every
 * assertion is the database itself deciding.
 *
 * The migration is a PROPOSAL, not applied to any real project.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/paid-sql.test.ts
 *
 * Every account is a synthetic uuid in a fresh database per test.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTrialDb, PAID_MIGRATION } from '../tools/trial-db.mjs';
import { PAID_PLANS, parsePaymentOrder } from '../src/lib/access/plans.ts';
import { FULL_ACCESS_PRICES_KZT } from '../src/lib/trial/offer.ts';
import { hasPaidAccess, paidAccessEnded, parseTrialStatus } from '../src/lib/trial/status.ts';

const A = 'aaaaaaaa-5555-4555-8555-aaaaaaaaaaaa';
const B = 'bbbbbbbb-6666-4666-8666-bbbbbbbbbbbb';
const asA = { userId: A };
const asB = { userId: B };
const service = { role: 'service_role' as const };
const DAY = 86_400_000;
/** PGlite hands timestamps back as Date objects, jsonb as strings. */
const ms = (value: unknown) => new Date(value as string).getTime();

type Db = Awaited<ReturnType<typeof createTrialDb>>;

async function world(): Promise<Db> {
  const db = await createTrialDb();
  await db.addUser(A, 'paid-a@example.test');
  await db.addUser(B, 'paid-b@example.test');
  return db;
}

async function order(db: Db, plan = 'month-1', as = asA) {
  const created = (await db.rpc('access_order_create', { p_plan: plan }, as)) as Record<string, unknown>;
  assert.equal(created.ok, true, JSON.stringify(created));
  return created as { orderId: string; amount: number; currency: string; planId: string; days: number };
}

async function pending(db: Db, orderId: string, ref = `sim_${orderId.replace(/-/g, '')}`) {
  return db.rpc('access_order_mark_pending', { p_order: orderId, p_provider: 'simulated', p_ref: ref }, service);
}

async function pay(db: Db, o: { orderId: string; amount: number; currency: string }, overrides: Record<string, unknown> = {}) {
  return (await db.rpc(
    'access_order_paid',
    {
      p_order: o.orderId,
      p_provider: 'simulated',
      p_ref: `sim_${o.orderId.replace(/-/g, '')}`,
      p_amount: o.amount,
      p_currency: o.currency,
      ...overrides,
    },
    service,
  )) as Record<string, unknown>;
}

async function buy(db: Db, plan = 'month-1', as = asA) {
  const o = await order(db, plan, as);
  await pending(db, o.orderId);
  const paid = await pay(db, o);
  assert.equal(paid.ok, true, JSON.stringify(paid));
  return { ...o, paid };
}

async function grants(db: Db, user = A) {
  return db.select(
    'select order_id, plan_id, starts_at, ends_at, revoked_at from public.access_grants where user_id = $1 order by starts_at',
    [user],
    service,
  );
}

async function status(db: Db, user = A) {
  return parseTrialStatus(await db.rpc('trial_state', { p_user: user }, service))!;
}

async function canOpen(db: Db, item: string, user = A) {
  return (await db.rpc('trial_can_open', { p_user: user, p_item: item }, service)) as Record<string, unknown>;
}

/* ── The plans agree with the site ───────────────────────────────────── */

test('the plans in the database are exactly PAID_PLANS, at the approved prices', async () => {
  const db = await world();
  const rows = await db.select('select id, days, amount, currency, enabled from public.access_plans order by id', [], { role: 'anon' });
  assert.deepEqual(
    rows,
    PAID_PLANS.map((p) => ({ id: p.id, days: p.days, amount: p.amount, currency: p.currency, enabled: true })),
  );
  assert.equal(PAID_PLANS[0]!.amount, FULL_ACCESS_PRICES_KZT.oneMonth);
  assert.equal(PAID_PLANS[1]!.amount, FULL_ACCESS_PRICES_KZT.threeMonths);
  const sql = readFileSync(PAID_MIGRATION, 'utf8');
  for (const p of PAID_PLANS) assert.match(sql, new RegExp(`\\('${p.id}', ${p.days}, ${p.amount}, '${p.currency}', true\\)`));
  await db.close();
});

test('the migration is idempotent: running it again changes nothing and keeps every order', async () => {
  const db = await world();
  const first = await buy(db);
  await db.raw.exec(readFileSync(PAID_MIGRATION, 'utf8'));
  const orders = await db.select('select id, status from public.payment_orders', [], service);
  assert.deepEqual(orders, [{ id: first.orderId, status: 'paid' }]);
  assert.equal((await grants(db)).length, 1);
  assert.equal(hasPaidAccess(await status(db), Date.now()), true);
  await db.close();
});

/* ── Orders are made at the server's price, for the caller only ───────── */

test('an order is created at the plan\'s server-side price, for the signed-in student only', async () => {
  const db = await world();
  const o = await order(db, 'month-3');
  assert.equal(o.amount, 25000);
  assert.equal(o.currency, 'KZT');
  assert.equal(o.days, 90);
  const row = (await db.select('select user_id, amount, currency, status from public.payment_orders', [], service))[0];
  assert.deepEqual(row, { user_id: A, amount: 25000, currency: 'KZT', status: 'created' });
  // No parameter can name a price or a user: the function takes a plan id.
  await assert.rejects(db.rpc('access_order_create', { p_plan: 'month-1', p_amount: 1 }, asA));
  await assert.rejects(db.rpc('access_order_create', { p_plan: 'month-1', p_user: B }, asA));
  assert.deepEqual(await db.rpc('access_order_create', { p_plan: 'month-12' }, asA), { ok: false, reason: 'plan-unavailable' });
  await assert.rejects(db.rpc('access_order_create', { p_plan: 'month-1' }, { role: 'anon' }), /sign in required|permission denied/);
  await db.close();
});

test('unfinished orders are capped at ten an hour', async () => {
  const db = await world();
  for (let i = 0; i < 10; i++) await order(db);
  assert.deepEqual(await db.rpc('access_order_create', { p_plan: 'month-1' }, asA), { ok: false, reason: 'too-many-open-orders' });
  // Another student is not affected.
  await order(db, 'month-1', asB);
  await db.close();
});

/* ── Nobody reaches another student's orders or the service functions ─── */

test('a student cannot read or write another student\'s orders or grants, or call a service function', async () => {
  const db = await world();
  const mine = await buy(db);
  await buy(db, 'month-1', asB);

  assert.equal((await db.select('select id from public.payment_orders', [], asA)).length, 1);
  assert.equal((await db.select('select order_id from public.access_grants', [], asA)).length, 1);
  assert.equal((await db.select('select id from public.payment_orders', [], asB)).length, 1);
  assert.equal((await db.select('select id from public.payment_orders', [], { role: 'anon' })).length, 0);
  assert.equal((await db.rpc('access_orders', {}, asA) as unknown[]).length, 1);
  assert.equal(await db.rpc('access_order', { p_order: mine.orderId }, asB), null, 'someone else\'s order is null');
  assert.equal(parsePaymentOrder(await db.rpc('access_order', { p_order: mine.orderId }, asA))?.status, 'paid');

  // Direct writes, even to their own rows, are refused.
  await assert.rejects(db.select(`update public.payment_orders set status = 'paid'`, [], asA), /permission denied/);
  await assert.rejects(
    db.select(`insert into public.access_grants (user_id, order_id, plan_id, starts_at, ends_at) values ($1, $2, 'month-1', now(), now() + interval '1 year')`, [A, mine.orderId], asA),
    /permission denied/,
  );
  await assert.rejects(db.select(`update public.access_grants set ends_at = now() + interval '10 years'`, [], asA), /permission denied/);
  await assert.rejects(db.select(`delete from public.payment_orders`, [], asA), /permission denied/);
  await assert.rejects(db.select(`update public.access_plans set amount = 1`, [], asA), /permission denied/);

  // Every service function is refused to a student and to anon.
  const calls: [string, Record<string, unknown>][] = [
    ['access_order_mark_pending', { p_order: mine.orderId, p_provider: 'simulated', p_ref: 'sim_forged_ref' }],
    ['access_order_paid', { p_order: mine.orderId, p_provider: 'simulated', p_ref: 'x', p_amount: 1, p_currency: 'KZT' }],
    ['access_order_failed', { p_order: mine.orderId, p_reason: 'failed' }],
    ['access_order_refunded', { p_order: mine.orderId, p_provider_ref: null }],
    ['access_paid_now', { p_user: A }],
    ['access_paid_until', { p_user: A }],
    ['access_paid_state', { p_user: A }],
    ['trial_state', { p_user: A }],
    ['trial_can_open', { p_user: A, p_item: 'lesson:reading-tfng' }],
  ];
  for (const [fn, args] of calls) {
    await assert.rejects(db.rpc(fn, args, asA), /permission denied/, `${fn} as a student`);
    await assert.rejects(db.rpc(fn, args, { role: 'anon' }), /permission denied/, `${fn} as anon`);
  }
  await db.close();
});

/* ── Confirmation ─────────────────────────────────────────────────────── */

test('a confirmed payment creates exactly one grant, with a receipt number, and a replay is the same answer', async () => {
  const db = await world();
  const o = await order(db);
  await pending(db, o.orderId);
  const first = await pay(db, o);
  assert.equal(first.ok, true);
  assert.equal(first.replay, false);
  assert.match(String(first.receiptNumber), /^\d{4}-\d{6}$/);
  const g = await grants(db);
  assert.equal(g.length, 1);
  const days = (ms(g[0]!.ends_at) - ms(g[0]!.starts_at)) / DAY;
  assert.equal(Math.round(days), 30);

  for (let i = 0; i < 3; i++) {
    const again = await pay(db, o);
    assert.equal(again.ok, true);
    assert.equal(again.replay, true);
    assert.equal(again.receiptNumber, first.receiptNumber);
    assert.deepEqual(again.grant, first.grant);
  }
  assert.equal((await grants(db)).length, 1, 'no second grant');
  await db.close();
});

test('a confirmation for a different amount, currency, provider or payment reference is refused and grants nothing', async () => {
  const db = await world();
  const o = await order(db);
  await pending(db, o.orderId);
  assert.deepEqual(await pay(db, o, { p_amount: 1 }), { ok: false, reason: 'amount-mismatch' });
  assert.deepEqual(await pay(db, o, { p_amount: 25000 }), { ok: false, reason: 'amount-mismatch' });
  assert.deepEqual(await pay(db, o, { p_currency: 'USD' }), { ok: false, reason: 'amount-mismatch' });
  assert.deepEqual(await pay(db, o, { p_provider: 'another' }), { ok: false, reason: 'provider-mismatch' });
  assert.deepEqual(await pay(db, o, { p_ref: 'sim_someone_else' }), { ok: false, reason: 'ref-mismatch' });
  assert.equal((await grants(db)).length, 0);
  assert.equal((await db.select('select status from public.payment_orders', [], service))[0]!.status, 'pending');
  assert.equal((await status(db)).paid, null);
  // One provider payment can never pay for two orders.
  const other = await order(db);
  assert.deepEqual(await pending(db, other.orderId, `sim_${o.orderId.replace(/-/g, '')}`), { ok: false, reason: 'ref-in-use' });
  await db.close();
});

test('failed and cancelled events never touch a paid order; a later confirmed payment still counts', async () => {
  const db = await world();
  const paid = await buy(db);
  for (const reason of ['failed', 'cancelled', 'declined']) {
    const answer = (await db.rpc('access_order_failed', { p_order: paid.orderId, p_reason: reason }, service)) as Record<string, unknown>;
    assert.deepEqual(answer, { ok: true, unchanged: true, status: 'paid' });
  }
  assert.equal((await grants(db)).length, 1);
  assert.equal((await grants(db))[0]!.revoked_at, null);

  const o = await order(db);
  await pending(db, o.orderId);
  assert.equal(((await db.rpc('access_order_failed', { p_order: o.orderId, p_reason: 'cancelled' }, service)) as { status: string }).status, 'cancelled');
  const statusRow = await db.select('select status, failure_reason from public.payment_orders where id = $1', [o.orderId], service);
  assert.deepEqual(statusRow, [{ status: 'cancelled', failure_reason: 'cancelled' }]);
  // The provider later confirms it took the money after all: honoured.
  assert.equal((await pay(db, o)).ok, true);
  assert.equal((await grants(db)).length, 2);
  await db.close();
});

/* ── Extending, refunds ───────────────────────────────────────────────── */

test('buying again while access runs extends it: the new grant starts when the current one ends', async () => {
  const db = await world();
  await buy(db, 'month-1');
  await buy(db, 'month-3');
  const [g1, g2] = await grants(db);
  assert.equal(ms(g2!.starts_at), ms(g1!.ends_at));
  const s = await status(db);
  assert.equal(s.paid?.planId, 'month-3', 'the plan of the grant that ends last');
  assert.equal(ms(s.paid?.startsAt), ms(g1!.starts_at), 'the earliest start still counting');
  assert.equal(ms(s.paid?.endsAt), ms(g2!.ends_at));
  assert.equal(Math.round((ms(s.paid!.endsAt) - ms(s.paid!.startsAt)) / DAY), 120);
  await db.close();
});

test('a refund revokes that order\'s grant and pulls later grants back, with no gap', async () => {
  const db = await world();
  const first = await buy(db, 'month-1');
  const second = await buy(db, 'month-3');
  const refunded = (await db.rpc('access_order_refunded', { p_order: first.orderId, p_provider_ref: `sim_${first.orderId.replace(/-/g, '')}` }, service)) as Record<string, unknown>;
  assert.deepEqual(refunded, { ok: true, replay: false, status: 'refunded' });

  const rows = await grants(db);
  const g1 = rows.find((r: { order_id: string }) => r.order_id === first.orderId)!;
  const g2 = rows.find((r: { order_id: string }) => r.order_id === second.orderId)!;
  assert.notEqual(g1.revoked_at, null);
  assert.equal(g2.revoked_at, null);
  // The three-month grant now starts (about) now, not in thirty days.
  assert.ok(Math.abs(ms(g2.starts_at) - Date.now()) < 60_000, `g2 starts ${g2.starts_at}`);
  assert.equal(Math.round((ms(g2.ends_at) - ms(g2.starts_at)) / DAY), 90);
  const s = await status(db);
  assert.equal(hasPaidAccess(s, Date.now()), true);
  assert.equal(ms(s.paid?.endsAt), ms(g2.ends_at));

  // Replayed refund: idempotent. A paid event after the refund: refused.
  assert.deepEqual(await db.rpc('access_order_refunded', { p_order: first.orderId, p_provider_ref: null }, service), {
    ok: true,
    replay: true,
    status: 'refunded',
  });
  assert.deepEqual(await pay(db, first), { ok: false, reason: 'refunded' });
  assert.equal((await grants(db)).length, 2);

  // Refunding an order that was never paid is refused.
  const o = await order(db);
  assert.deepEqual(await db.rpc('access_order_refunded', { p_order: o.orderId, p_provider_ref: null }, service), {
    ok: false,
    reason: 'not-paid',
    status: 'created',
  });

  // Refunding the last one leaves no paid access at all.
  await db.rpc('access_order_refunded', { p_order: second.orderId, p_provider_ref: null }, service);
  assert.equal((await status(db)).paid, null);
  assert.deepEqual(await db.rpc('access_paid_now', { p_user: A }, service), { paid: false });
  await db.close();
});

/* ── What trial_state and trial_can_open say ──────────────────────────── */

test('trial_state.paid: null before paying, the grant while it runs, the end date after it ends', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  assert.equal((await status(db)).paid, null);
  assert.equal((await status(db, B)).paid, null, 'no trial, no payment');
  await buy(db);
  const running = await status(db);
  assert.equal(running.paid?.planId, 'month-1');
  assert.equal(hasPaidAccess(running, Date.now()), true);
  assert.equal(running.state, 'active', 'the trial state is reported unchanged beside it');
  // The student sees the same through their own trial_status().
  assert.deepEqual(parseTrialStatus(await db.rpc('trial_status', {}, asA))!.paid, running.paid);

  await db.expirePaid(A);
  const ended = await status(db);
  assert.notEqual(ended.paid, null);
  assert.equal(hasPaidAccess(ended, Date.now()), false);
  assert.equal(paidAccessEnded(ended, Date.now()), true);
  assert.deepEqual(await db.rpc('access_paid_now', { p_user: A }, service), { paid: false });

  // B paid without ever starting a trial: paid is reported with state none.
  await buy(db, 'month-1', asB);
  const bStatus = await status(db, B);
  assert.equal(bStatus.state, 'none');
  assert.equal(hasPaidAccess(bStatus, Date.now()), true);
  await db.close();
});

test('trial_can_open: a running grant opens everything; after it ends the trial rules apply again', async () => {
  const db = await world();
  const locked = ['lesson:reading-tfng', 'test:reading-full-029', 'practice:practice-reading-tfng', 'pack:writing-models', 'writing-prompt:pte-wt-121-task2', 'writing-model:pte-wt-121-task2'];

  // No trial, no payment.
  for (const item of locked) assert.equal((await canOpen(db, item)).ok, false, item);
  assert.equal((await canOpen(db, 'lesson:reading-paraphrase')).reason, 'trial-required');

  await buy(db);
  for (const item of locked) assert.deepEqual(await canOpen(db, item), { ok: true, paid: true }, item);
  // Malformed ids and unknown kinds are still refused while paid.
  assert.equal((await canOpen(db, 'lesson:../secret')).ok, false);
  assert.equal((await canOpen(db, 'admin:everything')).ok, false);
  assert.equal((await canOpen(db, 'pack:')).ok, false);
  // Another student is untouched.
  assert.equal((await canOpen(db, 'lesson:reading-tfng', B)).ok, false);

  // Paid access ends: the ended trial's rules (here: no trial at all).
  await db.expirePaid(A);
  for (const item of locked) assert.equal((await canOpen(db, item)).ok, false, item);
  assert.equal((await canOpen(db, 'lesson:reading-paraphrase')).reason, 'trial-required');

  // With a trial that has ended, exactly as before paying.
  await db.rpc('trial_start', {}, asA);
  await db.rpc('trial_test_begin', { p_section: 'reading', p_activity: 'reading-full-001', p_request: 'sit-r-paid-001' }, asA);
  await db.rewind(A, 72 * 60 + 1);
  assert.equal((await canOpen(db, 'lesson:reading-paraphrase')).reason, 'trial-ended');
  assert.equal((await canOpen(db, 'lesson:reading-tfng')).reason, 'not-included');
  assert.equal((await canOpen(db, 'pack:writing-models')).reason, 'not-included');
  assert.deepEqual(await canOpen(db, 'test:reading-full-001'), { ok: true }, 'a begun test stays theirs');
  await db.close();
});

test('a refund takes access away at once, and saved trial results stay', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  await db.rpc('trial_test_begin', { p_section: 'reading', p_activity: 'reading-full-001', p_request: 'sit-r-paid-002' }, asA);
  await db.rpc('trial_test_finish', { p_section: 'reading', p_request: 'sit-r-paid-002' }, asA);
  const o = await buy(db);
  assert.equal((await canOpen(db, 'lesson:reading-tfng')).ok, true);
  await db.rpc('access_order_refunded', { p_order: o.orderId, p_provider_ref: null }, service);
  assert.equal((await canOpen(db, 'lesson:reading-tfng')).ok, false);
  const s = await status(db);
  assert.equal(s.sections.reading.test?.status, 'settled', 'the trial result is still there');
  assert.equal(s.paid, null);
  await db.close();
});
