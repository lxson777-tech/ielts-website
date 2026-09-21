/* The evidence policy: what it may conclude, and what it refuses to.
 *
 * Every learner in this file is SYNTHETIC. Each one is written to make one
 * rule visible, and no real student's work appears anywhere in it.
 *
 * The rules that matter most, and why:
 *   - the five levels of certainty are five different things, and the
 *     interface has to be able to tell them apart;
 *   - a completion click, an answer that needed a hint, and a perfect score
 *     on questions already seen all raise nothing;
 *   - a migrated row stays `limited` and a short diagnostic stays
 *     `tentative`, however much of either there is;
 *   - a partial exercise never sets a band, and an overall band is null
 *     until all four papers genuinely qualify;
 *   - Writing Task 1 and Task 2 are separate skills, and so are the
 *     Speaking parts;
 *   - a paper that meets the student's own minimum is not a gap, even when
 *     it is their lowest;
 *   - a blank submission is thrown out with a named reason and never becomes
 *     a confident weakness;
 *   - the same input always produces the same output, fingerprint included.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NO_GOALS_YET,
  evaluateEvidence,
  paperOfScope,
  policyFingerprint,
  recencyWeight,
  requiredBandFor,
  scopeFromKey,
  scopeKeyOf,
  toHalfBand,
} from '../src/lib/learning/policy.ts';
import {
  appendAllEvidence,
  createEvidenceEvent,
  emptyLearnerRecord,
  paperExposureKey,
  promptExposureKey,
  recordSelfReportedScore,
  type EvidenceDraft,
} from '../src/lib/learning/evidence.ts';
import type { ItemOutcome, LearnerRecordV1 } from '../src/lib/learning/contracts/evidence.ts';
import { WHOLE_ACTIVITY_SUBSKILL } from '../src/lib/learning/contracts/evidence.ts';
import type { Paper } from '../src/lib/learning/contracts/catalog.ts';
import type { PlanGoals } from '../src/lib/learning/contracts/plan.ts';
import type { AbilityEstimate, PolicyOutputV1 } from '../src/lib/learning/contracts/policy.ts';
import { DEFAULT_POLICY_THRESHOLDS } from '../src/lib/learning/contracts/policy.ts';
// Imported only to pin the rounding rule against the code that already
// implements it. Neither module may be imported by src/lib/learning itself.
import { toHalfBand as levelHalfBand } from '../src/lib/level.ts';
import { toBand as writingToBand } from '../src/lib/writing/schema.ts';

/* ── Synthetic fixtures ──────────────────────────────────────────────────── */

const NOW = '2026-09-21T12:00:00.000Z';

/** A day, as an instant and as the student's local date, so nothing in
    these tests depends on the machine's time zone. */
function day(date: string, hour = 9): { at: string; localDate: string } {
  return { at: `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`, localDate: date };
}

function items(prefix: string, correct: number, total: number, over: Partial<ItemOutcome> = {}): ItemOutcome[] {
  return Array.from({ length: total }, (_, index) => ({
    itemId: `${prefix}-q${index + 1}`,
    firstAnswer: 'B',
    correct: index < correct,
    assistance: 'none' as const,
    seenBefore: false,
    ...over,
  }));
}

/** SYNTHETIC: a whole timed Reading paper, sat unaided. */
function readingPaper(date: string, band: number, over: Partial<EvidenceDraft> = {}): EvidenceDraft {
  return {
    activityId: 'test:reading',
    contentVersion: 1,
    ...day(date),
    paper: 'reading',
    subskill: WHOLE_ACTIVITY_SUBSKILL,
    mode: 'assessment',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: {
      kind: 'scored',
      raw: 30,
      total: 40,
      bandEstimate: band,
      bySubskill: { 'matching-headings': { correct: 8, total: 10 } },
    },
    sourceMaterial: [paperExposureKey(`reading-${date}`)],
    ...over,
  };
}

/** SYNTHETIC: a whole timed Listening paper. */
function listeningPaper(date: string, band: number, over: Partial<EvidenceDraft> = {}): EvidenceDraft {
  return {
    ...readingPaper(date, band),
    activityId: 'test:listening',
    paper: 'listening',
    outcome: {
      kind: 'scored',
      raw: 28,
      total: 40,
      bandEstimate: band,
      bySubskill: { 'form-completion': { correct: 7, total: 10 } },
    },
    sourceMaterial: [paperExposureKey(`listening-${date}`)],
    ...over,
  };
}

/** SYNTHETIC: one AI-graded Writing submission, live grader. */
function gradedWriting(date: string, task: 'task1' | 'task2', band: number, over: Partial<EvidenceDraft> = {}): EvidenceDraft {
  return {
    activityId: 'trainer:writing',
    contentVersion: 1,
    ...day(date),
    paper: 'writing',
    subskill: WHOLE_ACTIVITY_SUBSKILL,
    taskScope: { kind: 'writing-task', task },
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: {
      kind: 'graded',
      overallBand: band,
      criteria: {
        taskResponse: band,
        coherenceCohesion: band,
        lexicalResource: band,
        grammaticalRange: band,
      },
      grader: { name: 'gpt-5.6-sol', live: true },
    },
    sourceMaterial: [promptExposureKey(`${task}-${date}`)],
    ...over,
  };
}

/** SYNTHETIC: one AI-graded Speaking part. */
function gradedSpeaking(date: string, part: 1 | 2 | 3, band: number, over: Partial<EvidenceDraft> = {}): EvidenceDraft {
  return {
    activityId: 'trainer:speaking',
    contentVersion: 1,
    ...day(date),
    paper: 'speaking',
    subskill: WHOLE_ACTIVITY_SUBSKILL,
    taskScope: { kind: 'speaking-part', part },
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: {
      kind: 'graded',
      overallBand: band,
      criteria: {
        fluencyCoherence: band,
        lexicalResource: band,
        grammaticalRange: band,
        pronunciation: band,
      },
      grader: { name: 'gpt-5.6-sol', live: true },
    },
    ...over,
  };
}

/** SYNTHETIC: a short focused set on one Reading question type. */
function headingsSet(date: string, correct: number, total: number, over: Partial<EvidenceDraft> = {}): EvidenceDraft {
  const prefix = `mh-${date}`;
  return {
    activityId: 'practise:reading:matching-headings',
    contentVersion: 1,
    ...day(date),
    paper: 'reading',
    subskill: 'matching-headings',
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: {
      kind: 'scored',
      raw: correct,
      total,
      bySubskill: { 'matching-headings': { correct, total } },
    },
    items: items(prefix, correct, total),
    ...over,
  };
}

/** SYNTHETIC: a completion click on a lesson page. */
function studiedClick(date: string, over: Partial<EvidenceDraft> = {}): EvidenceDraft {
  return {
    activityId: 'lesson:reading-matching-headings',
    contentVersion: 1,
    ...day(date),
    paper: 'reading',
    subskill: 'matching-headings',
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: { kind: 'studied', estimatedMinutes: 12 },
    ...over,
  };
}

function recordOf(...drafts: EvidenceDraft[]): LearnerRecordV1 {
  return appendAllEvidence(emptyLearnerRecord(), drafts.map((draft) => createEvidenceEvent(draft)));
}

function goalsOf(overall: number | null, minimums: Partial<Record<Paper, number>> = {}): PlanGoals {
  const perPaperMinimums: PlanGoals['perPaperMinimums'] = {};
  for (const [paper, band] of Object.entries(minimums)) {
    perPaperMinimums[paper as Paper] = { band: band as number, status: 'confirmed' };
  }
  return {
    overallTarget: overall === null ? null : { band: overall, status: 'confirmed' },
    perPaperMinimums,
    examDate: null,
    route: 'academic',
    selfReported: [],
  };
}

function run(record: LearnerRecordV1, goals: PlanGoals = NO_GOALS_YET, now = NOW): PolicyOutputV1 {
  return evaluateEvidence({ record, goals, now });
}

function estimate(output: PolicyOutputV1, key: string): AbilityEstimate {
  const found = output.estimates.find((entry) => entry.scopeKey === key);
  assert.ok(found, `no estimate for ${key}`);
  return found;
}

function gapFor(output: PolicyOutputV1, key: string) {
  const found = output.gaps.find((entry) => entry.scopeKey === key);
  assert.ok(found, `no gap for ${key}`);
  return found;
}

function ignoredCount(output: PolicyOutputV1, reason: string): number {
  return output.ignored.find((entry) => entry.reason === reason)?.count ?? 0;
}

/* ── Scope keys ──────────────────────────────────────────────────────────── */

test('a scope key survives a round trip, so a plan can store one', () => {
  const scopes = [
    { kind: 'paper', paper: 'reading' },
    { kind: 'writing-task', task: 'task1' },
    { kind: 'speaking-part', part: 2 },
    { kind: 'criterion', paper: 'writing', criterion: 'coherenceCohesion' },
    { kind: 'subskill', paper: 'listening', subskill: 'form-completion' },
    { kind: 'vocabulary' },
  ] as const;
  for (const scope of scopes) {
    assert.deepEqual(scopeFromKey(scopeKeyOf(scope)), scope);
  }
  assert.equal(scopeFromKey('nonsense:whatever'), null);
  assert.equal(paperOfScope({ kind: 'vocabulary' }), undefined);
});

/* ── The five levels ─────────────────────────────────────────────────────── */

test('five levels of certainty are all reachable, and they are five different things', () => {
  const unknown = run(emptyLearnerRecord());
  assert.equal(estimate(unknown, 'paper:reading').certainty, 'unknown');
  assert.equal(estimate(unknown, 'paper:reading').band, null);
  assert.equal(estimate(unknown, 'paper:reading').needsAssessment, true);

  const told = recordSelfReportedScore(emptyLearnerRecord(), {
    paper: 'reading',
    band: 6.5,
    takenOn: '2026-05-02',
    reportedAt: '2026-09-01T10:00:00.000Z',
  });
  assert.equal(estimate(run(told), 'paper:reading').certainty, 'self-reported');

  const migrated = recordOf(
    readingPaper('2026-09-10', 7, { provenance: 'legacy', contentVersion: undefined }),
    readingPaper('2026-09-14', 7, { provenance: 'legacy', contentVersion: undefined }),
  );
  assert.equal(estimate(run(migrated), 'paper:reading').certainty, 'limited');

  const once = recordOf(readingPaper('2026-09-14', 7));
  assert.equal(estimate(run(once), 'paper:reading').certainty, 'tentative');

  const twice = recordOf(readingPaper('2026-09-10', 7), readingPaper('2026-09-14', 7));
  const measured = estimate(run(twice), 'paper:reading');
  assert.equal(measured.certainty, 'measured');
  assert.equal(measured.band, 7);
  assert.deepEqual(measured.range, [6.5, 7.5]);
});

test('a migrated row can never rise above limited, however much of it there is', () => {
  const drafts = ['2026-09-05', '2026-09-08', '2026-09-11', '2026-09-14', '2026-09-17'].map((date) =>
    readingPaper(date, 7.5, { provenance: 'legacy', contentVersion: undefined }),
  );
  const output = run(recordOf(...drafts));
  const reading = estimate(output, 'paper:reading');
  assert.equal(reading.certainty, 'limited');
  assert.equal(reading.evidence.wholeAttempts, 5);
  // The number is still shown, because the work really happened. It is the
  // claim about it that is capped.
  assert.equal(reading.band, 7.5);
  assert.equal(output.overall, null, 'one paper of legacy rows is not an overall band');
});

test('a diagnostic sample can never rise above tentative', () => {
  const output = run(
    recordOf(
      readingPaper('2026-09-10', 6.5, { mode: 'diagnostic' }),
      readingPaper('2026-09-14', 6.5, { mode: 'diagnostic' }),
      readingPaper('2026-09-17', 6.5, { mode: 'diagnostic' }),
    ),
  );
  const reading = estimate(output, 'paper:reading');
  assert.equal(reading.certainty, 'tentative');
  assert.equal(reading.evidence.independentOccasions, 3);
});

/* ── What may never raise an estimate ────────────────────────────────────── */

test('a partial exercise never sets a band', () => {
  const output = run(
    recordOf(
      readingPaper('2026-09-10', 7, { completion: 'partial' }),
      readingPaper('2026-09-14', 7, { completion: 'partial' }),
    ),
  );
  const reading = estimate(output, 'paper:reading');
  assert.equal(reading.band, null);
  assert.equal(reading.evidence.wholeAttempts, 0);
  assert.equal(reading.certainty, 'limited');
});

test('a single-passage drill carries no band either, however well it went', () => {
  const output = run(recordOf(headingsSet('2026-09-14', 10, 10), headingsSet('2026-09-17', 10, 10)));
  assert.equal(estimate(output, 'paper:reading').band, null);
  assert.equal(estimate(output, 'subskill:reading:matching-headings').percent, 100);
  assert.equal(estimate(output, 'subskill:reading:matching-headings').band, null);
});

test('a completion click is studied, and moves no estimate', () => {
  const output = run(recordOf(studiedClick('2026-09-14'), studiedClick('2026-09-17')));
  const subskill = estimate(output, 'subskill:reading:matching-headings');
  assert.equal(subskill.certainty, 'unknown');
  assert.equal(subskill.percent, null);
  assert.equal(subskill.band, null);
  assert.equal(subskill.evidence.studiedOccasions, 2);
  assert.equal(subskill.evidence.independentItems, 0);
  assert.equal(subskill.needsAssessment, true);
});

test('an answer that needed a hint is guided practice, never a demonstration', () => {
  const hinted = (date: string) =>
    headingsSet(date, 10, 10, { assistance: 'hint', items: items(`mh-${date}`, 10, 10, { assistance: 'hint' }) });
  const output = run(recordOf(hinted('2026-09-10'), hinted('2026-09-14'), hinted('2026-09-17')));
  const subskill = estimate(output, 'subskill:reading:matching-headings');
  assert.equal(subskill.certainty, 'limited');
  assert.equal(subskill.percent, null, 'a hinted answer produces no accuracy figure');
  assert.equal(subskill.evidence.independentOccasions, 0);
  assert.equal(subskill.evidence.assistedOccasions, 3);
  assert.equal(subskill.evidence.assistedItems, 30);
});

test('a hinted question inside an unaided set still leaves the rest counting', () => {
  const mixed = headingsSet('2026-09-14', 10, 10, {
    assistance: 'hint',
    items: [...items('mh-a', 2, 2, { assistance: 'hint' }), ...items('mh-b', 8, 8)],
  });
  const subskill = estimate(run(recordOf(mixed)), 'subskill:reading:matching-headings');
  assert.equal(subskill.evidence.independentItems, 8);
  assert.equal(subskill.evidence.assistedItems, 2);
  assert.equal(subskill.percent, 100);
  // One sitting, and a sitting where help was used is not an independent
  // occasion however many of its questions were unaided.
  assert.equal(subskill.evidence.independentOccasions, 0);
  assert.notEqual(subskill.certainty, 'measured');
});

test('a perfect score on a set already seen raises nothing', () => {
  const seen = headingsSet('2026-09-14', 10, 10, {
    seenBefore: true,
    items: items('mh-seen', 10, 10, { seenBefore: true }),
  });
  const output = run(recordOf(seen));
  const subskill = estimate(output, 'subskill:reading:matching-headings');
  assert.equal(subskill.certainty, 'limited');
  assert.equal(subskill.percent, null);
  assert.equal(subskill.evidence.independentItems, 0);
  assert.equal(ignoredCount(output, 'repeat-of-seen-material'), 1);
});

test('one perfect familiar quiz is never measured, and carries no number to call mastery', () => {
  const familiar = headingsSet('2026-09-17', 8, 8, {
    seenBefore: true,
    items: items('mh-familiar', 8, 8, { seenBefore: true }),
  });
  const subskill = estimate(run(recordOf(familiar)), 'subskill:reading:matching-headings');
  assert.notEqual(subskill.certainty, 'measured');
  assert.equal(subskill.band, null);
  assert.equal(subskill.percent, null);
  // Eight right out of eight, and the honest count behind it is nothing:
  // there is no number here for a screen to dress up as mastery.
  assert.equal(subskill.evidence.independentItems, 0);
  assert.equal(subskill.evidence.independentCorrect, 0);
});

test('eight questions in one sitting is one occasion, not eight', () => {
  const oneSitting = run(recordOf(headingsSet('2026-09-17', 8, 8)));
  const single = estimate(oneSitting, 'subskill:reading:matching-headings');
  assert.equal(single.evidence.independentOccasions, 1);
  assert.equal(single.evidence.independentItems, 8);
  assert.equal(single.certainty, 'tentative', 'eight questions at one sitting is one occasion');

  const twoSittings = run(recordOf(headingsSet('2026-09-14', 4, 4), headingsSet('2026-09-17', 4, 4)));
  const spread = estimate(twoSittings, 'subskill:reading:matching-headings');
  assert.equal(spread.evidence.independentOccasions, 2);
  assert.equal(spread.evidence.independentItems, 8);
  assert.equal(spread.certainty, 'measured');
});

test('two sets inside the same sitting stay one occasion', () => {
  const first = headingsSet('2026-09-17', 4, 4);
  const second = { ...headingsSet('2026-09-17', 4, 4), at: '2026-09-17T09:20:00.000Z', items: items('mh-second', 4, 4) };
  const output = run(recordOf(first, second));
  const subskill = estimate(output, 'subskill:reading:matching-headings');
  assert.equal(subskill.evidence.independentOccasions, 1, 'twenty minutes later is the same sitting');
  assert.equal(subskill.evidence.independentItems, 8);
  assert.notEqual(subskill.certainty, 'measured');
});

test('a stub-graded essay produces no ability evidence at all', () => {
  const stub = gradedWriting('2026-09-14', 'task2', 7, {
    outcome: {
      kind: 'graded',
      overallBand: 7,
      criteria: { taskResponse: 7, coherenceCohesion: 7, lexicalResource: 7, grammaticalRange: 7 },
      grader: { name: 'offline-stub', live: false },
    },
  });
  const output = run(recordOf(stub));
  assert.equal(estimate(output, 'paper:writing').certainty, 'unknown');
  assert.equal(estimate(output, 'writing-task:task2').band, null);
  assert.equal(ignoredCount(output, 'stub-graded'), 1);
});

/* ── Self-reported ───────────────────────────────────────────────────────── */

test('a self-reported score is shown with its date and never mixed into a measured number', () => {
  const told = recordSelfReportedScore(
    recordOf(readingPaper('2026-09-10', 6), readingPaper('2026-09-14', 6)),
    { paper: 'reading', band: 8.5, takenOn: '2026-04-11', reportedAt: '2026-09-01T10:00:00.000Z' },
  );
  const output = run(told);
  const reading = estimate(output, 'paper:reading');
  assert.equal(reading.certainty, 'measured');
  assert.equal(reading.band, 6, 'the claim of 8.5 does not move the measured 6');
  assert.deepEqual(reading.selfReported, { band: 8.5, takenOn: '2026-04-11', reportedAt: '2026-09-01T10:00:00.000Z' });
  assert.deepEqual(output.selfReported, [
    { paper: 'reading', band: 8.5, takenOn: '2026-04-11', reportedAt: '2026-09-01T10:00:00.000Z' },
  ]);
});

test('a self-reported score alone never settles whether a requirement is met', () => {
  const told = recordSelfReportedScore(emptyLearnerRecord(), {
    paper: 'writing',
    band: 7,
    takenOn: '2026-04-11',
    reportedAt: '2026-09-01T10:00:00.000Z',
  });
  const output = run(told, goalsOf(6.5));
  assert.equal(estimate(output, 'paper:writing').certainty, 'self-reported');
  assert.equal(estimate(output, 'paper:writing').band, 7);
  assert.equal(gapFor(output, 'paper:writing').meetsRequirement, false);
  assert.equal(gapFor(output, 'paper:writing').shortfall, null);
});

/* ── The overall band ────────────────────────────────────────────────────── */

function allFourPapers(): LearnerRecordV1 {
  return recordOf(
    readingPaper('2026-09-10', 7),
    readingPaper('2026-09-14', 7),
    listeningPaper('2026-09-11', 6.5),
    listeningPaper('2026-09-15', 6.5),
    gradedWriting('2026-09-16', 'task2', 6),
    gradedSpeaking('2026-09-17', 2, 6),
  );
}

test('the overall band is null until all four papers qualify', () => {
  assert.equal(run(emptyLearnerRecord()).overall, null);
  assert.equal(run(recordOf(readingPaper('2026-09-14', 7))).overall, null);

  const three = recordOf(
    readingPaper('2026-09-10', 7),
    readingPaper('2026-09-14', 7),
    listeningPaper('2026-09-15', 6.5),
    gradedWriting('2026-09-16', 'task2', 6),
  );
  assert.equal(run(three).overall, null, 'Speaking has never been sampled, so there is no overall');

  const four = run(allFourPapers());
  assert.ok(four.overall, 'all four papers carry a whole attempt');
});

test('the overall band is the IELTS average of the four, rounded to the nearest half', () => {
  const output = run(allFourPapers());
  assert.ok(output.overall);
  // 7 + 6.5 + 6 + 6 = 25.5, over four is 6.375, which rounds up to 6.5.
  assert.equal(output.overall.band, 6.5);
  assert.equal(output.overall.certainty, 'tentative', 'the weakest of the four decides');
  assert.deepEqual(output.overall.range, [5.5, 7.5]);
});

test('a drill-only student has no overall band, however many drills they have done', () => {
  const drills = ['2026-09-05', '2026-09-08', '2026-09-11', '2026-09-14', '2026-09-17'].map((date) =>
    headingsSet(date, 9, 10),
  );
  const output = run(recordOf(...drills));
  assert.equal(output.overall, null);
  assert.equal(estimate(output, 'subskill:reading:matching-headings').certainty, 'measured');
});

/* ── Writing and Speaking are not one thing ──────────────────────────────── */

test('Writing Task 1 and Task 2 are estimated separately', () => {
  const output = run(
    recordOf(
      gradedWriting('2026-09-10', 'task1', 7),
      gradedWriting('2026-09-14', 'task1', 7),
      gradedWriting('2026-09-16', 'task2', 5.5),
    ),
  );
  assert.equal(estimate(output, 'writing-task:task1').band, 7);
  assert.equal(estimate(output, 'writing-task:task2').band, 5.5);
  assert.equal(estimate(output, 'writing-task:task1').certainty, 'measured');
  assert.equal(estimate(output, 'writing-task:task2').certainty, 'tentative');
});

test('Speaking parts are estimated separately, and one part is not the whole paper', () => {
  const output = run(recordOf(gradedSpeaking('2026-09-14', 2, 6), gradedSpeaking('2026-09-17', 2, 6)));
  assert.equal(estimate(output, 'speaking-part:2').certainty, 'measured');
  assert.equal(estimate(output, 'speaking-part:1').certainty, 'unknown');
  assert.equal(
    estimate(output, 'paper:speaking').certainty,
    'tentative',
    'two goes at Part 2 is not a measured Speaking paper',
  );
});

test('the four criteria are reported, and Task Achievement is not a fifth one', () => {
  const output = run(
    recordOf(
      gradedWriting('2026-09-14', 'task1', 6, {
        outcome: {
          kind: 'graded',
          overallBand: 6,
          criteria: { taskAchievement: 5, coherenceCohesion: 6, lexicalResource: 6, grammaticalRange: 7 },
          grader: { name: 'gpt-5.6-sol', live: true },
        },
      }),
    ),
  );
  const criteria = output.estimates.filter((entry) => entry.scope.kind === 'criterion' && entry.scope.paper === 'writing');
  assert.equal(criteria.length, 4);
  assert.equal(estimate(output, 'criterion:writing:taskResponse').band, 5);
  assert.equal(estimate(output, 'criterion:writing:grammaticalRange').band, 7);
});

/* ── Gaps against both targets ───────────────────────────────────────────── */

test('a paper that meets its own minimum is not a gap, even when it is the lowest', () => {
  // SYNTHETIC-lowest-but-met: target 6.5 overall, Writing minimum 5.5,
  // Writing measured at 5.5, everything else at 7.
  const record = recordOf(
    readingPaper('2026-09-10', 7),
    readingPaper('2026-09-14', 7),
    listeningPaper('2026-09-11', 7),
    listeningPaper('2026-09-15', 7),
    gradedWriting('2026-09-12', 'task1', 5.5),
    gradedWriting('2026-09-16', 'task2', 5.5),
    gradedSpeaking('2026-09-17', 2, 7),
  );
  const output = run(record, goalsOf(6.5, { writing: 5.5 }));

  const writing = gapFor(output, 'paper:writing');
  assert.equal(writing.requiredBand, 5.5);
  assert.equal(writing.shortfall, 0);
  assert.equal(writing.meetsRequirement, true, 'the lowest paper still meets its own minimum');
  assert.equal(writing.contributesToOverallShortfall, true, 'it is still what holds the average down');
  assert.equal(gapFor(output, 'paper:reading').requiredBand, 6.5, 'no minimum set, so the overall target applies');
  assert.equal(gapFor(output, 'paper:reading').meetsRequirement, true);
  assert.equal(requiredBandFor({ kind: 'paper', paper: 'writing' }, goalsOf(6.5, { writing: 5.5 })), 5.5);
});

test('a writing criterion at the required standard is not a serious gap', () => {
  const output = run(
    recordOf(
      gradedWriting('2026-09-14', 'task2', 6, {
        outcome: {
          kind: 'graded',
          overallBand: 6,
          criteria: { taskResponse: 6, coherenceCohesion: 5.5, lexicalResource: 6, grammaticalRange: 6.5 },
          grader: { name: 'gpt-5.6-sol', live: true },
        },
      }),
    ),
    goalsOf(6.5, { writing: 5.5 }),
  );
  const lowest = gapFor(output, 'criterion:writing:coherenceCohesion');
  assert.equal(lowest.requiredBand, 5.5);
  assert.equal(lowest.meetsRequirement, true, 'lowest of the four, and already at the required standard');
  assert.ok((lowest.shortfall ?? 0) <= 0);
});

test('opposite profiles produce opposite gap orderings', () => {
  const strongReading = run(
    recordOf(
      readingPaper('2026-09-10', 7.5),
      readingPaper('2026-09-14', 7.5),
      gradedWriting('2026-09-12', 'task1', 5.5),
      gradedWriting('2026-09-16', 'task2', 5.5),
    ),
    goalsOf(7, { writing: 6.5 }),
  );
  const strongWriting = run(
    recordOf(
      readingPaper('2026-09-10', 5.5),
      readingPaper('2026-09-14', 5.5),
      gradedWriting('2026-09-12', 'task1', 7.5),
      gradedWriting('2026-09-16', 'task2', 7.5),
    ),
    goalsOf(7, { writing: 6.5 }),
  );

  const papers = (output: PolicyOutputV1) =>
    output.gaps.filter((gap) => gap.scope.kind === 'paper' && gap.shortfall !== null).map((gap) => gap.scopeKey);

  assert.deepEqual(papers(strongReading), ['paper:writing', 'paper:reading']);
  assert.deepEqual(papers(strongWriting), ['paper:reading', 'paper:writing']);
  assert.equal(gapFor(strongReading, 'paper:writing').meetsRequirement, false);
  assert.equal(gapFor(strongWriting, 'paper:writing').meetsRequirement, true);
});

test('with no goal set, nothing is reported as a shortfall', () => {
  const output = run(recordOf(readingPaper('2026-09-14', 5)));
  assert.equal(gapFor(output, 'paper:reading').requiredBand, null);
  assert.equal(gapFor(output, 'paper:reading').shortfall, null);
  assert.equal(gapFor(output, 'paper:reading').meetsRequirement, false);
});

/* ── What is ignored, and why ────────────────────────────────────────────── */

test('a blank submission is ignored with a named reason and never becomes a weakness', () => {
  const blank = headingsSet('2026-09-14', 0, 10, {
    completion: 'blank',
    items: items('mh-blank', 0, 10, { firstAnswer: '' }),
  });
  const output = run(recordOf(blank));
  const subskill = estimate(output, 'subskill:reading:matching-headings');
  assert.equal(subskill.certainty, 'unknown');
  assert.equal(subskill.percent, null, 'nought per cent would be a confident weakness, and it is not one');
  assert.equal(subskill.evidence.independentItems, 0);
  assert.equal(ignoredCount(output, 'blank'), 1);
  assert.deepEqual(subskill.evidence.ignored, [{ reason: 'blank', count: 1 }]);
});

test('an abandoned paper is ignored with its own reason', () => {
  const output = run(recordOf(readingPaper('2026-09-14', 4, { completion: 'abandoned' })));
  assert.equal(estimate(output, 'paper:reading').certainty, 'unknown');
  assert.equal(ignoredCount(output, 'abandoned'), 1);
});

test('a simulated result is never evidence', () => {
  const output = run(recordOf(readingPaper('2026-09-14', 9, { provenance: 'simulated' })));
  assert.equal(estimate(output, 'paper:reading').certainty, 'unknown');
  assert.equal(ignoredCount(output, 'simulated'), 1);
});

test('evidence older than the stale window stops counting, and the report says so', () => {
  const old = readingPaper('2026-02-01', 8);
  const output = run(recordOf(old));
  assert.equal(estimate(output, 'paper:reading').certainty, 'unknown');
  assert.equal(estimate(output, 'paper:reading').band, null);
  assert.equal(ignoredCount(output, 'older-than-window'), 1);
  const reading = output.freshness.find((entry) => entry.paper === 'reading');
  assert.equal(reading?.state, 'stale', 'old work is stale, not absent');
  assert.ok((reading?.daysSinceLatest ?? 0) > DEFAULT_POLICY_THRESHOLDS.staleDays);
});

test('evidence past the freshness window is still counted, but no longer measured', () => {
  const output = run(recordOf(readingPaper('2026-08-01', 7), readingPaper('2026-08-05', 7)));
  const reading = estimate(output, 'paper:reading');
  assert.equal(reading.certainty, 'tentative', 'two papers, but seven weeks ago');
  assert.equal(reading.band, 7);
  assert.equal(output.freshness.find((entry) => entry.paper === 'reading')?.state, 'ageing');
});

test('a superseded event is ignored in favour of the one that replaced it', () => {
  const first = createEvidenceEvent(gradedWriting('2026-09-14', 'task2', 5, { pendingGrading: true }));
  const second = createEvidenceEvent(
    gradedWriting('2026-09-14', 'task2', 6.5, { supersedes: first.id, idempotencyKey: 'regrade' }),
  );
  const output = run(appendAllEvidence(emptyLearnerRecord(), [first, second]));
  assert.equal(estimate(output, 'writing-task:task2').band, 6.5);
  assert.equal(ignoredCount(output, 'superseded'), 1);
});

test('evidence about an older version of an activity is set aside, and says which', () => {
  const record = recordOf(headingsSet('2026-09-12', 9, 10), headingsSet('2026-09-16', 9, 10));
  const output = evaluateEvidence({
    record,
    now: NOW,
    contentVersions: { 'practise:reading:matching-headings': 2 },
  });
  assert.equal(estimate(output, 'subskill:reading:matching-headings').certainty, 'unknown');
  assert.equal(ignoredCount(output, 'stale-content-version'), 2);
});

test('work folded away by the local soft cap still counts, and never again as measured', () => {
  const folded: LearnerRecordV1 = {
    ...emptyLearnerRecord(),
    summaries: [
      {
        kind: 'evidence-summary',
        id: 'sum:synthetic',
        from: '2026-08-01T09:00:00.000Z',
        to: '2026-09-01T09:00:00.000Z',
        eventCount: 9,
        tallies: [
          {
            subskill: 'matching-headings',
            paper: 'reading',
            mode: 'practice',
            provenance: 'recorded',
            independentOccasions: 6,
            assistedOccasions: 2,
            independentItems: 60,
            correctItems: 48,
            studiedCount: 1,
            earliestAt: '2026-08-01T09:00:00.000Z',
            latestAt: '2026-09-01T09:00:00.000Z',
          },
        ],
      },
    ],
  };
  const subskill = estimate(run(folded), 'subskill:reading:matching-headings');
  assert.equal(subskill.evidence.independentOccasions, 6);
  assert.equal(subskill.evidence.independentItems, 60);
  assert.equal(subskill.evidence.assistedOccasions, 2);
  assert.equal(subskill.evidence.studiedOccasions, 1);
  assert.equal(subskill.certainty, 'limited', 'counts with no item detail can never be a demonstration again');
  assert.equal(subskill.percent, 80);
});

/* ── Vocabulary is not a paper ───────────────────────────────────────────── */

test('vocabulary is supporting knowledge, never a fifth paper', () => {
  const recall: EvidenceDraft = {
    activityId: 'review:vocabulary',
    contentVersion: 1,
    ...day('2026-09-17'),
    subskill: 'recall-from-meaning',
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: {
      kind: 'recall',
      reviewed: 10,
      correct: 9,
      words: [{ word: 'mitigate', correct: true, direction: 'recall' }],
    },
  };
  const output = run(recordOf(recall));
  const vocabulary = estimate(output, 'vocabulary');
  assert.equal(vocabulary.percent, 90);
  assert.equal(vocabulary.band, null, 'vocabulary has no band, because IELTS does not report one');
  assert.ok(!output.estimates.some((entry) => entry.scopeKey === 'paper:vocabulary'));
  assert.equal(output.freshness.length, 4, 'four papers, and vocabulary is not one of them');
});

/* ── Trends, freshness, review, teacher input ────────────────────────────── */

test('trends belong to one paper each and are never joined into one line', () => {
  const output = run(
    recordOf(
      readingPaper('2026-09-05', 5),
      readingPaper('2026-09-09', 6),
      readingPaper('2026-09-13', 6.5),
      readingPaper('2026-09-17', 7),
      listeningPaper('2026-09-06', 7),
      listeningPaper('2026-09-10', 6.5),
      listeningPaper('2026-09-14', 6),
      listeningPaper('2026-09-18', 5),
    ),
  );
  const reading = estimate(output, 'paper:reading');
  const listening = estimate(output, 'paper:listening');
  assert.ok(reading.trend !== null && reading.trend > 0, 'Reading is going up');
  assert.ok(listening.trend !== null && listening.trend < 0, 'Listening is going down');
  assert.notEqual(reading.trend, listening.trend);
  assert.equal(estimate(output, 'paper:writing').trend, null, 'no Writing evidence, so no Writing trend');
});

test('one result is never a trend', () => {
  const output = run(recordOf(readingPaper('2026-09-17', 7)));
  assert.equal(estimate(output, 'paper:reading').trend, null);
});

test('something demonstrated comes round again on the spacing ladder', () => {
  const output = run(recordOf(headingsSet('2026-08-20', 5, 5), headingsSet('2026-09-01', 5, 5)));
  const due = output.dueReview.find((entry) => entry.scopeKey === 'subskill:reading:matching-headings');
  assert.ok(due, 'two clean demonstrations, and the second spacing step has passed');
  assert.equal(due.dueOn, '2026-09-08', 'seven days after the last demonstration');
  assert.equal(due.activityId, 'practise:reading:matching-headings');
  assert.equal(due.daysSinceDemonstrated, 20);
});

test('something the student is failing is a gap, not a review', () => {
  const output = run(recordOf(headingsSet('2026-08-20', 1, 5), headingsSet('2026-09-01', 1, 5)));
  assert.equal(
    output.dueReview.some((entry) => entry.scopeKey === 'subskill:reading:matching-headings'),
    false,
  );
});

test('a scope that stops improving is flagged for teacher input', () => {
  const output = run(
    recordOf(headingsSet('2026-09-08', 2, 10), headingsSet('2026-09-12', 2, 10), headingsSet('2026-09-16', 2, 10)),
  );
  const flagged = output.needsTeacherInput.find((entry) => entry.scopeKey === 'subskill:reading:matching-headings');
  assert.ok(flagged, 'three unimproved goes is the provisional limit');
  assert.equal(flagged.consecutiveUnimprovedAttempts, DEFAULT_POLICY_THRESHOLDS.repeatedDifficultyLimit);
  assert.equal(flagged.since, '2026-09-08T09:00:00.000Z');
});

test('a scope that is improving is not flagged, however low it started', () => {
  const output = run(
    recordOf(headingsSet('2026-09-08', 1, 10), headingsSet('2026-09-12', 3, 10), headingsSet('2026-09-16', 5, 10)),
  );
  assert.deepEqual(output.needsTeacherInput, []);
});

test('strengths are measured and strong, and nothing weaker gets in', () => {
  const output = run(
    recordOf(headingsSet('2026-09-12', 10, 10), headingsSet('2026-09-16', 10, 10), headingsSet('2026-09-17', 4, 10, {
      paper: 'listening',
      subskill: 'form-completion',
      activityId: 'practise:listening:form-completion',
      outcome: { kind: 'scored', raw: 4, total: 10, bySubskill: { 'form-completion': { correct: 4, total: 10 } } },
      items: items('fc', 4, 10),
    })),
  );
  assert.ok(output.strengths.includes('subskill:reading:matching-headings'));
  assert.ok(!output.strengths.includes('subskill:listening:form-completion'));
});

test('the papers never touched are the diagnostics still owed', () => {
  const output = run(recordOf(readingPaper('2026-09-14', 7), studiedClick('2026-09-15', { paper: 'writing' })));
  assert.deepEqual(output.diagnosticsOutstanding, ['listening', 'writing', 'speaking']);
  assert.ok(output.unknownScopes.includes('paper:listening'));
  assert.ok(!output.unknownScopes.includes('paper:reading'));
});

/* ── The evidence version ────────────────────────────────────────────────── */

test('identical inputs produce an identical output, fingerprint included', () => {
  const record = allFourPapers();
  const a = run(record, goalsOf(7, { writing: 6.5 }));
  const b = run(record, goalsOf(7, { writing: 6.5 }));
  assert.deepEqual(a, b);
  assert.equal(a.fingerprint, b.fingerprint);
  assert.match(a.fingerprint, /^[0-9a-f]{32}$/);
  assert.equal(a.evidenceVersion, record.evidenceVersion);
  assert.equal(a.computedAt, NOW);
});

test('a meaningful new result changes the fingerprint', () => {
  const before = run(recordOf(readingPaper('2026-09-10', 7)));
  const after = run(recordOf(readingPaper('2026-09-10', 7), readingPaper('2026-09-14', 7)));
  assert.notEqual(before.fingerprint, after.fingerprint);
  assert.notEqual(estimate(before, 'paper:reading').certainty, estimate(after, 'paper:reading').certainty);
});

test('a completion click changes no ability estimate', () => {
  const worked = recordOf(readingPaper('2026-09-10', 7), readingPaper('2026-09-14', 7));
  const alsoStudied = appendAllEvidence(worked, [createEvidenceEvent(studiedClick('2026-09-18'))]);

  const ability = (output: PolicyOutputV1) =>
    output.estimates.map((entry) => ({
      key: entry.scopeKey,
      certainty: entry.certainty,
      band: entry.band,
      percent: entry.percent,
      trend: entry.trend,
      independentItems: entry.evidence.independentItems,
      independentOccasions: entry.evidence.independentOccasions,
    }));

  assert.deepEqual(ability(run(alsoStudied)), ability(run(worked)));
  assert.equal(estimate(run(alsoStudied), 'subskill:reading:matching-headings').evidence.studiedOccasions, 1);
});

test('the same record judged at two different instants ages, but does not wander', () => {
  const record = recordOf(readingPaper('2026-09-10', 7), readingPaper('2026-09-14', 7));
  const today = run(record, NO_GOALS_YET, NOW);
  const alsoToday = run(record, NO_GOALS_YET, NOW);
  assert.deepEqual(today, alsoToday);

  const laterSameDay = run(record, NO_GOALS_YET, '2026-09-21T23:00:00.000Z');
  assert.equal(laterSameDay.fingerprint, today.fingerprint, 'a few hours later is not new information');
  assert.equal(estimate(laterSameDay, 'paper:reading').band, estimate(today, 'paper:reading').band);
});

test('changing a threshold changes the fingerprint, so nothing cached survives it', () => {
  const record = recordOf(readingPaper('2026-09-10', 7), readingPaper('2026-09-14', 7));
  const standard = evaluateEvidence({ record, now: NOW });
  const stricter = evaluateEvidence({
    record,
    now: NOW,
    thresholds: { ...DEFAULT_POLICY_THRESHOLDS, bandMeasuredMinPapers: 4 },
  });
  assert.notEqual(standard.fingerprint, stricter.fingerprint);
  assert.equal(estimate(stricter, 'paper:reading').certainty, 'tentative');
});

/* ── The arithmetic ──────────────────────────────────────────────────────── */

test('the half-band rounding is the same rule the rest of the site already uses', () => {
  for (let raw = 0; raw <= 9.01; raw += 0.05) {
    const value = Math.round(raw * 100) / 100;
    assert.equal(toHalfBand(value), levelHalfBand(value), `level.ts disagrees at ${value}`);
    assert.equal(toHalfBand(value), writingToBand(value), `writing/schema.ts disagrees at ${value}`);
  }
  // The published overall rule: .25 rounds up to the next half band, .75 up
  // to the next whole one.
  assert.equal(toHalfBand(6.25), 6.5);
  assert.equal(toHalfBand(6.75), 7);
});

test('recency weighting fades and then stops, rather than fading for ever', () => {
  const thresholds = DEFAULT_POLICY_THRESHOLDS;
  assert.equal(recencyWeight(0, thresholds), 1);
  assert.ok(recencyWeight(1, thresholds) < recencyWeight(0, thresholds));
  assert.ok(recencyWeight(2, thresholds) < recencyWeight(1, thresholds));
  assert.equal(recencyWeight(thresholds.recentWindow, thresholds), 0);
});

test('the newest result leads the estimate without the older ones vanishing', () => {
  const rising = run(recordOf(readingPaper('2026-09-10', 6), readingPaper('2026-09-14', 7)));
  const band = estimate(rising, 'paper:reading').band;
  assert.ok(band !== null && band > 6 && band <= 7, `expected a band between the two, got ${band}`);
});

test('a fingerprint can be recomputed from the output it describes', () => {
  const output = run(allFourPapers(), goalsOf(7));
  const { fingerprint, ...shell } = output;
  assert.equal(policyFingerprint(shell, DEFAULT_POLICY_THRESHOLDS), fingerprint);
});
