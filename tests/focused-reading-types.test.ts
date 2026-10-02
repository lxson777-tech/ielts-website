/* WP18a: the remaining Reading question types (2026-09-22).
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/focused-reading-types.test.ts
 * The whole suite is `npm test`.
 *
 * Pilot A's own suite (tests/pilot-matching-headings.test.ts, first test in
 * its file 1) already resolves EVERY entry in FOCUSED_EXERCISES against the
 * real papers generically, mine included the moment they are registered:
 * it checks the named paper, part and group exist, that the group really
 * is the claimed type, and that every item id is the paper's own. This
 * file does not repeat that. What it adds is specific to this package:
 *
 *   1. Every Reading type with real material has at least two guided and
 *      two independent-check exercises, and a reason list of its own.
 *   2. No guided exercise spends a reserved paper, and no check exercise
 *      uses anything BUT a reserved paper.
 *   3. No item id is shared between a guided exercise and a check (a
 *      repeat would be a repeat of "unseen" material).
 *   4. Sentence endings (an authored stand-in until 3 October 2026, real
 *      papers since) draws on a real group, keeps its stored id, is
 *      offered as guided practice and never as a check, and every real
 *      sentence-endings group has the shape the select layout reads.
 *   5. Every teaching block this package points at is really in the lesson
 *      it names, in both stated block heading and lesson key.
 *   6. Expected minutes are sane, and the reason lists carry no dash and
 *      no repeated id.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  FOCUSED_EXERCISES,
  AUTHORED_FOCUSED_EXERCISES,
  MISTAKE_REASONS,
  RESERVED_CHECK_PAPER_IDS,
  isAuthoredFocusedExercise,
  type FocusedExercise,
} from '../src/data/focused-exercises.ts';
import { ALL_TESTS } from '../src/data/tests/index.ts';
import {
  checksForSubskill,
  findActivity,
  focusedActivityId,
  learningCatalogue,
  practiceForSubskill,
} from '../src/lib/learning/catalog.ts';
import { segmentLessonBody } from '../src/lib/learning/lesson-blocks.ts';

const CATALOGUE = learningCatalogue();

/** The nine Reading types this package added real material for, and the
    lesson each one's exercises point at. sentence-endings is checked on
    its own further down: it has one real guided set and no check yet. */
const READING_TYPES: { subskill: string; lessonKey: string }[] = [
  { subskill: 'tfng', lessonKey: 'reading-tfng' },
  { subskill: 'yes-no-notgiven', lessonKey: 'reading-ynng' },
  { subskill: 'matching-features', lessonKey: 'reading-matching-features' },
  { subskill: 'paragraph-matching', lessonKey: 'reading-matching-information' },
  { subskill: 'multiple-choice', lessonKey: 'reading-mc' },
  { subskill: 'sentence-completion', lessonKey: 'reading-sentence' },
  { subskill: 'table-completion', lessonKey: 'reading-summary-completion' },
  { subskill: 'multiple-answer', lessonKey: 'reading-mc' },
  { subskill: 'categorisation', lessonKey: 'reading-matching-features' },
];

function readingExercisesFor(subskill: string): FocusedExercise[] {
  return FOCUSED_EXERCISES.filter((exercise) => exercise.paper === 'reading' && exercise.subskill === subskill);
}

/* ------------------------------------------------------------------ */
/* 1. Two guided, two checks, one reason list, per type                */
/* ------------------------------------------------------------------ */

test('every WP18a Reading type has at least two guided exercises, two independent checks and its own reason list', () => {
  for (const { subskill } of READING_TYPES) {
    const exercises = readingExercisesFor(subskill);
    const guided = exercises.filter((entry) => entry.role === 'guided-practice');
    const checks = exercises.filter((entry) => entry.role === 'independent-check');
    assert.ok(guided.length >= 2, `${subskill}: expected at least two guided exercises, found ${guided.length}`);
    assert.ok(checks.length >= 2, `${subskill}: expected at least two independent checks, found ${checks.length}`);
    for (const entry of exercises) {
      assert.ok(entry.reasons in MISTAKE_REASONS, `${entry.id}: "${entry.reasons}" has no reason list`);
      assert.equal(entry.reasons, subskill, `${entry.id}: expected its own reason list, not a borrowed one`);
    }
  }
});

/** The plain text of each lettered ending in a legend. */
function endingTexts(legendHtml: string): string[] {
  return [...legendHtml.matchAll(/<strong>[A-Z]<\/strong>\s*([^<]+)/g)].map((match) => match[1]!.trim()).filter((text) => text.length > 8);
}

/** Every real sentence-endings group in the Reading papers. */
function sentenceEndingsGroups() {
  const found: { paperId: string; partIndex: number; groupIndex: number; group: (typeof ALL_TESTS)[number]['parts'][number]['groups'][number] }[] = [];
  for (const paper of ALL_TESTS) {
    if (paper.skill !== 'reading') continue;
    paper.parts.forEach((part, partIndex) =>
      part.groups.forEach((group, groupIndex) => {
        if (group.type === 'sentence-endings') found.push({ paperId: paper.id, partIndex, groupIndex, group });
      }),
    );
  }
  return found;
}

test('sentence endings uses real papers: fifteen real groups, and its guided set draws on one of them', () => {
  /* CHANGED 3 October 2026. This test used to assert the opposite (no
     Reading paper contains the type, so one authored set stands in for it,
     lead decision Q1). That was a typing mistake in the papers: fifteen
     real "Complete each sentence with the correct ending" groups had been
     imported as Sentence Completion. With them typed correctly, the
     authored stand-in is retired and the set draws on a real group. */
  const groups = sentenceEndingsGroups();
  assert.equal(groups.length, 15, 'fifteen real sentence-endings groups');

  assert.equal(
    AUTHORED_FOCUSED_EXERCISES.filter((entry) => entry.subskill === 'sentence-endings').length,
    0,
    'no authored stand-in remains once real material exists',
  );

  const exercises = readingExercisesFor('sentence-endings');
  assert.ok(exercises.length >= 1, 'at least one real sentence-endings exercise');
  /* The id is kept from the authored days so stored progress still finds it. */
  assert.ok(exercises.some((entry) => entry.id === 'reading-sentence-endings-authored'));
  for (const entry of exercises) {
    assert.equal(entry.provenance, 'imported-paper', `${entry.id} is real publisher material`);
    assert.equal(entry.reasons, 'sentence-endings', `${entry.id} uses its own reason list`);
    assert.ok(
      groups.some((g) => g.paperId === entry.source.testId && g.partIndex === entry.source.partIndex && g.groupIndex === entry.source.groupIndex),
      `${entry.id} names a real sentence-endings group`,
    );
    const reserved = RESERVED_CHECK_PAPER_IDS.includes(entry.source.testId);
    assert.equal(reserved, entry.role === 'independent-check', `${entry.id}: guided practice never spends a reserved paper`);
    assert.ok(entry.expectedMinutes >= 3 && entry.expectedMinutes <= 13, `${entry.id}: ${entry.expectedMinutes} minutes is not sane`);
  }

  /* Its paper is not spent anywhere else: no other focused exercise uses
     it, so a student meets these questions fresh. */
  for (const entry of exercises) {
    const others = FOCUSED_EXERCISES.filter((other) => other.id !== entry.id && other.source.testId === entry.source.testId);
    assert.deepEqual(others.map((other) => other.id), [], `${entry.source.testId} is used by another focused exercise too`);
  }
});

test('every real sentence-endings group renders as a choice from its endings, with nothing glued on', () => {
  /* The shape the select layout reads (TestPlayer, focused-views): the
     letters as `options`, the endings in `legendHtml`, each beginning in
     `textHtml`, and no free-text `before`/`after` left over from the old
     Sentence Completion typing. */
  for (const { paperId, group } of sentenceEndingsGroups()) {
    const where = `${paperId} ${group.title}`;
    assert.ok(group.options && group.options.length > group.questions.length - 1, `${where}: needs its letters as options`);
    for (const letter of group.options!) assert.match(letter, /^[A-Z]$/, `${where}: options are letters`);
    assert.ok(group.legendHtml, `${where}: needs the list of endings`);
    for (const letter of group.options!) {
      assert.ok(group.legendHtml!.includes(`<strong>${letter}</strong>`), `${where}: ending ${letter} is missing from the legend`);
    }
    for (const question of group.questions) {
      assert.equal(question.before, undefined, `${where} ${question.id}: free-text "before" left over`);
      assert.equal(question.after, undefined, `${where} ${question.id}: free-text "after" left over`);
      assert.ok((question.textHtml ?? '').length > 5, `${where} ${question.id}: the sentence beginning is missing`);
      for (const ending of endingTexts(group.legendHtml!)) {
        assert.ok(!(question.textHtml ?? '').includes(ending), `${where} ${question.id}: an ending is glued onto the beginning`);
      }
      for (const answer of Array.isArray(question.answer) ? question.answer : [question.answer]) {
        assert.ok(group.options!.includes(answer), `${where} ${question.id}: answer ${answer} is not one of the options`);
      }
    }
  }
});

/* ------------------------------------------------------------------ */
/* 2. Reserved material stays reserved, guided material stays unseen   */
/* ------------------------------------------------------------------ */

test('no WP18a guided exercise spends a reserved paper, and no WP18a check uses anything else', () => {
  for (const { subskill } of READING_TYPES) {
    for (const entry of readingExercisesFor(subskill)) {
      const reserved = RESERVED_CHECK_PAPER_IDS.includes(entry.source.testId);
      if (entry.role === 'guided-practice') {
        assert.ok(!reserved, `${entry.id} is guided practice but names the reserved paper ${entry.source.testId}`);
      } else {
        assert.ok(reserved, `${entry.id} is a check but ${entry.source.testId} is not reserved`);
      }
    }
  }
});

test('every paper a WP18a check draws on really is reserved, and the reservation is exactly earned', () => {
  /* The four papers this package adds to the reserved set, and why each
     one is there (see the header comment of the file that reserves it). */
  const addedByThisPackage = ['reading-full-003', 'reading-full-015', 'reading-full-028', 'reading-full-034'];
  for (const paperId of addedByThisPackage) {
    assert.ok(RESERVED_CHECK_PAPER_IDS.includes(paperId), `${paperId} should be reserved`);
    const usedByAGuidedExercise = FOCUSED_EXERCISES.some(
      (entry) => entry.role === 'guided-practice' && entry.source.testId === paperId,
    );
    assert.ok(!usedByAGuidedExercise, `${paperId} is reserved for a check, so no guided exercise (any type) may use it`);
    const drill = findActivity(`drill:${paperId}-drill-p1`, CATALOGUE);
    if (drill) assert.ok((drill.tags ?? []).includes('check-only'), `${paperId}'s drill should be marked check-only`);
  }
});

test('no item id is answered by both a guided exercise and a check, anywhere in this package', () => {
  const guidedItems = new Map<string, string>();
  const checkItems = new Map<string, string>();
  for (const { subskill } of READING_TYPES) {
    for (const entry of readingExercisesFor(subskill)) {
      const bucket = entry.role === 'guided-practice' ? guidedItems : checkItems;
      for (const item of entry.items) bucket.set(item.id, entry.id);
    }
  }
  for (const [itemId, checkExerciseId] of checkItems) {
    assert.ok(
      !guidedItems.has(itemId),
      `${itemId} is used by both ${checkExerciseId} (a check) and ${guidedItems.get(itemId)} (guided practice)`,
    );
  }
});

/* ------------------------------------------------------------------ */
/* 3. The authored set can never become a check                       */
/* ------------------------------------------------------------------ */

test('the sentence endings guided set keeps its id, is schedulable practice, and is never offered as a check', () => {
  /* The id is the one stored against students' progress since the
     authored days, so it must still resolve, now as verified real material. */
  const activityId = focusedActivityId('reading-sentence-endings-authored');

  const practice = practiceForSubskill('sentence-endings', 60, CATALOGUE).map((activity) => activity.id);
  assert.ok(practice.includes(activityId), 'the guided set is schedulable practice');

  /* Guided practice is never an independent check, whatever its source. */
  const checks = checksForSubskill('sentence-endings', CATALOGUE);
  assert.ok(!checks.some((entry) => entry.activity.id === activityId));

  const activity = findActivity(activityId, CATALOGUE);
  assert.ok(activity, 'the guided set is in the catalogue under its old id');
  assert.equal(activity!.verified, true, 'real publisher material is verified by its source');
  assert.equal(activity!.provenance, 'imported-paper');
  assert.equal(activity!.unavailable, undefined);
});

/* ------------------------------------------------------------------ */
/* 4. Teaching blocks are real                                         */
/* ------------------------------------------------------------------ */

const BODIES = path.join(process.cwd(), 'src/content/lesson-bodies');

test('every lesson block a WP18a exercise points at is really in that lesson', () => {
  const pointers = new Map<string, string>();
  for (const { lessonKey } of READING_TYPES) pointers.set(lessonKey, 'How to Approach It');
  pointers.set('reading-matching-sentence-endings', 'How to Approach It');

  for (const [lessonKey, blockHeading] of pointers) {
    const file = path.join(BODIES, `${lessonKey}.html`);
    assert.ok(fs.existsSync(file), `${lessonKey}.html should exist`);
    const blocks = segmentLessonBody(fs.readFileSync(file, 'utf8'));
    assert.ok(
      blocks.some((block) => block.heading === blockHeading),
      `"${blockHeading}" should be a heading in ${lessonKey}`,
    );
  }
});

/* ------------------------------------------------------------------ */
/* 5. Numbers are sane, and reason lists are well formed                */
/* ------------------------------------------------------------------ */

test('expected minutes are honest and bounded for every WP18a exercise', () => {
  for (const { subskill } of READING_TYPES) {
    for (const entry of readingExercisesFor(subskill)) {
      assert.ok(entry.expectedMinutes >= 3 && entry.expectedMinutes <= 13, `${entry.id}: ${entry.expectedMinutes} minutes is not sane`);
    }
  }
  for (const entry of readingExercisesFor('sentence-endings')) {
    assert.ok(entry.expectedMinutes >= 3 && entry.expectedMinutes <= 13, `${entry.id}: ${entry.expectedMinutes} minutes is not sane`);
  }
});

const NEW_REASON_LISTS = [
  'tfng',
  'yes-no-notgiven',
  'matching-features',
  'paragraph-matching',
  'multiple-choice',
  'sentence-completion',
  'table-completion',
  'multiple-answer',
  'categorisation',
  'sentence-endings',
] as const;

test('every WP18a reason list offers a real choice, with no repeated id and at least one non-method answer', () => {
  for (const listId of NEW_REASON_LISTS) {
    const reasons = MISTAKE_REASONS[listId];
    assert.ok(reasons, `${listId} should be a real reason list`);
    assert.ok(reasons.length >= 4 && reasons.length <= 6, `${listId} should offer four to six reasons`);
    const ids = new Set(reasons.map((reason) => reason.id));
    assert.equal(ids.size, reasons.length, `${listId} has a repeated id`);
    assert.ok(
      reasons.some((reason) => reason.diagnosis === ''),
      `${listId} should let a student say something that is not a method at all`,
    );
    for (const reason of reasons) {
      assert.ok(reason.label.length > 0, `${listId}:${reason.id} has nothing to tap`);
      assert.ok(!/[–—]/.test(`${reason.label}${reason.diagnosis}`), `${listId}:${reason.id} contains a dash`);
    }
  }
});

test('the sentence endings set and the beginnings and endings it shows contain no em dash or en dash', () => {
  /* Was "the authored passage ...": the passage is now the publisher's,
     so what is checked is the text this site wrote or re-laid out. */
  for (const entry of readingExercisesFor('sentence-endings')) {
    const text = [entry.title, entry.objective, entry.source.attribution].join('\n');
    assert.ok(!/[–—]/.test(text), `${entry.id}: no dashes in its title, objective or attribution`);
  }
  for (const { paperId, group } of sentenceEndingsGroups()) {
    const text = [group.legendHtml ?? '', ...group.questions.map((question) => question.textHtml ?? '')].join('\n');
    assert.ok(!/[–—]/.test(text), `${paperId} ${group.title}: no dashes in the beginnings or endings`);
  }
});

/* ------------------------------------------------------------------ */
/* 6. The catalogue still assembles, and Pilot A is unaffected          */
/* ------------------------------------------------------------------ */

test('the catalogue still builds and every WP18a activity resolves through it', () => {
  for (const { subskill } of READING_TYPES) {
    for (const entry of readingExercisesFor(subskill)) {
      const activity = findActivity(focusedActivityId(entry.id), CATALOGUE);
      assert.ok(activity, `${entry.id} should be in the catalogue`);
      assert.equal(activity!.verified, true, 'real publisher material is verified by its source');
    }
  }
});
