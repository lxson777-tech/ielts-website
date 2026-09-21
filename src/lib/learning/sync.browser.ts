/* Carrying one student's learning between their devices.
 *
 * WHAT THIS IS FOR
 * Everything a student does is written to this browser first and is useful
 * with no account at all. This file is the optional second step: when they
 * are signed in, their evidence, their plan and their companion stores also
 * live in their account, so a phone and a laptop agree.
 *
 * THE FOUR RULES IT IS BUILT ON
 *
 *   1. EVIDENCE IS A UNION BY ID. Events are append-only and their ids are
 *      derived from their content (contracts/evidence.ts), so sending the
 *      same batch twice stores one copy, two devices reconcile whichever
 *      order they arrive in, and a retry after a dropped connection is free.
 *      That is the whole reason a failed push here is never dangerous.
 *
 *   2. THE PLAN IS THE ONE THING THAT CAN COLLIDE, so it has a written rule:
 *      PLAN_CONFLICT_RULE in contracts/sync.ts, confirmed beats unconfirmed,
 *      then the higher revision, then the later updatedAt. The server is the
 *      authority. When the server wins, the local plan is REPLACED and the
 *      interface is told the plan changed on another device. Architecture
 *      risk 4 is explicit that one edit losing must be SAID, never silently
 *      reconciled.
 *
 *   3. ANONYMOUS WORK IS NEVER UPLOADED BY ITSELF. Signing in moves both
 *      stores to `u:<userId>`, which is a different key from
 *      `anon:<deviceId>`, so work done signed out is simply not in the
 *      record this file syncs. It reaches an account through the store's
 *      explicit claim flow and no other way.
 *
 *   4. THE OLD SYNC IS NOT TOUCHED. `user_state.progress` and
 *      `user_state.study_plan` keep being pulled, merged and pushed by
 *      src/lib/auth/sync.ts exactly as they were. This layer runs beside it,
 *      against three new tables, and a failure here can never affect it.
 *
 * THE TABLES DO NOT EXIST YET
 * supabase/migrations/2026-09-21-learning.sql is a PROPOSAL. Nobody has run
 * it. So this layer must survive its own tables being absent: a 404 or
 * PostgREST's missing-relation error means "learning tables not available",
 * and the answer is to stop, say so honestly through SyncStatus, and keep
 * working on this device alone. No error in the student's face, and no
 * retrying something that cannot start working until somebody applies a
 * migration.
 *
 * NOTHING HERE DECIDES ANYTHING ABOUT LEARNING
 * It moves rows. What evidence means is policy.ts; what to do next is the
 * planner. This file never builds a plan and never judges an answer.
 *
 * TESTABLE WITHOUT A BROWSER
 * Every edge is an argument: the transport, the two stores, the storage, the
 * clock, the timers, the companion adapters. tests/learning-sync.test.ts
 * runs the real code over real HTTP against the local Supabase stand-in.
 */

import type { EvidenceEvent } from './contracts/evidence';
import type { PersonalPlanV1 } from './contracts/plan';
import { PLAN_HISTORY_MAX } from './contracts/plan';
import type { CacheOwner, CompanionKind, SyncStatus } from './contracts/sync';
import {
  CACHE_NAMESPACE_SEPARATOR,
  EVIDENCE_BATCH_MAX,
  SYNC_BACKOFF_BASE_MS,
  SYNC_BACKOFF_CEILING_MS,
  SYNC_DEBOUNCE_MS,
  SYNC_RETRY_WINDOW_MS,
  SYNC_STATE_KEY,
} from './contracts/sync';
import { assertNoRawAudio, canonicalJson, hashContent, validateEvidenceEvent } from './evidence';
import {
  getLearnerStore,
  getPlanStore,
  ownerNamespace,
  userOwner,
  type BrowserStorage,
  type LearnerStore,
  type PlanStore,
} from './store.browser';
import { readNotesSyncSnapshot, writeNotesSyncSnapshot, type Bookmark, type NotesStore } from '../notes';
import { getLocale, isLocale, setLocale, LOCALE_STORAGE_KEY } from '../i18n/locale';

/* ── Talking to the account ──────────────────────────────────────────────── */

/** One answer from the account, or the fact that nothing answered. */
export interface SyncResponse {
  status: number;
  body: unknown;
  /** The request never reached anything: no network, DNS, a blocked or
      aborted fetch. Deliberately told apart from an answer the server gave,
      because "you are offline" and "the server said no" are different
      sentences and the student is owed the right one. */
  offline?: boolean;
}

/** The two calls this layer makes, as an interface, so a test can point the
    real code at the local stand-in and the browser can point it at Supabase
    without either knowing about the other. */
export interface SyncTransport {
  get(path: string): Promise<SyncResponse>;
  post(path: string, body: unknown, prefer: string): Promise<SyncResponse>;
}

export interface RestTransportConfig {
  /** The project origin, for example https://<ref>.supabase.co. */
  baseUrl: string;
  /** The public anon key. Row level security is what protects the rows; this
      key only says which project is being asked. */
  apiKey: string;
  /** Read fresh every call, so a token refreshed mid-session is picked up
      and a signed-out session simply stops sending requests. */
  accessToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

/** The ordinary PostgREST calls, spelled out once. Same shapes as
    supabase/README.md and tests/learning-sync-server.test.ts. */
export function createRestTransport(config: RestTransportConfig): SyncTransport {
  const doFetch = config.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const base = config.baseUrl.replace(/\/+$/, '');

  async function call(method: 'GET' | 'POST', path: string, body?: unknown, prefer?: string): Promise<SyncResponse> {
    const token = await config.accessToken();
    /* No token means nobody is signed in. That is not an error and not a
       thing to retry: there is no account to sync with. */
    if (!token) return { status: 401, body: null };
    const headers: Record<string, string> = {
      apikey: config.apiKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    if (prefer) headers.Prefer = prefer;
    try {
      const response = await doFetch(`${base}/rest/v1/${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }
      return { status: response.status, body: parsed };
    } catch {
      return { status: 0, body: null, offline: true };
    }
  }

  return {
    get: (path) => call('GET', path),
    post: (path, body, prefer) => call('POST', path, body, prefer),
  };
}

function ok(response: SyncResponse): boolean {
  return response.status >= 200 && response.status < 300;
}

/** "These tables are not in this project." The migration is a proposal that
    nobody has applied, so this is the normal answer today, not a fault.
 *
 * PostgREST answers a request for a table it does not know with 404 and
 * either Postgres's own 42P01 (undefined table) or its own PGRST205 (not in
 * the schema cache). All three are checked, because which one comes back
 * depends on whether the schema cache has been reloaded. */
export function looksLikeMissingTable(response: SyncResponse): boolean {
  if (response.offline) return false;
  if (response.status === 404) return true;
  const body = response.body as { code?: unknown; message?: unknown } | null;
  const code = typeof body?.code === 'string' ? body.code : '';
  if (code === '42P01' || code === 'PGRST205') return true;
  const message = typeof body?.message === 'string' ? body.message : '';
  return /relation .* does not exist|could not find the table/i.test(message);
}

/* ── The row shapes, exactly as the migration defines them ───────────────── */

interface LearningEventRow {
  user_id: string;
  event_id: string;
  event: EvidenceEvent;
  occurred_at: string;
  activity_id: string;
  paper: string | null;
  mode: string;
  created_at?: string;
}

interface LearningPlanRow {
  user_id: string;
  plan: PersonalPlanV1;
  revision: number;
  confirmed: boolean;
  updated_at: string;
}

interface LearningCompanionRow {
  user_id: string;
  kind: CompanionKind;
  data: CompanionDocV1;
  revision: number;
  updated_at?: string;
}

function eventRow(userId: string, event: EvidenceEvent): LearningEventRow {
  return {
    user_id: userId,
    event_id: event.id,
    event,
    occurred_at: event.at,
    activity_id: event.activityId,
    paper: event.paper ?? null,
    mode: event.mode,
  };
}

/** Anything arriving from another device is checked properly before it is
    allowed anywhere near the record: the full field validator, and the
    raw-audio scan, which must hold however a row got into the table. */
export function acceptableRemoteEvent(value: unknown): value is EvidenceEvent {
  if (validateEvidenceEvent(value).length > 0) return false;
  try {
    assertNoRawAudio(value);
  } catch {
    return false;
  }
  return true;
}

/* ── The plan conflict rule, in one place ────────────────────────────────── */

/** PLAN_CONFLICT_RULE, as code: confirmed beats unconfirmed, then the higher
    revision, then the later updatedAt. The same three lines the migration's
    guard_learning_plan_write() trigger runs server side, so a device can
    work out what the server is about to decide before it asks. */
export function planOutranks(candidate: PersonalPlanV1, held: PersonalPlanV1): boolean {
  if (candidate.confirmed !== held.confirmed) return candidate.confirmed;
  if (candidate.revision !== held.revision) return candidate.revision > held.revision;
  return candidate.updatedAt > held.updatedAt;
}

/** Everything about a plan a student would notice, which is everything
    except its change history. Two plans that differ only in history are the
    same plan to them, so adopting one over the other is not news. */
function planContentDigest(plan: PersonalPlanV1): string {
  return canonicalJson({ ...plan, history: [] });
}

/** The loser's change history is kept: PLAN_CONFLICT_RULE says "history
    merged", and those entries are the plain-language record of why the plan
    moved, which the weekly review quotes.
 *
 * It is merged into the LOCAL copy only, and never pushed back on its own.
 * Pushing a history-only change would need a higher revision, and a higher
 * revision is how a real plan change outranks another device: spending one
 * on a bookkeeping merge would let a cosmetic write beat a student's actual
 * edit. Local is where the history is read, so local is where it is kept. */
function withMergedHistory(winner: PersonalPlanV1, loser: PersonalPlanV1): PersonalPlanV1 {
  const seen = new Set(winner.history.map((entry) => canonicalJson(entry)));
  const extra = loser.history.filter((entry) => !seen.has(canonicalJson(entry)));
  if (extra.length === 0) return winner;
  const history = [...winner.history, ...extra]
    .sort((a, b) => (a.at === b.at ? a.toRevision - b.toRevision : a.at < b.at ? -1 : 1))
    .slice(-PLAN_HISTORY_MAX);
  return { ...winner, history };
}

export interface PlanResolution {
  winner: 'local' | 'server' | 'neither';
  plan: PersonalPlanV1 | null;
  /** True when a plan this device held lost to a genuinely different one
      from the account, which is the only case the student is told about. */
  replacedLocal: boolean;
}

/** Decide between what this device holds and what the account holds. Pure,
    so the same pair gives the same answer on both devices and in tests. */
export function resolvePlanConflict(
  local: PersonalPlanV1 | null,
  server: PersonalPlanV1 | null,
): PlanResolution {
  if (!local && !server) return { winner: 'neither', plan: null, replacedLocal: false };
  if (!server) return { winner: 'local', plan: local, replacedLocal: false };
  if (!local) return { winner: 'server', plan: server, replacedLocal: false };
  if (!planOutranks(server, local)) return { winner: 'local', plan: local, replacedLocal: false };
  return {
    winner: 'server',
    plan: withMergedHistory(server, local),
    replacedLocal: planContentDigest(server) !== planContentDigest(local),
  };
}

/** A quick shape check on a plan arriving from the account, the same idea as
    parsePlan in store.browser.ts: a row missing anything every reader
    dereferences is treated as no plan rather than served to a screen. */
function looksLikePlan(value: unknown): value is PersonalPlanV1 {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<PersonalPlanV1>;
  return (
    plan.version === 1 &&
    typeof plan.revision === 'number' &&
    typeof plan.confirmed === 'boolean' &&
    typeof plan.updatedAt === 'string' &&
    Array.isArray(plan.history) &&
    !!plan.goals &&
    !!plan.constraints &&
    !!plan.activeSession
  );
}

/* ── Companion documents, and the merge rule for each kind ───────────────── */

/** One companion store, wrapped so it carries a clock.
 *
 * The stores themselves (vocabulary review state, saved lessons and notes,
 * the interface language) have no idea when they were last changed, and some
 * of what they hold is a plain setting with no natural key to merge on. The
 * envelope gives every kind one honest answer to "which side is newer", and
 * the per-kind rules below use it only for the parts that have no clock of
 * their own. */
export interface CompanionDocV1<T = unknown> {
  version: 1;
  updatedAt: string;
  value: T;
}

function companionDoc<T>(value: T, updatedAt: string): CompanionDocV1<T> {
  return { version: 1, updatedAt, value };
}

function isCompanionDoc(value: unknown): value is CompanionDocV1 {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Partial<CompanionDocV1>;
  return doc.version === 1 && typeof doc.updatedAt === 'string' && doc.value !== undefined;
}

/* Vocabulary review state, from ielts.vocab.v1. Shapes repeated here rather
   than imported, because src/lib/vocab-review.ts also builds the whole card
   set at module load and this file must not drag that onto every page: the
   default adapter below loads it only when a signed-in student syncs. */
interface VocabCardStateLike {
  ease: number;
  interval: number;
  due: string;
  reps: number;
  lapses: number;
  introducedDate: string;
  lastReviewed?: string;
}

interface VocabStoreLike {
  version: 1;
  settings: { newPerDay: number };
  cards: Record<string, VocabCardStateLike>;
}

/** THE VOCABULARY RULE, per word:
 *
 *   - the card with the LATER `lastReviewed` wins outright, because the
 *     later review is the newer truth about that word;
 *   - a card never rated loses to one that has been;
 *   - on an exact tie of `lastReviewed`, the LONGER interval wins, so an
 *     interval can never go backwards because an older device's copy
 *     happened to arrive second;
 *   - `introducedDate` keeps the EARLIER of the two, so a word already being
 *     learned is never re-dated as new and never eats a new-card slot twice;
 *   - `lapses` keeps the HIGHER count. Each device counts its own failures,
 *     and the honest answer to "how often has this word been missed" is
 *     never the smaller of two true counts.
 *
 * `settings.newPerDay` has no clock of its own, so it follows the document's
 * `updatedAt`: the side the student changed more recently. */
export function mergeVocabValue(
  local: VocabStoreLike,
  remote: VocabStoreLike,
  localAt: string,
  remoteAt: string,
): VocabStoreLike {
  const cards: Record<string, VocabCardStateLike> = {};
  for (const word of new Set([...Object.keys(local.cards ?? {}), ...Object.keys(remote.cards ?? {})])) {
    const mine = local.cards?.[word];
    const theirs = remote.cards?.[word];
    if (!mine) {
      if (theirs) cards[word] = theirs;
      continue;
    }
    if (!theirs) {
      cards[word] = mine;
      continue;
    }
    const mineAt = mine.lastReviewed ?? '';
    const theirsAt = theirs.lastReviewed ?? '';
    let winner: VocabCardStateLike;
    if (mineAt !== theirsAt) winner = mineAt > theirsAt ? mine : theirs;
    else if (mine.interval !== theirs.interval) winner = mine.interval > theirs.interval ? mine : theirs;
    else winner = mine.reps >= theirs.reps ? mine : theirs;
    cards[word] = {
      ...winner,
      introducedDate:
        mine.introducedDate <= theirs.introducedDate ? mine.introducedDate : theirs.introducedDate,
      lapses: Math.max(mine.lapses, theirs.lapses),
    };
  }
  const newer = localAt >= remoteAt ? local : remote;
  return { version: 1, settings: { ...newer.settings }, cards };
}

/** THE NOTES AND SAVED LESSONS RULE:
 *
 *   - a bookmark is identified by (kind, id); the later `savedAt` wins;
 *   - a note is identified by its lesson id; the later `updatedAt` wins;
 *   - both are a UNION. Neither store writes a tombstone when something is
 *     removed, so un-saving a lesson on one device does not un-save it on
 *     the other: the copy comes back on the next sync. That is the safe
 *     direction for a student's own saved work, and it is a real limitation
 *     rather than a bug to hide. Tombstones are the fix if it ever matters,
 *     and they would be a change to the notes store, not to this file. */
export function mergeNotesValue(local: NotesStore, remote: NotesStore): NotesStore {
  const bookmarks = new Map<string, Bookmark>();
  for (const bookmark of [...(local.bookmarks ?? []), ...(remote.bookmarks ?? [])]) {
    const key = `${bookmark.kind}:${bookmark.id}`;
    const held = bookmarks.get(key);
    if (!held || bookmark.savedAt > held.savedAt) bookmarks.set(key, bookmark);
  }
  const notes: NotesStore['notes'] = {};
  for (const id of new Set([...Object.keys(local.notes ?? {}), ...Object.keys(remote.notes ?? {})])) {
    const mine = local.notes?.[id];
    const theirs = remote.notes?.[id];
    if (!mine) {
      if (theirs) notes[id] = theirs;
      continue;
    }
    if (!theirs) {
      notes[id] = mine;
      continue;
    }
    notes[id] = mine.updatedAt >= theirs.updatedAt ? mine : theirs;
  }
  return {
    version: 1,
    bookmarks: [...bookmarks.values()].sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0)),
    notes,
  };
}

interface PreferencesLike {
  locale?: string;
}

/** THE PREFERENCES RULE: a preference is one value the student chose and
    carries no clock, so the whole document follows `updatedAt` and the side
    they changed more recently wins. Nothing is merged field by field: two
    halves of two different choices is not a choice anybody made. */
export function mergePreferencesValue(
  local: PreferencesLike,
  remote: PreferencesLike,
  localAt: string,
  remoteAt: string,
): PreferencesLike {
  return localAt >= remoteAt ? { ...local } : { ...remote };
}

/** One companion store, as this layer needs to see it. `read` and `write`
    may be async so a default adapter can load its module only when a
    signed-in student actually syncs. */
export interface CompanionAdapter<T = unknown> {
  kind: CompanionKind;
  read(): Promise<T> | T;
  write(value: T): Promise<void> | void;
  merge(local: T, remote: T, localAt: string, remoteAt: string): T;
  /** True when there is nothing on this device yet. An empty store must
      never win a tie on its timestamp: a new phone would otherwise push its
      blank settings over the account's real ones. */
  isEmpty(value: T): boolean;
}

/** The language the student actually chose, or null when they never have.
    Read from the key itself rather than through getLocale(), which answers
    with the device's own language when nothing was chosen. */
function storedLocale(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const held = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(held) ? held : null;
  } catch {
    return null;
  }
}

/** The three kinds the browser holds today, wired to the real stores.
 *
 * Vocabulary is loaded on demand. src/lib/vocab-review.ts builds the whole
 * card deck at module load (every word in words.ts plus every vocabulary
 * lesson body), and no page should pay for that just because it has an
 * account menu on it. */
export function defaultCompanionAdapters(): CompanionAdapter<any>[] {
  return [
    {
      kind: 'vocab',
      read: async () => {
        const vocab = await import('../vocab-review');
        return vocab.readVocabSyncSnapshot() as unknown as VocabStoreLike;
      },
      write: async (value: VocabStoreLike) => {
        const vocab = await import('../vocab-review');
        vocab.writeVocabSyncSnapshot(value as never);
      },
      merge: mergeVocabValue,
      isEmpty: (value: VocabStoreLike) => Object.keys(value?.cards ?? {}).length === 0,
    },
    {
      kind: 'notes',
      read: () => readNotesSyncSnapshot(),
      write: (value: NotesStore) => writeNotesSyncSnapshot(value),
      merge: (local: NotesStore, remote: NotesStore) => mergeNotesValue(local, remote),
      isEmpty: (value: NotesStore) =>
        (value?.bookmarks ?? []).length === 0 && Object.keys(value?.notes ?? {}).length === 0,
    },
    {
      kind: 'preferences',
      /* The STORED language, not the effective one. getLocale() falls back
         to the device's own language when the student has never picked one,
         and a guess must not travel to their other devices as though it
         were a choice. */
      read: (): PreferencesLike => {
        const chosen = storedLocale();
        return chosen ? { locale: chosen } : {};
      },
      write: (value: PreferencesLike) => {
        /* Applied only when it is genuinely different, so a sync never
           re-renders the page for a language it is already showing. */
        if (isLocale(value?.locale) && value.locale !== getLocale()) setLocale(value.locale);
      },
      merge: mergePreferencesValue,
      /* Nothing chosen is nothing to sync: a new device must never push its
         untouched default over the language the student actually picked. */
      isEmpty: (value: PreferencesLike) => value?.locale === undefined,
    },
  ];
}

/* ── What this device remembers between reloads ──────────────────────────── */

interface CompanionSyncState {
  revision: number;
  /** When this device last changed its copy. */
  updatedAt: string;
  /** A hash of the value as it was last synced, so "changed since" is a
      comparison rather than a guess. */
  digest: string;
}

interface SyncStateFile {
  version: 1;
  ownerKey: string;
  /** Event ids written on this device that the account has not confirmed.
      This is the offline queue, and it is only ids: the events themselves
      are already saved in the record, so nothing here is evidence and
      losing this file costs one extra push, never any work. */
  pending: string[];
  /** The newest `created_at` this device has pulled, for catching up without
      re-reading the whole log. */
  eventCursor: string | null;
  /** The plan the account last confirmed it holds, so "not yet sent" can be
      answered without asking. */
  ackedPlan: { revision: number; confirmed: boolean; updatedAt: string } | null;
  companions: Partial<Record<CompanionKind, CompanionSyncState>>;
  lastSyncedAt: string | null;
}

/** 'ielts.learning.sync.v1::u:<userId>'. Namespaced exactly like the record
    and the plan, so one student's queue can never be read under another's
    name and can never be pushed under another's token. */
export function syncStateKey(owner: CacheOwner): string {
  return `${SYNC_STATE_KEY}${CACHE_NAMESPACE_SEPARATOR}${ownerNamespace(owner)}`;
}

function emptySyncState(ownerKey: string): SyncStateFile {
  return {
    version: 1,
    ownerKey,
    pending: [],
    eventCursor: null,
    ackedPlan: null,
    companions: {},
    lastSyncedAt: null,
  };
}

function readSyncState(storage: BrowserStorage | null, owner: CacheOwner): SyncStateFile {
  const ownerKey = ownerNamespace(owner);
  const empty = emptySyncState(ownerKey);
  if (!storage) return empty;
  try {
    const raw = storage.getItem(syncStateKey(owner));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<SyncStateFile>;
    /* A file stamped with somebody else's owner is not read at all. It
       cannot happen through the namespaced key, and it is checked anyway:
       the cost of being wrong here is one student's work pushed under
       another's token. */
    if (parsed?.version !== 1 || parsed.ownerKey !== ownerKey) return empty;
    return {
      version: 1,
      ownerKey,
      pending: Array.isArray(parsed.pending) ? parsed.pending.filter((id) => typeof id === 'string') : [],
      eventCursor: typeof parsed.eventCursor === 'string' ? parsed.eventCursor : null,
      ackedPlan: parsed.ackedPlan ?? null,
      companions: parsed.companions ?? {},
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
    };
  } catch {
    return empty;
  }
}

function writeSyncState(storage: BrowserStorage | null, owner: CacheOwner, state: SyncStateFile): void {
  if (!storage) return;
  try {
    storage.setItem(syncStateKey(owner), JSON.stringify(state));
  } catch {
    /* No room for the queue. Everything still works: the next sign-in pulls
       the account's log and rebuilds the queue exactly, because the queue is
       only ever "what the account does not have yet". */
  }
}

/* ── The layer ───────────────────────────────────────────────────────────── */

export interface LearningSyncOptions {
  /** How to reach the account. Null means accounts are not configured here,
      which is not an error: the site is offline-first by design. */
  transport: SyncTransport | null;
  learnerStore?: LearnerStore;
  planStore?: PlanStore;
  /** Where the queue is kept. Defaults to whatever the learner store uses,
      which in a test is a few lines of memory. */
  storage?: BrowserStorage | null;
  now?: () => string;
  /** Sign-in and sign-out, when something more than the two stores has to
      move (src/lib/auth/sync.ts hands in the learning module's own setter,
      which also drops its cached session view). */
  setOwner?: (owner: CacheOwner | null) => void;
  companions?: readonly CompanionAdapter<any>[];
  debounceMs?: number;
  backoffBaseMs?: number;
  backoffCeilingMs?: number;
  retryWindowMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Wall clock in milliseconds, for the retry window. */
  monotonic?: () => number;
}

export interface LearningSync {
  /** Sign-in: move both stores to this student, pull what the account
      holds, resolve the plan, then push what it lacks. */
  start(userId: string): Promise<void>;
  /** Sign-out or account switch. `forget` removes this student's cached
      record and plan from the device once the account has everything. */
  stop(options?: { forget?: boolean }): Promise<void>;
  /** Push now rather than at the end of the debounce. */
  flush(): Promise<void>;
  /** Pull, resolve and push, as on sign-in. */
  reconcile(): Promise<void>;
  status(): SyncStatus;
  subscribe(listener: (status: SyncStatus) => void): () => void;
  /** The interface has shown the student that their plan changed on another
      device. Until this is called the status keeps saying so, so a later
      successful push cannot swallow the message. */
  acknowledgePlanChange(): void;
  userId(): string | null;
}

const SIGNED_OUT: SyncStatus = {
  state: 'signed-out',
  pendingEvents: 0,
  planPending: false,
  pendingGrading: 0,
  lastSyncedAt: null,
};

export function createLearningSync(options: LearningSyncOptions): LearningSync {
  const learnerStore = options.learnerStore ?? getLearnerStore();
  const planStore = options.planStore ?? getPlanStore();
  const now = options.now ?? (() => new Date().toISOString());
  const monotonic = options.monotonic ?? (() => Date.now());
  const debounceMs = options.debounceMs ?? SYNC_DEBOUNCE_MS;
  const backoffBaseMs = options.backoffBaseMs ?? SYNC_BACKOFF_BASE_MS;
  const backoffCeilingMs = options.backoffCeilingMs ?? SYNC_BACKOFF_CEILING_MS;
  const retryWindowMs = options.retryWindowMs ?? SYNC_RETRY_WINDOW_MS;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const companions = options.companions ?? defaultCompanionAdapters();
  const storage = options.storage;

  let currentUserId: string | null = null;
  let owner: CacheOwner | null = null;
  let state: SyncStateFile | null = null;
  let status: SyncStatus = SIGNED_OUT;
  let tablesAvailable = true;
  let planChangedElsewhereAt: string | null = null;
  let firstFailureAt: number | null = null;
  let attempts = 0;
  let pushTimer: unknown = null;
  let retryTimer: unknown = null;
  let unsubscribes: (() => void)[] = [];
  /* Bumped on every start and stop. Every async step checks it before it
     writes anything, so a slow reply meant for student A can never land in
     student B's store after a sign-out. */
  let generation = 0;
  let inFlight: Promise<void> | null = null;
  let runAgain = false;
  /* True only while a status is being handed to the record, so this file's
     own subscriber can tell its own notification from a student's write. */
  let publishing = false;
  const listeners = new Set<(status: SyncStatus) => void>();

  function statusStorage(): BrowserStorage | null {
    /* `undefined` means "whatever the record uses". Explicit null means "do
       not keep a queue at all", which is what a server render wants. */
    if (storage !== undefined) return storage;
    return typeof window === 'undefined' ? null : window.localStorage;
  }

  /* ── status ── */

  function pendingGradingCount(): number {
    try {
      return learnerStore.read().events.filter((event) => event.pendingGrading === true).length;
    } catch {
      return 0;
    }
  }

  function planPending(): boolean {
    const plan = planStore.read();
    if (!plan) return false;
    const acked = state?.ackedPlan ?? null;
    if (!acked) return true;
    return (
      acked.revision !== plan.revision ||
      acked.confirmed !== plan.confirmed ||
      acked.updatedAt !== plan.updatedAt
    );
  }

  function publish(next: Partial<SyncStatus> & Pick<SyncStatus, 'state'>): void {
    const built: SyncStatus = {
      state: next.state,
      pendingEvents: next.pendingEvents ?? (state?.pending.length ?? 0),
      planPending: next.planPending ?? planPending(),
      pendingGrading: next.pendingGrading ?? pendingGradingCount(),
      lastSyncedAt: next.lastSyncedAt !== undefined ? next.lastSyncedAt : (state?.lastSyncedAt ?? null),
      ...(next.error ? { error: next.error } : {}),
      ...(planChangedElsewhereAt ? { planChangedElsewhereAt } : {}),
      ...(next.unavailable ? { unavailable: true } : {}),
    };
    /* An unacknowledged "your plan changed on another device" outranks a
       plain tick. The student is told once, and the message waits for them
       rather than for the next request to finish. */
    if (planChangedElsewhereAt && built.state === 'synced') built.state = 'conflict';
    status = built;
    /* Handing the status to the record makes the record notify its
       subscribers, and one of those subscribers is this file's own "the
       student wrote something" listener. Without this flag that listener
       would publish again, and publishing would notify again. */
    publishing = true;
    try {
      learnerStore.setSyncStatus(built);
    } finally {
      publishing = false;
    }
    for (const listener of listeners) {
      try {
        listener(built);
      } catch {
        /* A listener throwing must not break the sync. */
      }
    }
  }

  function saveState(): void {
    if (state && owner) writeSyncState(statusStorage(), owner, state);
  }

  /* ── the queue ──
   *
   * The queue is not a copy of anything. Every event is already saved in the
   * record, so all this device has to remember is WHICH ids the account has
   * confirmed. `acknowledged` is that set, held in memory; what is written
   * to storage is its complement against the record, which is what actually
   * needs to survive a reload and is tiny in the normal case.
   *
   * Being wrong in the direction of "not acknowledged" costs one extra
   * request and nothing else, because a repeated push is a no-op by
   * construction. Being wrong the other way would lose work, so every repair
   * path below errs the safe way, and a FULL pull resets the set from what
   * the account actually holds. */

  let acknowledged = new Set<string>();

  function localEvents(): readonly EvidenceEvent[] {
    return learnerStore.read().events;
  }

  function recomputePending(): void {
    if (!state) return;
    const next = localEvents()
      .filter((event) => !acknowledged.has(event.id))
      .map((event) => event.id);
    if (next.length === state.pending.length && next.every((id, index) => state?.pending[index] === id)) return;
    state.pending = next;
    saveState();
  }

  /** Every event the account has not confirmed, oldest first. */
  function pendingEvents(): EvidenceEvent[] {
    const queued = new Set(state?.pending ?? []);
    return localEvents().filter((event) => queued.has(event.id));
  }

  function acknowledge(ids: readonly string[]): void {
    for (const id of ids) acknowledged.add(id);
    recomputePending();
  }

  /* ── pulling ── */

  async function pullEvents(
    userId: string,
    full: boolean,
  ): Promise<{ ok: boolean; serverIds: Set<string> | null; response: SyncResponse | null }> {
    const transport = options.transport;
    if (!transport) return { ok: false, serverIds: null, response: null };
    let path = `learning_events?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.asc`;
    /* The catch-up pull asks only for rows newer than the last one seen.
       PostgREST honours `created_at=gt.<cursor>`; the local stand-in models
       only `eq.` filters and simply ignores this one, handing back the whole
       log. Both are correct here, because the merge below is a union by id:
       an over-broad answer costs a little bandwidth and changes nothing. */
    if (!full && state?.eventCursor) {
      path += `&created_at=gt.${encodeURIComponent(state.eventCursor)}`;
    }
    const response = await transport.get(path);
    if (!ok(response)) return { ok: false, serverIds: null, response };
    const rows = Array.isArray(response.body) ? (response.body as LearningEventRow[]) : [];

    const events: EvidenceEvent[] = [];
    const serverIds = new Set<string>();
    let newest = state?.eventCursor ?? null;
    for (const row of rows) {
      if (typeof row?.event_id === 'string') serverIds.add(row.event_id);
      if (typeof row?.created_at === 'string' && (newest === null || row.created_at > newest)) {
        newest = row.created_at;
      }
      if (acceptableRemoteEvent(row?.event)) events.push(row.event);
    }
    /* Anything the account handed back is, by definition, something it
       holds, so it never needs pushing again. */
    for (const id of serverIds) acknowledged.add(id);
    if (events.length > 0) learnerStore.mergeRemoteEvents(events);
    if (state) {
      state.eventCursor = newest;
      saveState();
    }
    recomputePending();
    return { ok: true, serverIds: full ? serverIds : null, response };
  }

  async function pullPlan(userId: string): Promise<{ ok: boolean; plan: PersonalPlanV1 | null }> {
    const transport = options.transport;
    if (!transport) return { ok: false, plan: null };
    const response = await transport.get(
      `learning_plan?user_id=eq.${encodeURIComponent(userId)}&select=*`,
    );
    if (!ok(response)) return { ok: false, plan: null };
    const rows = Array.isArray(response.body) ? (response.body as LearningPlanRow[]) : [];
    const row = rows[0];
    return { ok: true, plan: row && looksLikePlan(row.plan) ? row.plan : null };
  }

  async function pullCompanion(
    userId: string,
    kind: CompanionKind,
  ): Promise<{ ok: boolean; row: LearningCompanionRow | null }> {
    const transport = options.transport;
    if (!transport) return { ok: false, row: null };
    const response = await transport.get(
      `learning_companions?user_id=eq.${encodeURIComponent(userId)}&kind=eq.${encodeURIComponent(kind)}&select=*`,
    );
    if (!ok(response)) return { ok: false, row: null };
    const rows = Array.isArray(response.body) ? (response.body as LearningCompanionRow[]) : [];
    return { ok: true, row: rows[0] ?? null };
  }

  /* ── pushing ── */

  async function pushEvents(userId: string): Promise<boolean> {
    const transport = options.transport;
    if (!transport) return false;
    const waiting = pendingEvents();
    if (waiting.length === 0) return true;

    for (let from = 0; from < waiting.length; from += EVIDENCE_BATCH_MAX) {
      const batch = waiting.slice(from, from + EVIDENCE_BATCH_MAX);
      const response = await transport.post(
        'learning_events?on_conflict=user_id,event_id',
        batch.map((event) => eventRow(userId, event)),
        'resolution=ignore-duplicates,return=representation',
      );
      if (!ok(response)) {
        if (looksLikeMissingTable(response)) degrade();
        return false;
      }
      if (currentUserId !== userId) return false;
      /* The reply holds only the rows the account stored for the FIRST time,
         so anything sent and missing from it was already there. Both count
         as acknowledged: a duplicate is not an error, it is the idempotency
         working. */
      acknowledge(batch.map((event) => event.id));
    }
    return true;
  }

  async function pushPlan(userId: string, plan: PersonalPlanV1): Promise<boolean> {
    const transport = options.transport;
    if (!transport) return false;
    const response = await transport.post(
      'learning_plan?on_conflict=user_id',
      {
        user_id: userId,
        plan,
        revision: plan.revision,
        confirmed: plan.confirmed,
        updated_at: plan.updatedAt,
      },
      'resolution=merge-duplicates,return=representation',
    );
    if (!ok(response)) {
      if (looksLikeMissingTable(response)) degrade();
      return false;
    }
    if (currentUserId !== userId) return false;
    const rows = Array.isArray(response.body) ? (response.body as LearningPlanRow[]) : [];
    const winner = rows[0];
    if (!winner) return true;

    /* The account always hands back the row that actually won, so this is
       how a device finds out it lost without a second request. */
    if (looksLikePlan(winner.plan) && planOutranks(winner.plan, plan)) {
      applyServerPlan(winner.plan, plan);
      return true;
    }
    if (state) {
      state.ackedPlan = {
        revision: winner.revision,
        confirmed: winner.confirmed,
        updatedAt: winner.updated_at,
      };
      saveState();
    }
    return true;
  }

  /** The account's plan replaces this device's, and the student is told. */
  function applyServerPlan(server: PersonalPlanV1, local: PersonalPlanV1 | null): void {
    const resolution = resolvePlanConflict(local, server);
    if (resolution.winner !== 'server' || !resolution.plan) return;
    /* Stamped as acknowledged BEFORE the write, because writing notifies,
       and a notification that found the old stamp would read the account's
       own plan as something still waiting to be sent. */
    if (state) {
      state.ackedPlan = {
        revision: server.revision,
        confirmed: server.confirmed,
        updatedAt: server.updatedAt,
      };
      saveState();
    }
    planStore.save(resolution.plan);
    if (resolution.replacedLocal) planChangedElsewhereAt = now();
  }

  async function syncCompanion(userId: string, adapter: CompanionAdapter<any>): Promise<boolean> {
    const transport = options.transport;
    if (!transport) return false;
    const local = await adapter.read();
    if (currentUserId !== userId) return false;

    const held = state?.companions[adapter.kind] ?? null;
    const digest = hashContent(canonicalJson(local));
    /* When this device's copy differs from what it last synced, it changed
       here and now is when. Otherwise it still carries the stamp it had. An
       empty store is dated at the epoch so it can never win a tie and push
       blank settings over the account's real ones. */
    const localAt = adapter.isEmpty(local)
      ? '0000-01-01T00:00:00.000Z'
      : held && held.digest === digest
        ? held.updatedAt
        : now();

    const pulled = await pullCompanion(userId, adapter.kind);
    if (!pulled.ok) return false;
    if (currentUserId !== userId) return false;

    const remoteDoc = pulled.row && isCompanionDoc(pulled.row.data) ? pulled.row.data : null;
    const merged = remoteDoc
      ? adapter.merge(local, remoteDoc.value as never, localAt, remoteDoc.updatedAt)
      : local;
    const mergedDigest = hashContent(canonicalJson(merged));
    const mergedAt = remoteDoc && remoteDoc.updatedAt > localAt ? remoteDoc.updatedAt : localAt;

    if (mergedDigest !== digest) {
      await adapter.write(merged);
      if (currentUserId !== userId) return false;
    }

    /* Push only when the account's copy is not already the merged one. */
    const remoteDigest = remoteDoc ? hashContent(canonicalJson(remoteDoc.value)) : null;
    let revision = pulled.row?.revision ?? 0;
    if (remoteDigest !== mergedDigest) {
      revision = Math.max(revision, held?.revision ?? 0) + 1;
      const response = await transport.post(
        'learning_companions?on_conflict=user_id,kind',
        {
          user_id: userId,
          kind: adapter.kind,
          data: companionDoc(merged, mergedAt),
          revision,
        },
        'resolution=merge-duplicates,return=representation',
      );
      if (!ok(response)) {
        if (looksLikeMissingTable(response)) degrade();
        return false;
      }
      if (currentUserId !== userId) return false;
    }
    if (state) {
      state.companions[adapter.kind] = { revision, updatedAt: mergedAt, digest: mergedDigest };
      saveState();
    }
    return true;
  }

  /* ── degrading honestly ── */

  /** The account has no learning tables. Stop, say so, keep working here.
      Deliberately NOT a retry: nothing this device does will create a table,
      and a student is not shown an error for a migration nobody has run. */
  function degrade(): void {
    tablesAvailable = false;
    cancelTimers();
    publish({ state: 'error', error: 'not-configured', unavailable: true });
  }

  function cancelTimers(): void {
    if (pushTimer !== null) {
      clearTimer(pushTimer);
      pushTimer = null;
    }
    if (retryTimer !== null) {
      clearTimer(retryTimer);
      retryTimer = null;
    }
  }

  function scheduleRetry(): void {
    if (!tablesAvailable || currentUserId === null) return;
    if (retryTimer !== null) clearTimer(retryTimer);
    const delay = Math.min(backoffCeilingMs, backoffBaseMs * 2 ** attempts);
    attempts += 1;
    retryTimer = setTimer(() => {
      retryTimer = null;
      void runCycle(true);
    }, delay);
  }

  /* ── one cycle ── */

  async function cycle(full: boolean): Promise<void> {
    const userId = currentUserId;
    if (userId === null || !owner) return;
    if (!options.transport) {
      publish({ state: 'error', error: 'not-configured', unavailable: true });
      return;
    }
    if (!tablesAvailable) return;

    publish({ state: 'syncing' });
    const run = generation;

    const pulledEvents = await pullEvents(userId, full);
    if (run !== generation) return;
    if (!pulledEvents.ok) {
      const why = pulledEvents.response;
      if (why && looksLikeMissingTable(why)) {
        degrade();
        return;
      }
      /* Anything else is treated as "not right now": no network, a token
         being refreshed, the service having a bad minute. All of them are
         worth trying again, and the backoff keeps a bad one to a request a
         minute rather than a storm. */
      fail(why?.offline ? 'offline' : 'error');
      return;
    }

    const pulledPlan = await pullPlan(userId);
    if (run !== generation) return;
    if (!pulledPlan.ok) {
      fail('offline');
      return;
    }
    const localPlan = planStore.read();
    const resolution = resolvePlanConflict(localPlan, pulledPlan.plan);
    if (resolution.winner === 'server' && pulledPlan.plan) {
      applyServerPlan(pulledPlan.plan, localPlan);
    }

    if (!(await pushEvents(userId))) {
      if (run !== generation || !tablesAvailable) return;
      fail('offline');
      return;
    }
    if (run !== generation) return;

    const planToPush = planStore.read();
    if (planToPush && planPending()) {
      if (!(await pushPlan(userId, planToPush))) {
        if (run !== generation || !tablesAvailable) return;
        fail('offline');
        return;
      }
      if (run !== generation) return;
    }

    for (const adapter of companions) {
      if (!(await syncCompanion(userId, adapter))) {
        if (run !== generation || !tablesAvailable) return;
        fail('offline');
        return;
      }
      if (run !== generation) return;
    }

    attempts = 0;
    firstFailureAt = null;
    if (state) {
      state.lastSyncedAt = now();
      saveState();
    }
    publish({ state: 'synced' });
  }

  function fail(kind: 'offline' | 'error'): void {
    if (firstFailureAt === null) firstFailureAt = monotonic();
    const waited = monotonic() - firstFailureAt;
    /* Past the retry window the wording changes, not the behaviour: the
       device keeps trying at the ceiling, and the student is told plainly
       that their work is on this device only for now. */
    publish({
      state: 'offline',
      ...(kind === 'error' && waited > retryWindowMs ? { error: 'network' as const } : {}),
    });
    scheduleRetry();
  }

  /** One at a time, and never lose a request that arrived mid-flight. */
  function runCycle(full: boolean): Promise<void> {
    if (inFlight) {
      runAgain = true;
      return inFlight;
    }
    const started = cycle(full)
      .catch(() => {
        /* A throw inside a cycle is a bug here, never the student's problem:
           the record is already saved locally, so the honest report is the
           same as a failed push. */
        fail('error');
      })
      .then(() => {
        inFlight = null;
        if (runAgain) {
          runAgain = false;
          return runCycle(false);
        }
        return undefined;
      });
    inFlight = started;
    return started;
  }

  function schedulePush(): void {
    if (currentUserId === null || !tablesAvailable) return;
    if (pushTimer !== null) clearTimer(pushTimer);
    pushTimer = setTimer(() => {
      pushTimer = null;
      void runCycle(false);
    }, debounceMs);
  }

  /* ── the public surface ── */

  async function start(userId: string): Promise<void> {
    if (currentUserId === userId && unsubscribes.length > 0) return;
    await stop({ forget: false });

    generation += 1;
    currentUserId = userId;
    owner = userOwner(userId);
    tablesAvailable = true;
    attempts = 0;
    firstFailureAt = null;
    planChangedElsewhereAt = null;
    /* A fresh set per student. Nothing student A's device learned about what
       the account holds is true of student B. */
    acknowledged = new Set();

    /* Both stores move to this student BEFORE anything is pulled. Work done
       signed out lives under `anon:<deviceId>`, a different key, so it is
       simply not in the record from here on: it reaches an account only
       through the store's explicit claim flow. */
    if (options.setOwner) options.setOwner(owner);
    else {
      learnerStore.setOwner(owner);
      planStore.setOwner(owner);
    }

    state = readSyncState(statusStorage(), owner);
    /* Until the account has answered, assume it has nothing: every event in
       the record counts as waiting. Wrong in the safe direction, because a
       repeated push is a no-op and a missed one is lost work, and it is
       corrected exactly by the full pull a line or two below. It is also
       what lets a device that starts up with no connection say honestly how
       many changes are waiting. */
    recomputePending();
    publish({ state: 'syncing' });

    const onLocalChange = () => {
      if (currentUserId === null || publishing) return;
      const waiting = state?.pending.length ?? 0;
      recomputePending();
      const nowWaiting = state?.pending.length ?? 0;
      /* Only a real change is worth a new status. A write that left nothing
         extra to send (a plan adopted from the account, a status echo) must
         not turn a finished sync back into "syncing". */
      if (nowWaiting !== waiting || planPending()) {
        publish({ state: status.state === 'offline' || status.state === 'error' ? status.state : 'syncing' });
        schedulePush();
      }
    };
    unsubscribes.push(learnerStore.subscribe(onLocalChange));
    unsubscribes.push(planStore.subscribe(onLocalChange));

    /* A full pull: it is the authority on what the account holds, and it is
       what repairs a queue lost to a full browser or a closed tab. */
    await runCycle(true);
  }

  async function stop(stopOptions?: { forget?: boolean }): Promise<void> {
    const leaving = owner;
    const hadUser = currentUserId !== null;
    cancelTimers();
    for (const off of unsubscribes) off();
    unsubscribes = [];

    /* Deliberately NOTHING is pushed here.
     *
     * A last-second flush on sign-out reads the record, and the record is
     * about to belong to somebody else: any ordering mistake between moving
     * the owner and sending the batch would put one student's work into
     * another student's account. Nothing waiting is lost by refusing it,
     * because the queue stays on the device under this student's own
     * namespaced key and the next sign-in sends it. A surface that wants the
     * work sent before the student leaves calls flush() and waits for it.
     *
     * Everything below runs synchronously for the same reason: by the time
     * stop() returns to its caller, the previous student is already out of
     * memory, with no window in which a screen could still read them. */
    const pendingLeft = state?.pending.length ?? 0;
    generation += 1;
    currentUserId = null;
    inFlight = null;
    runAgain = false;
    planChangedElsewhereAt = null;
    acknowledged = new Set();

    if (hadUser) {
      /* Sign-out drops the in-memory copy whatever else happens: the next
         person at this browser must not be able to see the last one's work
         on screen. */
      if (options.setOwner) options.setOwner(null);
      else {
        learnerStore.setOwner(null);
        planStore.setOwner(null);
      }

      if (stopOptions?.forget && leaving && pendingLeft === 0) {
        /* Everything is in the account, so the cached copy on this device is
           a convenience and nothing else. Removing it is what stops one
           student's record sitting readable on a shared machine.
           When something is STILL waiting to be sent, the copy stays: losing
           a student's work to protect a machine they own is the worse of the
           two mistakes, and the record is namespaced by user id, so the next
           person's session cannot read it in any case. */
        learnerStore.forgetOwner(leaving);
        planStore.forgetOwner(leaving);
        const keep = statusStorage();
        if (keep) {
          try {
            keep.removeItem(syncStateKey(leaving));
          } catch {
            /* The file is namespaced and now empty of meaning; leave it. */
          }
        }
      }
    }

    owner = null;
    state = null;
    status = SIGNED_OUT;
    learnerStore.setSyncStatus(hadUser ? SIGNED_OUT : null);
    for (const listener of listeners) {
      try {
        listener(SIGNED_OUT);
      } catch {
        /* A listener throwing must not break sign-out. */
      }
    }
  }

  return {
    start,
    stop,
    flush: async () => {
      if (pushTimer !== null) {
        clearTimer(pushTimer);
        pushTimer = null;
      }
      await runCycle(false);
    },
    reconcile: () => runCycle(true),
    status: () => status,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    acknowledgePlanChange: () => {
      if (!planChangedElsewhereAt) return;
      planChangedElsewhereAt = null;
      publish({ state: status.state === 'conflict' ? 'synced' : status.state });
    },
    userId: () => currentUserId,
  };
}

/* ── The one the site uses ───────────────────────────────────────────────── */

let active: LearningSync | null = null;

/** The live layer, or null when nobody is signed in. The interface reads
    the status through `learnerStoreStatus().sync`; this is here for the one
    thing that needs the object itself, acknowledging a plan change. */
export function activeLearningSync(): LearningSync | null {
  return active;
}

/** Start (or keep) syncing for this student. Safe to call repeatedly. */
export async function startLearningSync(userId: string, options: LearningSyncOptions): Promise<LearningSync> {
  if (active && active.userId() === userId) return active;
  if (active) await active.stop({ forget: false });
  active = createLearningSync(options);
  await active.start(userId);
  return active;
}

/** Sign-out or account switch. */
export async function stopLearningSync(stopOptions?: { forget?: boolean }): Promise<void> {
  const instance = active;
  active = null;
  if (instance) await instance.stop(stopOptions);
}

/** The interface has told the student their plan changed on another device. */
export function acknowledgePlanChangedElsewhere(): void {
  active?.acknowledgePlanChange();
}

/** For tests only: drop the module-level instance without touching a store. */
export function resetLearningSyncForTest(): void {
  active = null;
}
