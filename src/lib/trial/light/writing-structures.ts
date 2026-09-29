/* Trial stand-in for src/data/writing-structures.ts (see ./README.md): the
   writing coach's structures and phrase bank. The trial's Writing Checker
   never shows the coach, so a trial build carries none of it. Every variant
   is present and empty, so nothing that looks one up can fail. A paid
   account's browser receives the real coach through the gate (pack
   `writing-structures`, src/lib/trial/packs.ts). */

import type { WritingStructure } from '../../../data/writing-structures';
import { packObject, packRecord, replaceRecord } from './fill';

export type { WritingLanguageRow, WritingParagraph, WritingStructure } from '../../../data/writing-structures';

type VariantKey =
  | 'opinion'
  | 'discussion'
  | 'problem-solution'
  | 'advantages-disadvantages'
  | 'two-part'
  | 'chart'
  | 'process'
  | 'map';

const VARIANTS: VariantKey[] = ['opinion', 'discussion', 'problem-solution', 'advantages-disadvantages', 'two-part', 'chart', 'process', 'map'];

const empty = (): WritingStructure => ({ label: '', paragraphs: [], language: [], mistakes: [] });

export const WRITING_STRUCTURES: Record<VariantKey, WritingStructure> = Object.fromEntries(
  VARIANTS.map((key) => [key, empty()]),
) as Record<VariantKey, WritingStructure>;

export const PROMPT_VARIANT_STRUCTURE: Record<string, VariantKey> = {
  opinion: 'opinion',
  discussion: 'discussion',
  'problem-solution': 'problem-solution',
  'advantages-disadvantages': 'advantages-disadvantages',
  'two-part': 'two-part',
  chart: 'chart',
  'line-graph': 'chart',
  'bar-chart': 'chart',
  'pie-chart': 'chart',
  table: 'chart',
  combination: 'chart',
  process: 'process',
  map: 'map',
};

/** Paid access only: the pack `writing-structures`
    ({ WRITING_STRUCTURES, PROMPT_VARIANT_STRUCTURE }). */
export function fillWritingStructures(data: unknown): void {
  const pack = packObject(data, ['WRITING_STRUCTURES', 'PROMPT_VARIANT_STRUCTURE']);
  replaceRecord(WRITING_STRUCTURES, packRecord<WritingStructure>(pack.WRITING_STRUCTURES, 'WRITING_STRUCTURES'));
  replaceRecord(PROMPT_VARIANT_STRUCTURE, packRecord<VariantKey>(pack.PROMPT_VARIANT_STRUCTURE, 'PROMPT_VARIANT_STRUCTURE'));
}
