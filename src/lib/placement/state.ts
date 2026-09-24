/* The placement test's resume state: one sitting per student, on this device.
 *
 * WHAT THIS IS FOR, AND WHAT IT IS NOT
 * The placement test is taken ONCE per account, and whether an account has
 * taken it is answered from the learner record (every event it writes
 * carries PLACEMENT_SOURCE_KEY, see ./results.ts), never from here. This
 * file only lets a student who is interrupted finish the same sitting on the
 * same device: which parts are done, the Listening and Reading papers in
 * progress (their answers and deadlines), and the essay being written.
 *
 * WHOSE SITTING
 * Stored under `ielts.placement.v1::<owner>` (the owner namespace
 * src/lib/store-owner.ts spells, for example `u:9f0c`), and the owner is
 * written inside the value as well, so a sitting found under one key but
 * stamped for somebody else is never read as theirs. Every write names the
 * owner and the sitting it is for and writes nothing when either differs,
 * which is the rule src/lib/test-session.ts already applies to a paper
 * opened on its own (R2D-02): a stale tab can never write over a newer
 * sitting, and one student's answers never land under another's key.
 *
 * THE TWO PAPERS ARE A THIRD KIND OF SITTING STORE
 * The test player keeps a paper in one of two places today: the one
 * standalone slot per student (standaloneSitting) or inside a mock exam
 * sitting (mockLegSitting in src/lib/tests/mock.ts). A placement's Listening
 * and Reading papers are kept inside the placement sitting instead
 * (placementLegSitting below), behind the same PaperSittingStore shape, so
 * the player's deadline-driven clock (paperClockAt), its stale-tab refusal
 * and its finish-before-record order apply to them unchanged.
 *
 * No clock of its own and no network: every function takes the storage and
 * the time it needs, so tests/placement.test.ts drives it with a Map.
 */

import type { PracticeTest } from '../tests/schema';
import { CACHE_NAMESPACE_SEPARATOR } from '../learning/contracts/sync';
import type { EvidenceMode } from '../learning/contracts/evidence';
import { deviceStorage, safeGet, safeSet, type BrowserStorage } from '../store-owner';
import {
  ownerStillCurrent,
  sittingLossFrom,
  type PaperFinish,
  type PaperSittingRef,
  type PaperSittingStore,
  type SittingLoss,
  type SittingStatus,
  type TestSession,
} from '../test-session';
import { PLACEMENT, PLACEMENT_SOURCE_KEY } from '../../data/placement';

/** Base key. What reaches localStorage is this plus the owner namespace. */
export const PLACEMENT_STATE_KEY = 'ielts.placement.v1';

export type PlacementPart = 'listening' | 'reading' | 'writing' | 'speaking';

/** The four parts, in the order they are sat. */
export const PLACEMENT_PARTS: readonly PlacementPart[] = ['listening', 'reading', 'writing', 'speaking'];

/** Minutes on each part's clock, from src/data/placement.ts. */
export const PLACEMENT_PART_MINUTES: Record<PlacementPart, number> = {
  listening: PLACEMENT.listening.minutes,
  reading: PLACEMENT.reading.minutes,
  writing: PLACEMENT.writing.minutes,
  speaking: PLACEMENT.speaking.minutes,
};

/** Why a part produced no measurement. Each one is shown to the student as
    "not yet assessed", with its own plain sentence, and none of them is ever
    read as a low result. */
export type NotAssessedReason =
  /** The marking service is not set up on this site at all. */
  | 'unavailable'
  /** It was asked and did not answer, or refused (a daily limit, a sign-in
      it could not confirm), or the interview could not be finished. */
  | 'failed'
  /** The student chose to leave this part out (no microphone, say). */
  | 'skipped'
  /** Nothing was written before the time ran out, so there was nothing to
      send for marking and nothing was spent. */
  | 'blank';

export type PartOutcome =
  /** Listening or Reading, handed in and recorded. */
  | { kind: 'scored'; raw: number; total: number; at: string }
  /** Writing or Speaking, marked by the calibrated grader and recorded. */
  | { kind: 'graded'; band: number; at: string }
  | { kind: 'not-assessed'; reason: NotAssessedReason; at: string };

/** One Listening or Reading paper of the sitting, as the test player keeps it. */
export interface PlacementLegV1 {
  testId: string;
  startedAt: number;
  endsAt: number;
  answers: Record<string, string>;
  /** Set once, by the first accepted hand-in. A second hand-in of the same
      paper (another tab) is refused as 'handed-in' and records nothing. */
  handedIn: boolean;
}

/** The Writing part in progress: its deadline and the essay so far. */
export interface PlacementWritingV1 {
  startedAt: number;
  endsAt: number;
  essay: string;
}

export interface PlacementStateV1 {
  version: 1;
  /** The owner this sitting was started under, as store-owner.ts spells it. */
  owner: string;
  /** This sitting's own identity. Also the shared plan-evidence session id of
      its four events (placementSessionId). */
  sittingId: string;
  /** ISO datetime the sitting began. */
  startedAt: string;
  legs: Partial<Record<'listening' | 'reading', PlacementLegV1>>;
  writing: PlacementWritingV1 | null;
  outcomes: Partial<Record<PlacementPart, PartOutcome>>;
}

/* ── Reading and writing ─────────────────────────────────────────────────── */

/** Where `ownerNs`'s sitting is kept. */
export function placementStateKey(ownerNs: string): string {
  return `${PLACEMENT_STATE_KEY}${CACHE_NAMESPACE_SEPARATOR}${ownerNs}`;
}

function parse(raw: string | null, ownerNs: string): PlacementStateV1 | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PlacementStateV1>;
    if (value?.version !== 1 || typeof value.sittingId !== 'string' || typeof value.owner !== 'string') return null;
    /* A sitting under one owner's key but stamped with another's is not that
       owner's to resume. Only this file writes the key, so it cannot normally
       happen; it is checked rather than trusted all the same. */
    if (value.owner !== ownerNs) return null;
    return {
      version: 1,
      owner: value.owner,
      sittingId: value.sittingId,
      startedAt: typeof value.startedAt === 'string' ? value.startedAt : new Date(0).toISOString(),
      legs: value.legs && typeof value.legs === 'object' ? value.legs : {},
      writing: value.writing ?? null,
      outcomes: value.outcomes && typeof value.outcomes === 'object' ? value.outcomes : {},
    };
  } catch {
    return null;
  }
}

/** `ownerNs`'s placement sitting on this device, or null. */
export function readPlacementState(storage: BrowserStorage | null, ownerNs: string): PlacementStateV1 | null {
  if (!storage) return null;
  return parse(safeGet(storage, placementStateKey(ownerNs)), ownerNs);
}

/** Write a sitting under its own owner's key. False when the browser
    refused (no room, blocked): the caller then carries on in memory. */
function writeState(storage: BrowserStorage | null, state: PlacementStateV1): boolean {
  if (!storage) return false;
  return safeSet(storage, placementStateKey(state.owner), JSON.stringify(state));
}

/** A fresh identity for a sitting starting now. */
export function newPlacementSittingId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const random =
    typeof cryptoApi?.randomUUID === 'function'
      ? cryptoApi.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `placement-${random}`;
}

/** Begin a sitting for `ownerNs`. The one write that may put a sitting in
    another's place; only the "Start the placement test" press calls it, and
    only when this owner has none in progress. Returns the sitting whether or
    not the browser kept it, so a student on a browser that cannot save still
    sits the test in one go. */
export function startPlacementState(
  storage: BrowserStorage | null,
  ownerNs: string,
  nowIso: string,
  sittingId: string = newPlacementSittingId(),
): { state: PlacementStateV1; saved: boolean } {
  const state: PlacementStateV1 = {
    version: 1,
    owner: ownerNs,
    sittingId,
    startedAt: nowIso,
    legs: {},
    writing: null,
    outcomes: {},
  };
  return { state, saved: writeState(storage, state) };
}

/** Change the sitting `sittingId` of `ownerNs`, and only that one. Returns
    the new state, or null (writing nothing) when the stored sitting is
    somebody else's, a different sitting, or absent. */
export function updatePlacementState(
  storage: BrowserStorage | null,
  ownerNs: string,
  sittingId: string,
  change: (state: PlacementStateV1) => PlacementStateV1 | null,
): PlacementStateV1 | null {
  const held = readPlacementState(storage, ownerNs);
  if (!held || held.sittingId !== sittingId) return null;
  const next = change(held);
  if (!next) return null;
  return writeState(storage, next) ? next : null;
}

/** Settle one part's outcome. The first outcome of a part stands: a second
    one (a late grade arriving after the student chose to carry on without
    it, or another tab) is not written over it. */
export function settlePlacementPart(
  storage: BrowserStorage | null,
  ownerNs: string,
  sittingId: string,
  part: PlacementPart,
  outcome: PartOutcome,
): PlacementStateV1 | null {
  return updatePlacementState(storage, ownerNs, sittingId, (state) =>
    state.outcomes[part] ? null : { ...state, outcomes: { ...state.outcomes, [part]: outcome } },
  );
}

/** The part to sit next, or 'done' once every part has an outcome. */
export function currentPlacementPart(state: Pick<PlacementStateV1, 'outcomes'>): PlacementPart | 'done' {
  return PLACEMENT_PARTS.find((part) => !state.outcomes[part]) ?? 'done';
}

/** The plan-evidence session id every event of this sitting carries, so the
    policy counts the four parts as ONE occasion (groupIntoOccasions in
    src/lib/learning/evidence.ts). */
export function placementSessionId(sittingId: string): string {
  return `placement:${sittingId}`;
}

/** What every event of a placement sitting is written with: diagnostic mode
    (the policy caps it at tentative, which is correct for one sitting), the
    sitting's shared session id, and the placement's source key. The mode is
    the only thing that differs from the same surface's ordinary recording;
    where and when it is written never changes. */
export interface PlacementEvidence {
  mode: EvidenceMode;
  sessionId: string;
  sourceMaterial: readonly string[];
}

export function placementEvidence(sittingId: string): PlacementEvidence {
  return {
    mode: 'diagnostic',
    sessionId: placementSessionId(sittingId),
    sourceMaterial: [PLACEMENT_SOURCE_KEY],
  };
}

/* ── The Listening and Reading papers: a third kind of sitting store ─────── */

/** Which placement sitting a paper belongs to: the student who started it and
    the sitting's own id. The same shape as a mock sitting's reference. */
export interface PlacementSittingRef {
  owner: string;
  sittingId: string;
}

function legPart(test: Pick<PracticeTest, 'skill'>): 'listening' | 'reading' {
  return test.skill === 'listening' ? 'listening' : 'reading';
}

/** Where the placement sitting `ref` stands in its student's slot now. */
export function placementSittingStatus(
  ref: PlacementSittingRef,
  storage: BrowserStorage | null = deviceStorage(),
  ownerIsCurrent: (owner: string) => boolean = ownerStillCurrent,
): SittingStatus {
  if (!ownerIsCurrent(ref.owner)) return 'owner-changed';
  if (!storage) return 'no-storage';
  const held = readPlacementState(storage, ref.owner);
  if (!held) return 'absent';
  return held.sittingId === ref.sittingId ? 'held' : 'replaced';
}

/** Whether a storage event another tab raised can concern a placement. */
export function isPlacementStorageKey(key: string | null): boolean {
  return key === null || key === PLACEMENT_STATE_KEY || key.startsWith(`${PLACEMENT_STATE_KEY}${CACHE_NAMESPACE_SEPARATOR}`);
}

/** One paper of a placement sitting, as the test player uses it: restore,
 *  start, save, notice a loss, and finish once handed in. The paper's
 *  answers and deadline are kept INSIDE the placement sitting, never in the
 *  standalone slot, so opening another paper in the meantime cannot touch
 *  them and a placement paper cannot pick up an unrelated one.
 *
 *  `storage` and `ownerIsCurrent` default to this browser's; a test names
 *  its own. */
export function placementLegSitting(
  ref: PlacementSittingRef,
  test: Pick<PracticeTest, 'id' | 'durationMinutes' | 'skill'>,
  deps: { storage?: () => BrowserStorage | null; ownerIsCurrent?: (owner: string) => boolean; now?: () => number } = {},
): PaperSittingStore {
  const storage = deps.storage ?? deviceStorage;
  const ownerIsCurrent = deps.ownerIsCurrent ?? ownerStillCurrent;
  const now = deps.now ?? Date.now;
  const part = legPart(test);
  /* Whether this paper was ever found written down in its sitting: picked
     up, started with a write that landed, or saved. A browser that cannot
     save never reads as having lost it. */
  let everHeld = false;

  const asSession = (leg: PlacementLegV1): TestSession => ({
    version: 1,
    testId: leg.testId,
    /* A placement paper is named by the placement sitting it belongs to. */
    sittingId: ref.sittingId,
    startedAt: leg.startedAt,
    endsAt: leg.endsAt,
    answers: leg.answers,
    owner: ref.owner,
  });

  const heldLeg = (): PlacementLegV1 | null => {
    const held = readPlacementState(storage(), ref.owner);
    if (!held || held.sittingId !== ref.sittingId) return null;
    const leg = held.legs[part];
    return leg && leg.testId === test.id ? leg : null;
  };

  const status = (): SittingStatus => placementSittingStatus(ref, storage(), ownerIsCurrent);

  return {
    load: () => {
      if (!ownerIsCurrent(ref.owner)) return null;
      const leg = heldLeg();
      if (!leg || leg.handedIn) return null;
      everHeld = true;
      return asSession(leg);
    },
    start: () => {
      const startedAt = now();
      const fresh: PlacementLegV1 = {
        testId: test.id,
        startedAt,
        endsAt: startedAt + test.durationMinutes * 60_000,
        answers: {},
        handedIn: false,
      };
      /* A paper already handed in is never started over: a result is not
         sat twice. The write is refused and the clock on screen is the
         fresh one, unsaved, which the player's loss check then stops. */
      const written = updatePlacementState(storage(), ref.owner, ref.sittingId, (state) =>
        state.legs[part]?.handedIn ? null : { ...state, legs: { ...state.legs, [part]: fresh } },
      );
      everHeld = written !== null;
      return asSession(written?.legs[part] ?? fresh);
    },
    save: (answers, sittingOwner, sitting: PaperSittingRef | null) => {
      if (sittingOwner && sittingOwner !== ref.owner) return false;
      if (!ownerIsCurrent(ref.owner)) return false;
      if (sitting && (sitting.testId !== test.id || sitting.sittingId !== ref.sittingId)) return false;
      const written = updatePlacementState(storage(), ref.owner, ref.sittingId, (state) => {
        const leg = state.legs[part];
        if (!leg || leg.testId !== test.id || leg.handedIn) return null;
        return { ...state, legs: { ...state.legs, [part]: { ...leg, answers } } };
      });
      if (written) everHeld = true;
      return written !== null;
    },
    lost: (sittingOwner): SittingLoss | null => {
      if (sittingOwner && sittingOwner !== ref.owner) return null;
      const now = status();
      if (now === 'held' && heldLeg()?.handedIn) return 'handed-in';
      return sittingLossFrom(now, everHeld);
    },
    finish: (sittingOwner, outcome): PaperFinish => {
      if (sittingOwner && sittingOwner !== ref.owner) return 'owner-changed';
      const now = status();
      if (now === 'owner-changed') return 'owner-changed';
      if (now === 'held') {
        const leg = heldLeg();
        if (leg?.handedIn) return 'handed-in';
        const at = new Date().toISOString();
        const written = updatePlacementState(storage(), ref.owner, ref.sittingId, (state) => {
          const held = state.legs[part];
          if (held?.handedIn) return null;
          const legs = held ? { ...state.legs, [part]: { ...held, handedIn: true } } : state.legs;
          const outcomes = state.outcomes[part]
            ? state.outcomes
            : { ...state.outcomes, [part]: { kind: 'scored', raw: outcome.raw, total: outcome.total, at } as PartOutcome };
          return { ...state, legs, outcomes };
        });
        return written ? 'finished' : 'unsaved';
      }
      return sittingLossFrom(now, everHeld) ?? 'unsaved';
    },
  };
}

/* ── A grade that arrived while somebody else was on the page ─────────────── */

/** Settle a Writing or Speaking part from the learner record, when the
 *  record already holds that part's graded evidence for this very sitting
 *  and the resume state does not know it yet.
 *
 *  This happens in one situation: the grade came back after the page had
 *  changed hands. The grade was kept for the student who did the work (both
 *  the essay grader and the live examiner bind their grade to that student,
 *  runOwnedGrade in src/lib/store-owner.ts), but the screen that would have
 *  moved their sitting on was gone. Reading it back here means they are
 *  never asked to write, or speak, and pay for marking, a second time.
 *  Returns the state as it stands afterwards. */
export function reconcilePlacementFromRecord(
  storage: BrowserStorage | null,
  state: PlacementStateV1,
  events: readonly {
    paper?: string;
    sessionId?: string;
    at: string;
    pendingGrading?: boolean;
    outcome: { kind: string; overallBand?: number; grader?: { live: boolean } };
  }[],
): PlacementStateV1 {
  const session = placementSessionId(state.sittingId);
  let current = state;
  for (const part of ['writing', 'speaking'] as const) {
    if (current.outcomes[part]) continue;
    const event = events.find(
      (entry) =>
        entry.sessionId === session &&
        entry.paper === part &&
        entry.outcome.kind === 'graded' &&
        entry.outcome.grader?.live === true &&
        !entry.pendingGrading &&
        typeof entry.outcome.overallBand === 'number',
    );
    if (!event) continue;
    const outcome: PartOutcome = { kind: 'graded', band: event.outcome.overallBand as number, at: event.at };
    current =
      settlePlacementPart(storage, current.owner, current.sittingId, part, outcome) ??
      { ...current, outcomes: { ...current.outcomes, [part]: outcome } };
  }
  return current;
}
