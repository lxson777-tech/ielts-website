/* Whose request to Mr EZ this is (sixth Codex round, 23 September 2026,
   R2E-02, and its follow-up the same day for every other tutor request).

   WHY THIS FILE EXISTS
   The review of a handed-in paper holds that student's answers in the
   component's memory. The two review requests, "Go through my mistakes"
   (TestDebrief) and "Why was my answer wrong?" (AskWhyWrong), send those
   answers to Mr EZ with whatever access token this browser holds at the
   moment of the press. Student A could hand a paper in, leave the review
   open, and sign out in another tab; B signed in there, and a press on A's
   still-open review sent A's answer to Mr EZ as B, spending B's turn and
   putting A's answer in B's conversation.

   The same short window was open for every OTHER request too: a message A
   typed into the panel, or A's welcome, weekly review, unit note or
   explanation, could go out under B's token after a switch, and a reply
   that came back for A after the switch landed in whichever conversation
   was on the page, which was B's by then. The Worker was never the problem
   (it reads every fact against the user the token proves); the browser was
   delivering one student's words and replies to another.

   So EVERY request to Mr EZ is now bound, at the moment it is made, to one
   owner (spelled as src/lib/store-owner.ts spells an owner). A review
   request names its owner explicitly (the student who sat the paper); every
   other request is bound to the owner on the page when it is made. From
   then on the request is refused, sending nothing:
     - BEFORE any token is fetched, when that owner is no longer the one
       this browser is working for (a review left open for a student who
       has gone);
     - AFTER the token is read and before it is used, when the session it
       came from is not that owner's. The token lives in storage every tab
       shares, and a tab learns of another tab's sign-in a moment after the
       token itself has changed (or never, if it missed the event). In that
       window this tab still names A as the owner while the token is B's;
       comparing the session's own user with A closes it;
     - BEFORE the automatic retry, when the owner changed during the pause.
   And whatever comes back, a reply or a failure, is handed to the caller
   only while that owner has stayed the current one throughout. One that
   arrives after the page changed hands is dropped with the same error,
   marked `sent`, so no screen can write it into the next student's
   conversation or cache, or show it. "Throughout" is the rule
   bindToCurrentOwner already keeps for grades: A signing out and back in
   while the reply is on its way still counts as the page having moved on.

   None of these refusals is an error a student needs to read. A review
   refused before sending leaves the screen for the stopped screen of an
   account change; everything else simply shows nothing, because the screen
   already belongs to somebody else.

   The replies a page keeps are bound too: the little cache that keeps an
   answered question answered (AskWhyWrong) is keyed by the owner as well as
   by the question, so a reply bought by A is never shown to B, even on the
   same paper with the same answer in the same open page; and the panel's
   conversation is kept per owner (./conversation.ts).

   Pure apart from reading and watching the current owner: the session is
   handed in by the caller (src/lib/tutor/client.ts), so tests can drive
   every case. */

import { bindToCurrentOwner, currentOwner, ownerNamespace, userOwner } from '../store-owner';

/** Which account change refused a request. */
export type ReviewOwnerChange = 'signed-out' | 'other-student';

/** A request to Mr EZ refused, or its reply dropped, because it belongs to
    somebody other than the account this browser is working for now. */
export class TutorOwnerChangedError extends Error {
  /* Plain fields, not constructor parameter properties: see the same note
     on TutorRequestError in ./schema.ts. */
  readonly now: ReviewOwnerChange;
  /** False: refused before anything was sent. True: the request had gone
      out, and what came back (a reply or a failure) was dropped because the
      page changed hands while it was on its way. */
  readonly sent: boolean;

  constructor(now: ReviewOwnerChange, sent = false) {
    super(
      sent
        ? 'The reply belongs to another account now, so it was not shown.'
        : 'This request belongs to another account now, so nothing was sent.',
    );
    this.now = now;
    this.sent = sent;
    this.name = 'TutorOwnerChangedError';
  }
}

function changeTo(namespace: string): ReviewOwnerChange {
  return namespace.startsWith('u:') ? 'other-student' : 'signed-out';
}

function changeNow(): ReviewOwnerChange {
  return changeTo(ownerNamespace(currentOwner()));
}

/** Throw TutorOwnerChangedError when `owner` names somebody other than the
    owner this browser is working for now. No owner, no check. */
export function refuseUnlessOwnerCurrent(owner: string | undefined): void {
  if (!owner) return;
  const now = ownerNamespace(currentOwner());
  if (now !== owner) throw new TutorOwnerChangedError(changeTo(now));
}

/** The one session a request would be sent with: its token and the user it
    was issued to. */
export interface TutorSession {
  token: string;
  userId: string;
}

/* ── Every request, bound to one owner ──────────────────────────────────── */

/** One request to Mr EZ, bound to the owner it was made for. */
export interface TutorRequestBinding {
  /** Whose request this is, as ownerNamespace spells an owner. Fixed at
      the moment the binding was made. */
  readonly owner: string;
  /** True when the caller named the owner (a review of a handed-in paper),
      false when it was taken from the page. */
  readonly explicit: boolean;
  /** Throw TutorOwnerChangedError unless the owner has stayed the current
      one ever since the binding was made. `sent` is carried on the error:
      whether anything had gone out yet. */
  check(sent: boolean): void;
  /** Stop watching for owner changes. Call exactly once, when the request
      is over, whatever its outcome. */
  release(): void;
}

/** Bind a request that is about to be made.
 *
 * With `owner` (a review), the request is refused at once, sending nothing
 * and reading no token, when that owner is not the current one. Without
 * it, the request belongs to whoever the page is working for right now. */
export function bindTutorRequest(owner?: string): TutorRequestBinding {
  refuseUnlessOwnerCurrent(owner);
  /* Watches for owner changes from here on, so a switch and a switch back
     while the request is out still counts as a change. */
  const binding = bindToCurrentOwner();
  return {
    owner: ownerNamespace(binding.owner),
    explicit: Boolean(owner),
    check(sent: boolean): void {
      if (binding.state() !== 'current') throw new TutorOwnerChangedError(changeNow(), sent);
    },
    release: () => binding.cancel(),
  };
}

/** The token to send a bound request with, or null when there is no session
    at all (the caller then says "sign in", exactly as before).
 *
 * Refused with TutorOwnerChangedError, and `readSession` NOT EVEN CALLED,
 * when the owner has already changed. Refused again, the token unused, when
 * the owner changed while the session was being read, or when the session
 * belongs to anybody but the owner (an anonymous owner included: a session
 * this page has not been told about yet is somebody else's). A review whose
 * signed-in student has no session left is refused as a sign-out, because
 * the review is theirs and leaves the screen; any other request with no
 * session is simply not signed in. */
export async function tokenForRequest(
  binding: TutorRequestBinding,
  readSession: () => Promise<TutorSession | null>,
): Promise<string | null> {
  binding.check(false);
  const session = await readSession();
  binding.check(false);
  if (!session) {
    if (binding.explicit && binding.owner.startsWith('u:')) throw new TutorOwnerChangedError('signed-out');
    return null;
  }
  if (ownerNamespace(userOwner(session.userId)) !== binding.owner) throw new TutorOwnerChangedError('other-student');
  return session.token;
}

/** tokenForRequest for a request bound here and now: `owner` names the
    review's student, or, left out, the owner on the page. */
export async function tokenForOwner(
  owner: string | undefined,
  readSession: () => Promise<TutorSession | null>,
): Promise<string | null> {
  const binding = bindTutorRequest(owner);
  try {
    return await tokenForRequest(binding, readSession);
  } finally {
    binding.release();
  }
}

/* ── The answered-question cache, per owner ─────────────────────────────── */

/** One "why was my answer wrong?" question, as the cache keeps it: the key
    its repeat sends carry, and the reply once it came. */
export interface WhyWrongCell {
  idempotencyKey: string;
  text: string | null;
  live: boolean;
}

/** The cache key: whose review, which paper, which question, and exactly
    what was put. Same four things, same cell; a different owner is always
    a different cell. */
export function whyWrongCacheKey(owner: string, testId: string, questionId: string, given: string): string {
  return JSON.stringify([owner, testId, questionId, given]);
}

/** A cache of cells for the life of one page, keyed by whyWrongCacheKey.
    `freshKey` makes the repeat-send key of a question asked for the first
    time. */
export function whyWrongCache(freshKey: () => string) {
  const cells = new Map<string, WhyWrongCell>();
  return {
    slot(owner: string, testId: string, questionId: string, given: string): WhyWrongCell {
      const key = whyWrongCacheKey(owner, testId, questionId, given);
      const held = cells.get(key);
      if (held) return held;
      const fresh: WhyWrongCell = { idempotencyKey: freshKey(), text: null, live: true };
      cells.set(key, fresh);
      return fresh;
    },
    size: () => cells.size,
  };
}
