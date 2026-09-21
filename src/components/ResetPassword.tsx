/* Landing page for the "forgot password" email link. Supabase auto-establishes
   a temporary session when the browser opens that link (detectSessionInUrl in
   supabase.ts), so this just needs a signed-in check and a "set new password"
   form — no token handling of our own. Also reachable by any already-signed-in
   user who wants to set/change a password (e.g. someone who only ever used
   Google or a magic link before). */

import { useEffect, useState } from 'react';
import { withBase } from '../lib/url';
import { isAuthConfigured } from '../lib/auth/supabase';
import { onAuthChange, updatePassword } from '../lib/auth/session';
import { useT } from '../lib/i18n/react';

type Status = 'checking' | 'signedOut' | 'ready' | 'saving' | 'done';

export default function ResetPassword() {
  const { t } = useT();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthConfigured()) {
      setStatus('signedOut');
      return;
    }
    const unsub = onAuthChange((user) => setStatus(user ? 'ready' : 'signedOut'));
    return unsub;
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) return setError(t("Passwords don't match."));
    if (password.length < 6) return setError(t('Password must be at least 6 characters.'));
    setStatus('saving');
    const { error } = await updatePassword(password);
    if (error) {
      setError(error);
      setStatus('ready');
    } else {
      setStatus('done');
    }
  }

  if (status === 'checking') return null; // avoid a flash before we know the session state

  if (status === 'signedOut') {
    return (
      <div className="mx-auto max-w-sm rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-7">
        <h2 className="font-display text-lg font-extrabold">{t('Link expired or invalid')}</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {t('Password-reset links only work once and expire after a while. Open the site, click {login}, then {forgot} to request a fresh one.', {
            login: t('Log in'),
            forgot: t('Forgot password?'),
          })}
        </p>
        <a
          href={withBase('/')}
          className="mt-5 inline-block rounded-button bg-brand px-5 py-2.5 font-display text-sm font-bold text-white hover:bg-brand-hover"
        >
          {t('Back to home')}
        </a>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="mx-auto max-w-sm rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-7">
        <h2 className="font-display text-lg font-extrabold">{t('Password updated')}</h2>
        <p className="mt-2 text-sm text-ink-muted">{t("You're signed in with your new password.")}</p>
        <a
          href={withBase('/account')}
          className="mt-5 inline-block rounded-button bg-brand px-5 py-2.5 font-display text-sm font-bold text-white hover:bg-brand-hover"
        >
          {t('Go to my account')}
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-sm rounded-card border border-border bg-surface p-6 shadow-card sm:p-7"
    >
      <h2 className="font-display text-lg font-extrabold">{t('Set a new password')}</h2>
      <p className="mt-1 text-sm text-ink-muted">{t('Choose a new password for your account.')}</p>

      <div className="mt-5">
        <label htmlFor="new-password" className="block text-sm font-semibold">
          {t('New password')}
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 focus:border-brand focus:outline-none"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="confirm-new-password" className="block text-sm font-semibold">
          {t('Confirm new password')}
        </label>
        <input
          id="confirm-new-password"
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

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      <button
        type="submit"
        disabled={status === 'saving'}
        className="mt-5 w-full rounded-button bg-brand px-5 py-2.5 font-display text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
      >
        {status === 'saving' ? t('Saving…') : t('Set new password')}
      </button>
    </form>
  );
}
