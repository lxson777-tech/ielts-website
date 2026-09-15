/**
 * Prefix an internal path with the deployment base. The site is served from
 * the root of ieltsisez.com today (base unset, so this is a no-op), but keep
 * using it so the site still works if it is ever hosted below a path again.
 * Always pass root-relative
 * paths like `/lessons/reading-task1` or `/pics/hero.png`.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!path.startsWith('/')) path = '/' + path;
  // trailingSlash: 'never' — the home route is the bare base path,
  // so '/' must not become '<base>/'.
  if (path === '/') return base || '/';
  return base + path;
}
