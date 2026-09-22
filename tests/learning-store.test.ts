/* The browser copy of the learner record: whose it is, where it goes, and
 * what happens when it cannot be saved.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/learning-store.test.ts
 * The whole suite is `npm test`.
 *
 * There is no DOM here and nothing touches a real browser store. Every test
 * hands the store a few lines of memory through its own `storage` option,
 * which is also the point of that option existing: the one place in
 * src/lib/learning allowed to touch storage takes it as an argument rather
 * than reaching for a global, so it can be proved rather than eyeballed.
 *
 * What is actually being defended here, in order:
 *   1. Two students on one browser never see each other's work. That is
 *      finding R7.4-account-isolation, and it is the reason this layer
 *      exists at all.
 *   2. Writing the same work twice is one row, and the answer that stands is
 *      the one given first.
 *   3. The old stores are read and never written. A student's existing
 *      history is not something a new feature gets to risk.
 *   4. A browser with no room left says so, and keeps the session going.
 *
 * Every fixture here is SYNTHETIC: made-up students, made-up answers.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  anonymousOwner,
  createLearnerStore,
  learnerRecordKey,
  lessonMapsFrom,
  ownerNamespace,
  userOwner,
  type BrowserStorage,
} from '../src/lib/learning/store.browser.ts';
import { LEARNER_RECORD_KEY, MIGRATION_VERSION } from '../src/lib/learning/contracts/evidence.ts';
import { LEGACY_MIGRATION_OWNER_KEY } from '../src/lib/learning/contracts/sync.ts';
import { classifyEvidence, firstAnswerFor, independentItems } from '../src/lib/learning/evidence.ts';
import type { ProgressV1 } from '../src/lib/progress.ts';
import type { SavedPlan } from '../src/lib/study-plan.ts';

/* ------------------------------------------------------------------ */
/* A browser store, in nine lines of memory                            */
/* ------------------------------------------------------------------ */

interface MemoryStore extends BrowserStorage {
  data: Map<string, string>;
  /** Every key a write was attempted on, so "the old stores are never
      written" can be asserted rather than assumed. */
  writes: string[];
  /** The browser is out of room. */
  full: boolean;
  /** Storage is switched off or refused outright. */
  blocked: boolean;
}

function memoryStore(seed: Record<string, string> = {}): MemoryStore {
  const data = new Map<string, string>(Object.entries(seed));
  const store: MemoryStore = {
    data,
    writes: [],
    full: false,
    blocked: false,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      store.writes.push(key);
      if (store.blocked) throw new Error('SecurityError: storage is not available');
      if (store.full) {
        const error = new Error('QuotaExceededError: the quota has been exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  return store;
}

const FIXED_NOW = '2026-09-21T09:00:00.000Z';
const clock = () => FIXED_NOW;

/** A store that never migrates anything, for the tests that are not about
    migration: the old stores on this imaginary device are empty. */
function emptyLegacy() {
  return { progress: null as ProgressV1 | null, plan: null as SavedPlan | null };
}

function storeFor(storage: MemoryStore | null, owner = userOwner('student-a')) {
  return createLearnerStore({ storage, owner, now: clock, legacy: emptyLegacy });
}

/* ------------------------------------------------------------------ */
/* SYNTHETIC old-store fixtures                                        */
/* ------------------------------------------------------------------ */

const PROGRESS_KEY = 'ielts.progress.v1';
const PLAN_KEY = 'ielts.studyplan.v1';

/** SYNTHETIC. One made-up student's ProgressV1: two lessons finished, one
    reading paper sat, one essay marked by the live grader. */
function syntheticProgress(): ProgressV1 {
  return {
    version: 1,
    lessons: {
      'reading-matching-headings': { completedAt: '2026-08-01T10:00:00.000Z' },
      'listening-part1': { completedAt: '2026-08-02T10:00:00.000Z' },
    },
    tests: {
      'reading-full-001': [
        {
          at: '2026-08-03T10:00:00.000Z',
          raw: 28,
          total: 40,
          band: 6.5,
          bandLabel: '6.5',
          secondsUsed: 3400,
          byType: { 'matching-headings': { correct: 4, total: 6 } },
          kind: 'full',
          skill: 'reading',
        },
      ],
    },
    writing: {
      'task2-technology': [
        {
          at: '2026-08-04T10:00:00.000Z',
          overallBand: 6.5,
          criteria: { taskResponse: 6, coherenceCohesion: 7, lexicalResource: 6, grammaticalRange: 7 },
          wordCount: 268,
          live: true,
          task: 'task2',
        },
      ],
    },
    speaking: [],
    activity: {},
  };
}

/** SYNTHETIC. A plan with one exam-readiness extra ticked. */
function syntheticPlan(): SavedPlan {
  return {
    targetBand: '7.0',
    testDate: '2026-11-01',
    createdAt: '2026-07-20T09:00:00.000Z',
    done: [],
    doneKeys: ['extra:mock-reading'],
  };
}

function seededWithOldStores(): MemoryStore {
  return memoryStore({
    [PROGRESS_KEY]: JSON.stringify(syntheticProgress()),
    [PLAN_KEY]: JSON.stringify(syntheticPlan()),
  });
}

/** Read the old stores out of the memory store, the way the real default
    reads them out of the browser. */
function legacyFrom(storage: MemoryStore) {
  return () => ({
    progress: JSON.parse(storage.getItem(PROGRESS_KEY) ?? 'null') as ProgressV1 | null,
    plan: JSON.parse(storage.getItem(PLAN_KEY) ?? 'null') as SavedPlan | null,
  });
}

function migratingStore(storage: MemoryStore, owner = userOwner('student-a')) {
  return createLearnerStore({ storage, owner, now: clock, legacy: legacyFrom(storage) });
}

/* ------------------------------------------------------------------ */
/* 1. Owners                                                           */
/* ------------------------------------------------------------------ */

test('a record is kept under a key that names its owner', () => {
  assert.equal(learnerRecordKey(userOwner('9f0c')), `${LEARNER_RECORD_KEY}::u:9f0c`);
  assert.equal(learnerRecordKey(anonymousOwner('dev-1')), `${LEARNER_RECORD_KEY}::anon:dev-1`);
  assert.equal(ownerNamespace(userOwner('9f0c')), 'u:9f0c');
});

test('one student on a browser can never read another student through their own store', () => {
  const storage = memoryStore();
  const first = storeFor(storage, userOwner('student-a'));
  const second = storeFor(storage, userOwner('student-b'));

  first.recordLessonStudied({ lessonKey: 'reading-matching-headings', at: '2026-09-01T10:00:00.000Z' });

  assert.equal(first.read().events.length, 1);
  assert.equal(second.read().events.length, 0, "student B's store returned student A's work");

  /* And the two really are separate keys, not one key read twice. */
  const keys = [...storage.data.keys()].filter((key) => key.startsWith(LEARNER_RECORD_KEY));
  assert.deepEqual(keys, [`${LEARNER_RECORD_KEY}::u:student-a`]);
  second.recordLessonStudied({ lessonKey: 'listening-part1', at: '2026-09-01T11:00:00.000Z' });
  assert.deepEqual(
    [...storage.data.keys()].filter((key) => key.startsWith(LEARNER_RECORD_KEY)).sort(),
    [`${LEARNER_RECORD_KEY}::u:student-a`, `${LEARNER_RECORD_KEY}::u:student-b`],
  );
});

test('signing out and switching account never carries a record across', () => {
  const storage = memoryStore();
  const store = createLearnerStore({
    storage,
    owner: userOwner('student-a'),
    now: clock,
    legacy: emptyLegacy,
  });

  store.recordLessonStudied({ lessonKey: 'reading-matching-headings', at: '2026-09-01T10:00:00.000Z' });
  assert.equal(store.read().events.length, 1);

  /* Sign out: the anonymous record on this device is a different record. */
  const signedOut = store.setOwner(null);
  assert.equal(signedOut.events.length, 0, "signing out left the previous student's work on screen");
  assert.equal(store.owner().kind, 'anonymous');

  /* A second student signs in here. */
  const secondStudent = store.setOwner(userOwner('student-b'));
  assert.equal(secondStudent.events.length, 0, "the second student inherited the first one's record");

  /* The first student comes back to their own work. */
  assert.equal(store.setOwner(userOwner('student-a')).events.length, 1);
});

/* ------------------------------------------------------------------ */
/* 2. Recording                                                        */
/* ------------------------------------------------------------------ */

test('recording the same work twice is one row, and the stored event comes back', () => {
  const storage = memoryStore();
  const store = storeFor(storage);

  const first = store.recordLessonStudied({ lessonKey: 'reading-skimming', at: '2026-09-01T10:00:00.000Z' });
  const again = store.recordLessonStudied({ lessonKey: 'reading-skimming', at: '2026-09-01T10:00:00.000Z' });

  assert.ok(first && again);
  assert.equal(first.id, again.id);
  assert.equal(store.read().events.length, 1);
  assert.equal(store.read().evidenceVersion, 1, 'a repeat write moved the evidence version');
  assert.equal(first.outcome.kind, 'studied');
});

test('an idempotency key keeps two attempts in the same millisecond apart', () => {
  const store = storeFor(memoryStore());
  const shared = {
    activityId: 'drill:reading-full-001-p1',
    subskill: 'matching-headings' as const,
    at: '2026-09-01T10:00:00.000Z',
    items: [{ itemId: 'q1', firstAnswer: 'iv', correct: true, assistance: 'none' as const }],
  };
  const one = store.recordSubmission({ ...shared, idempotencyKey: 'a' });
  const two = store.recordSubmission({ ...shared, idempotencyKey: 'b' });
  assert.ok(one && two);
  assert.notEqual(one.id, two.id);
  assert.equal(store.read().events.length, 2);
});

test('the first answer stands, and a second go is recorded as a second go', () => {
  const store = storeFor(memoryStore());

  const first = store.recordLessonCheckAnswer({
    activityId: 'check:practice-reading-matching-headings',
    subskill: 'matching-headings',
    at: '2026-09-01T10:00:00.000Z',
    item: { itemId: 'u0-q0', firstAnswer: 'ii', correct: false, assistance: 'none' },
  });
  const second = store.recordLessonCheckAnswer({
    activityId: 'check:practice-reading-matching-headings',
    subskill: 'matching-headings',
    at: '2026-09-01T10:02:00.000Z',
    item: { itemId: 'u0-q0', firstAnswer: 'iv', correct: true, assistance: 'hint' },
  });

  assert.ok(first && second);
  const record = store.read();
  assert.equal(record.events.length, 2);

  /* The first answer is still the wrong one they actually gave. */
  assert.equal(firstAnswerFor(record.events[0]!, 'u0-q0'), 'ii');
  assert.equal(classifyEvidence(record.events[0]!).use, 'independent');

  /* The corrected one is linked to it and is not independent evidence, on
     three separate grounds: it is a retry, it was hinted, and the item had
     been seen. */
  assert.equal(second.retryOf, first.id);
  assert.equal(classifyEvidence(second).use, 'assisted');
  assert.deepEqual(independentItems(second), []);

  /* Writing that second go again changes nothing, even though this file is
     the one that added the link. */
  const repeat = store.recordLessonCheckAnswer({
    activityId: 'check:practice-reading-matching-headings',
    subskill: 'matching-headings',
    at: '2026-09-01T10:02:00.000Z',
    item: { itemId: 'u0-q0', firstAnswer: 'iv', correct: true, assistance: 'hint' },
  });
  assert.equal(repeat?.id, second.id);
  assert.equal(store.read().events.length, 2);
});

test('a submission carries its items, its source paper and its own breakdown', () => {
  const store = storeFor(memoryStore());
  const event = store.recordSubmission({
    activityId: 'test:reading-full-002',
    paper: 'reading',
    mode: 'assessment',
    at: '2026-09-02T10:00:00.000Z',
    sourceTestId: 'reading-full-002',
    bandEstimate: 6.5,
    secondsUsed: 3600,
    items: [
      { itemId: 'r2-q1', firstAnswer: 'TRUE', correct: true, assistance: 'none', subskill: 'tfng' },
      { itemId: 'r2-q2', firstAnswer: 'FALSE', correct: false, assistance: 'none', subskill: 'tfng' },
      { itemId: 'r2-q3', firstAnswer: 'iii', correct: true, assistance: 'hint', subskill: 'matching-headings' },
    ],
  });

  assert.ok(event);
  assert.equal(event.outcome.kind, 'scored');
  if (event.outcome.kind === 'scored') {
    assert.equal(event.outcome.raw, 2);
    assert.equal(event.outcome.total, 3);
    assert.deepEqual(event.outcome.bySubskill, {
      tfng: { correct: 1, total: 2 },
      'matching-headings': { correct: 1, total: 1 },
    });
  }
  /* The whole attempt is as assisted as its most assisted moment, but the
     two unhinted questions still count. */
  assert.equal(event.assistance, 'hint');
  assert.equal(independentItems(event).length, 2);

  /* Sitting that paper again later is not fresh evidence. */
  assert.ok(store.read().exposure.some((entry) => entry.key === 'paper:reading-full-002'));
});

test('a marked essay keeps its criteria, its task and the fact that a real grader marked it', () => {
  const store = storeFor(memoryStore());
  const essay = store.recordWritingGraded({
    activityId: 'write:task2-technology',
    at: '2026-09-03T10:00:00.000Z',
    promptId: 'task2-technology',
    task: 'task2',
    overallBand: 6.5,
    criteria: { taskResponse: 6, coherenceCohesion: 7, lexicalResource: 6, grammaticalRange: 7 },
    grader: { name: 'gpt-5.6-sol', live: true },
    wordCount: 268,
  });
  assert.ok(essay);
  assert.equal(essay.paper, 'writing');
  assert.deepEqual(essay.taskScope, { kind: 'writing-task', task: 'task2' });
  assert.equal(classifyEvidence(essay).use, 'independent');

  /* A stub grade is kept for the student's history and is never evidence. */
  const stub = store.recordSpeakingGraded({
    activityId: 'speak:hometown',
    at: '2026-09-03T11:00:00.000Z',
    part: 1,
    overallBand: 6,
    criteria: { fluencyCoherence: 6, pronunciation: 6 },
    grader: { name: 'offline stub', live: false },
  });
  assert.ok(stub);
  assert.deepEqual(stub.taskScope, { kind: 'speaking-part', part: 1 });
  assert.equal(classifyEvidence(stub).use, 'excluded');
  assert.equal(classifyEvidence(stub).reason, 'stub-graded');
});

test('a vocabulary pass records the words, and an abandoned attempt is not read as a bad result', () => {
  const store = storeFor(memoryStore());

  const review = store.recordVocabularyReview({
    activityId: 'review:vocabulary:environment',
    at: '2026-09-04T10:00:00.000Z',
    words: [
      { word: 'mitigate', correct: true, direction: 'recall' },
      { word: 'deplete', correct: false, direction: 'recall' },
    ],
  });
  assert.ok(review);
  assert.equal(review.outcome.kind, 'recall');
  if (review.outcome.kind === 'recall') assert.equal(review.outcome.correct, 1);
  assert.equal(classifyEvidence(review).use, 'independent');

  const walkedAway = store.recordUnfinishedAttempt({
    activityId: 'test:reading-full-003',
    paper: 'reading',
    at: '2026-09-04T11:00:00.000Z',
    completion: 'abandoned',
    sourceTestId: 'reading-full-003',
    total: 40,
  });
  assert.ok(walkedAway);
  assert.equal(classifyEvidence(walkedAway).use, 'excluded');
  assert.equal(classifyEvidence(walkedAway).reason, 'abandoned');
  /* They still saw the passage, so a later sitting of it is a repeat. */
  assert.ok(store.read().exposure.some((entry) => entry.key === 'paper:reading-full-003'));
});

test('a refused draft is dropped rather than thrown at the interface', () => {
  const refusals: string[] = [];
  const store = createLearnerStore({
    storage: memoryStore(),
    owner: userOwner('student-a'),
    now: clock,
    legacy: emptyLegacy,
    onRefused: (draft, problem) => refusals.push(`${draft.activityId}: ${problem}`),
  });

  const nothing = store.recordSubmission({
    activityId: 'drill:broken',
    at: 'not a date at all',
    subskill: 'tfng',
    items: [],
  });
  assert.equal(nothing, null);
  assert.equal(store.read().events.length, 0);
  assert.equal(refusals.length, 1);
});

test('islands are told when the record changes', () => {
  const store = storeFor(memoryStore());
  let calls = 0;
  const stop = store.subscribe(() => {
    calls += 1;
  });
  store.recordLessonStudied({ lessonKey: 'reading-skimming', at: '2026-09-01T10:00:00.000Z' });
  assert.equal(calls, 1);
  store.recordLessonStudied({ lessonKey: 'reading-skimming', at: '2026-09-01T10:00:00.000Z' });
  assert.equal(calls, 1, 'a write that changed nothing still told everyone something changed');
  stop();
  store.recordLessonStudied({ lessonKey: 'listening-part1', at: '2026-09-01T12:00:00.000Z' });
  assert.equal(calls, 1, 'unsubscribing did not stop the notifications');
});

/* ------------------------------------------------------------------ */
/* 3. The one-time migration                                           */
/* ------------------------------------------------------------------ */

test('the old stores are carried forward once, and running it again changes nothing', () => {
  const storage = seededWithOldStores();
  const first = migratingStore(storage);
  const migrated = first.read();

  /* Two lessons, one paper, one essay, one ticked exam-readiness extra. */
  assert.equal(migrated.events.length, 5);
  assert.ok(migrated.migration);
  assert.equal(migrated.migration?.migrationVersion, MIGRATION_VERSION);
  assert.equal(migrated.migration?.lessonsMigrated, 2);
  assert.equal(migrated.migration?.testAttemptsMigrated, 1);
  assert.equal(migrated.migration?.writingAttemptsMigrated, 1);
  assert.equal(migrated.migration?.planStepsMigrated, 1);
  assert.ok(migrated.events.every((event) => event.provenance === 'legacy'));
  assert.ok(migrated.events.every((event) => event.items === undefined), 'a migrated row invented item detail');

  /* A second page load reads the stored record and does not migrate again. */
  const second = migratingStore(storage);
  assert.equal(second.read().events.length, 5);

  /* And if the rules change (MIGRATION_VERSION rises), it runs again over
     the same old stores and adds nothing, because every legacy id is
     derived from the row it came from. */
  const key = learnerRecordKey(userOwner('student-a'));
  const stored = JSON.parse(storage.getItem(key)!);
  storage.data.set(key, JSON.stringify({ ...stored, migration: null }));
  const third = migratingStore(storage);
  assert.equal(third.read().events.length, 5);
  assert.ok(third.read().migration);
});

test('the old stores are left exactly as they were', () => {
  const storage = seededWithOldStores();
  const beforeProgress = storage.getItem(PROGRESS_KEY)!;
  const beforePlan = storage.getItem(PLAN_KEY)!;

  const store = migratingStore(storage);
  store.read();
  store.recordLessonStudied({ lessonKey: 'reading-skimming', at: '2026-09-05T10:00:00.000Z' });

  assert.equal(storage.getItem(PROGRESS_KEY), beforeProgress, 'ielts.progress.v1 was rewritten');
  assert.equal(storage.getItem(PLAN_KEY), beforePlan, 'ielts.studyplan.v1 was rewritten');
  assert.ok(!storage.writes.includes(PROGRESS_KEY), 'something tried to write the old progress store');
  assert.ok(!storage.writes.includes(PLAN_KEY), 'something tried to write the old plan store');
});

test('the old stores on a device belong to the record that migrated them', () => {
  const storage = seededWithOldStores();
  const first = migratingStore(storage, userOwner('student-a'));
  assert.equal(first.read().events.length, 5);
  assert.equal(
    JSON.parse(storage.getItem(LEGACY_MIGRATION_OWNER_KEY)!).ownerKey,
    'u:student-a',
  );

  /* A second student signs in on the same browser. The old stores are one
     shared pile with nobody's name on them, so they are NOT read again:
     inheriting them is exactly the leak this layer exists to close. */
  const second = migratingStore(storage, userOwner('student-b'));
  assert.equal(second.read().events.length, 0);
  assert.equal(second.status().legacyHeldByAnotherOwner, true);
  assert.equal(second.status().migrated, false);
});

test('the catalogue can be handed over late, and old completions then file themselves properly', () => {
  /* SYNTHETIC catalogue: only the two fields the migration reads. */
  const catalogue = {
    version: 1,
    indexVersion: 'synthetic',
    catalogueVersion: 'synthetic',
    activities: [
      {
        id: 'lesson:reading-matching-headings',
        kind: 'lesson',
        subskill: 'matching-headings',
        expectedMinutes: 18,
      },
      { id: 'lesson:listening-part1', kind: 'lesson', subskill: 'note-completion', expectedMinutes: 14 },
      { id: 'drill:reading-full-001-p1', kind: 'drill', subskill: 'tfng', expectedMinutes: 20 },
    ],
  } as unknown as Parameters<typeof lessonMapsFrom>[0];

  const maps = lessonMapsFrom(catalogue);
  assert.deepEqual(maps.lessonSubskills, {
    'reading-matching-headings': 'matching-headings',
    'listening-part1': 'note-completion',
  });
  assert.equal(maps.lessonMinutes['reading-matching-headings'], 18);

  const storage = seededWithOldStores();
  const store = createLearnerStore({
    storage,
    owner: userOwner('student-a'),
    now: clock,
    legacy: legacyFrom(storage),
    ...maps,
  });
  const record = store.read();
  assert.equal(record.migration?.lessonsWithoutSubskill, 0, 'a lesson landed under the placeholder heading');
  const lesson = record.events.find((event) => event.activityId === 'lesson:reading-matching-headings');
  assert.equal(lesson?.subskill, 'matching-headings');
  assert.equal(lesson?.outcome.kind, 'studied');
  if (lesson?.outcome.kind === 'studied') assert.equal(lesson.outcome.estimatedMinutes, 18);
});

test('a device with nothing in its old stores is left without a record file', () => {
  const storage = memoryStore();
  const store = migratingStore(storage);
  assert.equal(store.read().events.length, 0);
  assert.deepEqual([...storage.data.keys()].filter((key) => key.startsWith(LEARNER_RECORD_KEY)), []);
  /* The old device-wide keys are NOT claimed by an owner who found nothing
     in them: `ownerKey` is what src/lib/store-owner.ts reads to decide the
     one-time move, and writing it here would take a shared pile away from
     the anonymous owner it belongs to. */
  const stamp = JSON.parse(storage.getItem(LEGACY_MIGRATION_OWNER_KEY) ?? '{}') as { ownerKey?: string };
  assert.equal(stamp.ownerKey, undefined);
  /* The device DOES remember that this owner has read them, empty or not.
     Changed 23 September 2026: without that memory, an owner whose cached
     record is dropped on sign-out migrates the old stores all over again on
     the next sign-in, and by then those stores hold work the recorders have
     already written as its own event, so one lesson becomes two rows. See
     the LegacyDeviceStamp note in src/lib/learning/store.browser.ts. */
  assert.equal(
    (JSON.parse(storage.getItem(LEGACY_MIGRATION_OWNER_KEY)!) as { migrated: Record<string, unknown> }).migrated[
      'u:student-a'
    ] !== undefined,
    true,
  );
});

/* ------------------------------------------------------------------ */
/* 4. Anonymous work, and the one explicit way it reaches an account   */
/* ------------------------------------------------------------------ */

/** Work done signed out on one device, ready for somebody to sign in. */
function deviceWithAnonymousWork(): MemoryStore {
  const storage = memoryStore();
  const anonymous = createLearnerStore({
    storage,
    owner: anonymousOwner('device-1'),
    now: clock,
    legacy: emptyLegacy,
  });
  anonymous.recordLessonStudied({ lessonKey: 'reading-matching-headings', at: '2026-09-01T10:00:00.000Z' });
  anonymous.recordSubmission({
    activityId: 'drill:reading-full-001-p1',
    paper: 'reading',
    at: '2026-09-01T10:30:00.000Z',
    sourceTestId: 'reading-full-001',
    items: [{ itemId: 'r1-q1', firstAnswer: 'iv', correct: true, assistance: 'none', subskill: 'matching-headings' }],
  });
  storage.data.set('ielts.device.v1', 'device-1');
  return storage;
}

test('anonymous work reaches an account only when the student says so, and says what it is first', () => {
  const storage = deviceWithAnonymousWork();
  const account = storeFor(storage, userOwner('student-a'));

  const offer = account.describeAnonymousWork();
  assert.ok(offer, 'the work done signed out was not offered');
  assert.equal(offer.deviceId, 'device-1');
  assert.equal(offer.summary.events, 2);
  assert.equal(offer.summary.lessonsStudied, 1);
  assert.equal(offer.summary.attempts, 1);
  assert.equal(offer.lastAt, '2026-09-01T10:30:00.000Z');

  /* Nothing has moved yet. */
  assert.equal(account.read().events.length, 0);

  const claimed = account.claimAnonymousWork();
  assert.equal(claimed.outcome, 'claimed');
  assert.equal(claimed.newEvents, 2);
  assert.equal(account.read().events.length, 2);
  assert.equal(claimed.claim?.deviceId, 'device-1');

  /* The anonymous copy is gone from the device: leaving it behind is how
     the next student here would end up being offered someone else's work. */
  assert.equal(storage.getItem(learnerRecordKey(anonymousOwner('device-1'))), null);

  /* Claiming again is harmless. */
  const again = account.claimAnonymousWork();
  assert.equal(again.outcome, 'nothing-to-claim');
  assert.equal(account.read().events.length, 2);
});

test('claiming the same work twice adds nothing, because the union is by event id', () => {
  const storage = deviceWithAnonymousWork();
  const held = storage.getItem(learnerRecordKey(anonymousOwner('device-1')))!;
  const account = storeFor(storage, userOwner('student-a'));
  assert.equal(account.claimAnonymousWork().outcome, 'claimed');

  /* Put the very same anonymous record back, as a device that had not
     finished syncing would, and claim it a second time. */
  storage.data.set(learnerRecordKey(anonymousOwner('device-1')), held);
  const second = account.claimAnonymousWork();
  assert.equal(second.outcome, 'claimed');
  assert.equal(second.newEvents, 0);
  assert.equal(account.read().events.length, 2);
});

test('a second student on the same device is never offered the first one"s anonymous work', () => {
  /* After a claim: there is nothing left to offer. */
  const claimedDevice = deviceWithAnonymousWork();
  const first = storeFor(claimedDevice, userOwner('student-a'));
  first.claimAnonymousWork();
  const next = storeFor(claimedDevice, userOwner('student-b'));
  assert.equal(next.describeAnonymousWork(), null);
  assert.equal(next.read().events.length, 0);

  /* After a decline: the work is still on the device, deliberately, because
     the student who did it may come back to it. Nobody else is shown it. */
  const declinedDevice = deviceWithAnonymousWork();
  const decliner = storeFor(declinedDevice, userOwner('student-a'));
  assert.ok(decliner.describeAnonymousWork());
  decliner.declineAnonymousWork();
  assert.equal(decliner.describeAnonymousWork(), null, 'the student was asked again after saying no');

  const stranger = storeFor(declinedDevice, userOwner('student-b'));
  assert.equal(stranger.describeAnonymousWork(), null, "a second student was offered the first one's work");
  assert.equal(stranger.describeAnonymousWork({ includeDeclined: true }), null, 'asking harder showed it anyway');
  assert.equal(stranger.claimAnonymousWork().outcome, 'nothing-to-claim');
  assert.equal(stranger.read().events.length, 0);

  /* The one who said no can still ask for their own earlier work back. */
  assert.ok(decliner.describeAnonymousWork({ includeDeclined: true }));
  assert.equal(decliner.claimAnonymousWork().outcome, 'claimed');
  assert.equal(decliner.read().events.length, 2);
});

test('work done signed out, on a device with an old history, moves as one piece', () => {
  /* The realistic first-login path: someone used this browser without an
     account, so the old ProgressV1 store was carried into the ANONYMOUS
     record. Signing in must not quietly hoover that up, and claiming it
     must bring the migrated history with it. */
  const storage = seededWithOldStores();
  const anonymous = createLearnerStore({
    storage,
    owner: anonymousOwner('device-1'),
    now: clock,
    legacy: legacyFrom(storage),
  });
  assert.equal(anonymous.read().events.length, 5);
  storage.data.set('ielts.device.v1', 'device-1');

  const account = migratingStore(storage, userOwner('student-a'));
  assert.equal(account.read().events.length, 0, 'signing in swallowed the signed-out work with no consent');
  assert.equal(account.status().legacyHeldByAnotherOwner, true);

  const offer = account.describeAnonymousWork();
  assert.equal(offer?.summary.events, 5);
  assert.equal(offer?.summary.hasPlan, true);

  const claimed = account.claimAnonymousWork({ planResolution: 'adopt-device-plan' });
  assert.equal(claimed.outcome, 'claimed');
  assert.equal(claimed.newEvents, 5);
  assert.equal(claimed.claim?.planResolution, 'adopt-device-plan');
  assert.equal(account.read().events.length, 5);
  assert.equal(account.status().migrated, true);
  assert.equal(account.status().legacyHeldByAnotherOwner, false);

  /* The old stores now belong to the account, so a later change to the
     migration rules re-runs for them rather than being refused. */
  assert.equal(JSON.parse(storage.getItem(LEGACY_MIGRATION_OWNER_KEY)!).ownerKey, 'u:student-a');
  /* And they are still exactly where they were. */
  assert.deepEqual(JSON.parse(storage.getItem(PROGRESS_KEY)!), syntheticProgress());
});

test('there is nothing to claim when nobody is signed in', () => {
  const storage = deviceWithAnonymousWork();
  const anonymous = createLearnerStore({
    storage,
    owner: anonymousOwner('device-1'),
    now: clock,
    legacy: emptyLegacy,
  });
  assert.equal(anonymous.describeAnonymousWork(), null);
  assert.equal(anonymous.claimAnonymousWork().outcome, 'not-signed-in');
});

/* ------------------------------------------------------------------ */
/* 5. When the browser will not take it                                */
/* ------------------------------------------------------------------ */

test('a full browser keeps the session going in memory and says plainly that it is not saved', () => {
  const storage = memoryStore();
  const store = storeFor(storage);
  storage.full = true;

  const event = store.recordLessonStudied({ lessonKey: 'reading-skimming', at: '2026-09-01T10:00:00.000Z' });
  assert.ok(event, 'a failed save threw the work away');
  assert.equal(store.read().events.length, 1, 'the work is not readable in this session');

  const status = store.status();
  assert.equal(status.persistence, 'memory-only');
  assert.equal(status.problem, 'quota');
  assert.equal(storage.getItem(learnerRecordKey(userOwner('student-a'))), null);

  /* When there is room again the next write lands, with everything in it. */
  storage.full = false;
  store.recordLessonStudied({ lessonKey: 'listening-part1', at: '2026-09-01T11:00:00.000Z' });
  assert.equal(store.status().persistence, 'saved-locally');
  assert.equal(store.status().problem, undefined);
  assert.equal(JSON.parse(storage.getItem(learnerRecordKey(userOwner('student-a')))!).events.length, 2);
});

test('storage switched off is told apart from storage that is merely full', () => {
  const storage = memoryStore();
  const store = storeFor(storage);
  storage.blocked = true;
  store.recordLessonStudied({ lessonKey: 'reading-skimming', at: '2026-09-01T10:00:00.000Z' });
  assert.equal(store.status().problem, 'blocked');
});

test('the local soft cap folds the oldest events into counts and keeps the exposure log whole', () => {
  const storage = memoryStore();
  const store = createLearnerStore({
    storage,
    owner: userOwner('student-a'),
    now: clock,
    legacy: emptyLegacy,
    softCap: 2,
  });

  for (let i = 1; i <= 4; i += 1) {
    store.recordSubmission({
      activityId: `drill:reading-full-00${i}-p1`,
      paper: 'reading',
      at: `2026-09-0${i}T10:00:00.000Z`,
      sourceTestId: `reading-full-00${i}`,
      items: [{ itemId: `r${i}-q1`, firstAnswer: 'iv', correct: true, assistance: 'none', subskill: 'tfng' }],
    });
  }

  const record = store.read();
  assert.equal(record.events.length, 2, 'the cap did not bite');
  assert.equal(store.status().summarised, 2);
  const folded = (record.summaries ?? []).flatMap((summary) => summary.tallies);
  assert.equal(
    folded.reduce((total, tally) => total + tally.independentOccasions, 0),
    2,
    'the folded counts lost the work they stand for',
  );
  /* No item detail in a summary, which is the point: a tally can say how
     much work was done and can never be mistaken for evidence. */
  assert.ok(folded.every((tally) => tally.independentItems >= 0));
  /* Exposure survives compaction, so already-seen material is still known. */
  assert.equal(record.exposure.filter((entry) => entry.key.startsWith('paper:')).length, 4);
});

/* ------------------------------------------------------------------ */
/* 6. No browser at all                                                */
/* ------------------------------------------------------------------ */

test('importing and reading with no browser is safe', () => {
  /* This whole file has already imported the module under plain Node with
     no DOM, which is the real assertion. The rest is that a store made with
     nowhere to save still works for the session and says so. */
  assert.equal(typeof globalThis.window, 'undefined', 'this test is not proving anything without a DOM-free run');

  const store = storeFor(null);
  assert.deepEqual(store.read().events, []);
  const status = store.status();
  assert.equal(status.persistence, 'memory-only');
  assert.equal(status.problem, 'unavailable');
  assert.equal(status.sync, null, 'the store invented a sync state it cannot observe');

  const event = store.recordLessonStudied({ lessonKey: 'reading-skimming', at: '2026-09-01T10:00:00.000Z' });
  assert.ok(event);
  assert.equal(store.read().events.length, 1);
  assert.equal(store.describeAnonymousWork(), null);
});

test('the sync layer has a field reserved and the store fills in nothing for it', () => {
  const store = storeFor(memoryStore());
  assert.equal(store.status().sync, null);
  store.setSyncStatus({
    state: 'syncing',
    pendingEvents: 3,
    planPending: false,
    pendingGrading: 1,
    lastSyncedAt: null,
  });
  assert.equal(store.status().sync?.state, 'syncing');
  assert.equal(store.status().sync?.pendingEvents, 3);
});

test('a named owner can be forgotten on request, and nobody else is touched', () => {
  const storage = memoryStore();
  const first = storeFor(storage, userOwner('student-a'));
  const second = storeFor(storage, userOwner('student-b'));
  first.recordLessonStudied({ lessonKey: 'reading-skimming', at: '2026-09-01T10:00:00.000Z' });
  second.recordLessonStudied({ lessonKey: 'listening-part1', at: '2026-09-01T11:00:00.000Z' });

  first.forgetOwner(userOwner('student-a'));
  assert.equal(storage.getItem(learnerRecordKey(userOwner('student-a'))), null);
  assert.equal(first.read().events.length, 0);
  assert.equal(second.read().events.length, 1, 'forgetting one student removed another one');
});
