/* Mr EZ's free tries (Alex, 10 October 2026): the REAL Worker handler
 * (workers/mr-ez/src/index.ts, ACCESS_MODE=trial) against the REAL database
 * functions (every migration a project runs today, ending with
 * supabase/migrations/2026-10-10-free-taster.sql, in PGlite), with the
 * harness's fake OpenAI. No key, no model, no money.
 *
 * What is proved: a free account may ask Mr EZ ten times in its life (chat
 * and the lesson help buttons), the eleventh is refused 402 taster-used
 * BEFORE the model is called; a retry or replay of the same request is never
 * charged twice; a failed answer gives its try back; paid accounts take no
 * try; every task that is not a question stays paid; a database that cannot
 * be asked fails closed. The essay and Speaking graders' side of the same
 * rule is in tests/trial-graders.test.ts and tests/paid-gates.test.ts.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/free-taster-worker.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../workers/mr-ez/src/index.ts';
import { createTrialDb } from '../tools/trial-db.mjs';
import type { PublishedLessonBlocks } from '../src/lib/learning/lesson-blocks.ts';
import {
  GOOD_TOKEN,
  USER_A,
  baseEnv,
  emptyProgress,
  makeDeps,
  makeState,
  post,
  type FakeState,
  type Recorder,
} from './mr-ez-harness.ts';

const COMMERCIAL = { ACCESS_MODE: 'trial' };

const LESSON: PublishedLessonBlocks = {
  slug: 'reading-tfng',
  version: 1,
  blocks: [
    {
      id: 'b1-bbbbbbbb',
      index: 0,
      heading: 'Key Distinctions',
      text: 'Key Distinctions. NOT GIVEN means the passage is silent about the statement, not that the statement is wrong.',
      chars: 110,
    },
  ],
};

function jsonReply(payload: unknown) {
  return {
    status: 'completed',
    output: [{ type: 'reasoning' }, { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(payload) }] }],
    usage: { input_tokens: 900, input_tokens_details: { cached_tokens: 0 }, output_tokens: 120 },
  };
}

async function world() {
  const db = await createTrialDb();
  await db.addUser(USER_A, 'free-a@example.test');
  await db.addProfile(USER_A);
  const state = makeState({ trialDb: db, lessonBlocks: { 'reading-tfng': LESSON } });
  state.userState[USER_A] = { progress: emptyProgress(), study_plan: null };
  return { db, state };
}

async function run(state: FakeState, body: Record<string, unknown>, env: Record<string, unknown> = COMMERCIAL) {
  const recorder: Recorder = { openAiCalls: [], urls: [] };
  const handle = createHandler(makeDeps(state, recorder));
  const response = await handle(post(body, GOOD_TOKEN), baseEnv(env));
  const payload = (await response.clone().json()) as Record<string, unknown>;
  return { response, payload, recorder };
}

let n = 0;
const key = () => `taster-key-${String(++n).padStart(4, '0')}`;
const chat = (idempotencyKey = key()) => ({ task: 'chat', message: 'Can you give me an example?', idempotencyKey });
const help = (idempotencyKey = key(), overrides: Record<string, unknown> = {}) => ({
  task: 'lesson-help',
  kind: 'hint',
  lessonKey: 'reading-tfng',
  blockId: 'b1-bbbbbbbb',
  previousHints: [],
  assistanceSoFar: 'none',
  versions: { planRevision: 0, evidenceVersion: 0, indexVersion: 'x' },
  idempotencyKey,
  ...overrides,
});

const tried = async (db: Awaited<ReturnType<typeof createTrialDb>>) =>
  ((await db.select("select count(*)::int as n from public.tutor_taster_uses where user_id = $1 and status = 'reserved'", [USER_A], { role: 'service_role' }))[0] as { n: number }).n;

test('a free account asks Mr EZ ten times; the eleventh is 402 taster-used before any model call', async () => {
  const { db, state } = await world();
  for (let i = 1; i <= 10; i++) {
    const { response, payload, recorder } = await run(state, chat());
    assert.equal(response.status, 200, `try ${i}: ${JSON.stringify(payload).slice(0, 160)}`);
    assert.ok(recorder.openAiCalls.length >= 1);
  }
  assert.equal(await tried(db), 10);

  const over = await run(state, chat());
  assert.equal(over.response.status, 402);
  assert.deepEqual(over.payload, {
    error: 'You have used your free questions to Mr EZ.',
    code: 'taster-used',
    reason: 'taster-used',
    kind: 'tutor',
    used: 10,
    limit: 10,
  });
  assert.equal(over.recorder.openAiCalls.length, 0, 'no model call');
  assert.equal(over.recorder.urls.some((u) => u.includes('api.openai.com')), false, 'no provider contacted at all');
  assert.equal(await tried(db), 10);
  await db.close();
});

test('lesson help is one of the ten as well, and shares the count with chat', async () => {
  const { db, state } = await world();
  state.openAi = { body: jsonReply({ text: 'Look at what the passage is silent about.', revealedAnswer: false }) };
  const helped = await run(state, help());
  assert.equal(helped.response.status, 200, JSON.stringify(helped.payload).slice(0, 200));
  assert.equal(await tried(db), 1);
  assert.equal(helped.recorder.openAiCalls.length, 1);
  state.openAi = undefined;
  for (let i = 0; i < 9; i++) assert.equal((await run(state, chat())).response.status, 200);
  const over = await run(state, help(key(), { kind: 'example' }));
  assert.deepEqual([over.response.status, over.payload.code], [402, 'taster-used']);
  assert.equal(over.recorder.openAiCalls.length, 0);
  await db.close();
});

test('a retry of the same request is never charged twice', async () => {
  const { db, state } = await world();
  const body = chat('retry-key-0001');
  const first = await run(state, body);
  assert.equal(first.response.status, 200);
  const replay = await run(state, body);
  assert.equal(replay.response.status, 200);
  assert.equal(replay.payload.cached, true, 'the stored answer, for free');
  assert.equal(replay.recorder.openAiCalls.length, 0);
  assert.equal(await tried(db), 1, 'one try, not two');
  // Even when the ten are used, replaying an answered request still works.
  for (let i = 0; i < 9; i++) await run(state, chat());
  assert.equal((await run(state, chat())).response.status, 402);
  const late = await run(state, body);
  assert.deepEqual([late.response.status, late.payload.cached], [200, true]);
  assert.equal(await tried(db), 10);
  await db.close();
});

test('an answer that was not delivered gives its try back', async () => {
  const { db, state } = await world();
  state.openAi = { status: 500 };
  const failed = await run(state, chat('failing-key-0001'));
  assert.ok(failed.response.status >= 500, `answered ${failed.response.status}`);
  assert.equal(await tried(db), 0, 'a failed answer costs nothing');
  state.openAi = undefined;
  const again = await run(state, chat('failing-key-0001'));
  assert.equal(again.response.status, 200);
  assert.equal(await tried(db), 1);

  // A lesson help that is refused before the model (the block moved) costs nothing either.
  const gone = await run(state, help(key(), { blockId: 'b9-dddddddd' }));
  assert.equal(gone.response.status, 404);
  assert.equal(await tried(db), 1);
  await db.close();
});

test('only questions take a try: every other task is still 402 paid-required and reserves nothing', async () => {
  const { db, state } = await world();
  for (const body of [
    { task: 'welcome', idempotencyKey: key() },
    { task: 'weekly', idempotencyKey: key() },
    { task: 'debrief', idempotencyKey: key(), review: { testId: 'reading-full-001', items: [{ questionId: 'q1', given: 'TRUE' }] } },
    { task: 'evaluate-practice', idempotencyKey: key(), activityId: 'focus:x', contentVersion: 1, subskill: 'tfng', itemIds: [], submission: 'x', versions: { planRevision: 0, evidenceVersion: 0, indexVersion: 'x' } },
  ]) {
    const { response, payload, recorder } = await run(state, body);
    assert.equal(response.status, 402, JSON.stringify(body));
    assert.deepEqual([payload.code, payload.reason], ['paid-required', 'paid-required']);
    assert.equal(recorder.openAiCalls.length, 0);
    assert.equal(recorder.urls.some((u) => u.includes('/rpc/tutor_taster_reserve')), false, 'no try reserved');
  }
  assert.equal(await tried(db), 0);
  await db.close();
});

test('paid access is unchanged: no try is reserved, and a paid-ended account gets its ten again', async () => {
  const { db, state } = await world();
  const order = (await db.rpc('access_order_create', { p_plan: 'month-1' }, { userId: USER_A })) as { orderId: string; amount: number; currency: string };
  await db.rpc('access_order_paid', { p_order: order.orderId, p_provider: 'simulated', p_ref: `sim_${order.orderId.replace(/-/g, '')}`, p_amount: order.amount, p_currency: order.currency }, { role: 'service_role' });
  const paid = await run(state, chat());
  assert.equal(paid.response.status, 200);
  assert.equal(paid.recorder.urls.some((u) => u.includes('/rpc/tutor_taster_')), false);
  assert.equal(await tried(db), 0);

  await db.expirePaid(USER_A);
  const ended = await run(state, chat());
  assert.equal(ended.response.status, 200);
  assert.equal(await tried(db), 1);
  await db.close();
});

test('the open site (no ACCESS_MODE) never asks for a try', async () => {
  const { db, state } = await world();
  const { response, recorder } = await run(state, chat(), {});
  assert.equal(response.status, 200);
  assert.equal(recorder.urls.some((u) => u.includes('/rpc/')), false);
  await db.close();
});

test('a database that cannot be asked is a refusal, never a free answer', async () => {
  const { db, state } = await world();
  state.trialDbDown = true;
  const { response, recorder } = await run(state, chat());
  assert.equal(response.status, 503);
  assert.equal(recorder.openAiCalls.length, 0);
  await db.close();
});

test('only the reservation failing is also a refusal: no answer without a try on the books', async () => {
  const { db, state } = await world();
  // access_paid_now works, tutor_taster_reserve does not.
  const inner = state.trialDb!;
  state.trialDb = {
    rpc: async (fn, args, opts) => {
      if (fn === 'tutor_taster_reserve') throw Object.assign(new Error('boom'), { status: 500 });
      return inner.rpc(fn, args, opts);
    },
  };
  const { response, recorder } = await run(state, chat());
  assert.equal(response.status, 503);
  assert.equal(recorder.openAiCalls.length, 0);
  await db.close();
});
