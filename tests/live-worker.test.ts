import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {
  createHandler,
  resolveProvider,
  buildOpenAiSessionConfig,
  defaultDeps,
} from '../workers/live-examiner/src/index.ts';

const PROD_ORIGIN = 'https://lxson777-tech.github.io';
const WORKER_URL = 'https://ielts-live-examiner.example.workers.dev/';
const DUMMY_OPENAI_KEY = 'sk-test-dummy';
const DUMMY_GEMINI_KEY = 'gk-test-dummy';
const REAL_TOPIC_ID = 'p1-work';
const OFFER_SDP = 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\n';

const SUPABASE_URL = 'https://proj.supabase.co';
const SERVICE_ROLE_KEY = 'service-role-secret-dummy';
const GOOD_TOKEN = 'good-jwt-dummy';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

// Fixed "now" so day-boundary rate limit fixtures are deterministic.
const NOW = new Date('2026-09-13T12:00:00.000Z');

function baseEnv(overrides: Record<string, unknown> = {}) {
  return {
    LIVE_MODEL: 'gemini-live-test-model',
    ALLOWED_ORIGINS: PROD_ORIGIN,
    ...overrides,
  } as never;
}

/** The env a signed-in OpenAI create/direct/end call needs by default. */
function fullEnv(overrides: Record<string, unknown> = {}) {
  return baseEnv({
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
    OPENAI_API_KEY: DUMMY_OPENAI_KEY,
    ...overrides,
  });
}

function req(
  method: string,
  opts: { url?: string; origin?: string | null; authToken?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = {};
  if (opts.origin !== null) headers.Origin = opts.origin ?? PROD_ORIGIN;
  if (opts.authToken !== undefined) headers.Authorization = `Bearer ${opts.authToken}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  return new Request(opts.url ?? WORKER_URL, {
    method,
    headers,
    body: opts.body === undefined ? undefined : typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
  });
}

async function bodyText(res: Response): Promise<string> {
  return res.text();
}

/** A row in the simulated `live_examiner_sessions` table. `id` is the
    internal row id (what reservations/patches address); `provider_session_id`
    is the OpenAI session id (what /direct and /end are called with, since
    the browser only ever learns the OpenAI id, never our row id). */
function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row_1',
    user_id: USER_ID,
    created_at: NOW.toISOString(),
    ended_at: null,
    stage: 'created',
    mode: 'part1',
    provider_session_id: 'live_1',
    ...overrides,
  };
}

interface FakeCall {
  method: string;
  url: string;
  body?: unknown;
}

interface FakeFetchOptions {
  authOkFor?: string;
  userId?: string;
  sessionsRows?: unknown[];
  createdRows?: unknown[];
  openai?: { status: number; body: unknown } | 'network-error';
  calls?: FakeCall[];
}

/** Minimal PostgREST-style filter matcher: `field=eq.value`, `is.null`,
    `gte.value`, `lte.value`, `gt.value`, `lt.value`. Good enough to answer
    the handful of filter shapes the Worker actually sends. */
function matchesFilter(row: Record<string, unknown>, field: string, raw: string): boolean {
  const dot = raw.indexOf('.');
  const op = dot === -1 ? raw : raw.slice(0, dot);
  const value = dot === -1 ? '' : raw.slice(dot + 1);
  const rowValue = row[field];
  switch (op) {
    case 'eq':
      return String(rowValue) === value;
    case 'is':
      return value === 'null' ? rowValue === null || rowValue === undefined : String(rowValue) === value;
    case 'gte':
      return typeof rowValue === 'string' && rowValue >= value;
    case 'lte':
      return typeof rowValue === 'string' && rowValue <= value;
    case 'gt':
      return typeof rowValue === 'string' && rowValue > value;
    case 'lt':
      return typeof rowValue === 'string' && rowValue < value;
    default:
      return true;
  }
}

const NON_FILTER_KEYS = new Set(['select', 'order', 'limit', 'offset']);

function filterRows(rows: unknown[], search: URLSearchParams): unknown[] {
  return rows.filter((row) => {
    if (typeof row !== 'object' || row === null) return false;
    const rec = row as Record<string, unknown>;
    for (const [key, raw] of search.entries()) {
      if (NON_FILTER_KEYS.has(key)) continue;
      if (!matchesFilter(rec, key, raw)) return false;
    }
    return true;
  });
}

/** A fake `fetch` that answers the three upstream services the Worker talks
    to (Supabase auth, the sessions table, and OpenAI), routed by URL. GET
    against the sessions table actually applies the request's PostgREST-style
    filters against one configured "table" of rows, since the real handler
    issues several differently-filtered GET queries against the same URL
    (active count, per-user-per-day count, site-per-day count, lookup by
    provider_session_id) and a filter-blind fake would answer them all
    identically. */
function makeFakeFetch(opts: FakeFetchOptions = {}): typeof fetch {
  const calls = opts.calls ?? [];
  const sessionsRows = opts.sessionsRows ?? [];
  const createdRows = opts.createdRows ?? [sessionRow()];

  return (async (input: unknown, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = (init?.method || 'GET').toUpperCase();
    let parsedBody: unknown;
    if (init?.body !== undefined) {
      try {
        parsedBody = JSON.parse(String(init.body));
      } catch {
        parsedBody = String(init.body);
      }
    }
    calls.push({ method, url: url.toString(), body: parsedBody });

    if (url.pathname === '/auth/v1/user') {
      const authHeader = new Headers(init?.headers).get('Authorization') ?? '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      if (opts.authOkFor && token === opts.authOkFor) {
        return new Response(JSON.stringify({ id: opts.userId }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'invalid token' }), { status: 401 });
    }

    if (url.pathname === '/rest/v1/live_examiner_sessions') {
      if (method === 'GET') return new Response(JSON.stringify(filterRows(sessionsRows, url.searchParams)), { status: 200 });
      if (method === 'POST') return new Response(JSON.stringify(createdRows), { status: 201 });
      if (method === 'PATCH') return new Response(JSON.stringify(createdRows), { status: 200 });
    }

    if (url.toString() === 'https://api.openai.com/v1/live/sessions' && method === 'POST') {
      if (opts.openai === 'network-error' || !opts.openai) throw new Error('network down');
      return new Response(JSON.stringify(opts.openai.body), { status: opts.openai.status });
    }

    throw new Error(`FakeFetch: unexpected request ${method} ${url.toString()}`);
  }) as typeof fetch;
}

function makeFakeSideband(result: { ok: boolean; error?: string } = { ok: true }) {
  const calls: { sessionId: string; event: Record<string, unknown> }[] = [];
  const fn = async (_env: unknown, sessionId: string, event: Record<string, unknown>) => {
    calls.push({ sessionId, event });
    return result;
  };
  return { fn, calls };
}

const throwingFetch = (async () => {
  throw new Error('FakeFetch: no network call was expected in this test');
}) as typeof fetch;

function handlerWith(opts: { fetch?: typeof fetch; sideband?: ReturnType<typeof makeFakeSideband>['fn'] } = {}) {
  return createHandler({
    fetch: opts.fetch ?? throwingFetch,
    sideband: opts.sideband ?? makeFakeSideband().fn,
    now: () => NOW,
  });
}

// ---- GET (config) ----

test('GET config includes requiresSignIn: true for openai and false for gemini', async () => {
  const handler = handlerWith();

  const openaiRes = await handler.fetch(req('GET'), baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY }));
  assert.equal(openaiRes.status, 200);
  const openaiData = await openaiRes.json();
  assert.equal(openaiData.requiresSignIn, true);

  const geminiRes = await handler.fetch(
    req('GET'),
    baseEnv({ LIVE_PROVIDER: 'gemini', GEMINI_API_KEY: DUMMY_GEMINI_KEY }),
  );
  assert.equal(geminiRes.status, 200);
  const geminiData = await geminiRes.json();
  assert.equal(geminiData.requiresSignIn, false);
});

test('resolveProvider mirrors the GET behaviour for valid and invalid providers', () => {
  assert.equal(resolveProvider(baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY })), 'openai');
  assert.equal(resolveProvider(baseEnv({ LIVE_PROVIDER: 'gemini', GEMINI_API_KEY: DUMMY_GEMINI_KEY })), 'gemini');
  assert.equal(resolveProvider(baseEnv({ LIVE_PROVIDER: 'foo' })), null);
});

// ---- Origins ----

test('a local dev request is allowed when its own hostname is local and its Origin is in LOCAL_ORIGINS', async () => {
  const handler = handlerWith();
  const env = baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY, LOCAL_ORIGINS: 'http://localhost:4322' });
  const res = await handler.fetch(
    req('GET', { url: 'http://127.0.0.1:8788/', origin: 'http://localhost:4322' }),
    env,
  );
  assert.equal(res.status, 200);
});

test('LOCAL_ORIGINS is not honoured once the request itself is not on a local hostname', async () => {
  const handler = handlerWith();
  const env = baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY, LOCAL_ORIGINS: 'http://localhost:4322' });
  const res = await handler.fetch(req('GET', { url: WORKER_URL, origin: 'http://localhost:4322' }), env);
  assert.equal(res.status, 403);
});

test('the production origin is allowed against the deployed workers.dev URL', async () => {
  const handler = handlerWith();
  const env = baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY });
  const res = await handler.fetch(req('GET', { url: WORKER_URL, origin: PROD_ORIGIN }), env);
  assert.equal(res.status, 200);
});

test('a request with no Origin header is always rejected', async () => {
  const handler = handlerWith();
  const env = baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY });
  const res = await handler.fetch(req('GET', { url: WORKER_URL, origin: null }), env);
  assert.equal(res.status, 403);
});

// ---- POST create: auth and config errors ----

test('POST create without SUPABASE_SERVICE_ROLE_KEY returns 503 and never calls OpenAI', async () => {
  const calls: FakeCall[] = [];
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [],
    openai: { status: 201, body: { session: { id: 'live_1' }, transport: { type: 'webrtc', sdp: 'v=0 answer' } } },
    calls,
  });
  const handler = handlerWith({ fetch: fetchFn });
  const env = fullEnv({ SUPABASE_SERVICE_ROLE_KEY: undefined });
  const res = await handler.fetch(
    req('POST', { authToken: GOOD_TOKEN, body: { sdp: OFFER_SDP, plan: { mode: 'part1', part1TopicIds: [REAL_TOPIC_ID] } } }),
    env,
  );
  assert.equal(res.status, 503);
  assert.ok(!calls.some((c) => c.url === 'https://api.openai.com/v1/live/sessions'));
});

test('POST create without an Authorization header returns 401 and never calls OpenAI', async () => {
  const calls: FakeCall[] = [];
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [],
    openai: { status: 201, body: { session: { id: 'live_1' }, transport: { type: 'webrtc', sdp: 'v=0 answer' } } },
    calls,
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { body: { sdp: OFFER_SDP, plan: { mode: 'part1', part1TopicIds: [REAL_TOPIC_ID] } } }),
    fullEnv(),
  );
  assert.equal(res.status, 401);
  assert.ok(!calls.some((c) => c.url === 'https://api.openai.com/v1/live/sessions'));
});

test('POST create with a bad bearer token returns 401 and never leaks the token or key', async () => {
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [],
    openai: { status: 201, body: { session: { id: 'live_1' }, transport: { type: 'webrtc', sdp: 'v=0 answer' } } },
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', {
      authToken: 'not-the-real-token',
      body: { sdp: OFFER_SDP, plan: { mode: 'part1', part1TopicIds: [REAL_TOPIC_ID] } },
    }),
    fullEnv(),
  );
  assert.equal(res.status, 401);
  const text = await bodyText(res);
  assert.ok(!text.includes(SERVICE_ROLE_KEY));
  assert.ok(!text.includes(DUMMY_OPENAI_KEY));
});

// ---- POST create: rate limits ----

test('POST create is blocked with 429 when the user already has a live session running', async () => {
  const twoMinAgo = new Date(NOW.getTime() - 2 * 60_000).toISOString();
  const calls: FakeCall[] = [];
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [sessionRow({ id: 'row_active', created_at: twoMinAgo, ended_at: null })],
    openai: { status: 201, body: { session: { id: 'live_x' }, transport: { type: 'webrtc', sdp: 'v=0 answer' } } },
    calls,
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { authToken: GOOD_TOKEN, body: { sdp: OFFER_SDP, plan: { mode: 'part1', part1TopicIds: [REAL_TOPIC_ID] } } }),
    fullEnv(),
  );
  assert.equal(res.status, 429);
  const text = await bodyText(res);
  assert.ok(/already have a live session/i.test(text), `expected the 'already have a live session' message, got: ${text}`);
  assert.ok(!calls.some((c) => c.url === 'https://api.openai.com/v1/live/sessions'));
});

test('POST create is blocked with 429 once the user hits their per-day cap', async () => {
  const rows = Array.from({ length: 4 }, (_, i) =>
    sessionRow({ id: `row_${i}`, created_at: NOW.toISOString(), ended_at: NOW.toISOString() }),
  );
  const calls: FakeCall[] = [];
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: rows,
    openai: { status: 201, body: { session: { id: 'live_x' }, transport: { type: 'webrtc', sdp: 'v=0 answer' } } },
    calls,
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { authToken: GOOD_TOKEN, body: { sdp: OFFER_SDP, plan: { mode: 'part1', part1TopicIds: [REAL_TOPIC_ID] } } }),
    fullEnv(),
  );
  assert.equal(res.status, 429);
  assert.ok(!calls.some((c) => c.url === 'https://api.openai.com/v1/live/sessions'));
});

test('POST create is blocked with 429 once the site hits its per-day cap', async () => {
  const rows = Array.from({ length: 60 }, (_, i) =>
    sessionRow({ id: `row_${i}`, user_id: `other-user-${i}`, created_at: NOW.toISOString(), ended_at: NOW.toISOString() }),
  );
  const calls: FakeCall[] = [];
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: rows,
    openai: { status: 201, body: { session: { id: 'live_x' }, transport: { type: 'webrtc', sdp: 'v=0 answer' } } },
    calls,
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { authToken: GOOD_TOKEN, body: { sdp: OFFER_SDP, plan: { mode: 'part1', part1TopicIds: [REAL_TOPIC_ID] } } }),
    fullEnv(),
  );
  assert.equal(res.status, 429);
  assert.ok(!calls.some((c) => c.url === 'https://api.openai.com/v1/live/sessions'));
});

// ---- POST create: happy path and OpenAI failure ----

test('POST create happy path reserves a row before calling OpenAI, patches it with the provider session id after, and restricts the client to mute/unmute/close', async () => {
  const calls: FakeCall[] = [];
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [],
    createdRows: [sessionRow({ id: 'row_1' })],
    openai: { status: 201, body: { session: { id: 'live_1' }, transport: { type: 'webrtc', sdp: 'v=0 answer' } } },
    calls,
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { authToken: GOOD_TOKEN, body: { sdp: OFFER_SDP, plan: { mode: 'part1', part1TopicIds: [REAL_TOPIC_ID] } } }),
    fullEnv(),
  );
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.deepEqual(data, {
    provider: 'openai',
    session: { id: 'live_1' },
    transport: { type: 'webrtc', sdp: 'v=0 answer' },
    model: 'gpt-live-1',
  });

  const reservePostIndex = calls.findIndex((c) => c.method === 'POST' && c.url.includes('live_examiner_sessions'));
  const openaiIndex = calls.findIndex((c) => c.url === 'https://api.openai.com/v1/live/sessions');
  const patchIndex = calls.findIndex((c) => c.method === 'PATCH' && c.url.includes('live_examiner_sessions'));
  assert.ok(reservePostIndex !== -1, 'expected a reservation POST to the sessions table');
  assert.ok(openaiIndex !== -1, 'expected a call to OpenAI');
  assert.ok(patchIndex !== -1, 'expected a PATCH after OpenAI responded');
  assert.ok(reservePostIndex < openaiIndex, 'the reservation must be written before calling OpenAI');
  assert.ok(patchIndex > openaiIndex, 'the provider session id must be patched in after OpenAI responds');

  const patchCall = calls[patchIndex];
  assert.equal((patchCall.body as Record<string, unknown>).provider_session_id, 'live_1');
  assert.ok(patchCall.url.includes('row_1'), 'expected the patch to target the reserved row');

  const openaiBody = calls[openaiIndex].body as any;
  assert.deepEqual(
    [...openaiBody.session.client.data_channel.allowed_client_events].sort(),
    ['session.close', 'session.input_audio.mute', 'session.input_audio.unmute'],
  );
});

test('POST create ends the reserved row when OpenAI fails, and reports 502 without leaking secrets', async () => {
  const calls: FakeCall[] = [];
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [],
    createdRows: [sessionRow({ id: 'row_1' })],
    openai: { status: 500, body: { error: 'boom' } },
    calls,
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { authToken: GOOD_TOKEN, body: { sdp: OFFER_SDP, plan: { mode: 'part1', part1TopicIds: [REAL_TOPIC_ID] } } }),
    fullEnv(),
  );
  assert.equal(res.status, 502);
  const text = await bodyText(res);
  assert.ok(!text.includes(SERVICE_ROLE_KEY));
  assert.ok(!text.includes(DUMMY_OPENAI_KEY));

  const patchCall = calls.find((c) => c.method === 'PATCH' && c.url.includes('live_examiner_sessions'));
  assert.ok(patchCall, 'expected the reservation to be patched to an ended state after the OpenAI failure');
  assert.ok((patchCall!.body as Record<string, unknown>).ended_at, 'expected ended_at to be set');
});

// ---- POST /direct ----

const DIRECT_URL = `${WORKER_URL}direct`;

test('POST /direct without an Authorization header returns 401', async () => {
  const handler = handlerWith();
  const res = await handler.fetch(
    req('POST', { url: DIRECT_URL, body: { sessionId: 'live_1', cue: { type: 'begin' } } }),
    fullEnv(),
  );
  assert.equal(res.status, 401);
});

test('POST /direct for an unknown session returns 404', async () => {
  const fetchFn = makeFakeFetch({ authOkFor: GOOD_TOKEN, userId: USER_ID, sessionsRows: [] });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { url: DIRECT_URL, authToken: GOOD_TOKEN, body: { sessionId: 'missing', cue: { type: 'begin' } } }),
    fullEnv(),
  );
  assert.equal(res.status, 404);
});

test('POST /direct for another user\'s session returns 403', async () => {
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [sessionRow({ user_id: OTHER_USER_ID, stage: 'created', ended_at: null })],
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { url: DIRECT_URL, authToken: GOOD_TOKEN, body: { sessionId: 'live_1', cue: { type: 'begin' } } }),
    fullEnv(),
  );
  assert.equal(res.status, 403);
});

test('POST /direct for an already-ended session returns 409', async () => {
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [sessionRow({ user_id: USER_ID, stage: 'wrapup', ended_at: NOW.toISOString() })],
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { url: DIRECT_URL, authToken: GOOD_TOKEN, body: { sessionId: 'live_1', cue: { type: 'conclude', reason: 'time' } } }),
    fullEnv(),
  );
  assert.equal(res.status, 409);
});

test('POST /direct with a valid begin cue on a created part1 session advances the stage and relays a director instruction', async () => {
  const calls: FakeCall[] = [];
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [sessionRow({ user_id: USER_ID, stage: 'created', mode: 'part1', ended_at: null, provider_session_id: 'live_1' })],
    calls,
  });
  const { fn: sideband, calls: sidebandCalls } = makeFakeSideband();
  const handler = handlerWith({ fetch: fetchFn, sideband });
  const res = await handler.fetch(
    req('POST', { url: DIRECT_URL, authToken: GOOD_TOKEN, body: { sessionId: 'live_1', cue: { type: 'begin' } } }),
    fullEnv(),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data, { ok: true, stage: 'part1' });

  assert.equal(sidebandCalls.length, 1, 'expected sideband to be called exactly once');
  assert.equal(sidebandCalls[0].sessionId, 'live_1');
  const event = sidebandCalls[0].event as Record<string, unknown>;
  assert.equal(event.type, 'session.instructions.append');
  assert.equal(event.delegation_id, null);
  assert.ok(String(event.content).startsWith('[DIRECTOR]'));

  const patchCall = calls.find((c) => c.method === 'PATCH' && c.url.includes('live_examiner_sessions'));
  assert.ok(patchCall, 'expected the stage to be patched');
  assert.equal((patchCall!.body as Record<string, unknown>).stage, 'part1');
  assert.ok(patchCall!.url.includes('row_1'), 'expected the patch to target the internal row id, not the provider session id');
});

test('POST /direct with begin again on an already-begun session returns 409 and never calls sideband', async () => {
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [sessionRow({ user_id: USER_ID, stage: 'part1', mode: 'part1', ended_at: null, provider_session_id: 'live_1' })],
  });
  const { fn: sideband, calls: sidebandCalls } = makeFakeSideband();
  const handler = handlerWith({ fetch: fetchFn, sideband });
  const res = await handler.fetch(
    req('POST', { url: DIRECT_URL, authToken: GOOD_TOKEN, body: { sessionId: 'live_1', cue: { type: 'begin' } } }),
    fullEnv(),
  );
  assert.equal(res.status, 409);
  assert.equal(sidebandCalls.length, 0);
});

test('POST /direct with a delegation cue relays a thinking append and leaves the stage unchanged', async () => {
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [sessionRow({ user_id: USER_ID, stage: 'part1', mode: 'part1', ended_at: null, provider_session_id: 'live_1' })],
  });
  const { fn: sideband, calls: sidebandCalls } = makeFakeSideband();
  const handler = handlerWith({ fetch: fetchFn, sideband });
  const res = await handler.fetch(
    req('POST', {
      url: DIRECT_URL,
      authToken: GOOD_TOKEN,
      body: { sessionId: 'live_1', cue: { type: 'delegation', delegationId: 'item_1' } },
    }),
    fullEnv(),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data, { ok: true, stage: 'part1' });

  assert.equal(sidebandCalls.length, 1);
  const event = sidebandCalls[0].event as Record<string, unknown>;
  assert.equal(event.type, 'session.thinking.append');
  assert.equal(event.delegation_id, 'item_1');
});

test('POST /direct with an invalid cue returns 400', async () => {
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [sessionRow({ user_id: USER_ID, stage: 'created', mode: 'part1', ended_at: null })],
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { url: DIRECT_URL, authToken: GOOD_TOKEN, body: { sessionId: 'live_1', cue: { type: 'fly' } } }),
    fullEnv(),
  );
  assert.equal(res.status, 400);
});

test('POST /direct returns 502 and does not patch the stage when the sideband delivery fails', async () => {
  const calls: FakeCall[] = [];
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [sessionRow({ user_id: USER_ID, stage: 'created', mode: 'part1', ended_at: null, provider_session_id: 'live_1' })],
    calls,
  });
  const { fn: sideband } = makeFakeSideband({ ok: false, error: 'delegation stream closed' });
  const handler = handlerWith({ fetch: fetchFn, sideband });
  const res = await handler.fetch(
    req('POST', { url: DIRECT_URL, authToken: GOOD_TOKEN, body: { sessionId: 'live_1', cue: { type: 'begin' } } }),
    fullEnv(),
  );
  assert.equal(res.status, 502);
  const stagePatch = calls.find(
    (c) => c.method === 'PATCH' && c.url.includes('live_examiner_sessions') && 'stage' in ((c.body as Record<string, unknown>) ?? {}),
  );
  assert.ok(!stagePatch, 'the stage must not be patched when the sideband delivery failed');
});

// ---- POST /end ----

const END_URL = `${WORKER_URL}end`;

test('POST /end by the owner ends the session', async () => {
  const calls: FakeCall[] = [];
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [sessionRow({ user_id: USER_ID, stage: 'part3', ended_at: null })],
    calls,
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { url: END_URL, authToken: GOOD_TOKEN, body: { sessionId: 'live_1' } }),
    fullEnv(),
  );
  assert.equal(res.status, 200);
  const patchCall = calls.find((c) => c.method === 'PATCH' && c.url.includes('live_examiner_sessions'));
  assert.ok(patchCall);
  assert.ok((patchCall!.body as Record<string, unknown>).ended_at);
  assert.equal((patchCall!.body as Record<string, unknown>).stage, 'ended');
});

test('POST /end by another user is refused with 403', async () => {
  const fetchFn = makeFakeFetch({
    authOkFor: GOOD_TOKEN,
    userId: USER_ID,
    sessionsRows: [sessionRow({ user_id: OTHER_USER_ID, stage: 'part3', ended_at: null })],
  });
  const handler = handlerWith({ fetch: fetchFn });
  const res = await handler.fetch(
    req('POST', { url: END_URL, authToken: GOOD_TOKEN, body: { sessionId: 'live_1' } }),
    fullEnv(),
  );
  assert.equal(res.status, 403);
});

// ---- POST gemini (rollback path stays sign-in free) ----

test('POST gemini with an empty body still mints a token from the auth_tokens endpoint without requiring sign-in', async () => {
  const calls: string[] = [];
  const fetchFn = (async (url: unknown) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ name: 'auth_tokens/abc' }), { status: 200 });
  }) as typeof fetch;
  const handler = handlerWith({ fetch: fetchFn });
  const env = baseEnv({ LIVE_PROVIDER: 'gemini', GEMINI_API_KEY: DUMMY_GEMINI_KEY });
  const res = await handler.fetch(req('POST', { body: {} }), env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.provider, 'gemini');
  assert.equal(data.token, 'auth_tokens/abc');
  assert.equal(calls.length, 1);
  assert.equal(calls[0], 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens');
});

test('POST gemini without GEMINI_API_KEY returns 503', async () => {
  const handler = handlerWith();
  const env = baseEnv({ LIVE_PROVIDER: 'gemini' });
  const res = await handler.fetch(req('POST', { body: {} }), env);
  assert.equal(res.status, 503);
});

// ---- buildOpenAiSessionConfig ----

test('buildOpenAiSessionConfig mirrors the delegation shape used by the POST handler', () => {
  const withoutBackend = buildOpenAiSessionConfig(baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY }), 'some instructions');
  assert.equal((withoutBackend as any).delegation.type, 'client');

  const withBackend = buildOpenAiSessionConfig(
    baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY, OPENAI_BACKEND_MODEL: 'gpt-5.6-luna' }),
    'some instructions',
  );
  assert.equal((withBackend as any).delegation.type, 'responses');
  assert.equal((withBackend as any).delegation.responses.model, 'gpt-5.6-luna');
});

// ---- defaultDeps / default export wiring ----

test('defaultDeps provides real implementations for fetch, sideband and now', () => {
  assert.equal(typeof defaultDeps.fetch, 'function');
  assert.equal(typeof defaultDeps.sideband, 'function');
  assert.equal(typeof defaultDeps.now, 'function');
  assert.ok(defaultDeps.now() instanceof Date);
});

// ---- Method handling (default export, no network needed) ----

test('OPTIONS returns 204', async () => {
  const env = baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY });
  const res = await worker.fetch(req('OPTIONS'), env);
  assert.equal(res.status, 204);
});

test('an unsupported method returns 405', async () => {
  const env = baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY });
  const res = await worker.fetch(req('PUT'), env);
  assert.equal(res.status, 405);
});
