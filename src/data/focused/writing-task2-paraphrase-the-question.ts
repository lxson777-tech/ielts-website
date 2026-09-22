/* Task 2, paraphrasing the question in the introduction: opening with the
 * student's own words rather than the question's, which is a Lexical
 * Resource matter (range and flexibility of vocabulary), not a Task Response
 * one: task2-position-and-thesis already owns stating the position, this
 * objective is only about not COPYING the question to get there.
 *
 * Both prompts are single-question opinion essays, so there is one sentence
 * to paraphrase and nowhere to hide behind a second question. Real exam
 * prompts only, reused with the publisher's permission confirmed on
 * 11 September 2026 (see writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE = 'Paraphrase the question in your introduction, in your own words, without copying its own wording.';

const LESSON = { key: 'writing-task2-method', blockHeading: 'How the Four Criteria Apply to Task 2' } as const;

const RULES = {
  minWords: 20,
  maxWords: 60,
  checks: ['is-paraphrased-not-copied', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'It restates the question\'s own idea using different words and a different sentence shape, not the question\'s own phrase with one word swapped.',
  'A reader who had never seen the question could still tell what it was asking from this sentence alone.',
  'It moves straight from the paraphrase into a position, rather than lingering on the question a second time.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-paraphrase-the-question-guided',
  subskill: 'task2-paraphrase-the-question',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 2 paraphrase: guided practice',
  objective: OBJECTIVE,
  instruction: 'Write only one sentence: a paraphrase of the question below, in your own words.',
  expectedMinutes: 6,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-117-task2', task: 'task2', form: 'opinion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 0,
  guidingQuestions: [
    'What is the question\'s own key noun, and what is another way to say it?',
    'What is the question\'s own key verb or claim, and how could you express the same idea differently?',
    'Read your sentence next to the question. Which words are still identical? Change those too.',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-paraphrase-the-question-check',
  subskill: 'task2-paraphrase-the-question',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 2 paraphrase: independent check',
  objective: OBJECTIVE,
  instruction: 'A question you have not seen. Write only a paraphrase of it, on your own.',
  expectedMinutes: 5,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-104-task2', task: 'task2', form: 'two-part', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 0,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK2_PARAPHRASE_THE_QUESTION: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
