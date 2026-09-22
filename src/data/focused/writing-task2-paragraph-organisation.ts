/* Task 2, organising one body paragraph: a topic sentence, development of
 * that one idea, and a link back to the question, in that order, rather
 * than several ideas loose in one paragraph with no sentence announcing any
 * of them.
 *
 * Both prompts are discussion questions ("discuss both views"), where each
 * body paragraph has to hold exactly one of the two views and nothing else,
 * which is what makes a missing topic sentence show up fastest. Real exam
 * prompts only, reused with the publisher's permission confirmed on
 * 11 September 2026 (see writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Open the paragraph with a topic sentence that states its one idea, develop that idea, and close with a sentence that links back to the question.';

const LESSON = { key: 'writing-discussion', blockHeading: 'Structure (4-5 paragraphs)' } as const;

const RULES = {
  minWords: 40,
  maxWords: 100,
  checks: ['has-enough-sentences', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'The first sentence announces the one idea the paragraph is going to develop. A reader could stop there and still know what the paragraph is about.',
  'Every sentence after it develops that same idea. None of them introduces a second, unrelated point.',
  'The final sentence links back to the question, rather than simply stopping when the idea runs out.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-paragraph-organisation-guided',
  subskill: 'paragraph-organisation',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 2 body paragraph: guided practice',
  objective: OBJECTIVE,
  instruction: 'Write one body paragraph giving ONE of the two views: a topic sentence, its development, and a link back to the question.',
  expectedMinutes: 8,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-121-task2', task: 'task2', form: 'discussion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  piece: 'paragraph',
  modelParagraphIndex: 1,
  guidingQuestions: [
    'Which of the two views is this paragraph about? Say it in your first sentence, as a topic sentence.',
    'What is your reasoning or your example for it? That is the development.',
    'How does your last sentence bring the paragraph back to the actual question?',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-paragraph-organisation-check',
  subskill: 'paragraph-organisation',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 2 body paragraph: independent check',
  objective: OBJECTIVE,
  instruction: 'A question you have not seen. Write one body paragraph for one of the two views, on your own.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-118-task2', task: 'task2', form: 'discussion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  piece: 'paragraph',
  modelParagraphIndex: 1,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK2_PARAGRAPH_ORGANISATION: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
