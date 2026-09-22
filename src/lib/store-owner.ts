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
 * import time except three empty registries.
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

/* ── The current owner ───────────────────────────────────────────────────── */

let current: CacheOwner | null = null;
const ownerListeners = new Set<() => void>();

/** Whose work this browser is showing and saving right now: the signed-in
    student, or this device's anonymous owner. Resolved lazily so importing
    this module during a server render touches nothing. */
export function currentOwner(): CacheOwner {
  current ??= anonymousOwner(deviceIdFrom(deviceStorage()));
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
  const memoKey = `${mine} ${base}`;
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
  /** Base keys where both sides had a copy and no merge rule was registered.
      The account keeps its own; the device's copy is left exactly where it
      is rather than thrown away. */
  keptSeparate: string[];
}

/** Move the older stores from one owner to another, as one decision.
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
  const outcome: LegacyClaimOutcome = { moved: [], merged: [], keptSeparate: [] };
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
