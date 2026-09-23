// @ts-check
/* The site config, plus one thing: a Vite dependency cache of its own.
 *
 * WHAT IT IS FOR
 * tests/browser/f22_unfinished_test_owner.py drives a dev server of its own.
 * Other dev servers run against this same checkout at the same time, and by
 * default they all share node_modules/.vite: each one's re-optimisation
 * invalidates the modules the others have already handed the browser, which
 * shows up as "504 Outdated Optimize Dep" and a test player that never
 * hydrates. astro.config.f21.mjs documents the same collision for f21 and
 * owns node_modules/.vite-f21; this is f22's own, so the two runs cannot
 * disturb each other either.
 *
 * Use it with:
 *
 *   npx astro dev --config astro.config.f22.mjs --port 4366
 *
 * It also stops this one dev server from WATCHING the evidence and test
 * folders. The dev server reloads every open page whenever any file in the
 * project changes, and a journey script writes its evidence file (and its
 * screenshots) into docs/ one row at a time, as does any other tester
 * running at the same moment. Observed on the first f22 run: each row
 * written reloaded the mock exam page part way through a paper, which reads
 * like a product failure and is not one. The site's own source is still
 * watched exactly as before.
 *
 * It changes nothing about the site itself: astro.config.mjs is the real
 * config and this spreads it unchanged.
 */
import base from './astro.config.mjs';

export default {
  ...base,
  vite: {
    ...(base.vite ?? {}),
    cacheDir: 'node_modules/.vite-f22',
    server: {
      ...(base.vite?.server ?? {}),
      watch: {
        ...(base.vite?.server?.watch ?? {}),
        ignored: ['**/docs/**', '**/tests/**', '**/.tmp/**', '**/graphify-out/**'],
      },
    },
  },
};
