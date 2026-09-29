/* Where the Tests and Practice pages' "start a test" actions lead
 * (src/lib/trial/test-destination.ts, audit F02). The Tests page used to
 * rotate a trial student into a locked paper while their included one was
 * still unused. These pin every account state to its destination, and prove
 * no trial account is ever routed to a paper outside the offer. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { TRIAL_OFFER, TRIAL_SECTIONS, type TrialSection } from '../src/lib/trial/offer.ts';
import { parseTrialStatus, type TrialStatus } from '../src/lib/trial/status.ts';
import {
  activityHref,
  seesFullAccessCopy,
  trialTestDestination,
  type TrialCheckPhase,
} from '../src/lib/trial/test-destination.ts';

const NOW = Date.parse('2026-09-29T10:00:00Z');
const H = 3600 * 1000;
const empty = { test: null, tutorUsed: 0, tutorPending: 0 };

function status(overrides: Record<string, unknown> = {}, sections: Record<string, unknown> = {}): TrialStatus {
  return parseTrialStatus({
    state: 'active',
    startedAt: new Date(NOW - 2 * H).toISOString(),
    endsAt: new Date(NOW + 70 * H).toISOString(),
    serverNow: new Date(NOW).toISOString(),
    limits: { hours: 72, testsPerSection: 1, tutorPerSection: 5 },
    sections: { reading: empty, listening: empty, writing: empty, speaking: empty, ...sections },
    ...overrides,
  })!;
}

function claim(section: TrialSection, state: 'reserved' | 'settled', activityId = TRIAL_OFFER[section].testId) {
  return {
    [section]: {
      ...empty,
      test: {
        activityId,
        requestId: 'sit-1',
        status: state,
        startedAt: new Date(NOW - H).toISOString(),
        finishedAt: state === 'settled' ? new Date(NOW - H / 2).toISOString() : null,
      },
    },
  };
}

function dest(section: TrialSection, phase: TrialCheckPhase, s: TrialStatus | null, mode: 'open' | 'trial' = 'trial', now = NOW) {
  return trialTestDestination({ mode, phase, status: s, now, section });
}

test('open build: every section keeps today’s rotation, whatever the account', () => {
  for (const section of TRIAL_SECTIONS) {
    for (const phase of ['off', 'checking', 'signed-out', 'ready', 'error'] as const) {
      assert.deepEqual(dest(section, phase, status(), 'open'), { kind: 'rotation' }, `${section} ${phase}`);
    }
  }
});

test('fresh trial: the included paper, never the rotation', () => {
  for (const section of TRIAL_SECTIONS) {
    const d = dest(section, 'ready', status());
    assert.equal(d.kind, 'start', section);
    assert.equal((d as { href: string }).href, TRIAL_OFFER[section].testHref);
    assert.equal((d as { testId: string }).testId, TRIAL_OFFER[section].testId);
  }
  // The exact case the audit found: Reading goes to Test 1, not Test 29.
  assert.deepEqual(dest('reading', 'ready', status()), { kind: 'start', href: '/tests/reading-full-001', testId: 'reading-full-001' });
});

test('begun and not submitted: the same sitting is resumed', () => {
  for (const section of TRIAL_SECTIONS) {
    const d = dest(section, 'ready', status({}, claim(section, 'reserved')));
    assert.deepEqual(d, { kind: 'resume', href: TRIAL_OFFER[section].testHref, testId: TRIAL_OFFER[section].testId }, section);
  }
});

test('begun before the trial ended: still resumable after it ends', () => {
  const ended = status({ endsAt: new Date(NOW - H).toISOString(), startedAt: new Date(NOW - 73 * H).toISOString() }, claim('listening', 'reserved'));
  assert.equal(dest('listening', 'ready', ended).kind, 'resume');
});

test('a sitting bound to another paper of the section resumes that paper, never a new one', () => {
  const d = dest('reading', 'ready', status({}, claim('reading', 'reserved', 'reading-full-007')));
  assert.deepEqual(d, { kind: 'resume', href: '/tests/reading-full-007', testId: 'reading-full-007' });
  assert.equal(activityHref('writing', TRIAL_OFFER.writing.testId), '/writing/checker');
});

test('used: the results, with the plans offered beside them', () => {
  for (const section of TRIAL_SECTIONS) {
    assert.deepEqual(dest(section, 'ready', status({}, claim(section, 'settled'))), { kind: 'used', href: '/report', plansHref: '/plans' });
  }
});

test('trial ended before the test was begun: the plans', () => {
  const ended = status({ state: 'ended', startedAt: new Date(NOW - 80 * H).toISOString(), endsAt: new Date(NOW - 8 * H).toISOString() });
  for (const section of TRIAL_SECTIONS) assert.deepEqual(dest(section, 'ready', ended), { kind: 'ended', href: '/plans' });
  // An active trial whose time ran out while the page was open reads as ended too.
  assert.equal(dest('reading', 'ready', status(), 'trial', NOW + 71 * H).kind, 'ended');
});

test('signed out, or signed in without a trial: the trial page, not a paper', () => {
  assert.deepEqual(dest('reading', 'signed-out', null), { kind: 'join', href: '/trial', signedIn: false });
  const none = status({ state: 'none', startedAt: null, endsAt: null });
  assert.deepEqual(dest('listening', 'ready', none), { kind: 'join', href: '/trial', signedIn: true });
});

test('still checking waits; a failed check goes to the included paper’s own page', () => {
  assert.deepEqual(dest('reading', 'checking', null), { kind: 'wait' });
  assert.deepEqual(dest('reading', 'ready', null), { kind: 'wait' });
  assert.deepEqual(dest('reading', 'error', null), { kind: 'check-failed', href: '/tests/reading-full-001' });
  assert.deepEqual(dest('reading', 'no-accounts', null), { kind: 'unavailable' });
});

test('paid access running: the whole bank again, through the rotation', () => {
  const paid = { planId: 'month-1', startsAt: new Date(NOW - H).toISOString(), endsAt: new Date(NOW + 30 * 24 * H).toISOString() };
  for (const s of [status({ paid }), status({ paid }, claim('reading', 'settled')), status({ paid, state: 'none', startedAt: null, endsAt: null })]) {
    assert.deepEqual(dest('reading', 'ready', s), { kind: 'rotation' });
  }
  assert.equal(seesFullAccessCopy('trial', 'ready', status({ paid }), NOW), true);
  // Paid access that has ended falls back to the trial's rules.
  const lapsed = { ...paid, endsAt: new Date(NOW - H).toISOString() };
  assert.equal(dest('reading', 'ready', status({ paid: lapsed }, claim('reading', 'settled'))).kind, 'used');
  assert.equal(seesFullAccessCopy('trial', 'ready', status({ paid: lapsed }), NOW), false);
});

test('no trial account is ever routed to a paper outside the offer', () => {
  const offered = new Set(TRIAL_SECTIONS.map((s) => TRIAL_OFFER[s].testHref));
  const ended = status({ state: 'ended', startedAt: new Date(NOW - 80 * H).toISOString(), endsAt: new Date(NOW - 8 * H).toISOString() });
  const states = [status(), ended, ...TRIAL_SECTIONS.flatMap((s) => [status({}, claim(s, 'reserved')), status({}, claim(s, 'settled'))])];
  for (const section of TRIAL_SECTIONS) {
    for (const s of states) {
      const d = dest(section, 'ready', s);
      assert.notEqual(d.kind, 'rotation');
      if (d.kind === 'start' || d.kind === 'resume') assert.ok(offered.has(d.href), `${section}: ${d.href}`);
    }
  }
});

test('who sees the full product’s descriptions', () => {
  assert.equal(seesFullAccessCopy('open', 'off', null, NOW), true);
  for (const phase of ['checking', 'signed-out', 'error', 'no-accounts'] as const) assert.equal(seesFullAccessCopy('trial', phase, null, NOW), false);
  assert.equal(seesFullAccessCopy('trial', 'ready', status(), NOW), false);
});
