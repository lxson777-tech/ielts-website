/* The frame every account page shares: one calm panel with a heading and a
   line of explanation, plus the few states they all have in common (accounts
   not configured, already signed in) and the Google button. */

import type { ReactNode } from 'react';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';

export function AuthShell({
  title,
  lede,
  eyebrow,
  wide = false,
  children,
}: {
  title: string;
  lede?: ReactNode;
  eyebrow?: string;
  wide?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`auth-page${wide ? ' is-wide' : ''}`}>
      <section className="auth-panel">
        {eyebrow && <p className="auth-eyebrow">{eyebrow}</p>}
        <h1 className="auth-title">{title}</h1>
        {lede && <p className="auth-lede">{lede}</p>}
        {children}
      </section>
    </div>
  );
}

export function NotConfigured() {
  const { t } = useT();
  return (
    <AuthShell title={t('Accounts are not available')} lede={t('Accounts are not configured for this site yet.')}>
      <a className="auth-button is-secondary" href={withBase('/dashboard')} style={{ marginTop: 28 }}>
        {t('Go to my dashboard')}
      </a>
    </AuthShell>
  );
}

export function SignedInAlready({
  email,
  continueHref,
  onSignOut,
}: {
  email: string;
  continueHref: string;
  onSignOut: () => void;
}) {
  const { t } = useT();
  return (
    <AuthShell title={t('You are signed in')} lede={t('Signed in as {email}.', { email })}>
      <div className="auth-actions" style={{ marginTop: 28 }}>
        <a className="auth-button" href={continueHref}>
          {t('Continue')}
        </a>
        <button type="button" className="auth-button is-secondary" onClick={onSignOut}>
          {t('Sign out')}
        </button>
      </div>
    </AuthShell>
  );
}

export function GoogleButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  return (
    <button type="button" className="auth-button is-secondary" onClick={onClick}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
      {t('Continue with Google')}
    </button>
  );
}

/** Supabase's English error for the few cases a student can do something
    about, in plain words; anything else is shown as Supabase wrote it. */
export function friendlyAuthError(t: (key: string) => string, message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return t('That email and password do not match. Check them and try again.');
  if (m.includes('email not confirmed')) return t('Please open the confirmation link we emailed you first.');
  if (m.includes('already registered') || m.includes('already been registered'))
    return t('There is already an account with this email. Sign in instead.');
  if (m.includes('captcha')) return t('The security check did not go through. Please try again.');
  if (m.includes('rate limit') || m.includes('too many')) return t('Too many attempts. Please wait a minute and try again.');
  if (m.includes('pwned') || m.includes('leaked') || m.includes('compromised'))
    return t('This password has appeared in a data leak elsewhere. Please choose a different one.');
  if (m.includes('should be different')) return t('The new password must be different from the old one.');
  if (m.includes('failed to fetch') || m.includes('network')) return t('Could not reach the server. Check your connection and try again.');
  return message;
}
