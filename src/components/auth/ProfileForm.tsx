/* /profile: "About you". Every student fills it in once (Alex, 24 September
   2026) so the course can call them by name; the reading, checking and
   saving all live in src/lib/auth/profile.ts.

   Two ways in:
   - Setup, with `?next=<route>`: straight after sign-up, after the first
     Google sign-in, or sent here by the profile gate
     (src/lib/auth/profile-gate.ts) because this account has no complete
     profile yet. Saving goes on to `next`. A student whose profile is
     already complete (a returning Google sign-in lands here too) is sent
     on to `next` at once.
   - Edit, with no `next`: "My details" in the menu, "Edit details" on
     /account. Saving says "Saved" and stays.

   The parent block appears only while the typed date of birth makes the
   student under 18 (isMinor). The database applies every rule again
   (supabase/migrations/2026-09-24-profiles.sql), so a bypassed form still
   cannot store a bad row. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isAuthConfigured } from '../../lib/auth/supabase';
import { onAccountChange } from '../../lib/auth/lifecycle';
import {
  EMPTY_PROFILE_INPUT,
  PROFILE_SOURCES,
  cachedProfile,
  isMinor,
  isProfileComplete,
  loadProfile,
  prefillFromUser,
  saveProfile,
  signInHref,
  toInput,
  validateProfile,
  type ProfileErrorCode,
  type ProfileErrors,
  type ProfileInput,
  type StudentProfile,
} from '../../lib/auth/profile';
import { hasNext, hrefFor, readNext } from '../../lib/auth/next';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import { Field, SOURCE_LABELS, describedBy } from './fields';
import { AuthShell, NotConfigured } from './shell';

type Key = keyof ProfileInput;
type T = ReturnType<typeof useT>['t'];

/** One translated sentence per error code, worded for the field it is on. */
function errorSentence(t: T, field: Key, code: ProfileErrorCode | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case 'required':
      if (field === 'dateOfBirth') return t('Please choose your date of birth.');
      if (field === 'source') return t('Please choose one.');
      return t('Please fill this in.');
    case 'tooLong':
      return t('This is too long. Please shorten it.');
    case 'invalidDate':
      return t('Please choose a day, month and year that exist.');
    case 'inFuture':
      return t('This date is in the future.');
    case 'tooYoung':
      return t('Please check the year you were born.');
    case 'tooOld':
      return t('Please check the year you were born.');
    case 'invalidPhone':
      return t('Please enter a phone number with 7 to 15 digits, for example +7 701 234 56 78.');
    case 'invalidSource':
      return t('Please choose one.');
    case 'parentRequired':
      return t('Needed for students under 18.');
    case 'consentRequired':
      return t('A parent or guardian needs to agree before you continue.');
  }
}

/** The order errors are read in, so focus lands on the first one on screen. */
const FIELD_ORDER: Key[] = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'phone',
  'city',
  'occupation',
  'source',
  'parentName',
  'parentPhone',
  'parentConsent',
];

function fieldId(key: Key): string {
  if (key === 'dateOfBirth') return 'profile-dob-day';
  if (key === 'source') return 'profile-source-friend';
  return `profile-${key}`;
}

/* ── Date of birth: three selects, easy with a thumb, giving yyyy-mm-dd ── */

function splitDate(value: string): { d: string; m: string; y: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { d: '', m: '', y: '' };
  return { y: match[1]!, m: String(Number(match[2])), d: String(Number(match[3])) };
}

function joinDate(parts: { d: string; m: string; y: string }): string {
  if (!parts.d || !parts.m || !parts.y) return '';
  return `${parts.y}-${parts.m.padStart(2, '0')}-${parts.d.padStart(2, '0')}`;
}

function DateOfBirth({
  value,
  onChange,
  invalid,
  describedById,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  describedById?: string;
}) {
  const { t, locale } = useT();
  const [parts, setParts] = useState(() => splitDate(value));
  // A value arriving from outside (the saved profile loading) replaces the
  // selects; a half-filled date typed here is kept as it is.
  useEffect(() => {
    if (value && value !== joinDate(parts)) setParts(splitDate(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const months = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', { month: 'long', timeZone: 'UTC' });
    return Array.from({ length: 12 }, (_, i) => {
      const name = format.format(new Date(Date.UTC(2000, i, 1)));
      return name.charAt(0).toUpperCase() + name.slice(1);
    });
  }, [locale]);
  const thisYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 96 }, (_, i) => String(thisYear - 5 - i)), [thisYear]);

  const update = (patch: Partial<typeof parts>) => {
    const nextParts = { ...parts, ...patch };
    setParts(nextParts);
    onChange(joinDate(nextParts));
  };
  const common = {
    className: 'auth-select',
    'aria-invalid': invalid ? ('true' as const) : undefined,
    'aria-describedby': describedById,
  };

  return (
    <div className="auth-dob" role="group" aria-labelledby="profile-dob-label">
      <select id="profile-dob-day" aria-label={t('Day')} value={parts.d} onChange={(e) => update({ d: e.target.value })} {...common}>
        <option value="">{t('Day')}</option>
        {Array.from({ length: 31 }, (_, i) => (
          <option key={i + 1} value={String(i + 1)}>
            {i + 1}
          </option>
        ))}
      </select>
      <select id="profile-dob-month" aria-label={t('Month')} value={parts.m} onChange={(e) => update({ m: e.target.value })} {...common}>
        <option value="">{t('Month')}</option>
        {months.map((name, i) => (
          <option key={name} value={String(i + 1)}>
            {name}
          </option>
        ))}
      </select>
      <select id="profile-dob-year" aria-label={t('Year')} value={parts.y} onChange={(e) => update({ y: e.target.value })} {...common}>
        <option value="">{t('Year')}</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── The form ─────────────────────────────────────────────────────────── */

export default function ProfileForm() {
  const { t } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [known, setKnown] = useState(false);
  const [setup, setSetup] = useState(false);
  const [next, setNext] = useState('/dashboard');
  const [saved, setSaved] = useState<StudentProfile | null>(null);
  /** False until the server has answered (or could not be asked). */
  const [loaded, setLoaded] = useState(false);
  const [values, setValues] = useState<ProfileInput>(EMPTY_PROFILE_INPUT);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'leaving'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Set once the student types, so a late server answer never overwrites them. */
  const touched = useRef(false);

  useEffect(() => {
    setSetup(hasNext());
    setNext(readNext());
    return onAccountChange((state) => {
      setUser(state.user);
      setKnown(state.known);
    });
  }, []);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId || !user) return;
    let cancelled = false;
    touched.current = false;
    setLoaded(false);
    const forward = hasNext();
    const cached = cachedProfile(userId);
    if (cached && forward && isProfileComplete(cached)) {
      setStatus('leaving');
      window.location.replace(hrefFor(readNext()));
      return;
    }
    setSaved(cached);
    setValues(cached ? toInput(cached) : { ...EMPTY_PROFILE_INPUT, ...prefillFromUser(user) });
    void loadProfile(userId).then((fresh) => {
      if (cancelled) return;
      setLoaded(true);
      if (fresh === undefined) return; // Could not ask; the form still works.
      setSaved(fresh);
      if (fresh && forward && isProfileComplete(fresh)) {
        setStatus('leaving');
        window.location.replace(hrefFor(readNext()));
        return;
      }
      if (fresh && !touched.current) setValues(toInput(fresh));
    });
    return () => {
      cancelled = true;
    };
    // The user object changes identity on every token refresh; the id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!isAuthConfigured()) return <NotConfigured />;
  if (!known || status === 'leaving') return <div className="auth-spinner" aria-hidden="true" />;

  if (!user) {
    return (
      <AuthShell title={t('Sign in first')} lede={t('Your details belong to your account. Sign in, and this page opens again.')}>
        <a className="auth-button" href={signInHref('/profile')} style={{ marginTop: 28 }}>
          {t('Sign in')}
        </a>
      </AuthShell>
    );
  }

  /* Nothing cached and the server not answered yet: wait a moment rather
     than flash the first-time heading at a student who has a profile. */
  if (!saved && !loaded) return <div className="auth-spinner" aria-hidden="true" />;

  const minor = isMinor(values.dateOfBirth);
  const firstTime = !saved;

  function set<K extends Key>(key: K, value: ProfileInput[K]) {
    touched.current = true;
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    if (status === 'saved') setStatus('idle');
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setSaveError(null);
    const check = validateProfile(values, new Date());
    if (!check.ok) {
      setErrors(check.errors);
      const first = FIELD_ORDER.find((k) => check.errors[k]);
      if (first) document.getElementById(fieldId(first))?.focus();
      return;
    }
    setErrors({});
    setStatus('saving');
    const result = await saveProfile(userId, check.value, saved);
    if (!result.ok) {
      setStatus('idle');
      setSaveError(t('We could not save your details: {error}', { error: result.message }));
      return;
    }
    setSaved(result.profile);
    setValues(toInput(result.profile));
    touched.current = false;
    if (setup) {
      setStatus('leaving');
      window.location.assign(hrefFor(next));
      return;
    }
    setStatus('saved');
  }

  const err = (key: Key) => errorSentence(t, key, errors[key]);
  const textInput = (key: 'firstName' | 'lastName' | 'city' | 'occupation' | 'parentName', autoComplete: string, label: string, hint?: string) => (
    <Field id={`profile-${key}`} label={label} error={err(key)} hint={hint}>
      <input
        id={`profile-${key}`}
        className="auth-input"
        type="text"
        autoComplete={autoComplete}
        value={values[key]}
        maxLength={130}
        aria-invalid={errors[key] ? 'true' : undefined}
        aria-describedby={describedBy(`profile-${key}`, err(key), hint)}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  );
  const phoneInput = (key: 'phone' | 'parentPhone', label: string, hint?: string) => (
    <Field id={`profile-${key}`} label={label} error={err(key)} hint={hint}>
      <input
        id={`profile-${key}`}
        className="auth-input"
        type="tel"
        inputMode="tel"
        autoComplete={key === 'phone' ? 'tel' : 'off'}
        placeholder="+7 701 234 56 78"
        value={values[key]}
        maxLength={24}
        aria-invalid={errors[key] ? 'true' : undefined}
        aria-describedby={describedBy(`profile-${key}`, err(key), hint)}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  );

  const title = firstTime ? t('Tell us about yourself') : t('Your details');
  const lede = firstTime
    ? t('So the course can call you by name and your teachers know who you are. It takes a minute, and you only do it once.')
    : t('Keep these up to date. Only you and the teaching centre can see them.');

  return (
    <AuthShell eyebrow={setup && firstTime ? t('One last step') : undefined} title={title} lede={lede} wide>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="auth-row">
          {textInput('firstName', 'given-name', t('First name'))}
          {textInput('lastName', 'family-name', t('Last name'))}
        </div>

        <div className="auth-field">
          <span className="auth-label" id="profile-dob-label">
            {t('Date of birth')}
          </span>
          <DateOfBirth
            value={values.dateOfBirth}
            onChange={(v) => set('dateOfBirth', v)}
            invalid={!!errors.dateOfBirth}
            describedById={describedBy('profile-dob', err('dateOfBirth'))}
          />
          {err('dateOfBirth') && (
            <p className="auth-field-error" id="profile-dob-error" role="alert">
              {err('dateOfBirth')}
            </p>
          )}
        </div>

        {phoneInput('phone', t('Phone'), t('With the country code, so the centre can reach you.'))}

        <div className="auth-row">
          {textInput('city', 'address-level2', t('City'))}
          {textInput('occupation', 'organization', t('School, university or job'))}
        </div>

        <fieldset className="auth-field" style={{ border: 0, margin: 0, padding: 0 }} aria-describedby={describedBy('profile-source', err('source'))}>
          <legend className="auth-label" style={{ marginBottom: 7 }}>
            {t('How did you find us?')}
          </legend>
          <div className="auth-choices">
            {PROFILE_SOURCES.map((source) => (
              <label key={source} className="auth-choice">
                <input
                  id={`profile-source-${source}`}
                  type="radio"
                  name="profile-source"
                  value={source}
                  checked={values.source === source}
                  onChange={() => set('source', source)}
                />
                {t(SOURCE_LABELS[source])}
              </label>
            ))}
          </div>
          {err('source') && (
            <p className="auth-field-error" id="profile-source-error" role="alert" style={{ marginTop: 7 }}>
              {err('source')}
            </p>
          )}
        </fieldset>

        {minor && (
          <div className="auth-section" role="group" aria-labelledby="profile-parent-title" data-testid="parent-block">
            <h2 className="auth-section-title" id="profile-parent-title">
              {t('A parent or guardian')}
            </h2>
            <p className="auth-section-note">
              {t('You are under 18, so we also need a parent or guardian who knows you are using the site.')}
            </p>
            <div className="auth-row">
              {textInput('parentName', 'off', t("Parent's name"))}
              {phoneInput('parentPhone', t("Parent's phone"))}
            </div>
            <div className="auth-field">
              <label className="auth-check">
                <input
                  id="profile-parentConsent"
                  type="checkbox"
                  checked={values.parentConsent}
                  aria-invalid={errors.parentConsent ? 'true' : undefined}
                  aria-describedby={describedBy('profile-parentConsent', err('parentConsent'))}
                  onChange={(e) => set('parentConsent', e.target.checked)}
                />
                <span>{t('My parent or guardian agrees to me using this site')}</span>
              </label>
              {err('parentConsent') && (
                <p className="auth-field-error" id="profile-parentConsent-error" role="alert">
                  {err('parentConsent')}
                </p>
              )}
            </div>
          </div>
        )}

        {saveError && (
          <p className="auth-alert" role="alert">
            {saveError}
          </p>
        )}
        {status === 'saved' && (
          <p className="auth-alert is-good" role="status">
            {t('Saved')}
          </p>
        )}

        <div className="auth-actions">
          <button type="submit" className="auth-button" disabled={status === 'saving'}>
            {status === 'saving' ? t('Saving…') : setup ? t('Save and continue') : t('Save details')}
          </button>
          {!setup && (
            <a className="auth-button is-secondary" href={withBase('/account')}>
              {t('Back to my account')}
            </a>
          )}
        </div>
      </form>
    </AuthShell>
  );
}
