/* The payments Worker (workers/payments): the REAL handler, end to end,
 * with the SIMULATED provider, against the REAL paid-access migration in
 * PGlite (tools/trial-db.mjs). No network, no provider, no money.
 *
 * What is proved: checkout creates an order at the server's price for the
 * signed-in student and returns the simulated payment page; a signed paid
 * webhook grants access and the order reads back as paid; a replayed webhook
 * is harmless; an unsigned or wrongly signed webhook, or one for another
 * amount, changes nothing; failed and cancelled never touch a paid order; a
 * refund takes access back; the simulated provider is refused without both
 * local switches; one student cannot read another's order; CORS; and a
 * database that cannot be reached is a refusal that changes nothing.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, resolveAdapter, signSimulatedEvent, SIMULATED_SIGNATURE_HEADER } from '../workers/payments/src/index.ts';
import { createTrialDb } from '../tools/trial-db.mjs';
import { parsePaymentOrder } from '../src/lib/access/plans.ts';
import { hasPaidAccess, parseTrialStatus } from '../src/lib/trial/status.ts';

const ORIGIN = 'https://lxson777-tech.github.io';
const SUPABASE_URL = 'https://proj.supabase.co';
const SERVICE_KEY = 'service-role-dummy';
const ANON_KEY = 'anon-dummy';
const SECRET = 'webhook-secret-dummy';
const A = 'aaaaaaaa-7777-4777-8777-aaaaaaaaaaaa';
const B = 'bbbbbbbb-8888-4888-8888-bbbbbbbbbbbb';
const TOKENS: Record<string, string> = { 'token-a': A, 'token-b': B };

const SIMULATED_ENV = {
  ALLOWED_ORIGINS: `${ORIGIN},http://localhost:4511`,
  SUPABASE_URL,
  SUPABASE_ANON_KEY: ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  PAYMENTS_PROVIDER: 'simulated',
  PAYMENTS_ALLOW_SIMULATED: 'local',
  PAYMENTS_WEBHOOK_SECRET: SECRET,
  PAYMENTS_RETURN_URL: 'http://localhost:4511/ielts-website/plans/return',
  SIMULATED_PAY_URL: 'http://127.0.0.1:8511/__pay',
};

async function world(opts: { dbDown?: boolean } = {}) {
  const db = await createTrialDb();
  await db.addUser(A, 'pay-a@example.test');
  await db.addUser(B, 'pay-b@example.test');
  const seen: { fn: string; role: string }[] = [];
  const fetchFn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const token = (headers.Authorization ?? '').replace('Bearer ', '');
    if (url === `${SUPABASE_URL}/auth/v1/user`) {
      const id = TOKENS[token];
      return id ? new Response(JSON.stringify({ id })) : new Response('{}', { status: 401 });
    }
    if (url.startsWith(`${SUPABASE_URL}/rest/v1/rpc/`)) {
      if (opts.dbDown) return new Response('{}', { status: 503 });
      const fn = url.slice(`${SUPABASE_URL}/rest/v1/rpc/`.length);
      // PostgREST: the service key is the service role; the anon key plus a
      // valid user token is that user; a bad token is refused outright.
      let role: 'service_role' | 'authenticated' | 'anon' = 'anon';
      let userId: string | null = null;
      if (headers.apikey === SERVICE_KEY) role = 'service_role';
      else if (token && token !== ANON_KEY) {
        userId = TOKENS[token] ?? null;
        if (!userId) return new Response('{}', { status: 401 });
        role = 'authenticated';
      }
      seen.push({ fn, role });
      try {
        return new Response(JSON.stringify(await db.rpc(fn, JSON.parse(String(init?.body)), { role, userId })));
      } catch (err) {
        return new Response(JSON.stringify({ message: (err as Error).message }), { status: (err as { status?: number }).status ?? 400 });
      }
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  const handler = createHandler({ fetch: fetchFn });
  const call = async (method: string, path: string, opts2: { token?: string; body?: unknown; headers?: Record<string, string>; env?: Record<string, unknown>; raw?: string } = {}) => {
    const headers: Record<string, string> = { Origin: ORIGIN, ...(opts2.headers ?? {}) };
    if (opts2.token) headers.Authorization = `Bearer ${opts2.token}`;
    if (opts2.body !== undefined || opts2.raw !== undefined) headers['Content-Type'] = 'application/json';
    const response = await handler.fetch(
      new Request(`https://payments.test${path}`, {
        method,
        headers,
        body: opts2.raw ?? (opts2.body === undefined ? undefined : JSON.stringify(opts2.body)),
      }),
      { ...SIMULATED_ENV, ...(opts2.env ?? {}) } as never,
    );
    const text = await response.text();
    return { status: response.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null, headers: response.headers };
  };
  /** A webhook exactly as the simulated provider sends one. */
  const webhook = async (event: Record<string, unknown>, sign: string | null = SECRET) => {
    const raw = JSON.stringify(event);
    const headers: Record<string, string> = {};
    if (sign) headers[SIMULATED_SIGNATURE_HEADER] = await signSimulatedEvent(sign, raw);
    // A provider is a server: no Origin.
    const response = await handler.fetch(
      new Request('https://payments.test/webhook/simulated', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: raw }),
      SIMULATED_ENV as never,
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  const status = async (user = A) => parseTrialStatus(await db.rpc('trial_state', { p_user: user }, { role: 'service_role' }))!;
  return { db, call, webhook, status, seen };
}

const ref = (orderId: string) => `sim_${orderId.replace(/-/g, '')}`;

test('checkout -> paid webhook -> the order reads back paid, and the account has paid access', async () => {
  const w = await world();
  const checkout = await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-1' } });
  assert.equal(checkout.status, 200, JSON.stringify(checkout.body));
  const orderId = String(checkout.body!.orderId);
  assert.equal(checkout.body!.amount, 10000);
  assert.equal(checkout.body!.currency, 'KZT');
  assert.equal(checkout.body!.simulated, true);
  assert.equal(
    checkout.body!.url,
    `http://127.0.0.1:8511/__pay/${orderId}?return=${encodeURIComponent(`http://localhost:4511/ielts-website/plans/return?order=${orderId}`)}`,
  );
  // The order was created AS the student, and only the Worker marked it pending.
  assert.deepEqual(w.seen.slice(0, 2), [
    { fn: 'access_order_create', role: 'authenticated' },
    { fn: 'access_order_mark_pending', role: 'service_role' },
  ]);
  const before = await w.call('GET', `/order/${orderId}`, { token: 'token-a' });
  assert.equal(parsePaymentOrder(before.body)?.status, 'pending');
  assert.equal(hasPaidAccess(await w.status(), Date.now()), false);

  const paid = await w.webhook({ event: 'paid', orderId, providerRef: ref(orderId), amount: 10000, currency: 'KZT' });
  assert.equal(paid.status, 200, JSON.stringify(paid.body));
  assert.deepEqual(paid.body, { ok: true, event: 'paid', status: 'paid', replay: false, unchanged: false });

  const after = parsePaymentOrder((await w.call('GET', `/order/${orderId}`, { token: 'token-a' })).body)!;
  assert.equal(after.status, 'paid');
  assert.match(String(after.receiptNumber), /^\d{4}-\d{6}$/);
  assert.notEqual(after.grant, null);
  assert.equal(hasPaidAccess(await w.status(), Date.now()), true);

  // Replayed by the provider: harmless, still one grant.
  const replay = await w.webhook({ event: 'paid', orderId, providerRef: ref(orderId), amount: 10000, currency: 'KZT' });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.replay, true);
  assert.equal((await w.db.select('select id from public.access_grants', [], { role: 'service_role' })).length, 1);
  await w.db.close();
});

test('the price comes from the server: the request cannot name one, and an unknown plan is refused', async () => {
  const w = await world();
  const cheap = await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-3', amount: 1, currency: 'USD', userId: B } });
  assert.equal(cheap.status, 200);
  assert.equal(cheap.body!.amount, 25000);
  const row = (await w.db.select('select user_id, amount, currency from public.payment_orders', [], { role: 'service_role' }))[0];
  assert.deepEqual(row, { user_id: A, amount: 25000, currency: 'KZT' });
  assert.equal((await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-99' } })).body!.code, 'plan-unavailable');
  assert.equal((await w.call('POST', '/checkout', { token: 'token-a', body: {} })).status, 400);
  assert.equal((await w.call('POST', '/checkout', { token: 'token-a', raw: 'not json' })).status, 400);
  await w.db.close();
});

test('checkout and order need a real sign-in; one student cannot read another\'s order', async () => {
  const w = await world();
  assert.equal((await w.call('POST', '/checkout', { body: { planId: 'month-1' } })).status, 401);
  assert.equal((await w.call('POST', '/checkout', { token: 'forged', body: { planId: 'month-1' } })).status, 401);
  const mine = await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-1' } });
  const orderId = String(mine.body!.orderId);
  assert.equal((await w.call('GET', `/order/${orderId}`)).status, 401);
  assert.equal((await w.call('GET', `/order/${orderId}`, { token: 'token-b' })).status, 404);
  assert.equal((await w.call('GET', '/order/not-a-uuid', { token: 'token-a' })).status, 404);
  await w.db.close();
});

test('a webhook with no signature, a wrong signature or a tampered body changes nothing', async () => {
  const w = await world();
  const orderId = String((await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-1' } })).body!.orderId);
  const event = { event: 'paid', orderId, providerRef: ref(orderId), amount: 10000, currency: 'KZT' };
  assert.equal((await w.webhook(event, null)).status, 401);
  assert.equal((await w.webhook(event, 'someone-elses-secret')).status, 401);
  // Signed, then altered on the way.
  const raw = JSON.stringify(event);
  const sig = await signSimulatedEvent(SECRET, raw);
  const tampered = await w.call('POST', '/webhook/simulated', {
    raw: raw.replace('10000', '100'),
    headers: { [SIMULATED_SIGNATURE_HEADER]: sig, Origin: '' },
  });
  assert.equal(tampered.status, 401);
  // Another provider's path is not this one.
  assert.equal((await w.call('POST', '/webhook/kaspi', { raw })).status, 404);
  assert.equal(hasPaidAccess(await w.status(), Date.now()), false);
  assert.equal((await w.db.select('select id from public.access_grants', [], { role: 'service_role' })).length, 0);
  await w.db.close();
});

test('a signed confirmation for the wrong amount or currency is refused and grants nothing', async () => {
  const w = await world();
  const orderId = String((await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-3' } })).body!.orderId);
  const low = await w.webhook({ event: 'paid', orderId, providerRef: ref(orderId), amount: 10000, currency: 'KZT' });
  assert.equal(low.status, 422);
  assert.equal(low.body.code, 'amount-mismatch');
  const usd = await w.webhook({ event: 'paid', orderId, providerRef: ref(orderId), amount: 25000, currency: 'USD' });
  assert.equal(usd.body.code, 'amount-mismatch');
  assert.equal(parsePaymentOrder((await w.call('GET', `/order/${orderId}`, { token: 'token-a' })).body)?.status, 'pending');
  assert.equal(hasPaidAccess(await w.status(), Date.now()), false);
  await w.db.close();
});

test('failed and cancelled record the outcome, never downgrade a paid order; a refund takes access back', async () => {
  const w = await world();
  const failedId = String((await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-1' } })).body!.orderId);
  const failed = await w.webhook({ event: 'failed', orderId: failedId, providerRef: ref(failedId), reason: 'declined' });
  assert.equal(failed.status, 200);
  assert.equal(parsePaymentOrder((await w.call('GET', `/order/${failedId}`, { token: 'token-a' })).body)?.status, 'failed');

  const cancelledId = String((await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-1' } })).body!.orderId);
  await w.webhook({ event: 'cancelled', orderId: cancelledId, providerRef: ref(cancelledId) });
  assert.equal(parsePaymentOrder((await w.call('GET', `/order/${cancelledId}`, { token: 'token-a' })).body)?.status, 'cancelled');

  const paidId = String((await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-1' } })).body!.orderId);
  await w.webhook({ event: 'paid', orderId: paidId, providerRef: ref(paidId), amount: 10000, currency: 'KZT' });
  for (const event of ['failed', 'cancelled']) {
    const late = await w.webhook({ event, orderId: paidId, providerRef: ref(paidId) });
    assert.equal(late.status, 200);
    assert.equal(late.body.unchanged, true);
  }
  assert.equal(parsePaymentOrder((await w.call('GET', `/order/${paidId}`, { token: 'token-a' })).body)?.status, 'paid');
  assert.equal(hasPaidAccess(await w.status(), Date.now()), true);

  const refund = await w.webhook({ event: 'refunded', orderId: paidId, providerRef: ref(paidId) });
  assert.equal(refund.status, 200);
  const order = parsePaymentOrder((await w.call('GET', `/order/${paidId}`, { token: 'token-a' })).body)!;
  assert.equal(order.status, 'refunded');
  assert.notEqual(order.grant?.revokedAt, null);
  assert.equal(hasPaidAccess(await w.status(), Date.now()), false);
  // A refund for an order that was never paid is refused.
  assert.equal((await w.webhook({ event: 'refunded', orderId: failedId, providerRef: ref(failedId) })).body.code, 'not-paid');
  await w.db.close();
});

test('the simulated provider is refused without both local switches, and nothing else is a provider yet', async () => {
  assert.deepEqual(resolveAdapter({ ...SIMULATED_ENV, PAYMENTS_ALLOW_SIMULATED: undefined } as never), { ok: false, code: 'simulated-refused' });
  assert.deepEqual(resolveAdapter({ ...SIMULATED_ENV, PAYMENTS_ALLOW_SIMULATED: 'production' } as never), { ok: false, code: 'simulated-refused' });
  assert.deepEqual(resolveAdapter({ ...SIMULATED_ENV, PAYMENTS_PROVIDER: undefined } as never), { ok: false, code: 'not-configured' });
  assert.deepEqual(resolveAdapter({ ...SIMULATED_ENV, PAYMENTS_PROVIDER: 'stripe' } as never), { ok: false, code: 'not-configured' });
  assert.equal(resolveAdapter(SIMULATED_ENV as never).ok, true);

  const w = await world();
  for (const env of [{ PAYMENTS_ALLOW_SIMULATED: undefined }, { PAYMENTS_PROVIDER: undefined }]) {
    const checkout = await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-1' }, env });
    assert.equal(checkout.status, 503);
    const probe = await w.call('GET', '/', { env });
    assert.deepEqual(probe.body, { provider: null, simulated: false, configured: false });
  }
  // The deployed configuration (workers/payments/wrangler.jsonc) is refused.
  const deployed = await w.call('POST', '/checkout', {
    token: 'token-a',
    body: { planId: 'month-1' },
    env: { PAYMENTS_PROVIDER: undefined, PAYMENTS_ALLOW_SIMULATED: undefined, SIMULATED_PAY_URL: undefined, PAYMENTS_WEBHOOK_SECRET: undefined },
  });
  assert.equal(deployed.body!.code, 'not-configured');
  assert.equal((await w.db.select('select id from public.payment_orders', [], { role: 'service_role' })).length, 0, 'no order was made');
  assert.deepEqual((await w.call('GET', '/')).body, { provider: 'simulated', simulated: true, configured: true });
  await w.db.close();
});

test('CORS: allowed origins are echoed, others refused; replies are never cached', async () => {
  const w = await world();
  const preflight = await w.call('OPTIONS', '/checkout', { headers: { Origin: 'http://localhost:4511' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'http://localhost:4511');
  assert.match(String(preflight.headers.get('Access-Control-Allow-Headers')), /Authorization/);
  const evil = await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-1' }, headers: { Origin: 'https://evil.example' } });
  assert.equal(evil.status, 403);
  assert.notEqual(evil.headers.get('Access-Control-Allow-Origin'), 'https://evil.example');
  const ok = await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-1' } });
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(ok.headers.get('Cache-Control'), 'private, no-store');
  await w.db.close();
});

test('an unreachable database is a refusal that changes nothing (and asks a provider to retry)', async () => {
  const w = await world({ dbDown: true });
  const checkout = await w.call('POST', '/checkout', { token: 'token-a', body: { planId: 'month-1' } });
  assert.equal(checkout.status, 503);
  const hook = await w.webhook({ event: 'paid', orderId: 'aaaaaaaa-0000-4000-8000-000000000000', providerRef: 'sim_x_0001', amount: 10000, currency: 'KZT' });
  assert.equal(hook.status, 503);
  await w.db.close();
});
