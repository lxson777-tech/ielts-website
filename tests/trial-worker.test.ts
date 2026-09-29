/* Mr EZ's Worker running the trial: the REAL handler
 * (workers/mr-ez/src/index.ts) against the REAL trial database functions
 * (supabase/migrations/2026-09-23-trial.sql in PGlite, tools/trial-db.mjs),
 * with the harness's fake OpenAI. No key, no model, no money.
 *
 * What is proved:
 *   - the open site (no ACCESS_MODE) behaves exactly as before and never
 *     asks the trial tables anything;
 *   - with ACCESS_MODE=trial a request is charged to a section worked out
 *     from WHAT IT IS ABOUT (a trial lesson or test), never from a label,
 *     and anything else is refused before any money is spent;
 *   - five answered requests per section, then refused, with no model call;
 *   - a failed model call is not counted, and its retry with the same key is
 *     counted once;
 *   - a repeated key after success is served the stored answer for free;
 *   - no trial, an ended trial and an unreachable trial database all refuse
 *     before the model is called (fail closed);
 *   - one student's allowance is never another's.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../workers/mr-ez/src/index.ts';
import { createTrialDb } from '../tools/trial-db.mjs';
import { tutorScope } from '../src/lib/trial/gate.ts';
import { parseTrialStatus } from '../src/lib/trial/status.ts';
import {
  GOOD_TOKEN,
  OTHER_TOKEN,
  USER_A,
  USER_B,
  baseEnv,
  makeDeps,
  makeState,
  post,
  type FakeState,
  type Recorder,
} from './mr-ez-harness.ts';

const TRIAL = { ACCESS_MODE: 'trial' };

async function trialWorld(opts: { startA?: boolean; startB?: boolean } = { startA: true }) {
  const db = await createTrialDb();
  await db.addUser(USER_A);
  await db.addUser(USER_B);
  if (opts.startA) await db.rpc('trial_start', {}, { userId: USER_A });
  if (opts.startB) await db.rpc('trial_start', {}, { userId: USER_B });
  const state = makeState({ trialDb: db });
  return { db, state };
}

async function run(state: FakeState, body: Record<string, unknown>, env: Record<string, unknown> = TRIAL, token = GOOD_TOKEN) {
  const recorder: Recorder = { openAiCalls: [], urls: [] };
  const handle = createHandler(makeDeps(state, recorder));
  const response = await handle(post(body, token), baseEnv(env));
  const payload = (await response.clone().json()) as Record<string, unknown>;
  return { response, payload, recorder };
}

let keyCounter = 0;
function chat(place: Record<string, unknown> | undefined, key = `trial-key-${String(++keyCounter).padStart(4, '0')}`) {
  return { task: 'chat', message: 'Can you give me an example?', idempotencyKey: key, ...(place ? { place } : {}) };
}

const READING_LESSON = { lessonKey: 'reading-paraphrase' };

async function status(db: Awaited<ReturnType<typeof createTrialDb>>, user = USER_A) {
  return parseTrialStatus(await db.rpc('trial_status', {}, { userId: user }))!;
}

/* ── Which section a request belongs to ─────────────────────────────── */

test('the section comes from what a request is about, and only trial content has one', () => {
  assert.deepEqual(tutorScope({ task: 'chat', place: { lessonKey: 'reading-paraphrase' } }), {
    section: 'reading',
    activityId: 'lesson:reading-paraphrase',
  });
  assert.deepEqual(tutorScope({ task: 'chat', place: { testId: 'writing-checker' } }), {
    section: 'writing',
    activityId: 'test:writing-checker',
  });
  assert.equal(tutorScope({ task: 'chat', place: { lessonKey: 'reading-tfng' } }), null, 'a lesson outside the trial');
  assert.equal(tutorScope({ task: 'chat', place: { testId: 'reading-full-002' } }), null, 'a test outside the trial');
  assert.equal(tutorScope({ task: 'chat', place: { testId: 'reading-full-001-drill-p2' } }), null, 'a drill is not the test');
  assert.equal(tutorScope({ task: 'chat' }), null, 'general chat is not a fifth bucket');
  assert.deepEqual(tutorScope({ task: 'debrief', review: { testId: 'listening-full-001' } }), {
    section: 'listening',
    activityId: 'test:listening-full-001',
  });
  assert.equal(tutorScope({ task: 'explain', attempt: { kind: 'writing' } })?.section, 'writing');
  assert.equal(tutorScope({ task: 'lesson-help', lessonKey: 'speaking-part1' })?.section, 'speaking');
  for (const task of ['welcome', 'weekly', 'unit', 'propose-next', 'evaluate-practice']) {
    assert.equal(tutorScope({ task, place: READING_LESSON }), null, task);
  }
});

/* ── The open site is untouched ──────────────────────────────────────── */

test('without ACCESS_MODE the Worker answers as it always has and never asks the trial tables', async () => {
  const { db, state } = await trialWorld({});
  const { response, payload, recorder } = await run(state, chat(undefined), {});
  assert.equal(response.status, 200);
  assert.equal(payload.trial, undefined);
  assert.equal(recorder.urls.some((u) => u.includes('/rpc/')), false);
  assert.equal(recorder.openAiCalls.length, 1);
  await db.close();
});

/* ── Refusals before any money is spent ─────────────────────────────── */

test('general chat and anything outside the trial are refused with no model call and no reservation', async () => {
  const { db, state } = await trialWorld();
  for (const body of [chat(undefined), chat({ lessonKey: 'reading-tfng' }), { task: 'welcome', idempotencyKey: 'trial-welc-01' }]) {
    const { response, payload, recorder } = await run(state, body);
    assert.equal(response.status, 403);
    assert.equal(payload.code, 'trial-not-included');
    assert.equal(recorder.openAiCalls.length, 0);
    /* Only the paid-access question is asked (paid access comes first,
       docs/paid-access/CONTRACT.md); nothing is reserved. */
    assert.equal(recorder.urls.some((u) => u.includes('/rpc/trial_')), false);
  }
  await db.close();
});

test('a signed-in student with no trial is asked to start one; nothing is spent', async () => {
  const { db, state } = await trialWorld({});
  const { response, payload, recorder } = await run(state, chat(READING_LESSON));
  assert.equal(response.status, 403);
  assert.equal(payload.code, 'trial-required');
  assert.equal(recorder.openAiCalls.length, 0);
  await db.close();
});

test('an ended trial refuses new questions before the model is called', async () => {
  const { db, state } = await trialWorld();
  await db.rewind(USER_A, 72 * 60);
  const { response, payload, recorder } = await run(state, chat(READING_LESSON));
  assert.equal(response.status, 403);
  assert.equal(payload.code, 'trial-ended');
  assert.equal(recorder.openAiCalls.length, 0);
  await db.close();
});

test('an unreachable trial database fails closed', async () => {
  const { db, state } = await trialWorld();
  state.trialDbDown = true;
  const { response, payload, recorder } = await run(state, chat(READING_LESSON));
  assert.equal(response.status, 503);
  assert.equal(payload.code, 'unavailable');
  assert.equal(recorder.openAiCalls.length, 0);
  await db.close();
});

/* ── Five per section ───────────────────────────────────────────────── */

test('five answered requests per section, then refused with no model call; other sections are separate', async () => {
  const { db, state } = await trialWorld();
  for (let i = 1; i <= 5; i++) {
    const { response, payload } = await run(state, chat(READING_LESSON));
    assert.equal(response.status, 200, `message ${i}`);
    assert.deepEqual(payload.trial, { section: 'reading', used: i, limit: 5 });
  }
  const sixth = await run(state, chat(READING_LESSON));
  assert.equal(sixth.response.status, 429);
  assert.equal(sixth.payload.code, 'trial-allowance-used');
  assert.equal(sixth.recorder.openAiCalls.length, 0);

  const writing = await run(state, chat({ testId: 'writing-checker' }));
  assert.equal(writing.response.status, 200);
  assert.deepEqual(writing.payload.trial, { section: 'writing', used: 1, limit: 5 });
  const s = await status(db);
  assert.equal(s.sections.reading.tutorUsed, 5);
  assert.equal(s.sections.writing.tutorUsed, 1);
  await db.close();
});

test('a failed model call does not use a message; its retry with the same key uses exactly one', async () => {
  const { db, state } = await trialWorld();
  state.openAi = { status: 500 };
  const body = chat(READING_LESSON, 'retry-key-0001');
  const failed = await run(state, body);
  assert.equal(failed.response.status, 503);
  assert.equal((await status(db)).sections.reading.tutorUsed, 0);
  assert.equal((await status(db)).sections.reading.tutorPending, 0, 'released, not left hanging');

  state.openAi = undefined;
  const retried = await run(state, body);
  assert.equal(retried.response.status, 200);
  assert.deepEqual(retried.payload.trial, { section: 'reading', used: 1, limit: 5 });
  assert.equal((await status(db)).sections.reading.tutorUsed, 1);
  await db.close();
});

test('the same key after a success is the stored answer, free, and never a fresh model call', async () => {
  const { db, state } = await trialWorld();
  const body = chat(READING_LESSON, 'replay-key-0001');
  const first = await run(state, body);
  assert.equal(first.response.status, 200);
  const again = await run(state, body);
  assert.equal(again.response.status, 200);
  assert.equal(again.payload.cached, true);
  assert.equal(again.payload.text, first.payload.text);
  assert.equal(again.recorder.openAiCalls.length, 0);
  assert.equal((await status(db)).sections.reading.tutorUsed, 1);
  await db.close();
});

test('a request with no key cannot be charged, so it is refused in trial mode', async () => {
  const { db, state } = await trialWorld();
  const { response, recorder } = await run(state, { task: 'chat', message: 'hi', place: READING_LESSON });
  assert.equal(response.status, 400);
  assert.equal(recorder.openAiCalls.length, 0);
  await db.close();
});

test('each student spends only their own allowance', async () => {
  const { db, state } = await trialWorld({ startA: true, startB: true });
  for (let i = 0; i < 5; i++) await run(state, chat(READING_LESSON));
  const b = await run(state, chat(READING_LESSON), TRIAL, OTHER_TOKEN);
  assert.equal(b.response.status, 200);
  assert.deepEqual(b.payload.trial, { section: 'reading', used: 1, limit: 5 });
  assert.equal((await status(db, USER_A)).sections.reading.tutorUsed, 5);
  assert.equal((await status(db, USER_B)).sections.reading.tutorUsed, 1);
  await db.close();
});

test('the config probe reports the access mode and nothing else about the trial', async () => {
  const { db, state } = await trialWorld();
  const recorder: Recorder = { openAiCalls: [], urls: [] };
  const handle = createHandler(makeDeps(state, recorder));
  const response = await handle(new Request('https://ielts-mr-ez.example.workers.dev/', { headers: { Origin: 'https://lxson777-tech.github.io' } }), baseEnv(TRIAL));
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.accessMode, 'trial');
  assert.equal(recorder.urls.length, 0);
  await db.close();
});
