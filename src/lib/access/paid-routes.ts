/* Which pages of the platform are paid, and which paid feature each one is
   (the free-account model, docs/paid-access/FREE-ACCOUNT-MODEL.md).

   PURE: no browser, no network. Used in the GATED build by the click guard
   (./paid-guard.ts), which opens the upgrade pop-up instead of following a
   link to one of these pages for an account without practice and guidance,
   and by the locked page a direct visit shows. Nothing here is an access
   control: the content gate and the Workers refuse for themselves.

   A route is the clean path without the site's base, e.g. '/tests/mock'.
   Lessons, the course, the library, the vocabulary topic lists, results,
   account and plans are deliberately absent: they are free. */

import type { PaidFeature } from './model';

/** Exact pages. */
const EXACT: Readonly<Record<string, PaidFeature>> = {
  '/tests/mock': 'mock',
  '/placement': 'placement',
  '/writing/checker': 'essay',
  '/writing/models': 'model-answers',
  '/trainers/writing': 'trainer',
  '/trainers/speaking': 'trainer',
  '/trainers/reading': 'drill',
  '/trainers/listening': 'drill',
  '/speaking/examiner': 'live',
  '/speaking/recorded': 'speaking',
  '/speaking/cue-cards': 'cue-cards',
  '/learn/bands': 'band-guide',
};

/** Families of pages: the first prefix that matches wins. */
const PREFIX: readonly [string, PaidFeature][] = [
  ['/tests/drills/', 'drill'],
  ['/tests/', 'test'],
  ['/trainers/reading/', 'drill'],
  ['/trainers/listening/', 'drill'],
  ['/trainers/focused/', 'focused'],
  ['/trainers/speaking-focus/', 'focused'],
];

/** The clean route of a path that may carry the base, a trailing slash, a
    `.html` suffix, a query or a hash. */
export function cleanRoute(path: string, base = '/'): string {
  let route = path.split('#')[0]!.split('?')[0]!;
  const prefix = base.replace(/\/+$/, '');
  if (prefix && (route === prefix || route.startsWith(`${prefix}/`))) route = route.slice(prefix.length);
  route = route.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (route.length > 1) route = route.replace(/\/+$/, '');
  return route || '/';
}

/** The paid feature a route belongs to, or null for a free page. */
export function paidFeatureForRoute(route: string): PaidFeature | null {
  const exact = EXACT[route];
  if (exact) return exact;
  for (const [prefix, feature] of PREFIX) {
    if (route.startsWith(prefix) && route.length > prefix.length) return feature;
  }
  return null;
}

/** Every exact paid page, for tests and for the browser proof. */
export const PAID_ROUTES: readonly string[] = Object.keys(EXACT);
