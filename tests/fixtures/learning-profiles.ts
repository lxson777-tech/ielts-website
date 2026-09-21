/* Labelled synthetic learners, shared by every learning test.
 *
 * EVERY PROFILE HERE IS INVENTED. None of it is a real student's work, and
 * every name carries the `SYNTHETIC-` prefix so nothing in a report, a
 * screenshot or a log can be mistaken for one.
 *
 * THEY ARE BUILDERS, NOT BLOBS
 * Each one is a function returning a fresh object, and each takes an
 * override so a test can move the date, the target or the daily minutes
 * without copying the whole profile. Later packages reuse them, so a frozen
 * shared object would have every test quietly depending on every other one.
 *
 * THE IDS ARE REAL
 * Activity ids come from the real catalogue, so `findActivity` resolves
 * them, exposure really marks the papers as seen, and a test that passes
 * here is testing the library the students actually get.
 */

import type { ProgressV1 } from '../../src/lib/progress.ts';
import type { SavedPlan } from '../../src/lib/study-plan.ts';
import type { EvidenceDraft } from '../../src/lib/learning/evidence.ts';
import {
  appendAllEvidence,
  createEvidenceEvent,
  emptyLearnerRecord,
  paperExposureKey,
} from '../../src/lib/learning/evidence.ts';
import type { ItemOutcome, LearnerRecordV1 } from '../../src/lib/learning/contracts/evidence.ts';
import { WHOLE_ACTIVITY_SUBSKILL } from '../../src/lib/learning/contracts/evidence.ts';
import type { Paper, Subskill } from '../../src/lib/learning/contracts/catalog.ts';
import type { PlanConstraints, PlanGoals } from '../../src/lib/learning/contracts/plan.ts';

/* ── The shape every profile has ─────────────────────────────────────────── */

export interface LearnerProfile {
  /** Always starts `SYNTHETIC-`. */
  name: string;
  /** One line, plain English, on what this learner is for. */
  description: string;
  record: LearnerRecordV1;
  goals: PlanGoals;
  constraints: PlanConstraints;
  /** The day the profile is written against, and the instant inside it. */
  today: string;
  now: string;
  /** Only on the migration profiles: the old stores, untouched. */
  progress?: ProgressV1;
  savedPlan?: SavedPlan;
}

export interface ProfileOverride {
  today?: string;
  now?: string;
  goals?: Partial<PlanGoals>;
  constraints?: Partial<PlanConstraints>;
}

/** The day these fixtures are written against. Every date below is a fixed
    offset from it, so nothing depends on when the tests are run. */
export const PROFILE_TODAY = '2026-09-22';
export const PROFILE_NOW = '2026-09-22T09:00:00.000Z';

export function daysBefore(days: number, from: string = PROFILE_TODAY): string {
  return new Date(Date.parse(`${from}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
}

export function daysAfter(days: number, from: string = PROFILE_TODAY): string {
  return daysBefore(-days, from);
}

/** A date as both an instant and the student's own local date, so nothing
    in these fixtures depends on the machine's time zone. */
function day(date: string, hour = 9): { at: string; localDate: string } {
  return { at: `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`, localDate: date };
}

function items(prefix: string, correct: number, total: number, over: Partial<ItemOutcome> = {}): ItemOutcome[] {
  return Array.from({ length: total }, (_, index) => ({
    itemId: `${prefix}-q${index + 1}`,
    firstAnswer: 'B',
    correct: index < correct,
    assistance: 'none' as const,
    seenBefore: false,
    ...over,
  }));
}

function build(drafts: readonly EvidenceDraft[]): LearnerRecordV1 {
  let record = emptyLearnerRecord();
  for (const draft of drafts) {
    record = appendAllEvidence(record, [createEvidenceEvent(draft, record)]);
  }
  return record;
}

/* ── Real catalogue ids these profiles use ───────────────────────────────── */

export const PROFILE_IDS = {
  readingPapers: ['test:reading-full-001', 'test:reading-full-002', 'test:reading-full-003'],
  listeningPapers: ['test:listening-full-001', 'test:listening-full-002'],
  writingTask2: 'write:pte-wt-103-task2',
  writingTask1: 'write:pte-wt-103-task1',
  speakingPart2: 'speak:cc-2026-04',
  headingsLesson: 'lesson:reading-headings',
  headingsCheck: 'check:practice-reading-headings',
  headingsDrill: 'drill:reading-full-013-drill-p1',
  readingOverview: 'lesson:reading-task1',
} as const;

/* ── Pieces of work ──────────────────────────────────────────────────────── */

/** SYNTHETIC: a whole Reading paper sat under timing, unaided. */
export function readingPaper(
  date: string,
  band: number,
  over: Partial<EvidenceDraft> = {},
  index = 0,
): EvidenceDraft {
  const testId = PROFILE_IDS.readingPapers[index % PROFILE_IDS.readingPapers.length]!;
  const paperId = testId.slice('test:'.length);
  return {
    activityId: testId,
    contentVersion: 1,
    ...day(date),
    paper: 'reading',
    subskill: WHOLE_ACTIVITY_SUBSKILL,
    mode: 'assessment',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: {
      kind: 'scored',
      raw: Math.round((band / 9) * 40),
      total: 40,
      bandEstimate: band,
      bySubskill: { 'matching-headings': { correct: 8, total: 10 }, 'multiple-choice': { correct: 7, total: 10 } },
    },
    sourceMaterial: [paperExposureKey(paperId)],
    ...over,
  };
}

/** SYNTHETIC: a whole Listening paper. */
export function listeningPaper(date: string, band: number, index = 0, over: Partial<EvidenceDraft> = {}): EvidenceDraft {
  const testId = PROFILE_IDS.listeningPapers[index % PROFILE_IDS.listeningPapers.length]!;
  return {
    ...readingPaper(date, band),
    activityId: testId,
    paper: 'listening',
    outcome: {
      kind: 'scored',
      raw: Math.round((band / 9) * 40),
      total: 40,
      bandEstimate: band,
      bySubskill: { 'sentence-completion': { correct: 7, total: 10 } },
    },
    sourceMaterial: [paperExposureKey(testId.slice('test:'.length))],
    ...over,
  };
}

/** SYNTHETIC: one essay marked by the calibrated grader, live. */
export function writingEssay(
  date: string,
  band: number,
  task: 'task1' | 'task2' = 'task2',
  over: Partial<EvidenceDraft> = {},
): EvidenceDraft {
  return {
    activityId: task === 'task2' ? PROFILE_IDS.writingTask2 : PROFILE_IDS.writingTask1,
    contentVersion: 1,
    ...day(date),
    paper: 'writing',
    subskill: WHOLE_ACTIVITY_SUBSKILL,
    mode: 'assessment',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    taskScope: { kind: 'writing-task', task },
    outcome: {
      kind: 'graded',
      overallBand: band,
      criteria: {
        taskResponse: band,
        coherenceCohesion: band,
        lexicalResource: band - 0.5,
        grammaticalRange: band,
      },
      grader: { name: 'gpt-5.6-sol', live: true },
      wordCount: 270,
    },
    ...over,
  };
}

/** SYNTHETIC: one Speaking Part 2 answer marked by the calibrated grader. */
export function speakingAnswer(date: string, band: number, over: Partial<EvidenceDraft> = {}): EvidenceDraft {
  return {
    activityId: PROFILE_IDS.speakingPart2,
    contentVersion: 1,
    ...day(date),
    paper: 'speaking',
    subskill: WHOLE_ACTIVITY_SUBSKILL,
    mode: 'assessment',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    taskScope: { kind: 'speaking-part', part: 2 },
    outcome: {
      kind: 'graded',
      overallBand: band,
      criteria: {
        fluencyCoherence: band,
        lexicalResource: band,
        grammaticalRange: band,
        pronunciation: band,
      },
      grader: { name: 'gpt-audio-1.5', live: true },
    },
    ...over,
  };
}

/** SYNTHETIC: one short set of question-type practice. */
export function typePractice(
  date: string,
  paper: Paper,
  subskill: Subskill,
  correct: number,
  total: number,
  over: Partial<EvidenceDraft> = {},
): EvidenceDraft {
  const activityId = over.activityId ?? PROFILE_IDS.headingsCheck;
  return {
    activityId,
    contentVersion: 1,
    ...day(date),
    paper,
    subskill,
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: { kind: 'scored', raw: correct, total, bySubskill: { [subskill]: { correct, total } } },
    items: items(`${subskill}-${date}`, correct, total),
    ...over,
  };
}

/** SYNTHETIC: a lesson opened and marked done. Studied, never mastery. */
export function lessonStudied(date: string, activityId: string, paper: Paper, subskill: Subskill, minutes = 12): EvidenceDraft {
  return {
    activityId,
    contentVersion: 1,
    ...day(date),
    paper,
    subskill,
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: { kind: 'studied', estimatedMinutes: minutes },
  };
}

/* ── The profiles ────────────────────────────────────────────────────────── */

function baseConstraints(over: Partial<PlanConstraints> = {}): PlanConstraints {
  return {
    regularDailyMinutes: 60,
    regularDailyMinutesStatus: 'confirmed',
    studyDays: 'daily',
    explanationLocale: 'en',
    tzOffsetMinutes: 0,
    ...over,
  };
}

function baseGoals(over: Partial<PlanGoals> = {}): PlanGoals {
  return {
    overallTarget: null,
    perPaperMinimums: {},
    examDate: null,
    route: 'academic',
    selfReported: [],
    ...over,
  };
}

function profile(
  name: string,
  description: string,
  drafts: readonly EvidenceDraft[],
  goals: PlanGoals,
  constraints: PlanConstraints,
  over: ProfileOverride = {},
): LearnerProfile {
  return {
    name,
    description,
    record: build(drafts),
    goals: { ...goals, ...over.goals },
    constraints: { ...constraints, ...over.constraints },
    today: over.today ?? PROFILE_TODAY,
    now: over.now ?? PROFILE_NOW,
  };
}

/** Nothing recorded, no goal, no date. The first screen anyone ever sees. */
export function syntheticNew(over: ProfileOverride = {}): LearnerProfile {
  return profile(
    'SYNTHETIC-new',
    'No evidence, no goal and no exam date. Nothing about them may be invented.',
    [],
    baseGoals(),
    baseConstraints({ regularDailyMinutesStatus: 'provisional' }),
    over,
  );
}

/** Reading demonstrated well over three papers, Writing weak over two live
    graded essays. Target 7.0 overall with a Writing minimum of 6.5. */
export function syntheticStrongReadingWeakWriting(over: ProfileOverride = {}): LearnerProfile {
  return profile(
    'SYNTHETIC-strong-reading-weak-writing',
    'Reading 7.5 over three papers, Writing 5.5 over two graded essays, target 7.0 with Writing at least 6.5.',
    [
      readingPaper(daysBefore(20), 7.5, {}, 0),
      readingPaper(daysBefore(12), 7.5, {}, 1),
      readingPaper(daysBefore(4), 8, {}, 2),
      writingEssay(daysBefore(14), 5.5, 'task2'),
      writingEssay(daysBefore(6), 5.5, 'task1'),
      listeningPaper(daysBefore(9), 7),
      speakingAnswer(daysBefore(8), 7),
    ],
    baseGoals({
      overallTarget: { band: 7, status: 'confirmed' },
      perPaperMinimums: { writing: { band: 6.5, status: 'confirmed' } },
      examDate: { date: daysAfter(45), status: 'confirmed' },
    }),
    baseConstraints(),
    over,
  );
}

/** The mirror image, so two opposite profiles can be compared directly. */
export function syntheticWeakReadingStrongWriting(over: ProfileOverride = {}): LearnerProfile {
  return profile(
    'SYNTHETIC-weak-reading-strong-writing',
    'Reading 5.5 over three papers, Writing 7.5 over two graded essays, target 7.0 with Reading at least 6.5.',
    [
      readingPaper(daysBefore(20), 5.5, { outcome: { kind: 'scored', raw: 18, total: 40, bandEstimate: 5.5, bySubskill: { 'matching-headings': { correct: 2, total: 10 } } } }, 0),
      readingPaper(daysBefore(12), 5.5, { outcome: { kind: 'scored', raw: 18, total: 40, bandEstimate: 5.5, bySubskill: { 'matching-headings': { correct: 3, total: 10 } } } }, 1),
      readingPaper(daysBefore(4), 5.5, { outcome: { kind: 'scored', raw: 18, total: 40, bandEstimate: 5.5, bySubskill: { 'matching-headings': { correct: 2, total: 10 } } } }, 2),
      writingEssay(daysBefore(14), 7.5, 'task2'),
      writingEssay(daysBefore(6), 7.5, 'task1'),
      listeningPaper(daysBefore(9), 7),
      speakingAnswer(daysBefore(8), 7),
    ],
    baseGoals({
      overallTarget: { band: 7, status: 'confirmed' },
      perPaperMinimums: { reading: { band: 6.5, status: 'confirmed' } },
      examDate: { date: daysAfter(45), status: 'confirmed' },
    }),
    baseConstraints(),
    over,
  );
}

/** The lowest paper already meets its own minimum. Writing must NOT be
    treated as a gap just because it is the lowest number on the screen. */
export function syntheticLowestButMet(over: ProfileOverride = {}): LearnerProfile {
  return profile(
    'SYNTHETIC-lowest-but-met',
    'Target 6.5 overall with Writing at least 5.5. Writing measures 5.5 and everything else 7.0.',
    [
      readingPaper(daysBefore(18), 7, {}, 0),
      readingPaper(daysBefore(10), 7, {}, 1),
      listeningPaper(daysBefore(16), 7, 0),
      listeningPaper(daysBefore(8), 7, 1),
      writingEssay(daysBefore(15), 5.5, 'task1'),
      writingEssay(daysBefore(7), 5.5, 'task2'),
      speakingAnswer(daysBefore(14), 7),
      speakingAnswer(daysBefore(6), 7),
    ],
    baseGoals({
      overallTarget: { band: 6.5, status: 'confirmed' },
      perPaperMinimums: { writing: { band: 5.5, status: 'confirmed' } },
      examDate: { date: daysAfter(40), status: 'confirmed' },
    }),
    baseConstraints(),
    over,
  );
}

/** The audit's first reproduced example: a confirmed Band 7 goal and two
    Reading attempts holding 2 of 16 Matching Headings answers. */
export function syntheticMatchingHeadings(over: ProfileOverride = {}): LearnerProfile {
  return profile(
    'SYNTHETIC-matching-headings',
    'Two Reading papers with 2 of 16 Matching Headings answers right, confirmed target band 7.',
    [
      readingPaper(daysBefore(11), 6, {
        outcome: {
          kind: 'scored',
          raw: 24,
          total: 40,
          bandEstimate: 6,
          bySubskill: { 'matching-headings': { correct: 1, total: 8 }, 'multiple-choice': { correct: 8, total: 10 } },
        },
      }, 0),
      readingPaper(daysBefore(3), 6, {
        outcome: {
          kind: 'scored',
          raw: 24,
          total: 40,
          bandEstimate: 6,
          bySubskill: { 'matching-headings': { correct: 1, total: 8 }, 'multiple-choice': { correct: 8, total: 10 } },
        },
      }, 1),
      typePractice(daysBefore(10), 'reading', 'matching-headings', 2, 8),
      typePractice(daysBefore(2), 'reading', 'matching-headings', 2, 8, {
        activityId: PROFILE_IDS.headingsDrill,
        items: items('headings-second', 2, 8),
      }),
      listeningPaper(daysBefore(9), 6.5),
      writingEssay(daysBefore(8), 6),
      speakingAnswer(daysBefore(7), 6.5),
    ],
    baseGoals({
      overallTarget: { band: 7, status: 'confirmed' },
      examDate: { date: daysAfter(35), status: 'confirmed' },
    }),
    baseConstraints(),
    over,
  );
}

/** Seven days to the exam and fifteen minutes a day. The honest answer is a
    small scope and a plain sentence about what will not fit. */
export function syntheticSevenDay(over: ProfileOverride = {}): LearnerProfile {
  return profile(
    'SYNTHETIC-seven-day',
    'Exam in seven days, fifteen minutes a day, nothing measured.',
    [],
    baseGoals({
      overallTarget: { band: 7, status: 'confirmed' },
      examDate: { date: daysAfter(7), status: 'confirmed' },
    }),
    baseConstraints({ regularDailyMinutes: 15 }),
    over,
  );
}

/** A running plan with a week of missed study days behind it. */
export function syntheticMissedWeek(over: ProfileOverride = {}): LearnerProfile {
  return profile(
    'SYNTHETIC-missed-week',
    'Seven consecutive missed study days after a normal start.',
    [
      readingPaper(daysBefore(21), 6, {}, 0),
      typePractice(daysBefore(20), 'reading', 'matching-headings', 5, 8),
      listeningPaper(daysBefore(19), 6),
      writingEssay(daysBefore(18), 6),
      speakingAnswer(daysBefore(17), 6),
    ],
    baseGoals({
      overallTarget: { band: 7, status: 'confirmed' },
      examDate: { date: daysAfter(30), status: 'confirmed' },
    }),
    baseConstraints(),
    over,
  );
}

/** An exam date ten days in the past. This must never read as finished. */
export function syntheticExpired(over: ProfileOverride = {}): LearnerProfile {
  return profile(
    'SYNTHETIC-expired',
    'Exam date ten days in the past, half the course unfinished.',
    [
      readingPaper(daysBefore(40), 6, {}, 0),
      lessonStudied(daysBefore(39), PROFILE_IDS.headingsLesson, 'reading', 'matching-headings'),
    ],
    baseGoals({
      overallTarget: { band: 7, status: 'confirmed' },
      examDate: { date: daysBefore(10), status: 'confirmed' },
    }),
    baseConstraints(),
    over,
  );
}

/** Right every time on Matching Headings, always after a hint. Guided
    success, never an independent demonstration. */
export function syntheticHinted(over: ProfileOverride = {}): LearnerProfile {
  const hinted = (date: string, activityId: string): EvidenceDraft => ({
    activityId,
    contentVersion: 1,
    ...day(date),
    paper: 'reading',
    subskill: 'matching-headings',
    mode: 'lesson-check',
    completion: 'completed',
    assistance: 'hint',
    seenBefore: false,
    outcome: { kind: 'scored', raw: 8, total: 8, bySubskill: { 'matching-headings': { correct: 8, total: 8 } } },
    items: items(`hinted-${date}`, 8, 8, { assistance: 'hint' }),
  });
  return profile(
    'SYNTHETIC-hinted',
    'Matching Headings right every time, always after a hint.',
    [
      lessonStudied(daysBefore(16), PROFILE_IDS.headingsLesson, 'reading', 'matching-headings'),
      hinted(daysBefore(15), PROFILE_IDS.headingsCheck),
      hinted(daysBefore(9), PROFILE_IDS.headingsDrill),
      hinted(daysBefore(3), 'drill:reading-full-014-drill-p1'),
    ],
    baseGoals({ overallTarget: { band: 7, status: 'confirmed' } }),
    baseConstraints(),
    over,
  );
}

/** The same paper sat three times, improving each time. The repeats are
    practice and must not inflate confidence. */
export function syntheticRepeat(over: ProfileOverride = {}): LearnerProfile {
  return profile(
    'SYNTHETIC-repeat',
    'One Reading paper sat three times, improving each time on questions already seen.',
    [
      readingPaper(daysBefore(18), 6, {}, 0),
      readingPaper(daysBefore(11), 6.5, {}, 0),
      readingPaper(daysBefore(4), 7, {}, 0),
    ],
    baseGoals({ overallTarget: { band: 7, status: 'confirmed' } }),
    baseConstraints(),
    over,
  );
}

/** Two submitted papers with every answer blank. Ignored, with a reason. */
export function syntheticBlank(over: ProfileOverride = {}): LearnerProfile {
  const blank = (date: string, index: number): EvidenceDraft =>
    readingPaper(date, 2.5, {
      completion: 'blank',
      outcome: { kind: 'scored', raw: 0, total: 40, bandEstimate: 2.5, bySubskill: {} },
      items: items(`blank-${date}`, 0, 40, { firstAnswer: '' }),
    }, index);
  return profile(
    'SYNTHETIC-blank',
    'Two Reading papers submitted with every answer blank.',
    [blank(daysBefore(9), 0), blank(daysBefore(2), 1)],
    baseGoals({ overallTarget: { band: 7, status: 'confirmed' } }),
    baseConstraints(),
    over,
  );
}

/** Three unimproved independent attempts on one question type, which is
    where the plan stops offering more of the same drill (lead decision Q2). */
export function syntheticStuck(over: ProfileOverride = {}): LearnerProfile {
  return profile(
    'SYNTHETIC-stuck',
    'Three independent Matching Headings attempts in a row with no improvement.',
    [
      lessonStudied(daysBefore(22), PROFILE_IDS.readingOverview, 'reading', 'exam-format', 8),
      lessonStudied(daysBefore(21), PROFILE_IDS.headingsLesson, 'reading', 'matching-headings'),
      typePractice(daysBefore(18), 'reading', 'matching-headings', 2, 8),
      typePractice(daysBefore(12), 'reading', 'matching-headings', 2, 8, {
        activityId: PROFILE_IDS.headingsDrill,
        items: items('stuck-2', 2, 8),
      }),
      typePractice(daysBefore(6), 'reading', 'matching-headings', 2, 8, {
        activityId: 'drill:reading-full-014-drill-p1',
        items: items('stuck-3', 2, 8),
      }),
      listeningPaper(daysBefore(20), 6.5),
      writingEssay(daysBefore(19), 6),
      speakingAnswer(daysBefore(17), 6.5),
    ],
    baseGoals({
      overallTarget: { band: 7, status: 'confirmed' },
      examDate: { date: daysAfter(30), status: 'confirmed' },
    }),
    baseConstraints(),
    over,
  );
}

/* ── The legacy stores, for the migration packages ───────────────────────── */

/** SYNTHETIC: an old ProgressV1 blob with an explicitly saved plan. Its
    `dailyMinutes` must survive migration exactly as it is. */
export function syntheticLegacy(): { name: string; description: string; progress: ProgressV1; savedPlan: SavedPlan } {
  const lessons: ProgressV1['lessons'] = {};
  for (let index = 0; index < 20; index += 1) {
    lessons[`legacy-lesson-${index}`] = { completedAt: `${daysBefore(60 - index)}T10:00:00.000Z` };
  }
  return {
    name: 'SYNTHETIC-legacy',
    description: 'Twenty studied lessons, three test attempts, two essays, and a plan the student really saved.',
    progress: {
      version: 1,
      lessons,
      tests: {
        'reading-full-001': [
          { at: `${daysBefore(30)}T10:00:00.000Z`, score: 30, total: 40, band: 7, skill: 'reading', byType: { 'matching-headings': { correct: 6, total: 10 } } },
        ],
        'listening-full-001': [
          { at: `${daysBefore(25)}T10:00:00.000Z`, score: 28, total: 40, band: 6.5, skill: 'listening', byType: {} },
        ],
        'reading-full-002': [
          { at: `${daysBefore(20)}T10:00:00.000Z`, score: 32, total: 40, band: 7.5, skill: 'reading', byType: {} },
        ],
      },
      writing: {
        'pte-wt-103-task2': [
          { at: `${daysBefore(18)}T10:00:00.000Z`, band: 6, live: true },
          { at: `${daysBefore(9)}T10:00:00.000Z`, band: 6.5, live: true },
        ],
      },
      speaking: [],
    } as unknown as ProgressV1,
    savedPlan: {
      targetBand: 7,
      testDate: daysAfter(30),
      createdAt: `${daysBefore(60)}T10:00:00.000Z`,
      done: [],
      dailyMinutes: 40,
      studyDays: 'daily',
      defaulted: false,
    } as unknown as SavedPlan,
  };
}

/** The same, but the plan was fabricated on first visit and never
    confirmed. Its minutes must NOT be carried over. */
export function syntheticLegacyDefaulted(): { name: string; description: string; progress: ProgressV1; savedPlan: SavedPlan } {
  const base = syntheticLegacy();
  return {
    name: 'SYNTHETIC-legacy-defaulted',
    description: 'The same history, but the plan was fabricated on first visit and never confirmed.',
    progress: base.progress,
    savedPlan: {
      targetBand: 7,
      createdAt: `${daysBefore(60)}T10:00:00.000Z`,
      done: [],
      defaulted: true,
    } as unknown as SavedPlan,
  };
}

/* ── The index ───────────────────────────────────────────────────────────── */

/** Every profile builder by name, so a sweep can run over all of them and a
    later package can pick one by the name used in the architecture. */
export const LEARNING_PROFILES: Readonly<Record<string, (over?: ProfileOverride) => LearnerProfile>> = {
  'SYNTHETIC-new': syntheticNew,
  'SYNTHETIC-strong-reading-weak-writing': syntheticStrongReadingWeakWriting,
  'SYNTHETIC-weak-reading-strong-writing': syntheticWeakReadingStrongWriting,
  'SYNTHETIC-lowest-but-met': syntheticLowestButMet,
  'SYNTHETIC-matching-headings': syntheticMatchingHeadings,
  'SYNTHETIC-seven-day': syntheticSevenDay,
  'SYNTHETIC-missed-week': syntheticMissedWeek,
  'SYNTHETIC-expired': syntheticExpired,
  'SYNTHETIC-hinted': syntheticHinted,
  'SYNTHETIC-repeat': syntheticRepeat,
  'SYNTHETIC-blank': syntheticBlank,
  'SYNTHETIC-stuck': syntheticStuck,
};
