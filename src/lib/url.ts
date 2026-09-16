/**
 * Prefix an internal path with the deployment base (`/ielts-website` on
 * GitHub Pages, `/` locally when base is unset). Always pass root-relative
 * paths like `/lessons/reading-task1` or `/pics/hero.png`.
 */
export function withBase(path: string): string {
  /* import.meta.env only exists under Astro/Vite. Plain Node (the test runner)
     has none, so fall back to no base instead of throwing: a data file that
     builds image URLs can then be imported straight into a node:test file. */
  const base = (import.meta.env?.BASE_URL ?? '').replace(/\/$/, '');
  if (!path.startsWith('/')) path = '/' + path;
  // trailingSlash: 'never' — the home route is the bare base path,
  // so '/' must not become '<base>/'.
  if (path === '/') return base || '/';
  return base + path;
}
