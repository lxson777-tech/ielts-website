/* Four separate skill panels for the progress report, replacing the single
 * cross-paper trend line that used to join Reading, Listening, Writing and
 * Speaking scores into one misleading trajectory (architecture section 1.3,
 * ProgressReport.tsx:196-201 before this file existed).
 *
 * PURE, AND THE ONLY SOURCE. Everything here reads a `PolicyOutputV1`
 * already computed by `evaluateEvidence` (src/lib/learning/policy.ts), the
 * one evidence policy. Nothing here re-derives a number of its own: a panel
 * with nothing known stays `unknown`, never zero, and a panel is never built
 * by averaging two different papers together.
 *
 * WHAT A PANEL KEEPS SEPARATE
 * `certainty` and `range` are skill IMPROVEMENT: what the policy currently
 * believes about ability, and how sure it is. `studiedOccasions` is AMOUNT
 * STUDIED: lessons opened and drills completed, which proves nothing about
 * ability on its own (a completion click is studied, never measured).
 * `meetsRequirement` is EXAM READINESS relative to the student's own goal,
 * and is null when they have not set one. A caller that folds these three
 * into one headline number is reintroducing the bug this file exists to
 * fix.
 */

import type { Paper } from '../lib/learning/contracts/catalog';
import { PAPERS } from '../lib/learning/contracts/catalog';
import type { Certainty, EvidenceFreshness, IgnoredReason, PolicyOutputV1 } from '../lib/learning/contracts/policy';
import { paperOfScope, scopeFromKey } from '../lib/learning/policy';
import type { LearnerRecordV1, EvidenceEvent } from '../lib/learning/contracts/evidence';
import { classifyAll } from '../lib/learning/evidence';
import type { PersonalPlanV1 } from '../lib/learning/contracts/plan';
import type { SharedSessionView } from '../lib/learning/adapters';
import { nt } from '../lib/i18n/translate';

/** One paper's current picture, and nothing about any other paper. */
export interface SkillTrendPanel {
  paper: Paper;
  certainty: Certainty;
  /** IELTS band, or null when `certainty` carries no number at all
      ('unknown', or a subskill-only estimate with nothing whole behind it). */
  band: number | null;
  /** Honest interval either side of `band`. Null whenever `band` is. */
  range: readonly [number, number] | null;
  /** Newer-half mean minus older-half mean, in bands. Null below the
      policy's own `trendMinSamples`, in which case nothing is shown rather
      than a difference that is really noise. */
  trend: number | null;
  freshness: EvidenceFreshness;
  /** The band this paper has to reach, from the student's own per-paper
      minimum or their overall target. Null when neither is set. */
  requiredBand: number | null;
  /** Null when `requiredBand` is null: there is nothing to have met. */
  meetsRequirement: boolean | null;
  /** Lessons and drills marked done for this paper. Amount studied, never a
      claim about ability. */
  studiedOccasions: number;
  /** Independent, unaided occasions the estimate actually rests on. */
  independentOccasions: number;
}

/** Four panels, always in the same order (`PAPERS`), one per paper, never
    fewer and never merged. A caller that wants "no evidence at all" can
    check `certainty === 'unknown'` on each. */
export function skillTrendPanels(policy: PolicyOutputV1): readonly SkillTrendPanel[] {
  return PAPERS.map((paper) => {
    const estimate = policy.estimates.find((e) => e.scopeKey === `paper:${paper}`);
    const freshness = policy.freshness.find((f) => f.paper === paper) ?? {
      paper,
      daysSinceLatest: null,
      state: 'none' as const,
    };
    const gap = policy.gaps.find((g) => g.scopeKey === `paper:${paper}`);

    return {
      paper,
      certainty: estimate?.certainty ?? 'unknown',
      band: estimate?.band ?? null,
      range: estimate?.range ?? null,
      trend: estimate?.trend ?? null,
      freshness,
      requiredBand: gap?.requiredBand ?? null,
      meetsRequirement: gap && gap.requiredBand !== null ? gap.meetsRequirement : null,
      studiedOccasions: estimate?.evidence.studiedOccasions ?? 0,
      independentOccasions: estimate?.evidence.independentOccasions ?? 0,
    };
  });
}

/** The five certainty words, exactly as the brief names them, kept as a
    static literal per value so the i18n coverage extractor can find them
    here even though a panel only ever renders one at a time through a
    variable (tests/i18n.test.ts already accepts that pattern for SKILL_LABEL
    and other lookup tables). Capitalised for display; `t()` at the render
    site is what actually translates it. */
export const CERTAINTY_LABEL: Readonly<Record<Certainty, string>> = {
  unknown: nt('Unknown'),
  'self-reported': nt('Self-reported'),
  limited: nt('Limited evidence'),
  tentative: nt('Tentative'),
  measured: nt('Measured'),
};

/** No evidence at all has no day count, so it is its own plain sentence
    rather than a counted one. Kept as a literal here for the same reason as
    CERTAINTY_LABEL: `nt()` is what makes the coverage extractor find it. */
export const FRESHNESS_NONE_TEXT: string = nt('No evidence yet');

/** Which of the three counted freshness sentences applies, and the day
 *  count to say it with. A day count needs "1 day ago" and "5 days ago" to
 *  be different sentences in Russian, which only `tn()` can give it, and
 *  `tn()`'s own coverage check (tests/i18n.test.ts) only finds a plural
 *  phrase from a LITERAL `{ one, other }` object sitting inside the `tn()`
 *  call itself, not one built here and handed over as a variable. So this
 *  function stays a pure discriminant only: SkillTrendGrid.tsx is where the
 *  three literal `tn()` calls actually live, one per kind below. */
export type FreshnessMessage =
  | { kind: 'none' }
  | { kind: 'fresh' | 'ageing' | 'stale'; days: number };

export function freshnessMessage(freshness: EvidenceFreshness): FreshnessMessage {
  if (freshness.state === 'none' || freshness.daysSinceLatest === null) return { kind: 'none' };
  return { kind: freshness.state, days: freshness.daysSinceLatest };
}

/** Which way the trend points, as a translation key rather than a raw
    number, since "+0.3" reads as a measurement this policy explicitly will
    not make below `trendMinSamples`. Null trend (not enough samples) has no
    key: the caller shows nothing, which is the honest answer. */
export function trendDirectionKey(trend: number | null): string | null {
  if (trend === null) return null;
  if (trend > 0.05) return nt('Improving');
  if (trend < -0.05) return nt('Slipping');
  return nt('Steady');
}

/* The four questions, per paper (WP23, brief section 9).
 *
 * "What improved, what remains uncertain, what to work on next, and what
 * changed in the schedule and why." Everything below reads the same
 * `PolicyOutputV1` skillTrendPanels already reads, plus the plan the
 * student is actually on, so the answer for one paper can never contradict
 * its own panel above it. Nothing here proposes an activity: `nextStep`
 * either names the shared session (when it is this paper's turn) or states
 * this paper's place in the SAME priority order the planner used, never a
 * second opinion.
 *
 * Every line is a `NarrativeLine`: an English TEMPLATE (a literal, wrapped
 * in `nt()` so the i18n coverage scanner finds it here) plus the `vars` to
 * fill it with. Nothing here calls `t()` itself, since this module has no
 * React, no locale and no translator, so nothing is pre-rendered into
 * English and baked in. The caller (ProgressReport.tsx) renders each line
 * with `t(line.template, line.vars)`, exactly the way insights.ts's
 * Observation keeps `template`/`vars` apart from the rendered `text`. */

export interface NarrativeLine {
  template: string;
  vars: Record<string, string | number>;
}

export interface PaperNarrative {
  paper: Paper;
  /** From independent evidence only: a positive trend, or a scope newly
      strong enough to count as a strength. Empty when there is nothing
      honest to say yet. */
  improved: readonly NarrativeLine[];
  /** Unknown papers, stale evidence, coarse legacy data, outstanding
      diagnostics, all in plain words, never hidden behind a number. */
  uncertain: readonly NarrativeLine[];
  /** What to work on next: the shared session when it is this paper's turn,
      otherwise this paper's own place in the same priority order. */
  nextStep: NarrativeLine;
  /** Quoted verbatim from PersonalPlanV1.history, filtered to changes whose
      recorded scopes belong to this paper. Empty when nothing paper-specific
      has changed recently (the weekly review already carries the general
      schedule narrative, so nothing is invented here to fill the gap). The
      quoted `summary` itself is the planner's own English sentence and is
      never translated, the same convention every other planner sentence on
      this site follows (session.objective, session.reason). */
  scheduleChanges: readonly string[];
}

// Paper names are protected and never translated (docs/I18N-GUIDE.md),
// matching every other SKILL_LABEL / PAPER_LABEL table on this site.
const PAPER_WORD: Record<Paper, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

function line(template: string, vars: Record<string, string | number> = {}): NarrativeLine {
  return { template, vars };
}

/** Every scope this evidence policy currently has an opinion about that
    belongs to one paper (its subskills, and for Writing/Speaking its tasks
    or parts and criteria), read off the same estimates array the panel
    above already used. */
function scopesFor(policy: PolicyOutputV1, paper: Paper) {
  return policy.estimates.filter((estimate) => paperOfScope(estimate.scope) === paper && estimate.scope.kind !== 'paper');
}

/** The bit of a scope key worth naming in a sentence, e.g. 'matching
    headings' from 'subskill:reading:matching-headings'. Not translated: a
    subskill name is exam vocabulary, the same rule that keeps question-type
    names English everywhere else on this site. */
function subskillLabel(scopeKey: string): string {
  const parts = scopeKey.split(':');
  return (parts[2] ?? scopeKey).replace(/-/g, ' ');
}

function improvedFor(policy: PolicyOutputV1, paper: Paper): NarrativeLine[] {
  const out: NarrativeLine[] = [];
  const paperEstimate = policy.estimates.find((e) => e.scopeKey === `paper:${paper}`);
  if (paperEstimate && paperEstimate.trend !== null && paperEstimate.trend > 0.05 && paperEstimate.certainty !== 'unknown') {
    out.push(
      line(nt('Your independent {paper} evidence is trending up, about {trend} bands over your recent attempts.'), {
        paper: PAPER_WORD[paper],
        trend: `+${paperEstimate.trend.toFixed(1)}`,
      }),
    );
  }
  for (const estimate of scopesFor(policy, paper)) {
    if (estimate.trend !== null && estimate.trend > 0.05 && estimate.certainty === 'measured') {
      out.push(line(nt('{scope} is improving on independent attempts.'), { scope: subskillLabel(estimate.scopeKey) }));
    }
    if (policy.strengths.includes(estimate.scopeKey) && estimate.certainty === 'measured') {
      out.push(line(nt('{scope} is now a demonstrated strength.'), { scope: subskillLabel(estimate.scopeKey) }));
    }
  }
  return out;
}

function uncertainFor(policy: PolicyOutputV1, paper: Paper): NarrativeLine[] {
  const out: NarrativeLine[] = [];
  const freshness = policy.freshness.find((f) => f.paper === paper);
  const paperEstimate = policy.estimates.find((e) => e.scopeKey === `paper:${paper}`);
  const vars = { paper: PAPER_WORD[paper] };

  if (policy.diagnosticsOutstanding.includes(paper)) {
    out.push(line(nt('{paper} has never been sampled, so nothing about it is known yet.'), vars));
  } else if (paperEstimate?.certainty === 'unknown') {
    out.push(line(nt('{paper} has no usable evidence yet.'), vars));
  } else if (paperEstimate?.certainty === 'self-reported') {
    out.push(line(nt('{paper} rests on a self-reported score only, not on anything measured here.'), vars));
  } else if (paperEstimate?.certainty === 'limited') {
    out.push(
      line(
        nt(
          '{paper} evidence is real but coarse: older, migrated results with no per-question detail, so it is kept to limited confidence.',
        ),
        vars,
      ),
    );
  } else if (paperEstimate?.certainty === 'tentative') {
    out.push(line(nt('{paper} is still tentative: seen, but not yet enough to call it a settled pattern.'), vars));
  }

  if (freshness?.state === 'stale') {
    out.push(line(nt('The most recent {paper} evidence is old enough that it no longer counts as current.'), vars));
  } else if (freshness?.state === 'ageing') {
    out.push(line(nt('{paper} evidence is ageing. A fresh attempt would sharpen this.'), vars));
  }

  for (const entry of policy.needsTeacherInput.filter((e) => paperOfScope(e.scope) === paper)) {
    out.push(
      line(nt('{scope} has not improved after {n} attempts in a row. This has been flagged for a teacher to look at.'), {
        scope: subskillLabel(entry.scopeKey),
        n: entry.consecutiveUnimprovedAttempts,
      }),
    );
  }
  return out;
}

function nextStepFor(policy: PolicyOutputV1, session: SharedSessionView | null, paper: Paper): NarrativeLine {
  if (session && session.paper === paper) {
    return line(nt('This is today\'s focus: {objective}'), { objective: session.objective });
  }
  const paperGaps = policy.gaps.filter((gap) => gap.scope.kind === 'paper' && !gap.meetsRequirement && gap.shortfall !== null);
  const ranked = [...paperGaps].sort((a, b) => (b.shortfall ?? 0) - (a.shortfall ?? 0));
  const index = ranked.findIndex((gap) => gap.scope.kind === 'paper' && gap.scope.paper === paper);
  const thisGap = policy.gaps.find((gap) => gap.scopeKey === `paper:${paper}`);
  const vars = { paper: PAPER_WORD[paper] };

  if (thisGap && thisGap.meetsRequirement) {
    return line(nt('{paper} already meets your goal. It stays in rotation for review, not because it is a gap.'), vars);
  }
  if (index === 0) {
    return line(nt('{paper} is your biggest current gap against your goal. The shared plan will turn to it next.'), vars);
  }
  if (index > 0) {
    return line(nt('{paper} is priority {n} of the papers with a gap left, behind today\'s focus.'), { ...vars, n: index + 1 });
  }
  return line(nt('{paper} has no goal set yet, so it has no ranked priority. Set one in your plan settings.'), vars);
}

function scheduleChangesFor(plan: PersonalPlanV1, paper: Paper): string[] {
  return plan.history
    .filter((change) =>
      change.detail?.scopeKeys?.some((key) => {
        const scope = scopeFromKey(key);
        return scope ? paperOfScope(scope) === paper : false;
      }),
    )
    .slice(-2)
    .map((change) => change.summary);
}

/** One narrative per paper, always the four `PAPERS` in order. */
export function paperNarratives(
  policy: PolicyOutputV1,
  plan: PersonalPlanV1,
  session: SharedSessionView | null,
): readonly PaperNarrative[] {
  return PAPERS.map((paper) => ({
    paper,
    improved: improvedFor(policy, paper),
    uncertain: uncertainFor(policy, paper),
    nextStep: nextStepFor(policy, session, paper),
    scheduleChanges: scheduleChangesFor(plan, paper),
  }));
}

/* Recent independent evidence, for the exportable teacher summary. */

export interface EvidenceListItem {
  at: string;
  paper: Paper;
  subskillLabel: string;
  summary: NarrativeLine;
}

function outcomeSummary(event: EvidenceEvent): NarrativeLine {
  const outcome = event.outcome;
  if (outcome.kind === 'scored') {
    return outcome.bandEstimate !== undefined
      ? line(nt('{raw} of {total} (band {band})'), { raw: outcome.raw, total: outcome.total, band: outcome.bandEstimate.toFixed(1) })
      : line(nt('{raw} of {total}'), { raw: outcome.raw, total: outcome.total });
  }
  if (outcome.kind === 'graded') return line(nt('Band {band}'), { band: outcome.overallBand.toFixed(1) });
  if (outcome.kind === 'objective') return line(outcome.met ? nt('Met') : nt('Not yet met'));
  if (outcome.kind === 'recall') return line(nt('{correct} of {reviewed} recalled'), { correct: outcome.correct, reviewed: outcome.reviewed });
  return line(nt('Studied'));
}

/** The most recent independent (first-answer, unaided, unseen) evidence
    events, newest first, across all four papers. Uses the SAME
    classification the policy itself uses (classifyAll), so this list can
    never disagree with what the estimates above it were built from. */
export function recentIndependentEvidence(record: LearnerRecordV1, limit = 8): readonly EvidenceListItem[] {
  const { independent } = classifyAll(record.events);
  return [...independent]
    .filter((event) => event.paper && event.outcome.kind !== 'studied')
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit)
    .map((event) => ({
      at: event.at,
      paper: event.paper as Paper,
      subskillLabel: event.subskill.replace(/-/g, ' '),
      summary: outcomeSummary(event),
    }));
}

/* The student's own stated reasons, kept apart from any finding. */

export interface StatedMistakeItem {
  at: string;
  paper: Paper;
  subskillLabel: string;
  reasonId: string;
  note?: string;
}

/** Every item the student gave their own reason for, most recent first.
    Never presented as a finding (ItemOutcome.statedReason's own doc comment
    in contracts/evidence.ts): the caller must label this as the student's
    own account. */
export function statedMistakeReasons(record: LearnerRecordV1, limit = 6): readonly StatedMistakeItem[] {
  const out: StatedMistakeItem[] = [];
  for (const event of [...record.events].sort((a, b) => (a.at < b.at ? 1 : -1))) {
    if (!event.paper || !event.items) continue;
    for (const item of event.items) {
      if (!item.statedReason) continue;
      out.push({
        at: event.at,
        paper: event.paper,
        subskillLabel: (item.subskill ?? event.subskill).replace(/-/g, ' '),
        reasonId: item.statedReason.reasonId,
        note: item.statedReason.note,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Which of the policy's ignored reasons applies to one entry, as a
    discriminant only. `PolicyOutputV1.ignored` and
    `EvidenceCount.ignored` both already carry `{ reason, count }`; the
    literal, counted `tn()` sentence for each of the nine reasons lives at
    the render site (ProgressReport.tsx), one call per reason, the same
    pattern SkillTrendGrid.tsx already uses for freshness and for the same
    reason: tests/i18n.test.ts's coverage scanner only finds a counted
    phrase from a literal `{ one, other }` object sitting inside the `tn()`
    call itself, never one built here and handed over as a variable. */
export const IGNORED_REASONS: readonly IgnoredReason[] = [
  'blank',
  'abandoned',
  'repeat-of-seen-material',
  'stub-graded',
  'simulated',
  'superseded',
  'stale-content-version',
  'self-reported-claim',
  'older-than-window',
];
