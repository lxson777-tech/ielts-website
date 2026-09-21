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
 * TWO KINDS, BECAUSE A STUDENT ANSWERS WRITING DIFFERENTLY
 * `item-answers` is the shape above and the one Pilot A uses: real questions
 * with a published answer key, marked in code. `written-response` (Pilot B)
 * is the Writing and Speaking shape: one real exam prompt, one short piece
 * of the student's own words, judged against ONE stated objective. It is
 * never scored, never marked right or wrong, and never a band. The two
 * registries are separate because their SOURCES are different (a paper,
 * part and group against a prompt), and ALL_FOCUSED_EXERCISES is what the
 * catalogue and the index generator read.
 *
 * EVERYTHING HERE IS DATA
 * Adding a question type means adding a data file under src/data/focused/
 * and one line in a registry below. It never means a new component:
 * src/components/learning/FocusedExercise.tsx renders an item-answers
 * exercise, WritingFocusedTask.tsx renders a written-response one, and
 * src/pages/trainers/focused/[id].astro resolves either against the real
 * papers and prompts at build time.
 *
 * NOTHING IS INVENTED
 * An exercise names a paper, a part and a group, or a real exam prompt. The
 * questions, the answer key, the explanations, the charts and the model
 * answers are the publisher's, so `provenance` is 'imported-paper' or
 * 'publisher' and `verified` in the catalogue is true. The build fails
 * loudly if a named group or prompt is not there (the route checks every
 * reference it resolves), rather than showing an empty page.
 *
 * ITEM IDENTITY IS SHARED WITH THE PAPER
 * An item's id is `<testId>:<questionId>`, exactly what a drill or a full
 * paper records for the same question (paperItemId in
 * src/lib/learning/evidence.ts). Answering it here really does spend it, so
 * sitting the drill afterwards is correctly a repeat and not fresh
 * evidence. That is what makes the reservation below honest. A written
 * response's item is the prompt itself (writtenItemId), which is what links
 * a revision back to the attempt it revises.
 *
 * SIZE NOTE
 * This file must stay free of src/data/tests and src/data/writing-prompts:
 * it is imported by the browser (for the reason lists) and by
 * tools/generate-learning-index.mjs. The big data is reached only in the
 * Astro route's frontmatter.
 */

import type { ContentProvenance, Paper, Subskill } from '../lib/learning/contracts/catalog';
import { paperItemId } from '../lib/learning/evidence';
import { READING_MATCHING_HEADINGS } from './focused/reading-matching-headings';
import { WRITING_TASK1_OVERVIEW } from './focused/writing-task1-overview';

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

/** What the student actually produces.
 *
 *  `item-answers` is Pilot A's shape: real questions with a published
 *  answer key, marked in code, which is what lets a fresh set move an
 *  ability estimate. `written-response` is Pilot B's: one short piece of
 *  the student's own writing judged against ONE objective, which never
 *  produces a mark and never produces a band. Absent means `item-answers`,
 *  so every exercise written before this existed reads exactly as it did. */
export type FocusedExerciseKind = 'item-answers' | 'written-response';

export interface FocusedExercise {
  kind?: 'item-answers';
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

/* ── The written-response kind ───────────────────────────────────────────── */

/** The prompt a written focused task is built on. A real exam question from
    the library, never a question written here. */
export interface WrittenTaskSource {
  /** An id from src/data/writing-prompts.ts. */
  promptId: string;
  task: 'task1' | 'task2';
  /** chart, table, process, map, combination: the visual family. Transfer
      is checked on the SAME family first and a different one afterwards,
      which is why the family is data rather than a guess from the title. */
  form: string;
  /** The publisher line shown beside the prompt, word for word. */
  attribution: string;
}

/** The automatic checks a written task can run on the student's own text.
 *
 *  Every one is a plain, visible rule over the words they typed. They are
 *  shown as automatic checks and never as a judgement: they are what the
 *  student gets when no tutor looked at the work, and they are what makes a
 *  self check against the model answer something to do rather than a
 *  shrug. */
export type WrittenCheckId =
  /** A summarising signal: "Overall", "In general", "Broadly". */
  | 'summarising-signal'
  /** Two or more main points, counted as separate sentences or as clauses
      joined by while, whereas, and or but. */
  | 'two-main-features'
  /** No figures: no digits, no per cent sign, no "percent". Detail belongs
      in the detail paragraphs. */
  | 'no-figures'
  /** Inside the word range the task asks for. */
  | 'length-in-range';

/** How long a written response may be, and which checks apply to it. */
export interface WrittenResponseRules {
  minWords: number;
  maxWords: number;
  checks: readonly WrittenCheckId[];
}

/** One short piece of the student's own writing, on one real prompt,
 *  judged against ONE objective.
 *
 *  Deliberately NOT a FocusedExercise with optional fields: a written
 *  response has no answer key, no options and no per item marking, and
 *  pretending otherwise is how a screen ends up claiming a paragraph was
 *  "4 out of 6 correct". The two share their ROLE, their reservation rule
 *  and their route, and nothing else. */
export interface WrittenFocusedTask {
  kind: 'written-response';
  /** Stable forever. The catalogue id is `focus:<this>`. */
  id: string;
  subskill: Subskill;
  paper: Paper;
  role: FocusedExerciseRole;
  title: string;
  /** THE sentence the evaluation judges, and the only thing it judges. The
      Worker reads it from the catalogue, never from the request, so this
      wording is what a model is actually held to. */
  objective: string;
  /** What the student is asked to do, in their own terms, on the screen. */
  instruction: string;
  expectedMinutes: number;
  provenance: ContentProvenance;
  source: WrittenTaskSource;
  /** The lesson block that teaches this, found by its heading exactly as an
      item-answers exercise does. */
  lesson?: { key: string; blockHeading: string };
  rules: WrittenResponseRules;
  /** What to notice in the band 8 model, shown only AFTER an attempt. Never
      a sentence to copy: the model is "one way to write it". */
  noticeInTheModel: readonly string[];
}

/** The one item a written response answers: the prompt itself.
 *
 *  Same job as paperItemId for a question. It is what links a revision to
 *  the attempt it revises (the learner store matches a second go by its
 *  shared item ids) and what marks the prompt as met. */
export function writtenItemId(promptId: string): string {
  return `prompt:${promptId}`;
}

export function isWrittenFocusedTask(entry: AnyFocusedExercise): entry is WrittenFocusedTask {
  return entry.kind === 'written-response';
}

export type AnyFocusedExercise = FocusedExercise | WrittenFocusedTask;

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

/** Every item-answers exercise in the library: real questions, real keys. */
export const FOCUSED_EXERCISES: readonly FocusedExercise[] = [...READING_MATCHING_HEADINGS];

/** Every written-response task: one real prompt, one short piece of the
    student's own writing, one objective. */
export const WRITTEN_FOCUSED_TASKS: readonly WrittenFocusedTask[] = [...WRITING_TASK1_OVERVIEW];

/** Both kinds together. tools/generate-learning-index.mjs reads this export
    by name; the catalogue is built from the index it writes, never from
    this file. */
export const ALL_FOCUSED_EXERCISES: readonly AnyFocusedExercise[] = [
  ...FOCUSED_EXERCISES,
  ...WRITTEN_FOCUSED_TASKS,
];

export function findFocusedExercise(id: string): AnyFocusedExercise | undefined {
  return ALL_FOCUSED_EXERCISES.find((exercise) => exercise.id === id);
}

export function focusedExercisesFor(subskill: Subskill, role?: FocusedExerciseRole): readonly AnyFocusedExercise[] {
  return ALL_FOCUSED_EXERCISES.filter(
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

/** The exam prompts held back for independent checks, on exactly the same
 *  rule and for exactly the same reason.
 *
 *  A transfer check has to be a chart the student has never written about.
 *  The catalogue marks the full graded task on each of these prompts as
 *  check material, so the plan never spends one on ordinary practice; they
 *  stay in the Writing trainer's rotation and stay linkable, because a
 *  student who goes looking for them is making their own choice. */
export const RESERVED_CHECK_PROMPT_IDS: readonly string[] = [
  ...new Set(
    WRITTEN_FOCUSED_TASKS.filter((task) => task.role === 'independent-check').map(
      (task) => task.source.promptId,
    ),
  ),
].sort();

/** The route one exercise is opened at. Unprefixed, the same convention as
    every other activity href: callers apply withBase(). */
export function focusedExerciseHref(id: string): string {
  return `/trainers/focused/${id}`;
}
