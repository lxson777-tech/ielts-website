/* The Vocabulary home's pure helpers (src/lib/vocab-home.ts): the word of
   the day, the learnt-word rings, the words due today, the Today strip's
   state and the games links. tests/vocab-home-browser.test.ts covers the two
   reads that need a browser store (streak and due count agreeing with the
   dashboard's own figures). */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { VOCABULARY_PARTS } from '../src/data/vocabulary.ts';
import { buildVocabTopicData, type VocabStoreV1, type VocabTopicData, type VocabCardState } from '../src/lib/vocab-review.ts';
import {
  countDueWords,
  localDateKey,
  pickWordOfTheDay,
  storeByWord,
  todayStrip,
  topicRing,
  topicWordRows,
  vocabGameHref,
  wordOfTheDayDeck,
  VOCAB_GAMES,
} from '../src/lib/vocab-home.ts';
import { VOCAB_TOPIC_ART } from '../src/data/vocab-topic-art.ts';

const REPO = fileURLToPath(new URL('..', import.meta.url));

function realTopics(): VocabTopicData[] {
  return VOCABULARY_PARTS.map((part) => {
    const raw = fs.readFileSync(path.join(REPO, 'src/content/lesson-bodies', `vocabulary-${part.slug}.html`), 'utf8');
    return buildVocabTopicData(raw, part.slug, part.title);
  });
}

function state(over: Partial<VocabCardState> = {}): VocabCardState {
  return { ease: 2.5, interval: 1, due: '2026-10-08', reps: 1, lapses: 0, introducedDate: '2026-10-01', ...over };
}

function store(cards: Record<string, VocabCardState>): VocabStoreV1 {
  return { version: 1, settings: { newPerDay: 10 }, cards };
}

function addDays(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ── Word of the day ─────────────────────────────────────────────── */

test('the word of the day is the same all day and changes the next day', () => {
  const deck = wordOfTheDayDeck(realTopics());
  const today = pickWordOfTheDay(deck, '2026-10-08');
  assert.ok(today, 'a real deck always gives a word');
  assert.deepEqual(pickWordOfTheDay(deck, '2026-10-08'), today, 'the same date gives the same word');
  const tomorrow = pickWordOfTheDay(deck, '2026-10-09');
  assert.notEqual(tomorrow!.word, today!.word, 'the next day gives a different word');
});

test('no two consecutive days ever share a word, across a full year and a half', () => {
  const deck = wordOfTheDayDeck(realTopics());
  let day = '2026-01-01';
  let previous = pickWordOfTheDay(deck, day)!.word;
  for (let i = 0; i < 550; i++) {
    day = addDays(day, 1);
    const word = pickWordOfTheDay(deck, day)!.word;
    assert.notEqual(word, previous, `${day} repeats the word of the day before it`);
    previous = word;
  }
});

test('the day follows the student\'s own calendar date, not the time of day', () => {
  assert.equal(localDateKey(new Date(2026, 9, 8, 0, 5)), '2026-10-08');
  assert.equal(localDateKey(new Date(2026, 9, 8, 23, 55)), '2026-10-08');
  assert.equal(localDateKey(new Date(2026, 0, 3, 9)), '2026-01-03');
});

test('the word of the day comes from the real deck, each with a meaning, an example and its topic', () => {
  const topics = realTopics();
  const deck = wordOfTheDayDeck(topics);
  assert.ok(deck.length > 600, `expected most of the 36 topics' words, got ${deck.length}`);
  const slugs = new Set(topics.map((tp) => tp.slug));
  for (const w of deck) {
    assert.ok(w.word && w.meaning && w.example, `${w.word} lacks a meaning or example`);
    assert.ok(slugs.has(w.topicSlug), `${w.word} names an unknown topic ${w.topicSlug}`);
  }
  assert.equal(new Set(deck.map((w) => w.word.toLowerCase())).size, deck.length, 'each word appears once');
  assert.equal(pickWordOfTheDay([], '2026-10-08'), null, 'an empty deck gives no word rather than throwing');
});

/* ── Rings ───────────────────────────────────────────────────────── */

test('a ring counts only words spelt from memory on two different days, matched whatever the capitals', () => {
  const topics = realTopics();
  const env = topics.find((tp) => tp.slug === 'environment')!;
  const [first, second, third] = topicWordRows(env);
  const byWord = storeByWord(
    store({
      // Known: two different days. Stored with different capitals on purpose.
      [first!.word.toUpperCase()]: state({ recallSuccessDates: ['2026-10-01', '2026-10-03'] }),
      // Not known: one day only, even if listed twice.
      [second!.word]: state({ recallSuccessDates: ['2026-10-02', '2026-10-02'] }),
      // Not known: reviewed often but never recalled.
      [third!.word]: state({ reps: 6 }),
    }),
  );
  const ring = topicRing(env, byWord);
  assert.equal(ring.total, env.wordCount);
  assert.equal(ring.learnt, 1);
  assert.equal(ring.fraction, 1 / env.wordCount);
});

test('every topic ring totals its word count, and an empty store learns nothing', () => {
  const empty = storeByWord(store({}));
  for (const tp of realTopics()) {
    const ring = topicRing(tp, empty);
    assert.equal(ring.total, tp.wordCount, tp.slug);
    assert.equal(ring.learnt, 0, tp.slug);
    assert.equal(ring.fraction, 0, tp.slug);
  }
});

/* ── Due today and the Today strip ───────────────────────────────── */

test('words due today are those met and due on or before today', () => {
  const s = store({
    a: state({ due: '2026-10-07' }),
    b: state({ due: '2026-10-08' }),
    c: state({ due: '2026-10-09' }),
  });
  assert.equal(countDueWords(s, '2026-10-08'), 2);
  assert.equal(countDueWords(store({}), '2026-10-08'), 0);
});

test('a brand new student sees the invitation, anyone who has started sees numbers', () => {
  assert.deepEqual(todayStrip(store({}), 0, '2026-10-08'), { streak: 0, due: 0, fresh: true });
  assert.equal(todayStrip(store({}), 3, '2026-10-08').fresh, false, 'a streak from other study is shown');
  const started = todayStrip(store({ a: state({ due: '2026-10-08' }) }), 0, '2026-10-08');
  assert.deepEqual(started, { streak: 0, due: 1, fresh: false });
  assert.equal(todayStrip(store({}), -2, '2026-10-08').streak, 0, 'never a negative streak');
});

/* ── Links and pictures ──────────────────────────────────────────── */

test('the games links name the game, and the topic only when one is given', () => {
  assert.deepEqual([...VOCAB_GAMES], ['match', 'sprint', 'spell']);
  assert.equal(vocabGameHref('spell'), '/review/games?game=spell');
  assert.equal(vocabGameHref('match', 'environment'), '/review/games?game=match&topic=environment');
  assert.equal(vocabGameHref('sprint', 'music-film'), '/review/games?game=sprint&topic=music-film');
});

test('every topic has a picture entry with real dimensions', () => {
  for (const part of VOCABULARY_PARTS) {
    const art = VOCAB_TOPIC_ART[part.slug];
    assert.ok(art, `${part.slug} has no picture entry`);
    assert.match(art.src, /^\/pics\/vocab\/[a-z-]+\.webp$/);
    assert.ok(art.width > 0 && art.height > 0 && art.alt.length > 10, part.slug);
  }
});
