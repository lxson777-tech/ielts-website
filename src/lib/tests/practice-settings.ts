/* The settings a student picks on a practice paper's start screen (Alex,
   9 October 2026): the timer, checking answers as you go, which passages or
   parts to do, and how the listening recording plays. The default is exam
   conditions, which is exactly how a paper ran before these settings.

   One rule carries the weight: only a paper sat in exam conditions earns a
   band estimate or counts as exam evidence. Anything taken with help is
   recorded as practice (isExamConditions below decides which), so no setting
   can inflate a band.

   The Mock exam, the placement test and in-place retakes never show the start
   screen, so they never carry settings and always run as before.

   Remembered per device, like the Writing trainer's clock preference
   (src/lib/writing/timer-pref.ts): a display and study preference, not
   student data, so it is not owned by an account. Which passages to do is
   chosen afresh for each paper and is never remembered. */

export type TimerSetting = 'exam' | 'extra' | 'off';
export type CheckSetting = 'end' | 'as-you-go';
export type PlaybackSetting = 'once' | 'replay';

export interface PracticeSettings {
  timer: TimerSetting;
  check: CheckSetting;
  /** 0-based indices of the parts to do, ascending. Empty means all parts. */
  parts: number[];
  /** Listening only; ignored for reading. */
  playback: PlaybackSetting;
}

/** Extra time multiplies the paper's own duration (60 minutes becomes 75). */
export const EXTRA_TIME_FACTOR = 1.25;

export const EXAM_CONDITIONS: PracticeSettings = Object.freeze({
  timer: 'exam',
  check: 'end',
  parts: [],
  playback: 'once',
}) as PracticeSettings;

/** The parts a paper with `partCount` parts will actually show, ascending and
    de-duplicated. Out-of-range indices are dropped; nothing left means all. */
export function selectedParts(settings: PracticeSettings, partCount: number): number[] {
  const picked = [...new Set(settings.parts)].filter((i) => Number.isInteger(i) && i >= 0 && i < partCount).sort((a, b) => a - b);
  return picked.length === 0 ? Array.from({ length: partCount }, (_, i) => i) : picked;
}

/** True only when every setting is the exam one: the clock as the paper sets
    it, answers marked at the end, every part, and (for listening) the
    recording played once. `playbackApplies` is false for reading. */
export function isExamConditions(settings: PracticeSettings, partCount: number, playbackApplies: boolean): boolean {
  return (
    settings.timer === 'exam' &&
    settings.check === 'end' &&
    selectedParts(settings, partCount).length === partCount &&
    (!playbackApplies || settings.playback === 'once')
  );
}

/** Minutes on the clock for this paper, or null for no timer at all. */
export function clockMinutes(durationMinutes: number, timer: TimerSetting): number | null {
  if (timer === 'off') return null;
  if (timer === 'extra') return Math.round(durationMinutes * EXTRA_TIME_FACTOR);
  return durationMinutes;
}

const PREF_KEY = 'ielts.practice.settings.v1';

function isTimer(v: unknown): v is TimerSetting {
  return v === 'exam' || v === 'extra' || v === 'off';
}
function isCheck(v: unknown): v is CheckSetting {
  return v === 'end' || v === 'as-you-go';
}
function isPlayback(v: unknown): v is PlaybackSetting {
  return v === 'once' || v === 'replay';
}

/** The settings this device chose last time, with `parts` always reset to
    all. Anything missing or unreadable falls back to exam conditions. */
export function readRememberedSettings(): PracticeSettings {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { ...EXAM_CONDITIONS, parts: [] };
    const v = JSON.parse(raw) as Record<string, unknown>;
    return {
      timer: isTimer(v.timer) ? v.timer : 'exam',
      check: isCheck(v.check) ? v.check : 'end',
      parts: [],
      playback: isPlayback(v.playback) ? v.playback : 'once',
    };
  } catch {
    return { ...EXAM_CONDITIONS, parts: [] };
  }
}

/** Remember the timer, checking and playback choices (never the parts). */
export function rememberSettings(settings: PracticeSettings): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ timer: settings.timer, check: settings.check, playback: settings.playback }));
  } catch {
    /* not remembered; the choice still holds for this paper */
  }
}
