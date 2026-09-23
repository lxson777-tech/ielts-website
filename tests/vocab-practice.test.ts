/* The vocabulary practice round builds a question from each word's own
   example sentence by blanking the word out. These tests read the real
   lesson tables, so a new topic whose sentences cannot be blanked, or a
   question with two right answers, fails here rather than in front of a
   student. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildQuestion, findWordInSentence, pickDistractors } from '../src/lib/vocab-practice.ts';
import type { VocabCard } from '../src/lib/vocab-review.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bodies = path.join(root, 'src/content/lesson-bodies');

function decode(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').trim();
}

/** Every word row in every vocabulary lesson, grouped by topic file. */
function lessonDecks(): Map<string, VocabCard[]> {
  const decks = new Map<string, VocabCard[]>();
  for (const file of fs.readdirSync(bodies).filter((f) => /^vocabulary-.+\.html$/.test(f))) {
    const topic = file.slice('vocabulary-'.length, -'.html'.length);
    const html = fs.readFileSync(path.join(bodies, file), 'utf8');
    const cards: VocabCard[] = [];
    for (const m of html.matchAll(/<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g)) {
      cards.push({
        word: decode(m[1]!),
        definition: decode(m[2]!),
        example: decode(m[3]!).replace(/^["“](.*)["”]$/, '$1'),
        topic,
      });
    }
    if (cards.length) decks.set(topic, cards);
  }
  return decks;
}

const decks = lessonDecks();

/** A fixed sequence, so option order is reproducible in a test. */
function seeded(seed: number): () => number {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

test('finds the word in its sentence in the forms the lessons use', () => {
  const cases: [string, string, string][] = [
    ['offender', 'First-time offenders are often given a warning.', 'offenders'],
    ['miscarriage of justice', 'DNA evidence has exposed several miscarriages of justice.', 'miscarriages of justice'],
    ['binge-watch', 'We binge-watched the whole series in one weekend.', 'binge-watched'],
    ['die out', 'Many local customs are dying out.', 'dying out'],
    ['subsidy', 'Government subsidies have accelerated adoption.', 'subsidies'],
    ['skim', 'I skimmed the report before the meeting.', 'skimmed'],
    ['artificial intelligence (AI)', 'Artificial intelligence is transforming healthcare.', 'Artificial intelligence'],
  ];
  for (const [word, sentence, expected] of cases) {
    const span = findWordInSentence(word, sentence);
    assert.ok(span, `"${word}" not found in "${sentence}"`);
    assert.equal(sentence.slice(span.start, span.end), expected);
  }
});

test('never matches inside a longer word', () => {
  assert.equal(findWordInSentence('art', 'The party started late.'), null);
  assert.equal(findWordInSentence('debt', 'She is indebted to her teacher.'), null);
});

test('a two-in-one card is never half blanked', () => {
  assert.equal(findWordInSentence('tenant / landlord', 'Stronger laws protect tenants from unfair landlords.'), null);
});

test('almost every lesson word becomes a sentence question', () => {
  let total = 0;
  let gaps = 0;
  const perTopic: string[] = [];
  for (const [topic, cards] of decks) {
    const topicGaps = cards.filter((c) => findWordInSentence(c.word, c.example)).length;
    total += cards.length;
    gaps += topicGaps;
    // Each topic keeps a clear majority of sentence questions; the rest fall
    // back to "which word means ...?", which still works but teaches less.
    if (topicGaps / cards.length < 0.8) perTopic.push(`${topic}: ${topicGaps}/${cards.length}`);
  }
  assert.ok(total > 600, `expected the full vocabulary, found ${total} words`);
  assert.deepEqual(perTopic, [], 'topics where too few words can be blanked in their example sentence');
  assert.ok(gaps / total > 0.95, `only ${gaps} of ${total} words can be blanked`);
});

test('every question has four different options and exactly one is the word', () => {
  for (const [topic, cards] of decks) {
    for (const card of cards) {
      const q = buildQuestion(card, cards, seeded(card.word.length));
      assert.equal(q.options.length, 4, `${topic}: "${card.word}" has ${q.options.length} options`);
      assert.equal(new Set(q.options).size, 4, `${topic}: "${card.word}" repeats an option`);
      assert.equal(q.options.filter((o) => o === card.word).length, 1, `${topic}: "${card.word}" missing from its own options`);
      if (q.kind === 'gap') {
        assert.equal(`${q.before}${q.answerText}${q.after}`, card.example, `${topic}: "${card.word}" sentence altered`);
        assert.ok(!q.before!.toLowerCase().includes(card.word.toLowerCase()) || card.word.length < 4, `${topic}: "${card.word}" still visible before the gap`);
      }
    }
  }
});

test('interchangeable linking words are never offered together', () => {
  const conjunctions = decks.get('conjunctions');
  assert.ok(conjunctions, 'conjunctions lesson not found');
  const furthermore = conjunctions.find((c) => c.word === 'furthermore')!;
  for (let seed = 1; seed <= 40; seed++) {
    const wrong = pickDistractors(furthermore, conjunctions, seeded(seed));
    assert.ok(!wrong.includes('moreover') && !wrong.includes('in addition'), `seed ${seed} offered ${wrong.join(', ')}`);
  }
});

test('a definition that names another option rules that option out', () => {
  const pool: VocabCard[] = [
    { word: 'moreover', definition: 'adds a point, similar to furthermore', example: '', topic: 'x' },
    { word: 'alpha', definition: 'first', example: '', topic: 'x' },
    { word: 'beta', definition: 'second', example: '', topic: 'x' },
    { word: 'gamma', definition: 'third', example: '', topic: 'x' },
    { word: 'delta', definition: 'fourth', example: '', topic: 'x' },
  ];
  const card = pool[0]!;
  const target: VocabCard = { word: 'furthermore', definition: 'adds a further point', example: '', topic: 'x' };
  for (let seed = 1; seed <= 20; seed++) {
    assert.ok(!pickDistractors(target, [target, ...pool], seeded(seed)).includes(card.word));
  }
});
