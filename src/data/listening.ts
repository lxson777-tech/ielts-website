/* The parts of the Listening section, mirroring READING_PARTS. The first
   group is the four recordings themselves, each with its own page at
   /lessons/listening/<slug> rendered from
   src/content/lesson-bodies/listening-<slug>.html. The second group is
   every official question type the Listening paper can use, so students can
   drill a type across all four parts instead of only by recording. Drives
   the listening overview cards, the top-nav dropdown, and prev/next links.

   Two orderings live here. `group` drives how the overview page and the nav
   cluster the lessons; `stage` is the cross-section spine used by /start,
   the course and the study plan (see Sequenced in lessons.ts). Array
   position is the lesson number within the section. */

import type { Sequenced } from './lessons';
import { nt } from '../lib/i18n/translate';

export type ListeningGroup = 'parts' | 'types';

export const LISTENING_GROUPS: { id: ListeningGroup; label: string; blurb: string }[] = [
  { id: 'parts', label: nt('The four parts'), blurb: nt('What each part sounds like and how to prepare for it.') },
  { id: 'types', label: nt('Question types'), blurb: nt('Every question format the Listening paper can use.') },
];

export type ListeningPart = Sequenced & { group: ListeningGroup };

export const LISTENING_PARTS: ListeningPart[] = [
  {
    slug: 'part1',
    title: nt('Part 1. Everyday Conversation'),
    group: 'parts',
    stage: 1,
    eyebrow: nt('Two speakers · Form completion'),
    blurb: nt('Forms, bookings and registrations: catch names, numbers and spellings.'),
    minutes: 12,
  },
  {
    slug: 'part2',
    title: nt('Part 2. Monologue & Maps'),
    group: 'parts',
    stage: 2,
    eyebrow: nt('One speaker · Maps & matching'),
    blurb: nt('Follow a single speaker around a map, tour or announcement.'),
    minutes: 12,
  },
  {
    slug: 'part3',
    title: nt('Part 3. Academic Discussion'),
    group: 'parts',
    stage: 2,
    eyebrow: nt('up to four speakers · Multiple choice'),
    blurb: nt('Track multiple speakers, dodge distractors, and catch corrections.'),
    minutes: 12,
  },
  {
    slug: 'part4',
    title: nt('Part 4. Academic Lecture'),
    group: 'parts',
    stage: 3,
    eyebrow: nt('One speaker · Note completion'),
    blurb: nt('Complete notes from a fast, dense university-style talk.'),
    minutes: 12,
  },
  {
    slug: 'multiple-choice',
    title: 'Multiple Choice',
    group: 'types',
    stage: 2,
    eyebrow: nt('Question type · Most common in Part 3'),
    blurb: nt('Pick the correct option, or two, from a list while the recording plays.'),
    minutes: 12,
  },
  {
    slug: 'matching',
    title: 'Matching',
    group: 'types',
    stage: 2,
    eyebrow: nt('Question type · Most common in Parts 2 & 3'),
    blurb: nt('Match items from a list to the options given, such as speakers to opinions or plans to features.'),
    minutes: 12,
  },
  {
    slug: 'map-labelling',
    title: 'Plan, Map & Diagram Labelling',
    group: 'types',
    stage: 3,
    eyebrow: nt('Question type · Most common in Part 2'),
    blurb: nt('Label a map, plan or diagram by following directions given in the recording.'),
    minutes: 14,
  },
  {
    slug: 'form-completion',
    title: 'Form, Note, Table & Flow-chart Completion',
    group: 'types',
    stage: 1,
    eyebrow: nt('Question type · Most common in Parts 1 & 4'),
    blurb: nt('Fill gaps in a form, notes, a table or a flow-chart with words or numbers you hear.'),
    minutes: 11,
  },
  {
    slug: 'sentence-completion',
    title: 'Sentence Completion',
    group: 'types',
    stage: 2,
    eyebrow: nt('Question type · Any part'),
    blurb: nt('Complete sentences with words taken directly from the recording, within the word limit.'),
    minutes: 10,
  },
  {
    slug: 'short-answer',
    title: 'Short-answer Questions',
    group: 'types',
    stage: 2,
    eyebrow: nt('Question type · Any part'),
    blurb: nt('Answer questions with a short answer taken from the recording, within the word limit.'),
    minutes: 10,
  },
];

export function getListeningPart(slug: string): ListeningPart | undefined {
  return LISTENING_PARTS.find((p) => p.slug === slug);
}
