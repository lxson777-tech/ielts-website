/* The workspace navigation model, shared by the slim header (desktop tabs),
   the phone bottom bar and the avatar menu, so all three stay in step.

   Five tabs only. Everything else a student might reach from the workspace
   lives in the avatar menu (WORKSPACE_MENU) or as a card on the dashboard.
   That split is the whole point of the 2026-09 shell: one row of five
   destinations you use every day, one quiet drawer for the rest. */

import { nt } from './i18n/translate';

export interface WorkspaceTab {
  href: string;
  label: string;
  /** Extra route prefixes that should light this tab up. */
  also?: string[];
  /** Key into the icon set rendered in WorkspaceHeader.astro. */
  icon: 'today' | 'course' | 'practice' | 'tests' | 'words';
}

/* Labels are wrapped in nt() — "mark for translation", gettext's N_(). They
   stay plain English data here (the header renders them, not this file), but
   the wrapper is what the i18n coverage test extracts, so a missing Russian
   tab label fails the test instead of silently shipping. */
export const WORKSPACE_TABS: WorkspaceTab[] = [
  { href: '/dashboard', label: nt('Today'), also: ['/report', '/plan-settings'], icon: 'today' },
  { href: '/start', label: nt('Course'), also: ['/learn', '/lessons'], icon: 'course' },
  { href: '/trainers', label: nt('Practice'), also: ['/writing', '/speaking'], icon: 'practice' },
  { href: '/tests', label: nt('Tests'), icon: 'tests' },
  { href: '/review', label: nt('Vocabulary'), icon: 'words' },
];

export interface WorkspaceMenuItem {
  href: string;
  label: string;
}

/** The avatar menu, grouped. Auth actions are appended by the island itself. */
export const WORKSPACE_MENU: WorkspaceMenuItem[][] = [
  [
    { href: '/account', label: nt('Account') },
    { href: '/profile', label: nt('My details') },
    { href: '/plan-settings', label: nt('Study plan settings') },
    { href: '/account#saved', label: nt('Saved and notes') },
    { href: '/report', label: nt('Progress report') },
  ],
  [
    { href: '/learn', label: nt('Lessons library') },
    { href: '/learn/bands', label: nt('What each band needs') },
    { href: '/writing/models', label: nt('Model answers') },
    { href: '/speaking/cue-cards', label: nt('Cue cards') },
  ],
];

/** Route prefixes that get the workspace shell instead of the marketing nav. */
export const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/plan-settings',
  '/start',
  '/learn',
  '/lessons',
  '/trainers',
  '/tests',
  '/speaking',
  '/writing',
  '/account',
  '/admin',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/profile',
  '/review',
  '/report',
  '/reset-password',
];

/** Routes whose content genuinely needs the wider 1100px column: a two-pane
    library, or a row of cards that turns cramped at 880px. Matched exactly,
    not by prefix, so a single lesson or drill page inside one of these
    sections still gets the calmer reading width. */
export const WIDE_ROUTES = ['/trainers', '/tests', '/learn', '/account', '/writing/models', '/admin'];

function matches(prefix: string, route: string): boolean {
  return route === prefix || route.startsWith(`${prefix}/`);
}

/** Strip the GitHub Pages base path off a pathname, giving a clean route. */
export function toRoute(pathname: string, base: string): string {
  const trimmedBase = base.replace(/\/$/, '');
  const route = trimmedBase && pathname.startsWith(trimmedBase) ? pathname.slice(trimmedBase.length) : pathname;
  // Static builds use `build.format: 'file'`, so at build time the pathname
  // is "/dashboard.html" (and "/index.html" for the root), not "/dashboard".
  // Strip both so the shell decision matches what the browser will show.
  return route.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/\/$/, '') || '/';
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
