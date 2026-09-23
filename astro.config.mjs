// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

/* A trial build (PUBLIC_ACCESS_MODE=trial) must not publish the practice
   papers in any public file. Several islands import src/data/tests (3.9 MB of
   passages, questions and answers) straight into the browser, so for the
   BROWSER bundle only that import is pointed at a titles-only list
   (src/lib/trial/tests-light.ts). The pages themselves still build from the
   real data on the server; the papers reach a student through the content
   gate. The open site is untouched: without the setting this does nothing. */
const env = { ...loadEnv(process.env.NODE_ENV === 'production' ? 'production' : 'development', process.cwd(), 'PUBLIC_'), ...process.env };
const TRIAL_BUILD = String(env.PUBLIC_ACCESS_MODE ?? '').trim().toLowerCase() === 'trial';
const LIGHT_TESTS = fileURLToPath(new URL('./src/lib/trial/tests-light.ts', import.meta.url));

function trialBrowserContent() {
  return {
    name: 'trial-browser-content',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!TRIAL_BUILD || options?.ssr || !importer) return null;
      if (!/data[\\/]tests(?:[\\/]index(?:\.ts)?)?$/.test(source)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved && /[\\/]src[\\/]data[\\/]tests[\\/]index\.ts$/.test(resolved.id)) return LIGHT_TESTS;
      return null;
    },
    /* The vocabulary review deck pulls every vocabulary LESSON into the
       browser to build its cards. Vocabulary is not in the trial, so a
       trial build's browser copy gets no lessons and falls back to the small
       words.ts deck the module already uses where lessons are unavailable. */
    transform(code, id, options) {
      if (!TRIAL_BUILD || options?.ssr || !/[\\/]src[\\/]lib[\\/]vocab-review\.ts$/.test(id.split('?')[0])) return null;
      const glob = /import\.meta\.glob<string>\('\.\.\/content\/lesson-bodies\/vocabulary-\*\.html',[\s\S]*?\}\)/;
      if (!glob.test(code)) this.error('trial build: the vocabulary deck no longer globs its lessons the expected way; update astro.config.mjs');
      return { code: code.replace(glob, '({} as Record<string, string>)'), map: null };
    },
  };
}

export default defineConfig({
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
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss(), trialBrowserContent()],
  },
});
