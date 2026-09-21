/* Task 1, process description sequencing: the stages of a process diagram
 * reported in the order they happen, marked by sequencing words rather than
 * left for the reader to infer from the diagram's own arrows.
 *
 * Both the guided task and the check are process prompts. Real exam prompts
 * and models only, reused with the publisher's permission confirmed on
 * 11 September 2026 (see writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Describe the stages of the process in the order they happen, marking the sequence with words such as first, then, after that or finally, rather than leaving the order to the diagram alone.';

const LESSON = { key: 'writing-process', blockHeading: 'Key Language' } as const;

const RULES = {
  minWords: 30,
  maxWords: 90,
  checks: ['has-sequencing-language', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'Each new stage opens with a word that marks its place in the sequence, so the order is stated rather than assumed.',
  'It does not restart the sentence pattern every time. The sequencing words vary (first, once this is done, at the next stage, finally), which is what stops a process paragraph reading like a list.',
  'It stays inside the stages that are actually on the diagram: nothing is invented to fill a gap.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-process-sequence-guided',
  subskill: 'task1-process-sequence',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 1 process sequencing: guided practice',
  objective: OBJECTIVE,
  instruction: 'Write one paragraph describing the first three stages of this process, in order, with a sequencing word for each one.',
  expectedMinutes: 8,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-131-task1', task: 'task1', form: 'process', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 2,
  guidingQuestions: [
    'Which stage genuinely comes first on the diagram? Start there, not with whichever stage looks easiest to describe.',
    'What word marks the move to the next stage: then, after that, once this is done, following this?',
    'Does every sentence contain exactly one stage, so the sequence stays clear?',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-process-sequence-check',
  subskill: 'task1-process-sequence',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 1 process sequencing: independent check',
  objective: OBJECTIVE,
  instruction: 'A process diagram you have not seen. Describe its first three stages in order, on your own.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-128-task1', task: 'task1', form: 'process', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 2,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK1_PROCESS_SEQUENCE: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
