/* localStorage-backed progress store. Versioned so a future account-sync
   can migrate v1 data. All storage access is guarded: SSR, disabled
   storage (private mode), and corrupt JSON all degrade to empty state. */

const KEY = 'ielts.progress.v1';

export interface TestAttempt {
  at: string; // ISO datetime
  raw: number;
  total: number;
  band: number; // bandMidpoint value
  bandLabel: string; // e.g. '7.5 – 8'
  secondsUsed: number;
}

export interface ProgressV1 {
  version: 1;
  lessons: Record<string, { completedAt: string }>;
  tests: Record<string, TestAttempt[]>;
}

const EMPTY: ProgressV1 = { version: 1, lessons: {}, tests: {} };

export function getProgress(): ProgressV1 {
  if (typeof window === 'undefined') return structuredClone(EMPTY);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return structuredClone(EMPTY);
    return { ...structuredClone(EMPTY), ...parsed };
  } catch {
    return structuredClone(EMPTY);
  }
}

function save(p: ProgressV1): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage full/blocked — progress is a nice-to-have, never fatal */
  }
}

export function markLessonComplete(slug: string): void {
  const p = getProgress();
  p.lessons[slug] = { completedAt: new Date().toISOString() };
  save(p);
}

export function unmarkLessonComplete(slug: string): void {
  const p = getProgress();
  delete p.lessons[slug];
  save(p);
}

export function isLessonComplete(slug: string): boolean {
  return slug in getProgress().lessons;
}

export function completedLessonCount(): number {
  return Object.keys(getProgress().lessons).length;
}

export function recordTestAttempt(testId: string, attempt: TestAttempt): void {
  const p = getProgress();
  (p.tests[testId] ??= []).push(attempt);
  save(p);
}

export function getAttempts(testId?: string): { testId: string; attempt: TestAttempt }[] {
  const p = getProgress();
  const ids = testId ? [testId] : Object.keys(p.tests);
  return ids
    .flatMap((id) => (p.tests[id] ?? []).map((attempt) => ({ testId: id, attempt })))
    .sort((a, b) => a.attempt.at.localeCompare(b.attempt.at));
}

export function getBestBand(testId?: string): TestAttempt | null {
  const all = getAttempts(testId);
  if (all.length === 0) return null;
  return all.reduce((best, cur) => (cur.attempt.band > best.band ? cur.attempt : best), all[0]!.attempt);
}

export function resetProgress(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
