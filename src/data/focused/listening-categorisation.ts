/* Listening, Categorisation (WP18b/WP19, 2026-09-22). See the header of
 * listening-sentence-completion.ts for the shared rules: real publisher
 * material only, checks drawn from the three reserved papers
 * (listening-full-008, listening-full-009, listening-full-019).
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'listening-categorisation-guided',
  subskill: 'categorisation',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Categorisation: guided practice',
  objective: 'Sort each item into the category the speaker settles on, not the first one mentioned.',
  expectedMinutes: 7,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-013',
    partIndex: 0,
    groupIndex: 1,
    drillId: 'listening-full-013-drill-p1',
    attribution: 'IELTS Listening Test 13, Part 1, Questions 7 to 10.',
  },
  lesson: { key: 'listening-matching', blockHeading: 'How to Approach It' },
  items: items('listening-full-013', ['q7', 'q8', 'q9', 'q10']),
  reasons: 'listening-categorisation',
};

const GUIDED_B: FocusedExercise = {
  id: 'listening-categorisation-guided-2',
  subskill: 'categorisation',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Categorisation: more guided practice',
  objective: 'Sort each item into the category the speaker settles on, not the first one mentioned.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-025',
    partIndex: 2,
    groupIndex: 0,
    drillId: 'listening-full-025-drill-p3',
    attribution: 'IELTS Listening Test 25, Part 3, Questions 21 to 26.',
  },
  lesson: { key: 'listening-matching', blockHeading: 'How to Approach It' },
  items: items('listening-full-025', ['q21', 'q22', 'q23', 'q24', 'q25', 'q26']),
  reasons: 'listening-categorisation',
};

const CHECK_A: FocusedExercise = {
  id: 'listening-categorisation-check-a',
  subskill: 'categorisation',
  paper: 'listening',
  role: 'independent-check',
  title: 'Categorisation: independent check',
  objective: 'Show on a recording you have not heard that you can sort items into the right category on your own.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-008',
    partIndex: 2,
    groupIndex: 1,
    drillId: 'listening-full-008-drill-p3',
    attribution: 'IELTS Listening Test 8, Part 3, Questions 23 to 26.',
  },
  lesson: { key: 'listening-matching', blockHeading: 'How to Approach It' },
  items: items('listening-full-008', ['q23', 'q24', 'q25', 'q26']),
  reasons: 'listening-categorisation',
};

const CHECK_B: FocusedExercise = {
  id: 'listening-categorisation-check-b',
  subskill: 'categorisation',
  paper: 'listening',
  role: 'independent-check',
  title: 'Categorisation: second independent check',
  objective:
    'Show on a second recording you have not heard that you can sort items into the right category on your own.',
  expectedMinutes: 7,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-009',
    partIndex: 2,
    groupIndex: 2,
    drillId: 'listening-full-009-drill-p3',
    attribution: 'IELTS Listening Test 9, Part 3, Questions 26 to 30.',
  },
  lesson: { key: 'listening-matching', blockHeading: 'How to Approach It' },
  items: items('listening-full-009', ['q26', 'q27', 'q28', 'q29', 'q30']),
  reasons: 'listening-categorisation',
};

export const LISTENING_CATEGORISATION: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
