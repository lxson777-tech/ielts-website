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
import { withBase } from './url';
/* Only TYPES from the tutor layer: the 3.9 MB test bank and the tutor's
   schema stay out of this bundle (see "One student's work" below). */
import type { SiteQuestion, SiteTest } from './tutor/test-items';

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
  const m = /^(reading|listening)-full-(\d+)(?:-drill-(p\d+(?:-p\d+)*))?(-retake)?$/.exec(id);
  if (!m) return id;
  const [, skill, num, parts, retake] = m;
  const paper = skill === 'reading' ? 'Reading' : 'Listening';
  const unit = skill === 'reading' ? 'passage' : 'part';
  let label = `${paper} test ${Number(num)}`;
  if (parts) {
    const numbers = parts.split('-').map((p) => p.slice(1));
    label += numbers.length > 1 ? `, ${unit}s ${numbers.join(' and ')} drill` : `, ${unit} ${numbers[0]} drill`;
  }
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

/* ---------------------------------------------------------------------- */
/* One student's work: their tests question by question, and their essays. */
/* ---------------------------------------------------------------------- */

/* Read from public.admin_student_work (supabase/migrations/2026-10-05-
   admin-student-work.sql), which refuses anyone who is not an admin. The
   questions themselves come from the site's own published file per test,
   /data/tests/<id>.json (src/pages/data/tests/[id].json.ts), fetched only
   when an attempt is opened. */

/** One answered question as the test player recorded it
    (src/components/attempt-recording.ts, buildQuestionItems). */
export interface AdminWorkItem {
  /** `${paperId}:${questionId}`, e.g. "reading-full-001:q14". */
  itemId: string;
  /** What the student put. An empty string means they left it blank. */
  firstAnswer: string;
  correct: boolean;
  assistance?: string;
  subskill?: string;
}

/** One scored paper from learning_events, as admin_student_work returns it. */
export interface AdminWorkTest {
  event_id: string;
  occurred_at: string;
  activity_id: string;
  paper: 'reading' | 'listening' | null;
  mode: string;
  event: {
    at?: string;
    outcome?: { kind?: string; raw?: number; total?: number; bandEstimate?: number; secondsUsed?: number };
    items?: AdminWorkItem[];
    retryOf?: string;
  } & Record<string, unknown>;
}

export interface AdminCriterionReport {
  band?: number;
  comment?: string;
  tip?: string;
}

/** One essay, as stored in the student's progress (WritingAttempt in
    src/lib/progress.ts) with its prompt id added. */
export interface AdminWorkWriting {
  promptId: string;
  at: string;
  overallBand?: number;
  criteria?: Record<string, number>;
  wordCount?: number;
  live?: boolean;
  essay?: string;
  promptTitle?: string;
  task?: 'task1' | 'task2';
  report?: {
    criteria?: Record<string, AdminCriterionReport>;
    strengths?: string[];
    improvements?: string[];
    actionPlan?: string[];
  };
}

export interface AdminWorkSpeaking {
  at: string;
  mode?: string;
  topic?: string;
  overallBand?: number;
  criteria?: Record<string, number>;
}

export interface AdminStudentWork {
  tests: AdminWorkTest[];
  writing: AdminWorkWriting[];
  speaking: AdminWorkSpeaking[];
}

export type AdminWorkResult = { ok: true; work: AdminStudentWork } | { ok: false; message: string };

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** The database's answer, shaped. Anything missing becomes an empty list. */
export function parseStudentWork(data: unknown): AdminStudentWork {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    tests: asArray<AdminWorkTest>(record.tests).filter((t) => !!t && typeof t.activity_id === 'string'),
    writing: asArray<AdminWorkWriting>(record.writing).filter((w) => !!w && typeof w === 'object'),
    speaking: asArray<AdminWorkSpeaking>(record.speaking).filter((s) => !!s && typeof s === 'object'),
  };
}

export async function fetchStudentWork(userId: string): Promise<AdminWorkResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: 'Accounts are not configured for this site.' };
  try {
    const { data, error } = await sb.rpc('admin_student_work', { p_user: userId });
    if (error) {
      // The function not on this database yet reads as "not found".
      if (error.code === 'PGRST202' || error.code === '42883') {
        return { ok: false, message: 'Seeing a student’s answers needs one database update that has not been applied yet.' };
      }
      return { ok: false, message: error.message };
    }
    return { ok: true, work: parseStudentWork(data) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'The request failed.' };
  }
}

/** One line in the "Tests" list. */
export interface AttemptSummary {
  eventId: string;
  at: string;
  /** The paper or drill id, e.g. "reading-full-001-drill-p2". */
  testId: string;
  /** The full paper whose questions it used, e.g. "reading-full-001". */
  sourceId: string;
  title: string;
  paper: 'reading' | 'listening';
  kind: 'full' | 'drill';
  raw: number | null;
  total: number | null;
  band: number | null;
  secondsUsed: number | null;
  /** How many questions have a non-blank answer (0 for an old attempt). */
  answered: number;
  /** False for attempts recorded before answers were saved. */
  hasAnswers: boolean;
  /** A second go at a paper the student had already taken. */
  retry: boolean;
}

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** "reading-full-003-drill-p2" -> "reading-full-003"; any other id unchanged.
    The same rule as sourceTestId in src/lib/tutor/test-items.ts. */
export function sourcePaperId(id: string): string {
  return id.replace(/-drill-p\d+(?:-p\d+)*$/, '');
}

export function attemptSummary(t: AdminWorkTest): AttemptSummary {
  const testId = t.activity_id.replace(/^(test|drill):/, '');
  const outcome = t.event?.outcome ?? {};
  const items = asArray<AdminWorkItem>(t.event?.items);
  const paper = t.paper === 'listening' || testId.startsWith('listening') ? 'listening' : 'reading';
  return {
    eventId: t.event_id,
    at: typeof t.event?.at === 'string' && t.event.at ? t.event.at : t.occurred_at,
    testId,
    sourceId: sourcePaperId(testId),
    title: testLabel(testId),
    paper,
    kind: t.activity_id.startsWith('drill:') || /-drill-p\d+(?:-p\d+)*$/.test(testId) ? 'drill' : 'full',
    raw: num(outcome.raw),
    total: num(outcome.total),
    band: num(outcome.bandEstimate),
    secondsUsed: num(outcome.secondsUsed),
    answered: items.filter((i) => typeof i?.firstAnswer === 'string' && i.firstAnswer.trim() !== '').length,
    hasAnswers: items.length > 0,
    retry: typeof t.event?.retryOf === 'string' && t.event.retryOf !== '',
  };
}

/** "34 min", "1 h 5 min", or null. */
export function durationLabel(seconds: number | null): string | null {
  if (seconds === null || seconds < 0) return null;
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return 'Under a minute';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** One question of an opened attempt, ready to show. */
export interface ReviewRow {
  /** The question's number on the paper (14 for "q14"). */
  number: number | null;
  questionId: string;
  part: number | null;
  typeLabel: string | null;
  /** The question text, or null when the published file does not have it. */
  prompt: string | null;
  /** What the student put, '' when they left it blank. */
  given: string;
  blank: boolean;
  correct: boolean;
  /** The accepted answer as published, or null when unknown. */
  answer: string | null;
  /** Every accepted answer, when there is more than one ("B / D"). */
  alternatives: string[];
  explanation: string | null;
  evidence: string | null;
}

const trailingNumber = (id: string): number | null => {
  const m = /(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
};

/** The question id inside an item id: "reading-full-001:q14" -> "q14". */
export function questionIdOf(itemId: string): string {
  const at = itemId.lastIndexOf(':');
  return at >= 0 ? itemId.slice(at + 1) : itemId;
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** An attempt's answers joined to its questions, in paper order. A question
    the published file does not have still shows, with its id and the
    student's answer; the file missing altogether (`test` null) gives the
    same, for every question. */
export function reviewRows(items: readonly AdminWorkItem[], test: SiteTest | null): ReviewRow[] {
  const byId = new Map<string, { q: SiteQuestion; index: number }>();
  test?.questions.forEach((q, index) => byId.set(q.id, { q, index }));
  const rows = items
    .filter((item) => !!item && typeof item.itemId === 'string')
    .map((item, order) => {
      const questionId = questionIdOf(item.itemId);
      const found = byId.get(questionId);
      const given = typeof item.firstAnswer === 'string' ? item.firstAnswer : '';
      const answer = text(found?.q.answer);
      const alternatives = answer ? answer.split(' / ').map((a) => a.trim()).filter(Boolean) : [];
      const row: ReviewRow = {
        number: found ? found.index + 1 : trailingNumber(questionId),
        questionId,
        part: found ? found.q.part : null,
        typeLabel: text(found?.q.typeLabel),
        prompt: text(found?.q.prompt),
        given,
        blank: given.trim() === '',
        correct: item.correct === true,
        answer,
        alternatives: alternatives.length > 1 ? alternatives : [],
        explanation: text(found?.q.explanation),
        evidence: text(found?.q.evidence),
      };
      return { row, sort: found ? found.index : 10_000 + (trailingNumber(questionId) ?? order) };
    });
  rows.sort((a, b) => a.sort - b.sort);
  return rows.map((r) => r.row);
}

export type ReviewFilter = 'all' | 'wrong';

/** "Wrong only" keeps every question not marked right, blanks included. */
export function filterReview(rows: readonly ReviewRow[], filter: ReviewFilter): ReviewRow[] {
  return filter === 'wrong' ? rows.filter((r) => !r.correct) : [...rows];
}

/** The shape check isSiteTest in src/lib/tutor/test-items.ts makes, kept
    here so this bundle does not pull in the tutor's schema. */
export function looksLikeSiteTest(value: unknown): value is SiteTest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || !Array.isArray(v.questions)) return false;
  return v.questions.every((q) => {
    if (!q || typeof q !== 'object') return false;
    const r = q as Record<string, unknown>;
    return typeof r.id === 'string' && typeof r.prompt === 'string' && typeof r.answer === 'string';
  });
}

const siteTests = new Map<string, Promise<SiteTest | null>>();

/** The published questions for a paper (a drill reads its full paper's
    file), fetched once per paper and remembered for the page. Null when the
    file is not there (a build that does not publish them) or is not valid;
    a failure is not remembered, so opening the attempt again retries. */
export function loadSiteTest(testId: string, fetcher: typeof fetch = (...args) => fetch(...args)): Promise<SiteTest | null> {
  const id = sourcePaperId(testId);
  if (!/^(?:reading|listening)-full-\d{3}$/.test(id)) return Promise.resolve(null);
  const hit = siteTests.get(id);
  if (hit) return hit;
  const pending = fetcher(withBase(`/data/tests/${id}.json`))
    .then(async (res) => {
      if (!res.ok) return null;
      const body: unknown = await res.json();
      return looksLikeSiteTest(body) ? body : null;
    })
    .catch(() => null)
    .then((value) => {
      if (value === null) siteTests.delete(id);
      return value;
    });
  siteTests.set(id, pending);
  return pending;
}

const CRITERION_LABELS: Record<string, string> = {
  taskResponse: 'Task response',
  taskAchievement: 'Task achievement',
  coherenceCohesion: 'Coherence and cohesion',
  lexicalResource: 'Vocabulary',
  grammaticalRange: 'Grammar',
  fluencyCoherence: 'Fluency and coherence',
  pronunciation: 'Pronunciation',
};

/** "lexicalResource" -> "Vocabulary"; an unknown key is spaced out. */
export function criterionLabel(key: string): string {
  return CRITERION_LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export interface EssayBand {
  key: string;
  label: string;
  band: number | null;
  comment: string | null;
  tip: string | null;
}

const CRITERION_ORDER = ['taskResponse', 'taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange'];

/** Each criterion of one essay with its band and the examiner's comment, in
    the order the student's own report uses. */
export function essayBands(w: AdminWorkWriting): EssayBand[] {
  const keys = new Set<string>([...Object.keys(w.criteria ?? {}), ...Object.keys(w.report?.criteria ?? {})]);
  const rank = (k: string) => {
    const i = CRITERION_ORDER.indexOf(k);
    return i < 0 ? 99 : i;
  };
  return [...keys]
    .sort((a, b) => rank(a) - rank(b))
    .map((key) => {
      const detail = w.report?.criteria?.[key];
      return {
        key,
        label: criterionLabel(key),
        band: num(w.criteria?.[key]) ?? num(detail?.band),
        comment: text(detail?.comment),
        tip: text(detail?.tip),
      };
    });
}
