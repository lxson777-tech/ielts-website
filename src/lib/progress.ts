/* localStorage-backed progress store. Versioned so a future account-sync
   can migrate v1 data. All storage access is guarded: SSR, disabled
   storage (private mode), and corrupt JSON all degrade to empty state.

   WHOSE PROGRESS (22 September 2026)
   This store used to be one shared pile under `ielts.progress.v1`, with
   nobody's name on it, so signing in as a second student on the same browser
   merged the first student's attempts and essays into the second account and
   uploaded them under the second account's id. Every read and write below now
   resolves its key through src/lib/store-owner.ts, which answers with the
   signed-in student or this browser's anonymous device owner. Nothing about
   the shape, the merge rules or the quota fallbacks changed, and every caller
   (getProgress, saveProgress, the history screens) keeps working unchanged.

   The old device-wide key is still there and is never emptied: store-owner.ts
   copies it, once, into the key of whichever owner the device says it belongs
   to (see the rules in that file's header). */

import type { CriterionKey, CriterionScore, MechanicsReport, Moment } from './writing/schema';
import type { CacheOwner } from './learning/contracts/sync';
import {
  PROGRESS_STORE_KEY,
  currentOwner,
  deviceStorage,
  onOwnerChange,
  registerLegacyStoreMerge,
  sameOwner,
  scopedKey,
  scopedKeyIn,
} from './store-owner';

/** The store's base key, unchanged. What actually reaches localStorage is
    this plus the owner, for example 'ielts.progress.v1::u:9f0c'. */
export const PROGRESS_KEY = PROGRESS_STORE_KEY;

const KEY = PROGRESS_STORE_KEY;

/** Where this device keeps `owner`'s progress. */
function keyFor(owner: CacheOwner): string {
  return scopedKeyIn(deviceStorage(), KEY, owner);
}

/* The 2026-09 IELTS question-type restructure renamed a handful of lesson
   slugs (see src/data/reading.ts and src/data/listening.ts): the store
   version stays 1 since the shape of ProgressV1 hasn't changed, only some
   of the string keys inside `lessons` — a version bump would be overkill
   for a rename. Applied once, right where progress is read (both the local
   copy here and the Supabase-pulled copy via mergeProgress, see
   src/lib/auth/sync.ts) so a student who completed "Categorisation" or
   "Section 1" before the rename doesn't lose that checkmark. Safe to run
   on already-migrated data: a key not in this map passes through unchanged. */
const RENAMED_LESSON_KEYS: Record<string, string> = {
  'reading-cat': 'reading-matching-features',
  'reading-para': 'reading-matching-information',
  'listening-section1': 'listening-part1',
  'listening-section2': 'listening-part2',
  'listening-section3': 'listening-part3',
  'listening-section4': 'listening-part4',
};

function migrateLessons(lessons: ProgressV1['lessons']): ProgressV1['lessons'] {
  const out: ProgressV1['lessons'] = {};
  for (const [slug, v] of Object.entries(lessons)) {
    const migratedSlug = RENAMED_LESSON_KEYS[slug] ?? slug;
    // If both the old and new key somehow exist (e.g. completed under the
    // new slug on one device, the old slug on another before syncing), keep
    // whichever was completed first rather than letting map order decide.
    const existing = out[migratedSlug];
    out[migratedSlug] = existing && existing.completedAt < v.completedAt ? existing : v;
  }
  return out;
}

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

/** The parts of GradeResult (src/lib/writing/schema.ts) needed to re-render
    the full band report later: the same criteria cards, moments,
    strengths/improvements and action plan the student saw right after
    grading, via the shared <BandReport>. Saved alongside the score row so
    "Open" on a past attempt in WritingHistory isn't limited to the essay
    text.

    Roughly 5-10 KB of JSON per report (the grading Worker already caps
    every string field it returns), against localStorage's ~5 MB budget —
    generous enough that no pruning beyond recordWritingAttempt's
    MAX_SAVED_REPORTS cap (see below) is needed. */
export interface SavedEssayReport {
  criteria: Record<CriterionKey, CriterionScore>;
  moments: Moment[];
  strengths: string[];
  improvements: string[];
  actionPlan?: string[];
  /** Only the fields the report screen actually renders (the mechanics Stat
      row + its notes) — no reason to store overusedWords, spellingFlags,
      topicOverlap etc. that never reach the screen. */
  mechanics: Pick<
    MechanicsReport,
    'wordCount' | 'sentenceCount' | 'lexicalDiversity' | 'linkingDevices' | 'underLength' | 'notes'
  >;
  grader: { name: string; live: boolean };
}

export interface WritingAttempt {
  at: string; // ISO datetime
  overallBand: number;
  /** band per criterion key (taskResponse/coherenceCohesion/lexicalResource/grammaticalRange) */
  criteria: Record<string, number>;
  wordCount: number;
  /** whether this came from the live AI grader or the offline stub */
  live: boolean;
  /** the submitted essay text, so students can reread their answers later.
      Optional so attempts recorded before this feature still load. */
  essay?: string;
  /** the prompt's title at the time of grading, so history reads correctly
      even if a prompt is later renamed or removed from the pool. Optional
      so attempts recorded before this field existed still load (those fall
      back to a live lookup by promptId). */
  promptTitle?: string;
  /** Optional so attempts recorded before this field existed still load. */
  task?: 'task1' | 'task2';
  /** The full report, for "Open" in WritingHistory to re-render. Optional:
      older attempts, and any attempt past the MAX_SAVED_REPORTS cap, don't
      have one — those show the essay text only. */
  report?: SavedEssayReport;
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

/** One local calendar day's study activity, for the daily-goal bar and the
    streak (src/lib/plan/streak.ts). Minutes are estimated per item at the
    point of recording (see the bumpActivity() call sites below), not
    measured wall-clock time: a lesson always counts as 12 minutes, a drill
    10, a full test 60 (40 for listening), an essay session 40, a speaking
    attempt 10, regardless of how long the student actually spent. Good
    enough for "did you show up today", not a time tracker. */
export interface DayActivity {
  minutes: number;
  lessons: number;
  attempts: number;
}

export interface ProgressV1 {
  version: 1;
  lessons: Record<string, { completedAt: string }>;
  tests: Record<string, TestAttempt[]>;
  writing: Record<string, WritingAttempt[]>;
  speaking: SpeakingAttempt[];
  /** Keyed by local YYYY-MM-DD (see src/lib/plan/date.ts toLocalDateKey).
      Optional so progress saved before this field existed still loads: the
      store version stays 1 (see the migration note on RENAMED_LESSON_KEYS
      above), every reader treats a missing key as "no activity that day"
      rather than throwing. */
  activity?: Record<string, DayActivity>;
}

const EMPTY: ProgressV1 = { version: 1, lessons: {}, tests: {}, writing: {}, speaking: [], activity: {} };

/** Local YYYY-MM-DD for an ISO instant (or now). Kept in step with
    src/lib/plan/date.ts's toLocalDateKey but duplicated here rather than
    imported, so progress.ts (used everywhere, including by lesson and test
    pages that never touch the study plan) has no dependency on src/lib/plan. */
function localDateKey(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Add to a day's activity tally in place. Callers still go through save()
    afterwards, same as every other mutation in this file. */
function bumpActivity(p: ProgressV1, date: string, delta: Partial<DayActivity>): void {
  p.activity ??= {};
  const cur = p.activity[date] ?? { minutes: 0, lessons: 0, attempts: 0 };
  p.activity[date] = {
    minutes: cur.minutes + (delta.minutes ?? 0),
    lessons: cur.lessons + (delta.lessons ?? 0),
    attempts: cur.attempts + (delta.attempts ?? 0),
  };
}

/** The full activity log, local-date keys to minutes/lessons/attempts. */
export function getActivity(): Record<string, DayActivity> {
  return getProgress().activity ?? {};
}

export function getDayActivity(date: string): DayActivity {
  return getActivity()[date] ?? { minutes: 0, lessons: 0, attempts: 0 };
}

/** One named owner's progress. Used by the sign-in path and by the
    anonymous-work claim, which both have to read a copy that is deliberately
    not the current one. Every other caller wants getProgress() below. */
export function getProgressFor(owner: CacheOwner): ProgressV1 {
  if (typeof window === 'undefined') return structuredClone(EMPTY);
  try {
    const raw = window.localStorage.getItem(keyFor(owner));
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return structuredClone(EMPTY);
    const merged: ProgressV1 = { ...structuredClone(EMPTY), ...parsed };
    return { ...merged, lessons: migrateLessons(merged.lessons) };
  } catch {
    return structuredClone(EMPTY);
  }
}

/** The progress of whoever is using this browser right now: the signed-in
    student, or this device's anonymous owner. */
export function getProgress(): ProgressV1 {
  if (typeof window === 'undefined') return structuredClone(EMPTY);
  return getProgressFor(currentOwner());
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
    window.localStorage.setItem(scopedKey(KEY), JSON.stringify(p));
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

/** Write one NAMED owner's copy, for a grade that arrived after the page had
    moved on to somebody else (see runOwnedGrade in store-owner.ts). The
    screens are told only when that owner is the one they are showing: a
    write into another student's copy changes nothing anybody is looking at,
    and the account sync must not be nudged into a push for the wrong
    student. */
function saveFor(owner: CacheOwner, p: ProgressV1): void {
  if (!sameOwner(owner, currentOwner())) {
    try {
      window.localStorage.setItem(keyFor(owner), JSON.stringify(p));
    } catch {
      /* storage full/blocked, same as save() */
    }
    return;
  }
  save(p);
}

/** Overwrite the whole store — used when a cloud pull brings down merged state.
    Goes through save() so change listeners still fire (minus any re-entrancy:
    the sync layer guards against echoing its own writes). */
export function replaceProgress(p: ProgressV1): void {
  save({ ...structuredClone(EMPTY), ...p });
}

export function markLessonComplete(slug: string): void {
  const p = getProgress();
  const at = new Date().toISOString();
  p.lessons[slug] = { completedAt: at };
  bumpActivity(p, localDateKey(at), { minutes: 12, lessons: 1 });
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
  const minutes = attempt.kind === 'drill' ? 10 : attempt.skill === 'listening' ? 40 : 60;
  bumpActivity(p, localDateKey(attempt.at), { minutes, attempts: 1 });
  save(p);
}

export function getAttempts(testId?: string): { testId: string; attempt: TestAttempt }[] {
  const p = getProgress();
  const ids = testId ? [testId] : Object.keys(p.tests);
  return ids
    .flatMap((id) => (p.tests[id] ?? []).map((attempt) => ({ testId: id, attempt })))
    .sort((a, b) => a.attempt.at.localeCompare(b.attempt.at));
}

/** How many attempts, across every prompt, keep their full `report`. Beyond
    this the score row (band, criteria bands, wordCount, essay text, …)
    stays forever — only the larger re-render payload is dropped from the
    oldest attempts. Local-only storage for one student, so this is a
    generous ceiling, not a tight budget (see SavedEssayReport above). */
const MAX_SAVED_REPORTS = 60;

/** Keep at most MAX_SAVED_REPORTS reports, newest first, across the whole
    writing store. Mutates the attempt objects in `p.writing` in place —
    safe here since every caller re-reads via getProgress() right before. */
function pruneWritingReports(p: ProgressV1): void {
  const withReports = Object.values(p.writing)
    .flat()
    .filter((a) => a.report)
    .sort((a, b) => b.at.localeCompare(a.at));
  for (const attempt of withReports.slice(MAX_SAVED_REPORTS)) {
    delete attempt.report;
  }
}

export function recordWritingAttempt(promptId: string, attempt: WritingAttempt): void {
  recordWritingAttemptFor(currentOwner(), promptId, attempt);
}

/** The same, into one named owner's copy: the student the essay was
    submitted by, even when somebody else is using the browser by the time
    the grade comes back. */
export function recordWritingAttemptFor(owner: CacheOwner, promptId: string, attempt: WritingAttempt): void {
  const p = getProgressFor(owner);
  (p.writing[promptId] ??= []).push(attempt);
  pruneWritingReports(p);
  // No real duration is recorded for a writing session, so this uses a flat
  // estimate for a Task 2 essay (roughly the exam's own 40-minute budget for
  // it), same spirit as the other per-item minute estimates above.
  bumpActivity(p, localDateKey(attempt.at), { minutes: 40, attempts: 1 });
  saveFor(owner, p);
}

export function getWritingAttempts(promptId?: string): { promptId: string; attempt: WritingAttempt }[] {
  const p = getProgress();
  const ids = promptId ? [promptId] : Object.keys(p.writing);
  return ids
    .flatMap((id) => (p.writing[id] ?? []).map((attempt) => ({ promptId: id, attempt })))
    .sort((a, b) => a.attempt.at.localeCompare(b.attempt.at));
}

export function recordSpeakingAttempt(attempt: SpeakingAttempt): void {
  recordSpeakingAttemptFor(currentOwner(), attempt);
}

/** The same, into one named owner's copy: the student who spoke, even when
    somebody else is using the browser by the time the grade comes back. */
export function recordSpeakingAttemptFor(owner: CacheOwner, attempt: SpeakingAttempt): void {
  const p = getProgressFor(owner);
  (p.speaking ??= []).push(attempt);
  // Estimate: one part of the interview, not a full mock (see the flat
  // Task-2 estimate in recordWritingAttempt for the same reasoning).
  bumpActivity(p, localDateKey(attempt.at), { minutes: 10, attempts: 1 });
  saveFor(owner, p);
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

export function getBestBand(
  testId?: string,
  skill: 'reading' | 'listening' = 'reading',
): TestAttempt | null {
  const all = getAttempts(testId).filter(
    ({ attempt }) => attempt.kind !== 'drill' && (attempt.skill ?? 'reading') === skill,
  );
  if (all.length === 0) return null;
  return all.reduce((best, cur) => (cur.attempt.band > best.band ? cur.attempt : best), all[0]!.attempt);
}

/** Clears the CURRENT owner's progress only. Another student's copy on this
    browser is under their own key and is not touched, and neither is the old
    device-wide key. */
export function resetProgress(): void {
  try {
    window.localStorage.removeItem(scopedKey(KEY));
  } catch {
    /* ignore */
  }
}

/** Union-merge two progress blobs (local + cloud) so nothing recorded on either
    device is lost. Attempts are additive and stamped with an ISO `at`, so they
    dedupe cleanly on that timestamp; completed lessons keep the earliest date. */
export function mergeProgress(a: ProgressV1, b: ProgressV1): ProgressV1 {
  // Normalise both sides first: `a` is usually already-migrated local
  // storage (getProgress() migrates on read), but `b` is a raw Supabase
  // pull (see src/lib/auth/sync.ts) that may still carry pre-rename keys
  // from before this device last synced, or from another device that
  // hasn't opened the app since the rename shipped.
  const aLessons = migrateLessons(a.lessons);
  const bLessons = migrateLessons(b.lessons);
  const lessons: ProgressV1['lessons'] = { ...bLessons };
  for (const [slug, v] of Object.entries(aLessons)) {
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

  // Activity is a running per-day tally rather than a list of dated events,
  // so it can't dedupe on a timestamp like the attempts above. Take the max
  // of each field per day instead of summing: the two sides are usually the
  // same device's local copy and a stale cloud copy of it, and summing would
  // double-count everything that already made it to the cloud. This can
  // under-count genuine activity split across two devices on the same day,
  // which is an acceptable trade-off for a streak indicator.
  const activity: NonNullable<ProgressV1['activity']> = {};
  for (const date of new Set([...Object.keys(a.activity ?? {}), ...Object.keys(b.activity ?? {})])) {
    const av = a.activity?.[date];
    const bv = b.activity?.[date];
    activity[date] =
      av && bv
        ? {
            minutes: Math.max(av.minutes, bv.minutes),
            lessons: Math.max(av.lessons, bv.lessons),
            attempts: Math.max(av.attempts, bv.attempts),
          }
        : (av ?? bv)!;
  }

  const merged: ProgressV1 = {
    version: 1,
    lessons,
    tests,
    writing,
    speaking: mergeAttempts(a.speaking ?? [], b.speaking ?? []),
    activity,
  };
  // Two devices merging can each bring their own recent reports; re-apply
  // the same cap so a merge can't push the store past it.
  pruneWritingReports(merged);
  return merged;
}

/* The rule for joining two copies of this store on one device, for the
   explicit "the work I did before signing in" claim. It is the SAME
   union-merge two devices already use, registered rather than reimplemented,
   so there is never a second version of it to drift. Raw JSON in, raw JSON
   out, and null for anything that does not parse as a v1 store, which leaves
   both copies exactly where they are. */
registerLegacyStoreMerge(KEY, (mine, theirs) => {
  try {
    const a = JSON.parse(mine) as ProgressV1;
    const b = JSON.parse(theirs) as ProgressV1;
    if (a?.version !== 1 || b?.version !== 1) return null;
    return JSON.stringify(mergeProgress(a, b));
  } catch {
    return null;
  }
});

/* A change of owner changes what every reader should be showing, so the same
   listeners that fire on a write fire on a sign-in, a sign-out and an account
   switch too. Without this a screen that had already read the previous
   owner's progress would keep showing it until the next write. */
onOwnerChange(() => {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a listener throwing must not break a sign-in */
    }
  }
});
