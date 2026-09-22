/* "Work on extending your answers": the calm hand-off from a graded
 * Speaking result, the Speaking half of WorkOnOverview.tsx's job.
 *
 * IT NEVER GUESSES. The card only appears when the examiner who marked THIS
 * recording said something that names the objective chosen for the ONE
 * criterion worth working on (findSpeakingGap in ./speaking-gap.ts), and the
 * student reads the marker's own sentence word for word. A stub grade is
 * never quoted as though an examiner wrote it.
 *
 * WHICH CRITERION (WP20b, 2026-09-22). findSpeakingGap reads all four
 * criteria and picks the lowest-banded one that sits below the student's
 * required Speaking band, computed here from their saved plan the same way
 * the real evidence policy does (requiredBandFor in
 * src/lib/learning/policy.ts): their own per-paper minimum for Speaking
 * where they set one, otherwise their overall target. No target set at all
 * means there is nothing honest to call "below the requirement", so nothing
 * is offered. This is what closes the coverage round's honest gap: a result
 * whose only real complaint sat in Lexical Resource or Grammatical Range
 * used to produce no hand-off at all.
 *
 * IT NEVER PROPOSES PRONUNCIATION AS A SELF-CHECK. Lead decision Q6: a
 * pronunciation objective is set and re-checked only from a real
 * audio-graded result, through the real trainer. When Pronunciation is the
 * chosen criterion, this card points at a fresh recording instead of
 * `chooseObjective`, and it maps only when the result was audio-graded
 * (see speaking-gap.ts's header on why `result.grader.live` is that
 * signal here).
 *
 * IT NEVER CREATES A SECOND NEXT STEP, on the same reconciliation
 * WorkOnOverview.tsx uses: already the current session, something
 * `chooseObjective` can add, or not schedulable at all.
 */

import { useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { chooseObjective } from '../../lib/learning';
import { currentSharedSession, goalsFrom, planSettingsFromSavedPlan } from '../../lib/learning/adapters';
import { requiredBandFor } from '../../lib/learning/policy';
import { focusedActivityId, learningCatalogue } from '../../lib/learning/catalog';
import { spokenFocusedTaskHref } from '../../data/focused-exercises';
import { loadStudyPlan } from '../../lib/study-plan';
import { reconcileProposal } from '../tutor/proposalReconcile';
import { findSpeakingGap, type SpeakingMode } from './speaking-gap';
import type { SpeakingGradeResult } from '../../lib/speaking/schema';
import '../../styles/learning-speaking-focus.css';

export interface SpeakingObjectiveHandoffProps {
  result: SpeakingGradeResult;
  mode: SpeakingMode;
}

/** The student's own required Speaking band: their per-paper minimum where
    they set one, otherwise their overall target, exactly what
    GapAssessment.requiredBand means for the 'speaking' paper scope. Reads
    the same saved plan the settings screen writes, with no dependency on
    the full evidence-based policy (which needs the learner's ability
    estimates; this needs only their goals), so it can run synchronously
    wherever this card renders. Null when the student has set neither. */
function requiredSpeakingBand(): number | null {
  try {
    const settings = planSettingsFromSavedPlan(loadStudyPlan());
    const goals = goalsFrom(settings);
    return requiredBandFor({ kind: 'paper', paper: 'speaking' }, goals);
  } catch {
    /* No plan store on this device, or a corrupt one: the same honest
       answer as no target set at all. */
    return null;
  }
}

export default function SpeakingObjectiveHandoff({ result, mode }: SpeakingObjectiveHandoffProps) {
  const { t } = useT();
  const [added, setAdded] = useState<{ isNow: boolean } | null>(null);

  const finding = findSpeakingGap(result, mode, requiredSpeakingBand());
  if (!finding.found || !finding.headlineKey) return null;

  /* Pronunciation: a different, simpler card. There is no self-check task
     to schedule, ever (lead decision Q6), so nothing here calls
     chooseObjective; the only honest next step is a fresh recording through
     the real trainer, which is what re-checks the criterion. */
  if (finding.criterion === 'pronunciation') {
    return (
      <div className="speaking-handoff">
        <p className="speaking-handoff-kicker">{t(finding.headlineKey)}</p>
        <p className="speaking-handoff-body">
          {t('The examiner who marked this recording said something relevant here.')}
        </p>
        {finding.quote && <blockquote className="speaking-handoff-quote">{finding.quote}</blockquote>}
        <p className="speaking-handoff-source">{t("From the marker's own comment on this recording.")}</p>
        <p className="speaking-handoff-note">
          {t(
            'Pronunciation can only be checked from a real recording, never from a self-check screen or a transcript. Record a new answer through the Speaking trainer to get a fresh check.',
          )}
        </p>
        <a className="speaking-handoff-link" href={withBase('/trainers/speaking')}>
          {t('Open the Speaking trainer')}
        </a>
      </div>
    );
  }

  if (!finding.handoffTaskId) return null;

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
