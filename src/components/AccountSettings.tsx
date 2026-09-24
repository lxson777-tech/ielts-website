/* "Your details and security", at the top of /account for a signed-in
   student (24 September 2026): the saved profile with a link to edit it,
   change email, change password, and sign out on every device.

   Renders nothing when nobody is signed in or accounts are not configured;
   the rest of /account (AccountOverview) already speaks to that case.

   Every change here goes through src/lib/auth/session.ts and Supabase. A
   sign-out on all devices ends in the same SIGNED_OUT event as the menu's
   sign-out, so the account lifecycle handles it exactly as it always has. */

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isAuthConfigured } from '../lib/auth/supabase';
import { onAccountChange } from '../lib/auth/lifecycle';
import { signOutEverywhere, updateEmail, updatePassword } from '../lib/auth/session';
import { checkPassword } from '../lib/auth/password';
import { cachedProfile, loadProfile, onProfileChange, signInHref, type StudentProfile } from '../lib/auth/profile';
import { absoluteHref } from '../lib/auth/next';
import { withBase } from '../lib/url';
import { useT } from '../lib/i18n/react';
import { Field, PasswordInput, PasswordStrength, SOURCE_LABELS, describedBy, passwordProblemSentence } from './auth/fields';
import { friendlyAuthError } from './auth/shell';

type Open = null | 'email' | 'password' | 'devices';

function formatDate(iso: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export default function AccountSettings() {
  const { t, locale } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null | undefined>(undefined);
  const [open, setOpen] = useState<Open>(null);

  useEffect(() => onAccountChange((state) => setUser(state.user)), []);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    setProfile(cachedProfile(userId) ?? undefined);
    void loadProfile(userId).then((fresh) => {
      if (fresh !== undefined) setProfile(fresh);
    });
    return onProfileChange((id, p) => {
      if (id === userId) setProfile(p);
    });
  }, [userId]);

  if (!isAuthConfigured() || !user) return null;

  const toggle = (which: Exclude<Open, null>) => setOpen((o) => (o === which ? null : which));
  const usesGoogleOnly = (user.app_metadata?.providers as string[] | undefined)?.every((p) => p !== 'email') ?? false;

  return (
    <section className="acct-settings" aria-labelledby="acct-settings-title">
      <div className="acct-settings-head">
        <div>
          <h2 id="acct-settings-title">{t('Your details and security')}</h2>
          <p>{t('Who you are, how you sign in, and where you are signed in.')}</p>
        </div>
      </div>

      <div className="acct-panel">
        {/* ── Details ── */}
        <div className="acct-row">
          <p className="acct-row-label">{t('Your details')}</p>
          <div className="acct-row-value">
            {profile === undefined ? (
              <span className="is-muted">{t('Loading…')}</span>
            ) : profile === null ? (
              <span className="is-muted">{t('Not filled in yet.')}</span>
            ) : (
              <dl>
                <dt>{t('Name')}</dt>
                <dd>
                  {profile.firstName} {profile.lastName}
                </dd>
                <dt>{t('Date of birth')}</dt>
                <dd>{formatDate(profile.dateOfBirth, locale)}</dd>
                <dt>{t('Phone')}</dt>
                <dd>{profile.phone}</dd>
                <dt>{t('City')}</dt>
                <dd>{profile.city}</dd>
                <dt>{t('School, university or job')}</dt>
                <dd>{profile.occupation}</dd>
                <dt>{t('Found us through')}</dt>
                <dd>{t(SOURCE_LABELS[profile.source])}</dd>
                {profile.parentName && (
                  <>
                    <dt>{t('Parent or guardian')}</dt>
                    <dd>
                      {profile.parentName}, {profile.parentPhone}
                    </dd>
                  </>
                )}
              </dl>
            )}
          </div>
          <a className="acct-toggle acct-row-action" href={withBase('/profile')}>
            {profile ? t('Edit details') : t('Add details')}
          </a>
        </div>

        {/* ── Email ── */}
        <div className="acct-row">
          <p className="acct-row-label">{t('Email')}</p>
          <p className="acct-row-value">{user.email}</p>
          <button
            type="button"
            className="acct-toggle acct-row-action"
            aria-expanded={open === 'email'}
            onClick={() => toggle('email')}
          >
            {open === 'email' ? t('Cancel') : t('Change email')}
          </button>
          {open === 'email' && <ChangeEmail current={user.email ?? ''} onDone={() => undefined} />}
        </div>

        {/* ── Password ── */}
        <div className="acct-row">
          <p className="acct-row-label">{t('Password')}</p>
          <p className="acct-row-value">
            <span className="is-muted">
              {usesGoogleOnly
                ? t('You sign in with Google. You can add a password as well.')
                : t('At least 8 characters, with a letter and a number.')}
            </span>
          </p>
          <button
            type="button"
            className="acct-toggle acct-row-action"
            aria-expanded={open === 'password'}
            onClick={() => toggle('password')}
          >
            {open === 'password' ? t('Cancel') : usesGoogleOnly ? t('Add a password') : t('Change password')}
          </button>
          {open === 'password' && <ChangePassword onDone={() => setOpen(null)} />}
        </div>

        {/* ── Devices ── */}
        <div className="acct-row">
          <p className="acct-row-label">{t('Devices')}</p>
          <p className="acct-row-value">
            <span className="is-muted">{t('Lost a phone or used a shared computer? Sign out everywhere at once.')}</span>
          </p>
          <button
            type="button"
            className="acct-toggle acct-row-action"
            aria-expanded={open === 'devices'}
            onClick={() => toggle('devices')}
          >
            {open === 'devices' ? t('Cancel') : t('Sign out on all devices')}
          </button>
          {open === 'devices' && <SignOutEverywhere />}
        </div>
      </div>
    </section>
  );
}

function ChangeEmail({ current, onDone }: { current: string; onDone: () => void }) {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <div className="acct-row-form">
        <p className="auth-alert is-good" role="status">
          {t('We sent a confirmation link to {email}. Your email changes once you open it.', { email: sentTo })}
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setFieldError(t('Please enter a valid email address.'));
    if (value.toLowerCase() === current.toLowerCase()) return setFieldError(t('This is already your email.'));
    setBusy(true);
    const result = await updateEmail(value, absoluteHref(withBase('/account')));
    setBusy(false);
    if (result.error) return setError(friendlyAuthError(t, result.error));
    setSentTo(value);
    onDone();
  }

  return (
    <form className="acct-row-form" onSubmit={onSubmit} noValidate>
      <Field id="acct-new-email" label={t('New email')} error={fieldError}>
        <input
          id="acct-new-email"
          className="auth-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          aria-invalid={fieldError ? 'true' : undefined}
          aria-describedby={describedBy('acct-new-email', fieldError)}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError(null);
          }}
        />
      </Field>
      <p className="auth-hint">{t('We will email a link to the new address. Nothing changes until you open it.')}</p>
      {error && (
        <p className="auth-alert" role="alert">
          {error}
        </p>
      )}
      <div className="auth-actions">
        <button type="submit" className="auth-button is-inline" disabled={busy}>
          {busy ? t('Sending…') : t('Send confirmation link')}
        </button>
      </div>
    </form>
  );
}

function ChangePassword({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="acct-row-form">
        <p className="auth-alert is-good" role="status">
          {t('Password changed.')}
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const check = checkPassword(password);
    if (!check.ok) return setPasswordError(passwordProblemSentence(t, check.problems));
    if (password !== confirm) return setConfirmError(t("Passwords don't match."));
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) return setError(friendlyAuthError(t, result.error));
    setDone(true);
    window.setTimeout(onDone, 2500);
  }

  return (
    <form className="acct-row-form" onSubmit={onSubmit} noValidate>
      <Field id="acct-new-password" label={t('New password')} error={passwordError}>
        <PasswordInput
          id="acct-new-password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            setPasswordError(null);
          }}
          autoComplete="new-password"
          invalid={!!passwordError}
          describedById={describedBy('acct-new-password', passwordError)}
        />
        <PasswordStrength password={password} />
      </Field>
      <Field id="acct-confirm-password" label={t('Confirm new password')} error={confirmError}>
        <PasswordInput
          id="acct-confirm-password"
          value={confirm}
          onChange={(v) => {
            setConfirm(v);
            setConfirmError(null);
          }}
          autoComplete="new-password"
          invalid={!!confirmError}
          describedById={describedBy('acct-confirm-password', confirmError)}
        />
      </Field>
      {error && (
        <p className="auth-alert" role="alert">
          {error}
        </p>
      )}
      <div className="auth-actions">
        <button type="submit" className="auth-button is-inline" disabled={busy}>
          {busy ? t('Saving…') : t('Save new password')}
        </button>
      </div>
    </form>
  );
}

function SignOutEverywhere() {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await signOutEverywhere();
    if (result.error) {
      setBusy(false);
      setError(friendlyAuthError(t, result.error));
      return;
    }
    window.location.assign(signInHref('/account'));
  }

  return (
    <div className="acct-row-form">
      <p className="auth-hint">
        {t('This signs you out here and on every other phone, tablet and computer. Your work stays saved in your account.')}
      </p>
      {error && (
        <p className="auth-alert" role="alert">
          {error}
        </p>
      )}
      <div className="auth-actions">
        <button type="button" className="auth-button is-inline" disabled={busy} onClick={() => void confirm()}>
          {busy ? t('Signing out…') : t('Sign out everywhere')}
        </button>
      </div>
    </div>
  );
}
