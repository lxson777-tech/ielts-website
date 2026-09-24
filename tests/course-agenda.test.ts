/* The Course agenda contract (src/lib/learning/agenda.ts): the data Codex's
 * selected-day agenda renders. Built from real planner output for the
 * synthetic profiles, never hand-made plans, so the checks hold for what the
 * site actually produces.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { learningCatalogue } from '../src/lib/learning/catalog.ts';
import { sharedSessionFrom } from '../src/lib/learning/adapters.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import { createInitialPlan } from '../src/lib/learning/planner.ts';
import { courseAgenda } from '../src/lib/learning/agenda.ts';
import type { PersonalPlanV1 } from '../src/lib/learning/contracts/plan.ts';
import {
  syntheticNew,
  syntheticStrongReadingWeakWriting,
  syntheticSevenDay,
  type LearnerProfile,
} from './fixtures/learning-profiles.ts';

const CATALOGUE = learningCatalogue();

function planFor(profile: LearnerProfile): PersonalPlanV1 {
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  return createInitialPlan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    now: profile.now,
    today: profile.today,
    goals: profile.goals,
    constraints: profile.constraints,
  }).plan;
}

function withFirstStepDone(plan: PersonalPlanV1): PersonalPlanV1 {
  const first = plan.activeSession.steps[0]!;
  return {
    ...plan,
    activeSession: {
      ...plan.activeSession,
      steps: plan.activeSession.steps.map((step) => (step.stepId === first.stepId ? { ...step, state: 'done' as const } : step)),
    },
  };
}

const PROFILES = [syntheticNew(), syntheticStrongReadingWeakWriting(), syntheticSevenDay()];

test('one agenda day per scheduled day, in order, opening on today', () => {
  for (const profile of PROFILES) {
    const plan = planFor(profile);
    const session = sharedSessionFrom({ plan, catalogue: CATALOGUE });
    const agenda = courseAgenda(plan, session, 'en');
    assert.deepEqual(agenda.days.map((day) => day.date), plan.schedule.map((day) => day.date));
    assert.equal(agenda.initialDate, session.date);
    assert.equal(agenda.days.filter((day) => day.isToday).length, 1);
  }
});

test("today's rows are exactly Today's steps, with the same links and the current step marked", () => {
  for (const profile of PROFILES) {
    const plan = withFirstStepDone(planFor(profile));
    const session = sharedSessionFrom({ plan, catalogue: CATALOGUE });
    const today = courseAgenda(plan, session, 'en').days.find((day) => day.isToday)!;
    assert.deepEqual(today.items.map((item) => item.key), session.steps.map((step) => step.stepId));
    assert.deepEqual(today.items.map((item) => item.href), session.steps.map((step) => step.href));
    assert.equal(today.items[0]!.state, 'done');
    assert.equal(today.doneCount, 1);
    const current = today.items.filter((item) => item.state === 'current');
    assert.equal(current.length, session.current ? 1 : 0);
    if (session.current) assert.equal(current[0]!.key, session.current.stepId);
  }
});

test('later days are planned only: no links, no ticks, real titles and minutes', () => {
  for (const profile of PROFILES) {
    const plan = planFor(profile);
    const session = sharedSessionFrom({ plan, catalogue: CATALOGUE });
    for (const day of courseAgenda(plan, session, 'en').days.filter((entry) => !entry.isToday)) {
      assert.equal(day.doneCount, 0, day.date);
      for (const item of day.items) {
        assert.equal(item.state, 'planned');
        assert.equal(item.href, null);
        assert.ok(item.title.trim().length > 0, `${day.date} ${item.activityId} has no title`);
        assert.ok(item.minutes > 0, `${day.date} ${item.activityId} has no estimate`);
        const activity = CATALOGUE.activities.find((entry) => entry.id === item.activityId)!;
        assert.equal(item.titleIsObjective, item.title === activity.objective, `${item.activityId} title kind`);
        assert.ok(item.subskillName && item.subskillName.length > 0, `${item.activityId} has no subskill name`);
      }
      assert.equal(new Set(day.items.map((item) => item.key)).size, day.items.length, 'duplicate row');
      assert.equal(day.plannedMinutes, day.items.reduce((sum, item) => sum + item.minutes, 0));
    }
  }
});

test('a day with nothing planned stays empty and keeps the planner’s own kind', () => {
  for (const profile of PROFILES) {
    const plan = planFor(profile);
    const session = sharedSessionFrom({ plan, catalogue: CATALOGUE });
    const agenda = courseAgenda(plan, session, 'en');
    plan.schedule.forEach((day, index) => {
      if (day.activityIds.length === 0 && !agenda.days[index]!.isToday) {
        assert.equal(agenda.days[index]!.items.length, 0);
        assert.equal(agenda.days[index]!.kind, day.kind);
      }
    });
  }
});

test('no plan or an empty schedule gives an empty agenda, not an invented one', () => {
  assert.deepEqual(courseAgenda(null, null, 'en'), { days: [], initialDate: null });
  const plan = planFor(syntheticNew());
  assert.deepEqual(courseAgenda({ ...plan, schedule: [] }, null, 'en'), { days: [], initialDate: null });
});

test('Russian titles differ from English where the catalogue has a translation', () => {
  const plan = planFor(syntheticStrongReadingWeakWriting());
  const session = sharedSessionFrom({ plan, catalogue: CATALOGUE });
  const en = courseAgenda(plan, session, 'en').days.flatMap((day) => day.items.filter((item) => item.state === 'planned'));
  const ru = courseAgenda(plan, session, 'ru').days.flatMap((day) => day.items.filter((item) => item.state === 'planned'));
  assert.equal(en.length, ru.length);
  if (en.length > 0) assert.ok(en.some((item, index) => item.title !== ru[index]!.title), 'no planned title was translated');
});
