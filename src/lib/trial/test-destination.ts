/* Where a "start a test" button takes this student, on the Tests and
   Practice pages (audit F02, 29 September 2026).

   The Tests page's main Reading and Listening buttons used to pick the next
   paper from a rotation over the whole bank. On a trial build that sent a
   new trial student to a locked paper while their included one was still
   unused. This decides the destination from the account instead, with the
   SAME rules the test page and Today already use (testAccess and
   hasPaidAccess in ./status), so the button and the page it opens can never
   disagree:

     open build, or paid access running  -> today's rotation, unchanged
     signed out, or no trial started yet  -> the trial page (sign in / start)
     trial test not begun                 -> the included paper
     begun, not submitted                 -> that same sitting, to resume
     used                                 -> the student's results
     trial ended before it was begun      -> the plans
     still checking                       -> wait for the server's answer

   Pure: no browser, no environment. The page passes in what it knows. */

import { TRIAL_OFFER, type AccessMode, type TrialSection } from './offer';
import { hasPaidAccess, testAccess, type TrialStatus } from './status';

/** The trial client's phase (src/lib/trial/client.ts), repeated here so this
    file needs no browser module. */
export type TrialCheckPhase = 'off' | 'checking' | 'signed-out' | 'no-accounts' | 'ready' | 'error';

export type TestDestination =
  /** Full access (the open build, or paid access): the page's own rotation. */
  | { kind: 'rotation' }
  /** The account is still being checked: decide once it is known. */
  | { kind: 'wait' }
  /** Signed out, or signed in without a trial yet. */
  | { kind: 'join'; href: string; signedIn: boolean }
  /** The section's included test, not begun yet. */
  | { kind: 'start'; href: string; testId: string }
  /** The section's test was begun and not submitted: the same sitting. */
  | { kind: 'resume'; href: string; testId: string }
  /** The section's test has been used. */
  | { kind: 'used'; href: string; plansHref: string }
  /** The trial ended before this section's test was begun. */
  | { kind: 'ended'; href: string }
  /** The section's test is switched off for now. */
  | { kind: 'unavailable' }
  /** The server could not be asked. The included paper's own page shows the
      plain retry, so the button still never leads to a locked paper. */
  | { kind: 'check-failed'; href: string };

export interface DestinationInput {
  mode: AccessMode;
  phase: TrialCheckPhase;
  status: TrialStatus | null;
  /** The server's time now (serverNow() in the browser). */
  now: number;
  section: TrialSection;
}

export const TRIAL_JOIN_HREF = '/trial';
export const RESULTS_HREF = '/report';
export const PLANS_HREF = '/plans';

/** The route of a trial activity: a practice paper's own page, or the named
    Writing and Speaking activities' pages. */
export function activityHref(section: TrialSection, activityId: string): string {
  const offer = TRIAL_OFFER[section];
  if (activityId === offer.testId) return offer.testHref;
  return `/tests/${activityId}`;
}

export function trialTestDestination({ mode, phase, status, now, section }: DestinationInput): TestDestination {
  if (mode !== 'trial' || phase === 'off') return { kind: 'rotation' };
  const offer = TRIAL_OFFER[section];
  switch (phase) {
    case 'checking':
      return { kind: 'wait' };
    case 'signed-out':
      return { kind: 'join', href: TRIAL_JOIN_HREF, signedIn: false };
    case 'no-accounts':
      return { kind: 'unavailable' };
    case 'error':
      return { kind: 'check-failed', href: offer.testHref };
  }
  if (!status) return { kind: 'wait' };
  /* Paid access opens everything the trial locks: the whole bank again. */
  if (hasPaidAccess(status, now)) return { kind: 'rotation' };
  const access = testAccess(status, section, offer.testId, now);
  switch (access) {
    case 'no-trial':
      return { kind: 'join', href: TRIAL_JOIN_HREF, signedIn: true };
    case 'available':
      return { kind: 'start', href: offer.testHref, testId: offer.testId };
    case 'in-progress':
      return { kind: 'resume', href: offer.testHref, testId: offer.testId };
    case 'other-in-progress': {
      /* A sitting begun on a different paper of this section (only the
         server can bind one): resume that one, never a new paper. */
      const claim = status.sections[section].test!;
      return { kind: 'resume', href: activityHref(section, claim.activityId), testId: claim.activityId };
    }
    case 'used':
      return { kind: 'used', href: RESULTS_HREF, plansHref: PLANS_HREF };
    case 'ended':
      return { kind: 'ended', href: PLANS_HREF };
    case 'unavailable':
      return { kind: 'unavailable' };
    case 'locked':
      /* Not reachable for the section's own test id; stay safe anyway. */
      return { kind: 'ended', href: PLANS_HREF };
  }
}

/** Whether this account sees the full product's descriptions (the open
    build, or paid access running) rather than the trial's. */
export function seesFullAccessCopy(mode: AccessMode, phase: TrialCheckPhase, status: TrialStatus | null, now: number): boolean {
  if (mode !== 'trial' || phase === 'off') return true;
  return phase === 'ready' && status !== null && hasPaidAccess(status, now);
}
