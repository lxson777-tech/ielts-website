// @ts-check
/* The site config, plus one thing: a Vite dependency cache of its own.
 *
 * WHAT IT IS FOR
 * tests/browser/f21_direct_entry_owner.py drives a dev server of its own on
 * port 4356. Several dev servers were up against this same checkout at once
 * (4352 and 4354 belong to other runs), and by default they all share
 * node_modules/.vite: each one's re-optimisation invalidated the modules the
 * others had already handed the browser. That showed up as "504 Outdated
 * Optimize Dep", then "jsxDEV is not a function", and the test player simply
 * never hydrated, which reads like a product failure and is not one.
 *
 * Giving this one run its own cache removes the collision without deleting
 * anybody else's cache. Use it with:
 *
 *   npx astro dev --config astro.config.f21.mjs --port 4356
 *
 * It changes nothing about the site itself: astro.config.mjs is the real
 * config and this spreads it unchanged.
 */
import base from './astro.config.mjs';

export default {
  ...base,
  vite: {
    ...(base.vite ?? {}),
    cacheDir: 'node_modules/.vite-f21',
  },
};
