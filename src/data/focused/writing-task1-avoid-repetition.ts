/* Task 1, avoiding repetition through synonyms for trends and quantities: a
 * report with five or six figures has to say "rose" and "a large number of"
 * more than once, and a Lexical Resource comment names exactly this when it
 * is missing ("avoiding repetition of basic words", writing-method's own
 * "How the Four Criteria Apply to Task 1" table).
 *
 * Both prompts are charts with several figures to report, so the paragraph
 * genuinely needs more than one trend word. Real exam prompts only, reused
 * with the publisher's permission confirmed on 11 September 2026 (see
 * writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Report several figures without repeating the same trend or quantity word: vary rose, fell, a large number of and similar with real synonyms.';

const LESSON = { key: 'writing-method', blockHeading: 'How the Four Criteria Apply to Task 1' } as const;

const RULES = {
  minWords: 40,
  maxWords: 100,
  checks: ['has-trend-language', 'no-repeated-trend-word', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'When two figures move the same way, it does not use the same trend verb twice: it reaches for a synonym (rose, then climbed, then grew).',
  'Quantity phrases vary too: "a large number of" the first time, "the majority of" or "most" the second.',
  'Variety never comes at the cost of accuracy: every synonym still names the right direction and the right figure.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-avoid-repetition-guided',
  subskill: 'task1-avoid-repetition',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 1 repetition: guided practice',
  objective: OBJECTIVE,
  instruction:
    'Write one detail paragraph reporting at least three figures from the chart. Use a different trend or quantity word each time, never the same one twice.',
  expectedMinutes: 8,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-116-task1', task: 'task1', form: 'chart', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  piece: 'paragraph',
  modelParagraphIndex: 2,
  guidingQuestions: [
    'Which three or four figures are you reporting in this paragraph?',
    'For each one, what trend word fits (rose, fell, grew, climbed, dropped, declined)? Cross off any word you have already used.',
    'For quantities, what else could "a large number of" become the second time (the majority of, most, a significant proportion of)?',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-avoid-repetition-check',
  subskill: 'task1-avoid-repetition',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 1 repetition: independent check',
  objective: OBJECTIVE,
  instruction: 'A chart you have not seen. Write one paragraph reporting several figures with varied language, on your own.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-115-task1', task: 'task1', form: 'chart', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  piece: 'paragraph',
  modelParagraphIndex: 2,
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK1_AVOID_REPETITION: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
