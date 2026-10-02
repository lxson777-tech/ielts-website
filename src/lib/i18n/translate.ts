/* The translation lookup itself.

   The English text IS the key (gettext style). A component keeps its English
   literal and wraps it:

       t('Progress report')

   For 'en' that returns the literal untouched — byte-identical output for
   today's students, and no way for a missing translation to render a blank
   or a raw key name, because the fallback is the English text you are
   looking at in the source.

   Two things sit on top of that:
   - `ctx` for one English word that needs two different translations
     ("Open" the verb on a button vs "Open" the adjective). The lookup key
     becomes `${ctx}${text}` — the same separator gettext uses.
   - `{name}` placeholders, interpolated AFTER lookup, so a translator can
     reorder them freely: 'Ready in {days} days' -> 'Через {days} дня'. */

import { getLocale, type Locale } from './locale';
import { getLoadedDictionary, type Dictionary, type PluralForms } from './dict/index';

/** gettext's context separator (EOT). Never appears in real UI text. */
export const CONTEXT_SEPARATOR = '';

export type Vars = Record<string, string | number>;

/** The dictionary key for a piece of English text, with or without context. */
export function messageKey(text: string, ctx?: string): string {
  return ctx ? `${ctx}${CONTEXT_SEPARATOR}${text}` : text;
}

/** Fill `{name}` holes. Unknown names are left alone rather than blanked,
    so a typo in a translation shows up as `{nmae}` instead of vanishing. */
export function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}

/** Pure lookup against an explicit dictionary. Exported for tests and for
    any code that has to translate without touching module state. */
export function translateWith(
  dict: Dictionary | null,
  locale: Locale,
  text: string,
  vars?: Vars,
  ctx?: string,
): string {
  if (locale === 'en' || !dict) return interpolate(text, vars);
  const hit = dict.strings[messageKey(text, ctx)];
  // An empty string in a dictionary means "not translated yet", same as a
  // missing key: fall back to English rather than rendering nothing.
  return interpolate(hit && hit.length > 0 ? hit : text, vars);
}

/**
 * Translate one piece of interface text.
 *
 * @param text The English literal, which is also the dictionary key.
 * @param vars Values for `{name}` placeholders.
 * @param ctx  Disambiguating context, when the same English word needs two
 *             different translations.
 * @param locale Override the stored locale (pure code, Workers, tests).
 */
export function t(text: string, vars?: Vars, ctx?: string, locale?: Locale): string {
  const loc = locale ?? getLocale();
  return translateWith(getLoadedDictionary(loc), loc, text, vars, ctx);
}

/**
 * Mark a string for translation without translating it here.
 *
 * For English text that lives in a data registry (nav labels, lesson
 * titles) and is rendered somewhere else. It returns its argument
 * unchanged, but the coverage test in tests/i18n.test.ts extracts it exactly
 * like `t()`, so the Russian entry is still required. This is gettext's
 * `N_()`.
 */
export function nt(text: string): string {
  return text;
}

export interface CountForms {
  one: string;
  other: string;
}

/** A counted phrase kept as data: the count and its two English forms. */
export interface CountedPhrase extends CountForms {
  n: number;
}

/**
 * Mark a counted phrase for translation without translating it here: the
 * `tn()` of data. For a count written in a data registry or an .astro
 * page's frontmatter and rendered somewhere else, usually through
 * `src/components/Count.astro`, which prints the English and lets the page's
 * runtime (src/lib/i18n/dom.ts, `data-i18n-n`) swap in the right Russian
 * form. The coverage test extracts it exactly like `tn()`, so the Russian
 * plural entry is still required.
 *
 *     stats: ntn(ALL_DRILLS.length, { one: '{n} drill', other: '{n} drills' })
 */
export function ntn(n: number, forms: CountForms): CountedPhrase {
  return { n, one: forms.one, other: forms.other };
}

const pluralRules = new Map<string, Intl.PluralRules>();

/* Kazakh counts with the RUSSIAN rules, on purpose. Its dictionary is the
   Russian one with Kazakh laid on top (dict/index.ts), so most counted
   phrases a Kazakh reader sees are Russian and need Russian's one / few /
   many choice. Kazakh's own plural entries fill all four forms with the
   same Kazakh text (a Kazakh noun does not change after a number: "5
   сабақ"), so whichever form the Russian rule picks reads correctly. */
const PLURAL_RULES_LOCALE: Partial<Record<Locale, string>> = { kk: 'ru' };

function rulesFor(locale: Locale): Intl.PluralRules {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(PLURAL_RULES_LOCALE[locale] ?? locale);
    pluralRules.set(locale, rules);
  }
  return rules;
}

/** Pure counted-phrase lookup against an explicit dictionary. */
export function pluralWith(
  dict: Dictionary | null,
  locale: Locale,
  n: number,
  forms: CountForms,
  vars?: Vars,
): string {
  const withCount: Vars = { n, ...vars };
  if (locale === 'en' || !dict) {
    return interpolate(n === 1 ? forms.one : forms.other, withCount);
  }
  // Keyed by the English plural (`other`) form: one entry per counted
  // phrase, whatever the singular happens to look like.
  const entry: PluralForms | undefined = dict.plurals[forms.other];
  if (!entry) return interpolate(n === 1 ? forms.one : forms.other, withCount);

  const category = rulesFor(locale).select(n);
  const chosen =
    (category === 'one' && entry.one) ||
    (category === 'few' && entry.few) ||
    (category === 'many' && entry.many) ||
    entry.other ||
    entry.many ||
    forms.other;
  return interpolate(chosen, withCount);
}

/**
 * A counted phrase. English needs two forms, Russian needs four, so the call
 * site gives the two English ones and the dictionary supplies the rest.
 *
 *     tn(count, { one: '{n} lesson', other: '{n} lessons' })
 *
 * `{n}` is always available as a variable, on top of anything in `vars`.
 *
 * @param locale Override the stored locale (pure code, Workers, tests).
 */
export function tn(n: number, forms: CountForms, vars?: Vars, locale?: Locale): string {
  const loc = locale ?? getLocale();
  return pluralWith(getLoadedDictionary(loc), loc, n, forms, vars);
}
