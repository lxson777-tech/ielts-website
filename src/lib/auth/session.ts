/* Thin auth helpers over the Supabase client. Every function no-ops safely when
   accounts aren't configured (getSupabase() → null), so callers never have to
   branch on configuration. Sign-in is email + password or Google; the
   one-time email link was removed on 24 September 2026. The pages that call
   these live in src/components/auth/. The password itself never touches our
   own code: every call here hands it straight to supabase-js, which posts it
   directly to Supabase's auth API.

   None of these decide whose work is on this device. A successful call
   changes the session, supabase-js announces it, and the app-wide lifecycle
   (src/lib/auth/lifecycle.ts) reacts exactly as it always has. */

import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { t } from '../i18n/translate';
import { ACCESS_MODE } from '../trial/mode';

/** Which sign-in methods the Supabase project actually has enabled, so the UI
    can hide a provider button that would just error (e.g. Google before it's
    configured in the dashboard). Falls back to email-only if the check fails. */
export async function getEnabledProviders(): Promise<{ email: boolean; google: boolean }> {
  const url = import.meta.env?.PUBLIC_SUPABASE_URL as string | undefined;
  const key = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return { email: false, google: false };
  try {
    const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!r.ok) return { email: true, google: false };
    const s = (await r.json()) as { external?: { email?: boolean; google?: boolean } };
    return { email: !!s.external?.email, google: !!s.external?.google };
  } catch {
    return { email: true, google: false };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

/** The current Supabase access token, for sending as `Authorization: Bearer
    <token>` to a Worker that verifies the student server-side (e.g. the
    live examiner's paid OpenAI path). Null when there's no active session,
    or when accounts aren't configured at all. */
export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

/** The bot check's one-time answer, added to a call's options only when
    there is one. With PUBLIC_TURNSTILE_SITE_KEY unset (local development)
    the forms render no widget and send no token, so the call is exactly
    what it was before the check existed. */
function withCaptcha<T extends object>(options: T, captchaToken?: string | null): T & { captchaToken?: string } {
  return captchaToken ? { ...options, captchaToken } : options;
}

/** Standard email + password sign-in (the /sign-in page). */
export async function signInWithPassword(
  email: string,
  password: string,
  captchaToken?: string | null,
): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: t('Accounts are not configured for this site yet.') };
  const { error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password,
    options: withCaptcha({}, captchaToken),
  });
  return error ? { error: error.message } : {};
}

/** Create a new account with a password (the /sign-up page).
    `emailRedirectTo` is where the confirmation link lands the student: the
    profile page, so a new account gives its details first. Returns
    `needsConfirmation: true` when Supabase created the user but withheld a
    session pending that email click. `metadata` is stored as the new
    account's user metadata: the consent record given on the sign-up form
    (src/lib/legal/consent.ts), so the account never exists without it. */
export async function signUpWithPassword(
  email: string,
  password: string,
  emailRedirectTo: string,
  captchaToken?: string | null,
  metadata?: Record<string, string>,
): Promise<{ error?: string; needsConfirmation?: boolean }> {
  const sb = getSupabase();
  if (!sb) return { error: t('Accounts are not configured for this site yet.') };
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: withCaptcha({ emailRedirectTo, ...(metadata ? { data: metadata } : {}) }, captchaToken),
  });
  if (error) return { error: error.message };
  // A confirmed session comes back immediately if email confirmation is off;
  // otherwise Supabase returns a user with no session until they click the link.
  return { needsConfirmation: !data.session };
}

/** Email a password-reset link. `redirectTo` should point at the page that
    calls updatePassword() once the student lands back with a recovery
    session (see /reset-password). */
export async function sendPasswordReset(
  email: string,
  redirectTo: string,
  captchaToken?: string | null,
): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: t('Accounts are not configured for this site yet.') };
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), withCaptcha({ redirectTo }, captchaToken));
  return error ? { error: error.message } : {};
}

/** Sets a new password on the currently-active session: the /reset-password
    landing page (where clicking the emailed link has already given the
    browser a temporary "recovery" session) and "Change password" on
    /account. */
export async function updatePassword(password: string): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: t('Accounts are not configured for this site yet.') };
  const { error } = await sb.auth.updateUser({ password });
  return error ? { error: error.message } : {};
}

/** Ask to move the account to a new email address. Supabase emails a
    confirmation link to the new address (and, with "secure email change"
    on in the dashboard, to the old one as well); nothing changes until it
    is opened. `redirectTo` is where that link lands the student. */
export async function updateEmail(newEmail: string, redirectTo: string): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: t('Accounts are not configured for this site yet.') };
  const { error } = await sb.auth.updateUser({ email: newEmail.trim() }, { emailRedirectTo: redirectTo });
  return error ? { error: error.message } : {};
}

export async function signInWithGoogle(redirectTo: string): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: t('Accounts are not configured for this site yet.') };
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  return error ? { error: error.message } : {};
}

/** Sign out of THIS device. The session here is ended on Supabase's side too
    (its refresh token is revoked), so a shared computer is left signed out
    for good; the student's other devices stay signed in. Spelled out as
    'local' since 24 September 2026: supabase-js's own default is 'global',
    which quietly signed a student out everywhere from the menu. That is now
    its own, explicit action (signOutEverywhere, on /account). */
export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut({ scope: 'local' });
}

/** Sign this account out on every device. Supabase revokes every session
    the account holds, then this browser signs out exactly as signOut()
    does, so the lifecycle hears the same SIGNED_OUT event. */
export async function signOutEverywhere(): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: t('Accounts are not configured for this site yet.') };
  const { error } = await sb.auth.signOut({ scope: 'global' });
  return error ? { error: error.message } : {};
}

/** Whether this build offers "Delete my account" (2 October 2026). The
    database function it calls, delete_my_account(), comes with
    supabase/migrations/2026-10-02-account-deletion.sql: on in the gated
    build, which ships with every migration; on the open build (the live
    site) once PUBLIC_ACCOUNT_DELETION=1 is set after that migration is
    applied to production. */
export const ACCOUNT_DELETION_ENABLED: boolean =
  ACCESS_MODE === 'trial' || String(import.meta.env?.PUBLIC_ACCOUNT_DELETION ?? '').trim() === '1';

/** Delete the signed-in student's account and everything in it, at once
    (Alex, 2 October 2026). The database removes the sign-in and, with it,
    every row of the student's data; a purchase stays only as an anonymous
    sale for tax. Then this browser forgets the student too: every stored
    item named with their account id, and the sign-in itself. Work done on
    this device while signed out belongs to no account and is left. */
export async function deleteMyAccount(): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: t('Accounts are not configured for this site yet.') };
  const { data } = await sb.auth.getSession();
  const userId = data.session?.user.id ?? null;
  if (!userId) return { error: t('Sign in to delete your account.') };
  const { error } = await sb.rpc('delete_my_account');
  if (error) return { error: error.message };
  forgetAccountOnThisDevice(userId);
  await sb.auth.signOut({ scope: 'local' });
  return {};
}

/** Remove every browser-stored item that belongs to this account: the keys
    the stores write per account (`...::u:<id>`, `ielts.profile.v1:<id>`,
    `ielts.admin.v1:<id>` and the like all contain the id). */
export function forgetAccountOnThisDevice(userId: string): void {
  for (const store of [globalThis.localStorage, globalThis.sessionStorage]) {
    try {
      if (!store) continue;
      const doomed: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && key.includes(userId)) doomed.push(key);
      }
      for (const key of doomed) store.removeItem(key);
    } catch {
      /* Storage blocked or unavailable: nothing was kept there either. */
    }
  }
}

/** Subscribe to auth changes (sign-in, sign-out, token refresh). Fires once
    with the current user on subscribe. Returns an unsubscribe function. */
export function onAuthChange(cb: (user: User | null) => void): () => void {
  const sb = getSupabase();
  if (!sb) {
    cb(null);
    return () => {};
  }
  // Emit the current state immediately so consumers don't wait for an event.
  void sb.auth.getSession().then(({ data }) => cb(data.session?.user ?? null));
  const { data } = sb.auth.onAuthStateChange((_event, session: Session | null) => cb(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}
