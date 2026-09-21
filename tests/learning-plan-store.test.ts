/* The plan in the browser: whose it is, what survives a refresh, what may
 * move it and what must not.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/learning-plan-store.test.ts
 * The whole suite is `npm test`.
 *
 * There is no DOM here. Both stores take their storage as an argument, so
 * every claim below is proved against a few lines of memory rather than
 * eyeballed against a real browser.
 *
 * What is being defended, in order:
 *   1. The active session is STABLE. A refresh reads it back exactly as it
 *      was, a studied-only click does not move it, and only a new day, new
 *      meaningful evidence, a settings edit or the student's own choice can.
 *      A plan that moves under a working student is the audit's other
 *      failure mode.
 *   2. Old settings come forward exactly as architecture section 4.2 says:
 *      a plan the student saved keeps its target, its date and its own
 *      daily minutes; a plan the platform fabricated is marked unconfirmed
 *      so the intake asks, with sixty minutes as the recommendation.
 *   3. Two students on one browser never see each other's plan.
 *   4. The derived SavedPlan (lead decision D1) never disagrees with the
 *      real one, and never puts a platform guess over a student's setting.
 *
 * Every learner here is SYNTHETIC.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  anonymousOwner,
  createPlanStore,
  personalPlanKey,
  userOwner,
  type BrowserStorage,
} from '../src/lib/learning/store.browser.ts';
import {
  configureLearning,
  applyOverride,
  chooseLessTimeToday,
  ensurePlan,
  getCurrentSession,
  markStepDone,
  markStepStarted,
  onEvidenceRecorded,
  resetLearningForTest,
  setLearningOwner,
  updateGoalsAndConstraints,
} from '../src/lib/learning/index.ts';
import {
  constraintsFrom,
  derivedSavedPlan,
  goalsFrom,
  planSettingsFromSavedPlan,
} from '../src/lib/learning/adapters.ts';
import { PERSONAL_PLAN_KEY, RECOMMENDED_DAILY_MINUTES } from '../src/lib/learning/contracts/plan.ts';
import { getLearnerStore } from '../src/lib/learning/store.browser.ts';
import type { ProgressV1 } from '../src/lib/progress.ts';
import type { SavedPlan } from '../src/lib/study-plan.ts';

/* ------------------------------------------------------------------ */
/* A browser store, in nine lines of memory                            */
/* ------------------------------------------------------------------ */

interface MemoryStore extends BrowserStorage {
  data: Map<string, string>;
  writes: string[];
  full: boolean;
}

function memoryStore(seed: Record<string, string> = {}): MemoryStore {
  const data = new Map<string, string>(Object.entries(seed));
  const store: MemoryStore = {
    data,
    writes: [],
    full: false,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      store.writes.push(key);
      if (store.full) {
        const error = new Error('QuotaExceededError: the quota has been exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  return store;
}

const TODAY = '2026-09-22';
const NOW = '2026-09-22T09:00:00.000Z';

function emptyProgress(): ProgressV1 {
  return { version: 1, lessons: {}, tests: {}, writing: {}, speaking: [], activity: {} };
}

/** SYNTHETIC: a plan this made-up student actually saved. Band 7.5, a real
    exam date, forty minutes a day, weekdays only, a Writing minimum. */
function savedByStudent(over: Partial<SavedPlan> = {}): SavedPlan {
  return {
    targetBand: '7.5',
    testDate: '2026-12-05',
    createdAt: '2026-06-01T08:00:00.000Z',
    startDate: '2026-06-01',
    done: [],
    doneKeys: ['extra:mock-reading'],
    dailyMinutes: 40,
    studyDays: 'weekdays',
    skillTargets: { writing: '6.5' },
    ...over,
  };
}

/** SYNTHETIC: the plan the old app fabricated on a first page view. */
function fabricated(): SavedPlan {
  return {
    targetBand: '7.0',
    testDate: '',
    createdAt: '2026-09-20T08:00:00.000Z',
    startDate: '2026-09-20',
    done: [],
    doneKeys: [],
    dailyMinutes: 25,
    studyDays: 'daily',
    defaulted: true,
  };
}

/** Wire both stores onto one memory browser and a fixed clock, and hand
    back the legacy plan slot so a test can watch the derived copy. */
function wire(saved: SavedPlan | null, progress: ProgressV1 = emptyProgress()) {
  resetLearningForTest();
  const storage = memoryStore();
  let legacy: SavedPlan | null = saved;
  const legacyWrites: SavedPlan[] = [];
  let today = TODAY;
  configureLearning({
    storage,
    owner: userOwner('synthetic-a'),
    now: () => NOW,
    today: () => today,
    legacy: () => ({ progress, plan: legacy }),
    legacyPlan: {
      read: () => legacy,
      write: (next) => {
        legacy = next;
        legacyWrites.push(next);
      },
    },
  });
  return {
    storage,
    legacyWrites,
    legacyPlan: () => legacy,
    setToday: (date: string) => {
      today = date;
    },
  };
}

test.afterEach(() => resetLearningForTest());

/* ------------------------------------------------------------------ */
/* 1. Storage: per owner, synchronous, and safe with no browser        */
/* ------------------------------------------------------------------ */

test('a plan is kept under a key that names its owner, and one owner never reads another', () => {
  const storage = memoryStore();
  const a = createPlanStore({ storage, owner: userOwner('student-a'), legacyPlan: { read: () => null, write: () => {} } });
  const b = createPlanStore({ storage, owner: userOwner('student-b'), legacyPlan: { read: () => null, write: () => {} } });

  assert.equal(personalPlanKey(userOwner('student-a')), `${PERSONAL_PLAN_KEY}::u:student-a`);
  assert.notEqual(personalPlanKey(userOwner('student-a')), personalPlanKey(anonymousOwner('device-1')));

  assert.equal(a.read(), null, 'a student with no plan has no plan, not somebody else"s');
  assert.equal(b.read(), null);
});

test('with no browser at all, nothing throws and nothing is invented', () => {
  const store = createPlanStore({ storage: null, legacyPlan: { read: () => null, write: () => {} } });
  assert.equal(store.read(), null);
  assert.equal(store.status().persistence, 'memory-only');
  assert.equal(store.status().problem, 'unavailable');
  assert.equal(store.status().present, false);
});

test('a full browser keeps the plan in memory and says so, rather than losing the session', () => {
  const wired = wire(savedByStudent());
  const plan = ensurePlan();
  assert.ok(plan.activeSession.steps.length > 0);

  wired.storage.full = true;
  const moved = chooseLessTimeToday(15);
  assert.equal(moved.constraints.regularDailyMinutes, 40, 'a short day never edits the regular commitment');
  assert.equal(getCurrentSession().budgetMinutes, 15, 'and the session still shortened, from memory');
});

/* ------------------------------------------------------------------ */
/* 2. The old settings, read forward (architecture 4.2)                */
/* ------------------------------------------------------------------ */

test('a plan the student saved keeps its target, its date, its minimums and its own minutes', () => {
  const settings = planSettingsFromSavedPlan(savedByStudent());
  const goals = goalsFrom(settings);
  const constraints = constraintsFrom(settings);

  assert.deepEqual(goals.overallTarget, { band: 7.5, status: 'confirmed' });
  assert.deepEqual(goals.examDate, { date: '2026-12-05', status: 'confirmed' });
  assert.deepEqual(goals.perPaperMinimums.writing, { band: 6.5, status: 'confirmed' });
  assert.equal(constraints.regularDailyMinutes, 40, 'their own number, carried over untouched');
  assert.equal(constraints.regularDailyMinutesStatus, 'confirmed');
  assert.equal(constraints.studyDays, 'weekdays');
});

test('a plan saved before the defaulted field existed is treated as the student"s own', () => {
  const old = savedByStudent();
  delete old.defaulted;
  delete old.dailyMinutes;
  const constraints = constraintsFrom(planSettingsFromSavedPlan(old));
  assert.equal(goalsFrom(planSettingsFromSavedPlan(old)).overallTarget?.status, 'confirmed');
  assert.equal(constraints.regularDailyMinutes, 25, 'the old default of 25 is their setting now, not a new guess');
  assert.equal(constraints.regularDailyMinutesStatus, 'confirmed');
});

test('a fabricated plan is unconfirmed everywhere, and sixty minutes is the recommendation', () => {
  const settings = planSettingsFromSavedPlan(fabricated());
  const goals = goalsFrom(settings);
  const constraints = constraintsFrom(settings);

  assert.equal(goals.overallTarget?.status, 'provisional', 'a band nobody confirmed is a suggestion');
  assert.equal(constraints.regularDailyMinutes, RECOMMENDED_DAILY_MINUTES);
  assert.equal(constraints.regularDailyMinutesStatus, 'provisional');
  assert.notEqual(constraints.regularDailyMinutes, 25, 'the fabricated 25 is NOT carried over');
});

test('the ticked exam-readiness extras survive the migration as studied work', () => {
  wire(savedByStudent());
  ensurePlan();
  const record = getLearnerStore().read();
  assert.ok(
    record.events.some((event) => event.activityId.includes('mock-reading') || event.activityId.includes('extra')),
    'the doneKeys the student ticked are in the record',
  );
  for (const event of record.events) {
    assert.notEqual(event.outcome.kind, 'graded', 'a tick is never a grade');
  }
});

/* ------------------------------------------------------------------ */
/* 3. Stability: what may move the session, and what must not          */
/* ------------------------------------------------------------------ */

test('a refresh does not change the active session', () => {
  wire(savedByStudent());
  const first = ensurePlan();
  const again = ensurePlan();
  const third = getCurrentSession();

  assert.equal(again.activeSession.id, first.activeSession.id);
  assert.equal(again.revision, first.revision, 'reading a plan is not writing one');
  assert.equal(third.sessionId, first.activeSession.id);
  assert.deepEqual(
    again.activeSession.steps.map((step) => step.activityId),
    first.activeSession.steps.map((step) => step.activityId),
  );
});

test('a new local day does change it, and only once', () => {
  const wired = wire(savedByStudent());
  const first = ensurePlan();
  wired.setToday('2026-09-23');
  const next = ensurePlan();
  assert.notEqual(next.activeSession.date, first.activeSession.date);
  assert.equal(next.activeSession.date, '2026-09-23');
  const same = ensurePlan();
  assert.equal(same.revision, next.revision, 'the second read on the same day changes nothing');
});

test('a studied-only click does not replan, and a no-op does not either', () => {
  wire(savedByStudent());
  const before = ensurePlan();

  const unchanged = onEvidenceRecorded();
  assert.equal(unchanged.revision, before.revision, 'nothing new means nothing to replan');

  getLearnerStore().recordLessonStudied({ lessonKey: 'reading-headings', at: NOW });
  const afterStudied = onEvidenceRecorded();
  assert.equal(afterStudied.activeSession.id, before.activeSession.id, 'a completion click is studied, never measured');
  assert.equal(afterStudied.revision, before.revision);
});

test('real practice does replan, without any screen having to ask', () => {
  wire(savedByStudent());
  const before = ensurePlan();

  /* No one calls onEvidenceRecorded here: the plan follows the learner
     record, which is what stops a screen having to remember to. */
  getLearnerStore().recordSubmission({
    activityId: 'check:practice-reading-headings',
    subskill: 'matching-headings',
    paper: 'reading',
    at: NOW,
    mode: 'lesson-check',
    items: Array.from({ length: 8 }, (_, index) => ({
      itemId: `synthetic-q${index + 1}`,
      firstAnswer: 'B',
      correct: index < 2,
      assistance: 'none' as const,
      seenBefore: false,
    })),
  });

  const after = ensurePlan();
  assert.ok(after.revision > before.revision, 'eight answered questions are worth reconsidering the plan for');
  assert.ok(after.evidenceVersion > before.evidenceVersion);
});

test('an override survives a reload, and a short day never edits the regular commitment', () => {
  const wired = wire(savedByStudent());
  ensurePlan();
  const shortened = chooseLessTimeToday(15);

  assert.equal(shortened.activeSession.budgetMinutes, 15);
  assert.equal(shortened.constraints.regularDailyMinutes, 40);
  assert.equal(shortened.constraints.regularDailyMinutesStatus, 'confirmed');

  /* Read the raw bytes back the way the next page load would. */
  const raw = wired.storage.data.get(personalPlanKey(userOwner('synthetic-a')));
  assert.ok(raw, 'the override was written, not only held in memory');
  const reloaded = JSON.parse(raw!) as { overrides: { kind: string }[]; constraints: { regularDailyMinutes: number } };
  assert.ok(reloaded.overrides.some((override) => override.kind === 'less-time-today'));
  assert.equal(reloaded.constraints.regularDailyMinutes, 40);
});

test('a step the student started or finished survives a refresh', () => {
  wire(savedByStudent());
  const plan = ensurePlan();
  const first = plan.activeSession.steps[0]!;

  markStepStarted(first.stepId);
  assert.equal(ensurePlan().activeSession.steps[0]!.state, 'in-progress');

  markStepDone(first.stepId, ['evidence-1']);
  const after = ensurePlan();
  assert.equal(after.activeSession.steps[0]!.state, 'done');
  assert.deepEqual(after.activeSession.steps[0]!.evidenceIds, ['evidence-1']);
  assert.equal(after.activeSession.id, plan.activeSession.id, 'ticking a step is not a replan');
  assert.equal(getCurrentSession().current?.stepId, after.activeSession.steps[1]?.stepId, 'and the session moves on');
});

test('editing the goal replans, and records why in plain words', () => {
  wire(savedByStudent());
  const before = ensurePlan();
  const after = updateGoalsAndConstraints({
    goals: { ...before.goals, overallTarget: { band: 9, status: 'confirmed' } },
  });
  assert.equal(after.goals.overallTarget?.band, 9);
  assert.ok(after.revision > before.revision);
  assert.ok(after.history.length > before.history.length, 'a change the student made is written down');
  assert.ok(after.history[after.history.length - 1]!.summary.length > 10);
});

test('the student choosing another paper is recorded as their choice, not the plan"s', () => {
  wire(savedByStudent());
  ensurePlan();
  const after = applyOverride({ kind: 'chose-other-skill', date: TODAY, paper: 'speaking', createdAt: NOW });
  assert.equal(after.activeSession.paper, 'speaking');
  assert.equal(after.activeSession.chosenByStudent, true);
});

/* ------------------------------------------------------------------ */
/* 4. Two students, one browser                                        */
/* ------------------------------------------------------------------ */

test('signing in as a second student never shows the first one"s plan', () => {
  const wired = wire(savedByStudent());
  const mine = ensurePlan();
  markStepDone(mine.activeSession.steps[0]!.stepId);

  setLearningOwner(userOwner('synthetic-b'));
  const theirs = ensurePlan();
  assert.notEqual(theirs.activeSession.id, mine.activeSession.id, 'a different student, a different session');
  assert.ok(
    theirs.activeSession.steps.every((step) => step.state === 'pending'),
    'and none of the first student"s progress',
  );

  const keys = [...wired.storage.data.keys()].filter((key) => key.startsWith(PERSONAL_PLAN_KEY));
  assert.equal(keys.length, 2, 'two plans, two keys, neither readable through the other');
});

/* ------------------------------------------------------------------ */
/* 5. The derived SavedPlan (lead decision D1)                         */
/* ------------------------------------------------------------------ */

test('every plan save writes a derived SavedPlan, and the two never disagree', () => {
  const wired = wire(savedByStudent());
  const plan = ensurePlan();
  const shadow = wired.legacyPlan();

  assert.ok(wired.legacyWrites.length > 0, 'the old store is kept up to date, so the old screens keep working');
  assert.ok(shadow);
  assert.equal(shadow!.targetBand, '7.5', 'target band agrees');
  assert.equal(Number(shadow!.targetBand), plan.goals.overallTarget!.band);
  assert.equal(shadow!.testDate, plan.goals.examDate!.date, 'exam date agrees');
  assert.equal(shadow!.dailyMinutes, plan.constraints.regularDailyMinutes, 'daily minutes agree');
  assert.equal(shadow!.defaulted, !plan.confirmed);
  assert.deepEqual(shadow!.doneKeys, ['extra:mock-reading'], 'their ticked steps are preserved, not reset');
});

test('the derived copy follows a settings edit, in both directions', () => {
  const wired = wire(savedByStudent());
  const before = ensurePlan();
  updateGoalsAndConstraints({
    goals: { ...before.goals, overallTarget: { band: 6.5, status: 'confirmed' }, examDate: { date: '2027-01-10', status: 'confirmed' } },
    constraints: { ...before.constraints, regularDailyMinutes: 90, regularDailyMinutesStatus: 'confirmed' },
  });
  const shadow = wired.legacyPlan()!;
  assert.equal(shadow.targetBand, '6.5');
  assert.equal(shadow.testDate, '2027-01-10');
  assert.equal(shadow.dailyMinutes, 90, 'ninety minutes is a real choice and is written as ninety');
});

test('a default never overwrites a setting the student actually made', () => {
  const existing = savedByStudent();
  const provisional = {
    ...ensureUnconfirmed(),
  };
  const shadow = derivedSavedPlan(provisional, existing);
  assert.ok(shadow);
  assert.equal(shadow!.targetBand, '7.5', 'their band stands, not the platform"s suggestion');
  assert.equal(shadow!.dailyMinutes, 40, 'their minutes stand too');
  assert.equal(shadow!.testDate, '2026-12-05');
});

test('an unconfirmed plan with nothing to shadow writes nothing at all', () => {
  assert.equal(derivedSavedPlan(ensureUnconfirmed(), null), null, 'a guess must never reach a store that syncs');
});

/** A plan whose every goal is the platform's suggestion rather than the
    student's. Built through the real entry point so the shape is real. */
function ensureUnconfirmed() {
  wire(null);
  const plan = ensurePlan();
  assert.equal(plan.confirmed, false, 'a student who has told us nothing has an unconfirmed plan');
  return plan;
}
