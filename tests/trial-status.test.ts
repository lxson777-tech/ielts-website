/* What the trial screens say, from the server's answer
 * (src/lib/trial/status.ts and src/lib/trial/offer.ts). Pure functions, no
 * browser, no database: the database's own rules are in trial-sql.test.ts.
 * These make sure the screen can never say more than the server allows. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRIAL_OFFER,
  cleanQuestionnaire,
  isTrialLesson,
  lessonSection,
  parseAccessMode,
  questionnaireFromSearch,
  testSection,
  trialTestSection,
} from '../src/lib/trial/offer.ts';
import {
  lessonAccess,
  msRemaining,
  parseTrialStatus,
  remainingParts,
  stateAt,
  testAccess,
  tutorAllowance,
} from '../src/lib/trial/status.ts';
import { buildSections } from '../src/lib/course.ts';

const NOW = Date.parse('2026-09-23T10:00:00Z');
const H = 3600 * 1000;

function status(overrides: Record<string, unknown> = {}, sections: Record<string, unknown> = {}) {
  const empty = { test: null, tutorUsed: 0, tutorPending: 0 };
  return parseTrialStatus({
    state: 'active',
    startedAt: new Date(NOW - 10 * H).toISOString(),
    endsAt: new Date(NOW + 62 * H).toISOString(),
    serverNow: new Date(NOW).toISOString(),
    limits: { hours: 72, testsPerSection: 1, tutorPerSection: 5 },
    sections: { reading: empty, listening: empty, writing: empty, speaking: empty, ...sections },
    ...overrides,
  })!;
}

test('only exactly "trial" switches the trial on; anything else is the open site', () => {
  assert.equal(parseAccessMode('trial'), 'trial');
  assert.equal(parseAccessMode(' TRIAL '), 'trial');
  for (const raw of [undefined, '', 'open', 'trail', 'true', 1, null]) assert.equal(parseAccessMode(raw), 'open');
});

test('every trial lesson is a real course lesson at the route the offer names', () => {
  const lessons = buildSections().flatMap((s) => s.lessons);
  for (const offer of Object.values(TRIAL_OFFER)) {
    const lesson = lessons.find((l) => l.key === offer.lessonKey);
    assert.ok(lesson, offer.lessonKey);
    assert.equal(lesson.href, offer.lessonHref);
  }
});

test('sections come from the course keys and test ids, and vocabulary is not a trial section', () => {
  for (const s of buildSections()) {
    for (const l of s.lessons) {
      assert.equal(lessonSection(l.key), s.skill === 'vocabulary' ? null : s.skill, l.key);
    }
  }
  assert.equal(testSection('reading-full-006-drill-p2'), 'reading');
  assert.equal(testSection('listening-full-030'), 'listening');
  assert.equal(trialTestSection('reading-full-001'), 'reading');
  assert.equal(trialTestSection('reading-full-001-drill-p1'), null);
  assert.equal(isTrialLesson('reading-paraphrase'), true);
  assert.equal(isTrialLesson('reading-tfng'), false);
});

test('a malformed server answer is "could not check", never "no trial" or "allowed"', () => {
  assert.equal(parseTrialStatus(null), null);
  assert.equal(parseTrialStatus({ state: 'active', serverNow: 'x' }), null);
  assert.equal(parseTrialStatus({ state: 'active', serverNow: new Date().toISOString() }), null, 'active needs its dates');
  assert.equal(parseTrialStatus({ state: 'weird', serverNow: new Date().toISOString() }), null);
});

test('time left is the server end minus the server clock, and the state ends on the stored end', () => {
  const s = status();
  assert.equal(msRemaining(s, NOW), 62 * H);
  assert.deepEqual(remainingParts(62 * H + 30 * 60000), { days: 2, hours: 14, minutes: 30 });
  assert.equal(stateAt(s, NOW + 62 * H - 1), 'active');
  assert.equal(stateAt(s, NOW + 62 * H), 'ended');
  const ended = status({ state: 'ended' });
  assert.equal(stateAt(ended, NOW - 100 * H), 'ended', 'only the server can say active');
});

test('lessons: the trial lesson opens while active; others are locked; nothing opens without a trial', () => {
  const s = status();
  assert.equal(lessonAccess(s, 'reading-paraphrase', NOW), 'included');
  assert.equal(lessonAccess(s, 'reading-tfng', NOW), 'included');
  assert.equal(lessonAccess(s, 'vocabulary-family', NOW), 'included');
  assert.equal(lessonAccess(s, 'reading-paraphrase', NOW + 63 * H), 'included');
  assert.equal(lessonAccess(status({ state: 'none' }), 'reading-paraphrase', NOW), 'included');
});

test('tests: available, in progress, used, another begun, locked, unavailable and ended', () => {
  const fresh = status();
  assert.equal(testAccess(fresh, 'reading', 'reading-full-001', NOW), 'available');
  assert.equal(testAccess(fresh, 'reading', 'reading-full-002', NOW), 'locked');
  assert.equal(testAccess(fresh, 'speaking', 'speaking-test', NOW), 'available');
  assert.equal(testAccess(fresh, 'reading', 'reading-full-001', NOW + 63 * H), 'ended');

  const claim = (s: 'reserved' | 'settled') => ({
    reading: { test: { activityId: 'reading-full-001', requestId: 'sit-000001', status: s, startedAt: new Date(NOW).toISOString(), finishedAt: null }, tutorUsed: 0, tutorPending: 0 },
  });
  const begun = status({}, claim('reserved'));
  assert.equal(testAccess(begun, 'reading', 'reading-full-001', NOW), 'in-progress');
  assert.equal(testAccess(begun, 'reading', 'reading-full-001', NOW + 63 * H), 'in-progress', 'begun before the end may be finished');
  assert.equal(testAccess(begun, 'reading', 'reading-full-002', NOW), 'other-in-progress');
  const used = status({}, claim('settled'));
  assert.equal(testAccess(used, 'reading', 'reading-full-001', NOW), 'used');
});

test('Mr EZ: pending requests already count against what the screen offers', () => {
  const s = status({}, { writing: { test: null, tutorUsed: 3, tutorPending: 1 } });
  assert.deepEqual(tutorAllowance(s, 'writing', NOW), { used: 3, pending: 1, limit: 5, remaining: 1, state: 'available' });
  const full = status({}, { writing: { test: null, tutorUsed: 5, tutorPending: 0 } });
  assert.equal(tutorAllowance(full, 'writing', NOW).state, 'exhausted');
  assert.equal(tutorAllowance(full, 'reading', NOW).remaining, 5, 'sections are separate');
  assert.equal(tutorAllowance(s, 'writing', NOW + 63 * H).state, 'ended');
});

test('the questionnaire is a suggestion only when every answer is one the public site offers', () => {
  assert.deepEqual(questionnaireFromSearch('?journey=1&band=7.5&skill=speaking&focus=confidence&time=15'), {
    band: '7.5',
    skill: 'speaking',
    focus: 'confidence',
    time: '15',
  });
  assert.equal(questionnaireFromSearch('?band=7&skill=speaking&focus=method&time=15'), null, 'needs journey=1');
  assert.equal(cleanQuestionnaire({ band: '6', skill: 'reading', focus: 'method', time: '30' }), null);
  assert.equal(cleanQuestionnaire({ band: '7', skill: 'vocabulary', focus: 'method', time: '30' }), null);
  assert.equal(cleanQuestionnaire('<script>'), null);
});
