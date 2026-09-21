/* "Saved" section for /account: every bookmarked lesson and question (see
   src/lib/notes.ts), plus a short list of lesson notes. Question bookmarks
   are written elsewhere (kind 'question', added alongside the test player by
   another agent working in parallel) — this component only reads and
   displays them, it never assumes who wrote a given bookmark. */

import { useEffect, useRef, useState } from 'react';
import { listBookmarks, listNotes, toggleBookmark, type Bookmark } from '../lib/notes';
import { withBase } from '../lib/url';
import { getLesson } from '../data/lessons';
import { READING_PARTS } from '../data/reading';
import { LISTENING_PARTS } from '../data/listening';
import { WRITING_PARTS } from '../data/writing';
import { SPEAKING_PARTS } from '../data/speaking';
import { VOCABULARY_PARTS } from '../data/vocabulary';
import { useT } from '../lib/i18n/react';
import { LIBRARY_REASON_SENTENCES, parseLibraryReason } from './library-links';
import { recordLessonStudied } from '../lib/learning/store.browser';
import SessionContinueBar from './learning/SessionContinueBar';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

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

/** ?item=<kind>:<id> highlights one exact saved bookmark (the same key
    bookmarkKey() in notes.ts builds), and ?note=<lessonSlug> highlights one
    exact note, so a link from elsewhere in the site can point at the exact
    saved thing rather than the general "Saved" list. Both are independent
    of ?reason=, which only decides the sentence shown above the list. */
function deepLinkFromQuery(search: string): { bookmarkKey: string | null; noteId: string | null } {
  const params = new URLSearchParams(search);
  return { bookmarkKey: params.get('item'), noteId: params.get('note') };
}

export default function SavedItems() {
  const { t } = useT();
  // Same "ready until mounted" guard as the rest of the account page:
  // notes.ts reads localStorage, which the server can never see, so the
  // very first client render has to match the server's (nothing) until
  // this effect runs once, after hydration has already settled.
  const [mounted, setMounted] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<{ id: string; text: string; updatedAt: string }[]>([]);
  const [deepLink] = useState(() =>
    typeof window !== 'undefined' ? deepLinkFromQuery(window.location.search) : { bookmarkKey: null, noteId: null },
  );
  const [reason] = useState(() => (typeof window !== 'undefined' ? parseLibraryReason(window.location.search) : null));
  const deepLinked = Boolean(deepLink.bookmarkKey || deepLink.noteId);
  const highlightedRef = useRef<HTMLLIElement | null>(null);
  const evidenceRecorded = useRef(false);
  const scrolledRef = useRef(false);

  const refresh = () => {
    setBookmarks(listBookmarks());
    setNotes(listNotes());
  };

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  // Scroll the exact saved item into view once, the first time it is on the
  // page after mount, and record the modest "studied" evidence a directed
  // visit deserves (lead decision, brief section 7): never for ordinary
  // browsing of the whole list.
  useEffect(() => {
    if (!deepLinked || scrolledRef.current) return;
    if (!highlightedRef.current) return;
    scrolledRef.current = true;
    highlightedRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (!evidenceRecorded.current) {
      evidenceRecorded.current = true;
      recordLessonStudied({
        lessonKey: 'saved-items',
        activityId: 'tool:saved',
        subskill: 'exam-format',
        mode: 'review',
        estimatedMinutes: 1,
      });
    }
  }, [deepLinked, bookmarks, notes]);

  if (!mounted) return null;

  const remove = (bookmark: Bookmark) => {
    toggleBookmark(bookmark.kind, bookmark.id, { title: bookmark.title, href: bookmark.href, subtitle: bookmark.subtitle });
    refresh();
  };

  const empty = bookmarks.length === 0 && notes.length === 0;

  return (
    <div className="space-y-6">
      {deepLinked && reason && (
        <p className="rounded-card border border-brand/25 bg-brand-tint/40 px-4 py-3 text-sm text-ink">
          {t(LIBRARY_REASON_SENTENCES[reason])}
        </p>
      )}

      {empty ? (
        <div className="rounded-card border border-dashed border-border bg-surface-alt p-8 text-center text-ink-muted">
          <p className="text-sm">{t('Save a lesson or a tricky question and it will appear here.')}</p>
        </div>
      ) : (
        <>
          {bookmarks.length > 0 && (
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {bookmarks.map((b) => {
                const isTarget = deepLink.bookmarkKey === `${b.kind}:${b.id}`;
                return (
                <li
                  key={`${b.kind}:${b.id}`}
                  ref={isTarget ? highlightedRef : undefined}
                  className={`flex items-center justify-between gap-3 rounded-card border p-4 shadow-card transition-colors ${
                    isTarget ? 'border-brand bg-brand-tint/30' : 'border-border bg-surface'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-muted">
                      {b.kind === 'lesson' ? t('Lesson') : t('Question')}
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
                    {t('Remove')}
                  </button>
                </li>
                );
              })}
            </ul>
          )}

          {notes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{t('Notes')}</p>
              <ul className="space-y-2">
                {notes.map((n) => {
                  const lesson = lessonForNote(n.id);
                  const isTarget = deepLink.noteId === n.id;
                  return (
                    <li
                      key={n.id}
                      ref={isTarget ? highlightedRef : undefined}
                      className={`rounded-card border p-3.5 shadow-card transition-colors ${
                        isTarget ? 'border-brand bg-brand-tint/30' : 'border-border bg-surface'
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate text-sm text-ink">{firstLine(n.text) || t('Empty note')}</p>
                        <span className="shrink-0 text-xs text-ink-muted">{fmtDate(n.updatedAt)}</span>
                      </div>
                      {lesson && (
                        <a href={lesson.href} className="mt-1 inline-block text-xs font-semibold text-brand hover:underline">
                          {lesson.title}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <SessionContinueBar activityId="tool:saved" compact />
        </>
      )}
    </div>
  );
}
