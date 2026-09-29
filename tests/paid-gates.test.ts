/* Paid access honoured wherever the trial is enforced: the REAL content
 * gate, Mr EZ, essay grader, speaking grader and live examiner handlers, in
 * trial mode, against the REAL trial and paid-access migrations in PGlite
 * (tools/trial-db.mjs), with fake model calls. No key, no model, no money.
 *
 * The rule (docs/paid-access/CONTRACT.md; Alex, 29 September 2026): a
 * running paid grant opens everything the trial locks and skips the trial's
 * allowances; paid AI use is "unlimited, fair daily caps", so each Worker's
 * EXISTING per-student daily limit still applies; when paid access ends, the
 * ended trial's rules apply again and saved results stay.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler as createGate } from '../workers/content-gate/src/index.ts';
import { createHandler as createTutor } from '../workers/mr-ez/src/index.ts';
import { createHandler as createEssay } from '../workers/grade-essay/src/index.ts';
import { createHandler as createSpeaking } from '../workers/grade-speaking/src/index.ts';
import { createHandler as createLive, closeOverdueTrialSessions } from '../workers/live-examiner/src/index.ts';
import { createTrialDb } from '../tools/trial-db.mjs';
import { SPEAKING_CUE_CARDS, SPEAKING_PART1_TOPICS } from '../src/data/speaking-prompts.ts';
import { parseTrialStatus } from '../src/lib/trial/status.ts';
import { GOOD_TOKEN, USER_A, baseEnv, emptyProgress, makeDeps, makeState, post, type Recorder } from './mr-ez-harness.ts';

const ORIGIN = 'https://lxson777-tech.github.io';
const SUPABASE_URL = 'https://proj.supabase.co';
const SERVICE_KEY = 'service-role-dummy';
const A = 'aaaaaaaa-9999-4999-8999-aaaaaaaaaaaa';
const B = 'bbbbbbbb-9999-4999-8999-bbbbbbbbbbbb';
const TOKENS: Record<string, string> = { 'token-a': A, 'token-b': B };
const service = { role: 'service_role' as const };

type Db = Awaited<ReturnType<typeof createTrialDb>>;

/** Buys `plan` for `user` through the database exactly as the payments
    Worker does: order as the student, then the service role confirms. */
async function buy(db: Db, user: string, plan = 'month-1') {
  const created = (await db.rpc('access_order_create', { p_plan: plan }, { userId: user })) as { orderId: string; amount: number; currency: string };
  const paid = (await db.rpc(
    'access_order_paid',
    { p_order: created.orderId, p_provider: 'simulated', p_ref: `sim_${created.orderId.replace(/-/g, '')}`, p_amount: created.amount, p_currency: created.currency },
    service,
  )) as { ok: boolean };
  assert.equal(paid.ok, true);
  return created.orderId;
}

/** A fake Supabase whose auth maps tokens and whose rpc is the real database. */
function supabaseFetch(db: Db, extra?: (url: string, init?: RequestInit) => Promise<Response> | null) {
  const counts = { model: 0, rpc: [] as string[] };
  const fetchFn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (url === `${SUPABASE_URL}/auth/v1/user`) {
      const id = TOKENS[(headers.Authorization ?? '').replace('Bearer ', '')];
      return id ? new Response(JSON.stringify({ id })) : new Response('{}', { status: 401 });
    }
    if (url.startsWith(`${SUPABASE_URL}/rest/v1/rpc/`)) {
      const fn = url.slice(`${SUPABASE_URL}/rest/v1/rpc/`.length);
      counts.rpc.push(fn);
      try {
        return new Response(JSON.stringify(await db.rpc(fn, JSON.parse(String(init?.body)), { role: headers.apikey === SERVICE_KEY ? 'service_role' : 'anon' })));
      } catch (err) {
        return new Response('{}', { status: (err as { status?: number }).status ?? 400 });
      }
    }
    const answered = extra?.(url, init);
    if (answered) return answered;
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  return { fetchFn, counts };
}

/* ── The content gate ─────────────────────────────────────────────────── */

const STORE: Record<string, string> = {
  'lessons/en/reading-paraphrase.html': '<p>The trial lesson</p>',
  'lessons/en/reading-tfng.html': '<p>A locked lesson</p>',
  'tests/reading-full-001.json': '{"id":"reading-full-001"}',
  'tests/reading-full-029.json': '{"id":"reading-full-029"}',
  'practice/practice-reading-tfng.json': '{"questions":[]}',
  'models/pte-wt-121-task2.json': '{"model":"a locked model"}',
  'packs/writing-models.json': '{"pack":"writing-models"}',
  'packs/listening-pack.json': '{"audio":"/audio/listening/test-003.mp3"}',
};

async function gateWorld() {
  const db = await createTrialDb();
  await db.addUser(A, 'gate-a@example.test');
  await db.addUser(B, 'gate-b@example.test');
  const { fetchFn } = supabaseFetch(db);
  const store = {
    get: async (key: string) =>
      key in STORE ? { size: STORE[key]!.length, text: async () => STORE[key]!, arrayBuffer: async () => new TextEncoder().encode(STORE[key]!).buffer } : null,
  };
  const gate = createGate({ fetch: fetchFn, store });
  const env = {
    ALLOWED_ORIGINS: ORIGIN,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    AUDIO_SIGNING_KEY: 'audio-signing-dummy',
    AUDIO_BASE_URL: 'https://gate.test',
  } as never;
  const get = async (path: string, token = 'token-a') => {
    const response = await gate.fetch(new Request(`https://gate.test${path}`, { headers: { Origin: ORIGIN, Authorization: `Bearer ${token}` } }), env);
    const text = await response.text();
    let code: string | undefined;
    try {
      code = (JSON.parse(text) as { code?: string }).code;
    } catch {
      /* html */
    }
    return { status: response.status, text, code, headers: response.headers };
  };
  return { db, get };
}

const LOCKED = ['/lesson/reading-tfng', '/test/reading-full-029', '/practice/practice-reading-tfng', '/model/pte-wt-121-task2', '/pack/writing-models'];

test('content gate: a paid account opens locked lessons, tests, practice, models and packs; trial, ended and expired-paid accounts do not', async () => {
  const w = await gateWorld();
  // No trial, no payment.
  for (const path of LOCKED) assert.equal((await w.get(path)).status, 403, path);
  // A running trial: still locked.
  await w.db.rpc('trial_start', {}, { userId: A });
  for (const path of LOCKED) assert.equal((await w.get(path)).status, 403, `trial ${path}`);
  assert.equal((await w.get('/pack/writing-models')).code, 'not-included');

  await buy(w.db, A);
  for (const path of LOCKED) {
    const opened = await w.get(path);
    assert.equal(opened.status, 200, path);
    assert.equal(opened.headers.get('Cache-Control'), 'private, no-store');
  }
  assert.equal((await w.get('/pack/writing-models')).text, '{"pack":"writing-models"}');
  // A pack's recordings become signed gate links like a paper's.
  assert.match((await w.get('/pack/listening-pack')).text, /https:\/\/gate\.test\/audio\/test-003\.mp3\?exp=\d+&sig=/);
  // A pack that does not exist is not found, not an error.
  assert.equal((await w.get('/pack/not-built-yet')).status, 404);
  assert.equal((await w.get('/pack/..%2Fsecret')).status, 404);
  // Paid is per account: B (no trial, no payment) is still refused.
  for (const path of LOCKED) assert.equal((await w.get(path, 'token-b')).status, 403, `B ${path}`);
  // Without a sign-in nothing opens, paid or not.
  const anon = await createGate({ fetch: (async () => new Response('{}', { status: 401 })) as typeof fetch, store: { get: async () => null } }).fetch(
    new Request('https://gate.test/pack/writing-models', { headers: { Origin: ORIGIN } }),
    { ALLOWED_ORIGINS: ORIGIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } as never,
  );
  assert.equal(anon.status, 401);

  // Paid access ends while the trial has also ended: the ended trial's rules.
  await w.db.expirePaid(A);
  await w.db.rewind(A, 72 * 60 + 1);
  for (const path of LOCKED) assert.equal((await w.get(path)).status, 403, `expired ${path}`);
  assert.equal((await w.get('/lesson/reading-paraphrase')).code, 'trial-ended');
  assert.equal((await w.get('/pack/writing-models')).code, 'not-included');
  await w.db.close();
});

test('content gate: a refund closes the door again at once', async () => {
  const w = await gateWorld();
  const orderId = await buy(w.db, A);
  assert.equal((await w.get('/lesson/reading-tfng')).status, 200);
  await w.db.rpc('access_order_refunded', { p_order: orderId, p_provider_ref: null }, service);
  assert.equal((await w.get('/lesson/reading-tfng')).status, 403);
  assert.equal((await w.get('/pack/writing-models')).status, 403);
  await w.db.close();
});

/* ── Mr EZ ────────────────────────────────────────────────────────────── */

async function tutorWorld() {
  const db = await createTrialDb();
  await db.addUser(USER_A);
  await db.rpc('trial_start', {}, { userId: USER_A });
  const state = makeState({ trialDb: db });
  state.userState[USER_A] = { progress: emptyProgress(), study_plan: null };
  const run = async (body: Record<string, unknown>, env: Record<string, unknown> = {}) => {
    const recorder: Recorder = { openAiCalls: [], urls: [] };
    const response = await createTutor(makeDeps(state, recorder))(post(body, GOOD_TOKEN), baseEnv({ ACCESS_MODE: 'trial', ...env }));
    return { response, payload: (await response.clone().json()) as Record<string, unknown>, recorder };
  };
  return { db, state, run };
}

let key = 0;
const chat = (place?: Record<string, unknown>) => ({ task: 'chat', message: 'Can you explain this?', idempotencyKey: `paid-key-${String(++key).padStart(4, '0')}`, ...(place ? { place } : {}) });

test('Mr EZ: a paid account skips the trial allowance and scope, and the daily limit still applies', async () => {
  const w = await tutorWorld();
  // Trial only: general chat is outside the trial.
  assert.equal((await w.run(chat())).payload.code, 'trial-not-included');

  await buy(w.db, USER_A);
  // General chat and a locked lesson now answer, with no trial reservation.
  for (const body of [chat(), chat({ lessonKey: 'reading-tfng' }), { task: 'welcome', idempotencyKey: 'paid-welcome-01' }]) {
    const { response, payload, recorder } = await w.run(body);
    assert.equal(response.status, 200, JSON.stringify(payload).slice(0, 200));
    assert.equal(payload.trial, undefined, 'no trial note');
    assert.equal(recorder.openAiCalls.length, 1);
    assert.equal(recorder.urls.some((u) => u.includes('/rpc/trial_tutor_reserve')), false, 'no trial reservation');
  }
  // More than the trial's five in one section: all answered.
  for (let i = 0; i < 6; i++) assert.equal((await w.run(chat({ lessonKey: 'reading-paraphrase' }))).response.status, 200);
  const status = parseTrialStatus(await w.db.rpc('trial_status', {}, { userId: USER_A }))!;
  assert.equal(status.sections.reading.tutorUsed, 0, 'the trial allowance was not touched');

  // The Worker's existing per-student daily limit still applies.
  const capped = await w.run(chat(), { TUTOR_MAX_TURNS_PER_USER_PER_DAY: String(w.state.turns.length) });
  assert.equal(capped.response.status, 429);
  assert.equal(capped.payload.code, 'limit-reached');
  assert.equal(capped.recorder.openAiCalls.length, 0);
  await w.db.close();
});

test('Mr EZ: when paid access ends, the trial rules apply again', async () => {
  const w = await tutorWorld();
  await buy(w.db, USER_A);
  assert.equal((await w.run(chat())).response.status, 200);
  await w.db.expirePaid(USER_A);
  assert.equal((await w.run(chat())).payload.code, 'trial-not-included');
  await w.db.rewind(USER_A, 72 * 60 + 1);
  const ended = await w.run(chat({ lessonKey: 'reading-paraphrase' }));
  assert.equal(ended.payload.code, 'trial-ended');
  assert.equal(ended.recorder.openAiCalls.length, 0);
  await w.db.close();
});

test('Mr EZ: an unreachable database is a refusal, never a free answer', async () => {
  const w = await tutorWorld();
  await buy(w.db, USER_A);
  w.state.trialDbDown = true;
  const { response, recorder } = await w.run(chat());
  assert.equal(response.status, 503);
  assert.equal(recorder.openAiCalls.length, 0);
  await w.db.close();
});

/* ── The essay grader ─────────────────────────────────────────────────── */

const ESSAY =
  'This essay discusses the topic in reasonable depth, offering a clear position with several supporting ' +
  'points and a short conclusion that ties the argument together for the reader to follow easily.';

function essayAssessment() {
  const criterion = { evidence: 'quoted evidence', band: 6, comment: 'A comment.', tip: 'A tip.' };
  return {
    criteria: { taskResponse: criterion, coherenceCohesion: criterion, lexicalResource: criterion, grammaticalRange: criterion },
    moments: [{ quote: 'a quoted fragment', note: 'why it matters' }],
    strengths: ['a strength'],
    improvements: ['an improvement'],
  };
}

async function essayWorld() {
  const db = await createTrialDb();
  await db.addUser(A);
  await db.addUser(B);
  await db.rpc('trial_start', {}, { userId: A });
  const prompts: string[] = [];
  const { fetchFn, counts } = supabaseFetch(db, (url, init) => {
    if (!url.startsWith('https://api.openai.com/')) return null;
    counts.model += 1;
    prompts.push(String(init?.body ?? ''));
    return Promise.resolve(new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(essayAssessment()) }] }] })));
  });
  const grader = createEssay({ fetch: fetchFn });
  const submit = async (token: string, extra: Record<string, unknown> = {}) => {
    const response = await grader.fetch(
      new Request('https://grader.test/', {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: { task: 'task1', promptHtml: '<p>The chart shows STUDENT-CHOSEN-QUESTION.</p>', minWords: 150 }, essay: ESSAY, ...extra }),
      }),
      { ALLOWED_ORIGINS: ORIGIN, OPENAI_API_KEY: 'sk-test-dummy', GRADING_SAMPLES: '1', ACCESS_MODE: 'trial', SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } as never,
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  return { db, counts, prompts, submit };
}

test('essay grader: a paid account is graded on its own question with no trial test used; a trial account is not', async () => {
  const w = await essayWorld();
  // Trial account, no begun Writing test: refused before any spend.
  assert.equal((await w.submit('token-a')).body.code, 'trial-no-test');
  assert.equal(w.counts.model, 0);

  await buy(w.db, A);
  for (let i = 0; i < 3; i++) {
    const graded = await w.submit('token-a', { locale: 'ru' });
    assert.equal(graded.status, 200, JSON.stringify(graded.body).slice(0, 200));
    assert.equal(graded.body.trial, undefined);
    assert.ok(graded.body.guides, 'band guide steps, which a trial build\'s browser does not carry');
  }
  assert.equal(w.counts.model, 3, 'as many grades as submitted: this grader has no per-student daily limit');
  assert.ok(w.prompts.every((p) => p.includes('STUDENT-CHOSEN-QUESTION')), 'graded on the student\'s own question');
  assert.equal(w.counts.rpc.includes('trial_test_lease'), false, 'no trial test leased');
  assert.equal(parseTrialStatus(await w.db.rpc('trial_status', {}, { userId: A }))!.sections.writing.test, null);

  // B has no payment: still the trial's rules.
  assert.equal((await w.submit('token-b')).body.code, 'trial-no-test');
  // A's paid access ends: the trial's rules again.
  await w.db.expirePaid(A);
  assert.equal((await w.submit('token-a')).body.code, 'trial-no-test');
  assert.equal(w.counts.model, 3);
  await w.db.close();
});

/* ── The speaking grader and the live examiner ────────────────────────── */

test('speaking grader: a paid account may grade recorded practice (not only the trial interview)', async () => {
  const db = await createTrialDb();
  await db.addUser(A);
  await db.rpc('trial_start', {}, { userId: A });
  const { fetchFn, counts } = supabaseFetch(db, (url) => {
    if (!url.startsWith('https://api.openai.com/')) return null;
    counts.model += 1;
    return Promise.resolve(new Response('{}', { status: 500 }));
  });
  const grader = createSpeaking({ fetch: fetchFn, sleep: async () => undefined } as never);
  const clip = { question: 'Tell me about your work.', mimeType: 'audio/mpeg', audioBase64: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA', durationMs: 60000 };
  const submit = async () => {
    const response = await grader.fetch(
      new Request('https://speaking.test/', {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Authorization: 'Bearer token-a' },
        body: JSON.stringify({ kind: 'part1', part1: { topic: 'Work', answers: [clip] } }),
      }),
      { ALLOWED_ORIGINS: ORIGIN, OPENAI_API_KEY: 'sk-test-dummy', GRADING_SAMPLES: '1', ACCESS_MODE: 'trial', SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } as never,
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  assert.equal((await submit()).body.code, 'trial-not-included', 'trial: recorded practice is not the trial test');
  assert.equal(counts.model, 0);
  await buy(db, A);
  const paid = await submit();
  assert.ok(counts.model > 0, 'paid: it reached the grader (answered 500 here, so no grade)');
  assert.ok(paid.status >= 500);
  assert.equal(counts.rpc.includes('trial_test_lease'), false);
  await db.close();
});

test('live examiner: a paid account opens a full interview with no trial test, under the daily limit, and the five-minute cut-off skips it', async () => {
  const db = await createTrialDb();
  await db.addUser(A);
  await db.addUser(B);
  await db.rpc('trial_start', {}, { userId: A });
  await db.rpc('trial_start', {}, { userId: B });
  const sessions: Record<string, unknown>[] = [];
  let live = 0;
  let now = new Date();
  const closes: string[] = [];
  const matches = (row: Record<string, unknown>, k: string, raw: string) => {
    const value = row[k];
    if (raw === 'is.null') return value === null || value === undefined;
    if (raw === 'not.is.null') return value !== null && value !== undefined;
    const [op, ...rest] = raw.split('.');
    const want = decodeURIComponent(rest.join('.'));
    if (op === 'eq') return String(value) === want;
    if (op === 'gte') return String(value) >= want;
    if (op === 'lt') return String(value) < want;
    return true;
  };
  const { fetchFn } = supabaseFetch(db, (url, init) => {
    if (url.startsWith(`${SUPABASE_URL}/rest/v1/live_examiner_sessions`)) {
      const u = new URL(url);
      const method = init?.method ?? 'GET';
      if (method === 'POST') {
        const row = { id: `row_${sessions.length + 1}`, created_at: now.toISOString(), ended_at: null, provider_session_id: null, ...JSON.parse(String(init?.body)) };
        sessions.push(row);
        return Promise.resolve(new Response(JSON.stringify([row]), { status: 201 }));
      }
      const rows = sessions.filter((row) => [...u.searchParams.entries()].every(([k, v]) => k === 'select' || matches(row, k, v)));
      if (method === 'PATCH') {
        for (const row of rows) Object.assign(row, JSON.parse(String(init?.body)));
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(new Response(JSON.stringify(rows)));
    }
    if (url === 'https://api.openai.com/v1/live/sessions') {
      live += 1;
      return Promise.resolve(new Response(JSON.stringify({ session: { id: `live_${live}` }, transport: { type: 'webrtc', sdp: 'v=0 answer' } }), { status: 201 }));
    }
    return null;
  });
  const deps = {
    fetch: fetchFn,
    now: () => now,
    sideband: async (_env: unknown, id: string, event: Record<string, unknown>) => {
      if (event.type === 'session.close') closes.push(id);
      return { ok: false, error: 'socket closed' };
    },
  };
  const handler = createLive(deps as never);
  const env = {
    ALLOWED_ORIGINS: ORIGIN,
    OPENAI_API_KEY: 'sk-test-dummy',
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    ACCESS_MODE: 'trial',
    LIVE_MAX_PER_USER_PER_DAY: '2',
    LIVE_MAX_CONCURRENT_PER_USER: '5',
  } as never;
  const plan = { mode: 'full', part1TopicIds: [SPEAKING_PART1_TOPICS[0]!.id, SPEAKING_PART1_TOPICS[1]!.id], cueCardId: SPEAKING_CUE_CARDS[0]!.id };
  const open = async (token: string) => {
    const response = await handler.fetch(
      new Request('https://live.test/', {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sdp: 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\n', plan }),
      }),
      env,
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };

  assert.equal((await open('token-a')).body.code, 'trial-not-included', 'trial: the full test is not the trial test');
  assert.equal(live, 0);
  await buy(db, A);
  assert.equal((await open('token-a')).status, 201, 'paid: a full interview, no trial sitting');
  assert.equal((await open('token-a')).status, 201);
  const third = await open('token-a');
  assert.equal(third.status, 429, 'the existing daily limit still applies');
  assert.equal(live, 2);
  assert.equal(parseTrialStatus(await db.rpc('trial_status', {}, { userId: A }))!.sections.speaking.test, null, 'no trial test used');

  // B, trial only, opens their Part 1 trial interview.
  await db.rpc('trial_test_begin', { p_section: 'speaking', p_activity: 'speaking-test', p_request: 'sit-s-paid-b1' }, { userId: B });
  const bSession = await handler.fetch(
    new Request('https://live.test/', {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Authorization: 'Bearer token-b' },
      body: JSON.stringify({ sdp: 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\n', plan: { mode: 'part1', part1TopicIds: [SPEAKING_PART1_TOPICS[0]!.id] }, trialSitting: 'sit-s-paid-b1' }),
    }),
    env,
  );
  assert.equal(bSession.status, 201);

  // Six minutes later the cut-off closes B's trial interview only.
  now = new Date(now.getTime() + 6 * 60_000);
  const swept = await closeOverdueTrialSessions(deps as never, env);
  assert.deepEqual(swept, { closed: 1, failed: 0 });
  assert.deepEqual(closes, ['live_3']);
  await db.close();
});
