/* Mr EZ's Worker in the commercial build (ACCESS_MODE=trial, the name
 * stays): the REAL handler (workers/mr-ez/src/index.ts) against the REAL
 * database functions (every migration a project runs today, ending with
 * supabase/migrations/2026-10-01-free-account.sql, in PGlite via
 * tools/trial-db.mjs), with the harness's fake OpenAI. No key, no model, no
 * money.
 *
 * The free-account model (Alex, 1 October 2026,
 * docs/paid-access/FREE-ACCOUNT-MODEL.md) retired the three-day trial and
 * its five Mr EZ messages per section: Mr EZ, his lesson help included, is
 * part of practice and guidance. What is proved:
 *   - the open site (no ACCESS_MODE) behaves exactly as before and never
 *     asks the database's access functions anything;
 *   - a free account (signed in, profile done, nothing paid) is refused 402
 *     paid-required before the model is called, for every task;
 *   - an old trial row, even a running one, buys nothing;
 *   - paid and complimentary access are answered as the open site answers;
 *     when complimentary access is stopped, Mr EZ is refused again;
 *   - an unreachable database fails closed;
 *   - the trial's section rule (tutorScope) still reads references, never
 *     labels (kept: it is pure and documents the old allowance).
 *
 * The trial's own five-per-section behaviour is history: the database file
 * that implements it is still proved in tests/trial-sql.test.ts against the
 * migrations as they stood before the trial was retired.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../workers/mr-ez/src/index.ts';
import { createTrialDb } from '../tools/trial-db.mjs';
import { tutorScope } from '../src/lib/trial/gate.ts';
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

const COMMERCIAL = { ACCESS_MODE: 'trial' };
/** Alex, as the database knows an admin (2026-09-24-admin.sql). */
const ADMIN = 'adadadad-0000-4000-8000-adadadadadad';

async function world() {
  const db = await createTrialDb();
  await db.addUser(USER_A, 'free-a@example.test');
  await db.addUser(USER_B, 'free-b@example.test');
  await db.addUser(ADMIN, 'admin@example.test');
  await db.addProfile(USER_A);
  await db.addProfile(USER_B);
  await db.makeAdmin(ADMIN);
  const state = makeState({ trialDb: db });
  const complimentary = (user: string, action: 'give' | 'renew' | 'stop') =>
    db.rpc('access_admin_complimentary', { p_user: user, p_action: action }, { userId: ADMIN }) as Promise<{ ok: boolean }>;
  return { db, state, complimentary };
}

async function run(state: FakeState, body: Record<string, unknown>, env: Record<string, unknown> = COMMERCIAL, token = GOOD_TOKEN) {
  const recorder: Recorder = { openAiCalls: [], urls: [] };
  const handle = createHandler(makeDeps(state, recorder));
  const response = await handle(post(body, token), baseEnv(env));
  const payload = (await response.clone().json()) as Record<string, unknown>;
  return { response, payload, recorder };
}

let keyCounter = 0;
function chat(place: Record<string, unknown> | undefined, key = `paid-key-${String(++keyCounter).padStart(4, '0')}`) {
  return { task: 'chat', message: 'Can you give me an example?', idempotencyKey: key, ...(place ? { place } : {}) };
}

const READING_LESSON = { lessonKey: 'reading-paraphrase' };

/* ── The trial's section rule (pure, kept as documentation) ───────────── */

test('the old trial section rule still comes from what a request is about, never from a label', () => {
  assert.deepEqual(tutorScope({ task: 'chat', place: { lessonKey: 'reading-paraphrase' } }), {
    section: 'reading',
    activityId: 'lesson:reading-paraphrase',
  });
  assert.equal(tutorScope({ task: 'chat', place: { lessonKey: 'reading-tfng' } }), null, 'a lesson outside the trial');
  assert.equal(tutorScope({ task: 'chat' }), null, 'general chat is not a fifth bucket');
});

/* ── The open site is untouched ──────────────────────────────────────── */

test('without ACCESS_MODE the Worker answers as it always has and never asks the access functions', async () => {
  const { db, state } = await world();
  const { response, payload, recorder } = await run(state, chat(undefined), {});
  assert.equal(response.status, 200);
  assert.equal(payload.trial, undefined);
  assert.equal(recorder.urls.some((u) => u.includes('/rpc/')), false);
  assert.equal(recorder.openAiCalls.length, 1);
  await db.close();
});

/* ── A free account is refused before any money is spent ─────────────── */

test('a free account is refused 402 paid-required for every task, with no model call and nothing reserved', async () => {
  const { db, state } = await world();
  const bodies = [
    chat(undefined),
    chat(READING_LESSON),
    chat({ testId: 'reading-full-001' }),
    { task: 'welcome', idempotencyKey: 'free-welcome-01' },
    {
      task: 'lesson-help', kind: 'hint', lessonKey: 'reading-tfng', blockId: 'b1-bbbbbbbb', previousHints: [], assistanceSoFar: 'none',
      versions: { planRevision: 0, evidenceVersion: 0, indexVersion: 'x' }, idempotencyKey: 'free-help-0001',
    },
  ];
  for (const body of bodies) {
    const { response, payload, recorder } = await run(state, body);
    assert.equal(response.status, 402, JSON.stringify(body));
    assert.deepEqual([payload.code, payload.reason], ['paid-required', 'paid-required']);
    assert.equal(typeof payload.error, 'string');
    assert.equal(recorder.openAiCalls.length, 0);
    assert.deepEqual(
      recorder.urls.filter((u) => u.includes('/rpc/')).map((u) => u.split('/rpc/')[1]),
      ['access_paid_now'],
      'only the access question is asked',
    );
  }
  await db.close();
});

test('an old trial, even one still inside its 72 hours, buys no Mr EZ message', async () => {
  const { db, state } = await world();
  await db.raw.query("insert into public.trial_accounts (user_id, started_at, ends_at) values ($1, now(), now() + interval '72 hours')", [USER_A]);
  assert.deepEqual(((await db.rpc('trial_start', {}, { userId: USER_B })) as { code: string }).code, 'trial-retired');
  for (const token of [GOOD_TOKEN, OTHER_TOKEN]) {
    const { response, payload, recorder } = await run(state, chat(READING_LESSON), COMMERCIAL, token);
    assert.equal(response.status, 402);
    assert.equal(payload.code, 'paid-required');
    assert.equal(recorder.openAiCalls.length, 0);
  }
  /* The trial's own reservation function refuses too, so nothing could be
     charged to it even by a Worker that still asked. */
  assert.deepEqual(
    await db.rpc('trial_tutor_reserve', { p_user: USER_A, p_section: 'reading', p_request: 'old-trial-req-01', p_activity: 'lesson:reading-paraphrase' }, { role: 'service_role' }),
    { ok: false, reason: 'trial-retired' },
  );
  await db.close();
});

/* ── Paid and complimentary access ───────────────────────────────────── */

test('complimentary access is answered like the open site; stopping it refuses Mr EZ again', async () => {
  const { db, state, complimentary } = await world();
  assert.equal((await run(state, chat(READING_LESSON))).response.status, 402);
  assert.equal((await complimentary(USER_A, 'give')).ok, true);
  const answered = await run(state, chat(READING_LESSON));
  assert.equal(answered.response.status, 200);
  assert.equal(answered.payload.trial, undefined, 'no trial allowance note');
  assert.equal(answered.recorder.openAiCalls.length, 1);
  // General chat too: paid guidance is not limited to trial references.
  assert.equal((await run(state, chat(undefined))).response.status, 200);
  // Another student is still free.
  assert.equal((await run(state, chat(READING_LESSON), COMMERCIAL, OTHER_TOKEN)).response.status, 402);

  assert.equal((await complimentary(USER_A, 'stop')).ok, true);
  const stopped = await run(state, chat(READING_LESSON));
  assert.equal(stopped.response.status, 402);
  assert.equal(stopped.recorder.openAiCalls.length, 0);
  await db.close();
});

test('an unreachable database fails closed', async () => {
  const { db, state } = await world();
  state.trialDbDown = true;
  const { response, payload, recorder } = await run(state, chat(READING_LESSON));
  assert.equal(response.status, 503);
  assert.equal(payload.code, 'unavailable');
  assert.equal(recorder.openAiCalls.length, 0);
  await db.close();
});

test('the config probe reports the access mode and nothing else', async () => {
  const { db, state } = await world();
  const recorder: Recorder = { openAiCalls: [], urls: [] };
  const handle = createHandler(makeDeps(state, recorder));
  const response = await handle(new Request('https://ielts-mr-ez.example.workers.dev/', { headers: { Origin: 'https://lxson777-tech.github.io' } }), baseEnv(COMMERCIAL));
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.accessMode, 'trial');
  assert.equal(recorder.urls.length, 0);
  await db.close();
});

