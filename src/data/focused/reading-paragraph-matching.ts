/* Reading, Matching Information (WP18a, 2026-09-22). The site calls this
 * lesson "Matching Information"; the schema and the catalogue call the
 * subskill `paragraph-matching`, which is what this file uses throughout.
 * See the header of reading-tfng.ts for the shared rules this file follows.
 *
 * Like Matching Features, this type prints its own shared list of paragraph
 * letters as `group.options`, so it needs no change to how the exercise is
 * resolved or rendered.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'reading-paragraph-matching-guided',
  subskill: 'paragraph-matching',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Matching Information: guided practice',
  objective: 'Find which paragraph holds one specific piece of information, not just the right general topic.',
  expectedMinutes: 11,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-009',
    partIndex: 0,
    groupIndex: 0,
    drillId: 'reading-full-009-drill-p1',
    attribution: 'Academic Reading Test 9, Passage 1, Questions 1 to 6.',
  },
  lesson: { key: 'reading-matching-information', blockHeading: 'How to Approach It' },
  items: items('reading-full-009', ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']),
  reasons: 'paragraph-matching',
};

const GUIDED_B: FocusedExercise = {
  id: 'reading-paragraph-matching-guided-2',
  subskill: 'paragraph-matching',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Matching Information: more guided practice',
  objective: 'Find which paragraph holds one specific piece of information, not just the right general topic.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-008',
    partIndex: 1,
    groupIndex: 0,
    drillId: 'reading-full-008-drill-p2',
    attribution: 'Academic Reading Test 8, Passage 2, Questions 14 to 18.',
  },
  lesson: { key: 'reading-matching-information', blockHeading: 'How to Approach It' },
  items: items('reading-full-008', ['q14', 'q15', 'q16', 'q17', 'q18']),
  reasons: 'paragraph-matching',
};

const CHECK_A: FocusedExercise = {
  id: 'reading-paragraph-matching-check-a',
  subskill: 'paragraph-matching',
  paper: 'reading',
  role: 'independent-check',
  title: 'Matching Information: independent check',
  objective: 'Show on a passage you have not seen that you can find where one piece of information sits, on your own.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-037',
    partIndex: 1,
    groupIndex: 1,
    drillId: 'reading-full-037-drill-p2',
    attribution: 'Academic Reading Test 37, Passage 2, Questions 20 to 24.',
  },
  lesson: { key: 'reading-matching-information', blockHeading: 'How to Approach It' },
  items: items('reading-full-037', ['q20', 'q21', 'q22', 'q23', 'q24']),
  reasons: 'paragraph-matching',
};

const CHECK_B: FocusedExercise = {
  id: 'reading-paragraph-matching-check-b',
  subskill: 'paragraph-matching',
  paper: 'reading',
  role: 'independent-check',
  title: 'Matching Information: second independent check',
  objective: 'Show on a second unseen passage that you can find where one piece of information sits, on your own.',
  expectedMinutes: 7,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-037',
    partIndex: 2,
    groupIndex: 0,
    drillId: 'reading-full-037-drill-p3',
    attribution: 'Academic Reading Test 37, Passage 3, Questions 28 to 31.',
  },
  lesson: { key: 'reading-matching-information', blockHeading: 'How to Approach It' },
  items: items('reading-full-037', ['q28', 'q29', 'q30', 'q31']),
  reasons: 'paragraph-matching',
};

export const READING_PARAGRAPH_MATCHING: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
