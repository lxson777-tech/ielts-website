/* Where the consent tick is kept (browser only). The rules and wording are
   in ./consent.ts; this file only moves the record to the account.

   - Email sign-up: the record rides on the sign-up call itself
     (signUpWithPassword's `data`), so the account never exists without it.
   - Google sign-in: the browser leaves for Google and comes back, so the
     tick is kept in THIS TAB's sessionStorage (never localStorage, never
     shared with another tab) and written to the account's metadata with
     supabase.auth.updateUser({ data }) once the student is signed in. The
     profile page, where every new account lands, does that write.
   - Any account that still has no current consent (a Google account made
     from the sign-in page, or one made before 2 October 2026) is asked on
     the profile form, and the tick is written the same way. */

import type { User } from '@supabase/supabase-js';
import { getSupabase } from '../auth/supabase';
import { t } from '../i18n/translate';
import { hasCurrentConsent, parsePendingConsent, type ConsentRecord, type ParentConsentRecord } from './consent';

export const PENDING_CONSENT_KEY = 'ielts.consent.pending.v1';

/** Keep a tick given just before the Google redirect. */
export function rememberPendingConsent(record: ConsentRecord): void {
  try {
    window.sessionStorage.setItem(PENDING_CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* Storage blocked: the profile form asks for the tick again instead. */
  }
}

export function readPendingConsent(now = new Date()): ConsentRecord | null {
  try {
    return parsePendingConsent(window.sessionStorage.getItem(PENDING_CONSENT_KEY), now);
  } catch {
    return null;
  }
}

export function clearPendingConsent(): void {
  try {
    window.sessionStorage.removeItem(PENDING_CONSENT_KEY);
  } catch {
    /* nothing kept */
  }
}

/** Write a consent record (or a parent's declaration) into the signed-in
    account's metadata. Supabase merges it with what is already there. */
export async function saveConsentToAccount(record: Partial<ConsentRecord & ParentConsentRecord>): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: t('Accounts are not configured for this site yet.') };
  const { error } = await sb.auth.updateUser({ data: { ...record } });
  return error ? { error: error.message } : {};
}

/** After a Google sign-in: move a pending tick onto the account, unless the
    account already holds the current consent. True when the account holds
    it afterwards. Never throws. */
export async function syncPendingConsent(user: User): Promise<boolean> {
  if (hasCurrentConsent(user.user_metadata)) {
    clearPendingConsent();
    return true;
  }
  const pending = readPendingConsent();
  if (!pending) return false;
  try {
    const result = await saveConsentToAccount(pending);
    if (result.error) return false;
    clearPendingConsent();
    return true;
  } catch {
    return false;
  }
}
