/* Speaking Part 3, comparing two sides: many Part 3 questions genuinely have
 * two positions worth weighing (friends versus experts, planning versus
 * flexibility), and answering only one side is what a Fluency and Coherence
 * comment names when a Part 3 answer never develops beyond a single view.
 * Rolls up to fluencyCoherence, the same reasoning as speaking-part3-
 * abstract-opinion.ts: this is about developing an answer fully, which is
 * what that criterion is listening for in Part 3.
 *
 * Self-check only (see SpokenFocusedTask's header comment in
 * ../focused-exercises.ts). A retry keeps the SAME question; the check is a
 * SECOND, different follow-up question with its own two sides to weigh.
 */

import type { SpokenFocusedTask } from '../focused-exercises';

const OBJECTIVE = 'Compare two sides of a Part 3 question explicitly, using comparing language (compared with, whereas, on the other hand), rather than only answering one side.';

const LESSON = { key: 'speaking-part3', blockHeading: 'Comparing' } as const;

const CHECKLIST = [
  'Did you mention BOTH sides of the question, not only the one you agree with more?',
  'Did you use a comparing phrase (compared with, whereas, on the other hand) to connect the two sides?',
  'Did you say which side you lean towards, and why, rather than leaving it balanced with no conclusion?',
  'Did comparing the two sides actually make your answer longer and more developed, not just repeat the same point twice?',
] as const;

const GUIDED: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part3-speculate-and-compare-guided',
  subskill: 'part3-speculate-and-compare',
  paper: 'speaking',
  part: 3,
  role: 'guided-practice',
  title: 'Part 3: comparing two sides',
  objective: OBJECTIVE,
  instruction: 'Answer the follow-up question below by weighing both sides explicitly, using a comparing phrase, before giving your own view.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'cc-2026-12',
  lesson: LESSON,
  checklist: CHECKLIST,
};

const CHECK: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part3-speculate-and-compare-check',
  subskill: 'part3-speculate-and-compare',
  paper: 'speaking',
  part: 3,
  role: 'independent-check',
  title: 'Part 3: comparing two sides, a different question',
  objective: OBJECTIVE,
  instruction: 'A different follow-up question. Compare both sides on your own.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'cc-2026-13',
  lesson: LESSON,
  checklist: CHECKLIST,
};

export const SPEAKING_PART3_SPECULATE_AND_COMPARE: readonly SpokenFocusedTask[] = [GUIDED, CHECK];
