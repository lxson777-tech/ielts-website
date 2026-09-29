/* Trial stand-in for the Russian dictionary parts that translate locked
   material (src/lib/i18n/dict/ru/parts/band-guides.ts and structures.ts, see
   ./README.md). A translation of a band guide or of the writing coach's
   advice is that material in Russian, so a trial build ships neither. A
   trial grade's guide steps arrive already in the student's language.

   Both parts point here, so this is one shared object. For a paid account
   src/lib/trial/packs.ts fills it with both parts' real entries (from the
   pack `ru-dictionary`) and merges them into the loaded dictionary. */

import { packRecord } from './fill';

export const strings: Record<string, string> = {};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};

/** Paid access only: both parts' translations, keyed by their English. */
export function fillDictionaryParts(entries: unknown): void {
  Object.assign(strings, packRecord<string>(entries, 'parts'));
}
