/* Task 2, supporting a claim with an explanation and an example: the move a
 * body paragraph needs and a Task Response comment asks for by name when it
 * is missing, "a claim with no support behind it".
 *
 * Both prompts are advantages-and-disadvantages questions, where a claim
 * ("the main advantage is...") is the natural first sentence of a body
 * paragraph. Real exam prompts only, reused with the publisher's permission
 * confirmed on 11 September 2026 (see writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Make one claim, explain why it is true, and give one specific example, so the claim is not left to stand on its own.';

const LESSON = { key: 'writing-advantages', blockHeading: 'Structure (4 paragraphs. One detail per adaptation)' } as const;

const RULES = {
  minWords: 35,
  maxWords: 90,
  checks: ['has-example-signal', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'The first sentence makes ONE claim, not two or three run together.',
  'The next sentence explains why that claim is true, in the writer\'s own reasoning rather than repeating the claim in different words.',
  'It closes with a specific example, signalled by a phrase such as "for example" or "for instance", naming a real situation rather than another general statement.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-support-a-claim-guided',
  subskill: 'task2-support-a-claim',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 2 claim support: guided practice',
  objective: OBJECTIVE,
  instruction: 'Write one paragraph: one claim about an advantage or a disadvantage, why it is true, and a specific example.',
  expectedMinutes: 8,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-127-task2', task: 'task2', form: 'advantages-disadvantages', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 1,
  guidingQuestions: [
    'What is the ONE claim this paragraph is going to make? Say it in your first sentence.',
    'Why is that true? Give your own reasoning, not a repeat of the claim.',
    'What real, specific example shows this happening? Introduce it with "for example" or "for instance".',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-support-a-claim-check',
  subskill: 'task2-support-a-claim',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 2 claim support: independent check',
  objective: OBJECTIVE,
  instruction: 'A question you have not seen. Write one paragraph: a claim, an explanation and an example, on your own.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-120-task2', task: 'task2', form: 'advantages-disadvantages', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 1,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK2_SUPPORT_A_CLAIM: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
