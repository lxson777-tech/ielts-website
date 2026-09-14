/* The parts of the Vocabulary section, mirroring READING_PARTS. Each topic
   has its own page at /lessons/vocabulary/<slug> rendered from
   src/content/lesson-bodies/vocabulary-<slug>.html. Drives the vocabulary
   overview cards, the top-nav dropdown, and prev/next links.

   Conjunctions comes first because it is the one entry with a real
   dependency: linking words are the connective tissue every essay and
   Part 3 answer needs, and nothing else here depends on anything. The
   topics after it have no pedagogical order between them, so they run in
   descending exam frequency rather than a pretend progression. */

import type { Sequenced } from './lessons';

export type VocabularyPart = Sequenced;

const TOPIC_EYEBROW = '10 words · collocations · exercise';

export const VOCABULARY_PARTS: VocabularyPart[] = [
  {
    slug: 'conjunctions',
    title: 'Conjunctions & Linking Words',
    blurb: 'Although, whereas, therefore, provided that. The linking words that lift Coherence and Cohesion.',
    stage: 1,
    eyebrow: '18 words · 6 functions · exercise',
    minutes: 10,
  },
  {
    slug: 'environment',
    title: 'Environment & Ecology',
    blurb: 'Climate, energy and conservation. The most common essay topic of all.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'education',
    title: 'Education & Learning',
    blurb: 'Schools, universities and lifelong learning. A Speaking Part 3 favourite.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'technology',
    title: 'Technology & Society',
    blurb: 'Innovation, automation and digital life, with ready-made essay phrases.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'work',
    title: 'Work & Employment',
    blurb: 'The gig economy, redundancy and the four-day week. The most common Speaking Part 1 topic.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'health',
    title: 'Health & Wellbeing',
    blurb: 'Public health, lifestyle and healthcare systems vocabulary.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'society',
    title: 'Society, Culture & Globalisation',
    blurb: 'Inequality, migration and cultural identity for high-band essays.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'crime',
    title: 'Crime & Law',
    blurb: 'Punishment, rehabilitation and the causes of crime. Around 1 in 10 Task 2 essays.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'government',
    title: 'Government & Economy',
    blurb: 'Taxation, public spending and the cost of living for policy-focused essays.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'ai',
    title: 'Artificial Intelligence',
    blurb: 'Automation, machine learning and job displacement. The fastest-growing essay theme of 2026.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'social-media',
    title: 'Social Media & Digital Life',
    blurb: 'Echo chambers, influencers and screen time. A constant Speaking Part 1-3 topic.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'travel',
    title: 'Travel & Tourism',
    blurb: 'Overtourism, eco-tourism and transport. A Speaking and Writing regular.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'housing',
    title: 'Housing & Urban Life',
    blurb: 'Affordability, gentrification and city planning for urban-development essays.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'family',
    title: 'Family & Relationships',
    blurb: 'Family structure, childcare and generational change. A Speaking Part 1-2 staple.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
];

export function getVocabularyPart(slug: string): VocabularyPart | undefined {
  return VOCABULARY_PARTS.find((p) => p.slug === slug);
}
