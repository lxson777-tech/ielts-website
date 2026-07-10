/* The Live API session: one WebSocket, browser → Gemini directly.

   The token Worker (workers/live-examiner) mints a single-use ephemeral
   token; the real API key never reaches the browser. Protocol is the raw
   BidiGenerateContent WebSocket (v1alpha — ephemeral tokens only work
   there): client sends one `setup` frame, then streams 16 kHz PCM16 mic
   chunks as `realtimeInput`; the server streams 24 kHz PCM16 speech back in
   `serverContent` frames plus incremental input/output transcriptions,
   which we accumulate into the interview transcript used for grading. */

import { EXAMINER_VOICE } from './script';

const WS_HOST = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

export interface TranscriptTurn {
  role: 'examiner' | 'candidate';
  text: string;
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

export class ExaminerSession {
  private ws: WebSocket | null = null;
  private turns: TranscriptTurn[] = [];
  private closedByUs = false;

  private constructor(private cb: SessionCallbacks) {}

  static async connect(
    tokenEndpoint: string,
    systemInstruction: string,
    cb: SessionCallbacks,
  ): Promise<ExaminerSession> {
    const resp = await fetch(tokenEndpoint, { method: 'POST' });
    if (!resp.ok) {
      const err = (await resp.json().catch(() => null)) as { error?: string } | null;
      throw new Error(err?.error ?? `Token service error (${resp.status})`);
    }
    const { token, model } = (await resp.json()) as { token: string; model: string };

    const session = new ExaminerSession(cb);
    await session.open(token, model, systemInstruction);
    return session;
  }

  private open(token: string, model: string, systemInstruction: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_HOST}?access_token=${encodeURIComponent(token)}`);
      this.ws = ws;
      let settled = false;

      ws.onopen = () => {
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
                automaticActivityDetection: {
                  // Test-takers pause to think — don't snatch the turn early.
                  endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
                  silenceDurationMs: 1100,
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
        let msg: ServerMessage;
        try {
          msg = JSON.parse(raw) as ServerMessage;
        } catch {
          return;
        }

        if (msg.setupComplete !== undefined && !settled) {
          settled = true;
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
          settled = true;
          reject(new Error('Could not connect to the examiner service.'));
        } else {
          this.cb.onError('Connection error.');
        }
      };

      ws.onclose = (ev) => {
        if (!settled) {
          settled = true;
          reject(new Error(`Connection closed before setup (${ev.code}${ev.reason ? `: ${ev.reason}` : ''}).`));
          return;
        }
        if (!this.closedByUs) this.cb.onClosed(ev.reason || `code ${ev.code}`, ev.wasClean);
      };
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
