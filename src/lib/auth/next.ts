/* Where a student is, and where to send them after signing in.

   The sign-in, sign-up and profile pages all take `?next=<route>`: a clean
   route without the site's base path, e.g. `/tests/mock` or
   `/trainers/writing?task=t2-01`. These helpers read the current one and
   turn a `next` back into an address, always through safeNext() in
   profile.ts, so a crafted link can never send a student to another site. */

import { withBase } from '../url';
import { toRoute } from '../platform-nav';
import { safeNext } from './profile';

/** The pages that only exist to get a student signed in. A `next` pointing
    at one of them would loop, so it falls back. (/profile is a fine
    destination: "Sign in first" on it sends the student back there.) */
const AUTH_ROUTES = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'];

/** The route the student is on right now, with its query string, ready to
    be passed as `next`. `/` outside a browser. */
export function currentRoute(): string {
  if (typeof window === 'undefined') return '/';
  const route = toRoute(window.location.pathname, import.meta.env?.BASE_URL ?? '/');
  return route + window.location.search;
}

/** The `next` a page was opened with, made safe. Auth pages themselves are
    never a destination. */
export function readNext(search?: string, fallback = '/dashboard'): string {
  const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const next = safeNext(new URLSearchParams(query).get('next'), fallback);
  const path = next.split(/[?#]/)[0] ?? next;
  return AUTH_ROUTES.some((r) => path === r || path.startsWith(`${r}/`)) ? fallback : next;
}

/** Whether the page was opened with a `next` at all. */
export function hasNext(search?: string): boolean {
  const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  return new URLSearchParams(query).has('next');
}

/** The full address for a route, base path included. */
export function hrefFor(route: string): string {
  return withBase(safeNext(route));
}

/** An absolute URL on this site from an address that already carries the
    base path (withBase, profileHref, ...), for links Supabase puts in emails
    and for the Google redirect, which must name the whole address. */
export function absoluteHref(href: string): string {
  if (typeof window === 'undefined') return href;
  return `${window.location.origin}${href}`;
}
