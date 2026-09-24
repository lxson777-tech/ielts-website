/* Cloudflare Worker: the content gate, the trial's locked door.

   Alex, 23 September 2026: protect the content itself, not only the screen.
   In a trial build (PUBLIC_ACCESS_MODE=trial) the public site carries no
   lesson body and no practice paper at all: the pages are shells, and they
   ask this Worker for their content with the student's sign-in. The content
   lives in a PRIVATE store (an R2 bucket bound as CONTENT, filled by
   tools/build-gated-content.mjs), which the public cannot list or read.

   Every request is answered by one question to the database
   (`trial_can_open` in supabase/migrations/2026-09-23-trial.sql): may this
   signed-in student open this item right now? The browser names only WHAT
   it wants; WHO is asking comes from the verified sign-in, never from the
   request. Anything the database cannot answer is refused (fails closed).

     GET /lesson/<key>?locale=en|ru      a lesson body (HTML)
     GET /test/<id>                      a practice paper or drill (JSON)
     GET /explanations/<locale>/<id>     a paper's translated explanations
     GET /practice/<set id>              a lesson's practice quiz (JSON),
                                         opened with its lesson
     GET /prompt/<prompt id>             a Writing question (JSON); the
                                         trial's own essay question opens
                                         with its Writing test
     GET /model/<prompt id>              a Band 8 model answer with its
                                         question (JSON); the trial's one
                                         example opens with its lesson
     GET /data/tests/<id>.json           Mr EZ's compact paper   } service
     GET /data/lesson-blocks/<key>.json  Mr EZ's lesson blocks   } key only

   The last two are for the Mr EZ Worker, which in a trial build can no longer
   fetch them from the public site. It sends CONTENT_SERVICE_KEY, a secret
   shared by the two Workers and never by the browser.

   Local development and the tests run this same handler against a folder
   store (tools/mr-ez-dev-server.mjs --trial, tests/trial-content.test.ts). */

import { bearer, serviceRpc, verifyAccessToken, TrialServiceError } from '../../../src/lib/trial/gate';
import { TRIAL_OFFER, TRIAL_WRITING } from '../../../src/lib/trial/offer';

/** What the handler needs from the private store: R2Bucket.get's shape. */
export interface ContentStore {
  get(key: string): Promise<{ text(): Promise<string> } | null>;
}

export interface Env {
  ALLOWED_ORIGINS: string; // vars, comma-separated
  SUPABASE_URL?: string; // vars
  SUPABASE_SERVICE_ROLE_KEY?: string; // wrangler secret
  /** Shared with the Mr EZ Worker only (wrangler secret on both). */
  CONTENT_SERVICE_KEY?: string;
  /** The private R2 bucket (binding in wrangler.jsonc). */
  CONTENT?: ContentStore;
}

export interface Deps {
  fetch: typeof fetch;
  /** Overrides env.CONTENT; the tests and the local stand-in use a folder. */
  store?: ContentStore;
}

const SAFE = /^[a-z0-9][a-z0-9-]{0,99}$/;
const LOCALES = new Set(['en', 'ru']);

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  return {
    'Access-Control-Allow-Origin': origin && allowed.includes(origin) ? origin : allowed[0] ?? '',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function reply(body: string, status: number, type: string, cors: Record<string, string>): Response {
  return new Response(body, {
    status,
    // Personal to the signed-in student: never cached by a browser or a CDN
    // for anyone else.
    headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store', ...cors },
  });
}

function refuse(status: number, code: string, error: string, cors: Record<string, string>): Response {
  return reply(JSON.stringify({ error, code }), status, 'application/json; charset=utf-8', cors);
}

type Route =
  | { kind: 'student'; item: string; key: string; type: string }
  | { kind: 'service'; key: string }
  | null;

/** Which item a path asks for, and where it is kept. Null for anything else,
    including every malformed or traversal-shaped id. */
export function route(url: URL): Route {
  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const json = 'application/json; charset=utf-8';
  if (parts.length === 2 && parts[0] === 'lesson' && SAFE.test(parts[1])) {
    const locale = url.searchParams.get('locale') ?? 'en';
    if (!LOCALES.has(locale)) return null;
    return { kind: 'student', item: `lesson:${parts[1]}`, key: `lessons/${locale}/${parts[1]}.html`, type: 'text/html; charset=utf-8' };
  }
  if (parts.length === 2 && parts[0] === 'test' && SAFE.test(parts[1])) {
    return { kind: 'student', item: `test:${parts[1]}`, key: `tests/${parts[1]}.json`, type: json };
  }
  if (parts.length === 3 && parts[0] === 'explanations' && LOCALES.has(parts[1]) && SAFE.test(parts[2])) {
    // A lesson quiz's notes open with its lesson; a paper's with the paper.
    const quiz = /^practice-(reading|listening)-(.+)$/.exec(parts[2]);
    const item = quiz ? `lesson:${quiz[1]}-${quiz[2]}` : `test:${parts[2]}`;
    return { kind: 'student', item, key: `explanations/${parts[1]}/${parts[2]}.json`, type: json };
  }
  if (parts.length === 2 && parts[0] === 'practice') {
    // practice-reading-tfng belongs to the lesson reading-tfng.
    const match = /^practice-(reading|listening)-([a-z0-9][a-z0-9-]{0,80})$/.exec(parts[1]);
    if (!match) return null;
    return { kind: 'student', item: `lesson:${match[1]}-${match[2]}`, key: `practice/${parts[1]}.json`, type: json };
  }
  /* Writing material (Alex, 24 September 2026). The trial includes exactly
     two pieces: its essay question, which opens with the Writing test, and
     one Band 8 example, which opens with the Task 2 lesson. Any other
     question or model is its own item, which the trial does not include. */
  if (parts.length === 2 && parts[0] === 'prompt' && SAFE.test(parts[1])) {
    const item = parts[1] === TRIAL_WRITING.essayPromptId ? `test:${TRIAL_OFFER.writing.testId}` : `writing-prompt:${parts[1]}`;
    return { kind: 'student', item, key: `prompts/${parts[1]}.json`, type: json };
  }
  if (parts.length === 2 && parts[0] === 'model' && SAFE.test(parts[1])) {
    const item = parts[1] === TRIAL_WRITING.examplePromptId ? `lesson:${TRIAL_OFFER.writing.lessonKey}` : `writing-model:${parts[1]}`;
    return { kind: 'student', item, key: `models/${parts[1]}.json`, type: json };
  }
  if (parts.length === 3 && parts[0] === 'data' && (parts[1] === 'tests' || parts[1] === 'lesson-blocks')) {
    const id = parts[2].replace(/\.json$/, '');
    if (!SAFE.test(id)) return null;
    return { kind: 'service', key: `data/${parts[1]}/${id}.json` };
  }
  return null;
}

/** Constant-time comparison, so the service key cannot be guessed a byte at
    a time from response timings. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const REFUSALS: Record<string, [number, string]> = {
  'trial-required': [403, 'Start your free trial to open this.'],
  'trial-ended': [403, 'Your trial has ended.'],
  'not-included': [403, 'This is not included in your trial.'],
};

export function createHandler(deps: Deps): { fetch(request: Request, env: Env): Promise<Response> } {
  async function handle(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request.headers.get('Origin'), env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return refuse(405, 'bad-request', 'GET only.', cors);

    const target = route(new URL(request.url));
    if (!target) return refuse(404, 'not-found', 'Not found.', cors);
    const store = deps.store ?? env.CONTENT;
    if (!store || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return refuse(503, 'not-configured', 'The content service is not configured.', cors);
    }

    const token = bearer(request);
    if (target.kind === 'service') {
      if (!env.CONTENT_SERVICE_KEY || !token || !sameSecret(token, env.CONTENT_SERVICE_KEY)) {
        return refuse(401, 'sign-in-required', 'Not allowed.', cors);
      }
      const object = await store.get(target.key);
      return object
        ? reply(await object.text(), 200, 'application/json; charset=utf-8', cors)
        : refuse(404, 'not-found', 'Not found.', cors);
    }

    try {
      const userId = token ? await verifyAccessToken(deps.fetch, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, token) : null;
      if (!userId) return refuse(401, 'sign-in-required', 'Sign in to open this.', cors);
      const rpc = serviceRpc(deps.fetch, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const answer = await rpc('trial_can_open', { p_user: userId, p_item: target.item });
      if (answer.ok !== true) {
        const [status, message] = REFUSALS[String(answer.reason)] ?? REFUSALS['not-included'];
        return refuse(status, String(answer.reason ?? 'not-included'), message, cors);
      }
    } catch (err) {
      if (!(err instanceof TrialServiceError)) console.error('content-gate: unexpected failure');
      return refuse(503, 'unavailable', 'The content could not be checked just now. Try again shortly.', cors);
    }

    const object = await store.get(target.key);
    if (!object) return refuse(404, 'not-found', 'Not found.', cors);
    return reply(await object.text(), 200, target.type, cors);
  }

  return { fetch: handle };
}

export default {
  fetch: (request: Request, env: Env) => createHandler({ fetch: (input, init) => fetch(input, init) }).fetch(request, env),
};
