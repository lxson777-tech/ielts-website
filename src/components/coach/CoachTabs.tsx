/* The coach panels' tab row: one segmented control that never wraps.

   The shared Tabs component wraps onto several rows when the labels do not
   fit, which in the narrow coach column made five tabs into three uneven
   rows. Here the labels are short, the row is one line, and if a language
   ever makes it wider than the panel it scrolls sideways instead of
   wrapping (the selected tab is kept in view).

   WAI-ARIA tabs pattern: role=tablist, roving tabindex, Left / Right / Home /
   End move between tabs and select them. Ids come from the caller's idBase
   (a useId value) so two coaches on one page never share an id or a sliding
   highlight. */

import { useEffect, useRef } from 'react';
import { motion, MotionConfig } from 'framer-motion';

export interface CoachTab {
  id: string;
  /** Already translated. */
  label: string;
}

export function coachTabId(idBase: string, id: string): string {
  return `${idBase}-tab-${id}`;
}

export function coachPanelId(idBase: string, id: string): string {
  return `${idBase}-panel-${id}`;
}

export default function CoachTabs({
  tabs,
  active,
  onChange,
  idBase,
  label,
}: {
  tabs: CoachTab[];
  active: string;
  onChange: (id: string) => void;
  idBase: string;
  /** Accessible name for the row, already translated. */
  label: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the selected tab visible when the row is scrollable. Only the row
  // scrolls; the page itself never moves.
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return;
    const left = tab.offsetLeft; // .coach-tabs is position: relative, so this is within the row
    if (left < list.scrollLeft) list.scrollLeft = left - 4;
    else if (left + tab.offsetWidth > list.scrollLeft + list.clientWidth)
      list.scrollLeft = left + tab.offsetWidth - list.clientWidth + 4;
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    const i = tabs.findIndex((tab) => tab.id === active);
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
      <div ref={listRef} role="tablist" aria-label={label} onKeyDown={onKeyDown} className="coach-tabs">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={coachTabId(idBase, tab.id)}
              aria-selected={selected}
              aria-controls={coachPanelId(idBase, tab.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className="coach-tab"
            >
              {selected && (
                <motion.span
                  layoutId={`${idBase}-coach-tab`}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="coach-tab-highlight"
                  aria-hidden="true"
                />
              )}
              <span className="coach-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </MotionConfig>
  );
}
