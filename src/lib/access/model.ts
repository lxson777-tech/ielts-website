/* Who may use what: the free-account model (Alex, 1 October 2026;
   docs/paid-access/FREE-ACCOUNT-MODEL.md).

   SHARED and pure: the site and the Workers both import it. It decides what
   the screen SAYS and which pop-up to show. It is never an access control on
   its own: the database, the content gate and the AI Workers refuse for
   themselves, and must agree with this table (a test holds them together).

   - signed-out     the sales website and the public pages; no lessons.
   - free           a signed-in account: every lesson, its own short quiz and
                    the vocabulary lists.
   - paid           a running purchase: everything, within the allowances.
   - complimentary  free access given by Alex in /admin: exactly what paid
                    opens, 30 days at a time.
   - paid-ended     paid or complimentary access that ran out: back to free,
                    with every result kept. */

import type { TrialStatus } from '../trial/status';

export type AccessTier = 'signed-out' | 'free' | 'paid' | 'complimentary' | 'paid-ended';

/** Everything a free account must pay for. */
export type PaidFeature =
  | 'test'
  | 'drill'
  | 'trainer'
  | 'focused'
  | 'mock'
  | 'placement'
  | 'essay'
  | 'speaking'
  | 'live'
  | 'tutor'
  | 'plan-practice'
  | 'vocab-review'
  | 'model-answers'
  | 'cue-cards'
  | 'band-guide';

export const PAID_FEATURES: readonly PaidFeature[] = [
  'test', 'drill', 'trainer', 'focused', 'mock', 'placement', 'essay', 'speaking', 'live',
  'tutor', 'plan-practice', 'vocab-review', 'model-answers', 'cue-cards', 'band-guide',
];

/** What a free account opens, by its own name, for the screens that list it. */
export type FreeFeature = 'lesson' | 'lesson-quiz' | 'vocab-lists' | 'course-map';

export function isPaidTier(tier: AccessTier): boolean {
  return tier === 'paid' || tier === 'complimentary';
}

/** The tier the server's status reply describes, by the server's clock.
    `signedIn` is whether there is a session at all; a signed-in account with
    no reply yet must be treated as unknown by the caller, not as free. */
export function tierOf(status: TrialStatus | null, signedIn: boolean, serverNowMs: number): AccessTier {
  if (!signedIn) return 'signed-out';
  const paid = status?.paid ?? null;
  if (!paid) return 'free';
  if (Date.parse(paid.endsAt) <= serverNowMs) return 'paid-ended';
  return (paid as { kind?: string }).kind === 'complimentary' ? 'complimentary' : 'paid';
}

export function canUse(tier: AccessTier, feature: PaidFeature | FreeFeature): boolean {
  if (feature === 'lesson' || feature === 'lesson-quiz' || feature === 'vocab-lists' || feature === 'course-map') {
    return tier !== 'signed-out';
  }
  return isPaidTier(tier);
}
