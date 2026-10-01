/* A practice paper page in the GATED build: the page carries only the
   paper's id and title; the paper itself (passages, questions, answers)
   comes from the content door (workers/content-gate) and is then handed to
   the ordinary TestPlayer.

   The free-account model (1 October 2026): timed tests and drills come with
   practice and guidance. A paid or complimentary account fetches the paper;
   anyone else sees the paper's title and a calm explanation whose button
   opens the upgrade pop-up (PaidLocked), and nothing is asked of the door.
   A refusal from the door itself (403/402) reads the same way. Nothing of
   the paper is on the page until the door has said yes. */

import { useEffect, useState } from 'react';
import { fetchGated } from '../../lib/trial/content';
import { useTrial } from '../../lib/trial/react';
import type { PracticeTest } from '../../lib/tests/schema';
import { browserTier, opensEverything } from '../../lib/access/tier';
import TestPlayer from '../TestPlayer';
import PaidLocked from '../access/PaidLocked';
import TrialBlock, { accountBlock, type TrialBlockReason } from './TrialBlock';

export default function GatedTestPlayer({
  testId,
  title,
  hubUrl,
  attemptKind = 'full',
}: {
  testId: string;
  title: string;
  section?: 'Reading' | 'Listening';
  hubUrl: string;
  attemptKind?: 'full' | 'drill';
}) {
  const trial = useTrial();
  const tier = browserTier(trial, trial.now);
  const paid = opensEverything(tier);
  const feature = attemptKind === 'drill' ? 'drill' : 'test';
  const [paper, setPaper] = useState<PracticeTest | null>(null);
  const [refused, setRefused] = useState<TrialBlockReason | 'locked-by-door' | null>(null);

  /* Asked once paid access is confirmed, and again after a refusal whenever
     the student or their access changes. Never again once the paper is
     here: a new copy mid-paper would hand the player a different paper
     object while the clock is running. */
  useEffect(() => {
    if (!paid || paper) return;
    let live = true;
    setRefused(null);
    void fetchGated(`test/${testId}`).then((result) => {
      if (!live) return;
      if (result.ok) {
        try {
          setPaper(JSON.parse(result.text) as PracticeTest);
        } catch {
          setRefused('error-server');
        }
      } else if (result.status === 401) setRefused('signed-out');
      else if (result.status === 402 || result.status === 403) setRefused('locked-by-door');
      else setRefused(result.code === 'offline' ? 'error-offline' : 'error-server');
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, paid, trial.userId, trial.status]);

  if (tier === 'signed-out' && trial.phase !== 'no-accounts') return <PaidLocked feature={feature} title={title} signedOut variant="full" />;
  const account = accountBlock(trial);
  if (account) return <TrialBlock reason={account} title={title} variant="full" />;
  if (!paid) return <PaidLocked feature={feature} title={title} ended={tier === 'paid-ended'} variant="full" />;
  if (refused === 'locked-by-door') return <PaidLocked feature={feature} title={title} variant="full" />;
  if (refused) return <TrialBlock reason={refused} title={title} variant="full" />;
  if (!paper) return <TrialBlock reason="checking" title={title} variant="full" />;
  return <TestPlayer test={paper} hubUrl={hubUrl} attemptKind={attemptKind} />;
}
