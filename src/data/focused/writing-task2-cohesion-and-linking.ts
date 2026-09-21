/* Task 2, cohesion without mechanical linkers: two sentences that connect
 * because the second one genuinely follows from the first (a pronoun, a
 * repeated idea in different words, a natural "this"), not because a
 * connector word (Firstly, Moreover, Furthermore, In addition) was dropped
 * at the front of it.
 *
 * Both prompts are two-part questions, where two separate answers have to
 * be joined into one coherent paragraph rather than two paragraphs stapled
 * together, which is exactly where mechanical linking shows up. Real exam
 * prompts only, reused with the publisher's permission confirmed on
 * 11 September 2026 (see writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Connect two sentences so the second genuinely follows from the first, without opening it with a mechanical linker such as Firstly, Moreover or In addition.';

const LESSON = { key: 'writing-twopart', blockHeading: 'Useful Framing Language' } as const;

const RULES = {
  minWords: 25,
  maxWords: 70,
  checks: ['no-mechanical-linker-opening', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'The second sentence does not open with a connector word. It connects to the first through what it actually says: a pronoun, a repeated idea, a natural "this".',
  'A reader could remove any connector words in this paragraph and the order would still make sense, because the sense was never carried by the connector.',
  'Where it does link two ideas explicitly, it uses a word that says something real about the relationship (however, as a result), not a word that only announces a list.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-cohesion-and-linking-guided',
  subskill: 'cohesion-and-linking',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 2 cohesion: guided practice',
  objective: OBJECTIVE,
  instruction: 'Write two connected sentences that answer one half of this two-part question. Do not start the second sentence with a connector word.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-128-task2', task: 'task2', form: 'two-part', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 1,
  guidingQuestions: [
    'What does your first sentence claim? What word in your second sentence could refer back to it, such as "this" or "that reason"?',
    'Could you delete any connector word at the start of your second sentence and still understand it? If yes, the connection is real.',
    'If you do need a linking word, does it say something real (however, as a result) rather than only announcing a list (firstly, moreover)?',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task2-cohesion-and-linking-check',
  subskill: 'cohesion-and-linking',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 2 cohesion: independent check',
  objective: OBJECTIVE,
  instruction: 'A question you have not seen. Write two connected sentences for one half of it, on your own.',
  expectedMinutes: 6,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-126-task2', task: 'task2', form: 'two-part', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 1,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK2_COHESION_AND_LINKING: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
