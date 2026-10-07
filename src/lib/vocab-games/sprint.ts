/* The 60-second sprint: scoring, the streak and the end of the minute.

   Each question is the word's own example sentence with the word gapped,
   built by the practice round's question builder (buildQuestion in
   src/lib/vocab-practice.ts, with its gap finding and its rule that two
   interchangeable linking words are never offered side by side). +1 for a
   right answer; three right in a row shows a small flame; a wrong answer
   resets the streak, shows the right word for a moment, and the word is
   listed at the end with its meaning.

   A word is written to the student's record once per sprint, at its first
   answer: a fast student can meet the same word twice in one minute when
   the deck comes round again, and two "good" ratings a few seconds apart
   would push the word's next review out for days on the strength of one
   look. */

import type { VocabCard } from '../vocab-review';
import { buildQuestion, type PracticeQuestion } from '../vocab-practice';
import { shuffle, type RandomFn } from './sets';

export const SPRINT_MS = 60_000;
export const FLAME_AT = 3;
/** How long a wrong answer keeps the right word on screen. */
export const SPRINT_REVEAL_MS = 1100;
/** How long a right answer flashes before the next question. */
export const SPRINT_RIGHT_MS = 380;

export interface SprintState {
  score: number;
  streak: number;
  bestStreak: number;
  answered: number;
  /** Words answered wrongly, once each, in order. */
  missed: string[];
  /** Words already written to the record in this sprint. */
  recorded: string[];
}

export function newSprint(): SprintState {
  return { score: 0, streak: 0, bestStreak: 0, answered: 0, missed: [], recorded: [] };
}

export interface SprintAnswer {
  state: SprintState;
  correct: boolean;
  /** True the first time this word is answered in this sprint: the one
      answer that is written to the record. */
  record: boolean;
}

export function answerSprint(state: SprintState, word: string, option: string): SprintAnswer {
  const correct = option === word;
  const streak = correct ? state.streak + 1 : 0;
  const record = !state.recorded.includes(word);
  return {
    correct,
    record,
    state: {
      score: state.score + (correct ? 1 : 0),
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
      answered: state.answered + 1,
      missed: !correct && !state.missed.includes(word) ? [...state.missed, word] : state.missed,
      recorded: record ? [...state.recorded, word] : state.recorded,
    },
  };
}

export function showsFlame(streak: number): boolean {
  return streak >= FLAME_AT;
}

export function sprintTimeLeft(elapsed: number): number {
  return Math.max(0, SPRINT_MS - elapsed);
}

export function sprintOver(elapsed: number): boolean {
  return elapsed >= SPRINT_MS;
}

/** The deck as an endless run of questions: the cards in order, then the
    same cards reshuffled, and so on. The wrong answers come from each
    card's own topic (`poolFor`). */
export function sprintQuestion(
  deck: readonly VocabCard[],
  index: number,
  poolFor: (card: VocabCard) => VocabCard[],
  random: RandomFn = Math.random,
): PracticeQuestion | null {
  if (!deck.length) return null;
  const lap = Math.floor(index / deck.length);
  const order = lap === 0 ? deck : shuffleLap(deck, lap, random);
  const card = order[index % deck.length]!;
  return buildQuestion(card, poolFor(card), random);
}

const laps = new WeakMap<readonly VocabCard[], VocabCard[][]>();

function shuffleLap(deck: readonly VocabCard[], lap: number, random: RandomFn): VocabCard[] {
  let held = laps.get(deck);
  if (!held) {
    held = [];
    laps.set(deck, held);
  }
  while (held.length < lap) {
    const previous = held.at(-1) ?? deck;
    let next = shuffle(deck, random);
    /* Never the same word twice in a row across the join. */
    if (next.length > 1 && next[0] === previous[previous.length - 1]) next = [...next.slice(1), next[0]!];
    held.push(next);
  }
  return held[lap - 1]!;
}
