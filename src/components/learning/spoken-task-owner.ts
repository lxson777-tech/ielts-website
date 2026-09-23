/* Whose recording is on screen (the follow-up to R2B-01 for the spoken
 * focused task, 23 September 2026).
 *
 * WHY THIS FILE EXISTS
 * SpokenFocusedTask.tsx looked the owner up once, on mount, and never used
 * the answer: "Done for now" recorded through the SHARED learner store,
 * which answers for whoever is on the page at the press. So student A could
 * record an answer, the page could change hands (a sign-out and sign-in from
 * the avatar menu, or in another tab), A's recording and checklist stayed on
 * screen, and a press of "Done for now" recorded A's practice into student
 * B's learner record. A recording running at that moment went on recording,
 * and whoever was at the microphone next was captured into A's take.
 *
 * WHAT REPLACES IT
 * The task is an exercise session (./exercise-owner.ts), bound to the owner
 * on the page when the task is opened and never re-resolved after that:
 *
 *   - every press that starts, stops or records anything is claimed first
 *     (claimExerciseCheck), refused for a student who is no longer here or
 *     from a tab that missed the change (the stored-session check);
 *   - "Done for now" is written through recordEventFor under the student
 *     the press was claimed for (recordSpokenPracticeFor below), never
 *     through the shared store;
 *   - each recording is a TAKE, bound to the session it was started under.
 *     When the page changes hands the take is dropped (dropTake): the
 *     recorder is stopped, what it hands back is thrown away, and the
 *     microphone is released. A microphone that arrives after the switch
 *     (the permission prompt was still open) is released at once, and a
 *     recording that finishes after it is never played back (takeIsLive).
 *     A take is never graded and never recorded under anybody: this screen
 *     keeps no recording at all, only the fact of the practice, and only at
 *     "Done for now";
 *   - the screen hands over with a calm line of its own
 *     (SPOKEN_TASK_OWNER_CHANGED_NOTE below), showing the incoming student
 *     an empty task. It used to borrow the focused exercise's line, which
 *     says answers in progress "were kept"; here a recording in progress is
 *     dropped, so that line was not true on this screen.
 *
 * "Done for now" records synchronously, at the press, so there is no late
 * result to keep: a press made before the switch is already in its own
 * student's record, and the hand-over takes its confirmation off the screen.
 *
 * Pure apart from the owner module and the learner store, so
 * tests/last-screens-owner.test.ts drives it with a Map, a fake recorder
 * and no browser.
 */

import type { CacheOwner } from '../../lib/learning/contracts/sync';
import { nt } from '../../lib/i18n/translate';
import { recordEventFor } from '../../lib/learning/store.browser';
import { exerciseIsCurrent, type ExerciseSession } from './exercise-owner';
import { spokenEvidenceDraft } from './spoken-focused-task';

/** Shown when the page changes hands (a sign-out, a sign-in or a switch,
    here or in another tab), and when a tab that missed that change refuses
    a press. True on this screen, which the exercises' line is not: a
    recording under way, or one waiting to be listened back to, is stopped
    and thrown away at the hand-over (dropTake), never kept for anybody. A
    practice already marked "Done for now" is in its own student's record
    and is not what this line is about. Names nobody. */
export const SPOKEN_TASK_OWNER_CHANGED_NOTE = nt(
  'The account on this page changed. Any recording on this screen was stopped and not kept.',
);

/** A recording under way, as far as dropping it is concerned: the recorder
    handle's stop(). */
export interface TakeRecording {
  stop(): Promise<unknown>;
}

/** One take: the microphone asked for, and the recording made on it, for
    one exercise session. */
export interface SpokenTake<S, R extends TakeRecording = TakeRecording> {
  /** The session the take was started under. Never changes. */
  readonly session: ExerciseSession;
  /** The microphone, once the browser has given it. */
  stream: S | null;
  /** The recorder, while it is running. */
  recording: R | null;
  /** Set by dropTake. A dropped take never comes back. */
  dropped: boolean;
}

export function openTake<S, R extends TakeRecording = TakeRecording>(session: ExerciseSession): SpokenTake<S, R> {
  return { session, stream: null, recording: null, dropped: false };
}

/** The take may carry on: it has not been dropped, it still belongs to the
    session on screen (`onScreen`, read from the component's ref), and that
    session's student is still the one on the page. A microphone that
    arrives, or a recording that finishes, when this is false is dropped. */
export function takeIsLive<S, R extends TakeRecording>(take: SpokenTake<S, R>, onScreen: ExerciseSession | null): boolean {
  return !take.dropped && take.session === onScreen && exerciseIsCurrent(take.session);
}

/** Stop and drop a take: the recorder is told to stop and whatever it hands
    back is thrown away, and the microphone is released. Nothing of it is
    played back, graded or recorded, for anybody. Safe to call any number of
    times. */
export function dropTake<S, R extends TakeRecording>(take: SpokenTake<S, R>, release: (stream: S) => void): void {
  take.dropped = true;
  const recording = take.recording;
  take.recording = null;
  if (recording) {
    try {
      void recording.stop().catch(() => undefined);
    } catch {
      /* Already stopped: there is nothing left to throw away. */
    }
  }
  const stream = take.stream;
  take.stream = null;
  if (stream) release(stream);
}

/** "Done for now", written into `owner`'s learner record: the student the
    press was claimed for, never whoever the shared store holds. With no
    account change this is exactly the shared store's recordEvent. */
export function recordSpokenPracticeFor(owner: CacheOwner, input: Parameters<typeof spokenEvidenceDraft>[0]) {
  return recordEventFor(owner, spokenEvidenceDraft(input));
}
