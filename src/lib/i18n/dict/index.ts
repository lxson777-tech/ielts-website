/* Locale to dictionary, loaded lazily.

   Adding a third language (Kazakh) is: one folder under dict/, one entry in
   LOADERS below, one entry in SUPPORTED_LOCALES/LOCALE_LABEL in locale.ts.
   No component changes.

   The loaders are dynamic imports on purpose: an English student never
   downloads a byte of Russian text. The bundler puts each language in its
   own chunk, fetched only when someone switches. */

import { type Locale, notifyLocaleListeners } from '../locale';

export interface PluralForms {
  one: string;
  few: string;
  many: string;
  other: string;
}

export interface Dictionary {
  /** English text (or `${ctx}${text}`) to translated text. */
  strings: Record<string, string>;
  /** English plural `other` form to the target language's forms. */
  plurals: Record<string, PluralForms>;
}

/** Every locale except English, which needs no dictionary. */
type TranslatedLocale = Exclude<Locale, 'en'>;

const LOADERS: Record<TranslatedLocale, () => Promise<Dictionary>> = {
  ru: () => import('./ru/index').then((m) => ({ strings: m.strings, plurals: m.plurals })),
};

const loaded = new Map<Locale, Dictionary>();
const inFlight = new Map<Locale, Promise<Dictionary | null>>();

/** The dictionary if it is already in memory, otherwise null. t() uses this
    so it can stay synchronous: before the dictionary lands it returns the
    English literal, and the load notifies every locale listener when it
    finishes, so everything re-renders once with the real text. */
export function getLoadedDictionary(locale: Locale): Dictionary | null {
  return loaded.get(locale) ?? null;
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
      loaded.set(locale, dict);
      // Everything that rendered English while this was in flight now
      // re-renders with the real text. One notification, one re-render.
      notifyLocaleListeners();
      return dict;
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
