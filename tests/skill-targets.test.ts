/* Per-paper minimums on the study plan. A university usually asks for an
   overall band AND a floor in every paper, so the plan carries an optional
   minimum per paper that falls back to the overall target. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitiseSkillTargets,
  skillTargetFor,
  PLAN_SKILLS,
  SKILL_TARGET_BANDS,
  type SavedPlan,
} from '../src/lib/study-plan.ts';

function planWith(skillTargets?: SavedPlan['skillTargets']): SavedPlan {
  return { targetBand: '7.0', testDate: '', createdAt: '2026-09-16T00:00:00.000Z', done: [], skillTargets };
}

test('a paper with no minimum of its own falls back to the overall target', () => {
  const plan = planWith({ writing: '6.0' });
  assert.equal(skillTargetFor(plan, 'writing'), '6.0');
  assert.equal(skillTargetFor(plan, 'reading'), '7.0');
  assert.equal(skillTargetFor(plan, 'listening'), '7.0');
  assert.equal(skillTargetFor(plan, 'speaking'), '7.0');
});

test('no plan means no target rather than a guess', () => {
  assert.equal(skillTargetFor(null, 'reading'), null);
});

test('sanitiseSkillTargets keeps only the four papers and the bands we offer', () => {
  const cleaned = sanitiseSkillTargets({
    reading: '6.5',
    writing: '',
    speaking: '6.25',
    listening: 7,
    vocabulary: '7.0',
    overall: '8.0',
  });
  assert.deepEqual(cleaned, { reading: '6.5' });
});

test('sanitiseSkillTargets returns undefined when nothing survives', () => {
  for (const value of [null, undefined, 'reading', 42, [], {}, { reading: '6.25' }, { vocabulary: '7.0' }]) {
    assert.equal(sanitiseSkillTargets(value), undefined, `expected undefined for ${JSON.stringify(value)}`);
  }
});

test('every offered band survives sanitising, for every paper', () => {
  for (const skill of PLAN_SKILLS) {
    for (const band of SKILL_TARGET_BANDS) {
      assert.deepEqual(sanitiseSkillTargets({ [skill]: band }), { [skill]: band });
    }
  }
});
