/* The student profile: the details every account must give before using the
   course (supabase/migrations/2026-09-24-profiles.sql). Name, date of birth,
   phone, city, what they do, how they found us, and for anyone under 18 a
   parent's name and phone plus the parent's agreement.

   This module is the ONE place the profile is read, checked and saved.
   The pages that show a form (src/components/auth/*), the dashboard greeting
   and the Mr EZ panel all import from here rather than talking to the
   database themselves. Browser-only for the network parts; the checks are
   pure and are unit tested without a browser.

   Who may read whose profile is decided by the database (Row Level
   Security on student_profiles, own row only). Nothing here can widen it.
   The local cache is keyed by user id and read only for the signed-in
   user, so a previous student's name on a shared computer is never shown
   to the next one. */

import type { User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { withBase } from '../url';

export const PROFILE_SOURCES = ['friend', 'instagram', 'centre', 'other'] as const;
export type ProfileSource = (typeof PROFILE_SOURCES)[number];

/** The age from which a student signs up without a parent. */
export const ADULT_AGE = 18;
/** Below this the date of birth is treated as a typo. */
export const MIN_AGE = 5;

export interface StudentProfile {
  firstName: string;
  lastName: string;
  /** yyyy-mm-dd, a calendar day with no time zone. */
  dateOfBirth: string;
  /** Digits with an optional leading plus, as stored. */
  phone: string;
  city: string;
  /** School, university or job, free text. */
  occupation: string;
  source: ProfileSource;
  parentName: string | null;
  parentPhone: string | null;
  /** ISO datetime the "a parent agrees" box was ticked, or null. */
  parentConsentAt: string | null;
  updatedAt: string;
}

/** What a form collects. `parentConsent` becomes `parentConsentAt` on save. */
export interface ProfileInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  city: string;
  occupation: string;
  source: ProfileSource | '';
  parentName: string;
  parentPhone: string;
  parentConsent: boolean;
}

export const EMPTY_PROFILE_INPUT: ProfileInput = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  phone: '',
  city: '',
  occupation: '',
  source: '',
  parentName: '',
  parentPhone: '',
  parentConsent: false,
};

/** Why a field failed. The form turns each code into a translated sentence,
    so no English lives here. */
export type ProfileErrorCode =
  | 'required'
  | 'tooLong'
  | 'invalidDate'
  | 'inFuture'
  | 'tooYoung'
  | 'tooOld'
  | 'invalidPhone'
  | 'invalidSource'
  | 'parentRequired'
  | 'consentRequired';

export type ProfileErrors = Partial<Record<keyof ProfileInput, ProfileErrorCode>>;

const MAX = { firstName: 60, lastName: 60, city: 80, occupation: 120, parentName: 80 } as const;
const PHONE = /^\+?[0-9]{7,15}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Keep digits and one leading plus: "+7 (777) 123-45-67" -> "+77771234567". */
export function normalisePhone(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^0-9]/g, '');
}

/** Whole years between a yyyy-mm-dd birthday and `now`, or null when the
    date is not a real calendar day. */
export function ageOn(dateOfBirth: string, now: Date = new Date()): number | null {
  if (!DATE.test(dateOfBirth)) return null;
  const [y, m, d] = dateOfBirth.split('-').map(Number) as [number, number, number];
  const birth = new Date(Date.UTC(y, m - 1, d));
  if (birth.getUTCFullYear() !== y || birth.getUTCMonth() !== m - 1 || birth.getUTCDate() !== d) return null;
  let age = now.getFullYear() - y;
  const beforeBirthday = now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

export function isMinor(dateOfBirth: string, now: Date = new Date()): boolean {
  const age = ageOn(dateOfBirth, now);
  return age !== null && age < ADULT_AGE;
}

/** Check a form. On success the value is normalised (trimmed, phones as
    digits) and ready to save. Every failing field gets exactly one code. */
export function validateProfile(
  input: ProfileInput,
  now: Date = new Date(),
): { ok: true; value: ProfileInput } | { ok: false; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const text = (key: 'firstName' | 'lastName' | 'city' | 'occupation'): string => {
    const value = input[key].trim();
    if (!value) errors[key] = 'required';
    else if (value.length > MAX[key]) errors[key] = 'tooLong';
    return value;
  };
  const firstName = text('firstName');
  const lastName = text('lastName');
  const city = text('city');
  const occupation = text('occupation');

  const dateOfBirth = input.dateOfBirth.trim();
  const age = ageOn(dateOfBirth, now);
  if (!dateOfBirth) errors.dateOfBirth = 'required';
  else if (age === null) errors.dateOfBirth = 'invalidDate';
  else if (age < 0) errors.dateOfBirth = 'inFuture';
  else if (age < MIN_AGE) errors.dateOfBirth = 'tooYoung';
  else if (age > 120) errors.dateOfBirth = 'tooOld';

  const phone = normalisePhone(input.phone);
  if (!input.phone.trim()) errors.phone = 'required';
  else if (!PHONE.test(phone)) errors.phone = 'invalidPhone';

  const source = input.source;
  if (!source) errors.source = 'required';
  else if (!(PROFILE_SOURCES as readonly string[]).includes(source)) errors.source = 'invalidSource';

  const minor = age !== null && age >= 0 && age < ADULT_AGE;
  let parentName = '';
  let parentPhone = '';
  if (minor) {
    parentName = input.parentName.trim();
    if (!parentName) errors.parentName = 'parentRequired';
    else if (parentName.length > MAX.parentName) errors.parentName = 'tooLong';
    parentPhone = normalisePhone(input.parentPhone);
    if (!input.parentPhone.trim()) errors.parentPhone = 'parentRequired';
    else if (!PHONE.test(parentPhone)) errors.parentPhone = 'invalidPhone';
    if (!input.parentConsent) errors.parentConsent = 'consentRequired';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      firstName,
      lastName,
      dateOfBirth,
      phone,
      city,
      occupation,
      source,
      parentName,
      parentPhone,
      parentConsent: minor ? true : false,
    },
  };
}

/** A saved row counts as complete when every required field is present and
    the under-18 rule holds today. A student who turned 18 since saving still
    counts as complete. */
export function isProfileComplete(profile: StudentProfile | null | undefined, now: Date = new Date()): boolean {
  if (!profile) return false;
  const check = validateProfile(toInput(profile), now);
  return check.ok;
}

/** A form's starting values from a saved profile. */
export function toInput(profile: StudentProfile): ProfileInput {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    dateOfBirth: profile.dateOfBirth,
    phone: profile.phone,
    city: profile.city,
    occupation: profile.occupation,
    source: profile.source,
    parentName: profile.parentName ?? '',
    parentPhone: profile.parentPhone ?? '',
    parentConsent: !!profile.parentConsentAt,
  };
}

/** What a Google sign-in already tells us: the name, split on the first
    space. Empty strings for an email sign-up. */
export function prefillFromUser(user: Pick<User, 'user_metadata'> | null | undefined): Partial<ProfileInput> {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const full = typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : '';
  const given = typeof meta.given_name === 'string' ? meta.given_name : '';
  const family = typeof meta.family_name === 'string' ? meta.family_name : '';
  if (given || family) return { firstName: given.trim(), lastName: family.trim() };
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

/* ---------------------------------------------------------------------- */
/* Storage                                                                 */
/* ---------------------------------------------------------------------- */

interface ProfileRow {
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  city: string;
  occupation: string;
  source: ProfileSource;
  parent_name: string | null;
  parent_phone: string | null;
  parent_consent_at: string | null;
  updated_at: string;
}

function fromRow(row: ProfileRow): StudentProfile {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    phone: row.phone,
    city: row.city,
    occupation: row.occupation,
    source: row.source,
    parentName: row.parent_name,
    parentPhone: row.parent_phone,
    parentConsentAt: row.parent_consent_at,
    updatedAt: row.updated_at,
  };
}

const CACHE_PREFIX = 'ielts.profile.v1:';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** The last profile this browser saw for THIS user, or null. Read it for an
    instant greeting before the network answers; never for another user. */
export function cachedProfile(userId: string): StudentProfile | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(CACHE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudentProfile;
    return parsed && typeof parsed.firstName === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function remember(userId: string, profile: StudentProfile | null): void {
  const s = storage();
  if (!s) return;
  try {
    if (profile) s.setItem(CACHE_PREFIX + userId, JSON.stringify(profile));
    else s.removeItem(CACHE_PREFIX + userId);
  } catch {
    /* Storage full or blocked: the next page asks the server again. */
  }
}

type Listener = (userId: string, profile: StudentProfile | null) => void;
const listeners = new Set<Listener>();

/** Hear about a profile being loaded or saved on this page. */
export function onProfileChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(userId: string, profile: StudentProfile | null): void {
  for (const l of listeners) {
    try {
      l(userId, profile);
    } catch {
      /* A screen throwing must not stop the others hearing. */
    }
  }
}

/** The student's own saved profile. `null` when they have not filled it in,
    `undefined` when the server could not be asked (offline, signed out,
    table not deployed yet): callers must not treat that as "missing". */
export async function loadProfile(userId: string): Promise<StudentProfile | null | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;
  try {
    const { data, error } = await sb.from('student_profiles').select('*').eq('user_id', userId).maybeSingle();
    if (error) return undefined;
    const profile = data ? fromRow(data as ProfileRow) : null;
    remember(userId, profile);
    publish(userId, profile);
    return profile;
  } catch {
    return undefined;
  }
}

/** Save a checked form (validateProfile's `value`). The database applies the
    same rules again, so a bypassed form still cannot store a bad row. */
export async function saveProfile(
  userId: string,
  value: ProfileInput,
  existing?: StudentProfile | null,
): Promise<{ ok: true; profile: StudentProfile } | { ok: false; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: 'Accounts are not configured for this site.' };
  const minor = isMinor(value.dateOfBirth);
  const row = {
    user_id: userId,
    first_name: value.firstName,
    last_name: value.lastName,
    date_of_birth: value.dateOfBirth,
    phone: value.phone,
    city: value.city,
    occupation: value.occupation,
    source: value.source,
    parent_name: minor ? value.parentName : null,
    parent_phone: minor ? value.parentPhone : null,
    // Keep the original agreement time on an edit; stamp it on the first save.
    parent_consent_at: minor ? (existing?.parentConsentAt ?? new Date().toISOString()) : null,
  };
  try {
    const { data, error } = await sb.from('student_profiles').upsert(row, { onConflict: 'user_id' }).select('*').single();
    if (error) return { ok: false, message: error.message };
    const profile = fromRow(data as ProfileRow);
    remember(userId, profile);
    publish(userId, profile);
    return { ok: true, profile };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'The request failed.' };
  }
}

/* ---------------------------------------------------------------------- */
/* Routes                                                                  */
/* ---------------------------------------------------------------------- */

/** Routes a signed-in student may open before the profile is complete. */
export const PROFILE_EXEMPT_ROUTES = ['/profile', '/sign-in', '/sign-up', '/forgot-password', '/reset-password'];

/** Only a same-site path is ever used as a "next" destination, so a link
    cannot bounce a student to another site after sign-in. */
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || /[\r\n]/.test(next)) return fallback;
  return next;
}

/** The profile page, remembering where to go afterwards. `next` is a clean
    route without the site's base path, e.g. '/tests/mock'. */
export function profileHref(next?: string): string {
  const target = withBase('/profile');
  return next ? `${target}?next=${encodeURIComponent(safeNext(next))}` : target;
}

export function signInHref(next?: string): string {
  const target = withBase('/sign-in');
  return next ? `${target}?next=${encodeURIComponent(safeNext(next))}` : target;
}

export function signUpHref(next?: string): string {
  const target = withBase('/sign-up');
  return next ? `${target}?next=${encodeURIComponent(safeNext(next))}` : target;
}
