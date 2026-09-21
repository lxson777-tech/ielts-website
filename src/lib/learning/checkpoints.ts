/* Which full paper is worth sitting as an independent checkpoint, and why.
 *
 * `session.ts`'s own `checkpointPaper()` answers one narrow question for the
 * planner: the single shortest paper this student has never touched, or
 * nothing at all. That is exactly right for assembling a session, but it
 * cannot answer what the tests hub needs to show honestly: every paper,
 * ranked, each with a plain reason, including the ones that are not fully
 * unseen (a paper only drilled once, or only met through a lesson check, is
 * not the same as a paper never opened at all). This file is that fuller
 * picture, built from the same exposure log.
 *
 * PURE, LIKE EVERYTHING ELSE UNDER src/lib/learning
 * No storage, no clock, no network. `index` is the small generated index
 * (GeneratedIndexV1, see contracts/catalog.ts), never the 3.7 MiB of real
 * passages, so this keeps the same import boundary the rest of the learning
 * layer holds to (see tests/learning-index.test.ts).
 *
 * SEEN SHARE, NOT JUST SEEN OR UNSEEN
 * A paper's questions can turn up in more than one place: a single-part
 * drill lifted from it, a lesson quick check quoting one of its questions, a
 * focused exercise built on it. Each of those adds `item:<testId>:<qid>`
 * exposure keys for exactly the questions it used, which is enough to say
 * what FRACTION of the paper has already come up, not only whether any of
 * it has. `isUnseen()` in session.ts stays binary on purpose (an eligibility
 * gate has to be yes or no); this file adds the fraction on top, for the
 * interface to say honestly.
 *
 * RESERVED PAPERS
 * A handful of papers are held back so a focused independent-check exercise
 * (Pilot A/B's unseen sets, and whatever the other builders on this stage
 * add) always has fresh material of its own. See CHECK_ONLY_TAG in
 * catalog.ts. Offering those same papers as ordinary checkpoints first would
 * spend them before the smaller check ever gets to use them, so this file
 * pushes them behind every other unseen paper, and only offers them once
 * nothing else unseen is left. The set is read off the catalogue's own
 * focused-exercise tags, never hand-listed, so a builder reserving another
 * paper is picked up automatically.
 */

import type { CatalogueActivity, GeneratedIndexV1, LearningCatalogueV1, Paper } from './contracts/catalog';
import type { LearnerRecordV1 } from './contracts/evidence';
import { itemExposureKey, paperExposureKey, seenKeys } from './evidence';

/* ── The reason, kept as a key plus variables ────────────────────────────── */

/* Sentences live here as plain English literals, the same choice session.ts
   makes for SESSION_SENTENCES: the caller wraps them with t() at the point
   they are actually shown, because this module has no business deciding
   which language that is. Keeping the key and the sentence text next to
   each other is what makes that one future edit rather than a search. */
export type CheckpointReasonKey = 'unseen' | 'unseen-reserved' | 'partly-seen' | 'seen';

export const CHECKPOINT_REASON_SENTENCES: Record<CheckpointReasonKey, string> = {
  unseen:
    'None of this paper has come up before, so a result here is about where you really stand, not what you remember.',
  'unseen-reserved':
    'Held back for a short independent check elsewhere in the plan. Still usable here once nothing else is unseen.',
  'partly-seen':
    'About {percent}% of this paper has already come up in practice, so a fresh result here is partly about material you have already met.',
  seen: 'This whole paper has already been used. Sitting it again is useful practice, but it cannot raise certainty, because none of it is unseen.',
};

export interface CheckpointReason {
  key: CheckpointReasonKey;
  vars?: { percent: number };
}

export type CheckpointStatus = 'unseen' | 'partly-seen' | 'seen';

export interface CheckpointCandidate {
  activity: CatalogueActivity;
  testId: string;
  paper: Paper;
  status: CheckpointStatus;
  /** 0 to 1: the fraction of this paper's own questions already met, from
      any source (a drill, a lesson check, a focused exercise, or a full
      sitting). 0 for a genuinely unseen paper, 1 for one already used
      whole. */
  seenShare: number;
  /** True when a focused independent-check exercise draws on this paper,
      which is why it is offered last among the unseen ones. */
  reservedForChecks: boolean;
  reason: CheckpointReason;
}

/* ── Reading the catalogue and the index ─────────────────────────────────── */

/** Every real full paper for one skill, i.e. the ones buildPaperActivities
    produced (they carry exactly one sourcePaperIds entry, the real test id).
    The fixed hub links ('test:reading', 'test:listening', 'test:mock') are
    not real papers and are filtered out by the same check. */
function paperActivitiesFor(paper: Paper, catalogue: LearningCatalogueV1): CatalogueActivity[] {
  return catalogue.activities.filter(
    (activity) =>
      activity.kind === 'full-test' &&
      activity.paper === paper &&
      (activity.sourcePaperIds ?? []).length === 1,
  );
}

/** Papers a focused independent-check exercise is built on, read off the
    catalogue rather than hand-listed, so a paper another builder reserves is
    picked up with no change here. Mirrors reservedCheckPapers() in
    catalog.ts, which is not exported; this is the same rule, derived from
    the same public tags instead of the private index it is built from. */
function reservedTestIds(catalogue: LearningCatalogueV1): ReadonlySet<string> {
  const out = new Set<string>();
  for (const activity of catalogue.activities) {
    if (activity.kind !== 'focused-exercise') continue;
    if (!(activity.tags ?? []).includes('check-only')) continue;
    for (const testId of activity.sourcePaperIds ?? []) out.add(testId);
  }
  return out;
}

/** The fraction of one paper's own questions this student has already met,
    from the exposure log. A paper-level exposure key (met as a whole, by a
    full sitting or a legacy row with no item detail) always reads as fully
    seen, even when the item-level count alone would read lower. */
function seenShareOf(testId: string, index: GeneratedIndexV1, seen: ReadonlySet<string>): number {
  if (seen.has(paperExposureKey(testId))) return 1;
  const entry = index.tests.find((t) => t.id === testId);
  if (!entry || entry.questionIds.length === 0) return 0;
  const metCount = entry.questionIds.filter((qid) => seen.has(itemExposureKey(`${testId}:${qid}`))).length;
  return metCount / entry.questionIds.length;
}

function statusOf(seenShare: number): CheckpointStatus {
  if (seenShare <= 0) return 'unseen';
  if (seenShare >= 1) return 'seen';
  return 'partly-seen';
}

function reasonFor(status: CheckpointStatus, reserved: boolean, seenShare: number): CheckpointReason {
  if (status === 'unseen') return { key: reserved ? 'unseen-reserved' : 'unseen' };
  if (status === 'seen') return { key: 'seen' };
  return { key: 'partly-seen', vars: { percent: Math.round(seenShare * 100) } };
}

/** Tie-break for candidates that are otherwise equally good: shortest first,
    then by id, the same rule checkpointPaper() in session.ts uses, so the
    two never quietly disagree about which paper is "first" among equals. */
function tieBreak(a: CatalogueActivity, b: CatalogueActivity): number {
  return a.expectedMinutes - b.expectedMinutes || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Every full paper of one skill, ranked for use as an independent
 *  checkpoint: never-seen papers first (the ones held back for a smaller
 *  independent check last among those, since an ordinary checkpoint should
 *  not spend them while a genuine alternative exists), then papers only
 *  partly met (least-seen first), then papers already used whole. Each
 *  candidate carries the honest reason a surface can show next to it. */
export function rankCheckpoints(
  paper: Paper,
  catalogue: LearningCatalogueV1,
  index: GeneratedIndexV1,
  record: LearnerRecordV1,
): readonly CheckpointCandidate[] {
  const seen = seenKeys(record);
  const reserved = reservedTestIds(catalogue);

  const candidates: CheckpointCandidate[] = paperActivitiesFor(paper, catalogue).map((activity) => {
    const testId = activity.sourcePaperIds![0]!;
    const seenShare = seenShareOf(testId, index, seen);
    const status = statusOf(seenShare);
    const isReserved = reserved.has(testId);
    return {
      activity,
      testId,
      paper,
      status,
      seenShare,
      reservedForChecks: isReserved,
      reason: reasonFor(status, isReserved, seenShare),
    };
  });

  const rank = (c: CheckpointCandidate): number => {
    if (c.status === 'unseen' && !c.reservedForChecks) return 0;
    if (c.status === 'unseen' && c.reservedForChecks) return 1;
    if (c.status === 'partly-seen') return 2;
    return 3;
  };

  return [...candidates].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    if (rank(a) === 2) {
      // Least-seen partly-seen paper first.
      if (a.seenShare !== b.seenShare) return a.seenShare - b.seenShare;
    }
    return tieBreak(a.activity, b.activity);
  });
}

/** The one paper worth recommending right now, or undefined when this skill
    has no real papers in the catalogue at all (never happens on the real
    site, but a test fixture may be built without any). */
export function bestCheckpoint(
  paper: Paper,
  catalogue: LearningCatalogueV1,
  index: GeneratedIndexV1,
  record: LearnerRecordV1,
): CheckpointCandidate | undefined {
  return rankCheckpoints(paper, catalogue, index, record)[0];
}

/** How many papers of this skill are still genuinely available as a fresh
    checkpoint: unseen, and not one of the ones held back for a smaller
    independent check. This is the number a surface uses to say "running
    low", because a reserved-but-unseen paper is not really available for
    this purpose while an unreserved one still is. */
export function unseenCheckpointsRemaining(
  paper: Paper,
  catalogue: LearningCatalogueV1,
  index: GeneratedIndexV1,
  record: LearnerRecordV1,
): number {
  return rankCheckpoints(paper, catalogue, index, record).filter(
    (c) => c.status === 'unseen' && !c.reservedForChecks,
  ).length;
}

/** Convenience bundle for a surface that wants all three at once (the tests
    hub reads this per skill) without recomputing the ranking three times. */
export interface CheckpointReport {
  paper: Paper;
  candidates: readonly CheckpointCandidate[];
  best: CheckpointCandidate | undefined;
  unseenRemaining: number;
}

export function checkpointReport(
  paper: Paper,
  catalogue: LearningCatalogueV1,
  index: GeneratedIndexV1,
  record: LearnerRecordV1,
): CheckpointReport {
  const candidates = rankCheckpoints(paper, catalogue, index, record);
  return {
    paper,
    candidates,
    best: candidates[0],
    unseenRemaining: candidates.filter((c) => c.status === 'unseen' && !c.reservedForChecks).length,
  };
}

/** The exposure status of one exact paper, for annotating a single row in a
    catalogue listing without ranking the whole skill. Returns null when the
    paper is not a real full-test activity in the catalogue at all. */
export function checkpointStatusOf(
  testId: string,
  catalogue: LearningCatalogueV1,
  index: GeneratedIndexV1,
  record: LearnerRecordV1,
): Pick<CheckpointCandidate, 'status' | 'seenShare' | 'reservedForChecks' | 'reason'> | null {
  const activity = catalogue.activities.find(
    (a) => a.kind === 'full-test' && (a.sourcePaperIds ?? []).includes(testId) && (a.sourcePaperIds ?? []).length === 1,
  );
  if (!activity) return null;
  const seen = seenKeys(record);
  const seenShare = seenShareOf(testId, index, seen);
  const status = statusOf(seenShare);
  const isReserved = reservedTestIds(catalogue).has(testId);
  return { status, seenShare, reservedForChecks: isReserved, reason: reasonFor(status, isReserved, seenShare) };
}
