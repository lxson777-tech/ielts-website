/* Everything Mr EZ is allowed to send a student to.

   A tutor that invents links is worse than a tutor that says "I don't know",
   because the student clicks and lands on a 404 with their confidence in the
   whole platform dented. So the model never writes an href. It is handed a
   short list of real activities, each with an id, and if it wants to
   recommend one it names the id; the link comes from here.

   Sizing note for whoever adds to this: the tutor Worker imports this file,
   and a Cloudflare Worker has a hard bundle limit. The lesson registries are
   ~44 KB of metadata, which is fine. `src/data/tests` is 3.9 MB of actual
   passages and audio scripts — never import it here, and never import
   src/lib/plan/schedule.ts either, which pulls it in transitively. Whole
   practice papers are represented by their hub links instead, which is all
   a recommendation needs. */

import { buildCourse, type CourseLesson } from '../course';
import { practisePath, lessonPath, questionTypeLabel } from '../tests/question-types';
import type { QuestionType } from '../tests/schema';
import type { Locale } from '../i18n/locale';
import { tutorText, type TextVars } from './ru';

export type ActivityKind = 'lesson' | 'drill' | 'test' | 'trainer' | 'review' | 'tool';

export interface Activity {
  /** Stable id the model may name, e.g. 'lesson:reading-tfng'. */
  id: string;
  kind: ActivityKind;
  /** English, which is also its key in src/lib/tutor/ru.ts. Read it through
      activityLabel() anywhere a student will see it. */
  label: string;
  /** Unprefixed internal path. The client applies withBase(). */
  href: string;
  /** One line on what it is, from the real registry entry where there is
      one. English; see activityBlurb(). */
  blurb: string;
  minutes?: number;
  skill?: 'reading' | 'listening' | 'writing' | 'speaking' | 'vocabulary';
  /** For a label and blurb built from a template (the per-question-type
      drills, which there is one of per skill and type), the English
      template and the holes it is filled from, so another language can put
      the same pieces in its own word order. Absent for a fixed entry,
      whose `label` and `blurb` ARE their own keys. */
  labelTemplate?: string;
  blurbTemplate?: string;
  labelVars?: TextVars;
}

/** The card's title, in the student's language.

    A LESSON's title is not translated here and cannot be: lesson titles
    live in the course registry and are translated by the site's own lazy
    dictionary, which a Cloudflare Worker has no way to read. They fall
    through as English, and the browser runs them through t() when it
    renders the card, which is where that dictionary does exist. */
export function activityLabel(activity: Activity, locale: Locale): string {
  if (locale === 'en') return activity.label;
  return tutorText(locale, activity.labelTemplate ?? activity.label, activity.labelVars);
}

/** The card's one-line description, in the student's language. Same lesson
    caveat as activityLabel(). */
export function activityBlurb(activity: Activity, locale: Locale): string {
  if (locale === 'en') return activity.blurb;
  return tutorText(locale, activity.blurbTemplate ?? activity.blurb, activity.labelVars);
}

/** The fixed destinations: practice surfaces and tools that are not lessons.
    Every href here is checked by a test against the real route list. */
const FIXED: Activity[] = [
  {
    id: 'test:reading',
    kind: 'test',
    label: 'A full Reading test under exam timing',
    href: '/tests#reading-tests',
    blurb: 'Forty questions in sixty minutes, scored with a band estimate.',
    minutes: 60,
    skill: 'reading',
  },
  {
    id: 'test:listening',
    kind: 'test',
    label: 'A full Listening test under exam timing',
    href: '/tests#listening-tests',
    blurb: 'Forty questions across four parts, scored with a band estimate.',
    minutes: 40,
    skill: 'listening',
  },
  {
    id: 'test:mock',
    kind: 'test',
    label: 'A complete mock exam',
    href: '/tests/mock',
    blurb: 'All papers back to back, the closest thing here to the real day.',
    skill: undefined,
  },
  {
    id: 'trainer:reading',
    kind: 'drill',
    label: 'Short Reading drills',
    href: '/trainers/reading',
    blurb: 'One passage at a time, filterable by question type.',
    minutes: 10,
    skill: 'reading',
  },
  {
    id: 'trainer:listening',
    kind: 'drill',
    label: 'Short Listening drills',
    href: '/trainers/listening',
    blurb: 'One section at a time, filterable by question type.',
    minutes: 10,
    skill: 'listening',
  },
  {
    id: 'trainer:writing',
    kind: 'trainer',
    label: 'Write an essay and get an AI band',
    href: '/trainers/writing',
    blurb: 'A coached Task 1 or Task 2 with per-criterion feedback.',
    minutes: 40,
    skill: 'writing',
  },
  {
    id: 'trainer:speaking',
    kind: 'trainer',
    label: 'Record a Speaking answer and get an AI band',
    href: '/trainers/speaking',
    blurb: 'Part 1, 2 or 3, marked on the four official criteria.',
    minutes: 10,
    skill: 'speaking',
  },
  {
    id: 'trainer:examiner',
    kind: 'trainer',
    label: 'A live mock interview with the AI examiner',
    href: '/speaking/examiner',
    blurb: 'A spoken interview end to end, with a band report afterwards.',
    minutes: 15,
    skill: 'speaking',
  },
  {
    id: 'review:vocabulary',
    kind: 'review',
    label: 'Vocabulary practice',
    href: '/review',
    blurb: 'Spaced review of the words due today.',
    minutes: 10,
    skill: 'vocabulary',
  },
  {
    id: 'tool:models',
    kind: 'tool',
    label: 'Model answers',
    href: '/writing/models',
    blurb: 'Band 8 and 9 answers with the examiner reasoning beside them.',
    skill: 'writing',
  },
  {
    id: 'tool:bands',
    kind: 'tool',
    label: 'What each band actually needs',
    href: '/learn/bands',
    blurb: 'The official descriptors translated into what to do differently.',
  },
  {
    id: 'tool:report',
    kind: 'tool',
    label: 'Your progress report',
    href: '/report',
    blurb: 'Every result so far, by paper and by question type.',
  },
  {
    id: 'tool:plan',
    kind: 'tool',
    label: 'Study plan settings',
    href: '/plan-settings',
    blurb: 'Target band, exam date, how many minutes a day.',
  },
];

function lessonActivity(lesson: CourseLesson): Activity {
  return {
    id: `lesson:${lesson.key}`,
    kind: 'lesson',
    label: lesson.title,
    href: lesson.href,
    blurb: lesson.blurb,
    minutes: lesson.minutes,
    skill: lesson.skill,
  };
}

let cached: Activity[] | null = null;

/** Every activity, lessons first in course order. Built once per process. */
export function buildCatalog(): Activity[] {
  if (cached) return cached;
  const lessons = buildCourse().flatMap((m) => m.lessons).map(lessonActivity);
  cached = [...lessons, ...FIXED];
  return cached;
}

export function findActivity(id: string): Activity | undefined {
  if (id.startsWith('practise:')) return practiseActivity(id);
  return buildCatalog().find((a) => a.id === id);
}

/** Drill practice filtered to one question type. Synthesised rather than
    listed, because there is one per (skill, question type) pair and the
    trainer hub genuinely accepts the filter. The id shape is
    'practise:<skill>:<type>', which is what insights.ts emits. */
export function practiseActivity(id: string): Activity | undefined {
  const [, skill, type] = id.split(':');
  if (skill !== 'reading' && skill !== 'listening') return undefined;
  if (!type || !(type in ALL_QUESTION_TYPE_LABELS)) return undefined;
  /* Both strings are whole templates with the same two holes, so Russian
     can put the paper name and the question type wherever its grammar
     wants them. Both holes are filled with English on purpose: a student
     has to recognise "Matching Headings" and "Reading" on the real paper. */
  const labelVars: TextVars = {
    type: questionTypeLabel(type),
    skill: skill === 'reading' ? 'Reading' : 'Listening',
  };
  const labelTemplate = '{type} drills in {skill}';
  const blurbTemplate = 'Short {skill} drills filtered to {type} questions.';
  return {
    id,
    kind: 'drill',
    label: tutorText('en', labelTemplate, labelVars),
    href: practisePath(skill, type as QuestionType),
    blurb: tutorText('en', blurbTemplate, labelVars),
    minutes: 10,
    skill,
    labelTemplate,
    blurbTemplate,
    labelVars,
  };
}

/** The lesson that teaches a question type, as an activity, when one exists. */
export function lessonForType(skill: 'reading' | 'listening', type: string): Activity | undefined {
  const path = lessonPath(skill, type as QuestionType);
  if (!path) return undefined;
  return buildCatalog().find((a) => a.kind === 'lesson' && a.href === path);
}

/* Kept as a plain object so `type in ALL_QUESTION_TYPE_LABELS` is a real
   membership check rather than an unvalidated string reaching a URL. */
const ALL_QUESTION_TYPE_LABELS: Record<string, true> = {
  'paragraph-matching': true,
  'sentence-completion': true,
  tfng: true,
  'yes-no-notgiven': true,
  'multiple-choice': true,
  'matching-headings': true,
  'matching-features': true,
  'sentence-endings': true,
  categorisation: true,
  'multiple-answer': true,
  'diagram-labelling': true,
  'table-completion': true,
};

/** A compact menu for the prompt: only the ids and labels the model may
    choose between, never the whole catalogue (which would be thousands of
    tokens every turn for no benefit). */
export function catalogMenu(activities: Activity[]): string {
  return activities
    .map((a) => `- ${a.id} — ${a.label}${a.minutes ? ` (${a.minutes} min)` : ''}: ${a.blurb}`)
    .join('\n');
}
