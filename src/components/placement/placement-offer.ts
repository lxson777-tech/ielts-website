/* When Today offers the placement test, and in which form.
 *
 * One calm card, shown once the first-visit intake has been answered or put
 * off, and only while the account has not taken the placement test. "Not
 * now" hides it for a week on this device, per student, and changes nothing
 * else: the staged short samples the plan already schedules carry on
 * exactly as they were, which is the whole point of offering rather than
 * requiring the test.
 *
 * Pure apart from the small dismissal note, which is guarded exactly like
 * the intake's own "answer later" (../learning/today/intakeDeferral.ts):
 * a missing or blocked store means "not dismissed", which at worst shows
 * the card once more.
 */

import { CACHE_NAMESPACE_SEPARATOR } from '../../lib/learning/contracts/sync';
import { safeGet, safeSet, type BrowserStorage } from '../../lib/store-owner';

/** Days a "Not now" keeps the card away. */
export const PLACEMENT_OFFER_QUIET_DAYS = 7;

const DISMISS_KEY = 'ielts.placement.offerDismissed.v1';

export type PlacementOfferView =
  /** Nothing: taken already, dismissed recently, or the intake is on screen. */
  | 'hidden'
  /** Signed out: the placement needs an account, so the card invites a
      sign-in instead of offering the test. */
  | 'sign-in'
  /** Signed in, never started: "Take the 40-minute placement test". */
  | 'offer'
  /** Signed in, a sitting in progress on this device: "Carry on". */
  | 'resume';

export interface PlacementOfferInput {
  /** The intake is what Today is showing right now. */
  intakeShowing: boolean;
  signedIn: boolean;
  /** The learner record already holds a placement event. */
  taken: boolean;
  /** This device holds an unfinished sitting for this student. */
  inProgress: boolean;
  /** The date (yyyy-mm-dd) of the last "Not now", or null. */
  dismissedOn: string | null;
  /** The student's own calendar date. */
  today: string;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** True while a "Not now" from `dismissedOn` still keeps the card away. A
    date from the future (a clock moved back) never counts: the worst that
    costs is seeing the card again. */
export function offerQuiet(dismissedOn: string | null, today: string): boolean {
  if (!dismissedOn) return false;
  const elapsed = daysBetween(dismissedOn, today);
  return elapsed >= 0 && elapsed < PLACEMENT_OFFER_QUIET_DAYS;
}

export function placementOfferView(input: PlacementOfferInput): PlacementOfferView {
  if (input.intakeShowing) return 'hidden';
  if (!input.signedIn) return offerQuiet(input.dismissedOn, input.today) ? 'hidden' : 'sign-in';
  /* An unfinished sitting is offered back whatever the record says: the
     record already holding its first part is exactly what an interrupted
     sitting looks like. */
  if (input.inProgress) return 'resume';
  if (input.taken) return 'hidden';
  return offerQuiet(input.dismissedOn, input.today) ? 'hidden' : 'offer';
}

function dismissKey(ownerNs: string): string {
  return `${DISMISS_KEY}${CACHE_NAMESPACE_SEPARATOR}${ownerNs}`;
}

/** The last "Not now" for this student on this device, or null. */
export function readOfferDismissal(storage: BrowserStorage | null, ownerNs: string): string | null {
  if (!storage) return null;
  return safeGet(storage, dismissKey(ownerNs));
}

/** Record a "Not now" as of `today`. Silently does nothing without storage. */
export function writeOfferDismissal(storage: BrowserStorage | null, ownerNs: string, today: string): void {
  if (!storage) return;
  safeSet(storage, dismissKey(ownerNs), today);
}
