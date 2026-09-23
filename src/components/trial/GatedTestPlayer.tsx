/* A practice paper page in a TRIAL build: the page carries only the paper's
   id and title; the paper itself (passages, questions, answers) comes from
   the content gate (workers/content-gate) for a student allowed to open it,
   and is then handed to the ordinary TestPlayer, which applies the trial's
   one-test-per-section rules exactly as it does on any other page.

   The gate's refusal is shown in the same calm words as every other locked
   page (TrialBlock). Nothing of the paper is on the page until the gate has
   said yes. */

import { useEffect, useState } from 'react';
import { fetchGated } from '../../lib/trial/content';
import { useTrial } from '../../lib/trial/react';
import type { PracticeTest } from '../../lib/tests/schema';
import TestPlayer from '../TestPlayer';
import TrialBlock, { accountBlock, type TrialBlockReason } from './TrialBlock';

const REFUSED: Record<string, TrialBlockReason> = {
  'not-included': 'locked',
  'trial-ended': 'test-ended',
  'trial-required': 'no-trial',
  'sign-in-required': 'signed-out',
  offline: 'error-offline',
};

export default function GatedTestPlayer({
  testId,
  title,
  section,
  hubUrl,
  attemptKind = 'full',
}: {
  testId: string;
  title: string;
  section: 'Reading' | 'Listening';
  hubUrl: string;
  attemptKind?: 'full' | 'drill';
}) {
  const trial = useTrial();
  const [paper, setPaper] = useState<PracticeTest | null>(null);
  const [refused, setRefused] = useState<TrialBlockReason | null>(null);
  const account = accountBlock(trial);

  /* Asked once the account is settled, and again after a refusal whenever
     the student or their trial changes (a sign-in, a Try again). Never again
     once the paper is here: a new copy mid-paper would hand the player a
     different paper object while the clock is running. */
  useEffect(() => {
    if (account || paper) return;
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
      } else {
        setRefused(REFUSED[result.code] ?? 'error-server');
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, account, trial.userId, trial.status]);

  if (account) return <TrialBlock reason={account} title={title} section={section} variant="full" />;
  if (refused) return <TrialBlock reason={refused} title={title} section={section} variant="full" />;
  if (!paper) return <TrialBlock reason="checking" title={title} section={section} variant="full" />;
  return <TestPlayer test={paper} hubUrl={hubUrl} attemptKind={attemptKind} />;
}
