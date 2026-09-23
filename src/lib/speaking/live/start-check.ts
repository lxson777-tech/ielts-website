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

   Pure: no browser globals, so tests/live-start-cancel.test.ts uses it as is. */

/** Asked by the setup before each step that could start a voice session.
    True: go on. */
export type MayContinue = () => boolean;

/** What a session-opening function rejects with when its MayContinue said no
    before the voice session was created (or, on the paid path, before it was
    used). Everything the setup had made has been let go of and nothing more
    was sent. Never shown to a student. */
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
