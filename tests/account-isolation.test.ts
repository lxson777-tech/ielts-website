/* Two students, one browser: nobody ever sees or uploads the other's work.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/account-isolation.test.ts
 * The whole suite is `npm test`.
 *
 * WHY THIS FILE EXISTS
 * An independent review on 22 September 2026 signed in as a synthetic student
 * B on a browser that held a synthetic student A's essay and target band, and
 * watched A's essay and A's goal go up to the account under B's id. The
 * helper-level tests of the day all passed: they proved the NEW stores moved
 * owner, and the real defect was in the OLD ones and in the order sign-in did
 * things. So this file deliberately works one level up. It drives the real
 * exported `startSyncForUser` and `stopSync` from src/lib/auth/sync.ts, with
 * the real progress, study-plan, vocabulary and notes stores underneath, and
 * only the network replaced.
 *
 * WHAT IS SIMULATED, AND WHAT IS NOT
 * Simulated: the account. `user_state` is a Map in this process, reached
 * through a stand-in for src/lib/auth/supabase.ts, so no key, no network and
 * no real project is involved. Everything else is the shipping code, including
 * the browser storage layer, which is a Map behind a `window.localStorage`
 * that looks exactly like the real one to every module under test.
 *
 * Every student, essay, note and score below is SYNTHETIC: made up here, for
 * this file, and recognisable as such on sight.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

/* ------------------------------------------------------------------ */
/* A browser, and an account, in about forty lines                     */
/* ------------------------------------------------------------------ */

interface MemoryStorage {
  data: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStorage(): MemoryStorage {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

let storage = memoryStorage();

/* The one global the stores reach for. Defined before anything under test is
   imported, so no module ever sees a half-built browser. */
(globalThis as Record<string, unknown>).window = {
  get localStorage() {
    return storage;
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
};
Object.defineProperty(globalThis, 'localStorage', { get: () => storage, configurable: true });

/** One upload, exactly as it was handed to the account. */
interface Upload {
  user_id: string;
  progress: unknown;
  study_plan: unknown;
  updated_at: string;
}

const account = new Map<string, { progress: unknown; study_plan: unknown }>();
const uploads: Upload[] = [];

/** Set to hold the next pull for one user, so a reply can be made to arrive
    after the student has already changed. */
let heldPull: { userId: string; started: () => void; gate: Promise<void> } | null = null;

const syntheticSupabase = {
  from(table: string) {
    assert.equal(table, 'user_state', 'the old sync asked for a table it does not own');
    return {
      select() {
        return {
          eq(_column: string, userId: string) {
            return {
              async maybeSingle() {
                if (heldPull && heldPull.userId === userId) {
                  const held = heldPull;
                  heldPull = null;
                  held.started();
                  await held.gate;
                }
                const row = account.get(userId);
                return { data: row ? { ...row } : null, error: null };
              },
            };
          },
        };
      },
      async upsert(row: Upload) {
        uploads.push(JSON.parse(JSON.stringify(row)) as Upload);
        account.set(row.user_id, { progress: row.progress, study_plan: row.study_plan });
        return { error: null };
      },
    };
  },
};

(globalThis as Record<string, unknown>).__syntheticSupabase = syntheticSupabase;

/* The account module is the ONLY thing replaced. Everything else in the
   import graph is the real file. */
registerHooks({
  load(url, context, next) {
    if (url.endsWith('/src/lib/auth/supabase.ts')) {
      return {
        format: 'module',
        shortCircuit: true,
        source:
          'export const getSupabase = () => globalThis.__syntheticSupabase;\n' +
          'export const isAuthConfigured = () => true;\n',
      };
    }
    return next(url, context);
  },
});

/* ------------------------------------------------------------------ */
/* The real modules                                                    */
/* ------------------------------------------------------------------ */

const { startSyncForUser, stopSync } = await import('../src/lib/auth/sync.ts');
const progressStore = await import('../src/lib/progress.ts');
const planStore = await import('../src/lib/study-plan.ts');
const vocab = await import('../src/lib/vocab-review.ts');
const notes = await import('../src/lib/notes.ts');
const storeOwner = await import('../src/lib/store-owner.ts');
const learnerStore = await import('../src/lib/learning/store.browser.ts');
const learning = await import('../src/lib/learning/index.ts');
const learningSync = await import('../src/lib/learning/sync.browser.ts');

/* ------------------------------------------------------------------ */
/* SYNTHETIC work, and how to recognise it                             */
/* ------------------------------------------------------------------ */

const A = { id: 'SYNTHETIC-STUDENT-A' } as never;
const B = { id: 'SYNTHETIC-STUDENT-B' } as never;

const A_ESSAY_TEXT = 'SYNTHETIC essay, written by student A, never by anyone else.';
const A_PROMPT = 'SYNTHETIC-prompt-a-task2';
const A_TEST = 'SYNTHETIC-reading-a';
const A_TARGET = '8.5';
const A_NOTE = 'SYNTHETIC note written by student A';
const A_SPEAKING_TOPIC = 'SYNTHETIC topic of student A';

const B_ESSAY_TEXT = 'SYNTHETIC essay, written by student B.';
const B_PROMPT = 'SYNTHETIC-prompt-b-task2';
const B_TARGET = '6.0';

/** Every fingerprint of student A's work, so "this upload carries none of
    A's data" is one assertion rather than a list a future edit can forget to
    extend. */
const A_FINGERPRINTS = [A_ESSAY_TEXT, A_PROMPT, A_TEST, A_NOTE, A_SPEAKING_TOPIC];

function carriesNothingOf(row: Upload, fingerprints: readonly string[]): void {
  const text = JSON.stringify(row);
  for (const mark of fingerprints) {
    assert.ok(!text.includes(mark), `an upload under ${row.user_id} carried "${mark}"`);
  }
}

/** A whole session of synthetic work, through the real stores. */
function doStudentAsWork(): void {
  progressStore.markLessonComplete('reading-matching-headings');
  progressStore.recordTestAttempt(A_TEST, {
    at: '2026-09-20T09:00:00.000Z',
    raw: 31,
    total: 40,
    band: 7,
    bandLabel: '7',
    secondsUsed: 3300,
    kind: 'full',
    skill: 'reading',
  });
  progressStore.recordWritingAttempt(A_PROMPT, {
    at: '2026-09-20T10:00:00.000Z',
    overallBand: 6.5,
    criteria: { taskResponse: 6, coherenceCohesion: 7, lexicalResource: 6, grammaticalRange: 7 },
    wordCount: 268,
    live: true,
    essay: A_ESSAY_TEXT,
    task: 'task2',
    report: {
      criteria: {} as never,
      moments: [],
      strengths: ['SYNTHETIC strength'],
      improvements: ['SYNTHETIC improvement'],
      mechanics: {
        wordCount: 268,
        sentenceCount: 14,
        lexicalDiversity: 0.5,
        linkingDevices: 9,
        underLength: false,
        notes: [],
      },
      grader: { name: 'SYNTHETIC grader', live: false },
    },
  });
  progressStore.recordSpeakingAttempt({
    at: '2026-09-20T11:00:00.000Z',
    mode: 'part2',
    topic: A_SPEAKING_TOPIC,
    overallBand: 6,
    criteria: { fluencyCoherence: 6 },
    live: false,
  });
  planStore.saveStudyPlan({
    targetBand: A_TARGET,
    testDate: '2026-12-01',
    createdAt: '2026-09-20T08:00:00.000Z',
    done: [],
    dailyMinutes: 60,
  });
  vocab.rate(vocab.CARD_SET[0]!.word, 'good');
  notes.setNote('reading-matching-headings', A_NOTE);
  notes.toggleBookmark('lesson', 'reading-matching-headings', {
    title: 'SYNTHETIC saved lesson',
    href: '/lessons/reading-matching-headings',
  });
}

/** Everything the interface would show a student, read back through the real
    readers rather than through storage. */
function whatTheStudentSees() {
  const progress = progressStore.getProgress();
  return {
    lessons: Object.keys(progress.lessons).length,
    testAttempts: progressStore.getAttempts().length,
    essays: progressStore.getWritingAttempts().length,
    speaking: progressStore.getSpeakingAttempts().length,
    targetBand: planStore.loadStudyPlan()?.targetBand ?? null,
    vocabularyLearned: vocab.getVocabSummary().learned,
    notes: notes.listNotes().length,
    savedLessons: notes.listBookmarks().length,
  };
}

/** A clean browser and a clean account. Every module-level store is dropped
    with it, so the next sign-in builds everything from scratch, exactly as a
    fresh machine would. */
function freshDevice(): void {
  stopSync();
  learningSync.resetLearningSyncForTest();
  learning.resetLearningForTest();
  storeOwner.resetStoreOwnerForTest();
  storage = memoryStorage();
  account.clear();
  uploads.length = 0;
  heldPull = null;
}

/** Runs `act`, catching the one timer it schedules instead of letting it
    fire, and hands it back so it can be run deliberately, later, after the
    student has changed. That is the race the guard inside push() exists for:
    stopSync() cancels the timer, and this proves the write would still be
    refused if it somehow ran anyway. */
function catchScheduledPush(act: () => void): () => void {
  const realSetTimeout = globalThis.setTimeout;
  let caught: (() => void) | null = null;
  (globalThis as Record<string, unknown>).setTimeout = ((fn: () => void) => {
    caught = fn;
    return 0;
  }) as unknown as typeof setTimeout;
  try {
    act();
  } finally {
    (globalThis as Record<string, unknown>).setTimeout = realSetTimeout;
  }
  return () => caught?.();
}

/* ------------------------------------------------------------------ */
/* 1. The whole lifecycle: A works, A leaves, B arrives, A comes back  */
/* ------------------------------------------------------------------ */

test('a second student on one browser sees none of the first one, and uploads none of them', async () => {
  freshDevice();

  await startSyncForUser(A);
  doStudentAsWork();
  await startSyncForUser(A); // idempotent: already syncing this student
  /* Student A's own session does upload student A's work, which is the
     point of the feature. */
  const aUploads = uploads.filter((row) => row.user_id === A.id);
  assert.ok(aUploads.length > 0, 'student A signed in and nothing was uploaded for them');
  const aSeen = whatTheStudentSees();
  assert.equal(aSeen.essays, 1);
  assert.equal(aSeen.targetBand, A_TARGET);

  stopSync();
  const uploadsBeforeB = uploads.length;

  /* Student B has never used this site. Their account row does not exist. */
  await startSyncForUser(B);

  const bSeen = whatTheStudentSees();
  assert.deepEqual(
    bSeen,
    {
      lessons: 0,
      testAttempts: 0,
      essays: 0,
      speaking: 0,
      targetBand: null,
      vocabularyLearned: 0,
      notes: 0,
      savedLessons: 0,
    },
    "student B was shown student A's history",
  );

  progressStore.recordWritingAttempt(B_PROMPT, {
    at: '2026-09-21T10:00:00.000Z',
    overallBand: 5.5,
    criteria: { taskResponse: 5 },
    wordCount: 210,
    live: false,
    essay: B_ESSAY_TEXT,
    task: 'task2',
  });
  planStore.saveStudyPlan({
    targetBand: B_TARGET,
    testDate: '2027-02-01',
    createdAt: '2026-09-21T09:00:00.000Z',
    done: [],
  });
  /* Force the debounced push rather than waiting for it. */
  await startSyncForUser(B);
  stopSync();
  await startSyncForUser(B);

  const duringB = uploads.slice(uploadsBeforeB);
  assert.ok(duringB.length > 0, 'student B signed in and nothing was uploaded for them');
  for (const row of duringB) {
    assert.equal(row.user_id, B.id, "an upload during student B's session went to another account");
    carriesNothingOf(row, A_FINGERPRINTS);
  }
  /* And what DID go up for B is B's own. */
  const lastB = duringB[duringB.length - 1]!;
  assert.ok(JSON.stringify(lastB).includes(B_ESSAY_TEXT), "student B's own essay was not uploaded");
  assert.equal((lastB.study_plan as { targetBand: string }).targetBand, B_TARGET);

  /* Student A comes back to the same browser and finds everything. */
  stopSync();
  await startSyncForUser(A);
  const aAgain = whatTheStudentSees();
  assert.deepEqual(aAgain, { ...aSeen }, 'student A lost work while student B used this browser');
  assert.equal(
    progressStore.getWritingAttempts(A_PROMPT)[0]?.attempt.essay,
    A_ESSAY_TEXT,
    "student A's essay text did not survive",
  );
  assert.ok(
    progressStore.getWritingAttempts(A_PROMPT)[0]?.attempt.report,
    "student A's marked report did not survive",
  );
  assert.equal(notes.getNote('reading-matching-headings'), A_NOTE);
});

/* ------------------------------------------------------------------ */
/* 2. Replies that arrive too late                                     */
/* ------------------------------------------------------------------ */

test('a pull that comes back after the student changed is not applied', async () => {
  freshDevice();

  /* Student A's account already holds an essay, so there is something real
     for a late reply to carry. */
  account.set(A.id, {
    progress: {
      version: 1,
      lessons: {},
      tests: {},
      writing: {
        [A_PROMPT]: [
          {
            at: '2026-09-20T10:00:00.000Z',
            overallBand: 6.5,
            criteria: {},
            wordCount: 268,
            live: true,
            essay: A_ESSAY_TEXT,
          },
        ],
      },
      speaking: [],
    },
    study_plan: { targetBand: A_TARGET, testDate: '', createdAt: '2026-09-20T08:00:00.000Z', done: [] },
  });

  let started!: () => void;
  const startedPull = new Promise<void>((resolve) => {
    started = resolve;
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  heldPull = { userId: A.id, started, gate };

  const signingIn = startSyncForUser(A);
  await startedPull;
  /* The student gives up and signs out while the account is still
     answering. */
  stopSync();
  release();
  await signingIn;

  assert.equal(uploads.length, 0, 'a sign-in that was abandoned still uploaded something');
  const seen = whatTheStudentSees();
  assert.equal(seen.essays, 0, "the late reply wrote student A's essay into the signed-out device");
  assert.equal(seen.targetBand, null, "the late reply wrote student A's goal into the signed-out device");
  assert.equal(storeOwner.currentOwner().kind, 'anonymous', 'sign-out left a signed-in owner behind');

  /* And it is genuinely still in the account, waiting for A to come back. */
  await startSyncForUser(A);
  assert.equal(progressStore.getWritingAttempts(A_PROMPT)[0]?.attempt.essay, A_ESSAY_TEXT);
});

test('a push still waiting at sign-out never goes out under the next student', async () => {
  freshDevice();

  await startSyncForUser(A);
  doStudentAsWork();
  const uploadsBefore = uploads.length;

  /* One more local edit, whose debounced push is caught rather than fired. */
  const firePendingPush = catchScheduledPush(() => {
    progressStore.markLessonComplete('listening-part1');
  });

  stopSync();
  await startSyncForUser(B);
  const uploadsAfterBArrived = uploads.length;

  /* Now let the push that was scheduled for student A run. */
  firePendingPush();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(
    uploads.length,
    uploadsAfterBArrived,
    "a push scheduled for student A was sent after student B signed in",
  );
  for (const row of uploads.slice(uploadsBefore)) {
    carriesNothingOf(row, A_FINGERPRINTS);
  }
});

/* ------------------------------------------------------------------ */
/* 3. Work done signed out: offered, never taken                       */
/* ------------------------------------------------------------------ */

/** The realistic case the review found: a browser used before this build, so
    the four older stores are full and there is no learner record at all. */
function deviceUsedSignedOut(): void {
  freshDevice();
  doStudentAsWork();
}

test('work done signed out is described in plain counts and never taken without being asked', async () => {
  deviceUsedSignedOut();

  await startSyncForUser(A);

  /* Signing in does NOT hoover it up. */
  assert.deepEqual(
    whatTheStudentSees(),
    {
      lessons: 0,
      testAttempts: 0,
      essays: 0,
      speaking: 0,
      targetBand: null,
      vocabularyLearned: 0,
      notes: 0,
      savedLessons: 0,
    },
    'signing in swallowed the signed-out work with no consent',
  );
  for (const row of uploads) carriesNothingOf(row, A_FINGERPRINTS);

  const offer = learnerStore.describeAnonymousWork();
  assert.ok(offer, 'the work done signed out was not offered at all');
  const counts = offer.summary.legacy;
  assert.ok(counts, 'the offer said nothing about the older stores');
  assert.equal(counts.testAttempts, 1);
  assert.equal(counts.essays, 1);
  assert.equal(counts.savedReports, 1);
  assert.equal(counts.speakingResults, 1);
  assert.equal(counts.hasPlan, true);
  assert.equal(counts.vocabularyWords, 1);
  assert.equal(counts.savedLessons, 1);
  assert.equal(counts.notes, 1);
});

test('claiming work done signed out brings all of it, once, and then there is nothing left to offer', async () => {
  deviceUsedSignedOut();
  await startSyncForUser(A);

  let claimed!: ReturnType<typeof learnerStore.claimAnonymousWork>;
  /* The claim schedules the ordinary debounced push, the same one any edit
     schedules, rather than leaving the claimed work sitting on the device
     until the student's next change. Caught here so the test does not have
     to wait a second and a half for it. */
  const firePush = catchScheduledPush(() => {
    claimed = learnerStore.claimAnonymousWork();
  });
  assert.equal(claimed.outcome, 'claimed');

  const seen = whatTheStudentSees();
  assert.equal(seen.essays, 1, 'the claimed essay did not arrive');
  assert.equal(seen.testAttempts, 1);
  assert.equal(seen.speaking, 1);
  assert.equal(seen.targetBand, A_TARGET);
  assert.equal(seen.vocabularyLearned, 1);
  assert.equal(seen.notes, 1);
  assert.equal(seen.savedLessons, 1);
  assert.equal(progressStore.getWritingAttempts(A_PROMPT)[0]?.attempt.essay, A_ESSAY_TEXT);

  /* Claiming twice adds nothing and loses nothing. */
  learnerStore.claimAnonymousWork();
  assert.deepEqual(whatTheStudentSees(), seen, 'claiming a second time changed what the student has');
  assert.equal(learnerStore.describeAnonymousWork(), null, 'the same work was offered again after being claimed');

  /* Only now does it reach the account, and under the right id, without the
     student having to do anything else first. */
  firePush();
  await Promise.resolve();
  await Promise.resolve();
  const mine = uploads.filter((row) => row.user_id === A.id);
  assert.ok(mine.length > 0, 'nothing was uploaded for the student who claimed the work');
  assert.ok(
    JSON.stringify(mine[mine.length - 1]).includes(A_ESSAY_TEXT),
    'the claimed essay never reached the account',
  );
  for (const row of uploads) {
    assert.equal(row.user_id, A.id, 'the claimed work was uploaded under another account');
  }

  /* And a different student on this browser is offered nothing. */
  stopSync();
  await startSyncForUser(B);
  assert.equal(learnerStore.describeAnonymousWork(), null, "student B was offered student A's claimed work");
  assert.equal(whatTheStudentSees().essays, 0);
});

test('declining leaves the work exactly where it is, and it is never uploaded', async () => {
  deviceUsedSignedOut();
  await startSyncForUser(A);

  learnerStore.declineAnonymousWork();
  assert.equal(learnerStore.describeAnonymousWork(), null, 'the student was asked again after saying no');
  assert.equal(whatTheStudentSees().essays, 0, 'declining still moved the work into the account');

  stopSync();
  await startSyncForUser(A);
  for (const row of uploads) carriesNothingOf(row, A_FINGERPRINTS);

  /* Signed out again, the work is right where it was left. */
  stopSync();
  const backOnTheDevice = whatTheStudentSees();
  assert.equal(backOnTheDevice.essays, 1, 'declining lost the work it was supposed to leave alone');
  assert.equal(backOnTheDevice.targetBand, A_TARGET);
  assert.equal(backOnTheDevice.notes, 1);

  /* Nobody else is shown it either. */
  await startSyncForUser(B);
  assert.equal(learnerStore.describeAnonymousWork(), null, "student B was offered work student A declined");
});

/* ------------------------------------------------------------------ */
/* 4. The old device-wide keys                                         */
/* ------------------------------------------------------------------ */

test('the old device-wide keys move to the owner the device says they belong to, and to nobody else', async () => {
  freshDevice();

  /* A browser left by the version before this build: one shared pile, with
     the learner record's stamp saying student A claimed it. */
  storage.data.set('ielts.device.v1', 'SYNTHETIC-device');
  storage.data.set(
    'ielts.progress.v1',
    JSON.stringify({
      version: 1,
      lessons: {},
      tests: {},
      writing: {
        [A_PROMPT]: [
          { at: '2026-09-19T10:00:00.000Z', overallBand: 7, criteria: {}, wordCount: 300, live: true, essay: A_ESSAY_TEXT },
        ],
      },
      speaking: [],
    }),
  );
  storage.data.set(
    'ielts.studyplan.v1',
    JSON.stringify({ targetBand: A_TARGET, testDate: '', createdAt: '2026-09-19T09:00:00.000Z', done: [] }),
  );
  storage.data.set(
    'ielts.learning.legacy.v1',
    JSON.stringify({ version: 1, ownerKey: `u:${A.id}`, at: '2026-09-19T10:00:00.000Z' }),
  );

  /* Student B signs in first. The stamp is not theirs, so they get nothing,
     and nothing of it goes up under their id. */
  await startSyncForUser(B);
  assert.equal(whatTheStudentSees().essays, 0, "student B inherited the old device-wide store");
  for (const row of uploads) carriesNothingOf(row, A_FINGERPRINTS);
  /* It is not offered to them as anonymous work either: it is not anonymous,
     it is student A's. */
  assert.equal(learnerStore.describeAnonymousWork(), null);

  /* Student A signs in and finds it. */
  stopSync();
  await startSyncForUser(A);
  assert.equal(progressStore.getWritingAttempts(A_PROMPT)[0]?.attempt.essay, A_ESSAY_TEXT);
  assert.equal(planStore.loadStudyPlan()?.targetBand, A_TARGET);

  /* The move happened ONCE, into a key that names student A, and the
     original was not touched. */
  assert.ok(
    storage.data.get('ielts.progress.v1')!.includes(A_ESSAY_TEXT),
    'the old device-wide store was emptied',
  );
  assert.ok(
    storage.data.get(`ielts.progress.v1::u:${A.id}`)!.includes(A_ESSAY_TEXT),
    "the old store was not moved into student A's own key",
  );
  /* Student B has a key of their own (sign-in wrote their empty, reconciled
     state into it), and it holds nothing of student A's. */
  assert.ok(
    !(storage.data.get(`ielts.progress.v1::u:${B.id}`) ?? '').includes(A_ESSAY_TEXT),
    "the old store reached student B's own key",
  );

  /* And a later change of student A's own copy does not reach back into the
     shared pile, nor does the shared pile come back over it. */
  const before = storage.data.get('ielts.progress.v1')!;
  progressStore.markLessonComplete('listening-part1');
  assert.equal(storage.data.get('ielts.progress.v1'), before, 'the old device-wide store was rewritten');
});

test('nothing in a sign-in, a sign-out or an account switch deletes a student"s stored work', async () => {
  freshDevice();

  await startSyncForUser(A);
  doStudentAsWork();
  const aKey = `ielts.progress.v1::u:${A.id}`;
  const aProgress = storage.data.get(aKey);
  assert.ok(aProgress, "student A's progress was not saved under their own key");

  stopSync();
  await startSyncForUser(B);
  progressStore.recordWritingAttempt(B_PROMPT, {
    at: '2026-09-21T10:00:00.000Z',
    overallBand: 5.5,
    criteria: {},
    wordCount: 210,
    live: false,
    essay: B_ESSAY_TEXT,
  });
  stopSync();

  assert.equal(storage.data.get(aKey), aProgress, "student A's work was changed while student B used the browser");
  assert.ok(storage.data.get(`ielts.progress.v1::u:${B.id}`), "student B's own work was not saved");
  assert.ok(storage.data.get(`ielts.studyplan.v1::u:${A.id}`), "student A's plan was deleted");
  assert.ok(storage.data.get(`ielts.notes.v1::u:${A.id}`), "student A's saved lessons and notes were deleted");
  assert.ok(storage.data.get(`ielts.vocab.v1::u:${A.id}`), "student A's vocabulary state was deleted");
});
