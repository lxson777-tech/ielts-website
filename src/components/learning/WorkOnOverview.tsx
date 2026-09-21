/* "Work on your overview": the calm hand-off from a marked Task 1 report.
 *
 * This is the FIND A GAP end of the teaching cycle, and the two things it
 * must not do are the reason it exists as its own component.
 *
 * IT NEVER GUESSES. The card only appears when there is real evidence: the
 * examiner who marked this very report said something about the overview,
 * in which case the student reads the marker's own sentence word for word,
 * or a plain check of their own essay found no summarising sentence in it,
 * in which case it says so and calls itself a check. If the marker liked
 * the overview and the check found nothing, nothing appears.
 *
 * IT NEVER CREATES A SECOND NEXT STEP. A suggestion is not a plan. It is
 * reconciled against the shared session exactly the way
 * ./tutor/ProposalCard.tsx reconciles one: already the current session,
 * something `chooseObjective` can add as a recorded student override, or
 * not schedulable at all. Three honest answers, no fourth.
 */

import { useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { chooseObjective } from '../../lib/learning';
import { currentSharedSession } from '../../lib/learning/adapters';
import { focusedActivityId, learningCatalogue } from '../../lib/learning/catalog';
import { focusedExerciseHref } from '../../data/focused-exercises';
import { reconcileProposal } from '../tutor/proposalReconcile';
import {
  findOverviewGap,
  overviewHandoffText,
  type GradedWritingAttempt,
} from './written-focused-task';
import '../../styles/learning-writing-focus.css';

/** The guided task this hand-off points at. Named here rather than searched
    for, because it is the one piece of the pilot that teaches the objective
    with the prompt's own guiding questions available; if the student has
    already worked it, `chooseObjective` still carries the OBJECTIVE and the
    planner picks the right material for it. */
const GUIDED_TASK_ID = 'writing-task1-overview-guided';

export interface WorkOnOverviewProps {
  /** The report that was just marked, in exactly the shape
      src/lib/progress.ts stores. */
  attempt: GradedWritingAttempt;
}

export default function WorkOnOverview({ attempt }: WorkOnOverviewProps) {
  const { t } = useT();
  const [added, setAdded] = useState<{ isNow: boolean } | null>(null);

  const finding = findOverviewGap([attempt]);
  const text = overviewHandoffText(finding);
  if (!text) return null;

  const activityId = focusedActivityId(GUIDED_TASK_ID);
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
    <div className="overview-handoff">
      <p className="overview-handoff-kicker">{t(text.headlineKey)}</p>
      <p className="overview-handoff-body">{t(text.bodyKey)}</p>

      {/* The marker's own words, in English, because that is what an
          examiner wrote about this student's own report. Everything around
          it is translated. */}
      {text.quote && <blockquote className="overview-handoff-quote">{text.quote}</blockquote>}
      {text.sourceKey && <p className="overview-handoff-source">{t(text.sourceKey)}</p>}

      {added ? (
        <p className="overview-handoff-added">
          {added.isNow
            ? t('Added. This is your next step now.')
            : t('Added to your plan. It will come up as your next step when it fits your schedule.')}
        </p>
      ) : reconciliation.state === 'matches-current' ? (
        <p className="overview-handoff-added">{t('This is already your next step.')}</p>
      ) : reconciliation.state === 'reconcilable' ? (
        <button
          type="button"
          className="overview-handoff-action"
          onClick={() => accept(reconciliation.scopeKey, reconciliation.activityId)}
        >
          {t('Work on this next')}
        </button>
      ) : (
        /* Not schedulable for this student right now. A real link, and
           nothing offered to add, so it is never mistaken for the plan. */
        <a className="overview-handoff-link" href={withBase(focusedExerciseHref(GUIDED_TASK_ID))}>
          {t('Try a short overview task')}
        </a>
      )}

      <p className="overview-handoff-note">
        {t('Eight minutes on the overview alone. It never changes the band above, which stays what the examiner gave this report.')}
      </p>
    </div>
  );
}
