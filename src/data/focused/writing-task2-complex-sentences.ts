/* Task 2, complex sentences with a purpose: combining two simple sentences
 * into one accurate complex sentence with a subordinate clause, which is
 * exactly what writing-task2-method's own "How the Four Criteria Apply to
 * Task 2" table asks Grammatical Range for ("a mix of simple and complex
 * sentences (conditionals, relative clauses)").
 *
 * Deliberately narrow: this is not "write a good sentence", it is "join
 * these two ideas with a subordinate clause", a move a student can practise
 * on a given pair before they ever have to spot the opportunity themselves
 * in a full essay. Both given pairs are about the guided and check prompts'
 * own subject, so the combined sentence is real content, not a grammar
 * exercise bolted onto an unrelated topic. Real exam prompts only, reused
 * with the publisher's permission confirmed on 11 September 2026 (see
 * writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE = 'Combine two simple sentences into one accurate complex sentence, using a subordinate clause (because, although, since, while, when, if).';

const LESSON = { key: 'writing-task2-method', blockHeading: 'How the Four Criteria Apply to Task 2' } as const;

const RULES = {
  minWords: 12,
  maxWords: 50,
  checks: ['has-subordinate-clause', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE_GUIDED = [
  'It joins contrasting ideas inside one sentence with a subordinating word ("whereas a colleague who moves to a smaller firm... may be uncomfortable for a year"), rather than leaving them as separate simple sentences.',
  'The joining word matches the logic: "whereas" sets one person against another, and "where she knows nobody" adds detail about the place.',
  'Nothing is lost in the combining: both ideas stay in the sentence. Do the same with your own pair, because combining is not the same as cutting one idea to fit the other in.',
] as const;

const NOTICE_CHECK = [
  'It builds its sentences around subordinate clauses ("how a child reads failure", "who believes ability is fixed") rather than a run of simple sentences.',
  'Each clause does a job the logic needs: "who believes ability is fixed" says which pupil is meant, and "that they are not built for the subject" says what the poor result is taken to prove.',
  'Nothing is lost in the combining: both ideas stay in the sentence. Do the same with your own pair, because combining is not the same as cutting one idea to fit the other in.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-complex-sentences-guided',
  subskill: 'complex-sentences-with-purpose',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 2 complex sentences: guided practice',
  objective: OBJECTIVE,
  instruction:
    'Combine these two simple sentences into ONE complex sentence, using a subordinate clause: "Taking risks can lead to failure." and "Taking risks can also lead to great success."',
  expectedMinutes: 6,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-113-task2', task: 'task2', form: 'advantages-disadvantages', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  piece: 'sentence',
  modelParagraphIndex: 1,
  guidingQuestions: [
    'What is the logical relationship between the two ideas: a contrast, a reason, a condition, a time sequence?',
    'Which subordinating word matches that relationship (although and while signal contrast, because signals reason)?',
    'Which idea goes in the main clause and which in the subordinate clause? Either order can work, so long as the logic is clear.',
  ],
  noticeInTheModel: NOTICE_GUIDED,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-complex-sentences-check',
  subskill: 'complex-sentences-with-purpose',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 2 complex sentences: independent check',
  objective: OBJECTIVE,
  instruction:
    'Combine these two simple sentences into ONE complex sentence, on your own: "Children are often told they can achieve anything." and "Some of them later struggle with disappointment."',
  expectedMinutes: 5,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-108-task2', task: 'task2', form: 'advantages-disadvantages', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  piece: 'sentence',
  modelParagraphIndex: 1,
  noticeInTheModel: NOTICE_CHECK,
};

export const WRITING_TASK2_COMPLEX_SENTENCES: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
