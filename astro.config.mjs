// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { readFileSync, cpSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { loadEnv } from 'vite';
import { trialLearningIndex } from './src/lib/trial/trim-index.ts';
import { stripLockedEntries, trialRussianDictionary } from './src/lib/trial/trim-dictionary.ts';

/* A trial build (PUBLIC_ACCESS_MODE=trial) must not publish the practice
   papers in any public file. Several islands import src/data/tests (3.9 MB of
   passages, questions and answers) straight into the browser, so for the
   BROWSER bundle only that import is pointed at a titles-only list
   (src/lib/trial/tests-light.ts). The pages themselves still build from the
   real data on the server; the papers reach a student through the content
   gate. The open site is untouched: without the setting this does nothing. */
const env = { ...loadEnv(process.env.NODE_ENV === 'production' ? 'production' : 'development', process.cwd(), 'PUBLIC_'), ...process.env };
const TRIAL_BUILD = String(env.PUBLIC_ACCESS_MODE ?? '').trim().toLowerCase() === 'trial';
const light = (path) => fileURLToPath(new URL(path, import.meta.url));

/* Every module whose content a trial build must not ship to the browser,
   with its stand-in (src/lib/trial/light/README.md), keyed by the real
   file's path under src/. Alex, 24 September 2026: lock the remaining study
   material too (model answers, questions, band guides, the writing coach). */
const TRIAL_SWAPS = new Map([
  ['data/tests/index.ts', light('./src/lib/trial/tests-light.ts')],
  ['data/model-answers.ts', light('./src/lib/trial/light/model-answers.ts')],
  ['data/writing-prompts-imported.ts', light('./src/lib/trial/light/writing-prompts-imported.ts')],
  ['data/writing-structures.ts', light('./src/lib/trial/light/writing-structures.ts')],
  ['data/writing-plans.ts', light('./src/lib/trial/light/writing-plans.ts')],
  ['data/band-guides.ts', light('./src/lib/trial/light/band-guides.ts')],
  ['lib/i18n/dict/ru/parts/band-guides.ts', light('./src/lib/trial/light/dict-part-empty.ts')],
  ['lib/i18n/dict/ru/parts/structures.ts', light('./src/lib/trial/light/dict-part-empty.ts')],
  ['data/speaking-prompts.ts', light('./src/lib/trial/light/speaking-prompts.ts')],
  ['data/cue-cards.ts', light('./src/lib/trial/light/cue-cards.ts')],
  ['data/speaking-structure-guides.ts', light('./src/lib/trial/light/speaking-structure-guides.ts')],
  ['data/focused-exercises.ts', light('./src/lib/trial/light/focused-exercises.ts')],
]);
/* The learning index is public on the open site; a trial build's browser
   gets the trimmed copy (src/lib/trial/trim-index.ts), made here from the
   real file so the untrimmed one never enters the bundle. */
const LEARNING_INDEX = light('./src/data/generated/learning-index.json');
const TRIAL_INDEX_ID = '\0trial-learning-index.json';
/* The Russian dictionary's entries are keyed by the English they translate,
   so a translation of locked material carries that material twice. A trial
   build's browser gets the dictionary without those entries
   (src/lib/trial/trim-dictionary.ts). */
const RU_DICTIONARY = light('./src/lib/i18n/dict/ru/index.ts');
const TRIAL_RU_ID = '\0trial-ru-dictionary.js';
const normalPath = (p) => p.replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase();
const samePath = (a, b) => normalPath(a) === normalPath(b);
/* A cheap look at the import text first, before asking Vite to resolve it:
   the last path segment of every swapped module. */
const SWAP_NAMES = new Set([
  'tests',
  'index',
  'model-answers',
  'writing-prompts-imported',
  'writing-structures',
  'writing-plans',
  'band-guides',
  'structures',
  'speaking-prompts',
  'cue-cards',
  'speaking-structure-guides',
  'focused-exercises',
  'learning-index.json',
]);

function trialBrowserContent() {
  return {
    name: 'trial-browser-content',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!TRIAL_BUILD || options?.ssr || !importer) return null;
      const last = source.split(/[\\/]/).pop()?.replace(/\.ts$/, '') ?? '';
      if (!SWAP_NAMES.has(last)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      const file = resolved.id.split('?')[0];
      // `?raw` imports (the published file's endpoint, on the server) are left alone.
      if (samePath(file, LEARNING_INDEX)) return resolved.id.includes('?') ? null : TRIAL_INDEX_ID;
      if (samePath(file, RU_DICTIONARY)) return TRIAL_RU_ID;
      const under = /[\\/]src[\\/](.+)$/.exec(file);
      return (under && TRIAL_SWAPS.get(under[1].replaceAll('\\', '/'))) ?? null;
    },
    load(id) {
      if (id === TRIAL_RU_ID) {
        const { strings, plurals } = trialRussianDictionary();
        return `export const BATCHES = [];\nexport const strings = ${JSON.stringify(strings)};\nexport const plurals = ${JSON.stringify(plurals)};\n`;
      }
      if (id !== TRIAL_INDEX_ID) return null;
      // Plain JSON: the id ends in .json, so Vite's own JSON step turns it into a module.
      return JSON.stringify(trialLearningIndex(JSON.parse(readFileSync(LEARNING_INDEX, 'utf8'))));
    },
    /* The vocabulary review deck pulls every vocabulary LESSON into the
       browser to build its cards. Vocabulary is not in the trial, so a
       trial build's browser copy gets no lessons and falls back to the small
       words.ts deck the module already uses where lessons are unavailable. */
    transform(code, id, options) {
      if (!TRIAL_BUILD || options?.ssr) return null;
      /* The study plan's own Russian (src/lib/learning/ru.ts) translates
         focused-exercise objectives next to its functions: those entries go,
         the module stays (src/lib/trial/trim-dictionary.ts). */
      if (/[\\/]src[\\/]lib[\\/]learning[\\/]ru\.ts$/.test(id.split('?')[0])) {
        const { code: trimmed, removed } = stripLockedEntries(code);
        if (removed === 0) this.error('trial build: src/lib/learning/ru.ts no longer holds its translations the expected way; update src/lib/trial/trim-dictionary.ts');
        return { code: trimmed, map: null };
      }
      if (!/[\\/]src[\\/]lib[\\/]vocab-review\.ts$/.test(id.split('?')[0])) return null;
      const glob = /import\.meta\.glob<string>\('\.\.\/content\/lesson-bodies\/vocabulary-\*\.html',[\s\S]*?\}\)/;
      if (!glob.test(code)) this.error('trial build: the vocabulary deck no longer globs its lessons the expected way; update astro.config.mjs');
      return { code: code.replace(glob, '({} as Record<string, string>)'), map: null };
    },
  };
}

/* A trial build publishes the site's public files EXCEPT the listening
   recordings (served by the content gate through signed links) and the
   Task 1 chart images (the questions they illustrate are locked too). Astro
   always copies its whole public folder, so a trial build is pointed at a
   copy without those: made in the system's temporary folder (never inside
   the project), refreshed on every trial build. It only ever copies; nothing
   is deleted. A file in that copy which public/ no longer has stops the
   build with the folder to clear by hand, rather than being published. */
const PUBLIC_DIR = light('./public');
const TRIAL_UNPUBLISHED = [light('./public/audio/listening'), light('./public/pics/writing/imported')];
const isUnpublished = (path) =>
  TRIAL_UNPUBLISHED.some((locked) => normalPath(path) === normalPath(locked) || normalPath(path).startsWith(`${normalPath(locked)}/`));

function trialPublicDir() {
  // One folder per checkout, so two working copies never share it.
  const out = join(tmpdir(), `ielts-trial-public-${createHash('sha256').update(PUBLIC_DIR).digest('hex').slice(0, 10)}`);
  cpSync(PUBLIC_DIR, out, { recursive: true, force: true, filter: (source) => !isUnpublished(source) });
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else {
        const original = join(PUBLIC_DIR, relative(out, path));
        if (!existsSync(original) || isUnpublished(original)) {
          throw new Error(`trial build: ${path} is not in public/ any more, or must not be published. Delete the folder ${out} by hand and build again.`);
        }
      }
    }
  };
  walk(out);
  return out;
}

export default defineConfig({
  publicDir: TRIAL_BUILD ? trialPublicDir() : undefined,
  devToolbar: { enabled: false },
  site: 'https://lxson777-tech.github.io',
  base: '/ielts-website',
  trailingSlash: 'never',
  build: {
    // Emit lessons/reading-task1.html instead of lessons/reading-task1/index.html
    // so all pre-migration URLs keep resolving on GitHub Pages.
    format: 'file',
  },
  // The trainers (drills/checkers) moved under /trainers — keep the old,
  // already-indexed URLs resolving instead of 404ing. Targets need the
  // `base` prefix spelled out by hand: Astro's static redirect targets are
  // emitted verbatim, not run back through the `base` config.
  //
  // The per-drill redirect (old /tests/drills/[id] -> new /trainers/reading/[id])
  // is NOT listed here — Astro's redirects-with-params needs a live dynamic
  // route backing the OLD path to enumerate params, which no longer exists
  // now that the page moved. That one's handled by a small standalone
  // redirect page at src/pages/tests/drills/[id].astro instead.
  // /writing/checker is a REAL page again (src/pages/writing/checker.astro),
  // not a redirect: the checker is the exam-conditions counterpart to the
  // coached trainer, so pointing it at /trainers/writing handed students the
  // coach panel on the one surface that must not have it.
  // /speaking/checker keeps redirecting, but to the bare mock interview
  // rather than the coached Speaking Trainer, for the same reason.
  redirects: {
    // The public homepage is not published yet: the site opens straight into
    // the student workspace (the AI Tutor screen).
    '/': '/ielts-website/dashboard',
    '/tests/drills': '/ielts-website/trainers/reading',
    '/speaking/checker': '/ielts-website/speaking/examiner',
  },
  // The owner-only admin page is never advertised to search engines.
  integrations: [react(), sitemap({ filter: (page) => !/\/admin\/?$/.test(page) })],
  vite: {
    plugins: [tailwindcss(), trialBrowserContent()],
  },
});
