/* Publishes one translated lesson body per file, e.g.
   /ielts-website/lesson-bodies/ru/reading-tfng.html, built statically
   alongside the rest of the site.

   Why a separate file rather than shipping both languages in the page:
   an English student is the common case and must download nothing extra,
   and a lesson body is 2 to 30 KB of HTML. Two copies inline would also
   mean two elements with the same ids (every fragment has id="tfng" and
   friends) and every content script initialising twice. So the English
   stays inline, exactly as before, and the Russian is fetched on demand by
   src/lib/i18n/lesson-body.ts and swapped in.

   The route only exists for files that exist: getStaticPaths lists what is
   actually in src/content/lesson-bodies/<locale>/, so a lesson nobody has
   translated yet returns 404 and the reader simply keeps the English. */

import type { APIRoute, GetStaticPaths } from 'astro';
import { withBase } from '../../../lib/url';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../../../lib/i18n/locale';

/* Every translated fragment in the repo, by path. Eager because these are
   read at build time only — nothing here reaches a browser bundle. */
const BODIES = import.meta.glob<string>('../../../content/lesson-bodies/*/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const PREFIX = '../../../content/lesson-bodies/';
const TRANSLATED_LOCALES = new Set<string>(
  SUPPORTED_LOCALES.filter((code) => code !== DEFAULT_LOCALE),
);

export const getStaticPaths: GetStaticPaths = () => {
  const paths: { params: { locale: string; slug: string }; props: { html: string } }[] = [];
  for (const [file, html] of Object.entries(BODIES)) {
    const rel = file.slice(PREFIX.length).replace(/\.html$/, '');
    const [locale, slug] = rel.split('/');
    // The glob's */*.html shape only matches one directory deep, so a
    // two-segment path is a locale folder. Anything else (or a locale the
    // site does not support) is not published.
    if (!locale || !slug || !TRANSLATED_LOCALES.has(locale)) continue;
    paths.push({ params: { locale, slug }, props: { html } });
  }
  return paths;
};

export const GET: APIRoute = ({ props }) => {
  // Same rewrite the lesson pages apply to the English fragment, so an
  // <img src="../pics/…"> resolves against the GitHub Pages base path
  // rather than the lesson's own URL.
  const html = (props.html as string).replaceAll('../pics/', withBase('/pics/'));
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
