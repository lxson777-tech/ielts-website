/* The parts of the Listening section, mirroring READING_PARTS. The first
   group is the four recordings themselves, each with its own page at
   /lessons/listening/<slug> rendered from
   src/content/lesson-bodies/listening-<slug>.html. The second group is
   every official question type the Listening paper can use, so students can
   drill a type across all four parts instead of only by recording. Drives
   the listening overview cards, the top-nav dropdown, and prev/next links. */

export type ListeningGroup = 'parts' | 'types';

export const LISTENING_GROUPS: { id: ListeningGroup; label: string; blurb: string }[] = [
  { id: 'parts', label: 'The four parts', blurb: 'What each part sounds like and how to prepare for it.' },
  { id: 'types', label: 'Question types', blurb: 'Every question format the Listening paper can use.' },
];

export interface ListeningPart {
  slug: string;
  title: string;
  blurb: string;
  group: ListeningGroup;
}

export const LISTENING_PARTS: ListeningPart[] = [
  {
    slug: 'part1',
    title: 'Part 1. Everyday Conversation',
    group: 'parts',
    blurb: 'Forms, bookings and registrations: catch names, numbers and spellings.',
  },
  {
    slug: 'part2',
    title: 'Part 2. Monologue & Maps',
    group: 'parts',
    blurb: 'Follow a single speaker around a map, tour or announcement.',
  },
  {
    slug: 'part3',
    title: 'Part 3. Academic Discussion',
    group: 'parts',
    blurb: 'Track multiple speakers, dodge distractors, and catch corrections.',
  },
  {
    slug: 'part4',
    title: 'Part 4. Academic Lecture',
    group: 'parts',
    blurb: 'Complete notes from a fast, dense university-style talk.',
  },
  {
    slug: 'multiple-choice',
    title: 'Multiple Choice',
    group: 'types',
    blurb: 'Pick the correct option, or two, from a list while the recording plays.',
  },
  {
    slug: 'matching',
    title: 'Matching',
    group: 'types',
    blurb: 'Match items from a list to the options given, such as speakers to opinions or plans to features.',
  },
  {
    slug: 'map-labelling',
    title: 'Plan, Map & Diagram Labelling',
    group: 'types',
    blurb: 'Label a map, plan or diagram by following directions given in the recording.',
  },
  {
    slug: 'form-completion',
    title: 'Form, Note, Table & Flow-chart Completion',
    group: 'types',
    blurb: 'Fill gaps in a form, notes, a table or a flow-chart with words or numbers you hear.',
  },
  {
    slug: 'sentence-completion',
    title: 'Sentence Completion',
    group: 'types',
    blurb: 'Complete sentences with words taken directly from the recording, within the word limit.',
  },
  {
    slug: 'short-answer',
    title: 'Short-answer Questions',
    group: 'types',
    blurb: 'Answer questions with a short answer taken from the recording, within the word limit.',
  },
];

export function getListeningPart(slug: string): ListeningPart | undefined {
  return LISTENING_PARTS.find((p) => p.slug === slug);
}
