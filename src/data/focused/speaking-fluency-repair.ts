/* Speaking, reducing long hesitations: catching yourself before a silent
 * pause runs long, and repairing it with a filler phrase rather than
 * stopping dead, exactly what the lesson's own filler and linking phrase
 * list is for.
 *
 * Self-check only (see SpokenFocusedTask's header comment in
 * ../focused-exercises.ts). Nothing here can measure a pause length from
 * text; a student listens back to their own recording, which is the one
 * honest way to hear a silence, and checks themselves. The measured pause
 * numbers used elsewhere on this platform come only from the calibrated
 * grader's own mechanics report on a real recording.
 */

import type { SpokenFocusedTask } from '../focused-exercises';

const GUIDED: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-fluency-repair',
  subskill: 'fluency-repair',
  paper: 'speaking',
  part: 1,
  title: 'Reducing long pauses',
  objective:
    'Catch yourself before a silence runs long, and keep talking with a filler phrase instead of stopping, rather than pausing until the next idea arrives.',
  instruction:
    'Answer one question from the Hometown topic below. If you feel yourself about to go silent, use a filler phrase and keep going rather than stopping.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'p1-hometown',
  lesson: { key: 'speaking-part1', blockHeading: 'Useful Fillers & Linking Phrases' },
  checklist: [
    'Listening back, where is the longest silent gap? Estimate how many seconds it lasted.',
    'When you paused, did you use a filler phrase (such as "let me think" or "that is a good question") to keep the flow going?',
    'Did any pause run long enough that a listener would have started to wonder if you had finished?',
    'Compare this recording with your last one on the same kind of question: are the gaps shorter?',
  ],
};

export const SPEAKING_FLUENCY_REPAIR: readonly SpokenFocusedTask[] = [GUIDED];
