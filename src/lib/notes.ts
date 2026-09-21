// Lesson bookmarks ("Saved") and per-lesson notes, stored client-side in localStorage.
// Mirrors the versioned-store pattern used by src/lib/progress.ts. Every read and write is
// wrapped in try/catch so a missing or blocked localStorage (SSR, private browsing, disabled
// storage) never throws.

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

const STORAGE_KEY = 'ielts.notes.v1';

function emptyStore(): NotesStore {
  return { version: 1, bookmarks: [], notes: {} };
}

function readStore(): NotesStore {
  try {
    if (typeof localStorage === 'undefined') return emptyStore();
    const raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable or full; fail silently, nothing else to do client-side.
  }
}

function bookmarkKey(kind: Bookmark['kind'], id: string): string {
  return `${kind}:${id}`;
}

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
