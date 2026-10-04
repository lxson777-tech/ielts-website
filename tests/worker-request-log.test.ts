/* The Workers' structured log lines and the live examiner's /report route
   (4 October 2026). See src/lib/observability/request-log.ts and
   src/lib/speaking/live/connection-report.ts. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  callLabel,
  createTrace,
  errorName,
  logScheduled,
  maskPath,
  routeLabel,
  timedFetch,
  withRequestLog,
  MAX_CALLS,
} from '../src/lib/observability/request-log.ts';
import { createLoggedHandler as liveLogged, reportAllowed, runScheduled, defaultDeps as liveDefaults } from '../workers/live-examiner/src/index.ts';
import { createLoggedHandler as essayLogged } from '../workers/grade-essay/src/index.ts';
import { createLoggedHandler as speakingLogged, openAiErrorCode } from '../workers/grade-speaking/src/index.ts';
import { createLoggedHandler as tutorLogged } from '../workers/mr-ez/src/index.ts';
import { createLoggedHandler as supportLogged } from '../workers/support/src/index.ts';
import { createLoggedHandler as gateLogged } from '../workers/content-gate/src/index.ts';
import { createLoggedHandler as paymentsLogged } from '../workers/payments/src/index.ts';
import { REPORT_VERSION } from '../src/lib/speaking/live/connection-report.ts';

const ORIGIN = 'https://lxson777-tech.github.io';
const USER_ID = '11111111-1111-4111-8111-111111111111';

/** Console.log captured for one test, restored after. */
function captureConsole(t: { after(fn: () => void): void }) {
  const lines: unknown[][] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args);
  };
  t.after(() => {
    console.log = original;
  });
  return lines;
}

/* ── the helper itself ─────────────────────────────────────────────────── */

test('routes and call labels never carry a query string, and id-shaped parts are masked', () => {
  assert.equal(routeLabel('https://w.example/audio/test-001.mp3?exp=123&sig=abcdefghijklmnopqrstuv'), '/audio/test-001.mp3');
  assert.equal(routeLabel('https://w.example/'), '/');
  assert.equal(maskPath('/sessions/11111111-1111-4111-8111-111111111111/attach'), '/sessions/:id/attach');
  assert.equal(maskPath('/u/someone@example.com'), '/u/:id');
  assert.equal(maskPath('/x/a1b2c3d4e5f6g7h8i9j0k1'), '/x/:id');
  /* Table and function names stay readable. */
  assert.equal(maskPath('/rest/v1/rpc/assessment_provider_usage'), '/rest/v1/rpc/assessment_provider_usage');
  assert.equal(callLabel('https://api.openai.com/v1/responses'), 'openai /v1/responses');
  assert.equal(
    callLabel(`https://proj.supabase.co/rest/v1/live_examiner_sessions?user_id=eq.${USER_ID}&select=id`),
    'supabase /rest/v1/live_examiner_sessions',
  );
  assert.equal(
    callLabel('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'),
    'gemini /v1beta/models/gemini-2.5-flash:generateContent',
  );
  assert.equal(callLabel('https://lxson777-tech.github.io/ielts-website/data/tests/reading-full-001.json'), 'site /ielts-website/data/tests/reading-full-001.json');
});

test('timedFetch times every call, records a thrown call as status 0, and passes the response through', async () => {
  let clock = 1000;
  const trace = createTrace();
  const fake = (async (input: unknown) => {
    clock += 250;
    if (String(input).includes('down')) throw new TypeError('network');
    return new Response('ok', { status: 201 });
  }) as typeof fetch;
  const timed = timedFetch(fake, trace, () => clock);
  const resp = await timed('https://api.openai.com/v1/responses', { method: 'POST', body: 'an essay that must not be logged' });
  assert.equal(resp.status, 201);
  assert.equal(await resp.text(), 'ok');
  await assert.rejects(timed('https://down.supabase.co/rest/v1/rpc/x'), TypeError);
  assert.deepEqual(trace.calls, [
    { to: 'openai /v1/responses', status: 201, ms: 250 },
    { to: 'supabase /rest/v1/rpc/x', status: 0, ms: 250 },
  ]);
  assert.doesNotMatch(JSON.stringify(trace.calls), /essay/);
});

test('trace fields are clamped, the line skeleton cannot be overwritten, and calls are capped', () => {
  const trace = createTrace();
  trace.set('task', 'x'.repeat(200));
  trace.set('status', 999);
  trace.set('bad key', 'nope');
  trace.set('samples', 3);
  assert.equal(String(trace.fields.task).length, 60);
  assert.equal('status' in trace.fields, false);
  assert.equal('bad key' in trace.fields, false);
  assert.equal(trace.fields.samples, 3);
  for (let i = 0; i < MAX_CALLS + 5; i++) trace.call({ to: 'openai /v1/responses', status: 200, ms: 1 });
  assert.equal(trace.calls.length, MAX_CALLS);
  assert.equal(trace.dropped, 5);
});

test('withRequestLog writes one line per request, none for a preflight, and a 500 line for a throw', async () => {
  const lines: Record<string, unknown>[] = [];
  let clock = 0;
  const handler = withRequestLog<unknown>(
    'demo',
    async (request, _env, trace) => {
      clock += 40;
      if (new URL(request.url).pathname === '/boom') throw new SyntaxError('Unexpected token in "my secret essay"');
      trace.set('task', 'welcome');
      trace.call({ to: 'openai /v1/responses', status: 200, ms: 30 });
      return new Response('{}', { status: 200 });
    },
    { now: () => clock, log: (line) => lines.push(line) },
  );
  await handler(new Request('https://w.example/?token=abc', { method: 'POST', body: 'secret' }), {});
  await handler(new Request('https://w.example/', { method: 'OPTIONS' }), {});
  await assert.rejects(handler(new Request('https://w.example/boom', { method: 'POST' }), {}), SyntaxError);
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[0], {
    event: 'request',
    worker: 'demo',
    method: 'POST',
    route: '/',
    status: 200,
    ms: 40,
    task: 'welcome',
    calls: [{ to: 'openai /v1/responses', status: 200, ms: 30 }],
  });
  assert.equal(lines[1]!.status, 500);
  assert.equal(lines[1]!.error, 'SyntaxError');
  assert.doesNotMatch(JSON.stringify(lines), /secret|token=/);
  assert.equal(errorName(new RangeError('x')), 'RangeError');
  assert.equal(errorName('a string'), 'string');
});

test('a scheduled run logs one line, or none when told the run was quiet', async () => {
  const lines: Record<string, unknown>[] = [];
  await logScheduled('demo', async () => ({ closed: 0, failed: 0 }), { log: (l) => lines.push(l), skip: (r) => r.closed === 0 && r.failed === 0 });
  assert.equal(lines.length, 0);
  await logScheduled('demo', async () => ({ closed: 2, failed: 0 }), { log: (l) => lines.push(l), skip: (r) => r.closed === 0 && r.failed === 0 });
  assert.equal(lines.length, 1);
  assert.equal(lines[0]!.event, 'scheduled');
  assert.equal(lines[0]!.closed, 2);
});

/* ── each Worker's deployed handler ────────────────────────────────────── */

test('grade-essay logs the task, provider, model and status, never the essay', async (t) => {
  const lines = captureConsole(t);
  const essay = 'My private essay about my family in Almaty. '.repeat(10);
  const handler = essayLogged({ fetch: (async () => { throw new Error('no network expected'); }) as typeof fetch });
  const resp = await handler(
    new Request('https://grade.example/', {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: { task: 'task2', promptHtml: '<p>Q</p>', minWords: 250 }, essay }),
    }),
    { ALLOWED_ORIGINS: ORIGIN, GRADER_PROVIDER: 'openai', OPENAI_MODEL: 'gpt-5.6-sol' } as never,
  );
  assert.equal(resp.status, 503); // no key configured: answered before any model call
  const line = lines.map((l) => l[0]).find((l) => (l as { event?: string })?.event === 'request') as Record<string, unknown>;
  assert.ok(line, 'one request line');
  assert.equal(line.worker, 'grade-essay');
  assert.equal(line.task, 'task2');
  assert.equal(line.provider, 'openai');
  assert.equal(line.model, 'gpt-5.6-sol');
  assert.equal(line.status, 503);
  assert.doesNotMatch(JSON.stringify(lines), /private essay|Almaty/);
});

test('grade-speaking logs the kind and the clip count, never the transcript or the audio', async (t) => {
  const lines = captureConsole(t);
  const handler = speakingLogged({ fetch: (async () => { throw new Error('no network expected'); }) as typeof fetch });
  const resp = await handler(
    new Request('https://speak.example/', {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'interview',
        interview: {
          transcript: [{ role: 'candidate', text: 'My name is Aigerim and I live on Abay street' }],
          audio: { audioBase64: 'SUQzBAAAAAAA', mimeType: 'audio/mpeg', durationMs: 1000 },
        },
      }),
    }),
    { ALLOWED_ORIGINS: ORIGIN, GRADER_PROVIDER: 'openai' } as never,
  );
  assert.equal(resp.status, 503); // no key configured
  const line = lines.map((l) => l[0]).find((l) => (l as { event?: string })?.event === 'request') as Record<string, unknown>;
  assert.equal(line.worker, 'grade-speaking');
  assert.equal(line.status, 503);
  assert.doesNotMatch(JSON.stringify(lines), /Aigerim|Abay|SUQzBAAA/);
});

test("an OpenAI error body is reduced to OpenAI's own type and code before it is logged", () => {
  assert.equal(
    openAiErrorCode(JSON.stringify({ error: { type: 'invalid_request_error', code: 'invalid_value', message: 'Your text "my essay" is bad' } })),
    'invalid_request_error/invalid_value',
  );
  assert.equal(openAiErrorCode('<html>my essay</html>'), 'unreadable');
  assert.equal(openAiErrorCode(JSON.stringify({ error: { type: 'a b "c"', code: null } })), '-/-');
});

/** Answers the three services a live session create talks to. */
function liveFetch(calls: string[]): typeof fetch {
  return (async (input: unknown, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push(`${method} ${url.pathname}`);
    if (url.pathname === '/auth/v1/user') return new Response(JSON.stringify({ id: USER_ID }), { status: 200 });
    if (url.pathname === '/rest/v1/live_examiner_sessions') {
      if (method === 'GET') return new Response('[]', { status: 200 });
      if (method === 'POST') return new Response(JSON.stringify([{ id: 'row_1' }]), { status: 201 });
      return new Response(null, { status: 204 });
    }
    if (url.href === 'https://api.openai.com/v1/live/sessions') {
      return new Response(JSON.stringify({ session: { id: 'live_1' }, transport: { type: 'webrtc', sdp: 'v=0\r\nanswer' } }), { status: 201 });
    }
    throw new Error(`unexpected ${method} ${url.href}`);
  }) as typeof fetch;
}

const liveEnv = {
  LIVE_MODEL: 'gemini-test',
  ALLOWED_ORIGINS: ORIGIN,
  SUPABASE_URL: 'https://proj.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-dummy',
  OPENAI_API_KEY: 'sk-test-dummy',
} as never;

test('live-examiner logs how long the session broker and each service call took, with no ids, SDP or token', async (t) => {
  const lines = captureConsole(t);
  const calls: string[] = [];
  const handler = liveLogged({ fetch: liveFetch(calls), sideband: async () => ({ ok: true }), now: () => new Date('2026-10-03T15:00:00Z') });
  const resp = await handler(
    new Request('https://live.example/', {
      method: 'POST',
      headers: { Origin: ORIGIN, Authorization: 'Bearer good-jwt-dummy', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\n', plan: { mode: 'part1', part1TopicIds: ['p1-work'] } }),
    }),
    liveEnv,
  );
  assert.equal(resp.status, 201);
  const line = lines.map((l) => l[0]).find((l) => (l as { event?: string })?.event === 'request') as Record<string, unknown>;
  assert.equal(line.worker, 'live-examiner');
  assert.equal(line.provider, 'openai');
  assert.equal(line.mode, 'part1');
  assert.equal(line.status, 201);
  const to = (line.calls as { to: string }[]).map((c) => c.to);
  assert.ok(to.includes('supabase /auth/v1/user'));
  assert.ok(to.includes('openai /v1/live/sessions'));
  assert.ok(to.includes('supabase /rest/v1/live_examiner_sessions'));
  const text = JSON.stringify(lines);
  assert.doesNotMatch(text, /good-jwt|service-role|sk-test|v=0|11111111-1111/);
});

function validReport(extra: Record<string, unknown> = {}) {
  return {
    v: REPORT_VERSION,
    mode: 'full',
    end: 'closed',
    seconds: 640,
    device: 'phone',
    network: '4g',
    samples: 120,
    rttMs: { avg: 180, max: 900 },
    jitterMs: { avg: 12, max: 80 },
    lostIn: 40,
    lossInPct: 0.4,
    lostOut: 12,
    audioIn: true,
    audioOut: true,
    replies: 24,
    slowReplies: 3,
    longestWaitMs: 5200,
    ...extra,
  };
}

function reportRequest(body: string, ip = '203.0.113.7', origin: string | null = ORIGIN) {
  const headers: Record<string, string> = { 'Content-Type': 'text/plain;charset=UTF-8', 'CF-Connecting-IP': ip };
  if (origin) headers.Origin = origin;
  return new Request('https://live.example/report', { method: 'POST', headers, body });
}

test('POST /report logs one sanitised connection line and answers 204, without sign-in and without any service call', async (t) => {
  const lines = captureConsole(t);
  const calls: string[] = [];
  const handler = liveLogged({ fetch: liveFetch(calls), sideband: async () => ({ ok: true }), now: () => new Date('2026-10-03T15:00:00Z') });
  const resp = await handler(
    reportRequest(JSON.stringify(validReport({ transcript: 'Hello my name is Dana', email: 'dana@example.com', sessionId: 'live_1' })), '198.51.100.1'),
    liveEnv,
  );
  assert.equal(resp.status, 204);
  assert.equal(resp.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.deepEqual(calls, [], 'a report touches no database and no model');
  const report = lines.map((l) => l[0]).find((l) => (l as { event?: string })?.event === 'live-connection-report') as Record<string, unknown>;
  assert.ok(report, 'the report line');
  assert.equal(report.slowReplies, 3);
  assert.equal(report.longestWaitMs, 5200);
  assert.deepEqual(report.rttMs, { avg: 180, max: 900 });
  const text = JSON.stringify(lines);
  assert.doesNotMatch(text, /Dana|dana@|live_1|198\.51/);
});

test('POST /report refuses a foreign origin, an oversized body, a non-report and a flood', async () => {
  const handler = liveLogged({ fetch: liveFetch([]), sideband: async () => ({ ok: true }), now: () => new Date('2026-10-03T15:00:00Z') });
  const silent = console.log;
  console.log = () => {};
  try {
    assert.equal((await handler(reportRequest(JSON.stringify(validReport()), '192.0.2.1', 'https://evil.example'), liveEnv)).status, 403);
    assert.equal((await handler(reportRequest(JSON.stringify(validReport({ pad: 'x'.repeat(5000) })), '192.0.2.2'), liveEnv)).status, 413);
    assert.equal((await handler(reportRequest('{"hello":"world"}', '192.0.2.3'), liveEnv)).status, 400);
    assert.equal((await handler(reportRequest('not json', '192.0.2.4'), liveEnv)).status, 400);
  } finally {
    console.log = silent;
  }
  const store = new Map<string, { count: number; since: number }>();
  const verdicts = Array.from({ length: 7 }, () => reportAllowed('192.0.2.9', 1000, store));
  assert.deepEqual(verdicts, [true, true, true, true, true, true, false]);
  assert.equal(reportAllowed('192.0.2.9', 1000 + 10 * 60_000, store), true, 'the window resets');
});

test("the live examiner's minute sweep in open mode calls nothing and logs nothing", async (t) => {
  const lines = captureConsole(t);
  const result = await runScheduled({ ...(liveEnv as object), ACCESS_MODE: 'open' } as never, {
    ...liveDefaults,
    fetch: (async () => {
      throw new Error('the open sweep must not call anything');
    }) as typeof fetch,
    sideband: async () => {
      throw new Error('the open sweep must not hang anything up');
    },
  });
  assert.deepEqual(result, { closed: 0, failed: 0 });
  assert.equal(lines.length, 0);
});

test('mr-ez, support, content-gate and payments each write their request line', async (t) => {
  const lines = captureConsole(t);
  const noNet = (async () => {
    throw new Error('no network expected');
  }) as typeof fetch;
  await tutorLogged({ fetch: noNet, now: () => new Date(), uuid: () => 'u' })(
    new Request('https://tutor.example/', { method: 'GET', headers: { Origin: ORIGIN } }),
    { ALLOWED_ORIGINS: ORIGIN } as never,
  );
  await supportLogged({ fetch: noNet })(new Request('https://support.example/nowhere', { method: 'GET', headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN } as never);
  await gateLogged({ fetch: noNet })(new Request('https://gate.example/nowhere', { method: 'GET', headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN } as never);
  await paymentsLogged({ fetch: noNet })(new Request('https://pay.example/nowhere', { method: 'GET', headers: { Origin: ORIGIN } }), { ALLOWED_ORIGINS: ORIGIN } as never);
  const workers = lines.map((l) => (l[0] as { worker?: string; event?: string })).filter((l) => l?.event === 'request').map((l) => l.worker);
  assert.deepEqual(workers, ['mr-ez', 'support', 'content-gate', 'payments']);
});
