/* Browser side of Mr EZ: one function that asks, and honest failure states.

   Gated on PUBLIC_MR_EZ_URL exactly like the graders are gated on
   PUBLIC_GRADER_URL. Unset means the tutor is not part of this build, the
   panel says so plainly, and the dashboard falls back to the deterministic
   recommendation (src/lib/tutor/local.ts) rather than showing nothing.

   Every request carries an idempotency key, and a retry re-uses the SAME
   key. That is the point: a retry after a timeout must not be able to buy a
   second answer. The key is generated once per user action, not per
   attempt. */

import { getAccessToken } from '../auth/session';
import { isAuthConfigured } from '../auth/supabase';
import { t } from '../i18n/translate';
import { getLocale, type Locale } from '../i18n/locale';
import { tutorErrorMessage } from './errors';
import {
  MAX_MESSAGE_CHARS,
  type EvaluatePracticeWireReply,
  type EvaluatePracticeWireRequest,
  type LearningAiRequest,
  type LessonHelpWireReply,
  type LessonHelpWireRequest,
  type ProposeNextWireReply,
  type ProposeNextWireRequest,
  type TutorErrorCode,
  type TutorReply,
  type TutorRequest,
} from './schema';

const TUTOR_URL: string | undefined = import.meta.env?.PUBLIC_MR_EZ_URL;

export class TutorClientError extends Error {
  /* Plain fields, not constructor parameter properties: see the same note on
     TutorRequestError in ./schema.ts. */
  readonly code: TutorErrorCode;
  readonly retryAfter?: number;

  constructor(code: TutorErrorCode, message: string, retryAfter?: number) {
    super(message);
    this.code = code;
    this.retryAfter = retryAfter;
    this.name = 'TutorClientError';
  }
}

/** Whether a tutor Worker is wired up on this build at all, so the UI can
    decide up front instead of letting a student type a question and only
    then discover there is nobody to answer it. */
export function isTutorConfigured(): boolean {
  return Boolean(TUTOR_URL) && isAuthConfigured();
}

/** Why the tutor is unavailable, when it is — used for the one-line notice
    in the panel rather than a generic shrug. */
export function tutorUnavailableReason(): string | null {
  if (!TUTOR_URL) return t('Mr EZ is not switched on for this build yet.');
  if (!isAuthConfigured()) return t('Mr EZ needs accounts to be configured, because he only ever reads your own record.');
  return null;
}

export interface TutorConfig {
  model: string;
  live: boolean;
  requiresSignIn: boolean;
  /** The conversation allowance: questions, the welcome, the notes, the
      reviews and plan proposals. */
  turnsPerDay: number;
  /** The separate allowance for contextual lesson help and focused practice
      evaluation (lead decision Q3). Optional because a Worker deployed
      before the learning tasks existed does not report it. */
  helpPerDay?: number;
  configured: boolean;
}

/** One cheap, unauthenticated probe so the UI can show the model and the
    daily allowance without spending a turn. Cached for the page's lifetime. */
let configPromise: Promise<TutorConfig | null> | null = null;
export function getTutorConfig(): Promise<TutorConfig | null> {
  if (!TUTOR_URL) return Promise.resolve(null);
  configPromise ??= fetch(TUTOR_URL, { signal: AbortSignal.timeout(8000) })
    .then((r) => (r.ok ? (r.json() as Promise<TutorConfig>) : null))
    .catch(() => null);
  return configPromise;
}

/** A key for one user action. Stable across retries of that action. */
export function newIdempotencyKey(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return random.replace(/[^A-Za-z0-9-]/g, '').slice(0, 60);
}

interface AskOptions {
  signal?: AbortSignal;
  /** Retry once, automatically, on a transient failure. Default true. */
  retry?: boolean;
}

async function post<TReply>(url: string, token: string, req: unknown, signal?: AbortSignal): Promise<TReply> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(req),
      signal: signal ?? AbortSignal.timeout(60000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError' && signal?.aborted) throw err;
    throw new TutorClientError('unavailable', t('Mr EZ could not be reached. Check your connection and try again.'));
  }

  if (!resp.ok) {
    let code: TutorErrorCode = 'unavailable';
    let fromWorker: string | null = null;
    let retryAfter: number | undefined;
    try {
      const body = (await resp.json()) as { error?: string; code?: TutorErrorCode; retryAfter?: number };
      if (body.code) code = body.code;
      if (body.error) fromWorker = body.error;
      retryAfter = body.retryAfter;
    } catch {
      /* a non-JSON error body still gets a sensible code below */
    }
    if (resp.status === 401) code = 'sign-in-required';
    /* Ours first, the Worker's English only for a code we have no wording
       of our own for. See src/lib/tutor/errors.ts for why that way round. */
    const message = tutorErrorMessage(code) ?? fromWorker ?? t('Mr EZ could not answer just now.');
    throw new TutorClientError(code, message, retryAfter);
  }

  return (await resp.json()) as TReply;
}

/** Sign in, stamp the language and the repeat-send key, send, and retry a
    transient failure exactly once with the SAME key. Shared by the tutor
    tasks and the three learning ones, so a retry can never buy a second
    answer on any of them. */
async function send<TRequest extends { locale?: Locale; idempotencyKey?: string }, TReply>(
  req: TRequest,
  options: AskOptions,
): Promise<TReply> {
  if (!TUTOR_URL) throw new TutorClientError('not-configured', t('Mr EZ is not switched on for this build yet.'));

  const token = await getAccessToken();
  if (!token) throw new TutorClientError('sign-in-required', t('Sign in and Mr EZ can see your own results.'));

  const withKey = {
    ...req,
    locale: req.locale ?? getLocale(),
    idempotencyKey: req.idempotencyKey ?? newIdempotencyKey(),
  };

  try {
    return await post<TReply>(TUTOR_URL, token, withKey, options.signal);
  } catch (err) {
    const transient = err instanceof TutorClientError && (err.code === 'busy' || err.code === 'unavailable');
    if (!transient || options.retry === false || options.signal?.aborted) throw err;
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (options.signal?.aborted) throw err;
    return post<TReply>(TUTOR_URL, token, withKey, options.signal);
  }
}

/** Ask Mr EZ. Throws TutorClientError with a code the UI maps to a state:
    sign in, limit reached, temporarily unavailable, and so on. */
export async function askTutor(req: TutorRequest, options: AskOptions = {}): Promise<TutorReply> {
  if (!TUTOR_URL) throw new TutorClientError('not-configured', t('Mr EZ is not switched on for this build yet.'));
  if (req.message && req.message.length > MAX_MESSAGE_CHARS) {
    throw new TutorClientError(
      'too-long',
      t('That is a bit long. Keep it under {max} characters.', { max: MAX_MESSAGE_CHARS }),
    );
  }

  /* The key is generated once per user action inside send(), so the retry
     in there cannot buy a second answer. The locale rides along for the same
     reason it is on the request at all: the Worker has no other way to know
     which language to answer in, and a display preference is the one thing
     the browser genuinely does own (see the comment on TutorRequest.locale
     in ./schema.ts). */
  return send<TutorRequest, TutorReply>(req, options);
}

/* ── The three learning tasks ──────────────────────────────────────────────
   Same endpoint, same sign-in, same repeat-send key, same single retry.
   What each one may carry is REFERENCES: which lesson, which block, which
   item, which activity, and the versions the request was made against. The
   lesson text, the question, the accepted answer, the objective and the
   eligible shortlist are all worked out by the Worker, so there is nothing
   a surface here has to look up and nothing it could get wrong.

   `versions` is not optional and is not a formality. A reply written against
   a plan revision or an evidence version that has since moved is refused by
   the Worker rather than acted on, which is what stops a slow answer from
   changing what a student is doing after they have already moved on. Take
   them from the current session, never from memory. */

/** Everything a caller supplies. The task name is added here, and the
    language and the repeat-send key are stamped on by send(). */
export type LessonHelpAsk = Omit<LessonHelpWireRequest, 'task'>;
export type PracticeEvaluationAsk = Omit<EvaluatePracticeWireRequest, 'task'>;
export type NextStepProposalAsk = Omit<ProposeNextWireRequest, 'task'>;

/** Explain, hint or example at one exact teaching point.
 *
 *  The level asked for is not always the level given: an explanation before
 *  the student has attempted anything comes back as a hint. Read `kind` on
 *  the reply, not the one you sent, and write `assistanceAfter` into the
 *  evidence event so an assisted answer can never later read as independent.
 *
 *  Never call this on render, on a timer or on navigation. It is a response
 *  to the student pressing something. */
export function askLessonHelp(ask: LessonHelpAsk, options: AskOptions = {}): Promise<LessonHelpWireReply> {
  return send<LearningAiRequest, LessonHelpWireReply>({ task: 'lesson-help', ...ask }, options);
}

/** Judge one short piece of focused practice against its one objective.
 *
 *  `judged: false` means nothing looked at it (AI off, over the cap,
 *  unreachable, or a reply that failed validation). The verdict beside it is
 *  not a verdict and must not be shown as one. Nothing here is ever a band:
 *  a full essay goes to the calibrated writing grader instead, and a
 *  submission over MAX_PRACTICE_SUBMISSION_CHARS is refused with
 *  `too-long`. */
export function askPracticeEvaluation(
  ask: PracticeEvaluationAsk,
  options: AskOptions = {},
): Promise<EvaluatePracticeWireReply> {
  return send<LearningAiRequest, EvaluatePracticeWireReply>({ task: 'evaluate-practice', ...ask }, options);
}

/** Ask for one next activity from the planner's shortlist, with a reason.
 *
 *  `accepted: false` is the normal, safe outcome, not an error: the model
 *  proposed something that did not survive validation and the plan's own
 *  choice stands. Show `recommendation`, and write `disagreement` into the
 *  plan's history when there is one, because that record is the reviewable
 *  material, not the reply. */
export function askNextStepProposal(
  ask: NextStepProposalAsk,
  options: AskOptions = {},
): Promise<ProposeNextWireReply> {
  return send<LearningAiRequest, ProposeNextWireReply>({ task: 'propose-next', ...ask }, options);
}
