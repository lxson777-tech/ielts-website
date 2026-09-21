/* Tap-to-reveal idea angles for a speaking question or cue card. Hidden by
   default on purpose: the student should try to think first, then peek. The
   hints are directions ("who taught you?"), never model answers, so what the
   student says stays their own English. */

import { useState } from 'react';
import { nt } from '../lib/i18n/translate';
import { useT } from '../lib/i18n/react';

export default function IdeaHints({ ideas, label = nt('Stuck? Get ideas') }: { ideas: string[]; label?: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  if (ideas.length === 0) return null;

  return (
    <div className="rounded-lg bg-warning-tint/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-bold text-warning"
      >
        <span>
          <span aria-hidden="true">💡</span> {t(label)}
        </span>
        <span aria-hidden="true" className="shrink-0">
          {open ? '▾' : '▸'}
        </span>
      </button>
      <div className={`grid-reveal ${open ? 'is-open' : ''}`}>
        <div className="min-h-0 overflow-hidden">
          <ul className="space-y-1 px-3 pb-2.5 text-sm text-ink-muted">
            {ideas.map((idea) => (
              <li key={idea} className="flex gap-2">
                <span aria-hidden="true">·</span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
