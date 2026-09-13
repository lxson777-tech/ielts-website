import test from 'node:test';
import assert from 'node:assert/strict';
import { isCorrect, scoredQuestionIds } from '../src/lib/tests/schema.ts';
import type { PracticeTest, Question } from '../src/lib/tests/schema.ts';

const load = async (n: number): Promise<PracticeTest> =>
  (await import(`../src/data/tests/reading-full-${String(n).padStart(3, '0')}.ts`)).default;

const find = (t: PracticeTest, id: string): Question => {
  for (const p of t.parts) for (const g of p.groups) for (const q of g.questions) if (q.id === id) return q;
  throw new Error(`missing ${id}`);
};

const cases: [number, string, string[], string[]][] = [
  [9, 'q36', ['Sentences', 'sentences'], ['Entences']],
  [10, 'q6', ['True', 'true'], ['Treu']],
  [9, 'q12', ['standardised', 'Standardized'], ['standard']],
  [10, 'q22', ['reinsertion', 'Reinserted'], ['reinsert']],
  [10, 'q37', ['changeable', 'changing'], ['fixed']],
  [10, 'q40', ['style', 'learning style'], ['learner']],
  [9, 'q24', ['charging stations'], ['parking']],
  [10, 'q5', ['False', 'false'], ['Not given', 'True']],
  [16, 'q29', ['False'], ['Not given', 'True']],
  [11, 'q6', ['Not given', 'not given'], ['True', 'False']],
  [12, 'q20', ['D'], ['C']],
  [15, 'q37', ['fingerprinting', 'new-found', 'New-found'], ['fingerprint']],
  [4, 'q4', ['journals', 'Journal'], ['diary']],
  [7, 'q3', ['hairs', 'Hair'], ['skin']],
  [19, 'q30', ['organised', 'Organized'], ['arranged']],
];

for (const [n, id, accept, reject] of cases) {
  test(`Academic Reading Test ${n}, question ${id}: the corrected key scores`, async () => {
    const q = find(await load(n), id);
    for (const value of accept) assert.equal(isCorrect(q, value), true, `${value} should score`);
    for (const value of reject) assert.equal(isCorrect(q, value), false, `${value} should not score`);
  });
}

test('every reading question still has at least one usable answer, and a full key scores 40/40', async () => {
  for (let n = 1; n <= 20; n += 1) {
    const t = await load(n);
    const questions = t.parts.flatMap((p) => p.groups.flatMap((g) => g.questions));
    assert.equal(questions.length, 40);
    const answers: Record<string, string> = {};
    const usedInPair = new Map<string, number>();
    for (const q of questions) {
      const accepted = Array.isArray(q.answer) ? q.answer : [q.answer];
      // Paired questions share one pool and each slot must take a different
      // member of it, so walk the pool rather than repeating its first entry.
      const slot = q.answerPairId ? (usedInPair.get(q.answerPairId) ?? 0) : 0;
      if (q.answerPairId) usedInPair.set(q.answerPairId, slot + 1);
      const value = accepted[slot] ?? accepted[0];
      assert.ok(value && value.trim().length > 0, `test ${n} ${q.id} has no answer`);
      answers[q.id] = value;
    }
    assert.equal(scoredQuestionIds(questions, answers).size, 40, `test ${n} does not score 40/40 on its own key`);
    assert.equal(scoredQuestionIds(questions, {}).size, 0, `test ${n} scores marks for a blank paper`);
  }
});

test('every option list covers the letters its instruction promises', async () => {
  for (let n = 1; n <= 20; n += 1) {
    const t = await load(n);
    for (const part of t.parts) for (const g of part.groups) {
      if (!g.options || !g.options.every((o) => /^[A-K]$/.test(o))) continue;
      const text = `${g.legendHtml ?? ''} ${g.instructionHtml ?? ''}`.replace(/<[^>]+>/g, ' ');
      const ranges = [...text.matchAll(/\b([A-K])\s*[-\u2013\u2014]\s*([A-K])\b/g)].map((m) => m[2]);
      const answers = g.questions.flatMap((q) => (Array.isArray(q.answer) ? q.answer : [q.answer]))
        .filter((a) => /^[A-K]$/.test(a));
      const needed = [...ranges, ...answers].sort().at(-1);
      if (!needed) continue;
      assert.ok(g.options.at(-1)! >= needed,
        `test ${n} ${g.title}: options end at ${g.options.at(-1)} but ${needed} is needed`);
    }
  }
});
