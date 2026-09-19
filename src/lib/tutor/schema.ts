/* Mr EZ — the wire contract between the site and the tutor Worker, plus the
   shapes the Worker builds internally.

   Imported by BOTH sides (the browser client in src/lib/tutor/client.ts and
   workers/mr-ez/src/index.ts) exactly like the live examiner shares
   src/lib/speaking/live/instructions.ts with its Worker, so the two can
   never drift apart.

   The guiding rule of this whole subsystem: the BROWSER IS NOT A SOURCE OF
   TRUTH. A request carries only what the server cannot work out for itself
   (which page the student is on, what they typed, which conversation this
   belongs to). Everything about the student — their goals, their results,
   their weaknesses — the Worker reads itself from Supabase against the
   verified user id. A modified client can change what it asks; it cannot
   change whose data it is asked about, and it cannot hand the model a
   fabricated band. */

/* ── Limits ────────────────────────────────────────────────────────────────
   Deliberately shared so the UI can refuse over-long input before spending a
   round trip, and the Worker can refuse it again because the UI is not to be
   trusted. Every one of these is re-checked server-side. */

/** Longest single student message, in characters. Roughly 500 words — long
    enough to paste a paragraph of their own writing and ask about it,
    short enough that a pasted novel cannot run up a bill. */
export const MAX_MESSAGE_CHARS = 2000;

/** Longest whole request body the Worker will even read, in bytes. */
export const MAX_BODY_BYTES = 32 * 1024;

/** How many earlier turns travel with a request. Older turns are replaced by
    a rolling summary (see `summary` below) rather than re-sent forever,
    which is what keeps a long conversation from costing more every turn. */
export const MAX_HISTORY_TURNS = 8;

/** Cap on the model's reply, in tokens. A tutor answer that runs longer than
    this is not being concise, which is a personality requirement as much as
    a cost one. */
export const MAX_OUTPUT_TOKENS = 700;

/** Longest stored conversation summary, in characters. */
export const MAX_SUMMARY_CHARS = 1200;

/* ── Tasks ─────────────────────────────────────────────────────────────────
   One Worker, three jobs. They share auth, limits, usage accounting and
   context building; they differ only in prompt and output shape. */

export type TutorTask = 'chat' | 'welcome' | 'explain';

/* ── What the browser sends ────────────────────────────────────────────── */

/** Where the student is standing when they ask. Every field is a *reference*,
    never prose: a lesson key, a test id, an attempt timestamp. The Worker
    resolves each one against the real catalogue or the student's own stored
    records and silently drops anything that does not resolve, so a client
    cannot smuggle instructions in through "context". */
export interface TutorPlace {
  /** A lesson's progress key, e.g. 'reading-tfng'. */
  lessonKey?: string;
  /** A practice test id from src/data/tests. */
  testId?: string;
  /** Route the student is on, for wording only ('/trainers/writing'). */
  route?: string;
  /** True while a timed assessment is actually running. Switches Mr EZ into
      invigilator mode: he will not give answers or hints about the paper in
      front of the student. */
  underExam?: boolean;
}

/** Points at one graded attempt the student already owns, so "explain this
    result" re-uses the grading that was already paid for. The Worker looks
    the attempt up inside the student's own synced progress by its `at`
    timestamp — which is why this is a pointer and not a payload. */
export interface TutorAttemptRef {
  kind: 'writing' | 'speaking' | 'test';
  /** ISO datetime of the attempt — its identity in ProgressV1. */
  at: string;
  /** Writing only: which prompt the attempt belongs to. */
  promptId?: string;
  /** Test only: which test the attempt belongs to. */
  testId?: string;
}

export interface TutorTurn {
  role: 'student' | 'tutor';
  text: string;
}

export interface TutorRequest {
  task: TutorTask;
  /** Conversation this turn belongs to. The Worker checks the conversation
      is owned by the verified caller before reading or appending to it. */
  conversationId?: string;
  /** The student's message. Required for 'chat'. */
  message?: string;
  place?: TutorPlace;
  attempt?: TutorAttemptRef;
  /** Repeat-send guard. The Worker returns the first reply for a given key
      instead of paying for a second one (double-click, flaky network retry,
      React StrictMode double-invoke). */
  idempotencyKey?: string;
}

/* ── What comes back ───────────────────────────────────────────────────── */

/** A single recommendation. `href` is always chosen in code from the real
    catalogue (see recommend.ts) — the model never writes a link, only the
    reason. That is the difference between grounded advice and a plausible
    404. */
export interface TutorRecommendation {
  /** Stable id of the activity, e.g. 'lesson:reading-tfng'. */
  id: string;
  label: string;
  /** Unprefixed internal path; the client applies withBase(). */
  href: string;
  /** Why this, in Mr EZ's voice. Written by the model, or by the
      deterministic fallback when the model is unavailable. */
  reason: string;
  /** Rough minutes, when the catalogue entry knows. */
  minutes?: number;
}

/** The tutor character's visual states. Every one is tied to a real
    interface event (see src/lib/tutor/avatar.ts), never to a guess: idle is
    the resting pose, thinking is shown only while a request is in flight,
    explaining and encouraging come back from the server with the reply so
    the face always matches what was actually said, and unavailable is shown
    when the tutor cannot be reached at all. */
export type TutorMood = 'idle' | 'thinking' | 'explaining' | 'encouraging' | 'celebrating' | 'unavailable';

export interface TutorReply {
  task: TutorTask;
  conversationId: string;
  /** Mr EZ's prose. Plain text with simple paragraph breaks — never HTML,
      so nothing the model writes can be injected into the page. */
  text: string;
  /** Present on 'welcome', and on 'chat'/'explain' when a next step is
      genuinely warranted. */
  recommendation?: TutorRecommendation | null;
  /** Which face to show. Chosen server-side so the artwork always matches
      what he actually said. */
  mood: TutorMood;
  /** True when a real model produced this. False means a clearly-labelled
      simulated reply (local development) and the UI must say so. */
  live: boolean;
  /** Model id that answered, or 'simulated'. Shown in the panel's details. */
  model: string;
  /** Whether this reply was served from a cache rather than freshly
      generated — the "don't pay twice for the same dashboard" path. */
  cached?: boolean;
  /** What this turn cost and how much headroom is left today. */
  usage?: TutorUsage;
}

export interface TutorUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  /** US dollars, computed from the configured per-million rates. */
  costUsd: number;
  /** Turns already used today, and the cap. */
  turnsToday: number;
  turnsPerDay: number;
}

/** Everything the Worker refuses for, as a machine-readable code so the UI
    can show the right state rather than a raw sentence. */
export type TutorErrorCode =
  | 'not-configured' // no Worker URL on this build
  | 'sign-in-required' // no valid Supabase token
  | 'limit-reached' // per-student daily cap
  | 'site-limit-reached' // whole-site daily cap
  | 'too-long' // message or body over the cap
  | 'bad-request'
  | 'not-found' // conversation or attempt isn't theirs / doesn't exist
  | 'unavailable' // upstream model or database down
  | 'busy'; // upstream rate limit, worth retrying

export interface TutorError {
  error: string;
  code: TutorErrorCode;
  /** Seconds to wait before a retry is worth attempting, when known. */
  retryAfter?: number;
}

/* ── Guards ────────────────────────────────────────────────────────────────
   Used by the Worker on every request. Kept here rather than in the Worker
   so the same rules can be unit-tested and so the client can pre-empt the
   obvious ones. */

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Ids and keys we accept from a client: conservative on purpose, so an id
    can never carry punctuation that would change how the prompt reads. */
const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_:-]{0,79}$/;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function isSafeId(v: unknown): v is string {
  return typeof v === 'string' && SAFE_ID_RE.test(v);
}

export function isIsoDateTime(v: unknown): v is string {
  return typeof v === 'string' && ISO_RE.test(v) && !Number.isNaN(Date.parse(v));
}

/** Strips the control characters that would let text escape the delimited
    block it is rendered into, and collapses runaway blank lines. Does NOT
    try to detect "malicious" wording — that is handled by never giving the
    model authority over anything, not by filtering prose. */
export function sanitiseText(raw: string, maxChars: number): string {
  return raw
    .replace(/[ --]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxChars);
}

export class TutorRequestError extends Error {
  /* Declared and assigned rather than written as a constructor parameter
     property: the test runner loads these files through Node's strip-only
     TypeScript mode, which supports type annotations but not syntax that
     emits code, and a parameter property emits an assignment. */
  readonly code: TutorErrorCode;

  constructor(code: TutorErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'TutorRequestError';
  }
}

/** Parses and validates an untrusted request body into a TutorRequest.
    Throws TutorRequestError with a code the caller maps to an HTTP status.
    Unknown fields are dropped rather than passed through. */
export function parseTutorRequest(raw: unknown): TutorRequest {
  if (!isRecord(raw)) throw new TutorRequestError('bad-request', 'Request body must be a JSON object.');

  const task = raw.task;
  if (task !== 'chat' && task !== 'welcome' && task !== 'explain') {
    throw new TutorRequestError('bad-request', 'Unknown task.');
  }

  const out: TutorRequest = { task };

  if (raw.conversationId !== undefined) {
    if (!isUuid(raw.conversationId)) throw new TutorRequestError('bad-request', 'conversationId must be a uuid.');
    out.conversationId = raw.conversationId;
  }

  if (task === 'chat') {
    if (typeof raw.message !== 'string') throw new TutorRequestError('bad-request', 'A message is required.');
    if (raw.message.length > MAX_MESSAGE_CHARS) {
      throw new TutorRequestError('too-long', `Keep it under ${MAX_MESSAGE_CHARS} characters so Mr EZ can answer properly.`);
    }
    const message = sanitiseText(raw.message, MAX_MESSAGE_CHARS);
    if (!message) throw new TutorRequestError('bad-request', 'A message is required.');
    out.message = message;
  }

  if (raw.place !== undefined) {
    if (!isRecord(raw.place)) throw new TutorRequestError('bad-request', 'place must be an object.');
    const place: TutorPlace = {};
    if (isSafeId(raw.place.lessonKey)) place.lessonKey = raw.place.lessonKey;
    if (isSafeId(raw.place.testId)) place.testId = raw.place.testId;
    if (typeof raw.place.route === 'string' && /^\/[A-Za-z0-9/_-]{0,80}$/.test(raw.place.route)) {
      place.route = raw.place.route;
    }
    if (raw.place.underExam === true) place.underExam = true;
    out.place = place;
  }

  if (raw.attempt !== undefined) {
    if (!isRecord(raw.attempt)) throw new TutorRequestError('bad-request', 'attempt must be an object.');
    const kind = raw.attempt.kind;
    if (kind !== 'writing' && kind !== 'speaking' && kind !== 'test') {
      throw new TutorRequestError('bad-request', 'attempt.kind must be writing, speaking or test.');
    }
    if (!isIsoDateTime(raw.attempt.at)) throw new TutorRequestError('bad-request', 'attempt.at must be an ISO datetime.');
    const attempt: TutorAttemptRef = { kind, at: raw.attempt.at };
    if (isSafeId(raw.attempt.promptId)) attempt.promptId = raw.attempt.promptId;
    if (isSafeId(raw.attempt.testId)) attempt.testId = raw.attempt.testId;
    out.attempt = attempt;
  }

  if (task === 'explain' && !out.attempt) {
    throw new TutorRequestError('bad-request', 'Explaining a result needs which result to explain.');
  }

  if (raw.idempotencyKey !== undefined) {
    if (!isSafeId(raw.idempotencyKey)) throw new TutorRequestError('bad-request', 'idempotencyKey is malformed.');
    out.idempotencyKey = raw.idempotencyKey;
  }

  return out;
}
