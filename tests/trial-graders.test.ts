/* The graders and the live examiner running the trial: the REAL grade-essay handler against
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
import { createHandler as createLiveHandler, closeOverdueTrialSessions } from '../workers/live-examiner/src/index.ts';
import { TRIAL_OFFER, TRIAL_SPEAKING_MINUTES, TRIAL_SPEAKING_MODE, TRIAL_SPEAKING_SESSIONS } from '../src/lib/trial/offer.ts';

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

/* ── Speaking: a Part 1 interview of about five minutes ────────────────
   Alex's decision of 23 September 2026. The live examiner opens a paid voice
   session only for a student's own begun Speaking test, only for Part 1, at
   most twice; a scheduled check hangs up any session older than five
   minutes; the speaking grader uses the test on a grade and keeps it on a
   failure. The open behaviour of both Workers is covered by their own test
   files. */

const OFFER_SDP = 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\n';

async function speakingWorld() {
  const db = await createTrialDb();
  await db.addUser(A);
  await db.addUser(B);
  await db.rpc('trial_start', {}, { userId: A });
  await db.rpc('trial_start', {}, { userId: B });
  const sessions: Record<string, unknown>[] = [];
  const calls = { openAiLive: 0, openAiGrade: 0, closes: [] as string[] };
  const model = { liveStatus: 201 };
  let now = new Date();
  let rowId = 0;
  const matches = (row: Record<string, unknown>, key: string, raw: string) => {
    const value = row[key];
    if (raw === 'is.null') return value === null || value === undefined;
    if (raw === 'not.is.null') return value !== null && value !== undefined;
    const [op, ...rest] = raw.split('.');
    const want = decodeURIComponent(rest.join('.'));
    if (op === 'eq') return String(value) === want;
    if (op === 'gte') return String(value) >= want;
    if (op === 'lt') return String(value) < want;
    return true;
  };
  const fetchFn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (url === `${SUPABASE_URL}/auth/v1/user`) {
      const id = TOKENS[(headers.Authorization ?? '').replace('Bearer ', '')];
      return id ? new Response(JSON.stringify({ id })) : new Response('{}', { status: 401 });
    }
    if (url.startsWith(`${SUPABASE_URL}/rest/v1/rpc/`)) {
      const fn = url.slice(`${SUPABASE_URL}/rest/v1/rpc/`.length);
      try {
        const role = headers.apikey === SERVICE_KEY ? 'service_role' : 'anon';
        return new Response(JSON.stringify(await db.rpc(fn, JSON.parse(String(init?.body)), { role })));
      } catch (err) {
        return new Response('{}', { status: (err as { status?: number }).status ?? 400 });
      }
    }
    if (url.startsWith(`${SUPABASE_URL}/rest/v1/live_examiner_sessions`)) {
      const u = new URL(url);
      const method = init?.method ?? 'GET';
      if (method === 'POST') {
        const row = {
          id: `row_${++rowId}`,
          created_at: now.toISOString(),
          ended_at: null,
          provider_session_id: null,
          ...JSON.parse(String(init?.body)),
        };
        sessions.push(row);
        return new Response(JSON.stringify([row]), { status: 201 });
      }
      const rows = sessions.filter((row) => [...u.searchParams.entries()].every(([k, v]) => k === 'select' || matches(row, k, v)));
      if (method === 'PATCH') {
        for (const row of rows) Object.assign(row, JSON.parse(String(init?.body)));
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify(rows));
    }
    if (url === 'https://api.openai.com/v1/live/sessions') {
      calls.openAiLive += 1;
      if (model.liveStatus !== 201) return new Response('{}', { status: model.liveStatus });
      return new Response(
        JSON.stringify({ session: { id: `live_${calls.openAiLive}` }, transport: { type: 'webrtc', sdp: 'v=0 answer' } }),
        { status: 201 },
      );
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  const deps = {
    fetch: fetchFn,
    now: () => now,
    sideband: async (_env: unknown, sessionId: string, event: Record<string, unknown>) => {
      if (event.type === 'session.close') {
        calls.closes.push(sessionId);
        return { ok: false, error: 'socket closed' };
      }
      return { ok: true };
    },
  };
  const live = createLiveHandler(deps as never);
  const env = {
    ALLOWED_ORIGINS: ORIGIN,
    OPENAI_API_KEY: 'sk-test-dummy',
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    ACCESS_MODE: 'trial',
  } as never;
  const openInterview = async (token: string, sitting: string | undefined, mode = 'part1') => {
    const plan =
      mode === 'part1'
        ? { mode, part1TopicIds: ['p1-work'] }
        : { mode, part1TopicIds: ['p1-work', 'p1-work'], cueCardId: 'unknown' };
    const response = await live.fetch(
      new Request('https://live.test/', {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sdp: OFFER_SDP, plan, ...(sitting ? { trialSitting: sitting } : {}) }),
      }),
      env,
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  /** POST /direct or /end of the live examiner, as the browser sends them. */
  const post = async (path: string, token: string, body: Record<string, unknown>) => {
    const response = await live.fetch(
      new Request(`https://live.test${path}`, {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      }),
      env,
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  const sessionsOf = async (sitting: string) =>
    (
      (await db.select('select sessions from public.trial_usage where request_id = $1', [sitting], {
        role: 'service_role',
      })) as { sessions: number }[]
    )[0]?.sessions ?? null;
  return {
    db,
    calls,
    model,
    sessions,
    openInterview,
    post,
    sessionsOf,
    advance: (minutes: number) => {
      now = new Date(now.getTime() + minutes * 60_000);
    },
    close: () => closeOverdueTrialSessions(deps as never, env),
  };
}

test('the Speaking test is on, as a Part 1 interview of five minutes, two tries at most', () => {
  assert.equal(TRIAL_OFFER.speaking.testEnabled, true);
  assert.equal(TRIAL_SPEAKING_MODE, 'part1');
  assert.equal(TRIAL_SPEAKING_MINUTES, 5);
  assert.equal(TRIAL_SPEAKING_SESSIONS, 2);
});

test('live examiner: no begun Speaking test, or a mode other than Part 1, means no paid session', async () => {
  const w = await speakingWorld();
  assert.equal((await w.openInterview('token-a', undefined)).body.code, 'trial-no-test');
  assert.equal((await w.openInterview('token-a', 'sit-s-00001')).body.code, 'trial-no-test', 'not begun');
  await w.db.rpc('trial_test_begin', { p_section: 'speaking', p_activity: 'speaking-test', p_request: 'sit-s-00001' }, { userId: A });
  const full = await w.openInterview('token-a', 'sit-s-00001', 'full');
  assert.ok(full.status === 400 || full.body.code === 'trial-not-included', 'the full test is not the trial test');
  const part2 = await w.openInterview('token-a', 'sit-s-00001', 'part2');
  assert.ok(part2.status === 400 || part2.body.code === 'trial-not-included');
  assert.equal((await w.openInterview('token-b', 'sit-s-00001')).body.code, 'trial-no-test', "another student cannot use A's test");
  assert.equal(w.calls.openAiLive, 0);
  await w.db.close();
});

test('live examiner: two interviews per Speaking test, and a session that never opened is given back', async () => {
  const w = await speakingWorld();
  await w.db.rpc('trial_test_begin', { p_section: 'speaking', p_activity: 'speaking-test', p_request: 'sit-s-00002' }, { userId: A });
  w.model.liveStatus = 500;
  assert.equal((await w.openInterview('token-a', 'sit-s-00002')).status, 502);
  assert.equal(await w.sessionsOf('sit-s-00002'), 0, 'the failed open used nothing');
  w.model.liveStatus = 201;
  assert.equal((await w.openInterview('token-a', 'sit-s-00002')).status, 201);
  // The first interview ends (the browser reports it), the student retries once.
  for (const row of w.sessions) row.ended_at = new Date().toISOString();
  assert.equal((await w.openInterview('token-a', 'sit-s-00002')).status, 201);
  for (const row of w.sessions) row.ended_at = new Date().toISOString();
  assert.equal((await w.openInterview('token-a', 'sit-s-00002')).body.code, 'trial-sessions-used');
  assert.equal(await w.sessionsOf('sit-s-00002'), 2);
  assert.equal(w.calls.openAiLive, 3, 'one failed open and two real interviews, nothing more');
  await w.db.close();
});

test('live examiner: an interview the examiner never began, ended within 90 seconds, gives the attempt back, and nothing else does', async () => {
  const w = await speakingWorld();
  await w.db.rpc('trial_test_begin', { p_section: 'speaking', p_activity: 'speaking-test', p_request: 'sit-s-00004' }, { userId: A });

  // The student's connection failed before the examiner began: given back.
  assert.equal((await w.openInterview('token-a', 'sit-s-00004')).status, 201);
  assert.equal(await w.sessionsOf('sit-s-00004'), 1);
  const back = await w.post('/end', 'token-a', { sessionId: 'live_1', trialSitting: 'sit-s-00004' });
  assert.equal(back.status, 200);
  assert.deepEqual(back.body, { ok: true, trial: { interviewGivenBack: true } });
  assert.equal(await w.sessionsOf('sit-s-00004'), 0, 'the unused interview is not counted');
  // Reporting the same end again gives nothing more back.
  await w.post('/end', 'token-a', { sessionId: 'live_1', trialSitting: 'sit-s-00004' });
  assert.equal(await w.sessionsOf('sit-s-00004'), 0);

  // The examiner began: the interview counts, however it ends.
  assert.equal((await w.openInterview('token-a', 'sit-s-00004')).status, 201);
  assert.equal((await w.post('/direct', 'token-a', { sessionId: 'live_2', cue: { type: 'begin' } })).status, 200);
  assert.deepEqual((await w.post('/end', 'token-a', { sessionId: 'live_2', trialSitting: 'sit-s-00004' })).body, { ok: true });
  assert.equal(await w.sessionsOf('sit-s-00004'), 1);

  // Never began, but reported after 90 seconds: counts (no free quiet sessions).
  assert.equal((await w.openInterview('token-a', 'sit-s-00004')).status, 201);
  w.advance(2);
  assert.deepEqual((await w.post('/end', 'token-a', { sessionId: 'live_3', trialSitting: 'sit-s-00004' })).body, { ok: true });
  assert.equal(await w.sessionsOf('sit-s-00004'), 2);

  // Another student cannot credit A's test with a session of their own.
  await w.db.rpc('trial_test_begin', { p_section: 'speaking', p_activity: 'speaking-test', p_request: 'sit-s-00005' }, { userId: B });
  assert.equal((await w.openInterview('token-b', 'sit-s-00005')).status, 201);
  assert.deepEqual((await w.post('/end', 'token-b', { sessionId: 'live_4', trialSitting: 'sit-s-00004' })).body, { ok: true });
  assert.equal(await w.sessionsOf('sit-s-00004'), 2, "A's count untouched");
  assert.equal(await w.sessionsOf('sit-s-00005'), 1, "and B's own interview still counts, since B named another test");
  await w.db.close();
});

test('live examiner: the scheduled check hangs up interviews older than five minutes, and only those', async () => {
  const w = await speakingWorld();
  await w.db.rpc('trial_test_begin', { p_section: 'speaking', p_activity: 'speaking-test', p_request: 'sit-s-00003' }, { userId: A });
  await w.openInterview('token-a', 'sit-s-00003');
  w.advance(4);
  assert.deepEqual(await w.close(), { closed: 0, failed: 0 }, 'four minutes in: still talking');
  w.advance(2);
  assert.deepEqual(await w.close(), { closed: 1, failed: 0 });
  assert.deepEqual(w.calls.closes, ['live_1']);
  assert.ok(w.sessions[0].ended_at, 'marked ended');
  assert.deepEqual(await w.close(), { closed: 0, failed: 0 }, 'closed once');
  const open = await closeOverdueTrialSessions(
    { fetch: async () => { throw new Error('the open site must not call anything'); } } as never,
    { ACCESS_MODE: 'open' } as never,
  );
  assert.deepEqual(open, { closed: 0, failed: 0 }, 'on the open site the check does nothing');
  await w.db.close();
});

test('speaking grader: only the begun interview is graded, and a failed grade keeps the Speaking test', async () => {
  const w = await speakingWorld();
  await w.db.rpc('trial_test_begin', { p_section: 'speaking', p_activity: 'speaking-test', p_request: 'sit-s-00004' }, { userId: A });
  let paid = 0;
  const grader = createSpeakingHandler({
    fetch: (async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      if (url === `${SUPABASE_URL}/auth/v1/user`) {
        const id = TOKENS[(headers.Authorization ?? '').replace('Bearer ', '')];
        return id ? new Response(JSON.stringify({ id })) : new Response('{}', { status: 401 });
      }
      if (url.startsWith(`${SUPABASE_URL}/rest/v1/rpc/`)) {
        const fn = url.slice(`${SUPABASE_URL}/rest/v1/rpc/`.length);
        return new Response(JSON.stringify(await w.db.rpc(fn, JSON.parse(String(init?.body)), { role: 'service_role' })));
      }
      paid += 1;
      return new Response('{}', { status: 500 });
    }) as typeof fetch,
    sleep: async () => undefined,
  });
  const submit = async (token: string | null, body: Record<string, unknown>) => {
    const headers: Record<string, string> = { Origin: ORIGIN, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await grader.fetch(
      new Request('https://speaking.test/', { method: 'POST', headers, body: JSON.stringify(body) }),
      {
        ALLOWED_ORIGINS: ORIGIN,
        OPENAI_API_KEY: 'sk-test-dummy',
        ACCESS_MODE: 'trial',
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
      } as never,
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  const clip = { question: 'Tell me about your work.', mimeType: 'audio/mpeg', audioBase64: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA', durationMs: 60000 };
  const interview = {
    kind: 'interview',
    interview: { transcript: [{ role: 'examiner', text: 'Hello.' }, { role: 'candidate', text: 'Hi there.' }], audio: clip },
  };
  assert.equal((await submit(null, { ...interview, trialSitting: 'sit-s-00004' })).status, 401);
  assert.equal(
    (await submit('token-a', { kind: 'part1', part1: { topic: 'x', answers: [clip] }, trialSitting: 'sit-s-00004' })).body.code,
    'trial-not-included',
    'recorded practice is not the trial test',
  );
  assert.equal((await submit('token-a', interview)).body.code, 'trial-no-test');
  assert.equal(paid, 0, 'nothing paid for any of those');
  const failed = await submit('token-a', { ...interview, trialSitting: 'sit-s-00004' });
  assert.ok(failed.status >= 500, `a failed grade (${failed.status})`);
  const status = parseTrialStatus(await w.db.rpc('trial_status', {}, { userId: A }))!;
  assert.equal(status.sections.speaking.test?.status, 'reserved', 'the Speaking test is still theirs to submit');
  await w.db.close();
});
