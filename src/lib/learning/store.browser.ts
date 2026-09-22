/* The learner record in the browser: one student's evidence, under a key
 * that names its owner.
 *
 * WHY THE KEY CARRIES AN OWNER
 * The older stores on this site (ielts.progress.v1 and the rest) used to be
 * one shared pile with nobody's name on it, so signing in as a second
 * student on the same browser folded the first student's work into the
 * second account (architecture section 1.4, finding R7.4-account-isolation).
 * Nothing here can read a record that does not belong to the owner it was
 * opened for: the owner is part of the key, and changing owner throws the
 * loaded copy away rather than carrying it across.
 *
 * SINCE 22 SEPTEMBER 2026 THE OLDER STORES WORK THE SAME WAY. The rule moved
 * into src/lib/store-owner.ts, which this file now shares with progress.ts,
 * study-plan.ts, vocab-review.ts and notes.ts: one current owner, one set of
 * scoped keys, one one-time move of the old device-wide values into the
 * owner the device says they belong to. That is why the anonymous-work claim
 * below now carries those stores too.
 *
 * WHAT THIS FILE IS ALLOWED TO DO
 * Storage, and the bookkeeping that needs storage. Every judgement about
 * what evidence means lives in evidence.ts and policy.ts, which are pure and
 * shared with the Mr EZ Worker. The recorders below build an event through
 * createEvidenceEvent and append it, and that is all they do.
 *
 * WRITES NEVER THROW INTO THE INTERFACE
 * A full or blocked browser store degrades to an in-memory record for the
 * session, and the status says so in a word the interface has wording for
 * ('memory-only'). A student is never shown a tick that did not happen.
 *
 * SERVER RENDER SAFE
 * Importing this module under Node, in the Astro build, or in the Worker
 * touches no browser API. Everything resolves storage lazily, inside a
 * function, behind a typeof check.
 *
 * THE PLAN IS AT THE BOTTOM
 * Plan persistence (PersonalPlanV1, its revision, the derived SavedPlan the
 * old screens still read) sits in its own section at the end of this file,
 * beside the record so one owner namespace covers both. It stores and it
 * notifies; it never decides. Every call to replan() lives in
 * src/lib/learning/index.ts, which is what makes the active session stable.
 */

import type { Locale } from '../i18n/locale';
import { getProgressFor, type ProgressV1 } from '../progress';
import { loadStudyPlanFor, saveStudyPlanFor, type SavedPlan } from '../study-plan';
import {
  NOTES_STORE_KEY,
  VOCAB_STORE_KEY,
  announceStoresChanged,
  anonymousOwner,
  claimLegacyStores,
  currentOwner,
  deviceIdFrom,
  deviceStorage,
  ownerNamespace,
  readScopedRaw,
  resetStoreOwnerForTest,
  safeGet,
  safeRemove,
  setCurrentOwner,
  type BrowserStorage,
} from '../store-owner';
import {
  derivedSavedPlan,
  lessonMapsFor,
  planSettingsFromSavedPlan,
  type LegacyPlanSettings,
} from './adapters';
import type { LearningCatalogueV1, Paper, Subskill } from './contracts/catalog';
import type { PersonalPlanV1, PlanSession } from './contracts/plan';
import { PERSONAL_PLAN_KEY } from './contracts/plan';
import type {
  AssistanceLevel,
  CompletionState,
  EvidenceEvent,
  EvidenceMode,
  EvidenceProvenance,
  GradedResult,
  LearnerRecordV1,
  MigrationStamp,
  SelfReportedScore,
} from './contracts/evidence';
import {
  LEARNER_RECORD_KEY,
  LOCAL_EVENT_SOFT_CAP,
  MIGRATION_VERSION,
  QUOTA_RETRY_EVENT_CAP,
  UNCLASSIFIED_LESSON_SUBSKILL,
  WHOLE_ACTIVITY_SUBSKILL,
} from './contracts/evidence';
import type {
  AnonymousWorkOffer,
  CacheOwner,
  LearnerStoreStatus,
  LocalPersistence,
  LocalWriteProblem,
  OwnershipClaim,
  OwnershipClaimResult,
  SyncStatus,
} from './contracts/sync';
import {
  CACHE_NAMESPACE_SEPARATOR,
  LEGACY_MIGRATION_OWNER_KEY,
  OWNERSHIP_DECISION_KEY,
  emptyLegacyWorkCounts,
  hasLegacyWork,
  type LegacyWorkCounts,
} from './contracts/sync';
import {
  appendAllEvidence,
  applySoftCap,
  canonicalJson,
  createEvidenceEvent,
  emptyLearnerRecord,
  evidenceEventId,
  mergeLearnerRecords,
  paperExposureKey,
  promptExposureKey,
  recordSelfReportedScore,
  type EvidenceDraft,
  type ItemOutcomeDraft,
} from './evidence';
import { DEFAULT_LESSON_MINUTES, migrateInto, needsMigration } from './migrate';

/* ── The little bit of the browser this file needs ───────────────────────── */

/* Storage access and the owner helpers live in src/lib/store-owner.ts, which
   the four older stores share with this one: there is exactly one answer to
   "whose work is this" on a device, and one place that knows how to reach
   storage safely. They are re-exported here because this module's own
   callers have always imported them from it. */
export type { BrowserStorage };
export {
  FALLBACK_DEVICE_ID,
  anonymousOwner,
  deviceIdFrom,
  ownerNamespace,
  userOwner,
} from '../store-owner';

/** 'quota' when the browser is simply full, 'blocked' when it refused. The
    two read differently to a student, so they are told apart here rather
    than lumped together as "could not save". */
function writeProblemOf(error: unknown): LocalWriteProblem {
  const name = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /quota|exceeded|full/i.test(name) ? 'quota' : 'blocked';
}

/* ── Keys ────────────────────────────────────────────────────────────────── */

/** 'ielts.learning.record.v1::u:<userId>'. Nothing reads a record without
    naming an owner, so one student's key can never produce another's rows. */
export function learnerRecordKey(owner: CacheOwner): string {
  return `${LEARNER_RECORD_KEY}${CACHE_NAMESPACE_SEPARATOR}${ownerNamespace(owner)}`;
}

/* ── Reading a stored record back ────────────────────────────────────────── */

/** A quick shape check, not the full validator.
 *
 * validateEvidenceEvent walks every field of every event, including the
 * raw-audio scan, which is right for anything arriving from another device
 * and far too much work for first paint with thousands of rows. What is
 * needed here is only that a hand-edited or half-written row cannot reach
 * the policy as if it were evidence, so a row missing any of the fields
 * every reader dereferences is dropped. The sync layer validates properly. */
function looksLikeEvent(value: unknown): value is EvidenceEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<EvidenceEvent>;
  return (
    typeof event.id === 'string' &&
    event.id.length > 0 &&
    typeof event.activityId === 'string' &&
    typeof event.at === 'string' &&
    typeof event.subskill === 'string' &&
    typeof event.mode === 'string' &&
    typeof event.completion === 'string' &&
    typeof event.assistance === 'string' &&
    typeof event.provenance === 'string' &&
    typeof event.seenBefore === 'boolean' &&
    !!event.outcome &&
    typeof event.outcome === 'object'
  );
}

function parseRecord(raw: string | null): LearnerRecordV1 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LearnerRecordV1>;
    if (parsed?.version !== 1 || !Array.isArray(parsed.events)) return null;
    const events = parsed.events.filter(looksLikeEvent);
    return {
      version: 1,
      evidenceVersion: typeof parsed.evidenceVersion === 'number' ? parsed.evidenceVersion : events.length,
      events,
      summaries: Array.isArray(parsed.summaries) ? parsed.summaries : [],
      exposure: Array.isArray(parsed.exposure) ? parsed.exposure : [],
      selfReported: Array.isArray(parsed.selfReported) ? parsed.selfReported : [],
      migration: (parsed.migration as MigrationStamp | null) ?? null,
    };
  } catch {
    /* Corrupt JSON reads as no record at all, the same way getProgress does.
       Nothing is overwritten until the student does something worth saving. */
    return null;
  }
}

/* ── What the recorders take ─────────────────────────────────────────────── */

/** The part every recorder shares: which catalogue activity this is evidence
    about, and the context the surface knows. */
export interface RecordingContext {
  activityId: string;
  /** The activity's contentVersion at the time. Evidence about version 1 is
      not evidence about version 2. */
  contentVersion?: number;
  paper?: Paper;
  /** The instant the work finished. Defaults to now. */
  at?: string;
  /** The plan session this was done inside, when it was one. Voluntary work
      outside the plan leaves it undefined and is still recorded. */
  sessionId?: string;
  locale?: Locale;
  /** One value per user action. Two genuinely separate attempts that share
      an activity, a millisecond and an answer need this to stay two rows. */
  idempotencyKey?: string;
  /** Set this when the surface knows which earlier event this is a second go
      at. Left out, an item already answered is linked automatically, so a
      retry can never be written as if it were a first answer. */
  retryOf?: string;
  /** Set when this corrects an earlier row that was written wrong, such as a
      grade arriving after a pending placeholder. */
  supersedes?: string;
  /** Exposure keys for material met that the items do not already name. */
  sourceMaterial?: readonly string[];
  /** 'simulated' for anything the local stand-in produced, so it is excluded
      from every ability estimate and can never be shown as live. */
  provenance?: EvidenceProvenance;
}

export interface LessonStudiedInput extends Omit<RecordingContext, 'activityId'> {
  /** The lesson's progress key, for example 'reading-matching-headings'. */
  lessonKey: string;
  /** Overrides the 'lesson:<key>' id, which is the convention the migration
      and the catalogue both use. */
  activityId?: string;
  /** From the catalogue. Left out, the completion is filed under
      UNCLASSIFIED_LESSON_SUBSKILL, which decides a heading and nothing else:
      a completion click is `studied` and can never move an estimate. */
  subskill?: Subskill;
  /** What the platform estimated for it. Never presented as measured. */
  estimatedMinutes?: number;
  mode?: EvidenceMode;
}

export interface LessonCheckAnswerInput extends RecordingContext {
  subskill: Subskill;
  /** The one answer, as the student first gave it, with whatever help they
      had before it was settled. */
  item: ItemOutcomeDraft;
  mode?: EvidenceMode;
  completion?: CompletionState;
  /** The paper this question was lifted from, so sitting that paper later is
      correctly marked as material already met. */
  sourceTestId?: string;
}

export interface SubmissionInput extends RecordingContext {
  /** A whole drill or paper has no single subskill: the breakdown is in the
      items and in bySubskill. Defaults to WHOLE_ACTIVITY_SUBSKILL. */
  subskill?: Subskill;
  items: readonly ItemOutcomeDraft[];
  /** 'practice' for a drill, 'assessment' for a timed paper, 'diagnostic'
      for a sample taken to find out where the student is. */
  mode?: EvidenceMode;
  completion?: CompletionState;
  /** Highest help used anywhere in the attempt. Derived from the items when
      left out, and never lower than they admit to. */
  assistance?: AssistanceLevel;
  /** Counted from the items when left out. */
  raw?: number;
  total?: number;
  /** Only for a complete paper. A thirteen-question drill has no band. */
  bandEstimate?: number;
  bySubskill?: Readonly<Record<string, { correct: number; total: number }>>;
  secondsUsed?: number;
  sourceTestId?: string;
}

export interface GradedTaskInput extends RecordingContext {
  subskill?: Subskill;
  overallBand: number;
  criteria: Readonly<Record<string, number>>;
  /** Which grader, and whether it was live. A stub grade is kept for the
      student's history and never becomes ability evidence. */
  grader: { name: string; live: boolean };
  legacyRef?: GradedResult['legacyRef'];
  wordCount?: number;
  /** The prompt or cue card, so meeting it again is marked seen. */
  promptId?: string;
  mode?: EvidenceMode;
  completion?: CompletionState;
  assistance?: AssistanceLevel;
  /** True while marking has been asked for and has not come back, so the
      interface can say "waiting for marking" instead of showing nothing. */
  pendingGrading?: boolean;
}

export interface WritingGradedInput extends GradedTaskInput {
  task?: 'task1' | 'task2';
}

export interface SpeakingGradedInput extends GradedTaskInput {
  part?: 1 | 2 | 3;
}

export interface VocabularyReviewInput extends RecordingContext {
  subskill?: Subskill;
  words: readonly { word: string; correct: boolean; direction: 'recognise' | 'recall' | 'use' }[];
  reviewed?: number;
  correct?: number;
  mode?: EvidenceMode;
  completion?: CompletionState;
  assistance?: AssistanceLevel;
}

export interface ObjectiveJudgedInput extends RecordingContext {
  /** The one objective that was judged. Deliberately not a band and not a
      criterion score. */
  subskill: Subskill;
  met: boolean;
  feedback?: string;
  /** True when a model wrote the judgement rather than code. */
  byModel: boolean;
  mode?: EvidenceMode;
  completion?: CompletionState;
  assistance?: AssistanceLevel;
}

export interface UnfinishedAttemptInput extends RecordingContext {
  subskill?: Subskill;
  /** 'abandoned' for walking away, 'blank' for submitting nothing, 'expired'
      for running out of time, 'partial' for stopping part way. None of them
      is read as a bad result. */
  completion?: Extract<CompletionState, 'abandoned' | 'blank' | 'partial' | 'expired'>;
  mode?: EvidenceMode;
  /** Whatever was answered before it stopped, when the surface has it. */
  items?: readonly ItemOutcomeDraft[];
  raw?: number;
  total?: number;
  secondsUsed?: number;
  /** Recorded even so: opening a paper and walking away still means the
      passage was seen, and a later sitting of it is not fresh evidence. */
  sourceTestId?: string;
}

/* ── The store ───────────────────────────────────────────────────────────── */

/** A value, or a function that produces it when it is wanted. The catalogue
    maps below take either, so a page that only has the catalogue after the
    store was created can still hand it over in time for the migration. */
export type Provided<T> = T | (() => T);

function provided<T>(value: Provided<T> | undefined, fallback: T): T {
  if (value === undefined) return fallback;
  return typeof value === 'function' ? (value as () => T)() : value;
}

export interface LearnerStoreOptions {
  /** Whose record this is. Defaults to this device's anonymous owner. */
  owner?: CacheOwner;
  /** Where it is kept. Defaults to this browser's own store, and to nothing
      at all when there is no browser. */
  storage?: BrowserStorage | null;
  /** The clock, for tests and for two devices producing identical output. */
  now?: () => string;
  /** Lesson key to the subskill it teaches, from the catalogue, for the
      one-time migration of old completions. Injected rather than imported:
      the catalogue is a separate work package, and a completion is
      `studied` either way, so an absent map costs a heading and nothing
      more. */
  lessonSubskills?: Provided<Readonly<Record<string, Subskill>>>;
  /** Lesson key to its estimated minutes, same source, same reason. */
  lessonMinutes?: Provided<Readonly<Record<string, number>>>;
  /** The old stores, read as plain objects, for ONE named owner. Defaults to
      the real ielts.progress.v1 and ielts.studyplan.v1 as that owner holds
      them, which are only ever READ.
   *
   * It takes the owner because two different owners are read: the store's
   * own, for the one-time migration, and the anonymous device owner's, when
   * describing what a claim would carry. A test may ignore the argument. */
  legacy?: (owner: CacheOwner) => { progress: ProgressV1 | null; plan: SavedPlan | null };
  /** Events kept in full in the browser before the oldest fold into
      tallies. */
  softCap?: number;
  /** Called when a draft was refused, which is a bug in the calling surface
      rather than anything a student did. Defaults to a console warning. */
  onRefused?: (draft: EvidenceDraft, problem: string) => void;
}

export interface LearnerStore {
  /** Whose record is loaded. */
  owner(): CacheOwner;
  /** The record, synchronously, for first paint. Loads and runs the one-time
      migration the first time it is called. */
  read(): LearnerRecordV1;
  /** Read storage again, discarding the loaded copy. */
  reload(): LearnerRecordV1;
  status(): LearnerStoreStatus;
  /** Sign-in, sign-out (pass null) or account switch. The previous
      student's record is dropped, never carried over. */
  setOwner(owner: CacheOwner | null): LearnerRecordV1;
  /** Subscribe to writes. Returns an unsubscribe, same shape as
      onProgressChange. */
  subscribe(listener: () => void): () => void;
  /** The sync layer's own status, once there is one (work package 14). */
  setSyncStatus(status: SyncStatus | null): void;

  recordEvents(drafts: readonly EvidenceDraft[]): EvidenceEvent[];
  recordEvent(draft: EvidenceDraft): EvidenceEvent | null;
  /** Fold events that came back from this student's own account into the
      browser copy, as a union by id, and say how many were new.
   *
   * The one way the sync layer (work package 14) writes events it did not
   * record itself. It is a union, so pulling the same log twice changes
   * nothing, and it cannot invent a retry link: an event arriving from
   * another device already carries whatever link it was recorded with.
   *
   * Validation belongs to the caller. `src/lib/learning/sync.browser.ts`
   * runs validateEvidenceEvent and the raw-audio check on every row before
   * it gets here, which is exactly what the note on looksLikeEvent above
   * promises. */
  mergeRemoteEvents(events: readonly EvidenceEvent[]): number;
  recordLessonStudied(input: LessonStudiedInput): EvidenceEvent | null;
  recordLessonCheckAnswer(input: LessonCheckAnswerInput): EvidenceEvent | null;
  recordSubmission(input: SubmissionInput): EvidenceEvent | null;
  recordWritingGraded(input: WritingGradedInput): EvidenceEvent | null;
  recordSpeakingGraded(input: SpeakingGradedInput): EvidenceEvent | null;
  recordVocabularyReview(input: VocabularyReviewInput): EvidenceEvent | null;
  recordObjectiveJudged(input: ObjectiveJudgedInput): EvidenceEvent | null;
  recordUnfinishedAttempt(input: UnfinishedAttemptInput): EvidenceEvent | null;
  /** What the student says they scored. Kept apart from what was measured,
      and labelled that way forever. */
  recordSelfReported(score: Omit<SelfReportedScore, 'id'> & { id?: string }): SelfReportedScore | null;

  /** What an anonymous record on this device holds, or null when there is
      nothing to offer this owner. `includeDeclined` returns work this same
      owner already said no to, for an explicit "restore what I did before
      signing in" action; work another account has decided about is never
      returned, whatever is passed. */
  describeAnonymousWork(options?: { includeDeclined?: boolean }): AnonymousWorkOffer | null;
  /** Take it into the signed-in student's record. Union by id, so claiming
      twice is harmless. */
  claimAnonymousWork(options?: { planResolution?: OwnershipClaim['planResolution'] }): OwnershipClaimResult;
  /** Leave it. Recorded, so the student is not asked again and no other
      account is offered it. */
  declineAnonymousWork(): void;
  /** Remove one owner's cached record from this device. Never called on its
      own: it exists for the sync layer's sign-out on a shared machine. */
  forgetOwner(owner: CacheOwner): void;
}

const CONSOLE_PREFIX = 'learner record:';

export function createLearnerStore(options: LearnerStoreOptions = {}): LearnerStore {
  const now = options.now ?? (() => new Date().toISOString());
  const softCap = options.softCap ?? LOCAL_EVENT_SOFT_CAP;
  const readLegacy =
    options.legacy ?? ((of: CacheOwner) => ({ progress: getProgressFor(of), plan: loadStudyPlanFor(of) }));
  const onRefused =
    options.onRefused ??
    ((draft: EvidenceDraft, problem: string) => {
      if (typeof console !== 'undefined') console.warn(`${CONSOLE_PREFIX} ${draft.activityId} was not recorded: ${problem}`);
    });

  /* Resolved once, so a store handed a memory stand-in never reaches for the
     real one and a store made during a server render never reaches at all. */
  const storage: BrowserStorage | null = options.storage === undefined ? deviceStorage() : options.storage;

  let owner: CacheOwner = options.owner ?? anonymousOwner(deviceIdFrom(storage));
  let record: LearnerRecordV1 = emptyLearnerRecord();
  let loaded = false;
  let persistence: LocalPersistence = storage ? 'saved-locally' : 'memory-only';
  let problem: LocalWriteProblem | undefined = storage ? undefined : 'unavailable';
  let legacyHeldByAnotherOwner = false;
  let sync: SyncStatus | null = null;
  const listeners = new Set<() => void>();

  /* ── storage ── */

  function notify(): void {
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        /* A listener throwing must not break the writer. */
      }
    }
  }

  function write(): void {
    if (!storage) {
      persistence = 'memory-only';
      problem = 'unavailable';
      return;
    }
    const key = learnerRecordKey(owner);
    try {
      storage.setItem(key, JSON.stringify(record));
      persistence = 'saved-locally';
      problem = undefined;
      return;
    } catch (error) {
      const why = writeProblemOf(error);
      /* Out of room is the one failure the record can do something about:
         fold the oldest events into tallies and try once more. The counts
         survive, the item detail does not, and the server keeps everything
         (risk 1 in the architecture). */
      if (why === 'quota') {
        const compacted = applySoftCap(record, QUOTA_RETRY_EVENT_CAP);
        if (compacted !== record) {
          try {
            storage.setItem(key, JSON.stringify(compacted));
            record = compacted;
            persistence = 'saved-locally';
            problem = undefined;
            return;
          } catch {
            /* Still no room. Fall through to memory only. */
          }
        }
      }
      persistence = 'memory-only';
      problem = why;
    }
  }

  /** Apply the soft cap, write, tell everyone. The only way a change leaves
      this module. */
  function save(): void {
    record = applySoftCap(record, softCap);
    write();
    notify();
  }

  /* ── loading, and the one-time migration ── */

  function load(): void {
    loaded = true;
    record = (storage ? parseRecord(safeGet(storage, learnerRecordKey(owner))) : null) ?? emptyLearnerRecord();
    if (storage) {
      persistence = 'saved-locally';
      problem = undefined;
    }
    migrateLegacyStores();
  }

  /* ── What this DEVICE remembers about the old stores ── */

  /* LEGACY_MIGRATION_OWNER_KEY holds two facts. Both are about this machine,
   * and neither belongs to any one record:
   *
   *   ownerKey   whose the old device-wide keys are. src/lib/store-owner.ts
   *              reads this, and only this, to decide the one-time move.
   *   migrated   which owners have already had those stores carried into
   *              their learner record, and the stamp of the run that did it.
   *
   * `migrated` is kept HERE, and not only inside the record, because the
   * record is deliberately removed from this device on sign-out once the
   * account has everything (sync.browser.ts, `stop({ forget: true })`).
   * While the only stamp was the one inside the record, the next sign-in
   * loaded an empty record, concluded the old stores had never been carried
   * across, and migrated them a SECOND time. By then those stores also held
   * the work the student had done while signed in, which the ordinary
   * recorders had already written as its own event, so one lesson became two
   * rows: the click, and a `legacy:` copy of the same click. That is the
   * duplicate the 22 September 2026 account journey found. */
  interface LegacyDeviceStamp {
    version: 1;
    ownerKey?: string;
    at?: string;
    migrated?: Record<string, MigrationStamp>;
  }

  function migratedMap(value: unknown): Record<string, MigrationStamp> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const out: Record<string, MigrationStamp> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const stamp = entry as Partial<MigrationStamp> | null;
      if (stamp && typeof stamp === 'object' && typeof stamp.migrationVersion === 'number') {
        out[key] = stamp as MigrationStamp;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  function readLegacyDeviceStamp(): LegacyDeviceStamp {
    const empty: LegacyDeviceStamp = { version: 1 };
    if (!storage) return empty;
    const raw = safeGet(storage, LEGACY_MIGRATION_OWNER_KEY);
    if (!raw) return empty;
    try {
      const parsed = JSON.parse(raw) as Partial<LegacyDeviceStamp>;
      return {
        version: 1,
        ownerKey: typeof parsed?.ownerKey === 'string' ? parsed.ownerKey : undefined,
        at: typeof parsed?.at === 'string' ? parsed.at : undefined,
        migrated: migratedMap(parsed?.migrated),
      };
    } catch {
      /* A corrupt stamp reads as no stamp. The migration then runs again,
         which is idempotent by construction: every legacy id is derived from
         the old row, so a second run adds nothing the record already holds. */
      return empty;
    }
  }

  function writeLegacyDeviceStamp(next: LegacyDeviceStamp): void {
    if (!storage) return;
    try {
      storage.setItem(LEGACY_MIGRATION_OWNER_KEY, JSON.stringify(next));
    } catch {
      /* The stamp is a guard, not data. Without it the migration runs again;
         see the note on a corrupt one above. */
    }
  }

  function legacyStampOwner(): string | null {
    return readLegacyDeviceStamp().ownerKey ?? null;
  }

  function writeLegacyStamp(ownerKey: string): void {
    writeLegacyDeviceStamp({ ...readLegacyDeviceStamp(), version: 1, ownerKey, at: now() });
  }

  /** The run that already carried the old stores into this owner's record on
      this device, or null when there has not been one. */
  function legacyMigrationFor(ownerKey: string): MigrationStamp | null {
    return readLegacyDeviceStamp().migrated?.[ownerKey] ?? null;
  }

  /** Remember that this owner has taken everything the old stores held.
      Written even when they held nothing, because from that moment on every
      new row in them is put there by a recorder that is ALREADY writing the
      matching event; migrating those rows later would double them. */
  function rememberLegacyMigration(ownerKey: string, stamp: MigrationStamp): void {
    const held = readLegacyDeviceStamp();
    const already = held.migrated?.[ownerKey];
    if (already && already.migrationVersion >= stamp.migrationVersion) return;
    writeLegacyDeviceStamp({ ...held, version: 1, migrated: { ...held.migrated, [ownerKey]: stamp } });
  }

  /** The anonymous-work claim moves the old stores to the account, so what
      the device knows about them moves with them. Without this the account
      would look unmigrated the moment its cached record was dropped, and the
      claimed rows would be migrated a second time under the account. */
  function carryLegacyMigration(fromKey: string, toKey: string): void {
    const held = readLegacyDeviceStamp();
    const source = held.migrated?.[fromKey];
    if (!source) return;
    const target = held.migrated?.[toKey];
    if (target && target.migrationVersion >= source.migrationVersion) return;
    writeLegacyDeviceStamp({ ...held, version: 1, migrated: { ...held.migrated, [toKey]: source } });
  }

  /** Carry ielts.progress.v1 and the plan's ticked extras into this record,
      once per owner, and again only if the migration rules change.
   *
   * The old stores are READ and never written, never emptied, never
   * reshaped: the writing, speaking and score history screens keep reading
   * them exactly as they do today.
   *
   * They also have nobody's name on them, which is the whole difficulty. The
   * first record to migrate them stamps its owner on the device, and a
   * second student signing in here does NOT inherit them. Their own work is
   * not lost by that: it is in the record that claimed them, and the
   * explicit ownership claim is how it moves. */
  function migrateLegacyStores(): void {
    if (!needsMigration(record)) return;
    const mine = ownerNamespace(owner);

    /* ONCE PER OWNER, PER DEVICE, whatever became of the record since. The
       device remembers this (see LegacyDeviceStamp above), so a record that
       was dropped on sign-out and rebuilt from the account does not migrate
       the old stores all over again on top of work the recorders have since
       written into both. Raising MIGRATION_VERSION still lets it run again,
       which is what that number is for. */
    const already = legacyMigrationFor(mine);
    if (already && already.migrationVersion >= MIGRATION_VERSION) {
      /* Put the remembered stamp back, so the record says honestly that it
         has been migrated. Nothing is written: an empty record is not worth
         a key of its own, and this is read from the device again next time. */
      record = { ...record, migration: already };
      legacyHeldByAnotherOwner = false;
      return;
    }

    const stamped = legacyStampOwner();
    if (stamped !== null && stamped !== mine) {
      legacyHeldByAnotherOwner = true;
      return;
    }
    legacyHeldByAnotherOwner = false;

    const { progress, plan } = readLegacy(owner);
    const migrated = migrateInto(record, progress, plan, provided(options.lessonMinutes, {}), {
      now: now(),
      lessonSubskills: provided(options.lessonSubskills, {}),
    });
    if (migrated.migration) rememberLegacyMigration(mine, migrated.migration);
    /* A student with nothing in the old stores has nothing to claim and
       nothing worth a key of their own yet. Leave the record untouched: the
       migration is deterministic, so running it again on the next visit
       produces exactly the same nothing. */
    if (migrated.events.length === 0 && migrated.selfReported.length === 0) return;
    record = migrated;
    writeLegacyStamp(mine);
    save();
  }

  /* ── recording ── */

  /** Everything that makes one piece of work that piece of work, EXCEPT the
      retry link, which this file adds itself. Two writes with the same
      signature are the same work, so the second one is not a second row. */
  function workSignature(of: {
    activityId: string;
    at: string;
    mode: EvidenceMode;
    sessionId?: string;
    supersedes?: string;
    outcome: unknown;
    items?: readonly { itemId: string; itemVersion?: string; firstAnswer: string; correct: boolean }[];
  }): string {
    return canonicalJson({
      activityId: of.activityId,
      at: of.at,
      mode: of.mode,
      sessionId: of.sessionId,
      supersedes: of.supersedes,
      outcome: of.outcome,
      items: of.items?.map((item) => ({
        itemId: item.itemId,
        itemVersion: item.itemVersion,
        firstAnswer: item.firstAnswer,
        correct: item.correct,
      })),
    });
  }

  /** The event this draft is a second go at, when the record already holds a
      first answer to one of its items.
   *
   * Always the EARLIEST such event rather than the most recent, so writing
   * the same retry twice produces the same id and therefore one row. Without
   * this, a surface re-submitting after a hint would record a corrected
   * answer as though it were the student's first, which is the one thing the
   * whole evidence layer exists to prevent. */
  function earlierAttempt(draft: EvidenceDraft, current: LearnerRecordV1): EvidenceEvent | undefined {
    const itemIds = new Set((draft.items ?? []).map((item) => item.itemId));
    if (itemIds.size === 0) return undefined;
    for (const event of current.events) {
      if (event.activityId !== draft.activityId) continue;
      if (event.at > draft.at) continue;
      if ((event.items ?? []).some((item) => itemIds.has(item.itemId))) return event;
    }
    return undefined;
  }

  /** The event already holding this work, if any.
   *
   * The id settles it when it matches. When it does not, the same work can
   * still be held under a different id, because THIS file may have added a
   * retry link to it, and that link is part of the id. So a second look
   * compares everything except the link. An `idempotencyKey` turns that
   * second look off: a caller passing one is telling us exactly how to tell
   * two attempts apart, and two attempts that differ only by their key are
   * meant to be two rows. */
  function heldEvent(draft: EvidenceDraft, current: LearnerRecordV1): EvidenceEvent | undefined {
    const id = draft.id ?? evidenceEventId(draft);
    const byId = current.events.find((event) => event.id === id);
    if (byId) return byId;
    if (draft.idempotencyKey !== undefined) return undefined;

    const signature = workSignature(draft);
    return current.events.find(
      (event) => event.activityId === draft.activityId && event.at === draft.at && workSignature(event) === signature,
    );
  }

  function recordEvents(drafts: readonly EvidenceDraft[]): EvidenceEvent[] {
    let current = read();
    const out: EvidenceEvent[] = [];
    let added = 0;

    for (const draft of drafts) {
      const held = heldEvent(draft, current);
      if (held) {
        /* The same work recorded twice is one row, and the answer that
           stands is the one that was written first. */
        out.push(held);
        continue;
      }
      const previous = draft.retryOf === undefined ? earlierAttempt(draft, current) : undefined;
      const prepared: EvidenceDraft = previous ? { ...draft, retryOf: previous.id } : draft;
      const alreadyLinked = previous ? heldEvent(prepared, current) : undefined;
      if (alreadyLinked) {
        out.push(alreadyLinked);
        continue;
      }
      let event: EvidenceEvent;
      try {
        event = createEvidenceEvent(prepared, current);
      } catch (error) {
        onRefused(draft, error instanceof Error ? error.message : String(error));
        continue;
      }
      current = appendAllEvidence(current, [event]);
      out.push(event);
      added += 1;
    }

    if (added > 0) {
      record = current;
      save();
    }
    return out;
  }

  function recordEvent(draft: EvidenceDraft): EvidenceEvent | null {
    return recordEvents([draft])[0] ?? null;
  }

  function mergeRemoteEvents(events: readonly EvidenceEvent[]): number {
    const before = read();
    const merged = appendAllEvidence(before, events);
    if (merged === before) return 0;
    const added = merged.events.length - before.events.length;
    record = merged;
    save();
    return added;
  }

  /* ── the convenience recorders ── */

  /** The fields every recorder copies straight through. */
  function base(input: RecordingContext, at: string): Omit<EvidenceDraft, 'subskill' | 'mode' | 'completion' | 'outcome'> {
    return {
      activityId: input.activityId,
      contentVersion: input.contentVersion,
      at,
      paper: input.paper,
      sessionId: input.sessionId,
      locale: input.locale,
      idempotencyKey: input.idempotencyKey,
      retryOf: input.retryOf,
      supersedes: input.supersedes,
      sourceMaterial: input.sourceMaterial,
      provenance: input.provenance,
    };
  }

  function sourceKeys(input: RecordingContext, testId?: string, promptId?: string): readonly string[] | undefined {
    const keys = new Set(input.sourceMaterial ?? []);
    if (testId) keys.add(paperExposureKey(testId));
    if (promptId) keys.add(promptExposureKey(promptId));
    return keys.size > 0 ? [...keys].sort() : undefined;
  }

  /** correct/total per subskill, from the items themselves. A paper's items
      carry their own; anything without one falls back to the activity's,
      unless that is the whole-activity placeholder, which says nothing about
      a question. */
  function tallyBySubskill(
    items: readonly ItemOutcomeDraft[],
    fallback: Subskill | undefined,
  ): Record<string, { correct: number; total: number }> {
    const out: Record<string, { correct: number; total: number }> = {};
    for (const item of items) {
      const key = item.subskill ?? fallback;
      if (!key) continue;
      const held = (out[key] ??= { correct: 0, total: 0 });
      held.total += 1;
      if (item.correct) held.correct += 1;
    }
    return out;
  }

  function recordLessonStudied(input: LessonStudiedInput): EvidenceEvent | null {
    const at = input.at ?? now();
    return recordEvent({
      ...base({ ...input, activityId: input.activityId ?? `lesson:${input.lessonKey}` }, at),
      subskill: input.subskill ?? UNCLASSIFIED_LESSON_SUBSKILL,
      mode: input.mode ?? 'practice',
      completion: 'completed',
      assistance: 'none',
      outcome: { kind: 'studied', estimatedMinutes: input.estimatedMinutes ?? DEFAULT_LESSON_MINUTES },
    });
  }

  function recordLessonCheckAnswer(input: LessonCheckAnswerInput): EvidenceEvent | null {
    const at = input.at ?? now();
    const items = [input.item];
    return recordEvent({
      ...base(input, at),
      sourceMaterial: sourceKeys(input, input.sourceTestId),
      subskill: input.subskill,
      mode: input.mode ?? 'lesson-check',
      completion: input.completion ?? 'completed',
      outcome: {
        kind: 'scored',
        raw: input.item.correct ? 1 : 0,
        total: 1,
        bySubskill: tallyBySubskill(items, input.subskill),
      },
      items,
    });
  }

  function recordSubmission(input: SubmissionInput): EvidenceEvent | null {
    const at = input.at ?? now();
    const subskill = input.subskill ?? WHOLE_ACTIVITY_SUBSKILL;
    const fallback = subskill === WHOLE_ACTIVITY_SUBSKILL ? undefined : subskill;
    return recordEvent({
      ...base(input, at),
      sourceMaterial: sourceKeys(input, input.sourceTestId),
      subskill,
      mode: input.mode ?? 'practice',
      completion: input.completion ?? 'completed',
      assistance: input.assistance,
      outcome: {
        kind: 'scored',
        raw: input.raw ?? input.items.filter((item) => item.correct).length,
        total: input.total ?? input.items.length,
        bandEstimate: input.bandEstimate,
        bySubskill: input.bySubskill ?? tallyBySubskill(input.items, fallback),
        secondsUsed: input.secondsUsed,
      },
      items: input.items,
    });
  }

  function gradedDraft(input: GradedTaskInput, taskScope: EvidenceDraft['taskScope'], paper: Paper): EvidenceDraft {
    const at = input.at ?? now();
    return {
      ...base({ ...input, paper: input.paper ?? paper }, at),
      sourceMaterial: sourceKeys(input, undefined, input.promptId),
      subskill: input.subskill ?? WHOLE_ACTIVITY_SUBSKILL,
      mode: input.mode ?? 'practice',
      completion: input.completion ?? 'completed',
      assistance: input.assistance ?? 'none',
      taskScope,
      pendingGrading: input.pendingGrading,
      outcome: {
        kind: 'graded',
        overallBand: input.overallBand,
        criteria: input.criteria,
        grader: input.grader,
        legacyRef: input.legacyRef,
        wordCount: input.wordCount,
      },
    };
  }

  function recordWritingGraded(input: WritingGradedInput): EvidenceEvent | null {
    return recordEvent(
      gradedDraft(input, input.task ? { kind: 'writing-task', task: input.task } : undefined, 'writing'),
    );
  }

  function recordSpeakingGraded(input: SpeakingGradedInput): EvidenceEvent | null {
    /* No recording and no field that could hold one: createEvidenceEvent
       refuses anything that looks like retained audio. */
    return recordEvent(
      gradedDraft(input, input.part ? { kind: 'speaking-part', part: input.part } : undefined, 'speaking'),
    );
  }

  function recordVocabularyReview(input: VocabularyReviewInput): EvidenceEvent | null {
    const at = input.at ?? now();
    return recordEvent({
      ...base(input, at),
      subskill: input.subskill ?? 'recall-from-meaning',
      /* Recalling a word met a week ago IS the demonstration, so a review
         pass is practice rather than review mode, and it records no exposure
         key: meeting the word again is the point of spaced recall, not a
         repeat of unseen material. */
      mode: input.mode ?? 'practice',
      completion: input.completion ?? 'completed',
      assistance: input.assistance ?? 'none',
      outcome: {
        kind: 'recall',
        reviewed: input.reviewed ?? input.words.length,
        correct: input.correct ?? input.words.filter((word) => word.correct).length,
        words: input.words,
      },
    });
  }

  function recordObjectiveJudged(input: ObjectiveJudgedInput): EvidenceEvent | null {
    const at = input.at ?? now();
    return recordEvent({
      ...base(input, at),
      subskill: input.subskill,
      mode: input.mode ?? 'practice',
      completion: input.completion ?? 'completed',
      assistance: input.assistance ?? 'none',
      outcome: { kind: 'objective', met: input.met, subskill: input.subskill, feedback: input.feedback, byModel: input.byModel },
    });
  }

  function recordUnfinishedAttempt(input: UnfinishedAttemptInput): EvidenceEvent | null {
    const at = input.at ?? now();
    const items = input.items ?? [];
    const subskill = input.subskill ?? WHOLE_ACTIVITY_SUBSKILL;
    const fallback = subskill === WHOLE_ACTIVITY_SUBSKILL ? undefined : subskill;
    return recordEvent({
      ...base(input, at),
      sourceMaterial: sourceKeys(input, input.sourceTestId),
      subskill,
      mode: input.mode ?? 'practice',
      completion: input.completion ?? 'abandoned',
      outcome: {
        kind: 'scored',
        raw: input.raw ?? items.filter((item) => item.correct).length,
        total: input.total ?? items.length,
        bySubskill: tallyBySubskill(items, fallback),
        secondsUsed: input.secondsUsed,
      },
      items: items.length > 0 ? items : undefined,
    });
  }

  function recordSelfReported(score: Omit<SelfReportedScore, 'id'> & { id?: string }): SelfReportedScore | null {
    const before = read();
    const next = recordSelfReportedScore(before, score);
    if (next === before) {
      /* Already held: the same claim told to us twice is one row. */
      return (
        before.selfReported.find(
          (held) => held.band === score.band && held.takenOn === score.takenOn && held.paper === score.paper,
        ) ?? null
      );
    }
    record = next;
    save();
    return record.selfReported.find((held) => !before.selfReported.some((was) => was.id === held.id)) ?? null;
  }

  /* ── anonymous work, and the one explicit way it reaches an account ── */

  interface DecisionFile {
    version: 1;
    deviceId: string;
    decisions: Record<string, { outcome: 'claimed' | 'declined'; at: string }>;
  }

  function readDecisions(deviceId: string): DecisionFile {
    const empty: DecisionFile = { version: 1, deviceId, decisions: {} };
    if (!storage) return empty;
    const raw = safeGet(storage, OWNERSHIP_DECISION_KEY);
    if (!raw) return empty;
    try {
      const parsed = JSON.parse(raw) as Partial<DecisionFile>;
      if (parsed?.version !== 1 || parsed.deviceId !== deviceId || !parsed.decisions) return empty;
      return { version: 1, deviceId, decisions: parsed.decisions };
    } catch {
      return empty;
    }
  }

  function writeDecision(deviceId: string, outcome: 'claimed' | 'declined'): void {
    if (!storage) return;
    const file = readDecisions(deviceId);
    file.decisions[ownerNamespace(owner)] = { outcome, at: now() };
    try {
      storage.setItem(OWNERSHIP_DECISION_KEY, JSON.stringify(file));
    } catch {
      /* Without the note the student may be asked once more. Harmless: the
         claim itself is a union by id. */
    }
  }

  /** What the four OLDER stores hold for one owner: attempts, essays and
      their marked reports, speaking results, the plan, vocabulary, saved
      lessons and notes.
   *
   * Read as raw JSON straight from that owner's scoped keys rather than
   * through the store modules, for one reason: src/lib/vocab-review.ts
   * builds the whole flashcard deck at import time, and this file is loaded
   * by every page that records anything. The progress and plan shapes are
   * the real imported types; the other two are read defensively field by
   * field, the same compromise sync.browser.ts already makes for the same
   * module (see VocabStoreLike there). Nothing here writes. */
  function legacyCountsFor(of: CacheOwner): LegacyWorkCounts {
    const counts = emptyLegacyWorkCounts();
    if (!storage) return counts;

    const progress = readLegacy(of).progress;
    if (progress) {
      for (const attempts of Object.values(progress.tests ?? {})) counts.testAttempts += attempts.length;
      for (const attempts of Object.values(progress.writing ?? {})) {
        counts.essays += attempts.length;
        counts.savedReports += attempts.filter((attempt) => attempt.report).length;
      }
      counts.speakingResults = (progress.speaking ?? []).length;
    }
    counts.hasPlan = readLegacy(of).plan !== null;

    try {
      const raw = readScopedRaw(storage, VOCAB_STORE_KEY, of);
      const parsed = raw ? (JSON.parse(raw) as { cards?: Record<string, unknown> }) : null;
      counts.vocabularyWords = Object.keys(parsed?.cards ?? {}).length;
    } catch {
      /* A corrupt store counts as nothing to claim, never as a crash. */
    }
    try {
      const raw = readScopedRaw(storage, NOTES_STORE_KEY, of);
      const parsed = raw ? (JSON.parse(raw) as { bookmarks?: unknown[]; notes?: Record<string, unknown> }) : null;
      counts.savedLessons = Array.isArray(parsed?.bookmarks) ? parsed.bookmarks.length : 0;
      counts.notes = Object.keys(parsed?.notes ?? {}).length;
    } catch {
      /* Same. */
    }
    return counts;
  }

  /** The anonymous owner on this device, and everything it holds: the
      learner record if there is one, and the older stores either way.
   *
   * A browser that was used before this build has no anonymous learner
   * record at all, only `ielts.progress.v1` and friends. That work is still
   * somebody's, so it is still offered. */
  function anonymousWork(): {
    deviceId: string;
    owner: CacheOwner;
    record: LearnerRecordV1 | null;
    legacy: LegacyWorkCounts;
  } | null {
    if (!storage || owner.kind !== 'user') return null;
    const deviceId = deviceIdFrom(storage);
    const anonymous = anonymousOwner(deviceId);
    return {
      deviceId,
      owner: anonymous,
      record: parseRecord(safeGet(storage, learnerRecordKey(anonymous))),
      legacy: legacyCountsFor(anonymous),
    };
  }

  function describeAnonymousWork(options_?: { includeDeclined?: boolean }): AnonymousWorkOffer | null {
    const anonymous = anonymousWork();
    if (!anonymous) return null;
    const { deviceId, legacy } = anonymous;
    const held = anonymous.record ?? emptyLearnerRecord();
    if (held.events.length === 0 && held.selfReported.length === 0 && !hasLegacyWork(legacy)) return null;

    /* Once ANY account has decided about this device's anonymous work, no
       other account is ever offered it. That is what stops a second student
       inheriting the first one's signed-out session.
       The account that said no is the one exception: it may ask for its own
       earlier work back, through `includeDeclined`, which is what a
       "restore the work I did before signing in" action passes. */
    const decisions = readDecisions(deviceId).decisions;
    const mine = ownerNamespace(owner);
    if (Object.keys(decisions).some((key) => key !== mine)) return null;
    if (decisions[mine] && options_?.includeDeclined !== true) return null;

    const studied = new Set<string>();
    let attempts = 0;
    for (const event of held.events) {
      if (event.outcome.kind === 'studied') studied.add(event.activityId);
      else attempts += 1;
    }
    const last = held.events[held.events.length - 1];
    return {
      deviceId,
      summary: {
        events: held.events.length,
        lessonsStudied: studied.size,
        attempts,
        /* Whether there are settings on this device to claim at all. The old
           SavedPlan is the one the student would recognise (a target band, a
           date, minutes a day); the personal plan is rebuilt from the record
           and the settings once the work is claimed, so it is not something
           to offer separately. */
        hasPlan: legacy.hasPlan,
        /* The older stores, so the screen can say what is actually there in
           plain counts rather than asking the student to take a number of
           events on trust. */
        legacy,
      },
      lastAt: last ? last.at : null,
    };
  }

  function claimAnonymousWork(options_?: {
    planResolution?: OwnershipClaim['planResolution'];
  }): OwnershipClaimResult {
    if (owner.kind !== 'user') return { outcome: 'not-signed-in', claim: null, newEvents: 0 };
    const offer = describeAnonymousWork({ includeDeclined: true });
    const anonymous = anonymousWork();
    if (!offer || !anonymous) return { outcome: 'nothing-to-claim', claim: null, newEvents: 0 };

    const before = read();
    if (anonymous.record) {
      record = mergeLearnerRecords(before, anonymous.record);
      save();
    }

    /* ONE DECISION COVERS EVERY STORE. The learner record and the four older
       ones move together, because to a student this is one thing: "the work
       I did on this device before I signed in". The move is a union or the
       store's own merge rule, so claiming twice adds nothing and can never
       overwrite what the account already had. */
    if (storage) {
      const legacyMove = claimLegacyStores(storage, anonymous.owner, owner);
      /* The older stores have new contents now, so their own readers are told
         the same way a write tells them. That is also what makes the account
         sync schedule a push for the claimed work instead of leaving it on
         this device until the student's next edit. */
      if (legacyMove.moved.length > 0 || legacyMove.merged.length > 0) announceStoresChanged();
      /* The anonymous copy is GONE from this device once it has been
         claimed, and the note about it goes with it: it now lives in the
         account, and leaving a second copy behind is exactly how the next
         student on this browser would end up being offered someone else's
         work. Nothing is lost, because the claim is a union and it has
         already happened. */
      safeRemove(storage, learnerRecordKey(anonymous.owner));
      safeRemove(storage, OWNERSHIP_DECISION_KEY);
    }
    /* The old device-wide stores travelled with it, so they belong to this
       owner now too, and so does what the device knows about having already
       carried them into a record: the rows that moved have been migrated
       once, and migrating them again under this owner would write a second
       `legacy:` copy of work that is already in the account. */
    carryLegacyMigration(ownerNamespace(anonymous.owner), ownerNamespace(owner));
    if (legacyStampOwner() === null || legacyStampOwner() === ownerNamespace(anonymous.owner)) {
      writeLegacyStamp(ownerNamespace(owner));
      legacyHeldByAnotherOwner = false;
    }

    return {
      outcome: 'claimed',
      claim: {
        deviceId: anonymous.deviceId,
        summary: offer.summary,
        planResolution: options_?.planResolution ?? 'keep-account-plan',
        claimedAt: now(),
      },
      newEvents: record.events.length - before.events.length,
    };
  }

  /** Leave it. Nothing is moved and nothing is removed: the work stays under
      the anonymous owner, where the student can still come back to it, and
      no other account is ever offered it. */
  function declineAnonymousWork(): void {
    const anonymous = anonymousWork();
    if (!anonymous) return;
    writeDecision(anonymous.deviceId, 'declined');
  }

  /* ── reading, owning, watching ── */

  function read(): LearnerRecordV1 {
    if (!loaded) load();
    return record;
  }

  function reload(): LearnerRecordV1 {
    loaded = false;
    return read();
  }

  function setOwner(next: CacheOwner | null): LearnerRecordV1 {
    const resolved = next ?? anonymousOwner(deviceIdFrom(storage));
    if (ownerNamespace(resolved) === ownerNamespace(owner) && loaded) return record;
    /* Signing out or switching account drops the loaded copy outright. The
       next read goes to that owner's own key, so nothing of the previous
       student's is in memory to leak into the next one's screens. */
    owner = resolved;
    record = emptyLearnerRecord();
    loaded = false;
    legacyHeldByAnotherOwner = false;
    sync = null;
    const loadedRecord = read();
    notify();
    return loadedRecord;
  }

  function forgetOwner(target: CacheOwner): void {
    if (storage) safeRemove(storage, learnerRecordKey(target));
    if (ownerNamespace(target) === ownerNamespace(owner)) {
      record = emptyLearnerRecord();
      loaded = false;
      notify();
    }
  }

  return {
    owner: () => owner,
    read,
    reload,
    status: () => {
      const current = read();
      return {
        owner,
        persistence,
        problem,
        events: current.events.length,
        summarised: (current.summaries ?? []).reduce((total, summary) => total + summary.eventCount, 0),
        evidenceVersion: current.evidenceVersion,
        migrated: current.migration !== null,
        legacyHeldByAnotherOwner,
        sync,
      };
    },
    setOwner,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setSyncStatus: (next: SyncStatus | null) => {
      sync = next;
      notify();
    },
    recordEvents,
    recordEvent,
    mergeRemoteEvents,
    recordLessonStudied,
    recordLessonCheckAnswer,
    recordSubmission,
    recordWritingGraded,
    recordSpeakingGraded,
    recordVocabularyReview,
    recordObjectiveJudged,
    recordUnfinishedAttempt,
    recordSelfReported,
    describeAnonymousWork,
    claimAnonymousWork,
    declineAnonymousWork,
    forgetOwner,
  };
}

/* ── The one the site uses ───────────────────────────────────────────────── */

let defaultStore: LearnerStore | null = null;
let defaultOptions: LearnerStoreOptions = {};

/** Hand the store what only the application knows: the catalogue's lesson to
    subskill map and its estimated minutes, for the one-time migration of old
    completions. Everything works without it; old completions simply sit
    under one heading.
 *
 * The two catalogue maps are read when the migration wants them, so this may
 * arrive after the first island has already read the record. Everything else
 * (owner, storage, clock, soft cap) is fixed when the store is first used,
 * and a later change to those is ignored rather than silently replacing a
 * store that islands are already subscribed to. */
export function configureLearnerStore(options: LearnerStoreOptions): void {
  defaultOptions = { ...defaultOptions, ...options };
}

/** The two catalogue maps the migration wants, out of a catalogue the caller
    already has.
 *
 * A convenience for the one line that wires the two layers together:
 *   configureLearnerStore(lessonMapsFrom(learningCatalogue()))
 *
 * Deliberately taking the catalogue as an argument rather than importing it.
 * The catalogue carries the generated index, and this store is loaded by
 * every page that records anything, including pages that have no other
 * reason to hold it. */
export function lessonMapsFrom(catalogue: LearningCatalogueV1): {
  lessonSubskills: Record<string, Subskill>;
  lessonMinutes: Record<string, number>;
} {
  /* One implementation, in adapters.ts, because the Mr EZ Worker builds the
     same maps when it works a plan out from synced progress and must file a
     completion under the same subskill this browser does. */
  return lessonMapsFor(catalogue);
}

export function getLearnerStore(): LearnerStore {
  defaultStore ??= createLearnerStore({
    /* The owner every other store on this device is using right now, unless
       the application named one. One answer, one place (store-owner.ts). */
    owner: currentOwner(),
    ...defaultOptions,
    lessonSubskills: () => provided(defaultOptions.lessonSubskills, {}),
    lessonMinutes: () => provided(defaultOptions.lessonMinutes, {}),
  });
  return defaultStore;
}

export function readLearnerRecord(): LearnerRecordV1 {
  return getLearnerStore().read();
}

export function learnerStoreStatus(): LearnerStoreStatus {
  return getLearnerStore().status();
}

/** Sign-in, account switch, or sign-out with null. */
export function setLearnerOwner(owner: CacheOwner | null): LearnerRecordV1 {
  return getLearnerStore().setOwner(owner);
}

/** Subscribe to learner record writes. Returns an unsubscribe, the same
    shape as onProgressChange and onStudyPlanChange. */
export function onLearnerRecordChange(listener: () => void): () => void {
  return getLearnerStore().subscribe(listener);
}

export function recordEvents(drafts: readonly EvidenceDraft[]): EvidenceEvent[] {
  return getLearnerStore().recordEvents(drafts);
}

export function recordEvent(draft: EvidenceDraft): EvidenceEvent | null {
  return getLearnerStore().recordEvent(draft);
}

export function recordLessonStudied(input: LessonStudiedInput): EvidenceEvent | null {
  return getLearnerStore().recordLessonStudied(input);
}

export function recordLessonCheckAnswer(input: LessonCheckAnswerInput): EvidenceEvent | null {
  return getLearnerStore().recordLessonCheckAnswer(input);
}

export function recordSubmission(input: SubmissionInput): EvidenceEvent | null {
  return getLearnerStore().recordSubmission(input);
}

export function recordWritingGraded(input: WritingGradedInput): EvidenceEvent | null {
  return getLearnerStore().recordWritingGraded(input);
}

export function recordSpeakingGraded(input: SpeakingGradedInput): EvidenceEvent | null {
  return getLearnerStore().recordSpeakingGraded(input);
}

export function recordVocabularyReview(input: VocabularyReviewInput): EvidenceEvent | null {
  return getLearnerStore().recordVocabularyReview(input);
}

export function recordObjectiveJudged(input: ObjectiveJudgedInput): EvidenceEvent | null {
  return getLearnerStore().recordObjectiveJudged(input);
}

export function recordUnfinishedAttempt(input: UnfinishedAttemptInput): EvidenceEvent | null {
  return getLearnerStore().recordUnfinishedAttempt(input);
}

export function recordSelfReported(
  score: Omit<SelfReportedScore, 'id'> & { id?: string },
): SelfReportedScore | null {
  return getLearnerStore().recordSelfReported(score);
}

export function describeAnonymousWork(options?: { includeDeclined?: boolean }): AnonymousWorkOffer | null {
  return getLearnerStore().describeAnonymousWork(options);
}

export function claimAnonymousWork(options?: {
  planResolution?: OwnershipClaim['planResolution'];
}): OwnershipClaimResult {
  return getLearnerStore().claimAnonymousWork(options);
}

export function declineAnonymousWork(): void {
  getLearnerStore().declineAnonymousWork();
}

/* ── The plan ────────────────────────────────────────────────────────────────
 *
 * PersonalPlanV1 persistence, its revision, and the derived SavedPlan the
 * nine existing screens still read (lead decision D1), beside the record so
 * that one owner namespace covers both.
 *
 * NOTHING HERE DECIDES ANYTHING. This is storage. `replan()` is called in
 * exactly one place, `src/lib/learning/index.ts`, which is what makes the
 * active session stable: a page that reads the plan cannot move it.
 */

/** 'ielts.learning.plan.v1::u:<userId>'. Same namespacing as the record, for
    the same reason: two students on one browser never see each other's. */
export function personalPlanKey(owner: CacheOwner): string {
  return `${PERSONAL_PLAN_KEY}${CACHE_NAMESPACE_SEPARATOR}${ownerNamespace(owner)}`;
}

/** A quick shape check, the same idea as looksLikeEvent above: a row that is
    missing anything every reader dereferences is treated as no plan at all,
    so a hand-edited or half-written copy cannot reach a screen. The full
    validation belongs to the sync layer. */
function parsePlan(raw: string | null): PersonalPlanV1 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersonalPlanV1>;
    if (parsed?.version !== 1) return null;
    if (typeof parsed.revision !== 'number') return null;
    const session = parsed.activeSession as PlanSession | undefined;
    if (!session || typeof session.id !== 'string' || !Array.isArray(session.steps)) return null;
    if (!parsed.goals || !parsed.constraints) return null;
    return parsed as PersonalPlanV1;
  } catch {
    /* Corrupt JSON reads as no plan. The next ensurePlan() builds a fresh
       one from the record, which is deterministic, so nothing is lost that
       was not already unreadable. */
    return null;
  }
}

/** How a plan is kept on this device, and whether it is the student's own
    settings or still the platform's suggestion. */
export interface PlanStoreStatus {
  owner: CacheOwner;
  persistence: LocalPersistence;
  problem?: LocalWriteProblem;
  revision: number | null;
  confirmed: boolean;
  /** True once a stored plan exists for this owner. */
  present: boolean;
  /** The old study plan this owner's first plan was built from, when there
      was one, so the interface can say the settings were carried over. */
  migratedFrom: 'saved-plan' | 'nothing' | null;
}

/** Change entries kept when the browser is full and the plan has to be
    written smaller. Far below PLAN_HISTORY_MAX: enough for the weekly
    review to still have something to quote. */
const QUOTA_RETRY_PLAN_HISTORY = 5;

export interface PlanStoreOptions {
  owner?: CacheOwner;
  storage?: BrowserStorage | null;
  now?: () => string;
  /** The old study plan. READ for the one-time migration of the student's
      settings, and WRITTEN with the derived copy lead decision D1 requires.
      Injected so a test can watch both halves without a browser. */
  legacyPlan?: { read: () => SavedPlan | null; write: (plan: SavedPlan) => void };
}

export interface PlanStore {
  owner(): CacheOwner;
  /** The stored plan, synchronously, for first paint. Null when this owner
      has none yet, which is a question for ensurePlan() and not for this
      module: nothing here ever builds a plan. */
  read(): PersonalPlanV1 | null;
  reload(): PersonalPlanV1 | null;
  save(plan: PersonalPlanV1): PersonalPlanV1;
  status(): PlanStoreStatus;
  setOwner(owner: CacheOwner | null): PersonalPlanV1 | null;
  subscribe(listener: () => void): () => void;
  forgetOwner(owner: CacheOwner): void;
  /** The old settings to build this owner's first plan from, or null. */
  legacySettings(): LegacyPlanSettings | null;
  /** The derived copy as it stands, for the agreement test and for a screen
      that wants to show what the old stores were told. */
  legacyPlan(): SavedPlan | null;
}

export function createPlanStore(options: PlanStoreOptions = {}): PlanStore {
  /* No clock of its own: every timestamp on a plan is stamped by the
     planner, which takes `now` as an argument so two devices produce the
     same plan from the same evidence. */
  const storage: BrowserStorage | null = options.storage === undefined ? deviceStorage() : options.storage;

  let owner: CacheOwner = options.owner ?? anonymousOwner(deviceIdFrom(storage));
  /* The old study plan is read and written for THIS store's owner, not for
     whoever happens to be current: a store told it is holding one student's
     plan must not leave its derived copy in another student's key. */
  const legacyPlan = options.legacyPlan ?? {
    read: () => loadStudyPlanFor(owner),
    write: (next: SavedPlan) => saveStudyPlanFor(owner, next),
  };
  let plan: PersonalPlanV1 | null = null;
  let loaded = false;
  let persistence: LocalPersistence = storage ? 'saved-locally' : 'memory-only';
  let problem: LocalWriteProblem | undefined = storage ? undefined : 'unavailable';
  let migratedFrom: PlanStoreStatus['migratedFrom'] = null;
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        /* A listener throwing must not break the writer. */
      }
    }
  }

  function load(): void {
    loaded = true;
    plan = storage ? parsePlan(safeGet(storage, personalPlanKey(owner))) : null;
    if (storage) {
      persistence = 'saved-locally';
      problem = undefined;
    }
  }

  function read(): PersonalPlanV1 | null {
    if (!loaded) load();
    return plan;
  }

  /** Write the plan, and on a full browser try once more with the change
      history trimmed. The history is the only part that grows without
      bound, and losing the oldest plain-language change entries is a far
      smaller loss than losing the plan. */
  function write(next: PersonalPlanV1): PersonalPlanV1 {
    if (!storage) {
      persistence = 'memory-only';
      problem = 'unavailable';
      return next;
    }
    const key = personalPlanKey(owner);
    try {
      storage.setItem(key, JSON.stringify(next));
      persistence = 'saved-locally';
      problem = undefined;
      return next;
    } catch (error) {
      const why = writeProblemOf(error);
      if (why === 'quota' && next.history.length > QUOTA_RETRY_PLAN_HISTORY) {
        const trimmed: PersonalPlanV1 = { ...next, history: next.history.slice(-QUOTA_RETRY_PLAN_HISTORY) };
        try {
          storage.setItem(key, JSON.stringify(trimmed));
          persistence = 'saved-locally';
          problem = undefined;
          return trimmed;
        } catch {
          /* Still no room. Fall through to memory only. */
        }
      }
      persistence = 'memory-only';
      problem = why;
      return next;
    }
  }

  function save(next: PersonalPlanV1): PersonalPlanV1 {
    if (!loaded) load();
    plan = write(next);
    /* Lead decision D1: the old store gets a copy of every save so the
       screens that still read SavedPlan keep working. It is written, never
       read back as the truth, and derivedSavedPlan() refuses to put a
       platform guess over a setting the student actually made. */
    const shadow = derivedSavedPlan(plan, legacyPlan.read());
    if (shadow) {
      try {
        legacyPlan.write(shadow);
      } catch {
        /* The shadow failing must never fail the real write. */
      }
    }
    notify();
    return plan;
  }

  function legacySettings(): LegacyPlanSettings | null {
    const settings = planSettingsFromSavedPlan(legacyPlan.read());
    migratedFrom = settings ? 'saved-plan' : 'nothing';
    return settings;
  }

  function setOwner(next: CacheOwner | null): PersonalPlanV1 | null {
    const resolved = next ?? anonymousOwner(deviceIdFrom(storage));
    if (ownerNamespace(resolved) === ownerNamespace(owner) && loaded) return plan;
    owner = resolved;
    plan = null;
    loaded = false;
    migratedFrom = null;
    const loadedPlan = read();
    notify();
    return loadedPlan;
  }

  function forgetOwner(target: CacheOwner): void {
    if (storage) safeRemove(storage, personalPlanKey(target));
    if (ownerNamespace(target) === ownerNamespace(owner)) {
      plan = null;
      loaded = false;
      notify();
    }
  }

  return {
    owner: () => owner,
    read,
    reload: () => {
      loaded = false;
      return read();
    },
    save,
    status: () => {
      const current = read();
      return {
        owner,
        persistence,
        problem,
        revision: current?.revision ?? null,
        confirmed: current?.confirmed ?? false,
        present: current !== null,
        migratedFrom,
      };
    },
    setOwner,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    forgetOwner,
    legacySettings,
    legacyPlan: () => legacyPlan.read(),
  };
}

let defaultPlanStore: PlanStore | null = null;
let defaultPlanOptions: PlanStoreOptions = {};

/** Hand the plan store its owner, its storage and its clock before anything
    reads it. Ignored once the store has been built, the same rule as
    configureLearnerStore, so an island that is already subscribed is never
    swapped out from under it. */
export function configurePlanStore(options: PlanStoreOptions): void {
  defaultPlanOptions = { ...defaultPlanOptions, ...options };
}

export function getPlanStore(): PlanStore {
  defaultPlanStore ??= createPlanStore({ owner: currentOwner(), ...defaultPlanOptions });
  return defaultPlanStore;
}

export function readPersonalPlan(): PersonalPlanV1 | null {
  return getPlanStore().read();
}

export function planStoreStatus(): PlanStoreStatus {
  return getPlanStore().status();
}

/** Subscribe to plan writes. Returns an unsubscribe, the same shape as
    onProgressChange, onStudyPlanChange and onLearnerRecordChange. */
export function onPersonalPlanChange(listener: () => void): () => void {
  return getPlanStore().subscribe(listener);
}

/** Sign-in, account switch, or sign-out with null. Always called together
    with setLearnerOwner: one student's record and one student's plan belong
    to the same owner or neither does. */
export function setLearningOwner(owner: CacheOwner | null): void {
  /* The shared owner FIRST, so that the four older stores (progress, study
     plan, vocabulary, notes and saved lessons) have already moved by the
     time either store below reads them for its one-time migration. */
  setCurrentOwner(owner);
  setLearnerOwner(owner);
  getPlanStore().setOwner(owner);
}

/** For tests, and for the one place that needs a clean slate: drop the
    module-level stores so the next call builds them from the current
    options. Never called by a screen. */
export function resetLearningStoresForTest(): void {
  defaultStore = null;
  defaultPlanStore = null;
  defaultOptions = {};
  defaultPlanOptions = {};
  resetStoreOwnerForTest();
}
