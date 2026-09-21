/* Carrying an existing student's history forward without inventing any of it.
 *
 * Every student in this file is SYNTHETIC. The shapes are exactly the ones
 * src/lib/progress.ts writes today.
 *
 * What is pinned here:
 *   - running the migration twice, or on two devices, gives the same ids
 *     and no duplicates;
 *   - a migrated row carries no item-level detail, because the old store
 *     never had any;
 *   - a completion click stays `studied`;
 *   - an attempt graded by the offline stub yields no ability evidence;
 *   - a renamed lesson key maps forward;
 *   - the old stores come out of it byte for byte unchanged. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildLegacyEvents,
  migrateInto,
  migrateProgress,
  needsMigration,
  paperFromLessonKey,
  renameLessonKey,
  RENAMED_LESSON_KEYS,
} from '../src/lib/learning/migrate.ts';
import {
  classifyAll,
  classifyEvidence,
  createEvidenceEvent,
  emptyLearnerRecord,
  mergeLearnerRecords,
  seenSourcePapers,
} from '../src/lib/learning/evidence.ts';
import { MIGRATION_VERSION, UNCLASSIFIED_LESSON_SUBSKILL } from '../src/lib/learning/contracts/evidence.ts';
import type { ProgressV1 } from '../src/lib/progress.ts';
import type { SavedPlan } from '../src/lib/study-plan.ts';

const NOW = '2026-09-21T12:00:00.000Z';
/** Fixed so the record does not depend on the machine's time zone. Real
    callers pass the device's own conversion; see MigrationOptions. */
const UTC_DATE = (iso: string) => iso.slice(0, 10);
const OPTIONS = { now: NOW, localDateOf: UTC_DATE };

/* ── A synthetic student with one of everything ──────────────────────────── */

function syntheticProgress(): ProgressV1 {
  return {
    version: 1,
    lessons: {
      'reading-matching-headings': { completedAt: '2026-08-01T10:00:00.000Z' },
      // Completed before the 2026-09 rename.
      'reading-cat': { completedAt: '2026-08-02T10:00:00.000Z' },
      'vocab-environment': { completedAt: '2026-08-03T10:00:00.000Z' },
    },
    tests: {
      'reading-001': [
        {
          at: '2026-08-10T10:00:00.000Z',
          raw: 31,
          total: 40,
          band: 7,
          bandLabel: '7 to 7.5',
          secondsUsed: 3400,
          byType: { 'matching-headings': { correct: 4, total: 6 }, 'true-false-not-given': { correct: 7, total: 7 } },
          kind: 'full',
          skill: 'reading',
        },
      ],
      'listening-002': [
        {
          at: '2026-08-12T10:00:00.000Z',
          raw: 7,
          total: 10,
          band: 6,
          bandLabel: '6 to 6.5',
          secondsUsed: 600,
          kind: 'drill',
          skill: 'listening',
        },
      ],
    },
    writing: {
      'task2-crime': [
        {
          at: '2026-08-15T10:00:00.000Z',
          overallBand: 6.5,
          criteria: { taskResponse: 6, coherenceCohesion: 7, lexicalResource: 6.5, grammaticalRange: 6.5 },
          wordCount: 281,
          live: true,
          task: 'task2',
        },
        {
          // Graded offline, before the live grader was configured.
          at: '2026-08-16T10:00:00.000Z',
          overallBand: 8,
          criteria: { taskResponse: 8 },
          wordCount: 190,
          live: false,
          task: 'task1',
        },
      ],
    },
    speaking: [
      {
        at: '2026-08-20T10:00:00.000Z',
        mode: 'part2',
        topic: 'Describe a journey',
        overallBand: 6,
        criteria: { fluencyCoherence: 6, pronunciation: 6.5 },
        live: true,
      },
    ],
    activity: { '2026-08-01': { minutes: 12, lessons: 1, attempts: 0 } },
  };
}

function syntheticPlan(overrides: Partial<SavedPlan> = {}): SavedPlan {
  return {
    targetBand: '7.0',
    testDate: '2026-11-01',
    createdAt: '2026-07-01T09:00:00.000Z',
    done: [],
    doneKeys: ['extra:mock-reading', 'reading-matching-headings'],
    dailyMinutes: 40,
    ...overrides,
  };
}

/* ── Determinism ─────────────────────────────────────────────────────────── */

test('running the migration twice gives byte-identical output', () => {
  const first = migrateProgress(syntheticProgress(), syntheticPlan(), {}, OPTIONS);
  const second = migrateProgress(syntheticProgress(), syntheticPlan(), {}, OPTIONS);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('running it again over its own output adds nothing', () => {
  const once = migrateProgress(syntheticProgress(), syntheticPlan(), {}, OPTIONS);
  const again = migrateInto(once, syntheticProgress(), syntheticPlan(), {}, OPTIONS);
  assert.equal(again.events.length, once.events.length);
  assert.deepEqual(again.events.map((e) => e.id), once.events.map((e) => e.id));
  assert.equal(again.evidenceVersion, once.evidenceVersion);
});

test('two devices migrating the same history merge into one record, not two', () => {
  const deviceA = migrateProgress(syntheticProgress(), syntheticPlan(), {}, OPTIONS);
  const deviceB = migrateProgress(syntheticProgress(), syntheticPlan(), {}, OPTIONS);
  const merged = mergeLearnerRecords(deviceA, deviceB);
  assert.equal(merged.events.length, deviceA.events.length);
  assert.deepEqual(mergeLearnerRecords(deviceB, deviceA), merged);
});

test('every migrated id is the one architecture section 4.1 names', () => {
  const { events } = buildLegacyEvents(syntheticProgress(), syntheticPlan(), {}, OPTIONS);
  const ids = events.map((e) => e.id).sort();
  assert.deepEqual(ids, [
    'legacy:drill:listening-002:2026-08-12T10:00:00.000Z',
    'legacy:extra:mock-reading',
    'legacy:lesson:reading-matching-features',
    'legacy:lesson:reading-matching-headings',
    'legacy:lesson:vocab-environment',
    'legacy:speaking:2026-08-20T10:00:00.000Z',
    'legacy:test:reading-001:2026-08-10T10:00:00.000Z',
    'legacy:writing:task2-crime:2026-08-15T10:00:00.000Z',
    'legacy:writing:task2-crime:2026-08-16T10:00:00.000Z',
  ]);
  assert.ok(ids.every((id) => id.startsWith('legacy:')));
});

/* ── What a migrated row may and may not claim ───────────────────────────── */

test('no migrated event carries item-level detail, because the old store never had any', () => {
  const record = migrateProgress(syntheticProgress(), syntheticPlan(), {}, OPTIONS);
  assert.ok(record.events.length > 0);
  for (const event of record.events) {
    assert.equal(event.items, undefined, `${event.id} must carry no items`);
    assert.equal(event.provenance, 'legacy');
    assert.equal(event.assistance, 'none');
    assert.equal(event.seenBefore, false);
  }
  assert.equal(JSON.stringify(record.events).includes('firstAnswer'), false);
});

test('a lesson completion is studied and never a demonstration', () => {
  const record = migrateProgress(syntheticProgress(), null, { 'reading-matching-headings': 22 }, OPTIONS);
  const lesson = record.events.find((e) => e.id === 'legacy:lesson:reading-matching-headings')!;
  assert.equal(lesson.outcome.kind, 'studied');
  assert.equal(lesson.mode, 'practice');
  assert.equal(classifyEvidence(lesson).use, 'study');
  assert.equal(classifyEvidence(lesson).reason, 'studied-only');
  // The registry's own estimate, never a measurement.
  assert.equal(lesson.outcome.kind === 'studied' ? lesson.outcome.estimatedMinutes : 0, 22);
});

test('a renamed lesson key maps forward and does not become a second row', () => {
  const record = migrateProgress(syntheticProgress(), null, {}, OPTIONS);
  const ids = record.events.map((e) => e.id);
  assert.ok(ids.includes('legacy:lesson:reading-matching-features'));
  assert.equal(ids.includes('legacy:lesson:reading-cat'), false);
  assert.equal(renameLessonKey('listening-section3'), 'listening-part3');
  assert.equal(renameLessonKey('reading-matching-headings'), 'reading-matching-headings');
});

test('two keys renamed onto one keep the earlier completion', () => {
  const progress = syntheticProgress();
  progress.lessons['reading-matching-features'] = { completedAt: '2026-08-09T10:00:00.000Z' };
  const record = migrateProgress(progress, null, {}, OPTIONS);
  const rows = record.events.filter((e) => e.id === 'legacy:lesson:reading-matching-features');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.at, '2026-08-02T10:00:00.000Z');
});

test('a full paper keeps its band, a drill does not get one', () => {
  const { events } = buildLegacyEvents(syntheticProgress(), null, {}, OPTIONS);
  const paper = events.find((e) => e.id.startsWith('legacy:test:'))!;
  const drill = events.find((e) => e.id.startsWith('legacy:drill:'))!;

  assert.equal(paper.mode, 'assessment');
  assert.equal(paper.outcome.kind === 'scored' ? paper.outcome.bandEstimate : null, 7);
  assert.deepEqual(
    paper.outcome.kind === 'scored' ? paper.outcome.bySubskill : {},
    { 'matching-headings': { correct: 4, total: 6 }, 'true-false-not-given': { correct: 7, total: 7 } },
  );

  // A ten-question drill is not a band, whatever the old row put in its
  // band field.
  assert.equal(drill.mode, 'practice');
  assert.equal(drill.outcome.kind === 'scored' ? drill.outcome.bandEstimate : 'unset', undefined);
  assert.equal(drill.paper, 'listening');
});

test('an attempt recorded before the skill field existed is treated as Reading', () => {
  const progress = syntheticProgress();
  progress.tests['old-001'] = [
    { at: '2026-07-01T10:00:00.000Z', raw: 20, total: 40, band: 5.5, bandLabel: '5.5', secondsUsed: 3600 },
  ];
  const { events } = buildLegacyEvents(progress, null, {}, OPTIONS);
  const migrated = events.find((e) => e.id === 'legacy:test:old-001:2026-07-01T10:00:00.000Z')!;
  assert.equal(migrated.paper, 'reading');
  assert.equal(migrated.activityId, 'test:reading');
});

test('Writing Task 1 and Task 2 stay apart, and so do the Speaking parts', () => {
  const { events } = buildLegacyEvents(syntheticProgress(), null, {}, OPTIONS);
  const task2 = events.find((e) => e.id === 'legacy:writing:task2-crime:2026-08-15T10:00:00.000Z')!;
  const task1 = events.find((e) => e.id === 'legacy:writing:task2-crime:2026-08-16T10:00:00.000Z')!;
  assert.deepEqual(task2.taskScope, { kind: 'writing-task', task: 'task2' });
  assert.deepEqual(task1.taskScope, { kind: 'writing-task', task: 'task1' });

  const speaking = events.find((e) => e.id.startsWith('legacy:speaking:'))!;
  assert.deepEqual(speaking.taskScope, { kind: 'speaking-part', part: 2 });
  assert.equal(speaking.paper, 'speaking');
});

test('criterion bands and the pointer back into the old store are preserved', () => {
  const { events } = buildLegacyEvents(syntheticProgress(), null, {}, OPTIONS);
  const essay = events.find((e) => e.id === 'legacy:writing:task2-crime:2026-08-15T10:00:00.000Z')!;
  assert.equal(essay.outcome.kind, 'graded');
  if (essay.outcome.kind !== 'graded') return;
  assert.deepEqual(essay.outcome.criteria, {
    taskResponse: 6,
    coherenceCohesion: 7,
    lexicalResource: 6.5,
    grammaticalRange: 6.5,
  });
  assert.deepEqual(essay.outcome.legacyRef, { store: 'writing', key: 'task2-crime', at: '2026-08-15T10:00:00.000Z' });
  assert.equal(essay.outcome.wordCount, 281);
});

test('an attempt that was not live graded produces no ability evidence', () => {
  const record = migrateProgress(syntheticProgress(), null, {}, OPTIONS);
  const stub = record.events.find((e) => e.id === 'legacy:writing:task2-crime:2026-08-16T10:00:00.000Z')!;

  // It is kept, so the student's own history still shows it.
  assert.ok(stub);
  assert.equal(stub.outcome.kind === 'graded' ? stub.outcome.grader.live : true, false);

  const verdict = classifyEvidence(stub);
  assert.equal(verdict.use, 'excluded');
  assert.equal(verdict.reason, 'stub-graded');

  const breakdown = classifyAll(record.events);
  assert.equal(breakdown.independent.some((e) => e.id === stub.id), false);
  assert.ok(breakdown.ignored.some((entry) => entry.reason === 'stub-graded' && entry.count === 1));
});

test('no migrated event could hold a recording', () => {
  const record = migrateProgress(syntheticProgress(), syntheticPlan(), {}, OPTIONS);
  const serialised = JSON.stringify(record);
  for (const field of ['"audio"', '"recording"', '"blob"', '"pcm"']) {
    assert.equal(serialised.includes(field), false, `${field} must not appear`);
  }
});

/* ── Exposure, so a re-sit after migration is not fresh ──────────────────── */

test('the exposure log is seeded, so re-sitting a migrated paper is not fresh evidence', () => {
  const record = migrateProgress(syntheticProgress(), null, {}, OPTIONS);
  assert.deepEqual(seenSourcePapers(record).sort(), ['listening-002', 'reading-001']);

  const resit = createEvidenceEvent(
    {
      activityId: 'test:reading',
      contentVersion: 1,
      at: '2026-09-20T10:00:00.000Z',
      localDate: '2026-09-20',
      paper: 'reading',
      subskill: 'matching-headings',
      mode: 'assessment',
      completion: 'completed',
      assistance: 'none',
      outcome: { kind: 'scored', raw: 33, total: 40, bandEstimate: 7.5, bySubskill: {} },
      sourceMaterial: ['paper:reading-001'],
    },
    record,
  );
  assert.equal(resit.seenBefore, true);
  assert.equal(classifyEvidence(resit).reason, 'repeat-of-seen-material');
});

/* ── The plan's ticked extras ────────────────────────────────────────────── */

test('the exam-readiness extras become completion clicks, and lesson keys in that list are ignored', () => {
  const record = migrateProgress(syntheticProgress(), syntheticPlan(), {}, OPTIONS);
  const extra = record.events.find((e) => e.activityId === 'extra:mock-reading')!;
  assert.equal(extra.outcome.kind, 'studied');
  assert.equal(extra.paper, 'reading');
  assert.equal(extra.at, '2026-07-01T09:00:00.000Z');
  // 'reading-matching-headings' is in doneKeys too, but lesson completion is
  // read from progress.lessons and must not be duplicated from here.
  assert.equal(record.events.filter((e) => e.id.includes('reading-matching-headings')).length, 1);
  assert.equal(record.migration?.planStepsMigrated, 1);
});

test('a plan with no ticked extras adds nothing', () => {
  const record = migrateProgress(syntheticProgress(), syntheticPlan({ doneKeys: undefined }), {}, OPTIONS);
  assert.equal(record.events.some((e) => e.id.startsWith('legacy:extra:')), false);
  assert.equal(record.migration?.planStepsMigrated, 0);
});

/* ── Counts, stamp and re-runs ───────────────────────────────────────────── */

test('the stamp states what moved rather than claiming it', () => {
  const record = migrateProgress(syntheticProgress(), syntheticPlan(), {}, OPTIONS);
  assert.deepEqual(record.migration, {
    migrationVersion: MIGRATION_VERSION,
    ranAt: NOW,
    lessonsMigrated: 3,
    testAttemptsMigrated: 2,
    writingAttemptsMigrated: 2,
    speakingAttemptsMigrated: 1,
    lessonsWithoutSubskill: 3,
    planStepsMigrated: 1,
    rowsSkipped: 0,
  });
  assert.equal(needsMigration(emptyLearnerRecord()), true);
  assert.equal(needsMigration(record), false);
});

test('a lesson whose subskill the caller names is filed under it, and the rest are counted', () => {
  const record = migrateProgress(syntheticProgress(), null, {}, {
    ...OPTIONS,
    lessonSubskills: { 'reading-matching-headings': 'matching-headings' },
  });
  const named = record.events.find((e) => e.id === 'legacy:lesson:reading-matching-headings')!;
  const unnamed = record.events.find((e) => e.id === 'legacy:lesson:vocab-environment')!;
  assert.equal(named.subskill, 'matching-headings');
  assert.equal(unnamed.subskill, UNCLASSIFIED_LESSON_SUBSKILL);
  assert.equal(record.migration?.lessonsWithoutSubskill, 2);
});

test('a lesson key says which paper it belongs to, and vocabulary is not a paper', () => {
  assert.equal(paperFromLessonKey('reading-matching-headings'), 'reading');
  assert.equal(paperFromLessonKey('listening'), 'listening');
  assert.equal(paperFromLessonKey('vocab-environment'), undefined);
  assert.equal(paperFromLessonKey('something-else'), undefined);
});

/* ── Sparse, empty and hand-edited stores ────────────────────────────────── */

test('an empty or missing store migrates to an empty record rather than throwing', () => {
  for (const input of [null, undefined, { version: 1, lessons: {}, tests: {}, writing: {}, speaking: [] } as ProgressV1]) {
    const record = migrateProgress(input, null, {}, OPTIONS);
    assert.equal(record.events.length, 0);
    assert.equal(record.exposure.length, 0);
    assert.equal(record.migration?.lessonsMigrated, 0);
  }
});

test('a hand-edited store loses only the rows that cannot be read', () => {
  const broken = {
    version: 1,
    lessons: {
      'reading-matching-headings': { completedAt: '2026-08-01T10:00:00.000Z' },
      'reading-mc': { completedAt: 'whenever' },
      'reading-tfng': null,
    },
    tests: {
      'reading-001': [
        { at: '2026-08-10T10:00:00.000Z', raw: 31, total: 40, band: 7, bandLabel: '7', secondsUsed: 3400, skill: 'reading' },
        { at: 'not a date', raw: 1, total: 2 },
        { raw: 'lots' },
      ],
      'reading-002': 'not a list',
    },
    writing: { 'task2-crime': [{ at: '2026-08-15T10:00:00.000Z', criteria: 'none' }] },
    speaking: [{ at: '2026-08-20T10:00:00.000Z', overallBand: 6, mode: 'part9', criteria: null, live: true }],
  } as unknown as ProgressV1;

  const record = migrateProgress(broken, { createdAt: 'nonsense' } as unknown as SavedPlan, {}, OPTIONS);
  assert.equal(record.migration?.lessonsMigrated, 1);
  assert.equal(record.migration?.testAttemptsMigrated, 1);
  assert.equal(record.migration?.writingAttemptsMigrated, 0);
  assert.equal(record.migration?.speakingAttemptsMigrated, 1);
  assert.ok((record.migration?.rowsSkipped ?? 0) >= 4);

  // The one speaking row that did survive has an unreadable part, so it
  // simply has no part rather than a guessed one.
  const speaking = record.events.find((e) => e.id.startsWith('legacy:speaking:'))!;
  assert.equal(speaking.taskScope, undefined);
  for (const event of record.events) assert.equal(event.localDate.length, 10);
});

/* ── The old stores are not touched ──────────────────────────────────────── */

test('migrating does not modify or delete anything in the old stores', () => {
  const progress = syntheticProgress();
  const plan = syntheticPlan();
  const progressBefore = JSON.stringify(progress);
  const planBefore = JSON.stringify(plan);

  migrateProgress(progress, plan, {}, OPTIONS);
  migrateInto(migrateProgress(progress, plan, {}, OPTIONS), progress, plan, {}, OPTIONS);

  assert.equal(JSON.stringify(progress), progressBefore);
  assert.equal(JSON.stringify(plan), planBefore);
});

/* ── The copied rename map cannot rot ────────────────────────────────────── */

test('the rename map here matches the one in src/lib/progress.ts', () => {
  const source = readFileSync(join(process.cwd(), 'src/lib/progress.ts'), 'utf8');
  const block = source.match(/const RENAMED_LESSON_KEYS: Record<string, string> = \{([^}]*)\}/);
  assert.ok(block, 'RENAMED_LESSON_KEYS not found in src/lib/progress.ts');
  const fromSource: Record<string, string> = {};
  for (const line of block![1]!.split('\n')) {
    const pair = line.match(/'([^']+)':\s*'([^']+)'/);
    if (pair) fromSource[pair[1]!] = pair[2]!;
  }
  assert.deepEqual({ ...RENAMED_LESSON_KEYS }, fromSource);
});
