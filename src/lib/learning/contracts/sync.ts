/* Getting the same answer on two devices, without either one losing work.
 *
 * WHAT IS THERE TODAY (src/lib/auth/sync.ts, supabase/schema.sql)
 * One row per user in `user_state`, holding the whole ProgressV1 blob and the
 * whole SavedPlan blob as JSONB. Sign-in pulls, union-merges, writes back
 * locally and pushes. Local edits debounce a push 1.5 seconds later. It
 * works, and three things about it do not:
 *
 *   1. mergeStudyPlans (src/lib/study-plan.ts:190) is last-write-wins on
 *      `createdAt`, so an old tab can push a stale plan over a newer one.
 *   2. Vocabulary review state (ielts.vocab.v1), notes and saved lessons
 *      (ielts.notes.v1) are not synced at all.
 *   3. stopSync (src/lib/auth/sync.ts:96) leaves local data on the device,
 *      and the localStorage keys are not scoped by user, so signing in as a
 *      second student on the same browser merges the first student's work
 *      into the second account.
 *
 * THIS CONTRACT FIXES ALL THREE
 *   - evidence events merge as a UNION BY ID, which makes a retry free and
 *     two devices commutative;
 *   - the plan uses revision-based optimistic concurrency with the SERVER as
 *     the authority for a confirmed plan, so a stale device is rejected
 *     rather than accepted;
 *   - every browser cache is namespaced by user id, and anonymous work is
 *     claimed into an account only through an explicit step the student
 *     takes.
 *
 * THE OLD STORES ARE NOT DESTROYED. `user_state.progress` and
 * `user_state.study_plan` keep syncing exactly as they do now, so the
 * existing history screens keep working while the new tables fill up beside
 * them.
 */

import type { LearnerRecordV1, EvidenceEvent } from './evidence';
import type { PersonalPlanV1 } from './plan';

/* ── Envelopes ───────────────────────────────────────────────────────────── */

/** Appending evidence. Idempotent by construction: the server stores by
    event id, and an id it already has is a no-op, not a duplicate. */
export interface EvidencePushRequest {
  kind: 'evidence-push';
  /** Up to EVIDENCE_BATCH_MAX events. Order does not matter. */
  events: readonly EvidenceEvent[];
  /** The highest evidence version this device believes it has seen, so the
      server can tell it what it is missing. */
  knownEvidenceVersion: number;
}

export interface EvidencePushReply {
  kind: 'evidence-push';
  /** Ids the server stored for the first time. */
  accepted: readonly string[];
  /** Ids it already held. Not an error. */
  duplicates: readonly string[];
  /** Ids it refused, with a reason, so nothing fails silently. */
  rejected: readonly { id: string; reason: EvidenceRejection }[];
  evidenceVersion: number;
}

export type EvidenceRejection =
  | 'malformed'
  | 'unknown-activity'
  | 'unknown-content-version'
  | 'not-owner'
  | 'too-old'
  | 'too-large';

/** Catching up. Pull everything after a version rather than the whole log. */
export interface EvidencePullRequest {
  kind: 'evidence-pull';
  sinceEvidenceVersion: number;
}

export interface EvidencePullReply {
  kind: 'evidence-pull';
  events: readonly EvidenceEvent[];
  evidenceVersion: number;
  /** True when more remain; call again with the new version. */
  more: boolean;
}

/** Writing the plan. The revision is the whole concurrency story. */
export interface PlanPushRequest {
  kind: 'plan-push';
  plan: PersonalPlanV1;
  /** The revision this device believes the server holds. The server accepts
      the write only when it matches; anything else is a conflict. */
  expectedRevision: number;
}

export type PlanPushReply =
  | { kind: 'plan-push'; result: 'accepted'; revision: number }
  /** The server is ahead. It hands back what it holds; the device rebuilds
      from that and may try again. A confirmed server plan always wins over
      an unconfirmed local one. */
  | { kind: 'plan-push'; result: 'conflict'; serverPlan: PersonalPlanV1; revision: number }
  | { kind: 'plan-push'; result: 'rejected'; reason: PlanRejection };

export type PlanRejection = 'malformed' | 'not-owner' | 'stale-evidence-version' | 'too-large';

/** The companion stores that must travel with the record: vocabulary review
    state, saved lessons and notes, and the learning preferences that are not
    part of the plan. All three are union-merged by their own natural key. */
/** The companion documents that travel by kind, one row each in
    learning_companions. Free text in the database on purpose (see
    supabase/migrations/2026-09-21-learning.sql), so adding a kind later is a
    row shape and never a migration. These three are what the browser holds
    today; what Mr EZ remembers lives server side in mr_ez_conversations and
    is written by the Worker, so it is deliberately not one of them. */
export type CompanionKind = 'vocab' | 'notes' | 'preferences';

export const COMPANION_KINDS: readonly CompanionKind[] = ['vocab', 'notes', 'preferences'] as const;

export interface CompanionSyncPayload {
  /** Word to scheduling state, exactly VocabStoreV1.cards today. Merged per
      word by taking the most recently reviewed side. */
  vocab?: Readonly<Record<string, unknown>>;
  /** Bookmarks and per-lesson notes, from ielts.notes.v1. Merged by
      (kind, id), most recently updated wins. */
  notes?: Readonly<Record<string, unknown>>;
  /** Interface language and anything else the student chose that is not a
      plan constraint. */
  preferences?: Readonly<Record<string, unknown>>;
}

export interface SyncEnvelopeV1 {
  version: 1;
  /** Server clock at the time of the reply, so a device with a wrong clock
      cannot decide it is ahead. */
  serverTime: string;
  record?: LearnerRecordV1;
  plan?: PersonalPlanV1;
  companions?: CompanionSyncPayload;
}

/* ── Local state, per user ───────────────────────────────────────────────── */

/** Who this browser's cached learning state belongs to. Every namespaced key
    carries it, and a mismatch means the cache belongs to someone else and is
    not read. */
export type CacheOwner =
  | { kind: 'anonymous'; deviceId: string }
  | { kind: 'user'; userId: string };

/** What the interface must be able to say honestly at any moment. Pending is
    shown, never hidden behind an optimistic tick. */
export interface SyncStatus {
  state: 'offline' | 'syncing' | 'synced' | 'conflict' | 'error' | 'signed-out';
  /** Events written locally and not yet acknowledged by the server. */
  pendingEvents: number;
  /** Plan revisions written locally and not yet acknowledged. */
  planPending: boolean;
  /** Submissions waiting on a grader. Distinct from a sync problem, and the
      student is told which it is. */
  pendingGrading: number;
  lastSyncedAt: string | null;
  /** Present when state is 'error', as a code the interface has wording for. */
  error?: EvidenceRejection | PlanRejection | 'network' | 'not-configured';
  /** When the student's plan was last replaced by a newer one from another
      device. Architecture risk 4: a plan edited in two places means one edit
      loses, and the interface must SAY so rather than reconcile silently.
      Set together with state 'conflict', and both stay until the interface
      calls acknowledgePlanChange(), so a later successful push cannot swallow
      the message before the student has seen it. */
  planChangedElsewhereAt?: string;
  /** True when the account's learning tables are not there to sync with, so
      this device is working on its own. Not an error the student caused, and
      not a reason to keep retrying: the layer stops until the next sign-in.
      Reported with state 'error' and error 'not-configured'. */
  unavailable?: boolean;
}

/** Whether the browser copy of the learner record actually reached this
    device's storage.
      saved-locally  the last write landed, and the next one will too
      memory-only    it did not, so this session's work is held in memory and
                     will be gone when the tab closes. The interface says so
                     plainly rather than showing a tick it has not earned. */
export type LocalPersistence = 'saved-locally' | 'memory-only';

/** Why a local write did not land, as a code the interface has wording for.
      quota        the browser is full
      blocked      storage is switched off or refused (private mode, policy)
      unavailable  there is no browser storage here at all (server render) */
export type LocalWriteProblem = 'quota' | 'blocked' | 'unavailable';

/** What the browser copy of one student's record can honestly say about
    itself at any moment. Separate from SyncStatus on purpose: "not saved on
    this device" and "not yet sent to your account" are different sentences,
    and a student is owed the right one. */
export interface LearnerStoreStatus {
  owner: CacheOwner;
  persistence: LocalPersistence;
  /** Present only when persistence is 'memory-only'. */
  problem?: LocalWriteProblem;
  /** Events held in the browser copy right now. */
  events: number;
  /** Events folded into tallies by the local soft cap and no longer held in
      full here. The server keeps them. */
  summarised: number;
  evidenceVersion: number;
  /** True once the one-time ProgressV1 migration has run for this owner. */
  migrated: boolean;
  /** True when the old stores on this device were already migrated into a
      different owner's record, so they are deliberately not read again. The
      work is not lost: it belongs to that other record, and the explicit
      ownership claim is how it moves. */
  legacyHeldByAnotherOwner: boolean;
  /** Reserved for the sync layer (work package 14). Null until it sets one;
      nothing here invents a sync state it cannot observe. */
  sync: SyncStatus | null;
}

/** What an anonymous record on this device contains, so the screen offering
    the claim can state it rather than asking the student to take it on
    trust. Null `lastAt` means there is nothing dated in it. */
export interface AnonymousWorkOffer {
  deviceId: string;
  summary: OwnershipClaim['summary'];
  lastAt: string | null;
}

export type OwnershipClaimOutcome =
  /** The work is now in the signed-in student's record. */
  | 'claimed'
  /** There was nothing to claim, which is also what a second claim of the
      same work sees. Not an error. */
  | 'nothing-to-claim'
  /** Nobody is signed in, so there is no account to claim it into. */
  | 'not-signed-in';

export interface OwnershipClaimResult {
  outcome: OwnershipClaimOutcome;
  /** What was agreed to, when something was. */
  claim: OwnershipClaim | null;
  /** Events the account did not already hold. Claiming twice adds none,
      because the union is by event id. */
  newEvents: number;
}

/** What the four OLDER stores on this device hold for one owner, counted so
    the claim screen can state it in plain words before the student agrees.
 *
 * Added 22 September 2026 with the account-isolation fix: those stores are
 * now owned like everything else, so the explicit claim has to cover them
 * too, and a student deciding about "the work I did before signing in" is
 * owed a real list rather than a number of events. */
export interface LegacyWorkCounts {
  /** Reading and listening papers and drills sat. */
  testAttempts: number;
  /** Essays submitted for marking. */
  essays: number;
  /** Of those essays, how many still have their full marked report. */
  savedReports: number;
  speakingResults: number;
  /** A target band and exam date saved on this device. */
  hasPlan: boolean;
  /** Vocabulary words with review history. */
  vocabularyWords: number;
  savedLessons: number;
  notes: number;
}

export function emptyLegacyWorkCounts(): LegacyWorkCounts {
  return {
    testAttempts: 0,
    essays: 0,
    savedReports: 0,
    speakingResults: 0,
    hasPlan: false,
    vocabularyWords: 0,
    savedLessons: 0,
    notes: 0,
  };
}

export function hasLegacyWork(counts: LegacyWorkCounts): boolean {
  return (
    counts.testAttempts > 0 ||
    counts.essays > 0 ||
    counts.speakingResults > 0 ||
    counts.hasPlan ||
    counts.vocabularyWords > 0 ||
    counts.savedLessons > 0 ||
    counts.notes > 0
  );
}

/** The explicit step by which work done signed out becomes part of an
    account. Never automatic: the student is shown what would be claimed and
    says yes. */
export interface OwnershipClaim {
  /** The anonymous device whose work is being claimed. */
  deviceId: string;
  /** What the student is agreeing to, counted so the screen can state it. */
  summary: {
    events: number;
    lessonsStudied: number;
    attempts: number;
    hasPlan: boolean;
    /** The older stores, when this device has any of them for that owner.
        Optional so a caller written before this existed still type-checks
        and still reads the four fields above unchanged. */
    legacy?: LegacyWorkCounts;
  };
  /** What happens to the account's existing work. Events always union; the
      plan is the only thing that can collide. */
  planResolution: 'keep-account-plan' | 'adopt-device-plan';
  claimedAt: string;
}

/* ── Named constants ─────────────────────────────────────────────────────── */

/** Namespace every learning cache key with the owner, so signing in as a
    second student on one browser cannot inherit the first one's work.
    Produces e.g. 'ielts.learning.record.v1::u:9f0c...'. Existing keys
    (ielts.progress.v1 and the rest) are deliberately left alone. */
export const CACHE_NAMESPACE_SEPARATOR = '::';
export const ANONYMOUS_NAMESPACE_PREFIX = 'anon:';
export const USER_NAMESPACE_PREFIX = 'u:';

/** Stable id for this browser while signed out, so anonymous work has an
    owner to claim from. */
export const DEVICE_ID_KEY = 'ielts.device.v1';

/** Which owner the OLD stores on this browser (ielts.progress.v1 and
    ielts.studyplan.v1) were migrated into. Deliberately NOT namespaced:
    those stores are one shared pile with no owner written on them, so the
    first record to migrate them claims them and a second student signing in
    on the same browser does not inherit them. The old stores themselves are
    never modified or removed.
 *
 * Since 23 September 2026 the same file ALSO carries, under `migrated`, the
 * owners whose record has already had those stores carried into it and the
 * stamp of the run that did it. That fact cannot live only in the record,
 * because sign-out deliberately removes the record from the device once the
 * account has everything, and a second migration on the next sign-in writes
 * a `legacy:` copy of work the recorders have since written themselves. Both
 * fields are optional and read defensively; see the LegacyDeviceStamp note in
 * src/lib/learning/store.browser.ts, which owns the shape. */
export const LEGACY_MIGRATION_OWNER_KEY = 'ielts.learning.legacy.v1';

/** Which owners have already taken their copy of the old device-wide stores
    (`ielts.progress.v1`, `ielts.studyplan.v1`, `ielts.vocab.v1`,
    `ielts.notes.v1`) into their own namespaced key.
 *
 * Added 22 September 2026, with the fix for finding 1 of that day's review:
 * those four stores are now scoped by owner like everything else, and the
 * old device-wide value is copied into the rightful owner's key ONCE.
 * LEGACY_MIGRATION_OWNER_KEY above says WHOSE that value is; this says
 * whether it has already been taken, so a student who later clears their own
 * scoped copy does not silently get the old pile back. The device-wide keys
 * themselves are never modified and never removed. */
export const LEGACY_ADOPTION_KEY = 'ielts.learning.legacy.adopted.v1';

/** What was decided about the anonymous record on this device, per owner:
    claimed, or declined. Once any account has decided, no other account is
    offered that work, which is what stops a second student inheriting the
    first one's anonymous session. Cleared when a claim empties the
    anonymous record, because there is then nothing left to decide about. */
export const OWNERSHIP_DECISION_KEY = 'ielts.learning.claim.v1';

/** Events sent in one push. Keeps a request well inside the Worker's body
    limit (MAX_BODY_BYTES in src/lib/tutor/schema.ts is 32 KB). */
export const EVIDENCE_BATCH_MAX = 50;

/** Debounce before a push, in milliseconds. Same value the current sync
    layer uses, for the same reason: a burst of ticks is one write. */
export const SYNC_DEBOUNCE_MS = 1500;

/** How long a device keeps retrying a failed push before it tells the
    student plainly that their work is only on this device. */
export const SYNC_RETRY_WINDOW_MS = 5 * 60 * 1000;

/** First retry delay after a failed push, then doubling. */
export const SYNC_BACKOFF_BASE_MS = 1000;

/** The longest a device ever waits between retries. A ceiling rather than an
    ever-growing wait: a laptop that was shut for a week should come back
    within a minute of the network returning, and a minute apart is not a
    retry storm. */
export const SYNC_BACKOFF_CEILING_MS = 60 * 1000;

/** Where this device keeps its own note of what the server has already
    acknowledged. Namespaced by owner exactly like the record and the plan:
    'ielts.learning.sync.v1::u:<userId>'. It holds ids waiting to be sent,
    not evidence, so losing it costs one extra push and never any work. */
export const SYNC_STATE_KEY = 'ielts.learning.sync.v1';

/** The rule that decides a plan conflict, stated once so every caller and
    every test agrees:
      1. a CONFIRMED plan beats an unconfirmed one;
      2. otherwise the higher `revision` wins;
      3. on an exact tie, the later `updatedAt` wins;
      4. the loser's change history is preserved by appending its entries. */
export const PLAN_CONFLICT_RULE = 'confirmed > revision > updatedAt, history merged' as const;
