/* The one-line "Your plan" summary shared by the Course settings strip and
   the Today card, so the two surfaces can never drift out of sync on how
   the plan reads in prose ("Band 7.0 target, 8 weeks, 25 min a day"). Pure
   — derives everything from the plan and its resolved schedule parameters,
   no storage access of its own.

   `getPlanSummary` reads the OLD `SavedPlan` and keeps working exactly as
   before: `Course.tsx` and `PlanToday.tsx` (WP8) still call it that way, and
   this file does not touch their signature (architecture section 7, WP10
   acceptance). `planOutcome` below is the new, additive half: a view over
   the real `PersonalPlanV1` (lead decision D1's actual source of truth),
   used by the intake to say honestly what the chosen time and date can
   cover after a save, without predicting a score. */

import { daysUntilTest, type SavedPlan } from '../study-plan';
import { resolvePlanParams } from './schedule';
import { daysBetween } from './date';
import { t, tn } from '../i18n/translate';
import type { Milestone, PersonalPlanV1, PlanStatus } from '../learning/contracts/plan';

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

/* ── Honest budget and deadline feedback, from the real plan ─────────────── */

export interface PlanOutcomeSummary {
  status: PlanStatus;
  /** One or two plain sentences: what the chosen time and date can
      reasonably cover, or the honest state of a plan with no date, a
      recovery in force, or a passed exam date. Never predicts a score
      (architecture section 5.7, brief section 5). */
  headline: string;
  /** What will not fit, in the planner's own words (`scopeNote`). Null when
      there is nothing to warn about. */
  scopeNote: string | null;
  /** Milestones the planner had to drop to stay honest about the time
      available, each with the reason it gives (architecture section 5.7). */
  droppedMilestones: readonly string[];
}

function droppedMilestoneReasons(milestones: readonly Milestone[]): readonly string[] {
  return milestones
    .filter((milestone): milestone is Milestone & { droppedReason: string } =>
      milestone.state === 'dropped' && Boolean(milestone.droppedReason),
    )
    .map((milestone) => milestone.droppedReason);
}

/** Read straight off the planner's own output, exactly as WP10 was asked to:
    `status`, `scopeNote`, `schedule` (via `constraints.regularDailyMinutes`,
    which is what actually paced it) and `milestones`. Nothing here recomputes
    a schedule or guesses at a band; it only puts the plan's own honest words
    in front of the student after a save. */
export function planOutcome(plan: PersonalPlanV1): PlanOutcomeSummary {
  const minutes = plan.constraints.regularDailyMinutes;
  const droppedMilestones = droppedMilestoneReasons(plan.milestones);

  const headline = (() => {
    switch (plan.status) {
      case 'date-passed':
        return t('Your exam date has passed. Set a new date, or a new goal, to bring the plan back on track.');
      case 'provisional-no-date':
        return t(
          'No exam date yet, so this plan is provisional. It paces itself from {minutes} minutes a day and will settle down the moment you add a date.',
          { minutes },
        );
      case 'recovering':
        return t(
          'A few study days were missed, so the plan was rebuilt around what is realistically reachable from here.',
        );
      case 'exam-imminent':
        return t(
          'Your exam is very close. The plan is focused on what can still help in the time left, not on new material.',
        );
      case 'goal-met':
        return t('Measured evidence shows you meeting your confirmed goal.');
      default:
        return t('{minutes} minutes a day is enough to make steady, honest progress toward your goal.', { minutes });
    }
  })();

  return { status: plan.status, headline, scopeNote: plan.scopeNote ?? null, droppedMilestones };
}
