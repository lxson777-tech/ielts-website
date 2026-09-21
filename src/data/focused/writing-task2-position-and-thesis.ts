/* Task 2, answering all parts of the question in the introduction: a clear
 * position, and a one-sentence plan for what the body paragraphs will argue,
 * both stated before the first body paragraph starts.
 *
 * The Task 2 objectives in this package are the first short-form Writing
 * practice for Task 2, the same gap the overview pilot closed for Task 1
 * (docs/personal-learning/ARCHITECTURE.md section 6.3): the smallest unit in
 * the library was a full forty-minute essay. This is the introduction alone,
 * about a quarter of that.
 *
 * Both prompts here are opinion questions, where a position is unavoidable.
 * Real exam prompts only, reused with the publisher's permission confirmed
 * on 11 September 2026 (see writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'State a clear position on the question and, in one sentence, say what each body paragraph will argue, both inside the introduction.';

const LESSON = { key: 'writing-opinion', blockHeading: 'Position Language' } as const;

const RULES = {
  minWords: 25,
  maxWords: 60,
  checks: ['has-position-statement', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'It states a position in the first person, in one sentence a reader could not mistake for a summary of the question.',
  'It names what each body paragraph is going to argue, before either paragraph has been written.',
  'It does not restate the whole question. It paraphrases it in one clause and moves straight to the position.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-position-and-thesis-guided',
  subskill: 'task2-position-and-thesis',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 2 introduction: guided practice',
  objective: OBJECTIVE,
  instruction: 'Write only the introduction: a paraphrase of the question, your position, and one sentence on what each body paragraph will argue.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-125-task2', task: 'task2', form: 'opinion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 0,
  guidingQuestions: [
    'In one clause, what is the question actually asking, in your own words rather than copied?',
    'Do you agree, disagree, or partly agree? Say it directly: "I believe...", "In my view...".',
    'What will your first body paragraph argue, and what will your second one argue?',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-position-and-thesis-check',
  subskill: 'task2-position-and-thesis',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 2 introduction: independent check',
  objective: OBJECTIVE,
  instruction: 'A question you have not seen. Write only the introduction, on your own.',
  expectedMinutes: 6,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-124-task2', task: 'task2', form: 'opinion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 0,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK2_POSITION_AND_THESIS: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
