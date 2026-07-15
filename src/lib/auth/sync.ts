/* Account sync: reconciles the offline-first localStorage state with the user's
   cloud row. On sign-in we PULL the cloud row, UNION-MERGE it with whatever is
   on this device (so a plan/attempts made anonymously are never lost — that's
   the first-login migration), write the merged result back to localStorage, and
   PUSH it up. After that, any local change debounces a push to the cloud.

   Everything no-ops when accounts are unconfigured (getSupabase() → null). */

import type { User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { getProgress, replaceProgress, mergeProgress, onProgressChange, type ProgressV1 } from '../progress';
import { loadStudyPlan, saveStudyPlan, mergeStudyPlans, onStudyPlanChange, type SavedPlan } from '../study-plan';

interface Row {
  progress: ProgressV1;
  study_plan: SavedPlan | null;
}

let unsub: (() => void)[] = [];
let currentUserId: string | null = null;
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

async function push(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
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
  pushTimer = setTimeout(() => void push(userId), 1500);
}

/** Begin syncing for a signed-in user: merge cloud ↔ local, then keep pushing
    local changes. Safe to call repeatedly; it resets any prior subscription. */
export async function startSyncForUser(user: User): Promise<void> {
  // Idempotent across multiple mounted account widgets: if we're already syncing
  // this user, don't tear down and re-pull.
  if (currentUserId === user.id && unsub.length) return;
  stopSync();
  currentUserId = user.id;

  const remote = await pull(user.id);
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

  // From here, local activity syncs to the cloud.
  const onChange = () => {
    if (!applyingRemote && currentUserId) schedulePush(currentUserId);
  };
  unsub.push(onProgressChange(onChange));
  unsub.push(onStudyPlanChange(onChange));
}

/** Stop syncing (sign-out). Local data is left untouched on the device. */
export function stopSync(): void {
  for (const u of unsub) u();
  unsub = [];
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  currentUserId = null;
}
