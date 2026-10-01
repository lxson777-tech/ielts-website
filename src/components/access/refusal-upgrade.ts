/* A grader or the live examiner refused because the account has no practice
   and guidance (HTTP 402 `paid-required`, the free-account model of
   1 October 2026): the screen says so in words (assessment-refusal.ts), and
   the upgrade pop-up opens once, saying what paying adds.

   BROWSER ONLY. The decision of which feature it was is pure
   (refusalUpgradeFeature) so it is tested without a browser. */

import { openUpgrade } from '../../lib/access/upgrade';
import type { PaidFeature } from '../../lib/access/model';
import type { AssessmentWhat, RefusalKind } from './assessment-refusal';

const FEATURE_OF: Record<AssessmentWhat, PaidFeature> = {
  writing: 'essay',
  speaking: 'speaking',
  live: 'live',
  feedback: 'live',
  mock: 'mock',
  placement: 'placement',
};

/** The paid feature whose pop-up a refusal opens, or null for a refusal that
    is not about practice and guidance (an allowance used, a daily limit). */
export function refusalUpgradeFeature(kind: RefusalKind, what: AssessmentWhat): PaidFeature | null {
  return kind === 'paid-required' ? FEATURE_OF[what] : null;
}

export function upgradeOnRefusal(kind: RefusalKind, what: AssessmentWhat): void {
  const feature = refusalUpgradeFeature(kind, what);
  if (feature) openUpgrade(feature);
}
