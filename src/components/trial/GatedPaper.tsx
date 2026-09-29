/* A practice paper a screen already holds by title only, completed through
   the content gate before it is sat.

   In the gated build (PUBLIC_ACCESS_MODE=trial) the browser's list of
   papers is titles only (src/lib/trial/tests-light.ts). A screen that picks
   a paper from that list and sits it (the mock exam's Listening and Reading
   legs) wraps its player in this: the paper is fetched through the gate
   with the student's sign-in, put into the list's own entry where it stands
   (so anything else that reads the entry, such as the leg's result, sees
   the whole paper), and only then handed to the player. The gate decides
   who may have it: a paid account may; the mock exam is closed to everyone
   else before this is ever reached.

   On the open site, or for a paper that is already whole, it renders the
   player straight away. */

import { useEffect, useState, type ReactElement } from 'react';
import { contentIsGated, fetchGated } from '../../lib/trial/content';
import type { PracticeTest } from '../../lib/tests/schema';
import { PaidFailed, PaidLoading } from './PaidStates';
import type { PackFailure } from '../../lib/trial/packs';

function isWhole(test: PracticeTest): boolean {
  return Array.isArray(test.parts) && test.parts.length > 0;
}

export default function GatedPaper({ test, children }: { test: PracticeTest; children: (paper: PracticeTest) => ReactElement }) {
  const needed = contentIsGated() && !isWhole(test);
  const [ready, setReady] = useState(!needed);
  const [failed, setFailed] = useState<PackFailure | 'error' | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!needed) return;
    let live = true;
    setFailed(null);
    void fetchGated(`test/${test.id}`).then((result) => {
      if (!live) return;
      if (!result.ok) {
        setFailed(result.code === 'offline' ? 'offline' : result.status === 401 ? 'signed-out' : 'unavailable');
        return;
      }
      try {
        const whole = JSON.parse(result.text) as PracticeTest;
        if (whole.id !== test.id || !isWhole(whole)) throw new Error('not this paper');
        Object.assign(test, whole);
        setReady(true);
      } catch {
        setFailed('error');
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test.id, needed, attempt]);

  if (ready || !needed) return children(test);
  if (failed) return <PaidFailed full reason={failed} onRetry={() => setAttempt((n) => n + 1)} />;
  return <PaidLoading full />;
}
