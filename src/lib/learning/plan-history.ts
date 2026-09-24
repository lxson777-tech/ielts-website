/* Plan history in the language the student is reading now.
 *
 * A PlanChange's `summary` is written once, when the plan changes, in the
 * plan's explanation language at that moment (planner.ts describeChanges).
 * Switching the site to Russian later rewrites the current session but not
 * history, so Course and Report kept showing "Your plan is set up. Today
 * is ..." in English to a Russian reader (combined platform review,
 * 2026-09-23, P2).
 *
 * Every summary is built only from the planner's own templates and the
 * catalogue's own sentences, all of which have a Russian pair in
 * src/lib/learning/ru.ts (RU_STRINGS). So a stored sentence in EITHER
 * language can be recognised against those templates, its filled-in pieces
 * taken out, each piece translated the same way (they are themselves
 * catalogue objectives, reasons, status labels or nested template
 * sentences), and the whole written again in the language on screen. That
 * also covers history students already have, with no migration and no
 * change to the stored record.
 *
 * Anything not recognised (a future template without a pair, or text the
 * student wrote) is shown exactly as stored: never guessed at, never
 * dropped.
 */
import { RU_STRINGS } from './ru';
import type { Locale } from '../i18n/locale';

interface Pair {
  en: string;
  ru: string;
}

const PAIRS: Pair[] = Object.entries(RU_STRINGS)
  .filter(([, ru]) => typeof ru === 'string' && ru.length > 0)
  .map(([en, ru]) => ({ en, ru }));

const BY_TEXT: Record<Locale, Map<string, Pair>> = { en: new Map(), ru: new Map() };
for (const pair of PAIRS) {
  if (!BY_TEXT.en.has(pair.en)) BY_TEXT.en.set(pair.en, pair);
  if (!BY_TEXT.ru.has(pair.ru)) BY_TEXT.ru.set(pair.ru, pair);
}

/** A template as its fixed text between variables: `lits` has one more
    entry than `names`. */
interface Pattern {
  pair: Pair;
  names: string[];
  lits: Record<Locale, string[]>;
}

function split(template: string): { names: string[]; lits: string[] } | null {
  const parts = template.split(/\{(\w+)\}/g);
  if (parts.length === 1) return null;
  return { names: parts.filter((_, index) => index % 2 === 1), lits: parts.filter((_, index) => index % 2 === 0) };
}

/* Longest templates first: a longer template carries more fixed words, so a
   match on it is more specific than one on a short template it contains. */
const PATTERNS: Pattern[] = PAIRS.flatMap((pair): Pattern[] => {
  const en = split(pair.en);
  const ru = split(pair.ru);
  if (!en || !ru) return [];
  /* The same variables in the same order in both languages, or a piece
     could land in the wrong place. */
  if (en.names.join() !== ru.names.join()) return [];
  return [{ pair, names: en.names, lits: { en: en.lits, ru: ru.lits } }];
}).sort((a, b) => b.pair.en.length - a.pair.en.length);

/** Every way `text` can be cut into the template's variable pieces. There is
    more than one when a fixed word also occurs inside a piece ("Today moves
    from {from} to {to}" with an objective that itself contains "to"). */
function* splits(text: string, lits: string[]): Generator<string[]> {
  const first = lits[0]!;
  const last = lits[lits.length - 1]!.trimEnd();
  const body = text.trimEnd();
  if (!body.startsWith(first) || !body.endsWith(last)) return;
  const end = body.length - last.length;
  function* from(position: number, index: number, pieces: string[]): Generator<string[]> {
    if (index === lits.length - 1) {
      if (end >= position) yield [...pieces, body.slice(position, end)];
      return;
    }
    const lit = lits[index]!;
    for (let at = body.indexOf(lit, position + 1); at !== -1 && at <= end; at = body.indexOf(lit, at + 1)) {
      yield* from(at + lit.length, index + 1, [...pieces, body.slice(position, at)]);
    }
  }
  if (lits.length === 2) {
    if (end >= first.length) yield [body.slice(first.length, end)];
    return;
  }
  yield* from(first.length, 1, []);
}

const OTHER: Record<Locale, Locale> = { en: 'ru', ru: 'en' };

function textOf(pair: Pair, locale: Locale): string {
  return locale === 'en' ? pair.en : pair.ru;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);
}

/** One recognised piece in `target`, or null when it is not recognisable.
    Tries the piece as written, and as a sentence with its final stop put
    back (the planner splices whole sentences in as clauses without it). */
function translatePiece(piece: string, target: Locale, depth: number): string | null {
  const trimmed = piece.trim();
  if (trimmed === '') return piece;
  if (/^[\d.,\s-]+$/.test(trimmed)) return trimmed;
  for (const source of [target, OTHER[target]] as Locale[]) {
    const direct = BY_TEXT[source].get(trimmed);
    if (direct) return textOf(direct, target);
    const withStop = BY_TEXT[source].get(`${trimmed}.`);
    if (withStop) return textOf(withStop, target).replace(/[.!?]$/, '');
  }
  return depth > 0 ? translateTemplate(trimmed, target, depth - 1) : null;
}

/** Slots the planner fills with whole sentences or clauses (see
    PLANNER_SENTENCES in planner.ts). Every other slot ({paper}, {days},
    {band}, {minutes}, {label} ...) holds one short value, so a sentence
    turning up there means the wrong template matched, not a real piece. */
const SENTENCE_SLOTS = new Set(['objective', 'from', 'to', 'why', 'reason', 'status', 'dropped', 'name']);

/** Short exam vocabulary and numbers read the same in both languages: a
    paper name, a question type, a band, an activity id. */
function isAtomic(piece: string): boolean {
  const trimmed = piece.trim();
  return trimmed !== '' && !/[.!?]/.test(trimmed.replace(/\d\.\d/g, '')) && trimmed.split(/\s+/).length <= 3;
}

function translateTemplate(text: string, target: Locale, depth: number): string | null {
  for (const source of [OTHER[target], target] as Locale[]) {
    for (const pattern of PATTERNS) {
      for (const pieces of splits(text, pattern.lits[source])) {
        const values: Record<string, string> = {};
        let ok = true;
        pieces.forEach((raw, index) => {
          if (!ok) return;
          const name = pattern.names[index]!;
          if (!SENTENCE_SLOTS.has(name)) {
            if (isAtomic(raw)) values[name] = raw.trim();
            else ok = false;
            return;
          }
          const translated = translatePiece(raw, target, depth);
          if (translated !== null) values[name] = translated;
          else if (isAtomic(raw)) values[name] = raw.trim();
          else ok = false;
        });
        if (ok) return fill(textOf(pattern.pair, target), values).trim();
      }
    }
  }
  return null;
}

/** A plan-history sentence in `locale`, whichever language it was stored in.
    Unrecognised text comes back exactly as stored. */
export function planHistoryText(locale: Locale, summary: string): string {
  const trimmed = summary.trim();
  for (const source of [OTHER[locale], locale] as Locale[]) {
    const direct = BY_TEXT[source].get(trimmed);
    if (direct) return textOf(direct, locale);
  }
  return translateTemplate(trimmed, locale, 3) ?? summary;
}
