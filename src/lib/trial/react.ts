/* React access to the trial view, with a slow clock for "time left".

   BROWSER ONLY (through ./client). A component that shows time remaining
   re-renders once a minute; nothing here asks the server on a timer. */

import { useEffect, useState } from 'react';
import { onTrialChange, serverNow, trialView, type TrialView } from './client';

export interface TrialHookView extends TrialView {
  /** The server's time now, by the latest answer's clock. */
  now: number;
}

export function useTrial(tickMs = 60_000): TrialHookView {
  const [view, setView] = useState<TrialView>(() => trialView());
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => onTrialChange((next) => {
    setView(next);
    setNow(serverNow());
  }), []);
  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNow()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return { ...view, now };
}
