/* The Workers' side of the trial: reserve before spending, settle after an
   answer, release after a failure.

   SHARED with the Workers only (mr-ez, grade-essay, grade-speaking). It calls
   the database functions in supabase/migrations/2026-09-23-trial.sql (and,
   for paid access, 2026-09-30-paid-access.sql) with the service role key,
   which only a Worker holds. The database decides; this
   file only asks it and turns its answer into a refusal a Worker can return.

   THE SECTION IS NEVER TAKEN FROM A LABEL. A tutor request names a lesson, a
   test or one of the student's own results; `tutorScope` works the section
   out from that reference and accepts only references the trial actually
   includes (its introductory lessons and its tests). A request that names
   nothing, or names something outside the trial, is refused. General chat is
   not a fifth bucket: the handoff leaves where dashboard chat belongs as an
   open decision, so it is refused here until that is settled. */

import { isTrialLesson, trialTestSection, type TrialSection } from './offer';

export type TrialRefusalCode =
  /** Free-account model (docs/paid-access/FREE-ACCOUNT-MODEL.md, 1 October
      2026): a signed-in account without paid or complimentary access asked
      for practice or guidance. Answered with HTTP 402 BEFORE any provider
      call, as { error, code: 'paid-required', reason: 'paid-required' }. */
  | 'paid-required'
  /** An allowance refusal from the database (reason says which). */
  | 'assessment-unavailable'
  /** Signed in, but no trial has been started on this account. */
  | 'trial-required'
  /** The trial's 72 hours are over; nothing new starts. */
  | 'trial-ended'
  /** This section's five Mr EZ messages are used. */
  | 'trial-allowance-used'
  /** The request is about something the trial does not include. */
  | 'trial-not-included'
  /** This section's one test has been used, or a different one is begun. */
  | 'trial-test-used'
  /** No begun trial test matches what was submitted. */
  | 'trial-no-test'
  /** The same request or test is being answered right now. */
  | 'trial-in-flight'
  /** Both interviews allowed under the Speaking test have been started. */
  | 'trial-sessions-used';

/** What an assessment refusal adds for the screens (review of 1 October
    2026): which allowance, and how much of it is used. */
export interface RefusalDetails {
  kind?: string;
  purpose?: string;
  used?: number;
  limit?: number;
}

export class TrialRefusal extends Error {
  readonly code: TrialRefusalCode;
  /** The database's own reason, for `assessment-unavailable` refusals:
      allowance-used | mock-allowance-used | placement-used | trial-ended |
      daily-limit | paid-required | already-requested | unknown-session. */
  readonly reason?: string;
  readonly details?: RefusalDetails;
  constructor(code: TrialRefusalCode, message: string, reason?: string, details?: RefusalDetails) {
    super(message);
    this.code = code;
    this.name = 'TrialRefusal';
    if (reason) this.reason = reason;
    if (details) this.details = details;
  }
}

/** The JSON body every Worker returns for a refusal: the message, the code,
    and for an assessment refusal its reason and numbers. */
export function refusalBody(err: TrialRefusal): Record<string, unknown> {
  return {
    error: err.message,
    code: err.code,
    ...(err.reason ? { reason: err.reason } : {}),
    ...(err.details ?? {}),
  };
}

/** The database could not be asked. Workers fail CLOSED on this: an
    allowance that cannot be checked is not a reason to spend. */
export class TrialServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TrialServiceError';
  }
}

/** The paid-required sentence, in both languages (the Russian is also in
    src/lib/i18n/dict/ru/g-free.ts, so a screen's t(error) finds it). The
    Workers send the English as `error`; the site normally opens its upgrade
    pop-up from the code instead of showing either. */
export const PAID_REQUIRED_TEXT = {
  en: 'Practice and personal guidance come with paid access. Every lesson stays free with your account.',
  ru: 'Практика и личное сопровождение доступны с оплатой. Все уроки остаются бесплатными в вашем аккаунте.',
} as const;

export const TRIAL_REFUSAL_TEXT: Record<TrialRefusalCode, string> = {
  'paid-required': PAID_REQUIRED_TEXT.en,
  'assessment-unavailable': 'Your assessment allowance is unavailable.',
  'trial-required': 'Start your free trial to use this.',
  'trial-ended': 'Your trial has ended. New lessons, tests and Mr EZ replies are locked.',
  'trial-allowance-used': 'You have used your five Mr EZ messages for this section.',
  'trial-not-included': 'This is not included in your trial.',
  'trial-test-used': 'You have used this section’s trial test.',
  'trial-no-test': 'Start this section’s trial test before submitting it.',
  'trial-in-flight': 'This is already being answered. Give it a moment.',
  'trial-sessions-used': 'Both interviews for your trial Speaking test have been started.',
};

export function refusal(code: TrialRefusalCode): TrialRefusal {
  return new TrialRefusal(code, TRIAL_REFUSAL_TEXT[code]);
}

/* ── Calling the database ─────────────────────────────────────────────── */

export type TrialRpc = (fn: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;

/** How long a Worker waits for the database before it refuses (review P2-5,
    1 October 2026). Every allowance check happens before an AI call, so a
    database that hangs must not hold the student's request open: after this
    the Worker fails CLOSED with its plain "could not be checked" answer. */
export const SERVICE_RPC_TIMEOUT_MS = 8000;

/** PostgREST's /rest/v1/rpc/<fn> with the service role key. Gives up after
    `timeoutMs` (the request is aborted, and the answer is not waited for
    even if the network ignores the abort). */
export function serviceRpc(fetchFn: typeof fetch, supabaseUrl: string, serviceKey: string, timeoutMs = SERVICE_RPC_TIMEOUT_MS): TrialRpc {
  return async (fn, args) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new TrialServiceError(`trial: ${fn} timed out`));
      }, timeoutMs);
    });
    try {
      let resp: Response;
      try {
        resp = await Promise.race([
          fetchFn(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
            method: 'POST',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(args),
            signal: controller.signal,
          }),
          timedOut,
        ]);
      } catch (err) {
        if (err instanceof TrialServiceError) throw err;
        throw new TrialServiceError(`trial: ${fn} unreachable`);
      }
      if (!resp.ok) throw new TrialServiceError(`trial: ${fn} answered ${resp.status}`);
      let body: unknown;
      try {
        body = await Promise.race([resp.json(), timedOut]);
      } catch (err) {
        if (err instanceof TrialServiceError) throw err;
        throw new TrialServiceError(`trial: ${fn} answered unreadably`);
      }
      return checkObject(fn, body);
    } finally {
      clearTimeout(timer);
    }
  };
}

function checkObject(fn: string, body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new TrialServiceError(`trial: ${fn} answered with no object`);
  }
  return body as Record<string, unknown>;
}

const REASON_TO_CODE: Record<string, TrialRefusalCode> = {
  /* The trial is retired (2026-10-01-free-account.sql): its functions
     answer this, and nothing is spent. */
  'trial-retired': 'paid-required',
  'paid-required': 'paid-required',
  'trial-required': 'trial-required',
  'trial-ended': 'trial-ended',
  'allowance-used': 'trial-allowance-used',
  'in-flight': 'trial-in-flight',
  'test-used': 'trial-test-used',
  'no-test': 'trial-no-test',
  'sessions-used': 'trial-sessions-used',
};

function refuseFrom(result: Record<string, unknown>): never {
  const code = REASON_TO_CODE[String(result.reason ?? '')];
  if (!code) throw new TrialServiceError(`trial: unexpected refusal ${String(result.reason)}`);
  if (code === 'paid-required') throw paidRequired();
  throw refusal(code);
}

/* ── Paid access ──────────────────────────────────────────────────────── */

/** A paid-required refusal, the same body from every Worker. */
export function paidRequired(): TrialRefusal {
  return new TrialRefusal('paid-required', PAID_REQUIRED_TEXT.en, 'paid-required');
}

/** The HTTP status for a refusal: 402 for paid-required, 409 for a request
    already being answered, 403 for everything else. */
export function refusalStatus(err: TrialRefusal): number {
  if (err.code === 'paid-required') return 402;
  if (err.code === 'trial-in-flight') return 409;
  return 403;
}

/** The free-account model's one rule for the AI Workers in commercial mode:
    paid or complimentary access running right now, or a paid-required
    refusal, asked BEFORE anything is reserved or any provider is called.
    Throws TrialRefusal or TrialServiceError (fail closed). */
export async function requirePaidAccess(rpc: TrialRpc, userId: string): Promise<void> {
  if (!(await paidAccessRunning(rpc, userId))) throw paidRequired();
}

/** Whether the account's paid access is running right now, by the
    database's clock (`access_paid_now` in
    supabase/migrations/2026-09-30-paid-access.sql). Asked FIRST by every
    trial check: a running grant skips the trial's allowances, and the Worker
    then applies only its existing per-student daily limits (Alex, 29
    September 2026: paid use is "unlimited, fair daily caps", and the
    existing limits are those caps). A complimentary grant counts exactly
    like a paid one (2026-10-01-free-account.sql). When it ends this
    answers false and the account is a free one again. Throws TrialServiceError when the database cannot be asked:
    the caller fails closed, it never assumes either answer. */
export async function paidAccessRunning(rpc: TrialRpc, userId: string): Promise<boolean> {
  const result = await rpc('access_paid_now', { p_user: userId });
  if (typeof result.paid !== 'boolean') throw new TrialServiceError('trial: access_paid_now answered unreadably');
  return result.paid;
}

/* ── Mr EZ ────────────────────────────────────────────────────────────── */

/** What a tutor request is about, as the parts of it that can carry a
    reference. Every field is already validated by the request parser. */
export interface TutorScopeInput {
  task: string;
  place?: { lessonKey?: string; testId?: string };
  attempt?: { kind: string; testId?: string };
  review?: { testId: string };
  /** The learning task 'lesson-help' names its lesson here. */
  lessonKey?: string;
}

export interface TutorScope {
  section: TrialSection;
  /** What the message is recorded against, e.g. 'lesson:reading-paraphrase'. */
  activityId: string;
}

/** The section a tutor request is charged to, or null when the trial does
    not include what it is about. Worked out from references, never from a
    section name, so there is no field a student can relabel. */
export function tutorScope(req: TutorScopeInput): TutorScope | null {
  const lesson = (key: string | undefined): TutorScope | null => {
    if (!key || !isTrialLesson(key)) return null;
    return { section: key.split('-')[0] as TrialSection, activityId: `lesson:${key}` };
  };
  const test = (testId: string | undefined): TutorScope | null => {
    const section = testId ? trialTestSection(testId) : null;
    return section ? { section, activityId: `test:${testId}` } : null;
  };

  switch (req.task) {
    case 'chat':
      return lesson(req.place?.lessonKey) ?? test(req.place?.testId);
    case 'explain':
      if (req.attempt?.kind === 'writing') return { section: 'writing', activityId: 'result:writing' };
      if (req.attempt?.kind === 'speaking') return { section: 'speaking', activityId: 'result:speaking' };
      return test(req.attempt?.testId);
    case 'debrief':
    case 'item':
      return test(req.review?.testId);
    case 'lesson-help':
      return lesson(req.lessonKey);
    /* welcome, weekly, unit, propose-next and evaluate-practice are not part
       of the approved trial. The site shows its deterministic guidance there
       instead, with no AI involved. */
    default:
      return null;
  }
}

export interface Reservation {
  /** This exact request was already answered and counted: serve the stored
      answer and charge nothing again. */
  replay: boolean;
  used: number;
  limit: number;
}

/** Reserves one message in `scope.section` under `requestId`, before any
    money is spent. Throws TrialRefusal or TrialServiceError. */
export async function reserveTutorMessage(
  rpc: TrialRpc,
  userId: string,
  scope: TutorScope,
  requestId: string,
): Promise<Reservation> {
  const result = await rpc('trial_tutor_reserve', {
    p_user: userId,
    p_section: scope.section,
    p_request: requestId,
    p_activity: scope.activityId,
  });
  if (result.ok !== true) refuseFrom(result);
  return {
    replay: result.replay === true,
    used: typeof result.used === 'number' ? result.used : 0,
    limit: typeof result.limit === 'number' ? result.limit : 5,
  };
}

/** Counts a reserved message or a leased test as used. */
export async function settleUse(rpc: TrialRpc, userId: string, kind: 'tutor' | 'test', requestId: string): Promise<void> {
  await rpc('trial_usage_settle', { p_user: userId, p_kind: kind, p_request: requestId });
}

/** Gives a failed message back, or drops a test's grading lease so it can be
    submitted again. A settled row is never touched by the database. */
export async function releaseUse(rpc: TrialRpc, userId: string, kind: 'tutor' | 'test', requestId: string): Promise<void> {
  await rpc('trial_usage_release', { p_user: userId, p_kind: kind, p_request: requestId });
}

/* ── The Writing and Speaking tests ───────────────────────────────────── */

const SITTING_RE = /^[A-Za-z0-9_:-]{8,128}$/;

/** A trial sitting id from a grading request, or null when absent or
    malformed. */
export function readSittingId(raw: unknown): string | null {
  return typeof raw === 'string' && SITTING_RE.test(raw) ? raw : null;
}

/** Takes the grading lease on the student's begun `section` test before a
    grader spends anything. Throws TrialRefusal or TrialServiceError. */
export async function leaseTrialTest(rpc: TrialRpc, userId: string, section: TrialSection, sittingId: string): Promise<void> {
  const result = await rpc('trial_test_lease', { p_user: userId, p_section: section, p_request: sittingId });
  if (result.ok !== true) refuseFrom(result);
}

/* ── The Speaking test's live interview ───────────────────────────────── */

/** Counts one live interview under the student's begun Speaking test, before
    the voice session is opened (at most two per test). Throws TrialRefusal
    or TrialServiceError. */
export async function startSpeakingSession(rpc: TrialRpc, userId: string, sittingId: string): Promise<void> {
  const result = await rpc('trial_speaking_session_start', { p_user: userId, p_request: sittingId });
  if (result.ok !== true) refuseFrom(result);
}

/** Gives the count back when the voice session never opened. */
/** True when an interview was actually given back (the sitting is this
    student's reserved Speaking test and had one counted). */
export async function releaseSpeakingSession(rpc: TrialRpc, userId: string, sittingId: string): Promise<boolean> {
  const result = await rpc('trial_speaking_session_release', { p_user: userId, p_request: sittingId });
  return result.ok === true;
}

/** Verifies a Supabase access token and returns its user id, or null. The
    graders use this in trial mode; Mr EZ has its own copy of the same call. */
export async function verifyAccessToken(
  fetchFn: typeof fetch,
  supabaseUrl: string,
  serviceKey: string,
  token: string,
): Promise<string | null> {
  let resp: Response;
  try {
    resp = await fetchFn(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new TrialServiceError('trial: auth unreachable');
  }
  if (resp.status === 401 || resp.status === 403) return null;
  if (!resp.ok) throw new TrialServiceError(`trial: auth answered ${resp.status}`);
  const user = (await resp.json().catch(() => null)) as { id?: unknown } | null;
  return user && typeof user.id === 'string' ? user.id : null;
}

/** The bearer token on a request, or null. */
export function bearer(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}
