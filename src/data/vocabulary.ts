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
import { nt } from '../lib/i18n/translate';

export type VocabularyPart = Sequenced;

const TOPIC_EYEBROW = nt('10 words · collocations · exercise');

export const VOCABULARY_PARTS: VocabularyPart[] = [
  {
    slug: 'conjunctions',
    title: nt('Conjunctions & Linking Words'),
    blurb: nt('Although, whereas, therefore, provided that. The linking words that lift Coherence and Cohesion.'),
    stage: 1,
    eyebrow: nt('18 words · 6 functions · exercise'),
    minutes: 10,
  },
  {
    slug: 'environment',
    title: nt('Environment & Ecology'),
    blurb: nt('Climate, energy and conservation. The most common essay topic of all.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'education',
    title: nt('Education & Learning'),
    blurb: nt('Schools, universities and lifelong learning. A Speaking Part 3 favourite.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'technology',
    title: nt('Technology & Society'),
    blurb: nt('Innovation, automation and digital life, with ready-made essay phrases.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'work',
    title: nt('Work & Employment'),
    blurb: nt('The gig economy, redundancy and the four-day week. The most common Speaking Part 1 topic.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'health',
    title: nt('Health & Wellbeing'),
    blurb: nt('Public health, lifestyle and healthcare systems vocabulary.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'society',
    title: nt('Society, Culture & Globalisation'),
    blurb: nt('Inequality, migration and cultural identity for high-band essays.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'crime',
    title: nt('Crime & Law'),
    blurb: nt('Punishment, rehabilitation and the causes of crime. Around 1 in 10 Task 2 essays.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'government',
    title: nt('Government & Economy'),
    blurb: nt('Taxation, public spending and the cost of living for policy-focused essays.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'ai',
    title: nt('Artificial Intelligence'),
    blurb: nt('Automation, machine learning and job displacement. The fastest-growing essay theme of 2026.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'social-media',
    title: nt('Social Media & Digital Life'),
    blurb: nt('Echo chambers, influencers and screen time. A constant Speaking Part 1-3 topic.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'travel',
    title: nt('Travel & Tourism'),
    blurb: nt('Overtourism, eco-tourism and transport. A Speaking and Writing regular.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'housing',
    title: nt('Housing & Urban Life'),
    blurb: nt('Affordability, gentrification and city planning for urban-development essays.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
  {
    slug: 'family',
    title: nt('Family & Relationships'),
    blurb: nt('Family structure, childcare and generational change. A Speaking Part 1-2 staple.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 10,
  },
];

export function getVocabularyPart(slug: string): VocabularyPart | undefined {
  return VOCABULARY_PARTS.find((p) => p.slug === slug);
}
