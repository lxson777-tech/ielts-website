/* "Your current approximate level": a single estimated overall band derived
   from everything the student has actually been scored on: practice tests,
   AI-graded essays, and AI-graded speaking attempts.

   This is deliberately NOT "best band". Best band answers "what's the highest
   you've ever hit", which flatters a student and never moves down; a level
   estimate has to answer "where are you now", so it is a recency-weighted mean
   over recent attempts and it can fall as well as rise.

   Three rules keep the number honest:
   - Stub-graded writing/speaking attempts (`live: false`) are excluded outright.
     The offline grader invents plausible bands so the trainers still work when a
     Worker is down; feeding those into a level estimate would be fabricating
     evidence, not degrading gracefully.
   - Single-passage drills count for less than full exams. `readingBand` already
     scales a drill onto the /40 curve, but a 13-question sample is far noisier
     than a 40-question one, so it gets a smaller weight rather than equal say.
   - Every estimate carries its own confidence, and the UI shows a range, not
     just a point. With two attempts on one skill the honest answer is "roughly
     6, give or take a band", not "6.0".
*/

import { getAttempts, getWritingAttempts, getSpeakingAttempts } from './progress';
import { nt } from './i18n/translate';

export type LevelSkill = 'reading' | 'listening' | 'writing' | 'speaking';

export const LEVEL_SKILLS: LevelSkill[] = ['reading', 'listening', 'writing', 'speaking'];

export const SKILL_LABEL: Record<LevelSkill, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

/** Where to send a student who has no evidence (or weak evidence) for a skill.
    Paths are base-less; callers wrap them in withBase(). */
export const SKILL_PRACTICE: Record<LevelSkill, { label: string; href: string }> = {
  reading: { label: nt('Take a reading test'), href: '/tests' },
  listening: { label: nt('Take a listening test'), href: '/tests#listening-tests' },
  writing: { label: nt('Get an essay graded'), href: '/trainers/writing' },
  speaking: { label: nt('Speak to the examiner'), href: '/trainers/speaking' },
};

/** Attempts older than this many positions back stop counting at all. Six is
    about a month of steady practice: far enough back to smooth out one bad
    day, close enough that a student who has genuinely improved isn't dragged
    down by where they started. */
const RECENT_WINDOW = 6;

/** Per-position recency decay. At 0.65 the newest attempt carries ~3x the
    weight of the third-newest, so recent work dominates without a single
    fluke attempt being able to define the estimate on its own. */
const DECAY = 0.65;

/** A single-passage drill is a smaller, noisier sample than a full 40-question
    exam, so it contributes proportionally less. */
const DRILL_WEIGHT = 0.6;

/** The lowest band the official Academic Reading table defines. `readingBand`
    returns 0 below it, which is not a real IELTS band and would drag an
    average into nonsense, so reading contributions are floored here. */
const MIN_REPORTABLE_BAND = 2.5;

interface Sample {
  at: string;
  band: number;
  /** reliability multiplier, before recency decay */
  weight: number;
}

export interface SkillLevel {
  skill: LevelSkill;
  /** Recency-weighted estimate, or null when there's no usable evidence. */
  band: number | null;
  /** Usable attempts behind the estimate (excludes stub-graded ones). */
  attempts: number;
  /** Band movement across the attempt history, or null under 4 attempts. */
  trend: number | null;
  /** ISO datetime of the most recent usable attempt. */
  latestAt: string | null;
}

export type LevelConfidence = 'none' | 'low' | 'medium' | 'high';

export interface LevelEstimate {
  /** Overall band, IELTS-rounded, or null when nothing has been scored yet. */
  overall: number | null;
  /** Honest interval around `overall`, widened when evidence is thin. */
  range: [low: number, high: number] | null;
  skills: SkillLevel[];
  /** Skills with a usable estimate. */
  covered: number;
  totalAttempts: number;
  confidence: LevelConfidence;
  /** Lowest-scoring covered skill: the one worth working on next. */
  weakest: SkillLevel | null;
  /** Skills with no usable evidence yet, in display order. */
  missing: LevelSkill[];
}

/* ── Band vocabulary ───────────────────────────────────────────────────────── */

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

/** Round to the nearest half band. This is also the official overall-score
    rule: an average ending in .25 rounds up to the next half band and .75 up
    to the next whole band, which is exactly what nearest-half does. */
export function toHalfBand(band: number): number {
  return Math.round(band * 2) / 2;
}

/* ── Estimation ────────────────────────────────────────────────────────────── */

function collectSamples(): Record<LevelSkill, Sample[]> {
  const out: Record<LevelSkill, Sample[]> = { reading: [], listening: [], writing: [], speaking: [] };

  for (const { attempt } of getAttempts()) {
    // Attempts predating the `skill` field are reading: that was the only
    // skill with scored attempts when they were written.
    const skill = attempt.skill ?? 'reading';
    out[skill].push({
      at: attempt.at,
      band: Math.max(MIN_REPORTABLE_BAND, attempt.band),
      weight: attempt.kind === 'drill' ? DRILL_WEIGHT : 1,
    });
  }

  for (const { attempt } of getWritingAttempts()) {
    if (!attempt.live) continue; // stub grades are invented, not measured
    out.writing.push({ at: attempt.at, band: attempt.overallBand, weight: 1 });
  }

  for (const attempt of getSpeakingAttempts()) {
    if (!attempt.live) continue;
    out.speaking.push({ at: attempt.at, band: attempt.overallBand, weight: 1 });
  }

  for (const skill of LEVEL_SKILLS) out[skill].sort((a, b) => a.at.localeCompare(b.at));
  return out;
}

/** Recency-weighted mean over the most recent RECENT_WINDOW attempts. */
function weightedBand(samples: Sample[]): number | null {
  const recent = samples.slice(-RECENT_WINDOW);
  let weighted = 0;
  let totalWeight = 0;
  for (let i = recent.length - 1, age = 0; i >= 0; i--, age++) {
    const w = recent[i]!.weight * DECAY ** age;
    weighted += recent[i]!.band * w;
    totalWeight += w;
  }
  return totalWeight === 0 ? null : weighted / totalWeight;
}

/** Newer half's mean minus older half's mean, so a student can see whether
    they're moving. Needs 4+ attempts, below which the difference is noise. */
function trendOf(samples: Sample[]): number | null {
  if (samples.length < 4) return null;
  const half = Math.floor(samples.length / 2);
  const mean = (xs: Sample[]) => xs.reduce((sum, s) => sum + s.band, 0) / xs.length;
  return Math.round((mean(samples.slice(-half)) - mean(samples.slice(0, half))) * 10) / 10;
}

function confidenceFor(covered: number, totalAttempts: number): LevelConfidence {
  if (covered === 0) return 'none';
  if (covered >= 3 && totalAttempts >= 6) return 'high';
  if (covered <= 1 || totalAttempts < 3) return 'low';
  return 'medium';
}

/** Half-band margin shown either side of the estimate. Thin evidence gets a
    full band of slack; anything better gets the tightest interval a half-band
    scale can honestly express. */
function marginFor(confidence: LevelConfidence): number {
  return confidence === 'low' ? 1 : 0.5;
}

export function estimateLevel(): LevelEstimate {
  const samples = collectSamples();

  const skills: SkillLevel[] = LEVEL_SKILLS.map((skill) => {
    const s = samples[skill];
    return {
      skill,
      band: weightedBand(s),
      attempts: s.length,
      trend: trendOf(s),
      latestAt: s.length ? s[s.length - 1]!.at : null,
    };
  });

  const scored = skills.filter((s): s is SkillLevel & { band: number } => s.band !== null);
  const totalAttempts = skills.reduce((sum, s) => sum + s.attempts, 0);
  const confidence = confidenceFor(scored.length, totalAttempts);

  if (scored.length === 0) {
    return {
      overall: null,
      range: null,
      skills,
      covered: 0,
      totalAttempts: 0,
      confidence,
      weakest: null,
      missing: [...LEVEL_SKILLS],
    };
  }

  // Average the skills we have. Averaging only covered skills (rather than
  // treating an untested skill as 0) is why this is an *approximate* level and
  // why the UI states how many of the four papers it rests on.
  const mean = scored.reduce((sum, s) => sum + s.band, 0) / scored.length;
  const overall = toHalfBand(mean);
  const margin = marginFor(confidence);

  return {
    overall,
    range: [
      Math.max(1, toHalfBand(mean - margin)),
      Math.min(9, toHalfBand(mean + margin)),
    ],
    skills,
    covered: scored.length,
    totalAttempts,
    confidence,
    weakest: scored.reduce((low, s) => (s.band < low.band ? s : low), scored[0]!),
    missing: skills.filter((s) => s.band === null).map((s) => s.skill),
  };
}
