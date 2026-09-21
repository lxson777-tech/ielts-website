/* Reading, True / False / Not Given (WP18a, 2026-09-22).
 *
 * Same pattern as Pilot A (reading-matching-headings.ts): real publisher
 * questions only, the guided set from ordinary papers, both checks from the
 * two reserved papers (reading-full-029, reading-full-037), so a normal
 * practice drill can never spend them first.
 *
 * TFNG has no shared list of options printed on the paper (True, False and
 * Not Given are the same three words on every paper), so
 * src/pages/trainers/focused/[id].astro supplies them directly rather than
 * reading a `group.options` that does not exist, the same exception
 * TestPlayer.tsx already makes for this type.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'reading-tfng-guided',
  subskill: 'tfng',
  paper: 'reading',
  role: 'guided-practice',
  title: 'True / False / Not Given: guided practice',
  objective: 'Decide whether a statement is True, False or Not Given, by checking the passage rather than your own knowledge.',
  expectedMinutes: 11,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-002',
    partIndex: 0,
    groupIndex: 1,
    drillId: 'reading-full-002-drill-p1',
    attribution: 'Academic Reading Test 2, Passage 1, Questions 8 to 13.',
  },
  lesson: { key: 'reading-tfng', blockHeading: 'How to Approach It' },
  items: items('reading-full-002', ['q8', 'q9', 'q10', 'q11', 'q12', 'q13']),
  reasons: 'tfng',
};

const GUIDED_B: FocusedExercise = {
  id: 'reading-tfng-guided-2',
  subskill: 'tfng',
  paper: 'reading',
  role: 'guided-practice',
  title: 'True / False / Not Given: more guided practice',
  objective: 'Decide whether a statement is True, False or Not Given, by checking the passage rather than your own knowledge.',
  expectedMinutes: 11,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-005',
    partIndex: 0,
    groupIndex: 1,
    drillId: 'reading-full-005-drill-p1',
    attribution: 'Academic Reading Test 5, Passage 1, Questions 8 to 13.',
  },
  lesson: { key: 'reading-tfng', blockHeading: 'How to Approach It' },
  items: items('reading-full-005', ['q8', 'q9', 'q10', 'q11', 'q12', 'q13']),
  reasons: 'tfng',
};

const CHECK_A: FocusedExercise = {
  id: 'reading-tfng-check-a',
  subskill: 'tfng',
  paper: 'reading',
  role: 'independent-check',
  title: 'True / False / Not Given: independent check',
  objective: 'Show on a passage you have not seen that you can decide True, False or Not Given on your own.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-029',
    partIndex: 0,
    groupIndex: 1,
    drillId: 'reading-full-029-drill-p1',
    attribution: 'Academic Reading Test 29, Passage 1, Questions 7 to 9.',
  },
  lesson: { key: 'reading-tfng', blockHeading: 'How to Approach It' },
  items: items('reading-full-029', ['q7', 'q8', 'q9']),
  reasons: 'tfng',
};

const CHECK_B: FocusedExercise = {
  id: 'reading-tfng-check-b',
  subskill: 'tfng',
  paper: 'reading',
  role: 'independent-check',
  title: 'True / False / Not Given: second independent check',
  objective: 'Show on a second unseen passage that you can decide True, False or Not Given on your own.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-037',
    partIndex: 1,
    groupIndex: 0,
    drillId: 'reading-full-037-drill-p2',
    attribution: 'Academic Reading Test 37, Passage 2, Questions 15 to 19.',
  },
  lesson: { key: 'reading-tfng', blockHeading: 'How to Approach It' },
  items: items('reading-full-037', ['q15', 'q16', 'q17', 'q18', 'q19']),
  reasons: 'tfng',
};

export const READING_TFNG: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
