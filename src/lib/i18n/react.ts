/* React bindings for the language switch.

   Built on useSyncExternalStore with a server snapshot of 'en', so an
   island's hydration render matches the English HTML Astro built, and the
   switch to Russian arrives as an ordinary re-render one tick later. That is
   what keeps a persisted island (transition:persist) and a freshly hydrated
   one behaving identically. */

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  getLocaleSnapshot,
  getServerLocaleSnapshot,
  localeFromSnapshot,
  onLocaleChange,
  type Locale,
} from './locale';
import { loadDictionary } from './dict/index';
import { t as translate, tn as translateCount, type CountForms, type Vars } from './translate';

/** The current interface language, re-rendering the component when it
    changes and again when that language's dictionary finishes loading. */
export function useLocale(): Locale {
  const snapshot = useSyncExternalStore(onLocaleChange, getLocaleSnapshot, getServerLocaleSnapshot);
  const locale = localeFromSnapshot(snapshot);

  // Islands are self-sufficient: an island mounted on a Russian page asks
  // for the dictionary itself rather than depending on the layout script
  // having got there first. loadDictionary is idempotent, so the extra
  // calls cost nothing.
  useEffect(() => {
    if (locale !== 'en') void loadDictionary(locale);
  }, [locale]);

  return locale;
}

export interface Translator {
  t: (text: string, vars?: Vars, ctx?: string) => string;
  tn: (n: number, forms: CountForms, vars?: Vars) => string;
  locale: Locale;
}

/** `const { t, tn } = useT();` — the one thing an island needs. */
export function useT(): Translator {
  const locale = useLocale();
  return useMemo<Translator>(
    () => ({
      locale,
      t: (text, vars, ctx) => translate(text, vars, ctx, locale),
      tn: (n, forms, vars) => translateCount(n, forms, vars, locale),
    }),
    [locale],
  );
}
