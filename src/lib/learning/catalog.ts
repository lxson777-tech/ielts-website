/* The activity catalogue: everything a plan is allowed to schedule.
 *
 * WHAT THIS FILE IS
 * One pure function, buildLearningCatalogue(), that turns the six small
 * lesson registries plus the one generated index into a LearningCatalogueV1,
 * and a handful of lookups the planner needs on top of it. No storage, no
 * clock, no network, nothing from the browser. Give it the same index twice
 * and it returns the same catalogue twice, byte for byte.
 *
 * WHY IT IS BUILT RATHER THAN WRITTEN OUT
 * There are about seven hundred schedulable things on this site and almost
 * all of them already exist as real data: 76 lessons, 70 papers, 240 drills,
 * 22 lesson checks, 60 writing prompts, 83 speaking prompts, 36 vocabulary
 * topics. Listing them by hand would rot within a week. What IS written by
 * hand here is the judgement the data cannot carry: which subskill each
 * lesson teaches, what a student can do after it, and what should normally
 * come first.
 *
 * IDS ARE FOREVER
 * Supabase already holds catalogue ids inside mr_ez_recommendations.reply
 * and mr_ez_notes.reply. Every id src/lib/tutor/catalog.ts emits is
 * reproduced here, pointing at the same route: the 76 `lesson:<key>` ids,
 * the fixed `test:`, `trainer:`, `review:`, `tool:` ids, and every
 * synthesised `practise:<skill>:<type>`. New ids are added; existing ones
 * are never renamed. tests/learning-catalog.test.ts holds that line.
 *
 * WHAT IT REFUSES TO DO
 * It never links to material that does not exist. `practisePath()` will
 * happily build /trainers/listening?type=tfng, a filter no drill matches,
 * and `sentence-endings` has a lesson, a label and a strategy but zero
 * questions in any of the 70 papers. Those activities are kept, marked
 * unavailable, and given a sentence saying why, because a student clicking
 * into an empty screen is worse than being told there is nothing there yet.
 *
 * BEING IN THE LIBRARY IS NOT BEING ON THE PLAN
 * Every lesson is here so it stays discoverable and linkable. Nothing here
 * says a student must do anything. Prerequisites are advisory and the
 * planner may satisfy them with evidence instead (see contracts/policy.ts);
 * the eight teaching units decide teaching ORDER, never obligation.
 */

import { buildCourse, type CourseLesson } from '../course';
import { lessonPath, practisePath, questionTypeLabel } from '../tests/question-types';
import type { QuestionType } from '../tests/schema';
import type { Locale } from '../i18n/locale';
import committedIndex from '../../data/generated/learning-index.json' with { type: 'json' };
import { SPOKEN_FOCUSED_TASKS, spokenFocusedTaskHref, type SpokenFocusedTask } from '../../data/focused-exercises';

import type {
  ActivityTarget,
  ActivityUnavailable,
  CatalogueActivity,
  ContentProvenance,
  DrillIndexEntry,
  GeneratedIndexV1,
  LearningCatalogueV1,
  LearningDomain,
  LessonCheckIndexEntry,
  Paper,
  SpeakingCriterion,
  SpeakingSubskill,
  Subskill,
  SubskillCoverage,
  TestIndexEntry,
  VocabTopicIndexEntry,
  WritingCriterion,
  WritingSubskill,
} from './contracts/catalog';

/** The committed index, as the site and the Worker bundle it. Exported so a
    caller that fetched /data/learning-index.json instead can pass its own
    copy to buildLearningCatalogue() and get the same shape back. */
export const LEARNING_INDEX = committedIndex as unknown as GeneratedIndexV1;

/* ── Honest planning estimates ───────────────────────────────────────────── */

/** Minutes a lesson gets when its registry entry carries none. Every part
    lesson does carry one, so this is a floor rather than a default. */
const LESSON_FALLBACK_MINUTES = 10;

/** A lesson quick check is a handful of questions with a reveal, so it is
    costed per item and clamped. Never reported back as time spent. */
const CHECK_MINUTES_PER_ITEM = 0.6;
const CHECK_MIN_MINUTES = 3;
const CHECK_MAX_MINUTES = 12;

/** The mock is Listening, Reading, Writing and Speaking back to back. The
    page itself says about two hours forty five for the first three papers
    plus fourteen minutes of Speaking; this is that number. */
const MOCK_MINUTES = 179;

/** A spoken Part 1 topic is three or four questions answered aloud. */
const SPEAKING_PART1_MINUTES = 5;
/** One minute of preparation, two minutes of talk, a rounding off question. */
const SPEAKING_CUE_CARD_MINUTES = 4;
/** Part 3 follow ups, costed per question. */
const SPEAKING_PART3_MINUTES_PER_QUESTION = 2;
/** One spaced vocabulary pass. */
const VOCAB_REVIEW_MINUTES = 10;
/** Opening a reference page at the right place and reading the part that
    matters. A reference is never a session's own objective. */
const REFERENCE_MINUTES = 5;
/** The drill hubs, which are a filtered list rather than one drill. */
const TRAINER_HUB_MINUTES = 10;

/* ── Which lessons and papers can be read in Russian ─────────────────────── */

/* Both lists are deliberately empty today: all 76 lesson bodies and all 70
   papers (and all 22 lesson check sets) have a Russian translation. They
   exist so that the catalogue can tell the truth the day one does not, and
   the catalogue test compares them against what is really on disk, so
   adding an untranslated lesson turns the suite red rather than quietly
   promising Russian that is not there. */

/** Lesson keys whose body has no Russian translation yet. */
export const LESSONS_WITHOUT_RUSSIAN: readonly string[] = [];

/** Paper ids whose answer explanations have no Russian translation yet. */
export const TESTS_WITHOUT_RUSSIAN_EXPLANATIONS: readonly string[] = [];

const ENGLISH_ONLY: readonly Locale[] = ['en'];
const BILINGUAL: readonly Locale[] = ['en', 'ru'];

/* ── The judgement the data cannot carry ─────────────────────────────────── */

/** What one lesson is for, written once, by hand.
 *
 *  `subskill` is what the lesson is primarily about. `fit` is 'borrowed'
 *  when the library has no lesson about that subskill and this is the
 *  closest thing that exists (see docs/personal-learning/ARCHITECTURE.md
 *  section 6.2). `objective` is one sentence in the student's own terms,
 *  and it doubles as its own translation key wherever it is rendered. */
interface LessonFacts {
  domain: LearningDomain;
  paper?: Paper;
  subskill: Subskill;
  fit?: 'direct' | 'borrowed';
  criterion?: WritingCriterion | SpeakingCriterion;
  objective: string;
  /** Other subskills the lesson genuinely covers. */
  also?: readonly Subskill[];
  /** Other subskills it is merely the nearest lesson for. */
  alsoBorrowed?: readonly Subskill[];
}

/** The five overview lessons, by paper. Each is the first prerequisite of
    every other lesson in its own section. */
const OVERVIEW_KEY: Record<string, string> = {
  reading: 'reading-task1',
  listening: 'listening',
  writing: 'writing',
  speaking: 'speaking',
  vocabulary: 'vocabulary',
};

const OVERVIEW_KEYS = new Set(Object.values(OVERVIEW_KEY));

/** The Reading core skill lesson. The registry itself calls it the one
    skill every question type tests (READING_PARTS group 'skill'), so it
    plays the part a method lesson plays in Writing. */
const READING_CORE_SKILL = 'reading-paraphrase';

const WRITING_TASK1_METHOD = 'writing-method';
const WRITING_TASK2_METHOD = 'writing-task2-method';
const WRITING_TASK1_LESSONS = new Set(['writing-charts', 'writing-process', 'writing-maps']);
const WRITING_TASK2_LESSONS = new Set([
  'writing-opinion',
  'writing-discussion',
  'writing-advantages',
  'writing-problem',
  'writing-twopart',
]);

const LESSON_FACTS: Record<string, LessonFacts> = {
  /* Overviews. "How the paper works" is an exam skill, not a question type,
     which is why these five are the only lessons with an exam-skill
     subskill. */
  'reading-task1': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'exam-format',
    objective: 'Know how the Reading paper is built, how it is scored and what each question type asks.',
  },
  listening: {
    domain: 'listening',
    paper: 'listening',
    subskill: 'exam-format',
    objective: 'Know how the Listening paper is built, how it is scored and what each part sounds like.',
  },
  writing: {
    domain: 'writing',
    paper: 'writing',
    subskill: 'exam-format',
    objective: 'Know how the Writing paper is built and how examiners mark the four criteria.',
  },
  speaking: {
    domain: 'speaking',
    paper: 'speaking',
    subskill: 'exam-format',
    objective: 'Know how the interview runs, how long each part lasts and how it is marked.',
  },
  vocabulary: {
    domain: 'vocabulary',
    subskill: 'topic-breadth',
    objective: 'Know why vocabulary decides your band and how to build it topic by topic.',
  },

  /* Reading, twelve parts. */
  'reading-paraphrase': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'paraphrase',
    also: ['skimming-scanning'],
    objective: 'Recognise the same idea written in different words, which is what every Reading question tests.',
  },
  'reading-mc': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'multiple-choice',
    objective: 'Choose the option the passage actually supports and reject the distractors.',
  },
  'reading-tfng': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'tfng',
    objective: 'Decide whether a statement is True, False or Not Given, and know the difference.',
  },
  'reading-ynng': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'yes-no-notgiven',
    objective: "Decide whether a claim matches the writer's view, or is simply not given.",
  },
  'reading-headings': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'matching-headings',
    objective: 'Match a heading to a paragraph by its main idea rather than by a repeated word.',
  },
  'reading-matching-information': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'paragraph-matching',
    also: ['skimming-scanning'],
    objective: 'Find which paragraph holds one specific piece of information.',
  },
  'reading-matching-features': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'matching-features',
    objective: 'Match each statement to the person, place or thing it belongs to.',
  },
  'reading-matching-sentence-endings': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'sentence-endings',
    objective: 'Complete a sentence with the ending the passage supports, in correct grammar.',
  },
  'reading-sentence': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'sentence-completion',
    objective: 'Fill a gap with the exact words from the passage, inside the word limit.',
  },
  'reading-summary-completion': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'table-completion',
    fit: 'borrowed',
    objective: 'Complete a summary, note, table or flow chart with words taken from the passage.',
  },
  'reading-diagram': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'diagram-labelling',
    objective: 'Label a diagram with the exact words the passage uses.',
  },
  'reading-short-answer': {
    domain: 'reading',
    paper: 'reading',
    subskill: 'sentence-completion',
    fit: 'borrowed',
    objective: 'Answer a direct question about the passage in the few words the instructions allow.',
  },

  /* Listening, ten parts. The first four are about a recording rather than
     a question type, so their subskill is one of the cross-type listening
     skills. */
  'listening-part1': {
    domain: 'listening',
    paper: 'listening',
    subskill: 'following-correction',
    objective:
      'Catch names, numbers and spellings in an everyday conversation, including a speaker correcting themselves.',
  },
  'listening-part2': {
    domain: 'listening',
    paper: 'listening',
    subskill: 'signposting',
    objective: 'Follow one speaker through a talk or a map by the signposts they use.',
  },
  'listening-part3': {
    domain: 'listening',
    paper: 'listening',
    subskill: 'accent-and-speed',
    also: ['following-correction'],
    objective: 'Keep track of who says what when several speakers discuss a topic at natural speed.',
  },
  'listening-part4': {
    domain: 'listening',
    paper: 'listening',
    subskill: 'signposting',
    objective: 'Follow the structure of an academic lecture and hear where the next answer is coming.',
  },
  'listening-multiple-choice': {
    domain: 'listening',
    paper: 'listening',
    subskill: 'multiple-choice',
    objective: 'Choose the option the recording supports and let the distractors go past.',
  },
  'listening-matching': {
    domain: 'listening',
    paper: 'listening',
    subskill: 'matching-features',
    objective: 'Match each item to the person, place or category the speaker gives it.',
  },
  'listening-map-labelling': {
    domain: 'listening',
    paper: 'listening',
    subskill: 'diagram-labelling',
    fit: 'borrowed',
    objective: 'Label a plan, map or diagram while the speaker moves through it.',
  },
  'listening-form-completion': {
    domain: 'listening',
    paper: 'listening',
    subskill: 'table-completion',
    fit: 'borrowed',
    objective: 'Complete a form, note, table or flow chart with the exact words you hear.',
  },
  'listening-sentence-completion': {
    domain: 'listening',
    paper: 'listening',
    subskill: 'sentence-completion',
    objective: 'Complete a sentence with the exact words you hear, inside the word limit.',
  },
  'listening-short-answer': {
    domain: 'listening',
    paper: 'listening',
    subskill: 'sentence-completion',
    fit: 'borrowed',
    objective: 'Answer a direct question about the recording in the few words the instructions allow.',
  },

  /* Writing, ten parts. Task 1 and Task 2 never share a subskill and never
     share an objective: they are marked on the same four criteria but they
     are different skills, and the policy estimates them separately. */
  'writing-method': {
    domain: 'writing',
    paper: 'writing',
    subskill: 'task1-select-key-features',
    criterion: 'taskAchievement',
    also: ['task1-overview', 'task1-compare-and-group', 'task1-data-language', 'task-length-and-timing'],
    objective: 'Work through a Task 1 report step by step, from reading the visual to checking the wording.',
  },
  'writing-charts': {
    domain: 'writing',
    paper: 'writing',
    subskill: 'task1-data-language',
    criterion: 'taskAchievement',
    also: ['task1-overview', 'task1-compare-and-group'],
    objective: 'Describe and compare the numbers in a chart, graph or table without listing every figure.',
  },
  'writing-process': {
    domain: 'writing',
    paper: 'writing',
    subskill: 'task1-process-sequence',
    criterion: 'taskAchievement',
    also: ['task1-overview', 'task1-select-key-features'],
    objective: 'Describe the stages of a process in order, using the passive where it belongs.',
  },
  'writing-maps': {
    domain: 'writing',
    paper: 'writing',
    subskill: 'task1-map-change',
    criterion: 'taskAchievement',
    also: ['task1-overview', 'task1-select-key-features'],
    objective: 'Describe how a place changed between two maps, using location and change language.',
  },
  'writing-task2-method': {
    domain: 'writing',
    paper: 'writing',
    subskill: 'task2-understand-the-question',
    criterion: 'taskResponse',
    also: [
      'task2-position-and-thesis',
      'task2-topic-sentences',
      'task2-support-a-claim',
      'task2-conclusion',
      'paragraph-organisation',
      'task-length-and-timing',
    ],
    objective: 'Work through a Task 2 essay step by step, from reading the question to the conclusion.',
  },
  'writing-opinion': {
    domain: 'writing',
    paper: 'writing',
    subskill: 'task2-position-and-thesis',
    criterion: 'taskResponse',
    also: ['task2-topic-sentences', 'task2-conclusion'],
    objective: 'State a clear position on an opinion question and hold it to the end.',
  },
  'writing-discussion': {
    domain: 'writing',
    paper: 'writing',
    subskill: 'task2-counter-and-concede',
    criterion: 'taskResponse',
    also: ['task2-topic-sentences', 'task2-support-a-claim'],
    objective: 'Present both views fairly and then give your own, without sitting on the fence.',
  },
  'writing-advantages': {
    domain: 'writing',
    paper: 'writing',
    subskill: 'task2-counter-and-concede',
    criterion: 'taskResponse',
    also: ['task2-support-a-claim'],
    objective: 'Weigh the advantages against the disadvantages and reach a judgement you support.',
  },
  'writing-problem': {
    domain: 'writing',
    paper: 'writing',
    subskill: 'task2-support-a-claim',
    criterion: 'taskResponse',
    also: ['task2-topic-sentences', 'task2-conclusion'],
    objective: 'Name a real cause, propose a workable solution and say why it would work.',
  },
  'writing-twopart': {
    domain: 'writing',
    paper: 'writing',
    subskill: 'task2-understand-the-question',
    criterion: 'taskResponse',
    also: ['paragraph-organisation', 'task2-conclusion'],
    objective: 'Answer both halves of a two-part question, each in its own paragraph.',
  },

  /* Speaking, three parts. */
  'speaking-part1': {
    domain: 'speaking',
    paper: 'speaking',
    subskill: 'part1-extend-an-answer',
    criterion: 'fluencyCoherence',
    also: ['part1-natural-tense-range', 'topic-vocabulary-in-speech'],
    objective: 'Extend a short Part 1 answer into two or three natural sentences.',
  },
  'speaking-part2': {
    domain: 'speaking',
    paper: 'speaking',
    subskill: 'part2-plan-in-one-minute',
    criterion: 'fluencyCoherence',
    also: ['part2-hold-the-two-minutes', 'part2-narrative-structure', 'fluency-repair'],
    objective: 'Plan a cue card in one minute and speak for the full two minutes.',
  },
  'speaking-part3': {
    domain: 'speaking',
    paper: 'speaking',
    subskill: 'part3-abstract-opinion',
    criterion: 'fluencyCoherence',
    also: ['part3-speculate-and-compare'],
    objective: 'Discuss an abstract question with reasons, examples and a comparison.',
  },
};

/** Vocabulary topic lessons are 36 of the 76 and are identical in shape, so
    they are generated rather than listed. One exception: the linking words
    topic sits inside the Writing teaching unit because it is what holds a
    report together, and the catalogue records that it is the nearest thing
    the library has to a cohesion lesson. */
function vocabularyLessonFacts(key: string): LessonFacts {
  return {
    domain: 'vocabulary',
    subskill: 'topic-breadth',
    also: ['recognise-meaning'],
    alsoBorrowed: key === 'vocabulary-conjunctions' ? ['cohesion-and-linking'] : undefined,
    objective: "Use this topic's words accurately when you speak and write.",
  };
}

/* ── Criteria to objectives ──────────────────────────────────────────────── */

/** Which practisable objectives roll up to each Writing criterion, so a
    band report that says "Coherence and Cohesion is your weakest criterion"
    can be turned into something a student can actually do on Tuesday
    (ARCHITECTURE.md section 6.3). Task Achievement and Task Response are
    kept apart on purpose: the same criterion key marks two different
    skills, and merging them is how a Task 2 problem ends up being taught
    with a bar chart. */
export const WRITING_CRITERION_OBJECTIVES: Record<WritingCriterion, readonly WritingSubskill[]> = {
  taskAchievement: [
    'task1-overview',
    'task1-select-key-features',
    'task1-compare-and-group',
    'task1-data-language',
    'task1-process-sequence',
    'task1-map-change',
  ],
  taskResponse: [
    'task2-understand-the-question',
    'task2-position-and-thesis',
    'task2-support-a-claim',
    'task2-counter-and-concede',
    'task2-conclusion',
    'task-length-and-timing',
  ],
  coherenceCohesion: ['paragraph-organisation', 'cohesion-and-linking', 'task2-topic-sentences'],
  lexicalResource: ['lexical-precision'],
  grammaticalRange: ['sentence-correction', 'complex-sentence-range'],
};

/** The same for Speaking (ARCHITECTURE.md section 6.4). Pronunciation is
    listed but a pronunciation objective can only be checked on a new
    recording: audio is not retained, so there is nothing to re-read. */
export const SPEAKING_CRITERION_OBJECTIVES: Record<SpeakingCriterion, readonly SpeakingSubskill[]> = {
  fluencyCoherence: [
    'part1-extend-an-answer',
    'part2-plan-in-one-minute',
    'part2-hold-the-two-minutes',
    'part2-narrative-structure',
    'part3-abstract-opinion',
    'part3-speculate-and-compare',
    'fluency-repair',
  ],
  lexicalResource: ['topic-vocabulary-in-speech'],
  grammaticalRange: ['part1-natural-tense-range'],
  pronunciation: ['pronunciation-stress-and-rhythm', 'pronunciation-individual-sounds'],
};

/** The subskill a Writing prompt's form is really about, so a Task 1 map
    prompt is practice for map change and not for chart language. */
const WRITING_FORM_SUBSKILL: Record<string, WritingSubskill> = {
  chart: 'task1-data-language',
  table: 'task1-data-language',
  combination: 'task1-compare-and-group',
  process: 'task1-process-sequence',
  map: 'task1-map-change',
  opinion: 'task2-position-and-thesis',
  discussion: 'task2-counter-and-concede',
  'advantages-disadvantages': 'task2-counter-and-concede',
  'two-part': 'task2-understand-the-question',
};

/** One sentence per prompt form, so sixty prompts share eight objectives
    rather than carrying sixty near-identical strings into the Worker. */
const WRITING_FORM_OBJECTIVE: Record<string, string> = {
  chart: 'Write a full Task 1 report on a chart, graph or table and get a band on the four criteria.',
  table: 'Write a full Task 1 report on a chart, graph or table and get a band on the four criteria.',
  combination: 'Write a full Task 1 report on two visuals together and get a band on the four criteria.',
  process: 'Write a full Task 1 report on a process diagram and get a band on the four criteria.',
  map: 'Write a full Task 1 report on a pair of maps and get a band on the four criteria.',
  opinion: 'Write a full Task 2 opinion essay and get a band on the four criteria.',
  discussion: 'Write a full Task 2 discussion essay and get a band on the four criteria.',
  'advantages-disadvantages':
    'Write a full Task 2 advantages and disadvantages essay and get a band on the four criteria.',
  'two-part': 'Write a full Task 2 two-part essay and get a band on the four criteria.',
};

/* ── Id shapes ───────────────────────────────────────────────────────────── */

export const lessonActivityId = (lessonKey: string): string => `lesson:${lessonKey}`;
export const checkActivityId = (setId: string): string => `check:${setId}`;
export const drillActivityId = (drillId: string): string => `drill:${drillId}`;
export const paperActivityId = (testId: string): string => `test:${testId}`;
export const writingActivityId = (promptId: string): string => `write:${promptId}`;
export const speakingActivityId = (promptId: string): string => `speak:${promptId}`;
export const speakingPart3ActivityId = (cueCardId: string): string => `speak:${cueCardId}:part3`;
export const focusedActivityId = (exerciseId: string): string => `focus:${exerciseId}`;
export const vocabReviewActivityId = (topicSlug: string): string => `review:vocabulary:${topicSlug}`;
export const practiseActivityId = (skill: 'reading' | 'listening', type: string): string =>
  `practise:${skill}:${type}`;

/* ── Small helpers ───────────────────────────────────────────────────────── */

/** The path a student is sent to, with the hash and query put back, or null
    for a task that is run in place. Unprefixed, exactly like
    CourseLesson.href: callers apply withBase(). */
export function activityHref(activity: CatalogueActivity): string | null {
  const { target } = activity;
  if (target.kind !== 'route') return null;
  const query = target.query ?? {};
  const pairs = Object.keys(query)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key] as string)}`);
  return target.href + (pairs.length ? `?${pairs.join('&')}` : '') + (target.hash ? `#${target.hash}` : '');
}

function route(href: string, extra?: { hash?: string; query?: Record<string, string> }): ActivityTarget {
  return { kind: 'route', href, ...extra };
}

/** A teacher has checked it, or its source has. Anything this project wrote
    starts unverified: lead decision Q1 allows unverified authored material
    for guided practice only, never for an independent check. */
function isVerified(provenance: ContentProvenance): boolean {
  return provenance !== 'project-authored';
}

function locales(hasRussian: boolean): readonly Locale[] {
  return hasRussian ? BILINGUAL : ENGLISH_ONLY;
}

/** A navigational entry point: a filtered list of drills, or the tests hub.
    It is a real place to send a student, but it names no items of its own,
    so it can never be an independent check on specific material. */
const HUB_TAG = 'hub';

function isHub(activity: CatalogueActivity): boolean {
  return (activity.tags ?? []).includes(HUB_TAG);
}

/** Merge a coverage list, keeping the better fit when the same subskill
    arrives twice, and ordering it so the result is reproducible. */
function mergeCoverage(entries: readonly SubskillCoverage[]): readonly SubskillCoverage[] {
  const best = new Map<Subskill, 'direct' | 'borrowed'>();
  for (const entry of entries) {
    const current = best.get(entry.subskill);
    if (current === 'direct') continue;
    best.set(entry.subskill, entry.fit);
  }
  return [...best.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([subskill, fit]) => ({ subskill, fit }));
}

/** Leave `covers` off when it says nothing the activity's own subskill does
    not already say. The lookups fall back to `subskill`, and 670 activities
    carrying a one-entry list each would be pure weight in a Worker. */
function coversOrNothing(
  subskill: Subskill,
  entries: readonly SubskillCoverage[],
): readonly SubskillCoverage[] | undefined {
  if (entries.length === 1 && entries[0]!.subskill === subskill && entries[0]!.fit === 'direct') return undefined;
  return entries.length ? entries : undefined;
}

/** The question type a drill, paper or check is mostly made of. Ties break
    alphabetically so two runs agree. */
function dominantType(byType: Readonly<Record<string, number>>, fallback: Subskill): Subskill {
  let winner: string | null = null;
  let most = 0;
  for (const type of Object.keys(byType).sort()) {
    const count = byType[type] ?? 0;
    if (count > most) {
      most = count;
      winner = type;
    }
  }
  return (winner as Subskill | null) ?? fallback;
}

function coverageFromTypes(byType: Readonly<Record<string, number>>): readonly SubskillCoverage[] {
  return mergeCoverage(
    Object.keys(byType)
      .filter((type) => (byType[type] ?? 0) > 0)
      .map((type) => ({ subskill: type as Subskill, fit: 'direct' as const })),
  );
}

function checkMinutes(itemCount: number): number {
  const raw = Math.round(itemCount * CHECK_MINUTES_PER_ITEM);
  return Math.min(CHECK_MAX_MINUTES, Math.max(CHECK_MIN_MINUTES, raw));
}

/** Small non-cryptographic hash, the same idea as insightsFingerprint in
    src/lib/tutor/insights.ts, widened to sixteen hex characters so it reads
    like the index version beside it. This is a cache key, not a secret. */
function hash16(input: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ code, 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/* ── Lessons ─────────────────────────────────────────────────────────────── */

/** Which lessons should normally come first.
 *
 *  Two rules, both straight from docs/COURSE-STRUCTURE.md: a paper's
 *  overview comes before its techniques, and a method lesson comes before
 *  the task types that use it. Reading's core skill lesson counts as its
 *  method, and Speaking's three parts run in order, which is the
 *  progression that document's own checks already pin.
 *
 *  Unit position is NOT a prerequisite. A student who wants Reading
 *  Matching Headings on day one is not blocked by nine vocabulary topics
 *  that happen to sit earlier in the eight units. */
function lessonPrerequisites(lesson: CourseLesson): readonly string[] {
  if (OVERVIEW_KEYS.has(lesson.key)) return [];
  const prerequisites = [lessonActivityId(OVERVIEW_KEY[lesson.skill] as string)];
  if (lesson.skill === 'reading' && lesson.key !== READING_CORE_SKILL) {
    prerequisites.push(lessonActivityId(READING_CORE_SKILL));
  }
  if (WRITING_TASK1_LESSONS.has(lesson.key)) prerequisites.push(lessonActivityId(WRITING_TASK1_METHOD));
  if (WRITING_TASK2_LESSONS.has(lesson.key)) prerequisites.push(lessonActivityId(WRITING_TASK2_METHOD));
  if (lesson.key === 'speaking-part2') prerequisites.push(lessonActivityId('speaking-part1'));
  if (lesson.key === 'speaking-part3') prerequisites.push(lessonActivityId('speaking-part2'));
  return prerequisites;
}

/** The lesson key the site itself sends a student to for one question type,
    e.g. 'reading-headings' for ('reading', 'matching-headings'). Built from
    lessonPath() so the catalogue and the lesson pages can never disagree. */
function lessonKeyForType(skill: 'reading' | 'listening', type: QuestionType): string | null {
  const path = lessonPath(skill, type);
  if (!path) return null;
  const slug = path.split('/').pop();
  return slug ? `${skill}-${slug}` : null;
}

function buildLessonActivities(index: GeneratedIndexV1): CatalogueActivity[] {
  const lessons = buildCourse().flatMap((unit) => unit.lessons);
  const noRussian = new Set(LESSONS_WITHOUT_RUSSIAN);

  /* What the site's own type-to-lesson map says each lesson also covers.
     Collected first so a lesson that teaches a neighbouring type carries it
     with fit 'borrowed' rather than being invisible to the planner. */
  const extra = new Map<string, SubskillCoverage[]>();
  for (const skill of ['reading', 'listening'] as const) {
    for (const coverage of index.questionTypes) {
      const key = lessonKeyForType(skill, coverage.type as QuestionType);
      if (!key) continue;
      const facts = LESSON_FACTS[key];
      const fit = facts && facts.subskill === coverage.type && facts.fit !== 'borrowed' ? 'direct' : 'borrowed';
      const list = extra.get(key) ?? [];
      list.push({ subskill: coverage.type as Subskill, fit });
      extra.set(key, list);
    }
  }

  return lessons.map((lesson) => {
    const facts = LESSON_FACTS[lesson.key] ?? vocabularyLessonFacts(lesson.key);
    const covers = mergeCoverage([
      { subskill: facts.subskill, fit: facts.fit ?? 'direct' },
      ...(facts.also ?? []).map((subskill) => ({ subskill, fit: 'direct' as const })),
      ...(facts.alsoBorrowed ?? []).map((subskill) => ({ subskill, fit: 'borrowed' as const })),
      ...(extra.get(lesson.key) ?? []),
    ]);
    return {
      id: lessonActivityId(lesson.key),
      contentVersion: 1,
      kind: 'lesson',
      domain: facts.domain,
      paper: facts.paper,
      subskill: facts.subskill,
      covers: coversOrNothing(facts.subskill, covers),
      criterion: facts.criterion,
      objective: facts.objective,
      prerequisites: lessonPrerequisites(lesson),
      expectedMinutes: lesson.minutes ?? LESSON_FALLBACK_MINUTES,
      indivisible: false,
      target: route(lesson.href),
      /* Reading a lesson page and pressing the button proves visiting, and
         nothing else. The quick check beside it is the evidence. */
      completionEvidence: 'self-marked',
      explanationLocales: locales(!noRussian.has(lesson.key)),
      provenance: 'project-authored',
      verified: false,
    };
  });
}

/* ── Lesson quick checks ─────────────────────────────────────────────────── */

function buildCheckActivities(index: GeneratedIndexV1): CatalogueActivity[] {
  const noRussian = new Set(LESSONS_WITHOUT_RUSSIAN);
  const reserved = reservedCheckPapers(index);
  return index.lessonChecks.map((set: LessonCheckIndexEntry) => {
    const byType: Record<string, number> = {};
    for (const item of set.items) byType[item.type as string] = (byType[item.type as string] ?? 0) + 1;
    const papers = [...new Set(set.items.map((item) => item.sourceTestId).filter(Boolean))].sort() as string[];
    const allImported = set.items.every((item) => item.fromImportedPaper);
    const provenance: ContentProvenance = allImported ? 'imported-paper' : 'project-authored';
    const subskill = dominantType(byType, 'paraphrase');
    return {
      id: checkActivityId(set.id),
      contentVersion: 1,
      kind: 'lesson-check',
      domain: set.skill,
      paper: set.skill,
      subskill,
      covers: coversOrNothing(subskill, coverageFromTypes(byType)),
      objective: 'Check what you took from this lesson on a few real questions.',
      prerequisites: [lessonActivityId(set.lessonKey)],
      expectedMinutes: checkMinutes(set.items.length),
      indivisible: false,
      /* The check lives on its own lesson page; there is no separate route
         for it, and no anchor either, so the student lands on the lesson
         and scrolls to the exercise at the bottom. */
      target: route(`/lessons/${set.skill}/${set.lessonKey.slice(set.skill.length + 1)}`),
      completionEvidence: 'scored-items',
      explanationLocales: locales(!noRussian.has(set.lessonKey)),
      provenance,
      verified: isVerified(provenance),
      sharesItemsWith: papers.map(paperActivityId),
      sourcePaperIds: papers,
      /* A lesson check quoting a paper reserved for an independent check
         (WP18b/WP19, 2026-09-22, extending the same rule buildDrillActivities
         already applies to drills) would otherwise let ordinary "study the
         lesson" traffic spend the very questions a later check needs to stay
         unseen. Found for real: practice-listening-short-answer quotes
         listening-full-008, one of the three papers WP18b/WP19 reserves. */
      ...(papers.some((paperId) => reserved.has(paperId)) ? { tags: [CHECK_ONLY_TAG] } : {}),
    };
  });
}

/* ── Drills and full papers ──────────────────────────────────────────────── */

function buildDrillActivities(index: GeneratedIndexV1): CatalogueActivity[] {
  const noRussian = new Set(TESTS_WITHOUT_RUSSIAN_EXPLANATIONS);
  const reserved = reservedCheckPapers(index);
  return index.drills.map((drill: DrillIndexEntry) => ({
    id: drillActivityId(drill.id),
    contentVersion: 1,
    kind: 'drill',
    domain: drill.skill,
    paper: drill.skill,
    subskill: dominantType(drill.byType, 'sentence-completion'),
    covers: coversOrNothing(dominantType(drill.byType, 'sentence-completion'), coverageFromTypes(drill.byType)),
    objective:
      drill.skill === 'reading'
        ? 'Work one real Reading passage under time and see every answer explained.'
        : 'Work one real Listening section under time and see every answer explained.',
    prerequisites: [lessonActivityId(OVERVIEW_KEY[drill.skill] as string)],
    expectedMinutes: drill.durationMinutes,
    indivisible: false,
    target: route(`/trainers/${drill.skill}/${drill.id}`),
    completionEvidence: 'scored-items',
    explanationLocales: locales(!noRussian.has(drill.sourceTestId)),
    provenance: 'imported-paper',
    verified: true,
    /* Every drill is a part lifted out of a real paper, so sitting it
       spends that paper's questions. Without this an "unseen check" could
       hand a student the very questions they drilled last week. */
    sharesItemsWith: [paperActivityId(drill.sourceTestId)],
    sourcePaperIds: [drill.sourceTestId],
    /* This part comes out of a paper a focused check draws on, so spending
       it on practice would spend the check with it. */
    ...(reserved.has(drill.sourceTestId) ? { tags: [CHECK_ONLY_TAG] } : {}),
  }));
}

function buildPaperActivities(index: GeneratedIndexV1): CatalogueActivity[] {
  const noRussian = new Set(TESTS_WITHOUT_RUSSIAN_EXPLANATIONS);
  const drillsByTest = new Map<string, string[]>();
  for (const drill of index.drills) {
    const list = drillsByTest.get(drill.sourceTestId) ?? [];
    list.push(drillActivityId(drill.id));
    drillsByTest.set(drill.sourceTestId, list);
  }
  return index.tests.map((paper: TestIndexEntry) => ({
    id: paperActivityId(paper.id),
    contentVersion: 1,
    kind: 'full-test',
    domain: paper.skill,
    paper: paper.skill,
    /* A whole paper under time is not about one question type; what it
       measures beyond the types is pacing and getting answers down. */
    subskill: 'timing-and-transfer',
    covers: coversOrNothing('timing-and-transfer', coverageFromTypes(paper.byType)),
    objective:
      paper.skill === 'reading'
        ? 'Sit a complete Reading paper under exam timing and get a band estimate.'
        : 'Sit a complete Listening paper under exam timing and get a band estimate.',
    prerequisites: [lessonActivityId(OVERVIEW_KEY[paper.skill] as string)],
    expectedMinutes: paper.durationMinutes,
    /* A paper is never trimmed to fit a short day. The planner offers it as
       a longer commitment the student accepts, or not at all. */
    indivisible: true,
    target: route(`/tests/${paper.id}`),
    completionEvidence: 'scored-paper',
    explanationLocales: locales(!noRussian.has(paper.id)),
    provenance: paper.provenance,
    verified: isVerified(paper.provenance),
    sharesItemsWith: (drillsByTest.get(paper.id) ?? []).sort(),
    sourcePaperIds: [paper.id],
    tags: ['unseen-reserved'],
  }));
}

/* ── Graded tasks ────────────────────────────────────────────────────────── */

function buildWritingActivities(index: GeneratedIndexV1): CatalogueActivity[] {
  const reservedPrompts = reservedCheckPrompts(index);
  return index.writingPrompts.map((prompt) => {
    const subskill = WRITING_FORM_SUBSKILL[prompt.form] ?? (prompt.task === 'task1'
      ? 'task1-select-key-features'
      : 'task2-understand-the-question');
    const objective =
      WRITING_FORM_OBJECTIVE[prompt.form] ??
      (prompt.task === 'task1'
        ? 'Write a full Task 1 report and get a band on the four criteria.'
        : 'Write a full Task 2 essay and get a band on the four criteria.');
    return {
      id: writingActivityId(prompt.id),
      contentVersion: 1,
      kind: 'graded-task',
      domain: 'writing',
      paper: 'writing',
      subskill,
      covers: mergeCoverage([
        { subskill, fit: 'direct' },
        { subskill: 'task-length-and-timing', fit: 'direct' },
        /* Every Task 1 report contains an overview, and the calibrated
           grader's Task Achievement comment is where a missing one shows
           up. So a full report does exercise the objective, but it is the
           whole task that is marked and not the overview on its own, which
           is exactly what 'borrowed' means here. A short overview task
           fits it directly and therefore comes first; this entry is what
           lets the plan schedule the full graded task once the short one
           has been demonstrated. */
        ...(prompt.task === 'task1'
          ? ([{ subskill: 'task1-overview', fit: 'borrowed' }] as const)
          : []),
      ]),
      criterion: prompt.task === 'task1' ? 'taskAchievement' : 'taskResponse',
      objective,
      prerequisites: [
        lessonActivityId(prompt.task === 'task1' ? WRITING_TASK1_METHOD : WRITING_TASK2_METHOD),
      ],
      expectedMinutes: prompt.suggestedMinutes,
      /* Half an essay earns no band, so this is never cut down either. */
      indivisible: true,
      target: route('/trainers/writing', { query: { task: prompt.id } }),
      completionEvidence: 'graded-rubric',
      explanationLocales: BILINGUAL,
      provenance: prompt.provenance,
      verified: isVerified(prompt.provenance),
      /* Writing about this chart is what makes it seen, so a transfer
         check built on it is no longer a transfer check. */
      sourcePromptIds: [prompt.id],
      tags: tagsOrNothing([
        ...(prompt.modelAnswerBands.length > 1 ? ['has-contrasting-models'] : []),
        ...(reservedPrompts.has(prompt.id) ? [CHECK_ONLY_TAG] : []),
      ]),
    };
  });
}

/** Leave `tags` off when there are none, the same way `covers` is left off
    when it says nothing: sixty empty arrays are pure weight in a Worker. */
function tagsOrNothing(tags: readonly string[]): readonly string[] | undefined {
  return tags.length > 0 ? tags : undefined;
}

function buildSpeakingActivities(index: GeneratedIndexV1): CatalogueActivity[] {
  const activities: CatalogueActivity[] = [];
  for (const prompt of index.speakingPrompts) {
    const shared = {
      contentVersion: 1,
      kind: 'graded-task' as const,
      domain: 'speaking' as const,
      paper: 'speaking' as const,
      criterion: 'fluencyCoherence' as const,
      indivisible: true,
      completionEvidence: 'graded-rubric' as const,
      explanationLocales: BILINGUAL,
      provenance: prompt.provenance,
      verified: isVerified(prompt.provenance),
      /* No microphone, no Speaking evidence: pronunciation is judged from
         the recording itself and audio is never retained. */
      tags: ['needs-microphone'],
    };
    if (prompt.part === 1) {
      activities.push({
        ...shared,
        id: speakingActivityId(prompt.id),
        subskill: 'part1-extend-an-answer',
        covers: mergeCoverage([
          { subskill: 'part1-extend-an-answer', fit: 'direct' },
          { subskill: 'part1-natural-tense-range', fit: 'direct' },
          { subskill: 'topic-vocabulary-in-speech', fit: 'direct' },
        ]),
        objective: 'Answer a Part 1 topic out loud and get a band on the four criteria.',
        prerequisites: [lessonActivityId('speaking-part1')],
        expectedMinutes: SPEAKING_PART1_MINUTES,
        /* Sends the student straight into that topic: the query shape
           SpeakingTester's deep link parses (attempt-recording.ts's
           parseSpeakingDeepLink), same pattern as the writing prompts' own
           ?task=<id> route below. */
        target: route('/trainers/speaking', { query: { part: '1', topic: prompt.id } }),
      });
      continue;
    }
    activities.push({
      ...shared,
      id: speakingActivityId(prompt.id),
      subskill: 'part2-hold-the-two-minutes',
      covers: mergeCoverage([
        { subskill: 'part2-hold-the-two-minutes', fit: 'direct' },
        { subskill: 'part2-plan-in-one-minute', fit: 'direct' },
        { subskill: 'part2-narrative-structure', fit: 'direct' },
        { subskill: 'fluency-repair', fit: 'direct' },
      ]),
      objective: 'Plan and deliver a two-minute Part 2 talk and get a band on the four criteria.',
      prerequisites: [lessonActivityId('speaking-part2')],
      expectedMinutes: SPEAKING_CUE_CARD_MINUTES,
      target: route('/trainers/speaking', { query: { part: '2', card: prompt.id } }),
    });
    if (prompt.part3QuestionCount) {
      activities.push({
        ...shared,
        id: speakingPart3ActivityId(prompt.id),
        subskill: 'part3-abstract-opinion',
        covers: mergeCoverage([
          { subskill: 'part3-abstract-opinion', fit: 'direct' },
          { subskill: 'part3-speculate-and-compare', fit: 'direct' },
        ]),
        objective: 'Discuss the Part 3 follow-up questions and get a band on the four criteria.',
        prerequisites: [lessonActivityId('speaking-part3')],
        expectedMinutes: prompt.part3QuestionCount * SPEAKING_PART3_MINUTES_PER_QUESTION,
        target: route('/trainers/speaking', { query: { part: '3', card: prompt.id } }),
        /* The follow-ups belong to the same cue card, so answering both in
           one sitting is one exposure, not two. */
        sharesItemsWith: [speakingActivityId(prompt.id)],
      });
    }
  }
  return activities;
}

/* ── Focused exercises ───────────────────────────────────────────────────── */

/** One question group out of one real paper, opened on its own page.
 *
 *  Anything authored in this project is unverified until a teacher checks
 *  it, which is what keeps it out of the independent-check slot (lead
 *  decision Q1). An exercise lifted from a publisher's paper is verified by
 *  its source, and it carries that paper's id so the planner can tell
 *  whether the student has already met these questions.
 *
 *  A Reading or Listening exercise has a real answer key, so what it
 *  produces is scored items: that is what lets a fresh check move an
 *  estimate. A Writing or Speaking one is judged against its one objective
 *  instead, and never carries a band. */
function buildFocusedActivities(index: GeneratedIndexV1): CatalogueActivity[] {
  return index.focusedExercises.map((exercise) => {
    const verified = isVerified(exercise.provenance);
    const scored = exercise.paper === 'reading' || exercise.paper === 'listening';
    const isCheck = exercise.role === 'independent-check';
    return {
      id: focusedActivityId(exercise.id),
      contentVersion: 1,
      kind: 'focused-exercise',
      domain: exercise.paper,
      paper: exercise.paper,
      subskill: exercise.subskill,
      objective: exercise.objective ?? 'Practise one thing on a few unseen items, with no help and no timer.',
      prerequisites: [],
      expectedMinutes: exercise.expectedMinutes,
      indivisible: false,
      target: route(FOCUSED_EXERCISE_ROUTE + exercise.id),
      completionEvidence: scored ? 'scored-items' : 'objective-judged',
      explanationLocales: BILINGUAL,
      provenance: exercise.provenance,
      verified,
      /* Lead decision Q1: unverified authored material (sentence endings,
         WP18a) may be used for guided practice, never for an independent
         check. So it is `unavailable` only when it IS a check: a guided
         set stays fully schedulable while unverified, which is the whole
         point of authoring it. (No unverified check-role exercise exists
         today; nothing here creates one, this is what stops a future one
         from quietly becoming schedulable as a check by omission.) */
      unavailable: verified || !isCheck
        ? undefined
        : {
            code: 'not-verified' as const,
            reason: 'This set was written here and no teacher has checked it yet, so it cannot be used as an independent check.',
          },
      ...(exercise.sharesItemsWith ? { sharesItemsWith: [...exercise.sharesItemsWith].sort() } : {}),
      ...(exercise.sourcePaperIds ? { sourcePaperIds: exercise.sourcePaperIds } : {}),
      ...(exercise.sourcePromptIds ? { sourcePromptIds: exercise.sourcePromptIds } : {}),
      /* A check is held back from ordinary practice, and a guided set is
         held back from being a check: it is worked with hints and with the
         answers explained, so whatever it scores it shows guided work.
         The kind rides as a tag rather than a field because `kind` on an
         activity already means what sort of thing it is; what a student
         actually produces is a second question, and the screen that asks
         it reads the registry anyway. */
      tags: [
        'unseen-reserved',
        isCheck ? CHECK_ONLY_TAG : GUIDED_ONLY_TAG,
        ...(exercise.kind === 'written-response' ? [WRITTEN_RESPONSE_TAG] : []),
        /* A Listening focused exercise plays a segment of a real recording
           rather than showing a passage (WP18b/WP19, 2026-09-22): the
           trainer needs an audio player, not text, to run this one. */
        ...(exercise.paper === 'listening' ? [NEEDS_AUDIO_TAG] : []),
      ],
    };
  });
}

/** A Listening focused exercise plays a segment of the paper's own
    recording rather than showing a passage. Named here rather than assumed
    from `paper === 'listening'` at every call site, the same reason
    CHECK_ONLY_TAG and GUIDED_ONLY_TAG are named constants below. */
const NEEDS_AUDIO_TAG = 'needs-audio';

/** Where a focused exercise is opened. Must stay in step with
    focusedExerciseHref in src/data/focused-exercises.ts and with the route
    at src/pages/trainers/focused/[id].astro; tests/pilot-matching-headings
    .test.ts asserts the three agree. It sits under /trainers because that
    is the Practice tab, which is what a focused exercise is. */
const FOCUSED_EXERCISE_ROUTE = '/trainers/focused/';

/** Material held back so that an independent check still has somewhere to
 *  happen.
 *
 *  An independent check has to be material this student has never met, and
 *  there is only so much of it. Once an ordinary practice drill has been
 *  sat, its paper is spent for good: the questions are the same questions.
 *  So the papers the check exercises draw on are marked here, and
 *  practiceForSubskill leaves anything carrying this tag alone. They stay
 *  in the library, they stay linkable, and a student who goes looking for
 *  them can still sit them; the PLAN simply never spends them on practice.
 *
 *  Derived from the exercises themselves rather than listed by hand, so
 *  adding a check for another question type reserves its paper with it. */
const CHECK_ONLY_TAG = 'check-only';

/** The other half of the same rule: an exercise meant to be worked WITH
    help cannot be an independent check, however fresh its questions are. */
const GUIDED_ONLY_TAG = 'guided-only';

/** The student writes their own sentences here rather than answering items
    with a key, so the screen is a different one and the evidence is an
    objective judgement, never a mark. */
export const WRITTEN_RESPONSE_TAG = 'written-response';

function reservedCheckPapers(index: GeneratedIndexV1): ReadonlySet<string> {
  const out = new Set<string>();
  for (const exercise of index.focusedExercises) {
    if (exercise.role !== 'independent-check') continue;
    for (const paperId of exercise.sourcePaperIds ?? []) out.add(paperId);
  }
  return out;
}

/** The exam prompts held back for an independent check, on the same rule.
 *
 *  Writing the full report on one of these would spend the very chart the
 *  transfer check needs, so the full graded task built on each of them is
 *  marked check material below. It stays in the library and stays in the
 *  Writing trainer's own rotation; the PLAN simply never spends it. */
function reservedCheckPrompts(index: GeneratedIndexV1): ReadonlySet<string> {
  const out = new Set<string>();
  for (const exercise of index.focusedExercises) {
    if (exercise.role !== 'independent-check') continue;
    for (const promptId of exercise.sourcePromptIds ?? []) out.add(promptId);
  }
  return out;
}

/* ── Spoken focused practice (WP20, 2026-09-22) ──────────────────────────── */

/** Self-check speaking objectives, built by hand from
 *  src/data/focused/speaking-*.ts rather than from the generated index: see
 *  the header comment on SpokenFocusedTask in
 *  src/data/focused-exercises.ts for why. There are three of them today,
 *  which is why this is a short hand-written list in the same style as
 *  buildFixedActivities() rather than a generated section.
 *
 *  `completionEvidence` is 'self-marked', not 'objective-judged': nothing
 *  here judges anything, the student checks their own recording against a
 *  checklist (spoken-focused-task.ts), so it is exactly the same honesty as
 *  a lesson's own completion click. Sending the same idea to the real
 *  grader afterwards is a SEPARATE activity (the existing `speak:<id>`
 *  graded-task entries above), never this one. */
function buildSpokenFocusedActivities(): CatalogueActivity[] {
  return SPOKEN_FOCUSED_TASKS.map((task: SpokenFocusedTask) => ({
    id: focusedActivityId(task.id),
    contentVersion: 1,
    kind: 'focused-exercise',
    domain: 'speaking',
    paper: 'speaking',
    subskill: task.subskill,
    objective: task.objective,
    prerequisites: task.lesson ? [lessonActivityId(task.lesson.key)] : [],
    expectedMinutes: task.expectedMinutes,
    indivisible: false,
    target: route(spokenFocusedTaskHref(task.id)),
    completionEvidence: 'self-marked',
    explanationLocales: BILINGUAL,
    provenance: task.provenance,
    verified: isVerified(task.provenance),
    tags: ['needs-microphone', GUIDED_ONLY_TAG],
  }));
}

/* ── Vocabulary ──────────────────────────────────────────────────────────── */

function buildVocabularyActivities(index: GeneratedIndexV1): CatalogueActivity[] {
  return index.vocabTopics.map((topic: VocabTopicIndexEntry) => ({
    id: vocabReviewActivityId(topic.slug),
    contentVersion: 1,
    kind: 'vocab-review',
    domain: 'vocabulary',
    subskill: 'recall-from-meaning',
    covers: mergeCoverage([
      { subskill: 'recall-from-meaning', fit: 'direct' },
      { subskill: 'recognise-meaning', fit: 'direct' },
      { subskill: 'topic-breadth', fit: 'direct' },
    ]),
    objective: "Recall this topic's words from memory, not only recognise them.",
    prerequisites: topic.lessonKey ? [lessonActivityId(topic.lessonKey)] : [],
    expectedMinutes: VOCAB_REVIEW_MINUTES,
    indivisible: false,
    target: route('/review', { query: { topic: topic.slug } }),
    completionEvidence: 'recall-outcome',
    explanationLocales: BILINGUAL,
    provenance: 'project-authored',
    verified: false,
  }));
}

/* ── Practise one question type ──────────────────────────────────────────── */

/** The per-type drill filters the tutor already emits, rebuilt from the
    measured counts rather than from practisePath(), which never returns
    undefined and so cannot tell a real filter from an empty one. */
function buildPractiseActivities(index: GeneratedIndexV1): CatalogueActivity[] {
  const activities: CatalogueActivity[] = [];
  for (const skill of ['reading', 'listening'] as const) {
    for (const coverage of index.questionTypes) {
      const type = coverage.type as QuestionType;
      const counts = skill === 'reading' ? coverage.reading : coverage.listening;
      const label = questionTypeLabel(type);
      const paperName = skill === 'reading' ? 'Reading' : 'Listening';
      let unavailable: ActivityUnavailable | undefined;
      if (coverage.absent) {
        unavailable = {
          code: 'no-material',
          reason: `No paper in the library contains a ${label} question, so there is nothing real to practise here yet.`,
        };
      } else if (counts.drills === 0) {
        unavailable = {
          code: 'no-material',
          reason: `No ${paperName} drill contains a ${label} question, because this question type belongs to the other paper.`,
        };
      }
      activities.push({
        id: practiseActivityId(skill, type),
        contentVersion: 1,
        kind: 'drill',
        domain: skill,
        paper: skill,
        subskill: type,
        objective: `Practise ${label} questions in ${paperName} across short drills.`,
        prerequisites: [lessonActivityId(OVERVIEW_KEY[skill] as string)],
        expectedMinutes: TRAINER_HUB_MINUTES,
        indivisible: false,
        /* Exactly the path practisePath() builds, so a link stored in
           Supabase months ago still lands where it did. */
        target: route(`/trainers/${skill}`, { query: { type } }),
        completionEvidence: 'scored-items',
        explanationLocales: BILINGUAL,
        provenance: 'imported-paper',
        verified: true,
        unavailable,
        tags: [HUB_TAG],
      });
    }
  }
  return activities;
}

/* ── The fixed destinations ──────────────────────────────────────────────── */

/** Practice surfaces, the mock, and the reference libraries. Every id here
    already exists in src/lib/tutor/catalog.ts and points at the same page;
    the two new ones are the cue card bank and the saved lessons and notes,
    which the tutor never linked but a session step can. */
function buildFixedActivities(): CatalogueActivity[] {
  const reference = {
    contentVersion: 1,
    kind: 'reference' as const,
    prerequisites: [] as readonly string[],
    expectedMinutes: REFERENCE_MINUTES,
    indivisible: false,
    /* Nothing observable happens on a reference page, which is why it may
       only ever be a step inside a session, never the session's objective. */
    completionEvidence: 'none' as const,
    explanationLocales: BILINGUAL,
  };
  return [
    {
      id: 'test:reading',
      contentVersion: 1,
      kind: 'full-test',
      domain: 'reading',
      paper: 'reading',
      subskill: 'timing-and-transfer',
      objective: 'Choose a Reading paper from the list and sit it under exam timing.',
      prerequisites: [lessonActivityId('reading-task1')],
      expectedMinutes: 60,
      indivisible: true,
      target: route('/tests', { hash: 'reading-tests' }),
      completionEvidence: 'scored-paper',
      explanationLocales: BILINGUAL,
      provenance: 'imported-paper',
      verified: true,
      tags: [HUB_TAG, 'unseen-reserved'],
    },
    {
      id: 'test:listening',
      contentVersion: 1,
      kind: 'full-test',
      domain: 'listening',
      paper: 'listening',
      subskill: 'timing-and-transfer',
      objective: 'Choose a Listening paper from the list and sit it under exam timing.',
      prerequisites: [lessonActivityId('listening')],
      expectedMinutes: 40,
      indivisible: true,
      target: route('/tests', { hash: 'listening-tests' }),
      completionEvidence: 'scored-paper',
      explanationLocales: BILINGUAL,
      provenance: 'imported-paper',
      verified: true,
      tags: [HUB_TAG, 'unseen-reserved'],
    },
    {
      id: 'test:mock',
      contentVersion: 1,
      kind: 'full-test',
      domain: 'exam-skills',
      subskill: 'timing-strategy',
      objective: 'Sit all four papers back to back, the closest thing here to the real exam day.',
      prerequisites: [],
      expectedMinutes: MOCK_MINUTES,
      indivisible: true,
      target: route('/tests/mock'),
      completionEvidence: 'scored-paper',
      explanationLocales: BILINGUAL,
      provenance: 'imported-paper',
      verified: true,
      tags: ['needs-microphone', 'unseen-reserved'],
    },
    {
      id: 'trainer:reading',
      contentVersion: 1,
      kind: 'drill',
      domain: 'reading',
      paper: 'reading',
      subskill: 'timing-and-transfer',
      objective: 'Practise one Reading passage at a time, filtered to the question type you choose.',
      prerequisites: [lessonActivityId('reading-task1')],
      expectedMinutes: TRAINER_HUB_MINUTES,
      indivisible: false,
      target: route('/trainers/reading'),
      completionEvidence: 'scored-items',
      explanationLocales: BILINGUAL,
      provenance: 'imported-paper',
      verified: true,
      tags: [HUB_TAG],
    },
    {
      id: 'trainer:listening',
      contentVersion: 1,
      kind: 'drill',
      domain: 'listening',
      paper: 'listening',
      subskill: 'timing-and-transfer',
      objective: 'Practise one Listening section at a time, filtered to the question type you choose.',
      prerequisites: [lessonActivityId('listening')],
      expectedMinutes: TRAINER_HUB_MINUTES,
      indivisible: false,
      target: route('/trainers/listening'),
      completionEvidence: 'scored-items',
      explanationLocales: BILINGUAL,
      provenance: 'imported-paper',
      verified: true,
      tags: [HUB_TAG],
    },
    {
      id: 'trainer:writing',
      contentVersion: 1,
      kind: 'graded-task',
      domain: 'writing',
      paper: 'writing',
      subskill: 'task-length-and-timing',
      criterion: 'taskResponse',
      objective: 'Write a full Task 1 or Task 2 under time and get a band on the four criteria.',
      prerequisites: [lessonActivityId('writing')],
      expectedMinutes: 40,
      indivisible: true,
      target: route('/trainers/writing'),
      completionEvidence: 'graded-rubric',
      explanationLocales: BILINGUAL,
      provenance: 'publisher',
      verified: true,
    },
    {
      id: 'trainer:speaking',
      contentVersion: 1,
      kind: 'graded-task',
      domain: 'speaking',
      paper: 'speaking',
      subskill: 'fluency-repair',
      covers: mergeCoverage([
        { subskill: 'fluency-repair', fit: 'direct' },
        { subskill: 'part1-extend-an-answer', fit: 'direct' },
        { subskill: 'part2-hold-the-two-minutes', fit: 'direct' },
        { subskill: 'part3-abstract-opinion', fit: 'direct' },
      ]),
      criterion: 'fluencyCoherence',
      objective: 'Record a full Speaking answer and get a band on the four official criteria.',
      prerequisites: [lessonActivityId('speaking')],
      expectedMinutes: 10,
      indivisible: true,
      target: route('/trainers/speaking'),
      completionEvidence: 'graded-rubric',
      explanationLocales: BILINGUAL,
      provenance: 'project-authored',
      verified: false,
      tags: ['needs-microphone'],
    },
    {
      id: 'trainer:examiner',
      contentVersion: 1,
      kind: 'graded-task',
      domain: 'speaking',
      paper: 'speaking',
      subskill: 'part2-hold-the-two-minutes',
      criterion: 'fluencyCoherence',
      objective: 'Sit a live mock interview with the AI examiner and get a band report afterwards.',
      prerequisites: [lessonActivityId('speaking')],
      expectedMinutes: 15,
      indivisible: true,
      target: route('/speaking/examiner'),
      completionEvidence: 'graded-rubric',
      explanationLocales: BILINGUAL,
      provenance: 'project-authored',
      verified: false,
      tags: ['needs-microphone', 'needs-account'],
    },
    {
      id: 'review:vocabulary',
      contentVersion: 1,
      kind: 'vocab-review',
      domain: 'vocabulary',
      subskill: 'recall-from-meaning',
      covers: mergeCoverage([
        { subskill: 'recall-from-meaning', fit: 'direct' },
        { subskill: 'recognise-meaning', fit: 'direct' },
      ]),
      objective: 'Review every word due today by recall, not only by recognition.',
      prerequisites: [],
      expectedMinutes: VOCAB_REVIEW_MINUTES,
      indivisible: false,
      target: route('/review'),
      completionEvidence: 'recall-outcome',
      explanationLocales: BILINGUAL,
      provenance: 'project-authored',
      verified: false,
    },
    {
      ...reference,
      id: 'tool:models',
      domain: 'writing',
      paper: 'writing',
      subskill: 'exam-format',
      objective: 'See what a band 8 answer does that yours does not do yet.',
      target: route('/writing/models'),
      provenance: 'publisher',
      verified: true,
    },
    {
      ...reference,
      id: 'tool:cue-cards',
      domain: 'speaking',
      paper: 'speaking',
      subskill: 'part2-narrative-structure',
      objective: 'Read a band 7 cue card answer and the phrases that lift it to band 8.',
      target: route('/speaking/cue-cards'),
      provenance: 'project-authored',
      verified: false,
    },
    {
      ...reference,
      id: 'tool:bands',
      domain: 'exam-skills',
      subskill: 'exam-format',
      objective: 'Read what each band actually requires, in plain words.',
      target: route('/learn/bands'),
      provenance: 'publisher',
      verified: true,
    },
    {
      ...reference,
      id: 'tool:saved',
      domain: 'exam-skills',
      subskill: 'exam-format',
      objective: 'Find the lessons you saved and the notes you wrote on them.',
      target: route('/account', { hash: 'saved' }),
      provenance: 'project-authored',
      verified: false,
    },
    {
      ...reference,
      id: 'tool:report',
      domain: 'exam-skills',
      subskill: 'exam-format',
      objective: 'See every result so far, by paper and by question type.',
      target: route('/report'),
      provenance: 'project-authored',
      verified: false,
    },
    {
      ...reference,
      id: 'tool:plan',
      kind: 'planning',
      domain: 'exam-skills',
      subskill: 'exam-format',
      objective: 'Set your target band, your exam date and how many minutes a day you study.',
      target: route('/plan-settings'),
      provenance: 'project-authored',
      verified: false,
    },
  ];
}

/* ── Assembly ────────────────────────────────────────────────────────────── */

/** Build the whole catalogue from the registries plus one index.
 *
 *  Pure: same index in, same catalogue out, with no reference to anything
 *  outside its arguments and the six lesson registries, which are compiled
 *  in. The default argument is the committed index, which is what the site
 *  and the Worker use. */
export function buildLearningCatalogue(index: GeneratedIndexV1 = LEARNING_INDEX): LearningCatalogueV1 {
  const activities: CatalogueActivity[] = [
    ...buildLessonActivities(index),
    ...buildCheckActivities(index),
    ...buildFocusedActivities(index),
    ...buildDrillActivities(index),
    ...buildPaperActivities(index),
    ...buildWritingActivities(index),
    ...buildSpeakingActivities(index),
    ...buildSpokenFocusedActivities(),
    ...buildVocabularyActivities(index),
    ...buildPractiseActivities(index),
    ...buildFixedActivities(),
  ];

  /* The version IS the contents. Everything that would change what the
     planner or the model may say about an activity goes into it: not the
     order, which is an assembly detail, so the ids are sorted first. */
  const fingerprint = [...activities]
    .map((a) =>
      [
        a.id,
        a.contentVersion,
        a.kind,
        a.subskill,
        a.expectedMinutes,
        a.indivisible ? '1' : '0',
        a.verified ? '1' : '0',
        a.unavailable ? a.unavailable.code : '-',
        activityHref(a) ?? `task:${a.target.kind === 'task' ? a.target.taskId : ''}`,
        (a.covers ?? []).map((c) => `${c.subskill}/${c.fit}`).join('+'),
        [...a.prerequisites].sort().join('+'),
        a.objective,
      ].join(''),
    )
    .sort()
    .join('');

  return {
    version: 1,
    indexVersion: index.indexVersion,
    catalogueVersion: hash16(`${index.indexVersion}${fingerprint}`),
    activities,
  };
}

let cached: LearningCatalogueV1 | null = null;

/** The catalogue for the committed index, built once per process. */
export function learningCatalogue(): LearningCatalogueV1 {
  if (!cached) cached = buildLearningCatalogue();
  return cached;
}

/* ── Lookups the planner needs ───────────────────────────────────────────── */

const indexes = new WeakMap<LearningCatalogueV1, Map<string, CatalogueActivity>>();

function byId(catalogue: LearningCatalogueV1): Map<string, CatalogueActivity> {
  let map = indexes.get(catalogue);
  if (!map) {
    map = new Map(catalogue.activities.map((activity) => [activity.id, activity]));
    indexes.set(catalogue, map);
  }
  return map;
}

/** One activity by id, or undefined. An id the model invented resolves to
    nothing, which is how a hallucinated link becomes no link at all. */
export function findActivity(
  id: string,
  catalogue: LearningCatalogueV1 = learningCatalogue(),
): CatalogueActivity | undefined {
  return byId(catalogue).get(id);
}

/** Everything that contributes to one paper, in catalogue order. */
export function activitiesForPaper(
  paper: Paper,
  catalogue: LearningCatalogueV1 = learningCatalogue(),
): readonly CatalogueActivity[] {
  return catalogue.activities.filter((activity) => activity.paper === paper);
}

/** Everything that teaches or exercises one subskill, whatever its kind. */
export function activitiesForSubskill(
  subskill: Subskill,
  catalogue: LearningCatalogueV1 = learningCatalogue(),
): readonly CatalogueActivity[] {
  return catalogue.activities.filter((activity) => coversSubskill(activity, subskill));
}

function coversSubskill(activity: CatalogueActivity, subskill: Subskill): boolean {
  if (activity.subskill === subskill) return true;
  return (activity.covers ?? []).some((entry) => entry.subskill === subskill);
}

/** How well this activity fits a subskill, or null when it does not cover
    it at all. Ask through this rather than reading `covers`, which is left
    off when it would only repeat the activity's own subskill. */
export function coverageFit(
  activity: CatalogueActivity,
  subskill: Subskill,
): 'direct' | 'borrowed' | null {
  const entry = (activity.covers ?? []).find((c) => c.subskill === subskill);
  if (entry) return entry.fit;
  return activity.subskill === subskill ? 'direct' : null;
}

function fitFor(activity: CatalogueActivity, subskill: Subskill): 'direct' | 'borrowed' {
  return coverageFit(activity, subskill) ?? 'borrowed';
}

/** Every prerequisite of an activity, and their prerequisites, and so on.
 *
 *  Returns ids only, in a stable order, and never includes the activity
 *  itself. A prerequisite id that no longer resolves is dropped rather than
 *  returned, so a stale reference cannot block a student forever. The walk
 *  keeps a seen set, so a cycle would end the walk rather than hang; the
 *  test beside this file asserts there is no cycle to begin with. */
export function prerequisiteClosure(
  id: string,
  catalogue: LearningCatalogueV1 = learningCatalogue(),
): readonly string[] {
  const map = byId(catalogue);
  const seen = new Set<string>([id]);
  const out: string[] = [];
  const queue = [...(map.get(id)?.prerequisites ?? [])];
  while (queue.length) {
    const next = queue.shift() as string;
    if (seen.has(next)) continue;
    seen.add(next);
    const activity = map.get(next);
    if (!activity) continue;
    out.push(next);
    queue.push(...activity.prerequisites);
  }
  return out;
}

const TEACHING_KINDS = new Set(['lesson', 'focused-exercise']);
const PRACTICE_KINDS = new Set(['drill', 'focused-exercise', 'graded-task', 'lesson-check', 'vocab-review']);
const CHECK_KINDS = new Set(['drill', 'lesson-check', 'focused-exercise', 'full-test']);

/** Activities that TEACH a subskill, the ones that fit it directly first.
 *  A borrowed lesson is still returned: it is the nearest thing the library
 *  has, and saying nothing would be worse than saying "close, not exact".
 *
 *  A lesson always comes before a focused exercise. A focused exercise is
 *  practice; it is in this list only so that an objective with no lesson at
 *  all (several Writing ones) still has somewhere to start, and it must
 *  never push a real lesson out of the teaching slot. Anything reserved for
 *  a check is not here at all: it is the material being saved. */
export function activitiesThatTeach(
  subskill: Subskill,
  catalogue: LearningCatalogueV1 = learningCatalogue(),
): readonly CatalogueActivity[] {
  return catalogue.activities
    .filter(
      (a) =>
        TEACHING_KINDS.has(a.kind) &&
        !a.unavailable &&
        !(a.tags ?? []).includes(CHECK_ONLY_TAG) &&
        coversSubskill(a, subskill),
    )
    .sort((a, b) => rankFit(a, b, subskill) || rankLesson(a, b) || a.expectedMinutes - b.expectedMinutes);
}

function rankLesson(a: CatalogueActivity, b: CatalogueActivity): number {
  const left = a.kind === 'lesson' ? 0 : 1;
  const right = b.kind === 'lesson' ? 0 : 1;
  return left - right;
}

function rankFit(a: CatalogueActivity, b: CatalogueActivity, subskill: Subskill): number {
  const left = fitFor(a, subskill) === 'direct' ? 0 : 1;
  const right = fitFor(b, subskill) === 'direct' ? 0 : 1;
  return left - right;
}

/** Practice for a subskill that fits the minutes left. Unavailable
 *  activities and indivisible ones that do not fit are left out: an
 *  indivisible activity too big for today is a longer commitment the
 *  planner offers separately, not a candidate. So is anything reserved for
 *  an independent check, which is the whole point of reserving it.
 *
 *  Order: a direct fit first, then a focused exercise before a whole drill,
 *  then the longest that fits, so a slot is filled once rather than padded
 *  with three tiny ones. The middle rule is the one the architecture asks
 *  for in section 6.2: a twenty minute passage and a six question group
 *  both practise Matching Headings, and the group is the one that leaves
 *  room in the same session to teach it first and check it afterwards. */
export function practiceForSubskill(
  subskill: Subskill,
  minutes: number,
  catalogue: LearningCatalogueV1 = learningCatalogue(),
): readonly CatalogueActivity[] {
  return catalogue.activities
    .filter(
      (a) =>
        PRACTICE_KINDS.has(a.kind) &&
        !a.unavailable &&
        !(a.tags ?? []).includes(CHECK_ONLY_TAG) &&
        a.expectedMinutes <= minutes &&
        coversSubskill(a, subskill),
    )
    .sort(
      (a, b) =>
        rankFit(a, b, subskill) ||
        rankFocused(a, b) ||
        b.expectedMinutes - a.expectedMinutes ||
        compareIds(a, b),
    );
}

function rankFocused(a: CatalogueActivity, b: CatalogueActivity): number {
  const left = a.kind === 'focused-exercise' ? 0 : 1;
  const right = b.kind === 'focused-exercise' ? 0 : 1;
  return left - right;
}

function compareIds(a: CatalogueActivity, b: CatalogueActivity): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** One way of checking a subskill, with the papers it would spend. */
export interface SubskillCheck {
  activity: CatalogueActivity;
  /** The papers this check's items come from. A student who has already sat
      any of them has seen these questions, so the planner must exclude it
      when it wants an honest independent check. */
  sourceTestIds: readonly string[];
}

/** Checks on real material for one subskill, shortest first.
 *
 *  Only verified material qualifies: lead decision Q1 allows unverified
 *  authored sets for guided practice, never for a check. A hub is left out
 *  too, because "go to the drills page and pick something" names no items
 *  and so cannot be reserved as unseen. So is anything marked guided-only:
 *  an exercise built to be worked with hints and explanations shows guided
 *  work whatever it scores. */
export function checksForSubskill(
  subskill: Subskill,
  catalogue: LearningCatalogueV1 = learningCatalogue(),
): readonly SubskillCheck[] {
  return catalogue.activities
    .filter(
      (a) =>
        CHECK_KINDS.has(a.kind) &&
        a.verified &&
        !a.unavailable &&
        !isHub(a) &&
        !(a.tags ?? []).includes(GUIDED_ONLY_TAG) &&
        coversSubskill(a, subskill),
    )
    .sort((a, b) => a.expectedMinutes - b.expectedMinutes || compareIds(a, b))
    .map((activity) => ({ activity, sourceTestIds: activity.sourcePaperIds ?? [] }));
}

/** What the library really has for one subskill, including the honest
    answer when it has nothing. `unavailable` is a sentence, not a code, so
    a screen can show it as it is. */
export interface SubskillMaterial {
  subskill: Subskill;
  teach: readonly CatalogueActivity[];
  practise: readonly CatalogueActivity[];
  checks: readonly SubskillCheck[];
  unavailable: string | null;
}

export function subskillMaterial(
  subskill: Subskill,
  catalogue: LearningCatalogueV1 = learningCatalogue(),
): SubskillMaterial {
  const teach = activitiesThatTeach(subskill, catalogue);
  const practise = practiceForSubskill(subskill, Number.POSITIVE_INFINITY, catalogue);
  const checks = checksForSubskill(subskill, catalogue);
  let unavailable: string | null = null;
  if (practise.length === 0) {
    const blocked = catalogue.activities.find((a) => a.unavailable && coversSubskill(a, subskill));
    unavailable =
      blocked?.unavailable?.reason ??
      'There is nothing in the library to practise this on yet, so it cannot be scheduled.';
  }
  return { subskill, teach, practise, checks, unavailable };
}

/** The objectives a Writing or Speaking criterion is made of, and the
    activities that work on them. This is what turns "Lexical Resource 6"
    into something a student can do, rather than a number they can only
    read. */
export interface CriterionMaterial {
  criterion: WritingCriterion | SpeakingCriterion;
  objectives: readonly Subskill[];
  activities: readonly CatalogueActivity[];
  /** Objectives this criterion is made of that nothing in the library works
      on yet. Writing has no short-form practice at all today: the smallest
      unit is a whole essay, and the focused exercises for lexical precision
      and for grammatical range still have to be authored. Naming them is
      how a report can say what it cannot yet help with. */
  missingObjectives: readonly Subskill[];
}

export function writingCriterionMaterial(
  criterion: WritingCriterion,
  catalogue: LearningCatalogueV1 = learningCatalogue(),
): CriterionMaterial {
  return criterionMaterial(criterion, WRITING_CRITERION_OBJECTIVES[criterion], catalogue);
}

export function speakingCriterionMaterial(
  criterion: SpeakingCriterion,
  catalogue: LearningCatalogueV1 = learningCatalogue(),
): CriterionMaterial {
  return criterionMaterial(criterion, SPEAKING_CRITERION_OBJECTIVES[criterion], catalogue);
}

function criterionMaterial(
  criterion: WritingCriterion | SpeakingCriterion,
  objectives: readonly Subskill[],
  catalogue: LearningCatalogueV1,
): CriterionMaterial {
  const seen = new Set<string>();
  const activities: CatalogueActivity[] = [];
  const missingObjectives: Subskill[] = [];
  for (const subskill of objectives) {
    const found = activitiesForSubskill(subskill, catalogue);
    if (found.length === 0) missingObjectives.push(subskill);
    for (const activity of found) {
      if (seen.has(activity.id)) continue;
      seen.add(activity.id);
      activities.push(activity);
    }
  }
  return { criterion, objectives, activities, missingObjectives };
}

/** Every activity the library holds but cannot schedule, with its reason.
    The progress screens and the weekly review say this out loud rather than
    letting a student find an empty page. */
export function unavailableActivities(
  catalogue: LearningCatalogueV1 = learningCatalogue(),
): readonly CatalogueActivity[] {
  return catalogue.activities.filter((activity) => activity.unavailable);
}

/** Exactly the path practisePath() builds, kept here so the catalogue test
    can prove the two agree without importing the trainer pages. */
export function practiseHref(skill: 'reading' | 'listening', type: QuestionType): string {
  return practisePath(skill, type);
}
