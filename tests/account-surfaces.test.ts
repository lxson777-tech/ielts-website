/* WP9's pure helpers: the four separate skill trend panels on the progress
 * report (src/components/reportTrends.ts) and reconciling one of Mr EZ's
 * proposals into the plan (src/components/tutor/proposalReconcile.ts).
 *
 * Both files are pure, so both are pinned here with no store, no DOM and no
 * React. Every learner is SYNTHETIC, from tests/fixtures/learning-profiles.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import { PAPERS } from '../src/lib/learning/contracts/catalog.ts';
import { learningCatalogue } from '../src/lib/learning/catalog.ts';
import {
  CERTAINTY_LABEL,
  freshnessMessage,
  skillTrendPanels,
  trendDirectionKey,
} from '../src/components/reportTrends.ts';
import { reconcileProposal, scopeForActivity, scopeKeyOf } from '../src/components/tutor/proposalReconcile.ts';
import {
  PROFILE_IDS,
  syntheticLowestButMet,
  syntheticNew,
  syntheticStrongReadingWeakWriting,
} from './fixtures/learning-profiles.ts';

const CATALOGUE = learningCatalogue();

/* ── skillTrendPanels ─────────────────────────────────────────────────── */

test('skillTrendPanels always returns exactly the four papers, in order, and nothing else', () => {
  const profile = syntheticNew();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const panels = skillTrendPanels(policy);
  assert.deepEqual(panels.map((p) => p.paper), [...PAPERS]);
});

test('a paper with no evidence at all is reported unknown, never zero', () => {
  const profile = syntheticNew();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const panels = skillTrendPanels(policy);
  for (const panel of panels) {
    assert.equal(panel.certainty, 'unknown');
    assert.equal(panel.band, null);
    assert.equal(panel.range, null);
    assert.equal(panel.independentOccasions, 0);
  }
});

test('one panel never carries another paper\'s number: strong Reading and weak Writing stay apart', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const panels = skillTrendPanels(policy);
  const reading = panels.find((p) => p.paper === 'reading')!;
  const writing = panels.find((p) => p.paper === 'writing')!;

  assert.notEqual(reading.certainty, 'unknown');
  assert.notEqual(writing.certainty, 'unknown');
  assert.ok(reading.band !== null && reading.band > 7, 'reading is the strong one');
  assert.ok(writing.band !== null && writing.band < 6, 'writing is the weak one');
  // Neither range crosses into the other paper's territory: proof the two
  // were never averaged or otherwise mixed into one figure.
  assert.ok(reading.range![0] > writing.range![1]);
});

test('a paper that already meets its own minimum reports that plainly, even as the lowest number', () => {
  const profile = syntheticLowestButMet();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const panels = skillTrendPanels(policy);
  const writing = panels.find((p) => p.paper === 'writing')!;
  assert.equal(writing.requiredBand, 5.5);
  assert.equal(writing.meetsRequirement, true);
});

test('requiredBand and meetsRequirement are null together when no goal is set', () => {
  const profile = syntheticNew();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  for (const panel of skillTrendPanels(policy)) {
    assert.equal(panel.requiredBand, null);
    assert.equal(panel.meetsRequirement, null);
  }
});

/* ── Certainty and trend wording ─────────────────────────────────────── */

test('every certainty level the policy can produce has its own label', () => {
  const levels = ['unknown', 'self-reported', 'limited', 'tentative', 'measured'] as const;
  const labels = levels.map((level) => CERTAINTY_LABEL[level]);
  assert.equal(new Set(labels).size, levels.length, 'five distinct words, not five copies of one');
  for (const label of labels) assert.ok(label.length > 0);
});

test('freshnessMessage never invents a day count for a paper with no evidence', () => {
  const message = freshnessMessage({ paper: 'reading', daysSinceLatest: null, state: 'none' });
  assert.deepEqual(message, { kind: 'none' });
});

test('freshnessMessage carries the real day count and state once there is evidence', () => {
  const fresh = freshnessMessage({ paper: 'reading', daysSinceLatest: 3, state: 'fresh' });
  assert.deepEqual(fresh, { kind: 'fresh', days: 3 });
  const stale = freshnessMessage({ paper: 'reading', daysSinceLatest: 200, state: 'stale' });
  assert.deepEqual(stale, { kind: 'stale', days: 200 });
});

test('trendDirectionKey says nothing when there are too few samples to have a trend', () => {
  assert.equal(trendDirectionKey(null), null);
});

test('trendDirectionKey distinguishes improving, slipping and steady', () => {
  const improving = trendDirectionKey(0.5);
  const slipping = trendDirectionKey(-0.5);
  const steady = trendDirectionKey(0);
  assert.notEqual(improving, slipping);
  assert.notEqual(improving, steady);
  assert.notEqual(slipping, steady);
});

/* ── reconcileProposal ────────────────────────────────────────────────── */

test('a proposal naming the exact activity the student is already on matches the current session', () => {
  const result = reconcileProposal(
    'lesson:reading-headings',
    { activityId: 'lesson:reading-headings', objectiveScope: 'subskill:reading:matching-headings' },
    CATALOGUE,
  );
  assert.deepEqual(result, { state: 'matches-current' });
});

test('a proposal naming a different activity in the same objective still matches: it is not a duplicate', () => {
  const drill = CATALOGUE.activities.find((a) => a.id === PROFILE_IDS.headingsDrill);
  assert.ok(drill, 'fixture assumption: the drill id exists in the real catalogue');
  const scope = scopeForActivity(drill!);
  assert.ok(scope, 'fixture assumption: the drill resolves to a real scope');
  const scopeKey = scopeKeyOf(scope!);

  const result = reconcileProposal(
    drill!.id,
    { activityId: 'some:other:activity', objectiveScope: scopeKey },
    CATALOGUE,
  );
  assert.deepEqual(result, { state: 'matches-current' });
});

test('a real, different, schedulable activity is offered as reconcilable, with the scope chooseObjective needs', () => {
  const lesson = CATALOGUE.activities.find((a) => a.id === PROFILE_IDS.headingsLesson);
  assert.ok(lesson, 'fixture assumption: the headings lesson exists');

  const result = reconcileProposal(
    lesson!.id,
    { activityId: 'lesson:writing-task1', objectiveScope: 'subskill:writing:exam-format' },
    CATALOGUE,
  );
  assert.equal(result.state, 'reconcilable');
  if (result.state === 'reconcilable') {
    assert.equal(result.activityId, lesson!.id);
    assert.equal(result.scopeKey, `subskill:${lesson!.paper}:${lesson!.subskill}`);
  }
});

test('a vocabulary activity reconciles to the vocabulary scope, not a subskill', () => {
  const vocab = CATALOGUE.activities.find((a) => a.domain === 'vocabulary');
  assert.ok(vocab, 'fixture assumption: a vocabulary activity exists');

  const result = reconcileProposal(vocab!.id, null, CATALOGUE);
  assert.equal(result.state, 'reconcilable');
  if (result.state === 'reconcilable') assert.equal(result.scopeKey, 'vocabulary');
});

test('an id the model invented resolves to unresolvable rather than a guess', () => {
  const invented = reconcileProposal('lesson:this-does-not-exist', null, CATALOGUE);
  assert.deepEqual(invented, { state: 'unresolvable' });
});

test('a real catalogue activity with no paper (a reference page) is unresolvable too: the planner never turns it into an objective either', () => {
  const reference = CATALOGUE.activities.find((a) => a.id === 'tool:report');
  assert.ok(reference, 'fixture assumption: the progress-report reference activity exists');
  assert.equal(reference!.paper, undefined, 'fixture assumption: it carries no paper');
  const result = reconcileProposal('tool:report', null, CATALOGUE);
  assert.deepEqual(result, { state: 'unresolvable' });
});

test('with no current session at all, an exact match is impossible and a real activity is still reconcilable', () => {
  const lesson = CATALOGUE.activities.find((a) => a.id === PROFILE_IDS.headingsLesson)!;
  const result = reconcileProposal(lesson.id, null, CATALOGUE);
  assert.equal(result.state, 'reconcilable');
});
