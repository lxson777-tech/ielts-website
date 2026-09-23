/* The graders running the trial: the REAL grade-essay handler against
 * the REAL trial database functions (PGlite, tools/trial-db.mjs) and a fake
 * OpenAI. No key, no model, no money.
 *
 * Proves, in trial mode: sign-in and a begun Writing test are required
 * before anything is paid for; a grade uses the test; a failed grade leaves
 * it available to submit again; two submissions of the one test cannot both
 * be graded; and the open grader is unchanged.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../workers/grade-essay/src/index.ts';
import { createTrialDb } from '../tools/trial-db.mjs';
import { parseTrialStatus } from '../src/lib/trial/status.ts';
import { createHandler as createSpeakingHandler } from '../workers/grade-speaking/src/index.ts';
import { createHandler as createLiveHandler } from '../workers/live-examiner/src/index.ts';
import { TRIAL_OFFER } from '../src/lib/trial/offer.ts';

const ORIGIN = 'https://lxson777-tech.github.io';
const SUPABASE_URL = 'https://proj.supabase.co';
const SERVICE_KEY = 'service-role-dummy';
const A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const TOKENS: Record<string, string> = { 'token-a': A, 'token-b': B };

const ESSAY =
  'This essay discusses the topic in reasonable depth, offering a clear position with several supporting ' +
  'points and a short conclusion that ties the argument together for the reader to follow easily.';

function assessment() {
  const criterion = { evidence: 'quoted evidence', band: 6, comment: 'A comment.', tip: 'A tip.' };
  return {
    criteria: { taskResponse: criterion, coherenceCohesion: criterion, lexicalResource: criterion, grammaticalRange: criterion },
    moments: [{ quote: 'a quoted fragment', note: 'why it matters' }],
    strengths: ['a strength'],
    improvements: ['an improvement'],
  };
}

function envelope() {
  return {
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(assessment()) }] }],
  };
}

async function world() {
  const db = await createTrialDb();
  await db.addUser(A);
  await db.addUser(B);
  await db.rpc('trial_start', {}, { userId: A });
  const calls = { openAi: 0 };
  const model = { status: 200 };
  const fetchFn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (url === `${SUPABASE_URL}/auth/v1/user`) {
      const id = TOKENS[(headers.Authorization ?? '').replace('Bearer ', '')];
      return id ? new Response(JSON.stringify({ id })) : new Response('{}', { status: 401 });
    }
    if (url.startsWith(`${SUPABASE_URL}/rest/v1/rpc/`)) {
      const fn = url.slice(`${SUPABASE_URL}/rest/v1/rpc/`.length);
      const role = headers.apikey === SERVICE_KEY ? 'service_role' : 'anon';
      try {
        return new Response(JSON.stringify(await db.rpc(fn, JSON.parse(String(init?.body)), { role })));
      } catch (err) {
        return new Response('{}', { status: (err as { status?: number }).status ?? 400 });
      }
    }
    if (url.startsWith('https://api.openai.com/')) {
      calls.openAi += 1;
      return model.status === 200 ? new Response(JSON.stringify(envelope())) : new Response('{}', { status: model.status });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  const handler = createHandler({ fetch: fetchFn });
  const env = (overrides: Record<string, unknown> = {}) =>
    ({
      ALLOWED_ORIGINS: ORIGIN,
      OPENAI_API_KEY: 'sk-test-dummy',
      GRADING_SAMPLES: '1',
      ACCESS_MODE: 'trial',
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
      ...overrides,
    }) as never;
  const submit = async (token: string | null, sitting?: string, overrides: Record<string, unknown> = {}) => {
    const headers: Record<string, string> = { Origin: ORIGIN, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const body = {
      prompt: { task: 'task2', promptHtml: '<p>Discuss both views.</p>', minWords: 250 },
      essay: ESSAY,
      ...(sitting ? { trialSitting: sitting } : {}),
    };
    const response = await handler.fetch(new Request('https://grader.test/', { method: 'POST', headers, body: JSON.stringify(body) }), env(overrides));
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  const writingTest = async () =>
    parseTrialStatus(await db.rpc('trial_status', {}, { userId: A }))!.sections.writing.test;
  return { db, calls, model, submit, writingTest };
}

test('in trial mode no sign-in, or no begun Writing test, means no grading and no spend', async () => {
  const w = await world();
  assert.equal((await w.submit(null, 'sit-w-00001')).status, 401);
  assert.equal((await w.submit('forged', 'sit-w-00001')).status, 401);
  const noSitting = await w.submit('token-a');
  assert.equal(noSitting.status, 403);
  assert.equal(noSitting.body.code, 'trial-no-test');
  const notBegun = await w.submit('token-a', 'sit-w-00001');
  assert.equal(notBegun.body.code, 'trial-no-test');
  assert.equal(w.calls.openAi, 0);
  await w.db.close();
});

test('a graded essay uses the Writing test, and it cannot be graded again', async () => {
  const w = await world();
  await w.db.rpc('trial_test_begin', { p_section: 'writing', p_activity: 'writing-checker', p_request: 'sit-w-00002' }, { userId: A });
  const graded = await w.submit('token-a', 'sit-w-00002');
  assert.equal(graded.status, 200);
  assert.deepEqual(graded.body.trial, { section: 'writing', test: 'used' });
  assert.equal((await w.writingTest())?.status, 'settled');
  const again = await w.submit('token-a', 'sit-w-00002');
  assert.equal(again.body.code, 'trial-test-used');
  assert.equal(w.calls.openAi, 1);
  await w.db.close();
});

test('a failed grade leaves the Writing test available to submit again', async () => {
  const w = await world();
  await w.db.rpc('trial_test_begin', { p_section: 'writing', p_activity: 'writing-checker', p_request: 'sit-w-00003' }, { userId: A });
  w.model.status = 500;
  const failed = await w.submit('token-a', 'sit-w-00003');
  assert.equal(failed.status >= 500, true);
  assert.equal((await w.writingTest())?.status, 'reserved');
  w.model.status = 200;
  assert.equal((await w.submit('token-a', 'sit-w-00003')).status, 200);
  assert.equal((await w.writingTest())?.status, 'settled');
  await w.db.close();
});

test('two submissions of the one test at the same moment are graded once', async () => {
  const w = await world();
  await w.db.rpc('trial_test_begin', { p_section: 'writing', p_activity: 'writing-checker', p_request: 'sit-w-00004' }, { userId: A });
  const [one, two] = await Promise.all([w.submit('token-a', 'sit-w-00004'), w.submit('token-a', 'sit-w-00004')]);
  const statuses = [one.status, two.status].sort();
  assert.deepEqual(statuses, [200, 409]);
  assert.equal(w.calls.openAi, 1);
  await w.db.close();
});

test('another student cannot submit into someone else’s Writing test', async () => {
  const w = await world();
  await w.db.rpc('trial_start', {}, { userId: B });
  await w.db.rpc('trial_test_begin', { p_section: 'writing', p_activity: 'writing-checker', p_request: 'sit-w-00005' }, { userId: A });
  const b = await w.submit('token-b', 'sit-w-00005');
  assert.equal(b.body.code, 'trial-no-test');
  assert.equal(w.calls.openAi, 0);
  assert.equal((await w.writingTest())?.status, 'reserved', 'A’s test untouched');
  await w.db.close();
});

test('the open grader (no ACCESS_MODE) needs no sign-in and asks the trial nothing', async () => {
  const w = await world();
  const open = await w.submit(null, undefined, { ACCESS_MODE: undefined });
  assert.equal(open.status, 200);
  assert.equal(open.body.trial, undefined);
  await w.db.close();
});

test('an unreachable trial database fails closed', async () => {
  const w = await world();
  const down = await w.submit('token-a', 'sit-w-00006', { SUPABASE_URL: 'https://unreachable.invalid' });
  assert.equal(down.status, 503);
  assert.equal(w.calls.openAi, 0);
  await w.db.close();
});

/* ── Speaking, while its trial test is switched off ────────────────────
   The Speaking test waits for Alex's decision on session length and parts,
   so in trial mode both paid Speaking services refuse before anything is
   paid for. Their open behaviour is covered by their own test files. */


const noNetwork = (async (input: unknown) => {
  throw new Error(`no network call expected, got ${String(input)}`);
}) as typeof fetch;

test('in trial mode the speaking grader refuses before any spend while the Speaking test is off', async () => {
  assert.equal(TRIAL_OFFER.speaking.testEnabled, false);
  const handler = createSpeakingHandler({ fetch: noNetwork });
  const response = await handler.fetch(
    new Request('https://speaking.test/', {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'part1', part1: { topic: 'x', answers: [] } }),
    }),
    { ALLOWED_ORIGINS: ORIGIN, OPENAI_API_KEY: 'sk-test-dummy', ACCESS_MODE: 'trial' } as never,
  );
  assert.equal(response.status, 403);
  assert.equal(((await response.json()) as { code: string }).code, 'trial-not-included');
});

test('in trial mode the live examiner creates no session while the Speaking test is off', async () => {
  const handler = createLiveHandler({
    fetch: noNetwork,
    sideband: async () => ({ ok: false }),
    now: () => new Date(),
  } as never);
  for (const path of ['/', '/direct']) {
    const response = await handler.fetch(
      new Request(`https://live.test${path}`, {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Authorization: 'Bearer token-a' },
        body: '{}',
      }),
      { ALLOWED_ORIGINS: ORIGIN, OPENAI_API_KEY: 'sk-test-dummy', SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, ACCESS_MODE: 'trial' } as never,
    );
    assert.equal(response.status, 403, path);
  }
});
