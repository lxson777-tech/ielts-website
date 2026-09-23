/* "May I continue?", asked inside the voice session setup (finding R2D-01
   of the Codex inspection of 1701b97, the part inside the connection setup).

   WHY THIS FILE EXISTS
   The live examiner's start (src/components/LiveExaminer.tsx) is numbered
   and bound to the student who pressed Start (guardSessionStart in
   src/components/speaking-attempt-owner.ts), and it asks after each of its
   own waits whether it may go on. The waits INSIDE the setup were out of its
   sight. On the paid path (./openai-session.ts) the connection prepares
   itself for up to ten seconds after the sign-in token has been read, then
   sends the request that creates the paid voice session; on the Gemini
   rollback (./session.ts) an ephemeral token is requested, then the voice
   socket is opened. An account change or an unmount inside those windows
   still let the request (or the socket) out, and the session was closed
   only once it had come up: a few seconds of a paid session nobody wanted.

   WHAT REPLACES IT
   The session-opening functions take the examiner's own question as an
   optional `mayContinue` and ask it immediately before the request that
   creates the paid voice session, immediately before the Gemini socket, and
   at the other points of the setup where more than a moment can have passed.
   A no means: let go of whatever the setup has made so far (the peer
   connection and its data channel, the audio pieces), send nothing more, and
   reject with LiveStartCancelled. The examiner's guard swallows that
   rejection as it swallows any failure of a start that has been let go, so
   nothing is shown and nothing more is started.

   WHY A FUNCTION AND NOT AN AbortSignal
   The examiner's guard is ASKED: asking runs the owner comparison there and
   then, so a change of account that reached no listener is still caught. An
   AbortSignal has to be aborted by somebody at the moment of the change,
   which is exactly the notification that may never arrive, and the guard
   already is a function, so nothing has to be adapted to pass it through.

   AND A HANDLE AS WELL (finding R2E-01, Codex inspection of c4a7793)
   A question is only answered when somebody asks it, and the setup asked
   only between its steps. Once the paid session request had been ANSWERED
   the setup applied the answer before it asked again (so the examiner's
   audio could start playing), and while it then waited up to twenty seconds
   for the session to start, nothing could reach it: the screen hands the
   connection its teardown only once the setup has finished. A switch or an
   unmount in that wait left the connection, and its audio, running until
   the wait ran out.

   So the setup now takes a StartHandle too: the screen's own side of the
   start, which the screen pulls the moment it lets go of it (its unmount,
   the page changing hands, the student's own Back, a newer start). A pull
   reaches the setup at once, wherever it is waiting: the peer connection,
   its data channel, a socket and the audio pieces are released there and
   then, the wait rejects with LiveStartCancelled, and a session that had
   already been created is ended at the Worker. The question stays exactly
   as it was, and every step and every callback asks BOTH: the handle for a
   let-go that reached the screen, the question for one that did not.

   watchStart puts the two together for one setup, and is what the setup
   functions use.

   Pure: no browser globals, so tests/live-start-cancel.test.ts uses it as is. */

/** Asked by the setup before each step that could start a voice session.
    True: go on. */
export type MayContinue = () => boolean;

/** What a session-opening function rejects with when its MayContinue said no,
    or its StartHandle was pulled, before the voice session was created (or,
    on the paid path, before it was used). Everything the setup had made has
    been let go of, nothing more was sent, and a paid session already created
    has been ended at the Worker. Never shown to a student. */
export class LiveStartCancelled extends Error {
  constructor() {
    super('The examiner session was not opened: its start was let go.');
    this.name = 'LiveStartCancelled';
  }
}

export function isLiveStartCancelled(error: unknown): error is LiveStartCancelled {
  return error instanceof LiveStartCancelled || (error instanceof Error && error.name === 'LiveStartCancelled');
}

/** The answer to the question. No question given: yes, so a caller that
    passes none keeps the old behaviour. A question that fails counts as a
    no: when in doubt, no paid session is opened. */
export function mayGoOn(mayContinue: MayContinue | undefined): boolean {
  if (!mayContinue) return true;
  try {
    return mayContinue() === true;
  } catch {
    return false;
  }
}

/** Throws LiveStartCancelled when the answer is no. */
export function continueOrCancel(mayContinue: MayContinue | undefined): void {
  if (!mayGoOn(mayContinue)) throw new LiveStartCancelled();
}

/* ── The handle (finding R2E-01) ──────────────────────────────────────── */

/** The screen's side of a start: pulled by the screen itself the moment it
    lets go of the start. The examiner's own comes from its start numbers
    (guardSessionStart in src/components/speaking-attempt-owner.ts), so every
    teardown that moves the number on pulls it. */
export interface StartHandle {
  /** Has the screen let go of this start? */
  letGo(): boolean;
  /** Runs `release` once, the moment the screen lets go (at once when it
      already has). Returns a function that takes it back, for a setup that
      has finished and handed its connection over. */
  onLetGo(release: () => void): () => void;
}

/** A handle pulled by hand: for a caller with no start numbers of its own,
    and for the tests. */
export function startHandle(): StartHandle & { pull(): void } {
  let pulled = false;
  const releases = new Set<() => void>();
  return {
    letGo: () => pulled,
    onLetGo(release) {
      if (pulled) {
        runRelease(release);
        return () => {};
      }
      releases.add(release);
      return () => {
        releases.delete(release);
      };
    },
    pull() {
      if (pulled) return;
      pulled = true;
      const waiting = [...releases];
      releases.clear();
      waiting.forEach(runRelease);
    },
  };
}

/** Letting go must never throw into whoever pulled. */
function runRelease(release: () => void): void {
  try {
    release();
  } catch {
    /* a release that failed has nothing more to let go of */
  }
}

/** One setup's view of its start: the question and the handle together. */
export interface StartWatch {
  /** May the setup go on? No once the handle has been pulled, or when the
      question says no. Asking runs the question. */
  going(): boolean;
  /** Throws LiveStartCancelled on a no. */
  check(): void;
  /** Waits for `pending`, but rejects with LiveStartCancelled the moment the
      handle is pulled, without waiting for it. A `pending` that fails after
      that is swallowed: nobody is waiting for it any more. */
  wait<T>(pending: Promise<T>): Promise<T>;
  /** Runs `release` the moment the handle is pulled (at once when it
      already has been), while the setup is still under way. */
  onLetGo(release: () => void): void;
  /** The setup is over (handed over, or failed): the handle is no longer
      listened to, and a later pull releases nothing of this setup. */
  done(): void;
}

export function watchStart(mayContinue?: MayContinue, handle?: StartHandle): StartWatch {
  let pulled = false;
  let finished = false;
  const releases: Array<() => void> = [];
  const waiters = new Set<() => void>();

  const onPull = (): void => {
    if (finished || pulled) return;
    pulled = true;
    /* What the setup made is released FIRST, so whatever resumes after the
       rejection below finds it closed already. */
    releases.splice(0).forEach(runRelease);
    const waiting = [...waiters];
    waiters.clear();
    waiting.forEach(runRelease);
  };
  const takeBack = handle ? handle.onLetGo(onPull) : () => {};

  const going = (): boolean => {
    if (pulled) return false;
    if (handle) {
      let letGo = true;
      try {
        letGo = handle.letGo();
      } catch {
        /* a handle that cannot say counts as pulled */
      }
      if (letGo) {
        onPull();
        return false;
      }
    }
    return mayGoOn(mayContinue);
  };

  return {
    going,
    check() {
      if (!going()) throw new LiveStartCancelled();
    },
    wait<T>(pending: Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const cancel = (): void => reject(new LiveStartCancelled());
        if (pulled) {
          pending.catch(() => {});
          cancel();
          return;
        }
        waiters.add(cancel);
        pending.then(
          (value) => {
            waiters.delete(cancel);
            resolve(value);
          },
          (error: unknown) => {
            waiters.delete(cancel);
            reject(error);
          },
        );
      });
    },
    onLetGo(release) {
      if (finished) return;
      if (pulled) {
        runRelease(release);
        return;
      }
      releases.push(release);
    },
    done() {
      if (finished) return;
      finished = true;
      releases.length = 0;
      waiters.clear();
      takeBack();
    },
  };
}
