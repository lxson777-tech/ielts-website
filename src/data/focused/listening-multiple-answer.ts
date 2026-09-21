/* Listening, Multiple Answer (choose more than one; WP18b/WP19,
 * 2026-09-22). See the header of listening-sentence-completion.ts for the
 * shared rules: real publisher material only, checks drawn from the three
 * reserved papers (listening-full-008, listening-full-009,
 * listening-full-019). Both checks here come from listening-full-019,
 * the only reserved paper carrying two separate multiple-answer groups.
 * Real multiple-answer groups in this library are short (two or three
 * questions worth one mark each), which is why these sets are shorter than
 * the other types: that is the shape of the real material, not a shortcut.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'listening-multiple-answer-guided',
  subskill: 'multiple-answer',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Multiple Answer: guided practice',
  objective: 'Choose the options the recording actually confirms, and keep tracking every option to the end.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-007',
    partIndex: 1,
    groupIndex: 1,
    drillId: 'listening-full-007-drill-p2',
    attribution: 'IELTS Listening Test 7, Part 2, Questions 16 to 18.',
  },
  lesson: { key: 'listening-multiple-choice', blockHeading: 'How to Approach It' },
  items: items('listening-full-007', ['q16', 'q17', 'q18']),
  reasons: 'listening-multiple-answer',
};

const GUIDED_B: FocusedExercise = {
  id: 'listening-multiple-answer-guided-2',
  subskill: 'multiple-answer',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Multiple Answer: more guided practice',
  objective: 'Choose the options the recording actually confirms, and keep tracking every option to the end.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-010',
    partIndex: 0,
    groupIndex: 1,
    drillId: 'listening-full-010-drill-p1',
    attribution: 'IELTS Listening Test 10, Part 1, Questions 5 to 7.',
  },
  lesson: { key: 'listening-multiple-choice', blockHeading: 'How to Approach It' },
  items: items('listening-full-010', ['q5', 'q6', 'q7']),
  reasons: 'listening-multiple-answer',
};

const CHECK_A: FocusedExercise = {
  id: 'listening-multiple-answer-check-a',
  subskill: 'multiple-answer',
  paper: 'listening',
  role: 'independent-check',
  title: 'Multiple Answer: independent check',
  objective:
    'Show on a recording you have not heard that you can choose the right number of confirmed options on your own.',
  expectedMinutes: 5,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-019',
    partIndex: 1,
    groupIndex: 1,
    drillId: 'listening-full-019-drill-p2',
    attribution: 'IELTS Listening Test 19, Part 2, Questions 17 to 18.',
  },
  lesson: { key: 'listening-multiple-choice', blockHeading: 'How to Approach It' },
  items: items('listening-full-019', ['q17', 'q18']),
  reasons: 'listening-multiple-answer',
};

const CHECK_B: FocusedExercise = {
  id: 'listening-multiple-answer-check-b',
  subskill: 'multiple-answer',
  paper: 'listening',
  role: 'independent-check',
  title: 'Multiple Answer: second independent check',
  objective:
    'Show on a second recording you have not heard that you can choose the right number of confirmed options on your own.',
  expectedMinutes: 5,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-019',
    partIndex: 1,
    groupIndex: 2,
    drillId: 'listening-full-019-drill-p2',
    attribution: 'IELTS Listening Test 19, Part 2, Questions 19 to 20.',
  },
  lesson: { key: 'listening-multiple-choice', blockHeading: 'How to Approach It' },
  items: items('listening-full-019', ['q19', 'q20']),
  reasons: 'listening-multiple-answer',
};

export const LISTENING_MULTIPLE_ANSWER: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
