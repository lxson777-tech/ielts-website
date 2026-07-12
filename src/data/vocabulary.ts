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
  {
    slug: 'ai',
    title: 'Artificial Intelligence',
    blurb: 'Automation, machine learning and job displacement — the fastest-growing essay theme of 2026.',
  },
  {
    slug: 'social-media',
    title: 'Social Media & Digital Life',
    blurb: 'Echo chambers, influencers and screen time — a constant Speaking Part 1–3 topic.',
  },
  {
    slug: 'crime',
    title: 'Crime & Law',
    blurb: 'Punishment, rehabilitation and the causes of crime — around 1 in 10 Task 2 essays.',
  },
  {
    slug: 'work',
    title: 'Work & Employment',
    blurb: 'The gig economy, redundancy and the four-day week — the most common Speaking Part 1 topic.',
  },
  {
    slug: 'government',
    title: 'Government & Economy',
    blurb: 'Taxation, public spending and the cost of living for policy-focused essays.',
  },
  {
    slug: 'travel',
    title: 'Travel & Tourism',
    blurb: 'Overtourism, eco-tourism and transport — a Speaking and Writing regular.',
  },
  {
    slug: 'housing',
    title: 'Housing & Urban Life',
    blurb: 'Affordability, gentrification and city planning for urban-development essays.',
  },
  {
    slug: 'family',
    title: 'Family & Relationships',
    blurb: 'Family structure, childcare and generational change — a Speaking Part 1–2 staple.',
  },
  {
    slug: 'conjunctions',
    title: 'Conjunctions & Linking Words',
    blurb: 'Although, whereas, therefore, provided that — the linking words that lift Coherence and Cohesion.',
  },
];

export function getVocabularyPart(slug: string): VocabularyPart | undefined {
  return VOCABULARY_PARTS.find((p) => p.slug === slug);
}
