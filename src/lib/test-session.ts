/* In-progress test session, persisted so a refresh or accidental tab close
   cannot pause or reset the timer. One session at a time per student (the
   active test). Distinct from progress.ts, which stores permanent
   completed-attempt history.

   WHOSE SITTING (23 September 2026)
   This store used to be one shared pile under `ielts.testsession.v1`, with
   nobody's name on it. A student who started a drill and walked away left
   their answers sitting on the device; the next student to sign in on the
   same browser opened the same drill, found those answers already filled in,
   pressed Submit, and the first student's work was recorded as theirs, in
   their history and in their uploaded evidence. That is finding 1 of the 23
   September 2026 review, reproduced in a real browser.

   The fix is the one src/lib/progress.ts already uses, copied exactly: every
   read and write below resolves its key through src/lib/store-owner.ts,
   which answers with the signed-in student or this browser's anonymous
   device owner. A sitting now also carries the owner it STARTED under, so a
   sitting held in memory by a mounted player can be checked against whoever
   is signed in at the moment it tries to save or submit (see
   src/components/TestPlayer.tsx).

   The old device-wide key is still there and is never emptied or changed:
   it is copied, once, into the ANONYMOUS device owner's key and nowhere
   else. No signed-in account ever receives it automatically.

   WHY IT IS NOT THE OLDER STORES' RULE (second Codex round, 23 September
   2026, finding R2-01)
   The four history stores ask store-owner.ts's scopedKeyIn, whose one-time
   move reads the device's own stamp (LEGACY_MIGRATION_OWNER_KEY) and hands
   the old value to the account that stamp names. That stamp answers a
   different question: which account this device's HISTORY was migrated into,
   possibly weeks ago. It says nothing about who started the unfinished
   sitting lying around right now. A device stamped for student A, where
   student B then started a paper under the old device-wide key, would have
   handed B's answers to A the moment A signed in, and A could have submitted
   them. So an unfinished sitting gets its own rule, below: it is parked with
   the anonymous device owner, always, whoever the stamp names and whoever is
   signed in when it is first read. Signed out, the device's own student can
   pick it up again. No account ever receives it automatically. The only
   route from the device to an account is the explicit "work saved on this
   device" claim, which moves the keys listed in store-owner.ts's
   LEGACY_STORE_KEYS. That list names the mock history (ielts.mock.v1) but,
   as of this change, not this key, so an unfinished sitting from an older
   build stays with the device; adding it there is store-owner.ts's call. */

import type { CacheOwner } from './learning/contracts/sync';
import { LEGACY_ADOPTION_KEY } from './learning/contracts/sync';
import type { PracticeTest } from './tests/schema';
import {
  anonymousOwner,
  type BrowserStorage,
  currentOwner,
  deviceIdFrom,
  deviceStorage,
  ownerNamespace,
  safeGet,
  safeRemove,
  safeSet,
  scopedKeyFor,
} from './store-owner';

/** The store's base key, unchanged. What actually reaches localStorage is
    this plus the owner, for example 'ielts.testsession.v1::u:9f0c'. */
export const TEST_SESSION_KEY = 'ielts.testsession.v1';

const KEY = TEST_SESSION_KEY;

export interface TestSession {
  version: 1;
  testId: string;
  startedAt: number; // epoch ms
  endsAt: number; // epoch ms, startedAt plus the duration
  answers: Record<string, string>;
  /** The owner this sitting was started under, as store-owner.ts spells an
      owner: 'u:<userId>' or 'anon:<deviceId>'. Optional, because a session
      written before this build has no owner written inside it; such a
      session only ever reaches the anonymous device owner's key (see
      adoptUnownedIntoDevice below), so it is read as that owner's. */
  owner?: string;
}

/** Who this browser is saving work for right now, as one string. The value a
    player captures when its sitting starts, and compares against before it
    saves, submits or clears anything. */
export function currentSessionOwner(): string {
  return ownerNamespace(currentOwner());
}

/* ── An older build's unowned value, parked with the device ──────────────── */

/** Where this device notes which unowned values it has already parked with
    the anonymous device owner. Its own small file, deliberately not the
    history stores' stamp: that stamp records which ACCOUNT the device's
    history was migrated into, and reading it here is exactly the mistake
    this rule exists to avoid. Nothing is ever deleted; this only stops the
    same old value being copied back a second time after the student has
    submitted, or claimed, and the parked copy has gone. */
export const UNOWNED_ADOPTION_KEY = 'ielts.unowned.adopted.v1';

interface AdoptedFile {
  version: 1;
  /** Owner namespace to the base keys already parked there. */
  adopted: Record<string, string[]>;
}

/** Read one of the two "already copied" files. Both have the same shape;
    a missing or corrupt file reads as empty, which at worst copies a value
    into a key that is still empty, and never overwrites anything. */
function readAdoptedFile(storage: BrowserStorage, key: string): AdoptedFile {
  const empty: AdoptedFile = { version: 1, adopted: {} };
  const raw = safeGet(storage, key);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<AdoptedFile>;
    if (parsed?.version !== 1 || !parsed.adopted || typeof parsed.adopted !== 'object') return empty;
    return { version: 1, adopted: parsed.adopted as Record<string, string[]> };
  } catch {
    return empty;
  }
}

function listed(file: AdoptedFile, ownerKey: string, base: string): boolean {
  const held = file.adopted[ownerKey];
  return Array.isArray(held) && held.includes(base);
}

function markUnownedAdopted(storage: BrowserStorage, ownerKey: string, base: string): void {
  const file = readAdoptedFile(storage, UNOWNED_ADOPTION_KEY);
  if (listed(file, ownerKey, base)) return;
  file.adopted[ownerKey] = [...(file.adopted[ownerKey] ?? []), base].sort();
  safeSet(storage, UNOWNED_ADOPTION_KEY, JSON.stringify(file));
}

/** Copy a value left under the old device-wide key by a build that had no
    owners into the ANONYMOUS device owner's key, once.
 *
 * THE DEVICE'S HISTORY STAMP IS NEVER CONSULTED, and neither is whoever is
 * signed in. An unfinished sitting and an unfinished mock day left by an
 * older build carry no name, so they are the device's, and a student has
 * to ask for them on purpose.
 *
 * "Once" is read from two places. This file's own note is the first. The
 * second is store-owner.ts's record of which owners have taken their copy
 * of the history stores: the mock history is one of those, and the explicit
 * claim takes it into the anonymous key through that route before moving it
 * to the account. Without honouring that record, the value the student had
 * just claimed would be copied straight back to the device the next time
 * this ran. Only the ANONYMOUS owner's entry in it is read, never the stamp
 * naming an account.
 *
 * NOTHING IS DELETED and nothing is overwritten: the device-wide key keeps
 * its value for good, and an anonymous copy that already exists is left
 * alone. */
export function adoptUnownedIntoDevice(storage: BrowserStorage | null, base: string): void {
  if (!storage) return;
  const device = anonymousOwner(deviceIdFrom(storage));
  const ns = ownerNamespace(device);
  if (listed(readAdoptedFile(storage, UNOWNED_ADOPTION_KEY), ns, base)) return;
  if (listed(readAdoptedFile(storage, LEGACY_ADOPTION_KEY), ns, base)) {
    markUnownedAdopted(storage, ns, base);
    return;
  }

  const held = safeGet(storage, base);
  const key = scopedKeyFor(base, device);
  if (held !== null && safeGet(storage, key) === null) {
    /* No room right now: say nothing, so the next visit tries again. */
    if (!safeSet(storage, key, held)) return;
  }
  markUnownedAdopted(storage, ns, base);
}

/** The key `owner`'s copy of `base` lives at, having first parked any
    pre-build device-wide copy with the anonymous device owner. Shared with
    src/lib/tests/mock.ts so a sitting and a mock day cannot disagree. */
export function unownedScopedKey(storage: BrowserStorage | null, base: string, owner: CacheOwner): string {
  adoptUnownedIntoDevice(storage, base);
  return scopedKeyFor(base, owner);
}

/** Where this device keeps `owner`'s in-progress sitting. */
function keyFor(owner: CacheOwner): string {
  return unownedScopedKey(deviceStorage(), KEY, owner);
}

function parse(raw: string | null): TestSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    return s?.version === 1 ? (s as TestSession) : null;
  } catch {
    return null;
  }
}

function read(): TestSession | null {
  const storage = deviceStorage();
  if (!storage) return null;
  const owner = currentOwner();
  const s = parse(safeGet(storage, keyFor(owner)));
  if (!s) return null;
  /* Belt and braces: a sitting sitting under one owner's key but stamped
     with another's is not that owner's to resume. It cannot normally happen,
     since only this file writes the key, but a sitting that leaks is the
     exact defect this file exists to close, so the stamp is checked rather
     than trusted. */
  if (s.owner && s.owner !== ownerNamespace(owner)) return null;
  return s;
}

function write(s: TestSession): void {
  const storage = deviceStorage();
  if (!storage) return;
  /* Writes always land under the owner named on the sitting itself, and only
     when that is still the owner of this browser: no code path saves one
     student's answers into another student's key. */
  safeSet(storage, keyFor(currentOwner()), JSON.stringify(s));
}

/** Start a fresh session for this test, replacing any previous one OF THE
    SAME OWNER. Another student's unfinished sitting on this device is under
    their own key and is left exactly where it is. */
export function startSession(test: PracticeTest): TestSession {
  const now = Date.now();
  const s: TestSession = {
    version: 1,
    testId: test.id,
    startedAt: now,
    endsAt: now + test.durationMinutes * 60_000,
    answers: {},
    owner: currentSessionOwner(),
  };
  write(s);
  return s;
}

/** The in-progress session for whichever test the CURRENT owner is part way
    through, if any. */
export function activeSession(): TestSession | null {
  return read();
}

/** Return the current owner's in-progress session for this test, if one
    exists (any remaining time). */
export function loadSession(testId: string): TestSession | null {
  const s = read();
  return s && s.testId === testId ? s : null;
}

/** Seconds left for a session, floored at 0. */
export function secondsLeft(s: TestSession): number {
  return Math.max(0, Math.round((s.endsAt - Date.now()) / 1000));
}

/** True while `sittingOwner` (captured when the sitting started) is still
    the owner this browser is saving work for. False after a sign-in, a
    sign-out or an account switch in this tab or another one. */
export function ownerStillCurrent(sittingOwner: string | null | undefined): boolean {
  if (!sittingOwner) return true;
  return sittingOwner === currentSessionOwner();
}

/** Save the answers of the sitting `sittingOwner` started. Returns false,
    and writes nothing at all, once somebody else is using this browser: the
    previous student's answers stay under the previous student's key. */
export function saveAnswers(answers: Record<string, string>, sittingOwner?: string): boolean {
  if (!ownerStillCurrent(sittingOwner)) return false;
  const s = read();
  if (!s) return false;
  if (sittingOwner && s.owner && s.owner !== sittingOwner) return false;
  write({ ...s, answers });
  return true;
}

/** Clear the CURRENT owner's in-progress sitting. Another student's copy on
    this browser is under their own key and is not touched, and neither is
    the old device-wide key. Passing the owner the sitting started under
    makes this a no-op once somebody else has signed in, so a submit that
    arrives late can never wipe the new student's own sitting. */
export function clearSession(sittingOwner?: string): void {
  if (!ownerStillCurrent(sittingOwner)) return;
  const storage = deviceStorage();
  if (!storage) return;
  safeRemove(storage, keyFor(currentOwner()));
}
