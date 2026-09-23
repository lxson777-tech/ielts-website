/* Building the questions for a vocabulary practice round (VocabReview.tsx).

   Replaced the old self-graded flashcards, where a student flipped a card
   and then had to rate their own memory as Again / Hard / Good / Easy. The
   owner found that confusing, and students had no idea what the ratings
   meant. A round is now a set of real questions, each marked right or
   wrong by the site:

     gap      the word's own example sentence with the word blanked out.
              The meaning is shown underneath as a clue, so a word from
              the same topic that happens to fit the sentence grammatically
              is still ruled out by the definition.
     meaning  "Which word means: ...?", used only when the word cannot be
              found in its example (an irregular form such as "grow up" /
              "grew up", or a two-word card like "tenant / landlord").

   Pure and synchronous, with no storage or DOM, so tests import it under
   plain Node. The scheduling that decides WHICH words go into a round
   lives in src/lib/vocab-review.ts, as before. */

import type { VocabCard } from './vocab-review';

export interface GapSpan {
  start: number;
  end: number;
}

export interface PracticeQuestion {
  card: VocabCard;
  kind: 'gap' | 'meaning';
  /** For a gap question: the example split around the word. */
  before?: string;
  answerText?: string;
  after?: string;
  /** Four words in random order, one of them card.word. */
  options: string[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const VOWELS = 'aeiou';

/** Every spelling of one token the example sentences actually use:
    plurals, past tenses, -ing forms and the common spelling changes
    (die -> dying, skim -> skimmed, delay -> delays, country -> countries). */
function tokenForms(token: string): string[] {
  const t = token.toLowerCase();
  const forms = new Set([t, `${t}s`, `${t}es`, `${t}ed`, `${t}d`, `${t}ing`, `${t}'s`, `${t}er`, `${t}ers`]);
  const last = t.at(-1) ?? '';
  const prev = t.at(-2) ?? '';
  if (last === 'e') {
    forms.add(`${t.slice(0, -1)}ing`);
    if (prev === 'i') forms.add(`${t.slice(0, -2)}ying`);
  }
  if (last === 'y' && !VOWELS.includes(prev)) {
    forms.add(`${t.slice(0, -1)}ies`);
    forms.add(`${t.slice(0, -1)}ied`);
  }
  // Short verbs double their last consonant: skim -> skimmed, stop -> stopping.
  const beforePrev = t.at(-3) ?? '';
  if (!VOWELS.includes(last) && !'wxy'.includes(last) && VOWELS.includes(prev) && !VOWELS.includes(beforePrev)) {
    forms.add(`${t}${last}ed`);
    forms.add(`${t}${last}ing`);
  }
  return [...forms].sort((a, b) => b.length - a.length);
}

/** The spellings a card's word may appear under. "fiction / non-fiction"
    and "tenant / landlord" name two things at once, and "(AI)" or "(SMEs)"
    is an abbreviation that the example sentence may leave out. */
function wordVariants(word: string): string[] {
  const noAbbreviation = word.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const whole = [noAbbreviation];
  const parts = noAbbreviation.split('/').map((p) => p.trim()).filter(Boolean);
  // A slash card is only safe to blank as a whole phrase ("despite / in
  // spite of" is one idea); blanking just one half of "tenant / landlord"
  // would test half the card. Those fall back to a meaning question.
  return parts.length > 1 ? [] : whole;
}

/** Where the card's word sits in its example sentence, allowing for the
    inflected forms above, or null when it cannot be found cleanly. */
export function findWordInSentence(word: string, sentence: string): GapSpan | null {
  for (const variant of wordVariants(word)) {
    const tokens = variant.split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    const pattern = tokens.map((tok) => `(?:${tokenForms(tok).map(escapeRegExp).join('|')})`).join('\\s+');
    const re = new RegExp(`(?<![A-Za-z])${pattern}(?![A-Za-z])`, 'i');
    const match = re.exec(sentence);
    if (match) return { start: match.index, end: match.index + match[0].length };
  }
  return null;
}

/* Linking words that genuinely swap for each other. In the conjunctions
   deck a sentence built for "furthermore" works just as well with
   "moreover", so the two must never be offered side by side. Ordinary topic
   words do not need this, because the meaning clue separates them. */
const INTERCHANGEABLE: string[][] = [
  ['furthermore', 'moreover', 'in addition'],
  ['therefore', 'consequently', 'as a result'],
  ['provided that', 'as long as'],
  ['due to', 'owing to'],
  ['although', 'whereas'],
];

function interchangeable(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return INTERCHANGEABLE.some((set) => set.includes(x) && set.includes(y));
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Three wrong answers for a card, drawn from the same topic so they are
    plausible rather than silly, never a word that could also be right. */
export function pickDistractors(card: VocabCard, pool: VocabCard[], random: () => number = Math.random): string[] {
  const candidates = pool.filter((c) => {
    if (c.word === card.word) return false;
    if (interchangeable(c.word, card.word)) return false;
    // A definition that names the answer ("similar to furthermore") would
    // make that option a second right answer.
    if (c.definition.toLowerCase().includes(card.word.toLowerCase())) return false;
    if (card.definition.toLowerCase().includes(c.word.toLowerCase())) return false;
    return true;
  });
  return shuffle(candidates, random)
    .slice(0, 3)
    .map((c) => c.word);
}

/** One question for a card. `pool` is the card's whole topic, which
    supplies the wrong answers. */
export function buildQuestion(card: VocabCard, pool: VocabCard[], random: () => number = Math.random): PracticeQuestion {
  const options = shuffle([card.word, ...pickDistractors(card, pool, random)], random);
  const span = card.example ? findWordInSentence(card.word, card.example) : null;
  if (!span) return { card, kind: 'meaning', options };
  return {
    card,
    kind: 'gap',
    before: card.example.slice(0, span.start),
    answerText: card.example.slice(span.start, span.end),
    after: card.example.slice(span.end),
    options,
  };
}
