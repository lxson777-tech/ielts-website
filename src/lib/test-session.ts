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
   device" claim.

   WHAT THE CLAIM DOES WITH IT (23 September 2026)
   Since this change the claim carries an unfinished sitting too: one yes
   moves everything. It is listed in store-owner.ts's
   OWNER_STAMPED_STORE_KEYS, not LEGACY_STORE_KEYS, because a sitting names
   its owner inside the value and a plain copy would be refused by the
   account's own player as another student's. restampSession below is the
   rule the claim uses, registered with store-owner.ts at the bottom of this
   file, and the parking rule below runs first so a sitting left by an older
   build is claimed from the device, never from the history stamp. If the
   account already has an unfinished sitting of its own, that one wins and
   the device's is left where it is.

   WHICH SITTING, NOT ONLY WHOSE (fifth Codex round, 23 September 2026,
   R2D-02)
   The slot holds ONE sitting per student, and opening a different paper
   replaces it. Every save and the clear used to check only the student,
   never which sitting they were for. So one student with paper P open in
   one tab and paper Q started in a second tab had P's keystrokes written
   over Q's saved answers, and handing P in cleared Q's sitting; and P's
   result was recorded before that clear, so a stale tab recorded a paper
   whose sitting was no longer its own.

   Every sitting now carries its own identity, `sittingId`, made when it
   starts and never reused (a sitting written before this build has none,
   and is named by its paper and the moment it started, which is unique for
   one student; see sittingRefOf). The paper id alone cannot serve: the same
   paper started again is a different sitting. The rule is the mock's rule
   (src/lib/tests/mock.ts, R2C-02), applied to this slot:
     - startSession is the one write that may put a sitting in another's
       place. Only "Start test" calls it (and a retake starting).
     - Every other save, and the clear once a paper is handed in, must name
       the SAME student, the SAME paper and the SAME sitting as the stored
       one, and writes nothing at all otherwise.
     - The test player learns that its sitting is no longer the stored one
       from the storage event another tab's write raises (see
       isTestSessionStorageKey) or from a refused save, and stops for good:
       'replaced' when a newer sitting took the slot, 'gone' when the slot is
       empty after having held this sitting (it was handed in, or added to an
       account, in another tab). A slot that NEVER held the sitting (the
       browser could not save it in the first place) is not a loss, so a
       full or blocked storage never stops a paper by mistake.
     - Handing a paper in FINALISES first (PaperSittingStore.finish, which
       checks the identity and clears) and only a paper that was finalised,
       or that this browser never managed to write down, is recorded. A
       stale tab's submit records nothing anywhere.
   The same sitting open in two tabs (the SAME paper opened twice, which
   resumes the same sitting) is outside this rule and behaves as before:
   both tabs save into it, the last keystroke wins. Only when one of them
   hands it in does the other find it gone, and then it stops rather than
   recording the paper a second time. */

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
  registerOwnerStampedStore,
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
  /** This sitting's own identity (R2D-02), made when it starts and never
      reused. Optional because a sitting written before this build has none;
      read it through sittingRefOf, which names such a sitting by its paper
      and the moment it started. */
  sittingId?: string;
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

/* ── Which sitting (R2D-02) ─────────────────────────────────────────────── */

/** Which sitting of which paper a player holds: what every ordinary save
    and the clear must name, and must find stored, to write anything. */
export interface PaperSittingRef {
  testId: string;
  sittingId: string;
}

/** A fresh identity for a sitting that is starting now. */
export function newSittingId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const random =
    typeof cryptoApi?.randomUUID === 'function'
      ? cryptoApi.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `sitting-${random}`;
}

/** The identity of a stored sitting. One written before sitting ids existed
    is named by its paper and the moment it started, which is unique for one
    student and never changes (no save touches `startedAt`, and neither does
    the claim), so every tab reading it agrees on the same name. */
export function sittingRefOf(s: Pick<TestSession, 'testId' | 'startedAt' | 'sittingId'>): PaperSittingRef {
  return {
    testId: s.testId,
    sittingId: typeof s.sittingId === 'string' && s.sittingId.length > 0 ? s.sittingId : `${s.testId}@${s.startedAt}`,
  };
}

function isSitting(s: TestSession, ref: PaperSittingRef): boolean {
  const own = sittingRefOf(s);
  return own.testId === ref.testId && own.sittingId === ref.sittingId;
}

/** Start a fresh session for this test, replacing any previous one OF THE
    SAME OWNER. Another student's unfinished sitting on this device is under
    their own key and is left exactly where it is. The one write that may
    put a sitting in another's place (R2D-02): only "Start test", and a
    retake starting, call it. */
export function startSession(test: PracticeTest): TestSession {
  const now = Date.now();
  const s: TestSession = {
    version: 1,
    testId: test.id,
    sittingId: newSittingId(),
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

/** Seconds left for a session at `now`, floored at 0. */
export function secondsLeft(s: Pick<TestSession, 'endsAt'>, now: number = Date.now()): number {
  return paperClockAt(s.endsAt, now).secondsLeft;
}

/* THE CLOCK OF A PAPER ON SCREEN IS ITS DEADLINE (fourth Codex round, 23
   September 2026, R2C-03)
   The test player used to count a number down, one second per tick, and
   froze that number while the sitting's student was away (a sign-out, or
   somebody else signing in, in this tab or another). When the student came
   back to the same open page, the count simply carried on from where it had
   frozen. So a paper with five minutes left, put down for ten, still offered
   five minutes on that page, while a reload of the very same sitting found
   it expired. A background tab, whose ticks the browser slows down, drifted
   the same way.

   Now every reading of a running paper's clock is taken from its saved
   deadline (TestSession.endsAt, the same value a reload reads) and the
   moment of reading, never from a count: each tick, the student coming back
   to the open page, and the moment a paper is handed in. A deadline that
   passed while the student was away is then exactly the expired sitting a
   fresh load finds, handled the same way (time is up, and the paper is
   handed in with the answers it has), and no time is ever given back. */

/** A running paper's clock, read at one moment. */
export interface PaperClockReading {
  /** Whole seconds left before the deadline, floored at 0. */
  secondsLeft: number;
  /** The deadline has been reached: the paper is handed in as it stands. */
  timeUp: boolean;
}

/** The clock of a paper whose saved deadline is `endsAt`, as it reads at
    `now`. The only clock rule the test player uses (R2C-03). */
export function paperClockAt(endsAt: number, now: number = Date.now()): PaperClockReading {
  const left = Math.max(0, Math.round((endsAt - now) / 1000));
  return { secondsLeft: left, timeUp: left <= 0 };
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
    previous student's answers stay under the previous student's key.
 *
 * Naming the sitting (`sitting`, R2D-02) makes this an ORDINARY save: it
 * writes only when the stored sitting is that very sitting, the same paper
 * and the same identity, and false, writing nothing, when another sitting
 * has taken the slot or nothing is stored. The test player always names it
 * (through standaloneSitting). Without it, the save goes into whatever
 * sitting this student has stored, which is only right straight after
 * startSession, the way the older callers and tests use it. */
export function saveAnswers(
  answers: Record<string, string>,
  sittingOwner?: string,
  sitting?: PaperSittingRef,
): boolean {
  if (!ownerStillCurrent(sittingOwner)) return false;
  const s = read();
  if (!s) return false;
  if (sittingOwner && s.owner && s.owner !== sittingOwner) return false;
  if (sitting && !isSitting(s, sitting)) return false;
  write({ ...s, answers });
  return true;
}

/** Clear the CURRENT owner's in-progress sitting. Another student's copy on
    this browser is under their own key and is not touched, and neither is
    the old device-wide key. Passing the owner the sitting started under
    makes this a no-op once somebody else has signed in, so a submit that
    arrives late can never wipe the new student's own sitting.
 *
 * Naming the sitting (R2D-02) makes it an ORDINARY clear as well: only the
 * stored sitting that is that very sitting is removed, so a paper handed in
 * in a stale tab can never clear the newer sitting another tab started.
 * Returns whether anything was removed. */
export function clearSession(sittingOwner?: string, sitting?: PaperSittingRef): boolean {
  if (!ownerStillCurrent(sittingOwner)) return false;
  const storage = deviceStorage();
  if (!storage) return false;
  if (sitting) {
    const s = read();
    if (!s || !isSitting(s, sitting)) return false;
    if (sittingOwner && s.owner && s.owner !== sittingOwner) return false;
  }
  safeRemove(storage, keyFor(currentOwner()));
  return true;
}

/* ── Is the sitting on screen still the stored one (R2D-02, R2D-03) ──────── */

/** Where one sitting stands in the store that keeps it, read now.
 * - 'held': it is the stored sitting, of the student using this browser.
 * - 'replaced': that student's stored sitting is a DIFFERENT one now.
 * - 'absent': nothing in progress is stored for that student.
 * - 'owner-changed': somebody else is using this browser (that has its own
 *   stopped screen, and the sitting is still there for its student).
 * - 'no-storage': this browser keeps nothing at all. */
export type SittingStatus = 'held' | 'replaced' | 'absent' | 'owner-changed' | 'no-storage';

/** Why a sitting on screen is no longer the one written down, for good.
 * - 'replaced': a newer sitting took its place (started in another tab).
 * - 'gone': it was written down, and is not any more (handed in, finished,
 *   or added to an account, in another tab). */
export type SittingLoss = 'replaced' | 'gone';

/** The loss a status means for a screen. `everHeld` is whether that screen
    ever found its sitting written down: a sitting the browser never managed
    to write (a full or blocked storage) is 'absent' from the start, and that
    is not a loss, so such a paper is never stopped by mistake. Shared by the
    test player's two stores and the mock screen, so they cannot disagree. */
export function sittingLossFrom(status: SittingStatus, everHeld: boolean): SittingLoss | null {
  if (status === 'replaced') return 'replaced';
  if (status === 'absent' && everHeld) return 'gone';
  return null;
}

/** Where the standalone sitting `sitting`, started by `sittingOwner`, stands
    in this student's slot right now. */
export function standaloneSittingStatus(sittingOwner: string | undefined, sitting: PaperSittingRef): SittingStatus {
  if (!ownerStillCurrent(sittingOwner)) return 'owner-changed';
  if (!deviceStorage()) return 'no-storage';
  const s = read();
  if (!s || (sittingOwner && s.owner && s.owner !== sittingOwner)) return 'absent';
  return isSitting(s, sitting) ? 'held' : 'replaced';
}

/** Whether a storage event another tab raised (its `key`, null when the
    whole storage was cleared) can concern a standalone sitting. */
export function isTestSessionStorageKey(key: string | null): boolean {
  return key === null || key === KEY || key.startsWith(`${KEY}::`);
}

/* ── One paper's sitting, wherever it is kept ────────────────────────────── */

/* WHY THERE ARE TWO PLACES (third Codex round, 23 September 2026, R2B-03)
   The slot above holds ONE sitting per student, and a mock exam's Listening
   and Reading papers used to be kept in it too. So a student who paused a
   mock on its Listening paper and opened any other paper in the meantime
   overwrote the mock's answers and deadline, and resuming the mock started
   Listening again from nothing; and a new mock on a paper that happened to be
   sitting in the slot picked up that older sitting, because the slot knows
   the paper and nothing else. A mock's papers are now kept INSIDE that mock
   sitting (src/lib/tests/mock.ts, mockLegSitting), under its own identity,
   and this slot is for papers opened on their own. The test player is handed
   one of the two and asks it, never the storage, so it cannot mix them. */

/** A handed-in paper's result, as the test player computed it. */
export interface PaperOutcome {
  raw: number;
  total: number;
  band: number;
  bandLabel: string;
  secondsUsed: number;
}

/** What handing a paper in found, BEFORE anything is recorded (R2D-02).
 * - 'finished': the sitting was this tab's own and live, and it is now done
 *   with (cleared, or its result kept inside its mock sitting).
 * - 'unsaved': it is this tab's own, but the browser never managed to write
 *   it down, so there is nothing to finalise. Nothing else can have it.
 * - 'replaced' / 'gone': it is no longer this tab's to hand in (see
 *   SittingLoss). Nothing was written.
 * - 'owner-changed': somebody else is using this browser. Nothing written.
 * Only 'finished' and 'unsaved' may be recorded. */
export type PaperFinish = 'finished' | 'unsaved' | SittingLoss | 'owner-changed';

/** Where ONE paper's in-progress sitting is kept, as the test player uses
    it: restore, start, save the answers, notice a loss, and finish once
    handed in. Each player makes its own store, which remembers whether the
    sitting it handed out was ever found written down (so a browser that
    cannot save never reads as having lost it). */
export interface PaperSittingStore {
  /** The sitting of this paper the current owner can resume, if any. */
  load(): TestSession | null;
  /** A fresh sitting of this paper, with a fresh deadline and no answers. */
  start(): TestSession;
  /** Save the answers of the sitting `sitting`, which `sittingOwner`
      started. False, writing nothing, once somebody else is using this
      browser, or when the stored sitting is not that one (R2D-02). */
  save(answers: Record<string, string>, sittingOwner: string | undefined, sitting: PaperSittingRef | null): boolean;
  /** Why `sitting` is no longer the stored one, for good, or null while it
      still is (or the account changed, which is not a loss). */
  lost(sittingOwner: string | undefined, sitting: PaperSittingRef | null): SittingLoss | null;
  /** The paper was handed in. Checks that `sitting` is still this tab's own
      and live, and only then finalises it; says what it found, and writes
      nothing unless it is 'finished'. Called BEFORE the attempt is recorded
      anywhere, and the attempt is recorded only on 'finished' or 'unsaved'. */
  finish(sittingOwner: string | undefined, outcome: PaperOutcome, sitting: PaperSittingRef | null): PaperFinish;
}

/** A paper opened on its own: the one slot per student above. Every save
    and the finish name the sitting this store handed out (R2D-02). */
export function standaloneSitting(test: PracticeTest): PaperSittingStore {
  /* Whether the sitting this store handed out was ever found written down:
     picked up from the slot, started with a write that landed, or saved. */
  let everHeld = false;
  return {
    load: () => {
      const s = loadSession(test.id);
      everHeld = s !== null;
      return s;
    },
    start: () => {
      const s = startSession(test);
      everHeld = standaloneSittingStatus(s.owner, sittingRefOf(s)) === 'held';
      return s;
    },
    save: (answers, sittingOwner, sitting) => {
      if (!sitting) return false;
      const saved = saveAnswers(answers, sittingOwner, sitting);
      if (saved) everHeld = true;
      return saved;
    },
    lost: (sittingOwner, sitting) =>
      sitting ? sittingLossFrom(standaloneSittingStatus(sittingOwner, sitting), everHeld) : null,
    finish: (sittingOwner, _outcome, sitting) => {
      if (!sitting) return 'unsaved';
      const status = standaloneSittingStatus(sittingOwner, sitting);
      if (status === 'owner-changed') return 'owner-changed';
      if (status === 'held') return clearSession(sittingOwner, sitting) ? 'finished' : 'unsaved';
      return sittingLossFrom(status, everHeld) ?? 'unsaved';
    },
  };
}

/* ── Handing a sitting to an account, on the student's say-so ────────────── */

/** A stored sitting held by `from`, re-stamped so that `to` can resume it:
    the `owner` field names `to` and every other field, the answers and the
    deadline included, is exactly as it was. Owners are spelled as
    store-owner.ts spells them ('u:<id>' or 'anon:<deviceId>').
 *
 * Null when it is not `from`'s to hand over: not a sitting this file can
 * read, or one stamped with a third owner (read() would refuse that one to
 * `from` as well). A sitting with no owner written in it at all, which only
 * an older build made, is `from`'s, the same way read() treats it. Pure: it
 * reads and writes nothing, and store-owner.ts's claim is its only caller. */
export function restampSession(raw: string, from: string, to: string): string | null {
  const held = parse(raw);
  if (!held) return null;
  if (held.owner && held.owner !== from) return null;
  return JSON.stringify({ ...held, owner: to });
}

/* The explicit "work saved on this device" claim carries an unfinished
   sitting with this rule, after parking any older build's sitting with the
   device first (never with an account, see the R2-01 note at the top). */
registerOwnerStampedStore(KEY, {
  prepare: (storage) => adoptUnownedIntoDevice(storage, KEY),
  restamp: restampSession,
});
