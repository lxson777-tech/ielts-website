/* Free AI tries for a free account (Alex, 10 October 2026: "promote our
   access to try AI training to users who are on free accounts").

   A free account, which otherwise gets lessons only (model.ts), may TRY the
   AI a small, fixed number of times, once per account for its whole life:

     - tutor     questions to Mr EZ (his chat, and the lesson help buttons
                 Explain / Hint / Example), cheap to run;
     - writing   one essay checked against the official criteria;
     - speaking  one recorded Speaking answer checked.

   The live interview is never a free try: each one is a long paid voice
   session. A paid or complimentary account never uses tries; it has its own
   allowances. A paid account that ENDED is back to free, and its tries are
   whatever is left of the same lifetime count.

   SHARED and pure, imported by the site and the Workers. The DATABASE is the
   only authority (supabase/migrations/2026-10-10-free-taster.sql counts and
   reserves every try); this file holds the numbers the screens show and the
   reply shape they read, and a test holds the two together. Setting a limit
   to 0 switches that try off everywhere. */

import type { AccessTier } from './model';

export type TasterFeature = 'tutor' | 'writing' | 'speaking';

export const TASTER_FEATURES: readonly TasterFeature[] = ['tutor', 'writing', 'speaking'];

/** Lifetime free tries per account. The SQL migration must use the same
    numbers (tests/free-taster.test.ts reads both). */
export const TASTER_LIMITS: Readonly<Record<TasterFeature, number>> = Object.freeze({
  tutor: 10,
  writing: 1,
  speaking: 1,
});

/** One try kind as the server counted it. `used` includes tries still being
    answered (reserved), so a double click cannot spend two. */
export interface TasterCount {
  used: number;
  limit: number;
}

/** `taster` inside the trial_status reply. Absent from an older server, in
    which case no free try is offered at all (never guessed). */
export type TasterStatus = Record<TasterFeature, TasterCount>;

/** What the server answers when a free account has used a try kind up:
    HTTP 402 with this code, before any model call. */
export const TASTER_USED_CODE = 'taster-used';

function isCount(v: unknown): v is TasterCount {
  if (!v || typeof v !== 'object') return false;
  const c = v as Record<string, unknown>;
  return Number.isInteger(c.used) && Number.isInteger(c.limit) && (c.used as number) >= 0 && (c.limit as number) >= 0;
}

/** Read `taster` from the server's status reply. Anything malformed is null,
    and null offers nothing. */
export function parseTaster(raw: unknown): TasterStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out = {} as TasterStatus;
  for (const f of TASTER_FEATURES) {
    if (!isCount(r[f])) return null;
    out[f] = { used: r[f].used, limit: r[f].limit };
  }
  return out;
}

/** Free tries left of one kind (0 when unknown). */
export function tasterLeft(status: TasterStatus | null, feature: TasterFeature): number {
  if (!status) return 0;
  const c = status[feature];
  return Math.max(0, c.limit - c.used);
}

/** Whether this account should be offered (and may use) a free try of
    `feature` right now, as far as the screen can tell. Only free and
    paid-ended accounts take tries; paid ones use their own allowance. */
export function canTryFree(tier: AccessTier, status: TasterStatus | null, feature: TasterFeature): boolean {
  return (tier === 'free' || tier === 'paid-ended') && tasterLeft(status, feature) > 0;
}

/** Whether every try of every kind is used (or none was ever offered). */
export function tastersAllUsed(status: TasterStatus | null): boolean {
  return TASTER_FEATURES.every((f) => tasterLeft(status, f) === 0);
}
