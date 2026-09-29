/* Cloudflare Worker: payments, the only thing that turns money into access.

   Contract: docs/paid-access/CONTRACT.md. Read workers/payments/README.md
   before touching it. NOT deployed.

   The browser can ask for a checkout and read its own orders. It can never
   say a payment happened: only the provider can, through a webhook this
   Worker verifies, and only then does the database record paid access
   (supabase/migrations/2026-09-30-paid-access.sql). The price comes from the
   database, never from the request.

     GET  /                    what is configured: {provider, simulated, configured}
     POST /checkout            {planId}, with the student's access token:
                               creates the order (as the student), opens the
                               provider's checkout, marks the order pending,
                               answers {orderId, planId, amount, currency, url, simulated}
     GET  /order/<id>          the student's own order, with its grant, for
                               the return page and an interrupted purchase
     POST /webhook/<provider>  the provider's signed event: paid, failed,
                               cancelled or refunded

   PROVIDERS. Every provider is one adapter with two jobs: open a checkout
   for an order, and verify and read a webhook. Alex has not chosen a
   provider (29 September 2026), so the only adapter is `simulated`, which
   takes no money and exists to prove the lifecycle locally. It is REFUSED
   unless PAYMENTS_PROVIDER=simulated AND PAYMENTS_ALLOW_SIMULATED=local, and
   everything it produces says SIMULATED. A simulated payment proves the
   order, grant, replay, failure and refund rules, never an integration.

   DECIDED (Alex, 29 September 2026): a purchase is a fixed period that
   simply ends. No automatic renewal, no refund after purchase offered to
   students. The refund event is still handled, because a provider can issue
   one (for example by error), and the database must then take the access
   back. */

import { TrialServiceError, bearer, serviceRpc, verifyAccessToken, type TrialRpc } from '../../../src/lib/trial/gate';

export interface Env {
  ALLOWED_ORIGINS: string; // vars, comma-separated
  SUPABASE_URL?: string; // vars
  /** The project's public anon key (vars). The order is created AS the
      student, with their token, so the database itself decides whose it is. */
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string; // wrangler secret
  /** Which adapter answers. Only 'simulated' exists. Unset: not configured. */
  PAYMENTS_PROVIDER?: string;
  /** Must be exactly 'local' for the simulated adapter to run at all. */
  PAYMENTS_ALLOW_SIMULATED?: string;
  /** Verifies the provider's webhook signatures (wrangler secret). */
  PAYMENTS_WEBHOOK_SECRET?: string;
  /** Where the provider sends the student back, without the query:
      <site>/ielts-website/plans/return. The order id is added as ?order=. */
  PAYMENTS_RETURN_URL?: string;
  /** Simulated only: the local stand-in's pretend provider page
      (tools/mr-ez-dev-server.mjs serves it at /__pay). */
  SIMULATED_PAY_URL?: string;
}

export interface Deps {
  fetch: typeof fetch;
}

/* ── Providers ──────────────────────────────────────────────────────────── */

export interface CheckoutOrder {
  orderId: string;
  planId: string;
  amount: number;
  currency: string;
  /** The site's return page for this order. */
  returnUrl: string;
}

export interface Checkout {
  /** Where the browser goes to pay. */
  url: string;
  /** The provider's own id for this payment. */
  providerRef: string;
}

export type PaymentEvent =
  | { type: 'paid'; orderId: string; providerRef: string; amount: number; currency: string }
  | { type: 'failed' | 'cancelled'; orderId: string; providerRef: string; reason: string }
  | { type: 'refunded'; orderId: string; providerRef: string };

export interface ProviderAdapter {
  readonly name: string;
  readonly simulated: boolean;
  createCheckout(order: CheckoutOrder): Promise<Checkout>;
  /** The event a genuine webhook carries, or null when its signature (or
      shape) does not check out. */
  verifyWebhook(request: Request, rawBody: string): Promise<PaymentEvent | null>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REF = /^[A-Za-z0-9_.:-]{4,200}$/;
const PLAN = /^[a-z0-9-]{2,40}$/;

async function hmacHex(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison, so a signature cannot be guessed a byte at a
    time from response timings. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const SIMULATED_SIGNATURE_HEADER = 'X-Simulated-Signature';

/** Signs a simulated webhook body the way the simulated "provider" (the
    local stand-in's /__pay page, and the tests) does. */
export function signSimulatedEvent(secret: string, rawBody: string): Promise<string> {
  return hmacHex(secret, `simulated:${rawBody}`);
}

/** The simulated provider. No money moves. The checkout page it names is
    the local stand-in's, and says SIMULATED on every screen. */
export function simulatedAdapter(env: Env): ProviderAdapter {
  const secret = env.PAYMENTS_WEBHOOK_SECRET ?? '';
  const payUrl = (env.SIMULATED_PAY_URL ?? '').replace(/\/+$/, '');
  return {
    name: 'simulated',
    simulated: true,
    async createCheckout(order) {
      const providerRef = `sim_${order.orderId.replace(/-/g, '')}`;
      const url = `${payUrl}/${order.orderId}?return=${encodeURIComponent(order.returnUrl)}`;
      return { url, providerRef };
    },
    async verifyWebhook(request, rawBody) {
      const given = request.headers.get(SIMULATED_SIGNATURE_HEADER) ?? '';
      if (!secret || !/^[0-9a-f]{64}$/.test(given)) return null;
      if (!sameSecret(await signSimulatedEvent(secret, rawBody), given)) return null;
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return null;
      }
      const { event, orderId, providerRef } = body;
      if (typeof orderId !== 'string' || !UUID.test(orderId)) return null;
      if (typeof providerRef !== 'string' || !REF.test(providerRef)) return null;
      if (event === 'paid') {
        if (typeof body.amount !== 'number' || !Number.isInteger(body.amount) || typeof body.currency !== 'string') return null;
        return { type: 'paid', orderId, providerRef, amount: body.amount, currency: body.currency };
      }
      if (event === 'failed' || event === 'cancelled') {
        const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : event;
        return { type: event, orderId, providerRef, reason };
      }
      if (event === 'refunded') return { type: 'refunded', orderId, providerRef };
      return null;
    },
  };
}

export type AdapterChoice = { ok: true; adapter: ProviderAdapter } | { ok: false; code: 'not-configured' | 'simulated-refused' };

/** The adapter this deployment may use. The simulated one only with both
    local switches, so a deployed Worker can never take a pretend payment. */
export function resolveAdapter(env: Env): AdapterChoice {
  if (env.PAYMENTS_PROVIDER === 'simulated') {
    if (env.PAYMENTS_ALLOW_SIMULATED !== 'local' || !env.PAYMENTS_WEBHOOK_SECRET || !env.SIMULATED_PAY_URL) {
      return { ok: false, code: 'simulated-refused' };
    }
    return { ok: true, adapter: simulatedAdapter(env) };
  }
  /* A real provider is added here once Alex chooses one, as one more
     adapter behind the same interface. Until then nothing else exists. */
  return { ok: false, code: 'not-configured' };
}

/* ── HTTP ───────────────────────────────────────────────────────────────── */

function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = allowedOrigins(env);
  return {
    'Access-Control-Allow-Origin': origin && allowed.includes(origin) ? origin : allowed[0] ?? '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    // An order is personal: never cached by a browser or a CDN.
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', ...cors },
  });
}

function refuse(status: number, code: string, error: string, cors: Record<string, string>): Response {
  return json({ error, code }, status, cors);
}

const MAX_BODY = 16 * 1024;

async function readText(request: Request): Promise<string | null> {
  const text = await request.text().catch(() => null);
  return text !== null && text.length <= MAX_BODY ? text : null;
}

/** PostgREST's /rest/v1/rpc/<fn> AS THE STUDENT: the anon key plus their
    own access token, so auth.uid() in the database is them and nobody the
    request names. Null is a real answer here (an order that is not theirs). */
async function studentRpc(deps: Deps, env: Env, token: string, fn: string, args: Record<string, unknown>): Promise<unknown> {
  let resp: Response;
  try {
    resp = await deps.fetch(`${(env.SUPABASE_URL as string).replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_ANON_KEY as string, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
  } catch {
    throw new TrialServiceError(`payments: ${fn} unreachable`);
  }
  if (resp.status === 401 || resp.status === 403) throw new SignInRequired();
  if (!resp.ok) throw new TrialServiceError(`payments: ${fn} answered ${resp.status}`);
  return resp.json().catch(() => {
    throw new TrialServiceError(`payments: ${fn} answered unreadably`);
  });
}

class SignInRequired extends Error {}

const CHECKOUT_REFUSALS: Record<string, [number, string]> = {
  'plan-unavailable': [400, 'That plan is not available.'],
  'too-many-open-orders': [429, 'Too many unfinished purchases. Try again in an hour.'],
};

/* The provider is answered with a status it understands: 2xx means "stop
   retrying", 5xx means "try again later". A refused event is 4xx so it is
   visible in the provider's log, and the database was not changed. */
const WEBHOOK_REFUSALS: Record<string, number> = {
  'not-found': 404,
  'amount-mismatch': 422,
  'provider-mismatch': 409,
  'ref-mismatch': 409,
  'ref-in-use': 409,
  refunded: 409,
  'not-paid': 409,
};

export function createHandler(deps: Deps): { fetch(request: Request, env: Env): Promise<Response> } {
  async function checkout(request: Request, env: Env, adapter: ProviderAdapter, cors: Record<string, string>): Promise<Response> {
    const token = bearer(request);
    const userId = token
      ? await verifyAccessToken(deps.fetch, env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string, token)
      : null;
    if (!token || !userId) return refuse(401, 'sign-in-required', 'Sign in to buy access.', cors);

    const raw = await readText(request);
    let planId: unknown;
    try {
      planId = raw ? (JSON.parse(raw) as { planId?: unknown }).planId : undefined;
    } catch {
      planId = undefined;
    }
    if (typeof planId !== 'string' || !PLAN.test(planId)) return refuse(400, 'bad-request', 'Expected { planId }.', cors);

    const created = (await studentRpc(deps, env, token, 'access_order_create', { p_plan: planId })) as Record<string, unknown> | null;
    if (!created || created.ok !== true) {
      const reason = String(created?.reason ?? 'plan-unavailable');
      const [status, message] = CHECKOUT_REFUSALS[reason] ?? CHECKOUT_REFUSALS['plan-unavailable'];
      return refuse(status, reason, message, cors);
    }
    const order: CheckoutOrder = {
      orderId: String(created.orderId),
      planId: String(created.planId),
      amount: Number(created.amount),
      currency: String(created.currency),
      returnUrl: `${(env.PAYMENTS_RETURN_URL as string).replace(/\/+$/, '')}?order=${created.orderId}`,
    };

    const rpc = serviceRpc(deps.fetch, env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string);
    let opened: Checkout;
    try {
      opened = await adapter.createCheckout(order);
      if (!REF.test(opened.providerRef)) throw new Error('bad provider reference');
    } catch {
      await rpc('access_order_failed', { p_order: order.orderId, p_reason: 'checkout-failed' }).catch(() => undefined);
      return refuse(502, 'provider-unavailable', 'The payment page could not be opened. Nothing was charged. Try again shortly.', cors);
    }
    const pending = await rpc('access_order_mark_pending', { p_order: order.orderId, p_provider: adapter.name, p_ref: opened.providerRef });
    if (pending.ok !== true) {
      return refuse(502, 'provider-unavailable', 'The payment page could not be opened. Nothing was charged. Try again shortly.', cors);
    }
    return json(
      { orderId: order.orderId, planId: order.planId, amount: order.amount, currency: order.currency, url: opened.url, simulated: adapter.simulated },
      200,
      cors,
    );
  }

  async function readOrder(request: Request, env: Env, orderId: string, cors: Record<string, string>): Promise<Response> {
    const token = bearer(request);
    if (!token) return refuse(401, 'sign-in-required', 'Sign in to see this purchase.', cors);
    const order = await studentRpc(deps, env, token, 'access_order', { p_order: orderId });
    if (!order) return refuse(404, 'not-found', 'Not found.', cors);
    return json(order, 200, cors);
  }

  async function webhook(request: Request, env: Env, adapter: ProviderAdapter, cors: Record<string, string>): Promise<Response> {
    const raw = await readText(request);
    if (raw === null) return refuse(413, 'bad-request', 'Too large.', cors);
    const event = await adapter.verifyWebhook(request, raw);
    if (!event) return refuse(401, 'bad-signature', 'Signature not valid.', cors);
    const rpc: TrialRpc = serviceRpc(deps.fetch, env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string);
    let result: Record<string, unknown>;
    if (event.type === 'paid') {
      result = await rpc('access_order_paid', {
        p_order: event.orderId,
        p_provider: adapter.name,
        p_ref: event.providerRef,
        p_amount: event.amount,
        p_currency: event.currency,
      });
    } else if (event.type === 'refunded') {
      result = await rpc('access_order_refunded', { p_order: event.orderId, p_provider_ref: event.providerRef });
    } else {
      result = await rpc('access_order_failed', {
        p_order: event.orderId,
        p_reason: event.type === 'cancelled' ? 'cancelled' : event.reason === 'cancelled' ? 'failed' : event.reason,
      });
    }
    if (result.ok !== true) {
      const reason = String(result.reason ?? 'refused');
      return refuse(WEBHOOK_REFUSALS[reason] ?? 409, reason, 'Event refused.', cors);
    }
    return json({ ok: true, event: event.type, status: result.status, replay: result.replay === true, unchanged: result.unchanged === true }, 200, cors);
  }

  async function handle(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    // Origin raises the bar against casual cross-site use; the sign-in and
    // the webhook signature are the real checks.
    if (origin && !allowedOrigins(env).includes(origin)) return refuse(403, 'bad-origin', 'Origin not allowed.', cors);

    const url = new URL(request.url);
    const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const choice = resolveAdapter(env);
    const configured = choice.ok && Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY && env.PAYMENTS_RETURN_URL);

    if (request.method === 'GET' && parts.length === 0) {
      return json({ provider: choice.ok ? choice.adapter.name : null, simulated: choice.ok && choice.adapter.simulated, configured }, 200, cors);
    }
    if (!choice.ok) {
      return refuse(
        503,
        choice.code,
        choice.code === 'simulated-refused' ? 'The simulated provider runs only on a local stand-in.' : 'Payment is not connected yet.',
        cors,
      );
    }
    if (!configured) return refuse(503, 'not-configured', 'Payment is not connected yet.', cors);

    try {
      if (request.method === 'POST' && parts.length === 1 && parts[0] === 'checkout') return await checkout(request, env, choice.adapter, cors);
      if (request.method === 'GET' && parts.length === 2 && parts[0] === 'order' && UUID.test(parts[1])) {
        return await readOrder(request, env, parts[1].toLowerCase(), cors);
      }
      if (request.method === 'POST' && parts.length === 2 && parts[0] === 'webhook') {
        if (parts[1] !== choice.adapter.name) return refuse(404, 'not-found', 'Not found.', cors);
        return await webhook(request, env, choice.adapter, cors);
      }
    } catch (err) {
      if (err instanceof SignInRequired) return refuse(401, 'sign-in-required', 'Sign in again.', cors);
      if (!(err instanceof TrialServiceError)) console.error('payments: unexpected failure', err instanceof Error ? err.message : 'unknown');
      // Fail closed. For a webhook, 503 tells the provider to try again later.
      return refuse(503, 'unavailable', 'Payments could not be reached just now. Nothing has changed. Try again shortly.', cors);
    }
    return refuse(404, 'not-found', 'Not found.', cors);
  }

  return { fetch: handle };
}

export default {
  fetch: (request: Request, env: Env) => createHandler({ fetch: (input, init) => fetch(input, init) }).fetch(request, env),
};
