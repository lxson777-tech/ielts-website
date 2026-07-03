/* In-progress test session, persisted so a refresh or accidental tab close
   cannot pause or reset the timer. One session at a time (the active test).
   Distinct from progress.ts, which stores permanent completed-attempt history. */

import type { PracticeTest } from './tests/schema';

const KEY = 'ielts.testsession.v1';

export interface TestSession {
  version: 1;
  testId: string;
  startedAt: number; // epoch ms
  endsAt: number; // epoch ms — startedAt + duration
  answers: Record<string, string>;
}

function read(): TestSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.version === 1 ? (s as TestSession) : null;
  } catch {
    return null;
  }
}

function write(s: TestSession): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked (private mode) — session just won't survive reload */
  }
}

/** Start a fresh session for this test, replacing any previous one. */
export function startSession(test: PracticeTest): TestSession {
  const now = Date.now();
  const s: TestSession = {
    version: 1,
    testId: test.id,
    startedAt: now,
    endsAt: now + test.durationMinutes * 60_000,
    answers: {},
  };
  write(s);
  return s;
}

/** Return the in-progress session for this test, if one exists (any remaining time). */
export function loadSession(testId: string): TestSession | null {
  const s = read();
  return s && s.testId === testId ? s : null;
}

/** Seconds left for a session, floored at 0. */
export function secondsLeft(s: TestSession): number {
  return Math.max(0, Math.round((s.endsAt - Date.now()) / 1000));
}

export function saveAnswers(answers: Record<string, string>): void {
  const s = read();
  if (!s) return;
  write({ ...s, answers });
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
