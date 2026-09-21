/* Reading, Matching Headings: the first end to end teaching flow.
 *
 * Three exercises, all of them real publisher questions lifted from papers
 * already in the library (IELTS MASTER / PracticePTEOnline, reused with
 * permission confirmed by Alex on 11 September 2026). Nothing here is
 * written by this project: only which group to open is.
 *
 * ONE IS FOR PRACTICE, TWO ARE HELD BACK
 * The guided set is worked with hints, explanations and a correction
 * attempt, so it can never show what a student can do alone. The two checks
 * are the opposite, and their papers are reserved: the catalogue marks
 * reading-full-029 and reading-full-037 as check material so an ordinary
 * practice drill cannot spend them first. Two of them, because a student
 * who needs a second unseen check a week later must still have one.
 *
 * WHY THESE PAPERS
 * Every paper the audit's Matching Headings student has already met is
 * avoided: reading-full-001 to 003 (papers they sat), 006 and 014 (the
 * lesson check quotes both), 013 (the drill they did). The three below are
 * unseen for that student, each has its whole headings set in one group,
 * and each question carries the publisher's own explanation and the
 * sentence in the passage that decides it.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

/** The shared identity rule, applied here rather than imported from the
    registry above so that the two files have no runtime cycle between
    them: an item's id is the one the paper and the drill already use for
    that very question. */
function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

/** Six headings against the seven sections of "Homeopathy", Academic
    Reading Test 20, Passage 2. The guided set: hints are available, every
    wrong answer is talked through, and a second go is recorded as a retry. */
const GUIDED: FocusedExercise = {
  id: 'reading-matching-headings-guided',
  subskill: 'matching-headings',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Matching Headings: guided practice',
  objective: 'Match a heading to a paragraph by what the whole paragraph is about, not by a word it repeats.',
  expectedMinutes: 12,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-020',
    partIndex: 1,
    groupIndex: 0,
    drillId: 'reading-full-020-drill-p2',
    attribution: 'Academic Reading Test 20, Passage 2, Questions 14 to 19.',
  },
  lesson: { key: 'reading-headings', blockHeading: 'How to Approach It' },
  items: items('reading-full-020', ['q14', 'q15', 'q16', 'q17', 'q18', 'q19']),
  reasons: 'matching-headings',
};

/** Six headings against "Toxic Stress", Academic Reading Test 29, Passage
    1. Reserved: no hints, no explanations until it is over, no tutor. */
const CHECK_A: FocusedExercise = {
  id: 'reading-matching-headings-check-a',
  subskill: 'matching-headings',
  paper: 'reading',
  role: 'independent-check',
  title: 'Matching Headings: independent check',
  objective: 'Show on a passage you have not seen that you can match headings to paragraphs on your own.',
  expectedMinutes: 8,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-029',
    partIndex: 0,
    groupIndex: 0,
    drillId: 'reading-full-029-drill-p1',
    attribution: 'Academic Reading Test 29, Passage 1, Questions 1 to 6.',
  },
  lesson: { key: 'reading-headings', blockHeading: 'How to Approach It' },
  items: items('reading-full-029', ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']),
  reasons: 'matching-headings',
};

/** Five headings against "Thomas Harriot", Academic Reading Test 37,
    Passage 1. The second reserved check, for the student who needs to show
    it again on material they have still never met. */
const CHECK_B: FocusedExercise = {
  id: 'reading-matching-headings-check-b',
  subskill: 'matching-headings',
  paper: 'reading',
  role: 'independent-check',
  title: 'Matching Headings: second independent check',
  objective: 'Show on a second unseen passage that you can match headings to paragraphs on your own.',
  expectedMinutes: 8,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-037',
    partIndex: 0,
    groupIndex: 0,
    drillId: 'reading-full-037-drill-p1',
    attribution: 'Academic Reading Test 37, Passage 1, Questions 1 to 5.',
  },
  lesson: { key: 'reading-headings', blockHeading: 'How to Approach It' },
  items: items('reading-full-037', ['q1', 'q2', 'q3', 'q4', 'q5']),
  reasons: 'matching-headings',
};

export const READING_MATCHING_HEADINGS: readonly FocusedExercise[] = [GUIDED, CHECK_A, CHECK_B];
