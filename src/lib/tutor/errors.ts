/* What a student is told when Mr EZ cannot answer, in their own language.

   The Worker answers a refusal with two things: a machine-readable `code`
   and an English `error` sentence. The code is the stable part of that
   contract; the sentence is not, and it is written in a Cloudflare Worker
   which has no dictionary, no locale and no idea who is reading.

   So the browser keeps its own wording for every code it recognises, and
   only falls back to the Worker's English sentence for a code it does not.
   In practice that fallback is 'bad-request', where the Worker's sentence
   is genuinely more specific than anything a code could carry ("There is no
   completed week to review yet.", "That unit is not finished yet."). Losing
   a little specificity on the codes that ARE recognised is the price of
   never showing a Russian student an English error, and it is a good trade:
   those sentences say the same thing every time.

   BROWSER ONLY. The Worker must never import this: it reaches the lazy
   dictionary, which does not exist there. The Worker keeps returning
   English plus a code, which is exactly what it should return. */

import { t } from '../i18n/translate';
import type { Locale } from '../i18n/locale';
import { MAX_MESSAGE_CHARS, type TutorErrorCode } from './schema';

/** Our own wording for a refusal, or null when this code has no wording of
    ours and the Worker's own sentence should be shown instead. */
export function tutorErrorMessage(code: TutorErrorCode, locale?: Locale): string | null {
  switch (code) {
    case 'not-configured':
      return t('Mr EZ is not switched on for this build yet.', undefined, undefined, locale);
    case 'sign-in-required':
      return t('Sign in and Mr EZ can see your own results.', undefined, undefined, locale);
    case 'limit-reached':
      return t('That is all your questions for today. Mr EZ will be back tomorrow.', undefined, undefined, locale);
    case 'site-limit-reached':
      return t('Mr EZ has hit the whole-site limit for today. Please try again tomorrow.', undefined, undefined, locale);
    case 'too-long':
      return t('That is a bit long. Keep it under {max} characters.', { max: MAX_MESSAGE_CHARS }, undefined, locale);
    case 'not-found':
      return t('Mr EZ could not find that in your own record.', undefined, undefined, locale);
    case 'busy':
      return t('Mr EZ is busy right now. Give it a few seconds and ask again.', undefined, undefined, locale);
    case 'unavailable':
      return t('Mr EZ could not answer just now.', undefined, undefined, locale);
    default:
      // 'bad-request', and anything a future Worker adds that this build has
      // never heard of. Its English sentence beats a vague translated one.
      return null;
  }
}
