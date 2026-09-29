/* The browser's view of the signed-in student's trial.

   BROWSER ONLY. The server (supabase/migrations/2026-09-23-trial.sql) owns
   every fact here: when the trial started and ends, which test each section
   has used, how many Mr EZ messages are gone. This module asks it, keeps the
   latest answer for the student who is signed in NOW, and hands it to the
   screens. It never works a fact out for itself and never stores one on the
   device, so a second device, a cleared browser or a sign-out cannot change
   what the server says.

   Three rules carry the weight:

   - AN ANSWER BELONGS TO ONE ACCOUNT. Every request is stamped with the
     account it was made for, and a reply that comes back after the student
     changed (signed out, signed in as someone else) is dropped. The state is
     cleared the moment the account changes, so one student's trial is never
     on screen for another, not even for a frame.
   - "WE COULD NOT CHECK" IS ITS OWN STATE. Offline or a server failure is
     never read as "no trial" or as "everything allowed": the screens show a
     plain retry, and protected content stays hidden.
   - THE CLOCK IS THE SERVER'S. Each reply carries the server's time; the
     difference from this device is kept and applied when showing time left.

   Nothing here is an access control. The database and the Workers refuse
   for themselves; this decides what the screen says.

   The same answer carries the account's PAID access (`status.paid`, written
   by the server only when the payments Worker confirms a payment). A
   purchase therefore shows up on every device the moment that device asks
   again: at sign-in, on every full page load, when a tab comes back into
   view with an answer over a minute old, and when another tab of the same
   student confirms a purchase (refreshAfterAccessChange). */

import type { User } from '@supabase/supabase-js';
import { onAccountChange } from '../auth/lifecycle';
import { ACCESS_MODE } from './mode';
import { cleanQuestionnaire, type TrialQuestionnaire, type TrialSection } from './offer';
import { clockOffsetMs, parseTrialStatus, type TrialStatus } from './status';

export type TrialPhase =
  /** The site is running as the open, free site: no trial anywhere. */
  | 'off'
  /** The account, or its trial, is still being checked. Show nothing
      protected and no verdict. */
  | 'checking'
  /** Nobody is signed in (or the session expired). */
  | 'signed-out'
  /** Accounts are not configured on this build at all. */
  | 'no-accounts'
  /** The server answered; `status` is this student's trial. */
  | 'ready'
  /** The server could not be reached or answered badly. */
  | 'error';

export interface TrialView {
  phase: TrialPhase;
  userId: string | null;
  status: TrialStatus | null;
  /** Server time minus device time, from the latest answer. */
  offsetMs: number;
  /** Why the last check failed, when phase is 'error'. */
  failure: 'offline' | 'server' | null;
}

const INITIAL: TrialView = {
  phase: ACCESS_MODE === 'trial' ? 'checking' : 'off',
  userId: null,
  status: null,
  offsetMs: 0,
  failure: null,
};

let view: TrialView = INITIAL;
const listeners = new Set<(view: TrialView) => void>();
let started = false;
/** Bumped on every account change; a reply for an older one is dropped. */
let generation = 0;
/** Every question to the server is numbered when it is sent. Replies can
    arrive out of order (a status check sent before a grade settled the test
    can land after the check sent once it had), so a reply to an older
    question never replaces the answer to a newer one. */
let asked = 0;
let appliedAsk = 0;

function publish(next: TrialView): void {
  view = next;
  for (const listener of listeners) {
    try {
      listener(view);
    } catch {
      /* One screen throwing must not stop the others hearing the news. */
    }
  }
}

function failureKind(): 'offline' | 'server' {
  return typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'server';
}

/** Server time now, by the latest answer's clock. */
export function serverNow(): number {
  return Date.now() + view.offsetMs;
}

/* ── Talking to the server ───────────────────────────────────────────── */

type RpcResult = { data: unknown; error: { message: string } | null };

async function callRpc(fn: string, args: Record<string, unknown> = {}): Promise<RpcResult> {
  /* Loaded on demand, like the account lifecycle does, so a page on the
     open site (where none of this runs) never downloads the account client
     because it imported this module. */
  const { getSupabase } = await import('../auth/supabase');
  const sb = getSupabase();
  if (!sb) return { data: null, error: { message: 'accounts not configured' } };
  try {
    const { data, error } = await sb.rpc(fn, args);
    return { data, error: error ? { message: error.message } : null };
  } catch (err) {
    return { data: null, error: { message: err instanceof Error ? err.message : 'network' } };
  }
}

/** Takes a reply meant for account `userId` at generation `gen`, and
    publishes it only if that is still who is signed in. */
function accept(userId: string, gen: number, raw: unknown, sentAt: number, ask: number): TrialStatus | null {
  if (gen !== generation || view.userId !== userId) return null;
  const status = parseTrialStatus(raw);
  if (!status) {
    publish({ ...view, phase: 'error', failure: 'server' });
    return null;
  }
  /* Older than what is on screen: still this student's answer to hand back
     to its caller, but not news. */
  if (ask < appliedAsk) return status;
  appliedAsk = ask;
  const receivedAt = Date.now();
  // Half the round trip is the best estimate of when the server answered.
  const offset = clockOffsetMs(status, sentAt + (receivedAt - sentAt) / 2);
  publish({ phase: 'ready', userId, status, offsetMs: offset, failure: null });
  return status;
}

/** When this page last asked, so returning to a tab re-asks only when the
    answer on screen is getting old. */
let lastAskedAt = 0;
const RECHECK_AFTER_MS = 60_000;

/** Asks the server for the signed-in student's trial again. */
export async function refreshTrial(): Promise<TrialStatus | null> {
  if (ACCESS_MODE !== 'trial' || !view.userId) return null;
  const userId = view.userId;
  const gen = generation;
  if (view.phase !== 'ready') publish({ ...view, phase: 'checking', failure: null });
  lastAskedAt = Date.now();
  const sentAt = Date.now();
  const ask = ++asked;
  const { data, error } = await callRpc('trial_status');
  if (gen !== generation || view.userId !== userId) return null;
  if (error) {
    publish({ ...view, phase: 'error', failure: failureKind() });
    return null;
  }
  return accept(userId, gen, data, sentAt, ask);
}

function onAccount(user: User | null, known: boolean, configured: boolean): void {
  if (!configured) {
    generation += 1;
    publish({ ...INITIAL, phase: 'no-accounts' });
    return;
  }
  if (!known) return;
  const userId = user?.id ?? null;
  // The lifecycle reports the same account more than once (known, then
  // settled). Only a change of account is news here.
  if (userId !== null && userId === view.userId) return;
  if (userId === null && view.phase === 'signed-out') return;
  generation += 1;
  if (!userId) {
    publish({ ...INITIAL, phase: 'signed-out' });
    return;
  }
  // A different student, or the first answer for this one: nothing of the
  // previous account's trial survives this line.
  publish({ phase: 'checking', userId, status: null, offsetMs: 0, failure: null });
  void refreshTrial();
}

/** Starts listening to the account. Safe to call any number of times. */
export function startTrialClient(): void {
  if (started || ACCESS_MODE !== 'trial' || typeof window === 'undefined') return;
  started = true;
  void import('../auth/supabase').then(({ isAuthConfigured }) => {
    const configured = isAuthConfigured();
    onAccountChange((state) => onAccount(state.user, state.known, configured));
  });
  // Coming back online is the moment a failed check is worth retrying.
  window.addEventListener('online', () => {
    if (view.phase === 'error') void refreshTrial();
  });
  /* Access can change somewhere else: a purchase confirmed on the student's
     phone, or paid access running out while this tab sat in the
     background. Coming back to the tab re-asks once the answer is a minute
     old, and a page restored from the back/forward cache always re-asks.
     Nothing is stored: the server is simply asked again. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && view.phase === 'ready' && Date.now() - lastAskedAt > RECHECK_AFTER_MS) {
      void refreshTrial();
    }
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && view.userId) void refreshTrial();
  });
  listenForAccessChanges();
}

/* ── Other tabs ──────────────────────────────────────────────────────────
   When one tab sees a purchase confirmed (the return page, "Check again"),
   it nudges this student's other open tabs to ask the server again. The
   message carries no fact, only "ask again", and a tab signed in as someone
   else ignores it. */
const ACCESS_CHANNEL = 'ielts.access.v1';
let accessChannel: BroadcastChannel | null = null;

function listenForAccessChanges(): void {
  if (accessChannel || typeof BroadcastChannel === 'undefined') return;
  try {
    accessChannel = new BroadcastChannel(ACCESS_CHANNEL);
    accessChannel.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; userId?: unknown } | null;
      if (data?.type === 'access-changed' && typeof data.userId === 'string' && data.userId === view.userId) {
        void refreshTrial();
      }
    };
  } catch {
    accessChannel = null;
  }
}

/** After the server confirms a purchase (or any change to paid access):
    ask it again here, and tell this student's other tabs to do the same.
    Grants nothing: the answer is whatever trial_status now says. */
export async function refreshAfterAccessChange(): Promise<TrialStatus | null> {
  const status = await refreshTrial();
  if (view.userId && accessChannel) {
    try {
      accessChannel.postMessage({ type: 'access-changed', userId: view.userId });
    } catch {
      /* another tab simply finds out on its next visit */
    }
  }
  return status;
}

/** Subscribe to the trial view; called at once with what is known now. */
export function onTrialChange(listener: (view: TrialView) => void): () => void {
  startTrialClient();
  listeners.add(listener);
  try {
    listener(view);
  } catch {
    /* as above */
  }
  return () => {
    listeners.delete(listener);
  };
}

export function trialView(): TrialView {
  return view;
}

/* ── Actions ─────────────────────────────────────────────────────────── */

export type TrialActionResult =
  | { ok: true; status: TrialStatus; requestId?: string; resumed?: boolean }
  | { ok: false; reason: string };

/** Starts the signed-in student's trial, or returns the one they already
    have. `questionnaire` is kept only if every answer is valid. */
export async function startTrial(questionnaire: TrialQuestionnaire | null): Promise<TrialActionResult> {
  if (!view.userId) return { ok: false, reason: 'signed-out' };
  const userId = view.userId;
  const gen = generation;
  const sentAt = Date.now();
  const ask = ++asked;
  const { data, error } = await callRpc('trial_start', { p_questionnaire: cleanQuestionnaire(questionnaire) });
  if (error) return { ok: false, reason: failureKind() };
  const status = accept(userId, gen, data, sentAt, ask);
  return status ? { ok: true, status } : { ok: false, reason: 'changed-account' };
}

/** A fresh id for one test sitting. The server keeps the first one it
    accepted and hands it back on every later begin of the same test. */
export function newSittingId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `sit-${random.replace(/[^A-Za-z0-9-]/g, '')}`.slice(0, 60);
}

/** Begins (or resumes) the section's trial test. Nothing is used up if this
    fails: the student simply tries again. */
export async function beginTrialTest(section: TrialSection, activityId: string): Promise<TrialActionResult> {
  if (!view.userId) return { ok: false, reason: 'signed-out' };
  const userId = view.userId;
  const gen = generation;
  const sentAt = Date.now();
  const ask = ++asked;
  const { data, error } = await callRpc('trial_test_begin', {
    p_section: section,
    p_activity: activityId,
    p_request: newSittingId(),
  });
  if (error) return { ok: false, reason: failureKind() };
  const result = (data ?? {}) as { ok?: unknown; reason?: unknown; requestId?: unknown; resumed?: unknown; status?: unknown };
  const status = accept(userId, gen, result.status, sentAt, ask);
  if (!status) return { ok: false, reason: 'changed-account' };
  if (result.ok !== true || typeof result.requestId !== 'string') {
    return { ok: false, reason: typeof result.reason === 'string' ? result.reason : 'server' };
  }
  return { ok: true, status, requestId: result.requestId, resumed: result.resumed === true };
}

/** Reports a submitted Reading or Listening trial test. Retried a few times
    in the background; if it never lands, the test simply stays "in
    progress" on the server, which already stops a second one starting. */
export async function finishTrialTest(section: 'reading' | 'listening', requestId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!view.userId) return false;
    const userId = view.userId;
    const gen = generation;
    const sentAt = Date.now();
    const ask = ++asked;
    const { data, error } = await callRpc('trial_test_finish', { p_section: section, p_request: requestId });
    if (!error) {
      const status = (data as { status?: unknown } | null)?.status;
      accept(userId, gen, status, sentAt, ask);
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  return false;
}

/* ── The questionnaire, across the sign-in round trip ──────────────────
   A student arriving from the public questionnaire may have to sign up and
   confirm their email before they can start, which can mean leaving the
   page. Their answers wait in this tab's session storage (never the
   server's, until they choose to start) and are used once. */
const QUESTIONNAIRE_KEY = 'ielts.trial.questionnaire.v1';

export function rememberQuestionnaire(q: TrialQuestionnaire | null): void {
  if (!q) return;
  try {
    sessionStorage.setItem(QUESTIONNAIRE_KEY, JSON.stringify(q));
  } catch {
    /* private mode: the answers are just not carried over */
  }
}

export function recallQuestionnaire(): TrialQuestionnaire | null {
  try {
    return cleanQuestionnaire(JSON.parse(sessionStorage.getItem(QUESTIONNAIRE_KEY) ?? 'null'));
  } catch {
    return null;
  }
}

export function forgetQuestionnaire(): void {
  try {
    sessionStorage.removeItem(QUESTIONNAIRE_KEY);
  } catch {
    /* nothing to forget */
  }
}

/** For tests only. */
export function resetTrialClientForTest(): void {
  started = false;
  generation += 1;
  view = INITIAL;
  listeners.clear();
}
