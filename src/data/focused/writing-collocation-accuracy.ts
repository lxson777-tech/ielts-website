/* Collocation accuracy: the do/make confusion, one of the commonest
 * Lexical Resource slips in real IELTS writing.
 *
 * WHY THIS IS PROJECT-AUTHORED, GUIDED PRACTICE ONLY, EVER
 * Same reasoning as writing-sentence-correction.ts, restated because it
 * matters again here: the real graded report keeps a quoted moment and the
 * marker's own comment about it, never a separately stored "corrected
 * version" of that moment. So there is nothing genuine to reveal as the fix
 * for a student's own collocation error. What this package DOES do with the
 * student's own report: the hand-off (written-focused-task.ts's
 * WRITING_OBJECTIVE_RULES, 'collocation-accuracy' entry) reads the marker's
 * own lexicalResource comment, tip and next-band advice for a collocation
 * complaint and quotes it word for word, exactly the way every other
 * hand-off does.
 *
 * So the practice itself is one recurring, real IELTS pattern, written here
 * and checked by an IELTS teacher before it becomes anything more than
 * guided practice (lead decision Q1, the same rule the sentence endings
 * lesson and writing-sentence-correction.ts already follow): the verbs DO
 * and MAKE, which attach to different nouns with no logic a learner can
 * derive, only memorise. The prompt shown for context is real (see
 * `promptId`); the broken sentence is not.
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE = 'Correct a sentence with two do/make collocation slips, then write your own sentence using one of the same collocations correctly.';

const LESSON = { key: 'writing-task2-method', blockHeading: 'How the Four Criteria Apply to Task 2' } as const;

const RULES = {
  minWords: 5,
  maxWords: 40,
  checks: ['sentence-was-changed', 'length-in-range'],
} as const;

const ATTRIBUTION = 'Project-authored practice sentence, checked against a real recurring IELTS pattern; not exam material.';

const NOTICE = [
  '"A mistake" collocates with MAKE, not do: "make a mistake", never "do a mistake".',
  '"Homework" collocates with DO, not make: "do your homework", never "make your homework".',
  'There is no logic to learn here, only a pairing to remember: each noun has its own fixed verb, and swapping it is what a Lexical Resource comment calls an inaccurate collocation.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-collocation-accuracy-guided',
  subskill: 'collocation-accuracy',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Collocation accuracy: do or make',
  objective: OBJECTIVE,
  instruction: 'Read the sentence below and rewrite it correctly. Write your correction, not a comment on what is wrong with it.',
  expectedMinutes: 6,
  provenance: 'project-authored',
  source: { promptId: 'pte-wt-129-task2', task: 'task2', form: 'opinion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 1,
  correctionSentence: 'Many students do a mistake when they make their homework at the last minute, instead of planning their time properly.',
  correctionNote:
    'Two do/make slips, both common. "A mistake" needs MAKE: "make a mistake", not "do a mistake". "Homework" needs DO: "do their homework", not "make their homework". Decide which fixed verb belongs to each noun before choosing do or make.',
  transferPrompt: 'Now write one sentence of your own using "make a decision" correctly, about any IELTS topic.',
  guidingQuestions: [
    'Find every do/make verb in the sentence and ask which noun it is attached to.',
    '"A mistake" always takes MAKE.',
    '"Homework" always takes DO.',
  ],
  noticeInTheModel: NOTICE,
};

export const WRITING_COLLOCATION_ACCURACY: readonly WrittenFocusedTask[] = [GUIDED];
