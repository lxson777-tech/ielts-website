/* What happens after a successful sign-in or sign-up on one of the account
   pages: wait (briefly) for the account lifecycle to finish moving this
   device over to the student, then leave for the next page.

   The pages never change whose work this is themselves. Supabase announces
   the new session, src/lib/auth/lifecycle.ts hears it exactly as it always
   has, and src/lib/auth/sync.ts moves every store and announces the change
   once, at the end (`settled`). Waiting for that before navigating means the
   next page opens with the student's own work already in place. If it takes
   longer than a few seconds the page leaves anyway: the next page's own
   lifecycle picks up the same session and finishes the job, which is safe
   because a sign-in for the student who is already the owner changes
   nothing. */

import { onAccountChange } from '../../lib/auth/lifecycle';

const MAX_WAIT_MS = 5000;

/** Resolves once the lifecycle reports a finished sign-in, or after a few
    seconds, whichever comes first. Never rejects. */
export function whenSignedInSettled(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    let stop: () => void = () => {};
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      // The subscription answers synchronously on subscribe, so `stop` may
      // not be assigned yet on that first call; defer the unsubscribe.
      window.setTimeout(() => stop(), 0);
      resolve();
    };
    const timer = window.setTimeout(finish, MAX_WAIT_MS);
    stop = onAccountChange((state) => {
      if (state.user && state.settled > 0) finish();
    });
  });
}

/** Leave for `href` (already base-prefixed). A full page load, so the next
    page starts clean with the new session. */
export function leaveFor(href: string): void {
  window.location.assign(href);
}
