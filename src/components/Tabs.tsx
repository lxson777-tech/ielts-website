import { useId, useRef } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { useT } from '../lib/i18n/react';

export interface TabDef {
  id: string;
  label: string;
  /** Optional colour for this tab's highlight when it is active, as a CSS
      colour (usually a skill token, e.g. 'var(--color-speaking)'). */
  color?: string;
}

/** Generic accessible tab switcher — a sliding coloured indicator tracks the
    active tab via framer-motion's layoutId, arrow keys move focus between tabs per
    the WAI-ARIA tabs pattern. Presentational only: the parent owns which panel is
    shown for the active id.

    Each instance has its own layoutId. Until 4 October 2026 every instance shared
    "tabs-indicator", so a page with two tab rows (the band guide: paper, then
    criterion) had one indicator fly between the rows and left the other row's
    active tab as white text on the pale track, which read as the tab vanishing. */
export default function Tabs({
  tabs,
  active,
  onChange,
  className,
  accent,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  /** The highlight colour for every tab in this row that has no colour of its own. */
  accent?: string;
}) {
  const { t: translateText } = useT();
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorId = `tabs-indicator-${useId()}`;

  function onKeyDown(e: React.KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === active);
    if (i === -1) return;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next]!.id);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={listRef}
        role="tablist"
        onKeyDown={onKeyDown}
        className={`flex flex-wrap gap-1 rounded-button border border-border bg-surface-alt/60 p-1 ${className ?? ''}`}
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          const color = t.color ?? accent;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(t.id)}
              className="relative flex-1 rounded-button px-3 py-1.5 text-sm font-semibold transition-colors"
            >
              {isActive && (
                <motion.span
                  layoutId={indicatorId}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 rounded-button bg-brand"
                  style={color ? { backgroundColor: color } : undefined}
                />
              )}
              <span className={`relative ${isActive ? 'text-white' : 'text-ink-muted hover:text-ink'}`}>{translateText(t.label)}</span>
            </button>
          );
        })}
      </div>
    </MotionConfig>
  );
}
