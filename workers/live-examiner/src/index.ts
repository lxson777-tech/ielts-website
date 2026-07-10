/* Cloudflare Worker: session-token service for the live AI examiner.

   The browser talks to the Gemini Live API DIRECTLY over WebSocket (audio in
   both directions, sub-second latency) — proxying that stream through a
   Worker would add latency and cost for nothing. What the browser must never
   hold is the real API key, so this Worker mints Google "ephemeral tokens":
   single-use, ~30-minute credentials that only work against the Live API
   (v1alpha). The site fetches one token per test session.

   Verified 2026-07-10: POST /v1alpha/auth_tokens with { uses, expireTime,
   newSessionExpireTime } and the x-goog-api-key header returns
   { name: "auth_tokens/..." } — no SDK needed. The token is then passed by
   the client as ?access_token= on the BidiGenerateContent WebSocket URL. */

export interface Env {
  GEMINI_API_KEY: string; // wrangler secret
  LIVE_MODEL: string; // vars
  ALLOWED_ORIGINS: string; // vars, comma-separated
}

const TOKEN_TTL_MIN = 30; // whole-test window (a full mock is ~12-14 min)
const NEW_SESSION_TTL_MIN = 2; // how long the client has to actually connect

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  const allow = origin && allowed.includes(origin) ? origin : allowed[0]!;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, cors);

    // Unlike the grade Workers (one cheap call per request), a token grants a
    // whole live session — so require a recognizable browser Origin outright.
    // (Origin can be forged outside a browser; this is a bar-raiser, not auth.
    // Real per-student auth arrives with the paid tier.)
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    if (!origin || !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403, cors);

    const now = Date.now();
    const expireTime = new Date(now + TOKEN_TTL_MIN * 60_000).toISOString();
    const newSessionExpireTime = new Date(now + NEW_SESSION_TTL_MIN * 60_000).toISOString();

    let resp: Response;
    try {
      resp = await fetch('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ uses: 1, expireTime, newSessionExpireTime }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      return json({ error: 'Token service unreachable' }, 502, cors);
    }

    if (resp.status === 429) return json({ error: 'Daily free limit reached — try again later.' }, 429, cors);
    if (!resp.ok) {
      let detail = '';
      try {
        const err = (await resp.json()) as { error?: { message?: string } };
        detail = err.error?.message?.slice(0, 300) ?? '';
      } catch {
        /* non-JSON upstream error */
      }
      return json({ error: `Upstream error (${resp.status})${detail ? `: ${detail}` : ''}` }, 502, cors);
    }

    let name: string | undefined;
    try {
      name = ((await resp.json()) as { name?: string }).name;
    } catch {
      /* fall through */
    }
    if (!name) return json({ error: 'Empty token response' }, 502, cors);

    return json({ token: name, model: env.LIVE_MODEL, expireTime }, 200, cors);
  },
};
