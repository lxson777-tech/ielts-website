/* Account sync: reconciles the offline-first localStorage state with the user's
   cloud row. On sign-in we PULL the cloud row, UNION-MERGE it with whatever is
   on this device (so a plan/attempts made anonymously are never lost — that's
   the first-login migration), write the merged result back to localStorage, and
   PUSH it up. After that, any local change debounces a push to the cloud.

   Everything no-ops when accounts are unconfigured (getSupabase() → null).

   WHOSE PROGRESS IS BEING MERGED AND PUSHED (fixed 22 September 2026)
   The union merge above used to read `ielts.progress.v1` and
   `ielts.studyplan.v1`, which were device-wide, so signing in as a second
   student on one browser merged the FIRST student's essays and goal into the
   second account and uploaded them under the second account's id. That was
   finding 1 of that day's review. Those four older stores are now owned like
   everything else (src/lib/store-owner.ts), and THE OWNER IS SET FIRST, at
   the top of startSyncForUser, before a single read, merge, one-time move or
   upload happens. Everything below therefore reads and writes only the
   incoming student's own copy, and every upload is checked against the
   current owner at the moment it goes out.

   AND WHAT HAPPENS WHEN A SIGN-IN IS ABANDONED (fixed 23 September 2026)
   Setting the owner first is only half the answer. A sign-in waits: for the
   learning module to load, for the account to answer, for the reconciled
   state to go back up. If the student signs out, or a second account signs
   in, during any of those waits, everything the first sign-in does AFTER the
   wait is a mutation on somebody else's browser. The generation below is what
   every one of those steps asks first, and a cancelled step leaves every
   store on whoever the current owner is now rather than on the one it was
   created for. That was finding 2 of the 23 September 2026 review.

   AND WHY A SIGN-IN NEVER RESETS AN OWNER IT IS ABOUT TO SET AGAIN (fixed 23
   September 2026)
   Every screen that holds a student's work listens for owner changes and
   hands over when it hears one: the outgoing student's work is kept for
   them, the screen clears, and one calm line says why. A sign-in used to
   begin with the whole of a sign-out, owner back to this device's anonymous
   one, and only then set the incoming student. On a signed-in page load the
   incoming student is ALREADY the owner (store-owner.ts reads the session
   this browser holds before anything mounts), and the account then answers
   twice for the same student (the immediate answer and the session event),
   so a screen that had mounted first heard the owner go away and come back,
   and showed the calm line although the account never changed.
   The rule now, in startSyncForUser:
     - the incoming student already the current owner (a signed-in page load,
       or a repeated session event for the same student): the sign-in is
       restarted exactly as before, generation and cancellation included,
       but the owner is not touched, so nobody hears anything;
     - a genuine change (anonymous to a student, student A to student B): the
       previous sign-in is stopped and the owner moves inside moveOwnerOnce
       (src/lib/store-owner.ts), so every store still moves before anything
       reads one, and the screens hear exactly ONE change, to the incoming
       student, instead of two;
     - a sign-out (stopSync): one change, to this device's anonymous owner,
       announced once every store has moved.

   SINCE THE PERSONAL LEARNING BUILD, THIS FILE DOES TWO JOBS
   The first is everything above, unchanged: `user_state.progress` and
   `user_state.study_plan` are still pulled, merged and pushed exactly as they
   were, because the writing, speaking and score history screens read them and
   they are not this build's to risk.

   The second is starting and stopping the learning layer's own sync
   (src/lib/learning/sync.browser.ts), which carries the learner record, the
   personal plan and the companion stores across three NEW tables. It runs
   beside the old one, never instead of it, and every call into it is wrapped
   so that a failure there can never break the old sync or a sign-in. */

import type { User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { getProgress, replaceProgress, mergeProgress, onProgressChange, type ProgressV1 } from '../progress';
import { loadStudyPlan, saveStudyPlan, mergeStudyPlans, onStudyPlanChange, type SavedPlan } from '../study-plan';
import type { CacheOwner } from '../learning/contracts/sync';
import { currentOwner, moveOwnerOnce, sameOwner, setCurrentOwner, userOwner } from '../store-owner';
import {
  createRestTransport,
  startLearningSync,
  stopLearningSync,
  type SyncTransport,
} from '../learning/sync.browser';

interface Row {
  progress: ProgressV1;
  study_plan: SavedPlan | null;
}

let unsub: (() => void)[] = [];
let currentUserId: string | null = null;

/* ── The sign-in generation: ONE source, consulted by every step ─────────── */

/* WHAT THIS FIXES (finding 2 of the 23 September 2026 review)
 *
 * The generation used to be checked by the caller only, after a helper had
 * already returned. The helper set the owner, awaited the learning module,
 * and set the owner AGAIN with no check in between. Signing out during that
 * await correctly reset the owner to this device's anonymous one, and then
 * the abandoned sign-in quietly set it back to the student who had just left:
 * their private essay was readable again on a signed-out browser. Returning
 * early in the caller could not undo a mutation that had already happened.
 *
 * So the generation is now a thing a step HOLDS, not a number a caller
 * remembers. Every continuation after every await below asks `signIn.current()`
 * BEFORE it moves an owner, writes a store, sends a request or adds a
 * subscription, and a cancelled step's only remaining job is to leave every
 * store on whoever the current owner is NOW (settleOnCurrentOwner): the
 * anonymous device owner after a sign-out, student B after a switch to B.
 * Never the student the cancelled step was created for.
 */

/** Bumped by every start and every stop. */
let generation = 0;

/** One sign-in attempt, and the one question every step of it asks. */
interface SignIn {
  /** False from the moment a sign-out, or a newer sign-in, takes over. */
  current(): boolean;
}

/** Take over as the current sign-in. Anything still running for an earlier
    one is cancelled by this, wherever it happens to be waiting. */
function beginSignIn(): SignIn {
  const mine = ++generation;
  return { current: () => mine === generation };
}
// True while we write cloud state into localStorage, so those writes don't echo
// straight back up as a "local change".
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

async function pull(userId: string): Promise<Row | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('user_state')
    .select('progress, study_plan')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    progress: (data.progress ?? {}) as ProgressV1,
    study_plan: (data.study_plan ?? null) as SavedPlan | null,
  };
}

/** True while `userId` is still the student this device is signed in as.
 *
 * Checked immediately before every upload, because `getProgress()` and
 * `loadStudyPlan()` answer for whoever is current: a push prepared for
 * student A and sent after a sign-out would otherwise carry one student's
 * rows under the other's id. Nothing is lost by dropping it, because the
 * work is already saved on this device under its own owner's key and the
 * next sign-in pushes it. */
function stillSignedInAs(userId: string): boolean {
  if (currentUserId !== userId) return false;
  return sameOwner(currentOwner(), userOwner(userId));
}

async function push(userId: string, signIn?: SignIn): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  /* Two questions, not one: "is this sign-in still the current one" and "is
     this student still the one this device answers for". The first is what a
     cancelled sign-in fails; the second is what a debounced push from an
     earlier session fails. */
  if (signIn && !signIn.current()) return;
  if (!stillSignedInAs(userId)) return;
  await sb.from('user_state').upsert(
    {
      user_id: userId,
      progress: getProgress(),
      study_plan: loadStudyPlan(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

function schedulePush(userId: string): void {
  if (pushTimer) clearTimeout(pushTimer);
  // Debounce: a burst of edits (ticking off plan steps, finishing a test) sends
  // one write, not one per keystroke.
  pushTimer = setTimeout(() => {
    pushTimer = null;
    /* The owner may have changed while this was waiting. push() checks, and
       drops the write rather than sending it under the next student. */
    void push(userId);
  }, 1500);
}

/* ── The learning layer's own sync ───────────────────────────────────────── */

/* Loaded on demand, and kept once it is. src/lib/learning/index.ts owns the
   cached "current session" every screen reads, so it is the one that must be
   told when the student changes: dropping the record without dropping that
   cache would let one student's session view survive into the next one's.
   It is imported dynamically because it carries the activity catalogue, and
   no page should pay for that merely for having an account menu on it. */
type LearningModule = typeof import('../learning');
let learningModule: LearningModule | null = null;

async function learning(): Promise<LearningModule | null> {
  if (learningModule) return learningModule;
  try {
    learningModule = await import('../learning');
    return learningModule;
  } catch {
    /* The learning layer failing to load must never stop a sign-in. */
    return null;
  }
}

/** Sets the owner on EVERY store: the four older ones through the shared
    owner (src/lib/store-owner.ts), and the learner record, the plan and the
    shared session cache through the learning module when it is loaded.
 *
 * The shared owner is set first and unconditionally, with a plain
 * synchronous call that cannot fail. The learning module is a convenience on
 * top: if it has not loaded, or throws, the older stores have still moved,
 * which is the half that decides what gets uploaded. */
function setLearningOwner(owner: CacheOwner | null): void {
  setCurrentOwner(owner);
  try {
    learningModule?.setLearningOwner(owner);
  } catch {
    /* A store refusing to move is not a reason to fail a sign-out. */
  }
}

/** What a cancelled step does instead of what it was going to do: leave every
    store on whoever the current owner is NOW.
 *
 * The four older stores are already there, because whatever cancelled this
 * step set them (sign-out to the anonymous device owner, a switch to the new
 * student). The learning module may not be: when it was still loading at the
 * moment of the cancellation there was nothing to tell, so it is told here,
 * as soon as it exists. Nothing is set to the owner the cancelled step was
 * created for. */
function settleOnCurrentOwner(): void {
  try {
    learningModule?.setLearningOwner(currentOwner());
  } catch {
    /* A store refusing to move is not a reason to fail anything. */
  }
}

/** The same as setLearningOwner, but waiting for the learning module to load
    first, so a sign-in has genuinely moved every store before it reads one.
    Used at the top of startSyncForUser and nowhere else: a sign-out must not
    wait for a module.
 *
 * Returns false when the sign-in was cancelled while the module was loading.
 * That is the exact boundary finding 2 was reproduced at, and the second
 * owner set below is the mutation it was reproduced on. */
async function setLearningOwnerNow(owner: CacheOwner | null, signIn: SignIn): Promise<boolean> {
  if (!signIn.current()) {
    settleOnCurrentOwner();
    return false;
  }
  setCurrentOwner(owner);
  await learning();
  if (!signIn.current()) {
    settleOnCurrentOwner();
    return false;
  }
  setLearningOwner(owner);
  return true;
}

/** How the learning tables are reached, or null when accounts are not
    configured here. The access token is read fresh on every request, so a
    refreshed session is picked up and a signed-out one simply stops. */
function learningTransport(): SyncTransport | null {
  const url = import.meta.env?.PUBLIC_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  return createRestTransport({
    baseUrl: url,
    apiKey: anonKey,
    accessToken: async () => {
      const sb = getSupabase();
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data.session?.access_token ?? null;
    },
  });
}

async function startLearningFor(userId: string, signIn: SignIn): Promise<void> {
  try {
    const module = await learning();
    if (!signIn.current()) {
      settleOnCurrentOwner();
      return;
    }
    await startLearningSync(userId, {
      transport: learningTransport(),
      /* The layer moves owners of its own accord when it starts and stops,
         so it is handed the same question every step here asks rather than
         being trusted to be called at the right moment. */
      stillCurrent: () => signIn.current(),
      setOwner: module
        ? (owner) => {
            if (!signIn.current()) {
              settleOnCurrentOwner();
              return;
            }
            setLearningOwner(owner);
          }
        : undefined,
    });
  } catch {
    /* The learning sync is an addition. It fails quietly and the student
       keeps working on this device, which is what the status says. */
  }
}

/* ── Start and stop ──────────────────────────────────────────────────────── */

/** Begin syncing for a signed-in user: merge cloud ↔ local, then keep pushing
    local changes. Safe to call repeatedly; it resets any prior subscription. */
export async function startSyncForUser(user: User): Promise<void> {
  // Idempotent across multiple mounted account widgets: if we're already syncing
  // this user, don't tear down and re-pull.
  if (currentUserId === user.id && unsub.length) return;
  const incoming = userOwner(user.id);
  let signIn!: SignIn;
  /* THE OWNER COMES FIRST, before any legacy read, merge, migration or
     upload, and it moves ONCE (see the header). Whatever was running is
     stopped and cancelled either way; the owner is reset only when it is
     somebody other than the incoming student, and then the reset and the
     move to the incoming student are announced as the one change they are.
     From the end of this block on, getProgress() and loadStudyPlan() answer
     with THIS student's own copy on this device, and the previous student's
     copies stay under their own id where nobody else can read them. */
  moveOwnerOnce(() => {
    const alreadyTheirs = sameOwner(currentOwner(), incoming);
    endSync(alreadyTheirs ? 'keep-owner' : 'reset-owner');
    currentUserId = user.id;
    signIn = beginSignIn();
    setCurrentOwner(incoming);
  });

  /* The same owner again, for the learner record and the plan once the
     learning module has loaded (the shared owner above is already there, so
     this moves nothing and announces nothing). A false answer means this
     sign-in was abandoned while the learning module was loading: every
     store has been left with the owner that replaced it, and there is
     nothing further to do. */
  if (!(await setLearningOwnerNow(incoming, signIn))) return;

  const remote = await pull(user.id);
  /* A pull that comes back after a sign-out or an account switch is thrown
     away rather than merged: the stores it would be written into no longer
     belong to the student who asked for it. */
  if (!signIn.current() || !stillSignedInAs(user.id)) {
    settleOnCurrentOwner();
    return;
  }

  const mergedProgress = remote ? mergeProgress(getProgress(), remote.progress) : getProgress();
  const mergedPlan = remote ? mergeStudyPlans(loadStudyPlan(), remote.study_plan) : loadStudyPlan();

  // Apply the merged state locally (no subscription yet, so no echo).
  applyingRemote = true;
  try {
    replaceProgress(mergedProgress);
    if (mergedPlan) saveStudyPlan(mergedPlan);
  } finally {
    applyingRemote = false;
  }

  // Push the reconciled result up (first-login migration + reconciliation).
  await push(user.id, signIn);
  /* Subscriptions are a mutation too. A cancelled sign-in that added them
     would leave this device pushing for a student nobody is signed in as,
     and the sign-out that cancelled it has already emptied the list it would
     have been removed from. */
  if (!signIn.current()) {
    settleOnCurrentOwner();
    return;
  }

  // From here, local activity syncs to the cloud.
  const onChange = () => {
    if (!applyingRemote && currentUserId) schedulePush(currentUserId);
  };
  unsub.push(onProgressChange(onChange));
  unsub.push(onStudyPlanChange(onChange));

  // The learner record, the personal plan and the companion stores, on their
  // own tables, beside everything above. The owner they use was already set
  // at the top of this function; this is what starts the sync itself.
  await startLearningFor(user.id, signIn);
}

/** Stop syncing (sign-out, or switching to another account).
 *
 * NOTHING A STUDENT SAVED IS DELETED. `ielts.progress.v1` and
 * `ielts.studyplan.v1` are read by the writing, speaking and score history
 * screens; emptying them on sign-out would delete a student's history from
 * their own machine. Since 22 September 2026 they are owned like everything
 * else: the owner goes back to this device's anonymous one here, so the next
 * person at this browser sees their own (empty) copy, while the student who
 * just left keeps theirs on this machine under their own id, where no other
 * session can read it. That is exactly what the newer stores already did
 * (see LEGACY_MIGRATION_OWNER_KEY and LEGACY_ADOPTION_KEY in
 * src/lib/learning/contracts/sync.ts, and src/lib/store-owner.ts).
 *
 * WHAT IS FIXED HERE is the half the architecture calls out in section 1.4:
 * this function used to leave the signed-in student loaded in memory, so the
 * next screen to ask still got their work. It now moves both learning stores
 * off that student, and the sync layer removes their cached copy from the
 * device once the account has everything (it keeps it when something is still
 * waiting to be sent, because losing a student's work is the worse mistake,
 * and that copy is namespaced by user id so no other session can read it). */
export function stopSync(): void {
  /* One change, to this device's anonymous owner, announced once every
     store has moved (the learning layer's teardown moves the owner itself,
     and endSync moves it again for when the layer never started). */
  moveOwnerOnce(() => endSync('reset-owner'));
}

/** What stopSync does, and what a sign-in does first.
 *
 * 'reset-owner' is a sign-out, or the first half of a sign-in for somebody
 * other than the current owner: every store goes back to this device's
 * anonymous owner, and the learning layer forgets the student who left.
 * 'keep-owner' is a sign-in for the student who is ALREADY the owner (a
 * signed-in page load, or the account answering twice for the same student):
 * everything running is stopped and cancelled exactly as for a reset, and
 * the owner, with the learning module's stores, is left where it is,
 * because the sign-in that follows would only set it back. Nothing is
 * forgotten either: the student is not leaving.
 *
 * Synchronous throughout, so the caller's moveOwnerOnce covers every owner
 * move in it. */
function endSync(owner: 'reset-owner' | 'keep-owner'): void {
  /* Cancels whatever sign-in is in flight, wherever it happens to be
     waiting. Every step of it asks `signIn.current()` before it moves an
     owner, writes a store, sends a request or adds a subscription, so this
     one line is the whole of "stop" as far as those steps are concerned. */
  generation += 1;
  for (const u of unsub) u();
  unsub = [];
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  currentUserId = null;

  /* The layer's teardown pushes nothing and awaits nothing, so its whole
     body runs before this line returns: there is no window in which a screen
     could still read the student who just signed out.
     With 'keep-owner' there is normally no layer serving anybody: a layer
     serving this student means their sign-in finished, and a finished
     sign-in returns at the top of startSyncForUser. It is stopped anyway,
     so a layer tied to a cancelled sign-in is never reused; should it reset
     the owner on its way out, that happens inside the caller's
     moveOwnerOnce and the sign-in's own owner set straight after undoes it,
     so nothing is announced. */
  void stopLearningSync({ forget: owner === 'reset-owner' }).catch(() => {
    /* The owner reset below is the part that matters and happens anyway. */
  });
  if (owner === 'keep-owner') return;
  /* Belt and braces, and the only path when the layer was never started
     (accounts unconfigured, or the learning module failed to load). */
  setLearningOwner(null);
}
