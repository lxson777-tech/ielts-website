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
   docs/TRIAL-IMPLEMENTATION.md. */

import { useEffect } from 'react';
import { useTrial } from '../../lib/trial/react';
import { lessonAccess } from '../../lib/trial/status';
import { ACCESS_MODE } from '../../lib/trial/mode';
import TrialBlock, { accountBlock, type TrialBlockReason } from './TrialBlock';

export type TrialGateSpec =
  /** A course lesson: open when it is the section's trial lesson. */
  | { kind: 'lesson'; lessonKey: string; title: string }
  /** A page the trial does not include at all (trainers, drills, the mock
      exam, focused exercises, supporting libraries). */
  | { kind: 'locked'; title: string }
  /** A Speaking test page, unavailable while its length and parts are
      being decided. */
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
    else if (spec.kind === 'speaking') reason = 'speaking-unavailable';
    else if (spec.kind === 'locked') reason = 'locked';
    else {
      const access = lessonAccess(trial.status!, spec.lessonKey, trial.now);
      reason = access === 'included' ? 'open' : access === 'ended' ? 'ended' : access === 'locked' ? 'locked' : 'no-trial';
    }
  }

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
