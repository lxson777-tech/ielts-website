/* What the purchase and access screens SAY, worked out from what the server
   reported. Builder A2, audit remediation F01 (docs/paid-access/CONTRACT.md).

   PURE: no browser, no network, no clock of its own. Every function takes the
   server's facts (the trial status with its `paid` key, one order or the
   list of orders) and the server's time, and returns a decision or a
   sentence. Nothing here grants anything: the payments Worker and the
   database decide who has access, and the screens only report it.

   The wording functions take `t` as a parameter (the component passes
   useT().t, a test passes a fixed-language one), so the English literals
   below are still read by the i18n coverage test like any other t() call. */

import type { Vars } from '../../lib/i18n/translate';
import { intlLocale as tagFor, type Locale } from '../../lib/i18n/locale';
import { nt } from '../../lib/i18n/translate';
import { paidPlan, type OrderStatus, type PaymentOrder } from '../../lib/access/plans';
import { hasPaidAccess, paidAccessEnded, type TrialStatus } from '../../lib/trial/status';

export type Translate = (text: string, vars?: Vars, ctx?: string) => string;

const DAY_MS = 24 * 60 * 60 * 1000;

/* ── Formatting ──────────────────────────────────────────────────────── */

/* Kazakh dates use kk-KZ where the browser has it (src/lib/i18n/locale.ts). */
function intlLocale(locale: Locale): string {
  return tagFor(locale, 'en-GB');
}

/** "29 October 2026" / "29 октября 2026 г.". */
export function formatDate(iso: string, locale: Locale, timeZone?: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(ms);
}

/** "2 October, 14:05" / "2 октября, 14:05": for the three-day trial, whose
    end is hours away rather than weeks. */
export function formatDateTime(iso: string, locale: Locale, timeZone?: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  const day = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long', timeZone }).format(ms);
  const time = new Intl.DateTimeFormat(intlLocale(locale), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(ms);
  return `${day}, ${time}`;
}

/** Whole tenge for the locale: "₸10,000" in English (as the approved plans
    page shows it), "10 000 ₸" in Russian and Kazakh. */
export function formatMoney(amount: number, currency: string, locale: Locale): string {
  try {
    return new Intl.NumberFormat(tagFor(locale, 'en-US'), {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('en-US')} ${currency}`;
  }
}

/** The plan's name as the pricing surfaces show it (English, for t()). An
    unknown plan id is shown as itself rather than guessed at. */
export function planTitle(planId: string): string {
  return paidPlan(planId)?.title ?? planId;
}

/* ── The student's access right now ──────────────────────────────────── */

export type AccessSummary =
  /** A running purchase. */
  | { kind: 'paid'; planId: string; endsAt: string }
  /** Free access given by Alex in /admin (paid.kind 'complimentary'): it
      opens exactly what a purchase opens. */
  | { kind: 'complimentary'; endsAt: string }
  /** Practice and guidance that ran out: back to a free account. */
  | { kind: 'paid-ended'; endedAt: string; complimentary: boolean }
  /** A free account: every lesson, no practice and guidance. */
  | { kind: 'free' };

/** The account's tier for the access strip (the free-account model, Alex,
    1 October 2026). The trial was retired: whatever an old trial row says,
    an account with no running grant is a free account. */
export function accessSummary(status: TrialStatus, serverNowMs: number): AccessSummary {
  const paid = status.paid;
  if (paid && hasPaidAccess(status, serverNowMs)) {
    return paid.kind === 'complimentary'
      ? { kind: 'complimentary', endsAt: paid.endsAt }
      : { kind: 'paid', planId: paid.planId, endsAt: paid.endsAt };
  }
  if (paid && paidAccessEnded(status, serverNowMs)) {
    return { kind: 'paid-ended', endedAt: paid.endsAt, complimentary: paid.kind === 'complimentary' };
  }
  return { kind: 'free' };
}

export interface AccessWording {
  title: string;
  detail: string;
}

/** The headline and one supporting sentence for the access strip on /plans
    and the "Your access" section of /account. */
export function describeAccess(summary: AccessSummary, t: Translate, locale: Locale, timeZone?: string): AccessWording {
  switch (summary.kind) {
    case 'paid':
      return {
        title: t('Practice and guidance until {date}', { date: formatDate(summary.endsAt, locale, timeZone) }),
        detail: t('Buying again adds more time after this date. Nothing renews by itself.'),
      };
    case 'complimentary':
      return {
        title: t('Free access from your teacher until {date}', { date: formatDate(summary.endsAt, locale, timeZone) }),
        detail: t('It opens everything practice and guidance includes. Your teacher renews or stops it.'),
      };
    case 'paid-ended':
      return {
        title: t('Practice and guidance ended on {date}', { date: formatDate(summary.endedAt, locale, timeZone) }),
        detail: t('Every lesson stays open, and your results are kept. Choose practice and guidance again to continue.'),
      };
    case 'free':
    default:
      return {
        title: t('Free account'),
        detail: t('Every lesson is free with your account. Practice and guidance starts as soon as your payment is confirmed.'),
      };
  }
}

/** When access would run until if this plan were bought now, for the line
    "adds to your current access, which then runs until ...". Only while paid
    access is running; the database starts the new period when the current
    one ends (access_order_paid), and this mirrors that for display only. */
export function extendedUntil(status: TrialStatus | null, planDays: number, serverNowMs: number): string | null {
  if (!status?.paid || !hasPaidAccess(status, serverNowMs)) return null;
  return new Date(Date.parse(status.paid.endsAt) + planDays * DAY_MS).toISOString();
}

/* ── Orders ──────────────────────────────────────────────────────────── */

const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether a string from the address bar can be an order id at all. */
export function isOrderId(value: string | null | undefined): value is string {
  return typeof value === 'string' && ORDER_ID.test(value);
}

export function isOpenOrder(order: PaymentOrder): boolean {
  return order.status === 'created' || order.status === 'pending';
}

/** How long an unfinished purchase is offered back to the student. Older
    ones were abandoned; they stay in the history, not as a question. */
export const INTERRUPTED_WINDOW_MS = DAY_MS;

/** The purchase the student started and did not see through (closed the
    payment tab, lost connection), if the newest order is one. A later order
    of any kind means they moved on. */
export function interruptedOrder(orders: readonly PaymentOrder[], serverNowMs: number): PaymentOrder | null {
  let newest: PaymentOrder | null = null;
  for (const order of orders) {
    if (!newest || Date.parse(order.createdAt) > Date.parse(newest.createdAt)) newest = order;
  }
  if (!newest || !isOpenOrder(newest)) return null;
  return serverNowMs - Date.parse(newest.createdAt) < INTERRUPTED_WINDOW_MS ? newest : null;
}

/** The status word in the purchase history. */
export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'paid':
      return nt('Paid');
    case 'refunded':
      return nt('Refunded');
    case 'failed':
      return nt('Not completed');
    case 'cancelled':
      return nt('Cancelled');
    case 'created':
    case 'pending':
    default:
      return nt('Not finished');
  }
}

/** Only a paid (or later refunded) order with a receipt number has a
    receipt. */
export function hasReceipt(order: PaymentOrder): boolean {
  return (order.status === 'paid' || order.status === 'refunded') && order.receiptNumber !== null;
}

/* ── The return page ─────────────────────────────────────────────────── */

/** What one look at the order gave: the order, or why there is none. */
export type OrderFetch =
  | { ok: true; order: PaymentOrder }
  | { ok: false; code: 'not-found' | 'sign-in-required' | 'offline' | 'unavailable' | 'not-configured' };

export type ReturnView =
  /** Still asking: the payment may not be confirmed yet. */
  | { kind: 'confirming' }
  | { kind: 'paid'; order: PaymentOrder }
  /** The provider has not confirmed it within the wait. */
  | { kind: 'pending'; order: PaymentOrder }
  | { kind: 'failed'; order: PaymentOrder }
  | { kind: 'cancelled'; order: PaymentOrder }
  | { kind: 'refunded'; order: PaymentOrder }
  /** Not this account's order, or no such order. */
  | { kind: 'not-found' }
  | { kind: 'signed-out' }
  /** The address carries no order id. */
  | { kind: 'bad-link' }
  /** Payments could not be reached for the whole wait. */
  | { kind: 'error' };

/** How long the return page keeps asking by itself before it says "we're
    confirming" and hands the student a Check again button. */
export const RETURN_WAIT_MS = 30_000;
export const RETURN_POLL_MS = 2_000;

/** One look at the order, read against how long the page has been asking.
    An unfinished order or a passing failure keeps "confirming" until the
    wait is over, so a slow provider is not reported as a problem. */
export function returnView(fetched: OrderFetch, elapsedMs: number, waitMs = RETURN_WAIT_MS): ReturnView {
  const waiting = elapsedMs < waitMs;
  if (!fetched.ok) {
    if (fetched.code === 'not-found') return { kind: 'not-found' };
    if (fetched.code === 'sign-in-required') return { kind: 'signed-out' };
    return waiting ? { kind: 'confirming' } : { kind: 'error' };
  }
  const { order } = fetched;
  switch (order.status) {
    case 'paid':
      return { kind: 'paid', order };
    case 'failed':
      return { kind: 'failed', order };
    case 'cancelled':
      return { kind: 'cancelled', order };
    case 'refunded':
      return { kind: 'refunded', order };
    case 'created':
    case 'pending':
    default:
      return waiting ? { kind: 'confirming' } : { kind: 'pending', order };
  }
}

/** Whether the page should look again by itself. */
export function keepPolling(view: ReturnView): boolean {
  return view.kind === 'confirming';
}

/* ── Checkout refusals ───────────────────────────────────────────────── */

/** A refusal from POST /checkout (workers/payments), in plain words. The
    "nothing was charged" sentence appears only where the payments Worker
    itself says so: the payment page never opened. */
export function checkoutProblem(code: string, t: Translate): string {
  switch (code) {
    case 'plan-unavailable':
      return t('This plan is not available right now.');
    case 'too-many-open-orders':
      return t('You have started too many purchases in the last hour. Please try again in an hour.');
    case 'provider-unavailable':
      return t('The payment page could not be opened. Nothing was charged. Please try again shortly.');
    case 'not-configured':
    case 'simulated-refused':
      return t('Payment is not connected yet.');
    case 'sign-in-required':
      return t('Please sign in again to buy access.');
    case 'offline':
      return t('You seem to be offline. Nothing has changed. Please try again once you are connected.');
    case 'unavailable':
    default:
      return t('We could not reach payments just now. Nothing has changed. Please try again.');
  }
}

/* ── Receipts ────────────────────────────────────────────────────────── */

export interface ReceiptModel {
  receiptNumber: string;
  /** When the payment was confirmed. */
  paidAt: string;
  planId: string;
  /** The period this purchase paid for, as the server recorded it. */
  periodFrom: string | null;
  periodTo: string | null;
  amount: number;
  currency: string;
  status: 'paid' | 'refunded';
  refundedAt: string | null;
  /** The simulated provider: no money moved, and the receipt says so. */
  simulated: boolean;
}

/** The receipt for one order, or null when it has none (never paid). */
export function receiptFor(order: PaymentOrder): ReceiptModel | null {
  if (!hasReceipt(order) || !order.paidAt) return null;
  return {
    receiptNumber: order.receiptNumber as string,
    paidAt: order.paidAt,
    planId: order.planId,
    periodFrom: order.grant?.startsAt ?? null,
    periodTo: order.grant?.endsAt ?? null,
    amount: order.amount,
    currency: order.currency,
    status: order.status === 'refunded' ? 'refunded' : 'paid',
    refundedAt: order.refundedAt,
    simulated: order.provider === 'simulated',
  };
}

/** The receipt's rows, label then value, already in the student's language:
    the same list the page shows and the tests read. */
export function receiptRows(receipt: ReceiptModel, t: Translate, locale: Locale, timeZone?: string): [string, string][] {
  const rows: [string, string][] = [
    [t('Receipt number'), receipt.receiptNumber],
    [t('Date'), formatDate(receipt.paidAt, locale, timeZone)],
    [t('Plan', undefined, 'purchase'), t(planTitle(receipt.planId))],
  ];
  if (receipt.periodFrom && receipt.periodTo) {
    rows.push([
      t('Access period'),
      t('{from} to {to}', { from: formatDate(receipt.periodFrom, locale, timeZone), to: formatDate(receipt.periodTo, locale, timeZone) }),
    ]);
  }
  rows.push([t('Amount'), formatMoney(receipt.amount, receipt.currency, locale)]);
  rows.push([
    t('Status'),
    receipt.status === 'refunded'
      ? receipt.refundedAt
        ? t('Refunded on {date}', { date: formatDate(receipt.refundedAt, locale, timeZone) })
        : t('Refunded')
      : t('Paid'),
  ]);
  return rows;
}
