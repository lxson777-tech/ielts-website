/* Which Worker error codes are deliberate REFUSALS rather than outages
   (review of the paid offer, 1 October 2026, P1-2). Shared by the essay,
   recorded Speaking and interview graders and the live examiner client.
   Pure and dependency-free so the unit tests can load it directly.

   A refusal: 'sign-in-required', a trial refusal ('trial-test-used', ...) or
   an allowance refusal (any 'assessment-*' or 'allowance-*' code, e.g. every
   essay of this 30-day period used). It must never be shown as "could not
   reach the grading service, try again in a minute";
   src/components/access/assessment-refusal.ts words it. */

const REFUSAL_PREFIX = /^(trial|assessment|allowance)-/;

/** The free-account model's refusal (HTTP 402): practice and guidance is
    needed. src/lib/access/upgrade.ts PAID_REQUIRED_CODE, kept as a literal
    here so this file stays dependency-free. */
const PAID_REQUIRED = 'paid-required';

/** A free account's try of this kind is used up (HTTP 402, free AI tries of
    10 October 2026; src/lib/access/taster.ts TASTER_USED_CODE). Only the
    essay and recorded Speaking graders have a free try. */
const TASTER_USED = 'taster-used';

export function isGraderRefusalCode(code: string): boolean {
  return code === 'sign-in-required' || code === PAID_REQUIRED || code === TASTER_USED || REFUSAL_PREFIX.test(code);
}

/** The live examiner's refusals: the same prefixes (its sign-in failure is
    a 401 the session client reports on its own). */
export function isLiveRefusalCode(code: string): boolean {
  return code === PAID_REQUIRED || REFUSAL_PREFIX.test(code);
}
