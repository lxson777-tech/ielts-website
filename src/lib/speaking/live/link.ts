/* The provider-neutral surface LiveExaminer.tsx drives. It hides which of
   the two live voice providers (Gemini or OpenAI's GPT-Live-1) is actually
   running behind one ExaminerLink interface, so the component only ever
   deals with transcript turns, an output/mic level pair for the talking
   orb, start/close, and now typed stage-direction cues.

   fetchLiveConfig asks the session-broker endpoint which provider is live
   right now (an operator setting, not something the browser chooses) and
   whether that provider requires a signed-in student, then openExaminerLink
   wires up whichever provider that turns out to be:
   - gemini: ExaminerPlayback + MicCapture + ExaminerSession, exactly as
     LiveExaminer.tsx did before this file existed. Stage directions are
     still sent directly over the Gemini WebSocket (Gemini isn't gated by
     the sideband/sign-in changes below — it stays the free, unauthenticated
     rollback path).
   - openai: connectWebRtc + OpenAiLiveSession for the protocol, plus
     RemoteAudioOutput (examiner audio) and StreamLevelMeter (mic level)
     for the orb. This path requires a Supabase access token (paid usage):
     opening it fails fast if the caller has none. Stage directions never go
     straight to OpenAI from here — direct(cue) posts the cue to our own
     Worker's /direct endpoint, which validates the transition against the
     session's stage and injects the text itself through the trusted
     sideband. A delegation event from OpenAI is answered the same way,
     wired through onDelegation.

   ASKED INSIDE THE SETUP (finding R2D-01). openExaminerLink passes the
   caller's optional `mayContinue` (./start-check.ts) through to both setups:
   ExaminerSession.connect asks it before its token request and immediately
   before the Gemini socket; connectWebRtc before it makes anything and
   immediately before the request that creates the paid voice session. Here
   it is asked once more, when that request has been answered. The session
   exists then and its first seconds are billed whatever happens, but if the
   start was let go while the request was out, the link does not go on to
   use it: the peer is closed at once, before any audio can flow, and the
   session is ended at the Worker exactly as close() ends it, so it stops
   counting against the student's limits. A no anywhere rejects with
   LiveStartCancelled once the audio pieces made here are stopped.

   THE SCREEN CAN REACH A START STILL UNDER WAY (finding R2E-01, Codex
   inspection of c4a7793). The link used to be closable only once it had been
   returned, and the last wait (OpenAiLiveSession.start, up to twenty
   seconds for the session to begin) came AFTER the answer had been applied
   and the examiner's audio had started playing. A switch or an unmount in
   that wait left the connection and its audio running until the wait ran
   out, and a timeout or an error there closed the connection without
   ending the session at the Worker. Now openExaminerLink also takes the
   screen's StartHandle (./start-check.ts) and hands it, with the question,
   to every step. A pull releases everything made so far there and then:
   the peer connection and its data channel (or the Gemini socket), the
   playback, the level meters, and a paid session already created is ended
   at the Worker. The audio pieces are stopped at once and once more when a
   start of theirs still under way finishes, so nothing such a start makes
   after the pull is left running. A remote track that arrives after a let-go
   is stopped and never played. And EVERY failure after the paid session was
   created (a let-go, the start timing out, an error from the service, the
   connection closing) ends it at the Worker, exactly as close() does, so no
   failure leaves a paid session counting against the student's limits. The
   handle is let go of when the link is returned: from then on the screen's
   own teardown closes it through close(), as before. */

import type { LiveMode, LiveProvider, SessionPlanRequest } from './instructions';
import type { TranscriptTurn } from './session';
import { ExaminerSession } from './session';
import { ExaminerPlayback, MicCapture, RemoteAudioOutput, StreamLevelMeter } from './audio';
import { OpenAiLiveSession, connectWebRtc } from './openai-session';
import type { DirectorCue } from './cues';
import { cueText } from './cues';
import { watchStart, type MayContinue, type StartHandle } from './start-check';

export {
  LiveStartCancelled,
  isLiveStartCancelled,
  startHandle,
  type MayContinue,
  type StartHandle,
} from './start-check';

export interface LiveConfig {
  provider: LiveProvider;
  model: string;
  backendModel: string | null;
  /** True when this provider requires a signed-in student (openai). */
  requiresSignIn: boolean;
}

/** Normalises the base URL (which may or may not have a trailing slash) into
    one of the three endpoints the Worker contract defines. Used for every
    request to the session-broker Worker, so a stray trailing slash on
    PUBLIC_LIVE_EXAMINER_URL never produces a double slash or a missing one. */
export function liveEndpoint(base: string, path: '' | 'direct' | 'end'): string {
  const trimmed = base.replace(/\/+$/, '');
  return path === '' ? `${trimmed}/` : `${trimmed}/${path}`;
}

/** GETs the session-broker endpoint to find out which provider is live.
    Throws a plain-language Error if the endpoint is unreachable, returns a
    non-OK status, or reports something other than 'gemini' / 'openai'. */
export async function fetchLiveConfig(endpoint: string): Promise<LiveConfig> {
  let resp: Response;
  try {
    resp = await fetch(liveEndpoint(endpoint, ''));
  } catch {
    throw new Error('Could not reach the examiner service.');
  }
  if (!resp.ok) {
    throw new Error(`Examiner service error (${resp.status}).`);
  }
  let data: unknown;
  try {
    data = await resp.json();
  } catch {
    throw new Error('The examiner service sent back something unreadable.');
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('The examiner service sent back an unexpected response.');
  }
  const record = data as Record<string, unknown>;
  const provider = record.provider;
  if (provider !== 'gemini' && provider !== 'openai') {
    throw new Error('The examiner service reported an unknown provider.');
  }
  const model = typeof record.model === 'string' ? record.model : '';
  const backendModel = typeof record.backendModel === 'string' ? record.backendModel : null;
  const requiresSignIn = record.requiresSignIn === true;
  return { provider, model, backendModel, requiresSignIn };
}

export interface ExaminerLinkCallbacks {
  onTranscript(turns: TranscriptTurn[]): void;
  onClosed(reason: string, wasClean: boolean): void;
  onError(message: string): void;
}

export interface ExaminerLink {
  readonly provider: LiveProvider;
  /** Sends a typed stage-direction cue. Never rejects — the exam clock must
      keep running even if the cue could not be delivered; failures surface
      through the link's onError callback (or, for a stale/duplicate cue,
      are just logged). */
  direct(cue: DirectorCue): Promise<void>;
  transcript(): TranscriptTurn[];
  /** Examiner audio currently playing. */
  isSpeaking(): boolean;
  /** 0-1, for the orb. */
  outputLevel(): number;
  /** 0-1. */
  micLevel(): number;
  setMicMuted(muted: boolean): void;
  /** Resolves when examiner audio has finished playing (bounded, max ~8s). */
  waitUntilQuiet(): Promise<void>;
  /** Graceful close + teardown of the provider connection and audio nodes.
      Must NOT stop the mic stream's tracks (the component owns the stream).
      Idempotent. */
  close(): Promise<void>;
}

export interface OpenExaminerLinkOptions {
  endpoint: string;
  config: LiveConfig;
  stream: MediaStream;
  plan: SessionPlanRequest;
  instruction: string;
  /** Which exam shape this session is (full test or one drill part). Needed
      to translate a DirectorCue into the right wording (Gemini) or to pass
      through untouched to the Worker (OpenAI, which does its own wording). */
  mode: LiveMode;
  /** Supabase access token; required for openai, ignored for gemini. */
  accessToken: string | null;
  cb: ExaminerLinkCallbacks;
  /** The caller's "may I continue" check, asked inside the setup right
      before the paid session request and right before the Gemini socket
      (R2D-01), and before the answer is applied and in every callback that
      could start something (R2E-01). A no rejects with LiveStartCancelled.
      Not given: never asked. */
  mayContinue?: MayContinue;
  /** The screen's side of this start (R2E-01): pulled the moment the screen
      lets go of it, which releases everything the setup has made at once
      and rejects with LiveStartCancelled. Listened to only until the link is
      returned. Not given: nothing but the question can stop the setup. */
  handle?: StartHandle;
}

export async function openExaminerLink(opts: OpenExaminerLinkOptions): Promise<ExaminerLink> {
  if (opts.config.provider === 'gemini') return openGeminiLink(opts);
  return openOpenAiLink(opts);
}

/** An audio piece the setup may have to let go of while it is still
    starting. */
interface AudioPiece {
  stop(): Promise<void>;
}

/** Stops an audio piece now, and once more when a start of it that is still
    under way has finished, so nothing that start makes after this moment is
    left running (R2E-01). Resolves when the first stop has; never rejects,
    and never waits for the start, which may never finish. */
function stopNowAndAfterStart(piece: AudioPiece, starting: Promise<unknown> | null): Promise<void> {
  if (starting) {
    void starting.then(
      () => piece.stop(),
      () => piece.stop(),
    ).catch(() => {});
  }
  return piece.stop().catch(() => {});
}

/** Stops every track of a stream that a start let go of was handed. */
function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* already ended */
    }
  }
}

async function openGeminiLink(opts: OpenExaminerLinkOptions): Promise<ExaminerLink> {
  const watch = watchStart(opts.mayContinue, opts.handle);
  const playback = new ExaminerPlayback();
  const mic = new MicCapture();
  let session: ExaminerSession | null = null;
  let playbackStarting: Promise<void> | null = null;
  let micStarting: Promise<void> | null = null;
  let releasing: Promise<void> | null = null;

  /* R2E-01: everything made so far, released at once on a pull or a
     failure. The socket is ExaminerSession.connect's own, and it closes it
     itself on the same pull. */
  const release = (): Promise<void> => {
    releasing ??= Promise.all([
      stopNowAndAfterStart(mic, micStarting),
      stopNowAndAfterStart(playback, playbackStarting),
    ]).then(() => {});
    return releasing;
  };
  watch.onLetGo(() => {
    void release();
  });

  try {
    watch.check();
    playbackStarting = playback.start();
    await watch.wait(playbackStarting);
    micStarting = mic.start(opts.stream, (chunk) => session?.sendAudioChunk(chunk));
    await watch.wait(micStarting);
    session = await ExaminerSession.connect(
      liveEndpoint(opts.endpoint, ''),
      opts.instruction,
      {
        onAudio: (chunk) => playback.enqueue(chunk),
        onInterrupted: () => playback.flush(),
        onTranscript: opts.cb.onTranscript,
        onClosed: opts.cb.onClosed,
        onError: opts.cb.onError,
      },
      opts.mayContinue,
      { handle: opts.handle },
    );
  } catch (err) {
    watch.done();
    await release();
    throw err;
  }
  watch.done();

  if (!session) throw new Error('The examiner session did not start.');
  const activeSession = session;
  let closed = false;

  return {
    provider: 'gemini',
    async direct(cue) {
      // Gemini never delegates (no backend concept on that path); every
      // other cue is delivered as the same [DIRECTOR] user turn this path
      // has always used.
      if (cue.type === 'delegation') return;
      activeSession.sendDirectorNote(cueText(opts.mode, cue));
    },
    transcript() {
      return activeSession.transcript();
    },
    isSpeaking() {
      return playback.isSpeaking();
    },
    outputLevel() {
      return playback.level();
    },
    micLevel() {
      return mic.level();
    },
    setMicMuted(muted) {
      mic.muted = muted;
    },
    waitUntilQuiet() {
      return playback.waitUntilDone();
    },
    async close() {
      if (closed) return;
      closed = true;
      activeSession.close();
      await mic.stop();
      await playback.stop();
    },
  };
}

async function openOpenAiLink(opts: OpenExaminerLinkOptions): Promise<ExaminerLink> {
  // A paid session requires a signed-in student. Fail before touching the
  // mic, the peer connection, or anything else that would need tearing down.
  if (!opts.accessToken) throw new Error('Sign in to use the live examiner.');
  const accessToken = opts.accessToken;
  const base = opts.endpoint;

  const watch = watchStart(opts.mayContinue, opts.handle);
  const output = new RemoteAudioOutput();
  const micMeter = new StreamLevelMeter();
  let peer: Awaited<ReturnType<typeof connectWebRtc>> | null = null;
  let session: OpenAiLiveSession | null = null;
  let meterStarting: Promise<void> | null = null;
  let playbackStarting: Promise<void> | null = null;
  let released = false;
  let releasing: Promise<void> | null = null;
  /** Sessions already ended at the Worker, so none is ended twice. */
  const ended = new Set<string>();

  /** Posts one cue to the Worker's /direct endpoint. Never throws: a stale
      transition (409) is logged and swallowed, anything else surfaces
      through onError, and either way the exam clock keeps running. */
  async function sendCue(cue: DirectorCue): Promise<void> {
    if (!session) return;
    let resp: Response;
    try {
      resp = await fetch(liveEndpoint(base, 'direct'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ sessionId: session.sessionId, cue }),
      });
    } catch {
      opts.cb.onError('Could not send the stage direction (network error).');
      return;
    }
    if (resp.ok) return;
    if (resp.status === 409) {
      console.warn("Stage direction not allowed for the session's current stage:", cue);
      return;
    }
    const body = (await resp.json().catch(() => null)) as { error?: string } | null;
    opts.cb.onError(body?.error ?? `Could not send the stage direction (${resp.status})`);
  }

  /** Tells our Worker the session is over, so its record stops counting
      against the student's limits. Best effort, fire and forget: never
      blocks the UI on a network hiccup. Once per session. */
  function endAtWorker(sessionId: string): void {
    if (!sessionId || ended.has(sessionId)) return;
    ended.add(sessionId);
    fetch(liveEndpoint(base, 'end'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {
      /* best effort */
    });
  }

  /** R2E-01: lets go of everything this setup has made, at once, on a pull
      or on ANY failure: the connection (its data channel and peer), the
      playback and the meter (now, and again once a start of theirs still
      under way has finished), and a paid session already created is ended
      at the Worker. A session created by a request the setup stopped
      waiting for is ended by connectWebRtc's onSessionUnused when it
      answers. Safe to call more than once. */
  const release = (): Promise<void> => {
    if (releasing) return releasing;
    released = true;
    if (peer) {
      peer.transport.close();
      endAtWorker(peer.sessionId);
    }
    releasing = Promise.all([
      stopNowAndAfterStart(output, playbackStarting),
      stopNowAndAfterStart(micMeter, meterStarting),
    ]).then(() => {});
    return releasing;
  };
  watch.onLetGo(() => {
    void release();
  });

  try {
    watch.check();
    meterStarting = micMeter.start(opts.stream);
    await watch.wait(meterStarting);
    peer = await connectWebRtc({
      endpoint: liveEndpoint(base, ''),
      stream: opts.stream,
      plan: opts.plan,
      accessToken,
      onRemoteStream: (stream) => {
        /* R2E-01: the examiner's audio arrives while the setup is still
           under way. A start that was let go plays none of it. */
        if (released || !watch.going()) {
          stopTracks(stream);
          return;
        }
        playbackStarting = output.start(stream).catch(() => {});
      },
      mayContinue: opts.mayContinue,
      handle: opts.handle,
      onSessionUnused: endAtWorker,
    });
    /* The paid session exists now. If the start was let go while its
       request was out, do not use it: the catch below closes the peer, and
       the session is ended at the Worker. */
    watch.check();
    session = await OpenAiLiveSession.start(
      peer.transport,
      {
        onTranscript: opts.cb.onTranscript,
        onClosed: opts.cb.onClosed,
        onError: opts.cb.onError,
        onDelegation: (id) => {
          void sendCue({ type: 'delegation', delegationId: id });
        },
      },
      { mayContinue: opts.mayContinue, handle: opts.handle },
    );
  } catch (err) {
    /* Every failure after the session was created ends it at the Worker:
       a let-go, the start timing out, an error, the connection closing. */
    watch.done();
    await release();
    throw err;
  }
  watch.done();

  if (!session) throw new Error('The examiner session did not start.');
  const activeSession = session;
  let closed = false;

  return {
    provider: 'openai',
    direct(cue) {
      return sendCue(cue);
    },
    transcript() {
      return activeSession.transcript();
    },
    isSpeaking() {
      return output.isSpeaking();
    },
    outputLevel() {
      return output.level();
    },
    micLevel() {
      return micMeter.level();
    },
    setMicMuted(muted) {
      opts.stream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
      activeSession.setMicMuted(muted);
    },
    waitUntilQuiet() {
      return output.waitUntilDone();
    },
    async close() {
      if (closed) return;
      closed = true;
      const sessionId = activeSession.sessionId;
      await activeSession.close();
      await output.stop();
      await micMeter.stop();
      endAtWorker(sessionId);
    },
  };
}
