/* The parts of the Vocabulary section, mirroring READING_PARTS. Each topic
   has its own page at /lessons/vocabulary/<slug> rendered from
   src/content/lesson-bodies/vocabulary-<slug>.html. Drives the vocabulary
   overview cards, the top-nav dropdown, and prev/next links.

   Conjunctions comes first because it is the one entry with a real
   dependency: linking words are the connective tissue every essay and
   Part 3 answer needs, and nothing else here depends on anything. The
   topics after it have no pedagogical order between them, so they run in
   descending exam frequency rather than a pretend progression.

   Every topic lesson teaches twenty words: a first table of ten, then a
   "Go Further" table of ten more for students who already know the first
   set. Conjunctions is the exception at eighteen, grouped by function
   rather than split into two tables. */

import type { Sequenced } from './lessons';

export type VocabularyPart = Sequenced;

const TOPIC_EYEBROW = '20 words · collocations · exercise';

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
    minutes: 15,
  },
  {
    slug: 'education',
    title: 'Education & Learning',
    blurb: 'Schools, universities and lifelong learning. A Speaking Part 3 favourite.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'technology',
    title: 'Technology & Society',
    blurb: 'Innovation, automation and digital life, with ready-made essay phrases.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'work',
    title: 'Work & Employment',
    blurb: 'The gig economy, redundancy and the four-day week. The most common Speaking Part 1 topic.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'health',
    title: 'Health & Wellbeing',
    blurb: 'Public health, lifestyle and healthcare systems vocabulary.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'food',
    title: 'Food & Diet',
    blurb: 'Fast food, food waste and what a balanced diet is. A Speaking Part 1 and health-essay regular.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'transport',
    title: 'Transport & Traffic',
    blurb: 'Congestion, commuting and cleaner vehicles. The language every city-problems essay needs.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'leisure',
    title: 'Leisure & Entertainment',
    blurb: 'Hobbies, films, music and books. The everyday language Speaking Parts 1 and 2 ask for most.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'sport',
    title: 'Sport & Fitness',
    blurb: 'Team sport, fitness and hosting major events. A Speaking staple and a frequent Task 2 subject.',
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'society',
    title: 'Society, Culture & Globalisation',
    blurb: 'Inequality, migration and cultural identity for high-band essays.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'crime',
    title: 'Crime & Law',
    blurb: 'Punishment, rehabilitation and the causes of crime. Around 1 in 10 Task 2 essays.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'government',
    title: 'Government & Economy',
    blurb: 'Taxation, public spending and the cost of living for policy-focused essays.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'money',
    title: 'Money & Consumerism',
    blurb: 'Debt, spending and the throwaway culture. The vocabulary behind most consumer-society essays.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'ai',
    title: 'Artificial Intelligence',
    blurb: 'Automation, machine learning and job displacement. The fastest-growing essay theme of 2026.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'social-media',
    title: 'Social Media & Digital Life',
    blurb: 'Echo chambers, influencers and screen time. A constant Speaking Part 1-3 topic.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'media',
    title: 'Media & Advertising',
    blurb: 'The press, fake news and how advertising works on us. A classic Task 2 pairing.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'travel',
    title: 'Travel & Tourism',
    blurb: 'Overtourism, eco-tourism and transport. A Speaking and Writing regular.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'housing',
    title: 'Housing & Urban Life',
    blurb: 'Affordability, gentrification and city planning for urban-development essays.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'family',
    title: 'Family & Relationships',
    blurb: 'Family structure, childcare and generational change. A Speaking Part 1-2 staple.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'language',
    title: 'Language & Communication',
    blurb: 'Learning languages, dying languages and a single world language. A recurring Task 2 question.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'arts',
    title: 'Arts & Culture',
    blurb: 'Museums, creativity and whether governments should fund the arts. A frequent opinion essay.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'science',
    title: 'Science & Space',
    blurb: 'Research, evidence and space exploration. The language for "is this money well spent" essays.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'animals',
    title: 'Animals & Wildlife',
    blurb: 'Endangered species, zoos and animal testing. A common environment and ethics topic.',
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
];

export function getVocabularyPart(slug: string): VocabularyPart | undefined {
  return VOCABULARY_PARTS.find((p) => p.slug === slug);
}
