/* The signed-in account's access tier, in the browser.

   BROWSER ONLY (through ../trial/client, which asks the server). The tier is
   worked out by tierOf (./model.ts) from the server's latest answer, by the
   server's clock. Two more answers exist on screen that the pure model does
   not need:
   - 'checking': the account or its access is still being asked about. Show
     nothing protected and no verdict.
   - 'error': the server could not be reached. Never read as free or paid.
   - 'open': the open build (today's live site), where nothing is gated.

   Nothing here is an access control: the content gate and the Workers
   decide again for themselves. */

import { useSyncExternalStore } from 'react';
import { initialTrialView, serverNow, subscribeTrialView, trialView, onTrialChange, type TrialView } from '../trial/client';
import { tierOf, isPaidTier, type AccessTier } from './model';

export type BrowserTier = AccessTier | 'checking' | 'error' | 'open';

export function browserTier(view: TrialView, nowMs: number): BrowserTier {
  if (view.phase === 'off') return 'open';
  if (view.phase === 'checking') return 'checking';
  if (view.phase === 'signed-out' || view.phase === 'no-accounts') return 'signed-out';
  if (view.phase === 'error' || !view.status) return 'error';
  return tierOf(view.status, true, nowMs);
}

/** The tier right now, from the latest answer. */
export function currentTier(): BrowserTier {
  return browserTier(trialView(), serverNow());
}

/** True for paid and complimentary access, and on the open build. */
export function opensEverything(tier: BrowserTier): boolean {
  return tier === 'open' || (tier !== 'checking' && tier !== 'error' && isPaidTier(tier));
}

/** True for an account that reads every lesson: free, paid, complimentary,
    or paid access that ended. */
export function readsLessons(tier: BrowserTier): boolean {
  return tier === 'open' || tier === 'free' || tier === 'paid' || tier === 'complimentary' || tier === 'paid-ended';
}

/** Resolves with the tier once it is known (not 'checking'), or with
    'checking' after `timeoutMs`. */
export function settledTier(timeoutMs = 8000): Promise<BrowserTier> {
  const now = currentTier();
  if (now !== 'checking') return Promise.resolve(now);
  return new Promise((resolve) => {
    let off: () => void = () => {};
    const timer = window.setTimeout(() => {
      off();
      resolve('checking');
    }, timeoutMs);
    off = onTrialChange((view) => {
      const tier = browserTier(view, serverNow());
      if (tier === 'checking') return;
      window.clearTimeout(timer);
      queueMicrotask(() => off());
      resolve(tier);
    });
  });
}

/** React: the tier, re-read on every answer. During hydration it is the
    build's own view ('checking' in the gated build), so it matches the
    static HTML (see src/lib/trial/react.ts). */
export function useAccessTier(): BrowserTier {
  const view = useSyncExternalStore(subscribeTrialView, trialView, initialTrialView);
  return browserTier(view, serverNow());
}
