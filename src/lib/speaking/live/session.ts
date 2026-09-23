/* The Live API session: one WebSocket, browser → Gemini directly.

   The token Worker (workers/live-examiner) mints a single-use ephemeral
   token; the real API key never reaches the browser. Protocol is the raw
   BidiGenerateContent WebSocket (v1alpha — ephemeral tokens only work
   there): client sends one `setup` frame, then streams 16 kHz PCM16 mic
   chunks as `realtimeInput`; the server streams 24 kHz PCM16 speech back in
   `serverContent` frames plus incremental input/output transcriptions,
   which we accumulate into the interview transcript used for grading.

   ASKED BEFORE THE SOCKET (finding R2D-01, inside the setup). connect takes
   the examiner's own "may I continue" check (./start-check.ts says why it is
   a function) and asks it before the token request, since the audio set-up
   before connect can wait, and again immediately before the socket, which is
   the voice session itself. A no rejects with LiveStartCancelled: the socket
   is never opened, and nothing more is sent.

   AND ONCE THE SOCKET IS MADE (finding R2E-01, Codex inspection of
   c4a7793). A let-go after the socket had been constructed could not stop
   its open callback from sending the setup, and the wait for the setup to
   complete had no end. Now connect also takes the screen's StartHandle
   (./start-check.ts): a pull closes the socket at once and rejects with
   LiveStartCancelled, wherever the start is waiting. The open callback asks
   (handle and question) before it sends the setup, and the message callback
   before it acts, so a socket that opens after the let-go sends nothing and
   is closed. The setup wait now ends after setupTimeoutMs (twenty seconds
   by default, like the paid path's) with the socket closed. A socket closed
   by a failed or let-go start says nothing more to the callbacks. */

import { EXAMINER_VOICE } from './script';
import { LiveStartCancelled, watchStart, type MayContinue, type StartHandle, type StartWatch } from './start-check';

/* NOTE: ephemeral tokens only authenticate against the ...Constrained method
   (verified 2026-07-10: plain BidiGenerateContent rejects them with 1008
   "unregistered callers"). Real API keys use the unsuffixed method instead. */
const WS_HOST = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

export interface TranscriptTurn {
  role: 'examiner' | 'candidate';
  text: string;
  startMs?: number;
  endMs?: number;
}

export interface SessionCallbacks {
  /** base64 PCM16@24kHz chunk of examiner speech — queue it for playback. */
  onAudio(chunk: string): void;
  /** The model was cut off mid-sentence — flush the playback queue. */
  onInterrupted(): void;
  /** Fired whenever the running transcript changes. */
  onTranscript(turns: TranscriptTurn[]): void;
  /** Connection ended (server goAway, network drop, or close). */
  onClosed(reason: string, wasClean: boolean): void;
  onError(message: string): void;
}

interface ServerMessage {
  setupComplete?: unknown;
  serverContent?: {
    modelTurn?: { parts?: { inlineData?: { data?: string } }[] };
    turnComplete?: boolean;
    interrupted?: boolean;
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
  };
  inputTranscription?: { text?: string };
  outputTranscription?: { text?: string };
  goAway?: { timeLeft?: string };
}

export interface SessionConnectOptions {
  /** Pulled by the screen the moment it lets go (R2E-01). */
  handle?: StartHandle;
  /** How long to wait for the setup to complete once the socket is made.
      Twenty seconds when not given. */
  setupTimeoutMs?: number;
}

const DEFAULT_SETUP_TIMEOUT_MS = 20000;

export class ExaminerSession {
  private ws: WebSocket | null = null;
  private turns: TranscriptTurn[] = [];
  private closedByUs = false;

  private cb: SessionCallbacks;

  private constructor(cb: SessionCallbacks) {
    this.cb = cb;
  }

  static async connect(
    tokenEndpoint: string,
    systemInstruction: string,
    cb: SessionCallbacks,
    mayContinue?: MayContinue,
    options: SessionConnectOptions = {},
  ): Promise<ExaminerSession> {
    const watch = watchStart(mayContinue, options.handle);
    try {
      watch.check();
      const resp = await watch.wait(fetch(tokenEndpoint, { method: 'POST' }));
      if (!resp.ok) {
        const err = (await resp.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? `Token service error (${resp.status})`);
      }
      const { token, model } = (await watch.wait(resp.json())) as { token: string; model: string };

      /* The token request took its time: ask again, immediately before the
         socket. A no opens nothing (the minted token is single use and simply
         expires unused). */
      watch.check();
      const session = new ExaminerSession(cb);
      await session.open(token, model, systemInstruction, watch, options.setupTimeoutMs ?? DEFAULT_SETUP_TIMEOUT_MS);
      return session;
    } finally {
      watch.done();
    }
  }

  private open(token: string, model: string, systemInstruction: string, watch: StartWatch, setupTimeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_HOST}?access_token=${encodeURIComponent(token)}`);
      this.ws = ws;
      let settled = false;
      let failed = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      /** The setup did not complete (let go, timed out, failed): the socket
          is closed at once, none of its callbacks does anything more, and
          the start rejects. */
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        failed = true;
        if (timer) clearTimeout(timer);
        timer = null;
        this.closedByUs = true;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          if (ws.readyState <= WebSocket.OPEN) ws.close(1000, 'client done');
        } catch {
          /* already closing */
        }
        if (this.ws === ws) this.ws = null;
        reject(error);
      };
      const cancelled = () => fail(new LiveStartCancelled());

      ws.onopen = () => {
        /* R2E-01: a socket that opens after the start was let go sends no
           setup. */
        if (settled || !watch.going()) {
          cancelled();
          return;
        }
        ws.send(
          JSON.stringify({
            setup: {
              model: `models/${model}`,
              generationConfig: {
                responseModalities: ['AUDIO'],
                temperature: 0.6,
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: EXAMINER_VOICE } } },
              },
              systemInstruction: { parts: [{ text: systemInstruction }] },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              realtimeInputConfig: {
                // A real examiner always finishes the question: don't let
                // candidate-side sound (a cough, room noise, or her own voice
                // echoing into the mic without headphones) barge in and cut
                // her audio mid-sentence. Candidate speech is still heard and
                // transcribed; it just can't truncate her turn.
                activityHandling: 'NO_INTERRUPTION',
                automaticActivityDetection: {
                  // The response-delay dial. LOW sensitivity so mid-answer
                  // thinking pauses don't get the turn snatched; the silence
                  // window is the tradeoff: higher = examiner feels slow to
                  // reply (each reply waits this long after you stop), lower
                  // = she may jump in while a student is composing the next
                  // sentence. 1100ms felt sluggish in real sessions.
                  endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
                  silenceDurationMs: 800,
                  prefixPaddingMs: 300,
                },
              },
              // Keeps long sessions alive past the default audio session cap.
              contextWindowCompression: { slidingWindow: {} },
            },
          }),
        );
      };

      ws.onmessage = async (ev: MessageEvent) => {
        const raw = typeof ev.data === 'string' ? ev.data : await (ev.data as Blob).text();
        /* R2E-01: a start that failed or was let go while this message was
           being read acts on none of it, and until the setup has completed
           nothing the socket says is acted on for a start that was let go. */
        if (failed) return;
        if (!settled && !watch.going()) {
          cancelled();
          return;
        }
        let msg: ServerMessage;
        try {
          msg = JSON.parse(raw) as ServerMessage;
        } catch {
          return;
        }

        if (msg.setupComplete !== undefined && !settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          timer = null;
          resolve();
          return;
        }

        const sc = msg.serverContent;
        if (sc) {
          if (sc.interrupted) this.cb.onInterrupted();
          for (const part of sc.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) this.cb.onAudio(part.inlineData.data);
          }
          const inText = sc.inputTranscription?.text ?? msg.inputTranscription?.text;
          const outText = sc.outputTranscription?.text ?? msg.outputTranscription?.text;
          if (inText) this.appendTranscript('candidate', inText);
          if (outText) this.appendTranscript('examiner', outText);
        } else {
          if (msg.inputTranscription?.text) this.appendTranscript('candidate', msg.inputTranscription.text);
          if (msg.outputTranscription?.text) this.appendTranscript('examiner', msg.outputTranscription.text);
        }

        if (msg.goAway) {
          this.cb.onError('The session is about to be closed by the server.');
        }
      };

      ws.onerror = () => {
        if (!settled) {
          fail(new Error('Could not connect to the examiner service.'));
        } else {
          this.cb.onError('Connection error.');
        }
      };

      ws.onclose = (ev) => {
        if (!settled) {
          fail(new Error(`Connection closed before setup (${ev.code}${ev.reason ? `: ${ev.reason}` : ''}).`));
          return;
        }
        if (!this.closedByUs) this.cb.onClosed(ev.reason || `code ${ev.code}`, ev.wasClean);
      };

      /* The setup wait has an end (R2E-01): no answer within setupTimeoutMs
         closes the socket and fails the start. */
      timer = setTimeout(() => {
        fail(new Error('Timed out waiting for the examiner session to start.'));
      }, setupTimeoutMs);
      /* A pull closes the socket at once, wherever the setup is. Registered
         last, so a start that was let go already is closed right here. */
      watch.onLetGo(cancelled);
    });
  }

  private appendTranscript(role: TranscriptTurn['role'], text: string): void {
    const last = this.turns[this.turns.length - 1];
    if (last && last.role === role) last.text += text;
    else this.turns.push({ role, text });
    this.cb.onTranscript(this.turns);
  }

  /** Streams one base64 PCM16@16kHz mic chunk. */
  sendAudioChunk(base64: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({ realtimeInput: { audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } } }),
    );
  }

  /** Silent stage direction the examiner obeys but never reads aloud. */
  sendDirectorNote(note: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text: `[DIRECTOR] ${note}` }] }],
          turnComplete: true,
        },
      }),
    );
  }

  transcript(): TranscriptTurn[] {
    return this.turns;
  }

  close(): void {
    this.closedByUs = true;
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) this.ws.close(1000, 'client done');
    this.ws = null;
  }
}
