/* "Saved" section for /account: every bookmarked lesson and question (see
   src/lib/notes.ts), plus a short list of lesson notes. Question bookmarks
   are written elsewhere (kind 'question', added alongside the test player by
   another agent working in parallel) — this component only reads and
   displays them, it never assumes who wrote a given bookmark. */

import { useEffect, useState } from 'react';
import { listBookmarks, listNotes, toggleBookmark, type Bookmark } from '../lib/notes';
import { withBase } from '../lib/url';
import { getLesson } from '../data/lessons';
import { READING_PARTS } from '../data/reading';
import { LISTENING_PARTS } from '../data/listening';
import { WRITING_PARTS } from '../data/writing';
import { SPEAKING_PARTS } from '../data/speaking';
import { VOCABULARY_PARTS } from '../data/vocabulary';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const PART_REGISTRIES: { base: string; parts: { slug: string; title: string }[] }[] = [
  { base: 'reading', parts: READING_PARTS },
  { base: 'listening', parts: LISTENING_PARTS },
  { base: 'writing', parts: WRITING_PARTS },
  { base: 'speaking', parts: SPEAKING_PARTS },
  { base: 'vocabulary', parts: VOCABULARY_PARTS },
];

/** A note's id is always a lesson slug (the only notes this site writes
    today, from LessonLayout) — resolve it back to a title and URL, the same
    way LessonLayout resolves a slug back to its minutes estimate. */
function lessonForNote(slug: string): { title: string; href: string } | null {
  const overview = getLesson(slug);
  if (overview) return { title: overview.title, href: withBase(`/lessons/${overview.slug}`) };
  for (const { base, parts } of PART_REGISTRIES) {
    if (!slug.startsWith(`${base}-`)) continue;
    const part = parts.find((p) => p.slug === slug.slice(base.length + 1));
    if (part) return { title: part.title, href: withBase(`/lessons/${base}/${part.slug}`) };
  }
  return null;
}

/** First non-blank line of a note, for the compact preview list. */
function firstLine(text: string): string {
  const line = text.split('\n').find((l) => l.trim().length > 0) ?? '';
  return line.length > 90 ? `${line.slice(0, 90)}…` : line;
}

export default function SavedItems() {
  // Same "ready until mounted" guard as the rest of the account page:
  // notes.ts reads localStorage, which the server can never see, so the
  // very first client render has to match the server's (nothing) until
  // this effect runs once, after hydration has already settled.
  const [mounted, setMounted] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<{ id: string; text: string; updatedAt: string }[]>([]);

  const refresh = () => {
    setBookmarks(listBookmarks());
    setNotes(listNotes());
  };

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  if (!mounted) return null;

  const remove = (bookmark: Bookmark) => {
    toggleBookmark(bookmark.kind, bookmark.id, { title: bookmark.title, href: bookmark.href, subtitle: bookmark.subtitle });
    refresh();
  };

  const empty = bookmarks.length === 0 && notes.length === 0;

  return (
    <div className="space-y-6">
      {empty ? (
        <div className="rounded-card border border-dashed border-border bg-surface-alt p-8 text-center text-ink-muted">
          <p className="text-sm">Save a lesson or a tricky question and it will appear here.</p>
        </div>
      ) : (
        <>
          {bookmarks.length > 0 && (
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {bookmarks.map((b) => (
                <li
                  key={`${b.kind}:${b.id}`}
                  className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 shadow-card"
                >
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-muted">
                      {b.kind === 'lesson' ? 'Lesson' : 'Question'}
                    </p>
                    <a href={b.href} className="mt-0.5 block truncate font-display text-sm font-bold text-ink hover:text-brand">
                      {b.title}
                    </a>
                    {b.subtitle && <p className="mt-0.5 truncate text-xs text-ink-muted">{b.subtitle}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(b)}
                    className="shrink-0 rounded-button border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-error hover:text-error"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {notes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">Notes</p>
              <ul className="space-y-2">
                {notes.map((n) => {
                  const lesson = lessonForNote(n.id);
                  return (
                    <li key={n.id} className="rounded-card border border-border bg-surface p-3.5 shadow-card">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate text-sm text-ink">{firstLine(n.text) || 'Empty note'}</p>
                        <span className="shrink-0 text-xs text-ink-muted">{fmtDate(n.updatedAt)}</span>
                      </div>
                      {lesson && (
                        <a href={lesson.href} className="mt-1 inline-block text-xs font-semibold text-brand hover:underline">
                          {lesson.title} →
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
