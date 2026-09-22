/* Speaking Part 2, varying tenses in a cue card story: most two-minute talks
 * are told mainly in the past simple, and a Grammatical Range comment names
 * exactly this when a talk never leaves it. A real story naturally needs
 * more than one tense: the past simple for what happened, the past
 * continuous for what was going on around it, and the present for how
 * things are now, or how the student feels about it looking back.
 *
 * Self-check only (see SpokenFocusedTask's header comment in
 * ../focused-exercises.ts). A retry keeps the SAME cue card; the check is a
 * SECOND, different cue card, so the range has to travel to a new story.
 */

import type { SpokenFocusedTask } from '../focused-exercises';

const OBJECTIVE = 'Tell a Part 2 story using more than one tense: the past for what happened, and the present for how things are now or how you feel about it looking back.';

const LESSON = { key: 'speaking-part2', blockHeading: 'How to Structure Your 2-Minute Talk' } as const;

const CHECKLIST = [
  'Did you use the past tense for the main events of your story?',
  'Did you also use the present tense at least once, for how things are now or how you feel about it today?',
  'If something was already in progress when the main event happened, did you use the past continuous (I was walking when...) rather than the past simple for both?',
  'Did every tense you used match the time you actually meant, rather than a tense chosen at random?',
] as const;

const GUIDED: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part2-tense-range-guided',
  subskill: 'part2-tense-range',
  paper: 'speaking',
  part: 2,
  role: 'guided-practice',
  title: 'Part 2: varying your tenses',
  objective: OBJECTIVE,
  instruction:
    'Talk for up to two minutes on the cue card below. Use the past tense for the story itself, and the present tense at least once for how things are now.',
  expectedMinutes: 6,
  provenance: 'project-authored',
  promptId: 'cc-2026-06',
  lesson: LESSON,
  checklist: CHECKLIST,
};

const CHECK: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part2-tense-range-check',
  subskill: 'part2-tense-range',
  paper: 'speaking',
  part: 2,
  role: 'independent-check',
  title: 'Part 2: varying your tenses, a different cue card',
  objective: OBJECTIVE,
  instruction: 'A different cue card. Tell the story using more than one tense, on your own.',
  expectedMinutes: 6,
  provenance: 'project-authored',
  promptId: 'cc-2026-07',
  lesson: LESSON,
  checklist: CHECKLIST,
};

export const SPEAKING_PART2_TENSE_RANGE: readonly SpokenFocusedTask[] = [GUIDED, CHECK];
