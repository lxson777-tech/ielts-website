/* Who the work on this device belongs to, decided in ONE place.
 *
 * WHY THIS FILE EXISTS
 * The learning build gave its new stores a key that names their owner
 * (src/lib/learning/store.browser.ts). The four older stores, the ones that
 * hold a student's real history, did not have one:
 *
 *     ielts.progress.v1    attempts, essays and their marked reports,
 *                          speaking results, the day-by-day activity log
 *     ielts.studyplan.v1   the target band, the exam date, minutes a day
 *     ielts.vocab.v1       the spaced vocabulary state
 *     ielts.notes.v1       saved lessons and per-lesson notes
 *
 * They were one shared pile with nobody's name on them, so signing in as a
 * second student on the same browser folded the first student's essays and
 * goal into the second account and uploaded them under the second account's
 * id. That is finding 1 of the 22 September 2026 review, and this module is
 * the root-cause fix: every one of those stores now asks HERE whose copy it
 * should read and write, and gets the same answer the learner record gets.
 *
 * THE THREE RULES
 *
 *   1. ONE OWNER AT A TIME. `currentOwner()` is the signed-in student, or
 *      this browser's anonymous device owner when nobody is signed in. It is
 *      set at the very top of sign-in and reset on sign-out, BEFORE anything
 *      reads, merges, migrates or uploads.
 *
 *   2. THE OLD DEVICE-WIDE KEYS MOVE ONCE AND ARE NEVER DELETED. A browser
 *      that was used before this build still has `ielts.progress.v1` sitting
 *      there with somebody's work in it. Whose? The answer is written on the
 *      device already: LEGACY_MIGRATION_OWNER_KEY, stamped by the learner
 *      record when it first migrated those stores. If it names a signed-in
 *      owner, the old keys are that owner's and move to that owner's scoped
 *      key. If it says anonymous, or there is no stamp at all, they are the
 *      anonymous device owner's work, and a signed-in student gets them only
 *      by claiming them on purpose. A DIFFERENT signed-in user never
 *      inherits them. The original key keeps its value for good: copying is
 *      cheap, and deleting a student's history to tidy up is not a trade
 *      this codebase makes.
 *
 *   3. SERVER RENDER AND BLOCKED STORAGE CHANGE NOTHING. Everything here
 *      resolves storage lazily, inside a function, behind a typeof check, and
 *      every read and write is wrapped. With no storage there is no move and
 *      no stamp, and the caller still gets a well-formed key back so its own
 *      quota fallbacks behave exactly as they did.
 *
 * DELIBERATELY TINY
 * `src/lib/progress.ts` is imported for its types by files the Mr EZ Worker
 * bundles, so this module it now depends on carries no catalogue, no React,
 * no data: types and a handful of string constants, and nothing that runs at
 * import time except four empty registries. The one thing it reads from the
 * build is the account project's two public settings, and only to know which
 * stored session is this application's own (see WHICH SESSION, EXACTLY).
 */

import type { CacheOwner } from './learning/contracts/sync';
import {
  ANONYMOUS_NAMESPACE_PREFIX,
  CACHE_NAMESPACE_SEPARATOR,
  DEVICE_ID_KEY,
  LEGACY_ADOPTION_KEY,
  LEGACY_MIGRATION_OWNER_KEY,
  USER_NAMESPACE_PREFIX,
} from './learning/contracts/sync';

/* ── The little bit of the browser this file needs ───────────────────────── */

/** The three methods of a Storage object, and nothing else. Taking it as an
    interface is what lets a test hand in a few lines of memory instead of
    reaching for a global. */
export interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** This device's own store, or null when there is not one: a server render,
    the Astro build, a browser with storage switched off. Never throws. */
export function deviceStorage(): BrowserStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    /* Reading the property itself throws when storage is blocked by policy. */
    return null;
  }
}

export function safeGet(storage: BrowserStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** True when the value landed. False is never fatal anywhere in this file:
    the worst case is that the one-time move happens on a later visit. */
export function safeSet(storage: BrowserStorage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(storage: BrowserStorage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* Nothing to do: the key stays, and it is namespaced, so it is inert. */
  }
}

/* ── Owners ──────────────────────────────────────────────────────────────── */

/** The id an anonymous record falls back to when there is nowhere to keep a
    generated one. It is stable, so a session with no storage still has a
    consistent owner in memory, and it never reaches storage. */
export const FALLBACK_DEVICE_ID = 'this-device';

export function userOwner(userId: string): CacheOwner {
  return { kind: 'user', userId };
}

export function anonymousOwner(deviceId: string): CacheOwner {
  return { kind: 'anonymous', deviceId };
}

/** 'u:<userId>' or 'anon:<deviceId>'. One string per owner, used as the key
    suffix and as the owner's name in the device-level stamps. */
export function ownerNamespace(owner: CacheOwner): string {
  return owner.kind === 'user'
    ? `${USER_NAMESPACE_PREFIX}${owner.userId}`
    : `${ANONYMOUS_NAMESPACE_PREFIX}${owner.deviceId}`;
}

export function sameOwner(a: CacheOwner | null, b: CacheOwner | null): boolean {
  if (!a || !b) return false;
  return ownerNamespace(a) === ownerNamespace(b);
}

function freshDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** This browser's anonymous id, made once and kept. It identifies a device,
    never a person: it is only ever used to find the work done signed out on
    this machine. */
export function deviceIdFrom(storage: BrowserStorage | null): string {
  if (!storage) return FALLBACK_DEVICE_ID;
  const held = safeGet(storage, DEVICE_ID_KEY);
  if (held && held.length > 0) return held;
  const fresh = freshDeviceId();
  if (!safeSet(storage, DEVICE_ID_KEY, fresh)) return FALLBACK_DEVICE_ID;
  return fresh;
}

/* ── Who this browser is already signed in as ────────────────────────────── */

/* WHY THIS MODULE LOOKS AT THE ACCOUNT SESSION AT ALL
 * (finding 3 of the 23 September 2026 review.)
 *
 * The owner used to start as the anonymous device owner and only became the
 * signed-in student once a navigation component mounted and ran sign-in. The
 * full-screen test player, the reading and listening drills and the mock exam
 * mount neither of those components, so a hard load or a refresh of one of
 * them had a perfectly valid account session and an anonymous data owner: a
 * signed-in student's drill was written into the shared anonymous record.
 *
 * The owner is now answered from this device's own session on the FIRST read,
 * so there is no page, and no mount order, in which a store can be reached
 * before the answer exists.
 *
 * THIS IS A NAMESPACE, NOT AN AUTHORISATION. It decides which key on this
 * machine a student's own work is read from and written to, and nothing else.
 * Nothing is uploaded on the strength of it: every upload is made with a live
 * access token and is checked against the current owner as it goes out
 * (src/lib/auth/sync.ts). If the held session turns out to be finished, the
 * account layer reports nobody signed in, the owner goes back to the
 * anonymous device owner, and anything written in between stays under that
 * student's own id, where their next sign-in finds it. Nothing is lost and
 * nobody else can read it.
 */

/* WHICH SESSION, EXACTLY (finding R2-04 of the second Codex inspection)
 *
 * This used to take the first `sb-<anything>-auth-token` key it found. A
 * browser's storage is shared by every page on one origin, and on GitHub
 * Pages that origin is shared by every application its owner publishes, so a
 * session belonging to a DIFFERENT Supabase project could decide whose work
 * this site was showing, restore that stranger's sitting, and take new work
 * under their id before the real account layer had answered. With accounts
 * not configured here at all, nothing ever corrected it.
 *
 * So the key is now the one THIS application's account client uses, derived
 * from the same public setting the client is built from, and nothing else is
 * read. No configured project means no account, which means anonymous, however
 * many other projects' sessions happen to be sitting in the same storage. */

/** The project reference in an account project address, exactly as the
    account client derives it: the first label of the host name, so
    `https://abcd1234.supabase.co` gives `abcd1234`. Null for anything that is
    not an http or https address. Pure, so a test can hand in any address. */
export function authProjectRef(url: string | null | undefined): string | null {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null;
  try {
    const ref = new URL(trimmed).hostname.split('.')[0];
    return ref ? ref : null;
  } catch {
    return null;
  }
}

/** The storage key the account client keeps its session under for the project
    at `url`: `sb-<project ref>-auth-token`. src/lib/auth/supabase.ts hands
    this same value to the client as its storage key, so the two cannot
    drift apart. */
export function authSessionKeyFor(url: string | null | undefined): string | null {
  const ref = authProjectRef(url);
  return ref ? `sb-${ref}-auth-token` : null;
}

/** This application's own session key, or null when accounts are not
    configured here (either public setting missing, the same test
    src/lib/auth/supabase.ts uses). Read from the build's public settings
    directly rather than from the account client, so answering it costs no
    client, no network and no download. */
export function configuredAuthSessionKey(): string | null {
  const url = import.meta.env?.PUBLIC_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  return authSessionKeyFor(url);
}

/** The user id in THIS application's account session on this browser, or
    null when it holds none, when accounts are not configured here, and on a
    server render, a build, or blocked storage. Another project's session in
    the same storage is never read. `sessionKey` defaults to this
    application's own; a test may name one. */
export function storedSessionUserId(
  storage: BrowserStorage | null,
  sessionKey: string | null = configuredAuthSessionKey(),
): string | null {
  if (!storage || !sessionKey) return null;
  const raw = safeGet(storage, sessionKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { user?: { id?: unknown } } | null;
    const id = parsed?.user?.id;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    /* Not a session this code understands: nobody is signed in as far as
       the owner is concerned, and the account layer answers properly a
       moment later. */
    return null;
  }
}

/** Whose work this device holds before anything has been told otherwise: the
    student whose session is sitting in this browser, or, when there is none,
    this device's own anonymous owner. */
export function bootOwner(): CacheOwner {
  const storage = deviceStorage();
  const userId = storedSessionUserId(storage);
  return userId ? userOwner(userId) : anonymousOwner(deviceIdFrom(storage));
}

/* ── The current owner ───────────────────────────────────────────────────── */

let current: CacheOwner | null = null;
const ownerListeners = new Set<() => void>();

/** Whose work this browser is showing and saving right now: the signed-in
    student, or this device's anonymous owner. Resolved lazily so importing
    this module during a server render touches nothing, and resolved from the
    session this browser is already holding (bootOwner above) so that a page
    with no account component on it still answers with the right student. */
export function currentOwner(): CacheOwner {
  current ??= bootOwner();
  return current;
}

/** Sign-in, account switch, or sign-out with null (back to the anonymous
    device owner).
 *
 * Call this BEFORE any read, merge, migration or upload for the new owner.
 * Every store in this codebase resolves its key through `currentOwner()` at
 * the moment of the read or write, so one call moves all of them at once and
 * there is no window in which one store has moved and another has not. */
export function setCurrentOwner(owner: CacheOwner | null): void {
  const resolved = owner ?? anonymousOwner(deviceIdFrom(deviceStorage()));
  if (current && sameOwner(current, resolved)) return;
  current = resolved;
  announceStoresChanged();
}

/** Tell every store that what it should be showing has changed underneath
    it: a different owner, or the same owner with different contents because
    the anonymous-work claim just moved work into them. The stores turn this
    into their own ordinary change notification, so a screen refreshes and
    the account sync schedules its push exactly as it does after any write. */
export function announceStoresChanged(): void {
  for (const listener of ownerListeners) {
    try {
      listener();
    } catch {
      /* A listener throwing must not break a sign-in or a sign-out. */
    }
  }
}

/** Subscribe to owner changes. Returns an unsubscribe, the same shape as
    onProgressChange and onStudyPlanChange. */
export function onOwnerChange(listener: () => void): () => void {
  ownerListeners.add(listener);
  return () => ownerListeners.delete(listener);
}

/* ── Work that finishes after the page has moved on ─────────────────────── */

/* WHY (finding R2-02 of the second Codex inspection)
 *
 * An essay or a spoken answer is sent away to be graded and comes back
 * seconds, sometimes a minute, later. The screens used to write whatever came
 * back into whoever the current owner was AT THAT MOMENT. If student A's
 * grade was still on its way when another tab signed A out and B in, A's band
 * and A's report landed in B's history, and the mock exam's embedded
 * examiner went on to report A's result into B's sitting.
 *
 * So a piece of work that outlives its screen is now bound, when it starts,
 * to the owner it was started for, and carries its own cancellation:
 *
 *   - the grade is KEPT under that starting owner, whatever has happened on
 *     the page since. The student who took the test (and whose grading was
 *     paid for) finds it the next time they are the one using this browser.
 *     It is never written under anybody else, and never silently dropped;
 *   - it is SHOWN, and a completion callback runs, only while that owner is
 *     still the one on screen and the screen has not let go of it;
 *   - a screen that is still there but now belongs to somebody else says so
 *     without showing any of the result.
 *
 * The binding is the cancellation generation: each new attempt makes a new
 * one and cancels the last, and a screen cancels its own when it unmounts.
 * An owner change is noticed the moment it happens, not merely compared at
 * the end, so A signing out and back in while the grade is on its way still
 * counts as "the page moved on" for the screen, though the grade is kept for
 * A either way. */

/** Where a bound piece of work stands. */
export type OwnerBindingState =
  /** The owner it was started for is still the current one, and the screen
      that started it is still waiting for it. */
  | 'current'
  /** A different owner took over at some point since it started. Sticky:
      the first owner coming back does not undo it. */
  | 'owner-changed'
  /** The screen let go: it unmounted, started over, or began a new attempt. */
  | 'cancelled';

export interface OwnerBinding {
  /** Whose work this is: the current owner at the moment it was bound.
      Never changes afterwards. */
  readonly owner: CacheOwner;
  state(): OwnerBindingState;
  /** state() === 'current'. */
  current(): boolean;
  /** The screen is letting go. Safe to call any number of times, and it
      stops listening for owner changes. */
  cancel(): void;
}

/** Bind a piece of work that is about to start to the owner it is for. */
export function bindToCurrentOwner(): OwnerBinding {
  const owner = currentOwner();
  let ownerChanged = false;
  let cancelled = false;
  let stopListening: (() => void) | null = null;

  const release = (): void => {
    if (!stopListening) return;
    stopListening();
    stopListening = null;
  };

  /* announceStoresChanged also fires for the SAME owner (after the
     anonymous-work claim moves work in), so the owner itself is compared
     rather than the notification being taken as a change. */
  stopListening = onOwnerChange(() => {
    if (sameOwner(currentOwner(), owner)) return;
    ownerChanged = true;
    release();
  });

  const state = (): OwnerBindingState => {
    if (cancelled) return 'cancelled';
    if (!ownerChanged && !sameOwner(currentOwner(), owner)) {
      /* Belt and braces for an owner set without a notification reaching
         this listener: compared directly as well. */
      ownerChanged = true;
      release();
    }
    return ownerChanged ? 'owner-changed' : 'current';
  };

  return {
    owner,
    state,
    current: () => state() === 'current',
    cancel: () => {
      cancelled = true;
      release();
    },
  };
}

/** What a screen does with a grade, in the three situations it can arrive in.
    See runOwnedGrade. */
export interface OwnedGradeSteps<T> {
  /** Keep it: write the grade into the history of `owner`, which is always
      the owner the work was bound to and never anybody else. Runs once for
      every grade that arrives, whatever has happened on the page since. */
  keep(result: T, owner: CacheOwner): void;
  /** Show it: the screen is still waiting and still this owner's. The only
      place a report may be painted or a completion callback invoked. */
  show?(result: T): void;
  /** The screen is still there but belongs to somebody else now: say so,
      and show none of the result. */
  hide?(result: T): void;
}

/** Wait for a grade, keep it for the owner it was bound to, and only then
    decide what the screen may do with it.
 *
 * Returns where the binding stood when the grade arrived. A grading request
 * that FAILS has nothing to keep: for a screen that has let go it is
 * swallowed (there is nobody to tell), and otherwise it is thrown on to the
 * screen's own error handling exactly as before. */
export async function runOwnedGrade<T>(
  binding: OwnerBinding,
  grade: () => Promise<T>,
  steps: OwnedGradeSteps<T>,
): Promise<OwnerBindingState> {
  let result: T;
  try {
    result = await grade();
  } catch (error) {
    if (binding.state() === 'cancelled') return 'cancelled';
    throw error;
  }
  steps.keep(result, binding.owner);
  const state = binding.state();
  if (state === 'current') steps.show?.(result);
  else if (state === 'owner-changed') steps.hide?.(result);
  return state;
}

/* ── The four older stores, named once ───────────────────────────────────── */

/* The VALUES are exactly what they have always been; only the place they are
   spelled has moved here, so that the scoping rule, the one-time move and the
   claim all work from one list rather than four copies of it. Each store
   module re-exports its own key where it already did. */

export const PROGRESS_STORE_KEY = 'ielts.progress.v1';
export const STUDY_PLAN_STORE_KEY = 'ielts.studyplan.v1';
export const VOCAB_STORE_KEY = 'ielts.vocab.v1';
export const NOTES_STORE_KEY = 'ielts.notes.v1';

/** Every store that was device-wide before this fix, in the order a student
    would recognise them. The claim moves all of them together. */
export const LEGACY_STORE_KEYS: readonly string[] = [
  PROGRESS_STORE_KEY,
  STUDY_PLAN_STORE_KEY,
  VOCAB_STORE_KEY,
  NOTES_STORE_KEY,
  /* The mock exam history became owner-scoped in the second Codex round
     (src/lib/tests/mock.ts). Listed here so the explicit "work saved on
     this device" claim carries an anonymous mock sitting across too. */
  'ielts.mock.v1',
] as const;

/** The two stores whose stored value names its OWN owner: the unfinished
    test sitting (src/lib/test-session.ts) and the mock exam day paused part
    way through (src/lib/tests/mock.ts). The claim carries them as well, one
    yes for everything, but not through the list above. See "Claiming the
    stores whose value names its owner" below for why they are kept apart. */
export const OWNER_STAMPED_STORE_KEYS: readonly string[] = [
  /* The unfinished test sitting, src/lib/test-session.ts TEST_SESSION_KEY. */
  'ielts.testsession.v1',
  /* The paused mock day, src/lib/tests/mock.ts ACTIVE_MOCK_KEY. */
  'ielts.mock.active.v1',
] as const;

/* ── Scoped keys, and the one-time move ──────────────────────────────────── */

export function scopedKeyFor(base: string, owner: CacheOwner): string {
  return `${base}${CACHE_NAMESPACE_SEPARATOR}${ownerNamespace(owner)}`;
}

/** The owner written on this device's old device-wide keys.
 *
 * LEGACY_MIGRATION_OWNER_KEY is stamped by the learner record the first time
 * it migrates those stores. No stamp means nobody signed in has ever claimed
 * them, so they belong to the anonymous device owner and a signed-in student
 * has to ask for them. */
export function legacyOwnerNamespace(storage: BrowserStorage | null): string {
  if (!storage) return ownerNamespace(anonymousOwner(FALLBACK_DEVICE_ID));
  const raw = safeGet(storage, LEGACY_MIGRATION_OWNER_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { ownerKey?: unknown };
      if (typeof parsed?.ownerKey === 'string' && parsed.ownerKey.length > 0) return parsed.ownerKey;
    } catch {
      /* A corrupt stamp is treated as no stamp: the anonymous owner keeps
         the work, which is the answer that gives it away to nobody. */
    }
  }
  return ownerNamespace(anonymousOwner(deviceIdFrom(storage)));
}

interface AdoptionFile {
  version: 1;
  /** Owner namespace to the base keys it has already taken a copy of. */
  adopted: Record<string, string[]>;
}

function readAdoption(storage: BrowserStorage): AdoptionFile {
  const empty: AdoptionFile = { version: 1, adopted: {} };
  const raw = safeGet(storage, LEGACY_ADOPTION_KEY);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<AdoptionFile>;
    if (parsed?.version !== 1 || !parsed.adopted || typeof parsed.adopted !== 'object') return empty;
    return { version: 1, adopted: parsed.adopted as Record<string, string[]> };
  } catch {
    return empty;
  }
}

function markAdopted(storage: BrowserStorage, ownerKey: string, base: string): void {
  const file = readAdoption(storage);
  const held = file.adopted[ownerKey] ?? [];
  if (held.includes(base)) return;
  file.adopted[ownerKey] = [...held, base].sort();
  safeSet(storage, LEGACY_ADOPTION_KEY, JSON.stringify(file));
}

/** Checked-already, per storage object, so a read costs a Set lookup rather
    than a JSON parse. It is only a cache: the real record of what has been
    taken is LEGACY_ADOPTION_KEY, in storage, which survives a reload. */
let checked = new WeakMap<BrowserStorage, Set<string>>();

function checkedSet(storage: BrowserStorage): Set<string> {
  let held = checked.get(storage);
  if (!held) {
    held = new Set<string>();
    checked.set(storage, held);
  }
  return held;
}

/** Move the old device-wide value into this owner's scoped key, once, and
    only when the device says the old value is this owner's.
 *
 * NOTHING IS DELETED. The device-wide key keeps its value for good; this
 * takes a copy. Nothing is overwritten either: an owner who already has a
 * scoped copy keeps it. */
function adoptOnce(storage: BrowserStorage, base: string, owner: CacheOwner, key: string): void {
  const mine = ownerNamespace(owner);
  const memo = checkedSet(storage);
  const memoKey = `${mine}\x00${base}`;
  if (memo.has(memoKey)) return;
  memo.add(memoKey);

  if (legacyOwnerNamespace(storage) !== mine) return;
  if ((readAdoption(storage).adopted[mine] ?? []).includes(base)) return;

  const held = safeGet(storage, base);
  if (held !== null && safeGet(storage, key) === null) {
    if (!safeSet(storage, key, held)) {
      /* No room right now. Forget that we looked, so the next visit (or the
         next write, once something has been freed) tries again. */
      memo.delete(memoKey);
      return;
    }
  }
  markAdopted(storage, mine, base);
}

/** The key one owner's copy of `base` lives at, having first taken the old
    device-wide copy if it is theirs to take. */
export function scopedKeyIn(storage: BrowserStorage | null, base: string, owner: CacheOwner): string {
  const key = scopedKeyFor(base, owner);
  if (storage) adoptOnce(storage, base, owner, key);
  return key;
}

/** The key the CURRENT owner's copy of `base` lives at, on this device. The
    one line every older store now calls. */
export function scopedKey(base: string): string {
  return scopedKeyIn(deviceStorage(), base, currentOwner());
}

/** One owner's raw stored value for `base`, without parsing it. Used to
    count what an anonymous claim would carry, from a module that must not
    import the stores themselves. */
export function readScopedRaw(storage: BrowserStorage | null, base: string, owner: CacheOwner): string | null {
  if (!storage) return null;
  return safeGet(storage, scopedKeyIn(storage, base, owner));
}

/* ── Claiming the older stores ───────────────────────────────────────────── */

/** How to join one owner's copy to another's when both exist. Takes and
    returns raw JSON, so the registry stays free of every store's shape.
    Returning null means "these two cannot be joined", and nothing is lost:
    both copies stay where they are. */
export type LegacyStoreMerge = (mine: string, theirs: string) => string | null;

const mergers = new Map<string, LegacyStoreMerge>();

/** Each store registers its OWN merge rule, from the module that owns it, so
    there is never a second copy of that rule to drift. */
export function registerLegacyStoreMerge(base: string, merge: LegacyStoreMerge): void {
  mergers.set(base, merge);
}

export interface LegacyClaimOutcome {
  /** Base keys whose value moved across because the account had none. */
  moved: string[];
  /** Base keys where both sides had a copy and the store's own merge rule
      joined them. */
  merged: string[];
  /** Base keys where both sides had a copy and no merge rule was registered,
      or, for a store whose value names its owner, where the account already
      had one of its own (the account's own always wins there). The account
      keeps its own; the device's copy is left exactly where it is rather
      than thrown away. */
  keptSeparate: string[];
  /** Base keys of a store whose value names its owner, where the device's
      value could not be handed over as it stands: not a readable value of
      that store, nothing left in it to pick up, stamped with a third owner,
      or no re-stamp rule registered. Left exactly where it is. */
  leftInPlace: string[];
}

/* ── Claiming the stores whose value names its owner ─────────────────────── */

/* WHY THESE TWO ARE NOT IN LEGACY_STORE_KEYS
 *
 * An unfinished test sitting and a paused mock day each carry the owner who
 * started them INSIDE the stored value (an `owner` field spelled the way
 * ownerNamespace spells an owner), and the player and the mock screen refuse
 * one stamped for anybody else. Copying the key across the way the history
 * stores are copied would land a sitting in the account that still names the
 * device, and the account's own player would turn it away as another
 * student's. So each value is re-stamped for the account on the way, by a
 * rule its own module registers, and there is never a second copy of that
 * module's idea of what a resumable sitting is.
 *
 * Nor may they go through scopedKeyIn. Its one-time move reads the device's
 * HISTORY stamp, and an unfinished sitting must never be handed out on the
 * strength of that stamp (finding R2-01, see src/lib/test-session.ts). A
 * sitting left by an older build is parked with the anonymous device owner by
 * test-session.ts's own rule, and the paused mock was born owner-scoped and
 * has no device-wide past at all.
 *
 * THE ACCOUNT'S OWN WINS. If the claiming account already has an unfinished
 * sitting (or a paused mock) of its own, that one is kept exactly as it is
 * and the device's is left where it is, under the anonymous device owner:
 * one owner holds at most one of each, and overwriting a sitting the student
 * is part way through would lose their answers. Nothing is merged.
 *
 * Otherwise they move exactly as the history stores do: the re-stamped copy
 * is written under the account, and only once that write has landed is the
 * device's scoped copy removed, so the next student on this browser is never
 * offered it. The old device-wide key, where there is one, is never touched,
 * and test-session.ts's own note stops it being parked a second time. */

/** How one store whose value names its owner is handed from one owner to
    another. Registered by the module that owns the store. */
export interface OwnerStampedStoreRule {
  /** The store's own one-time parking of an older build's device-wide value
      with the anonymous device owner, run before that owner's copy is read.
      Optional: a store born owner-scoped has nothing to park. */
  prepare?(storage: BrowserStorage): void;
  /** `raw`, held by `from`, rewritten to name `to` as its owner, with every
      other field exactly as it was. Null when it is not something `from` can
      hand over: not a readable value of this store, nothing left in it to
      pick up, or stamped with a third owner. Owners are spelled the way
      ownerNamespace spells them. */
  restamp(raw: string, from: string, to: string): string | null;
}

const stampedRules = new Map<string, OwnerStampedStoreRule>();

/** Each store registers its OWN re-stamp rule, from the module that owns it,
    the same way the history stores register their merge rules. */
export function registerOwnerStampedStore(base: string, rule: OwnerStampedStoreRule): void {
  stampedRules.set(base, rule);
}

type StampedPlan =
  | { kind: 'move'; sourceKey: string; targetKey: string; value: string }
  | { kind: 'account-has-own' }
  | { kind: 'not-claimable' };

/** What a claim would do with one owner-stamped store right now, or null
    when `from` holds nothing in it. Writes nothing except the store's own
    one-time parking, which is what that store's own first read does too. */
function planStampedMove(storage: BrowserStorage, base: string, from: CacheOwner, to: CacheOwner): StampedPlan | null {
  const rule = stampedRules.get(base);
  rule?.prepare?.(storage);
  const sourceKey = scopedKeyFor(base, from);
  const source = safeGet(storage, sourceKey);
  if (source === null) return null;
  const targetKey = scopedKeyFor(base, to);
  if (safeGet(storage, targetKey) !== null) return { kind: 'account-has-own' };
  const value = rule ? rule.restamp(source, ownerNamespace(from), ownerNamespace(to)) : null;
  if (value === null) return { kind: 'not-claimable' };
  return { kind: 'move', sourceKey, targetKey, value };
}

/** The owner-stamped stores a claim from `from` to `to` would carry across
    right now, as base keys. What the claim offer counts, so the student is
    told about an unfinished test or a paused mock only when saying yes would
    really bring it, and never when the account already has its own. */
export function claimableOwnerStampedStores(
  storage: BrowserStorage | null,
  from: CacheOwner,
  to: CacheOwner,
): string[] {
  if (!storage || sameOwner(from, to)) return [];
  return OWNER_STAMPED_STORE_KEYS.filter((base) => planStampedMove(storage, base, from, to)?.kind === 'move');
}

/* ── The claim itself ────────────────────────────────────────────────────── */

/** Move the older stores, and the two stores whose value names its owner,
    from one owner to another, as one decision.
 *
 * Called by the explicit anonymous-work claim and by nothing else. The
 * device-wide originals are not touched; only the scoped copies move, and
 * the target is marked as having taken the originals so a later read cannot
 * copy them a second time over the claimed values. */
export function claimLegacyStores(
  storage: BrowserStorage | null,
  from: CacheOwner,
  to: CacheOwner,
): LegacyClaimOutcome {
  const outcome: LegacyClaimOutcome = { moved: [], merged: [], keptSeparate: [], leftInPlace: [] };
  if (!storage || sameOwner(from, to)) return outcome;

  for (const base of LEGACY_STORE_KEYS) {
    /* Resolving the source key first is what pulls a pre-build device-wide
       store into the anonymous namespace before it is handed over. */
    const sourceKey = scopedKeyIn(storage, base, from);
    const targetKey = scopedKeyFor(base, to);
    const source = safeGet(storage, sourceKey);
    markAdopted(storage, ownerNamespace(to), base);
    if (source === null) continue;

    const target = safeGet(storage, targetKey);
    if (target === null) {
      if (safeSet(storage, targetKey, source)) {
        safeRemove(storage, sourceKey);
        outcome.moved.push(base);
      }
      continue;
    }

    const merge = mergers.get(base);
    const joined = merge ? merge(target, source) : null;
    if (joined !== null && safeSet(storage, targetKey, joined)) {
      safeRemove(storage, sourceKey);
      outcome.merged.push(base);
      continue;
    }
    outcome.keptSeparate.push(base);
  }

  /* The unfinished sitting and the paused mock day, re-stamped for the
     account on the way (see "Claiming the stores whose value names its
     owner" above). The account's own always wins. */
  for (const base of OWNER_STAMPED_STORE_KEYS) {
    const plan = planStampedMove(storage, base, from, to);
    if (!plan) continue;
    if (plan.kind === 'account-has-own') {
      outcome.keptSeparate.push(base);
      continue;
    }
    if (plan.kind === 'not-claimable') {
      outcome.leftInPlace.push(base);
      continue;
    }
    if (safeSet(storage, plan.targetKey, plan.value)) {
      safeRemove(storage, plan.sourceKey);
      outcome.moved.push(base);
    }
  }
  return outcome;
}

/** For tests, and for the one place that needs a clean slate: forget the
    current owner and everything this module has cached about a device.
    Never called by a screen. */
export function resetStoreOwnerForTest(): void {
  current = null;
  /* Deliberately NOT clearing ownerListeners: the stores subscribe once, at
     import time, and dropping those subscriptions would leave a test process
     with stores that no longer notice a sign-in. */
  checked = new WeakMap<BrowserStorage, Set<string>>();
}
