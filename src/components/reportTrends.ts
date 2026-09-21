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
import type { Certainty, EvidenceFreshness, PolicyOutputV1 } from '../lib/learning/contracts/policy';
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
