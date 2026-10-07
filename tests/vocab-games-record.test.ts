/* The vocabulary games write their answers where the rest of the site reads
   them (8 October 2026): the spaced-review schedule and the learner record,
   under the student the game was started for, through the same writers the
   practice round uses. Match and Sprint are recognition; Spell it is recall,
   so two unaided right spellings on two different days make a word known.
   Personal bests sit under the owner's own key and travel with the
   "work saved on this device" claim.

   Real modules, a Map for localStorage, SYNTHETIC owners only.

   Run on its own with:
     node --import ./tests/ts-extension-loader.mjs --test tests/vocab-games-record.test.ts */

import test from 'node:test';
import assert from 'node:assert/strict';

interface MemoryStorage {
  data: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStorage(): MemoryStorage {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

let local = memoryStorage();

/* Defined before anything under test is imported. */
(globalThis as Record<string, unknown>).window = {
  get localStorage() {
    return local;
  },
  get sessionStorage() {
    return memoryStorage();
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
};

globalThis.fetch = (async () => {
  throw new Error('the games never reach the network');
}) as typeof fetch;

const storeOwner = await import('../src/lib/store-owner.ts');
const learner = await import('../src/lib/learning/store.browser.ts');
const vocab = await import('../src/lib/vocab-review.ts');
const record = await import('../src/lib/vocab-games/record.ts');
const bests = await import('../src/lib/vocab-games/bests.ts');
const { VOCABULARY_PARTS } = await import('../src/data/vocabulary.ts');

import type { CacheOwner } from '../src/lib/learning/contracts/sync.ts';

const A = storeOwner.userOwner('SYNTHETIC-VOCAB-GAMES-STUDENT-A');
const B = storeOwner.userOwner('SYNTHETIC-VOCAB-GAMES-STUDENT-B');

function fresh(): void {
  learner.resetLearningStoresForTest();
  local = memoryStorage();
}

function cardsOf(owner: CacheOwner): Record<string, { reps: number; lapses: number; interval: number; recallSuccessDates?: string[] }> {
  const raw = local.data.get(storeOwner.scopedKeyFor(storeOwner.VOCAB_STORE_KEY, owner));
  return raw ? JSON.parse(raw).cards : {};
}

interface StoredEvent {
  activityId: string;
  subskill?: string;
  assistance?: string;
  outcome?: { kind: string; words?: { word: string; correct: boolean; direction: string }[] };
}

function eventsOf(owner: CacheOwner): StoredEvent[] {
  const raw = local.data.get(learner.learnerRecordKey(owner));
  return raw ? (JSON.parse(raw) as { events: StoredEvent[] }).events : [];
}

/* Real words from the deck this process has (the words.ts cards under Node). */
const ENV = VOCABULARY_PARTS.find((p) => p.slug === 'environment')!.title;
const envCards = vocab.getTopicCards(ENV);
const [W1, W2, W3] = envCards as [typeof envCards[number], typeof envCards[number], typeof envCards[number]];

test('the deck has words to play with', () => {
  assert.ok(envCards.length >= 3, 'Environment has words under Node');
});

test('Match and Sprint answers are written as recognition, exactly like a practice round answer', () => {
  fresh();
  record.recordGameRecognition(A, W1, true, false);
  record.recordGameRecognition(A, W2, false, false);
  record.recordGameRecognition(A, W2, true, true);

  const cards = cardsOf(A);
  assert.equal(cards[W1.word]?.reps, 1, 'right first time is "good"');
  assert.equal(cards[W1.word]?.interval, 1);
  assert.equal(cards[W2.word]?.lapses, 1, 'the miss is "again"');
  assert.equal(cards[W2.word]?.reps, 1, 'and right after it is "hard"');
  assert.equal(cards[W1.word]?.recallSuccessDates, undefined, 'recognition never counts toward learnt');

  const events = eventsOf(A);
  assert.equal(events.length, 3);
  assert.ok(events.every((e) => e.activityId === 'review:vocabulary:environment'));
  assert.ok(events.every((e) => e.outcome?.words?.[0]?.direction === 'recognise'));
  assert.deepEqual(
    events.map((e) => [e.outcome?.words?.[0]?.word, e.outcome?.words?.[0]?.correct, e.assistance]).map((r) => JSON.stringify(r)).sort(),
    [
      [W1.word, true, 'none'],
      [W2.word, false, 'none'],
      [W2.word, true, 'answer-shown'],
    ].map((r) => JSON.stringify(r)).sort(),
  );
  assert.deepEqual(cardsOf(B), {}, 'nothing under anybody else');
  assert.equal(eventsOf(B).length, 0);
});

test('Spell it is recall: an unaided right spelling adds today to the word\'s recall days', () => {
  fresh();
  record.recordSpelling(A, W1, true, false, false);
  const today = vocab.vocabToday();
  assert.deepEqual(cardsOf(A)[W1.word]?.recallSuccessDates, [today]);
  assert.equal(vocab.isWordKnown(vocab.readVocabStoreFor(A).cards[W1.word]), false, 'one day is not enough');

  const [event] = eventsOf(A);
  assert.equal(event?.subskill, 'recall-from-meaning');
  assert.equal(event?.assistance, 'none');
  assert.deepEqual(event?.outcome?.words, [{ word: W1.word, correct: true, direction: 'recall' }]);
});

test('Spell it on two different days makes a word known (the earlier day simulated in the store)', () => {
  fresh();
  record.recordSpelling(A, W1, true, false, false);
  /* Yesterday's success, as the browser check does it: move the stored day back. */
  const key = storeOwner.scopedKeyFor(storeOwner.VOCAB_STORE_KEY, A);
  const store = JSON.parse(local.data.get(key)!);
  store.cards[W1.word].recallSuccessDates = ['2026-10-01'];
  local.data.set(key, JSON.stringify(store));

  record.recordSpelling(A, W1, true, false, false);
  const state = vocab.readVocabStoreFor(A).cards[W1.word];
  assert.equal(state?.recallSuccessDates?.length, 2);
  assert.equal(vocab.isWordKnown(state), true, 'two different days: known');
});

test('a letter hint makes the answer assisted: no recall day, and the evidence says hint', () => {
  fresh();
  record.recordSpelling(A, W2, true, true, false);
  const state = cardsOf(A)[W2.word];
  assert.equal(state?.recallSuccessDates, undefined);
  assert.equal(state?.lapses, 1, 'assisted goes back sooner, the review store\'s own rule');
  const [event] = eventsOf(A);
  assert.equal(event?.assistance, 'hint');
  assert.equal(event?.outcome?.words?.[0]?.correct, true);
});

test('a wrong spelling and its second go: "again", then "hard" with the answer shown', () => {
  fresh();
  record.recordSpelling(A, W3, false, false, false);
  record.recordSpelling(A, W3, true, false, true);
  const state = cardsOf(A)[W3.word];
  assert.equal(state?.lapses, 1);
  assert.equal(state?.reps, 1, 'the second go is "hard"');
  assert.equal(state?.recallSuccessDates, undefined, 'a second go after the answer was shown never counts');
  assert.deepEqual(eventsOf(A).map((e) => e.assistance).sort(), ['answer-shown', 'none']);

  fresh();
  record.recordSpelling(A, W3, false, false, false);
  record.recordSpelling(A, W3, false, false, true);
  assert.equal(cardsOf(A)[W3.word]?.lapses, 1, 'wrong twice in one set is one lapse, not two');
});

test('recordReviewOutcome (current owner) is unchanged: it is the owner-scoped one for the owner on the page', () => {
  fresh();
  const me = storeOwner.currentOwner();
  vocab.recordReviewOutcome(W1.word, 'recall', true, false);
  assert.deepEqual(cardsOf(me)[W1.word]?.recallSuccessDates, [vocab.vocabToday()]);
});

test('personal bests sit under the owner\'s own key, and the claim carries them into the account', () => {
  fresh();
  const anon = storeOwner.anonymousOwner('SYNTHETIC-DEVICE');
  assert.ok(storeOwner.LEGACY_STORE_KEYS.includes(storeOwner.VOCAB_GAMES_STORE_KEY));

  const mine = bests.recordMatchTime(bests.emptyBests(), 'environment', 40_000, 1, 'x').bests;
  bests.saveBestsFor(anon, mine);
  assert.ok(local.data.has(storeOwner.scopedKeyFor(storeOwner.VOCAB_GAMES_STORE_KEY, anon)));
  assert.deepEqual(bests.loadBestsFor(A), bests.emptyBests(), 'A does not see the device\'s bests');

  const accounts = bests.recordMatchTime(bests.emptyBests(), 'environment', 45_000, 0, 'y').bests;
  bests.saveBestsFor(A, bests.recordSprintScore(accounts, 'mixed', 11, 'y').bests);

  const outcome = storeOwner.claimLegacyStores(local, anon, A);
  assert.ok(outcome.merged.includes(storeOwner.VOCAB_GAMES_STORE_KEY), 'joined by the games\' own rule');
  const joined = bests.loadBestsFor(A);
  assert.equal(joined.match.environment?.ms, 40_000, 'the faster time wins');
  assert.equal(joined.sprint.mixed?.score, 11);
  assert.equal(local.data.has(storeOwner.scopedKeyFor(storeOwner.VOCAB_GAMES_STORE_KEY, anon)), false, 'the device copy moved');
});
