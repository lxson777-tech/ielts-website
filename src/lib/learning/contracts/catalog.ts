/* The activity catalogue: everything a plan is allowed to schedule.
 *
 * WHY THIS FILE IS SMALL, AND MUST STAY SMALL
 * The planner and the Mr EZ Worker both import the catalogue. A Cloudflare
 * Worker has a hard bundle limit, and `src/data/tests` alone is about 3.9 MB
 * of passages and transcripts (see the sizing note at the top of
 * src/lib/tutor/catalog.ts, which this replaces and extends). So:
 *
 *   - this file holds TYPES ONLY, no data;
 *   - the catalogue itself is assembled from the small lesson registries
 *     plus ONE generated index file (see GeneratedIndexV1 below), written at
 *     build time by a script under tools/ that reads the big data;
 *   - nothing in src/lib/learning may import src/data/tests, src/lib/plan/
 *     schedule.ts, or anything that pulls either in transitively.
 *
 * IDS ARE FOREVER
 * A catalogue id is already stored in Supabase (`mr_ez_recommendations.reply`
 * holds a TutorRecommendation with an activity id, and mr_ez_notes does the
 * same). Reuse the ids src/lib/tutor/catalog.ts already emits wherever the
 * same thing is being named: `lesson:<progress key>`, `practise:<skill>:
 * <type>`, `test:reading`, `trainer:writing`, `review:vocabulary`,
 * `tool:plan`, and so on. New ids are added; existing ones are never
 * renamed.
 *
 * BEING IN THE LIBRARY IS NOT BEING ON THE PLAN
 * Every one of the site's lessons appears here so it stays discoverable and
 * linkable. Whether a given student is ever scheduled it is decided by the
 * planner from their evidence, never by the catalogue.
 */

import type { Locale } from '../../i18n/locale';
import type { QuestionType } from '../../tests/schema';

/* ── Shape of the world ──────────────────────────────────────────────────── */

/** The four papers IELTS reports a band for. Vocabulary is a site section
    that supports all four, never a fifth paper. */
export type Paper = 'reading' | 'listening' | 'writing' | 'speaking';

export const PAPERS: readonly Paper[] = ['reading', 'listening', 'writing', 'speaking'] as const;

/** Everything the catalogue can be about. `vocabulary` and `exam-skills`
    (timing, instructions, transfer, answer format) support the papers and
    are never scored as one. */
export type LearningDomain = Paper | 'vocabulary' | 'exam-skills';

/** What a Reading or Listening activity teaches or checks: one official
    question type, or one of the cross-type skills the library already
    teaches as its own lesson (paraphrase recognition, skimming, following a
    correction in a recording). Question types come straight from the test
    schema so the two can never drift. */
export type ReadingListeningSubskill =
  | QuestionType
  | 'paraphrase'
  | 'skimming-scanning'
  | 'timing-and-transfer'
  | 'following-correction'
  | 'signposting'
  | 'accent-and-speed';

/** Writing objectives. Derived from the four official criteria but stated as
    things a student can practise in five minutes, which is what the brief's
    "turn criterion feedback into concrete focused tasks" requires. The
    criterion each one rolls up to is recorded on the activity
    (`criterion` below), so reporting can still speak in criteria. */
export type WritingSubskill =
  | 'task1-overview'
  | 'task1-select-key-features'
  | 'task1-compare-and-group'
  | 'task1-data-language'
  | 'task1-process-sequence'
  | 'task1-map-change'
  | 'task2-understand-the-question'
  | 'task2-position-and-thesis'
  | 'task2-topic-sentences'
  | 'task2-support-a-claim'
  | 'task2-counter-and-concede'
  | 'task2-conclusion'
  | 'paragraph-organisation'
  | 'cohesion-and-linking'
  | 'lexical-precision'
  | 'sentence-correction'
  | 'complex-sentence-range'
  | 'task-length-and-timing'
  /* ── WP20b additions (2026-09-22): the Lexical Resource and Grammatical
     Range gaps the coverage round closes (docs/personal-learning/
     TEACHER-REVIEW-writing-speaking.md, "Added in the coverage round").
     Task 1 and Task 2 evidence stay apart, the same rule every other
     objective here already follows. */
  | 'task2-paraphrase-the-question'
  | 'task1-avoid-repetition'
  | 'collocation-accuracy'
  | 'complex-sentences-with-purpose'
  | 'recurring-pattern-accuracy';

/** Speaking objectives, kept separate per part because the same criterion
    behaves differently in a two-minute monologue and a follow-up answer. */
export type SpeakingSubskill =
  | 'part1-extend-an-answer'
  | 'part1-natural-tense-range'
  | 'part2-plan-in-one-minute'
  | 'part2-hold-the-two-minutes'
  | 'part2-narrative-structure'
  | 'part3-abstract-opinion'
  | 'part3-speculate-and-compare'
  | 'fluency-repair'
  | 'topic-vocabulary-in-speech'
  | 'pronunciation-stress-and-rhythm'
  | 'pronunciation-individual-sounds'
  /* ── WP20b additions (2026-09-22): Lexical Resource and Grammatical Range
     had one objective each; Part 3 reasoning and the pronunciation re-check
     route used ids the contracts already reserved (part3-abstract-opinion,
     part3-speculate-and-compare, pronunciation-stress-and-rhythm,
     pronunciation-individual-sounds), so only the genuinely new shapes are
     added here. */
  | 'part3-paraphrase-the-question'
  | 'part2-tense-range'
  | 'part3-complex-sentences';

export type VocabularySubskill =
  | 'recognise-meaning'
  | 'recall-from-meaning'
  | 'use-in-a-sentence'
  | 'collocation'
  | 'topic-breadth';

export type ExamSkillSubskill =
  | 'exam-format'
  | 'timing-strategy'
  | 'answer-transfer'
  | 'instruction-compliance';

export type Subskill =
  | ReadingListeningSubskill
  | WritingSubskill
  | SpeakingSubskill
  | VocabularySubskill
  | ExamSkillSubskill;

/** Writing and Speaking criterion keys, matching what the calibrated graders
    already return (src/lib/writing/schema.ts CRITERIA, and the speaking
    grader's four). Used to roll a subskill up to a criterion for reporting,
    never to score one. */
export type WritingCriterion =
  | 'taskResponse'
  | 'taskAchievement'
  | 'coherenceCohesion'
  | 'lexicalResource'
  | 'grammaticalRange';

export type SpeakingCriterion =
  | 'fluencyCoherence'
  | 'lexicalResource'
  | 'grammaticalRange'
  | 'pronunciation';

/* ── What a schedulable thing is ─────────────────────────────────────────── */

export type ActivityKind =
  /** A teaching page in the library. */
  | 'lesson'
  /** A short check inside a lesson page (PracticeQuiz). */
  | 'lesson-check'
  /** A short focused exercise built for one objective, three to eight
      minutes, usually newly authored. */
  | 'focused-exercise'
  /** A single-passage or single-part timed drill from the real papers. */
  | 'drill'
  /** A whole timed paper, or the full mock. Indivisible. */
  | 'full-test'
  /** An AI-graded Writing or Speaking submission. */
  | 'graded-task'
  /** Spaced vocabulary recall. */
  | 'vocab-review'
  /** A reference page opened at a specific place (model answer, cue card,
      band descriptor, saved lesson, note). */
  | 'reference'
  /** A settings or planning step (intake, confirm goal, book a date). */
  | 'planning';

/** How the platform knows the student actually did it. The planner refuses
    to schedule an activity whose evidence kind it cannot observe. */
export type CompletionEvidenceKind =
  /** A button press. Proves visiting, nothing more. */
  | 'self-marked'
  /** Answers to items with known keys, scored in code. */
  | 'scored-items'
  /** A timed paper with a raw score and a band estimate. */
  | 'scored-paper'
  /** An AI band report against official criteria. */
  | 'graded-rubric'
  /** A focused submission judged against ONE objective, never a band. */
  | 'objective-judged'
  /** A spaced-recall outcome per word. */
  | 'recall-outcome'
  /** Nothing observable: reference material. Schedulable only as a step
      inside a session, never as a session's own objective. */
  | 'none';

/** Where the student is sent, or what is run in place. Exactly one form. */
export type ActivityTarget =
  /** An internal route WITHOUT the site base prefix, same convention as
      CourseLesson.href and Activity.href today. Callers apply withBase(). */
  | { kind: 'route'; href: string; hash?: string; query?: Record<string, string> }
  /** An in-place task rendered by a component, identified by task id plus
      the index entry it draws its items from. */
  | { kind: 'task'; taskId: string; indexRef: IndexRef };

/** A pointer into the generated index, so the catalogue can name real
    questions, prompts or words without carrying any of them. */
export interface IndexRef {
  /** Which index section (see GeneratedIndexV1). */
  section: 'drills' | 'tests' | 'lessonChecks' | 'writingPrompts' | 'speakingPrompts' | 'vocabTopics' | 'focusedExercises';
  /** The entry's id inside that section. */
  id: string;
}

/** Whether the material is real exam-style content from an imported paper, a
    publisher's material, or something this project wrote. Anything authored
    here must be visibly distinguishable from official material wherever it
    is shown, which is why this is on the activity and not a comment. */
export type ContentProvenance = 'imported-paper' | 'publisher' | 'teacher-authored' | 'project-authored';

/** Why an activity exists in the library but cannot be scheduled today.
 *
 *  Added by the catalogue assembly work package. The library has links that
 *  lead nowhere (see QuestionTypeCoverage below), and the honest answer is
 *  to keep the entry, say plainly what is missing, and let the planner skip
 *  it, rather than to delete the entry or to point it at unrelated work. */
export type UnavailableReasonCode =
  /** Nothing real of this kind exists in the data at all. */
  | 'no-material'
  /** The material is planned but has not been written yet. */
  | 'not-authored'
  /** Written here, but no teacher has checked it, so lead decision Q1
      allows it for guided practice only. */
  | 'not-verified';

export interface ActivityUnavailable {
  code: UnavailableReasonCode;
  /** One plain English sentence, which a student could be shown as it is.
      No jargon, no dashes, and never a promise that it is coming. */
  reason: string;
}

/** One subskill an activity teaches or exercises, and how well it fits.
 *
 *  Five lessons in the library deliberately teach a neighbouring question
 *  type (multiple-answer, categorisation, table-completion on both papers,
 *  diagram labelling on Listening). The link is real and worth keeping, but
 *  it is not a lesson about that type, so the planner should prefer a
 *  focused exercise once one exists. Recording the fit is how it can.
 *
 *  Practice activities use the same list for a different job: a drill built
 *  from a real paper part usually holds two or three question types, and
 *  "practice for this subskill" has to find it by any of them, not only by
 *  whichever one happens to have the most questions. */
export interface SubskillCoverage {
  subskill: Subskill;
  fit: 'direct' | 'borrowed';
}

export interface CatalogueActivity {
  /** Stable forever. Reuses the tutor catalogue's id shapes; see the header. */
  id: string;
  /** Bumped when the teaching content behind this id changes enough that
      older evidence should not be treated as evidence about the new
      version. A plain integer, starting at 1. */
  contentVersion: number;
  kind: ActivityKind;
  domain: LearningDomain;
  /** The paper this contributes to, when it contributes to exactly one.
      Vocabulary and exam skills leave it undefined. */
  paper?: Paper;
  subskill: Subskill;
  /** Every subskill this activity teaches or exercises, including
      `subskill` itself, each with how well it fits. */
  covers?: readonly SubskillCoverage[];
  /** The criterion a Writing or Speaking subskill rolls up to, for
      reporting. Never used to compute a band. */
  criterion?: WritingCriterion | SpeakingCriterion;
  /** One sentence, in English, in the student's own terms: what they will be
      able to do afterwards. It is also its own dictionary key (see the nt()
      convention in src/lib/i18n/translate.ts). */
  objective: string;
  /** The short, real name of this activity (a lesson title, a drill's own
      "Reading Test 1, passage 1", a prompt's title), when the registry it
      is built from has one that is distinct from `objective`. Added by the
      Today polish round (2026-09-22) so a step can show what it actually
      opens instead of the generic per-role purpose sentence; not yet
      populated for drills, tests or prompts (see adapters.ts's own lookup
      for lessons in the meantime). Optional and additive: an activity with
      none falls back to a caller-composed label from kind/paper/subskill. */
  label?: string;
  /** Activity ids that should normally come first. Advisory: strong
      independent evidence on a prerequisite's subskill satisfies it without
      the activity being completed (see policy.ts). */
  prerequisites: readonly string[];
  /** Honest planning estimate in minutes, from the registry where one
      exists. Never reported back as measured time spent. */
  expectedMinutes: number;
  /** True when the activity cannot be cut in half: a full paper, a mock. The
      planner offers these as an explicit longer commitment instead of
      trimming them into a short budget. */
  indivisible: boolean;
  target: ActivityTarget;
  completionEvidence: CompletionEvidenceKind;
  /** Which languages the EXPLANATION can be read in. Exam material stays
      English regardless; this is about teaching prose only. */
  explanationLocales: readonly Locale[];
  provenance: ContentProvenance;
  /** Whether a teacher has checked this material against the real exam.
      Anything lifted from an imported paper or a publisher's prompt bank is
      verified by its source. Anything this project wrote starts false, and
      lead decision Q1 allows unverified authored material for guided
      practice only: never for an independent check, never as assessment
      evidence. A lesson is authored here and so reads false; that costs
      nothing, because a lesson only ever produces a "studied" click. */
  verified: boolean;
  /** Set when the activity cannot be scheduled today, with a sentence
      saying why. The planner skips it; the interface may still show it, but
      must show the reason with it. */
  unavailable?: ActivityUnavailable;
  /** True when this activity reuses items that also appear elsewhere (a
      drill lifted from a full paper, a lesson check quoting a real passage).
      Drives exposure tracking so a repeat cannot look like fresh evidence. */
  sharesItemsWith?: readonly string[];
  /** The ids of the papers this activity's items were lifted from, as the
      generated index records them. The planner needs this to reserve unseen
      material: sitting a drill spends its source paper's questions too. */
  sourcePaperIds?: readonly string[];
  /** The ids of the exam PROMPTS this activity is built on, for Writing and
      Speaking work. Exactly the same job as `sourcePaperIds` for a paper:
      a student who has already written about this chart has met it, so an
      independent check built on it is no longer unseen. */
  sourcePromptIds?: readonly string[];
  /** The exact part of a lesson this activity is about: a lesson key and
   *  the id of one block inside it.
   *
   *  Lesson pages stamp block ids onto their own headings at build time
   *  (lead decision D2, src/lib/learning/lesson-blocks.ts), so a block id
   *  is a real anchor. A focused exercise names its lesson and the HEADING
   *  it teaches from; the generator turns that heading into the id. This is
   *  what lets a session open a teach step at the right part of a lesson
   *  instead of at the top of it. Absent when the exercise names no lesson,
   *  or when the heading no longer matches anything in the body, in which
   *  case the link is simply the top of the lesson. */
  lessonBlock?: { lessonKey: string; blockId: string };
  /** Free tags for selection heuristics, e.g. 'diagnostic-safe',
      'unseen-reserved', 'needs-audio', 'needs-microphone'. */
  tags?: readonly string[];
}

/** The whole catalogue, as the planner and the Worker see it. */
export interface LearningCatalogueV1 {
  version: 1;
  /** The generated index this catalogue was built against. A mismatch means
      the index is stale and the build should fail (see the staleness test in
      the work packages). */
  indexVersion: string;
  /** A hash of the catalogue's own contents: every id, what it points at,
      what it teaches and whether it is available. Two runs over the same
      data produce the same string, and any change to any activity produces
      a different one, so cached AI output can be keyed by it and thrown
      away the moment the library underneath it moves. */
  catalogueVersion: string;
  activities: readonly CatalogueActivity[];
}

/* ── The generated index ─────────────────────────────────────────────────── */

/** Written at build time by a script under tools/, from the big data files.
 *  Compact on purpose: ids, counts, types and titles, never passage text,
 *  transcripts, options or answers. Target size is well under 200 KB.
 *
 *  A test asserts the committed index matches what the generator produces
 *  from the current data, so adding a test or a vocabulary topic fails the
 *  build until the index is regenerated. */
export interface GeneratedIndexV1 {
  version: 1;
  /** Hash of the file's own content. Also LearningCatalogueV1.indexVersion.
      A version that can be recomputed and checked, rather than one that has
      to be trusted. */
  indexVersion: string;
  /** Deliberately NOT written. A run timestamp would make the file
      impossible to reproduce, and the staleness test compares the committed
      bytes with a fresh run, so the two cannot both exist. Kept in the type
      only so an older reader still compiles; `indexVersion` is what says
      which index this is. */
  generatedAt?: string;
  tests: readonly TestIndexEntry[];
  drills: readonly DrillIndexEntry[];
  lessonChecks: readonly LessonCheckIndexEntry[];
  focusedExercises: readonly FocusedExerciseIndexEntry[];
  writingPrompts: readonly WritingPromptIndexEntry[];
  speakingPrompts: readonly SpeakingPromptIndexEntry[];
  vocabTopics: readonly VocabTopicIndexEntry[];
  /** Every question type in the schema's union, including the ones no paper
      contains. See QuestionTypeCoverage. */
  questionTypes: readonly QuestionTypeCoverage[];
}

/** How much real material one question type actually has, counted from the
    papers rather than assumed from the lesson library.
 *
 *  This exists because the site currently offers links that lead nowhere:
 *  `practisePath` (src/lib/tests/question-types.ts) will happily build
 *  `/trainers/listening?type=tfng`, a filter that matches nothing, and
 *  `sentence-endings` has a lesson, a label and a strategy but zero
 *  questions in any of the 70 papers. The catalogue is built from these
 *  counts, so an activity with no material is marked unavailable and said
 *  to be unavailable, instead of being linked and dead-ending. */
export interface QuestionTypeCoverage {
  /** A member of QuestionType in src/lib/tests/schema.ts. */
  type: string;
  /** True when neither skill has a single question of this type. The
      planner may not schedule an independent check for it, and the
      catalogue says so in plain words rather than hiding the gap. */
  absent: boolean;
  reading: QuestionTypeCounts;
  listening: QuestionTypeCounts;
}

export interface QuestionTypeCounts {
  /** Questions of this type across every paper of this skill. */
  questions: number;
  /** How many papers contain at least one. */
  papers: number;
  /** How many single-part drills contain at least one, which is what
      decides whether "practise this type" has anywhere to send a student. */
  drills: number;
}

export interface TestIndexEntry {
  id: string;
  skill: 'reading' | 'listening';
  title: string;
  /** Question count per type, so the planner can pick a paper that actually
      contains the type it wants to check. */
  byType: Readonly<Record<string, number>>;
  /** Question ids in paper order, so exposure can be recorded per item
      without loading the paper. */
  questionIds: readonly string[];
  durationMinutes: number;
  provenance: ContentProvenance;
}

export interface DrillIndexEntry {
  id: string;
  sourceTestId: string;
  skill: 'reading' | 'listening';
  partNumber: number;
  title: string;
  byType: Readonly<Record<string, number>>;
  questionIds: readonly string[];
  durationMinutes: number;
}

/** One PracticeQuiz set on a lesson page. Today these questions have no ids
    of their own: identity is positional (`u<unit>-q<question>`, see
    practiceKey in src/lib/i18n/test-explanations.ts). The index therefore
    carries the positional key AND a short content hash, so a reordered or
    rewritten question is detectable rather than silently inheriting the old
    question's evidence. */
export interface LessonCheckIndexEntry {
  /** e.g. 'practice-reading-matching-headings', the setId the page passes. */
  id: string;
  lessonKey: string;
  skill: 'reading' | 'listening';
  items: readonly LessonCheckItem[];
}

export interface LessonCheckItem {
  /** `u0-q3`, exactly practiceKey(unitIndex, questionIndex). */
  itemKey: string;
  /** Short hash of the English prompt plus answer. Changes when the question
      changes; that is the point. */
  itemVersion: string;
  /** Measured from the paper this item was lifted from, never assumed from
      the lesson it sits on: five lessons deliberately teach a neighbouring
      type, and the matching-sentence-endings lesson's own check is built
      from questions the papers label `sentence-completion`. */
  type: Subskill;
  /** True when the unit quotes a real imported passage, so exposure of that
      passage is recorded too. */
  fromImportedPaper: boolean;
  /** The paper this item was lifted from, when there is one. Without it
      "the student has already seen this" cannot be answered, because
      sitting the lesson check spends the paper's question too. */
  sourceTestId?: string;
  /** That paper's own id for this question, e.g. `q14`. Question ids are
      unique within a paper, not across the bank, so the pair is the item. */
  sourceQuestionId?: string;
}

export interface FocusedExerciseIndexEntry {
  id: string;
  subskill: Subskill;
  paper: Paper;
  itemCount: number;
  expectedMinutes: number;
  provenance: ContentProvenance;
  /** Every item's stable id, authored by hand rather than positional. */
  itemIds: readonly string[];
  /** What the exercise is FOR (added by the Matching Headings pilot, WP16).
   *
   *  `guided-practice` is worked with hints and explanations, so it can
   *  never be an independent demonstration. `independent-check` is unseen
   *  material with no help at all, and its papers are RESERVED: the
   *  catalogue marks their drills as check material so ordinary practice
   *  cannot spend them first. Absent on an older index, which reads as
   *  guided practice, exactly the behaviour there was before. */
  role?: 'guided-practice' | 'independent-check';
  /** The exercise's own one-sentence objective, when it has one. Absent
      falls back to the catalogue's generic sentence. */
  objective?: string;
  /** The lesson this exercise teaches from, when it names one. */
  lessonKey?: string;
  /** The id of the BLOCK inside that lesson the exercise is about, resolved
      at build time from the heading the exercise names
      (src/lib/learning/lesson-blocks.ts). This is what lets a session's
      teach step open the lesson at the right part instead of at the top.
      Absent when the heading no longer matches anything in the body, which
      is a link to the top of the lesson rather than a broken one. */
  lessonBlockId?: string;
  /** The papers these items were lifted from. Without it the planner
      cannot tell whether a check is really unseen, because sitting the
      paper or its drill spends the very same questions. */
  sourcePaperIds?: readonly string[];
  /** The exam PROMPTS this exercise is built on, for a written response
      (added by the Task 1 overview pilot, WP17). The prompt plays the part
      the paper plays above: a student who has already written about this
      chart has seen it, so a transfer check on it would not be a transfer
      check. Exposure for a prompt is keyed `prompt:<id>`, which is what
      the writing recorders already write. */
  sourcePromptIds?: readonly string[];
  /** Catalogue ids that hold the same questions (the source paper and the
      single-part drill built from it), or the same prompt (the full graded
      task built on it). */
  sharesItemsWith?: readonly string[];
  /** What the student produces. Absent means the item-answers shape, which
      is what every exercise written before the Writing pilot is.
      `authored-practice` is written here rather than lifted from a paper
      (lead decision Q1: guided practice only until a teacher verifies it).
      Widened on 2026-09-22 to match what src/data/focused-exercises.ts
      really emits; the index had been carrying `authored-practice` while
      this union still named two kinds. */
  kind?: 'item-answers' | 'written-response' | 'authored-practice';
}

export interface WritingPromptIndexEntry {
  id: string;
  task: 'task1' | 'task2';
  title: string;
  /** Chart, process, map, opinion, discussion, and so on. */
  form: string;
  /** 150 for Task 1, 250 for Task 2, straight from the prompt. */
  minWords: number;
  /** The exam's own budget for the task, 20 or 40 minutes. A focused
      exercise on one objective is far shorter and says so itself. */
  suggestedMinutes: number;
  /** The bands of the model answers that exist for this prompt, ascending.
      Empty when there is none. A lesson that teaches from a contrast
      between two models has to know there is more than one before it
      offers the comparison. */
  modelAnswerBands: readonly number[];
  provenance: ContentProvenance;
}

export interface SpeakingPromptIndexEntry {
  id: string;
  part: 1 | 2 | 3;
  topic: string;
  /** Questions the student answers in this prompt's own part. A Part 1
      topic has several; a cue card is one two-minute talk, so it is 1. */
  questionCount: number;
  /** A cue card's Part 3 follow-ups, counted separately because Part 3 is
      scheduled as its own objective with its own subskills. */
  part3QuestionCount?: number;
  provenance: ContentProvenance;
}

export interface VocabTopicIndexEntry {
  slug: string;
  title: string;
  wordCount: number;
  /** Lesson key of the topic's teaching page, when it has one. */
  lessonKey?: string;
}

/* ── Named constants ─────────────────────────────────────────────────────── */

/** Published path of the generated index, served by the site the same way
    the per-test JSON already is (src/pages/data/tests/[id].json.ts), so the
    Worker can fetch it instead of bundling it if it ever grows. */
export const LEARNING_INDEX_PATH = '/data/learning-index.json';

/** Source of truth on disk, written by the generator and committed. */
export const LEARNING_INDEX_SOURCE = 'src/data/generated/learning-index.json';

/** Upper bound the staleness test enforces on the committed index, in bytes.
    Provisional: raise it deliberately, never by accident. */
export const LEARNING_INDEX_MAX_BYTES = 256 * 1024;

/** Longest a focused exercise may be estimated at. Anything longer belongs
    in a drill or a graded task, not in the teach-and-check slot. */
export const FOCUSED_EXERCISE_MAX_MINUTES = 10;

/** Upper bound the catalogue test enforces on the assembled catalogue once
    it is serialised, in bytes.
 *
 *  Read it as a budget on how much the catalogue GREW, not as the Worker's
 *  bundle cost. The Worker ships the generated index (see
 *  LEARNING_INDEX_MAX_BYTES) plus the assembly code, and builds these
 *  objects at import; a serialised copy repeats every field name about
 *  seven hundred times, so it reads far larger than it costs. The cap is
 *  here because it is the one number that moves the moment somebody starts
 *  putting content into the catalogue instead of pointers to content.
 *  Provisional: raise it deliberately, never by accident. */
/* Raised from 576 KiB to 608 KiB on 2026-09-22 (WP20b, the coverage round):
   24 new focused-exercise activities (twelve written objectives, twelve
   spoken objectives, see docs/personal-learning/TEACHER-REVIEW-writing-
   speaking.md) pushed the serialised catalogue to about 579 KiB. Raised
   deliberately, with headroom rather than to the exact new size, and
   recorded here rather than silently: this is real content growth, not the
   accident the comment above warns about. */
export const LEARNING_CATALOGUE_MAX_BYTES = 608 * 1024;
