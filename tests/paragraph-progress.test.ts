/* The writing coach's numbered path follows the essay by itself: these pin
 * how paragraphs in the answer box map onto the steps, and when a step
 * counts as done. The rules are written out at the top of
 * src/lib/writing/paragraph-progress.ts.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/paragraph-progress.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BODY_PARAGRAPH_WORDS,
  SHORT_PARAGRAPH_WORDS,
  isOptionalStep,
  splitParagraphs,
  stepProgress,
  wordsNeeded,
} from '../src/lib/writing/paragraph-progress.ts';
import { WRITING_STRUCTURES } from '../src/data/writing-structures.ts';

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
const OPINION = WRITING_STRUCTURES.opinion.paragraphs.map((p) => p.name);
const DISCUSSION = WRITING_STRUCTURES.discussion.paragraphs.map((p) => p.name);
const CHART = WRITING_STRUCTURES.chart.paragraphs.map((p) => p.name);

test('an empty answer puts the student on step 1 with nothing done', () => {
  const p = stepProgress(OPINION, '');
  assert.deepEqual(p.states, ['now', 'later', 'later', 'later']);
  assert.equal(p.done, 0);
  assert.equal(p.paragraphs, 0);
});

test('a finished introduction moves "now" to Body 1', () => {
  const p = stepProgress(OPINION, words(SHORT_PARAGRAPH_WORDS));
  assert.deepEqual(p.states, ['done', 'now', 'later', 'later']);
});

test('an introduction still under way stays "now"', () => {
  const p = stepProgress(OPINION, words(SHORT_PARAGRAPH_WORDS - 1));
  assert.deepEqual(p.states, ['now', 'later', 'later', 'later']);
  assert.equal(p.paragraphs, 1);
});

test('two paragraphs: intro done, a short Body 1 is "now"', () => {
  const essay = `${words(20)}\n\n${words(10)}`;
  assert.deepEqual(stepProgress(OPINION, essay).states, ['done', 'now', 'later', 'later']);
});

test('a single Enter starts a paragraph just like a blank line, and empty lines are ignored', () => {
  const single = `${words(20)}\n${words(30)}`;
  const blank = `${words(20)}\n\n\n   \n${words(30)}\n\n`;
  assert.deepEqual(stepProgress(OPINION, single).states, ['done', 'done', 'now', 'later']);
  assert.deepEqual(stepProgress(OPINION, blank).states, ['done', 'done', 'now', 'later']);
  assert.equal(splitParagraphs(blank).length, 2);
  assert.equal(splitParagraphs('a\r\n\r\nb').length, 2, 'Windows line endings split the same way');
  assert.equal(splitParagraphs(' - \n').length, 0, 'a stray dash is not a paragraph');
});

test('body paragraphs need more words than the introduction', () => {
  const essay = `${words(20)}\n${words(BODY_PARAGRAPH_WORDS - 1)}`;
  assert.deepEqual(stepProgress(OPINION, essay).states, ['done', 'now', 'later', 'later']);
  assert.equal(wordsNeeded('Introduction'), SHORT_PARAGRAPH_WORDS);
  assert.equal(wordsNeeded('Overview'), SHORT_PARAGRAPH_WORDS);
  assert.equal(wordsNeeded('Conclusion'), SHORT_PARAGRAPH_WORDS);
  assert.equal(wordsNeeded('Body 1: Advantages'), BODY_PARAGRAPH_WORDS);
  assert.equal(wordsNeeded('Detail 2'), BODY_PARAGRAPH_WORDS);
});

test('a complete essay has every step done and no "now"', () => {
  const essay = [words(20), words(40), words(40), words(16)].join('\n\n');
  const p = stepProgress(OPINION, essay);
  assert.deepEqual(p.states, ['done', 'done', 'done', 'done']);
  assert.equal(p.done, 4);
});

test('a short paragraph in the middle stays "now" even when later ones are long', () => {
  const essay = [words(20), words(5), words(40)].join('\n');
  assert.deepEqual(stepProgress(OPINION, essay).states, ['done', 'now', 'done', 'later']);
});

test('Task 1: the overview counts as a short paragraph, details as body paragraphs', () => {
  assert.deepEqual(CHART, ['Introduction', 'Overview', 'Detail 1', 'Detail 2']);
  const essay = [words(16), words(16), words(24)].join('\n');
  assert.deepEqual(stepProgress(CHART, essay).states, ['done', 'done', 'now', 'later']);
});

test('the optional Body 3 waits until the essay outgrows the required steps', () => {
  assert.ok(isOptionalStep(DISCUSSION[3]!));
  assert.equal(DISCUSSION.length, 5);

  // Three paragraphs: the next required step is the conclusion.
  const three = [words(20), words(40), words(40)].join('\n');
  assert.deepEqual(stepProgress(DISCUSSION, three).states, ['done', 'done', 'done', 'optional', 'now']);

  // Four: they map to the four required steps; Body 3 was skipped.
  const four = [words(20), words(40), words(40), words(20)].join('\n');
  assert.deepEqual(stepProgress(DISCUSSION, four).states, ['done', 'done', 'done', 'optional', 'done']);

  // Five: Body 3 was written after all.
  const five = [words(20), words(40), words(40), words(40), words(20)].join('\n');
  assert.deepEqual(stepProgress(DISCUSSION, five).states, ['done', 'done', 'done', 'done', 'done']);
});

test('every step of every essay type has a word target', () => {
  for (const guide of Object.values(WRITING_STRUCTURES)) {
    for (const p of guide.paragraphs) assert.ok(wordsNeeded(p.name) > 0, p.name);
  }
});
