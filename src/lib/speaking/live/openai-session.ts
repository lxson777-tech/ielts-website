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
   request is never sent.

   AND AFTER THE REQUEST IS ANSWERED (finding R2E-01, Codex inspection of
   c4a7793). The check above was the last one: an answer that came back
   after the start had been let go was still APPLIED (the remote answer set
   on the connection, so the examiner's audio track arrived and the caller
   began playing it), and OpenAiLiveSession.start then waited up to twenty
   seconds for the session to begin with nothing able to reach it. Now:
     - both functions also take the screen's StartHandle (./start-check.ts),
       which the screen pulls the moment it lets go. A pull closes the data
       channel and the peer connection there and then, wherever the setup is
       waiting, and the wait rejects with LiveStartCancelled at once instead
       of when the preparation, the request or the twenty seconds are over;
     - the check (handle and question) is asked immediately before the
       remote answer is applied, so a let-go answer is never applied and no
       audio can flow;
     - every callback that could start something asks first and, on a no,
       releases what it was handed and does nothing else: the track callback
       stops the track instead of passing it on to be played, the data
       channel's callbacks do nothing once the connection is torn down, and
       OpenAiLiveSession.start does not accept a session.started (or report
       an error) for a start that was let go;
     - a session the request created that this setup does not hand back (it
       was let go, or a later step failed) is reported through
       onSessionUnused, so the caller ends it at the Worker. When the let-go
       came while the request was out, the request is left to finish (it is
       never aborted: an aborted request could leave a session nobody knows
       the id of) and its session is reported the moment it answers. */

import type { TranscriptTurn } from './session';
import type { SessionPlanRequest } from './instructions';
import { LiveStartCancelled, watchStart, type MayContinue, type StartHandle } from './start-check';

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
  /** Asked before the start acts on anything the channel says (R2E-01). A
      no rejects with LiveStartCancelled and closes the transport. */
  mayContinue?: MayContinue;
  /** Pulled by the screen the moment it lets go: the transport is closed
      and the start rejects with LiveStartCancelled at once (R2E-01). */
  handle?: StartHandle;
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
      startTimeoutMs elapsing; and with LiveStartCancelled, at once, when the
      handle is pulled or the question says no (R2E-01). */
  static start(
    transport: LiveEventTransport,
    cb: OpenAiSessionCallbacks,
    opts: OpenAiSessionOptions = {},
  ): Promise<OpenAiLiveSession> {
    const startTimeoutMs = opts.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS;
    const watch = watchStart(opts.mayContinue, opts.handle);

    return new Promise((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const clearTimer = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };

      const settleReject = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimer();
        watch.done();
        transport.close();
        reject(error);
      };
      /* R2E-01: the start was let go. The transport is closed at once and
         nothing the channel says afterwards is acted on. */
      const cancelled = () => settleReject(new LiveStartCancelled());

      if (!watch.going()) {
        cancelled();
        return;
      }
      watch.onLetGo(cancelled);

      timer = setTimeout(() => {
        settleReject(new Error('Timed out waiting for the examiner session to start.'));
      }, startTimeoutMs);

      transport.setHandlers({
        onEvent(ev) {
          if (settled) return;
          /* Asked before anything the channel says is acted on: a
             session.started for a start that was let go is not accepted. */
          if (!watch.going()) {
            cancelled();
            return;
          }
          if (ev.type === 'error') {
            const error = ev.error as { message?: string } | undefined;
            settleReject(new Error(error?.message ?? 'The examiner service reported an error before the session started.'));
            return;
          }
          if (ev.type === 'session.started') {
            const session = ev.session as { id?: string } | undefined;
            const id = typeof session?.id === 'string' ? session.id : '';
            settled = true;
            clearTimer();
            watch.done();
            const instance = new OpenAiLiveSession(transport, cb, id, opts);
            instance.attach();
            resolve(instance);
            return;
          }
          // Anything else before start (info, response.event, ...) is ignored.
        },
        onClose() {
          if (!watch.going()) {
            cancelled();
            return;
          }
          settleReject(new Error('The connection closed before the examiner session started.'));
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
  /** Asked before anything is made, immediately before the request that
      creates the paid voice session (R2D-01), immediately before its answer
      is applied, and in the track callback (R2E-01). A no rejects with
      LiveStartCancelled and sends nothing. Not given: never asked. */
  mayContinue?: MayContinue;
  /** Pulled by the screen the moment it lets go (R2E-01): the data channel
      and the peer connection are closed at once and the setup rejects with
      LiveStartCancelled without waiting for its current step. */
  handle?: StartHandle;
  /** Called at most once with the id of a session the request created that
      this setup did not hand back (it was let go, or a later step failed),
      so the caller can end it at the Worker (R2E-01). It can come AFTER the
      setup has rejected: a let-go while the request was out is reported
      when the request answers. */
  onSessionUnused?(sessionId: string): void;
}

function waitForIceGatheringComplete(
  pc: RTCPeerConnection,
  timeoutMs: number,
  onLetGo?: (release: () => void) => void,
): Promise<void> {
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
    /* A start let go stops waiting at once (its timer included). */
    onLetGo?.(finish);
  });
}

/** Opens the WebRTC connection to our own session-broker Worker (never to
    OpenAI directly from the browser) and hands back a transport that
    OpenAiLiveSession can drive. Only this function touches WebRTC/DOM. */
export async function connectWebRtc(
  opts: WebRtcConnectOptions,
): Promise<{ transport: LiveEventTransport; sessionId: string; model: string; peer: RTCPeerConnection }> {
  const iceTimeoutMs = opts.iceTimeoutMs ?? 10000;
  const watch = watchStart(opts.mayContinue, opts.handle);
  watch.check();
  const pc = new RTCPeerConnection();
  let dc: RTCDataChannel | null = null;
  let handlers: { onEvent(ev: LiveServerEvent): void; onClose(): void } | null = null;
  let torndown = false;
  /* The session the request created, once its answer has been read, and
     whether it has been handed back (then it is the caller's to end) or
     given up on (then it is reported through onSessionUnused). */
  let createdId: string | null = null;
  let handedOver = false;
  let gaveUp = false;
  let unusedReported = false;

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
  const reportUnused = () => {
    if (!createdId || handedOver || unusedReported) return;
    unusedReported = true;
    try {
      opts.onSessionUnused?.(createdId);
    } catch {
      /* the caller's report must never turn into a failure here */
    }
  };
  /* R2E-01: a pull closes the channel and the peer at once, wherever the
     setup is waiting. */
  watch.onLetGo(teardown);

  try {
    pc.addEventListener('track', (e) => {
      /* R2E-01: a track that arrives once the start was let go (or the
         connection torn down) is stopped, never passed on to be played. */
      if (torndown || !watch.going()) {
        try {
          e.track.stop();
        } catch {
          /* already ended */
        }
        return;
      }
      opts.onRemoteStream(new MediaStream([e.track]));
    });

    for (const track of opts.stream.getAudioTracks()) {
      pc.addTrack(track, opts.stream);
    }

    dc = pc.createDataChannel('oai-events');
    dc.addEventListener('message', (e: MessageEvent) => {
      if (torndown || !handlers) return;
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
      if (torndown) return;
      handlers?.onClose();
    });

    pc.addEventListener('connectionstatechange', () => {
      if (torndown) return;
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        handlers?.onClose();
      }
    });

    const offer = await watch.wait(pc.createOffer());
    await watch.wait(pc.setLocalDescription(offer));
    await watch.wait(waitForIceGatheringComplete(pc, iceTimeoutMs, (finish) => watch.onLetGo(finish)));

    const sdp = pc.localDescription?.sdp;
    if (!sdp) throw new Error('Could not prepare the connection offer.');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;

    /* The preparation above can take up to iceTimeoutMs. Ask again,
       immediately before the request that creates the paid voice session:
       a no sends nothing, and the catch below closes the data channel and
       the peer connection. */
    watch.check();
    const answered = (async () => {
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
      if (typeof data?.session?.id === 'string' && data.session.id) createdId = data.session.id;
      /* Let go while the request was out: the session exists now and is
         nobody's, so it is reported the moment its id is known. */
      if (gaveUp) reportUnused();
      return data;
    })();
    const data = await watch.wait(answered);

    /* R2E-01: asked immediately before the remote answer is applied. A no
       applies nothing, so no audio can flow; the catch below closes the
       peer and reports the session, which is ended at the Worker. */
    watch.check();
    await watch.wait(pc.setRemoteDescription({ type: 'answer', sdp: data.transport.sdp }));
    /* Applying the answer takes a moment of its own (the track callback runs
       inside it, and asks for itself): a no that came in between hands
       nothing back. */
    watch.check();

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

    handedOver = true;
    watch.done();
    return { transport, sessionId: data.session.id, model: data.model, peer: pc };
  } catch (err) {
    gaveUp = true;
    teardown();
    watch.done();
    reportUnused();
    throw err;
  }
}
