/* Locale to dictionary, loaded lazily.

   Adding a third language (Kazakh) is: one folder under dict/, one entry in
   LOADERS below, one entry in SUPPORTED_LOCALES/LOCALE_LABEL in locale.ts.
   No component changes.

   The loaders are dynamic imports on purpose: an English student never
   downloads a byte of Russian text. The bundler puts each language in its
   own chunk, fetched only when someone switches.

   On top of that there are named extra PARTS (see ./parts.ts): the big
   coaching texts, fetched only by the screens that show them and merged into
   the same dictionary object, so t() never learns about any of this. */

import { type Locale, notifyLocaleListeners } from '../locale';
import { DICTIONARY_PARTS, type DictionaryPart } from './parts';

export { DICTIONARY_PARTS, PART_SOURCES, isDictionaryPart, partForSourceFile, type DictionaryPart } from './parts';

export interface PluralForms {
  one: string;
  few: string;
  many: string;
  other: string;
}

export interface Dictionary {
  /** English text (or `${ctx}${text}`) to translated text. */
  strings: Record<string, string>;
  /** English plural `other` form to the target language's forms. */
  plurals: Record<string, PluralForms>;
}

/** Every locale except English, which needs no dictionary. */
type TranslatedLocale = Exclude<Locale, 'en'>;

interface DictionaryModule {
  strings: Record<string, string>;
  plurals: Record<string, PluralForms>;
}

const pick = (m: DictionaryModule): Dictionary => ({ strings: m.strings, plurals: m.plurals });

const LOADERS: Record<TranslatedLocale, () => Promise<Dictionary>> = {
  ru: () => import('./ru/index').then(pick),
};

/** One loader per locale per part. A locale with no entry for a part simply
    has nothing extra to show there, and stays English. */
const PART_LOADERS: Record<TranslatedLocale, Partial<Record<DictionaryPart, () => Promise<Dictionary>>>> = {
  ru: {
    strategies: () => import('./ru/parts/strategies').then(pick),
    structures: () => import('./ru/parts/structures').then(pick),
    'band-guides': () => import('./ru/parts/band-guides').then(pick),
  },
};

const loaded = new Map<Locale, Dictionary>();
const inFlight = new Map<Locale, Promise<Dictionary | null>>();

/** `${locale}:${part}` for every part already merged in. */
const loadedParts = new Set<string>();
const partsInFlight = new Map<string, Promise<void>>();

/* Every part anything has asked for in this session, whatever the locale.
   A student who opens the band ladder in English and then switches to
   Russian must get the Russian band guides without asking again, so the
   base load replays this set. */
const requestedParts = new Set<DictionaryPart>();

function partToken(locale: Locale, part: DictionaryPart): string {
  return `${locale}:${part}`;
}

/** The dictionary if it is already in memory, otherwise null. t() uses this
    so it can stay synchronous: before the dictionary lands it returns the
    English literal, and the load notifies every locale listener when it
    finishes, so everything re-renders once with the real text. */
export function getLoadedDictionary(locale: Locale): Dictionary | null {
  return loaded.get(locale) ?? null;
}

/** Has this locale's copy of this part been merged in yet? English is always
    "ready": there is nothing to fetch. Components use this to decide whether
    what they are about to render is the real thing or the English fallback. */
export function isDictionaryPartLoaded(locale: Locale, part: DictionaryPart): boolean {
  return locale === 'en' || loadedParts.has(partToken(locale, part));
}

/** Fetch a locale's dictionary chunk. Idempotent: concurrent callers share
    one request, and an already-loaded locale resolves immediately without
    notifying again. English resolves to null (nothing to load). */
export function loadDictionary(locale: Locale): Promise<Dictionary | null> {
  if (locale === 'en') return Promise.resolve(null);
  const already = loaded.get(locale);
  if (already) return Promise.resolve(already);
  const pending = inFlight.get(locale);
  if (pending) return pending;

  const loader = LOADERS[locale as TranslatedLocale];
  if (!loader) return Promise.resolve(null);

  const promise = loader()
    .then((dict) => {
      // A copy, not the imported module's own objects: parts are merged in
      // by mutating this, and the batch files must stay exactly what their
      // authors wrote (the coverage test reads them directly).
      const own: Dictionary = { strings: { ...dict.strings }, plurals: { ...dict.plurals } };
      loaded.set(locale, own);
      // Everything that rendered English while this was in flight now
      // re-renders with the real text. One notification, one re-render.
      notifyLocaleListeners();
      // Anything that already asked for a part wants it in this language too.
      for (const part of requestedParts) void loadDictionaryPart(locale, part);
      return own;
    })
    .catch(() => {
      // A failed chunk fetch (offline, cache miss on a stale deploy) must
      // not break the page: the interface simply stays English.
      return null;
    })
    .finally(() => {
      inFlight.delete(locale);
    });

  inFlight.set(locale, promise);
  return promise;
}

/**
 * Fetch one named extra part (see ./parts.ts) and merge it into this
 * locale's dictionary.
 *
 * Idempotent and safe to call on every render: an already-merged part
 * resolves immediately and notifies nobody. The base dictionary is loaded
 * first, so a part can never be overwritten by the base landing afterwards.
 * Every failure path leaves the English in place; none of them throws.
 */
export function loadDictionaryPart(locale: Locale, part: DictionaryPart): Promise<void> {
  requestedParts.add(part);
  if (locale === 'en') return Promise.resolve();
  const token = partToken(locale, part);
  if (loadedParts.has(token)) return Promise.resolve();
  const pending = partsInFlight.get(token);
  if (pending) return pending;

  const loader = PART_LOADERS[locale as TranslatedLocale]?.[part];
  if (!loader) return Promise.resolve();

  const promise = Promise.all([loadDictionary(locale), loader()])
    .then(([base, extra]) => {
      // No base dictionary means the whole language failed to load; there is
      // nothing sensible to merge into, and the page stays English.
      if (!base) return;
      Object.assign(base.strings, extra.strings);
      Object.assign(base.plurals, extra.plurals);
      loadedParts.add(token);
      notifyLocaleListeners();
    })
    .catch(() => {
      /* the guidance stays English; nothing else on the page is affected */
    })
    .finally(() => {
      partsInFlight.delete(token);
    });

  partsInFlight.set(token, promise);
  return promise;
}

/** Ask for several parts at once. Handy for a screen that shows two kinds of
    guidance, and for warming a part up before the component that needs it
    mounts. */
export function loadDictionaryParts(locale: Locale, parts: readonly DictionaryPart[]): Promise<void> {
  return Promise.all(parts.map((part) => loadDictionaryPart(locale, part))).then(() => undefined);
}

/** Every part known to the loader for a locale. Exported for the test that
    keeps ./parts.ts and PART_LOADERS from drifting apart. */
export function availableDictionaryParts(locale: Locale): DictionaryPart[] {
  const loaders = PART_LOADERS[locale as TranslatedLocale];
  if (!loaders) return [];
  return DICTIONARY_PARTS.filter((part) => Boolean(loaders[part]));
}
