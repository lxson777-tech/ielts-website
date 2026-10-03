/* Every phrase the site quotes from the official band descriptors must
   really be in them.

   Alex's decision, 3 October 2026: grade and teach against the current
   official descriptors (Writing "Updated May 2023", Task 1 and Task 2, and
   the current Speaking descriptors), from the PDFs he downloaded from
   ielts.org. The graders quote those documents verbatim
   (workers/grade-essay, workers/grade-speaking); this file checks that the
   guidance around them and the band guides (src/data/band-guides.ts and
   its Russian) quote nothing that is not in that text, so an old phrase
   such as "presents a clear position throughout" or "L1 accent has minimal
   effect on intelligibility" cannot quietly survive.

   A quoted phrase passes when it appears in the descriptor text of its
   paper (case, curly quotes and spacing ignored), or in the guide step's
   own example sentences, or in the short list below of quotes that are
   deliberately not descriptor text (example words, fillers). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { descriptorText, systemInstruction } from '../workers/grade-essay/src/index.ts';
import {
  FC_SCALE,
  LR_SCALE,
  GRA_SCALE,
  PRON_SCALE,
  SPEAKING_NOTES,
  METHOD_BLOCK,
  hybridPronunciationSystemInstruction,
  hybridTextSystemInstruction,
} from '../workers/grade-speaking/src/index.ts';
import { WRITING_BAND_GUIDES, SPEAKING_BAND_GUIDES, type BandStepGuide } from '../src/data/band-guides.ts';
import { strings as RU } from '../src/lib/i18n/dict/ru/parts/band-guides.ts';

const norm = (s: string) =>
  s
    .replace(/\[limits the rating[^\]]*\]/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();

const WRITING = norm(`${descriptorText('task1')}\n${descriptorText('task2')}`);
const SPEAKING = norm([FC_SCALE, LR_SCALE, GRA_SCALE, PRON_SCALE, SPEAKING_NOTES].join('\n'));

/** Quotes that are deliberately not descriptor wording: example language
    a student might write or say, and spoken fillers. Each is used as an
    example, never as "the descriptor says". Most example quotes need no
    entry because they are taken from the guide step's own example
    sentences. */
const NOT_DESCRIPTOR_TEXT = new Set([
  'heavy traffic', 'big traffic', // natural and unnatural collocation
  'many problems', 'do not go', 'if i had... i would', // corrections of the example's errors
  'pollution', // the word the example paraphrases
  'um', 'well', 'you know', 'a quite hectic schedule', // spoken fillers and phrasing in the speaking method
]);

function quotes(text: string): string[] {
  return [...text.replace(/[“”]/g, '"').matchAll(/"([^"]+)"/g)].map((m) => m[1]!.trim());
}

function problems(text: string, corpus: string, context: string, own: string[] = []): string[] {
  const ownText = norm(own.join(' '));
  return quotes(text)
    .map((q) => q.replace(/[.,;:]+$/, ''))
    .filter((q) => {
      const n = norm(q);
      if (NOT_DESCRIPTOR_TEXT.has(n)) return false;
      if (/[Ѐ-ӿ]/.test(q)) return false; // a Russian gloss, not an English quote
      if (corpus.includes(n)) return false;
      // An example quote may skip words with "...": every piece must be in
      // the step's own example sentences.
      const pieces = n.split('...').map((p) => p.trim()).filter(Boolean);
      return !pieces.every((p) => ownText.includes(p));
    })
    .map((q) => `${context}: "${q}"`);
}

function guideTexts(step: BandStepGuide): string[] {
  return [step.whatChanges, ...(step.task1Note ? [step.task1Note] : []), ...step.doThis, ...step.stopThis, step.example.why, step.practice];
}

/** The fields that describe what the descriptors say. The instructions
    (doThis, stopThis, practice) quote example language a student should
    use, not the descriptors, so they are left out of the quote check. */
function claimTexts(step: BandStepGuide): string[] {
  return [step.whatChanges, ...(step.task1Note ? [step.task1Note] : []), step.example.why];
}

function checkGuides(guides: Record<string, BandStepGuide[]>, corpus: string, paper: string): string[] {
  const out: string[] = [];
  for (const [criterion, steps] of Object.entries(guides)) {
    for (const step of steps) {
      const own = [step.example.before, step.example.after];
      for (const text of claimTexts(step)) {
        const where = `${paper} ${criterion} ${step.from}->${step.to}`;
        out.push(...problems(text, corpus, where, own));
        const ru = RU[text];
        if (ru) out.push(...problems(ru, corpus, `${where} (ru)`, own));
      }
    }
  }
  return out;
}

test('every phrase the Writing band guides quote is in the May 2023 Writing descriptors (English and Russian)', () => {
  assert.deepEqual(checkGuides(WRITING_BAND_GUIDES, WRITING, 'Writing'), []);
});

test('every phrase the Speaking band guides quote is in the current Speaking descriptors (English and Russian)', () => {
  assert.deepEqual(checkGuides(SPEAKING_BAND_GUIDES, SPEAKING, 'Speaking'), []);
});

test('every band guide string has its Russian (the dictionary key followed the new English wording)', () => {
  const missing: string[] = [];
  for (const guides of [WRITING_BAND_GUIDES, SPEAKING_BAND_GUIDES]) {
    for (const steps of Object.values(guides)) {
      for (const step of steps) for (const text of guideTexts(step)) if (!RU[text]) missing.push(text.slice(0, 80));
    }
  }
  assert.deepEqual(missing, []);
});

function section(text: string, from: string, to: string): string {
  const a = text.indexOf(from);
  assert.ok(a >= 0, `section ${from} present`);
  const b = text.indexOf(to, a);
  return text.slice(a, b < 0 ? undefined : b);
}

test('the essay grader guidance quotes only the May 2023 descriptors, for both tasks', () => {
  for (const task of ['task1', 'task2'] as const) {
    const prompt = systemInstruction(task);
    const guidance =
      section(prompt, '=== HOW TO USE THE DESCRIPTORS ===', '=== EXAMINER STANDARDISATION') +
      section(prompt, 'What this scale means in practice:', '=== OUTPUT REQUIREMENTS ===');
    assert.deepEqual(problems(guidance, WRITING, task), []);
    // The descriptor block in the prompt is exactly the official text.
    assert.ok(prompt.includes(descriptorText(task)));
  }
});

test('the speaking grader method block and pronunciation guidance quote only the current Speaking descriptors', () => {
  assert.deepEqual(problems(METHOD_BLOCK, SPEAKING, 'method'), []);
  for (const anchors of [true, false]) {
    const pron = hybridPronunciationSystemInstruction(anchors);
    assert.deepEqual(problems(section(pron, 'Method:', '=== OUTPUT REQUIREMENTS ==='), SPEAKING, 'pronunciation'), []);
  }
  const text = hybridTextSystemInstruction();
  assert.ok(text.includes(FC_SCALE) && text.includes(LR_SCALE) && text.includes(GRA_SCALE) && text.includes(SPEAKING_NOTES));
});

test('the old public wording is gone from both graders\' rubric and guidance', () => {
  const essay = (['task1', 'task2'] as const).map((t) => {
    const p = systemInstruction(t);
    return p.slice(0, p.indexOf('=== EXAMINER STANDARDISATION'));
  });
  const speaking = [FC_SCALE, LR_SCALE, GRA_SCALE, PRON_SCALE, METHOD_BLOCK, hybridPronunciationSystemInstruction(true)].join('\n');
  for (const old of ['presents a clear position throughout', "occur only as 'slips'", 'writes a totally memorised response', 'attracts no attention;']) {
    for (const p of essay) assert.ok(!p.includes(old), old);
  }
  for (const old of ['L1 accent', 'speaks fluently with only rare repetition', 'pronunciation features with mixed control', 'comprehension problems']) {
    assert.ok(!speaking.includes(old), old);
  }
});
