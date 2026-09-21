/* Speaking Part 1, extending an answer with the A.R.E. structure the
 * speaking lessons already teach (Answer, Reason, Example): a one-word or
 * one-clause answer to a Part 1 question, turned into two or three natural
 * sentences.
 *
 * Self-check only, on purpose (see SpokenFocusedTask's header comment in
 * ../focused-exercises.ts and the builder report): the student records
 * themselves, listens back, and checks their own recording against this
 * checklist. Sending the SAME idea to the real grader afterwards is one
 * explicit, labelled, student-chosen extra step through the existing
 * Speaking trainer, never automatic and never free.
 */

import type { SpokenFocusedTask } from '../focused-exercises';

const GUIDED: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part1-extend-an-answer',
  subskill: 'part1-extend-an-answer',
  paper: 'speaking',
  part: 1,
  title: 'Part 1: extend your answer',
  objective: 'Extend a Part 1 answer into two or three sentences using Answer, Reason, Example, instead of stopping after one short answer.',
  instruction:
    'Answer one question from the Work topic below. Give your straight answer, then a reason, then a real example, before you stop talking.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'p1-work',
  lesson: { key: 'speaking-part1', blockHeading: 'A.R.E. in Action' },
  checklist: [
    'Did you answer the question directly, in your first sentence?',
    'Did you give a reason for your answer, not only the answer itself?',
    'Did you give one real example or a specific detail, rather than stopping after the reason?',
    'Did all three parts (answer, reason, example) stay on the SAME idea?',
  ],
};

export const SPEAKING_PART1_EXTEND_AN_ANSWER: readonly SpokenFocusedTask[] = [GUIDED];
