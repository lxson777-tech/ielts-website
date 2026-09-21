/* Pure logic for TestsHubCheckpoints.tsx: which candidate to show, and how
 * to label it. Split out so "the hub agrees with the shared session" is one
 * small, directly testable rule rather than something only provable by
 * mounting the island.
 *
 * THE RULE
 * When today's plan already has a checkpoint queued for a skill (a session
 * step with role 'assess' pointing at a real full paper), the hub shows
 * exactly that paper. Only when the plan has nothing of the kind does it
 * fall back to checkpoints.ts's own ranking. This file never calls replan()
 * or computes a next step of its own: it only reads the session it is
 * handed and reconciles it with a ranking it is handed, which is what
 * "never a competing next step" means in practice. */

import type { SharedSessionView } from '../../lib/learning';
import type { CheckpointCandidate } from '../../lib/learning/checkpoints';

export const SKILLS = ['reading', 'listening'] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LABEL: Record<Skill, string> = { reading: 'Reading', listening: 'Listening' };

export function badgeText(
  candidate: Pick<CheckpointCandidate, 'status' | 'seenShare'>,
  t: (s: string, vars?: Record<string, string | number>) => string,
): string {
  if (candidate.status === 'unseen') return t('Unseen');
  if (candidate.status === 'seen') return t('Already sat');
  return t('Partly seen · {percent}%', { percent: Math.round(candidate.seenShare * 100) });
}

export function badgeClass(status: CheckpointCandidate['status']): string {
  if (status === 'unseen') return 'bg-success-tint text-success';
  if (status === 'seen') return 'bg-surface-alt text-ink-muted';
  return 'bg-warning-tint text-ink';
}

/** The plan's own queued checkpoint for this skill, when it has one: a
    session step whose role is 'assess' and whose activity is a real full
    paper of this skill (not the mock, and not the hub link 'test:reading',
    which names no exact paper). */
export function planCheckpointFor(session: SharedSessionView | null, skill: Skill): { activityId: string } | null {
  if (!session) return null;
  const step = session.steps.find(
    (s) => s.role === 'assess' && s.paper === skill && s.kind === 'full-test' && s.activityId !== 'test:mock',
  );
  return step ? { activityId: step.activityId } : null;
}

/** paperActivityId() in catalog.ts is `test:<testId>`; the two fixed hub
    links ('test:reading', 'test:listening') are not real papers and never
    match a real candidate, which is exactly what should happen when the
    plan has queued one of those instead of an exact paper. */
export function testIdFromActivityId(activityId: string): string | null {
  return activityId.startsWith('test:') ? activityId.slice('test:'.length) : null;
}

export interface RecommendedCheckpoint {
  candidate: CheckpointCandidate;
  /** True when this is the plan's own queued checkpoint, not a fresh
      computation from checkpoints.ts. */
  fromPlan: boolean;
}

/** The one candidate to show for this skill: the plan's queued paper when
    it named one that the ranking also knows about, otherwise the top of the
    ranking. Null only when the ranking itself is empty (no real papers of
    this skill in the catalogue at all). */
export function recommendedCheckpoint(
  session: SharedSessionView | null,
  skill: Skill,
  ranking: readonly CheckpointCandidate[],
): RecommendedCheckpoint | null {
  const planned = planCheckpointFor(session, skill);
  const plannedTestId = planned ? testIdFromActivityId(planned.activityId) : null;
  const plannedCandidate = plannedTestId ? ranking.find((c) => c.testId === plannedTestId) : undefined;
  if (plannedCandidate) return { candidate: plannedCandidate, fromPlan: true };
  const top = ranking[0];
  return top ? { candidate: top, fromPlan: false } : null;
}
