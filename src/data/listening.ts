/* The parts of the Listening section, mirroring READING_PARTS. Each of the
   four recordings has its own page at /lessons/listening/<slug> rendered
   from src/content/lesson-bodies/listening-<slug>.html. Drives the
   listening overview cards, the top-nav dropdown, and prev/next links. */

export interface ListeningPart {
  slug: string;
  title: string;
  blurb: string;
}

export const LISTENING_PARTS: ListeningPart[] = [
  {
    slug: 'section1',
    title: 'Section 1 — Everyday Conversation',
    blurb: 'Forms, bookings and registrations: catch names, numbers and spellings.',
  },
  {
    slug: 'section2',
    title: 'Section 2 — Monologue & Maps',
    blurb: 'Follow a single speaker around a map, tour or announcement.',
  },
  {
    slug: 'section3',
    title: 'Section 3 — Academic Discussion',
    blurb: 'Track multiple speakers, dodge distractors, and catch corrections.',
  },
  {
    slug: 'section4',
    title: 'Section 4 — Academic Lecture',
    blurb: 'Complete notes from a fast, dense university-style talk.',
  },
];

export function getListeningPart(slug: string): ListeningPart | undefined {
  return LISTENING_PARTS.find((p) => p.slug === slug);
}
