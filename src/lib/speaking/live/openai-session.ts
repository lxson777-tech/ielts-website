/* GPT-Live-1 session logic, kept separate from the WebRTC plumbing so it can
   be unit tested in Node with a fake transport (no DOM, no WebRTC, no
   browser globals in this file at all).

   OpenAiLiveSession owns the data-channel protocol: waiting for the session
   to start, turning transcript delta events into the same TranscriptTurn
   shape the Gemini path produces, reporting the one delegation event OpenAI
   sends (there is no backend, so the caller tells it to keep going) via
   onDelegation, tracking usage seconds, and running a bounded graceful
   close.

   This file NEVER sends an instruction or thinking append to OpenAI. Stage
   directions ([DIRECTOR] cues) and the delegation reply both now go through
   our own Worker's /direct endpoint instead (see link.ts), which validates
   the requested stage transition server-side and injects the text itself
   through OpenAI's trusted sideband. The Worker also restricts the data
   channel so an append coming from the browser is rejected by OpenAI — this
   file has no way to send one even if it wanted to.

   connectWebRtc is the only piece that touches RTCPeerConnection: it does
   the offer/answer exchange with our own Worker (never OpenAI directly from
   here) and hands back a LiveEventTransport for OpenAiLiveSession to drive.

   ASKED BEFORE THE PAID REQUEST (finding R2D-01, inside the setup).
   connectWebRtc takes the examiner's own "may I continue" check
   (./start-check.ts says why it is a function) and asks it twice: before
   anything is made, since the caller's own audio set-up can wait, and
   immediately before the request that creates the paid voice session, after
   the connection has prepared itself (which can take up to ten seconds). A
   no rejects with LiveStartCancelled after closing the data channel and the
   peer connection, which stops the microphone track it was given from being
   sent (the track itself belongs to the caller, who releases it). The
   request is never sent. */

import type { TranscriptTurn } from './session';
import type { SessionPlanRequest } from './instructions';
import { continueOrCancel, type MayContinue } from './start-check';

export interface LiveServerEvent {
  type: string;
  [k: string]: unknown;
}

export interface LiveEventTransport {
  send(event: Record<string, unknown>): void;
  setHandlers(h: { onEvent(ev: LiveServerEvent): void; onClose(): void }): void;
  /** Hard teardown (data channel + peer). Idempotent. */
  close(): void;
}

export interface OpenAiSessionCallbacks {
  onTranscript(turns: TranscriptTurn[]): void;
  /** Only when NOT closed by us; fires at most once. */
  onClosed(reason: string, wasClean: boolean): void;
  onError(message: string): void;
  /** OpenAI created a delegation and expects a reply (there is no backend
      here, so the caller should ask our Worker's /direct endpoint to send a
      `delegation` cue back with this id). Fires only when the delegation
      targets the client (or names no target at all). */
  onDelegation?(delegationId: string): void;
}

export interface OpenAiSessionOptions {
  startTimeoutMs?: number;
  closeTimeoutMs?: number;
  turnGapMs?: number;
}

interface CloseResult {
  finalized: boolean;
  reason?: string;
  usageSeconds?: number;
}

const DEFAULT_START_TIMEOUT_MS = 20000;
const DEFAULT_CLOSE_TIMEOUT_MS = 5000;
const DEFAULT_TURN_GAP_MS = 1500;

export class OpenAiLiveSession {
  private transport: LiveEventTransport;
  private cb: OpenAiSessionCallbacks;
  private closeTimeoutMs: number;
  private turnGapMs: number;

  readonly sessionId: string;

  private turns: TranscriptTurn[] = [];
  private eventCounter = 0;
  private usageSecondsValue: number | null = null;

  private closedHandled = false;
  private closeRequested = false;
  private closePromise: Promise<CloseResult> | null = null;
  private pendingClose: { resolve: (v: CloseResult) => void; promise: Promise<CloseResult> } | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor(transport: LiveEventTransport, cb: OpenAiSessionCallbacks, sessionId: string, opts: OpenAiSessionOptions) {
    this.transport = transport;
    this.cb = cb;
    this.sessionId = sessionId;
    this.closeTimeoutMs = opts.closeTimeoutMs ?? DEFAULT_CLOSE_TIMEOUT_MS;
    this.turnGapMs = opts.turnGapMs ?? DEFAULT_TURN_GAP_MS;
  }

  /** Resolves on session.started; rejects (and calls transport.close()) on:
      an error event before start, the transport closing before start, or
      startTimeoutMs elapsing. */
  static start(
    transport: LiveEventTransport,
    cb: OpenAiSessionCallbacks,
    opts: OpenAiSessionOptions = {},
  ): Promise<OpenAiLiveSession> {
    const startTimeoutMs = opts.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const clearTimer = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };

      const settleReject = (message: string) => {
        if (settled) return;
        settled = true;
        clearTimer();
        transport.close();
        reject(new Error(message));
      };

      timer = setTimeout(() => {
        settleReject('Timed out waiting for the examiner session to start.');
      }, startTimeoutMs);

      transport.setHandlers({
        onEvent(ev) {
          if (settled) return;
          if (ev.type === 'error') {
            const error = ev.error as { message?: string } | undefined;
            settleReject(error?.message ?? 'The examiner service reported an error before the session started.');
            return;
          }
          if (ev.type === 'session.started') {
            const session = ev.session as { id?: string } | undefined;
            const id = typeof session?.id === 'string' ? session.id : '';
            settled = true;
            clearTimer();
            const instance = new OpenAiLiveSession(transport, cb, id, opts);
            instance.attach();
            resolve(instance);
            return;
          }
          // Anything else before start (info, response.event, ...) is ignored.
        },
        onClose() {
          settleReject('The connection closed before the examiner session started.');
        },
      });
    });
  }

  /** Switches the transport over to steady-state event handling once the
      session has started. */
  private attach(): void {
    this.transport.setHandlers({
      onEvent: (ev) => this.handleEvent(ev),
      onClose: () => this.handleTransportClose(),
    });
  }

  private nextEventId(): string {
    this.eventCounter += 1;
    return `evt_${this.eventCounter}`;
  }

  private handleEvent(ev: LiveServerEvent): void {
    switch (ev.type) {
      case 'session.input_transcript.delta':
        this.appendDelta('candidate', ev);
        return;
      case 'session.output_transcript.delta':
        this.appendDelta('examiner', ev);
        return;
      case 'session.delegation.created': {
        const delegation = ev.delegation as { id?: string; target?: string } | undefined;
        if (delegation && typeof delegation.id === 'string' && (delegation.target === undefined || delegation.target === 'client')) {
          this.cb.onDelegation?.(delegation.id);
        }
        return;
      }
      case 'error': {
        const error = ev.error as { message?: string } | undefined;
        this.cb.onError(error?.message ?? 'The examiner service reported an error.');
        return;
      }
      case 'session.usage.updated': {
        const usage = ev.usage as { seconds?: number } | undefined;
        if (typeof usage?.seconds === 'number') this.usageSecondsValue = usage.seconds;
        return;
      }
      case 'session.closed': {
        const usage = ev.usage as { seconds?: number } | undefined;
        if (typeof usage?.seconds === 'number') this.usageSecondsValue = usage.seconds;
        const reason = typeof ev.reason === 'string' ? ev.reason : 'unknown';
        this.finalizeClosed(reason);
        return;
      }
      default:
        // session.instructions.appended, session.thinking.appended,
        // session.input_audio.muted/unmuted, info, response.event, ...
        return;
    }
  }

  /** A delta joins the running transcript ONLY as a continuation of the last
      turn overall (never "the last turn of this role", which corrupted
      ordering: candidate, examiner, candidate within the gap window used to
      collapse into [combined candidate, examiner] and lose the interruption).
      It joins that last turn only when the role matches and, when both sides
      carry a timestamp, the gap between them is within turnGapMs; otherwise
      it starts a new turn, so chronological order — including interruptions
      — is always preserved. */
  private appendDelta(role: TranscriptTurn['role'], ev: LiveServerEvent): void {
    const delta = typeof ev.delta === 'string' ? ev.delta : '';
    if (!delta) return;
    const startMs = typeof ev.start_ms === 'number' ? ev.start_ms : undefined;
    const endMs = typeof ev.end_ms === 'number' ? ev.end_ms : undefined;

    const last = this.turns[this.turns.length - 1];
    let joinsLast = false;
    if (last && last.role === role) {
      joinsLast = last.endMs === undefined || startMs === undefined || startMs - last.endMs <= this.turnGapMs;
    }

    if (joinsLast && last) {
      last.text += delta;
      if (endMs !== undefined) last.endMs = endMs;
    } else {
      this.turns.push({ role, text: delta, startMs, endMs: endMs ?? startMs });
    }
    this.cb.onTranscript(this.turns);
  }

  private clearCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private finalizeClosed(reason: string): void {
    if (this.pendingClose) {
      const pending = this.pendingClose;
      this.pendingClose = null;
      this.clearCloseTimer();
      this.closedHandled = true;
      this.transport.close();
      pending.resolve({ finalized: true, reason, usageSeconds: this.usageSecondsValue ?? undefined });
      return;
    }
    if (this.closedHandled) return;
    this.closedHandled = true;
    const wasClean = reason === 'close_requested' || reason === 'remote_hangup';
    this.transport.close();
    this.cb.onClosed(reason, wasClean);
  }

  private handleTransportClose(): void {
    if (this.pendingClose) {
      const pending = this.pendingClose;
      this.pendingClose = null;
      this.clearCloseTimer();
      this.closedHandled = true;
      this.transport.close();
      pending.resolve({ finalized: false });
      return;
    }
    if (this.closedHandled || this.closeRequested) return;
    this.closedHandled = true;
    // The data channel died under us: release the peer connection too, or
    // the browser keeps the mic streaming into a dead session.
    this.transport.close();
    this.cb.onClosed('connection lost', false);
  }

  usageSeconds(): number | null {
    return this.usageSecondsValue;
  }

  setMicMuted(muted: boolean): void {
    if (this.closeRequested || this.closedHandled) return;
    this.transport.send({
      type: muted ? 'session.input_audio.mute' : 'session.input_audio.unmute',
      event_id: this.nextEventId(),
    });
  }

  transcript(): TranscriptTurn[] {
    return this.turns;
  }

  /** Sends session.close, waits for session.closed up to closeTimeoutMs,
      then tears the transport down. Idempotent: a second call returns the
      same promise. After close() starts, no further sends go out. */
  close(): Promise<CloseResult> {
    if (this.closePromise) return this.closePromise;
    if (this.closedHandled) return Promise.resolve({ finalized: false });

    this.closeRequested = true;
    let resolveFn!: (v: CloseResult) => void;
    const promise = new Promise<CloseResult>((resolve) => {
      resolveFn = resolve;
    });
    this.pendingClose = { resolve: resolveFn, promise };
    this.closePromise = promise;

    this.transport.send({ type: 'session.close' });

    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      if (!this.pendingClose) return;
      const pending = this.pendingClose;
      this.pendingClose = null;
      this.closedHandled = true;
      this.transport.close();
      pending.resolve({ finalized: false });
    }, this.closeTimeoutMs);

    return promise;
  }
}

export interface WebRtcConnectOptions {
  endpoint: string;
  stream: MediaStream;
  plan: SessionPlanRequest;
  /** Supabase access token for a paid (OpenAI) session; null when the
      provider doesn't require sign-in. Sent as `Authorization: Bearer
      <token>` so the Worker can verify the student and enforce limits. */
  accessToken: string | null;
  onRemoteStream(stream: MediaStream): void;
  iceTimeoutMs?: number;
  /** Asked before anything is made and immediately before the request that
      creates the paid voice session (R2D-01). A no rejects with
      LiveStartCancelled and sends nothing. Not given: never asked. */
  mayContinue?: MayContinue;
}

function waitForIceGatheringComplete(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onChange = () => {
      if (pc.iceGatheringState !== 'complete') return;
      finish();
    };
    const finish = () => {
      if (done) return;
      done = true;
      pc.removeEventListener('icegatheringstatechange', onChange);
      if (timer) clearTimeout(timer);
      resolve();
    };
    pc.addEventListener('icegatheringstatechange', onChange);
    timer = setTimeout(finish, timeoutMs);
  });
}

/** Opens the WebRTC connection to our own session-broker Worker (never to
    OpenAI directly from the browser) and hands back a transport that
    OpenAiLiveSession can drive. Only this function touches WebRTC/DOM. */
export async function connectWebRtc(
  opts: WebRtcConnectOptions,
): Promise<{ transport: LiveEventTransport; sessionId: string; model: string; peer: RTCPeerConnection }> {
  const iceTimeoutMs = opts.iceTimeoutMs ?? 10000;
  continueOrCancel(opts.mayContinue);
  const pc = new RTCPeerConnection();
  let dc: RTCDataChannel | null = null;
  let handlers: { onEvent(ev: LiveServerEvent): void; onClose(): void } | null = null;
  let torndown = false;

  const teardown = () => {
    if (torndown) return;
    torndown = true;
    try {
      dc?.close();
    } catch {
      /* already closed */
    }
    try {
      pc.close();
    } catch {
      /* already closed */
    }
  };

  try {
    pc.addEventListener('track', (e) => {
      opts.onRemoteStream(new MediaStream([e.track]));
    });

    for (const track of opts.stream.getAudioTracks()) {
      pc.addTrack(track, opts.stream);
    }

    dc = pc.createDataChannel('oai-events');
    dc.addEventListener('message', (e: MessageEvent) => {
      if (!handlers) return;
      if (typeof e.data !== 'string') return;
      let parsed: LiveServerEvent;
      try {
        parsed = JSON.parse(e.data) as LiveServerEvent;
      } catch {
        return;
      }
      handlers.onEvent(parsed);
    });
    dc.addEventListener('close', () => {
      handlers?.onClose();
    });

    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        handlers?.onClose();
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc, iceTimeoutMs);

    const sdp = pc.localDescription?.sdp;
    if (!sdp) throw new Error('Could not prepare the connection offer.');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;

    /* The preparation above can take up to iceTimeoutMs. Ask again,
       immediately before the request that creates the paid voice session:
       a no sends nothing, and the catch below closes the data channel and
       the peer connection. */
    continueOrCancel(opts.mayContinue);
    const resp = await fetch(opts.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sdp, plan: opts.plan }),
    });
    if (!resp.ok) {
      const body = (await resp.json().catch(() => null)) as { error?: string } | null;
      // A 400 here means the Worker rejected the plan, which in practice only
      // happens when the site ships a question bank the deployed Worker does
      // not have yet (see "Deploying after a question-bank change" in the
      // Worker README). The Worker's message names internal ids, so it is
      // never shown to a student.
      if (resp.status === 400) {
        throw new Error('The examiner service is being updated. Please try again in a few minutes.');
      }
      throw new Error(body?.error ?? `Session service error (${resp.status})`);
    }
    const data = (await resp.json()) as {
      provider: string;
      session: { id: string };
      transport: { type: string; sdp: string };
      model: string;
    };

    await pc.setRemoteDescription({ type: 'answer', sdp: data.transport.sdp });

    const transport: LiveEventTransport = {
      send(event) {
        if (dc && dc.readyState === 'open') dc.send(JSON.stringify(event));
      },
      setHandlers(h) {
        handlers = h;
      },
      close() {
        teardown();
      },
    };

    return { transport, sessionId: data.session.id, model: data.model, peer: pc };
  } catch (err) {
    teardown();
    throw err;
  }
}
