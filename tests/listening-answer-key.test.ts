/* The Listening answer keys, checked the way an IELTS marker would read them.
 *
 * Written for the pre-publishing review of 3 October 2026
 * (docs/audits/content-review-2026-10-03/listening-tests.md). That review
 * found keys that broke their own word limit, explanations that named a
 * different letter from the key, and lesson exercises drawn from the papers
 * held back for independent checks. Each rule below is one of those, so it
 * cannot come back quietly.
 *
 * Run on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/listening-answer-key.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ALL_TESTS } from '../src/data/tests/index.ts';
import { LISTENING_PRACTICE } from '../src/data/listening-practice.ts';
import { RESERVED_CHECK_PAPER_IDS } from '../src/data/focused-exercises.ts';
import { scoredQuestionIds, type PracticeTest, type Question, type QuestionGroup } from '../src/lib/tests/schema.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LISTENING = ALL_TESTS.filter((t) => t.skill === 'listening');

function questionsOf(t: PracticeTest) {
  return t.parts.flatMap((p) => p.groups.flatMap((g) => g.questions.map((q) => ({ g, q }))));
}
function accepted(q: Question): string[] {
  if (q.multiSelect) return q.multiSelect.correctValues;
  return Array.isArray(q.answer) ? q.answer : [q.answer];
}
function plain(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ── How IELTS counts an answer ─────────────────────────────────────────── */

const NUMBER_WORDS = new Set([
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty',
  'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
]);
function isNumber(token: string): boolean {
  const t = token.replace(/,$/, '').toLowerCase();
  if (/^[£$€]?\d[\d,.:/]*(st|nd|rd|th|am|pm|%|cc|km)?$/.test(t)) return true;
  return t.split('-').every((part) => NUMBER_WORDS.has(part));
}

/** The limit printed in the instruction: N words, and whether a number may
    be added to them ("AND/OR A NUMBER"), may replace them ("OR A NUMBER"),
    or is the whole answer ("ONE NUMBER"). */
export function parseLimit(instructionHtml: string): { words: number | null; number: 'and-or' | 'or' | 'only' | 'none' } {
  const s = plain(instructionHtml).toUpperCase();
  const m = s.match(/NO MORE THAN (ONE|TWO|THREE|FOUR) WORDS?/) ?? s.match(/\b(ONE|TWO|THREE|FOUR) WORDS?\b/);
  const words = m ? { ONE: 1, TWO: 2, THREE: 3, FOUR: 4 }[m[1] as 'ONE'] : null;
  if (words === null && /ONE NUMBER/.test(s)) return { words: 0, number: 'only' };
  if (/AND\s*\/?\s*OR A NUMBER|AND OR A NUMBER/.test(s)) return { words, number: 'and-or' };
  if (/OR A NUMBER/.test(s)) return { words, number: 'or' };
  return { words, number: 'none' };
}

/** Does this answer fit? A number (digits, a time, a date ordinal, a phone
    number written in groups, a range such as 7am to 12am) is one item; a
    hyphenated word is one word; "am"/"pm" belong to the number before them. */
export function fitsLimit(answer: string, instructionHtml: string): boolean {
  const { words, number } = parseLimit(instructionHtml);
  let text = answer.replace(/\b(a\.m\.|p\.m\.|am|pm)\b/gi, '').replace(/\s+/g, ' ').trim();
  // digit groups of one phone number, and a numeric range, are one number
  text = text.replace(/\b\d[\d ]*\d\b/g, (run) => run.replace(/ /g, ''));
  text = text.replace(/(\d\S*)\s*(?:to|until|-|–)\s*(\d\S*|midnight|noon)/gi, '$1');
  const tokens = text.split(' ').filter(Boolean);
  const nums = tokens.filter(isNumber).length;
  const ws = tokens.length - nums;
  if (number === 'only') return nums === 1 && ws === 0;
  if (words === null) return true;
  if (number === 'and-or') return ws <= words && nums <= 1;
  if (number === 'or') return tokens.length <= words || (nums === 1 && ws === 0);
  return tokens.length <= words;
}

/* Publisher keys that break their own printed limit and are kept for Alex to
   decide (see "Left for Alex" in the review). Each is named, so a new one
   cannot slip in unseen. */
const KNOWN_OVER_LIMIT = new Set([
  'listening-full-029 q15 served all day',
  'listening-full-029 q15 available all day',
]);

const FREE_TEXT: QuestionGroup['type'][] = ['sentence-completion', 'table-completion', 'diagram-labelling'];

test('the word-limit reader counts the way IELTS does', () => {
  assert.equal(fitsLimit('48 North Avenue', 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER.'), true);
  assert.equal(fitsLimit('48 North Avenue', 'Write NO MORE THAN TWO WORDS OR A NUMBER.'), false);
  assert.equal(fitsLimit('socio-economic structures', 'Write NO MORE THAN TWO WORDS.'), true);
  assert.equal(fitsLimit('the 22nd of August', 'Write NO MORE THAN TWO WORDS.'), false);
  assert.equal(fitsLimit('22 August', 'Write NO MORE THAN TWO WORDS.'), true);
  assert.equal(fitsLimit('500 feet', 'Answer the question with ONE WORD OR A NUMBER only.'), false);
  assert.equal(fitsLimit('500', 'Answer the question with ONE WORD OR A NUMBER only.'), true);
  assert.equal(fitsLimit('two years', 'Write ONE WORD AND/OR A NUMBER.'), true);
  assert.equal(fitsLimit('09356 788 545', 'Write NO MORE THAN THREE WORDS AND/OR A NUMBER.'), true);
  assert.equal(fitsLimit('7am to 12am', 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER.'), true);
  assert.equal(fitsLimit('hamburgers and hot dogs', 'Write NO MORE THAN THREE WORDS for each answer.'), false);
});

test('every listening paper numbers its questions 1 to 40, once each, in order', () => {
  assert.equal(LISTENING.length, 30);
  for (const t of LISTENING) {
    const ids = questionsOf(t).map(({ q }) => q.id);
    assert.deepEqual(ids, Array.from({ length: 40 }, (_, i) => `q${i + 1}`), `${t.id} question ids`);
  }
});

test('every accepted completion answer fits the word limit printed above it', () => {
  const over: string[] = [];
  for (const t of LISTENING) {
    for (const { g, q } of questionsOf(t)) {
      if (!FREE_TEXT.includes(g.type) || g.options?.length) continue;
      for (const a of accepted(q)) {
        if (/^[A-I]$/.test(a)) continue; // a letter on a map or diagram
        const label = `${t.id} ${q.id} ${a}`;
        if (!fitsLimit(a, g.instructionHtml) && !KNOWN_OVER_LIMIT.has(label)) over.push(`${label}  [${plain(g.instructionHtml)}]`);
      }
    }
  }
  assert.deepEqual(over, [], 'accepted answers over the printed word limit');
});

test('every letter key is one of the letters the student can choose', () => {
  for (const t of LISTENING) {
    for (const { g, q } of questionsOf(t)) {
      const letters = q.options ?? g.options ?? g.choices?.map((c) => c.value);
      if (!letters) continue;
      for (const a of accepted(q)) {
        assert.ok(letters.includes(a), `${t.id} ${q.id}: key ${a} is not among ${letters.join(', ')}`);
      }
    }
  }
});

test('a full set of correct answers scores 40, a blank paper scores 0', () => {
  for (const t of LISTENING) {
    const qs = questionsOf(t).map(({ q }) => q);
    const answers: Record<string, string> = {};
    const usedInPair = new Map<string, number>();
    for (const q of qs) {
      if (q.multiSelect) { answers[q.id] = q.multiSelect.correctValues.join('|'); continue; }
      const pool = accepted(q);
      const slot = q.answerPairId ? (usedInPair.get(q.answerPairId) ?? 0) : 0;
      if (q.answerPairId) usedInPair.set(q.answerPairId, slot + 1);
      answers[q.id] = pool[slot] ?? pool[0]!;
    }
    const scored = qs.filter((q) => q.scored !== false).length;
    assert.equal(scoredQuestionIds(qs, answers).size, scored, `${t.id} does not score full marks on its own key`);
    assert.equal(scoredQuestionIds(qs, {}).size, 0, `${t.id} scores marks for a blank paper`);
  }
});

test('an explanation that names the answer letter names the letter in the key', () => {
  for (const t of LISTENING) {
    const ruPath = join(root, 'src/data/tests/ru', `${t.id}.json`);
    const ru = existsSync(ruPath) ? JSON.parse(readFileSync(ruPath, 'utf8')).entries as Record<string, { ru: string }> : {};
    for (const { q } of questionsOf(t)) {
      const key = accepted(q);
      for (const m of (q.explanation ?? '').matchAll(/matching (?:answer|option) ([A-I])\b/g)) {
        assert.ok(key.includes(m[1]!), `${t.id} ${q.id}: English says answer ${m[1]}, key is ${key.join('/')}`);
      }
      for (const m of (ru[q.id]?.ru ?? '').matchAll(/Это вариант ([A-I])\b/g)) {
        assert.ok(key.includes(m[1]!), `${t.id} ${q.id}: Russian says вариант ${m[1]}, key is ${key.join('/')}`);
      }
    }
  }
});

test('lesson exercises never spend the papers held back for independent checks', () => {
  const reserved = new Set(RESERVED_CHECK_PAPER_IDS.map((id) => Number(id.replace('listening-full-', ''))));
  for (const [key, set] of Object.entries(LISTENING_PRACTICE)) {
    for (const unit of set.units) {
      const m = (unit.segment?.source ?? '').match(/^Listening Test (\d+),/);
      if (!m) continue;
      assert.ok(!reserved.has(Number(m[1])), `practice set ${key} uses ${unit.segment?.source}, a paper reserved for checks`);
    }
  }
});

test('a lesson exercise lifted from a paper keeps that paper\'s key and explanation', () => {
  const byTest = new Map(LISTENING.map((t) => [Number(t.id.slice(-3)), t]));
  for (const [key, set] of Object.entries(LISTENING_PRACTICE)) {
    for (const unit of set.units) {
      const m = (unit.segment?.source ?? '').match(/^Listening Test (\d+),/);
      const t = m ? byTest.get(Number(m[1])) : undefined;
      if (!t) continue;
      const byExplanation = new Map(questionsOf(t).map(({ q }) => [q.explanation, q]));
      for (const pq of unit.questions) {
        const src = byExplanation.get(pq.explanation);
        assert.ok(src, `practice ${key}: "${pq.prompt}" no longer matches a question of ${t.id}`);
        if (src.answerPairId || src.multiSelect) continue;
        const a = Array.isArray(pq.answer) ? pq.answer : [pq.answer];
        assert.deepEqual(a, accepted(src), `practice ${key}: "${pq.prompt}" key differs from ${t.id} ${src.id}`);
      }
    }
  }
});
