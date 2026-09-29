/* Trial stand-in for src/data/speaking-structure-guides.ts (see
   ./README.md): the speaking coach's answer methods and phrases, shown only
   in the part-by-part Speaking trainer, which the trial does not include.
   Every method is present and empty, so nothing that looks one up fails.
   A paid account's browser receives the coach through the gate (pack
   `speaking-structure-guides`, src/lib/trial/packs.ts). */

import type { StructureGuide, StructureMethod } from '../../../data/speaking-structure-guides';
import { packObject, packRecord } from './fill';

export type { LanguageGroup, StructureGuide, StructureMethod, StructureStage } from '../../../data/speaking-structure-guides';

const empty = (method: StructureMethod): StructureGuide => ({ method, title: '', part: '', notes: [], stages: [], language: [], mistakes: [] });

export const SPEAKING_STRUCTURE_GUIDES: Record<StructureMethod, StructureGuide> = {
  ARE: empty('ARE'),
  PEEL: empty('PEEL'),
  OREO: empty('OREO'),
};

/** Paid access only: the pack `speaking-structure-guides`
    ({ SPEAKING_STRUCTURE_GUIDES }). Each method's guide is updated where it
    stands. */
export function fillSpeakingStructureGuides(data: unknown): void {
  const pack = packObject(data, ['SPEAKING_STRUCTURE_GUIDES']);
  const guides = packRecord<StructureGuide>(pack.SPEAKING_STRUCTURE_GUIDES, 'SPEAKING_STRUCTURE_GUIDES');
  for (const method of Object.keys(SPEAKING_STRUCTURE_GUIDES) as StructureMethod[]) {
    const real = guides[method];
    if (real) Object.assign(SPEAKING_STRUCTURE_GUIDES[method], real);
  }
}
