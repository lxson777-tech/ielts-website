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
  | 'task-length-and-timing';

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
  | 'pronunciation-individual-sounds';

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
  /** The criterion a Writing or Speaking subskill rolls up to, for
      reporting. Never used to compute a band. */
  criterion?: WritingCriterion | SpeakingCriterion;
  /** One sentence, in English, in the student's own terms: what they will be
      able to do afterwards. It is also its own dictionary key (see the nt()
      convention in src/lib/i18n/translate.ts). */
  objective: string;
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
  /** True when this activity reuses items that also appear elsewhere (a
      drill lifted from a full paper, a lesson check quoting a real passage).
      Drives exposure tracking so a repeat cannot look like fresh evidence. */
  sharesItemsWith?: readonly string[];
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
  /** Hash of the generator's inputs. Also LearningCatalogueV1.indexVersion. */
  indexVersion: string;
  generatedAt: string;
  tests: readonly TestIndexEntry[];
  drills: readonly DrillIndexEntry[];
  lessonChecks: readonly LessonCheckIndexEntry[];
  focusedExercises: readonly FocusedExerciseIndexEntry[];
  writingPrompts: readonly WritingPromptIndexEntry[];
  speakingPrompts: readonly SpeakingPromptIndexEntry[];
  vocabTopics: readonly VocabTopicIndexEntry[];
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
  type: Subskill;
  /** True when the unit quotes a real imported passage, so exposure of that
      passage is recorded too. */
  fromImportedPaper: boolean;
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
}

export interface WritingPromptIndexEntry {
  id: string;
  task: 'task1' | 'task2';
  title: string;
  /** Chart, process, map, opinion, discussion, and so on. */
  form: string;
  provenance: ContentProvenance;
}

export interface SpeakingPromptIndexEntry {
  id: string;
  part: 1 | 2 | 3;
  topic: string;
  questionCount: number;
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
