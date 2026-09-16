/* The Band 8 models for the 60 real writing tasks. Students copy these, so the
   things that would quietly mislead them are worth pinning down: a model that
   answers a task that does not exist, a highlighted phrase that is not actually
   in the essay (the highlight silently disappears), an essay under the word
   count it tells students to hit, or a missing examiner note. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_ANSWERS, getModelAnswers } from '../src/data/model-answers.ts';
import { WRITING_PROMPTS } from '../src/data/writing-prompts.ts';

function words(model: { text: string[] }): number {
  return model.text.join(' ').trim().split(/\s+/).filter(Boolean).length;
}

test('every real writing task has at least one model answer', () => {
  const missing = WRITING_PROMPTS.filter((p) => getModelAnswers(p.id).length === 0).map((p) => p.id);
  assert.deepEqual(missing, [], `no model answer for: ${missing.join(', ')}`);
});

test('every model answers a prompt that exists', () => {
  const ids = new Set(WRITING_PROMPTS.map((p) => p.id));
  const orphans = MODEL_ANSWERS.filter((m) => !ids.has(m.promptId)).map((m) => m.promptId);
  assert.deepEqual(orphans, [], `these models answer a deleted prompt: ${orphans.join(', ')}`);
});

test('every highlighted phrase really appears in its own essay', () => {
  const broken: string[] = [];
  for (const model of MODEL_ANSWERS) {
    const essay = model.text.join('\n');
    for (const h of model.highlights) {
      if (!essay.includes(h.phrase)) broken.push(`${model.promptId} band ${model.band}: "${h.phrase}"`);
    }
  }
  assert.deepEqual(broken, [], `these highlights would silently vanish:\n${broken.join('\n')}`);
});

test('every model is over the word count the task demands', () => {
  const short: string[] = [];
  for (const model of MODEL_ANSWERS) {
    const prompt = WRITING_PROMPTS.find((p) => p.id === model.promptId);
    if (!prompt) continue;
    const count = words(model);
    if (count < prompt.minWords) short.push(`${model.promptId}: ${count} words, under the ${prompt.minWords} minimum`);
    /* And not so long that copying it would cost a student the other task.
       A candidate has 20 minutes for Task 1 and 40 for Task 2, so a model
       worth imitating lands near 190 and 300 words, not 290 and 375. */
    const ceiling = prompt.task === 'task1' ? 210 : 320;
    if (count > ceiling) short.push(`${model.promptId}: ${count} words, over the ${ceiling} a student can write in the time`);
  }
  assert.deepEqual(short, [], short.join('\n'));
});

test('every model carries the four examiner notes for its task', () => {
  const bad: string[] = [];
  for (const model of MODEL_ANSWERS) {
    const c = model.criteria;
    const first = model.task === 'task1' ? c.taskAchievement : c.taskResponse;
    if (!first) bad.push(`${model.promptId}: missing ${model.task === 'task1' ? 'Task Achievement' : 'Task Response'}`);
    if (model.task === 'task1' && c.taskResponse) bad.push(`${model.promptId}: Task 1 is marked on Task Achievement`);
    if (model.task === 'task2' && c.taskAchievement) bad.push(`${model.promptId}: Task 2 is marked on Task Response`);
    for (const [name, value] of [['coherence', c.coherence], ['lexical', c.lexical], ['grammar', c.grammar]] as const) {
      if (!value || value.trim().length < 40) bad.push(`${model.promptId}: ${name} note is missing or too short`);
    }
    if (model.highlights.length < 3) bad.push(`${model.promptId}: fewer than three highlighted phrases`);
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('no model contains an em dash or an en dash', () => {
  const dashed = MODEL_ANSWERS.filter((m) =>
    [m.text.join(' '), ...m.highlights.map((h) => `${h.phrase} ${h.note}`), ...Object.values(m.criteria)]
      .join(' ')
      .match(/[–—]/),
  ).map((m) => m.promptId);
  assert.deepEqual(dashed, [], `dashes in: ${dashed.join(', ')}`);
});
