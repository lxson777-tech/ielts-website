/* The sales page's language runtime.

   Reads and writes the SAME stored choice as the workspace
   (`ielts.locale.v1` through src/lib/i18n/locale.ts), so the language a
   visitor picks here is the language of sign-up, sign-in, profile and the
   workspace, and a student who chose Russian in the workspace sees this page
   in Russian. With nothing stored, a device set to Russian opens in
   Russian and one set to Kazakh in Kazakh, exactly like the workspace
   (detectLocale).

   Markup contract (the English is rendered at build time from
   src/marketing/sales-copy.ts):
     data-sales="key"                     the element's content is that entry
     data-sales-attr="aria-label:key,alt:key2"   those attributes are entries
     data-lang-option="en" | "ru" | "kk"  a language switch button

   After every change it fires `sales:locale` on document, so scripts that
   write their own sentences (the questionnaire) re-render. */

import { getLocale, setLocale, isLocale, onLocaleChange, applyDocumentLocale, PENDING_CLASS } from '../lib/i18n/locale';
import { isSalesKey, salesText, type SalesLocale } from './sales-copy';

export const SALES_LOCALE_EVENT = 'sales:locale';

/** The sales page speaks English, Russian and Kazakh (a Kazakh entry
    missing its Kazakh shows the Russian, see salesText). */
export function salesLocale(): SalesLocale {
  const locale = getLocale();
  return locale === 'ru' || locale === 'kk' ? locale : 'en';
}

/** Translate one attribute list, `aria-label:nav.main,alt:hero.alt`. */
export function applySalesAttrs(el: Element, locale: SalesLocale = salesLocale()): void {
  const list = el.getAttribute('data-sales-attr');
  if (!list) return;
  for (const pair of list.split(',')) {
    const [attr, key] = pair.split(':').map((s) => s.trim());
    if (!attr || !key || !isSalesKey(key) || !/^[a-z][a-z0-9-]*$/.test(attr)) continue;
    el.setAttribute(attr, salesText(key, locale));
  }
}

export function applySalesCopy(root: ParentNode = document): SalesLocale {
  const locale = salesLocale();
  applyDocumentLocale(locale);
  root.querySelectorAll<HTMLElement>('[data-sales]').forEach((el) => {
    const key = el.dataset.sales ?? '';
    // Our own constant copy (sales-copy.ts), never visitor input.
    if (isSalesKey(key)) el.innerHTML = salesText(key, locale);
  });
  root.querySelectorAll('[data-sales-attr]').forEach((el) => applySalesAttrs(el, locale));
  document.title = salesText('meta.title', locale);
  document.querySelector('meta[name="description"]')?.setAttribute('content', salesText('meta.description', locale));
  document.querySelectorAll<HTMLButtonElement>('[data-lang-option]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.langOption === locale));
  });
  document.dispatchEvent(new CustomEvent(SALES_LOCALE_EVENT, { detail: locale }));
  return locale;
}

function start(): void {
  applySalesCopy();
  document.documentElement.classList.remove(PENDING_CLASS);
  onLocaleChange(() => applySalesCopy());
  document.querySelectorAll<HTMLButtonElement>('[data-lang-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const option = button.dataset.langOption;
      const next = isLocale(option) ? option : 'en';
      if (next === salesLocale()) return;
      setLocale(next);
      // On a phone only the other languages are shown, so the pressed button
      // hides itself: hand focus to the first one that is now visible.
      if (document.activeElement === button && button.offsetParent === null) {
        document.querySelector<HTMLButtonElement>(`[data-lang-option]:not([data-lang-option="${next}"])`)?.focus();
      }
    });
  });
}

start();
