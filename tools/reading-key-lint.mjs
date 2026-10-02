#!/usr/bin/env node
/* A read-only check over the whole Reading bank: the 40 full Academic
 * Reading tests (src/data/tests/reading-full-NNN.ts), their Russian answer
 * notes (src/data/tests/ru/<id>.json), and the lesson-page exercise sets in
 * src/data/reading-practice.ts with their Russian notes.
 *
 *   node tools/reading-key-lint.mjs            errors, then warnings
 *   node tools/reading-key-lint.mjs --errors   errors only
 *
 * It changes nothing. It looks for the faults a student meets head on, or
 * that teach them something false:
 *
 *   ERRORS (tests/reading-key-lint.test.ts fails on any of these)
 *   - a question id that is missing, repeated or out of sequence, or a group
 *     title ("Questions 8-13") that does not match the ids under it;
 *   - a TRUE/FALSE/NOT GIVEN key on a YES/NO/NOT GIVEN question, or the
 *     other way round, or a key that is neither;
 *   - a multiple-choice key that is not one of the printed options, a
 *     matching key outside the letters offered, a heading used twice when
 *     the instructions do not allow it;
 *   - a completion answer, or an accepted variant of one, longer than the
 *     word limit the instructions state, or a stated limit that disagrees
 *     with the limit the player enforces;
 *   - a completion answer that is not in the passage when the instructions
 *     say to take the words from the passage (at least one accepted form
 *     must appear word for word);
 *   - an explanation that states a different verdict from the key
 *     ("This is False" on a TRUE question);
 *   - a Russian note file whose id is not the test's, or whose keys are
 *     not questions of that test, or whose note states a different verdict;
 *   - a lesson exercise copied from a test whose key disagrees with the
 *     test's key;
 *   - placeholders, replacement characters, double-escaped entities, or
 *     HTML whose tags do not close.
 *
 *   WARNINGS (for a person to read, not failures)
 *   - an explanation whose wording leans towards a different verdict than
 *     the key (it says "never mentions" on a TRUE question, and so on), or
 *     that names a different paragraph or letter from the key;
 *   - an evidence quotation that is not word for word in its passage;
 *   - repeated letters in a matching task whose instructions do not say a
 *     letter may be used more than once.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');

/* ---------- text helpers ---------- */

const ENTITIES = { amp: '&', nbsp: ' ', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '-', mdash: '-' };

export function plain(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&([a-z]+|#\d+);/gi, (m, e) => ENTITIES[e.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lowercase words only, for "does this phrase occur in the passage". */
export function words(text) {
  return plain(text)
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/(?<=[a-z])-(?=[a-z])/g, ' ')
    .replace(/per\s*cent/g, 'percent')
    .replace(/\s*%/g, ' percent')
    .replace(/(?<=\d),(?=\d{3})/g, '')
    .replace(/[^a-z0-9'%$£€.\- ]+/g, ' ')
    .replace(/(?<![a-z0-9])['.\-]+|['.\-]+(?![a-z0-9])/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NUMBER_WORDS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

/** The word limit an instruction states, or null. */
export function statedLimit(instruction) {
  const text = plain(instruction).toUpperCase();
  let m = /NO MORE THAN (ONE|TWO|THREE|FOUR|FIVE)\s+WORDS?/.exec(text);
  let limit = m ? NUMBER_WORDS[m[1]] : null;
  if (limit === null) {
    m = /\b(ONE|TWO|THREE|FOUR|FIVE)\s+WORDS?\s+ONLY\b/.exec(text) ?? /\b(ONE|TWO|THREE|FOUR|FIVE)\s+WORDS?\s+(AND\/OR|OR|AND)\s+A\s+NUMBER\b/.exec(text)
      ?? /\bCHOOSE\s+(ONE|TWO|THREE|FOUR|FIVE)\s+WORDS?\b/.exec(text);
    if (m) limit = NUMBER_WORDS[m[1]];
  }
  const number = /\bA NUMBER\b/.test(text);
  const onlyNumber = limit === null && /\bONLY A NUMBER\b|\bWRITE A NUMBER\b|\bONE NUMBER\b/.test(text);
  return { limit, number, onlyNumber };
}

const isNumberToken = (t) => /\d/.test(t);

/** Count an answer the way IELTS does: a hyphenated word is one word, a
    number is a number. */
export function countAnswer(answer) {
  const tokens = String(answer).trim().split(/\s+/).filter(Boolean);
  return { words: tokens.filter((t) => !isNumberToken(t)).length, numbers: tokens.filter(isNumberToken).length };
}

export function fitsLimit(answer, { limit, number }) {
  if (limit === null) return true;
  const { words: w, numbers: n } = countAnswer(answer);
  if (number) return w <= limit && n <= 1;
  return w + n <= limit;
}

const asList = (a) => (Array.isArray(a) ? a : [a]).filter((x) => typeof x === 'string');

const VERDICTS_TF = ['TRUE', 'FALSE', 'NOT GIVEN'];
const VERDICTS_YN = ['YES', 'NO', 'NOT GIVEN'];
const verdict = (s) => String(s).trim().toUpperCase().replace(/\s+/g, ' ');

/* An explanation that says the verdict outright: "This is False:", "so the
   answer is Not Given", "so the statement is true". Only these explicit
   forms count as an error; softer wording is a warning. */
const EXPLICIT_VERDICT = /\b(?:this is|answer is|statement is|so it is|it is therefore|which makes (?:it|this|the statement)|making (?:it|this|the statement)|hence|so|therefore)\s+(?:a\s+|an\s+)?["‘'“]?(true|false|not given|yes|no)\b["’'”]?(?!\s+(?:one|longer|more|less|single|other|such|way|need|reason|doubt|mention|evidence|information|later|sooner|matter|different|different|clear|one's))/gi;
const LEADING_VERDICT = /^\s*(TRUE|FALSE|NOT GIVEN|YES|NO)\b[.:,]/;

export function explicitVerdicts(text) {
  // "we cannot say whether it is true or false" names no verdict.
  const t = plain(text).replace(/\b(?:true or false|yes or no|true nor false|yes nor no)\b/gi, ' ');
  const found = new Set();
  const lead = LEADING_VERDICT.exec(t);
  if (lead) found.add(lead[1].toUpperCase());
  for (const m of t.matchAll(EXPLICIT_VERDICT)) found.add(m[1].toUpperCase());
  for (const m of t.matchAll(/\b(TRUE|FALSE|NOT GIVEN)\b/g)) found.add(m[1]);
  for (const m of t.matchAll(/(?<![a-z] )\b(YES|NO)\b(?=[.:,)]|\s+(?:because|since|as)\b)/g)) found.add(m[1]);
  return found;
}

const CUE_NG = /\b(never (?:says|mentions|states|discusses|tells|gives|compares|specifies|indicates|claims|addresses|explains|reveals|describes|refers)|does(?: not|n't) (?:say|mention|state|tell|give|compare|specify|indicate|discuss|address|reveal|describe|refer|explain|express)|is not (?:mentioned|stated|discussed|given)|not mentioned|no (?:information|mention|evidence|indication|data|comparison|details?)|nothing (?:about|on|is said)|(?:silent|says nothing) (?:on|about)|impossible to (?:say|know|tell)|cannot be (?:confirmed|determined|inferred)|we (?:are not|aren't) told|offers no|gives no|provides no|makes no (?:claim|mention|comparison)|not given|no way to (?:know|tell))\b/i;
const CUE_FALSE = /\b(contradict\w*|the opposite|opposite of|is wrong|is false|not true|rather than|instead of|reverses?|in fact|actually|not easier|but in fact|disagrees?|rejects?|denies|refutes?)\b/i;
const CUE_TRUE = /\b(confirm\w*|agrees? with|matching this|matches|supports? (?:this|the statement)|exactly what|which is what|restates?|paraphras\w*|same as|is true|this is true|equivalent)\b/i;

/** Which verdict the wording leans to, when only one kind of cue is
    present. Null when the cues are mixed or absent. */
export function leaning(text) {
  const t = plain(text);
  const hits = [];
  if (CUE_NG.test(t)) hits.push('NOT GIVEN');
  if (CUE_FALSE.test(t)) hits.push('FALSE');
  if (CUE_TRUE.test(t)) hits.push('TRUE');
  return hits.length === 1 ? hits[0] : null;
}

/* Russian equivalents, for the notes in src/data/tests/ru. */
const RU_NG = /(не сказано|не говорится|ничего не (?:сказано|говорится|сообщается|известно|упомина)|не упомина|нет (?:информации|сведений|данных|ни слова|упоминани)|не сообща|не указ|неизвестно|не известно|не уточня|не сравнива|умалчива|молчит|не дан[оа]|об этом нет|не говорит|не пишет|не утвержда|не высказыва|не выражает|невозможно (?:сказать|понять|узнать)|не приводит)/i;
const RU_FALSE = /(противореч|наоборот|обратн|опроверга|неверн|ошибочн|не соответству|расходится)/i;
const RU_TRUE = /(подтвержда|совпада|соответству|то же самое|согласу|пересказ|другими словами|верно)/i;
export function leaningRu(text) {
  const t = plain(text);
  const ng = RU_NG.test(t);
  const f = RU_FALSE.test(t);
  // "не соответствует" is a FALSE cue, so do not also count it as TRUE.
  const tr = RU_TRUE.test(t.replace(/не соответству\S*/gi, ''));
  const hits = [ng && 'NOT GIVEN', f && 'FALSE', tr && 'TRUE'].filter(Boolean);
  return hits.length === 1 ? hits[0] : null;
}

/* ---------- markup / placeholder checks ---------- */

const PLACEHOLDER = /\bTODO\b|\bTBD\b|\bFIXME\b|\{\{|\}\}|\{[a-zA-Z_][a-zA-Z0-9_]*\}|^\s*(?:undefined|null|NaN)\s*$|\bundefined (?:undefined|null)\b|\$\{|\[object|lorem ipsum|�|&amp;(?:amp|lt|gt|nbsp|quot|#\d+);|\?\?\?/;
const SCRAPED_JUNK = /<ins[\s>]|adsbygoogle|<script|<iframe|data-ad-/i;
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'col', 'wbr', 'source']);

export function tagProblems(html) {
  const s = String(html ?? '');
  if (!/[<>]/.test(s)) return [];
  const stack = [];
  const problems = [];
  for (const m of s.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g)) {
    const [, close, rawName, selfClose] = m;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || selfClose) continue;
    if (!close) stack.push(name);
    else if (stack.at(-1) === name) stack.pop();
    else {
      problems.push(`</${name}> closes ${stack.length ? `<${stack.at(-1)}>` : 'nothing'}`);
      const at = stack.lastIndexOf(name);
      if (at >= 0) stack.length = at;
    }
  }
  if (stack.length) problems.push(`unclosed <${stack.join('>, <')}>`);
  const stray = s.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  if (/<[a-zA-Z\/]/.test(stray)) problems.push('a tag that never closes its ">"');
  return problems;
}

function walkStrings(value, where, visit) {
  if (typeof value === 'string') visit(value, where);
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, `${where}[${i}]`, visit));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walkStrings(v, where ? `${where}.${k}` : k, visit);
}

/* The review's "show in passage" button, as TestPlayer does it
   (locateEvidence / findTextRange): split on "..." or "…", then find each
   fragment exactly, or failing that its longest leading run of at least
   four words and twelve characters. Case and punctuation matter. Returns
   the fragments it cannot find. */
const normEvidence = (s) => s.replace(/[’‘‛]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/ /g, ' ');

export function unlocatable(evidence, text) {
  const lost = [];
  for (const frag of evidence.split(/\s*(?:\.\.\.|…)\s*/).map((f) => f.trim()).filter((f) => f.length > 2)) {
    const cleaned = normEvidence(frag).trim().replace(/[.,;:]+$/, '');
    if (text.includes(cleaned)) continue;
    const ws = cleaned.split(/\s+/);
    let ok = false;
    for (let take = ws.length - 1; take >= 4; take--) {
      const cand = ws.slice(0, take).join(' ').replace(/[.,;:]+$/, '');
      if (cand.length < 12) break;
      if (text.includes(cand)) { ok = true; break; }
    }
    if (!ok) lost.push(frag);
  }
  return lost;
}

/* A table grid whose text cells were run together by the importer: a cell
   that opens with a gap ("……") belongs to the question before it, so each
   input sits beside the wrong words. */
export function scrambledGrid(table) {
  return (table?.rows ?? []).some((row) => row.some((cell) => typeof cell === 'string' && /^\s*[….]{3,}\s*\S/.test(cell)));
}

/* ---------- loading ---------- */

export async function loadReadingTests() {
  const dir = path.join(DATA, 'tests');
  const files = fs.readdirSync(dir).filter((f) => /^reading-full-\d{3}\.ts$/.test(f)).sort();
  const tests = [];
  for (const f of files) tests.push((await import(pathToFileURL(path.join(dir, f)).href)).default);
  return tests;
}

function loadRu(id) {
  const file = path.join(DATA, 'tests', 'ru', `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/* ---------- the test checks ---------- */

const LETTER = /^([A-Z]|[ivx]{1,5})$/i;

function groupRange(title) {
  const m = /Questions?\s+(\d+)\s*(?:[-–—]|to|and)\s*(\d+)/i.exec(title) ?? /Questions?\s+(\d+)\b/i.exec(title);
  if (!m) return null;
  return [Number(m[1]), Number(m[2] ?? m[1])];
}

const allowsReuse = (g) => /more than once/i.test(`${plain(g.instructionHtml)} ${plain(g.legendHtml)}`);

export function lintTest(test, { ru } = {}) {
  const errors = [];
  const warnings = [];
  const err = (q, msg) => errors.push(`${test.id}${q ? ` ${q}` : ''}: ${msg}`);
  const warn = (q, msg) => warnings.push(`${test.id}${q ? ` ${q}` : ''}: ${msg}`);

  walkStrings(test, '', (s, where) => {
    if (PLACEHOLDER.test(s)) err(null, `placeholder or broken text at ${where}: ${JSON.stringify(s.match(PLACEHOLDER)[0])}`);
    if (SCRAPED_JUNK.test(s)) err(null, `advert or script markup left over from the scraped page at ${where}`);
    for (const p of tagProblems(s)) err(null, `markup at ${where}: ${p}`);
  });

  const ids = [];
  const keys = new Set();
  for (const part of test.parts) {
    const passage = words(part.stimulus.paragraphs?.map((p) => p.html).join(' ') ?? '');
    const passageWords = ` ${passage} `;
    const domText = normEvidence(
      (part.stimulus.paragraphs ?? [])
        .map((p) => p.html.replace(/<[^>]+>/g, '').replace(/&([a-z]+|#\d+);/gi, (m, e) => ENTITIES[e.toLowerCase()] ?? m))
        .join(''),
    );
    for (const g of part.groups) {
      const qs = g.questions;
      const instr = `${plain(g.instructionHtml)} ${plain(g.legendHtml)}`;
      const range = groupRange(g.title);
      const nums = qs.map((q) => Number(/^q(\d+)$/.exec(q.id)?.[1] ?? NaN));
      if (range && (nums[0] !== range[0] || nums.at(-1) !== range[1] || nums.length !== range[1] - range[0] + 1)) {
        err(qs[0]?.id, `group "${g.title}" holds ${qs.map((q) => q.id).join(',')}`);
      }
      if (qs.length) keys.add(`group:${qs[0].id}`);
      if (range) {
        for (const m of plain(g.instructionHtml).matchAll(/\b(\d{1,2})\s*(?:[-–—]|to)\s*(\d{1,2})\b/g)) {
          const [a, b] = [Number(m[1]), Number(m[2])];
          if (a >= 1 && b <= 40 && b > a && (a < range[0] || b > range[1])) err(qs[0]?.id, `instructions name questions ${a}-${b} in the group for ${range[0]}-${range[1]}`);
        }
      }
      if (g.table && scrambledGrid(g.table)) err(qs[0]?.id, `the answer grid of "${g.title}" prints each box beside another question's words`);
      if (g.table) {
        const inGrid = g.table.rows.flat().filter((c) => typeof c === 'object').map((c) => c.questionId);
        const missingBox = qs.filter((q) => !inGrid.includes(q.id)).map((q) => q.id);
        if (missingBox.length) err(qs[0]?.id, `the answer grid has no box for ${missingBox.join(',')}`);
      }

      const options = g.options ?? [];
      const letterSet = new Set(options.map((o) => o.trim().toLowerCase()));
      const used = new Map();

      for (const q of qs) {
        ids.push(q.id);
        keys.add(q.id);
        const answers = asList(q.answer);
        if (!answers.length || answers.some((a) => !a.trim())) err(q.id, 'empty answer');
        // "18 (years old)" or "land/language" in a key is a note for a
        // teacher, not something a student can type to match it.
        for (const a of answers) if (/[()\[\]/]/.test(a) && !/^\d+\/\d+$/.test(a.trim())) err(q.id, `key "${a}" contains brackets or a slash, so typing the answer itself never matches`);
        // A student must be able to see what each numbered box is asking:
        // its own text, the words around the gap, a diagram pin, a table
        // grid, or its number printed in the group's legend.
        const num = /^q(\d+)$/.exec(q.id)?.[1];
        const visible = plain(`${q.textHtml ?? ''} ${q.before ?? ''} ${q.after ?? ''}`).replace(/[_….\s]/g, '');
        const legendNames = num && new RegExp(`(^|[^0-9])${num}([^0-9]|$)`).test(plain(g.legendHtml ?? ''));
        const picture = /<img\b/i.test(`${g.legendHtml ?? ''} ${g.instructionHtml ?? ''}`);
        if (!visible && !legendNames && !g.diagram && !picture && g.type !== 'multiple-answer') err(q.id, 'nothing tells the student what this box is asking');
        if (/\bLists? of (?:words|phrases|names|people|ideas|headings)\b/i.test(`${q.textHtml ?? ''} ${q.before ?? ''} ${q.after ?? ''}`)) err(q.id, 'an option list is glued onto the question text');
        const expl = q.explanation ?? '';
        if (/[–—]/.test(expl)) err(q.id, 'explanation contains a long dash');

        if (q.evidence) {
          const lost = unlocatable(q.evidence, domText);
          if (lost.length) warn(q.id, `"show in passage" cannot find this evidence: "${lost[0].slice(0, 90)}"`);
        }

        switch (g.type) {
          case 'tfng':
          case 'yes-no-notgiven': {
            const allowed = g.type === 'tfng' ? VERDICTS_TF : VERDICTS_YN;
            const other = g.type === 'tfng' ? VERDICTS_YN : VERDICTS_TF;
            for (const a of answers) if (!allowed.includes(verdict(a))) err(q.id, `key "${a}" on a ${g.type === 'tfng' ? 'TRUE/FALSE' : 'YES/NO'}/NOT GIVEN question`);
            const shown = g.type === 'tfng' ? /\bTRUE\b/ : /\bYES\b/;
            if (!shown.test(instr)) err(q.id, `${g.type} group whose instructions do not offer ${g.type === 'tfng' ? 'TRUE' : 'YES'}`);
            const key = verdict(answers[0]);
            const keyTF = key === 'YES' ? 'TRUE' : key === 'NO' ? 'FALSE' : key;
            const stated = [...explicitVerdicts(expl)].map((v) => (v === 'YES' ? 'TRUE' : v === 'NO' ? 'FALSE' : v));
            const wrongStated = stated.filter((v) => v !== keyTF);
            if (stated.length && !stated.includes(keyTF)) err(q.id, `explanation states ${wrongStated.join('/')} but the key is ${key}: ${plain(expl).slice(0, 140)}`);
            else if (wrongStated.length && other.length) warn(q.id, `explanation mentions ${wrongStated.join('/')} as well as the key ${key}: ${plain(expl).slice(0, 140)}`);
            const lean = leaning(expl);
            if (lean && lean !== keyTF) warn(q.id, `explanation reads like ${lean}, key ${key}: ${plain(expl).slice(0, 160)}`);
            if (keyTF === 'NOT GIVEN' && q.evidence) warn(q.id, 'NOT GIVEN carries an evidence quotation');
            if (ru?.entries?.[q.id]?.ru) {
              const r = ru.entries[q.id].ru;
              const rs = [...explicitVerdicts(r)].map((v) => (v === 'YES' ? 'TRUE' : v === 'NO' ? 'FALSE' : v));
              if (rs.length && !rs.includes(keyTF)) err(q.id, `Russian note states ${rs.join('/')} but the key is ${key}: ${plain(r).slice(0, 140)}`);
              const rl = leaningRu(r);
              if (rl && rl !== keyTF) warn(q.id, `Russian note reads like ${rl}, key ${key}: ${plain(r).slice(0, 160)}`);
            }
            break;
          }
          case 'multiple-choice': {
            const opts = q.options ?? [];
            const letters = opts.map((_, i) => String.fromCharCode(65 + i));
            if (!opts.length) err(q.id, 'multiple-choice question with no options');
            // TestPlayer letters the radio buttons A to D only.
            if (opts.length > 4) err(q.id, `${opts.length} options, but the player can only letter A to D`);
            for (const a of answers) if (!letters.includes(a.trim().toUpperCase())) err(q.id, `key "${a}" is not one of the options ${letters.join(',')}`);
            const named = /\b(?:answer is|matching|so|hence|therefore)\s+(?:option\s+)?([A-H])\b[.,]?\s*$/i.exec(plain(expl));
            if (named && !answers.map((a) => a.toUpperCase()).includes(named[1].toUpperCase())) err(q.id, `explanation names ${named[1]} but the key is ${answers.join('/')}`);
            for (const m of plain(expl).matchAll(/\b(?:Option|Answer)\s+([A-H])\s+is\s+(correct|right|the answer)/gi)) if (!answers.includes(m[1].toUpperCase())) err(q.id, `explanation calls ${m[1]} correct, key ${answers.join('/')}`);
            for (const m of plain(expl).matchAll(/\b(?:Option\s+)?([A-H])\s+is\s+(?:wrong|incorrect|close but wrong|a trap|tempting but)/g)) if (answers.includes(m[1])) err(q.id, `explanation calls the keyed option ${m[1]} wrong`);
            break;
          }
          case 'multiple-answer': {
            const values = new Set((g.choices ?? []).map((c) => c.value.trim().toUpperCase()));
            for (const a of answers) if (!values.has(a.trim().toUpperCase())) err(q.id, `key "${a}" is not one of the choices`);
            if (g.selectCount && g.selectCount !== qs.length && !q.multiSelect) warn(q.id, `selectCount ${g.selectCount} but ${qs.length} questions`);
            break;
          }
          case 'paragraph-matching':
          case 'matching-features':
          case 'matching-headings':
          case 'categorisation':
          case 'sentence-endings': {
            if (!options.length) { err(q.id, `${g.type} group with no option list`); break; }
            for (const a of answers) if (LETTER.test(a.trim()) && !letterSet.has(a.trim().toLowerCase())) err(q.id, `key "${a}" is outside the options ${options.join(',')}`);
            for (const a of answers) if (!LETTER.test(a.trim()) && !letterSet.has(a.trim().toLowerCase())) err(q.id, `key "${a}" is not a letter from the list`);
            const k = answers[0].trim().toLowerCase();
            used.set(k, [...(used.get(k) ?? []), q.id]);
            if (g.type === 'paragraph-matching') {
              const first = /\b(?:[Pp]aragraph|[Ss]ection)\s+([A-Z])\b/.exec(plain(expl));
              if (first && !answers.map((a) => a.toUpperCase()).includes(first[1])) warn(q.id, `explanation starts from paragraph ${first[1]}, key ${answers.join('/')}: ${plain(expl).slice(0, 120)}`);
            }
            const named = /\b(?:matching|so the answer is|answer is|which is)\s+(?:heading\s+|option\s+|letter\s+)?([A-Z]|[ivx]{1,5})\s*[.)]?\s*$/.exec(plain(expl));
            if (named && !answers.map((a) => a.toLowerCase()).includes(named[1].toLowerCase())) err(q.id, `explanation ends by naming ${named[1]}, key ${answers.join('/')}`);
            break;
          }
          case 'sentence-completion':
          case 'table-completion':
          case 'diagram-labelling': {
            const lim = statedLimit(g.instructionHtml + ' ' + (g.legendHtml ?? ''));
            if (lim.limit !== null && g.wordLimit !== undefined && g.wordLimit !== lim.limit) err(q.id, `instructions say ${lim.limit} words, the player enforces ${g.wordLimit}`);
            const effective = { limit: lim.limit ?? g.wordLimit ?? null, number: lim.number };
            for (const a of answers) if (!fitsLimit(a, effective)) err(q.id, `answer "${a}" is longer than the limit (${effective.limit} word(s)${effective.number ? ' and/or a number' : ''})`);
            if (/from the (?:reading )?(?:passage|text)|from (?:reading )?passage|from the article/i.test(plain(g.instructionHtml))) {
              const found = answers.some((a) => {
                const w = words(a);
                return w && passageWords.includes(` ${w} `);
              });
              const scattered = answers.some((a) => words(a).split(' ').every((w) => passageWords.includes(` ${w} `) || /^(and|or|the|a|an|of)$/.test(w)));
              if (!found && scattered) warn(q.id, `"${answers.join(' / ')}" is made of passage words, but not as one phrase`);
              else if (!found) err(q.id, `no accepted form of "${answers.join(' / ')}" appears word for word in the passage`);
            }
            break;
          }
          default:
            break;
        }
      }

      if (['paragraph-matching', 'matching-features', 'matching-headings', 'sentence-endings'].includes(g.type)) {
        for (const [letter, where] of used) {
          if (where.length < 2) continue;
          if (allowsReuse(g)) continue;
          // Fewer people than statements: some letter has to come twice.
          if (g.type === 'matching-features' && options.length < qs.length) continue;
          const msg = `"${letter}" is the key for ${where.join(', ')} but the instructions do not allow a letter to be used twice`;
          if (g.type === 'matching-headings' && !qs.some((q) => /writer|purpose|title/i.test(q.textHtml ?? ''))) err(where[0], msg);
          else warn(where[0], msg);
        }
      }
      if (g.type === 'multiple-answer' && g.choices) {
        const all = qs.flatMap((q) => asList(q.answer));
        const pairIds = new Set(qs.map((q) => q.answerPairId));
        if (pairIds.size > 1 || pairIds.has(undefined)) warn(qs[0].id, 'multiple-answer questions do not share one answer pool');
        if (g.selectCount && new Set(all.map((a) => a.toUpperCase())).size < g.selectCount) err(qs[0].id, `the pool has fewer than ${g.selectCount} different correct choices`);
      }
    }
  }

  ids.forEach((id, i) => {
    if (id !== `q${i + 1}`) err(id, `question ${i + 1} has id ${id}`);
  });
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) err(null, `repeated ids ${[...new Set(dup)].join(',')}`);
  if (ids.length !== 40) err(null, `${ids.length} questions, not 40`);

  if (ru) {
    if (ru.id !== test.id) err(null, `Russian file says id ${ru.id}`);
    for (const k of Object.keys(ru.entries ?? {})) if (!keys.has(k)) err(null, `Russian note for ${k}, which is not a question of this test`);
    for (const [k, v] of Object.entries(ru.entries ?? {})) if (typeof v?.ru === 'string' && /[–—]/.test(v.ru)) err(k, 'Russian note contains a long dash');
  }
  return { errors, warnings };
}

/* ---------- the lesson-page exercise sets ---------- */

export async function loadPractice() {
  return import(pathToFileURL(path.join(DATA, 'reading-practice.ts')).href);
}

export function lintPractice(practice, testsById) {
  const errors = [];
  const warnings = [];
  const { READING_PRACTICE, PRACTICE_ITEM_IDENTITY } = practice;
  for (const [key, set] of Object.entries(READING_PRACTICE)) {
    const id = `practice-reading-${key}`;
    const ident = new Map((PRACTICE_ITEM_IDENTITY[id] ?? []).map((x) => [x.key, x]));
    const ru = loadRu(id);
    const keys = new Set();
    const err = (k, msg) => errors.push(`${id}${k ? ` ${k}` : ''}: ${msg}`);
    const warn = (k, msg) => warnings.push(`${id}${k ? ` ${k}` : ''}: ${msg}`);
    walkStrings(set, '', (s, where) => {
      if (PLACEHOLDER.test(s)) err(null, `placeholder or broken text at ${where}: ${JSON.stringify(s.match(PLACEHOLDER)[0])}`);
      for (const p of tagProblems(s)) err(null, `markup at ${where}: ${p}`);
    });
    set.units.forEach((unit, ui) => {
      const intro = `${set.intro ?? ''} ${unit.intro ?? ''}`;
      const lim = statedLimit(intro);
      unit.questions.forEach((q, qi) => {
        const k = `u${ui}-q${qi}`;
        keys.add(k);
        const answers = asList(q.answer);
        if (/[–—]/.test(q.explanation ?? '')) err(k, 'explanation contains a long dash');
        if (q.kind === 'choice' || q.kind === 'select') {
          const values = new Set((q.options ?? []).map((o) => o.value.trim().toLowerCase()));
          for (const a of answers) if (!values.has(a.trim().toLowerCase())) err(k, `answer "${a}" is not one of the options`);
        } else if (lim.limit !== null) {
          for (const a of answers) if (!fitsLimit(a, lim)) err(k, `answer "${a}" is longer than the limit in the intro`);
        }
        const verdictKey = verdict(answers[0]);
        if (VERDICTS_TF.includes(verdictKey) || VERDICTS_YN.includes(verdictKey)) {
          const keyTF = verdictKey === 'YES' ? 'TRUE' : verdictKey === 'NO' ? 'FALSE' : verdictKey;
          const stated = [...explicitVerdicts(q.explanation)].map((v) => (v === 'YES' ? 'TRUE' : v === 'NO' ? 'FALSE' : v));
          if (stated.length && !stated.includes(keyTF)) err(k, `explanation states ${stated.join('/')} but the key is ${verdictKey}`);
          const lean = leaning(q.explanation);
          if (lean && lean !== keyTF) warn(k, `explanation reads like ${lean}, key ${verdictKey}: ${plain(q.explanation).slice(0, 160)}`);
          const r = ru?.entries?.[k]?.ru;
          if (r) {
            const rs = [...explicitVerdicts(r)].map((v) => (v === 'YES' ? 'TRUE' : v === 'NO' ? 'FALSE' : v));
            if (rs.length && !rs.includes(keyTF)) err(k, `Russian note states ${rs.join('/')} but the key is ${verdictKey}`);
            const rl = leaningRu(r);
            if (rl && rl !== keyTF) warn(k, `Russian note reads like ${rl}, key ${verdictKey}: ${plain(r).slice(0, 160)}`);
          }
        }
        const named = /\b(?:matching|answer is)\s+([A-H]|[ivx]{1,5})\s*[.)]?\s*$/.exec(plain(q.explanation));
        if (named && (q.kind === 'choice' || q.kind === 'select') && !answers.map((a) => a.toLowerCase()).includes(named[1].toLowerCase())) err(k, `explanation names ${named[1]}, answer ${answers.join('/')}`);

        const origin = ident.get(k);
        if (origin?.testId && testsById.has(origin.testId)) {
          const t = testsById.get(origin.testId);
          const tq = t.parts.flatMap((p) => p.groups.flatMap((g) => g.questions)).find((x) => x.id === origin.questionId);
          if (!tq) err(k, `copied from ${origin.testId} ${origin.questionId}, which does not exist`);
          else {
            const norm = (a) => verdict(a).replace(/\s+/g, ' ');
            const mine = new Set(answers.map(norm));
            const theirs = new Set(asList(tq.answer).map(norm));
            const overlap = [...mine].some((a) => theirs.has(a));
            if (!overlap) err(k, `answer ${answers.join('/')} but ${origin.testId} ${origin.questionId} is keyed ${asList(tq.answer).join('/')}`);
            else if ([...theirs].some((a) => !mine.has(a))) warn(k, `the test accepts ${[...theirs].filter((a) => !mine.has(a)).join('/')} too, the exercise does not`);
            if ([...mine].some((a) => !theirs.has(a))) err(k, `the exercise accepts ${[...mine].filter((a) => !theirs.has(a)).join('/')}, which ${origin.testId} ${origin.questionId} does not`);
          }
        }
      });
    });
    if (ru) {
      if (ru.id !== id) err(null, `Russian file says id ${ru.id}`);
      for (const k of Object.keys(ru.entries ?? {})) if (!keys.has(k)) err(null, `Russian note for ${k}, which is not a question in this set`);
      for (const [k, v] of Object.entries(ru.entries ?? {})) if (typeof v?.ru === 'string' && /[–—]/.test(v.ru)) err(k, 'Russian note contains a long dash');
    }
  }
  return { errors, warnings };
}

/* Errors a person has looked at and decided to keep, each with the reason.
   Matched on the start of the message ("<test id> <question id>: <what>"),
   so a different fault on the same question still fails. */
export const KEPT_ON_PURPOSE = {
  'reading-full-010 q40: answer "Learning style" is longer':
    'The publisher prints "learning style"; tools/import_reading.py ANSWER_OVERRIDES keeps it accepted and ' +
    'tests/reading-answer-key.test.ts pins that. Listed for Alex in docs/audits/content-review-2026-10-03/reading-tests.md.',
};

export async function lintReadingBank() {
  const tests = await loadReadingTests();
  const errors = [];
  const warnings = [];
  let questions = 0;
  for (const t of tests) {
    const r = lintTest(t, { ru: loadRu(t.id) });
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    questions += t.parts.reduce((s, p) => s + p.groups.reduce((x, g) => x + g.questions.length, 0), 0);
  }
  const practice = await loadPractice();
  const pr = lintPractice(practice, new Map(tests.map((t) => [t.id, t])));
  errors.push(...pr.errors);
  warnings.push(...pr.warnings);
  const practiceQuestions = Object.values(practice.READING_PRACTICE).reduce((s, set) => s + set.units.reduce((x, u) => x + u.questions.length, 0), 0);
  const kept = errors.filter((e) => Object.keys(KEPT_ON_PURPOSE).some((k) => e.startsWith(k)));
  return { tests: tests.length, questions, practiceQuestions, errors: errors.filter((e) => !kept.includes(e)), kept, warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const onlyErrors = process.argv.includes('--errors');
  const r = await lintReadingBank();
  console.log(`${r.tests} tests, ${r.questions} questions; ${r.practiceQuestions} lesson exercise questions`);
  console.log(`\nERRORS (${r.errors.length})`);
  for (const e of r.errors) console.log(`  ${e}`);
  if (r.kept.length) console.log(`\nKEPT ON PURPOSE (${r.kept.length})`);
  for (const e of r.kept) console.log(`  ${e}`);
  if (!onlyErrors) {
    console.log(`\nWARNINGS (${r.warnings.length})`);
    for (const w of r.warnings) console.log(`  ${w}`);
  }
  process.exitCode = r.errors.length ? 1 : 0;
}
