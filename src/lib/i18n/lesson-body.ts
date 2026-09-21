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
    the lesson slug, e.g. "reading-tfng". A lesson whose fragment is split
    around a generated card grid (listening.astro, reading-task1.astro)
    has two such elements with the same slug; see splitForParts(). */
export const LESSON_BODY_ATTR = 'data-lesson-body';

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

/** The comment the two split fragments were divided on at build time. The
    Russian file keeps it in the same place, so the same split works. */
const CARD_MARKER = /<!--\s*lesson-cards\s*-->/;

/** slug -> the English innerHTML of each fragment element, in document
    order. Captured the first time we touch the page, before any swap. */
const englishParts = new Map<string, string[]>();

/** "locale/slug" -> the fetched fragment, or null for "there is no
    translation". Cached for the tab's lifetime so switching back and forth,
    or returning to a lesson, costs nothing. */
const fetched = new Map<string, string | null>();

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

function elements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`[${LESSON_BODY_ATTR}]`));
}

/** The whole Russian file, cut into as many pieces as the page has
    fragment elements. One element is the normal case and needs no cut. */
function splitForParts(html: string, count: number): string[] | null {
  if (count === 1) return [html];
  const parts = html.split(CARD_MARKER);
  return parts.length === count ? parts : null;
}

function setLoading(els: HTMLElement[], on: boolean): void {
  for (const el of els) {
    if (on) el.setAttribute(LESSON_BODY_LOADING_ATTR, '');
    else el.removeAttribute(LESSON_BODY_LOADING_ATTR);
  }
}

function write(els: HTMLElement[], parts: string[], locale: Locale | null): void {
  els.forEach((el, i) => {
    el.innerHTML = parts[i] ?? '';
    if (locale) el.setAttribute(LOCALE_ATTR, locale);
    else el.removeAttribute(LOCALE_ATTR);
  });
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
  const els = elements();
  if (els.length === 0) return;

  const slug = els[0]!.getAttribute(LESSON_BODY_ATTR) ?? '';
  if (!slug) return;

  if (!englishParts.has(slug)) englishParts.set(slug, els.map((el) => el.innerHTML));
  const english = englishParts.get(slug)!;

  const locale = getLocale();
  const mine = ++generation;

  if (locale === 'en') {
    setLoading(els, false);
    if (els.some((el) => el.hasAttribute(LOCALE_ATTR))) {
      write(els, english, null);
      announce({ slug, locale });
    }
    return;
  }

  const key = `${locale}/${slug}`;
  const cached = fetched.get(key);
  if (cached !== undefined) {
    setLoading(els, false);
    applyHtml(els, slug, locale, cached);
    return;
  }

  /* Unknown yet. Hide just the fragment while we find out — on a hard load
     the whole page is already hidden by i18n-pending, but a client-side
     navigation paints immediately and would otherwise show English first. */
  setLoading(els, true);
  const failsafe = window.setTimeout(() => setLoading(els, false), FAILSAFE_MS);

  let html: string | null = null;
  try {
    const res = await fetch(withBase(`/lesson-bodies/${locale}/${slug}.html`), {
      headers: { Accept: 'text/html' },
    });
    if (res.ok) html = await res.text();
  } catch {
    html = null;
  }
  window.clearTimeout(failsafe);
  fetched.set(key, html);

  /* A newer call owns the page now (navigation, or a second switch). */
  if (mine !== generation) return;

  setLoading(els, false);
  applyHtml(els, slug, locale, html);
}

function applyHtml(els: HTMLElement[], slug: string, locale: Locale, html: string | null): void {
  if (html === null) return; // no translation for this lesson yet — English stays
  const parts = splitForParts(html, els.length);
  if (!parts) {
    if (typeof console !== 'undefined') {
      console.warn(
        `[i18n] ${locale}/${slug}: the translated fragment does not split into ${els.length} parts ` +
          'on the "<!-- lesson-cards -->" marker, so the English body was kept.',
      );
    }
    return;
  }
  const already = els[0]!.getAttribute(LOCALE_ATTR);
  if (already === locale) return;
  write(els, parts, locale);
  announce({ slug, locale });
}

/** Test seam: forget the caches so a fresh scenario starts clean. */
export function resetLessonBodyCache(): void {
  englishParts.clear();
  fetched.clear();
  generation = 0;
  swaps = 0;
  lastDetail = null;
}
