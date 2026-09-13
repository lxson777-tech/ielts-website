import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bandEstimate,
  isCorrect,
  listeningBand,
  scoredQuestionIds,
  type Question,
} from '../src/lib/tests/schema.ts';

test('listening band uses listening boundaries rather than reading boundaries', () => {
  assert.equal(listeningBand(32, 40), 7.5);
  assert.equal(listeningBand(26, 40), 6.5);
  assert.equal(listeningBand(18, 40), 5.5);
  assert.equal(bandEstimate(32, 40, 'listening'), '7.5');
  assert.equal(bandEstimate(32, 40, 'reading'), '7.0');
});

test('typed listening answers accept harmless formatting variants', () => {
  const question: Question = { id: 'q1', answer: ['5,000', '$5,000'] };
  assert.equal(isCorrect(question, ' 5000. '), true);
  assert.equal(isCorrect({ id: 'q2', answer: 'well-known' }, 'Well known'), true);
  assert.equal(isCorrect({ id: 'q3', answer: '25 per cent' }, '25%'), true);
  assert.equal(isCorrect(question, '500'), false);
});

test('an explicitly unscored source question never contributes a mark', () => {
  const question: Question = { id: 'q14', answer: 'A', scored: false };
  assert.equal(scoredQuestionIds([question], { q14: 'A' }).size, 0);
});

test('unordered pair earns two marks in either order', () => {
  const questions: Question[] = [
    { id: 'q19', answer: ['A', 'E'], answerPairId: 'q19-20' },
    { id: 'q20', answer: ['A', 'E'], answerPairId: 'q19-20' },
  ];

  assert.deepEqual([...scoredQuestionIds(questions, { q19: 'A', q20: 'E' })], ['q19', 'q20']);
  assert.deepEqual([...scoredQuestionIds(questions, { q19: 'E', q20: 'A' })], ['q19', 'q20']);
});

test('unordered pair does not award the same answer twice', () => {
  const questions: Question[] = [
    { id: 'q19', answer: ['A', 'E'], answerPairId: 'q19-20' },
    { id: 'q20', answer: ['A', 'E'], answerPairId: 'q19-20' },
  ];

  assert.deepEqual([...scoredQuestionIds(questions, { q19: 'A', q20: 'A' })], ['q19']);
  assert.equal(scoredQuestionIds(questions, { q19: 'B', q20: 'E' }).size, 1);
});

test('unordered three-answer group earns each distinct mark in any order', () => {
  const questions: Question[] = [
    { id: 'q16', answer: ['C', 'F', 'G'], answerPairId: 'q16-18' },
    { id: 'q17', answer: ['C', 'F', 'G'], answerPairId: 'q16-18' },
    { id: 'q18', answer: ['C', 'F', 'G'], answerPairId: 'q16-18' },
  ];

  assert.deepEqual(
    [...scoredQuestionIds(questions, { q16: 'G', q17: 'C', q18: 'F' })],
    ['q16', 'q17', 'q18'],
  );
  assert.equal(scoredQuestionIds(questions, { q16: 'C', q17: 'C', q18: 'F' }).size, 2);
});

test('one numbered multi-select question awards one mark only for the complete exact set', () => {
  const question: Question = {
    id: 'q11',
    answer: 'A, C',
    multiSelect: { correctValues: ['A', 'C'], selectCount: 2 },
  };

  assert.equal(isCorrect(question, 'A|C'), true);
  assert.equal(isCorrect(question, 'C|A'), true);
  assert.equal(isCorrect(question, 'A'), false);
  assert.equal(isCorrect(question, 'A|B'), false);
  assert.equal(isCorrect(question, 'A|C|D'), false);
  assert.deepEqual([...scoredQuestionIds([question], { q11: 'C|A' })], ['q11']);
  assert.equal(scoredQuestionIds([question], { q11: 'A' }).size, 0);
});
