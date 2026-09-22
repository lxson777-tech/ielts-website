/* Finding a Speaking practice gap from a real graded result.
 *
 * WP20b (2026-09-22) rewrites this to read ALL FOUR criteria rather than
 * only Fluency and Coherence (the honest gap the coverage round's teacher
 * review named: a result whose lowest criterion sat in Lexical Resource or
 * Grammatical Range produced no hand-off at all). The rule now runs in two
 * steps:
 *
 *  1. Which criterion is worth working on. The LOWEST-banded criterion that
 *     sits BELOW the student's required band for Speaking (their own
 *     per-paper minimum, or their overall target when they set no minimum;
 *     see requiredBandFor in src/lib/learning/policy.ts, the same function
 *     the real evidence policy uses for GapAssessment.requiredBand). A
 *     criterion already at or above what the student needs is never chosen,
 *     even if it happens to be the lowest of the four.
 *  2. Which objective, inside that one criterion. Exactly the marker-quote
 *     rule every other hand-off in this codebase uses (see
 *     written-focused-task.ts's markerComplaintIn): the objective's own
 *     keyword has to sit close to a word that says something is missing,
 *     weak, or being asked for, in the marker's own comment, tip, next-band
 *     advice, a quoted moment, or the improvements list. If nothing matches,
 *     nothing is offered: this step never falls back to a different
 *     criterion, and it never guesses from a general feeling.
 *
 * PRONUNCIATION (lead decision Q6). A pronunciation objective may only be
 * offered when the result was audio-graded. Every live result already is:
 * the calibrated Speaking pipeline always judges Pronunciation from the
 * actual recording (see workers/grade-speaking's three-step pipeline in the
 * project's own CLAUDE.md), so `result.grader.live` is exactly the same
 * "audio-graded" signal this file already uses to decide whether a stub's
 * canned wording may be quoted as though an examiner wrote it. There is
 * still no SpokenFocusedTask for pronunciation, and there never will be:
 * SpeakingObjectiveHandoff.tsx renders a different, simpler card for it
 * that points at a fresh recording through the real trainer, never at a
 * self-check screen.
 */

import type { SpeakingCriterionKey, SpeakingGradeResult } from '../../lib/speaking/schema';
import { markerComplaintIn } from './written-focused-task';

export type SpeakingMode = 'part1' | 'part2' | 'part3';

/** Checked in this fixed order so a tie between two criteria at the same
    band is broken the same way every time, rather than depending on object
    key iteration order. */
const CRITERION_ORDER: readonly SpeakingCriterionKey[] = [
  'fluencyCoherence',
  'lexicalResource',
  'grammaticalRange',
  'pronunciation',
];

export interface SpeakingObjectiveRule {
  handoffTaskId: string;
  /** Which recorded mode this objective's evidence has to come from. */
  mode: SpeakingMode | 'any';
  criterion: SpeakingCriterionKey;
  keyword: string;
  headlineKey: string;
}

export const SPEAKING_OBJECTIVE_RULES: readonly SpeakingObjectiveRule[] = [
  /* ── Fluency and Coherence (unchanged from the pilot round) ──────────── */
  {
    handoffTaskId: 'speaking-part1-extend-an-answer',
    mode: 'part1',
    criterion: 'fluencyCoherence',
    keyword: 'extend(?:ed|ing)? (?:your |their )?answers?|one[- ]word answers?|develop(?:ed|ing)? (?:your |their )?(?:answer|response)s?|too short',
    headlineKey: 'Work on extending your answers',
  },
  {
    handoffTaskId: 'speaking-part2-plan-in-one-minute',
    mode: 'part2',
    criterion: 'fluencyCoherence',
    keyword: 'organi[sz](?:e|ed|ation)|structure|plan(?:ned|ning)?|(?:the )?(?:cue card|talk) (?:was|felt) (?:unstructured|disorganised)',
    headlineKey: 'Work on planning your two minutes',
  },
  {
    handoffTaskId: 'speaking-fluency-repair',
    mode: 'any',
    criterion: 'fluencyCoherence',
    keyword: 'hesitat(?:e|ed|ion|ing)|long pauses?|pausing|silence|silent gaps?|stopped (?:talking|speaking)',
    headlineKey: 'Work on reducing long pauses',
  },
  /* ── WP20b additions: the coverage round's Part 3 reasoning objectives
     also roll up to fluencyCoherence (see speaking-part3-abstract-
     opinion.ts's header on why: a one-line Part 3 answer with no reason and
     no example is what this criterion's own comment names). */
  {
    handoffTaskId: 'speaking-part3-abstract-opinion-guided',
    mode: 'part3',
    criterion: 'fluencyCoherence',
    keyword: 'develop(?:ed|ing)? (?:your |their )?(?:answer|response)s?|(?:too |very )?short answers?|no (?:reason|example)|undeveloped|one[- ]word',
    headlineKey: 'Work on developing your Part 3 answers',
  },
  {
    handoffTaskId: 'speaking-part3-speculate-and-compare-guided',
    mode: 'part3',
    criterion: 'fluencyCoherence',
    keyword: 'compar(?:e|ed|ing|ison)|only one side|(?:the )?other side|both sides',
    headlineKey: 'Work on comparing both sides',
  },
  /* ── WP20b additions: Lexical Resource ────────────────────────────────── */
  {
    handoffTaskId: 'speaking-topic-vocabulary-guided',
    mode: 'part1',
    criterion: 'lexicalResource',
    keyword: 'range of vocabulary|vocabulary range|repeat(?:ed|s)? (?:the )?same words?|limited vocabulary|basic (?:vocabulary|words)|generic words?',
    headlineKey: 'Work on a wider range of vocabulary',
  },
  {
    handoffTaskId: 'speaking-part3-paraphrase-the-question-guided',
    mode: 'part3',
    criterion: 'lexicalResource',
    keyword: 'paraphrase|paraphrasing|repeats? (?:the )?question',
    headlineKey: 'Work on paraphrasing the question',
  },
  /* ── WP20b additions: Grammatical Range ───────────────────────────────── */
  {
    handoffTaskId: 'speaking-part2-tense-range-guided',
    mode: 'part2',
    criterion: 'grammaticalRange',
    keyword: 'tenses?|past tense|verb forms?|stuck in (?:the )?present',
    headlineKey: 'Work on varying your tenses',
  },
  {
    handoffTaskId: 'speaking-part3-complex-sentences-guided',
    mode: 'part3',
    criterion: 'grammaticalRange',
    keyword: 'complex sentences?|subordinate clauses?|short,? simple sentences?',
    headlineKey: 'Work on complex sentences for reasons',
  },
  /* ── WP20b addition: Pronunciation. No self-check task exists or ever
     will for this one (lead decision Q6); SpeakingObjectiveHandoff.tsx
     reads `criterion === 'pronunciation'` itself and renders a card that
     points at a fresh recording instead of a handoffTaskId, so this entry
     carries an empty string rather than a real focused-task id. */
  {
    handoffTaskId: '',
    mode: 'any',
    criterion: 'pronunciation',
    keyword: 'pronunciation|stress|rhythm|intonation|individual sounds?|(?:hard|difficult) to understand',
    headlineKey: 'Work on pronunciation',
  },
];

export interface SpeakingGapFinding {
  found: boolean;
  handoffTaskId?: string;
  headlineKey?: string;
  quote?: string;
  /** Which criterion's own words the quote came from, and which criterion
      was chosen as the lowest one below the student's required band. */
  criterion?: SpeakingCriterionKey;
}

/** One criterion's own comment, tip, next-band advice, quoted moments and
    improvements list, in that priority order: exactly the same sources and
    the same order the Writing hand-off reads (written-focused-task.ts's
    findRuleGap), generalised across all four Speaking criteria instead of
    only fluencyCoherence. */
function feedbackSourcesFor(result: SpeakingGradeResult, criterion: SpeakingCriterionKey): (string | undefined)[] {
  const score = result.criteria[criterion];
  return [
    score?.comment,
    score?.tip,
    score?.nextBand?.gap,
    ...(score?.nextBand?.actions ?? []).map((action) => action.do),
    ...result.moments.map((moment) => moment.note),
    ...result.improvements,
  ];
}

/** The lowest-banded criterion that sits below `requiredBand`, in
    CRITERION_ORDER on a tie. Null when every criterion already meets the
    requirement, or when there is no requirement to measure against. */
function lowestCriterionBelow(
  result: SpeakingGradeResult,
  requiredBand: number,
): SpeakingCriterionKey | null {
  let lowest: { key: SpeakingCriterionKey; band: number } | null = null;
  for (const key of CRITERION_ORDER) {
    const band = result.criteria[key]?.band;
    if (typeof band !== 'number' || band >= requiredBand) continue;
    if (!lowest || band < lowest.band) lowest = { key, band };
  }
  return lowest?.key ?? null;
}

/** Which of the two pronunciation-adjacent id strings (currently unused,
    since Pronunciation's own rule carries no focused-task id) a caller might
    still want to test against; kept as a named export so a test can assert
    the rule table itself carries no self-check id for Pronunciation, rather
    than trusting a comment. */
export function isPronunciationRule(rule: SpeakingObjectiveRule): boolean {
  return rule.criterion === 'pronunciation';
}

/** Find the one calm hand-off this graded result earns, or none.
 *
 *  `requiredBand` is the student's own required band for Speaking: their
 *  per-paper minimum where they set one, otherwise their overall target
 *  (requiredBandFor in src/lib/learning/policy.ts computes exactly this from
 *  PlanGoals; SpeakingObjectiveHandoff.tsx is what actually calls it, so
 *  this file stays a pure function a test can drive with a plain number).
 *  Null means the student has told the platform no target at all, in which
 *  case there is nothing honest to call "below the required band", so
 *  nothing is offered. Only a LIVE grade counts, same reason as Writing: a
 *  stub's wording is canned and quoting it as a marker would be a lie, and
 *  (WP20b) it is also this file's one available "was this audio-graded"
 *  signal for the Pronunciation gate. */
export function findSpeakingGap(
  result: SpeakingGradeResult,
  mode: SpeakingMode,
  requiredBand: number | null,
): SpeakingGapFinding {
  if (!result.grader.live) return { found: false };
  if (requiredBand === null) return { found: false };

  const criterion = lowestCriterionBelow(result, requiredBand);
  if (!criterion) return { found: false };

  const sources = feedbackSourcesFor(result, criterion);
  const rules = SPEAKING_OBJECTIVE_RULES.filter((rule) => rule.criterion === criterion && (rule.mode === 'any' || rule.mode === mode));

  for (const rule of rules) {
    for (const source of sources) {
      const quote = markerComplaintIn(source, rule.keyword);
      if (quote) {
        return {
          found: true,
          ...(rule.handoffTaskId ? { handoffTaskId: rule.handoffTaskId } : {}),
          headlineKey: rule.headlineKey,
          quote,
          criterion,
        };
      }
    }
  }
  return { found: false };
}
