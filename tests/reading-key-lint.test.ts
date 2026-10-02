/* The Reading bank's answer-key check (tools/reading-key-lint.mjs) finds
   nothing wrong, and its rules catch what they claim to catch.

   The bank is the 40 full Academic Reading tests, their Russian answer
   notes, and the lesson-page exercise sets copied from them. Faults found
   and fixed in the 2026-10-03 review are listed in
   docs/audits/content-review-2026-10-03/reading-tests.md; this test stops
   the same kinds coming back with the next import or edit. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countAnswer,
  explicitVerdicts,
  fitsLimit,
  KEPT_ON_PURPOSE,
  lintReadingBank,
  lintTest,
  scrambledGrid,
  statedLimit,
  unlocatable,
} from '../tools/reading-key-lint.mjs';

test('the whole Reading bank passes the answer-key check', async () => {
  const result = await lintReadingBank();
  assert.equal(result.tests, 40);
  assert.equal(result.questions, 1600);
  assert.deepEqual(result.errors, [], `answer-key faults:\n${result.errors.join('\n')}`);
  // Every kept exception is still real; a stale one would hide nothing and should go.
  for (const key of Object.keys(KEPT_ON_PURPOSE)) {
    assert.ok(result.kept.some((e: string) => e.startsWith(key)), `stale exception: ${key}`);
  }
});

test('word limits are read from the instructions and counted the IELTS way', () => {
  assert.deepEqual(statedLimit('Choose NO MORE THAN TWO WORDS from the passage'), { limit: 2, number: false, onlyNumber: false });
  assert.equal(statedLimit('Choose ONE WORD ONLY from the passage').limit, 1);
  assert.deepEqual(statedLimit('NO MORE THAN THREE WORDS AND/OR A NUMBER'), { limit: 3, number: true, onlyNumber: false });
  assert.deepEqual(countAnswer('well-known 40 cats'), { words: 2, numbers: 1 });
  assert.equal(fitsLimit('the Persian wars', { limit: 2, number: false }), false);
  assert.equal(fitsLimit('Persian wars', { limit: 2, number: false }), true);
  assert.equal(fitsLimit('rapid growth 1990', { limit: 2, number: true }), true);
});

test('an explanation that states the opposite verdict is caught, a neutral one is not', () => {
  assert.deepEqual([...explicitVerdicts('This is False: the passage says the opposite.')], ['FALSE']);
  assert.deepEqual([...explicitVerdicts('Without that comparison we cannot say the statement is true or false.')], []);
  const base = {
    id: 'reading-full-999', skill: 'reading', title: 't', description: 'd', durationMinutes: 60,
    parts: [{
      label: 'Passage 1',
      stimulus: { kind: 'passage', label: 'Reading Passage 1', title: 'x', instructionHtml: '', paragraphs: [{ html: 'Cats sleep a lot.' }] },
      groups: [{
        title: 'Questions 1-1', type: 'tfng', instructionHtml: 'Write TRUE, FALSE or NOT GIVEN',
        questions: [{ id: 'q1', textHtml: 'Cats sleep a lot', answer: 'True', explanation: 'This is False: nothing.' }],
      }],
    }],
  };
  const { errors } = lintTest(base as never, {});
  assert.ok(errors.some((e: string) => /explanation states FALSE but the key is TRUE/.test(e)), errors.join('\n'));
});

test('a YES/NO key on a TRUE/FALSE question and a letter outside the list are caught', () => {
  const t = {
    id: 'reading-full-998', skill: 'reading', title: 't', description: 'd', durationMinutes: 60,
    parts: [{
      label: 'Passage 1',
      stimulus: { kind: 'passage', label: 'Reading Passage 1', title: 'x', instructionHtml: '', paragraphs: [{ html: 'A text.' }] },
      groups: [
        { title: 'Questions 1-1', type: 'tfng', instructionHtml: 'Write TRUE, FALSE or NOT GIVEN', questions: [{ id: 'q1', textHtml: 's', answer: 'Yes' }] },
        { title: 'Questions 2-2', type: 'paragraph-matching', instructionHtml: 'Which paragraph, A-C?', options: ['A', 'B', 'C'], questions: [{ id: 'q2', textHtml: 's', answer: 'D' }] },
      ],
    }],
  };
  const { errors } = lintTest(t as never, {});
  assert.ok(errors.some((e: string) => /key "Yes" on a TRUE\/FALSE/.test(e)), errors.join('\n'));
  assert.ok(errors.some((e: string) => /key "D" is outside the options/.test(e)), errors.join('\n'));
});

test('the review screen\'s "show in passage" search is mirrored, case and all', () => {
  const passage = 'It is no longer possible to exclude the hypothesis of transoceanic trade in ancient times.';
  assert.deepEqual(unlocatable('It is no longer possible to exclude the hypothesis', passage), []);
  assert.equal(unlocatable('it is no longer possible to exclude', passage).length, 1);
});

test('a table grid whose boxes sit beside the next question\'s words is caught', () => {
  assert.equal(scrambledGrid({ rows: [['…….. 1st century BC Central Asia To seek', { questionId: 'q14' }, '']] }), true);
  assert.equal(scrambledGrid({ rows: [[{ questionId: 'q14' }], [{ questionId: 'q15' }]] }), false);
  assert.equal(scrambledGrid({ rows: [['The construction of …… was the first stage', { questionId: 'q19' }, '']] }), false);
});
