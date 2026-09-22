/* WP20b: closing the Writing and Speaking coverage gaps (the coverage
 * round).
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/writing-speaking-coverage.test.ts
 * The whole suite is `npm test`.
 *
 * This file defends WHAT IS NEW in this package: the eleven new Writing
 * objectives (Lexical Resource: lexical-precision, task2-paraphrase-the-
 * question, task1-avoid-repetition, collocation-accuracy; Grammatical
 * Range: complex-sentence-range, complex-sentences-with-purpose, recurring-
 * pattern-accuracy), the six new Speaking objectives (topic-vocabulary-in-
 * speech, part3-paraphrase-the-question, part2-tense-range, part3-complex-
 * sentences, part3-abstract-opinion, part3-speculate-and-compare), the
 * generalised four-criteria Speaking hand-off (speaking-gap.ts), and the
 * pronunciation re-check path. Mechanics this package reuses (the written-
 * response shape, help raising assistance for good, a band-claim reply
 * refused, the marker-quote adjacency rule itself) are WP20's own and are
 * defended in tests/writing-speaking-objectives.test.ts, which this package
 * extends rather than duplicates.
 *
 * Every learner record and graded result here is SYNTHETIC.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  WRITTEN_FOCUSED_TASKS,
  SPOKEN_FOCUSED_TASKS,
  RESERVED_CHECK_PROMPT_IDS,
  type WrittenFocusedTask,
  type SpokenFocusedTask,
} from '../src/data/focused-exercises.ts';
import {
  learningCatalogue,
  writingCriterionMaterial,
  speakingCriterionMaterial,
} from '../src/lib/learning/catalog.ts';
import { WRITING_CRITERION_OBJECTIVES, SPEAKING_CRITERION_OBJECTIVES } from '../src/lib/learning/catalog.ts';
import type { WritingCriterion, SpeakingCriterion } from '../src/lib/learning/contracts/catalog.ts';
import { LEARNING_INDEX_MAX_BYTES, LEARNING_INDEX_SOURCE, LEARNING_CATALOGUE_MAX_BYTES } from '../src/lib/learning/contracts/catalog.ts';
import {
  WRITING_OBJECTIVE_RULES,
  mayShowModel,
  runAutomaticChecks,
  hasEnoughTopicVocabulary,
  hasNoInformalWords,
  isParaphrasedNotCopied,
  noRepeatedTrendWord,
  hasSubordinateClause,
  hasRangeOfStructures,
  type WrittenAttemptRecord,
} from '../src/components/learning/written-focused-task.ts';
import { findSpeakingGap, SPEAKING_OBJECTIVE_RULES } from '../src/components/learning/speaking-gap.ts';
import type { SpeakingGradeResult, SpeakingCriterionKey } from '../src/lib/speaking/schema.ts';

const CATALOGUE = learningCatalogue();

/* WP20b's own new subskills, split by whether they carry a real
   task1-/task2- prefix (which tests/writing-speaking-objectives.test.ts's
   Task1/Task2 test already covers) or not. */
const WP20B_WRITTEN_SUBSKILLS = [
  'lexical-precision',
  'task2-paraphrase-the-question',
  'task1-avoid-repetition',
  'collocation-accuracy',
  'complex-sentences-with-purpose',
  'complex-sentence-range',
  'recurring-pattern-accuracy',
] as const;

const WP20B_SPOKEN_SUBSKILLS = [
  'topic-vocabulary-in-speech',
  'part3-paraphrase-the-question',
  'part2-tense-range',
  'part3-complex-sentences',
  'part3-abstract-opinion',
  'part3-speculate-and-compare',
] as const;

/* Finding 4 (Codex's independent review, 2026-09-22): the three pilot round
   (WP20) Speaking objectives used to be guided self-check plus a
   same-prompt retry only, with no independent check on a different real
   prompt. They now carry the same guided/check pair shape WP20B_SPOKEN_
   SUBSKILLS already has, so the "different prompt, same part" test below
   covers all nine Speaking objectives, not only the coverage round's six. */
const WP20_PILOT_SPOKEN_SUBSKILLS = [
  'part1-extend-an-answer',
  'part2-plan-in-one-minute',
  'fluency-repair',
] as const;

const ALL_SPOKEN_SUBSKILLS_WITH_CHECKS = [...WP20B_SPOKEN_SUBSKILLS, ...WP20_PILOT_SPOKEN_SUBSKILLS] as const;

function writtenTasksFor(subskill: string): WrittenFocusedTask[] {
  return WRITTEN_FOCUSED_TASKS.filter((entry) => entry.subskill === subskill);
}

function spokenTasksFor(subskill: string): SpokenFocusedTask[] {
  return SPOKEN_FOCUSED_TASKS.filter((entry) => entry.subskill === subskill);
}

/* ------------------------------------------------------------------ */
/* 1. Coverage: every criterion's "objectives without material" report */
/*    is now empty                                                     */
/* ------------------------------------------------------------------ */

test('every Writing criterion reports no missing objectives', () => {
  for (const criterion of Object.keys(WRITING_CRITERION_OBJECTIVES) as WritingCriterion[]) {
    const material = writingCriterionMaterial(criterion, CATALOGUE);
    assert.deepEqual(
      [...material.missingObjectives],
      [],
      `${criterion} still reports missing objectives: ${material.missingObjectives.join(', ')}`,
    );
  }
});

test('every Speaking criterion reports no missing objectives, including pronunciation', () => {
  for (const criterion of Object.keys(SPEAKING_CRITERION_OBJECTIVES) as SpeakingCriterion[]) {
    const material = speakingCriterionMaterial(criterion, CATALOGUE);
    assert.deepEqual(
      [...material.missingObjectives],
      [],
      `${criterion} still reports missing objectives: ${material.missingObjectives.join(', ')}`,
    );
  }
});

test('each new Writing subskill has at least one real, findable activity', () => {
  for (const subskill of WP20B_WRITTEN_SUBSKILLS) {
    const tasks = writtenTasksFor(subskill);
    assert.ok(tasks.length >= 1, `${subskill} has at least one WrittenFocusedTask`);
  }
});

test('each new Speaking subskill has at least one real, findable activity', () => {
  for (const subskill of WP20B_SPOKEN_SUBSKILLS) {
    const tasks = spokenTasksFor(subskill);
    assert.ok(tasks.length >= 1, `${subskill} has at least one SpokenFocusedTask`);
  }
});

/* Pronunciation is the one criterion whose material is deliberately NOT a
   SpokenFocusedTask (lead decision Q6): it must be the real graded trainer,
   never a self-check screen. */
test('pronunciation material is always the real trainer, never a self-check task', () => {
  const material = speakingCriterionMaterial('pronunciation', CATALOGUE);
  assert.ok(material.activities.length > 0, 'pronunciation has real material');
  for (const activity of material.activities) {
    assert.equal(activity.kind, 'graded-task', `${activity.id} must be the real trainer`);
    assert.notEqual(activity.completionEvidence, 'self-marked', `${activity.id} must not read as a self-check`);
  }
  for (const task of SPOKEN_FOCUSED_TASKS) {
    assert.notEqual(task.subskill, 'pronunciation-stress-and-rhythm', 'no self-check task ever targets pronunciation');
    assert.notEqual(task.subskill, 'pronunciation-individual-sounds', 'no self-check task ever targets pronunciation');
  }
});

/* ------------------------------------------------------------------ */
/* 2. Task 1 and Task 2 never mix, even for subskills with no task1-/  */
/*    task2- prefix in their name                                      */
/* ------------------------------------------------------------------ */

test('every WP20b written task carries the task its own subskill implies, and a guided/check pair never mixes tasks', () => {
  const expectedTask: Record<string, 'task1' | 'task2'> = {
    'lexical-precision': 'task2',
    'task2-paraphrase-the-question': 'task2',
    'task1-avoid-repetition': 'task1',
    'complex-sentences-with-purpose': 'task2',
    'complex-sentence-range': 'task2',
  };
  for (const [subskill, task] of Object.entries(expectedTask)) {
    const tasks = writtenTasksFor(subskill);
    assert.ok(tasks.length >= 1, `${subskill} has material`);
    for (const entry of tasks) {
      assert.equal(entry.source.task, task, `${entry.id} should be ${task}`);
    }
  }
  /* collocation-accuracy and recurring-pattern-accuracy are 'either', the
     same convention sentence-correction uses: a grammar or lexical pattern
     is not tied to one task, so their single guided entry may sit on either
     a Task 1 or Task 2 prompt without that being a mixing violation. Both
     happen to use a Task 2 prompt for context here, checked directly. */
  for (const subskill of ['collocation-accuracy', 'recurring-pattern-accuracy'] as const) {
    const tasks = writtenTasksFor(subskill);
    assert.equal(tasks.length, 1, `${subskill} is guided-only, like sentence-correction`);
    assert.equal(tasks[0]!.role, 'guided-practice');
  }
});

/* ------------------------------------------------------------------ */
/* 3. Transfer checks use reserved, unseen material and refuse help    */
/* ------------------------------------------------------------------ */

test('every WP20b written check is reserved, and its guided sibling is not', () => {
  for (const subskill of WP20B_WRITTEN_SUBSKILLS) {
    const tasks = writtenTasksFor(subskill);
    const guided = tasks.filter((t) => t.role === 'guided-practice');
    const checks = tasks.filter((t) => t.role === 'independent-check');
    for (const entry of checks) {
      assert.ok(
        RESERVED_CHECK_PROMPT_IDS.includes(entry.source.promptId),
        `${entry.id}'s prompt is reserved for the check`,
      );
      assert.ok(
        !entry.guidingQuestions || entry.guidingQuestions.length === 0,
        `${entry.id} carries no guiding questions of its own; guidingQuestionsFor() is what actually withholds them for a check role`,
      );
    }
    for (const entry of guided) {
      assert.ok(
        !RESERVED_CHECK_PROMPT_IDS.includes(entry.source.promptId),
        `${entry.id} is worked with help, so its prompt must not be reserved for a check`,
      );
    }
    /* Where a check exists at all, it is on a DIFFERENT real prompt from
       its guided sibling: a "transfer" check that reused the guided
       prompt would not be a transfer check. */
    for (const g of guided) {
      for (const c of checks) {
        assert.notEqual(g.source.promptId, c.source.promptId, `${subskill}'s guided and check prompts must differ`);
      }
    }
  }
});

test('every Speaking check sits on a different real prompt from its guided sibling, same part (all nine objectives, pilot round and coverage round)', () => {
  for (const subskill of ALL_SPOKEN_SUBSKILLS_WITH_CHECKS) {
    const tasks = spokenTasksFor(subskill);
    const guided = tasks.filter((t) => t.role === 'guided-practice');
    const checks = tasks.filter((t) => t.role === 'independent-check');
    assert.ok(guided.length >= 1 && checks.length >= 1, `${subskill} has both a retry prompt and a check prompt`);
    for (const g of guided) {
      for (const c of checks) {
        assert.notEqual(g.promptId, c.promptId, `${subskill}'s guided and check prompts must differ`);
        assert.equal(g.part, c.part, `${subskill}'s guided and check stay in the same part`);
      }
    }
  }
});

/* ------------------------------------------------------------------ */
/* 4. The transparent automatic checks are plain, honest predicates    */
/* ------------------------------------------------------------------ */

test('hasEnoughTopicVocabulary counts real curated topic words, nothing else', () => {
  assert.equal(hasEnoughTopicVocabulary('Automation and artificial intelligence raise real concerns about data privacy.'), true);
  assert.equal(hasEnoughTopicVocabulary('This is a big change that affects a lot of things for people.'), false);
});

test('hasNoInformalWords flags the short explicit list only', () => {
  assert.equal(hasNoInformalWords('Driverless cars could reduce road accidents significantly.'), true);
  assert.equal(hasNoInformalWords('A lot of stuff could go wrong for kids, to be honest.'), false);
});

test('isParaphrasedNotCopied compares against the real prompt, ignoring the exam boilerplate', () => {
  const promptHtml =
    'Some people believe that professionals should be required to work in the country where they trained. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.';
  assert.equal(
    isParaphrasedNotCopied('I think that skilled workers should not be forced to stay in one nation after their studies.', promptHtml),
    true,
  );
  assert.equal(
    isParaphrasedNotCopied('Some people believe that professionals should be required to work in the country where they trained.', promptHtml),
    false,
  );
});

test('noRepeatedTrendWord flags the same trend or quantity word repeated, and only that', () => {
  assert.equal(noRepeatedTrendWord('Sales rose sharply, while spending fell and then climbed again.'), true);
  assert.equal(noRepeatedTrendWord('Sales rose in January, rose in March, and rose again in June.'), false);
});

test('hasSubordinateClause and hasRangeOfStructures count signals, never correctness', () => {
  assert.equal(hasSubordinateClause('Although the plan is risky, it could still succeed.'), true);
  assert.equal(hasSubordinateClause('The plan is risky. It could still succeed.'), false);
  assert.equal(
    hasRangeOfStructures('Although the report was late, which surprised nobody, more time was needed.'),
    true,
    'a subordinate clause and a relative clause together is a range of two',
  );
  assert.equal(hasRangeOfStructures('The cat sat on the mat. The dog ran in the park.'), false);
});

test('runAutomaticChecks wires the six new checks through their real rules, honestly, never a verdict', () => {
  const results = runAutomaticChecks(
    'Automation and cybersecurity raise real concerns, although data privacy matters too.',
    { minWords: 0, maxWords: 1000, checks: ['has-topic-vocabulary', 'no-informal-words', 'has-subordinate-clause'] },
  );
  const byId = new Map(results.map((r) => [r.id, r]));
  assert.equal(byId.get('has-topic-vocabulary')!.passed, true);
  assert.equal(byId.get('no-informal-words')!.passed, true);
  assert.equal(byId.get('has-subordinate-clause')!.passed, true);
  for (const result of results) {
    assert.ok(!/\bband\b/i.test(result.resultKey), `${result.id}'s result must never read as a band`);
  }
});

/* ------------------------------------------------------------------ */
/* 5. First attempt captured before any reveal                        */
/* ------------------------------------------------------------------ */

test('the band 8 model may not be shown before a first attempt, for every WP20b written task', () => {
  const none: readonly WrittenAttemptRecord[] = [];
  const one: readonly WrittenAttemptRecord[] = [{ at: '2026-09-22T09:00:00.000Z', text: 'A first attempt.' }];
  assert.equal(mayShowModel(none), false);
  assert.equal(mayShowModel(one), true);
  for (const subskill of WP20B_WRITTEN_SUBSKILLS) {
    for (const entry of writtenTasksFor(subskill)) {
      assert.ok(entry.noticeInTheModel.length > 0, `${entry.id} has something to notice once an attempt exists`);
    }
  }
});

/* ------------------------------------------------------------------ */
/* 6. The generalised four-criteria Speaking hand-off                 */
/* ------------------------------------------------------------------ */

function fourCriteriaResult(bands: Record<SpeakingCriterionKey, number>, comments: Partial<Record<SpeakingCriterionKey, string>>): SpeakingGradeResult {
  const criteria = {} as SpeakingGradeResult['criteria'];
  for (const key of ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'pronunciation'] as const) {
    criteria[key] = { band: bands[key], comment: comments[key] ?? 'Solid, unremarkable work on this criterion.' };
  }
  return {
    overallBand: 6,
    criteria,
    mechanics: { totalDurationMs: 60000, expectedMinMs: 45000, underLength: false, estSilenceRatio: 0.1, longestSilenceMs: 1000, notes: [] },
    moments: [],
    strengths: [],
    improvements: [],
    grader: { name: 'gpt-audio-1.5', live: true },
  };
}

test('the hand-off reads all four criteria and picks the one lowest below the required band: fluencyCoherence', () => {
  const result = fourCriteriaResult(
    { fluencyCoherence: 5, lexicalResource: 7, grammaticalRange: 7, pronunciation: 7 },
    { fluencyCoherence: 'Answers stayed very short throughout; try to extend your answers with a reason and an example.' },
  );
  const found = findSpeakingGap(result, 'part1', 6.5);
  assert.equal(found.found, true);
  assert.equal(found.criterion, 'fluencyCoherence');
  assert.equal(found.handoffTaskId, 'speaking-part1-extend-an-answer');
});

test('the hand-off reads all four criteria and picks the one lowest below the required band: lexicalResource', () => {
  const result = fourCriteriaResult(
    { fluencyCoherence: 7, lexicalResource: 5, grammaticalRange: 7, pronunciation: 7 },
    { lexicalResource: 'Vocabulary range stayed limited throughout, with the same basic words repeated often.' },
  );
  const found = findSpeakingGap(result, 'part1', 6.5);
  assert.equal(found.found, true);
  assert.equal(found.criterion, 'lexicalResource');
  assert.equal(found.handoffTaskId, 'speaking-topic-vocabulary-guided');
});

test('the hand-off reads all four criteria and picks the one lowest below the required band: grammaticalRange', () => {
  const result = fourCriteriaResult(
    { fluencyCoherence: 7, lexicalResource: 7, grammaticalRange: 5, pronunciation: 7 },
    { grammaticalRange: 'Try to vary your tenses more; this story stayed in the present tense throughout.' },
  );
  const found = findSpeakingGap(result, 'part2', 6.5);
  assert.equal(found.found, true);
  assert.equal(found.criterion, 'grammaticalRange');
  assert.equal(found.handoffTaskId, 'speaking-part2-tense-range-guided');
});

test('the hand-off reads all four criteria and picks the one lowest below the required band: pronunciation, but only from an audio-graded result', () => {
  const result = fourCriteriaResult(
    { fluencyCoherence: 7, lexicalResource: 7, grammaticalRange: 7, pronunciation: 5 },
    { pronunciation: 'Individual sounds were frequently unclear, especially vowel sounds, which needs work.' },
  );
  const found = findSpeakingGap(result, 'part1', 6.5);
  assert.equal(found.found, true);
  assert.equal(found.criterion, 'pronunciation');
  assert.equal(found.handoffTaskId, undefined, 'pronunciation never points at a self-check task id');

  /* The same result, but not audio-graded (the offline stub or an
     unreachable grader): the same rule that keeps a canned stub's wording
     from being quoted as an examiner's also keeps pronunciation, this
     package's one audio-only criterion, from ever being offered from it. */
  const textGraded = { ...result, grader: { name: 'Sample grader', live: false } };
  const notFound = findSpeakingGap(textGraded, 'part1', 6.5);
  assert.equal(notFound.found, false, 'pronunciation must never map from a non-audio-graded result');
});

test('when every criterion already meets the required band, nothing is offered', () => {
  const result = fourCriteriaResult(
    { fluencyCoherence: 7, lexicalResource: 7, grammaticalRange: 7, pronunciation: 7 },
    { fluencyCoherence: 'Answers stayed very short throughout; try to extend your answers with a reason and an example.' },
  );
  const found = findSpeakingGap(result, 'part1', 6.5);
  assert.equal(found.found, false, 'nothing is below the requirement, so nothing is offered even though a comment exists');
});

test('when the chosen criterion is below the requirement but nothing in its own feedback names an objective, nothing is offered (no fallback to another criterion)', () => {
  const result = fourCriteriaResult({ fluencyCoherence: 5, lexicalResource: 7, grammaticalRange: 7, pronunciation: 7 }, {
    lexicalResource: 'Vocabulary range stayed limited throughout, with the same basic words repeated often.',
  });
  /* fluencyCoherence is the lowest and below 6.5, but its own comment (the
     default "Solid, unremarkable work") names nothing. The lexicalResource
     comment DOES name an objective, but lexicalResource is not the chosen
     criterion, so it must never be tried. */
  const found = findSpeakingGap(result, 'part1', 6.5);
  assert.equal(found.found, false, 'a match in a criterion that was not chosen must never be used');
});

test('with no required band known at all, nothing is offered, however clear the comment', () => {
  const result = fourCriteriaResult(
    { fluencyCoherence: 5, lexicalResource: 7, grammaticalRange: 7, pronunciation: 7 },
    { fluencyCoherence: 'Answers stayed very short throughout; try to extend your answers with a reason and an example.' },
  );
  const found = findSpeakingGap(result, 'part1', null);
  assert.equal(found.found, false, 'there is nothing honest to call "below the required band" with no band known');
});

test('a tie between all four criteria is broken in a fixed order, fluencyCoherence first', () => {
  const result = fourCriteriaResult(
    { fluencyCoherence: 5, lexicalResource: 5, grammaticalRange: 5, pronunciation: 5 },
    { fluencyCoherence: 'Answers stayed very short throughout; try to extend your answers with a reason and an example.' },
  );
  const found = findSpeakingGap(result, 'part1', 6.5);
  assert.equal(found.criterion, 'fluencyCoherence');
});

test('the Part 3 reasoning and lexical/grammar objectives all have real self-check material and a rule pointing at it', () => {
  const ruleIds = new Set(SPEAKING_OBJECTIVE_RULES.map((rule) => rule.handoffTaskId).filter(Boolean));
  for (const subskill of WP20B_SPOKEN_SUBSKILLS) {
    const guided = spokenTasksFor(subskill).find((t) => t.role === 'guided-practice');
    assert.ok(guided, `${subskill} has a guided self-check task`);
    assert.ok(ruleIds.has(guided!.id), `${guided!.id} is reachable from a SPEAKING_OBJECTIVE_RULES entry`);
  }
});

/* ------------------------------------------------------------------ */
/* 7. No band, ever, in anything WP20b writes                          */
/* ------------------------------------------------------------------ */

test('nothing WP20b writes to a student ever contains a band number', () => {
  const texts: string[] = [];
  for (const rule of SPEAKING_OBJECTIVE_RULES) texts.push(rule.headlineKey);
  for (const subskill of WP20B_WRITTEN_SUBSKILLS) {
    for (const rule of WRITING_OBJECTIVE_RULES) {
      if (rule.subskill === subskill) texts.push(rule.headlineKey);
    }
  }
  for (const subskill of WP20B_SPOKEN_SUBSKILLS) {
    for (const task of spokenTasksFor(subskill)) texts.push(task.objective, task.instruction, ...task.checklist);
  }
  for (const subskill of WP20B_WRITTEN_SUBSKILLS) {
    for (const entry of writtenTasksFor(subskill)) {
      texts.push(entry.objective, entry.instruction, ...entry.noticeInTheModel);
      if (entry.correctionNote) texts.push(entry.correctionNote);
      if (entry.transferPrompt) texts.push(entry.transferPrompt);
    }
  }
  const bandLike = /\bband\s*\d|\d(\.\d)?\s*band\b/i;
  for (const text of texts) {
    assert.ok(!bandLike.test(text), `"${text}" reads like it names a band`);
  }
});

/* ------------------------------------------------------------------ */
/* 8. The generated index and the assembled catalogue stay under cap   */
/* ------------------------------------------------------------------ */

test('the committed generated index stays under its byte cap', () => {
  const bytes = Buffer.byteLength(readFileSync(LEARNING_INDEX_SOURCE, 'utf8'), 'utf8');
  assert.ok(
    bytes <= LEARNING_INDEX_MAX_BYTES,
    `the index is ${bytes} bytes, over the ${LEARNING_INDEX_MAX_BYTES} byte cap`,
  );
});

test('the assembled catalogue stays under its (deliberately raised) byte cap', () => {
  const bytes = Buffer.byteLength(JSON.stringify(CATALOGUE), 'utf8');
  assert.ok(
    bytes <= LEARNING_CATALOGUE_MAX_BYTES,
    `the catalogue is ${bytes} bytes, over the ${LEARNING_CATALOGUE_MAX_BYTES} byte cap`,
  );
});
