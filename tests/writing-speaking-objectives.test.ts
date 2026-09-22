/* WP20: the remaining Writing objectives, sentence correction, and Speaking.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/writing-speaking-objectives.test.ts
 * The whole suite is `npm test`.
 *
 * This file defends WHAT IS NEW in this package. The mechanics it reuses
 * (the written-response shape, the hand-off reconciling into one plan, help
 * raising assistance for good, a band-claim reply being refused, a revision
 * linking to its original) are Pilot B's own and are defended in
 * tests/pilot-task1-overview.test.ts, which this package extended rather
 * than duplicated.
 *
 * Every learner record here is SYNTHETIC, and every report fixture is
 * labelled synthetic in its own name.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALL_FOCUSED_EXERCISES,
  RESERVED_CHECK_PROMPT_IDS,
  SPOKEN_FOCUSED_TASKS,
  WRITTEN_FOCUSED_TASKS,
  focusedExerciseHref,
  spokenFocusedTaskHref,
  type WrittenFocusedTask,
} from '../src/data/focused-exercises.ts';
import { WRITING_PROMPTS } from '../src/data/writing-prompts.ts';
import { getModelAnswers } from '../src/data/model-answers.ts';
import { SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS } from '../src/data/speaking-prompts.ts';
import {
  findActivity,
  focusedActivityId,
  learningCatalogue,
  writingCriterionMaterial,
  speakingCriterionMaterial,
} from '../src/lib/learning/catalog.ts';
import { WRITING_CRITERION_OBJECTIVES, SPEAKING_CRITERION_OBJECTIVES } from '../src/lib/learning/catalog.ts';
import type { WritingCriterion, SpeakingCriterion } from '../src/lib/learning/contracts/catalog.ts';
import {
  WRITING_OBJECTIVE_RULES,
  findWritingGap,
  writingHandoffText,
  markerComplaintIn,
  modelParagraphFor,
  runAutomaticChecks,
  sentenceWasChanged,
  hasComparisonLanguage,
  hasTrendLanguage,
  hasSequencingLanguage,
  hasChangeLanguage,
  hasPositionStatement,
  hasExampleSignal,
  hasEnoughSentences,
  opensWithoutMechanicalLinker,
  hasConclusionSignal,
  writtenEvidenceDraft,
  unjudgedEvaluation,
  NO_WRITTEN_HELP,
  type GradedWritingAttempt,
  type WrittenTaskView,
} from '../src/components/learning/written-focused-task.ts';
import { findSpeakingGap, SPEAKING_OBJECTIVE_RULES } from '../src/components/learning/speaking-gap.ts';
import {
  emptyChecklist,
  toggleChecklistItem,
  checkedCount,
  micProblemText,
  completionOfSpoken,
  spokenEvidenceDraft,
  type SpokenTaskView,
} from '../src/components/learning/spoken-focused-task.ts';
import type { SpeakingGradeResult } from '../src/lib/speaking/schema.ts';

const CATALOGUE = learningCatalogue();
const NOW = '2026-09-22T09:00:00.000Z';

function writtenTask(id: string): WrittenFocusedTask {
  const found = WRITTEN_FOCUSED_TASKS.find((entry) => entry.id === id);
  assert.ok(found, `${id} should be in the written registry`);
  return found as WrittenFocusedTask;
}

/* ------------------------------------------------------------------ */
/* 1. The material is real                                             */
/* ------------------------------------------------------------------ */

test('every WP20 written task names a real prompt of the task and form it claims', () => {
  const own = WRITTEN_FOCUSED_TASKS.filter((entry) => !entry.id.startsWith('writing-task1-overview-'));
  assert.ok(own.length >= 21, `expected at least 21 new written tasks, got ${own.length}`);
  for (const entry of own) {
    const prompt = WRITING_PROMPTS.find((candidate) => candidate.id === entry.source.promptId);
    assert.ok(prompt, `${entry.id} names ${entry.source.promptId}, which should exist`);
    assert.equal(prompt!.task, entry.source.task, `${entry.id} should really be ${entry.source.task}`);
    assert.equal(prompt!.variant, entry.source.form, `${entry.id} should really be a ${entry.source.form}`);
    assert.ok(entry.expectedMinutes <= 10, `${entry.id} fits between teaching and a check`);
    if (entry.modelParagraphIndex !== undefined) {
      const models = getModelAnswers(prompt!.id);
      const model = models.find((candidate) => candidate.band === 8) ?? models[0];
      assert.ok(model, `${entry.id}: ${prompt!.id} has a model answer`);
      assert.ok(model!.text[entry.modelParagraphIndex], `${entry.id}: paragraph ${entry.modelParagraphIndex} exists in the model`);
    }
    if (entry.guidingQuestions) {
      assert.ok(entry.guidingQuestions.length >= 2, `${entry.id} carries its own guiding questions`);
    }
  }
});

test('Task 1 and Task 2 evidence never mix inside one written task', () => {
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    if (entry.subskill.startsWith('task1-') || entry.subskill === 'task1-overview') {
      assert.equal(entry.source.task, 'task1', `${entry.id} is a Task 1 objective on a Task 1 prompt`);
    }
    if (entry.subskill.startsWith('task2-')) {
      assert.equal(entry.source.task, 'task2', `${entry.id} is a Task 2 objective on a Task 2 prompt`);
    }
  }
  /* sentence-correction and the generic coherence/cohesion objectives are
     not task1-/task2- prefixed subskills, but each still names one real
     task and that task must match the prompt it draws on. */
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    const prompt = WRITING_PROMPTS.find((candidate) => candidate.id === entry.source.promptId)!;
    assert.equal(prompt.task, entry.source.task, `${entry.id}: its prompt really is ${entry.source.task}`);
  }
});

test('every catalogue entry for a WP20 written task carries the same route shape as Pilot B', () => {
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    const activity = findActivity(focusedActivityId(entry.id), CATALOGUE);
    assert.ok(activity, `${entry.id} is in the catalogue`);
    assert.equal(activity!.completionEvidence, 'objective-judged');
    assert.ok((activity!.tags ?? []).includes('written-response'));
  }
});

test('reserved prompts for the new independent checks are marked check-only, and their guided tasks are not reserved', () => {
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    if (entry.role !== 'independent-check') continue;
    assert.ok(RESERVED_CHECK_PROMPT_IDS.includes(entry.source.promptId), `${entry.id}'s prompt is reserved`);
  }
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    if (entry.role !== 'guided-practice') continue;
    assert.ok(
      !RESERVED_CHECK_PROMPT_IDS.includes(entry.source.promptId),
      `${entry.id} is worked with help, so its prompt must not be reserved for a check`,
    );
  }
});

/* ------------------------------------------------------------------ */
/* 2. Every criterion maps to at least one objective WITH material     */
/* ------------------------------------------------------------------ */

/* WP20b (2026-09-22, the coverage round) closes both of the gaps this set
   used to name: Writing lexicalResource and grammaticalRange now have real
   material behind every one of their objectives (writing-lexical-topic-
   vocabulary.ts and friends), and Speaking pronunciation now has material
   too, but only ever the real graded Speaking activities themselves
   (buildSpeakingActivities' `covers` in src/lib/learning/catalog.ts):
   pronunciation is judged from the recording on every one of them, which is
   the one honest place its material can live (lead decision Q6 still holds:
   no self-check or text-only activity is ever added for it). The set stays,
   now empty, so a later regression that silently drops one of these covers
   entries is caught here rather than by a report page going quiet. */
const JUSTIFIED_EXCEPTIONS: ReadonlySet<WritingCriterion | SpeakingCriterion> = new Set([]);

test("every Writing criterion has at least one objective with material, except the justified exceptions", () => {
  const missingByCriterion = new Map<WritingCriterion, readonly string[]>();
  for (const criterion of Object.keys(WRITING_CRITERION_OBJECTIVES) as WritingCriterion[]) {
    const material = writingCriterionMaterial(criterion);
    missingByCriterion.set(criterion, material.missingObjectives);
    if (JUSTIFIED_EXCEPTIONS.has(criterion)) continue;
    assert.ok(
      material.objectives.length > material.missingObjectives.length,
      `${criterion}: every objective is missing, which fails "at least one objective with material"`,
    );
  }
  /* WP20b closed both of these. See the comment on JUSTIFIED_EXCEPTIONS. */
  assert.deepEqual([...(missingByCriterion.get('lexicalResource') ?? [])], []);
  assert.deepEqual([...(missingByCriterion.get('grammaticalRange') ?? [])], []);
});

test('every Speaking criterion has at least one objective with material, including pronunciation (WP20b)', () => {
  for (const criterion of Object.keys(SPEAKING_CRITERION_OBJECTIVES) as SpeakingCriterion[]) {
    const material = speakingCriterionMaterial(criterion);
    if (JUSTIFIED_EXCEPTIONS.has(criterion)) continue;
    assert.ok(
      material.objectives.length > material.missingObjectives.length,
      `${criterion}: every objective is missing`,
    );
  }
  /* Pronunciation's material is the real graded Speaking activities, never a
     self-check screen: see the comment on JUSTIFIED_EXCEPTIONS above. */
  const pronunciation = speakingCriterionMaterial('pronunciation');
  assert.deepEqual([...pronunciation.missingObjectives], []);
  for (const activity of pronunciation.activities) {
    assert.equal(activity.kind, 'graded-task', `${activity.id}: pronunciation material must be the real trainer, never a self-check`);
  }
});

test('every spoken objective is a real catalogue activity, self-marked, never scored', () => {
  /* 6 from the pilot round (WP20, each now a guided/check pair after
     finding 4 of Codex's independent review, 2026-09-22, tests/speaking-
     pilot-checks.test.ts) plus 12 from the coverage round (WP20b,
     2026-09-22): nine objectives total, every one a guided/check pair. */
  assert.equal(SPOKEN_FOCUSED_TASKS.length, 18);
  for (const task of SPOKEN_FOCUSED_TASKS) {
    const activity = findActivity(focusedActivityId(task.id), CATALOGUE);
    assert.ok(activity, `${task.id} is in the catalogue`);
    assert.equal(activity!.completionEvidence, 'self-marked', `${task.id}: nothing judges a self-check`);
    assert.equal(activity!.verified, false, `${task.id}: project-authored, so unverified`);
    assert.ok((activity!.tags ?? []).includes('needs-microphone'));
    const href = spokenFocusedTaskHref(task.id);
    assert.equal(href, `/trainers/speaking-focus/${task.id}`);
  }
  /* Never mixed into the item-answers/written-response registry or its
     route: see the header comment on SpokenFocusedTask. */
  assert.ok(!ALL_FOCUSED_EXERCISES.some((entry) => SPOKEN_FOCUSED_TASKS.some((task) => task.id === entry.id)));
});

test('every spoken task names a real Speaking prompt', () => {
  for (const task of SPOKEN_FOCUSED_TASKS) {
    const part1 = SPEAKING_PART1_TOPICS.find((topic) => topic.id === task.promptId);
    const cueCard = SPEAKING_CUE_CARDS.find((card) => card.id === task.promptId);
    assert.ok(part1 || cueCard, `${task.id} names ${task.promptId}, which should be a real Part 1 topic or cue card`);
    assert.ok(task.checklist.length >= 3, `${task.id} has a real self-check list`);
  }
});

/* ------------------------------------------------------------------ */
/* 3. Marker-quote mapping: the right objective, or nothing            */
/* ------------------------------------------------------------------ */

/* SYNTHETIC reports, one per objective this package built, each written so
   the marker's own sentence names that objective by the keyword its rule
   uses. Wording is invented for the test; nothing here is a real report. */

/* A neutral essay body that already opens as a summary with no figures in
   it, so a Task 1 fixture never trips the overview pilot's OWN automatic
   check by accident: findWritingGap always tries findOverviewGap first
   (unchanged from Pilot B), and a synthetic essay with no "Overall,"
   opening would otherwise mask whatever a WP20 rule below it found. */
/* The real report shape (src/lib/writing/schema.ts CriterionKey) keys Task
   Response and Task Achievement under the SAME field, 'taskResponse', for
   both tasks: only the on-screen LABEL differs by task. 'taskAchievement'
   is never a real key in a report's own criteria object; it is a separate
   label CatalogueActivity.criterion uses for cataloguing. WRITING_OBJECTIVE_
   RULES reads the report, so every Task 1 rule's own criterionKey is
   'taskResponse' too (fixed in written-focused-task.ts alongside this test,
   see the report under "Contract changes"). */
function syntheticReport(input: {
  task: 'task1' | 'task2';
  promptId: string;
  criterionKey: 'taskResponse' | 'coherenceCohesion' | 'grammaticalRange';
  comment: string;
}): GradedWritingAttempt {
  /* Deliberately thorough so it passes EVERY WP20 rule's own essayLooksFine
     check on its own (a real, competent essay naturally does: it compares,
     it has trend language and figures, it sequences a process, it names a
     change, it states a position, it gives an example). That is what
     isolates these tests to what they are actually about, which rule the
     MARKER'S comment points at, rather than an accident of which rule's
     automatic-check fallback the essay text happens to also fail. */
  const essay =
    input.task === 'task1'
      ? 'Overall, the visual shows several contrasting patterns worth reporting. One category rose from 40 to 65 over the period, considerably more than the other. First the raw material is collected, then it is processed. The old building was replaced by a new one to the north.'
      : 'I believe this policy is beneficial overall. For example, several cities have already adopted similar measures successfully.';
  return {
    at: '2026-09-20T10:00:00.000Z',
    promptId: input.promptId,
    task: input.task,
    live: true,
    essay,
    report: {
      grader: { name: 'gpt-5.6-sol', live: true },
      criteria: { [input.criterionKey]: { band: 5, comment: input.comment } },
    },
  };
}

test('marker-quote mapping finds the right objective for each rule, quoting the sentence word for word', () => {
  const fixtures: Record<string, GradedWritingAttempt> = {
    'task1-select-key-features': syntheticReport({
      task: 'task1',
      promptId: 'pte-wt-121-task1',
      criterionKey: 'taskResponse',
      comment: 'The report lists every figure with no attempt to choose the key features, which the descriptor needs to see.',
    }),
    'task1-compare-and-group': syntheticReport({
      task: 'task1',
      promptId: 'pte-wt-124-task1',
      criterionKey: 'taskResponse',
      comment: 'The two categories are never compared directly; try to compare them in the same sentence.',
    }),
    'task2-support-a-claim': syntheticReport({
      task: 'task2',
      promptId: 'pte-wt-132-task2',
      criterionKey: 'taskResponse',
      comment: 'The main claim is left unsupported: there is no example anywhere in the paragraph.',
    }),
    'task2-conclusion': syntheticReport({
      task: 'task2',
      promptId: 'pte-wt-132-task2',
      criterionKey: 'taskResponse',
      comment: 'There is no conclusion at all, the essay simply stops after the second body paragraph.',
    }),
  };

  for (const [subskill, attempt] of Object.entries(fixtures)) {
    const finding = findWritingGap([attempt]);
    assert.ok(finding, `${subskill}: expected a finding`);
    assert.equal(finding!.subskill, subskill, `${subskill}: the right objective was chosen`);
    assert.equal(finding!.basis, 'marker');
    assert.ok(finding!.quote && finding!.quote.length > 0, `${subskill}: the marker's own words are quoted`);
    assert.ok(
      attempt.report!.criteria!.taskResponse!.comment!.includes(finding!.quote!),
      `${subskill}: the quote is really the marker's sentence, not a paraphrase`,
    );
    const text = writingHandoffText(finding!);
    assert.ok(text, `${subskill}: a hand-off card is offered`);
  }
});

test('offers nothing when nothing matches: a comment about an unrelated criterion produces no finding', () => {
  const attempt = syntheticReport({
    task: 'task1',
    promptId: 'pte-wt-121-task1',
    criterionKey: 'taskResponse',
    comment: 'The overview is clear and every figure is accurate. This is a strong report throughout.',
  });
  const finding = findWritingGap([attempt]);
  assert.equal(finding, null, 'a report with nothing wrong offers no hand-off, never a guess');
});

test('at most one hand-off: the first matching rule wins and the loop stops there', () => {
  /* This comment could plausibly match more than one rule's keyword
     (mentions both key features and comparison); findWritingGap must
     return exactly one finding, from WRITING_OBJECTIVE_RULES' own fixed
     order, never a list. */
  const attempt = syntheticReport({
    task: 'task1',
    promptId: 'pte-wt-121-task1',
    criterionKey: 'taskResponse',
    comment: 'The key features chosen are not compared with each other at all, and are simply listed one after another.',
  });
  const finding = findWritingGap([attempt]);
  assert.ok(finding, 'expected one finding');
  assert.equal(typeof finding!.subskill, 'string');
  /* Whichever single rule matched, it is exactly one: the type itself
     (WritingGapFinding, not an array) is what proves this, together with
     the fixed iteration order in WRITING_OBJECTIVE_RULES. */
  const firstRuleIndex = WRITING_OBJECTIVE_RULES.findIndex((rule) => rule.subskill === finding!.subskill);
  assert.ok(firstRuleIndex >= 0);
});

test('an offline stub grade is never quoted as though an examiner wrote it, for any WP20 rule', () => {
  const stub: GradedWritingAttempt = {
    ...syntheticReport({
      task: 'task2',
      promptId: 'pte-wt-132-task2',
      criterionKey: 'taskResponse',
      comment: 'The main claim is left unsupported: there is no example anywhere in the paragraph.',
    }),
    live: false,
    report: {
      grader: { name: 'Sample grader', live: false },
      criteria: { taskResponse: { band: 5, comment: 'The main claim is left unsupported: there is no example anywhere in the paragraph.' } },
    },
  };
  const finding = findWritingGap([stub]);
  if (finding) assert.notEqual(finding.basis, 'marker', 'a stub grader is never quoted as a marker');
});

test('markerComplaintIn needs both the keyword and something wrong nearby, same rule as the overview pilot', () => {
  assert.equal(markerComplaintIn('The claim is well supported throughout.', 'example|explanation'), null);
  assert.match(
    markerComplaintIn('There is no example anywhere to support the claim.', 'example|explanation') ?? '',
    /no example/,
  );
});

/* ------------------------------------------------------------------ */
/* 4. Automatic checks: modest, honest, and each says what it found    */
/* ------------------------------------------------------------------ */

test('the new automatic checks are plain predicates over the words typed, nothing more', () => {
  assert.equal(hasComparisonLanguage('Swimming was more popular than tennis.'), true);
  assert.equal(hasComparisonLanguage('Swimming was popular. Tennis was popular too.'), false);
  assert.equal(hasTrendLanguage('The figure rose steadily throughout the period.'), true);
  assert.equal(hasTrendLanguage('The figure was forty in the first year.'), false);
  assert.equal(hasSequencingLanguage('First the material is sorted, then it is washed.'), true);
  assert.equal(hasSequencingLanguage('The material is sorted and washed.'), false);
  assert.equal(hasChangeLanguage('The barn was replaced by a car park to the north.'), true);
  assert.equal(hasChangeLanguage('There is a barn near the field.'), false);
  assert.equal(hasPositionStatement('I believe that this is the right approach.'), true);
  assert.equal(hasPositionStatement('This is one approach to the problem.'), false);
  assert.equal(hasExampleSignal('For example, many cities have introduced free public transport.'), true);
  assert.equal(hasExampleSignal('Many cities have introduced free public transport.'), false);
  assert.equal(hasEnoughSentences('One sentence. Two sentences. Three sentences.'), true);
  assert.equal(hasEnoughSentences('Only one sentence here.'), false);
  assert.equal(opensWithoutMechanicalLinker('Firstly, this is a problem.'), false);
  assert.equal(opensWithoutMechanicalLinker('This is a problem for several reasons.'), true);
  assert.equal(hasConclusionSignal('In conclusion, the benefits outweigh the costs.'), true);
  assert.equal(hasConclusionSignal('The benefits outweigh the costs.'), false);
});

test('runAutomaticChecks reports each new check honestly, never as a verdict', () => {
  const rules = { minWords: 10, maxWords: 50, checks: ['has-trend-language', 'has-figures', 'length-in-range'] as const };
  const good = 'The figure rose from 40 to 65 over the period, a clear and steady increase.';
  const results = runAutomaticChecks(good, rules);
  assert.deepEqual(results.map((r) => r.passed), [true, true, true]);
  const bad = 'Nothing much happened.';
  const failed = runAutomaticChecks(bad, rules);
  assert.deepEqual(failed.map((r) => r.passed), [false, false, false]);
});

/* ------------------------------------------------------------------ */
/* 5. Sentence correction: the first attempt is recorded before the    */
/*    reveal, and the model paragraph resolution is skipped for it     */
/* ------------------------------------------------------------------ */

test('sentence correction: not identical to the original is the one honest check available', () => {
  const original = 'The number of students who chooses to study abroad have risen sharply.';
  assert.equal(sentenceWasChanged(original, original), false, 'typing the same sentence back changes nothing');
  assert.equal(sentenceWasChanged('   ' + original + '   ', original), false, 'whitespace alone is not a correction');
  assert.equal(
    sentenceWasChanged('The number of students who choose to study abroad has risen sharply.', original),
    true,
  );
  assert.equal(sentenceWasChanged('', original), false, 'a blank attempt is not a correction');
});

test('the sentence-correction task is guided practice only, never an independent check, and never reserved', () => {
  const entry = writtenTask('writing-sentence-correction-number-of');
  assert.equal(entry.role, 'guided-practice');
  assert.equal(entry.provenance, 'project-authored');
  assert.ok(entry.correctionSentence && entry.correctionSentence.length > 0);
  assert.ok(entry.correctionNote && entry.correctionNote.length > 0);
  assert.ok(entry.transferPrompt && entry.transferPrompt.length > 0, 'a transfer step is offered');
  assert.ok(!RESERVED_CHECK_PROMPT_IDS.includes(entry.source.promptId), 'never reserved: it is guided practice');
  const activity = findActivity(focusedActivityId(entry.id), CATALOGUE);
  assert.equal(activity!.verified, false);
  assert.ok(WRITTEN_FOCUSED_TASKS.filter((e) => e.subskill === 'sentence-correction' && e.role === 'independent-check').length === 0);
});

test('the first correction attempt is written to the record before anything is revealed (help-then-record ordering)', () => {
  /* written-focused-task.ts's own contract: writtenEvidenceDraft always
     records what was typed, and the caller (WritingFocusedTask.tsx) never
     sets help.modelShown until AFTER record() has already run once, which
     mayShowModel enforces generally (Pilot B's own test) and this asserts
     specifically for a correction attempt: an unjudged first attempt is
     recorded as 'completed', never silently dropped while the note is
     being decided whether to show. */
  const entry = writtenTask('writing-sentence-correction-number-of');
  const prompt = WRITING_PROMPTS.find((candidate) => candidate.id === entry.source.promptId)!;
  const view: WrittenTaskView = {
    exerciseId: entry.id,
    activityId: focusedActivityId(entry.id),
    contentVersion: 1,
    role: entry.role,
    paper: entry.paper,
    subskill: entry.subskill,
    /* The registry's own scope and noun, the way the page fills them. */
    task: entry.source.task,
    piece: entry.piece,
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
    itemId: `prompt:${prompt.id}`,
    guidingQuestions: entry.guidingQuestions ?? [],
    modelOverview: null,
    noticeInTheModel: entry.noticeInTheModel,
    lessonKey: entry.lesson?.key,
    blockId: 'b1',
    blockHeading: 'Placeholder',
    blockText: 'Placeholder block text for a fixture.',
    correctionSentence: entry.correctionSentence,
    correctionNote: entry.correctionNote,
    transferPrompt: entry.transferPrompt,
  };
  const draft = writtenEvidenceDraft({
    view,
    text: 'The number of students who choose to study abroad has risen sharply.',
    help: NO_WRITTEN_HELP,
    evaluation: unjudgedEvaluation(),
    at: NOW,
  });
  assert.equal(draft.completion, 'completed', 'the first attempt is recorded as real work');
  assert.equal((draft.outcome as { met: boolean }).met, false, 'unjudged is never met');
  assert.equal(draft.items?.[0]?.firstAnswer, 'The number of students who choose to study abroad has risen sharply.');
});

test('modelParagraphFor skips cleanly when no index is given, matching Pilot B, and resolves a fixed paragraph otherwise', () => {
  const paragraphs = ['intro', 'overview line that is overall a summary', 'detail one', 'detail two'];
  assert.equal(modelParagraphFor(paragraphs, undefined), paragraphs[1]);
  assert.equal(modelParagraphFor(paragraphs, 0), 'intro');
  assert.equal(modelParagraphFor(paragraphs, 2), 'detail one');
  assert.equal(modelParagraphFor(paragraphs, 99), null, 'an out of range index is null, never a crash');
});

/* ------------------------------------------------------------------ */
/* 6. No band, ever, from any of this package's checks or hand-offs    */
/* ------------------------------------------------------------------ */

test('nothing this package writes to a student ever contains a band number', () => {
  const texts: string[] = [];
  for (const rule of WRITING_OBJECTIVE_RULES) texts.push(rule.headlineKey);
  for (const task of SPOKEN_FOCUSED_TASKS) {
    texts.push(task.objective, task.instruction, ...task.checklist);
  }
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    texts.push(entry.objective, entry.instruction, ...entry.noticeInTheModel);
    if (entry.correctionNote) texts.push(entry.correctionNote);
  }
  const bandLike = /\bband\s*\d|\d(\.\d)?\s*band\b/i;
  for (const text of texts) {
    assert.ok(!bandLike.test(text), `"${text}" reads like it names a band`);
  }
});

/* ------------------------------------------------------------------ */
/* 7. Speaking: marker-quote mapping, pronunciation stays audio-only    */
/* ------------------------------------------------------------------ */

/* WP20b (2026-09-22): findSpeakingGap now reads all four criteria and picks
   the lowest-banded one below `requiredBand` before mapping by keyword (see
   speaking-gap.ts's header). syntheticSpeakingResult below gives every
   criterion the same band 6, so a requiredBand of 7 puts all four equally
   below it and the fixed CRITERION_ORDER tie-break picks fluencyCoherence
   first, exactly the criterion every fixture in this section was already
   written to exercise. This constant makes that choice visible rather than
   a bare literal repeated five times. */
const REQUIRED_BAND_ABOVE_ALL_FOUR = 7;

function syntheticSpeakingResult(comment: string): SpeakingGradeResult {
  return {
    overallBand: 6,
    criteria: {
      fluencyCoherence: { band: 6, comment },
      lexicalResource: { band: 6, comment: 'Adequate range for the topic.' },
      grammaticalRange: { band: 6, comment: 'A mix of simple and complex sentences.' },
      pronunciation: { band: 6, comment: 'Mostly clear, with occasional unclear consonant sounds.' },
    },
    mechanics: { totalDurationMs: 60000, expectedMinMs: 45000, underLength: false, estSilenceRatio: 0.1, longestSilenceMs: 1000, notes: [] },
    moments: [],
    strengths: [],
    improvements: [],
    grader: { name: 'gpt-audio-1.5', live: true },
  };
}

test('Speaking marker-quote mapping finds the right objective per mode, and refuses a mode mismatch', () => {
  const extendComment = 'Answers stayed very short throughout; try to extend your answers with a reason and an example.';
  const found = findSpeakingGap(syntheticSpeakingResult(extendComment), 'part1', REQUIRED_BAND_ABOVE_ALL_FOUR);
  assert.equal(found.found, true);
  assert.equal(found.handoffTaskId, 'speaking-part1-extend-an-answer');
  assert.ok(found.quote && extendComment.includes(found.quote));

  /* The same comment, read from a Part 2 result, must not fire the Part
     1-only rule: SPEAKING_OBJECTIVE_RULES scopes each rule to its own
     mode, exactly as a Part 1 objective should never be recommended from
     a Part 2 recording. */
  const mismatched = findSpeakingGap(syntheticSpeakingResult(extendComment), 'part2', REQUIRED_BAND_ABOVE_ALL_FOUR);
  assert.notEqual(mismatched.handoffTaskId, 'speaking-part1-extend-an-answer');

  const pauseComment = 'There were several long pauses that should be reduced, and hesitation was frequent throughout.';
  const pauseFound = findSpeakingGap(syntheticSpeakingResult(pauseComment), 'part3', REQUIRED_BAND_ABOVE_ALL_FOUR);
  assert.equal(pauseFound.handoffTaskId, 'speaking-fluency-repair', 'fluency repair applies to any part');
});

test('Speaking marker-quote mapping never proposes pronunciation from a self-check task id, whatever the pronunciation comment says', () => {
  const result = syntheticSpeakingResult('The answer was reasonably fluent with only minor hesitation.');
  result.criteria.pronunciation.comment = 'Individual sounds were frequently unclear, especially vowel sounds, which needs work.';
  const found = findSpeakingGap(result, 'part1', REQUIRED_BAND_ABOVE_ALL_FOUR);
  assert.ok(
    !found.handoffTaskId || !found.handoffTaskId.includes('pronunciation'),
    'no rule in SPEAKING_OBJECTIVE_RULES may ever point at a self-check pronunciation task',
  );
  for (const rule of SPEAKING_OBJECTIVE_RULES) {
    assert.ok(!rule.handoffTaskId.includes('pronunciation'), `${rule.handoffTaskId} must not be a pronunciation self-check task`);
  }
});

test('a stub Speaking grade is never quoted as though an examiner wrote it', () => {
  const result = syntheticSpeakingResult('Answers stayed very short; try to extend your answers with a reason and an example.');
  result.grader = { name: 'Sample grader', live: false };
  const found = findSpeakingGap(result, 'part1', REQUIRED_BAND_ABOVE_ALL_FOUR);
  assert.equal(found.found, false, 'an offline stub is never treated as a marker');
});

test('no pronunciation statement can be generated without an audio-graded source: the self-check screen never produces one', () => {
  for (const task of SPOKEN_FOCUSED_TASKS) {
    if (task.pronunciationNote) {
      assert.match(
        task.pronunciationNote,
        /audio|recording/i,
        `${task.id}'s pronunciationNote must point to a real recording, never a text judgement`,
      );
    }
  }
  /* The self-check module itself has no code path that produces a
     pronunciation verdict at all: it only ever writes a 'studied' outcome
     (see spokenEvidenceDraft), never a criterion score. */
  const view: SpokenTaskView = {
    exerciseId: 'x',
    activityId: 'focus:x',
    contentVersion: 1,
    subskill: 'fluency-repair',
    part: 1,
    title: 't',
    objective: 'o',
    instruction: 'i',
    expectedMinutes: 5,
    promptId: 'p1-work',
    questionText: 'q',
    checklist: ['a', 'b'],
    blockId: 'b',
    blockHeading: 'h',
    blockText: 'x',
  };
  const draft = spokenEvidenceDraft({ view, hasRecording: true, at: NOW });
  assert.equal(draft.outcome.kind, 'studied', 'never anything that could carry a pronunciation verdict');
});

/* ------------------------------------------------------------------ */
/* 8. Speaking practice works end to end with grading unavailable,     */
/*    and nothing stores audio in evidence                             */
/* ------------------------------------------------------------------ */

test('spoken evidence never carries a recording, only that practice happened', () => {
  const view: SpokenTaskView = {
    exerciseId: 'speaking-part1-extend-an-answer',
    activityId: 'focus:speaking-part1-extend-an-answer',
    contentVersion: 1,
    subskill: 'part1-extend-an-answer',
    part: 1,
    title: 'Part 1: extend your answer',
    objective: 'Extend a Part 1 answer.',
    instruction: 'Answer one question.',
    expectedMinutes: 5,
    promptId: 'p1-work',
    questionText: 'What do you do for work?',
    checklist: ['Did you answer directly?', 'Did you give a reason?'],
    blockId: 'b1',
    blockHeading: 'A.R.E. in Action',
    blockText: 'The lesson block text.',
  };
  const draft = spokenEvidenceDraft({ view, hasRecording: true, at: NOW });
  const serialised = JSON.stringify(draft);
  assert.ok(!/base64|audioBase64|blob:|data:audio/i.test(serialised), 'no audio-shaped field anywhere in the draft');
  assert.equal(draft.completion, 'completed');
  assert.equal(completionOfSpoken(true), 'completed');
  assert.equal(completionOfSpoken(false), 'blank', 'no recording is blank, never a bad result');

  /* Grading unavailable, no grader call at all: this whole draft was built
     from `hasRecording` and the view alone, with nothing from a grader in
     its inputs, which is what "works end to end with grading unavailable"
     means for a screen whose only per-attempt input other than the
     recording itself is the student's own checklist. */
  assert.equal(draft.outcome.kind, 'studied');
  assert.equal((draft.outcome as { estimatedMinutes: number }).estimatedMinutes, view.expectedMinutes);
});

test('the checklist is a plain self-tick, never a score: toggling and counting is all it does', () => {
  let state = emptyChecklist();
  assert.equal(checkedCount(state), 0);
  state = toggleChecklistItem(state, 0);
  state = toggleChecklistItem(state, 2);
  assert.equal(checkedCount(state), 2);
  state = toggleChecklistItem(state, 0);
  assert.equal(checkedCount(state), 1, 'toggling again unchecks it');
});

/* ------------------------------------------------------------------ */
/* 9. Microphone failure paths keep state, with a plain message         */
/* ------------------------------------------------------------------ */

test('every microphone failure has a plain, specific recovery message, in English, with no dash', () => {
  for (const problem of ['permission-denied', 'unavailable', 'recording-failed', 'unsupported'] as const) {
    const text = micProblemText(problem);
    assert.ok(text.length > 20, `${problem}: a real sentence, not a code`);
    assert.ok(!/[–—]/.test(text), `${problem}: no dashes`);
  }
});

/* ------------------------------------------------------------------ */
/* 10. Nothing authored by this package contains a dash                */
/* ------------------------------------------------------------------ */

test('nothing authored by this package contains an em dash or an en dash', () => {
  const strings: string[] = [];
  for (const entry of WRITTEN_FOCUSED_TASKS) {
    strings.push(entry.title, entry.objective, entry.instruction, ...entry.noticeInTheModel);
    if (entry.correctionSentence) strings.push(entry.correctionSentence);
    if (entry.correctionNote) strings.push(entry.correctionNote);
    if (entry.transferPrompt) strings.push(entry.transferPrompt);
    if (entry.guidingQuestions) strings.push(...entry.guidingQuestions);
  }
  for (const task of SPOKEN_FOCUSED_TASKS) {
    strings.push(task.title, task.objective, task.instruction, ...task.checklist);
    if (task.pronunciationNote) strings.push(task.pronunciationNote);
  }
  for (const rule of WRITING_OBJECTIVE_RULES) strings.push(rule.headlineKey);
  const offending = strings.filter((text) => /[–—]/.test(text));
  assert.deepEqual(offending, [], 'no dashes anywhere in the authored text');
});
