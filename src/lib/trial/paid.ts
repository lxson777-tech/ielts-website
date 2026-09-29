/* Is the signed-in account's paid access running right now?

   BROWSER ONLY. The server's latest answer for the account signed in now
   (./client), read by the server's clock. False while that answer is not in
   yet, on the open site, and for a signed-out, trial or ended account. A
   screen that shows something only paid access includes asks this; the
   Workers and the content gate decide again for themselves. */

import { serverNow, trialView, type TrialView } from './client';
import { ACCESS_MODE } from './mode';
import { hasPaidAccess } from './status';

export function paidAccessNow(view: TrialView = trialView(), now: number = serverNow()): boolean {
  return ACCESS_MODE === 'trial' && view.phase === 'ready' && view.status !== null && hasPaidAccess(view.status, now);
}
