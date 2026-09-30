/* The support form's rules, with no browser and no Supabase client in them.

   SHARED by the site (src/lib/support.ts re-exports everything here) and the
   support Worker (workers/support), which checks a signed-out visitor's
   request before it spends anything on it. The database
   (supabase/migrations/2026-09-30-support.sql) repeats every rule, so this
   file only saves a round trip; tests/support-sql.test.ts fails if the
   numbers drift. */

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

export const SUPPORT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isSupportTopic(value: unknown): value is SupportTopic {
  return typeof value === 'string' && (SUPPORT_TOPICS as readonly string[]).includes(value);
}

/** True for an address the database will accept (shape and length only;
    nothing proves the sender owns it). */
export function isSupportEmail(value: string): boolean {
  return value.length <= SUPPORT_LIMITS.emailMax && SUPPORT_EMAIL_RE.test(value);
}
