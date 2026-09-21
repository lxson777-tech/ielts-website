/* "Work on your overview": the calm hand-off from a marked Writing report.
 *
 * WP20 (2026-09-22) generalised this from Task 1 overviews alone to every
 * Writing objective this package and Pilot B taught: the export name, the
 * file name and the props shape are unchanged, because WritingTester.tsx
 * imports it by both, and nothing about this component's job changed, only
 * how many objectives it can recognise.
 *
 * This is the FIND A GAP end of the teaching cycle, and the two things it
 * must not do are the reason it exists as its own component.
 *
 * IT NEVER GUESSES. The card only appears when there is real evidence:
 * the examiner who marked this very report said something about ONE
 * objective (findWritingGap in written-focused-task.ts, which tries the
 * overview first and then every other WP20 objective in a fixed order), in
 * which case the student reads the marker's own sentence word for word, or
 * a plain check of the essay found something checkable, in which case it
 * says so and calls itself a check. Nothing found means nothing appears.
 *
 * IT OFFERS AT MOST ONE HAND-OFF. findWritingGap returns the first
 * objective with something real to say and stops there; this component
 * never shows more than the one card that follows from it.
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
  findWritingGap,
  writingHandoffText,
  type GradedWritingAttempt,
} from './written-focused-task';
import '../../styles/learning-writing-focus.css';

export interface WorkOnOverviewProps {
  /** The report that was just marked, in exactly the shape
      src/lib/progress.ts stores. */
  attempt: GradedWritingAttempt;
}

export default function WorkOnOverview({ attempt }: WorkOnOverviewProps) {
  const { t } = useT();
  const [added, setAdded] = useState<{ isNow: boolean } | null>(null);

  const finding = findWritingGap([attempt]);
  const text = finding ? writingHandoffText(finding) : null;
  if (!finding || !text) return null;

  /* The guided task this objective's hand-off points at. `chooseObjective`
     carries the OBJECTIVE (the scope key below), not just this one
     activity id, so even a student who has already worked this exact task
     still gets the planner's own pick for the objective. */
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
        <a className="overview-handoff-link" href={withBase(focusedExerciseHref(finding.handoffTaskId))}>
          {t('Try a short focused task')}
        </a>
      )}

      <p className="overview-handoff-note">
        {t('A few minutes on this one thing. It never changes the band above, which stays what the examiner gave this report.')}
      </p>
    </div>
  );
}
