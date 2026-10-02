/* The refund rule for practice and guidance, as arithmetic (Builder L,
   2 October 2026; docs/legal/BUILD-PLAN-2026-10-02.md, "Refund rule", a
   draft for a lawyer to confirm). It replaces "no refunds after purchase".

   - A student may ask for a refund at any time during the 30 days.
   - The used share is the LARGER of: the days of access that have started,
     out of the days bought; and the AI assessments used (essays, recorded
     Speaking, live interviews), out of the ones the purchase includes.
   - Refund = price x (1 - used share), rounded down to whole tenge.

   PURE and never re-typed: the price and the days come from the plan on
   sale (src/lib/access/plans.ts), the included assessments from
   PAID_ALLOWANCE (src/lib/trial/status.ts). The offer page shows its worked
   example by running this function, so the example can never disagree with
   the rule or the price. Showing only: the person who issues a refund works
   it out from the server's records. */

import { AVAILABLE_PAID_PLANS } from '../access/plans';
import { PAID_ALLOWANCE } from '../trial/status';

/** The assessments a refund counts: essays, recorded Speaking and live
    interviews (mock exams and the placement test are not counted on their
    own; essays written in them already count as essays). */
export const REFUND_COUNTED_ASSESSMENTS = PAID_ALLOWANCE.writing + PAID_ALLOWANCE.speaking + PAID_ALLOWANCE.live;

export interface RefundInput {
  /** Whole tenge paid. */
  price: number;
  /** Days bought. */
  days: number;
  /** Days of access that have started (day 6 of 30 counts as 6). */
  daysStarted: number;
  /** Assessments the purchase includes. */
  included: number;
  /** Assessments already used. */
  used: number;
}

export interface RefundResult {
  /** The used share as a whole percentage, for showing. */
  usedPercent: number;
  /** Which of the two shares was the larger one. */
  counted: 'days' | 'assessments';
  /** Whole tenge to pay back. */
  refund: number;
}

const clamp = (n: number, max: number) => Math.min(Math.max(Math.floor(n), 0), max);

export function refundDue(input: RefundInput): RefundResult {
  const days = Math.max(1, Math.floor(input.days));
  const included = Math.max(1, Math.floor(input.included));
  const started = clamp(input.daysStarted, days);
  const used = clamp(input.used, included);
  // Compare started/days with used/included without fractions.
  const byAssessments = used * days > started * included;
  const [num, den] = byAssessments ? [used, included] : [started, days];
  return {
    usedPercent: Math.round((num * 100) / den),
    counted: byAssessments ? 'assessments' : 'days',
    // Integer arithmetic, so 60% of 12,990 is exactly 7,794.
    refund: Math.floor((Math.max(0, Math.floor(input.price)) * (den - num)) / den),
  };
}

/** The worked example the offer shows: day 6, and 8 assessments used. */
export const REFUND_EXAMPLE = { daysStarted: 6, used: 8 } as const;

export interface RefundExample extends RefundResult {
  price: number;
  days: number;
  daysStarted: number;
  daysPercent: number;
  used: number;
  included: number;
  usedAssessmentsPercent: number;
  refundPercent: number;
}

/** The worked example, with the plan on sale. */
export function refundExample(): RefundExample {
  const plan = AVAILABLE_PAID_PLANS[0]!;
  const included = REFUND_COUNTED_ASSESSMENTS;
  const result = refundDue({ price: plan.amount, days: plan.days, daysStarted: REFUND_EXAMPLE.daysStarted, included, used: REFUND_EXAMPLE.used });
  return {
    ...result,
    price: plan.amount,
    days: plan.days,
    daysStarted: REFUND_EXAMPLE.daysStarted,
    daysPercent: Math.round((REFUND_EXAMPLE.daysStarted * 100) / plan.days),
    used: REFUND_EXAMPLE.used,
    included,
    usedAssessmentsPercent: Math.round((REFUND_EXAMPLE.used * 100) / included),
    refundPercent: 100 - result.usedPercent,
  };
}

/** Working days the money takes to go back once a request is accepted. */
export const REFUND_WORKING_DAYS = 10;
/** Calendar days within which a complaint gets a reasoned written answer. */
export const COMPLAINT_ANSWER_DAYS = 10;
