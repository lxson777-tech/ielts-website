/* Honest progress for the AI grading waits.

   Grading is genuinely slow: measured on the live site, a Part 2 drill with
   about two minutes of speech takes ~105s, a full 12-minute mock speaking
   test takes ~5m22s, and an essay takes ~60s. A single frozen "Grading…"
   label reads as a hang, so every wait screen shows a real percentage and
   the stage it is on.

   The percentage is derived from elapsed time against an estimate, never
   from the request itself (the graders report nothing until they are done).
   To stay honest it eases toward 95% and stops there: the last 5% only ever
   disappears when the real result arrives and the caller unmounts the bar.
   The curve is exponential, so it keeps visibly moving even when a grade
   overruns its estimate, and it can never go backwards. */

export type GradingKind = 'speaking' | 'writing';

/** Default assumed speech length when a caller cannot measure the recording. */
export const DEFAULT_AUDIO_SECONDS = 120;

/** Seconds a grade of this kind is expected to take.
    Speaking: a fixed setup cost plus a per-second-of-audio cost, fitted to
    the two live measurements above (120s of audio -> ~96s, 720s -> ~323s).
    Writing: a flat minute. */
export function estimateSeconds(kind: GradingKind, audioSeconds = DEFAULT_AUDIO_SECONDS): number {
  if (kind === 'writing') return 60;
  const audio = Number.isFinite(audioSeconds) && audioSeconds > 0 ? audioSeconds : DEFAULT_AUDIO_SECONDS;
  return 50 + 0.38 * audio;
}

/** Percentage to show, 0 at the start and asymptotic to 95. Monotonic. */
export function progressPercent(elapsedMs: number, estimateSeconds: number): number {
  const elapsed = Math.max(0, elapsedMs) / 1000;
  const estimate = estimateSeconds > 0 ? estimateSeconds : 1;
  return 95 * (1 - Math.exp(-elapsed / (estimate / 2.5)));
}

/** The one-line stage label, driven by how much of the estimate has passed. */
export function stageLabel(kind: GradingKind, fraction: number): string {
  if (kind === 'writing') {
    if (fraction < 0.3) return 'Reading your essay';
    if (fraction < 0.75) return 'Checking it against the official band descriptors';
    return 'Writing your feedback';
  }
  if (fraction < 0.12) return 'Preparing your recording';
  if (fraction < 0.55) return 'Writing out exactly what you said';
  if (fraction < 0.85) return 'Grading fluency, vocabulary and grammar';
  return 'Checking your pronunciation';
}

/** Past this much of the estimate, the wait has overrun and we say so. */
export const OVERRUN_FRACTION = 1.6;

export const OVERRUN_NOTE = 'This one is taking longer than usual. Please keep this tab open.';
