/* The admin panel's link to the database. Browser-only.

   Nothing here decides who is an admin. The page is a static file anyone can
   open; what protects the data is two Postgres functions
   (supabase/migrations/2026-09-24-admin.sql) that check the caller's own
   verified account against the `admins` table before answering. These
   helpers only ask, and treat every failure as "not an admin", so a missing
   function, a signed-out visitor or a network error all end at the same
   quiet "not available" screen rather than a broken page. */

import { getSupabase } from './auth/supabase';

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
