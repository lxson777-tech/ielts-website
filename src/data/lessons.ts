export type Skill = 'reading' | 'writing' | 'speaking' | 'listening' | 'vocabulary';

export interface LessonMeta {
  slug: string;
  title: string;
  skill: Skill;
  description: string;
  image: string; // path under /pics, passed through withBase()
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
  },
  {
    slug: 'writing-task1',
    title: 'Writing Task 1',
    skill: 'writing',
    description: 'Describe charts, graphs and processes in a clear 150-word report.',
    image: '/pics/writing-task1.png',
  },
  {
    slug: 'writing-task2',
    title: 'Writing Task 2',
    skill: 'writing',
    description: 'Plan and write a well-structured 250-word essay that answers the question.',
    image: '/pics/writing-task2.png',
  },
  {
    slug: 'speaking-part1',
    title: 'Speaking Part 1',
    skill: 'speaking',
    description: 'Handle the warm-up interview questions with natural, extended answers.',
    image: '/pics/speaking-part1.png',
  },
  {
    slug: 'speaking-part2',
    title: 'Speaking Part 2',
    skill: 'speaking',
    description: 'Speak for two minutes from a cue card without running dry.',
    image: '/pics/speaking-part2.png',
  },
  {
    slug: 'speaking-part3',
    title: 'Speaking Part 3',
    skill: 'speaking',
    description: 'Discuss abstract follow-up questions and show off complex language.',
    image: '/pics/speaking-part3.png',
  },
  {
    slug: 'listening',
    title: 'Listening',
    skill: 'listening',
    description: 'Strategies for all four sections, from form completion to academic talks.',
    image: '/pics/listening.png',
  },
  {
    slug: 'vocabulary',
    title: 'Vocabulary',
    skill: 'vocabulary',
    description: 'Build the academic word bank the exam rewards, then test yourself.',
    image: '/pics/vocabulary.png',
  },
];

export function lessonsBySkill(skill: Skill): LessonMeta[] {
  return LESSONS.filter((l) => l.skill === skill);
}

export function getLesson(slug: string): LessonMeta | undefined {
  return LESSONS.find((l) => l.slug === slug);
}
