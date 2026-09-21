/* Pure view-model helpers for the Today block (WP8).
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/today-surface.test.ts
 * The whole suite is `npm test`.
 *
 * Covers state selection for every screen Today can show, step status
 * mapping, the main button's start/continue choice, and the old "Course
 * view" preference mapping ('order' -> 'route'). The last two tests build a
 * real plan from the shared synthetic profiles (tests/fixtures/
 * learning-profiles.ts) through the real planner, so the screen selection is
 * checked against actual planner output and not only against hand-built
 * fixtures.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  daysUntil,
  focusAreas,
  isSessionFinished,
  mainAction,
  mapStoredCourseView,
  selectTodayScreen,
  stepStatus,
  type TodayScreenInput,
} from '../src/components/learning/today/todayViewModel.ts';
import { learningCatalogue } from '../src/lib/learning/catalog.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import { createInitialPlan } from '../src/lib/learning/planner.ts';
import { sharedSessionFrom } from '../src/lib/learning/adapters.ts';
import { syntheticExpired, syntheticNew, syntheticMatchingHeadings } from './fixtures/learning-profiles.ts';

const CATALOGUE = learningCatalogue();

function screenInput(over: Partial<TodayScreenInput> = {}): TodayScreenInput {
  return { confirmed: true, planStatus: 'on-track', finished: false, intakeDeferred: false, ...over };
}

/* ------------------------------------------------------------------ */
/* selectTodayScreen                                                   */
/* ------------------------------------------------------------------ */

test('selectTodayScreen: an unconfirmed goal asks first, every time but once deferred', () => {
  assert.equal(selectTodayScreen(screenInput({ confirmed: false })), 'intake');
  // Deferring reveals whatever the plan would otherwise show, not a second
  // "answer this" screen the same visit.
  assert.equal(selectTodayScreen(screenInput({ confirmed: false, intakeDeferred: true })), 'active');
});

test('selectTodayScreen: a passed exam date wins over "finished", it is never a completion message', () => {
  const input = screenInput({ planStatus: 'date-passed', finished: true });
  assert.equal(selectTodayScreen(input), 'date-passed');
});

test('selectTodayScreen: finished today shows once every step is done or skipped', () => {
  assert.equal(selectTodayScreen(screenInput({ finished: true })), 'finished');
});

test('selectTodayScreen: the ordinary states (provisional, recovering, exam-imminent, goal-met) are all "active"', () => {
  for (const planStatus of ['on-track', 'provisional-no-date', 'recovering', 'exam-imminent', 'goal-met'] as const) {
    assert.equal(selectTodayScreen(screenInput({ planStatus })), 'active', planStatus);
  }
});

/* ------------------------------------------------------------------ */
/* isSessionFinished                                                    */
/* ------------------------------------------------------------------ */

test('isSessionFinished: state completed is finished regardless of the steps', () => {
  assert.equal(isSessionFinished({ state: 'completed', steps: [{ stepId: 'a', state: 'pending' }] as never }), true);
});

test('isSessionFinished: no steps at all is not finished, there is nothing to have demonstrated', () => {
  assert.equal(isSessionFinished({ state: 'active', steps: [] }), false);
});

test('isSessionFinished: every step done or skipped is finished', () => {
  const steps = [{ stepId: 'a', state: 'done' }, { stepId: 'b', state: 'skipped' }] as never;
  assert.equal(isSessionFinished({ state: 'active', steps }), true);
});

test('isSessionFinished: one pending step is not finished', () => {
  const steps = [{ stepId: 'a', state: 'done' }, { stepId: 'b', state: 'pending' }] as never;
  assert.equal(isSessionFinished({ state: 'active', steps }), false);
});

/* ------------------------------------------------------------------ */
/* stepStatus                                                          */
/* ------------------------------------------------------------------ */

test('stepStatus: done and skipped are read straight off the step', () => {
  assert.equal(stepStatus({ stepId: 'a', state: 'done' }, null), 'done');
  assert.equal(stepStatus({ stepId: 'a', state: 'skipped' }, 'a'), 'skipped');
});

test('stepStatus: the session\'s current step id is what makes a pending step read as current', () => {
  assert.equal(stepStatus({ stepId: 'a', state: 'pending' }, 'a'), 'current');
  assert.equal(stepStatus({ stepId: 'b', state: 'pending' }, 'a'), 'upcoming');
  assert.equal(stepStatus({ stepId: 'a', state: 'in-progress' }, 'a'), 'current');
});

/* ------------------------------------------------------------------ */
/* mainAction                                                          */
/* ------------------------------------------------------------------ */

test('mainAction: Start until a step has moved, Continue once any step has', () => {
  assert.equal(mainAction([{ state: 'pending' }, { state: 'pending' }]), 'start');
  assert.equal(mainAction([{ state: 'in-progress' }, { state: 'pending' }]), 'continue');
  assert.equal(mainAction([{ state: 'done' }, { state: 'pending' }]), 'continue');
});

test('mainAction: a refresh mid-session must not show Start again over work already begun', () => {
  // The exact regression this function exists for: a step already 'done'
  // (from an earlier visit) must never be read as a fresh, untouched
  // session on the next page load.
  assert.equal(mainAction([{ state: 'done' }]), 'continue');
});

/* ------------------------------------------------------------------ */
/* mapStoredCourseView: the old "Course view" preference                */
/* ------------------------------------------------------------------ */

test('mapStoredCourseView: the pre-rework "order" value becomes "route"', () => {
  assert.equal(mapStoredCourseView('order'), 'route');
});

test('mapStoredCourseView: "sections" is carried forward unchanged', () => {
  assert.equal(mapStoredCourseView('sections'), 'sections');
});

test('mapStoredCourseView: nothing stored, or anything unrecognised, falls back to "route"', () => {
  assert.equal(mapStoredCourseView(null), 'route');
  assert.equal(mapStoredCourseView(''), 'route');
  assert.equal(mapStoredCourseView('something-corrupted'), 'route');
});

/* ------------------------------------------------------------------ */
/* daysUntil and focusAreas                                            */
/* ------------------------------------------------------------------ */

test('daysUntil: whole days ahead, positive when the date has not arrived yet', () => {
  assert.equal(daysUntil('2026-10-01', '2026-09-22'), 9);
  assert.equal(daysUntil('2026-09-22', '2026-09-22'), 0);
  assert.equal(daysUntil('2026-09-15', '2026-09-22'), -7);
});

test('focusAreas: outstanding papers read as not certain, everything else as certain, never a number', () => {
  const areas = focusAreas(['reading', 'listening', 'writing', 'speaking'], ['writing', 'speaking']);
  assert.deepEqual(
    areas,
    [
      { paper: 'reading', certain: true },
      { paper: 'listening', certain: true },
      { paper: 'writing', certain: false },
      { paper: 'speaking', certain: false },
    ],
  );
});

/* ------------------------------------------------------------------ */
/* Against the real planner, for two of the states above                */
/* ------------------------------------------------------------------ */

function sessionFor(profile: ReturnType<typeof syntheticNew>) {
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const { plan } = createInitialPlan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    now: profile.now,
    today: profile.today,
    goals: profile.goals,
    constraints: profile.constraints,
  });
  return { plan, session: sharedSessionFrom({ plan, catalogue: CATALOGUE }) };
}

test('SYNTHETIC-new (no goal, no evidence) selects the intake screen through the real planner', () => {
  const { plan, session } = sessionFor(syntheticNew());
  const screen = selectTodayScreen({
    confirmed: plan.confirmed,
    planStatus: plan.status,
    finished: isSessionFinished(session),
    intakeDeferred: false,
  });
  assert.equal(screen, 'intake');
});

test('SYNTHETIC-expired (exam date ten days past) selects date-passed through the real planner, never finished', () => {
  const { plan, session } = sessionFor(syntheticExpired());
  assert.equal(plan.status, 'date-passed');
  const screen = selectTodayScreen({
    confirmed: plan.confirmed,
    planStatus: plan.status,
    finished: isSessionFinished(session),
    intakeDeferred: false,
  });
  assert.equal(screen, 'date-passed');
});

test('SYNTHETIC-matching-headings (confirmed goal, evidence on record) selects the active session', () => {
  const { plan, session } = sessionFor(syntheticMatchingHeadings());
  assert.equal(plan.confirmed, true);
  const screen = selectTodayScreen({
    confirmed: plan.confirmed,
    planStatus: plan.status,
    finished: isSessionFinished(session),
    intakeDeferred: false,
  });
  assert.equal(screen, 'active');
  // The session actually has steps to show, not an empty shell.
  assert.ok(session.steps.length > 0);
});
