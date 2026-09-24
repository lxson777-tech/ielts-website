/* The /start page: a segmented control between "Your route" (the guided
   personal plan, src/components/Course.tsx) and "Browse all lessons" (the
   full library grouped by paper, src/components/CourseSections.tsx). The
   choice is remembered in localStorage and can be preset with ?view=sections
   in the URL; both are read after mount since this page is statically
   rendered.

   UNGATED SINCE 2026-09-22. This used to lock "In order" behind an account
   in production, on the reasoning that a multi-week plan lost to a cleared
   browser defeats the point. That reasoning no longer holds: the plan this
   tab shows now lives in the shared learning store (src/lib/learning),
   which works from the student's first visit whether or not they are
   signed in, the same way the rest of the site is offline-first. Locking it
   behind an account would have blocked a signed-out student from their own
   local plan, which is the opposite of what the gate was for. Signing in
   is still worth doing (it is what makes the plan follow the student to
   another device), so a signed-out student sees a quiet note about that
   rather than a locked screen. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePlatformReducedMotion } from './SmoothReveal';
import type { User } from '@supabase/supabase-js';
import { isAuthConfigured } from '../lib/auth/supabase';
import { onAuthChange } from '../lib/auth/session';
import { useT } from '../lib/i18n/react';
import Course from './Course';
import CourseSections from './CourseSections';
import { mapStoredCourseView, type CourseView } from './learning/today/todayViewModel';

const VIEW_STORAGE_KEY = 'ielts.course.view';

export default function CourseGate() {
  const { t } = useT();
  const [user, setUser] = useState<User | null>(null);
  // Always starts on "Your route" for both the server render and the first
  // client paint (localStorage and the URL can only be read after mount on a
  // statically rendered page), then the effect below settles it.
  const [view, setView] = useState<CourseView>('route');
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const routeRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePlatformReducedMotion();

  // Keep both panels mounted so a tab switch preserves the chosen day,
  // expanded sections and any unfinished intake answers.
  useLayoutEffect(() => {
    const panel = view === 'route' ? routeRef.current : sectionsRef.current;
    if (!panel) return;
    const measure = () => setPanelHeight(panel.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [view]);

  useEffect(() => {
    if (!isAuthConfigured()) return;
    return onAuthChange((u) => setUser(u));
  }, []);

  useEffect(() => {
    let next: CourseView = 'route';
    try {
      // 'order' is the pre-2026-09-22 stored value for this same tab
      // (renamed "In order" -> "Your route"); mapStoredCourseView carries it
      // forward so nobody who chose it before lands on the library tab now.
      next = mapStoredCourseView(localStorage.getItem(VIEW_STORAGE_KEY));
    } catch {
      // Private-browsing / locked-down storage: fall back to "Your route".
    }
    const urlView = new URLSearchParams(window.location.search).get('view');
    if (urlView === 'sections' || urlView === 'route') next = urlView;
    setView(next);
  }, []);

  function selectView(next: CourseView) {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Best-effort remembering only; switching views still works either way.
    }
  }

  const switcher = (
    <div className="course-view-switcher mb-6">
      <div
        className="inline-flex rounded-full border border-border bg-surface-alt p-1"
        role="group"
        aria-label={t('Course view')}
      >
        {(
          [
            ['route', 'Your route'],
            ['sections', 'Browse all lessons'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => selectView(id)}
            aria-pressed={view === id}
            className={`rounded-full px-5 py-3 font-display text-sm font-bold transition-colors ${
              view === id ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>
      {isAuthConfigured() && !user && (
        <p className="mt-3 text-center text-xs text-ink-muted">
          {t('This plan is saved on this device. Sign in to keep it synced across your devices too.')}
        </p>
      )}
    </div>
  );

  return (
    <>
      {switcher}
      <motion.div className="course-view-panels"
        initial={false}
        animate={{ height: panelHeight ?? 'auto' }}
        transition={{ duration: reduceMotion ? 0 : .42, ease: [.22, 1, .36, 1] }}>
        <div ref={routeRef} className="course-view-panel" data-active={view === 'route'}
          inert={view !== 'route'} aria-hidden={view !== 'route'}>
          <Course />
        </div>
        <div ref={sectionsRef} className="course-view-panel" data-active={view === 'sections'}
          inert={view !== 'sections'} aria-hidden={view !== 'sections'}>
          <CourseSections />
        </div>
      </motion.div>
    </>
  );
}
