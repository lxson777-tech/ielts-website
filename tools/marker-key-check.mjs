#!/usr/bin/env node
/* Runs every practice test's own answer key through the marker, read-only.
 *
 *   node --import ./tests/ts-extension-loader.mjs tools/marker-key-check.mjs
 *   node --import ./tests/ts-extension-loader.mjs tools/marker-key-check.mjs --json out.json
 *
 * For every paper in src/data/tests (Reading and Listening):
 *   1. a full paper answered with the key scores full marks (40/40, or the
 *      scored total where a slot is deliberately unscored);
 *   2. a blank paper scores 0;
 *   3. the forms a student might type for each free-text key (the number in
 *      words or figures, the British or American spelling, a phone number
 *      with or without spaces, 10.45 pm or 10:45pm) are generated, and each is
 *      marked by the CURRENT marker and by the marker as it stood before
 *      3 October 2026 (copied below as legacyNormalize). The script reports
 *      how many were rejected before and are accepted now;
 *   4. every key is checked against the live word-limit nudge, old and new,
 *      to count the false "over the limit" warnings that are gone.
 *
 * Exit code 1 if a paper fails (1) or (2), or if any generated variant is
 * still rejected (that would mean a fold is missing). It changes nothing. */

import { writeFileSync } from 'node:fs';
import { ALL_TESTS } from '../src/data/tests/index.ts';
import { SPELLING_VARIANTS, isCorrect, scoredQuestionIds } from '../src/lib/tests/schema.ts';
import { isOverWordLimit, numberRuleOf } from '../src/lib/tests/word-limit.ts';

/* ── The marker before 3 October 2026, verbatim, for comparison only ────── */

const LEGACY_PAIRS = {
  colour: 'color', colours: 'colors', coloured: 'colored', colourful: 'colorful',
  favour: 'favor', favours: 'favors', favourite: 'favorite', favourable: 'favorable',
  behaviour: 'behavior', behaviours: 'behaviors', labour: 'labor', labours: 'labors',
  neighbour: 'neighbor', neighbours: 'neighbors', neighbourhood: 'neighborhood',
  harbour: 'harbor', harbours: 'harbors', flavour: 'flavor', flavours: 'flavors',
  humour: 'humor', odour: 'odor', odours: 'odors', vapour: 'vapor', vapours: 'vapors',
  rumour: 'rumor', rumours: 'rumors', armour: 'armor', honour: 'honor', honours: 'honors',
  centre: 'center', centres: 'centers', metre: 'meter', metres: 'meters',
  litre: 'liter', litres: 'liters', theatre: 'theater', theatres: 'theaters',
  fibre: 'fiber', fibres: 'fibers', defence: 'defense', offence: 'offense',
  licence: 'license', practise: 'practice', practised: 'practiced', practising: 'practicing',
  analyse: 'analyze', analysed: 'analyzed', organise: 'organize', organised: 'organized',
  organisation: 'organization', organisations: 'organizations', realise: 'realize',
  realised: 'realized', recognise: 'recognize', recognised: 'recognized',
  specialise: 'specialize', specialised: 'specialized', catalogue: 'catalog',
  catalogues: 'catalogs', dialogue: 'dialog', programme: 'program', programmes: 'programs',
  grey: 'gray', tyre: 'tire', tyres: 'tires', plough: 'plow', mould: 'mold', moulds: 'molds',
  storey: 'story', storeys: 'stories', aluminium: 'aluminum', jewellery: 'jewelry',
  travelled: 'traveled', travelling: 'traveling', traveller: 'traveler', travellers: 'travelers',
  cancelled: 'canceled', cancelling: 'canceling', labelled: 'labeled', labelling: 'labeling',
  modelling: 'modeling', fuelled: 'fueled', woollen: 'woolen', enrol: 'enroll',
  skilful: 'skillful', fulfil: 'fulfill', instalment: 'installment', ageing: 'aging',
  judgement: 'judgment', cheque: 'check', draught: 'draft', kerb: 'curb', pyjamas: 'pajamas',
  sceptical: 'skeptical', moustache: 'mustache', aeroplane: 'airplane',
};
function legacyNormalize(s) {
  const out = s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‒–—―−]/g, '-')
    .replace(/[£$€]/g, '')
    .replace(/(?<=\d),(?=\d)/g, '')
    .replace(/per\s*cent/g, 'percent')
    .replace(/%/g, ' percent')
    .replace(/(?<=[a-z])-(?=[a-z])/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/[.,;:!?]+$/, '')
    .trim();
  return out.replace(/[a-z]+/g, (word) => LEGACY_PAIRS[word] ?? word);
}
function legacyIsCorrect(question, given) {
  const accepted = Array.isArray(question.answer) ? question.answer : [question.answer];
  return accepted.some((a) => legacyNormalize(a) === legacyNormalize(given));
}
function legacyOverLimit(value, limit) {
  const t = value.trim();
  return (t ? t.split(/\s+/).length : 0) > limit;
}

/* ── Variant generation ─────────────────────────────────────────────────── */

const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
  'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function inWords(n) {
  if (n < 20) return UNITS[n];
  if (n === 100) return 'one hundred';
  const t = TENS[Math.floor(n / 10)];
  return n % 10 ? `${t}-${UNITS[n % 10]}` : t;
}
const WORD_TO_NUMBER = new Map();
for (let n = 0; n <= 100; n += 1) WORD_TO_NUMBER.set(inWords(n), n);
const AMERICAN_TO_BRITISH = new Map(Object.entries(SPELLING_VARIANTS).map(([b, a]) => [a, b]));

/** The other ways a student could write this key that IELTS accepts. */
function variantsOf(key) {
  const out = new Set();
  // A whole number in figures, as words (not prices, codes, fractions,
  // ranges or times: only a bare integer token).
  const figures = key.replace(/(?<![\d.,:/£$€-])\b(\d{1,3})\b(?![\d.,:%/-]|\s*[ap]\.?m\b)/g, (m, d) => {
    const n = Number(d);
    return n <= 100 ? inWords(n) : m;
  });
  if (figures !== key) out.add(figures);
  // A number in words, as figures.
  const words = /\b(?:half|third|quarter|fifth|sixth|seventh|eighth|ninth|tenth)s?\b/i.test(key)
    ? key // a fraction ("one third") is not a whole number
    : key.replace(/\b([a-z]+(?:-[a-z]+)?)\b/gi, (m) => {
      const n = WORD_TO_NUMBER.get(m.toLowerCase());
      return n === undefined ? m : String(n);
    });
  if (words !== key) out.add(words);
  // British spelling as American, and American as British.
  const toAmerican = key.replace(/[A-Za-z]+/g, (w) => SPELLING_VARIANTS[w.toLowerCase()] ?? w);
  if (toAmerican !== key) out.add(toAmerican);
  const toBritish = key.replace(/[A-Za-z]+/g, (w) => AMERICAN_TO_BRITISH.get(w.toLowerCase()) ?? w);
  if (toBritish !== key) out.add(toBritish);
  // co-operate / cooperate, e-mail / email.
  const unhyphen = key.replace(/\b(co|e)-(?=operat|ordinat|educat|mail)/gi, '$1');
  if (unhyphen !== key) out.add(unhyphen);
  const hyphen = key.replace(/\b(co)(?=operat|ordinat|educat)|\b(e)(?=mails?\b)/gi, '$1$2-');
  if (hyphen !== key) out.add(hyphen);
  // A long digit string with or without its spaces.
  const joined = key.replace(/\d+(?:[ -]+\d+)+/g, (run) => (run.replace(/[ -]/g, '').length >= 7 ? run.replace(/[ -]/g, '') : run));
  if (joined !== key) out.add(joined);
  // 10.45 pm and 10:45pm (only with am/pm: a bare 4.50 may be a price).
  const colon = key.replace(/(?<![\d.:])([01]?\d|2[0-3])\.([0-5]\d)\s*([ap])\.?m\b/gi, '$1:$2$3m');
  if (colon !== key) out.add(colon);
  const dot = key.replace(/(?<![\d.:])([01]?\d|2[0-3]):([0-5]\d)\s*([ap])\.?m\b/gi, '$1.$2 $3m');
  if (dot !== key) out.add(dot);
  out.delete(key);
  return [...out];
}

/* ── The run ────────────────────────────────────────────────────────────── */

const FREE_TEXT = new Set(['sentence-completion', 'table-completion', 'diagram-labelling']);
const papers = [];
let failures = 0;
let variantsTried = 0;
let newlyAccepted = 0;
let stillRejected = 0;
let alreadyAccepted = 0;
let warningsBefore = 0;
let warningsAfter = 0;
const newlyAcceptedExamples = [];
const stillRejectedList = [];
const warningsGone = [];

for (const test of ALL_TESTS) {
  const questions = test.parts.flatMap((p) => p.groups.flatMap((g) => g.questions.map((q) => ({ g, q }))));
  const qs = questions.map(({ q }) => q);
  const answers = {};
  const slotInPair = new Map();
  for (const q of qs) {
    if (q.multiSelect) { answers[q.id] = q.multiSelect.correctValues.join('|'); continue; }
    const pool = Array.isArray(q.answer) ? q.answer : [q.answer];
    const slot = q.answerPairId ? (slotInPair.get(q.answerPairId) ?? 0) : 0;
    if (q.answerPairId) slotInPair.set(q.answerPairId, slot + 1);
    answers[q.id] = pool[slot] ?? pool[0];
  }
  const scoredTotal = qs.filter((q) => q.scored !== false).length;
  const full = scoredQuestionIds(qs, answers).size;
  const blank = scoredQuestionIds(qs, {}).size;
  const ok = full === scoredTotal && blank === 0;
  if (!ok) failures += 1;
  papers.push({ id: test.id, full, scoredTotal, blank, ok });

  for (const { g, q } of questions) {
    if (q.multiSelect) continue;
    const keys = Array.isArray(q.answer) ? q.answer : [q.answer];
    const freeText = FREE_TEXT.has(g.type) && !(q.options || g.options || g.choices);
    if (g.wordLimit != null) {
      const rule = numberRuleOf(g);
      for (const key of keys) {
        if (/^[A-L]$|^[ivx]+$/i.test(key)) continue;
        const before = legacyOverLimit(key, g.wordLimit);
        const after = isOverWordLimit(key, g.wordLimit, rule);
        if (before) warningsBefore += 1;
        if (after) warningsAfter += 1;
        if (before && !after) warningsGone.push(`${test.id} ${q.id} "${key}" (limit ${g.wordLimit}, ${rule})`);
      }
    }
    if (!freeText) continue;
    const seen = new Set();
    for (const key of keys) {
      for (const variant of variantsOf(key)) {
        if (seen.has(variant.toLowerCase())) continue;
        seen.add(variant.toLowerCase());
        variantsTried += 1;
        const was = legacyIsCorrect(q, variant);
        const now = isCorrect(q, variant);
        if (was && now) alreadyAccepted += 1;
        else if (!was && now) {
          newlyAccepted += 1;
          if (newlyAcceptedExamples.length < 400) newlyAcceptedExamples.push(`${test.id} ${q.id}: "${variant}" for key ${JSON.stringify(q.answer)}`);
        } else if (!now) {
          stillRejected += 1;
          stillRejectedList.push(`${test.id} ${q.id}: "${variant}" for key ${JSON.stringify(q.answer)}`);
        }
      }
    }
  }
}

const summary = {
  papers: papers.length,
  papersScoringFullOnOwnKey: papers.filter((p) => p.full === p.scoredTotal).length,
  papersScoringZeroBlank: papers.filter((p) => p.blank === 0).length,
  failingPapers: papers.filter((p) => !p.ok),
  variantsTried,
  alreadyAcceptedBefore: alreadyAccepted,
  previouslyRejectedNowAccepted: newlyAccepted,
  stillRejected,
  falseWordLimitWarningsBefore: warningsBefore,
  wordLimitWarningsOnKeysNow: warningsAfter,
};

console.log(JSON.stringify(summary, null, 2));
if (stillRejectedList.length) console.log('\nStill rejected (a missing fold):\n  ' + stillRejectedList.join('\n  '));
if (process.argv.includes('--verbose')) {
  console.log('\nPreviously rejected, now accepted:\n  ' + newlyAcceptedExamples.join('\n  '));
  console.log('\nFalse word-limit warnings that are gone:\n  ' + warningsGone.join('\n  '));
}
const jsonAt = process.argv.indexOf('--json');
if (jsonAt > 0 && process.argv[jsonAt + 1]) {
  writeFileSync(process.argv[jsonAt + 1], JSON.stringify({ summary, papers, newlyAcceptedExamples, stillRejectedList, warningsGone }, null, 2));
}
process.exit(failures > 0 || stillRejected > 0 ? 1 : 0);
