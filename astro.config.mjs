// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // The site lives at the root of its own domain (no `base`). The old
  // GitHub Pages address, lxson777-tech.github.io/ielts-website, is redirected
  // here by GitHub once the custom domain is attached in the repo settings.
  site: 'https://ieltsisez.com',
  trailingSlash: 'never',
  build: {
    // Emit lessons/reading-task1.html instead of lessons/reading-task1/index.html
    // so all pre-migration URLs keep resolving on GitHub Pages.
    format: 'file',
  },
  // The trainers (drills/checkers) moved under /trainers — keep the old,
  // already-indexed URLs resolving instead of 404ing. Astro emits static
  // redirect targets verbatim (they are not run through `base`), so if the
  // site ever moves below a base path again these need that prefix by hand.
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
    '/': '/dashboard',
    '/tests/drills': '/trainers/reading',
    '/speaking/checker': '/speaking/examiner',
  },
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
