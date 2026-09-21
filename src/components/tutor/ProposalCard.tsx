/* One recommendation from Mr EZ, reconciled against the student's real
   plan before it is ever called "next".

   Shared by ExplainResult and TestDebrief, the two places a reply can carry
   a follow-up suggestion outside of the plan itself. Three honest states:

   - the suggestion IS the student's current session (say so, no duplicate
     offer);
   - it is a real, schedulable activity the student can add ("Do this next"
     calls chooseObjective, a recorded override, never a silent replan);
   - it cannot be reconciled at all (a hub link such as the Reading trainer,
     not one exact activity) and is shown as a plain suggestion with nothing
     to add.

   `chooseObjective` only ever WINS TODAY'S TIE when the planner already has
   a candidate for that scope (see src/lib/learning/planner.ts). Vocabulary
   review has no candidate objective yet (architecture stage 5), so an
   accepted proposal there is recorded honestly rather than mis-reported as
   an immediate change: the card checks the session again after accepting
   and says which happened. */

import { useState } from 'react';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import { chooseObjective } from '../../lib/learning';
import { currentSharedSession } from '../../lib/learning/adapters';
import { learningCatalogue } from '../../lib/learning/catalog';
import { reconcileProposal } from './proposalReconcile';
import type { TutorRecommendation } from '../../lib/tutor/schema';
import '../../styles/learning-progress.css';

export interface ProposalCardProps {
  recommendation: TutorRecommendation;
}

type Accepted = { activityId: string; matchedNow: boolean };

export default function ProposalCard({ recommendation }: ProposalCardProps) {
  const { t } = useT();
  const [accepted, setAccepted] = useState<Accepted | null>(null);

  const session = currentSharedSession();
  const reconciliation = reconcileProposal(
    recommendation.id,
    session ? { activityId: session.activityId, objectiveScope: session.objectiveScope } : null,
    learningCatalogue(),
  );

  function acceptProposal(scopeKey: string, activityId: string) {
    chooseObjective(scopeKey, activityId);
    const after = currentSharedSession();
    setAccepted({ activityId, matchedNow: after?.activityId === activityId });
  }

  if (accepted) {
    return (
      <div className="mrez-rec mrez-proposal is-added">
        <span className="mrez-rec-label">
          {accepted.matchedNow
            ? t('Added. This is your next step now.')
            : t('Added to your plan. It will come up as your next step when it fits your schedule.')}
        </span>
        {accepted.matchedNow && (
          <a className="mrez-proposal-goto" href={withBase(recommendation.href)}>
            {t(recommendation.label)}
          </a>
        )}
      </div>
    );
  }

  if (reconciliation.state === 'matches-current') {
    return (
      <div className="mrez-rec mrez-proposal is-current">
        <span className="mrez-rec-label">{t('This is already your next step.')}</span>
        <span className="mrez-rec-reason">{recommendation.reason}</span>
      </div>
    );
  }

  if (reconciliation.state === 'reconcilable') {
    const { scopeKey, activityId } = reconciliation;
    return (
      <div className="mrez-rec mrez-proposal is-suggestion">
        <span className="mrez-proposal-kicker">{t('A suggestion for later')}</span>
        <span className="mrez-rec-label">
          {/* A lesson title arrives English from the Worker and is
              translated here; anything already translated passes through
              unchanged. */}
          {t(recommendation.label)}
        </span>
        <span className="mrez-rec-reason">{recommendation.reason}</span>
        <div className="mrez-proposal-actions">
          <button
            type="button"
            className="mrez-proposal-button"
            onClick={() => acceptProposal(scopeKey, activityId)}
          >
            {t('Do this next')}
          </button>
        </div>
      </div>
    );
  }

  // Unresolvable: a real note from Mr EZ, but not one exact schedulable
  // activity (a hub such as the Reading trainer). Shown plainly, with
  // nothing offered to add to the plan, so it is never mistaken for one.
  return (
    <div className="mrez-rec mrez-proposal is-unresolvable">
      <span className="mrez-proposal-kicker">{t('Worth a look, not on your plan yet')}</span>
      <a className="mrez-rec-label" href={withBase(recommendation.href)}>
        {t(recommendation.label)}
      </a>
      <span className="mrez-rec-reason">{recommendation.reason}</span>
    </div>
  );
}
