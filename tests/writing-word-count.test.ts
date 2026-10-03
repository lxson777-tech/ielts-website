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

test('a decimal point or a date does not end a sentence', () => {
  const essay = 'Sales rose to 3.5 million, up 12.5% on 12.06.2016. They then fell. Prices held steady!';
  const report = analyzeEssay({ essay, prompt: { task: 'task1', promptHtml: '<p>Summarise the chart.</p>', minWords: 150 } } as never);
  assert.equal(report.sentenceCount, 3);
  assert.equal(report.wordCount, 15);
  assert.equal(report.avgSentenceLength, 5);
});

test('a curly apostrophe does not split a word in the vocabulary statistics', () => {
  const curly = analyzeEssay({ essay: 'It don’t matter.', prompt: { task: 'task2', promptHtml: '<p>Discuss.</p>', minWords: 250 } } as never);
  const straight = analyzeEssay({ essay: "It don't matter.", prompt: { task: 'task2', promptHtml: '<p>Discuss.</p>', minWords: 250 } } as never);
  assert.equal(curly.wordCount, 3);
  assert.equal(curly.lexicalDiversity, straight.lexicalDiversity);
});

test('every real Band 8 model answer is counted as an examiner would count it', async () => {
  const { MODEL_ANSWERS } = await import('../src/data/model-answers.ts');
  const { WRITING_PROMPTS } = await import('../src/data/writing-prompts.ts');
  const problems: string[] = [];
  for (const model of MODEL_ANSWERS) {
    const prompt = WRITING_PROMPTS.find((p) => p.id === model.promptId);
    if (!prompt) continue;
    const essay = model.text.join('\n\n');
    const byEye = essay.trim().split(/\s+/).filter(Boolean).length;
    const report = analyzeEssay({ essay, prompt });
    if (report.wordCount !== byEye) problems.push(`${model.promptId}: counted ${report.wordCount}, by eye ${byEye}`);
    if (report.underLength) problems.push(`${model.promptId}: flagged under length at ${report.wordCount} words`);
  }
  assert.deepEqual(problems, []);
});

test('the shop closures Task 1 model: 183 words and 9 sentences, not 158', async () => {
  const { MODEL_ANSWERS } = await import('../src/data/model-answers.ts');
  const { WRITING_PROMPTS } = await import('../src/data/writing-prompts.ts');
  const model = MODEL_ANSWERS.find((m) => m.promptId === 'pte-wt-116-task1')!;
  const prompt = WRITING_PROMPTS.find((p) => p.id === 'pte-wt-116-task1')!;
  const report = analyzeEssay({ essay: model.text.join('\n\n'), prompt });
  assert.equal(report.wordCount, 183);
  assert.equal(report.sentenceCount, 9);
  /* Without its overview paragraph it is still 153 real words: over 150. */
  const noOverview = analyzeEssay({ essay: [model.text[0], ...model.text.slice(2)].join('\n\n'), prompt });
  assert.equal(noOverview.wordCount, 153);
  assert.equal(noOverview.underLength, false);
});
