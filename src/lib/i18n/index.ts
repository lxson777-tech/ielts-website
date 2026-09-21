/* The public entry point for the language switch.

   Read docs/I18N-GUIDE.md before adding translated strings. */

import { setLocale, type Locale } from './locale';
import { loadDictionary } from './dict/index';

export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_LABEL,
  LOCALE_STORAGE_KEY,
  PENDING_CLASS,
  isLocale,
  getLocale,
  setLocale,
  onLocaleChange,
  applyDocumentLocale,
  type Locale,
} from './locale';

export { t, tn, nt, messageKey, interpolate, translateWith, pluralWith, type CountForms, type Vars } from './translate';
export { loadDictionary, getLoadedDictionary, type Dictionary, type PluralForms } from './dict/index';
export { applyTranslations } from './dom';

/**
 * Switch the interface language. This is what a language control calls.
 *
 * The switch applies immediately (English text stays on screen for the
 * moment it takes the dictionary chunk to arrive, never a blank), and every
 * listener fires a second time once the real text is in, so the page
 * re-renders exactly once more.
 */
export async function switchLocale(locale: Locale): Promise<void> {
  setLocale(locale);
  await loadDictionary(locale);
}
