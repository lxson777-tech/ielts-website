/* Our marker accepts more forms than a real examiner does. That is deliberate,
   but silently accepting them trains habits that lose marks on test day, so
   review tells the student what was forgiven and shows the key's exact form.
   These tests pin down which differences count as forgiveness and which are
   free (case and spacing cost nothing in the real test). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { answerLeniency, acceptedVariants, isCorrect } from '../src/lib/tests/schema.ts';
import type { Question } from '../src/lib/tests/schema.ts';

function q(answer: string | string[]): Question {
  return { id: 'q1', answer } as Question;
}

test('case and spacing are forgiven silently, because they cost nothing in the test', () => {
  for (const given of ['Rainfall', 'RAINFALL', '  rainfall  ']) {
    assert.equal(isCorrect(q('rainfall'), given), true, `"${given}" should be marked right`);
    assert.equal(answerLeniency(q('rainfall'), given), null, `"${given}" should raise no note`);
  }
  // A doubled space between words is a typing slip, not a different answer.
  assert.equal(isCorrect(q('the museum'), 'The  museum'), true);
  assert.equal(answerLeniency(q('the museum'), 'The  museum'), null);
});

test('a missing hyphen is flagged with the exact form to write', () => {
  const result = answerLeniency(q('well-known'), 'well known');
  assert.ok(result, 'expected a note');
  assert.equal(result.expected, 'well-known');
  assert.deepEqual(result.forgiven, ['the hyphen']);
});

test('a dropped currency symbol is flagged', () => {
  const result = answerLeniency(q('$50'), '50');
  assert.ok(result);
  assert.equal(result.expected, '$50');
  assert.deepEqual(result.forgiven, ['the currency symbol']);
});

test('percent written out instead of the sign is flagged', () => {
  const result = answerLeniency(q('40%'), '40 percent');
  assert.ok(result);
  assert.equal(result.expected, '40%');
  assert.deepEqual(result.forgiven, ['writing percent out in words instead of using the % sign']);
});

test('a comma inside a number is flagged', () => {
  const result = answerLeniency(q('5000'), '5,000');
  assert.ok(result);
  assert.deepEqual(result.forgiven, ['the comma inside the number']);
});

test('trailing punctuation is flagged', () => {
  const result = answerLeniency(q('the museum'), 'the museum.');
  assert.ok(result);
  assert.deepEqual(result.forgiven, ['the punctuation you added']);
});

test('a wrong answer produces no note at all', () => {
  assert.equal(answerLeniency(q('rainfall'), 'snowfall'), null);
  assert.equal(answerLeniency(q('rainfall'), ''), null);
});

test('matching one of several accepted forms exactly is not forgiveness', () => {
  assert.equal(answerLeniency(q(['bicycle', 'bike']), 'bike'), null);
});

test('acceptedVariants lists a key with alternatives and nothing else', () => {
  assert.deepEqual(acceptedVariants(q(['bicycle', 'bike'])), ['bicycle', 'bike']);
  assert.deepEqual(acceptedVariants(q(['bicycle'])), []);
  assert.deepEqual(acceptedVariants(q('bicycle')), []);
});

test('British and American spellings both count, in either direction', () => {
  for (const [key, typed] of [
    ['colour', 'color'],
    ['color', 'colour'],
    ['the centre', 'the center'],
    ['organised', 'organized'],
    ['500 metres', '500 meters'],
    ['grey', 'gray'],
  ] as const) {
    assert.equal(isCorrect(q(key), typed), true, `"${typed}" should be marked right against "${key}"`);
    assert.equal(answerLeniency(q(key), typed), null, 'an official spelling variant is not forgiveness');
  }
});

test('a spelling pair never swallows a different word', () => {
  assert.equal(isCorrect(q('four'), 'for'), false);
  assert.equal(isCorrect(q('storeys'), 'stores'), false);
  assert.equal(isCorrect(q('centre'), 'central'), false);
});
