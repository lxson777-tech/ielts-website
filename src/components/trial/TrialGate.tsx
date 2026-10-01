/* The gate on a lesson or a paid page, in the GATED build (the free-account
   model, Alex, 1 October 2026; docs/paid-access/FREE-ACCOUNT-MODEL.md).

   Only rendered by a gated build (PUBLIC_ACCESS_MODE=trial), by BaseLayout's
   `trialGate` prop. The page's own content sits in a [data-trial-protected]
   wrapper and <body> starts with data-trial-gate="pending", so nothing is
   painted until this has heard from the server for the student who is
   signed in right now. Then:

   - a LESSON opens for any signed-in account (free, paid, complimentary, or
     paid access that ended), and its text is fetched through the content
     door (src/lib/i18n/lesson-body.ts); a visitor who is not signed in sees
     the lesson's title and an invitation to create a free account
     (LessonInvite), never the lesson: the page carries no lesson text;
   - a PAID page opens for paid and complimentary access; anyone else sees
     its title and a calm explanation whose button opens the upgrade pop-up
     (PaidLocked). A click inside the site opens the pop-up before getting
     here (src/lib/access/paid-guard.ts); this is for a direct link.

   What this is NOT: a security boundary. The content door and the Workers
   refuse for themselves; a paid page's material is not in its markup at all
   (`paidContent`, mounted by PaidContent once it arrives). */

import { useEffect } from 'react';
import { useTrial } from '../../lib/trial/react';
import { ACCESS_MODE } from '../../lib/trial/mode';
import { browserTier, opensEverything, readsLessons } from '../../lib/access/tier';
import type { PaidFeature } from '../../lib/access/model';
import TrialBlock, { accountBlock, type TrialBlockReason } from './TrialBlock';
import PaidLocked from '../access/PaidLocked';
import LessonInvite from '../access/LessonInvite';

export type TrialGateSpec =
  /** A course lesson: open for any signed-in account. */
  | { kind: 'lesson'; lessonKey: string; title: string }
  /** A free page that is not a lesson (the vocabulary topic lists): open
      for any signed-in account, an invitation for anyone else. */
  | { kind: 'free'; title: string }
  /** A paid page (trainers, drills, the mock exam, focused exercises, the
      supporting libraries). `paidContent`: the page's markup carries no
      paid material and its tool is mounted by PaidContent for a paid
      account, so BaseLayout keeps the markup (hidden until this opens it).
      Without it a gated build leaves the page's content out entirely, which
      is the safe default for a new page. `feature` names what it is part of,
      for the upgrade pop-up. */
  | { kind: 'locked'; title: string; paidContent?: boolean; feature?: PaidFeature }
  /** The recorded Speaking page: a paid page like any other since the trial
      was retired. Kept as a name for the page that declares it. */
  | { kind: 'speaking'; title: string };

type GateState =
  | { kind: 'open' }
  | { kind: 'block'; reason: TrialBlockReason }
  | { kind: 'invite' }
  | { kind: 'locked'; feature: PaidFeature; ended: boolean; signedOut: boolean };

function setGate(state: 'pending' | 'open' | 'locked'): void {
  if (typeof document !== 'undefined') document.body.dataset.trialGate = state;
}

function featureOf(spec: TrialGateSpec): PaidFeature {
  if (spec.kind === 'speaking') return 'speaking';
  if (spec.kind === 'locked') return spec.feature ?? 'trainer';
  return 'test';
}

export default function TrialGate({ spec }: { spec: TrialGateSpec }) {
  const trial = useTrial();
  const tier = browserTier(trial, trial.now);

  let state: GateState;
  if (ACCESS_MODE !== 'trial' || tier === 'open') state = { kind: 'open' };
  else if (tier === 'signed-out' && trial.phase !== 'no-accounts') {
    state = spec.kind === 'lesson' || spec.kind === 'free' ? { kind: 'invite' } : { kind: 'locked', feature: featureOf(spec), ended: false, signedOut: true };
  } else {
    const account = accountBlock(trial);
    if (account) state = { kind: 'block', reason: account };
    else if (spec.kind === 'lesson' || spec.kind === 'free') state = readsLessons(tier) ? { kind: 'open' } : { kind: 'block', reason: 'checking' };
    else if (opensEverything(tier)) state = { kind: 'open' };
    else state = { kind: 'locked', feature: featureOf(spec), ended: tier === 'paid-ended', signedOut: false };
  }

  const gate = state.kind === 'open' ? 'open' : state.kind === 'block' && state.reason === 'checking' ? 'pending' : 'locked';
  useEffect(() => {
    setGate(gate);
    /* The lesson's text arrives from the content door once the student may
       read it: ask for it now (and again after a sign-in). */
    if (gate === 'open' && spec.kind === 'lesson') {
      void import('../../lib/i18n/lesson-body').then((m) => m.applyLessonBody());
    }
  }, [gate, spec.kind, trial.userId]);

  if (state.kind === 'open') return null;
  if (state.kind === 'invite') return <LessonInvite title={spec.title} what={spec.kind === 'lesson' ? 'lesson' : 'page'} />;
  if (state.kind === 'locked') return <PaidLocked feature={state.feature} title={spec.title} ended={state.ended} signedOut={state.signedOut} />;
  return <TrialBlock reason={state.reason} title={spec.title} />;
}
