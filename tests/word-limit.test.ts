/* The live "over the word limit" nudge in the test player, counted the way an
   IELTS examiner counts. Before 3 October 2026 the player split on spaces, so
   a correct "48 North Avenue" under "TWO WORDS AND/OR A NUMBER" showed
   "3 words: limit is 2". See src/lib/tests/word-limit.ts and
   docs/audits/prepublish-2026-10-03/marker-fix/REPORT.md.

   Run on its own with:
     node --import ./tests/ts-extension-loader.mjs --test tests/word-limit.test.ts */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TESTS } from '../src/data/tests/index.ts';
import type { Question } from '../src/lib/tests/schema.ts';
import {
  countAnswerItems,
  countedWords,
  isOverWordLimit,
  numberRuleFromInstruction,
  numberRuleOf,
} from '../src/lib/tests/word-limit.ts';

const AND_OR = 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.';
const OR = 'Write NO MORE THAN TWO WORDS OR A NUMBER.';
const WORDS = 'Write NO MORE THAN TWO WORDS for each answer.';

test('the number rule is read from the instruction', () => {
  assert.equal(numberRuleFromInstruction(AND_OR), 'and-or');
  assert.equal(numberRuleFromInstruction('Write <strong>ONE WORD AND/OR A NUMBER</strong>'), 'and-or');
  assert.equal(numberRuleFromInstruction('NO MORE THAN THREE WORDS AND / OR A NUMBER'), 'and-or');
  assert.equal(numberRuleFromInstruction('ONE WORD AND OR A NUMBER'), 'and-or');
  assert.equal(numberRuleFromInstruction(OR), 'or');
  assert.equal(numberRuleFromInstruction('Write ONE WORD OR A NUMBER only.'), 'or');
  assert.equal(numberRuleFromInstruction('Write ONE NUMBER for each answer.'), 'only');
  assert.equal(numberRuleFromInstruction(WORDS), 'none');
  assert.equal(numberRuleOf({ instructionHtml: WORDS, numberRule: 'and-or' }), 'and-or', 'an explicit rule wins');
});

test('under AND/OR A NUMBER, the number does not count against the words', () => {
  assert.equal(isOverWordLimit('48 North Avenue', 2, 'and-or'), false);
  assert.equal(countedWords('48 North Avenue', 'and-or'), 2);
  assert.equal(isOverWordLimit('2 years', 1, 'and-or'), false);
  assert.equal(isOverWordLimit('two years', 1, 'and-or'), false);
  assert.equal(isOverWordLimit('0207 946 0321', 1, 'and-or'), false);
  assert.equal(isOverWordLimit('£4.50 per hour', 2, 'and-or'), false);
  assert.equal(isOverWordLimit('7am to 12am', 2, 'and-or'), false);
  assert.equal(isOverWordLimit('48 North Avenue Road', 2, 'and-or'), true, 'three words is still over');
  assert.equal(countedWords('48 North Avenue Road', 'and-or'), 3);
});

test('a hyphenated word is one word', () => {
  assert.equal(isOverWordLimit('socio-economic structures', 2, 'none'), false);
  assert.equal(isOverWordLimit('well-known', 1, 'none'), false);
  assert.equal(countedWords('ping-pong tables', 'none'), 2);
});

test('without AND/OR, a number is one item and counts', () => {
  assert.equal(isOverWordLimit('48 North Avenue', 2, 'or'), true);
  assert.equal(isOverWordLimit('500', 1, 'or'), false);
  assert.equal(isOverWordLimit('500 feet', 1, 'or'), true);
  assert.equal(isOverWordLimit('22 August', 2, 'none'), false);
  assert.equal(isOverWordLimit('the 22nd of August', 2, 'none'), true);
  assert.equal(isOverWordLimit('hamburgers and hot dogs', 3, 'none'), true);
  assert.equal(isOverWordLimit('twenty-one', 1, 'none'), false);
  assert.equal(isOverWordLimit('twenty one', 1, 'none'), false, 'a number in words is one number');
  assert.equal(isOverWordLimit('', 1, 'none'), false);
  assert.equal(isOverWordLimit('   ', 1, 'none'), false);
});

test('ONE NUMBER: a single number fits, anything more does not', () => {
  assert.equal(isOverWordLimit('09356 788 545', 1, 'only'), false);
  assert.equal(isOverWordLimit('15', 1, 'only'), false);
  assert.equal(isOverWordLimit('15 minutes', 1, 'only'), true);
});

test('items are counted the IELTS way', () => {
  assert.deepEqual(countAnswerItems('48 North Avenue'), { words: 2, numbers: 1 });
  assert.deepEqual(countAnswerItems('9.30 am'), { words: 0, numbers: 1 });
  assert.deepEqual(countAnswerItems('5-12'), { words: 0, numbers: 1 });
  assert.deepEqual(countAnswerItems('twenty one years'), { words: 1, numbers: 1 });
  assert.deepEqual(countAnswerItems('a hundred metres'), { words: 1, numbers: 1 });
  assert.deepEqual(countAnswerItems('one two three'), { words: 0, numbers: 3 }, 'separate numbers are not merged');
  assert.equal(isOverWordLimit('one two three', 2, 'none'), true);
});

/* The nudge must never fire on a correct answer. Every accepted answer of
   every free-text group on every paper is run through it. The only answers
   allowed to trip it are publisher keys already named as over their own
   printed limit and left for Alex (tests/listening-answer-key.test.ts,
   tests/reading-key-lint.test.ts). */
const KNOWN_OVER_LIMIT = new Set([
  'reading-full-010 q40 Learning style',
]);

test('no accepted key on any paper triggers the over-the-limit nudge', () => {
  const flagged: string[] = [];
  for (const t of ALL_TESTS) {
    for (const part of t.parts) {
      for (const group of part.groups) {
        if (group.wordLimit == null) continue;
        const rule = numberRuleOf(group);
        for (const question of group.questions as Question[]) {
          if (question.multiSelect) continue;
          const keys = Array.isArray(question.answer) ? question.answer : [question.answer];
          for (const key of keys) {
            if (/^[A-L]$|^[ivx]+$/i.test(key)) continue; // a letter or a numeral heading
            const label = `${t.id} ${question.id} ${key}`;
            if (isOverWordLimit(key, group.wordLimit, rule) && !KNOWN_OVER_LIMIT.has(label)) flagged.push(`${label} [limit ${group.wordLimit}, ${rule}]`);
          }
        }
      }
    }
  }
  assert.deepEqual(flagged, []);
});
