/* The main Russian dictionary as a trial build ships it to the browser.

   Every entry is keyed by the English it translates. So a translation of
   material the trial does not include (a focused exercise's instructions,
   a cue card's question, a band guide's advice) carries that material twice,
   in English and in Russian, even though the trial's pages never show it.
   Alex, 24 September 2026: lock the remaining study material.

   This returns the dictionary without any entry whose English is a sentence
   of locked material. Only sentences count (40 characters or more), so a
   short interface label that happens to match a heading in the material
   ("Introduction", "Overview") keeps its translation.

   BUILD TIME ONLY: imported by the trial plugin in astro.config.mjs, which
   emits the result in place of src/lib/i18n/dict/ru/index.ts for the
   browser. Never import this from a page or a component. */

import { strings as RU_STRINGS, plurals as RU_PLURALS } from '../i18n/dict/ru/index';
import { ALL_FOCUSED_EXERCISES, SPOKEN_FOCUSED_TASKS } from '../../data/focused-exercises';
import { SPEAKING_CUE_CARDS, SPEAKING_PART1_TOPICS } from '../../data/speaking-prompts';
import { CUE_CARDS } from '../../data/cue-cards';
import { WRITING_PROMPTS } from '../../data/writing-prompts';
import { MODEL_ANSWERS } from '../../data/model-answers';
import { WRITING_STRUCTURES } from '../../data/writing-structures';
import { WRITING_PLANS } from '../../data/writing-plans';
import { SPEAKING_STRUCTURE_GUIDES } from '../../data/speaking-structure-guides';
import { SPEAKING_BAND_GUIDES, WRITING_BAND_GUIDES } from '../../data/band-guides';

const SENTENCE = 40;

function collect(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    if (value.length >= SENTENCE) into.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collect(item, into);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collect(item, into);
  }
}

/** Every sentence of the material a trial build keeps out of the browser. */
export function lockedSentences(): Set<string> {
  const out = new Set<string>();
  for (const source of [
    ALL_FOCUSED_EXERCISES,
    SPOKEN_FOCUSED_TASKS,
    SPEAKING_PART1_TOPICS,
    SPEAKING_CUE_CARDS,
    CUE_CARDS,
    WRITING_PROMPTS,
    MODEL_ANSWERS,
    WRITING_STRUCTURES,
    WRITING_PLANS,
    SPEAKING_STRUCTURE_GUIDES,
    WRITING_BAND_GUIDES,
    SPEAKING_BAND_GUIDES,
  ]) {
    collect(source, out);
  }
  return out;
}

/** A quoted string as it can appear in source: 'single' or "double". */
function literals(text: string): string[] {
  const single = `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  return [single, JSON.stringify(text)];
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Cuts every `'<locked sentence>': '<translation>',` entry out of a
    module's source (src/lib/learning/ru.ts keeps its translations in object
    literals next to the functions that use them, so the module itself stays
    and only those entries go). Returns how many were cut. */
export function stripLockedEntries(code: string): { code: string; removed: number } {
  const locked = lockedSentences();
  let removed = 0;
  let out = code;
  const value = `(?:'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")`;
  for (const sentence of locked) {
    for (const key of literals(sentence)) {
      if (!out.includes(key)) continue;
      const entry = new RegExp(`${escapeRegExp(key)}\\s*:\\s*${value}\\s*,?`, 'g');
      out = out.replace(entry, () => {
        removed += 1;
        return '';
      });
    }
  }
  return { code: out, removed };
}

export function trialRussianDictionary(): {
  strings: Record<string, string>;
  plurals: typeof RU_PLURALS;
  removed: number;
} {
  const locked = lockedSentences();
  const strings: Record<string, string> = {};
  let removed = 0;
  for (const [english, russian] of Object.entries(RU_STRINGS)) {
    if (locked.has(english)) removed += 1;
    else strings[english] = russian;
  }
  return { strings, plurals: RU_PLURALS, removed };
}
