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

   Why each detail is asked for, and who sees it, is explained in one line
   above the form with a link to /privacy (audit F04, 29 September 2026).
   Every field stays exactly as required as before.

   The parent block appears only while the typed date of birth makes the
   student under 18 (isMinor). The database applies every rule again
   (supabase/migrations/2026-09-24-profiles.sql), so a bypassed form still
   cannot store a bad row.

   Consent (2 October 2026, src/lib/legal/consent.ts):
   - After a Google sign-in from /sign-up, the tick kept in this tab is
     written to the account here (syncPendingConsent) before anything else.
   - An account with no consent to the current wording (a Google account
     made from /sign-in, or one made before 2 October 2026) gets the same
     required tick box on this form, and it is written with the save.
   - Under 18, the parent's tick is now a declaration that the parent agrees
     to the student using the site, to the processing of their data and, in
     the gated build, to any purchase. The profile row keeps the time it was
     first ticked (parent_consent_at, stamped by the database); the wording
     version it was given for has no column there, so it goes into the
     account's metadata as parent_consent_version and parent_consent_at. A
     declaration given for an older wording is asked again. */

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
import { intlLocale } from '../../lib/i18n/locale';
import { isTrialBuild } from '../../lib/trial/mode';
import {
  consentRecord,
  hasCurrentParentConsent,
  parentConsentRecord,
  parentDeclaration,
} from '../../lib/legal/consent';
import { readPendingConsent, saveConsentToAccount, syncPendingConsent } from '../../lib/legal/consent-store';
import ConsentCheck from '../legal/ConsentCheck';
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
    const format = new Intl.DateTimeFormat(intlLocale(locale, 'en-GB'), { month: 'long', timeZone: 'UTC' });
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
  /** Whether the account holds consent to the current wording: null until
      a pending Google tick has been moved onto it (or found absent). */
  const [accountConsent, setAccountConsent] = useState<boolean | null>(null);
  const [consentTick, setConsentTick] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  /** Whether a parent's declaration to the CURRENT wording is on the
      account. A tick from an older wording is not carried into the form. */
  const parentDeclared = useRef(false);

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
    parentDeclared.current = hasCurrentParentConsent(user.user_metadata);
    // A tick given on /sign-up before the Google redirect goes onto the
    // account first; leaving waits for it, so it is never dropped.
    const consentSynced = syncPendingConsent(user).then((held) => {
      if (!cancelled) setAccountConsent(held);
      return held;
    });
    const leave = () => {
      setStatus('leaving');
      void consentSynced.finally(() => window.location.replace(hrefFor(readNext())));
    };
    const forward = hasNext();
    const cached = cachedProfile(userId);
    if (cached && forward && isProfileComplete(cached)) {
      leave();
      return;
    }
    setSaved(cached);
    setValues(cached ? fromProfile(cached) : { ...EMPTY_PROFILE_INPUT, ...prefillFromUser(user) });
    void loadProfile(userId).then((fresh) => {
      if (cancelled) return;
      setLoaded(true);
      if (fresh === undefined) return; // Could not ask; the form still works.
      setSaved(fresh);
      if (fresh && forward && isProfileComplete(fresh)) {
        leave();
        return;
      }
      if (fresh && !touched.current) setValues(fromProfile(fresh));
    });
    return () => {
      cancelled = true;
    };
    // The user object changes identity on every token refresh; the id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /** The saved profile as form values; the parent's tick only when it was
      given for the current wording. */
  function fromProfile(p: StudentProfile): ProfileInput {
    const input = toInput(p);
    return { ...input, parentConsent: input.parentConsent && parentDeclared.current };
  }

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
  if ((!saved && !loaded) || accountConsent === null) return <div className="auth-spinner" aria-hidden="true" />;

  const minor = isMinor(values.dateOfBirth);
  /* This account has not agreed to the current wording yet, so the same
     required tick box as on /sign-up is part of this form. */
  const needsConsent = !accountConsent;
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
    const consentMissing = needsConsent && !consentTick;
    setConsentError(consentMissing ? t('Please tick the box to agree before you continue.') : null);
    if (!check.ok) {
      setErrors(check.errors);
      const first = FIELD_ORDER.find((k) => check.errors[k]);
      if (first) document.getElementById(fieldId(first))?.focus();
      return;
    }
    setErrors({});
    if (consentMissing) {
      document.getElementById('profile-consent')?.focus();
      return;
    }
    setStatus('saving');
    /* The proof goes onto the account before the details are saved: the
       student's own consent, and for a student under 18 the parent's
       declaration to the current wording. One call for both. */
    const now = new Date();
    const record = {
      ...(needsConsent ? (readPendingConsent(now) ?? consentRecord(now)) : {}),
      ...(isMinor(check.value.dateOfBirth) && !parentDeclared.current ? parentConsentRecord(now) : {}),
    };
    if (Object.keys(record).length > 0) {
      const stored = await saveConsentToAccount(record);
      if (stored.error) {
        setStatus('idle');
        setSaveError(t('We could not save your details: {error}', { error: stored.error }));
        return;
      }
      if (needsConsent) setAccountConsent(true);
      if ('parent_consent_version' in record) parentDeclared.current = true;
    }
    const result = await saveProfile(userId, check.value, saved);
    if (!result.ok) {
      setStatus('idle');
      setSaveError(t('We could not save your details: {error}', { error: result.message }));
      return;
    }
    setSaved(result.profile);
    setValues(fromProfile(result.profile));
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
    ? t('We ask once, so the course can call you by name and we can reach you about your studies or your account. It takes a minute.')
    : t('Keep these up to date.');

  return (
    <AuthShell eyebrow={setup && firstTime ? t('One last step') : undefined} title={title} lede={lede} wide>
      {/* Why these details, and who sees them (audit F04). Worded without
          the operator's name, which Alex has not published yet. */}
      <p className="auth-hint profile-why" id="profile-why">
        {t('Only you and the person who runs the site can see these details.')}{' '}
        <a className="auth-link is-small" href={withBase('/privacy#privacy-asked')}>
          {t('Why we ask for each one')}
        </a>
      </p>
      <form className="auth-form" onSubmit={onSubmit} noValidate aria-describedby="profile-why">
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

        {phoneInput('phone', t('Phone'), t('With the country code, so we can reach you about your studies or your account.'))}

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
                <span>{t(parentDeclaration(isTrialBuild()))}</span>
              </label>
              {err('parentConsent') && (
                <p className="auth-field-error" id="profile-parentConsent-error" role="alert">
                  {err('parentConsent')}
                </p>
              )}
            </div>
          </div>
        )}

        {needsConsent && (
          <ConsentCheck
            id="profile-consent"
            checked={consentTick}
            error={consentError}
            onChange={(v) => {
              setConsentTick(v);
              if (v) setConsentError(null);
              if (status === 'saved') setStatus('idle');
            }}
          />
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
