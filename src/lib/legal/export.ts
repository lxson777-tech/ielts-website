/* "Download my data" (2 October 2026; Personal Data Law Art. 24: a student
   may have their own data, free of charge). One JSON file with everything
   the account holds, read with the student's OWN session, plus what this
   browser keeps for them.

   What is read, and why it can only ever be the student's own:
   - every table that holds a student's rows and has a "select own" policy
     (supabase/schema.sql and supabase/migrations/), filtered by their user
     id. Row security repeats the filter in the database, so another
     student's rows cannot come back whatever the browser asks;
   - their support messages, through support_my_requests() (supabase/
     migrations/2026-10-02-support-retention.sql), because the table itself
     is closed to everyone but an admin;
   - the browser's own storage: the site's items (named "ielts.") that are
     this account's (they carry its id) or belong to no account (work done
     here while signed out). Another account's items on a shared computer,
     and the sign-in itself (a live token), are left out.

   A table or function this database does not have yet (the live site has
   not applied every migration) is skipped and named in the file, never an
   error. Records the browser cannot read at all (usage and timing records
   kept for spending limits) are listed under notIncluded with what they
   hold, so the file never pretends to be more complete than it is.

   The pure parts (what goes in, how the file is laid out) are tested in
   tests/legal-export.test.ts; the reading and saving need a browser. */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { nt } from '../i18n/translate';
import { CONSENT_VERSION } from './consent';

/** The tables read for the student, with a plain description written into
    the file. Each is filtered by user_id. */
export const EXPORT_TABLES: { table: string; description: string }[] = [
  { table: 'student_profiles', description: nt('Your details from the profile form.') },
  { table: 'user_state', description: nt('Your saved progress and study plan.') },
  { table: 'learning_events', description: nt('A record of what you studied and when.') },
  { table: 'learning_plan', description: nt('Your personal study plan.') },
  { table: 'learning_companions', description: nt('Your saved words, notes and study preferences.') },
  { table: 'mr_ez_conversations', description: nt('Your conversations with Mr EZ.') },
  { table: 'mr_ez_messages', description: nt('The messages in those conversations.') },
  { table: 'mr_ez_recommendations', description: nt('The latest next step Mr EZ suggested.') },
  { table: 'mr_ez_notes', description: nt('Weekly reviews and unit notes from Mr EZ.') },
  { table: 'trial_accounts', description: nt('Your trial, if you had one.') },
  { table: 'trial_usage', description: nt('What you used during the trial.') },
  { table: 'assessment_usage', description: nt('Each AI assessment counted against your access.') },
  { table: 'access_grants', description: nt('Your periods of access.') },
  { table: 'payment_orders', description: nt('Your purchases and receipts.') },
];

/** Kept for the student but closed to the browser by design (no "select
    own" policy). Named in the file so nothing is silently missing. */
export const NOT_READABLE: { table: string; description: string }[] = [
  {
    table: 'mr_ez_turns',
    description: nt('A usage record for each Mr EZ reply (the AI model, its size and cost), used for spending limits.'),
  },
  {
    table: 'live_examiner_sessions',
    description: nt('When each live Speaking interview started and ended, used for the daily limits. Your voice is never stored.'),
  },
  {
    table: 'assessment_provider_usage',
    description: nt('The AI service’s usage figures for each assessment. Never your essay, your audio or the reply.'),
  },
];

export const EXPORT_FORMAT = 'ielts-is-ez-export/1';
const PAGE = 1000;
const MAX_PAGES = 50;

/** True for an answer that means "this database does not have that table
    or function", which is skipped, not reported as a failure. */
export function isMissingError(error: { code?: string | null; message?: string | null } | null | undefined, status?: number): boolean {
  if (status === 404) return true;
  if (!error) return false;
  const code = String(error.code ?? '');
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01' || code === '42883') return true;
  const message = String(error.message ?? '').toLowerCase();
  return message.includes('could not find the table') || message.includes('could not find the function') || message.includes('does not exist');
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Whether one browser-storage item belongs in this student's file. */
export function belongsToStudent(key: string, userId: string): boolean {
  if (!key.startsWith('ielts.')) return false;
  const ids = key.match(UUID) ?? [];
  if (ids.length === 0) return true; // this device's own, signed-out work
  return ids.every((id) => id.toLowerCase() === userId.toLowerCase());
}

/** Something shaped like localStorage. */
export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
}

/** This browser's items for the student, values parsed where they are JSON. */
export function browserItems(store: StorageLike | null | undefined, userId: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!store) return out;
  try {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && belongsToStudent(key, userId)) keys.push(key);
    }
    for (const key of keys.sort()) {
      const raw = store.getItem(key);
      if (raw === null) continue;
      try {
        out[key] = JSON.parse(raw);
      } catch {
        out[key] = raw;
      }
    }
  } catch {
    /* Storage blocked: nothing kept there either. */
  }
  return out;
}

export interface TableResult {
  table: string;
  status: 'ok' | 'missing' | 'failed';
  rows: unknown[];
}

export interface ExportInput {
  user: Pick<User, 'id' | 'email' | 'created_at' | 'last_sign_in_at' | 'app_metadata' | 'user_metadata'>;
  tables: TableResult[];
  supportMessages: { status: 'ok' | 'missing' | 'failed'; rows: unknown[] };
  localStorage: Record<string, unknown>;
  sessionStorage: Record<string, unknown>;
  now: Date;
  /** Translates a description into the student's language. */
  translate: (text: string) => string;
}

/** The file's contents. */
export function buildExport(input: ExportInput) {
  const tr = input.translate;
  const described = new Map(EXPORT_TABLES.map((t) => [t.table, t.description]));
  const database: Record<string, { description: string; rows: unknown[] }> = {};
  const skipped: string[] = [];
  const failed: string[] = [];
  for (const result of input.tables) {
    if (result.status === 'missing') skipped.push(result.table);
    else if (result.status === 'failed') failed.push(result.table);
    else database[result.table] = { description: tr(described.get(result.table) ?? ''), rows: result.rows };
  }
  if (input.supportMessages.status === 'ok') {
    database.support_requests = { description: tr('The messages you sent us through the support form.'), rows: input.supportMessages.rows };
  } else if (input.supportMessages.status === 'missing') skipped.push('support_requests');
  else failed.push('support_requests');

  const providers = input.user.app_metadata?.providers;
  return {
    format: EXPORT_FORMAT,
    about: tr('Everything your IELTS is EZ account holds, and what this browser keeps for you, as read when you downloaded this file.'),
    exportedAt: input.now.toISOString(),
    consentVersionShownToday: CONSENT_VERSION,
    account: {
      id: input.user.id,
      email: input.user.email ?? null,
      createdAt: input.user.created_at ?? null,
      lastSignInAt: input.user.last_sign_in_at ?? null,
      signInMethods: Array.isArray(providers) ? providers : [],
      // Includes the consent record (consent_version, consent_at) and, for a
      // student under 18, the parent's declaration.
      metadata: input.user.user_metadata ?? {},
    },
    database,
    notIncluded: NOT_READABLE.map((n) => ({
      table: n.table,
      description: tr(n.description),
      why: tr('Kept for spending limits and not readable from your browser. Ask us for a copy if you need it.'),
    })),
    ...(skipped.length > 0 ? { notOnThisSite: skipped } : {}),
    ...(failed.length > 0 ? { couldNotBeRead: failed } : {}),
    thisBrowser: {
      note: tr('Kept only on this device. Other devices may hold different items.'),
      localStorage: input.localStorage,
      sessionStorage: input.sessionStorage,
    },
  };
}

export type ExportFile = ReturnType<typeof buildExport>;

/** "ielts-is-ez-my-data-2026-10-02.json" */
export function exportFileName(now: Date): string {
  return `ielts-is-ez-my-data-${now.toISOString().slice(0, 10)}.json`;
}

/* ── Reading (needs a session) ────────────────────────────────────────── */

async function readTable(sb: SupabaseClient, table: string, userId: string): Promise<TableResult> {
  const rows: unknown[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const { data, error, status } = await sb.from(table).select('*').eq('user_id', userId).range(from, from + PAGE - 1);
    if (error || !Array.isArray(data)) {
      if (isMissingError(error, status)) return { table, status: 'missing', rows: [] };
      return { table, status: 'failed', rows: [] };
    }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return { table, status: 'ok', rows };
}

/** Reads everything for the signed-in student. Never throws for one table. */
export async function collectAccountData(sb: SupabaseClient, userId: string): Promise<Pick<ExportInput, 'tables' | 'supportMessages'>> {
  const tables = await Promise.all(
    EXPORT_TABLES.map((t) => readTable(sb, t.table, userId).catch((): TableResult => ({ table: t.table, status: 'failed', rows: [] }))),
  );
  let supportMessages: ExportInput['supportMessages'];
  try {
    const { data, error, status } = await sb.rpc('support_my_requests');
    if (error) supportMessages = { status: isMissingError(error, status) ? 'missing' : 'failed', rows: [] };
    else supportMessages = { status: 'ok', rows: Array.isArray(data) ? data : [] };
  } catch {
    supportMessages = { status: 'failed', rows: [] };
  }
  return { tables, supportMessages };
}

/** Builds the file for this student and hands it to the browser to save.
    Returns how many parts could not be read (0 when everything was). */
export async function downloadMyData(sb: SupabaseClient, user: User, translate: (text: string) => string): Promise<{ failed: number }> {
  const now = new Date();
  const read = await collectAccountData(sb, user.id);
  const file = buildExport({
    user,
    ...read,
    localStorage: browserItems(globalThis.localStorage, user.id),
    sessionStorage: browserItems(globalThis.sessionStorage, user.id),
    now,
    translate,
  });
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(now);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { failed: file.couldNotBeRead?.length ?? 0 };
}
