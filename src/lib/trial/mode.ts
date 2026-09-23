/* Which site this build is: today's open, free site, or the trial.

   Read once from PUBLIC_ACCESS_MODE at build time. Anything but exactly
   'trial' is the open site, so a missing or mistyped setting can never lock
   the live site. The Workers read their own ACCESS_MODE; this file is for
   the site and its pages only. */

import { parseAccessMode, type AccessMode } from './offer';

export const ACCESS_MODE: AccessMode = parseAccessMode(import.meta.env?.PUBLIC_ACCESS_MODE);

export function isTrialBuild(): boolean {
  return ACCESS_MODE === 'trial';
}
