/* What the model is allowed to do in the learning loop, and what it is not.
 *
 * THE LINE, UNCHANGED
 * Code counts facts and chooses destinations. The model writes words and
 * proposes. That is the September 2026 decision recorded in CLAUDE.md, and
 * this file extends the model's teaching role without moving the line:
 *
 *   the model MAY   explain differently, give a contextual hint, offer a
 *                   worked example, diagnose tentatively, judge a focused
 *                   exercise against ONE stated objective, and propose one
 *                   activity from a shortlist it is handed
 *   the model MAY NOT  produce a band, write a link, name an activity that
 *                   is not in the shortlist, decide what is true about the
 *                   student, or be believed about which student it is
 *
 * Every reply is validated against a strict response shape, the catalogue,
 * ownership, prerequisites, the time budget, the plan revision and the
 * evidence version. A proposal that fails any check is dropped, and the
 * deterministic choice stands. With AI switched off entirely, every surface
 * still works.
 *
 * THREE NEW TASKS, ON THE EXISTING WORKER
 * These join the seven tasks in src/lib/tutor/schema.ts on the same
 * endpoint, reusing its auth, its per-student and per-site daily caps, its
 * idempotency key, its usage accounting and its caching. Nothing here opens
 * a second billable path.
 *
 * NO PAID CALL ON RENDER
 * None of these tasks may be issued by a page simply appearing, by a timer,
 * or by passive navigation. Each one is a response to a student action, and
 * each one is cached against the versions it was computed from.
 */

import type { Locale } from '../../i18n/locale';
import type { Subskill } from './catalog';
import type { AssistanceLevel } from './evidence';

/* ── The tasks ───────────────────────────────────────────────────────────── */

export const LEARNING_AI_TASKS = ['lesson-help', 'evaluate-practice', 'propose-next'] as const;
export type LearningAiTask = (typeof LEARNING_AI_TASKS)[number];

/** Which kind of help was asked for, at the exact teaching point. */
export type LessonHelpKind = 'explain' | 'hint' | 'example';

/* ── Shared envelope ─────────────────────────────────────────────────────── */

/** Every learning request carries the versions it was made against, so a
    reply that arrives after the plan or the evidence moved can be rejected
    instead of quietly acting on a stale picture. */
export interface LearningAiVersions {
  planRevision: number;
  evidenceVersion: number;
  /** The catalogue's index version, so a reply about an activity that has
      since been regenerated is refused. */
  indexVersion: string;
}

export interface LearningAiRequestBase {
  task: LearningAiTask;
  versions: LearningAiVersions;
  /** The session this happened inside, when it happened inside one. */
  sessionId?: string;
  locale?: Locale;
  /** Reused from the existing client: one key per student action, stable
      across retries, so a retry can never buy a second answer. */
  idempotencyKey?: string;
}

/* ── 1. Contextual lesson help ───────────────────────────────────────────── */

/** Everything the help request names is a REFERENCE. The lesson block's
    text, the question's prompt and its accepted answer are fetched by the
    Worker from the site's published data, exactly the way the wrong-answer
    endpoint already works (src/lib/tutor/test-items.ts and
    src/pages/data/tests/[id].json.ts). The only words the client supplies
    are the student's own answer and the hints already given, and those
    arrive as quoted data. */
export interface LessonHelpRequest extends LearningAiRequestBase {
  task: 'lesson-help';
  kind: LessonHelpKind;
  /** Which lesson page. */
  lessonKey: string;
  /** Which teaching block inside it: a stable anchor id published with the
      lesson body, not a title and not prose. */
  blockId: string;
  /** Which check the student is on, when they are on one. */
  item?: {
    /** e.g. 'practice-reading-matching-headings'. */
    setId: string;
    /** practiceKey(unitIndex, questionIndex), e.g. 'u0-q3'. */
    itemKey: string;
    itemVersion: string;
    /** Exactly what the student put. May be empty. */
    given: string;
  };
  /** Hints already given for this item, oldest first, so the next one does
      not repeat and escalation is visible. */
  previousHints: readonly string[];
  /** The assistance level reached so far, so the Worker can refuse to hand
      over the answer on a first ask. */
  assistanceSoFar: AssistanceLevel;
}

export interface LessonHelpReply {
  task: 'lesson-help';
  kind: LessonHelpKind;
  /** Plain sentences. Never HTML, never a URL. */
  text: string;
  /** The assistance level this reply moves the student to. Written into the
      evidence event by the client, so a hinted answer can never later be
      read as independent. */
  assistanceAfter: AssistanceLevel;
  /** True when the reply gave the answer away, so the surface records it
      and stops offering further hints on this item. */
  revealedAnswer: boolean;
  live: boolean;
  model: string;
  cached?: boolean;
}

/* ── 2. Evaluating a focused exercise ────────────────────────────────────── */

/** Judging one submission against ONE objective. Never a band, never a
    criterion score, and never a replacement for the calibrated graders. */
export interface EvaluatePracticeRequest extends LearningAiRequestBase {
  task: 'evaluate-practice';
  activityId: string;
  contentVersion: number;
  subskill: Subskill;
  /** The exercise's item ids being answered, so the Worker fetches the
      authored rubric rather than trusting one from the client. */
  itemIds: readonly string[];
  /** The student's submission, as data. */
  submission: string;
  /** Set when this is a revision of an earlier submission, so the reply can
      speak about what changed. */
  revisionOf?: string;
}

export interface EvaluatePracticeReply {
  task: 'evaluate-practice';
  /** Whether the stated objective was met. Code records this; the model
      only decides it within the strict shape. */
  met: boolean;
  /** Two or three sentences, the student's language. */
  feedback: string;
  /** At most three concrete next actions, each one plain text. No links. */
  suggestions: readonly string[];
  /** Explicit and always true in the interface: this is not a band. */
  isBand: false;
  live: boolean;
  model: string;
  cached?: boolean;
}

/* ── 3. Proposing the next teaching move ─────────────────────────────────── */

/** The planner has already narrowed the field to activities the student is
    ELIGIBLE for: prerequisites satisfied, inside the budget, not recently
    seen, not blocked by an override. The model picks one of those and says
    why. It cannot reach anything else. */
export interface ProposeNextRequest extends LearningAiRequestBase {
  task: 'propose-next';
  /** The eligible shortlist, ids only. The Worker rebuilds the labels from
      the catalogue; the client cannot describe an activity into existence. */
  candidateActivityIds: readonly string[];
  /** Minutes the session has left. */
  budgetMinutes: number;
  /** What the deterministic planner would choose on its own, so the model's
      proposal can be compared with it and disagreements recorded. */
  deterministicChoiceId: string;
}

export interface ProposeNextReply {
  task: 'propose-next';
  /** Must be one of `candidateActivityIds`. Anything else is dropped. */
  activityId: string | null;
  /** One sentence, the student's language. */
  reason: string | null;
  live: boolean;
  model: string;
  cached?: boolean;
}

/* ── Validation ──────────────────────────────────────────────────────────── */

/** Why a model proposal was not used. Recorded, counted and reviewable:
    "model self-evaluation alone is insufficient", so disagreements are data,
    not noise. */
export type ProposalRejectionCode =
  | 'stale-plan-revision'
  | 'stale-evidence-version'
  | 'stale-index-version'
  | 'unknown-activity'
  | 'not-in-shortlist'
  | 'prerequisite-unmet'
  | 'over-budget'
  | 'blocked-by-override'
  | 'blocked-under-assessment'
  | 'malformed-response'
  | 'not-signed-in'
  | 'limit-reached'
  | 'unavailable';

/** One reviewable record of the model proposing something other than the
    deterministic choice, kept whether or not it was accepted. This is the
    teacher-reference material the brief asks for. */
export interface ProposalDisagreement {
  at: string;
  sessionId?: string;
  deterministicChoiceId: string;
  modelChoiceId: string | null;
  accepted: boolean;
  rejection?: ProposalRejectionCode;
  /** The model's one-sentence reason, kept verbatim for review. */
  reason?: string;
}

/* ── Named constants ─────────────────────────────────────────────────────── */

/** Assistance may never be requested while a timed assessment is running.
    This covers the Explain, Hint and Example controls AND a direct chat
    message: the same block, checked server-side, because a hidden button is
    not a boundary. */
export const HELP_BLOCKED_MODES: readonly ('assessment' | 'diagnostic')[] = ['assessment'] as const;

/** Hints offered for one item before the surface stops escalating and
    offers a worked example instead. Provisional. */
export const MAX_HINTS_PER_ITEM = 3;

/** Longest student submission accepted by evaluate-practice, in characters.
    Deliberately far below the essay grader's limit: this is a paragraph
    exercise, and anything longer belongs with the calibrated grader. */
export const MAX_PRACTICE_SUBMISSION_CHARS = 1200;

/** Candidate shortlist size handed to propose-next. Small on purpose: the
    catalogue is hundreds of entries and the prompt stays short. Matches the
    existing shortlist() cap in src/lib/tutor/recommend.ts. */
export const MAX_PROPOSAL_CANDIDATES = 10;

/** Cache key inputs for every learning AI reply, in order. Two requests
    that agree on all of these get the stored answer for free. */
export const LEARNING_AI_CACHE_KEY_PARTS = [
  'task',
  'activityId',
  'itemKey',
  'itemVersion',
  'kind',
  'assistanceSoFar',
  'planRevision',
  'evidenceVersion',
  'indexVersion',
  'locale',
] as const;
