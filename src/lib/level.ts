/* "Your current approximate level": one estimated overall band, built from
   the SAME evidence policy every other surface reads
   (src/lib/learning/policy.ts evaluateEvidence). This file used to run its
   own recency-weighted mean over src/lib/progress.ts with its own decay,
   window and drill weight (architecture section 1.3's second competing
   policy). All of that is gone. What is left is a thin view: read the
   student's real plan and learner record, ask the policy what it knows, and
   shape the answer for this one widget.

   WHY THE OVERALL NUMBER CAN NOW BE NULL MORE OFTEN
   The old version averaged whatever papers happened to be covered, so one
   good Reading score could stand in for a number called "your overall
   level". The policy refuses to do that: `overall` is null unless all four
   papers carry at least tentative evidence from a whole attempt
   (contracts/policy.ts PolicyOutputV1.overall). That is the honest answer
   far more often than the old blended figure was, and CurrentLevel.tsx is
   written to show the four papers on their own while that number is still
   building rather than hide behind an empty state.

   This module is browser-only (it reads the student's live plan and
   record), so it is never imported by the Mr EZ Worker. src/lib/tutor/
   insights.ts is the thin view for the Worker's side of the same policy. */

import { ensurePlan, readLearnerRecord } from './learning';
import { evaluateEvidence } from './learning/policy';
import type { Certainty, PolicyOutputV1 } from './learning/contracts/policy';
import { nt } from './i18n/translate';

export type LevelSkill = 'reading' | 'listening' | 'writing' | 'speaking';

export const LEVEL_SKILLS: LevelSkill[] = ['reading', 'listening', 'writing', 'speaking'];

export const SKILL_LABEL: Record<LevelSkill, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

/** Where to send a student who has no evidence (or weak evidence) for a
    skill. Paths are base-less; callers wrap them in withBase(). */
export const SKILL_PRACTICE: Record<LevelSkill, { label: string; href: string }> = {
  reading: { label: nt('Take a reading test'), href: '/tests' },
  listening: { label: nt('Take a listening test'), href: '/tests#listening-tests' },
  writing: { label: nt('Get an essay graded'), href: '/trainers/writing' },
  speaking: { label: nt('Speak to the examiner'), href: '/trainers/speaking' },
};

export interface SkillLevel {
  skill: LevelSkill;
  /** The policy's own estimate for this paper, or null when it has none. */
  band: number | null;
  /** Independent whole attempts behind the estimate (a full paper, or a full
      graded task), the same count the policy's own band rests on. */
  attempts: number;
  /** Band movement across the evidence, or null under the policy's own
      trendMinSamples. */
  trend: number | null;
  /** ISO instant of the most recent usable evidence of any kind. */
  latestAt: string | null;
  /** The policy's own five-level certainty for this paper. Added so a
      caller can show "self-reported" or "limited evidence" honestly rather
      than folding everything into a confidence badge computed here. */
  certainty: Certainty;
}

export type LevelConfidence = 'none' | 'low' | 'medium' | 'high';

export interface LevelEstimate {
  /** Overall band, IELTS-rounded, or null. Null whenever the policy's own
      `overall` is null, which includes "nothing measured yet" AND "some
      papers measured, not all four", both honest reasons to show no single
      number (see this file's header comment). */
  overall: number | null;
  /** Honest interval around `overall`, widened when evidence is thin. */
  range: [low: number, high: number] | null;
  /** The policy's own certainty for `overall`, when it has one. */
  certainty: Certainty | null;
  skills: SkillLevel[];
  /** Skills with a usable band estimate. */
  covered: number;
  totalAttempts: number;
  confidence: LevelConfidence;
  /** Lowest-scoring covered skill: the one worth working on next. */
  weakest: SkillLevel | null;
  /** Skills with no usable band estimate yet, in display order. */
  missing: LevelSkill[];
}

/* Band vocabulary. */

/** Official IELTS band descriptor (the "user" labels published with the band
    scale), for the band the student is currently at. */
export function bandDescriptor(band: number): string {
  if (band >= 8.5) return 'Expert user';
  if (band >= 8) return 'Very good user';
  if (band >= 7) return 'Good user';
  if (band >= 6) return 'Competent user';
  if (band >= 5) return 'Modest user';
  if (band >= 4) return 'Limited user';
  if (band >= 3) return 'Extremely limited user';
  if (band >= 2) return 'Intermittent user';
  return 'Non-user';
}

/** Approximate CEFR equivalent. IELTS and CEFR don't map exactly (the test
    owners publish this as indicative only), so it's shown as "≈" in the UI. */
export function cefrFor(band: number): string {
  if (band >= 8.5) return 'C2';
  if (band >= 7) return 'C1';
  if (band >= 5.5) return 'B2';
  if (band >= 4) return 'B1';
  return 'A2';
}

/** Re-exported so a caller that only has this module still gets the same
    half-band rounding the policy uses everywhere else, the same three
    lines as toHalfBand in src/lib/learning/policy.ts, not reimplemented. */
export { toHalfBand } from './learning/policy';

/* Confidence, from the policy's own certainty. */

/** How sure `overall` is, in the four words this widget already showed.
    Conservative: only the policy's own 'measured' reaches 'high', and
    'limited' or 'self-reported' never reach it either, the same rule
    WP23's report asks for everywhere a five-level certainty is folded down
    to fewer words. */
function confidenceFromCertainty(certainty: Certainty | null, covered: number): LevelConfidence {
  if (certainty === 'measured') return 'high';
  if (certainty === 'tentative') return 'medium';
  if (certainty === 'limited' || certainty === 'self-reported') return 'low';
  return covered > 0 ? 'low' : 'none';
}

/* Building the view from a policy output. */

/** Pure: everything here reads only the `PolicyOutputV1` it is given. Kept
    separate from `estimateLevel()` so a caller that already computed the
    policy (ProgressReport.tsx does, for the same instant) never pays for a
    second pass over the record. */
export function levelFromPolicy(policy: PolicyOutputV1): LevelEstimate {
  const skills: SkillLevel[] = LEVEL_SKILLS.map((skill) => {
    const estimate = policy.estimates.find((e) => e.scopeKey === `paper:${skill}`);
    return {
      skill,
      band: estimate?.band ?? null,
      attempts: estimate?.evidence.wholeAttempts ?? 0,
      trend: estimate?.trend ?? null,
      latestAt: estimate?.evidence.latestAt ?? null,
      certainty: estimate?.certainty ?? 'unknown',
    };
  });

  const scored = skills.filter((s): s is SkillLevel & { band: number } => s.band !== null);
  const totalAttempts = skills.reduce((sum, s) => sum + s.attempts, 0);
  const certainty = policy.overall?.certainty ?? null;

  return {
    overall: policy.overall?.band ?? null,
    range: policy.overall ? [...policy.overall.range] as [number, number] : null,
    certainty,
    skills,
    covered: scored.length,
    totalAttempts,
    confidence: confidenceFromCertainty(certainty, scored.length),
    weakest: scored.length ? scored.reduce((low, s) => (s.band < low.band ? s : low), scored[0]!) : null,
    missing: skills.filter((s) => s.band === null).map((s) => s.skill),
  };
}

/** The student's approximate level, read live from their own plan and
    learner record. Browser-only (see this file's header comment). */
export function estimateLevel(): LevelEstimate {
  const plan = ensurePlan();
  const record = readLearnerRecord();
  const policy = evaluateEvidence({ record, goals: plan.goals, now: new Date().toISOString() });
  return levelFromPolicy(policy);
}
