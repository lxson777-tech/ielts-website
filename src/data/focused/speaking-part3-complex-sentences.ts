/* Speaking Part 3, complex sentences when giving reasons: a Grammatical
 * Range comment on a Part 3 answer often names short, disconnected sentences
 * with no subordinate clause joining a reason to its claim. "Because",
 * "since" and "as" are the plainest way to close that gap while speaking,
 * which is the same conditionals-and-subordinate-clauses range the Writing
 * criteria table already names for the written papers.
 *
 * Self-check only (see SpokenFocusedTask's header comment in
 * ../focused-exercises.ts). A retry keeps the SAME question; the check is a
 * SECOND, different follow-up question, so the move has to work on reasoning
 * the student has not already rehearsed.
 */

import type { SpokenFocusedTask } from '../focused-exercises';

const OBJECTIVE = 'Give a reason for your opinion using a complex sentence with a subordinate clause (because, since, as, although), instead of two short separate sentences.';

const LESSON = { key: 'speaking-part3', blockHeading: 'How to Extend Your Answers: OREO' } as const;

const CHECKLIST = [
  'Did you join your opinion and your reason into ONE sentence, using because, since or as?',
  'Did you use at least one more subordinate clause somewhere else in your answer (although, while, if)?',
  'Did the subordinate clause actually carry a real reason, rather than being added just for the grammar?',
  'Did you still sound natural, rather than stiff or over-rehearsed?',
] as const;

const GUIDED: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part3-complex-sentences-guided',
  subskill: 'part3-complex-sentences',
  paper: 'speaking',
  part: 3,
  role: 'guided-practice',
  title: 'Part 3: complex sentences for reasons',
  objective: OBJECTIVE,
  instruction:
    'Answer the follow-up question below. Give your opinion and your reason in ONE sentence, joined with because, since or as.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'cc-2026-08',
  lesson: LESSON,
  checklist: CHECKLIST,
};

const CHECK: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part3-complex-sentences-check',
  subskill: 'part3-complex-sentences',
  paper: 'speaking',
  part: 3,
  role: 'independent-check',
  title: 'Part 3: complex sentences for reasons, a different question',
  objective: OBJECTIVE,
  instruction: 'A different follow-up question. Give your opinion and reason in one complex sentence, on your own.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'cc-2026-09',
  lesson: LESSON,
  checklist: CHECKLIST,
};

export const SPEAKING_PART3_COMPLEX_SENTENCES: readonly SpokenFocusedTask[] = [GUIDED, CHECK];
