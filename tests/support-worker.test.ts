/* The support Worker (workers/support): the REAL handler, end to end,
 * against the REAL support migration in PGlite (tools/stand-in/support.mjs).
 * No network: the database is answered in-process by the role each key
 * proves, exactly as PostgREST would, and Cloudflare's Turnstile check
 * (siteverify) is a stub that records what it was asked.
 *
 * What is proved (re-audit R01, 30 September 2026): the sender is read from
 * CF-Connecting-IP and nothing else, a request with no sender is refused,
 * X-Forwarded-For and the body cannot change who the sender is, one sender
 * cannot use up anyone else's capacity, only a hash of the address is ever
 * stored, the bot check is verified on the server (missing, invalid and
 * valid token), the origin check, the trap field, and that every failure
 * stores nothing.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/support-worker.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanup, createHandler, sourceHash, sourceKey, SITEVERIFY_URL, SOURCE_HEADER } from '../workers/support/src/index.ts';
import { createSupportDb } from '../tools/stand-in/support.mjs';
import { sendVisitorSupportRequest } from '../src/lib/support.ts';

const ORIGIN = 'https://lxson777-tech.github.io';
const SUPABASE_URL = 'https://proj.supabase.co';
const SERVICE_KEY = 'service-role-dummy';
const ANON_KEY = 'anon-dummy';
const SALT = 'a-long-random-salt-for-tests-only';
const TURNSTILE_SECRET = 'turnstile-secret-dummy';

const ENV = {
  ALLOWED_ORIGINS: `${ORIGIN},http://localhost:4612`,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  SUPPORT_SOURCE_SALT: SALT,
};

/** Documentation-only addresses (RFC 5737, RFC 3849): nobody's real one. */
const ATTACKER = '203.0.113.7';
const VISITOR = '198.51.100.24';

const MESSAGE = 'I cannot sign in to my account and need help from a person.';

type Siteverify = (form: URLSearchParams) => Response | Promise<Response>;

async function world(opts: { dbDown?: boolean; siteverify?: Siteverify } = {}) {
  const db = await createSupportDb();
  const rpcCalls: { fn: string; role: string }[] = [];
  const challenges: Record<string, string>[] = [];
  const fetchFn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (url === SITEVERIFY_URL) {
      assert.equal(init?.method, 'POST');
      assert.equal(headers['Content-Type'], 'application/x-www-form-urlencoded');
      const form = new URLSearchParams(String(init?.body));
      challenges.push(Object.fromEntries(form));
      if (!opts.siteverify) throw new Error('no siteverify stub for this test');
      return opts.siteverify(form);
    }
    if (url.startsWith(`${SUPABASE_URL}/rest/v1/rpc/`)) {
      if (opts.dbDown) return new Response('{}', { status: 503 });
      const fn = url.slice(`${SUPABASE_URL}/rest/v1/rpc/`.length);
      // PostgREST: the service key is the service role; anything else is anon.
      const role = headers.apikey === SERVICE_KEY ? ('service_role' as const) : ('anon' as const);
      rpcCalls.push({ fn, role });
      try {
        return new Response(JSON.stringify(await db.rpc(fn, JSON.parse(String(init?.body)), { role })));
      } catch (err) {
        return new Response(JSON.stringify({ message: (err as Error).message }), { status: (err as { status?: number }).status ?? 400 });
      }
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  const handler = createHandler({ fetch: fetchFn });

  let n = 0;
  /** One request to the Worker. `ip` is what Cloudflare would put in
      CF-Connecting-IP (null: the header is absent). */
  const post = async (
    ip: string | null,
    body: Record<string, unknown> | string = {},
    extra: { headers?: Record<string, string>; env?: Record<string, unknown>; origin?: string | null } = {},
  ) => {
    n += 1;
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(extra.headers ?? {}) };
    const origin = extra.origin === undefined ? ORIGIN : extra.origin;
    if (origin) headers.Origin = origin;
    if (ip !== null) headers[SOURCE_HEADER] = ip;
    const payload =
      typeof body === 'string' ? body : JSON.stringify({ email: `made-up-${n}@example.test`, topic: 'question', message: MESSAGE, locale: 'en', ...body });
    const response = await handler.fetch(new Request('https://support.test/request', { method: 'POST', headers, body: payload }), {
      ...ENV,
      ...(extra.env ?? {}),
    } as never);
    const text = await response.text();
    return { status: response.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null, headers: response.headers };
  };
  const rows = async () =>
    (await db.raw.query<{ contact_email: string; source_hash: string | null; user_id: string | null; context: string | null; page: string | null; locale: string }>(
      'select contact_email, source_hash, user_id, context, page, locale from public.support_requests order by created_at',
    )).rows;
  return { db, handler, fetchFn, post, rows, rpcCalls, challenges };
}

const passing: Siteverify = () => new Response(JSON.stringify({ success: true, hostname: 'lxson777-tech.github.io' }));
const failing: Siteverify = () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }));

test('a signed-out request is stored with a keyed hash of the sender, never the address', async () => {
  const w = await world();
  const sent = await w.post(VISITOR, { email: 'Visitor@Example.test', topic: 'account', context: 'help', page: '/help', locale: 'ru' });
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.equal(sent.body!.ok, true);
  assert.match(String(sent.body!.id), /^[0-9a-f-]{36}$/);
  assert.equal(sent.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.match(sent.headers.get('Cache-Control') ?? '', /no-store/);

  const rows = await w.rows();
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.contact_email, 'visitor@example.test');
  assert.equal(rows[0]!.user_id, null);
  assert.equal(rows[0]!.context, 'help');
  assert.equal(rows[0]!.page, '/help');
  assert.equal(rows[0]!.locale, 'ru');
  assert.match(rows[0]!.source_hash!, /^[0-9a-f]{64}$/);
  assert.equal(rows[0]!.source_hash, await sourceHash(SALT, `v4:${VISITOR}`));
  assert.notEqual(rows[0]!.source_hash, await sourceHash('another-salt-entirely', `v4:${VISITOR}`), 'the hash depends on the secret');
  // The address itself appears nowhere in what was stored.
  const everything = JSON.stringify((await w.db.raw.query('select * from public.support_requests')).rows);
  assert.ok(!everything.includes(VISITOR));
  // The database was called as the service role, once, by the one function.
  assert.deepEqual(w.rpcCalls, [{ fn: 'support_request_visitor', role: 'service_role' }]);
  await w.db.close();
});

test('no CF-Connecting-IP, or a value that is not an address: refused, and nothing is stored', async () => {
  const w = await world();
  for (const ip of [null, '', '   ', 'unknown', '999.1.1.1', '1.2.3', 'not an address', '1.2.3.4, 5.6.7.8', ':::', '12345::1']) {
    const r = await w.post(ip);
    assert.equal(r.status, 400, `ip ${ip}`);
    assert.equal(r.body!.code, 'no-source');
  }
  // Other headers that claim an address do not stand in for it.
  const r = await w.post(null, {}, { headers: { 'X-Forwarded-For': VISITOR, 'X-Real-IP': VISITOR, 'True-Client-IP': VISITOR, Forwarded: `for=${VISITOR}` } });
  assert.equal(r.body!.code, 'no-source');
  assert.equal((await w.rows()).length, 0);
  assert.equal(w.rpcCalls.length, 0, 'the database was never asked');
  await w.db.close();
});

test('R01: forty requests from one sender with forty emails, and every trick to look like someone else', async () => {
  const w = await world();
  const answers = [];
  for (let i = 0; i < 40; i += 1) {
    answers.push(
      await w.post(
        ATTACKER,
        // A body that claims another sender, and a forged header on every request.
        { email: `flood-${i}@example.test`, ip: `10.0.0.${i}`, source: `10.0.0.${i}`, sourceHash: 'f'.repeat(64), p_source_hash: 'f'.repeat(64), challenged: true, p_challenged: true },
        { headers: { 'X-Forwarded-For': `10.0.0.${i}`, 'X-Real-IP': `10.0.0.${i}`, 'X-Standin-Source': `10.0.0.${i}` } },
      ),
    );
  }
  assert.deepEqual(answers.slice(0, 3).map((a) => a.status), [200, 200, 200]);
  assert.ok(answers.slice(3).every((a) => a.status === 429 && a.body!.code === 'source-hour'), 'everything after the third is this sender’s own limit');
  let rows = await w.rows();
  assert.equal(rows.length, 3, 'thirty-seven refusals stored nothing');
  const attackerHash = await sourceHash(SALT, `v4:${ATTACKER}`);
  assert.ok(rows.every((r) => r.source_hash === attackerHash), 'all counted as the one real sender');

  // Immediately afterwards, an unrelated visitor on another address gets through.
  const other = await w.post(VISITOR, { email: 'locked-out-student@example.test', topic: 'account' });
  assert.equal(other.status, 200, JSON.stringify(other.body));
  rows = await w.rows();
  assert.equal(rows.length, 4);
  assert.equal(rows[3]!.contact_email, 'locked-out-student@example.test');
  await w.db.close();
});

test('an IPv6 sender is counted by its /64 network, and a mapped IPv4 address as that IPv4 address', async () => {
  assert.equal(sourceKey('203.0.113.7'), 'v4:203.0.113.7');
  assert.equal(sourceKey(' 203.0.113.007 '), 'v4:203.0.113.7');
  assert.equal(sourceKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd'), 'v6:2001:db8:1:2');
  assert.equal(sourceKey('2001:DB8:1:2::1'), 'v6:2001:db8:1:2');
  assert.equal(sourceKey('2001:db8:1:3::1'), 'v6:2001:db8:1:3');
  assert.equal(sourceKey('2001:db8::1'), 'v6:2001:db8:0:0');
  assert.equal(sourceKey('::1'), 'v6:0:0:0:0');
  assert.equal(sourceKey('::ffff:203.0.113.7'), 'v4:203.0.113.7');
  assert.equal(sourceKey('::ffff:cb00:7107'), 'v4:203.0.113.7');
  for (const bad of [null, '', 'example.test', '1.2.3.4.5', '256.1.1.1', '1:2:3:4:5:6:7', '1:2:3:4:5:6:7:8:9', '1::2::3', 'fe80::1%eth0', '2001:db8::g']) {
    assert.equal(sourceKey(bad), null, `${bad}`);
  }

  const w = await world();
  // Three addresses, one subscriber: the fourth request is refused.
  for (const ip of ['2001:db8:1:2::1', '2001:db8:1:2::2', '2001:db8:1:2:ffff:ffff:ffff:ffff']) assert.equal((await w.post(ip)).status, 200);
  assert.equal((await w.post('2001:db8:1:2:1234::9')).body!.code, 'source-hour');
  // The next network over is someone else.
  assert.equal((await w.post('2001:db8:1:3::1')).status, 200);
  await w.db.close();
});

test('the bot check is verified on the server: a missing token is refused before anything else happens', async () => {
  const w = await world({ siteverify: passing });
  const env = { TURNSTILE_SECRET_KEY: TURNSTILE_SECRET };
  for (const token of [undefined, '', null, 12345, 'x'.repeat(3000)]) {
    const r = await w.post(VISITOR, { challengeToken: token }, { env });
    assert.equal(r.status, 403, `token ${String(token).slice(0, 12)}`);
    assert.equal(r.body!.code, 'challenge-required');
  }
  assert.equal(w.challenges.length, 0, 'Cloudflare was not asked about a token that is not there');
  assert.equal(w.rpcCalls.length, 0);
  assert.equal((await w.rows()).length, 0);
  await w.db.close();
});

test('the bot check is verified on the server: an invalid token is refused and nothing is stored', async () => {
  const w = await world({ siteverify: failing });
  const r = await w.post(VISITOR, { challengeToken: 'forged-token' }, { env: { TURNSTILE_SECRET_KEY: TURNSTILE_SECRET } });
  assert.equal(r.status, 403);
  assert.equal(r.body!.code, 'challenge-failed');
  assert.deepEqual(w.challenges, [{ secret: TURNSTILE_SECRET, response: 'forged-token', remoteip: VISITOR }]);
  assert.equal(w.rpcCalls.length, 0, 'the database was never asked');
  assert.equal((await w.rows()).length, 0);
  await w.db.close();
});

test('the bot check: a token solved on another site, and a check that cannot be reached, both fail closed', async () => {
  const elsewhere = await world({ siteverify: () => new Response(JSON.stringify({ success: true, hostname: 'evil.example.test' })) });
  const r1 = await elsewhere.post(VISITOR, { challengeToken: 'token' }, { env: { TURNSTILE_SECRET_KEY: TURNSTILE_SECRET } });
  assert.equal(r1.body!.code, 'challenge-failed');
  assert.equal((await elsewhere.rows()).length, 0);
  await elsewhere.db.close();

  for (const siteverify of [
    () => new Response('upstream error', { status: 500 }),
    () => new Response('not json'),
    () => {
      throw new Error('network down');
    },
  ] as Siteverify[]) {
    const w = await world({ siteverify });
    const r = await w.post(VISITOR, { challengeToken: 'token' }, { env: { TURNSTILE_SECRET_KEY: TURNSTILE_SECRET } });
    assert.equal(r.status, 503);
    assert.equal(r.body!.code, 'challenge-unavailable');
    assert.equal((await w.rows()).length, 0);
    await w.db.close();
  }
});

test('the bot check: a valid token is accepted, and a challenged request is never stopped by the shared breaker', async () => {
  const w = await world({ siteverify: passing });
  const env = { TURNSTILE_SECRET_KEY: TURNSTILE_SECRET };
  const ok = await w.post(VISITOR, { challengeToken: 'genuine-token' }, { env });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.deepEqual(w.challenges, [{ secret: TURNSTILE_SECRET, response: 'genuine-token', remoteip: VISITOR }]);

  // Open the shared breaker: 300 stored signed-out requests in the last hour.
  await w.db.raw.exec(`
    insert into public.support_requests (contact_email, topic, message, source_hash)
    select 'bulk-' || g || '@example.test', 'question', 'Bulk visitor row number ' || g, md5(g::text) || md5((g + 1)::text)
    from generate_series(1, 300) g`);
  // Without the bot check configured, a new visitor is told to come back...
  const unchallenged = await w.post('198.51.100.99');
  assert.equal(unchallenged.status, 429);
  assert.equal(unchallenged.body!.code, 'busy');
  // ...with it, a person who passes it still gets through.
  const challenged = await w.post('198.51.100.99', { challengeToken: 'genuine-token-2' }, { env });
  assert.equal(challenged.status, 200, JSON.stringify(challenged.body));
  // Passing the check does not lift a sender's own limit.
  for (let i = 0; i < 2; i += 1) assert.equal((await w.post(VISITOR, { challengeToken: `t-${i}` }, { env })).status, 200);
  assert.equal((await w.post(VISITOR, { challengeToken: 't-last' }, { env })).body!.code, 'source-hour');
  await w.db.close();
});

test('with no bot-check secret the Worker asks Cloudflare nothing and relies on the sender limits', async () => {
  const w = await world();
  const r = await w.post(VISITOR, { challengeToken: 'a-token-the-site-happened-to-send' });
  assert.equal(r.status, 200);
  assert.equal(w.challenges.length, 0);
  const info = await w.handler.fetch(new Request('https://support.test/'), ENV as never);
  assert.deepEqual(await info.json(), { configured: true, challenge: false });
  const withCheck = await w.handler.fetch(new Request('https://support.test/'), { ...ENV, TURNSTILE_SECRET_KEY: TURNSTILE_SECRET } as never);
  assert.deepEqual(await withCheck.json(), { configured: true, challenge: true });
  await w.db.close();
});

test('origin: only the site may post; preflight is answered with the site’s origin', async () => {
  const w = await world();
  const none = await w.post(VISITOR, {}, { origin: null });
  assert.equal(none.status, 403);
  assert.equal(none.body!.code, 'bad-origin');
  const other = await w.post(VISITOR, {}, { origin: 'https://evil.example.test' });
  assert.equal(other.status, 403);
  assert.equal(other.body!.code, 'bad-origin');
  assert.equal(other.headers.get('Access-Control-Allow-Origin'), ORIGIN, 'never echoes a foreign origin');
  assert.equal((await w.rows()).length, 0);
  assert.equal(w.rpcCalls.length, 0);

  const local = await w.post(VISITOR, {}, { origin: 'http://localhost:4612' });
  assert.equal(local.status, 200);
  assert.equal(local.headers.get('Access-Control-Allow-Origin'), 'http://localhost:4612');

  const preflight = await w.handler.fetch(new Request('https://support.test/request', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), ENV as never);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.match(preflight.headers.get('Access-Control-Allow-Methods') ?? '', /POST/);
  assert.match(preflight.headers.get('Access-Control-Allow-Headers') ?? '', /Content-Type/);

  const missing = await w.handler.fetch(new Request('https://support.test/elsewhere', { method: 'POST', headers: { Origin: ORIGIN } }), ENV as never);
  assert.equal(missing.status, 404);
  await w.db.close();
});

test('the trap field: a form-filling script is told it worked, and nothing is stored or counted', async () => {
  const w = await world();
  for (let i = 0; i < 10; i += 1) {
    const r = await w.post(ATTACKER, { trap: 'https://spam.example.test' });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true });
  }
  assert.equal((await w.rows()).length, 0);
  assert.equal(w.rpcCalls.length, 0);
  // A person from the same address is not affected by it.
  assert.equal((await w.post(ATTACKER, { trap: '' })).status, 200);
  assert.equal((await w.rows()).length, 1);
  await w.db.close();
});

test('a malformed request is refused before the database or the bot check is asked', async () => {
  const w = await world({ siteverify: passing });
  const env = { TURNSTILE_SECRET_KEY: TURNSTILE_SECRET };
  const cases: [Record<string, unknown> | string, number, string][] = [
    [{ email: '' }, 400, 'email-required'],
    [{ email: 'not-an-email' }, 400, 'email-invalid'],
    [{ email: `${'a'.repeat(250)}@example.test` }, 400, 'email-invalid'],
    [{ topic: 'refund-now' }, 400, 'topic'],
    [{ message: 'too short' }, 400, 'message-length'],
    [{ message: 'x'.repeat(2001) }, 400, 'message-length'],
    ['not json', 400, 'bad-request'],
    ['[]', 400, 'bad-request'],
    [JSON.stringify({ email: 'v@example.test', topic: 'question', message: 'x'.repeat(20000) }), 413, 'bad-request'],
  ];
  for (const [body, status, code] of cases) {
    const r = await w.post(VISITOR, body, { env });
    assert.equal(r.status, status, code);
    assert.equal(r.body!.code, code);
  }
  assert.equal(w.rpcCalls.length, 0);
  assert.equal(w.challenges.length, 0);
  // A context or page that is not the site's own is dropped, not refused.
  const r = await w.post(VISITOR, { context: 'DROP TABLE', page: 'https://evil.example.test/', challengeToken: 't' }, { env });
  assert.equal(r.status, 200);
  const rows = await w.rows();
  assert.equal(rows[0]!.context, null);
  assert.equal(rows[0]!.page, null);
  await w.db.close();
});

test('not configured, or a database that cannot be reached: refused plainly, nothing stored', async () => {
  const w = await world();
  for (const env of [{ SUPPORT_SOURCE_SALT: undefined }, { SUPPORT_SOURCE_SALT: 'short' }, { SUPABASE_SERVICE_ROLE_KEY: undefined }, { SUPABASE_URL: undefined }]) {
    const r = await w.post(VISITOR, {}, { env });
    assert.equal(r.status, 503);
    assert.equal(r.body!.code, 'not-configured');
    const info = await w.handler.fetch(new Request('https://support.test/'), { ...ENV, ...env } as never);
    assert.equal(((await info.json()) as { configured: boolean }).configured, false);
  }
  assert.equal(w.rpcCalls.length, 0);
  await w.db.close();

  const down = await world({ dbDown: true });
  const r = await down.post(VISITOR);
  assert.equal(r.status, 503);
  assert.equal(r.body!.code, 'unavailable');
  await down.db.close();
});

test('the protection is the database’s: the same Worker holding only the public key is refused by it', async () => {
  const w = await world();
  const r = await w.post(VISITOR, {}, { env: { SUPABASE_SERVICE_ROLE_KEY: ANON_KEY } });
  assert.equal(r.status, 503);
  assert.equal(r.body!.code, 'unavailable');
  assert.deepEqual(w.rpcCalls, [{ fn: 'support_request_visitor', role: 'anon' }]);
  assert.equal((await w.rows()).length, 0);
  await w.db.close();
});

test('the hourly cleanup erases old source hashes through the service role', async () => {
  const w = await world();
  assert.equal((await w.post(VISITOR)).status, 200);
  assert.equal(await cleanup({ fetch: w.fetchFn }, ENV as never), 0);
  await w.db.raw.query("update public.support_requests set created_at = now() - interval '25 hours'");
  assert.equal(await cleanup({ fetch: w.fetchFn }, ENV as never), 1);
  const rows = await w.rows();
  assert.equal(rows.length, 1, 'the request stays');
  assert.equal(rows[0]!.source_hash, null);
  assert.equal(await cleanup({ fetch: w.fetchFn }, { ALLOWED_ORIGINS: ORIGIN } as never), null, 'not configured: nothing to do');
  await w.db.close();
});

test('the site’s client words every refusal, and without a Worker address it never sends anything', async () => {
  const w = await world();
  // The browser's fetch, played by the handler with Cloudflare's header added.
  const browser = (ip: string) =>
    (async (input: unknown, init?: RequestInit) =>
      w.handler.fetch(
        new Request(String(input), { method: init?.method, body: init?.body as string, headers: { ...(init?.headers as Record<string, string>), Origin: ORIGIN, [SOURCE_HEADER]: ip } }),
        ENV as never,
      )) as typeof fetch;
  const request = { topic: 'account' as const, message: MESSAGE, email: 'student@example.test', context: 'help' as const, page: '/help', locale: 'ru' as const };

  const first = await sendVisitorSupportRequest(request, 'https://support.test', browser(VISITOR));
  assert.equal(first.ok, true);
  for (let i = 0; i < 2; i += 1) {
    assert.equal((await sendVisitorSupportRequest({ ...request, email: `other-${i}@example.test` }, 'https://support.test', browser(VISITOR))).ok, true);
  }
  assert.deepEqual(await sendVisitorSupportRequest({ ...request, email: 'fourth@example.test' }, 'https://support.test', browser(VISITOR)), {
    ok: false,
    reason: 'source-limited',
  });
  // The reply address has had its three for the day, from any sender.
  for (let i = 0; i < 2; i += 1) assert.equal((await sendVisitorSupportRequest(request, 'https://support.test', browser(`198.51.100.${30 + i}`))).ok, true);
  assert.deepEqual(await sendVisitorSupportRequest(request, 'https://support.test', browser('198.51.100.40')), { ok: false, reason: 'rate-limited' });
  assert.deepEqual(await sendVisitorSupportRequest(request, 'https://support.test', (async () => new Response('{"code":"challenge-failed"}', { status: 403 })) as typeof fetch), {
    ok: false,
    reason: 'challenge-failed',
  });
  assert.deepEqual(await sendVisitorSupportRequest(request, 'https://support.test', (async () => new Response('{"code":"not-configured"}', { status: 503 })) as typeof fetch), {
    ok: false,
    reason: 'visitor-off',
  });
  assert.deepEqual(
    await sendVisitorSupportRequest(request, 'https://support.test', (async () => {
      throw new Error('offline');
    }) as typeof fetch),
    { ok: false, reason: 'network' },
  );

  // No Worker address on this build: refused at once, and nothing is sent anywhere.
  let called = 0;
  const never = (async () => {
    called += 1;
    return new Response('{}');
  }) as typeof fetch;
  assert.deepEqual(await sendVisitorSupportRequest(request, '', never), { ok: false, reason: 'visitor-off' });
  assert.equal(called, 0);
  await w.db.close();
});

test('the Worker reads the sender from one header only, and the test-only override is not in it', () => {
  const source = readFileSync(new URL('../workers/support/src/index.ts', import.meta.url), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /standin/i, 'the stand-in’s override has no place in the Worker');
  assert.doesNotMatch(code, /forwarded|real-ip|client-ip/i);
  const reads = [...code.matchAll(/headers\.get\(([^)]+)\)/g)].map((m) => m[1]);
  assert.deepEqual(reads.sort(), ["'Origin'", 'SOURCE_HEADER']);
  assert.equal(SOURCE_HEADER, 'CF-Connecting-IP');
  // The form has no way to reach the database signed out.
  const form = readFileSync(new URL('../src/components/support/SupportForm.tsx', import.meta.url), 'utf8');
  assert.match(form, /signedIn\s*\?\s*await sendSupportRequest\([\s\S]*?:\s*await sendVisitorSupportRequest\(/);
  assert.match(form, /!signedIn && !visitorSupportEnabled\(\)/);
});
