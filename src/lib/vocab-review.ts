/* Spaced vocabulary review: card set, SM-2 style scheduler, and a
   localStorage-backed store, versioned like src/lib/progress.ts.

   The card set is built once, at module load, from two sources:
     1. every word in src/data/words.ts (the Word-of-the-Day bank)
     2. every word row inside the vocabulary topic lessons
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

export interface VocabCardState {
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

export interface VocabStoreV1 {
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
/* Card set: words.ts + every vocabulary lesson fragment                  */
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

/** The reverse of the table above: lesson slug -> words.ts's short topic
    name. Used by the topic-browser parser (below) to find which words.ts
    entries belong to a given lesson, so it can merge in any that lesson's
    own table is missing. */
const SLUG_TO_WORDS_TOPIC: Record<string, string> = Object.fromEntries(
  Object.entries(WORDS_TOPIC_TO_SLUG).map(([topic, slug]) => [slug, topic]),
);

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

/** One <table class="vocab-table"> row: word, meaning, example. Shared shape
    between the flashcard deck below and the topic-browser parser further
    down, since both read the same markup. */
export interface VocabWordRow {
  word: string;
  meaning: string;
  example: string;
}

/** Every <tr><td>word</td><td>meaning</td><td>example</td></tr> row in a
    fragment of HTML, in document order. Scans the whole string with no
    notion of nesting, so callers control scope by how much markup they
    pass in (a whole lesson file, or just one card's inner HTML). */
function parseTableRows(raw: string): VocabWordRow[] {
  const rows: VocabWordRow[] = [];
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
  return rows;
}

function parseVocabFragment(raw: string): { rows: VocabWordRow[]; collocations: string[] } {
  const rows = parseTableRows(raw);

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
/* Topic browser: one lesson's vocabulary, grouped the way the lesson      */
/* teaches it, for /review's topic view (src/components/VocabTopics.tsx). */
/*                                                                          */
/* Parsed at build time — review.astro calls buildVocabTopicData() once    */
/* per topic, from the same raw HTML import.meta.glob reads for the        */
/* flashcard deck above, and passes the typed result down as props. The    */
/* browser never re-parses lesson HTML itself.                            */
/* ---------------------------------------------------------------------- */

/** One <h3> group from a lesson, other than the top-level word table.
    `words` for a group whose content is itself a <table class="vocab-table">
    (the conjunctions lesson's function groups: Contrast, Addition, ...) —
    these still count toward the topic's word total. `items` for a group
    whose content is a plain <ul> (Key Collocations, Useful Essay Phrases) —
    pre-sanitised inline HTML per item, kept as bullets, not counted as
    vocabulary. Exactly one of the two is set. */
export interface VocabCategory {
  heading: string;
  words?: VocabWordRow[];
  items?: string[];
}

export interface VocabTopicData {
  slug: string;
  title: string;
  /** "Words and phrases": the lesson's own top-level table (the one word
      list not nested inside an <h3> group), plus any words.ts entries for
      this topic that no table in the lesson already has. Empty when the
      lesson has no top-level table of its own (conjunctions: every word
      lives inside a function group instead) and words.ts has nothing left
      to add. */
  words: VocabWordRow[];
  /** Every other <h3> group, in document order. */
  categories: VocabCategory[];
  /** words.length plus every category's word-row count (list-only
      categories don't count) — the topic's total distinct vocabulary,
      shown on the landing card and matching the lesson's own "N words"
      eyebrow copy. */
  wordCount: number;
}

/** A table cell sometimes spells one vocabulary item two ways at once —
    "literacy / numeracy", "artificial intelligence (AI)", "epidemic /
    pandemic" — so the words.ts merge (below) needs every alternative, not
    just the cell's full text, or it re-adds "literacy" as if the lesson
    never taught it. Strips a trailing "(...)" abbreviation, then splits on
    "/". */
function wordVariants(raw: string): string[] {
  const noAbbreviation = raw.replace(/\([^)]*\)/g, '').trim();
  return noAbbreviation
    .split('/')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

const INLINE_TAG_ALLOWLIST = new Set(['strong', 'em', 'b', 'i']);

/** Strip every tag from a snippet of trusted, build-time HTML except a
    small inline allow-list (and any attributes on those), so a list item
    like "<strong>tackle</strong> climate change" keeps its bold word when
    rendered with dangerouslySetInnerHTML. Entities are left alone — the
    browser decodes them the same as any other innerHTML. */
function sanitizeInline(html: string): string {
  return html.replace(/<\/?([a-zA-Z0-9]+)[^>]*>/g, (match, tagName: string) => {
    const tag = tagName.toLowerCase();
    if (!INLINE_TAG_ALLOWLIST.has(tag)) return '';
    return match.startsWith('</') ? `</${tag}>` : `<${tag}>`;
  });
}

/** Every top-level <div class="card">...</div> block in a lesson fragment,
    with its <h3> heading and inner HTML. Tracks <div> depth by hand rather
    than a non-greedy regex, so a card whose content ever grows a nested
    <div> still closes at the right </div> instead of truncating early. */
function extractCardBlocks(raw: string): { heading: string; inner: string }[] {
  const blocks: { heading: string; inner: string }[] = [];
  const openTag = '<div class="card">';
  let searchFrom = 0;
  for (;;) {
    const openIdx = raw.indexOf(openTag, searchFrom);
    if (openIdx === -1) break;
    const contentStart = openIdx + openTag.length;
    const tagRe = /<div[\s>]|<\/div>/g;
    tagRe.lastIndex = contentStart;
    let depth = 1;
    let contentEnd = raw.length;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRe.exec(raw))) {
      if (tagMatch[0].startsWith('</div>')) {
        depth -= 1;
        if (depth === 0) {
          contentEnd = tagMatch.index;
          break;
        }
      } else {
        depth += 1;
      }
    }
    const inner = raw.slice(contentStart, contentEnd);
    const headingMatch = inner.match(/<h3>([\s\S]*?)<\/h3>/);
    blocks.push({ heading: headingMatch ? stripTags(headingMatch[1]!) : '', inner });
    searchFrom = contentEnd;
  }
  return blocks;
}

/** The lesson's own top-level word table — the rows not nested inside any
    <h3> group — or an empty list when every table in the lesson lives
    inside a card (conjunctions). */
function parseTopLevelTable(raw: string, firstCardIndex: number): VocabWordRow[] {
  const tableMatch = raw.match(/<table class="vocab-table"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) return [];
  const tableIndex = raw.indexOf(tableMatch[0]);
  if (firstCardIndex !== -1 && tableIndex > firstCardIndex) return []; // lives inside a card instead
  return parseTableRows(tableMatch[1]!);
}

/** Parse one vocabulary lesson's raw HTML into the typed, grouped shape the
    topic view renders. Pure — takes the raw fragment string review.astro
    already read via import.meta.glob, does no I/O of its own. */
export function buildVocabTopicData(raw: string, slug: string, title: string): VocabTopicData {
  const firstCardIndex = raw.indexOf('<div class="card">');
  const topWords = parseTopLevelTable(raw, firstCardIndex);

  const categories: VocabCategory[] = [];
  for (const block of extractCardBlocks(raw)) {
    if (!block.heading) continue;
    const tableMatch = block.inner.match(/<table class="vocab-table"[^>]*>([\s\S]*?)<\/table>/);
    if (tableMatch) {
      const words = parseTableRows(tableMatch[1]!);
      if (words.length) categories.push({ heading: block.heading, words });
      continue;
    }
    const listMatch = block.inner.match(/<ul>([\s\S]*?)<\/ul>/);
    if (!listMatch) continue;
    const items: string[] = [];
    const liRe = /<li>([\s\S]*?)<\/li>/g;
    let liMatch: RegExpExecArray | null;
    while ((liMatch = liRe.exec(listMatch[1]!))) {
      const html = sanitizeInline(liMatch[1]!.trim());
      if (html) items.push(html);
    }
    if (items.length) categories.push({ heading: block.heading, items });
  }

  // Every word already shown somewhere in the lesson (top-level table or a
  // category's own table), so the words.ts merge below only adds what the
  // lesson doesn't already teach. A handful of table entries spell the same
  // word two ways at once ("literacy / numeracy", "artificial intelligence
  // (AI)") — wordVariants() splits those apart so "literacy" from words.ts
  // still matches instead of getting merged in as a spurious extra.
  const present = new Set<string>();
  for (const w of topWords) for (const variant of wordVariants(w.word)) present.add(variant);
  for (const c of categories) for (const w of c.words ?? []) for (const variant of wordVariants(w.word)) present.add(variant);

  const words = [...topWords];
  const wordsTopic = SLUG_TO_WORDS_TOPIC[slug];
  if (wordsTopic) {
    for (const w of WORDS) {
      if (w.topic !== wordsTopic) continue;
      const variants = wordVariants(w.word);
      if (variants.some((v) => present.has(v))) continue;
      for (const v of variants) present.add(v);
      words.push({ word: w.word, meaning: w.def, example: w.example ?? '' });
    }
  }

  const wordCount = words.length + categories.reduce((n, c) => n + (c.words?.length ?? 0), 0);

  return { slug, title, words, categories, wordCount };
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

/* The two functions below exist only so the sync layer
   (src/lib/learning/sync.browser.ts) can carry review state between a
   student's devices. They are the SAME read and write every function in this
   file already uses, exposed rather than reimplemented, so nothing about how
   vocabulary behaves on this device changes. The merge rule (per word, the
   later review wins, and an interval never goes backwards because of an
   older device) lives in the sync layer, next to the other companion rules,
   not here. */

/** The whole review store as it stands, for sending to the account. */
export function readVocabSyncSnapshot(): VocabStoreV1 {
  return loadStore();
}

/** Replace the review store with the merged version from the account. */
export function writeVocabSyncSnapshot(store: VocabStoreV1): void {
  saveStore(store);
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
