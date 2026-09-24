/* What the placement test found, read from the learner record.
 *
 * WHERE THE ANSWER COMES FROM
 * Every event the placement writes carries PLACEMENT_SOURCE_KEY in its
 * `sourceMaterial` (src/data/placement.ts), so "has this account taken the
 * placement test" and "what did it find" are both answered from the learner
 * record, which is synced to the account, rather than from this device's
 * resume state. A student who sat it on their laptop sees the same results
 * on their phone.
 *
 * HOW A LEVEL WORD IS CHOSEN (one sitting is an estimate, never a band)
 *   Listening and Reading: the policy's own estimate for the paper, as the
 *   share of independent first answers that were right (its evidence
 *   counts), falling back to this sitting's score only when the policy holds
 *   no independent answers for the paper at all. Below 65% is weak, 65 to 79
 *   developing, 80 and above strong: the policy's own weakPercent and
 *   strongPercent (DEFAULT_POLICY_THRESHOLDS), so this screen and the plan
 *   can never disagree about which side of the line a paper is on.
 *   Writing and Speaking: the band the calibrated grader gave this one piece
 *   of work, against the band the student needs in that paper (their
 *   per-paper minimum, else their overall target, exactly as the policy's
 *   requiredBandFor reads it). At or above it is strong, within one band
 *   below it developing, further below weak. With no target set there is
 *   nothing to compare against, and the level is left empty rather than
 *   guessed.
 *
 * Pure: no storage, no clock, no language. The screen (src/components/
 * placement/PlacementResults.tsx) turns these codes into sentences.
 */

import { PAPERS, type Paper } from '../learning/contracts/catalog';
import type { EvidenceEvent, LearnerRecordV1, ScoredResult } from '../learning/contracts/evidence';
import type { PlanGoals } from '../learning/contracts/plan';
import type { AbilityEstimate, Certainty, PolicyOutputV1 } from '../learning/contracts/policy';
import { DEFAULT_POLICY_THRESHOLDS } from '../learning/contracts/policy';
import { requiredBandFor } from '../learning/policy';
import { PLACEMENT_SOURCE_KEY } from '../../data/placement';

export type PlacementLevel = 'weak' | 'developing' | 'strong';

/** The pass line for one question type or one paper, as a percentage. The
    policy's own weak line, so "below the pass line" here and "weak" in the
    plan mean the same thing. */
export const PLACEMENT_PASS_PERCENT = DEFAULT_POLICY_THRESHOLDS.weakPercent;

/** Percent right to a level word: below 65 weak, 65 to 79 developing, 80 and
    above strong. */
export function levelFromPercent(percent: number): PlacementLevel {
  if (percent < DEFAULT_POLICY_THRESHOLDS.weakPercent) return 'weak';
  if (percent < DEFAULT_POLICY_THRESHOLDS.strongPercent) return 'developing';
  return 'strong';
}

/** A graded band against the band this paper needs. Null when there is no
    target to compare against: an invented target is worse than none. */
export function levelFromBand(band: number, required: number | null): PlacementLevel | null {
  if (required === null) return null;
  if (band >= required) return 'strong';
  if (band >= required - 1) return 'developing';
  return 'weak';
}

/** True when this event was written by the placement test. */
export function isPlacementEvent(event: Pick<EvidenceEvent, 'sourceMaterial'>): boolean {
  return (event.sourceMaterial ?? []).includes(PLACEMENT_SOURCE_KEY);
}

/** Every event the placement test wrote into this record, oldest first. */
export function placementEvents(record: Pick<LearnerRecordV1, 'events'>): EvidenceEvent[] {
  return record.events.filter(isPlacementEvent).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

/** Whether this account has sat the placement test: at least one part of it
    is in the learner record. Listening, the first part, always writes an
    event when it is handed in (a blank paper included), so a sitting that
    got anywhere at all is recognised. */
export function placementTaken(record: Pick<LearnerRecordV1, 'events'>): boolean {
  return record.events.some(isPlacementEvent);
}

/** One question type that came in below the pass line in this sitting. */
export interface WeakType {
  subskill: string;
  correct: number;
  total: number;
}

export interface PlacementPaperResult {
  paper: Paper;
  /** 'not-assessed' covers a part that was skipped, blank, or could not be
      marked: it is never read as a low result. */
  status: 'assessed' | 'not-assessed';
  level: PlacementLevel | null;
  /** Listening and Reading: the percentage the level word was chosen from. */
  percent: number | null;
  /** This sitting's own score, for the sentence "7 of 10 right". */
  raw: number | null;
  total: number | null;
  /** Writing and Speaking: the grader's band for this one piece of work. */
  band: number | null;
  /** The band this paper needs, when the student has set one. */
  requiredBand: number | null;
  /** The policy's certainty for the paper. Diagnostic evidence is capped at
      tentative, and one sitting never rises above it. */
  certainty: Certainty;
  /** Question types below the pass line in this sitting, weakest first. */
  weakTypes: readonly WeakType[];
}

function paperEstimate(policy: PolicyOutputV1, paper: Paper): AbilityEstimate | undefined {
  return policy.estimates.find((estimate) => estimate.scopeKey === `paper:${paper}`);
}

/** The latest usable placement event for a paper. A blank or abandoned
    Listening or Reading paper is not usable, and neither is a grade that was
    not live: the policy excludes all three, and so does this. */
function usableEvent(events: readonly EvidenceEvent[], paper: Paper): EvidenceEvent | undefined {
  return [...events]
    .reverse()
    .find(
      (event) =>
        event.paper === paper &&
        event.completion !== 'blank' &&
        event.completion !== 'abandoned' &&
        event.provenance !== 'simulated' &&
        !(event.outcome.kind === 'graded' && !event.outcome.grader.live),
    );
}

/** Question types below the pass line, from one scored event's own tally. */
export function weakTypesOf(outcome: Pick<ScoredResult, 'bySubskill'>): WeakType[] {
  return Object.entries(outcome.bySubskill)
    .filter(([, tally]) => tally.total > 0 && (tally.correct / tally.total) * 100 < PLACEMENT_PASS_PERCENT)
    .map(([subskill, tally]) => ({ subskill, correct: tally.correct, total: tally.total }))
    .sort((a, b) => a.correct / a.total - b.correct / b.total || (a.subskill < b.subskill ? -1 : 1));
}

/** The four papers, in exam order, as the results screen shows them. */
export function placementResults(
  record: Pick<LearnerRecordV1, 'events'>,
  policy: PolicyOutputV1,
  goals: PlanGoals,
): PlacementPaperResult[] {
  const events = placementEvents(record);
  const order: readonly Paper[] = ['listening', 'reading', 'writing', 'speaking'];
  return order
    .filter((paper) => PAPERS.includes(paper))
    .map((paper): PlacementPaperResult => {
      const estimate = paperEstimate(policy, paper);
      const certainty: Certainty = estimate?.certainty ?? 'unknown';
      const requiredBand = requiredBandFor({ kind: 'paper', paper }, goals);
      const event = usableEvent(events, paper);
      const empty: PlacementPaperResult = {
        paper,
        status: 'not-assessed',
        level: null,
        percent: null,
        raw: null,
        total: null,
        band: null,
        requiredBand,
        certainty,
        weakTypes: [],
      };
      if (!event) return empty;

      if (event.outcome.kind === 'scored') {
        const outcome = event.outcome;
        const counts = estimate?.evidence;
        const percent =
          counts && counts.independentItems > 0
            ? (counts.independentCorrect / counts.independentItems) * 100
            : outcome.total > 0
              ? (outcome.raw / outcome.total) * 100
              : null;
        if (percent === null) return empty;
        return {
          ...empty,
          status: 'assessed',
          level: levelFromPercent(percent),
          percent: Math.round(percent),
          raw: outcome.raw,
          total: outcome.total,
          weakTypes: weakTypesOf(outcome),
        };
      }

      if (event.outcome.kind === 'graded' && !event.pendingGrading) {
        const band = event.outcome.overallBand;
        return { ...empty, status: 'assessed', level: levelFromBand(band, requiredBand), band };
      }
      return empty;
    });
}
