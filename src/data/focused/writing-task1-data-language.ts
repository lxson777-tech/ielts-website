/* Task 1, describing a trend accurately with data: the verb and the figure
 * have to match what actually happened in the chart, in one sentence, both
 * ways round. "Rose" for a rise, "fell" for a fall, an accurate figure
 * attached to the right point.
 *
 * Both the guided task and the check are charts, the visual family where
 * trend language is unavoidable. Real exam prompts and models only, reused
 * with the publisher's permission confirmed on 11 September 2026 (see
 * writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Describe the trend with an accurate trend verb (rose, fell, grew, fluctuated, peaked, remained stable) and the exact figure that goes with it, never a figure with no verb to carry it.';

const LESSON = { key: 'writing-charts', blockHeading: 'Trend Language' } as const;

const RULES = {
  minWords: 30,
  maxWords: 80,
  checks: ['has-trend-language', 'has-figures', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'Every figure sits beside a trend verb: it never appears on its own with no word for what it did.',
  'The verb matches the direction on the chart, not a vague word like "changed" that could mean either.',
  'Where the movement is not a straight line, it says so with a word like "fluctuated" rather than picking one point and ignoring the rest.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-data-language-guided',
  subskill: 'task1-data-language',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 1 trend language: guided practice',
  objective: OBJECTIVE,
  instruction:
    'Write one paragraph describing what one line or bar did, using an accurate trend verb for every figure you give.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-120-task1', task: 'task1', form: 'chart', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 2,
  guidingQuestions: [
    'Did this line or bar rise, fall, fluctuate, or stay roughly level? Which single verb says that accurately?',
    'What is the starting figure and the finishing figure, and does your verb match the direction between them?',
    'If it went up and down more than once, does your sentence say so, rather than only reporting the start and the end?',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-data-language-check',
  subskill: 'task1-data-language',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 1 trend language: independent check',
  objective: OBJECTIVE,
  instruction: 'A chart you have not seen. Describe one trend in it accurately, on your own.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-109-task1', task: 'task1', form: 'chart', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 2,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK1_DATA_LANGUAGE: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
