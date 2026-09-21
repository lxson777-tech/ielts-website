/* Task 1, selecting and grouping key features: the second Task 1 detail
 * paragraph problem, alongside the overview pilot.
 *
 * A student who has learned to write an overview still has to decide, for
 * the two detail paragraphs, which two or three features of the visual are
 * worth reporting at all and which ones belong together. A table with eight
 * rows and four columns has thirty two numbers in it; a report that walks
 * through all of them is not what the descriptor asks for, and it is a
 * different problem from the overview's "state the shape, leave out the
 * detail". This teaches the selecting-and-grouping move on its own, before
 * the detail paragraph has to also carry accurate data language.
 *
 * Real exam prompts and models only, reused with the publisher's permission
 * confirmed on 11 September 2026 (see writing-task1-overview.ts). The
 * guided task is a table, which has the most numbers to choose from; the
 * check transfers the same move to a chart.
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Report the two or three most significant features of the visual, grouping related figures together, rather than describing every number in turn.';

const LESSON = { key: 'writing-method', blockHeading: 'The Four Paragraphs' } as const;

const RULES = {
  minWords: 30,
  maxWords: 80,
  checks: ['has-figures', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'It does not work through the table row by row. It picks out the two or three rows that stand out and reports those.',
  'Figures that belong together sit in the same sentence, rather than one sentence per number.',
  'Every figure it gives is one of the ones it chose to report, never a passing mention of something it is not really about.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-select-key-features-guided',
  subskill: 'task1-select-key-features',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 1 key features: guided practice',
  objective: OBJECTIVE,
  instruction:
    'Look at the table and write one paragraph naming the two or three features that are actually worth reporting, grouping the related ones together. Leave the rest out.',
  expectedMinutes: 8,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-125-task1', task: 'task1', form: 'table', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 2,
  guidingQuestions: [
    'Which two or three numbers in this table are the most striking, either because they are the highest, the lowest, or the ones that changed the most?',
    'Which of those belong together, so they can share one sentence rather than one each?',
    'Is there a whole row or column you can leave out completely because nothing in it stands out?',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-select-key-features-check',
  subskill: 'task1-select-key-features',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 1 key features: independent check',
  objective: OBJECTIVE,
  instruction:
    'A chart you have not seen. Write one paragraph naming the two or three features worth reporting, on your own: no guiding questions, no model, no Mr EZ.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-124-task1', task: 'task1', form: 'chart', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 2,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK1_SELECT_KEY_FEATURES: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
