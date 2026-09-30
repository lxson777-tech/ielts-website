/* Cloudflare Worker: support, the signed-out visitor's way to a person.

   Read workers/support/README.md before touching it. NOT deployed.

   Why it exists (re-audit R01, 30 September 2026). The support form used to
   let a signed-out visitor call the database directly. The database could
   only limit by the email typed into the form, which costs nothing to make
   up, and then by one allowance shared by everyone: thirty requests with
   invented addresses shut every other signed-out visitor out for an hour.
   The database now refuses anonymous callers outright. A signed-out request
   comes here instead, and this Worker adds the two things a browser cannot
   be trusted to say about itself:

   - WHERE the request came from. Read from `CF-Connecting-IP` and nothing
     else: Cloudflare sets that header itself on every request that reaches
     a Worker and overwrites whatever the client sent. X-Forwarded-For, any
     other header and anything in the body are ignored. The address is never
     stored and never logged; what goes to the database is a keyed hash of
     it (HMAC-SHA-256 with SUPPORT_SOURCE_SALT, a secret only this Worker
     holds), so the table cannot be turned back into addresses. An IPv6
     sender is counted by its /64 network, because one subscriber owns all
     of those addresses and could otherwise use a new one per request. No
     source, no request: it fails closed.
   - WHETHER a bot check was passed. When TURNSTILE_SECRET_KEY is set, the
     request must carry a Cloudflare Turnstile token and this Worker checks
     it with Cloudflare (siteverify) before anything is stored. When it is
     not set, requests go ahead on the sender limits alone.

   The limits themselves live in the database
   (supabase/migrations/2026-09-30-support.sql, support_request_visitor):
   per sender by the hour and the day, then per reply address, and only then
   a shared circuit breaker that a request which passed the bot check is
   never stopped by. A refusal stores nothing.

     GET  /          what is configured: {configured, challenge}
     POST /request   {email, topic, message, context?, page?, locale?,
                      challengeToken?, trap?}
                     answers {ok: true, id} or {error, code}

   Signed-in students do not come here. Their request goes to the database
   as themselves (support_request_create), limited per account.

   Once an hour (wrangler.jsonc, triggers) the Worker asks the database to
   erase source hashes that are past their purpose; see `cleanup`. */

import { TrialServiceError, serviceRpc } from '../../../src/lib/trial/gate';
import { SUPPORT_LIMITS, SUPPORT_REASONS, isSupportEmail, isSupportTopic } from '../../../src/lib/support-rules';

export interface Env {
  ALLOWED_ORIGINS: string; // vars, comma-separated
  SUPABASE_URL?: string; // vars
  SUPABASE_SERVICE_ROLE_KEY?: string; // wrangler secret
  /** Keys the hash of a sender's address (wrangler secret). Any long random
      value. Without it nothing is accepted. Changing it forgets every
      sender's count, which is harmless. */
  SUPPORT_SOURCE_SALT?: string;
  /** Cloudflare Turnstile's secret key (wrangler secret), the pair of the
      site's PUBLIC_TURNSTILE_SITE_KEY. Set: every request must pass the bot
      check. Unset: the sender limits alone apply. */
  TURNSTILE_SECRET_KEY?: string;
}

export interface Deps {
  fetch: typeof fetch;
}

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** The only header a sender's address is read from. */
export const SOURCE_HEADER = 'CF-Connecting-IP';

const MAX_BODY = 16 * 1024;
const MIN_SALT = 16;
const MAX_TOKEN = 2048;

/* ── The sender ───────────────────────────────────────────────────────── */

function parseV4(text: string): string | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  return parts.every((n) => n <= 255) ? parts.join('.') : null;
}

/** An IPv6 address as its eight 16-bit groups, or null. */
function parseV6(text: string): number[] | null {
  if (!/^[0-9a-f:.]+$/.test(text) || !text.includes(':')) return null;
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const groupsOf = (part: string, last: boolean): number[] | null => {
    if (part === '') return [];
    const out: number[] = [];
    const groups = part.split(':');
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]!;
      if (group.includes('.')) {
        // A dotted IPv4 tail, only ever as the very end of the address.
        if (!last || i !== groups.length - 1) return null;
        const v4 = parseV4(group);
        if (!v4) return null;
        const [a, b, c, d] = v4.split('.').map(Number) as [number, number, number, number];
        out.push((a << 8) | b, (c << 8) | d);
      } else if (/^[0-9a-f]{1,4}$/.test(group)) {
        out.push(parseInt(group, 16));
      } else {
        return null;
      }
    }
    return out;
  };
  if (halves.length === 1) {
    const all = groupsOf(halves[0]!, true);
    return all && all.length === 8 ? all : null;
  }
  const head = groupsOf(halves[0]!, false);
  const tail = groupsOf(halves[1]!, true);
  if (!head || !tail) return null;
  const gap = 8 - head.length - tail.length;
  if (gap < 1) return null;
  return [...head, ...new Array<number>(gap).fill(0), ...tail];
}

/** What a sender is counted by: an IPv4 address whole, an IPv6 address by
    its /64 network. Null for anything that is not an address. Never stored
    as it is; see `sourceHash`. */
export function sourceKey(address: string | null): string | null {
  const text = (address ?? '').trim().toLowerCase();
  if (!text || text.length > 45) return null;
  const v4 = parseV4(text);
  if (v4) return `v4:${v4}`;
  const v6 = parseV6(text);
  if (!v6) return null;
  // ::ffff:a.b.c.d is the same sender as a.b.c.d.
  if (v6.slice(0, 5).every((g) => g === 0) && v6[5] === 0xffff) {
    return `v4:${v6[6]! >> 8}.${v6[6]! & 255}.${v6[7]! >> 8}.${v6[7]! & 255}`;
  }
  return `v6:${v6.slice(0, 4).map((g) => g.toString(16)).join(':')}`;
}

/** The keyed hash the database stores in place of the address. */
export async function sourceHash(salt: string, key: string): Promise<string> {
  const hmac = await crypto.subtle.importKey('raw', new TextEncoder().encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', hmac, new TextEncoder().encode(`support-source:v1:${key}`)));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ── The bot check ────────────────────────────────────────────────────── */

type ChallengeResult = 'passed' | 'failed' | 'unavailable';

/** Asks Cloudflare whether this Turnstile token is genuine, unused and was
    solved on this site. The browser's word is never taken for it. */
async function verifyChallenge(deps: Deps, env: Env, token: string, address: string): Promise<ChallengeResult> {
  let resp: Response;
  try {
    resp = await deps.fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY as string, response: token, remoteip: address }).toString(),
    });
  } catch {
    return 'unavailable';
  }
  if (!resp.ok) return 'unavailable';
  const body = (await resp.json().catch(() => null)) as { success?: unknown; hostname?: unknown } | null;
  if (!body || typeof body !== 'object') return 'unavailable';
  if (body.success !== true) return 'failed';
  // A token solved on some other site's page is not this site's visitor.
  if (typeof body.hostname === 'string' && body.hostname !== '') {
    const hosts = allowedOrigins(env).map((origin) => {
      try {
        return new URL(origin).hostname;
      } catch {
        return '';
      }
    });
    if (!hosts.includes(body.hostname)) return 'failed';
  }
  return 'passed';
}

/* ── HTTP ─────────────────────────────────────────────────────────────── */

function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = allowedOrigins(env);
  return {
    'Access-Control-Allow-Origin': origin && allowed.includes(origin) ? origin : allowed[0] ?? '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', ...cors },
  });
}

function refuse(status: number, code: string, error: string, cors: Record<string, string>): Response {
  return json({ error, code }, status, cors);
}

function configured(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && (env.SUPPORT_SOURCE_SALT ?? '').length >= MIN_SALT);
}

/** The database's refusals, as the status and sentence this Worker answers
    with. The site words its own sentence from the code. */
const REFUSALS: Record<string, [number, string]> = {
  'email-required': [400, 'An email address is needed so a person can answer.'],
  'email-invalid': [400, 'That email address does not look right.'],
  topic: [400, 'Choose what the message is about.'],
  'message-length': [400, `The message must be ${SUPPORT_LIMITS.messageMin} to ${SUPPORT_LIMITS.messageMax} characters.`],
  'source-hour': [429, 'Several messages have already come from this connection in the last hour. Please wait before sending more.'],
  'source-day': [429, 'Several messages have already come from this connection today. Please wait until tomorrow.'],
  'email-day': [429, 'Several messages have already been sent with this email address today. Please wait until tomorrow.'],
  busy: [429, 'A lot of messages are arriving just now. Please try again in an hour.'],
};

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

export function createHandler(deps: Deps): { fetch(request: Request, env: Env): Promise<Response> } {
  async function submit(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
    const raw = await request.text().catch(() => null);
    if (raw === null || raw.length > MAX_BODY) return refuse(413, 'bad-request', 'Too large.', cors);
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object');
      body = parsed as Record<string, unknown>;
    } catch {
      return refuse(400, 'bad-request', 'Expected { email, topic, message }.', cors);
    }

    // The form's hidden field. A person never sees it; a form-filling script
    // fills it in. It is told it worked, and nothing is stored or counted.
    if (text(body.trap).trim() !== '') return json({ ok: true }, 200, cors);

    const email = text(body.email).trim().toLowerCase();
    const message = text(body.message).trim();
    const early = (code: string) => refuse(REFUSALS[code]![0], code, REFUSALS[code]![1], cors);
    if (!email) return early('email-required');
    if (!isSupportEmail(email)) return early('email-invalid');
    if (!isSupportTopic(body.topic)) return early('topic');
    if (message.length < SUPPORT_LIMITS.messageMin || message.length > SUPPORT_LIMITS.messageMax) return early('message-length');
    // Context and page only help Alex read the message; a bad one is dropped.
    const context = (SUPPORT_REASONS as readonly string[]).includes(text(body.context)) ? text(body.context) : null;
    const page = text(body.page).startsWith('/') ? text(body.page).slice(0, SUPPORT_LIMITS.pageMax) : null;
    const locale = body.locale === 'ru' ? 'ru' : 'en';

    // Where it came from: Cloudflare's own header, and only that.
    const address = (request.headers.get(SOURCE_HEADER) ?? '').trim();
    const key = sourceKey(address);
    if (!key) {
      return refuse(400, 'no-source', 'This request did not arrive through the site’s network, so it cannot be accepted.', cors);
    }

    let challenged = false;
    if (env.TURNSTILE_SECRET_KEY) {
      const token = text(body.challengeToken);
      if (!token || token.length > MAX_TOKEN) {
        return refuse(403, 'challenge-required', 'Complete the security check and send the message again.', cors);
      }
      const result = await verifyChallenge(deps, env, token, address);
      if (result === 'unavailable') {
        return refuse(503, 'challenge-unavailable', 'The security check could not be verified just now. Nothing was sent. Try again shortly.', cors);
      }
      if (result === 'failed') {
        return refuse(403, 'challenge-failed', 'The security check did not pass. Complete it again and send the message once more.', cors);
      }
      challenged = true;
    }

    const rpc = serviceRpc(deps.fetch, env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string);
    const stored = await rpc('support_request_visitor', {
      p_source_hash: await sourceHash(env.SUPPORT_SOURCE_SALT as string, key),
      p_email: email,
      p_topic: body.topic,
      p_message: message,
      p_context: context,
      p_page: page,
      p_locale: locale,
      p_challenged: challenged,
    });
    if (stored.ok === true && typeof stored.id === 'string') return json({ ok: true, id: stored.id }, 200, cors);
    const reason = String(stored.reason ?? '');
    const known = REFUSALS[reason];
    if (known) return refuse(known[0], reason, known[1], cors);
    throw new TrialServiceError(`support: unexpected answer ${reason}`);
  }

  async function handle(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);

    if (request.method === 'GET' && parts.length === 0) {
      return json({ configured: configured(env), challenge: Boolean(env.TURNSTILE_SECRET_KEY) }, 200, cors);
    }
    if (request.method === 'POST' && parts.length === 1 && parts[0] === 'request') {
      // The form lives on the site, so a request always names the site as
      // its origin. This keeps other sites' pages from posting here; the
      // sender limits and the bot check are what stop a script.
      if (!origin || !allowedOrigins(env).includes(origin)) return refuse(403, 'bad-origin', 'Origin not allowed.', cors);
      if (!configured(env)) return refuse(503, 'not-configured', 'Messages from signed-out visitors are not switched on.', cors);
      try {
        return await submit(request, env, cors);
      } catch (err) {
        if (!(err instanceof TrialServiceError)) console.error('support: unexpected failure', err instanceof Error ? err.name : 'unknown');
        // Fail closed: nothing was stored.
        return refuse(503, 'unavailable', 'Your message could not be sent just now. Nothing was stored. Try again shortly.', cors);
      }
    }
    return refuse(404, 'not-found', 'Not found.', cors);
  }

  return { fetch: handle };
}

/** Erases the source hash from requests older than the database's
    sourceKeepHours. Run hourly by the Worker's schedule, so a hash does not
    outlive its purpose even when nobody is writing. Returns how many rows
    were cleared, or null when the Worker is not configured. */
export async function cleanup(deps: Deps, env: Env): Promise<number | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const rpc = serviceRpc(deps.fetch, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const result = await rpc('support_source_cleanup', {});
  return typeof result.cleared === 'number' ? result.cleared : 0;
}

const defaultDeps: Deps = { fetch: (input, init) => fetch(input, init) };

export default {
  fetch: (request: Request, env: Env) => createHandler(defaultDeps).fetch(request, env),
  scheduled: async (_controller: unknown, env: Env) => {
    try {
      await cleanup(defaultDeps, env);
    } catch {
      console.error('support: the hourly cleanup could not reach the database');
    }
  },
};
