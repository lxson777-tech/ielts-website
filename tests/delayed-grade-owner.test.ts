/* A grade that comes back late belongs to the student who took the test.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/delayed-grade-owner.test.ts
 *
 * WHY THIS FILE EXISTS (finding R2-02 of the second Codex inspection)
 * An essay or a spoken answer is sent away to be graded and comes back
 * seconds, sometimes a minute, later. The writing trainer, the speaking
 * trainer and the live examiner (standalone, and embedded as the mock exam's
 * Speaking leg) used to write whatever came back into whoever the CURRENT
 * owner was when it arrived. If student A's grade was still on its way when
 * another tab signed A out and B in, A's band and report landed in B's
 * history, and the mock's examiner reported A's result into B's sitting.
 *
 * The fix binds every grading request to the owner it was started for
 * (bindToCurrentOwner in src/lib/store-owner.ts) and settles it through one
 * function (runOwnedGrade): the grade is KEPT under that owner whatever has
 * happened since, and it is SHOWN (and a completion callback runs) only while
 * that owner is still the one on screen and the screen has not let go.
 *
 * WHAT IS SIMULATED, AND WHAT IS NOT
 * Simulated: the graders. Every grade below is a SYNTHETIC object handed back
 * by a promise this file resolves by hand, at the moment it chooses, so no
 * grader, no model and no network is involved and nothing is paid for. The
 * browser store is a Map behind a `window.localStorage`. Everything else is
 * the shipping code: the owner, the old progress store, the learner record,
 * and the explicit-owner writers the three components now call. The keep
 * steps below are the components' own two writes, in the components' own
 * order; the source scan at the end pins that the components really do write
 * only through these, and complete a mock only from the "show" step.
 *
 * Every student, prompt and band here is SYNTHETIC.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* A browser, in a few lines                                           */
/* ------------------------------------------------------------------ */

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

let storage = memoryStorage();

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

const storeOwner = await import('../src/lib/store-owner.ts');
const progress = await import('../src/lib/progress.ts');
const learner = await import('../src/lib/learning/store.browser.ts');

import type { CacheOwner } from '../src/lib/learning/contracts/sync.ts';

/* ------------------------------------------------------------------ */
/* SYNTHETIC students, grades, and a grader that answers on cue        */
/* ------------------------------------------------------------------ */

const A = storeOwner.userOwner('SYNTHETIC-STUDENT-A');
const B = storeOwner.userOwner('SYNTHETIC-STUDENT-B');

const A_TOPIC = 'SYNTHETIC cue card spoken by student A';
const A_ESSAY = 'SYNTHETIC essay, written by student A and nobody else.';
const A_PROMPT = 'SYNTHETIC-prompt-a';

interface SyntheticGrade {
  overallBand: number;
  criteria: Record<string, number>;
  grader: { name: string; live: boolean };
}

const SPEAKING_GRADE: SyntheticGrade = {
  overallBand: 6.5,
  criteria: { fluencyCoherence: 7, lexicalResource: 6, grammaticalRange: 6, pronunciation: 7 },
  grader: { name: 'SYNTHETIC grader (this test file)', live: false },
};

const ESSAY_GRADE: SyntheticGrade = {
  overallBand: 7,
  criteria: { taskResponse: 7, coherenceCohesion: 7, lexicalResource: 7, grammaticalRange: 7 },
  grader: { name: 'SYNTHETIC grader (this test file)', live: false },
};

/** A grading request that has gone out and not come back. */
function pendingGrade<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Sign-in, account switch or sign-out (null), the way the account layer
    moves every store: the shared owner first, then the learner record. */
function signInAs(owner: CacheOwner | null): void {
  storeOwner.setCurrentOwner(owner);
  learner.setLearnerOwner(owner);
}

function freshDevice(): void {
  learner.resetLearningStoresForTest();
  storage = memoryStorage();
}

/* The two writes each component makes in its keep step, in the same order
   (evidence first, then the older store's row), through the same
   explicit-owner writers. */

function keepSpeaking(grade: SyntheticGrade, owner: CacheOwner, at: string): void {
  learner.recordSpeakingGradedFor(owner, {
    activityId: 'speak:SYNTHETIC-cue-card',
    paper: 'speaking',
    promptId: 'SYNTHETIC-cue-card',
    part: 2,
    at,
    overallBand: grade.overallBand,
    criteria: grade.criteria,
    grader: grade.grader,
    legacyRef: { store: 'speaking', key: 'part2', at },
  });
  progress.recordSpeakingAttemptFor(owner, {
    at,
    mode: 'part2',
    topic: A_TOPIC,
    overallBand: grade.overallBand,
    criteria: grade.criteria,
    live: grade.grader.live,
  });
}

function keepEssay(grade: SyntheticGrade, owner: CacheOwner, at: string): void {
  learner.recordWritingGradedFor(owner, {
    activityId: `write:${A_PROMPT}`,
    paper: 'writing',
    promptId: A_PROMPT,
    task: 'task2',
    at,
    overallBand: grade.overallBand,
    criteria: grade.criteria,
    wordCount: 263,
    grader: grade.grader,
    legacyRef: { store: 'writing', key: A_PROMPT, at },
  });
  progress.recordWritingAttemptFor(owner, A_PROMPT, {
    at,
    overallBand: grade.overallBand,
    criteria: grade.criteria,
    wordCount: 263,
    live: grade.grader.live,
    essay: A_ESSAY,
    promptTitle: 'SYNTHETIC prompt title',
    task: 'task2',
  });
}

/** The learner record events one owner holds on this device, read straight
    out of storage rather than through the shared store. */
function recordEventsOf(owner: CacheOwner): { activityId: string; at: string }[] {
  const raw = storage.data.get(learner.learnerRecordKey(owner));
  if (!raw) return [];
  return (JSON.parse(raw) as { events: { activityId: string; at: string }[] }).events;
}

/** Every key on this device whose value carries a piece of A's work. */
function keysCarrying(marks: readonly string[]): string[] {
  const found: string[] = [];
  for (const [key, value] of storage.data) {
    if (marks.some((mark) => value.includes(mark))) found.push(key);
  }
  return found.sort();
}

function namespaceOf(owner: CacheOwner): string {
  return storeOwner.ownerNamespace(owner);
}

/* ------------------------------------------------------------------ */
/* 1. A switch to B while A's grade is on its way                      */
/* ------------------------------------------------------------------ */

test('a speaking grade that arrives after A switched to B is kept for A and never written under B', async () => {
  freshDevice();
  signInAs(A);

  const grader = pendingGrade<SyntheticGrade>();
  const binding = storeOwner.bindToCurrentOwner();
  const at = '2026-09-23T10:00:00.000Z';
  const shown: SyntheticGrade[] = [];
  const hidden: SyntheticGrade[] = [];
  const settling = storeOwner.runOwnedGrade(binding, () => grader.promise, {
    keep: (grade, owner) => keepSpeaking(grade, owner, at),
    show: (grade) => shown.push(grade),
    hide: (grade) => hidden.push(grade),
  });

  /* Another tab signs A out and B in while the grader is still working. */
  signInAs(B);
  const bNotifications = { record: 0, progress: 0 };
  const offRecord = learner.onLearnerRecordChange(() => (bNotifications.record += 1));
  const offProgress = progress.onProgressChange(() => (bNotifications.progress += 1));

  grader.resolve(SPEAKING_GRADE);
  const outcome = await settling;
  offRecord();
  offProgress();

  assert.equal(outcome, 'owner-changed');
  assert.deepEqual(shown, [], "A's result was shown on a page that belongs to B now");
  assert.equal(hidden.length, 1, 'the page was not told that its attempt went elsewhere');

  /* Nothing of A's under B: not in B's record, not in B's history. */
  assert.deepEqual(recordEventsOf(B), [], "A's speaking evidence was written into B's record");
  assert.deepEqual(progress.getSpeakingAttempts(), [], "A's speaking attempt shows in B's history");
  assert.deepEqual(
    keysCarrying([A_TOPIC]).filter((key) => key.includes(namespaceOf(B))),
    [],
    "a key of B's carries A's speaking attempt",
  );
  assert.deepEqual(bNotifications, { record: 0, progress: 0 }, "B's stores were nudged by a write that is not theirs");

  /* Kept for A, exactly once, in both places. */
  assert.deepEqual(
    recordEventsOf(A).map((event) => [event.activityId, event.at]),
    [['speak:SYNTHETIC-cue-card', at]],
  );
  assert.equal(progress.getProgressFor(A).speaking.length, 1);
  assert.equal(progress.getProgressFor(A).speaking[0]?.topic, A_TOPIC);

  /* And A finds it on signing back in. */
  signInAs(A);
  assert.deepEqual(
    progress.getSpeakingAttempts().map((attempt) => attempt.topic),
    [A_TOPIC],
  );
  assert.deepEqual(
    learner.readLearnerRecord().events.filter((event) => event.paper === 'speaking').map((event) => event.at),
    [at],
  );
});

test('an essay grade that arrives after A switched to B is kept for A and never written under B', async () => {
  freshDevice();
  signInAs(A);

  const grader = pendingGrade<SyntheticGrade>();
  const binding = storeOwner.bindToCurrentOwner();
  const at = '2026-09-23T11:00:00.000Z';
  let shown = 0;
  const settling = storeOwner.runOwnedGrade(binding, () => grader.promise, {
    keep: (grade, owner) => keepEssay(grade, owner, at),
    show: () => (shown += 1),
  });

  signInAs(B);
  grader.resolve(ESSAY_GRADE);
  assert.equal(await settling, 'owner-changed');
  assert.equal(shown, 0);

  assert.deepEqual(recordEventsOf(B), []);
  assert.deepEqual(progress.getWritingAttempts(), [], "A's essay shows in B's writing history");
  assert.deepEqual(
    keysCarrying([A_ESSAY, A_PROMPT]).filter((key) => key.includes(namespaceOf(B))),
    [],
    "a key of B's carries A's essay",
  );

  assert.equal(progress.getProgressFor(A).writing[A_PROMPT]?.[0]?.essay, A_ESSAY);
  assert.deepEqual(
    recordEventsOf(A).map((event) => event.activityId),
    [`write:${A_PROMPT}`],
  );

  signInAs(A);
  assert.deepEqual(
    progress.getWritingAttempts().map(({ attempt }) => attempt.essay),
    [A_ESSAY],
  );
});

test('a grade started signed out and arriving after a sign-in stays with this device, not the account', async () => {
  freshDevice();
  signInAs(null);
  const device = storeOwner.currentOwner();
  assert.equal(device.kind, 'anonymous');

  const grader = pendingGrade<SyntheticGrade>();
  const binding = storeOwner.bindToCurrentOwner();
  const settling = storeOwner.runOwnedGrade(binding, () => grader.promise, {
    keep: (grade, owner) => keepSpeaking(grade, owner, '2026-09-23T12:00:00.000Z'),
  });

  signInAs(A);
  grader.resolve(SPEAKING_GRADE);
  assert.equal(await settling, 'owner-changed');

  /* It went where the work was done: the signed-out device owner, from where
     the ordinary "work saved on this device" claim can bring it across on
     purpose. It did not quietly become the account's. */
  assert.equal(recordEventsOf(device).length, 1);
  assert.deepEqual(recordEventsOf(A), []);
  assert.deepEqual(progress.getSpeakingAttempts(), []);
  assert.equal(progress.getProgressFor(device).speaking.length, 1);
});

/* ------------------------------------------------------------------ */
/* 2. The screen let go while the grade was on its way                 */
/* ------------------------------------------------------------------ */

test('an unmount during a pending grade records nothing under a later owner, and shows nothing', async () => {
  freshDevice();
  signInAs(A);

  const grader = pendingGrade<SyntheticGrade>();
  const binding = storeOwner.bindToCurrentOwner();
  let shown = 0;
  let hidden = 0;
  const settling = storeOwner.runOwnedGrade(binding, () => grader.promise, {
    keep: (grade, owner) => keepSpeaking(grade, owner, '2026-09-23T13:00:00.000Z'),
    show: () => (shown += 1),
    hide: () => (hidden += 1),
  });

  /* The mock exam unmounts its examiner the moment the account changes.
     That unmount is what cancels the binding. */
  binding.cancel();
  signInAs(B);
  grader.resolve(SPEAKING_GRADE);

  assert.equal(await settling, 'cancelled');
  assert.equal(shown, 0, 'a screen that has gone was shown a result');
  assert.equal(hidden, 0, 'a screen that has gone was told anything at all');
  assert.deepEqual(recordEventsOf(B), [], 'an unmounted examiner wrote under the student who came next');
  assert.deepEqual(progress.getSpeakingAttempts(), []);
  /* Paid for, so kept: under the student who spoke. */
  assert.equal(recordEventsOf(A).length, 1);
  assert.equal(progress.getProgressFor(A).speaking.length, 1);
});

test('an unmount with nobody else arriving still keeps the grade for the student who spoke', async () => {
  freshDevice();
  signInAs(A);

  const grader = pendingGrade<SyntheticGrade>();
  const binding = storeOwner.bindToCurrentOwner();
  let shown = 0;
  const settling = storeOwner.runOwnedGrade(binding, () => grader.promise, {
    keep: (grade, owner) => keepSpeaking(grade, owner, '2026-09-23T14:00:00.000Z'),
    show: () => (shown += 1),
  });
  binding.cancel();
  grader.resolve(SPEAKING_GRADE);

  assert.equal(await settling, 'cancelled');
  assert.equal(shown, 0);
  assert.equal(progress.getSpeakingAttempts().length, 1, 'a paid grade was dropped because its screen had gone');
  assert.equal(learner.readLearnerRecord().events.length, 1);
});

test('a grading request that fails after the screen let go is swallowed; one that fails while current is not', async () => {
  freshDevice();
  signInAs(A);

  const gone = pendingGrade<SyntheticGrade>();
  const goneBinding = storeOwner.bindToCurrentOwner();
  const goneSettling = storeOwner.runOwnedGrade(goneBinding, () => gone.promise, {
    keep: () => assert.fail('a failed request has nothing to keep'),
  });
  goneBinding.cancel();
  gone.reject(new Error('SYNTHETIC network failure'));
  assert.equal(await goneSettling, 'cancelled');

  const here = pendingGrade<SyntheticGrade>();
  const hereSettling = storeOwner.runOwnedGrade(storeOwner.bindToCurrentOwner(), () => here.promise, {
    keep: () => assert.fail('a failed request has nothing to keep'),
  });
  here.reject(new Error('SYNTHETIC network failure'));
  await assert.rejects(hereSettling, /SYNTHETIC network failure/);
  assert.deepEqual(recordEventsOf(A), []);
});

/* ------------------------------------------------------------------ */
/* 3. Completion callbacks fire only while the owner is still current  */
/* ------------------------------------------------------------------ */

test('completion fires once when nothing changed, and the grade lands in the current record', async () => {
  freshDevice();
  signInAs(A);

  const grader = pendingGrade<SyntheticGrade>();
  const completed: number[] = [];
  const settling = storeOwner.runOwnedGrade(storeOwner.bindToCurrentOwner(), () => grader.promise, {
    keep: (grade, owner) => keepSpeaking(grade, owner, '2026-09-23T15:00:00.000Z'),
    /* The embedded examiner's onComplete lives in this step and nowhere
       else (pinned by the source scan below). */
    show: (grade) => completed.push(grade.overallBand),
  });
  grader.resolve(SPEAKING_GRADE);

  assert.equal(await settling, 'current');
  assert.deepEqual(completed, [SPEAKING_GRADE.overallBand]);
  assert.equal(progress.getSpeakingAttempts().length, 1);
  assert.equal(learner.readLearnerRecord().events.length, 1);
});

test('A leaving and coming back while the grade is on its way still does not complete the screen', async () => {
  freshDevice();
  signInAs(A);

  const grader = pendingGrade<SyntheticGrade>();
  let completed = 0;
  let hidden = 0;
  const settling = storeOwner.runOwnedGrade(storeOwner.bindToCurrentOwner(), () => grader.promise, {
    keep: (grade, owner) => keepSpeaking(grade, owner, '2026-09-23T16:00:00.000Z'),
    show: () => (completed += 1),
    hide: () => (hidden += 1),
  });

  signInAs(B);
  signInAs(A);
  grader.resolve(SPEAKING_GRADE);

  /* The page moved on, so the screen that asked is not completed, even
     though the student it belongs to is back. The grade is theirs either
     way and is where they will look for it. */
  assert.equal(await settling, 'owner-changed');
  assert.equal(completed, 0);
  assert.equal(hidden, 1);
  assert.equal(progress.getSpeakingAttempts().length, 1);
  assert.deepEqual(recordEventsOf(B), []);
});

test('the same owner being told its stores changed (the anonymous-work claim) does not cancel anything', async () => {
  freshDevice();
  signInAs(A);

  const grader = pendingGrade<SyntheticGrade>();
  let completed = 0;
  const binding = storeOwner.bindToCurrentOwner();
  const settling = storeOwner.runOwnedGrade(binding, () => grader.promise, {
    keep: (grade, owner) => keepSpeaking(grade, owner, '2026-09-23T17:00:00.000Z'),
    show: () => (completed += 1),
  });

  storeOwner.announceStoresChanged();
  assert.equal(binding.state(), 'current');
  grader.resolve(SPEAKING_GRADE);
  assert.equal(await settling, 'current');
  assert.equal(completed, 1);
});

/* ------------------------------------------------------------------ */
/* 4. The three components really are wired this way                  */
/* ------------------------------------------------------------------ */

const COMPONENTS_DIR = path.join(fileURLToPath(new URL('..', import.meta.url)), 'src', 'components');

function componentSource(name: string): string {
  const source = fs.readFileSync(path.join(COMPONENTS_DIR, name), 'utf8');
  /* Comments are prose about the old way; only code counts. */
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

for (const name of ['WritingTester.tsx', 'SpeakingTester.tsx', 'LiveExaminer.tsx']) {
  test(`${name} keeps every grade under the owner it was started for, and lets go on unmount`, () => {
    const code = componentSource(name);
    assert.match(code, /\bbindToCurrentOwner\(\)/, `${name} never binds its attempt to an owner`);
    assert.match(code, /\brunOwnedGrade\(/, `${name} does not settle its grade through runOwnedGrade`);
    assert.match(code, /\.cancel\(\)/, `${name} never lets go of a pending grade`);
    /* The current-owner writers are exactly the defect: a grade arriving
       late would land under whoever is signed in by then. */
    assert.doesNotMatch(code, /\brecordSpeakingAttempt\(/, `${name} writes a speaking attempt under the current owner`);
    assert.doesNotMatch(code, /\brecordWritingAttempt\(/, `${name} writes an essay under the current owner`);
    assert.doesNotMatch(
      code,
      /getLearnerStore\(\)\s*\.\s*record(Speaking|Writing)Graded\(/,
      `${name} writes graded evidence through the shared store, which follows the current owner`,
    );
    assert.match(code, /record(Speaking|Writing)GradedFor\(\s*owner\b/, `${name} does not write evidence under the bound owner`);
    assert.match(code, /record(Speaking|Writing)AttemptFor\(\s*owner\b/, `${name} does not write its history row under the bound owner`);
  });
}

test('the embedded examiner reports a finished mock only from the step that runs while its student is current', () => {
  const code = componentSource('LiveExaminer.tsx');
  const calls = [...code.matchAll(/onComplete\?\.\(/g)].map((match) => match.index ?? -1);
  assert.equal(calls.length, 1, 'onComplete is called from more than one place');
  const show = code.indexOf('show: (graded)');
  const hide = code.indexOf('hide: ()');
  assert.ok(show > 0 && hide > show, 'the show and hide steps were not found in order');
  assert.ok(calls[0]! > show && calls[0]! < hide, 'onComplete is reachable outside the "show" step');
});
