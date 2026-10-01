const validMp3 = () => { const b=Buffer.alloc(288); b[0]=255; b[1]=243; b[2]=136; return b.toString('base64'); };
/* The graders and the live examiner in the commercial build (ACCESS_MODE=
 * trial, the name stays): the REAL grade-essay, grade-speaking and
 * live-examiner handlers against the REAL database functions (every
 * migration a project runs today, ending with 2026-10-01-free-account.sql,
 * in PGlite via tools/trial-db.mjs) and a fake OpenAI. No key, no model, no
 * money.
 *
 * The free-account model (Alex, 1 October 2026,
 * docs/paid-access/FREE-ACCOUNT-MODEL.md): every AI assessment is part of
 * practice and guidance. Proves: sign-in, then paid or complimentary access,
 * before anything is paid for (a free account or an old trial is refused
 * 402 paid-required); a paid grade uses one of the purchase's assessments
 * and a failed one gives it back; complimentary access counts from the same
 * allowances; the open grader is unchanged; and the live examiner's paid
 * allowances (Builder M's review fixes) stand. The trial's own Writing and
 * Speaking test rules are history: tests/trial-sql.test.ts still proves the
 * trial file itself.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../workers/grade-essay/src/index.ts';
import { bandStepsFor, readBandStepLocale } from '../src/lib/trial/band-steps.ts';
import { SPEAKING_BAND_GUIDES, WRITING_BAND_GUIDES, guideFor, type BandStepGuide } from '../src/data/band-guides.ts';
import { createTrialDb } from '../tools/trial-db.mjs';
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

/** Alex, as the database knows an admin (2026-09-24-admin.sql). */
const ADMIN = 'adadadad-1111-4111-8111-adadadadadad';

async function world() {
  const db = await createTrialDb();
  await db.addUser(A);
  await db.addUser(B);
  await db.addUser(ADMIN);
  await db.addProfile(A);
  await db.addProfile(B);
  await db.makeAdmin(ADMIN);
  const calls = { openAi: 0, bodies: [] as string[] };
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
      calls.bodies.push(String(init?.body ?? ''));
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
  const submit = async (
    token: string | null,
    sitting?: string,
    overrides: Record<string, unknown> = {},
    extra: Record<string, unknown> = {},
  ) => {
    const headers: Record<string, string> = { Origin: ORIGIN, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const body = {
      prompt: { task: 'task2', promptHtml: '<p>Discuss both views.</p>', minWords: 250 },
      essay: ESSAY,
      ...(sitting ? { trialSitting: sitting } : {}),
      ...extra,
    };
    const response = await handler.fetch(new Request('https://grader.test/', { method: 'POST', headers, body: JSON.stringify(body) }), env(overrides));
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  const balance = (user: string) => db.rpc('assessment_balance', {}, { userId: user });
  const buy = async (user: string) => {
    const o = (await db.rpc('access_order_create', { p_plan: 'month-1' }, { userId: user })) as { orderId: string; amount: number };
    const paid = (await db.rpc('access_order_paid', { p_order: o.orderId, p_provider: 'simulated', p_ref: `sim_${o.orderId}`, p_amount: o.amount, p_currency: 'KZT' }, { role: 'service_role' })) as { ok: boolean };
    assert.equal(paid.ok, true);
  };
  const complimentary = (user: string, action: 'give' | 'renew' | 'stop') =>
    db.rpc('access_admin_complimentary', { p_user: user, p_action: action }, { userId: ADMIN }) as Promise<{ ok: boolean }>;
  return { db, calls, model, submit, balance, buy, complimentary };
}

test('commercial mode: no sign-in is 401, and a free account is refused 402 paid-required before anything is spent', async () => {
  const w = await world();
  assert.equal((await w.submit(null)).status, 401);
  assert.equal((await w.submit('forged')).status, 401);
  const free = await w.submit('token-a');
  assert.equal(free.status, 402);
  assert.deepEqual([free.body.code, free.body.reason], ['paid-required', 'paid-required']);
  assert.equal(typeof free.body.error, 'string');
  // An old trial sitting buys nothing either (the trial is retired).
  const oldTrial = await w.submit('token-a', 'sit-w-00001');
  assert.equal(oldTrial.status, 402);
  assert.equal(w.calls.openAi, 0);
  assert.equal(((await w.balance(A)) as { writingUsed: number }).writingUsed, 0, 'nothing reserved');
  await w.db.close();
});

test('a paid essay is graded on the student’s own question, uses one of the 12, and returns the band steps it earned, in the student’s language', async () => {
  const w = await world();
  await w.buy(A);
  const graded = await w.submit('token-a', undefined, {}, { locale: 'ru' });
  assert.equal(graded.status, 200);
  assert.equal(graded.body.trial, undefined, 'no trial test is used');
  assert.ok(w.calls.bodies.join(' ').includes('Discuss both views.'), "the student's own question is graded");
  const guides = graded.body.guides as Record<string, BandStepGuide>;
  assert.deepEqual(Object.keys(guides).sort(), ['coherenceCohesion', 'grammaticalRange', 'lexicalResource', 'taskResponse']);
  const english = guideFor(WRITING_BAND_GUIDES.taskResponse, 6)!;
  assert.equal(guides.taskResponse.from, 6, 'the step for the band given (6), and no other');
  assert.notEqual(guides.taskResponse.whatChanges, english.whatChanges, 'in Russian');
  assert.match(guides.taskResponse.whatChanges, /[А-Яа-я]/);
  assert.equal(guides.taskResponse.example.before, english.example.before, 'the example sentences stay English');
  const balance = (await w.balance(A)) as { writingUsed: number; kind: string };
  assert.deepEqual([balance.writingUsed, balance.kind], [1, 'paid']);
  await w.db.close();
});

test('band steps: one per criterion for the band given, in English or Russian', () => {
  const en = bandStepsFor('speaking', { fluencyCoherence: 7, pronunciation: 4.5, unknown: 6, lexicalResource: 'x' }, 'en');
  assert.deepEqual(Object.keys(en).sort(), ['fluencyCoherence', 'pronunciation']);
  assert.equal(en.fluencyCoherence.from, 7);
  assert.equal(en.fluencyCoherence.whatChanges, guideFor(SPEAKING_BAND_GUIDES.fluencyCoherence, 7)!.whatChanges);
  assert.equal(readBandStepLocale('ru'), 'ru');
  assert.equal(readBandStepLocale('de'), 'en');
});

test('a failed grade gives the essay assessment back', async () => {
  const w = await world();
  await w.buy(A);
  w.model.status = 500;
  const failed = await w.submit('token-a');
  assert.equal(failed.status >= 500, true);
  assert.equal(((await w.balance(A)) as { writingUsed: number }).writingUsed, 0);
  w.model.status = 200;
  assert.equal((await w.submit('token-a')).status, 200);
  assert.equal(((await w.balance(A)) as { writingUsed: number }).writingUsed, 1);
  await w.db.close();
});

test('complimentary access grades exactly like paid access, from the same allowance; stopping it returns the account to 402', async () => {
  const w = await world();
  assert.equal((await w.complimentary(A, 'give')).ok, true);
  const graded = await w.submit('token-a');
  assert.equal(graded.status, 200);
  assert.ok(graded.body.guides, 'the band steps a commercial build carries only for paid access');
  const balance = (await w.balance(A)) as { writingUsed: number; kind: string; limits: { writing: number } };
  assert.deepEqual([balance.writingUsed, balance.kind, balance.limits.writing], [1, 'complimentary', 12]);
  assert.equal((await w.submit('token-b')).status, 402, 'another student is still free');
  assert.equal((await w.complimentary(A, 'stop')).ok, true);
  assert.equal((await w.submit('token-a')).status, 402);
  assert.equal(w.calls.openAi, 1);
  await w.db.close();
});

test('the open grader (no ACCESS_MODE) needs no sign-in and asks the database nothing', async () => {
  const w = await world();
  const open = await w.submit(null, undefined, { ACCESS_MODE: undefined });
  assert.equal(open.status, 200);
  assert.equal(open.body.trial, undefined);
  assert.equal(open.body.guides, undefined, 'the open site carries its own band guides');
  await w.db.close();
});

test('an unreachable database fails closed', async () => {
  const w = await world();
  const down = await w.submit('token-a', undefined, { SUPABASE_URL: 'https://unreachable.invalid' });
  assert.equal(down.status, 503);
  assert.equal(w.calls.openAi, 0);
  await w.db.close();
});

/* ── Speaking and the live examiner ─────────────────────────────────────
   Every live interview and every recorded Speaking assessment needs paid or
   complimentary access (the trial's Part 1 test is retired with the trial).
   The open behaviour of both Workers is covered by their own test files. */

const OFFER_SDP = 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\n';

async function speakingWorld() {
  const db = await createTrialDb();
  await db.addUser(A);
  await db.addUser(B);
  await db.addProfile(A);
  await db.addProfile(B);
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
        const patch = JSON.parse(String(init?.body)) as Record<string, unknown>;
        if (failNextPatch.on && 'provider_session_id' in patch) {
          failNextPatch.on = false;
          return new Response('{}', { status: 500 });
        }
        for (const row of rows) Object.assign(row, patch);
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
  const openInterview = async (token: string, sitting: string | undefined, mode = 'part1', extra: Record<string, unknown> = {}) => {
    const plan =
      mode === 'part1'
        ? { mode, part1TopicIds: ['p1-work'] }
        : mode === 'full-valid'
          ? { mode: 'full', part1TopicIds: ['p1-work', 'p1-food'], cueCardId: 'cc-2026-04' }
          : { mode, part1TopicIds: ['p1-work', 'p1-work'], cueCardId: 'unknown' };
    const response = await live.fetch(
      new Request('https://live.test/', {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sdp: OFFER_SDP, plan, ...(sitting ? { trialSitting: sitting } : {}), ...extra }),
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
  /** Test only: the database's own record of a session's assessment. */
  const liveRow = async (session: string) =>
    ((await db.select('select status, purpose, release_reason from public.assessment_usage where provider_session_id = $1', [session], {
      role: 'service_role',
    })) as { status: string; purpose: string; release_reason: string | null }[])[0] ?? null;
  const failNextPatch = { on: false };
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
    liveRow,
    failNextPatch,
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

async function buyLive(w: Awaited<ReturnType<typeof speakingWorld>>) {
    const o=await w.db.rpc('access_order_create',{p_plan:'month-1'},{userId:A}) as any;
    await w.db.rpc('access_order_paid',{p_order:o.orderId,p_provider:'simulated',p_ref:`sim_${o.orderId}`,p_amount:o.amount,p_currency:'KZT'},{role:'service_role'});
}
test('a free account, or an old trial, is refused 402 before the voice service is asked',async()=>{
 const w=await speakingWorld();
 const free=await w.openInterview('token-a',undefined);
 assert.equal(free.status,402);
 assert.deepEqual([free.body.code,free.body.reason],['paid-required','paid-required']);
 // An old trial with a begun Speaking sitting buys nothing; a new one cannot be begun.
 await w.db.raw.query("insert into public.trial_accounts (user_id, started_at, ends_at) values ($1, now(), now() + interval '72 hours')",[A]);
 await w.db.raw.query("insert into public.trial_usage (user_id, kind, section, request_id, activity_id, status) values ($1, 'test', 'speaking', 'sit-live-trial', 'speaking-test', 'reserved')",[A]);
 assert.equal((await w.openInterview('token-a','sit-live-trial')).status,402);
 assert.equal(((await w.db.rpc('trial_test_begin',{p_section:'speaking',p_activity:'speaking-test',p_request:'sit-live-new1'},{userId:B})) as any).reason,'trial-retired');
 for(const purpose of ['placement','mock']){
  const r=await w.openInterview('token-a',undefined,purpose==='mock'?'full-valid':'part1',{purpose});
  assert.equal(r.status,402,purpose);
 }
 assert.equal(w.calls.openAiLive,0);
 assert.equal(w.sessions.length,0,'no session was even reserved');
 await w.db.close();
});
test('paid live quota: failed handshake restores allowance, successful sessions use two',async()=>{
 const w=await speakingWorld();await buyLive(w);w.model.liveStatus=500;
 assert.equal((await w.openInterview('token-a',undefined)).status,502);
 w.model.liveStatus=201;
 for(let i=0;i<2;i++){
  assert.equal((await w.openInterview('token-a',undefined)).status,201);
  for(const row of w.sessions)row.ended_at=new Date().toISOString();
 }
 assert.equal((await w.openInterview('token-a',undefined)).status,403);
 assert.equal(w.calls.openAiLive,3);await w.db.close();
});
test('paid live end is owned and cannot refund quota by claiming an unused trial',async()=>{
 const w=await speakingWorld();await buyLive(w);
 assert.equal((await w.openInterview('token-a',undefined)).status,201);
 assert.equal((await w.post('/end','token-b',{sessionId:'live_1'})).status,403);
 // The examiner began (the begin cue was delivered), so this interview happened.
 assert.equal((await w.post('/direct','token-a',{sessionId:'live_1',cue:{type:'begin'}})).status,200);
 const ended=await w.post('/end','token-a',{sessionId:'live_1',trialSitting:'forged-sitting'});
 assert.equal(ended.status,200);
 assert.deepEqual(ended.body,{ok:true});
 const b=await w.db.rpc('assessment_balance',{}, {userId:A}) as any;
 assert.equal(b.liveUsed,1);await w.db.close();
});

/* ── Review of 1 October 2026, P1-4 and P1-6 (server, Builder M) ──────── */

test('P1-4: a paid live interview dropped before the examiner began is given back by the server; one that began is not',async()=>{
 const w=await speakingWorld();await buyLive(w);
 assert.equal((await w.openInterview('token-a',undefined)).status,201);
 w.advance(1); // a minute later the connection failed; the begin cue never went out
 const dropped=await w.post('/end','token-a',{sessionId:'live_1'});
 assert.equal(dropped.status,200);
 assert.deepEqual(dropped.body,{ok:true,interviewGivenBack:true,purpose:'practice'});
 assert.equal((await w.liveRow('live_1'))?.status,'released');
 assert.equal(((await w.db.rpc('assessment_balance',{}, {userId:A})) as any).liveUsed,0);
 // Ending it again gives nothing more back.
 assert.deepEqual((await w.post('/end','token-a',{sessionId:'live_1'})).body,{ok:true});
 // Two real interviews still fit, and a third does not.
 for(const n of [2,3]){
  assert.equal((await w.openInterview('token-a',undefined)).status,201);
  assert.equal((await w.post('/direct','token-a',{sessionId:`live_${n}`,cue:{type:'begin'}})).status,200);
  assert.deepEqual((await w.post('/end','token-a',{sessionId:`live_${n}`})).body,{ok:true});
 }
 const third=await w.openInterview('token-a',undefined);
 assert.equal(third.status,403);
 assert.equal(third.body.code,'assessment-unavailable');
 assert.equal(third.body.reason,'allowance-used');
 await w.db.close();
});

test('P1-4: an interview that was never begun but ran past 90 seconds is not given back',async()=>{
 const w=await speakingWorld();await buyLive(w);
 assert.equal((await w.openInterview('token-a',undefined)).status,201);
 w.advance(2);
 assert.deepEqual((await w.post('/end','token-a',{sessionId:'live_1'})).body,{ok:true});
 assert.equal(((await w.db.rpc('assessment_balance',{}, {userId:A})) as any).liveUsed,1);
 await w.db.close();
});

test('P1-4: when the session cannot be recorded after the voice service opened it, the interview is given back',async()=>{
 const w=await speakingWorld();await buyLive(w);
 w.failNextPatch.on=true;
 const r=await w.openInterview('token-a',undefined);
 assert.equal(r.status,503);
 assert.deepEqual(w.calls.closes,['live_1'],'the opened voice session is closed');
 assert.equal(((await w.db.rpc('assessment_balance',{}, {userId:A})) as any).liveUsed,0);
 await w.db.close();
});

test('P1-6: a placement interview and full mock exams use their own allowances, checked on the server against the plan',async()=>{
 const w=await speakingWorld();await buyLive(w);
 // Placement: a Part 1 interview, once per account.
 const place=await w.openInterview('token-a',undefined,'part1',{purpose:'placement'});
 assert.equal(place.status,201,JSON.stringify(place.body));
 assert.equal((await w.liveRow('live_1'))?.purpose,'placement');
 assert.equal((await w.post('/direct','token-a',{sessionId:'live_1',cue:{type:'begin'}})).status,200);
 await w.post('/end','token-a',{sessionId:'live_1'});
 const again=await w.openInterview('token-a',undefined,'part1',{purpose:'placement'});
 assert.equal(again.status,403);
 assert.deepEqual([again.body.code,again.body.reason],['assessment-unavailable','placement-used']);
 // A placement is a Part 1 interview, and a mock is a full test: the label cannot buy a different session.
 const wrongPlacement=await w.openInterview('token-a',undefined,'full-valid',{purpose:'placement'});
 assert.equal(wrongPlacement.status,400);
 assert.equal(wrongPlacement.body.code,'purpose-plan-mismatch');
 const wrongMock=await w.openInterview('token-a',undefined,'part1',{purpose:'mock'});
 assert.equal(wrongMock.status,400);
 assert.equal(wrongMock.body.code,'purpose-plan-mismatch');
 // Two full mock exams per purchase.
 for(const n of [2,3]){
  const mock=await w.openInterview('token-a',undefined,'full-valid',{purpose:'mock'});
  assert.equal(mock.status,201,JSON.stringify(mock.body));
  assert.equal((await w.post('/direct','token-a',{sessionId:`live_${n}`,cue:{type:'begin'}})).status,200);
  await w.post('/end','token-a',{sessionId:`live_${n}`});
 }
 const thirdMock=await w.openInterview('token-a',undefined,'full-valid',{purpose:'mock'});
 assert.equal(thirdMock.status,403);
 assert.deepEqual([thirdMock.body.code,thirdMock.body.reason],['assessment-unavailable','mock-allowance-used']);
 assert.equal(thirdMock.body.limit,2);
 // The two ordinary live interviews are still both there.
 const b=await w.db.rpc('assessment_balance',{}, {userId:A}) as any;
 assert.deepEqual([b.liveUsed,b.mockUsed,b.placementUsed],[0,2,true]);
 const practice=await w.openInterview('token-a',undefined);
 assert.equal(practice.status,201);
 // An unknown purpose is refused rather than treated as practice.
 const odd=await w.openInterview('token-b',undefined,'part1',{purpose:'free'});
 assert.equal(odd.status,400);
 // The session cannot spend before checking: no refused request reached the voice service.
 assert.equal(w.calls.openAiLive,4);
 await w.db.close();
});

test('P1-6: a dropped mock interview is given back to the mock allowance, not the practice one',async()=>{
 const w=await speakingWorld();await buyLive(w);
 assert.equal((await w.openInterview('token-a',undefined,'full-valid',{purpose:'mock'})).status,201);
 const dropped=await w.post('/end','token-a',{sessionId:'live_1'});
 assert.deepEqual(dropped.body,{ok:true,interviewGivenBack:true,purpose:'mock'});
 const b=await w.db.rpc('assessment_balance',{}, {userId:A}) as any;
 assert.deepEqual([b.liveUsed,b.mockUsed],[0,0]);
 await w.db.close();
});
test('commercial scheduled closer ends paid voice after minute 14, independently of the browser',async()=>{
 const w=await speakingWorld();await buyLive(w);
 await w.openInterview('token-a',undefined);w.advance(13);
 assert.deepEqual(await w.close(),{closed:0,failed:0});w.advance(2);
 assert.deepEqual(await w.close(),{closed:1,failed:0});
 assert.deepEqual(w.calls.closes,['live_1']);
 assert.deepEqual(await w.close(),{closed:0,failed:0});await w.db.close();
});

/** The recorded Speaking grader against this world's database, with a
    model that answers `reply` (a fixed grade) or fails. */
function speakingGrader(w: Awaited<ReturnType<typeof speakingWorld>>, reply: 'grade' | 'fail') {
  const calls = { model: 0 };
  const criterion = (band: number) => ({ evidence: 'quoted', band, comment: 'A comment.', tip: 'A tip.' });
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
      calls.model += 1;
      if (reply === 'fail') return new Response('{}', { status: 500 });
      if (url === 'https://api.openai.com/v1/audio/transcriptions') {
        const text = 'I work in a bank and I enjoy it very much.';
        return new Response(JSON.stringify({ text, duration: 40, words: [], segments: [{ type: 'speech', text, speaker: 'A', start: 0, end: 40, id: 'seg_0' }] }));
      }
      if (url === 'https://api.openai.com/v1/responses') {
        const assessment = {
          fluencyCoherence: criterion(7),
          lexicalResource: criterion(6),
          grammaticalRange: criterion(6),
          moments: [{ quote: 'I work in a bank', note: 'clear' }],
          strengths: ['a strength'],
          improvements: ['an improvement'],
        };
        return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(assessment) }] }] }));
      }
      if (url === 'https://api.openai.com/v1/chat/completions') {
        const pron = criterion(5);
        return new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ function: { name: 'submit_pronunciation', arguments: JSON.stringify(pron) } }] } }] }));
      }
      throw new Error(`unexpected fetch ${url}`);
    }) as typeof fetch,
    sleep: async () => undefined,
  });
  const submit = async (token: string | null, body: Record<string, unknown>) => {
    const headers: Record<string, string> = { Origin: ORIGIN, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await grader.fetch(
      new Request('https://speaking.test/', { method: 'POST', headers, body: JSON.stringify(body) }),
      { ALLOWED_ORIGINS: ORIGIN, OPENAI_API_KEY: 'sk-test-dummy', GRADING_SAMPLES: '1', ACCESS_MODE: 'trial', SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } as never,
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  return { submit, calls };
}

const SPEAKING_CLIP = { question: 'Tell me about your work.', mimeType: 'audio/mpeg', audioBase64: validMp3(), durationMs: 60000 };
const RECORDED = { kind: 'part1', part1: { topic: 'Work', answers: [SPEAKING_CLIP] } };

test('speaking grader: a free account is refused 402 for recorded practice and for interview feedback, before anything is spent', async () => {
  const w = await speakingWorld();
  const { submit, calls } = speakingGrader(w, 'grade');
  assert.equal((await submit(null, RECORDED)).status, 401);
  const recorded = await submit('token-a', { ...RECORDED, trialSitting: 'sit-s-00004' });
  assert.equal(recorded.status, 402);
  assert.deepEqual([recorded.body.code, recorded.body.reason], ['paid-required', 'paid-required']);
  const feedback = await submit('token-a', {
    kind: 'interview',
    interview: { transcript: [{ role: 'examiner', text: 'Hello' }, { role: 'candidate', text: 'Hi' }], audio: SPEAKING_CLIP },
    liveSessionId: 'live_not_mine',
  });
  assert.equal(feedback.status, 402, 'no interview of their own: paid-required, not an allowance message');
  assert.equal(feedback.body.code, 'paid-required');
  assert.equal(calls.model, 0);
  await w.db.close();
});

test('speaking grader: a paid grade uses one of the 6 and returns only the band steps it earned, in the student’s language; a failed one gives it back', async () => {
  const w = await speakingWorld();
  await buyLive(w);
  const failing = speakingGrader(w, 'fail');
  const failed = await failing.submit('token-a', RECORDED);
  assert.ok(failed.status >= 500, `a failed grade (${failed.status})`);
  assert.equal(((await w.db.rpc('assessment_balance', {}, { userId: A })) as { speakingUsed: number }).speakingUsed, 0, 'given back');

  const { submit } = speakingGrader(w, 'grade');
  const graded = await submit('token-a', { ...RECORDED, locale: 'ru' });
  assert.equal(graded.status, 200, JSON.stringify(graded.body).slice(0, 200));
  const guides = graded.body.guides as Record<string, BandStepGuide>;
  assert.deepEqual(Object.keys(guides).sort(), ['fluencyCoherence', 'grammaticalRange', 'lexicalResource', 'pronunciation']);
  assert.equal(guides.fluencyCoherence.from, 7);
  assert.equal(guides.pronunciation.from, 5);
  assert.match(guides.fluencyCoherence.whatChanges, /[А-Яа-я]/, 'in Russian');
  assert.equal(graded.body.trial, undefined, 'no trial test is used');
  assert.equal(((await w.db.rpc('assessment_balance', {}, { userId: A })) as { speakingUsed: number }).speakingUsed, 1);
  await w.db.close();
});
