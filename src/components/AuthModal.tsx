/* The shared login window (sign in / create account / forgot password, with
   Google and a one-time email link as secondary options), extracted from
   AccountMenu so other entry points — e.g. the homepage "Start my IELTS
   preparation" CTA — can open the same flow. Purely presentational + auth
   calls; the caller decides what happens on close (AccountMenu just closes,
   the hero CTA continues to the study plan). Auth state itself propagates via
   onAuthChange subscribers, so this component never needs to report success
   beyond closing. */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { withBase } from '../lib/url';
import {
  getEnabledProviders,
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
  sendMagicLink,
  signInWithGoogle,
} from '../lib/auth/session';

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'magiclink';
type Phase = 'idle' | 'submitting' | 'done';

const MODE_COPY: Record<AuthMode, { title: string; subtitle: string; cta: string }> = {
  signin: { title: 'Log in', subtitle: 'Sync your course progress and scores across devices.', cta: 'Log in' },
  signup: {
    title: 'Create your account',
    subtitle: 'Save your course progress, essays and scores, and sync them across devices.',
    cta: 'Create account',
  },
  forgot: { title: 'Reset your password', subtitle: "We'll email you a link to set a new one.", cta: 'Send reset link' },
  magiclink: { title: 'Email me a link', subtitle: "We'll email you a one-time link, no password needed.", cta: 'Send sign-in link' },
};

export default function AuthModal({
  initialMode = 'signin',
  dismissLabel = 'Maybe later',
  onClose,
}: {
  initialMode?: AuthMode;
  /** Label for the always-available "close without signing in" action. */
  dismissLabel?: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [doneMessage, setDoneMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    void getEnabledProviders().then((p) => setGoogleEnabled(p.google));
  }, []);

  const redirectTo = typeof window !== 'undefined' ? window.location.href : '';
  const resetRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}${withBase('/reset-password')}` : '';

  function switchMode(next: AuthMode) {
    setMode(next);
    setPhase('idle');
    setError(null);
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
        onClose(); // user state flips via onAuthChange subscribers
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
        onClose(); // confirmation was off — already signed in
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

  // Portal to <body>: this window opens from arbitrary spots in the page (the
  // nav, the homepage hero), and any ancestor stacking context or transform
  // would trap the fixed overlay under the sticky header (z-40 + backdrop-blur)
  // or rebase it away from the viewport. Only ever rendered client-side (after
  // a click), so document is always available.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
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
          onClick={onClose}
          className="mt-2 w-full py-2 text-center text-xs font-semibold text-ink-muted hover:text-ink"
        >
          {phase === 'done' ? 'Done' : dismissLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}
