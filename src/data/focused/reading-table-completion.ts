/* Reading, Table Completion (WP18a, 2026-09-22). See the header of
 * reading-tfng.ts for the shared rules this file follows, and the header of
 * reading-sentence-completion.ts for the free-text rendering both types
 * share.
 *
 * Every real table completion group in the library is printed as a grid
 * (`group.table`), not as `before`/`after` text on each question. Rather
 * than reproduce that grid as a second interactive widget, this exercise
 * shows the publisher's own table read-only, via `legendHtml` (exactly the
 * same field Pilot A already renders as reference material, and exactly
 * what a student would see printed on the real paper), and answers it with
 * the same numbered free-text items sentence completion uses underneath.
 * `before`/`after` are set to empty strings for a table completion item, in
 * src/pages/trainers/focused/[id].astro, which is what actually selects the
 * free-text render for this type: the check is "does this item carry
 * before/after", never "is this item's subskill table-completion".
 *
 * The reserved papers (reading-full-029, reading-full-037) contain no table
 * completion group at all, so two more are reserved here for the two
 * checks: reading-full-003 and reading-full-015 (RESERVED_CHECK_PAPER_IDS
 * is derived from the checks below, never hand-listed). reading-full-003
 * also hosts the second Yes / No / Not Given check
 * (reading-yes-no-notgiven.ts) and reading-full-015 also hosts both
 * multiple answer checks (reading-multiple-answer.ts), rather than a third
 * and fourth paper being reserved for those.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'reading-table-completion-guided',
  subskill: 'table-completion',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Table Completion: guided practice',
  objective: 'Complete a table, note or summary with the exact words from the passage, inside the stated word limit.',
  expectedMinutes: 13,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-040',
    partIndex: 1,
    groupIndex: 0,
    drillId: 'reading-full-040-drill-p2',
    attribution: 'Academic Reading Test 40, Passage 2, Questions 14 to 21.',
  },
  lesson: { key: 'reading-summary-completion', blockHeading: 'How to Approach It' },
  items: items('reading-full-040', ['q14', 'q15', 'q16', 'q17', 'q18', 'q19', 'q20', 'q21']),
  reasons: 'table-completion',
};

const GUIDED_B: FocusedExercise = {
  id: 'reading-table-completion-guided-2',
  subskill: 'table-completion',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Table Completion: more guided practice',
  objective: 'Complete a table, note or summary with the exact words from the passage, inside the stated word limit.',
  expectedMinutes: 10,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-036',
    partIndex: 1,
    groupIndex: 0,
    drillId: 'reading-full-036-drill-p2',
    attribution: 'Academic Reading Test 36, Passage 2, Questions 14 to 19.',
  },
  lesson: { key: 'reading-summary-completion', blockHeading: 'How to Approach It' },
  items: items('reading-full-036', ['q14', 'q15', 'q16', 'q17', 'q18', 'q19']),
  reasons: 'table-completion',
};

const CHECK_A: FocusedExercise = {
  id: 'reading-table-completion-check-a',
  subskill: 'table-completion',
  paper: 'reading',
  role: 'independent-check',
  title: 'Table Completion: independent check',
  objective: 'Show on a passage you have not seen that you can complete a table with words taken straight from the passage, on your own.',
  expectedMinutes: 8,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-003',
    partIndex: 0,
    groupIndex: 0,
    drillId: 'reading-full-003-drill-p1',
    attribution: 'Academic Reading Test 3, Passage 1, Questions 1 to 5.',
  },
  lesson: { key: 'reading-summary-completion', blockHeading: 'How to Approach It' },
  items: items('reading-full-003', ['q1', 'q2', 'q3', 'q4', 'q5']),
  reasons: 'table-completion',
};

const CHECK_B: FocusedExercise = {
  id: 'reading-table-completion-check-b',
  subskill: 'table-completion',
  paper: 'reading',
  role: 'independent-check',
  title: 'Table Completion: second independent check',
  objective: 'Show on a second unseen passage that you can complete a table with words taken straight from the passage, on your own.',
  expectedMinutes: 11,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-015',
    partIndex: 0,
    groupIndex: 0,
    drillId: 'reading-full-015-drill-p1',
    attribution: 'Academic Reading Test 15, Passage 1, Questions 1 to 7.',
  },
  lesson: { key: 'reading-summary-completion', blockHeading: 'How to Approach It' },
  items: items('reading-full-015', ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']),
  reasons: 'table-completion',
};

export const READING_TABLE_COMPLETION: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
