/* Finding a Speaking practice gap from a real graded result, on the same
 * rule Writing's hand-off uses: the marker's own words, quoted, or nothing.
 *
 * See written-focused-task.ts's markerComplaintIn, reused here rather than
 * reimplemented: a sentence counts only when the objective's keyword sits
 * close to a word that says something is missing, weak, or being asked
 * for, exactly the same adjacency rule.
 *
 * PRONUNCIATION IS DELIBERATELY NOT HERE (lead decision Q6)
 * This file never proposes a pronunciation objective, whatever the
 * Pronunciation criterion's own comment says. A pronunciation objective can
 * only be SET from a real audio-graded result and re-checked only on a NEW
 * recording graded from audio, through the real Speaking trainer, which
 * this self-check screen deliberately is not (see spoken-focused-task.ts).
 * The three objectives here are the ones WP20 built material for: extending
 * a Part 1 answer, planning a Part 2 talk, and reducing long pauses.
 */

import type { SpeakingGradeResult } from '../../lib/speaking/schema';
import { markerComplaintIn } from './written-focused-task';

export type SpeakingMode = 'part1' | 'part2' | 'part3';

export interface SpeakingObjectiveRule {
  handoffTaskId: string;
  /** Which recorded mode this objective's evidence has to come from. */
  mode: SpeakingMode | 'any';
  keyword: string;
  headlineKey: string;
}

export const SPEAKING_OBJECTIVE_RULES: readonly SpeakingObjectiveRule[] = [
  {
    handoffTaskId: 'speaking-part1-extend-an-answer',
    mode: 'part1',
    keyword: 'extend(?:ed|ing)? (?:your |their )?answers?|one[- ]word answers?|develop(?:ed|ing)? (?:your |their )?(?:answer|response)s?|too short',
    headlineKey: 'Work on extending your answers',
  },
  {
    handoffTaskId: 'speaking-part2-plan-in-one-minute',
    mode: 'part2',
    keyword: 'organi[sz](?:e|ed|ation)|structure|plan(?:ned|ning)?|(?:the )?(?:cue card|talk) (?:was|felt) (?:unstructured|disorganised)',
    headlineKey: 'Work on planning your two minutes',
  },
  {
    handoffTaskId: 'speaking-fluency-repair',
    mode: 'any',
    keyword: 'hesitat(?:e|ed|ion|ing)|long pauses?|pausing|silence|silent gaps?|stopped (?:talking|speaking)',
    headlineKey: 'Work on reducing long pauses',
  },
];

export interface SpeakingGapFinding {
  found: boolean;
  handoffTaskId?: string;
  headlineKey?: string;
  quote?: string;
  /** Which criterion's own words the quote came from. */
  criterion?: 'fluencyCoherence' | 'lexicalResource' | 'grammaticalRange';
}

/** The marker's fluencyCoherence comment, tip and next-band advice, plus
    the moments and improvements list, exactly the same sources the Writing
    hand-off reads and in the same order: a direct comment first, then a
    tip, then advice on the next band, then a quoted moment, then the
    improvements list. Only a LIVE grade counts, same reason as Writing: a
    stub's wording is canned and quoting it as a marker would be a lie. */
export function findSpeakingGap(result: SpeakingGradeResult, mode: SpeakingMode): SpeakingGapFinding {
  if (!result.grader.live) return { found: false };
  const fc = result.criteria.fluencyCoherence;
  const sources: { text: string | undefined; criterion: 'fluencyCoherence' }[] = [
    { text: fc?.comment, criterion: 'fluencyCoherence' },
    { text: fc?.tip, criterion: 'fluencyCoherence' },
    { text: fc?.nextBand?.gap, criterion: 'fluencyCoherence' },
    ...(fc?.nextBand?.actions ?? []).map((action) => ({ text: action.do, criterion: 'fluencyCoherence' as const })),
    ...result.moments.map((moment) => ({ text: moment.note, criterion: 'fluencyCoherence' as const })),
    ...result.improvements.map((line) => ({ text: line, criterion: 'fluencyCoherence' as const })),
  ];

  for (const rule of SPEAKING_OBJECTIVE_RULES) {
    if (rule.mode !== 'any' && rule.mode !== mode) continue;
    for (const source of sources) {
      const quote = markerComplaintIn(source.text, rule.keyword);
      if (quote) {
        return { found: true, handoffTaskId: rule.handoffTaskId, headlineKey: rule.headlineKey, quote, criterion: source.criterion };
      }
    }
  }
  return { found: false };
}
