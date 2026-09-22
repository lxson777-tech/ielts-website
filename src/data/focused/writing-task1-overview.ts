/* Writing Task 1, the overview: the second end to end teaching flow.
 *
 * Four tasks on four real exam prompts from the library (PracticePTEOnline,
 * reused with the publisher's permission confirmed on 11 September 2026).
 * Nothing here is written by this project: the chart, the question wording,
 * the guiding questions in src/data/writing-plans.ts and the band 8 model
 * answer all already existed. What is new is the instruction to write ONLY
 * the overview, and the one sentence it is judged against.
 *
 * WHY AN OVERVIEW AND NOT A WHOLE REPORT
 * The smallest piece of Writing practice in the library is a twenty minute
 * graded Task 1, which is too big to sit between a teaching block and a
 * check, and too big for a fifteen minute diagnostic sample. That is why
 * the planner could not diagnose Writing at all. Two sentences about the
 * main trends takes six to eight minutes, produces something a teacher
 * would recognise, and is honest about what it can and cannot show: it is
 * never a band, and the full graded task keeps that job.
 *
 * ONE IS FOR PRACTICE, THREE ARE HELD BACK
 * The guided task is worked with the prompt's own guiding questions
 * available, the model overview offered afterwards, and a revision
 * recorded as assisted. It can never show what a student can do alone. The
 * three checks are the opposite and their prompts are RESERVED, so the
 * plan cannot spend them on an ordinary essay first.
 *
 * WHY THREE CHECKS, AND WHY THESE PROMPTS
 * Transfer is checked on the SAME visual family first, because an overview
 * of a bar chart and an overview of a process diagram are not the same
 * move, and on a DIFFERENT family afterwards, because that is what shows
 * the method rather than the habit. A third is held back because the short
 * overview task is also the Writing diagnostic sample, so a student who has
 * been sampled has already spent one before any teaching happened.
 *
 *   guided   129  chart    Jobs in four sectors of the economy
 *   check A  117  chart    Population in four Asian countries living in cities
 *   check B  112  process  The process for recycling plastic bottles
 *   check C  126  map      The site of a farm in 1950
 *
 * All four carry four "Build your overview" guiding questions written on
 * 19 September 2026, a band 8 model whose second paragraph is the overview,
 * and their own chart image inside the prompt markup.
 */

import type { WrittenFocusedTask } from '../focused-exercises';

/** The one sentence every task here is judged against, word for word.
 *
 *  The Worker reads this from the catalogue, never from the request, so it
 *  is what the model is actually held to. It names the three things the
 *  band descriptors ask of an overview and nothing else: what it must
 *  state, what it must leave out, and that it must be its own paragraph. */
const OBJECTIVE =
  'Write an overview that states the main trends or the main features of the visual, with no specific figures, clearly separate from the detail.';

/** The teaching block behind all four: the paragraph of the Task 1 method
    lesson that says what each of the four paragraphs is for. Found by its
    heading, so rewriting the lesson's order cannot quietly point the help
    at a different paragraph. */
const LESSON = { key: 'writing-method', blockHeading: 'The Four Paragraphs' } as const;

/** Roughly two sentences. Wide enough that a careful student is not fighting
    the counter, tight enough that a whole report is not an overview. */
const RULES = {
  minWords: 25,
  maxWords: 70,
  checks: ['summarising-signal', 'two-main-features', 'no-figures', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

/** What to look at in the band 8 overview once the student has written
    their own. Never "copy this": what the writer DID, so the student can
    look for the same move in their own sentence. */
const NOTICE = [
  'It opens with a summarising word, so the reader knows at once that this is the big picture and not another detail.',
  'It names the shape of the whole visual, the direction or the standout group, rather than working through the categories one by one.',
  'It carries no figures at all. Every number in the model answer is saved for the two detail paragraphs.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-overview-guided',
  subskill: 'task1-overview',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 1 overview: guided practice',
  objective: OBJECTIVE,
  instruction:
    'Write the overview for this chart and nothing else. One or two sentences on the main trends, with no figures.',
  expectedMinutes: 8,
  provenance: 'publisher',
  source: {
    promptId: 'pte-wt-129-task1',
    task: 'task1',
    form: 'chart',
    attribution: ATTRIBUTION,
  },
  lesson: LESSON,
  rules: RULES,
  piece: 'overview',
  noticeInTheModel: NOTICE,
};

/** The same visual family as the guided task, because transfer to a
    different chart is the first thing worth showing. */
const CHECK_A: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-overview-check-a',
  subskill: 'task1-overview',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 1 overview: independent check',
  objective: OBJECTIVE,
  instruction:
    'A chart you have not seen. Write only its overview, on your own: no guiding questions, no model, no Mr EZ.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: {
    promptId: 'pte-wt-117-task1',
    task: 'task1',
    form: 'chart',
    attribution: ATTRIBUTION,
  },
  lesson: LESSON,
  rules: RULES,
  piece: 'overview',
  noticeInTheModel: NOTICE,
};

/** A different visual family. An overview of a process is a different move
    from an overview of a bar chart, so this is the one that shows the
    method rather than a remembered sentence. */
const CHECK_B: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-overview-check-b',
  subskill: 'task1-overview',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 1 overview: a different kind of visual',
  objective: OBJECTIVE,
  instruction:
    'A process diagram this time, which you have not seen. Write only its overview, on your own.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: {
    promptId: 'pte-wt-112-task1',
    task: 'task1',
    form: 'process',
    attribution: ATTRIBUTION,
  },
  lesson: LESSON,
  rules: RULES,
  piece: 'overview',
  noticeInTheModel: NOTICE,
};

/** The third unseen prompt. The short overview task is also the Writing
    diagnostic sample, so a student who was sampled in their first week has
    already spent one of these before any teaching happened. */
const CHECK_C: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-task1-overview-check-c',
  subskill: 'task1-overview',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 1 overview: a third unseen visual',
  objective: OBJECTIVE,
  instruction: 'A pair of maps, which you have not seen. Write only the overview, on your own.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: {
    promptId: 'pte-wt-126-task1',
    task: 'task1',
    form: 'map',
    attribution: ATTRIBUTION,
  },
  lesson: LESSON,
  rules: RULES,
  piece: 'overview',
  noticeInTheModel: NOTICE,
};

export const WRITING_TASK1_OVERVIEW: readonly WrittenFocusedTask[] = [GUIDED, CHECK_A, CHECK_B, CHECK_C];
