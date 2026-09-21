/* The plan's scope note, shown the same way everywhere it appears.
 *
 * `scopeNote` is the planner's honest account of what will and will not fit
 * (src/lib/learning/planner.ts): several separate sentences joined into one
 * string. Shown raw it reads as a wall, so the Today polish of
 * 22 September 2026 broke it at its own sentence boundaries and collapsed
 * everything past the first once there were more than three.
 *
 * It lived inside TodaySession.tsx, which meant Today collapsed the note
 * and the two other surfaces that show the SAME string did not: /start
 * (Course.tsx) and the intake outcome panel. One plan, one sentence, three
 * different-looking answers. So it lives here now and all three use it.
 *
 * The words are never changed here, only how they break. Nothing is
 * summarised, nothing is dropped: "and {n} more" opens the rest in full.
 */

import { useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { scopeNoteView, type ScopeNoteView } from './today/todayViewModel';

export default function ScopeNote({
  note,
  className = 'today-scope-note',
}: {
  note: string | null | undefined;
  /** The surrounding surface's own paragraph class. Today and /start share
      the workspace note style; the intake outcome panel has its own. */
  className?: string;
}) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const view: ScopeNoteView | null = scopeNoteView(note);
  if (!view) return null;
  return (
    <p className={className}>
      {view.headline}
      {view.inline.map((sentence) => (
        <span key={sentence}> {sentence}</span>
      ))}
      {view.collapsed.length > 0 && (
        <>
          {' '}
          <button
            type="button"
            className="today-scope-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? t('Show less') : t('and {n} more', { n: view.collapsed.length })}
          </button>
          {expanded && (
            <span className="today-scope-more">
              {view.collapsed.map((sentence) => (
                <span key={sentence}> {sentence}</span>
              ))}
            </span>
          )}
        </>
      )}
    </p>
  );
}
