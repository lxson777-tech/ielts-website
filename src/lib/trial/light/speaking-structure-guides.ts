/* Trial stand-in for src/data/speaking-structure-guides.ts (see
   ./README.md): the speaking coach's answer methods and phrases, shown only
   in the part-by-part Speaking trainer, which the trial does not include.
   Every method is present and empty, so nothing that looks one up fails. */

import type { StructureGuide, StructureMethod } from '../../../data/speaking-structure-guides';

export type { LanguageGroup, StructureGuide, StructureMethod, StructureStage } from '../../../data/speaking-structure-guides';

const empty = (method: StructureMethod): StructureGuide => ({ method, title: '', part: '', notes: [], stages: [], language: [], mistakes: [] });

export const SPEAKING_STRUCTURE_GUIDES: Record<StructureMethod, StructureGuide> = {
  ARE: empty('ARE'),
  PEEL: empty('PEEL'),
  OREO: empty('OREO'),
};
