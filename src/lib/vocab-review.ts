/* Spaced vocabulary review: card set, SM-2 style scheduler, and a
   localStorage-backed store, versioned like src/lib/progress.ts.

   The card set is built once, at module load, from two sources:
     1. every word in src/data/words.ts (the Word-of-the-Day bank)
     2. every word row inside the 14 vocabulary topic lessons
        (src/content/lesson-bodies/vocabulary-*.html), parsed from the raw
        HTML at build time the same way the lesson routers do
        (import.meta.glob with `?raw`, eager).
   The two sources overlap heavily (the topic lessons were written from the
   same word bank), so the merged set is deduped by word, case-insensitively,
   keeping whichever copy was seen first.

   Topic labels are normalised to the titles in src/data/vocabulary.ts
   (VOCABULARY_PARTS) rather than the shorter names in words.ts or the raw
   <h2> text in each lesson fragment, so every card for "Crime" (words.ts)
   and "Crime & Law" (the lesson heading) ends up tagged with one label
   ("Crime & Law") instead of splitting the topic filter into two near-
   duplicate chips. */

import { WORDS } from '../data/words';
import { VOCABULARY_PARTS } from '../data/vocabulary';

export interface VocabCard {
  word: string;
  definition: string;
  example: string;
  topic: string;
  /** Generic collocations for this card's topic (from the lesson's "Key
      Collocations" box), shown as a bonus on the back of the card. Shared
      across every card in the same topic lesson; absent for words.ts-only
      topics that have no matching lesson fragment. */
  collocations?: string[];
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';
export type NewPerDay = 5 | 10 | 20;

interface VocabCardState {
  ease: number;
  /** Current interval in days. 0 means "due again today". */
  interval: number;
  /** ISO date (YYYY-MM-DD) the card next becomes due. */
  due: string;
  reps: number;
  lapses: number;
  /** ISO date (YYYY-MM-DD) the card was first introduced. */
  introducedDate: string;
  /** ISO datetime of the most recent rating, if any. */
  lastReviewed?: string;
}

interface VocabStoreV1 {
  version: 1;
  settings: { newPerDay: NewPerDay };
  cards: Record<string, VocabCardState>;
}

export interface VocabSummary {
  /** Already-introduced cards due for review today. */
  due: number;
  /** New cards still available to introduce today, within the daily cap. */
  newToday: number;
  /** Cards that have been reviewed at least once. */
  learned: number;
  /** Total cards in the deck. */
  total: number;
  /** Cards rated at least once today. */
  reviewedToday: number;
}

export interface StrugglingCard extends VocabCard {
  lapses: number;
}

/* ---------------------------------------------------------------------- */
/* Card set: words.ts + the 14 vocabulary lesson fragments                */
/* ---------------------------------------------------------------------- */

/* words.ts uses short topic names ("Crime"); the lesson fragments and
   VOCABULARY_PARTS use the full lesson title ("Crime & Law"). This maps the
   short name to the lesson slug so both sources land on one label. Kept as
   an explicit table (rather than fuzzy-matching strings) because it is
   small, stable, and wrong silently if the shapes ever drift apart. */
const WORDS_TOPIC_TO_SLUG: Record<string, string> = {
  'Artificial Intelligence': 'ai',
  Conjunctions: 'conjunctions',
  Crime: 'crime',
  Education: 'education',
  Environment: 'environment',
  Family: 'family',
  Government: 'government',
  Health: 'health',
  Housing: 'housing',
  'Social Media': 'social-media',
  Society: 'society',
  Technology: 'technology',
  Travel: 'travel',
  Work: 'work',
};

function topicTitleForSlug(slug: string, fallback: string): string {
  return VOCABULARY_PARTS.find((p) => p.slug === slug)?.title ?? fallback;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&rsquo;/g, '’')
    .replace(/&nbsp;/g, ' ');
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).trim();
}

/** One <table class="vocab-table"> row: word, meaning, example. */
interface ParsedRow {
  word: string;
  meaning: string;
  example: string;
}

function parseVocabFragment(raw: string): { rows: ParsedRow[]; collocations: string[] } {
  const rows: ParsedRow[] = [];
  const rowRe = /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(raw))) {
    const word = stripTags(rowMatch[1]!);
    const meaning = stripTags(rowMatch[2]!);
    // Example sentences are wrapped in literal quote marks in the source
    // markup; drop them here so the card component controls its own
    // quoting/typography instead of inheriting the lesson's.
    const example = stripTags(rowMatch[3]!).replace(/^["“](.*)["”]$/, '$1');
    if (word && meaning) rows.push({ word, meaning, example });
  }

  const collocations: string[] = [];
  const collocMatch = raw.match(/<h3>Key Collocations<\/h3>\s*<ul>([\s\S]*?)<\/ul>/);
  if (collocMatch) {
    const liRe = /<li>([\s\S]*?)<\/li>/g;
    let liMatch: RegExpExecArray | null;
    while ((liMatch = liRe.exec(collocMatch[1]!))) {
      const text = stripTags(liMatch[1]!);
      if (text) collocations.push(text);
    }
  }
  return { rows, collocations };
}

function buildCardSet(): VocabCard[] {
  const seen = new Set<string>();
  const cards: VocabCard[] = [];

  for (const w of WORDS) {
    const key = w.word.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const slug = WORDS_TOPIC_TO_SLUG[w.topic];
    cards.push({
      word: w.word,
      definition: w.def,
      example: w.example ?? '',
      topic: slug ? topicTitleForSlug(slug, w.topic) : w.topic,
    });
  }

  // import.meta.glob is a Vite/Astro build-time feature: guarded so this
  // module can also be imported under plain Node (the tests/*.test.ts
  // runner has no Vite plugin — see src/lib/plan/schedule.ts, which needs
  // getVocabSummary() for the daily plan's vocabulary item). Falls back to
  // the words.ts-only card set there; the real Astro build always has
  // import.meta.glob and gets the full set.
  const fragments =
    typeof import.meta.glob === 'function'
      ? import.meta.glob<string>('../content/lesson-bodies/vocabulary-*.html', {
          query: '?raw',
          import: 'default',
          eager: true,
        })
      : {};

  for (const path of Object.keys(fragments).sort()) {
    const match = path.match(/vocabulary-([a-z-]+)\.html$/);
    if (!match) continue;
    const slug = match[1]!;
    const topic = topicTitleForSlug(slug, slug);
    const { rows, collocations } = parseVocabFragment(fragments[path]!);
    for (const row of rows) {
      const key = row.word.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({
        word: row.word,
        definition: row.meaning,
        example: row.example,
        topic,
        collocations: collocations.length ? collocations : undefined,
      });
    }
  }

  return cards;
}

export const CARD_SET: VocabCard[] = buildCardSet();

const CARD_BY_WORD = new Map<string, VocabCard>(CARD_SET.map((c) => [c.word, c]));

export function topics(): string[] {
  return Array.from(new Set(CARD_SET.map((c) => c.topic))).sort((a, b) => a.localeCompare(b));
}

/* ---------------------------------------------------------------------- */
/* Store (localStorage, versioned, guarded)                               */
/* ---------------------------------------------------------------------- */

const KEY = 'ielts.vocab.v1';

function emptyStore(): VocabStoreV1 {
  return { version: 1, settings: { newPerDay: 10 }, cards: {} };
}

function loadStore(): VocabStoreV1 {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return emptyStore();
    const base = emptyStore();
    return {
      version: 1,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      cards: parsed.cards && typeof parsed.cards === 'object' ? parsed.cards : {},
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(store: VocabStoreV1): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage full/blocked — review progress is a nice-to-have, never fatal */
  }
}

export function getSettings(): { newPerDay: NewPerDay } {
  return loadStore().settings;
}

export function setNewPerDay(newPerDay: NewPerDay): void {
  const store = loadStore();
  store.settings.newPerDay = newPerDay;
  saveStore(store);
}

/* ---------------------------------------------------------------------- */
/* Dates                                                                  */
/* ---------------------------------------------------------------------- */

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ---------------------------------------------------------------------- */
/* SM-2 style scheduler                                                   */
/* ---------------------------------------------------------------------- */

const MIN_EASE = 1.3;
const START_EASE = 2.5;

function freshState(today: string): VocabCardState {
  return { ease: START_EASE, interval: 0, due: today, reps: 0, lapses: 0, introducedDate: today };
}

/** Applies one rating to a card's current state and returns the next state.
    Pure — doesn't touch storage, so it also powers the "next interval"
    preview under each rating button. */
function scheduleNext(state: VocabCardState, grade: Grade, today: string): VocabCardState {
  let { ease, interval, reps, lapses } = state;

  switch (grade) {
    case 'again':
      lapses += 1;
      reps = 0;
      ease = Math.max(MIN_EASE, ease - 0.2);
      interval = 0; // due again today — the session queue re-shows it later
      break;
    case 'hard':
      ease = Math.max(MIN_EASE, ease - 0.15);
      interval = reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
      reps += 1;
      break;
    case 'good':
      interval = reps === 0 ? 1 : reps === 1 ? 6 : Math.round(interval * ease);
      reps += 1;
      break;
    case 'easy':
      ease = ease + 0.15;
      interval = reps === 0 ? 4 : Math.round(Math.max(interval, 1) * ease * 1.3);
      reps += 1;
      break;
  }

  return { ...state, ease, interval, reps, lapses, due: addDays(today, interval) };
}

/** Days until a card would next be due for each possible rating, without
    saving anything — feeds the "Good: 4 days" captions under the rating
    buttons. Uses the card's current stored state, or a fresh new-card state
    if it hasn't been rated before. */
export function previewIntervals(word: string): Record<Grade, number> {
  const store = loadStore();
  const today = todayStr();
  const base = store.cards[word] ?? freshState(today);
  const grades: Grade[] = ['again', 'hard', 'good', 'easy'];
  const out = {} as Record<Grade, number>;
  for (const g of grades) out[g] = scheduleNext(base, g, today).interval;
  return out;
}

export function rate(word: string, grade: Grade): void {
  if (!CARD_BY_WORD.has(word)) return;
  const store = loadStore();
  const today = todayStr();
  const base = store.cards[word] ?? freshState(today);
  const next = scheduleNext(base, grade, today);
  next.lastReviewed = new Date().toISOString();
  store.cards[word] = next;
  saveStore(store);
}

/* ---------------------------------------------------------------------- */
/* Session queue + summary                                                */
/* ---------------------------------------------------------------------- */

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Today's review queue: every already-introduced card that's due, plus as
    many not-yet-seen cards as the daily new-card cap still allows (counting
    cards already introduced today, wherever they were introduced from). */
export function getDueCards(topic?: string): VocabCard[] {
  const store = loadStore();
  const today = todayStr();
  const pool = topic ? CARD_SET.filter((c) => c.topic === topic) : CARD_SET;

  const due: VocabCard[] = [];
  for (const card of pool) {
    const state = store.cards[card.word];
    if (state && state.due <= today) due.push(card);
  }

  const introducedToday = Object.values(store.cards).filter((s) => s.introducedDate === today).length;
  const newSlots = Math.max(0, store.settings.newPerDay - introducedToday);
  const newCards = pool.filter((c) => !store.cards[c.word]).slice(0, newSlots);

  return shuffled([...due, ...newCards]);
}

export function getVocabSummary(): VocabSummary {
  const store = loadStore();
  const today = todayStr();

  let due = 0;
  let learned = 0;
  let reviewedToday = 0;
  let introducedToday = 0;

  for (const state of Object.values(store.cards)) {
    if (state.due <= today) due++;
    if (state.reps > 0) learned++;
    if (state.lastReviewed && state.lastReviewed.slice(0, 10) === today) reviewedToday++;
    if (state.introducedDate === today) introducedToday++;
  }

  const availableNew = CARD_SET.filter((c) => !store.cards[c.word]).length;
  const newToday = Math.max(0, Math.min(store.settings.newPerDay - introducedToday, availableNew));

  return { due, newToday, learned, total: CARD_SET.length, reviewedToday };
}

/** Cards the student keeps getting wrong (2+ lapses), across the whole deck
    — shown as a "Words I struggle with" list at the end of a session. */
export function getStrugglingCards(): StrugglingCard[] {
  const store = loadStore();
  return Object.entries(store.cards)
    .filter(([, state]) => state.lapses >= 2)
    .map(([word, state]) => ({ ...(CARD_BY_WORD.get(word) as VocabCard), lapses: state.lapses }))
    .filter((c) => c.word)
    .sort((a, b) => b.lapses - a.lapses);
}
