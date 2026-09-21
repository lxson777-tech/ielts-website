/* Everything the student already did, carried forward into the learner
 * record without inventing anything they did not do.
 *
 * WHAT THIS IS ALLOWED TO CLAIM
 * ProgressV1 holds completion clicks, scored attempts with per-question-TYPE
 * tallies, and AI band reports. It has never held a per-question record: see
 * TestAttempt.byType in src/lib/progress.ts. So every migrated event carries
 * `provenance: 'legacy'` and NO `items`, which is what caps it at `limited`
 * certainty in policy.ts. Fabricating the missing detail would make an old
 * student look better measured than a new one, which is the opposite of the
 * truth.
 *
 * A completion click becomes `studied`. It is never a demonstration.
 * A writing or speaking attempt that was graded by the offline stub
 * (`live: false`) is kept for the student's history and produces no ability
 * evidence at all: classifyEvidence excludes it with the reason
 * `stub-graded`.
 *
 * DETERMINISTIC IDS
 * Every id comes from the table in architecture section 4.1 and from nothing
 * else: `legacy:lesson:<slug>`, `legacy:test:<testId>:<at>` and so on. Run
 * this twice, or once on each of two devices, and you get the same ids, so
 * the union by id in evidence.ts collapses them to one row. Nothing here
 * reads a clock except the migration stamp, and the caller can pass that in.
 *
 * THE OLD STORES ARE NOT TOUCHED
 * This is a pure read. `ielts.progress.v1` and `ielts.studyplan.v1` keep
 * their shape, keep being written by the existing recorders, and keep
 * feeding the writing, speaking and score history screens. The learner
 * record is written beside them, never instead of them.
 */

import type { ProgressV1, SpeakingAttempt, TestAttempt, WritingAttempt } from '../progress';
import type { SavedPlan } from '../study-plan';
import type { Paper, Subskill } from './contracts/catalog';
import type {
  EvidenceEvent,
  GradedResult,
  LearnerRecordV1,
  MigrationStamp,
  ScoredResult,
  StudiedResult,
} from './contracts/evidence';
import {
  MIGRATION_VERSION,
  UNCLASSIFIED_LESSON_SUBSKILL,
  UNKNOWN_CONTENT_VERSION,
  WHOLE_ACTIVITY_SUBSKILL,
} from './contracts/evidence';
import {
  appendAllEvidence,
  createEvidenceEvent,
  emptyLearnerRecord,
  localDateFromIso,
  paperExposureKey,
  promptExposureKey,
  type EvidenceDraft,
} from './evidence';

/* ── Renamed lesson keys ─────────────────────────────────────────────────── */

/** The 2026-09 question-type restructure renamed a handful of lesson keys.
 *
 * This is a copy of RENAMED_LESSON_KEYS in src/lib/progress.ts, which is
 * private to that module and belongs to a file this work package does not
 * own. `tests/learning-migration.test.ts` reads that file and fails if the
 * two ever disagree, so the copy cannot rot quietly. Applied BEFORE ids are
 * computed, so a student who finished "Categorisation" before the rename
 * keeps their record under the new key rather than gaining a second one. */
export const RENAMED_LESSON_KEYS: Readonly<Record<string, string>> = {
  'reading-cat': 'reading-matching-features',
  'reading-para': 'reading-matching-information',
  'listening-section1': 'listening-part1',
  'listening-section2': 'listening-part2',
  'listening-section3': 'listening-part3',
  'listening-section4': 'listening-part4',
};

export function renameLessonKey(key: string): string {
  return RENAMED_LESSON_KEYS[key] ?? key;
}

/* ── Where a lesson belongs ──────────────────────────────────────────────── */

const PAPERS: readonly Paper[] = ['reading', 'listening', 'writing', 'speaking'];

/** The paper a lesson key belongs to, read from the key itself: the
    registries name them `reading-...`, `listening-...` and so on, and the
    overview pages are the bare paper name. Vocabulary and anything that does
    not match get no paper, which is correct: vocabulary is a site section,
    never a fifth paper. The caller can override any of this by passing
    `lessonPapers`. */
export function paperFromLessonKey(key: string): Paper | undefined {
  return PAPERS.find((paper) => key === paper || key.startsWith(`${paper}-`));
}

/** The five exam-readiness steps the course tracks outside progress.lessons
    (src/lib/course.ts EXTRA_STEPS). Their keys are already stable and
    already stored, so they are reused as activity ids rather than renamed. */
const EXTRA_STEP_PAPERS: Readonly<Record<string, Paper | undefined>> = {
  'extra:mock-reading': 'reading',
  'extra:mock-listening': 'listening',
  'extra:writing-checker': 'writing',
  'extra:speaking-examiner': 'speaking',
  'extra:review': undefined,
};

/** Minutes a lesson is estimated at when the registry has no number for it.
    An estimate, never reported back as time measured. */
export const DEFAULT_LESSON_MINUTES = 12;

/** Minutes an exam-readiness step is estimated at. The same flat estimate
    the activity log already uses for an attempt. */
export const DEFAULT_EXTRA_STEP_MINUTES = 10;

/* ── Options ─────────────────────────────────────────────────────────────── */

export interface MigrationOptions {
  /** The instant written into the migration stamp. Passed in so a test, and
      two devices, can produce byte-identical output. */
  now?: string;
  /** Lesson key to the subskill it teaches, from the catalogue. Without it
      a completion lands under UNCLASSIFIED_LESSON_SUBSKILL and the stamp
      counts how many did. A completion is `studied` either way, so this can
      never affect an ability estimate. */
  lessonSubskills?: Readonly<Record<string, Subskill>>;
  /** Lesson key to paper, when the key itself does not say. */
  lessonPapers?: Readonly<Record<string, Paper>>;
  /** How an ISO instant becomes the student's local calendar date.
      ProgressV1 recorded the instant but never the zone, so this device's
      zone is the best available answer and the default. It affects only
      which day an event is filed under, never an id, so two devices in
      different zones still merge to one row. */
  localDateOf?: (iso: string) => string;
}

/* ── Small guards, so a hand-edited store cannot throw ───────────────────── */

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isIsoInstant(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(new Date(value).getTime());
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function numberRecord(value: unknown): Record<string, number> {
  if (!isObject(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) if (isFiniteNumber(entry)) out[key] = entry;
  return out;
}

function tallyRecord(value: unknown): Record<string, { correct: number; total: number }> {
  if (!isObject(value)) return {};
  const out: Record<string, { correct: number; total: number }> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isObject(entry) && isFiniteNumber(entry.correct) && isFiniteNumber(entry.total)) {
      out[key] = { correct: entry.correct, total: entry.total };
    }
  }
  return out;
}

/* ── Building the legacy events ──────────────────────────────────────────── */

export interface LegacyMigration {
  events: readonly EvidenceEvent[];
  stamp: MigrationStamp;
}

/** Every event the old stores justify, and the counts to go with them.
    Exported so a test, or the handoff document, can state what moved rather
    than claim it. */
export function buildLegacyEvents(
  progress: ProgressV1 | null | undefined,
  plan?: SavedPlan | null,
  registryMinutes: Readonly<Record<string, number>> = {},
  options: MigrationOptions = {},
): LegacyMigration {
  const localDateOf = options.localDateOf ?? localDateFromIso;
  const events: EvidenceEvent[] = [];
  let lessonsMigrated = 0;
  let testAttemptsMigrated = 0;
  let writingAttemptsMigrated = 0;
  let speakingAttemptsMigrated = 0;
  let lessonsWithoutSubskill = 0;
  let planStepsMigrated = 0;
  let rowsSkipped = 0;

  /* One row that cannot be read is one row skipped, counted, and left
     behind. It is never guessed at and it never stops the rest. */
  const add = (draft: EvidenceDraft): boolean => {
    try {
      events.push(createEvidenceEvent({ ...draft, localDate: draft.localDate ?? localDateOf(draft.at) }));
      return true;
    } catch {
      rowsSkipped += 1;
      return false;
    }
  };

  /* ── Lessons: a completion click, and nothing more ── */
  const lessons = progress && isObject(progress.lessons) ? progress.lessons : {};
  // The rename map can send two old keys to one new one. Keep the earliest
  // completion, exactly as migrateLessons and mergeProgress already do.
  const completions = new Map<string, string>();
  for (const [rawKey, value] of Object.entries(lessons)) {
    const completedAt = isObject(value) ? value.completedAt : undefined;
    if (!isIsoInstant(completedAt)) {
      rowsSkipped += 1;
      continue;
    }
    const key = renameLessonKey(rawKey);
    const held = completions.get(key);
    completions.set(key, held && held < completedAt ? held : completedAt);
  }

  for (const [key, completedAt] of completions) {
    const subskill = options.lessonSubskills?.[key];
    if (!subskill) lessonsWithoutSubskill += 1;
    const outcome: StudiedResult = {
      kind: 'studied',
      estimatedMinutes: registryMinutes[key] ?? DEFAULT_LESSON_MINUTES,
    };
    if (add({
      id: `legacy:lesson:${key}`,
      activityId: `lesson:${key}`,
      contentVersion: UNKNOWN_CONTENT_VERSION,
      at: completedAt,
      paper: options.lessonPapers?.[key] ?? paperFromLessonKey(key),
      subskill: subskill ?? UNCLASSIFIED_LESSON_SUBSKILL,
      mode: 'practice',
      completion: 'completed',
      assistance: 'none',
      seenBefore: false,
      outcome,
      provenance: 'legacy',
    })) {
      lessonsMigrated += 1;
    }
  }

  /* ── Tests and drills: the score, the per-type tallies, no item detail ── */
  const tests = progress && isObject(progress.tests) ? progress.tests : {};
  for (const [testId, attempts] of Object.entries(tests)) {
    if (!Array.isArray(attempts)) {
      rowsSkipped += 1;
      continue;
    }
    for (const attempt of attempts as TestAttempt[]) {
      if (!isObject(attempt) || !isIsoInstant(attempt.at) || !isFiniteNumber(attempt.raw) || !isFiniteNumber(attempt.total)) {
        rowsSkipped += 1;
        continue;
      }
      const isDrill = attempt.kind === 'drill';
      // The existing convention: an attempt recorded before the `skill`
      // field existed is a Reading attempt (src/lib/progress.ts:344).
      const paper: Paper = attempt.skill === 'listening' ? 'listening' : 'reading';
      const outcome: ScoredResult = {
        kind: 'scored',
        raw: attempt.raw,
        total: attempt.total,
        // A drill is one passage, not a paper. A 13-question sample has no
        // band, and the old store's band field on one is not evidence of
        // one either.
        bandEstimate: isDrill || !isFiniteNumber(attempt.band) ? undefined : attempt.band,
        bySubskill: tallyRecord(attempt.byType),
        secondsUsed: isFiniteNumber(attempt.secondsUsed) ? attempt.secondsUsed : undefined,
      };
      if (add({
        id: `legacy:${isDrill ? 'drill' : 'test'}:${testId}:${attempt.at}`,
        activityId: isDrill ? `trainer:${paper}` : `test:${paper}`,
        contentVersion: UNKNOWN_CONTENT_VERSION,
        at: attempt.at,
        paper,
        subskill: WHOLE_ACTIVITY_SUBSKILL,
        mode: isDrill ? 'practice' : 'assessment',
        completion: 'completed',
        assistance: 'none',
        seenBefore: false,
        outcome,
        // No items: TestAttempt has never held one. The exposure key means a
        // re-sit of this paper after migration is correctly marked seen.
        sourceMaterial: [paperExposureKey(testId)],
        provenance: 'legacy',
      })) {
        testAttemptsMigrated += 1;
      }
    }
  }

  /* ── Writing: criterion bands, Task 1 and Task 2 kept apart ── */
  const writing = progress && isObject(progress.writing) ? progress.writing : {};
  for (const [promptId, attempts] of Object.entries(writing)) {
    if (!Array.isArray(attempts)) {
      rowsSkipped += 1;
      continue;
    }
    for (const attempt of attempts as WritingAttempt[]) {
      if (!isObject(attempt) || !isIsoInstant(attempt.at) || !isFiniteNumber(attempt.overallBand)) {
        rowsSkipped += 1;
        continue;
      }
      const live = attempt.live === true;
      const outcome: GradedResult = {
        kind: 'graded',
        overallBand: attempt.overallBand,
        criteria: numberRecord(attempt.criteria),
        // `live: false` was the offline stub. Kept so the student's history
        // still opens, marked so it can never become ability evidence.
        grader: { name: attempt.report?.grader?.name ?? 'legacy', live },
        legacyRef: { store: 'writing', key: promptId, at: attempt.at },
        wordCount: isFiniteNumber(attempt.wordCount) ? attempt.wordCount : undefined,
      };
      if (add({
        id: `legacy:writing:${promptId}:${attempt.at}`,
        activityId: 'trainer:writing',
        contentVersion: UNKNOWN_CONTENT_VERSION,
        at: attempt.at,
        paper: 'writing',
        subskill: WHOLE_ACTIVITY_SUBSKILL,
        taskScope: attempt.task === 'task1' || attempt.task === 'task2' ? { kind: 'writing-task', task: attempt.task } : undefined,
        mode: 'practice',
        completion: 'completed',
        assistance: 'none',
        seenBefore: false,
        outcome,
        sourceMaterial: [promptExposureKey(promptId)],
        provenance: 'legacy',
      })) {
        writingAttemptsMigrated += 1;
      }
    }
  }

  /* ── Speaking: one part at a time, kept apart ── */
  const speaking = progress && Array.isArray(progress.speaking) ? progress.speaking : [];
  for (const attempt of speaking as SpeakingAttempt[]) {
    if (!isObject(attempt) || !isIsoInstant(attempt.at) || !isFiniteNumber(attempt.overallBand)) {
      rowsSkipped += 1;
      continue;
    }
    const part = attempt.mode === 'part1' ? 1 : attempt.mode === 'part2' ? 2 : attempt.mode === 'part3' ? 3 : undefined;
    const live = attempt.live === true;
    const outcome: GradedResult = {
      kind: 'graded',
      overallBand: attempt.overallBand,
      criteria: numberRecord(attempt.criteria),
      grader: { name: 'legacy', live },
      // The speaking store is a flat list with no key of its own, so the
      // part is what there is to point back with.
      legacyRef: { store: 'speaking', key: attempt.mode ?? '', at: attempt.at },
    };
    if (add({
      id: `legacy:speaking:${attempt.at}`,
      activityId: 'trainer:speaking',
      contentVersion: UNKNOWN_CONTENT_VERSION,
      at: attempt.at,
      paper: 'speaking',
      subskill: WHOLE_ACTIVITY_SUBSKILL,
      taskScope: part ? { kind: 'speaking-part', part } : undefined,
      mode: 'practice',
      completion: 'completed',
      assistance: 'none',
      seenBefore: false,
      outcome,
      // No recording, and no field that could hold one. The old store never
      // kept the audio either.
      provenance: 'legacy',
    })) {
      speakingAttemptsMigrated += 1;
    }
  }

  /* ── The exam-readiness extras the plan ticked off ── */
  const doneKeys = plan && Array.isArray(plan.doneKeys) ? plan.doneKeys : [];
  const stepAt = plan && isIsoInstant(plan.createdAt) ? plan.createdAt : undefined;
  if (stepAt) {
    for (const key of doneKeys) {
      // Only the five extras live here. Anything else in this list is a
      // lesson key, and lesson completion is read from progress.lessons,
      // which is the single source of truth for it.
      if (typeof key !== 'string' || !(key in EXTRA_STEP_PAPERS)) continue;
      const outcome: StudiedResult = { kind: 'studied', estimatedMinutes: DEFAULT_EXTRA_STEP_MINUTES };
      if (add({
        id: `legacy:${key}`,
        activityId: key,
        contentVersion: UNKNOWN_CONTENT_VERSION,
        // The plan records that a step was ticked, never when. Its creation
        // date is the only instant the store has, and it is honest about
        // being an approximation rather than a measurement.
        at: stepAt,
        paper: EXTRA_STEP_PAPERS[key],
        subskill: UNCLASSIFIED_LESSON_SUBSKILL,
        mode: 'practice',
        completion: 'completed',
        assistance: 'none',
        seenBefore: false,
        outcome,
        provenance: 'legacy',
      })) {
        planStepsMigrated += 1;
      }
    }
  }

  const stamp: MigrationStamp = {
    migrationVersion: MIGRATION_VERSION,
    ranAt: options.now ?? new Date().toISOString(),
    lessonsMigrated,
    testAttemptsMigrated,
    writingAttemptsMigrated,
    speakingAttemptsMigrated,
    lessonsWithoutSubskill,
    planStepsMigrated,
    rowsSkipped,
  };
  return { events, stamp };
}

/* ── The two entry points ────────────────────────────────────────────────── */

/** ProgressV1 (plus the plan's ticked extras) as a fresh learner record.
    Pure: it reads plain objects and returns a plain object, so it can be
    unit-tested with no DOM and run in the Worker if it ever needs to be. */
export function migrateProgress(
  progress: ProgressV1 | null | undefined,
  plan?: SavedPlan | null,
  registryMinutes: Readonly<Record<string, number>> = {},
  options: MigrationOptions = {},
): LearnerRecordV1 {
  return migrateInto(emptyLearnerRecord(), progress, plan, registryMinutes, options);
}

/** The same migration, folded into a record that already exists. Every id is
    derived from the old row, so running this again after a sync, or on a
    second device, adds nothing the record already holds. */
export function migrateInto(
  record: LearnerRecordV1,
  progress: ProgressV1 | null | undefined,
  plan?: SavedPlan | null,
  registryMinutes: Readonly<Record<string, number>> = {},
  options: MigrationOptions = {},
): LearnerRecordV1 {
  const { events, stamp } = buildLegacyEvents(progress, plan, registryMinutes, options);
  const withEvents = appendAllEvidence(record, events);
  return { ...withEvents, migration: stamp };
}

/** True when the migration has never run, or when its rules have moved on
    since it last did. Raising MIGRATION_VERSION makes it run again; existing
    ids are unchanged, so nothing duplicates. */
export function needsMigration(record: LearnerRecordV1): boolean {
  return !record.migration || record.migration.migrationVersion < MIGRATION_VERSION;
}
