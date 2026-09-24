/* The profile gate: a signed-in student with no complete profile is sent to
   /profile before using the course, once, and then brought back.

   Decided by Alex on 24 September 2026: every student gives their name,
   date of birth, phone and the rest (src/lib/auth/profile.ts) so the course
   can call them by name. New accounts meet the form straight after signing
   up; existing students meet it the next time they open the site. This is
   the "next time they open the site" half, started on every page by
   src/components/AccountLifecycle.astro.

   WHAT IT NEVER DOES
   - It never touches whose work is on this device. It only reads the
     account state the lifecycle publishes (src/lib/auth/lifecycle.ts) and
     the profile; the owner is decided in src/lib/store-owner.ts alone.
   - It never redirects on a guess. `loadProfile` answering `undefined`
     means the server could not be asked (offline, table not deployed yet),
     and that is not "missing": the student carries on.
   - It never interrupts a paper. A page where a timed test is running marks
     <body data-exam-running="true"> (TestPlayer, MockExam, WritingTester and
     the focused exercises all do), and the full-screen pages (the test
     player, the drills, the mock exam) carry <body data-bare="true"> from
     BaseLayout. On either, the gate stays quiet: a student who opened a
     paper from a saved link meets the form on the next ordinary page
     instead. The bare-page rule is there because the gate can answer
     before the player has hydrated and set its own mark, and a sitting
     restored on reload is exactly the case that must not be lost.
   - It never loops: the profile, sign-in, sign-up and password pages are
     exempt (PROFILE_EXEMPT_ROUTES), and so is the owner's /admin page. It
     redirects at most once per page.

   The account half (the profile module and the Supabase client under it) is
   imported only once a student is known to be signed in, so a signed-out
   visit to a full-screen paper downloads nothing extra. */

import type { AccountState } from './lifecycle';
import { toRoute } from '../platform-nav';

type ProfileModule = Pick<
  typeof import('./profile'),
  'cachedProfile' | 'loadProfile' | 'isProfileComplete' | 'profileHref' | 'PROFILE_EXEMPT_ROUTES'
>;

export interface ProfileGateDeps {
  /** The lifecycle's subscription (lifecycle.ts onAccountChange). */
  onAccountChange: (listener: (state: AccountState) => void) => () => void;
  /** The profile module, loaded on demand. */
  loadProfileModule: () => Promise<ProfileModule>;
  /** The route the student is on, base path stripped, query kept. */
  route: () => string;
  /** True while nothing may take the student off this page. */
  mustStay: () => boolean;
  /** Leave for the profile page. */
  navigate: (href: string) => void;
  /** Called on every client-side page change (Astro's view transitions keep
      this module alive across them). Returns an unsubscribe. */
  onPageChange: (callback: () => void) => () => void;
}

/** Routes the gate leaves alone besides PROFILE_EXEMPT_ROUTES: the owner's
    admin panel, which has its own lock and nothing to do with studying. */
const ALSO_EXEMPT = ['/admin'];

function pathOf(route: string): string {
  return route.split(/[?#]/)[0] || '/';
}

function isExempt(path: string, exempt: readonly string[]): boolean {
  return [...exempt, ...ALSO_EXEMPT].some((r) => path === r || path.startsWith(`${r}/`));
}

function browserDeps(): ProfileGateDeps {
  return {
    onAccountChange: () => () => {},
    loadProfileModule: () => import('./profile'),
    route: () =>
      toRoute(window.location.pathname, (import.meta.env?.BASE_URL as string | undefined) ?? '/') +
      window.location.search,
    mustStay: () => {
      const body = typeof document !== 'undefined' ? document.body : null;
      if (!body) return true;
      return body.dataset.examRunning === 'true' || body.dataset.bare === 'true';
    },
    navigate: (href) => window.location.replace(href),
    onPageChange: (callback) => {
      document.addEventListener('astro:page-load', callback);
      return () => document.removeEventListener('astro:page-load', callback);
    },
  };
}

let stopGate: (() => void) | null = null;

/** Start the gate. Idempotent: the base layout calls it on every page and
    the module survives a client-side navigation. Returns a stop function
    (used by tests). `deps` replaces the browser's pieces in a test. */
export function startProfileGate(deps: Partial<ProfileGateDeps> & Pick<ProfileGateDeps, 'onAccountChange'>): () => void {
  if (stopGate) return stopGate;
  const d: ProfileGateDeps = { ...browserDeps(), ...deps };

  /** Bumped whenever the page changes, so an answer that arrives after the
      student has moved on is dropped, and the once-per-page limit resets. */
  let page = 0;
  let pageRoute = d.route();
  let redirectedOnPage = -1;
  /** "<page>:<user id>" already checked, so the lifecycle re-announcing the
      same student (a finished sync, a token refresh) asks nothing twice. */
  let checked = '';
  let latest: AccountState | null = null;

  async function check(state: AccountState): Promise<void> {
    if (!state.known || !state.user) return;
    const userId = state.user.id;
    const myPage = page;
    const key = `${myPage}:${userId}`;
    if (checked === key || redirectedOnPage === myPage) return;
    checked = key;

    let profile: ProfileModule;
    try {
      profile = await d.loadProfileModule();
    } catch {
      return; // The account layer failed to load: nothing to decide with.
    }
    const stillHere = () =>
      page === myPage && latest?.user?.id === userId && redirectedOnPage !== myPage;
    const allowed = () => {
      const route = d.route();
      return !isExempt(pathOf(route), profile.PROFILE_EXEMPT_ROUTES) && !d.mustStay();
    };
    const redirect = () => {
      if (!stillHere() || !allowed()) return;
      redirectedOnPage = myPage;
      d.navigate(profile.profileHref(d.route()));
    };

    if (!allowed()) return;

    if (profile.isProfileComplete(profile.cachedProfile(userId))) {
      /* This browser has seen a complete profile for this student: no wait.
         Ask the server anyway, so the cache stays honest and a profile that
         is gone (or no longer complete) is still caught on this page. */
      const fresh = await profile.loadProfile(userId);
      if (fresh === undefined) return;
      if (!profile.isProfileComplete(fresh)) redirect();
      return;
    }

    const fresh = await profile.loadProfile(userId);
    if (fresh === undefined) return; // Could not ask. Never treated as missing.
    if (profile.isProfileComplete(fresh)) return;
    redirect();
  }

  const stopAccount = d.onAccountChange((state) => {
    latest = state;
    void check(state);
  });
  const stopPage = d.onPageChange(() => {
    const route = d.route();
    if (route === pageRoute) return; // The first load's own event, or no real change.
    pageRoute = route;
    page += 1;
    if (latest) void check(latest);
  });

  stopGate = () => {
    stopAccount();
    stopPage();
    stopGate = null;
  };
  return stopGate;
}
