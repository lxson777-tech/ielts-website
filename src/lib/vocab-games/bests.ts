/* Personal bests for the vocabulary games: the fastest Match per topic and
   the best Sprint score per topic (a mixed set is its own "topic", `mixed`).

   Kept on this device under the owner's own key (VOCAB_GAMES_STORE_KEY in
   src/lib/store-owner.ts, scoped per owner like the review store), so a
   second student on the same browser never sees the first one's times, and
   listed with the older stores so a signed-out student's bests come along
   when they claim their work into an account. A best is a little reward,
   not evidence: the learner record and the review store hold what was
   actually answered.

   The rules are pure (recordMatchTime, recordSprintScore, mergeBests); the
   two browser functions below them are thin. */

import type { CacheOwner } from '../learning/contracts/sync';
import {
  VOCAB_GAMES_STORE_KEY,
  deviceStorage,
  registerLegacyStoreMerge,
  safeGet,
  safeSet,
  scopedKeyIn,
} from '../store-owner';

export const MIXED_KEY = 'mixed';

export interface MatchBest {
  ms: number;
  mistakes: number;
  at: string;
}

export interface SprintBest {
  score: number;
  at: string;
}

export interface GameBestsV1 {
  version: 1;
  match: Record<string, MatchBest>;
  sprint: Record<string, SprintBest>;
}

export function emptyBests(): GameBestsV1 {
  return { version: 1, match: {}, sprint: {} };
}

export function bestsKey(topicSlug: string | null): string {
  return topicSlug ?? MIXED_KEY;
}

/** Faster wins; at the same time, fewer mistakes. `isBest` is true for a
    new best, including the first time. */
export function recordMatchTime(
  bests: GameBestsV1,
  key: string,
  ms: number,
  mistakes: number,
  at: string,
): { bests: GameBestsV1; isBest: boolean; previous: MatchBest | null } {
  const previous = bests.match[key] ?? null;
  const isBest = !previous || ms < previous.ms || (ms === previous.ms && mistakes < previous.mistakes);
  if (!isBest) return { bests, isBest, previous };
  return { bests: { ...bests, match: { ...bests.match, [key]: { ms, mistakes, at } } }, isBest, previous };
}

/** Higher wins. A score of 0 is never a best worth keeping. */
export function recordSprintScore(
  bests: GameBestsV1,
  key: string,
  score: number,
  at: string,
): { bests: GameBestsV1; isBest: boolean; previous: SprintBest | null } {
  const previous = bests.sprint[key] ?? null;
  const isBest = score > 0 && (!previous || score > previous.score);
  if (!isBest) return { bests, isBest, previous };
  return { bests: { ...bests, sprint: { ...bests.sprint, [key]: { score, at } } }, isBest, previous };
}

/** Two copies joined, the better of each kept. */
export function mergeBests(a: GameBestsV1, b: GameBestsV1): GameBestsV1 {
  const out = emptyBests();
  for (const [key, best] of [...Object.entries(a.match), ...Object.entries(b.match)]) {
    const held = out.match[key];
    if (!held || best.ms < held.ms || (best.ms === held.ms && best.mistakes < held.mistakes)) out.match[key] = best;
  }
  for (const [key, best] of [...Object.entries(a.sprint), ...Object.entries(b.sprint)]) {
    const held = out.sprint[key];
    if (!held || best.score > held.score) out.sprint[key] = best;
  }
  return out;
}

export function parseBests(raw: string | null): GameBestsV1 {
  if (!raw) return emptyBests();
  try {
    const parsed = JSON.parse(raw) as Partial<GameBestsV1>;
    if (parsed?.version !== 1) return emptyBests();
    const clean = emptyBests();
    for (const [key, best] of Object.entries(parsed.match ?? {})) {
      if (best && typeof best.ms === 'number' && best.ms > 0) clean.match[key] = { ms: best.ms, mistakes: Number(best.mistakes) || 0, at: String(best.at ?? '') };
    }
    for (const [key, best] of Object.entries(parsed.sprint ?? {})) {
      if (best && typeof best.score === 'number' && best.score > 0) clean.sprint[key] = { score: best.score, at: String(best.at ?? '') };
    }
    return clean;
  } catch {
    return emptyBests();
  }
}

/* ── This device ─────────────────────────────────────────────────────────── */

export function loadBestsFor(owner: CacheOwner): GameBestsV1 {
  const storage = deviceStorage();
  if (!storage) return emptyBests();
  return parseBests(safeGet(storage, scopedKeyIn(storage, VOCAB_GAMES_STORE_KEY, owner)));
}

export function saveBestsFor(owner: CacheOwner, bests: GameBestsV1): void {
  const storage = deviceStorage();
  if (!storage) return;
  safeSet(storage, scopedKeyIn(storage, VOCAB_GAMES_STORE_KEY, owner), JSON.stringify(bests));
}

/* The claim joins a signed-out student's bests to their account's. */
registerLegacyStoreMerge(VOCAB_GAMES_STORE_KEY, (mine, theirs) =>
  JSON.stringify(mergeBests(parseBests(mine), parseBests(theirs))),
);
