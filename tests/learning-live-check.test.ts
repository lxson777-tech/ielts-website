/* tools/mr-ez-learning-live-check.mjs's pure parts: the scenario list, the
   cost estimate, and the refusal-to-start logic. This file never spends
   money and never calls OpenAI: it imports only the script's exported pure
   functions and data, and every test that touches main() either supplies no
   approval flag (so the script's own dry-run path runs, which makes no
   network call by construction) or stubs global.fetch and asserts it is
   never reached, so a bug that accidentally removed that guard would fail
   this file loudly instead of spending real money the next time someone ran
   the script for real.

   Run this file on its own with:
     node --import ./tests/ts-extension-loader.mjs --test tests/learning-live-check.test.ts
*/

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCENARIOS,
  estimateCost,
  parseApproval,
  isOpenAiKeyConfigured,
  main,
  MAX_USD,
} from '../tools/mr-ez-learning-live-check.mjs';

/* ══ 1. Twelve scenarios, matching the README's numbering ═══════════════ */

test('there are exactly twelve scenarios', () => {
  assert.equal(SCENARIOS.length, 12);
});

test('the scenarios are numbered 1 to 12 with no gap and no repeat', () => {
  const numbers = SCENARIOS.map((s) => s.number).sort((a, b) => a - b);
  assert.deepEqual(numbers, Array.from({ length: 12 }, (_, i) => i + 1));
});

test('every scenario has a unique id, a task and a reason it exists', () => {
  const ids = new Set();
  for (const scenario of SCENARIOS) {
    assert.equal(typeof scenario.id, 'string');
    assert.equal(ids.has(scenario.id), false, `duplicate id ${scenario.id}`);
    ids.add(scenario.id);
    assert.ok(['lesson-help', 'evaluate-practice', 'propose-next'].includes(scenario.task), `unexpected task ${scenario.task}`);
    assert.ok(scenario.why && scenario.why.length > 10, `scenario ${scenario.number} needs a real "why"`);
  }
});

test('the task split matches the README proposal: seven lesson-help (six billable plus the free exam boundary), three evaluate-practice, two propose-next', () => {
  // The README's own cost table lists "lesson-help" and "Exam boundary" as
  // separate rows (6 and 1) because the exam-boundary call is free, but the
  // exam-boundary scenario IS a lesson-help request on the wire (task:
  // 'lesson-help', refused before anything is fetched or spent) -- see
  // scenario #7's own `task` field. So by the real wire-protocol task name
  // this is 7 lesson-help + 3 evaluate-practice + 2 propose-next = 12, with
  // exactly one of the seven (#7) carrying mustRefuse: true and zero cost.
  const counts = { 'lesson-help': 0, 'evaluate-practice': 0, 'propose-next': 0 };
  for (const scenario of SCENARIOS) counts[scenario.task] += 1;
  assert.deepEqual(counts, { 'lesson-help': 7, 'evaluate-practice': 3, 'propose-next': 2 });
});

test('the five scenarios the README names as must-never-regress are present by number', () => {
  // 5 injection (English), 6 injection (Russian), 7 exam boundary, 10 band
  // bait, 12 stale plan revision.
  const byNumber = new Map(SCENARIOS.map((s) => [s.number, s]));
  assert.match(byNumber.get(5).id, /injection/);
  assert.match(byNumber.get(6).id, /injection/);
  assert.match(byNumber.get(7).id, /exam/);
  assert.match(byNumber.get(10).id, /band/);
  assert.match(byNumber.get(12).id, /stale/);
});

/* ══ 2. Every scenario declares whether the reply must be refused ═══════ */

test('every scenario declares mustRefuse, and only the exam boundary is true', () => {
  for (const scenario of SCENARIOS) {
    assert.equal(typeof scenario.mustRefuse, 'boolean', `scenario ${scenario.number} has no mustRefuse`);
  }
  const refused = SCENARIOS.filter((s) => s.mustRefuse).map((s) => s.number);
  assert.deepEqual(refused, [7], 'only the exam-boundary scenario is a hard HTTP refusal; everything else gets a 200 with its own guardrails inside the reply');
});

/* ══ 3. Running without approval makes zero network calls ═══════════════ */

test('parseApproval refuses when the flag is missing, even with a key configured', () => {
  const approval = parseApproval([], { OPENAI_API_KEY: 'sk-not-a-real-key-but-twenty-plus-chars' });
  assert.equal(approval.approved, false);
  assert.match(approval.reason, /flag/);
});

test('parseApproval refuses when the key is missing, even with the flag given', () => {
  const approval = parseApproval(['--i-approve-spend'], {});
  assert.equal(approval.approved, false);
  assert.match(approval.reason, /OPENAI_API_KEY/);
});

test('parseApproval approves only when both the flag and a key are present', () => {
  const approval = parseApproval(['--i-approve-spend'], { OPENAI_API_KEY: 'sk-not-a-real-key-but-twenty-plus-chars' });
  assert.equal(approval.approved, true);
});

test('isOpenAiKeyConfigured never returns the key value, only whether one is set', () => {
  const result = isOpenAiKeyConfigured({ OPENAI_API_KEY: 'sk-not-a-real-key-but-twenty-plus-chars' });
  assert.equal(result.configured, true);
  assert.equal(JSON.stringify(result).includes('sk-not-a-real-key'), false, 'the value must never appear in the returned object');
});

test('main() without the approval flag makes zero fetch calls, whether or not a key is configured', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (...args) => {
    calls += 1;
    throw new Error(`fetch must not be called during a dry run, but was called with ${JSON.stringify(args[0])}`);
  };
  try {
    const withoutKey = await main({ argv: [], env: {} });
    assert.equal(withoutKey.ran, false);
    assert.equal(calls, 0);

    const withKeyButNoFlag = await main({ argv: [], env: { OPENAI_API_KEY: 'sk-not-a-real-key-but-twenty-plus-chars' } });
    assert.equal(withKeyButNoFlag.ran, false);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('main() with the flag but no key still makes zero fetch calls', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error('fetch must not be called with no key configured');
  };
  try {
    const result = await main({ argv: ['--i-approve-spend'], env: {} });
    assert.equal(result.ran, false);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* ══ 4. The script never logs a value from process.env ═══════════════════ */

test('a dry run never prints the configured key, whatever it is', async () => {
  const FAKE_KEY = 'sk-FAKE-VALUE-THAT-MUST-NEVER-BE-LOGGED-abcdef123456';
  const originalLog = console.log;
  const originalError = console.error;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  console.error = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  try {
    await main({ argv: [], env: { OPENAI_API_KEY: FAKE_KEY } });
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  const printed = lines.join('\n');
  assert.equal(printed.includes(FAKE_KEY), false, 'the fake key value leaked into console output');
});

/* ══ 5. The cost estimate ═════════════════════════════════════════════════ */

test('estimateCost returns one entry per scenario, and a positive total under one US dollar', () => {
  const { perScenario, totalUsd } = estimateCost();
  assert.equal(perScenario.length, 12);
  assert.ok(totalUsd > 0, `expected a positive total, got ${totalUsd}`);
  assert.ok(totalUsd < 1, `expected the total to be well under $1, got ${totalUsd}`);
  // The figure itself, for anyone reading test output: this is the number
  // that belongs in docs/personal-learning/LIVE-AI-CHECK.md's cost table.
  console.log(`estimateCost() total: $${totalUsd.toFixed(6)} across ${perScenario.length} scenarios`);
});

test('the exam-boundary scenario (#7) is free in the estimate; every other scenario costs something', () => {
  const { perScenario } = estimateCost();
  const free = perScenario.find((e) => e.number === 7);
  assert.equal(free.usd, 0);
  for (const entry of perScenario) {
    if (entry.number === 7) continue;
    assert.ok(entry.usd > 0, `scenario #${entry.number} (${entry.id}) should cost something in the estimate`);
  }
});

test('the estimate stays comfortably inside the spend guard', () => {
  const { totalUsd } = estimateCost();
  assert.ok(totalUsd < MAX_USD, `estimate $${totalUsd} should be well under the guard $${MAX_USD}`);
});
