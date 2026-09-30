/* An island's first render must match the HTML the build made for it
 * (src/lib/hydration.ts). React renders the SERVER snapshot of an external
 * store both when building the page and while hydrating it in the browser,
 * so these server renders are exactly what the hydration render produces.
 *
 * The bug this pins (hydration probe, 30 September 2026): useTrial read the
 * trial store straight into useState, so an island woken up after the
 * store's answer had arrived rendered "signed out" (or the student's trial)
 * over HTML that said "checking", and React threw the island's HTML away. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { useHydrated } from '../src/lib/hydration.ts';
import { useTrial } from '../src/lib/trial/react.ts';
import { initialTrialView, resetTrialClientForTest, setTrialViewForTest, trialView } from '../src/lib/trial/client.ts';

function TrialPhase() {
  const trial = useTrial();
  return createElement('p', null, `${trial.phase}:${trial.userId ?? 'nobody'}`);
}

function Hydrated() {
  return createElement('p', null, useHydrated() ? 'browser' : 'as built');
}

test('useTrial renders the initial view while hydrating, even when the answer is already in', () => {
  resetTrialClientForTest();
  const built = renderToString(createElement(TrialPhase));
  setTrialViewForTest({ phase: 'signed-out', userId: null, status: null, offsetMs: 0, failure: null });
  assert.equal(trialView().phase, 'signed-out');
  const hydrating = renderToString(createElement(TrialPhase));
  assert.equal(hydrating, built);
  assert.match(hydrating, new RegExp(`${initialTrialView().phase}:nobody`));
  resetTrialClientForTest();
});

test('useHydrated is false for the render that has to match the HTML', () => {
  assert.match(renderToString(createElement(Hydrated)), /as built/);
});
