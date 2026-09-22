/* Which face Mr EZ wears, decided once, in one place.
 *
 * WHY THIS IS NOT A FEW LINES INSIDE THE PANEL
 * The panel used to pick the launcher's face from whether its own drawer was
 * open: `open ? 'explaining' : mood`. On a build with no tutor wired up at
 * all, pressing the launcher therefore flipped him from "unavailable" to
 * "explaining" with nobody there to explain anything (reported 2026-09-22,
 * item 9). Opening a drawer is not an event about the tutor. Whether he can
 * be reached is.
 *
 * So every state below is tied to a real fact about the tutor, exactly as
 * MOOD_MEANING in src/lib/tutor/avatar.ts describes each one, and nothing
 * here can be moved by a purely local interface action.
 *
 * Pure: no DOM, no fetch, no React, so the decision is testable without
 * mounting anything. Same reason mrez-boundary.ts beside it is a plain
 * module rather than a few lines in the component.
 */

import type { TutorMood } from '../../lib/tutor/schema';

export interface TutorFaceInput {
  /** `isTutorConfigured()`: a tutor Worker is wired up on this build AND
      accounts are configured. False means there is no live tutor at all. */
  configured: boolean;
  /** Null while auth has not resolved. False means nobody is signed in, and
      Mr EZ never answers without knowing whose record he may read, so he
      cannot reply either way. */
  signedIn: boolean | null;
  /** A request is genuinely in flight, between send and reply. */
  busy: boolean;
  /** The last attempt failed (unreachable, limit spent, refused). */
  failed: boolean;
  /** A timed paper, the mock or an independent check is running, so he is
      deliberately standing back (see mrez-boundary.ts). */
  blocked: boolean;
  /** The mood a real reply actually arrived with, or null when no reply has
      arrived in this conversation. Never a guess from the text. */
  lastReplyMood: TutorMood | null;
}

/** Whether there is a live tutor that could answer right now. This, and not
    anything about the interface, is what decides between a face that can
    speak and the "unavailable" one. */
export function tutorReachable(input: Pick<TutorFaceInput, 'configured' | 'signedIn' | 'failed'>): boolean {
  if (!input.configured) return false;
  if (input.failed) return false;
  // Null means "not resolved yet", which is not the same as signed out: it
  // would be wrong to declare him unreachable before auth has answered.
  return input.signedIn !== false;
}

/** The one mood every Mr EZ surface in the panel shows: the launcher and the
    panel header both read this, so they can never disagree.
 *
 *  Order matters. Reachability comes first, because a face that suggests he
 *  is about to explain something is a false promise on a build where he
 *  cannot be reached. Then a request actually in flight. Then the exam
 *  boundary, where he is reachable but has chosen to say nothing, which is
 *  resting rather than explaining. Only then the mood of a reply that
 *  really arrived. */
export function selectTutorMood(input: TutorFaceInput): TutorMood {
  if (!tutorReachable(input)) return 'unavailable';
  if (input.busy) return 'thinking';
  if (input.blocked) return 'idle';
  return input.lastReplyMood ?? 'idle';
}
