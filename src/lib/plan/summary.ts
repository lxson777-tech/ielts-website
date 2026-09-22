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
import { SHORT_DEADLINE_DAYS } from '../learning/contracts/plan';
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
  /** True when the planner's own output says the time is tight: it dropped
      real work for lack of days, or the exam sits inside its
      SHORT_DEADLINE_DAYS window. The headline then states what the time can
      and cannot cover, and the panel drops its neutral tone. */
  scopeTight: boolean;
}

function droppedMilestoneReasons(milestones: readonly Milestone[]): readonly string[] {
  return milestones
    .filter((milestone): milestone is Milestone & { droppedReason: string } =>
      milestone.state === 'dropped' && Boolean(milestone.droppedReason),
    )
    .map((milestone) => milestone.droppedReason);
}

/** Days from the day this plan was built for to the exam, or null with no
    date. `activeSession.date` is the local day the planner ran for
    (contracts/plan.ts), which is the same "today" the planner measured
    `daysToExam` against, so this stays pure: no clock, no storage, and the
    same answer every time for the same plan. */
function daysToExam(plan: PersonalPlanV1): number | null {
  const exam = plan.goals.examDate?.date;
  if (!exam) return null;
  return daysBetween(plan.activeSession.date, exam);
}

/** Is the planner itself saying the time is tight?

    Two signals, both already on the plan, so nothing is added to
    `PersonalPlanV1` for this: a milestone it had to drop for lack of days
    (`state: 'dropped'` with a `droppedReason`, planner.ts buildMilestones),
    or an exam inside SHORT_DEADLINE_DAYS, the same window that makes it
    write its short-deadline scope note in the first place.

    `scopeNote` on its own is deliberately NOT one of them: the planner also
    writes that note for a missing date, a passed date and a paper with no
    short sample, none of which means the daily time is too small. */
function scopeIsTight(plan: PersonalPlanV1, droppedMilestones: readonly string[]): boolean {
  if (droppedMilestones.length > 0) return true;
  const days = daysToExam(plan);
  return days !== null && days >= 0 && days <= SHORT_DEADLINE_DAYS;
}

/** What the chosen time CAN cover and what it cannot, for a plan the planner
    itself reports as tight.

    Never the word "enough". A tester on 22 September 2026 set 7 days and 15
    minutes a day and read "15 minutes a day is enough to make steady, honest
    progress toward your goal." with "There are not enough study days left
    before the exam to reach this." directly beneath it: the plan
    contradicting itself in two adjacent lines. Nothing here promises a band
    either (architecture section 5.7). */
function tightScopeHeadline(plan: PersonalPlanV1, minutes: number): string {
  const days = daysToExam(plan);
  if (days === null || days < 0) {
    return t(
      '{minutes} minutes a day can cover a few priorities properly. It cannot cover everything your goal needs, and it cannot promise a band.',
      { minutes },
    );
  }
  return t(
    'With {pace} until the exam, {minutes} minutes a day can cover a few priorities properly. It cannot cover everything your goal needs, and it cannot promise a band.',
    { pace: tn(days, { one: '{n} day', other: '{n} days' }), minutes },
  );
}

/** Read straight off the planner's own output, exactly as WP10 was asked to:
    `status`, `scopeNote`, `schedule` (via `constraints.regularDailyMinutes`,
    which is what actually paced it) and `milestones`. Nothing here recomputes
    a schedule or guesses at a band; it only puts the plan's own honest words
    in front of the student after a save.

    The headline depends on `status` AND on the scope the planner reported
    (see `scopeIsTight`), because the two can disagree: a plan can be
    perfectly "on-track" and still have had to drop work for lack of days,
    and the student must not be told both at once. */
export function planOutcome(plan: PersonalPlanV1): PlanOutcomeSummary {
  const minutes = plan.constraints.regularDailyMinutes;
  const droppedMilestones = droppedMilestoneReasons(plan.milestones);
  const scopeTight = scopeIsTight(plan, droppedMilestones);

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
        /* A running plan. It may say the time is workable only when the
           planner did not have to leave real work out. */
        return scopeTight
          ? tightScopeHeadline(plan, minutes)
          : t('{minutes} minutes a day is enough to make steady, honest progress toward your goal.', { minutes });
    }
  })();

  return { status: plan.status, headline, scopeNote: plan.scopeNote ?? null, droppedMilestones, scopeTight };
}
