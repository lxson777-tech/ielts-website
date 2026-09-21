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
import { READING_TFNG } from './focused/reading-tfng';
import { READING_YES_NO_NOTGIVEN } from './focused/reading-yes-no-notgiven';
import { READING_MATCHING_FEATURES } from './focused/reading-matching-features';
import { READING_PARAGRAPH_MATCHING } from './focused/reading-paragraph-matching';
import { READING_MULTIPLE_CHOICE } from './focused/reading-multiple-choice';
import { READING_SENTENCE_COMPLETION } from './focused/reading-sentence-completion';
import { READING_TABLE_COMPLETION } from './focused/reading-table-completion';
import { READING_MULTIPLE_ANSWER } from './focused/reading-multiple-answer';
import { READING_CATEGORISATION } from './focused/reading-categorisation';
import { READING_SENTENCE_ENDINGS } from './focused/reading-sentence-endings';
import { WRITING_TASK1_OVERVIEW } from './focused/writing-task1-overview';
import { WRITING_TASK1_SELECT_KEY_FEATURES } from './focused/writing-task1-select-key-features';
import { WRITING_TASK1_COMPARE_AND_GROUP } from './focused/writing-task1-compare-and-group';
import { WRITING_TASK1_DATA_LANGUAGE } from './focused/writing-task1-data-language';
import { WRITING_TASK1_PROCESS_SEQUENCE } from './focused/writing-task1-process-sequence';
import { WRITING_TASK1_MAP_CHANGE } from './focused/writing-task1-map-change';
import { WRITING_TASK2_POSITION_AND_THESIS } from './focused/writing-task2-position-and-thesis';
import { WRITING_TASK2_SUPPORT_A_CLAIM } from './focused/writing-task2-support-a-claim';
import { WRITING_TASK2_PARAGRAPH_ORGANISATION } from './focused/writing-task2-paragraph-organisation';
import { WRITING_TASK2_COHESION_AND_LINKING } from './focused/writing-task2-cohesion-and-linking';
import { WRITING_TASK2_CONCLUSION } from './focused/writing-task2-conclusion';
import { WRITING_SENTENCE_CORRECTION } from './focused/writing-sentence-correction';
import { SPEAKING_PART1_EXTEND_AN_ANSWER } from './focused/speaking-part1-extend-an-answer';
import { SPEAKING_PART2_PLAN_IN_ONE_MINUTE } from './focused/speaking-part2-plan-in-one-minute';
import { SPEAKING_FLUENCY_REPAIR } from './focused/speaking-fluency-repair';
import { LISTENING_SENTENCE_COMPLETION } from './focused/listening-sentence-completion';
import { LISTENING_MULTIPLE_CHOICE } from './focused/listening-multiple-choice';
import { LISTENING_TABLE_COMPLETION } from './focused/listening-table-completion';
import { LISTENING_MATCHING_FEATURES } from './focused/listening-matching-features';
import { LISTENING_MULTIPLE_ANSWER } from './focused/listening-multiple-answer';
import { LISTENING_CATEGORISATION } from './focused/listening-categorisation';
import { LISTENING_DIAGRAM_LABELLING } from './focused/listening-diagram-labelling';

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
  | 'length-in-range'
  /* ── WP20 additions: the same "plain, visible rule" pattern, one per new
     Writing objective (docs/personal-learning/ARCHITECTURE.md 6.3). Each is
     the opposite kind of check to 'no-figures': these are DETAIL paragraphs
     and a Task 2 body, where the missing thing is the point. */
  /** At least one figure: a detail paragraph with no numbers at all has not
      reported the visual. */
  | 'has-figures'
  /** A comparative structure (than, compared with, whereas, respectively)
      rather than one category after another with no link between them. */
  | 'has-comparison-language'
  /** A trend verb (rose, fell, grew, fluctuated, peaked, remained) rather
      than the numbers with no verb to carry them. */
  | 'has-trend-language'
  /** A sequencing word (first, then, after that, finally, once) that marks
      the stages of a process as a sequence rather than a list. */
  | 'has-sequencing-language'
  /** Location or change language (was replaced by, changed into, to the
      north, a new X was built) rather than numbers, which a map has none of. */
  | 'has-change-language'
  /** A first-person position statement (I believe, in my opinion, this essay
      will argue) in the introduction. */
  | 'has-position-statement'
  /** An example signal (for example, for instance, such as) following the
      claim, so the claim is not left to stand alone. */
  | 'has-example-signal'
  /** At least three sentences: a topic sentence, its development and a link
      back to the question is the shortest a body paragraph can be. */
  | 'has-enough-sentences'
  /** The paragraph does not OPEN with a mechanical linker (Firstly,
      Moreover, In addition, Furthermore, Additionally). Cohesion is the
      point; a list of connectors is not the same thing. */
  | 'no-mechanical-linker-opening'
  /** A conclusion signal (in conclusion, to conclude, overall, in summary). */
  | 'has-conclusion-signal'
  /** The correction is not simply the original sentence typed back
      unchanged. */
  | 'sentence-was-changed';

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
  /* ── WP20 additions: additive, optional, so Pilot B's own tasks (which set
     none of these) render exactly as they did before. They generalise the
     route's model and guiding-question resolution beyond "the overview". */
  /** This task's own guiding questions, when it has some that are not the
      prompt's shared "Build your overview" ones (src/data/writing-plans.ts).
      Absent falls back to the prompt's own hints, which is Pilot B's
      behaviour unchanged. */
  guidingQuestions?: readonly string[];
  /** Which paragraph of the band 8 model (src/data/model-answers.ts,
      zero-based: 0 introduction, 1 overview, 2 first detail/body paragraph,
      3 second detail paragraph or conclusion, every model has exactly four)
      is "one way to write it" for this objective. Absent falls back to
      modelOverviewOf, Pilot B's own extraction. */
  modelParagraphIndex?: number;
  /** Sentence correction only: the broken sentence the student is shown and
      asked to correct before anything is revealed. Project-authored, a real
      recurring IELTS grammar pattern rather than one student's own words
      (the graded report keeps only a quote and a note, not a stored
      corrected version, so there is nothing to reveal that was not typed
      here; see the builder report). */
  correctionSentence?: string;
  /** What was wrong with it, in the marker's own kind of language, shown
      only after the student's own attempt, alongside their attempt rather
      than as a rewritten "correct" version. */
  correctionNote?: string;
  /** Sentence correction only: what to ask for once the correction is done,
      to check whether the pattern travels to a sentence the student writes
      themselves rather than one that was handed to them. Refused help,
      exactly like an independent check's role, but recorded as a second
      step of the same guided task rather than a second catalogue entry: an
      unverified, project-authored pattern can never BE an independent check
      (lead decision Q1), so there is nothing to reserve. */
  transferPrompt?: string;
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

/* ── The authored-practice kind (WP18a, 2026-09-22) ──────────────────────── */

/** One item of an authored set: same job as FocusedExerciseItem, but there
 *  is no real paper to resolve `label`, `number` or `answer` from at build
 *  time, so this carries them itself. */
export interface AuthoredExerciseItem {
  /** `authored:<exerciseId>:<questionId>`, never a real paper's id, so it
      can never be mistaken for spending real exposure (see
      authoredItemId()). */
  id: string;
  questionId: string;
  number: number;
  /** The sentence beginning shown next to the number. English only: this is
      the material itself, the same rule that keeps a real passage English
      in both languages. */
  label: string;
  /** The correct ending's own letter, matching one entry in `options`. */
  answer: string;
  /** One sentence explaining why, written for this practice set. Teaching
      prose around exam material, so it is translated like any other
      explanation. */
  explanation: string;
}

/** A short original passage written for one authored practice set. Never a
 *  real exam passage: `AuthoredFocusedExercise.attribution` says so on
 *  screen, and `provenance` and `verified` say so to the catalogue. */
export interface AuthoredPassage {
  label: string;
  title: string;
  paragraphs: readonly { label?: string; html: string }[];
}

/** A small, hand-written practice set for a question type no real paper in
 *  the library contains (today: only sentence endings, lead decision Q1).
 *  Deliberately its own sibling of FocusedExercise rather than an optional
 *  `source`, for the same reason WrittenFocusedTask is not a FocusedExercise
 *  with optional fields: pretending an authored set has a `testId` is how a
 *  screen ends up treating five written sentences as if they were a
 *  publisher's own material.
 *
 *  Renders through the exact same FocusedExercise.tsx / focused-exercise.ts
 *  a real item-answers exercise does (a shared list of endings, one answer
 *  each, marked in code): the VIEW src/pages/trainers/focused/[id].astro
 *  builds from this looks exactly like the real thing's, just built from
 *  the fields below instead of from ALL_TESTS. Never independent-check
 *  material: `role` is always 'guided-practice', enforced by
 *  tests/focused-reading-types.test.ts, and the catalogue's own unverified
 *  handling (src/lib/learning/catalog.ts, `provenance !== 'imported-paper'
 *  && ... !== 'publisher'`) keeps it out of any check regardless. */
export interface AuthoredFocusedExercise {
  kind: 'authored-practice';
  /** Stable forever. The catalogue id is `focus:<this>`. */
  id: string;
  subskill: Subskill;
  paper: Paper;
  /** Always 'guided-practice'. Typed as the narrower literal, not the whole
      FocusedExerciseRole, so a future edit cannot accidentally make an
      unverified authored set a check by changing one word. */
  role: 'guided-practice';
  title: string;
  objective: string;
  expectedMinutes: number;
  /** Always 'project-authored': nothing here is imported. */
  provenance: 'project-authored';
  /** Shown beside the exercise exactly where a real exercise shows its
      publisher line, so a student sees plainly that this one is different. */
  attribution: string;
  passage: AuthoredPassage;
  /** The group's instructions as HTML, matching a real exercise's
      `instructionHtml`. */
  instructionHtml: string;
  /** The shared list of endings, lettered, exactly as a real paper would
      print them (with at least one more ending than there are items, the
      same distractor margin a real sentence-endings group prints). */
  options: readonly string[];
  items: readonly AuthoredExerciseItem[];
  lesson?: { key: string; blockHeading: string };
  reasons: MistakeReasonListId;
}

/** Same job as paperItemId for a question, and writtenItemId for a prompt:
    the one id this item is ever known by, in a namespace no real paper's id
    can ever collide with. */
export function authoredItemId(exerciseId: string, questionId: string): string {
  return `authored:${exerciseId}:${questionId}`;
}

export function isAuthoredFocusedExercise(entry: AnyFocusedExercise): entry is AuthoredFocusedExercise {
  return entry.kind === 'authored-practice';
}

export type AnyFocusedExercise = FocusedExercise | WrittenFocusedTask | AuthoredFocusedExercise;

/* ── The spoken-response kind (WP20, 2026-09-22) ─────────────────────────── */

/** One self-check speaking objective: record, listen back to yourself, check
 *  yourself against a short checklist, optionally send the SAME idea to the
 *  real trainer to be graded.
 *
 *  WHY THIS IS A THIRD, SEPARATE REGISTRY RATHER THAN A THIRD
 *  AnyFocusedExercise KIND
 *  `item-answers` and `written-response` share one route
 *  (src/pages/trainers/focused/[id].astro), one generated-index section
 *  (tools/generate-learning-index.mjs) and one shared test file
 *  (tests/pilot-task1-overview.test.ts) that a change here would have had to
 *  edit blind while four other builders were touching those same three
 *  files at the same time. Nothing about a spoken objective needs any of
 *  that machinery: there is no passage or prompt HTML to resolve at build
 *  time, and its catalogue entry is built by hand in
 *  src/lib/learning/catalog.ts exactly the way the fixed reference
 *  activities already are. It keeps the SAME id shape (`focus:<id>`, see
 *  spokenFocusedTaskHref) and the SAME honesty rules (no band, ever;
 *  pronunciation only from real audio), on its own route
 *  (/trainers/speaking-focus/<id>) and its own tiny component
 *  (src/components/learning/SpokenFocusedTask.tsx). */
export interface SpokenFocusedTask {
  kind: 'spoken-response';
  /** Stable forever. The catalogue id is `focus:<this>`. */
  id: string;
  subskill: Subskill;
  paper: 'speaking';
  part: 1 | 2 | 3;
  title: string;
  /** One sentence, in the student's own terms. Never judged by a model here:
      this screen is self-check only (see the header). */
  objective: string;
  instruction: string;
  expectedMinutes: number;
  provenance: ContentProvenance;
  /** A real Part 1 topic id (src/data/speaking-prompts.ts
      SPEAKING_PART1_TOPICS) or cue card id (SPEAKING_CUE_CARDS), so the
      question the student answers is never invented here. */
  promptId: string;
  /** The lesson block that teaches this, found by its heading exactly as a
      written focused task's does. */
  lesson?: { key: string; blockHeading: string };
  /** What to check for in your OWN recording after you listen back. Plain
      yes/no items, ticked by the student, never scored: see the header on
      why this screen never judges anything itself. */
  checklist: readonly string[];
  /** Only ever set on the two pronunciation-adjacent objectives, and even
      then it is not a pronunciation objective itself (lead decision Q6:
      pronunciation is set and re-checked only from real audio-graded
      evidence, never from text). It is one line making that limit explicit
      on screen, because a self-check screen about speaking is exactly where
      a student might otherwise expect one. */
  pronunciationNote?: string;
}

export function isSpokenFocusedTask(entry: unknown): entry is SpokenFocusedTask {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    (entry as { kind?: unknown }).kind === 'spoken-response'
  );
}

/* ── Why a wrong answer happened, in the student's own words ─────────────── */

/** Each question type has its own typical wrong turnings, so each one has
    its own list. The brief requires an OBSERVED mistake to be told apart
    from a CONJECTURED cause: the student picks from this list, what they
    picked is stored with the evidence, and the diagnosis it suggests is
    always worded as tentative.

    The seven `listening-*` ids are WP18b/WP19's addition (2026-09-22), one
    per Listening question type that has real material (see
    docs/personal-learning/ARCHITECTURE.md section 6.2: sentence-completion,
    multiple-choice, table-completion, matching-features, multiple-answer,
    categorisation, diagram-labelling; `sentence-endings` etc. do not occur
    in the Listening data at all, so they have no list). Content reviewed by
    an IELTS teacher against how each type really goes wrong, not guessed.

    The nine unprefixed ids below `matching-headings` are WP18a's addition
    (2026-09-22), one per Reading question type with real material beyond
    Pilot A, plus `sentence-endings` for the one small authored set (no real
    Reading paper contains that type at all). Unprefixed, the same
    convention as `matching-headings` itself: Reading gets the plain name,
    Listening gets `listening-` in front, because the two fail differently
    (a Reading student can reread; a Listening student cannot), so a shared
    list would either be too vague to help or wrong for one of the two. */
export type MistakeReasonListId =
  | 'matching-headings'
  | 'generic'
  | 'tfng'
  | 'yes-no-notgiven'
  | 'matching-features'
  | 'paragraph-matching'
  | 'multiple-choice'
  | 'sentence-completion'
  | 'table-completion'
  | 'multiple-answer'
  | 'categorisation'
  | 'sentence-endings'
  | 'listening-sentence-completion'
  | 'listening-multiple-choice'
  | 'listening-table-completion'
  | 'listening-matching-features'
  | 'listening-multiple-answer'
  | 'listening-categorisation'
  | 'listening-diagram-labelling';

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

  /* WP18a (2026-09-22). Each list below is reviewed by an IELTS teacher
     against how that Reading type really goes wrong (see the builder
     report's "For teacher review" table), not guessed from the others. */
  tfng: [
    {
      id: 'repeated-words',
      label: 'It repeats the same words as the passage',
      diagnosis: 'choosing an answer because the wording matches, rather than checking what the passage actually claims',
    },
    {
      id: 'false-vs-notgiven',
      label: 'The passage did not mention it, so I chose False',
      diagnosis: 'treating information the passage never gives as if it contradicted the statement, which is Not Given rather than False',
    },
    {
      id: 'own-knowledge',
      label: 'I used what I already know about the topic',
      diagnosis: 'answering from outside knowledge instead of from what the passage itself says',
    },
    {
      id: 'unsure-claim',
      label: 'I was not sure what the statement claims',
      diagnosis: 'not pinning down exactly what the statement is asserting before deciding',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'yes-no-notgiven': [
    {
      id: 'repeated-words',
      label: 'It repeats the same words as the passage',
      diagnosis: 'choosing an answer because the wording matches, rather than checking what the writer actually claims',
    },
    {
      id: 'no-vs-notgiven',
      label: 'The passage did not mention it, so I chose No',
      diagnosis: "treating an opinion the writer never gives as if it contradicted the statement, which is Not Given rather than No",
    },
    {
      id: 'facts-not-opinion',
      label: 'I checked whether it was true, not what the writer thinks',
      diagnosis: "answering from the facts in the passage rather than from the writer's own opinion, which is what this question type actually asks for",
    },
    {
      id: 'unsure-claim',
      label: 'I was not sure what the statement claims',
      diagnosis: 'not pinning down exactly what the statement is asserting before deciding',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'matching-features': [
    {
      id: 'repeated-words',
      label: 'It repeats a name or word from the statement',
      diagnosis: 'matching a repeated word instead of checking who or what the sentence is really about',
    },
    {
      id: 'right-person-wrong-point',
      label: 'The person seemed right, but I did not check the exact point',
      diagnosis: 'picking a person mentioned near the right idea instead of the one who actually said or did that specific thing',
    },
    {
      id: 'mixed-up-people',
      label: 'Two people in the list were too similar to me',
      diagnosis: 'not yet separating two people whose views or actions are close, by the one detail that tells them apart',
    },
    {
      id: 'first-mention',
      label: 'I chose the person mentioned first in the passage',
      diagnosis: 'trusting order of appearance instead of checking who is actually connected to this exact statement',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'paragraph-matching': [
    {
      id: 'repeated-words',
      label: 'It repeats words from the paragraph',
      diagnosis: 'choosing a paragraph because its words appear there, rather than because it actually contains that specific information',
    },
    {
      id: 'right-topic-wrong-detail',
      label: 'The paragraph was about the right topic, but not this exact detail',
      diagnosis: 'matching the general subject of the paragraph instead of the one specific fact the question asks for',
    },
    {
      id: 'first-paragraph-fits',
      label: 'The first paragraph I checked seemed to fit',
      diagnosis: 'stopping at the first plausible paragraph instead of checking the others for a closer match',
    },
    {
      id: 'more-than-one-place',
      label: 'The information seemed to be in more than one paragraph',
      diagnosis: 'not yet finding the one paragraph where the detail is stated most precisely',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'multiple-choice': [
    {
      id: 'repeated-words',
      label: 'It repeats words from the passage',
      diagnosis: 'choosing an option because its wording matches the passage, rather than because it is what the passage actually says',
    },
    {
      id: 'sounds-true',
      label: 'It sounded true, even if the passage did not say it',
      diagnosis: "choosing an option using outside knowledge or common sense instead of the passage's own words",
    },
    {
      id: 'partly-right',
      label: 'It was partly right, so I picked it',
      diagnosis: 'choosing an option that is true in part instead of checking whether the whole statement matches',
    },
    {
      id: 'eliminated-wrong',
      label: 'I ruled out two options but guessed between the last two',
      diagnosis: 'not finding the one detail that separates two remaining options',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'sentence-completion': [
    {
      id: 'wrong-word-type',
      label: 'I wrote a word that did not fit the gap grammatically',
      diagnosis: 'not checking what type of word the gap needs (a noun, a number, a name) before writing an answer',
    },
    {
      id: 'over-limit',
      label: 'I wrote more words than the limit allowed',
      diagnosis: 'not checking the stated word limit before writing the answer',
    },
    {
      id: 'paraphrased',
      label: "I wrote my own words instead of the passage's exact words",
      diagnosis: "paraphrasing instead of copying the exact word or words the passage uses",
    },
    {
      id: 'wrong-part-of-passage',
      label: 'I took the answer from the wrong part of the passage',
      diagnosis: 'not finding the exact part of the passage the sentence is paraphrasing',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'table-completion': [
    {
      id: 'wrong-row',
      label: 'I filled in the wrong row or column',
      diagnosis: 'not matching the gap to the right row before deciding on an answer',
    },
    {
      id: 'over-limit',
      label: 'I wrote more words than the limit allowed',
      diagnosis: 'not checking the stated word limit before writing the answer',
    },
    {
      id: 'paraphrased',
      label: "I wrote my own words instead of the passage's exact words",
      diagnosis: "paraphrasing instead of copying the exact word or words the passage uses",
    },
    {
      id: 'wrong-part-of-passage',
      label: 'I took the answer from the wrong part of the passage',
      diagnosis: 'not finding the exact part of the passage that matches this row',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'multiple-answer': [
    {
      id: 'repeated-words',
      label: 'It repeats words from the passage',
      diagnosis: 'choosing an option because its wording matches the passage, rather than because it is one of the actual points made there',
    },
    {
      id: 'one-not-two',
      label: 'I was confident about one option but guessed the second',
      diagnosis: 'not checking every remaining option against the passage before settling on the second choice',
    },
    {
      id: 'plausible-not-stated',
      label: 'It seemed like a reasonable answer, even though the passage did not quite say it',
      diagnosis: 'choosing an option that sounds reasonable instead of one the passage actually states',
    },
    {
      id: 'missed-second-point',
      label: 'I found one correct point but missed where the second one was',
      diagnosis: 'stopping after finding one correct option instead of continuing to check for the other',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  categorisation: [
    {
      id: 'repeated-words',
      label: 'It repeats words from the statement',
      diagnosis: 'matching a repeated word instead of checking which category the statement actually belongs to',
    },
    {
      id: 'mixed-up-categories',
      label: 'Two categories in the list were too similar to me',
      diagnosis: 'not yet separating two close categories by the one detail that tells them apart',
    },
    {
      id: 'right-topic-wrong-category',
      label: 'It was about the right topic, but the wrong category',
      diagnosis: 'matching the general subject instead of checking which specific category the statement is classified under',
    },
    {
      id: 'first-mention',
      label: 'I chose the category mentioned first in the passage',
      diagnosis: 'trusting order of appearance instead of checking which category this exact statement belongs to',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'sentence-endings': [
    {
      id: 'grammar-only',
      label: 'I only checked that the grammar fit, not the meaning',
      diagnosis: 'matching an ending that is grammatically possible instead of checking that it is also true according to the passage',
    },
    {
      id: 'repeated-words',
      label: 'It repeats words from the sentence beginning',
      diagnosis: 'choosing an ending because its wording echoes the beginning, rather than because it is the ending the passage actually supports',
    },
    {
      id: 'plausible-ending',
      label: 'It sounded like a reasonable way to finish the sentence',
      diagnosis: 'choosing an ending that sounds natural instead of the one the passage actually supports',
    },
    {
      id: 'wrong-part-of-passage',
      label: 'I matched it to the wrong part of the passage',
      diagnosis: 'not finding the exact part of the passage the sentence beginning is paraphrasing',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],

  /* Listening. Every list below was checked against how each type really
     goes wrong in a recording (see the builder report's "For teacher
     review" table): a speaker who corrects themselves, a spelled-out word,
     a stated word limit, losing your place in a list that only plays once.
     None of it is guessed from the Reading lists, because the failure mode
     is different when the material cannot be reread. */
  'listening-sentence-completion': [
    {
      id: 'kept-first-answer',
      label: 'The speaker corrected themselves and I kept the first thing I heard',
      diagnosis: 'writing down the first detail before the speaker changed or corrected it',
    },
    {
      id: 'missed-spelling',
      label: 'I did not catch how it was spelled',
      diagnosis: 'losing the letters while a word or name was being spelled out',
    },
    {
      id: 'over-word-limit',
      label: 'I wrote more words than the limit allowed',
      diagnosis: 'not checking the stated word limit before answering',
    },
    {
      id: 'lost-place',
      label: 'I lost my place and missed the next answer',
      diagnosis: 'losing track of where the recording was among the gaps',
    },
    { id: 'too-fast', label: 'It was too fast for me to write it down', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-multiple-choice': [
    {
      id: 'first-option-heard',
      label: 'I heard an option mentioned and picked it straight away',
      diagnosis: 'choosing the first option mentioned rather than waiting to hear what was actually confirmed',
    },
    {
      id: 'kept-first-answer',
      label: 'The speaker changed their mind and I kept the first thing they said',
      diagnosis: 'trusting an early statement instead of the correction that followed it',
    },
    {
      id: 'matched-wording',
      label: 'I chose it because I heard the exact words from the option',
      diagnosis: 'matching the wording of an option rather than what it actually meant',
    },
    {
      id: 'lost-place',
      label: 'I lost track of which question the recording had reached',
      diagnosis: 'losing track of where the recording was among the questions',
    },
    { id: 'too-fast', label: 'It was too fast to follow the options and the recording at once', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-table-completion': [
    {
      id: 'kept-first-answer',
      label: 'The speaker corrected a detail and I kept the first version',
      diagnosis: 'writing down a detail before the speaker corrected it',
    },
    {
      id: 'missed-spelling',
      label: 'I lost letters while a name or address was being spelled',
      diagnosis: 'losing letters while something was being spelled out',
    },
    {
      id: 'over-word-limit',
      label: 'I wrote more words than the limit allowed',
      diagnosis: 'not checking the stated word or figure limit',
    },
    {
      id: 'wrong-row',
      label: 'I lost track of which row or box I was filling in',
      diagnosis: 'losing track of position inside the table or form while listening',
    },
    {
      id: 'confused-numbers',
      label: 'I mixed up two similar sounding numbers',
      diagnosis: 'confusing two similar sounding numbers, such as thirteen and thirty',
    },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-matching-features': [
    {
      id: 'matched-by-name',
      label: 'I matched it by the name, not by what was said about it',
      diagnosis: "matching by an option's name rather than the description actually given",
    },
    {
      id: 'kept-first-mention',
      label: 'I chose the first option mentioned instead of waiting to hear it confirmed',
      diagnosis: 'relying on the first mention rather than what the speaker settled on',
    },
    {
      id: 'assumed-once-only',
      label: 'I assumed each option could only be used once',
      diagnosis: 'assuming an option could only be used once when the instructions did not say that',
    },
    {
      id: 'lost-place',
      label: 'I lost my place in the list while listening',
      diagnosis: 'losing track of which item the recording had reached',
    },
    { id: 'too-fast', label: 'It was too fast to match everything in time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-multiple-answer': [
    {
      id: 'selected-too-early',
      label: 'I selected an option as soon as it was mentioned',
      diagnosis: 'selecting an option as soon as it was mentioned, before hearing whether it was accepted or rejected',
    },
    {
      id: 'wrong-count',
      label: 'I chose too few or too many options',
      diagnosis: 'not keeping to the number of options the question asked for',
    },
    {
      id: 'kept-rejected-option',
      label: 'The speaker rejected an option and I kept it anyway',
      diagnosis: 'keeping an option after the speaker had actually ruled it out',
    },
    {
      id: 'missed-late-mention',
      label: 'I stopped tracking once the topic seemed to move on',
      diagnosis: 'stopping tracking an option before the discussion of it was really finished',
    },
    { id: 'too-fast', label: 'It was too fast to track every option', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-categorisation': [
    {
      id: 'kept-first-placement',
      label: 'The speaker moved an item to another category and I kept the first one',
      diagnosis: 'keeping the first category mentioned instead of the final placement',
    },
    {
      id: 'placed-by-word',
      label: 'I placed it by a word I recognised rather than the reason given',
      diagnosis: 'placing an item by a recognised word rather than the reason actually given for it',
    },
    {
      id: 'assumed-even-split',
      label: 'I assumed the categories should end up with an even number of items',
      diagnosis: 'forcing an even split between categories rather than following what was actually said',
    },
    {
      id: 'lost-place',
      label: 'I lost track of which item was being discussed',
      diagnosis: 'losing track of which item the recording had reached',
    },
    { id: 'too-fast', label: 'It was too fast to sort everything in time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-diagram-labelling': [
    {
      id: 'confused-direction',
      label: 'I confused left and right, or another direction word',
      diagnosis: 'confusing a direction word such as left, right or opposite',
    },
    {
      id: 'missed-correction',
      label: 'The speaker changed direction or corrected a position and I kept the first one',
      diagnosis: 'keeping the first position mentioned instead of the corrected one',
    },
    {
      id: 'placed-by-object',
      label: 'I placed the label by the object named, without listening to the direction word',
      diagnosis: 'placing a label by the object named rather than the direction word that fixed its position',
    },
    {
      id: 'lost-place',
      label: 'I lost my place on the diagram partway through',
      diagnosis: 'losing track of position on the diagram after a direction change',
    },
    {
      id: 'missed-spelling',
      label: 'I lost the letters while a label was being spelled out',
      diagnosis: 'losing letters while a name was spelled out',
    },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
};

/** The longest note a student may add to their reason. Short on purpose:
    this is a sentence about their own thinking, not an essay, and it is
    stored with the evidence. */
export const MAX_REASON_NOTE_CHARS = 200;

/* ── The registry ────────────────────────────────────────────────────────── */

/** Every item-answers exercise in the library: real questions, real keys. */
export const FOCUSED_EXERCISES: readonly FocusedExercise[] = [
  ...READING_MATCHING_HEADINGS,
  ...READING_TFNG,
  ...READING_YES_NO_NOTGIVEN,
  ...READING_MATCHING_FEATURES,
  ...READING_PARAGRAPH_MATCHING,
  ...READING_MULTIPLE_CHOICE,
  ...READING_SENTENCE_COMPLETION,
  ...READING_TABLE_COMPLETION,
  ...READING_MULTIPLE_ANSWER,
  ...READING_CATEGORISATION,
  ...LISTENING_SENTENCE_COMPLETION,
  ...LISTENING_MULTIPLE_CHOICE,
  ...LISTENING_TABLE_COMPLETION,
  ...LISTENING_MATCHING_FEATURES,
  ...LISTENING_MULTIPLE_ANSWER,
  ...LISTENING_CATEGORISATION,
  ...LISTENING_DIAGRAM_LABELLING,
];

/** Every written-response task: one real prompt, one short piece of the
    student's own writing, one objective.
 *
 *  WP20 (2026-09-22) added the ten Task 1 and Task 2 objectives beyond the
 *  overview pilot, plus sentence correction. Task 1 and Task 2 evidence stay
 *  apart, as Pilot B's did: every new entry carries its own real prompt and
 *  its own `source.task`. */
export const WRITTEN_FOCUSED_TASKS: readonly WrittenFocusedTask[] = [
  ...WRITING_TASK1_OVERVIEW,
  ...WRITING_TASK1_SELECT_KEY_FEATURES,
  ...WRITING_TASK1_COMPARE_AND_GROUP,
  ...WRITING_TASK1_DATA_LANGUAGE,
  ...WRITING_TASK1_PROCESS_SEQUENCE,
  ...WRITING_TASK1_MAP_CHANGE,
  ...WRITING_TASK2_POSITION_AND_THESIS,
  ...WRITING_TASK2_SUPPORT_A_CLAIM,
  ...WRITING_TASK2_PARAGRAPH_ORGANISATION,
  ...WRITING_TASK2_COHESION_AND_LINKING,
  ...WRITING_TASK2_CONCLUSION,
  ...WRITING_SENTENCE_CORRECTION,
];

/** Every authored-practice set: no real paper, guided practice only. Its
    own registry, on the same reasoning as WRITTEN_FOCUSED_TASKS above and
    SPOKEN_FOCUSED_TASKS below: the SOURCE is different (nothing to
    resolve against ALL_TESTS), so it is never mixed into FOCUSED_EXERCISES
    itself, which is what RESERVED_CHECK_PAPER_IDS below is computed from.
    An authored set has no paper to reserve. */
export const AUTHORED_FOCUSED_EXERCISES: readonly AuthoredFocusedExercise[] = [...READING_SENTENCE_ENDINGS];

/** Every kind together. tools/generate-learning-index.mjs reads this export
    by name; the catalogue is built from the index it writes, never from
    this file. */
export const ALL_FOCUSED_EXERCISES: readonly AnyFocusedExercise[] = [
  ...FOCUSED_EXERCISES,
  ...WRITTEN_FOCUSED_TASKS,
  ...AUTHORED_FOCUSED_EXERCISES,
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

/** Every self-check speaking objective (WP20). Its own registry, on
    purpose: see the header comment above SpokenFocusedTask. */
export const SPOKEN_FOCUSED_TASKS: readonly SpokenFocusedTask[] = [
  ...SPEAKING_PART1_EXTEND_AN_ANSWER,
  ...SPEAKING_PART2_PLAN_IN_ONE_MINUTE,
  ...SPEAKING_FLUENCY_REPAIR,
];

export function findSpokenFocusedTask(id: string): SpokenFocusedTask | undefined {
  return SPOKEN_FOCUSED_TASKS.find((task) => task.id === id);
}

/** The route one spoken objective is opened at. Same unprefixed convention
    as focusedExerciseHref. */
export function spokenFocusedTaskHref(id: string): string {
  return `/trainers/speaking-focus/${id}`;
}
