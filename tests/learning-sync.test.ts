/* The sync layer: one student's work on two devices, and two students on one
 * device.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/learning-sync.test.ts
 * The whole suite is `npm test`.
 *
 * EVERYTHING HERE IS PROVED AGAINST THE LOCAL STAND-IN, NOT A REAL ACCOUNT.
 * tools/mr-ez-dev-server.mjs is started in this same process on an
 * OS-assigned free port and talked to over real HTTP by the real transport
 * the browser uses, so the requests, the headers, the Prefer values and the
 * replies are the genuine article. What is NOT proved is that a real
 * Supabase project behaves identically, because
 * supabase/migrations/2026-09-21-learning.sql is a PROPOSAL that nobody has
 * applied. Nothing in this file reaches a real project, a real model or a
 * cent of spend.
 *
 * Every student, every plan and every answer below is SYNTHETIC.
 *
 * What is defended, in order:
 *   1. The same batch pushed twice is one set of rows, not two.
 *   2. Two devices of one account end up holding the same record, with no
 *      attempt counted twice.
 *   3. The plan conflict rule: a stale device is rejected, rebuilds from the
 *      winner, and the status SAYS the plan changed on another device rather
 *      than reconciling in silence (architecture risk 4).
 *   4. A confirmed plan on the account beats an unconfirmed one on a device.
 *   5. Two students on one browser are completely separate, including across
 *      a sign-out and a sign-in, and one student's queue is never sent under
 *      the other's token.
 *   6. Work done signed out is never uploaded by signing in.
 *   7. Vocabulary, notes and preferences travel and merge by their own rules.
 *   8. An offline queue survives a reload and drains exactly once.
 *   9. Learning tables that are not there degrade to this device only, with
 *      an honest status, no retry storm, and no effect on the old
 *      user_state sync.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  anonymousOwner,
  createLearnerStore,
  createPlanStore,
  learnerRecordKey,
  userOwner,
  type BrowserStorage,
  type LearnerStore,
  type PlanStore,
} from '../src/lib/learning/store.browser.ts';
import {
  createLearningSync,
  createRestTransport,
  looksLikeMissingTable,
  mergeNotesValue,
  mergePreferencesValue,
  mergeVocabValue,
  planOutranks,
  resolvePlanConflict,
  syncStateKey,
  type CompanionAdapter,
  type LearningSync,
  type SyncTransport,
} from '../src/lib/learning/sync.browser.ts';
import type { PersonalPlanV1 } from '../src/lib/learning/contracts/plan.ts';
import type { NotesStore } from '../src/lib/notes.ts';

/* ── The stand-in, in this process, on a free port ──────────────────────── */

process.env.MR_EZ_DEV_PORT = '0';
const dev = await import('../tools/mr-ez-dev-server.mjs');

if (!dev.server.listening) {
  await new Promise<void>((resolve, reject) => {
    dev.server.once('listening', () => resolve());
    dev.server.once('error', reject);
  });
}

const address = dev.server.address();
if (address === null || typeof address === 'string') {
  throw new Error('dev server did not report a bound port');
}
const base = `http://127.0.0.1:${address.port}`;

test.after(() => {
  dev.server.close();
});

interface Session {
  token: string;
  userId: string;
}

let emailCounter = 0;

/** A fresh account, or a second device on an existing one: signing up again
    with the same email hands back a new token and the same user id, exactly
    like opening the site in a second browser. */
async function signIn(email: string): Promise<Session> {
  const response = await fetch(`${base}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'synthetic-test-password-1' }),
  });
  assert.equal(response.status, 200, `sign-in for ${email} must succeed`);
  const body = (await response.json()) as { access_token: string; user: { id: string } };
  return { token: body.access_token, userId: body.user.id };
}

function freshEmail(label: string): string {
  emailCounter += 1;
  return `${label}-${emailCounter}@example.test`;
}

/** The REAL transport the browser uses, pointed at the stand-in. */
function transportFor(session: Session): SyncTransport {
  return createRestTransport({
    baseUrl: base,
    apiKey: 'local-anon-key',
    accessToken: async () => session.token,
  });
}

/* ── A browser, in a few lines of memory ────────────────────────────────── */

interface MemoryStore extends BrowserStorage {
  data: Map<string, string>;
  full: boolean;
}

function memoryStore(seed: Record<string, string> = {}): MemoryStore {
  const data = new Map<string, string>(Object.entries(seed));
  const store: MemoryStore = {
    data,
    full: false,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
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

/** Timers this test drives by hand, so nothing is waited on and nothing is
    left running when the file ends. */
function manualTimers() {
  const queued = new Map<number, () => void>();
  let next = 1;
  return {
    setTimer: (fn: () => void) => {
      const handle = next++;
      queued.set(handle, fn);
      return handle;
    },
    clearTimer: (handle: unknown) => {
      queued.delete(handle as number);
    },
    pending: () => queued.size,
    /** Fire everything waiting, once. */
    run: () => {
      const due = [...queued.entries()];
      queued.clear();
      for (const [, fn] of due) fn();
    },
  };
}

/* ── A synthetic plan ───────────────────────────────────────────────────── */

/** SYNTHETIC: a plan shaped like the real one, built by hand. This file
    tests how a plan TRAVELS, not how one is chosen, so the fields the
    planner fills with reasoning carry made-up placeholders. Everything the
    conflict rule and the stores actually read (revision, confirmed,
    updatedAt, goals, constraints, activeSession, history) is real. */
function syntheticPlan(over: Partial<PersonalPlanV1> = {}): PersonalPlanV1 {
  return {
    version: 1,
    revision: 1,
    evidenceVersion: 0,
    status: 'provisional',
    confirmed: false,
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
    goals: {
      overallTarget: { band: 7, status: 'provisional' },
      perPaperMinimums: {},
      examDate: null,
      route: 'academic',
      selfReported: [],
    },
    constraints: {
      regularDailyMinutes: 60,
      regularDailyMinutesStatus: 'provisional',
      studyDays: 'daily',
      explanationLocale: 'en',
      tzOffsetMinutes: 0,
    },
    activeSession: {
      id: 'session:synthetic-1',
      date: '2026-09-22',
      objective: 'Synthetic objective',
      objectiveScope: 'reading:matching-headings',
      paper: 'reading',
      subskill: 'matching-headings',
      reason: 'Synthetic reason',
      evidenceRefs: [],
      steps: [],
      budgetMinutes: 60,
      state: 'active',
    },
    schedule: [],
    milestones: [],
    alternatives: [],
    overrides: [],
    history: [],
    diagnosticsOutstanding: [],
    ...over,
  } as PersonalPlanV1;
}

/* ── One device of one student ──────────────────────────────────────────── */

interface Companions {
  vocab: { version: 1; settings: { newPerDay: number }; cards: Record<string, any> };
  notes: NotesStore;
  preferences: { locale?: string };
}

/** A device nobody has used yet: no review state, nothing saved, and no
    language CHOSEN (the site still shows one, but a fallback is not a
    choice and must not travel to the student's other devices). */
function emptyCompanions(): Companions {
  return {
    vocab: { version: 1, settings: { newPerDay: 10 }, cards: {} },
    notes: { version: 1, bookmarks: [], notes: {} },
    preferences: {},
  };
}

interface Device {
  storage: MemoryStore;
  learner: LearnerStore;
  plan: PlanStore;
  sync: LearningSync;
  companions: Companions;
  timers: ReturnType<typeof manualTimers>;
}

/** A whole browser for one student: its own storage, its own two stores, its
    own companion documents, and the real sync layer over the real
    transport. `storage` can be shared to model two students at one
    computer. */
function makeDevice(
  session: Session | null,
  options: {
    storage?: MemoryStore;
    transport?: SyncTransport | null;
    companions?: Companions;
    now?: () => string;
  } = {},
): Device {
  const storage = options.storage ?? memoryStore();
  const companions = options.companions ?? emptyCompanions();
  const now = options.now ?? (() => '2026-09-22T10:00:00.000Z');
  const timers = manualTimers();

  /* Both stores start out owned by this student, which is what a device
     that is already signed in looks like: work recorded here is theirs.
     Work recorded while signed OUT lives under a different owner entirely,
     which is its own test further down. */
  const owner = session ? userOwner(session.userId) : anonymousOwner('synthetic-device');
  const learner = createLearnerStore({
    storage,
    owner,
    now,
    /* The old stores are not part of what this file is testing, and a store
       that reaches for the real ones under Node would read nothing anyway.
       Said explicitly so the migration never runs here. */
    legacy: () => ({ progress: null, plan: null }),
  });
  const plan = createPlanStore({
    storage,
    owner,
    legacyPlan: { read: () => null, write: () => {} },
  });

  const adapters: CompanionAdapter<any>[] = [
    {
      kind: 'vocab',
      read: () => companions.vocab,
      write: (value) => {
        companions.vocab = value;
      },
      merge: mergeVocabValue,
      isEmpty: (value) => Object.keys(value.cards ?? {}).length === 0,
    },
    {
      kind: 'notes',
      read: () => companions.notes,
      write: (value) => {
        companions.notes = value;
      },
      merge: (local, remote) => mergeNotesValue(local, remote),
      isEmpty: (value) => value.bookmarks.length === 0 && Object.keys(value.notes).length === 0,
    },
    {
      kind: 'preferences',
      read: () => companions.preferences,
      write: (value) => {
        companions.preferences = value;
      },
      merge: mergePreferencesValue,
      isEmpty: (value) => value.locale === undefined,
    },
  ];

  const sync = createLearningSync({
    transport:
      options.transport !== undefined ? options.transport : session ? transportFor(session) : null,
    learnerStore: learner,
    planStore: plan,
    storage,
    now,
    companions: adapters,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });

  return { storage, learner, plan, sync, companions, timers };
}

/** SYNTHETIC: one answered question, recorded the way a real surface does. */
function recordAnswer(device: Device, id: string, at: string, correct = true): void {
  device.learner.recordLessonCheckAnswer({
    activityId: `lesson:synthetic-${id}`,
    subskill: 'matching-headings',
    at,
    paper: 'reading',
    item: { itemId: `item:${id}`, firstAnswer: correct ? 'B' : 'A', correct, assistance: 'none' },
  });
}

function eventIds(device: Device): string[] {
  return [...device.learner.read().events.map((event) => event.id)].sort();
}

async function storedEventCount(session: Session): Promise<number> {
  const response = await fetch(
    `${base}/rest/v1/learning_events?user_id=eq.${session.userId}&select=event_id`,
    { headers: { Authorization: `Bearer ${session.token}`, apikey: 'local-anon-key' } },
  );
  const rows = (await response.json()) as unknown[];
  return rows.length;
}

/* ── 1. Idempotent pushes ───────────────────────────────────────────────── */

test('the same batch pushed twice creates no duplicate rows and no duplicate attempts', async () => {
  const student = await signIn(freshEmail('sync-idempotent'));
  const device = makeDevice(student);

  recordAnswer(device, 'a', '2026-09-22T09:00:00.000Z');
  recordAnswer(device, 'b', '2026-09-22T09:05:00.000Z');

  await device.sync.start(student.userId);
  assert.equal(device.sync.status().state, 'synced');
  assert.equal(device.sync.status().pendingEvents, 0, 'nothing is left waiting after a clean sync');
  assert.equal(await storedEventCount(student), 2);

  /* A deliberate second push of the same work: a retry after a dropped
     connection, or a second tab doing the same thing at the same time. */
  await device.sync.reconcile();
  await device.sync.reconcile();

  assert.equal(await storedEventCount(student), 2, 'the account holds one copy of each event');
  assert.equal(device.learner.read().events.length, 2, 'and so does the device');
});

/* ── 2. Two devices of one account ──────────────────────────────────────── */

test('two devices of one account reconcile to the same record with no duplicate attempts', async () => {
  const email = freshEmail('sync-two-devices');
  const phone = await signIn(email);
  const laptop = await signIn(email);
  assert.equal(phone.userId, laptop.userId, 'two sign-ins on one email is one account');

  const onPhone = makeDevice(phone);
  const onLaptop = makeDevice(laptop);

  recordAnswer(onPhone, 'phone-1', '2026-09-22T09:00:00.000Z');
  recordAnswer(onLaptop, 'laptop-1', '2026-09-22T09:10:00.000Z');

  await onPhone.sync.start(phone.userId);
  await onLaptop.sync.start(laptop.userId);
  /* The phone has not heard about the laptop's work yet. */
  await onPhone.sync.reconcile();

  assert.deepEqual(eventIds(onPhone), eventIds(onLaptop), 'both devices hold the same record');
  assert.equal(onPhone.learner.read().events.length, 2);
  assert.equal(await storedEventCount(phone), 2, 'two pieces of work, two rows, nothing doubled');

  /* Recording the SAME work on both devices (the ids are derived from the
     content) must still be one row, which is what makes a shared session
     safe. */
  recordAnswer(onPhone, 'shared', '2026-09-22T11:00:00.000Z');
  recordAnswer(onLaptop, 'shared', '2026-09-22T11:00:00.000Z');
  await onPhone.sync.flush();
  await onLaptop.sync.flush();
  await onPhone.sync.reconcile();

  assert.equal(await storedEventCount(phone), 3);
  assert.equal(onPhone.learner.read().events.length, 3);
});

/* ── 3 and 4. The plan conflict rule ────────────────────────────────────── */

test('the conflict rule is confirmed, then revision, then updatedAt', () => {
  const unconfirmedHigh = syntheticPlan({ revision: 9, confirmed: false });
  const confirmedLow = syntheticPlan({ revision: 1, confirmed: true });
  assert.equal(planOutranks(confirmedLow, unconfirmedHigh), true, 'confirmed beats unconfirmed');
  assert.equal(planOutranks(unconfirmedHigh, confirmedLow), false);

  const older = syntheticPlan({ revision: 2 });
  const newer = syntheticPlan({ revision: 3 });
  assert.equal(planOutranks(newer, older), true, 'the higher revision wins');

  const early = syntheticPlan({ revision: 4, updatedAt: '2026-09-20T08:00:00.000Z' });
  const late = syntheticPlan({ revision: 4, updatedAt: '2026-09-21T08:00:00.000Z' });
  assert.equal(planOutranks(late, early), true, 'the later updatedAt breaks an exact tie');

  const resolution = resolvePlanConflict(
    syntheticPlan({ revision: 1, history: [{ at: '2026-09-20T09:00:00.000Z', trigger: 'initial', summary: 'Synthetic local entry', fromRevision: 0, toRevision: 1 }] }),
    syntheticPlan({ revision: 5 }),
  );
  assert.equal(resolution.winner, 'server');
  assert.equal(resolution.replacedLocal, true, 'a genuinely different plan is news the student is told');
  assert.equal(resolution.plan?.history.length, 1, "the loser's change history is kept");
});

test('an older-revision plan is rejected, that device rebuilds from the winner, and the status says so', async () => {
  const email = freshEmail('sync-stale-plan');
  const good = await signIn(email);
  const stale = await signIn(email);

  const onGood = makeDevice(good);
  const onStale = makeDevice(stale);

  /* The up-to-date device saves revision 3 and sends it. */
  onGood.plan.save(syntheticPlan({ revision: 3, updatedAt: '2026-09-22T09:00:00.000Z' }));
  await onGood.sync.start(good.userId);
  assert.equal(onGood.sync.status().state, 'synced');
  assert.equal(onGood.sync.status().planPending, false);

  /* The stale device still believes in revision 1. */
  onStale.plan.save(syntheticPlan({ revision: 1, updatedAt: '2026-09-21T09:00:00.000Z' }));
  await onStale.sync.start(stale.userId);

  assert.equal(onStale.plan.read()?.revision, 3, 'the stale device rebuilt from the winner');
  const status = onStale.sync.status();
  assert.equal(status.state, 'conflict', 'and is not shown a plain tick');
  assert.ok(status.planChangedElsewhereAt, 'the interface is told the plan changed on another device');

  /* The message waits for the student rather than for the next request. */
  await onStale.sync.reconcile();
  assert.equal(onStale.sync.status().state, 'conflict');
  onStale.sync.acknowledgePlanChange();
  assert.equal(onStale.sync.status().state, 'synced');
  assert.equal(onStale.sync.status().planChangedElsewhereAt, undefined);
});

test('a confirmed plan on the account beats an unconfirmed one on the device', async () => {
  const email = freshEmail('sync-confirmed-plan');
  const settled = await signIn(email);
  const fresh = await signIn(email);

  const onSettled = makeDevice(settled);
  onSettled.plan.save(
    syntheticPlan({ revision: 2, confirmed: true, status: 'active', updatedAt: '2026-09-20T09:00:00.000Z' }),
  );
  await onSettled.sync.start(settled.userId);
  assert.equal(onSettled.sync.status().state, 'synced');

  /* A brand new device with a much higher revision, but nothing the student
     ever confirmed. It must lose. */
  const onFresh = makeDevice(fresh);
  onFresh.plan.save(
    syntheticPlan({ revision: 40, confirmed: false, updatedAt: '2026-09-25T09:00:00.000Z' }),
  );
  await onFresh.sync.start(fresh.userId);

  assert.equal(onFresh.plan.read()?.confirmed, true, 'the confirmed plan is the one that stands');
  assert.equal(onFresh.plan.read()?.revision, 2);
  assert.ok(onFresh.sync.status().planChangedElsewhereAt, 'and the student is told why their plan changed');
});

/* ── 5. Two students, one browser ───────────────────────────────────────── */

test('two students on one browser are completely separate, across sign-out and sign-in', async () => {
  const shared = memoryStore();
  const studentA = await signIn(freshEmail('sync-student-a'));
  const studentB = await signIn(freshEmail('sync-student-b'));

  const deviceA = makeDevice(studentA, { storage: shared });
  recordAnswer(deviceA, 'a-only', '2026-09-22T09:00:00.000Z');
  await deviceA.sync.start(studentA.userId);
  assert.equal(await storedEventCount(studentA), 1);

  /* Student A signs out. Everything of theirs is in the account, so the
     cached copy on this machine goes with them. */
  await deviceA.sync.stop({ forget: true });
  assert.equal(
    shared.getItem(learnerRecordKey(userOwner(studentA.userId))),
    null,
    "student A's record is not left readable on a shared machine",
  );
  assert.equal(deviceA.learner.read().events.length, 0, 'and nothing of theirs is still in memory');
  assert.equal(deviceA.sync.status().state, 'signed-out');

  /* Student B signs in on the same browser. */
  const deviceB = makeDevice(studentB, { storage: shared });
  recordAnswer(deviceB, 'b-only', '2026-09-22T10:00:00.000Z');
  await deviceB.sync.start(studentB.userId);

  assert.equal(deviceB.learner.read().events.length, 1, "student B sees only student B's work");
  assert.equal(await storedEventCount(studentB), 1);
  assert.equal(await storedEventCount(studentA), 1, "and nothing of student B's reached student A");

  /* Student A signs back in and finds their own work again, from the
     account. */
  const deviceAAgain = makeDevice(studentA, { storage: shared });
  await deviceAAgain.sync.start(studentA.userId);
  const idsA = eventIds(deviceAAgain);
  assert.equal(idsA.length, 1);
  assert.equal(
    deviceAAgain.learner.read().events[0]?.activityId,
    'lesson:synthetic-a-only',
    "student A's own work comes back, and only theirs",
  );
});

test("one student's queue is never sent under another student's token", async () => {
  const shared = memoryStore();
  const studentA = await signIn(freshEmail('sync-queue-a'));
  const studentB = await signIn(freshEmail('sync-queue-b'));

  /* Student A works with no connection at all, so the queue is left full. */
  const offlineTransport: SyncTransport = {
    get: async () => ({ status: 0, body: null, offline: true }),
    post: async () => ({ status: 0, body: null, offline: true }),
  };
  const deviceA = makeDevice(studentA, { storage: shared, transport: offlineTransport });
  recordAnswer(deviceA, 'stranded', '2026-09-22T09:00:00.000Z');
  await deviceA.sync.start(studentA.userId);
  assert.equal(deviceA.sync.status().state, 'offline');
  assert.equal(deviceA.sync.status().pendingEvents, 1, 'one change waiting');

  /* Signing out with work still waiting KEEPS it: losing a student's work is
     the worse of the two mistakes, and the key carries their name so no
     other session can read it. */
  await deviceA.sync.stop({ forget: true });
  assert.notEqual(shared.getItem(learnerRecordKey(userOwner(studentA.userId))), null);

  /* Student B signs in, with a real connection. Student A's queue must not
     follow. */
  const deviceB = makeDevice(studentB, { storage: shared });
  await deviceB.sync.start(studentB.userId);
  assert.equal(await storedEventCount(studentB), 0, "nothing of student A's is in student B's account");
  assert.equal(await storedEventCount(studentA), 0, "and it was not sent under student B's token either");
  assert.equal(deviceB.learner.read().events.length, 0);
});

/* ── 6. Anonymous work ──────────────────────────────────────────────────── */

test('work done signed out is not uploaded by signing in', async () => {
  const shared = memoryStore();
  const student = await signIn(freshEmail('sync-anonymous'));

  /* Signed out: the record lives under anon:<deviceId>. */
  const anonymous = createLearnerStore({
    storage: shared,
    owner: anonymousOwner('synthetic-device'),
    now: () => '2026-09-22T08:00:00.000Z',
    legacy: () => ({ progress: null, plan: null }),
  });
  anonymous.recordLessonCheckAnswer({
    activityId: 'lesson:synthetic-anonymous',
    subskill: 'matching-headings',
    at: '2026-09-22T08:00:00.000Z',
    item: { itemId: 'item:anonymous', firstAnswer: 'B', correct: true, assistance: 'none' },
  });
  assert.equal(anonymous.read().events.length, 1);

  const device = makeDevice(student, { storage: shared });
  await device.sync.start(student.userId);

  assert.equal(await storedEventCount(student), 0, 'signing in uploads nothing that was done signed out');
  assert.equal(device.learner.read().events.length, 0, 'and does not merge it into the account either');
  assert.equal(
    anonymous.reload().events.length,
    1,
    'the anonymous work is untouched, waiting for the explicit claim flow',
  );
});

/* ── 7. Companions ──────────────────────────────────────────────────────── */

test('vocabulary merges per word, and an interval never goes backwards because of an older device', () => {
  const older = {
    version: 1 as const,
    settings: { newPerDay: 5 },
    cards: {
      improve: {
        ease: 2.5,
        interval: 1,
        due: '2026-09-21',
        reps: 1,
        lapses: 2,
        introducedDate: '2026-09-10',
        lastReviewed: '2026-09-20T09:00:00.000Z',
      },
      only_here: {
        ease: 2.5,
        interval: 0,
        due: '2026-09-22',
        reps: 0,
        lapses: 0,
        introducedDate: '2026-09-22',
      },
    },
  };
  const newer = {
    version: 1 as const,
    settings: { newPerDay: 20 },
    cards: {
      improve: {
        ease: 2.6,
        interval: 6,
        due: '2026-09-28',
        reps: 2,
        lapses: 0,
        introducedDate: '2026-09-12',
        lastReviewed: '2026-09-22T09:00:00.000Z',
      },
    },
  };

  const merged = mergeVocabValue(older, newer, '2026-09-20T00:00:00.000Z', '2026-09-22T00:00:00.000Z');
  assert.equal(merged.cards.improve?.interval, 6, 'the later review is the one that stands');
  assert.equal(merged.cards.improve?.introducedDate, '2026-09-10', 'a word is never re-dated as new');
  assert.equal(merged.cards.improve?.lapses, 2, 'the honest lapse count is the higher one');
  assert.ok(merged.cards.only_here, 'a word only one device knows about is kept');
  assert.equal(merged.settings.newPerDay, 20, 'a setting with no clock follows the newer document');

  /* The same pair the other way round gives the same answer, which is what
     makes two devices safe whatever order they sync in. */
  const other = mergeVocabValue(newer, older, '2026-09-22T00:00:00.000Z', '2026-09-20T00:00:00.000Z');
  assert.equal(other.cards.improve?.interval, 6);
  assert.equal(other.settings.newPerDay, 20);
});

test('two devices that each recalled a word on a different day keep both days', () => {
  /* A word counts as KNOWN once it has been recalled unassisted on two
     different days (isWordKnown in src/lib/vocab-review.ts). Recall it on
     the laptop on Monday and on the phone on Tuesday and that is two
     different days, so the word is known. The merge used to take one
     device's card wholesale, which threw one of the two days away and
     under-counted what the student could really do. Both lists are
     unioned, de-duplicated and sorted, exactly like the lapse count. */
  const laptop = {
    version: 1 as const,
    settings: { newPerDay: 10 },
    cards: {
      resilient: {
        ease: 2.5,
        interval: 3,
        due: '2026-09-24',
        reps: 1,
        lapses: 0,
        introducedDate: '2026-09-18',
        lastReviewed: '2026-09-21T09:00:00.000Z',
        recallSuccessDates: ['2026-09-21'],
      },
    },
  };
  const phone = {
    version: 1 as const,
    settings: { newPerDay: 10 },
    cards: {
      resilient: {
        ease: 2.5,
        interval: 4,
        due: '2026-09-26',
        reps: 2,
        lapses: 0,
        introducedDate: '2026-09-18',
        lastReviewed: '2026-09-22T09:00:00.000Z',
        recallSuccessDates: ['2026-09-22'],
      },
    },
  };

  const merged = mergeVocabValue(laptop, phone, '2026-09-21T10:00:00.000Z', '2026-09-22T10:00:00.000Z');
  assert.deepEqual(merged.cards.resilient?.recallSuccessDates, ['2026-09-21', '2026-09-22']);

  /* Whichever order they sync in, and however many times they sync. */
  const reversed = mergeVocabValue(phone, laptop, '2026-09-22T10:00:00.000Z', '2026-09-21T10:00:00.000Z');
  assert.deepEqual(reversed.cards.resilient?.recallSuccessDates, ['2026-09-21', '2026-09-22']);
  const again = mergeVocabValue(merged, phone, '2026-09-22T11:00:00.000Z', '2026-09-22T10:00:00.000Z');
  assert.deepEqual(again.cards.resilient?.recallSuccessDates, ['2026-09-21', '2026-09-22']);

  /* The same day on both devices is still one day. */
  const sameDay = mergeVocabValue(
    { ...laptop, cards: { resilient: { ...laptop.cards.resilient, recallSuccessDates: ['2026-09-22'] } } },
    phone,
    '2026-09-22T10:00:00.000Z',
    '2026-09-22T10:00:00.000Z',
  );
  assert.deepEqual(sameDay.cards.resilient?.recallSuccessDates, ['2026-09-22']);

  /* A store written before the field existed still merges, and stays
     without it rather than gaining an empty list. */
  const oldShape = {
    version: 1 as const,
    settings: { newPerDay: 10 },
    cards: {
      resilient: {
        ease: 2.5,
        interval: 1,
        due: '2026-09-20',
        reps: 1,
        lapses: 1,
        introducedDate: '2026-09-18',
        lastReviewed: '2026-09-19T09:00:00.000Z',
      },
    },
  };
  const mixed = mergeVocabValue(oldShape, phone, '2026-09-19T10:00:00.000Z', '2026-09-22T10:00:00.000Z');
  assert.deepEqual(mixed.cards.resilient?.recallSuccessDates, ['2026-09-22']);
  assert.equal(mixed.cards.resilient?.lapses, 1, 'and the lapse the old device counted still stands');
  const bothOld = mergeVocabValue(oldShape, oldShape, '2026-09-19T10:00:00.000Z', '2026-09-19T10:00:00.000Z');
  assert.equal(bothOld.cards.resilient?.recallSuccessDates, undefined);

  /* A lapse on the newer device still shortens the interval: the winner's
     interval stands, it is never the larger of the two. */
  const lapsed = {
    ...phone,
    cards: {
      resilient: { ...phone.cards.resilient, interval: 0, lapses: 1, lastReviewed: '2026-09-23T09:00:00.000Z' },
    },
  };
  const afterLapse = mergeVocabValue(laptop, lapsed, '2026-09-21T10:00:00.000Z', '2026-09-23T10:00:00.000Z');
  assert.equal(afterLapse.cards.resilient?.interval, 0, 'a failed review is not undone by the other device');
});

test('notes and saved lessons merge by their own keys, later wins', () => {
  const local: NotesStore = {
    version: 1,
    bookmarks: [
      { kind: 'lesson', id: 'reading-headings', title: 'Old title', href: '/a', savedAt: '2026-09-20T09:00:00.000Z' },
    ],
    notes: { 'reading-headings': { text: 'first thought', updatedAt: '2026-09-20T09:00:00.000Z' } },
  };
  const remote: NotesStore = {
    version: 1,
    bookmarks: [
      { kind: 'lesson', id: 'reading-headings', title: 'New title', href: '/a', savedAt: '2026-09-22T09:00:00.000Z' },
      { kind: 'question', id: 'q-1', title: 'A question', href: '/b', savedAt: '2026-09-21T09:00:00.000Z' },
    ],
    notes: { 'reading-headings': { text: 'second thought', updatedAt: '2026-09-22T09:00:00.000Z' } },
  };

  const merged = mergeNotesValue(local, remote);
  assert.equal(merged.bookmarks.length, 2, 'both saved lessons survive the union');
  assert.equal(
    merged.bookmarks.find((bookmark) => bookmark.id === 'reading-headings')?.title,
    'New title',
    'the later save wins for the same lesson',
  );
  assert.equal(merged.notes['reading-headings']?.text, 'second thought', 'and so does the later note');
});

test('preferences follow the document the student changed more recently', () => {
  const merged = mergePreferencesValue({ locale: 'en' }, { locale: 'ru' }, '2026-09-20T00:00:00.000Z', '2026-09-22T00:00:00.000Z');
  assert.deepEqual(merged, { locale: 'ru' });
  const other = mergePreferencesValue({ locale: 'en' }, { locale: 'ru' }, '2026-09-23T00:00:00.000Z', '2026-09-22T00:00:00.000Z');
  assert.deepEqual(other, { locale: 'en' });
});

test('vocabulary, notes and preferences travel between two devices of one account', async () => {
  const email = freshEmail('sync-companions');
  const first = await signIn(email);
  const second = await signIn(email);

  const onFirst = makeDevice(first, {
    companions: {
      vocab: {
        version: 1,
        settings: { newPerDay: 20 },
        cards: {
          improve: {
            ease: 2.6,
            interval: 6,
            due: '2026-09-28',
            reps: 2,
            lapses: 0,
            introducedDate: '2026-09-12',
            lastReviewed: '2026-09-22T09:00:00.000Z',
          },
        },
      },
      notes: {
        version: 1,
        bookmarks: [
          { kind: 'lesson', id: 'reading-headings', title: 'Headings', href: '/a', savedAt: '2026-09-22T09:00:00.000Z' },
        ],
        notes: { 'reading-headings': { text: 'read the first sentence', updatedAt: '2026-09-22T09:00:00.000Z' } },
      },
      preferences: { locale: 'ru' },
    },
  });
  await onFirst.sync.start(first.userId);
  assert.equal(onFirst.sync.status().state, 'synced');

  /* A second, empty device. An empty store must never push its blank
     settings over the account's real ones. */
  const onSecond = makeDevice(second);
  await onSecond.sync.start(second.userId);

  assert.equal(onSecond.companions.vocab.cards.improve?.interval, 6, 'the review state arrived');
  assert.equal(onSecond.companions.vocab.settings.newPerDay, 20, 'and so did the setting');
  assert.equal(onSecond.companions.notes.bookmarks.length, 1, 'the saved lesson arrived');
  assert.equal(onSecond.companions.notes.notes['reading-headings']?.text, 'read the first sentence');
  assert.equal(onSecond.companions.preferences.locale, 'ru', 'and the interface language');

  /* A word reviewed on the second device reaches the first. */
  onSecond.companions.vocab = {
    version: 1,
    settings: onSecond.companions.vocab.settings,
    cards: {
      ...onSecond.companions.vocab.cards,
      mitigate: {
        ease: 2.5,
        interval: 1,
        due: '2026-09-24',
        reps: 1,
        lapses: 0,
        introducedDate: '2026-09-23',
        lastReviewed: '2026-09-23T09:00:00.000Z',
      },
    },
  };
  await onSecond.sync.reconcile();
  await onFirst.sync.reconcile();
  assert.ok(onFirst.companions.vocab.cards.mitigate, 'the new word came back to the first device');
  assert.equal(onFirst.companions.vocab.cards.improve?.interval, 6, 'without disturbing what was already there');
});

/* ── 8. Offline ─────────────────────────────────────────────────────────── */

test('an offline queue survives a reload and drains exactly once when the connection returns', async () => {
  const student = await signIn(freshEmail('sync-offline'));
  const storage = memoryStore();

  let online = false;
  const live = transportFor(student);
  const flaky: SyncTransport = {
    get: (path) => (online ? live.get(path) : Promise.resolve({ status: 0, body: null, offline: true })),
    post: (path, body, prefer) =>
      online ? live.post(path, body, prefer) : Promise.resolve({ status: 0, body: null, offline: true }),
  };

  const before = makeDevice(student, { storage, transport: flaky });
  recordAnswer(before, 'offline-1', '2026-09-22T09:00:00.000Z');
  recordAnswer(before, 'offline-2', '2026-09-22T09:05:00.000Z');
  await before.sync.start(student.userId);

  const offlineStatus = before.sync.status();
  assert.equal(offlineStatus.state, 'offline');
  assert.equal(offlineStatus.pendingEvents, 2, 'two changes waiting, stated plainly');
  assert.ok(before.timers.pending() > 0, 'a retry is scheduled');
  assert.equal(await storedEventCount(student), 0);

  /* The queue is on the device, not in this object. */
  const queued = storage.getItem(syncStateKey(userOwner(student.userId)));
  assert.ok(queued, 'the queue is written where a reload can find it');
  assert.equal((JSON.parse(queued) as { pending: string[] }).pending.length, 2);

  /* Close the tab and open it again: a brand new sync layer over the same
     storage, still offline. */
  before.timers.run();
  const after = makeDevice(student, { storage, transport: flaky });
  await after.sync.start(student.userId);
  assert.equal(after.sync.status().pendingEvents, 2, 'the queue survived the reload');
  assert.equal(after.learner.read().events.length, 2, 'and so did the work itself');

  /* The connection comes back. */
  online = true;
  after.timers.run();
  await after.sync.flush();

  assert.equal(after.sync.status().state, 'synced');
  assert.equal(after.sync.status().pendingEvents, 0);
  assert.equal(await storedEventCount(student), 2, 'each waiting change was sent exactly once');

  /* And nothing is re-sent afterwards. */
  await after.sync.reconcile();
  assert.equal(await storedEventCount(student), 2);
});

test('pending grading is counted apart from pending sync', async () => {
  const student = await signIn(freshEmail('sync-pending-grading'));
  const device = makeDevice(student);

  device.learner.recordWritingGraded({
    activityId: 'writing:synthetic-task-2',
    at: '2026-09-22T09:00:00.000Z',
    task: 'task2',
    overallBand: 0,
    criteria: {},
    grader: { name: 'synthetic-pending', live: false },
    pendingGrading: true,
  });

  await device.sync.start(student.userId);
  const status = device.sync.status();
  assert.equal(status.state, 'synced');
  assert.equal(status.pendingEvents, 0, 'the work itself has reached the account');
  assert.equal(status.pendingGrading, 1, 'but something is still waiting to be marked, which is not a sync problem');
});

/* ── 9. No tables ───────────────────────────────────────────────────────── */

test('missing learning tables degrade to this device only, with no retry storm', async () => {
  const student = await signIn(freshEmail('sync-no-tables'));

  /* The one shape the local stand-in cannot produce: it serves all three
     tables. This is what a real Supabase project WITHOUT the proposed
     migration answers, taken from PostgREST's own error body. */
  let requests = 0;
  const noTables: SyncTransport = {
    get: async () => {
      requests += 1;
      return {
        status: 404,
        body: { code: 'PGRST205', message: "Could not find the table 'public.learning_events' in the schema cache" },
      };
    },
    post: async () => {
      requests += 1;
      return {
        status: 404,
        body: { code: 'PGRST205', message: "Could not find the table 'public.learning_events' in the schema cache" },
      };
    },
  };

  const device = makeDevice(student, { transport: noTables });
  recordAnswer(device, 'local-only', '2026-09-22T09:00:00.000Z');
  await device.sync.start(student.userId);

  const status = device.sync.status();
  assert.equal(status.state, 'error');
  assert.equal(status.error, 'not-configured');
  assert.equal(status.unavailable, true, 'the interface can say "sync unavailable" rather than showing an error');
  assert.equal(device.timers.pending(), 0, 'nothing is scheduled to try again: no table will appear by retrying');

  /* The work is still there, and still recorded, which is the whole point of
     degrading rather than failing. */
  assert.equal(device.learner.read().events.length, 1);
  assert.equal(device.learner.status().persistence, 'saved-locally');

  const seen = requests;
  recordAnswer(device, 'local-only-2', '2026-09-22T09:10:00.000Z');
  device.timers.run();
  assert.equal(requests, seen, 'and recording more work does not start it asking again');

  /* The old user_state sync is untouched by any of this: it is a different
     table, a different code path, and it still answers. */
  const oldSync = await fetch(`${base}/rest/v1/user_state`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${student.token}`,
      apikey: 'local-anon-key',
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({ user_id: student.userId, progress: { version: 1 }, study_plan: null }),
  });
  assert.equal(oldSync.status, 201, 'the pre-existing user_state sync keeps working exactly as it did');
});

test('a missing table is told apart from being offline', () => {
  assert.equal(looksLikeMissingTable({ status: 0, body: null, offline: true }), false);
  assert.equal(looksLikeMissingTable({ status: 404, body: null }), true);
  assert.equal(
    looksLikeMissingTable({ status: 400, body: { code: '42P01', message: 'relation "public.learning_events" does not exist' } }),
    true,
  );
  assert.equal(looksLikeMissingTable({ status: 500, body: { message: 'something else' } }), false);
});

/* ── The old sync is still the old sync ─────────────────────────────────── */

test('the existing user_state sync is extended, not replaced', async () => {
  const source = readFileSync(fileURLToPath(new URL('../src/lib/auth/sync.ts', import.meta.url)), 'utf8');

  /* The four things the old sync did, still spelled out in the same file:
     pull the row, union-merge both stores, write the merge back, push it,
     and debounce later local writes. */
  for (const fragment of [
    "from('user_state')",
    'mergeProgress(getProgress()',
    'mergeStudyPlans(loadStudyPlan()',
    'replaceProgress(mergedProgress)',
    'onProgressChange(onChange)',
    'onStudyPlanChange(onChange)',
    'setTimeout(() => void push(userId), 1500)',
  ]) {
    assert.ok(source.includes(fragment), `the old sync still does: ${fragment}`);
  }

  /* And the module still presents exactly the two functions the account
     widgets import, and stopSync is still safe to call with nobody signed
     in. */
  const auth = await import('../src/lib/auth/sync.ts');
  assert.equal(typeof auth.startSyncForUser, 'function');
  assert.equal(typeof auth.stopSync, 'function');
  auth.stopSync();
  auth.stopSync();
});
