/* Supabase client seam. Gated on PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY
   exactly like the grader Workers are gated on PUBLIC_GRADER_URL: when the env
   is unset (local dev without a project, or a fork), getSupabase() returns null
   and the whole account layer quietly no-ops — the site behaves exactly as the
   anonymous, localStorage-only version. Accounts are strictly an upgrade on top
   of the existing offline-first storage, never a requirement. */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env?.PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/** True when a Supabase project is wired up, so the UI can show/hide the
    sign-in affordance instead of dangling a dead button. */
export function isAuthConfigured(): boolean {
  return !!(url && anonKey);
}

let client: SupabaseClient | null = null;

/** The single client instance, or null when unconfigured / during SSR. The
    anon key is a public, RLS-guarded key (safe to ship in the bundle) — row
    security in Postgres is what actually protects each user's data. */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null; // browser-only; there is no server here
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Complete the magic-link / OAuth redirect automatically on load.
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
