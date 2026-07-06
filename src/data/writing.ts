/* The parts of the Writing section, mirroring READING_PARTS. Unlike the
   reading question types, the two task lessons live at flat URLs
   (/lessons/writing-task1, /lessons/writing-task2) that predate this
   structure — keep the slugs stable. Drives the top-nav Writing dropdown,
   the overview part-cards, and prev/next links. */

export interface WritingPart {
  slug: string;
  title: string;
  blurb: string;
}

export const WRITING_PARTS: WritingPart[] = [
  {
    slug: 'writing-task1',
    title: 'Task 1 Report',
    blurb: 'Describe charts, graphs and processes in a clear 150-word report.',
  },
  {
    slug: 'writing-task2',
    title: 'Task 2 Essay',
    blurb: 'Plan and write a well-structured 250-word essay that answers the question.',
  },
];

export function getWritingPart(slug: string): WritingPart | undefined {
  return WRITING_PARTS.find((p) => p.slug === slug);
}
