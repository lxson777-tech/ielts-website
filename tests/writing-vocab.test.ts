/* The Writing coach's Vocabulary tab reads prompt.suggestedVocab first and falls
   back to the question's generated plan. The 60 imported exam tasks have an
   empty suggestedVocab, so the tab is only ever filled for them if every one of
   them has a plan with phrases in it. Guard that. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { IMPORTED_WRITING_PROMPTS } from '../src/data/writing-prompts-imported.ts';
import { getWritingPlan } from '../src/data/writing-plans.ts';

test('every imported writing task can fill the Vocabulary tab', () => {
  const empty: string[] = [];
  for (const prompt of IMPORTED_WRITING_PROMPTS) {
    if (prompt.suggestedVocab.length > 0) continue;
    const plan = getWritingPlan(prompt.id);
    if (!plan || plan.vocabulary.length === 0) empty.push(prompt.id);
  }
  assert.deepEqual(empty, [], `these tasks would show an empty Vocabulary tab: ${empty.join(', ')}`);
});

test('plan vocabulary entries are usable cards', () => {
  for (const prompt of IMPORTED_WRITING_PROMPTS) {
    const plan = getWritingPlan(prompt.id);
    if (!plan) continue;
    const phrases = plan.vocabulary.map((v) => v.phrase);
    assert.equal(new Set(phrases).size, phrases.length, `duplicate phrase in the plan for ${prompt.id}`);
    for (const v of plan.vocabulary) {
      assert.ok(v.phrase.trim().length > 0, `empty phrase in the plan for ${prompt.id}`);
      assert.ok(v.use.trim().length > 0, `phrase "${v.phrase}" in ${prompt.id} has no explanation`);
    }
  }
});

/* The `variant` tag decides which structure guide the coach panel shows, so a
   two-part question tagged "opinion" teaches the wrong essay shape. The
   importer cannot tell the type from the page, so eight were corrected by
   hand in 2026-09. Catch a regression, and catch the next import. */
test('a Task 2 prompt that asks two questions is tagged two-part', () => {
  const wrong: string[] = [];
  for (const prompt of IMPORTED_WRITING_PROMPTS) {
    if (prompt.task !== 'task2') continue;
    const text = prompt.promptHtml
      .replace(/<[^>]+>/g, ' ')
      .replace('Write at least 250 words.', '')
      .replace('Give reasons for your answer and include any relevant examples from your own knowledge or experience.', '');
    const questions = (text.match(/\?/g) ?? []).length;
    if (questions >= 2 && prompt.variant !== 'two-part') {
      wrong.push(`${prompt.id}: ${questions} questions but tagged ${prompt.variant}`);
    }
    if (/outweigh/i.test(text) && prompt.variant !== 'advantages-disadvantages') {
      wrong.push(`${prompt.id}: asks whether advantages outweigh but tagged ${prompt.variant}`);
    }
  }
  assert.deepEqual(wrong, [], wrong.join('\n'));
});
