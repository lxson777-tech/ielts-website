/* Landing page for the "forgot password" email link. Supabase auto-establishes
   a temporary session when the browser opens that link (detectSessionInUrl in
   supabase.ts), so this just needs a signed-in check and a "set new password"
   form, no token handling of our own. Also reachable by any already-signed-in
   user who wants to set a password (e.g. someone who only ever used Google).

   Since 24 September 2026 the new password follows the site's rules (at
   least 8 characters, a letter and a number: src/lib/auth/password.ts), and
   an expired link points at /forgot-password for a fresh one. */

import { useEffect, useState } from 'react';
import { withBase } from '../lib/url';
import { isAuthConfigured } from '../lib/auth/supabase';
import { onAuthChange, updatePassword } from '../lib/auth/session';
import { checkPassword } from '../lib/auth/password';
import { useT } from '../lib/i18n/react';
import { Field, PasswordInput, PasswordStrength, describedBy, passwordProblemSentence } from './auth/fields';
import { AuthShell, friendlyAuthError } from './auth/shell';

type Status = 'checking' | 'signedOut' | 'ready' | 'saving' | 'done';

export default function ResetPassword() {
  const { t } = useT();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthConfigured()) {
      setStatus('signedOut');
      return;
    }
    const unsub = onAuthChange((user) => setStatus((s) => (s === 'saving' || s === 'done' ? s : user ? 'ready' : 'signedOut')));
    return unsub;
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const check = checkPassword(password);
    if (!check.ok) {
      setPasswordError(passwordProblemSentence(t, check.problems));
      document.getElementById('new-password')?.focus();
      return;
    }
    if (password !== confirmPassword) {
      setConfirmError(t("Passwords don't match."));
      document.getElementById('confirm-new-password')?.focus();
      return;
    }
    setStatus('saving');
    const { error } = await updatePassword(password);
    if (error) {
      setError(friendlyAuthError(t, error));
      setStatus('ready');
    } else {
      setStatus('done');
    }
  }

  if (status === 'checking') return <div className="auth-spinner" aria-hidden="true" />;

  if (status === 'signedOut') {
    return (
      <AuthShell
        title={t('Link expired or invalid')}
        lede={t('Password-reset links only work once and expire after a while. Ask for a fresh one and open it on this device.')}
      >
        <a className="auth-button" href={withBase('/forgot-password')} style={{ marginTop: 28 }}>
          {t('Send me a new link')}
        </a>
      </AuthShell>
    );
  }

  if (status === 'done') {
    return (
      <AuthShell title={t('Password updated')} lede={t("You're signed in with your new password.")}>
        <a className="auth-button" href={withBase('/dashboard')} style={{ marginTop: 28 }}>
          {t('Go to my dashboard')}
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('Set a new password')} lede={t('Choose a new password for your account.')}>
      <form onSubmit={onSubmit} className="auth-form" noValidate>
        <Field id="new-password" label={t('New password')} error={passwordError}>
          <PasswordInput
            id="new-password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setPasswordError(null);
            }}
            autoComplete="new-password"
            invalid={!!passwordError}
            describedById={describedBy('new-password', passwordError)}
          />
          <PasswordStrength password={password} />
        </Field>
        <Field id="confirm-new-password" label={t('Confirm new password')} error={confirmError}>
          <PasswordInput
            id="confirm-new-password"
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v);
              setConfirmError(null);
            }}
            autoComplete="new-password"
            invalid={!!confirmError}
            describedById={describedBy('confirm-new-password', confirmError)}
          />
        </Field>

        {error && (
          <p className="auth-alert" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={status === 'saving'} className="auth-button">
          {status === 'saving' ? t('Saving…') : t('Set new password')}
        </button>
      </form>
    </AuthShell>
  );
}
