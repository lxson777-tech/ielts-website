/* React access to the trial view, with a slow clock for "time left".

   BROWSER ONLY (through ./client). A component that shows time remaining
   re-renders once a minute; nothing here asks the server on a timer.

   HYDRATION. The view lives in one module-level store that the first island
   on a page starts filling (sign-in, then the server's answer). An island
   that React wakes up AFTER that answer has landed must still render, on
   its first pass, what the build rendered: the initial "checking" view,
   because the build knows no student. Reading the store straight into
   useState broke exactly that, and only when the answer happened to win the
   race, which is why the "Hydration failed" console errors were
   intermittent (hydration probe, 30 September 2026). useSyncExternalStore
   with a server snapshot renders the initial view while hydrating and the
   real one on the render straight after; a component mounted later in the
   browser gets the real one at once. Same pattern as useLocale in
   src/lib/i18n/react.ts; see src/lib/hydration.ts. */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { initialTrialView, serverNow, subscribeTrialView, trialView, type TrialView } from './client';

export interface TrialHookView extends TrialView {
  /** The server's time now, by the latest answer's clock. */
  now: number;
}

export function useTrial(tickMs = 60_000): TrialHookView {
  const view = useSyncExternalStore(subscribeTrialView, trialView, initialTrialView);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  // Re-read on every new answer (its clock offset may have moved) and on
  // every tick of the slow clock.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => serverNow(), [view, tick]);
  return { ...view, now };
}
