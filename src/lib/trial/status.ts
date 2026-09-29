/* The trial as the server reported it, and what that means for one lesson,
   one test or one section's Mr EZ allowance.

   SHARED and pure. The server (supabase/migrations/2026-09-23-trial.sql,
   trial_state) is the only source of these facts; this file reads its reply
   and never invents one. Nothing here is an access control on its own: the
   database and the Workers refuse for themselves. What this decides is what
   the screen SAYS, so it must agree with them, and the tests hold it to the
   same numbers. */

import {
  TRIAL_OFFER,
  TRIAL_SECTIONS,
  TRIAL_TUTOR_PER_SECTION,
  cleanQuestionnaire,
  isTrialLesson,
  isTrialSection,
  lessonSection,
  type TrialQuestionnaire,
  type TrialSection,
} from './offer';

export type TrialState = 'none' | 'active' | 'ended';

export interface TrialTestClaim {
  activityId: string;
  /** The sitting id the test was begun under. A resume re-uses it. */
  requestId: string;
  /** reserved = begun, not yet submitted or graded; settled = used. */
  status: 'reserved' | 'settled';
  startedAt: string;
  finishedAt: string | null;
}

export interface TrialSectionStatus {
  test: TrialTestClaim | null;
  /** Answered Mr EZ requests in this section, for the whole trial. */
  tutorUsed: number;
  /** Requests being answered right now, already reserved. */
  tutorPending: number;
}

/** Paid access the account holds, as the server reported it (contract:
    docs/paid-access/CONTRACT.md). Server-owned: it comes from a confirmed
    payment recorded by the payments Worker, never from the browser or the
    build's access mode. Null when the account has never paid. */
export interface PaidAccess {
  /** The plan of the grant that ends last. */
  planId: string;
  /** When the current paid access began (the earliest grant still counting). */
  startsAt: string;
  /** When paid access ends, by the server's clock. */
  endsAt: string;
}

export interface TrialStatus {
  /** Paid access, if any grant has ever been recorded; see hasPaidAccess. */
  paid: PaidAccess | null;
  state: TrialState;
  startedAt: string | null;
  endsAt: string | null;
  /** The server's clock when it answered. */
  serverNow: string;
  questionnaire: TrialQuestionnaire | null;
  limits: { hours: number; testsPerSection: number; tutorPerSection: number };
  sections: Record<TrialSection, TrialSectionStatus>;
}

function isIso(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

function parseClaim(raw: unknown): TrialTestClaim | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.activityId !== 'string' || typeof value.requestId !== 'string') return null;
  if (value.status !== 'reserved' && value.status !== 'settled') return null;
  if (!isIso(value.startedAt)) return null;
  return {
    activityId: value.activityId,
    requestId: value.requestId,
    status: value.status,
    startedAt: value.startedAt,
    finishedAt: isIso(value.finishedAt) ? value.finishedAt : null,
  };
}

function parsePaid(raw: unknown): PaidAccess | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.planId !== 'string' || !isIso(value.startsAt) || !isIso(value.endsAt)) return null;
  return { planId: value.planId, startsAt: value.startsAt, endsAt: value.endsAt };
}

/** Reads the server's reply. Anything malformed is null, and a caller treats
    null as "we could not check", never as "no trial" or "all allowed". */
export function parseTrialStatus(raw: unknown): TrialStatus | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const state = value.state;
  if (state !== 'none' && state !== 'active' && state !== 'ended') return null;
  if (!isIso(value.serverNow)) return null;
  if (state !== 'none' && (!isIso(value.startedAt) || !isIso(value.endsAt))) return null;
  const limitsRaw = (value.limits ?? {}) as Record<string, unknown>;
  const sectionsRaw = (value.sections ?? {}) as Record<string, unknown>;
  const sections = {} as Record<TrialSection, TrialSectionStatus>;
  for (const section of TRIAL_SECTIONS) {
    const entry = (sectionsRaw[section] ?? {}) as Record<string, unknown>;
    sections[section] = {
      test: parseClaim(entry.test),
      tutorUsed: count(entry.tutorUsed),
      tutorPending: count(entry.tutorPending),
    };
  }
  return {
    paid: parsePaid(value.paid),
    state,
    startedAt: state === 'none' ? null : (value.startedAt as string),
    endsAt: state === 'none' ? null : (value.endsAt as string),
    serverNow: value.serverNow,
    questionnaire: cleanQuestionnaire(value.questionnaire),
    limits: {
      hours: count(limitsRaw.hours) || 72,
      testsPerSection: count(limitsRaw.testsPerSection) || 1,
      tutorPerSection: count(limitsRaw.tutorPerSection) || TRIAL_TUTOR_PER_SECTION,
    },
    sections,
  };
}

/* ── Time ────────────────────────────────────────────────────────────── */

/** How far this device's clock is from the server's, from one reply. Add it
    to Date.now() to read the server's time without asking again. */
export function clockOffsetMs(status: TrialStatus, receivedAtMs: number): number {
  return Date.parse(status.serverNow) - receivedAtMs;
}

/** Milliseconds left on the trial, by the server's clock. Zero once ended. */
export function msRemaining(status: TrialStatus, serverNowMs: number): number {
  if (status.state === 'none' || !status.endsAt) return 0;
  return Math.max(0, Date.parse(status.endsAt) - serverNowMs);
}

/** The state right now, which may have moved from 'active' to 'ended' since
    the server answered, without asking it again. It never moves the other
    way: only the server can say a trial is active. */
export function stateAt(status: TrialStatus, serverNowMs: number): TrialState {
  if (status.state === 'active' && msRemaining(status, serverNowMs) === 0) return 'ended';
  return status.state;
}

/** Days, hours and minutes left, for "2 days, 18 hours left". */
export function remainingParts(ms: number): { days: number; hours: number; minutes: number } {
  const minutes = Math.floor(ms / 60000);
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
}

/* ── Paid access ─────────────────────────────────────────────────────── */

/** Whether the account's paid access is running right now, by the server's
    clock. Paid access opens everything the trial locks; the trial's own
    state is then irrelevant to what the student may open. */
export function hasPaidAccess(status: TrialStatus, serverNowMs: number): boolean {
  return status.paid !== null && Date.parse(status.paid.endsAt) > serverNowMs;
}

/** Paid access that has run out (the student paid before, and it ended). */
export function paidAccessEnded(status: TrialStatus, serverNowMs: number): boolean {
  return status.paid !== null && Date.parse(status.paid.endsAt) <= serverNowMs;
}

/* ── One lesson ──────────────────────────────────────────────────────── */

export type LessonAccess =
  /** In the trial and the trial is running. */
  | 'included'
  /** Not part of the trial: full access only. */
  | 'locked'
  /** Part of the trial, but the trial has ended. */
  | 'ended'
  /** No trial started on this account yet. */
  | 'no-trial';

export function lessonAccess(status: TrialStatus, key: string, serverNowMs: number): LessonAccess {
  const state = stateAt(status, serverNowMs);
  if (state === 'none') return 'no-trial';
  if (!isTrialLesson(key)) return 'locked';
  return state === 'ended' ? 'ended' : 'included';
}

/* ── One section's test ──────────────────────────────────────────────── */

export type TestAccess =
  /** The section's test can be started. */
  | 'available'
  /** This test was begun and not yet submitted: resume it. */
  | 'in-progress'
  /** The section's test has been used. */
  | 'used'
  /** A different test was begun in this section; this one cannot start. */
  | 'other-in-progress'
  /** Not the section's trial test. */
  | 'locked'
  /** The section's trial test exists but is switched off for now. */
  | 'unavailable'
  /** The trial ended before this test was begun. */
  | 'ended'
  | 'no-trial';

/** What a student may do with `testId`, a trial activity id or paper id. */
export function testAccess(status: TrialStatus, section: TrialSection, testId: string, serverNowMs: number): TestAccess {
  const state = stateAt(status, serverNowMs);
  if (state === 'none') return 'no-trial';
  const offer = TRIAL_OFFER[section];
  const claim = status.sections[section].test;
  if (claim) {
    if (claim.activityId !== testId) return claim.status === 'settled' ? 'used' : 'other-in-progress';
    /* Begun while the trial was running: it may be finished even after the
       trial has ended (the database's rule, trial_test_begin). */
    return claim.status === 'settled' ? 'used' : 'in-progress';
  }
  if (offer.testId !== testId) return 'locked';
  if (!offer.testEnabled) return 'unavailable';
  return state === 'ended' ? 'ended' : 'available';
}

/* ── One section's Mr EZ allowance ───────────────────────────────────── */

export interface TutorAllowance {
  used: number;
  pending: number;
  limit: number;
  remaining: number;
  state: 'available' | 'exhausted' | 'ended' | 'no-trial';
}

export function tutorAllowance(status: TrialStatus, section: TrialSection, serverNowMs: number): TutorAllowance {
  const limit = status.limits.tutorPerSection;
  const { tutorUsed, tutorPending } = status.sections[section];
  const remaining = Math.max(0, limit - tutorUsed - tutorPending);
  const state = stateAt(status, serverNowMs);
  return {
    used: tutorUsed,
    pending: tutorPending,
    limit,
    remaining,
    state: state === 'none' ? 'no-trial' : state === 'ended' ? 'ended' : remaining === 0 ? 'exhausted' : 'available',
  };
}

/** The section a page belongs to, for the tutor panel's context line. Only
    a label on the screen: the Worker works the section out again from the
    lesson or test the request names. */
export function sectionForPage(ref: { lessonKey?: string; testId?: string }): TrialSection | null {
  if (ref.lessonKey) return lessonSection(ref.lessonKey);
  if (ref.testId) {
    const match = /^(reading|listening|writing|speaking)/.exec(ref.testId);
    return match && isTrialSection(match[1]) ? match[1] : null;
  }
  return null;
}
