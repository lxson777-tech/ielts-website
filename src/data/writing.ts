/* The parts of the Writing section, mirroring READING_PARTS. Each question
   type has its own page at /lessons/writing/<slug> rendered from the
   matching fragment src/content/lesson-bodies/writing-<slug>.html.
   Drives the writing overview cards, the top-nav Writing dropdown,
   and prev/next links.

   Order is unchanged by the foundation-first pass: the task1-then-task2
   grouping with each method lesson at the head of its block is already
   foundation-first, and students think about Writing in that order.
   Note that `stage` deliberately runs out of step with array position
   here (both method lessons are stage 1, mid-block): section order and
   the cross-section spine are independent axes. */

import type { Sequenced } from './lessons';

export interface WritingPart extends Sequenced {
  /** Which exam task this type belongs to — also picks the checker CTA copy. */
  task: 'task1' | 'task2';
  /** Method lessons ("start here") are highlighted in the nav and overview. */
  featured?: boolean;
}

export const WRITING_PARTS: WritingPart[] = [
  { slug: 'method', title: 'How to Answer Task 1', blurb: 'The universal report method: analyse, paraphrase, overview, then two detail paragraphs.', task: 'task1', featured: true, stage: 1, eyebrow: 'One structure for all' },
  { slug: 'charts', title: 'Charts, Graphs & Tables', blurb: 'Report the key features of data without listing every number.', task: 'task1', stage: 2, eyebrow: 'Bar · line · pie · table' },
  { slug: 'process', title: 'Process Diagrams', blurb: 'Describe each stage in order using passives and sequencers.', task: 'task1', stage: 3, eyebrow: 'Passives & sequencing' },
  { slug: 'maps', title: 'Maps & Plans', blurb: 'Compare two maps and describe what changed, using location language.', task: 'task1', stage: 3, eyebrow: 'Describing change over time' },
  { slug: 'task2-method', title: 'How to Answer Task 2', blurb: 'The universal essay method: analyse the question, take a position, four paragraphs.', task: 'task2', featured: true, stage: 1, eyebrow: 'One structure for all' },
  { slug: 'opinion', title: 'Opinion Essays', blurb: 'State a clear position and defend it from the first paragraph to the last.', task: 'task2', stage: 2, eyebrow: 'Agree or disagree?' },
  { slug: 'discussion', title: 'Discussion Essays', blurb: 'Present both views fairly, then make your own opinion unmistakable.', task: 'task2', stage: 2, eyebrow: 'Discuss both views' },
  { slug: 'advantages', title: 'Advantages & Disadvantages Essays', blurb: 'Weigh benefits against drawbacks. And check whether the question wants your opinion too.', task: 'task2', stage: 3, eyebrow: 'Benefits vs drawbacks' },
  { slug: 'problem', title: 'Problem & Solution Essays', blurb: 'Analyse causes or problems, then propose realistic solutions.', task: 'task2', stage: 3, eyebrow: 'Causes & solutions' },
  { slug: 'twopart', title: 'Two-Part Questions', blurb: 'Answer both questions fully. Half an answer caps your band.', task: 'task2', stage: 3, eyebrow: 'Two direct questions' },
];

export function getWritingPart(slug: string): WritingPart | undefined {
  return WRITING_PARTS.find((p) => p.slug === slug);
}
