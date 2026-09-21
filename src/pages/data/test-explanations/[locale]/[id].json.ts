/* Publishes one translated set of answer explanations per file, e.g.
   /ielts-website/data/test-explanations/ru/reading-full-001.json, built
   statically alongside the rest of the site.

   Why a separate file rather than shipping both languages: the notes for
   all 70 practice tests are about half a megabyte of English, and their
   Russian is bigger again. An English student must download none of it,
   and a Russian student should download only the paper in front of them.
   So the English stays inside the test as it always was, and the Russian
   is fetched on demand by src/lib/i18n/test-explanations.ts, once, at the
   moment a review screen appears.

   The route only exists for files that exist: getStaticPaths lists what
   is actually in src/data/tests/ru/, so a test nobody has translated
   returns 404 and the student simply reads the English.

   Note the reduction. The source file carries, next to each Russian note,
   the sha of the English it was translated from and (often) the English
   itself, which is what makes staleness checkable in
   tools/explanations-ru-lib.mjs and readable in a diff. None of that is
   any use to a browser, so only the Russian is published. */

import type { APIRoute, GetStaticPaths } from 'astro';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../../../../lib/i18n/locale';
import type { PublishedExplanations } from '../../../../lib/i18n/test-explanations';

/* Every translated file in the repo, by path. Eager because these are
   read at build time only: nothing here reaches a browser bundle. */
const FILES = import.meta.glob<string>('../../../../data/tests/*/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const PREFIX = '../../../../data/tests/';
const TRANSLATED_LOCALES = new Set<string>(SUPPORTED_LOCALES.filter((code) => code !== DEFAULT_LOCALE));

interface SourceEntry {
  sha?: string;
  ru?: string;
}

interface SourceFile {
  id?: string;
  locale?: string;
  entries?: Record<string, SourceEntry>;
}

/** Source shape to published shape: keep the Russian, drop everything
    that only the checker and the reviewer need. Mirrors toPublished() in
    tools/explanations-ru-lib.mjs, which tests/explanations-ru.test.ts
    asserts against. */
function publish(id: string, locale: string, raw: string): PublishedExplanations {
  const file = JSON.parse(raw) as SourceFile;
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(file.entries ?? {})) {
    if (value && typeof value.ru === 'string' && value.ru.trim() !== '') entries[key] = value.ru;
  }
  return { id, locale, entries };
}

export const getStaticPaths: GetStaticPaths = () => {
  const paths: { params: { locale: string; id: string }; props: { raw: string } }[] = [];
  for (const [file, raw] of Object.entries(FILES)) {
    const rel = file.slice(PREFIX.length).replace(/\.json$/, '');
    const [locale, id] = rel.split('/');
    /* The folder name IS the locale, exactly as with the lesson bodies:
       src/data/tests/ru/ is Russian. The glob's one-directory-deep shape
       means anything with a different number of segments, or a locale the
       site does not support, is simply not published. */
    if (!locale || !id || !TRANSLATED_LOCALES.has(locale)) continue;
    paths.push({ params: { locale, id }, props: { raw } });
  }
  return paths;
};

export const GET: APIRoute = ({ params, props }) => {
  const body = publish(params.id as string, params.locale as string, props.raw as string);
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
