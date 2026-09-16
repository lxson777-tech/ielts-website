/* Data faults in the imported reading tests that a student meets head on:
   an option list that does not contain the right answer (the question cannot
   be answered at all), the same gapped text printed twice (once in the
   group's legend and once beside the input, where the importer scrambled it),
   and an option or word list glued onto the end of a question.

   All three were found in the published import and fixed in 2026-09
   (tools/clean_question_text.py). This test stops them coming back with the
   next import. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TESTS } from '../src/data/tests/index.ts';
import type { PracticeTest, QuestionGroup } from '../src/lib/tests/schema.ts';

const READING: PracticeTest[] = ALL_TESTS.filter((t) => t.skill === 'reading');

function groups(t: PracticeTest): { group: QuestionGroup; part: string }[] {
  return t.parts.flatMap((p) => p.groups.map((group) => ({ group, part: p.label })));
}

test('the reading bank is present', () => {
  assert.ok(READING.length >= 40, `expected 40 reading tests, found ${READING.length}`);
});

test('every keyed letter answer appears in its own option list', () => {
  const missing: string[] = [];
  for (const t of READING) {
    for (const { group } of groups(t)) {
      const options = group.options;
      if (!options || options.length === 0) continue;
      const letters = new Set(options.map((o) => o.trim().toLowerCase()));
      for (const q of group.questions) {
        const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
        for (const a of answers) {
          if (typeof a !== 'string') continue;
          const value = a.trim();
          // Only single letters and roman numerals are chosen from a list.
          if (!/^([A-Za-z]|[ivxIVX]{1,4})$/.test(value)) continue;
          if (!letters.has(value.toLowerCase())) missing.push(`${t.id} ${q.id}: "${value}" is not among ${options.join(', ')}`);
        }
      }
    }
  }
  assert.deepEqual(missing, [], `a student cannot pick the right answer here:\n${missing.join('\n')}`);
});

test('a gapped question is not printed twice, once in the legend and once beside the input', () => {
  const doubled: string[] = [];
  for (const t of READING) {
    for (const { group } of groups(t)) {
      const legend = group.legendHtml ?? '';
      if (!legend) continue;
      for (const q of group.questions) {
        const number = /\d+/.exec(q.id)?.[0];
        if (!number || !legend.includes(`(${number})`)) continue;
        const beside = `${q.before ?? ''} ${q.after ?? ''}`.trim();
        if (beside) doubled.push(`${t.id} ${q.id}`);
      }
    }
  }
  assert.deepEqual(doubled, [], `these questions repeat their own legend text:\n${doubled.join('\n')}`);
});

test('no option or word list is glued onto a question', () => {
  const glued: string[] = [];
  const tail = /\bLists? of [A-Z][A-Za-z ]{2,30}\b/;
  for (const t of READING) {
    for (const { group } of groups(t)) {
      for (const q of group.questions) {
        for (const field of [q.textHtml, q.before, q.after]) {
          if (typeof field === 'string' && tail.test(field)) glued.push(`${t.id} ${q.id}`);
        }
      }
    }
  }
  assert.deepEqual([...new Set(glued)], [], `a list is stuck to these questions:\n${glued.join('\n')}`);
});

/* The 40/40 check in reading-answer-key.test.ts only walks tests 1 to 20.
   Tests 21 to 40 were edited in 2026-09 (explanations, accepted variants,
   three corrected keys), so hold the whole bank to the same bar. */
test('every reading test scores 40 out of 40 on its own key, and 0 on a blank paper', async () => {
  const { scoredQuestionIds } = await import('../src/lib/tests/schema.ts');
  for (const t of READING) {
    const questions = t.parts.flatMap((p) => p.groups.flatMap((g) => g.questions));
    assert.equal(questions.length, 40, `${t.id} does not have 40 questions`);
    const answers: Record<string, string> = {};
    const usedInPair = new Map<string, number>();
    for (const q of questions) {
      const accepted = Array.isArray(q.answer) ? q.answer : [q.answer];
      // Paired questions share one pool, so each slot takes a different member.
      const slot = q.answerPairId ? usedInPair.get(q.answerPairId) ?? 0 : 0;
      if (q.answerPairId) usedInPair.set(q.answerPairId, slot + 1);
      const value = accepted[slot] ?? accepted[0];
      assert.ok(value && value.trim().length > 0, `${t.id} ${q.id} has no answer`);
      answers[q.id] = value;
    }
    assert.equal(scoredQuestionIds(questions, answers).size, 40, `${t.id} does not score 40/40 on its own key`);
    assert.equal(scoredQuestionIds(questions, {}).size, 0, `${t.id} scores marks for a blank paper`);
  }
});
