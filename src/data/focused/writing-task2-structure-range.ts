/* Task 2, a range of structures in one paragraph: writing-task2-method's own
 * "How the Four Criteria Apply to Task 2" table names this directly, "a mix
 * of simple and complex sentences (conditionals, relative clauses)".
 *
 * The automatic check (written-focused-task.ts's structureSignalsIn) counts
 * four kinds of signal: a relative clause (which, who, that), a subordinate
 * clause (because, although, while...), a passive verb, and a conditional
 * (if... would/could/might). It is a COUNT, shown as a check, never a
 * judgement of whether any one structure is used correctly: that is what the
 * hint about accuracy right beside it says explicitly. Real exam prompts
 * only, reused with the publisher's permission confirmed on 11 September
 * 2026 (see writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Write a paragraph that uses more than one kind of sentence structure (a relative clause, a subordinate clause, a passive, a conditional), not the same simple shape repeated.';

const LESSON = { key: 'writing-task2-method', blockHeading: 'How the Four Criteria Apply to Task 2' } as const;

const RULES = {
  minWords: 40,
  maxWords: 100,
  checks: ['has-range-of-structures', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'It opens with one structure (a subordinate clause: "Although alternative medicine is unregulated...") and closes with a different one (a relative clause: "...a claim which few studies support").',
  'A passive appears where the doer genuinely does not matter ("more research needs to be conducted"), not forced in everywhere.',
  'The range serves the meaning. Nothing here is a structure for its own sake; each one is the natural way to say that particular sentence.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-structure-range-guided',
  subskill: 'complex-sentence-range',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 2 range of structures: guided practice',
  objective: OBJECTIVE,
  instruction:
    'Write one paragraph giving your view on alternative medicine. Try to use at least two different kinds of structure: a relative clause, a subordinate clause, a passive, or a conditional.',
  expectedMinutes: 8,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-116-task2', task: 'task2', form: 'opinion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 1,
  guidingQuestions: [
    'Where could a relative clause (which, who, that) add extra detail to a noun without starting a new sentence?',
    'Where could a subordinate clause (because, although, while) link a reason or a contrast to your main point?',
    'Is there a sentence where the doer of the action genuinely does not matter, where a passive would read more naturally than an active?',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-structure-range-check',
  subskill: 'complex-sentence-range',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 2 range of structures: independent check',
  objective: OBJECTIVE,
  instruction: 'A question you have not seen. Write one paragraph using a range of structures, on your own.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-103-task2', task: 'task2', form: 'opinion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 1,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK2_STRUCTURE_RANGE: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
