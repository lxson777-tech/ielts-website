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
     wired through onDelegation. */

import type { LiveMode, LiveProvider, SessionPlanRequest } from './instructions';
import type { TranscriptTurn } from './session';
import { ExaminerSession } from './session';
import { ExaminerPlayback, MicCapture, RemoteAudioOutput, StreamLevelMeter } from './audio';
import { OpenAiLiveSession, connectWebRtc } from './openai-session';
import type { DirectorCue } from './cues';
import { cueText } from './cues';

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
}

export async function openExaminerLink(opts: OpenExaminerLinkOptions): Promise<ExaminerLink> {
  if (opts.config.provider === 'gemini') return openGeminiLink(opts);
  return openOpenAiLink(opts);
}

async function openGeminiLink(opts: OpenExaminerLinkOptions): Promise<ExaminerLink> {
  const playback = new ExaminerPlayback();
  const mic = new MicCapture();
  let session: ExaminerSession | null = null;

  try {
    await playback.start();
    await mic.start(opts.stream, (chunk) => session?.sendAudioChunk(chunk));
    session = await ExaminerSession.connect(liveEndpoint(opts.endpoint, ''), opts.instruction, {
      onAudio: (chunk) => playback.enqueue(chunk),
      onInterrupted: () => playback.flush(),
      onTranscript: opts.cb.onTranscript,
      onClosed: opts.cb.onClosed,
      onError: opts.cb.onError,
    });
  } catch (err) {
    await mic.stop();
    await playback.stop();
    throw err;
  }

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

  const output = new RemoteAudioOutput();
  const micMeter = new StreamLevelMeter();
  let peer: Awaited<ReturnType<typeof connectWebRtc>> | null = null;
  let session: OpenAiLiveSession | null = null;

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

  try {
    await micMeter.start(opts.stream);
    peer = await connectWebRtc({
      endpoint: liveEndpoint(base, ''),
      stream: opts.stream,
      plan: opts.plan,
      accessToken,
      onRemoteStream: (stream) => {
        void output.start(stream);
      },
    });
    session = await OpenAiLiveSession.start(peer.transport, {
      onTranscript: opts.cb.onTranscript,
      onClosed: opts.cb.onClosed,
      onError: opts.cb.onError,
      onDelegation: (id) => {
        void sendCue({ type: 'delegation', delegationId: id });
      },
    });
  } catch (err) {
    peer?.transport.close();
    await output.stop();
    await micMeter.stop();
    throw err;
  }

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
      // Best effort, fire and forget: never blocks the UI on a network hiccup.
      fetch(liveEndpoint(base, 'end'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {
        /* best effort */
      });
    },
  };
}
