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
   store-owner.ts copies it, once, into the key of whichever owner the device
   says it belongs to, which is the anonymous device owner unless the device's
   own stamp names a signed-in one. A different signed-in student never
   inherits it. */

import type { CacheOwner } from './learning/contracts/sync';
import type { PracticeTest } from './tests/schema';
import {
  currentOwner,
  deviceStorage,
  ownerNamespace,
  safeGet,
  safeRemove,
  safeSet,
  scopedKeyIn,
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
      session is read as belonging to whoever's key it was adopted into,
      which the adoption rule keeps conservative. */
  owner?: string;
}

/** Who this browser is saving work for right now, as one string. The value a
    player captures when its sitting starts, and compares against before it
    saves, submits or clears anything. */
export function currentSessionOwner(): string {
  return ownerNamespace(currentOwner());
}

/** Where this device keeps `owner`'s in-progress sitting. */
function keyFor(owner: CacheOwner): string {
  return scopedKeyIn(deviceStorage(), KEY, owner);
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
