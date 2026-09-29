/* Trial stand-in for src/data/band-guides.ts (see ./README.md): the "from
   band 6 to band 7" playbooks. A trial build carries none of them; a trial
   grade brings the one step per criterion it earned from the grader
   (src/lib/trial/band-steps.ts). guideFor() finds nothing here, so screens
   that fall back to it show no guide rather than failing.

   A paid account's browser receives every ladder through the gate (pack
   `band-guides`, src/lib/trial/packs.ts), and guideFor() then answers
   exactly as the real module does. */

import type { BandStepGuide } from '../../../data/band-guides';
import type { CriterionKey } from '../../writing/schema';
import type { SpeakingCriterionKey } from '../../speaking/schema';
import { packObject, packRecord, replaceArray } from './fill';

export type { BandStepGuide } from '../../../data/band-guides';

export const WRITING_BAND_GUIDES: Record<CriterionKey, BandStepGuide[]> = {
  taskResponse: [],
  coherenceCohesion: [],
  lexicalResource: [],
  grammaticalRange: [],
};

export const SPEAKING_BAND_GUIDES: Record<SpeakingCriterionKey, BandStepGuide[]> = {
  fluencyCoherence: [],
  lexicalResource: [],
  grammaticalRange: [],
  pronunciation: [],
};

/** The real module's rule: the step for a whole band, clamped to the
    guide's own range. Nothing while the ladders are empty. */
export function guideFor(guides: BandStepGuide[], band: number): BandStepGuide | undefined {
  if (guides.length === 0) return undefined;
  const min = guides[0]!.from;
  const max = guides[guides.length - 1]!.from;
  const whole = Math.max(min, Math.min(max, Math.round(band)));
  return guides.find((g) => g.from === whole);
}

function fillLadders(target: Record<string, BandStepGuide[]>, source: Record<string, BandStepGuide[]>): void {
  for (const key of Object.keys(target)) replaceArray(target[key]!, Array.isArray(source[key]) ? source[key]! : []);
}

/** Paid access only: the pack `band-guides`
    ({ WRITING_BAND_GUIDES, SPEAKING_BAND_GUIDES }). */
export function fillBandGuides(data: unknown): void {
  const pack = packObject(data, ['WRITING_BAND_GUIDES', 'SPEAKING_BAND_GUIDES']);
  fillLadders(WRITING_BAND_GUIDES, packRecord<BandStepGuide[]>(pack.WRITING_BAND_GUIDES, 'WRITING_BAND_GUIDES'));
  fillLadders(SPEAKING_BAND_GUIDES, packRecord<BandStepGuide[]>(pack.SPEAKING_BAND_GUIDES, 'SPEAKING_BAND_GUIDES'));
}
