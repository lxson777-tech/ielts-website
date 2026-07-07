/* Microphone capture. One requestMic() per test session (one permission
   prompt), then a fresh MediaRecorder per question via recordSegment() so
   each answer is its own discrete clip — the Worker pairs each clip with its
   exact question text rather than guessing turn boundaries from one long
   recording. */

const MIME_CANDIDATES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'];

export function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export async function requestMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

export interface RecordedSegment {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export interface RecordingHandle {
  /** Stops recording (if still active) and resolves with the captured clip. */
  stop(): Promise<RecordedSegment>;
}

/** Starts recording immediately; auto-stops at maxMs if stop() isn't called first. */
export function recordSegment(stream: MediaStream, opts: { maxMs: number }): RecordingHandle {
  const mimeType = pickMimeType();
  const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  const startedAt = performance.now();

  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  rec.start();

  const maxTimer = setTimeout(() => {
    if (rec.state === 'recording') rec.stop();
  }, opts.maxMs);

  return {
    stop: () =>
      new Promise((resolve) => {
        clearTimeout(maxTimer);
        rec.onstop = () => {
          resolve({
            blob: new Blob(chunks, { type: rec.mimeType || mimeType }),
            mimeType: rec.mimeType || mimeType,
            durationMs: performance.now() - startedAt,
          });
        };
        if (rec.state === 'recording') rec.stop();
        else if (rec.state === 'inactive') {
          // Already stopped (maxMs timer fired and onstop hasn't been (re)wired
          // yet) — resolve directly instead of waiting for an onstop that
          // already fired against the previous handler.
          resolve({
            blob: new Blob(chunks, { type: rec.mimeType || mimeType }),
            mimeType: rec.mimeType || mimeType,
            durationMs: performance.now() - startedAt,
          });
        }
      }),
  };
}

/** Reads a Blob as a base64 string (no data: prefix) for the Worker payload. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Stops every track so the mic indicator turns off. Call at session end. */
export function releaseMic(stream: MediaStream): void {
  stream.getTracks().forEach((t) => t.stop());
}
