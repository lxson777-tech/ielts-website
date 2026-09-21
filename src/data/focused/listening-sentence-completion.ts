/* Listening, Sentence Completion (WP18b/WP19, 2026-09-22).
 *
 * Real publisher questions lifted from papers already in the library, same
 * rule as Pilot A: nothing here is written by this project except which
 * group to open. The audio itself is never copied or re-encoded; the page
 * that renders this (src/pages/trainers/focused/[id].astro) streams the
 * part's own segment from the same recording file the full paper and the
 * drill already use.
 *
 * TWO ARE FOR PRACTICE, TWO ARE HELD BACK
 * The guided sets are worked with hints, replay and an evidence line, so
 * they can never show what a student can do alone. The two checks are the
 * opposite, and their papers (listening-full-008, listening-full-009,
 * listening-full-019) are reserved for every Listening type this package
 * authors: see the builder report for the full table of which type uses
 * which reserved group, and why those three papers between them cover all
 * seven types with real material.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'listening-sentence-completion-guided',
  subskill: 'sentence-completion',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Sentence Completion: guided practice',
  objective: 'Fill each gap with the exact words you hear, and catch it when the speaker corrects themselves.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-001',
    partIndex: 0,
    groupIndex: 0,
    drillId: 'listening-full-001-drill-p1',
    attribution: 'IELTS Listening Test 1, Part 1, Questions 1 to 5.',
  },
  lesson: { key: 'listening-sentence-completion', blockHeading: 'How to Approach It' },
  items: items('listening-full-001', ['q1', 'q2', 'q3', 'q4', 'q5']),
  reasons: 'listening-sentence-completion',
};

const GUIDED_B: FocusedExercise = {
  id: 'listening-sentence-completion-guided-2',
  subskill: 'sentence-completion',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Sentence Completion: more guided practice',
  objective: 'Fill each gap with the exact words you hear, and catch it when the speaker corrects themselves.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-006',
    partIndex: 1,
    groupIndex: 1,
    drillId: 'listening-full-006-drill-p2',
    attribution: 'IELTS Listening Test 6, Part 2, Questions 16 to 20.',
  },
  lesson: { key: 'listening-sentence-completion', blockHeading: 'How to Approach It' },
  items: items('listening-full-006', ['q16', 'q17', 'q18', 'q19', 'q20']),
  reasons: 'listening-sentence-completion',
};

const CHECK_A: FocusedExercise = {
  id: 'listening-sentence-completion-check-a',
  subskill: 'sentence-completion',
  paper: 'listening',
  role: 'independent-check',
  title: 'Sentence Completion: independent check',
  objective:
    'Show on a recording you have not heard that you can complete sentences with the exact words, inside the word limit.',
  expectedMinutes: 7,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-009',
    partIndex: 0,
    groupIndex: 2,
    drillId: 'listening-full-009-drill-p1',
    attribution: 'IELTS Listening Test 9, Part 1, Questions 6 to 10.',
  },
  lesson: { key: 'listening-sentence-completion', blockHeading: 'How to Approach It' },
  items: items('listening-full-009', ['q6', 'q7', 'q8', 'q9', 'q10']),
  reasons: 'listening-sentence-completion',
};

const CHECK_B: FocusedExercise = {
  id: 'listening-sentence-completion-check-b',
  subskill: 'sentence-completion',
  paper: 'listening',
  role: 'independent-check',
  title: 'Sentence Completion: second independent check',
  objective:
    'Show on a second recording you have not heard that you can complete sentences with the exact words, inside the word limit.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-008',
    partIndex: 0,
    groupIndex: 1,
    drillId: 'listening-full-008-drill-p1',
    attribution: 'IELTS Listening Test 8, Part 1, Questions 7 to 10.',
  },
  lesson: { key: 'listening-sentence-completion', blockHeading: 'How to Approach It' },
  items: items('listening-full-008', ['q7', 'q8', 'q9', 'q10']),
  reasons: 'listening-sentence-completion',
};

export const LISTENING_SENTENCE_COMPLETION: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
