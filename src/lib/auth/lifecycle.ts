/* The one place an account becomes a data owner, on every page of the site.
 *
 * WHY THIS FILE EXISTS (finding 3 of the 23 September 2026 review)
 * Sign-in used to be wired up inside two navigation components: the avatar
 * menu in the workspace header (WorkspaceMenu.tsx) and the older account
 * widget in the marketing nav (AccountMenu.tsx). Both of them are chrome, and
 * the full-screen pages deliberately have no chrome: the test player, the
 * reading and listening drills and the mock exam render neither. So a student
 * who opened a drill from a saved link, or simply refreshed one mid-paper,
 * had a valid account session and nothing on the page that had ever told the
 * storage layer about it. Their answers were written into the shared
 * anonymous record on that device instead of into their own.
 *
 * WHAT REPLACES IT
 * One lifecycle, started from the base layout, so it runs on EVERY route,
 * chrome or no chrome, and the two menus read it instead of owning it.
 *
 * It has two halves, and the order matters:
 *
 *   1. WHOSE WORK IS THIS, answered synchronously and first. The owner comes
 *      straight from the session this browser is already holding
 *      (bootOwner in src/lib/store-owner.ts), so it is settled before any
 *      component has had a chance to load a draft, restore a sitting or
 *      write a single piece of evidence. Nothing here awaits anything, which
 *      is what makes "before" true rather than merely likely.
 *
 *   2. THE ACCOUNT ITSELF, wired a moment later. Subscribing to auth changes
 *      and starting the cloud sync needs the account client, and the
 *      full-screen player should not have to download it before it can paint.
 *      So that half is imported on demand. By the time it lands, the owner is
 *      already right; all this half adds is carrying the work to the account
 *      and reacting to a later sign-in or sign-out.
 *
 * WHAT IT IS NOT
 * It is not an authorisation. Step 1 decides which key on this machine a
 * student's own work is read from and written to, nothing more. Every upload
 * is still made with a live access token and checked against the current
 * owner as it goes out (src/lib/auth/sync.ts). Signed-out use is a perfectly
 * valid case and still records under this device's anonymous owner.
 */

import type { User } from '@supabase/supabase-js';
import type { CacheOwner } from '../learning/contracts/sync';
import { currentOwner } from '../store-owner';

/** What every surface that shows an account needs to know, and nothing else. */
export interface AccountState {
  /** The signed-in student, or null when nobody is. */
  user: User | null;
  /** False until the account has answered once on this page. A menu waits
      for it rather than flashing the signed-out state at a student who is
      signed in. */
  known: boolean;
  /** Bumped each time a sign-in has FINISHED: every store has moved to that
      student and the first reconciliation is done. Zero when nobody is
      signed in. The anonymous-work offer waits for this, because until it
      happens the device still answers for the previous owner. */
  settled: number;
}

const SIGNED_OUT: AccountState = { user: null, known: false, settled: 0 };

let state: AccountState = SIGNED_OUT;
const listeners = new Set<(state: AccountState) => void>();
let started = false;
let stopAuth: (() => void) | null = null;

function publish(next: Partial<AccountState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) {
    try {
      listener(state);
    } catch {
      /* A screen throwing must never break sign-in, sign-out or the owner. */
    }
  }
}

/* ── Step 1: whose work is this ──────────────────────────────────────────── */

/** The owner this page's work belongs to, resolved now and without waiting
    for anything.
 *
 * Call it from anything that is about to read a draft or write a piece of
 * evidence and cannot be sure the lifecycle has been started yet. It is
 * cheap (one look at this device's own storage, remembered afterwards) and
 * calling it twice does nothing the first call did not already do. */
export function ensureOwnerResolved(): CacheOwner {
  return currentOwner();
}

/** Run `use` with the settled owner.
 *
 * It runs straight away, because the owner is decided synchronously from
 * this device (see the header). The callback shape exists so a component
 * that mounts before the base layout's script has run still asks the
 * question rather than assuming the anonymous default, and so that this
 * stays true if resolving the owner ever does need to wait. */
export function whenOwnerReady(use: (owner: CacheOwner) => void): void {
  use(ensureOwnerResolved());
}

/** The same, for a caller that is already in an async function. */
export function ownerReady(): Promise<CacheOwner> {
  return Promise.resolve(ensureOwnerResolved());
}

/* ── Step 2: the account ─────────────────────────────────────────────────── */

/** Start the app-wide lifecycle. Safe to call from anywhere, any number of
    times: the base layout calls it on every page, and the two menus call it
    too so that an island which somehow hydrates first still starts it. */
export function startAccountLifecycle(): void {
  if (started) return;
  started = true;
  /* The owner FIRST, synchronously, before anything else in this function
     and before anything that awaits. */
  ensureOwnerResolved();
  void wireAccount();
}

async function wireAccount(): Promise<void> {
  let auth: typeof import('./session');
  let configured: boolean;
  let sync: typeof import('./sync');
  try {
    const [supabase, session, syncModule] = await Promise.all([
      import('./supabase'),
      import('./session'),
      import('./sync'),
    ]);
    configured = supabase.isAuthConfigured();
    auth = session;
    sync = syncModule;
  } catch {
    /* The account layer failing to load leaves a perfectly usable site: the
       owner is already settled and everything saves on this device. */
    publish({ known: true });
    return;
  }

  if (!configured) {
    /* No project wired up at all. There is no account to have, which is a
       known answer, not a pending one. */
    publish({ known: true });
    return;
  }

  stopAuth = auth.onAuthChange((user) => {
    if (!user) {
      sync.stopSync();
      publish({ user: null, known: true, settled: 0 });
      return;
    }
    publish({ user, known: true });
    void sync.startSyncForUser(user).then(() => {
      /* Only report a finished sign-in while it is still this student's.
         A sign-out or a switch during the sign-in leaves the offer unmade,
         which is the honest answer: nothing of theirs moved. */
      if (state.user?.id === user.id) publish({ settled: state.settled + 1 });
    });
  });
}

/** Subscribe to the account state. The listener is called immediately with
    what is known right now, then on every change. Returns an unsubscribe. */
export function onAccountChange(listener: (state: AccountState) => void): () => void {
  startAccountLifecycle();
  listeners.add(listener);
  try {
    listener(state);
  } catch {
    /* As above: a screen throwing is not the lifecycle's problem. */
  }
  return () => listeners.delete(listener);
}

/** What the lifecycle knows right now, for a caller that does not want a
    subscription. */
export function accountState(): AccountState {
  return state;
}

/** For tests only: forget that the lifecycle ever ran. Never called by a
    screen. */
export function resetAccountLifecycleForTest(): void {
  if (stopAuth) {
    try {
      stopAuth();
    } catch {
      /* Nothing to do: the subscription is being thrown away either way. */
    }
  }
  stopAuth = null;
  started = false;
  state = SIGNED_OUT;
  listeners.clear();
}
