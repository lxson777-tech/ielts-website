/* /sign-in: email and password, or Google. Replaced the old sign-in popup
   (AuthModal) on 24 September 2026.

   Opened with `?next=<route>`; after signing in the student goes back
   there (default /dashboard). A student whose profile is not filled in yet
   is then sent to /profile by the profile gate, and back again after. Google
   lands on /profile directly, which forwards a student whose profile is
   already complete straight on to `next`. */

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isAuthConfigured } from '../../lib/auth/supabase';
import { getEnabledProviders, signInWithGoogle, signInWithPassword, signOut } from '../../lib/auth/session';
import { onAccountChange } from '../../lib/auth/lifecycle';
import { profileHref, signUpHref } from '../../lib/auth/profile';
import { absoluteHref, hrefFor, readNext } from '../../lib/auth/next';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import Turnstile, { captchaEnabled } from './Turnstile';
import { Field, PasswordInput, describedBy } from './fields';
import { leaveFor, whenSignedInSettled } from './after-auth';
import { AuthShell, GoogleButton, NotConfigured, SignedInAlready, friendlyAuthError } from './shell';

export default function SignInForm() {
  const { t } = useT();
  const [next, setNext] = useState('/dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [known, setKnown] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  useEffect(() => {
    setNext(readNext());
    void getEnabledProviders().then((p) => setGoogle(p.google));
    return onAccountChange((state) => {
      setUser(state.user);
      setKnown(state.known);
    });
  }, []);

  if (!isAuthConfigured()) return <NotConfigured />;
  if (!known) return <div className="auth-spinner" aria-hidden="true" />;
  if (user && !busy) {
    return <SignedInAlready email={user.email ?? ''} continueHref={hrefFor(next)} onSignOut={() => void signOut()} />;
  }

  const needsCaptcha = captchaEnabled() && !captcha;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError(t('Enter your email and password.'));
    setBusy(true);
    const result = await signInWithPassword(email, password, captcha);
    setCaptchaReset((n) => n + 1);
    if (result.error) {
      setError(friendlyAuthError(t, result.error));
      setBusy(false);
      return;
    }
    await whenSignedInSettled();
    leaveFor(hrefFor(next));
  }

  return (
    <AuthShell title={t('Welcome back')} lede={t('Sign in to carry on where you left off, on any device.')}>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <Field id="signin-email" label={t('Email')}>
          <input
            id="signin-email"
            className="auth-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field
          id="signin-password"
          label={t('Password')}
          aside={
            <a className="auth-link is-small" href={`${withBase('/forgot-password')}?next=${encodeURIComponent(next)}`}>
              {t('Forgot password?')}
            </a>
          }
        >
          <PasswordInput
            id="signin-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            describedById={describedBy('signin-password')}
          />
        </Field>

        <Turnstile onToken={setCaptcha} resetSignal={captchaReset} />
        {error && (
          <p className="auth-alert" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="auth-button" disabled={busy || needsCaptcha}>
          {busy ? t('Signing in…') : t('Sign in')}
        </button>
      </form>

      {google && (
        <>
          <div className="auth-divider">{t('or')}</div>
          <GoogleButton onClick={() => void signInWithGoogle(absoluteHref(profileHref(next)))} />
        </>
      )}

      <p className="auth-foot">
        {t('New here?')}{' '}
        <a className="auth-link" href={signUpHref(next)}>
          {t('Create an account')}
        </a>
      </p>
    </AuthShell>
  );
}
