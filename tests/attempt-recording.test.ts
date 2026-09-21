/* WP12 "Test, drill and grader recorders": the pure judgement calls behind
 * what TestPlayer, MockExam, WritingTester, SpeakingTester and LiveExaminer
 * write to the learner record, plus an end-to-end pass through the real
 * store and the real policy to prove the behaviour the acceptance criteria
 * actually asks for (per-item detail, blank/abandoned handling, retake
 * linkage, assistance marking, no essay text or audio in evidence, and a
 * not-live grade never becoming ability evidence).
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/attempt-recording.test.ts
 * The whole suite is `npm test`.
 *
 * Every fixture here is SYNTHETIC: made-up students, made-up questions.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  attemptActivityId,
  attemptEvidenceMode,
  attemptEvidenceModeFromId,
  baseAttemptId,
  buildQuestionItems,
  isDrillAttemptId,
  isEntirelyBlank,
  isRetakeAttemptId,
  paperFromAttemptId,
  parseSpeakingDeepLink,
  testItemId,
  type ScoredQuestionEntry,
} from '../src/components/attempt-recording.ts';
import { createLearnerStore, userOwner, type BrowserStorage } from '../src/lib/learning/store.browser.ts';
import { classifyEvidence } from '../src/lib/learning/evidence.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import { scopeKeyOf } from '../src/lib/learning/policy.ts';
import type { Question, QuestionGroup } from '../src/lib/tests/schema.ts';

/* ------------------------------------------------------------------ */
/* A browser store, in memory                                          */
/* ------------------------------------------------------------------ */

function memoryStore(): BrowserStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => data.delete(key),
  };
}

const FIXED_NOW = '2026-09-21T09:00:00.000Z';

function storeFor(now: () => string = () => FIXED_NOW) {
  return createLearnerStore({
    storage: memoryStore(),
    owner: userOwner('synthetic-student'),
    now,
    legacy: () => ({ progress: null, plan: null }),
  });
}

/* ------------------------------------------------------------------ */
/* Test/drill/retake id helpers                                        */
/* ------------------------------------------------------------------ */

test('baseAttemptId strips only the synthetic -retake suffix', () => {
  assert.equal(baseAttemptId('reading-full-014'), 'reading-full-014');
  assert.equal(baseAttemptId('reading-full-014-retake'), 'reading-full-014');
  assert.equal(baseAttemptId('listening-full-003-drill-p2-retake'), 'listening-full-003-drill-p2');
});

test('isDrillAttemptId recognises a drill id, including a retake built from one', () => {
  assert.equal(isDrillAttemptId('reading-full-014'), false);
  assert.equal(isDrillAttemptId('reading-full-014-drill-p1'), true);
  assert.equal(isDrillAttemptId('reading-full-014-drill-p1-retake'), true);
  assert.equal(isDrillAttemptId('reading-full-014-retake'), false);
});

test('isRetakeAttemptId recognises the synthetic suffix TestPlayer appends', () => {
  assert.equal(isRetakeAttemptId('reading-full-014'), false);
  assert.equal(isRetakeAttemptId('reading-full-014-retake'), true);
});

test('paperFromAttemptId reads the skill straight off the id, retake or not', () => {
  assert.equal(paperFromAttemptId('reading-full-014'), 'reading');
  assert.equal(paperFromAttemptId('listening-full-003-drill-p2-retake'), 'listening');
  assert.equal(paperFromAttemptId('mock-2026-09-21-1'), undefined);
});

test('attemptActivityId matches the catalogue id shapes exactly, for a paper, a drill and their retakes', () => {
  assert.equal(attemptActivityId('reading-full-014'), 'test:reading-full-014');
  assert.equal(attemptActivityId('reading-full-014-retake'), 'test:reading-full-014');
  assert.equal(attemptActivityId('listening-full-003-drill-p2'), 'drill:listening-full-003-drill-p2');
  assert.equal(attemptActivityId('listening-full-003-drill-p2-retake'), 'drill:listening-full-003-drill-p2');
});

test('attemptEvidenceMode: full is assessment, drill (including a retake, always rendered as one) is practice', () => {
  assert.equal(attemptEvidenceMode('full'), 'assessment');
  assert.equal(attemptEvidenceMode('drill'), 'practice');
});

test('attemptEvidenceModeFromId: a plain paper id is assessment; a drill id or any retake id is practice', () => {
  assert.equal(attemptEvidenceModeFromId('reading-full-014'), 'assessment');
  assert.equal(attemptEvidenceModeFromId('reading-full-014-drill-p1'), 'practice');
  assert.equal(attemptEvidenceModeFromId('reading-full-014-retake'), 'practice');
});

test('testItemId pairs the paper id with the question id, since question ids repeat across papers', () => {
  assert.equal(testItemId('reading-full-014', 'q7'), 'reading-full-014:q7');
  assert.notEqual(testItemId('reading-full-014', 'q7'), testItemId('reading-full-015', 'q7'));
});

/* ------------------------------------------------------------------ */
/* buildQuestionItems / isEntirelyBlank                                 */
/* ------------------------------------------------------------------ */

/** SYNTHETIC. Three scored questions across two groups, one example item
    that is never scored, matching how TestPlayer's `numbered` looks. */
function fixtureEntries(): ScoredQuestionEntry[] {
  const groupA: QuestionGroup = { title: 'Questions 1-2', type: 'sentence-completion' } as QuestionGroup;
  const groupB: QuestionGroup = { title: 'Questions 3', type: 'matching-headings' } as QuestionGroup;
  const q1: Question = { id: 'q1' } as Question;
  const q2: Question = { id: 'q2' } as Question;
  const q3: Question = { id: 'q3' } as Question;
  const example: Question = { id: 'q0', scored: false } as Question;
  return [
    { question: example, group: groupA },
    { question: q1, group: groupA },
    { question: q2, group: groupA },
    { question: q3, group: groupB },
  ];
}

test('buildQuestionItems covers every scored question seen, including the ones left blank, and skips unscored examples', () => {
  const entries = fixtureEntries();
  const answers = { q1: 'answer one' }; // q2 and q3 left blank
  const scoredIds = new Set(['q1']); // only q1 is correct
  const items = buildQuestionItems('reading-full-014', entries, answers, scoredIds, new Set());

  assert.equal(items.length, 3); // q0 (unscored) excluded
  assert.deepEqual(
    items.map((i) => i.itemId).sort(),
    ['reading-full-014:q1', 'reading-full-014:q2', 'reading-full-014:q3'],
  );
  const q1Item = items.find((i) => i.itemId === 'reading-full-014:q1')!;
  assert.equal(q1Item.firstAnswer, 'answer one');
  assert.equal(q1Item.correct, true);
  const q2Item = items.find((i) => i.itemId === 'reading-full-014:q2')!;
  assert.equal(q2Item.firstAnswer, ''); // blank, not omitted: this is what makes it exposure
  assert.equal(q2Item.correct, false);
  assert.equal(q3Item(items).subskill, 'matching-headings');
});

function q3Item(items: ReturnType<typeof buildQuestionItems>) {
  return items.find((i) => i.itemId === 'reading-full-014:q3')!;
}

test('buildQuestionItems marks assistance only on the items it applied to', () => {
  const entries = fixtureEntries();
  const items = buildQuestionItems('reading-full-014', entries, { q1: 'x', q2: 'y', q3: 'z' }, new Set(['q1', 'q2', 'q3']), new Set(['q1']));
  assert.equal(items.find((i) => i.itemId.endsWith(':q1'))!.assistance, 'hint');
  assert.equal(items.find((i) => i.itemId.endsWith(':q2'))!.assistance, 'none');
  assert.equal(items.find((i) => i.itemId.endsWith(':q3'))!.assistance, 'none');
});

test('isEntirelyBlank is true only when nothing scored was answered', () => {
  const entries = fixtureEntries();
  assert.equal(isEntirelyBlank(entries, {}), true);
  assert.equal(isEntirelyBlank(entries, { q1: '' }), true); // an explicit empty string is still blank
  assert.equal(isEntirelyBlank(entries, { q1: 'something' }), false);
});

/* ------------------------------------------------------------------ */
/* Speaking deep links                                                  */
/* ------------------------------------------------------------------ */

test('parseSpeakingDeepLink reads the catalogue query shape for all three parts', () => {
  assert.deepEqual(parseSpeakingDeepLink('?part=1&topic=topic-family'), { part: 1, topicId: 'topic-family' });
  assert.deepEqual(parseSpeakingDeepLink('?part=2&card=cue-hobby'), { part: 2, cardId: 'cue-hobby' });
  assert.deepEqual(parseSpeakingDeepLink('?part=3&card=cue-hobby'), { part: 3, cardId: 'cue-hobby' });
});

test('parseSpeakingDeepLink is null for a plain visit or a link missing its id', () => {
  assert.equal(parseSpeakingDeepLink(''), null);
  assert.equal(parseSpeakingDeepLink('?part=1'), null); // no topic id
  assert.equal(parseSpeakingDeepLink('?part=2'), null); // no card id
  assert.equal(parseSpeakingDeepLink('?part=4&card=x'), null); // not a real part
});

/* ------------------------------------------------------------------ */
/* End to end: the real store, the real policy                         */
/* ------------------------------------------------------------------ */

test('a full paper submission writes per-item detail and a band estimate', () => {
  const store = storeFor();
  const entries = fixtureEntries();
  const answers = { q1: 'a', q2: 'b', q3: 'c' };
  const scoredIds = new Set(['q1', 'q3']);
  const items = buildQuestionItems('reading-full-014', entries, answers, scoredIds, new Set());
  const event = store.recordSubmission({
    activityId: attemptActivityId('reading-full-014'),
    paper: 'reading',
    at: FIXED_NOW,
    mode: attemptEvidenceMode('full'),
    completion: isEntirelyBlank(entries, answers) ? 'blank' : 'completed',
    items,
    raw: 2,
    total: 3,
    bandEstimate: 6.5,
    sourceTestId: 'reading-full-014',
  })!;
  assert.equal(event.activityId, 'test:reading-full-014');
  assert.equal(event.mode, 'assessment');
  assert.equal(event.items?.length, 3);
  assert.equal(event.outcome.kind, 'scored');
  if (event.outcome.kind === 'scored') {
    assert.equal(event.outcome.bandEstimate, 6.5);
    // Per-item subskill flows straight into the automatic bySubskill split.
    assert.equal(event.outcome.bySubskill['sentence-completion']?.total, 2);
    assert.equal(event.outcome.bySubskill['matching-headings']?.total, 1);
  }
  // Every scored question the student saw is now exposed, blank ones included.
  const record = store.read();
  for (const q of ['q1', 'q2', 'q3']) {
    assert.ok(record.exposure.some((e) => e.key === `item:reading-full-014:${q}`), `q${q} should be exposed`);
  }
});

test('a drill never carries a band estimate; a whole-blank submission is recorded as blank, not zero-scored', () => {
  const store = storeFor();
  const entries = fixtureEntries();
  const answers = {}; // nothing answered
  const items = buildQuestionItems('reading-full-014-drill-p1', entries, answers, new Set(), new Set());
  const event = store.recordSubmission({
    activityId: attemptActivityId('reading-full-014-drill-p1'),
    paper: 'reading',
    at: FIXED_NOW,
    mode: attemptEvidenceMode('drill'),
    completion: isEntirelyBlank(entries, answers) ? 'blank' : 'completed',
    items,
    raw: 0,
    total: 3,
    bandEstimate: undefined,
    sourceTestId: 'reading-full-014-drill-p1',
  })!;
  assert.equal(event.completion, 'blank');
  assert.equal(event.mode, 'practice');
  assert.equal(event.outcome.kind, 'scored');
  if (event.outcome.kind === 'scored') assert.equal(event.outcome.bandEstimate, undefined);
  // A blank submission is excluded from evidence altogether, not read as
  // "attempted and got zero right", which is the whole point of `blank`.
  assert.equal(classifyEvidence(event).use, 'excluded');
  assert.equal(classifyEvidence(event).reason, 'blank');
});

test('an unfinished session found stale on the next load is recorded honestly, with no fabricated score', () => {
  const store = storeFor();
  const event = store.recordUnfinishedAttempt({
    activityId: attemptActivityId('listening-full-003'),
    paper: paperFromAttemptId('listening-full-003'),
    at: FIXED_NOW,
    mode: attemptEvidenceModeFromId('listening-full-003'),
    completion: 'abandoned',
    secondsUsed: 400,
    sourceTestId: 'listening-full-003',
  })!;
  assert.equal(event.completion, 'abandoned');
  assert.equal(event.items, undefined); // no item detail was ever known, so none was invented
  assert.equal(event.outcome.kind, 'scored');
  if (event.outcome.kind === 'scored') assert.equal(event.outcome.raw, 0);
  assert.equal(classifyEvidence(event).use, 'excluded');
  assert.equal(classifyEvidence(event).reason, 'abandoned');
  // The paper is still marked seen, so a later fresh sit of it is not unseen.
  assert.ok(store.read().exposure.some((e) => e.key === 'paper:listening-full-003'));
});

test('a retake of the wrong questions links to the original attempt through retryOf and reads as seen material', () => {
  const store = storeFor();
  const entries = fixtureEntries();
  // First attempt: q1 right, q2 and q3 wrong.
  const firstItems = buildQuestionItems('reading-full-014', entries, { q1: 'a', q2: 'x', q3: 'y' }, new Set(['q1']), new Set());
  const first = store.recordSubmission({
    activityId: 'test:reading-full-014',
    paper: 'reading',
    at: '2026-09-21T09:00:00.000Z',
    mode: 'assessment',
    completion: 'completed',
    items: firstItems,
    raw: 1,
    total: 3,
    bandEstimate: 5,
    sourceTestId: 'reading-full-014',
  })!;

  // Retake: same base id (baseAttemptId strips "-retake"), same item ids,
  // which is what TestPlayer's own handleSubmit does for the nested retake.
  const retakeItems = buildQuestionItems('reading-full-014', entries, { q2: 'x', q3: 'c' }, new Set(['q3']), new Set());
  const retake = store.recordSubmission({
    activityId: attemptActivityId('reading-full-014-retake'), // resolves to the SAME activity as the original
    paper: 'reading',
    at: '2026-09-21T09:20:00.000Z',
    mode: attemptEvidenceMode('drill'), // retakes are always rendered as attemptKind="drill"
    completion: 'completed',
    items: retakeItems,
    raw: 1,
    total: 2,
    sourceTestId: 'reading-full-014',
  })!;

  assert.equal(retake.activityId, first.activityId);
  assert.equal(retake.retryOf, first.id);
  assert.equal(retake.mode, 'practice');
  // Both retried items were already seen from the first attempt.
  const q2 = retake.items!.find((i) => i.itemId.endsWith(':q2'))!;
  const q3 = retake.items!.find((i) => i.itemId.endsWith(':q3'))!;
  assert.equal(q2.seenBefore, true);
  assert.equal(q3.seenBefore, true);
  // A retry is never independent evidence, whatever the item outcome: it is
  // assisted, on seen material, by design (evidence.ts's classifyEvidence).
  assert.equal(classifyEvidence(retake).use, 'assisted');
  assert.equal(classifyEvidence(retake).reason, 'repeat-of-seen-material');
});

test('a graded writing attempt carries a pointer back to the saved report, never a copy of the essay', () => {
  const store = storeFor();
  const event = store.recordWritingGraded({
    activityId: 'write:task1-chart-001',
    paper: 'writing',
    promptId: 'task1-chart-001',
    task: 'task1',
    at: FIXED_NOW,
    overallBand: 6.5,
    criteria: { taskAchievement: 6, coherenceCohesion: 7, lexicalResource: 6, grammaticalRange: 7 },
    wordCount: 172,
    grader: { name: 'gpt-5.6-sol', live: true },
    legacyRef: { store: 'writing', key: 'task1-chart-001', at: FIXED_NOW },
  })!;
  assert.equal(event.taskScope?.kind, 'writing-task');
  if (event.taskScope?.kind === 'writing-task') assert.equal(event.taskScope.task, 'task1');
  assert.equal(event.outcome.kind, 'graded');
  assert.ok(!('essay' in event.outcome));
  assert.ok(!JSON.stringify(event).includes('The candlestick chart shows')); // sanity: nothing essay-shaped leaked in
  assert.equal(classifyEvidence(event).use, 'independent');
});

test('a not-live (stub) writing grade is recorded for history but is never ability evidence under the real policy', () => {
  const store = storeFor();
  store.recordWritingGraded({
    activityId: 'write:task1-chart-001',
    paper: 'writing',
    promptId: 'task1-chart-001',
    task: 'task1',
    at: FIXED_NOW,
    overallBand: 6.5,
    criteria: { taskAchievement: 6, coherenceCohesion: 6, lexicalResource: 6, grammaticalRange: 6 },
    wordCount: 172,
    grader: { name: 'stub', live: false },
  });
  const record = store.read();
  const [event] = record.events;
  assert.equal(classifyEvidence(event!).use, 'excluded');
  assert.equal(classifyEvidence(event!).reason, 'stub-graded');

  const output = evaluateEvidence({ record, now: FIXED_NOW });
  const scopeKey = scopeKeyOf({ kind: 'writing-task', task: 'task1' });
  assert.ok(
    output.unknownScopes.includes(scopeKey),
    'a stub-graded event alone must leave the scope unknown, not measured',
  );
  const estimate = output.estimates.find((e) => e.scopeKey === scopeKey);
  if (estimate) assert.notEqual(estimate.certainty, 'measured');
});

test('a graded speaking attempt carries part scope and never any audio field', () => {
  const store = storeFor();
  const event = store.recordSpeakingGraded({
    activityId: 'speak:part1-family',
    paper: 'speaking',
    promptId: 'part1-family',
    part: 1,
    at: FIXED_NOW,
    overallBand: 6,
    criteria: { fluencyCoherence: 6, lexicalResource: 6, grammaticalRange: 6, pronunciation: 6 },
    grader: { name: 'gpt-5.6-sol', live: true },
  })!;
  assert.equal(event.taskScope?.kind, 'speaking-part');
  if (event.taskScope?.kind === 'speaking-part') assert.equal(event.taskScope.part, 1);
  const serialised = JSON.stringify(event).toLowerCase();
  for (const field of ['audio', 'blob', 'recording', 'pcm', 'base64audio', 'waveform']) {
    assert.ok(!serialised.includes(field), `evidence must never mention "${field}"`);
  }
});

test('a not-live speaking grade is excluded from evidence the same way a stub writing grade is', () => {
  const store = storeFor();
  const event = store.recordSpeakingGraded({
    activityId: 'speak:part1-family',
    paper: 'speaking',
    promptId: 'part1-family',
    part: 1,
    at: FIXED_NOW,
    overallBand: 6,
    criteria: { fluencyCoherence: 6, lexicalResource: 6, grammaticalRange: 6, pronunciation: 6 },
    grader: { name: 'stub', live: false },
  })!;
  assert.equal(classifyEvidence(event).use, 'excluded');
  assert.equal(classifyEvidence(event).reason, 'stub-graded');
});
