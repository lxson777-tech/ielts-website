/* The browser side of choosing a game's words: the live deck and the
   student's own review store and lesson progress, handed to the pure rules
   in src/lib/vocab-games/sets.ts.

   The deck is CARD_SET, the same one the practice round reads. On the open
   site it holds every topic lesson's words; in the gated build it is filled
   by PaidContent before the games mount (the paid vocabulary pack, or a
   free account's lessons), so it is read at call time, never copied at
   import. */

import type { CacheOwner } from '../../../lib/learning/contracts/sync';
import { VOCABULARY_PARTS } from '../../../data/vocabulary';
import { CARD_SET, getTopicCards, readVocabStoreFor, vocabToday, type VocabCard } from '../../../lib/vocab-review';
import { getProgressFor } from '../../../lib/progress';
import {
  buildGameSet,
  isSpellable,
  minimumWords,
  pickMatchBoard,
  sprintEligible,
  studiedTopicTitles,
  type GameKind,
} from '../../../lib/vocab-games/sets';

export interface GameTopic {
  slug: string;
  title: string;
}

export function topicBySlug(slug: string | null): GameTopic | null {
  if (!slug) return null;
  const part = VOCABULARY_PARTS.find((p) => p.slug === slug);
  return part ? { slug: part.slug, title: part.title } : null;
}

export function knownSlugs(): string[] {
  return VOCABULARY_PARTS.map((p) => p.slug);
}

/** How many of a topic's words this game can use. */
function usableCount(game: GameKind, title: string): number {
  const cards = getTopicCards(title);
  if (game === 'match') return pickMatchBoard(cards, 99).length;
  if (game === 'spell') return cards.filter(isSpellable).length;
  const eligible = sprintEligible(CARD_SET);
  return cards.filter(eligible).length;
}

/** The topics a game can be played on with the deck as it stands, in the
    course's own order. */
export function playableTopics(game: GameKind): GameTopic[] {
  return VOCABULARY_PARTS.filter((p) => usableCount(game, p.title) >= minimumWords(game)).map((p) => ({ slug: p.slug, title: p.title }));
}

/** The topic after this one that the game can be played on, wrapping
    round, or null when there is no other. */
export function nextTopic(game: GameKind, slug: string | null): GameTopic | null {
  const topics = playableTopics(game);
  if (!topics.length) return null;
  if (!slug) return topics[0] ?? null;
  const at = topics.findIndex((t) => t.slug === slug);
  const next = topics[(at + 1) % topics.length];
  return next && next.slug !== slug ? next : null;
}

/** One game's words, for `owner`, from their own schedule and studies. */
export function buildSetFor(owner: CacheOwner, game: GameKind, slug: string | null): VocabCard[] {
  const store = readVocabStoreFor(owner);
  const lessons = Object.keys(getProgressFor(owner).lessons ?? {});
  const topic = topicBySlug(slug);
  const studiedTopics = studiedTopicTitles(CARD_SET, store.cards, lessons, VOCABULARY_PARTS);
  return buildGameSet(game, {
    cards: CARD_SET,
    states: store.cards,
    today: vocabToday(),
    topic: topic?.title ?? null,
    studiedTopics,
  });
}

export function cardFor(word: string): VocabCard | undefined {
  return CARD_SET.find((c) => c.word === word);
}

/** The wrong answers for a sprint question come from the word's own topic. */
export function topicPool(card: VocabCard): VocabCard[] {
  return getTopicCards(card.topic);
}
