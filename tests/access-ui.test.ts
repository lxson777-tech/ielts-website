/* What the purchase and access screens say (Builder A2, audit F01):
 * src/components/access/access-state.ts. Pure functions only: the rules
 * that decide who has access are the database's (tests/paid-sql.test.ts)
 * and the payments Worker's (tests/paid-worker.test.ts). These hold the
 * screens to the server's facts, in English and Russian. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accessSummary,
  checkoutProblem,
  describeAccess,
  extendedUntil,
  formatDate,
  formatMoney,
  hasReceipt,
  interruptedOrder,
  isOrderId,
  keepPolling,
  orderStatusLabel,
  receiptFor,
  receiptRows,
  returnView,
  RETURN_WAIT_MS,
  type Translate,
} from '../src/components/access/access-state.ts';
import { parseTrialStatus, type TrialStatus } from '../src/lib/trial/status.ts';
import { PAID_PLANS, parsePaymentOrder, type PaymentOrder } from '../src/lib/access/plans.ts';
import { interpolate, translateWith } from '../src/lib/i18n/translate.ts';
import * as ru from '../src/lib/i18n/dict/ru/index.ts';

const NOW = Date.parse('2026-09-29T09:00:00Z');
const H = 3600 * 1000;
const D = 24 * H;
const TZ = 'Asia/Almaty'; // UTC+5, the students' own clock

const en: Translate = (text, vars) => interpolate(text, vars);
const ruDict = { strings: ru.strings, plurals: ru.plurals };
const tRu: Translate = (text, vars, ctx) => translateWith(ruDict, 'ru', text, vars, ctx);

/** Russian number formatting uses no-break spaces; compare with plain ones. */
const plain = (s: string) => s.replace(/[  ]/g, ' ');

function status(overrides: Record<string, unknown> = {}): TrialStatus {
  const empty = { test: null, tutorUsed: 0, tutorPending: 0 };
  return parseTrialStatus({
    state: 'active',
    startedAt: new Date(NOW - 10 * H).toISOString(),
    endsAt: new Date(NOW + 62 * H).toISOString(),
    serverNow: new Date(NOW).toISOString(),
    paid: null,
    limits: { hours: 72, testsPerSection: 1, tutorPerSection: 5 },
    sections: { reading: empty, listening: empty, writing: empty, speaking: empty },
    ...overrides,
  })!;
}

function order(overrides: Partial<Record<string, unknown>> = {}): PaymentOrder {
  return parsePaymentOrder({
    orderId: '8d4f1c1e-2b7a-4c55-9a3e-1f0b6f6c2d11',
    planId: 'month-1',
    amount: 10000,
    currency: 'KZT',
    provider: 'simulated',
    status: 'paid',
    createdAt: new Date(NOW - 5 * 60 * 1000).toISOString(),
    paidAt: new Date(NOW - 4 * 60 * 1000).toISOString(),
    refundedAt: null,
    receiptNumber: 'EZ-2026-000001',
    grant: { startsAt: new Date(NOW - 4 * 60 * 1000).toISOString(), endsAt: new Date(NOW + 30 * D).toISOString(), revokedAt: null },
    ...overrides,
  })!;
}

/* ── Access state ─────────────────────────────────────────────────────── */

test('paid access comes first, whatever the trial says', () => {
  const s = status({ state: 'ended', startedAt: new Date(NOW - 80 * H).toISOString(), endsAt: new Date(NOW - 8 * H).toISOString(), paid: { planId: 'month-1', startsAt: new Date(NOW - H).toISOString(), endsAt: new Date(NOW + 30 * D).toISOString() } });
  assert.deepEqual(accessSummary(s, NOW), { kind: 'paid', planId: 'month-1', endsAt: new Date(NOW + 30 * D).toISOString() });
});

test('a running trial, an ended trial, no trial, and paid access that ran out', () => {
  assert.equal(accessSummary(status(), NOW).kind, 'trial-active');
  const ended = status({ state: 'ended', startedAt: new Date(NOW - 80 * H).toISOString(), endsAt: new Date(NOW - 8 * H).toISOString() });
  assert.deepEqual(accessSummary(ended, NOW), { kind: 'trial-ended', endedAt: new Date(NOW - 8 * H).toISOString() });
  assert.equal(accessSummary(status({ state: 'none', startedAt: null, endsAt: null }), NOW).kind, 'no-trial');
  const paidEnded = status({
    state: 'ended',
    startedAt: new Date(NOW - 40 * D).toISOString(),
    endsAt: new Date(NOW - 37 * D).toISOString(),
    paid: { planId: 'month-1', startsAt: new Date(NOW - 31 * D).toISOString(), endsAt: new Date(NOW - D).toISOString() },
  });
  assert.deepEqual(accessSummary(paidEnded, NOW), { kind: 'paid-ended', endedAt: new Date(NOW - D).toISOString() });
  // A student who paid is told when it ended, even with a trial still running beside it.
  const endedBesideTrial = status({ paid: { planId: 'month-1', startsAt: new Date(NOW - 31 * D).toISOString(), endsAt: new Date(NOW - H).toISOString() } });
  assert.equal(accessSummary(endedBesideTrial, NOW).kind, 'paid-ended');
  // A trial still running (by the server's clock) moves to ended without asking again.
  assert.equal(accessSummary(status(), NOW + 63 * H).kind, 'trial-ended');
});

test('after a refund the server reports no paid access, and the screen falls back to the trial', () => {
  // access_paid_state ignores revoked grants, so a refunded only purchase is paid: null.
  const refunded = status({ state: 'ended', startedAt: new Date(NOW - 80 * H).toISOString(), endsAt: new Date(NOW - 8 * H).toISOString(), paid: null });
  assert.equal(accessSummary(refunded, NOW).kind, 'trial-ended');
});

test('the access wording, in English and Russian, with dates in the student\'s language', () => {
  const paid = { kind: 'paid' as const, planId: 'month-1', endsAt: '2026-10-29T09:00:00Z' };
  assert.deepEqual(describeAccess(paid, en, 'en', TZ), {
    title: 'Full access until 29 October 2026',
    detail: 'Buying again adds more time after this date. Nothing renews by itself.',
  });
  const ruPaid = describeAccess(paid, tRu, 'ru', TZ);
  assert.match(ruPaid.title, /^Полный доступ до 29 октября 2026/);
  assert.equal(ruPaid.detail, 'Новая покупка добавит время после этой даты. Ничего не продлевается само.');

  const ended = describeAccess({ kind: 'paid-ended', endedAt: '2026-10-29T09:00:00Z' }, en, 'en', TZ);
  assert.equal(ended.title, 'Your full access ended on 29 October 2026');
  assert.match(ended.detail, /Your results are kept/);
  assert.match(describeAccess({ kind: 'paid-ended', endedAt: '2026-10-29T09:00:00Z' }, tRu, 'ru', TZ).detail, /результаты сохранены/);

  // The three-day trial ends at a time of day, shown on the student's clock.
  assert.equal(describeAccess({ kind: 'trial-active', endsAt: '2026-10-02T09:05:00Z' }, en, 'en', TZ).title, 'Your free trial runs until 2 October, 14:05');
  assert.equal(describeAccess({ kind: 'trial-active', endsAt: '2026-10-02T09:05:00Z' }, tRu, 'ru', TZ).title, 'Бесплатный пробный период действует до 2 октября, 14:05');
  assert.equal(describeAccess({ kind: 'trial-ended', endedAt: '2026-10-02T09:05:00Z' }, en, 'en', TZ).title, 'Your free trial ended on 2 October 2026');
  assert.equal(describeAccess({ kind: 'no-trial' }, en, 'en', TZ).title, 'You do not have full access yet');
});

test('the wording never promises a renewal or a refund', () => {
  const kinds = [
    { kind: 'paid' as const, planId: 'month-1', endsAt: '2026-10-29T09:00:00Z' },
    { kind: 'trial-active' as const, endsAt: '2026-10-02T09:05:00Z' },
    { kind: 'paid-ended' as const, endedAt: '2026-10-29T09:00:00Z' },
    { kind: 'trial-ended' as const, endedAt: '2026-10-02T09:05:00Z' },
    { kind: 'no-trial' as const },
  ];
  for (const k of kinds) {
    const { title, detail } = describeAccess(k, en, 'en', TZ);
    assert.doesNotMatch(`${title} ${detail}`, /\brenews? (automatically|each)|refund/i);
  }
});

test('buying while paid adds the plan after the current end; otherwise there is no "adds to" line', () => {
  const endsAt = new Date(NOW + 10 * D).toISOString();
  const paid = status({ paid: { planId: 'month-1', startsAt: new Date(NOW - 20 * D).toISOString(), endsAt } });
  assert.equal(extendedUntil(paid, 90, NOW), new Date(NOW + 100 * D).toISOString());
  assert.equal(extendedUntil(status(), 30, NOW), null);
  const ran = status({ paid: { planId: 'month-1', startsAt: new Date(NOW - 31 * D).toISOString(), endsAt: new Date(NOW - D).toISOString() } });
  assert.equal(extendedUntil(ran, 30, NOW), null);
});

/* ── Money and dates ──────────────────────────────────────────────────── */

test('tenge is formatted for the language: ₸10,000 in English, 10 000 ₸ in Russian', () => {
  assert.equal(formatMoney(10000, 'KZT', 'en'), '₸10,000');
  assert.equal(formatMoney(25000, 'KZT', 'en'), '₸25,000');
  assert.equal(plain(formatMoney(10000, 'KZT', 'ru')), '10 000 ₸');
  assert.equal(plain(formatMoney(25000, 'KZT', 'ru')), '25 000 ₸');
  // The plans shown are the approved ones.
  assert.deepEqual(PAID_PLANS.map((p) => [p.id, p.days, p.amount]), [['month-1', 30, 12990], ['month-3', 90, 25000]]);
});

test('dates are long-form in each language, on the student\'s clock', () => {
  // 20:30 UTC on the 29th is already the 30th in Almaty.
  assert.equal(formatDate('2026-09-29T20:30:00Z', 'en', TZ), '30 September 2026');
  assert.match(formatDate('2026-09-29T20:30:00Z', 'ru', TZ), /^30 сентября 2026/);
  assert.equal(formatDate('not a date', 'en', TZ), 'not a date');
});

/* ── Orders: interrupted purchases, history ───────────────────────────── */

test('an unfinished purchase is offered back only while it is the newest and recent', () => {
  const open = order({ status: 'pending', paidAt: null, receiptNumber: null, grant: null });
  assert.equal(interruptedOrder([open], NOW)?.orderId, open.orderId);
  assert.equal(interruptedOrder([order({ status: 'created', paidAt: null, receiptNumber: null, grant: null })], NOW)?.status, 'created');
  // Abandoned more than a day ago: history, not a question.
  const old = order({ status: 'pending', createdAt: new Date(NOW - 2 * D).toISOString(), paidAt: null, receiptNumber: null, grant: null });
  assert.equal(interruptedOrder([old], NOW), null);
  // A newer purchase of any kind means the student moved on.
  const newerPaid = order({ orderId: '11111111-2222-4333-8444-555555555555', createdAt: new Date(NOW - 60 * 1000).toISOString() });
  assert.equal(interruptedOrder([newerPaid, open], NOW), null);
  assert.equal(interruptedOrder([], NOW), null);
  assert.equal(interruptedOrder([order()], NOW), null);
});

test('history status words, and which orders have a receipt', () => {
  assert.deepEqual(
    (['paid', 'refunded', 'failed', 'cancelled', 'created', 'pending'] as const).map(orderStatusLabel),
    ['Paid', 'Refunded', 'Not completed', 'Cancelled', 'Not finished', 'Not finished'],
  );
  for (const label of ['Paid', 'Refunded', 'Not completed', 'Cancelled', 'Not finished']) {
    assert.notEqual(tRu(label), label, `${label} has Russian`);
  }
  assert.equal(hasReceipt(order()), true);
  assert.equal(hasReceipt(order({ status: 'refunded', refundedAt: new Date(NOW).toISOString() })), true);
  assert.equal(hasReceipt(order({ status: 'failed', paidAt: null, receiptNumber: null, grant: null })), false);
  assert.equal(hasReceipt(order({ status: 'pending', paidAt: null, receiptNumber: null, grant: null })), false);
});

test('only a real order id is read from the address', () => {
  assert.equal(isOrderId('8d4f1c1e-2b7a-4c55-9a3e-1f0b6f6c2d11'), true);
  for (const bad of [null, undefined, '', 'abc', '../account', '8d4f1c1e-2b7a-4c55-9a3e-1f0b6f6c2d11x']) assert.equal(isOrderId(bad), false);
});

/* ── The return page ──────────────────────────────────────────────────── */

test('the return page: paid, failed, cancelled and refunded are said at once', () => {
  assert.equal(returnView({ ok: true, order: order() }, 0).kind, 'paid');
  assert.equal(returnView({ ok: true, order: order({ status: 'failed', paidAt: null, receiptNumber: null, grant: null }) }, 0).kind, 'failed');
  assert.equal(returnView({ ok: true, order: order({ status: 'cancelled', paidAt: null, receiptNumber: null, grant: null }) }, 0).kind, 'cancelled');
  assert.equal(returnView({ ok: true, order: order({ status: 'refunded' }) }, 0).kind, 'refunded');
});

test('an unconfirmed order keeps "confirming" through the wait, then offers Check again', () => {
  const pending = { ok: true as const, order: order({ status: 'pending', paidAt: null, receiptNumber: null, grant: null }) };
  const early = returnView(pending, 5_000);
  assert.equal(early.kind, 'confirming');
  assert.equal(keepPolling(early), true);
  const late = returnView(pending, RETURN_WAIT_MS);
  assert.equal(late.kind, 'pending');
  assert.equal(keepPolling(late), false);
});

test('someone else\'s order, a signed-out student and an outage each get their own safe answer', () => {
  assert.equal(returnView({ ok: false, code: 'not-found' }, 0).kind, 'not-found');
  assert.equal(returnView({ ok: false, code: 'sign-in-required' }, 0).kind, 'signed-out');
  // A passing failure is not reported while the page is still waiting...
  assert.equal(returnView({ ok: false, code: 'unavailable' }, 1_000).kind, 'confirming');
  assert.equal(returnView({ ok: false, code: 'offline' }, 1_000).kind, 'confirming');
  // ...and becomes a plain "could not check" after it.
  assert.equal(returnView({ ok: false, code: 'unavailable' }, RETURN_WAIT_MS + 1).kind, 'error');
});

test('checkout problems in plain words; "nothing was charged" only where the Worker says so', () => {
  const codes = ['plan-unavailable', 'too-many-open-orders', 'provider-unavailable', 'not-configured', 'simulated-refused', 'sign-in-required', 'offline', 'unavailable', 'something-new'];
  for (const code of codes) {
    const said = checkoutProblem(code, en);
    assert.ok(said.length > 10, code);
    assert.equal(/charged/i.test(said), code === 'provider-unavailable', `${code}: ${said}`);
    assert.notEqual(checkoutProblem(code, tRu), said, `${code} has Russian`);
  }
  assert.equal(checkoutProblem('too-many-open-orders', en), 'You have started too many purchases in the last hour. Please try again in an hour.');
});

/* ── Receipts ─────────────────────────────────────────────────────────── */

test('a receipt: number, date, plan, period, amount and status, in English', () => {
  const paid = order({
    paidAt: '2026-09-29T09:00:00Z',
    grant: { startsAt: '2026-09-29T09:00:00Z', endsAt: '2026-10-29T09:00:00Z', revokedAt: null },
  });
  const receipt = receiptFor(paid)!;
  assert.equal(receipt.simulated, true);
  assert.deepEqual(receiptRows(receipt, en, 'en', TZ), [
    ['Receipt number', 'EZ-2026-000001'],
    ['Date', '29 September 2026'],
    ['Plan', 'One month'],
    ['Access period', '29 September 2026 to 29 October 2026'],
    ['Amount', '₸10,000'],
    ['Status', 'Paid'],
  ]);
});

test('a receipt in Russian, and a refunded one says when', () => {
  const refunded = order({
    status: 'refunded',
    planId: 'month-3',
    amount: 25000,
    paidAt: '2026-09-29T09:00:00Z',
    refundedAt: '2026-09-30T09:00:00Z',
    provider: 'kaspi',
    grant: { startsAt: '2026-09-29T09:00:00Z', endsAt: '2026-12-28T09:00:00Z', revokedAt: '2026-09-30T09:00:00Z' },
  });
  const receipt = receiptFor(refunded)!;
  assert.equal(receipt.simulated, false);
  assert.equal(receipt.status, 'refunded');
  const rows = receiptRows(receipt, tRu, 'ru', TZ).map(([k, v]) => [k, plain(v)]);
  assert.deepEqual(rows.map(([k]) => k), ['Номер чека', 'Дата', 'Тариф', 'Срок доступа', 'Сумма', 'Статус']);
  assert.equal(rows[2][1], 'Три месяца');
  assert.match(rows[3][1], /^с 29 сентября 2026 г\. по 28 декабря 2026 г\.$/);
  assert.equal(rows[4][1], '25 000 ₸');
  assert.match(rows[5][1], /^Возврат 30 сентября 2026/);
  assert.equal(receiptRows(receipt, en, 'en', TZ)[5][1], 'Refunded on 30 September 2026');
});

test('an order that was never paid has no receipt', () => {
  for (const s of ['created', 'pending', 'failed', 'cancelled']) {
    assert.equal(receiptFor(order({ status: s, paidAt: null, receiptNumber: null, grant: null })), null, s);
  }
});
