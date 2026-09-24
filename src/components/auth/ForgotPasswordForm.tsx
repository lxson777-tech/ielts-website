/* /forgot-password: ask for a reset link. The link lands on
   /reset-password (src/components/ResetPassword.tsx), which sets the new
   password. 24 September 2026. */

import { useEffect, useState } from 'react';
import { isAuthConfigured } from '../../lib/auth/supabase';
import { sendPasswordReset } from '../../lib/auth/session';
import { signInHref } from '../../lib/auth/profile';
import { absoluteHref, readNext } from '../../lib/auth/next';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import Turnstile, { captchaEnabled } from './Turnstile';
import { Field, describedBy } from './fields';
import { AuthShell, NotConfigured, friendlyAuthError } from './shell';

export default function ForgotPasswordForm() {
  const { t } = useT();
  const [next, setNext] = useState('/dashboard');
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  useEffect(() => {
    setNext(readNext());
  }, []);

  if (!isAuthConfigured()) return <NotConfigured />;

  if (sentTo) {
    return (
      <AuthShell title={t('Check your email')}>
        <div className="auth-done">
          <p className="auth-lede">
            {t('We sent a password-reset link to {email}. Open it on this device to set a new password.', {
              email: sentTo,
            })}
          </p>
          <p className="auth-hint" style={{ marginTop: 14 }}>
            {t('If there is no account with this email, no link is sent.')}
          </p>
          <a className="auth-button is-secondary" href={signInHref(next)}>
            {t('Back to sign in')}
          </a>
        </div>
      </AuthShell>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError(t('Please enter a valid email address.'));
      document.getElementById('forgot-email')?.focus();
      return;
    }
    setBusy(true);
    const result = await sendPasswordReset(email, absoluteHref(withBase('/reset-password')), captcha);
    setCaptchaReset((n) => n + 1);
    setBusy(false);
    if (result.error) return setError(friendlyAuthError(t, result.error));
    setSentTo(email.trim());
  }

  return (
    <AuthShell title={t('Reset your password')} lede={t("Enter your account's email and we'll send you a link to set a new password.")}>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <Field id="forgot-email" label={t('Email')} error={fieldError}>
          <input
            id="forgot-email"
            className="auth-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            aria-invalid={fieldError ? 'true' : undefined}
            aria-describedby={describedBy('forgot-email', fieldError)}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldError(null);
            }}
          />
        </Field>
        <Turnstile onToken={setCaptcha} resetSignal={captchaReset} />
        {error && (
          <p className="auth-alert" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="auth-button" disabled={busy || (captchaEnabled() && !captcha)}>
          {busy ? t('Sending…') : t('Send reset link')}
        </button>
      </form>
      <p className="auth-foot">
        {t('Remembered it?')}{' '}
        <a className="auth-link" href={signInHref(next)}>
          {t('Back to sign in')}
        </a>
      </p>
    </AuthShell>
  );
}
