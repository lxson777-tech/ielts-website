/* Reading, Sentence Endings (WP18a, 2026-09-22; real material since the
 * 2026-10-03 pre-publish fix). See the header of reading-tfng.ts for the
 * shared rules this file follows.
 *
 * HISTORY, BECAUSE THE ID SAYS "authored"
 * Until 3 October 2026 the library seemed to contain no Matching Sentence
 * Endings task at all, so lead decision Q1 asked for one small authored set
 * (a "Community Gardens" paragraph written for this site, guided practice
 * only, unverified). The 2026-10-03 content review found that the papers do
 * contain the type: fifteen "Complete each sentence with the correct
 * ending" groups had been imported typed as Sentence Completion (Tests 2,
 * 6, 8, 13 twice, 16, 20, 21, 24, 28, 31, 33, 35 twice and 39). Once they
 * were retyped `sentence-endings`, the authored stand-in had no reason to
 * exist: every focused exercise is one real question group, never
 * invented material (src/data/focused-exercises.ts, "NOTHING IS INVENTED").
 *
 * So this exercise now draws on a real paper. Its id is unchanged
 * ('reading-sentence-endings-authored') because the catalogue id
 * `focus:reading-sentence-endings-authored` is already stored against
 * students' progress; renaming it would orphan that progress. Its title and
 * objective are unchanged too, so their Russian in
 * src/lib/i18n/dict/ru/learning-focus-reading.ts still applies.
 *
 * WHICH PAPER
 * Test 33, Passage 3, Questions 36 to 40: five sentence beginnings, seven
 * endings (two distractors, the usual margin). Test 33 is used by no other
 * focused exercise and by no lesson practice set (src/data/reading-practice.ts
 * quotes Tests 8 and 13 for this type), and it is not reserved for a check,
 * so guided practice may spend it. Other unused sentence-endings groups
 * remain for independent checks if they are wanted later: Test 21 Q38-40 and
 * Test 39 Q36-39 (adding a check reserves its paper, see
 * RESERVED_CHECK_PAPER_IDS).
 *
 * Matching Sentence Endings prints its endings as the group's `legendHtml`
 * and the letters as `group.options` (the same shape a summary-with-a-box
 * group uses), so this type needs no change to how an exercise is resolved
 * or rendered.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED: FocusedExercise = {
  id: 'reading-sentence-endings-authored',
  subskill: 'sentence-endings',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Sentence Endings: guided practice',
  objective: 'Complete a sentence with the ending the passage actually supports, not just one that fits grammatically.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-033',
    partIndex: 2,
    groupIndex: 2,
    drillId: 'reading-full-033-drill-p3',
    attribution: 'Academic Reading Test 33, Passage 3, Questions 36 to 40.',
  },
  lesson: { key: 'reading-matching-sentence-endings', blockHeading: 'How to Approach It' },
  items: items('reading-full-033', ['q36', 'q37', 'q38', 'q39', 'q40']),
  reasons: 'sentence-endings',
};

export const READING_SENTENCE_ENDINGS: readonly FocusedExercise[] = [GUIDED];
