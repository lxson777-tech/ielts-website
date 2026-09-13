/* The parts of the Reading section. Each has its own page at
   /lessons/reading/<slug> rendered from the matching fragment
   src/content/lesson-bodies/reading-<slug>.html. Drives the reading
   landing-page cards, the top-nav Reading dropdown, and prev/next links.

   Ordered foundation-first: paraphrase spotting underlies every other
   question type, then the mechanical types that build confidence, then
   the inferential ones. Array position is the lesson number, see
   sequence() in lessons.ts. */

import type { Sequenced } from './lessons';

export type ReadingPart = Sequenced;

export const READING_PARTS: ReadingPart[] = [
  { slug: 'paraphrase', title: 'Paraphrase Spotting', blurb: 'The skill behind every question type: recognising when the passage says the same thing in different words.', stage: 1, image: '/pics/reading/quiz.png' },
  { slug: 'tfng', title: 'True / False / Not Given', blurb: 'Decide whether statements agree with the text. And learn what "Not Given" really means.', stage: 2, image: '/pics/reading/tfng.png' },
  { slug: 'ynng', title: 'Yes / No / Not Given', blurb: 'The same three answers, but about the writer\'s opinions rather than the passage\'s facts.', stage: 2, image: '/pics/reading/ynng.png' },
  { slug: 'sentence', title: 'Sentence Completion', blurb: 'Fill the gaps within the word limit, keeping the sentence grammatical.', stage: 2, image: '/pics/reading/sentence.png' },
  { slug: 'summary', title: 'Summary Completion', blurb: 'Fill gaps in a summary, note, table or flow chart, with or without a word list.', stage: 2, image: '/pics/reading/summary.png' },
  { slug: 'shortanswer', title: 'Short-Answer Questions', blurb: 'The most mechanical type in the paper. Copy the answer, respect the word limit.', stage: 2, image: '/pics/reading/shortanswer.png' },
  { slug: 'mc', title: 'Multiple Choice', blurb: 'Pick the right option and dodge the distractors designed to catch skimmers.', stage: 2, image: '/pics/reading/mc.png' },
  { slug: 'para', title: 'Matching Paragraphs', blurb: 'Find which paragraph contains a specific piece of information.', stage: 2, image: '/pics/reading/para.png' },
  { slug: 'endings', title: 'Matching Sentence Endings', blurb: 'Complete each sentence from a longer list of endings, using grammar to eliminate.', stage: 3, image: '/pics/reading/endings.png' },
  { slug: 'headings', title: 'Matching Headings', blurb: 'Match each paragraph to its main idea, not just repeated words.', stage: 3, image: '/pics/reading/headings.png' },
  { slug: 'cat', title: 'Categorisation', blurb: 'Sort statements into the categories the passage describes.', stage: 3, image: '/pics/reading/cat.png' },
  { slug: 'diagram', title: 'Diagram Labelling', blurb: 'Label a diagram or process using exact words from the passage.', stage: 3, image: '/pics/reading/diagram.png' },
];

export function getReadingPart(slug: string): ReadingPart | undefined {
  return READING_PARTS.find((p) => p.slug === slug);
}
