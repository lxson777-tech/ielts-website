/* Reading, Matching Features (WP18a, 2026-09-22). See the header of
 * reading-tfng.ts for the shared rules this file follows.
 *
 * Matching Features prints its own shared list of people, places or things
 * as `group.options` (the same shape Pilot A's Matching Headings uses), so
 * this type needs no change to how the exercise is resolved or rendered.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'reading-matching-features-guided',
  subskill: 'matching-features',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Matching Features: guided practice',
  objective: 'Match a statement to the person, place or thing it belongs to, not to the one mentioned nearest it.',
  expectedMinutes: 11,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-004',
    partIndex: 2,
    groupIndex: 1,
    drillId: 'reading-full-004-drill-p3',
    attribution: 'Academic Reading Test 4, Passage 3, Questions 31 to 36.',
  },
  lesson: { key: 'reading-matching-features', blockHeading: 'How to Approach It' },
  items: items('reading-full-004', ['q31', 'q32', 'q33', 'q34', 'q35', 'q36']),
  reasons: 'matching-features',
};

const GUIDED_B: FocusedExercise = {
  id: 'reading-matching-features-guided-2',
  subskill: 'matching-features',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Matching Features: more guided practice',
  objective: 'Match a statement to the person, place or thing it belongs to, not to the one mentioned nearest it.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-005',
    partIndex: 2,
    groupIndex: 1,
    drillId: 'reading-full-005-drill-p3',
    attribution: 'Academic Reading Test 5, Passage 3, Questions 32 to 36.',
  },
  lesson: { key: 'reading-matching-features', blockHeading: 'How to Approach It' },
  items: items('reading-full-005', ['q32', 'q33', 'q34', 'q35', 'q36']),
  reasons: 'matching-features',
};

const CHECK_A: FocusedExercise = {
  id: 'reading-matching-features-check-a',
  subskill: 'matching-features',
  paper: 'reading',
  role: 'independent-check',
  title: 'Matching Features: independent check',
  objective: 'Show on a passage you have not seen that you can match statements to the right person, place or thing on your own.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-029',
    partIndex: 1,
    groupIndex: 1,
    drillId: 'reading-full-029-drill-p2',
    attribution: 'Academic Reading Test 29, Passage 2, Questions 17 to 21.',
  },
  lesson: { key: 'reading-matching-features', blockHeading: 'How to Approach It' },
  items: items('reading-full-029', ['q17', 'q18', 'q19', 'q20', 'q21']),
  reasons: 'matching-features',
};

const CHECK_B: FocusedExercise = {
  id: 'reading-matching-features-check-b',
  subskill: 'matching-features',
  paper: 'reading',
  role: 'independent-check',
  title: 'Matching Features: second independent check',
  objective: 'Show on a second unseen passage that you can match statements to the right person, place or thing on your own.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-037',
    partIndex: 2,
    groupIndex: 2,
    drillId: 'reading-full-037-drill-p3',
    attribution: 'Academic Reading Test 37, Passage 3, Questions 36 to 40.',
  },
  lesson: { key: 'reading-matching-features', blockHeading: 'How to Approach It' },
  items: items('reading-full-037', ['q36', 'q37', 'q38', 'q39', 'q40']),
  reasons: 'matching-features',
};

export const READING_MATCHING_FEATURES: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
