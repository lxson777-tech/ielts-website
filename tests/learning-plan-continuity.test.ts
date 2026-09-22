/* The plan under a working student: what must NOT move, and what the plan
 * must say about a returning student's real weakness.
 *
 * Every learner here is SYNTHETIC. The seed below is the one the lead
 * reproduced by hand on the frozen production build of 22 September 2026,
 * written in OLD-STORE form (`ielts.progress.v1` and `ielts.studyplan.v1`)
 * and put through the site's own migration, because that is the honest
 * returning-student path: a migrated student's evidence carries no
 * per-question detail and is therefore capped at `limited` certainty, which
 * is exactly the condition the two failures below depend on. A hand-built
 * LearnerRecordV1 with item-level detail hides both of them, which is why
 * the planner's own "the audit Matching Headings student is sent to
 * Matching Headings" test was passing while the real site failed.
 *
 * WHAT THIS FILE PINS
 *   1. A completed step stays completed. A new-evidence replan while the
 *      day's session is under way keeps the incumbent session's identity and
 *      its finished and current steps (architecture section 5.2), and a
 *      studied-only event leaves the session byte-identical.
 *   2. A returning student with a substantive weakness is sent to that
 *      weakness, not to an unknown paper's overview, while the session still
 *      samples an unknown paper through its own staged `assess` step. A
 *      student with no evidence anywhere is still sent to find out.
 *   3. The missed-day count the student is told is the real number of missed
 *      study days.
 *   4. A change is recorded only when something the student can perceive
 *      changed, and "Today moves from X to X" is never written.
 *   5. Two opposite profiles get different work AND different reasons, each
 *      naming its own paper and its own shortfall.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { learningCatalogue } from '../src/lib/learning/catalog.ts';
import { constraintsFrom, goalsFrom, planSettingsFromSavedPlan, sessionMinutesSettled, sharedSessionFrom } from '../src/lib/learning/adapters.ts';
import { migrateProgress } from '../src/lib/learning/migrate.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import {
  carryForwardSession,
  createInitialPlan,
  hasSubstantiveWeakness,
  missedStudyDays,
  replan,
} from '../src/lib/learning/planner.ts';
import { learnerFacts } from '../src/lib/learning/session.ts';
import { appendAllEvidence, createEvidenceEvent } from '../src/lib/learning/evidence.ts';
import { continueFor } from '../src/components/learning/session-continue.ts';
import { mainAction } from '../src/components/learning/today/todayViewModel.ts';
import { configureLearning, ensurePlan, getCurrentSession, resetLearningForTest } from '../src/lib/learning/index.ts';
import { recordLessonStudied, userOwner, type BrowserStorage } from '../src/lib/learning/store.browser.ts';
import type { LearnerRecordV1 } from '../src/lib/learning/contracts/evidence.ts';
import type { PersonalPlanV1, PlanConstraints, PlanGoals, SessionStep } from '../src/lib/learning/contracts/plan.ts';
import type { Paper, Subskill } from '../src/lib/learning/contracts/catalog.ts';
import type { ProgressV1 } from '../src/lib/progress.ts';
import type { SavedPlan } from '../src/lib/study-plan.ts';
import {
  syntheticLowestButMet,
  syntheticNew,
  syntheticStrongReadingWeakWriting,
  syntheticWeakReadingStrongWriting,
  type LearnerProfile,
} from './fixtures/learning-profiles.ts';

const CATALOGUE = learningCatalogue();

const TODAY = '2026-09-22';
const NOW = '2026-09-22T09:00:00.000Z';
const LATER = '2026-09-22T09:21:00.000Z';

/* ── The audit student, in old-store form ────────────────────────────────── */

/** SYNTHETIC-audit-returning: the exact seed the lead reproduced by hand.
 *  Two full Reading papers with 1 of 8 Matching Headings right in each,
 *  True False Not Given and sentence completion both comfortable, no lessons
 *  studied, a confirmed band 7 goal and a real exam date. */
function auditSavedPlan(): SavedPlan {
  return {
    targetBand: '7.0',
    testDate: '2026-12-01',
    createdAt: '2026-09-01T09:00:00.000Z',
    done: [],
    startDate: '2026-09-01',
    dailyMinutes: 60,
    defaulted: false,
  } as SavedPlan;
}

function auditProgress(): ProgressV1 {
  const attempt = (at: string) => ({
    at,
    raw: 24,
    total: 40,
    band: 6,
    bandLabel: '6 - 6.5',
    secondsUsed: 3600,
    skill: 'reading' as const,
    byType: {
      'matching-headings': { correct: 1, total: 8 },
      tfng: { correct: 10, total: 12 },
      'sentence-completion': { correct: 13, total: 20 },
    },
  });
  return {
    version: 1,
    lessons: {},
    tests: {
      'reading-full-001': [attempt('2026-09-11T10:00:00.000Z')],
      'reading-full-002': [attempt('2026-09-19T10:00:00.000Z')],
    },
    writing: {},
    speaking: [],
  } as unknown as ProgressV1;
}

interface Seeded {
  record: LearnerRecordV1;
  goals: PlanGoals;
  constraints: PlanConstraints;
}

/** The seed as the site itself builds it: the old stores through migration
    and the plan adapters, never a hand-written record. */
function auditSeed(): Seeded {
  const settings = planSettingsFromSavedPlan(auditSavedPlan());
  return {
    record: migrateProgress(auditProgress(), auditSavedPlan(), {}, {
      now: NOW,
      /* The old store recorded an instant and never a zone, so the migration
         asks its caller how to turn one into a calendar day. Fixed here so
         this file's dates do not depend on the machine running it. */
      localDateOf: (iso) => iso.slice(0, 10),
    }),
    goals: goalsFrom(settings),
    constraints: constraintsFrom(settings),
  };
}

function planFrom(seed: Seeded, over: { now?: string; today?: string } = {}) {
  const now = over.now ?? NOW;
  const policy = evaluateEvidence({ record: seed.record, goals: seed.goals, now });
  return createInitialPlan({
    catalogue: CATALOGUE,
    record: seed.record,
    policy,
    now,
    today: over.today ?? TODAY,
    goals: seed.goals,
    constraints: seed.constraints,
  });
}

function replanFrom(seed: Seeded, previous: PersonalPlanV1, record: LearnerRecordV1, now = LATER) {
  const policy = evaluateEvidence({ record, goals: seed.goals, now });
  return replan({
    catalogue: CATALOGUE,
    record,
    policy,
    previous,
    trigger: 'new-evidence',
    now,
    today: TODAY,
  });
}

/** One studied lesson, recorded exactly as "Mark this lesson as studied"
    records it: mode practice, completion completed, outcome studied. Never
    a measurement, and never an item. */
function studied(record: LearnerRecordV1, activityId: string, paper: Paper, subskill: Subskill): LearnerRecordV1 {
  return appendAllEvidence(record, [
    createEvidenceEvent(
      {
        activityId,
        contentVersion: 1,
        at: LATER,
        localDate: TODAY,
        paper,
        subskill,
        mode: 'practice',
        completion: 'completed',
        assistance: 'none',
        seenBefore: false,
        outcome: { kind: 'studied', estimatedMinutes: 8 },
      },
      record,
    ),
  ]);
}

/** The plan as it stands the instant after the student presses "studied" on
    the session's first step: that step marked done, nothing else touched.
    This is what `completeStepsFromEvidence` does before the replan runs. */
function withFirstStepDone(plan: PersonalPlanV1): { plan: PersonalPlanV1; step: SessionStep } {
  const step = plan.activeSession.steps[0];
  assert.ok(step, 'the session should have at least one step');
  return {
    step,
    plan: {
      ...plan,
      revision: plan.revision + 1,
      activeSession: {
        ...plan.activeSession,
        steps: plan.activeSession.steps.map((entry) =>
          entry.stepId === step.stepId ? { ...entry, state: 'done' as const } : entry,
        ),
      },
    },
  };
}

const stepPrint = (plan: PersonalPlanV1): string[] =>
  plan.activeSession.steps.map((step) => `${step.role}|${step.activityId}|${step.minutes}|${step.state}`);

/* ── 1. A finished step stays finished ───────────────────────────────────── */

test('a step finished mid-session survives the replan that the new evidence triggers', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed);
  const before = stepPrint(plan);
  assert.equal(plan.activeSession.steps.length, 6, 'the audit seed is meant to produce a six-step hour');

  const { plan: started, step } = withFirstStepDone(plan);
  assert.equal(step.role, 'teach');
  const record = studied(seed.record, step.activityId, 'reading', 'exam-format');
  const after = replanFrom(seed, started, record);

  assert.equal(
    after.plan.activeSession.id,
    plan.activeSession.id,
    'the session lost its identity, so every step went back to pending',
  );
  assert.equal(after.plan.activeSession.steps.length, before.length, 'the session changed size under the student');
  const done = after.plan.activeSession.steps.filter((entry) => entry.state === 'done');
  assert.equal(done.length, 1, 'the finished step was not still marked done');
  assert.equal(done[0]?.activityId, step.activityId);
  assert.equal(after.plan.activeSession.steps[0]?.stepId, step.stepId, 'the finished step moved or was re-issued');
});

test('a studied-only event leaves the session byte-identical and writes no history line', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed);
  const { plan: started, step } = withFirstStepDone(plan);
  const record = studied(seed.record, step.activityId, 'reading', 'exam-format');
  const after = replanFrom(seed, started, record);

  assert.deepEqual(stepPrint(after.plan), stepPrint(started), 'the step list moved on a studied-only event');
  assert.deepEqual(after.changes, [], 'a studied click wrote a plan change the student cannot perceive');
  assert.deepEqual(after.plan.history, started.history, 'the history grew on a studied click');
});

test('the button reads Continue, and the day counts the finished minutes, once a step is done', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed);
  const { plan: started, step } = withFirstStepDone(plan);
  const record = studied(seed.record, step.activityId, 'reading', 'exam-format');
  const after = replanFrom(seed, started, record).plan;

  const view = sharedSessionFrom({ plan: after, catalogue: CATALOGUE });
  assert.ok(
    view.steps.some((entry) => entry.state !== 'pending'),
    'mainAction reads Continue off exactly this, so nothing may be pending-only here',
  );
  assert.equal(sessionMinutesSettled(view), step.minutes, 'the finished step contributed no minutes to the day');
  assert.ok(sessionMinutesSettled(view) > 0, '"0 / 60 min today" would still read zero');
});

test('the lesson that IS the current step offers the next step, and says so in the shared words', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed);
  const { plan: started, step } = withFirstStepDone(plan);
  const view = sharedSessionFrom({ plan: started, catalogue: CATALOGUE });

  const target = continueFor(view, step.activityId);
  assert.equal(target.kind, 'next-step', 'a finished step of today offered no continuation');
  assert.equal(target.labelKey, "Continue today's session");
  assert.notEqual(target.href, '/dashboard', 'the control went back to the dashboard instead of to the next step');
  const nextStep = started.activeSession.steps[1];
  assert.equal(target.next?.activityId, nextStep?.activityId, 'it did not point at the next waiting step');
});

test('a session under way never grows, and a pending step the plan no longer wants drops out', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed);
  const { plan: started } = withFirstStepDone(plan);

  /* A rebuild that wants one brand-new activity and has dropped one of the
     pending ones. Only the drop may take effect. */
  const kept = started.activeSession.steps.slice(0, 3);
  const rebuilt = {
    ...started.activeSession,
    id: 'sess:rebuilt',
    steps: [
      ...kept.map((step) => ({ ...step, state: 'pending' as const })),
      { ...kept[2]!, stepId: 'sess:rebuilt:9:practise', activityId: 'lesson:reading-paraphrase', minutes: 9 },
    ],
  };
  const carried = carryForwardSession({ previous: started, rebuilt, today: TODAY });

  assert.equal(carried.id, started.activeSession.id);
  assert.ok(
    !carried.steps.some((step) => step.activityId === 'lesson:reading-paraphrase'),
    'a brand-new step was bolted onto an hour already in progress',
  );
  assert.ok(
    carried.steps.length <= started.activeSession.steps.length,
    'the session grew while the student was working through it',
  );
  /* The two the rebuild stopped wanting are gone. The recap survives even
     though the rebuild names it only once, because a recap carries the
     practise step's own activity id: this is one activity in two roles, not
     a step the plan dropped. */
  const surviving = carried.steps.map((step) => step.activityId);
  assert.ok(!surviving.includes('check:practice-reading-headings'), 'a dropped step was kept anyway');
  assert.ok(!surviving.some((id) => id.startsWith('check:practice-listening')), 'a dropped step was kept anyway');
  assert.deepEqual(
    [...new Set(surviving)],
    [...new Set(kept.map((step) => step.activityId))],
    'the surviving steps are not the ones the rebuild still wanted',
  );
  assert.equal(carried.steps[0]?.state, 'done');
});

test('nothing is carried forward when the objective really moved, or when the day did', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed);
  const { plan: started } = withFirstStepDone(plan);

  const elsewhere = { ...started.activeSession, id: 'sess:other', objectiveScope: 'subskill:listening:tfng' as const };
  assert.equal(
    carryForwardSession({ previous: started, rebuilt: elsewhere, today: TODAY }).id,
    'sess:other',
    'a genuinely different objective must rebuild the whole session',
  );

  const tomorrow = { ...started.activeSession, id: 'sess:tomorrow', date: '2026-09-23' };
  assert.equal(
    carryForwardSession({ previous: started, rebuilt: tomorrow, today: '2026-09-23' }).id,
    'sess:tomorrow',
    'yesterday\'s finished steps must not follow the student into a new day',
  );

  const untouched = carryForwardSession({ previous: plan, rebuilt: elsewhere, today: TODAY });
  assert.equal(untouched.id, 'sess:other', 'a session nobody has touched has nothing to carry forward');
});

test('work already done today is never un-spent by a shorter day', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed);
  const { plan: started, step } = withFirstStepDone(plan);

  const shortDay = { ...started.activeSession, id: 'sess:short', budgetMinutes: 15, steps: started.activeSession.steps };
  const carried = carryForwardSession({ previous: started, rebuilt: shortDay, today: TODAY });

  assert.ok(carried.budgetMinutes >= step.minutes, 'the budget dropped below the minutes already spent');
  const total = carried.steps.reduce((sum, entry) => sum + entry.minutes, 0);
  assert.ok(total <= carried.budgetMinutes, 'the shortened session no longer fits its own budget');
  assert.equal(carried.steps[0]?.state, 'done', 'the finished step was dropped to make the day fit');
});

/* ── 1b. The same thing, through the real stores ─────────────────────────── */

/** A browser in a few lines of memory, the same harness
    tests/learning-plan-store.test.ts uses. */
function memoryStore(): BrowserStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

test.afterEach(() => resetLearningForTest());

/** The lead's reproduction end to end: seed the OLD stores, open Today,
 *  press Start (which opens the teach step's lesson), press "Mark this
 *  lesson as studied", come back to Today.
 *
 *  This goes through the real orchestration layer, so it also pins the gate
 *  in src/lib/learning/index.ts: a studied-only event does not change what
 *  is known, so `onEvidenceRecorded` must not replan at all. The direct
 *  tests above pin what happens if something else does trigger one. */
test('the lead\'s reproduction: mark the first lesson studied, and Today still shows it done', () => {
  resetLearningForTest();
  const saved = auditSavedPlan();
  const progress = auditProgress();
  configureLearning({
    storage: memoryStore(),
    owner: userOwner('SYNTHETIC-audit-returning'),
    now: () => NOW,
    today: () => TODAY,
    legacy: () => ({ progress, plan: saved }),
    legacyPlan: { read: () => saved, write: () => {} },
    /* No vocabulary deck under plain Node, which is also what the Worker
       gets. Switched off explicitly so the session is deterministic. */
    vocabulary: null,
  });

  const opened = ensurePlan();
  const first = opened.activeSession.steps[0];
  assert.ok(first, 'Today showed a session with no steps');
  assert.equal(first.role, 'teach');
  assert.equal(first.state, 'pending');
  const stepCount = opened.activeSession.steps.length;
  const lessonKey = first.activityId.replace(/^lesson:/, '');

  /* Exactly what the lesson page's own button does. */
  recordLessonStudied({ lessonKey, subskill: 'exam-format', paper: 'reading', estimatedMinutes: 8 });

  const session = getCurrentSession();
  assert.equal(session.sessionId, opened.activeSession.id, 'the session was replaced under the student');
  assert.equal(session.steps.length, stepCount, 'the session changed size');
  assert.equal(session.steps[0]?.state, 'done', 'the studied lesson is not shown as done');
  assert.equal(mainAction(session.steps), 'continue', 'the button still says Start over finished work');
  assert.equal(sessionMinutesSettled(session), first.minutes, 'the day still counts zero minutes');
  assert.equal(
    getCurrentSession().objective,
    opened.activeSession.objective,
    'the objective moved on a studied-only click',
  );
});

/* ── 2. Sent to the evident weakness, not to an unknown paper ────────────── */

test('the migrated audit student is sent to their Reading weakness, not to an unknown paper', () => {
  const seed = auditSeed();
  const policy = evaluateEvidence({ record: seed.record, goals: seed.goals, now: NOW });

  /* The condition that makes this a real reproduction: legacy evidence,
     capped at `limited`, with three papers never sampled. */
  const headings = policy.estimates.find((entry) => entry.scopeKey === 'subskill:reading:matching-headings');
  assert.equal(headings?.certainty, 'limited', 'the seed is meant to be migrated, detail-free evidence');
  assert.deepEqual([...policy.diagnosticsOutstanding], ['listening', 'writing', 'speaking']);

  const { plan } = planFrom(seed);
  assert.equal(plan.activeSession.objectiveScope, 'subskill:reading:matching-headings');
  assert.equal(plan.activeSession.paper, 'reading');
  assert.ok(plan.activeSession.reason.includes('Reading'), 'the reason did not name the paper');
  assert.ok(/2 of 16/.test(plan.activeSession.reason), 'the reason did not quote the evidence behind it');

  /* And the unknown papers are still sampled, by the step whose job that is. */
  const assess = plan.activeSession.steps.filter((step) => step.role === 'assess');
  assert.equal(assess.length, 1, 'a session carries exactly one staged first look');
  const sampled = findStepPaper(plan, assess[0]!.activityId);
  assert.ok(
    sampled !== undefined && policy.diagnosticsOutstanding.includes(sampled),
    'the first look was not for one of the papers nobody has sampled',
  );
});

function findStepPaper(plan: PersonalPlanV1, activityId: string): Paper | undefined {
  return CATALOGUE.activities.find((activity) => activity.id === activityId)?.paper;
}

test('a student with no evidence anywhere is still sent to find out where they are', () => {
  const profile = syntheticNew();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const facts = learnerFacts(profile.record, policy);
  assert.equal(hasSubstantiveWeakness(policy, facts), false, 'a blank slate cannot have a weakness');

  const { plan } = createInitialPlan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    now: profile.now,
    today: profile.today,
    goals: profile.goals,
    constraints: profile.constraints,
  });
  assert.ok(plan.activeSession.steps.some((step) => step.role === 'assess'));
  assert.ok(!/band|level/i.test(plan.activeSession.objective));
});

test('an unknown paper still wins when every known paper already meets its requirement', () => {
  const profile = syntheticLowestButMet();
  const pruned = withoutPapers(profile, ['listening', 'speaking']);
  const policy = evaluateEvidence({ record: pruned.record, goals: pruned.goals, now: pruned.now });
  const facts = learnerFacts(pruned.record, policy);
  assert.equal(
    hasSubstantiveWeakness(policy, facts),
    false,
    'every paper with evidence meets its own minimum, so nothing here is a weakness',
  );

  const { plan } = createInitialPlan({
    catalogue: CATALOGUE,
    record: pruned.record,
    policy,
    now: pruned.now,
    today: pruned.today,
    goals: pruned.goals,
    constraints: pruned.constraints,
  });
  assert.ok(
    plan.activeSession.paper !== undefined && policy.diagnosticsOutstanding.includes(plan.activeSession.paper),
    'with nothing left to fix, the session should be about the papers nobody has sampled',
  );
});

/** The same profile with two papers never sampled, which is what every
 *  student looks like before they have sat all four. The events are filtered
 *  rather than rebuilt so the remaining evidence is byte-identical to the
 *  shared fixture's, and the policy is recomputed from the events either
 *  way. */
function withoutPapers(profile: LearnerProfile, papers: readonly Paper[]): LearnerProfile {
  const drop = new Set(papers);
  return {
    ...profile,
    record: {
      ...profile.record,
      events: profile.record.events.filter((event) => !event.paper || !drop.has(event.paper)),
    },
  };
}

/* ── 3. The missed-day count is the real one ─────────────────────────────── */

test('the missed-day count is the real number of missed study days, not a capped one', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed);
  /* Nothing recorded inside any of the windows below, so every study day in
     them is genuinely a missed one. */
  const quiet = learnerFacts({ ...seed.record, events: [] }, evaluateEvidence({ record: seed.record, goals: seed.goals, now: NOW }));

  const cases = [
    { days: 1, from: '2026-09-21', daily: 1, weekdays: 1 },
    { days: 2, from: '2026-09-20', daily: 2, weekdays: 1 },
    { days: 5, from: '2026-09-17', daily: 5, weekdays: 3 },
    { days: 12, from: '2026-09-10', daily: 12, weekdays: 8 },
  ];
  for (const entry of cases) {
    const aged: PersonalPlanV1 = { ...plan, activeSession: { ...plan.activeSession, date: entry.from } };
    assert.equal(
      missedStudyDays(aged, quiet, { ...seed.constraints, studyDays: 'daily' }, [], TODAY),
      entry.daily,
      `a plan aged by exactly ${entry.days} days with daily study should say ${entry.daily}`,
    );
    assert.equal(
      missedStudyDays(aged, quiet, { ...seed.constraints, studyDays: 'weekdays' }, [], TODAY),
      entry.weekdays,
      `weekdays only, aged by ${entry.days} days, should say ${entry.weekdays}`,
    );
  }
});

test('a day with recorded work on it is never counted as missed', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed);
  const facts = learnerFacts(seed.record, evaluateEvidence({ record: seed.record, goals: seed.goals, now: NOW }));
  /* The seed really worked on 2026-09-19, inside this five-day window. */
  assert.ok(facts.activeDates.includes('2026-09-19'));
  const aged: PersonalPlanV1 = { ...plan, activeSession: { ...plan.activeSession, date: '2026-09-17' } };
  assert.equal(missedStudyDays(aged, facts, seed.constraints, [], TODAY), 4);
});

test('the count the plan tells the student survives the rebuild it caused', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed, { today: '2026-09-17', now: '2026-09-17T09:00:00.000Z' });
  const after = replan({
    catalogue: CATALOGUE,
    record: seed.record,
    policy: evaluateEvidence({ record: seed.record, goals: seed.goals, now: NOW }),
    previous: plan,
    trigger: 'new-day',
    now: NOW,
    today: TODAY,
  });

  assert.equal(after.plan.activeSession.date, TODAY, 'the rebuilt session is for today');
  assert.equal(after.plan.missedStudyDays, 4, 'the plan did not keep the count it rebuilt around');
  const view = sharedSessionFrom({ plan: after.plan, catalogue: CATALOGUE, missedStudyDays: after.plan.missedStudyDays });
  assert.equal(view.missedStudyDays, 4, 'Today would have told the student a different number');
});

/* ── 4. Only a perceivable change is written down ────────────────────────── */

test('"Today moves from X to X" is never written', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed);
  const { plan: started, step } = withFirstStepDone(plan);

  /* Every replan this seed can produce on the day, over a run of ordinary
     events, and not one of them may claim the objective moved to itself. */
  let record = studied(seed.record, step.activityId, 'reading', 'exam-format');
  const histories: string[] = [];
  for (const activityId of ['focus:writing-task1-overview-guided', 'lesson:speaking']) {
    record = studied(record, activityId, activityId.includes('writing') ? 'writing' : 'speaking', 'exam-format');
    const after = replanFrom(seed, started, record);
    histories.push(...after.changes.map((change) => change.summary));
  }

  for (const summary of histories) {
    const moves = /moves from (.+) to (.+?)\.\s/.exec(summary);
    if (!moves) continue;
    assert.notEqual(moves[1], moves[2], `a change entry announced a move to the same objective: ${summary}`);
  }
});

test('a change entry is written for a step list the student can see change, and for nothing less', () => {
  const seed = auditSeed();
  const { plan } = planFrom(seed);

  /* Same activities, one minute moved between two steps: nothing a student
     perceives, so nothing is written. */
  const nudged: PersonalPlanV1 = {
    ...plan,
    activeSession: {
      ...plan.activeSession,
      steps: plan.activeSession.steps.map((step, index) =>
        index === 0 ? { ...step, minutes: step.minutes - 1 } : index === 1 ? { ...step, minutes: step.minutes + 1 } : step,
      ),
    },
  };
  const quiet = replanFrom(seed, nudged, seed.record);
  for (const change of quiet.changes) {
    assert.ok(
      !/moves from/.test(change.summary),
      `a minute moved between two steps was announced as a change: ${change.summary}`,
    );
  }

  /* A different set of activities, same objective: that IS visible, and it
     is described as an adjustment rather than as a move. */
  const dropped: PersonalPlanV1 = {
    ...plan,
    activeSession: { ...plan.activeSession, steps: plan.activeSession.steps.slice(0, 2) },
  };
  const loud = replanFrom(seed, dropped, seed.record);
  assert.ok(loud.changes.length > 0, 'a visibly different set of steps was not recorded at all');
  assert.ok(
    loud.changes.every((change) => !/moves from/.test(change.summary)),
    'the same objective was described as moving',
  );
  assert.ok(
    loud.changes.some((change) => /steps were adjusted/.test(change.summary)),
    'the adjustment was not described in plain words',
  );
});

/* ── 5. Opposite profiles, with two papers unassessed and with all four ──── */

test('opposite profiles get different work and different reasons, each naming its own paper', () => {
  for (const papers of [[], ['listening', 'speaking']] as const) {
    const label = papers.length === 0 ? 'all four measured' : 'two papers unassessed';
    const a = planForProfile(withoutPapers(syntheticStrongReadingWeakWriting(), papers));
    const b = planForProfile(withoutPapers(syntheticWeakReadingStrongWriting(), papers));

    assert.notEqual(
      a.activeSession.objectiveScope,
      b.activeSession.objectiveScope,
      `[${label}] two opposite profiles were sent to the same objective`,
    );
    assert.equal(a.activeSession.paper, 'writing', `[${label}] the weak-Writing student should be on Writing`);
    assert.equal(b.activeSession.paper, 'reading', `[${label}] the weak-Reading student should be on Reading`);
    assert.notEqual(
      a.activeSession.reason,
      b.activeSession.reason,
      `[${label}] both students were given the same reason word for word`,
    );
    assert.ok(a.activeSession.reason.includes('Writing'), `[${label}] the reason did not name Writing`);
    assert.ok(b.activeSession.reason.includes('Reading'), `[${label}] the reason did not name Reading`);
    /* And each names the shortfall, not just the paper. */
    assert.ok(/\d/.test(a.activeSession.reason), `[${label}] the Writing reason quoted no number`);
    assert.ok(/\d/.test(b.activeSession.reason), `[${label}] the Reading reason quoted no number`);
  }
});

test('a paper measured well below its own minimum counts as a weakness, bands and all', () => {
  const profile = withoutPapers(syntheticStrongReadingWeakWriting(), ['listening', 'speaking']);
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const facts = learnerFacts(profile.record, policy);
  const writing = policy.gaps.find((gap) => gap.scopeKey === 'paper:writing');
  assert.ok(writing && !writing.meetsRequirement && (writing.shortfall ?? 0) >= 0.5);
  assert.equal(
    hasSubstantiveWeakness(policy, facts),
    true,
    'a whole paper a band under its minimum has no accuracy at all, and must still count',
  );
});

function planForProfile(profile: LearnerProfile): PersonalPlanV1 {
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
