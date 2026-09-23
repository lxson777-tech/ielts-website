/* An unfinished test belongs to the student who started it, and to nobody
 * else.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/test-session-owner.test.ts
 * The whole suite is `npm test`.
 *
 * WHY THIS FILE EXISTS
 * An independent review on 23 September 2026 started a Reading drill as a
 * synthetic student A, chose "i" for question 14, walked away, signed out,
 * signed up as a synthetic student B, opened the same drill from its real hub
 * link and found A's answer already selected. B pressed Submit, and A's answer
 * landed in B's history and in B's uploaded evidence. The cause was that the
 * in-progress sitting lived under one device-wide key, `ielts.testsession.v1`,
 * with nobody's name on it. The completed mock sittings under
 * `ielts.mock.v1` had exactly the same hole, essays and all.
 *
 * WHAT IS BEING DEFENDED HERE, IN ORDER
 *   1. Two students on one browser never see each other's unfinished sitting.
 *   2. A sitting held in memory is bound to the student who started it, so a
 *      sign-out or a sign-in in another tab stops it saving or submitting.
 *   3. A sitting left on the device before any of this existed goes to the
 *      anonymous device owner, never to the next account that signs in.
 *   4. Nothing is deleted. A's sitting is still there, with A's answers, when
 *      A signs back in.
 *
 * There is no DOM here and no real browser. `window.localStorage` is a Map,
 * which is what every module under test reaches for, and the two screen-level
 * rules (the player refusing to submit, and the mock refusing to record) are
 * proved at the exact functions those screens call. Every student, answer and
 * band below is SYNTHETIC.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

/* ------------------------------------------------------------------ */
/* A browser, in a dozen lines                                         */
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

/* Defined before anything under test is imported, so no module ever sees a
   half-built browser. */
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

/* ------------------------------------------------------------------ */
/* The real modules                                                    */
/* ------------------------------------------------------------------ */

const session = await import('../src/lib/test-session.ts');
const mock = await import('../src/lib/tests/mock.ts');
const storeOwner = await import('../src/lib/store-owner.ts');
const progress = await import('../src/lib/progress.ts');
const { DEVICE_ID_KEY, LEGACY_MIGRATION_OWNER_KEY } = await import('../src/lib/learning/contracts/sync.ts');

const { anonymousOwner, ownerNamespace, resetStoreOwnerForTest, setCurrentOwner, userOwner } = storeOwner;

/* ------------------------------------------------------------------ */
/* SYNTHETIC students, papers and answers                              */
/* ------------------------------------------------------------------ */

const A = userOwner('SYNTHETIC-STUDENT-A');
const B = userOwner('SYNTHETIC-STUDENT-B');
const DEVICE_ID = 'SYNTHETIC-DEVICE-1';
const ANON = anonymousOwner(DEVICE_ID);

const NS_A = ownerNamespace(A);
const NS_B = ownerNamespace(B);
const NS_ANON = ownerNamespace(ANON);

/** The drill the review reproduced the defect on, and the answer it used. */
const DRILL = {
  id: 'reading-full-006-drill-p2',
  durationMinutes: 20,
} as unknown as Parameters<typeof session.startSession>[0];

const OTHER_DRILL = {
  id: 'reading-full-007-drill-p1',
  durationMinutes: 20,
} as unknown as Parameters<typeof session.startSession>[0];

const A_ANSWER = { q14: 'i' };
const B_ANSWER = { q14: 'iv' };

function sessionKey(namespace: string): string {
  return `${session.TEST_SESSION_KEY}::${namespace}`;
}

function mockKey(namespace: string): string {
  return `${mock.MOCK_STORE_KEY}::${namespace}`;
}

/** A fresh browser for each test: empty storage, nobody signed in, and a
    device id this file chose so the anonymous owner is predictable. */
function freshBrowser(seed: Record<string, string> = {}): void {
  storage = memoryStorage();
  for (const [key, value] of Object.entries(seed)) storage.data.set(key, value);
  storage.data.set(DEVICE_ID_KEY, DEVICE_ID);
  resetStoreOwnerForTest();
  setCurrentOwner(null);
}

/** A SYNTHETIC completed mock sitting, small enough to read at a glance. */
function mockAttempt(id: string, essay: string): Parameters<typeof mock.saveMockAttempt>[0] {
  return {
    id,
    at: '2026-09-23T09:00:00.000Z',
    listeningTestId: 'listening-full-001',
    listeningBand: 7,
    listeningRaw: 30,
    listeningTotal: 40,
    readingTestId: 'reading-full-001',
    readingBand: 6.5,
    readingRaw: 28,
    readingTotal: 40,
    essays: [{ promptId: 'SYNTHETIC-prompt', task: 'task2', text: essay, wordCount: 2 }],
    secondsUsed: 9000,
  };
}

/* ------------------------------------------------------------------ */
/* 1. Two students on one browser                                      */
/* ------------------------------------------------------------------ */

test("A's unfinished sitting is invisible to B, and B's to A", () => {
  freshBrowser();

  setCurrentOwner(A);
  session.startSession(DRILL);
  assert.equal(session.saveAnswers(A_ANSWER, NS_A), true);

  setCurrentOwner(B);
  assert.equal(session.activeSession(), null, "B can see A's unfinished sitting");
  assert.equal(session.loadSession(DRILL.id), null, "B's drill restored A's answers");

  /* B sits the same drill and answers it differently. */
  session.startSession(DRILL);
  assert.equal(session.saveAnswers(B_ANSWER, NS_B), true);
  assert.deepEqual(session.loadSession(DRILL.id)?.answers, B_ANSWER);

  setCurrentOwner(A);
  assert.deepEqual(session.loadSession(DRILL.id)?.answers, A_ANSWER, "A's own answers did not survive B");

  /* Two keys, one per student, and each holds only its own student's work. */
  assert.equal(JSON.parse(storage.data.get(sessionKey(NS_A))!).answers.q14, 'i');
  assert.equal(JSON.parse(storage.data.get(sessionKey(NS_B))!).answers.q14, 'iv');
});

test('starting a sitting replaces only the starter\'s own, never another student\'s', () => {
  freshBrowser();

  setCurrentOwner(A);
  session.startSession(DRILL);
  session.saveAnswers(A_ANSWER, NS_A);

  setCurrentOwner(B);
  /* B starts a DIFFERENT paper: A's sitting is a different key entirely. */
  session.startSession(OTHER_DRILL);

  setCurrentOwner(A);
  const mine = session.activeSession();
  assert.equal(mine?.testId, DRILL.id);
  assert.deepEqual(mine?.answers, A_ANSWER);
});

test('a sitting is stamped with the owner that started it', () => {
  freshBrowser();
  setCurrentOwner(A);
  const started = session.startSession(DRILL);
  assert.equal(started.owner, NS_A);
  assert.equal(session.currentSessionOwner(), NS_A);
});

/* ------------------------------------------------------------------ */
/* 2. A sitting bound to A, after the owner changed                    */
/* ------------------------------------------------------------------ */

test('a sitting bound to A saves nothing once B is signed in', () => {
  freshBrowser();

  setCurrentOwner(A);
  session.startSession(DRILL);
  session.saveAnswers(A_ANSWER, NS_A);

  setCurrentOwner(B);
  assert.equal(session.ownerStillCurrent(NS_A), false);
  assert.equal(
    session.saveAnswers({ q14: 'vii' }, NS_A),
    false,
    "a keystroke from A's sitting was saved after B signed in",
  );
  assert.equal(storage.data.get(sessionKey(NS_B)) ?? null, null, "something of A's was written into B's key");
  assert.deepEqual(JSON.parse(storage.data.get(sessionKey(NS_A))!).answers, A_ANSWER);
});

test('a sitting bound to A saves nothing once nobody is signed in', () => {
  freshBrowser();

  setCurrentOwner(A);
  session.startSession(DRILL);
  session.saveAnswers(A_ANSWER, NS_A);

  setCurrentOwner(null); // sign out
  assert.equal(session.ownerStillCurrent(NS_A), false);
  assert.equal(session.saveAnswers({ q14: 'vii' }, NS_A), false);
  assert.equal(storage.data.get(sessionKey(NS_ANON)) ?? null, null);
});

test("clearing a sitting after the owner changed leaves both students' sittings alone", () => {
  freshBrowser();

  setCurrentOwner(A);
  session.startSession(DRILL);
  session.saveAnswers(A_ANSWER, NS_A);

  setCurrentOwner(B);
  session.startSession(DRILL);
  session.saveAnswers(B_ANSWER, NS_B);

  /* A's player, still mounted in another tab, reaches the end of its clock
     and tries to tidy up. It must not touch B's live sitting. */
  session.clearSession(NS_A);
  assert.deepEqual(JSON.parse(storage.data.get(sessionKey(NS_B))!).answers, B_ANSWER);
  assert.ok(storage.data.has(sessionKey(NS_A)), "A's own sitting was deleted by the stale clear");

  /* B's own submit does clear B's own sitting, and still not A's. */
  session.clearSession(NS_B);
  assert.equal(storage.data.has(sessionKey(NS_B)), false);
  assert.ok(storage.data.has(sessionKey(NS_A)));
});

test('ownerStillCurrent is the one rule the player and the mock both ask', () => {
  freshBrowser();
  setCurrentOwner(A);
  assert.equal(session.ownerStillCurrent(NS_A), true);
  assert.equal(session.ownerStillCurrent(NS_B), false);
  assert.equal(session.ownerStillCurrent(NS_ANON), false);
  /* A sitting with no owner at all (nothing in this build writes one, but a
     resumed pre-build sitting has none) is not treated as foreign: it is
     already under the current owner's key by the adoption rule. */
  assert.equal(session.ownerStillCurrent(undefined), true);
});

/* ------------------------------------------------------------------ */
/* 3. The old unowned sitting on a browser used before this build      */
/* ------------------------------------------------------------------ */

const LEGACY_SESSION = JSON.stringify({
  version: 1,
  testId: 'reading-full-006-drill-p2',
  startedAt: 1_790_137_878_021,
  endsAt: 1_790_139_078_021,
  answers: { q14: 'i' },
});

test('an unowned sitting goes to the anonymous device owner, never to a signed-in one', () => {
  freshBrowser({ [session.TEST_SESSION_KEY]: LEGACY_SESSION });

  /* B signs in first, on a device whose old sitting nobody has claimed. */
  setCurrentOwner(B);
  assert.equal(session.activeSession(), null, "a signed-in student inherited the device's old sitting");
  assert.equal(storage.data.has(sessionKey(NS_B)), false);

  /* Signed out, the same old sitting is exactly where it should be: with the
     device, where the explicit claim flow can offer it. */
  setCurrentOwner(null);
  const adopted = session.activeSession();
  assert.equal(adopted?.testId, 'reading-full-006-drill-p2');
  assert.deepEqual(adopted?.answers, { q14: 'i' });

  /* And the original device-wide key still holds every byte it held. */
  assert.equal(storage.data.get(session.TEST_SESSION_KEY), LEGACY_SESSION);
});

test('an unowned sitting DOES go to the owner the device itself names', () => {
  freshBrowser({
    [session.TEST_SESSION_KEY]: LEGACY_SESSION,
    [LEGACY_MIGRATION_OWNER_KEY]: JSON.stringify({ ownerKey: NS_A }),
  });

  setCurrentOwner(B);
  assert.equal(session.activeSession(), null);

  setCurrentOwner(A);
  assert.deepEqual(session.activeSession()?.answers, { q14: 'i' });
  assert.equal(storage.data.get(session.TEST_SESSION_KEY), LEGACY_SESSION);
});

/* ------------------------------------------------------------------ */
/* 4. A signs back in                                                  */
/* ------------------------------------------------------------------ */

test('A can resume the sitting B never saw, with A\'s own answer still in it', () => {
  freshBrowser();

  setCurrentOwner(A);
  session.startSession(DRILL);
  session.saveAnswers(A_ANSWER, NS_A);

  setCurrentOwner(null); // A signs out
  setCurrentOwner(B); // B signs up on the same browser
  session.startSession(DRILL);
  session.saveAnswers(B_ANSWER, NS_B);
  session.clearSession(NS_B); // B submits

  setCurrentOwner(null); // B signs out
  setCurrentOwner(A); // A signs back in

  const resumed = session.loadSession(DRILL.id);
  assert.deepEqual(resumed?.answers, A_ANSWER, "A's unfinished sitting did not survive B's whole visit");
  assert.equal(resumed?.owner, NS_A);
  assert.ok(session.secondsLeft(resumed!) >= 0);
});

/* ------------------------------------------------------------------ */
/* 5. The mock exam follows the same rules                             */
/* ------------------------------------------------------------------ */

test("A's mock sittings, essays and all, are invisible to B", () => {
  freshBrowser();

  setCurrentOwner(A);
  assert.equal(mock.saveMockAttempt(mockAttempt('mock-2026-09-23-1', 'SYNTHETIC essay by A'), NS_A), true);
  assert.equal(mock.listMockAttempts().length, 1);

  setCurrentOwner(B);
  assert.deepEqual(mock.listMockAttempts(), [], "B can read A's mock sittings");
  assert.equal(mock.getMockAttempt('mock-2026-09-23-1'), undefined);
  /* nextMockId counts only the reader's own sittings, so B's first mock of
     the day is B's first, not A's second. */
  assert.equal(mock.nextMockId('2026-09-23T10:00:00.000Z'), 'mock-2026-09-23-1');

  setCurrentOwner(A);
  assert.equal(mock.listMockAttempts()[0]?.essays[0]?.text, 'SYNTHETIC essay by A');
});

test('a mock sitting that outlived its student records nothing at all', () => {
  freshBrowser();

  setCurrentOwner(A);
  const startedUnder = mock.currentMockOwner();
  assert.equal(startedUnder, NS_A);

  setCurrentOwner(B);
  assert.equal(
    mock.saveMockAttempt(mockAttempt('mock-2026-09-23-1', 'SYNTHETIC essay by A'), startedUnder),
    false,
    "A's mock day was recorded after B signed in",
  );
  assert.deepEqual(mock.listMockAttempts(), []);
  assert.equal(storage.data.has(mockKey(NS_B)), false);
  /* Nothing reached the shared progress history under B either. */
  assert.deepEqual(progress.getProgress().tests, {});

  setCurrentOwner(null);
  assert.equal(mock.saveMockAttempt(mockAttempt('mock-2026-09-23-1', 'SYNTHETIC essay by A'), startedUnder), false);
  assert.deepEqual(mock.listMockAttempts(), []);
});

test('an unowned mock history goes to the anonymous device owner, never to a signed-in one', () => {
  const legacy = JSON.stringify([mockAttempt('mock-2026-09-01-1', 'SYNTHETIC essay left on this device')]);
  freshBrowser({ [mock.MOCK_STORE_KEY]: legacy });

  setCurrentOwner(B);
  assert.deepEqual(mock.listMockAttempts(), [], "a signed-in student inherited the device's old mock history");

  setCurrentOwner(null);
  assert.equal(mock.listMockAttempts()[0]?.essays[0]?.text, 'SYNTHETIC essay left on this device');
  assert.equal(storage.data.get(mock.MOCK_STORE_KEY), legacy);
});
