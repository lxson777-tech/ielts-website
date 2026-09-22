// Lesson bookmarks ("Saved") and per-lesson notes, stored client-side in localStorage.
// Mirrors the versioned-store pattern used by src/lib/progress.ts. Every read and write is
// wrapped in try/catch so a missing or blocked localStorage (SSR, private browsing, disabled
// storage) never throws.
//
// WHOSE SAVED LESSONS (22 September 2026): the key now carries its owner, the same one the
// learner record uses, so a second student signing in on this browser does not inherit the
// first student's saved lessons and notes. See src/lib/store-owner.ts. The base key and the
// stored shape are unchanged.

import { NOTES_STORE_KEY, registerLegacyStoreMerge, scopedKey } from './store-owner';

export interface Bookmark {
  kind: 'lesson' | 'question';
  id: string;
  title: string;
  href: string;
  subtitle?: string;
  savedAt: string;
}

export interface NoteEntry {
  text: string;
  updatedAt: string;
}

export interface NotesStore {
  version: 1;
  bookmarks: Bookmark[];
  notes: Record<string, NoteEntry>;
}

/** The store's base key, unchanged. What reaches localStorage is this plus
    the owner, for example 'ielts.notes.v1::u:9f0c'. */
export const NOTES_KEY = NOTES_STORE_KEY;

const STORAGE_KEY = NOTES_STORE_KEY;

function emptyStore(): NotesStore {
  return { version: 1, bookmarks: [], notes: {} };
}

function readStore(): NotesStore {
  try {
    if (typeof localStorage === 'undefined') return emptyStore();
    const raw = localStorage.getItem(scopedKey(STORAGE_KEY));
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyStore();
    return {
      version: 1,
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: NotesStore): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(store));
  } catch {
    // Storage unavailable or full; fail silently, nothing else to do client-side.
  }
}

function bookmarkKey(kind: Bookmark['kind'], id: string): string {
  return `${kind}:${id}`;
}

/** Join two copies of this store: bookmarks by (kind, id) with the later
    `savedAt` winning, notes by lesson id with the later `updatedAt` winning,
    and both a union. Neither store writes a tombstone when something is
    removed, so un-saving on one side does not un-save on the other; that is
    the safe direction for a student's own saved work.
 *
 * Defined here, where the shape lives, and used in both places that need it:
 * the account sync's `notes` companion (src/lib/learning/sync.browser.ts,
 * which reconciles two devices) and the anonymous-work claim (which joins
 * two owners on one device). One rule, one implementation. */
export function mergeNotesStores(local: NotesStore, remote: NotesStore): NotesStore {
  const bookmarks = new Map<string, Bookmark>();
  for (const bookmark of [...(local.bookmarks ?? []), ...(remote.bookmarks ?? [])]) {
    const key = bookmarkKey(bookmark.kind, bookmark.id);
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

/* The claim's copy of that rule, as raw JSON, registered rather than
   reimplemented. Null for anything that does not parse, which leaves both
   copies exactly where they are. */
registerLegacyStoreMerge(STORAGE_KEY, (mine, theirs) => {
  try {
    const a = JSON.parse(mine) as NotesStore | null;
    const b = JSON.parse(theirs) as NotesStore | null;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return null;
    return JSON.stringify(mergeNotesStores(a, b));
  } catch {
    return null;
  }
});

/* Saved lessons and notes live in one store, so one snapshot carries both.
   These two functions exist only so the sync layer
   (src/lib/learning/sync.browser.ts) can carry them between a student's
   devices: they are the SAME read and write every function below already
   uses, exposed rather than reimplemented, so nothing about how saving and
   note taking behaves on this device changes. The merge rule (bookmarks by
   kind and id, notes by lesson, later wins) lives in the sync layer beside
   the other companion rules. */

/** Saved lessons and notes as they stand, for sending to the account. */
export function readNotesSyncSnapshot(): NotesStore {
  return readStore();
}

/** Replace them with the merged version from the account. */
export function writeNotesSyncSnapshot(store: NotesStore): void {
  writeStore(store);
}

export function toggleBookmark(
  kind: Bookmark['kind'],
  id: string,
  meta: { title: string; href: string; subtitle?: string }
): boolean {
  try {
    const store = readStore();
    const key = bookmarkKey(kind, id);
    const existingIndex = store.bookmarks.findIndex((b) => bookmarkKey(b.kind, b.id) === key);
    if (existingIndex >= 0) {
      store.bookmarks.splice(existingIndex, 1);
      writeStore(store);
      return false;
    }
    const bookmark: Bookmark = {
      kind,
      id,
      title: meta.title,
      href: meta.href,
      subtitle: meta.subtitle,
      savedAt: new Date().toISOString(),
    };
    store.bookmarks.push(bookmark);
    writeStore(store);
    return true;
  } catch {
    return false;
  }
}

export function isBookmarked(kind: Bookmark['kind'], id: string): boolean {
  try {
    const store = readStore();
    const key = bookmarkKey(kind, id);
    return store.bookmarks.some((b) => bookmarkKey(b.kind, b.id) === key);
  } catch {
    return false;
  }
}

export function listBookmarks(kind?: Bookmark['kind']): Bookmark[] {
  try {
    const store = readStore();
    const list = kind ? store.bookmarks.filter((b) => b.kind === kind) : store.bookmarks.slice();
    return list.sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0));
  } catch {
    return [];
  }
}

export function setNote(id: string, text: string): void {
  try {
    const store = readStore();
    if (!text.trim()) {
      delete store.notes[id];
    } else {
      store.notes[id] = { text, updatedAt: new Date().toISOString() };
    }
    writeStore(store);
  } catch {
    // ignore
  }
}

export function getNote(id: string): string {
  try {
    const store = readStore();
    return store.notes[id]?.text ?? '';
  } catch {
    return '';
  }
}

export function listNotes(): { id: string; text: string; updatedAt: string }[] {
  try {
    const store = readStore();
    return Object.entries(store.notes)
      .map(([id, entry]) => ({ id, text: entry.text, updatedAt: entry.updatedAt }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  } catch {
    return [];
  }
}
