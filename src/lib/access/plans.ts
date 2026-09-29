/* The paid plans: what each costs and how long it lasts.

   SHARED by the site (the sales page, /plans, the account's purchase
   history) and tested against the database: the prices a student is
   actually charged live in `access_plans`
   (supabase/migrations/2026-09-30-paid-access.sql), where an order takes its
   price from, and tests/paid-sql.test.ts fails if the two ever disagree.
   The browser never sends a price; these numbers are for showing only.

   The amounts are the ones Alex approved for the trial's plans page
   (FULL_ACCESS_PRICES_KZT in src/lib/trial/offer.ts), not new ones. */

import { FULL_ACCESS_PRICES_KZT } from '../trial/offer';

export type PaidPlanId = 'month-1' | 'month-3';

export interface PaidPlan {
  id: PaidPlanId;
  /** How long one purchase adds, in days, counted by the server. */
  days: number;
  /** Whole tenge. */
  amount: number;
  currency: 'KZT';
  /** The plan's name on the pricing surfaces (translated through t()). */
  title: string;
  /** One sentence under the price (translated through t()). */
  summary: string;
}

export const PAID_PLANS: readonly PaidPlan[] = [
  {
    id: 'month-1',
    days: 30,
    amount: FULL_ACCESS_PRICES_KZT.oneMonth,
    currency: 'KZT',
    title: 'One month',
    summary: 'The full course and every practice test for one month.',
  },
  {
    id: 'month-3',
    days: 90,
    amount: FULL_ACCESS_PRICES_KZT.threeMonths,
    currency: 'KZT',
    title: 'Three months',
    summary: 'The full course and every practice test for three months.',
  },
];

/** What three single months would cost more than the three-month plan. */
export const THREE_MONTH_SAVING = FULL_ACCESS_PRICES_KZT.oneMonth * 3 - FULL_ACCESS_PRICES_KZT.threeMonths;

/** Paid AI use, DECIDED by Alex on 29 September 2026: "unlimited, fair
    daily caps". A paying student gets unlimited normal study, and the
    Workers' EXISTING per-student daily limits are the fair caps: Mr EZ's
    daily turns and help requests (workers/mr-ez) and the live examiner's
    daily and concurrent sessions (workers/live-examiner). The essay and
    speaking graders have no per-student daily limit today, so this sentence
    names only the two that do. No new limit is invented for paid access. */
export const PAID_AI_ALLOWANCE = 'Unlimited study, with fair daily limits on Mr EZ and the live examiner.';

/** Also decided on 29 September 2026: a purchase is a fixed period that
    simply ends. There is no automatic renewal and no refund after purchase
    (nothing student-facing offers one; the database still records a refund
    a provider issues, for example by error). Buying again while access is
    running adds the new period after the current one. */
export const PAID_ACCESS_RENEWS = false;

export function paidPlan(id: string): PaidPlan | null {
  return PAID_PLANS.find((plan) => plan.id === id) ?? null;
}

/** The order statuses the server reports (payment_orders.status). */
export type OrderStatus = 'created' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

/** One order as access_order() / access_orders() / the payments Worker's
    GET /order/<id> return it. */
export interface PaymentOrder {
  orderId: string;
  planId: string;
  amount: number;
  currency: string;
  provider: string | null;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  receiptNumber: string | null;
  grant: { startsAt: string; endsAt: string; revokedAt: string | null } | null;
}

const STATUSES = new Set<OrderStatus>(['created', 'pending', 'paid', 'failed', 'cancelled', 'refunded']);
const iso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/** Reads one order from the server's reply; null when malformed. */
export function parsePaymentOrder(raw: unknown): PaymentOrder | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.orderId !== 'string' || typeof v.planId !== 'string') return null;
  if (typeof v.amount !== 'number' || typeof v.currency !== 'string') return null;
  if (typeof v.status !== 'string' || !STATUSES.has(v.status as OrderStatus) || !iso(v.createdAt)) return null;
  const g = v.grant as Record<string, unknown> | null | undefined;
  return {
    orderId: v.orderId,
    planId: v.planId,
    amount: v.amount,
    currency: v.currency,
    provider: typeof v.provider === 'string' ? v.provider : null,
    status: v.status as OrderStatus,
    createdAt: v.createdAt,
    paidAt: iso(v.paidAt) ? v.paidAt : null,
    refundedAt: iso(v.refundedAt) ? v.refundedAt : null,
    receiptNumber: typeof v.receiptNumber === 'string' ? v.receiptNumber : null,
    grant:
      g && typeof g === 'object' && iso(g.startsAt) && iso(g.endsAt)
        ? { startsAt: g.startsAt, endsAt: g.endsAt, revokedAt: iso(g.revokedAt) ? g.revokedAt : null }
        : null,
  };
}
