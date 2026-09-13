/* The parts of the Speaking section, mirroring READING_PARTS and
   WRITING_PARTS. Each part has its own page at /lessons/speaking/<slug>
   rendered from the matching fragment
   src/content/lesson-bodies/speaking-<slug>.html. Drives the speaking
   overview cards, the top-nav Speaking dropdown, and prev/next links.

   Order is unchanged by the foundation-first pass: parts 1-3 are already
   both the interview order and a genuine difficulty ramp. */

import type { Sequenced } from './lessons';

export type SpeakingPart = Sequenced;

export const SPEAKING_PARTS: SpeakingPart[] = [
  {
    slug: 'part1',
    title: 'Part 1 Interview',
    blurb: 'Handle the warm-up interview questions with natural, extended answers.',
    stage: 2,
    image: '/pics/speaking-part1.png',
  },
  {
    slug: 'part2',
    title: 'Part 2 Cue Card',
    blurb: 'Speak for two minutes from a cue card without running dry.',
    stage: 2,
    image: '/pics/speaking-part2.png',
  },
  {
    slug: 'part3',
    title: 'Part 3 Discussion',
    blurb: 'Discuss abstract follow-up questions and show off complex language.',
    stage: 3,
    image: '/pics/speaking-part3.png',
  },
];

export function getSpeakingPart(slug: string): SpeakingPart | undefined {
  return SPEAKING_PARTS.find((p) => p.slug === slug);
}
