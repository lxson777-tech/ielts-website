import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePlanRequest,
  buildInstruction,
  buildBackendInstruction,
  PlanRequestError,
  CLOSING_PHRASE,
  EXAMINER_NAME,
  LIVE_MODES,
  LIVE_PROVIDERS,
  type ResolvedPlan,
} from '../src/lib/speaking/live/instructions.ts';

// Real ids from src/data/speaking-prompts.ts, used instead of hardcoded fakes.
const TOPIC_A = 'p1-work';
const TOPIC_B = 'p1-home';
const TOPIC_SOLO = 'p1-music';
const CUE_FULL = 'p2-journey';
const CUE_PART2 = 'p2-influence';
const CUE_PART3 = 'p2-skill';

test('LIVE_MODES and LIVE_PROVIDERS list the expected values', () => {
  assert.deepEqual([...LIVE_MODES].sort(), ['full', 'part1', 'part2', 'part3']);
  assert.deepEqual([...LIVE_PROVIDERS].sort(), ['gemini', 'openai']);
});

test('resolvePlanRequest accepts a full plan with two real topics and a cue card', () => {
  const plan = resolvePlanRequest({ mode: 'full', part1TopicIds: [TOPIC_A, TOPIC_B], cueCardId: CUE_FULL });
  assert.equal(plan.mode, 'full');
  if (plan.mode !== 'full') throw new Error('unreachable');
  assert.equal(plan.part1Topics[0].id, TOPIC_A);
  assert.equal(plan.part1Topics[1].id, TOPIC_B);
  assert.equal(plan.cueCard.id, CUE_FULL);
});

test('resolvePlanRequest accepts a part1 plan with one real topic', () => {
  const plan = resolvePlanRequest({ mode: 'part1', part1TopicIds: [TOPIC_SOLO] });
  assert.equal(plan.mode, 'part1');
  if (plan.mode !== 'part1') throw new Error('unreachable');
  assert.equal(plan.part1Topic.id, TOPIC_SOLO);
});

test('resolvePlanRequest accepts a part2 plan with a real cue card', () => {
  const plan = resolvePlanRequest({ mode: 'part2', cueCardId: CUE_PART2 });
  assert.equal(plan.mode, 'part2');
  if (plan.mode !== 'part2') throw new Error('unreachable');
  assert.equal(plan.cueCard.id, CUE_PART2);
});

test('resolvePlanRequest accepts a part3 plan with a real cue card', () => {
  const plan = resolvePlanRequest({ mode: 'part3', cueCardId: CUE_PART3 });
  assert.equal(plan.mode, 'part3');
  if (plan.mode !== 'part3') throw new Error('unreachable');
  assert.equal(plan.cueCard.id, CUE_PART3);
});

test('resolvePlanRequest rejects a non-object input', () => {
  for (const bad of [null, undefined, 42, 'full', ['full']]) {
    assert.throws(() => resolvePlanRequest(bad), PlanRequestError);
  }
});

test('resolvePlanRequest rejects a bad mode', () => {
  assert.throws(() => resolvePlanRequest({ mode: 'chat' }), PlanRequestError);
  assert.throws(() => resolvePlanRequest({}), PlanRequestError);
});

test('resolvePlanRequest rejects the wrong count of topic ids', () => {
  assert.throws(
    () => resolvePlanRequest({ mode: 'full', part1TopicIds: [TOPIC_A], cueCardId: CUE_FULL }),
    PlanRequestError,
  );
  assert.throws(
    () => resolvePlanRequest({ mode: 'full', part1TopicIds: [TOPIC_A, TOPIC_B, TOPIC_SOLO], cueCardId: CUE_FULL }),
    PlanRequestError,
  );
  assert.throws(
    () => resolvePlanRequest({ mode: 'part1', part1TopicIds: [] }),
    PlanRequestError,
  );
  assert.throws(
    () => resolvePlanRequest({ mode: 'part1', part1TopicIds: [TOPIC_A, TOPIC_B] }),
    PlanRequestError,
  );
});

test('resolvePlanRequest rejects an unknown topic id', () => {
  assert.throws(
    () => resolvePlanRequest({ mode: 'part1', part1TopicIds: ['not-a-real-topic'] }),
    PlanRequestError,
  );
  assert.throws(
    () => resolvePlanRequest({ mode: 'full', part1TopicIds: ['not-a-real-topic', TOPIC_B], cueCardId: CUE_FULL }),
    PlanRequestError,
  );
});

test('resolvePlanRequest rejects an unknown cue id', () => {
  assert.throws(() => resolvePlanRequest({ mode: 'part2', cueCardId: 'not-a-real-cue' }), PlanRequestError);
  assert.throws(
    () => resolvePlanRequest({ mode: 'full', part1TopicIds: [TOPIC_A, TOPIC_B], cueCardId: 'not-a-real-cue' }),
    PlanRequestError,
  );
});

test('resolvePlanRequest rejects a missing cueCardId for full, part2 and part3', () => {
  assert.throws(
    () => resolvePlanRequest({ mode: 'full', part1TopicIds: [TOPIC_A, TOPIC_B] }),
    PlanRequestError,
  );
  assert.throws(() => resolvePlanRequest({ mode: 'part2' }), PlanRequestError);
  assert.throws(() => resolvePlanRequest({ mode: 'part3' }), PlanRequestError);
});

function fullPlan(): ResolvedPlan {
  return resolvePlanRequest({ mode: 'full', part1TopicIds: [TOPIC_A, TOPIC_B], cueCardId: CUE_FULL });
}

function part3Plan(): ResolvedPlan {
  return resolvePlanRequest({ mode: 'part3', cueCardId: CUE_PART3 });
}

const GPT_LIVE_POLICY_LABELS = ['Backchannel policy:', 'Interruption policy:', 'Delegation policy:'];

test('buildInstruction: openai variant carries the three GPT-Live policy labels, gemini does not', () => {
  const plan = fullPlan();
  const openaiInstruction = buildInstruction(plan, 'openai');
  const geminiInstruction = buildInstruction(plan, 'gemini');

  for (const label of GPT_LIVE_POLICY_LABELS) {
    assert.ok(openaiInstruction.includes(label), `expected openai instruction to include "${label}"`);
    assert.ok(!geminiInstruction.includes(label), `expected gemini instruction NOT to include "${label}"`);
  }
});

test('buildInstruction: both providers carry the examiner name, the DIRECTOR rule and the closing line', () => {
  const plan = fullPlan();
  for (const provider of LIVE_PROVIDERS) {
    const instruction = buildInstruction(plan, provider);
    assert.ok(instruction.includes(EXAMINER_NAME));
    assert.ok(instruction.includes('[DIRECTOR]'));
    assert.ok(
      instruction.toLowerCase().includes(CLOSING_PHRASE.toLowerCase()),
      `expected instruction to contain the closing phrase for provider ${provider}`,
    );
  }
});

test('buildInstruction: full test includes both topics\' questions and the cue card\'s bullets', () => {
  const plan = fullPlan();
  if (plan.mode !== 'full') throw new Error('unreachable');
  const instruction = buildInstruction(plan, 'gemini');

  for (const question of plan.part1Topics[0].questions) {
    assert.ok(instruction.includes(question.text), `missing topic A question: ${question.text}`);
  }
  for (const question of plan.part1Topics[1].questions) {
    assert.ok(instruction.includes(question.text), `missing topic B question: ${question.text}`);
  }
  for (const bullet of plan.cueCard.bullets) {
    assert.ok(instruction.includes(bullet), `missing cue card bullet: ${bullet}`);
  }
});

test('buildInstruction: part3 drill includes the part3 questions', () => {
  const plan = part3Plan();
  if (plan.mode !== 'part3') throw new Error('unreachable');
  const instruction = buildInstruction(plan, 'openai');

  for (const question of plan.cueCard.part3Questions) {
    assert.ok(instruction.includes(question.text), `missing part3 question: ${question.text}`);
  }
});

/* Official examiner behaviour: repeating is allowed everywhere, rephrasing only
   in Part 3. A regression here makes our practice test teach help the candidate
   will not get on test day. */
test('buildInstruction: rephrasing is offered in Part 3 only', () => {
  const part1 = buildInstruction(resolvePlanRequest({ mode: 'part1', part1TopicIds: [TOPIC_SOLO] }), 'openai');
  assert.ok(part1.includes('PART 1:'), 'part 1 drill should carry the Part 1 clarification rule');
  assert.ok(part1.includes('Never rephrase it'), 'part 1 drill must forbid rephrasing');
  assert.ok(!part1.includes('PART 3:'), 'part 1 drill should not carry the Part 3 rule');

  const part2 = buildInstruction(resolvePlanRequest({ mode: 'part2', cueCardId: CUE_PART2 }), 'openai');
  assert.ok(part2.includes('must NOT explain the cue card'), 'part 2 drill must forbid explaining the cue card');
  assert.ok(!part2.includes('MAY also rephrase'), 'part 2 drill must not allow rephrasing');

  const part3 = buildInstruction(part3Plan(), 'openai');
  assert.ok(part3.includes('MAY also rephrase'), 'part 3 drill should allow one rephrase');

  for (const provider of LIVE_PROVIDERS) {
    const full = buildInstruction(fullPlan(), provider);
    assert.ok(full.includes('REPEATING AND REPHRASING'), 'full test should carry the clarification block');
    for (const label of ['PART 1:', 'PART 2:', 'PART 3:']) {
      assert.ok(full.includes(label), `full test should state the rule for ${label}`);
    }
    assert.ok(full.includes('never give your own opinion'), 'full test should forbid examiner opinions');
  }
});

test('every instruction stays under 40,000 characters', () => {
  const plans: ResolvedPlan[] = [
    fullPlan(),
    resolvePlanRequest({ mode: 'part1', part1TopicIds: [TOPIC_SOLO] }),
    resolvePlanRequest({ mode: 'part2', cueCardId: CUE_PART2 }),
    part3Plan(),
  ];
  for (const plan of plans) {
    for (const provider of LIVE_PROVIDERS) {
      const instruction = buildInstruction(plan, provider);
      assert.ok(instruction.length < 40000, `instruction too long for ${plan.mode}/${provider}: ${instruction.length}`);
    }
  }
  const backend = buildBackendInstruction();
  assert.ok(backend.length < 40000);
  assert.ok(backend.length > 0);
});
