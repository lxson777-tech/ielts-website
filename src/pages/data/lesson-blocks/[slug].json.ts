/* Publishes one compact JSON file per lesson, e.g.
   /data/lesson-blocks/reading-tfng.json, built statically alongside the rest
   of the site.

   Why this exists: the tutor Worker answers "explain this bit" about the
   exact paragraph a student is reading, so it needs that paragraph's words.
   src/content/lesson-bodies is 1.6 MB of HTML across 152 files (76 English,
   76 Russian), far too much for a Cloudflare Worker to bundle, and the same
   reasoning that produced src/pages/data/tests/[id].json.ts applies here:
   publish a small file per lesson and let the Worker fetch the one it needs.

   Publishing it exposes nothing new. Every byte of this is already inside
   the lesson page the student is looking at, and the Russian half is already
   served by src/pages/lesson-bodies/[locale]/[slug].html.ts.

   The cutting rule and the ids are src/lib/learning/lesson-blocks.ts, the
   same pure function the lesson layout uses to stamp those ids onto the
   rendered headings. One rule, three callers, so a block id means the same
   thing in the page, in this file and in the Worker. No lesson body file is
   edited to make any of it work (lead decision D2). */

import type { APIRoute, GetStaticPaths } from 'astro';
import { publishLessonBlocks } from '../../../lib/learning/lesson-blocks';

/* Every lesson body in the repo, English and translated, by path. Eager
   because these are read at build time only: nothing here reaches a browser
   bundle. The English bodies sit directly in the folder and the translations
   one level down, so two globs rather than one. */
const ENGLISH = import.meta.glob<string>('../../../content/lesson-bodies/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const TRANSLATED = import.meta.glob<string>('../../../content/lesson-bodies/*/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Everything after the lesson-bodies folder, without the extension:
    `reading-tfng` for an English body, `ru/reading-tfng` for a translated
    one. Matched rather than sliced by a fixed prefix length, so moving this
    route one folder deeper cannot silently produce empty slugs. */
function slugOf(path: string): string {
  return path.replace(/^.*\/lesson-bodies\//, '').replace(/\.html$/, '');
}

/** Russian bodies by slug. The translated glob matches exactly one
    directory deep, so a two-segment path is a locale folder. Only `ru`
    exists today, and anything else is ignored rather than guessed at. */
const RUSSIAN = new Map<string, string>(
  Object.entries(TRANSLATED)
    .map(([path, html]) => [slugOf(path).split('/'), html] as const)
    .filter(([parts]) => parts.length === 2 && parts[0] === 'ru' && parts[1])
    .map(([parts, html]) => [parts[1] as string, html]),
);

export const getStaticPaths: GetStaticPaths = () =>
  Object.entries(ENGLISH).map(([path, html]) => {
    const slug = slugOf(path);
    return { params: { slug }, props: { slug, html, ru: RUSSIAN.get(slug) ?? null } };
  });

export const GET: APIRoute = ({ props }) => {
  const published = publishLessonBlocks(
    props.slug as string,
    props.html as string,
    props.ru as string | null,
  );
  return new Response(JSON.stringify(published), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
