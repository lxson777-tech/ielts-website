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
