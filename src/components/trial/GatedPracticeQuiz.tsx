/* A lesson's practice quiz in a TRIAL build: the questions come from the
   content gate (workers/content-gate) with the lesson, for a student allowed
   to open it, and are then handed to the ordinary PracticeQuiz. A lesson the
   trial does not open is already covered by the trial gate, so a refusal
   here simply shows nothing. */

import { useEffect, useState } from 'react';
import { fetchGated } from '../../lib/trial/content';
import { useTrial } from '../../lib/trial/react';
import PracticeQuiz from '../PracticeQuiz';
import { hasPaidAccess, stateAt } from '../../lib/trial/status';
import { isTrialLesson } from '../../lib/trial/offer';
import TrialBlock, { accountBlock } from './TrialBlock';
import { PaidFailed, PaidLoading } from './PaidStates';

type PracticeSet = Parameters<typeof PracticeQuiz>[0]['set'];

export default function GatedPracticeQuiz({ setId }: { setId: string }) {
  const trial = useTrial();
  const allowed = trial.phase === 'ready' && trial.status !== null &&
    (hasPaidAccess(trial.status, trial.now) ||
      (stateAt(trial.status, trial.now) === 'active' && isTrialLesson(setId.replace(/^practice-/, ''))));
  const key = allowed ? `${trial.userId}:${setId}:${trial.status?.paid?.endsAt ?? trial.status?.endsAt}` : null;
  const [loaded, setLoaded] = useState<{ key: string; set: PracticeSet } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoaded(null);
    setFailed(null);
    if (!key) return;
    let live = true;
    void fetchGated(`practice/${setId}`).then((result) => {
      if (!live) return;
      if (!result.ok) { setFailed(key); return; }
      try {
        const set = JSON.parse(result.text) as PracticeSet;
        if (!Array.isArray(set.units)) throw new Error('Invalid practice response');
        setLoaded({ key, set });
      } catch {
        setFailed(key);
      }
    });
    return () => {
      live = false;
    };
  }, [key, setId, attempt]);

  if (!allowed) return <TrialBlock title="Practice this skill" reason={accountBlock(trial) ?? (trial.status && stateAt(trial.status, trial.now) === 'ended' ? 'ended' : 'locked')} />;
  if (loaded?.key === key) return <PracticeQuiz key={key} set={loaded.set} setId={setId} />;
  if (failed === key) return <PaidFailed reason="error" onRetry={() => setAttempt((n) => n + 1)} />;
  return <PaidLoading />;
}
