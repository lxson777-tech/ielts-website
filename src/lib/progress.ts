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
  /** correct/total per question type (keyed by QuestionType). Optional so
      attempts recorded before this feature still load. */
  byType?: Record<string, { correct: number; total: number }>;
  /** 'drill' = single-passage timed drill, not a full exam. Missing/'full'
      means a complete test — band history and best-band only count those,
      since a band estimate is only meaningful over the full 40-question mix. */
  kind?: 'full' | 'drill';
  /** Which skill this attempt belongs to. Optional so attempts recorded
      before this field existed still load; treat missing as 'reading' since
      that was the only skill with scored attempts at the time. Needed once
      more than one skill's question types can overlap in name (e.g.
      'multiple-choice' in both Reading and Listening) so getTypeStats can
      be scoped per skill instead of silently blending them. */
  skill?: 'reading' | 'listening';
}

export interface WritingAttempt {
  at: string; // ISO datetime
  overallBand: number;
  /** band per criterion key (taskResponse/coherenceCohesion/lexicalResource/grammaticalRange) */
  criteria: Record<string, number>;
  wordCount: number;
  /** whether this came from the live AI grader or the offline stub */
  live: boolean;
}

/** One graded speaking attempt. Unlike tests/writing this is a flat list, not
    keyed by prompt — speaking history is most useful as a single band-over-time
    trend across all parts, and students rarely re-take one exact topic. */
export interface SpeakingAttempt {
  at: string; // ISO datetime
  mode: 'part1' | 'part2' | 'part3';
  topic: string;
  overallBand: number;
  /** band per criterion key (fluencyCoherence/lexicalResource/grammaticalRange/pronunciation) */
  criteria: Record<string, number>;
  /** whether this came from the live AI grader or the offline stub */
  live: boolean;
}

export interface ProgressV1 {
  version: 1;
  lessons: Record<string, { completedAt: string }>;
  tests: Record<string, TestAttempt[]>;
  writing: Record<string, WritingAttempt[]>;
  speaking: SpeakingAttempt[];
}

const EMPTY: ProgressV1 = { version: 1, lessons: {}, tests: {}, writing: {}, speaking: [] };

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

const listeners = new Set<() => void>();

/** Subscribe to progress writes (local activity or a cloud pull). Returns an
    unsubscribe. Used by the account-sync layer to push changes up. */
export function onProgressChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function save(p: ProgressV1): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage full/blocked — progress is a nice-to-have, never fatal */
  }
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a listener throwing must not break the writer */
    }
  }
}

/** Overwrite the whole store — used when a cloud pull brings down merged state.
    Goes through save() so change listeners still fire (minus any re-entrancy:
    the sync layer guards against echoing its own writes). */
export function replaceProgress(p: ProgressV1): void {
  save({ ...structuredClone(EMPTY), ...p });
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

export function recordWritingAttempt(promptId: string, attempt: WritingAttempt): void {
  const p = getProgress();
  (p.writing[promptId] ??= []).push(attempt);
  save(p);
}

export function getWritingAttempts(promptId?: string): { promptId: string; attempt: WritingAttempt }[] {
  const p = getProgress();
  const ids = promptId ? [promptId] : Object.keys(p.writing);
  return ids
    .flatMap((id) => (p.writing[id] ?? []).map((attempt) => ({ promptId: id, attempt })))
    .sort((a, b) => a.attempt.at.localeCompare(b.attempt.at));
}

export function recordSpeakingAttempt(attempt: SpeakingAttempt): void {
  const p = getProgress();
  (p.speaking ??= []).push(attempt);
  save(p);
}

export function getSpeakingAttempts(): SpeakingAttempt[] {
  return [...(getProgress().speaking ?? [])].sort((a, b) => a.at.localeCompare(b.at));
}

export function getBestSpeakingBand(): number | null {
  const all = getProgress().speaking ?? [];
  if (all.length === 0) return null;
  return Math.max(...all.map((a) => a.overallBand));
}

export interface TypeStat {
  type: string;
  correct: number;
  total: number;
}

/** Accuracy per question type, aggregated across every recorded attempt for
    the given skill (default 'reading', since that's the only skill with
    scored attempts historically — attempts recorded before the `skill`
    field existed are treated as 'reading'). Only attempts that carry a
    `byType` breakdown contribute. */
export function getTypeStats(skill: 'reading' | 'listening' = 'reading'): TypeStat[] {
  const acc: Record<string, { correct: number; total: number }> = {};
  for (const attempts of Object.values(getProgress().tests)) {
    for (const a of attempts) {
      if (!a.byType) continue;
      if ((a.skill ?? 'reading') !== skill) continue;
      for (const [type, v] of Object.entries(a.byType)) {
        (acc[type] ??= { correct: 0, total: 0 });
        acc[type].correct += v.correct;
        acc[type].total += v.total;
      }
    }
  }
  return Object.entries(acc).map(([type, v]) => ({ type, ...v }));
}

export function getBestWritingBand(): number | null {
  const all = getWritingAttempts();
  if (all.length === 0) return null;
  return Math.max(...all.map(({ attempt }) => attempt.overallBand));
}

export function getBestBand(testId?: string): TestAttempt | null {
  const all = getAttempts(testId).filter(({ attempt }) => attempt.kind !== 'drill');
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

/** Union-merge two progress blobs (local + cloud) so nothing recorded on either
    device is lost. Attempts are additive and stamped with an ISO `at`, so they
    dedupe cleanly on that timestamp; completed lessons keep the earliest date. */
export function mergeProgress(a: ProgressV1, b: ProgressV1): ProgressV1 {
  const lessons: ProgressV1['lessons'] = { ...b.lessons };
  for (const [slug, v] of Object.entries(a.lessons)) {
    const other = lessons[slug];
    lessons[slug] = other && other.completedAt < v.completedAt ? other : v;
  }

  const mergeAttempts = <T extends { at: string }>(x: T[] = [], y: T[] = []): T[] => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of [...x, ...y]) {
      if (seen.has(item.at)) continue;
      seen.add(item.at);
      out.push(item);
    }
    return out.sort((m, n) => m.at.localeCompare(n.at));
  };

  const tests: ProgressV1['tests'] = {};
  for (const id of new Set([...Object.keys(a.tests), ...Object.keys(b.tests)])) {
    tests[id] = mergeAttempts(a.tests[id], b.tests[id]);
  }
  const writing: ProgressV1['writing'] = {};
  for (const id of new Set([...Object.keys(a.writing), ...Object.keys(b.writing)])) {
    writing[id] = mergeAttempts(a.writing[id], b.writing[id]);
  }

  return {
    version: 1,
    lessons,
    tests,
    writing,
    speaking: mergeAttempts(a.speaking ?? [], b.speaking ?? []),
  };
}
