/* Lesson quick checks as evidence.
 *
 * The one thing these questions have never done is count. A student could
 * answer every question on a lesson page and the platform's only record of
 * the lesson was the completion click beside them (the audit's reproduced
 * finding 4). What follows pins the rules that make those answers usable
 * without ever making them say more than they can:
 *
 *   - the answer that is kept is the FIRST one, captured before the
 *     correct answer, the explanation or the transcript appeared;
 *   - help shown before an answer is recorded, and an assisted answer is
 *     never independent evidence;
 *   - a second go is linked to the first and never replaces it;
 *   - a perfect score on questions already seen raises nothing, checked
 *     against the real policy rather than a restatement of it;
 *   - a question is called the same thing here as in the generated index,
 *     for all 270 of them, and a question lifted from a real paper is
 *     called what that paper calls it, so sitting the paper later knows it
 *     has been met;
 *   - a blocked browser store costs the record and not the exercise.
 *
 * Every learner in this file is SYNTHETIC. The questions they answer are
 * real, because their identities are the real ones, but no real student's
 * work appears anywhere.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AFTER_ANSWER_SHOWN,
  AFTER_MARKING_SHOWN,
  FIRST_GO_ASSISTANCE,
  LESSON_CHECK_CONTENT_VERSION,
  clearLessonCheckProgress,
  completionOf,
  lessonCheckActivityId,
  lessonCheckDrafts,
  lessonCheckItemId,
  lessonCheckItemKey,
  lessonCheckProgressKey,
  lessonQuizActivityId,
  lessonQuizItemIdentity,
  paperItemId,
  readLessonCheckProgress,
  writeLessonCheckProgress,
  type LessonCheckContext,
  type LessonCheckItemIdentity,
  type LessonCheckSubmission,
} from '../src/lib/learning/lesson-check.ts';
import {
  anonymousOwner,
  createLearnerStore,
  ownerNamespace,
  type BrowserStorage,
  type LearnerStore,
} from '../src/lib/learning/store.browser.ts';
import { classifyEvidence, itemExposureKey } from '../src/lib/learning/evidence.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import type { AbilityEstimate, PolicyOutputV1 } from '../src/lib/learning/contracts/policy.ts';
import type { EvidenceEvent } from '../src/lib/learning/contracts/evidence.ts';
import { PRACTICE_ITEM_IDENTITY } from '../src/data/reading-practice.ts';
import { LEARNING_INDEX, checkActivityId, learningCatalogue } from '../src/lib/learning/catalog.ts';
import { practiceKey } from '../src/lib/i18n/test-explanations.ts';
import { buildLessonChecks } from '../tools/generate-learning-index.mjs';
import { testItemId } from '../src/components/attempt-recording.ts';

/* ── Stand-ins for the browser ───────────────────────────────────────────── */

/** A few lines of memory instead of a browser store. */
function memoryStorage(): BrowserStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/** A browser that refuses storage outright, the way a locked down device
    or a private window with site data blocked does. */
function blockedStorage(): BrowserStorage {
  return {
    getItem: () => {
      throw new Error('storage is blocked');
    },
    setItem: () => {
      throw new Error('storage is blocked');
    },
    removeItem: () => {
      throw new Error('storage is blocked');
    },
  };
}

const OWNER = anonymousOwner('synthetic-device');

function storeOn(storage: BrowserStorage | null, now = () => '2026-09-21T09:00:00.000Z'): LearnerStore {
  return createLearnerStore({
    owner: OWNER,
    storage,
    now,
    /* The old stores are not what this file is about, and a stand-in
       keeps every run identical. */
    legacy: () => ({ progress: null, plan: null }),
    onRefused: (draft, problem) => assert.fail(`draft for ${draft.activityId} refused: ${problem}`),
  });
}

/* ── Real identities, synthetic answers ──────────────────────────────────── */

const HEADINGS_SET = 'practice-reading-headings';
const PARAPHRASE_SET = 'practice-reading-paraphrase';

function identitiesOf(setId: string): readonly LessonCheckItemIdentity[] {
  const held = PRACTICE_ITEM_IDENTITY[setId];
  assert.ok(held && held.length > 0, `no stamped identity for ${setId}`);
  return held;
}

function context(setId: string, over: Partial<LessonCheckContext> = {}): LessonCheckContext {
  return {
    activityId: lessonCheckActivityId(setId),
    contentVersion: LESSON_CHECK_CONTENT_VERSION,
    paper: 'reading',
    at: '2026-09-21T09:00:00.000Z',
    completion: 'completed',
    repeatAssistance: AFTER_ANSWER_SHOWN,
    setId,
    ...over,
  };
}

/** SYNTHETIC: `count` answers to a real set, right or wrong as asked. */
function answers(
  setId: string,
  count: number,
  over: Partial<LessonCheckSubmission> = {},
): LessonCheckSubmission[] {
  return identitiesOf(setId)
    .slice(0, count)
    .map((identity) => ({ identity, given: 'i', correct: true, attempt: 0, ...over }));
}

function itemOf(event: EvidenceEvent, index = 0) {
  const item = (event.items ?? [])[index];
  assert.ok(item, 'a lesson check event carries the questions it was about');
  return item;
}

/** The one event a press of check produces. */
function oneEvent(events: readonly EvidenceEvent[]): EvidenceEvent {
  assert.equal(events.length, 1, 'one press of check is one event');
  return events[0]!;
}

function estimate(output: PolicyOutputV1, key: string): AbilityEstimate {
  const found = output.estimates.find((entry) => entry.scopeKey === key);
  assert.ok(found, `no estimate for ${key}`);
  return found;
}

function ignoredCount(output: PolicyOutputV1, reason: string): number {
  return output.ignored.find((entry) => entry.reason === reason)?.count ?? 0;
}

/* ── Identity ────────────────────────────────────────────────────────────── */

test('every one of the 270 questions is called the same thing here as in the index', () => {
  /* Recomputed from the generator, not read from the committed file, so a
     stale index cannot make this agree by accident. */
  const generated = buildLessonChecks() as {
    id: string;
    items: { itemKey: string; itemVersion: string; type: string; sourceTestId?: string; sourceQuestionId?: string }[];
  }[];
  const expected: Record<string, unknown[]> = {};
  for (const set of generated) {
    expected[set.id] = set.items.map((item) => ({
      key: item.itemKey,
      version: item.itemVersion,
      type: item.type,
      ...(item.sourceTestId ? { testId: item.sourceTestId } : {}),
      ...(item.sourceQuestionId ? { questionId: item.sourceQuestionId } : {}),
    }));
  }

  const stamped: Record<string, unknown[]> = {};
  for (const [setId, items] of Object.entries(PRACTICE_ITEM_IDENTITY)) {
    stamped[setId] = items.map((item) => ({ ...item }));
  }

  assert.deepEqual(
    stamped,
    expected,
    'PRACTICE_ITEM_IDENTITY in src/data/reading-practice.ts is generated from ' +
      'tools/generate-learning-index.mjs (buildLessonChecks). Regenerate it from the index rather than ' +
      'editing it by hand: a question whose identity is wrong inherits another question evidence.',
  );

  const total = Object.values(expected).reduce((n, items) => n + items.length, 0);
  assert.equal(Object.keys(expected).length, 22, 'twenty two lesson check sets');
  assert.equal(total, 270, 'two hundred and seventy questions');
});

test('the committed index agrees with the stamp, item for item', () => {
  for (const set of LEARNING_INDEX.lessonChecks) {
    const stamped = identitiesOf(set.id);
    assert.equal(stamped.length, set.items.length, `${set.id} has a different number of questions`);
    set.items.forEach((item, index) => {
      const mine = stamped[index]!;
      assert.equal(mine.key, item.itemKey);
      assert.equal(mine.version, item.itemVersion);
      assert.equal(mine.type, item.type);
      assert.equal(mine.testId, item.sourceTestId);
      assert.equal(mine.questionId, item.sourceQuestionId);
    });
  }
});

test('the positional key is the one the explanations already use', () => {
  for (let unit = 0; unit < 4; unit += 1) {
    for (let question = 0; question < 6; question += 1) {
      assert.equal(lessonCheckItemKey(unit, question), practiceKey(unit, question));
    }
  }
  assert.equal(lessonCheckItemKey(0, 3), 'u0-q3');
});

test('a question from a real paper is called what that paper calls it', () => {
  const [first] = identitiesOf(HEADINGS_SET);
  assert.ok(first?.testId && first.questionId, 'this set is lifted from a real paper');
  assert.equal(lessonCheckItemId(HEADINGS_SET, first), paperItemId(first.testId, first.questionId));
  assert.equal(lessonCheckItemId(HEADINGS_SET, first), 'reading-full-006:q14');

  /* The paraphrase lesson's warm-up is hand written and has no paper, so
     it is named by its own set and position instead. */
  const [authored] = identitiesOf(PARAPHRASE_SET);
  assert.ok(authored && !authored.testId, 'the paraphrase warm-up is hand written');
  assert.equal(lessonCheckItemId(PARAPHRASE_SET, authored), 'check:practice-reading-paraphrase:u0-q0');
});

test('a lesson check and a drill or full paper name the same real question identically', () => {
  /* lessonCheckItemId (this file) and testItemId (src/components/
     attempt-recording.ts, what TestPlayer's buildQuestionItems stamps on a
     drill or full-paper submission) both defer to paperItemId in
     src/lib/learning/evidence.ts now. Meeting question 14 of
     reading-full-006 through the lesson check, a drill of that paper, or
     the paper itself must produce one item id, or exposure and the retry
     link would silently split into two. */
  const [first] = identitiesOf(HEADINGS_SET);
  assert.ok(first?.testId && first.questionId, 'this set is lifted from a real paper');
  const fromLessonCheck = lessonCheckItemId(HEADINGS_SET, first);
  const fromDrillOrPaper = testItemId(first.testId, first.questionId);
  assert.equal(fromLessonCheck, fromDrillOrPaper);
  assert.equal(fromLessonCheck, 'reading-full-006:q14');
});

test('the activity id and the content version are the catalogue own', () => {
  const catalogue = learningCatalogue();
  const checks = catalogue.activities.filter((activity) => activity.kind === 'lesson-check');
  assert.equal(checks.length, 22);
  for (const set of LEARNING_INDEX.lessonChecks) {
    assert.equal(lessonCheckActivityId(set.id), checkActivityId(set.id));
  }
  for (const activity of checks) {
    assert.equal(
      activity.contentVersion,
      LESSON_CHECK_CONTENT_VERSION,
      `${activity.id} is at version ${activity.contentVersion}; LESSON_CHECK_CONTENT_VERSION must follow it`,
    );
  }
});

/* ── The first answer is the one that counts ─────────────────────────────── */

test('the first answer is what gets stored, even after the student changes it', () => {
  const store = storeOn(memoryStorage());
  const [identity] = identitiesOf(HEADINGS_SET);
  assert.ok(identity);

  const first = lessonCheckDrafts(context(HEADINGS_SET), [
    { identity, given: 'iv', correct: false, attempt: 0 },
  ]);
  const firstEvent = oneEvent(store.recordEvents(first.drafts));
  assert.equal(itemOf(firstEvent).firstAnswer, 'iv');
  assert.equal(itemOf(firstEvent).correct, false);
  assert.equal(itemOf(firstEvent).assistance, FIRST_GO_ASSISTANCE);
  assert.equal(firstEvent.mode, 'lesson-check');
  assert.equal(firstEvent.completion, 'completed');

  /* Checking the unit printed the right answer, and the student went
     round again and typed it in. */
  const second = lessonCheckDrafts(
    context(HEADINGS_SET, { at: '2026-09-21T09:05:00.000Z' }),
    [{ identity, given: 'vii', correct: true, attempt: 1 }],
    first.recorded,
  );
  const secondEvent = oneEvent(store.recordEvents(second.drafts));

  const held = store.read().events;
  assert.equal(held.length, 2, 'the corrected answer is a second row, never a rewrite of the first');
  assert.equal(itemOf(held[0]!).firstAnswer, 'iv', 'the first answer still says what they actually put');
  assert.equal(itemOf(held[1]!).firstAnswer, 'vii');
  assert.equal(secondEvent.retryOf, firstEvent.id, 'the second go points at the first');
  assert.equal(itemOf(secondEvent).assistance, AFTER_ANSWER_SHOWN);
});

test('pressing check again with nothing altered is not a second answer', () => {
  const store = storeOn(memoryStorage());
  const submissions = answers(HEADINGS_SET, 3);
  const first = lessonCheckDrafts(context(HEADINGS_SET), submissions);
  store.recordEvents(first.drafts);

  const again = lessonCheckDrafts(context(HEADINGS_SET, { at: '2026-09-21T09:02:00.000Z' }), submissions, first.recorded);
  assert.deepEqual(again.drafts, [], 'nothing changed, so nothing happened');
  assert.equal(store.read().events.length, 1);
  assert.equal((store.read().events[0]!.items ?? []).length, 3, 'three questions, one press, one row');
});

test('a blank answer is recorded as blank, and the go is partial', () => {
  const store = storeOn(memoryStorage());
  const [first, second] = identitiesOf(HEADINGS_SET);
  assert.ok(first && second);
  const submissions: LessonCheckSubmission[] = [
    { identity: first, given: 'ii', correct: true, attempt: 0 },
    { identity: second, given: '', correct: false, attempt: 0 },
  ];
  assert.equal(completionOf(submissions), 'partial');
  assert.equal(completionOf([{ identity: second, given: '', correct: false, attempt: 0 }]), 'blank');

  const write = lessonCheckDrafts(context(HEADINGS_SET, { completion: completionOf(submissions) }), submissions);
  const event = oneEvent(store.recordEvents(write.drafts));
  assert.equal(itemOf(event, 1).firstAnswer, '', 'left blank is not the same as answered wrongly');
  assert.equal(itemOf(event, 1).correct, false);
  assert.equal(event.completion, 'partial');
  assert.equal(event.outcome.kind === 'scored' && event.outcome.raw, 1);
});

/* ── Help ────────────────────────────────────────────────────────────────── */

test('help shown before an answer is recorded, and that answer is never independent', () => {
  const store = storeOn(memoryStorage());
  const [identity] = identitiesOf(HEADINGS_SET);
  assert.ok(identity);

  const write = lessonCheckDrafts(context(HEADINGS_SET), [
    { identity, given: 'iii', correct: true, attempt: 0, assistance: 'hint' },
  ]);
  const event = oneEvent(store.recordEvents(write.drafts));
  assert.equal(itemOf(event).assistance, 'hint');
  assert.equal(event.assistance, 'hint', 'the activity is as assisted as its most assisted moment');

  const verdict = classifyEvidence(event);
  assert.equal(verdict.use, 'assisted');
  assert.equal(verdict.reason, 'assistance-used');
});

test('a correct answer after the answer was shown is assisted, not a demonstration', () => {
  const store = storeOn(memoryStorage());
  const [identity] = identitiesOf(HEADINGS_SET);
  assert.ok(identity);
  const first = lessonCheckDrafts(context(HEADINGS_SET), [{ identity, given: 'i', correct: false, attempt: 0 }]);
  store.recordEvents(first.drafts);
  const second = lessonCheckDrafts(
    context(HEADINGS_SET, { at: '2026-09-21T10:00:00.000Z' }),
    [{ identity, given: 'v', correct: true, attempt: 1 }],
    first.recorded,
  );
  const retry = oneEvent(store.recordEvents(second.drafts));
  assert.equal(retry.assistance, AFTER_ANSWER_SHOWN);
  assert.equal(retry.seenBefore, true, 'the exposure log already held this question');
  assert.equal(classifyEvidence(retry).use, 'assisted');
});

/* ── What the policy is allowed to make of it ────────────────────────────── */

test('a second, perfect go at a set the student has seen raises no certainty', () => {
  const store = storeOn(memoryStorage());
  const now = '2026-09-21T12:00:00.000Z';
  const firstGo = lessonCheckDrafts(context(HEADINGS_SET, { at: '2026-09-20T09:00:00.000Z' }), answers(HEADINGS_SET, 12));
  store.recordEvents(firstGo.drafts);

  const afterFirst = evaluateEvidence({ record: store.read(), now });
  const before = estimate(afterFirst, 'subskill:reading:matching-headings');
  assert.equal(before.certainty, 'tentative', 'twelve questions at one sitting is one occasion');
  assert.equal(before.evidence.independentItems, 12);

  /* Every answer right, second time around, with the answers already
     shown. The old score card called this mastery. */
  const secondGo = lessonCheckDrafts(
    context(HEADINGS_SET, { at: '2026-09-21T09:00:00.000Z' }),
    answers(HEADINGS_SET, 12, { attempt: 1 }),
    firstGo.recorded,
  );
  store.recordEvents(secondGo.drafts);

  const afterSecond = evaluateEvidence({ record: store.read(), now });
  const after = estimate(afterSecond, 'subskill:reading:matching-headings');
  assert.equal(after.certainty, before.certainty, 'a repeat is not a second occasion');
  assert.equal(after.evidence.independentItems, 12, 'the repeat added no independent items');
  assert.equal(after.evidence.independentOccasions, before.evidence.independentOccasions);
  assert.equal(ignoredCount(afterSecond, 'repeat-of-seen-material'), 1);
  assert.equal(after.band, null, 'a dozen questions on a lesson page is not a band');
});

test('sitting the paper a check was lifted from is not fresh material', () => {
  const store = storeOn(memoryStorage());
  const write = lessonCheckDrafts(context(HEADINGS_SET), answers(HEADINGS_SET, 4));
  store.recordEvents(write.drafts);

  const record = store.read();
  const paperSeen = record.exposure.some((entry) => entry.key === 'paper:reading-full-006');
  assert.ok(paperSeen, 'the paper this check quotes has now been met');
  const [identity] = identitiesOf(HEADINGS_SET);
  assert.ok(identity?.testId && identity.questionId);
  assert.ok(
    record.exposure.some((entry) => entry.key === itemExposureKey(paperItemId(identity.testId!, identity.questionId!))),
    'and so has the question itself, under the name the paper gives it',
  );
});

/* ── The two quiz surfaces ───────────────────────────────────────────────── */

test('the drafts are exactly what the store own recorder writes', () => {
  /* Two stores, the same answers, two ways of writing them: the page
     builds its draft and saves once, the store has a recorder of its own.
     They must produce the identical row, or two surfaces recording the
     same work would disagree about what it was. */
  const mine = storeOn(memoryStorage());
  const theirs = storeOn(memoryStorage());
  const [first, second] = identitiesOf(HEADINGS_SET);
  assert.ok(first?.testId && second);

  const write = lessonCheckDrafts(context(HEADINGS_SET), [
    { identity: first, given: 'ii', correct: true, attempt: 0 },
    { identity: second, given: 'vi', correct: false, attempt: 0 },
  ]);
  const fromDrafts = oneEvent(mine.recordEvents(write.drafts));
  const fromRecorder = theirs.recordSubmission({
    activityId: lessonCheckActivityId(HEADINGS_SET),
    contentVersion: LESSON_CHECK_CONTENT_VERSION,
    at: '2026-09-21T09:00:00.000Z',
    paper: 'reading',
    subskill: first.type,
    mode: 'lesson-check',
    completion: 'completed',
    sourceTestId: first.testId,
    items: [
      {
        itemId: lessonCheckItemId(HEADINGS_SET, first),
        itemVersion: first.version,
        subskill: first.type,
        firstAnswer: 'ii',
        correct: true,
        assistance: FIRST_GO_ASSISTANCE,
      },
      {
        itemId: lessonCheckItemId(HEADINGS_SET, second),
        itemVersion: second.version,
        subskill: second.type,
        firstAnswer: 'vi',
        correct: false,
        assistance: FIRST_GO_ASSISTANCE,
      },
    ],
  });
  assert.equal(fromDrafts.id, fromRecorder?.id, 'the same work must have the same id, or sync would keep both');
  /* Compared as they are stored. The store's own recorder spells out a
     couple of fields it has nothing to put in (a lesson check has no band
     and no stopwatch), and an absent field and an undefined one are the
     same row. */
  assert.deepEqual(JSON.parse(JSON.stringify(fromDrafts)), JSON.parse(JSON.stringify(fromRecorder)));
});

test('the quiz written into a lesson body records too, under a name of its own', () => {
  const store = storeOn(memoryStorage());
  const identity = lessonQuizItemIdentity(
    'reading-tfng',
    0,
    2,
    'The museum was free to enter before 1990.',
    'not given',
    'tfng',
  );
  assert.equal(identity.key, 'c0-i2');
  assert.equal(identity.version.length, 16);
  assert.equal(identity.type, 'tfng');

  const setId = 'lesson-quiz:reading-tfng';
  const write = lessonCheckDrafts(
    {
      activityId: lessonQuizActivityId('reading-tfng'),
      paper: 'reading',
      at: '2026-09-21T09:00:00.000Z',
      completion: 'partial',
      repeatAssistance: AFTER_MARKING_SHOWN,
      setId,
    },
    [{ identity, given: 'false', correct: false, attempt: 0 }],
  );
  const event = oneEvent(store.recordEvents(write.drafts));
  assert.equal(event.activityId, 'check:lesson-quiz:reading-tfng');
  assert.equal(event.mode, 'lesson-check');
  assert.equal(event.completion, 'partial');
  assert.equal(itemOf(event).itemId, 'check:lesson-quiz:reading-tfng:c0-i2');
  assert.equal(itemOf(event).firstAnswer, 'false');

  /* Its marking says right or wrong without naming the answer, so a
     changed answer afterwards had a hint and not the answer. */
  const again = lessonCheckDrafts(
    {
      activityId: lessonQuizActivityId('reading-tfng'),
      paper: 'reading',
      at: '2026-09-21T09:01:00.000Z',
      completion: 'completed',
      repeatAssistance: AFTER_MARKING_SHOWN,
      setId,
    },
    [{ identity, given: 'not given', correct: true, attempt: 0 }],
    write.recorded,
  );
  const retry = oneEvent(store.recordEvents(again.drafts));
  assert.equal(itemOf(retry).assistance, AFTER_MARKING_SHOWN);
  assert.equal(retry.retryOf, event.id);
});

test('rewriting a question changes its name, so the old answers do not follow it', () => {
  const before = lessonQuizItemIdentity('reading-tfng', 0, 0, 'The museum was free.', 'true', 'tfng');
  const after = lessonQuizItemIdentity('reading-tfng', 0, 0, 'The museum charged for entry.', 'true', 'tfng');
  assert.notEqual(before.version, after.version);
  /* And a line ending or a byte order mark is not a rewrite. */
  const windows = lessonQuizItemIdentity('reading-tfng', 0, 0, '﻿The museum was free.', 'true', 'tfng');
  assert.equal(before.version, windows.version);
});

/* ── Pausing and coming back ─────────────────────────────────────────────── */

test('answers given before the student walked away are still there', () => {
  const storage = memoryStorage();
  const key = lessonCheckProgressKey(ownerNamespace(OWNER), HEADINGS_SET);
  const saved = writeLessonCheckProgress(storage, key, {
    version: 1,
    setId: HEADINGS_SET,
    updatedAt: '2026-09-21T09:00:00.000Z',
    units: [
      { drafts: ['iv', 'ii'], checked: true, attempt: 0 },
      { drafts: ['', 'vii'], checked: false, attempt: 0 },
    ],
    recorded: { 'reading-full-006:q14': { answer: 'iv', attempt: 0 } },
  });
  assert.equal(saved, true);

  const back = readLessonCheckProgress(storage, key, [2, 2], '2026-09-21T11:00:00.000Z');
  assert.ok(back);
  assert.deepEqual(back.units[0]!.drafts, ['iv', 'ii']);
  assert.equal(back.units[0]!.checked, true);
  assert.deepEqual(back.units[1]!.drafts, ['', 'vii']);
  assert.deepEqual(back.recorded['reading-full-006:q14'], { answer: 'iv', attempt: 0 });

  /* A set that has been rewritten since starts clean rather than putting
     answers back into questions that have changed. */
  assert.equal(readLessonCheckProgress(storage, key, [2, 3], '2026-09-21T11:00:00.000Z'), null);
  assert.equal(readLessonCheckProgress(storage, key, [2], '2026-09-21T11:00:00.000Z'), null);
  /* And so does one left half finished months ago. */
  assert.equal(readLessonCheckProgress(storage, key, [2, 2], '2026-12-21T11:00:00.000Z'), null);

  clearLessonCheckProgress(storage, key);
  assert.equal(readLessonCheckProgress(storage, key, [2, 2], '2026-09-21T11:00:00.000Z'), null);
});

test('one student unfinished exercise is never restored for another', () => {
  const mine = lessonCheckProgressKey(ownerNamespace(OWNER), HEADINGS_SET);
  const yours = lessonCheckProgressKey(ownerNamespace(anonymousOwner('another-device')), HEADINGS_SET);
  assert.notEqual(mine, yours);
  assert.ok(mine.startsWith('ielts.learning.check.v1::'));
});

/* ── When the browser refuses ────────────────────────────────────────────── */

test('nothing is recorded when the store is blocked, and the exercise still works', () => {
  const storage = blockedStorage();
  const store = storeOn(storage);
  const key = lessonCheckProgressKey(ownerNamespace(OWNER), HEADINGS_SET);

  /* The answers are still built and still marked: none of that needs a
     store. */
  const write = lessonCheckDrafts(context(HEADINGS_SET), answers(HEADINGS_SET, 3));
  assert.equal((write.drafts[0]?.items ?? []).length, 3);
  const events = store.recordEvents(write.drafts);
  assert.equal(events.length, 1, 'the record is kept in memory for the session');
  assert.equal(store.status().persistence, 'memory-only');
  assert.equal(store.status().problem, 'blocked');

  /* And nothing reached storage, in either direction. */
  assert.equal(writeLessonCheckProgress(storage, key, {
    version: 1,
    setId: HEADINGS_SET,
    updatedAt: '2026-09-21T09:00:00.000Z',
    units: [{ drafts: ['i'], checked: false, attempt: 0 }],
    recorded: {},
  }), false);
  assert.equal(readLessonCheckProgress(storage, key, [1], '2026-09-21T09:00:00.000Z'), null);
  assert.doesNotThrow(() => clearLessonCheckProgress(storage, key));
  assert.equal(readLessonCheckProgress(null, key, [1], '2026-09-21T09:00:00.000Z'), null);
  assert.equal(writeLessonCheckProgress(null, key, {
    version: 1,
    setId: HEADINGS_SET,
    updatedAt: '2026-09-21T09:00:00.000Z',
    units: [],
    recorded: {},
  }), false);
});

test('a half written or hand edited unfinished exercise is ignored rather than trusted', () => {
  const storage = memoryStorage();
  const key = lessonCheckProgressKey(ownerNamespace(OWNER), HEADINGS_SET);
  for (const raw of [
    'not json at all',
    '{"version":2,"units":[]}',
    '{"version":1,"units":"nope"}',
    '{"version":1,"units":[{"drafts":[1,2]}],"updatedAt":"2026-09-21T09:00:00.000Z"}',
    '{"version":1,"units":[{"drafts":["a","b"]}]}',
  ]) {
    storage.map.set(key, raw);
    assert.equal(readLessonCheckProgress(storage, key, [2], '2026-09-21T09:00:00.000Z'), null, raw);
  }
});
