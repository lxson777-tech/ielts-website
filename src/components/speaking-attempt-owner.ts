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
import type { StartHandle } from '../lib/speaking/live/start-check';

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

/* ── The live examiner's session start, guarded (finding R2D-01 of the
 *    fourth Codex inspection) ──────────────────────────────────────────
 *
 * WHY
 * Starting a live examiner session waits several times: for the examiner's
 * settings, for the microphone permission, for the student's sign-in token,
 * and for the voice connection to come up. The attempt above stops the
 * STANDALONE interview when the page changes hands, but the mock exam's
 * embedded examiner has no attempt: MockExam takes the examiner off the
 * screen instead, and its unmount could run while the microphone permission
 * was still being asked for. The start went on regardless. When the
 * permission came back it kept the microphone, started recording, fetched
 * the token of whoever was signed in by then and opened a paid voice
 * session behind the mock's stopped screen, and a connection that came up
 * after the unmount was kept too. Letting go of the grade's binding stopped
 * only the eventual grade from being shown.
 *
 * WHAT REPLACES IT
 * Every start is numbered (a generation) and bound to the student on the
 * page, and every wait in it goes through the start, which asks when the
 * wait is over:
 *   - is this still the screen's latest start (nothing has let go of it or
 *     begun again since), and is the screen still there;
 *   - is the student who started it still the one on the page;
 *   - standalone only, is its attempt still open (asking runs the attempt's
 *     owner check, so a switch found here ends the session through the
 *     attempt's own teardown).
 * A no means the start touches nothing the screen holds now. What the wait
 * has just handed it is its own to let go of: a microphone stream has every
 * track stopped, a connection is closed at once, and nothing after that
 * wait happens (no token fetched, no recording started, no connection
 * opened). A step that failed after the start was let go is swallowed, since
 * nobody is there to be told. The screen's teardowns (the unmount, the
 * switch, the student's own Back, a new start) move the number on, so
 * nothing begun before them can carry on after.
 *
 * The same question is asked once more after the session has been shut
 * down and before grading is asked for, so a switch or an unmount during
 * that shutdown starts no paid grading call. A grade that had already been
 * asked for is untouched: runOwnedGrade still keeps it for the student who
 * spoke.
 *
 * Pure, like the attempt: tests/delayed-grade-owner.test.ts drives it with
 * promises it resolves by hand, a stream and a connection of its own, and no
 * browser, microphone or voice service.
 *
 * AND A HANDLE THE SCREEN PULLS (finding R2E-01, Codex inspection of
 * c4a7793). A start asks when a wait is over; the voice connection's own
 * setup waits for up to twenty seconds, and until it has finished the
 * screen has no connection to close. So every start also carries a handle
 * (StartHandle, src/lib/speaking/live/start-check.ts) that is pulled the
 * moment its number goes stale: every teardown above already moves the
 * number on (the unmount, the switch, the student's own Back, a newer
 * start), so every one of them reaches a setup still under way at once, and
 * the setup releases its connection, its socket and its audio there and
 * then. The questions above are unchanged and still asked: the handle is for
 * a let-go that reached the screen, the question for one that did not.
 */

/** The start numbers of one screen. */
export interface SessionGenerations {
  /** The number handed out last. */
  current(): number;
  /** A new start, or a teardown: every number handed out before is stale
      from now on. Returns the new number. */
  next(): number;
  /** Is `generation` the latest number, and is the screen still there? */
  isCurrent(generation: number): boolean;
  /** The screen is gone for good: every number is stale from now on,
      including any handed out afterwards. */
  unmount(): void;
  /** Run `release` once, the moment `generation` goes stale (a newer start,
      a teardown, the unmount); at once when it already is. Returns a
      function that takes it back (R2E-01). */
  whenStale(generation: number, release: () => void): () => void;
}

export function sessionGenerations(): SessionGenerations {
  let generation = 0;
  let mounted = true;
  /* R2E-01: what to release when a number goes stale. */
  const watchers = new Set<{ generation: number; release: () => void }>();
  const isCurrent = (candidate: number): boolean => mounted && candidate === generation;
  const releaseStale = (): void => {
    for (const watcher of [...watchers]) {
      if (isCurrent(watcher.generation)) continue;
      watchers.delete(watcher);
      try {
        watcher.release();
      } catch {
        /* letting go must never break the teardown that pulled it */
      }
    }
  };
  return {
    current: () => generation,
    next: () => {
      generation += 1;
      releaseStale();
      return generation;
    },
    isCurrent,
    unmount: () => {
      mounted = false;
      generation += 1;
      releaseStale();
    },
    whenStale(stale, release) {
      if (!isCurrent(stale)) {
        try {
          release();
        } catch {
          /* as above */
        }
        return () => {};
      }
      const watcher = { generation: stale, release };
      watchers.add(watcher);
      return () => {
        watchers.delete(watcher);
      };
    },
  };
}

/** What a microphone request hands back, as far as letting go of it goes:
    a MediaStream, or a test's own stand-in. */
export interface StoppableStream {
  getTracks(): ReadonlyArray<{ stop(): void }>;
}

/** What a connection request hands back, as far as letting go of it goes:
    an examiner link, or a test's own stand-in. */
export interface ClosableConnection {
  close(): unknown;
}

/** Stop every track of a stream this start was handed and may not keep. */
export function stopStream(stream: StoppableStream): void {
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* already stopped */
    }
  }
}

/** Close a connection this start was handed and may not keep. Never
    throws, and a close that fails later is swallowed: there is nobody to
    tell. */
export function closeConnection(connection: ClosableConnection): void {
  try {
    const closing = connection.close() as { catch?: (handler: () => void) => unknown } | undefined;
    if (closing && typeof closing.catch === 'function') closing.catch(() => {});
  } catch {
    /* already closed */
  }
}

export interface GuardedSessionStart {
  /** This start's number. */
  readonly generation: number;
  /** The student it was started for; the grade is settled through it. */
  readonly binding: OwnerBinding;
  /** Is this still the screen's latest start, with the screen still there?
      Runs no owner check. A no means another teardown or start owns the
      screen now, and this start must touch none of it. */
  current(): boolean;
  /** May this start, or the session it became, go on? Current, its student
      still the one on the page, and (standalone) its attempt still open. */
  live(): boolean;
  /** Wait for one step of the start. Its result comes back (wrapped, so a
      step that legitimately answers null is not mistaken for a no) only
      while the start may go on. Otherwise what the step handed back is let
      go of at once through `release` and null comes back; so does a step
      that FAILED after the start was let go. A failure while the start is
      still live is thrown on, to the screen's own error handling. */
  step<T>(pending: Promise<T>, release?: (value: T) => void): Promise<{ value: T } | null>;
  /** Handed to the voice connection's setup (R2E-01): pulled the moment
      this start's number goes stale, so a setup still under way releases
      what it has made at once instead of when it next looks. */
  readonly handle: StartHandle;
}

export interface SessionStartOptions {
  generations: SessionGenerations;
  /** The binding the grade will be settled through: the attempt's own in
      the standalone examiner, a plain one in the mock embed. */
  binding: OwnerBinding;
  /** Standalone only. */
  attempt?: OwnedSpeakingAttempt | null;
}

/** Number a start that is beginning now, and bind it. Every earlier start
    of the same screen is stale from this moment. */
export function guardSessionStart(options: SessionStartOptions): GuardedSessionStart {
  const { generations, binding } = options;
  const attempt = options.attempt ?? null;
  const generation = generations.next();

  const current = (): boolean => generations.isCurrent(generation);
  const live = (): boolean => {
    /* The attempt is asked FIRST and always: its owner check is what ends a
       standalone session at a switch that reached no listener. */
    if (attempt && !attempt.mayStartTurn()) return false;
    return current() && binding.state() === 'current';
  };

  const handle: StartHandle = {
    letGo: () => !current(),
    onLetGo: (release) => generations.whenStale(generation, release),
  };

  return {
    generation,
    binding,
    current,
    live,
    handle,
    async step<T>(pending: Promise<T>, release?: (value: T) => void) {
      let value: T;
      try {
        value = await pending;
      } catch (error) {
        if (!live()) return null;
        throw error;
      }
      if (live()) return { value };
      try {
        release?.(value);
      } catch {
        /* letting go must never turn a no into a failure */
      }
      return null;
    },
  };
}
