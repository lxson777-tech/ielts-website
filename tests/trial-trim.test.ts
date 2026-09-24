/* What a trial build keeps out of the browser beyond the swapped modules
 * (Alex, 24 September 2026: lock the remaining study material):
 *   - the public learning index loses exercise objectives, cue-card headlines
 *     and Writing question titles (src/lib/trial/trim-index.ts);
 *   - the Russian dictionaries lose every translation of a locked sentence,
 *     and keep the interface (src/lib/trial/trim-dictionary.ts).
 * The build itself is checked by tools/trial-content-audit.mjs. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import index from '../src/data/generated/learning-index.json' with { type: 'json' };
import { trialLearningIndex } from '../src/lib/trial/trim-index.ts';
import { lockedSentences, stripLockedEntries, trialRussianDictionary } from '../src/lib/trial/trim-dictionary.ts';
import { TRIAL_WRITING } from '../src/lib/trial/offer.ts';
import { strings as RU } from '../src/lib/i18n/dict/ru/index.ts';

type Entry = Record<string, unknown>;

test('the trial index keeps ids and counts but no objectives, cue-card questions or other Writing titles', () => {
  const trimmed = trialLearningIndex(index) as unknown as Record<string, Entry[]>;
  const original = index as unknown as Record<string, Entry[]>;
  assert.equal(trimmed.focusedExercises.length, original.focusedExercises.length, 'every exercise is still listed');
  assert.ok(trimmed.focusedExercises.every((e) => !('objective' in e)));
  assert.ok(original.focusedExercises.some((e) => 'objective' in e), 'the open index still has them');
  for (const card of trimmed.speakingPrompts.filter((p) => p.part === 2)) assert.equal(card.topic, 'Part 2 cue card');
  const part1 = trimmed.speakingPrompts.find((p) => p.part === 1)!;
  assert.equal(part1.topic, original.speakingPrompts.find((p) => p.id === part1.id)!.topic, 'Part 1 topic names stay');
  for (const prompt of trimmed.writingPrompts) {
    const before = original.writingPrompts.find((p) => p.id === prompt.id)!;
    if (prompt.id === TRIAL_WRITING.essayPromptId || prompt.id === TRIAL_WRITING.examplePromptId) assert.equal(prompt.title, before.title);
    else assert.match(String(prompt.title), /^Task [12] question$/);
  }
  assert.deepEqual(trimmed.tests, original.tests, 'papers are listed as before');
  assert.ok((original.focusedExercises[0] as Entry).objective, 'the original is not changed');
});

test('the trial Russian dictionary drops translations of locked sentences and keeps the interface', () => {
  const { strings, removed } = trialRussianDictionary();
  const locked = lockedSentences();
  assert.ok(removed > 100, `removed ${removed}`);
  assert.ok(Object.keys(strings).every((english) => !locked.has(english)));
  const objective = 'Match a heading to a paragraph by what the whole paragraph is about, not by a word it repeats.';
  assert.ok(objective in RU && !(objective in strings), 'an exercise objective is gone');
  for (const ui of ['Start the Speaking test', 'Your trial Speaking test', 'Full guide: band {from} to {to}']) {
    assert.equal(strings[ui], RU[ui], `${ui} keeps its translation`);
  }
  assert.ok([...locked].every((s) => s.length >= 40), 'only whole sentences count as material');
});

test('the study plan’s own Russian loses its locked entries and nothing else', () => {
  const source = readFileSync(new URL('../src/lib/learning/ru.ts', import.meta.url), 'utf8');
  const { code, removed } = stripLockedEntries(source);
  assert.ok(removed > 0, 'something was cut');
  assert.ok(!code.includes("'Match a heading to a paragraph by what the whole paragraph is about, not by a word it repeats.'"));
  assert.ok(code.includes('export function learningText('), 'the functions stay');
  assert.equal(code.split('export const RU_STRINGS').length, 2);
});
