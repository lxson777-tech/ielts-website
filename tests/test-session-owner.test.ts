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

type ActiveMock = Parameters<typeof mock.saveActiveMock>[0];

const MOCK_STARTED = '2026-09-23T09:00:00.000Z';
const LISTENING_LEG = { raw: 31, total: 40, band: 7, bandLabel: '7', secondsUsed: 1_800 };
/** A fixed Writing deadline, so "never restarted" is an exact comparison. */
const WRITING_DEADLINE = 1_790_150_000_000;

/** A SYNTHETIC mock day part way through, for `owner`. */
function activeMock(owner: string, overrides: Partial<ActiveMock> = {}): ActiveMock {
  return {
    version: 1,
    owner,
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
  assert.equal(mock.legFinishedSince('listening-full-001', MOCK_STARTED), null, "A's finished leg counted for B");

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

test('a leg handed in just before the page went away counts as done when the mock is picked up', () => {
  freshBrowser();
  setCurrentOwner(A);
  /* An older standalone sitting of the same paper, BEFORE this mock began,
     is not this mock's leg. */
  progress.recordTestAttempt('listening-full-001', {
    at: '2026-09-20T09:00:00.000Z',
    raw: 20,
    total: 40,
    band: 5.5,
    bandLabel: '5.5',
    secondsUsed: 1_900,
    kind: 'full',
    skill: 'listening',
  });
  const onLeg = activeMock(NS_A, { stage: 'listening', listening: null });
  assert.equal(mock.reconcileActiveMock(onLeg).stage, 'listening');

  /* Submitted inside this mock, then the page went away before "Back to
     results": the leg is done and the sitting moves on. */
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
  const picked = mock.reconcileActiveMock(onLeg);
  assert.equal(picked.stage, 'transition-reading');
  assert.equal(picked.listening?.raw, 31);

  /* The same for Reading. */
  const onReading = activeMock(NS_A, { stage: 'reading', reading: null });
  assert.equal(mock.reconcileActiveMock(onReading).stage, 'reading');
  progress.recordTestAttempt('reading-full-001', {
    at: '2026-09-23T10:35:00.000Z',
    raw: 28,
    total: 40,
    band: 6.5,
    bandLabel: '6.5',
    secondsUsed: 3_500,
    kind: 'full',
    skill: 'reading',
  });
  assert.equal(mock.reconcileActiveMock(onReading).stage, 'transition-writing');
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
