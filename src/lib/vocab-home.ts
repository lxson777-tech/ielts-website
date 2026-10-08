/* The Vocabulary home at /review (8 October 2026): the Today strip, the word
   of the day and the learnt-word rings on the topic cards.

   Everything here is a READ of state other modules own:
     - the spaced-review store (ielts.vocab.v1, owner-scoped) belongs to
       src/lib/vocab-review.ts, and is read through readVocabSyncSnapshot(),
       the same call the sync layer uses. Nothing here writes to it;
     - the day streak is src/lib/plan/streak.ts's getStreak(), the very
       figure the dashboard greeting shows, so the two numbers always agree.
       The dashboard passes the saved study plan (loadOrCreateStudyPlan);
       this page passes loadStudyPlan() instead, because a read-only page
       must not create a plan. A brand new default plan and no plan at all
       give getStreak the same 25 minute daily goal and every-day schedule,
       so the result is identical either way.

   The pure functions take the store, the topics and the date as arguments,
   so tests/vocab-home.test.ts drives them with plain objects. */

import type { VocabStoreV1, VocabTopicData, VocabWordRow, VocabCardState } from './vocab-review';
import { isWordKnown, readVocabSyncSnapshot } from './vocab-review';
import { getStreak } from './plan/streak';
import { loadStudyPlan } from './study-plan';
import { withBase } from './url';

/* ------------------------------------------------------------------ */
/* Games links (the games themselves are Builder V2's, /review/games)  */
/* ------------------------------------------------------------------ */

export type VocabGame = 'match' | 'sprint' | 'spell';

export const VOCAB_GAMES: readonly VocabGame[] = ['match', 'sprint', 'spell'];

/** The games page for one game, optionally limited to one topic. No topic
    means the mixed set: words due for review first, then new words. */
export function vocabGameHref(game: VocabGame, topic?: string | null): string {
  const params = new URLSearchParams({ game });
  if (topic) params.set('topic', topic);
  return `${withBase('/review/games')}?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Every word a topic teaches                                          */
/* ------------------------------------------------------------------ */

/** The topic's words in the order the lesson teaches them: the main table,
    then every category that is itself a word table (Go Further, the
    conjunction groups). The same rows wordCount counts. */
export function topicWordRows(topic: VocabTopicData): VocabWordRow[] {
  return [...topic.words, ...topic.categories.flatMap((c) => c.words ?? [])];
}

/** Store entries keyed by lower-case word. The store keys a word by the
    spelling of the first copy the deck met (words.ts or a lesson table), and
    a topic table can spell the same word with different capitals, so every
    lookup from a topic row goes through this. */
export function storeByWord(store: VocabStoreV1): Map<string, VocabCardState> {
  const map = new Map<string, VocabCardState>();
  for (const [word, state] of Object.entries(store.cards ?? {})) {
    map.set(word.trim().toLowerCase(), state);
  }
  return map;
}

export interface TopicRing {
  learnt: number;
  total: number;
  /** 0 to 1, for drawing the ring. */
  fraction: number;
}

/** How many of a topic's words count as learnt (src/lib/vocab-review.ts
    isWordKnown: spelt from memory, unassisted, on two different days), out
    of the topic's word count. */
export function topicRing(topic: VocabTopicData, byWord: ReadonlyMap<string, VocabCardState>): TopicRing {
  const rows = topicWordRows(topic);
  const total = topic.wordCount || rows.length;
  let learnt = 0;
  const seen = new Set<string>();
  for (const row of rows) {
    const key = row.word.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (isWordKnown(byWord.get(key))) learnt++;
  }
  learnt = Math.min(learnt, total);
  return { learnt, total, fraction: total > 0 ? learnt / total : 0 };
}

/** Whether this word counts as learnt, for one flip card's small mark. */
export function isRowLearnt(row: VocabWordRow, byWord: ReadonlyMap<string, VocabCardState>): boolean {
  return isWordKnown(byWord.get(row.word.trim().toLowerCase()));
}

/* ------------------------------------------------------------------ */
/* Due today                                                           */
/* ------------------------------------------------------------------ */

/** The scheduler's own date: src/lib/vocab-review.ts stamps `due` with the
    UTC date, so "due today" has to be compared on the same clock. */
export function schedulerToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Words already met and due for review on `today`, by exactly the rule
    getVocabSummary() uses for the dashboard's vocabulary figure. */
export function countDueWords(store: VocabStoreV1, today: string): number {
  let due = 0;
  for (const state of Object.values(store.cards ?? {})) {
    if (state && typeof state.due === 'string' && state.due <= today) due++;
  }
  return due;
}

/* ------------------------------------------------------------------ */
/* Word of the day                                                     */
/* ------------------------------------------------------------------ */

export interface WordOfTheDay extends VocabWordRow {
  topicSlug: string;
  topicTitle: string;
}

/** The student's own calendar date, YYYY-MM-DD, so the word changes at
    their midnight rather than the server's. */
export function localDateKey(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Days since 1 January 1970 for a YYYY-MM-DD key. */
function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y!, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/** A prime step through the deck. Consecutive days are always STEP words
    apart, which is never a whole lap for any deck smaller than the prime, so
    tomorrow's word is never today's, and the walk visits every word before
    repeating instead of reading one topic for twenty days in a row. */
const STEP = 7919;

/** Every word worth showing on its own: it has a meaning and an example,
    taken from each topic in order, each word once. */
export function wordOfTheDayDeck(topics: readonly VocabTopicData[]): WordOfTheDay[] {
  const out: WordOfTheDay[] = [];
  const seen = new Set<string>();
  for (const topic of topics) {
    for (const row of topicWordRows(topic)) {
      const key = row.word.trim().toLowerCase();
      if (!row.meaning || !row.example || seen.has(key)) continue;
      seen.add(key);
      out.push({ ...row, topicSlug: topic.slug, topicTitle: topic.title });
    }
  }
  return out;
}

/** One word per calendar day, the same all day and for every student on
    that date. Null only when the deck is empty. */
export function pickWordOfTheDay(deck: readonly WordOfTheDay[], dateKey: string): WordOfTheDay | null {
  if (deck.length === 0) return null;
  const n = deck.length;
  const index = (((dayNumber(dateKey) * STEP) % n) + n) % n;
  return deck[index] ?? null;
}

/* ------------------------------------------------------------------ */
/* The Today strip                                                     */
/* ------------------------------------------------------------------ */

export interface TodayStrip {
  streak: number;
  due: number;
  /** True when the student has met no word yet: the strip then invites
      them to open a topic instead of reporting zeros. */
  fresh: boolean;
}

/** Pure: the strip's state from the numbers it shows. */
export function todayStrip(store: VocabStoreV1, streak: number, today: string): TodayStrip {
  const met = Object.keys(store.cards ?? {}).length;
  return { streak: Math.max(0, streak), due: countDueWords(store, today), fresh: met === 0 && streak <= 0 };
}

/** Browser: the current student's day streak, the dashboard's own figure. */
export function readStreak(now: Date = new Date()): number {
  try {
    return getStreak(loadStudyPlan(), now);
  } catch {
    return 0;
  }
}

/** Browser: the current student's review store, read only. */
export function readVocabStore(): VocabStoreV1 {
  return readVocabSyncSnapshot();
}

/* ------------------------------------------------------------------ */
/* The topic page's lower groups (8 October 2026, second round):       */
/* Go Further as "guess the word" cards, Key Collocations as "pick the */
/* partner", Useful Phrases as copy-ready cards. Pure text work on the */
/* sanitised inline HTML buildVocabTopicData() keeps for list items    */
/* (only strong, em, b and i survive there).                           */
/* ------------------------------------------------------------------ */

/** The lesson HTML's entities, decoded for display as plain text. */
export function decodeHtmlText(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

/** Inline HTML to plain text: tags dropped, entities decoded, spaces tidied. */
export function inlineHtmlToText(html: string): string {
  return decodeHtmlText(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

export interface CollocationGap {
  /** Text before the blank. */
  before: string;
  /** The key word the lesson set in bold: the answer. */
  answer: string;
  /** Text after the blank. */
  after: string;
}

/** A collocation with its bold key word taken out, or null when the item
    has no bold word (it is then shown as a plain row).

    Two bold words joined only by a slash ("<b>cut</b> / <b>curb</b> carbon
    emissions") are one answer, "cut / curb". Bold words further apart
    ("<b>become</b> obsolete / <b>render</b> something obsolete") blank only
    the first one; the rest of the phrase stays as written. */
export function parseCollocation(html: string): CollocationGap | null {
  const parts: { text: string; bold: boolean }[] = [];
  const re = /<(strong|b)>([\s\S]*?)<\/\1>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index > last) parts.push({ text: html.slice(last, m.index), bold: false });
    parts.push({ text: m[2]!, bold: true });
    last = m.index + m[0].length;
  }
  if (last < html.length) parts.push({ text: html.slice(last), bold: false });

  const first = parts.findIndex((p) => p.bold && inlineHtmlToText(p.text) !== '');
  if (first === -1) return null;
  let end = first;
  while (
    end + 2 < parts.length &&
    !parts[end + 1]!.bold &&
    /^\s*\/\s*$/.test(decodeHtmlText(parts[end + 1]!.text)) &&
    parts[end + 2]!.bold
  ) {
    end += 2;
  }
  const answer = parts
    .slice(first, end + 1)
    .filter((p) => p.bold)
    .map((p) => inlineHtmlToText(p.text))
    .join(' / ');
  const raw = (from: number, to: number) =>
    decodeHtmlText(parts.slice(from, to).map((p) => p.text).join('').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ');
  const before = raw(0, first).trimStart();
  const after = raw(end + 1, parts.length).trimEnd();
  // A phrase that is bold from end to end ("<b>make a good impression</b>")
  // leaves nothing around the blank to choose by: shown as a plain row.
  if (!before.trim() && !after.trim()) return null;
  return { before, answer, after };
}

/** FNV-1a: a small, stable string hash for seeding. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A tiny seeded generator (mulberry32), so a topic's options come out the
    same on every render and every visit. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The choices for collocation `index`: its own answer plus up to two
    other answers from the same topic's collocations, never two that read
    the same, in an order fixed by the topic and the item. */
export function collocationOptions(answers: readonly string[], index: number, seed: string, count = 3): string[] {
  const right = answers[index];
  if (right === undefined) return [];
  const norm = (s: string) => s.trim().toLowerCase();
  const random = seededRandom(hashString(`${seed}#${index}`));
  const pool: string[] = [];
  const seen = new Set([norm(right)]);
  for (const a of answers) {
    if (seen.has(norm(a))) continue;
    seen.add(norm(a));
    pool.push(a);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const options = [right, ...pool.slice(0, Math.max(0, count - 1))];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  return options;
}

/** Every spelling a word-table cell teaches, for highlighting: "literacy /
    numeracy" gives both, "artificial intelligence (AI)" gives the phrase
    and the abbreviation. */
export function termVariants(word: string): string[] {
  const out = new Set<string>();
  const abbreviation = word.match(/\(([^)]+)\)/);
  if (abbreviation) out.add(abbreviation[1]!.trim());
  for (const piece of word.replace(/\([^)]*\)/g, '').split('/')) {
    const t = piece.trim();
    if (t.length >= 2) out.add(t);
  }
  return [...out];
}

export interface TextSegment {
  text: string;
  /** True when this run is one of the topic's own words. */
  hit: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `text` cut into runs, marking every whole-word (or whole-phrase) use of
    one of `terms`, case-insensitively, plural -s / -es allowed. "art" never
    marks part of "artificial". Longer terms win over shorter ones inside
    them ("carbon footprint" before "carbon"). */
export function highlightTerms(text: string, terms: readonly string[]): TextSegment[] {
  if (!text) return [];
  const unique = [...new Set(terms.map((t) => t.trim()).filter((t) => t.length >= 2))].sort((a, b) => b.length - a.length);
  if (unique.length === 0) return [{ text, hit: false }];
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${unique.map(escapeRegExp).join('|')})(?:e?s)?(?![\\p{L}\\p{N}])`,
    'giu',
  );
  const out: TextSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), hit: false });
    out.push({ text: m[0], hit: true });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false });
  return out;
}

/** A phrase as a student would paste it: no surrounding quote marks, and a
    trailing "..." left open with a space so they can carry on typing. */
export function phraseForCopy(text: string): string {
  let s = text.trim().replace(/^["“‘']+/, '').replace(/["”’']+$/, '').trim();
  if (/(…|\.\.\.)$/.test(s)) s = `${s.replace(/(…|\.\.\.)$/, '').trimEnd()} `;
  return s;
}
