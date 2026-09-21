/* Listening, Table Completion (form, note, table and flow-chart questions;
 * WP18b/WP19, 2026-09-22). See the header of
 * listening-sentence-completion.ts for the shared rules: real publisher
 * material only, checks drawn from the three reserved papers
 * (listening-full-008, listening-full-009, listening-full-019). The
 * schema has no separate "form" or "note" question type: imported data
 * represents a single running-text blank as sentence-completion and a grid
 * of blanks as table-completion (see src/data/listening-strategies.ts), so
 * this file teaches the grid case: forms, notes laid out as a table, tables
 * and flow charts.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'listening-table-completion-guided',
  subskill: 'table-completion',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Table Completion: guided practice',
  objective: 'Complete a table, form or set of notes with the exact words you hear, inside the word limit.',
  expectedMinutes: 8,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-010',
    partIndex: 1,
    groupIndex: 2,
    drillId: 'listening-full-010-drill-p2',
    attribution: 'IELTS Listening Test 10, Part 2, Questions 16 to 20.',
  },
  lesson: { key: 'listening-form-completion', blockHeading: 'How to Approach It' },
  items: items('listening-full-010', ['q16', 'q17', 'q18', 'q19', 'q20']),
  reasons: 'listening-table-completion',
};

const GUIDED_B: FocusedExercise = {
  id: 'listening-table-completion-guided-2',
  subskill: 'table-completion',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Table Completion: more guided practice',
  objective: 'Complete a table, form or set of notes with the exact words you hear, inside the word limit.',
  expectedMinutes: 7,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-017',
    partIndex: 1,
    groupIndex: 1,
    drillId: 'listening-full-017-drill-p2',
    attribution: 'IELTS Listening Test 17, Part 2, Questions 17 to 20.',
  },
  lesson: { key: 'listening-form-completion', blockHeading: 'How to Approach It' },
  items: items('listening-full-017', ['q17', 'q18', 'q19', 'q20']),
  reasons: 'listening-table-completion',
};

const CHECK_A: FocusedExercise = {
  id: 'listening-table-completion-check-a',
  subskill: 'table-completion',
  paper: 'listening',
  role: 'independent-check',
  title: 'Table Completion: independent check',
  objective:
    'Show on a recording you have not heard that you can complete a table or form with the exact words, inside the word limit.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-008',
    partIndex: 2,
    groupIndex: 2,
    drillId: 'listening-full-008-drill-p3',
    attribution: 'IELTS Listening Test 8, Part 3, Questions 27 to 30.',
  },
  lesson: { key: 'listening-form-completion', blockHeading: 'How to Approach It' },
  items: items('listening-full-008', ['q27', 'q28', 'q29', 'q30']),
  reasons: 'listening-table-completion',
};

const CHECK_B: FocusedExercise = {
  id: 'listening-table-completion-check-b',
  subskill: 'table-completion',
  paper: 'listening',
  role: 'independent-check',
  title: 'Table Completion: second independent check',
  objective:
    'Show on a second recording you have not heard that you can complete a table or form with the exact words, inside the word limit.',
  expectedMinutes: 5,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-009',
    partIndex: 0,
    groupIndex: 1,
    drillId: 'listening-full-009-drill-p1',
    attribution: 'IELTS Listening Test 9, Part 1, Questions 3 to 5.',
  },
  lesson: { key: 'listening-form-completion', blockHeading: 'How to Approach It' },
  items: items('listening-full-009', ['q3', 'q4', 'q5']),
  reasons: 'listening-table-completion',
};

export const LISTENING_TABLE_COMPLETION: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
