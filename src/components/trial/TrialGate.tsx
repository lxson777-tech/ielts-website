/* The trial's gate on a lesson, trainer or other protected page.

   Only rendered by a trial build (PUBLIC_ACCESS_MODE=trial), by BaseLayout's
   `trialGate` prop. The page's own content sits in a [data-trial-protected]
   wrapper and <body> starts with data-trial-gate="pending", so nothing
   protected is painted until this has heard from the server for the student
   who is signed in right now. Then it either opens the page or keeps it
   covered and says why (TrialBlock), with the page's title kept visible and
   a way on.

   What this is NOT: a security boundary. The static page still carries its
   content; a determined student can read it from the page source. The
   database and the Workers are what refuse paid work and count allowances.
   Closing the content itself needs the hosting change described in
   docs/TRIAL-IMPLEMENTATION.md.

   PAID ACCESS (docs/paid-access/CONTRACT.md) opens every kind: a paid
   account may read every lesson, sit the full Speaking test and use every
   page the trial locks. Such a page carries no locked material in the gated
   build (`paidContent`); its tool is mounted by PaidContent once the
   material has arrived through the content gate. When paid access ends the
   trial's own rules apply again, and saved results stay. */

import { useEffect } from 'react';
import { useTrial } from '../../lib/trial/react';
import { hasPaidAccess, lessonAccess, paidAccessEnded, testAccess } from '../../lib/trial/status';
import { TRIAL_OFFER } from '../../lib/trial/offer';
import { ACCESS_MODE } from '../../lib/trial/mode';
import TrialBlock, { accountBlock, type TrialBlockReason } from './TrialBlock';

export type TrialGateSpec =
  /** A course lesson: open when it is the section's trial lesson. */
  | { kind: 'lesson'; lessonKey: string; title: string }
  /** A page the trial does not include at all (trainers, drills, the mock
      exam, focused exercises, supporting libraries). `paidContent`: the
      page's markup carries no locked material and its tool is mounted by
      PaidContent for a paid account, so BaseLayout keeps the markup (hidden
      until this opens it). Without it a gated build leaves the page's
      content out entirely, which is the safe default for a new page. */
  | { kind: 'locked'; title: string; paidContent?: boolean }
  /** The trial's Speaking test page (the live examiner). Open to a student
      whose trial includes it; the examiner itself says when the test is
      used or has ended, so its report stays on screen after grading. */
  | { kind: 'speaking'; title: string };

function setGate(state: 'pending' | 'open' | 'locked'): void {
  if (typeof document !== 'undefined') document.body.dataset.trialGate = state;
}

export default function TrialGate({ spec }: { spec: TrialGateSpec }) {
  const trial = useTrial();

  let reason: TrialBlockReason | 'open';
  if (ACCESS_MODE !== 'trial' || trial.phase === 'off') reason = 'open';
  else {
    const account = accountBlock(trial);
    if (account) reason = account;
    else if (hasPaidAccess(trial.status!, trial.now)) reason = 'open';
    else if (spec.kind === 'speaking') {
      const access = testAccess(trial.status!, 'speaking', TRIAL_OFFER.speaking.testId, trial.now);
      reason = access === 'unavailable' ? 'speaking-unavailable' : access === 'no-trial' ? 'no-trial' : access === 'locked' ? 'locked' : 'open';
    }
    else if (spec.kind === 'locked') reason = 'locked';
    else {
      const access = lessonAccess(trial.status!, spec.lessonKey, trial.now);
      reason = access === 'included' ? 'open' : access === 'ended' ? 'ended' : access === 'locked' ? 'locked' : 'no-trial';
    }
  }

  /* Paid access that has ended: the ended rules apply, and the page says
     so in those words rather than as a trial. */
  if ((reason === 'locked' || reason === 'ended') && trial.status && paidAccessEnded(trial.status, trial.now)) reason = 'paid-ended';

  useEffect(() => {
    setGate(reason === 'open' ? 'open' : reason === 'checking' ? 'pending' : 'locked');
    /* A trial build's lesson text arrives from the content gate once the
       student may read it: ask for it now (after a sign-in, too). */
    if (reason === 'open' && spec.kind === 'lesson') {
      void import('../../lib/i18n/lesson-body').then((m) => m.applyLessonBody());
    }
  }, [reason, spec.kind]);

  if (reason === 'open') return null;
  return <TrialBlock reason={reason} title={spec.title} />;
}
