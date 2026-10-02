/* "Your details and security", the Profile category of /account for a signed-in
   student (24 September 2026): the saved profile with a link to edit it,
   change email, change password, and sign out on every device.

   Renders nothing when nobody is signed in or accounts are not configured;
   the rest of /account (AccountOverview) already speaks to that case.

   Every change here goes through src/lib/auth/session.ts and Supabase. A
   sign-out on all devices ends in the same SIGNED_OUT event as the menu's
   sign-out, so the account lifecycle handles it exactly as it always has.

   "Download my data" (2 October 2026, src/lib/legal/export.ts): one JSON
   file of everything the account holds, read with the student's own
   session, plus what this browser keeps for them. On both builds. */

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase, isAuthConfigured } from '../lib/auth/supabase';
import { downloadMyData } from '../lib/legal/export';
import { onAccountChange } from '../lib/auth/lifecycle';
import { ACCOUNT_DELETION_ENABLED, deleteMyAccount, signOutEverywhere, updateEmail, updatePassword } from '../lib/auth/session';
import { checkPassword } from '../lib/auth/password';
import { cachedProfile, loadProfile, onProfileChange, signInHref, type StudentProfile } from '../lib/auth/profile';
import { absoluteHref } from '../lib/auth/next';
import { withBase } from '../lib/url';
import { useT } from '../lib/i18n/react';
import { intlLocale } from '../lib/i18n/locale';
import { Field, PasswordInput, PasswordStrength, SOURCE_LABELS, describedBy, passwordProblemSentence } from './auth/fields';
import { friendlyAuthError } from './auth/shell';

type Open = null | 'email' | 'password' | 'devices' | 'delete';

function formatDate(iso: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(intlLocale(locale, 'en-GB'), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export default function AccountSettings() {
  const { t, locale } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null | undefined>(undefined);
  const [open, setOpen] = useState<Open>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

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
    <>
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
            {/* Once the form has closed itself, the row keeps saying it worked
                (2 October 2026: the confirmation used to vanish with the form
                after 2.5 seconds, too quick to be sure of). */}
            {passwordChanged && open !== 'password' ? (
              <span className="acct-row-good" role="status">{t('Password changed.')}</span>
            ) : (
              <span className="is-muted">
                {usesGoogleOnly
                  ? t('You sign in with Google. You can add a password as well.')
                  : t('At least 8 characters, with a letter and a number.')}
              </span>
            )}
          </p>
          <button
            type="button"
            className="acct-toggle acct-row-action"
            aria-expanded={open === 'password'}
            onClick={() => toggle('password')}
          >
            {open === 'password' ? t('Cancel') : usesGoogleOnly ? t('Add a password') : t('Change password')}
          </button>
          {open === 'password' && <ChangePassword onChanged={() => setPasswordChanged(true)} onDone={() => setOpen(null)} />}
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

        {/* ── Your data: a copy of everything, as one file ── */}
        <DownloadMyData user={user} />

        {/* Delete the account and everything in it, at once (Alex,
            2 October 2026). Only where the database has the function
            (src/lib/auth/session.ts). */}
        {ACCOUNT_DELETION_ENABLED && (
          <div className="acct-row acct-row-danger">
            <p className="acct-row-label">{t('Delete account')}</p>
            <p className="acct-row-value">
              <span className="is-muted">{t('Removes your account and all your data at once. This cannot be undone.')}</span>
            </p>
            <button
              type="button"
              className="acct-toggle acct-row-action"
              aria-expanded={open === 'delete'}
              onClick={() => toggle('delete')}
            >
              {open === 'delete' ? t('Cancel') : t('Delete my account')}
            </button>
            {open === 'delete' && <DeleteAccount />}
          </div>
        )}
      </div>
    </section>
    </>
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

function ChangePassword({ onChanged, onDone }: { onChanged: () => void; onDone: () => void }) {
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
    onChanged();
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

function DeleteAccount() {
  const { t } = useT();
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!sure) return;
    setBusy(true);
    setError(null);
    const result = await deleteMyAccount();
    if (result.error) {
      setBusy(false);
      setError(friendlyAuthError(t, result.error));
      return;
    }
    window.location.assign(withBase('/account-deleted'));
  }

  return (
    <div className="acct-row-form">
      <p className="auth-hint">
        {t('Deleting your account removes, immediately and for good: your details, your progress and results, your essays and speaking feedback, your saved items and notes, your study plan, your conversations with Mr EZ and your messages to us. Any access you have paid for ends.')}
      </p>
      <p className="auth-hint">
        {t('Only a record of each payment is kept, without your name or email, because the law requires sales records to be kept.')}
      </p>
      <label className="acct-confirm">
        <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
        <span>{t('I understand that my account and all my data will be deleted and cannot be recovered.')}</span>
      </label>
      {error && (
        <p className="auth-alert" role="alert">
          {error}
        </p>
      )}
      <div className="auth-actions">
        <button type="button" className="auth-button is-inline is-danger" disabled={!sure || busy} onClick={() => void confirm()}>
          {busy ? t('Deleting…') : t('Delete my account and all my data')}
        </button>
      </div>
    </div>
  );
}

function DownloadMyData({ user }: { user: User }) {
  const { t } = useT();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'partial' | 'error'>('idle');

  async function run() {
    const sb = getSupabase();
    if (!sb) {
      setState('error');
      return;
    }
    setState('busy');
    try {
      const { failed } = await downloadMyData(sb, user, (text) => t(text));
      setState(failed > 0 ? 'partial' : 'done');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="acct-row" data-testid="download-my-data">
      <p className="acct-row-label">{t('Your data')}</p>
      <p className="acct-row-value">
        <span className="is-muted">{t('Download a copy of everything your account holds, as one file.')}</span>
        {state === 'done' && (
          <span className="acct-row-good" role="status">
            {' '}
            {t('Your file is downloading.')}
          </span>
        )}
        {state === 'partial' && (
          <span className="acct-row-good" role="status">
            {' '}
            {t('Your file is downloading, but some parts could not be read just now. Try again later for a complete copy.')}
          </span>
        )}
        {state === 'error' && (
          <span className="auth-field-error" role="alert">
            {' '}
            {t('Your data could not be read just now. Please try again.')}
          </span>
        )}
      </p>
      <button type="button" className="acct-toggle acct-row-action" disabled={state === 'busy'} onClick={() => void run()}>
        {state === 'busy' ? t('Preparing…') : t('Download my data')}
      </button>
    </div>
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
