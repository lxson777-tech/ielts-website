/* Whose spoken answers these are (finding R2C-04 of the third Codex inspection).
 *
 * WHY THIS FILE EXISTS
 * R2-02 bound a speaking GRADE to the student who started the attempt: the
 * grade is kept for them whatever has happened on the page since. The attempt
 * itself was never stopped. Student A could begin Part 1 on the speaking
 * trainer, another tab could sign A out and B in, and B could go on answering
 * the remaining questions on the same screen: nothing asked who was on the
 * page between one question and the next. The recording that then went for
 * grading (paid for) held B's answers too, and the grade became A's speaking
 * evidence. Hiding the report at the end did not undo that.
 *
 * WHAT REPLACES IT
 * An attempt bound, when it starts, to the owner on the page, which stops the
 * moment that owner is no longer the one on the page:
 *
 *   - it listens for owner changes, so a switch is acted on when it happens,
 *     not at the next step;
 *   - every step asks it first: may the next question (or stage, or
 *     countdown) start, may the microphone start capturing an answer, may the
 *     clip that has just stopped join the attempt, may the attempt be graded.
 *     Each of those questions runs the owner check itself, so an owner that
 *     changed without a notification reaching this attempt is caught at the
 *     very next step as well;
 *   - its timers (the answer clock, the prep countdown, the automatic move to
 *     the next question) run through it, check the owner on every tick, and
 *     are cleared the moment it stops;
 *   - once the owner has changed it is SUSPENDED for good. Every question
 *     above answers no, even if the first owner comes back, and the screen is
 *     told once, through onOwnerLeft, with the stage the attempt was in, so it
 *     can stop the microphone and go back to its menu.
 *
 * WHAT HAPPENS TO THE ANSWERS
 *   - 'open', nothing sent for grading yet (asking, preparing, recording, or
 *     recorded answers waiting after a failed grading request): dropped.
 *     Nothing is graded, because grading is paid, and nothing is recorded,
 *     because an unfinished attempt is no evidence of anything and it is the
 *     one piece of A's work that could carry B's voice.
 *   - 'grading', the last answer was in and grading had begun before the
 *     switch: every answer in it was given before the switch, so the grade
 *     goes on and is kept for A through runOwnedGrade exactly as before. The
 *     screen lets go of it (the binding is cancelled), so none of it is shown
 *     to whoever is on the page now.
 *   - 'done', graded and on screen: the report leaves the screen. It is in
 *     A's history already.
 *
 * WHO USES IT
 * The speaking trainer (src/components/SpeakingTester.tsx) and the standalone
 * live examiner (src/components/LiveExaminer.tsx, /speaking/examiner and the
 * live drills). The mock exam's embedded examiner does not: MockExam takes it
 * off the screen at a change of owner and reports the suspension itself
 * (onSuspend), and that path is left exactly as it is.
 *
 * Pure apart from the owner module and the timers it is handed, so
 * tests/delayed-grade-owner.test.ts drives it with a hand-cranked clock
 * instead of a browser and a microphone.
 */

import type { CacheOwner } from '../lib/learning/contracts/sync';
import { bindToCurrentOwner, onOwnerChange, type OwnerBinding } from '../lib/store-owner';

/** Where an attempt stands. */
export type SpeakingAttemptStage =
  /** Questions, preparation, recording, or recorded answers waiting to be
      graded (again, after a failed request). */
  | 'open'
  /** The last answer is in and grading has begun. */
  | 'grading'
  /** Graded, and the report is on screen. */
  | 'done'
  /** The owner changed. Final: nothing more joins it and nothing of it is
      graded that had not begun grading already. */
  | 'suspended'
  /** The screen let go on purpose: start over, a new part, unmount. Final. */
  | 'closed';

/** The stage an attempt was in when its owner left the page. */
export type SpeakingStageAtSwitch = 'open' | 'grading' | 'done';

/** The one timer the attempt needs. The browser's own by default; a test
    hands in a clock it winds by hand. Same shape as DraftTimers in
    ./writing-editor-owner.ts. */
export interface AttemptTimers {
  set(run: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const browserTimers: AttemptTimers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface SpeakingAttemptOptions {
  /** Called once, the moment the attempt finds its owner gone: stop the
      microphone, drop what is not being graded, go back to the menu. */
  onOwnerLeft(stage: SpeakingStageAtSwitch, attempt: OwnedSpeakingAttempt): void;
  timers?: AttemptTimers;
}

export interface OwnedSpeakingAttempt {
  /** Whose answers these are: the current owner when the attempt started.
      Never changes afterwards. */
  readonly owner: CacheOwner;
  /** The binding the grade is settled through (runOwnedGrade). Cancelled
      when the attempt is suspended or closed. */
  readonly binding: OwnerBinding;
  /** Where it stands right now. Reads only; runs no owner check. */
  stage(): SpeakingAttemptStage;
  /** May the next question, stage or countdown begin? */
  mayStartTurn(): boolean;
  /** May the microphone start (or resume) capturing an answer? */
  mayStartRecording(): boolean;
  /** May the clip that has just stopped join this attempt? No once the owner
      has changed, since it may hold words spoken after the switch. */
  mayAcceptRecording(): boolean;
  /** May this attempt be graded? Yes only while it is open and its owner is
      still the one on the page, and a yes means grading has begun. */
  beginGrading(): boolean;
  /** The grading request failed. Yes (and the answers can be graded again)
      only while the owner is still the one on the page. */
  gradingFailed(): boolean;
  /** The grade is back and on screen. */
  graded(): void;
  /** Runs the owner check, and says whether the attempt is still this
      owner's and still on screen (open, grading or done). */
  ownerStillHere(): boolean;
  /** Run `step` once after `ms`, only if the attempt is still open then.
      Returns a cancel. Cleared when the attempt stops being open. */
  after(ms: number, step: () => void): () => void;
  /** Run `step` every `ms` while the attempt stays open, checking the owner
      on every tick. Returns a stop. */
  every(ms: number, step: () => void): () => void;
  /** The screen lets go on purpose. Not a suspension: onOwnerLeft is not
      called. Safe to call any number of times. */
  close(): void;
}

/** Start an attempt for the owner on the page right now. */
export function openSpeakingAttempt(options: SpeakingAttemptOptions): OwnedSpeakingAttempt {
  const timers = options.timers ?? browserTimers;
  /* The owner is fixed HERE, once. Nothing below asks who it is again; it
     only asks whether they are still the one on the page. */
  const binding = bindToCurrentOwner();
  let stage: SpeakingAttemptStage = 'open';
  const pending = new Set<unknown>();
  let stopListening: (() => void) | null = null;

  const clearTimers = (): void => {
    for (const handle of pending) timers.clear(handle);
    pending.clear();
  };

  const letGo = (to: 'suspended' | 'closed'): void => {
    stage = to;
    clearTimers();
    if (stopListening) {
      stopListening();
      stopListening = null;
    }
    binding.cancel();
  };

  /* The one owner check every question runs. announceStoresChanged also
     fires for the SAME owner (the anonymous-work claim), and the binding
     compares the owner itself, so that is never taken as a switch. */
  const check = (): void => {
    if (stage === 'suspended' || stage === 'closed') return;
    const state = binding.state();
    if (state === 'current') return;
    if (state === 'cancelled') {
      /* Something let go of the binding directly: treat it as the screen
         letting go, quietly. */
      letGo('closed');
      return;
    }
    const at: SpeakingStageAtSwitch = stage;
    letGo('suspended');
    options.onOwnerLeft(at, attempt);
  };

  const open = (): boolean => {
    check();
    return stage === 'open';
  };

  const after = (ms: number, step: () => void): (() => void) => {
    if (!open()) return () => {};
    const handle: unknown = timers.set(() => {
      pending.delete(handle);
      if (open()) step();
    }, ms);
    pending.add(handle);
    return () => {
      if (pending.delete(handle)) timers.clear(handle);
    };
  };

  const attempt: OwnedSpeakingAttempt = {
    owner: binding.owner,
    binding,
    stage: () => stage,
    mayStartTurn: open,
    mayStartRecording: open,
    mayAcceptRecording: open,
    beginGrading() {
      if (!open()) return false;
      stage = 'grading';
      clearTimers();
      return true;
    },
    gradingFailed() {
      check();
      if (stage !== 'grading') return false;
      stage = 'open';
      return true;
    },
    graded() {
      if (stage === 'grading') stage = 'done';
    },
    ownerStillHere() {
      check();
      return stage === 'open' || stage === 'grading' || stage === 'done';
    },
    after,
    every(ms, step) {
      let stopped = false;
      let cancelNext: () => void = () => {};
      const tick = (): void => {
        if (stopped) return;
        step();
        if (!stopped) cancelNext = after(ms, tick);
      };
      cancelNext = after(ms, tick);
      return () => {
        stopped = true;
        cancelNext();
      };
    },
    close() {
      if (stage === 'suspended' || stage === 'closed') return;
      letGo('closed');
    },
  };

  stopListening = onOwnerChange(check);
  return attempt;
}
