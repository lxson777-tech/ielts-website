/* Study-plan storage, extracted from StudyPlan.tsx so the account-sync layer
   can read/write it too (the component is no longer the sole owner). Same
   localStorage-first contract as progress.ts: SSR, blocked storage and corrupt
   JSON all degrade to null. A change listener lets sync push on edit and lets
   an open StudyPlan refresh when a cloud pull updates the plan. */

export const STUDY_PLAN_KEY = 'ielts.studyplan.v1';

export interface SavedPlan {
  targetBand: string;
  /** ISO yyyy-mm-dd, or '' when the student hasn't booked a date */
  testDate: string;
  createdAt: string; // ISO datetime
  /** LEGACY. Indices into the old hand-written study-plan step list, which the
      course replaced. Position-based, so the numbers stopped meaning anything
      the moment the steps changed: never read this. Kept only so plans written
      by the previous version still parse and still sync, rather than being
      dropped on load. New completion goes in doneKeys. */
  done: number[];
  /** Completed course steps, by stable key (a progress key like
      'reading-paraphrase', or an 'extra:' key). Keys survive reordering,
      which is exactly what `done` failed to do. Lessons are not stored here:
      their completion is read from progress.lessons, the single source of
      truth. In practice this holds only the exam-readiness extras. */
  doneKeys?: string[];
  /** ISO yyyy-mm-dd, the day the plan was created. Optional so plans saved
      before the daily study-plan feature still load; src/lib/plan/schedule.ts
      fills it in from `createdAt` the first time it sees a plan without one,
      via ensurePlanStartDate(), and persists it so the schedule stays fixed
      relative to when the student actually started rather than shifting
      every time it's recomputed. */
  startDate?: string;
  /** Minutes the student wants to study on a study day. Optional, defaults
      to 25 (src/lib/plan/schedule.ts DEFAULT_DAILY_MINUTES) when unset, so
      plans saved before this field existed still load and schedule. */
  dailyMinutes?: 15 | 25 | 40 | 60;
  /** Which calendar days count as study days. Optional, defaults to 'daily'
      when unset. 'weekdays' means Monday-Friday only — used both to skip
      weekends when building the schedule and to decide which days count
      toward the streak. */
  studyDays?: 'daily' | 'weekdays';
  /** True only for the plan the app fabricates on a student's first visit
      (see createDefaultPlan() in src/lib/plan/schedule.ts) — never set once
      they've actually saved the settings strip's editor, even if they left
      every field unchanged. Drives the settings strip's quiet "set your
      exam date" hint instead of treating a guess as a real choice. */
  defaulted?: boolean;
}

/** The six target bands the course now offers, one decimal place, low to
    high. Shared by Course.tsx's two band selects so there is exactly one
    place that list is defined. A plan saved before this changed (2026-09,
    was 5.0-8.0) can still hold a value outside this list; see
    loadHomeTargetBand() and the clamp-with-a-note handling in Course.tsx for
    how that's kept from producing an invalid, unselectable <select>. */
export const TARGET_BANDS = ['6.5', '7.0', '7.5', '8.0', '8.5', '9.0'] as const;
export type TargetBand = (typeof TARGET_BANDS)[number];

/** localStorage key the homepage hero's band picker (src/scripts/home-game.ts)
    writes to. Read here too so Course.tsx can preselect a brand-new student's
    band from what they already picked on the homepage, without importing
    home-game.ts itself (that file runs browser-only scroll/animation setup
    as a side effect of being imported, which must not happen on every page
    that mounts Course). */
export const HOME_TARGET_BAND_KEY = 'ielts.ez.targetBand';

/** The homepage picker stores raw numbers-as-strings ('7', '8.5', not '7.0'),
    so this normalizes to the one-decimal form TARGET_BANDS and Course.tsx's
    selects use, and returns null for anything unset, blocked, unparsable, or
    outside the six bands the course offers (so an old/stray value can never
    hand Course.tsx something its own select doesn't list). */
export function loadHomeTargetBand(): TargetBand | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(HOME_TARGET_BAND_KEY);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    const normalized = n.toFixed(1);
    return (TARGET_BANDS as readonly string[]).includes(normalized) ? (normalized as TargetBand) : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

/** Subscribe to plan writes (local edits or cloud pulls). Returns unsubscribe. */
export function onStudyPlanChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a listener throwing must not break the writer */
    }
  }
}

export function loadStudyPlan(): SavedPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STUDY_PLAN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.targetBand !== 'string') return null;
    return { done: [], testDate: '', createdAt: '', ...p } as SavedPlan;
  } catch {
    return null;
  }
}

export function saveStudyPlan(p: SavedPlan): void {
  try {
    window.localStorage.setItem(STUDY_PLAN_KEY, JSON.stringify(p));
  } catch {
    /* storage blocked — the plan just won't persist, never fatal */
  }
  notify();
}

export function clearStudyPlan(): void {
  try {
    window.localStorage.removeItem(STUDY_PLAN_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

/** Merge two plans (local + cloud). The plan with the later createdAt wins;
    when they're the same plan (same target, date and creation), the completed
    steps are unioned so progress made on either device is never lost. */
export function mergeStudyPlans(a: SavedPlan | null, b: SavedPlan | null): SavedPlan | null {
  if (!a) return b;
  if (!b) return a;
  const samePlan = a.targetBand === b.targetBand && a.testDate === b.testDate && a.createdAt === b.createdAt;
  if (samePlan) {
    return {
      ...a,
      done: [...new Set([...a.done, ...b.done])].sort((x, y) => x - y),
      doneKeys: [...new Set([...(a.doneKeys ?? []), ...(b.doneKeys ?? [])])].sort(),
    };
  }
  return a.createdAt >= b.createdAt ? a : b;
}

/* ── Plan generation ────────────────────────────────────────────────────────
   Pulled in from StudyPlan.tsx so the account dashboard can compute "X% of
   your plan done" without duplicating the tier/stage logic. */

export type PlanTier = 'sprint' | 'month' | 'season' | 'foundation';

export const PLAN_TIER_LABEL: Record<PlanTier, string> = {
  sprint: 'Sprint plan',
  month: 'One-month plan',
  season: '2-3 month plan',
  foundation: 'Foundation plan',
};

/** Whole days from today until the test date (>=0), or null if no date given. */
export function daysUntilTest(testDate: string): number | null {
  if (!testDate) return null;
  const then = new Date(testDate + 'T00:00:00');
  if (Number.isNaN(then.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((then.getTime() - today.getTime()) / 86_400_000));
}

export function planTierFor(days: number | null): PlanTier {
  if (days === null) return 'foundation';
  if (days <= 14) return 'sprint';
  if (days <= 35) return 'month';
  if (days <= 90) return 'season';
  return 'foundation';
}
