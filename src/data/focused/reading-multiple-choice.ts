/* Reading, Multiple Choice (WP18a, 2026-09-22). See the header of
 * reading-tfng.ts for the shared rules this file follows.
 *
 * Multiple choice prints its options on the QUESTION, not the group (every
 * question in a group can offer different options), which is genuinely
 * different from Pilot A's shared-list shape. src/pages/trainers/focused
 * /[id].astro builds each item's own `options` (letter and text together)
 * from the question, and FocusedExercise.tsx renders that per-item list
 * instead of the group's shared one when it is present. Nothing here is
 * new: the file below is exactly Pilot A's shape, because the difference
 * is resolved once, at build time, not per exercise.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'reading-multiple-choice-guided',
  subskill: 'multiple-choice',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Multiple Choice: guided practice',
  objective: 'Choose the option the passage actually supports and reject the ones that only sound right.',
  expectedMinutes: 12,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-022',
    partIndex: 0,
    groupIndex: 1,
    drillId: 'reading-full-022-drill-p1',
    attribution: 'Academic Reading Test 22, Passage 1, Questions 4 to 10.',
  },
  lesson: { key: 'reading-mc', blockHeading: 'How to Approach It' },
  items: items('reading-full-022', ['q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10']),
  reasons: 'multiple-choice',
};

const GUIDED_B: FocusedExercise = {
  id: 'reading-multiple-choice-guided-2',
  subskill: 'multiple-choice',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Multiple Choice: more guided practice',
  objective: 'Choose the option the passage actually supports and reject the ones that only sound right.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-031',
    partIndex: 0,
    groupIndex: 0,
    drillId: 'reading-full-031-drill-p1',
    attribution: 'Academic Reading Test 31, Passage 1, Questions 1 to 5.',
  },
  lesson: { key: 'reading-mc', blockHeading: 'How to Approach It' },
  items: items('reading-full-031', ['q1', 'q2', 'q3', 'q4', 'q5']),
  reasons: 'multiple-choice',
};

const CHECK_A: FocusedExercise = {
  id: 'reading-multiple-choice-check-a',
  subskill: 'multiple-choice',
  paper: 'reading',
  role: 'independent-check',
  title: 'Multiple Choice: independent check',
  objective: 'Show on a passage you have not seen that you can choose the option the passage supports, on your own.',
  expectedMinutes: 5,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-029',
    partIndex: 1,
    groupIndex: 0,
    drillId: 'reading-full-029-drill-p2',
    attribution: 'Academic Reading Test 29, Passage 2, Questions 14 to 16.',
  },
  lesson: { key: 'reading-mc', blockHeading: 'How to Approach It' },
  items: items('reading-full-029', ['q14', 'q15', 'q16']),
  reasons: 'multiple-choice',
};

const CHECK_B: FocusedExercise = {
  id: 'reading-multiple-choice-check-b',
  subskill: 'multiple-choice',
  paper: 'reading',
  role: 'independent-check',
  title: 'Multiple Choice: second independent check',
  objective: 'Show on a second unseen passage that you can choose the option the passage supports, on your own.',
  expectedMinutes: 10,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-029',
    partIndex: 2,
    groupIndex: 0,
    drillId: 'reading-full-029-drill-p3',
    attribution: 'Academic Reading Test 29, Passage 3, Questions 27 to 32.',
  },
  lesson: { key: 'reading-mc', blockHeading: 'How to Approach It' },
  items: items('reading-full-029', ['q27', 'q28', 'q29', 'q30', 'q31', 'q32']),
  reasons: 'multiple-choice',
};

export const READING_MULTIPLE_CHOICE: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
