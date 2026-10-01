/* A lesson's own practice quiz in the GATED build (the free-account model,
   1 October 2026): part of the lesson, so it opens for any signed-in
   account. The questions come through the content door (workers/content-gate,
   `practice/<set id>`, opened with its lesson) and are then handed to the
   ordinary PracticeQuiz. A visitor who is not signed in is already shown the
   lesson's invitation by the page's gate, so this shows nothing for them.

   Checking every part of the quiz counts as finishing the lesson, for the
   one upgrade nudge after a free student's first finished lesson
   (src/lib/access/nudge.ts). */

import { useEffect, useState } from 'react';
import { fetchGated } from '../../lib/trial/content';
import { useTrial } from '../../lib/trial/react';
import PracticeQuiz from '../PracticeQuiz';
import { browserTier, readsLessons } from '../../lib/access/tier';
import { announceLessonFinished } from '../../lib/access/nudge';
import TrialBlock, { accountBlock } from './TrialBlock';
import { PaidFailed, PaidLoading } from './PaidStates';

type PracticeSet = Parameters<typeof PracticeQuiz>[0]['set'];

export default function GatedPracticeQuiz({ setId }: { setId: string }) {
  const trial = useTrial();
  const tier = browserTier(trial, trial.now);
  const allowed = readsLessons(tier);
  const key = allowed ? `${trial.userId}:${setId}` : null;
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
      if (!result.ok) {
        setFailed(key);
        return;
      }
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

  if (tier === 'signed-out') return null;
  if (!allowed) {
    const account = accountBlock(trial);
    return account && account !== 'checking' ? <TrialBlock title="Practice this skill" reason={account} /> : <PaidLoading />;
  }
  if (loaded?.key === key) {
    const lessonKey = setId.replace(/^practice-/, '');
    return <PracticeQuiz key={key} set={loaded.set} setId={setId} onAllChecked={() => announceLessonFinished(lessonKey)} />;
  }
  if (failed === key) return <PaidFailed reason="error" onRetry={() => setAttempt((n) => n + 1)} />;
  return <PaidLoading />;
}
