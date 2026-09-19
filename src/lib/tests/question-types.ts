/* Plain, framework-free facts about question types: their student-facing
   label, the lesson that teaches each one, and where to go to drill it.

   Extracted from src/components/TypeAnalytics.tsx (which still re-exports
   all three, so every existing call site is unchanged) because the Mr EZ
   tutor Worker needs the same wording and the same links, and a Cloudflare
   Worker cannot import a React component. One source of truth, reachable
   from both sides. */

import type { QuestionType } from './schema';
import { readingLessonSlug } from '../../data/reading-strategies';
import { listeningLessonSlug } from '../../data/listening-strategies';

/** Friendly labels for the schema's QuestionType keys. */
export const QUESTION_TYPE_LABEL: Record<string, string> = {
  'paragraph-matching': 'Matching Information',
  'sentence-completion': 'Sentence Completion',
  tfng: 'True / False / Not Given',
  'yes-no-notgiven': 'Yes / No / Not Given',
  'multiple-choice': 'Multiple Choice',
  'matching-headings': 'Matching Headings',
  'matching-features': 'Matching Features',
  'sentence-endings': 'Sentence Endings',
  categorisation: 'Categorisation',
  'multiple-answer': 'Multiple Answer',
  'diagram-labelling': 'Diagram Labelling',
  'table-completion': 'Table Completion',
};

/** The label, falling back to the raw key so an unlabelled type still reads
    as something rather than as "undefined". */
export function questionTypeLabel(type: string): string {
  return QUESTION_TYPE_LABEL[type] ?? type;
}

/** Unprefixed path of the lesson that teaches a question type, or undefined
    when this skill has no lesson covering it (only possible for a handful of
    listening types, see listening-strategies.ts). Callers apply withBase(). */
export function lessonPath(skill: 'reading' | 'listening', type: QuestionType): string | undefined {
  const slug = skill === 'listening' ? listeningLessonSlug(type) : readingLessonSlug(type);
  return slug ? `/lessons/${skill}/${slug}` : undefined;
}

/** Unprefixed path to the trainer hub, filtered to drills containing this
    question type (the hub reads `?type=` client-side). Callers apply
    withBase(). */
export function practisePath(skill: 'reading' | 'listening', type: QuestionType): string {
  return `/trainers/${skill}?type=${encodeURIComponent(type)}`;
}
