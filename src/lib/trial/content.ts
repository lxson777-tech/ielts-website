/* Fetching locked content through the content gate (workers/content-gate).

   BROWSER ONLY, and only in a trial build: there the public site carries no
   lesson body and no practice paper, so a page asks the gate for them with
   the signed-in student's token. The gate decides; a refusal comes back as
   a code the page turns into the usual calm explanation (TrialBlock).

   PUBLIC_CONTENT_URL is the gate's address. Unset, nothing here is used. */

import { getAccessToken } from '../auth/session';
import { ACCESS_MODE } from './mode';

const CONTENT_URL: string | undefined = import.meta.env?.PUBLIC_CONTENT_URL;

/** True when this build hides its content behind the gate. */
export function contentIsGated(): boolean {
  return ACCESS_MODE === 'trial';
}

export type GatedResult =
  | { ok: true; text: string }
  | { ok: false; status: number; code: string };

/** GET <gate>/<path> as the signed-in student. Never throws. */
export async function fetchGated(path: string): Promise<GatedResult> {
  if (!CONTENT_URL) return { ok: false, status: 503, code: 'not-configured' };
  const token = await getAccessToken().catch(() => null);
  if (!token) return { ok: false, status: 401, code: 'sign-in-required' };
  let resp: Response;
  try {
    resp = await fetch(`${CONTENT_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 0, code: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'unavailable' };
  }
  if (resp.ok) return { ok: true, text: await resp.text() };
  let code = 'unavailable';
  try {
    code = ((await resp.json()) as { code?: string }).code ?? code;
  } catch {
    /* not JSON */
  }
  return { ok: false, status: resp.status, code };
}
