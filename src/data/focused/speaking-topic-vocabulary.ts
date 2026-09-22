/* Speaking Part 1, a wider range of vocabulary on a familiar topic: moving
 * past the first word that comes to mind (nice, big, good) to the more
 * specific word the topic actually offers, which is what a Lexical Resource
 * comment means by "range" in Part 1 (SPEAKING_CRITERION_OBJECTIVES.
 * lexicalResource, src/lib/learning/catalog.ts).
 *
 * Self-check only, on the same rule every SpokenFocusedTask follows (see
 * SpokenFocusedTask's header comment in ../focused-exercises.ts): record,
 * listen back, check yourself. A retry keeps the SAME topic; the check is a
 * SECOND, different real Part 1 topic (WP20b's addition to the SpokenFocused
 * Task shape, see the `role` field), so the range genuinely has to travel to
 * a subject the student has not just rehearsed vocabulary for.
 */

import type { SpokenFocusedTask } from '../focused-exercises';

const OBJECTIVE = 'Answer a familiar Part 1 topic using a wider range of vocabulary, reaching past the first word that comes to mind for a more specific one.';

const LESSON = { key: 'speaking-part1', blockHeading: 'Practice Topics & Questions' } as const;

const CHECKLIST = [
  'Did you avoid the most generic word (nice, big, good, bad) at least once, reaching for something more specific instead?',
  'Did you use at least one topic word or phrase you would not use for a completely different Part 1 topic?',
  'Did you vary your vocabulary across your answer, rather than repeating the same adjective twice?',
  'Did the more specific words still sound natural, rather than dropped in just to sound advanced?',
] as const;

const GUIDED: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-topic-vocabulary-guided',
  subskill: 'topic-vocabulary-in-speech',
  paper: 'speaking',
  part: 1,
  role: 'guided-practice',
  title: 'Part 1: a wider range of vocabulary',
  objective: OBJECTIVE,
  instruction:
    'Answer one question about your home below. Reach for specific words about the topic (cosy, spacious, within walking distance) rather than the first generic word that comes to mind.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'p1-home',
  lesson: LESSON,
  checklist: CHECKLIST,
};

const CHECK: SpokenFocusedTask = {
  kind: 'spoken-response',
  id: 'speaking-topic-vocabulary-check',
  subskill: 'topic-vocabulary-in-speech',
  paper: 'speaking',
  part: 1,
  role: 'independent-check',
  title: 'Part 1: a wider range of vocabulary, a different topic',
  objective: OBJECTIVE,
  instruction: 'A different topic, food. Answer one question with a wide range of vocabulary, on your own.',
  expectedMinutes: 5,
  provenance: 'project-authored',
  promptId: 'p1-food',
  lesson: LESSON,
  checklist: CHECKLIST,
};

export const SPEAKING_TOPIC_VOCABULARY: readonly SpokenFocusedTask[] = [GUIDED, CHECK];
