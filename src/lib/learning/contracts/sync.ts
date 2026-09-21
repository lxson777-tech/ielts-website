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

/** Events sent in one push. Keeps a request well inside the Worker's body
    limit (MAX_BODY_BYTES in src/lib/tutor/schema.ts is 32 KB). */
export const EVIDENCE_BATCH_MAX = 50;

/** Debounce before a push, in milliseconds. Same value the current sync
    layer uses, for the same reason: a burst of ticks is one write. */
export const SYNC_DEBOUNCE_MS = 1500;

/** How long a device keeps retrying a failed push before it tells the
    student plainly that their work is only on this device. */
export const SYNC_RETRY_WINDOW_MS = 5 * 60 * 1000;

/** The rule that decides a plan conflict, stated once so every caller and
    every test agrees:
      1. a CONFIRMED plan beats an unconfirmed one;
      2. otherwise the higher `revision` wins;
      3. on an exact tie, the later `updatedAt` wins;
      4. the loser's change history is preserved by appending its entries. */
export const PLAN_CONFLICT_RULE = 'confirmed > revision > updatedAt, history merged' as const;
