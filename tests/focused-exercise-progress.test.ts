/* Half finished focused exercises are not lost, and are never handed to
 * the wrong student (22 September 2026).
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/focused-exercise-progress.test.ts
 * The whole suite is `npm test`.
 *
 * WHAT WENT WRONG
 * A tester answered three of six questions on
 * /trainers/focused/reading-matching-headings-guided against a production
 * build, reloaded, and got "0 of 6 answered" with all three answers gone.
 * A focused exercise writes one event when check is pressed, so until then
 * the answers lived in the tab and nothing else. The written focused task
 * never had this problem (written-focused-task.ts keeps a draft per owner
 * and per exercise) and neither did the lesson quick check
 * (src/lib/learning/lesson-check.ts).
 *
 * WHAT THESE TESTS PIN
 *   1. The key. Per owner and per exercise, a new key, and neither of the
 *      two existing stores renamed or reset.
 *   2. What gets stored. Answers that have something in them, and the help
 *      each one had. Not blanks, not 'none'.
 *   3. What comes back, including the counter being right afterwards.
 *   4. ISOLATION. One owner's stored answers are never returned for
 *      another. This is the test that matters most: the cost of getting it
 *      wrong is showing a student someone else's work.
 *   5. Completion clears it, so a revisit starts clean.
 *   6. A corrupted, stale or partial stored value is ignored rather than
 *      throwing, and a browser with storage blocked still works.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FOCUSED_PROGRESS_DAYS,
  FOCUSED_PROGRESS_KEY,
  NO_HELP,
  applyFocusedProgress,
  completionOf,
  focusedProgressAction,
  focusedProgressKey,
  focusedProgressToStore,
  readFocusedProgress,
  withHelp,
  type FocusedItemView,
  type FocusedProgressStorage,
  type ItemHelpState,
} from '../src/components/learning/focused-exercise.ts';
import { LESSON_CHECK_PROGRESS_KEY } from '../src/lib/learning/lesson-check.ts';
import { WRITTEN_DRAFT_PREFIX } from '../src/components/learning/written-focused-task.ts';

/* ── Synthetic fixtures. No real student and no real paper is involved:
   the item ids below are shaped like a paper's own (`<testId>:<questionId>`)
   but name nothing that exists. ── */

const EXERCISE_ID = 'reading-matching-headings-guided';
const OWNER = 'user:synthetic-anna';
const OTHER_OWNER = 'user:synthetic-bekzat';
const NOW = '2026-09-22T10:00:00.000Z';

/** Six questions, exactly the shape the tester's exercise had. */
const ITEMS: FocusedItemView[] = Array.from({ length: 6 }, (_, index) => ({
  itemId: `synthetic-reading-001:q${index + 1}`,
  questionId: `q${index + 1}`,
  number: index + 14,
  label: `Paragraph ${'ABCDEF'[index]}`,
  answer: `Heading ${index + 1}`,
}));

const VIEW = { exerciseId: EXERCISE_ID, items: ITEMS };

/** Three of six answered, which is where the tester was when they
    reloaded. */
const THREE_ANSWERS: Record<string, string> = {
  [ITEMS[0]!.itemId]: 'Heading 1',
  [ITEMS[1]!.itemId]: 'Heading 5',
  [ITEMS[2]!.itemId]: 'Heading 3',
};

interface MemoryStorage extends FocusedProgressStorage {
  held: Map<string, string>;
}

function memoryStorage(seed: Record<string, string> = {}): MemoryStorage {
  const held = new Map<string, string>(Object.entries(seed));
  return {
    held,
    getItem: (key: string) => held.get(key) ?? null,
    setItem: (key: string, value: string) => {
      held.set(key, value);
    },
    removeItem: (key: string) => {
      held.delete(key);
    },
  };
}

/** Keep the boxes as they stand, the way the component does it. */
function keep(
  storage: FocusedProgressStorage | null,
  owner: string,
  answers: Record<string, string>,
  help: Record<string, ItemHelpState> = {},
  now = NOW,
): boolean {
  return applyFocusedProgress(
    storage,
    owner,
    EXERCISE_ID,
    focusedProgressAction({ exerciseId: EXERCISE_ID, answers, help, settled: false, now }),
  );
}

/* ── 1. The key ──────────────────────────────────────────────────────────── */

test('the in-progress key is namespaced by owner and by exercise', () => {
  const mine = focusedProgressKey(OWNER, EXERCISE_ID);
  assert.equal(mine, `${FOCUSED_PROGRESS_KEY}::${OWNER}::${EXERCISE_ID}`);
  assert.notEqual(mine, focusedProgressKey(OTHER_OWNER, EXERCISE_ID));
  assert.notEqual(mine, focusedProgressKey(OWNER, 'reading-matching-headings-check'));
});

test('the in-progress key is a new one, and no existing key is renamed', () => {
  assert.equal(FOCUSED_PROGRESS_KEY, 'ielts.learning.focus.v1');
  /* The two stores this one copies. If either of these ever changes, every
     student on that device loses what it held, so they are pinned here as
     well as wherever else they are asserted. */
  assert.equal(LESSON_CHECK_PROGRESS_KEY, 'ielts.learning.check.v1');
  assert.equal(WRITTEN_DRAFT_PREFIX, 'ielts.learning.written.v1');
  for (const existing of [LESSON_CHECK_PROGRESS_KEY, WRITTEN_DRAFT_PREFIX]) {
    assert.notEqual(FOCUSED_PROGRESS_KEY, existing);
    assert.ok(!FOCUSED_PROGRESS_KEY.startsWith(`${existing}::`));
    assert.ok(!existing.startsWith(`${FOCUSED_PROGRESS_KEY}::`));
  }
});

/* ── 2. What gets stored ─────────────────────────────────────────────────── */

test('only the boxes with something in them are stored', () => {
  const progress = focusedProgressToStore(
    EXERCISE_ID,
    { ...THREE_ANSWERS, [ITEMS[3]!.itemId]: '', [ITEMS[4]!.itemId]: '   ' },
    {},
    NOW,
  );
  assert.ok(progress);
  assert.deepEqual(Object.keys(progress!.answers).sort(), Object.keys(THREE_ANSWERS).sort());
  assert.equal(progress!.version, 1);
  assert.equal(progress!.exerciseId, EXERCISE_ID);
  assert.equal(progress!.updatedAt, NOW);
});

test('the help an answer had is stored with it, and "none" is not', () => {
  const help: Record<string, ItemHelpState> = {
    [ITEMS[0]!.itemId]: withHelp(NO_HELP, { assistance: 'hint' }),
    [ITEMS[1]!.itemId]: NO_HELP,
  };
  const progress = focusedProgressToStore(EXERCISE_ID, THREE_ANSWERS, help, NOW);
  assert.deepEqual(progress!.assistance, { [ITEMS[0]!.itemId]: 'hint' });
});

test('nothing answered means nothing is stored at all', () => {
  assert.equal(focusedProgressToStore(EXERCISE_ID, {}, {}, NOW), null);
  assert.equal(focusedProgressToStore(EXERCISE_ID, { [ITEMS[0]!.itemId]: '  ' }, {}, NOW), null);

  const storage = memoryStorage();
  assert.equal(keep(storage, OWNER, {}), true);
  assert.equal(storage.held.size, 0);
});

/* ── 3. What comes back ──────────────────────────────────────────────────── */

test('three of six answered come back after a reload, and the counter is right', () => {
  const storage = memoryStorage();
  assert.equal(keep(storage, OWNER, THREE_ANSWERS), true);

  const restored = readFocusedProgress(storage, OWNER, VIEW, NOW);
  assert.deepEqual(restored.answers, THREE_ANSWERS);
  /* This is the reported bug in one line: the screen counts the answers it
     has, and after a reload it has three of six rather than none. */
  assert.equal(Object.keys(restored.answers).length, 3);
  assert.equal(completionOf(ITEMS, restored.answers), 'partial');
});

test('a restored answer keeps the help it had, so a reload cannot launder it', () => {
  const storage = memoryStorage();
  const help: Record<string, ItemHelpState> = {
    [ITEMS[0]!.itemId]: withHelp(NO_HELP, { assistance: 'answer-shown' }),
  };
  keep(storage, OWNER, THREE_ANSWERS, help);

  const restored = readFocusedProgress(storage, OWNER, VIEW, NOW);
  assert.equal(restored.assistance[ITEMS[0]!.itemId], 'answer-shown');
  /* Rebuilt exactly as the component rebuilds it: the level survives, and
     raising it again can only move it up. */
  const rebuilt = withHelp(NO_HELP, { assistance: restored.assistance[ITEMS[0]!.itemId]! });
  assert.equal(rebuilt.assistance, 'answer-shown');
  assert.equal(withHelp(rebuilt, { assistance: 'hint' }).assistance, 'answer-shown');
  /* An item that was never helped comes back unhelped rather than guessed. */
  assert.equal(restored.assistance[ITEMS[1]!.itemId], undefined);
});

test('an answer for a question this exercise no longer has is dropped', () => {
  const storage = memoryStorage();
  keep(storage, OWNER, { ...THREE_ANSWERS, 'synthetic-reading-001:q99': 'Heading 2' });

  const restored = readFocusedProgress(storage, OWNER, VIEW, NOW);
  assert.deepEqual(restored.answers, THREE_ANSWERS);
});

test('a value stored under another exercise id restores nothing', () => {
  const storage = memoryStorage();
  keep(storage, OWNER, THREE_ANSWERS);
  const key = focusedProgressKey(OWNER, EXERCISE_ID);
  const tampered = { ...JSON.parse(storage.held.get(key)!), exerciseId: 'some-other-exercise' };
  storage.held.set(key, JSON.stringify(tampered));

  assert.deepEqual(readFocusedProgress(storage, OWNER, VIEW, NOW).answers, {});
});

test('an unfinished exercise older than the window is not restored', () => {
  const storage = memoryStorage();
  keep(storage, OWNER, THREE_ANSWERS, {}, '2026-08-01T10:00:00.000Z');

  const dayAfter = new Date(
    Date.parse('2026-08-01T10:00:00.000Z') + (FOCUSED_PROGRESS_DAYS + 1) * 24 * 60 * 60 * 1000,
  ).toISOString();
  assert.deepEqual(readFocusedProgress(storage, OWNER, VIEW, dayAfter).answers, {});
  /* Inside the window it still comes back. */
  const dayBefore = new Date(
    Date.parse('2026-08-01T10:00:00.000Z') + (FOCUSED_PROGRESS_DAYS - 1) * 24 * 60 * 60 * 1000,
  ).toISOString();
  assert.deepEqual(readFocusedProgress(storage, OWNER, VIEW, dayBefore).answers, THREE_ANSWERS);
});

/* ── 4. Isolation. One student's answers are never another's ─────────────── */

test('another owner\'s stored answers are never returned', () => {
  const storage = memoryStorage();
  keep(storage, OWNER, THREE_ANSWERS);

  /* Same browser, same exercise, different student signed in. */
  assert.deepEqual(readFocusedProgress(storage, OTHER_OWNER, VIEW, NOW), { answers: {}, assistance: {} });
  /* And the first student's row is untouched by the second one's visit. */
  assert.deepEqual(readFocusedProgress(storage, OWNER, VIEW, NOW).answers, THREE_ANSWERS);
});

test('two owners on one browser keep separate rows, and neither clears the other', () => {
  const storage = memoryStorage();
  const theirs = { [ITEMS[5]!.itemId]: 'Heading 6' };
  keep(storage, OWNER, THREE_ANSWERS);
  keep(storage, OTHER_OWNER, theirs);

  assert.equal(storage.held.size, 2);
  assert.deepEqual(readFocusedProgress(storage, OWNER, VIEW, NOW).answers, THREE_ANSWERS);
  assert.deepEqual(readFocusedProgress(storage, OTHER_OWNER, VIEW, NOW).answers, theirs);

  /* One of them finishing the exercise clears only their own copy. */
  applyFocusedProgress(storage, OTHER_OWNER, EXERCISE_ID, { kind: 'clear' });
  assert.deepEqual(readFocusedProgress(storage, OTHER_OWNER, VIEW, NOW).answers, {});
  assert.deepEqual(readFocusedProgress(storage, OWNER, VIEW, NOW).answers, THREE_ANSWERS);
});

/* ── 5. Completion clears it ─────────────────────────────────────────────── */

test('a checked set is cleared, whatever is in the boxes', () => {
  assert.deepEqual(
    focusedProgressAction({ exerciseId: EXERCISE_ID, answers: THREE_ANSWERS, help: {}, settled: true, now: NOW }),
    { kind: 'clear' },
  );
});

test('checking the set leaves nothing behind, so a revisit starts clean', () => {
  const storage = memoryStorage();
  keep(storage, OWNER, THREE_ANSWERS);
  assert.equal(storage.held.size, 1);

  applyFocusedProgress(
    storage,
    OWNER,
    EXERCISE_ID,
    focusedProgressAction({ exerciseId: EXERCISE_ID, answers: THREE_ANSWERS, help: {}, settled: true, now: NOW }),
  );
  assert.equal(storage.held.size, 0);
  assert.deepEqual(readFocusedProgress(storage, OWNER, VIEW, NOW), { answers: {}, assistance: {} });
});

test('emptying every box while working clears the copy rather than keeping an empty one', () => {
  const storage = memoryStorage();
  keep(storage, OWNER, THREE_ANSWERS);
  keep(storage, OWNER, { [ITEMS[0]!.itemId]: '' });
  assert.equal(storage.held.size, 0);
});

/* ── 6. Corrupt, partial and blocked ────────────────────────────────────── */

test('a corrupted or unexpected stored value is ignored rather than thrown', () => {
  const key = focusedProgressKey(OWNER, EXERCISE_ID);
  const rubbish = [
    'not json at all',
    '',
    '{',
    'null',
    '[]',
    '"a string"',
    JSON.stringify({ version: 2, exerciseId: EXERCISE_ID, updatedAt: NOW, answers: THREE_ANSWERS }),
    JSON.stringify({ exerciseId: EXERCISE_ID, updatedAt: NOW, answers: THREE_ANSWERS }),
    JSON.stringify({ version: 1, exerciseId: EXERCISE_ID, updatedAt: NOW }),
    JSON.stringify({ version: 1, exerciseId: EXERCISE_ID, updatedAt: NOW, answers: [] }),
    JSON.stringify({ version: 1, exerciseId: EXERCISE_ID, updatedAt: NOW, answers: 'Heading 1' }),
    JSON.stringify({ version: 1, exerciseId: EXERCISE_ID, updatedAt: 'not a date', answers: THREE_ANSWERS }),
    JSON.stringify({ version: 1, exerciseId: EXERCISE_ID, answers: THREE_ANSWERS }),
  ];
  for (const raw of rubbish) {
    const storage = memoryStorage({ [key]: raw });
    assert.deepEqual(
      readFocusedProgress(storage, OWNER, VIEW, NOW),
      { answers: {}, assistance: {} },
      `restored something from ${raw.slice(0, 40)}`,
    );
  }
});

test('a partly broken stored value gives back the parts that are sound', () => {
  const key = focusedProgressKey(OWNER, EXERCISE_ID);
  const storage = memoryStorage({
    [key]: JSON.stringify({
      version: 1,
      exerciseId: EXERCISE_ID,
      updatedAt: NOW,
      answers: {
        [ITEMS[0]!.itemId]: 'Heading 1',
        [ITEMS[1]!.itemId]: 7,
        [ITEMS[2]!.itemId]: null,
        [ITEMS[3]!.itemId]: { value: 'Heading 4' },
      },
      assistance: {
        [ITEMS[0]!.itemId]: 'not-a-level',
        [ITEMS[1]!.itemId]: 'hint',
      },
    }),
  });

  const restored = readFocusedProgress(storage, OWNER, VIEW, NOW);
  assert.deepEqual(restored.answers, { [ITEMS[0]!.itemId]: 'Heading 1' });
  /* A level that is not one of the five in the contract is dropped; the
     answer beside it is still the student's own and is kept. */
  assert.deepEqual(restored.assistance, {});
});

test('an answers map with no assistance map at all still restores the answers', () => {
  const key = focusedProgressKey(OWNER, EXERCISE_ID);
  const storage = memoryStorage({
    [key]: JSON.stringify({ version: 1, exerciseId: EXERCISE_ID, updatedAt: NOW, answers: THREE_ANSWERS }),
  });
  const restored = readFocusedProgress(storage, OWNER, VIEW, NOW);
  assert.deepEqual(restored.answers, THREE_ANSWERS);
  assert.deepEqual(restored.assistance, {});
});

test('a browser with no storage at all reads nothing and throws nothing', () => {
  assert.deepEqual(readFocusedProgress(null, OWNER, VIEW, NOW), { answers: {}, assistance: {} });
  assert.equal(keep(null, OWNER, THREE_ANSWERS), false);
  assert.equal(applyFocusedProgress(null, OWNER, EXERCISE_ID, { kind: 'clear' }), false);
});

test('a browser that refuses every read or write costs the resumption and nothing else', () => {
  const blocked: FocusedProgressStorage = {
    getItem() {
      throw new Error('storage blocked by policy');
    },
    setItem() {
      throw new Error('quota exceeded');
    },
    removeItem() {
      throw new Error('storage blocked by policy');
    },
  };

  assert.deepEqual(readFocusedProgress(blocked, OWNER, VIEW, NOW), { answers: {}, assistance: {} });
  /* False is what the screen shows the student as "this browser is not
     saving your work right now". */
  assert.equal(keep(blocked, OWNER, THREE_ANSWERS), false);
  /* A clear that cannot be written is inert, not a failure: the key is
     namespaced and every field is checked on the way back in. */
  assert.equal(applyFocusedProgress(blocked, OWNER, EXERCISE_ID, { kind: 'clear' }), true);
});
