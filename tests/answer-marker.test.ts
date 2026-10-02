/* The typed-answer marker, case by case: what an IELTS examiner accepts is
   accepted, and what an examiner rejects is still rejected.

   Written for the pre-publishing fix of 3 October 2026
   (docs/audits/prepublish-2026-10-03/marker-fix/REPORT.md). Reviewers found
   that "three" was wrong against "3", that a phone number typed with spaces
   was wrong against one typed without, and that organiser/organizer and
   co-operate/cooperate were marked as different words. The other half of
   every test below is the reject side: none of these folds may turn a
   misspelling, a wrong plural or a different number into a right answer.

   Run on its own with:
     node --import ./tests/ts-extension-loader.mjs --test tests/answer-marker.test.ts */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answerLeniency,
  answerMatches,
  isCorrect,
  listeningBand,
  readingBand,
  scoredQuestionIds,
} from '../src/lib/tests/schema.ts';
import type { Question } from '../src/lib/tests/schema.ts';
import { isCorrect as focusedIsCorrect } from '../src/components/learning/focused-exercise.ts';

function q(answer: string | string[]): Question {
  return { id: 'q1', answer } as Question;
}
function accepts(key: string | string[], typed: string) {
  assert.equal(isCorrect(q(key), typed), true, `"${typed}" should be RIGHT against ${JSON.stringify(key)}`);
}
function rejects(key: string | string[], typed: string) {
  assert.equal(isCorrect(q(key), typed), false, `"${typed}" should be WRONG against ${JSON.stringify(key)}`);
}

/* ── Numbers in words or figures ─────────────────────────────────────────── */

test('a whole number in words is the same answer as in figures, both ways', () => {
  accepts('3', 'three');
  accepts('three', '3');
  accepts('2 years', 'two years');
  accepts('two years', '2 years');
  accepts('21', 'twenty-one');
  accepts('21', 'twenty one');
  accepts('twenty-one', '21');
  accepts('40', 'Forty');
  accepts('100', 'a hundred');
  accepts('100', 'one hundred');
  accepts('15 years', 'fifteen years');
  accepts('0', 'zero');
  accepts('3 times', 'three times');
  accepts('12', 'twelve');
  accepts('90', 'ninety');
});

test('a number word never matches a different number or a misspelling', () => {
  rejects('3', 'thre');
  rejects('3', 'four');
  rejects('13', 'thirty');
  rejects('30', 'thirteen');
  rejects('21', 'twenty');
  rejects('21', 'twenty two');
  rejects('2 years', 'two year');
  rejects('2 years', 'second years');
  rejects('15', 'fiveteen');
});

test('"a" and "an" on their own are never read as the number one', () => {
  rejects('1 bedroom', 'a bedroom');
  rejects('a bedroom', '1 bedroom');
  rejects('1 apple', 'an apple');
  rejects('1', 'a');
  accepts('1 bedroom', 'one bedroom');
});

test('number words inside other words are left alone', () => {
  rejects('often', '0ften');
  rejects('someone', 'some1');
  rejects('tension', 't10sion');
  accepts('bone', 'Bone');
  rejects('bone', 'b1');
});

/* ── Phone numbers and long digit strings ────────────────────────────────── */

test('spaces and hyphens inside a phone number or long code do not matter', () => {
  accepts('0207 946 0321', '02079460321');
  accepts('02079460321', '0207 946 0321');
  accepts('0207 946 0321', '0207-946-0321');
  accepts('09356 788 545', '09356788545');
  accepts('4456 7890 1234', '445678901234');
  accepts('0207 946 0321', '0207  946  0321');
});

test('a phone number with a digit wrong, missing or extra is still wrong', () => {
  rejects('0207 946 0321', '0207 946 032');
  rejects('0207 946 0321', '0207 946 0322');
  rejects('0207 946 0321', '0207 946 03211');
  rejects('0207 946 0321', '2079460321');
});

test('short numbers keep their separator: a range is not one number', () => {
  rejects('5-12', '512');
  rejects('5 12', '512');
  rejects('10 12', '1012');
  rejects('1990-1995', '19901995');
  accepts('5-12', '5 - 12');
  accepts('5-12', '5–12');
});

/* ── Clock times ─────────────────────────────────────────────────────────── */

test('a time with am/pm written 10.45 or 10:45, with or without a space, is one time', () => {
  accepts('10.45 am', '10:45am');
  accepts('10:45 am', '10.45 a.m.');
  accepts('7.30 pm', '7:30pm');
  accepts('12.30 pm', '12:30 p.m.');
  accepts('9 am', '9am');
  rejects('10.45', '10.54');
  rejects('7.30 pm', '7.30 am');
  rejects('4.5', '4:50');
  // A bare 4.50 may be a price, so it is not read as a time: "4:50" is not
  // a way to write £4.50. Bare time keys list their colon form in the data.
  rejects('4.50', '4:50');
  rejects('£4.50', '4:50');
});

/* ── British and American spelling ───────────────────────────────────────── */

test('the British and American spellings reviewers found missing are now one word', () => {
  for (const [british, american] of [
    ['organiser', 'organizer'],
    ['organisers', 'organizers'],
    ['social organiser', 'social organizer'],
    ['fertiliser', 'fertilizer'],
    ['fertilisers', 'fertilizers'],
    ['co-operate', 'cooperate'],
    ['co-operation', 'cooperation'],
    ['co-ordinator', 'coordinator'],
    ['co-ordinate', 'coordinate'],
    ['co-educational', 'coeducational'],
    ['e-mail', 'email'],
    ['e-mails', 'emails'],
  ] as const) {
    accepts(british, american);
    accepts(american, british);
    assert.equal(answerLeniency(q(british), american), null, `${american} is a spelling, not a forgiven hyphen`);
  }
  // The spaced form is the same word too.
  accepts('co-operate', 'co operate');
  accepts('cooperate', 'co operate');
});

test('common -ise/-ize, -our/-or, -re/-er, -ll-/-l- and other pairs IELTS answers use', () => {
  for (const [british, american] of [
    ['travelled', 'traveled'],
    ['travelling', 'traveling'],
    ['centre', 'center'],
    ['city centre', 'city center'],
    ['programme', 'program'],
    ['catalogue', 'catalog'],
    ['enrol', 'enroll'],
    ['enrolment', 'enrollment'],
    ['jewellery', 'jewelry'],
    ['licence', 'license'],
    ['driving licence', 'driving license'],
    ['kilometres', 'kilometers'],
    ['5 kilometres', '5 kilometers'],
    ['centimetres', 'centimeters'],
    ['visualisation', 'visualization'],
    ['characterised', 'characterized'],
    ['stencilling', 'stenciling'],
    ['labour', 'labor'],
    ['behavioural', 'behavioral'],
    ['neighbouring', 'neighboring'],
    ['tumour', 'tumor'],
    ['analyse', 'analyze'],
    ['globalisation', 'globalization'],
    ['prioritise', 'prioritize'],
    ['urbanisation', 'urbanization'],
    ['counsellor', 'counselor'],
    ['fulfilment', 'fulfillment'],
    ['archaeology', 'archeology'],
    ['manoeuvre', 'maneuver'],
    ['defence', 'defense'],
    ['flat tyre', 'flat tire'],
  ] as const) {
    accepts(british, american);
    accepts(american, british);
  }
});

test('a spelling variant never excuses a misspelling or a wrong word form', () => {
  rejects('organiser', 'organisor');
  rejects('organiser', 'organisers');
  rejects('organisers', 'organiser');
  rejects('fertiliser', 'fertiliserr');
  rejects('fertiliser', 'fertilisation');
  rejects('cooperate', 'cooperation');
  rejects('coordinator', 'coordinater');
  rejects('travelled', 'travelld');
  rejects('centre', 'centres');
  rejects('centre', 'central');
  rejects('jewellery', 'jewelery');
  rejects('programme', 'programmes');
  rejects('kilometres', 'kilometre');
  rejects('four', 'for');
  rejects('email', 'emails');
  rejects('enrol', 'enroled');
});

test('-ise words with no -ize form are not invented', () => {
  rejects('advertise', 'advertize');
  rejects('exercise', 'exercize');
  rejects('surprise', 'surprize');
});

test('ambiguous pairs are left out: the American form is also a different word', () => {
  rejects('check', 'cheque');
  rejects('a first draft', 'a first draught');
  rejects('a short story', 'a short storey');
  rejects('curb', 'kerb');
});

/* ── Case, punctuation, and what stays exactly as it was ─────────────────── */

test('case and surrounding punctuation are still forgiven, leading articles are not stripped', () => {
  accepts('Ludlow', 'LUDLOW');
  accepts('the museum', 'The museum.');
  accepts('the museum', '"the museum"');
  rejects('the museum', 'museum');
  rejects('museum', 'the museum');
});

test('the notes on forgiven forms still appear where a real examiner might differ', () => {
  assert.deepEqual(answerLeniency(q('well-known'), 'well known')?.forgiven, ['the hyphen']);
  assert.deepEqual(answerLeniency(q('$50'), 'fifty')?.forgiven, ['the currency symbol']);
  assert.deepEqual(answerLeniency(q('10:45 am'), '10.45 am!')?.forgiven, ['the punctuation you added']);
  assert.equal(answerLeniency(q('3'), 'three'), null);
  assert.equal(answerLeniency(q('0207 946 0321'), '02079460321'), null);
});

test('answer pools and multi-select questions use the same folds', () => {
  const pair: Question[] = [
    { id: 'q1', answer: ['3', 'organiser'], answerPairId: 'p' } as Question,
    { id: 'q2', answer: ['3', 'organiser'], answerPairId: 'p' } as Question,
  ];
  assert.equal(scoredQuestionIds(pair, { q1: 'three', q2: 'organizer' }).size, 2);
  assert.equal(scoredQuestionIds(pair, { q1: 'three', q2: '3' }).size, 1, 'the same answer twice earns one mark');
  const multi = { id: 'q1', answer: 'A, C', multiSelect: { correctValues: ['A', 'C'], selectCount: 2 } } as Question;
  assert.equal(isCorrect(multi, 'c|a'), true);
  assert.equal(isCorrect(multi, 'A|B'), false);
});

test('focused exercises mark exactly as the full test does', () => {
  assert.equal(focusedIsCorrect('three', '3'), true);
  assert.equal(focusedIsCorrect('organizer', 'organiser'), true);
  assert.equal(focusedIsCorrect('02079460321', ['0207 946 0321']), true);
  assert.equal(focusedIsCorrect('organisor', 'organiser'), false);
  assert.equal(focusedIsCorrect('', 'organiser'), false);
  assert.equal(focusedIsCorrect('   ', ['a', 'b']), false);
  assert.equal(answerMatches('B', ['A', 'B']), true);
});

/* ── Band conversion ─────────────────────────────────────────────────────── */

test('Listening raw scores convert on the published table, with Band 4.0 from 10', () => {
  const expected: [number, number][] = [
    [40, 9], [39, 9], [38, 8.5], [37, 8.5], [36, 8], [35, 8], [34, 7.5], [33, 7.5], [32, 7.5],
    [31, 7], [30, 7], [29, 6.5], [26, 6.5], [25, 6], [23, 6], [22, 5.5], [18, 5.5], [17, 5],
    [16, 5], [15, 4.5], [13, 4.5], [12, 4], [11, 4], [10, 4], [9, 3.5],
  ];
  for (const [raw, band] of expected) assert.equal(listeningBand(raw, 40), band, `Listening ${raw}/40`);
});

test('Academic Reading raw scores convert on the published table', () => {
  const expected: [number, number][] = [
    [40, 9], [39, 9], [38, 8.5], [37, 8.5], [36, 8], [35, 8], [34, 7.5], [33, 7.5], [32, 7],
    [30, 7], [29, 6.5], [27, 6.5], [26, 6], [23, 6], [22, 5.5], [19, 5.5], [18, 5], [15, 5],
    [14, 4.5], [13, 4.5], [12, 4], [10, 4], [9, 3.5],
  ];
  for (const [raw, band] of expected) assert.equal(readingBand(raw, 40), band, `Reading ${raw}/40`);
});
