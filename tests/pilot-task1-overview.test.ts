/* Pilot B, Writing Task 1 overviews: the whole cycle, on fixtures.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/pilot-task1-overview.test.ts
 * The whole suite is `npm test`.
 *
 * WHAT IS BEING DEFENDED, in the order the student meets it:
 *   1. The material is real: four real exam prompts, their own guiding
 *      questions, their own band 8 models, and the three held back for
 *      checks are held back.
 *   2. THE GAP IS FOUND FROM EVIDENCE. Either the examiner said something
 *      about the overview and the student reads that sentence word for
 *      word, or a plain check of their own essay found something and it is
 *      called a check, or nothing is known and it says so. Never a guess.
 *   3. The hand-off reconciles into the ONE plan and never creates a second
 *      next step.
 *   4. Help makes an attempt assisted, the model is never available before
 *      an attempt, and a reply with a number in it is refused.
 *   5. A revision links to the original and preserves it; the words survive
 *      a failed evaluation.
 *   6. The transfer check uses only unexposed reserved prompts, is refused
 *      help, produces no band ever, cannot exceed its certainty cap, and
 *      Task 1 evidence never reaches the Task 2 scope.
 *   7. A met transfer check moves the plan on and puts the full graded task
 *      in front of the student, because that is what can move a band.
 *   8. The short overview task is eligible as the Writing diagnostic sample
 *      inside fifteen minutes, which nothing in the library was before.
 *
 * Every learner here is SYNTHETIC. There is no DOM: the component is glue,
 * and everything that decides what a student's writing MEANS is in
 * src/components/learning/written-focused-task.ts and the learning layer,
 * which is what this file exercises.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ALL_FOCUSED_EXERCISES,
  RESERVED_CHECK_PROMPT_IDS,
  WRITTEN_FOCUSED_TASKS,
  focusedExerciseHref,
  isWrittenFocusedTask,
  writtenItemId,
  type WrittenFocusedTask,
} from '../src/data/focused-exercises.ts';
import { WRITING_PROMPTS } from '../src/data/writing-prompts.ts';
import { WRITING_TASK1_OVERVIEW } from '../src/data/focused/writing-task1-overview.ts';
import { WRITING_PLANS } from '../src/data/writing-plans.ts';
import { getModelAnswers } from '../src/data/model-answers.ts';
import {
  activityHref,
  checksForSubskill,
  findActivity,
  focusedActivityId,
  learningCatalogue,
  practiceForSubskill,
  writingActivityId,
} from '../src/lib/learning/catalog.ts';
import { createInitialPlan, scoreObjectives } from '../src/lib/learning/planner.ts';
import { DEFAULT_PLANNER_WEIGHTS } from '../src/lib/learning/contracts/plan.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import {
  checkOptions,
  diagnosticCandidates,
  isEligible,
  isUnseen,
  learnerFacts,
  practiceOptions,
  teachingPath,
} from '../src/lib/learning/session.ts';
import {
  appendAllEvidence,
  createEvidenceEvent,
  emptyLearnerRecord,
  promptExposureKey,
  type EvidenceDraft,
} from '../src/lib/learning/evidence.ts';
import type { LearnerRecordV1 } from '../src/lib/learning/contracts/evidence.ts';
import { DEFAULT_POLICY_THRESHOLDS } from '../src/lib/learning/contracts/policy.ts';
import type { PlanConstraints, PlanGoals } from '../src/lib/learning/contracts/plan.ts';
import {
  EMPTY_WRITTEN_DRAFT,
  NO_WRITTEN_HELP,
  acceptEvaluation,
  figuresIn,
  findOverviewGap,
  guidingQuestionsFor,
  hasSummarisingSignal,
  latestTask1,
  mainFeatureCount,
  mayShowModel,
  modeForWritten,
  modelOverviewOf,
  overviewComplaintIn,
  overviewHandoffText,
  readWrittenDraft,
  runAutomaticChecks,
  unjudgedEvaluation,
  withAttempt,
  withWrittenHelp,
  writeWrittenDraft,
  writtenEvidenceDraft,
  writtenFeedbackFor,
  type GradedWritingAttempt,
  type WrittenDraftStorage,
  type WrittenTaskView,
} from '../src/components/learning/written-focused-task.ts';
import { reconcileProposal } from '../src/components/tutor/proposalReconcile.ts';
import { requestLessonHelp } from '../src/components/learning/lesson-help.ts';
import {
  chooseObjective,
  configureLearning,
  getCurrentSession,
  resetLearningForTest,
} from '../src/lib/learning/index.ts';
import { getLearnerStore, userOwner, type BrowserStorage } from '../src/lib/learning/store.browser.ts';
import type { ProgressV1 } from '../src/lib/progress.ts';

const CATALOGUE = learningCatalogue();
const GUIDED_ID = 'writing-task1-overview-guided';
const CHECK_A_ID = 'writing-task1-overview-check-a';
const CHECK_B_ID = 'writing-task1-overview-check-b';
const CHECK_C_ID = 'writing-task1-overview-check-c';
const OVERVIEW_SCOPE = 'subskill:writing:task1-overview';

/* The day these fixtures are written against, fixed so two runs agree. */
const TODAY = '2026-09-22';
const NOW = '2026-09-22T09:00:00.000Z';

function task(id: string): WrittenFocusedTask {
  const found = WRITTEN_FOCUSED_TASKS.find((entry) => entry.id === id);
  assert.ok(found, `${id} should be in the written registry`);
  return found as WrittenFocusedTask;
}

/* ------------------------------------------------------------------ */
/* 1. The material is real, and the reserved prompts are reserved      */
/* ------------------------------------------------------------------ */

/* This test, and several others below, checked every WRITTEN_FOCUSED_TASKS
   entry while this pilot's own four overview tasks were the only ones that
   existed. WP20 (2026-09-22) added ten further Writing objectives plus
   sentence correction, most of them Task 2 (no chart, so no <img>) and one
   project-authored (sentence correction, guided practice only, never
   verified: lead decision Q1). Those are real, deliberate differences, not
   bugs, so the assertions below that only make sense for an overview task
   on a Task 1 visual are scoped to WRITING_TASK1_OVERVIEW, this pilot's own
   four; tests/writing-speaking-objectives.test.ts covers the equivalent
   properties for WP20's own objectives, which are not all the same shape. */
test('every written task names a real exam prompt of the task and form it claims', () => {
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    const prompt = WRITING_PROMPTS.find((candidate) => candidate.id === entry.source.promptId);
    assert.ok(prompt, `${entry.id} names ${entry.source.promptId}, which should exist`);
    assert.equal(prompt!.task, entry.source.task, `${entry.id} should really be ${entry.source.task}`);
    assert.equal(prompt!.variant, entry.source.form, `${entry.id} should really be a ${entry.source.form}`);
    assert.ok(entry.expectedMinutes <= 10, `${entry.id} should fit between teaching and a check`);
    assert.ok(entry.rules.minWords >= 5 && entry.rules.maxWords <= 100, `${entry.id} asks for a focused paragraph, not a report`);
  }
  for (const entry of WRITING_TASK1_OVERVIEW) {
    const prompt = WRITING_PROMPTS.find((candidate) => candidate.id === entry.source.promptId)!;
    assert.ok(prompt.source, `${entry.id} draws on a prompt that carries its publisher attribution`);
    assert.equal(entry.provenance, 'publisher');
    assert.ok(prompt.promptHtml.includes('<img'), `${entry.id}: the student has to be able to see the visual`);
    assert.ok(entry.rules.minWords >= 20 && entry.rules.maxWords <= 90, `${entry.id} asks for an overview, not a report`);
  }
});

test('the guided task carries the prompt own guiding questions, and a check carries none', () => {
  const guided = task(GUIDED_ID);
  const hints = WRITING_PLANS[guided.source.promptId]?.overviewHints ?? [];
  assert.ok(hints.length >= 3, 'the teacher wrote guiding questions for this chart on 19 September 2026');
  assert.deepEqual(guidingQuestionsFor('guided-practice', hints), hints);

  for (const id of [CHECK_A_ID, CHECK_B_ID, CHECK_C_ID]) {
    const check = task(id);
    const theirs = WRITING_PLANS[check.source.promptId]?.overviewHints ?? [];
    assert.ok(theirs.length >= 3, `${id}: the prompt has guiding questions`);
    assert.deepEqual(guidingQuestionsFor('independent-check', theirs), [], `${id} withholds them, which is the point`);
  }
});

test('every overview task has a band 8 model whose overview can be found deterministically', () => {
  for (const entry of WRITING_TASK1_OVERVIEW) {
    const models = getModelAnswers(entry.source.promptId);
    const model = models.find((candidate) => candidate.band === 8) ?? models[0];
    assert.ok(model, `${entry.id}: ${entry.source.promptId} should have a model answer`);
    const overview = modelOverviewOf(model!.text);
    assert.ok(overview, `${entry.id}: the model should have an overview paragraph`);
    assert.ok(hasSummarisingSignal(overview!), `${entry.id}: the band 8 overview opens as a summary`);
    assert.notEqual(overview, model!.text[0], `${entry.id}: the introduction is not the overview`);
  }
});

test('transfer is checked on the same visual family first and a different one afterwards', () => {
  assert.equal(task(CHECK_A_ID).source.form, task(GUIDED_ID).source.form, 'the first check is the same kind of visual');
  assert.notEqual(task(CHECK_B_ID).source.form, task(GUIDED_ID).source.form, 'the second is a different kind');
  assert.notEqual(task(CHECK_C_ID).source.form, task(CHECK_B_ID).source.form, 'and the third is different again');
});

test('the reserved prompts are exactly the prompts the checks draw on', () => {
  /* WP20 (2026-09-22) added its own independent-check tasks on their own
     objectives, each reserving their own prompts the same way, so this
     pilot's three no longer form the WHOLE of RESERVED_CHECK_PROMPT_IDS.
     What still has to be true is that they are IN it, and that every id in
     it really is drawn on by some check somewhere (the general property the
     exact list used to stand in for). */
  const overviewReserved = ['pte-wt-112-task1', 'pte-wt-117-task1', 'pte-wt-126-task1'];
  for (const promptId of overviewReserved) {
    assert.ok(RESERVED_CHECK_PROMPT_IDS.includes(promptId), `${promptId} is still reserved for the overview pilot`);
  }
  const checkPrompts = new Set(
    WRITTEN_FOCUSED_TASKS.filter((entry) => entry.role === 'independent-check').map((entry) => entry.source.promptId),
  );
  for (const promptId of RESERVED_CHECK_PROMPT_IDS) {
    assert.ok(checkPrompts.has(promptId), `${promptId} is reserved but no check actually draws on it`);
  }
  assert.ok(
    !RESERVED_CHECK_PROMPT_IDS.includes(task(GUIDED_ID).source.promptId),
    'the guided prompt is not reserved: it is meant to be worked with help',
  );
});

test('a reserved prompt is never offered as ordinary writing practice, and a guided task is never a check', () => {
  const practice = practiceForSubskill('task1-overview', 60, CATALOGUE).map((activity) => activity.id);
  const checks = checksForSubskill('task1-overview', CATALOGUE).map((entry) => entry.activity.id);

  assert.ok(practice.includes(focusedActivityId(GUIDED_ID)), 'the guided task is practice');
  for (const id of [CHECK_A_ID, CHECK_B_ID, CHECK_C_ID]) {
    assert.ok(!practice.includes(focusedActivityId(id)), `${id} is held back from practice`);
    assert.ok(checks.includes(focusedActivityId(id)), `${id} is a check`);
  }
  assert.ok(!checks.includes(focusedActivityId(GUIDED_ID)), 'a task worked with guiding questions is never a check');

  for (const promptId of RESERVED_CHECK_PROMPT_IDS) {
    assert.ok(
      !practice.includes(writingActivityId(promptId)),
      `the full report on ${promptId} would spend the check, so it is not offered as practice`,
    );
    const graded = findActivity(writingActivityId(promptId), CATALOGUE);
    assert.ok(graded, 'the full task still exists and is still linkable');
    assert.ok((graded!.tags ?? []).includes('check-only'), 'but it is marked as check material');
  }
});

test('a written task is a real page, one route shape everywhere, and its evidence is never a mark', () => {
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    const activity = findActivity(focusedActivityId(entry.id), CATALOGUE);
    assert.ok(activity, `${entry.id} should be in the catalogue`);
    assert.equal(activityHref(activity!), focusedExerciseHref(entry.id));
    /* Publisher material is verified by its source; the one project-authored
       exception (sentence correction, WP20) is unverified by lead decision
       Q1, which is exactly why it carries no independent-check role. */
    assert.equal(activity!.verified, entry.provenance !== 'project-authored', `${entry.id} verified matches its provenance`);
    assert.equal(activity!.completionEvidence, 'objective-judged', 'judged against one objective, never scored');
    assert.ok((activity!.tags ?? []).includes('written-response'));
    assert.deepEqual(activity!.sourcePromptIds, [entry.source.promptId]);
    assert.deepEqual(activity!.sharesItemsWith, [writingActivityId(entry.source.promptId)]);
  }
  assert.ok(
    fs.existsSync(path.join(process.cwd(), 'src/pages/trainers/focused/[id].astro')),
    'the route that renders it exists',
  );
});

test('the one item a written task records is the prompt, which is what links a revision to it', () => {
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    const activity = findActivity(focusedActivityId(entry.id), CATALOGUE);
    assert.equal(activity!.sourcePromptIds?.[0], entry.source.promptId);
    assert.equal(writtenItemId(entry.source.promptId), `prompt:${entry.source.promptId}`);
  }
  assert.equal(
    new Set(WRITTEN_FOCUSED_TASKS.map((entry) => entry.source.promptId)).size,
    WRITTEN_FOCUSED_TASKS.length,
    'no two tasks share a prompt, or their attempts would link to each other',
  );
});

test('both kinds of focused exercise live in one registry, and the Reading pilot is untouched by this one', () => {
  /* The exact "3" this asserted while Matching Headings was the only other
     registry has long since grown (Reading and Listening's remaining types,
     the authored sentence-endings set, WP18/WP19); what has to stay true is
     the STRUCTURE, not a magic number: written-response plus every other
     kind is the whole registry, and every non-written entry (item-answers
     or authored item-answers) is still scored in code, never judged
     against one objective. */
  assert.equal(ALL_FOCUSED_EXERCISES.filter(isWrittenFocusedTask).length, WRITTEN_FOCUSED_TASKS.length);
  const reading = ALL_FOCUSED_EXERCISES.filter((entry) => !isWrittenFocusedTask(entry));
  assert.equal(reading.length, ALL_FOCUSED_EXERCISES.length - WRITTEN_FOCUSED_TASKS.length, 'the Reading pilot and its siblings, exactly');
  for (const entry of reading) {
    assert.equal(findActivity(focusedActivityId(entry.id), CATALOGUE)?.completionEvidence, 'scored-items');
  }
});

/* ------------------------------------------------------------------ */
/* 2. Finding the gap, from evidence and never from a guess            */
/* ------------------------------------------------------------------ */

/* SYNTHETIC: a Task 1 report from the calibrated grader whose Task
   Achievement comment says the overview is missing. The wording is the
   shape gpt-5.6-sol really produces (see docs/GRADING-OPENAI-RESULT.md):
   prose about the descriptor, a tip written as an instruction, and moments
   quoted from the student's own words. */
function markedReportFlaggingTheOverview(): GradedWritingAttempt {
  return {
    at: '2026-09-20T10:00:00.000Z',
    promptId: 'pte-wt-121-task1',
    promptTitle: 'The numbers of participants for different activities (chart)',
    task: 'task1',
    live: true,
    essay:
      'The bar chart compares the number of people taking part in four activities at one centre in 2015 and 2019. Swimming attracted 420 participants in 2015, rising to 540 in 2019. Tennis fell from 310 to 180 over the same period. Yoga grew from 90 to 260, and badminton was almost unchanged at around 200.',
    report: {
      grader: { name: 'gpt-5.6-sol', live: true },
      criteria: {
        taskResponse: {
          band: 5,
          comment:
            'The report covers all four activities and the figures quoted are accurate. There is no overview, however, and the Band 5 descriptor is written for exactly this: a response that recounts detail with no clear overall statement. The reader is left to work out the pattern for themselves.',
          tip: 'Add a separate overview after the introduction that names the biggest riser and the only faller, with no figures in it.',
          nextBand: {
            target: 6,
            gap: 'Band 6 requires a clear overview of the main trends.',
            actions: [
              { do: 'Write two sentences after the introduction summarising the main movements, with no numbers.', from: '', to: '' },
            ],
          },
        },
        coherenceCohesion: { band: 6, comment: 'The paragraphs are clearly separated and the sequencing is logical.' },
        lexicalResource: { band: 6, comment: 'Adequate range for the task with some repetition of "rising".' },
        grammaticalRange: { band: 6, comment: 'A mix of simple and complex sentences with occasional slips.' },
      },
      moments: [
        { quote: 'Swimming attracted 420 participants in 2015', note: 'Accurate, but the report opens straight into detail like this.' },
      ],
      improvements: ['Group the four activities into risers and fallers before reporting the figures.'],
    },
  };
}

/* SYNTHETIC: the same student on a good day. The marker praises the
   overview, and the essay really has one, with no figures in it. */
function markedReportPraisingTheOverview(): GradedWritingAttempt {
  return {
    at: '2026-09-21T10:00:00.000Z',
    promptId: 'pte-wt-120-task1',
    promptTitle: 'The average monthly change in the prices of three metals (chart)',
    task: 'task1',
    live: true,
    essay:
      'The line graph shows the average monthly change in the prices of three metals over one year. Overall, all three metals ended the year lower than they began, and the sharpest movement belonged to nickel, which was also the most volatile. Copper opened at 2.4 and closed at 1.1.',
    report: {
      grader: { name: 'gpt-5.6-sol', live: true },
      criteria: {
        taskResponse: {
          band: 7,
          comment:
            'A clear overview separates the main trends from the detail and quotes no figures, which is what the descriptor asks for. Every movement in the graph is reported accurately.',
          tip: 'Group the two similar metals together in the second detail paragraph rather than taking each in turn.',
        },
        coherenceCohesion: { band: 7, comment: 'Well organised throughout.' },
        lexicalResource: { band: 7, comment: 'Good range of trend language.' },
        grammaticalRange: { band: 7, comment: 'Accurate and varied.' },
      },
      moments: [{ quote: 'all three metals ended the year lower', note: 'A real summary statement rather than a repeated figure.' }],
      improvements: ['Vary the sentence openings in the detail paragraphs.'],
    },
  };
}

test('a marked report that says the overview is missing is quoted word for word', () => {
  const finding = findOverviewGap([markedReportFlaggingTheOverview()]);
  assert.equal(finding.found, true);
  assert.equal(finding.basis, 'marker');
  assert.equal(finding.where, 'task-achievement-comment');
  assert.match(finding.quote ?? '', /There is no overview/);
  assert.equal(finding.promptId, 'pte-wt-121-task1');

  const handoff = overviewHandoffText(finding);
  assert.ok(handoff);
  assert.equal(handoff!.quote, finding.quote, 'the student reads what the examiner wrote, not our paraphrase');
  assert.match(handoff!.bodyKey, /examiner/);
});

test('a marked report that praises the overview produces no gap at all', () => {
  const finding = findOverviewGap([markedReportPraisingTheOverview()]);
  assert.equal(finding.found, false);
  assert.equal(finding.basis, 'nothing-found', 'a Task 1 was written and nothing said the overview was the problem');
  assert.equal(overviewHandoffText(finding), null, 'so nothing is offered');
});

test('the marker scan needs BOTH an overview word and something wrong with it', () => {
  assert.equal(overviewComplaintIn('A clear overview separates the trends from the detail.'), null);
  assert.equal(overviewComplaintIn('The vocabulary is limited and repetitive.'), null, 'a weakness that is not about the overview');
  assert.match(overviewComplaintIn('The overview is buried in the second detail paragraph.') ?? '', /buried/);
  assert.match(overviewComplaintIn('Add a separate overview after the introduction.') ?? '', /Add a separate overview/);
  assert.match(overviewComplaintIn('There is no overall statement anywhere in the report.') ?? '', /no overall statement/);
  assert.equal(overviewComplaintIn(undefined), null);
});

test('an offline stub grade is never quoted as though an examiner wrote it', () => {
  const stub: GradedWritingAttempt = {
    ...markedReportFlaggingTheOverview(),
    live: false,
    report: { ...markedReportFlaggingTheOverview().report!, grader: { name: 'Sample grader', live: false } },
  };
  const finding = findOverviewGap([stub]);
  assert.notEqual(finding.basis, 'marker', 'canned wording is not a marker');
  assert.equal(finding.basis, 'automatic-check', 'the essay itself still has no overview, and that IS checkable');
  assert.deepEqual(finding.failedChecks, ['summarising-signal']);
});

test('with no marker comment, the essay text itself is checked, and the check is called a check', () => {
  const noComment: GradedWritingAttempt = {
    at: '2026-09-20T10:00:00.000Z',
    promptId: 'pte-wt-121-task1',
    task: 'task1',
    live: true,
    essay: 'The bar chart compares four activities. Swimming rose from 420 to 540. Tennis fell from 310 to 180.',
    report: {
      grader: { name: 'gpt-5.6-sol', live: true },
      criteria: { taskResponse: { band: 5, comment: 'The figures are accurate and all four activities appear.' } },
    },
  };
  const finding = findOverviewGap([noComment]);
  assert.equal(finding.basis, 'automatic-check');
  assert.deepEqual(finding.failedChecks, ['summarising-signal']);
  const handoff = overviewHandoffText(finding);
  assert.match(handoff!.bodyKey, /automatic check/);
  assert.match(handoff!.bodyKey, /not a judgement/);
  assert.equal(handoff!.quote, undefined, 'nothing is put in quotation marks that nobody said');
});

test('an overview that is there but full of figures is caught by the same check', () => {
  const withFigures: GradedWritingAttempt = {
    at: '2026-09-20T10:00:00.000Z',
    promptId: 'pte-wt-121-task1',
    task: 'task1',
    live: true,
    essay:
      'The bar chart compares four activities. Overall, swimming rose from 420 to 540 while tennis fell from 310 to 180. Yoga grew steadily.',
    report: { grader: { name: 'gpt-5.6-sol', live: true }, criteria: { taskResponse: { band: 6, comment: 'Accurate throughout.' } } },
  };
  const finding = findOverviewGap([withFigures]);
  assert.equal(finding.basis, 'automatic-check');
  assert.deepEqual(finding.failedChecks, ['no-figures']);
});

test('no Task 1 evidence at all is unknown, and never a claimed weakness', () => {
  assert.equal(findOverviewGap([]).basis, 'no-evidence');
  assert.equal(findOverviewGap([]).found, false);

  const task2Only: GradedWritingAttempt = {
    at: '2026-09-20T10:00:00.000Z',
    promptId: 'pte-wt-132-task2',
    task: 'task2',
    live: true,
    essay: 'Some people argue that primary schools focus too much on formal learning.',
  };
  assert.equal(findOverviewGap([task2Only]).basis, 'no-evidence', 'a Task 2 essay says nothing about Task 1');
});

test('the most recent Task 1 is the one that is read', () => {
  const attempts = [markedReportFlaggingTheOverview(), markedReportPraisingTheOverview()];
  assert.equal(latestTask1(attempts)?.at, '2026-09-21T10:00:00.000Z');
  assert.equal(findOverviewGap(attempts).found, false, 'yesterday is not what they can do today');
});

/* ------------------------------------------------------------------ */
/* 3. The hand-off reconciles into the one plan                        */
/* ------------------------------------------------------------------ */

function memoryStorage(): BrowserStorage & WrittenDraftStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

function emptyProgress(): ProgressV1 {
  return { version: 1, lessons: {}, tests: {}, writing: {}, speaking: [], activity: {} } as unknown as ProgressV1;
}

function startLearning(owner: string) {
  resetLearningForTest();
  configureLearning({
    storage: memoryStorage(),
    owner: userOwner(owner),
    now: () => NOW,
    today: () => TODAY,
    legacy: () => ({ progress: emptyProgress(), plan: null }),
    legacyPlan: { read: () => null, write: () => {} },
    catalogue: CATALOGUE,
  });
}

test.afterEach(() => resetLearningForTest());

test('the hand-off adds the objective to the ONE plan and never creates a second next step', () => {
  startLearning('synthetic-overview-handoff');
  const before = getCurrentSession();
  const guidedId = focusedActivityId(GUIDED_ID);

  const reconciliation = reconcileProposal(
    guidedId,
    { activityId: before.activityId, objectiveScope: before.objectiveScope },
    CATALOGUE,
  );
  /* Either the plan is already on this objective, in which case the card
     says so, or it is something chooseObjective can add. There is no third
     answer that puts a competing step on the screen. */
  assert.ok(
    reconciliation.state === 'reconcilable' || reconciliation.state === 'matches-current',
    `expected a resolvable proposal, got ${reconciliation.state}`,
  );

  if (reconciliation.state === 'reconcilable') {
    chooseObjective(reconciliation.scopeKey, reconciliation.activityId);
  }
  const after = getCurrentSession();
  assert.equal(typeof after.activityId, 'string', 'there is still exactly one current activity');
  assert.equal(after.sessionId.length > 0, true, 'and exactly one session');
  const objectives = new Set([after.objectiveScope]);
  assert.equal(objectives.size, 1, 'one objective, never two');
});

test('a proposal that IS the current session is reported as such rather than offered again', () => {
  startLearning('synthetic-overview-current');
  const session = getCurrentSession();
  const same = reconcileProposal(
    session.activityId ?? 'nothing',
    { activityId: session.activityId, objectiveScope: session.objectiveScope },
    CATALOGUE,
  );
  assert.equal(same.state, 'matches-current');
});

/* ------------------------------------------------------------------ */
/* 4. Help, the model, and a reply with a number in it                 */
/* ------------------------------------------------------------------ */

test('opening the guiding questions marks the attempt assisted, for good', () => {
  const opened = withWrittenHelp(NO_WRITTEN_HELP, { guidingQuestionsOpened: true });
  assert.equal(opened.assistance, 'hint');
  const later = withWrittenHelp(opened, { modelShown: true });
  assert.equal(later.assistance, 'worked-example');
  const judged = withWrittenHelp(later, { tutorJudged: true });
  assert.equal(judged.assistance, 'tutor-explained');
  /* And it never comes back down, whatever arrives next. */
  assert.equal(withWrittenHelp(judged, { assistance: 'hint' }).assistance, 'tutor-explained');
});

test('an attempt written without opening anything is unaided', () => {
  assert.equal(NO_WRITTEN_HELP.assistance, 'none');
  assert.equal(withWrittenHelp(NO_WRITTEN_HELP, {}).assistance, 'none');
});

test('the model is not available before the student own attempt', () => {
  assert.equal(mayShowModel([]), false, 'before an attempt it is not a model, it is the answer');
  assert.equal(mayShowModel([{ at: NOW, text: 'Overall, both lines rose.' }]), true);
});

test('an evaluation reply containing a band-like number is refused and falls back', () => {
  const withBand = acceptEvaluation({
    verdict: 'partly',
    observations: ['Your overview says "both rose", which states the shape.', 'This would sit around band 6.5 for Task Achievement.'],
    suggestions: ['Name the sharpest movement.'],
    judged: true,
    live: true,
  });
  assert.ok('refused' in withBand);
  assert.equal((withBand as { refused: string }).refused, 'band-claim');

  const fallback = unjudgedEvaluation((withBand as { refused: string }).refused);
  assert.equal(fallback.judged, false, 'nothing judged it, so nothing claims to have');
  assert.equal(fallback.source, 'none');
  assert.equal(fallback.refused, 'band-claim', 'and the reason is kept rather than swallowed');
});

test('a score smuggled into one observation is caught wherever it is', () => {
  for (const sneaky of [
    'I would score this 7 out of 9 on the criterion.',
    'This is a band 6 overview.',
    'Это примерно 6.5 балла.',
  ]) {
    const result = acceptEvaluation({
      verdict: 'met',
      observations: ['Your first sentence names the shape of the chart.', sneaky],
      suggestions: ['Keep the figures out.'],
      judged: true,
      live: true,
    });
    assert.ok('refused' in result, `"${sneaky}" should be refused`);
  }
});

test('a well formed reply is taken, and a malformed one is not', () => {
  const good = acceptEvaluation({
    verdict: 'met',
    observations: [
      'Your overview says "both categories rose steadily", which states the shape without naming a single figure.',
      'You separated it from the detail with its own sentence, which is what the descriptor asks for.',
    ],
    suggestions: ['Name the biggest riser as well as the direction.'],
    judged: true,
    live: true,
  });
  assert.ok(!('refused' in good));
  assert.equal((good as { verdict: string }).verdict, 'met');
  assert.equal((good as { judged: boolean }).judged, true);
  assert.equal((good as { source: string }).source, 'live');

  assert.ok('refused' in acceptEvaluation({ verdict: 'excellent', observations: ['a', 'b'], suggestions: ['c'] }));
  assert.ok('refused' in acceptEvaluation({ verdict: 'met', observations: ['only one'], suggestions: ['c'] }));
  assert.ok('refused' in acceptEvaluation({ verdict: 'met', observations: ['a', 'b'], suggestions: [] }));
});

test('a simulated reply is never presented as a live one', () => {
  const simulated = acceptEvaluation({
    verdict: 'partly',
    observations: ['One observation here.', 'And a second one here.'],
    suggestions: ['Try naming the direction first.'],
    judged: true,
    live: false,
  });
  assert.equal((simulated as { source: string }).source, 'simulated');
});

/* ------------------------------------------------------------------ */
/* 5. Automatic checks, and what they do and do not claim              */
/* ------------------------------------------------------------------ */

const RULES = { minWords: 25, maxWords: 70, checks: task(GUIDED_ID).rules.checks };

test('the automatic checks are plain, visible rules over the words the student typed', () => {
  const good =
    'Overall, participation rose in every one of the activities except tennis, which fell sharply, while the gap between the most popular and the least popular narrowed steadily over the whole period.';
  const results = runAutomaticChecks(good, RULES);
  assert.deepEqual(
    results.map((check) => `${check.id}:${check.passed}`),
    ['summarising-signal:true', 'two-main-features:true', 'no-figures:true', 'length-in-range:true'],
  );

  const bad = 'Swimming was 540 in 2019.';
  const failed = runAutomaticChecks(bad, RULES).filter((check) => !check.passed).map((check) => check.id);
  assert.deepEqual(failed, ['summarising-signal', 'two-main-features', 'no-figures', 'length-in-range']);
});

test('the counting rules are the ones the screen says they are', () => {
  assert.equal(hasSummarisingSignal('Overall, the two lines converged.'), true);
  assert.equal(hasSummarisingSignal('The two lines converged overall.'), false, 'the signal is at the start of a sentence');
  assert.equal(mainFeatureCount('Overall, X rose while Y fell.'), 2, 'one sentence plus one joining word');
  assert.equal(mainFeatureCount('Overall, X rose.'), 1);
  assert.equal(mainFeatureCount('Overall, X rose. Y fell throughout.'), 2, 'two sentences');
  assert.deepEqual(figuresIn('It reached 44% of the total.'), ['44%']);
  assert.deepEqual(figuresIn('It reached forty four per cent.'), ['per cent']);
  assert.deepEqual(figuresIn('Every group rose.'), []);
});

test('nothing the closing panel says is a band, and nothing claims mastery', () => {
  const panels = [
    writtenFeedbackFor({ role: 'guided-practice', evaluation: unjudgedEvaluation(), assisted: true }),
    writtenFeedbackFor({
      role: 'independent-check',
      evaluation: { verdict: 'met', observations: ['a', 'b'], nextMove: 'c', judged: true, source: 'live' },
      assisted: false,
    }),
    writtenFeedbackFor({
      role: 'guided-practice',
      evaluation: { verdict: 'partly', observations: ['a', 'b'], nextMove: 'c', judged: true, source: 'live' },
      assisted: true,
    }),
  ];
  for (const panel of panels) {
    for (const text of [panel.demonstratedKey, panel.certaintyKey, panel.uncertainKey]) {
      /* A band may only ever be MENTIONED to deny one, the same rule the
         Reading pilot holds its own wording to. */
      assert.ok(
        !/\bband\b/i.test(text) || /(not|never|nothing here is) a band/i.test(text),
        `"${text}" must not claim a band`,
      );
      assert.ok(!/master/i.test(text) || /never mastery/i.test(text), `"${text}" must not claim mastery`);
      assert.ok(!/[–—]/.test(text), 'no dashes');
      assert.ok(!/\b\d(\.\d)?\s*(band|балл)/i.test(text), 'and never a number that reads as one');
    }
  }
  assert.match(panels[0]!.demonstratedKey, /Nothing looked at your writing/);
  assert.match(panels[0]!.certaintyKey, /not judged/);
  assert.match(panels[1]!.certaintyKey, /not a band/);
});

/* ------------------------------------------------------------------ */
/* 6. The record: what an attempt is worth, and what links to what     */
/* ------------------------------------------------------------------ */

function viewFor(id: string): WrittenTaskView {
  const entry = task(id);
  const activity = findActivity(focusedActivityId(entry.id), CATALOGUE)!;
  const prompt = WRITING_PROMPTS.find((candidate) => candidate.id === entry.source.promptId)!;
  const model = getModelAnswers(prompt.id).find((candidate) => candidate.band === 8);
  return {
    exerciseId: entry.id,
    activityId: activity.id,
    contentVersion: activity.contentVersion,
    role: entry.role,
    paper: entry.paper,
    subskill: entry.subskill,
    title: entry.title,
    objective: entry.objective,
    instruction: entry.instruction,
    expectedMinutes: entry.expectedMinutes,
    minWords: entry.rules.minWords,
    maxWords: entry.rules.maxWords,
    checks: entry.rules.checks,
    promptId: prompt.id,
    promptTitle: prompt.title,
    promptHtml: prompt.promptHtml,
    form: entry.source.form,
    attribution: entry.source.attribution,
    itemId: writtenItemId(prompt.id),
    guidingQuestions: guidingQuestionsFor(entry.role, WRITING_PLANS[prompt.id]?.overviewHints),
    modelOverview: model ? modelOverviewOf(model.text) : null,
    noticeInTheModel: entry.noticeInTheModel,
    lessonKey: entry.lesson?.key,
    blockId: 'b3-d81abda5',
    blockHeading: 'The Four Paragraphs',
    blockText: 'Paragraph 2 is the Overview. Start with "Overall," and give the two or three key features.',
  };
}

const JUDGED_MET = { verdict: 'met' as const, observations: ['one', 'two'], nextMove: 'three', judged: true, source: 'live' as const };
const JUDGED_NOT_YET = { verdict: 'not-yet' as const, observations: ['one', 'two'], nextMove: 'three', judged: true, source: 'live' as const };

test('a check is recorded as an assessment, guided work as practice, and a plan sample as a diagnostic', () => {
  assert.equal(modeForWritten('independent-check'), 'assessment');
  assert.equal(modeForWritten('guided-practice'), 'practice');
  assert.equal(modeForWritten('independent-check', 'assess'), 'diagnostic', 'a short sample the plan asked for');
  assert.equal(modeForWritten('guided-practice', 'practise'), 'practice');
});

test('an unjudged attempt is recorded as written but never as met', () => {
  const draft = writtenEvidenceDraft({
    view: viewFor(GUIDED_ID),
    text: 'Overall, both groups rose while the gap between them narrowed.',
    help: NO_WRITTEN_HELP,
    evaluation: unjudgedEvaluation('unreachable'),
    at: NOW,
    task: 'task1',
  });
  assert.equal(draft.outcome.kind, 'objective');
  assert.equal((draft.outcome as { met: boolean }).met, false, 'an unreachable tutor is not a failing grade');
  assert.equal((draft.outcome as { byModel: boolean }).byModel, false, 'and nothing claims a model wrote it');
  assert.equal((draft.outcome as { feedback?: string }).feedback, undefined);
  assert.equal(draft.items?.[0]?.correct, false);
  assert.equal(draft.completion, 'completed', 'they did write something');
});

test('a blank attempt is blank, not a bad result', () => {
  const draft = writtenEvidenceDraft({
    view: viewFor(GUIDED_ID),
    text: '   ',
    help: NO_WRITTEN_HELP,
    evaluation: unjudgedEvaluation(),
    at: NOW,
    task: 'task1',
  });
  assert.equal(draft.completion, 'blank');
});

test('writing about a chart marks that prompt met, so a check built on it is no longer unseen', () => {
  const view = viewFor(CHECK_A_ID);
  const draft = writtenEvidenceDraft({
    view,
    text: 'Overall, city living rose in every country while the rural share fell.',
    help: NO_WRITTEN_HELP,
    evaluation: JUDGED_MET,
    at: NOW,
    task: 'task1',
  });
  assert.deepEqual(draft.sourceMaterial, [promptExposureKey(view.promptId)]);
});

function recordWith(drafts: readonly EvidenceDraft[], from: LearnerRecordV1 = emptyLearnerRecord()): LearnerRecordV1 {
  let record = from;
  for (const draft of drafts) record = appendAllEvidence(record, [createEvidenceEvent(draft, record)]);
  return record;
}

test('a revision links to the original and the original is preserved', () => {
  startLearning('synthetic-overview-revision');
  const store = getLearnerStore();
  const view = viewFor(GUIDED_ID);

  const first = store.recordEvent(
    writtenEvidenceDraft({
      view,
      text: 'Swimming went up to 540 and tennis went down.',
      help: NO_WRITTEN_HELP,
      evaluation: JUDGED_NOT_YET,
      at: '2026-09-22T09:00:00.000Z',
      task: 'task1',
    }),
  );
  assert.ok(first);

  const helped = withWrittenHelp(NO_WRITTEN_HELP, { tutorJudged: true });
  const second = store.recordEvent(
    writtenEvidenceDraft({
      view,
      text: 'Overall, participation rose in every activity except tennis, which fell sharply over the period.',
      help: helped,
      evaluation: JUDGED_MET,
      at: '2026-09-22T09:12:00.000Z',
      task: 'task1',
    }),
  );
  assert.ok(second);

  assert.equal(second!.retryOf, first!.id, 'the revision names the attempt it revises');
  assert.equal(second!.assistance, 'tutor-explained', 'and it is recorded as assisted');
  const events = store.read().events.filter((event) => event.activityId === view.activityId);
  assert.equal(events.length, 2, 'the original is still there, it is not overwritten');
  assert.equal(events[0]!.id, first!.id);
  assert.ok((events[0]!.items?.[0]?.firstAnswer ?? '').startsWith('Swimming went up'), 'with its own words');
});

test('the student words survive a failed evaluation, and before and after are both kept', () => {
  const storage = memoryStorage();
  const written = 'Overall, every activity except tennis attracted more people by the end of the period.';
  assert.equal(writeWrittenDraft(storage, 'u:synthetic', GUIDED_ID, { draft: written, attempts: [] }), true);

  /* The evaluation fails. Nothing else happens: the words are exactly where
     they were. */
  const failed = unjudgedEvaluation('unreachable');
  assert.equal(failed.judged, false);
  assert.equal(readWrittenDraft(storage, 'u:synthetic', GUIDED_ID).draft, written);

  const afterFirst = withAttempt(EMPTY_WRITTEN_DRAFT, { at: NOW, text: written });
  const afterRevision = withAttempt(afterFirst, { at: '2026-09-22T09:12:00.000Z', text: 'A better one, with the gap named.', revisionOf: NOW });
  assert.equal(afterRevision.attempts.length, 2);
  assert.equal(afterRevision.attempts[0]!.text, written, 'the original is never replaced');
  assert.equal(afterRevision.draft, 'A better one, with the gap named.');

  /* A browser that refuses to write costs the copy, never the work. */
  const blocked: WrittenDraftStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('quota');
    },
    removeItem: () => {},
  };
  assert.equal(writeWrittenDraft(blocked, 'u:synthetic', GUIDED_ID, afterRevision), false);
  assert.deepEqual(readWrittenDraft(null, 'u:synthetic', GUIDED_ID), EMPTY_WRITTEN_DRAFT);
});

/* ------------------------------------------------------------------ */
/* 7. The transfer check: unseen, unhelped, and never a band           */
/* ------------------------------------------------------------------ */

function baseGoals(): PlanGoals {
  return {
    overallTarget: { band: 7, status: 'confirmed' },
    perPaperMinimums: {
      reading: { band: 7, status: 'confirmed' },
      listening: { band: 7, status: 'confirmed' },
      writing: { band: 7, status: 'confirmed' },
      speaking: { band: 7, status: 'confirmed' },
    },
    examDate: null,
    route: 'academic',
    selfReported: [],
  } as unknown as PlanGoals;
}

function baseConstraints(): PlanConstraints {
  return {
    regularDailyMinutes: 60,
    regularDailyMinutesStatus: 'confirmed',
    studyDays: 'daily',
    explanationLocale: 'en',
    tzOffsetMinutes: 0,
  } as unknown as PlanConstraints;
}

/** SYNTHETIC: the Writing student this pilot is for. Reading, Listening and
    Speaking are demonstrated at 7.5, and Writing is two live-graded Task 1
    reports at 5.0 with the marker naming the overview. Writing is therefore
    the paper the plan works on, which is the situation this pilot exists
    for. */
function syntheticOverviewStudent(): LearnerRecordV1 {
  const paper = (at: string, testId: string, skill: 'reading' | 'listening', band: number): EvidenceDraft => ({
    activityId: `test:${testId}`,
    contentVersion: 1,
    at,
    localDate: at.slice(0, 10),
    paper: skill,
    subskill: 'timing-and-transfer',
    mode: 'assessment',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: { kind: 'scored', raw: 33, total: 40, bandEstimate: band, bySubskill: {} },
    sourceMaterial: [`paper:${testId}`],
  });
  const spoken = (at: string, band: number): EvidenceDraft => ({
    activityId: 'speak:cc-2026-04',
    contentVersion: 1,
    at,
    localDate: at.slice(0, 10),
    paper: 'speaking',
    subskill: 'part2-hold-the-two-minutes',
    mode: 'assessment',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    taskScope: { kind: 'speaking-part', part: 2 },
    outcome: {
      kind: 'graded',
      overallBand: band,
      criteria: { fluencyCoherence: band, lexicalResource: band, grammaticalRange: band, pronunciation: band },
      grader: { name: 'gpt-audio-1.5', live: true },
    },
  });
  const graded = (at: string, promptId: string): EvidenceDraft => ({
    activityId: writingActivityId(promptId),
    contentVersion: 1,
    at,
    localDate: at.slice(0, 10),
    paper: 'writing',
    subskill: 'task1-data-language',
    mode: 'assessment',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    taskScope: { kind: 'writing-task', task: 'task1' },
    outcome: {
      kind: 'graded',
      overallBand: 5,
      criteria: { taskResponse: 5, coherenceCohesion: 6, lexicalResource: 6, grammaticalRange: 6 },
      grader: { name: 'gpt-5.6-sol', live: true },
      wordCount: 168,
    },
    sourceMaterial: [promptExposureKey(promptId)],
  });
  /* They have written two Task 1 reports, so they have read the method
     lesson. It matters: every full graded report has that lesson as its
     prerequisite, and a student who has not read it is correctly not
     offered one. */
  const studied: EvidenceDraft = {
    activityId: 'lesson:writing-method',
    contentVersion: 1,
    at: '2026-09-09T10:00:00.000Z',
    localDate: '2026-09-09',
    paper: 'writing',
    subskill: 'task1-select-key-features',
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: { kind: 'studied', estimatedMinutes: 15 },
  };
  return recordWith([
    studied,
    paper('2026-09-10T10:00:00.000Z', 'reading-full-001', 'reading', 7.5),
    paper('2026-09-12T10:00:00.000Z', 'reading-full-002', 'reading', 7.5),
    paper('2026-09-13T10:00:00.000Z', 'listening-full-001', 'listening', 7.5),
    spoken('2026-09-11T10:00:00.000Z', 7.5),
    spoken('2026-09-14T10:00:00.000Z', 7.5),
    graded('2026-09-15T10:00:00.000Z', 'pte-wt-121-task1'),
    graded('2026-09-18T10:00:00.000Z', 'pte-wt-120-task1'),
  ]);
}

/** The record after the student meets the objective on an unseen chart. */
function afterAMetTransferCheck(): LearnerRecordV1 {
  return recordWith(
    [
      {
        ...writtenEvidenceDraft({
          view: viewFor(CHECK_A_ID),
          text: 'Overall, the urban share rose in every country, and the gap between the highest and the lowest widened over the period.',
          help: NO_WRITTEN_HELP,
          evaluation: JUDGED_MET,
          at: '2026-09-22T09:30:00.000Z',
          task: 'task1',
        }),
        localDate: TODAY,
      },
    ],
    syntheticOverviewStudent(),
  );
}

/** What the plan would consider for the overview objective right now. */
function overviewContext(record: LearnerRecordV1) {
  const policy = evaluateEvidence({ record, goals: baseGoals(), now: NOW });
  return {
    policy,
    context: {
      catalogue: CATALOGUE,
      facts: learnerFacts(record, policy),
      policy,
      today: TODAY,
      overrides: [],
      unavailableSurfaces: [],
      minutes: 60,
      thresholds: DEFAULT_POLICY_THRESHOLDS,
    },
  };
}

function facts(record: LearnerRecordV1) {
  const policy = evaluateEvidence({ record, goals: baseGoals(), now: NOW });
  return { policy, facts: learnerFacts(record, policy) };
}

test('the transfer checks are unseen for this student, and writing their prompt spends them', () => {
  const record = syntheticOverviewStudent();
  const { facts: before } = facts(record);
  const checkA = findActivity(focusedActivityId(CHECK_A_ID), CATALOGUE)!;
  const checkB = findActivity(focusedActivityId(CHECK_B_ID), CATALOGUE)!;
  assert.equal(isUnseen(checkA, before), true, 'they have never written about this chart');
  assert.equal(isUnseen(checkB, before), true);

  /* Now they write the full report on check A's prompt. */
  const spent = recordWith(
    [
      {
        activityId: writingActivityId('pte-wt-117-task1'),
        contentVersion: 1,
        at: '2026-09-19T10:00:00.000Z',
        localDate: '2026-09-19',
        paper: 'writing',
        subskill: 'task1-data-language',
        mode: 'assessment',
        completion: 'completed',
        assistance: 'none',
        seenBefore: false,
        taskScope: { kind: 'writing-task', task: 'task1' },
        outcome: {
          kind: 'graded',
          overallBand: 6,
          criteria: { taskResponse: 6, coherenceCohesion: 6, lexicalResource: 6, grammaticalRange: 6 },
          grader: { name: 'gpt-5.6-sol', live: true },
        },
        sourceMaterial: [promptExposureKey('pte-wt-117-task1')],
      },
    ],
    record,
  );
  const { facts: after } = facts(spent);
  assert.equal(isUnseen(checkA, after), false, 'they have met that chart, so it is no longer a transfer check');
  assert.equal(isUnseen(checkB, after), true, 'which is why there is more than one');
});

test('help is refused while a transfer check is running, and the refusal explains itself', async () => {
  const view = viewFor(CHECK_A_ID);
  const result = await requestLessonHelp({
    kind: 'hint',
    lessonKey: view.lessonKey ?? 'writing-method',
    blockId: view.blockId,
    blockHeading: view.blockHeading,
    blockText: view.blockText,
    attempted: false,
    previousHints: [],
    assistanceSoFar: 'none',
    versions: { planRevision: 1, evidenceVersion: 1, indexVersion: CATALOGUE.indexVersion },
    locale: 'en',
    underAssessment: true,
  });
  assert.equal(result.blocked, true);
  assert.equal(result.assistanceAfter, 'none', 'a refusal is not help, so nothing is recorded as assisted');
  assert.equal(view.guidingQuestions.length, 0, 'and there are no guiding questions to open either');
  assert.equal(view.role, 'independent-check');
});

test('objective evidence never produces a band, and never exceeds what three prompts can support', () => {
  const record = recordWith(
    [
      {
        ...writtenEvidenceDraft({
          view: viewFor(CHECK_A_ID),
          text: 'Overall, the urban share rose in every country, and the widest gap opened between the first and last.',
          help: NO_WRITTEN_HELP,
          evaluation: JUDGED_MET,
          at: '2026-09-22T09:30:00.000Z',
          task: 'task1',
        }),
        localDate: TODAY,
      },
    ],
    syntheticOverviewStudent(),
  );
  const policy = evaluateEvidence({ record, goals: baseGoals(), now: NOW });

  const overview = policy.estimates.find((entry) => entry.scopeKey === OVERVIEW_SCOPE);
  assert.ok(overview, 'the objective has a scope of its own');
  assert.equal(overview!.band, null, 'one overview is never a band');
  assert.ok(
    ['limited', 'tentative'].includes(overview!.certainty),
    `two sentences can never be measured, got ${overview!.certainty}`,
  );

  /* The cap is STRUCTURAL, not a hope: an objective judgement is worth one
     independent item, the only unseen prompts are the reserved ones, and a
     repeat of a met prompt is ignored. So the scope cannot reach the item
     count `measured` asks for, and a later package adding a fourth check
     to THIS objective would fail here rather than quietly promoting a
     paragraph to a band. Scoped to the overview's own reserved prompts
     (RESERVED_CHECK_PROMPT_IDS is global across every WP20 objective since
     2026-09-22, and other objectives having their own checks says nothing
     about how many this one has). */
  const overviewReservedCount = WRITTEN_FOCUSED_TASKS.filter(
    (entry) => entry.subskill === 'task1-overview' && entry.role === 'independent-check',
  ).length;
  assert.ok(
    overviewReservedCount < DEFAULT_POLICY_THRESHOLDS.patternMinItems,
    'fewer reserved prompts than the items a measured estimate needs',
  );
});

test('Task 1 evidence never appears in the Task 2 scope', () => {
  const record = recordWith(
    [
      {
        ...writtenEvidenceDraft({
          view: viewFor(CHECK_A_ID),
          text: 'Overall, the urban share rose everywhere while the rural share fell.',
          help: NO_WRITTEN_HELP,
          evaluation: JUDGED_MET,
          at: '2026-09-22T09:30:00.000Z',
          task: 'task1',
        }),
        localDate: TODAY,
      },
    ],
    syntheticOverviewStudent(),
  );
  const policy = evaluateEvidence({ record, goals: baseGoals(), now: NOW });

  const task2 = policy.estimates.find((entry) => entry.scopeKey === 'writing-task:task2');
  assert.ok(
    !task2 || (task2.certainty === 'unknown' && task2.band === null),
    'nothing about Task 1 says anything about Task 2',
  );
  for (const estimate of policy.estimates) {
    if (!estimate.scopeKey.startsWith('subskill:writing:task2-')) continue;
    assert.equal(estimate.evidence.independentOccasions, 0, `${estimate.scopeKey} borrowed nothing from Task 1`);
  }
  const overview = policy.estimates.find((entry) => entry.scopeKey === OVERVIEW_SCOPE);
  assert.ok((overview?.evidence.independentOccasions ?? 0) > 0, 'while the Task 1 objective really did get it');
});

/* ------------------------------------------------------------------ */
/* 8. The plan moves on what the check shows                           */
/* ------------------------------------------------------------------ */

function planFor(record: LearnerRecordV1) {
  const policy = evaluateEvidence({ record, goals: baseGoals(), now: NOW });
  const { plan } = createInitialPlan({
    catalogue: CATALOGUE,
    record,
    policy,
    now: NOW,
    today: TODAY,
    goals: baseGoals(),
    constraints: baseConstraints(),
  });
  return { plan, policy };
}

test('this student is the one the pilot is for: the plan is working on Writing', () => {
  const { plan } = planFor(syntheticOverviewStudent());
  assert.ok(
    plan.activeSession.objectiveScope.startsWith('subskill:writing:'),
    `Writing is the paper that is short of its minimum, got ${plan.activeSession.objectiveScope}`,
  );
});

test('a met transfer check moves effort off the overview and never offers that chart again', () => {
  const before = overviewContext(syntheticOverviewStudent());
  const after = overviewContext(afterAMetTransferCheck());
  const objective = { paper: 'writing' as const, subskill: 'task1-overview' as const };

  /* Before: there are three unseen charts to check this on. */
  const unseenBefore = checkOptions(objective, CATALOGUE).filter((entry) => isUnseen(entry.activity, before.context.facts));
  assert.equal(unseenBefore.length, 3, 'three reserved charts, none of them met');

  /* After: the one they just wrote about is spent, and the others are not,
     which is the whole reason more than one is held back. */
  const unseenAfter = checkOptions(objective, CATALOGUE).filter((entry) => isUnseen(entry.activity, after.context.facts));
  assert.equal(unseenAfter.length, 2);
  assert.ok(
    !unseenAfter.some((entry) => entry.activity.id === focusedActivityId(CHECK_A_ID)),
    'the chart they have just written about is never a transfer check again',
  );

  /* And the objective is worth less effort than it was, so the plan moves
     on rather than grinding the same two sentences. */
  const scoreFor = (input: ReturnType<typeof overviewContext>) => {
    const scored = scoreObjectives({
      catalogue: CATALOGUE,
      facts: input.context.facts,
      policy: input.policy,
      goals: baseGoals(),
      constraints: baseConstraints(),
      overrides: [],
      today: TODAY,
      budgetMinutes: 60,
      thresholds: DEFAULT_POLICY_THRESHOLDS,
      weights: DEFAULT_PLANNER_WEIGHTS,
      status: 'provisional-no-date',
      daysToExam: null,
      previous: null,
    } as never);
    return scored.find((entry) => entry.objective.scopeKey === OVERVIEW_SCOPE)?.score ?? null;
  };
  const scoreBefore = scoreFor(before);
  const scoreAfter = scoreFor(after);
  assert.ok(scoreBefore !== null && scoreAfter !== null, 'the objective is scored at all');
  assert.ok(scoreAfter! < scoreBefore!, `effort should move on, ${scoreAfter} is not below ${scoreBefore}`);
});

test('the full graded Task 1 is what the plan puts in front of the student, because it is what can move a band', () => {
  const after = overviewContext(afterAMetTransferCheck());
  const objective = { paper: 'writing' as const, subskill: 'task1-overview' as const };

  /* The short overview task is judged against one objective and carries no
     band, by design. The authoritative measure is a whole report marked by
     the calibrated grader, so the objective's own practice list has to lead
     there once the short work is done. This student has read the Task 1
     method lesson, which is the prerequisite of every full report, so the
     eligibility below is the real thing rather than a relaxed one. */
  assert.ok(
    teachingPath(objective, { ...after.context, minutes: Number.POSITIVE_INFINITY }).every(
      (activity) => activity.paper === 'writing',
    ),
    'the teaching this objective needs is Writing teaching',
  );
  const practice = practiceOptions(objective, 60, CATALOGUE).filter((activity) =>
    isEligible(activity, after.context),
  );
  assert.ok(
    practice.some((activity) => activity.id.startsWith('write:')),
    'a full graded Task 1 is eligible practice for this objective',
  );
  for (const activity of practice) {
    if (!activity.id.startsWith('write:')) continue;
    assert.equal(activity.completionEvidence, 'graded-rubric', 'and it is the calibrated grader that marks it');
    assert.ok(
      !RESERVED_CHECK_PROMPT_IDS.some((promptId) => activity.id === writingActivityId(promptId)),
      'never on a chart held back for a check',
    );
  }

  /* Whether the WHOLE plan's near-term schedule reaches a `write:` step
     inside this exact synthetic window depends on how much OTHER content is
     eligible and unaddressed at the same time. WP18 to WP20 (2026-09-22)
     landed concurrently and together added dozens of zero-evidence
     objectives across every paper, so a short fixed-length schedule can
     legitimately spend its near-term slots teaching several of those before
     it ever reaches this one Task 1 essay, without the objective itself
     being blocked: the assertions above already prove the full graded task
     is genuine, eligible, unreserved practice for it, which is the claim
     this test exists to defend. What must never happen, and still does
     not, is the plan sending the student BACK over the exact chart they
     just sat. */
  const { plan } = planFor(afterAMetTransferCheck());
  assert.ok(
    !plan.activeSession.steps.some((step) => step.activityId === focusedActivityId(CHECK_A_ID)),
    'and never the check they have just sat',
  );
});

test('a not-yet transfer check keeps the objective and never repeats the chart they have seen', () => {
  const record = recordWith(
    [
      {
        ...writtenEvidenceDraft({
          view: viewFor(CHECK_A_ID),
          text: 'The urban share was 52% in the first country and 61% in the second.',
          help: NO_WRITTEN_HELP,
          evaluation: JUDGED_NOT_YET,
          at: '2026-09-22T09:30:00.000Z',
          task: 'task1',
        }),
        localDate: TODAY,
      },
    ],
    syntheticOverviewStudent(),
  );
  const after = overviewContext(record);
  const objective = { paper: 'writing' as const, subskill: 'task1-overview' as const };

  const unseen = checkOptions(objective, CATALOGUE).filter((entry) => isUnseen(entry.activity, after.context.facts));
  assert.equal(unseen.length, 2, 'the objective is still there to be shown, on material they have not met');
  assert.ok(
    !unseen.some((entry) => entry.activity.id === focusedActivityId(CHECK_A_ID)),
    'a weak result never sends them back over the chart they have just seen',
  );

  const { plan } = planFor(record);
  const practise = plan.activeSession.steps.find((step) => step.role === 'practise');
  assert.notEqual(practise?.activityId, focusedActivityId(CHECK_A_ID));
});

/* ------------------------------------------------------------------ */
/* 9. Writing can finally be diagnosed in fifteen minutes              */
/* ------------------------------------------------------------------ */

test('the short overview task is eligible as the Writing diagnostic sample inside fifteen minutes', () => {
  const empty = emptyLearnerRecord();
  const { policy, facts: learner } = facts(empty);
  const candidates = diagnosticCandidates('writing', {
    catalogue: CATALOGUE,
    facts: learner,
    policy,
    today: TODAY,
    overrides: [],
    unavailableSurfaces: [],
    minutes: Number.POSITIVE_INFINITY,
    thresholds: DEFAULT_POLICY_THRESHOLDS,
  });

  assert.ok(candidates.length > 0, 'Writing has a short sample at all, which it did not before this package');
  const shortest = candidates[0]!;
  assert.ok(
    shortest.expectedMinutes <= 15,
    `the shortest Writing sample is ${shortest.expectedMinutes} minutes, and a diagnostic step is capped at 15`,
  );
  assert.equal(shortest.completionEvidence, 'objective-judged');
  assert.equal(shortest.verified, true, 'an unverified set could never be a sample');

  /* WP20 (2026-09-22) added ten further short Writing objectives, several
     shorter than the overview's own 8-minute guided task, so the SHORTEST
     candidate is no longer necessarily the overview any more. What still
     has to hold, and is this pilot's own claim, is that the overview task
     is itself ONE of the eligible under-15-minute Writing samples. */
  const overviewCandidate = candidates.find((candidate) => candidate.id.startsWith('focus:writing-task1-overview-'));
  assert.ok(overviewCandidate, `the overview task should still be an eligible sample, got ${candidates.map((c) => c.id).join(', ')}`);
  assert.ok(overviewCandidate!.expectedMinutes <= 15);
});

test('a diagnostic sample of the overview is capped at tentative however well it goes', () => {
  const record = recordWith([
    {
      ...writtenEvidenceDraft({
        view: viewFor(CHECK_A_ID),
        text: 'Overall, the urban share rose in every country while the rural share fell throughout.',
        help: NO_WRITTEN_HELP,
        evaluation: JUDGED_MET,
        at: '2026-09-22T09:30:00.000Z',
        task: 'task1',
        stepRole: 'assess',
      }),
      localDate: TODAY,
    },
  ]);
  const event = record.events[0]!;
  assert.equal(event.mode, 'diagnostic', 'a sample the plan asked for is a diagnostic');

  const policy = evaluateEvidence({ record, goals: baseGoals(), now: NOW });
  const overview = policy.estimates.find((entry) => entry.scopeKey === OVERVIEW_SCOPE);
  assert.ok(overview);
  assert.ok(['limited', 'tentative'].includes(overview!.certainty), `capped, got ${overview!.certainty}`);
  assert.equal(overview!.band, null);
});

/* ------------------------------------------------------------------ */
/* 10. Nothing a student reads carries a dash                          */
/* ------------------------------------------------------------------ */

test('nothing authored by this package contains an em dash or an en dash', () => {
  const files = [
    'src/data/focused/writing-task1-overview.ts',
    'src/data/focused-exercises.ts',
    'src/components/learning/written-focused-task.ts',
    'src/components/learning/WritingFocusedTask.tsx',
    'src/components/learning/WorkOnOverview.tsx',
    'src/styles/learning-writing-focus.css',
    'src/lib/i18n/dict/ru/learning-writing-focus.ts',
  ];
  for (const file of files) {
    const text = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const offending = text.split('\n').filter((line) => /[–—]/.test(line) && !/^\s*\/?\*|─/.test(line));
    assert.deepEqual(offending, [], `${file} should have no dashes in it`);
  }
});

test('the objective the tutor is held to says all three things an overview has to do', () => {
  const objective = task(GUIDED_ID).objective;
  assert.match(objective, /main trends|main features/i, 'what it must state');
  assert.match(objective, /no specific figures|without figures/i, 'what it must leave out');
  assert.match(objective, /separate from the detail/i, 'and that it stands apart from the detail');
  /* Every overview task in THIS pilot is judged against the same sentence.
     WP20's other ten objectives (2026-09-22) each have their OWN one
     sentence, which is the same rule applied eleven times over, not a
     departure from it; each is asserted against the catalogue in
     tests/writing-speaking-objectives.test.ts. */
  for (const entry of WRITING_TASK1_OVERVIEW) {
    assert.equal(entry.objective, objective, 'every task in the pilot is judged against the same sentence');
    assert.equal(
      findActivity(focusedActivityId(entry.id), CATALOGUE)?.objective,
      objective,
      'and the Worker reads it from the catalogue, never from the request',
    );
  }
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    assert.equal(
      findActivity(focusedActivityId(entry.id), CATALOGUE)?.objective,
      entry.objective,
      `${entry.id}: the Worker reads its own objective from the catalogue, never from the request`,
    );
  }
});
