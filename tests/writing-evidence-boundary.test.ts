/* The boundary a written focused task actually crosses: what an attempt is
 * recorded as, and which task it is recorded against.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/writing-evidence-boundary.test.ts
 * The whole suite is `npm test`.
 *
 * WHY IT EXISTS
 * The independent review of 22 September 2026 found two defects here, and
 * both were in the JOIN between the component and the evidence layer rather
 * than in either of them:
 *
 *   finding 2  a SUCCESSFUL evaluation disqualified the answer it had just
 *              evaluated. The submit handler raised the help state to
 *              "tutor explained" and then recorded the submitted answer with
 *              that raised state, so the moment an independent check went
 *              well it stopped being independent evidence.
 *   finding 3  every submission was recorded as Task 1, including the
 *              twenty-three Task 2 exercises the same component renders.
 *
 * Neither was caught by a helper test, because every helper was right on its
 * own. So this file runs the REAL functions in the REAL order the component
 * runs them in (see `submit` below, which mirrors WritingFocusedTask.tsx's
 * evaluate() and record()), on REAL registered exercises, and finishes by
 * reading the component's own source to check the order has not quietly
 * gone back.
 *
 * Every learner here is SYNTHETIC and every evaluation is a labelled
 * synthetic object. No model is called, live or simulated: what is being
 * tested is bookkeeping, not model quality.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WRITTEN_FOCUSED_TASKS,
  writtenItemId,
  type WrittenFocusedTask,
  type WrittenPiece,
} from '../src/data/focused-exercises.ts';
import { WRITING_PROMPTS } from '../src/data/writing-prompts.ts';
import { findActivity, focusedActivityId, learningCatalogue } from '../src/lib/learning/catalog.ts';
import { classifyEvidence } from '../src/lib/learning/evidence.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import type { PlanGoals } from '../src/lib/learning/contracts/plan.ts';
import { configureLearning, resetLearningForTest } from '../src/lib/learning/index.ts';
import { getLearnerStore, userOwner, type BrowserStorage } from '../src/lib/learning/store.browser.ts';
import type { ProgressV1 } from '../src/lib/progress.ts';
import { strings as RU } from '../src/lib/i18n/dict/ru/index.ts';
import {
  EMPTY_WRITTEN_DRAFT,
  NO_WRITTEN_HELP,
  guidingQuestionsFor,
  helpAfterEvaluation,
  helpToRecord,
  readWrittenDraft,
  withAttempt,
  withWrittenHelp,
  writeWrittenDraft,
  writtenEvidenceDraft,
  writtenFeedbackFor,
  writtenHelpFrom,
  writtenPieceWording,
  writtenTaskLabel,
  type WrittenDraftStorage,
  type WrittenEvaluation,
  type WrittenHelpState,
  type WrittenTaskDraft,
  type WrittenTaskView,
} from '../src/components/learning/written-focused-task.ts';

const CATALOGUE = learningCatalogue();
const NOW = '2026-09-22T09:00:00.000Z';
const TODAY = '2026-09-22';

/* Two REAL registered exercises, one per task, both independent checks so
   an unhelped attempt on one is the strongest evidence the surface can
   produce. Naming them here rather than taking "the first Task 2 one"
   keeps the test readable when the registry grows. */
const TASK1_CHECK = 'writing-task1-overview-check-a';
const TASK2_CHECK = 'writing-task2-conclusion-check';
const TASK1_GUIDED = 'writing-task1-overview-guided';

/** A labelled SYNTHETIC evaluation that succeeded. Nothing called a model
    to produce it, and the file says so wherever it is used. */
const JUDGED_MET: WrittenEvaluation = {
  verdict: 'met',
  observations: ['SYNTHETIC successful evaluation, no live model was called.'],
  nextMove: 'SYNTHETIC next move.',
  judged: true,
  source: 'live',
};

const JUDGED_NOT_YET: WrittenEvaluation = {
  verdict: 'not-yet',
  observations: ['SYNTHETIC evaluation, no live model was called.'],
  nextMove: 'SYNTHETIC next move.',
  judged: true,
  source: 'live',
};

function task(id: string): WrittenFocusedTask {
  const found = WRITTEN_FOCUSED_TASKS.find((entry) => entry.id === id);
  assert.ok(found, `${id} is not a registered written task`);
  return found!;
}

/** The view exactly as src/pages/trainers/focused/[id].astro builds it: the
    scope and the noun come off the registry entry, never off a title and
    never as a literal. The teaching block is a clearly labelled fixture,
    because which paragraph of which lesson is quoted has nothing to do with
    what is being tested here. */
function viewFor(id: string): WrittenTaskView {
  const entry = task(id);
  const prompt = WRITING_PROMPTS.find((candidate) => candidate.id === entry.source.promptId);
  assert.ok(prompt, `${id} names a prompt that does not exist`);
  assert.equal(prompt!.task, entry.source.task, 'the registry and the prompt agree about the task');
  const activity = findActivity(focusedActivityId(entry.id), CATALOGUE);
  return {
    exerciseId: entry.id,
    activityId: focusedActivityId(entry.id),
    contentVersion: activity?.contentVersion ?? 1,
    role: entry.role,
    paper: entry.paper,
    subskill: entry.subskill,
    task: entry.source.task,
    piece: entry.piece,
    title: entry.title,
    objective: entry.objective,
    instruction: entry.instruction,
    expectedMinutes: entry.expectedMinutes,
    minWords: entry.rules.minWords,
    maxWords: entry.rules.maxWords,
    checks: entry.rules.checks,
    promptId: prompt!.id,
    promptTitle: prompt!.title,
    promptHtml: prompt!.promptHtml,
    form: entry.source.form,
    attribution: entry.source.attribution,
    itemId: writtenItemId(prompt!.id),
    guidingQuestions: guidingQuestionsFor(entry.role, entry.guidingQuestions ?? ['SYNTHETIC fixture question.']),
    modelOverview: 'SYNTHETIC fixture model paragraph.',
    noticeInTheModel: entry.noticeInTheModel,
    lessonKey: entry.lesson?.key,
    blockId: 'fixture-block',
    blockHeading: 'SYNTHETIC fixture heading',
    blockText: 'SYNTHETIC fixture block text.',
  };
}

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

function startLearning(owner: string, storage: BrowserStorage) {
  resetLearningForTest();
  configureLearning({
    storage,
    owner: userOwner(owner),
    now: () => NOW,
    today: () => TODAY,
    legacy: () => ({ progress: emptyProgress(), plan: null }),
    legacyPlan: { read: () => null, write: () => {} },
    catalogue: CATALOGUE,
  });
}

test.afterEach(() => resetLearningForTest());

/* ------------------------------------------------------------------ */
/* The component's own path, with no DOM                               */
/* ------------------------------------------------------------------ */

/** One open task, holding exactly what WritingFocusedTask.tsx holds: the
    draft (per owner, per exercise) and the help state. */
interface Workspace {
  view: WrittenTaskView;
  held: WrittenTaskDraft;
  help: WrittenHelpState;
  owner: string;
  storage: BrowserStorage & WrittenDraftStorage;
}

/** Opening the page, or coming back to it: the draft is read, and the help
    state comes back with it. */
function openTask(view: WrittenTaskView, storage: BrowserStorage & WrittenDraftStorage, owner: string): Workspace {
  const held = readWrittenDraft(storage, owner, view.exerciseId);
  return { view, held, help: held.help, owner, storage };
}

/** noteHelp(): something was shown, and it is written to the draft at once
    rather than at the end. */
function showHelp(workspace: Workspace, change: Parameters<typeof withWrittenHelp>[1]) {
  workspace.help = withWrittenHelp(workspace.help, change);
  workspace.held = { ...workspace.held, help: workspace.help };
  writeWrittenDraft(workspace.storage, workspace.owner, workspace.view.exerciseId, workspace.held);
}

/** evaluate() then record(), in that order and with that split: the answer
    is recorded with the help it was WRITTEN with, and the evaluation's own
    state is carried to whatever comes next. */
function submit(workspace: Workspace, text: string, evaluation: WrittenEvaluation, at: string) {
  const helpBeforeSubmission = workspace.help;
  const recorded = helpToRecord(helpBeforeSubmission);
  const carried = helpAfterEvaluation(helpBeforeSubmission, evaluation);
  const event = getLearnerStore().recordEvent(
    writtenEvidenceDraft({ view: workspace.view, text, help: recorded, evaluation, at, locale: 'en' }),
  );
  const last = workspace.held.attempts[workspace.held.attempts.length - 1];
  workspace.held = withAttempt(
    workspace.held,
    {
      at,
      text,
      ...(event?.id ? { evidenceId: event.id } : {}),
      ...(last ? { revisionOf: last.at } : {}),
    },
    carried,
  );
  writeWrittenDraft(workspace.storage, workspace.owner, workspace.view.exerciseId, workspace.held);
  workspace.help = carried;
  return { event, recorded, carried };
}

/* ------------------------------------------------------------------ */
/* 1. Finding 2: when help counts                                      */
/* ------------------------------------------------------------------ */

test('an unaided first answer is independent evidence even when the evaluation succeeds', () => {
  const storage = memoryStorage();
  startLearning('synthetic-boundary-unaided', storage);
  const workspace = openTask(viewFor(TASK1_CHECK), storage, 'u:synthetic-boundary-unaided');

  const { event, recorded, carried } = submit(
    workspace,
    'SYNTHETIC: Overall, the urban share rose in every country while the rural share fell throughout.',
    JUDGED_MET,
    NOW,
  );

  assert.equal(recorded.assistance, 'none', 'nothing had been shown when this was written');
  assert.ok(event, 'the attempt was recorded');
  assert.equal(event!.assistance, 'none', 'and it is recorded as unaided work');
  assert.equal(event!.items?.[0]?.assistance, 'none', 'the item row agrees');
  const classified = classifyEvidence(event!);
  assert.equal(classified.use, 'independent', 'which is the whole point of an independent check');
  assert.equal(classified.reason, undefined);

  /* The feedback it has just received still counts for everything after
     it, which is the other half of the rule. */
  assert.equal(carried.tutorJudged, true);
  assert.equal(carried.assistance, 'tutor-explained');
});

test('an evaluation that never happened changes nothing about what comes next', () => {
  const before = withWrittenHelp(NO_WRITTEN_HELP, {});
  const unjudged: WrittenEvaluation = {
    verdict: 'not-yet',
    observations: [],
    nextMove: '',
    judged: false,
    source: 'none',
    refused: 'unreachable',
  };
  assert.equal(helpToRecord(before).assistance, 'none');
  assert.equal(helpAfterEvaluation(before, unjudged).assistance, 'none', 'nothing was explained, so nothing was helped');
  assert.equal(helpAfterEvaluation(before, JUDGED_MET).assistance, 'tutor-explained');
});

test('a revision written after the feedback is assisted and linked to the original', () => {
  const storage = memoryStorage();
  startLearning('synthetic-boundary-revision', storage);
  const workspace = openTask(viewFor(TASK1_GUIDED), storage, 'u:synthetic-boundary-revision');

  const first = submit(
    workspace,
    'SYNTHETIC: Swimming went up to 540 and tennis went down.',
    JUDGED_NOT_YET,
    '2026-09-22T09:00:00.000Z',
  );
  assert.equal(first.event!.assistance, 'none', 'the first answer was written with nothing shown');

  const second = submit(
    workspace,
    'SYNTHETIC: Overall, participation rose in every activity except tennis, which fell sharply.',
    JUDGED_MET,
    '2026-09-22T09:12:00.000Z',
  );
  assert.equal(second.recorded.assistance, 'tutor-explained', 'the revision was written after reading the feedback');
  assert.equal(second.event!.assistance, 'tutor-explained');
  assert.equal(second.event!.retryOf, first.event!.id, 'and it names the attempt it revises');
  assert.equal(classifyEvidence(second.event!).use, 'assisted');

  /* The original is kept, with its own words and its own level. */
  const events = getLearnerStore().read().events.filter((event) => event.activityId === workspace.view.activityId);
  assert.equal(events.length, 2);
  assert.equal(events[0]!.assistance, 'none');
  assert.equal(classifyEvidence(events[0]!).use, 'independent');
  assert.equal(workspace.held.attempts.length, 2, 'and both attempts are still in the draft');
  assert.match(workspace.held.attempts[0]!.text, /Swimming went up/);
});

test('a first answer written after a hint, or after the model, is assisted', () => {
  for (const [change, expected] of [
    [{ guidingQuestionsOpened: true }, 'hint'],
    [{ modelShown: true }, 'worked-example'],
  ] as const) {
    const storage = memoryStorage();
    startLearning('synthetic-boundary-helped', storage);
    const workspace = openTask(viewFor(TASK1_GUIDED), storage, 'u:synthetic-boundary-helped');

    showHelp(workspace, change);
    const { event, recorded } = submit(workspace, 'SYNTHETIC: Overall, both lines rose.', JUDGED_MET, NOW);

    assert.equal(recorded.assistance, expected, 'the help came first, so the answer carries it');
    assert.equal(event!.assistance, expected);
    const classified = classifyEvidence(event!);
    assert.equal(classified.use, 'assisted');
    assert.equal(classified.reason, 'assistance-used');
    resetLearningForTest();
  }
});

/* ------------------------------------------------------------------ */
/* 2. Help survives the tab being closed                               */
/* ------------------------------------------------------------------ */

test('a hint taken before answering is still help after a reload', () => {
  const storage = memoryStorage();
  startLearning('synthetic-boundary-reload', storage);
  const owner = 'u:synthetic-boundary-reload';
  const view = viewFor(TASK1_GUIDED);

  const first = openTask(view, storage, owner);
  showHelp(first, { guidingQuestionsOpened: true });
  assert.equal(first.help.assistance, 'hint');

  /* The tab is closed and the page is opened again: the same owner, the
     same exercise, a fresh component. */
  const resumed = openTask(view, storage, owner);
  assert.equal(resumed.held.help.guidingQuestionsOpened, true, 'the draft remembers what was opened');
  assert.equal(resumed.help.assistance, 'hint', 'so the next answer cannot read as unaided');

  const { event } = submit(resumed, 'SYNTHETIC: Overall, both lines rose steadily.', JUDGED_MET, NOW);
  assert.equal(event!.assistance, 'hint');
  assert.equal(classifyEvidence(event!).use, 'assisted');
});

test('the draft round-trips the help state, and a stored level can never come back lower than its flags', () => {
  const storage = memoryStorage();
  const view = viewFor(TASK1_GUIDED);
  const owner = 'u:synthetic-boundary-draft';

  const held: WrittenTaskDraft = {
    draft: 'SYNTHETIC: half an overview.',
    help: withWrittenHelp(NO_WRITTEN_HELP, { modelShown: true }),
    attempts: [],
  };
  assert.equal(writeWrittenDraft(storage, owner, view.exerciseId, held), true);
  const back = readWrittenDraft(storage, owner, view.exerciseId);
  assert.equal(back.draft, held.draft, 'not one word is lost');
  assert.deepEqual(back.help, held.help, 'and neither is the help');

  /* A draft written before this field existed reads as nothing shown,
     which is the only honest answer. */
  storage.setItem(
    `ielts.learning.written.v1::${owner}::older-draft`,
    JSON.stringify({ draft: 'SYNTHETIC older draft.', attempts: [] }),
  );
  assert.deepEqual(readWrittenDraft(storage, owner, 'older-draft').help, NO_WRITTEN_HELP);

  /* A stored state that claims less help than its own flags is raised back
     up rather than believed. */
  assert.equal(
    writtenHelpFrom({ guidingQuestionsOpened: true, modelShown: false, tutorJudged: false, assistance: 'none' })
      .assistance,
    'hint',
  );
  assert.equal(writtenHelpFrom({ assistance: 'nonsense' }).assistance, 'none');
  assert.equal(writtenHelpFrom(undefined).assistance, 'none');
  assert.deepEqual(readWrittenDraft(null, owner, view.exerciseId), EMPTY_WRITTEN_DRAFT);

  /* An attempt never lowers what was already held. */
  const afterAttempt = withAttempt(held, { at: NOW, text: 'SYNTHETIC attempt.' }, NO_WRITTEN_HELP);
  assert.equal(afterAttempt.help.assistance, 'worked-example');
});

/* ------------------------------------------------------------------ */
/* 3. Finding 3: which task the work is recorded against               */
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

test('a real Task 1 and a real Task 2 exercise are recorded in their own scopes, and the plan inputs keep them apart', () => {
  const storage = memoryStorage();
  startLearning('synthetic-boundary-scopes', storage);
  const owner = 'u:synthetic-boundary-scopes';

  const task1 = submit(
    openTask(viewFor(TASK1_CHECK), storage, owner),
    'SYNTHETIC: Overall, the urban share rose in every country while the rural share fell.',
    JUDGED_MET,
    '2026-09-22T09:00:00.000Z',
  );
  const task2 = submit(
    openTask(viewFor(TASK2_CHECK), storage, owner),
    'SYNTHETIC: In conclusion, the benefits outweigh the drawbacks, and schools should therefore keep the policy.',
    JUDGED_MET,
    '2026-09-22T09:20:00.000Z',
  );

  assert.deepEqual(task1.event!.taskScope, { kind: 'writing-task', task: 'task1' });
  assert.deepEqual(task2.event!.taskScope, { kind: 'writing-task', task: 'task2' }, 'a Task 2 exercise is Task 2 evidence');
  assert.equal(task2.event!.activityId, focusedActivityId(TASK2_CHECK));

  const record = getLearnerStore().read();
  const policy = evaluateEvidence({ record, goals: baseGoals(), now: '2026-09-22T10:00:00.000Z' });
  const scope = (key: string) => policy.estimates.find((estimate) => estimate.scopeKey === key);

  /* Each objective got its own evidence, and nothing was borrowed either
     way: this is what the plan actually reads when it decides what to work
     on next. */
  const task1Scope = `subskill:writing:${task(TASK1_CHECK).subskill}`;
  const task2Scope = `subskill:writing:${task(TASK2_CHECK).subskill}`;
  assert.equal(scope(task1Scope)?.evidence.independentOccasions, 1, 'the Task 1 objective got its own evidence');
  assert.equal(scope(task2Scope)?.evidence.independentOccasions, 1, 'the Task 2 objective got its own evidence');
  for (const estimate of policy.estimates) {
    if (!estimate.scopeKey.startsWith('subskill:writing:')) continue;
    if (estimate.scopeKey === task1Scope || estimate.scopeKey === task2Scope) continue;
    assert.equal(estimate.evidence.independentOccasions, 0, `${estimate.scopeKey} borrowed evidence it never earned`);
  }

  /* And neither short sample became a band for a whole task, in either
     scope. Two paragraphs are not a Task 1 report and not a Task 2 essay,
     whatever they are scoped as. */
  for (const key of ['writing-task:task1', 'writing-task:task2']) {
    const estimate = scope(key);
    assert.ok(!estimate || estimate.band === null, `${key} claimed a band from one short objective sample`);
  }
});

test('every registered written task carries the task its own prompt really is', () => {
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    const prompt = WRITING_PROMPTS.find((candidate) => candidate.id === entry.source.promptId);
    assert.ok(prompt, `${entry.id} names a prompt that does not exist`);
    assert.equal(prompt!.task, entry.source.task, `${entry.id} disagrees with its own prompt about the task`);
    const view = viewFor(entry.id);
    const draft = writtenEvidenceDraft({
      view,
      text: 'SYNTHETIC paragraph for a scope check.',
      help: NO_WRITTEN_HELP,
      evaluation: JUDGED_MET,
      at: NOW,
    });
    assert.deepEqual(
      draft.taskScope,
      { kind: 'writing-task', task: entry.source.task },
      `${entry.id} would be filed under the wrong task`,
    );
  }
});

/* ------------------------------------------------------------------ */
/* 4. Calling the piece of writing what it is                          */
/* ------------------------------------------------------------------ */

const PIECE_NOUN: Readonly<Record<WrittenPiece, string>> = {
  overview: 'overview',
  paragraph: 'paragraph',
  introduction: 'introduction',
  conclusion: 'conclusion',
  sentence: 'sentence',
  answer: 'answer',
};

test('the wording names what each registered task actually asks for, and never another task noun', () => {
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    const wording = writtenPieceWording(entry.piece);
    const noun = PIECE_NOUN[entry.piece];
    for (const key of [wording.checkKey, wording.checkingKey, wording.yourWorkKey, wording.metKey, wording.partlyKey, wording.notYetKey]) {
      assert.ok(key.includes(noun), `${entry.id}: "${key}" does not name a ${noun}`);
      if (entry.piece !== 'overview') {
        assert.ok(!/overview/i.test(key), `${entry.id}: "${key}" still says overview`);
      }
    }
    const label = writtenTaskLabel(entry.source.task);
    assert.equal(label, entry.source.task === 'task2' ? 'Writing Task 2' : 'Writing Task 1', `${entry.id}: ${label}`);

    /* And the closing panel, which is where "one overview is never mastery"
       used to be said to a student who had written a conclusion. */
    const panel = writtenFeedbackFor({
      role: entry.role,
      evaluation: JUDGED_MET,
      assisted: false,
      piece: entry.piece,
      task: entry.source.task,
    });
    for (const text of [panel.demonstratedKey, panel.certaintyKey, panel.uncertainKey]) {
      if (entry.piece !== 'overview') assert.ok(!/overview/i.test(text), `${entry.id}: "${text}" still says overview`);
      if (entry.source.task === 'task2') {
        assert.ok(!/\bchart\b|\bvisual\b|Task 1/i.test(text), `${entry.id}: "${text}" promises Task 1 material`);
      }
    }
  }
});

test('every sentence the wording can put on the screen has Russian', () => {
  const missing: string[] = [];
  const need = (key: string) => {
    if (!RU[key]) missing.push(key);
  };
  for (const piece of Object.keys(PIECE_NOUN) as WrittenPiece[]) {
    const wording = writtenPieceWording(piece);
    for (const key of Object.values(wording)) need(key);
    for (const task of ['task1', 'task2'] as const) {
      need(writtenTaskLabel(task));
      for (const role of ['guided-practice', 'independent-check'] as const) {
        for (const assisted of [true, false]) {
          for (const evaluation of [JUDGED_MET, { ...JUDGED_MET, judged: false }]) {
            const panel = writtenFeedbackFor({ role, evaluation, assisted, piece, task });
            need(panel.demonstratedKey);
            need(panel.certaintyKey);
            need(panel.uncertainKey);
          }
        }
      }
    }
  }
  assert.deepEqual(missing, [], `No Russian for:\n  ${missing.join('\n  ')}`);
});

/* ------------------------------------------------------------------ */
/* 5. The order itself, read out of the component                      */
/* ------------------------------------------------------------------ */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COMPONENT = fs.readFileSync(path.join(HERE, '..', 'src', 'components', 'learning', 'WritingFocusedTask.tsx'), 'utf8');

test('the component still records the help from BEFORE the submission, and takes it before the evaluation', () => {
  assert.ok(
    COMPONENT.includes('const helpBeforeSubmission = helpNow.current;'),
    'the help state has to be snapshotted, not read again afterwards',
  );
  assert.ok(COMPONENT.includes('helpToRecord(helpBeforeSubmission)'), 'the recorded level comes from the snapshot');
  assert.ok(
    COMPONENT.includes('helpAfterEvaluation(helpBeforeSubmission, result)'),
    'and the evaluation only raises what comes next',
  );
  assert.ok(
    COMPONENT.indexOf('const helpBeforeSubmission') < COMPONENT.indexOf('await askPracticeEvaluation'),
    'the snapshot is taken before the evaluation is asked for',
  );
  /* The exact line the review found, in its exact shape. */
  assert.ok(
    !/withWrittenHelp\(\s*help\s*,\s*result\.judged/.test(COMPONENT),
    'the evaluation must not raise the level the submitted answer is recorded with',
  );
});

test('the component never names the task itself', () => {
  assert.ok(!/task:\s*'task[12]'/.test(COMPONENT), 'the task scope comes from the view, which comes from the registry');
  assert.ok(COMPONENT.includes('writtenTaskLabel(view.task)'), 'even the label above the prompt is the real task');
});
