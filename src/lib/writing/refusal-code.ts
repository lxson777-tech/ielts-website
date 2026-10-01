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

export function isGraderRefusalCode(code: string): boolean {
  return code === 'sign-in-required' || REFUSAL_PREFIX.test(code);
}

/** The live examiner's refusals: the same prefixes (its sign-in failure is
    a 401 the session client reports on its own). */
export function isLiveRefusalCode(code: string): boolean {
  return REFUSAL_PREFIX.test(code);
}
