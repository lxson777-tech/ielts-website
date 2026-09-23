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
 * AND THE ESSAY BEFORE IT IS SUBMITTED (finding R2B-01 of the second fresh
 * Codex inspection)
 * The grade was bound; the editor was not. The writing trainer resolved its
 * owner only at submit, and its draft autosave resolved it when the 600 ms
 * timer fired. So A could type an essay, the page could change hands, and B
 * could submit A's text into B's own history; a switch inside those 600 ms
 * saved A's text under the new owner's draft key. Section 5 drives the
 * editing session that now owns the essay (src/components/
 * writing-editor-owner.ts) with a hand-cranked clock: switches BEFORE
 * submission and DURING the debounce, a switch back, and the late grade
 * again with the editor handed over first.
 *
 * AND THE TWO FINDINGS OF THE THIRD CODEX INSPECTION (of 7c5264a)
 * R2C-01, section 6: the late grade's keep step cleared its student's draft
 * whatever the draft held by then, so A could submit, leave and come back,
 * revise the restored essay, and lose the revision to the older grade. The
 * draft is now removed only while it still holds exactly the graded text.
 * R2C-04, section 7: the speaking attempt was never stopped when the page
 * changed hands, so B could answer A's remaining questions and the combined
 * recording became A's evidence. The attempt (src/components/
 * speaking-attempt-owner.ts) now stops at the switch, is asked before every
 * question, recording, clip and grading call, and drops what was not sent.
 * The standalone live examiner cannot be started without a paid voice
 * session, so its suspension is proven here and not in a browser: the same
 * attempt, and a source scan of how the examiner uses it.
 *
 * AND THE EXAMINER'S START (finding R2D-01 of the Codex inspection of
 * 1701b97), section 8
 * Starting a live examiner session waits for the microphone permission, a
 * sign-in token and the voice connection. The mock exam's embedded examiner
 * asked nothing after those waits: taken off screen at an account change
 * while the permission prompt was up, it still kept the microphone, started
 * recording, fetched a token and opened a paid session once the prompt was
 * answered. Every start is now numbered and bound (guardSessionStart in
 * src/components/speaking-attempt-owner.ts). Section 8 drives that guard
 * with promises resolved by hand after the unmount, the switch or a newer
 * start (a microphone, a token, a connection, a failure) and with the
 * grading step after the session's shutdown, using a stream and a
 * connection of this file's own. Nothing real is opened or called.
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
const editor = await import('../src/components/writing-editor-owner.ts');
const speaking = await import('../src/components/speaking-attempt-owner.ts');

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
    if (name === 'WritingTester.tsx') {
      /* The essay's binding comes from its editing session (R2B-01), which
         binds to the current owner only when that owner is still the one
         who started the essay. */
      assert.match(code, /\bclaimSubmission\(/, `${name} never binds its attempt to an owner`);
      assert.match(componentSource('writing-editor-owner.ts'), /\bbindToCurrentOwner\(\)/);
    } else if (name === 'SpeakingTester.tsx') {
      /* The attempt's binding comes from the attempt itself (R2C-04), made
         when the part starts, for the owner on the page then. */
      assert.match(code, /\bopenSpeakingAttempt\(/, `${name} never binds its attempt to an owner`);
      assert.match(componentSource('speaking-attempt-owner.ts'), /\bbindToCurrentOwner\(\)/);
    } else {
      assert.match(code, /\bbindToCurrentOwner\(\)/, `${name} never binds its attempt to an owner`);
    }
    assert.match(code, /\brunOwnedGrade\(/, `${name} does not settle its grade through runOwnedGrade`);
    /* A cancelled binding, or a closed attempt (which cancels its binding). */
    assert.match(code, /\.(cancel|close)\(\)/, `${name} never lets go of a pending grade`);
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

/* ------------------------------------------------------------------ */
/* 5. The essay in the editor belongs to the student who started it   */
/*    (R2B-01)                                                         */
/* ------------------------------------------------------------------ */

const B_ESSAY = 'SYNTHETIC essay, written by student B on the same page.';
const EDITOR_PROMPT = 'SYNTHETIC-editor-prompt';

/** A clock this file winds by hand, standing in for the browser's timers so
    "inside the 600 ms" and "after it" are exact rather than raced. */
function handCrankedClock() {
  let now = 0;
  let nextId = 1;
  const waiting = new Map<number, { at: number; run: () => void }>();
  return {
    timers: {
      set: (run: () => void, ms: number) => {
        const id = nextId++;
        waiting.set(id, { at: now + ms, run });
        return id;
      },
      clear: (handle: unknown) => void waiting.delete(handle as number),
    },
    pending: () => waiting.size,
    advance(ms: number) {
      now += ms;
      const due = [...waiting].filter(([, entry]) => entry.at <= now).sort((a, b) => a[1].at - b[1].at);
      for (const [id, entry] of due) {
        if (!waiting.has(id)) continue;
        waiting.delete(id);
        entry.run();
      }
    },
  };
}

function draftOf(owner: CacheOwner, promptId = EDITOR_PROMPT): string | undefined {
  return storage.data.get(editor.essayDraftKey(promptId, owner));
}

function draftKeysOf(promptId = EDITOR_PROMPT): string[] {
  return [...storage.data.keys()]
    .filter((key) => key.startsWith(editor.ESSAY_DRAFT_PREFIX) && key.endsWith(`::${promptId}`))
    .sort();
}

type EditingSession = ReturnType<typeof editor.openEssayEditing>['session'];

/** The component's own submit, reduced to its ownership decision: claim a
    binding from the editing session, and only with one reach the grader and
    keep the grade. Returns how many times the grader was reached. */
async function submitFromEditor(session: EditingSession): Promise<number> {
  let graderCalls = 0;
  const binding = editor.claimSubmission(session);
  if (!binding) return graderCalls;
  await storeOwner.runOwnedGrade(
    binding,
    async () => {
      graderCalls += 1;
      return ESSAY_GRADE;
    },
    { keep: (grade, owner) => keepEssay(grade, owner, '2026-09-23T18:00:00.000Z') },
  );
  return graderCalls;
}

test("a switch from A to B before submission keeps A's text in A's draft, gives B an empty editor, and refuses A's stale submission", async () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();

  const opened = editor.openEssayEditing(EDITOR_PROMPT, { timers: clock.timers });
  assert.equal(opened.draft, '');
  assert.deepEqual(opened.session.owner, A);
  opened.session.edited(A_ESSAY);
  clock.advance(editor.ESSAY_DRAFT_DEBOUNCE_MS);
  assert.equal(draftOf(A), A_ESSAY, "A's draft was not kept under A");

  /* The menu, or another tab, hands the page to B. */
  signInAs(B);

  /* Before the editor is handed over: A's session is stale and cannot send. */
  assert.equal(opened.session.isCurrent(), false);
  assert.equal(editor.claimSubmission(opened.session), null, "A's essay could be submitted while B is on the page");
  assert.equal(await submitFromEditor(opened.session), 0, "the grader was reached with A's essay under B");

  /* The hand-over the component runs from its owner-change listener. */
  const handed = editor.handOverEssayEditing(opened.session, { timers: clock.timers });
  assert.ok(handed, 'a change of owner did not hand the editor over');
  assert.deepEqual(handed.session.owner, B);
  assert.equal(handed.draft, '', "B's editor opened with text in it");

  /* And after it: A's closed session still cannot send. */
  assert.equal(editor.claimSubmission(opened.session), null);
  assert.equal(await submitFromEditor(opened.session), 0);

  /* A's text is in A's draft and nowhere else; nothing was graded or recorded. */
  assert.equal(draftOf(A), A_ESSAY);
  assert.equal(draftOf(B), undefined, "A's text reached B's draft");
  assert.deepEqual(keysCarrying([A_ESSAY]), [editor.essayDraftKey(EDITOR_PROMPT, A)]);
  assert.deepEqual(recordEventsOf(B), []);
  assert.deepEqual(recordEventsOf(A), []);
  assert.deepEqual(progress.getWritingAttempts(), [], 'a writing attempt was recorded for B');
  assert.deepEqual(progress.getProgressFor(A).writing, {}, 'a refused submission was recorded for A');

  /* B's own editor works for B, and only for B. */
  const bBinding = editor.claimSubmission(handed.session);
  assert.ok(bBinding, "B cannot submit B's own essay");
  assert.deepEqual(bBinding.owner, B);
  bBinding.cancel();
});

test("a switch during the 600 ms debounce writes A's text under A only, even when the timer fires after the switch", () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();

  const opened = editor.openEssayEditing(EDITOR_PROMPT, { timers: clock.timers });
  opened.session.edited(A_ESSAY);
  clock.advance(300);
  assert.equal(draftOf(A), undefined, 'the draft was written before the debounce ran out');

  /* The owner changes inside the 600 ms, and nothing hands the editor over:
     the timer fires on its own, with B on the page. The draft must still be
     A's (this is exactly where the old autosave asked "who is here now"). */
  signInAs(B);
  clock.advance(300);
  assert.equal(draftOf(A), A_ESSAY, "the late timer did not write A's text under A");
  assert.equal(draftOf(B), undefined, "the late timer wrote A's text under B");
  assert.deepEqual(draftKeysOf(), [editor.essayDraftKey(EDITOR_PROMPT, A)]);
});

test("an owner change during the debounce writes A's latest text to A at once and cancels the pending write", () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();

  const opened = editor.openEssayEditing(EDITOR_PROMPT, { timers: clock.timers });
  opened.session.edited('SYNTHETIC first version by A');
  clock.advance(editor.ESSAY_DRAFT_DEBOUNCE_MS);
  opened.session.edited(A_ESSAY);
  clock.advance(200);
  assert.equal(clock.pending(), 1);

  signInAs(null);
  const device = storeOwner.currentOwner();
  const handed = editor.handOverEssayEditing(opened.session, { timers: clock.timers });
  assert.ok(handed);
  assert.equal(clock.pending(), 0, 'the pending draft write survived the hand-over');
  assert.equal(draftOf(A), A_ESSAY, "A's latest text was not kept under A at the hand-over");
  assert.equal(draftOf(device), undefined, "A's text reached the signed-out device owner's draft");

  /* Typing that reaches the old session after the hand-over goes nowhere. */
  opened.session.edited('SYNTHETIC keystroke arriving late');
  clock.advance(5000);
  assert.equal(draftOf(A), A_ESSAY);
  assert.deepEqual(draftKeysOf(), [editor.essayDraftKey(EDITOR_PROMPT, A)]);
});

test("a switch back to A restores A's draft, and B's own draft stays B's", () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();

  const a = editor.openEssayEditing(EDITOR_PROMPT, { timers: clock.timers });
  a.session.edited(A_ESSAY);
  clock.advance(editor.ESSAY_DRAFT_DEBOUNCE_MS);

  signInAs(B);
  const b = editor.handOverEssayEditing(a.session, { timers: clock.timers });
  assert.ok(b);
  assert.equal(b.draft, '');
  b.session.edited(B_ESSAY);
  clock.advance(100);

  signInAs(A);
  const back = editor.handOverEssayEditing(b.session, { timers: clock.timers });
  assert.ok(back);
  assert.deepEqual(back.session.owner, A);
  assert.equal(back.draft, A_ESSAY, 'A did not find their draft on coming back');
  assert.equal(draftOf(B), B_ESSAY, "B's own pending text was not kept for B at the hand-over");
  assert.equal(draftOf(A), A_ESSAY);

  const binding = editor.claimSubmission(back.session);
  assert.ok(binding, 'A cannot submit their own restored essay');
  assert.deepEqual(binding.owner, A);
  binding.cancel();
});

test('the same owner being told its stores changed does not hand the editor over', () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();

  const opened = editor.openEssayEditing(EDITOR_PROMPT, { timers: clock.timers });
  opened.session.edited(A_ESSAY);
  storeOwner.announceStoresChanged();
  assert.equal(editor.handOverEssayEditing(opened.session, { timers: clock.timers }), null);
  assert.equal(opened.session.closed(), false);
  assert.equal(clock.pending(), 1, 'a refresh for the same owner dropped the pending draft');
  clock.advance(editor.ESSAY_DRAFT_DEBOUNCE_MS);
  assert.equal(draftOf(A), A_ESSAY);
});

test('an essay started signed out stays with this device when a student signs in', () => {
  freshDevice();
  signInAs(null);
  const device = storeOwner.currentOwner();
  const clock = handCrankedClock();

  const opened = editor.openEssayEditing(EDITOR_PROMPT, { timers: clock.timers });
  opened.session.edited(A_ESSAY);
  clock.advance(100);

  signInAs(A);
  const handed = editor.handOverEssayEditing(opened.session, { timers: clock.timers });
  assert.ok(handed);
  assert.equal(handed.draft, '', "the device's unfinished essay opened in the account's editor");
  assert.equal(draftOf(device), A_ESSAY);
  assert.equal(draftOf(A), undefined);
  assert.equal(editor.claimSubmission(opened.session), null);
});

test('a confirmed "different task" discards the pending write and the draft', () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();

  const opened = editor.openEssayEditing(EDITOR_PROMPT, { timers: clock.timers });
  opened.session.edited(A_ESSAY);
  clock.advance(editor.ESSAY_DRAFT_DEBOUNCE_MS);
  opened.session.edited(`${A_ESSAY} and more`);
  opened.session.discard();
  clock.advance(5000);
  assert.equal(draftOf(A), undefined);
  assert.equal(clock.pending(), 0);
});

test('a late grade still goes to A when the editor was handed to B while it was being graded', async () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();

  const opened = editor.openEssayEditing(A_PROMPT, { timers: clock.timers });
  opened.session.edited(A_ESSAY);
  /* Submit: the latest text into A's draft first, then the binding. */
  opened.session.flush();
  const binding = editor.claimSubmission(opened.session);
  assert.ok(binding);
  const grader = pendingGrade<SyntheticGrade>();
  let shown = 0;
  let hidden = 0;
  const settling = storeOwner.runOwnedGrade(binding, () => grader.promise, {
    keep: (grade, owner) => {
      keepEssay(grade, owner, '2026-09-23T19:00:00.000Z');
      /* The component clears the submitter's draft once the report is kept,
         while it still holds the text that was graded (R2C-01). */
      editor.clearSubmittedEssayDraft(A_PROMPT, owner, A_ESSAY);
    },
    show: () => (shown += 1),
    hide: () => (hidden += 1),
  });

  /* B takes the page. The component's listener hands the editor over and,
     because a grade is on its way, lets go of the attempt on screen. */
  signInAs(B);
  const handed = editor.handOverEssayEditing(opened.session, { timers: clock.timers });
  assert.ok(handed);
  assert.equal(handed.draft, '');
  assert.equal(draftOf(A, A_PROMPT), A_ESSAY, "A's submitted essay is not safe in A's draft while it is graded");
  binding.cancel();

  grader.resolve(ESSAY_GRADE);
  assert.equal(await settling, 'cancelled');
  assert.equal(shown, 0, "A's report was painted on B's page");
  assert.equal(hidden, 0);

  /* Kept for A, exactly once; nothing under B. */
  assert.equal(progress.getProgressFor(A).writing[A_PROMPT]?.length, 1);
  assert.equal(progress.getProgressFor(A).writing[A_PROMPT]?.[0]?.essay, A_ESSAY);
  assert.deepEqual(
    recordEventsOf(A).map((event) => event.activityId),
    [`write:${A_PROMPT}`],
  );
  assert.deepEqual(recordEventsOf(B), []);
  assert.deepEqual(progress.getWritingAttempts(), []);
  assert.equal(draftOf(A, A_PROMPT), undefined, "A's draft outlived the report it became");
  assert.equal(draftOf(B, A_PROMPT), undefined);
});

test('WritingTester binds the editor to its owner, hands it over on a change, and checks it before grading', () => {
  const code = componentSource('WritingTester.tsx');
  assert.match(code, /\bonOwnerChange\(/, 'the editor does not notice a change of owner');
  assert.match(code, /\bhandOverEssayEditing\(/, 'the editor is not handed over on a change of owner');
  assert.match(code, /\bopenEssayEditing\(/, 'the essay is not opened through an editing session');
  const claim = code.indexOf('claimSubmission(');
  const grade = code.indexOf('gradeEssay(');
  assert.ok(claim > 0 && grade > claim, 'the essay can reach the grader before its owner is checked');
  /* Every draft write goes through the session or names its owner. */
  assert.doesNotMatch(code, /localStorage/, 'the component reaches storage directly');
  assert.doesNotMatch(code, /setTimeout\(/, 'the component keeps its own draft timer outside the session');
  assert.doesNotMatch(code, /getLearnerStore\(\)\s*\.\s*owner\(\)/, 'a draft key is resolved from whoever is on the page');
  for (const call of code.matchAll(/\b(writeEssayDraft|clearEssayDraft|restoreEssayDraft|clearSubmittedEssayDraft)\(([^)]*)\)/g)) {
    assert.ok(call[2]!.split(',').length >= 2, `${call[1]} is called without naming an owner: ${call[0]}`);
  }
});

/* ------------------------------------------------------------------ */
/* 6. A late report clears only the text it graded (R2C-01)           */
/* ------------------------------------------------------------------ */

const A_REVISION = `${A_ESSAY} SYNTHETIC revision, typed by A after coming back to the page.`;

/** The writing trainer's own submit and keep, reduced to what touches the
    draft: the latest text into the draft, a binding claimed from the editing
    session, the grade kept under the bound owner and, in the same step, the
    draft removed only while it still holds the submitted text. The grade is
    held until the test answers it. */
function submitAndHold(session: EditingSession, submitted: string, at: string) {
  session.flush();
  const binding = editor.claimSubmission(session);
  assert.ok(binding, 'the student cannot submit their own essay');
  const grader = pendingGrade<SyntheticGrade>();
  const cleared: boolean[] = [];
  const settling = storeOwner.runOwnedGrade(binding, () => grader.promise, {
    keep: (grade, owner) => {
      keepEssay(grade, owner, at);
      cleared.push(editor.clearSubmittedEssayDraft(A_PROMPT, owner, submitted));
    },
  });
  return { binding, grader, settling, cleared };
}

/** A signs out and back in on the same page while the grade is on its way.
    The component's owner-change listener hands the editor over at each
    change, and at the first one lets go of the attempt on screen. Returns
    A's editor as it opens on coming back. */
function awayAndBack(session: EditingSession, binding: { cancel(): void }, clock: ReturnType<typeof handCrankedClock>) {
  signInAs(null);
  const away = editor.handOverEssayEditing(session, { timers: clock.timers });
  assert.ok(away, 'signing out did not hand the editor over');
  binding.cancel();
  signInAs(A);
  const back = editor.handOverEssayEditing(away.session, { timers: clock.timers });
  assert.ok(back, 'signing back in did not hand the editor back');
  assert.deepEqual(back.session.owner, A);
  return back;
}

function aWritingRows(): string[] {
  return (progress.getProgressFor(A).writing[A_PROMPT] ?? []).map((row) => row.essay ?? '');
}

test("R2C-01: A submits, leaves, comes back and revises; the earlier grade keeps A's report and leaves the revision as A's draft", async () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();

  const opened = editor.openEssayEditing(A_PROMPT, { timers: clock.timers });
  opened.session.edited(A_ESSAY);
  const held = submitAndHold(opened.session, A_ESSAY, '2026-09-23T20:00:00.000Z');
  assert.equal(draftOf(A, A_PROMPT), A_ESSAY);

  const back = awayAndBack(opened.session, held.binding, clock);
  assert.equal(back.draft, A_ESSAY, 'A did not get the submitted essay back in the editor');

  /* A revises the restored essay, and the revision autosaves. */
  back.session.edited(A_REVISION);
  clock.advance(editor.ESSAY_DRAFT_DEBOUNCE_MS);
  assert.equal(draftOf(A, A_PROMPT), A_REVISION);

  /* Only now does the earlier grade come back. */
  held.grader.resolve(ESSAY_GRADE);
  assert.equal(await held.settling, 'cancelled');
  assert.deepEqual(held.cleared, [false], 'the earlier grade removed a draft that is not the text it graded');
  assert.equal(draftOf(A, A_PROMPT), A_REVISION, "the earlier grade deleted A's revision");

  /* A reload opens the revision, and A's history holds the original
     submission and its report, exactly once. */
  assert.equal(editor.openEssayEditing(A_PROMPT, { timers: clock.timers }).draft, A_REVISION);
  assert.deepEqual(aWritingRows(), [A_ESSAY]);
  assert.deepEqual(
    recordEventsOf(A).map((event) => event.activityId),
    [`write:${A_PROMPT}`],
  );
  /* And the revision is A's alone: nothing under the signed-out device. */
  assert.deepEqual(keysCarrying([A_REVISION]), [editor.essayDraftKey(A_PROMPT, A)]);
});

test('R2C-01: the unchanged case is still cleared, straight through and after a trip away', async () => {
  /* Straight through: the draft is a spare copy of what the history now
     holds, so it goes. */
  freshDevice();
  signInAs(A);
  let clock = handCrankedClock();
  const straight = editor.openEssayEditing(A_PROMPT, { timers: clock.timers });
  straight.session.edited(A_ESSAY);
  const first = submitAndHold(straight.session, A_ESSAY, '2026-09-23T20:10:00.000Z');
  first.grader.resolve(ESSAY_GRADE);
  assert.equal(await first.settling, 'current');
  assert.deepEqual(first.cleared, [true]);
  assert.equal(draftOf(A, A_PROMPT), undefined, 'a draft identical to the graded essay outlived its report');

  /* Away and back with no revision: the same. */
  freshDevice();
  signInAs(A);
  clock = handCrankedClock();
  const opened = editor.openEssayEditing(A_PROMPT, { timers: clock.timers });
  opened.session.edited(A_ESSAY);
  const held = submitAndHold(opened.session, A_ESSAY, '2026-09-23T20:20:00.000Z');
  const back = awayAndBack(opened.session, held.binding, clock);
  assert.equal(back.draft, A_ESSAY);
  held.grader.resolve(ESSAY_GRADE);
  assert.equal(await held.settling, 'cancelled');
  assert.deepEqual(held.cleared, [true]);
  assert.equal(draftOf(A, A_PROMPT), undefined);
  assert.deepEqual(aWritingRows(), [A_ESSAY]);
});

test('R2C-01: a revision still waiting in the 600 ms autosave when the earlier grade lands survives it', async () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();

  const opened = editor.openEssayEditing(A_PROMPT, { timers: clock.timers });
  opened.session.edited(A_ESSAY);
  const held = submitAndHold(opened.session, A_ESSAY, '2026-09-23T20:30:00.000Z');
  const back = awayAndBack(opened.session, held.binding, clock);

  /* A types the revision; its write is still waiting when the grade lands. */
  back.session.edited(A_REVISION);
  clock.advance(300);
  assert.equal(clock.pending(), 1, 'the revision is not waiting on the autosave');
  assert.equal(draftOf(A, A_PROMPT), A_ESSAY, 'the revision was written before the autosave wait ran out');

  held.grader.resolve(ESSAY_GRADE);
  assert.equal(await held.settling, 'cancelled');
  /* At that moment the stored draft was still the submission, so that
     spare copy went... */
  assert.deepEqual(held.cleared, [true]);
  assert.equal(clock.pending(), 1, 'the grade dropped the pending revision');

  /* ...and the revision lands when the wait runs out. */
  clock.advance(300);
  assert.equal(draftOf(A, A_PROMPT), A_REVISION, 'the pending revision did not survive the earlier grade');
  assert.equal(editor.openEssayEditing(A_PROMPT, { timers: clock.timers }).draft, A_REVISION);
  assert.deepEqual(aWritingRows(), [A_ESSAY]);
});

test('R2C-01: a failed request puts the essay back only where there is no draft, so it never overwrites a revision', () => {
  freshDevice();
  signInAs(A);
  assert.equal(editor.restoreEssayDraft(A_PROMPT, A, A_ESSAY), true);
  assert.equal(draftOf(A, A_PROMPT), A_ESSAY);

  editor.writeEssayDraft(A_PROMPT, A, A_REVISION);
  assert.equal(editor.restoreEssayDraft(A_PROMPT, A, A_ESSAY), false);
  assert.equal(draftOf(A, A_PROMPT), A_REVISION, 'restoring the submitted essay overwrote a later revision');
  assert.equal(draftOf(B, A_PROMPT), undefined);
});

test('WritingTester clears a draft only through the revision check, from the keep step, and never writes one over a revision', () => {
  const code = componentSource('WritingTester.tsx');
  assert.doesNotMatch(code, /\bclearEssayDraft\(/, 'the writing trainer can still delete a draft whatever it holds');
  assert.doesNotMatch(code, /\bwriteEssayDraft\(/, "the writing trainer can still overwrite a draft on the student's behalf");
  assert.match(
    code,
    /clearSubmittedEssayDraft\(\s*submitted\.prompt\.id,\s*owner,\s*submitted\.essay\s*\)/,
    'the draft is not compared with the essay that was submitted',
  );
  const keep = code.indexOf('keep: (graded, owner)');
  const clear = code.indexOf('clearSubmittedEssayDraft(');
  const show = code.indexOf('show: (graded)');
  assert.ok(keep > 0 && clear > keep && show > clear, 'the draft is not cleared from the keep step');
  assert.match(code, /restoreEssayDraft\(\s*submitted\.prompt\.id,\s*binding\.owner,\s*submitted\.essay\s*\)/);
});

/* ------------------------------------------------------------------ */
/* 7. A speaking attempt stops the moment its student leaves (R2C-04) */
/* ------------------------------------------------------------------ */

type SpeakingStage = 'open' | 'grading' | 'done';

function openAttempt(clock: ReturnType<typeof handCrankedClock>, onLeft?: (stage: SpeakingStage) => void) {
  const left: SpeakingStage[] = [];
  const attempt = speaking.openSpeakingAttempt({
    timers: clock.timers,
    onOwnerLeft: (stage) => {
      left.push(stage);
      onLeft?.(stage);
    },
  });
  return { attempt, left };
}

test("R2C-04: an owner change mid-answer suspends A's attempt at once: its clocks stop and no question, recording, clip or grading follows", () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();
  const { attempt, left } = openAttempt(clock);
  assert.deepEqual(attempt.owner, A);
  assert.equal(attempt.stage(), 'open');
  assert.ok(attempt.mayStartTurn());
  assert.ok(attempt.mayStartRecording());

  /* Recording has started: the answer clock and the automatic move to the
     next question, as the trainer sets them. */
  const ticks: number[] = [];
  const movedOn: number[] = [];
  attempt.every(200, () => ticks.push(1));
  attempt.after(45_100, () => movedOn.push(1));
  for (let tick = 0; tick < 5; tick += 1) clock.advance(200);
  assert.equal(ticks.length, 5);

  /* Another tab signs A out and B in. */
  signInAs(B);
  assert.deepEqual(left, ['open'], 'the screen was not told at the moment of the switch');
  assert.equal(attempt.stage(), 'suspended');
  assert.equal(clock.pending(), 0, "a timer of A's attempt survived the switch");
  assert.equal(attempt.binding.state(), 'cancelled', "the switch did not let go of A's binding");

  clock.advance(60_000);
  assert.equal(ticks.length, 5, 'the answer clock ran on after the switch');
  assert.deepEqual(movedOn, [], 'the attempt moved on to its next question after the switch');
  assert.equal(attempt.mayStartTurn(), false, 'a question may start after the switch');
  assert.equal(attempt.mayStartRecording(), false, 'the microphone may record after the switch');
  assert.equal(attempt.mayAcceptRecording(), false, 'a clip may join after the switch');
  assert.equal(attempt.beginGrading(), false, 'the attempt may be graded after the switch');
  assert.equal(attempt.gradingFailed(), false);
  assert.equal(attempt.ownerStillHere(), false);

  /* Final: A coming back does not revive it, and nothing is told twice. */
  signInAs(A);
  assert.equal(attempt.mayStartTurn(), false, 'the first student coming back revived the suspended attempt');
  assert.deepEqual(left, ['open']);
});

test("R2C-04: B cannot answer A's remaining questions; nothing said after the switch joins A's attempt, and nothing is graded or recorded", async () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();
  const questions = ['SYNTHETIC question 1', 'SYNTHETIC question 2', 'SYNTHETIC question 3'];
  const clips: string[] = [];
  /* The trainer drops everything not sent for grading when it is told. */
  const { attempt, left } = openAttempt(clock, () => {
    clips.length = 0;
  });

  /* The trainer's own loop for one question, reduced to what it asks. */
  function answer(index: number, speaker: string): boolean {
    if (!attempt.mayStartTurn()) return false;
    if (!attempt.mayStartRecording()) return false;
    /* ...the speaker answers, the clip stops... */
    if (!attempt.mayAcceptRecording()) return false;
    clips.push(`${speaker}: ${questions[index]}`);
    return true;
  }

  assert.equal(answer(0, 'A'), true);
  assert.deepEqual(clips, ['A: SYNTHETIC question 1']);

  /* Question 2 is on screen and recording when another tab hands the page
     to B, and B answers into the still-open microphone. */
  assert.ok(attempt.mayStartTurn());
  assert.ok(attempt.mayStartRecording());
  signInAs(B);
  assert.equal(attempt.mayAcceptRecording(), false, "B's answer to question 2 joined A's attempt");
  assert.equal(answer(2, 'B'), false, "B could go on to A's next question");

  /* The trainer's finishing step. */
  let graderCalls = 0;
  if (attempt.beginGrading()) {
    await storeOwner.runOwnedGrade(
      attempt.binding,
      async () => {
        graderCalls += 1;
        return SPEAKING_GRADE;
      },
      { keep: (grade, owner) => keepSpeaking(grade, owner, '2026-09-23T21:00:00.000Z') },
    );
  }
  assert.equal(graderCalls, 0, 'an attempt whose student had left was sent for (paid) grading');
  assert.deepEqual(left, ['open']);
  assert.deepEqual(clips, [], "A's unfinished answers were kept after the switch");
  assert.deepEqual(recordEventsOf(A), [], 'the attempt became A\'s evidence');
  assert.deepEqual(recordEventsOf(B), []);
  assert.deepEqual(progress.getProgressFor(A).speaking, []);
  assert.deepEqual(progress.getSpeakingAttempts(), [], 'B sees an attempt');
});

test('R2C-04: an owner change that reached no listener is caught at the next step, and by the answer clock within one tick', () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();

  /* The owner moves WITHOUT a notification: the owner module forgets it,
     and its next read resolves the signed-out device owner. */
  const stepped = openAttempt(clock);
  storeOwner.resetStoreOwnerForTest();
  assert.deepEqual(stepped.left, [], 'nothing has asked yet');
  assert.equal(stepped.attempt.mayAcceptRecording(), false, 'a clip joined after an unannounced switch');
  assert.deepEqual(stepped.left, ['open'], 'the step that found the switch did not stop the attempt');

  signInAs(A);
  const ticked = openAttempt(clock);
  const ticks: number[] = [];
  ticked.attempt.every(200, () => ticks.push(1));
  storeOwner.resetStoreOwnerForTest();
  clock.advance(200);
  assert.deepEqual(ticks, [], 'the answer clock ticked on for a student who had gone');
  assert.deepEqual(ticked.left, ['open']);
  assert.equal(clock.pending(), 0);
  signInAs(A);
});

test('R2C-04: grading that began before the switch goes on and is kept for A; the screen lets go and shows none of it', async () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();
  const { attempt, left } = openAttempt(clock);

  assert.ok(attempt.mayAcceptRecording(), "A's last answer is in");
  assert.equal(attempt.beginGrading(), true);
  assert.equal(attempt.stage(), 'grading');
  assert.equal(attempt.mayStartTurn(), false, 'an attempt being graded took another question');
  assert.equal(attempt.beginGrading(), false, 'the same attempt could be sent for grading twice');

  const grader = pendingGrade<SyntheticGrade>();
  let shown = 0;
  let hidden = 0;
  const settling = storeOwner.runOwnedGrade(attempt.binding, () => grader.promise, {
    keep: (grade, owner) => keepSpeaking(grade, owner, '2026-09-23T21:10:00.000Z'),
    show: () => (shown += 1),
    hide: () => (hidden += 1),
  });

  signInAs(B);
  assert.deepEqual(left, ['grading'], 'the screen was not told to let go of the grading attempt');
  grader.resolve(SPEAKING_GRADE);
  assert.equal(await settling, 'cancelled');
  assert.equal(shown, 0, "A's report was painted on B's page");
  assert.equal(hidden, 0);
  assert.equal(recordEventsOf(A).length, 1, 'a grade that had begun was not kept for A');
  assert.equal(progress.getProgressFor(A).speaking.length, 1);
  assert.deepEqual(recordEventsOf(B), []);
  assert.deepEqual(progress.getSpeakingAttempts(), []);
});

test('R2C-04: a failed grading request can be tried again only while the same student is on the page', () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();
  const { attempt, left } = openAttempt(clock);

  assert.equal(attempt.beginGrading(), true);
  assert.equal(attempt.gradingFailed(), true);
  assert.equal(attempt.stage(), 'open', 'the answers are not waiting to be graded again');
  assert.equal(attempt.beginGrading(), true, 'A cannot retry grading their own answers');
  assert.equal(attempt.gradingFailed(), true);

  /* The answers are waiting on the "try again" screen when B takes over. */
  signInAs(B);
  assert.deepEqual(left, ['open'], "A's waiting answers were not dropped at the switch");
  assert.equal(attempt.beginGrading(), false, "B could send A's answers for grading");
});

test('R2C-04: a report on screen leaves it when the page changes hands', () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();
  const { attempt, left } = openAttempt(clock);
  assert.equal(attempt.beginGrading(), true);
  attempt.graded();
  assert.equal(attempt.stage(), 'done');
  assert.equal(attempt.ownerStillHere(), true);
  signInAs(B);
  assert.deepEqual(left, ['done']);
  assert.equal(attempt.ownerStillHere(), false);
});

test('R2C-04: letting go on purpose is not a suspension, and the same owner told its stores changed stops nothing', () => {
  freshDevice();
  signInAs(A);
  const clock = handCrankedClock();
  const { attempt, left } = openAttempt(clock);
  const ticks: number[] = [];
  attempt.every(200, () => ticks.push(1));

  storeOwner.announceStoresChanged();
  assert.equal(attempt.stage(), 'open');
  assert.ok(attempt.mayStartTurn());
  clock.advance(200);
  assert.equal(ticks.length, 1, 'a refresh for the same owner stopped the answer clock');

  attempt.close();
  assert.equal(attempt.stage(), 'closed');
  assert.equal(clock.pending(), 0);
  assert.equal(attempt.binding.state(), 'cancelled');
  assert.equal(attempt.mayStartTurn(), false);
  signInAs(B);
  assert.deepEqual(left, [], 'a screen that let go on purpose was told about a switch');
});

/* How the two components use the attempt. The decisions are proven above;
   these pin that every step of the components really asks. */

function functionBody(code: string, name: string): string {
  const start = code.search(new RegExp(`(async )?function ${name}\\(`));
  assert.ok(start >= 0, `${name} was not found`);
  const rest = code.slice(start + 1);
  const next = rest.search(/\n {2}(async )?function \w+\(/);
  return next >= 0 ? rest.slice(0, next) : rest;
}

/** `second` appears somewhere after the first `first` in `body`. */
function before(body: string, first: string, second: string, what: string): void {
  const a = body.indexOf(first);
  const b = a >= 0 ? body.indexOf(second, a + first.length) : -1;
  assert.ok(a >= 0 && b > a, what);
}

test('SpeakingTester asks its attempt before every question, recording, clip and grading call, and stops everything on a switch', () => {
  const code = componentSource('SpeakingTester.tsx');
  assert.match(code, /\bopenSpeakingAttempt\(\s*\{\s*onOwnerLeft:\s*leaveForOwnerChange\s*\}\s*\)/);

  const beginTurn = functionBody(code, 'beginTurn');
  assert.ok((beginTurn.match(/attempt\.mayStartTurn\(\)/g) ?? []).length >= 3, 'a wait in beginTurn is not followed by a check');
  before(beginTurn, 'attempt.mayStartTurn()', 'finishAndGrade(', 'the last question can end in grading without a check');
  before(beginTurn, 'attempt.mayStartTurn()', 'beginRecording(', 'a question can start recording without a check');
  before(functionBody(code, 'beginRecording'), 'attempt.mayStartRecording()', 'recordSegment(', 'the microphone records without a check');
  before(functionBody(code, 'stopAnswering'), 'attempt.mayAcceptRecording()', 'clipsRef.current.push(', 'a clip joins without a check');
  before(functionBody(code, 'finishAndGrade'), 'attempt.beginGrading()', 'runGrading(', 'the attempt is graded without a check');
  assert.match(functionBody(code, 'finishAndGrade'), /attempt\.gradingFailed\(\)/, 'a retry is offered after a switch');

  const leave = functionBody(code, 'leaveForOwnerChange');
  for (const step of ['stopCapture()', 'clipsRef.current = []', "setPhase('menu')", 'SESSION_CLOSED_NOTICE']) {
    assert.ok(leave.includes(step), `the switch does not ${step}`);
  }
  const stop = functionBody(code, 'stopCapture');
  assert.match(stop, /handle\.stop\(\)/, 'the recorder is not stopped at the switch');
  assert.match(stop, /releaseMic\(/, 'the microphone is not released at the switch');
  /* Every clock of the attempt runs through it, so none outlives it. */
  assert.doesNotMatch(code, /\bset(Timeout|Interval)\(/, 'a timer of the attempt runs outside it');
});

test('the standalone examiner ends its session on a switch, and asks before every stage; the mock embed is left as it was', () => {
  const code = componentSource('LiveExaminer.tsx');
  assert.match(
    code,
    /mock \? null : openSpeakingAttempt\(\s*\{\s*onOwnerLeft:\s*leaveForOwnerChange\s*\}\s*\)/,
    'the standalone interview is not an attempt of its student, or the mock embed became one',
  );
  assert.match(code, /attempt \? attempt\.binding : bindToCurrentOwner\(\)/);

  /* Since R2D-01 every wait of the start goes through the start's own
     guard, which asks the attempt first (section 8 proves the guard). */
  const start = functionBody(code, 'startTest');
  assert.match(start, /guardSessionStart\(\{\s*generations,\s*binding:\s*sessionBindingRef\.current,\s*attempt\s*\}\)/);
  before(start, 'session.step(getAccessToken())', 'dropStart(session', 'the token wait is not followed by a check');
  before(start, 'openExaminerLink(', 'closeConnection', 'a session that opened after a switch is not closed');
  before(start, 'closeConnection', 'linkRef.current = opened.value', 'a session that opened after a switch is kept');
  before(start, 'navigator.mediaDevices.getUserMedia(', 'releaseMic', 'a microphone that answered after a switch is kept');
  before(start, 'releaseMic', 'streamRef.current = stream', 'the microphone is kept without a check');

  const finish = functionBody(code, 'finishTest');
  before(finish, 'attempt.mayStartTurn()', 'endedRef.current = true', 'the interview can finish for a student who has gone');
  before(finish, 'await stopRecorder()', 'attempt.mayAcceptRecording()', 'the recording is not checked once it has stopped');
  before(finish, 'attempt.mayAcceptRecording()', 'attempt.beginGrading()', 'the checks are out of order');
  before(finish, 'attempt.beginGrading()', 'gradeInterview(', 'the interview is graded without a check');

  const leave = functionBody(code, 'leaveForOwnerChange');
  for (const step of [
    'endedRef.current = true',
    'link?.close()',
    'rec.ondataavailable = null',
    'rec.stop()',
    'recChunksRef.current = []',
    'cleanupAudio()',
    'clearTimeout',
    'clearInterval',
    "setPhase('menu')",
    'SESSION_CLOSED_NOTICE',
  ]) {
    assert.ok(leave.includes(step), `the switch does not ${step}`);
  }
  assert.match(functionBody(code, 'abandonToMenu'), /attemptRef\.current\?\.close\(\)/);
  /* The mock embed's own teardown is untouched (R2B-02). */
  assert.match(code, /examinerLeftScreen\(openedFor\) === 'suspended'\) onSuspend\?\.\(\)/);
});

/* ------------------------------------------------------------------ */
/* 8. The examiner's start asks after every wait (R2D-01)             */
/* ------------------------------------------------------------------ */

/* WHAT IS SIMULATED HERE
   The microphone, the token and the voice connection are promises this
   file resolves by hand, at the moment it chooses, after the unmount, the
   switch or the newer start it is testing. The stream is an object of this
   file's own with tracks that can be stopped; the connection is one that
   counts its closes. The guard, the start numbers, the owner binding, the
   attempt and runOwnedGrade are the shipping code.

   examinerStart and examinerFinish below are the examiner's own start and
   finish (src/components/LiveExaminer.tsx startTest and finishTest)
   reduced to their waits and to what each wait is followed by, in the same
   order. The source scan at the end of this section pins that the
   component really does route every one of those waits through the guard. */

/** Let every continuation that is ready run (all pending microtasks). */
function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/** A microphone stream of this file's own. */
function syntheticMicrophone() {
  const tracks = [0, 1].map(() => {
    const track = {
      readyState: 'live' as 'live' | 'ended',
      stop() {
        track.readyState = 'ended';
      },
    };
    return track;
  });
  return {
    getTracks: () => tracks,
    liveTracks: () => tracks.filter((track) => track.readyState === 'live').length,
  };
}
type SyntheticMicrophone = ReturnType<typeof syntheticMicrophone>;

/** A voice connection of this file's own. */
function syntheticConnection() {
  const connection = {
    closes: 0,
    close() {
      connection.closes += 1;
      return Promise.resolve();
    },
  };
  return connection;
}
type SyntheticConnection = ReturnType<typeof syntheticConnection>;

/** Everything the start could reach, counted. */
function startWorld() {
  return {
    microphone: pendingGrade<SyntheticMicrophone>(),
    token: pendingGrade<string | null>(),
    connection: pendingGrade<SyntheticConnection>(),
    microphoneRequests: 0,
    recordersStarted: 0,
    recordersStopped: 0,
    tokenFetches: 0,
    connectionRequests: 0,
    streamKept: null as SyntheticMicrophone | null,
    linkKept: null as SyntheticConnection | null,
  };
}
type StartWorld = ReturnType<typeof startWorld>;

/** The examiner's start, reduced to its waits and what follows each. What a
    start that may not go on does is dropStart: stop its own recorder and
    microphone, nothing else. */
async function examinerStart(session: ReturnType<typeof speaking.guardSessionStart>, world: StartWorld): Promise<string> {
  world.microphoneRequests += 1;
  const granted = await session.step(world.microphone.promise, speaking.stopStream);
  if (!granted) return 'let go at the microphone';
  const stream = granted.value;
  world.streamKept = stream;
  world.recordersStarted += 1;
  const dropStart = (): void => {
    world.recordersStopped += 1;
    speaking.stopStream(stream);
    world.streamKept = null;
  };

  world.tokenFetches += 1;
  const token = await session.step(world.token.promise);
  if (!token) {
    dropStart();
    return 'let go at the token';
  }

  world.connectionRequests += 1;
  let opened: { value: SyntheticConnection } | null;
  try {
    opened = await session.step(world.connection.promise, speaking.closeConnection);
  } catch {
    dropStart();
    return 'the connection failed while the start was live';
  }
  if (!opened) {
    dropStart();
    return 'let go at the connection';
  }
  world.linkKept = opened.value;
  return 'started';
}

/** The start of the mock embed: a plain binding and no attempt, exactly as
    the component makes it when `mock` is set. */
function mockStart(generations: ReturnType<typeof speaking.sessionGenerations>) {
  const binding = storeOwner.bindToCurrentOwner();
  const session = speaking.guardSessionStart({ generations, binding, attempt: null });
  return { binding, session };
}

/** The mock embed's unmount, as far as the start is concerned: the
    component lets go of its binding and moves every number on for good. */
function unmountMock(generations: ReturnType<typeof speaking.sessionGenerations>, binding: { cancel(): void }): void {
  generations.unmount();
  binding.cancel();
}

test('R2D-01: the start numbers go stale at every new start and for good at the unmount', () => {
  const generations = speaking.sessionGenerations();
  const first = generations.next();
  assert.ok(generations.isCurrent(first));
  const second = generations.next();
  assert.equal(generations.isCurrent(first), false, 'an older start is still current after a newer one');
  assert.ok(generations.isCurrent(second));
  assert.equal(generations.current(), second);
  generations.unmount();
  assert.equal(generations.isCurrent(second), false, 'a start is still current after the unmount');
  const late = generations.next();
  assert.equal(generations.isCurrent(late), false, 'a start begun after the unmount counts as current');
});

test('R2D-01: nothing changed, the start goes through: the microphone is kept, the connection is kept and not closed', async () => {
  freshDevice();
  signInAs(A);
  const generations = speaking.sessionGenerations();
  const { session } = mockStart(generations);
  const world = startWorld();
  const starting = examinerStart(session, world);

  const microphone = syntheticMicrophone();
  const connection = syntheticConnection();
  world.microphone.resolve(microphone);
  world.token.resolve('SYNTHETIC-token-of-A');
  world.connection.resolve(connection);
  assert.equal(await starting, 'started');
  assert.equal(microphone.liveTracks(), 2, 'a live start lost its microphone');
  assert.equal(connection.closes, 0, 'a live start closed its own connection');
  assert.equal(world.linkKept, connection);
  assert.ok(session.live());
});

test('R2D-01: a microphone that answers after the mock took the examiner off screen is released at once; no recording, token or connection follows', async () => {
  freshDevice();
  signInAs(A);
  const generations = speaking.sessionGenerations();
  const { binding, session } = mockStart(generations);
  const world = startWorld();
  const starting = examinerStart(session, world);
  assert.equal(world.microphoneRequests, 1, 'the permission prompt is up');

  /* Another tab signs A out and B in; MockExam puts its stopped screen up
     and the examiner unmounts BEFORE any stream exists. */
  signInAs(B);
  unmountMock(generations, binding);

  /* The student answers the permission prompt afterwards. */
  const microphone = syntheticMicrophone();
  world.microphone.resolve(microphone);
  assert.equal(await starting, 'let go at the microphone');
  assert.equal(microphone.liveTracks(), 0, 'the microphone stayed live behind the stopped screen');
  assert.equal(world.streamKept, null, 'the stream was installed');
  assert.equal(world.recordersStarted, 0, 'a recording started after the unmount');
  assert.equal(world.tokenFetches, 0, "a token was fetched (B's, by then) after the unmount");
  assert.equal(world.connectionRequests, 0, 'a paid voice session was requested after the unmount');
});

test('R2D-01: the same late microphone after an unmount with nobody else arriving is released too', async () => {
  freshDevice();
  signInAs(A);
  const generations = speaking.sessionGenerations();
  const { binding, session } = mockStart(generations);
  const world = startWorld();
  const starting = examinerStart(session, world);

  /* The page is left (or the sitting replaced) with A still signed in. */
  unmountMock(generations, binding);
  const microphone = syntheticMicrophone();
  world.microphone.resolve(microphone);
  assert.equal(await starting, 'let go at the microphone');
  assert.equal(microphone.liveTracks(), 0);
  assert.equal(world.recordersStarted + world.tokenFetches + world.connectionRequests, 0);
});

test('R2D-01: the two locks each hold on their own: the number moved on with the binding untouched, and the binding let go with the number untouched', async () => {
  freshDevice();
  signInAs(A);

  /* Only the start number moves on (a teardown that did not reach the
     binding, as the component's own teardowns all also do it). */
  const numbers = speaking.sessionGenerations();
  const byNumber = mockStart(numbers);
  const numberWorld = startWorld();
  const numberStart = examinerStart(byNumber.session, numberWorld);
  numbers.next();
  assert.equal(byNumber.binding.state(), 'current', 'the binding was touched');
  const numberMicrophone = syntheticMicrophone();
  numberWorld.microphone.resolve(numberMicrophone);
  assert.equal(await numberStart, 'let go at the microphone', 'a start whose number went stale carried on');
  assert.equal(numberMicrophone.liveTracks(), 0);
  assert.equal(numberWorld.recordersStarted + numberWorld.tokenFetches + numberWorld.connectionRequests, 0);

  /* Only the binding is let go (the number untouched). */
  const kept = speaking.sessionGenerations();
  const byBinding = mockStart(kept);
  const bindingWorld = startWorld();
  const bindingStart = examinerStart(byBinding.session, bindingWorld);
  byBinding.binding.cancel();
  assert.equal(byBinding.session.current(), true, 'the number was touched');
  const bindingMicrophone = syntheticMicrophone();
  bindingWorld.microphone.resolve(bindingMicrophone);
  assert.equal(await bindingStart, 'let go at the microphone', 'a start whose binding was let go carried on');
  assert.equal(bindingMicrophone.liveTracks(), 0);
  assert.equal(bindingWorld.recordersStarted + bindingWorld.tokenFetches + bindingWorld.connectionRequests, 0);
});

test('R2D-01: a connection that comes up after the unmount is closed at once and never kept, and the microphone is released', async () => {
  freshDevice();
  signInAs(A);
  const generations = speaking.sessionGenerations();
  const { binding, session } = mockStart(generations);
  const world = startWorld();
  const starting = examinerStart(session, world);

  const microphone = syntheticMicrophone();
  world.microphone.resolve(microphone);
  world.token.resolve('SYNTHETIC-token-of-A');
  /* Let the start reach the connection wait. */
  await settle();
  assert.equal(world.connectionRequests, 1, 'the start never reached the connection wait');

  signInAs(B);
  unmountMock(generations, binding);
  const connection = syntheticConnection();
  world.connection.resolve(connection);
  assert.equal(await starting, 'let go at the connection');
  assert.equal(connection.closes, 1, 'a connection that came up after the unmount was left open');
  assert.equal(world.linkKept, null, 'a connection that came up after the unmount was kept');
  assert.equal(microphone.liveTracks(), 0, 'the microphone stayed live');
  assert.equal(world.recordersStopped, 1, 'the recorder the start began was not stopped');
});

test("R2D-01: an owner change during the token fetch opens nothing with the new student's token, in the mock embed and standalone", async () => {
  /* The mock embed, a moment before MockExam takes the examiner away. */
  freshDevice();
  signInAs(A);
  const generations = speaking.sessionGenerations();
  const { session } = mockStart(generations);
  const world = startWorld();
  const starting = examinerStart(session, world);
  const microphone = syntheticMicrophone();
  world.microphone.resolve(microphone);
  await settle();
  assert.equal(world.tokenFetches, 1, 'the start never reached the token wait');

  signInAs(B);
  world.token.resolve('SYNTHETIC-token-of-B');
  assert.equal(await starting, 'let go at the token');
  assert.equal(world.connectionRequests, 0, "a voice session was requested with B's token for A's start");
  assert.equal(microphone.liveTracks(), 0);
  assert.equal(session.current(), true, 'the screen is still there, so it is the screen that says the session closed');
  assert.equal(session.live(), false);

  /* Standalone: the attempt's own teardown runs at the switch, and the
     component's teardown moves the number on. */
  freshDevice();
  signInAs(A);
  const standalone = speaking.sessionGenerations();
  const left: string[] = [];
  const attempt = speaking.openSpeakingAttempt({
    onOwnerLeft: (stage) => {
      left.push(stage);
      standalone.next();
    },
  });
  const guarded = speaking.guardSessionStart({ generations: standalone, binding: attempt.binding, attempt });
  const world2 = startWorld();
  const starting2 = examinerStart(guarded, world2);
  const microphone2 = syntheticMicrophone();
  world2.microphone.resolve(microphone2);
  await settle();
  signInAs(B);
  assert.deepEqual(left, ['open'], 'the standalone attempt was not stopped at the switch');
  world2.token.resolve('SYNTHETIC-token-of-B');
  assert.equal(await starting2, 'let go at the token');
  assert.equal(world2.connectionRequests, 0);
  assert.equal(microphone2.liveTracks(), 0);
  assert.equal(guarded.current(), false, 'the switch did not move the number on');
});

test('R2D-01: an owner change that reached no listener is still caught when the wait ends', async () => {
  freshDevice();
  signInAs(A);
  const generations = speaking.sessionGenerations();
  const { session } = mockStart(generations);
  const world = startWorld();
  const starting = examinerStart(session, world);

  /* The owner moves without a notification (the owner module forgets it). */
  storeOwner.resetStoreOwnerForTest();
  const microphone = syntheticMicrophone();
  world.microphone.resolve(microphone);
  assert.equal(await starting, 'let go at the microphone');
  assert.equal(microphone.liveTracks(), 0);
  assert.equal(world.recordersStarted, 0);
  signInAs(A);
});

test('R2D-01: a failure that arrives after the screen let go is swallowed; the same failure while live reaches the screen', async () => {
  freshDevice();
  signInAs(A);
  const generations = speaking.sessionGenerations();

  const late = mockStart(generations);
  const lateWorld = startWorld();
  const lateStart = examinerStart(late.session, lateWorld);
  lateWorld.microphone.resolve(syntheticMicrophone());
  lateWorld.token.resolve('SYNTHETIC-token-of-A');
  await settle();
  unmountMock(generations, late.binding);
  lateWorld.connection.reject(new Error('SYNTHETIC connection failure after the unmount'));
  assert.equal(await lateStart, 'let go at the connection', 'a failure after the unmount was reported to a screen that is gone');

  const fresh = speaking.sessionGenerations();
  const live = mockStart(fresh);
  const liveWorld = startWorld();
  const liveStart = examinerStart(live.session, liveWorld);
  const microphone = syntheticMicrophone();
  liveWorld.microphone.resolve(microphone);
  liveWorld.token.resolve('SYNTHETIC-token-of-A');
  await settle();
  liveWorld.connection.reject(new Error('SYNTHETIC connection failure while live'));
  assert.equal(await liveStart, 'the connection failed while the start was live');
  assert.equal(microphone.liveTracks(), 0);
});

test('R2D-01: a newer start makes the older one stale; its late microphone never reaches the newer session', async () => {
  freshDevice();
  signInAs(A);
  const generations = speaking.sessionGenerations();
  const older = mockStart(generations);
  const olderWorld = startWorld();
  const olderStart = examinerStart(older.session, olderWorld);

  /* The screen starts again (the component cancels the older binding
     first, exactly as startTest does). */
  older.binding.cancel();
  const newer = mockStart(generations);
  assert.equal(older.session.current(), false);
  assert.ok(newer.session.live());

  const olderMicrophone = syntheticMicrophone();
  olderWorld.microphone.resolve(olderMicrophone);
  assert.equal(await olderStart, 'let go at the microphone');
  assert.equal(olderMicrophone.liveTracks(), 0);
  assert.equal(olderWorld.recordersStarted, 0);
  assert.ok(newer.session.live(), 'the older start disturbed the newer one');
});

/* The finish: the session is shut down (two waits), and only then may it be
   sent for grading. */

function finishWorld() {
  return {
    linkClosed: pendingGrade<void>(),
    recorderStopped: pendingGrade<void>(),
    graderCalls: 0,
    shown: 0,
    hidden: 0,
    notice: null as string | null,
  };
}
type FinishWorld = ReturnType<typeof finishWorld>;

/** The examiner's finish, reduced to its waits and what follows each. */
async function examinerFinish(
  session: ReturnType<typeof speaking.guardSessionStart>,
  world: FinishWorld,
  grader: Promise<SyntheticGrade>,
): Promise<string> {
  if (!session.current()) return 'not this screen\'s session';
  await world.linkClosed.promise;
  if (!session.current()) return 'let go while the connection closed';
  await world.recorderStopped.promise;
  if (!session.current()) return 'let go while the recorder stopped';
  if (!session.live()) {
    if (session.current()) world.notice = 'SESSION_CLOSED_NOTICE';
    return 'not graded';
  }
  await storeOwner.runOwnedGrade(
    session.binding,
    () => {
      world.graderCalls += 1;
      return grader;
    },
    {
      keep: (grade, owner) => keepSpeaking(grade, owner, '2026-09-23T22:00:00.000Z'),
      show: () => (world.shown += 1),
      hide: () => (world.hidden += 1),
    },
  );
  return 'graded';
}

test('R2D-01: a switch during the shutdown starts no paid grading call; the mock screen says the session closed', async () => {
  freshDevice();
  signInAs(A);
  const generations = speaking.sessionGenerations();
  const { session } = mockStart(generations);
  const world = finishWorld();
  const grader = pendingGrade<SyntheticGrade>();
  const finishing = examinerFinish(session, world, grader.promise);

  /* The closing line was heard; the connection is closing when the page
     changes hands, before MockExam has taken the examiner away. */
  signInAs(B);
  world.linkClosed.resolve();
  world.recorderStopped.resolve();
  assert.equal(await finishing, 'not graded');
  assert.equal(world.graderCalls, 0, 'a session whose student had left was sent for (paid) grading');
  assert.equal(world.notice, 'SESSION_CLOSED_NOTICE');
  assert.deepEqual(recordEventsOf(A), []);
  assert.deepEqual(recordEventsOf(B), []);
});

test('R2D-01: an unmount during the shutdown starts no paid grading call and touches nothing more', async () => {
  freshDevice();
  signInAs(A);
  const generations = speaking.sessionGenerations();
  const { binding, session } = mockStart(generations);
  const world = finishWorld();
  const grader = pendingGrade<SyntheticGrade>();
  const finishing = examinerFinish(session, world, grader.promise);

  world.linkClosed.resolve();
  await settle();
  signInAs(B);
  unmountMock(generations, binding);
  world.recorderStopped.resolve();
  assert.equal(await finishing, 'let go while the recorder stopped');
  assert.equal(world.graderCalls, 0, 'a session let go during its shutdown was sent for (paid) grading');
  assert.equal(world.notice, null, 'a screen that is gone was told something');
});

test('R2D-01: a grade requested before the switch and the unmount is still kept for A, and shown to nobody', async () => {
  freshDevice();
  signInAs(A);
  const generations = speaking.sessionGenerations();
  const { binding, session } = mockStart(generations);
  const world = finishWorld();
  const grader = pendingGrade<SyntheticGrade>();
  const finishing = examinerFinish(session, world, grader.promise);

  world.linkClosed.resolve();
  world.recorderStopped.resolve();
  await settle();
  assert.equal(world.graderCalls, 1, 'the grading request never went out');

  signInAs(B);
  unmountMock(generations, binding);
  grader.resolve(SPEAKING_GRADE);
  assert.equal(await finishing, 'graded');
  assert.equal(recordEventsOf(A).length, 1, 'a grade requested before the suspension was not kept for A');
  assert.deepEqual(recordEventsOf(B), [], "A's grade reached B");
  assert.equal(world.shown, 0, "A's report was shown on B's page");
  assert.equal(world.hidden, 0);
  assert.equal(world.graderCalls, 1, 'the grade was requested twice');
});

test('LiveExaminer routes every wait of its start through the guard, asks again after the shutdown, and moves the number on at every teardown', () => {
  const code = componentSource('LiveExaminer.tsx');
  const start = functionBody(code, 'startTest');

  /* Every wait of the start goes through the start's guard. */
  const waits = [...start.matchAll(/\bawait\s+([\w.]+)/g)].map((match) => match[1]);
  assert.ok(waits.length >= 4, 'the start has fewer waits than expected');
  assert.deepEqual(
    waits.filter((name) => name !== 'session.step'),
    [],
    'a wait in startTest is not routed through the guard',
  );
  for (const step of ['fetchLiveConfig(', 'navigator.mediaDevices.getUserMedia(', 'getAccessToken()', 'openExaminerLink(']) {
    assert.match(start, new RegExp(`session\\.step\\(\\s*${step.replace(/[.()]/g, '\\$&')}`), `${step} is not waited for through the guard`);
  }
  /* A late microphone has its tracks stopped; a late connection is closed. */
  assert.match(start, /getUserMedia\([\s\S]*?\}\),\s*releaseMic,\s*\)/, 'a late microphone is not released');
  assert.match(start, /openExaminerLink\([\s\S]*?\}\),\s*closeConnection,\s*\)/, 'a late connection is not closed');
  /* Each no is followed by the start letting go, before anything else. */
  for (const [answer, what] of [
    ['if (!fetched)', 'the settings'],
    ['if (!granted)', 'the microphone'],
    ['if (!token)', 'the token'],
    ['if (!opened)', 'the connection'],
  ] as const) {
    before(start, answer, 'dropStart(session', `a no at ${what} is not followed by the start letting go`);
  }
  before(start, 'if (!granted)', 'new MediaRecorder(', 'the recorder can start before the microphone is checked');
  before(start, 'if (!token)', 'openExaminerLink(', 'the connection can be requested before the token is checked');
  /* The connection's own callbacks speak only for the current start. */
  assert.match(start, /onTranscript:\s*\(turns\)\s*=>\s*\{\s*if \(session\.current\(\)\)/);
  assert.match(start, /onClosed:\s*\(reason, wasClean\)\s*=>\s*\{\s*if \(!session\.current\(\) \|\| endedRef\.current\) return;/);
  assert.match(start, /if \(e\.data\.size > 0 && session\.current\(\)\)/, "a let-go recorder's last chunk can join a later session");

  /* dropStart lets go of the start's own recorder and microphone first, and
     only then decides whether the screen is still this start's. */
  const drop = functionBody(code, 'dropStart');
  before(drop, 'rec.stop()', 'if (!session.current()) return;', 'a let-go start does not stop its own recorder');
  before(drop, 'releaseMic(stream)', 'if (!session.current()) return;', 'a let-go start does not release its own microphone');
  before(drop, 'if (!session.current()) return;', 'setError(t(SESSION_CLOSED_NOTICE))', 'the notice can go over a screen that moved on');

  /* The finish asks after each shutdown wait, and before grading. */
  const finish = functionBody(code, 'finishTest');
  before(finish, 'const session = sessionRef.current', 'endedRef.current = true', 'the session being finished is read too late');
  before(finish, 'await link.close()', 'if (!session.current()) return;', 'the connection closing is not followed by a check');
  before(finish, 'await stopRecorder()', 'if (!session.current()) return;', 'the recorder stopping is not followed by a check');
  before(finish, 'attempt.mayAcceptRecording()', 'if (!session.live())', 'grading is not guarded after the shutdown');
  before(finish, 'if (!session.live())', 'gradeInterview(', 'the interview can be graded without the guard');
  before(finish, 'if (!session.live())', 'setPhase(\'grading\')', 'the grading screen can come up without the guard');

  /* The later steps ask as well. */
  before(functionBody(code, 'startPart2Flow'), 'await waitForExaminerQuiet(', 'if (!session?.current()) return;', 'the cue-card wait is not followed by a check');
  before(functionBody(code, 'onTranscriptUpdate'), 'waitUntilQuiet()', 'if (!session?.current()) return;', 'the closing-line wait is not followed by a check');

  /* Every teardown moves the number on. */
  assert.match(functionBody(code, 'leaveForOwnerChange'), /generations\.next\(\)/, 'the switch does not make a waiting start stale');
  assert.match(functionBody(code, 'abandonToMenu'), /generations\.next\(\)/, "the student's own Back does not make a waiting start stale");
  assert.match(code, /generations\.unmount\(\);\s*abandonToMenu\(\);/, 'the unmount does not make a waiting start stale for good');
  /* ...and the mock's own reporting at the unmount is exactly as it was. */
  assert.match(code, /if \(mock && !mockReportedRef\.current && openedFor\) \{\s*mockReportedRef\.current = true;\s*if \(examinerLeftScreen\(openedFor\) === 'suspended'\) onSuspend\?\.\(\);\s*else onAbort\?\.\(\);\s*\}/);
});
