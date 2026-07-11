import { useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';

/** Button + animated-height panel — replaces native <details>/<summary> for
    cases that want a smooth expand/collapse instead of the browser's instant
    snap (mirrors the JS-driven animation BaseLayout gives .lesson-body
    details, for React-rendered accordions outside that scope). */
export default function Accordion({
  summary,
  children,
  className,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className={className}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-brand"
        >
          <span>{summary}</span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
            className="shrink-0"
          >
            ▾
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
