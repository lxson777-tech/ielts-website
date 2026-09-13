/* The parts of the Reading section. Each has its own page at
   /lessons/reading/<slug> rendered from the matching fragment
   src/content/lesson-bodies/reading-<slug>.html. Drives the reading
   landing-page cards, the top-nav Reading dropdown, and prev/next links.

   Matches the official IELTS Reading question types (2026-09 restructure):
   one "core skill" lesson that underlies every type, then every type
   grouped by what it asks the student to do.

   Two orderings live side by side. `group` is how this page presents the
   lessons to someone browsing; `stage` is the cross-section spine used by
   /start, the course and the study plan (see Sequenced in lessons.ts).
   Array position is the lesson number within the section. */

import type { Sequenced } from './lessons';

export type ReadingGroup = 'skill' | 'choose' | 'matching' | 'completion';

export const READING_GROUPS: { id: ReadingGroup; label: string; blurb: string }[] = [
  { id: 'skill', label: 'Core skill', blurb: 'The one skill every question type tests.' },
  { id: 'choose', label: 'Choose the right option', blurb: 'Pick a letter or decide True, False or Not Given.' },
  { id: 'matching', label: 'Matching', blurb: 'Match statements, headings or sentence halves to the passage.' },
  { id: 'completion', label: 'Completion', blurb: 'Write words from the passage into gaps.' },
];

export type ReadingPart = Sequenced & { group: ReadingGroup };

export const READING_PARTS: ReadingPart[] = [
  {
    slug: 'paraphrase',
    title: 'Spotting Paraphrase',
    group: 'skill',
    stage: 1,
    image: '/pics/reading/quiz.png',
    blurb: 'Not a question type, but the skill behind all of them: recognising the same idea in different words.',
  },
  {
    slug: 'mc',
    title: 'Multiple Choice',
    group: 'choose',
    stage: 2,
    image: '/pics/reading/mc.png',
    blurb: 'Pick the right option and dodge the distractors designed to catch skimmers.',
  },
  {
    slug: 'tfng',
    title: 'True / False / Not Given',
    group: 'choose',
    stage: 2,
    image: '/pics/reading/tfng.png',
    blurb: 'Decide whether statements agree with the facts in the text, and learn what "Not Given" really means.',
  },
  {
    slug: 'ynng',
    title: 'Yes / No / Not Given',
    group: 'choose',
    stage: 2,
    image: '/pics/reading/ynng.png',
    blurb: "Decide whether statements match the writer's opinions and claims, not the facts in the text.",
  },
  {
    slug: 'headings',
    title: 'Matching Headings',
    group: 'matching',
    stage: 3,
    image: '/pics/reading/headings.png',
    blurb: 'Match each paragraph to its main idea, not just repeated words.',
  },
  {
    slug: 'matching-information',
    title: 'Matching Information',
    group: 'matching',
    stage: 2,
    image: '/pics/reading/para.png',
    blurb: 'Find which paragraph contains a specific piece of information.',
  },
  {
    slug: 'matching-features',
    title: 'Matching Features',
    group: 'matching',
    stage: 3,
    image: '/pics/reading/cat.png',
    blurb: 'Match statements to people, theories, places or dates. Some books call this classification.',
  },
  {
    slug: 'matching-sentence-endings',
    title: 'Matching Sentence Endings',
    group: 'matching',
    stage: 2,
    image: '/pics/reading/endings.png',
    blurb: 'Match the start of a sentence to the ending that correctly completes it, using the passage.',
  },
  {
    slug: 'sentence',
    title: 'Sentence Completion',
    group: 'completion',
    stage: 2,
    image: '/pics/reading/sentence.png',
    blurb: 'Fill the gaps within the word limit, keeping the sentence grammatical.',
  },
  {
    slug: 'summary-completion',
    title: 'Summary, Note, Table & Flow-chart Completion',
    group: 'completion',
    stage: 2,
    image: '/pics/reading/summary.png',
    blurb: 'Fill gaps in a summary, a set of notes, a table or a flow-chart using words taken from the passage.',
  },
  {
    slug: 'diagram',
    title: 'Diagram Label Completion',
    group: 'completion',
    stage: 3,
    image: '/pics/reading/diagram.png',
    blurb: 'Label a diagram or process using exact words from the passage.',
  },
  {
    slug: 'short-answer',
    title: 'Short-answer Questions',
    group: 'completion',
    stage: 2,
    image: '/pics/reading/shortanswer.png',
    blurb: 'Answer questions with a word limit, taking the answer straight from the passage.',
  },
];

export function getReadingPart(slug: string): ReadingPart | undefined {
  return READING_PARTS.find((p) => p.slug === slug);
}
