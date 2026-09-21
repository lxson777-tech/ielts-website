/* Which language the interface is in, and where that choice is kept.

   Same defensive shape as src/lib/progress.ts: every storage access is
   wrapped, SSR returns the default, and a corrupt or unknown stored value
   degrades to English rather than throwing. Locale is a brand-new key
   (`ielts.locale.v1`) sitting next to `ielts.progress.v1`; nothing about
   progress is touched by it.

   English is the fallback everywhere, and the default unless the device
   itself is set to Russian (see detectLocale). A missing translation
   can never produce a blank or a key name, because the English text IS the
   key (see translate.ts). */

export const SUPPORTED_LOCALES = ['en', 'ru'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Each language named in its own language, never translated. */
export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
};

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
    not have to find a switch first. Kazakh is here too: there is no Kazakh
    version, and a Kazakh-set phone in Almaty is far more likely to be read in
    Russian than in English. This is only ever a first guess. It is never
    saved, so the EN / RU switch (which does save) always wins.

    BaseLayout's blocking head script repeats this rule before first paint and
    receives this very list through define:vars, so the two cannot disagree. */
export const RUSSIAN_DEVICE_LANGUAGES: readonly string[] = ['ru', 'kk'];

/** The language to use when nothing is stored: Russian for a device set to
    one of RUSSIAN_DEVICE_LANGUAGES, English otherwise. Looks at the device's
    FIRST language only, so an English-first student who merely lists Russian
    further down keeps English. */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  try {
    const first = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    const base = first.toLowerCase().split('-')[0] ?? '';
    return RUSSIAN_DEVICE_LANGUAGES.includes(base) ? 'ru' : DEFAULT_LOCALE;
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
