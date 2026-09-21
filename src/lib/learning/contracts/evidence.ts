/* The learner record: an append-only log of what a student actually did.
 *
 * THE DISTINCTION THIS FILE EXISTS FOR
 * Three different things are recorded with three different names, and the
 * evidence policy (policy.ts) treats them completely differently:
 *
 *   studied                 they opened it and said they were done
 *   assisted success        they got it right after a hint or a second go
 *   independent demonstration   first answer, no help, material not seen before
 *
 * A completion click is `studied`. It is never mastery. An assisted correct
 * answer is `assisted`. It is never independent. Only the third can raise an
 * ability estimate on its own.
 *
 * APPEND ONLY, MERGE BY ID
 * Events are never edited or deleted. Two devices merge by taking the union
 * on `id`, which makes sync idempotent and a retry harmless. Corrections are
 * expressed as later events (`retryOf`, `supersedes`), never as a rewrite.
 *
 * DETERMINISTIC IDS
 * Every id is derived from its content, so writing the same event twice
 * produces one row, and the legacy migration can be run again without
 * duplicating anything. See LEGACY_EVENT_ID_PREFIX below.
 *
 * WHAT IS NOT KEPT
 * No raw audio, ever. Speaking evidence keeps the transcript excerpt and the
 * measured features the grader already produced, not the recording.
 */

import type { Locale } from '../../i18n/locale';
import type { Paper, Subskill, WritingCriterion, SpeakingCriterion } from './catalog';

/* ── How the work was done ───────────────────────────────────────────────── */

/** The conditions the work happened under. This is not a label the student
    picks: it is set by the surface that records the event, and it decides
    whether help was even available. */
export type EvidenceMode =
  /** A quick check inside a lesson page. Help is available. */
  | 'lesson-check'
  /** Deliberate practice with feedback available. */
  | 'practice'
  /** A short sample taken to find out where the student is. Explicitly not
      a band. */
  | 'diagnostic'
  /** Timed, no help of any kind, including chat. */
  | 'assessment'
  /** Going back over something already marked. Produces no new ability
      evidence by itself. */
  | 'review';

/** What help the student had before their answer was fixed. Ordered from
    none to most. */
export type AssistanceLevel =
  | 'none'
  | 'hint'
  | 'worked-example'
  | 'answer-shown'
  | 'tutor-explained';

export const ASSISTANCE_ORDER: readonly AssistanceLevel[] = [
  'none',
  'hint',
  'worked-example',
  'answer-shown',
  'tutor-explained',
] as const;

/** How the attempt ended. `abandoned` and `blank` exist so the policy can
    ignore them instead of reading them as a bad result. */
export type CompletionState = 'completed' | 'partial' | 'abandoned' | 'blank' | 'expired';

/** Where the record came from. `legacy` rows were migrated from ProgressV1
    and carry less detail by construction; the policy caps what they can
    support (see LIMITED_EVIDENCE_* in policy.ts). */
export type EvidenceProvenance = 'recorded' | 'legacy' | 'self-reported' | 'simulated';

/* ── One item's outcome ──────────────────────────────────────────────────── */

/** One question, prompt or word inside an activity. `itemId` is stable, and
    `itemVersion` changes when the item's own content changes, so evidence
    cannot leak across a rewrite. */
export interface ItemIdentity {
  itemId: string;
  itemVersion?: string;
  /** Which subskill the item exercises, when it differs from the activity's
      own (a mixed paper). */
  subskill?: Subskill;
}

export interface ItemOutcome extends ItemIdentity {
  /** What the student put the FIRST time, before any help, capped short.
      An empty string means they left it blank, which is different from
      wrong. The cap is MAX_FIRST_ANSWER_CHARS, or
      MAX_WRITTEN_RESPONSE_CHARS when `written` is set. */
  firstAnswer: string;
  /** True when the item's answer is the student's OWN WRITING rather than
   *  a word, a letter or a short phrase: a Task 1 overview, a corrected
   *  sentence, a topic sentence.
   *
   *  It exists for one reason: how much of `firstAnswer` is worth keeping.
   *  A gap fill is a handful of characters and 120 is generous; one or two
   *  written sentences do not fit in 120 at all, and an excerpt is no use
   *  for showing a student their own before and after. Added 22 September
   *  2026 after the pilots reported exactly that. Optional and additive:
   *  an older row without it is a short answer, which is what it was.
   *
   *  It is NOT a licence to store an essay. A whole Writing task is graded
   *  evidence (GradedResult) and carries no item rows at all, so nothing
   *  copies 250 words into the record through here. */
  written?: boolean;
  correct: boolean;
  /** Help used before the first answer was settled. */
  assistance: AssistanceLevel;
  /** True when this exact item (or its source passage) was already seen by
      this student before this attempt. Set from the exposure log, not from
      the student. */
  seenBefore: boolean;
  /** Seconds spent on this item, when the surface measures it honestly.
      Omitted rather than estimated. */
  seconds?: number;
  /** Why the student says they chose what they chose, when a surface asked
      and they answered (added by the Matching Headings pilot, WP16).
   *
   *  This is the line between an OBSERVED mistake and a CONJECTURED cause,
   *  which the brief asks for by name. What is observed is the wrong
   *  answer, and it is in `correct` and `firstAnswer`. This field is the
   *  student's own account of how they got there: `reasonId` is one of the
   *  ids in that question type's list (src/data/focused-exercises.ts), and
   *  `note` is anything they added in their own words. Nothing derived from
   *  it may ever be stated as a finding: every sentence built on it says
   *  that it came from them and that it is tentative. */
  statedReason?: { reasonId: string; note?: string };
}

/* ── Scored and graded results ───────────────────────────────────────────── */

/** A whole paper or drill, scored in code against a key. */
export interface ScoredResult {
  kind: 'scored';
  raw: number;
  total: number;
  /** Band estimate, only for a complete paper. A drill has none: a
      13-question sample is not a band. */
  bandEstimate?: number;
  /** correct/total per subskill. Present on new events; this is the only
      breakdown legacy rows have. */
  bySubskill: Readonly<Record<string, { correct: number; total: number }>>;
  secondsUsed?: number;
}

/** An AI band report against the official criteria, produced by one of the
    calibrated graders. Copied here by reference and by value for the fields
    the policy reads; the full report stays where it already lives. */
export interface GradedResult {
  kind: 'graded';
  overallBand: number;
  criteria: Readonly<Record<WritingCriterion | SpeakingCriterion | string, number>>;
  /** Which grader, and whether it was live. A stub grade never counts. */
  grader: { name: string; live: boolean };
  /** Pointer back into ProgressV1 so the existing report screen still opens.
      `at` is the attempt's identity in that store. */
  legacyRef?: { store: 'writing' | 'speaking' | 'tests'; key: string; at: string };
  wordCount?: number;
}

/** A focused exercise judged against ONE objective. Deliberately not a band
    and deliberately not a criterion score. */
export interface ObjectiveJudgement {
  kind: 'objective';
  met: boolean;
  /** Which objective was judged, as the activity's subskill. */
  subskill: Subskill;
  /** Short feedback, already sanitised, in the student's language. */
  feedback?: string;
  /** True when a model wrote the judgement rather than code. Code still
      validated it against the response shape; this records who decided. */
  byModel: boolean;
}

/** Opening a page and saying it is done. */
export interface StudiedResult {
  kind: 'studied';
  /** Minutes the platform ESTIMATED for it. Never presented as measured. */
  estimatedMinutes: number;
}

/** A spaced-recall pass over words. */
export interface RecallResult {
  kind: 'recall';
  reviewed: number;
  correct: number;
  /** Per-word outcomes, so a word the student keeps missing can reach the
      plan. */
  words: readonly { word: string; correct: boolean; direction: 'recognise' | 'recall' | 'use' }[];
}

export type EvidenceOutcome =
  | ScoredResult
  | GradedResult
  | ObjectiveJudgement
  | StudiedResult
  | RecallResult;

/* ── The event ───────────────────────────────────────────────────────────── */

/** Which Writing task or Speaking part a WHOLE graded submission belongs to.
    Present only when the event covers a whole task rather than one
    objective: a focused exercise says what it practised through `subskill`
    instead. The policy needs this to keep Task 1 apart from Task 2, and the
    three Speaking parts apart from each other, which it must: they are
    marked on different criteria and behave differently. */
export type TaskScope =
  | { kind: 'writing-task'; task: 'task1' | 'task2' }
  | { kind: 'speaking-part'; part: 1 | 2 | 3 };

export interface EvidenceEvent {
  /** Deterministic, content-derived, stable across devices and re-runs. */
  id: string;
  /** The catalogue activity this is evidence about. */
  activityId: string;
  /** The activity's contentVersion at the time. Evidence about version 1 is
      not evidence about version 2. */
  contentVersion: number;
  /** ISO datetime. The instant the work finished. */
  at: string;
  /** The student's local calendar date (YYYY-MM-DD) at that instant, so day
      boundaries match what they saw. Same convention as
      ProgressV1.activity's keys. */
  localDate: string;
  paper?: Paper;
  subskill: Subskill;
  mode: EvidenceMode;
  completion: CompletionState;
  /** Highest assistance used anywhere in the activity. Item-level detail is
      in `items`. */
  assistance: AssistanceLevel;
  /** True when the student had already seen this material. Set from the
      exposure log at the moment of recording. */
  seenBefore: boolean;
  outcome: EvidenceOutcome;
  /** Per-item detail, when the surface has it. Absent on legacy rows and on
      graded tasks. */
  items?: readonly ItemOutcome[];
  /** Which Writing task or Speaking part, for a whole graded submission.
      See TaskScope. */
  taskScope?: TaskScope;
  /** Exposure keys for the material this activity drew on, in the same form
      as ExposureEntry.key ('paper:<testId>', 'prompt:<promptId>'). Item
      exposure comes from `items`; this covers the case where a whole paper
      or prompt was met without per-item detail, so a re-sit of it is
      correctly marked seen rather than read as fresh evidence. */
  sourceMaterial?: readonly string[];
  /** The event this is a second go at. Chains, so a third attempt points at
      the second. */
  retryOf?: string;
  /** Set when a later event corrects an earlier one that was written wrong
      (a grader result arriving after a pending placeholder). */
  supersedes?: string;
  provenance: EvidenceProvenance;
  /** Which plan session this was done inside, when it was. Voluntary work
      done outside the plan leaves it undefined and is still recorded. */
  sessionId?: string;
  /** Language the explanations were read in, for reporting only. Never an
      ability signal. */
  locale?: Locale;
  /** True while a grade has been requested but not yet returned, so the UI
      can say "waiting for marking" honestly instead of showing nothing. */
  pendingGrading?: boolean;
}

/* ── Exposure ────────────────────────────────────────────────────────────── */

/** Which material this student has already met, so a repeat is never
    counted as fresh independent evidence. Keyed by item, and separately by
    the source paper, because a drill, a lesson check and a full paper can
    all quote the same passage. */
export interface ExposureEntry {
  /** 'item:<itemId>' or 'paper:<testId>' or 'prompt:<promptId>'. */
  key: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occasions: number;
}

/* ── Compaction ──────────────────────────────────────────────────────────── */

/** One subskill's folded-up history, after the oldest events were compacted
    away locally (see LOCAL_EVENT_SOFT_CAP). Counts only. There is no item
    detail here and there never can be, which is the point: a tally can
    inform "how much work has been done" and can never be mistaken for the
    item-level evidence the policy needs to call something demonstrated. */
export interface SubskillTally {
  subskill: Subskill;
  paper?: Paper;
  mode: EvidenceMode;
  /** Kept per tally so a migrated legacy block can never be counted as if it
      had been recorded live. */
  provenance: EvidenceProvenance;
  independentOccasions: number;
  assistedOccasions: number;
  independentItems: number;
  correctItems: number;
  /** Completion clicks, kept apart from anything that was answered. */
  studiedCount: number;
  earliestAt: string;
  latestAt: string;
}

/** A block of compacted events. Deliberately NOT an EvidenceEvent: different
    shape, different id prefix, no `outcome`, no `items`. */
export interface EvidenceSummaryV1 {
  kind: 'evidence-summary';
  /** Derived from the range it covers, so two devices that compact the same
      block agree and the union by id collapses them into one. */
  id: string;
  from: string;
  to: string;
  /** How many events were folded in. */
  eventCount: number;
  tallies: readonly SubskillTally[];
}

/* ── The record ──────────────────────────────────────────────────────────── */

export interface LearnerRecordV1 {
  version: 1;
  /** Bumped on every append. The evidence version an AI proposal and a plan
      were computed against, so a stale reply can be rejected. */
  evidenceVersion: number;
  events: readonly EvidenceEvent[];
  /** Oldest events, folded into counts by the local soft cap. Optional so a
      record written before compaction existed still loads. The server keeps
      the full log; this is the browser's memory of what it dropped. */
  summaries?: readonly EvidenceSummaryV1[];
  exposure: readonly ExposureEntry[];
  /** What the student told us about themselves, kept apart from what was
      measured. */
  selfReported: readonly SelfReportedScore[];
  /** The ProgressV1 migration that produced the legacy rows, so it is never
      run twice with different rules. */
  migration: MigrationStamp | null;
}

export interface SelfReportedScore {
  id: string;
  paper?: Paper;
  /** Undefined paper means an overall score. */
  band: number;
  /** When they say they got it. */
  takenOn: string;
  /** When they told us. */
  reportedAt: string;
}

export interface MigrationStamp {
  /** Which migration rules ran. Bumped when the mapping changes. */
  migrationVersion: number;
  ranAt: string;
  /** Counts, so the handoff document can state what moved rather than
      claiming it. */
  lessonsMigrated: number;
  testAttemptsMigrated: number;
  writingAttemptsMigrated: number;
  speakingAttemptsMigrated: number;
  /** Lesson completions migrated without the caller naming the lesson's
      subskill, so they carry UNCLASSIFIED_LESSON_SUBSKILL. Counted rather
      than hidden: it is how many rows are grouped under a placeholder. */
  lessonsWithoutSubskill?: number;
  /** Plan steps (the exam-readiness extras in SavedPlan.doneKeys) migrated
      as completion clicks. */
  planStepsMigrated?: number;
  /** Rows in the old store that could not be read (a hand-edited or
      half-written entry). Skipped rather than guessed at, and counted here
      rather than hidden. */
  rowsSkipped?: number;
}

/* ── Named constants ─────────────────────────────────────────────────────── */

/** localStorage key for the browser copy of the learner record. Versioned
    beside ielts.progress.v1, which it does NOT replace or rewrite. */
export const LEARNER_RECORD_KEY = 'ielts.learning.record.v1';

/** Prefix every migrated id carries, so legacy rows are identifiable and the
    migration is idempotent: the id is
    `legacy:<store>:<key>:<at>` (or `legacy:lesson:<slug>` for completions),
    which the same input always produces. */
export const LEGACY_EVENT_ID_PREFIX = 'legacy:';

/** Current migration rules version. Raising it makes the migration run
    again and write any rows its new rules add; existing ids are unchanged,
    so nothing duplicates. */
export const MIGRATION_VERSION = 1;

/** Longest first answer kept per item. Matches MAX_GIVEN_CHARS in
    src/lib/tutor/test-items.ts so the two limits cannot drift. */
export const MAX_FIRST_ANSWER_CHARS = 120;

/** Longest first answer kept for an item the student WROTE (see
 *  ItemOutcome.written).
 *
 *  One or two sentences, or a short paragraph. A Task 1 overview runs to
 *  about 300 characters and the longest the pilots produced was under 500,
 *  so this holds the whole of one rather than an excerpt of it, which is
 *  what the before and after comparison needs. The same number as
 *  MAX_OBJECTIVE_FEEDBACK_CHARS, for the same reason: it is a paragraph,
 *  not a document. A whole essay never reaches an item row (see `written`),
 *  so this is not the limit that stops one. Provisional. */
export const MAX_WRITTEN_RESPONSE_CHARS = 600;

/** Longest objective feedback stored per event. */
export const MAX_OBJECTIVE_FEEDBACK_CHARS = 600;

/** Hard cap on events held in the browser copy before the oldest are
 *  summarised into per-subskill tallies and dropped from local storage.
 *  The server keeps everything. Provisional.
 *
 *  THE ARITHMETIC, kept honest when MAX_WRITTEN_RESPONSE_CHARS was added
 *  on 22 September 2026. An ordinary event is a few hundred bytes plus its
 *  item rows, and an item row's free text is capped at 120 characters, so
 *  4,000 events is comfortably inside the few megabytes localStorage
 *  allows. A written response is ONE item on its event and may now hold
 *  600 characters instead of 120, which is 480 bytes more on an event a
 *  student produces a handful of times a week, not forty at a time like a
 *  paper's questions. Even a history made entirely of written responses
 *  would add under 2 MB at the cap, and the quota path below
 *  (QUOTA_RETRY_EVENT_CAP) still catches a browser that says no. */
export const LOCAL_EVENT_SOFT_CAP = 4000;

/** Events kept when a save fails because the browser has run out of room.
    The soft cap above is the everyday ceiling; this is the emergency one,
    applied once as a second attempt before the browser copy gives up and
    keeps the record in memory for the session only. Everything dropped is
    folded into tallies first, and the server keeps the full log. */
export const QUOTA_RETRY_EVENT_CAP = 400;

/** Prefix on every id created for a newly recorded event, so a recorded row
    and a migrated one are told apart at a glance (see
    LEGACY_EVENT_ID_PREFIX). The rest of the id is a hash of the event's own
    content. */
export const EVENT_ID_PREFIX = 'ev:';

/** Prefix on a compacted block's id. Same reason: it must be impossible to
    mistake a block of tallies for an event. */
export const EVIDENCE_SUMMARY_ID_PREFIX = 'sum:';

/** `contentVersion` for an event whose activity version is genuinely not
    known, which is every migrated row: ProgressV1 never recorded one. It is
    never treated as stale, because "we do not know" is not the same as "we
    know it is old", and throwing a student's history away on a guess would
    be worse than keeping it. */
export const UNKNOWN_CONTENT_VERSION = 0;

/** The `subskill` an event carries when it is about a WHOLE activity (a full
    timed paper, a graded essay, a whole Speaking part) rather than one
    objective. The contract needs exactly one subskill per event and a
    40-question paper does not have one: the real breakdown lives in
    `outcome.bySubskill` for a scored paper, in `outcome.criteria` for a
    graded task, and in `taskScope` for Writing and Speaking. Sitting the
    whole thing under its own timing is what these activities have in common,
    which is why the value comes from the exam-skills family. Provisional:
    change it here and every caller follows. */
export const WHOLE_ACTIVITY_SUBSKILL: Subskill = 'timing-strategy';

/** The `subskill` a migrated lesson completion carries when the caller did
    not supply the lesson's own subskill. A completion click is `studied` and
    can never move an ability estimate, so this placeholder cannot inflate
    anything: it only decides which heading the lesson appears under in a
    study list. The migration counts how many rows land here
    (MigrationStamp.lessonsWithoutSubskill) rather than hiding it. */
export const UNCLASSIFIED_LESSON_SUBSKILL: Subskill = 'exam-format';

/** Two pieces of work this far apart in time are separate sittings, even on
    the same day. Eight questions answered in one sitting is one occasion,
    which is the distinction the policy's `patternMinOccasions` rests on.
    Provisional. */
export const OCCASION_GAP_MINUTES = 45;
