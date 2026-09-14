/* The one-line "Your plan" summary shared by the Course settings strip and
   the Today card, so the two surfaces can never drift out of sync on how
   the plan reads in prose ("Band 7.0 target, 8 weeks, 25 min a day"). Pure
   — derives everything from the plan and its resolved schedule parameters,
   no storage access of its own. */

import { daysUntilTest, type SavedPlan } from '../study-plan';
import { resolvePlanParams } from './schedule';
import { daysBetween } from './date';

export interface PlanSummary {
  /** e.g. "Band 7.0 target, 8 weeks, 25 min a day" with no exam date set,
      or "Band 7.0 target, 38 days to go, 25 min a day" once one is. */
  text: string;
  /** Quiet nudge shown only while the plan is still the untouched default
      (SavedPlan.defaulted) — never a modal, just a line of copy. */
  hint: string | null;
}

export function getPlanSummary(plan: SavedPlan): PlanSummary {
  const params = resolvePlanParams(plan);
  const daysToGo = plan.testDate ? daysUntilTest(plan.testDate) : null;
  const weeks = Math.max(1, Math.round(daysBetween(params.startDate, params.examDate) / 7));
  const pace = daysToGo !== null ? `${daysToGo} day${daysToGo === 1 ? '' : 's'} to go` : `${weeks} week${weeks === 1 ? '' : 's'}`;
  const text = `Band ${plan.targetBand} target, ${pace}, ${params.dailyMinutes} min a day`;
  const hint = plan.defaulted ? 'Set your exam date to pace the plan' : null;
  return { text, hint };
}
