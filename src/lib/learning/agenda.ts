/* The Course agenda: one readable entry per day of the rolling schedule, and
 * one row per activity in the selected day.
 *
 * Platform audit 2026-09-23: the week view squeezed seven narrow columns side
 * by side and truncated every activity title. Codex is replacing it with a
 * compact week selector and a selected-day agenda; this module is the data
 * contract that design renders, so the agenda cannot drift from Today:
 *
 *  - Today's entries are the live session's own steps (the ones TodaySession
 *    shows), with their real done state and real links.
 *  - Later days are what the plan currently expects, resolved from the
 *    catalogue. They are `planned`: never linked and never ticked, because
 *    the plan only fixes today (architecture 2.5) and a later day can change
 *    after the next piece of evidence.
 *  - Nothing here invents progress. A day with no activities is a rest,
 *    light-review, exam or assessment day by the planner's own `kind`.
 *
 * Pure: the caller passes the plan, the session and the locale.
 */
import { findActivity } from './catalog';
import { learningText } from './ru';
import { activityTitle, type SharedSessionView } from './adapters';
import { describeSubskill } from './evidence';
import type { PersonalPlanV1, ScheduledDay } from './contracts/plan';
import type { ActivityKind, LearningDomain, Paper } from './contracts/catalog';
import type { Locale } from '../i18n/locale';

export type AgendaItemState =
  /** Today, finished. */
  | 'done'
  /** Today, the step the student is on now (the session's `current`). */
  | 'current'
  /** Today, still to come after the current one, or skipped. */
  | 'todo'
  /** A later day: what the plan expects, not yet fixed. */
  | 'planned';

export interface AgendaItem {
  /** Unique within its day: the step id today, the activity id otherwise. */
  key: string;
  activityId: string;
  /** What to show as the row's name, already in the student's language
      where a translation exists. English exam names (question types) stay
      English, as everywhere else on the site. */
  title: string;
  /** True when `title` is the activity's one-sentence objective because no
      short real name exists yet (every drill, exercise and task today; only
      lessons have titles). A design can then show `subskillName` as the
      row's name and the objective as its description, instead of truncating
      a sentence. */
  titleIsObjective: boolean;
  /** A second line under the title, or null: today, the planner's purpose
      for the step when the title is a real name; a later day, the objective
      sentence when the title is a real name. Never repeats `title`. */
  detail: string | null;
  /** The question type or skill practised, in plain words ('sentence
      completion', 'full paper', 'essay'). Exam names stay English in both
      languages, as everywhere else on the site. Null when unknown. */
  subskillName: string | null;
  /** Null for vocabulary and exam-skills work, which belong to no one paper. */
  paper: Paper | null;
  domain: LearningDomain | null;
  kind: ActivityKind | null;
  /** The planning estimate, never measured time. */
  minutes: number;
  state: AgendaItemState;
  /** Only today's steps link anywhere; a later day's plan is not a promise. */
  href: string | null;
  /** A full paper or a mock: cannot be split across days. */
  indivisible: boolean;
}

export interface AgendaDay {
  /** Local yyyy-mm-dd. */
  date: string;
  /** 0 = Sunday, as Date#getDay, for the week selector's short labels. */
  weekday: number;
  isToday: boolean;
  kind: ScheduledDay['kind'];
  /** The day's time budget from the plan. */
  budgetMinutes: number;
  /** Sum of the items' estimates; can be lower than the budget. */
  plannedMinutes: number;
  /** What the day is for, one line, already localised where possible. */
  focus: string;
  items: AgendaItem[];
  /** Counts for the week selector's badges. Only today can have done items. */
  doneCount: number;
  totalCount: number;
}

export interface CourseAgenda {
  days: AgendaDay[];
  /** The day to select when the agenda first opens: today when the schedule
      contains it, otherwise the first day. Null for an empty schedule. */
  initialDate: string | null;
}

function weekdayOf(date: string): number {
  /* Noon, not midnight, so a DST jump can never move the day. */
  return new Date(`${date}T12:00:00`).getDay();
}

/** The site dictionary's t(), passed in so this module stays pure and so a
    title registered there (a lesson's own title) is translated the one way
    every other screen translates it. */
export type Translate = (english: string) => string;

function todayItems(session: SharedSessionView, t: Translate): AgendaItem[] {
  const currentId = session.current?.stepId ?? null;
  return session.steps.map((step) => {
    const activity = findActivity(step.activityId);
    const state: AgendaItemState =
      step.state === 'done' ? 'done' : step.stepId === currentId ? 'current' : 'todo';
    return {
      key: step.stepId,
      activityId: step.activityId,
      /* `title` is the real name (a lesson title), registered with the site
         dictionary; `purpose` is the planner's own sentence, already in the
         session's language. */
      title: step.title ? t(step.title) : step.purpose,
      detail: step.title && step.title !== step.purpose ? step.purpose : null,
      /* Today's fallback is the planner's per-role purpose, not the
         objective: it already names what the step is for. */
      titleIsObjective: false,
      subskillName: describeSubskill(step.subskill, step.paper ?? null),
      paper: step.paper ?? null,
      domain: activity?.domain ?? null,
      kind: step.kind,
      minutes: step.minutes,
      state,
      href: step.href,
      indivisible: step.indivisible,
    };
  });
}

function plannedItems(day: ScheduledDay, locale: Locale, t: Translate): AgendaItem[] {
  const items: AgendaItem[] = [];
  const seen = new Set<string>();
  for (const id of day.activityIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const activity = findActivity(id);
    /* An id the library no longer has is left out rather than shown as a
       nameless row: a later day is only an expectation. */
    if (!activity) continue;
    /* The same real name Today shows for this activity (a lesson's own
       title); the objective sentence only when none exists yet. */
    const name = activityTitle(id, activity);
    items.push({
      key: id,
      activityId: id,
      title: name ? t(name) : learningText(locale, activity.objective),
      titleIsObjective: !name,
      detail: name ? learningText(locale, activity.objective) : null,
      subskillName: describeSubskill(activity.subskill, activity.paper ?? null),
      paper: activity.paper ?? null,
      domain: activity.domain,
      kind: activity.kind,
      minutes: activity.expectedMinutes,
      state: 'planned',
      href: null,
      indivisible: activity.indivisible,
    });
  }
  return items;
}

export function courseAgenda(
  plan: PersonalPlanV1 | null,
  session: SharedSessionView | null,
  locale: Locale,
  t: Translate = (english) => english,
): CourseAgenda {
  if (!plan || plan.schedule.length === 0) return { days: [], initialDate: null };
  const days = plan.schedule.map((day): AgendaDay => {
    const isToday = session !== null && day.date === session.date;
    /* Today is always the live session, the same list Today shows, even
       when the stored day lists nothing (a student-chosen alternative). */
    const items = isToday && session ? todayItems(session, t) : plannedItems(day, locale, t);
    return {
      date: day.date,
      weekday: weekdayOf(day.date),
      isToday,
      kind: day.kind,
      budgetMinutes: day.budgetMinutes,
      plannedMinutes: items.reduce((sum, item) => sum + item.minutes, 0),
      focus: learningText(locale, day.focus),
      items,
      doneCount: items.filter((item) => item.state === 'done').length,
      totalCount: items.length,
    };
  });
  const today = days.find((day) => day.isToday);
  return { days, initialDate: today?.date ?? days[0]?.date ?? null };
}
