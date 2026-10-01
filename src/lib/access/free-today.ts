/* Today for a FREE account (the free-account model, 1 October 2026): the
   course and the next lessons to read, starting from the answers the
   student gave on the sales website's questionnaire, if they gave any.

   PURE apart from the two small storage helpers at the end, which take the
   storage as a parameter. The answers are a SUGGESTED starting point, never
   an assessed level (the same rule the trial had: src/lib/trial/offer.ts
   cleanQuestionnaire).

   Where the answers come from, in order:
   1. the address: the sales website sends the student to sign up with
      `next=/dashboard?journey=1&band=…&skill=…&focus=…&time=…` (Builder W),
      so they arrive on Today with them;
   2. what this account saved on this device the first time (below);
   3. the sales website's own draft in this tab (`ielts.journey.draft.v1`),
      or the old trial page's copy (`ielts.trial.questionnaire.v1`). */

import type { CourseLesson } from '../course';
import { cleanQuestionnaire, questionnaireFromSearch, type TrialQuestionnaire } from '../trial/offer';
import { safeGet, safeSet, scopedKeyFor, userOwner, type BrowserStorage } from '../store-owner';

export type StartingPoint = TrialQuestionnaire;

/** The next `count` lessons not yet studied: the chosen section's first (in
    course order), then the rest of the course in order. */
export function freeNextLessons(
  lessons: readonly CourseLesson[],
  done: (key: string) => boolean,
  start: StartingPoint | null,
  count = 3,
): CourseLesson[] {
  const open = lessons.filter((lesson) => !done(lesson.key));
  const first = start ? open.filter((lesson) => lesson.skill === start.skill) : [];
  const rest = open.filter((lesson) => !first.includes(lesson));
  return [...first, ...rest].slice(0, count);
}

/** How far through the course the student is. */
export function freeProgress(lessons: readonly CourseLesson[], done: (key: string) => boolean): { done: number; total: number } {
  return { done: lessons.filter((lesson) => done(lesson.key)).length, total: lessons.length };
}

export const STARTING_POINT_KEY = 'ielts.access.starting-point.v1';
/** The sales website's draft of the questionnaire (Builder W). */
export const JOURNEY_DRAFT_KEY = 'ielts.journey.draft.v1';
/** The retired trial page's copy, still read so nobody's answers are lost. */
export const TRIAL_QUESTIONNAIRE_KEY = 'ielts.trial.questionnaire.v1';

function parse(raw: string | null): StartingPoint | null {
  if (!raw) return null;
  try {
    return cleanQuestionnaire(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** The account's starting point: from the address (and then saved for the
    account), else saved, else the tab's draft (and then saved). */
export function resolveStartingPoint(input: {
  search: string;
  userId: string;
  local: BrowserStorage | null;
  session: BrowserStorage | null;
}): StartingPoint | null {
  const key = scopedKeyFor(STARTING_POINT_KEY, userOwner(input.userId));
  const save = (point: StartingPoint) => {
    if (input.local) safeSet(input.local, key, JSON.stringify(point));
    return point;
  };
  const fromLink = questionnaireFromSearch(input.search);
  if (fromLink) return save(fromLink);
  const saved = input.local ? parse(safeGet(input.local, key)) : null;
  if (saved) return saved;
  const draft = input.session
    ? parse(safeGet(input.session, JOURNEY_DRAFT_KEY)) ?? parse(safeGet(input.session, TRIAL_QUESTIONNAIRE_KEY))
    : null;
  return draft ? save(draft) : null;
}
