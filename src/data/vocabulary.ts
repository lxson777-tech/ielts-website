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
import { nt } from '../lib/i18n/translate';

export type VocabularyPart = Sequenced;

const TOPIC_EYEBROW = nt('20 words · collocations · exercise');

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
    minutes: 15,
  },
  {
    slug: 'education',
    title: nt('Education & Learning'),
    blurb: nt('Schools, universities and lifelong learning. A Speaking Part 3 favourite.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'technology',
    title: nt('Technology & Society'),
    blurb: nt('Innovation, automation and digital life, with ready-made essay phrases.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'work',
    title: nt('Work & Employment'),
    blurb: nt('The gig economy, redundancy and the four-day week. The most common Speaking Part 1 topic.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'health',
    title: nt('Health & Wellbeing'),
    blurb: nt('Public health, lifestyle and healthcare systems vocabulary.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'food',
    title: nt('Food & Diet'),
    blurb: nt('Fast food, food waste and what a balanced diet is. A Speaking Part 1 and health-essay regular.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'transport',
    title: nt('Transport & Traffic'),
    blurb: nt('Congestion, commuting and cleaner vehicles. The language every city-problems essay needs.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'leisure',
    title: nt('Leisure & Entertainment'),
    blurb: nt('Hobbies, films, music and books. The everyday language Speaking Parts 1 and 2 ask for most.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'people',
    title: nt('People & Personality'),
    blurb: nt('The words to describe character. Speaking Part 2 asks you to describe a person more than anything else.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'places',
    title: nt('Hometown & Describing Places'),
    blurb: nt('Every Speaking test opens with your hometown. The language to describe any place well.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'childhood',
    title: nt('Childhood & Growing Up'),
    blurb: nt('Memories, upbringing and growing up. Behind a large share of Part 2 cue cards.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'weather',
    title: nt('Weather, Seasons & Nature'),
    blurb: nt('Climate, seasons and the outdoors. A Speaking Part 1 regular and useful in environment essays.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'music-film',
    title: nt('Music, Film & Television'),
    blurb: nt('Talk about what you watch and listen to, with the words reviewers actually use.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'books',
    title: nt('Books & Reading'),
    blurb: nt('Reading habits, e-books and libraries. A Speaking Part 1 topic and a recurring essay question.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'sport',
    title: nt('Sport & Fitness'),
    blurb: nt('Team sport, fitness and hosting major events. A Speaking staple and a frequent Task 2 subject.'),
    stage: 2,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'society',
    title: nt('Society, Culture & Globalisation'),
    blurb: nt('Inequality, migration and cultural identity for high-band essays.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'crime',
    title: nt('Crime & Law'),
    blurb: nt('Punishment, rehabilitation and the causes of crime. Around 1 in 10 Task 2 essays.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'government',
    title: nt('Government & Economy'),
    blurb: nt('Taxation, public spending and the cost of living for policy-focused essays.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'money',
    title: nt('Money & Consumerism'),
    blurb: nt('Debt, spending and the throwaway culture. The vocabulary behind most consumer-society essays.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'ai',
    title: nt('Artificial Intelligence'),
    blurb: nt('Automation, machine learning and job displacement. The fastest-growing essay theme of 2026.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'social-media',
    title: nt('Social Media & Digital Life'),
    blurb: nt('Echo chambers, influencers and screen time. A constant Speaking Part 1-3 topic.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'media',
    title: nt('Media & Advertising'),
    blurb: nt('The press, fake news and how advertising works on us. A classic Task 2 pairing.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'travel',
    title: nt('Travel & Tourism'),
    blurb: nt('Overtourism, eco-tourism and transport. A Speaking and Writing regular.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'housing',
    title: nt('Housing & Urban Life'),
    blurb: nt('Affordability, gentrification and city planning for urban-development essays.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'family',
    title: nt('Family & Relationships'),
    blurb: nt('Family structure, childcare and generational change. A Speaking Part 1-2 staple.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'language',
    title: nt('Language & Communication'),
    blurb: nt('Learning languages, dying languages and a single world language. A recurring Task 2 question.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'arts',
    title: nt('Arts & Culture'),
    blurb: nt('Museums, creativity and whether governments should fund the arts. A frequent opinion essay.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'science',
    title: nt('Science & Space'),
    blurb: nt('Research, evidence and space exploration. The language for "is this money well spent" essays.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'animals',
    title: nt('Animals & Wildlife'),
    blurb: nt('Endangered species, zoos and animal testing. A common environment and ethics topic.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'business',
    title: nt('Business & Entrepreneurship'),
    blurb: nt('Start-ups, big corporations and who they answer to. Distinct from the money you spend.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'traditions',
    title: nt('Traditions, Festivals & Customs'),
    blurb: nt('Customs, festivals and what globalisation costs them. A frequent essay and cue card.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'fashion',
    title: nt('Fashion & Clothing'),
    blurb: nt('Clothes, uniforms and fast fashion. A Speaking Part 1 topic with a serious essay side.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'volunteering',
    title: nt('Volunteering & Community'),
    blurb: nt('Charities, community work and civic duty. Common in both Task 2 and Part 3.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'ageing',
    title: nt('Ageing & Retirement'),
    blurb: nt('Retirement age, elderly care and an ageing population. One of the most repeated essay themes.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
  {
    slug: 'success',
    title: nt('Success, Goals & Ambition'),
    blurb: nt('Achievement, failure and what success means. The abstract language Part 3 keeps asking for.'),
    stage: 3,
    eyebrow: TOPIC_EYEBROW,
    minutes: 15,
  },
];

export function getVocabularyPart(slug: string): VocabularyPart | undefined {
  return VOCABULARY_PARTS.find((p) => p.slug === slug);
}
