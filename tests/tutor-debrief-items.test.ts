/* Coverage for src/lib/tutor/wrong-items.ts: the one place that decides
   which questions Mr EZ is told about after a paper is marked.

   The thing worth pinning down is the agreement between two numbers the
   student can see at the same moment: the score modal says "31 / 40", and
   the debrief card says "You missed 9 of 40". If wrongItems() counted a
   question the score does not (or missed one it does), those two lines
   would contradict each other on screen. So the fixtures below are checked
   against `scoredQuestionIds()` itself rather than against a hand-written
   expectation of what scoring does. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { wrongItems, isScoredQuestion } from '../src/lib/tutor/wrong-items.ts';
import { MAX_GIVEN_CHARS, MAX_REVIEW_ITEMS } from '../src/lib/tutor/test-items.ts';
import { scoredQuestionIds } from '../src/lib/tests/schema.ts';
import type { PracticeTest, Question, QuestionGroup, TestPart } from '../src/lib/tests/schema.ts';

/* ── Fixtures ───────────────────────────────────────────────────────────── */

function passagePart(label: string, groups: QuestionGroup[]): TestPart {
  return {
    label,
    stimulus: {
      kind: 'passage',
      label,
      title: `${label} title`,
      instructionHtml: '<p>Read the passage.</p>',
      paragraphs: [{ html: 'Some passage text.' }],
    },
    groups,
  };
}

function group(title: string, questions: Question[]): QuestionGroup {
  return { title, type: 'tfng', instructionHtml: '<p>True, False or Not Given.</p>', questions };
}

function makeTest(parts: TestPart[]): PracticeTest {
  return {
    id: 'reading-full-001',
    skill: 'reading',
    title: 'Reading Test 1',
    description: 'A fixture.',
    durationMinutes: 60,
    parts,
  };
}

/** Every question in the test, flat, in the same order the player numbers
    them, which is what scoredQuestionIds() expects to be handed. */
function allQuestions(t: PracticeTest): Question[] {
  return t.parts.flatMap((p) => p.groups.flatMap((g) => g.questions));
}

/** Run the real scorer, then the real extractor, exactly as TestPlayer does. */
function runBoth(t: PracticeTest, answers: Record<string, string>) {
  const correctIds = scoredQuestionIds(allQuestions(t), answers);
  return { correctIds, items: wrongItems(t, answers, correctIds) };
}

/* A small but realistic paper: two passages, a right answer, a wrong one, a
   blank one, a question missing from the published source, and a pair of
   questions that share an answer pool. */
const SMALL = makeTest([
  passagePart('Passage 1', [
    group('Questions 1-4', [
      { id: 'q1', answer: 'True', textHtml: 'First claim.' },
      { id: 'q2', answer: 'False', textHtml: 'Second claim.' },
      { id: 'q3', answer: 'Not Given', textHtml: 'Third claim.' },
      { id: 'q4', scored: false, answer: 'True', textHtml: 'Missing from the source.' },
    ]),
  ]),
  passagePart('Passage 2', [
    group('Questions 5-7', [
      { id: 'q5', answer: 'True', textHtml: 'Fifth claim.' },
      { id: 'q6', answer: ['B', 'D'], answerPairId: 'pair-1', textHtml: 'Pick two, either order.' },
      { id: 'q7', answer: ['B', 'D'], answerPairId: 'pair-1', textHtml: 'Pick two, either order.' },
    ]),
  ]),
]);

/* ── The rules ──────────────────────────────────────────────────────────── */

test('a blank answer is included, with an empty given', () => {
  const { items } = runBoth(SMALL, { q1: 'True', q2: 'False', q5: 'True', q6: 'B', q7: 'D' });
  // q3 was left blank and is the only thing missing.
  assert.deepEqual(items, [{ questionId: 'q3', given: '' }]);
});

test('right answers are excluded, wrong ones are kept with what was typed', () => {
  const { items } = runBoth(SMALL, {
    q1: 'True', // right
    q2: 'Not Given', // wrong
    q3: 'True', // wrong
    q5: 'False', // wrong
    q6: 'B',
    q7: 'D',
  });
  assert.deepEqual(items, [
    { questionId: 'q2', given: 'Not Given' },
    { questionId: 'q3', given: 'True' },
    { questionId: 'q5', given: 'False' },
  ]);
});

test('a question excluded from the score is never sent, right, wrong or blank', () => {
  // q4 is scored: false. Answer it wrongly and it still must not appear.
  const { items } = runBoth(SMALL, { q1: 'True', q2: 'False', q3: 'Not Given', q4: 'nonsense', q5: 'True', q6: 'B', q7: 'D' });
  assert.deepEqual(items, []);
  assert.equal(isScoredQuestion({ scored: false }), false);
  assert.equal(isScoredQuestion({}), true);
});

test('an answer pair is counted exactly the way the score counts it', () => {
  // The same correct choice typed into both slots earns one mark, not two,
  // so exactly one of the two slots must come back as wrong.
  const { correctIds, items } = runBoth(SMALL, { q1: 'True', q2: 'False', q3: 'Not Given', q5: 'True', q6: 'B', q7: 'B' });
  assert.equal(correctIds.size, 5);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.questionId, 'q7');
});

test('order follows the paper, across parts and groups', () => {
  const { items } = runBoth(SMALL, {}); // everything blank
  assert.deepEqual(
    items.map((i) => i.questionId),
    ['q1', 'q2', 'q3', 'q5', 'q6', 'q7'],
  );
});

test('a multiSelect answer string is passed through exactly as stored', () => {
  const multi = makeTest([
    passagePart('Passage 1', [
      {
        title: 'Questions 1-2',
        type: 'multiple-answer',
        instructionHtml: '<p>Choose TWO.</p>',
        questions: [
          { id: 'm1', answer: 'B|D', multiSelect: { correctValues: ['B', 'D'], selectCount: 2 } },
        ],
      },
    ]),
  ]);
  // Stored the way the player stores it: sorted, joined with '|'.
  const { items } = runBoth(multi, { m1: 'A|C' });
  assert.deepEqual(items, [{ questionId: 'm1', given: 'A|C' }]);
});

/* ── Caps ───────────────────────────────────────────────────────────────── */

test('a long typed answer is cut to MAX_GIVEN_CHARS', () => {
  const long = 'x'.repeat(MAX_GIVEN_CHARS + 50);
  const { items } = runBoth(SMALL, { q1: long });
  const q1 = items.find((i) => i.questionId === 'q1');
  assert.equal(q1?.given.length, MAX_GIVEN_CHARS);
});

test('at most MAX_REVIEW_ITEMS questions are ever returned', () => {
  const many = makeTest([
    passagePart(
      'Passage 1',
      [group('Questions 1-60', Array.from({ length: 60 }, (_, i) => ({ id: `q${i + 1}`, answer: 'True' })))],
    ),
  ]);
  const { items } = runBoth(many, {}); // all blank, so all 60 are wrong
  assert.equal(items.length, MAX_REVIEW_ITEMS);
  assert.equal(items[0]?.questionId, 'q1');
  assert.equal(items[MAX_REVIEW_ITEMS - 1]?.questionId, `q${MAX_REVIEW_ITEMS}`);
});

/* ── The count the card says out loud ───────────────────────────────────── */

test('the count always equals scored total minus raw score', () => {
  const scoredTotal = allQuestions(SMALL).filter(isScoredQuestion).length;
  const cases: Record<string, string>[] = [
    {},
    { q1: 'True', q2: 'False', q3: 'Not Given', q5: 'True', q6: 'B', q7: 'D' },
    { q1: 'True', q3: 'False', q6: 'D' },
    { q1: 'true ', q2: 'FALSE', q4: 'True', q7: 'B' },
  ];
  for (const answers of cases) {
    const { correctIds, items } = runBoth(SMALL, answers);
    assert.equal(items.length, scoredTotal - correctIds.size, `answers: ${JSON.stringify(answers)}`);
  }
});

test('the count matches the score on a full forty-question paper too', () => {
  const forty = makeTest([
    passagePart('Passage 1', [group('Questions 1-20', Array.from({ length: 20 }, (_, i) => ({ id: `q${i + 1}`, answer: 'True' })))]),
    passagePart('Passage 2', [group('Questions 21-40', Array.from({ length: 20 }, (_, i) => ({ id: `q${i + 21}`, answer: 'False' })))]),
  ]);
  // Nine wrong or blank: six typed wrongly, three left out.
  const answers: Record<string, string> = {};
  for (let i = 1; i <= 20; i++) answers[`q${i}`] = i <= 3 ? 'False' : 'True';
  for (let i = 21; i <= 40; i++) {
    if (i <= 23) continue; // blank
    answers[`q${i}`] = i <= 26 ? 'True' : 'False';
  }
  const { correctIds, items } = runBoth(forty, answers);
  assert.equal(correctIds.size, 31);
  assert.equal(items.length, 9);
  assert.equal(items.length, 40 - correctIds.size);
  assert.deepEqual(
    items.filter((i) => i.given === '').map((i) => i.questionId),
    ['q21', 'q22', 'q23'],
  );
});
