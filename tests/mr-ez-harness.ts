/* The fake world the Mr EZ Worker is tested against.

   Extracted from tests/mr-ez-worker.test.ts so the task tests in
   tests/mr-ez-tasks.test.ts can run the SAME real handler against the SAME
   stand-in backends rather than a second, subtly different copy. Not a
   `.test.ts` file, so `npm test` does not try to run it on its own.

   It stands in for three things the Worker talks to, and nothing else:

   - Supabase auth. The bearer token decides who the caller is, and that is
     the only thing that does. Every query below is then filtered by whatever
     the handler actually passed, which is what makes the isolation tests
     meaningful rather than decorative: if the handler ever stopped filtering
     by the verified user id, these fakes would happily hand back the other
     student's rows and the test would fail.
   - Supabase REST. Enough PostgREST to be honest about filters, counts and
     upserts.
   - Two HTTP endpoints outside Supabase: the OpenAI Responses API, and the
     site's own published test JSON (SITE_DATA_URL). Every URL the handler
     fetches is recorded, so a test can assert that something was NOT
     fetched, which is usually the more valuable assertion.

   No Cloudflare runtime, no Supabase project, no OpenAI key, no money. */

import type { SiteTest } from '../src/lib/tutor/test-items.ts';
import type { PublishedLessonBlocks } from '../src/lib/learning/lesson-blocks.ts';

export const PROD_ORIGIN = 'https://lxson777-tech.github.io';
export const WORKER_URL = 'https://ielts-mr-ez.example.workers.dev/';
export const SUPABASE_URL = 'https://proj.supabase.co';
/** Where the fake site publishes its test JSON. Deliberately not the real
    production URL, so a test that somehow escaped the stub would fail loudly
    rather than quietly reaching the internet. */
export const SITE_DATA_URL = 'https://site.test/data/tests';
/** And its lesson blocks, for the contextual help task. Same reasoning. */
export const LESSON_BLOCKS_URL = 'https://site.test/data/lesson-blocks';
export const SERVICE_KEY = 'service-role-dummy';
export const OPENAI_KEY = 'sk-test-dummy';

export const GOOD_TOKEN = 'good-jwt';
export const OTHER_TOKEN = 'other-jwt';
export const USER_A = '11111111-1111-4111-8111-111111111111';
export const USER_B = '22222222-2222-4222-8222-222222222222';

export const NOW = new Date('2026-09-19T12:00:00.000Z');

/* Conversation ids are uuids on the wire — the request validator rejects
   anything else before it reaches the database, which is why these fixtures
   are real uuids rather than readable names. */
export const CONV_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
export const CONV_NEW = 'cccccccc-1111-4111-8111-cccccccccccc';

export function baseEnv(overrides: Record<string, unknown> = {}) {
  return {
    ALLOWED_ORIGINS: PROD_ORIGIN,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    SITE_DATA_URL,
    LESSON_BLOCKS_URL,
    OPENAI_API_KEY: OPENAI_KEY,
    ...overrides,
  } as never;
}

/* ── A fake Supabase + OpenAI + published test data ────────────────────── */

export interface NoteRow {
  user_id: string;
  kind: string;
  note_key: string;
  fingerprint: string;
  reply: unknown;
}

export interface FakeState {
  /** user_state rows, by user id. */
  userState: Record<string, { progress: unknown; study_plan: unknown }>;
  /** mr_ez_conversations rows. */
  conversations: { id: string; user_id: string; summary: string | null; summarised_turns: number }[];
  messages: { conversation_id: string; user_id: string; role: string; content: string; created_at: string }[];
  turns: { user_id: string; idempotency_key: string | null; reply: unknown; cost_usd: number; task: string; created_at?: string }[];
  recommendations: { user_id: string; fingerprint: string; reply: unknown }[];
  /** mr_ez_notes rows. Keyed by (user_id, kind, note_key) on write. */
  notes: NoteRow[];
  /** Force a failure in the counting queries, to prove we fail closed. */
  breakCounts?: boolean;
  /** What the model returns, or an HTTP status to fail with. */
  openAi?: { status?: number; body?: unknown; unreachable?: boolean };
  /** What the published test endpoint serves, by test id. An id that is not
      here is a 404. A string is served verbatim, which is how malformed JSON
      is tested. */
  siteTests: Record<string, SiteTest | string>;
  /** The same, for the published lesson blocks the contextual help task
      grounds itself in. */
  lessonBlocks: Record<string, PublishedLessonBlocks | string>;
  /** Force every published-data fetch to this status instead. */
  siteDataStatus?: number;
  siteDataUnreachable?: boolean;
  /* ── The three personal learning tables ──────────────────────────────
     supabase/migrations/2026-09-21-learning.sql is a PROPOSAL and has not
     been applied to the production project, so 'missing' is the default and
     is what production looks like today: PostgREST answers a query for an
     absent relation with a 404 naming it. 'present' serves the rows below.
     Both paths have to work, which is why the fake models both. */
  learningTables?: 'missing' | 'present';
  learningPlans?: { user_id: string; plan: unknown }[];
  learningEvents?: { user_id: string; event_id: string; event: unknown; occurred_at: string }[];
}

export interface Recorder {
  openAiCalls: { instructions: string; userText: string; model: string }[];
  urls: string[];
}

export function emptyProgress() {
  return { version: 1, lessons: {}, tests: {}, writing: {}, speaking: [], activity: {} };
}

export function makeState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    userState: {},
    conversations: [],
    messages: [],
    turns: [],
    recommendations: [],
    notes: [],
    siteTests: {},
    lessonBlocks: {},
    ...overrides,
  };
}

export function modelReply(text: string, recommendation: string | null = null, reason: string | null = null) {
  return {
    status: 'completed',
    output: [
      { type: 'reasoning' },
      {
        type: 'message',
        content: [{ type: 'output_text', text: JSON.stringify({ text, recommendation, reason, mood: 'explaining' }) }],
      },
    ],
    usage: { input_tokens: 1200, input_tokens_details: { cached_tokens: 900 }, output_tokens: 180 },
  };
}

export function makeDeps(state: FakeState, recorder: Recorder) {
  const fetchFn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    recorder.urls.push(url);
    const method = init?.method ?? 'GET';
    const headers = (init?.headers ?? {}) as Record<string, string>;

    /* Auth: the token decides who the caller is. Everything else in this fake
       is then filtered by whatever the handler passes, which is exactly what
       lets the isolation tests be meaningful. */
    if (url.startsWith(`${SUPABASE_URL}/auth/v1/user`)) {
      const auth = headers.Authorization ?? '';
      if (auth === `Bearer ${GOOD_TOKEN}`) return json({ id: USER_A });
      if (auth === `Bearer ${OTHER_TOKEN}`) return json({ id: USER_B });
      return new Response('{}', { status: 401 });
    }

    if (url.startsWith('https://api.openai.com/')) {
      if (state.openAi?.unreachable) throw new Error('network down');
      const body = JSON.parse(String(init?.body ?? '{}'));
      recorder.openAiCalls.push({
        instructions: body.instructions ?? '',
        userText: body.input?.[0]?.content?.[0]?.text ?? '',
        model: body.model,
      });
      const status = state.openAi?.status ?? 200;
      if (status !== 200) return new Response('{}', { status });
      return json(state.openAi?.body ?? modelReply('Here is what I would do next.'));
    }

    // The site's own published test JSON. The Worker fetches this instead of
    // reading question content out of the request, so every test about the
    // review tasks depends on it being served from here and nowhere else.
    if (url.startsWith(`${SITE_DATA_URL}/`)) {
      if (state.siteDataUnreachable) throw new Error('site unreachable');
      if (state.siteDataStatus) return new Response('{}', { status: state.siteDataStatus });
      const id = url.slice(`${SITE_DATA_URL}/`.length).replace(/\.json$/, '');
      const body = state.siteTests[id];
      if (body === undefined) return new Response('{}', { status: 404 });
      if (typeof body === 'string') {
        return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return json(body);
    }

    // The site's published lesson blocks. The contextual help task grounds
    // itself in one block fetched from here, so a test that wants to prove
    // the prompt carries that block and not the whole lesson depends on this
    // being the only place the text can come from.
    if (url.startsWith(`${LESSON_BLOCKS_URL}/`)) {
      if (state.siteDataUnreachable) throw new Error('site unreachable');
      if (state.siteDataStatus) return new Response('{}', { status: state.siteDataStatus });
      const slug = url.slice(`${LESSON_BLOCKS_URL}/`.length).replace(/\.json$/, '');
      const body = state.lessonBlocks[slug];
      if (body === undefined) return new Response('{}', { status: 404 });
      if (typeof body === 'string') {
        return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return json(body);
    }

    if (url.startsWith(`${SUPABASE_URL}/rest/v1/`)) return rest(url, method, init, headers, state);

    throw new Error(`unexpected fetch to ${url}`);
  };

  return {
    fetch: fetchFn as unknown as typeof fetch,
    now: () => NOW,
    uuid: () => 'fixed-uuid',
  };
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function countResponse(n: number): Response {
  return new Response('[]', { status: 206, headers: { 'content-range': `0-0/${n}` } });
}

/** Reads the `col=eq.value` filters out of a PostgREST query string. */
function filters(url: string): Record<string, string> {
  const query = url.split('?')[1] ?? '';
  const out: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(query)) {
    if (value.startsWith('eq.')) out[key] = value.slice(3);
  }
  return out;
}

/** The `col=in.(a,b)` and `col=not.in.(a,b)` filters, which the per-family
    daily caps are counted with. A fake that ignored them would count every
    task against both allowances and the cap tests would pass while proving
    nothing. */
function setFilters(url: string): Record<string, { values: string[]; negated: boolean }> {
  const query = url.split('?')[1] ?? '';
  const out: Record<string, { values: string[]; negated: boolean }> = {};
  for (const [key, value] of new URLSearchParams(query)) {
    const negated = value.startsWith('not.in.(');
    if (!negated && !value.startsWith('in.(')) continue;
    const inner = value.slice(value.indexOf('(') + 1, value.lastIndexOf(')'));
    out[key] = { values: inner.split(',').map((entry) => entry.trim()).filter(Boolean), negated };
  }
  return out;
}

function rest(
  url: string,
  method: string,
  init: RequestInit | undefined,
  headers: Record<string, string>,
  state: FakeState,
): Response {
  const table = url.slice(`${SUPABASE_URL}/rest/v1/`.length).split('?')[0];
  const where = filters(url);
  const counting = (headers.Prefer ?? '').includes('count=exact');

  if (counting) {
    if (state.breakCounts) return new Response('{}', { status: 500 });
    if (table === 'mr_ez_turns') {
      const byTask = setFilters(url).task;
      const rows = state.turns.filter(
        (t) =>
          (!where.user_id || t.user_id === where.user_id) &&
          (!byTask || (byTask.negated ? !byTask.values.includes(t.task) : byTask.values.includes(t.task))),
      );
      return countResponse(rows.length);
    }
    if (table === 'mr_ez_messages') {
      return countResponse(state.messages.filter((m) => m.conversation_id === where.conversation_id).length);
    }
    return countResponse(0);
  }

  if (method === 'GET') {
    if (table === 'user_state') {
      const row = state.userState[where.user_id ?? ''];
      return json(row ? [row] : []);
    }
    if (table === 'mr_ez_turns') {
      // `created_at=gte.<iso>` is the freshness filter on the repeat-send
      // cache; honour it here or the test cannot tell a stale reply from a
      // fresh one.
      const gte = new URLSearchParams(url.split('?')[1] ?? '').get('created_at')?.replace('gte.', '');
      const rows = state.turns.filter(
        (t) =>
          t.user_id === where.user_id &&
          t.idempotency_key === decodeURIComponent(where.idempotency_key ?? '') &&
          (!gte || (t.created_at ?? NOW.toISOString()) >= gte),
      );
      return json(rows.map((t) => ({ reply: t.reply })));
    }
    if (table === 'mr_ez_conversations') {
      const rows = state.conversations.filter(
        (c) => (!where.id || c.id === where.id) && (!where.user_id || c.user_id === where.user_id),
      );
      return json(rows);
    }
    if (table === 'mr_ez_messages') {
      return json(state.messages.filter((m) => m.conversation_id === where.conversation_id));
    }
    if (table === 'mr_ez_recommendations') {
      return json(
        state.recommendations.filter((r) => r.user_id === where.user_id && r.fingerprint === where.fingerprint),
      );
    }
    /* The two learning tables. Absent by default, because that is what the
       production project looks like today: the migration that creates them
       is a proposal nobody has applied, and PostgREST answers a query for a
       relation that does not exist with a 404 naming it. The Worker has to
       work either way, so both answers are modelled here. */
    if (table === 'learning_plan' || table === 'learning_events') {
      if (state.learningTables !== 'present') {
        return new Response(
          JSON.stringify({ code: '42P01', message: `relation "public.${table}" does not exist` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (table === 'learning_plan') {
        return json((state.learningPlans ?? []).filter((row) => row.user_id === where.user_id));
      }
      return json(
        (state.learningEvents ?? [])
          .filter((row) => row.user_id === where.user_id && (!where.event_id || row.event_id === where.event_id))
          .map((row) => ({ event: row.event })),
      );
    }
    if (table === 'mr_ez_notes') {
      /* Every one of the four filters is honoured, on purpose. Dropping the
         fingerprint would turn a stale note into a cache hit, and dropping
         user_id would hand one student another's note — the two failures
         this table's tests exist to catch. */
      return json(
        state.notes
          .filter(
            (n) =>
              n.user_id === where.user_id &&
              n.kind === where.kind &&
              n.note_key === where.note_key &&
              n.fingerprint === where.fingerprint,
          )
          .map((n) => ({ reply: n.reply })),
      );
    }
    return json([]);
  }

  const body = JSON.parse(String(init?.body ?? '{}'));

  if (method === 'POST') {
    if (table === 'mr_ez_conversations') {
      const row = { id: CONV_NEW, user_id: body.user_id, summary: null, summarised_turns: 0 };
      state.conversations.push(row);
      return json([row]);
    }
    if (table === 'mr_ez_messages') {
      for (const m of Array.isArray(body) ? body : [body]) {
        state.messages.push({ ...m, created_at: NOW.toISOString() });
      }
      return json([]);
    }
    if (table === 'mr_ez_turns') {
      state.turns.push({ created_at: NOW.toISOString(), ...body });
      return json([]);
    }
    if (table === 'mr_ez_recommendations') {
      state.recommendations = state.recommendations.filter((r) => r.user_id !== body.user_id);
      state.recommendations.push(body);
      return json([]);
    }
    if (table === 'mr_ez_notes') {
      // Upsert on the real primary key: (user_id, kind, note_key). A new
      // fingerprint REPLACES the row rather than adding a second one.
      state.notes = state.notes.filter(
        (n) => !(n.user_id === body.user_id && n.kind === body.kind && n.note_key === body.note_key),
      );
      state.notes.push(body);
      return json([]);
    }
  }

  if (method === 'PATCH') {
    if (table === 'mr_ez_conversations') {
      for (const c of state.conversations) {
        if (c.id === where.id && c.user_id === where.user_id) Object.assign(c, { summary: body.summary });
      }
    }
    return json([]);
  }

  return json([]);
}

export function post(body: unknown, token: string | null = GOOD_TOKEN, origin: string | null = PROD_ORIGIN): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (origin) headers.Origin = origin;
  return new Request(WORKER_URL, { method: 'POST', headers, body: JSON.stringify(body) });
}

/** The URLs a run fetched from the published test data, so a test can assert
    that a rejected request never reached it. */
export function dataUrls(recorder: Recorder): string[] {
  return recorder.urls.filter((u) => u.startsWith(SITE_DATA_URL));
}

/** The same, for the published lesson blocks. */
export function lessonBlockUrls(recorder: Recorder): string[] {
  return recorder.urls.filter((u) => u.startsWith(LESSON_BLOCKS_URL));
}
