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
import {
  loadDictionary,
  loadDictionaryPart,
  isDictionaryPartLoaded,
  type DictionaryPart,
} from './dict/index';
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

/**
 * Ask for one named extra dictionary part (see ./dict/parts.ts) and report
 * whether it is in memory yet.
 *
 * The request goes out as soon as the component mounts, and the component
 * re-renders when the part lands, because merging a part notifies the same
 * locale listeners a language switch does. Until then the English shows,
 * which is the same one-tick window an island already has for the main
 * dictionary. `true` for English, and for a part that is already merged.
 */
export function useDictionaryPart(part?: DictionaryPart): boolean {
  const locale = useLocale();

  useEffect(() => {
    if (part && locale !== 'en') void loadDictionaryPart(locale, part);
  }, [locale, part]);

  return !part || isDictionaryPartLoaded(locale, part);
}

export interface Translator {
  t: (text: string, vars?: Vars, ctx?: string) => string;
  tn: (n: number, forms: CountForms, vars?: Vars) => string;
  locale: Locale;
  /** False only while a requested extra part is still on its way, so a
      component that would rather wait than flash English can. Always true
      when no part was asked for. */
  ready: boolean;
}

/**
 * `const { t, tn } = useT();` — the one thing an island needs.
 *
 * Pass a part name (`useT('band-guides')`) when the island renders one of
 * the big guidance texts that live outside the main dictionary. That both
 * fetches the part and re-renders when it arrives.
 */
export function useT(part?: DictionaryPart): Translator {
  const locale = useLocale();
  const ready = useDictionaryPart(part);
  return useMemo<Translator>(
    () => ({
      locale,
      ready,
      t: (text, vars, ctx) => translate(text, vars, ctx, locale),
      tn: (n, forms, vars) => translateCount(n, forms, vars, locale),
    }),
    [locale, ready],
  );
}
