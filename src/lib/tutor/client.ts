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
import { getLocale } from '../i18n/locale';
import { tutorErrorMessage } from './errors';
import { MAX_MESSAGE_CHARS, type TutorErrorCode, type TutorReply, type TutorRequest } from './schema';

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
  turnsPerDay: number;
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

async function post(url: string, token: string, req: TutorRequest, signal?: AbortSignal): Promise<TutorReply> {
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

  return (await resp.json()) as TutorReply;
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

  const token = await getAccessToken();
  if (!token) throw new TutorClientError('sign-in-required', t('Sign in and Mr EZ can see your own results.'));

  /* Generated here, once, so the retry below cannot buy a second answer.
     The locale rides along for the same reason it is on the request at all:
     the Worker has no other way to know which language to answer in, and a
     display preference is the one thing the browser genuinely does own
     (see the comment on TutorRequest.locale in ./schema.ts). */
  const withKey: TutorRequest = {
    ...req,
    locale: req.locale ?? getLocale(),
    idempotencyKey: req.idempotencyKey ?? newIdempotencyKey(),
  };

  try {
    return await post(TUTOR_URL, token, withKey, options.signal);
  } catch (err) {
    const transient = err instanceof TutorClientError && (err.code === 'busy' || err.code === 'unavailable');
    if (!transient || options.retry === false || options.signal?.aborted) throw err;
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (options.signal?.aborted) throw err;
    return post(TUTOR_URL, token, withKey, options.signal);
  }
}
