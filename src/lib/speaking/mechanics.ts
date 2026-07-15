/* Free, in-browser acoustic analysis of a recorded answer — no speech-to-text,
   no API call. Mirrors the role of writing/mechanics.ts: a heuristic signal
   layer fed to both the offline stub grader and the remote grader (as
   supporting context, not a substitute for the model's own judgment). */

import type { AudioMechanicsReport } from './schema';

const WINDOW_MS = 50;

/** RMS-scans the decoded audio in ~50ms windows against an adaptive noise
    floor (the quietest 10th percentile of windows), so it copes with
    different mic sensitivities instead of a single fixed silence threshold. */
export async function analyzeAudio(blob: Blob, expectedMinMs: number): Promise<AudioMechanicsReport> {
  const totalDurationMs = Math.round(await blobDurationMs(blob));
  const notes: string[] = [];

  let estSilenceRatio = 0;
  let longestSilenceMs = 0;

  try {
    const windows = await rmsWindows(blob);
    if (windows.length > 0) {
      const sorted = [...windows].sort((a, b) => a - b);
      const noiseFloor = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
      const threshold = Math.max(noiseFloor * 2, 0.01);

      let silentCount = 0;
      let currentRun = 0;
      let longestRun = 0;
      for (const rms of windows) {
        if (rms < threshold) {
          silentCount++;
          currentRun++;
          longestRun = Math.max(longestRun, currentRun);
        } else {
          currentRun = 0;
        }
      }
      estSilenceRatio = silentCount / windows.length;
      longestSilenceMs = longestRun * WINDOW_MS;
    }
  } catch {
    // Decoding failed (unsupported format in this browser) — length is still
    // known from the recorder itself, so grading can proceed without this signal.
    notes.push('Could not analyze pacing in this browser. Length was still measured.');
  }

  const underLength = totalDurationMs < expectedMinMs;
  if (underLength) {
    notes.push(`Under the suggested length (${Math.round(totalDurationMs / 1000)}s of ${Math.round(expectedMinMs / 1000)}s+).`);
  }
  if (longestSilenceMs > 4000) {
    notes.push('A long pause was detected. Try to keep talking even while you think of what to say next.');
  }
  if (estSilenceRatio > 0.4) {
    notes.push('A large portion of the recording was silence.');
  }

  return { totalDurationMs, expectedMinMs, underLength, estSilenceRatio, longestSilenceMs, notes };
}

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

async function rmsWindows(blob: Blob): Promise<number[]> {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = buffer.getChannelData(0);
    const samplesPerWindow = Math.round((WINDOW_MS / 1000) * buffer.sampleRate);
    const windows: number[] = [];
    for (let start = 0; start < data.length; start += samplesPerWindow) {
      const end = Math.min(start + samplesPerWindow, data.length);
      let sumSquares = 0;
      for (let i = start; i < end; i++) sumSquares += data[i]! * data[i]!;
      windows.push(Math.sqrt(sumSquares / (end - start)));
    }
    return windows;
  } finally {
    void ctx.close();
  }
}
