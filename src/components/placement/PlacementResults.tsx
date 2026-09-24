/* The placement test's results: what one sitting found, in words, and what
   the plan now does with it.

   Read from the learner record and the plan, never from this device's
   resume state alone, so a later visit (on any device) shows the same
   thing. The page asks the plan to rebuild itself from the new evidence
   (onEvidenceRecorded) BEFORE this mounts, so the estimates and the first
   steps below are the fresh ones.

   Wording is the house rule (docs/personal-learning/BUILDER-RULES.md): an
   estimate from one sitting, never a band; a part with no measurement is
   "not yet assessed", never a low result. */

import { useEffect, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { nt } from '../../lib/i18n/translate';
import { withBase } from '../../lib/url';
import {
  getCurrentSession,
  onLearnerRecordChange,
  onPersonalPlanChange,
  readLearnerRecord,
  readPersonalPlan,
  type SharedSessionView,
} from '../../lib/learning';
import { evaluateEvidence } from '../../lib/learning/policy';
import { emptyPlanGoals } from '../../lib/learning/planner';
import { QUESTION_TYPE_LABEL } from '../../lib/tests/question-types';
import { placementResults, type PlacementLevel, type PlacementPaperResult } from '../../lib/placement/results';
import type { NotAssessedReason, PartOutcome, PlacementPart } from '../../lib/placement/state';
import { STEP_ROLE_LABEL } from '../learning/today/todayViewModel';
import { PART_NAME } from './PlacementFrame';

const LEVEL_LABEL: Record<PlacementLevel, string> = {
  weak: nt('Weak'),
  developing: nt('Developing'),
  strong: nt('Strong'),
};

const NOT_ASSESSED_SENTENCE: Record<NotAssessedReason | 'unknown', string> = {
  unavailable: nt('This could not be marked on this site at the time. Your plan will ask for a short sample of it later.'),
  failed: nt('This could not be finished or marked this time. Your plan will ask for a short sample of it later.'),
  skipped: nt('You left this part out. Your plan will ask for a short sample of it later.'),
  blank: nt('Nothing was answered, so there was nothing to mark. Your plan will ask for a short sample of it later.'),
  unknown: nt('There is no result for this part yet. Your plan will ask for a short sample of it later.'),
};

export default function PlacementResults({
  outcomes,
}: {
  /** This device's own record of how each part ended, when it has one: it
      only chooses which "not yet assessed" sentence to show. */
  outcomes?: Partial<Record<PlacementPart, PartOutcome>>;
}) {
  const { t } = useT();
  const [view, setView] = useState<{ results: PlacementPaperResult[]; session: SharedSessionView | null } | null>(null);

  useEffect(() => {
    const read = () => {
      const record = readLearnerRecord();
      const plan = readPersonalPlan();
      const goals = plan?.goals ?? emptyPlanGoals();
      const policy = evaluateEvidence({ record, goals, now: new Date().toISOString() });
      let session: SharedSessionView | null = null;
      try {
        session = getCurrentSession();
      } catch {
        session = null;
      }
      setView({ results: placementResults(record, policy, goals), session });
    };
    read();
    const offRecord = onLearnerRecordChange(read);
    const offPlan = onPersonalPlanChange(read);
    return () => {
      offRecord();
      offPlan();
    };
  }, []);

  if (!view) return null;

  function detail(result: PlacementPaperResult): string {
    if (result.status === 'not-assessed') {
      const outcome = outcomes?.[result.paper];
      const reason = outcome?.kind === 'not-assessed' ? outcome.reason : 'unknown';
      return t(NOT_ASSESSED_SENTENCE[reason]);
    }
    if (result.raw !== null && result.total !== null) {
      const score = t('{raw} of {total} right in this sitting.', { raw: result.raw, total: result.total });
      const weak =
        result.weakTypes.length > 0
          ? t('Below the pass line: {types}.', {
              types: result.weakTypes
                .map((type) => `${QUESTION_TYPE_LABEL[type.subskill] ?? type.subskill} (${type.correct}/${type.total})`)
                .join(', '),
            })
          : t('Every question type came in at or above the pass line.');
      return `${score} ${weak}`;
    }
    if (result.band !== null) {
      return result.requiredBand !== null
        ? t('Marked at band {band} on this one piece of work, against the {target} you need.', {
            band: result.band.toFixed(1),
            target: result.requiredBand.toFixed(1),
          })
        : t('Marked at band {band} on this one piece of work. Set a target band to see how far that is from it.', {
            band: result.band.toFixed(1),
          });
    }
    return t(NOT_ASSESSED_SENTENCE.unknown);
  }

  const session = view.session;
  const firstSteps = session ? session.steps.slice(0, 3) : [];

  return (
    <section className="pl-card pl-enter" aria-labelledby="pl-results-heading">
      <p className="pl-kicker">{t('Placement test')}</p>
      <h1 id="pl-results-heading" className="pl-title">
        {t('Your starting point')}
      </h1>
      <p className="pl-lead">
        {t('An estimate from one sitting of about 40 minutes, not a band score. It tells your plan where to start, and your everyday work will sharpen it.')}
      </p>

      <ul className="pl-results">
        {view.results.map((result) => (
          <li key={result.paper} className={`pl-result pl-skill-${result.paper}`} data-paper={result.paper}>
            <span className="pl-result-paper">{PART_NAME[result.paper]}</span>
            <span
              className={`pl-level ${result.status === 'not-assessed' ? 'is-none' : result.level ? `is-${result.level}` : 'is-none'}`}
            >
              {result.status === 'not-assessed'
                ? t('Not yet assessed')
                : result.level
                  ? t(LEVEL_LABEL[result.level])
                  : t('Assessed')}
            </span>
            <p className="pl-result-detail">{detail(result)}</p>
          </li>
        ))}
      </ul>

      <div className="pl-next">
        <p className="pl-next-label">{t('What your plan does next')}</p>
        {session ? (
          <>
            <p className="pl-next-objective">{session.objective}</p>
            {firstSteps.length > 0 && (
              <ol className="pl-next-steps">
                {firstSteps.map((step) => (
                  <li key={step.stepId} className="pl-next-step">
                    <span>
                      {t(STEP_ROLE_LABEL[step.role])}: {step.title ? t(step.title) : step.purpose}
                    </span>
                    <span>{t('{n} min', { n: step.minutes })}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <p className="pl-next-objective">{t('Your plan is ready on Today.')}</p>
        )}
        <a className="pl-primary" href={withBase('/dashboard')}>
          {t('Continue')}
        </a>
      </div>
    </section>
  );
}
