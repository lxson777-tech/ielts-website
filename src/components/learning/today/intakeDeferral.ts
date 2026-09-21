/* Persisting "answer later" (Today polish round, item 4).
 *
 * WHAT THIS FIXES
 * "Answer later" on the first-visit intake used to be React state only, so
 * every reload asked the same six questions again before the student could
 * even see the provisional session underneath. This makes the choice stick
 * for a few days, the same way a real "not now" would.
 *
 * WHY THIS IS SEPARATE FROM todayViewModel.ts
 * `isDeferralActive` is pure and tested there is no such file for browser
 * code (architecture section 1.7: pure core, browser file separate). The
 * read/write/clear helpers below touch `localStorage`, so they only run in
 * a browser and are guarded exactly the way store.browser.ts guards its own
 * reads: never throw, a missing or blocked store just means "not deferred",
 * which costs nothing worse than being asked again.
 *
 * NO PLAN CONTRACT CHANGE
 * `PlanOverride` (contracts/plan.ts) has no "deferred intake" kind, and
 * that contract belongs to another work package. This is deliberately the
 * lighter option the brief allows instead: a small local preference with a
 * date, namespaced per owner the same way the real stores are, using the
 * store's own exported `anonymousOwner`/`userOwner`/`deviceIdFrom`/
 * `ownerNamespace` helpers (read, never written to) so this never drifts
 * from how a signed-in student's device id is derived elsewhere. */

import { anonymousOwner, deviceIdFrom, ownerNamespace, userOwner } from '../../../lib/learning/store.browser';

/** How many days a deferred intake stays quiet before Today offers it
    again. Long enough that answering later does not feel like nagging on
    the very next visit; short enough that a provisional plan is not left
    unconfirmed for weeks with no real goal behind it. */
export const INTAKE_DEFER_DAYS = 4;

const STORAGE_KEY = 'ielts.learning.todayIntakeDeferred.v1';

/** Whole days between `deferredDate` and `today`, both 'yyyy-mm-dd'. A
    local copy of the same subtraction todayViewModel.ts's daysUntil does:
    kept here, rather than imported, so this file has no dependency on a
    component-folder module the other way round. */
function daysSince(deferredDate: string, today: string): number {
  const from = Date.parse(`${deferredDate}T00:00:00Z`);
  const to = Date.parse(`${today}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/** True while a deferral recorded on `deferredDate` still applies on
    `today`. A record that appears to be from the future (the device clock
    moved backwards, or storage handed back something odd) never counts as
    active: the worst that costs is asking again, never asking less. */
export function isDeferralActive(
  deferredDate: string | null,
  today: string,
  windowDays: number = INTAKE_DEFER_DAYS,
): boolean {
  if (!deferredDate) return false;
  const elapsed = daysSince(deferredDate, today);
  return elapsed >= 0 && elapsed < windowDays;
}

function storageKeyFor(userId: string | null): string {
  const owner = userId ? userOwner(userId) : anonymousOwner(deviceIdFrom(typeof window === 'undefined' ? null : window.localStorage));
  return `${STORAGE_KEY}::${ownerNamespace(owner)}`;
}

/** The date (yyyy-mm-dd) the student last pressed "answer later", or null
    when there is nothing on this device for this owner, storage is
    unavailable, or the record cannot be read. Never throws. */
export function readIntakeDeferral(userId: string | null): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(storageKeyFor(userId));
  } catch {
    return null;
  }
}

/** Records that the student deferred, as of `today` (yyyy-mm-dd, the
    session's own date so this stays on the same clock as the plan).
    Silently does nothing when storage is unavailable: the worst case is
    being asked again next visit, never a crash. */
export function writeIntakeDeferral(userId: string | null, today: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKeyFor(userId), today);
  } catch {
    /* Nothing to save to; Today just asks again next time. */
  }
}

/** Clears the deferral: pressed when the student asks to set their goal
    from the provisional-plan notice, or once the intake finishes through
    the normal path. */
export function clearIntakeDeferral(userId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKeyFor(userId));
  } catch {
    /* Already gone as far as this device is concerned. */
  }
}
