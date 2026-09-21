/* Reading, Categorisation (WP18a, 2026-09-22). See the header of
 * reading-tfng.ts for the shared rules this file follows.
 *
 * Categorisation is the older name for Matching Features and shares its
 * lesson (src/data/reading-strategies.ts's QUESTION_TYPE_STRATEGY already
 * borrows 'matching-features' for it) and its shape: a shared list of
 * categories printed as `group.options`, so it needs no change to how the
 * exercise is resolved or rendered.
 *
 * Neither reserved paper contains a categorisation group, so two more are
 * reserved here: reading-full-028 and reading-full-034
 * (RESERVED_CHECK_PAPER_IDS is derived from the checks below, never
 * hand-listed).
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'reading-categorisation-guided',
  subskill: 'categorisation',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Categorisation: guided practice',
  objective: 'Classify a statement under the right person, place or thing from a shared list.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-017',
    partIndex: 1,
    groupIndex: 2,
    drillId: 'reading-full-017-drill-p2',
    attribution: 'Academic Reading Test 17, Passage 2, Questions 22 to 26.',
  },
  lesson: { key: 'reading-matching-features', blockHeading: 'How to Approach It' },
  items: items('reading-full-017', ['q22', 'q23', 'q24', 'q25', 'q26']),
  reasons: 'categorisation',
};

const GUIDED_B: FocusedExercise = {
  id: 'reading-categorisation-guided-2',
  subskill: 'categorisation',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Categorisation: more guided practice',
  objective: 'Classify a statement under the right person, place or thing from a shared list.',
  expectedMinutes: 11,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-020',
    partIndex: 2,
    groupIndex: 2,
    drillId: 'reading-full-020-drill-p3',
    attribution: 'Academic Reading Test 20, Passage 3, Questions 34 to 39.',
  },
  lesson: { key: 'reading-matching-features', blockHeading: 'How to Approach It' },
  items: items('reading-full-020', ['q34', 'q35', 'q36', 'q37', 'q38', 'q39']),
  reasons: 'categorisation',
};

const CHECK_A: FocusedExercise = {
  id: 'reading-categorisation-check-a',
  subskill: 'categorisation',
  paper: 'reading',
  role: 'independent-check',
  title: 'Categorisation: independent check',
  objective: 'Show on a passage you have not seen that you can classify a statement under the right category, on your own.',
  expectedMinutes: 11,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-028',
    partIndex: 1,
    groupIndex: 0,
    drillId: 'reading-full-028-drill-p2',
    attribution: 'Academic Reading Test 28, Passage 2, Questions 15 to 20.',
  },
  lesson: { key: 'reading-matching-features', blockHeading: 'How to Approach It' },
  items: items('reading-full-028', ['q15', 'q16', 'q17', 'q18', 'q19', 'q20']),
  reasons: 'categorisation',
};

const CHECK_B: FocusedExercise = {
  id: 'reading-categorisation-check-b',
  subskill: 'categorisation',
  paper: 'reading',
  role: 'independent-check',
  title: 'Categorisation: second independent check',
  objective: 'Show on a second unseen passage that you can classify a statement under the right category, on your own.',
  expectedMinutes: 12,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-034',
    partIndex: 2,
    groupIndex: 1,
    drillId: 'reading-full-034-drill-p3',
    attribution: 'Academic Reading Test 34, Passage 3, Questions 34 to 40.',
  },
  lesson: { key: 'reading-matching-features', blockHeading: 'How to Approach It' },
  items: items('reading-full-034', ['q34', 'q35', 'q36', 'q37', 'q38', 'q39', 'q40']),
  reasons: 'categorisation',
};

export const READING_CATEGORISATION: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
