/* Which free AI try to offer, and when (Alex, 10 October 2026: "promote our
   access to try AI training to users who are on free accounts").

   PURE: no browser, no network. The contract is ./taster.ts (the numbers and
   the status shape); this file decides what a SCREEN offers from it. Nothing
   here grants a try: the database counts and reserves every one, and the
   Workers refuse a used-up try with HTTP 402 `taster-used`. A screen that is
   wrong only offers a button that the server then answers plainly.

   The rules, in one place:
   - only a FREE account, or one whose paid access ended, is ever offered a
     try. Signed-out visitors keep the existing sign-up invitations; a paid
     or complimentary account has its own allowances and sees none of this;
   - only while the server reports tries (`taster` null offers nothing) and
     only while some of that kind is left;
   - never during a timed task (`body[data-exam-running]`);
   - nothing in the open build, whose tier is 'open'.

   The English here is marked with nt(); the screens show it through t() with
   the numbers as variables, so the Russian lives once in
   src/lib/i18n/dict/ru/p-taster.ts. */

import { nt } from '../i18n/translate';
import type { BrowserTier } from './tier';
import type { AccessTier, PaidFeature } from './model';
import {
  TASTER_FEATURES,
  canTryFree,
  tasterLeft,
  tastersAllUsed,
  type TasterFeature,
  type TasterStatus,
} from './taster';
import { PAID_ALLOWANCE } from '../trial/status';

/** The two features that have a page of their own for the try. Mr EZ's try
    is used where he already is (his panel and the lesson help buttons). */
export type TasterPageFeature = 'writing' | 'speaking';

/** Where a free account uses its essay and Speaking try. Neither is a paid
    route (paid-routes.ts), so the click guard lets the link through; what
    they open is only a free question, never the paid bank. */
export const TASTER_ROUTES: Readonly<Record<TasterPageFeature, string>> = Object.freeze({
  writing: '/try/essay',
  speaking: '/try/speaking',
});

/** The paid feature whose upgrade pop-up can lead with a try, and which try
    that is. Everything else (tests, drills, the live interview) has none. */
export function tasterForPaidFeature(feature: PaidFeature | 'first-lesson'): TasterFeature | null {
  switch (feature) {
    case 'tutor':
      return 'tutor';
    case 'essay':
      return 'writing';
    case 'speaking':
      return 'speaking';
    default:
      return null;
  }
}

/** The paid feature a try stands in for (for the pop-up opened when it is
    used up or refused). */
export function paidFeatureOfTaster(feature: TasterFeature): PaidFeature {
  return feature === 'tutor' ? 'tutor' : feature === 'writing' ? 'essay' : 'speaking';
}

/** A browser tier as the model's tier, or null for 'open' / 'checking' /
    'error', which are never offered a try. */
function modelTier(tier: BrowserTier): AccessTier | null {
  return tier === 'open' || tier === 'checking' || tier === 'error' ? null : tier;
}

/** Whether to offer this try right now. The one question every moment asks. */
export function offerTaster(
  tier: BrowserTier,
  status: TasterStatus | null,
  feature: TasterFeature,
  underExam = false,
): boolean {
  if (underExam) return false;
  const t = modelTier(tier);
  return t !== null && canTryFree(t, status, feature);
}

/** The tries on offer now, in the order the cards list them. */
export function offeredTasters(tier: BrowserTier, status: TasterStatus | null, underExam = false): TasterFeature[] {
  return TASTER_FEATURES.filter((f) => offerTaster(tier, status, f, underExam));
}

/** Whether a free-tries card is worth showing at all (any try left). */
export function anyTasterOffered(tier: BrowserTier, status: TasterStatus | null, underExam = false): boolean {
  return offeredTasters(tier, status, underExam).length > 0;
}

/** Whether this account is one that gets tries but has used every one of
    them up (the card then gives way to the normal pitch). */
export function allTastersSpent(tier: BrowserTier, status: TasterStatus | null): boolean {
  const t = modelTier(tier);
  return t !== null && (t === 'free' || t === 'paid-ended') && status !== null && tastersAllUsed(status);
}

/** Whether one kind of try has been used up (a try that was never offered,
    limit 0, is not "used"). */
export function tasterSpent(status: TasterStatus | null, feature: TasterFeature): boolean {
  if (!status) return false;
  const c = status[feature];
  return c.limit > 0 && c.used >= c.limit;
}

/** The try a lesson's last card offers, by the lesson's skill: Writing
    lessons the essay check, Speaking lessons the Speaking check, and the
    rest (Reading, Listening, Vocabulary) questions to Mr EZ. Null when that
    one try is used or not on offer, so the card falls back to today's. */
export function lessonEndTaster(
  skill: string,
  tier: BrowserTier,
  status: TasterStatus | null,
  underExam = false,
): TasterFeature | null {
  const wanted: TasterFeature = skill === 'writing' ? 'writing' : skill === 'speaking' ? 'speaking' : 'tutor';
  return offerTaster(tier, status, wanted, underExam) ? wanted : null;
}

/** What an upgrade pop-up opened for `feature` leads with:
    - 'try' while a try of that kind is left (lead with the try),
    - 'used' once it has been used up (say so, then the pitch),
    - null for a feature with no try, or an account that gets none. */
export function dialogTasterLead(
  feature: PaidFeature | 'first-lesson',
  tier: BrowserTier,
  status: TasterStatus | null,
): { kind: 'try' | 'used'; taster: TasterFeature } | null {
  const taster = tasterForPaidFeature(feature);
  const t = modelTier(tier);
  if (!taster || t === null || (t !== 'free' && t !== 'paid-ended') || !status) return null;
  if (tasterLeft(status, taster) > 0) return { kind: 'try', taster };
  return tasterSpent(status, taster) ? { kind: 'used', taster } : null;
}

/* ── Wording (English keys; Russian in dict/ru/p-taster.ts) ───────────── */

export interface TasterLine {
  text: string;
  vars?: Record<string, number>;
}

/** The small counter by Mr EZ's buttons and panel. */
export const TUTOR_COUNTER = nt('Free tries: {left} of {total} left');

/** The row names on Today. */
export const TASTER_ROW_TITLE: Readonly<Record<TasterFeature, string>> = {
  tutor: nt('Ask Mr EZ'),
  writing: nt('Check an essay'),
  speaking: nt('Check a Speaking answer'),
};

/** What each row says is on offer: Mr EZ's is counted (a plural), the
    others are one-offs, said once. */
export const TASTER_ROW_DETAIL: Readonly<Record<TasterFeature, string>> = {
  tutor: nt('Questions about any lesson or result, in your own words.'),
  writing: nt('One essay marked against the four official IELTS criteria.'),
  speaking: nt('One recorded answer marked against the four official IELTS criteria.'),
};

/** The button on each Today row. */
export const TASTER_ROW_BUTTON: Readonly<Record<TasterFeature, string>> = {
  tutor: nt('Ask Mr EZ'),
  writing: nt('Check an essay'),
  speaking: nt('Check an answer'),
};

/** The end-of-lesson card, by try. */
export const LESSON_END_COPY: Readonly<Record<TasterFeature, { title: string; button: string }>> = {
  writing: { title: nt('Try this lesson on your own essay.'), button: nt('Check my essay, free') },
  speaking: { title: nt('Try this lesson out loud.'), button: nt('Record a free answer') },
  tutor: { title: nt('Not sure about something in this lesson?'), button: nt('Ask Mr EZ about this lesson') },
};

export const LESSON_END_BODY: Readonly<Record<'writing' | 'speaking', string>> = {
  writing: nt('Your account includes a free AI essay check. Write one answer and get it marked on the four official IELTS criteria.'),
  speaking: nt('Your account includes a free Speaking check. Record your answers and get feedback on the four official IELTS criteria.'),
};

/** The card after a try has just been used. The numbers come from the
    allowance of a 30-day purchase (PAID_ALLOWANCE), never retyped. */
export function afterUseLine(feature: TasterFeature): TasterLine {
  switch (feature) {
    case 'writing':
      return {
        text: nt('That was your free essay check. Practice and guidance gives you {n} essay checks every 30 days, plus timed tests, Mr EZ and a study plan.'),
        vars: { n: PAID_ALLOWANCE.writing },
      };
    case 'speaking':
      return {
        text: nt('That was your free Speaking check. Practice and guidance gives you {n} recorded Speaking checks every 30 days, plus timed tests, Mr EZ and a study plan.'),
        vars: { n: PAID_ALLOWANCE.speaking },
      };
    default:
      return {
        text: nt('That was your last free question to Mr EZ. With practice and guidance he is there for everything you study, and your lessons stay free.'),
      };
  }
}

/** The pop-up's lead when a try is on offer for the feature the student
    reached for. */
export const DIALOG_TRY_HEADING = nt('You can try this free first');
export const DIALOG_TRY_LEAD: Readonly<Record<TasterFeature, string>> = {
  tutor: nt('Mr EZ normally comes with practice and guidance, but your account includes some free questions.'),
  writing: nt('Essay feedback normally comes with practice and guidance, but your account includes one free essay check.'),
  speaking: nt('Speaking feedback normally comes with practice and guidance, but your account includes one free Speaking check.'),
};
export const DIALOG_TRY_BUTTON: Readonly<Record<TasterFeature, string>> = {
  tutor: nt('Ask Mr EZ free'),
  writing: nt('Check an essay free'),
  speaking: nt('Record a free answer'),
};

/** The pop-up when a try was used up (or refused as used). */
export const DIALOG_USED_HEADING: Readonly<Record<TasterFeature, string>> = {
  tutor: nt('You have used your free questions'),
  writing: nt('You have used your free essay check'),
  speaking: nt('You have used your free Speaking check'),
};
export function dialogUsedLead(feature: TasterFeature): TasterLine {
  switch (feature) {
    case 'writing':
      return {
        text: nt('Practice and guidance gives you {n} essay checks every 30 days, so you can keep improving your writing.'),
        vars: { n: PAID_ALLOWANCE.writing },
      };
    case 'speaking':
      return {
        text: nt('Practice and guidance gives you {n} recorded Speaking checks every 30 days, so you can keep improving your speaking.'),
        vars: { n: PAID_ALLOWANCE.speaking },
      };
    default:
      return { text: nt('With practice and guidance, Mr EZ is there for everything you study. Your lessons stay free.') };
  }
}
