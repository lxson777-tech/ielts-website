/* Reading, Sentence Completion (WP18a, 2026-09-22). See the header of
 * reading-tfng.ts for the shared rules this file follows.
 *
 * A typed answer, not a choice from a list: every group below is one whose
 * questions carry `before`/`after` (the sentence either side of the gap),
 * which is what tells src/pages/trainers/focused/[id].astro and
 * FocusedExercise.tsx to render a text input rather than a select, and the
 * group's own `wordLimit` is carried through to the same free-text item so
 * the student sees the stated limit next to the box.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'reading-sentence-completion-guided',
  subskill: 'sentence-completion',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Sentence Completion: guided practice',
  objective: 'Fill a gap with the exact words from the passage, inside the stated word limit.',
  expectedMinutes: 11,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-014',
    partIndex: 2,
    groupIndex: 0,
    drillId: 'reading-full-014-drill-p3',
    attribution: 'Academic Reading Test 14, Passage 3, Questions 27 to 32.',
  },
  lesson: { key: 'reading-sentence', blockHeading: 'How to Approach It' },
  items: items('reading-full-014', ['q27', 'q28', 'q29', 'q30', 'q31', 'q32']),
  reasons: 'sentence-completion',
};

const GUIDED_B: FocusedExercise = {
  id: 'reading-sentence-completion-guided-2',
  subskill: 'sentence-completion',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Sentence Completion: more guided practice',
  objective: 'Fill a gap with the exact words from the passage, inside the stated word limit.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-024',
    partIndex: 1,
    groupIndex: 1,
    drillId: 'reading-full-024-drill-p2',
    attribution: 'Academic Reading Test 24, Passage 2, Questions 18 to 22.',
  },
  lesson: { key: 'reading-sentence', blockHeading: 'How to Approach It' },
  items: items('reading-full-024', ['q18', 'q19', 'q20', 'q21', 'q22']),
  reasons: 'sentence-completion',
};

const CHECK_A: FocusedExercise = {
  id: 'reading-sentence-completion-check-a',
  subskill: 'sentence-completion',
  paper: 'reading',
  role: 'independent-check',
  title: 'Sentence Completion: independent check',
  objective: 'Show on a passage you have not seen that you can complete a sentence with words taken straight from the passage, on your own.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-029',
    partIndex: 1,
    groupIndex: 2,
    drillId: 'reading-full-029-drill-p2',
    attribution: 'Academic Reading Test 29, Passage 2, Questions 22 to 26.',
  },
  lesson: { key: 'reading-sentence', blockHeading: 'How to Approach It' },
  items: items('reading-full-029', ['q22', 'q23', 'q24', 'q25', 'q26']),
  reasons: 'sentence-completion',
};

const CHECK_B: FocusedExercise = {
  id: 'reading-sentence-completion-check-b',
  subskill: 'sentence-completion',
  paper: 'reading',
  role: 'independent-check',
  title: 'Sentence Completion: second independent check',
  objective: 'Show on a second unseen passage that you can complete a sentence with words taken straight from the passage, on your own.',
  expectedMinutes: 9,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-037',
    partIndex: 0,
    groupIndex: 1,
    drillId: 'reading-full-037-drill-p1',
    attribution: 'Academic Reading Test 37, Passage 1, Questions 6 to 10.',
  },
  lesson: { key: 'reading-sentence', blockHeading: 'How to Approach It' },
  items: items('reading-full-037', ['q6', 'q7', 'q8', 'q9', 'q10']),
  reasons: 'sentence-completion',
};

export const READING_SENTENCE_COMPLETION: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
