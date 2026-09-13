/* Account gate around the course. The course is the one feature that's
   explicitly account-first (it's a multi-week commitment; losing it to a
   cleared browser or a different device defeats the point), so signed-out
   students see a create-account screen instead of the start form. The gate
   only exists where accounts exist: when Supabase isn't configured the
   course renders ungated, same as the rest of the site's offline-first
   behavior.

   Note this gates the course *view*, not the lessons. Every lesson stays open
   to everyone at its own URL; what an account buys is the saved path through
   them. Keep it that way. */

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isAuthConfigured } from '../lib/auth/supabase';
import { onAuthChange } from '../lib/auth/session';
import AuthModal, { type AuthMode } from './AuthModal';
import Course from './Course';

export default function CourseGate() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [modalMode, setModalMode] = useState<AuthMode | null>(null);

  useEffect(() => {
    if (!isAuthConfigured()) {
      setReady(true);
      return;
    }
    return onAuthChange((u) => {
      setUser(u);
      setReady(true);
      if (u) setModalMode(null); // signed in from the window below: unlock in place
    });
  }, []);

  // Local development is a browseable product demo. Production keeps the
  // account gate so a saved multi-week plan remains tied to an account.
  if (!isAuthConfigured() || import.meta.env.DEV) return <Course />;

  // Pre-hydration / first auth check: render nothing rather than flashing
  // the locked screen at students who are actually signed in.
  if (!ready) return null;

  if (user) return <Course />;

  /* ── Signed out: the plan is locked behind a free account ── */
  return (
    <div className="screen-in relative overflow-hidden rounded-card border border-border bg-surface p-8 text-center shadow-card sm:p-10">
      <span className="absolute inset-x-0 top-0 h-1 bg-brand" aria-hidden="true" />
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-tint text-brand" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      <h3 className="mt-4 font-display text-2xl font-extrabold">Your course lives in your account</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted sm:text-[0.95rem]">
        A course only works if it remembers where you got to. Create a free account so your place in the course, completed lessons and scores are saved and follow you to any device.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setModalMode('signup')}
          className="rounded-button bg-brand px-6 py-2.5 font-display text-sm font-bold text-white transition-colors hover:bg-brand-hover"
        >
          Create my free account
        </button>
        <button
          type="button"
          onClick={() => setModalMode('signin')}
          className="rounded-button border border-border px-6 py-2.5 font-display text-sm font-bold transition-colors hover:bg-surface-alt"
        >
          Log in
        </button>
      </div>
      <p className="mt-4 text-xs text-ink-muted">Free, takes under a minute. Lessons and practice tests stay open to everyone.</p>

      {modalMode && <AuthModal initialMode={modalMode} onClose={() => setModalMode(null)} />}
    </div>
  );
}
