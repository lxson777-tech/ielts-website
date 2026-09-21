/* The client-side half of the assessment boundary for Mr EZ.
 *
 * The Worker refuses every lesson-help, evaluate-practice and chat request
 * made while `place.underExam` is true (HELP_BLOCKED_MODES in
 * contracts/ai.ts). That refusal is the real boundary and it holds even if
 * every line in this file were deleted. What this file adds is the cheaper
 * half: when the client can already see the same flag the Worker will check,
 * there is no reason to spend a network round trip, and on the paid graders
 * no reason to spend money, finding that out. MrEzPanel.tsx reads this
 * before it ever calls askTutor().
 *
 * `place.underExam` is one flag, set the same way by four different screens
 * (TestPlayer.tsx and MockExam.tsx for a timed full paper or the mock,
 * FocusedExercise.tsx and WritingFocusedTask.tsx for the working phase of an
 * INDEPENDENT check only (guided practice leaves it off, because hints are
 * exactly what that screen offers). One flag, one gate, so "timed paper",
 * "mock" and "independent check" never need three separate checks here.
 *
 * Pure: no DOM, no fetch, so the gate itself can be tested without mounting
 * the panel. */

import type { TutorPlace } from '../../lib/tutor/schema';

/** True while Mr EZ must decline everything: no hints, no examples, no
    task-specific help, and no answer to a direct question either. False the
    moment the flag clears, which is what makes review "help is available
    again" rather than a separate mode this file has to know about. */
export function chatBlocked(place: TutorPlace): boolean {
  return place.underExam === true;
}

/** Shown in place of the composer, and as the first thing in an otherwise
    empty conversation, so the panel reads as "not now" rather than as
    broken. Kept as one plain English literal, translated at the point
    MrEzPanel actually renders it, the same convention session.ts uses for
    SESSION_SENTENCES. */
export const BOUNDARY_EXPLANATION =
  'No hints, examples or answers while the clock is running. Ask me again once you submit, this conversation will still be here.';

/** Shorter version for the composer's own placeholder, where the full
    sentence would not fit. */
export const BOUNDARY_PLACEHOLDER = 'Mr EZ is stepping back until you submit';
