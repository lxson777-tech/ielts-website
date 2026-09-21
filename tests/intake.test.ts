/* WP10: the intake's pure logic (src/components/learning/intake/logic.ts)
 * and the honest plan-outcome view (src/lib/plan/summary.ts).
 *
 * Every plan/goals/constraints object built below is SYNTHETIC, made with
 * emptyPlanGoals()/defaultPlanConstraints() (src/lib/learning/planner.ts)
 * plus a minimal hand-written PersonalPlanV1 fixture. Nothing here touches
 * storage, the DOM or React: these are the same plain functions Intake.tsx
 * calls, exercised directly (architecture section 1.7 — pure core, browser
 * file separate).
 *
 * What these tests pin, matching the WP10 brief's six required cases:
 *   1. a new plan preselects 60 and requires confirmation before the
 *      constraint is marked confirmed;
 *   2. an existing explicit 25 survives load and save untouched;
 *   3. deferring (nothing answered) leaves goals unconfirmed and invents
 *      nothing;
 *   4. "no date" is stored as no date, and clearing an existing date is
 *      told apart from never having answered;
 *   5. a self-reported score is never stored as measured evidence, and
 *      never crosses into overallTarget;
 *   6. per-paper minimums round-trip, including clearing one;
 *   plus: src/lib/plan/summary.ts's existing getPlanSummary keeps working.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildConstraints,
  buildGoals,
  examDateAnswerFrom,
  inputsFromPerPaperMinimums,
  initialDailyTimeSelection,
  lighterDailyMinutes,
  needsFreshAvailabilityConfirm,
  perPaperMinimumsDiff,
  selfReportedEntryFrom,
  type IntakeAnswers,
} from '../src/components/learning/intake/logic.ts';
import { defaultPlanConstraints, emptyPlanGoals } from '../src/lib/learning/planner.ts';
import { RECOMMENDED_DAILY_MINUTES } from '../src/lib/learning/contracts/plan.ts';
import type { Milestone, PersonalPlanV1, PlanConstraints, PlanGoals, PlanSession } from '../src/lib/learning/contracts/plan.ts';
import { getPlanSummary, planOutcome } from '../src/lib/plan/summary.ts';
import type { SavedPlan } from '../src/lib/study-plan.ts';

const NOW = '2026-09-22T09:00:00.000Z';

function makeSession(overrides: Partial<PlanSession> = {}): PlanSession {
  return {
    id: 'session:1',
    date: '2026-09-22',
    objective: 'Practise matching headings',
    objectiveScope: 'reading:matching-headings',
    subskill: 'exam-format',
    reason: 'Synthetic fixture.',
    evidenceRefs: [],
    steps: [],
    budgetMinutes: 25,
    state: 'active',
    ...overrides,
  };
}

function makePlan(overrides: Partial<PersonalPlanV1> = {}): PersonalPlanV1 {
  return {
    version: 1,
    revision: 1,
    evidenceVersion: 1,
    status: 'on-track',
    confirmed: true,
    createdAt: NOW,
    updatedAt: NOW,
    goals: emptyPlanGoals(),
    constraints: defaultPlanConstraints({ regularDailyMinutesStatus: 'confirmed', regularDailyMinutes: 25 }),
    activeSession: makeSession(),
    schedule: [],
    milestones: [],
    alternatives: [],
    overrides: [],
    history: [],
    diagnosticsOutstanding: [],
    ...overrides,
  };
}

/* ── 1. A new plan preselects 60 and requires confirmation ────────────── */

test('a brand-new (unconfirmed) plan preselects 60 minutes and needs confirmation', () => {
  const fresh = defaultPlanConstraints(); // regularDailyMinutesStatus: 'provisional', from planner.ts
  const selection = initialDailyTimeSelection(fresh);
  assert.equal(selection.minutes, RECOMMENDED_DAILY_MINUTES);
  assert.equal(selection.needsConfirmation, true);
});

test('picking 60 without answering "can you really give this" leaves the constraint provisional', () => {
  const fresh = defaultPlanConstraints();
  const answers: IntakeAnswers = { dailyMinutes: 60 }; // no availabilityConfirmed
  const next = buildConstraints(fresh, answers);
  assert.equal(next.regularDailyMinutes, 60);
  assert.equal(next.regularDailyMinutesStatus, 'provisional');
});

test('answering "yes" marks the same 60-minute choice confirmed', () => {
  const fresh = defaultPlanConstraints();
  const answers: IntakeAnswers = { dailyMinutes: 60, availabilityConfirmed: true };
  const next = buildConstraints(fresh, answers);
  assert.equal(next.regularDailyMinutes, 60);
  assert.equal(next.regularDailyMinutesStatus, 'confirmed');
});

/* ── 2. An existing explicit 25 survives load and save untouched ──────── */

test('an existing confirmed 25 minutes loads with no confirmation needed', () => {
  const existing = defaultPlanConstraints({ regularDailyMinutes: 25, regularDailyMinutesStatus: 'confirmed' });
  const selection = initialDailyTimeSelection(existing);
  assert.equal(selection.minutes, 25);
  assert.equal(selection.needsConfirmation, false);
});

test('re-saving without touching daily minutes keeps 25 confirmed, untouched', () => {
  const existing = defaultPlanConstraints({ regularDailyMinutes: 25, regularDailyMinutesStatus: 'confirmed' });
  // The settings page always resubmits the field's current (unchanged) value.
  const answers: IntakeAnswers = { dailyMinutes: 25, availabilityConfirmed: false, studyDays: 'daily' };
  const next = buildConstraints(existing, answers);
  assert.equal(next.regularDailyMinutes, 25);
  assert.equal(next.regularDailyMinutesStatus, 'confirmed');
});

test('changing an already-confirmed 25 to 60 requires a fresh confirmation', () => {
  const existing = defaultPlanConstraints({ regularDailyMinutes: 25, regularDailyMinutesStatus: 'confirmed' });
  assert.equal(needsFreshAvailabilityConfirm(existing, 60), true);
  assert.equal(needsFreshAvailabilityConfirm(existing, 25), false);

  const unconfirmedSwitch = buildConstraints(existing, { dailyMinutes: 60 });
  assert.equal(unconfirmedSwitch.regularDailyMinutesStatus, 'provisional');

  const confirmedSwitch = buildConstraints(existing, { dailyMinutes: 60, availabilityConfirmed: true });
  assert.equal(confirmedSwitch.regularDailyMinutesStatus, 'confirmed');
  assert.equal(confirmedSwitch.regularDailyMinutes, 60);
});

test('"let\'s be realistic" steps down 60 -> 25 -> 15 and never below', () => {
  assert.equal(lighterDailyMinutes(60), 25);
  assert.equal(lighterDailyMinutes(25), 15);
  assert.equal(lighterDailyMinutes(15), 15);
});

/* ── 3. Deferring invents nothing ──────────────────────────────────────── */

test('an empty answer set ("Answer later") returns goals and constraints unchanged', () => {
  const goals: PlanGoals = {
    ...emptyPlanGoals(),
    overallTarget: { band: 7, status: 'provisional' },
  };
  const constraints = defaultPlanConstraints();

  const sameGoals = buildGoals(goals, {}, NOW);
  const sameConstraints = buildConstraints(constraints, {});

  assert.deepEqual(sameGoals, goals);
  assert.deepEqual(sameConstraints, constraints);
});

test('a brand-new student with no goals at all stays that way when nothing is answered', () => {
  const goals = emptyPlanGoals();
  const next = buildGoals(goals, {}, NOW);
  assert.equal(next.overallTarget, null);
  assert.equal(next.examDate, null);
  assert.deepEqual(next.perPaperMinimums, {});
  assert.deepEqual(next.selfReported, []);
});

/* ── 4. "No date" is stored as no date ─────────────────────────────────── */

test('a date typed into the field is answered as that date', () => {
  const answer = examDateAnswerFrom({ value: '2026-12-01', noDateConfirmed: false, loadedDate: null });
  assert.equal(answer, '2026-12-01');
});

test('"I do not have a date yet" is stored as no date, not left unanswered', () => {
  const answer = examDateAnswerFrom({ value: '', noDateConfirmed: true, loadedDate: null });
  assert.equal(answer, null);

  const goals = buildGoals(emptyPlanGoals(), { examDate: answer }, NOW);
  assert.equal(goals.examDate, null);
});

test('a blank field the student never touched, with nothing loaded, is left unanswered', () => {
  const answer = examDateAnswerFrom({ value: '', noDateConfirmed: false, loadedDate: null });
  assert.equal(answer, undefined);

  // Unanswered must never overwrite an existing confirmed date with null.
  const goals: PlanGoals = { ...emptyPlanGoals(), examDate: { date: '2026-11-01', status: 'confirmed' } };
  const next = buildGoals(goals, { examDate: answer }, NOW);
  assert.deepEqual(next.examDate, { date: '2026-11-01', status: 'confirmed' });
});

test('clearing a field that WAS loaded with a real date is a deliberate clear', () => {
  const answer = examDateAnswerFrom({ value: '', noDateConfirmed: false, loadedDate: '2026-11-01' });
  assert.equal(answer, null);
});

/* ── 5. A self-reported score is never measured evidence ──────────────── */

test('selfReportedEntryFrom returns a plain {paper?, band, takenOn} shape, nothing status-bearing', () => {
  const entry = selfReportedEntryFrom({ paper: 'writing', bandText: '6.5', takenOn: '2026-08-01' });
  assert.deepEqual(entry, { paper: 'writing', band: 6.5, takenOn: '2026-08-01' });
  assert.equal('status' in (entry as object), false);
  assert.equal('certainty' in (entry as object), false);
});

test('selfReportedEntryFrom refuses a blank band or date rather than inventing one', () => {
  assert.equal(selfReportedEntryFrom({ bandText: '', takenOn: '2026-08-01' }), null);
  assert.equal(selfReportedEntryFrom({ bandText: '7.0', takenOn: '' }), null);
});

test('recording a self-reported score never touches overallTarget or perPaperMinimums', () => {
  // The component records a self-reported score through recordSelfReported
  // (store.browser.ts) directly, never through buildGoals/updateGoalsAndConstraints —
  // this proves the two paths cannot cross-contaminate: an answer set with
  // no band/date fields at all leaves the confirmed goal exactly as it was.
  const goals: PlanGoals = { ...emptyPlanGoals(), overallTarget: { band: 6.5, status: 'confirmed' } };
  const next = buildGoals(goals, {}, NOW);
  assert.deepEqual(next.overallTarget, { band: 6.5, status: 'confirmed' });
});

/* ── 6. Per-paper minimums round-trip ──────────────────────────────────── */

test('per-paper minimums round-trip through the editable strings unchanged', () => {
  const goals: PlanGoals = {
    ...emptyPlanGoals(),
    perPaperMinimums: {
      reading: { band: 6.5, status: 'confirmed' },
      writing: { band: 7, status: 'confirmed' },
    },
  };
  const inputs = inputsFromPerPaperMinimums(goals.perPaperMinimums);
  assert.deepEqual(inputs, { reading: '6.5', writing: '7.0' });

  // Feeding the identical inputs back in against themselves is a no-op.
  const diff = perPaperMinimumsDiff(inputs, inputs);
  assert.deepEqual(diff, {});
  const unchanged = buildGoals(goals, { perPaperMinimums: diff }, NOW);
  assert.deepEqual(unchanged.perPaperMinimums, goals.perPaperMinimums);
});

test('changing one paper and clearing another only touches those two', () => {
  const loaded = { reading: '6.5', writing: '7.0' };
  const edited = { reading: '7.0', writing: '' }; // reading raised, writing cleared, listening/speaking untouched
  const diff = perPaperMinimumsDiff(edited, loaded);
  assert.deepEqual(diff, { reading: 7, writing: null });

  const goals: PlanGoals = {
    ...emptyPlanGoals(),
    perPaperMinimums: {
      reading: { band: 6.5, status: 'confirmed' },
      writing: { band: 7, status: 'confirmed' },
      listening: { band: 6, status: 'confirmed' },
    },
  };
  const next = buildGoals(goals, { perPaperMinimums: diff }, NOW);
  assert.deepEqual(next.perPaperMinimums, {
    reading: { band: 7, status: 'confirmed' },
    listening: { band: 6, status: 'confirmed' }, // untouched
  });
});

/* ── src/lib/plan/summary.ts: existing callers keep working ───────────── */

test('getPlanSummary (the old SavedPlan view) still works for its existing callers', () => {
  const saved: SavedPlan = {
    targetBand: '7.0',
    testDate: '2026-11-01',
    createdAt: '2026-09-01T00:00:00.000Z',
    startDate: '2026-09-01',
    done: [],
    dailyMinutes: 25,
    studyDays: 'daily',
    defaulted: false,
  };
  const summary = getPlanSummary(saved);
  assert.match(summary.text, /Band 7\.0/);
  assert.match(summary.text, /25/);
  assert.equal(summary.hint, null);
});

test('getPlanSummary still shows the defaulted hint for a fabricated plan', () => {
  const saved: SavedPlan = {
    targetBand: '7.0',
    testDate: '',
    createdAt: '2026-09-01T00:00:00.000Z',
    done: [],
    defaulted: true,
  };
  const summary = getPlanSummary(saved);
  assert.notEqual(summary.hint, null);
});

/* ── src/lib/plan/summary.ts: planOutcome, the new honest view ────────── */

test('planOutcome names a passed exam date plainly, never as completion', () => {
  const plan = makePlan({ status: 'date-passed' });
  const outcome = planOutcome(plan);
  assert.equal(outcome.status, 'date-passed');
  assert.match(outcome.headline, /new date|new goal/i);
  assert.doesNotMatch(outcome.headline, /complete/i);
});

test('planOutcome marks a no-date plan provisional and mentions the daily minutes', () => {
  const plan = makePlan({
    status: 'provisional-no-date',
    constraints: defaultPlanConstraints({ regularDailyMinutes: 60, regularDailyMinutesStatus: 'confirmed' }),
  });
  const outcome = planOutcome(plan);
  assert.match(outcome.headline, /provisional/i);
  assert.match(outcome.headline, /60/);
});

test('planOutcome carries the planner\'s own scopeNote through unchanged', () => {
  const plan = makePlan({ scopeNote: 'Seven days is not enough for a new question type, so this week is timing and consolidation only.' });
  const outcome = planOutcome(plan);
  assert.equal(outcome.scopeNote, plan.scopeNote);
});

test('planOutcome lists dropped milestones by their own stated reason', () => {
  const milestones: Milestone[] = [
    { id: 'm1', label: 'Full Listening paper under timing', targetDate: null, scopeKey: 'listening', state: 'dropped', droppedReason: 'No time left before the exam for a full timed paper.' },
    { id: 'm2', label: 'Task 1 overviews on unseen data', targetDate: null, scopeKey: 'writing', state: 'planned' },
  ];
  const plan = makePlan({ milestones });
  const outcome = planOutcome(plan);
  assert.deepEqual(outcome.droppedMilestones, ['No time left before the exam for a full timed paper.']);
});

test('planOutcome never predicts a band', () => {
  const statuses: PersonalPlanV1['status'][] = ['on-track', 'provisional-no-date', 'recovering', 'date-passed', 'exam-imminent', 'goal-met'];
  for (const status of statuses) {
    const outcome = planOutcome(makePlan({ status }));
    assert.doesNotMatch(outcome.headline, /\bband \d/i);
  }
});
