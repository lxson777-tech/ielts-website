/* Translating text that Astro rendered at build time.

   An .astro template has no React re-render to hook into: the English text is
   baked into the HTML file. So the markup declares what is translatable and
   this runtime swaps it in place.

   Markup contract
   ---------------
     <a data-i18n>Skip to content</a>
        translate this element's text content.

     <input data-i18n-attr="placeholder,aria-label" placeholder="Search" aria-label="Search lessons" />
        translate those attributes.

     <button data-i18n data-i18n-ctx="button">Open</button>
        use "button" as the disambiguating context for the lookup.

   Rules
   -----
   - Only elements whose content is plain text are supported. An element
     carrying `data-i18n` that contains child ELEMENTS is left alone (and
     warned about once, in dev), because replacing its textContent would
     delete those children.
   - The English original is remembered on the element the first time it is
     translated, so switching back to English restores it exactly and
     re-running is idempotent.
   - The English literal in the HTML is the dictionary key, exactly as in
     t(). There are no separate ids to keep in step. */

import { getLocale } from './locale';
import { t } from './translate';

/** dataset key used to remember the English text content. */
const ORIGINAL_TEXT = 'i18nEn';

/** Attribute names we are willing to touch: plain lowercase HTML/ARIA
    attributes. Anything else in a data-i18n-attr list is ignored rather
    than trusted into setAttribute. */
const SAFE_ATTR = /^[a-z][a-z0-9-]*$/;

function originalAttrName(attr: string): string {
  return `data-i18n-en-${attr}`;
}

let warnedAboutChildren = false;

function warnOnce(el: Element): void {
  if (warnedAboutChildren) return;
  warnedAboutChildren = true;
  const dev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
  if (!dev || typeof console === 'undefined') return;
  console.warn(
    '[i18n] data-i18n was placed on an element that contains child elements, so its text was left untranslated. ' +
      'Put data-i18n on the innermost element that holds only text. First offender:',
    el,
  );
}

function translateText(el: HTMLElement, ctx: string | undefined, english: boolean): void {
  // Child ELEMENTS (not text nodes) mean textContent is not safe to replace.
  if (el.firstElementChild) {
    warnOnce(el);
    return;
  }
  const stored = el.dataset[ORIGINAL_TEXT];
  const original = stored ?? el.textContent ?? '';
  if (stored === undefined) el.dataset[ORIGINAL_TEXT] = original;

  if (english) {
    el.textContent = original;
    return;
  }
  const source = original.trim();
  if (!source) return;
  el.textContent = t(source, undefined, ctx);
}

function translateAttrs(el: HTMLElement, list: string, ctx: string | undefined, english: boolean): void {
  for (const raw of list.split(',')) {
    const attr = raw.trim().toLowerCase();
    if (!attr || !SAFE_ATTR.test(attr)) continue;

    const memo = originalAttrName(attr);
    const stored = el.getAttribute(memo);
    const original = stored ?? el.getAttribute(attr);
    if (original === null) continue;
    if (stored === null) el.setAttribute(memo, original);

    if (english) {
      el.setAttribute(attr, original);
      continue;
    }
    const source = original.trim();
    if (!source) continue;
    el.setAttribute(attr, t(source, undefined, ctx));
  }
}

/**
 * Translate every marked element under `root` (the whole document by
 * default) into the current locale.
 *
 * Safe and cheap to re-run: call it after a client-side navigation, after a
 * language switch, or after injecting markup. For English it restores the
 * remembered originals, so switching back is exact.
 */
export function applyTranslations(root: ParentNode = document): void {
  if (typeof document === 'undefined') return;
  const english = getLocale() === 'en';
  const marked = root.querySelectorAll<HTMLElement>('[data-i18n], [data-i18n-attr]');
  for (const el of marked) {
    const ctx = el.dataset.i18nCtx || undefined;
    if (el.hasAttribute('data-i18n')) translateText(el, ctx, english);
    const attrList = el.getAttribute('data-i18n-attr');
    if (attrList) translateAttrs(el, attrList, ctx, english);
  }
}
