/* Task 1, comparing rather than listing: two visuals (or two categories
 * within one visual) reported as a comparison, not as two separate lists
 * that happen to sit next to each other.
 *
 * The guided task uses a combination prompt (two visuals given together),
 * where the comparison is unavoidable; the check transfers the same move to
 * a single chart with several categories, where a student can still fall
 * back to listing each one in turn unless the comparison is deliberate.
 *
 * Real exam prompts and models only, reused with the publisher's permission
 * confirmed on 11 September 2026 (see writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Compare the categories directly, using comparative language (than, compared with, whereas, respectively), rather than describing each one in a separate sentence with no link between them.';

const LESSON = { key: 'writing-charts', blockHeading: 'Reading the Chart. What to Look For' } as const;

const RULES = {
  minWords: 30,
  maxWords: 80,
  checks: ['has-comparison-language', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'It puts the two things being compared in the same sentence rather than in two sentences that sit next to each other.',
  'It uses a comparing word, such as "than", "compared with" or "whereas", to carry the relationship rather than leaving the reader to work it out.',
  'It still gives real figures, but the figures serve the comparison instead of replacing it.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-compare-and-group-guided',
  subskill: 'task1-compare-and-group',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 1 comparing, not listing: guided practice',
  objective: OBJECTIVE,
  instruction:
    'Write one paragraph directly comparing the two visuals, using a comparing word in at least one sentence. Do not describe them one after the other with no link.',
  expectedMinutes: 8,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-132-task1', task: 'task1', form: 'combination', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 2,
  guidingQuestions: [
    'What is the one thing these two visuals have in common that makes them worth comparing?',
    'Which comparing word fits: "than" for a plain difference, "compared with" for a side by side figure, "whereas" for a contrast?',
    'Can you put both figures being compared in the SAME sentence?',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-compare-and-group-check',
  subskill: 'task1-compare-and-group',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 1 comparing, not listing: independent check',
  objective: OBJECTIVE,
  instruction:
    'A chart you have not seen, with several categories. Write one paragraph comparing two or more of them directly, on your own.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-121-task1', task: 'task1', form: 'chart', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 2,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK1_COMPARE_AND_GROUP: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
