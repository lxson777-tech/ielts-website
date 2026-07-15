/* Thin auth helpers over the Supabase client. Every function no-ops safely when
   accounts aren't configured (getSupabase() → null), so callers never have to
   branch on configuration. Primary sign-in is a standard email + password
   form; Google and a one-time email link remain as secondary options. The
   password itself never touches our own code — every call here hands it
   straight to supabase-js, which posts it directly to Supabase's auth API. */

import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

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

/** Standard email + password sign-in. */
export async function signInWithPassword(email: string, password: string): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Accounts are not configured for this site yet.' };
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { error: error.message } : {};
}

/** Create a new account with a password. `emailRedirectTo` is where the
    confirmation link (required by this project's auth settings) lands the
    user back. Returns `needsConfirmation: true` when Supabase created the
    user but withheld a session pending that email click. */
export async function signUpWithPassword(
  email: string,
  password: string,
  emailRedirectTo: string,
): Promise<{ error?: string; needsConfirmation?: boolean }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Accounts are not configured for this site yet.' };
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo },
  });
  if (error) return { error: error.message };
  // A confirmed session comes back immediately if email confirmation is off;
  // otherwise Supabase returns a user with no session until they click the link.
  return { needsConfirmation: !data.session };
}

/** Email a password-reset link. `redirectTo` should point at the page that
    calls updatePassword() once the user lands back with a recovery session
    (see /reset-password). */
export async function sendPasswordReset(email: string, redirectTo: string): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Accounts are not configured for this site yet.' };
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  return error ? { error: error.message } : {};
}

/** Sets a new password on the currently-active session — used on the
    /reset-password landing page, where clicking the emailed link has already
    given the browser a temporary "recovery" session. */
export async function updatePassword(password: string): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Accounts are not configured for this site yet.' };
  const { error } = await sb.auth.updateUser({ password });
  return error ? { error: error.message } : {};
}

/** Email the user a one-time sign-in link — kept as a fallback for anyone who
    doesn't want to set a password. `redirectTo` is where the link lands
    them back (an absolute URL on this origin). */
export async function sendMagicLink(email: string, redirectTo: string): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Accounts are not configured for this site yet.' };
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo },
  });
  return error ? { error: error.message } : {};
}

export async function signInWithGoogle(redirectTo: string): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Accounts are not configured for this site yet.' };
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
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
