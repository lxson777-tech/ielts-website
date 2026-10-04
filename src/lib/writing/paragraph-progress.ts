/* Which paragraph of the essay plan the student has reached, read from the
   text they are typing. Drives the numbered path in WritingCoachPanel (both
   the per-question plan and the essay-type structure), so there is nothing
   to tick by hand.

   It is only a guide. Nothing here is graded, stored or sent anywhere, and
   the panel never blocks or warns on the result.

   The rules, in plain words:
   - A paragraph is a non-empty line of the answer box. A textarea wraps long
     lines by itself, so a student only presses Enter to start a new
     paragraph; a blank line between paragraphs counts the same as a single
     Enter, and empty lines are ignored.
   - Paragraph 1 belongs to step 1, paragraph 2 to step 2, and so on.
   - A step marked "(optional)" (the Discussion essay's Body 3) is only given
     a paragraph once the essay has more paragraphs than the required steps.
     Until then it shows as optional and the next required step comes first.
   - A step is done when its paragraph has enough words to be a real
     paragraph: SHORT_PARAGRAPH_WORDS for an introduction, overview or
     conclusion, BODY_PARAGRAPH_WORDS for a body or detail paragraph. These
     are deliberately lower than a good paragraph's length (a Task 2 body
     paragraph is usually 80 to 120 words) so the path moves on as soon as a
     paragraph is clearly under way, without telling anyone it is too short.
   - "now" is the first step that is not done yet; every step after it is
     "later". Once every step is done there is no "now".

   Step names are the English names from the data (src/data/writing-structures.ts
   and src/data/writing-plans.ts), read before translation. */

import { countWords } from './mechanics';

/** Introduction, overview and conclusion paragraphs: one or two sentences. */
export const SHORT_PARAGRAPH_WORDS = 15;
/** Body and detail paragraphs: a topic sentence plus the start of its support. */
export const BODY_PARAGRAPH_WORDS = 25;

export type StepState = 'done' | 'now' | 'later' | 'optional';

export interface StepProgress {
  /** One state per step, in the order the steps were given. */
  states: StepState[];
  /** How many non-empty paragraphs the essay has. */
  paragraphs: number;
  /** How many steps are done. */
  done: number;
}

/** The essay's non-empty paragraphs, trimmed. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => countWords(line) > 0);
}

/** True for "Body 3 (optional)" and any other step the data marks optional. */
export function isOptionalStep(name: string): boolean {
  return /\(optional\)/i.test(name);
}

/** The words a paragraph needs before its step counts as done. */
export function wordsNeeded(name: string): number {
  return /^\s*(introduction|overview|conclusion)\b/i.test(name) ? SHORT_PARAGRAPH_WORDS : BODY_PARAGRAPH_WORDS;
}

export function stepProgress(stepNames: readonly string[], essay: string): StepProgress {
  const paragraphs = splitParagraphs(essay);
  const required = stepNames.map((_, i) => i).filter((i) => !isOptionalStep(stepNames[i]!));
  // Optional steps only take a paragraph once the essay has outgrown the
  // required ones; before that the student is most likely heading for the
  // conclusion, not the extra body paragraph.
  const active = paragraphs.length > required.length ? stepNames.map((_, i) => i) : required;

  const states: StepState[] = stepNames.map((name) => (isOptionalStep(name) ? 'optional' : 'later'));
  let done = 0;
  active.forEach((stepIndex, order) => {
    const paragraph = paragraphs[order];
    if (paragraph !== undefined && countWords(paragraph) >= wordsNeeded(stepNames[stepIndex]!)) {
      states[stepIndex] = 'done';
      done += 1;
    } else {
      states[stepIndex] = 'later';
    }
  });
  const now = active.find((i) => states[i] !== 'done');
  if (now !== undefined) states[now] = 'now';

  return { states, paragraphs: paragraphs.length, done };
}
