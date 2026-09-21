/* Speaking Part 2, organising a two-minute long turn from the one-minute
 * prep the cue card actually gives: turning the bullet points into a real
 * order (an opening, the four "you should say" points, a closing thought)
 * before the clock starts, instead of starting to talk and hoping the
 * structure appears.
 *
 * Self-check only (see SpokenFocusedTask's header comment in
 * ../focused-exercises.ts): the student prepares for one minute, records
 * for two, listens back, and checks their OWN recording against this
 * checklist. The real cue card, and its real one-minute prep window, are
 * unchanged; this is the same task with a checklist attached.
 */

import type { SpokenFocusedTask } from '../focused-exercises';

const GUIDED: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-part2-plan-in-one-minute',
  subskill: 'part2-plan-in-one-minute',
  paper: 'speaking',
  part: 2,
  title: 'Part 2: plan it in one minute',
  objective: 'Turn one minute of preparation into a real plan for the two-minute talk, covering every bullet point in a clear order.',
  instruction:
    'Take one minute to plan this cue card, using the notes method the lesson teaches. Then record your two-minute answer.',
  expectedMinutes: 4,
  provenance: 'project-authored',
  promptId: 'p2-journey',
  lesson: { key: 'speaking-part2', blockHeading: 'Making the Most of Your 1 Minute' },
  checklist: [
    'Did you write a few words for every "you should say" point before you started talking, not partway through?',
    'Did you talk about the points in a sensible order, rather than jumping between them?',
    'Did you keep talking for close to the full two minutes, rather than finishing early?',
    'Did you close with a short final thought, rather than simply stopping?',
  ],
};

export const SPEAKING_PART2_PLAN_IN_ONE_MINUTE: readonly SpokenFocusedTask[] = [GUIDED];
