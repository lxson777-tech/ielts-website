export type Skill = 'reading' | 'writing' | 'speaking' | 'listening' | 'vocabulary';

/* ── Lesson ordering ───────────────────────────────────────────────────────
   Two orderings, one source of truth.

   Within a section, order IS the array position in READING_PARTS,
   WRITING_PARTS, etc. There is deliberately no hand-written `order: 3`
   field: that would be a second source of truth that drifts the first
   time someone splices an array. sequence() derives it instead, so
   reordering a section means moving one line.

   Across sections, `stage` is the spine. It lets /start and the study
   plan interleave the five sections into one guided route without
   flattening them into a single list. */

export type Stage = 1 | 2 | 3 | 4;

export const STAGES: { id: Stage; name: string; blurb: string }[] = [
  {
    id: 1,
    name: 'Foundations',
    blurb: 'How the exam works, plus the sub-skills every other lesson depends on.',
  },
  {
    id: 2,
    name: 'Core question types',
    blurb: 'The question types that carry most of the marks in every paper.',
  },
  {
    id: 3,
    name: 'Harder types & range',
    blurb: 'The material that separates a band 6 from a band 7.',
  },
  {
    id: 4,
    name: 'Exam readiness',
    blurb: 'No new lessons. Full timed tests and AI-graded practice under exam conditions.',
  },
];

/** Fields every lesson part carries, whichever section it belongs to. */
export interface Sequenced {
  slug: string;
  title: string;
  blurb: string;
  /** Which global stage this part belongs to. The only ordering field
      written by hand. */
  stage: Stage;
  /** Card illustration under /pics. Reading and Speaking use image cards;
      the other sections use text cards and set `eyebrow` instead. */
  image?: string;
  /** Small line above the card title, e.g. '10 words · collocations'. */
  eyebrow?: string;
}

/** A part with its position within its own section resolved. */
export type Ordered<T> = T & { order: number; of: number };

/** Stamp 1-based position and section length onto each part, so every
    consumer can render "Lesson 3 of 8" without recomputing indices. */
export function sequence<T>(parts: T[]): Ordered<T>[] {
  return parts.map((part, i) => ({ ...part, order: i + 1, of: parts.length }));
}

/** Rough entry level for a lesson, shown as a pill on its card so a nervous
    beginner can tell at a glance what's safe to start with (top feedback ask
    from first-time users). 'All levels' for material everyone works through. */
export type LessonLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels';

export interface LessonMeta {
  slug: string;
  title: string;
  skill: Skill;
  description: string;
  image: string; // path under /pics, passed through withBase()
  level?: LessonLevel;
}

export const SKILLS: { id: Skill; label: string; blurb: string }[] = [
  { id: 'reading', label: 'Reading', blurb: 'Passages, question types and timed practice tests.' },
  { id: 'writing', label: 'Writing', blurb: 'Task 1 reports and Task 2 essays with model answers.' },
  { id: 'speaking', label: 'Speaking', blurb: 'All three parts of the interview, with sample responses.' },
  { id: 'listening', label: 'Listening', blurb: 'Section-by-section strategies for the listening paper.' },
  { id: 'vocabulary', label: 'Vocabulary', blurb: 'High-value academic words with an interactive quiz.' },
];

export const LESSONS: LessonMeta[] = [
  {
    slug: 'reading-task1',
    title: 'Reading Overview',
    skill: 'reading',
    description: 'How the test works, the band score table, and a lesson for every official question type.',
    image: '/pics/reading.png',
    level: 'Beginner',
  },
  {
    slug: 'writing',
    title: 'Writing Overview',
    skill: 'writing',
    description: 'How the test works, how examiners mark it, and a lesson for each task.',
    image: '/pics/writing/start-task.png',
    level: 'Intermediate',
  },
  {
    slug: 'speaking',
    title: 'Speaking Overview',
    skill: 'speaking',
    description: 'How the interview works, how examiners mark it, and a lesson for each part.',
    image: '/pics/speaking-part1.png',
    level: 'Intermediate',
  },
  {
    slug: 'listening',
    title: 'Listening Overview',
    skill: 'listening',
    description: 'How the test works, how it is scored, and a lesson for each part and every question type.',
    image: '/pics/listening.png',
    level: 'Beginner',
  },
  {
    slug: 'vocabulary',
    title: 'Vocabulary Overview',
    skill: 'vocabulary',
    description: 'Why vocabulary decides your band, a lesson per exam topic, and a quiz.',
    image: '/pics/vocabulary.png',
    level: 'All levels',
  },
];

export function lessonsBySkill(skill: Skill): LessonMeta[] {
  return LESSONS.filter((l) => l.skill === skill);
}

export function getLesson(slug: string): LessonMeta | undefined {
  return LESSONS.find((l) => l.slug === slug);
}
