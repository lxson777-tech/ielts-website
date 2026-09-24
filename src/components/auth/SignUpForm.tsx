/* /sign-up: create an account with email and a password (or Google).
   24 September 2026.

   Password rules: at least 8 characters with a letter and a number
   (src/lib/auth/password.ts), shown ticking off while the student types.
   After creating the account the student goes to /profile to give their
   details, then on to `next`. When the project asks for email confirmation,
   a "Check your email" screen explains it, and the confirmation link lands
   on that same /profile?next=... address. */

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isAuthConfigured } from '../../lib/auth/supabase';
import { getEnabledProviders, signInWithGoogle, signOut, signUpWithPassword } from '../../lib/auth/session';
import { onAccountChange } from '../../lib/auth/lifecycle';
import { checkPassword } from '../../lib/auth/password';
import { profileHref, signInHref } from '../../lib/auth/profile';
import { absoluteHref, hrefFor, readNext } from '../../lib/auth/next';
import { useT } from '../../lib/i18n/react';
import Turnstile, { captchaEnabled } from './Turnstile';
import { Field, PasswordInput, PasswordStrength, describedBy, passwordProblemSentence } from './fields';
import { leaveFor, whenSignedInSettled } from './after-auth';
import { AuthShell, GoogleButton, NotConfigured, SignedInAlready, friendlyAuthError } from './shell';

type Errors = Partial<Record<'email' | 'password' | 'confirm', string>>;

export default function SignUpForm() {
  const { t } = useT();
  const [next, setNext] = useState('/dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [known, setKnown] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
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

  if (sentTo) {
    return (
      <AuthShell title={t('Check your email')}>
        <div className="auth-done">
          <p className="auth-lede">
            {t('We sent a confirmation link to {email}. Open it on this device to finish creating your account.', {
              email: sentTo,
            })}
          </p>
          <p className="auth-hint" style={{ marginTop: 14 }}>
            {t('No email after a few minutes? Check your spam folder, or try again with a different address.')}
          </p>
          <a className="auth-button is-secondary" href={signInHref(next)}>
            {t('Back to sign in')}
          </a>
        </div>
      </AuthShell>
    );
  }

  if (user && !busy) {
    return <SignedInAlready email={user.email ?? ''} continueHref={hrefFor(next)} onSignOut={() => void signOut()} />;
  }

  const needsCaptcha = captchaEnabled() && !captcha;
  const profileAfter = profileHref(next);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const found: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) found.email = t('Please enter a valid email address.');
    const check = checkPassword(password);
    if (!check.ok) found.password = passwordProblemSentence(t, check.problems);
    if (!found.password && password !== confirm) found.confirm = t("Passwords don't match.");
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = found.email ? 'signup-email' : found.password ? 'signup-password' : 'signup-confirm';
      document.getElementById(first)?.focus();
      return;
    }

    setBusy(true);
    const result = await signUpWithPassword(email, password, absoluteHref(profileAfter), captcha);
    setCaptchaReset((n) => n + 1);
    if (result.error) {
      setError(friendlyAuthError(t, result.error));
      setBusy(false);
      return;
    }
    if (result.needsConfirmation) {
      setSentTo(email.trim());
      setBusy(false);
      return;
    }
    await whenSignedInSettled();
    leaveFor(profileAfter);
  }

  return (
    <AuthShell
      title={t('Create your account')}
      lede={t('Your course, scores and essays are saved to your account and follow you to any device.')}
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <Field id="signup-email" label={t('Email')} error={errors.email}>
          <input
            id="signup-email"
            className="auth-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={describedBy('signup-email', errors.email)}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
            }}
          />
        </Field>
        <Field id="signup-password" label={t('Password')} error={errors.password}>
          <PasswordInput
            id="signup-password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              if (errors.password) setErrors((x) => ({ ...x, password: undefined }));
            }}
            autoComplete="new-password"
            invalid={!!errors.password}
            describedById={describedBy('signup-password', errors.password)}
          />
          <PasswordStrength password={password} />
        </Field>
        <Field id="signup-confirm" label={t('Confirm password')} error={errors.confirm}>
          <PasswordInput
            id="signup-confirm"
            value={confirm}
            onChange={(v) => {
              setConfirm(v);
              if (errors.confirm) setErrors((x) => ({ ...x, confirm: undefined }));
            }}
            autoComplete="new-password"
            invalid={!!errors.confirm}
            describedById={describedBy('signup-confirm', errors.confirm)}
          />
        </Field>

        <Turnstile onToken={setCaptcha} resetSignal={captchaReset} />
        {error && (
          <p className="auth-alert" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="auth-button" disabled={busy || needsCaptcha}>
          {busy ? t('Creating your account…') : t('Create account')}
        </button>
      </form>

      {google && (
        <>
          <div className="auth-divider">{t('or')}</div>
          <GoogleButton onClick={() => void signInWithGoogle(absoluteHref(profileAfter))} />
        </>
      )}

      <p className="auth-foot">
        {t('Already have an account?')}{' '}
        <a className="auth-link" href={signInHref(next)}>
          {t('Sign in')}
        </a>
      </p>
    </AuthShell>
  );
}
