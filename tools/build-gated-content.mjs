/* Collects the course content a trial build must NOT publish into one
 * private folder, for the content gate (workers/content-gate) to hand out
 * only to a student allowed to open it.
 *
 *   node --import ./tests/ts-extension-loader.mjs tools/build-gated-content.mjs [out-dir]
 *
 * Default out-dir: gated-content/ (git-ignored). In production that folder is
 * uploaded to a PRIVATE storage bucket the gate reads from (an R2 bucket bound
 * as CONTENT); locally the stand-in serves it from disk. Nothing in it is ever
 * copied into dist/, the public site.
 *
 * What goes in, key by key (the same keys the gate reads):
 *   lessons/en/<slug>.html        every lesson body, English
 *   lessons/ru/<slug>.html        every lesson body with a Russian translation
 *   tests/<id>.json               every practice paper and drill, whole, as the
 *                                 test player needs it (passages, transcripts,
 *                                 questions, answers, explanations)
 *   explanations/ru/<id>.json     the Russian answer explanations
 *   practice/<set id>.json        a Reading or Listening lesson's practice quiz
 *   data/tests/<id>.json          the compact paper Mr EZ reads (toSiteTest)
 *   data/lesson-blocks/<slug>.json  the lesson blocks Mr EZ reads
 *   manifest.json                 every key, for checking an upload
 *
 * Each item is shaped exactly as the open site's own endpoints shape it
 * (src/pages/data/..., src/pages/lesson-bodies/...), so the pages cannot tell
 * where it came from.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = resolve(REPO, 'gated-content');
/* The same rewrite the lesson pages apply (src/pages/lessons/**), with the
   GitHub Pages base spelled out because plain Node has no BASE_URL. */
const BASE = '/ielts-website';
const pics = (html) => html.replaceAll('../pics/', `${BASE}/pics/`);

export async function buildGatedContent(out = DEFAULT_OUT) {
  const OUT = resolve(out);
  const keys = [];
  const put = (key, content) => {
    const path = join(OUT, key);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    keys.push(key);
  };

  const { ALL_TESTS } = await import('../src/data/tests/index.ts');
  const { ALL_DRILLS, ALL_LISTENING_DRILLS } = await import('../src/lib/tests/drills.ts');
  const { toSiteTest } = await import('../src/lib/tutor/test-items.ts');
  const { publishLessonBlocks } = await import('../src/lib/learning/lesson-blocks.ts');

  // Lesson bodies, both languages.
  const bodies = resolve(REPO, 'src/content/lesson-bodies');
  const russian = new Map();
  if (existsSync(join(bodies, 'ru'))) {
    for (const file of readdirSync(join(bodies, 'ru'))) {
      if (file.endsWith('.html')) russian.set(file.replace(/\.html$/, ''), readFileSync(join(bodies, 'ru', file), 'utf8'));
    }
  }
  for (const file of readdirSync(bodies)) {
    const path = join(bodies, file);
    if (!file.endsWith('.html') || statSync(path).isDirectory()) continue;
    const slug = file.replace(/\.html$/, '');
    const english = readFileSync(path, 'utf8');
    put(`lessons/en/${slug}.html`, pics(english));
    const ru = russian.get(slug) ?? null;
    if (ru) put(`lessons/ru/${slug}.html`, pics(ru));
    put(`data/lesson-blocks/${slug}.json`, JSON.stringify(publishLessonBlocks(slug, english, ru)));
  }

  // Practice papers and drills, whole, plus Mr EZ's compact copy.
  for (const test of ALL_TESTS) {
    put(`tests/${test.id}.json`, JSON.stringify(test));
    put(`data/tests/${test.id}.json`, JSON.stringify(toSiteTest(test)));
  }
  for (const drill of [...ALL_DRILLS, ...ALL_LISTENING_DRILLS]) {
    put(`tests/${drill.id}.json`, JSON.stringify(drill.test));
  }

  // The practice quizzes inside the Reading and Listening lessons, opened
  // with their lesson (the gate's /practice/<set id>).
  const { READING_PRACTICE } = await import('../src/data/reading-practice.ts');
  const { LISTENING_PRACTICE } = await import('../src/data/listening-practice.ts');
  for (const [slug, set] of Object.entries(READING_PRACTICE)) put(`practice/practice-reading-${slug}.json`, JSON.stringify(set));
  for (const [slug, set] of Object.entries(LISTENING_PRACTICE)) put(`practice/practice-listening-${slug}.json`, JSON.stringify(set));

  // Russian answer explanations, published exactly as the open site does.
  const explained = resolve(REPO, 'src/data/tests/ru');
  if (existsSync(explained)) {
    for (const file of readdirSync(explained)) {
      if (!file.endsWith('.json')) continue;
      const id = file.replace(/\.json$/, '');
      const source = JSON.parse(readFileSync(join(explained, file), 'utf8'));
      const entries = {};
      for (const [key, value] of Object.entries(source.entries ?? {})) {
        if (value && typeof value.ru === 'string' && value.ru.trim() !== '') entries[key] = value.ru;
      }
      put(`explanations/ru/${id}.json`, JSON.stringify({ id, locale: 'ru', entries }));
    }
  }

  put('manifest.json', JSON.stringify({ keys: [...keys].sort() }, null, 1));
  return { out: OUT, keys: keys.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildGatedContent(process.argv[2] ? resolve(REPO, process.argv[2]) : DEFAULT_OUT);
  console.log(`wrote ${result.keys} items to ${result.out}`);
}
