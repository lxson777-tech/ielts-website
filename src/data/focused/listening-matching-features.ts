/* Listening, Matching Features (people, places, services from a shared
 * list; WP18b/WP19, 2026-09-22). See the header of
 * listening-sentence-completion.ts for the shared rules: real publisher
 * material only, checks drawn from the three reserved papers
 * (listening-full-008, listening-full-009, listening-full-019). Both
 * checks here come from listening-full-019, which is the only reserved
 * paper carrying two separate matching-features groups; the other two
 * reserved papers cover the remaining six types (see the builder report).
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'listening-matching-features-guided',
  subskill: 'matching-features',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Matching: guided practice',
  objective: 'Match each item to the person, place or service the speaker actually settles on, not the first one mentioned.',
  expectedMinutes: 8,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-014',
    partIndex: 1,
    groupIndex: 0,
    drillId: 'listening-full-014-drill-p2',
    attribution: 'IELTS Listening Test 14, Part 2, Questions 11 to 16.',
  },
  lesson: { key: 'listening-matching', blockHeading: 'How to Approach It' },
  items: items('listening-full-014', ['q11', 'q12', 'q13', 'q14', 'q15', 'q16']),
  reasons: 'listening-matching-features',
};

const GUIDED_B: FocusedExercise = {
  id: 'listening-matching-features-guided-2',
  subskill: 'matching-features',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Matching: more guided practice',
  objective: 'Match each item to the person, place or service the speaker actually settles on, not the first one mentioned.',
  expectedMinutes: 7,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-002',
    partIndex: 1,
    groupIndex: 2,
    drillId: 'listening-full-002-drill-p2',
    attribution: 'IELTS Listening Test 2, Part 2, Questions 17 to 20.',
  },
  lesson: { key: 'listening-matching', blockHeading: 'How to Approach It' },
  items: items('listening-full-002', ['q17', 'q18', 'q19', 'q20']),
  reasons: 'listening-matching-features',
};

const CHECK_A: FocusedExercise = {
  id: 'listening-matching-features-check-a',
  subskill: 'matching-features',
  paper: 'listening',
  role: 'independent-check',
  title: 'Matching: independent check',
  objective: 'Show on a recording you have not heard that you can match items to the right person or place on your own.',
  expectedMinutes: 8,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-019',
    partIndex: 1,
    groupIndex: 0,
    drillId: 'listening-full-019-drill-p2',
    attribution: 'IELTS Listening Test 19, Part 2, Questions 11 to 16.',
  },
  lesson: { key: 'listening-matching', blockHeading: 'How to Approach It' },
  items: items('listening-full-019', ['q11', 'q12', 'q13', 'q14', 'q15', 'q16']),
  reasons: 'listening-matching-features',
};

const CHECK_B: FocusedExercise = {
  id: 'listening-matching-features-check-b',
  subskill: 'matching-features',
  paper: 'listening',
  role: 'independent-check',
  title: 'Matching: second independent check',
  objective:
    'Show on a second recording you have not heard that you can match items to the right person or place on your own.',
  expectedMinutes: 7,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-019',
    partIndex: 2,
    groupIndex: 1,
    drillId: 'listening-full-019-drill-p3',
    attribution: 'IELTS Listening Test 19, Part 3, Questions 26 to 30.',
  },
  lesson: { key: 'listening-matching', blockHeading: 'How to Approach It' },
  items: items('listening-full-019', ['q26', 'q27', 'q28', 'q29', 'q30']),
  reasons: 'listening-matching-features',
};

export const LISTENING_MATCHING_FEATURES: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
