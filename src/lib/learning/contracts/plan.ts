/* One personal plan, and one current session.
 *
 * WHAT THIS REPLACES
 * Three engines decide "what next" today and they disagree, which is the
 * audit's first reproduced finding:
 *   courseStatus()   src/lib/course.ts:186   first unfinished lesson in a
 *                    fixed eight-unit order
 *   getTodayPlan()   src/lib/plan/schedule.ts:384   a calendar built by
 *                    spreading the same eight units over the days available
 *   recommendNext()  src/lib/tutor/recommend.ts:125   evidence-driven, and
 *                    the only one of the three that looks at results
 *
 * After this, all three become thin adapters over PlanSession, and no screen
 * keeps a competing primary action.
 *
 * STABILITY IS A FEATURE
 * The active session does not change because a page was refreshed or because
 * an AI reply arrived late. It changes on exactly four triggers (see
 * ReplanTrigger). Anything else reads the stored session as it is.
 *
 * THE BUDGET IS A HARD CONSTRAINT
 * A session's steps must fit `budgetMinutes`. An indivisible activity that
 * does not fit is offered as an explicit longer commitment the student
 * accepts, or scheduled on a day that has room. A full Reading paper takes
 * its own hour; its review is a separate session. The audit found a
 * 255-minute day under a 15-minute setting, and this contract is what makes
 * that representable as a refusal rather than as a list.
 */

import type { Locale } from '../../i18n/locale';
import type { Paper, Subskill } from './catalog';
import type { PolicyScopeKey } from './policy';

/* ── Goals ───────────────────────────────────────────────────────────────── */

/** Anything the student could have told us, and whether they actually did.
    `provisional` means the platform filled it in so the product works; it
    must be shown as a suggestion and never as their commitment. */
export type Confirmation = 'confirmed' | 'provisional';

export interface PlanGoals {
  /** Overall band aimed at. */
  overallTarget: { band: number; status: Confirmation } | null;
  /** Minimum required in each paper. A paper with no entry falls back to the
      overall target, exactly as skillTargetFor() does today. */
  perPaperMinimums: Partial<Record<Paper, { band: number; status: Confirmation }>>;
  /** ISO yyyy-mm-dd, or null when there is no booked date. Never invented:
      a null date produces a visibly provisional plan, not a fabricated
      eight-week deadline. */
  examDate: { date: string; status: Confirmation } | null;
  /** Academic is the only supported route until the curriculum covers
      General Training. Stored so the claim is explicit rather than assumed. */
  route: 'academic';
  /** What the student says they already scored, with when. Always labelled. */
  selfReported: readonly { paper?: Paper; band: number; takenOn: string; reportedAt: string }[];
  /** The paper the student says feels hardest, asked during the staged
      diagnostic (lead decision Q4). Self-reported, never measured: it orders
      the diagnostic steps and gives that paper a small starting priority,
      and the first real evidence about any paper overrides it. */
  selfReportedHardestPaper?: { paper: Paper; reportedAt: string };
}

/* ── Constraints ─────────────────────────────────────────────────────────── */

export interface PlanConstraints {
  /** The student's regular daily commitment. A temporary short day is an
      override (see PlanOverride), never a change to this. */
  regularDailyMinutes: DailyMinutes;
  regularDailyMinutesStatus: Confirmation;
  studyDays: 'daily' | 'weekdays' | 'custom';
  /** Used only when studyDays is 'custom'. 0 is Sunday. */
  customStudyDays?: readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
  /** Language the student reads explanations in. Exam material stays
      English. A language preference is never an ability signal. */
  explanationLocale: Locale;
  /** Minutes east of UTC, so day boundaries match the student's calendar.
      Same field and the same reasoning as TutorRequest.tzOffsetMinutes. */
  tzOffsetMinutes: number;
  /** Surfaces the student cannot use right now, so the planner does not
      schedule them: no microphone, no audio, and so on. */
  unavailable?: readonly ('microphone' | 'audio' | 'long-session')[];
}

export type DailyMinutes = 15 | 25 | 40 | 60 | 90;

/* ── A session ───────────────────────────────────────────────────────────── */

/** What one step of a session is for. The audit's example shape is recall,
    teach, practise, feedback plus independent check, recap. It is ONE
    possible shape: the planner varies it by need, and must never pad a
    session with lessons that are not needed. */
export type SessionStepRole =
  | 'recall'
  | 'teach'
  | 'practise'
  | 'feedback'
  | 'independent-check'
  | 'recap'
  | 'assess'
  | 'review';

export interface SessionStep {
  /** Stable within the session, so progress through it survives a refresh. */
  stepId: string;
  role: SessionStepRole;
  activityId: string;
  contentVersion: number;
  minutes: number;
  /** One line, in the student's language, on why this step is here. */
  purpose: string;
  /** Filled in as the student works. The session is resumable because this
      is stored, not held in a component. */
  state: 'pending' | 'in-progress' | 'done' | 'skipped';
  /** Evidence event ids produced by this step. */
  evidenceIds?: readonly string[];
  /** True while the step is waiting on something external, such as a grader
      that has not answered yet. Shown honestly rather than as done. */
  pending?: boolean;
}

export interface PlanSession {
  /** Stable for the life of the session, and referenced by every evidence
      event produced inside it. */
  id: string;
  /** The local date this session is for. */
  date: string;
  /** The single objective. One sentence, the student's language. */
  objective: string;
  objectiveScope: PolicyScopeKey;
  paper?: Paper;
  subskill: Subskill;
  /** Why this, in the student's language, built from real evidence. This is
      what "Why this activity?" shows and what Mr EZ is told to word. */
  reason: string;
  /** Exactly which evidence stands behind the choice, so the explanation is
      checkable and the tutor cannot embellish it. */
  evidenceRefs: readonly SessionEvidenceRef[];
  /** Ordered. Sum of `minutes` must be <= budgetMinutes. */
  steps: readonly SessionStep[];
  budgetMinutes: number;
  /** True when the session contains an indivisible activity that the
      student explicitly agreed to give more time to. */
  extendedCommitment?: { activityId: string; minutes: number; acceptedAt: string };
  state: 'active' | 'completed' | 'abandoned' | 'superseded';
  /** Set when this session was created by accepting an alternative, so the
      record shows the student's choice rather than the planner's. */
  chosenByStudent?: boolean;
}

export interface SessionEvidenceRef {
  /** Evidence event id, or a policy scope when the reason rests on an
      estimate rather than one event. */
  kind: 'event' | 'estimate' | 'due-review' | 'goal' | 'no-evidence';
  ref: string;
  /** The counted sentence, in English, exactly the way
      observationEvidence() produces one today. */
  evidence: string;
}

/* ── The schedule around it ──────────────────────────────────────────────── */

export interface ScheduledDay {
  date: string;
  /** Minutes allotted, after any override for that day. */
  budgetMinutes: number;
  /** What the day is for, one line. */
  focus: string;
  /** Planned activity ids in order. The active session expands only for
      today; future days stay at this level so a replan is cheap and the
      plan does not pretend to know next Thursday in detail. */
  activityIds: readonly string[];
  kind: 'study' | 'rest' | 'assessment' | 'light-review' | 'exam-day';
}

export interface Milestone {
  id: string;
  /** e.g. 'Sit a full Listening paper under timing', 'Task 1 overviews
      demonstrated on unseen data'. */
  label: string;
  targetDate: string | null;
  scopeKey: PolicyScopeKey;
  state: 'planned' | 'met' | 'missed' | 'dropped';
  /** Set when the milestone was dropped because it no longer fits the time
      available, so the interface can say what no longer fits. */
  droppedReason?: string;
}

export interface PlanAlternative {
  /** Shown under "Choose another skill" and "I have less time today". */
  kind: 'shorter' | 'other-skill' | 'longer-commitment' | 'defer-diagnostic';
  label: string;
  /** The session this would become. Precomputed so accepting it is
      instant and deterministic, not another round trip. */
  sessionSketch: { objective: string; activityIds: readonly string[]; minutes: number };
}

/* ── Overrides ───────────────────────────────────────────────────────────── */

/** Something the student asked for that bends the plan without rewriting
    their settings. A temporary short day expires on its own date. */
export type PlanOverride =
  | { kind: 'less-time-today'; date: string; minutes: DailyMinutes; createdAt: string }
  | { kind: 'chose-other-skill'; date: string; paper: Paper; createdAt: string }
  /** The student picked one exact objective rather than a whole paper. Scored
      normally, but it wins ties, and the choice is written into history. */
  | { kind: 'chose-objective'; date: string; scopeKey: PolicyScopeKey; activityId?: string; createdAt: string }
  | { kind: 'skip-activity'; activityId: string; createdAt: string; until?: string }
  | { kind: 'accepted-longer-commitment'; date: string; activityId: string; minutes: number; createdAt: string }
  | { kind: 'deferred-diagnostic'; paper: Paper; createdAt: string; until?: string }
  | { kind: 'rest-day'; date: string; createdAt: string };

/* ── Change history ──────────────────────────────────────────────────────── */

export type ReplanTrigger =
  /** Completed work that actually changes what is known. */
  | 'new-evidence'
  /** Goal, exam date, availability or language edited. */
  | 'settings-changed'
  /** The student chose something else, or asked for less time. */
  | 'student-override'
  /** A new local day began. */
  | 'new-day'
  /** First plan for this student. */
  | 'initial';

export interface PlanChange {
  at: string;
  trigger: ReplanTrigger;
  /** One plain sentence a student can read: "Reading headings are improving,
      so one practice slot moves to Task 1 overviews." */
  summary: string;
  /** Machine-readable detail for tests and for the weekly review. */
  detail?: {
    addedActivityIds?: readonly string[];
    removedActivityIds?: readonly string[];
    movedMilestones?: readonly string[];
    scopeKeys?: readonly PolicyScopeKey[];
  };
  fromRevision: number;
  toRevision: number;
}

/* ── The plan ────────────────────────────────────────────────────────────── */

/** How the plan as a whole should be presented. Replaces the current
    `finished: true` on an expired date, which the audit found being rendered
    as a plan-complete heading while introductory lessons were still
    outstanding. */
export type PlanStatus =
  /** Normal running plan with a confirmed date. */
  | 'on-track'
  /** Running, but no exam date: everything about pacing is provisional. */
  | 'provisional-no-date'
  /** Days were missed; a recovery plan is in force. */
  | 'recovering'
  /** The exam date has passed. Asks for a new date or a new goal. Never
      "course complete". */
  | 'date-passed'
  /** The exam is today or the date is the next study day. */
  | 'exam-imminent'
  /** The student has met every confirmed requirement with measured
      evidence. The only state that may say the goal is reached, and it says
      it about the goal, not about the library. */
  | 'goal-met';

export interface PersonalPlanV1 {
  version: 1;
  /** Bumped on every write. Optimistic concurrency: a write carrying an
      older revision than the server holds is rejected, which is what stops a
      stale device overwriting a newer plan. */
  revision: number;
  /** The evidence version this plan was computed from. */
  evidenceVersion: number;
  /** Set when the plan itself has been confirmed by the student rather than
      fabricated on first visit. The successor to SavedPlan.defaulted. */
  status: PlanStatus;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
  goals: PlanGoals;
  constraints: PlanConstraints;
  /** The one current session every surface reads. */
  activeSession: PlanSession;
  /** Rolling near-term schedule, about a week, today first. */
  schedule: readonly ScheduledDay[];
  milestones: readonly Milestone[];
  alternatives: readonly PlanAlternative[];
  overrides: readonly PlanOverride[];
  /** Newest last, capped at PLAN_HISTORY_MAX entries. */
  history: readonly PlanChange[];
  /** Staged diagnostics still outstanding, so the interface can show what
      is still unknown without pretending to know it. */
  diagnosticsOutstanding: readonly Paper[];
  /** What honestly fits in the time that is left, and what does not, in one
      or two plain sentences. Set whenever the planner had to leave real work
      out: a short deadline, a recovery, a paper with no material short
      enough to sample. Never a promise about a band. Absent when there is
      nothing to warn about. */
  scopeNote?: string;
}

/* ── Named constants ─────────────────────────────────────────────────────── */

export const PERSONAL_PLAN_KEY = 'ielts.learning.plan.v1';

/** The prominent recommended daily commitment for NEW plans. Alex's
    teaching decision, 2026-09-21. An existing student's explicitly chosen
    setting is never overwritten by it. */
export const RECOMMENDED_DAILY_MINUTES: DailyMinutes = 60;

/** Everything the intake offers, recommended value first in the interface. */
export const DAILY_MINUTE_CHOICES: readonly DailyMinutes[] = [15, 25, 40, 60, 90] as const;

/** Days of rolling schedule held in the plan. Longer than this is expressed
    as milestones, not as a day-by-day calendar nobody can keep. */
export const SCHEDULE_HORIZON_DAYS = 7;

/** Change history entries kept. Older ones are dropped, newest last. */
export const PLAN_HISTORY_MAX = 40;

/** A session's steps may exceed the budget by at most this fraction before
    the planner must drop or shorten a step. Zero: the budget is hard. */
export const BUDGET_OVERRUN_ALLOWANCE = 0;

/** Missed study days after which the plan enters `recovering` and rebuilds
    a reachable scope instead of rolling a backlog forward. */
export const RECOVERY_TRIGGER_MISSED_DAYS = 2;

/** The most a recovery plan will ever carry forward, as a multiple of a
    normal day's budget. Past this, work is dropped from the plan and the
    change history says so plainly. */
export const RECOVERY_MAX_BUDGET_MULTIPLE = 1.5;

/** Diagnostic sampling: how many of the first sessions may include a
    diagnostic step, and how many minutes of the first session it may take.
    Short samples identify learning needs; they are never a full band. */
export const DIAGNOSTIC_MAX_SESSIONS = 5;
export const DIAGNOSTIC_MAX_MINUTES_PER_SESSION = 15;

/** Days before the exam below which the planner stops introducing new
    teaching and prioritises consolidation and timing. */
export const SHORT_DEADLINE_DAYS = 10;

/* ── Session shape ───────────────────────────────────────────────────────── */

/** Shorter than this and a step is not worth putting on a screen: the
    student spends the time reading the heading. A step that cannot reach it
    is left out rather than squeezed in. */
export const MIN_STEP_MINUTES = 3;

/** Caps per role, so no single step eats a session. They are ceilings, not
    targets: a step gets the smaller of its cap, its activity's own estimate
    and whatever minutes are still free. All provisional. */
export const RECALL_MAX_MINUTES = 5;
export const TEACH_MAX_MINUTES = 12;
export const CHECK_MAX_MINUTES = 15;
export const RECAP_MAX_MINUTES = 5;

/** The share of a session reserved for doing rather than reading, when
    there is anything to practise at all. Teaching is trimmed before
    practice is. */
export const PRACTISE_MIN_SHARE = 0.4;

/* ── Planner weights ─────────────────────────────────────────────────────── */

/** Every term in the objective score, by name. They are provisional
 *  teaching judgements, configurable in one place so a teacher review can
 *  move them, and nothing in the interface may present them as validated
 *  IELTS science.
 *
 *  All the pressure terms are normalised to roughly 0 to 1 before they are
 *  weighted, so the weights below can be read against each other directly. */
export interface PlannerWeights {
  /** How far this scope is from the band it actually has to reach. The
      largest term: a real, measured shortfall against the student's own
      requirement is the best reason there is to work on something. */
  gap: number;
  /** How far below the weak threshold this exact question type or objective
      is measuring. The paper-level gap says which paper matters; this says
      which part of it, so a Reading student short of their target works on
      the type they keep getting wrong rather than the first one
      alphabetically. */
  weakness: number;
  /** Never assessed at all. Just below a measured gap, because finding out
      is worth nearly as much as fixing a known problem and a plan built on
      nothing is a guess. */
  unknown: number;
  /** Spacing says it is time to prove this again. Retention is cheap to
      keep and expensive to rebuild, so it outranks broad coverage. */
  dueReview: number;
  /** A paper nobody has touched lately. Small: it stops a paper vanishing
      from the plan without letting freshness outrank a real gap. */
  coverage: number;
  /** The exam getting closer. Small on its own; its job is to break ties
      toward work that can still move in the days available. */
  deadline: number;
  /** Subtracted for something worked on in the last few days, so the plan
      does not grind one drill day after day. */
  recency: number;
  /** Subtracted for a measured strength. This is what stops a strong
      Reading student being taught Reading. Deliberately as large as the
      unknown term: demonstrated ability should silence a topic. */
  strength: number;
  /** Subtracted for teaching that would have to happen first. Small,
      because a prerequisite is a detour and not a refusal. */
  prerequisite: number;
  /** Subtracted when the only lesson the library has for this objective is
      about a neighbouring question type. Five lessons deliberately do this
      (multiple-answer, categorisation, table completion on both papers,
      diagram labelling on Listening). The link is real and worth keeping,
      but a lesson about the thing next door teaches less, so an objective
      with a direct lesson wins first. */
  borrowedFit: number;
  /** What the student told us: a self-reported score below target, or the
      paper they said feels hardest. Small on purpose, and multiplied by
      zero as soon as there is real evidence about that paper. */
  selfReported: number;
  /** Added to the objective the session is already running, so a plan does
      not swap under a working student for a rounding difference. */
  incumbent: number;
  /** A challenger must beat the incumbent by more than this before the
      active session is replaced. Together with `incumbent` this is the
      brief's "do not force different tasks merely to make a test pass if
      the same task remains sensible". */
  replanMargin: number;
}

export const DEFAULT_PLANNER_WEIGHTS: PlannerWeights = {
  gap: 4,
  weakness: 2,
  unknown: 2.5,
  dueReview: 1.4,
  coverage: 1.2,
  deadline: 1,
  recency: 1.5,
  strength: 2.5,
  prerequisite: 0.8,
  borrowedFit: 0.6,
  selfReported: 0.75,
  incumbent: 0.5,
  replanMargin: 0.25,
};
