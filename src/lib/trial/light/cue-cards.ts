/* Trial stand-in for src/data/cue-cards.ts (see ./README.md): the cue-card
   bank with its Band 7 model talks, upgrades and Part 3 answers. Not in the
   trial, so a trial build carries none of it. A paid account's browser
   receives the bank through the gate (pack `cue-cards`,
   src/lib/trial/packs.ts). */

import type { CueCard, CueCardFamilyMeta } from '../../../data/cue-cards';
import { packArray, packObject, replaceArray } from './fill';

export type { CueCard, CueCardFamily, CueCardFamilyMeta } from '../../../data/cue-cards';

export const CUE_CARD_FAMILIES: CueCardFamilyMeta[] = [];

export const CUE_CARDS: CueCard[] = [];

/** Paid access only: the pack `cue-cards` ({ CUE_CARD_FAMILIES, CUE_CARDS }). */
export function fillCueCards(data: unknown): void {
  const pack = packObject(data, ['CUE_CARD_FAMILIES', 'CUE_CARDS']);
  replaceArray(CUE_CARD_FAMILIES, packArray<CueCardFamilyMeta>(pack.CUE_CARD_FAMILIES, 'CUE_CARD_FAMILIES'));
  replaceArray(CUE_CARDS, packArray<CueCard>(pack.CUE_CARDS, 'CUE_CARDS'));
}
