/* The admin panel's access tools: who has paid or complimentary access, and
   Alex's "Give free access (30 days)", "Renew" and "Stop" for one account
   (docs/paid-access/FREE-ACCOUNT-MODEL.md, Builder G).

   Nothing here decides anything. The three database functions it calls
   (supabase/migrations/2026-10-01-free-account.sql: access_admin_overview,
   access_admin_grants, access_admin_complimentary) check the caller's own
   verified sign-in against public.admins and refuse everyone else, so a
   student who opened this page and pressed the buttons would be refused by
   the database itself. The pure helpers below only turn the database's
   answers into the panel's words, and are unit tested. English only, like
   the rest of the admin panel. */

import { getSupabase } from '../../lib/auth/supabase';

export type AdminTier = 'free' | 'paid' | 'complimentary' | 'paid-ended';
export type GrantKind = 'paid' | 'complimentary';
export type ComplimentaryAction = 'give' | 'renew' | 'stop';

/** One row of access_admin_overview(). */
export interface AccessOverview {
  userId: string;
  tier: AdminTier;
  kind: GrantKind | null;
  endsAt: string | null;
}

export interface GrantUse {
  writing: number;
  speaking: number;
  live: number;
  mock: number;
}

/** One grant from access_admin_grants(). */
export interface AdminGrant {
  id: string;
  kind: GrantKind;
  planId: string | null;
  orderId: string | null;
  startsAt: string;
  endsAt: string;
  revokedAt: string | null;
  stoppedAt: string | null;
  grantedBy: string | null;
  grantedByEmail: string | null;
  note: string | null;
  running: boolean;
  used: GrantUse;
  limits: GrantUse;
}

/** access_admin_grants() for one account. */
export interface AccountAccess {
  userId: string;
  tier: AdminTier;
  profileComplete: boolean;
  placementUsed: boolean;
  grants: AdminGrant[];
}

export type AdminResult<T> = { ok: true; value: T } | { ok: false; message: string };

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<AdminResult<T>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: 'Accounts are not configured for this site.' };
  try {
    const { data, error } = await sb.rpc(fn, args);
    if (error) return { ok: false, message: error.message };
    return { ok: true, value: data as T };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'The request failed.' };
  }
}

/** Every account's access at a glance, keyed by user id. */
export async function loadAccessOverview(): Promise<AdminResult<Map<string, AccessOverview>>> {
  const result = await call<AccessOverview[]>('access_admin_overview');
  if (!result.ok) return result;
  return { ok: true, value: new Map((result.value ?? []).map((row) => [row.userId, row])) };
}

export async function loadAccountAccess(userId: string): Promise<AdminResult<AccountAccess>> {
  return call<AccountAccess>('access_admin_grants', { p_user: userId });
}

/** The database's answer to give, renew or stop. */
export type ComplimentaryAnswer =
  | { ok: true; action: ComplimentaryAction; status: AccountAccess; grant?: { startsAt: string; endsAt: string }; stopped?: number }
  | { ok: false; reason: string };

export async function changeComplimentary(userId: string, action: ComplimentaryAction, note?: string): Promise<AdminResult<ComplimentaryAnswer>> {
  return call<ComplimentaryAnswer>('access_admin_complimentary', { p_user: userId, p_action: action, p_note: note?.trim() || null });
}

/* ── Pure: what the panel says ─────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "3 Nov 2026", on this computer's clock. */
export function dayLabel(iso: string | null | undefined): string {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** The short tag for a student's row, or null for a free account (most of
    them, so the list stays quiet). */
export function accessTag(row: AccessOverview | undefined): { text: string; tone: 'paid' | 'gift' | 'ended' } | null {
  if (!row) return null;
  if (row.tier === 'paid') return { text: `Paid until ${dayLabel(row.endsAt)}`, tone: 'paid' };
  if (row.tier === 'complimentary') return { text: `Free access until ${dayLabel(row.endsAt)}`, tone: 'gift' };
  if (row.tier === 'paid-ended') return { text: row.kind === 'complimentary' ? 'Free access ended' : 'Paid access ended', tone: 'ended' };
  return null;
}

/** One line on what the account can do right now. */
export function tierSentence(access: AccountAccess): string {
  switch (access.tier) {
    case 'paid':
      return 'Paid access: lessons, practice, tests and guidance.';
    case 'complimentary':
      return 'Free access from you: everything a paid student has, with the same allowances.';
    case 'paid-ended':
      return 'Access has ended. Lessons only, and every saved result stays.';
    default:
      return access.profileComplete ? 'Free account: every lesson, no practice or guidance.' : 'Free account. Lessons open once the student completes their profile.';
  }
}

/** The grant that matters now: the running one, else the next one waiting,
    else the most recent. */
export function currentGrant(grants: AdminGrant[], nowMs: number = Date.now()): AdminGrant | null {
  const live = grants.filter((g) => !g.revokedAt);
  const running = live.find((g) => g.running);
  if (running) return running;
  const waiting = live.filter((g) => Date.parse(g.startsAt) > nowMs).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  if (waiting[0]) return waiting[0];
  return [...grants].sort((a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt))[0] ?? null;
}

export function kindLabel(kind: GrantKind): string {
  return kind === 'complimentary' ? 'Free access (given by you)' : 'Paid';
}

/** Allowance lines for one grant, as "used of limit". */
export function allowanceLines(grant: AdminGrant): { label: string; used: number; limit: number }[] {
  return [
    { label: 'Essay checks', used: grant.used.writing, limit: grant.limits.writing },
    { label: 'Recorded Speaking checks', used: grant.used.speaking, limit: grant.limits.speaking },
    { label: 'Live practice interviews', used: grant.used.live, limit: grant.limits.live },
    { label: 'Mock exam interviews', used: grant.used.mock, limit: grant.limits.mock },
  ];
}

/** Complimentary periods running or waiting, which is what the buttons
    depend on. Mirrors the database's own rules (it decides again). */
export function complimentaryAhead(grants: AdminGrant[], nowMs: number = Date.now()): number {
  return grants.filter((g) => g.kind === 'complimentary' && !g.revokedAt && Date.parse(g.endsAt) > nowMs).length;
}

/** Which of the three buttons make sense now. The database refuses the
    others anyway; this only keeps the panel from offering them. */
export function availableActions(access: AccountAccess, nowMs: number = Date.now()): Record<ComplimentaryAction, boolean> {
  const ahead = complimentaryAhead(access.grants, nowMs);
  const everGiven = access.grants.some((g) => g.kind === 'complimentary');
  return { give: ahead === 0, renew: everGiven && ahead < 3, stop: ahead > 0 };
}

/** The database's refusal reasons, in words. */
export function refusalText(reason: string): string {
  switch (reason) {
    case 'already-given':
      return 'This student already has free access. Use Renew to add another 30 days.';
    case 'not-given':
      return 'There is nothing to renew yet. Give free access first.';
    case 'too-far-ahead':
      return 'Three free periods are already running or waiting. Renew again after one ends.';
    case 'nothing-to-stop':
      return 'There is no free access to stop.';
    case 'no-account':
      return 'That account no longer exists.';
    default:
      return 'The change was refused.';
  }
}

/** What happened, in one line, after a change succeeded. */
export function changeSummary(answer: Extract<ComplimentaryAnswer, { ok: true }>): string {
  if (answer.action === 'stop') return 'Free access stopped. The student is back to lessons only.';
  const until = answer.grant ? dayLabel(answer.grant.endsAt) : 'Unknown';
  const from = answer.grant ? dayLabel(answer.grant.startsAt) : 'Unknown';
  if (answer.action === 'renew') return `Renewed: another 30 days, from ${from} until ${until}.`;
  return answer.grant && Date.parse(answer.grant.startsAt) > Date.now() + 60_000
    ? `Free access given: 30 days from ${from}, after the access already running, until ${until}.`
    : `Free access given until ${until}.`;
}
