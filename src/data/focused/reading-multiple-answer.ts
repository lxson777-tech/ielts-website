/* Reading, Multiple Answer (WP18a, 2026-09-22). See the header of
 * reading-tfng.ts for the shared rules this file follows.
 *
 * SIZE NOTE: every real Reading multiple answer group is a PAIR, two
 * numbered questions sharing one "choose two from five" pool
 * (schema.ts's answerPairId), never a group of five to eight the way every
 * other type in this package is. That is the real shape of the material,
 * not a shortcut taken here: the schema's own union has no wider Reading
 * multiple answer group anywhere in the 40 papers (see the builder
 * report). tests/pilot-matching-headings.test.ts's item-count floor is
 * loosened for this one subskill for exactly this reason (see that file's
 * own comment on the change).
 *
 * Both items of a pair carry the SAME accepted array (e.g. ["C", "D"]):
 * src/pages/trainers/focused/[id].astro keeps `answer` as that array rather
 * than collapsing it to one value, and focused-exercise.ts's isCorrect()
 * accepts either slot naming either accepted value, which is what "either
 * distinct correct selection earns one mark, regardless of which slot
 * contains it" (schema.ts's own words for answerPairId) means in practice.
 * The shared choice pool (group.choices) becomes each item's own `options`
 * (letter and label together), the same per-item mechanism Multiple Choice
 * uses, because a Reading multiple answer pair is exactly a multiple
 * choice question answered twice against one five-or-so option list.
 *
 * The reserved papers hold no multiple answer group at all, so two more are
 * reserved here: reading-full-003 and reading-full-015. reading-full-003
 * also hosts the second Yes / No / Not Given check
 * (reading-yes-no-notgiven.ts) and one Table Completion check
 * (reading-table-completion.ts); reading-full-015 hosts the other Table
 * Completion check. One reservation per paper covers every type that needs
 * it from that paper, rather than a new paper for each.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'reading-multiple-answer-guided',
  subskill: 'multiple-answer',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Multiple Answer: guided practice',
  objective: 'Choose the two correct statements from a longer list, checking every option against the passage.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-013',
    partIndex: 1,
    groupIndex: 2,
    drillId: 'reading-full-013-drill-p2',
    attribution: 'Academic Reading Test 13, Passage 2, Questions 24 to 26.',
  },
  lesson: { key: 'reading-mc', blockHeading: 'How to Approach It' },
  items: items('reading-full-013', ['q24', 'q25', 'q26']),
  reasons: 'multiple-answer',
};

const GUIDED_B: FocusedExercise = {
  id: 'reading-multiple-answer-guided-2',
  subskill: 'multiple-answer',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Multiple Answer: more guided practice',
  objective: 'Choose the two correct statements from a longer list, checking every option against the passage.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-014',
    partIndex: 0,
    groupIndex: 0,
    drillId: 'reading-full-014-drill-p1',
    attribution: 'Academic Reading Test 14, Passage 1, Questions 1 to 3.',
  },
  lesson: { key: 'reading-mc', blockHeading: 'How to Approach It' },
  items: items('reading-full-014', ['q1', 'q2', 'q3']),
  reasons: 'multiple-answer',
};

const CHECK_A: FocusedExercise = {
  id: 'reading-multiple-answer-check-a',
  subskill: 'multiple-answer',
  paper: 'reading',
  role: 'independent-check',
  title: 'Multiple Answer: independent check',
  objective: 'Show on a passage you have not seen that you can choose the correct statements from a list, on your own.',
  expectedMinutes: 4,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-003',
    partIndex: 1,
    groupIndex: 1,
    drillId: 'reading-full-003-drill-p2',
    attribution: 'Academic Reading Test 3, Passage 2, Questions 20 to 21.',
  },
  lesson: { key: 'reading-mc', blockHeading: 'How to Approach It' },
  items: items('reading-full-003', ['q20', 'q21']),
  reasons: 'multiple-answer',
};

const CHECK_B: FocusedExercise = {
  id: 'reading-multiple-answer-check-b',
  subskill: 'multiple-answer',
  paper: 'reading',
  role: 'independent-check',
  title: 'Multiple Answer: second independent check',
  objective: 'Show on a second unseen passage that you can choose the correct statements from a list, on your own.',
  expectedMinutes: 4,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-015',
    partIndex: 2,
    groupIndex: 2,
    drillId: 'reading-full-015-drill-p3',
    attribution: 'Academic Reading Test 15, Passage 3, Questions 39 to 40.',
  },
  lesson: { key: 'reading-mc', blockHeading: 'How to Approach It' },
  items: items('reading-full-015', ['q39', 'q40']),
  reasons: 'multiple-answer',
};

export const READING_MULTIPLE_ANSWER: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
