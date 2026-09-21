/* A deliberate curriculum. Registry entries own the content and stable progress keys;
   COURSE_UNITS owns teaching order. Overview always precedes a new paper. */
import { LESSONS, SKILLS, type Skill, type Stage } from '../data/lessons';
import { READING_PARTS } from '../data/reading';
import { LISTENING_PARTS } from '../data/listening';
import { WRITING_PARTS } from '../data/writing';
import { SPEAKING_PARTS } from '../data/speaking';
import { VOCABULARY_PARTS } from '../data/vocabulary';
import type { ProgressV1 } from './progress';
import { nt, t } from './i18n/translate';

/** One lesson's place in the course. */
export interface CourseLesson {
  /** progress.lessons key, e.g. 'reading-paraphrase'. Matches the slug
      LessonLayout writes on the lesson page itself. */
  key: string;
  skill: Skill;
  skillLabel: string;
  title: string;
  /** The part's real description, from its registry (reading.ts, listening.ts,
      etc.). Callers should show this rather than inventing generic copy. */
  blurb: string;
  /** Unprefixed path; callers apply withBase(). */
  href: string;
  stage: Stage;
  /** 1-based position across the whole course, for "lesson 12 of 44". */
  position: number;
  /** Honest estimate of time to work through this lesson, in minutes, from
      the part's own registry entry (see Sequenced.minutes). Optional so a
      part without one just shows no time label rather than "0 min". */
  minutes?: number;
}

/** A non-lesson step: the exam-readiness module points at tests and trainers
    rather than lessons, and those need their own tick since nothing in
    progress.lessons records "I did a mock". */
export interface CourseExtra {
  key: string;
  label: string;
  href: string;
}

export interface CourseModule {
  id: number;
  stage: Stage;
  name: string;
  blurb: string;
  lessons: CourseLesson[];
  extras: CourseExtra[];
}

const SKILL_LABEL: Record<Skill, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
  vocabulary: 'Vocabulary',
};

/** Every lesson in the site, tagged with its skill and URL, in registry order. */
function allLessons(): Omit<CourseLesson, 'position'>[] {
  const sources: { skill: Skill; base: string; parts: { slug: string; title: string; blurb: string; stage: Stage; minutes?: number }[] }[] = [
    { skill: 'reading', base: 'reading', parts: READING_PARTS },
    { skill: 'listening', base: 'listening', parts: LISTENING_PARTS },
    { skill: 'writing', base: 'writing', parts: WRITING_PARTS },
    { skill: 'speaking', base: 'speaking', parts: SPEAKING_PARTS },
    { skill: 'vocabulary', base: 'vocabulary', parts: VOCABULARY_PARTS },
  ];
  const overviews: Omit<CourseLesson, 'position'>[] = LESSONS.map((l) => ({
    key: l.slug, skill: l.skill, skillLabel: SKILL_LABEL[l.skill], title: l.title,
    blurb: l.description, href: `/lessons/${l.slug}`, stage: 1, minutes: l.minutes,
  }));
  return [...overviews, ...sources.flatMap(({ skill, base, parts }) =>
    parts.map((p) => ({
      key: `${base}-${p.slug}`,
      skill,
      skillLabel: SKILL_LABEL[skill],
      title: p.title,
      blurb: p.blurb,
      href: `/lessons/${base}/${p.slug}`,
      stage: p.stage,
      minutes: p.minutes,
    })),
  )];
}

export const COURSE_UNITS: { name: string; blurb: string; stage: Stage; keys: string[] }[] = [
  { name: nt('Start speaking with confidence'), stage: 1,
    blurb: nt('Understand the Speaking test, then answer Part 1 questions about familiar topics. Build the vocabulary to talk about yourself, family, study and work.'),
    keys: ['speaking', 'speaking-part1', 'vocabulary', 'vocabulary-family', 'vocabulary-education', 'vocabulary-work', 'vocabulary-leisure', 'vocabulary-people', 'vocabulary-places', 'vocabulary-childhood'] },
  { name: nt('Listen for everyday information'), stage: 1,
    blurb: nt('Start with the Listening overview and Part 1. Learn to capture details before moving to Part 2 and directions on a map.'),
    keys: ['listening', 'listening-part1', 'listening-form-completion', 'listening-short-answer', 'listening-sentence-completion', 'listening-part2', 'listening-map-labelling', 'vocabulary-travel', 'vocabulary-transport', 'vocabulary-weather'] },
  { name: nt('Read for meaning and detail'), stage: 2,
    blurb: nt('Understand Reading first. Recognise paraphrases, find precise answers, then work through completion questions with increasingly complex layouts.'),
    keys: ['reading-task1', 'reading-paraphrase', 'reading-short-answer', 'reading-sentence', 'reading-summary-completion', 'reading-diagram', 'vocabulary-health', 'vocabulary-food', 'vocabulary-environment', 'vocabulary-books'] },
  { name: nt('Build a clear Task 1 report'), stage: 2,
    blurb: nt('Learn how Writing is marked and practise the Task 1 method before applying it to charts, processes and maps. Linking and location language support your reports.'),
    keys: ['writing', 'writing-method', 'vocabulary-conjunctions', 'writing-charts', 'writing-process', 'vocabulary-housing', 'writing-maps', 'vocabulary-sport', 'vocabulary-music-film'] },
  { name: nt('Develop and support your ideas'), stage: 2,
    blurb: nt('Extend short answers into Speaking Part 2. Learn the Task 2 essay method before opinion essays, then distinguish facts, claims and distractors in Reading.'),
    keys: ['speaking-part2', 'writing-task2-method', 'writing-opinion', 'vocabulary-technology', 'reading-mc', 'reading-tfng', 'reading-ynng', 'vocabulary-social-media', 'vocabulary-media', 'vocabulary-fashion', 'vocabulary-success'] },
  { name: nt('Follow and compare arguments'), stage: 3,
    blurb: nt('Progress to academic Listening Parts 3 and 4, then weigh different views in discussion and advantages essays. Reuse social issues vocabulary across both papers.'),
    keys: ['listening-part3', 'listening-multiple-choice', 'listening-matching', 'listening-part4', 'vocabulary-society', 'writing-discussion', 'writing-advantages', 'vocabulary-crime', 'vocabulary-money', 'vocabulary-language', 'vocabulary-traditions', 'vocabulary-volunteering'] },
  { name: nt('Handle complex questions'), stage: 3,
    blurb: nt('Move from reading individual answers to connecting ideas. Finish the remaining essay types and Speaking Part 3, using wider topic vocabulary to explain and evaluate.'),
    keys: ['reading-headings', 'reading-matching-information', 'reading-matching-features', 'reading-matching-sentence-endings', 'vocabulary-government', 'writing-problem', 'writing-twopart', 'vocabulary-ai', 'vocabulary-arts', 'vocabulary-science', 'vocabulary-animals', 'vocabulary-business', 'vocabulary-ageing', 'speaking-part3'] },
  { name: nt('Put it together under exam conditions'), stage: 4,
    blurb: nt('After learning the material, take timed tests, try a complete mock and use your results to revisit weak areas. Keep the final two study days light.'), keys: [] },
];

/* The exam-readiness module. These are the only course steps that are not
   lessons, which is why stage 4 has no entries in any registry. */
const EXAM_READINESS: CourseExtra[] = [
  { key: 'extra:mock-reading', label: nt('Sit a full Reading test under exam timing'), href: '/tests#reading-tests' },
  { key: 'extra:mock-listening', label: nt('Sit a full Listening test under exam timing'), href: '/tests#listening-tests' },
  { key: 'extra:writing-checker', label: nt('Write a Task 2 essay and get an AI band'), href: '/writing/checker' },
  { key: 'extra:speaking-examiner', label: nt('Do a full mock interview with the Live AI Examiner'), href: '/speaking/examiner' },
  { key: 'extra:review', label: nt('Review your score history and re-target your weakest paper'), href: '/account' },
];

/** Eight learning units, normally one per week. Shorter plans keep the same order. */
export function buildCourse(): CourseModule[] {
  const registry = new Map(allLessons().map((l) => [l.key, l]));
  const assigned = new Set<string>();
  let position = 0;
  const modules = COURSE_UNITS.map((unit, index) => ({
    id: index + 1, stage: unit.stage, name: unit.name, blurb: unit.blurb,
    lessons: unit.keys.map((key) => {
      const lesson = registry.get(key);
      if (!lesson || assigned.has(key)) throw new Error(`Invalid curriculum lesson: ${key}`);
      assigned.add(key);
      return { ...lesson, position: ++position };
    }),
    extras: unit.stage === 4 ? EXAM_READINESS : [],
  }));
  // A newly authored lesson must be deliberately placed, never silently omitted.
  for (const key of registry.keys()) {
    if (!assigned.has(key)) throw new Error(`Place ${key} in COURSE_UNITS before publishing.`);
  }
  return modules;
}

/** The same curriculum filtered by paper, with the overview first. */
export interface CourseSection {
  skill: Skill;
  label: string;
  blurb: string;
  lessons: CourseLesson[];
}

export function buildSections(): CourseSection[] {
  const lessons = buildCourse().flatMap((m) => m.lessons);
  return SKILLS.map((s) => {
    const inSection = lessons.filter((l) => l.skill === s.id);
    return {
      skill: s.id,
      label: s.label,
      blurb: s.blurb,
      lessons: inSection.map((l, i) => ({ ...l, position: i + 1 })),
    };
  });
}

/** Total lessons in the course, for "12 of 44". */
export function courseLessonCount(modules: CourseModule[]): number {
  return modules.reduce((n, m) => n + m.lessons.length, 0);
}

export function isLessonDone(progress: ProgressV1, key: string): boolean {
  return Boolean(progress.lessons[key]);
}

export interface CourseStatus {
  doneLessons: number;
  totalLessons: number;
  /** 0-100, lessons only. Extras are tracked but excluded so the headline
      number means "how much of the syllabus have I read". */
  percent: number;
  /** First lesson in course order the student hasn't completed, or null when
      every lesson is done. */
  next: CourseLesson | null;
}

export function courseStatus(modules: CourseModule[], progress: ProgressV1): CourseStatus {
  const all = modules.flatMap((m) => m.lessons);
  const done = all.filter((l) => isLessonDone(progress, l.key));
  const next = all.find((l) => !isLessonDone(progress, l.key)) ?? null;
  return {
    doneLessons: done.length,
    totalLessons: all.length,
    percent: all.length ? Math.round((done.length / all.length) * 100) : 0,
    next,
  };
}

/* ── Pacing ────────────────────────────────────────────────────────────────
   The test date does not change what is in the course, only how much of it is
   realistic. Hiding lessons from someone sitting the exam in ten days would be
   worse than telling them plainly which modules to prioritise. */

export type CoursePace = {
  /** Highest stage the student should realistically expect to finish. */
  focusThrough: Stage;
  /** Rough lessons-per-week needed to finish focusThrough in time. */
  lessonsPerWeek: number | null;
  note: string;
};

export function coursePace(days: number | null, modules: CourseModule[]): CoursePace {
  const total = courseLessonCount(modules);
  return {
    focusThrough: 3,
    lessonsPerWeek: days === null ? null : Math.ceil(total / Math.max(days / 7, 0.5)),
    note: days === null
      ? t('Follow the eight units in order. Add an exam date to adjust the calendar; lesson times show the actual workload.')
      : days < 56
        ? t('This is a condensed schedule. Keep the same learning order and expect longer sessions; extend the date if the daily workload is too high.')
        : t('Follow the units at a steady pace, then use the final unit for timed practice and light review.'),
  };
}
