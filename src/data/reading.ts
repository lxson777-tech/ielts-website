/* The parts of the Reading section. Each has its own page at
   /lessons/reading/<slug> rendered from the matching fragment
   src/content/lesson-bodies/reading-<slug>.html. Drives the reading
   landing-page cards, the top-nav Reading dropdown, and prev/next links. */

export interface ReadingPart {
  slug: string;
  title: string;
  blurb: string;
}

export const READING_PARTS: ReadingPart[] = [
  { slug: 'tfng', title: 'True / False / Not Given', blurb: 'Decide whether statements agree with the text — and learn what "Not Given" really means.' },
  { slug: 'mc', title: 'Multiple Choice', blurb: 'Pick the right option and dodge the distractors designed to catch skimmers.' },
  { slug: 'diagram', title: 'Diagram Labelling', blurb: 'Label a diagram or process using exact words from the passage.' },
  { slug: 'headings', title: 'Matching Headings', blurb: 'Match each paragraph to its main idea, not just repeated words.' },
  { slug: 'sentence', title: 'Sentence Completion', blurb: 'Fill the gaps within the word limit, keeping the sentence grammatical.' },
  { slug: 'para', title: 'Matching Paragraphs', blurb: 'Find which paragraph contains a specific piece of information.' },
  { slug: 'cat', title: 'Categorisation', blurb: 'Sort statements into the categories the passage describes.' },
];

export function getReadingPart(slug: string): ReadingPart | undefined {
  return READING_PARTS.find((p) => p.slug === slug);
}
