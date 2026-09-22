/* Study-plan storage, extracted from StudyPlan.tsx so the account-sync layer
   can read/write it too (the component is no longer the sole owner). Same
   localStorage-first contract as progress.ts: SSR, blocked storage and corrupt
   JSON all degrade to null. A change listener lets sync push on edit and lets
   an open StudyPlan refresh when a cloud pull updates the plan.

   WHOSE PLAN (22 September 2026)
   Like progress.ts, this store used to be one shared pile with nobody's name
   on it, so signing in as a second student on this browser handed them the
   first student's target band and exam date, and uploaded it under their id.
   Every read and write below resolves its key through src/lib/store-owner.ts
   instead, which answers with the signed-in student or this browser's
   anonymous device owner. Nothing else about the plan changed. */

import { nt } from './i18n/translate';
import type { CacheOwner } from './learning/contracts/sync';
import {
  STUDY_PLAN_STORE_KEY,
  currentOwner,
  deviceStorage,
  onOwnerChange,
  registerLegacyStoreMerge,
  scopedKey,
  scopedKeyIn,
} from './store-owner';

/** The store's base key, unchanged. What reaches localStorage is this plus
    the owner, for example 'ielts.studyplan.v1::u:9f0c'. */
export const STUDY_PLAN_KEY = STUDY_PLAN_STORE_KEY;

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
      plans saved before this field existed still load and schedule.
      90 was added on 2026-09-22 so the derived copy of the personal plan
      (lead decision D1) can hold every value DAILY_MINUTE_CHOICES offers
      rather than quietly rounding a student's real commitment down. */
  dailyMinutes?: 15 | 25 | 40 | 60 | 90;
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
  /** Optional minimum band per paper. Universities usually ask for an overall
      band AND a floor in every paper ("6.5 overall with no band below 6.0"),
      so one overall target is not enough to aim at. Any paper left out here
      falls back to targetBand (see skillTargetFor). Values are strings from
      SKILL_TARGET_BANDS; loadStudyPlan drops anything else. */
  skillTargets?: Partial<Record<PlanSkill, string>>;
}

/** The four papers a band is reported for. Vocabulary is a site section, not a
    paper, so it never gets a target. */
export const PLAN_SKILLS = ['listening', 'reading', 'writing', 'speaking'] as const;
export type PlanSkill = (typeof PLAN_SKILLS)[number];

export const PLAN_SKILL_LABEL: Record<PlanSkill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

/** Bands a per-paper minimum may be set to. Wider than TARGET_BANDS on purpose:
    a student aiming at 7.0 overall may only need 6.0 in each paper, and that
    floor is the number that decides whether an application is accepted. */
export const SKILL_TARGET_BANDS = ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'] as const;

/** Keep only the four papers, and only bands we offer. Anything else (an old
    key, a hand-edited value, a number instead of a string) is dropped rather
    than rendered into a select that cannot show it. Returns undefined when
    nothing survives, so the plan stays exactly as it was before the feature. */
export function sanitiseSkillTargets(value: unknown): SavedPlan['skillTargets'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const out: Partial<Record<PlanSkill, string>> = {};
  for (const skill of PLAN_SKILLS) {
    const band = (value as Record<string, unknown>)[skill];
    if (typeof band === 'string' && (SKILL_TARGET_BANDS as readonly string[]).includes(band)) {
      out[skill] = band;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/** The band this student is aiming at in one paper: their own minimum when
    they set one, otherwise the overall target. */
export function skillTargetFor(plan: SavedPlan | null, skill: PlanSkill): string | null {
  if (!plan) return null;
  return plan.skillTargets?.[skill] ?? plan.targetBand ?? null;
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

/** One named owner's plan. Used by the sign-in path and by the
    anonymous-work claim, which both have to read a copy that is deliberately
    not the current one. Every other caller wants loadStudyPlan() below. */
export function loadStudyPlanFor(owner: CacheOwner): SavedPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(scopedKeyIn(deviceStorage(), STUDY_PLAN_KEY, owner));
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.targetBand !== 'string') return null;
    const plan = { done: [], testDate: '', createdAt: '', ...p } as SavedPlan;
    const skillTargets = sanitiseSkillTargets(plan.skillTargets);
    if (skillTargets) plan.skillTargets = skillTargets;
    else delete plan.skillTargets;
    return plan;
  } catch {
    return null;
  }
}

/** The plan of whoever is using this browser right now. */
export function loadStudyPlan(): SavedPlan | null {
  if (typeof window === 'undefined') return null;
  return loadStudyPlanFor(currentOwner());
}

/** Save one named owner's plan. Used by the plan store, which is told whose
    plan it is holding rather than assuming it is the current one. */
export function saveStudyPlanFor(owner: CacheOwner, p: SavedPlan): void {
  try {
    window.localStorage.setItem(scopedKeyIn(deviceStorage(), STUDY_PLAN_KEY, owner), JSON.stringify(p));
  } catch {
    /* storage blocked — the plan just won't persist, never fatal */
  }
  notify();
}

export function saveStudyPlan(p: SavedPlan): void {
  saveStudyPlanFor(currentOwner(), p);
}

/** Clears the CURRENT owner's plan only. Another student's copy on this
    browser is under their own key and is not touched. */
export function clearStudyPlan(): void {
  try {
    window.localStorage.removeItem(scopedKey(STUDY_PLAN_KEY));
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

/* The rule for joining two copies of this store on one device, for the
   explicit "the work I did before signing in" claim. The SAME rule two
   devices already use, registered rather than reimplemented. Raw JSON in,
   raw JSON out, and null for anything that does not parse as a plan, which
   leaves both copies exactly where they are. */
registerLegacyStoreMerge(STUDY_PLAN_KEY, (mine, theirs) => {
  try {
    const a = JSON.parse(mine) as SavedPlan | null;
    const b = JSON.parse(theirs) as SavedPlan | null;
    if (typeof a?.targetBand !== 'string' || typeof b?.targetBand !== 'string') return null;
    const merged = mergeStudyPlans(a, b);
    return merged ? JSON.stringify(merged) : null;
  } catch {
    return null;
  }
});

/* ── Plan generation ────────────────────────────────────────────────────────
   Pulled in from StudyPlan.tsx so the account dashboard can compute "X% of
   your plan done" without duplicating the tier/stage logic. */

export type PlanTier = 'sprint' | 'month' | 'season' | 'foundation';

export const PLAN_TIER_LABEL: Record<PlanTier, string> = {
  sprint: nt('Sprint plan'),
  month: nt('One-month plan'),
  season: nt('2-3 month plan'),
  foundation: nt('Foundation plan'),
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

/* Same as progress.ts: a sign-in, a sign-out or an account switch changes
   whose plan the screens should be showing, so it notifies exactly as a save
   does. */
onOwnerChange(notify);
