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

import type { Confirmation, PlanStatus, SessionStepRole } from '../../../lib/learning/contracts/plan';
import type { Paper, Subskill } from '../../../lib/learning/contracts/catalog';
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
  /** True once the student has pressed "answer later" on the intake, this
      visit or a recent one (src/components/learning/today/intakeDeferral.ts
      persists it for a few days so a reload does not ask again straight
      away). An unconfirmed goal is asked about again once that window
      passes, or the moment the student asks to set it, which is honest
      rather than either nagging every reload or never asking again. */
  intakeDeferred: boolean;
  /** True once the intake is actually on screen and has not yet told Today
      it is done (its own onDone, after the student has SEEN the saved
      outcome, or onDefer). Sticky on purpose: saving inside the intake
      confirms the plan immediately, which would otherwise flip `confirmed`
      to true mid-render and unmount the intake before its own "plan saved"
      screen ever painted (the exact bug this field exists to close). Once
      true it holds the intake screen regardless of what `confirmed` or
      `intakeDeferred` say, until the caller clears it from onDone/onDefer. */
  intakeInProgress: boolean;
}

/** One screen, in priority order. An intake already on screen stays on
    screen until it says it is done (see intakeInProgress above), even if
    saving already confirmed the plan underneath it. Otherwise, a session
    with no confirmed goal asks first, unless the student deferred it. A
    passed exam date is its own screen because "set a new date" is not a
    four-question study session. Everything else is the ordinary session
    card. */
export function selectTodayScreen(input: TodayScreenInput): TodayScreen {
  if (input.intakeInProgress) return 'intake';
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

/* ── The kicker: which paper, which question type ────────────────────────── */

export interface SessionKicker {
  paper: Paper;
  /** Already plain, lower-cased words ('sentence completion'). Deliberately
      NOT translated: this codebase keeps the exam's own names for its
      question types in English even inside Russian text (see
      src/lib/i18n/dict/ru/parts/strategies.ts's header), because the
      student has to recognise the same words on the real paper. The
      caller renders `t(PAPER_LABEL[paper])` for the paper half and this
      string untouched for the second half. */
  type: string;
}

/** The quiet line above the headline: which paper this session is about,
    and its question type or subskill in plain words. Null when the
    session has no single paper (a mock, a planning step), since there is
    nothing honest and specific to say. */
export function sessionKicker(paper: Paper | undefined, subskill: Subskill): SessionKicker | null {
  if (!paper) return null;
  return { paper, type: humaniseSubskill(subskill) };
}

/* ── A step's main line and whether its purpose adds anything ────────────── */

/** The text to show as a step's main line: the real thing it opens when
    one is known, falling back to the caller's own composed label (built
    from kind/paper/subskill, since the shared view only carries a
    catalogue title where one already exists) and, failing that, the
    planner's own purpose sentence, so a step is never left with nothing to
    show under its role. */
export function stepTitleFor(step: Pick<SharedStepView, 'title' | 'purpose'>, fallback: string): string {
  return step.title || fallback || step.purpose;
}

/** Whether the purpose sentence is worth a quieter second line under the
    step's title. Skipped when it is empty, or when it just repeats the
    title (a fallback title built FROM the purpose, or a step whose title
    and purpose happen to already say the same thing): showing the same
    sentence twice would recreate the exact "reads identically" bug this
    is meant to close, just inside one step instead of across two. */
export function stepPurposeAddsSomething(title: string, purpose: string): boolean {
  const trimmedPurpose = purpose.trim();
  if (!trimmedPurpose) return false;
  return trimmedPurpose.toLowerCase() !== title.trim().toLowerCase();
}

/** The paper to call out on a step, or null when it needs no callout. Only
    a step from a DIFFERENT paper than the session's own needs one (the
    brief's example: a Listening "first look" sample inside a Reading
    session). A step that matches the session's paper, or carries none at
    all (a mock, a planning step), says nothing extra. */
export function stepForeignPaper(stepPaper: Paper | undefined, sessionPaper: Paper | undefined): Paper | null {
  if (!stepPaper) return null;
  if (!sessionPaper) return null;
  return stepPaper !== sessionPaper ? stepPaper : null;
}

/* ── The daily-minutes target (item 5) ────────────────────────────────────── */

/** What to show as today's minutes target, or null to show none at all.
 *
 *  A brand-new student has never confirmed a daily time, so
 *  `regularDailyMinutesStatus` is 'provisional': the 60-minute figure
 *  behind it is the platform's own recommendation, not a number the
 *  student chose, and showing it as "0 / 60 min today" (or the even more
 *  wrong old 25-minute fallback) reads as a target nobody set. Once
 *  confirmed, `budgetMinutes` (today's actual planned budget) is the right
 *  figure on every ordinary day AND on a temporary short day: the planner
 *  only ever shortens `budgetMinutes` for "I have less time today", never
 *  the stored `regularDailyMinutes` preference itself, so this one number
 *  already reads correctly in both cases with no separate branch. */
export function dailyMinutesGoal(
  status: Confirmation | undefined,
  budgetMinutes: number,
): number | null {
  return status === 'confirmed' ? budgetMinutes : null;
}

/* ── The scope note: a short line plus a collapsed list (item 7) ─────────── */

/** Splits a planner-written note into its sentences. The planner (which
    this file must not edit; see planner.ts's PLANNER_SENTENCES) sometimes
    concatenates several honest sentences into one `scopeNote` string with
    a single space between them (one per condition that applies: a short
    deadline, a missed run, a stuck scope, and so on), which is what reads
    as one long run-on paragraph. This is presentation-only: it never
    changes the words, only where they break. */
export function splitScopeNote(note: string): readonly string[] {
  return note
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export interface ScopeNoteView {
  /** Always shown: the first sentence. */
  headline: string;
  /** Shown plainly, straight after the headline, when there are few enough
      that a short extra line does not read as a wall of text (three
      sentences total or fewer). */
  inline: readonly string[];
  /** Shown behind an "and {n} more" toggle instead, when there are more
      than three sentences total: the point where a plain paragraph turns
      into exactly the run-on the brief asks to fix. */
  collapsed: readonly string[];
}

/** Null for an empty note (nothing to show). Never invents a summary: the
    "short sentence" is always the planner's own first sentence, verbatim. */
export function scopeNoteView(note: string | null | undefined): ScopeNoteView | null {
  if (!note) return null;
  const sentences = splitScopeNote(note);
  const [headline, ...rest] = sentences;
  if (!headline) return null;
  if (rest.length > 2) return { headline, inline: [], collapsed: rest };
  return { headline, inline: rest, collapsed: [] };
}
