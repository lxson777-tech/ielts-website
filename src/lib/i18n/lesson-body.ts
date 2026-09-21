/* Swapping a lesson's teaching content into the student's language.

   The interface strings go through t() and the dictionary (see
   translate.ts / dom.ts). A lesson BODY is different: it is a 2 to 30 KB
   HTML fragment of teaching prose, not a list of short labels, so it is
   delivered as a whole file instead.

   How it works
   ------------
   - The English fragment is baked into the page at build time, exactly as
     before (src/pages/lessons/**). Nothing about an English page changes,
     and an English student never fetches anything extra.
   - The Russian fragment is published as its own static file by
     src/pages/lesson-bodies/[locale]/[slug].html.ts, e.g.
     /ielts-website/lesson-bodies/ru/reading-tfng.html.
   - For a non-English locale this module fetches that file once and
     replaces the English fragment's innerHTML with it. A 404 (no
     translation yet) simply leaves the English in place.
   - The English HTML is remembered in memory, so switching back to
     English restores the page exactly, with no reload.

   Why innerHTML is safe here: the file comes from our own origin and was
   written by us into the repository. It is the same content the page would
   have shipped inline.

   Who has to know
   ---------------
   A swap replaces every node inside the fragment, so anything that
   attached behaviour to those nodes (scroll reveal, the <details>
   animation, the in-lesson reading quiz, the completion ticks on lesson
   cards) has to run again. Subscribe with onLessonBodySwap(). The
   subscription REPLAYS: a subscriber that registers after a swap has
   already happened is called immediately, so a listener in a later
   <script> block can never miss the event it was waiting for. */

import { getLocale, type Locale } from './locale';
import { withBase } from '../url';

/** Marks the element whose innerHTML is one lesson fragment. Its value is
    the lesson slug, e.g. "reading-tfng". One per page. */
export const LESSON_BODY_ATTR = 'data-lesson-body';

/** Two lessons (listening.astro, reading-task1.astro) have a generated grid
    of lesson cards in the middle of the fragment, at the point where the
    source file carries a "<!-- lesson-cards -->" comment. The grid is built
    by Astro, not by the fragment, so a swap must not destroy it: the page
    wraps it in an element with this attribute, and write() lifts that node
    out, swaps the text around it, and puts the same node back where the
    translated file has the same comment.

    Gotcha worth remembering: that comment sits INSIDE an open
    <div class="section">, so the fragment cannot be cut in two and each half
    wrapped in its own element. The halves are not balanced HTML, and the
    browser repairs them by nesting the second wrapper and the grid inside
    the first, which the first swap then wipes out. One wrapper around the
    whole lesson is the only shape that parses the way it reads. */
export const LESSON_CARDS_ATTR = 'data-lesson-cards';

/** Present while we do not yet know whether a translation exists. CSS in
    BaseLayout hides the fragment (not the page) for exactly that moment,
    so a client-side navigation never flashes English before the Russian
    arrives. Removed unconditionally after FAILSAFE_MS. */
export const LESSON_BODY_LOADING_ATTR = 'data-lesson-body-loading';

/** Records which language the fragment currently shows, for debugging and
    for CSS that may one day need it. */
const LOCALE_ATTR = 'data-lesson-body-locale';

/** Same reasoning as the 1500 ms un-hide in BaseLayout's head script: a
    request that never comes back must leave readable English, never a
    hole. */
const FAILSAFE_MS = 1500;

/** Where the generated card grid goes. Both the English source and the
    Russian file carry it in the same place (the checker enforces that). */
const CARD_MARKER = /<!--\s*lesson-cards\s*-->/;
const CARD_SLOT_ATTR = 'data-lesson-cards-slot';

/** slug -> the English innerHTML of the fragment, with the card grid (if
    any) turned back into its marker comment. Captured the first time we
    touch the page, before any swap. */
const englishHtml = new Map<string, string>();

/** "locale/slug" -> the fragment being fetched, resolving to null for
    "there is no translation". The PROMISE is cached, not the result: the
    layout asks for the body on first run, on astro:page-load and on a
    locale change, which can all land before the first response, and caching
    only the result made each of them download the file again. Kept for the
    tab's lifetime so switching back and forth, or returning to a lesson,
    costs nothing. */
const fetched = new Map<string, Promise<string | null>>();

/** Bumped on every call, so a fetch that finishes after a newer call
    started (the student navigated away, or switched language twice) is
    discarded instead of overwriting the newer page. */
let generation = 0;

/** How many swaps have happened. Subscribers compare against their own
    last-seen value, which is what makes the subscription replay. */
let swaps = 0;

const subscribers = new Set<{ seen: number; cb: (detail: SwapDetail) => void }>();

let lastDetail: SwapDetail | null = null;

export interface SwapDetail {
  slug: string;
  locale: Locale;
}

/**
 * Run `cb` every time a lesson body is replaced, and once immediately if a
 * swap already happened before this call. Returns an unsubscribe function.
 */
export function onLessonBodySwap(cb: (detail: SwapDetail) => void): () => void {
  const entry = { seen: 0, cb };
  subscribers.add(entry);
  if (swaps > 0 && lastDetail) {
    entry.seen = swaps;
    try {
      cb(lastDetail);
    } catch {
      /* a broken subscriber must not break the swap for everything else */
    }
  }
  return () => {
    subscribers.delete(entry);
  };
}

function announce(detail: SwapDetail): void {
  swaps += 1;
  lastDetail = detail;
  for (const entry of subscribers) {
    entry.seen = swaps;
    try {
      entry.cb(detail);
    } catch {
      /* ignore */
    }
  }
}

function element(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${LESSON_BODY_ATTR}]`);
}

/** The fragment's HTML with the live card grid swapped back for the comment
    it was generated at, so English can be restored through the same write()
    as a translation. */
function capture(el: HTMLElement): string {
  const cards = el.querySelector<HTMLElement>(`[${LESSON_CARDS_ATTR}]`);
  if (!cards) return el.innerHTML;
  const marker = document.createComment(' lesson-cards ');
  cards.replaceWith(marker);
  const html = el.innerHTML;
  marker.replaceWith(cards);
  return html;
}

/** Whether `html` can be written into `el` without losing the card grid. */
function fits(el: HTMLElement, html: string): boolean {
  return !el.querySelector(`[${LESSON_CARDS_ATTR}]`) || CARD_MARKER.test(html);
}

function setLoading(el: HTMLElement, on: boolean): void {
  if (on) el.setAttribute(LESSON_BODY_LOADING_ATTR, '');
  else el.removeAttribute(LESSON_BODY_LOADING_ATTR);
}

function write(el: HTMLElement, html: string, locale: Locale | null): void {
  const cards = el.querySelector<HTMLElement>(`[${LESSON_CARDS_ATTR}]`);
  if (cards) {
    // The same node goes back, not a copy: it keeps its completion ticks
    // and whatever the interface translation already did to its labels.
    cards.remove();
    el.innerHTML = html.replace(CARD_MARKER, `<div ${CARD_SLOT_ATTR}></div>`);
    el.querySelector(`[${CARD_SLOT_ATTR}]`)?.replaceWith(cards);
  } else {
    el.innerHTML = html;
  }
  if (locale) el.setAttribute(LOCALE_ATTR, locale);
  else el.removeAttribute(LOCALE_ATTR);
}

function load(locale: Locale, slug: string): Promise<string | null> {
  const key = `${locale}/${slug}`;
  let pending = fetched.get(key);
  if (!pending) {
    pending = fetch(withBase(`/lesson-bodies/${locale}/${slug}.html`), { headers: { Accept: 'text/html' } })
      .then((res) => (res.ok ? res.text() : null))
      .catch(() => null);
    fetched.set(key, pending);
  }
  return pending;
}

/**
 * Put the current locale's version of this page's lesson body on screen.
 *
 * Safe and cheap to call repeatedly: on every navigation, on every locale
 * change, and on a page with no lesson body at all (it returns at once).
 * Never rejects: a failed or missing translation leaves English.
 */
export async function applyLessonBody(): Promise<void> {
  if (typeof document === 'undefined') return;
  const el = element();
  if (!el) return;

  const slug = el.getAttribute(LESSON_BODY_ATTR) ?? '';
  if (!slug) return;

  // Only ever captured from an element that has not been swapped, so a
  // second visit to the lesson (a fresh element, still English) is fine and
  // a swapped one can never overwrite the original.
  if (!englishHtml.has(slug) && !el.hasAttribute(LOCALE_ATTR)) englishHtml.set(slug, capture(el));

  const locale = getLocale();
  const mine = ++generation;

  if (locale === 'en') {
    setLoading(el, false);
    const english = englishHtml.get(slug);
    if (el.hasAttribute(LOCALE_ATTR) && english !== undefined) {
      write(el, english, null);
      announce({ slug, locale });
    }
    return;
  }

  if (el.getAttribute(LOCALE_ATTR) === locale) return;

  /* Hide just the fragment while we find out whether a translation exists.
     On a hard load the whole page is already hidden by i18n-pending, but a
     client-side navigation paints immediately and would otherwise show
     English first. When the file is already cached this lasts one
     microtask and is never painted. */
  setLoading(el, true);
  const failsafe = window.setTimeout(() => setLoading(el, false), FAILSAFE_MS);
  const html = await load(locale, slug);
  window.clearTimeout(failsafe);
  setLoading(el, false);

  /* A newer call owns the page now (navigation, or a second switch). */
  if (mine !== generation) return;

  if (html === null) return; // no translation for this lesson yet, English stays
  if (el.getAttribute(LOCALE_ATTR) === locale) return;
  if (!fits(el, html)) {
    if (typeof console !== 'undefined') {
      console.warn(
        `[i18n] ${locale}/${slug}: the translated fragment has no "<!-- lesson-cards -->" marker ` +
          'for the lesson-card grid, so the English body was kept.',
      );
    }
    return;
  }
  write(el, html, locale);
  announce({ slug, locale });
}

/** Test seam: forget the caches so a fresh scenario starts clean. */
export function resetLessonBodyCache(): void {
  englishHtml.clear();
  fetched.clear();
  generation = 0;
  swaps = 0;
  lastDetail = null;
}
