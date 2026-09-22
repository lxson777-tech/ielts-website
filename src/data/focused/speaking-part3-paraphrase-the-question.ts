/* Speaking Part 3, paraphrasing the question before answering: repeating a
 * few of the examiner's own words back, in your own phrasing, before you
 * answer, which shows the vocabulary range a Lexical Resource comment is
 * listening for and buys a beat of thinking time besides.
 *
 * Self-check only (see SpokenFocusedTask's header comment in
 * ../focused-exercises.ts). A retry keeps the SAME question; the check is a
 * SECOND, different real cue card's Part 3 follow-up, so the move has to
 * work on a question the student has not already paraphrased once.
 */

import type { SpokenFocusedTask } from '../focused-exercises';

const OBJECTIVE = 'Paraphrase a Part 3 question in your own words before you answer it, rather than launching straight into your answer.';

const LESSON = { key: 'speaking-part3', blockHeading: 'Part 3 vs. Part 1' } as const;

const CHECKLIST = [
  'Did you restate the question in your own words, in one short phrase, before answering?',
  'Did your paraphrase use different words from the question, not the same words repeated back?',
  'Did the paraphrase stay accurate, not changing what the question actually asked?',
  'Did you move on to your real answer straight after, rather than paraphrasing twice?',
] as const;

const GUIDED: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part3-paraphrase-the-question-guided',
  subskill: 'part3-paraphrase-the-question',
  paper: 'speaking',
  part: 3,
  role: 'guided-practice',
  title: 'Part 3: paraphrase the question',
  objective: OBJECTIVE,
  instruction:
    'Answer the follow-up question below. Start by restating it in your own words ("So, whether it is better to learn on your own or with a teacher...") before you give your answer.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'cc-2026-04',
  lesson: LESSON,
  checklist: CHECKLIST,
};

const CHECK: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part3-paraphrase-the-question-check',
  subskill: 'part3-paraphrase-the-question',
  paper: 'speaking',
  part: 3,
  role: 'independent-check',
  title: 'Part 3: paraphrase the question, a different one',
  objective: OBJECTIVE,
  instruction: 'A different follow-up question. Paraphrase it in your own words before answering, on your own.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'cc-2026-05',
  lesson: LESSON,
  checklist: CHECKLIST,
};

export const SPEAKING_PART3_PARAPHRASE_THE_QUESTION: readonly SpokenFocusedTask[] = [GUIDED, CHECK];
