/* The parts of the Vocabulary section, mirroring READING_PARTS. Each topic
   has its own page at /lessons/vocabulary/<slug> rendered from
   src/content/lesson-bodies/vocabulary-<slug>.html. Drives the vocabulary
   overview cards, the top-nav dropdown, and prev/next links. */

export interface VocabularyPart {
  slug: string;
  title: string;
  blurb: string;
}

export const VOCABULARY_PARTS: VocabularyPart[] = [
  {
    slug: 'environment',
    title: 'Environment & Ecology',
    blurb: 'Climate, energy and conservation — the most common essay topic of all.',
  },
  {
    slug: 'technology',
    title: 'Technology & Society',
    blurb: 'Innovation, automation and digital life, with ready-made essay phrases.',
  },
  {
    slug: 'health',
    title: 'Health & Wellbeing',
    blurb: 'Public health, lifestyle and healthcare systems vocabulary.',
  },
  {
    slug: 'education',
    title: 'Education & Learning',
    blurb: 'Schools, universities and lifelong learning — a Speaking Part 3 favourite.',
  },
  {
    slug: 'society',
    title: 'Society, Culture & Globalisation',
    blurb: 'Inequality, migration and cultural identity for high-band essays.',
  },
];

export function getVocabularyPart(slug: string): VocabularyPart | undefined {
  return VOCABULARY_PARTS.find((p) => p.slug === slug);
}
