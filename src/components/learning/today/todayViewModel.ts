/* Pure view-model helpers for the Today block.
 *
 * WHY THIS FILE IS SEPARATE FROM THE COMPONENTS
 * tests/*.test.ts run under plain node:test, with no DOM (architecture
 * section 1.7). Everything here takes plain values in and returns plain
 * values out, so the state a student sees can be tested without a browser.
 * The components in this folder call these functions; they do not
 * reimplement the decisions.
 *
 * WHAT THIS DOES NOT DO
 * It never calls replan, never reaches for storage, and never invents a
 * "next" of its own. Every function takes the shared session (or one of its
 * pieces) as an argument and only decides how to PRESENT it.
 */

import type { PlanStatus, SessionStepRole } from '../../../lib/learning/contracts/plan';
import type { Paper } from '../../../lib/learning/contracts/catalog';
import type { SharedSessionView, SharedStepView } from '../../../lib/learning';

/* ── Which screen Today shows ────────────────────────────────────────────── */

export type TodayScreen =
  /** Goals have never been confirmed, and the student has not asked to
      answer later this visit. */
  | 'intake'
  /** The exam date is in the past. Never a completion message. */
  | 'date-passed'
  /** Every step of today's session is done or skipped. */
  | 'finished'
  /** The normal four-question session card, with contextual notes layered
      on for provisional pacing, recovery, a short deadline or a stuck scope
      (all carried in `session.scopeNote`, one honest sentence at a time). */
  | 'active';

export interface TodayScreenInput {
  confirmed: boolean;
  planStatus: PlanStatus;
  /** True once every step is 'done' or 'skipped'. Computed by
      `isSessionFinished` from the real steps; passed in here rather than
      recomputed so the two never disagree. */
  finished: boolean;
  /** True once the student has pressed "answer later" on the intake this
      visit. Component state, not persisted: an unconfirmed goal is asked
      about again next visit, which is honest rather than nagging. */
  intakeDeferred: boolean;
}

/** One screen, in priority order. A session with no confirmed goal always
    asks first, unless the student just deferred it. A passed exam date is
    its own screen because "set a new date" is not a four-question study
    session. Everything else is the ordinary session card. */
export function selectTodayScreen(input: TodayScreenInput): TodayScreen {
  if (!input.confirmed && !input.intakeDeferred) return 'intake';
  if (input.planStatus === 'date-passed') return 'date-passed';
  if (input.finished) return 'finished';
  return 'active';
}

/** Every step done or skipped. A session with no steps at all (should not
    happen, but never crash on it) counts as not finished: there is nothing
    to say was demonstrated. */
export function isSessionFinished(session: Pick<SharedSessionView, 'steps' | 'state'>): boolean {
  if (session.state === 'completed') return true;
  if (session.steps.length === 0) return false;
  return session.steps.every((step) => step.state === 'done' || step.state === 'skipped');
}

/* ── One step's status on screen ─────────────────────────────────────────── */

export type StepStatus = 'done' | 'current' | 'upcoming' | 'skipped';

/** `step.state` already carries 'pending' | 'in-progress' | 'done' |
    'skipped'; this only renames 'pending'/'in-progress' to 'upcoming'/
    'current' by comparing against the session's own current step id, so a
    step that is technically 'pending' but happens to be the one the student
    is on reads as current rather than as one of several identical dots. */
export function stepStatus(step: Pick<SharedStepView, 'stepId' | 'state'>, currentStepId: string | null): StepStatus {
  if (step.state === 'done') return 'done';
  if (step.state === 'skipped') return 'skipped';
  return step.stepId === currentStepId ? 'current' : 'upcoming';
}

/* ── The main button ─────────────────────────────────────────────────────── */

export type MainAction = 'start' | 'continue';

/** "Start" until the first step has been touched, "Continue" once any step
    has moved past 'pending' — a refresh or a return mid-session must never
    show "Start" again over work already begun. */
export function mainAction(steps: readonly Pick<SharedStepView, 'state'>[]): MainAction {
  return steps.some((step) => step.state !== 'pending') ? 'continue' : 'start';
}

/* ── Roles, in plain words ───────────────────────────────────────────────── */

export const STEP_ROLE_LABEL: Readonly<Record<SessionStepRole, string>> = {
  recall: 'Recall',
  teach: 'Teach',
  practise: 'Practise',
  feedback: 'Feedback',
  'independent-check': 'Independent check',
  recap: 'Recap',
  assess: 'First look',
  review: 'Review',
};

export const PAPER_LABEL: Readonly<Record<Paper, string>> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

/** 'matching-headings' -> 'matching headings'. Same rule the planner itself
    uses for a plain-language scope name (see humanScope in planner.ts),
    written out again here because that function is not exported: the
    catalogue's subskill strings are already plain English words joined by
    hyphens, so undoing the hyphen is the whole job. */
export function humaniseSubskill(subskill: string): string {
  return subskill.replace(/-/g, ' ');
}

/* ── The old "Course view" preference, carried forward ───────────────────── */

export type CourseView = 'route' | 'sections';

/** The segmented control used to store 'order' | 'sections'. 'order' is
    renamed to 'route' (the guided list is now "Your route"); anything else
    unrecognised, including a stale or corrupted value, falls back to
    'route' rather than 'sections', so a student who has never chosen never
    lands on the library view by accident. */
export function mapStoredCourseView(stored: string | null): CourseView {
  if (stored === 'sections') return 'sections';
  return 'route';
}

/* ── "I have less time today" ────────────────────────────────────────────── */

/** The two choices the secondary action offers, exactly as the brief
    states them: 15 or 25 minutes, for today only. */
export const SHORT_DAY_MINUTES: readonly (15 | 25)[] = [15, 25] as const;

/* ── Focus areas, honestly ───────────────────────────────────────────────── */

export interface FocusAreaCertainty {
  paper: Paper;
  /** False while the paper is still in `diagnosticsOutstanding`, shown as
      "not yet assessed", in words, never as a number. Nothing on this side
      of the component tree has a real band to show without reaching into
      the policy layer, and inventing one here would be exactly the
      unearned-mastery mistake the brief warns against. */
  certain: boolean;
}

/** Whole days from `today` to `dateKey`, both 'yyyy-mm-dd'. Positive when
    the date is still ahead. Pure so a countdown can be tested without a
    clock: the caller supplies "today" the same way the planner does. */
export function daysUntil(dateKey: string, today: string): number {
  const from = Date.parse(`${today}T00:00:00Z`);
  const to = Date.parse(`${dateKey}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/** One entry per paper for the quiet "focus areas" panel: honest about what
    is still unknown, silent about anything this view has no real number
    for. */
export function focusAreas(papers: readonly Paper[], diagnosticsOutstanding: readonly Paper[]): FocusAreaCertainty[] {
  const outstanding = new Set(diagnosticsOutstanding);
  return papers.map((paper) => ({ paper, certain: !outstanding.has(paper) }));
}
