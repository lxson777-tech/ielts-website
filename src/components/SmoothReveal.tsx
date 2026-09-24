import { useSyncExternalStore, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const motionQuery = '(prefers-reduced-motion: reduce)';
const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
export function usePlatformReducedMotion() {
  return useSyncExternalStore(subscribeMotion,
    () => window.matchMedia(motionQuery).matches, () => true);
}

/** Keep content mounted through its exit so surrounding content moves with it.
 * Closed content becomes inert immediately, before the closing animation ends. */
export default function SmoothReveal({ open, children, id }: {
  open: boolean; children: ReactNode; id?: string;
}) {
  const reduce = usePlatformReducedMotion();
  return (
    <div id={id} inert={!open} aria-hidden={!open} className="smooth-reveal">
      <AnimatePresence initial={false}>
        {open && <motion.div key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reduce ? 0 : .38, ease: [.22, 1, .36, 1] }}
          style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flow-root' }}>{children}</div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}
