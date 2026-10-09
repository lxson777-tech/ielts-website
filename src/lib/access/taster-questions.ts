/* The questions a free account can write its one free essay check on
   (free AI tries, 10 October 2026, /try/essay).

   These are written for the free check and are NOT from the paid question
   bank or its model answers: they ship in the page like any public text, and
   the paid bank still arrives only through the content gate for a paid
   account. A student may instead type or paste a question of their own; the
   essay grader takes the question as text.

   PURE. English, like every IELTS question; no translation. Task 2 only: a
   Task 1 question needs a chart image, which the grader reads only from the
   site's own list. */

import type { EssayPrompt } from '../writing/schema';

/** A question typed or pasted by the student has this id. */
export const TASTER_OWN_ID = 'taster-own';

/** The shortest and longest question the free check accepts, in characters. */
export const TASTER_OWN_MIN = 30;
export const TASTER_OWN_MAX = 600;

/** The plain question text of each built-in question, for the picker. */
export const TASTER_QUESTION_TEXT: Record<string, string> = {};

function task2(id: string, variant: string, title: string, text: string, instruction: string): EssayPrompt {
  TASTER_QUESTION_TEXT[id] = text;
  return {
    id,
    task: 'task2',
    variant,
    title,
    promptHtml: `<p>${text}</p><p><strong>${instruction}</strong></p>`,
    minWords: 250,
    suggestedMinutes: 40,
    suggestedVocab: [],
  };
}

const INSTRUCTION = 'Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.';

export const TASTER_QUESTIONS: readonly EssayPrompt[] = [
  task2(
    'taster-remote-work',
    'opinion',
    'Working from home',
    'More and more people now work from home instead of travelling to an office. To what extent do you agree or disagree that this is a positive development?',
    INSTRUCTION,
  ),
  task2(
    'taster-school-subjects',
    'discussion',
    'What children should learn',
    'Some people think schools should teach practical life skills, such as cooking and managing money. Others believe schools should focus on academic subjects. Discuss both views and give your own opinion.',
    INSTRUCTION,
  ),
  task2(
    'taster-city-cars',
    'problem-solution',
    'Traffic in cities',
    'Traffic congestion is a growing problem in large cities around the world. What are the main causes of this problem, and what can be done to reduce it?',
    INSTRUCTION,
  ),
  task2(
    'taster-travel-abroad',
    'opinion',
    'Studying abroad',
    'Many young people choose to study in another country for part of their education. Do the advantages of this outweigh the disadvantages?',
    INSTRUCTION,
  ),
];

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The prompt for a question the student typed or pasted, or null when it is
    too short or too long to be a question. Their text is escaped: it goes
    into the page as text, never as markup. */
export function ownQuestion(raw: string): EssayPrompt | null {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (text.length < TASTER_OWN_MIN || text.length > TASTER_OWN_MAX) return null;
  return {
    id: TASTER_OWN_ID,
    task: 'task2',
    variant: 'opinion',
    title: 'Your own question',
    promptHtml: `<p>${escapeHtml(text)}</p>`,
    minWords: 250,
    suggestedMinutes: 40,
    suggestedVocab: [],
  };
}
