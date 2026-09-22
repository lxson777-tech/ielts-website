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
import { currentOwner, sameOwner, setCurrentOwner, userOwner } from '../store-owner';
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
/* Bumped by every start and stop. A slow pull checks it before it applies
   anything, so a reply meant for the student who just signed out can never
   be written into the next student's stores. */
let generation = 0;
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

async function push(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
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

/** The same, but waiting for the learning module to load first, so a sign-in
    has genuinely moved every store before it reads one. Used at the top of
    startSyncForUser and nowhere else: a sign-out must not wait for a module. */
async function setLearningOwnerNow(owner: CacheOwner | null): Promise<void> {
  setCurrentOwner(owner);
  await learning();
  setLearningOwner(owner);
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

async function startLearningFor(userId: string): Promise<void> {
  try {
    const module = await learning();
    await startLearningSync(userId, {
      transport: learningTransport(),
      setOwner: module ? (owner) => setLearningOwner(owner) : undefined,
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
  stopSync();
  currentUserId = user.id;
  const run = ++generation;

  /* THE OWNER COMES FIRST, before any legacy read, merge, migration or
     upload. From this line on, getProgress() and loadStudyPlan() answer with
     THIS student's own copy on this device, and the previous student's
     copies stay under their own id where nobody else can read them. */
  await setLearningOwnerNow(userOwner(user.id));
  if (run !== generation) return;

  const remote = await pull(user.id);
  /* A pull that comes back after a sign-out or an account switch is thrown
     away rather than merged: the stores it would be written into no longer
     belong to the student who asked for it. */
  if (run !== generation || !stillSignedInAs(user.id)) return;

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
  await push(user.id);
  if (run !== generation) return;

  // From here, local activity syncs to the cloud.
  const onChange = () => {
    if (!applyingRemote && currentUserId) schedulePush(currentUserId);
  };
  unsub.push(onProgressChange(onChange));
  unsub.push(onStudyPlanChange(onChange));

  // The learner record, the personal plan and the companion stores, on their
  // own tables, beside everything above. The owner they use was already set
  // at the top of this function; this is what starts the sync itself.
  await startLearningFor(user.id);
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
     could still read the student who just signed out. */
  void stopLearningSync({ forget: true }).catch(() => {
    /* The owner reset below is the part that matters and happens anyway. */
  });
  /* Belt and braces, and the only path when the layer was never started
     (accounts unconfigured, or the learning module failed to load). */
  setLearningOwner(null);
}
