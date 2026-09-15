/* The workspace navigation model, shared by the slim header (desktop tabs),
   the phone bottom bar and the avatar menu, so all three stay in step.

   Five tabs only. Everything else a student might reach from the workspace
   lives in the avatar menu (WORKSPACE_MENU) or as a card on the dashboard.
   That split is the whole point of the 2026-09 shell: one row of five
   destinations you use every day, one quiet drawer for the rest. */

export interface WorkspaceTab {
  href: string;
  label: string;
  /** Extra route prefixes that should light this tab up. */
  also?: string[];
  /** Key into the icon set rendered in WorkspaceHeader.astro. */
  icon: 'today' | 'course' | 'practice' | 'tests' | 'words';
}

export const WORKSPACE_TABS: WorkspaceTab[] = [
  { href: '/dashboard', label: 'Today', also: ['/report'], icon: 'today' },
  { href: '/start', label: 'Course', also: ['/learn', '/lessons'], icon: 'course' },
  { href: '/trainers', label: 'Practice', also: ['/writing', '/speaking'], icon: 'practice' },
  { href: '/tests', label: 'Tests', icon: 'tests' },
  { href: '/review', label: 'Vocabulary', icon: 'words' },
];

export interface WorkspaceMenuItem {
  href: string;
  label: string;
}

/** The avatar menu, grouped. Auth actions are appended by the island itself. */
export const WORKSPACE_MENU: WorkspaceMenuItem[][] = [
  [
    { href: '/account', label: 'Account' },
    { href: '/account#saved', label: 'Saved and notes' },
    { href: '/report', label: 'Progress report' },
  ],
  [
    { href: '/learn', label: 'Lessons library' },
    { href: '/speaking/cue-cards', label: 'Cue cards' },
  ],
];

/** Route prefixes that get the workspace shell instead of the marketing nav. */
export const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/start',
  '/learn',
  '/lessons',
  '/trainers',
  '/tests',
  '/speaking',
  '/writing',
  '/account',
  '/review',
  '/report',
];

/** Routes whose content genuinely needs the wider 1100px column: a two-pane
    library, or a row of cards that turns cramped at 880px. Matched exactly,
    not by prefix, so a single lesson or drill page inside one of these
    sections still gets the calmer reading width. */
export const WIDE_ROUTES = ['/trainers', '/tests', '/learn', '/account', '/writing/models'];

function matches(prefix: string, route: string): boolean {
  return route === prefix || route.startsWith(`${prefix}/`);
}

/** Strip the GitHub Pages base path off a pathname, giving a clean route. */
export function toRoute(pathname: string, base: string): string {
  const trimmedBase = base.replace(/\/$/, '');
  const route = trimmedBase && pathname.startsWith(trimmedBase) ? pathname.slice(trimmedBase.length) : pathname;
  return route.replace(/\/$/, '') || '/';
}

export function isAppRoute(route: string): boolean {
  return APP_ROUTE_PREFIXES.some((prefix) => matches(prefix, route));
}

export function isWideRoute(route: string): boolean {
  return WIDE_ROUTES.includes(route);
}

/** Whether `tab` is the tab for `route` (a base-stripped pathname). */
export function isTabActive(tab: WorkspaceTab, route: string): boolean {
  return [tab.href, ...(tab.also ?? [])].some((prefix) => matches(prefix, route));
}
