/* The practice exercises inside lessons (src/components/PracticeQuiz.tsx):
   how they mark an answer pool, that every pool and word limit is carried
   over from the paper the questions come from, and that every title and
   instruction has its Russian.

   Pre-publish fix, 3 October 2026. Before it, a table whose blanks 5, 7 and
   9 accept any of three letters in any order scored F, F, F as three marks
   (Reading summary set, Test 16), the completion exercises never said how
   many words an answer may have, and every title and instruction stayed
   English for a Russian student. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { acceptsAnswer, practiceCorrections, practiceMarks } from '../src/lib/practice-scoring.ts';
import { READING_PRACTICE, PRACTICE_ITEM_IDENTITY, type PracticeSet } from '../src/data/reading-practice.ts';
import { LISTENING_PRACTICE } from '../src/data/listening-practice.ts';
import { ALL_TESTS } from '../src/data/tests/index.ts';
import type { Question, QuestionGroup } from '../src/lib/tests/schema.ts';
import { scoredQuestionIds } from '../src/lib/tests/schema.ts';
import * as ruMerged from '../src/lib/i18n/dict/ru/index.ts';
import { statedLimit } from '../tools/reading-key-lint.mjs';

const SETS: [string, Record<string, PracticeSet>][] = [
  ['reading', READING_PRACTICE],
  ['listening', LISTENING_PRACTICE as Record<string, PracticeSet>],
];

const marks = (qs: Parameters<typeof practiceMarks>[0], drafts: string[]) => practiceMarks(qs, drafts).filter(Boolean).length;

/* ── The rule itself ─────────────────────────────────────────────────── */

const POOL_579 = [
  { answer: ['F', 'G', 'J'], pool: 'p' },
  { answer: ['F', 'G', 'J'], pool: 'p' },
  { answer: ['F', 'G', 'J'], pool: 'p' },
];

test('a repeated right answer inside a pool earns one mark, not one per blank', () => {
  assert.equal(marks(POOL_579, ['F', 'F', 'F']), 1);
  assert.deepEqual(practiceMarks(POOL_579, ['F', 'F', 'F']), [true, false, false]);
  assert.equal(marks(POOL_579, ['f', ' F ', 'G']), 2, 'case and spaces do not make a repeat count twice');
});

test('the right answers of a pool in any order earn every mark', () => {
  assert.equal(marks(POOL_579, ['F', 'G', 'J']), 3);
  assert.equal(marks(POOL_579, ['J', 'F', 'G']), 3);
  assert.equal(marks(POOL_579, ['j', 'g', 'f']), 3);
  assert.equal(marks(POOL_579, ['F', 'X', 'J']), 2);
  assert.equal(marks(POOL_579, ['', '', '']), 0);
});

test('a pool takes any answer accepted anywhere in it, like the full test player', () => {
  // Each slot keyed with one letter only, the shape answerPairId groups have in the papers.
  const pool = [
    { answer: 'F', pool: 'p' },
    { answer: 'H', pool: 'p' },
    { answer: 'J', pool: 'p' },
  ];
  for (const drafts of [['F', 'H', 'J'], ['J', 'H', 'F'], ['F', 'F', 'F'], ['H', 'H', 'J'], ['F', 'X', '']]) {
    const asQuestions: Question[] = pool.map((q, i) => ({ id: `q${i}`, prompt: '', answer: q.answer, answerPairId: 'p' }) as Question);
    const player = scoredQuestionIds(asQuestions, Object.fromEntries(drafts.map((d, i) => [`q${i}`, d])));
    assert.equal(marks(pool, drafts), player.size, `practice and player disagree on ${drafts.join(', ')}`);
  }
  assert.equal(marks(pool, ['F', 'F', 'F']), 1);
  assert.equal(marks(pool, ['F', 'H', 'J']), 3);
});

test('outside a pool, the same answer to several questions still earns each mark', () => {
  const tfng = [{ answer: 'TRUE' }, { answer: 'TRUE' }, { answer: 'FALSE' }];
  assert.equal(marks(tfng, ['TRUE', 'TRUE', 'FALSE']), 3);
  // Two pools in one unit stay separate.
  const two = [
    { answer: ['A', 'D'], pool: 'x' },
    { answer: ['B', 'C'], pool: 'y' },
    { answer: ['A', 'D'], pool: 'x' },
    { answer: ['B', 'C'], pool: 'y' },
  ];
  assert.equal(marks(two, ['A', 'B', 'D', 'C']), 4);
  assert.equal(marks(two, ['A', 'A', 'A', 'A']), 1);
  assert.equal(acceptsAnswer(two[0]!, 'd'), true);
});

test('a blank that missed in a pool is shown an answer not already earned, and told why', () => {
  const c = practiceCorrections(POOL_579, ['F', 'F', 'F']);
  assert.deepEqual(
    c.map((x) => x.expected),
    ['F', 'G', 'J'],
  );
  assert.deepEqual(
    c.map((x) => x.repeated),
    [false, true, true],
  );
  const wrong = practiceCorrections(POOL_579, ['G', 'X', '']);
  assert.deepEqual(wrong.map((x) => x.expected), ['G', 'F', 'J']);
  assert.deepEqual(wrong.map((x) => x.repeated), [false, false, false]);
  // Outside a pool the shown answer is simply the first accepted one.
  assert.deepEqual(practiceCorrections([{ answer: ['royal antelope', 'the royal antelope'] }], ['x'])[0], {
    expected: 'royal antelope',
    repeated: false,
  });
});

/* ── The real Test 16 table in the Reading summary set ───────────────── */

test('Test 16 table: F in blanks 5, 7 and 9 scores once; the right letters score all ten', () => {
  const unit = READING_PRACTICE['summary-completion']!.units[0]!;
  assert.equal(unit.questions.length, 10);
  const drafts = unit.questions.map(() => '');
  // Blanks 5, 7 and 9 are questions 4, 6 and 8.
  drafts[4] = 'F';
  drafts[6] = 'F';
  drafts[8] = 'F';
  assert.equal(marks(unit.questions, drafts), 1);

  const right = ['A', 'B', 'D', 'C', 'F', 'E', 'G', 'H', 'J', 'I'];
  assert.equal(marks(unit.questions, right), 10);
  const swapped = ['D', 'C', 'A', 'B', 'J', 'I', 'F', 'E', 'G', 'H'];
  assert.equal(marks(unit.questions, swapped), 10);
  const repeated = ['A', 'B', 'A', 'B', 'F', 'E', 'F', 'E', 'F', 'E'];
  assert.equal(marks(unit.questions, repeated), 4);
});

/* ── The data: pools and word limits come from the papers ────────────── */

const testsById = new Map(ALL_TESTS.map((t) => [t.id, t]));

function sourceOf(testId: string | undefined, questionId: string | undefined): { group: QuestionGroup; question: Question } | null {
  const paper = testId ? testsById.get(testId) : undefined;
  if (!paper || !questionId) return null;
  for (const part of paper.parts) {
    for (const group of part.groups) {
      const question = group.questions.find((q) => q.id === questionId);
      if (question) return { group, question };
    }
  }
  return null;
}

function eachUnit(fn: (setId: string, ui: number, set: PracticeSet) => void) {
  for (const [paper, sets] of SETS) {
    for (const [slug, set] of Object.entries(sets)) {
      set.units.forEach((_u, ui) => fn(`practice-${paper}-${slug}`, ui, set));
    }
  }
}

test('every pooled question in a paper is pooled in its lesson copy, with the same id', () => {
  let pooled = 0;
  eachUnit((setId, ui, set) => {
    const ident = new Map((PRACTICE_ITEM_IDENTITY[setId] ?? []).map((x) => [x.key, x]));
    set.units[ui]!.questions.forEach((q, qi) => {
      const id = ident.get(`u${ui}-q${qi}`);
      const src = sourceOf(id?.testId, id?.questionId);
      if (q.pool) pooled++;
      if (!src) {
        assert.equal(q.pool, undefined, `${setId} u${ui}-q${qi} has a pool but no source question`);
        return;
      }
      assert.equal(q.pool, src.question.answerPairId, `${setId} u${ui}-q${qi}: pool must match ${id!.testId} ${id!.questionId}`);
    });
  });
  assert.equal(pooled, 10, 'the Test 16 table is the one pooled group today; update this count with the data');
});

test('every lesson completion exercise states the word limit its paper sets', () => {
  let checked = 0;
  eachUnit((setId, ui, set) => {
    const unit = set.units[ui]!;
    if (!unit.questions.some((q) => q.kind === 'text')) return;
    const ident = new Map((PRACTICE_ITEM_IDENTITY[setId] ?? []).map((x) => [x.key, x]));
    const limits = new Set<number | undefined>();
    unit.questions.forEach((q, qi) => {
      if (q.kind !== 'text') return;
      const id = ident.get(`u${ui}-q${qi}`);
      const src = sourceOf(id?.testId, id?.questionId);
      if (src) limits.add(src.group.wordLimit);
    });
    if (limits.size === 0) return; // a hand-written drill with no paper behind it
    assert.ok(unit.intro, `${setId} u${ui} is a completion exercise with no instruction`);
    assert.equal(limits.size, 1, `${setId} u${ui} mixes word limits; one intro cannot state them`);
    const [limit] = [...limits];
    if (limit === undefined) {
      // A letters-from-a-box table: the intro names the letter range instead.
      assert.match(unit.intro!, /\bletter, [A-Z]-[A-Z]\b/, `${setId} u${ui} should say which letters to use`);
    } else {
      assert.equal(statedLimit(unit.intro!).limit, limit, `${setId} u${ui} intro "${unit.intro}" should state ${limit}`);
    }
    checked++;
  });
  assert.equal(checked, 19);
});

/* ── Russian for every title and instruction ─────────────────────────── */

test('every practice title and instruction has a Russian entry, with no long dash', () => {
  const missing: string[] = [];
  eachUnit((setId, ui, set) => {
    const texts = [set.intro, set.units[ui]!.intro];
    if (ui === 0) texts.unshift(set.title);
    for (const text of texts) {
      if (!text) continue;
      const ru = ruMerged.strings[text];
      if (!ru) missing.push(`${setId}: ${JSON.stringify(text)}`);
      else assert.ok(!/[–—]/.test(ru), `Russian for ${JSON.stringify(text)} has a long dash`);
    }
  });
  assert.deepEqual(missing, [], `add these to src/lib/i18n/dict/ru/practice-sets.ts:\n${missing.join('\n')}`);
});

test('the Russian keeps the IELTS terms and the paper rubric in English', () => {
  const ru = ruMerged.strings;
  assert.match(ru['Exercise. Decide: True, False, or Not Given (real test questions)']!, /True, False .* Not Given/);
  assert.match(ru['Exercise. Real questions from IELTS Listening Test 1, Part 2']!, /Part 2/);
  assert.match(ru['Choose NO MORE THAN TWO WORDS from the passage for each answer.']!, /NO MORE THAN TWO WORDS/);
  assert.match(ru['Write ONE WORD AND/OR A NUMBER for each answer.']!, /ONE WORD AND\/OR A NUMBER/);
});
