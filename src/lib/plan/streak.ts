/* Daily-goal and streak calculations, built on top of progress.ts's activity
   log (see DayActivity there). Kept out of progress.ts on purpose: progress
   is a generic "what has the student done" store with no idea a study plan
   exists, and the goal/streak maths needs the plan's daily-minutes target
   and study-days setting. Everything here is pure except the reads of the
   activity log itself. */

import { getActivity } from '../progress';
import type { SavedPlan } from '../study-plan';
import { addDays, isWeekday, toLocalDateKey } from './date';

export const DEFAULT_DAILY_MINUTES = 25;

function goalMinutes(plan: SavedPlan | null): number {
  return plan?.dailyMinutes ?? DEFAULT_DAILY_MINUTES;
}

/** Whether `date` counts as a study day under the plan's studyDays setting.
    No plan, or 'daily', means every day counts; 'weekdays' skips Sat/Sun. A
    weekday-only student isn't penalised for a quiet Saturday, in either the
    streak or the schedule. */
export function isPlannedStudyDay(plan: SavedPlan | null, date: string): boolean {
  if (plan?.studyDays === 'weekdays') return isWeekday(date);
  return true;
}

/** Consecutive planned study days, counting back from today, where the
    daily goal was met. Today is treated more gently than the closed-out
    days behind it: any activity at all today already extends the streak,
    rather than making the student wait until the full goal is hit before it
    "counts" — the point is to reward showing up, not to threaten a streak
    that's still live and has hours left to run. Past days still need the
    full goal to have been met. Unplanned days (a weekend on a
    weekdays-only plan) are skipped over rather than breaking the count. */
export function getStreak(plan: SavedPlan | null, today: Date = new Date()): number {
  const goal = goalMinutes(plan);
  const activity = getActivity();
  const todayStr = toLocalDateKey(today);
  const todayMinutes = activity[todayStr]?.minutes ?? 0;

  let streak = 0;
  let cursor = addDays(todayStr, -1);
  if (todayMinutes > 0) streak++;

  // A ten-year lookback is far more than any real streak or plan needs;
  // it's just a hard stop so a data bug can never loop forever.
  for (let guard = 0; guard < 3650; guard++) {
    if (!isPlannedStudyDay(plan, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    const minutes = activity[cursor]?.minutes ?? 0;
    if (minutes < goal) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface StreakDay {
  date: string;
  minutes: number;
  met: boolean;
  planned: boolean;
}

/** The last 14 calendar days (oldest first, today last) for the streak dot
    row. Includes unplanned days too — the dashboard dims those rather than
    hiding them, so the week still reads as a normal calendar strip. */
export function getLast14Days(plan: SavedPlan | null, today: Date = new Date()): StreakDay[] {
  const goal = goalMinutes(plan);
  const activity = getActivity();
  const todayStr = toLocalDateKey(today);
  const out: StreakDay[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = addDays(todayStr, -i);
    const minutes = activity[date]?.minutes ?? 0;
    out.push({ date, minutes, met: minutes >= goal, planned: isPlannedStudyDay(plan, date) });
  }
  return out;
}

export interface TodayGoalProgress {
  minutes: number;
  /** Null while there is no honest target to show (see getTodayGoalProgress
      below): a surface should show the streak on its own and no minutes
      target at all rather than invent one. */
  goal: number | null;
  percent: number | null;
}

/** Today's minutes studied against a daily goal, for the slim progress bar
    and the dashboard's "{minutes} / {goal} min today" chip. Capped at
    100% — going past the goal doesn't overflow the bar, it just stays
    full.
 *
 *  `goal` is supplied by the caller rather than read from the old
 *  `SavedPlan` here (which is what this function did until the Today
 *  polish round, 2026-09-22: `plan?.dailyMinutes ?? DEFAULT_DAILY_MINUTES`
 *  fell back to a flat 25 for a student who had never confirmed any daily
 *  time, showing "0 / 25 min today" on a brand-new dashboard, a number
 *  nobody chose and one that contradicts the platform's own 60-minute
 *  recommendation). The caller (LearningDashboard.tsx) now works the
 *  honest figure out from the shared session view: null while
 *  `regularDailyMinutesStatus` is 'provisional', otherwise today's actual
 *  planned budget (`session.budgetMinutes`), which is already the
 *  student's own regular minutes on an ordinary day and today's shorter
 *  budget on a temporary short day, with `regularDailyMinutes` itself
 *  untouched either way. Passing `null` here shows no target, only the
 *  minutes actually studied. */
export function getTodayGoalProgress(goal: number | null, today: Date = new Date()): TodayGoalProgress {
  const minutes = getActivity()[toLocalDateKey(today)]?.minutes ?? 0;
  if (goal === null) return { minutes, goal: null, percent: null };
  return { minutes, goal, percent: Math.min(100, Math.round((minutes / goal) * 100)) };
}
