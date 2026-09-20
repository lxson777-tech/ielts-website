/* A local stand-in for the two backends Mr EZ needs, so the whole experience
   can be exercised in a real browser without a Supabase project and without
   spending a cent on the OpenAI API.
 *
 * WHAT IT IS NOT: this is not the production code path and it is not a test
 * of the production code path. The Worker's real security, limits and
 * ownership logic is tested directly in tests/mr-ez-worker.test.ts, against
 * the actual handler. This file exists so a human can click through the
 * interface: sign in as two different students, hold a conversation, walk
 * between pages, clear the history, and watch the failure states.
 *
 * Every tutor reply it produces is flagged `live: false`, which makes the
 * interface label it "Simulated, not a real AI reply" everywhere it appears.
 * Nothing here should ever be presented as evidence that the live model
 * integration works.
 *
 * It speaks two protocols on one port:
 *   /auth/v1/*  and  /rest/v1/*   a minimal, in-memory Supabase
 *   /tutor                        the Mr EZ Worker's request/response shape
 *
 * Two modes:
 *
 *   node tools/mr-ez-dev-server.mjs
 *     Simulated. No model, no key, no spend. Every reply is flagged
 *     `live: false` and the interface labels it.
 *
 *   node --import ./tests/ts-extension-loader.mjs tools/mr-ez-dev-server.mjs --live
 *     LIVE AND BILLABLE. Runs the REAL Worker handler
 *     (workers/mr-ez/src/index.ts) against the REAL OpenAI API, with this
 *     server's in-memory store standing in for Supabase. Everything on the
 *     production path is exercised except the database itself. Each message
 *     costs about $0.0005. The key is read out of the Workers' gitignored
 *     .dev.vars by this script and never printed.
 *
 * Run:  node tools/mr-ez-dev-server.mjs
 * Then point the site at it in .env:
 *   PUBLIC_SUPABASE_URL=http://127.0.0.1:8787
 *   PUBLIC_SUPABASE_ANON_KEY=local-anon-key
 *   PUBLIC_MR_EZ_URL=http://127.0.0.1:8787/tutor
 *
 * Failure states can be forced with query flags on the tutor URL, so the
 * loading, retry, unavailable and limit-reached screens can all be seen:
 *   ?fail=unavailable   ?fail=busy   ?fail=limit   ?slow=3000
 */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.MR_EZ_DEV_PORT ?? 8787);
const LIVE = process.argv.includes('--live');
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ── In-memory database ────────────────────────────────────────────────── */

const db = {
  /** email -> { id, email, password } */
  users: new Map(),
  /** access token -> user id */
  tokens: new Map(),
  /** user id -> { progress, study_plan } */
  userState: new Map(),
  conversations: [],
  messages: [],
  turns: [],
  recommendations: new Map(),
  /** mr_ez_notes rows: { user_id, kind, note_key, fingerprint, reply }.
      Primary key is (user_id, kind, note_key), so a write with a new
      fingerprint replaces the row rather than adding one. */
  notes: [],
  /** Set through POST /__force to make the next requests fail, so the
      interface's unavailable, busy and limit-reached states can be seen
      without restarting anything. */
  forcedFailure: null,
};

function userByToken(req) {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const id = db.tokens.get(auth.slice(7).trim());
  return id ?? null;
}

function send(res, status, body, extraHeaders = {}) {
  const payload = body === null ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Expose-Headers': 'content-range',
    ...extraHeaders,
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function session(user) {
  const accessToken = `local-${randomUUID()}`;
  db.tokens.set(accessToken, user.id);
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `refresh-${randomUUID()}`,
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
    },
  };
}

/* ── Supabase: auth ────────────────────────────────────────────────────── */

async function handleAuth(req, res, url) {
  const path = url.pathname.replace('/auth/v1', '');

  if (path === '/settings') {
    return send(res, 200, { external: { email: true, google: false }, disable_signup: false });
  }

  if (path === '/signup') {
    const body = await readBody(req);
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!email || !body.password) return send(res, 400, { message: 'Email and password are required' });
    // Sign-up doubles as sign-in here: a local dev server has no inbox, so
    // waiting for a confirmation link would make the flow untestable.
    const existing = db.users.get(email);
    const user = existing ?? { id: randomUUID(), email, password: body.password };
    db.users.set(email, user);
    return send(res, 200, session(user));
  }

  if (path === '/token') {
    const body = await readBody(req);
    const email = String(body.email ?? '').trim().toLowerCase();
    const user = db.users.get(email);
    if (!user || user.password !== body.password) {
      return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
    }
    return send(res, 200, session(user));
  }

  if (path === '/user') {
    const userId = userByToken(req);
    if (!userId) return send(res, 401, { message: 'invalid token' });
    const user = [...db.users.values()].find((u) => u.id === userId);
    return send(res, 200, session(user).user);
  }

  if (path === '/logout') {
    const auth = req.headers.authorization ?? '';
    db.tokens.delete(auth.slice(7).trim());
    return send(res, 204, null);
  }

  return send(res, 404, { message: `unhandled auth path ${path}` });
}

/* ── Supabase: REST ────────────────────────────────────────────────────── */

/** Reads `col=eq.value` filters out of a PostgREST-style query string. */
function filters(url) {
  const out = {};
  for (const [key, value] of url.searchParams) {
    if (typeof value === 'string' && value.startsWith('eq.')) out[key] = value.slice(3);
  }
  return out;
}

/* The service role bypasses row security; the anon key does not. The dev
   server models that distinction, because "a student can only read their own
   rows" is one of the things worth seeing work in a browser. */
function isServiceRole(req) {
  return (req.headers.apikey ?? '') === 'local-service-role-key';
}

async function handleRest(req, res, url) {
  const table = url.pathname.replace('/rest/v1/', '');
  const where = filters(url);
  const caller = userByToken(req);
  const service = isServiceRole(req);

  /** Rows this caller may see. Service role sees everything; anyone else sees
      only rows carrying their own user_id, which is what RLS does in the real
      project. */
  const visible = (rows) => (service ? rows : rows.filter((r) => r.user_id === caller));

  if (req.method === 'GET') {
    const wantsCount = String(req.headers.prefer ?? '').includes('count=exact');

    let rows = [];
    if (table === 'user_state') {
      // The real table has `for select using (auth.uid() = user_id)`, so a
      // browser can only ever read its own row however it phrases the query.
      // This stand-in got that wrong at first and happily returned another
      // student's progress to an anon-key caller, which looked like a leak in
      // the product and was only a leak in the harness. A harness that cannot
      // catch the real thing is worse than no harness, so it models the
      // policy now.
      const id = service ? (where.user_id ?? caller) : caller;
      if (!service && where.user_id && where.user_id !== caller) {
        rows = [];
      } else {
        const row = db.userState.get(id);
        rows = row ? [{ user_id: id, ...row }] : [];
      }
    } else if (table === 'mr_ez_conversations') {
      rows = visible(db.conversations).filter((c) => !where.id || c.id === where.id);
      if (!service && where.user_id && where.user_id !== caller) rows = [];
      if (service && where.user_id) rows = rows.filter((c) => c.user_id === where.user_id);
      rows = [...rows].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    } else if (table === 'mr_ez_messages') {
      rows = visible(db.messages).filter((m) => !where.conversation_id || m.conversation_id === where.conversation_id);
      rows = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
      if (url.searchParams.get('order')?.includes('desc')) rows.reverse();
    } else if (table === 'mr_ez_turns') {
      rows = db.turns.filter((t) => (!where.user_id || t.user_id === where.user_id));
      if (where.idempotency_key) {
        rows = rows.filter((t) => t.idempotency_key === decodeURIComponent(where.idempotency_key));
      }
    } else if (table === 'mr_ez_recommendations') {
      const row = db.recommendations.get(where.user_id ?? caller);
      rows = row && (!where.fingerprint || row.fingerprint === where.fingerprint) ? [row] : [];
    } else if (table === 'mr_ez_notes') {
      // Every filter the Worker actually sends, honoured: a note only comes
      // back for the right student, the right kind, the right week or unit,
      // AND the right fingerprint. Ignoring the last one would turn a stale
      // note into a cache hit, which is the exact bug this table exists to
      // avoid.
      // `filters` reads these off URLSearchParams, which has already decoded
      // them, so they are compared as-is.
      rows = visible(db.notes).filter(
        (n) =>
          (!where.user_id || n.user_id === where.user_id) &&
          (!where.kind || n.kind === where.kind) &&
          (!where.note_key || n.note_key === where.note_key) &&
          (!where.fingerprint || n.fingerprint === where.fingerprint),
      );
    }

    const limit = Number(url.searchParams.get('limit'));
    if (Number.isFinite(limit) && limit > 0) rows = rows.slice(0, limit);

    if (wantsCount) {
      return send(res, 206, [], { 'content-range': `0-0/${rows.length}` });
    }
    return send(res, 200, rows);
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const items = Array.isArray(body) ? body : [body];
    const stamped = items.map((item) => ({
      id: item.id ?? randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    }));

    if (table === 'user_state') {
      for (const item of stamped) db.userState.set(item.user_id, { progress: item.progress, study_plan: item.study_plan });
    } else if (table === 'mr_ez_conversations') {
      for (const item of stamped) db.conversations.push({ summary: null, summarised_turns: 0, ...item });
    } else if (table === 'mr_ez_messages') {
      db.messages.push(...stamped);
    } else if (table === 'mr_ez_turns') {
      db.turns.push(...stamped);
    } else if (table.startsWith('mr_ez_recommendations')) {
      for (const item of stamped) db.recommendations.set(item.user_id, item);
    } else if (table.startsWith('mr_ez_notes')) {
      // Upsert on the real primary key, matching
      // `?on_conflict=user_id,kind,note_key` with merge-duplicates.
      for (const item of stamped) {
        db.notes = db.notes.filter(
          (n) => !(n.user_id === item.user_id && n.kind === item.kind && n.note_key === item.note_key),
        );
        db.notes.push(item);
      }
    }

    const prefer = String(req.headers.prefer ?? '');
    return send(res, 201, prefer.includes('return=representation') ? stamped : []);
  }

  if (req.method === 'PATCH') {
    const body = await readBody(req);
    if (table === 'mr_ez_turns') {
      // Mirrors the column-scoped grant in supabase/schema.sql: a student may
      // blank the stored reply on their own rows and nothing else. Any other
      // column in the payload is ignored rather than applied.
      const owner = service ? (where.user_id ?? caller) : caller;
      // `json` is the test harness's helper, not this file's: calling it here
      // threw a ReferenceError instead of refusing the write. A student
      // naming someone else's id gets an empty, successful no-op, which is
      // what the real policy produces (zero rows match).
      if (!service && where.user_id && where.user_id !== caller) return send(res, 204, null);
      for (const t of db.turns) {
        if (t.user_id !== owner) continue;
        if (service) Object.assign(t, body);
        else if ('reply' in body) t.reply = body.reply;
      }
      return send(res, 204, null);
    }
    if (table === 'mr_ez_conversations') {
      for (const c of db.conversations) {
        if (where.id && c.id !== where.id) continue;
        if (where.user_id && c.user_id !== where.user_id) continue;
        Object.assign(c, body, { updated_at: new Date().toISOString() });
      }
    }
    return send(res, 204, null);
  }

  if (req.method === 'DELETE') {
    // A delete only ever removes the caller's own rows, exactly like the RLS
    // policy in supabase/schema.sql.
    const owner = where.user_id && (service || where.user_id === caller) ? where.user_id : caller;
    let removed = [];
    if (table === 'mr_ez_messages') {
      removed = db.messages.filter((m) => m.user_id === owner);
      db.messages = db.messages.filter((m) => m.user_id !== owner);
    } else if (table === 'mr_ez_conversations') {
      removed = db.conversations.filter((c) => c.user_id === owner);
      db.conversations = db.conversations.filter((c) => c.user_id !== owner);
    } else if (table === 'mr_ez_recommendations') {
      const row = db.recommendations.get(owner);
      if (row) removed = [row];
      db.recommendations.delete(owner);
    } else if (table === 'mr_ez_notes') {
      removed = db.notes.filter((n) => n.user_id === owner);
      db.notes = db.notes.filter((n) => n.user_id !== owner);
    }
    const prefer = String(req.headers.prefer ?? '');
    return send(res, 200, prefer.includes('return=representation') || url.searchParams.has('select') ? removed : []);
  }

  return send(res, 405, { message: 'method not allowed' });
}

/* ── The tutor ─────────────────────────────────────────────────────────── */

/* The real Worker imports the deterministic layer from src/lib/tutor and only
   replaces the model call when TUTOR_SIMULATE is on. This dev server cannot
   import that TypeScript directly from plain Node, so it reproduces only the
   SHAPE of a reply, and marks every one of them as simulated. The wording is
   deliberately blunt about that. */
/* A plain-JS echo of the rules in parseTutorRequest (src/lib/tutor/schema.ts),
   so clicking through the interface hits the same 400s a real deployment
   would. It is deliberately only the SHAPE rules: whether a week is actually
   complete, whether a unit is actually finished, and whether a question id
   actually exists are facts about the student's record, and those are decided
   by the real Worker (in --live mode, or by the unit tests). Returns an error
   body, or null when the request is well formed. */
const TASKS = ['chat', 'welcome', 'explain', 'weekly', 'unit', 'debrief', 'item'];
const MAX_REVIEW_ITEMS = 40;
const PUBLISHED_TEST_ID = /^(?:reading|listening)-full-\d{3}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_:-]{0,79}$/;

function badRequest(message) {
  return { error: message, code: 'bad-request' };
}

function validateRequest(request) {
  if (!request || typeof request !== 'object') return badRequest('Request body must be a JSON object.');
  if (!TASKS.includes(request.task)) return badRequest('Unknown task.');

  if (request.task === 'chat' && typeof request.message !== 'string') return badRequest('A message is required.');
  if (request.task === 'explain' && !request.attempt) {
    return badRequest('Explaining a result needs which result to explain.');
  }

  if (request.task === 'unit') {
    const unit = request.unit;
    if (!unit || typeof unit !== 'object') return badRequest('A unit note needs which unit it is about.');
    if (!Number.isInteger(unit.unitId) || unit.unitId < 1 || unit.unitId > 8) {
      return badRequest('unit.unitId must be a whole number from 1 to 8.');
    }
    if (unit.kind !== 'intro' && unit.kind !== 'wrap') return badRequest('unit.kind must be intro or wrap.');
  }

  if (request.task === 'debrief' || request.task === 'item') {
    const review = request.review;
    if (!review || typeof review !== 'object') return badRequest('Reviewing answers needs which questions to review.');
    const testId = String(review.testId ?? '').replace(/-drill-p\d+$/, '');
    if (!PUBLISHED_TEST_ID.test(testId)) return badRequest('review.testId is not a practice paper on this site.');
    if (!Array.isArray(review.items)) return badRequest('review.items must be an array.');
    if (review.items.length === 0) return badRequest('review.items must name at least one question.');
    if (review.items.length > MAX_REVIEW_ITEMS) {
      return badRequest(`review.items must name at most ${MAX_REVIEW_ITEMS} questions.`);
    }
    for (const item of review.items) {
      if (!item || typeof item !== 'object') return badRequest('Each review item must be an object.');
      if (!SAFE_ID.test(String(item.questionId ?? ''))) return badRequest('review.items[].questionId is malformed.');
      if (typeof item.given !== 'string') return badRequest('review.items[].given must be a string.');
    }
    if (request.task === 'item' && review.items.length !== 1) {
      return badRequest('Explaining one question needs exactly one question.');
    }
  }

  return null;
}

/** The (kind, note_key) a one-shot note would be cached under, or null when
    the task is not one. The real Worker derives note_key from counted facts
    (a week's Monday, a unit id); this stand-in cannot count, so it uses a
    stable stand-in key and caches per student, which is enough to see the
    "reopening this page is free" behaviour in the interface. */
function noteKeyFor(request) {
  if (request.task === 'weekly') return { kind: 'weekly', note_key: 'last-week' };
  if (request.task === 'unit' && request.unit) {
    return { kind: request.unit.kind === 'intro' ? 'unit-intro' : 'unit-wrap', note_key: String(request.unit.unitId) };
  }
  return null;
}

function simulatedReply(request, conversationId, turnsToday, turnsPerDay) {
  const base = {
    task: request.task,
    conversationId,
    recommendation: null,
    mood: 'explaining',
    live: false,
    model: 'simulated (local dev server)',
    usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, costUsd: 0, turnsToday, turnsPerDay },
  };

  if (request.task === 'welcome') {
    return {
      ...base,
      mood: 'encouraging',
      text: 'Simulated tutor reply from the local dev server. No AI was called and nothing was charged. With a real model configured, this is where the greeting and the reason for the next step would be written.',
      recommendation: {
        id: 'tool:report',
        label: 'Your progress report',
        href: '/report',
        reason: 'A simulated reason. The real one is written by the model from your own record.',
      },
    };
  }

  if (request.task === 'explain') {
    return {
      ...base,
      text: `Simulated tutor reply from the local dev server. No AI was called. The result being explained is the ${request.attempt?.kind} attempt recorded at ${request.attempt?.at}.\n\nEvery band on this platform is an estimate from its own AI marking, not an official IELTS result.`,
      recommendation: {
        id: 'trainer:writing',
        label: 'Write an essay and get an AI band',
        href: '/trainers/writing',
        reason: 'A simulated reason.',
      },
    };
  }

  if (request.task === 'weekly') {
    return {
      ...base,
      text: 'Simulated weekly review from the local dev server. No AI was called and nothing was charged. The real one states only counted facts: days studied out of days planned, minutes against the goal, lessons finished, practice attempts, and the same four numbers for the week before. It never calls one band change a trend.',
      recommendation: {
        id: 'tool:report',
        label: 'Your progress report',
        href: '/report',
        reason: 'A simulated reason. The real one is chosen in code from your own record.',
      },
    };
  }

  if (request.task === 'unit') {
    const kind = request.unit?.kind === 'wrap' ? 'wrap-up' : 'introduction';
    return {
      ...base,
      mood: request.unit?.kind === 'wrap' ? 'celebrating' : 'explaining',
      text: `Simulated unit ${kind} from the local dev server for unit ${request.unit?.unitId}. No AI was called. A unit note never carries a recommendation: the unit's own lessons are right beneath it.`,
      // Deliberately null, exactly like the real thing.
      recommendation: null,
    };
  }

  if (request.task === 'debrief' || request.task === 'item') {
    const items = request.review?.items ?? [];
    return {
      ...base,
      text:
        `Simulated answer review from the local dev server. No AI was called. Asked about ${items.length} ` +
        `${items.length === 1 ? 'question' : 'questions'} (${items.map((i) => i.questionId).join(', ')}) in ` +
        `${request.review?.testId}.\n\nThe real Worker fetches those questions from the site's own published ` +
        'JSON and never reads a prompt, an answer or an explanation out of the request. This is a review of ' +
        'answers, not a mark, so it says nothing about a band.',
      recommendation: {
        id: 'trainer:reading',
        label: 'Short Reading drills',
        href: '/trainers/reading',
        reason: 'A simulated reason. The real one is chosen in code from the question types that went wrong.',
      },
    };
  }

  return {
    ...base,
    text: `Simulated tutor reply from the local dev server. No AI was called and nothing was charged.\n\nYou asked: "${request.message}"\n\nWith a real model configured, Mr EZ would answer this using only your own goals, results and the lesson you have open.`,
  };
}

async function handleTutor(req, res, url) {
  if (req.method === 'GET') {
    return send(res, 200, {
      model: LIVE ? 'gpt-5.6-luna' : 'simulated (local dev server)',
      live: LIVE,
      requiresSignIn: true,
      turnsPerDay: 40,
      configured: true,
    });
  }

  const userId = userByToken(req);
  if (!userId) return send(res, 401, { error: 'Sign in to talk to Mr EZ.', code: 'sign-in-required' });

  const forced = url.searchParams.get('fail') ?? db.forcedFailure;
  if (forced === 'unavailable') return send(res, 503, { error: 'Mr EZ is not available at the moment.', code: 'unavailable' });
  if (forced === 'busy') return send(res, 429, { error: 'Mr EZ is busy right now. Give it a few seconds and ask again.', code: 'busy', retryAfter: 10 });
  if (forced === 'limit') {
    return send(res, 429, { error: 'That is 40 questions today, which is the daily limit. Mr EZ will be back tomorrow.', code: 'limit-reached' });
  }

  const slow = Number(url.searchParams.get('slow'));
  if (Number.isFinite(slow) && slow > 0) await new Promise((r) => setTimeout(r, slow));

  const bodyChunks = [];
  for await (const chunk of req) bodyChunks.push(chunk);
  const bodyText = Buffer.concat(bodyChunks).toString('utf8') || '{}';

  if (LIVE && liveHandler) {
    // The real Worker handler answers, using the real model. Its own auth,
    // ownership, limits, idempotency and persistence run against this file's
    // store, so what is exercised here is production logic.
    const resp = await liveHandler(bodyText, req.headers.authorization);
    const text = await resp.text();
    return send(res, resp.status, text ? JSON.parse(text) : null);
  }

  let request;
  try {
    request = JSON.parse(bodyText);
  } catch {
    request = {};
  }

  const invalid = validateRequest(request);
  if (invalid) return send(res, 400, invalid);

  // Repeat-send guard, same contract as the Worker.
  if (request.idempotencyKey) {
    const since = Date.now() - 10 * 60 * 1000; // same window as the Worker
    const existing = db.turns.find(
      (t) =>
        t.user_id === userId &&
        t.idempotency_key === request.idempotencyKey &&
        t.reply &&
        Date.parse(t.created_at) >= since,
    );
    if (existing) return send(res, 200, { ...existing.reply, cached: true });
  }

  // Ownership: a conversation you do not own does not exist as far as you
  // are concerned.
  let conversation = null;
  if (request.conversationId) {
    conversation = db.conversations.find((c) => c.id === request.conversationId && c.user_id === userId) ?? null;
    if (!conversation) return send(res, 404, { error: 'That conversation is not available.', code: 'not-found' });
  }
  if (request.task === 'chat' && !conversation) {
    conversation = {
      id: randomUUID(),
      user_id: userId,
      summary: null,
      summarised_turns: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.conversations.push(conversation);
  }

  /* The welcome is cached per student, so reopening the dashboard costs
     nothing. The real Worker keys this on a fingerprint of the student's
     whole record (insightsFingerprint) and re-answers the moment that
     changes; this stand-in cannot compute that fingerprint from plain Node,
     so it caches per student until the history is cleared. The fingerprint
     behaviour itself is covered by tests/mr-ez-worker.test.ts. */
  if (request.task === 'welcome') {
    const cached = db.recommendations.get(userId);
    if (cached) return send(res, 200, { ...cached.reply, cached: true });
  }

  /* The weekly review and the unit notes are cached the same way, in
     mr_ez_notes, so the "you have read this already, it costs nothing to
     look again" path is visible in the interface too. */
  const note = noteKeyFor(request);
  if (note) {
    const stored = db.notes.find((n) => n.user_id === userId && n.kind === note.kind && n.note_key === note.note_key);
    if (stored) return send(res, 200, { ...stored.reply, cached: true });
  }

  const turnsToday = db.turns.filter((t) => t.user_id === userId).length;
  const reply = simulatedReply(request, conversation?.id ?? '', turnsToday + 1, 40);

  db.turns.push({
    id: randomUUID(),
    user_id: userId,
    conversation_id: conversation?.id ?? null,
    task: request.task,
    idempotency_key: request.idempotencyKey ?? null,
    reply,
    cost_usd: 0,
    created_at: new Date().toISOString(),
  });

  if (request.task === 'welcome') {
    db.recommendations.set(userId, { user_id: userId, fingerprint: 'dev', reply });
  }

  if (note) {
    db.notes = db.notes.filter((n) => !(n.user_id === userId && n.kind === note.kind && n.note_key === note.note_key));
    db.notes.push({ user_id: userId, ...note, fingerprint: 'dev', reply, created_at: new Date().toISOString() });
  }

  if (conversation && request.message) {
    const now = new Date().toISOString();
    db.messages.push(
      { id: randomUUID(), conversation_id: conversation.id, user_id: userId, role: 'student', content: request.message, created_at: now },
      { id: randomUUID(), conversation_id: conversation.id, user_id: userId, role: 'tutor', content: reply.text, created_at: new Date(Date.now() + 1).toISOString() },
    );
    conversation.updated_at = now;
  }

  return send(res, 200, reply);
}

/* ── Server ────────────────────────────────────────────────────────────── */

/* -- Live bridge -----------------------------------------------------------
   Hands the request to the real Worker handler, with this file's in-memory
   store playing Supabase. Loaded only when --live is passed, so the default
   path needs no TypeScript loader and cannot spend anything. */

let liveHandler = null;

/** Reads OPENAI_API_KEY out of the Workers' gitignored .dev.vars. Used for the
    Authorization header only: never logged, never stored, never sent anywhere
    but OpenAI. */
function readOpenAiKey() {
  const candidates = [
    'workers/mr-ez/.dev.vars',
    '../../../workers/mr-ez/.dev.vars',
    '../../../workers/grade-essay/.dev.vars',
    '../../../workers/grade-speaking/.dev.vars',
    '../../../workers/live-examiner/.dev.vars',
  ].map((rel) => resolve(REPO, rel));
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = /^\s*OPENAI_API_KEY\s*=\s*"?([^"\s]+)"?\s*$/.exec(line);
      if (m && m[1] && m[1].length > 20) {
        console.log('live mode: key loaded from a workers/*/.dev.vars (value not shown)');
        return m[1];
      }
    }
  }
  throw new Error('--live needs an OPENAI_API_KEY in one of the workers/*/.dev.vars');
}

const STUB_SUPABASE = 'https://stub.invalid';

/* In --live mode the real Worker fetches each practice paper's published JSON.
   Pointed at the Astro dev server, which serves the same route the deployed
   site does (src/pages/data/tests/[id].json.ts), so the debrief and item tasks
   run against real question content with no network beyond this machine.
   Start the site separately with `npm run dev`. */
const LIVE_SITE_DATA_URL = 'http://localhost:4321/ielts-website/data/tests';

async function initLive() {
  const { createHandler } = await import('../workers/mr-ez/src/index.ts');
  const key = readOpenAiKey();
  const realFetch = globalThis.fetch;

  /* The Worker talks to Supabase over REST. Those calls are routed back into
     this file's own store, so the real handler's auth, ownership, limits,
     idempotency and persistence all run for real against a database it cannot
     tell is fake. OpenAI calls go straight out. */
  const deps = {
    now: () => new Date(),
    uuid: () => randomUUID(),
    fetch: async (input, init) => {
      const url = typeof input === 'string' ? input : (input.url ?? String(input));
      if (url.startsWith('https://api.openai.com/')) return realFetch(input, init);
      // The published test JSON is a real HTTP request to the Astro dev
      // server, not a stub: the point of --live is that everything except the
      // database is the production path.
      if (url.startsWith(LIVE_SITE_DATA_URL)) return realFetch(input, init);
      if (!url.startsWith(STUB_SUPABASE)) throw new Error('unexpected fetch to ' + url);

      const parsed = new URL(url);
      const rawHeaders = Object.fromEntries(Object.entries(init && init.headers ? init.headers : {}));
      const lower = {};
      for (const [k, v] of Object.entries(rawHeaders)) lower[k.toLowerCase()] = v;
      // The Worker always uses the service role; this store honours that the
      // same way the real project's row-level security does.
      lower.apikey = 'local-service-role-key';

      const fakeReq = {
        method: (init && init.method) || 'GET',
        headers: lower,
        [Symbol.asyncIterator]: async function* () {
          if (init && init.body) yield Buffer.from(String(init.body));
        },
      };

      return await new Promise((done) => {
        const fakeRes = {
          writeHead(status, h) { this._status = status; this._headers = h; },
          end(body) {
            done(new Response(body || null, { status: this._status || 200, headers: this._headers || {} }));
          },
        };
        if (parsed.pathname.startsWith('/auth/v1')) void handleAuth(fakeReq, fakeRes, parsed);
        else void handleRest(fakeReq, fakeRes, parsed);
      });
    },
  };

  const env = {
    ALLOWED_ORIGINS: 'http://localhost:4321,http://127.0.0.1:4321,http://localhost:4322,http://127.0.0.1:4322',
    SUPABASE_URL: STUB_SUPABASE,
    SUPABASE_SERVICE_ROLE_KEY: 'local-service-role-key',
    SITE_DATA_URL: LIVE_SITE_DATA_URL,
    OPENAI_API_KEY: key,
  };

  const handler = createHandler(deps);
  liveHandler = (bodyText, authHeader) =>
    handler(
      new Request('http://localhost:4321/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:4321',
          Authorization: authHeader || '',
        },
        body: bodyText,
      }),
      env,
    );
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') return send(res, 204, null);

  try {
    if (url.pathname.startsWith('/auth/v1')) return await handleAuth(req, res, url);
    if (url.pathname.startsWith('/rest/v1/')) return await handleRest(req, res, url);
    if (url.pathname.startsWith('/tutor')) return await handleTutor(req, res, url);
    if (url.pathname === '/__force') {
      const body = await readBody(req);
      db.forcedFailure = body.fail ?? null;
      return send(res, 200, { forcedFailure: db.forcedFailure });
    }
    if (url.pathname === '/__state') {
      // A read-only window into the fake database, so a verification run can
      // assert what was actually stored rather than only what was rendered.
      return send(res, 200, {
        users: [...db.users.values()].map((u) => ({ id: u.id, email: u.email })),
        conversations: db.conversations,
        messages: db.messages.map(({ id, user_id, conversation_id, role, content }) => ({ id, user_id, conversation_id, role, content })),
        turns: db.turns.length,
        turnsWithStoredReply: db.turns.filter((t) => t.reply).length,
        recommendations: [...db.recommendations.keys()],
        notes: db.notes.map(({ user_id, kind, note_key, fingerprint }) => ({ user_id, kind, note_key, fingerprint })),
      });
    }
  } catch (err) {
    console.error('dev server error', err);
    return send(res, 500, { error: String(err) });
  }

  return send(res, 404, { message: 'not found' });
});

if (LIVE) await initLive();

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mr EZ dev backend on http://127.0.0.1:${PORT}`);
  console.log('  Supabase stand-in : /auth/v1/*  /rest/v1/*');
  if (LIVE) {
    console.log('  Tutor             : /tutor  *** LIVE: real Worker, real model, REAL MONEY ***');
    console.log('                      roughly $0.0005 per message');
    console.log(`  Test data         : ${LIVE_SITE_DATA_URL} (needs \`npm run dev\` running)`);
  } else {
    console.log('  Tutor stand-in    : /tutor  (every reply is flagged simulated)');
  }
});
