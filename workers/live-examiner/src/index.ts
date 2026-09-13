/* Cloudflare Worker: session broker for the live AI examiner.

   Two providers, one Worker:

   - "openai" (default): GPT-Live-1 over WebRTC. The browser records an SDP
     offer locally and posts it here with a validated exam plan; this Worker
     builds the examiner's script from the plan (the browser only ever sends
     prompt-bank ids, never free-form prose), attaches it as `instructions`,
     and calls OpenAI's session broker on the browser's behalf. OpenAI hands
     back an SDP answer, which the browser uses to open its own WebRTC
     connection directly to OpenAI, audio never passes through this Worker.
   - "gemini" (rollback): the original path. The browser talks to the Gemini
     Live API directly over WebSocket; this Worker only mints Google
     "ephemeral tokens" (single-use, ~30-minute credentials that only work
     against the Live API, v1alpha). Kept working so `LIVE_PROVIDER=gemini`
     is a one-variable rollback if the OpenAI path misbehaves.

   In both cases the real provider API key stays server-side. The browser
   never holds it, and the Worker never proxies audio, it only brokers the
   handshake (a token, or an SDP answer).

   SECURITY MODEL (openai provider only; the gemini rollback is unchanged
   and unauthenticated, matching its lower stakes as a free-tier fallback):

   - Origin is a bar-raiser, not authentication — it is trivially forgeable
     by anything that is not a real browser. Creating a paid voice session
     additionally requires a signed-in student: `POST /`, `/direct` and
     `/end` all verify the caller's Supabase access token server-side
     (`GET {SUPABASE_URL}/auth/v1/user` with the service role key) before
     doing anything billable. `ALLOWED_ORIGINS` stays production-only;
     `LOCAL_ORIGINS` is honoured only when this Worker itself is being
     served from localhost/127.0.0.1 (i.e. under `wrangler dev`), so a
     deployed Worker can never be tricked into trusting a "local" Origin
     header from the public internet.
   - Creation and concurrency limits are enforced server-side against a
     shared table (`live_examiner_sessions` in Supabase), not in Worker
     memory, so they hold across every Worker instance/region, not just the
     one that happens to handle a given request. If the security
     configuration (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`) is
     missing, or a limits/reservation query fails, the Worker fails CLOSED
     (503) rather than silently allowing the session — never falls open.
     The limits are still best-effort at the margin: two concurrent
     requests can both pass the same read-then-check before either commits,
     which is exactly why a reservation row is written *before* calling
     OpenAI (see below) — it narrows the race window to the two Supabase
     round trips, not the whole OpenAI handshake.
   - Reservation-then-create: before ever calling OpenAI, the Worker inserts
     a `created` row for the session. If OpenAI then rejects or fails, that
     row is immediately closed (`ended_at` set) so it does not count against
     future limits. Only on a genuine 201 is the row updated with the real
     `provider_session_id`. This means the row exists (and counts toward the
     concurrency/day limits) for the whole time a session could plausibly be
     running, not only once OpenAI confirms it.
   - Privileged mid-session stage directions ("director cues": move from
     Part 1 to Part 2, start the cue-card clock, end the test, ...) do NOT
     travel over the browser's WebRTC data channel any more. The data
     channel's `allowed_client_events` is now restricted to
     `session.input_audio.mute` / `unmute` / `session.close` only — the
     browser cannot send `session.instructions.append` or any other
     scripting event. Instead, the browser calls this Worker's `POST
     /direct` with a plain cue name; the Worker validates that the
     requested transition is legal from the session's current recorded
     stage (`nextStage` in `src/lib/speaking/live/cues.ts`), and only then
     delivers it to the *running* OpenAI session over a trusted server-to-
     server path (the "sideband" WebSocket, `wss://.../attach`, opened with
     the real API key — never reachable from the browser). This is what
     stops a modified client from, say, skipping straight to "test over" or
     replaying a cue to manipulate the transcript.
   - Billing: OpenAI's voice pricing is $0.05 per minute, billed per second.
     Creating a WebRTC session bills a flat 15 seconds *up front*, which is
     CREDITED against the running session's actual duration, not billed in
     addition to it — a session that runs 40 seconds is billed for 40
     seconds total, not 55. The 15-second charge only matters as a floor:
     opening a session and closing it immediately still costs 15 seconds of
     voice time. Backend (Responses API) usage, when `OPENAI_BACKEND_MODEL`
     is set, is billed separately at that model's own rate; the default
     (empty string) uses client-only delegation, so there is no backend and
     no extra cost.

   OpenAI contract verified 2026-09-13 against the official docs and SDK
   source: POST https://api.openai.com/v1/live/sessions with a bearer
   Authorization header and a JSON body { session, transport }, no beta
   header needed. Success is HTTP 201 with { session: { id }, transport:
   { type: 'webrtc', sdp } }. The sideband path attaches to a running
   session over a WebSocket at
   https://api.openai.com/v1/live/sessions/{id}/attach (opened as an
   outbound `fetch` with an `Upgrade: websocket` header from within the
   Worker; `resp.webSocket` / `.accept()` are Cloudflare-specific and are
   therefore accessed through a loosely-typed, injectable `Deps.sideband`
   so this file stays testable under plain Node).

   Gemini contract verified 2026-07-10: POST /v1alpha/auth_tokens with
   { uses, expireTime, newSessionExpireTime } and the x-goog-api-key header
   returns { name: "auth_tokens/..." }. The client passes that token as
   ?access_token= on the BidiGenerateContent WebSocket URL. */

import {
  resolvePlanRequest,
  buildInstruction,
  buildBackendInstruction,
  PlanRequestError,
} from '../../../src/lib/speaking/live/instructions';
import type { LiveMode, ResolvedPlan } from '../../../src/lib/speaking/live/instructions';
import { parseDirectorCue, nextStage, cueEvent, CueError } from '../../../src/lib/speaking/live/cues';
import type { SessionStage } from '../../../src/lib/speaking/live/cues';

export interface Env {
  GEMINI_API_KEY?: string; // wrangler secret (gemini provider)
  OPENAI_API_KEY?: string; // wrangler secret (openai provider)
  SUPABASE_URL?: string; // vars: required for the openai provider; fail closed (503) if missing
  SUPABASE_SERVICE_ROLE_KEY?: string; // wrangler secret: required for the openai provider; fail closed (503) if missing
  LIVE_PROVIDER?: string; // vars: 'openai' (default) | 'gemini'
  LIVE_MODEL: string; // vars: Gemini live model
  OPENAI_LIVE_MODEL?: string; // vars: default 'gpt-live-1'
  OPENAI_LIVE_VOICE?: string; // vars: default 'marin'
  OPENAI_BACKEND_MODEL?: string; // vars: default '' = client delegation, no backend cost
  ALLOWED_ORIGINS: string; // vars, comma-separated: production origins only
  LOCAL_ORIGINS?: string; // vars, comma-separated: honoured ONLY when this Worker itself is served from localhost/127.0.0.1 (wrangler dev)
  LIVE_MAX_CONCURRENT_PER_USER?: string; // vars: default '1'
  LIVE_MAX_PER_USER_PER_DAY?: string; // vars: default '4'
  LIVE_MAX_SITE_PER_DAY?: string; // vars: default '60'
  LIVE_SESSION_TTL_MIN?: string; // vars: default '20' — a session with no end report still counts as active this long
}

/** Everything about the outside world this Worker depends on, injected so
    tests can run the real request-handling logic under plain Node with
    stubbed network calls, no Cloudflare runtime required. */
export interface Deps {
  fetch: typeof fetch;
  /** Delivers a trusted server-side event to a *running* OpenAI session over
      the sideband WebSocket (`/live/sessions/{id}/attach`). Never reachable
      from the browser — the browser only ever calls this Worker's
      `POST /direct`, which validates the requested transition and then
      calls this. */
  sideband(env: Env, sessionId: string, event: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
  now(): Date;
}

const TOKEN_TTL_MIN = 30; // whole-test window (a full mock is ~12-14 min)
const NEW_SESSION_TTL_MIN = 2; // how long the client has to actually connect

const MAX_BODY_BYTES = 64 * 1024;
const MAX_DIRECT_BODY_BYTES = 8 * 1024;
const MAX_SDP_LENGTH = 60_000;

const DEFAULT_TTL_MIN = 20;
const DEFAULT_MAX_CONCURRENT_PER_USER = 1;
const DEFAULT_MAX_PER_USER_PER_DAY = 4;
const DEFAULT_MAX_SITE_PER_DAY = 60;

const SESSIONS_TABLE = 'live_examiner_sessions';

// Only mute/unmute/close: the browser's data channel can no longer send
// `session.instructions.append` or any other scripting event. Privileged
// stage directions travel over the server-side sideband instead (see the
// header comment and `POST /direct`).
const OPENAI_ALLOWED_CLIENT_EVENTS = ['session.input_audio.mute', 'session.input_audio.unmute', 'session.close'] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Origins allowed for this specific request. The production list is always
    honoured; the local-dev list is honoured only when the Worker itself is
    being reached at a loopback host (i.e. `wrangler dev`), so a deployed
    Worker can never be fooled into trusting a "local" Origin header sent by
    the public internet. */
function allowedOrigins(request: Request, env: Env): string[] {
  const prod = env.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const hostname = new URL(request.url).hostname;
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && env.LOCAL_ORIGINS) {
    const local = env.LOCAL_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    return [...prod, ...local];
  }
  return prod;
}

function corsHeaders(request: Request, origin: string | null, env: Env): Record<string, string> {
  const allowed = allowedOrigins(request, env);
  const allow = origin && allowed.includes(origin) ? origin : allowed[0] ?? '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

/** Normalises LIVE_PROVIDER. Unset or 'openai' -> 'openai', 'gemini' ->
    'gemini', anything else is a misconfiguration (null). */
export function resolveProvider(env: Env): 'openai' | 'gemini' | null {
  const raw = env.LIVE_PROVIDER;
  if (raw === undefined || raw === '' || raw === 'openai') return 'openai';
  if (raw === 'gemini') return 'gemini';
  return null;
}

function openAiModel(env: Env): string {
  return env.OPENAI_LIVE_MODEL || 'gpt-live-1';
}

/** Builds the MediaSessionConfig sent to OpenAI's session broker. Exported
    for tests, it never touches the network itself. */
export function buildOpenAiSessionConfig(env: Env, instructions: string): Record<string, unknown> {
  const backendModel = env.OPENAI_BACKEND_MODEL;
  return {
    model: openAiModel(env),
    instructions,
    audio: { output: { voice: env.OPENAI_LIVE_VOICE || 'marin' } },
    store: false,
    delegation: backendModel
      ? { type: 'responses', responses: { model: backendModel, instructions: buildBackendInstruction() } }
      : { type: 'client' },
    client: {
      data_channel: {
        allowed_client_events: [...OPENAI_ALLOWED_CLIENT_EVENTS],
      },
    },
  };
}

function missingConfig(env: Env): string[] {
  const missing: string[] = [];
  if (!env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  return missing;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

type BodyResult = { ok: true; value: unknown } | { ok: false; error: string };

async function readJsonBody(request: Request, maxBytes: number): Promise<BodyResult> {
  const lengthHeader = request.headers.get('Content-Length');
  if (lengthHeader && Number(lengthHeader) > maxBytes) return { ok: false, error: 'Request body is too large' };
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return { ok: false, error: 'Could not read request body' };
  }
  if (bodyText.length > maxBytes) return { ok: false, error: 'Request body is too large' };
  try {
    return { ok: true, value: bodyText ? JSON.parse(bodyText) : {} };
  } catch {
    return { ok: false, error: 'Request body must be valid JSON' };
  }
}

/** Verifies a Supabase user access token server-side. Never throws: any
    network problem, non-200 response, or malformed/non-uuid id is treated
    as "not signed in" (the caller maps that to 401). This is deliberately
    stricter than the limits queries below, which fail CLOSED with a 503 —
    an auth check that fails open would be a much worse bug than a false
    "please sign in". */
async function verifySupabaseUser(deps: Deps, env: Env, token: string): Promise<string | null> {
  let resp: Response;
  try {
    resp = await deps.fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY as string,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return null;
  }
  if (resp.status !== 200) return null;
  let body: unknown;
  try {
    body = await resp.json();
  } catch {
    return null;
  }
  const id = isRecord(body) ? body.id : undefined;
  if (typeof id !== 'string' || !UUID_RE.test(id)) return null;
  return id;
}

/** Any failure talking to Supabase's data API (network, non-2xx, malformed
    body). Callers map this to a 503 "temporarily unavailable" — never fall
    open on a limits check or a bookkeeping write. */
class SupabaseError extends Error {}

async function fetchRows(deps: Deps, env: Env, query: string): Promise<unknown[]> {
  let resp: Response;
  try {
    resp = await deps.fetch(`${env.SUPABASE_URL}/rest/v1/${SESSIONS_TABLE}?${query}`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY as string,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new SupabaseError('request failed');
  }
  if (!resp.ok) throw new SupabaseError(`query failed (${resp.status})`);
  let body: unknown;
  try {
    body = await resp.json();
  } catch {
    throw new SupabaseError('malformed response');
  }
  if (!Array.isArray(body)) throw new SupabaseError('malformed response shape');
  return body;
}

async function reserveSession(deps: Deps, env: Env, userId: string, mode: LiveMode): Promise<string> {
  let resp: Response;
  try {
    resp = await deps.fetch(`${env.SUPABASE_URL}/rest/v1/${SESSIONS_TABLE}`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY as string,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ user_id: userId, provider: 'openai', mode, stage: 'created' }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new SupabaseError('insert failed');
  }
  if (!resp.ok) throw new SupabaseError(`insert failed (${resp.status})`);
  let body: unknown;
  try {
    body = await resp.json();
  } catch {
    throw new SupabaseError('malformed insert response');
  }
  const row = Array.isArray(body) ? body[0] : undefined;
  const id = isRecord(row) ? row.id : undefined;
  if (typeof id !== 'string') throw new SupabaseError('malformed insert response');
  return id;
}

async function patchSession(deps: Deps, env: Env, id: string, patch: Record<string, unknown>): Promise<void> {
  let resp: Response;
  try {
    resp = await deps.fetch(`${env.SUPABASE_URL}/rest/v1/${SESSIONS_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY as string,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(patch),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new SupabaseError('patch failed');
  }
  if (!resp.ok) throw new SupabaseError(`patch failed (${resp.status})`);
}

interface SessionRow {
  id: string;
  user_id: string;
  stage: string;
  ended_at: string | null;
  mode: string;
}

async function findSessionByProviderId(deps: Deps, env: Env, providerSessionId: string): Promise<SessionRow | null> {
  const rows = await fetchRows(
    deps,
    env,
    `provider_session_id=eq.${encodeURIComponent(providerSessionId)}&select=id,user_id,stage,ended_at,mode`,
  );
  const row = rows[0];
  if (!isRecord(row)) return null;
  const { id, user_id, stage, ended_at, mode } = row;
  if (typeof id !== 'string' || typeof user_id !== 'string' || typeof stage !== 'string' || typeof mode !== 'string') {
    throw new SupabaseError('malformed session row');
  }
  return { id, user_id, stage, ended_at: typeof ended_at === 'string' ? ended_at : null, mode };
}

/** Closes a reservation row that will never become a real session (OpenAI
    rejected or failed after we already wrote the row). Best-effort: if this
    write itself fails there is nothing better to do than log it, the
    session creation has already failed for an unrelated reason. */
async function failReservation(deps: Deps, env: Env, id: string): Promise<void> {
  try {
    await patchSession(deps, env, id, { ended_at: deps.now().toISOString() });
  } catch {
    console.error('live-examiner: failed to close reservation', id);
  }
}

async function handleGet(env: Env, cors: Record<string, string>): Promise<Response> {
  const provider = resolveProvider(env);
  if (!provider) return json({ error: 'LIVE_PROVIDER must be openai or gemini' }, 500, cors);
  const model = provider === 'gemini' ? env.LIVE_MODEL : openAiModel(env);
  return json(
    { provider, model, backendModel: env.OPENAI_BACKEND_MODEL || null, requiresSignIn: provider === 'openai' },
    200,
    cors,
  );
}

async function mintGeminiToken(deps: Deps, env: Env, cors: Record<string, string>): Promise<Response> {
  if (!env.GEMINI_API_KEY) return json({ error: 'GEMINI_API_KEY is not configured' }, 503, cors);

  const now = deps.now().getTime();
  const expireTime = new Date(now + TOKEN_TTL_MIN * 60_000).toISOString();
  const newSessionExpireTime = new Date(now + NEW_SESSION_TTL_MIN * 60_000).toISOString();

  let resp: Response;
  try {
    resp = await deps.fetch('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', {
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

  return json({ provider: 'gemini', token: name, model: env.LIVE_MODEL, expireTime }, 200, cors);
}

async function handleOpenAiCreate(deps: Deps, request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const missing = missingConfig(env);
  if (missing.length) {
    console.error(`live-examiner: missing required config: ${missing.join(', ')}`);
    return json({ error: 'The live examiner service is not fully configured.' }, 503, cors);
  }

  const token = bearerToken(request);
  if (!token) return json({ error: 'Sign in to use the live examiner.' }, 401, cors);
  const userId = await verifySupabaseUser(deps, env, token);
  if (!userId) return json({ error: 'Sign in to use the live examiner.' }, 401, cors);

  const parsed = await readJsonBody(request, MAX_BODY_BYTES);
  if (!parsed.ok) return json({ error: parsed.error }, 400, cors);
  if (!isRecord(parsed.value)) return json({ error: 'Request body must be a JSON object' }, 400, cors);

  const sdp = parsed.value.sdp;
  if (typeof sdp !== 'string' || sdp.length === 0 || sdp.length > MAX_SDP_LENGTH || !sdp.startsWith('v=0')) {
    return json({ error: 'sdp must be a non-empty SDP offer string' }, 400, cors);
  }

  let plan: ResolvedPlan;
  try {
    plan = resolvePlanRequest(parsed.value.plan);
  } catch (err) {
    if (err instanceof PlanRequestError) return json({ error: err.message }, 400, cors);
    return json({ error: 'plan is invalid' }, 400, cors);
  }

  const ttlMin = Number(env.LIVE_SESSION_TTL_MIN) || DEFAULT_TTL_MIN;
  const maxConcurrent = Number(env.LIVE_MAX_CONCURRENT_PER_USER) || DEFAULT_MAX_CONCURRENT_PER_USER;
  const maxPerUserPerDay = Number(env.LIVE_MAX_PER_USER_PER_DAY) || DEFAULT_MAX_PER_USER_PER_DAY;
  const maxSitePerDay = Number(env.LIVE_MAX_SITE_PER_DAY) || DEFAULT_MAX_SITE_PER_DAY;

  const now = deps.now();
  const ttlCutoff = new Date(now.getTime() - ttlMin * 60_000).toISOString();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  try {
    const active = await fetchRows(
      deps,
      env,
      `user_id=eq.${userId}&ended_at=is.null&created_at=gte.${encodeURIComponent(ttlCutoff)}&select=id`,
    );
    if (active.length >= maxConcurrent) {
      return json(
        { error: 'You already have a live session running. Finish it (or wait a few minutes) before starting another.' },
        429,
        cors,
      );
    }

    const userToday = await fetchRows(deps, env, `user_id=eq.${userId}&created_at=gte.${encodeURIComponent(dayStart)}&select=id`);
    if (userToday.length >= maxPerUserPerDay) {
      return json(
        { error: `You have used today's live sessions (${maxPerUserPerDay} per day). Please come back tomorrow.` },
        429,
        cors,
      );
    }

    const siteToday = await fetchRows(deps, env, `created_at=gte.${encodeURIComponent(dayStart)}&select=id`);
    if (siteToday.length >= maxSitePerDay) {
      return json({ error: 'The live examiner is fully booked for today. Please try again tomorrow.' }, 429, cors);
    }
  } catch {
    return json({ error: 'The live examiner service is temporarily unavailable.' }, 503, cors);
  }

  let reservationId: string;
  try {
    reservationId = await reserveSession(deps, env, userId, plan.mode);
  } catch {
    return json({ error: 'The live examiner service is temporarily unavailable.' }, 503, cors);
  }

  const instructions = buildInstruction(plan, 'openai');
  const session = buildOpenAiSessionConfig(env, instructions);

  let upstream: Response;
  try {
    upstream = await deps.fetch('https://api.openai.com/v1/live/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ session, transport: { type: 'webrtc', sdp } }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    await failReservation(deps, env, reservationId);
    return json({ error: 'Could not reach the OpenAI live session service' }, 502, cors);
  }

  if (upstream.status === 401 || upstream.status === 403) {
    await failReservation(deps, env, reservationId);
    return json({ error: 'The OpenAI key was rejected or has no GPT-Live access' }, 502, cors);
  }
  if (upstream.status === 429) {
    await failReservation(deps, env, reservationId);
    return json({ error: 'The live examiner is busy right now. Please try again in a minute.' }, 429, cors);
  }
  if (!upstream.ok) {
    await failReservation(deps, env, reservationId);
    let detail = '';
    try {
      const err = (await upstream.json()) as { error?: { message?: string } };
      detail = err.error?.message ? `: ${err.error.message.slice(0, 300)}` : '';
    } catch {
      /* non-JSON upstream error */
    }
    return json({ error: `Upstream error (${upstream.status})${detail}` }, 502, cors);
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    await failReservation(deps, env, reservationId);
    return json({ error: 'Malformed session response' }, 502, cors);
  }

  const sessionId = isRecord(payload) && isRecord(payload.session) ? payload.session.id : undefined;
  const answerSdp = isRecord(payload) && isRecord(payload.transport) ? payload.transport.sdp : undefined;
  if (typeof sessionId !== 'string' || typeof answerSdp !== 'string') {
    await failReservation(deps, env, reservationId);
    return json({ error: 'Malformed session response' }, 502, cors);
  }

  try {
    await patchSession(deps, env, reservationId, { provider_session_id: sessionId });
  } catch {
    // Best-effort: the session is genuinely live at OpenAI even if our own
    // bookkeeping patch failed. Don't fail the student's session over an
    // accounting write; log it so the day's counts can be reconciled.
    console.error('live-examiner: failed to record provider_session_id for reservation', reservationId);
  }

  return json(
    { provider: 'openai', session: { id: sessionId }, transport: { type: 'webrtc', sdp: answerSdp }, model: session.model },
    201,
    cors,
  );
}

async function handleCreate(deps: Deps, request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const provider = resolveProvider(env);
  if (!provider) return json({ error: 'LIVE_PROVIDER must be openai or gemini' }, 500, cors);
  if (provider === 'gemini') return mintGeminiToken(deps, env, cors);
  return handleOpenAiCreate(deps, request, env, cors);
}

async function handleDirect(deps: Deps, request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const provider = resolveProvider(env);
  if (provider !== 'openai') return json({ error: 'Not found' }, 404, cors);

  const missing = missingConfig(env);
  if (missing.length) {
    console.error(`live-examiner: missing required config: ${missing.join(', ')}`);
    return json({ error: 'The live examiner service is not fully configured.' }, 503, cors);
  }

  const token = bearerToken(request);
  if (!token) return json({ error: 'Sign in to use the live examiner.' }, 401, cors);
  const userId = await verifySupabaseUser(deps, env, token);
  if (!userId) return json({ error: 'Sign in to use the live examiner.' }, 401, cors);

  const parsed = await readJsonBody(request, MAX_DIRECT_BODY_BYTES);
  if (!parsed.ok) return json({ error: parsed.error }, 400, cors);
  if (!isRecord(parsed.value)) return json({ error: 'Request body must be a JSON object' }, 400, cors);

  const sessionId = parsed.value.sessionId;
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 128) {
    return json({ error: 'sessionId must be a non-empty string' }, 400, cors);
  }

  let cue: ReturnType<typeof parseDirectorCue>;
  try {
    cue = parseDirectorCue(parsed.value.cue);
  } catch (err) {
    if (err instanceof CueError) return json({ error: err.message }, 400, cors);
    return json({ error: 'cue is invalid' }, 400, cors);
  }

  let row: SessionRow | null;
  try {
    row = await findSessionByProviderId(deps, env, sessionId);
  } catch {
    return json({ error: 'The live examiner service is temporarily unavailable.' }, 503, cors);
  }
  if (!row) return json({ error: 'Unknown session.' }, 404, cors);
  if (row.user_id !== userId) return json({ error: 'Not your session.' }, 403, cors);
  if (row.ended_at || row.stage === 'ended') return json({ error: 'This session has ended.' }, 409, cors);

  const next = nextStage(row.mode as LiveMode, row.stage as SessionStage, cue);
  if (next === null) return json({ error: 'That stage direction is not allowed now.' }, 409, cors);

  const event = cueEvent(row.mode as LiveMode, cue, `cue_${crypto.randomUUID()}`);
  const result = await deps.sideband(env, sessionId, event);
  if (!result.ok) return json({ error: 'Could not deliver the stage direction.' }, 502, cors);

  try {
    await patchSession(deps, env, row.id, { stage: next, last_cue_at: deps.now().toISOString() });
  } catch {
    // The cue was delivered to a live session; a failure to record the
    // transition is a bookkeeping problem, not a reason to tell the
    // student the direction failed.
    console.error('live-examiner: failed to record stage transition for', row.id);
  }

  return json({ ok: true, stage: next }, 200, cors);
}

async function handleEnd(deps: Deps, request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const provider = resolveProvider(env);
  if (provider !== 'openai') return json({ error: 'Not found' }, 404, cors);

  const missing = missingConfig(env);
  if (missing.length) {
    console.error(`live-examiner: missing required config: ${missing.join(', ')}`);
    return json({ error: 'The live examiner service is not fully configured.' }, 503, cors);
  }

  const token = bearerToken(request);
  if (!token) return json({ error: 'Sign in to use the live examiner.' }, 401, cors);
  const userId = await verifySupabaseUser(deps, env, token);
  if (!userId) return json({ error: 'Sign in to use the live examiner.' }, 401, cors);

  const parsed = await readJsonBody(request, MAX_DIRECT_BODY_BYTES);
  if (!parsed.ok) return json({ error: parsed.error }, 400, cors);
  if (!isRecord(parsed.value)) return json({ error: 'Request body must be a JSON object' }, 400, cors);

  const sessionId = parsed.value.sessionId;
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 128) {
    return json({ error: 'sessionId must be a non-empty string' }, 400, cors);
  }

  let row: SessionRow | null;
  try {
    row = await findSessionByProviderId(deps, env, sessionId);
  } catch {
    return json({ error: 'The live examiner service is temporarily unavailable.' }, 503, cors);
  }
  if (!row) return json({ error: 'Unknown session.' }, 404, cors);
  if (row.user_id !== userId) return json({ error: 'Not your session.' }, 403, cors);

  try {
    await patchSession(deps, env, row.id, { ended_at: deps.now().toISOString(), stage: 'ended' });
  } catch {
    return json({ error: 'The live examiner service is temporarily unavailable.' }, 503, cors);
  }

  return json({ ok: true }, 200, cors);
}

/** Real sideband delivery: attaches to a running OpenAI session over the
    trusted server-to-server WebSocket and appends one director event,
    waiting for OpenAI's ack (`*.appended` echoing our `event_id` as
    `client_event_id`) or a matching `error` event. `resp.webSocket` and
    `.accept()` are Cloudflare-specific, so they're only touched here,
    behind the loosely-typed `WorkerWebSocket` shape, and only this function
    (not the rest of the file) needs a real Workers runtime to execute. */
interface WorkerWebSocket {
  accept(): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  addEventListener(type: 'close' | 'error', listener: (event: unknown) => void): void;
}

async function defaultSideband(env: Env, sessionId: string, event: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    let resp: Response;
    try {
      resp = await fetch(`https://api.openai.com/v1/live/sessions/${encodeURIComponent(sessionId)}/attach`, {
        headers: {
          Upgrade: 'websocket',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
      });
    } catch {
      return { ok: false, error: 'attach request failed' };
    }

    const maybeWs = (resp as unknown as { webSocket?: WorkerWebSocket }).webSocket;
    if (!maybeWs) return { ok: false, error: `attach failed (${resp.status})` };
    // Rebind to a variable TS can prove is defined inside every closure below
    // (control-flow narrowing on `maybeWs` doesn't reliably persist into a
    // nested function declaration).
    const ws: WorkerWebSocket = maybeWs;

    return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), 8000);

      function finish(result: { ok: boolean; error?: string }): void {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          ws.close();
        } catch {
          /* already closing */
        }
        resolve(result);
      }

      try {
        ws.accept();
        ws.addEventListener('message', (msg) => {
          try {
            const raw = typeof msg.data === 'string' ? msg.data : '';
            const data: unknown = raw ? JSON.parse(raw) : null;
            if (!isRecord(data)) return;
            const type = data.type;
            if (typeof type === 'string' && type.endsWith('.appended') && data.client_event_id === event.event_id) {
              finish({ ok: true });
              return;
            }
            if (type === 'error') {
              const clientEventId = data.client_event_id;
              if (clientEventId === undefined || clientEventId === event.event_id) {
                const err = isRecord(data.error) ? data.error : undefined;
                finish({ ok: false, error: typeof err?.message === 'string' ? err.message : 'rejected' });
              }
            }
          } catch {
            /* ignore malformed sideband message */
          }
        });
        ws.addEventListener('error', () => finish({ ok: false, error: 'socket error' }));
        ws.addEventListener('close', () => finish({ ok: false, error: 'socket closed' }));
        ws.send(JSON.stringify(event));
      } catch {
        finish({ ok: false, error: 'sideband failed' });
      }
    });
  } catch {
    return { ok: false, error: 'sideband failed' };
  }
}

export const defaultDeps: Deps = {
  fetch,
  sideband: defaultSideband,
  now: () => new Date(),
};

/** Builds the request handler around an injected `Deps`. Production uses
    `defaultDeps` (real fetch, real Cloudflare WebSocket sideband, real
    clock); tests inject stubs so the whole routing/validation/limits logic
    runs under plain Node with no network and no Cloudflare runtime. */
export function createHandler(deps: Deps): { fetch(request: Request, env: Env): Promise<Response> } {
  async function handle(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, request.headers.get('Origin'), env) });
    }

    const origin = request.headers.get('Origin');
    const cors = corsHeaders(request, origin, env);

    // A session (token or WebRTC handshake) grants a whole live interview,
    // not one cheap call, so require a recognizable browser Origin outright
    // for every route, including GET. Origin is forgeable outside a real
    // browser; it is a bar-raiser, never the actual authentication (that is
    // the Supabase check inside the openai handlers below).
    const allowed = allowedOrigins(request, env);
    if (!origin || !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403, cors);

    if (request.method !== 'GET' && request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'GET') {
      if (path !== '/') return json({ error: 'Not found' }, 404, cors);
      return handleGet(env, cors);
    }

    switch (path) {
      case '/':
        return handleCreate(deps, request, env, cors);
      case '/direct':
        return handleDirect(deps, request, env, cors);
      case '/end':
        return handleEnd(deps, request, env, cors);
      default:
        return json({ error: 'Not found' }, 404, cors);
    }
  }

  return { fetch: handle };
}

export default { fetch: (request: Request, env: Env) => createHandler(defaultDeps).fetch(request, env) };
