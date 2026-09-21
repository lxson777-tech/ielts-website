/* The parts of the Speaking section, mirroring READING_PARTS and
   WRITING_PARTS. Each part has its own page at /lessons/speaking/<slug>
   rendered from the matching fragment
   src/content/lesson-bodies/speaking-<slug>.html. Drives the speaking
   overview cards, the top-nav Speaking dropdown, and prev/next links.

   Order is unchanged by the foundation-first pass: parts 1-3 are already
   both the interview order and a genuine difficulty ramp. */

import type { Sequenced } from './lessons';
import { nt } from '../lib/i18n/translate';

export type SpeakingPart = Sequenced;

export const SPEAKING_PARTS: SpeakingPart[] = [
  {
    slug: 'part1',
    title: nt('Part 1 Interview'),
    blurb: nt('Handle the warm-up interview questions with natural, extended answers.'),
    stage: 2,
    image: '/pics/speaking-part1.png',
    minutes: 20,
  },
  {
    slug: 'part2',
    title: nt('Part 2 Cue Card'),
    blurb: nt('Speak for two minutes from a cue card without running dry.'),
    stage: 2,
    image: '/pics/speaking-part2.png',
    minutes: 25,
  },
  {
    slug: 'part3',
    title: nt('Part 3 Discussion'),
    blurb: nt('Discuss abstract follow-up questions and show off complex language.'),
    stage: 3,
    image: '/pics/speaking-part3.png',
    minutes: 30,
  },
];

export function getSpeakingPart(slug: string): SpeakingPart | undefined {
  return SPEAKING_PARTS.find((p) => p.slug === slug);
}
