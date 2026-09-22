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
import { VOCAB_STORE_KEY, scopedKey } from './store-owner';

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
  /** Distinct local dates (YYYY-MM-DD) on which this word was recalled
      correctly, unassisted, in 'recall' direction (never 'recognise' or
      'use'). A word only counts as known for planning once this reaches two
      DIFFERENT days (see isWordKnown, below): recognising a definition,
      however many times, is not enough on its own, and neither is a single
      successful recall. Optional and additive: a store written before this
      field existed loads with it simply absent, which reads exactly like
      "no successful recall yet" everywhere it is used. */
  recallSuccessDates?: string[];
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

/** Pure: WORDS.ts plus a map of vocabulary lesson fragments (whatever
    import.meta.glob's eager result looks like: relative path to raw HTML),
    merged and deduped by word, case-insensitively, first copy wins.
    Extracted from buildCardSet() below so a test can drive it with the real
    36 lesson bodies read from disk (fs.readFileSync, under plain Node),
    which is the only way to prove the real-build deck actually loads. The
    module-level CARD_SET export a few lines down always falls back to the
    words.ts-only 146-word deck under Node, because import.meta.glob is a
    Vite feature (see the guard in buildCardSet()); that fallback is correct
    for CARD_SET's own callers (see the comment there) but useless for
    verifying the real 36-topic deck, which is what this function is for. */
export function buildCardSetFromFragments(fragments: Readonly<Record<string, string>>): VocabCard[] {
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

function buildCardSet(): VocabCard[] {
  // import.meta.glob is a Vite/Astro build-time feature: guarded so this
  // module can also be imported under plain Node (the tests/*.test.ts
  // runner has no Vite plugin; see src/lib/plan/schedule.ts, which needs
  // getVocabSummary() for the daily plan's vocabulary item). Falls back to
  // the words.ts-only card set there; the real Astro build always has
  // import.meta.glob and gets the full set. tests/vocab-learning.test.ts
  // proves the real-build path separately, by feeding the real 36 lesson
  // bodies (read from disk) into buildCardSetFromFragments() above.
  const fragments =
    typeof import.meta.glob === 'function'
      ? import.meta.glob<string>('../content/lesson-bodies/vocabulary-*.html', {
          query: '?raw',
          import: 'default',
          eager: true,
        })
      : {};
  return buildCardSetFromFragments(fragments);
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

/* WHOSE REVIEW STATE (22 September 2026): the key now carries its owner, the
   same one the learner record uses, so a second student signing in on this
   browser does not inherit the first student's spaced-review schedule. See
   src/lib/store-owner.ts. The base key and the stored shape are unchanged. */
export const VOCAB_KEY = VOCAB_STORE_KEY;

const KEY = VOCAB_STORE_KEY;

function emptyStore(): VocabStoreV1 {
  return { version: 1, settings: { newPerDay: 10 }, cards: {} };
}

function loadStore(): VocabStoreV1 {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = window.localStorage.getItem(scopedKey(KEY));
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
    window.localStorage.setItem(scopedKey(KEY), JSON.stringify(store));
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

/** Returns the card's new state, additively: existing callers that treated
    this as void (every one before the recall/use modes) are unaffected,
    and recordReviewOutcome() (below) uses the return value to report the
    resulting due date without a second read of storage. */
export function rate(word: string, grade: Grade): VocabCardState | undefined {
  if (!CARD_BY_WORD.has(word)) return undefined;
  const store = loadStore();
  const today = todayStr();
  const base = store.cards[word] ?? freshState(today);
  const next = scheduleNext(base, grade, today);
  next.lastReviewed = new Date().toISOString();
  store.cards[word] = next;
  saveStore(store);
  return next;
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

/* ---------------------------------------------------------------------- */
/* Review modes: recognise (existing), recall, use in a sentence          */
/*                                                                          */
/* Vocabulary is supporting knowledge, never a fifth IELTS paper: nothing */
/* below produces a band, and "known" (isWordKnown) is a planning signal, */
/* not a score. Every function in this section is pure: no window, no     */
/* localStorage, so tests/vocab-learning.test.ts drives all of it with    */
/* plain objects, and the planner-facing functions further down can be    */
/* called from anywhere without a browser.                                */
/* ---------------------------------------------------------------------- */

export type ReviewMode = 'recognise' | 'recall' | 'use';

const KNOWN_RECALL_DAYS = 2;

/** True once a word has been recalled correctly, unassisted, on at least
    two DIFFERENT days. Recognising a definition (however many times) and a
    single successful recall never satisfy this on their own. */
export function isWordKnown(state: VocabCardState | undefined): boolean {
  return new Set(state?.recallSuccessDates ?? []).size >= KNOWN_RECALL_DAYS;
}

/** Which mode a card is ready for, from its own stored state alone: no
    randomness, so the same state always chooses the same mode.
      - never reviewed, or just reset by a lapse (reps back to 0): recognise,
        to (re)teach it;
      - reviewed at least once but not yet known: alternate recall and use,
        so production (recall) and application (use) both happen before the
        word is trusted;
      - known: mostly recall, with use in a sentence every third pass, to
        keep both skills fresh under ordinary spaced review. */
export function chooseReviewMode(state: VocabCardState | undefined): ReviewMode {
  if (!state || state.reps === 0) return 'recognise';
  if (!isWordKnown(state)) return state.reps % 2 === 1 ? 'recall' : 'use';
  return state.reps % 3 === 0 ? 'use' : 'recall';
}

/** Lenient recall check: case and repeated/surrounding whitespace are
    normalised, nothing else. A near-miss spelling is marked wrong rather
    than silently corrected: typed answers are never auto-corrected. */
export function checkRecallAnswer(typed: string, word: string): boolean {
  const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalise(typed) === normalise(word);
}

/** Whether revealing the answer (instead of answering it) counts as
    assistance. A named, independently testable one-liner rather than a
    literal scattered through the component: revealing is always assisted,
    and assistance is what keeps a word out of both "known" and "correct". */
export function vocabAssistanceLevel(revealed: boolean): 'none' | 'answer-shown' {
  return revealed ? 'answer-shown' : 'none';
}

/** The SM-2 grade an outcome maps to, the same way across all three modes:
    an unassisted correct answer is 'good', everything else sends the card
    back for more, sooner ('again', SM-2's own convention for a lapse). This
    is deliberately not the four-level self-rating recognise mode still
    offers on its own card face (Again/Hard/Good/Easy), which stays exactly
    as it was, calling rate() directly with the student's own choice. */
export function outcomeGrade(correct: boolean, assisted: boolean): Grade {
  return correct && !assisted ? 'good' : 'again';
}

/** A recall success (the only thing that can ever move a word toward
    "known") is an unassisted correct answer in 'recall' direction
    specifically. Recognising a definition never counts, and neither does a
    correct sentence in 'use' mode: the brief names recall by name. */
export function isRecallSuccess(direction: ReviewMode, correct: boolean, assisted: boolean): boolean {
  return direction === 'recall' && correct && !assisted;
}

/** A shallow, deliberately modest stem: strip a handful of common English
    suffixes so "pollution"/"polluting" or "environment"/"environmental" are
    recognised as related without pretending to be a real lemmatiser. Used
    by checkSentenceUsage below and by relevantVocabTopics further down, the
    same modest bar in both places, never claimed as more than it is. */
function looseStem(word: string): string {
  return word.toLowerCase().replace(/(ational|ation|ative|ing|ies|edly|ed|ly|al|er|est|es|s)$/, '');
}

/** True when `sentence` uses `word`, or a simple inflection of it. A
    multi-word term ("carbon footprint") must appear as the exact phrase,
    case-insensitively; a single word matches by shared stem, guarded so a
    short stem (3 characters or fewer, where a false match is likeliest)
    only matches the exact word. */
export function sentenceMentionsWord(sentence: string, word: string): boolean {
  const tokens: string[] = sentence.toLowerCase().match(/[a-z']+/g) ?? [];
  const wordTokens: string[] = word.toLowerCase().match(/[a-z']+/g) ?? [];
  if (wordTokens.length === 0) return false;
  if (wordTokens.length > 1) {
    const joined = ` ${tokens.join(' ')} `;
    const phrase = ` ${wordTokens.join(' ')} `;
    return joined.includes(phrase);
  }
  const [only] = wordTokens as [string];
  const stem = looseStem(only);
  if (stem.length <= 3) return tokens.includes(only);
  return tokens.some((t) => t === only || looseStem(t) === stem);
}

/** How many words a "use it in a sentence" answer needs before it is even
    worth comparing against the real example. Modest on purpose: this is a
    mechanical floor, not a grammar check, and nothing here judges grammar
    without a model. */
export const MIN_SENTENCE_WORDS = 4;

export interface SentenceCheckResult {
  mentionsWord: boolean;
  longEnough: boolean;
  /** Both of the above. Passing this is not correctness: it only means the
      attempt is real enough to compare against the lesson's own example and
      ask the student to judge it themselves. */
  passes: boolean;
}

export function checkSentenceUsage(sentence: string, word: string): SentenceCheckResult {
  const mentionsWord = sentenceMentionsWord(sentence, word);
  const wordCount = sentence.trim().split(/\s+/).filter(Boolean).length;
  const longEnough = wordCount >= MIN_SENTENCE_WORDS;
  return { mentionsWord, longEnough, passes: mentionsWord && longEnough };
}

/** Every due card paired with the mode it is ready for (chooseReviewMode).
    The session-building counterpart of getDueCards(): same queue, same
    shuffle, with each card's mode already decided so the component never
    reaches back into storage per-card while rendering. */
export function getDueCardsWithModes(topic?: string): { card: VocabCard; mode: ReviewMode }[] {
  const store = loadStore();
  return getDueCards(topic).map((card) => ({ card, mode: chooseReviewMode(store.cards[card.word]) }));
}

/** Records one review outcome against the local spaced-review state: the
    same scheduler every mode has always used (rate(), unchanged behaviour
    and unchanged stored shape), plus, for an unassisted correct RECALL
    only, today's local date added to the word's recallSuccessDates.
    Browser-only, like rate() itself; the pure decisions above (outcomeGrade,
    isRecallSuccess) are what make this a thin, testable-by-composition
    wrapper rather than new scheduling logic of its own. */
export function recordReviewOutcome(
  word: string,
  direction: ReviewMode,
  correct: boolean,
  assisted: boolean,
  today: string = todayStr(),
): VocabCardState | undefined {
  const grade = outcomeGrade(correct, assisted);
  const next = rate(word, grade);
  if (!next || !isRecallSuccess(direction, correct, assisted)) return next;

  const store = loadStore();
  const state = store.cards[word];
  if (!state) return next;
  const dates = new Set(state.recallSuccessDates ?? []);
  dates.add(today);
  state.recallSuccessDates = Array.from(dates).sort();
  saveStore(store);
  return state;
}

/* ---------------------------------------------------------------------- */
/* Pure functions for the planner. Data in, data out: nothing here reads  */
/* localStorage or any other browser API, so the planner (or a test) can  */
/* drive them with a VocabStoreV1 it already has in hand. See this        */
/* package's report for the exact recipe the planner calls.               */
/* ---------------------------------------------------------------------- */

export interface VocabDueWord {
  word: string;
  topic: string;
  due: string;
  mode: Extract<ReviewMode, 'recall' | 'use'>;
}

/** Words ready for production practice today: already introduced (rated at
    least once) AND due AND past the point where recognise is still the
    right mode. Deliberately narrower than getDueCards(), which also offers
    brand-new words: a plan's "recall" step is for testing production on
    words the student has already met, not first exposure. Pure and
    deterministic for a fixed `today`: no shuffling here, that stays a
    session-building concern (getDueCardsWithModes, above). */
export function wordsDueForRecall(
  cardSet: readonly VocabCard[],
  store: VocabStoreV1,
  today: string,
): VocabDueWord[] {
  const out: VocabDueWord[] = [];
  for (const card of cardSet) {
    const state = store.cards[card.word];
    if (!state || state.reps === 0 || state.due > today) continue;
    const mode = chooseReviewMode(state);
    if (mode === 'recognise') continue;
    out.push({ word: card.word, topic: card.topic, due: state.due, mode });
  }
  return out;
}

/** wordsDueForRecall's count plus a per-topic breakdown, for a plan step's
    "N words due, mostly from Environment" without the caller re-deriving it
    from the array every time. */
export function vocabRecallDueSummary(
  cardSet: readonly VocabCard[],
  store: VocabStoreV1,
  today: string,
): { count: number; byTopic: Readonly<Record<string, number>> } {
  const words = wordsDueForRecall(cardSet, store, today);
  const byTopic: Record<string, number> = {};
  for (const w of words) byTopic[w.topic] = (byTopic[w.topic] ?? 0) + 1;
  return { count: words.length, byTopic };
}

export interface VocabTopicRelevance {
  slug: string;
  title: string;
  score: number;
}

const TOPIC_TITLE_STOPWORDS = new Set(['and', 'the', 'of', 'in', 'for', 'a', 'an']);

/** Words common enough, across unrelated essay prompts, that matching one
    says nothing about topic. Most come from the imported pool's own
    boilerplate ("Give reasons for your answer and include any relevant
    examples from your own knowledge or experience.", "Write at least {n}
    words.", appended to nearly every prompt) rather than from the question
    itself, plus a couple of everyday nouns generic enough to turn up in any
    topic's title or word list without being what the text is actually
    about. Kept short and named, not a general-purpose stopword list. */
const GENERIC_NOISE_WORDS = new Set([
  'people',
  'words',
  'word',
  'experience',
  'experiences',
  'knowledge',
  'reason',
  'reasons',
  'answer',
  'answers',
  'example',
  'examples',
  'things',
  'thing',
]);

/** A topic (or a prompt, a lesson blurb, anything) is "about" a vocabulary
    topic when its text shares a stemmed word, not in GENERIC_NOISE_WORDS,
    with either that topic's own title ("Environment & Ecology" -> environment,
    ecology: the existing VOCABULARY_PARTS taxonomy, not an invented one) or
    one of its CARD_SET words. Checking the title as well as the curated
    words matters in practice: a real essay prompt often uses the everyday
    adjective ("environmental benefits") without ever using one of the twenty
    curated nouns, and would otherwise score every topic zero. */
export function relevantVocabTopics(
  text: string,
  cardSet: readonly VocabCard[] = CARD_SET,
  limit = 3,
): VocabTopicRelevance[] {
  const textTokens = (text.toLowerCase().match(/[a-z']+/g) ?? []).filter((tok) => !GENERIC_NOISE_WORDS.has(tok));
  const textStems = new Set(textTokens.map(looseStem));

  const matchesText = (term: string): boolean => {
    const termTokens = (term.toLowerCase().match(/[a-z']+/g) ?? []).filter((tok) => !GENERIC_NOISE_WORDS.has(tok));
    return (
      termTokens.length > 0 &&
      termTokens.every((tok) => textTokens.includes(tok) || textStems.has(looseStem(tok)))
    );
  };

  const scoreBySlug = new Map<string, number>();
  for (const part of VOCABULARY_PARTS) {
    let score = 0;
    for (const titleWord of part.title.toLowerCase().match(/[a-z']+/g) ?? []) {
      if (TOPIC_TITLE_STOPWORDS.has(titleWord)) continue;
      if (matchesText(titleWord)) score += 1;
    }
    if (score > 0) scoreBySlug.set(part.slug, score);
  }
  for (const card of cardSet) {
    if (!matchesText(card.word)) continue;
    const slug = VOCABULARY_PARTS.find((p) => p.title === card.topic)?.slug;
    if (!slug) continue;
    // A curated vocabulary word is stronger evidence of "aboutness" than a
    // topic's own title word (which can be a fairly ordinary noun, like
    // "Society" or "Family"), so it counts for more.
    scoreBySlug.set(slug, (scoreBySlug.get(slug) ?? 0) + 2);
  }

  return [...scoreBySlug.entries()]
    .map(([slug, score]) => ({ slug, title: topicTitleForSlug(slug, slug), score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** The lesson slug of a vocabulary topic, given the TITLE a card carries.
 *
 *  Cards are grouped by title ("Ageing & Retirement"); everything that
 *  links to a topic, including the catalogue's own `review:vocabulary:<slug>`
 *  activities, is keyed by slug. Added 22 September 2026 so the planner's
 *  browser layer can turn a per-topic due count into a real activity id
 *  without repeating this lookup inline. Null for a title that belongs to
 *  no lesson topic, which is never guessed at. */
export function vocabTopicSlugFor(title: string): string | null {
  return VOCABULARY_PARTS.find((part) => part.title === title)?.slug ?? null;
}

export type VocabProblemReason = 'repeated-recall-failure' | 'low-lexical-resource';

export interface VocabProblem {
  reason: VocabProblemReason;
  /** Set for 'repeated-recall-failure'; absent for 'low-lexical-resource',
      which is a general signal rather than a single word. */
  word?: string;
  topic?: string;
  lapses?: number;
}

/** Provisional, like every threshold named in
    docs/personal-learning/ARCHITECTURE.md's policy section: not validated
    IELTS science, just a configurable line the lead can move. A recent
    Lexical Resource average under this counts as an observed vocabulary
    problem worth a plan nudge. */
export const LOW_LEXICAL_RESOURCE_BAND = 5.5;

/** Genuinely observed vocabulary problems, never invented ones:
      - a word the student has failed to recall at least twice (the same
        lapses count getStrugglingCards() already reads, so "struggling" and
        "a vocabulary problem" always agree);
      - a recent Lexical Resource average below LOW_LEXICAL_RESOURCE_BAND,
        when the caller supplies one.
    This function never reads graded writing or speaking itself, and never
    writes anything: it takes the bands already read from the policy
    output, because doing otherwise would mean importing the browser store
    or the policy layer into what has to stay a pure, parameter-in
    function. See this package's report for the exact call the planner
    makes. */
export function observedVocabProblems(
  store: VocabStoreV1,
  cardSet: readonly VocabCard[] = CARD_SET,
  recentLexicalResourceBands: readonly number[] = [],
): VocabProblem[] {
  const problems: VocabProblem[] = [];
  const cardByWord = new Map(cardSet.map((c) => [c.word, c] as const));
  for (const [word, state] of Object.entries(store.cards)) {
    if (state.lapses < 2) continue;
    const card = cardByWord.get(word);
    problems.push({ reason: 'repeated-recall-failure', word, topic: card?.topic, lapses: state.lapses });
  }
  if (recentLexicalResourceBands.length > 0) {
    const average = recentLexicalResourceBands.reduce((a, b) => a + b, 0) / recentLexicalResourceBands.length;
    if (average < LOW_LEXICAL_RESOURCE_BAND) problems.push({ reason: 'low-lexical-resource' });
  }
  return problems.sort((a, b) => (b.lapses ?? 0) - (a.lapses ?? 0));
}
