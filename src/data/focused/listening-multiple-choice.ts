/* Listening, Multiple Choice (WP18b/WP19, 2026-09-22). See the header of
 * listening-sentence-completion.ts for the shared rules this file follows:
 * real publisher material only, checks drawn from the three reserved
 * papers (listening-full-008, listening-full-009, listening-full-019).
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'listening-multiple-choice-guided',
  subskill: 'multiple-choice',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Multiple Choice: guided practice',
  objective: 'Choose the option the recording actually confirms, and let a rejected option go.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-001',
    partIndex: 1,
    groupIndex: 0,
    drillId: 'listening-full-001-drill-p2',
    attribution: 'IELTS Listening Test 1, Part 2, Questions 11 to 13.',
  },
  lesson: { key: 'listening-multiple-choice', blockHeading: 'How to Approach It' },
  items: items('listening-full-001', ['q11', 'q12', 'q13']),
  reasons: 'listening-multiple-choice',
};

const GUIDED_B: FocusedExercise = {
  id: 'listening-multiple-choice-guided-2',
  subskill: 'multiple-choice',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Multiple Choice: more guided practice',
  objective: 'Choose the option the recording actually confirms, and let a rejected option go.',
  expectedMinutes: 7,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-002',
    partIndex: 2,
    groupIndex: 0,
    drillId: 'listening-full-002-drill-p3',
    attribution: 'IELTS Listening Test 2, Part 3, Questions 21 to 24.',
  },
  lesson: { key: 'listening-multiple-choice', blockHeading: 'How to Approach It' },
  items: items('listening-full-002', ['q21', 'q22', 'q23', 'q24']),
  reasons: 'listening-multiple-choice',
};

const CHECK_A: FocusedExercise = {
  id: 'listening-multiple-choice-check-a',
  subskill: 'multiple-choice',
  paper: 'listening',
  role: 'independent-check',
  title: 'Multiple Choice: independent check',
  objective:
    'Show on a recording you have not heard that you can choose the option the speaker confirms, not just one you recognise.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-008',
    partIndex: 1,
    groupIndex: 0,
    drillId: 'listening-full-008-drill-p2',
    attribution: 'IELTS Listening Test 8, Part 2, Questions 11 to 14.',
  },
  lesson: { key: 'listening-multiple-choice', blockHeading: 'How to Approach It' },
  items: items('listening-full-008', ['q11', 'q12', 'q13', 'q14']),
  reasons: 'listening-multiple-choice',
};

const CHECK_B: FocusedExercise = {
  id: 'listening-multiple-choice-check-b',
  subskill: 'multiple-choice',
  paper: 'listening',
  role: 'independent-check',
  title: 'Multiple Choice: second independent check',
  objective:
    'Show on a second recording you have not heard that you can choose the option the speaker confirms, not just one you recognise.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-009',
    partIndex: 3,
    groupIndex: 0,
    drillId: 'listening-full-009-drill-p4',
    attribution: 'IELTS Listening Test 9, Part 4, Questions 31 to 34.',
  },
  lesson: { key: 'listening-multiple-choice', blockHeading: 'How to Approach It' },
  items: items('listening-full-009', ['q31', 'q32', 'q33', 'q34']),
  reasons: 'listening-multiple-choice',
};

export const LISTENING_MULTIPLE_CHOICE: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
