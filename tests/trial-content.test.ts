/* The content gate (workers/content-gate): the REAL handler, asking the REAL
 * trial migration (PGlite, tools/trial-db.mjs) whether each student may open
 * each item, serving from a small in-memory store. No network, no bucket.
 *
 * What is proved: a student gets exactly what their trial opens (its lesson,
 * its tests, a test they began even after the trial ended), nothing else, and
 * nothing at all without a sign-in; the section is never taken from the
 * request; a malformed or traversal-shaped path is not found; Mr EZ's data
 * needs the shared service key; an unreachable database refuses; replies are
 * never cacheable. Plus: the build step writes every item the gate serves.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHandler, route } from '../workers/content-gate/src/index.ts';
import { createTrialDb } from '../tools/trial-db.mjs';
import { buildGatedContent } from '../tools/build-gated-content.mjs';

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
};

async function world(opts: { dbDown?: boolean } = {}) {
  const db = await createTrialDb();
  await db.addUser(A);
  await db.addUser(B);
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
  const store = { get: async (key: string) => (key in STORE ? { text: async () => STORE[key] } : null) };
  const gate = createHandler({ fetch: fetchFn, store });
  const env = { ALLOWED_ORIGINS: ORIGIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CONTENT_SERVICE_KEY: CONTENT_KEY } as never;
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
  return { db, get };
}

test('routes: only well-formed items, never a path out of the store', () => {
  const r = (p: string) => route(new URL(`https://gate.test${p}`));
  assert.deepEqual(r('/lesson/reading-tfng'), { kind: 'student', item: 'lesson:reading-tfng', key: 'lessons/en/reading-tfng.html', type: 'text/html; charset=utf-8' });
  assert.equal(r('/lesson/reading-tfng?locale=ru')?.key, 'lessons/ru/reading-tfng.html');
  assert.equal(r('/lesson/reading-tfng?locale=de'), null);
  assert.equal(r('/practice/practice-reading-tfng')?.item, 'lesson:reading-tfng');
  assert.equal(r('/explanations/ru/practice-reading-tfng')?.item, 'lesson:reading-tfng');
  assert.equal(r('/explanations/ru/reading-full-001')?.item, 'test:reading-full-001');
  for (const bad of ['/lesson/../secrets', '/lesson/%2e%2e', '/test/READING', '/test/a/b', '/practice/practice-writing-x', '/data/tests/../x.json', '/manifest.json', '/']) {
    assert.equal(r(bad), null, bad);
  }
});

test('no sign-in, or no trial, opens nothing', async () => {
  const w = await world();
  assert.equal((await w.get('/lesson/reading-paraphrase')).status, 401);
  assert.equal((await w.get('/lesson/reading-paraphrase', 'forged')).status, 401);
  const noTrial = await w.get('/lesson/reading-paraphrase', 'token-a');
  assert.deepEqual([noTrial.status, noTrial.code], [403, 'trial-required']);
  await w.db.close();
});

test('a trial opens its own lesson, quiz and tests, and nothing else', async () => {
  const w = await world();
  await w.db.rpc('trial_start', {}, { userId: A });
  const lesson = await w.get('/lesson/reading-paraphrase', 'token-a');
  assert.equal(lesson.status, 200);
  assert.match(lesson.text, /Paraphrase lesson/);
  assert.equal(lesson.cache, 'private, no-store');
  assert.match((await w.get('/lesson/reading-paraphrase?locale=ru', 'token-a')).text, /Russian/);
  assert.equal((await w.get('/practice/practice-reading-paraphrase', 'token-a')).status, 200);
  assert.equal((await w.get('/explanations/ru/practice-reading-paraphrase', 'token-a')).status, 200);
  assert.equal((await w.get('/test/reading-full-001', 'token-a')).status, 200, 'the section test, before it is begun');
  assert.equal((await w.get('/explanations/ru/reading-full-001', 'token-a')).status, 200);
  for (const locked of ['/lesson/reading-tfng', '/practice/practice-reading-tfng', '/test/reading-full-002', '/test/reading-full-001-drill-p1']) {
    const r = await w.get(locked, 'token-a');
    assert.deepEqual([r.status, r.code], [403, 'not-included'], locked);
  }
  await w.db.close();
});

test('after the trial ends: nothing new, but a test begun before the end stays readable', async () => {
  const w = await world();
  await w.db.rpc('trial_start', {}, { userId: A });
  await w.db.rpc('trial_test_begin', { p_section: 'reading', p_activity: 'reading-full-001', p_request: 'sit-gate-001' }, { userId: A });
  await w.db.rewind(A, 72 * 60);
  const lesson = await w.get('/lesson/reading-paraphrase', 'token-a');
  assert.deepEqual([lesson.status, lesson.code], [403, 'trial-ended']);
  assert.equal((await w.get('/test/reading-full-001', 'token-a')).status, 200);
  await w.db.close();
});

test('one student cannot open another student’s begun test through their own trial', async () => {
  const w = await world();
  await w.db.rpc('trial_start', {}, { userId: A });
  await w.db.rpc('trial_start', {}, { userId: B });
  await w.db.rpc('trial_test_begin', { p_section: 'reading', p_activity: 'reading-full-001', p_request: 'sit-gate-002' }, { userId: A });
  await w.db.rewind(B, 72 * 60);
  // B's trial ended and B never began it: A's begun test does not open it for B.
  assert.equal((await w.get('/test/reading-full-001', 'token-b')).code, 'trial-ended');
  await w.db.close();
});

test('Mr EZ’s data needs the shared service key; a student token is not it', async () => {
  const w = await world();
  await w.db.rpc('trial_start', {}, { userId: A });
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

test('the build step writes every kind of item the gate serves', async () => {
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
  ]) {
    assert.ok(existsSync(join(out, key)), key);
  }
  const paper = JSON.parse(readFileSync(join(out, 'tests/reading-full-001.json'), 'utf8'));
  assert.ok(paper.parts.length > 0, 'the whole paper, not a summary');
  assert.ok(!readFileSync(join(out, 'lessons/en/reading-paraphrase.html'), 'utf8').includes('../pics/'), 'image paths rewritten');
});
