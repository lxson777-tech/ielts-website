/* Match pairs: the board's rules, with no screen and no storage.

   Six words and their six meanings, shuffled in two columns. The student
   taps a word and then a meaning, in either order. A right pair settles and
   is done; a wrong pair counts as one mistake, and the WORD in it is noted
   for review (the student thought that word meant something else). Tapping
   the chosen tile again lets it go; tapping another tile on the same side
   moves the choice there.

   What is written to the student's record, decided here so the screen and
   the tests agree (the screen writes it through recordGameRecognition):
     - a word matched with no mistake on it: right first time;
     - a word's first mistake: missed (once, however often it is missed);
     - a word matched after a mistake: right on a second go, which the
       practice round records as assisted, because the board had narrowed. */

import type { VocabCard } from '../vocab-review';
import { shuffle, type RandomFn } from './sets';

export interface MatchTile {
  /** `w:<word>` or `m:<word>`: the word a tile belongs to is in its id. */
  id: string;
  side: 'word' | 'meaning';
  word: string;
  text: string;
}

export interface MatchState {
  words: MatchTile[];
  meanings: MatchTile[];
  selected: string | null;
  /** Words matched so far. */
  done: string[];
  mistakes: number;
  /** Words with at least one mistake, in the order they were first missed. */
  missed: string[];
}

export type MatchEvent =
  | { kind: 'select'; tile: MatchTile }
  | { kind: 'deselect' }
  | { kind: 'ignored' }
  | { kind: 'match'; word: string; firstTry: boolean }
  /** `word`: the word tile in the wrong pair. `otherWord`: whose meaning it
      was paired with. `first`: this word's first mistake. */
  | { kind: 'miss'; word: string; otherWord: string; first: boolean; tiles: [string, string] };

export function newMatchBoard(cards: readonly VocabCard[], random: RandomFn = Math.random): MatchState {
  const words = shuffle(
    cards.map((c): MatchTile => ({ id: `w:${c.word}`, side: 'word', word: c.word, text: c.word })),
    random,
  );
  const meanings = shuffle(
    cards.map((c): MatchTile => ({ id: `m:${c.word}`, side: 'meaning', word: c.word, text: c.definition })),
    random,
  );
  return { words, meanings, selected: null, done: [], mistakes: 0, missed: [] };
}

function tileById(state: MatchState, id: string): MatchTile | undefined {
  return state.words.find((t) => t.id === id) ?? state.meanings.find((t) => t.id === id);
}

export function isTileDone(state: MatchState, tile: MatchTile): boolean {
  return state.done.includes(tile.word);
}

/** One tap. Returns the next state and what happened. */
export function pressTile(state: MatchState, id: string): { state: MatchState; event: MatchEvent } {
  const tile = tileById(state, id);
  if (!tile || isTileDone(state, tile)) return { state, event: { kind: 'ignored' } };
  if (state.selected === id) return { state: { ...state, selected: null }, event: { kind: 'deselect' } };

  const chosen = state.selected ? tileById(state, state.selected) : undefined;
  if (!chosen || chosen.side === tile.side) {
    return { state: { ...state, selected: id }, event: { kind: 'select', tile } };
  }

  const wordTile = chosen.side === 'word' ? chosen : tile;
  const meaningTile = chosen.side === 'meaning' ? chosen : tile;
  if (wordTile.word === meaningTile.word) {
    const firstTry = !state.missed.includes(wordTile.word);
    return {
      state: { ...state, selected: null, done: [...state.done, wordTile.word] },
      event: { kind: 'match', word: wordTile.word, firstTry },
    };
  }
  const first = !state.missed.includes(wordTile.word);
  return {
    state: {
      ...state,
      selected: null,
      mistakes: state.mistakes + 1,
      missed: first ? [...state.missed, wordTile.word] : state.missed,
    },
    event: { kind: 'miss', word: wordTile.word, otherWord: meaningTile.word, first, tiles: [chosen.id, tile.id] },
  };
}

export function matchFinished(state: MatchState): boolean {
  return state.words.length > 0 && state.done.length === state.words.length;
}

/** What one event writes to the record, or null for nothing. `retry` means
    "right on a second go", recorded as assisted like the practice round. */
export function matchRecording(event: MatchEvent): { word: string; correct: boolean; retry: boolean } | null {
  if (event.kind === 'match') return { word: event.word, correct: true, retry: !event.firstTry };
  if (event.kind === 'miss' && event.first) return { word: event.word, correct: false, retry: false };
  return null;
}
