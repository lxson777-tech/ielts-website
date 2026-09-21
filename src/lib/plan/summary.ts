/* The one-line "Your plan" summary shared by the Course settings strip and
   the Today card, so the two surfaces can never drift out of sync on how
   the plan reads in prose ("Band 7.0 target, 8 weeks, 25 min a day"). Pure
   — derives everything from the plan and its resolved schedule parameters,
   no storage access of its own. */

import { daysUntilTest, type SavedPlan } from '../study-plan';
import { resolvePlanParams } from './schedule';
import { daysBetween } from './date';
import { t, tn } from '../i18n/translate';

export interface PlanSummary {
  /** e.g. "Band 7.0 target, 8 weeks, 25 min a day" with no exam date set,
      or "Band 7.0 target, 38 days to go, 25 min a day" once one is. */
  text: string;
  /** Quiet nudge shown only while the plan is still the untouched default
      (SavedPlan.defaulted) — never a modal, just a line of copy. */
  hint: string | null;
}

/* Called fresh on every render of its callers (never memoized against
   locale), so translating directly here with t()/tn() stays reactive to a
   live language switch, the same as everywhere else in this batch. */
export function getPlanSummary(plan: SavedPlan): PlanSummary {
  const params = resolvePlanParams(plan);
  const daysToGo = plan.testDate ? daysUntilTest(plan.testDate) : null;
  const weeks = Math.max(1, Math.round(daysBetween(params.startDate, params.examDate) / 7));
  const pace =
    daysToGo !== null
      ? tn(daysToGo, { one: '{n} day to go', other: '{n} days to go' })
      : tn(weeks, { one: '{n} week', other: '{n} weeks' });
  const text = t('Band {band} target, {pace}, {minutes} min a day', {
    band: plan.targetBand,
    pace,
    minutes: params.dailyMinutes,
  });
  const hint = plan.defaulted ? t('Set your exam date to pace the plan') : null;
  return { text, hint };
}
