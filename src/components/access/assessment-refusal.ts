/* What a student sees when a grader or the live examiner REFUSES an AI
   assessment on purpose (review of 1 October 2026, P1-2, P1-5, P1-6, P2-12).

   A refusal is not an outage. "You have used all 12 essay assessments" and
   "we could not reach the grading service, try again in a minute" are
   different facts with different things to do next, and before this file
   the screens said the second for both.

   PURE: no browser, no network, no clock of its own. The wording functions
   take `t` as a parameter (the component passes useT().t, a test passes a
   fixed-language one), so the English literals below are still read by the
   i18n coverage test like any other t() call; the Russian is in
   src/lib/i18n/dict/ru/s-offer.ts.

   WHICH CODES (Builder M's server, 1 October 2026). Every allowance
   refusal is HTTP 403
     { error, code: 'assessment-unavailable', reason, kind?, purpose?, used?, limit? }
   with `reason` one of ASSESSMENT_REFUSAL_REASONS ('allowance-used',
   'mock-allowance-used', 'placement-used', 'trial-ended', 'paid-required',
   'daily-limit', ...). An unreachable database is 503 code 'unavailable',
   an outage. So:
     - ANY code starting 'assessment-' or 'allowance-' is a refusal, never an
       outage (isAssessmentRefusalCode);
     - the reason picks the sentence (ASSESSMENT_REFUSAL_REASONS);
     - without a reason, a code of its own (ASSESSMENT_REFUSAL_CODES), or the
       server's English sentence read back (SERVER_SENTENCES);
     - anything else shows the server's own sentence, translated if the
       dictionary has it. */

import type { Locale } from '../../lib/i18n/locale';
import { nt, type Vars } from '../../lib/i18n/translate';
import { PAID_ALLOWANCE, assessmentBalance, type TrialStatus } from '../../lib/trial/status';
import { formatDate } from './access-state';

export type Translate = (text: string, vars?: Vars, ctx?: string) => string;

/** Why an assessment was refused, in the student's terms. */
export type RefusalKind =
  /** This period's essays, recordings or live interviews are used (or the
      trial's one shared assessment). */
  | 'used-up'
  /** Both full mock exams of this 30-day period are used. */
  | 'mock-used-up'
  /** The once-per-account placement test was already taken. */
  | 'placement-taken'
  /** The trial is over and nothing paid is running. */
  | 'trial-ended'
  /** The 24-a-day safety limit. */
  | 'daily-limit'
  /** A live interview needs paid access. */
  | 'paid-required'
  /** A free account's one free try of this kind (an essay check, a recorded
      Speaking check) is used up (HTTP 402 `taster-used`). */
  | 'taster-used'
  /** The same assessment is already being graded, or was. */
  | 'already-requested'
  /** Interview feedback asked for a session that is not this student's. */
  | 'unknown-session'
  /** A refusal this screen has no sentence for: the server's own words. */
  | 'other';

/** What was being assessed when the refusal came. */
export type AssessmentWhat = 'writing' | 'speaking' | 'live' | 'feedback' | 'mock' | 'placement';

/** The server's `reason` on an 'assessment-unavailable' refusal
    (src/lib/access/assessment.ts REFUSAL_MESSAGES, Builder M). */
export const ASSESSMENT_REFUSAL_REASONS: Readonly<Record<string, RefusalKind>> = {
  'allowance-used': 'used-up',
  'mock-allowance-used': 'mock-used-up',
  'placement-used': 'placement-taken',
  'trial-ended': 'trial-ended',
  'paid-required': 'paid-required',
  'taster-used': 'taster-used',
  'daily-limit': 'daily-limit',
  'already-requested': 'already-requested',
  'unknown-session': 'unknown-session',
};

/** Codes with a sentence of their own, for a refusal that names its reason
    in the code itself. The right column must not change. */
export const ASSESSMENT_REFUSAL_CODES: Readonly<Record<string, RefusalKind>> = {
  /* Essays, recordings or interviews used up for this period. */
  'assessment-used-up': 'used-up',
  'assessment-allowance-used': 'used-up',
  'allowance-used': 'used-up',
  /* Full mock exams (2 per 30-day purchase) used up. */
  'assessment-mock-used-up': 'mock-used-up',
  'allowance-mock-used': 'mock-used-up',
  /* The placement test is once per account. */
  'assessment-placement-taken': 'placement-taken',
  'allowance-placement-used': 'placement-taken',
  /* Trial over, nothing paid running. 'trial-ended' is the trial gate's
     own code (src/lib/trial/gate.ts) and means the same thing here. */
  'assessment-trial-ended': 'trial-ended',
  'trial-ended': 'trial-ended',
  'assessment-daily-limit': 'daily-limit',
  'assessment-paid-required': 'paid-required',
  /* The free-account model (1 October 2026): every AI Worker refuses an
     account without practice and guidance with HTTP 402 and this code. */
  'paid-required': 'paid-required',
  /* A free account's free try is used up (10 October 2026). */
  'taster-used': 'taster-used',
  'assessment-already-requested': 'already-requested',
  'assessment-in-flight': 'already-requested',
  'assessment-unknown-session': 'unknown-session',
};

/** The one code every allowance refusal arrives with. */
export const ALLOWANCE_REFUSAL_CODE = 'assessment-unavailable';

/** The English sentences src/lib/access/assessment.ts sends, read back into
    a reason when a reply carries no `reason` (an older Worker). Exact match. */
export const SERVER_SENTENCES: Readonly<Record<string, RefusalKind>> = {
  'Your assessment allowance is used. Your lessons, practice and saved results are still available.': 'used-up',
  'You have used the two full mock exams of this purchase. Your lessons, practice and saved results are still available.': 'mock-used-up',
  'The placement test can be taken once per account, and yours is already taken.': 'placement-taken',
  "Today's assessment safety limit is reached. Please try again tomorrow.": 'daily-limit',
  'Live interviews are included with paid access.': 'paid-required',
  'This interview already has a feedback request.': 'already-requested',
  'Feedback needs a live interview from your own account.': 'unknown-session',
  'Start an active trial or buy access to request an assessment.': 'trial-ended',
};

/** Whether a Worker's code is a deliberate refusal of an assessment, as
    opposed to an outage the student should simply retry. */
export function isAssessmentRefusalCode(code: string): boolean {
  return /^(assessment|allowance)-/.test(code) || code in ASSESSMENT_REFUSAL_CODES;
}

export function refusalKind(code: string, serverMessage = '', reason = ''): RefusalKind {
  const byReason = reason ? ASSESSMENT_REFUSAL_REASONS[reason] : undefined;
  if (byReason) return byReason;
  const known = ASSESSMENT_REFUSAL_CODES[code];
  if (known) return known;
  if (code === ALLOWANCE_REFUSAL_CODE) return SERVER_SENTENCES[serverMessage.trim()] ?? 'other';
  return 'other';
}

/** Whether pressing the same button again could work. A used-up allowance,
    an ended trial or a taken placement will refuse again, so the screen
    offers the way forward instead of "try again". */
export function refusalIsFinal(kind: RefusalKind): boolean {
  return kind === 'used-up' || kind === 'mock-used-up' || kind === 'placement-taken' || kind === 'trial-ended' || kind === 'paid-required' || kind === 'taster-used' || kind === 'unknown-session';
}

/** Whether the Plans page is the way forward. */
export function refusalOffersPlans(kind: RefusalKind): boolean {
  return kind === 'used-up' || kind === 'mock-used-up' || kind === 'trial-ended' || kind === 'paid-required' || kind === 'taster-used';
}

/** A period's date inside a sentence: "31 October 2026" / "31 октября 2026".
    Russian's own "г." is left off, so a sentence ending on the date does not
    end in "г..". */
export function periodDate(iso: string, locale: Locale): string {
  const text = formatDate(iso, locale);
  return locale === 'ru' ? text.replace(/\s*г\.$/, '') : text;
}

/** When the allowance comes back, said plainly. Only for a paid period:
    the trial's one assessment never comes back. */
function renewalSentence(status: TrialStatus | null, nowMs: number, t: Translate, locale: Locale): string {
  const balance = assessmentBalance(status, nowMs);
  if (balance.kind !== 'paid') return '';
  if (balance.nextPeriodStartsAt) {
    return t('Your next 30-day period starts on {date}, with a fresh set of assessments.', {
      date: periodDate(balance.nextPeriodStartsAt, locale),
    });
  }
  if (balance.periodEndsAt) {
    return t('This 30-day period ends on {date}. Another purchase on the Plans page starts a new period after it, with a fresh set of assessments.', {
      date: periodDate(balance.periodEndsAt, locale),
    });
  }
  return t('Another purchase on the Plans page starts a new 30-day period with a fresh set of assessments.');
}

/** The work on screen is kept: said so the student is not afraid to leave. */
function keptSentence(what: AssessmentWhat, t: Translate): string {
  if (what === 'writing' || what === 'placement') return t('Your essay is safe on this page.');
  if (what === 'speaking') return t('Your recorded answers are still on this page.');
  return '';
}

function usedUpSentence(what: AssessmentWhat, paid: boolean, t: Translate): string {
  if (!paid) {
    return t('Your one trial AI assessment has been used. Writing and recorded Speaking share it. Paid access includes more assessments.');
  }
  switch (what) {
    case 'writing':
    case 'placement':
      return t('You have used all {n} essay assessments in this 30-day period.', { n: PAID_ALLOWANCE.writing });
    case 'speaking':
      return t('You have used all {n} recorded Speaking assessments in this 30-day period.', { n: PAID_ALLOWANCE.speaking });
    case 'mock':
      return t('You have used both full mock exams in this 30-day period.');
    case 'live':
    case 'feedback':
    default:
      return t('You have used both live interviews in this 30-day period.');
  }
}

/** The whole message, in the student's language: what happened, what is
    kept, and what to do next. */
export function refusalMessage(
  input: { kind: RefusalKind; what: AssessmentWhat; serverMessage?: string },
  status: TrialStatus | null,
  nowMs: number,
  t: Translate,
  locale: Locale,
): string {
  const paid = assessmentBalance(status, nowMs).kind === 'paid';
  const kept = keptSentence(input.what, t);
  const join = (...parts: string[]) => parts.filter(Boolean).join(' ');
  switch (input.kind) {
    case 'used-up':
      return join(usedUpSentence(input.what, paid, t), paid ? renewalSentence(status, nowMs, t, locale) : '', kept);
    case 'mock-used-up':
      return join(
        t('You have used both full mock exams in this 30-day period, so this Speaking interview cannot start.'),
        renewalSentence(status, nowMs, t, locale),
      );
    case 'placement-taken':
      return t('The placement test is taken once per account, and this account has already taken it. Your plan already uses that result.');
    case 'trial-ended':
      return join(t('Your trial has ended, so this cannot be assessed. Lessons stay free, and paid access includes AI assessments.'), kept);
    case 'daily-limit':
      return join(t("Today's safety limit for assessments is reached. Nothing was used: please try again tomorrow."), kept);
    case 'paid-required':
      return input.what === 'live' || input.what === 'feedback'
        ? t('Live interviews are included with paid access. Recorded Speaking and Writing assessments are on the Plans page too.')
        : join(t('AI feedback comes with practice and guidance. Nothing was used.'), kept);
    case 'taster-used':
      return join(
        input.what === 'speaking'
          ? t('You have already used your free Speaking check. Nothing was used.')
          : t('You have already used your free essay check. Nothing was used.'),
        kept,
      );
    case 'already-requested':
      return t('This is already being assessed. Give it a moment, then refresh the page to see the result.');
    case 'unknown-session':
      return t('Feedback needs a live interview taken from your own account in the last day.');
    case 'other':
    default: {
      const said = (input.serverMessage ?? '').trim();
      return join(said ? t(said) : t('This assessment cannot be started right now. Nothing was used.'), kept);
    }
  }
}

/** A live interview the examiner never began, given back by the server
    (POST /end answered `interviewGivenBack: true`, review P1-4). */
export function interviewGivenBackMessage(purpose: string, t: Translate): string {
  if (purpose === 'mock') return t('The interview ended before the examiner began, so it was given back: it does not count as one of your full mock exams.');
  if (purpose === 'placement') return t('The interview ended before the examiner began, so it was given back: your placement interview is still yours to take.');
  return t('The interview ended before the examiner began, so it was given back: it does not count as one of your live interviews.');
}

/** A stopped grading request is not lost: the server gives an assessment
    back on its own when grading never finished (Builder M, P1-5). */
export const INTERRUPTED_GIVEN_BACK = nt(
  'If grading was interrupted before a result appeared, that assessment is given back automatically after a short while, and you can send it again.',
);
