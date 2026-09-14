/* The seven "study space" destinations, shared between the desktop
   PlatformRail (hidden below 920px) and the mobile hamburger menu in Nav.astro,
   so a phone visitor has the same one-tap navigation a desktop visitor gets
   from the rail. Single source of list + active-state logic: edit here, both
   surfaces update. */

export interface PlatformNavItem {
  href: string;
  label: string;
  icon: string;
}

export const PLATFORM_NAV_ITEMS: PlatformNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home' },
  { href: '/start', label: 'My course', icon: 'course' },
  { href: '/learn', label: 'Lessons', icon: 'book' },
  { href: '/review', label: 'Vocabulary', icon: 'cards' },
  { href: '/trainers', label: 'Trainers', icon: 'target' },
  { href: '/tests', label: 'Mock tests', icon: 'check' },
  { href: '/speaking/examiner', label: 'AI speaking', icon: 'voice' },
  { href: '/account', label: 'Account', icon: 'user' },
];

/** Whether `href` is the current page. `current` and `withBasePath` should be
    Astro.url.pathname and the already-withBase()'d path respectively. */
export function isPlatformNavActive(href: string, current: string, withBasePath: (h: string) => string): boolean {
  const path = withBasePath(href);
  if (href === '/learn' && current.startsWith(withBasePath('/lessons'))) return true;
  return current === path || current.startsWith(`${path}/`);
}
