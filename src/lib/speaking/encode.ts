/* Converts a recorded clip (whatever container MediaRecorder produced,
   webm/opus, mp4/aac, ogg, ...) into 16 kHz mono MP3 in the browser. The
   grader's OpenAI provider only accepts WAV or MP3 audio input, so every
   clip has to be re-encoded before it is sent; MP3 also keeps even a full
   ~14-minute test recording well under the 5 MB request-body budget.
   Decoding uses the same AudioContext.decodeAudioData() as mechanics.ts;
   the actual encoding is done by lamejs (pure-JS LAME), chunked with
   periodic yields so a long recording doesn't freeze the page. */

import { Mp3Encoder } from 'lamejs';
import './lamejsGlobalsShim'; // see src/types/lamejs.d.ts: works around a real bug in lamejs 1.2.1 itself
import { blobToBase64 } from './recorder';

const DEFAULT_SAMPLE_RATE = 16000;
const DEFAULT_KBPS = 48;
const SAMPLES_PER_FRAME = 1152; // MP3 frame size lamejs expects per encodeBuffer() call
const YIELD_EVERY_N_FRAMES = 200; // give the page a breath every ~200 frames of encoding

/** Mixes every channel of a decoded buffer down to one mono Float32 signal. */
function mixToMono(buffer: AudioBuffer): Float32Array<ArrayBuffer> {
  const { numberOfChannels, length } = buffer;
  // new Float32Array(...) (not .slice()) guarantees a plain ArrayBuffer-backed
  // copy, matching what copyToChannel() below expects.
  if (numberOfChannels === 1) return new Float32Array(buffer.getChannelData(0));

  const mixed: Float32Array<ArrayBuffer> = new Float32Array(length);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mixed[i] = mixed[i] + data[i] / numberOfChannels;
    }
  }
  return mixed;
}

/** Float32 [-1, 1] samples -> signed 16-bit PCM, the format lamejs encodes from. */
function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function getAudioContextCtor(): typeof AudioContext {
  return window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
}

/** Resamples mono Float32 samples at `fromSampleRate` to `toSampleRate`
    using an OfflineAudioContext (the browser's own resampler, not a
    hand-rolled one). */
async function resampleMono(mono: Float32Array<ArrayBuffer>, fromSampleRate: number, toSampleRate: number): Promise<Float32Array> {
  const durationSec = mono.length / fromSampleRate;
  const targetLength = Math.max(1, Math.round(durationSec * toSampleRate));
  const offline = new OfflineAudioContext(1, targetLength, toSampleRate);
  const sourceBuffer = offline.createBuffer(1, mono.length, fromSampleRate);
  sourceBuffer.copyToChannel(mono, 0);

  const source = offline.createBufferSource();
  source.buffer = sourceBuffer;
  source.connect(offline.destination);
  source.start();

  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

/** Measures a blob's playable duration via a detached <audio> element
    (cheap metadata read, no full decode), same trick mechanics.ts uses. */
function blobDurationMs(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    audio.src = url;
    audio.addEventListener('loadedmetadata', () => {
      const ms = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      URL.revokeObjectURL(url);
      resolve(ms);
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });
  });
}

/** Converts any browser-recorded audio Blob to 16 kHz mono MP3. Throws a
    plain, student-facing error if the container can't be decoded. Callers
    must not fall back to sending the original container, the grader can't
    read it. */
export async function toMp3(blob: Blob, opts: { sampleRate?: number; kbps?: number } = {}): Promise<{ blob: Blob; mimeType: 'audio/mpeg' }> {
  const sampleRate = opts.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const kbps = opts.kbps ?? DEFAULT_KBPS;

  const AudioCtx = getAudioContextCtor();
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error('Could not process the recording. Please try again.');
  } finally {
    void ctx.close();
  }

  const mono = mixToMono(decoded);
  const resampled = await resampleMono(mono, decoded.sampleRate, sampleRate);
  const pcm = floatTo16BitPCM(resampled);

  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const mp3Chunks: Int8Array[] = [];
  let framesSinceYield = 0;

  for (let i = 0; i < pcm.length; i += SAMPLES_PER_FRAME) {
    const frame = pcm.subarray(i, i + SAMPLES_PER_FRAME);
    const encoded = encoder.encodeBuffer(frame);
    if (encoded.length > 0) mp3Chunks.push(encoded);

    framesSinceYield++;
    if (framesSinceYield >= YIELD_EVERY_N_FRAMES) {
      framesSinceYield = 0;
      await new Promise((resolve) => setTimeout(resolve));
    }
  }
  const flushed = encoder.flush();
  if (flushed.length > 0) mp3Chunks.push(flushed);

  return { blob: new Blob(mp3Chunks as BlobPart[], { type: 'audio/mpeg' }), mimeType: 'audio/mpeg' };
}

/** toMp3() + base64-encode, the shape every grader request needs. Duration
    is measured off the encoded MP3 itself; callers that already know the
    original recording's duration (from the recorder) should keep using
    that value rather than this one, since it is the one the student's UI
    already showed. */
export async function blobToMp3Base64(blob: Blob): Promise<{ audioBase64: string; mimeType: 'audio/mpeg'; durationMs: number }> {
  const { blob: mp3Blob, mimeType } = await toMp3(blob);
  const [audioBase64, durationMs] = await Promise.all([blobToBase64(mp3Blob), blobDurationMs(mp3Blob)]);
  return { audioBase64, mimeType, durationMs };
}
