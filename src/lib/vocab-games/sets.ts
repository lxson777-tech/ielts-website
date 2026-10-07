/* Which words go into a vocabulary game (/review/games, 8 October 2026).

   The three games (Match pairs, 60-second sprint, Spell it) draw on the same
   deck as the practice round (CARD_SET in src/lib/vocab-review.ts) and the
   same review store, so a game is just another way of practising the words
   the spacing says are worth practising:

     with a topic   that topic's words: due for review first (the ones
                    missed most often at the front), then words never
                    practised, then the rest, nearest review first. Exactly
                    the order getPracticeRound() uses.
     mixed          due words from every topic first; then new words from
                    the topics the student has already studied (a topic
                    they have practised, or whose lesson they marked as
                    studied); then new words from any topic; then the rest.

   Each game also has its own rule for which words it can use at all (a
   word whose meaning repeats another's cannot be matched; "tenant /
   landlord" cannot be spelt as one word), applied before the order.

   Pure: no window, no storage. The browser layer (../../components/vocab/
   games/) reads the store and the deck and hands them in, so the tests
   drive every rule here with plain objects and a seeded random. */

import type { VocabCard, VocabCardState } from '../vocab-review';

export type GameKind = 'match' | 'sprint' | 'spell';

export const GAME_KINDS: readonly GameKind[] = ['match', 'sprint', 'spell'];

/** How many words each game plays with. */
export const MATCH_PAIRS = 6;
export const SPELL_SET_SIZE = 10;
/** Enough for the fastest student's minute; the sprint cycles through them
    again, reshuffled, if they are all answered. */
export const SPRINT_DECK_SIZE = 40;

export interface GameParams {
  game: GameKind | null;
  /** A topic slug from src/data/vocabulary.ts, or null for a mixed set. An
      unknown slug reads as null: a mistyped link falls back to the mixed
      set rather than breaking. */
  topic: string | null;
}

/** ?game=match|sprint|spell&topic=<slug>, read leniently. */
export function parseGameParams(search: string, knownSlugs: readonly string[]): GameParams {
  const params = new URLSearchParams(search);
  const rawGame = params.get('game');
  const game = (GAME_KINDS as readonly string[]).includes(rawGame ?? '') ? (rawGame as GameKind) : null;
  const rawTopic = params.get('topic');
  const topic = rawTopic && knownSlugs.includes(rawTopic) ? rawTopic : null;
  return { game, topic };
}

/** The link to one game (or the chooser, with no game), keeping a topic. */
export function gameQuery(game: GameKind | null, topic: string | null): string {
  const params = new URLSearchParams();
  if (game) params.set('game', game);
  if (topic) params.set('topic', topic);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export type RandomFn = () => number;

export function shuffle<T>(items: readonly T[], random: RandomFn = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** A small, repeatable random for tests (mulberry32). */
export function seededRandom(seed: number): RandomFn {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SetInput {
  /** The whole deck (CARD_SET). */
  cards: readonly VocabCard[];
  /** The student's review store cards (VocabStoreV1.cards). */
  states: Readonly<Record<string, VocabCardState>>;
  /** YYYY-MM-DD, as the store spells its due dates. */
  today: string;
  /** A topic TITLE (what a card carries), or null for a mixed set. */
  topic: string | null;
  /** Topic titles the student has studied, for the mixed set's second tier. */
  studiedTopics?: ReadonlySet<string>;
  random?: RandomFn;
}

/** Every eligible card, most useful first, before any game takes its slice. */
export function orderForGame(input: SetInput, eligible: (card: VocabCard) => boolean = () => true): VocabCard[] {
  const random = input.random ?? Math.random;
  const { states, today } = input;
  const pool = input.cards.filter((c) => (input.topic ? c.topic === input.topic : true) && eligible(c));

  const due = pool
    .filter((c) => states[c.word] && states[c.word]!.due <= today)
    .sort((a, b) => states[b.word]!.lapses - states[a.word]!.lapses || states[a.word]!.due.localeCompare(states[b.word]!.due));
  const unseen = pool.filter((c) => !states[c.word]);
  const later = pool
    .filter((c) => states[c.word] && states[c.word]!.due > today)
    .sort((a, b) => states[a.word]!.due.localeCompare(states[b.word]!.due));

  if (input.topic) return [...due, ...unseen, ...later];

  /* Mixed: new words from studied topics before new words from anywhere.
     Shuffled inside each tier, so a mixed set is not always the first
     topic's first words. */
  const studied = input.studiedTopics ?? new Set<string>();
  const newStudied = shuffle(unseen.filter((c) => studied.has(c.topic)), random);
  const newOther = shuffle(unseen.filter((c) => !studied.has(c.topic)), random);
  return [...due, ...newStudied, ...newOther, ...later];
}

/** Topic titles the student has studied: any topic with a word in their
    review store, plus any whose vocabulary lesson they marked as studied
    (lesson keys `vocabulary-<slug>`). */
export function studiedTopicTitles(
  cards: readonly VocabCard[],
  states: Readonly<Record<string, VocabCardState>>,
  completedLessonKeys: readonly string[],
  parts: readonly { slug: string; title: string }[],
): Set<string> {
  const titles = new Set<string>();
  const byWord = new Map(cards.map((c) => [c.word, c] as const));
  for (const word of Object.keys(states)) {
    const card = byWord.get(word);
    if (card) titles.add(card.topic);
  }
  for (const key of completedLessonKeys) {
    const slug = key.startsWith('vocabulary-') ? key.slice('vocabulary-'.length) : null;
    const part = slug ? parts.find((p) => p.slug === slug) : undefined;
    if (part) titles.add(part.title);
  }
  return titles;
}

/* ── Which words each game can use ──────────────────────────────────────── */

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Linking words that swap for each other (the same list the practice round
    keeps apart, src/lib/vocab-practice.ts), so two of them never sit in one
    Match board, where either meaning could be argued for either word. */
const INTERCHANGEABLE: string[][] = [
  ['furthermore', 'moreover', 'in addition'],
  ['therefore', 'consequently', 'as a result'],
  ['provided that', 'as long as'],
  ['due to', 'owing to'],
  ['although', 'whereas'],
];

function interchangeable(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  return INTERCHANGEABLE.some((set) => set.includes(x) && set.includes(y));
}

/** Two cards can share a Match board when neither meaning could be read as
    the other word's: different meanings, neither meaning naming the other
    word, and not a pair of interchangeable linking words. */
export function canShareBoard(a: VocabCard, b: VocabCard): boolean {
  if (norm(a.word) === norm(b.word)) return false;
  if (norm(a.definition) === norm(b.definition)) return false;
  if (norm(a.definition).includes(norm(b.word)) || norm(b.definition).includes(norm(a.word))) return false;
  return !interchangeable(a.word, b.word);
}

/** The first `size` cards of `ordered` that can all share one board. */
export function pickMatchBoard(ordered: readonly VocabCard[], size = MATCH_PAIRS): VocabCard[] {
  const chosen: VocabCard[] = [];
  for (const card of ordered) {
    if (!card.definition.trim()) continue;
    if (chosen.every((other) => canShareBoard(card, other))) chosen.push(card);
    if (chosen.length >= size) break;
  }
  return chosen;
}

/** A word that can be typed as it stands: letters, with single spaces,
    hyphens or apostrophes between them. "tenant / landlord" (two words at
    once) and "artificial intelligence (AI)" (an abbreviation the student
    would have to guess at) are left to the other games. */
export function isSpellable(card: VocabCard): boolean {
  const word = card.word.trim();
  if (word.length < 2 || word.length > 32) return false;
  return /^[A-Za-z]+(?:[ '’-][A-Za-z]+)*$/.test(word) && card.definition.trim().length > 0;
}

/** A sprint question needs three wrong answers from the word's own topic. */
export function sprintEligible(cards: readonly VocabCard[]): (card: VocabCard) => boolean {
  const perTopic = new Map<string, number>();
  for (const c of cards) perTopic.set(c.topic, (perTopic.get(c.topic) ?? 0) + 1);
  return (card) => (perTopic.get(card.topic) ?? 0) >= 4;
}

/** The words for one game. Match: one board of compatible pairs. Sprint:
    a long deck. Spell: a set of ten. Shuffled at the end, so the most
    useful words are chosen but not always shown first. */
export function buildGameSet(game: GameKind, input: SetInput): VocabCard[] {
  const random = input.random ?? Math.random;
  if (game === 'match') return shuffle(pickMatchBoard(orderForGame(input)), random);
  if (game === 'spell') return shuffle(orderForGame(input, isSpellable).slice(0, SPELL_SET_SIZE), random);
  return shuffle(orderForGame(input, sprintEligible(input.cards)).slice(0, SPRINT_DECK_SIZE), random);
}

/** The fewest words a game needs to be worth playing on a topic. */
export function minimumWords(game: GameKind): number {
  return game === 'match' ? 4 : game === 'spell' ? 3 : 4;
}
