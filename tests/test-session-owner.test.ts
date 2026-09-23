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
 *   8. Only starting a mock may put a sitting in another's place (Codex
 *      round 4, R2C-02): the screen's ordinary saves and its tidy-up must
 *      name the stored sitting itself, so a mock left open in one tab can
 *      neither overwrite nor remove a fresh one the same student started in
 *      another, and it can tell that it was replaced.
 *   9. A paper's clock is its saved deadline (Codex round 4, R2C-03): time
 *      that passed while the student was away, or while the tab slept, is
 *      never handed back, and a deadline that passed meanwhile is the same
 *      expired sitting a fresh load finds. Driven with a fake clock.
 *  10. A paper opened on its own has its own sitting identity (Codex round
 *      5, R2D-02): a paper left open in one tab can neither overwrite nor
 *      clear a newer paper the same student started in another, it knows it
 *      was replaced (or that its sitting is gone), and handing it in is
 *      refused BEFORE anything is recorded.
 *  11. A mock whose record disappeared is over in the tab still showing it
 *      (Codex round 5, R2D-03): it reads as gone, not replaced; the results
 *      step records only after it finalised that very sitting; and the mock
 *      history takes one record per sitting id, so two tabs finishing the
 *      same sitting record it once.
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
  assert.equal(mock.beginActiveMock(mine), true);
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
  assert.equal(mock.beginActiveMock(activeMock(NS_A)), true);
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
  assert.equal(mock.beginActiveMock(bFresh), true);
  assert.deepEqual(withoutSavedAt(mock.loadActiveMock()), withoutSavedAt(bFresh));
  assert.equal(storage.data.get(activeKey(NS_A)), aStored, "B's fresh mock changed A's saved sitting");

  /* B finishes and tidies up: only B's copy goes. */
  assert.equal(mock.clearActiveMock({ owner: NS_B, sittingId: SITTING_1 }), true);
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
  mock.beginActiveMock(activeMock(NS_A));
  const aStored = storage.data.get(activeKey(NS_A));

  setCurrentOwner(B);
  assert.equal(
    mock.saveActiveMock(activeMock(NS_A, { stage: 'writing', essay1: 'typed after B signed in' })),
    false,
    "A's open mock saved after B signed in",
  );
  assert.equal(mock.beginActiveMock(activeMock(NS_A)), false, "A's sitting was begun under B");
  assert.equal(storage.data.has(activeKey(NS_B)), false, "A's mock was written into B's key");
  assert.equal(mock.clearActiveMock({ owner: NS_A, sittingId: SITTING_1 }), false);
  assert.equal(storage.data.get(activeKey(NS_A)), aStored, "a stale tidy-up from A's tab removed A's sitting");

  setCurrentOwner(null);
  assert.equal(mock.saveActiveMock(activeMock(NS_A)), false);
  assert.equal(mock.beginActiveMock(activeMock(NS_A)), false);
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
  assert.equal(mock.beginActiveMock(activeMock(NS_A, { stage: 'start' })), false);
  assert.equal(mock.beginActiveMock(activeMock(NS_A, { stage: 'results' })), false);
  assert.equal(storage.data.has(activeKey(NS_A)), false);
  /* An ordinary save of either, over a sitting that IS written down, is
     refused too, and leaves that sitting as it was. */
  mock.beginActiveMock(activeMock(NS_A));
  const held = storage.data.get(activeKey(NS_A));
  assert.equal(mock.saveActiveMock(activeMock(NS_A, { stage: 'start' })), false);
  assert.equal(mock.saveActiveMock(activeMock(NS_A, { stage: 'results' })), false);
  assert.equal(storage.data.get(activeKey(NS_A)), held);
  storage.data.delete(activeKey(NS_A));

  storage.data.set(activeKey(NS_A), JSON.stringify(activeMock(NS_A, { stage: 'results' })));
  assert.equal(mock.loadActiveMock(), null);
});

test('the Writing deadline is stored as a moment and is never restarted', () => {
  freshBrowser();
  setCurrentOwner(A);
  mock.beginActiveMock(activeMock(NS_A, { stage: 'writing', writingEndsAt: WRITING_DEADLINE, essay1: 'SYNTHETIC draft' }));
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
  assert.equal(mock.beginActiveMock(activeMock(NS_A, { stage: 'listening', listening: null })), true);
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
  assert.equal(mock.beginActiveMock(activeMock(NS_ANON, { stage: 'reading' })), true);
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
  mock.beginActiveMock(activeMock(NS_A, { stage: 'writing', essay1: 'SYNTHETIC own draft by A', writingEndsAt: WRITING_DEADLINE }));
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
  assert.equal(mock.beginActiveMock(fresh), true);
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
  const drillSitting = session.sittingRefOf(drill.start());
  assert.equal(drill.save(A_ANSWER, NS_A, drillSitting), true);
  assert.equal(session.activeSession()?.testId, DRILL.id);
  assert.equal(JSON.stringify(mock.loadActiveMock()!.legSittings), before, "the drill changed the mock's papers");
  assert.equal(drill.finish(NS_A, READING_LEG, drillSitting), 'finished');
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
  const standaloneRef = session.sittingRefOf(standalone.start());
  assert.equal(standalone.save({ q1: 'SYNTHETIC-standalone' }, NS_A, standaloneRef), true);

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

test('the screen\'s own saves keep the papers the player wrote; only a new sitting begun on purpose replaces them', () => {
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
  /* A snapshot naming papers of its own cannot write them either: they are
     the player's to write. */
  assert.equal(mock.saveActiveMock({ ...snapshot, legSittings: {} }), true);
  assert.deepEqual(mock.loadActiveMock()!.legSittings[LISTENING_PAPER.id]?.answers, A_LISTENING_ANSWERS);
  /* An ordinary save of a DIFFERENT sitting is refused and writes nothing
     (R2C-02); it used to replace the stored one whole. */
  const stored = storage.data.get(activeKey(NS_A));
  assert.equal(mock.saveActiveMock({ ...snapshot, sittingId: 'SYNTHETIC-sitting-2' }), false);
  assert.equal(storage.data.get(activeKey(NS_A)), stored);
  /* Beginning a new sitting on purpose does replace it, with fresh papers. */
  assert.equal(mock.beginActiveMock({ ...snapshot, sittingId: 'SYNTHETIC-sitting-2' }), true);
  assert.deepEqual(mock.loadActiveMock()!.legSittings, {});
  assert.equal(mock.loadActiveMock()!.sittingId, 'SYNTHETIC-sitting-2');
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
  assert.equal(mock.beginActiveMock(sitting), true);
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

/* ------------------------------------------------------------------ */
/* 12. Only starting a mock replaces a sitting (Codex R2C-02)           */
/* ------------------------------------------------------------------ */

/* The fourth Codex inspection found the papers' own writes checked the
   sitting id, while the screen's snapshot and its tidy-up did not. A mock
   left open in one tab (M1, in Writing) and a fresh one the same student
   started in another tab (M2): one keystroke in M1 replaced M2, papers and
   all, and finishing M1 deleted M2. Two tabs are two screens holding two
   sitting identities over one storage, which is exactly what these drive:
   the functions MockExam calls for its snapshot (saveActiveMock), its
   tidy-up (clearActiveMock), a fresh start (beginActiveMock) and its
   stopped screen (mockSittingReplaced), with the player's own
   (mockLegSitting) alongside. */

const SITTING_2 = 'SYNTHETIC-sitting-2';
const M2_LISTENING_ANSWERS = { q1: 'SYNTHETIC-M2-harbour', q2: 'SYNTHETIC-M2-friday' };

/** Tab 1 holds M1 in Writing, with a draft; tab 2 then starts M2 and answers
    part of its Listening paper. Returns both screens' identities and the
    record exactly as tab 2 left it. */
function twoTabsSameStudent(): { m1: { owner: string; sittingId: string }; m2: { owner: string; sittingId: string }; m1Snapshot: ActiveMock; afterM2: string } {
  const m1Snapshot = activeMock(NS_A, {
    stage: 'writing',
    reading: READING_LEG,
    essay1: 'SYNTHETIC M1 draft',
    writingEndsAt: WRITING_DEADLINE,
  });
  assert.equal(mock.beginActiveMock(m1Snapshot), true);
  const m1 = { owner: NS_A, sittingId: SITTING_1 };
  /* Tab 2: "Start Mock Exam", which the resume offer says replaces M1. */
  beginSitting(NS_A, SITTING_2, { startedAt: '2026-09-23T11:00:00.000Z' });
  const m2 = { owner: NS_A, sittingId: SITTING_2 };
  const leg = mock.mockLegSitting(m2, LISTENING_PAPER);
  leg.start();
  assert.equal(leg.save(M2_LISTENING_ANSWERS, NS_A), true);
  return { m1, m2, m1Snapshot, afterM2: storage.data.get(activeKey(NS_A))! };
}

test('R2C-02: the older of two open sittings, typing after the newer began, writes nothing, and the newer keeps its papers', () => {
  freshBrowser();
  setCurrentOwner(A);
  const { m1, m2, m1Snapshot, afterM2 } = twoTabsSameStudent();

  /* Tab 1's snapshot effect after a keystroke in the essay. It used to be
     taken as a replacement and overwrite M2 whole. */
  assert.equal(
    mock.saveActiveMock({ ...m1Snapshot, essay1: 'SYNTHETIC M1 draft, one more word' }),
    false,
    "the older sitting's keystroke was saved over the newer sitting",
  );
  /* The Writing clock running out, and the move on to the Speaking brief,
     are the same ordinary save: refused as well. */
  assert.equal(mock.saveActiveMock({ ...m1Snapshot, stage: 'speaking-brief' }), false);
  /* And the older sitting's paper writes, as before. */
  assert.equal(mock.mockLegSitting(m1, LISTENING_PAPER).save({ q1: 'SYNTHETIC-M1-late' }, NS_A), false);
  assert.equal(mock.mockLegSitting(m1, LISTENING_PAPER).load(), null);

  /* Nothing changed, byte for byte: M2 is still the record, papers intact. */
  assert.equal(storage.data.get(activeKey(NS_A)), afterM2, 'the newer sitting changed');
  const held = mock.loadActiveMock()!;
  assert.equal(held.sittingId, SITTING_2);
  assert.deepEqual(held.legSittings[LISTENING_PAPER.id]?.answers, M2_LISTENING_ANSWERS);
  assert.deepEqual(mock.mockLegSitting(m2, LISTENING_PAPER).load()?.answers, M2_LISTENING_ANSWERS);

  /* Tab 1 can tell why it was refused, and so stops; tab 2 is not told to. */
  assert.equal(mock.mockSittingReplaced(m1), true);
  assert.equal(mock.mockSittingReplaced(m2), false);
  /* Tab 2 carries on saving normally. */
  assert.equal(mock.saveActiveMock({ ...mock.loadActiveMock()!, stage: 'listening' }), true);
  assert.deepEqual(mock.loadActiveMock()!.legSittings[LISTENING_PAPER.id]?.answers, M2_LISTENING_ANSWERS);
});

test('R2C-02: the older sitting finishing after the replacement does not clear the newer one', () => {
  freshBrowser();
  setCurrentOwner(A);
  const { m1, m2, afterM2 } = twoTabsSameStudent();

  /* Tab 1's tidy-up once its sitting reaches the results. It used to check
     the student only, and deleted M2. */
  assert.equal(mock.clearActiveMock(m1), false, "the older sitting's tidy-up removed the newer sitting");
  assert.equal(storage.data.get(activeKey(NS_A)), afterM2);
  assert.equal(mock.loadActiveMock()?.sittingId, SITTING_2);

  /* M2 finishing clears M2, as it should. */
  assert.equal(mock.clearActiveMock(m2), true);
  assert.equal(storage.data.has(activeKey(NS_A)), false);
  /* Once nothing is written down, neither ordinary write creates anything,
     and nothing reads as replaced. */
  assert.equal(mock.saveActiveMock(activeMock(NS_A)), false);
  assert.equal(mock.clearActiveMock(m1), false);
  assert.equal(storage.data.has(activeKey(NS_A)), false);
  assert.equal(mock.mockSittingReplaced(m1), false);
});

test('R2C-02: a plain mock in one tab still saves every stage and clears itself when it is recorded', () => {
  freshBrowser();
  setCurrentOwner(A);
  beginSitting(NS_A, SITTING_1);
  const ref = { owner: NS_A, sittingId: SITTING_1 };
  const leg = mock.mockLegSitting(ref, LISTENING_PAPER);
  leg.start();
  leg.save(A_LISTENING_ANSWERS, NS_A);
  leg.finish(NS_A, LISTENING_LEG);

  /* The screen moves through the day, one ordinary save per step. */
  const { legSittings: _papers, ...base } = mock.loadActiveMock()!;
  const steps: Partial<ActiveMock>[] = [
    { stage: 'transition-reading', listening: LISTENING_LEG },
    { stage: 'reading' },
    { stage: 'transition-writing', reading: READING_LEG },
    { stage: 'writing', writingEndsAt: WRITING_DEADLINE },
    { stage: 'writing', essay1: 'SYNTHETIC Task 1', essay2: 'SYNTHETIC Task 2' },
    { stage: 'speaking-brief' },
  ];
  let now: Omit<ActiveMock, 'legSittings'> = base;
  for (const step of steps) {
    now = { ...now, ...step };
    assert.equal(mock.saveActiveMock(now), true, `the ordinary save at ${step.stage} was refused`);
    assert.equal(mock.mockSittingReplaced(ref), false);
  }
  const held = mock.loadActiveMock()!;
  assert.equal(held.stage, 'speaking-brief');
  assert.equal(held.essay2, 'SYNTHETIC Task 2');
  assert.equal(held.writingEndsAt, WRITING_DEADLINE);
  assert.deepEqual(held.legSittings[LISTENING_PAPER.id]?.result, LISTENING_LEG, "the player's paper was lost along the way");

  /* Recorded: the tidy-up removes it, and nothing is offered any more. */
  assert.equal(mock.clearActiveMock(ref), true);
  assert.equal(mock.loadActiveMock(), null);
  assert.equal(storage.data.has(activeKey(NS_A)), false);
});

test('R2C-02: an account change is not a replacement, and a replaced sitting is only ever the same student\'s', () => {
  freshBrowser();
  setCurrentOwner(A);
  beginSitting(NS_A, SITTING_1);
  const refA = { owner: NS_A, sittingId: SITTING_1 };

  /* B signs in and starts a mock of their own: A's open tab is stopped for
     the account change (its own screen), never as replaced, and B's record
     is not A's to replace. */
  setCurrentOwner(B);
  beginSitting(NS_B, SITTING_2);
  assert.equal(mock.mockSittingReplaced(refA), false);
  assert.equal(mock.clearActiveMock(refA), false);
  assert.equal(mock.loadActiveMock()?.sittingId, SITTING_2);

  /* A is back: A's sitting is still the stored one. */
  setCurrentOwner(A);
  assert.equal(mock.mockSittingReplaced(refA), false);
  assert.equal(mock.loadActiveMock()?.sittingId, SITTING_1);

  /* A begin for somebody who is not the one using this browser, or with no
     identity, writes nothing. */
  assert.equal(mock.beginActiveMock(activeMock(NS_B, { sittingId: 'SYNTHETIC-sitting-3' })), false);
  assert.equal(mock.beginActiveMock(activeMock(NS_A, { sittingId: '' })), false);
  assert.equal(mock.loadActiveMock()?.sittingId, SITTING_1);
});

test('R2C-02: after the claim, the account\'s own screen saves and clears the claimed sitting normally, papers kept', () => {
  freshBrowser();
  setCurrentOwner(null);
  beginSitting(NS_ANON, SITTING_1);
  const deviceRef = { owner: NS_ANON, sittingId: SITTING_1 };
  const device = mock.mockLegSitting(deviceRef, LISTENING_PAPER);
  device.start();
  device.save(A_LISTENING_ANSWERS, NS_ANON);

  setCurrentOwner(A);
  storeOwner.claimLegacyStores(storage, ANON, A);
  const claimed = mock.loadActiveMock()!;
  assert.equal(claimed.owner, NS_A);
  assert.equal(claimed.sittingId, SITTING_1, 'the claim changed the sitting identity');
  assert.deepEqual(claimed.legSittings[LISTENING_PAPER.id]?.answers, A_LISTENING_ANSWERS);

  /* A picks it up: the screen's ordinary saves match it, papers kept. */
  const mine = { owner: NS_A, sittingId: SITTING_1 };
  const { legSittings: _papers, ...snapshot } = claimed;
  assert.equal(mock.saveActiveMock({ ...snapshot, stage: 'listening' }), true);
  assert.deepEqual(mock.loadActiveMock()!.legSittings[LISTENING_PAPER.id]?.answers, A_LISTENING_ANSWERS);
  assert.equal(mock.mockSittingReplaced(mine), false);
  /* The device's own identity neither saves nor clears it. */
  assert.equal(mock.saveActiveMock({ ...snapshot, owner: NS_ANON }), false);
  assert.equal(mock.clearActiveMock(deviceRef), false);
  assert.equal(mock.loadActiveMock()?.owner, NS_A);
  /* Recorded by A: cleared. */
  assert.equal(mock.clearActiveMock(mine), true);
  assert.equal(mock.loadActiveMock(), null);
});

test('R2C-02: only the in-progress mock record\'s own keys are worth a look on a storage event', () => {
  assert.equal(mock.isActiveMockStorageKey(`${mock.ACTIVE_MOCK_KEY}::${NS_A}`), true);
  assert.equal(mock.isActiveMockStorageKey(`${mock.ACTIVE_MOCK_KEY}::${NS_ANON}`), true);
  assert.equal(mock.isActiveMockStorageKey(mock.ACTIVE_MOCK_KEY), true);
  /* The whole storage cleared. */
  assert.equal(mock.isActiveMockStorageKey(null), true);
  /* The mock history and a paper's own slot are not the in-progress record. */
  assert.equal(mock.isActiveMockStorageKey(`${mock.MOCK_STORE_KEY}::${NS_A}`), false);
  assert.equal(mock.isActiveMockStorageKey(sessionKey(NS_A)), false);
});

/* ------------------------------------------------------------------ */
/* 13. A paper's clock is its saved deadline (Codex R2C-03)             */
/* ------------------------------------------------------------------ */

/* The test player counted a number down and froze it while the sitting's
   student was away; back on the same open page, the count carried on from
   the frozen number, so ten minutes away cost nothing, while a reload of the
   same sitting found it expired. Now every reading comes from the saved
   deadline (paperClockAt in src/lib/test-session.ts), which is what the
   player's timer, its owner-change listener and its submit all call. These
   drive that rule through both places a sitting is kept, with a FAKE clock:
   no test here waits for real time. */

const MINUTE = 60_000;
const T0 = 1_790_100_000_000;

/** Date.now, under the test's control until restore(). */
function fakeClock(start: number): { advance(ms: number): void; now(): number; restore(): void } {
  const real = Date.now;
  let at = start;
  Date.now = () => at;
  return {
    advance: (ms) => {
      at += ms;
    },
    now: () => at,
    restore: () => {
      Date.now = real;
    },
  };
}

/** What the player shows when its own student is back on the open page, the
    way TestPlayer.tsx works it out: the deadline of the sitting it holds,
    read at this moment. `frozen` is what the old count would have shown. */
function backOnTheOpenPage(held: { endsAt: number }, frozen: number): { secondsLeft: number; timeUp: boolean; frozen: number } {
  return { ...session.paperClockAt(held.endsAt), frozen };
}

test('R2C-03: A away 10 minutes on a paper with 15 left comes back to 5 left, not the frozen 15', () => {
  const clock = fakeClock(T0);
  try {
    freshBrowser();
    setCurrentOwner(A);
    const store = session.standaloneSitting(DRILL); // 20 minutes
    const held = store.start();
    assert.equal(held.endsAt, T0 + 20 * MINUTE);

    /* Five minutes in: 15 left, and A has answered. */
    clock.advance(5 * MINUTE);
    assert.equal(store.save(A_ANSWER, NS_A, session.sittingRefOf(held)), true);
    const atSignOut = session.paperClockAt(held.endsAt);
    assert.deepEqual(atSignOut, { secondsLeft: 15 * 60, timeUp: false });

    /* A signs out in another tab and is away for ten minutes. Nothing is
       saved for A meanwhile, and the deadline itself does not move. */
    setCurrentOwner(null);
    assert.equal(store.save({ q14: 'SYNTHETIC-typed-while-away' }, NS_A, session.sittingRefOf(held)), false);
    clock.advance(10 * MINUTE);

    /* A is back on the same open page. */
    setCurrentOwner(A);
    const back = backOnTheOpenPage(held, atSignOut.secondsLeft);
    assert.equal(back.secondsLeft, 5 * 60, `the page offered ${back.secondsLeft} s, the deadline leaves 300`);
    assert.notEqual(back.secondsLeft, back.frozen, 'the frozen count came back');
    assert.equal(back.timeUp, false);
    /* It is exactly what a reload of the same sitting reads. */
    const reloaded = store.load()!;
    assert.equal(reloaded.endsAt, held.endsAt, 'the deadline moved while A was away');
    assert.equal(session.secondsLeft(reloaded), back.secondsLeft);
    assert.deepEqual(reloaded.answers, A_ANSWER);
  } finally {
    clock.restore();
  }
});

test('R2C-03: A away past the deadline comes back to time up, handled as a fresh load handles it, with no time given back', () => {
  const clock = fakeClock(T0);
  try {
    freshBrowser();
    setCurrentOwner(A);
    const store = session.standaloneSitting(DRILL); // 20 minutes
    const held = store.start();
    clock.advance(5 * MINUTE);
    assert.equal(store.save(A_ANSWER, NS_A, session.sittingRefOf(held)), true);

    setCurrentOwner(B);
    clock.advance(25 * MINUTE); // ten minutes past the deadline
    setCurrentOwner(A);

    const back = backOnTheOpenPage(held, 15 * 60);
    assert.deepEqual({ secondsLeft: back.secondsLeft, timeUp: back.timeUp }, { secondsLeft: 0, timeUp: true });
    /* A fresh load finds the same sitting, with A's answers, equally out of
       time: both hand the paper in as it stands. */
    const reloaded = store.load();
    assert.ok(reloaded, 'the expired sitting was lost');
    assert.deepEqual(reloaded!.answers, A_ANSWER);
    assert.deepEqual(session.paperClockAt(reloaded!.endsAt), { secondsLeft: 0, timeUp: true });
    assert.equal(reloaded!.endsAt, T0 + 20 * MINUTE, 'time was given back');
    /* Time used, as the player works it out when it hands the paper in: the
       whole paper, never more. */
    assert.equal(DRILL.durationMinutes * 60 - back.secondsLeft, 20 * 60);
  } finally {
    clock.restore();
  }
});

test('R2C-03: the same for a paper of a mock, through its own sitting', () => {
  const clock = fakeClock(T0);
  try {
    freshBrowser();
    setCurrentOwner(A);
    beginSitting(NS_A, SITTING_1);
    const ref = { owner: NS_A, sittingId: SITTING_1 };
    const leg = mock.mockLegSitting(ref, LISTENING_PAPER); // 40 minutes
    const held = leg.start();
    assert.equal(held.endsAt, T0 + 40 * MINUTE);

    /* 25 minutes in: 15 left. A goes away for ten. */
    clock.advance(25 * MINUTE);
    leg.save(A_LISTENING_ANSWERS, NS_A);
    setCurrentOwner(B);
    assert.equal(leg.load(), null, "B's browser reads A's paper");
    assert.equal(leg.save({ q1: 'SYNTHETIC-typed-while-away' }, NS_A), false);
    clock.advance(10 * MINUTE);

    /* Back: the mock puts the paper on screen again from its own sitting,
       and the clock reads the deadline: 5 minutes, not 15. */
    setCurrentOwner(A);
    const resumed = leg.load()!;
    assert.equal(resumed.endsAt, held.endsAt, "the mock paper's deadline moved");
    assert.deepEqual(resumed.answers, A_LISTENING_ANSWERS);
    assert.deepEqual(session.paperClockAt(resumed.endsAt), { secondsLeft: 5 * 60, timeUp: false });
    assert.equal(session.secondsLeft(resumed), 5 * 60);

    /* Away again, past the deadline: back to time up, nothing given back,
       the answers still there to be handed in. */
    setCurrentOwner(null);
    clock.advance(20 * MINUTE);
    setCurrentOwner(A);
    const expired = leg.load()!;
    assert.deepEqual(session.paperClockAt(expired.endsAt), { secondsLeft: 0, timeUp: true });
    assert.equal(expired.endsAt, T0 + 40 * MINUTE);
    assert.deepEqual(expired.answers, A_LISTENING_ANSWERS);
  } finally {
    clock.restore();
  }
});

test('R2C-03: the clock depends on the deadline and the moment only, however few ticks a background tab got', () => {
  const endsAt = T0 + 20 * MINUTE;
  /* A tab ticking every second and a tab the browser throttled to one tick
     a minute read the same at the same moment. */
  assert.deepEqual(session.paperClockAt(endsAt, T0 + 10 * MINUTE), { secondsLeft: 600, timeUp: false });
  assert.deepEqual(session.paperClockAt(endsAt, T0 + 10 * MINUTE + 400), { secondsLeft: 600, timeUp: false });
  assert.deepEqual(session.paperClockAt(endsAt, endsAt - 1_000), { secondsLeft: 1, timeUp: false });
  assert.deepEqual(session.paperClockAt(endsAt, endsAt), { secondsLeft: 0, timeUp: true });
  assert.deepEqual(session.paperClockAt(endsAt, endsAt + 60 * MINUTE), { secondsLeft: 0, timeUp: true });
  /* secondsLeft is the same rule. */
  assert.equal(session.secondsLeft({ endsAt }, T0), 20 * 60);
});

/* ------------------------------------------------------------------ */
/* 14. The screens use those rules (R2C-02, R2C-03)                     */
/* ------------------------------------------------------------------ */

/** The body of the first `useEffect(() => { ... }, [deps])` whose code
    contains `marker`, comments stripped. */
function effectContaining(code: string, marker: string): string {
  const at = code.indexOf(marker);
  assert.ok(at >= 0, `no code contains ${marker}`);
  const start = code.lastIndexOf('useEffect(', at);
  const end = code.indexOf('}, [', at);
  assert.ok(start >= 0 && end > at, `${marker} is not inside an effect`);
  return code.slice(start, code.indexOf(']', end) + 1);
}

test('R2C-03: the player\'s timer, its owner listener and its submit all read the deadline, and nothing counts down', async () => {
  const player = await componentCode('TestPlayer.tsx');
  const timer = effectContaining(player, 'submitRef.current()');
  assert.match(timer, /paperClockAt\(deadline\)/, 'the timer does not read the deadline');
  /* Stopped while the owner is changed, and for good once the sitting is
     lost (R2D-02). */
  assert.match(timer, /\[started, submitted, ownerChange, lost\]/);
  assert.doesNotMatch(player, /t - 1/, 'a count-down is back');
  assert.doesNotMatch(timer, /handleSubmit\(\)/, 'the timer calls the submit of the render it was set up in');
  /* The student coming back to the open page reads the deadline again. */
  const listener = player.slice(player.indexOf('return onOwnerChange('), player.indexOf('return onOwnerChange(') + 1200);
  assert.match(listener, /ownerStillCurrent\(sittingOwnerRef\.current\)\) \{\s*const deadline = deadlineRef\.current;\s*if \(deadline !== null\) setTimeLeft\(paperClockAt\(deadline\)\.secondsLeft\);/);
  /* Handing in reads it too, for the time used. */
  assert.match(player, /const left = deadline !== null \? paperClockAt\(deadline\)\.secondsLeft : timeLeft;/);
  assert.equal((player.match(/secondsUsed: test\.durationMinutes \* 60 - left/g) ?? []).length, 2);
  assert.doesNotMatch(player, /secondsUsed: test\.durationMinutes \* 60 - timeLeft/);
  /* Every place a sitting is picked up or started sets the deadline. */
  assert.equal((player.match(/deadlineRef\.current = s\.endsAt;/g) ?? []).length, 2);
  assert.match(player, /useRef<number \| null>\(\s*typeof window === 'undefined' \? null : \(resumed\?\.endsAt \?\? null\),\s*\)/);
});

test('R2C-02: the mock screen begins a sitting only on Start, saves and clears only its own, and stops when replaced', async () => {
  const screen = await componentCode('MockExam.tsx');
  /* Begun in exactly two places: "Start Mock Exam" and the dev shortcut. */
  assert.equal((screen.match(/beginActiveMock\(/g) ?? []).length, 2);
  assert.match(screen.slice(screen.indexOf('function beginMock()')), /^[\s\S]*?beginActiveMock\(\{/);
  /* The snapshot effect is an ordinary save, and a refusal is checked. */
  const snapshotEffect = effectContaining(screen, 'saveActiveMock(snapshot())');
  assert.match(snapshotEffect, /if \(endedRef\.current\) return;/);
  /* A refused save is looked into: replaced (R2C-02) or gone (R2D-03). */
  assert.match(snapshotEffect, /if \(saveActiveMock\(snapshot\(\)\)\) \{\s*recordHeldRef\.current = true;\s*return;\s*\}\s*const loss = sittingLossNow\(\);\s*if \(loss\) stopAs\(loss\);/);
  /* The tidy-up names the sitting, and a refused one is looked into. */
  const recording = effectContaining(screen, 'clearActiveMock(');
  assert.match(recording, /endedRef\.current\) return;/);
  assert.match(recording, /if \(!clearActiveMock\(sitting\)\) \{\s*const loss = sittingLossNow\(\);\s*if \(loss\) \{\s*stopAs\(loss\);\s*return;\s*\}\s*\}\s*savedRef\.current = true;/);
  assert.doesNotMatch(screen, /clearActiveMock\(mockOwnerRef\.current\)/);
  /* The other tab's write is listened for. */
  const listener = effectContaining(screen, "addEventListener('storage'");
  assert.match(listener, /isActiveMockStorageKey\(event\.key\)/);
  assert.match(listener, /const loss = sittingLossNow\(\);\s*if \(loss\) stopAs\(loss\);/);
  /* The loss is read from the sitting's status, and the replaced case is
     still "replaced". */
  assert.match(screen, /mockSittingStatus\(\{ owner: mockOwnerRef\.current, sittingId \}\)/);
  /* The stopped screen comes first and says what happened. */
  const replacedScreen = screen.indexOf('if (ended) {');
  assert.ok(
    replacedScreen > 0 && replacedScreen < screen.indexOf("const otherStudent = ownerChange === 'other-student';"),
    'the replaced screen is not checked before the account-change screen',
  );
  assert.match(screen, /t\('A newer mock exam was started in another tab, so this one is no longer being saved\.'\)/);
});

/* ------------------------------------------------------------------ */
/* 14. Which sitting, not only whose (Codex R2D-02)                     */
/* ------------------------------------------------------------------ */

/* The fifth Codex inspection found the standalone slot's saves and its
   clear checked only the student. One student with paper P open in one tab
   and paper Q started in another: a keystroke in P wrote P's answers over
   Q's, handing P in cleared Q, and P's result was recorded before that clear
   anyway. Two tabs are two players holding two sitting identities over one
   storage, which is exactly what these drive: the store each player makes
   (standaloneSitting) and the functions it rests on. */

const Q_ANSWERS = { q1: 'SYNTHETIC-Q-answer-1', q2: 'SYNTHETIC-Q-answer-2' };
const P_OUTCOME = { raw: 1, total: 13, band: 3, bandLabel: '3', secondsUsed: 60 };
const Q_OUTCOME = { raw: 2, total: 13, band: 3.5, bandLabel: '3.5', secondsUsed: 90 };

/** Tab 1 holds paper P with A's answer; tab 2 then starts paper Q and
    answers it. Returns both players, their sittings, and the slot exactly
    as tab 2 left it. */
function twoPapersSameStudent() {
  const tab1 = session.standaloneSitting(DRILL);
  const p = session.sittingRefOf(tab1.start());
  assert.equal(tab1.save(A_ANSWER, NS_A, p), true);
  /* Tab 2: "Start test" on a different paper, the one write that may take
     the slot. */
  const tab2 = session.standaloneSitting(OTHER_DRILL);
  const q = session.sittingRefOf(tab2.start());
  assert.equal(tab2.save(Q_ANSWERS, NS_A, q), true);
  return { tab1, tab2, p, q, afterQ: storage.data.get(sessionKey(NS_A))! };
}

test('R2D-02: every sitting has its own identity, and the same paper started again is a different sitting', () => {
  freshBrowser();
  setCurrentOwner(A);
  const first = session.startSession(DRILL);
  const again = session.startSession(DRILL);
  assert.match(first.sittingId ?? '', /^sitting-/);
  assert.notEqual(first.sittingId, again.sittingId, 'two starts of one paper share an identity');
  /* The stored sitting is the second one: the first can no longer save. */
  assert.equal(session.saveAnswers(A_ANSWER, NS_A, session.sittingRefOf(first)), false);
  assert.equal(session.saveAnswers(A_ANSWER, NS_A, session.sittingRefOf(again)), true);
  /* A sitting written before sitting ids existed is named by its paper and
     start, which every tab reads the same way. */
  assert.deepEqual(session.sittingRefOf({ testId: DRILL.id, startedAt: 1_790_000_000_000 }), {
    testId: DRILL.id,
    sittingId: `${DRILL.id}@1790000000000`,
  });
  /* The claim keeps the identity: only the owner changes. */
  const moved = JSON.parse(session.restampSession(JSON.stringify(again), NS_A, NS_B)!);
  assert.equal(moved.sittingId, again.sittingId);
});

test('R2D-02: a paper left open in one tab writes nothing over a newer paper started in another, and knows it was replaced', () => {
  freshBrowser();
  setCurrentOwner(A);
  const { tab1, tab2, p, afterQ } = twoPapersSameStudent();

  /* Tab 1 types again. It used to write P's answers into Q's sitting. */
  assert.equal(tab1.save({ ...A_ANSWER, q15: 'SYNTHETIC-late' }, NS_A, p), false, "P's keystroke was saved over Q");
  assert.equal(storage.data.get(sessionKey(NS_A)), afterQ, 'the slot changed');
  assert.deepEqual(session.loadSession(OTHER_DRILL.id)?.answers, Q_ANSWERS);
  assert.equal(session.loadSession(DRILL.id), null);

  /* Tab 1 can tell why, and so stops; tab 2 is not told to. */
  assert.equal(tab1.lost(NS_A, p), 'replaced');
  assert.equal(tab2.lost(NS_A, session.sittingRefOf(session.activeSession()!)), null);
  assert.equal(session.standaloneSittingStatus(NS_A, p), 'replaced');
});

test('R2D-02: handing in the stale paper is refused before anything is recorded and clears nothing; the newer paper finishes normally', () => {
  freshBrowser();
  setCurrentOwner(A);
  const { tab1, tab2, p, q, afterQ } = twoPapersSameStudent();

  /* Tab 1's Submit (or its clock running out). It used to clear Q. */
  assert.equal(tab1.finish(NS_A, P_OUTCOME, p), 'replaced', "the stale paper's hand-in was accepted");
  assert.equal(storage.data.get(sessionKey(NS_A)), afterQ, "the stale hand-in cleared Q's sitting");
  /* The low-level clear, named, refuses too. */
  assert.equal(session.clearSession(NS_A, p), false);
  assert.equal(storage.data.get(sessionKey(NS_A)), afterQ);

  /* Q's own hand-in is accepted and clears Q. */
  assert.equal(tab2.finish(NS_A, Q_OUTCOME, q), 'finished');
  assert.equal(storage.data.has(sessionKey(NS_A)), false);
  /* Once the slot is empty, P, which was written down before, reads as gone
     and is still refused. */
  assert.equal(tab1.finish(NS_A, P_OUTCOME, p), 'gone');
  assert.equal(tab1.save(A_ANSWER, NS_A, p), false);
  assert.equal(storage.data.has(sessionKey(NS_A)), false, 'a refused save wrote something');
});

test('R2D-02: reloading the newer tab still resumes its paper, with its answers and deadline', () => {
  freshBrowser();
  setCurrentOwner(A);
  const { q } = twoPapersSameStudent();
  const endsAt = session.activeSession()!.endsAt;
  /* A fresh player on Q's page, as a reload makes. */
  const reloaded = session.standaloneSitting(OTHER_DRILL);
  const held = reloaded.load();
  assert.ok(held, 'Q was not resumed');
  assert.deepEqual(session.sittingRefOf(held!), q);
  assert.deepEqual(held!.answers, Q_ANSWERS);
  assert.equal(held!.endsAt, endsAt, "Q's deadline moved");
  /* And it carries on saving into Q. */
  assert.equal(reloaded.save({ ...Q_ANSWERS, q3: 'SYNTHETIC-Q-3' }, NS_A, q), true);
  assert.equal(reloaded.lost(NS_A, q), null);
});

test('R2D-02: the same sitting open in two tabs still saves from both, and once one hands it in the other finds it gone', () => {
  freshBrowser();
  setCurrentOwner(A);
  const tab1 = session.standaloneSitting(DRILL);
  const s = session.sittingRefOf(tab1.start());
  /* Tab 2 opens the SAME paper and picks up the SAME sitting. */
  const tab2 = session.standaloneSitting(DRILL);
  assert.deepEqual(session.sittingRefOf(tab2.load()!), s);
  /* Both save into it, the last keystroke wins, exactly as before. */
  assert.equal(tab1.save(A_ANSWER, NS_A, s), true);
  assert.equal(tab2.save({ q14: 'SYNTHETIC-tab-2' }, NS_A, s), true);
  assert.equal(tab1.lost(NS_A, s), null);
  assert.equal(tab2.lost(NS_A, s), null);

  /* Tab 2 hands it in. Tab 1 then cannot hand it in a second time. */
  assert.equal(tab2.finish(NS_A, P_OUTCOME, s), 'finished');
  assert.equal(tab1.lost(NS_A, s), 'gone');
  assert.equal(tab1.finish(NS_A, P_OUTCOME, s), 'gone', 'the same sitting was handed in twice');
  assert.equal(tab1.save(A_ANSWER, NS_A, s), false);
  assert.equal(storage.data.has(sessionKey(NS_A)), false);
});

test('R2D-02: a browser that never managed to write the sitting down is never stopped by mistake, and its paper is still handed in', () => {
  freshBrowser();
  setCurrentOwner(A);
  /* A full storage: every write to the sitting slot fails. */
  const realSet = storage.setItem;
  storage.setItem = (key, value) => {
    if (key.startsWith(`${session.TEST_SESSION_KEY}::`)) throw new Error('SYNTHETIC QuotaExceededError');
    realSet(key, value);
  };
  const player = session.standaloneSitting(DRILL);
  const s = session.sittingRefOf(player.start());
  assert.equal(storage.data.has(sessionKey(NS_A)), false);
  assert.equal(player.save(A_ANSWER, NS_A, s), false);
  /* Absent, but never written: not a loss. */
  assert.equal(session.standaloneSittingStatus(NS_A, s), 'absent');
  assert.equal(player.lost(NS_A, s), null, 'a full storage stopped the paper');
  assert.equal(player.finish(NS_A, P_OUTCOME, s), 'unsaved', 'the paper could not be handed in');
  assert.equal(session.sittingLossFrom('absent', false), null);
  assert.equal(session.sittingLossFrom('absent', true), 'gone');
  assert.equal(session.sittingLossFrom('replaced', false), 'replaced');
  assert.equal(session.sittingLossFrom('held', true), null);
  assert.equal(session.sittingLossFrom('owner-changed', true), null);
});

test('R2D-02: an account change is not a loss, and the sitting is still there for its student', () => {
  freshBrowser();
  setCurrentOwner(A);
  const tab1 = session.standaloneSitting(DRILL);
  const p = session.sittingRefOf(tab1.start());
  assert.equal(tab1.save(A_ANSWER, NS_A, p), true);

  /* B signs in and starts a paper of their own. */
  setCurrentOwner(B);
  session.startSession(OTHER_DRILL);
  assert.equal(tab1.lost(NS_A, p), null, 'an account change read as a loss');
  assert.equal(tab1.finish(NS_A, P_OUTCOME, p), 'owner-changed');
  assert.equal(session.standaloneSittingStatus(NS_A, p), 'owner-changed');

  /* A is back: A's sitting is still the stored one, and saves. */
  setCurrentOwner(A);
  assert.equal(tab1.lost(NS_A, p), null);
  assert.equal(tab1.save({ ...A_ANSWER, q15: 'SYNTHETIC-back' }, NS_A, p), true);
});

test("R2D-02: only the standalone slot's own keys are worth a look on a storage event", () => {
  assert.equal(session.isTestSessionStorageKey(sessionKey(NS_A)), true);
  assert.equal(session.isTestSessionStorageKey(sessionKey(NS_ANON)), true);
  assert.equal(session.isTestSessionStorageKey(session.TEST_SESSION_KEY), true);
  assert.equal(session.isTestSessionStorageKey(null), true);
  assert.equal(session.isTestSessionStorageKey(`${mock.ACTIVE_MOCK_KEY}::${NS_A}`), false);
  assert.equal(session.isTestSessionStorageKey(session.UNOWNED_ADOPTION_KEY), false);
});

test('R2D-02: the player finalises before it records anything, names its sitting in every save, listens for the other tab, and stops for good', async () => {
  const player = await componentCode('TestPlayer.tsx');
  const submit = player.slice(player.indexOf('function handleSubmit()'), player.indexOf('const unansweredCount'));
  /* Finalised first, then recorded: a stale tab's hand-in records nothing. */
  const finishAt = submit.indexOf('sittingStore.finish(');
  assert.ok(finishAt > 0, 'the hand-in does not finish the sitting');
  assert.ok(finishAt < submit.indexOf('recordTestAttempt('), 'the attempt is recorded before the sitting is finalised');
  assert.ok(finishAt < submit.indexOf('recordSubmission('), 'the evidence is recorded before the sitting is finalised');
  assert.ok(finishAt < submit.indexOf('submittedRef.current = true;'));
  assert.match(
    submit,
    /const finished = sittingStore\.finish\(sittingOwnerRef\.current, outcome, sittingRef\.current\);\s*if \(finished === 'replaced' \|\| finished === 'gone'\) \{\s*stopAsLost\(finished\);\s*return;\s*\}/,
  );
  assert.equal((player.match(/sittingStore\.finish\(/g) ?? []).length, 1, 'the sitting is finished in more than one place');
  /* Every save names the sitting. */
  assert.match(player, /sittingStore\.save\(next, sittingOwnerRef\.current, sittingRef\.current\)/);
  assert.equal((player.match(/sittingRef\.current = sittingRefOf\(s\);/g) ?? []).length, 2);
  /* The other tab's write is listened for, on the standalone slot only. */
  const listener = effectContaining(player, "addEventListener('storage'");
  assert.match(listener, /if \(mockSittingId \|\| !started \|\| submitted \|\| lost\) return;/);
  assert.match(listener, /isTestSessionStorageKey\(event\.key\)/);
  assert.match(listener, /noticeLost\(\);/);
  /* A refused save is looked into once the render has happened. */
  assert.match(effectContaining(player, 'saveRefusedRef.current = false;'), /noticeLost\(\);/);
  /* The stopped screen comes before the account-change screen, with its own
     sentences, and the lost sitting stays lost across an account change. */
  const lostScreen = player.indexOf('if (lost) {');
  assert.ok(lostScreen > 0 && lostScreen < player.indexOf('if (ownerChange) {'), 'the lost screen is not checked first');
  assert.match(player, /t\('A newer test was started in another tab, so this one is no longer being saved\.'\)/);
  assert.match(player, /t\('This test was submitted or closed in another tab, so this one is no longer being saved\.'\)/);
  assert.match(player, /if \(lostRef\.current\) return;\s*if \(!startedRef\.current\) \{/);
  /* A mock paper tells its screen. */
  assert.match(player, /onSittingLost\?\.\(loss\);/);
});

/* ------------------------------------------------------------------ */
/* 15. When the mock record is gone (Codex R2D-03)                      */
/* ------------------------------------------------------------------ */

/* The fifth Codex inspection found that a mock whose record DISAPPEARED
   was not treated as over: two tabs that had both picked up the same
   sitting, one finished it (recording and clearing it), and the other went
   on unsaved and recorded the same mock a second time at its own results.
   `finishLikeTheScreen` below is the results step of MockExam.tsx, step for
   step (the source check at the end of this section pins that shape), so
   the functions it calls are proved in the order the screen calls them. */

/** What MockExam's results step does for the sitting `ref`, from a tab
    that `everHeld` its record: finalise first, stop on a loss, record once. */
function finishLikeTheScreen(
  ref: { owner: string; sittingId: string },
  everHeld: boolean,
  attempt: Parameters<typeof mock.saveMockAttempt>[0],
): { stopped: 'replaced' | 'gone' | null; recorded: boolean } {
  if (!mock.clearActiveMock(ref)) {
    const loss = session.sittingLossFrom(mock.mockSittingStatus(ref), everHeld);
    if (loss) return { stopped: loss, recorded: false };
  }
  return { stopped: null, recorded: mock.saveMockAttempt({ ...attempt, sittingId: ref.sittingId }, ref.owner) };
}

test('R2D-03: a mock finished in another tab reads as gone, not replaced, and the tab still showing it can neither save nor clear', () => {
  freshBrowser();
  setCurrentOwner(A);
  const snapshot = activeMock(NS_A, { stage: 'writing', reading: READING_LEG, writingEndsAt: WRITING_DEADLINE });
  assert.equal(mock.beginActiveMock(snapshot), true);
  const ref = { owner: NS_A, sittingId: SITTING_1 };
  assert.equal(mock.mockSittingStatus(ref), 'held');

  /* Tab 2 picked up the same sitting and finished it: recorded, cleared. */
  assert.equal(mock.clearActiveMock(ref), true);
  assert.equal(mock.mockSittingStatus(ref), 'absent');
  assert.equal(mock.mockSittingReplaced(ref), false, 'a finished sitting read as replaced');
  assert.equal(session.sittingLossFrom(mock.mockSittingStatus(ref), true), 'gone');

  /* Tab 1's keystroke, and its tidy-up, write nothing at all. */
  assert.equal(mock.saveActiveMock({ ...snapshot, essay1: 'SYNTHETIC late draft' }), false);
  assert.equal(mock.clearActiveMock(ref), false);
  assert.equal(storage.data.has(activeKey(NS_A)), false, 'the stale tab wrote the finished sitting back');
});

test('R2D-03: two tabs finishing the same sitting record it once; the second finds it gone and records nothing', () => {
  freshBrowser();
  setCurrentOwner(A);
  beginSitting(NS_A, SITTING_1);
  const ref = { owner: NS_A, sittingId: SITTING_1 };
  const attempt = mockAttempt('mock-2026-09-23-1', 'SYNTHETIC essay from tab 2');

  const tab2 = finishLikeTheScreen(ref, true, attempt);
  assert.deepEqual(tab2, { stopped: null, recorded: true });
  const tab1 = finishLikeTheScreen(ref, true, { ...attempt, essays: [] });
  assert.deepEqual(tab1, { stopped: 'gone', recorded: false }, 'the second tab recorded the same mock again');

  const history = mock.listMockAttempts();
  assert.equal(history.length, 1, 'the mock was recorded twice');
  assert.equal(history[0]!.sittingId, SITTING_1);
  assert.equal(history[0]!.essays[0]?.text, 'SYNTHETIC essay from tab 2');
  assert.equal(progress.getAttempts('mock-2026-09-23-1').length, 1, 'the progress marker was written twice');
});

test('R2D-03: the mock history takes one record per sitting: a second record of it neither duplicates nor replaces the first, and older rows are left alone', () => {
  freshBrowser();
  setCurrentOwner(A);
  /* Two older rows with no sitting id, one of them with the same mock id. */
  const older = [mockAttempt('mock-2026-09-22-1', 'SYNTHETIC older one'), mockAttempt('mock-2026-09-23-1', 'SYNTHETIC older two')];
  storage.data.set(mockKey(NS_A), JSON.stringify(older));

  const first = { ...mockAttempt('mock-2026-09-23-2', 'SYNTHETIC first'), sittingId: SITTING_1 };
  assert.equal(mock.saveMockAttempt(first, NS_A), true);
  const second = { ...mockAttempt('mock-2026-09-23-2', 'SYNTHETIC second'), sittingId: SITTING_1 };
  assert.equal(mock.saveMockAttempt(second, NS_A), false, 'a second record of one sitting was accepted');

  const history = JSON.parse(storage.data.get(mockKey(NS_A))!) as Array<{ id: string; sittingId?: string; essays: { text: string }[] }>;
  assert.equal(history.length, 3);
  assert.deepEqual(history.slice(0, 2), older, 'the older rows were changed');
  assert.equal(history[2]!.essays[0]!.text, 'SYNTHETIC first', 'the first record was replaced');
  assert.equal(progress.getAttempts('mock-2026-09-23-2').length, 1);

  /* A different sitting is a different record, even on the same mock id. */
  assert.equal(mock.saveMockAttempt({ ...second, sittingId: 'SYNTHETIC-sitting-2' }, NS_A), true);
  /* And a record with no sitting id is never matched: it is added as ever. */
  assert.equal(mock.saveMockAttempt(mockAttempt('mock-2026-09-23-1', 'SYNTHETIC no id'), NS_A), true);
  assert.equal(mock.listMockAttempts().length, 5);
});

test('R2D-03: a record that was never written down is not gone: a full storage never stops a mock, and its results are still recorded once', () => {
  freshBrowser();
  setCurrentOwner(A);
  const realSet = storage.setItem;
  storage.setItem = (key, value) => {
    if (key.startsWith(`${mock.ACTIVE_MOCK_KEY}::`)) throw new Error('SYNTHETIC QuotaExceededError');
    realSet(key, value);
  };
  const fresh = activeMock(NS_A, { stage: 'listening', listening: null });
  const everHeld = mock.beginActiveMock(fresh);
  assert.equal(everHeld, false);
  const ref = { owner: NS_A, sittingId: SITTING_1 };
  assert.equal(mock.mockSittingStatus(ref), 'absent');
  assert.equal(session.sittingLossFrom(mock.mockSittingStatus(ref), everHeld), null, 'a full storage stopped the mock');
  assert.deepEqual(finishLikeTheScreen(ref, everHeld, mockAttempt('mock-2026-09-23-1', 'SYNTHETIC')), {
    stopped: null,
    recorded: true,
  });
  assert.equal(mock.listMockAttempts().length, 1);
});

test("R2D-03: a mock added to an account in another tab is gone for the device's tab once the device is its own again", () => {
  freshBrowser();
  setCurrentOwner(null);
  beginSitting(NS_ANON, SITTING_1);
  const deviceRef = { owner: NS_ANON, sittingId: SITTING_1 };
  assert.equal(mock.mockSittingStatus(deviceRef), 'held');

  /* A signs in in another tab and adds the device's work to the account. */
  setCurrentOwner(A);
  storeOwner.claimLegacyStores(storage, ANON, A);
  assert.equal(mock.loadActiveMock()?.sittingId, SITTING_1);
  /* While A is signed in, the device's tab is stopped for the account change,
     never as a loss. */
  assert.equal(mock.mockSittingStatus(deviceRef), 'owner-changed');
  assert.equal(session.sittingLossFrom(mock.mockSittingStatus(deviceRef), true), null);

  /* A signs out: the device's tab is its own student's again, and the
     sitting is not there any more. It is over in that tab, and it can
     record nothing. */
  setCurrentOwner(null);
  assert.equal(mock.mockSittingStatus(deviceRef), 'absent');
  assert.deepEqual(finishLikeTheScreen(deviceRef, true, mockAttempt('mock-2026-09-23-1', 'SYNTHETIC')), {
    stopped: 'gone',
    recorded: false,
  });
  assert.deepEqual(mock.listMockAttempts(), []);
  /* A still has it, whole. */
  setCurrentOwner(A);
  assert.equal(mock.loadActiveMock()?.sittingId, SITTING_1);
});

test("R2D-03: a paper of a mock reports its sitting's loss, and its hand-in is refused before anything is recorded", () => {
  freshBrowser();
  setCurrentOwner(A);
  beginSitting(NS_A, SITTING_1);
  const ref = { owner: NS_A, sittingId: SITTING_1 };
  const leg = mock.mockLegSitting(ref, LISTENING_PAPER);
  const paper = session.sittingRefOf(leg.start());
  assert.equal(leg.save(A_LISTENING_ANSWERS, NS_A, paper), true);
  assert.equal(leg.lost(NS_A, paper), null);

  /* Replaced: a newer sitting began in another tab. */
  beginSitting(NS_A, 'SYNTHETIC-sitting-2');
  const newer = storage.data.get(activeKey(NS_A));
  assert.equal(leg.lost(NS_A, paper), 'replaced');
  assert.equal(leg.finish(NS_A, LISTENING_LEG, paper), 'replaced');
  assert.equal(storage.data.get(activeKey(NS_A)), newer, 'the stale paper wrote into the newer sitting');

  /* Gone: the newer one finished there too, and nothing is written down. */
  assert.equal(mock.clearActiveMock({ owner: NS_A, sittingId: 'SYNTHETIC-sitting-2' }), true);
  assert.equal(leg.lost(NS_A, paper), 'gone');
  assert.equal(leg.finish(NS_A, LISTENING_LEG, paper), 'gone');
  assert.equal(storage.data.has(activeKey(NS_A)), false);

  /* A paper whose sitting was never written down (a full storage) is not
     lost, and hands in as before. */
  const unwritten = mock.mockLegSitting({ owner: NS_A, sittingId: 'SYNTHETIC-never-written' }, LISTENING_PAPER);
  const u = session.sittingRefOf(unwritten.start());
  assert.equal(unwritten.lost(NS_A, u), null);
  assert.equal(unwritten.finish(NS_A, LISTENING_LEG, u), 'unsaved');
  /* And a live one finishes inside its sitting. */
  beginSitting(NS_A, 'SYNTHETIC-sitting-3');
  const live = mock.mockLegSitting({ owner: NS_A, sittingId: 'SYNTHETIC-sitting-3' }, LISTENING_PAPER);
  const l = session.sittingRefOf(live.start());
  assert.equal(live.finish(NS_A, LISTENING_LEG, l), 'finished');
  assert.deepEqual(mock.mockLegResult({ owner: NS_A, sittingId: 'SYNTHETIC-sitting-3' }, LISTENING_PAPER.id), LISTENING_LEG);
});

test('R2D-03: the mock screen stops on a gone record as well as a replaced one, finalises before it records, and records once', async () => {
  const screen = await componentCode('MockExam.tsx');
  const recording = effectContaining(screen, 'clearActiveMock(');
  /* Finalised first, and only then recorded, once. */
  const clearAt = recording.indexOf('if (!clearActiveMock(sitting))');
  assert.ok(clearAt > 0 && clearAt < recording.indexOf('saveMockAttempt('), 'the mock is recorded before its sitting is finalised');
  assert.match(recording, /const recorded = saveMockAttempt\(/);
  assert.match(recording, /sittingId: sittingId \|\| undefined,/);
  const guard = recording.indexOf('if (!recorded) return;');
  assert.ok(guard > 0 && guard < recording.indexOf('recordSubmission('), 'the evidence is written even when the history refused the record');
  /* The loss is read with the tab's own "ever held" knowledge. */
  assert.match(screen, /return sittingLossFrom\(status, recordHeldRef\.current\);/);
  assert.equal((screen.match(/recordHeldRef\.current = beginActiveMock\(/g) ?? []).length, 2);
  assert.match(screen, /recordHeldRef\.current = true;\s*resume\(held\);/);
  /* The owner coming back looks for a loss before putting the sitting back. */
  const back = effectContaining(screen, 'wasStoppedRef.current = false;');
  assert.ok(back.indexOf('sittingLossNow()') > 0 && back.indexOf('sittingLossNow()') < back.indexOf('resume('));
  /* Both papers report their loss to the screen. */
  const players = [...screen.matchAll(/<TestPlayer\b[\s\S]*?\/>/g)].map((match) => match[0]);
  assert.equal(players.length, 2);
  for (const player of players) assert.match(player, /onSittingLost=\{stopAs\}/);
  /* One true sentence per case. */
  assert.match(
    screen,
    /ended === 'replaced'\s*\? t\('A newer mock exam was started in another tab, so this one is no longer being saved\.'\)\s*: t\('This mock exam was finished or closed in another tab, so this one is no longer being saved\.'\)/,
  );
});
