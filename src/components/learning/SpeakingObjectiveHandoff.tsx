/* "Work on extending your answers": the calm hand-off from a graded
 * Speaking result, the Speaking half of WorkOnOverview.tsx's job.
 *
 * IT NEVER GUESSES. The card only appears when the examiner who marked
 * THIS recording said something that names one of the three objectives
 * WP20 built material for (findSpeakingGap in ./speaking-gap.ts), and the
 * student reads the marker's own sentence word for word. A stub grade is
 * never quoted as though an examiner wrote it.
 *
 * IT NEVER PROPOSES PRONUNCIATION. Lead decision Q6: a pronunciation
 * objective is set and re-checked only from a real audio-graded result,
 * through the real trainer, never from this card. See speaking-gap.ts.
 *
 * IT NEVER CREATES A SECOND NEXT STEP, on the same reconciliation
 * WorkOnOverview.tsx uses: already the current session, something
 * `chooseObjective` can add, or not schedulable at all.
 */

import { useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { chooseObjective } from '../../lib/learning';
import { currentSharedSession } from '../../lib/learning/adapters';
import { focusedActivityId, learningCatalogue } from '../../lib/learning/catalog';
import { spokenFocusedTaskHref } from '../../data/focused-exercises';
import { reconcileProposal } from '../tutor/proposalReconcile';
import { findSpeakingGap, type SpeakingMode } from './speaking-gap';
import type { SpeakingGradeResult } from '../../lib/speaking/schema';
import '../../styles/learning-speaking-focus.css';

export interface SpeakingObjectiveHandoffProps {
  result: SpeakingGradeResult;
  mode: SpeakingMode;
}

export default function SpeakingObjectiveHandoff({ result, mode }: SpeakingObjectiveHandoffProps) {
  const { t } = useT();
  const [added, setAdded] = useState<{ isNow: boolean } | null>(null);

  const finding = findSpeakingGap(result, mode);
  if (!finding.found || !finding.handoffTaskId || !finding.headlineKey) return null;

  const activityId = focusedActivityId(finding.handoffTaskId);
  const session = currentSharedSession();
  const reconciliation = reconcileProposal(
    activityId,
    session ? { activityId: session.activityId, objectiveScope: session.objectiveScope } : null,
    learningCatalogue(),
  );

  function accept(scopeKey: string, id: string) {
    chooseObjective(scopeKey, id);
    const after = currentSharedSession();
    setAdded({ isNow: after?.activityId === id });
  }

  return (
    <div className="speaking-handoff">
      <p className="speaking-handoff-kicker">{t(finding.headlineKey as string)}</p>
      <p className="speaking-handoff-body">{t('The examiner who marked this recording said something relevant here.')}</p>

      {finding.quote && <blockquote className="speaking-handoff-quote">{finding.quote}</blockquote>}
      <p className="speaking-handoff-source">{t("From the marker's own comment on this recording.")}</p>

      {added ? (
        <p className="speaking-handoff-added">
          {added.isNow
            ? t('Added. This is your next step now.')
            : t('Added to your plan. It will come up as your next step when it fits your schedule.')}
        </p>
      ) : reconciliation.state === 'matches-current' ? (
        <p className="speaking-handoff-added">{t('This is already your next step.')}</p>
      ) : reconciliation.state === 'reconcilable' ? (
        <button
          type="button"
          className="speaking-handoff-action"
          onClick={() => accept(reconciliation.scopeKey, reconciliation.activityId)}
        >
          {t('Work on this next')}
        </button>
      ) : (
        <a className="speaking-handoff-link" href={withBase(spokenFocusedTaskHref(finding.handoffTaskId))}>
          {t('Try a short self-check task')}
        </a>
      )}

      <p className="speaking-handoff-note">
        {t('A short self-check, never a grade. It never changes the band above, which stays what the examiner gave this recording.')}
      </p>
    </div>
  );
}
