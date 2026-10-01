/* The content gate (workers/content-gate): the REAL handler, asking the REAL
 * migrations (PGlite, tools/trial-db.mjs, every file a project runs today,
 * ending with 2026-10-01-free-account.sql) whether each student may open
 * each item, serving from a small in-memory store. No network, no bucket.
 *
 * What is proved, for the free-account model (Alex, 1 October 2026,
 * docs/paid-access/FREE-ACCOUNT-MODEL.md): nothing without a sign-in; a
 * signed-in account with a completed profile opens every lesson body (both
 * languages), its worked example and its own quiz, and nothing else (402
 * paid-required); paid and complimentary access open everything; a retired
 * trial, even one begun earlier, opens nothing extra; a malformed or
 * traversal-shaped path is not found; Mr EZ's data needs the shared service
 * key; an unreachable database refuses; replies are never cacheable. Plus:
 * the build step writes every item the gate serves, worked examples
 * included.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHandler, route } from '../workers/content-gate/src/index.ts';
import { createTrialDb } from '../tools/trial-db.mjs';
import { buildGatedContent } from '../tools/build-gated-content.mjs';
import { TRIAL_WRITING } from '../src/lib/trial/offer.ts';

const ORIGIN = 'https://lxson777-tech.github.io';
const SUPABASE_URL = 'https://proj.supabase.co';
const SERVICE_KEY = 'service-role-dummy';
const CONTENT_KEY = 'content-service-dummy';
const A = 'aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa';
const B = 'bbbbbbbb-4444-4444-8444-bbbbbbbbbbbb';
const TOKENS: Record<string, string> = { 'token-a': A, 'token-b': B };

const STORE: Record<string, string> = {
  'lessons/en/reading-paraphrase.html': '<p>Paraphrase lesson (English)</p>',
  'lessons/ru/reading-paraphrase.html': '<p>Урок (Russian)</p>',
  'lessons/en/reading-tfng.html': '<p>A locked lesson</p>',
  'tests/reading-full-001.json': '{"id":"reading-full-001"}',
  'tests/reading-full-002.json': '{"id":"reading-full-002"}',
  'tests/reading-full-001-drill-p1.json': '{"id":"drill"}',
  'explanations/ru/reading-full-001.json': '{"entries":{}}',
  'explanations/ru/practice-reading-paraphrase.json': '{"entries":{}}',
  'practice/practice-reading-paraphrase.json': '{"questions":[]}',
  'practice/practice-reading-tfng.json': '{"questions":[]}',
  'data/tests/reading-full-002.json': '{"compact":true}',
  'examples/writing-task2-method.json': '{"model":"the worked example"}',
  [`prompts/${TRIAL_WRITING.essayPromptId}.json`]: '{"id":"essay"}',
  'prompts/pte-wt-121-task2.json': '{"id":"another question"}',
  [`models/${TRIAL_WRITING.examplePromptId}.json`]: '{"model":"the one example"}',
  [`models/${TRIAL_WRITING.essayPromptId}.json`]: '{"model":"the essay question answered"}',
  'tests/listening-full-001.json': '{"id":"listening-full-001","audioSrc":"/audio/listening/test-001.mp3","parts":[{"stimulus":{"src":"/audio/listening/test-001.mp3"}}]}',
  'practice/practice-listening-part1.json': '{"segments":[{"src":"/ielts-website/audio/listening/test-001.mp3"}]}',
};

/** A pretend recording: 1000 bytes, each its own position modulo 256. */
const RECORDING = Uint8Array.from({ length: 1000 }, (_, i) => i % 256);
const AUDIO: Record<string, Uint8Array> = { 'audio/listening/test-001.mp3': RECORDING, 'audio/listening/test-002.mp3': RECORDING };

async function world(opts: { dbDown?: boolean; signing?: boolean } = {}) {
  const db = await createTrialDb();
  await db.addUser(A);
  await db.addUser(B);
  await db.addProfile(A);
  await db.addProfile(B);
  const fetchFn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (url === `${SUPABASE_URL}/auth/v1/user`) {
      const id = TOKENS[(headers.Authorization ?? '').replace('Bearer ', '')];
      return id ? new Response(JSON.stringify({ id })) : new Response('{}', { status: 401 });
    }
    if (url.startsWith(`${SUPABASE_URL}/rest/v1/rpc/`)) {
      if (opts.dbDown) return new Response('{}', { status: 503 });
      const fn = url.slice(`${SUPABASE_URL}/rest/v1/rpc/`.length);
      return new Response(JSON.stringify(await db.rpc(fn, JSON.parse(String(init?.body)), { role: headers.apikey === SERVICE_KEY ? 'service_role' : 'anon' })));
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  const store = {
    get: async (key: string, options: { range?: { offset: number; length?: number } } = {}) => {
      if (key in AUDIO) {
        const whole = AUDIO[key]!;
        const { offset = 0, length = whole.length - offset } = options.range ?? {};
        const bytes = whole.slice(offset, offset + length);
        return { size: whole.length, text: async () => '', arrayBuffer: async () => bytes.buffer.slice(0) };
      }
      if (!(key in STORE)) return null;
      return { size: STORE[key]!.length, text: async () => STORE[key]!, arrayBuffer: async () => new TextEncoder().encode(STORE[key]!).buffer };
    },
  };
  const clock = { now: Date.parse('2026-09-24T10:00:00Z') };
  const gate = createHandler({ fetch: fetchFn, store, now: () => clock.now });
  const env = {
    ALLOWED_ORIGINS: ORIGIN,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    CONTENT_SERVICE_KEY: CONTENT_KEY,
    ...(opts.signing ? { AUDIO_SIGNING_KEY: 'audio-signing-dummy', AUDIO_BASE_URL: 'https://gate.test' } : {}),
  } as never;
  /** A request exactly as a browser's <audio> element makes it: no sign-in. */
  const audio = async (link: string, range?: string) => {
    const headers: Record<string, string> = range ? { Range: range } : {};
    const response = await gate.fetch(new Request(link, { headers }), env);
    return { status: response.status, bytes: new Uint8Array(await response.arrayBuffer()), headers: response.headers };
  };
  const get = async (path: string, token?: string) => {
    const headers: Record<string, string> = { Origin: ORIGIN };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await gate.fetch(new Request(`https://gate.test${path}`, { headers }), env);
    const text = await response.text();
    let code: string | undefined;
    try {
      code = (JSON.parse(text) as { code?: string }).code;
    } catch {
      /* html */
    }
    return { status: response.status, text, code, cache: response.headers.get('Cache-Control') };
  };
  return { db, get, audio, clock };
}

test('routes: only well-formed items, never a path out of the store', () => {
  const r = (p: string) => route(new URL(`https://gate.test${p}`));
  assert.deepEqual(r('/lesson/reading-tfng'), { kind: 'student', item: 'lesson:reading-tfng', key: 'lessons/en/reading-tfng.html', type: 'text/html; charset=utf-8' });
  assert.equal(r('/lesson/reading-tfng?locale=ru')?.key, 'lessons/ru/reading-tfng.html');
  assert.equal(r('/lesson/reading-tfng?locale=de'), null);
  assert.equal(r('/practice/practice-reading-tfng')?.item, 'lesson:reading-tfng', "a lesson's own quiz opens with its lesson");
  assert.equal(r('/explanations/ru/practice-reading-tfng')?.item, 'lesson:reading-tfng');
  assert.equal(r('/explanations/ru/reading-full-001')?.item, 'test:reading-full-001');
  assert.deepEqual(r('/example/writing-task2-method'), { kind: 'student', item: 'lesson:writing-task2-method', key: 'examples/writing-task2-method.json', type: 'application/json; charset=utf-8' });
  // The trial's question and example are no longer special: the bank is paid.
  assert.equal(r(`/prompt/${TRIAL_WRITING.essayPromptId}`)?.item, `writing-prompt:${TRIAL_WRITING.essayPromptId}`);
  assert.equal(r(`/model/${TRIAL_WRITING.examplePromptId}`)?.item, `writing-model:${TRIAL_WRITING.examplePromptId}`);
  for (const bad of ['/lesson/../secrets', '/lesson/%2e%2e', '/test/READING', '/test/a/b', '/practice/practice-writing-x', '/data/tests/../x.json', '/manifest.json', '/', '/example/reading-tfng', '/example/writing-../x']) {
    assert.equal(r(bad), null, bad);
  }
});

const LESSON_ITEMS = [
  '/lesson/reading-paraphrase',
  '/lesson/reading-paraphrase?locale=ru',
  '/lesson/reading-tfng',
  '/practice/practice-reading-tfng',
  '/explanations/ru/practice-reading-paraphrase',
  '/example/writing-task2-method',
];
const PAID_ITEMS = [
  '/test/reading-full-001',
  '/test/reading-full-001-drill-p1',
  '/explanations/ru/reading-full-001',
  `/prompt/${TRIAL_WRITING.essayPromptId}`,
  `/model/${TRIAL_WRITING.examplePromptId}`,
  '/model/pte-wt-121-task2',
];

test('signed out: nothing opens, not even a lesson', async () => {
  const w = await world();
  for (const path of [...LESSON_ITEMS, ...PAID_ITEMS]) {
    const r = await w.get(path);
    assert.deepEqual([r.status, r.code], [401, 'sign-in-required'], path);
  }
  assert.equal((await w.get('/lesson/reading-paraphrase', 'forged')).status, 401);
  await w.db.close();
});

test('a free account opens every lesson body, worked example and lesson quiz, and is refused everything else with 402', async () => {
  const w = await world();
  const lesson = await w.get('/lesson/reading-paraphrase', 'token-a');
  assert.equal(lesson.status, 200);
  assert.match(lesson.text, /Paraphrase lesson/);
  assert.equal(lesson.cache, 'private, no-store');
  assert.match((await w.get('/lesson/reading-paraphrase?locale=ru', 'token-a')).text, /Russian/);
  for (const path of LESSON_ITEMS) assert.equal((await w.get(path, 'token-a')).status, 200, path);
  for (const path of PAID_ITEMS) {
    const r = await w.get(path, 'token-a');
    assert.deepEqual([r.status, r.code], [402, 'paid-required'], path);
    assert.equal(JSON.parse(r.text).reason, 'paid-required');
  }
  await w.db.close();
});

test('a signed-in account without a completed profile is asked to complete it before lessons open', async () => {
  const w = await world();
  await w.db.raw.query('delete from public.student_profiles where user_id = $1', [A]);
  const r = await w.get('/lesson/reading-paraphrase', 'token-a');
  assert.deepEqual([r.status, r.code], [403, 'profile-required']);
  assert.equal((await w.get('/test/reading-full-001', 'token-a')).code, 'paid-required');
  await w.db.close();
});

test('a retired trial opens nothing a free account cannot, even a test begun before it was retired', async () => {
  const w = await world();
  // An old trial row, as an earlier database holds it (trial_start now refuses).
  await w.db.raw.query("insert into public.trial_accounts (user_id, started_at, ends_at) values ($1, now(), now() + interval '72 hours')", [A]);
  await w.db.raw.query("insert into public.trial_usage (user_id, kind, section, request_id, activity_id, status) values ($1, 'test', 'reading', 'sit-gate-001', 'reading-full-001', 'reserved')", [A]);
  assert.equal((await w.get('/test/reading-full-001', 'token-a')).code, 'paid-required');
  assert.equal((await w.get(`/prompt/${TRIAL_WRITING.essayPromptId}`, 'token-a')).code, 'paid-required');
  assert.equal((await w.get('/lesson/reading-paraphrase', 'token-a')).status, 200, 'lessons open as for any free account');
  await w.db.close();
});

test('recordings: a paper the student may open gets signed links, which play, skip, and stop working when they expire', async () => {
  const w = await world({ signing: true });
  // A lesson quiz is free; a whole paper needs paid access.
  const quiz = JSON.parse((await w.get('/practice/practice-listening-part1', 'token-a')).text) as { segments: { src: string }[] };
  assert.match(quiz.segments[0]!.src, /^https:\/\/gate\.test\/audio\/test-001\.mp3\?exp=/, "the lesson quiz's clips are signed, with the site's base");
  assert.equal((await w.get('/test/listening-full-001', 'token-a')).code, 'paid-required');
  await w.db.makeAdmin(B);
  assert.equal(((await w.db.rpc('access_admin_complimentary', { p_user: A, p_action: 'give' }, { userId: B })) as { ok: boolean }).ok, true);
  const paper = JSON.parse((await w.get('/test/listening-full-001', 'token-a')).text) as { audioSrc: string; parts: { stimulus: { src: string } }[] };
  const link = paper.audioSrc;
  assert.match(link, /^https:\/\/gate\.test\/audio\/test-001\.mp3\?exp=\d+&sig=[A-Za-z0-9_-]+$/, 'the site path became a signed link');
  assert.equal(paper.parts[0]!.stimulus.src, link, 'every mention of it');

  const whole = await w.audio(link);
  assert.equal(whole.status, 200, 'no sign-in needed: the link is the permission');
  assert.equal(whole.bytes.length, 1000);
  assert.equal(whole.headers.get('Accept-Ranges'), 'bytes');
  assert.match(String(whole.headers.get('Cache-Control')), /^private/);
  const part = await w.audio(link, 'bytes=100-199');
  assert.equal(part.status, 206, 'skipping works');
  assert.deepEqual([...part.bytes.slice(0, 3)], [100, 101, 102]);
  assert.equal(part.headers.get('Content-Range'), 'bytes 100-199/1000');
  assert.equal((await w.audio(link, 'bytes=900-')).bytes.length, 100);

  const url = new URL(link);
  const forged = `https://gate.test/audio/test-002.mp3${url.search}`;
  assert.equal((await w.audio(forged)).status, 403, "test-001's signature does not open test-002");
  const later = new URL(link);
  later.searchParams.set('exp', String(Number(url.searchParams.get('exp')) + 3600));
  assert.equal((await w.audio(later.toString())).status, 403, 'a stretched expiry breaks the signature');
  assert.equal((await w.audio('https://gate.test/audio/test-001.mp3')).status, 404, 'no link, no recording');

  w.clock.now += 121 * 60_000;
  assert.equal((await w.audio(link)).status, 403, 'expired after two hours');
  await w.db.close();
});

test('recordings: without a signing key nothing is signed and nothing is served', async () => {
  const w = await world();
  const quiz = JSON.parse((await w.get('/practice/practice-listening-part1', 'token-a')).text) as { segments: { src: string }[] };
  assert.equal(quiz.segments[0]!.src, '/ielts-website/audio/listening/test-001.mp3');
  assert.equal((await w.audio('https://gate.test/audio/test-001.mp3?exp=9999999999&sig=AAAAAAAAAAAAAAAAAAAAAAAA')).status, 404);
  await w.db.close();
});

test("one student's access never opens anything for another", async () => {
  const w = await world();
  await w.db.makeAdmin(A);
  await w.db.rpc('access_admin_complimentary', { p_user: A, p_action: 'give' }, { userId: A });
  assert.equal((await w.get('/test/reading-full-001', 'token-a')).status, 200);
  assert.equal((await w.get('/test/reading-full-001', 'token-b')).code, 'paid-required');
  await w.db.close();
});

test('Mr EZ’s data needs the shared service key; a student token is not it', async () => {
  const w = await world();
  assert.equal((await w.get('/data/tests/reading-full-002.json')).status, 401);
  assert.equal((await w.get('/data/tests/reading-full-002.json', 'token-a')).status, 401);
  assert.equal((await w.get('/data/tests/reading-full-002.json', 'wrong-key')).status, 401);
  const ok = await w.get('/data/tests/reading-full-002.json', CONTENT_KEY);
  assert.equal(ok.status, 200);
  await w.db.close();
});

test('an unreachable database refuses rather than serving', async () => {
  const w = await world({ dbDown: true });
  const r = await w.get('/lesson/reading-paraphrase', 'token-a');
  assert.deepEqual([r.status, r.code], [503, 'unavailable']);
  await w.db.close();
});

test("the build step writes every kind of item the gate serves, every Writing lesson's worked example included", async () => {
  const out = mkdtempSync(join(tmpdir(), 'gated-'));
  const { keys } = await buildGatedContent(out);
  const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8')).keys as string[];
  assert.equal(manifest.length + 1, keys);
  for (const key of [
    'lessons/en/reading-paraphrase.html',
    'lessons/ru/reading-paraphrase.html',
    'tests/reading-full-001.json',
    'tests/reading-full-001-drill-p1.json',
    'practice/practice-reading-paraphrase.json',
    'practice/practice-listening-part1.json',
    'data/tests/reading-full-001.json',
    'data/lesson-blocks/reading-paraphrase.json',
    `prompts/${TRIAL_WRITING.essayPromptId}.json`,
    `models/${TRIAL_WRITING.examplePromptId}.json`,
    'examples/writing-task2-method.json',
    'examples/writing-charts.json',
  ]) {
    assert.ok(existsSync(join(out, key)), key);
  }
  const paper = JSON.parse(readFileSync(join(out, 'tests/reading-full-001.json'), 'utf8'));
  assert.ok(paper.parts.length > 0, 'the whole paper, not a summary');
  const question = JSON.parse(readFileSync(join(out, `prompts/${TRIAL_WRITING.essayPromptId}.json`), 'utf8'));
  assert.ok(question.promptHtml.length > 50, 'the whole question');
  const example = JSON.parse(readFileSync(join(out, 'examples/writing-task2-method.json'), 'utf8'));
  assert.ok(example.model.text.length > 2 && example.prompt.promptHtml, 'the worked example with its question');
  assert.notEqual(example.prompt.id, TRIAL_WRITING.essayPromptId, 'never the old trial essay question');
  const chart = JSON.parse(readFileSync(join(out, 'examples/writing-charts.json'), 'utf8'));
  assert.ok(String(chart.prompt.imageUrl ?? '').startsWith('data:') || /data:image/.test(chart.prompt.promptHtml), 'a Task 1 example carries its chart inline');
  const examples = manifest.filter((k) => k.startsWith('examples/'));
  assert.ok(examples.length >= 8, `one per Writing lesson with a matching model (${examples.length})`);
  assert.ok(!readFileSync(join(out, 'lessons/en/reading-paraphrase.html'), 'utf8').includes('../pics/'), 'image paths rewritten');
});
