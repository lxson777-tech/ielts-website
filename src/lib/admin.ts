/* The admin panel's link to the database. Browser-only.

   Nothing here decides who is an admin. The page is a static file anyone can
   open; what protects the data is two Postgres functions
   (supabase/migrations/2026-09-24-admin.sql) that check the caller's own
   verified account against the `admins` table before answering. These
   helpers only ask, and treat every failure as "not an admin", so a missing
   function, a signed-out visitor or a network error all end at the same
   quiet "not available" screen rather than a broken page. */

import { getSupabase } from './auth/supabase';
import { ageOn, isMinor, type ProfileSource } from './auth/profile';

export interface AdminRecentItem {
  at: string | null;
  kind: 'test' | 'writing' | 'speaking';
  /** A test id, an essay prompt title, or a speaking topic. */
  item: string;
  band: number | null;
  /** 'full' | 'drill' for a test, 'task1' | 'task2' for writing, 'part1..3' for speaking. */
  detail: string;
}

/** One row of admin_list_users(), exactly as the database returns it. */
export interface AdminUserRow {
  user_id: string;
  email: string | null;
  provider: string;
  email_confirmed: boolean;
  is_admin: boolean;
  joined_at: string;
  last_sign_in_at: string | null;
  last_synced_at: string | null;
  /** yyyy-mm-dd in the student's own calendar, from their activity log. */
  last_active_day: string | null;
  active_days: number;
  minutes_studied: number;
  lessons_done: number;
  tests_taken: number;
  best_reading: number | null;
  best_listening: number | null;
  writing_count: number;
  best_writing: number | null;
  speaking_count: number;
  best_speaking: number | null;
  target_band: string | null;
  test_date: string | null;
  daily_minutes: number | null;
  /** True when the student set their plan up themselves rather than keeping the default. */
  plan_chosen: boolean;
  tutor_messages: number;
  examiner_sessions: number;
  recent: AdminRecentItem[];
  /* The student profile (supabase/migrations/2026-09-24-profiles.sql). Every
     one of these is null until the student fills the profile in. */
  first_name: string | null;
  last_name: string | null;
  /** yyyy-mm-dd, a calendar day with no time zone. */
  date_of_birth: string | null;
  /** Digits with an optional leading plus, as stored. */
  phone: string | null;
  city: string | null;
  /** School, university or job, free text. */
  occupation: string | null;
  /** How they found us. Typed as a plain string too, so a value added to the
      database later still shows rather than breaking the page. */
  source: ProfileSource | string | null;
  parent_name: string | null;
  parent_phone: string | null;
  /** When the "a parent agrees" box was ticked. */
  parent_consent_at: string | null;
  profile_updated_at: string | null;
}

/** Whether the signed-in account is an admin. False for anyone signed out,
    and false on any error: the page never guesses in the owner's favour. */
export async function checkIsAdmin(): Promise<boolean> {
  return (await askIsAdmin()) === true;
}

/** The database's answer, or null when there was no answer (signed out,
    offline, the function not deployed yet). */
async function askIsAdmin(): Promise<boolean | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.rpc('is_admin');
    return error ? null : data === true;
  } catch {
    return null;
  }
}

/** checkIsAdmin() for the account menu, remembered for the browser tab so
    the menu does not ask the database again on every page. Only decides
    whether a LINK is shown; the admin page itself always asks afresh. */
export async function isAdminCached(userId: string): Promise<boolean> {
  const key = `ielts.admin.v1:${userId}`;
  try {
    const hit = sessionStorage.getItem(key);
    if (hit === '1' || hit === '0') return hit === '1';
  } catch {
    /* Storage blocked: just ask. */
  }
  const answer = await askIsAdmin();
  // Only a real answer is remembered; a failed request is asked again on the
  // next page rather than hiding the link for the rest of the session.
  if (answer !== null) {
    try {
      sessionStorage.setItem(key, answer ? '1' : '0');
    } catch {
      /* Not remembering it is fine. */
    }
  }
  return answer === true;
}

export type AdminListResult = { ok: true; users: AdminUserRow[] } | { ok: false; message: string };

export async function listAllUsers(): Promise<AdminListResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: 'Accounts are not configured for this site.' };
  try {
    const { data, error } = await sb.rpc('admin_list_users');
    if (error) return { ok: false, message: error.message };
    return { ok: true, users: (data ?? []) as AdminUserRow[] };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'The request failed.' };
  }
}

/** A readable name for a practice test id, without loading the 3.9 MB test
    bank: "reading-full-001-drill-p2-retake" -> "Reading test 1, passage 2
    drill (retake)". Unknown shapes come back as the raw id. */
export function testLabel(id: string): string {
  const m = /^(reading|listening)-full-(\d+)(?:-drill-p(\d+))?(-retake)?$/.exec(id);
  if (!m) return id;
  const [, skill, num, part, retake] = m;
  const paper = skill === 'reading' ? 'Reading' : 'Listening';
  const unit = skill === 'reading' ? 'passage' : 'part';
  let label = `${paper} test ${Number(num)}`;
  if (part) label += `, ${unit} ${part} drill`;
  if (retake) label += ' (retake)';
  return label;
}

/** The latest sign of life we have for a student: the later of their last
    study day and their last sync with the server. */
export function lastSeen(u: AdminUserRow): string | null {
  const candidates = [u.last_synced_at, u.last_sign_in_at, u.last_active_day ? `${u.last_active_day}T12:00:00` : null].filter(
    (v): v is string => !!v,
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (new Date(a).getTime() >= new Date(b).getTime() ? a : b));
}

/* ---------------------------------------------------------------------- */
/* The student profile, as the panel shows it. Pure, unit tested.          */
/* ---------------------------------------------------------------------- */

type ProfileFields = Pick<AdminUserRow, 'first_name' | 'last_name' | 'date_of_birth' | 'profile_updated_at'>;

/** Whether the student has filled the profile in. The database stores the
    profile whole (every required column is not null), so one saved row is
    enough to count. */
export function hasProfile(row: Pick<AdminUserRow, 'first_name' | 'profile_updated_at'>): boolean {
  return !!(row.profile_updated_at || row.first_name?.trim());
}

/** "First Last", or null when the student has not given a name. */
export function fullName(row: Pick<AdminUserRow, 'first_name' | 'last_name'>): string | null {
  const name = [row.first_name, row.last_name]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return name || null;
}

/** Whole years on `now`, or null with no (or no real) date of birth. */
export function ageOf(row: Pick<ProfileFields, 'date_of_birth'>, now: Date = new Date()): number | null {
  return row.date_of_birth ? ageOn(row.date_of_birth, now) : null;
}

/** Under 18 on `now`. False when the date of birth is unknown. */
export function isUnder18(row: Pick<ProfileFields, 'date_of_birth'>, now: Date = new Date()): boolean {
  return !!row.date_of_birth && isMinor(row.date_of_birth, now);
}

const SOURCE_LABELS: Record<ProfileSource, string> = {
  friend: 'Friend',
  instagram: 'Instagram',
  centre: 'The teaching centre',
  other: 'Other',
};

/** How the student found us, in words. A value the panel does not know yet
    is shown as stored rather than hidden; nothing at all gives null. */
export function sourceLabel(source: string | null | undefined): string | null {
  if (!source) return null;
  return (SOURCE_LABELS as Record<string, string>)[source] ?? source;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "12 May 2009". A bare yyyy-mm-dd is read as the calendar day it names, so
    no time zone can move a birthday; a full timestamp is shown as the day it
    was on this computer's clock. */
export function longDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (day) {
    const month = MONTHS[Number(day[2]) - 1];
    return month ? `${Number(day[3])} ${month} ${day[1]}` : value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** A stored phone made easy to read: Kazakh and Russian numbers (+7 and ten
    digits) as "+7 777 123 45 67"; anything else as stored. */
export function phoneLabel(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const kz = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return kz ? `+7 ${kz[1]} ${kz[2]} ${kz[3]} ${kz[4]}` : phone;
}

/** Whether a student matches the search box: their name, email, phone or
    city. A query with digits also matches the phone however it was typed
    ("777 123", "+7 (777) 123"). */
export function matchesSearch(
  row: Pick<AdminUserRow, 'first_name' | 'last_name' | 'email' | 'phone' | 'city'>,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = [fullName(row), row.email, row.phone, row.city].map((v) => (v ?? '').toLowerCase());
  if (text.some((v) => v.includes(q))) return true;
  const digits = q.replace(/[^0-9]/g, '');
  // Only a query that is a phone number in the making: digits and the
  // punctuation people type around them, at least three digits long.
  if (digits.length >= 3 && /^[+0-9\s()-]+$/.test(q) && row.phone) {
    return row.phone.replace(/[^0-9]/g, '').includes(digits);
  }
  return false;
}
