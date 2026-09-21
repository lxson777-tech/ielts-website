/* WP22: checkpoints, the client-side assessment boundary, the mock exam's
 * honest summary rule, and deep-linking into the supporting libraries.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/checkpoints-and-libraries.test.ts
 * The whole suite is `npm test`.
 *
 * Every learner record built here is SYNTHETIC, labelled in each helper's
 * own name or comment. The catalogue and the generated index are the real
 * committed ones (the same choice tests/pilot-matching-headings.test.ts
 * makes): a checkpoint ranking is only meaningful against real papers, and
 * using the real index means these tests fail honestly the day a paper is
 * added, removed or reserved, instead of drifting from what the site
 * actually ships.
 *
 * WHAT IS BEING DEFENDED, roughly in deliverable order:
 *   1. checkpoints.ts: unseen papers rank first, a partly-drilled paper is
 *      labelled with its real seen share, a fully used paper is labelled
 *      seen, a paper reserved for a smaller independent check is not
 *      offered while a genuine alternative exists but becomes available
 *      once nothing else is, and the running-low count only counts genuine
 *      alternatives.
 *   2. tests-hub-checkpoints.ts: the hub agrees with whatever the plan has
 *      already queued, and never computes a competing opinion.
 *   3. session.ts (existing code, exercised here): a checkpoint session is
 *      the assess step alone, its review is owed separately, and sitting
 *      one really does move the evidence policy.
 *   4. mrez-boundary.ts: the same one flag blocks a timed paper, the mock
 *      and an independent check, and clears for review.
 *   5. mock-summary.ts: no overall band claim without all four papers
 *      really scored, which today means never, because Writing is never
 *      graded inside the mock.
 *   6. library-links.ts: deep-link reasons parse to a known key or nothing,
 *      and a model answer's "compare with your attempt" framing is honoured
 *      only once a real attempt exists.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { learningCatalogue, LEARNING_INDEX, findActivity } from '../src/lib/learning/catalog.ts';
import type { CatalogueActivity, GeneratedIndexV1, LearningCatalogueV1 } from '../src/lib/learning/contracts/catalog.ts';
import {
  appendAllEvidence,
  createEvidenceEvent,
  emptyLearnerRecord,
  itemExposureKey,
  paperExposureKey,
  type EvidenceDraft,
} from '../src/lib/learning/evidence.ts';
import { WHOLE_ACTIVITY_SUBSKILL } from '../src/lib/learning/contracts/evidence.ts';
import type { ItemOutcomeDraft } from '../src/lib/learning/evidence.ts';
import type { LearnerRecordV1 } from '../src/lib/learning/contracts/evidence.ts';
import {
  CHECKPOINT_REASON_SENTENCES,
  bestCheckpoint,
  checkpointReport,
  rankCheckpoints,
  unseenCheckpointsRemaining,
  type CheckpointCandidate,
} from '../src/lib/learning/checkpoints.ts';
import { evaluateEvidence, scopeKeyOf } from '../src/lib/learning/policy.ts';
import { emptyPlanGoals } from '../src/lib/learning/planner.ts';
import { assembleSession, learnerFacts, type PlannedObjective } from '../src/lib/learning/session.ts';
import { chatBlocked, BOUNDARY_EXPLANATION, BOUNDARY_PLACEHOLDER } from '../src/components/tutor/mrez-boundary.ts';
import { mockOverallAllowed } from '../src/components/mock-summary.ts';
import { canLinkModelAnswer, parseLibraryReason, LIBRARY_REASON_SENTENCES } from '../src/components/library-links.ts';
import {
  SKILLS,
  badgeClass,
  planCheckpointFor,
  recommendedCheckpoint,
  testIdFromActivityId,
} from '../src/components/learning/tests-hub-checkpoints.ts';
import type { SharedSessionView, SharedStepView } from '../src/lib/learning/adapters.ts';

const NOW = '2026-09-22T09:00:00.000Z';

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const CATALOGUE: LearningCatalogueV1 = learningCatalogue();
const INDEX: GeneratedIndexV1 = LEARNING_INDEX;

/** Every real reading test id the catalogue actually offers as a
    checkpoint, in the fixed order the index lists them. */
const READING_TEST_IDS = INDEX.tests.filter((t) => t.skill === 'reading').map((t) => t.id);

/** SYNTHETIC: an otherwise-empty learner record with exposure entries added
    directly, standing in for whatever mix of a drill, a lesson check or a
    focused exercise actually produced them. That mix is exercised at the
    event level in tests/learning-evidence.test.ts (addExposure, one entry
    per key regardless of the event's own shape); checkpoints.ts only ever
    reads the resulting exposure log, so testing it against exposure
    entries directly is testing the real thing, not a shortcut. */
function recordWithExposure(keys: readonly string[]): LearnerRecordV1 {
  const base = emptyLearnerRecord();
  return { ...base, exposure: keys.map((key) => ({ key, firstSeenAt: NOW, lastSeenAt: NOW, occasions: 1 })) };
}

/* ------------------------------------------------------------------ */
/* 1. checkpoints.ts                                                   */
/* ------------------------------------------------------------------ */

test('checkpoints: with nothing recorded, every real reading paper ranks unseen', () => {
  const ranking = rankCheckpoints('reading', CATALOGUE, INDEX, emptyLearnerRecord());
  assert.ok(ranking.length >= READING_TEST_IDS.length, 'every real reading paper should be a candidate');
  for (const candidate of ranking) assert.equal(candidate.status, 'unseen');
});

test('checkpoints: an unreserved unseen paper is recommended ahead of a reserved one', () => {
  const ranking = rankCheckpoints('reading', CATALOGUE, INDEX, emptyLearnerRecord());
  const reservedCount = ranking.filter((c) => c.reservedForChecks).length;
  assert.ok(reservedCount > 0, 'the fixture assumes at least one paper is reserved for a focused check (WP16)');
  assert.ok(reservedCount < ranking.length, 'the fixture assumes at least one paper is not reserved');

  const best = bestCheckpoint('reading', CATALOGUE, INDEX, emptyLearnerRecord());
  assert.ok(best);
  assert.equal(best!.reservedForChecks, false, 'a reserved paper must not be offered while an alternative exists');
  assert.equal(best!.reason.key, 'unseen');

  // Every reserved candidate sorts behind every unreserved unseen one.
  const firstReservedIndex = ranking.findIndex((c) => c.reservedForChecks);
  const lastUnreservedUnseenIndex = ranking
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.status === 'unseen' && !c.reservedForChecks)
    .map(({ i }) => i)
    .pop()!;
  assert.ok(firstReservedIndex > lastUnreservedUnseenIndex);
});

test('checkpoints: a paper partly met through practice is labelled with its real seen share', () => {
  const testId = READING_TEST_IDS[0]!;
  const entry = INDEX.tests.find((t) => t.id === testId)!;
  const half = entry.questionIds.slice(0, Math.ceil(entry.questionIds.length / 2));
  const record = recordWithExposure(half.map((qid) => itemExposureKey(`${testId}:${qid}`)));

  const status = checkpointReport('reading', CATALOGUE, INDEX, record).candidates.find((c) => c.testId === testId);
  assert.ok(status);
  assert.equal(status!.status, 'partly-seen');
  const expectedPercent = Math.round((half.length / entry.questionIds.length) * 100);
  assert.equal(status!.reason.key, 'partly-seen');
  assert.equal(status!.reason.vars?.percent, expectedPercent);
  assert.ok(status!.seenShare > 0 && status!.seenShare < 1);

  // A genuinely unseen paper still outranks it, as long as one exists.
  const best = bestCheckpoint('reading', CATALOGUE, INDEX, record)!;
  assert.notEqual(best.testId, testId);
  assert.equal(best.status, 'unseen');
});

test('checkpoints: a paper met item by item, and a paper met as a whole, both read as fully seen', () => {
  const [byItems, byWhole] = READING_TEST_IDS;
  assert.ok(byItems && byWhole && byItems !== byWhole);

  const itemsEntry = INDEX.tests.find((t) => t.id === byItems)!;
  const record = recordWithExposure([
    ...itemsEntry.questionIds.map((qid) => itemExposureKey(`${byItems}:${qid}`)),
    paperExposureKey(byWhole),
  ]);

  const ranking = rankCheckpoints('reading', CATALOGUE, INDEX, record);
  const seenByItems = ranking.find((c) => c.testId === byItems)!;
  const seenAsWhole = ranking.find((c) => c.testId === byWhole)!;
  for (const candidate of [seenByItems, seenAsWhole]) {
    assert.equal(candidate.status, 'seen');
    assert.equal(candidate.seenShare, 1);
    assert.equal(candidate.reason.key, 'seen');
  }
});

test('checkpoints: unseenCheckpointsRemaining counts only genuine (unreserved, unseen) alternatives', () => {
  const remaining = unseenCheckpointsRemaining('reading', CATALOGUE, INDEX, emptyLearnerRecord());
  const ranking = rankCheckpoints('reading', CATALOGUE, INDEX, emptyLearnerRecord());
  const expected = ranking.filter((c) => c.status === 'unseen' && !c.reservedForChecks).length;
  assert.equal(remaining, expected);
  assert.ok(remaining > 0);

  // Using up every unreserved unseen paper drops the count to zero, never
  // negative, and never counting a reserved paper as "remaining".
  const allUnreservedUnseen = ranking.filter((c) => c.status === 'unseen' && !c.reservedForChecks);
  const exhausted = recordWithExposure(allUnreservedUnseen.map((c) => paperExposureKey(c.testId)));
  assert.equal(unseenCheckpointsRemaining('reading', CATALOGUE, INDEX, exhausted), 0);
});

test('checkpoints: a reserved paper becomes usable once nothing else is unseen', () => {
  // A small hand-built catalogue and index, rather than spending every one
  // of the real papers, which would make this test both slow and unreadable.
  // Two reading papers: 'reserved-1' is reserved for a focused independent
  // check, 'plain-1' is not.
  const paperActivity = (testId: string): CatalogueActivity => ({
    id: `test:${testId}`,
    contentVersion: 1,
    kind: 'full-test',
    domain: 'reading',
    paper: 'reading',
    subskill: 'timing-and-transfer',
    objective: 'SYNTHETIC full paper for the checkpoints reservation test.',
    prerequisites: [],
    expectedMinutes: 60,
    indivisible: true,
    target: { kind: 'route', href: `/tests/${testId}` },
    completionEvidence: 'scored-paper',
    explanationLocales: ['en'],
    provenance: 'imported-paper',
    verified: true,
    sourcePaperIds: [testId],
    tags: ['unseen-reserved'],
  });
  const checkExercise: CatalogueActivity = {
    id: 'focus:synthetic-check',
    contentVersion: 1,
    kind: 'focused-exercise',
    domain: 'reading',
    paper: 'reading',
    subskill: 'matching-headings',
    objective: 'SYNTHETIC independent check reserving reserved-1.',
    prerequisites: [],
    expectedMinutes: 8,
    indivisible: false,
    target: { kind: 'task', taskId: 'synthetic', indexRef: { section: 'focusedExercises', id: 'synthetic' } },
    completionEvidence: 'scored-items',
    explanationLocales: ['en'],
    provenance: 'project-authored',
    verified: true,
    sourcePaperIds: ['reserved-1'],
    tags: ['unseen-reserved', 'check-only'],
  };
  const catalogue: LearningCatalogueV1 = {
    version: 1,
    indexVersion: 'synthetic',
    catalogueVersion: 'synthetic',
    activities: [paperActivity('reserved-1'), paperActivity('plain-1'), checkExercise],
  };
  const index: GeneratedIndexV1 = {
    version: 1,
    indexVersion: 'synthetic',
    tests: [
      { id: 'reserved-1', skill: 'reading', title: 'Reserved 1', byType: {}, questionIds: ['q1', 'q2'], durationMinutes: 60, provenance: 'imported-paper' },
      { id: 'plain-1', skill: 'reading', title: 'Plain 1', byType: {}, questionIds: ['q1', 'q2'], durationMinutes: 60, provenance: 'imported-paper' },
    ],
    drills: [],
    lessonChecks: [],
    focusedExercises: [],
    writingPrompts: [],
    speakingPrompts: [],
    vocabTopics: [],
    questionTypes: [],
  };

  // Nothing recorded: the plain paper wins, the reserved one is not offered.
  const fresh = bestCheckpoint('reading', catalogue, index, emptyLearnerRecord())!;
  assert.equal(fresh.testId, 'plain-1');
  assert.equal(unseenCheckpointsRemaining('reading', catalogue, index, emptyLearnerRecord()), 1);

  // Once the only unreserved paper is used up, the reserved one becomes the
  // recommendation rather than falling through to "seen" or "nothing".
  const plainUsed = recordWithExposure([paperExposureKey('plain-1')]);
  const fallback = bestCheckpoint('reading', catalogue, index, plainUsed)!;
  assert.equal(fallback.testId, 'reserved-1');
  assert.equal(fallback.status, 'unseen');
  assert.equal(fallback.reason.key, 'unseen-reserved');
  assert.equal(unseenCheckpointsRemaining('reading', catalogue, index, plainUsed), 0);
});

test('checkpoints: every reason key has a sentence to translate', () => {
  const ranking = rankCheckpoints('reading', CATALOGUE, INDEX, emptyLearnerRecord());
  for (const candidate of ranking) {
    assert.ok(CHECKPOINT_REASON_SENTENCES[candidate.reason.key], candidate.reason.key);
  }
});

/* ------------------------------------------------------------------ */
/* 2. tests-hub-checkpoints.ts: the hub agrees with the shared session  */
/* ------------------------------------------------------------------ */

function fakeStep(over: Partial<SharedStepView>): SharedStepView {
  return {
    stepId: 'step-1',
    role: 'assess',
    activityId: 'test:reading-full-001',
    kind: 'full-test',
    paper: 'reading',
    subskill: 'timing-and-transfer',
    minutes: 60,
    purpose: 'SYNTHETIC',
    state: 'pending',
    href: '/tests/reading-full-001',
    objective: 'SYNTHETIC',
    indivisible: true,
    lessonKey: null,
    title: null,
    ...over,
  };
}

function fakeSession(steps: readonly SharedStepView[]): SharedSessionView {
  return {
    sessionId: 'session-1',
    date: '2026-09-22',
    objective: 'SYNTHETIC',
    objectiveScope: 'paper:reading',
    reason: 'SYNTHETIC',
    paper: 'reading',
    subskill: 'timing-and-transfer',
    budgetMinutes: 60,
    state: 'active',
    steps,
    current: steps[0] ?? null,
    activityId: steps[0]?.activityId ?? null,
    planStatus: 'on-track',
    planRevision: 1,
    evidenceVersion: 0,
    confirmed: true,
    targetBand: null,
    examDate: null,
    regularDailyMinutes: 60,
    scopeNote: null,
    missedStudyDays: 0,
    derived: false,
  };
}

test('tests-hub-checkpoints: when the plan has queued a real checkpoint, the hub shows that exact paper', () => {
  const ranking = rankCheckpoints('reading', CATALOGUE, INDEX, emptyLearnerRecord());
  // Deliberately NOT the top of the ranking, so the test cannot pass by
  // accident: the plan's own choice must win even when it disagrees with
  // what a fresh computation would have recommended.
  const queued = ranking[ranking.length - 1]!;
  const session = fakeSession([fakeStep({ activityId: `test:${queued.testId}` })]);

  const planned = planCheckpointFor(session, 'reading');
  assert.equal(planned?.activityId, `test:${queued.testId}`);
  assert.equal(testIdFromActivityId(planned!.activityId), queued.testId);

  const recommended = recommendedCheckpoint(session, 'reading', ranking);
  assert.equal(recommended?.candidate.testId, queued.testId);
  assert.equal(recommended?.fromPlan, true);
});

test('tests-hub-checkpoints: with no plan step for this skill, the hub falls back to its own top ranking', () => {
  const ranking = rankCheckpoints('reading', CATALOGUE, INDEX, emptyLearnerRecord());
  // A session whose only step is for a different skill.
  const session = fakeSession([fakeStep({ activityId: 'test:listening-full-001', paper: 'listening' })]);
  assert.equal(planCheckpointFor(session, 'reading'), null);

  const recommended = recommendedCheckpoint(session, 'reading', ranking);
  assert.equal(recommended?.candidate.testId, ranking[0]!.testId);
  assert.equal(recommended?.fromPlan, false);
});

test('tests-hub-checkpoints: the mock and the generic hub links never count as a queued checkpoint', () => {
  const ranking = rankCheckpoints('reading', CATALOGUE, INDEX, emptyLearnerRecord());
  const session = fakeSession([fakeStep({ activityId: 'test:mock' })]);
  assert.equal(planCheckpointFor(session, 'reading'), null);
  assert.equal(recommendedCheckpoint(session, 'reading', ranking)?.fromPlan, false);
  // testIdFromActivityId on the generic hub link resolves to something that
  // will never match a real candidate's testId, which is the point.
  assert.equal(testIdFromActivityId('test:reading'), 'reading');
  assert.ok(!ranking.some((c) => c.testId === 'reading'));
});

test('tests-hub-checkpoints: badgeClass has a distinct class for each status', () => {
  const classes = new Set((['unseen', 'partly-seen', 'seen'] as const).map(badgeClass));
  assert.equal(classes.size, 3);
});

/* ------------------------------------------------------------------ */
/* 3. session.ts: sitting a checkpoint, and what it changes             */
/* (existing code, owned by WP5; exercised here rather than modified)   */
/* ------------------------------------------------------------------ */

test('session: a checkpoint session is the assess step alone, and its review is owed as a separate step', () => {
  // A checkpoint's own prerequisite (the paper's overview lesson) has to be
  // satisfied first, the same as it would be for a real student who has
  // read the overview before ever being offered a full sitting. Found from
  // the real checkpoint activity itself rather than hard-coded, so a rename
  // of the overview lesson cannot make this test pass for the wrong reason.
  const anyReadingPaper = CATALOGUE.activities.find(
    (a) => a.kind === 'full-test' && a.paper === 'reading' && (a.sourcePaperIds ?? []).length === 1,
  )!;
  const overviewId = anyReadingPaper.prerequisites[0]!;
  const overviewDone = createEvidenceEvent({
    activityId: overviewId,
    contentVersion: 1,
    at: '2026-09-01T09:00:00.000Z',
    subskill: 'exam-format',
    mode: 'practice',
    completion: 'completed',
    outcome: { kind: 'studied', estimatedMinutes: 5 },
  });
  const record = appendAllEvidence(emptyLearnerRecord(), [overviewDone]);
  const goals = emptyPlanGoals();
  const policy = evaluateEvidence({ record, goals, now: NOW });
  const facts = learnerFacts(record, policy);

  const objective: PlannedObjective = {
    scope: { kind: 'paper', paper: 'reading' },
    scopeKey: scopeKeyOf({ kind: 'paper', paper: 'reading' }),
    paper: 'reading',
    subskill: 'timing-and-transfer',
    objective: 'SYNTHETIC: sit a checkpoint.',
    reason: 'SYNTHETIC',
    evidenceRefs: [],
    intent: 'assess',
  };

  const assembled = assembleSession({
    catalogue: CATALOGUE,
    record,
    policy,
    facts,
    objective,
    budgetMinutes: 60,
    today: '2026-09-22',
    overrides: [],
  });

  assert.equal(assembled.session.steps.length, 1, 'a checkpoint is not padded with anything else');
  assert.equal(assembled.session.steps[0]!.role, 'assess');
  assert.ok(assembled.reviewNeeded, 'a whole paper owes a review');
  assert.equal(assembled.reviewNeeded!.activityId, assembled.session.steps[0]!.activityId);
  // Reading forty explanations is its own session: the budget assertion in
  // finish() already guarantees the review step is not smuggled into this
  // one, since there is only one step at all.
});

test('policy: a scored, unaided full paper moves the reading estimate off unknown', () => {
  const scopeKey = scopeKeyOf({ kind: 'paper', paper: 'reading' });
  const before = evaluateEvidence({ record: emptyLearnerRecord(), goals: emptyPlanGoals(), now: NOW });
  const beforeEstimate = before.estimates.find((e) => e.scopeKey === scopeKey);
  assert.equal(beforeEstimate?.certainty, 'unknown');

  // SYNTHETIC: a whole timed Reading paper, sat unaided, on unseen material.
  const items: ItemOutcomeDraft[] = Array.from({ length: 40 }, (_, i) => ({
    itemId: `SYNTHETIC-checkpoint-sitting-q${i + 1}`,
    firstAnswer: 'B',
    correct: i < 30,
    assistance: 'none',
  }));
  const draft: EvidenceDraft = {
    activityId: 'test:reading',
    contentVersion: 1,
    at: NOW,
    paper: 'reading',
    subskill: WHOLE_ACTIVITY_SUBSKILL,
    mode: 'assessment',
    completion: 'completed',
    assistance: 'none',
    outcome: { kind: 'scored', raw: 30, total: 40, bandEstimate: 7, bySubskill: {} },
    items,
    sourceMaterial: [paperExposureKey('SYNTHETIC-checkpoint-sitting')],
  };
  const record = appendAllEvidence(emptyLearnerRecord(), [createEvidenceEvent(draft)]);
  const after = evaluateEvidence({ record, goals: emptyPlanGoals(), now: NOW });
  const afterEstimate = after.estimates.find((e) => e.scopeKey === scopeKey);
  assert.notEqual(afterEstimate?.certainty, 'unknown', 'a real scored sitting must move the estimate off unknown');

  // The change is visible to the planner's own facts, which is what
  // scoring reads: this is "therefore the next session" made concrete
  // without depending on the planner's private weights.
  const beforeFacts = learnerFacts(emptyLearnerRecord(), before);
  const afterFacts = learnerFacts(record, after);
  assert.notDeepEqual(
    afterFacts.estimateByScope.get(scopeKey),
    beforeFacts.estimateByScope.get(scopeKey),
    'the facts the planner scores objectives from must change too',
  );
});

/* ------------------------------------------------------------------ */
/* 4. mrez-boundary.ts: the client-side assessment boundary             */
/* ------------------------------------------------------------------ */

test('mrez-boundary: the flag blocks chat for a timed paper, the mock and an independent check alike', () => {
  // All four surfaces (TestPlayer, MockExam, FocusedExercise and
  // WritingFocusedTask's independent-check phase) write the identical
  // body.dataset.examRunning flag, so one boolean is the whole signal.
  assert.equal(chatBlocked({ underExam: true }), true);
  assert.equal(chatBlocked({ underExam: true, route: '/tests/reading-full-001' }), true);
  assert.equal(chatBlocked({ underExam: true, route: '/tests/mock' }), true);
  assert.equal(chatBlocked({ underExam: true, route: '/trainers/focused/reading-matching-headings-check' }), true);
});

test('mrez-boundary: review, guided practice and ordinary browsing are never blocked', () => {
  assert.equal(chatBlocked({}), false);
  assert.equal(chatBlocked({ underExam: false }), false);
  assert.equal(chatBlocked({ lessonKey: 'reading-headings' }), false);
  // A finished paper, or the checked phase of an independent check: the
  // screen stops writing the flag at all, which reads the same as never
  // having been set.
  assert.equal(chatBlocked({ route: '/tests/reading-full-001' }), false);
});

test('mrez-boundary: the explanation and placeholder are real sentences, not empty', () => {
  assert.ok(BOUNDARY_EXPLANATION.length > 20);
  assert.ok(BOUNDARY_PLACEHOLDER.length > 5);
  assert.ok(!BOUNDARY_EXPLANATION.includes('—') && !BOUNDARY_EXPLANATION.includes('–'));
});

/* ------------------------------------------------------------------ */
/* 5. mock-summary.ts: never an overall band on a partial mock          */
/* ------------------------------------------------------------------ */

test('mock-summary: an overall band is never allowed while Writing is unscored', () => {
  assert.equal(
    mockOverallAllowed({ listeningScored: true, readingScored: true, writingGraded: false, speakingScored: true }),
    false,
  );
  // Every other combination with writingGraded: false is refused too.
  for (const listeningScored of [true, false]) {
    for (const readingScored of [true, false]) {
      for (const speakingScored of [true, false]) {
        assert.equal(
          mockOverallAllowed({ listeningScored, readingScored, writingGraded: false, speakingScored }),
          false,
        );
      }
    }
  }
});

test('mock-summary: allowed only once every one of the four papers is really scored', () => {
  assert.equal(
    mockOverallAllowed({ listeningScored: true, readingScored: true, writingGraded: true, speakingScored: true }),
    true,
  );
  assert.equal(
    mockOverallAllowed({ listeningScored: true, readingScored: true, writingGraded: true, speakingScored: false }),
    false,
  );
});

/* ------------------------------------------------------------------ */
/* 6. library-links.ts: deep-link reasons and the model-answer rule     */
/* ------------------------------------------------------------------ */

test('library-links: a known reason parses, an unknown or missing one does not', () => {
  assert.equal(parseLibraryReason('?reason=after-writing-attempt'), 'after-writing-attempt');
  assert.equal(parseLibraryReason('?task=abc&reason=same-family'), 'same-family');
  assert.equal(parseLibraryReason('?reason=made-up-value'), null);
  assert.equal(parseLibraryReason(''), null);
  assert.equal(parseLibraryReason('?task=abc'), null);
});

test('library-links: every reason key has a sentence to translate', () => {
  for (const key of Object.keys(LIBRARY_REASON_SENTENCES)) {
    assert.ok(LIBRARY_REASON_SENTENCES[key as keyof typeof LIBRARY_REASON_SENTENCES].length > 10, key);
  }
});

test('library-links: a model answer only carries the after-attempt framing once a real attempt exists', () => {
  assert.equal(canLinkModelAnswer(false), false);
  assert.equal(canLinkModelAnswer(true), true);
  // The rule is checked against the student's OWN recorded attempts, never
  // trusted from the URL alone: ModelAnswers.tsx calls this with
  // getWritingAttempts(promptId).length > 0, not with anything the caller
  // claimed. A caller sending reason=after-writing-attempt without a real
  // attempt gets plain, unexplained browsing instead (see ModelAnswers.tsx's
  // showAttemptNote, which is deepLinked && reason === '...' &&
  // canLinkModelAnswer(hasAttempted), never the reason alone).
});

/* ------------------------------------------------------------------ */
/* Self-check: findActivity still resolves every reference this file    */
/* leans on, so a rename elsewhere fails here with a clear message      */
/* rather than as a cryptic undefined deep inside checkpoints.ts.       */
/* ------------------------------------------------------------------ */

test('self-check: the catalogue ids this file assumes still resolve', () => {
  assert.ok(findActivity('test:reading', CATALOGUE), 'test:reading');
  assert.ok(findActivity('test:mock', CATALOGUE), 'test:mock');
  assert.ok(SKILLS.includes('reading') && SKILLS.includes('listening'));
});
