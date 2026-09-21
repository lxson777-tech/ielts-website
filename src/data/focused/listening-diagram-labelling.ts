/* Listening, Diagram (and Plan/Map) Labelling (WP18b/WP19, 2026-09-22).
 * See the header of listening-sentence-completion.ts for the shared
 * rules: real publisher material only, checks drawn from the three
 * reserved papers (listening-full-008, listening-full-009,
 * listening-full-019). Diagram labelling is the rarest Listening type in
 * the library (23 questions in 7 papers, one group per paper), so this
 * file and its two guided sets between them use four of the seven groups
 * that exist; the other three stay free for later material.
 */

import { paperItemId } from '../../lib/learning/evidence';
import type { FocusedExercise, FocusedExerciseItem } from '../focused-exercises';

function items(testId: string, questionIds: readonly string[]): readonly FocusedExerciseItem[] {
  return questionIds.map((questionId) => ({ id: paperItemId(testId, questionId), questionId }));
}

const GUIDED_A: FocusedExercise = {
  id: 'listening-diagram-labelling-guided',
  subskill: 'diagram-labelling',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Diagram Labelling: guided practice',
  objective: 'Label a plan or diagram using the direction words that fix each position, not just the object named.',
  expectedMinutes: 7,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-012',
    partIndex: 3,
    groupIndex: 0,
    drillId: 'listening-full-012-drill-p4',
    attribution: 'IELTS Listening Test 12, Part 4, Questions 31 to 34.',
  },
  lesson: { key: 'listening-map-labelling', blockHeading: 'How to Approach It' },
  items: items('listening-full-012', ['q31', 'q32', 'q33', 'q34']),
  reasons: 'listening-diagram-labelling',
};

const GUIDED_B: FocusedExercise = {
  id: 'listening-diagram-labelling-guided-2',
  subskill: 'diagram-labelling',
  paper: 'listening',
  role: 'guided-practice',
  title: 'Diagram Labelling: more guided practice',
  objective: 'Label a plan or diagram using the direction words that fix each position, not just the object named.',
  expectedMinutes: 8,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-029',
    partIndex: 0,
    groupIndex: 1,
    drillId: 'listening-full-029-drill-p1',
    attribution: 'IELTS Listening Test 29, Part 1, Questions 6 to 10.',
  },
  lesson: { key: 'listening-map-labelling', blockHeading: 'How to Approach It' },
  items: items('listening-full-029', ['q6', 'q7', 'q8', 'q9', 'q10']),
  reasons: 'listening-diagram-labelling',
};

const CHECK_A: FocusedExercise = {
  id: 'listening-diagram-labelling-check-a',
  subskill: 'diagram-labelling',
  paper: 'listening',
  role: 'independent-check',
  title: 'Diagram Labelling: independent check',
  objective: 'Show on a recording you have not heard that you can label a diagram from direction words alone.',
  expectedMinutes: 5,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-008',
    partIndex: 1,
    groupIndex: 1,
    drillId: 'listening-full-008-drill-p2',
    attribution: 'IELTS Listening Test 8, Part 2, Questions 15 to 17.',
  },
  lesson: { key: 'listening-map-labelling', blockHeading: 'How to Approach It' },
  items: items('listening-full-008', ['q15', 'q16', 'q17']),
  reasons: 'listening-diagram-labelling',
};

const CHECK_B: FocusedExercise = {
  id: 'listening-diagram-labelling-check-b',
  subskill: 'diagram-labelling',
  paper: 'listening',
  role: 'independent-check',
  title: 'Diagram Labelling: second independent check',
  objective: 'Show on a second recording you have not heard that you can label a diagram from direction words alone.',
  expectedMinutes: 5,
  provenance: 'imported-paper',
  source: {
    testId: 'listening-full-009',
    partIndex: 2,
    groupIndex: 1,
    drillId: 'listening-full-009-drill-p3',
    attribution: 'IELTS Listening Test 9, Part 3, Questions 23 to 25.',
  },
  lesson: { key: 'listening-map-labelling', blockHeading: 'How to Approach It' },
  items: items('listening-full-009', ['q23', 'q24', 'q25']),
  reasons: 'listening-diagram-labelling',
};

export const LISTENING_DIAGRAM_LABELLING: readonly FocusedExercise[] = [GUIDED_A, GUIDED_B, CHECK_A, CHECK_B];
