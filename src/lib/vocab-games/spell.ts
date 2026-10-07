/* Spell it: the student reads the meaning and the example with the word
   gapped, and types the word.

   This is RECALL, the one game that can make a word count as learnt: two
   unassisted right spellings on two different days (isWordKnown in
   src/lib/vocab-review.ts). The check is the review store's own lenient one
   (checkRecallAnswer: case and spaces forgiven, spelling exact). A letter
   shown by the hint makes the answer assisted, and so does a second go at
   a word whose answer was shown earlier in the set. A wrong answer shows the
   word; "Try again later" brings it back once, at the end of the set.

   Pure. What each answer writes is planned here (spellRecordPlan) and
   carried out by ./record.ts, so the tests check the plan and the writes
   separately. */

import { checkRecallAnswer, type VocabCard } from '../vocab-review';
import { findWordInSentence } from '../vocab-practice';

export interface SpellItem {
  card: VocabCard;
  /** The second showing of a word missed earlier in the set. */
  retry: boolean;
}

export type SpellOutcome = 'spelt' | 'helped' | 'missed';

export interface SpellResult {
  word: string;
  outcome: SpellOutcome;
  retry: boolean;
}

export function checkSpelling(typed: string, word: string): boolean {
  return checkRecallAnswer(typed, word);
}

/* ── The letter-count dashes and the hint ──────────────────────────────── */

export interface LetterSlot {
  /** The letter, or the separator itself (a space, hyphen or apostrophe). */
  char: string;
  separator: boolean;
  shown: boolean;
}

const isSeparator = (ch: string) => ch === ' ' || ch === '-' || ch === "'" || ch === '’';

/** One slot per character. Separators are always shown (they are part of
    the shape, not the spelling); letters are shown once revealed. */
export function letterSlots(word: string, revealed: number): LetterSlot[] {
  let letters = 0;
  return [...word.trim()].map((char) => {
    if (isSeparator(char)) return { char, separator: true, shown: true };
    letters += 1;
    return { char, separator: false, shown: letters <= revealed };
  });
}

export function letterCount(word: string): number {
  return [...word.trim()].filter((ch) => !isSeparator(ch)).length;
}

/** How many letters the hint may show: all but the last, so a hint never
    simply types the word for the student. */
export function maxHints(word: string): number {
  return Math.max(0, letterCount(word) - 1);
}

export function nextHint(word: string, revealed: number): number {
  return Math.min(maxHints(word), revealed + 1);
}

/** The example with the word gapped, or null when the word cannot be found
    in it cleanly (the meaning alone is then the clue). */
export function spellPrompt(card: VocabCard): { before: string; gap: string; after: string } | null {
  if (!card.example) return null;
  const span = findWordInSentence(card.word, card.example);
  if (!span) return null;
  return {
    before: card.example.slice(0, span.start),
    gap: card.example.slice(span.start, span.end),
    after: card.example.slice(span.end),
  };
}

/* ── One answer ─────────────────────────────────────────────────────────── */

export function spellOutcome(correct: boolean, hinted: boolean, retry: boolean): SpellOutcome {
  if (!correct) return 'missed';
  return hinted || retry ? 'helped' : 'spelt';
}

/** What one answer writes.
 *
 *  schedule:
 *    first showing  the review store's recall path (recordReviewOutcome):
 *                   unassisted and right is "good" and adds today to the
 *                   word's recall days; anything else is "again".
 *    second showing right is "hard", exactly like the practice round's
 *                   second go; wrong again writes nothing more to the
 *                   schedule, which already brought the word back today.
 *  evidence: one recall answer on the learner record, assisted when a
 *  letter was shown ('hint') or the answer was shown before ('answer-shown'). */
export type SpellSchedule =
  | { kind: 'recall'; correct: boolean; assisted: boolean }
  | { kind: 'rate'; grade: 'hard' }
  | { kind: 'none' };

export interface SpellRecordPlan {
  schedule: SpellSchedule;
  evidence: { correct: boolean; assistance: 'none' | 'hint' | 'answer-shown' };
}

export function spellRecordPlan(correct: boolean, hinted: boolean, retry: boolean): SpellRecordPlan {
  const assistance = retry ? 'answer-shown' : hinted ? 'hint' : 'none';
  const schedule: SpellSchedule = retry
    ? correct
      ? { kind: 'rate', grade: 'hard' }
      : { kind: 'none' }
    : { kind: 'recall', correct, assisted: hinted };
  return { schedule, evidence: { correct, assistance } };
}

/* ── The set ────────────────────────────────────────────────────────────── */

export function newSpellQueue(cards: readonly VocabCard[]): SpellItem[] {
  return cards.map((card) => ({ card, retry: false }));
}

/** "Try again later": the word comes back once, at the end of the set. */
export function requeueForLater(queue: readonly SpellItem[], item: SpellItem): SpellItem[] {
  if (item.retry) return [...queue];
  return [...queue, { card: item.card, retry: true }];
}

export interface SpellSummary {
  /** Spelt right, unaided, first time: these move toward "learnt". */
  spelt: string[];
  /** Everything else: wrong, or right only with help. */
  practise: string[];
}

/** The end screen. A word's best result counts: missed then right on its
    second go is listed to practise, because it needed the answer shown. */
export function spellSummary(results: readonly SpellResult[]): SpellSummary {
  const spelt: string[] = [];
  const practise: string[] = [];
  const words = [...new Set(results.map((r) => r.word))];
  for (const word of words) {
    const mine = results.filter((r) => r.word === word);
    if (mine.some((r) => r.outcome === 'spelt')) spelt.push(word);
    else practise.push(word);
  }
  return { spelt, practise };
}
