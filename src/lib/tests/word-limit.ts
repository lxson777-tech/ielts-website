/* How a typed answer is counted against the word limit printed above it,
   the way an IELTS examiner counts it. Used by the live "over the limit"
   nudge in the test player (src/components/TestPlayer.tsx), and kept free of
   React and i18n so tests and scripts can use it too.

   The rules, from the IELTS instructions themselves:
   - A hyphenated word is ONE word ("socio-economic", "well-known").
   - A number is one item however it is written: digits, a time ("10.45",
     "7am"), a date ordinal ("22nd"), a price ("£4.50"), a phone number in
     groups ("0207 946 0321"), a range ("7am to 12am"), or a whole number in
     words ("two", "twenty-one").
   - "NO MORE THAN TWO WORDS AND/OR A NUMBER": the number is allowed ON TOP
     of the words, so "48 North Avenue" is two words and a number, inside the
     limit.
   - "ONE WORD OR A NUMBER": either one word, or one number, not both.
   - "ONE NUMBER": the answer is a single number.
   - Otherwise ("NO MORE THAN THREE WORDS") a number counts as a word.

   The number rule is read from the group's instruction text unless the group
   states it explicitly with `numberRule` (src/lib/tests/schema.ts). */

import type { QuestionGroup } from './schema';

export type NumberRule = 'and-or' | 'or' | 'only' | 'none';

const NUMBER_WORDS = new Set([
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty',
  'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred',
]);

const TENS_WORDS = new Set(['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']);
const UNIT_WORDS = new Set(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']);

function plain(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Is this one token a number (in figures or words)? */
export function isNumberToken(token: string): boolean {
  const t = token.replace(/[,;.]$/, '').toLowerCase();
  if (t === '') return false;
  if (/^[£$€]?\d[\d,.:/]*(st|nd|rd|th|am|pm|%|cc|km|kg|m|cm|mm|ml)?$/.test(t)) return true;
  return t.split('-').every((part) => NUMBER_WORDS.has(part));
}

/** The number rule an instruction states. */
export function numberRuleFromInstruction(instructionHtml: string): NumberRule {
  const s = plain(instructionHtml).toUpperCase();
  if (/\bAND\s*\/?\s*OR\s+(?:A\s+)?NUMBERS?\b/.test(s)) return 'and-or';
  if (/\bOR\s+A\s+NUMBER\b/.test(s)) return 'or';
  const words = /\b(?:ONE|TWO|THREE|FOUR|FIVE)\s+WORDS?\b/.test(s);
  if (!words && /\b(?:ONE|A)\s+NUMBER\b/.test(s)) return 'only';
  return 'none';
}

/** The number rule for a group: its explicit `numberRule`, or the one its
    instruction states. */
export function numberRuleOf(group: Pick<QuestionGroup, 'instructionHtml' | 'numberRule'>): NumberRule {
  return group.numberRule ?? numberRuleFromInstruction(group.instructionHtml ?? '');
}

export interface WordCount {
  /** Words that count against the limit. */
  words: number;
  /** Numbers in the answer (each counted once, however it is written). */
  numbers: number;
}

/** Split an answer into words and numbers, IELTS style. */
export function countAnswerItems(answer: string): WordCount {
  let text = answer.replace(/\s+/g, ' ').trim();
  if (text === '') return { words: 0, numbers: 0 };
  // "am" / "pm" belong to the number in front of them.
  text = text.replace(/(\d)\s*(a\.m\.?|p\.m\.?|am|pm)(?![a-z])/gi, '$1$2');
  // The digit groups of one phone number or code are one number.
  text = text.replace(/\d[\d ]*\d/g, (run) => run.replace(/ /g, ''));
  // A numeric range ("7am to 12am", "5-12") is one number.
  text = text.replace(/(\d\S*)\s*(?:to|until|-|–)\s*(\d\S*|midnight|noon)/gi, '$1');
  const tokens = text.split(' ').filter(Boolean);
  // A whole number in words written with a space ("twenty one", "one
  // hundred") is one number, not two. Anything else ("one two three") is
  // counted token by token.
  let numbers = 0;
  let words = 0;
  let previous = '';
  for (const token of tokens) {
    const lower = token.toLowerCase();
    const continuesNumber =
      (TENS_WORDS.has(previous) && UNIT_WORDS.has(lower)) || (lower === 'hundred' && (previous === 'one' || previous === 'a'));
    if (continuesNumber) {
      if (previous === 'a') { words -= 1; numbers += 1; } // "a hundred" is one number
    } else if (isNumberToken(token)) {
      numbers += 1;
    } else {
      words += 1;
    }
    previous = lower;
  }
  return { words, numbers };
}

/** The count to show the student next to a stated limit: under "AND/OR A
    NUMBER" only the words count, otherwise every item does. */
export function countedWords(answer: string, rule: NumberRule): number {
  const { words, numbers } = countAnswerItems(answer);
  return rule === 'and-or' ? words : words + numbers;
}

/** Is this answer over the stated limit? `limit` is the group's wordLimit. */
export function isOverWordLimit(answer: string, limit: number, rule: NumberRule): boolean {
  const { words, numbers } = countAnswerItems(answer);
  if (words + numbers === 0) return false;
  switch (rule) {
    case 'and-or':
      // Only the words are held to the limit. (Two numbers would also break
      // the rule, but the nudge shows a word count, and "1 word: limit is 2"
      // beside a warning would only confuse. Such an answer cannot match a
      // key anyway, so marking still gets it right.)
      return words > limit;
    case 'or':
      // A single number on its own is always fine; otherwise count items.
      return !(numbers === 1 && words === 0) && words + numbers > limit;
    case 'only':
      return !(numbers === 1 && words === 0) && words + numbers > limit;
    default:
      return words + numbers > limit;
  }
}
