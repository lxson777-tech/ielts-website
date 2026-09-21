/* Focused exercises: one objective, a handful of real questions, ten
 * minutes.
 *
 * WHY THEY EXIST
 * The library's smallest unit of Reading practice is a twenty minute drill
 * over a whole passage. That is too big to sit between a teaching block and
 * a check, so a session that wants to teach one question type, practise it
 * and then check it on fresh material cannot fit inside an hour. A focused
 * exercise is one question GROUP lifted out of one real paper: the passage
 * it was written against, its five to eight questions, its publisher's own
 * explanations and evidence lines, and nothing else.
 *
 * EVERYTHING HERE IS DATA
 * Adding a question type means adding a data file under src/data/focused/
 * and one line in FOCUSED_EXERCISES below. It never means a new component:
 * src/components/learning/FocusedExercise.tsx renders whatever this
 * describes, and src/pages/trainers/focused/[id].astro resolves it against
 * the real papers at build time.
 *
 * NOTHING IS INVENTED
 * An exercise names a paper, a part and a group. The questions, the answer
 * key, the explanations and the evidence sentences are the publisher's, so
 * `provenance` is 'imported-paper' and `verified` in the catalogue is true.
 * The build fails loudly if a named group is not there (the route checks
 * every reference it resolves), rather than showing an empty page.
 *
 * ITEM IDENTITY IS SHARED WITH THE PAPER
 * An item's id is `<testId>:<questionId>`, exactly what a drill or a full
 * paper records for the same question (paperItemId in
 * src/lib/learning/evidence.ts). Answering it here really does spend it, so
 * sitting the drill afterwards is correctly a repeat and not fresh
 * evidence. That is what makes the reservation below honest.
 *
 * SIZE NOTE
 * This file must stay free of src/data/tests: it is imported by the browser
 * (for the reason lists) and by tools/generate-learning-index.mjs. The big
 * data is reached only in the Astro route's frontmatter.
 */

import type { ContentProvenance, Paper, Subskill } from '../lib/learning/contracts/catalog';
import { paperItemId } from '../lib/learning/evidence';
import { READING_MATCHING_HEADINGS } from './focused/reading-matching-headings';

/* ── What one exercise is ────────────────────────────────────────────────── */

/** What an exercise is FOR, which decides how it may be used.
 *
 *  `guided-practice` is worked with help available: hints before an answer,
 *  the explanation and the passage evidence after one, and a correction
 *  attempt that is recorded as a retry. It can never be an independent
 *  demonstration, whatever the score.
 *
 *  `independent-check` is the opposite: unseen material, no hints, no
 *  explanations until it is over, no tutor. Its papers are RESERVED, so
 *  ordinary practice cannot spend them first (see RESERVED_CHECK_PAPER_IDS). */
export type FocusedExerciseRole = 'guided-practice' | 'independent-check';

/** Where the questions really come from. */
export interface FocusedExerciseSource {
  /** A published paper id, e.g. 'reading-full-020'. */
  testId: string;
  /** Which part of that paper, counting from zero. */
  partIndex: number;
  /** Which question group inside that part, counting from zero. */
  groupIndex: number;
  /** The single-part drill built from the same part. Recorded so the
      catalogue can say plainly that the two share their questions. */
  drillId: string;
  /** The publisher line shown beside the exercise, word for word. */
  attribution: string;
}

export interface FocusedExerciseItem {
  /** `<testId>:<questionId>`: the same evidence id the paper and the drill
      use for this very question. */
  id: string;
  /** The question's own id inside its paper, e.g. 'q14'. */
  questionId: string;
}

export interface FocusedExercise {
  /** Stable forever. The catalogue id is `focus:<this>`. */
  id: string;
  subskill: Subskill;
  paper: Paper;
  role: FocusedExerciseRole;
  /** Shown as the exercise's heading. English, translated through t(). */
  title: string;
  /** One sentence, the student's own terms, on what this is for. Also its
      own dictionary key. */
  objective: string;
  /** Honest planning estimate. Never reported back as measured time. */
  expectedMinutes: number;
  provenance: ContentProvenance;
  source: FocusedExerciseSource;
  /** The lesson that teaches this, and the heading of the one block inside
      it that this exercise practises. The block is found by its heading
      rather than by a position, so rewriting the lesson's order cannot
      quietly point the help at a different paragraph; a heading that no
      longer exists falls back to the last block. */
  lesson?: { key: string; blockHeading: string };
  items: readonly FocusedExerciseItem[];
  /** Which list of "how did you choose?" answers this exercise offers after
      a wrong answer. A new question type adds a list, not a component. */
  reasons: MistakeReasonListId;
}

/** True when this item really is the paper's own question, which is what
    makes exposure shared. Asserted by tests/pilot-matching-headings.test.ts
    for every exercise, so a hand-written id cannot drift from the rule. */
export function isSharedItemId(item: FocusedExerciseItem, testId: string): boolean {
  return item.id === paperItemId(testId, item.questionId);
}

/* ── Why a wrong answer happened, in the student's own words ─────────────── */

/** Each question type has its own typical wrong turnings, so each one has
    its own list. The brief requires an OBSERVED mistake to be told apart
    from a CONJECTURED cause: the student picks from this list, what they
    picked is stored with the evidence, and the diagnosis it suggests is
    always worded as tentative. */
export type MistakeReasonListId = 'matching-headings' | 'generic';

export interface MistakeReason {
  /** Stored with the evidence, so it must never be reworded. */
  id: string;
  /** What the student taps. English, translated through t(). */
  label: string;
  /** What this usually means, in the platform's own words. Shown wrapped in
      a tentative sentence, never as a finding. Empty for an answer that
      says nothing about method, such as running out of time. */
  diagnosis: string;
}

export const MISTAKE_REASONS: Readonly<Record<MistakeReasonListId, readonly MistakeReason[]>> = {
  'matching-headings': [
    {
      id: 'repeated-words',
      label: 'It repeats words from the paragraph',
      diagnosis: 'choosing a heading because its words appear in the paragraph, rather than because it says what the paragraph is about',
    },
    {
      id: 'first-sentence',
      label: 'It matches the first sentence',
      diagnosis: 'trusting the first sentence instead of the paragraph as a whole',
    },
    {
      id: 'one-detail',
      label: 'It fits one detail in the paragraph',
      diagnosis: 'choosing a detail instead of the main idea',
    },
    {
      id: 'two-headings-alike',
      label: 'Two headings looked the same to me',
      diagnosis: 'not yet separating two close headings by the one word that differs',
    },
    {
      id: 'ran-out-of-time',
      label: 'I ran out of time',
      diagnosis: '',
    },
    {
      id: 'guessed',
      label: 'I guessed',
      diagnosis: '',
    },
  ],
  generic: [
    {
      id: 'repeated-words',
      label: 'It repeats words from the text',
      diagnosis: 'matching words rather than meaning',
    },
    { id: 'misread', label: 'I misread the question', diagnosis: 'reading the question too quickly' },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
};

/** The longest note a student may add to their reason. Short on purpose:
    this is a sentence about their own thinking, not an essay, and it is
    stored with the evidence. */
export const MAX_REASON_NOTE_CHARS = 200;

/* ── The registry ────────────────────────────────────────────────────────── */

/** Every focused exercise in the library. tools/generate-learning-index.mjs
    reads this export by name; the catalogue is built from the index it
    writes, never from this file. */
export const FOCUSED_EXERCISES: readonly FocusedExercise[] = [...READING_MATCHING_HEADINGS];

export function findFocusedExercise(id: string): FocusedExercise | undefined {
  return FOCUSED_EXERCISES.find((exercise) => exercise.id === id);
}

export function focusedExercisesFor(subskill: Subskill, role?: FocusedExerciseRole): readonly FocusedExercise[] {
  return FOCUSED_EXERCISES.filter(
    (exercise) => exercise.subskill === subskill && (role === undefined || exercise.role === role),
  );
}

/** The papers held back for independent checks.
 *
 *  Derived, never hand-listed: it is exactly the papers the check exercises
 *  draw on. The catalogue marks those papers' drills as check material so
 *  the planner cannot offer them as ordinary practice, which is what stops
 *  a Tuesday drill quietly spending Thursday's check. */
export const RESERVED_CHECK_PAPER_IDS: readonly string[] = [
  ...new Set(
    FOCUSED_EXERCISES.filter((exercise) => exercise.role === 'independent-check').map(
      (exercise) => exercise.source.testId,
    ),
  ),
].sort();

/** The route one exercise is opened at. Unprefixed, the same convention as
    every other activity href: callers apply withBase(). */
export function focusedExerciseHref(id: string): string {
  return `/trainers/focused/${id}`;
}
