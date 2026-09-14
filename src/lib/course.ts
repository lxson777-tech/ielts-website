/* The course: every lesson on the site as one ordered path a student can work
   through, grouped into the four stages defined in src/data/lessons.ts.
   The total is derived, not fixed: the 2026-09 question-type restructure took
   it from 44 to 50 without an edit here.

   Built entirely from the five part registries, so adding or reordering a
   lesson updates the course with no edit here. This replaces the hand-written
   step list that used to live in study-plan.ts, which restated the lesson
   catalogue in prose and drifted every time a lesson was added.

   Two rules worth knowing before changing anything:

   1. Completion is NOT stored by the course. A lesson counts as done when
      progress.lessons has its key, the same store the lesson pages and the
      overview checkmarks already write. So a student who worked through
      lessons before ever starting the course sees them already ticked, and
      there is only one place completion can be wrong.

   2. Within a stage, skills are interleaved round-robin rather than grouped,
      so week one touches Reading, Listening, Writing and Vocabulary instead
      of spending a month inside one paper. */

import { STAGES, type Skill, type Stage } from '../data/lessons';
import { READING_PARTS } from '../data/reading';
import { LISTENING_PARTS } from '../data/listening';
import { WRITING_PARTS } from '../data/writing';
import { SPEAKING_PARTS } from '../data/speaking';
import { VOCABULARY_PARTS } from '../data/vocabulary';
import type { ProgressV1 } from './progress';

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

/* Round-robin order. Reading and Listening lead because they are the papers
   where technique pays off fastest; Vocabulary trails because it is ongoing
   background work rather than something you finish. */
const SKILL_ORDER: Skill[] = ['reading', 'listening', 'writing', 'speaking', 'vocabulary'];

/** Every lesson in the site, tagged with its skill and URL, in registry order. */
function allLessons(): Omit<CourseLesson, 'position'>[] {
  const sources: { skill: Skill; base: string; parts: { slug: string; title: string; blurb: string; stage: Stage; minutes?: number }[] }[] = [
    { skill: 'reading', base: 'reading', parts: READING_PARTS },
    { skill: 'listening', base: 'listening', parts: LISTENING_PARTS },
    { skill: 'writing', base: 'writing', parts: WRITING_PARTS },
    { skill: 'speaking', base: 'speaking', parts: SPEAKING_PARTS },
    { skill: 'vocabulary', base: 'vocabulary', parts: VOCABULARY_PARTS },
  ];
  return sources.flatMap(({ skill, base, parts }) =>
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
  );
}

/** Take one lesson from each skill in turn until every queue is empty, so a
    stage alternates papers instead of running them in blocks. */
function interleaveBySkill<T extends { skill: Skill }>(items: T[]): T[] {
  const queues = SKILL_ORDER.map((s) => items.filter((i) => i.skill === s));
  const out: T[] = [];
  for (let round = 0; out.length < items.length; round++) {
    for (const q of queues) {
      const next = q[round];
      if (next) out.push(next);
    }
    // Guard against a malformed queue set spinning forever.
    if (round > items.length) break;
  }
  return out;
}

/* The exam-readiness module. These are the only course steps that are not
   lessons, which is why stage 4 has no entries in any registry. */
const EXAM_READINESS: CourseExtra[] = [
  { key: 'extra:mock-reading', label: 'Sit a full Reading test under exam timing', href: '/tests#reading-tests' },
  { key: 'extra:mock-listening', label: 'Sit a full Listening test under exam timing', href: '/tests#listening-tests' },
  { key: 'extra:writing-checker', label: 'Write a Task 2 essay and get an AI band', href: '/writing/checker' },
  { key: 'extra:speaking-examiner', label: 'Do a full mock interview with the Live AI Examiner', href: '/speaking/examiner' },
  { key: 'extra:review', label: 'Review your score history and re-target your weakest paper', href: '/account' },
];

/** The whole course, as four modules. */
export function buildCourse(): CourseModule[] {
  const lessons = allLessons();
  let position = 0;
  return STAGES.map((stage) => {
    const inStage = interleaveBySkill(lessons.filter((l) => l.stage === stage.id));
    return {
      stage: stage.id,
      name: stage.name,
      blurb: stage.blurb,
      lessons: inStage.map((l) => ({ ...l, position: ++position })),
      extras: stage.id === 4 ? EXAM_READINESS : [],
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
  const upTo = (s: Stage) =>
    modules.filter((m) => m.stage <= s).reduce((n, m) => n + m.lessons.length, 0);

  if (days === null) {
    return {
      focusThrough: 3,
      lessonsPerWeek: null,
      note: 'No test date set, so this is the full course at your own pace. Add a date and it will tell you how many lessons a week to aim for.',
    };
  }
  const weeks = Math.max(days / 7, 0.5);
  if (days <= 14) {
    return {
      focusThrough: 1,
      lessonsPerWeek: Math.ceil(upTo(1) / weeks),
      note: 'With under two weeks, finish Foundations, then go straight to Exam readiness. Treat the middle modules as optional.',
    };
  }
  if (days <= 35) {
    return {
      focusThrough: 2,
      lessonsPerWeek: Math.ceil(upTo(2) / weeks),
      note: 'Aim to finish Foundations and Core question types, then spend your last week on Exam readiness.',
    };
  }
  return {
    focusThrough: 3,
    lessonsPerWeek: Math.ceil(upTo(3) / weeks),
    note: 'You have time for the whole course. Keep a steady weekly pace and leave the final two weeks for Exam readiness.',
  };
}
