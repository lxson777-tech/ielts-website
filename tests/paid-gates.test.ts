const validMp3 = () => { const b=Buffer.alloc(288); b[0]=255; b[1]=243; b[2]=136; return b.toString('base64'); };
/* Paid access honoured at every door: the REAL content gate, Mr EZ, essay
 * grader, speaking grader and live examiner handlers, in the commercial
 * build (ACCESS_MODE=trial, the name stays), against the REAL migrations in
 * PGlite (tools/trial-db.mjs, ending with 2026-10-01-free-account.sql), with
 * fake model calls. No key, no model, no money.
 *
 * The rules (docs/paid-access/CONTRACT.md; Alex, 29 September 2026, and the
 * free-account model of 1 October 2026, docs/paid-access/FREE-ACCOUNT-
 * MODEL.md): a free account opens every lesson and nothing else; a running
 * paid grant opens everything; paid AI use keeps each Worker's EXISTING
 * per-student daily limit; when paid access ends the account is a free one
 * again (402 paid-required for practice and guidance), and saved results
 * stay.
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
  await db.addProfile(A);
  await db.addProfile(B);
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

/** What a free account opens: the lessons, with their own quizzes. */
const LESSONS = ['/lesson/reading-tfng', '/practice/practice-reading-tfng'];
/** What only paid or complimentary access opens. */
const PAID = ['/test/reading-full-029', '/model/pte-wt-121-task2', '/pack/writing-models'];

test('content gate: a free account opens the lessons only; a paid account opens everything; paid-ended is free again', async () => {
  const w = await gateWorld();
  // Free: every lesson, nothing paid.
  for (const path of LESSONS) assert.equal((await w.get(path)).status, 200, path);
  for (const path of PAID) assert.deepEqual([(await w.get(path)).status, (await w.get(path)).code], [402, 'paid-required'], path);
  // An old trial changes nothing (trial_start is refused anyway).
  assert.equal(((await w.db.rpc('trial_start', {}, { userId: A })) as { code: string }).code, 'trial-retired');
  assert.equal((await w.get('/pack/writing-models')).code, 'paid-required');

  await buy(w.db, A);
  for (const path of [...LESSONS, ...PAID]) {
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
  // Paid is per account: B (free) is still refused the paid items.
  for (const path of PAID) assert.equal((await w.get(path, 'token-b')).status, 402, `B ${path}`);
  // Without a sign-in nothing opens, paid or not.
  const anon = await createGate({ fetch: (async () => new Response('{}', { status: 401 })) as typeof fetch, store: { get: async () => null } }).fetch(
    new Request('https://gate.test/pack/writing-models', { headers: { Origin: ORIGIN } }),
    { ALLOWED_ORIGINS: ORIGIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } as never,
  );
  assert.equal(anon.status, 401);

  // Paid access ends: a free account again, every lesson still open.
  await w.db.expirePaid(A);
  for (const path of LESSONS) assert.equal((await w.get(path)).status, 200, `ended ${path}`);
  for (const path of PAID) assert.equal((await w.get(path)).code, 'paid-required', `ended ${path}`);
  await w.db.close();
});

test('content gate: a refund closes the paid door again at once; the lessons stay open', async () => {
  const w = await gateWorld();
  const orderId = await buy(w.db, A);
  assert.equal((await w.get('/pack/writing-models')).status, 200);
  await w.db.rpc('access_order_refunded', { p_order: orderId, p_provider_ref: null }, service);
  assert.equal((await w.get('/pack/writing-models')).status, 402);
  assert.equal((await w.get('/lesson/reading-tfng')).status, 200);
  await w.db.close();
});

/* ── Mr EZ ────────────────────────────────────────────────────────────── */

async function tutorWorld() {
  const db = await createTrialDb();
  await db.addUser(USER_A);
  await db.addProfile(USER_A);
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

test('Mr EZ: a paid account is answered for any task, and the daily limit still applies', async () => {
  const w = await tutorWorld();
  // Free: a task that is not a question (the dashboard welcome) is practice and guidance, refused before the model.
  // (Chat and lesson help are the free tries: tests/free-taster-worker.test.ts.)
  const free = await w.run({ task: 'welcome', idempotencyKey: 'free-welcome-01' });
  assert.deepEqual([free.response.status, free.payload.code], [402, 'paid-required']);
  assert.equal(free.recorder.openAiCalls.length, 0);

  await buy(w.db, USER_A);
  // General chat and a locked lesson now answer, with no trial reservation.
  for (const body of [chat(), chat({ lessonKey: 'reading-tfng' }), { task: 'welcome', idempotencyKey: 'paid-welcome-01' }]) {
    const { response, payload, recorder } = await w.run(body);
    assert.equal(response.status, 200, JSON.stringify(payload).slice(0, 200));
    assert.equal(payload.trial, undefined, 'no trial note');
    assert.equal(recorder.openAiCalls.length, 1);
    assert.equal(recorder.urls.some((u) => u.includes('/rpc/trial_tutor_reserve')), false, 'no trial reservation');
  }
  // More than the old trial's five in one section: all answered.
  for (let i = 0; i < 6; i++) assert.equal((await w.run(chat({ lessonKey: 'reading-paraphrase' }))).response.status, 200);

  // The Worker's existing per-student daily limit still applies.
  const capped = await w.run(chat(), { TUTOR_MAX_TURNS_PER_USER_PER_DAY: String(w.state.turns.length) });
  assert.equal(capped.response.status, 429);
  assert.equal(capped.payload.code, 'limit-reached');
  assert.equal(capped.recorder.openAiCalls.length, 0);
  await w.db.close();
});

test('Mr EZ: when paid access ends, he is refused again (402), lesson help included', async () => {
  const w = await tutorWorld();
  await buy(w.db, USER_A);
  assert.equal((await w.run(chat())).response.status, 200);
  await w.db.expirePaid(USER_A);
  const ended = await w.run({ task: 'welcome', idempotencyKey: 'ended-welcome-01' });
  assert.deepEqual([ended.response.status, ended.payload.code], [402, 'paid-required']);
  assert.equal(ended.recorder.openAiCalls.length, 0);
  // Back to free, a question is one of the ten lifetime tries, not a paid answer.
  const asked = await w.run(chat({ lessonKey: 'reading-paraphrase' }));
  assert.equal(asked.response.status, 200);
  assert.equal(asked.recorder.openAiCalls.length, 1);
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
  await db.addProfile(A);
  await db.addProfile(B);
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

test('essay grader: a paid account is graded on its own question; a free or paid-ended account is refused 402', async () => {
  const w = await essayWorld();
  // Free account: its ONE lifetime try is graded, the second is refused 402 before any spend.
  assert.equal((await w.submit('token-a')).status, 200);
  assert.equal(w.counts.model, 1);
  const second = await w.submit('token-a');
  assert.deepEqual([second.status, second.body.code], [402, 'taster-used']);
  assert.equal(w.counts.model, 1);

  await buy(w.db, A);
  for (let i = 0; i < 3; i++) {
    const graded = await w.submit('token-a', { locale: 'ru' });
    assert.equal(graded.status, 200, JSON.stringify(graded.body).slice(0, 200));
    assert.equal(graded.body.trial, undefined);
    assert.ok(graded.body.guides, 'band guide steps, which a trial build\'s browser does not carry');
  }
  assert.equal(w.counts.model, 4, 'as many grades as submitted (1 free try + 3 paid): this grader has no per-student daily limit');
  assert.ok(w.prompts.every((p) => p.includes('STUDENT-CHOSEN-QUESTION')), 'graded on the student\'s own question');
  assert.equal(w.counts.rpc.includes('trial_test_lease'), false, 'no trial test leased');

  // B has no payment: one free try, then refused.
  assert.equal((await w.submit('token-b')).status, 200);
  assert.equal((await w.submit('token-b')).body.code, 'taster-used');
  // A's paid access ends: refused again (A's lifetime try was used before buying).
  await w.db.expirePaid(A);
  assert.equal((await w.submit('token-a')).body.code, 'taster-used');
  assert.equal(w.counts.model, 5);
  await w.db.close();
});

/* ── The speaking grader and the live examiner ────────────────────────── */

test('speaking grader: a paid account may grade recorded practice; a free one is refused 402', async () => {
  const db = await createTrialDb();
  await db.addUser(A);
  await db.addProfile(A);
  const { fetchFn, counts } = supabaseFetch(db, (url) => {
    if (!url.startsWith('https://api.openai.com/')) return null;
    counts.model += 1;
    return Promise.resolve(new Response('{}', { status: 500 }));
  });
  const grader = createSpeaking({ fetch: fetchFn, sleep: async () => undefined } as never);
  const clip = { question: 'Tell me about your work.', mimeType: 'audio/mpeg', audioBase64: validMp3(), durationMs: 60000 };
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
  // Free: the one lifetime try reaches the grader (a failed grade is given back, costs nothing)...
  assert.ok((await submit()).status >= 500);
  const afterFirst = counts.model;
  assert.ok(afterFirst > 0, 'the free try reached the grader');
  assert.ok((await submit()).status >= 500, 'a failed grade did not use the try');
  assert.ok(counts.model > afterFirst, 'so it reached the grader again');
  const afterSecond = counts.model;
  // ...a graded one does; then refused 402 before any model call.
  const used = (await db.rpc('assessment_reserve', { p_user: A, p_kind: 'speaking', p_request: 'burn-the-try-1' }, { role: 'service_role' })) as Record<string, unknown>;
  assert.equal(used.ok, true);
  await db.rpc('assessment_finish', { p_user: A, p_kind: 'speaking', p_request: 'burn-the-try-1', p_success: true }, { role: 'service_role' });
  const refused = await submit();
  assert.deepEqual([refused.status, refused.body.code, refused.body.reason, refused.body.kind], [402, 'taster-used', 'taster-used', 'speaking']);
  assert.equal(counts.model, afterSecond, 'refused before any model call');
  await buy(db, A);
  const paid = await submit();
  assert.ok(counts.model > 0, 'paid: it reached the grader (answered 500 here, so no grade)');
  assert.ok(paid.status >= 500);
  assert.equal(counts.rpc.includes('trial_test_lease'), false);
  await db.close();
});

test('live examiner: a paid account opens a full interview under the daily limit; a free one is refused 402; the closer ends paid voice', async () => {
  const db = await createTrialDb();
  await db.addUser(A);
  await db.addUser(B);
  await db.addProfile(A);
  await db.addProfile(B);
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

  const free = await open('token-a');
  assert.deepEqual([free.status, free.body.code], [402, 'paid-required'], 'free: live interviews need paid access');
  assert.equal(live, 0);
  await buy(db, A);
  assert.equal((await open('token-a')).status, 201, 'paid: a full interview, no trial sitting');
  assert.equal((await open('token-a')).status, 201);
  const third = await open('token-a');
  assert.equal(third.status, 429, 'the existing daily limit still applies');
  assert.equal(live, 2);

  // B, free, with an old trial sitting: refused, nothing opened.
  const bSession = await handler.fetch(
    new Request('https://live.test/', {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Authorization: 'Bearer token-b' },
      body: JSON.stringify({ sdp: 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\n', plan: { mode: 'part1', part1TopicIds: [SPEAKING_PART1_TOPICS[0]!.id] }, trialSitting: 'sit-s-paid-b1' }),
    }),
    env,
  );
  assert.equal(bSession.status, 402);

  // Fifteen minutes later the commercial cut-off closes A's paid interviews.
  now = new Date(now.getTime() + 15 * 60_000);
  const swept = await closeOverdueTrialSessions(deps as never, env);
  assert.deepEqual(swept, { closed: 2, failed: 0 });
  assert.deepEqual(closes, ['live_1', 'live_2']);
  await db.close();
});
