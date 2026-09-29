/* The browser's side of buying access. Builder A2, audit remediation F01.

   BROWSER ONLY. It can ask the payments Worker (workers/payments) to open a
   checkout for a plan, and read the signed-in student's own orders. It can
   never say a payment happened, never names a price and never names a
   student: the Worker takes the price from the database and the student
   from the access token. Paid access itself is read from the trial status
   (src/lib/trial/client.ts), which the server writes only after the
   provider confirms a payment.

   Switches (build time):
     PUBLIC_PAYMENTS_URL        the payments Worker. Unset: buying stays
                                switched off, exactly as before.
     PUBLIC_PAYMENTS_SIMULATED  '1' only with the local stand-in: the purchase
                                screens show a SIMULATED banner. */

import { parsePaymentOrder, type PaymentOrder } from '../../lib/access/plans';
import { ACCESS_MODE } from '../../lib/trial/mode';
import type { OrderFetch } from './access-state';

export const PAYMENTS_URL: string = String(import.meta.env?.PUBLIC_PAYMENTS_URL ?? '').trim().replace(/\/+$/, '');
export const PAYMENTS_SIMULATED: boolean = import.meta.env?.PUBLIC_PAYMENTS_SIMULATED === '1';

/** Buying is possible only on the gated build with a payments Worker. The
    open site never sells individual access (audit F01). */
export const PURCHASE_ENABLED: boolean = ACCESS_MODE === 'trial' && PAYMENTS_URL !== '';

function offline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

async function token(): Promise<string | null> {
  const { getAccessToken } = await import('../../lib/auth/session');
  return getAccessToken();
}

async function readCode(resp: Response): Promise<string> {
  try {
    const body = (await resp.json()) as { code?: unknown };
    return typeof body.code === 'string' ? body.code : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export type CheckoutResult = { ok: true; orderId: string; url: string; simulated: boolean } | { ok: false; code: string };

/** Asks the Worker to open a checkout for `planId` and hands back where the
    browser should go to pay. */
export async function startCheckout(planId: string): Promise<CheckoutResult> {
  if (!PURCHASE_ENABLED) return { ok: false, code: 'not-configured' };
  const bearer = await token();
  if (!bearer) return { ok: false, code: 'sign-in-required' };
  let resp: Response;
  try {
    resp = await fetch(`${PAYMENTS_URL}/checkout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
  } catch {
    return { ok: false, code: offline() ? 'offline' : 'unavailable' };
  }
  if (!resp.ok) return { ok: false, code: await readCode(resp) };
  try {
    const body = (await resp.json()) as { orderId?: unknown; url?: unknown; simulated?: unknown };
    const url = typeof body.url === 'string' ? new URL(body.url) : null;
    if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:') || typeof body.orderId !== 'string') {
      return { ok: false, code: 'provider-unavailable' };
    }
    return { ok: true, orderId: body.orderId, url: url.toString(), simulated: body.simulated === true };
  } catch {
    return { ok: false, code: 'provider-unavailable' };
  }
}

/** One of the student's own orders, from the Worker (GET /order/<id>): the
    return page and "Check again". Someone else's order is not-found. If the
    Worker cannot answer, the same order is read from the database as the
    student (access_order), which reports exactly the same facts; only when
    both fail is it "could not check". */
export async function fetchOrder(orderId: string): Promise<OrderFetch> {
  const fromWorker = await fetchOrderFromWorker(orderId);
  if (fromWorker.ok || fromWorker.code !== 'unavailable') return fromWorker;
  const fromDatabase = await readOrder(orderId);
  return fromDatabase.ok || fromDatabase.code === 'not-found' ? fromDatabase : fromWorker;
}

async function fetchOrderFromWorker(orderId: string): Promise<OrderFetch> {
  if (!PAYMENTS_URL) return { ok: false, code: 'not-configured' };
  const bearer = await token();
  if (!bearer) return { ok: false, code: 'sign-in-required' };
  let resp: Response;
  try {
    resp = await fetch(`${PAYMENTS_URL}/order/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${bearer}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, code: offline() ? 'offline' : 'unavailable' };
  }
  if (resp.status === 404) return { ok: false, code: 'not-found' };
  if (resp.status === 401) return { ok: false, code: 'sign-in-required' };
  if (!resp.ok) {
    const code = await readCode(resp);
    return { ok: false, code: code === 'not-configured' ? 'not-configured' : 'unavailable' };
  }
  const order = parsePaymentOrder(await resp.json().catch(() => null));
  return order ? { ok: true, order } : { ok: false, code: 'unavailable' };
}

async function rpc(fn: string, args: Record<string, unknown> = {}): Promise<{ data: unknown; failed: boolean }> {
  const { getSupabase } = await import('../../lib/auth/supabase');
  const sb = getSupabase();
  if (!sb) return { data: null, failed: true };
  try {
    const { data, error } = await sb.rpc(fn, args);
    return { data, failed: Boolean(error) };
  } catch {
    return { data: null, failed: true };
  }
}

/** The student's orders, newest first (access_orders()), for the purchase
    history and an interrupted purchase. Read straight from the database as
    the student, so it works whether or not payments are switched on. */
export async function listOrders(): Promise<PaymentOrder[] | null> {
  const { data, failed } = await rpc('access_orders');
  if (failed || !Array.isArray(data)) return null;
  return data.map(parsePaymentOrder).filter((o): o is PaymentOrder => o !== null);
}

/** One of the student's own orders (access_order()), for the receipt. */
export async function readOrder(orderId: string): Promise<OrderFetch> {
  const { data, failed } = await rpc('access_order', { p_order: orderId });
  if (failed) return { ok: false, code: offline() ? 'offline' : 'unavailable' };
  const order = parsePaymentOrder(data);
  return order ? { ok: true, order } : { ok: false, code: 'not-found' };
}
