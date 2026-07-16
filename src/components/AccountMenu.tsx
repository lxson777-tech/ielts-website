/* Account widget for the nav. Renders nothing when accounts aren't configured
   (the "Start Here" study-plan link lives in Nav.astro's More menu and mobile
   menu, so onboarding doesn't depend on this island). Signed out, the button
   opens the login window directly; signed in, it becomes an avatar menu with
   progress and sign-out.
   Login itself is a standard email + password window (sign in / create account /
   forgot password), with Google and a one-time email link as secondary options.
   Mounting this island also drives sync: on auth change it starts/stops the
   cloud reconciliation. Safe to mount more than once (startSyncForUser is
   idempotent per user). */

import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { withBase } from '../lib/url';
import { isAuthConfigured } from '../lib/auth/supabase';
import {
  getEnabledProviders,
  onAuthChange,
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
  sendMagicLink,
  signInWithGoogle,
  signOut,
} from '../lib/auth/session';
import { startSyncForUser, stopSync } from '../lib/auth/sync';

type Mode = 'signin' | 'signup' | 'forgot' | 'magiclink';
type Phase = 'idle' | 'submitting' | 'done';

const MODE_COPY: Record<Mode, { title: string; subtitle: string; cta: string }> = {
  signin: { title: 'Log in', subtitle: 'Sync your study plan and scores across devices.', cta: 'Log in' },
  signup: {
    title: 'Create your account',
    subtitle: 'Save your study plan and scores, and sync them across devices.',
    cta: 'Create account',
  },
  forgot: { title: 'Reset your password', subtitle: "We'll email you a link to set a new one.", cta: 'Send reset link' },
  magiclink: { title: 'Email me a link', subtitle: "We'll email you a one-time link, no password needed.", cta: 'Send sign-in link' },
};

export default function AccountMenu({ compact = false }: { compact?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [doneMessage, setDoneMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthConfigured()) {
      setReady(true);
      return;
    }
    void getEnabledProviders().then((p) => setGoogleEnabled(p.google));
    const unsub = onAuthChange((u) => {
      setUser(u);
      setReady(true);
      if (u) void startSyncForUser(u);
      else stopSync();
    });
    return unsub;
  }, []);

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

  const redirectTo = typeof window !== 'undefined' ? window.location.href : '';
  const resetRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}${withBase('/reset-password')}` : '';

  function switchMode(next: Mode) {
    setMode(next);
    setPhase('idle');
    setError(null);
    setPassword('');
    setConfirmPassword('');
  }

  function closeModal() {
    setModalOpen(false);
    setMode('signin');
    setPhase('idle');
    setError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (password !== confirmPassword) return setError("Passwords don't match.");
      if (password.length < 6) return setError('Password must be at least 6 characters.');
    }

    setPhase('submitting');

    if (mode === 'signin') {
      const { error } = await signInWithPassword(email, password);
      if (error) {
        setError(error);
        setPhase('idle');
      } else {
        closeModal(); // user state flips via onAuthChange; the whole component re-renders into the signed-in view
      }
      return;
    }

    if (mode === 'signup') {
      const { error, needsConfirmation } = await signUpWithPassword(email, password, redirectTo);
      if (error) {
        setError(error);
        setPhase('idle');
      } else if (needsConfirmation) {
        setDoneMessage(`We sent a confirmation link to ${email}. Open it on this device to finish creating your account.`);
        setPhase('done');
      } else {
        closeModal(); // confirmation was off — already signed in
      }
      return;
    }

    if (mode === 'forgot') {
      const { error } = await sendPasswordReset(email, resetRedirectTo);
      if (error) {
        setError(error);
        setPhase('idle');
      } else {
        setDoneMessage(`We sent a password-reset link to ${email}. Open it on this device to set a new password.`);
        setPhase('done');
      }
      return;
    }

    // magiclink
    const { error } = await sendMagicLink(email, redirectTo);
    if (error) {
      setError(error);
      setPhase('idle');
    } else {
      setDoneMessage(`We sent a sign-in link to ${email}. Open it on this device to finish.`);
      setPhase('done');
    }
  }

  /* ── Signed in ── */
  if (user) {
    const label = user.email ?? 'Account';
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
              <p className="text-xs text-ink-muted">Signed in as</p>
              <p className="truncate text-sm font-semibold">{label}</p>
              <p className="mt-1 text-xs text-success">Progress is syncing to your account.</p>
            </div>
            <a
              href={withBase('/account')}
              className="block border-b border-border px-4 py-3 text-left text-sm font-semibold text-brand hover:bg-brand-tint"
            >
              My progress
            </a>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                void signOut();
              }}
              className="block w-full px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-surface-alt"
            >
              Sign out
            </button>
          </div>
        )}
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
        Log in
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-ink/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-card-hover sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {phase === 'done' ? (
              <>
                <h2 className="font-display text-lg font-extrabold">Check your email</h2>
                <div className="mt-4 rounded-card bg-brand-tint p-4 text-sm text-brand">{doneMessage}</div>
              </>
            ) : (
              <>
                <h2 className="font-display text-lg font-extrabold">{MODE_COPY[mode].title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{MODE_COPY[mode].subtitle}</p>

                <form onSubmit={onSubmit} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="account-email" className="block text-sm font-semibold">
                      Email
                    </label>
                    <input
                      id="account-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 focus:border-brand focus:outline-none"
                    />
                  </div>

                  {(mode === 'signin' || mode === 'signup') && (
                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="account-password" className="block text-sm font-semibold">
                          Password
                        </label>
                        {mode === 'signin' && (
                          <button
                            type="button"
                            onClick={() => switchMode('forgot')}
                            className="py-2 -my-2 text-xs font-semibold text-brand hover:underline"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <input
                        id="account-password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 focus:border-brand focus:outline-none"
                      />
                    </div>
                  )}

                  {mode === 'signup' && (
                    <div>
                      <label htmlFor="account-confirm" className="block text-sm font-semibold">
                        Confirm password
                      </label>
                      <input
                        id="account-confirm"
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 focus:border-brand focus:outline-none"
                      />
                    </div>
                  )}

                  {error && <p className="text-sm text-error">{error}</p>}

                  <button
                    type="submit"
                    disabled={phase === 'submitting'}
                    className="w-full rounded-button bg-brand px-5 py-2.5 font-display text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
                  >
                    {phase === 'submitting' ? 'Please wait…' : MODE_COPY[mode].cta}
                  </button>
                </form>

                {mode === 'signin' && (
                  <div className="mt-3 space-y-2">
                    {googleEnabled && (
                      <button
                        type="button"
                        onClick={() => void signInWithGoogle(redirectTo)}
                        className="w-full rounded-button border border-border px-5 py-2.5 font-display text-sm font-bold transition-colors hover:bg-surface-alt"
                      >
                        Continue with Google
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => switchMode('magiclink')}
                      className="w-full py-2 text-center text-xs font-semibold text-ink-muted hover:text-brand"
                    >
                      Email me a sign-in link instead
                    </button>
                  </div>
                )}

                <p className="mt-5 text-center text-sm text-ink-muted">
                  {mode === 'signup' && (
                    <>
                      Already have an account?{' '}
                      <button type="button" onClick={() => switchMode('signin')} className="font-semibold text-brand hover:underline">
                        Log in
                      </button>
                    </>
                  )}
                  {(mode === 'forgot' || mode === 'magiclink') && (
                    <>
                      Remembered it?{' '}
                      <button type="button" onClick={() => switchMode('signin')} className="font-semibold text-brand hover:underline">
                        Back to log in
                      </button>
                    </>
                  )}
                  {mode === 'signin' && (
                    <>
                      Don&apos;t have an account?{' '}
                      <button type="button" onClick={() => switchMode('signup')} className="font-semibold text-brand hover:underline">
                        Sign up
                      </button>
                    </>
                  )}
                </p>
              </>
            )}

            <button
              type="button"
              onClick={closeModal}
              className="mt-2 w-full py-2 text-center text-xs font-semibold text-ink-muted hover:text-ink"
            >
              {phase === 'done' ? 'Done' : 'Maybe later'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
