export type Skill = 'reading' | 'writing' | 'speaking' | 'listening' | 'vocabulary';

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
    description: 'How the test works, the band score table, and a lesson for every question type.',
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
    description: 'How the test works, how it is scored, and a lesson for each of the four sections.',
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
