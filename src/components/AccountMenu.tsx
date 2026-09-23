/* Account widget for the nav. Renders nothing when accounts aren't configured
   (the "Start Here" study-plan link lives in Nav.astro's More menu and mobile
   menu, so onboarding doesn't depend on this island). Signed out, the button
   opens the login window (AuthModal) directly; signed in, it becomes an avatar
   menu with progress and sign-out.
   Mounting this island used to be what drove sync. It no longer is: since
   23 September 2026 the base layout starts src/lib/auth/lifecycle.ts on every
   route, chrome or no chrome, and this island reads it. That is what gives a
   full-screen drill or mock exam, which renders no nav at all, the same data
   owner and the same sync as a page with a nav on it. Safe to mount more than
   once; the lifecycle is idempotent. */

import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { withBase } from '../lib/url';
import { isAuthConfigured } from '../lib/auth/supabase';
import { signOut } from '../lib/auth/session';
import { onAccountChange, startAccountLifecycle } from '../lib/auth/lifecycle';
import { getProgress, onProgressChange } from '../lib/progress';
import { loadStudyPlan, onStudyPlanChange } from '../lib/study-plan';
import { buildCourse, courseStatus } from '../lib/course';
import { ensureLearningWired } from '../lib/learning';
import type { SharedSessionView } from '../lib/learning/adapters';
import { useT } from '../lib/i18n/react';
import AuthModal from './AuthModal';
import AnonymousWorkClaim from './learning/AnonymousWorkClaim';

const MODULES = buildCourse();

// AccountMenu is mounted in the site nav on every page (Nav.astro), so it
// is often the ONLY thing on a page that touches the personal-learning
// layer. Importing this module is what wires courseStatus()'s `session`
// field to the student's real plan instead of the library-position
// fallback; without it, "Continue" here could name a different activity
// than Today does, which is exactly the bug this shared session exists to
// close (see src/lib/learning/index.ts's header comment).
ensureLearningWired();

export default function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  /* Course entry for the menu. Computed only while the menu is open so the
     nav island doesn't read two stores on every page load. `started` is what
     decides the copy: a student who hasn't begun gets an invitation, one who
     has gets the shared session's real objective, the exact same one Today
     and every other surface show (courseStatus().session is
     currentSharedSession(), see src/lib/course.ts). `percent` is library
     progress (lessons opened), shown as that and never as readiness. */
  const [course, setCourse] = useState<{ started: boolean; session: SharedSessionView | null; percent: number } | null>(null);
  /* Bumped once sign-in has finished, which is the first moment every store
     has moved to this student and the device can honestly be asked what work
     was done here before they signed in. Zero means nobody is signed in, and
     nothing is offered. */
  const [claimToken, setClaimToken] = useState(0);

  useEffect(() => {
    if (!menuOpen) return;
    const read = () => {
      const status = courseStatus(MODULES, getProgress());
      setCourse({
        started: Boolean(loadStudyPlan()),
        session: status.session,
        percent: status.percent,
      });
    };
    read();
    const offProgress = onProgressChange(read);
    const offPlan = onStudyPlanChange(read);
    return () => {
      offProgress();
      offPlan();
    };
  }, [menuOpen]);

  useEffect(() => {
    /* Started here as well as from the base layout, so an island that
       hydrates before that script runs still gets it going. Idempotent. */
    startAccountLifecycle();
    return onAccountChange((account) => {
      setUser(account.user);
      setReady(account.known);
      /* The claim is offered only AFTER sign-in has finished, because until
         it has, the device still answers for the previous owner. `settled`
         is the lifecycle's count of finished sign-ins, and it goes back to
         zero on sign-out. */
      setClaimToken(account.user ? account.settled : 0);
    });
  }, []);

  // Close the login window as soon as auth succeeds (sign-in inside the modal
  // calls onClose itself, but OAuth/magic-link land back signed-in too).
  useEffect(() => {
    if (user) setModalOpen(false);
  }, [user]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  // No Supabase project configured at all: no account to offer, render nothing.
  // (Start Here lives in the nav itself, so nothing is lost here.)
  if (!isAuthConfigured()) return null;

  // Pre-hydration: avoid a flash of the wrong signed-in/out state.
  if (!ready) return null;

  /* ── Signed in ── */
  if (user) {
    const label = user.email ?? t('Account');
    const initial = (user.email ?? '?').charAt(0).toUpperCase();
    return (
      <div ref={menuRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={`inline-flex items-center gap-2 rounded-full font-semibold transition-colors ${
            compact ? 'px-3 py-2 text-sm text-brand hover:bg-brand-tint' : 'px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface-alt'
          }`}
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-xs font-bold text-white">
            {initial}
          </span>
          <span className="hidden max-w-[10rem] truncate sm:inline">{label}</span>
        </button>
        {menuOpen && (
          <div
            className={`absolute z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-surface shadow-card-hover ${
              compact ? 'left-0' : 'right-0'
            }`}
          >
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs text-ink-muted">{t('Signed in as')}</p>
              <p className="truncate text-sm font-semibold">{label}</p>
              <p className="mt-1 text-xs text-success">{t('Progress is syncing to your account.')}</p>
            </div>
            <a
              href={withBase(course?.session?.current?.href ?? '/start')}
              className="block border-b border-border px-4 py-3 text-left hover:bg-brand-tint"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-brand">
                  {course?.started ? t('Continue course') : t('Start the course')}
                </span>
                {course?.started && (
                  <span
                    className="shrink-0 text-[0.7rem] font-bold text-ink-muted"
                    title={t('{percent}% of lessons studied', { percent: course.percent })}
                  >
                    {t('{percent}% studied', { percent: course.percent })}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink-muted">
                {!course
                  ? t('Loading…')
                  : !course.started
                    ? t('Every lesson, in the right order')
                    : /* The session's own one-sentence objective, the same
                         text Today shows for this student, not a library
                         pointer re-derived here. */
                      (course.session?.objective ?? t('All lessons complete 🎉'))}
              </span>
              {course?.started && (
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-alt">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${course.percent}%` }}
                  />
                </span>
              )}
            </a>
            <a
              href={withBase('/account')}
              className="block border-b border-border px-4 py-3 text-left text-sm font-semibold text-brand hover:bg-brand-tint"
            >
              {t('My progress')}
            </a>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                void signOut();
              }}
              className="block w-full px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-surface-alt"
            >
              {t('Sign out')}
            </button>
          </div>
        )}
        {/* Asked once, after sign-in, and only when this device really does
            hold work done signed out. Renders nothing otherwise. Nav.astro
            mounts this island twice (the bar and the mobile menu) and the
            panel is fixed to the viewport, so only the full one offers it:
            two copies of the same question is not asking once. */}
        {!compact && <AnonymousWorkClaim token={claimToken} />}
      </div>
    );
  }

  /* ── Signed out ── */
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`group inline-flex items-center gap-2 rounded-full font-display font-bold ring-1 ring-inset ring-brand/15 transition-all duration-200 ${
          compact
            ? 'w-full bg-brand-tint px-3 py-2 text-sm text-brand'
            : 'bg-brand-tint px-2.5 py-1.5 text-sm text-brand hover:-translate-y-0.5 hover:shadow-card hover:ring-brand/35'
        }`}
      >
        {/* Same shape as the signed-in avatar bubble above, a preview of what this becomes once you're logged in. */}
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-white transition-transform duration-200 group-hover:scale-105">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 8a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        {t('Log in')}
      </button>

      {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
