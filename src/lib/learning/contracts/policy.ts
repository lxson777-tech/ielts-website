/* The one evidence policy.
 *
 * Today there are three, and they disagree:
 *   src/lib/tutor/insights.ts   MEASURED vs TENTATIVE, 8 questions across 2
 *                               sittings, 65% weak, 80% strong
 *   src/lib/level.ts            recency-weighted mean, 6-attempt window,
 *                               decay 0.65, drills at 0.6 weight
 *   src/components/ProgressReport.tsx  raw lifetime totals, best band, and
 *                               one trend line joining four different papers
 *
 * A student can therefore be told three different things about the same
 * work. This module is the single answer, and the planner, the tutor and
 * every report read it.
 *
 * WHAT IT KEEPS FROM insights.ts
 * The honest stamping. Every claim carries its evidence and how far it may
 * be pushed. `Certainty` below is that idea widened from two values to five,
 * because "we have never measured this" and "they told us themselves" are
 * genuinely different from "one thin occasion".
 *
 * WHAT IT REFUSES TO DO
 * It never produces an authoritative overall IELTS band from a partial
 * exercise. It separates Writing Task 1 from Task 2 and Speaking by part. It
 * ignores blank and abandoned submissions and repeat submissions of material
 * the student has already seen. It does not turn Vocabulary into a fifth
 * paper.
 *
 * EVERY THRESHOLD HERE IS PROVISIONAL.
 * They are explicit, named and configurable so a teacher can change them
 * after review. None of them is validated IELTS science and nothing in the
 * interface may present them as such.
 */

import type { Paper, Subskill, WritingCriterion, SpeakingCriterion } from './catalog';

/* ── How sure we are ─────────────────────────────────────────────────────── */

/** Five levels, ordered. The interface must render each one differently; a
    `limited` estimate shown like a `measured` one is the bug this type
    exists to prevent. */
export type Certainty =
  /** Nothing at all. Shown as unknown, never as a number. */
  | 'unknown'
  /** The student told us. Carries a date and stays labelled forever. */
  | 'self-reported'
  /** Real evidence, but without the detail to say much: a migrated legacy
      score with only per-type tallies, or a single assisted attempt. */
  | 'limited'
  /** Seen, but once or thinly. Speak about it as one occasion. */
  | 'tentative'
  /** Enough independent evidence, recent enough, to call it a pattern. */
  | 'measured';

export const CERTAINTY_ORDER: readonly Certainty[] = [
  'unknown',
  'self-reported',
  'limited',
  'tentative',
  'measured',
] as const;

/* ── What an estimate is about ───────────────────────────────────────────── */

/** The thing being estimated. Writing and Speaking are never estimated as a
    single paper without saying which task or part the evidence came from,
    because a Task 1 report and a Task 2 essay are different skills marked on
    different criteria. */
export type PolicyScope =
  | { kind: 'paper'; paper: Paper }
  | { kind: 'writing-task'; task: 'task1' | 'task2' }
  | { kind: 'speaking-part'; part: 1 | 2 | 3 }
  | { kind: 'criterion'; paper: 'writing' | 'speaking'; criterion: WritingCriterion | SpeakingCriterion }
  | { kind: 'subskill'; paper: Paper; subskill: Subskill }
  | { kind: 'vocabulary' };

/** A stable string form of a scope, used as a map key and in change
    history. e.g. 'paper:reading', 'writing-task:task1',
    'subskill:reading:matching-headings'. */
export type PolicyScopeKey = string;

/* ── What comes out ──────────────────────────────────────────────────────── */

export interface EvidenceCount {
  /** Independent occasions: separate sittings, first answers, no help,
      material not seen before. This is the number that earns `measured`. */
  independentOccasions: number;
  /** Occasions where help was used or the material had been seen. Counted,
      shown, but never sufficient on their own. */
  assistedOccasions: number;
  /** Items answered independently, across those occasions. */
  independentItems: number;
  /** Days since the most recent independent occasion, or null when there
      has never been one. */
  daysSinceLatest: number | null;
  /** Events that were ignored and why, so a report can say "two blank
      submissions were not counted" rather than silently dropping them. */
  ignored: readonly { reason: IgnoredReason; count: number }[];
}

export type IgnoredReason =
  | 'blank'
  | 'abandoned'
  | 'repeat-of-seen-material'
  | 'stub-graded'
  | 'simulated'
  | 'superseded'
  | 'stale-content-version';

/** One conclusion, with its evidence and its limits attached. The successor
    to src/lib/tutor/insights.ts Observation, and deliberately the same
    shape of honesty. */
export interface AbilityEstimate {
  scope: PolicyScope;
  scopeKey: PolicyScopeKey;
  certainty: Certainty;
  /** Band estimate, only where a band is meaningful AND the evidence
      supports one. Null for a subskill, for vocabulary, and whenever
      certainty is 'unknown' or the only evidence is partial exercises. */
  band: number | null;
  /** Honest interval around `band`, widened when evidence is thin. Null
      whenever `band` is null. */
  range: readonly [low: number, high: number] | null;
  /** Accuracy, for scopes where per-item correctness is the natural
      measure (a Reading question type). 0 to 100, or null. */
  percent: number | null;
  evidence: EvidenceCount;
  /** Movement across the evidence, or null when there is not enough to say.
      Never rendered as a trend line joining different papers. */
  trend: number | null;
  /** True when the student has never been assessed on this at all, so the
      planner knows to schedule a diagnostic rather than a drill. */
  needsAssessment: boolean;
}

/** How far the student is from what they need, per scope. Uses BOTH the
    overall target and the per-paper minimum, which is the audit's finding
    number 2. */
export interface GapAssessment {
  scopeKey: PolicyScopeKey;
  scope: PolicyScope;
  /** The band this scope has to reach: the student's own per-paper minimum
      where they set one, otherwise their overall target. */
  requiredBand: number | null;
  /** requiredBand minus the estimate, in bands. Negative means the
      requirement is already met. Null when either side is unknown. */
  shortfall: number | null;
  /** True when this paper already meets its own minimum even though it is
      the student's lowest. The audit's "do not treat a low relative
      criterion as a serious gap when it already meets the requirement". */
  meetsRequirement: boolean;
  /** How much the overall average still needs, spread across the papers,
      so a student can be short overall while every minimum is met. */
  contributesToOverallShortfall: boolean;
}

/** Something due to be reviewed again, from spacing rather than from a
    weakness. */
export interface ReviewDue {
  scopeKey: PolicyScopeKey;
  /** The activity to run, chosen from the catalogue. */
  activityId: string;
  dueOn: string;
  /** How long since it was last demonstrated. */
  daysSinceDemonstrated: number;
}

/** Everything the policy produces in one pass. Computed from a
    LearnerRecordV1 plus the goals; pure, no storage, no clock of its own
    (the caller passes `now`). */
export interface PolicyOutputV1 {
  version: 1;
  /** The evidence version this was computed from. */
  evidenceVersion: number;
  computedAt: string;
  estimates: readonly AbilityEstimate[];
  gaps: readonly GapAssessment[];
  dueReview: readonly ReviewDue[];
  /** Scopes with no usable evidence, in display order, so the interface can
      show unknown as unknown rather than as a low score. */
  unknownScopes: readonly PolicyScopeKey[];
  /** An overall band ONLY when every one of the four papers has at least
      `tentative` evidence from a complete paper or a full graded task.
      Null otherwise, and null is the honest answer far more often than the
      current /report page admits. */
  overall: { band: number; certainty: Certainty; range: readonly [number, number] } | null;
  /** A short, stable fingerprint of everything above, for cache keys. Same
      idea and the same fnv1a hash as insightsFingerprint in
      src/lib/tutor/insights.ts. */
  fingerprint: string;
}

/* ── Thresholds. All provisional, all configurable. ──────────────────────── */

/** Everything the policy can be tuned by, in one object so a teacher review
    can change it in one place and the tests can pin it. */
export interface PolicyThresholds {
  /** Independent items on one subskill before a low score is a pattern
      rather than a bad morning. Carried over from insights.ts. */
  patternMinItems: number;
  /** Across at least this many separate occasions. Eight items inside one
      sitting is still one occasion. */
  patternMinOccasions: number;
  /** Enough to mention at all, with a hedge. */
  tentativeMinItems: number;
  /** Below this percentage a subskill counts as weak. */
  weakPercent: number;
  /** At or above this it counts as a strength worth naming. */
  strongPercent: number;
  /** Graded pieces before "this criterion is consistently lowest" is a
      pattern. */
  criterionMinGraded: number;
  /** How many recent graded pieces a criterion trend looks at. */
  criterionWindow: number;
  /** Independent occasions on a whole paper before a band estimate is
      `measured` rather than `tentative`. */
  bandMeasuredMinPapers: number;
  /** Days after which independent evidence stops counting as current. Past
      this an estimate decays toward `tentative` and review becomes due. */
  freshnessDays: number;
  /** Days after which it is dropped from the estimate entirely. */
  staleDays: number;
  /** Half-band margin shown either side of an estimate, by certainty. */
  marginByCertainty: Readonly<Record<Certainty, number>>;
  /** A single-passage drill is a noisier sample than a full paper, so it
      contributes proportionally less. Carried over from level.ts. */
  drillWeight: number;
  /** An assisted occasion's weight when nothing independent exists at all.
      Never enough to reach `measured` on its own. */
  assistedWeight: number;
  /** Spacing ladder, in days, for scheduling a re-check of something
      already demonstrated. */
  reviewSpacingDays: readonly number[];
  /** Consecutive failures on the same subskill after which the plan stops
      offering more of the same drill and flags it for teacher review. */
  repeatedDifficultyLimit: number;
}

/** The starting values. Chosen to preserve today's tutor behaviour where it
    was already right (the first six are exactly insights.ts's numbers) and
    to state the rest explicitly for the first time. Provisional: a teacher
    review during the pilot is expected to move several of them. */
export const DEFAULT_POLICY_THRESHOLDS: PolicyThresholds = {
  patternMinItems: 8,
  patternMinOccasions: 2,
  tentativeMinItems: 4,
  weakPercent: 65,
  strongPercent: 80,
  criterionMinGraded: 2,
  criterionWindow: 4,
  bandMeasuredMinPapers: 2,
  freshnessDays: 21,
  staleDays: 120,
  marginByCertainty: {
    unknown: 0,
    'self-reported': 1.5,
    limited: 1.5,
    tentative: 1,
    measured: 0.5,
  },
  drillWeight: 0.6,
  assistedWeight: 0.25,
  reviewSpacingDays: [3, 7, 16, 35],
  repeatedDifficultyLimit: 3,
};

/** The lowest band the official Academic Reading table defines. Reading
    contributions are floored here, same as level.ts does today. */
export const MIN_REPORTABLE_BAND = 2.5;

/** Evidence migrated from ProgressV1 has per-question-type tallies and no
    item detail, so it can never exceed this certainty no matter how much of
    it there is. Fabricating the missing detail is not an option. */
export const LEGACY_MAX_CERTAINTY: Certainty = 'limited';

/** A self-reported score never exceeds this, whatever the student says. */
export const SELF_REPORTED_MAX_CERTAINTY: Certainty = 'self-reported';

/** A partial exercise (a focused exercise, a lesson check, a drill) can
    inform a subskill estimate but never a paper band. */
export const PARTIAL_EXERCISE_CAN_SET_BAND = false;
