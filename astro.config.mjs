// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
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
  redirects: {
    '/tests/drills': '/ielts-website/trainers/reading',
    '/speaking/checker': '/ielts-website/trainers/speaking',
    '/writing/checker': '/ielts-website/trainers/writing',
  },
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
