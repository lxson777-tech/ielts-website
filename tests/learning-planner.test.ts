/* The planner: one plan, one current session, and nothing invented.
 *
 * Every learner in this file is SYNTHETIC and comes from
 * tests/fixtures/learning-profiles.ts.
 *
 * What these tests are really pinning:
 *   - the audit's five reproduced findings, especially the 255-minute day,
 *     the target that changed nothing and the expired plan that read as
 *     finished;
 *   - the brief's first ten verification scenarios, from a brand-new student
 *     with no invented level to voluntary practice updating the same plan;
 *   - stability: a replan that changes nothing returns the same session and
 *     writes no history, because the audit's other failure mode is a plan
 *     that moves under a working student;
 *   - the AI boundary: every refusal has a name, and a proposal the model
 *     was never offered is never accepted.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { learningCatalogue, findActivity } from '../src/lib/learning/catalog.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import {
  addLocalDays,
  createInitialPlan,
  defaultPlanConstraints,
  emptyPlanGoals,
  fill,
  goalMet,
  isStudyDay,
  liveOverrides,
  nextDiagnosticPaper,
  planFingerprint,
  proposalShortlist,
  replan,
  scoreObjectives,
  validatePlanProposal,
  PLANNER_SENTENCES,
  type PlannerInput,
} from '../src/lib/learning/planner.ts';
import { learnerFacts, sessionMinutes } from '../src/lib/learning/session.ts';
import {
  DAILY_MINUTE_CHOICES,
  DEFAULT_PLANNER_WEIGHTS,
  DIAGNOSTIC_MAX_MINUTES_PER_SESSION,
  PLAN_HISTORY_MAX,
  RECOMMENDED_DAILY_MINUTES,
  SCHEDULE_HORIZON_DAYS,
} from '../src/lib/learning/contracts/plan.ts';
import type { PersonalPlanV1, PlanGoals, PlanOverride } from '../src/lib/learning/contracts/plan.ts';
import type { LearnerRecordV1 } from '../src/lib/learning/contracts/evidence.ts';
import { DEFAULT_POLICY_THRESHOLDS } from '../src/lib/learning/contracts/policy.ts';
import { appendAllEvidence, createEvidenceEvent } from '../src/lib/learning/evidence.ts';
import {
  LEARNING_PROFILES,
  PROFILE_IDS,
  PROFILE_TODAY,
  daysAfter,
  daysBefore,
  syntheticBlank,
  syntheticExpired,
  syntheticLowestButMet,
  syntheticMatchingHeadings,
  syntheticMissedWeek,
  syntheticNew,
  syntheticRepeat,
  syntheticSevenDay,
  syntheticStrongReadingWeakWriting,
  syntheticStuck,
  syntheticWeakReadingStrongWriting,
  type LearnerProfile,
} from './fixtures/learning-profiles.ts';

const CATALOGUE = learningCatalogue();

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function planFor(profile: LearnerProfile, over: Partial<PlannerInput> = {}) {
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  return createInitialPlan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    now: profile.now,
    today: profile.today,
    goals: profile.goals,
    constraints: profile.constraints,
    ...over,
  });
}

function replanFor(profile: LearnerProfile, previous: PersonalPlanV1, over: Partial<PlannerInput> = {}) {
  const policy = evaluateEvidence({ record: profile.record, goals: over.goals ?? profile.goals, now: profile.now });
  return replan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    previous,
    trigger: 'new-evidence',
    now: profile.now,
    today: profile.today,
    ...over,
  });
}

function plannedMinutes(plan: PersonalPlanV1, date: string): number {
  const day = plan.schedule.find((entry) => entry.date === date);
  if (!day) return 0;
  if (date === plan.activeSession.date) return sessionMinutes(plan.activeSession);
  return day.activityIds.reduce((total, id) => total + (findActivity(id, CATALOGUE)?.expectedMinutes ?? 0), 0);
}

/* ── Scenario 1: a brand-new student ─────────────────────────────────────── */

test('a brand-new student gets no invented level, a useful first session and a route to all four papers', () => {
  const profile = syntheticNew();
  const { plan, changes } = planFor(profile);

  assert.equal(plan.goals.overallTarget, null, 'a target band was invented');
  assert.equal(plan.goals.examDate, null, 'an exam date was invented');
  assert.equal(plan.status, 'provisional-no-date');
  assert.equal(plan.confirmed, false);
  assert.deepEqual([...plan.diagnosticsOutstanding].sort(), ['listening', 'reading', 'speaking', 'writing']);

  const session = plan.activeSession;
  assert.ok(session.steps.length >= 3, 'a first session of one step is not a useful first session');
  assert.ok(
    session.steps.some((step) => step.role === 'practise'),
    'a first session that only reads lessons is not useful',
  );
  assert.ok(
    session.steps.filter((step) => step.role === 'assess').length <= 1,
    'a first session must not be a test battery',
  );
  assert.ok(sessionMinutes(session) <= session.budgetMinutes);
  assert.equal(changes.length, 1);
  assert.ok(changes[0]?.summary.length > 0);

  /* Every paper has somewhere to go: the outstanding diagnostics and the
     week ahead between them name all four. */
  const papers = new Set<string>(plan.diagnosticsOutstanding);
  for (const day of plan.schedule) {
    for (const id of day.activityIds) {
      const paper = findActivity(id, CATALOGUE)?.paper;
      if (paper) papers.add(paper);
    }
  }
  assert.deepEqual([...papers].sort(), ['listening', 'reading', 'speaking', 'writing']);
});

test('nothing a brand-new student is shown claims a band or a level', () => {
  const { plan } = planFor(syntheticNew());
  const text = [plan.activeSession.reason, plan.activeSession.objective, plan.scopeNote ?? ''].join(' ');
  for (const forbidden of ['band 7', 'your band', 'guarantee', 'mastery', 'mastered']) {
    assert.ok(!text.toLowerCase().includes(forbidden), `the plan said "${forbidden}"`);
  }
});

/* ── Scenario 2 and audit finding 2: targets and opposite profiles ───────── */

test('regression: opposite profiles get different objectives', () => {
  const strongReading = planFor(syntheticStrongReadingWeakWriting()).plan;
  const strongWriting = planFor(syntheticWeakReadingStrongWriting()).plan;

  assert.notEqual(
    strongReading.activeSession.objectiveScope,
    strongWriting.activeSession.objectiveScope,
    'two opposite profiles were sent to the same objective',
  );
  assert.equal(strongReading.activeSession.paper, 'writing');
  assert.equal(strongWriting.activeSession.paper, 'reading');
  for (const plan of [strongReading, strongWriting]) {
    assert.ok(plan.activeSession.reason.length > 0, 'the choice was not explained');
    assert.ok(plan.activeSession.evidenceRefs.length > 0, 'the explanation rests on no evidence');
  }
});

test('regression: changing the target changes the plan when the evidence warrants it', () => {
  const profile = syntheticLowestButMet();
  const modest = planFor(profile).plan;

  const demanding: PlanGoals = {
    ...profile.goals,
    overallTarget: { band: 9, status: 'confirmed' },
    perPaperMinimums: {
      reading: { band: 9, status: 'confirmed' },
      listening: { band: 9, status: 'confirmed' },
      writing: { band: 9, status: 'confirmed' },
      speaking: { band: 9, status: 'confirmed' },
    },
  };
  const stretched = planFor({ ...profile, goals: demanding }).plan;

  assert.notEqual(
    modest.activeSession.objectiveScope,
    stretched.activeSession.objectiveScope,
    'a target of 9 in every paper produced the same objective as 6.5 with a Writing minimum of 5.5',
  );
  assert.equal(stretched.activeSession.paper, 'writing', 'band 9 should point at the furthest paper');
});

test('the same task stays when it remains sensible, and the explanation is recorded either way', () => {
  const profile = syntheticMatchingHeadings();
  const first = planFor(profile).plan;

  /* A small target change that does not alter what is furthest behind. */
  const nudged: PlanGoals = { ...profile.goals, overallTarget: { band: 7.5, status: 'confirmed' } };
  const after = replanFor(profile, first, { goals: nudged, trigger: 'settings-changed' });

  assert.equal(
    after.plan.activeSession.objectiveScope,
    first.activeSession.objectiveScope,
    'the objective was churned even though the same work was still right',
  );
  assert.ok(after.changes.length > 0, 'a settings change must leave an explanation behind');
  assert.ok(after.plan.activeSession.reason.length > 0);
});

test('the audit Matching Headings student is sent to Matching Headings', () => {
  const { plan } = planFor(syntheticMatchingHeadings());
  assert.equal(plan.activeSession.objectiveScope, 'subskill:reading:matching-headings');
  assert.ok(plan.activeSession.reason.includes('Reading'));
  assert.ok(
    plan.activeSession.steps.some((step) => step.activityId === PROFILE_IDS.headingsLesson),
    'the headings lesson should be taught',
  );
});

/* ── Scenario 3: overall target and per-paper minimums ───────────────────── */

test('a paper that already meets its own minimum is not treated as a gap, even when it is the lowest', () => {
  const profile = syntheticLowestButMet();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const writing = policy.gaps.find((gap) => gap.scopeKey === 'paper:writing');
  assert.equal(writing?.meetsRequirement, true, 'the fixture is supposed to have Writing meeting its minimum');

  const { plan } = planFor(profile);
  const facts = learnerFacts(profile.record, policy);
  const scored = scoreObjectives({
    catalogue: CATALOGUE,
    facts,
    policy,
    goals: profile.goals,
    constraints: profile.constraints,
    overrides: [],
    today: profile.today,
    daysToExam: 40,
    budgetMinutes: 60,
    thresholds: DEFAULT_POLICY_THRESHOLDS,
    weights: DEFAULT_PLANNER_WEIGHTS,
    previous: null,
    status: plan.status,
  });
  for (const entry of scored) {
    if (entry.objective.paper !== 'writing') continue;
    assert.equal(entry.terms.gap, 0, 'a met minimum produced gap pressure anyway');
  }
});

/* ── Scenario 4: one hour ────────────────────────────────────────────────── */

test('sixty minutes is the recommended commitment for a new plan, and it is marked as a suggestion', () => {
  assert.equal(RECOMMENDED_DAILY_MINUTES, 60);
  const constraints = defaultPlanConstraints();
  assert.equal(constraints.regularDailyMinutes, 60);
  assert.equal(constraints.regularDailyMinutesStatus, 'provisional');
  assert.ok(DAILY_MINUTE_CHOICES.includes(60));

  const { plan } = planFor(syntheticNew());
  assert.equal(plan.constraints.regularDailyMinutes, 60);
  assert.equal(plan.activeSession.budgetMinutes, 60);
});

test('a setting the student really chose is carried through untouched', () => {
  const profile = syntheticNew({ constraints: { regularDailyMinutes: 40, regularDailyMinutesStatus: 'confirmed' } });
  const { plan } = planFor(profile);
  assert.equal(plan.constraints.regularDailyMinutes, 40);
  assert.equal(plan.constraints.regularDailyMinutesStatus, 'confirmed');

  const after = replanFor(profile, plan, { trigger: 'new-day' });
  assert.equal(after.plan.constraints.regularDailyMinutes, 40);
});

test('a sixty-minute session is a real hour of work, not one lesson', () => {
  const { plan } = planFor(syntheticMatchingHeadings());
  assert.ok(sessionMinutes(plan.activeSession) >= 30, 'an hour that plans half an hour is not using the hour');
  assert.ok(plan.activeSession.steps.length >= 3);
});

/* ── Scenario 5: a busy day ──────────────────────────────────────────────── */

test('a temporary short day is honoured and never rewrites the regular commitment', () => {
  const profile = syntheticMatchingHeadings();
  const { plan } = planFor(profile);
  assert.equal(plan.constraints.regularDailyMinutes, 60);

  const shortDay: PlanOverride = {
    kind: 'less-time-today',
    date: profile.today,
    minutes: 15,
    createdAt: profile.now,
  };
  const after = replanFor(profile, plan, { trigger: 'student-override', newOverrides: [shortDay] });

  assert.equal(after.plan.activeSession.budgetMinutes, 15);
  assert.ok(sessionMinutes(after.plan.activeSession) <= 15);
  assert.equal(after.plan.constraints.regularDailyMinutes, 60, 'the regular hour was overwritten');
  assert.equal(after.plan.constraints.regularDailyMinutesStatus, 'confirmed');
  assert.ok(after.changes.some((change) => change.summary.includes('15')));

  /* Tomorrow is a normal day again. */
  const tomorrow = after.plan.schedule.find((day) => day.date === addLocalDays(profile.today, 1));
  assert.equal(tomorrow?.budgetMinutes, 60);
});

test('an expired override is dropped rather than kept forever', () => {
  const stale: PlanOverride = { kind: 'less-time-today', date: daysBefore(3), minutes: 15, createdAt: PROFILE_TODAY };
  const live: PlanOverride = { kind: 'less-time-today', date: PROFILE_TODAY, minutes: 25, createdAt: PROFILE_TODAY };
  assert.deepEqual(liveOverrides([stale, live], PROFILE_TODAY), [live]);
});

/* ── Scenario 6 and audit finding 3: deadlines, recovery, expiry ─────────── */

test('regression: no scheduled day exceeds its budget, for any deadline from 3 to 90 days', () => {
  for (const budget of [15, 25, 60] as const) {
    for (let days = 3; days <= 90; days += 3) {
      const profile = syntheticNew({
        goals: { overallTarget: { band: 7, status: 'confirmed' }, examDate: { date: daysAfter(days), status: 'confirmed' } },
        constraints: { regularDailyMinutes: budget, regularDailyMinutesStatus: 'confirmed' },
      });
      const { plan } = planFor(profile);
      for (const day of plan.schedule) {
        assert.ok(
          day.budgetMinutes <= budget,
          `${days} days at ${budget}: day ${day.date} was given a budget of ${day.budgetMinutes}`,
        );
        const minutes = plannedMinutes(plan, day.date);
        assert.ok(
          minutes <= day.budgetMinutes,
          `${days} days at ${budget}: day ${day.date} plans ${minutes} minutes against ${day.budgetMinutes}`,
        );
        assert.ok(minutes < 255, 'the audit 255-minute day came back');
      }
    }
  }
});

test('seven days at fifteen minutes gives an honest scope and says what will not fit', () => {
  const profile = syntheticSevenDay();
  const { plan } = planFor(profile);

  assert.ok(sessionMinutes(plan.activeSession) <= 15);
  assert.ok(plan.scopeNote, 'a seven-day plan must say what fits');
  assert.ok(plan.scopeNote!.includes('105'), 'the honest total was not stated');
  assert.ok(plan.scopeNote!.includes('will not get real coverage'));
  assert.ok(!/guarantee|promise you|will reach band/i.test(plan.scopeNote!));
  for (const day of plan.schedule) assert.ok(day.budgetMinutes <= 15);
});

test('missed days produce a bounded recovery with one explained change and no growing backlog', () => {
  const profile = syntheticMissedWeek();
  const past = { ...profile, today: daysBefore(16), now: `${daysBefore(16)}T09:00:00.000Z` };
  const { plan: before } = planFor(past);

  const after = replanFor(profile, before, { trigger: 'new-day' });
  assert.equal(after.plan.status, 'recovering');
  assert.ok(
    after.changes.some((change) => change.summary.includes('missed')),
    'the recovery was not explained in plain words',
  );
  assert.ok(after.plan.scopeNote?.includes('missed'));

  /* Nothing is stacked on today, and the week is still a week. */
  assert.ok(sessionMinutes(after.plan.activeSession) <= after.plan.constraints.regularDailyMinutes);
  assert.equal(after.plan.schedule.length, SCHEDULE_HORIZON_DAYS);
  for (const day of after.plan.schedule) {
    assert.ok(day.budgetMinutes <= after.plan.constraints.regularDailyMinutes);
    assert.ok(plannedMinutes(after.plan, day.date) <= day.budgetMinutes);
  }
});

test('regression: an expired plan reports date-passed and never reads as finished', () => {
  const profile = syntheticExpired();
  const { plan } = planFor(profile);

  assert.equal(plan.status, 'date-passed');
  assert.notEqual(plan.status, 'goal-met');
  assert.equal(plan.activeSession.steps.length, 1);
  assert.equal(plan.activeSession.steps[0]?.activityId, 'tool:plan');
  assert.ok(plan.activeSession.reason.includes('passed'));
  assert.ok(!/complete|finished|congratulations|well done/i.test(plan.activeSession.objective));
  assert.ok(plan.scopeNote?.includes('Set a new date'));
  assert.deepEqual(plan.alternatives, []);
});

test('goal-met needs measured evidence and a confirmed target, so opening every page can never reach it', () => {
  const profile = syntheticNew();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  assert.equal(goalMet(profile.goals, policy), false);
  assert.equal(goalMet({ ...emptyPlanGoals(), overallTarget: { band: 5, status: 'confirmed' } }, policy), false);
});

/* ── Scenario 9: seen material and blanks ────────────────────────────────── */

test('blank submissions never become a measured finding the plan can act on', () => {
  const profile = syntheticBlank();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  assert.ok(policy.diagnosticsOutstanding.includes('reading'), 'two blank papers counted as knowing something');
  assert.ok(policy.ignored.some((entry) => entry.reason === 'blank'));

  const { plan } = planFor(profile);
  assert.ok(!/you answered \d+ of \d+/i.test(plan.activeSession.reason), 'a blank paper was quoted as evidence');
});

test('a repeated paper is never used as the independent check', () => {
  const profile = syntheticRepeat();
  const { plan } = planFor(profile);
  const facts = learnerFacts(
    profile.record,
    evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now }),
  );
  for (const step of plan.activeSession.steps) {
    if (step.role !== 'independent-check') continue;
    const activity = findActivity(step.activityId, CATALOGUE)!;
    for (const id of activity.sourcePaperIds ?? []) {
      assert.ok(!facts.seen.has(`paper:${id}`), `the check reuses ${id}, which has already been sat`);
    }
  }
});

/* ── Scenario 10: voluntary practice ─────────────────────────────────────── */

test('voluntary practice updates the same plan and never creates a second one', () => {
  const profile = syntheticMatchingHeadings();
  const { plan: before } = planFor(profile);

  const volunteered = createEvidenceEvent(
    {
      activityId: PROFILE_IDS.headingsLesson,
      contentVersion: 1,
      at: `${profile.today}T08:00:00.000Z`,
      localDate: profile.today,
      paper: 'reading',
      subskill: 'matching-headings',
      mode: 'practice',
      completion: 'completed',
      assistance: 'none',
      outcome: { kind: 'studied', estimatedMinutes: 12 },
    },
    profile.record,
  );
  const record: LearnerRecordV1 = appendAllEvidence(profile.record, [volunteered]);
  const after = replanFor({ ...profile, record }, before, { trigger: 'new-evidence' });

  assert.equal(after.plan.revision <= before.revision + 1, true, 'one voluntary activity bumped the plan twice');
  assert.equal(after.plan.evidenceVersion, record.evidenceVersion);
  assert.ok(after.plan.activeSession, 'there is still exactly one current session');
  assert.ok(after.plan.history.length <= PLAN_HISTORY_MAX);
  /* The lesson they just read is not handed back to them as teaching. */
  const taught = after.plan.activeSession.steps.filter(
    (step) => step.role === 'teach' && step.activityId === PROFILE_IDS.headingsLesson,
  );
  assert.equal(taught.length, 0, 'the plan told them to read what they had just read');
});

/* ── Stability ───────────────────────────────────────────────────────────── */

test('a replan that changes nothing returns the same session and writes no history', () => {
  const profile = syntheticMatchingHeadings();
  const { plan: before } = planFor(profile);
  const after = replanFor(profile, before, { trigger: 'new-evidence' });

  assert.equal(after.changes.length, 0, 'a no-op replan wrote to the change history');
  assert.equal(after.plan.activeSession.id, before.activeSession.id);
  assert.equal(after.plan.revision, before.revision, 'a no-op replan bumped the revision');
  assert.deepEqual(after.plan.activeSession.steps, before.activeSession.steps);
  assert.deepEqual(after.plan.history, before.history);
});

test('the incumbent objective survives a challenger that is not clearly better', () => {
  const profile = syntheticMatchingHeadings();
  const { plan: before } = planFor(profile);
  const nudged = { ...profile.goals, overallTarget: { band: 7, status: 'confirmed' as const } };
  const after = replanFor(profile, before, { goals: nudged, trigger: 'settings-changed' });
  assert.equal(after.plan.activeSession.objectiveScope, before.activeSession.objectiveScope);
});

test('the same input always produces the same plan', () => {
  for (const [name, make] of Object.entries(LEARNING_PROFILES)) {
    const first = planFor(make()).plan;
    const second = planFor(make()).plan;
    assert.equal(first.activeSession.id, second.activeSession.id, `${name} is not deterministic`);
    assert.equal(planFingerprint(first), planFingerprint(second), `${name} fingerprints differ`);
    assert.deepEqual(first.schedule, second.schedule);
    assert.deepEqual(first.milestones, second.milestones);
  }
});

/* ── Overrides ───────────────────────────────────────────────────────────── */

test('choosing another skill moves the plan to that paper and records the choice', () => {
  const profile = syntheticMatchingHeadings();
  const { plan: before } = planFor(profile);
  assert.equal(before.activeSession.paper, 'reading');

  const override: PlanOverride = {
    kind: 'chose-other-skill',
    date: profile.today,
    paper: 'listening',
    createdAt: profile.now,
  };
  const after = replanFor(profile, before, { trigger: 'student-override', newOverrides: [override] });
  assert.equal(after.plan.activeSession.paper, 'listening');
  assert.equal(after.plan.activeSession.chosenByStudent, true);
  assert.ok(after.changes.some((change) => change.summary.includes('Listening')));
});

test('accepting a longer commitment gives the day over to it and records it on the session', () => {
  const profile = syntheticMatchingHeadings();
  const { plan: before } = planFor(profile);
  const override: PlanOverride = {
    kind: 'accepted-longer-commitment',
    date: profile.today,
    activityId: 'test:reading-full-004',
    minutes: 60,
    createdAt: profile.now,
  };
  const after = replanFor(profile, before, { trigger: 'student-override', newOverrides: [override] });
  assert.equal(after.plan.activeSession.extendedCommitment?.activityId, 'test:reading-full-004');
  assert.equal(after.plan.activeSession.steps.length, 1);
  assert.ok(sessionMinutes(after.plan.activeSession) <= after.plan.activeSession.budgetMinutes);
  assert.ok(after.changes.some((change) => change.summary.includes('longer session')));
});

test('a deferred diagnostic is not scheduled and the paper stays openly unknown', () => {
  const profile = syntheticNew();
  const { plan: before } = planFor(profile);
  const sampled = before.activeSession.steps.find((step) => step.role === 'assess');
  assert.ok(sampled, 'the fixture is supposed to sample something');
  const paper = findActivity(sampled!.activityId, CATALOGUE)!.paper!;

  const override: PlanOverride = { kind: 'deferred-diagnostic', paper, createdAt: profile.now };
  const after = replanFor(profile, before, { trigger: 'student-override', newOverrides: [override] });

  for (const step of after.plan.activeSession.steps) {
    if (step.role !== 'assess') continue;
    assert.notEqual(findActivity(step.activityId, CATALOGUE)?.paper, paper);
  }
  assert.ok(after.plan.diagnosticsOutstanding.includes(paper), 'a deferred paper stopped being outstanding');
});

/* ── Staged diagnostics ──────────────────────────────────────────────────── */

test('diagnostics are staged: one short sample per session, capped, and never a battery', () => {
  const profile = syntheticNew();
  const { plan } = planFor(profile);
  const assess = plan.activeSession.steps.filter((step) => step.role === 'assess');
  assert.ok(assess.length <= 1);
  for (const step of assess) assert.ok(step.minutes <= DIAGNOSTIC_MAX_MINUTES_PER_SESSION);
});

test('the diagnostic order follows the paper the student says is hardest', () => {
  const chosen = nextDiagnosticPaper({
    outstanding: ['reading', 'listening', 'writing', 'speaking'],
    deferred: new Set(),
    goals: { ...emptyPlanGoals(), selfReportedHardestPaper: { paper: 'speaking', reportedAt: PROFILE_NOW_ISO } },
    record: { version: 1, evidenceVersion: 0, events: [], exposure: [], selfReported: [], migration: null },
    status: 'on-track',
  });
  assert.equal(chosen, 'speaking');
});

const PROFILE_NOW_ISO = '2026-09-22T09:00:00.000Z';

test('a paper the student says is hardest gets a small starting priority that real evidence overrides', () => {
  const base = syntheticNew({ goals: { overallTarget: { band: 7, status: 'confirmed' } } });
  const claimed = syntheticNew({
    goals: {
      overallTarget: { band: 7, status: 'confirmed' },
      selfReportedHardestPaper: { paper: 'listening', reportedAt: base.now },
    },
  });
  const plain = planFor(base).plan;
  const hinted = planFor(claimed).plan;
  assert.notEqual(
    plain.activeSession.objectiveScope,
    hinted.activeSession.objectiveScope,
    'what the student said about themselves changed nothing at all',
  );
  assert.equal(hinted.activeSession.paper, 'listening');

  /* Real evidence outranks it: the measured profile ignores the claim. */
  const measured = syntheticStrongReadingWeakWriting({
    goals: { selfReportedHardestPaper: { paper: 'listening', reportedAt: base.now } },
  });
  assert.equal(planFor(measured).plan.activeSession.paper, 'writing');
});

/* ── Repeated difficulty, lead decision Q2 ───────────────────────────────── */

test('after three unimproved tries the plan stops offering the same drill and says a teacher should look', () => {
  const profile = syntheticStuck();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  assert.ok(
    policy.needsTeacherInput.some((entry) => entry.scopeKey === 'subskill:reading:matching-headings'),
    'the fixture is supposed to be stuck on Matching Headings',
  );
  const { plan } = planFor(profile);
  assert.notEqual(
    plan.activeSession.objectiveScope,
    'subskill:reading:matching-headings',
    'a fourth variation of the failing drill was offered',
  );
  assert.ok(plan.scopeNote?.includes('worth a teacher looking at'));
});

/* ── The schedule and milestones ─────────────────────────────────────────── */

test('the schedule is a rolling week with today first and rest days respected', () => {
  const profile = syntheticMatchingHeadings({ constraints: { studyDays: 'weekdays' } });
  const { plan } = planFor(profile);
  assert.equal(plan.schedule.length, SCHEDULE_HORIZON_DAYS);
  assert.equal(plan.schedule[0]?.date, profile.today);
  for (const day of plan.schedule) {
    if (isStudyDay(day.date, plan.constraints, plan.overrides)) continue;
    assert.equal(day.kind, 'rest');
    assert.equal(day.budgetMinutes, 0);
    assert.deepEqual(day.activityIds, []);
  }
});

test('a whole paper in the week is followed by its own review day', () => {
  const profile = syntheticMatchingHeadings();
  const { plan } = planFor(profile, {
    newOverrides: [
      {
        kind: 'accepted-longer-commitment',
        date: profile.today,
        activityId: 'test:reading-full-004',
        minutes: 60,
        createdAt: profile.now,
      },
    ],
  });
  const review = plan.schedule.find((day) => day.kind === 'light-review');
  assert.ok(review, 'a whole paper was sat with no review session after it');
  assert.ok(review!.activityIds.includes('test:reading-full-004'));
});

test('milestones without an exam date carry no invented target date', () => {
  const { plan } = planFor(syntheticNew());
  for (const milestone of plan.milestones) assert.equal(milestone.targetDate, null);
  assert.ok(plan.milestones.length > 0);
});

test('a milestone that cannot fit before the exam is dropped and says why', () => {
  const profile = syntheticMatchingHeadings({
    goals: { examDate: { date: daysAfter(5), status: 'confirmed' } },
  });
  const { plan } = planFor(profile);
  const dropped = plan.milestones.filter((milestone) => milestone.state === 'dropped');
  for (const milestone of dropped) {
    assert.ok(milestone.droppedReason && milestone.droppedReason.length > 0);
  }
});

/* ── Alternatives ────────────────────────────────────────────────────────── */

test('every alternative is a real, buildable session sketch', () => {
  for (const [name, make] of Object.entries(LEARNING_PROFILES)) {
    const { plan } = planFor(make());
    for (const alternative of plan.alternatives) {
      assert.ok(alternative.label.length > 0, `${name}: an alternative with no label`);
      for (const id of alternative.sessionSketch.activityIds) {
        assert.ok(findActivity(id, CATALOGUE), `${name}: alternative names ${id}, which does not exist`);
      }
      if (alternative.kind === 'shorter') {
        assert.ok(
          alternative.sessionSketch.minutes < plan.activeSession.budgetMinutes,
          `${name}: the shorter option is not shorter`,
        );
      }
    }
  }
});

/* ── The AI boundary ─────────────────────────────────────────────────────── */

function proposalContext(profile: LearnerProfile) {
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const { plan } = planFor(profile);
  const shortlist = proposalShortlist({
    plan,
    record: profile.record,
    policy,
    catalogue: CATALOGUE,
    today: profile.today,
  });
  return { plan, policy, shortlist, profile };
}

test('the shortlist is small, real and every id in it can actually be scheduled', () => {
  const { plan, shortlist } = proposalContext(syntheticMatchingHeadings());
  assert.ok(shortlist.length > 0);
  assert.ok(shortlist.length <= 10);
  for (const activity of shortlist) {
    assert.ok(findActivity(activity.id, CATALOGUE));
    assert.equal(activity.unavailable, undefined);
  }
  const ids = shortlist.map((activity) => activity.id);
  assert.ok(
    plan.activeSession.steps.every((step) => ids.includes(step.activityId)),
    "the deterministic choice must be one the model can agree with",
  );
});

test('a proposal is accepted when it names something that was offered, and the disagreement is recorded', () => {
  const { plan, policy, shortlist, profile } = proposalContext(syntheticMatchingHeadings());
  const other = shortlist.find(
    (activity) => activity.id !== plan.activeSession.steps.find((step) => step.role === 'practise')?.activityId,
  );
  assert.ok(other, 'the shortlist should hold more than one thing');

  const verdict = validatePlanProposal({
    plan,
    record: profile.record,
    policy,
    catalogue: CATALOGUE,
    versions: { planRevision: plan.revision, evidenceVersion: policy.evidenceVersion, indexVersion: CATALOGUE.indexVersion },
    shortlist: shortlist.map((activity) => activity.id),
    proposedActivityId: other!.id,
    reason: 'SYNTHETIC model reason.',
    today: profile.today,
    at: profile.now,
  });
  assert.equal(verdict.accepted, true);
  if (verdict.accepted) {
    assert.equal(verdict.activity.id, other!.id);
    assert.ok(verdict.disagreement, 'a choice other than the deterministic one must be recorded');
    assert.equal(verdict.disagreement?.accepted, true);
    assert.equal(verdict.disagreement?.reason, 'SYNTHETIC model reason.');
  }
});

test('every way a proposal can be refused has a name and a plain sentence', () => {
  const { plan, policy, shortlist, profile } = proposalContext(syntheticMatchingHeadings());
  const ids = shortlist.map((activity) => activity.id);
  const fresh = {
    planRevision: plan.revision,
    evidenceVersion: policy.evidenceVersion,
    indexVersion: CATALOGUE.indexVersion,
  };
  const base = {
    plan,
    record: profile.record,
    policy,
    catalogue: CATALOGUE,
    shortlist: ids,
    today: profile.today,
    at: profile.now,
  };

  const cases: [string, Parameters<typeof validatePlanProposal>[0]][] = [
    ['stale-plan-revision', { ...base, versions: { ...fresh, planRevision: plan.revision - 1 }, proposedActivityId: ids[0]! }],
    ['stale-evidence-version', { ...base, versions: { ...fresh, evidenceVersion: policy.evidenceVersion - 1 }, proposedActivityId: ids[0]! }],
    ['stale-index-version', { ...base, versions: { ...fresh, indexVersion: 'not-the-index' }, proposedActivityId: ids[0]! }],
    ['malformed-response', { ...base, versions: fresh, proposedActivityId: null }],
    ['unknown-activity', { ...base, versions: fresh, proposedActivityId: 'lesson:does-not-exist' }],
    ['unavailable', { ...base, versions: fresh, proposedActivityId: 'practise:reading:sentence-endings' }],
    ['not-in-shortlist', { ...base, versions: fresh, proposedActivityId: 'lesson:speaking-part3' }],
    ['blocked-under-assessment', { ...base, versions: fresh, proposedActivityId: ids[0]!, underAssessment: true }],
  ];

  for (const [expected, input] of cases) {
    const verdict = validatePlanProposal(input);
    assert.equal(verdict.accepted, false, `${expected} was accepted`);
    if (!verdict.accepted) {
      assert.equal(verdict.rejection, expected);
      assert.ok(verdict.message.length > 0, `${expected} has no sentence`);
      assert.equal(verdict.disagreement.accepted, false);
      assert.equal(verdict.disagreement.rejection, expected);
    }
  }
});

test('a proposal that would not fit the day, or that the student skipped, is refused by name', () => {
  const profile = syntheticNew();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const { plan } = planFor(profile, {
    constraints: { ...profile.constraints, regularDailyMinutes: 15, regularDailyMinutesStatus: 'confirmed' },
  });
  const base = {
    plan,
    record: profile.record,
    policy,
    catalogue: CATALOGUE,
    today: profile.today,
    at: profile.now,
    versions: {
      planRevision: plan.revision,
      evidenceVersion: policy.evidenceVersion,
      indexVersion: CATALOGUE.indexVersion,
    },
  };

  const tooLong = validatePlanProposal({
    ...base,
    shortlist: ['test:reading-full-004'],
    proposedActivityId: 'test:reading-full-004',
  });
  assert.equal(tooLong.accepted, false);
  if (!tooLong.accepted) assert.ok(['over-budget', 'prerequisite-unmet'].includes(tooLong.rejection));

  const skippedId = plan.activeSession.steps[0]!.activityId;
  const skipped = validatePlanProposal({
    ...base,
    plan: {
      ...plan,
      overrides: [{ kind: 'skip-activity', activityId: skippedId, createdAt: profile.now }],
    },
    shortlist: [skippedId],
    proposedActivityId: skippedId,
  });
  assert.equal(skipped.accepted, false);
  if (!skipped.accepted) assert.equal(skipped.rejection, 'blocked-by-override');
});

/* ── Wording ─────────────────────────────────────────────────────────────── */

test('every sentence the planner can write avoids dashes and promises no band', () => {
  const sentences = Object.values(PLANNER_SENTENCES);
  for (const sentence of sentences) {
    assert.ok(!sentence.includes('—'), `em dash in: ${sentence}`);
    assert.ok(!sentence.includes('–'), `en dash in: ${sentence}`);
    assert.ok(!/guarantee|guaranteed|you will get band|promise you band/i.test(sentence), `a promise in: ${sentence}`);
    assert.ok(!/mastered|mastery/i.test(sentence), `a mastery claim in: ${sentence}`);
  }
  assert.equal(fill('{a} and {b}', { a: 'one', b: 'two' }), 'one and two');
  assert.equal(fill('{missing}'), '{missing}');
});

test('the reason and the evidence behind it are filled in for every profile', () => {
  for (const [name, make] of Object.entries(LEARNING_PROFILES)) {
    const { plan } = planFor(make());
    assert.ok(plan.activeSession.reason.length > 10, `${name}: no reason`);
    assert.ok(plan.activeSession.evidenceRefs.length > 0, `${name}: no evidence behind the reason`);
    for (const ref of plan.activeSession.evidenceRefs) {
      assert.ok(ref.evidence.length > 0, `${name}: an evidence reference with no sentence`);
    }
    for (const step of plan.activeSession.steps) {
      assert.ok(step.purpose.length > 0, `${name}: a step with no purpose`);
    }
  }
});
