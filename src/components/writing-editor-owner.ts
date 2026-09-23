/* Whose essay is in the editor (finding R2B-01 of the second Codex inspection).
 *
 * WHY THIS FILE EXISTS
 * R2-02 bound a late GRADE to the student who submitted the essay. The editor
 * itself still belonged to nobody: WritingTester looked the owner up only when
 * the student pressed "Check my essay", and the draft autosave looked it up
 * when its 600 ms timer fired. So student A could type an essay, the page
 * could change hands (a sign-out and sign-in from the avatar menu, or in
 * another tab), and student B could submit A's text into B's own history and
 * learning record. And a switch inside those 600 ms saved A's text under the
 * draft key of whoever had just taken over.
 *
 * WHAT REPLACES IT
 * An editing session, bound to one owner at the moment the essay is started
 * or restored, and never re-resolved after that:
 *
 *   - every draft write carries that owner and lands under that owner's key,
 *     however late its timer fires;
 *   - when the owner changes, the session hands over: the outgoing owner's
 *     latest text is written to THEIR draft straight away, the pending timer
 *     is cancelled, and a new session opens for the incoming owner with their
 *     own draft of the same prompt (or an empty editor);
 *   - a submission is accepted only from a session whose owner is still the
 *     one on the page. Anything else is refused before a request goes out, so
 *     nothing is graded, paid for or recorded.
 *
 * The draft itself is what it always was: the same key,
 * `ielts.writing.draft.v1::<owner namespace>::<prompt id>`, the same
 * convenience-only role (never evidence), cleared once a real report is back.
 *
 * Pure apart from the storage and the timer it is handed, so
 * tests/delayed-grade-owner.test.ts drives it with a Map and a hand-cranked
 * clock instead of a browser.
 */

import type { CacheOwner } from '../lib/learning/contracts/sync';
import {
  bindToCurrentOwner,
  currentOwner,
  deviceStorage,
  ownerNamespace,
  safeGet,
  safeRemove,
  safeSet,
  sameOwner,
  type BrowserStorage,
  type OwnerBinding,
} from '../lib/store-owner';

/* ── The draft store ─────────────────────────────────────────────────────── */

export const ESSAY_DRAFT_PREFIX = 'ielts.writing.draft.v1';

/** How long typing has to pause before the draft is written, so a fast
    typist is not writing to storage on every keystroke. */
export const ESSAY_DRAFT_DEBOUNCE_MS = 600;

/** The draft key for one prompt, under one named owner. There is no default
    owner on purpose: every caller says whose draft it means. */
export function essayDraftKey(promptId: string, owner: CacheOwner): string {
  return `${ESSAY_DRAFT_PREFIX}::${ownerNamespace(owner)}::${promptId}`;
}

export function readEssayDraft(
  promptId: string,
  owner: CacheOwner,
  storage: BrowserStorage | null = deviceStorage(),
): string {
  if (!storage) return '';
  return safeGet(storage, essayDraftKey(promptId, owner)) ?? '';
}

/** Keep `text` as `owner`'s draft of this prompt. An empty text removes the
    draft rather than storing an empty one. Best effort: a full or blocked
    store leaves the essay safe in the tab's own state. */
export function writeEssayDraft(
  promptId: string,
  owner: CacheOwner,
  text: string,
  storage: BrowserStorage | null = deviceStorage(),
): void {
  if (!storage) return;
  const key = essayDraftKey(promptId, owner);
  if (text) safeSet(storage, key, text);
  else safeRemove(storage, key);
}

export function clearEssayDraft(
  promptId: string,
  owner: CacheOwner,
  storage: BrowserStorage | null = deviceStorage(),
): void {
  if (!storage) return;
  safeRemove(storage, essayDraftKey(promptId, owner));
}

/* ── The editing session ─────────────────────────────────────────────────── */

/** The one timer the session needs. The browser's own by default; a test
    hands in a clock it winds by hand. */
export interface DraftTimers {
  set(run: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const browserTimers: DraftTimers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface EssayEditingDeps {
  /** Where drafts live. Read on every write, so a test can swap it. */
  storage?: () => BrowserStorage | null;
  timers?: DraftTimers;
  debounceMs?: number;
}

export interface EssayEditingSession {
  /** Whose essay this is: the current owner when it was started or restored.
      Never changes afterwards. */
  readonly owner: CacheOwner;
  readonly promptId: string;
  /** The student typed. `text` becomes this owner's draft once typing pauses,
      whoever is on the page by then. Ignored once the session is closed. */
  edited(text: string): void;
  /** Write any pending text now, under this session's owner, and stop the
      timer. */
  flush(): void;
  /** A deliberate discard ("get a different task"): drop the pending write
      and remove this owner's draft of the prompt. Closes the session. */
  discard(): void;
  /** Flush, then stop accepting edits. Safe to call any number of times. */
  close(): void;
  closed(): boolean;
  /** This session's owner is still the one on the page. */
  isCurrent(): boolean;
}

export interface OpenedEssay {
  session: EssayEditingSession;
  /** The owner's own draft of the prompt, or '' for an empty editor. */
  draft: string;
}

/** Start, or restore, the essay for one prompt, bound to the owner on the
    page right now. Returns the session and that owner's draft. */
export function openEssayEditing(promptId: string, deps: EssayEditingDeps = {}): OpenedEssay {
  const storage = deps.storage ?? deviceStorage;
  const timers = deps.timers ?? browserTimers;
  const debounceMs = deps.debounceMs ?? ESSAY_DRAFT_DEBOUNCE_MS;
  /* The owner is fixed HERE, once. Nothing below asks again. */
  const owner = currentOwner();

  let pending: { text: string } | null = null;
  let handle: unknown = null;
  let isClosed = false;

  const stopTimer = (): void => {
    if (handle !== null) timers.clear(handle);
    handle = null;
  };

  const writePending = (): void => {
    stopTimer();
    if (!pending) return;
    const { text } = pending;
    pending = null;
    writeEssayDraft(promptId, owner, text, storage());
  };

  const session: EssayEditingSession = {
    owner,
    promptId,
    edited(text) {
      if (isClosed) return;
      pending = { text };
      stopTimer();
      handle = timers.set(writePending, debounceMs);
    },
    flush: writePending,
    discard() {
      stopTimer();
      pending = null;
      isClosed = true;
      clearEssayDraft(promptId, owner, storage());
    },
    close() {
      if (isClosed) return;
      writePending();
      isClosed = true;
    },
    closed: () => isClosed,
    isCurrent: () => sameOwner(currentOwner(), owner),
  };

  return { session, draft: readEssayDraft(promptId, owner, storage()) };
}

/** The page changed hands, or its stores were told to refresh.
 *
 * Returns null when the owner on the page is still the session's (the same
 * owner being told its stores changed, after the anonymous-work claim for
 * instance): nothing on screen is replaced. Otherwise the outgoing owner's
 * latest text is written to their own draft, their pending timer is
 * cancelled, and the same prompt is opened for the incoming owner. */
export function handOverEssayEditing(
  previous: EssayEditingSession,
  deps: EssayEditingDeps = {},
): OpenedEssay | null {
  if (previous.isCurrent()) return null;
  previous.close();
  return openEssayEditing(previous.promptId, deps);
}

/** The binding a grading request is made under, or null when the essay on
    screen was started under an owner who is no longer the one on the page.
 *
 * A null answer is a refusal: the caller sends nothing, so nothing is
 * graded, paid for or recorded, and the text stays in its own owner's
 * draft. */
export function claimSubmission(session: EssayEditingSession | null): OwnerBinding | null {
  if (!session || session.closed() || !session.isCurrent()) return null;
  const binding = bindToCurrentOwner();
  if (!sameOwner(binding.owner, session.owner)) {
    binding.cancel();
    return null;
  }
  return binding;
}
