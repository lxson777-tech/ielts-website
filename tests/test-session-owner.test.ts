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
 *      anonymous device owner, never to the next account that signs in, and
 *      never to the account the device's HISTORY stamp names either (Codex
 *      round 2, R2-01: the stamp says whose history was migrated, not who
 *      started the sitting). Only the explicit claim moves device work to an
 *      account.
 *   4. Nothing is deleted. A's sitting is still there, with A's answers, when
 *      A signs back in.
 *   5. An unfinished mock day is written down under the student sitting it
 *      (Codex round 2, R2-03): B never sees it, B's fresh mock is kept
 *      apart, A picks it up with the finished legs still done, and the
 *      Writing deadline is kept as a moment, never restarted.
 *   6. A mock's Listening and Reading papers are kept inside that mock
 *      sitting, under its own identity (Codex round 3, R2B-03): a paper
 *      opened on its own mid-mock never touches them, a new mock never picks
 *      up an older sitting's answers, and resuming restores only that
 *      sitting's papers, answers and deadlines included.
 *   7. The Speaking interview taken off screen by an account change is a
 *      suspension, not a cancellation (Codex round 3, R2B-02): the sitting
 *      goes back to its Speaking brief for its own student, during the
 *      interview and during grading alike, while a deliberate cancel still
 *      skips Speaking.
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
const { DEVICE_ID_KEY, LEGACY_ADOPTION_KEY, LEGACY_MIGRATION_OWNER_KEY } = await import(
  '../src/lib/learning/contracts/sync.ts'
);

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
     resumed pre-build sitting has none) is not treated as foreign: the
     adoption rule only ever puts one under the anonymous device owner's
     key, so whoever can read it there is that owner. */
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

/* R2-01 (second Codex round, 23 September 2026). The test that stood here
   asserted that an unowned sitting DOES go to the account the device's
   history stamp names. That was the defect, not the rule: the stamp records
   whose HISTORY the device migrated, possibly weeks earlier, and says
   nothing about who started the sitting lying on the device now. The case
   Codex named, exactly: the stamp names A, the unfinished sitting under the
   old device-wide key was started by B, and A signs in. */

/** B's sitting, left under the old device-wide key by a build that had no
    owners. SYNTHETIC. */
const B_LEGACY_SESSION = JSON.stringify({
  version: 1,
  testId: 'reading-full-006-drill-p2',
  startedAt: 1_790_137_878_021,
  endsAt: 1_790_139_078_021,
  answers: { q14: 'iv', q15: 'B-only-SYNTHETIC' },
});

test("a history stamp naming A does NOT hand A the unfinished sitting B started (Codex R2-01)", () => {
  freshBrowser({
    [session.TEST_SESSION_KEY]: B_LEGACY_SESSION,
    [LEGACY_MIGRATION_OWNER_KEY]: JSON.stringify({ version: 1, ownerKey: NS_A, at: '2026-09-01T09:00:00.000Z' }),
  });

  /* A is the very first to read the store after the update. */
  setCurrentOwner(A);
  assert.equal(session.activeSession(), null, "A inherited B's unfinished sitting through the history stamp");
  assert.equal(session.loadSession(DRILL.id), null, "A's drill restored B's answers");
  assert.equal(storage.data.has(sessionKey(NS_A)), false, "B's sitting was copied into A's key");

  /* A cannot submit B's answers either: A's own sitting of the same drill
     starts empty, and what A saves is A's alone. */
  const fresh = session.startSession(DRILL);
  assert.deepEqual(fresh.answers, {});
  assert.equal(session.saveAnswers(A_ANSWER, NS_A), true);
  const aStored = JSON.parse(storage.data.get(sessionKey(NS_A))!);
  assert.deepEqual(aStored.answers, A_ANSWER);
  assert.equal(JSON.stringify(aStored).includes('B-only-SYNTHETIC'), false);

  /* No other account gets it either. */
  setCurrentOwner(B);
  assert.equal(session.activeSession(), null, 'a signed-in account received the unowned sitting');

  /* It was parked with the device the moment it was first read, whoever was
     signed in then, and that is where it stays. */
  assert.equal(storage.data.get(sessionKey(NS_ANON)), B_LEGACY_SESSION);
  setCurrentOwner(null);
  assert.deepEqual(session.activeSession()?.answers, { q14: 'iv', q15: 'B-only-SYNTHETIC' });

  /* Nothing was deleted or changed: the old key and the stamp are as they were. */
  assert.equal(storage.data.get(session.TEST_SESSION_KEY), B_LEGACY_SESSION);
  assert.equal(JSON.parse(storage.data.get(LEGACY_MIGRATION_OWNER_KEY)!).ownerKey, NS_A);
});

test('the parking rule reads its own note, never the history stamp', () => {
  freshBrowser({
    [session.TEST_SESSION_KEY]: B_LEGACY_SESSION,
    [LEGACY_MIGRATION_OWNER_KEY]: JSON.stringify({ version: 1, ownerKey: NS_A, at: '2026-09-01T09:00:00.000Z' }),
  });
  setCurrentOwner(A);
  session.activeSession();
  const note = JSON.parse(storage.data.get(session.UNOWNED_ADOPTION_KEY)!);
  assert.deepEqual(note.adopted, { [NS_ANON]: [session.TEST_SESSION_KEY] });
  /* The history stores' own adoption file was not touched for this key. */
  assert.equal(storage.data.get(LEGACY_ADOPTION_KEY) ?? null, null);
});

test("an unowned sitting is parked once: after the device's student submits it, it does not come back", () => {
  freshBrowser({ [session.TEST_SESSION_KEY]: LEGACY_SESSION });
  setCurrentOwner(null);
  assert.deepEqual(session.activeSession()?.answers, { q14: 'i' });
  session.clearSession(NS_ANON); // the device's student submits it
  assert.equal(session.activeSession(), null, 'the old sitting was copied back after it was submitted');
  assert.equal(session.loadSession(DRILL.id), null);
  assert.equal(storage.data.get(session.TEST_SESSION_KEY), LEGACY_SESSION, 'the old key was changed');
});

test("an unowned sitting never overwrites the device owner's own newer sitting", () => {
  const anonOwn = JSON.stringify({
    version: 1,
    testId: OTHER_DRILL.id,
    startedAt: 1_790_200_000_000,
    endsAt: 1_790_201_200_000,
    answers: { q1: 'SYNTHETIC-anon-own' },
    owner: NS_ANON,
  });
  freshBrowser({ [session.TEST_SESSION_KEY]: LEGACY_SESSION, [sessionKey(NS_ANON)]: anonOwn });
  setCurrentOwner(null);
  assert.equal(session.activeSession()?.testId, OTHER_DRILL.id);
  assert.equal(storage.data.get(sessionKey(NS_ANON)), anonOwn);
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

/* ------------------------------------------------------------------ */
/* 6. The old mock history: a stamp changes nothing, a claim does       */
/* ------------------------------------------------------------------ */

const LEGACY_MOCK = JSON.stringify([mockAttempt('mock-2026-09-01-1', 'SYNTHETIC essay by B, left on this device')]);

test('a history stamp naming A does not hand A the old mock history either (Codex R2-01)', () => {
  freshBrowser({
    [mock.MOCK_STORE_KEY]: LEGACY_MOCK,
    [LEGACY_MIGRATION_OWNER_KEY]: JSON.stringify({ version: 1, ownerKey: NS_A, at: '2026-09-01T09:00:00.000Z' }),
  });
  setCurrentOwner(A);
  assert.deepEqual(mock.listMockAttempts(), [], "A inherited the device's old mock history through the stamp");
  assert.equal(storage.data.has(mockKey(NS_A)), false);
  setCurrentOwner(null);
  assert.equal(mock.listMockAttempts()[0]?.essays[0]?.text, 'SYNTHETIC essay by B, left on this device');
});

test('the explicit claim is the one way the old mock history reaches an account, and it is not copied back', () => {
  /* store-owner.ts lists the mock history among the stores the explicit
     "work saved on this device" claim moves (LEGACY_STORE_KEYS). */
  assert.ok(storeOwner.LEGACY_STORE_KEYS.includes(mock.MOCK_STORE_KEY));

  freshBrowser({
    [mock.MOCK_STORE_KEY]: LEGACY_MOCK,
    [LEGACY_MIGRATION_OWNER_KEY]: JSON.stringify({ version: 1, ownerKey: NS_A, at: '2026-09-01T09:00:00.000Z' }),
  });
  setCurrentOwner(A);
  assert.deepEqual(mock.listMockAttempts(), []);

  /* A accepts the claim on purpose. */
  const outcome = storeOwner.claimLegacyStores(storage, ANON, A);
  assert.ok(outcome.moved.includes(mock.MOCK_STORE_KEY), JSON.stringify(outcome));
  assert.equal(mock.listMockAttempts()[0]?.essays[0]?.text, 'SYNTHETIC essay by B, left on this device');

  /* The device does not quietly get a second copy of what was claimed. */
  setCurrentOwner(null);
  assert.deepEqual(mock.listMockAttempts(), [], 'the claimed mock history was copied back to the device');
  assert.equal(storage.data.get(mock.MOCK_STORE_KEY), LEGACY_MOCK, 'the old key was changed');
});

test('a claim made before the mock page was ever opened is not copied back either', () => {
  /* No stamp, and nothing has read the mock history since the update: the
     claim itself takes the old copy into the device owner's key (through
     store-owner.ts's own rule) and moves it on. The parking rule must see
     that and leave the device's key empty afterwards. */
  freshBrowser({ [mock.MOCK_STORE_KEY]: LEGACY_MOCK });
  setCurrentOwner(A);
  const outcome = storeOwner.claimLegacyStores(storage, ANON, A);
  assert.ok(outcome.moved.includes(mock.MOCK_STORE_KEY), JSON.stringify(outcome));

  setCurrentOwner(null);
  assert.deepEqual(mock.listMockAttempts(), [], 'the claimed mock history came back to the device');
  setCurrentOwner(A);
  assert.equal(mock.listMockAttempts().length, 1);
});

/* ------------------------------------------------------------------ */
/* 7. The unfinished mock day, written down per student (Codex R2-03)   */
/* ------------------------------------------------------------------ */

function activeKey(namespace: string): string {
  return `${mock.ACTIVE_MOCK_KEY}::${namespace}`;
}

type ActiveMock = import('../src/lib/tests/mock.ts').ActiveMock;

const MOCK_STARTED = '2026-09-23T09:00:00.000Z';
const LISTENING_LEG = { raw: 31, total: 40, band: 7, bandLabel: '7', secondsUsed: 1_800 };
/** A fixed Writing deadline, so "never restarted" is an exact comparison. */
const WRITING_DEADLINE = 1_790_150_000_000;
/** The identity of the SYNTHETIC mock sitting most tests below use. */
const SITTING_1 = 'SYNTHETIC-sitting-1';
/** The two SYNTHETIC papers of that sitting, as the player hands them over. */
const LISTENING_PAPER = { id: 'listening-full-001', durationMinutes: 40 };
const READING_PAPER = { id: 'reading-full-001', durationMinutes: 60 };
const READING_LEG = { raw: 28, total: 40, band: 6.5, bandLabel: '6.5', secondsUsed: 3_500 };

/** A SYNTHETIC mock day part way through, for `owner`. */
function activeMock(owner: string, overrides: Partial<ActiveMock> = {}): ActiveMock {
  return {
    version: 1,
    owner,
    sittingId: SITTING_1,
    mockId: 'mock-2026-09-23-1',
    startedAt: MOCK_STARTED,
    stage: 'transition-reading',
    listeningTestId: 'listening-full-001',
    readingTestId: 'reading-full-001',
    task1PromptId: 'SYNTHETIC-task1',
    task2PromptId: 'SYNTHETIC-task2',
    listening: LISTENING_LEG,
    reading: null,
    essay1: '',
    essay2: '',
    writingEndsAt: null,
    speakingBand: null,
    speakingCriteria: null,
    speakingSkipped: false,
    legSittings: {},
    savedAt: 0,
    ...overrides,
  };
}

function withoutSavedAt(value: ActiveMock | null): Omit<ActiveMock, 'savedAt'> | null {
  if (!value) return null;
  const { savedAt: _ignored, ...rest } = value;
  return rest;
}

test("a mock day is written down under its own student and read back whole", () => {
  freshBrowser();
  setCurrentOwner(A);
  const mine = activeMock(NS_A, {
    stage: 'writing',
    reading: { raw: 28, total: 40, band: 6.5, bandLabel: '6.5', secondsUsed: 3_500 },
    essay1: 'SYNTHETIC Task 1 draft by A',
    essay2: 'SYNTHETIC Task 2 draft by A',
    writingEndsAt: WRITING_DEADLINE,
  });
  assert.equal(mock.saveActiveMock(mine), true);
  assert.ok(storage.data.has(activeKey(NS_A)));
  assert.deepEqual(withoutSavedAt(mock.loadActiveMock()), withoutSavedAt(mine));
  /* Born owner-scoped: nothing was written under a device-wide key. */
  assert.equal(storage.data.has(mock.ACTIVE_MOCK_KEY), false);
});

test("B never sees A's unfinished mock, B's fresh mock is kept apart, and A resumes with the leg still done", () => {
  freshBrowser();

  /* A starts, finishes Listening (recorded as an ordinary full paper, the
     way TestPlayer records a mock leg), and is on the beat before Reading. */
  setCurrentOwner(A);
  progress.recordTestAttempt('listening-full-001', {
    at: '2026-09-23T09:31:00.000Z',
    raw: 31,
    total: 40,
    band: 7,
    bandLabel: '7',
    secondsUsed: 1_800,
    kind: 'full',
    skill: 'listening',
  });
  assert.equal(mock.saveActiveMock(activeMock(NS_A)), true);
  const aStored = storage.data.get(activeKey(NS_A));

  /* A signs out; B signs in on the same browser. */
  setCurrentOwner(null);
  assert.equal(mock.loadActiveMock(), null, "the signed-out device was offered A's mock");
  setCurrentOwner(B);
  assert.equal(mock.loadActiveMock(), null, "B was offered A's unfinished mock");
  /* B's own history has no Listening leg from A's sitting either. */
  assert.deepEqual(progress.getAttempts('listening-full-001'), [], "A's finished leg counted for B");

  /* B starts a fresh mock of their own. */
  const bFresh = activeMock(NS_B, {
    mockId: 'mock-2026-09-23-1',
    startedAt: '2026-09-23T10:00:00.000Z',
    stage: 'listening',
    listening: null,
  });
  assert.equal(mock.saveActiveMock(bFresh), true);
  assert.deepEqual(withoutSavedAt(mock.loadActiveMock()), withoutSavedAt(bFresh));
  assert.equal(storage.data.get(activeKey(NS_A)), aStored, "B's fresh mock changed A's saved sitting");

  /* B finishes and tidies up: only B's copy goes. */
  mock.clearActiveMock(NS_B);
  assert.equal(storage.data.has(activeKey(NS_B)), false);
  assert.equal(storage.data.get(activeKey(NS_A)), aStored, "B's tidy-up removed A's sitting");

  /* A signs back in and picks the sitting up where it stopped. */
  setCurrentOwner(null);
  setCurrentOwner(A);
  const back = mock.loadActiveMock();
  assert.equal(back?.owner, NS_A);
  assert.equal(back?.stage, 'transition-reading');
  assert.deepEqual(back?.listening, LISTENING_LEG, "A's finished Listening leg did not survive B's visit");
  const resumed = mock.reconcileActiveMock(back!);
  assert.equal(resumed.stage, 'transition-reading');
  assert.deepEqual(resumed.listening, LISTENING_LEG);
});

test('a mock day that outlived its student writes nothing and clears nothing', () => {
  freshBrowser();
  setCurrentOwner(A);
  mock.saveActiveMock(activeMock(NS_A));
  const aStored = storage.data.get(activeKey(NS_A));

  setCurrentOwner(B);
  assert.equal(
    mock.saveActiveMock(activeMock(NS_A, { stage: 'writing', essay1: 'typed after B signed in' })),
    false,
    "A's open mock saved after B signed in",
  );
  assert.equal(storage.data.has(activeKey(NS_B)), false, "A's mock was written into B's key");
  mock.clearActiveMock(NS_A);
  assert.equal(storage.data.get(activeKey(NS_A)), aStored, "a stale tidy-up from A's tab removed A's sitting");

  setCurrentOwner(null);
  assert.equal(mock.saveActiveMock(activeMock(NS_A)), false);
  assert.equal(storage.data.has(activeKey(NS_ANON)), false);
});

test('a written-down mock stamped with somebody else is never handed back, even from this key', () => {
  freshBrowser({ [activeKey(NS_A)]: JSON.stringify(activeMock(NS_B)) });
  setCurrentOwner(A);
  assert.equal(mock.loadActiveMock(), null);
});

test('a device-wide active mock (no build ever wrote one) is adopted by nobody', () => {
  freshBrowser({ [mock.ACTIVE_MOCK_KEY]: JSON.stringify(activeMock(NS_A)) });
  setCurrentOwner(A);
  assert.equal(mock.loadActiveMock(), null);
  setCurrentOwner(null);
  assert.equal(mock.loadActiveMock(), null);
  assert.equal(storage.data.has(activeKey(NS_A)), false);
  assert.equal(storage.data.has(activeKey(NS_ANON)), false);
});

test('the start screen and the results are never written down or offered', () => {
  freshBrowser();
  setCurrentOwner(A);
  assert.equal(mock.saveActiveMock(activeMock(NS_A, { stage: 'start' })), false);
  assert.equal(mock.saveActiveMock(activeMock(NS_A, { stage: 'results' })), false);
  assert.equal(storage.data.has(activeKey(NS_A)), false);

  storage.data.set(activeKey(NS_A), JSON.stringify(activeMock(NS_A, { stage: 'results' })));
  assert.equal(mock.loadActiveMock(), null);
});

test('the Writing deadline is stored as a moment and is never restarted', () => {
  freshBrowser();
  setCurrentOwner(A);
  mock.saveActiveMock(activeMock(NS_A, { stage: 'writing', writingEndsAt: WRITING_DEADLINE, essay1: 'SYNTHETIC draft' }));
  const back = mock.loadActiveMock()!;
  assert.equal(back.writingEndsAt, WRITING_DEADLINE);
  assert.equal(mock.reconcileActiveMock(back).writingEndsAt, WRITING_DEADLINE);
  assert.equal(mock.reconcileActiveMock(back).stage, 'writing');

  /* Ten minutes before the deadline, ten minutes are left; after it, none.
     Before Writing starts (no deadline) the whole hour is. */
  assert.equal(mock.writingSecondsLeftAt(WRITING_DEADLINE, WRITING_DEADLINE - 600_000, 3_600), 600);
  assert.equal(mock.writingSecondsLeftAt(WRITING_DEADLINE, WRITING_DEADLINE + 5_000, 3_600), 0);
  assert.equal(mock.writingSecondsLeftAt(null, WRITING_DEADLINE, 3_600), 3_600);
});

test('a leg handed in inside THIS sitting counts as done when it is picked up; the same paper sat elsewhere does not (R2B-03)', () => {
  freshBrowser();
  setCurrentOwner(A);
  assert.equal(mock.saveActiveMock(activeMock(NS_A, { stage: 'listening', listening: null })), true);
  const ref = { owner: NS_A, sittingId: SITTING_1 };

  /* The same paper handed in as a full paper AFTER this mock began, but on
     its own (during a pause): in the history, and still not this sitting's
     leg. The old rule matched the history by paper id and counted it. */
  progress.recordTestAttempt('listening-full-001', {
    at: '2026-09-23T09:20:00.000Z',
    raw: 12,
    total: 40,
    band: 4.5,
    bandLabel: '4.5',
    secondsUsed: 1_500,
    kind: 'full',
    skill: 'listening',
  });
  assert.equal(mock.reconcileActiveMock(mock.loadActiveMock()!).stage, 'listening');

  /* Handed in inside this sitting, then the page went away before "Back to
     results": the leg is done, with ITS result, and the sitting moves on. */
  const player = mock.mockLegSitting(ref, LISTENING_PAPER);
  player.start();
  player.save({ q1: 'SYNTHETIC-A' }, NS_A);
  player.finish(NS_A, LISTENING_LEG);
  const picked = mock.reconcileActiveMock(mock.loadActiveMock()!);
  assert.equal(picked.stage, 'transition-reading');
  assert.deepEqual(picked.listening, LISTENING_LEG);
  /* Handed in: nothing of it is offered to a player as still running, and
     its answers went, exactly as a submitted standalone paper's do. */
  assert.equal(player.load(), null);
  assert.deepEqual(mock.loadActiveMock()!.legSittings[LISTENING_PAPER.id]?.answers, {});

  /* The same for Reading. */
  mock.saveActiveMock({ ...mock.loadActiveMock()!, stage: 'reading', listening: LISTENING_LEG });
  assert.equal(mock.reconcileActiveMock(mock.loadActiveMock()!).stage, 'reading');
  const reading = mock.mockLegSitting(ref, READING_PAPER);
  reading.start();
  reading.finish(NS_A, READING_LEG);
  const next = mock.reconcileActiveMock(mock.loadActiveMock()!);
  assert.equal(next.stage, 'transition-writing');
  assert.deepEqual(next.reading, READING_LEG);
});

test('a mock picked up in the live interview lands on its brief, never back inside a paid session', () => {
  const inInterview = activeMock(NS_A, { stage: 'speaking' });
  assert.equal(mock.reconcileActiveMock(inInterview).stage, 'speaking-brief');
});

test('a damaged field in a written-down mock does not cost the papers already finished', () => {
  const damaged = { ...activeMock(NS_A), essay1: 42, listening: LISTENING_LEG, writingEndsAt: 'soon' };
  freshBrowser({ [activeKey(NS_A)]: JSON.stringify(damaged) });
  setCurrentOwner(A);
  const back = mock.loadActiveMock();
  assert.equal(back?.essay1, '');
  assert.equal(back?.writingEndsAt, null);
  assert.deepEqual(back?.listening, LISTENING_LEG);
});

/* ------------------------------------------------------------------ */
/* 8. One yes moves everything: the claim carries the unfinished        */
/*    sitting and the paused mock day, re-stamped for the account       */
/* ------------------------------------------------------------------ */

/* The lead's decision of 23 September 2026. Both stores carry their owner
   INSIDE the value, so the claim re-stamps them for the account on the way;
   a plain copy would be refused by the account's own player as another
   student's. The account's own sitting and paused mock always win. These
   drive store-owner.ts's claim directly; tests/account-isolation.test.ts
   drives the same thing through the real offer, claim and decline. */

const STAMPED = [session.TEST_SESSION_KEY, mock.ACTIVE_MOCK_KEY];

/** Signed out on the device: A's drill part way through, with an answer,
    and a mock day paused on the Reading paper with Listening done. Returns
    the two stored values exactly as the device holds them. SYNTHETIC. */
function leaveUnfinishedWorkOnTheDevice(): { sitting: string; paused: string } {
  setCurrentOwner(null);
  session.startSession(DRILL);
  assert.equal(session.saveAnswers(A_ANSWER, NS_ANON), true);
  assert.equal(mock.saveActiveMock(activeMock(NS_ANON, { stage: 'reading' })), true);
  return { sitting: storage.data.get(sessionKey(NS_ANON))!, paused: storage.data.get(activeKey(NS_ANON))! };
}

test('the claim names both stores, and keeps them off the history stores\' list (R2-01)', () => {
  assert.deepEqual([...storeOwner.OWNER_STAMPED_STORE_KEYS].sort(), [...STAMPED].sort());
  /* That list resolves through the device's HISTORY stamp, which must never
     decide who receives an unfinished sitting. */
  for (const base of STAMPED) assert.equal(storeOwner.LEGACY_STORE_KEYS.includes(base), false, base);
});

test("the claim moves the device's unfinished sitting and paused mock into A, re-stamped so A's player accepts them", () => {
  freshBrowser();
  const device = leaveUnfinishedWorkOnTheDevice();

  /* Signing in on its own hands over neither. */
  setCurrentOwner(A);
  assert.equal(session.activeSession(), null);
  assert.equal(mock.loadActiveMock(), null);
  assert.deepEqual(storeOwner.claimableOwnerStampedStores(storage, ANON, A).sort(), [...STAMPED].sort());

  const outcome = storeOwner.claimLegacyStores(storage, ANON, A);
  for (const base of STAMPED) assert.ok(outcome.moved.includes(base), JSON.stringify(outcome));

  /* Only the owner changed: the answers, the deadline, the stage, the leg
     already done and everything else are exactly what the device held. */
  const aSitting = JSON.parse(storage.data.get(sessionKey(NS_A))!);
  assert.equal(aSitting.owner, NS_A);
  assert.deepEqual({ ...aSitting, owner: NS_ANON }, JSON.parse(device.sitting));
  const aPaused = JSON.parse(storage.data.get(activeKey(NS_A))!);
  assert.equal(aPaused.owner, NS_A);
  assert.deepEqual({ ...aPaused, owner: NS_ANON }, JSON.parse(device.paused));

  /* A's own player accepts both, and can carry on saving into them. */
  const resumed = session.loadSession(DRILL.id);
  assert.equal(resumed?.owner, NS_A);
  assert.deepEqual(resumed?.answers, A_ANSWER);
  assert.equal(session.saveAnswers({ q14: 'ii' }, NS_A), true, "A's player could not save into the claimed sitting");
  const paused = mock.loadActiveMock();
  assert.equal(paused?.owner, NS_A);
  assert.equal(paused?.stage, 'reading');
  assert.deepEqual(paused?.listening, LISTENING_LEG);
  assert.equal(mock.saveActiveMock({ ...paused!, essay1: 'SYNTHETIC draft by A' }), true);

  /* Moved, not copied: signed out, the device no longer offers them. */
  setCurrentOwner(null);
  assert.equal(session.activeSession(), null, 'the claimed sitting was also left on the device');
  assert.equal(mock.loadActiveMock(), null, 'the claimed mock was also left on the device');
});

test('B never receives the sitting or the paused mock, before or after A claims them', () => {
  freshBrowser();
  leaveUnfinishedWorkOnTheDevice();

  /* B signs in first: nothing arrives by signing in. */
  setCurrentOwner(B);
  assert.equal(session.activeSession(), null);
  assert.equal(mock.loadActiveMock(), null);

  setCurrentOwner(A);
  storeOwner.claimLegacyStores(storage, ANON, A);
  const aSitting = storage.data.get(sessionKey(NS_A));
  const aPaused = storage.data.get(activeKey(NS_A));

  setCurrentOwner(B);
  assert.equal(session.activeSession(), null, "B was handed the sitting A claimed");
  assert.equal(session.loadSession(DRILL.id), null);
  assert.equal(mock.loadActiveMock(), null, "B was handed the mock A claimed");
  assert.deepEqual(storeOwner.claimableOwnerStampedStores(storage, ANON, B), [], 'B would be offered what A claimed');

  /* Even a claim run for B moves nothing of A's. */
  const outcome = storeOwner.claimLegacyStores(storage, ANON, B);
  for (const base of STAMPED) assert.equal(outcome.moved.includes(base), false, base);
  assert.equal(storage.data.has(sessionKey(NS_B)), false);
  assert.equal(storage.data.has(activeKey(NS_B)), false);
  assert.equal(storage.data.get(sessionKey(NS_A)), aSitting);
  assert.equal(storage.data.get(activeKey(NS_A)), aPaused);
});

test("the account's own sitting and paused mock win, and the device's are left exactly where they are", () => {
  freshBrowser();
  const device = leaveUnfinishedWorkOnTheDevice();

  setCurrentOwner(A);
  session.startSession(OTHER_DRILL);
  session.saveAnswers({ q1: 'SYNTHETIC-A-own' }, NS_A);
  mock.saveActiveMock(activeMock(NS_A, { stage: 'writing', essay1: 'SYNTHETIC own draft by A', writingEndsAt: WRITING_DEADLINE }));
  const aSitting = storage.data.get(sessionKey(NS_A));
  const aPaused = storage.data.get(activeKey(NS_A));

  /* Not offered, because saying yes would not bring them. */
  assert.deepEqual(storeOwner.claimableOwnerStampedStores(storage, ANON, A), []);

  const outcome = storeOwner.claimLegacyStores(storage, ANON, A);
  for (const base of STAMPED) {
    assert.ok(outcome.keptSeparate.includes(base), JSON.stringify(outcome));
    assert.equal(outcome.moved.includes(base), false, base);
  }
  assert.equal(storage.data.get(sessionKey(NS_A)), aSitting, "A's own sitting was overwritten");
  assert.equal(storage.data.get(activeKey(NS_A)), aPaused, "A's own paused mock was overwritten");
  assert.equal(session.activeSession()?.testId, OTHER_DRILL.id);
  assert.equal(mock.loadActiveMock()?.essay1, 'SYNTHETIC own draft by A');

  /* The device's are untouched, and the device's student can still pick
     them up signed out. */
  assert.equal(storage.data.get(sessionKey(NS_ANON)), device.sitting);
  assert.equal(storage.data.get(activeKey(NS_ANON)), device.paused);
  setCurrentOwner(null);
  assert.deepEqual(session.loadSession(DRILL.id)?.answers, A_ANSWER);
  assert.equal(mock.loadActiveMock()?.owner, NS_ANON);
});

test('claiming twice is harmless: the second claim moves nothing and changes nothing', () => {
  freshBrowser();
  leaveUnfinishedWorkOnTheDevice();
  setCurrentOwner(A);
  storeOwner.claimLegacyStores(storage, ANON, A);
  const aSitting = storage.data.get(sessionKey(NS_A));
  const aPaused = storage.data.get(activeKey(NS_A));

  const again = storeOwner.claimLegacyStores(storage, ANON, A);
  for (const base of STAMPED) {
    assert.equal(again.moved.includes(base), false, base);
    assert.equal(again.keptSeparate.includes(base), false, base);
    assert.equal(again.leftInPlace.includes(base), false, base);
  }
  assert.equal(storage.data.get(sessionKey(NS_A)), aSitting);
  assert.equal(storage.data.get(activeKey(NS_A)), aPaused);
  assert.deepEqual(session.loadSession(DRILL.id)?.answers, A_ANSWER);
});

test('a sitting an older build left under the device-wide key is claimed from the device, and never parked again', () => {
  /* Nothing has read the sitting since the update, and the history stamp
     names B: neither matters. The claim parks it with the device by
     test-session.ts's own rule and hands it to the account that said yes. */
  freshBrowser({
    [session.TEST_SESSION_KEY]: LEGACY_SESSION,
    [LEGACY_MIGRATION_OWNER_KEY]: JSON.stringify({ version: 1, ownerKey: NS_B, at: '2026-09-01T09:00:00.000Z' }),
  });
  setCurrentOwner(A);
  assert.deepEqual(storeOwner.claimableOwnerStampedStores(storage, ANON, A), [session.TEST_SESSION_KEY]);

  const outcome = storeOwner.claimLegacyStores(storage, ANON, A);
  assert.ok(outcome.moved.includes(session.TEST_SESSION_KEY), JSON.stringify(outcome));
  const resumed = session.loadSession(DRILL.id);
  assert.equal(resumed?.owner, NS_A, 'the unowned sitting was not stamped for the account that claimed it');
  assert.deepEqual(resumed?.answers, { q14: 'i' });

  setCurrentOwner(null);
  assert.equal(session.activeSession(), null, 'the claimed old sitting was parked with the device a second time');
  setCurrentOwner(B);
  assert.equal(session.activeSession(), null, 'the account the history stamp names received it');
  assert.equal(storage.data.get(session.TEST_SESSION_KEY), LEGACY_SESSION, 'the old device-wide key was changed');
});

test("a value on the device stamped for somebody else, or with nothing to pick up, is not handed over", () => {
  freshBrowser({
    [sessionKey(NS_ANON)]: JSON.stringify({ ...JSON.parse(LEGACY_SESSION), owner: NS_B }),
    [activeKey(NS_ANON)]: JSON.stringify(activeMock(NS_ANON, { stage: 'results' })),
  });
  const before = new Map(storage.data);
  setCurrentOwner(A);
  assert.deepEqual(storeOwner.claimableOwnerStampedStores(storage, ANON, A), []);
  const outcome = storeOwner.claimLegacyStores(storage, ANON, A);
  for (const base of STAMPED) assert.ok(outcome.leftInPlace.includes(base), JSON.stringify(outcome));
  assert.equal(storage.data.has(sessionKey(NS_A)), false);
  assert.equal(storage.data.has(activeKey(NS_A)), false);
  assert.equal(storage.data.get(sessionKey(NS_ANON)), before.get(sessionKey(NS_ANON)));
  assert.equal(storage.data.get(activeKey(NS_ANON)), before.get(activeKey(NS_ANON)));
});

test('the two re-stamp rules change the owner and nothing else, and refuse what is not theirs to hand over', () => {
  const sitting = JSON.stringify({ ...JSON.parse(LEGACY_SESSION), owner: NS_ANON, extra: 'SYNTHETIC-kept' });
  assert.deepEqual(JSON.parse(session.restampSession(sitting, NS_ANON, NS_A)!), { ...JSON.parse(sitting), owner: NS_A });
  /* An older build's sitting has no owner in it and is the key owner's. */
  assert.equal(JSON.parse(session.restampSession(LEGACY_SESSION, NS_ANON, NS_A)!).owner, NS_A);
  assert.equal(session.restampSession(sitting, NS_B, NS_A), null);
  assert.equal(session.restampSession('not json', NS_ANON, NS_A), null);
  assert.equal(session.restampSession(JSON.stringify({ version: 2 }), NS_ANON, NS_A), null);

  const paused = JSON.stringify({ ...activeMock(NS_ANON, { stage: 'writing', writingEndsAt: WRITING_DEADLINE }), extra: 7 });
  assert.deepEqual(JSON.parse(mock.restampActiveMock(paused, NS_ANON, NS_A)!), { ...JSON.parse(paused), owner: NS_A });
  assert.equal(mock.restampActiveMock(paused, NS_B, NS_A), null);
  assert.equal(mock.restampActiveMock(JSON.stringify(activeMock(NS_ANON, { stage: 'start' })), NS_ANON, NS_A), null);
  assert.equal(mock.restampActiveMock(JSON.stringify(activeMock(NS_ANON, { stage: 'results' })), NS_ANON, NS_A), null);
  assert.equal(mock.restampActiveMock('{', NS_ANON, NS_A), null);
});

/* ------------------------------------------------------------------ */
/* 9. A mock's papers are kept inside that mock sitting (Codex R2B-03)  */
/* ------------------------------------------------------------------ */

/* The third Codex inspection found the mock's Listening and Reading papers
   still sharing the ONE per-student slot a paper opened on its own uses,
   found by paper id alone. A standalone paper started mid-mock overwrote
   the mock's answers and deadline, and a new mock on a paper that happened
   to be in the slot picked up that older sitting. These drive the exact
   functions the test player calls for a mock leg (mockLegSitting) and for a
   paper on its own (standaloneSitting). */

/** A SYNTHETIC mock sitting just begun by `owner`, written down the way
    MockExam's beginMock writes it: a fresh identity and no papers yet. */
function beginSitting(owner: string, sittingId: string, overrides: Partial<ActiveMock> = {}): ActiveMock {
  const fresh = activeMock(owner, { sittingId, stage: 'listening', listening: null, ...overrides });
  assert.equal(mock.saveActiveMock(fresh), true);
  return fresh;
}

const A_LISTENING_ANSWERS = { q1: 'SYNTHETIC-A-library', q2: 'SYNTHETIC-A-tuesday' };

test("a standalone paper started mid-mock never touches the mock's papers, and resuming brings them back whole", () => {
  freshBrowser();
  setCurrentOwner(A);
  beginSitting(NS_A, SITTING_1);
  const ref = { owner: NS_A, sittingId: SITTING_1 };

  /* A is part way through the mock's Listening paper. */
  const leg = mock.mockLegSitting(ref, LISTENING_PAPER);
  const started = leg.start();
  assert.equal(started.owner, NS_A);
  assert.equal(leg.save(A_LISTENING_ANSWERS, NS_A), true);
  const deadline = started.endsAt;
  /* Kept inside the sitting, not in the standalone slot. */
  assert.equal(session.activeSession(), null, 'the mock leg went into the standalone slot');
  assert.equal(storage.data.has(sessionKey(NS_A)), false);

  /* A leaves the mock and opens a Reading drill on its own, answers it and
     hands it in: the standalone slot is used, and only it. */
  const before = JSON.stringify(mock.loadActiveMock()!.legSittings);
  const drill = session.standaloneSitting(DRILL);
  drill.start();
  assert.equal(drill.save(A_ANSWER, NS_A), true);
  assert.equal(session.activeSession()?.testId, DRILL.id);
  assert.equal(JSON.stringify(mock.loadActiveMock()!.legSittings), before, "the drill changed the mock's papers");
  drill.finish(NS_A, READING_LEG);
  assert.equal(session.activeSession(), null);
  assert.equal(JSON.stringify(mock.loadActiveMock()!.legSittings), before, "submitting the drill changed the mock's papers");

  /* A opens yet another paper on its own, the mock's OWN Listening paper,
     and leaves it running: still the standalone slot, still nothing of the
     mock's. */
  session.standaloneSitting(LISTENING_PAPER as unknown as typeof DRILL).start();
  assert.equal(JSON.stringify(mock.loadActiveMock()!.legSittings), before);

  /* A goes back to the mock: it offers the same sitting, and the Listening
     player restores A's answers and the SAME deadline, not a fresh clock. */
  const held = mock.loadActiveMock()!;
  assert.equal(held.sittingId, SITTING_1);
  assert.equal(mock.reconcileActiveMock(held).stage, 'listening');
  const resumed = mock.mockLegSitting({ owner: held.owner, sittingId: held.sittingId }, LISTENING_PAPER).load();
  assert.deepEqual(resumed?.answers, A_LISTENING_ANSWERS, "the mock's Listening answers did not survive");
  assert.equal(resumed?.endsAt, deadline, "the mock's Listening deadline was restarted");
  assert.equal(resumed?.owner, NS_A);
});

test('a new mock never restores an older sitting, even on the same papers and the same mock id', () => {
  freshBrowser();
  setCurrentOwner(A);
  beginSitting(NS_A, SITTING_1);
  const oldRef = { owner: NS_A, sittingId: SITTING_1 };
  /* The older sitting's Listening began twenty minutes ago. */
  const oldStart = mock.startMockLeg(oldRef, LISTENING_PAPER, Date.now() - 20 * 60_000)!;
  assert.ok(oldStart);
  const old = mock.mockLegSitting(oldRef, LISTENING_PAPER);
  old.save(A_LISTENING_ANSWERS, NS_A);
  /* The same paper also left running on its own in the standalone slot. */
  const standalone = session.standaloneSitting(LISTENING_PAPER as unknown as typeof DRILL);
  standalone.start();
  standalone.save({ q1: 'SYNTHETIC-standalone' }, NS_A);

  /* A starts a fresh mock the same day. Nothing was recorded in between, so
     the mock id counts to the same number; the sitting id does not. */
  const fresh = beginSitting(NS_A, 'SYNTHETIC-sitting-2', { startedAt: '2026-09-23T11:00:00.000Z' });
  assert.equal(fresh.mockId, 'mock-2026-09-23-1');
  const now = mock.loadActiveMock()!;
  assert.equal(now.sittingId, 'SYNTHETIC-sitting-2');
  assert.deepEqual(now.legSittings, {}, "the fresh mock was written down with the older sitting's papers");

  const player = mock.mockLegSitting({ owner: NS_A, sittingId: 'SYNTHETIC-sitting-2' }, LISTENING_PAPER);
  assert.equal(player.load(), null, 'the fresh mock restored an older sitting');
  const first = player.start();
  assert.deepEqual(first.answers, {});
  /* A clock of its own: the full forty minutes from now, not the twenty or
     so the older sitting had left. */
  assert.ok(first.endsAt - oldStart.endsAt >= 19 * 60_000, 'the fresh leg kept an older clock');
  assert.ok(first.endsAt - Date.now() > 39 * 60_000);

  /* A player still holding the OLD sitting's identity can neither read nor
     write the new one. */
  assert.equal(old.load(), null);
  assert.equal(old.save({ q1: 'SYNTHETIC-late-keystroke' }, NS_A), false);
  assert.deepEqual(mock.loadActiveMock()!.legSittings[LISTENING_PAPER.id]?.answers, {});

  /* The standalone sitting of the same paper is untouched, and was never
     offered to the mock. */
  assert.deepEqual(standalone.load()?.answers, { q1: 'SYNTHETIC-standalone' });
});

test('resuming restores only that sitting\'s papers, with their answers and deadlines, and never another student\'s', () => {
  freshBrowser();
  const A_READING_ANSWERS = { q14: 'SYNTHETIC-A-vi', q15: 'SYNTHETIC-A-true' };

  /* A: Listening handed in, Reading part way through. */
  setCurrentOwner(A);
  beginSitting(NS_A, SITTING_1);
  const refA = { owner: NS_A, sittingId: SITTING_1 };
  const aListening = mock.mockLegSitting(refA, LISTENING_PAPER);
  aListening.start();
  aListening.finish(NS_A, LISTENING_LEG);
  mock.saveActiveMock({ ...mock.loadActiveMock()!, stage: 'reading', listening: LISTENING_LEG });
  const aReading = mock.mockLegSitting(refA, READING_PAPER);
  const aReadingStart = aReading.start();
  aReading.save(A_READING_ANSWERS, NS_A);

  /* A signs out; B signs in and sits their own mock on the SAME papers. */
  setCurrentOwner(B);
  assert.equal(aReading.load(), null, "B's browser reads A's Reading paper");
  assert.equal(aReading.save({ q14: 'SYNTHETIC-typed-after-B' }, NS_A), false);
  beginSitting(NS_B, 'SYNTHETIC-sitting-B', { stage: 'reading', listening: LISTENING_LEG });
  const refB = { owner: NS_B, sittingId: 'SYNTHETIC-sitting-B' };
  const bReading = mock.mockLegSitting(refB, READING_PAPER);
  assert.equal(bReading.load(), null, "B's mock picked up A's Reading paper");
  bReading.start();
  bReading.save({ q14: 'SYNTHETIC-B-ii' }, NS_B);
  /* A's identity on B's browser opens nothing, and B's opens nothing of A's. */
  assert.equal(mock.mockLegSitting({ owner: NS_A, sittingId: 'SYNTHETIC-sitting-B' }, READING_PAPER).load(), null);

  /* A signs back in and picks the sitting up. */
  setCurrentOwner(A);
  const held = mock.loadActiveMock()!;
  assert.equal(held.sittingId, SITTING_1);
  const back = mock.reconcileActiveMock(held);
  assert.equal(back.stage, 'reading');
  assert.deepEqual(back.listening, LISTENING_LEG);
  const resumed = mock.mockLegSitting({ owner: back.owner, sittingId: back.sittingId }, READING_PAPER).load();
  assert.deepEqual(resumed?.answers, A_READING_ANSWERS, "A's Reading answers did not come back");
  assert.equal(resumed?.endsAt, aReadingStart.endsAt, "A's Reading deadline moved");
  assert.equal(resumed?.startedAt, aReadingStart.startedAt);
  /* B's paper is not in A's sitting at all. */
  assert.equal(JSON.stringify(held.legSittings).includes('SYNTHETIC-B-ii'), false);
  assert.equal(mock.mockLegSitting(refB, READING_PAPER).load(), null, "A's browser reads B's Reading paper");
});

test('a paper that is not one of the sitting\'s two, or already handed in, is never started over it', () => {
  freshBrowser();
  setCurrentOwner(A);
  beginSitting(NS_A, SITTING_1);
  const ref = { owner: NS_A, sittingId: SITTING_1 };
  assert.equal(mock.startMockLeg(ref, { id: 'listening-full-009', durationMinutes: 40 }), null);
  assert.equal(mock.startMockLeg(ref, LISTENING_PAPER) !== null, true);
  assert.equal(mock.finishMockLeg(ref, LISTENING_PAPER.id, LISTENING_LEG), true);
  /* A second start of a handed-in paper would throw its result away. */
  assert.equal(mock.startMockLeg(ref, LISTENING_PAPER), null);
  assert.deepEqual(mock.mockLegResult(ref, LISTENING_PAPER.id), LISTENING_LEG);
});

test('the screen\'s own saves keep the papers the player wrote; a new sitting replaces them', () => {
  freshBrowser();
  setCurrentOwner(A);
  beginSitting(NS_A, SITTING_1);
  const ref = { owner: NS_A, sittingId: SITTING_1 };
  mock.mockLegSitting(ref, LISTENING_PAPER).start();
  mock.mockLegSitting(ref, LISTENING_PAPER).save(A_LISTENING_ANSWERS, NS_A);
  /* The screen's snapshot carries no papers at all, and saves an essay. */
  const { legSittings: _none, ...snapshot } = mock.loadActiveMock()!;
  assert.equal(mock.saveActiveMock({ ...snapshot, essay1: 'SYNTHETIC draft' }), true);
  assert.deepEqual(mock.loadActiveMock()!.legSittings[LISTENING_PAPER.id]?.answers, A_LISTENING_ANSWERS);
  assert.equal(mock.loadActiveMock()!.essay1, 'SYNTHETIC draft');
  /* A snapshot of a DIFFERENT sitting replaces the stored one whole. */
  assert.equal(mock.saveActiveMock({ ...snapshot, sittingId: 'SYNTHETIC-sitting-2' }), true);
  assert.deepEqual(mock.loadActiveMock()!.legSittings, {});
});

test('a sitting written down before sitting ids existed is named by its mock id and start, and keeps its papers', () => {
  const { sittingId: _gone, ...older } = activeMock(NS_A, { stage: 'listening', listening: null });
  freshBrowser({ [activeKey(NS_A)]: JSON.stringify(older) });
  setCurrentOwner(A);
  const held = mock.loadActiveMock()!;
  assert.equal(held.sittingId, `${older.mockId}@${older.startedAt}`);
  const player = mock.mockLegSitting({ owner: NS_A, sittingId: held.sittingId }, LISTENING_PAPER);
  player.start();
  assert.equal(player.save(A_LISTENING_ANSWERS, NS_A), true);
  assert.deepEqual(player.load()?.answers, A_LISTENING_ANSWERS);
});

test("the claim carries a paused mock's papers, answers and deadlines, and the account's player accepts them", () => {
  freshBrowser();
  setCurrentOwner(null);
  beginSitting(NS_ANON, SITTING_1);
  const device = mock.mockLegSitting({ owner: NS_ANON, sittingId: SITTING_1 }, LISTENING_PAPER);
  const deviceStart = device.start();
  device.save(A_LISTENING_ANSWERS, NS_ANON);

  setCurrentOwner(A);
  assert.deepEqual(storeOwner.claimableOwnerStampedStores(storage, ANON, A), [mock.ACTIVE_MOCK_KEY]);
  const outcome = storeOwner.claimLegacyStores(storage, ANON, A);
  assert.ok(outcome.moved.includes(mock.ACTIVE_MOCK_KEY), JSON.stringify(outcome));

  /* The papers carry no owner of their own: re-stamping the sitting is all
     the account's player needs. */
  const held = mock.loadActiveMock()!;
  assert.equal(held.owner, NS_A);
  assert.equal(held.sittingId, SITTING_1);
  const mine = mock.mockLegSitting({ owner: held.owner, sittingId: held.sittingId }, LISTENING_PAPER);
  const resumed = mine.load();
  assert.deepEqual(resumed?.answers, A_LISTENING_ANSWERS);
  assert.equal(resumed?.endsAt, deviceStart.endsAt);
  assert.equal(resumed?.owner, NS_A);
  assert.equal(mine.save({ ...A_LISTENING_ANSWERS, q3: 'SYNTHETIC-after-claim' }, NS_A), true);

  /* Moved with the sitting, not copied: the device offers none of it, and
     a player still holding the device's identity reads and writes nothing. */
  setCurrentOwner(null);
  assert.equal(mock.loadActiveMock(), null);
  assert.equal(device.load(), null);
  assert.equal(device.save({ q1: 'SYNTHETIC-late' }, NS_ANON), false);
});

/* ------------------------------------------------------------------ */
/* 10. Speaking taken off screen by an account change (Codex R2B-02)    */
/* ------------------------------------------------------------------ */

/* The examiner inside the mock reported ANY exit without a band as the
   student cancelling Speaking, including its unmount under the mock's
   stopped screen after an account change. The mock then skipped Speaking,
   went to its results and, when the student was back, recorded itself
   without Speaking and forgot the sitting. These drive the three decisions
   the examiner and the mock now make (src/lib/tests/mock.ts), with the real
   owner bindings of src/lib/store-owner.ts underneath. */

/** A SYNTHETIC grade, standing in for the speaking grader. No request is made. */
const SYNTHETIC_SPEAKING_GRADE = { overallBand: 6.5 };

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** A's sitting as it stands while the interview is running: every paper and
    both essays done, stage 'speaking', written down under A. */
function inTheInterview(): ActiveMock {
  const sitting = activeMock(NS_A, {
    stage: 'speaking',
    reading: READING_LEG,
    essay1: 'SYNTHETIC Task 1 by A',
    essay2: 'SYNTHETIC Task 2 by A',
    writingEndsAt: WRITING_DEADLINE,
  });
  assert.equal(mock.saveActiveMock(sitting), true);
  return sitting;
}

test('an account change during the interview is a suspension: the sitting goes back to the Speaking brief, never to results', () => {
  for (const next of [null, B] as const) {
    freshBrowser();
    setCurrentOwner(A);
    const sitting = inTheInterview();
    const stored = storage.data.get(activeKey(NS_A));
    /* The examiner opens for A. */
    const openedFor = storeOwner.bindToCurrentOwner();

    /* The account changes (a sign-out, or B signing in); the mock's stopped
       screen takes the examiner away, and its teardown decides. */
    setCurrentOwner(next);
    assert.equal(mock.examinerLeftScreen(openedFor), 'suspended');
    openedFor.cancel();
    const exit = mock.speakingExitFor('suspended', NS_A);
    assert.equal(exit, 'suspended');
    const after = mock.afterSpeakingExit(exit);
    assert.deepEqual(after, { stage: 'speaking-brief', speakingSkipped: false });

    /* Nothing is written while A is away, and nothing is cleared. */
    assert.equal(mock.saveActiveMock({ ...sitting, ...after }), false);
    assert.equal(storage.data.get(activeKey(NS_A)), stored, "A's sitting changed while A was away");
    assert.equal(mock.listMockAttempts().length, 0, 'a mock was recorded for the next student');

    /* A is back: the sitting is there, at the Speaking brief, with nothing
       skipped and nothing recorded. */
    setCurrentOwner(A);
    const held = mock.loadActiveMock();
    assert.ok(held, "A's sitting was forgotten");
    const resumed = mock.reconcileActiveMock(held!);
    assert.equal(resumed.stage, 'speaking-brief');
    assert.equal(resumed.speakingSkipped, false);
    assert.deepEqual(resumed.reading, READING_LEG);
    assert.equal(resumed.essay2, 'SYNTHETIC Task 2 by A');
    assert.equal(mock.listMockAttempts().length, 0, 'the sitting was recorded without Speaking');
  }
});

test('an account change during GRADING is a suspension too, and the late grade is kept for A alone', async () => {
  freshBrowser();
  setCurrentOwner(A);
  inTheInterview();
  const openedFor = storeOwner.bindToCurrentOwner();
  /* The interview finished and went off to be graded, bound to A. */
  const gradeBinding = storeOwner.bindToCurrentOwner();
  const grader = deferred<typeof SYNTHETIC_SPEAKING_GRADE>();
  const kept: string[] = [];
  let shown = 0;
  const settling = storeOwner.runOwnedGrade(gradeBinding, () => grader.promise, {
    keep: (_grade, owner) => kept.push(ownerNamespace(owner)),
    show: () => {
      shown += 1;
    },
  });

  /* B signs in; the stopped screen unmounts the examiner mid-grading. */
  setCurrentOwner(B);
  assert.equal(mock.examinerLeftScreen(openedFor), 'suspended');
  openedFor.cancel();
  gradeBinding.cancel();
  assert.deepEqual(mock.afterSpeakingExit(mock.speakingExitFor('suspended', NS_A)), {
    stage: 'speaking-brief',
    speakingSkipped: false,
  });

  /* The grade arrives while B is signed in: kept under A, shown to nobody,
     and it completes nothing. */
  grader.resolve(SYNTHETIC_SPEAKING_GRADE);
  assert.equal(await settling, 'cancelled');
  assert.deepEqual(kept, [NS_A]);
  assert.equal(shown, 0);

  /* A is back at the brief of the same sitting. */
  setCurrentOwner(A);
  assert.equal(mock.reconcileActiveMock(mock.loadActiveMock()!).stage, 'speaking-brief');
});

test('an abort that arrives while the sitting\'s student is away is still a suspension', () => {
  freshBrowser();
  setCurrentOwner(A);
  inTheInterview();
  setCurrentOwner(B);
  assert.equal(mock.speakingExitFor('cancelled', NS_A), 'suspended');
  setCurrentOwner(null);
  assert.equal(mock.speakingExitFor('cancelled', NS_A), 'suspended');
});

test("the student's own cancel still skips Speaking and goes to the results", () => {
  freshBrowser();
  setCurrentOwner(A);
  inTheInterview();
  const openedFor = storeOwner.bindToCurrentOwner();
  /* Nothing changed hands: a teardown without a band is a cancellation. */
  assert.equal(mock.examinerLeftScreen(openedFor), 'cancelled');
  openedFor.cancel();
  /* Back on the examiner's error screen, or "Skip speaking" on the brief. */
  const exit = mock.speakingExitFor('cancelled', NS_A);
  assert.equal(exit, 'cancelled');
  assert.deepEqual(mock.afterSpeakingExit(exit), { stage: 'results', speakingSkipped: true });
  /* A binding already let go never passes for an owner change. */
  assert.equal(mock.examinerLeftScreen(openedFor), 'cancelled');
});

/* ------------------------------------------------------------------ */
/* 11. The screens really are wired this way                            */
/* ------------------------------------------------------------------ */

const COMPONENTS = new URL('../src/components/', import.meta.url);

async function componentCode(name: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(name, COMPONENTS), 'utf8');
  /* Comments describe the old way too; only code counts. */
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

test('every paper of a mock is told its sitting, and the player never reaches the standalone slot directly', async () => {
  const mockExam = await componentCode('MockExam.tsx');
  const players = [...mockExam.matchAll(/<TestPlayer\b[\s\S]*?\/>/g)].map((match) => match[0]);
  assert.equal(players.length, 2, 'expected the Listening and the Reading player');
  for (const player of players) {
    assert.match(player, /mockSitting=\{/, 'a mock paper is not told which sitting it belongs to');
    assert.match(player, /key=\{`\$\{sittingId\}:/, 'a mock paper is not keyed by its sitting');
  }
  const testPlayer = await componentCode('TestPlayer.tsx');
  for (const direct of ['startSession(', 'loadSession(', 'saveAnswers(', 'clearSession(']) {
    assert.equal(testPlayer.includes(direct), false, `TestPlayer calls ${direct} directly, around the sitting store`);
  }
  assert.match(testPlayer, /mockLegSitting\(/);
  assert.match(testPlayer, /standaloneSitting\(/);
});

test('the examiner reports a suspension, not an abort, when it is taken away by an account change, and the mock acts on it', async () => {
  const examiner = await componentCode('LiveExaminer.tsx');
  assert.match(examiner, /examinerLeftScreen\(openedFor\) === 'suspended'\) onSuspend\?\.\(\)/);
  /* onAbort only ever runs once, and never from the teardown unconditionally. */
  assert.doesNotMatch(examiner, /if \(mock && !mock\w+Ref\.current\) onAbort\?\.\(\)/);
  const mockExam = await componentCode('MockExam.tsx');
  assert.match(mockExam, /onSuspend=\{\(\) => leaveSpeaking\('suspended'\)\}/);
  assert.match(mockExam, /onAbort=\{\(\) => leaveSpeaking\('cancelled'\)\}/);
});
