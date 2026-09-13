/* The parts of the Listening section, mirroring READING_PARTS. Each of the
   four recordings has its own page at /lessons/listening/<slug> rendered
   from src/content/lesson-bodies/listening-<slug>.html. Drives the
   listening overview cards, the top-nav dropdown, and prev/next links.

   Order is unchanged by the foundation-first pass: sections 1-4 are already
   both the exam order and a genuine difficulty ramp. */

import type { Sequenced } from './lessons';

export type ListeningPart = Sequenced;

export const LISTENING_PARTS: ListeningPart[] = [
  {
    slug: 'section1',
    title: 'Section 1. Everyday Conversation',
    blurb: 'Forms, bookings and registrations: catch names, numbers and spellings.',
    stage: 1,
    eyebrow: 'Two speakers · Form completion',
  },
  {
    slug: 'section2',
    title: 'Section 2. Monologue & Maps',
    blurb: 'Follow a single speaker around a map, tour or announcement.',
    stage: 2,
    eyebrow: 'One speaker · Maps & matching',
  },
  {
    slug: 'section3',
    title: 'Section 3. Academic Discussion',
    blurb: 'Track multiple speakers, dodge distractors, and catch corrections.',
    stage: 2,
    eyebrow: '2-4 speakers · Multiple choice',
  },
  {
    slug: 'section4',
    title: 'Section 4. Academic Lecture',
    blurb: 'Complete notes from a fast, dense university-style talk.',
    stage: 3,
    eyebrow: 'One speaker · Note completion',
  },
];

export function getListeningPart(slug: string): ListeningPart | undefined {
  return LISTENING_PARTS.find((p) => p.slug === slug);
}
