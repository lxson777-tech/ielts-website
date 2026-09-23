/* A lesson's practice quiz in a TRIAL build: the questions come from the
   content gate (workers/content-gate) with the lesson, for a student allowed
   to open it, and are then handed to the ordinary PracticeQuiz. A lesson the
   trial does not open is already covered by the trial gate, so a refusal
   here simply shows nothing. */

import { useEffect, useState } from 'react';
import { fetchGated } from '../../lib/trial/content';
import { useTrial } from '../../lib/trial/react';
import PracticeQuiz from '../PracticeQuiz';

type PracticeSet = Parameters<typeof PracticeQuiz>[0]['set'];

export default function GatedPracticeQuiz({ setId }: { setId: string }) {
  const trial = useTrial();
  const [set, setSet] = useState<PracticeSet | null>(null);

  useEffect(() => {
    if (set || trial.phase !== 'ready') return;
    let live = true;
    void fetchGated(`practice/${setId}`).then((result) => {
      if (!live || !result.ok) return;
      try {
        setSet(JSON.parse(result.text) as PracticeSet);
      } catch {
        /* nothing shown rather than a broken quiz */
      }
    });
    return () => {
      live = false;
    };
  }, [setId, set, trial.phase, trial.userId]);

  return set ? <PracticeQuiz set={set} setId={setId} /> : null;
}
