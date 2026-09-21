/* Reading, Sentence Endings: one small authored practice set (WP18a,
 * 2026-09-22, lead decision Q1).
 *
 * No paper in the 40-paper Reading library contains this type at all (the
 * generated index's questionTypes section marks it absent for both
 * papers). The lesson stays (reading-matching-sentence-endings.html
 * already teaches it), but there was nothing real to practise it on, so
 * WP4 confirmed the type is genuinely missing and lead decision Q1 asks for
 * exactly one small authored set here: guided practice only, never an
 * independent check and never assessment evidence, until a teacher verifies
 * it (`verified: false` on its catalogue activity, computed from
 * `provenance: 'project-authored'` by src/lib/learning/catalog.ts).
 *
 * The passage is a plain original paragraph on a neutral academic topic
 * (community gardens), written for this practice set and nowhere claimed
 * to be more than that: FocusedExercise.tsx shows "Written for this site,
 * not a real exam question." in place of the usual "Real exam material."
 * line whenever `authored` is set (see [id].astro), so the student is told
 * this plainly before they start, not only in a comment here.
 *
 * SHAPE: this is AuthoredFocusedExercise (src/data/focused-exercises.ts),
 * a sibling of FocusedExercise for exactly the reason WrittenFocusedTask is
 * one: pretending a written passage has a real `source.testId` is how a
 * screen ends up treating five authored sentences as a publisher's own
 * material. It still renders through the exact same FocusedExercise.tsx
 * component, because the VIEW it resolves to (built in [id].astro) is the
 * same select-from-a-shared-list shape Pilot A's Matching Headings uses.
 */

import type { AuthoredFocusedExercise } from '../focused-exercises';
import { authoredItemId } from '../focused-exercises';

const EXERCISE_ID = 'reading-sentence-endings-authored';

/** A, B, C... in the order a real paper would print them: more endings
    than items (two distractors), so the last one cannot be filled in by
    elimination alone, the same margin a real sentence-endings group uses. */
const OPTIONS = [
  'urged people to grow crops on whatever land they could find.',
  'as a useful part of local infrastructure.',
  'only became widespread after the Second World War.',
  'can teach a kind of cooperation that formal meetings often fail to build.',
  'dates back at least as far as the nineteenth century.',
  'discouraged private citizens from growing their own food.',
  'to work together even though they had rarely spoken before.',
];

const GUIDED: AuthoredFocusedExercise = {
  kind: 'authored-practice',
  id: EXERCISE_ID,
  subskill: 'sentence-endings',
  paper: 'reading',
  role: 'guided-practice',
  title: 'Sentence Endings: guided practice',
  objective: 'Complete a sentence with the ending the passage actually supports, not just one that fits grammatically.',
  expectedMinutes: 9,
  provenance: 'project-authored',
  attribution: 'Written for this site. Not a real exam question, and not yet checked by a teacher.',
  passage: {
    label: 'Practice Passage',
    title: 'Community Gardens',
    paragraphs: [
      {
        html: '<span>Community gardens are shared plots of land where local residents grow vegetables, fruit and flowers together. Although the idea is often associated with modern cities, allotment style gardening has a much longer history, with organised plots recorded in parts of Europe as far back as the nineteenth century. During periods of food shortage, governments actively encouraged citizens to cultivate any available land, and the resulting gardens supplied a meaningful share of the vegetables eaten by ordinary families.</span>',
      },
      {
        html: '<span>In recent decades, community gardens have taken on a wider role. Researchers who study urban neighbourhoods have found that a shared garden often becomes a place where neighbours who would otherwise never speak to one another begin to cooperate on a common project. Because the work of planting, weeding and harvesting has to be divided among the members, a garden can quietly teach the kind of everyday negotiation that formal community meetings rarely achieve.</span>',
      },
      {
        html: '<span>Community gardens also affect the immediate environment. A plot that was previously bare ground or a neglected lot begins to absorb rainwater rather than letting it run off into drains, and the plants attract insects that would otherwise have nowhere to feed. Some city planners now treat a new community garden less as a decoration and more as a small piece of practical infrastructure, worth protecting when land is redeveloped.</span>',
      },
    ],
  },
  instructionHtml:
    'Complete each sentence with the correct ending, A to G, below. There are more endings than sentences, so two will not be used.',
  options: OPTIONS,
  items: [
    {
      id: authoredItemId(EXERCISE_ID, 'q1'),
      questionId: 'q1',
      number: 1,
      label: 'Organised community gardening in parts of Europe',
      answer: 'dates back at least as far as the nineteenth century.',
      explanation:
        'The first paragraph says organised plots were recorded in parts of Europe as far back as the nineteenth century, which this ending restates.',
    },
    {
      id: authoredItemId(EXERCISE_ID, 'q2'),
      questionId: 'q2',
      number: 2,
      label: 'During times when food was scarce, governments',
      answer: 'urged people to grow crops on whatever land they could find.',
      explanation:
        'The first paragraph says governments actively encouraged citizens to cultivate any available land during periods of food shortage, which is what this ending describes.',
    },
    {
      id: authoredItemId(EXERCISE_ID, 'q3'),
      questionId: 'q3',
      number: 3,
      label: 'A shared garden can encourage neighbours',
      answer: 'to work together even though they had rarely spoken before.',
      explanation:
        'The second paragraph says a shared garden often becomes a place where neighbours who would otherwise never speak to one another begin to cooperate, which this ending restates.',
    },
    {
      id: authoredItemId(EXERCISE_ID, 'q4'),
      questionId: 'q4',
      number: 4,
      label: 'Dividing up gardening tasks among members',
      answer: 'can teach a kind of cooperation that formal meetings often fail to build.',
      explanation:
        'The second paragraph says dividing the work of planting, weeding and harvesting can quietly teach the kind of everyday negotiation that formal meetings rarely achieve, which this ending restates.',
    },
    {
      id: authoredItemId(EXERCISE_ID, 'q5'),
      questionId: 'q5',
      number: 5,
      label: 'Some city planners now regard a new community garden',
      answer: 'as a useful part of local infrastructure.',
      explanation:
        'The third paragraph says some city planners now treat a new community garden as a small piece of practical infrastructure, which this ending restates.',
    },
  ],
  lesson: { key: 'reading-matching-sentence-endings', blockHeading: 'How to Approach It' },
  reasons: 'sentence-endings',
};

export const READING_SENTENCE_ENDINGS: readonly AuthoredFocusedExercise[] = [GUIDED];
