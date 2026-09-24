/* Trial stand-in for src/data/band-guides.ts (see ./README.md): the "from
   band 6 to band 7" playbooks. A trial build carries none of them; a trial
   grade brings the one step per criterion it earned from the grader
   (src/lib/trial/band-steps.ts). guideFor() finds nothing here, so screens
   that fall back to it show no guide rather than failing. */

import type { BandStepGuide } from '../../../data/band-guides';
import type { CriterionKey } from '../../writing/schema';
import type { SpeakingCriterionKey } from '../../speaking/schema';

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

export function guideFor(_guides: BandStepGuide[], _band: number): BandStepGuide | undefined {
  return undefined;
}
