/* Mr EZ's next-step proposal on Today (personal learning fix round item 4).
 *
 * askNextStepProposal and the Worker task behind it (see
 * tests/learning-ai.test.ts) existed and were tested, but nothing ever
 * called them: this file pins the pure gating logic that decides WHEN
 * NextStepProposal.tsx may ask and WHEN a landed reply is worth showing,
 * kept apart from the network call and the DOM so both can be tested
 * without either (see src/components/tutor/nextStepProposalGate.ts).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isProposalStale,
  shouldAskNextStepProposal,
  shouldShowNextStepProposal,
  type AskGateInput,
} from '../src/components/tutor/nextStepProposalGate.ts';

function askInput(over: Partial<AskGateInput> = {}): AskGateInput {
  return {
    signedIn: true,
    tutorConfigured: true,
    underExam: false,
    askKey: 'session-1|3',
    alreadyAsked: new Set<string>(),
    ...over,
  };
}

/* ── When to ask ─────────────────────────────────────────────────────────── */

test('shouldAskNextStepProposal: asks once a signed-in student has a configured tutor, no exam running, and a fresh key', () => {
  assert.equal(shouldAskNextStepProposal(askInput()), true);
});

test('shouldAskNextStepProposal: never for a signed-out student, and never while auth has not resolved (null)', () => {
  assert.equal(shouldAskNextStepProposal(askInput({ signedIn: false })), false);
  assert.equal(shouldAskNextStepProposal(askInput({ signedIn: null })), false, 'null (auth still resolving) never asks');
});

test('shouldAskNextStepProposal: never when the tutor is not configured for this build', () => {
  assert.equal(shouldAskNextStepProposal(askInput({ tutorConfigured: false })), false);
});

test('shouldAskNextStepProposal: never while a timed assessment is running', () => {
  assert.equal(shouldAskNextStepProposal(askInput({ underExam: true })), false);
});

test('shouldAskNextStepProposal: never a second time for the same session id and plan revision', () => {
  const alreadyAsked = new Set(['session-1|3']);
  assert.equal(shouldAskNextStepProposal(askInput({ alreadyAsked })), false, 'that exact key was already asked');
  assert.equal(
    shouldAskNextStepProposal(askInput({ alreadyAsked, askKey: 'session-1|4' })),
    true,
    'a new plan revision of the same session is a fresh key and may ask again',
  );
  assert.equal(
    shouldAskNextStepProposal(askInput({ alreadyAsked, askKey: 'session-2|3' })),
    true,
    'a different session id is a fresh key and may ask again',
  );
});

test('shouldAskNextStepProposal: every gate is checked, not just the first that would fail', () => {
  // Signed out AND no exam flag set AND already asked: still false, and for
  // the reason that matters most (signed out), not by accident of ordering.
  const alreadyAsked = new Set(['session-1|3']);
  assert.equal(shouldAskNextStepProposal(askInput({ signedIn: false, alreadyAsked })), false);
});

/* ── Staleness ────────────────────────────────────────────────────────────── */

test('isProposalStale: false while the session id and plan revision the reply was asked about are still current', () => {
  assert.equal(
    isProposalStale({
      askedSessionId: 'session-1',
      askedPlanRevision: 3,
      currentSessionId: 'session-1',
      currentPlanRevision: 3,
    }),
    false,
  );
});

test('isProposalStale: true once the plan revision has moved on, even on the same session id', () => {
  assert.equal(
    isProposalStale({
      askedSessionId: 'session-1',
      askedPlanRevision: 3,
      currentSessionId: 'session-1',
      currentPlanRevision: 4,
    }),
    true,
  );
});

test('isProposalStale: true once the session id itself has changed', () => {
  assert.equal(
    isProposalStale({
      askedSessionId: 'session-1',
      askedPlanRevision: 3,
      currentSessionId: 'session-2',
      currentPlanRevision: 3,
    }),
    true,
  );
});

/* ── When to show a landed, non-stale reply ─────────────────────────────── */

test('shouldShowNextStepProposal: shows only an accepted reply naming a genuinely different, schedulable activity', () => {
  assert.equal(shouldShowNextStepProposal(true, true, 'reconcilable'), true);
});

test('shouldShowNextStepProposal: a rejected reply shows nothing, whatever else is true', () => {
  assert.equal(shouldShowNextStepProposal(false, true, 'reconcilable'), false);
});

test('shouldShowNextStepProposal: a reply with no recommendation at all shows nothing', () => {
  assert.equal(shouldShowNextStepProposal(true, false, null), false);
});

test('shouldShowNextStepProposal: agreeing with the planner (matches-current) shows nothing, it is not an alternative', () => {
  assert.equal(shouldShowNextStepProposal(true, true, 'matches-current'), false);
});

test('shouldShowNextStepProposal: a hub link chooseObjective cannot resolve (unresolvable) shows nothing on Today', () => {
  assert.equal(shouldShowNextStepProposal(true, true, 'unresolvable'), false);
});

test('shouldShowNextStepProposal: no reconciliation computed at all (e.g. a stale reply dropped before reconciling) shows nothing', () => {
  assert.equal(shouldShowNextStepProposal(true, true, null), false);
});
