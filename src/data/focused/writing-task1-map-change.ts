/* Task 1, map change language: what a place became, and where, using the
 * vocabulary a plan needs (was replaced by, was built, was demolished,
 * located to the north) rather than trend language borrowed from a chart.
 *
 * Both the guided task and the check are map prompts. Real exam prompts and
 * models only, reused with the publisher's permission confirmed on
 * 11 September 2026 (see writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Describe one change between the two maps using location and change language (was replaced by, was built, was demolished, changed into, to the north), never trend language borrowed from a chart.';

const LESSON = { key: 'writing-maps', blockHeading: 'Key Language' } as const;

const RULES = {
  minWords: 30,
  maxWords: 90,
  checks: ['has-change-language', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'It names what was there before and what is there now, in the same sentence, rather than describing only the final map.',
  'It uses the passive for what happened to the place itself (was replaced, was built, was demolished), which is the natural voice here because nobody in the picture did the building.',
  'It gives a location, using a compass direction or a position relative to something fixed on the map, so the change can be placed rather than only named.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-map-change-guided',
  subskill: 'task1-map-change',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 1 map change language: guided practice',
  objective: OBJECTIVE,
  instruction: 'Write one paragraph describing one clear change between the two maps, with its location.',
  expectedMinutes: 8,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-130-task1', task: 'task1', form: 'map', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  piece: 'paragraph',
  modelParagraphIndex: 2,
  guidingQuestions: [
    'Pick one change: something added, something removed, or something that changed from one use to another.',
    'What was there before, and what is there now? Say both.',
    'Where on the map is it? Use a compass direction or its position next to something that did not change.',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-map-change-check',
  subskill: 'task1-map-change',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 1 map change language: independent check',
  objective: OBJECTIVE,
  instruction: 'A pair of maps you have not seen. Describe one change between them, with its location, on your own.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-122-task1', task: 'task1', form: 'map', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  piece: 'paragraph',
  modelParagraphIndex: 2,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK1_MAP_CHANGE: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
