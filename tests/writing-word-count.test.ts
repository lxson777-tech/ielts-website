/* The essay word count follows IELTS: numbers are words, a hyphenated word is
 * one word. Before 3 October 2026 numbers were skipped, so a Task 1 report
 * full of figures was told it was under length and the grader marked it down.
 *
 *   node --import ./tests/ts-extension-loader.mjs --test tests/writing-word-count.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { countWords, analyzeEssay } = await import('../src/lib/writing/mechanics.ts');

test('numbers, percentages and years count as words', () => {
  assert.equal(countWords('Closures peaked at 7,200 in 2013, about 25% higher.'), 9);
});

test('a hyphenated word and a contraction are one word each', () => {
  assert.equal(countWords("It's a well-known, long-term trend."), 5);
});

test('stray punctuation is not a word', () => {
  assert.equal(countWords('First point - second point •  third'), 5);
});

test('the length check uses the same count', () => {
  const essay = Array.from({ length: 75 }, (_, i) => `rose ${1000 + i}`).join(' ');
  const report = analyzeEssay({ essay, prompt: { task: 'task1', promptHtml: '<p>Summarise the chart.</p>', minWords: 150 } } as never);
  assert.equal(report.wordCount, 150);
  assert.equal(report.underLength, false);
});
