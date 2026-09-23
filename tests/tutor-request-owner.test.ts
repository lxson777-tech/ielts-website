/* Every request to Mr EZ belongs to one student, and so does its reply.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/tutor-request-owner.test.ts
 * The whole suite is `npm test`.
 *
 * WHY THIS FILE EXISTS
 * The sixth Codex inspection (R2E-02) bound the two review requests ("Go
 * through my mistakes", "Why was my answer wrong?") to the student who sat
 * the paper. Every OTHER request to Mr EZ was still sent with whatever token
 * the browser held when it went out, and its reply was handed to whichever
 * conversation was on the page when it came back. So a message student A
 * typed, or A's welcome, weekly review, unit note or explanation, could go
 * out under B's token after an account switch, and a reply that came back
 * for A after the switch landed in B's panel, and in B's saved copy of it.
 *
 * The fix is central, in src/lib/tutor/client.ts, with the binding itself in
 * src/lib/tutor/review-owner.ts: every request is bound, when it is made, to
 * the owner on the page (or to the review's own student); refused before
 * any token is read if that owner has gone; refused after the token is read
 * if the session is anybody else's; checked again before the one automatic
 * retry; and whatever comes back is handed over only while the owner has
 * stayed the current one throughout. The panel's conversation is kept per
 * owner (src/lib/tutor/conversation.ts).
 *
 * WHAT IS SIMULATED, AND WHAT IS NOT
 * Simulated: the network (a fetch that records what was sent and answers
 * when told to), the account (a stand-in for src/lib/auth/supabase.ts that
 * hands out a session this file sets), and the two browser stores (Maps).
 * Everything else is the shipping code: the real tutor client, the real
 * owner module and the real conversation store. No model is called and no
 * reply here is presented as a live one: every reply is SYNTHETIC and says
 * so, as is every student, token and message.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';

/* ------------------------------------------------------------------ */
/* A browser, an account and a network, in memory                      */
/* ------------------------------------------------------------------ */

interface MemoryStorage {
  data: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStorage(): MemoryStorage {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

let local = memoryStorage();
let tabSession = memoryStorage();

/* Defined before anything under test is imported. */
(globalThis as Record<string, unknown>).window = {
  get localStorage() {
    return local;
  },
  get sessionStorage() {
    return tabSession;
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
};

/** The session the synthetic account hands out right now. */
let held: { token: string; userId: string } | null = null;
/** How many times any code read it: a refusal "before any token is
    fetched" means this does not move. */
let sessionReads = 0;
/** Runs inside a session read, after the session was taken: the account
    changing while the token is being read. */
let duringSessionRead: (() => void) | null = null;
/** Runs when the stored conversation rows are read. */
let duringRowsRead: (() => void) | null = null;

/** The durable conversation rows the account holds, per student. Row-level
    security in miniature: a query returns the rows of whoever the session
    belongs to at the moment it runs. */
const conversationRows = new Map<string, { id: string; messages: { id: string; role: string; content: string; created_at: string }[] }>();

function rowsQuery(table: string) {
  const chain = {
    select: () => chain,
    order: () => chain,
    eq: () => chain,
    limit: async () => {
      duringRowsRead?.();
      const mine = held ? conversationRows.get(held.userId) : undefined;
      if (table === 'mr_ez_conversations') return { data: mine ? [{ id: mine.id }] : [], error: null };
      return { data: mine ? mine.messages : [], error: null };
    },
  };
  return chain;
}

(globalThis as Record<string, unknown>).__tutorTestSupabase = {
  auth: {
    async getSession() {
      sessionReads += 1;
      const now = held;
      duringSessionRead?.();
      return { data: { session: now ? { access_token: now.token, user: { id: now.userId } } : null } };
    },
    async getUser() {
      return { data: { user: held ? { id: held.userId } : null } };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
  },
  from: rowsQuery,
};

/* The tutor's address, as the build would set it. SYNTHETIC and never
   reached: fetch below answers everything itself. */
const TUTOR_URL = 'https://synthetic-tutor.invalid/tutor';
(globalThis as Record<string, unknown>).__tutorTestEnv = { PUBLIC_MR_EZ_URL: TUTOR_URL };

/* The account module is replaced, and the tutor client is given the one
   public setting it reads at load. Everything else is the real file. */
registerHooks({
  load(url, context, next) {
    if (url.endsWith('/src/lib/auth/supabase.ts')) {
      return {
        format: 'module',
        shortCircuit: true,
        source:
          'export const getSupabase = () => globalThis.__tutorTestSupabase;\n' +
          'export const isAuthConfigured = () => true;\n',
      };
    }
    const loaded = next(url, context);
    if (url.endsWith('/src/lib/tutor/client.ts')) {
      const source =
        typeof loaded.source === 'string' ? loaded.source : Buffer.from(loaded.source as ArrayBuffer).toString('utf8');
      return {
        ...loaded,
        source: 'Object.defineProperty(import.meta, "env", { get: () => globalThis.__tutorTestEnv });\n' + source,
      };
    }
    return loaded;
  },
});

/** One request as the tutor would have received it. */
interface Sent {
  url: string;
  auth: string;
  body: Record<string, unknown>;
}
const sent: Sent[] = [];

/** How the next request is answered. Tests replace it. */
let answer: (request: Sent) => Promise<Response> = async () => reply(200, SYNTHETIC_REPLY);

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  const request: Sent = {
    url: String(input),
    auth: headers.Authorization ?? '',
    body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
  };
  sent.push(request);
  return answer(request);
}) as typeof fetch;

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** An answer held back until the test lets it go. */
function heldAnswer() {
  let release!: (response: Response) => void;
  const promise = new Promise<Response>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function until(condition: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 400; i += 1) {
    if (condition()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail(`never happened: ${what}`);
}

/* ------------------------------------------------------------------ */
/* The real modules                                                    */
/* ------------------------------------------------------------------ */

const client = await import('../src/lib/tutor/client.ts');
const reviewOwner = await import('../src/lib/tutor/review-owner.ts');
const conversation = await import('../src/lib/tutor/conversation.ts');
const storeOwner = await import('../src/lib/store-owner.ts');
const { DEVICE_ID_KEY } = await import('../src/lib/learning/contracts/sync.ts');

const { askTutor, askLessonHelp, TutorClientError } = client;
const { TutorOwnerChangedError } = reviewOwner;
const { anonymousOwner, ownerNamespace, resetStoreOwnerForTest, setCurrentOwner, userOwner } = storeOwner;

/* ------------------------------------------------------------------ */
/* SYNTHETIC students, sessions and replies                            */
/* ------------------------------------------------------------------ */

const A = userOwner('SYNTHETIC-TUTOR-STUDENT-A');
const B = userOwner('SYNTHETIC-TUTOR-STUDENT-B');
const NS_A = ownerNamespace(A);
const NS_B = ownerNamespace(B);
const ANON = anonymousOwner('SYNTHETIC-TUTOR-DEVICE');

const A_SESSION = { token: 'SYNTHETIC-token-A', userId: 'SYNTHETIC-TUTOR-STUDENT-A' };
const B_SESSION = { token: 'SYNTHETIC-token-B', userId: 'SYNTHETIC-TUTOR-STUDENT-B' };

const A_MESSAGE = 'SYNTHETIC question typed by student A';
const LATE_TEXT = 'SYNTHETIC simulated reply meant for student A';

const SYNTHETIC_REPLY = {
  task: 'chat',
  conversationId: 'SYNTHETIC-conversation-A',
  text: LATE_TEXT,
  mood: 'explaining',
  live: false,
  model: 'simulated',
};

/** A fresh browser: empty stores, nothing sent, A signed in with A's own
    session, and every answer immediate unless a test says otherwise. */
function freshBrowser(): void {
  local = memoryStorage();
  tabSession = memoryStorage();
  local.data.set(DEVICE_ID_KEY, 'SYNTHETIC-TUTOR-DEVICE');
  resetStoreOwnerForTest();
  setCurrentOwner(A);
  held = A_SESSION;
  sessionReads = 0;
  duringSessionRead = null;
  duringRowsRead = null;
  sent.length = 0;
  answer = async () => reply(200, SYNTHETIC_REPLY);
  conversationRows.clear();
}

/** The refusal a promise ended in, or a failure if it ended any other way. */
async function ownerRefusal(promise: Promise<unknown>): Promise<{ now: string; sent: boolean }> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof TutorOwnerChangedError, `not an owner refusal: ${String(error)}`);
    assert.ok(!(error instanceof TutorClientError), 'an owner refusal must not look like an error to show');
    return { now: error.now, sent: error.sent };
  }
  assert.fail('the request was not refused');
}

function chat(message = A_MESSAGE, idempotencyKey = 'SYNTHETIC-key-1') {
  return askTutor({ task: 'chat', message, idempotencyKey } as never);
}

/** Everything in this tab's session storage, as one string. */
function everythingInTheTab(): string {
  return JSON.stringify([...tabSession.data.entries()]);
}

/* ------------------------------------------------------------------ */
/* 1. With no switch, nothing changes                                   */
/* ------------------------------------------------------------------ */

test('with no account change a request goes out once, with its own token, and its reply comes back exactly as before', { timeout: 10_000 }, async () => {
  freshBrowser();
  const got = await chat();
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.url, TUTOR_URL);
  assert.equal(sent[0]!.auth, `Bearer ${A_SESSION.token}`);
  assert.equal(sent[0]!.body.message, A_MESSAGE);
  assert.equal(sent[0]!.body.idempotencyKey, 'SYNTHETIC-key-1', 'the repeat-send key is the caller’s own');
  assert.ok(sent[0]!.body.locale === 'en' || sent[0]!.body.locale === 'ru', 'the language rides along');
  assert.deepEqual(got, SYNTHETIC_REPLY);

  /* Signed out, with no session anywhere: "sign in", exactly as before. */
  freshBrowser();
  setCurrentOwner(null);
  held = null;
  await assert.rejects(chat(), (error) => error instanceof TutorClientError && error.code === 'sign-in-required');
  assert.equal(sent.length, 0);

  /* A signed-in owner whose session has lapsed on this device: also
     "sign in", not a silent refusal, because nobody else is involved. */
  freshBrowser();
  held = null;
  await assert.rejects(chat(), (error) => error instanceof TutorClientError && error.code === 'sign-in-required');
  assert.equal(sent.length, 0);

  /* An ordinary failure, with no change, is still the caller's to show. */
  freshBrowser();
  answer = async () => reply(429, { error: 'limit', code: 'limit-reached' });
  await assert.rejects(chat(), (error) => error instanceof TutorClientError && error.code === 'limit-reached');
  assert.equal(sent.length, 1);
});

/* ------------------------------------------------------------------ */
/* 2. Refused before any token is read                                  */
/* ------------------------------------------------------------------ */

test("a request made for A is refused before any token is fetched once B is the one on the page", { timeout: 10_000 }, async () => {
  freshBrowser();
  /* A's review left open; B signed in; the press names A. */
  setCurrentOwner(B);
  held = B_SESSION;
  const refused = await ownerRefusal(
    askTutor({ task: 'item', review: { testId: 'reading-full-006-drill-p2', items: [{ questionId: 'q14', given: 'i' }] } } as never, { owner: NS_A }),
  );
  assert.deepEqual(refused, { now: 'other-student', sent: false });
  assert.equal(sessionReads, 0, 'a token was read for a request that is not the current student’s');
  assert.equal(sent.length, 0);

  /* Nobody signed in now: the same, as a sign-out. */
  setCurrentOwner(null);
  held = null;
  assert.deepEqual(await ownerRefusal(askTutor({ task: 'welcome' } as never, { owner: NS_A })), { now: 'signed-out', sent: false });
  assert.equal(sessionReads, 0);
  assert.equal(sent.length, 0);
});

/* ------------------------------------------------------------------ */
/* 3. Nobody else's token is ever used                                  */
/* ------------------------------------------------------------------ */

test("a token belonging to somebody else is never used, whoever the page still thinks is here", { timeout: 10_000 }, async () => {
  /* Another tab signed B in; this tab has not been told and still names A. */
  freshBrowser();
  held = B_SESSION;
  assert.deepEqual(await ownerRefusal(chat()), { now: 'other-student', sent: false });
  assert.equal(sessionReads, 1);
  assert.equal(sent.length, 0, "A's message went out with B's token");

  /* The same for every task, the learning ones included. */
  await ownerRefusal(askTutor({ task: 'welcome' } as never));
  await ownerRefusal(askTutor({ task: 'weekly', tzOffsetMinutes: 300 } as never));
  await ownerRefusal(askTutor({ task: 'unit', unit: { unitId: 'u1', kind: 'intro' } } as never));
  await ownerRefusal(askTutor({ task: 'explain', attempt: { kind: 'essay', at: '2026-09-23T09:00:00.000Z' } } as never));
  await ownerRefusal(askLessonHelp({ kind: 'hint' } as never));
  assert.equal(sent.length, 0);

  /* Nobody signed in on this page, but a session is sitting there: it is
     somebody's this page has not been told about. */
  freshBrowser();
  setCurrentOwner(null);
  held = A_SESSION;
  assert.deepEqual(await ownerRefusal(chat()), { now: 'other-student', sent: false });
  assert.equal(sent.length, 0);

  /* The account changes while the token is being read. */
  freshBrowser();
  duringSessionRead = () => {
    duringSessionRead = null;
    setCurrentOwner(B);
  };
  assert.deepEqual(await ownerRefusal(chat()), { now: 'other-student', sent: false });
  assert.equal(sent.length, 0);
});

/* ------------------------------------------------------------------ */
/* 4. A late reply is dropped, and lands nowhere                        */
/* ------------------------------------------------------------------ */

test("a reply that arrives after the switch is dropped: nothing lands in B's conversation or cache, and nothing is sent again", { timeout: 10_000 }, async () => {
  freshBrowser();
  /* A asks, the way the panel does: A's question into A's conversation
     first, then the request. */
  const aTurn = { id: 'local-SYNTHETIC-key-1', role: 'student' as const, text: A_MESSAGE, at: '2026-09-23T09:00:00.000Z' };
  conversation.saveConversation({ conversationId: null, turns: [aTurn] }, A);
  const waiting = heldAnswer();
  answer = () => waiting.promise;
  const pending = chat();
  await until(() => sent.length === 1, 'the request went out');
  assert.equal(sent[0]!.auth, `Bearer ${A_SESSION.token}`, "A's request carried A's own token");

  /* B signs in (in another tab, or this one) while it is on its way. */
  setCurrentOwner(B);
  held = B_SESSION;
  waiting.release(reply(200, SYNTHETIC_REPLY));

  assert.deepEqual(await ownerRefusal(pending), { now: 'other-student', sent: true });
  assert.equal(sent.length, 1, 'something was sent again after the switch');

  /* B's conversation: empty, in memory and in the tab. */
  assert.deepEqual(conversation.loadConversation(), conversation.EMPTY_CONVERSATION);
  assert.equal(tabSession.getItem(conversation.conversationKey(B)), null);
  assert.ok(!everythingInTheTab().includes(LATE_TEXT), 'the late reply was written somewhere');
  /* A's own question is still A's, under A's key only. */
  assert.deepEqual(conversation.loadConversation(A).turns, [aTurn]);
  assert.deepEqual([...tabSession.data.keys()], [conversation.conversationKey(A)]);
});

test('a switch and a switch back while the reply is on its way still counts: the reply is dropped', { timeout: 10_000 }, async () => {
  freshBrowser();
  const waiting = heldAnswer();
  answer = () => waiting.promise;
  const pending = chat();
  await until(() => sent.length === 1, 'the request went out');
  setCurrentOwner(B);
  setCurrentOwner(A);
  waiting.release(reply(200, SYNTHETIC_REPLY));
  assert.equal((await ownerRefusal(pending)).sent, true);
  assert.equal(sent.length, 1);

  /* An announcement for the SAME owner (the anonymous-work claim moving
     work in) is not a change: the reply is delivered. */
  freshBrowser();
  const same = heldAnswer();
  answer = () => same.promise;
  const kept = chat();
  await until(() => sent.length === 1, 'the request went out');
  storeOwner.announceStoresChanged();
  same.release(reply(200, SYNTHETIC_REPLY));
  assert.deepEqual(await kept, SYNTHETIC_REPLY);
});

test("a failure that arrives after the switch is dropped too, and never shown as B's error", { timeout: 10_000 }, async () => {
  freshBrowser();
  const waiting = heldAnswer();
  answer = () => waiting.promise;
  const pending = chat();
  await until(() => sent.length === 1, 'the request went out');
  setCurrentOwner(B);
  /* A's daily limit, say: it is A's, and B's panel must not say it. */
  waiting.release(reply(429, { error: 'SYNTHETIC limit reached for A', code: 'limit-reached' }));
  assert.deepEqual(await ownerRefusal(pending), { now: 'other-student', sent: true });
  assert.equal(sent.length, 1, 'a failure after the switch was retried');

  /* A learning task, the same way. */
  freshBrowser();
  const help = heldAnswer();
  answer = () => help.promise;
  const helping = askLessonHelp({ kind: 'hint' } as never);
  await until(() => sent.length === 1, 'the help request went out');
  setCurrentOwner(null);
  held = null;
  help.release(reply(200, { text: 'SYNTHETIC hint for A', kind: 'hint', live: false }));
  assert.deepEqual(await ownerRefusal(helping), { now: 'signed-out', sent: true });
});

/* ------------------------------------------------------------------ */
/* 5. The retry checks again                                            */
/* ------------------------------------------------------------------ */

test('a retry checks the owner again: nothing is sent a second time for a student who left during the pause', { timeout: 10_000 }, async () => {
  freshBrowser();
  answer = async () => {
    /* The first attempt fails in a way that is retried, and the account
       changes during the pause before the retry. */
    setTimeout(() => {
      setCurrentOwner(B);
      held = B_SESSION;
    }, 100);
    return reply(503, { error: 'SYNTHETIC busy', code: 'unavailable' });
  };
  assert.deepEqual(await ownerRefusal(chat()), { now: 'other-student', sent: true });
  assert.equal(sent.length, 1, 'the retry went out after the switch');

  /* With no switch, the one retry goes as before: same key, same token. */
  freshBrowser();
  let attempts = 0;
  answer = async () => {
    attempts += 1;
    return attempts === 1 ? reply(503, { error: 'SYNTHETIC busy', code: 'unavailable' }) : reply(200, SYNTHETIC_REPLY);
  };
  assert.deepEqual(await chat(), SYNTHETIC_REPLY);
  assert.equal(sent.length, 2);
  assert.equal(sent[0]!.body.idempotencyKey, sent[1]!.body.idempotencyKey, 'the retry bought a second answer');
  assert.equal(sent[1]!.auth, `Bearer ${A_SESSION.token}`);
});

/* ------------------------------------------------------------------ */
/* 6. The conversation store is one student's per key                   */
/* ------------------------------------------------------------------ */

test("the panel's conversation is kept per owner: B never reads A's, and a late save goes to the owner it names", { timeout: 10_000 }, async () => {
  freshBrowser();
  const aState = {
    conversationId: 'SYNTHETIC-conversation-A',
    turns: [{ id: 't1', role: 'student' as const, text: A_MESSAGE, at: '2026-09-23T09:00:00.000Z' }],
  };
  conversation.saveConversation(aState);
  assert.deepEqual(tabSession.data.has(conversation.conversationKey(A)), true);
  assert.equal(conversation.conversationKey(A), `ielts.mrez.conversation.v1::${NS_A}`);

  setCurrentOwner(B);
  assert.deepEqual(conversation.loadConversation(), conversation.EMPTY_CONVERSATION, "B opened the panel on A's conversation");

  /* A save that runs a moment after the switch, for the conversation that
     was on screen before it, names A and lands under A. */
  conversation.saveConversation({ ...aState, turns: [...aState.turns, { id: 't2', role: 'tutor' as const, text: 'SYNTHETIC earlier reply', at: '2026-09-23T09:00:01.000Z' }] }, A);
  assert.deepEqual(conversation.loadConversation(), conversation.EMPTY_CONVERSATION);
  assert.equal(conversation.loadConversation(A).turns.length, 2);

  /* The old unowned key, from before this change, is nobody's: never read. */
  tabSession.setItem('ielts.mrez.conversation.v1', JSON.stringify(aState));
  assert.deepEqual(conversation.loadConversation(), conversation.EMPTY_CONVERSATION);
  /* B clearing their memory clears B's and the unowned copy, not A's. */
  conversation.saveConversation({ conversationId: null, turns: [{ id: 'b1', role: 'student', text: 'SYNTHETIC B', at: '2026-09-23T10:00:00.000Z' }] });
  conversation.clearLocalConversation();
  assert.equal(tabSession.getItem(conversation.conversationKey(B)), null);
  assert.equal(tabSession.getItem('ielts.mrez.conversation.v1'), null);
  assert.equal(conversation.loadConversation(A).turns.length, 2);

  /* The why-wrong cache is per owner too (proved in full in
     tests/test-session-owner.test.ts section 17). */
  const cache = reviewOwner.whyWrongCache(() => 'SYNTHETIC-key');
  cache.slot(NS_A, 'reading-full-006-drill-p2', 'q14', 'i').text = LATE_TEXT;
  assert.equal(cache.slot(NS_B, 'reading-full-006-drill-p2', 'q14', 'i').text, null);

  /* Anonymous owners get their own key, like every other store. */
  assert.notEqual(conversation.conversationKey(ANON), conversation.conversationKey(A));
});

test("the durable conversation is restored only for the student it belongs to", { timeout: 10_000 }, async () => {
  freshBrowser();
  conversationRows.set(A_SESSION.userId, {
    id: 'SYNTHETIC-conversation-A',
    messages: [{ id: 'm1', role: 'student', content: A_MESSAGE, created_at: '2026-09-23T09:00:00.000Z' }],
  });
  conversationRows.set(B_SESSION.userId, {
    id: 'SYNTHETIC-conversation-B',
    messages: [{ id: 'm2', role: 'student', content: 'SYNTHETIC question typed by student B', created_at: '2026-09-23T10:00:00.000Z' }],
  });

  const own = await conversation.restoreLatestConversation(A);
  assert.equal(own?.conversationId, 'SYNTHETIC-conversation-A');
  assert.equal(own?.turns[0]?.text, A_MESSAGE);

  /* Asked for A while the session is B's: nothing, not B's rows. */
  held = B_SESSION;
  assert.equal(await conversation.restoreLatestConversation(A), null);
  /* Asked for B, but the session changes hands while the rows are read. */
  duringRowsRead = () => {
    duringRowsRead = null;
    held = A_SESSION;
  };
  assert.equal(await conversation.restoreLatestConversation(B), null);
  /* An anonymous owner has no durable conversation. */
  assert.equal(await conversation.restoreLatestConversation(ANON), null);
});

/* ------------------------------------------------------------------ */
/* 7. The two review components still carry their student               */
/* ------------------------------------------------------------------ */

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SRC = new URL('../src/', import.meta.url);

async function source(relative: string): Promise<string> {
  return strip(await readFile(new URL(relative, SRC), 'utf8'));
}

test('the two review components still pass their student, and a review request goes out bound to that student', { timeout: 10_000 }, async () => {
  for (const file of ['components/tutor/AskWhyWrong.tsx', 'components/tutor/TestDebrief.tsx']) {
    const code = await source(file);
    assert.match(code, /await askTutor\(\s*\{[\s\S]*?\},\s*\{ owner \},\s*\);/, `${file} no longer names its student`);
    /* A refusal before sending leaves the review; a dropped reply does not
       leave it a second time. */
    assert.match(code, /if \(!err\.sent\) onOwnerChanged\?\.\(err\.now\);/, file);
  }

  freshBrowser();
  const got = await askTutor({ task: 'item', review: { testId: 'reading-full-006-drill-p2', items: [{ questionId: 'q14', given: 'i' }] } } as never, { owner: NS_A });
  assert.deepEqual(got, SYNTHETIC_REPLY);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.auth, `Bearer ${A_SESSION.token}`);
  /* A's own review with A's session gone: refused as a sign-out, so the
     review leaves the screen (R2E-02, unchanged). */
  held = null;
  assert.deepEqual(await ownerRefusal(askTutor({ task: 'debrief' } as never, { owner: NS_A })), { now: 'signed-out', sent: false });
  assert.equal(sent.length, 1);
});

/* ------------------------------------------------------------------ */
/* 8. Every caller goes through the binding                             */
/* ------------------------------------------------------------------ */

async function sourceFiles(dir: URL, out: URL[] = []): Promise<URL[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const url = new URL(encodeURIComponent(entry.name) + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) await sourceFiles(url, out);
    else if (/\.(ts|tsx|astro|mjs|js)$/.test(entry.name)) out.push(url);
  }
  return out;
}

test('source scan: every caller of the tutor client goes through the binding, and nothing reaches the tutor another way', { timeout: 10_000 }, async () => {
  const code = await source('lib/tutor/client.ts');

  /* send() binds first, before any token is read or anything is posted. */
  const sendAt = code.indexOf('async function send<');
  assert.ok(sendAt > 0, 'send() is gone');
  const sendBody = code.slice(sendAt, code.indexOf('export async function askTutor'));
  const bindAt = sendBody.indexOf('const binding = bindTutorRequest(options.owner);');
  assert.ok(bindAt > 0, 'send() no longer binds');
  assert.ok(bindAt < sendBody.indexOf('tokenForRequest(binding, readTutorSession)'), 'a token is read before the binding');
  assert.ok(bindAt < sendBody.indexOf('post<TReply>('), 'something is posted before the binding');
  /* Every attempt's outcome is checked, the retry is checked before it goes,
     and the reply is returned only after a check. */
  assert.match(sendBody, /binding\.check\(true\);\s*return reply;/);
  assert.match(sendBody, /binding\.check\(true\);\s*try \{\s*reply = await post<TReply>/);
  assert.match(sendBody, /\} catch \(err\) \{\s*binding\.check\(true\);/);
  assert.match(sendBody, /\} catch \(retryErr\) \{\s*binding\.check\(true\);\s*throw retryErr;/);
  assert.match(sendBody, /\} finally \{\s*binding\.release\(\);\s*\}/);

  /* The only posts are inside send(), and there is no unbound token path. */
  assert.equal([...code.matchAll(/function post</g)].length, 1);
  const posts = [...code.matchAll(/(?<!function )\bpost<TReply>\(/g)].map((m) => m.index!);
  assert.ok(posts.length >= 2);
  for (const at of posts) assert.ok(at > sendAt && at < sendAt + sendBody.length, 'a post outside send()');
  assert.doesNotMatch(code, /getAccessToken/, 'an unbound token path is back in the tutor client');
  assert.equal([...code.matchAll(/Authorization/g)].length, 1, 'a second authorised request in the tutor client');

  /* Every exported asking function goes through send(). */
  for (const name of ['askTutor', 'askLessonHelp', 'askPracticeEvaluation', 'askNextStepProposal']) {
    const at = code.search(new RegExp(`export (async )?function ${name}\\b`));
    assert.ok(at > 0, `${name} is gone`);
    const next = code.slice(at + 10).search(/\nexport /);
    const body = code.slice(at, next < 0 ? undefined : at + 10 + next);
    assert.match(body, /\bsend<[^>]+>\(/, `${name} does not go through send()`);
    assert.doesNotMatch(body, /\bpost</, `${name} posts around send()`);
  }

  /* Nobody else can reach the tutor: its address is read in one file, and no
     caller of the client fetches, or reads a token, on its own. */
  const files = await sourceFiles(SRC);
  const readers: string[] = [];
  const callers: string[] = [];
  for (const file of files) {
    const text = strip(await readFile(file, 'utf8'));
    const short = file.href.slice(file.href.indexOf('/src/') + 1);
    if (/PUBLIC_MR_EZ_URL/.test(text) && !short.endsWith('lib/tutor/client.ts')) readers.push(short);
    if (/from ['"][./]+(lib\/)?tutor\/client['"]/.test(text)) {
      callers.push(short);
      assert.doesNotMatch(text, /\bfetch\(|getAccessToken\(/, `${short} reaches the network around the tutor client`);
    }
  }
  assert.deepEqual(readers, [], 'the tutor address is read outside the tutor client');
  assert.ok(callers.length >= 10, `expected every tutor surface, found ${callers.join(', ')}`);

  /* The panel: one owner's conversation, saved under that owner, swapped on
     an owner change, and nothing that comes back for a previous owner is
     shown or saved. */
  const panel = await source('components/tutor/MrEzPanel.tsx');
  assert.match(panel, /saveConversation\(state, conversationOwner\)/);
  assert.match(panel, /onOwnerChange\(\(\) => \{[\s\S]*?epochRef\.current \+= 1;[\s\S]*?setState\(loadConversation\(now\)\);[\s\S]*?setDraft\(''\);/);
  assert.match(panel, /idempotencyKey: key,\s*\}\);\s*if \(epochRef\.current !== epoch\) return;/);
  assert.match(panel, /\} catch \(err\) \{\s*if \(epochRef\.current !== epoch\) return;/);
  assert.match(panel, /if \(epochRef\.current === epoch\) setBusy\(false\);/);
  assert.match(panel, /restoreLatestConversation\(binding\.owner\)[\s\S]*?if \(!remote \|\| !binding\.current\(\)\) return;/);

  /* The explanation card says nothing about a reply it was not given. */
  const explain = await source('components/tutor/ExplainResult.tsx');
  assert.match(explain, /if \(err instanceof TutorOwnerChangedError\) return;/);
});
