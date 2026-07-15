import { useRef } from 'react';
import { motion, MotionConfig } from 'framer-motion';

export interface TabDef {
  id: string;
  label: string;
}

/** Generic accessible tab switcher — a sliding brand-coloured indicator tracks the
    active tab via framer-motion's layoutId, arrow keys move focus between tabs per
    the WAI-ARIA tabs pattern. Presentational only: the parent owns which panel is
    shown for the active id. */
export default function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

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
        className={`flex gap-1 rounded-button border border-border bg-surface-alt/60 p-1 ${className ?? ''}`}
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
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
                  layoutId="tabs-indicator"
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 rounded-button bg-brand"
                />
              )}
              <span className={`relative ${isActive ? 'text-white' : 'text-ink-muted hover:text-ink'}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </MotionConfig>
  );
}
