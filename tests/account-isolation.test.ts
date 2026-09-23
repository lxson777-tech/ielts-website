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
  /** A real browser store can be walked, and since 23 September 2026 one
      thing walks it: src/lib/store-owner.ts looks for the account session
      this browser is holding, so that a page with no account component on it
      still knows whose work it is (finding 3). These two members are what
      make this memory look like the real thing to that code. */
  length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStorage(): MemoryStorage {
  const data = new Map<string, string>();
  return {
    data,
    get length() {
      return data.size;
    },
    key: (index) => [...data.keys()][index] ?? null,
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

/** The access token the stand-in handed back for whoever is signed in, or
    null when nobody is. Only section 5 sets it: everything above runs with
    the learning tables unreachable, exactly as it did before. */
let standInToken: string | null = null;

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
  /* The learning layer's transport reads a fresh token on every request, the
     same way the browser does. Null means nobody is signed in and the
     transport simply stops, which is what every test above relies on. */
  auth: {
    async getSession() {
      return { data: { session: standInToken ? { access_token: standInToken } : null } };
    },
    /* The app-wide lifecycle (src/lib/auth/lifecycle.ts) subscribes the same
       way the real islands do. The stand-in has no events of its own, so
       this is a subscription that never fires: what the lifecycle gets is
       the one immediate answer from getSession() above. */
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
  },
};

(globalThis as Record<string, unknown>).__syntheticSupabase = syntheticSupabase;

/* This application's own account project, as the build would name it. Since
   the second Codex inspection (R2-04) src/lib/store-owner.ts reads ONLY the
   session stored under this project's key, `sb-<project ref>-auth-token`, and
   treats a browser as signed out when accounts are not configured here at
   all. The address is SYNTHETIC and reaches nothing; its first label,
   `synthetic-local`, is what makes the key `sb-synthetic-local-auth-token`.
   A test switches accounts off by setting both of these to undefined/false. */
const THIS_PROJECT_ENV = {
  PUBLIC_SUPABASE_URL: 'https://synthetic-local.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'SYNTHETIC-anon-key',
};
(globalThis as Record<string, unknown>).__syntheticAuthEnv = THIS_PROJECT_ENV;
(globalThis as Record<string, unknown>).__syntheticAuthConfigured = true;

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
          'export const isAuthConfigured = () => globalThis.__syntheticAuthConfigured !== false;\n',
      };
    }
    const loaded = next(url, context);
    /* src/lib/auth/sync.ts decides whether the learning tables are reachable
       by reading `import.meta.env`, which Astro fills in at build time and
       which node leaves undefined. One line in front of the real file gives
       it a property that answers from `globalThis`, so a test can switch the
       learning tables on for one journey and leave every other test in this
       file reading no environment at all, exactly as before. The file itself
       is the shipping one: it still builds its own transport, with its own
       token refresh, and nothing about sign-in is stubbed. */
    /* src/lib/store-owner.ts reads the same two public settings to know
       which stored session is this application's own. Same one-line front,
       answering from a separate global so the learning tables above stay
       exactly as off as they were. */
    if (url.endsWith('/src/lib/store-owner.ts')) {
      const source =
        typeof loaded.source === 'string'
          ? loaded.source
          : Buffer.from(loaded.source as ArrayBuffer).toString('utf8');
      return {
        ...loaded,
        source:
          'Object.defineProperty(import.meta, "env", { get: () => globalThis.__syntheticAuthEnv });\n' + source,
      };
    }
    if (url.endsWith('/src/lib/auth/sync.ts')) {
      const source =
        typeof loaded.source === 'string'
          ? loaded.source
          : Buffer.from(loaded.source as ArrayBuffer).toString('utf8');
      return {
        ...loaded,
        source:
          'Object.defineProperty(import.meta, "env", { get: () => globalThis.__syntheticEnv });\n' + source,
      };
    }
    return loaded;
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
const lifecycle = await import('../src/lib/auth/lifecycle.ts');
const testSession = await import('../src/lib/test-session.ts');
const mockStore = await import('../src/lib/tests/mock.ts');

/* ------------------------------------------------------------------ */
/* The free local stand-in, in this process, on a port the OS picks    */
/* ------------------------------------------------------------------ */

/* Section 5 needs an account that really stores the learner record, because
   the defect it guards against only shows up when a student's cached record
   is removed on sign-out and rebuilt from the account on the next sign-in.
   tools/mr-ez-dev-server.mjs is that account: in memory, on this machine,
   reached over real HTTP by the real transport. It is NOT a Supabase
   project, and nothing here is evidence about one. */
process.env.MR_EZ_DEV_PORT = '0';
const dev = await import('../tools/mr-ez-dev-server.mjs');
if (!dev.server.listening) {
  await new Promise<void>((resolve, reject) => {
    dev.server.once('listening', () => resolve());
    dev.server.once('error', reject);
  });
}
const devAddress = dev.server.address();
if (devAddress === null || typeof devAddress === 'string') {
  throw new Error('the local stand-in did not report a bound port');
}
const standIn = `http://127.0.0.1:${devAddress.port}`;
const STAND_IN_KEY = 'local-anon-key';

test.after(() => {
  dev.server.close();
});

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
  lifecycle.resetAccountLifecycleForTest();
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
/* 3b. An unfinished test and a paused mock exam: one yes moves them    */
/* ------------------------------------------------------------------ */

/* Both carry their owner inside the stored value, so the claim re-stamps
   them for the account (src/lib/store-owner.ts, OWNER_STAMPED_STORE_KEYS).
   Driven here through the real offer, claim and decline, with the real
   sign-in and sign-out underneath. */

/** The drill left part way through while signed out, and its answer. */
const DEVICE_DRILL = { id: 'reading-full-006-drill-p2', durationMinutes: 20 } as unknown as Parameters<
  typeof testSession.startSession
>[0];
const DEVICE_ANSWERS = { q14: 'SYNTHETIC answer given while signed out' };

/* Written down the one way a sitting may begin (beginActiveMock): since the
   fourth Codex round (R2C-02) an ordinary save only updates the sitting
   already stored and never creates one. */
type PausedMock = Parameters<typeof mockStore.beginActiveMock>[0];

/** A SYNTHETIC mock day for `owner`, paused on the beat before Reading with
    Listening done. */
function pausedMockFor(owner: string, overrides: Partial<PausedMock> = {}): PausedMock {
  return {
    version: 1,
    owner,
    sittingId: 'SYNTHETIC-paused-sitting',
    mockId: 'mock-2026-09-23-1',
    startedAt: '2026-09-23T09:00:00.000Z',
    stage: 'transition-reading',
    listeningTestId: 'listening-full-001',
    readingTestId: 'reading-full-001',
    task1PromptId: 'SYNTHETIC-task1',
    task2PromptId: 'SYNTHETIC-task2',
    listening: { raw: 31, total: 40, band: 7, bandLabel: '7', secondsUsed: 1_800 },
    reading: null,
    essay1: '',
    essay2: '',
    writingEndsAt: null,
    speakingBand: null,
    speakingCriteria: null,
    speakingSkipped: false,
    savedAt: 0,
    ...overrides,
  };
}

/** Signed out on this device: an unfinished drill and a paused mock day.
    Returns the device owner and the two stored values as it holds them. */
function leaveUnfinishedWorkSignedOut(): { anon: string; sitting: string; paused: string } {
  assert.equal(storeOwner.currentOwner().kind, 'anonymous');
  const anon = storeOwner.ownerNamespace(storeOwner.currentOwner());
  testSession.startSession(DEVICE_DRILL);
  assert.equal(testSession.saveAnswers(DEVICE_ANSWERS, anon), true);
  assert.equal(mockStore.beginActiveMock(pausedMockFor(anon)), true);
  return {
    anon,
    sitting: storage.data.get(`${testSession.TEST_SESSION_KEY}::${anon}`)!,
    paused: storage.data.get(`${mockStore.ACTIVE_MOCK_KEY}::${anon}`)!,
  };
}

test('an unfinished test and a paused mock exam are offered, and one yes makes them resumable in the account', async () => {
  freshDevice();
  const device = leaveUnfinishedWorkSignedOut();
  await startSyncForUser(A);

  /* Signing in does NOT take them. */
  assert.equal(testSession.activeSession(), null, 'signing in took the unfinished test with no consent');
  assert.equal(mockStore.loadActiveMock(), null, 'signing in took the paused mock with no consent');

  /* They are the only thing on the device, and they are still offered, in
     plain words the screen can say. */
  const offer = learnerStore.describeAnonymousWork();
  assert.ok(offer, 'an unfinished test and a paused mock were not offered at all');
  assert.equal(offer.summary.legacy?.unfinishedTest, true);
  assert.equal(offer.summary.legacy?.pausedMock, true);

  let claimed!: ReturnType<typeof learnerStore.claimAnonymousWork>;
  catchScheduledPush(() => {
    claimed = learnerStore.claimAnonymousWork();
  });
  assert.equal(claimed.outcome, 'claimed');

  /* A's own player and mock screen accept them. */
  const mine = `u:${A.id}`;
  const resumed = testSession.loadSession(DEVICE_DRILL.id);
  assert.equal(resumed?.owner, mine, 'the claimed sitting still names the device, so the player refuses it');
  assert.deepEqual(resumed?.answers, DEVICE_ANSWERS);
  assert.equal(resumed?.endsAt, JSON.parse(device.sitting).endsAt, 'the claim moved the deadline');
  const paused = mockStore.loadActiveMock();
  assert.equal(paused?.owner, mine, 'the claimed mock still names the device, so the mock screen refuses it');
  assert.equal(paused?.stage, 'transition-reading');
  assert.equal(paused?.listening?.band, 7);

  /* Claiming twice is harmless, and nothing is offered again. */
  const sittingAfter = storage.data.get(`${testSession.TEST_SESSION_KEY}::${mine}`);
  const pausedAfter = storage.data.get(`${mockStore.ACTIVE_MOCK_KEY}::${mine}`);
  catchScheduledPush(() => {
    learnerStore.claimAnonymousWork();
  });
  assert.equal(storage.data.get(`${testSession.TEST_SESSION_KEY}::${mine}`), sittingAfter);
  assert.equal(storage.data.get(`${mockStore.ACTIVE_MOCK_KEY}::${mine}`), pausedAfter);
  assert.equal(learnerStore.describeAnonymousWork(), null, 'the same sitting was offered again after being claimed');

  /* Student B is offered nothing and receives nothing. */
  stopSync();
  await startSyncForUser(B);
  assert.equal(learnerStore.describeAnonymousWork(), null, "student B was offered student A's claimed sitting");
  assert.equal(testSession.activeSession(), null, "student B received student A's claimed sitting");
  assert.equal(mockStore.loadActiveMock(), null, "student B received student A's claimed mock");

  /* Signed out, the device no longer holds them: they moved, they were not
     copied. */
  stopSync();
  assert.equal(testSession.activeSession(), null);
  assert.equal(mockStore.loadActiveMock(), null);

  /* Student A comes back and finds both. */
  await startSyncForUser(A);
  assert.deepEqual(testSession.loadSession(DEVICE_DRILL.id)?.answers, DEVICE_ANSWERS);
  assert.equal(mockStore.loadActiveMock()?.owner, mine);
});

test('declining leaves the unfinished test and the paused mock exactly where they were', async () => {
  freshDevice();
  const device = leaveUnfinishedWorkSignedOut();
  await startSyncForUser(A);

  learnerStore.declineAnonymousWork();
  assert.equal(learnerStore.describeAnonymousWork(), null, 'the student was asked again after saying no');
  assert.equal(testSession.activeSession(), null, 'declining still moved the unfinished test into the account');
  assert.equal(mockStore.loadActiveMock(), null, 'declining still moved the paused mock into the account');
  assert.equal(storage.data.has(`${testSession.TEST_SESSION_KEY}::u:${A.id}`), false);
  assert.equal(storage.data.has(`${mockStore.ACTIVE_MOCK_KEY}::u:${A.id}`), false);
  assert.equal(storage.data.get(`${testSession.TEST_SESSION_KEY}::${device.anon}`), device.sitting);
  assert.equal(storage.data.get(`${mockStore.ACTIVE_MOCK_KEY}::${device.anon}`), device.paused);

  /* Signed out, the device's own student picks both up again. */
  stopSync();
  assert.deepEqual(testSession.loadSession(DEVICE_DRILL.id)?.answers, DEVICE_ANSWERS);
  assert.equal(mockStore.loadActiveMock()?.owner, device.anon);

  /* Nobody else is shown them. */
  await startSyncForUser(B);
  assert.equal(learnerStore.describeAnonymousWork(), null, 'student B was offered a sitting student A declined');
  assert.equal(testSession.activeSession(), null);
  assert.equal(mockStore.loadActiveMock(), null);
});

test("the account's own unfinished test and paused mock win: the device's are not offered and stay on the device", async () => {
  freshDevice();
  doStudentAsWork();
  const device = leaveUnfinishedWorkSignedOut();
  await startSyncForUser(A);

  /* A starts a sitting and a mock day of their own after signing in. */
  const mine = `u:${A.id}`;
  testSession.startSession({ id: 'reading-full-007-drill-p1', durationMinutes: 20 } as unknown as typeof DEVICE_DRILL);
  assert.equal(testSession.saveAnswers({ q1: 'SYNTHETIC answer by A after signing in' }, mine), true);
  assert.equal(mockStore.beginActiveMock(pausedMockFor(mine, { stage: 'writing', essay1: 'SYNTHETIC draft by A' })), true);
  const aSitting = storage.data.get(`${testSession.TEST_SESSION_KEY}::${mine}`);
  const aPaused = storage.data.get(`${mockStore.ACTIVE_MOCK_KEY}::${mine}`);

  /* The rest of the device's work is still offered; these two are not,
     because saying yes would not bring them. */
  const offer = learnerStore.describeAnonymousWork();
  assert.ok(offer, "the rest of the device's work was not offered");
  assert.equal(offer.summary.legacy?.unfinishedTest, false);
  assert.equal(offer.summary.legacy?.pausedMock, false);

  catchScheduledPush(() => {
    learnerStore.claimAnonymousWork();
  });
  assert.equal(storage.data.get(`${testSession.TEST_SESSION_KEY}::${mine}`), aSitting, "A's own sitting was overwritten");
  assert.equal(storage.data.get(`${mockStore.ACTIVE_MOCK_KEY}::${mine}`), aPaused, "A's own paused mock was overwritten");
  assert.equal(testSession.activeSession()?.testId, 'reading-full-007-drill-p1');
  assert.equal(mockStore.loadActiveMock()?.essay1, 'SYNTHETIC draft by A');
  /* The rest of the claim still happened. */
  assert.equal(whatTheStudentSees().essays, 1);

  /* The device's two are exactly where they were. */
  assert.equal(storage.data.get(`${testSession.TEST_SESSION_KEY}::${device.anon}`), device.sitting);
  assert.equal(storage.data.get(`${mockStore.ACTIVE_MOCK_KEY}::${device.anon}`), device.paused);
  stopSync();
  assert.deepEqual(testSession.loadSession(DEVICE_DRILL.id)?.answers, DEVICE_ANSWERS);
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

/* ------------------------------------------------------------------ */
/* 5. Signed out, claimed, worked, left, came back                     */
/* ------------------------------------------------------------------ */

/* THE JOURNEY A BROWSER RUN FOUND A DUPLICATE IN (22 September 2026)
 *
 * A student works signed out, signs in, accepts "Add to my account", does
 * more work, signs out and signs in again, and their record comes back with
 * one MORE event than it had: the lesson they marked while signed in is in
 * there twice, once as the click that was recorded and once as a `legacy:`
 * row minted by a second run of the one-time migration of the old stores.
 *
 * Everything below is the shipping path: the real sign-in, the real claim,
 * the real stores, the real migration, the real sync. Only the account is a
 * stand-in, and every student, lesson and answer is SYNTHETIC. */

interface StandInSession {
  token: string;
  userId: string;
}

let journeyEmails = 0;

async function signUpOnStandIn(label: string): Promise<StandInSession> {
  journeyEmails += 1;
  const response = await fetch(`${standIn}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `${label}-${journeyEmails}@example.test`,
      password: 'synthetic-test-password-1',
    }),
  });
  assert.equal(response.status, 200, `the stand-in refused to open an account for ${label}`);
  const body = (await response.json()) as { access_token: string; user: { id: string } };
  return { token: body.access_token, userId: body.user.id };
}

/** Switch the learning tables on, hand the transport this student's token,
    and then sign in through the ordinary exported sign-in. */
async function signInWithAnAccount(session: StandInSession): Promise<void> {
  standInToken = session.token;
  (globalThis as Record<string, unknown>).__syntheticEnv = {
    PUBLIC_SUPABASE_URL: standIn,
    PUBLIC_SUPABASE_ANON_KEY: STAND_IN_KEY,
  };
  await startSyncForUser({ id: session.userId } as never);
}

/** Send what is waiting, then sign out the ordinary way. The flush is what a
    real session gets from its debounce; without it the queue would still be
    full and sign-out would keep the cached record on the device, which is
    not the case this journey is about. */
async function signOutWithAnAccount(): Promise<void> {
  await learningSync.activeLearningSync()?.flush();
  stopSync();
  await new Promise((resolve) => setImmediate(resolve));
  standInToken = null;
}

const JOURNEY_LESSON_SIGNED_OUT = 'reading-matching-headings';
const JOURNEY_LESSON_SIGNED_IN = 'reading-tfng';
const JOURNEY_DRILL = 'SYNTHETIC-reading-drill-journey';

/** A completion click, in the order src/layouts/LessonLayout.astro does it:
    the tick and the old history first, the learner record second. */
function markLessonTheWayTheSiteDoes(slug: string): void {
  progressStore.markLessonComplete(slug);
  learnerStore.recordLessonStudied({ lessonKey: slug });
}

/** A short SYNTHETIC drill, sat the way TestPlayer records one: the attempt
    into the old store, the answers into the learner record. */
function sitTheDrillTheWayTheSiteDoes(): void {
  const at = new Date().toISOString();
  progressStore.recordTestAttempt(JOURNEY_DRILL, {
    at,
    raw: 1,
    total: 3,
    band: 0,
    bandLabel: 'below 2.5',
    secondsUsed: 90,
    kind: 'drill',
    skill: 'reading',
  });
  learnerStore.recordSubmission({
    activityId: `drill:${JOURNEY_DRILL}`,
    contentVersion: 1,
    at,
    paper: 'reading',
    mode: 'practice',
    sourceTestId: JOURNEY_DRILL,
    items: [
      {
        itemId: `${JOURNEY_DRILL}:q1`,
        firstAnswer: 'SYNTHETIC-answer-1',
        correct: true,
        assistance: 'none',
        subskill: 'sentence-completion',
      },
      {
        itemId: `${JOURNEY_DRILL}:q2`,
        firstAnswer: 'SYNTHETIC-answer-2',
        correct: false,
        assistance: 'none',
        subskill: 'sentence-completion',
      },
      {
        itemId: `${JOURNEY_DRILL}:q3`,
        firstAnswer: '',
        correct: false,
        assistance: 'none',
        subskill: 'sentence-completion',
      },
    ],
  });
}

/** Every event id in the record on this device, in one stable order. */
function eventIdsOnThisDevice(): string[] {
  return [...learnerStore.readLearnerRecord().events.map((event) => event.id)].sort();
}

/** Every event id the account holds for this student, read straight back out
    of the stand-in rather than from anything the browser remembers. */
async function eventIdsInTheAccount(session: StandInSession): Promise<string[]> {
  const response = await fetch(
    `${standIn}/rest/v1/learning_events?user_id=eq.${encodeURIComponent(session.userId)}&select=event_id`,
    { headers: { apikey: STAND_IN_KEY, Authorization: `Bearer ${session.token}` } },
  );
  assert.equal(response.status, 200, 'the stand-in refused to hand back the account rows');
  const rows = (await response.json()) as { event_id: string }[];
  return rows.map((row) => row.event_id).sort();
}

function howManyEventsAbout(activityId: string): number {
  return learnerStore.readLearnerRecord().events.filter((event) => event.activityId === activityId).length;
}

test('a student who claims their signed-out work, works, leaves and comes back finds exactly what they left', async () => {
  freshDevice();

  /* Step 1: a fresh device, nobody signed in. A lesson and a short drill. */
  markLessonTheWayTheSiteDoes(JOURNEY_LESSON_SIGNED_OUT);
  sitTheDrillTheWayTheSiteDoes();
  const signedOutIds = eventIdsOnThisDevice();
  assert.ok(signedOutIds.length > 0, 'the signed-out work was not recorded at all');

  const a = await signUpOnStandIn('synthetic-student-a-journey');
  const b = await signUpOnStandIn('synthetic-student-b-journey');

  try {
    /* Step 2: A signs in and accepts "Add to my account". */
    await signInWithAnAccount(a);
    assert.ok(
      learnerStore.describeAnonymousWork(),
      'the signed-out work was not offered to the student who signed in',
    );
    assert.equal(learnerStore.claimAnonymousWork().outcome, 'claimed');
    assert.deepEqual(
      eventIdsOnThisDevice(),
      signedOutIds,
      'the claim changed the identity of the work it moved, so one attempt is now two rows',
    );

    /* Step 3: real work, done while signed in. One click is one event. */
    markLessonTheWayTheSiteDoes(JOURNEY_LESSON_SIGNED_IN);
    const afterSignedInWork = eventIdsOnThisDevice();
    assert.equal(
      afterSignedInWork.length,
      signedOutIds.length + 1,
      'one lesson marked while signed in produced more than one event',
    );
    assert.equal(howManyEventsAbout(`lesson:${JOURNEY_LESSON_SIGNED_IN}`), 1);

    await signOutWithAnAccount();
    assert.deepEqual(
      await eventIdsInTheAccount(a),
      afterSignedInWork,
      "the account does not hold what the student's own device holds",
    );

    /* Step 4: a different student uses the same browser, then leaves. */
    await signInWithAnAccount(b);
    assert.equal(learnerStore.describeAnonymousWork(), null, "student B was offered student A's claimed work");
    await signOutWithAnAccount();
    assert.deepEqual(await eventIdsInTheAccount(b), [], "something of student A's reached student B's account");

    /* Step 5: A comes back. Not one row more, not one row less. */
    await signInWithAnAccount(a);
    assert.deepEqual(
      eventIdsOnThisDevice(),
      afterSignedInWork,
      'student A came back to a different set of events than the one they left',
    );
    assert.equal(
      howManyEventsAbout(`lesson:${JOURNEY_LESSON_SIGNED_IN}`),
      1,
      'the lesson marked while signed in was carried into the record a second time by the migration',
    );
    assert.ok(
      !eventIdsOnThisDevice().includes(`legacy:lesson:${JOURNEY_LESSON_SIGNED_IN}`),
      'work done while signed in was migrated as though it predated the record',
    );

    await learningSync.activeLearningSync()?.flush();
    assert.deepEqual(
      await eventIdsInTheAccount(a),
      afterSignedInWork,
      'the second sign-in pushed a row the account did not have before',
    );
  } finally {
    await signOutWithAnAccount();
    delete (globalThis as Record<string, unknown>).__syntheticEnv;
  }
});

/* ------------------------------------------------------------------ */
/* 6. When the owner is decided, and by what                           */
/* ------------------------------------------------------------------ */

/* THE TWO PATHS THE 23 SEPTEMBER 2026 REVIEW REPRODUCED
 *
 * Finding 2: a sign-in that is abandoned mid-flight used to finish anyway
 * and set the owner back to the student who had just left. Everything after
 * an await in sign-in is now guarded by the sign-in generation, and a
 * cancelled step leaves every store on whoever the current owner is NOW.
 *
 * Finding 3: the owner used to start as this device's anonymous one and only
 * became the signed-in student when a navigation component mounted and ran
 * sign-in. The full-screen test player, the drills and the mock exam mount no
 * such component, so a hard load or a refresh of one of them wrote a
 * signed-in student's answers into the shared anonymous record. The owner is
 * now answered from the session this browser is holding, on the first read,
 * and the base layout starts one app-wide lifecycle on every route.
 */

/** A device with nothing on it and no lifecycle ever started: a browser
    opening a page for the first time. */
function coldDevice(): void {
  freshDevice();
  lifecycle.resetAccountLifecycleForTest();
}

/** The session the account client persists in this browser's own storage,
    written here exactly as it is written there. The token is SYNTHETIC and
    reaches nothing: only the user id inside it is ever read. */
function holdSessionFor(userId: string): void {
  storage.data.set(
    'sb-synthetic-local-auth-token',
    JSON.stringify({
      access_token: 'SYNTHETIC-access-token',
      refresh_token: 'SYNTHETIC-refresh-token',
      user: { id: userId, email: 'synthetic-student@example.test' },
    }),
  );
}

function recordKeyFor(namespace: string): string | undefined {
  return storage.data.get(`ielts.learning.record.v1::${namespace}`);
}

function anonymousNamespace(): string {
  return storeOwner.ownerNamespace(storeOwner.anonymousOwner(storeOwner.deviceIdFrom(storage)));
}

/** Every key on this device whose value carries a piece of student A's work. */
function keysCarryingAsWork(): string[] {
  const found: string[] = [];
  for (const [key, value] of storage.data) {
    if (A_FINGERPRINTS.some((mark) => value.includes(mark))) found.push(key);
  }
  return found;
}

const EMPTY_STUDENT = {
  lessons: 0,
  testAttempts: 0,
  essays: 0,
  speaking: 0,
  targetBand: null,
  vocabularyLearned: 0,
  notes: 0,
  savedLessons: 0,
};

test('a sign-out while the sign-in is still waiting leaves both stores anonymous, with none of A visible', async () => {
  freshDevice();

  /* Student A's own copies are already on this device, so a stale owner set
     would genuinely put their private essay back on screen. That is exactly
     what the review's reproduction saw. */
  await startSyncForUser(A);
  doStudentAsWork();
  stopSync();
  const uploadsBefore = uploads.length;

  /* The boundary itself. startSyncForUser sets the owner, then waits for the
     learning layer to load before setting it on the learner record and the
     plan. The sign-out below happens inside that wait: the sign-in has not
     reached its continuation yet, and every step after it is now guarded. */
  const abandoned = startSyncForUser(A);
  stopSync();
  const rightAfterSignOut = storeOwner.currentOwner();
  assert.equal(rightAfterSignOut.kind, 'anonymous', 'signing out did not reset the owner at all');

  /* Release it: the abandoned sign-in finishes, and every continuation runs. */
  await abandoned;

  assert.equal(
    storeOwner.currentOwner().kind,
    'anonymous',
    'an abandoned sign-in set the owner back to the student who had signed out',
  );
  assert.deepEqual(
    storeOwner.currentOwner(),
    rightAfterSignOut,
    'the owner moved to a different anonymous device owner than the sign-out chose',
  );

  /* The OLD stores: progress, study plan, vocabulary, notes and saved lessons. */
  assert.deepEqual(
    whatTheStudentSees(),
    EMPTY_STUDENT,
    "the abandoned sign-in left student A's work readable on a signed-out browser",
  );
  /* And the NEW ones: the learner record and the personal plan. */
  assert.equal(
    learnerStore.learnerStoreStatus().owner.kind,
    'anonymous',
    'the learner record was left loaded with the student who had signed out',
  );
  assert.equal(learnerStore.readLearnerRecord().events.length, 0);
  assert.equal(learnerStore.readPersonalPlan(), null);

  /* Nothing went up for a sign-in nobody completed. */
  assert.equal(uploads.length, uploadsBefore, 'an abandoned sign-in uploaded something');

  /* Student A has lost nothing: it is all still on this device under their
     own id, where their next sign-in finds it. */
  await startSyncForUser(A);
  assert.equal(progressStore.getWritingAttempts(A_PROMPT)[0]?.attempt.essay, A_ESSAY_TEXT);
});

test('a sign-in abandoned because a second student arrived leaves that second student intact', async () => {
  freshDevice();

  await startSyncForUser(A);
  doStudentAsWork();
  stopSync();

  /* Student A's account holds their essay too, so the late reply below is
     carrying real work rather than an empty row. */
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

  /* Student A starts signing in and is left waiting on the account. Holding
     it here is what puts EVERY remaining step of their sign-in (the merge,
     the write into the older stores, the upload, the subscriptions and the
     learning layer's own start, which moves owners itself) after student B
     has finished arriving. */
  let started!: () => void;
  const startedPull = new Promise<void>((resolve) => {
    started = resolve;
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  heldPull = { userId: A.id, started, gate };

  const abandoned = startSyncForUser(A);
  await startedPull;

  /* Student B takes over, completely, while student A is still waiting. */
  await startSyncForUser(B);

  /* Now let student A's sign-in finish. Every late continuation runs here. */
  release();
  await abandoned;
  await Promise.resolve();

  assert.deepEqual(
    storeOwner.currentOwner(),
    { kind: 'user', userId: B.id },
    "student A's abandoned sign-in took the browser back off student B",
  );
  assert.deepEqual(
    learnerStore.learnerStoreStatus().owner,
    { kind: 'user', userId: B.id },
    'the learner record was left on student A while student B was signed in',
  );
  assert.deepEqual(
    whatTheStudentSees(),
    EMPTY_STUDENT,
    "student B was shown student A's work by the abandoned sign-in",
  );

  /* Student B's own work still saves, still under student B, and the
     subscriptions that carry it up are student B's: an abandoned sign-in
     that had added its own would send this under student A's id too. */
  const uploadsBeforeBsEdit = uploads.length;
  const firePush = catchScheduledPush(() => {
    progressStore.recordWritingAttempt(B_PROMPT, {
      at: '2026-09-23T10:00:00.000Z',
      overallBand: 5.5,
      criteria: {},
      wordCount: 210,
      live: false,
      essay: B_ESSAY_TEXT,
    });
  });
  firePush();
  await Promise.resolve();
  await Promise.resolve();

  const after = uploads.slice(uploadsBeforeBsEdit);
  assert.ok(after.length > 0, "student B's own edit never reached their account");
  for (const row of after) {
    assert.equal(row.user_id, B.id, "student B's edit was uploaded under another account");
    carriesNothingOf(row, A_FINGERPRINTS);
  }
  assert.ok(
    !uploads.some((row) => row.user_id === B.id && JSON.stringify(row).includes(A_ESSAY_TEXT)),
    "student A's essay went up under student B's id",
  );

  /* And student A still has everything, under their own key. */
  stopSync();
  await startSyncForUser(A);
  assert.equal(progressStore.getWritingAttempts(A_PROMPT)[0]?.attempt.essay, A_ESSAY_TEXT);
});

test('a page with no account component on it records a signed-in student under their own record', async () => {
  coldDevice();
  /* The browser is holding student A's session, exactly as it would after
     they signed in on the dashboard and then opened a drill by its own
     address. Nothing else has run: no menu, no header, no nav. */
  holdSessionFor(A.id);

  try {
    /* The full-screen page loads. All it does is start the lifecycle. */
    lifecycle.startAccountLifecycle();

    /* And the recorder writes, straight away, the way a submitted drill
       does: no await in between, because a student can finish and submit
       before any account round trip has come back. */
    learnerStore.recordLessonStudied({ lessonKey: 'reading-matching-headings' });

    assert.deepEqual(
      storeOwner.currentOwner(),
      { kind: 'user', userId: A.id },
      'a page with no account component left the owner anonymous for a signed-in student',
    );
    assert.ok(recordKeyFor(`u:${A.id}`), "the signed-in student's own record was never written");
    assert.equal(
      recordKeyFor(anonymousNamespace()),
      undefined,
      "a signed-in student's work was written into this device's shared anonymous record",
    );
    assert.deepEqual(
      keysCarryingAsWork().filter((key) => key.includes('anon:')),
      [],
      "something of the signed-in student's reached an anonymous key",
    );

    /* The account itself is the authority and answers a moment later. Here
       the stand-in says nobody is signed in, so the owner goes back to the
       anonymous device owner. The work stays where it was written, under
       that student's own id, unreadable to anybody else. */
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(recordKeyFor(`u:${A.id}`), 'the work was deleted when the account disagreed');
  } finally {
    lifecycle.resetAccountLifecycleForTest();
  }
});

test('the same page, signed out, records under this device and nowhere else', async () => {
  coldDevice();

  try {
    lifecycle.startAccountLifecycle();
    learnerStore.recordLessonStudied({ lessonKey: 'reading-matching-headings' });

    assert.equal(
      storeOwner.currentOwner().kind,
      'anonymous',
      'signed-out use stopped being recorded on this device',
    );
    assert.ok(recordKeyFor(anonymousNamespace()), 'signed-out work was not recorded at all');
    assert.deepEqual(
      [...storage.data.keys()].filter((key) => key.startsWith('ielts.learning.record.v1::u:')),
      [],
      'signed-out work was filed under an account',
    );
  } finally {
    lifecycle.resetAccountLifecycleForTest();
  }
});

/* ------------------------------------------------------------------ */
/* 6b. Only THIS application's session names the owner (R2-04)         */
/* ------------------------------------------------------------------ */

/* A browser's storage is shared by every page on one origin, and on GitHub
 * Pages that origin is shared by every application its owner publishes. The
 * owner used to be read from the FIRST `sb-*-auth-token` key found, so a
 * session belonging to a different Supabase project could decide whose work
 * this site showed, restore that stranger's sitting and take new work under
 * their id; with accounts unconfigured here nothing ever corrected it. */

const FOREIGN_USER = 'SYNTHETIC-USER-OF-ANOTHER-APPLICATION';

/** A session another application on the same origin left in this storage. */
function holdForeignSession(key = 'sb-another-application-auth-token'): void {
  storage.data.set(
    key,
    JSON.stringify({
      access_token: 'SYNTHETIC-foreign-access-token',
      user: { id: FOREIGN_USER, email: 'synthetic-foreign@example.test' },
    }),
  );
}

/** Accounts switched off for one test, and back on afterwards. */
async function withAccountsUnconfigured(run: () => Promise<void> | void): Promise<void> {
  const globals = globalThis as Record<string, unknown>;
  globals.__syntheticAuthEnv = undefined;
  globals.__syntheticAuthConfigured = false;
  try {
    await run();
  } finally {
    globals.__syntheticAuthEnv = THIS_PROJECT_ENV;
    globals.__syntheticAuthConfigured = true;
  }
}

/** Let the lifecycle's on-demand half (the account modules) land and answer. */
async function lifecycleSettled(): Promise<void> {
  for (let tick = 0; tick < 50 && !lifecycle.accountState().known; tick += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.ok(lifecycle.accountState().known, 'the account lifecycle never answered');
}

function foreignKeys(): string[] {
  return [...storage.data.keys()].filter((key) => key.includes(`u:${FOREIGN_USER}`));
}

test("the session key is the account client's own: sb-<project ref>-auth-token", async () => {
  assert.equal(storeOwner.authProjectRef('https://abcd1234.supabase.co'), 'abcd1234');
  assert.equal(storeOwner.authSessionKeyFor('https://abcd1234.supabase.co'), 'sb-abcd1234-auth-token');
  assert.equal(storeOwner.authSessionKeyFor('  https://abcd1234.supabase.co/  '), 'sb-abcd1234-auth-token');
  /* The local stand-in the browser scripts use. */
  assert.equal(storeOwner.authSessionKeyFor('http://127.0.0.1:8803'), 'sb-127-auth-token');
  for (const nothing of [undefined, null, '', 'synthetic-local.supabase.co', 'ftp://x.supabase.co', 'https://']) {
    assert.equal(storeOwner.authSessionKeyFor(nothing), null, `"${String(nothing)}" named a session key`);
  }
  assert.equal(storeOwner.configuredAuthSessionKey(), 'sb-synthetic-local-auth-token');

  /* And it is the key the library itself would pick for the same address,
     checked against the library rather than against a copy of its rule. The
     client is built with nothing persisted and nothing refreshed: no
     storage, no timer, no request. */
  const { createClient } = await import('@supabase/supabase-js');
  for (const url of ['https://abcd1234.supabase.co', 'http://127.0.0.1:8803', THIS_PROJECT_ENV.PUBLIC_SUPABASE_URL]) {
    const client = createClient(url, 'SYNTHETIC-anon-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    assert.equal(
      (client as unknown as { storageKey: string }).storageKey,
      storeOwner.authSessionKeyFor(url),
      `the account client keeps ${url}'s session somewhere this site does not look`,
    );
  }
});

test("with several projects' sessions on one origin, only this project's student is the owner", async () => {
  coldDevice();
  /* The other application's session goes in FIRST, so a lookup that took the
     first matching key would find it. */
  holdForeignSession();
  holdForeignSession('sb-yet-another-app-auth-token');
  holdSessionFor(A.id);

  assert.equal(storeOwner.storedSessionUserId(storage), A.id);
  assert.equal(storeOwner.storedSessionUserId(storage, 'sb-another-application-auth-token'), FOREIGN_USER);

  try {
    lifecycle.startAccountLifecycle();
    learnerStore.recordLessonStudied({ lessonKey: 'reading-matching-headings' });
    assert.deepEqual(storeOwner.currentOwner(), { kind: 'user', userId: A.id });
    assert.ok(recordKeyFor(`u:${A.id}`), "this project's student was not the owner");
    assert.deepEqual(foreignKeys(), [], "another application's user received work from this site");
  } finally {
    lifecycle.resetAccountLifecycleForTest();
  }
});

test("another project's session alone is nobody here: the owner is this device, before and after the account answers", async () => {
  coldDevice();
  holdForeignSession();

  try {
    lifecycle.startAccountLifecycle();
    assert.equal(storeOwner.currentOwner().kind, 'anonymous', "a foreign session made its user the owner at start-up");
    learnerStore.recordLessonStudied({ lessonKey: 'reading-matching-headings' });
    progressStore.markLessonComplete('reading-matching-headings');

    await lifecycleSettled();
    assert.equal(storeOwner.currentOwner().kind, 'anonymous', 'the lifecycle adopted a foreign session');
    assert.equal(lifecycle.accountState().user, null);
    assert.ok(recordKeyFor(anonymousNamespace()), 'the work was not recorded on this device');
    assert.deepEqual(foreignKeys(), [], "another application's user received work from this site");
  } finally {
    lifecycle.resetAccountLifecycleForTest();
  }
});

test('with accounts not configured here, a browser holding sessions is still signed out, and stays so', async () => {
  await withAccountsUnconfigured(async () => {
    coldDevice();
    holdForeignSession();
    /* Even a session under the very key this site WOULD use, were it
       configured: with no project there is no account to be signed in to. */
    holdSessionFor(A.id);

    assert.equal(storeOwner.configuredAuthSessionKey(), null);
    assert.equal(storeOwner.storedSessionUserId(storage), null);

    try {
      lifecycle.startAccountLifecycle();
      assert.equal(storeOwner.currentOwner().kind, 'anonymous', 'an unconfigured site started with a signed-in owner');
      learnerStore.recordLessonStudied({ lessonKey: 'reading-matching-headings' });

      await lifecycleSettled();
      assert.equal(storeOwner.currentOwner().kind, 'anonymous', 'an unconfigured site ended with a signed-in owner');
      assert.equal(lifecycle.accountState().user, null);
      assert.ok(recordKeyFor(anonymousNamespace()), 'signed-out work was not recorded on this device');
      assert.deepEqual(
        [...storage.data.keys()].filter((key) => key.startsWith('ielts.learning.record.v1::u:')),
        [],
        'work was filed under an account on a site with no accounts',
      );
    } finally {
      lifecycle.resetAccountLifecycleForTest();
    }
  });
});

test('with accounts not configured, the lifecycle does not leave a signed-in owner in place, however it got there', async () => {
  await withAccountsUnconfigured(async () => {
    coldDevice();
    /* Nothing in this build can set this any more without a configured
       project; set by hand here to prove the lifecycle's own backstop. */
    storeOwner.setCurrentOwner(storeOwner.userOwner(FOREIGN_USER));

    try {
      lifecycle.startAccountLifecycle();
      await lifecycleSettled();
      assert.equal(storeOwner.currentOwner().kind, 'anonymous', 'the lifecycle left a signed-in owner on a site with no accounts');
    } finally {
      lifecycle.resetAccountLifecycleForTest();
    }
  });
});

/* ------------------------------------------------------------------ */
/* 7. The lifecycle cannot be left off a page                          */
/* ------------------------------------------------------------------ */

test('every page that hides the site chrome still gets the app-wide account lifecycle', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');

  const root = path.resolve(url.fileURLToPath(new URL('.', import.meta.url)), '..');
  const layout = fs.readFileSync(path.join(root, 'src/layouts/BaseLayout.astro'), 'utf8');

  assert.ok(
    layout.includes("import AccountLifecycle from '../components/AccountLifecycle.astro'"),
    'BaseLayout no longer imports the account lifecycle',
  );
  const rendered = layout.split('\n').filter((line) => line.includes('<AccountLifecycle'));
  assert.equal(rendered.length, 1, 'the account lifecycle is rendered by BaseLayout exactly once');
  assert.ok(
    !rendered[0]!.includes('bare'),
    'the account lifecycle was put behind a bare condition, which is the one case it exists for',
  );

  /* Every page that asks for the chrome-free layout must be getting it from
     BaseLayout, or it would not have the lifecycle on it at all. */
  const bare: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.astro')) {
        const source = fs.readFileSync(full, 'utf8');
        const asksForBare = /<BaseLayout[^>]*\sbare[\s>]/.test(source) || /^\s*bare,?\s*$/m.test(source);
        if (asksForBare) bare.push(path.relative(root, full).replace(/\\/g, '/'));
      }
    }
  };
  walk(path.join(root, 'src/pages'));

  assert.ok(bare.length > 0, 'no full-screen page was found at all, so this scan proves nothing');
  for (const page of bare) {
    const source = fs.readFileSync(path.join(root, page), 'utf8');
    assert.ok(
      /import\s+BaseLayout\s+from/.test(source),
      `${page} hides the site chrome without going through BaseLayout, so it has no account lifecycle`,
    );
  }
});

/* ------------------------------------------------------------------ */
/* 8. One account change, one announcement                             */
/* ------------------------------------------------------------------ */

/* Every screen that holds a student's work (the essay editor, the trainers,
 * the test player, the focused exercises, the spoken and written tasks, the
 * tutor panel) listens for owner changes and, on hearing one, hands over:
 * keeps the outgoing student's work for them, clears itself and shows one
 * calm line. A sign-in used to reset the owner to this device's anonymous
 * one and then set the incoming student, announcing both. On a signed-in
 * page load the incoming student is ALREADY the owner, so a screen that had
 * mounted first heard the owner leave and come back and showed the calm line
 * although the account never changed; a switch from A to B was heard as two
 * changes. The rule since 23 September 2026 (src/lib/auth/sync.ts, and
 * moveOwnerOnce in src/lib/store-owner.ts): a genuine change is announced
 * exactly once, and the same student again is announced not at all. */

/** What a screen hears from now on: for every owner-change notice, the
    owner it finds when it looks. */
function listenLikeAScreen(): { heard: string[]; stop(): void } {
  const heard: string[] = [];
  const stop = storeOwner.onOwnerChange(() => {
    heard.push(storeOwner.ownerNamespace(storeOwner.currentOwner()));
  });
  return { heard, stop };
}

const NS_A = `u:${A.id}`;
const NS_B = `u:${B.id}`;

/** Load the learning module into the account sync once, the way any earlier
    sign-in on the page would have. Without it the learner record is only
    moved after a module load, and the "never shown anonymous" checks below
    would pass for the wrong reason. */
async function learningModuleLoaded(): Promise<void> {
  freshDevice();
  await startSyncForUser(B);
  stopSync();
}

async function ticks(until: () => boolean, what: string): Promise<void> {
  for (let tick = 0; tick < 200 && !until(); tick += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.ok(until(), `never happened: ${what}`);
}

test('a signed-in page load for the student who is already the owner announces no owner change, and the sign-in still finishes for them', { timeout: 10_000 }, async () => {
  coldDevice();
  holdSessionFor(A.id);
  /* The page has mounted: a screen has resolved its owner and is listening. */
  assert.deepEqual(storeOwner.currentOwner(), { kind: 'user', userId: A.id });
  const screen = listenLikeAScreen();
  try {
    await startSyncForUser(A);
  } finally {
    screen.stop();
  }
  assert.deepEqual(screen.heard, [], 'a screen heard an account change on a page load where the account never changed');
  assert.deepEqual(storeOwner.currentOwner(), { kind: 'user', userId: A.id });
  assert.deepEqual(learnerStore.learnerStoreStatus().owner, { kind: 'user', userId: A.id });
  assert.ok(uploads.some((row) => row.user_id === A.id), 'the sign-in never finished for the student');
});

test('the same page load through the real lifecycle, where the account answers twice for the same student, announces no owner change', { timeout: 10_000 }, async () => {
  coldDevice();
  holdSessionFor(A.id);
  const session = { access_token: 'SYNTHETIC-access-token', user: { id: A.id } };
  /* The account client answers once straight away (getSession) and once with
     its initial session event, both for the same student, which is exactly
     what the real client does on a signed-in page load. */
  const realAuth = syntheticSupabase.auth;
  syntheticSupabase.auth = {
    ...realAuth,
    async getSession() {
      return { data: { session: session as never } };
    },
    onAuthStateChange(callback: (event: string, value: unknown) => void) {
      queueMicrotask(() => callback('INITIAL_SESSION', session));
      return { data: { subscription: { unsubscribe() {} } } };
    },
  } as typeof realAuth;

  assert.deepEqual(storeOwner.currentOwner(), { kind: 'user', userId: A.id });
  const screen = listenLikeAScreen();
  try {
    lifecycle.startAccountLifecycle();
    await ticks(
      () => lifecycle.accountState().settled > 0 && uploads.some((row) => row.user_id === A.id),
      'the sign-in finished',
    );
    /* Let every late continuation of the first, superseded answer run. */
    for (let tick = 0; tick < 20; tick += 1) await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(screen.heard, [], 'a screen heard an account change on a signed-in page load');
    assert.deepEqual(storeOwner.currentOwner(), { kind: 'user', userId: A.id });
    assert.deepEqual(learnerStore.learnerStoreStatus().owner, { kind: 'user', userId: A.id });
  } finally {
    screen.stop();
    lifecycle.resetAccountLifecycleForTest();
    syntheticSupabase.auth = realAuth;
  }
});

test('a duplicate session event for the same student, while their sign-in is still running, announces nothing and never shows the anonymous record', { timeout: 10_000 }, async () => {
  await learningModuleLoaded();
  coldDevice();
  holdSessionFor(A.id);
  assert.deepEqual(storeOwner.currentOwner(), { kind: 'user', userId: A.id });

  const screen = listenLikeAScreen();
  /* What a screen reading the learner record would have been shown. */
  const recordShown: string[] = [];
  const stopRecord = learnerStore.onLearnerRecordChange(() => {
    recordShown.push(storeOwner.ownerNamespace(learnerStore.learnerStoreStatus().owner));
  });
  try {
    const first = startSyncForUser(A);
    const second = startSyncForUser(A);
    await Promise.all([first, second]);
  } finally {
    screen.stop();
    stopRecord();
  }
  assert.deepEqual(screen.heard, [], 'a repeated answer for the same student was heard as an account change');
  assert.deepEqual(
    recordShown.filter((namespace) => namespace !== NS_A),
    [],
    'the learner record was moved off the student and back while nothing changed',
  );
  assert.deepEqual(storeOwner.currentOwner(), { kind: 'user', userId: A.id });
  assert.deepEqual(learnerStore.learnerStoreStatus().owner, { kind: 'user', userId: A.id });
  assert.ok(uploads.length > 0 && uploads.every((row) => row.user_id === A.id), 'the surviving sign-in did not finish for A alone');
});

test('a repeated session event after the sign-in finished announces nothing', { timeout: 10_000 }, async () => {
  freshDevice();
  await startSyncForUser(A);
  const screen = listenLikeAScreen();
  try {
    await startSyncForUser(A);
  } finally {
    screen.stop();
  }
  assert.deepEqual(screen.heard, []);
  assert.deepEqual(storeOwner.currentOwner(), { kind: 'user', userId: A.id });
});

test('a sign-in from anonymous announces exactly one owner change, to the student, even when the account answers twice', { timeout: 10_000 }, async () => {
  freshDevice();
  assert.equal(storeOwner.currentOwner().kind, 'anonymous');
  const once = listenLikeAScreen();
  try {
    await startSyncForUser(A);
  } finally {
    once.stop();
  }
  assert.deepEqual(once.heard, [NS_A]);

  freshDevice();
  assert.equal(storeOwner.currentOwner().kind, 'anonymous');
  const twice = listenLikeAScreen();
  try {
    await Promise.all([startSyncForUser(A), startSyncForUser(A)]);
  } finally {
    twice.stop();
  }
  assert.deepEqual(twice.heard, [NS_A], 'the second answer for the same student was heard as another change');
  assert.deepEqual(storeOwner.currentOwner(), { kind: 'user', userId: A.id });
});

test('a switch from student A to student B announces exactly one owner change, to B', { timeout: 10_000 }, async () => {
  freshDevice();
  await startSyncForUser(A);
  doStudentAsWork();
  const screen = listenLikeAScreen();
  try {
    /* No sign-out in between: the account reports B straight away, the way
       signing in as somebody else on top of a live session does. */
    await startSyncForUser(B);
  } finally {
    screen.stop();
  }
  assert.deepEqual(screen.heard, [NS_B], 'a switch was heard as more than one change, or as a change to somebody else');
  assert.deepEqual(storeOwner.currentOwner(), { kind: 'user', userId: B.id });
  assert.deepEqual(learnerStore.learnerStoreStatus().owner, { kind: 'user', userId: B.id });
  assert.deepEqual(whatTheStudentSees(), EMPTY_STUDENT, "student B was shown student A's work");
  for (const row of uploads.filter((entry) => entry.user_id === B.id)) carriesNothingOf(row, A_FINGERPRINTS);
});

test('a sign-out announces exactly one owner change, to this device, once every store has moved', { timeout: 10_000 }, async () => {
  freshDevice();
  await startSyncForUser(A);
  const heardWith: string[] = [];
  const stop = storeOwner.onOwnerChange(() => {
    heardWith.push(
      `${storeOwner.currentOwner().kind} / record ${learnerStore.learnerStoreStatus().owner.kind}`,
    );
  });
  try {
    stopSync();
  } finally {
    stop();
  }
  assert.deepEqual(
    heardWith,
    ['anonymous / record anonymous'],
    'a sign-out was heard more than once, or before the learner record had moved',
  );
});
