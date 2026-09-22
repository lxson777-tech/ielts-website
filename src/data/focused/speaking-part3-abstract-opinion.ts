/* Speaking Part 3, giving an opinion and justifying it: the OREO move the
 * Part 3 lesson already teaches (Opinion, Reason, Example, then a balanced
 * close), practised as its own objective rather than only read about. A
 * one-line answer with no reason and no example is what a Fluency and
 * Coherence comment names when a Part 3 answer stays too short to develop
 * the topic, which is why this rolls up to fluencyCoherence
 * (SPEAKING_CRITERION_OBJECTIVES, src/lib/learning/catalog.ts) alongside
 * part1-extend-an-answer and part2-plan-in-one-minute rather than to a
 * fourth criterion of its own.
 *
 * Self-check only (see SpokenFocusedTask's header comment in
 * ../focused-exercises.ts). A retry keeps the SAME question; the check is a
 * SECOND, different follow-up question.
 */

import type { SpokenFocusedTask } from '../focused-exercises';

const OBJECTIVE = 'Give an opinion on a Part 3 question, justify it with a reason, and support the reason with a specific example, using the OREO structure.';

const LESSON = { key: 'speaking-part3', blockHeading: 'How to Extend Your Answers: OREO' } as const;

const CHECKLIST = [
  'Did you state your opinion clearly, in your first sentence ("I think...", "In my opinion...")?',
  'Did you give a reason for that opinion, not only the opinion itself?',
  'Did you support the reason with a specific example, signalled by a phrase such as "for example" or "take... as an example"?',
  'Did you close by summarising your view, rather than trailing off after the example?',
] as const;

const GUIDED: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part3-abstract-opinion-guided',
  subskill: 'part3-abstract-opinion',
  paper: 'speaking',
  part: 3,
  role: 'guided-practice',
  title: 'Part 3: opinion, reason, example',
  objective: OBJECTIVE,
  instruction: 'Answer the follow-up question below using the OREO structure: opinion, reason, example, then a short closing thought.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'cc-2026-10',
  lesson: LESSON,
  checklist: CHECKLIST,
};

const CHECK: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part3-abstract-opinion-check',
  subskill: 'part3-abstract-opinion',
  paper: 'speaking',
  part: 3,
  role: 'independent-check',
  title: 'Part 3: opinion, reason, example, a different question',
  objective: OBJECTIVE,
  instruction: 'A different follow-up question. Use the OREO structure on your own.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'cc-2026-11',
  lesson: LESSON,
  checklist: CHECKLIST,
};

export const SPEAKING_PART3_ABSTRACT_OPINION: readonly SpokenFocusedTask[] = [GUIDED, CHECK];
