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

/* One import, and it points back at a module that imports this one. That
   cycle is deliberate and safe: `test-items.ts` needs `isRecord` and
   `sanitiseText` from here, and the request validator below needs that
   file's test-id rules so a review request is checked against exactly the
   ids the site actually publishes — one source of truth for both instead of
   a second copy of the regex living here. Neither module runs any of the
   other's code while it is still being evaluated (both contain only
   declarations at the top level), which is the condition under which an ES
   module cycle is well defined. Keep it that way: no top-level `const x =
   someFunctionFromTheOtherFile()` in either file. */
import { MAX_GIVEN_CHARS, MAX_REVIEW_ITEMS, isPublishedTestId, sourceTestId } from './test-items';
/* Type only, so nothing of the site's i18n layer (its lazy loader, its
   localStorage reads) is pulled into the Worker bundle. */
import type { Locale } from '../i18n/locale';

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

/** Widest time-zone offset accepted, in minutes east of UTC. Real zones run
    from UTC-12 to UTC+14; 840 is 14 hours, so both ends fit with nothing to
    spare for a client inventing one. */
export const MAX_TZ_OFFSET_MINUTES = 840;

/** How many units the course has (see COURSE_UNITS in src/lib/course.ts).
    Repeated here rather than imported because this file is the wire contract
    and must stay free of the curriculum: a unit id is validated for shape
    here and looked up for real by the Worker, which does read the course. */
export const COURSE_UNITS_TOTAL = 8;

/* ── Tasks ─────────────────────────────────────────────────────────────────
   One Worker, seven jobs. They share auth, limits, usage accounting and
   context building; they differ only in prompt and in which facts are
   counted for them.

   chat / welcome / explain   the original three
   weekly                     "here is how last week actually went"
   unit                       why a course unit matters, or that it is done
   debrief                    a whole set of wrong answers from one paper
   item                       one wrong answer, explained

   The last four are one-shot: no conversation row, no history, nothing
   appended. They are notes Mr EZ writes about something that happened, not
   a dialogue. */

/** Every task the Worker answers, as a runtime list as well as a type, so the
    request validator can never drift from the union. */
export const TUTOR_TASKS = ['chat', 'welcome', 'explain', 'weekly', 'unit', 'debrief', 'item'] as const;

export type TutorTask = (typeof TUTOR_TASKS)[number];

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

/** Which course unit a note is about, and which of the two notes it is: the
    "why this matters for you" written when the student opens the unit, or
    the "you finished it" written after the last lesson in it is ticked. Both
    are references: the unit's contents, and whether it is actually finished,
    are read here from the student's own record. */
export interface TutorUnitRef {
  unitId: number;
  kind: 'intro' | 'wrap';
}

/** One question the student got wrong, and what they put. The QUESTION is
    deliberately absent: its prompt, its accepted answer and its official
    explanation are fetched by the Worker from the site's own published test
    JSON and looked up by this id. A client that invents a prompt, an answer
    or an explanation is simply ignored, because none of those words are
    read from here. */
export interface TutorReviewItem {
  questionId: string;
  /** Exactly what the student typed or selected. An empty string is legal
      and means they left it blank, which is a real and different thing from
      getting it wrong. */
  given: string;
}

/** Points at a set of wrong answers inside one practice paper. */
export interface TutorReviewRef {
  /** A published test id, or a drill id borrowed from one (see
      sourceTestId). Normalised and checked before it ever reaches a URL. */
  testId: string;
  items: TutorReviewItem[];
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
  /** The student's own clock, in minutes EAST of UTC (so Almaty, UTC+5,
      sends 300). The Worker runs in UTC and `progress.activity` is keyed by
      the student's LOCAL calendar date, so without this a Monday-to-Sunday
      week would be cut in the wrong place for anyone outside UTC. It is a
      preference, not a fact about them: an out-of-range or non-integer value
      is dropped and treated as 0 rather than refused, because the worst it
      can do is move a week boundary by a few hours. */
  tzOffsetMinutes?: number;
  /** Required for task 'unit'. */
  unit?: TutorUnitRef;
  /** Required for 'debrief' (one to MAX_REVIEW_ITEMS questions) and for
      'item' (exactly one). */
  review?: TutorReviewRef;
  /** Which language Mr EZ answers in, and which language the sentences the
      Worker writes itself come back in. 'en' unless the request says 'ru'.

      This one field IS read from the browser, and that is not a hole in
      "the browser is not a source of truth". That rule is about FACTS and
      IDENTITY: whose record to load, what band they got, what they have
      finished. None of those can be named by a caller and none of them are
      here. A language is a display preference, the student sets it with the
      EN / RU switch on the page, and the worst a forged value can do is
      answer one request in the wrong language to the person who forged it.
      Nothing it can say changes what is true about them. */
  locale?: Locale;
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
  if (typeof task !== 'string' || !(TUTOR_TASKS as readonly string[]).includes(task)) {
    throw new TutorRequestError('bad-request', 'Unknown task.');
  }

  /* Locale is resolved to a concrete value here rather than left undefined,
     so no caller downstream has to decide what "no locale" means. Anything
     that is not exactly 'ru' becomes 'en': a display preference is never
     worth refusing a whole request over, and English is the fallback
     everywhere else in this codebase too. */
  const out: TutorRequest = { task: task as TutorTask, locale: raw.locale === 'ru' ? 'ru' : 'en' };

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

  /* The student's clock. Silently dropped rather than refused when it is not
     a whole number of minutes inside the real range of time zones, because a
     missing offset only shifts a week boundary by a few hours and refusing
     the whole request over it would be a worse outcome than a slightly
     wrong Monday. */
  if (
    typeof raw.tzOffsetMinutes === 'number' &&
    Number.isInteger(raw.tzOffsetMinutes) &&
    Math.abs(raw.tzOffsetMinutes) <= MAX_TZ_OFFSET_MINUTES
  ) {
    out.tzOffsetMinutes = raw.tzOffsetMinutes;
  }

  if (raw.unit !== undefined) {
    if (!isRecord(raw.unit)) throw new TutorRequestError('bad-request', 'unit must be an object.');
    const unitId = raw.unit.unitId;
    if (typeof unitId !== 'number' || !Number.isInteger(unitId) || unitId < 1 || unitId > COURSE_UNITS_TOTAL) {
      throw new TutorRequestError('bad-request', `unit.unitId must be a whole number from 1 to ${COURSE_UNITS_TOTAL}.`);
    }
    const kind = raw.unit.kind;
    if (kind !== 'intro' && kind !== 'wrap') {
      throw new TutorRequestError('bad-request', 'unit.kind must be intro or wrap.');
    }
    out.unit = { unitId, kind };
  }

  if (task === 'unit' && !out.unit) {
    throw new TutorRequestError('bad-request', 'A unit note needs which unit it is about.');
  }

  if (raw.review !== undefined) {
    if (!isRecord(raw.review)) throw new TutorRequestError('bad-request', 'review must be an object.');
    if (typeof raw.review.testId !== 'string') {
      throw new TutorRequestError('bad-request', 'review.testId must be a string.');
    }
    /* A drill borrows its source paper's question ids wholesale, so a review
       of a drill attempt is answered from the full paper's published file.
       Normalise first, then check: the result is about to become part of a
       URL path, and only ids this build actually publishes are allowed
       through. Anything else (a traversal attempt, a made-up skill, a
       different digit count) is a bad request here and never reaches a
       fetch. */
    const testId = sourceTestId(raw.review.testId);
    if (!isPublishedTestId(testId)) {
      throw new TutorRequestError('bad-request', 'review.testId is not a practice paper on this site.');
    }

    const rawItems = raw.review.items;
    if (!Array.isArray(rawItems)) throw new TutorRequestError('bad-request', 'review.items must be an array.');
    if (rawItems.length === 0) {
      throw new TutorRequestError('bad-request', 'review.items must name at least one question.');
    }
    // Refused, never quietly truncated: a client that sent 200 questions has
    // misunderstood something, and answering about a silently chosen 40 of
    // them would hide that.
    if (rawItems.length > MAX_REVIEW_ITEMS) {
      throw new TutorRequestError('bad-request', `review.items must name at most ${MAX_REVIEW_ITEMS} questions.`);
    }

    const items: TutorReviewItem[] = [];
    for (const entry of rawItems) {
      if (!isRecord(entry)) throw new TutorRequestError('bad-request', 'Each review item must be an object.');
      if (!isSafeId(entry.questionId)) {
        throw new TutorRequestError('bad-request', 'review.items[].questionId is malformed.');
      }
      if (typeof entry.given !== 'string') {
        throw new TutorRequestError('bad-request', 'review.items[].given must be a string.');
      }
      // Only these two fields are copied out. Anything else the client put
      // in the item (a prompt, an answer, an explanation) is dropped here
      // and can never reach the model.
      items.push({ questionId: entry.questionId, given: sanitiseText(entry.given, MAX_GIVEN_CHARS) });
    }
    out.review = { testId, items };
  }

  if (task === 'debrief' && !out.review) {
    throw new TutorRequestError('bad-request', 'A debrief needs which questions went wrong.');
  }
  if (task === 'item') {
    if (!out.review) throw new TutorRequestError('bad-request', 'Explaining one question needs which question.');
    if (out.review.items.length !== 1) {
      throw new TutorRequestError('bad-request', 'Explaining one question needs exactly one question.');
    }
  }

  if (raw.idempotencyKey !== undefined) {
    if (!isSafeId(raw.idempotencyKey)) throw new TutorRequestError('bad-request', 'idempotencyKey is malformed.');
    out.idempotencyKey = raw.idempotencyKey;
  }

  return out;
}
