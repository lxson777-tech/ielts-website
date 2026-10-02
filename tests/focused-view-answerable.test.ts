/* Every focused exercise, as its page actually shows it, must give the
 * student what they need to answer every question: either the question's
 * own wording, or a visible stimulus (the publisher's table, form, notes,
 * flow chart, map or diagram) that carries that question's numbered gap.
 *
 * Found 2026-10-03: imported Listening completion groups (and some matching
 * groups) hold each question only as a "Question N" placeholder, the real
 * table or flow chart living in the part's question sheet. The focused page
 * passed the sheet through for diagrams and menus only, so eleven exercises
 * showed "Complete the table below" over empty numbered boxes. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_FOCUSED_EXERCISES } from '../src/data/focused-exercises.ts';
import { ALL_TESTS } from '../src/data/tests/index.ts';
import { focusedPageView } from '../src/lib/tests/focused-views.ts';
import { focusedSourceSupport, isPlaceholderQuestion } from '../src/lib/tests/focused-source-support.ts';

const views = ALL_FOCUSED_EXERCISES.map((exercise) => ({
  exercise,
  view: focusedPageView(exercise, () => undefined).item,
})).filter((entry): entry is { exercise: (typeof ALL_FOCUSED_EXERCISES)[number]; view: NonNullable<typeof entry.view> } => entry.view != null);

const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** A gap numbered `n` printed in the stimulus: the imported sheet's
    data-question / aria label, or the printed "(n)" / "n ......" forms the
    Reading papers use. */
function stimulusHasGap(html: string, n: number): boolean {
  if (new RegExp(`data-question="${n}"`).test(html)) return true;
  if (new RegExp(`Blank for question ${n}\\b`).test(html)) return true;
  const text = plain(html);
  return new RegExp(`\\(\\s*${n}\\s*\\)|(^|[^0-9.,])${n}\\s*[.…_]{2,}|\\b${n}\\s*…`).test(text);
}

/** Multiple answer groups whose paper holds no question stem anywhere, only
    "Choose THREE letters A-G." (or "Choose two letters, A-E.") over the
    choices: listening-full-007 Q16-18, listening-full-010 Q5-7 and
    reading-full-015 Q39-40. The full test player shows exactly the same, so
    this is a gap in those data files, not in this page; it is named here so
    it stays visible rather than silently passing. */
const SOURCE_HAS_NO_STEM = new Set([
  'listening-multiple-answer-guided',
  'listening-multiple-answer-guided-2',
  'reading-multiple-answer-check-b',
]);

test('every focused exercise shows, for every question, its wording or a stimulus with its gap', () => {
  const failures: string[] = [];
  for (const { exercise, view } of views) {
    const legend = view.legendHtml ?? '';
    const stimulusHasPicture = /<img\b/.test(legend);
    for (const item of view.items) {
      const ownText = !/^(question\s+\d+)?$/i.test(item.label.trim()) || Boolean(item.before?.trim()) || Boolean(item.after?.trim());
      if (view.subskill === 'multiple-answer') {
        /* One shared question: the stem (in the instruction or the sheet)
           and the labelled choices every slot offers. */
        const choices = (item.options?.length ?? 0) > 1 || view.options.length > 1;
        const stem = /\?|\bwhich\b/i.test(plain(`${view.instructionHtml} ${legend}`));
        if (!choices) failures.push(`${exercise.id} Q${item.number}: no choices`);
        if (!stem && !SOURCE_HAS_NO_STEM.has(exercise.id)) failures.push(`${exercise.id} Q${item.number}: no question stem`);
        continue;
      }
      if (ownText) continue;
      if (stimulusHasGap(legend, item.number)) continue;
      /* A Reading flow chart printed as a picture: the gap numbers are in
         the image itself. */
      if (stimulusHasPicture) continue;
      failures.push(`${exercise.id} Q${item.number}: only "${item.label}" and no stimulus with its gap`);
    }
  }
  assert.deepEqual(failures, []);
});

test('the reported Listening exercises now carry their own section of the question sheet', () => {
  const expected: Record<string, RegExp> = {
    'listening-sentence-completion-guided': /<table/,
    'listening-sentence-completion-guided-2': /data-question="16"/,
    'listening-sentence-completion-check-a': /<table/,
    'listening-table-completion-guided': /data-question="16"/,
    'listening-table-completion-guided-2': /data-question="17"/,
    'listening-table-completion-check-a': /<table/,
    'listening-table-completion-check-b': /<table/,
    'listening-matching-features-check-a': /Making a steam pit[\s\S]*listening-source-legend|listening-source-legend[\s\S]*Making a steam pit/,
    /* A map task currently typed as matching-features in listening-full-002;
       it renders because the rule is "the group has no wording of its own",
       never the group's type, so retyping it keeps the map. */
    'listening-matching-features-guided-2': /<img\b[^>]*\/pics\/listening\/imported\/test-002\.png/,
    'listening-multiple-answer-check-a': /bamboo oven/,
    'listening-multiple-answer-check-b': /wild fungi/,
  };
  for (const [id, pattern] of Object.entries(expected)) {
    const entry = views.find((candidate) => candidate.exercise.id === id);
    assert.ok(entry, id);
    assert.match(entry.view.legendHtml ?? '', pattern, id);
    assert.match(entry.view.legendHtml ?? '', /class="listening-question-paper focused-source-sheet"/, id);
  }
});

test('the sheet passed to a focused page never reaches past its own group', () => {
  for (const { exercise, view } of views) {
    if (!('source' in exercise) || !('testId' in exercise.source)) continue;
    const legend = view.legendHtml ?? '';
    const numbers = view.items.map((item) => item.number);
    const paper = ALL_TESTS.find((candidate) => candidate.id === (exercise.source as { testId: string }).testId)!;
    const group = paper.parts[exercise.source.partIndex]!.groups[exercise.source.groupIndex]!;
    const first = Math.min(...numbers);
    const last = first + group.questions.length - 1;
    for (const found of legend.matchAll(/data-question(?:-row)?="(\d+)"/g)) {
      const n = Number(found[1]);
      assert.ok(n >= first && n <= last, `${exercise.id} shows question ${n}, outside its group ${first}-${last}`);
    }
    /* No other group's header, and never a second section. */
    assert.doesNotMatch(legend, /<section\b|listening-source-header/, exercise.id);
  }
});

test('a section wider than the group is not passed through whole', () => {
  const group = {
    title: 'Questions 1-2',
    type: 'table-completion' as const,
    instructionHtml: 'Complete the table below.',
    questions: [
      { id: 'q1', textHtml: 'Question 1', answer: 'a' },
      { id: 'q2', textHtml: 'Question 2', answer: 'b' },
    ],
  };
  const sheet =
    '<section class="listening-source-group" data-question-start="1" data-question-end="5"><header class="listening-source-header"><p>Questions 1-5</p></header><table><tr><td><span data-question="1"></span></td><td><span data-question="5"></span></td></tr></table></section>';
  const support = focusedSourceSupport(sheet, 1, group);
  assert.equal(support.legendHtml, undefined);
});

test('placeholder detection reads wording, not the field being present', () => {
  assert.equal(isPlaceholderQuestion({ textHtml: 'Question 12' }), true);
  assert.equal(isPlaceholderQuestion({ textHtml: '' }), true);
  assert.equal(isPlaceholderQuestion({}), true);
  assert.equal(isPlaceholderQuestion({ textHtml: 'Question 12', before: 'The hall seats' }), false);
  assert.equal(isPlaceholderQuestion({ textHtml: 'What does the student particularly like to eat?' }), false);
});
