/* "Report a problem / ask a person": the route from any screen to a human.

   Alex has not published a contact yet (src/lib/operator.ts), so a person is
   reached through a form. Its messages are stored by
   supabase/migrations/2026-09-30-support.sql (LOCAL ONLY, never applied to
   production without Alex's yes) and read by Alex in /admin.

   The database repeats every rule below, so a bypassed form still cannot
   store a bad row. This file holds the site's copy of the limits
   (tests/support-sql.test.ts fails if they drift), the link builder every
   surface uses, and the calls. */

import { getSupabase } from './auth/supabase';
import { safeNext } from './auth/profile';
import { withBase } from './url';

export const SUPPORT_TOPICS = ['problem', 'question', 'account', 'other'] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export const SUPPORT_LIMITS = {
  messageMin: 10,
  messageMax: 2000,
  emailMax: 254,
  pageMax: 200,
} as const;

/** Where a link to the form was placed. Stored with the request, so Alex
    knows what the student was looking at, and used to pre-select a topic. */
export const SUPPORT_REASONS = [
  'mr-ez',
  'grader',
  'trial-ended',
  'locked',
  'plans',
  'help',
  'footer',
  'terms',
  'privacy',
] as const;
export type SupportReason = (typeof SUPPORT_REASONS)[number];

/** The topic a reason suggests. The student can always change it. */
export function topicForReason(reason: SupportReason | null): SupportTopic | null {
  switch (reason) {
    case 'mr-ez':
    case 'grader':
      return 'problem';
    case 'trial-ended':
    case 'locked':
    case 'plans':
      return 'account';
    default:
      return null;
  }
}

export function parseReason(value: string | null | undefined): SupportReason | null {
  return (SUPPORT_REASONS as readonly string[]).includes(value ?? '') ? (value as SupportReason) : null;
}

/** The page the student came from, made safe (a route on this site only)
    and short. Empty when there is none. */
export function parseFrom(value: string | null | undefined): string {
  if (!value) return '';
  const safe = safeNext(value, '');
  return safe.slice(0, SUPPORT_LIMITS.pageMax);
}

/** The form's address. `from` is a base-free route (currentRoute()); it is
    only added in the browser, at click time, by the link components. */
export function supportHref(reason?: SupportReason | null, from?: string | null): string {
  const params = new URLSearchParams();
  if (reason) params.set('reason', reason);
  const page = parseFrom(from);
  if (page) params.set('from', page);
  const query = params.toString();
  return withBase('/support') + (query ? `?${query}` : '');
}

export interface SupportInput {
  topic: SupportTopic | '';
  message: string;
  /** Required only when signed out. */
  email: string;
}

export type SupportField = 'topic' | 'message' | 'email';
export type SupportErrorCode = 'required' | 'tooShort' | 'tooLong' | 'invalidEmail';
export type SupportErrors = Partial<Record<SupportField, SupportErrorCode>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSupport(input: SupportInput, signedIn: boolean): { ok: true } | { ok: false; errors: SupportErrors } {
  const errors: SupportErrors = {};
  if (!input.topic || !(SUPPORT_TOPICS as readonly string[]).includes(input.topic)) errors.topic = 'required';
  const message = input.message.trim();
  if (!message) errors.message = 'required';
  else if (message.length < SUPPORT_LIMITS.messageMin) errors.message = 'tooShort';
  else if (message.length > SUPPORT_LIMITS.messageMax) errors.message = 'tooLong';
  const email = input.email.trim();
  if (!signedIn && !email) errors.email = 'required';
  else if (email && (email.length > SUPPORT_LIMITS.emailMax || !EMAIL_RE.test(email))) errors.email = 'invalidEmail';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

export type SupportSendFailure =
  | 'not-configured'
  | 'email-required'
  | 'email-invalid'
  | 'message-length'
  | 'rate-limited'
  | 'busy'
  | 'network';

export type SupportSendResult = { ok: true; id: string } | { ok: false; reason: SupportSendFailure };

/** Maps the database's stable refusal to a reason the form words. */
export function supportFailureFromMessage(message: string): SupportSendFailure {
  if (message.includes('support-email-required')) return 'email-required';
  if (message.includes('support-email-invalid')) return 'email-invalid';
  if (message.includes('support-message-length') || message.includes('support-topic')) return 'message-length';
  if (message.includes('support-rate-limited')) return 'rate-limited';
  if (message.includes('support-busy')) return 'busy';
  return 'network';
}

export async function sendSupportRequest(request: {
  topic: SupportTopic;
  message: string;
  email?: string | null;
  context?: SupportReason | null;
  page?: string | null;
  locale: 'en' | 'ru';
}): Promise<SupportSendResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, reason: 'not-configured' };
  try {
    const { data, error } = await sb.rpc('support_request_create', {
      p_topic: request.topic,
      p_message: request.message.trim(),
      p_email: request.email?.trim() || null,
      p_context: request.context ?? null,
      p_page: request.page || null,
      p_locale: request.locale,
    });
    if (error) return { ok: false, reason: supportFailureFromMessage(error.message ?? '') };
    const id = (data as { id?: string } | null)?.id;
    return id ? { ok: true, id } : { ok: false, reason: 'network' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/* ── Admin side (Alex's /admin page) ───────────────────────────────────── */

/** One row of support_admin_list(), exactly as the database returns it. */
export interface SupportRequestRow {
  id: string;
  created_at: string;
  topic: SupportTopic | string;
  message: string;
  context: string | null;
  page: string | null;
  locale: string;
  answered_at: string | null;
  user_id: string | null;
  /** The account's email, read by the database from auth.users. */
  account_email: string | null;
  /** The address a visitor gave. */
  contact_email: string | null;
}

export type SupportListResult = { ok: true; requests: SupportRequestRow[] } | { ok: false; message: string };

export async function listSupportRequests(): Promise<SupportListResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: 'Accounts are not configured for this site.' };
  try {
    const { data, error } = await sb.rpc('support_admin_list', { p_limit: 200 });
    if (error) return { ok: false, message: error.message };
    return { ok: true, requests: Array.isArray(data) ? (data as SupportRequestRow[]) : [] };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'The request failed.' };
  }
}

export async function markSupportRequest(id: string, answered: boolean): Promise<{ ok: true; answeredAt: string | null } | { ok: false; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: 'Accounts are not configured for this site.' };
  try {
    const { data, error } = await sb.rpc('support_admin_mark', { p_id: id, p_answered: answered });
    if (error) return { ok: false, message: error.message };
    return { ok: true, answeredAt: (data as { answeredAt?: string | null } | null)?.answeredAt ?? null };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'The request failed.' };
  }
}

/** Where to answer a request: the visitor's address, else the account's. */
export function replyAddress(row: Pick<SupportRequestRow, 'contact_email' | 'account_email'>): string | null {
  return row.contact_email || row.account_email || null;
}
