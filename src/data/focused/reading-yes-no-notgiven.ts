/* Reading, Yes / No / Not Given (WP18a, 2026-09-22). See the header of
 * reading-tfng.ts for the shared rules this file follows.
 *
 * Yes / No / Not Given has no printed options either, for the same reason
 * True / False / Not Given does not: src/pages/trainers/focused/[id].astro
 * supplies the fixed three-way list, the same exception TestPlayer.tsx
 * already makes for this type.
 *
 * The reserved papers hold only one Yes / No / Not Given group between them
 * (reading-full-029), so a second paper is reserved for the second check:
 * reading-full-003. It is reserved for exactly the reason Pilot A's own
 * papers are, and for no other: RESERVED_CHECK_PAPER_IDS in
 * focused-exercises.ts is derived from the checks below, never hand-listed,
 * so this file is the one place that decides it. reading-full-003 also
 * hosts one table completion check and one multiple answer check
 * (reading-table-completion.ts, reading-multiple-answer.ts) rather than a
 * third and fourth paper being reserved for those, since one reservation
 * covers every type that needs it from the same paper.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'reading-yes-no-notgiven-guided',
  subskill: 'yes-no-notgiven',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Yes / No / Not Given: guided practice',
  objective: "Decide whether a statement matches the writer's opinion, and tell that apart from a fact the passage never gives.",
  expectedMinutes: 11,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-002',
    partIndex: 2,
    groupIndex: 2,
    drillId: 'reading-full-002-drill-p3',
    attribution: 'Academic Reading Test 2, Passage 3, Questions 35 to 40.',
  },
  lesson: { key: 'reading-ynng', blockHeading: 'How to Approach It' },
  items: items('reading-full-002', ['q35', 'q36', 'q37', 'q38', 'q39', 'q40']),
  reasons: 'yes-no-notgiven',
};

const GUIDED_B: FocusedExercise = {
  id: 'reading-yes-no-notgiven-guided-2',
  subskill: 'yes-no-notgiven',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Yes / No / Not Given: more guided practice',
  objective: "Decide whether a statement matches the writer's opinion, and tell that apart from a fact the passage never gives.",
  expectedMinutes: 12,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-017',
    partIndex: 0,
    groupIndex: 2,
    drillId: 'reading-full-017-drill-p1',
    attribution: 'Academic Reading Test 17, Passage 1, Questions 7 to 13.',
  },
  lesson: { key: 'reading-ynng', blockHeading: 'How to Approach It' },
  items: items('reading-full-017', ['q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13']),
  reasons: 'yes-no-notgiven',
};

const CHECK_A: FocusedExercise = {
  id: 'reading-yes-no-notgiven-check-a',
  subskill: 'yes-no-notgiven',
  paper: 'reading',
  role: 'independent-check',
  title: 'Yes / No / Not Given: independent check',
  objective: "Show on a passage you have not seen that you can decide Yes, No or Not Given on your own.",
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-029',
    partIndex: 2,
    groupIndex: 1,
    drillId: 'reading-full-029-drill-p3',
    attribution: 'Academic Reading Test 29, Passage 3, Questions 33 to 36.',
  },
  lesson: { key: 'reading-ynng', blockHeading: 'How to Approach It' },
  items: items('reading-full-029', ['q33', 'q34', 'q35', 'q36']),
  reasons: 'yes-no-notgiven',
};

const CHECK_B: FocusedExercise = {
  id: 'reading-yes-no-notgiven-check-b',
  subskill: 'yes-no-notgiven',
  paper: 'reading',
  role: 'independent-check',
  title: 'Yes / No / Not Given: second independent check',
  objective: 'Show on a second unseen passage that you can decide Yes, No or Not Given on your own.',
  expectedMinutes: 6,
  provenance: 'imported-paper',
  source: {
    testId: 'reading-full-003',
    partIndex: 2,
    groupIndex: 2,
    drillId: 'reading-full-003-drill-p3',
    attribution: 'Academic Reading Test 3, Passage 3, Questions 36 to 39.',
  },
  lesson: { key: 'reading-ynng', blockHeading: 'How to Approach It' },
  items: items('reading-full-003', ['q36', 'q37', 'q38', 'q39']),
  reasons: 'yes-no-notgiven',
};

export const READING_YES_NO_NOTGIVEN: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
