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
 * ONE TAKE AT A TIME (finding R2F-01 of the sixth Codex inspection)
 * Start pressed twice while the browser's microphone prompt was still open
 * started two takes. Each press replaced the take on screen, but nothing
 * said a start was already on its way, and the check after the wait asked
 * only whether the SESSION was still on screen, which it was for both. So
 * both microphones were kept and both recorders started, and a hand-over or
 * an unmount stopped only the last one: the first went on capturing behind
 * the emptied screen. The takes now live on a desk (openSpokenTakes below)
 * that the screen asks for every take, and three rules hold there:
 *
 *   - SINGLE FLIGHT. A take waiting for the microphone is marked as waiting
 *     the moment it is opened, before the screen awaits anything, and a
 *     press of Start while it waits opens nothing and asks for nothing;
 *   - THE TAKE ITSELF IS CHECKED. After every wait, the take must still BE
 *     the take on the desk (takeIsLive compares the take's own identity, not
 *     only its session). A microphone that arrives for any other take is
 *     released at once, every track ended, and that take is dropped;
 *   - NOTHING IS REPLACED WHILE IT RUNS. Opening a take drops the one before
 *     it first (recorder stopped, microphone released), and a hand-over, a
 *     refused press or an unmount drops EVERY take the desk still holds
 *     open (dropAll), not only the one on screen.
 *
 * The recorder's own time limit ends the microphone's tracks too when the
 * spoken task asks it to (recordSegment's endTracksAtTimeout in
 * src/lib/speaking/recorder.ts), so a take left running to its 90 seconds
 * does not keep the microphone on.
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

/** The take may carry on: it has not been dropped, it is still THE take on
    screen (`current`, the desk's take: its own identity, R2F-01, so a take
    that was replaced is never live again even while its session is), it
    still belongs to the session on screen (`onScreen`, read from the
    component's ref, or null once the screen has gone), and that session's
    student is still the one on the page. A microphone that arrives, or a
    recording that finishes, when this is false is dropped. */
export function takeIsLive<S, R extends TakeRecording>(
  take: SpokenTake<S, R>,
  current: SpokenTake<S, R> | null,
  onScreen: ExerciseSession | null,
): boolean {
  return !take.dropped && take === current && take.session === onScreen && exerciseIsCurrent(take.session);
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

/** Every take one screen makes, and the rules of R2F-01 (see ONE TAKE AT A
    TIME above). The screen never holds a take of its own: it asks the desk
    for one, and the desk decides whether a press may open one and whether a
    take may still go on after a wait. */
export interface SpokenTakes<S, R extends TakeRecording = TakeRecording> {
  /** The take on screen: waiting for the microphone, recording, or the last
      one made. Null before the first take and after a drop. */
  current(): SpokenTake<S, R> | null;
  /** True while a take is waiting for the microphone. */
  starting(): boolean;
  /** A press of Start. Returns null, opening nothing, while a take is
      already waiting for the microphone. Otherwise the take on screen, if
      any, is dropped first (recorder stopped, microphone released) and a new
      take is opened for `session`, marked as waiting and put on screen, all
      before the caller's first await. */
  begin(session: ExerciseSession): SpokenTake<S, R> | null;
  /** The browser answered the microphone request `take` made: a stream, or
      null for a refusal or a failure. The take stops waiting either way.
      True when the take may go on (takeIsLive), and then a stream becomes
      the take's microphone. False otherwise, and then a stream is released
      at once, every track ended, and the take is dropped. */
  settle(take: SpokenTake<S, R>, stream: S | null, onScreen: ExerciseSession | null): boolean;
  /** takeIsLive against the take on screen. */
  isLive(take: SpokenTake<S, R>, onScreen: ExerciseSession | null): boolean;
  /** Drop the take on screen, if any. */
  dropCurrent(): void;
  /** Drop every take opened and not yet dropped, and let go of the one on
      screen: the page changing hands, a refused press, the screen going. */
  dropAll(): void;
}

export function openSpokenTakes<S, R extends TakeRecording = TakeRecording>(
  release: (stream: S) => void,
): SpokenTakes<S, R> {
  /* Every take opened and not yet dropped. With the rules below there is at
     most one, the one on screen; dropAll still walks all of them, so a take
     can never be left running because something forgot it. */
  const open = new Set<SpokenTake<S, R>>();
  let onDesk: SpokenTake<S, R> | null = null;
  let waiting: SpokenTake<S, R> | null = null;

  const drop = (take: SpokenTake<S, R>): void => {
    open.delete(take);
    if (waiting === take) waiting = null;
    dropTake(take, release);
  };

  const desk: SpokenTakes<S, R> = {
    current: () => onDesk,
    starting: () => waiting !== null && !waiting.dropped,
    begin(session) {
      if (desk.starting()) return null;
      if (onDesk) drop(onDesk);
      const take = openTake<S, R>(session);
      open.add(take);
      onDesk = take;
      waiting = take;
      return take;
    },
    settle(take, stream, onScreen) {
      if (waiting === take) waiting = null;
      if (!takeIsLive(take, onDesk, onScreen)) {
        if (stream) release(stream);
        drop(take);
        return false;
      }
      if (stream) take.stream = stream;
      return true;
    },
    isLive: (take, onScreen) => takeIsLive(take, onDesk, onScreen),
    dropCurrent() {
      const take = onDesk;
      onDesk = null;
      if (take) drop(take);
    },
    dropAll() {
      onDesk = null;
      waiting = null;
      for (const take of [...open]) drop(take);
    },
  };
  return desk;
}

/** "Done for now", written into `owner`'s learner record: the student the
    press was claimed for, never whoever the shared store holds. With no
    account change this is exactly the shared store's recordEvent. */
export function recordSpokenPracticeFor(owner: CacheOwner, input: Parameters<typeof spokenEvidenceDraft>[0]) {
  return recordEventFor(owner, spokenEvidenceDraft(input));
}
