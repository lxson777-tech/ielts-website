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
 *
 * Finding 4 (Codex's independent review, 2026-09-22): this was pilot-round
 * (WP20) material, guided self-check plus a same-topic retry only, with no
 * independent check on a different topic, unlike the six pairs the coverage
 * round (WP20b) added afterwards. A retry keeps the SAME topic (Hometown,
 * recordAgain in SpokenFocusedTask.tsx); the check below is a SECOND,
 * different real Part 1 topic (Music), on the same pattern WP20b's six
 * pairs already use. The skill itself applies whichever part a student is
 * actually speaking in (see the checklist's own "estimate how many seconds"
 * question), but both the guided task and the check stay on Part 1, the
 * same convention every other guided/check pair in this file follows, so
 * "same part" has one honest meaning throughout the catalogue.
 */

import type { SpokenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Catch yourself before a silence runs long, and keep talking with a filler phrase instead of stopping, rather than pausing until the next idea arrives.';

const LESSON = { key: 'speaking-part1', blockHeading: 'Useful Fillers & Linking Phrases' } as const;

const CHECKLIST = [
  'Listening back, where is the longest silent gap? Estimate how many seconds it lasted.',
  'When you paused, did you use a filler phrase (such as "let me think" or "that is a good question") to keep the flow going?',
  'Did any pause run long enough that a listener would have started to wonder if you had finished?',
  'Compare this recording with your last one on the same kind of question: are the gaps shorter?',
] as const;

const GUIDED: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-fluency-repair',
  subskill: 'fluency-repair',
  paper: 'speaking',
  part: 1,
  role: 'guided-practice',
  title: 'Reducing long pauses',
  objective: OBJECTIVE,
  instruction:
    'Answer one question from the Hometown topic below. If you feel yourself about to go silent, use a filler phrase and keep going rather than stopping.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'p1-hometown',
  lesson: LESSON,
  checklist: CHECKLIST,
};

const CHECK: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-fluency-repair-check',
  subskill: 'fluency-repair',
  paper: 'speaking',
  part: 1,
  role: 'independent-check',
  title: 'Reducing long pauses, a different topic',
  objective: OBJECTIVE,
  instruction:
    'A different topic, music. If you feel yourself about to go silent, use a filler phrase and keep going, on your own.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'p1-music',
  lesson: LESSON,
  checklist: CHECKLIST,
};

export const SPEAKING_FLUENCY_REPAIR: readonly SpokenFocusedTask[] = [GUIDED, CHECK];
