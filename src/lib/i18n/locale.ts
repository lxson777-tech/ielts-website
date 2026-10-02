/* Which language the interface is in, and where that choice is kept.

   Same defensive shape as src/lib/progress.ts: every storage access is
   wrapped, SSR returns the default, and a corrupt or unknown stored value
   degrades to English rather than throwing. Locale is a brand-new key
   (`ielts.locale.v1`) sitting next to `ielts.progress.v1`; nothing about
   progress is touched by it.

   English is the fallback everywhere, and the default unless the device
   itself is set to Russian or Kazakh (see detectLocale). A missing
   translation can never produce a blank or a key name, because the English
   text IS the key (see translate.ts).

   Kazakh ('kk', added 2 October 2026 for the legal and buying pages, which
   Kazakh consumer law asks for in Kazakh as well as Russian) is a partial
   language: a string with a Kazakh translation shows in Kazakh, and
   EVERYTHING ELSE shows in Russian, not English. Lesson bodies, test
   explanations, plurals without a Kazakh entry, Mr EZ and every AI reply
   are Russian for a Kazakh reader. contentLocale() is that rule in one
   place: any code that only knows English and Russian (the tutor layer,
   the learning layer, the Workers, the lesson-body files) receives
   contentLocale(locale), never 'kk'. */

export const SUPPORTED_LOCALES = ['en', 'ru', 'kk'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** The languages the course content, the AI and the Workers speak. Kazakh
    is an interface language only; its content language is Russian. */
export type ContentLocale = 'en' | 'ru';

export const DEFAULT_LOCALE: Locale = 'en';

/** Each language named in its own language, never translated. */
export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  kk: 'Қазақша',
};

/** The short code the language switches show. Kazakh shows as KZ, the
    country code students know, rather than the ISO language code KK. */
export const LOCALE_SHORT: Record<Locale, string> = {
  en: 'EN',
  ru: 'RU',
  kk: 'KZ',
};

/** The language a locale falls back to for anything it has not translated:
    Kazakh falls back to Russian, Russian to English. */
export const FALLBACK_LOCALE: Partial<Record<Locale, Locale>> = {
  kk: 'ru',
};

/** The content language for an interface language: Kazakh reads Russian
    lessons, Russian AI replies and Russian Worker messages. Also safe on an
    unknown value (English). */
export function contentLocale(locale: Locale | string | null | undefined): ContentLocale {
  if (locale === 'ru' || locale === 'kk') return 'ru';
  return 'en';
}

/** The BCP 47 tag Intl should format dates and numbers with. English keeps
    each call site's own variant (en-GB dates, en-US numbers); Kazakh uses
    kk-KZ where the browser has it, otherwise Russian, so a date is never
    printed in English inside a Kazakh or Russian sentence. */
export function intlLocale(locale: Locale | string | null | undefined, english = 'en-GB'): string {
  if (locale === 'kk') return kazakhIntlSupported() ? 'kk-KZ' : 'ru-RU';
  if (locale === 'ru') return 'ru-RU';
  return english;
}

let kazakhIntl: boolean | null = null;

function kazakhIntlSupported(): boolean {
  if (kazakhIntl !== null) return kazakhIntl;
  try {
    kazakhIntl =
      Intl.DateTimeFormat.supportedLocalesOf(['kk-KZ']).length > 0 &&
      Intl.NumberFormat.supportedLocalesOf(['kk-KZ']).length > 0;
  } catch {
    kazakhIntl = false;
  }
  return kazakhIntl;
}

/** localStorage key. Versioned like the progress store, so a future shape
    change (e.g. an account-synced locale object) can migrate cleanly. */
export const LOCALE_STORAGE_KEY = 'ielts.locale.v1';

/** The class the blocking head script puts on <html> when the stored locale
    is not English, so the page can stay hidden for the few milliseconds it
    takes the dictionary to land. Removed unconditionally by a timeout, so a
    failed load can never leave a blank page. See BaseLayout.astro. */
export const PENDING_CLASS = 'i18n-pending';

/** Device languages that open the site in Russian when the student has not
    chosen a language yet. Decided by Alex on 2026-09-21: most students are in
    Almaty with a phone set to Russian, and one who reads no English should
    not have to find a switch first. This is only ever a first guess. It is
    never saved, so the EN / RU / KZ switch (which does save) always wins. */
export const RUSSIAN_DEVICE_LANGUAGES: readonly string[] = ['ru'];

/** Device languages that open the site in Kazakh (2 October 2026, when the
    Kazakh interface arrived; before that a Kazakh-set phone opened in
    Russian, which is still what it reads wherever there is no Kazakh). */
export const KAZAKH_DEVICE_LANGUAGES: readonly string[] = ['kk'];

/** Device language to interface language, both lists above in one map.
    BaseLayout's and StoryLayout's blocking head scripts repeat this rule
    before first paint and receive this very map through define:vars, so the
    three cannot disagree. */
export const DEVICE_LANGUAGE_LOCALE: Readonly<Record<string, Locale>> = Object.freeze({
  ...Object.fromEntries(RUSSIAN_DEVICE_LANGUAGES.map((code) => [code, 'ru' as Locale])),
  ...Object.fromEntries(KAZAKH_DEVICE_LANGUAGES.map((code) => [code, 'kk' as Locale])),
});

/** The language to use when nothing is stored: Russian for a device set to
    Russian, Kazakh for a device set to Kazakh, English otherwise. Looks at
    the device's FIRST language only, so an English-first student who merely
    lists Russian further down keeps English. */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  try {
    const first = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    const base = first.toLowerCase().split('-')[0] ?? '';
    return Object.prototype.hasOwnProperty.call(DEVICE_LANGUAGE_LOCALE, base) ? DEVICE_LANGUAGE_LOCALE[base]! : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/* Read once, then keep it in memory: t() is called on every render of every
   island, and hitting localStorage that often is wasteful. setLocale() is
   the only writer, so the cache cannot go stale within a tab. */
let current: Locale | null = null;

/* Bumped on every notification (a locale change AND a dictionary finishing
   loading). React's useSyncExternalStore bails out when the snapshot is
   unchanged, so "the Russian text just arrived" needs to be visible in the
   snapshot even though the locale string itself did not change. */
let revision = 0;

/** The current interface language. Returns 'en' on the server, and for any
    stored value that is not a supported locale. Never throws. */
export function getLocale(): Locale {
  if (current) return current;
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    current = isLocale(stored) ? stored : detectLocale();
  } catch {
    current = detectLocale();
  }
  return current;
}

/** Locale plus a revision counter, for useSyncExternalStore. */
export function getLocaleSnapshot(): string {
  return `${getLocale()}#${revision}`;
}

/** The snapshot React renders on the server and during hydration. Always
    English, so an island's first client render matches its HTML exactly and
    the switch to Russian happens as an ordinary re-render afterwards. */
export function getServerLocaleSnapshot(): string {
  return `${DEFAULT_LOCALE}#0`;
}

export function localeFromSnapshot(snapshot: string): Locale {
  const code = snapshot.split('#')[0];
  return isLocale(code) ? code : DEFAULT_LOCALE;
}

const listeners = new Set<() => void>();

/** Subscribe to "the visible language may have changed": both an actual
    locale switch and a dictionary finishing its lazy load fire this, so a
    subscriber only needs one code path to re-render. Returns an unsubscribe. */
export function onLocaleChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Fire every listener. Called by setLocale() and by the dictionary loader
    (src/lib/i18n/dict/index.ts) once Russian text is actually available. */
export function notifyLocaleListeners(): void {
  revision += 1;
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a listener throwing must not break the switch for everything else */
    }
  }
}

/** Put the locale on <html> so CSS and screen readers see it. Safe to call
    repeatedly and safe on the server (does nothing). */
export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === 'undefined') return;
  try {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  } catch {
    /* ignore */
  }
}

/** Store the choice, update <html>, and tell everyone to re-render.
    Loading the dictionary is a separate step: see switchLocale() in
    src/lib/i18n/index.ts, which is what UI should call. */
export function setLocale(locale: Locale): void {
  const next = isLocale(locale) ? locale : DEFAULT_LOCALE;
  current = next;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    /* storage full or blocked — the choice still applies for this page */
  }
  applyDocumentLocale(next);
  notifyLocaleListeners();
}
