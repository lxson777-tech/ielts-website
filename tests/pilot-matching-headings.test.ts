/* Pilot A, Reading Matching Headings: the whole cycle, on fixtures.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/pilot-matching-headings.test.ts
 * The whole suite is `npm test`.
 *
 * WHAT IS BEING DEFENDED, in the order the student meets it:
 *   1. The material is real, its ids are the paper's own ids, and the
 *      papers held back for checks are held back.
 *   2. The audit's Matching Headings student gets teach, guided practice
 *      and an UNSEEN independent check inside their hour. Before this
 *      package they got no check at all: the only short headings set in the
 *      library was already spent and the rest was a twenty minute drill.
 *   3. A first answer is the first answer, help makes an answer assisted
 *      for good, a correction attempt is a retry, and what the student says
 *      about a mistake is stored as THEIRS.
 *   4. A strong unseen check moves the plan on; a weak one changes the
 *      approach rather than repeating the same drill; after the repeated
 *      difficulty limit a teacher is asked for.
 *   5. A step of today's session ticks itself off when the evidence for it
 *      arrives, so no surface has to remember to say so.
 *   6. Help is not available inside a check, and the block ids a lesson
 *      renders are the ones the published file names, in both languages.
 *
 * Every learner here is SYNTHETIC. There is no DOM: the component is glue,
 * and everything that decides what a student's work MEANS is in
 * src/components/learning/focused-exercise.ts and the learning layer, which
 * is what this file exercises.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  FOCUSED_EXERCISES,
  MISTAKE_REASONS,
  RESERVED_CHECK_PAPER_IDS,
  focusedExerciseHref,
  isSharedItemId,
  type FocusedExercise,
} from '../src/data/focused-exercises.ts';
import { ALL_TESTS } from '../src/data/tests/index.ts';
import {
  activitiesThatTeach,
  checksForSubskill,
  findActivity,
  focusedActivityId,
  learningCatalogue,
  practiceForSubskill,
} from '../src/lib/learning/catalog.ts';
import { activityHref } from '../src/lib/learning/catalog.ts';
import { createInitialPlan, replan, proposalShortlist, validatePlanProposal } from '../src/lib/learning/planner.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import { learnerFacts, isUnseen } from '../src/lib/learning/session.ts';
import { appendAllEvidence, createEvidenceEvent, emptyLearnerRecord, paperExposureKey } from '../src/lib/learning/evidence.ts';
import type { EvidenceDraft } from '../src/lib/learning/evidence.ts';
import type { LearnerRecordV1 } from '../src/lib/learning/contracts/evidence.ts';
import { publishLessonBlocks, segmentLessonBody } from '../src/lib/learning/lesson-blocks.ts';
import {
  NO_DIAGNOSIS_SENTENCE,
  TENTATIVE_DIAGNOSIS_SENTENCE,
  assistedCount,
  completionOf,
  countCorrect,
  feedbackFor,
  itemDrafts,
  modeFor,
  tentativeDiagnosis,
  withHelp,
  NO_HELP,
  type FocusedExerciseView,
  type ItemHelpState,
} from '../src/components/learning/focused-exercise.ts';
import { continueFor } from '../src/components/learning/session-continue.ts';
import { requestLessonHelp } from '../src/components/learning/lesson-help.ts';
import {
  configureLearning,
  completeStepsFromEvidence,
  ensurePlan,
  getCurrentSession,
  resetLearningForTest,
} from '../src/lib/learning/index.ts';
import { getLearnerStore, userOwner, type BrowserStorage } from '../src/lib/learning/store.browser.ts';
import {
  PROFILE_TODAY,
  PROFILE_NOW,
  daysBefore,
  syntheticMatchingHeadings,
  syntheticStuck,
} from './fixtures/learning-profiles.ts';
import type { ProgressV1 } from '../src/lib/progress.ts';

const CATALOGUE = learningCatalogue();
const GUIDED_ID = 'reading-matching-headings-guided';
const CHECK_A_ID = 'reading-matching-headings-check-a';
const CHECK_B_ID = 'reading-matching-headings-check-b';

function exercise(id: string): FocusedExercise {
  const found = FOCUSED_EXERCISES.find((entry) => entry.id === id);
  assert.ok(found, `${id} should be in the registry`);
  return found as FocusedExercise;
}

/* ------------------------------------------------------------------ */
/* 1. The material is real, and the reserved papers are reserved       */
/* ------------------------------------------------------------------ */

test('every focused exercise names a real group of a real paper, of the type it claims', () => {
  for (const entry of FOCUSED_EXERCISES) {
    const paper = ALL_TESTS.find((candidate) => candidate.id === entry.source.testId);
    assert.ok(paper, `${entry.id} names ${entry.source.testId}, which should exist`);
    const part = paper!.parts[entry.source.partIndex];
    assert.ok(part, `${entry.id} names part ${entry.source.partIndex} of ${paper!.id}`);
    const group = part!.groups[entry.source.groupIndex];
    assert.ok(group, `${entry.id} names group ${entry.source.groupIndex}`);
    assert.equal(group!.type, entry.subskill, `${entry.id} should really be ${entry.subskill}`);
    assert.ok(paper!.source, `${entry.id} draws on a paper that carries its publisher attribution`);
    assert.equal(entry.provenance, 'imported-paper');

    for (const item of entry.items) {
      assert.ok(
        group!.questions.some((question) => question.id === item.questionId),
        `${entry.id} names ${item.questionId}, which should be in that group`,
      );
      assert.ok(
        isSharedItemId(item, entry.source.testId),
        `${entry.id}: ${item.id} must be the paper's own item id, or exposure is not shared`,
      );
    }
    /* "A short set" was 5 to 8 when only Matching Headings existed. WP18a
       and WP19 (2026-09-22) added types whose real material is genuinely
       shorter: a Reading multiple answer group is always one pair sharing
       one "choose two" pool (2 to 3 items, never 5, because that is how
       the schema's own answerPairId groups every real paper prints it,
       see reading-multiple-answer.ts), and a handful of real Listening
       groups run as short. The floor is loosened to 2 rather than dropped,
       so "short" still means something. */
    assert.ok(entry.items.length >= 2 && entry.items.length <= 8, `${entry.id} should be a short set`);
    assert.ok(entry.expectedMinutes <= 13, `${entry.id} should fit between teaching and a check`);
  }
});

test('the reserved check papers are exactly the papers the checks draw on', () => {
  /* Pinned to Pilot A's own two papers when only Matching Headings existed.
     WP18a (2026-09-22) reserves four more for types the original two
     papers have no material for (see reading-yes-no-notgiven.ts,
     reading-table-completion.ts, reading-multiple-answer.ts,
     reading-categorisation.ts for why each one), and WP19 reserves its own
     Listening papers on the same rule. So this now checks the DEFINITION
     RESERVED_CHECK_PAPER_IDS itself promises, rather than a frozen list:
     exactly the papers an independent-check exercise draws on, with
     Pilot A's own two still among them. */
  const expected = [
    ...new Set(
      FOCUSED_EXERCISES.filter((exercise) => exercise.role === 'independent-check').map(
        (exercise) => exercise.source.testId,
      ),
    ),
  ].sort();
  assert.deepEqual([...RESERVED_CHECK_PAPER_IDS], expected);
  assert.ok(RESERVED_CHECK_PAPER_IDS.includes('reading-full-029'));
  assert.ok(RESERVED_CHECK_PAPER_IDS.includes('reading-full-037'));
});

test('reserved material is never offered as practice, and guided material is never offered as a check', () => {
  const practice = practiceForSubskill('matching-headings', 60, CATALOGUE).map((activity) => activity.id);
  const checks = checksForSubskill('matching-headings', CATALOGUE).map((entry) => entry.activity.id);

  assert.ok(practice.includes(focusedActivityId(GUIDED_ID)), 'the guided set is practice');
  for (const id of [CHECK_A_ID, CHECK_B_ID]) {
    assert.ok(!practice.includes(focusedActivityId(id)), `${id} is held back from practice`);
    assert.ok(checks.includes(focusedActivityId(id)), `${id} is a check`);
  }
  assert.ok(!checks.includes(focusedActivityId(GUIDED_ID)), 'a set worked with help is never a check');

  for (const paperId of RESERVED_CHECK_PAPER_IDS) {
    const spenders = practice.filter((id) => {
      const activity = findActivity(id, CATALOGUE);
      return (activity?.sourcePaperIds ?? []).includes(paperId);
    });
    assert.deepEqual(spenders, [], `nothing that would spend ${paperId} is offered as practice`);
  }
});

test('a focused exercise is a real page, and one route shape is used everywhere', () => {
  for (const entry of FOCUSED_EXERCISES) {
    const activity = findActivity(focusedActivityId(entry.id), CATALOGUE);
    assert.ok(activity, `${entry.id} should be in the catalogue`);
    assert.equal(activityHref(activity!), focusedExerciseHref(entry.id));
    assert.equal(activity!.verified, true, 'publisher material is verified by its source');
    assert.equal(activity!.completionEvidence, 'scored-items');
    assert.ok(
      fs.existsSync(path.join(process.cwd(), 'src/pages/trainers/focused/[id].astro')),
      'the route that renders it exists',
    );
  }
});

test('a lesson still teaches the question type, and no focused exercise displaces it', () => {
  const teaching = activitiesThatTeach('matching-headings', CATALOGUE);
  assert.equal(teaching[0]?.id, 'lesson:reading-headings', 'the lesson teaches, the exercise practises');
  assert.ok(
    !teaching.some((activity) => activity.id === focusedActivityId(CHECK_A_ID)),
    'material reserved for a check is not teaching material either',
  );
});

/* ------------------------------------------------------------------ */
/* 2. The audit student's hour, end to end                             */
/* ------------------------------------------------------------------ */

function planFor(profile = syntheticMatchingHeadings()) {
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
  return { profile, policy, plan };
}

test('the audit Matching Headings student now gets teach, guided practice and an unseen check inside the hour', () => {
  const { profile, plan } = planFor();
  const session = plan.activeSession;
  const roles = session.steps.map((step) => step.role);

  assert.ok(roles.includes('teach'), 'the method is taught');
  assert.equal(
    session.steps.find((step) => step.role === 'practise')?.activityId,
    focusedActivityId(GUIDED_ID),
    'practice is the short guided set, not the twenty minute drill',
  );
  const check = session.steps.find((step) => step.role === 'independent-check');
  assert.ok(check, 'the check that was missing before this package is there');
  assert.equal(check!.activityId, focusedActivityId(CHECK_A_ID));

  const facts = learnerFacts(profile.record, evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now }));
  const checkActivity = findActivity(check!.activityId, CATALOGUE);
  assert.ok(isUnseen(checkActivity!, facts), 'the check is material this student has never met');

  const minutes = session.steps.reduce((total, step) => total + step.minutes, 0);
  assert.ok(minutes <= session.budgetMinutes, `${minutes} minutes must fit the ${session.budgetMinutes} minute budget`);
});

test('the step order is the teaching cycle: teach before practise, practise before the check', () => {
  const { plan } = planFor();
  const roles = plan.activeSession.steps.map((step) => step.role);
  const teach = roles.lastIndexOf('teach');
  const practise = roles.indexOf('practise');
  const check = roles.indexOf('independent-check');
  assert.ok(teach < practise, 'teaching comes before practice');
  assert.ok(practise < check, 'practice comes before the check');
});

/* ------------------------------------------------------------------ */
/* 3. What one run of the exercise means                               */
/* ------------------------------------------------------------------ */

/** The view the page builds, for the guided set, from the real paper. */
function viewFor(id: string): FocusedExerciseView {
  const entry = exercise(id);
  const paper = ALL_TESTS.find((candidate) => candidate.id === entry.source.testId)!;
  const part = paper.parts[entry.source.partIndex]!;
  const group = part.groups[entry.source.groupIndex]!;
  return {
    exerciseId: entry.id,
    activityId: focusedActivityId(entry.id),
    contentVersion: 1,
    role: entry.role,
    paper: entry.paper,
    subskill: entry.subskill,
    title: entry.title,
    objective: entry.objective,
    expectedMinutes: entry.expectedMinutes,
    testId: paper.id,
    attribution: entry.source.attribution,
    blockId: 'b3-4bc13cd8',
    blockHeading: 'How to Approach It',
    blockText: 'Read through all the headings first and note synonyms.',
    instructionText: group.instructionHtml,
    passage: { label: part.label, title: 'Homeopathy', paragraphs: [] },
    instructionHtml: group.instructionHtml,
    options: group.options ?? [],
    items: entry.items.map((item, index) => {
      const question = group.questions.find((candidate) => candidate.id === item.questionId)!;
      return {
        itemId: item.id,
        questionId: question.id,
        number: index + 1,
        label: `Item ${index + 1}`,
        answer: Array.isArray(question.answer) ? (question.answer[0] as string) : question.answer,
        explanation: question.explanation,
        evidence: question.evidence,
      };
    }),
    reasons: MISTAKE_REASONS[entry.reasons],
  };
}

/** Answers that are all right, or all wrong, without naming a key here. */
function allRight(view: FocusedExerciseView): Record<string, string> {
  return Object.fromEntries(view.items.map((item) => [item.itemId, item.answer]));
}

function allWrong(view: FocusedExerciseView): Record<string, string> {
  return Object.fromEntries(
    view.items.map((item) => [item.itemId, item.answer === 'i' ? 'ii' : 'i']),
  );
}

test('the stored first answer is what the student had when they pressed check', () => {
  const view = viewFor(GUIDED_ID);
  const first = { ...allWrong(view) };
  const drafts = itemDrafts({ view, answers: first, help: {} });
  assert.deepEqual(
    drafts.map((draft) => draft.firstAnswer),
    view.items.map((item) => first[item.itemId]),
  );

  /* The student then changes their mind and tries again. The first row is
     untouched: it is a different attempt, not a rewrite. */
  const second = { ...first, [view.items[0]!.itemId]: view.items[0]!.answer };
  const retry = itemDrafts({ view, answers: second, help: {}, onlyItemIds: [view.items[0]!.itemId] });
  assert.equal(drafts[0]!.firstAnswer, first[view.items[0]!.itemId]);
  assert.equal(retry[0]!.firstAnswer, view.items[0]!.answer);
  assert.equal(retry[0]!.correct, true);
});

test('a correct answer after a hint is assisted, and never independent evidence', () => {
  const view = viewFor(GUIDED_ID);
  const help: Record<string, ItemHelpState> = {};
  for (const item of view.items) help[item.itemId] = withHelp(NO_HELP, { assistance: 'hint' });

  const drafts = itemDrafts({ view, answers: allRight(view), help });
  assert.ok(drafts.every((draft) => draft.correct), 'every answer is right');
  assert.ok(drafts.every((draft) => draft.assistance === 'hint'), 'and every one of them is assisted');
  assert.equal(assistedCount(view.items, help), view.items.length);

  const record = recordWith([
    {
      activityId: view.activityId,
      contentVersion: 1,
      at: `${PROFILE_TODAY}T10:00:00.000Z`,
      localDate: PROFILE_TODAY,
      paper: 'reading',
      subskill: 'matching-headings',
      mode: 'practice',
      completion: 'completed',
      assistance: 'hint',
      seenBefore: false,
      outcome: {
        kind: 'scored',
        raw: drafts.length,
        total: drafts.length,
        bySubskill: { 'matching-headings': { correct: drafts.length, total: drafts.length } },
      },
      items: drafts,
    },
  ]);

  const policy = evaluateEvidence({ record, goals: syntheticMatchingHeadings().goals, now: PROFILE_NOW });
  const estimate = policy.estimates.find((entry) => entry.scopeKey === 'subskill:reading:matching-headings');
  assert.ok(estimate, 'the scope is there');
  assert.equal(estimate!.evidence.independentOccasions, 0, 'a hinted run is never an independent occasion');
  assert.equal(estimate!.evidence.independentItems, 0);
  assert.equal(estimate!.evidence.assistedItems, drafts.length);
  assert.notEqual(estimate!.certainty, 'measured', 'and it can never reach measured on its own');
});

test('assistance never comes back down once help has been used', () => {
  const after = withHelp(withHelp(NO_HELP, { assistance: 'answer-shown' }), { assistance: 'hint' });
  assert.equal(after.assistance, 'answer-shown');
});

test('what the student says about a mistake is stored as theirs, and the diagnosis is tentative', () => {
  const view = viewFor(GUIDED_ID);
  const item = view.items[0]!;
  const stated = { [item.itemId]: { reasonId: 'one-detail', note: 'the paragraph mentions cost' } };
  const drafts = itemDrafts({
    view,
    answers: allWrong(view),
    help: { [item.itemId]: withHelp(NO_HELP, { assistance: 'hint' }) },
    stated,
    onlyItemIds: [item.itemId],
  });
  assert.deepEqual(drafts[0]!.statedReason, stated[item.itemId]);

  const diagnosis = tentativeDiagnosis(view.reasons, { reasonId: 'one-detail' });
  assert.equal(diagnosis, 'choosing a detail instead of the main idea');
  assert.match(TENTATIVE_DIAGNOSIS_SENTENCE, /looks like/);
  assert.match(TENTATIVE_DIAGNOSIS_SENTENCE, /what you told us/);
  assert.match(TENTATIVE_DIAGNOSIS_SENTENCE, /worth checking/);

  /* Nothing is diagnosed from an answer that says nothing about method. */
  assert.equal(tentativeDiagnosis(view.reasons, { reasonId: 'guessed' }), null);
  assert.equal(tentativeDiagnosis(view.reasons, { reasonId: 'ran-out-of-time' }), null);
  assert.equal(tentativeDiagnosis(view.reasons, null), null);
  assert.match(NO_DIAGNOSIS_SENTENCE, /does not tell us much/);
});

test('every reason list is data, with an id that is stored and a label that is shown', () => {
  for (const [listId, reasons] of Object.entries(MISTAKE_REASONS)) {
    assert.ok(reasons.length >= 4, `${listId} offers a real choice`);
    const ids = new Set(reasons.map((reason) => reason.id));
    assert.equal(ids.size, reasons.length, `${listId} has no repeated ids`);
    for (const reason of reasons) {
      assert.ok(reason.label.length > 0, `${listId}:${reason.id} has something to tap`);
      assert.ok(!/[–—]/.test(`${reason.label}${reason.diagnosis}`), 'no dashes in anything a student reads');
    }
    assert.ok(
      reasons.some((reason) => reason.diagnosis === ''),
      `${listId} lets a student say something that is not a method at all`,
    );
  }
});

test('the closing panel counts what happened and claims nothing more', () => {
  const guided = feedbackFor({ role: 'guided-practice', correct: 4, total: 6, assisted: 2 });
  const check = feedbackFor({ role: 'independent-check', correct: 5, total: 6, assisted: 0 });
  for (const text of [
    guided.demonstratedKey,
    guided.certaintyKey,
    guided.uncertainKey,
    check.demonstratedKey,
    check.certaintyKey,
    check.uncertainKey,
  ]) {
    /* A band may only ever be MENTIONED to deny one. */
    assert.ok(
      !/\bband\b/i.test(text) || /(not|nothing here is) a band/i.test(text),
      `"${text}" must not claim a band`,
    );
    assert.ok(!/master/i.test(text) || /never mastery/i.test(text), `"${text}" must not claim mastery`);
    assert.ok(!/[–—]/.test(text), 'no dashes');
    assert.ok(!/\b\d(\.\d)?\s*(band|балл)/i.test(text), 'and never a number that reads as one');
  }
  assert.match(guided.certaintyKey, /guided/);
  assert.match(check.certaintyKey, /not a band/);
});

test('a check is recorded as an assessment and guided practice as practice', () => {
  assert.equal(modeFor('independent-check'), 'assessment');
  assert.equal(modeFor('guided-practice'), 'practice');
});

test('a run with nothing answered is blank, not a bad result', () => {
  const view = viewFor(GUIDED_ID);
  assert.equal(completionOf(view.items, {}), 'blank');
  assert.equal(completionOf(view.items, { [view.items[0]!.itemId]: 'i' }), 'partial');
  assert.equal(completionOf(view.items, allRight(view)), 'completed');
  assert.equal(countCorrect(view.items, allRight(view)), view.items.length);
});

/* ------------------------------------------------------------------ */
/* 4. Exposure: a repeat is never fresh                                */
/* ------------------------------------------------------------------ */

function recordWith(drafts: readonly EvidenceDraft[], from: LearnerRecordV1 = emptyLearnerRecord()): LearnerRecordV1 {
  let record = from;
  for (const draft of drafts) record = appendAllEvidence(record, [createEvidenceEvent(draft, record)]);
  return record;
}

function checkDraft(over: Partial<EvidenceDraft> = {}): EvidenceDraft {
  const view = viewFor(CHECK_A_ID);
  const answers = allRight(view);
  return {
    activityId: view.activityId,
    contentVersion: 1,
    at: `${PROFILE_TODAY}T11:00:00.000Z`,
    localDate: PROFILE_TODAY,
    paper: 'reading',
    subskill: 'matching-headings',
    mode: 'assessment',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: {
      kind: 'scored',
      raw: view.items.length,
      total: view.items.length,
      bySubskill: { 'matching-headings': { correct: view.items.length, total: view.items.length } },
    },
    items: itemDrafts({ view, answers, help: {} }),
    sourceMaterial: [paperExposureKey(view.testId)],
    ...over,
  };
}

test('sitting the same group again is a repeat, and raises no certainty', () => {
  const once = recordWith([checkDraft()]);
  const twice = recordWith([checkDraft({ at: `${PROFILE_TODAY}T15:00:00.000Z` })], once);

  const goals = syntheticMatchingHeadings().goals;
  const first = evaluateEvidence({ record: once, goals, now: PROFILE_NOW }).estimates.find(
    (entry) => entry.scopeKey === 'subskill:reading:matching-headings',
  );
  const second = evaluateEvidence({ record: twice, goals, now: PROFILE_NOW }).estimates.find(
    (entry) => entry.scopeKey === 'subskill:reading:matching-headings',
  );
  assert.ok(first && second);
  assert.equal(second!.evidence.independentOccasions, first!.evidence.independentOccasions, 'the repeat adds nothing');
  assert.ok(
    second!.evidence.ignored.some((entry) => entry.reason === 'repeat-of-seen-material'),
    'and it is counted as ignored rather than dropped in silence',
  );
});

test('a check whose paper has been met is no longer unseen, so the planner offers the other one', () => {
  const profile = syntheticMatchingHeadings();
  const record = recordWith([checkDraft()], profile.record);
  const policy = evaluateEvidence({ record, goals: profile.goals, now: profile.now });
  const facts = learnerFacts(record, policy);

  const checkA = findActivity(focusedActivityId(CHECK_A_ID), CATALOGUE)!;
  const checkB = findActivity(focusedActivityId(CHECK_B_ID), CATALOGUE)!;
  assert.equal(isUnseen(checkA, facts), false, 'the set they just sat is spent');
  assert.equal(isUnseen(checkB, facts), true, 'the second one is why there are two');
});

test('sitting the drill built from a check paper would spend the check, which is why it is not offered', () => {
  const drill = findActivity('drill:reading-full-029-drill-p1', CATALOGUE);
  assert.ok(drill, 'the drill still exists and is still linkable');
  assert.ok((drill!.tags ?? []).includes('check-only'), 'but it is marked as check material');
  const practice = practiceForSubskill('matching-headings', 60, CATALOGUE).map((activity) => activity.id);
  assert.ok(!practice.includes(drill!.id));
});

/* ------------------------------------------------------------------ */
/* 5. The plan moves on what the check shows                           */
/* ------------------------------------------------------------------ */

function replanAfter(record: LearnerRecordV1, previous = planFor().plan) {
  const profile = syntheticMatchingHeadings();
  const policy = evaluateEvidence({ record, goals: profile.goals, now: profile.now });
  return replan({
    catalogue: CATALOGUE,
    record,
    policy,
    previous,
    trigger: 'new-evidence',
    now: profile.now,
    today: profile.today,
  });
}

test('a strong unseen check moves the plan on, and says what changed and why', () => {
  const started = planFor();
  const record = recordWith([checkDraft()], started.profile.record);
  const { plan, changes } = replanAfter(record, started.plan);

  const teaching = plan.activeSession.steps.filter((step) => step.role === 'teach');
  const movedOn = plan.activeSession.objectiveScope !== started.plan.activeSession.objectiveScope;
  assert.ok(
    movedOn || teaching.length < started.plan.activeSession.steps.filter((step) => step.role === 'teach').length,
    'a strong result either moves to the next priority or stops teaching this',
  );
  assert.ok(changes.length > 0, 'and the change is recorded');
  for (const change of changes) {
    assert.ok(change.summary.length > 0, 'in a sentence a student can read');
    assert.ok(!/[–—]/.test(change.summary), 'with no dashes');
  }
});

test('a weak unseen check keeps the objective and changes the approach rather than repeating the same drill', () => {
  const started = planFor();
  const view = viewFor(CHECK_A_ID);
  const weak = checkDraft({
    outcome: {
      kind: 'scored',
      raw: 1,
      total: view.items.length,
      bySubskill: { 'matching-headings': { correct: 1, total: view.items.length } },
    },
    items: itemDrafts({ view, answers: { ...allWrong(view), [view.items[0]!.itemId]: view.items[0]!.answer }, help: {} }),
  });
  const record = recordWith([weak], started.profile.record);
  const { plan } = replanAfter(record, started.plan);

  assert.equal(
    plan.activeSession.objectiveScope,
    'subskill:reading:matching-headings',
    'a weak result keeps the objective: this is still the thing to fix',
  );
  const practise = plan.activeSession.steps.find((step) => step.role === 'practise');
  assert.notEqual(
    practise?.activityId,
    focusedActivityId(CHECK_A_ID),
    'and never sends them back over the set they have just seen',
  );
});

test('after the repeated difficulty limit a teacher is asked for, and the same drill stops being offered', () => {
  const profile = syntheticStuck();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const stuck = policy.needsTeacherInput.find((entry) => entry.scopeKey === 'subskill:reading:matching-headings');
  assert.ok(stuck, 'three unimproved independent tries raise the flag');
  assert.ok(stuck!.consecutiveUnimprovedAttempts >= 3);

  const { plan } = createInitialPlan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    now: profile.now,
    today: profile.today,
    goals: profile.goals,
    constraints: profile.constraints,
  });
  const practise = plan.activeSession.steps.find((step) => step.role === 'practise');
  assert.notEqual(practise?.activityId, 'drill:reading-full-014-drill-p1', 'not the drill they keep failing');
});

/* ------------------------------------------------------------------ */
/* 6. A step ticks itself off when its evidence arrives                */
/* ------------------------------------------------------------------ */

function memoryStorage(): BrowserStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function emptyProgress(): ProgressV1 {
  return { version: 1, lessons: {}, tests: {}, writing: {}, speaking: [], activity: {} } as unknown as ProgressV1;
}

test.afterEach(() => resetLearningForTest());

test('a completed step ticks itself off when its evidence arrives, with no surface having to say so', () => {
  resetLearningForTest();
  configureLearning({
    storage: memoryStorage(),
    owner: userOwner('synthetic-headings'),
    now: () => PROFILE_NOW,
    today: () => PROFILE_TODAY,
    legacy: () => ({ progress: emptyProgress(), plan: null }),
    legacyPlan: { read: () => null, write: () => {} },
    catalogue: CATALOGUE,
  });

  const plan = ensurePlan();
  const step = plan.activeSession.steps[0]!;
  assert.equal(step.state, 'pending');

  const activity = findActivity(step.activityId, CATALOGUE)!;
  getLearnerStore().recordEvent({
    activityId: activity.id,
    contentVersion: activity.contentVersion,
    at: PROFILE_NOW,
    localDate: PROFILE_TODAY,
    paper: activity.paper,
    subskill: activity.subskill,
    mode: 'practice',
    completion: 'completed',
    outcome: { kind: 'studied', estimatedMinutes: activity.expectedMinutes },
  });

  completeStepsFromEvidence();
  const after = getCurrentSession();
  const same = after.steps.find((entry) => entry.stepId === step.stepId)!;
  assert.equal(same.state, 'done', 'the evidence itself is what ticks the step off');
  assert.ok((after.steps[0]!.href ?? '').length >= 0);
});

test('a blank attempt never ticks a step off', () => {
  resetLearningForTest();
  configureLearning({
    storage: memoryStorage(),
    owner: userOwner('synthetic-headings-2'),
    now: () => PROFILE_NOW,
    today: () => PROFILE_TODAY,
    legacy: () => ({ progress: emptyProgress(), plan: null }),
    legacyPlan: { read: () => null, write: () => {} },
    catalogue: CATALOGUE,
  });

  const plan = ensurePlan();
  const step = plan.activeSession.steps[0]!;
  const activity = findActivity(step.activityId, CATALOGUE)!;
  getLearnerStore().recordEvent({
    activityId: activity.id,
    contentVersion: activity.contentVersion,
    at: PROFILE_NOW,
    localDate: PROFILE_TODAY,
    paper: activity.paper,
    subskill: activity.subskill,
    mode: 'practice',
    completion: 'blank',
    outcome: { kind: 'scored', raw: 0, total: 6, bySubskill: {} },
  });

  completeStepsFromEvidence();
  assert.equal(
    getCurrentSession().steps.find((entry) => entry.stepId === step.stepId)!.state,
    'pending',
    'walking away from something is not finishing it',
  );
});

/* ------------------------------------------------------------------ */
/* 7. One next step, never a competing one                             */
/* ------------------------------------------------------------------ */

test('the session bar continues the session for a step, and offers only a way back for voluntary work', () => {
  const { plan } = planFor();
  const asView = (states: Record<number, string> = {}) =>
    ({
      sessionId: plan.activeSession.id,
      steps: plan.activeSession.steps.map((step, index) => ({
        stepId: step.stepId,
        role: step.role,
        activityId: step.activityId,
        kind: null,
        subskill: step.subskill ?? 'matching-headings',
        minutes: step.minutes,
        purpose: step.purpose,
        state: states[index] ?? step.state,
        href: `/x/${step.activityId}`,
        objective: 'x',
        indivisible: false,
        lessonKey: null,
      })),
    }) as unknown as Parameters<typeof continueFor>[0];

  const view = asView();
  const first = continueFor(view, plan.activeSession.steps[0]!.activityId);
  assert.equal(first.kind, 'next-step');
  assert.equal(first.href, `/x/${plan.activeSession.steps[1]!.activityId}`);
  assert.equal(first.stepId, plan.activeSession.steps[0]!.stepId);

  /* The end of the session: the check is finished and the recap behind it
     is done, so there is nothing left to continue to. */
  const steps = plan.activeSession.steps;
  const lastIndex = steps.length - 1;
  const checkIndex = steps.findIndex((step) => step.role === 'independent-check');
  const finished = asView(Object.fromEntries(steps.map((_, index) => [index, index > checkIndex ? 'done' : 'pending'])));
  const last = continueFor(finished, steps[checkIndex]!.activityId);
  assert.equal(last.kind, 'back-to-today');
  assert.equal(last.stepId, steps[checkIndex]!.stepId);
  assert.ok(lastIndex > checkIndex, 'the recap really is behind the check');

  /* A recap that shares the practise step's activity id does not send the
     student back to the practice they have just finished. */
  const afterPractise = asView({ [steps.findIndex((step) => step.role === 'practise')]: 'done' });
  const recap = continueFor(afterPractise, steps[lastIndex]!.activityId);
  assert.equal(recap.stepId, steps[lastIndex]!.stepId, 'the outstanding one is the step being finished');

  const voluntary = continueFor(view, 'drill:reading-full-005-drill-p1');
  assert.equal(voluntary.kind, 'voluntary');
  assert.equal(voluntary.href, '/dashboard');
  assert.match(voluntary.noteKey, /has not changed today/);

  assert.equal(continueFor(null, 'anything').kind, 'voluntary');
});

/* ------------------------------------------------------------------ */
/* 8. No help inside a check                                           */
/* ------------------------------------------------------------------ */

test('help is refused while a check is running, and the refusal explains itself', async () => {
  const result = await requestLessonHelp({
    kind: 'hint',
    lessonKey: 'reading-headings',
    blockId: 'b3-4bc13cd8',
    blockHeading: 'How to Approach It',
    blockText: 'Read all the headings first.',
    attempted: false,
    previousHints: [],
    assistanceSoFar: 'none',
    versions: { planRevision: 1, evidenceVersion: 1, indexVersion: CATALOGUE.indexVersion },
    locale: 'en',
    underAssessment: true,
  });
  assert.equal(result.blocked, true);
  assert.equal(result.assistanceAfter, 'none', 'a refusal is not help, so nothing is recorded as assisted');
  assert.match(result.text, /switched off/);
});

test('with no tutor configured, help is the lesson’s own sentence and says so', async () => {
  const result = await requestLessonHelp({
    kind: 'hint',
    lessonKey: 'reading-headings',
    blockId: 'b3-4bc13cd8',
    blockHeading: 'How to Approach It',
    blockText:
      'Read through all the headings first and note synonyms. The heading has to cover the whole paragraph, not one detail inside it.',
    question: 'Section B',
    attempted: false,
    previousHints: [],
    assistanceSoFar: 'none',
    versions: { planRevision: 1, evidenceVersion: 1, indexVersion: CATALOGUE.indexVersion },
    locale: 'en',
  });
  assert.equal(result.source, 'offline', 'never presented as a live reply');
  assert.ok(result.text.length > 0);
  assert.equal(result.revealedAnswer, false, 'a hint before an attempt never hands the answer over');
  assert.equal(result.assistanceAfter, 'hint', 'and it still makes the answer assisted');
});

/* ------------------------------------------------------------------ */
/* 9. Block ids: the same names in the page and in the published file  */
/* ------------------------------------------------------------------ */

const BODIES = path.join(process.cwd(), 'src/content/lesson-bodies');

test('the ids the lesson layout stamps are the ids the published block file names, in both languages', () => {
  const slugs = fs
    .readdirSync(BODIES)
    .filter((name) => name.endsWith('.html'))
    .map((name) => name.replace(/\.html$/, ''));
  assert.ok(slugs.length >= 70, 'every lesson is checked, not a sample');

  for (const slug of slugs) {
    const english = fs.readFileSync(path.join(BODIES, `${slug}.html`), 'utf8');
    const ruPath = path.join(BODIES, 'ru', `${slug}.html`);
    const russian = fs.existsSync(ruPath) ? fs.readFileSync(ruPath, 'utf8') : null;

    /* What the layout embeds, from the English body. */
    const stamped = segmentLessonBody(english).map((block) => block.id);
    /* What /data/lesson-blocks/<slug>.json publishes. */
    const published = publishLessonBlocks(slug, english, russian).blocks.map((block) => block.id);
    assert.deepEqual(stamped, published, `${slug}: the page and the published file must agree`);

    if (!russian) continue;
    /* The Russian body is stamped by position with the English ids, so it
       must have the same number of headings to stamp. */
    const translated = segmentLessonBody(russian, stamped).map((block) => block.id);
    assert.deepEqual(translated, stamped, `${slug}: Russian gets the same block ids by position`);
  }
});

test('the teaching block the pilot points at is really in the headings lesson', () => {
  const html = fs.readFileSync(path.join(BODIES, 'reading-headings.html'), 'utf8');
  const blocks = segmentLessonBody(html);
  const wanted = exercise(GUIDED_ID).lesson?.blockHeading;
  assert.ok(wanted, 'the exercise names a teaching block');
  assert.ok(
    blocks.some((block) => block.heading === wanted),
    `"${wanted}" should be a heading in the headings lesson`,
  );
});

/* ------------------------------------------------------------------ */
/* 10. The planner fix: today's own practise step is not ineligible    */
/* ------------------------------------------------------------------ */

test("a proposal of today's own practise step is not refused for a prerequisite today itself teaches", () => {
  const { profile, plan, policy } = planFor();
  const practise = plan.activeSession.steps.find((step) => step.role === 'practise');
  assert.ok(practise, 'there is a practise step to propose');

  const shortlist = proposalShortlist({
    plan,
    record: profile.record,
    policy,
    catalogue: CATALOGUE,
    today: profile.today,
  }).map((activity) => activity.id);
  assert.ok(shortlist.includes(practise!.activityId), 'the model can agree with the planner');

  const verdict = validatePlanProposal({
    plan,
    record: profile.record,
    policy,
    catalogue: CATALOGUE,
    versions: {
      planRevision: plan.revision,
      evidenceVersion: policy.evidenceVersion,
      indexVersion: CATALOGUE.indexVersion,
    },
    shortlist,
    proposedActivityId: practise!.activityId,
    today: profile.today,
    at: profile.now,
  });
  assert.equal(verdict.accepted, true, 'an earlier step of the same session satisfies a later step');
});

test('a prerequisite the session does NOT cover still refuses the proposal', () => {
  const { profile, plan, policy } = planFor();
  /* A Speaking cue card depends on the Part 2 lesson, which today's
     Reading session neither contains nor teaches. */
  const speaking = CATALOGUE.activities.find(
    (activity) => activity.id.startsWith('speak:') && activity.prerequisites.length > 0,
  );
  assert.ok(speaking, 'there is such an activity');

  const verdict = validatePlanProposal({
    plan,
    record: profile.record,
    policy,
    catalogue: CATALOGUE,
    versions: {
      planRevision: plan.revision,
      evidenceVersion: policy.evidenceVersion,
      indexVersion: CATALOGUE.indexVersion,
    },
    shortlist: [speaking!.id],
    proposedActivityId: speaking!.id,
    today: profile.today,
    at: profile.now,
  });
  assert.equal(verdict.accepted, false);
  assert.ok(
    verdict.accepted === false && ['prerequisite-unmet', 'over-budget', 'unavailable'].includes(verdict.rejection),
    `an activity today does not cover is still refused, got ${verdict.accepted === false ? verdict.rejection : ''}`,
  );
});

/* ------------------------------------------------------------------ */
/* 11. Nothing a student reads carries a dash                          */
/* ------------------------------------------------------------------ */

test('nothing authored by this package contains an em dash or an en dash', () => {
  const files = [
    'src/data/focused-exercises.ts',
    'src/data/focused/reading-matching-headings.ts',
    'src/components/learning/focused-exercise.ts',
    'src/components/learning/session-continue.ts',
    'src/components/learning/lesson-help.ts',
    'src/components/learning/FocusedExercise.tsx',
    'src/components/learning/LessonHelpControls.tsx',
    'src/components/learning/SessionContinueBar.tsx',
    'src/components/learning/lesson-block-help.ts',
    'src/styles/learning-focus.css',
  ];
  for (const file of files) {
    const text = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const offending = text.split('\n').filter((line) => /[–—]/.test(line) && !/^\s*\/?\*|─/.test(line));
    assert.deepEqual(offending, [], `${file} should have no dashes in it`);
  }
});

test('the daily budget still holds for the audit student after the check is added', () => {
  const { plan } = planFor();
  for (const day of plan.schedule) {
    const activities = day.activityIds
      .map((id) => findActivity(id, CATALOGUE))
      .filter((activity): activity is NonNullable<typeof activity> => Boolean(activity));
    const minutes = activities.reduce((total, activity) => total + activity.expectedMinutes, 0);
    assert.ok(
      minutes <= day.budgetMinutes || activities.some((activity) => activity.indivisible),
      `${day.date}: ${minutes} minutes against a ${day.budgetMinutes} minute budget`,
    );
  }
});

test('the plan the audit student gets is the same plan every time it is built', () => {
  const first = planFor().plan;
  const second = planFor().plan;
  assert.deepEqual(
    first.activeSession.steps.map((step) => `${step.role}:${step.activityId}:${step.minutes}`),
    second.activeSession.steps.map((step) => `${step.role}:${step.activityId}:${step.minutes}`),
  );
});

void daysBefore;
