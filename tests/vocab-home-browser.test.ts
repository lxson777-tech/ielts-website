/* The Vocabulary home's two browser reads, against an in-memory browser
   store: the day streak must be the dashboard's own figure, and the words
   due must be the dashboard's own vocabulary count. A separate file from
   tests/vocab-home.test.ts because it installs a fake `window` before the
   stores are first touched. */

import test from 'node:test';
import assert from 'node:assert/strict';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const storage = memoryStorage();
(globalThis as Record<string, unknown>).window = {
  get localStorage() {
    return storage;
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
};
Object.defineProperty(globalThis, 'localStorage', { get: () => storage, configurable: true });

const { readStreak, readVocabStore, countDueWords, schedulerToday, todayStrip } = await import('../src/lib/vocab-home.ts');
const { getStreak } = await import('../src/lib/plan/streak.ts');
const { addDays, toLocalDateKey } = await import('../src/lib/plan/date.ts');
const { getProgress, replaceProgress } = await import('../src/lib/progress.ts');
const { getVocabSummary, writeVocabSyncSnapshot } = await import('../src/lib/vocab-review.ts');

test('a brand new student has no streak and nothing due', () => {
  assert.equal(readStreak(), 0);
  const s = readVocabStore();
  assert.deepEqual(s.cards, {});
  assert.equal(todayStrip(s, readStreak(), schedulerToday()).fresh, true);
});

test('the streak is the dashboard figure: today plus every earlier day that met the goal', () => {
  const now = new Date();
  const today = toLocalDateKey(now);
  const p = getProgress();
  p.activity = {
    [today]: { minutes: 5, lessons: 0, attempts: 1 },
    [addDays(today, -1)]: { minutes: 30, lessons: 1, attempts: 0 },
    [addDays(today, -2)]: { minutes: 25, lessons: 1, attempts: 0 },
    [addDays(today, -3)]: { minutes: 10, lessons: 0, attempts: 1 }, // under the 25 minute goal: the run stops
    [addDays(today, -4)]: { minutes: 60, lessons: 2, attempts: 0 },
  };
  replaceProgress(p);
  assert.equal(readStreak(now), 3);
  assert.equal(readStreak(now), getStreak(null, now), 'the same figure the dashboard greeting shows');
});

test('the words due are the dashboard vocabulary count, read without writing anything', () => {
  const today = schedulerToday();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const card = (due: string) => ({ ease: 2.5, interval: 1, due, reps: 1, lapses: 0, introducedDate: yesterday });
  writeVocabSyncSnapshot({
    version: 1,
    settings: { newPerDay: 10 },
    cards: { 'carbon footprint': card(yesterday), biodiversity: card(today), deforestation: card(tomorrow) },
  });
  const before = new Map(storage.data);
  const s = readVocabStore();
  assert.equal(countDueWords(s, today), 2);
  assert.equal(countDueWords(s, today), getVocabSummary().due);
  assert.deepEqual(new Map(storage.data), before, 'reading the home changed nothing in storage');
  assert.equal(todayStrip(s, readStreak(), today).fresh, false);
});
