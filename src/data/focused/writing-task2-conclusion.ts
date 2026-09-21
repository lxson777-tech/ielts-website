/* Task 2, a conclusion that answers the question: one or two sentences that
 * restate the position and directly answer what was asked, rather than
 * trailing off or introducing a new idea this late in the essay.
 *
 * Both prompts are opinion questions, where "the question" the conclusion
 * has to answer is a single, checkable thing: does the writer agree or not.
 * Real exam prompts only, reused with the publisher's permission confirmed
 * on 11 September 2026 (see writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Write a conclusion that restates your position and directly answers the question, in one or two sentences, with no new idea introduced this late.';

const LESSON = { key: 'writing-opinion', blockHeading: 'Structure (4 paragraphs)' } as const;

const RULES = {
  minWords: 15,
  maxWords: 45,
  checks: ['has-conclusion-signal', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'It opens with a signal such as "In conclusion" or "Overall", so a reader knows the essay is closing rather than adding another body paragraph.',
  'It restates the position from the introduction in different words, rather than copying the same sentence.',
  'It answers the actual question asked, in a way that could be checked against it, and introduces nothing new.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-conclusion-guided',
  subskill: 'task2-conclusion',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 2 conclusion: guided practice',
  objective: OBJECTIVE,
  instruction: 'Write only the conclusion for this question: one or two sentences restating your position and answering it directly.',
  expectedMinutes: 6,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-123-task2', task: 'task2', form: 'opinion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 3,
  guidingQuestions: [
    'What word or phrase will signal that this is the conclusion?',
    'Say your position again, in different words from the introduction.',
    'Does your last sentence actually answer the question, rather than making a general closing remark?',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-conclusion-check',
  subskill: 'task2-conclusion',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 2 conclusion: independent check',
  objective: OBJECTIVE,
  instruction: 'A question you have not seen. Write only its conclusion, on your own.',
  expectedMinutes: 5,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-122-task2', task: 'task2', form: 'opinion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 3,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK2_CONCLUSION: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
