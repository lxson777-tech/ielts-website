/* Turning something Mr EZ proposes into something the plan actually holds.
 *
 * "Explain this result" and the test debrief can both suggest a follow-up
 * activity, but a suggestion is not the plan: the brief is explicit that a
 * proposal must be reconciled into the shared session through
 * `chooseObjective` (a recorded student override) before it may be shown as
 * the next step, and that a proposal equal to the current session must say
 * so rather than repeat it as if it were new.
 *
 * This file only WORKS OUT which of those three things is true. It never
 * calls `chooseObjective` itself (that is a browser side effect, kept in the
 * two components), which is what makes it a pure function two synthetic
 * fixtures can pin down without a store, a plan or a clock.
 */

import type { CatalogueActivity, LearningCatalogueV1 } from '../../lib/learning/contracts/catalog';
import type { PolicyScope, PolicyScopeKey } from '../../lib/learning/contracts/policy';

/** The scope a chosen objective is recorded against, from a catalogue
 *  activity's own paper and subskill.
 *
 *  Written out rather than imported from src/lib/learning/policy.ts's
 *  `scopeKeyOf`: that file pulls in the evidence engine's sample weighing,
 *  which this component tree has no other reason to load. The string form
 *  is part of the contract (contracts/policy.ts: 'paper:reading',
 *  'subskill:reading:matching-headings', 'vocabulary', ...) and
 *  tests/learning-policy.test.ts pins scopeKeyOf against the same shapes,
 *  so the two cannot silently drift apart. */
export function scopeKeyOf(scope: PolicyScope): PolicyScopeKey {
  switch (scope.kind) {
    case 'paper':
      return `paper:${scope.paper}`;
    case 'writing-task':
      return `writing-task:${scope.task}`;
    case 'speaking-part':
      return `speaking-part:${scope.part}`;
    case 'criterion':
      return `criterion:${scope.paper}:${scope.criterion}`;
    case 'subskill':
      return `subskill:${scope.paper}:${scope.subskill}`;
    case 'vocabulary':
      return 'vocabulary';
  }
}

/** The scope `chooseObjective` should be called with for one catalogue
 *  activity, mirroring exactly the candidates
 *  src/lib/learning/planner.ts's `scoreObjectives` builds (a subskill scope
 *  keyed by the activity's own paper and subskill, or a vocabulary scope for
 *  anything in the vocabulary domain). Null when the activity has no paper
 *  and is not vocabulary (a reference or planning activity), which the
 *  planner never turns into a candidate objective either. */
export function scopeForActivity(activity: CatalogueActivity): PolicyScope | null {
  if (activity.domain === 'vocabulary') return { kind: 'vocabulary' };
  if (activity.paper) return { kind: 'subskill', paper: activity.paper, subskill: activity.subskill };
  return null;
}

/** Just enough of the shared session for this decision: the exact activity
 *  it is currently on, and the objective scope that activity belongs to.
 *  Narrowed on purpose so a test can hand in a plain object literal instead
 *  of building a whole SharedSessionView. */
export interface CurrentSessionForReconcile {
  activityId: string | null;
  objectiveScope: PolicyScopeKey;
}

export type ProposalReconciliation =
  /** The proposal names the session the student is already on, by exact
      activity or by objective. Offering it again would be a duplicate. */
  | { state: 'matches-current' }
  /** A real catalogue activity with a scope the planner understands.
      `chooseObjective(scopeKey, activityId)` is the one call that turns
      this into the next step. */
  | { state: 'reconcilable'; scopeKey: PolicyScopeKey; activityId: string }
  /** Not a real, schedulable activity (an unknown id, or one the planner
      never turns into an objective, such as a reference page). Shown as a
      plain suggestion with nothing to add to the plan. */
  | { state: 'unresolvable' };

/** Which of the three states a proposed activity id is in, for the given
 *  student and catalogue. `proposedActivityId` is `TutorRecommendation.id`:
 *  for a 'lesson:' or 'practise:' id this is already a real catalogue id
 *  (see adapters.ts `tutorActivityIdFor`); a hub id such as 'trainer:reading'
 *  never resolves here, which is the honest answer since it names an area
 *  rather than one exact schedulable thing. */
export function reconcileProposal(
  proposedActivityId: string,
  session: CurrentSessionForReconcile | null,
  catalogue: LearningCatalogueV1,
): ProposalReconciliation {
  if (session && session.activityId === proposedActivityId) return { state: 'matches-current' };

  const activity = catalogue.activities.find((candidate) => candidate.id === proposedActivityId);
  if (!activity) return { state: 'unresolvable' };

  const scope = scopeForActivity(activity);
  if (!scope) return { state: 'unresolvable' };

  const scopeKey = scopeKeyOf(scope);
  if (session && session.objectiveScope === scopeKey) return { state: 'matches-current' };

  return { state: 'reconcilable', scopeKey, activityId: activity.id };
}
