/* The one upgrade nudge after a free student's first finished lesson
   (Alex, 1 October 2026; docs/paid-access/FREE-ACCOUNT-MODEL.md).

   The rule, in one place:
   - only for a FREE account (never signed out, never paid or complimentary,
     never while the account is still being checked);
   - only when the student has just FINISHED a lesson: pressed "Mark this
     lesson as studied", or checked every part of the lesson's own quiz.
     Both sit at the end of the lesson, so it is never shown mid-reading;
   - once per account, ever: only for the account's FIRST finished lesson,
     judged from its lesson progress, which is saved to the account and the
     same on every device (user_state.progress), so a second device that
     finishes another lesson does not show it again (free-account
     verification, 1 October 2026, finding 3). It is also remembered under
     the account's own key on this device and marked the moment it is shown,
     so dismissing it or reloading never brings it back.

   The decision is pure (shouldNudge) so it is tested without a browser; the
   rest is two small browser helpers. */

import { safeGet, safeSet, scopedKeyFor, userOwner, type BrowserStorage } from '../store-owner';
import type { BrowserTier } from './tier';

export const FIRST_LESSON_NUDGE_KEY = 'ielts.access.first-lesson-nudge.v1';

/** Dispatched on `window` when a student finishes a lesson (detail: the
    lesson key). Only the gated build listens. */
export const LESSON_FINISHED_EVENT = 'ielts:lesson-finished';

export function nudgeKeyFor(userId: string): string {
  return scopedKeyFor(FIRST_LESSON_NUDGE_KEY, userOwner(userId));
}

export function nudgeAlreadyShown(storage: BrowserStorage | null, userId: string): boolean {
  if (!storage) return false;
  return safeGet(storage, nudgeKeyFor(userId)) !== null;
}

/** Whether to show the nudge now. */
export function shouldNudge(input: {
  tier: BrowserTier;
  userId: string | null;
  storage: BrowserStorage | null;
  /** A timed paper or check is running on this page. */
  underExam?: boolean;
  /** Lessons this account had already finished before the one just
      finished (from its synced progress). Any at all: not the first. */
  finishedBefore?: number;
}): boolean {
  if (input.tier !== 'free' || !input.userId || input.underExam) return false;
  if ((input.finishedBefore ?? 0) > 0) return false;
  /* No storage (a private window that refuses it): showing it on every
     finished lesson would break "once", so it is not shown at all. */
  if (!input.storage) return false;
  return !nudgeAlreadyShown(input.storage, input.userId);
}

/** Remember that this account has seen the nudge. */
export function markNudgeShown(storage: BrowserStorage | null, userId: string, nowIso: string): void {
  if (storage) safeSet(storage, nudgeKeyFor(userId), nowIso);
}

/** Tell the page a lesson was just finished. */
export function announceLessonFinished(lessonKey: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(LESSON_FINISHED_EVENT, { detail: lessonKey }));
}
