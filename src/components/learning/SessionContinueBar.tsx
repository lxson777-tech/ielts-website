/* The one control at the end of a piece of work.
 *
 * Mount it on any result screen. It reads the shared session
 * (src/lib/learning), works out whether this activity was a step of today
 * (see ./session-continue.ts) and shows one of three things: continue to
 * the next step, back to today, or a quiet way back for work the student
 * chose themselves. It never invents a next step, and it never contradicts
 * Today.
 *
 * MOUNTING RECIPE, for the packages that add this to Writing, Speaking and
 * vocabulary:
 *
 *     <SessionContinueBar activityId={attemptActivityId(test.id)} />
 *
 * That is the whole thing. `activityId` is the catalogue id the work was
 * recorded against; everything else is read from the plan. Pass
 * `onContinue` only if the screen has something of its own to clean up
 * first, and `compact` on a screen that is already crowded.
 */

import { useEffect, useState } from 'react';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import {
  ensureLearningWired,
  getCurrentSession,
  markStepDone,
  onLearnerRecordChange,
  onPersonalPlanChange,
  type SharedSessionView,
} from '../../lib/learning';
import { continueFor, type ContinueTarget } from './session-continue';
import '../../styles/learning-focus.css';

ensureLearningWired();

interface Props {
  /** The catalogue id this screen's work was recorded against. */
  activityId: string | null;
  /** Called after the student presses the control, before the browser
      follows the link. */
  onContinue?: (target: ContinueTarget) => void;
  /** Smaller, for a screen that already has a lot on it (the score modal
      inside the test player). */
  compact?: boolean;
  /** True when this screen is also showing what changed in the plan. The
      quiet note then says the plan was worked out again rather than
      claiming nothing changed, which is the same screen contradicting
      itself two lines apart. */
  planChanged?: boolean;
}

export default function SessionContinueBar({ activityId, onContinue, compact, planChanged }: Props) {
  const { t } = useT();
  const [session, setSession] = useState<SharedSessionView | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        setSession(getCurrentSession());
      } catch {
        /* No plan on this device. The bar falls back to the quiet way back
           rather than taking the result screen down with it. */
        setSession(null);
      }
    };
    read();
    const offRecord = onLearnerRecordChange(read);
    const offPlan = onPersonalPlanChange(read);
    return () => {
      offRecord();
      offPlan();
    };
  }, [activityId]);

  const target = continueFor(session, activityId, planChanged);

  /* A voluntary visit gets nothing at all until a plan exists: there is no
     session to go back to, so a link saying there is would be a lie. */
  if (!session && target.kind === 'voluntary') return null;

  function handleClick() {
    /* The step is marked done here as well as by the evidence that was
       just recorded, because a student may press continue after a run that
       recorded nothing (they answered nothing, or storage is blocked). */
    if (target.stepId) {
      try {
        markStepDone(target.stepId);
      } catch {
        /* A failed write costs the plan's bookkeeping, never the link. */
      }
    }
    onContinue?.(target);
  }

  return (
    <div className={`session-continue is-${target.kind}${compact ? ' is-compact' : ''}`}>
      <p className="session-continue-note">
        {target.vars ? t(target.noteKey, target.vars) : t(target.noteKey)}
      </p>
      <a className="session-continue-action" href={withBase(target.href)} onClick={handleClick}>
        {t(target.labelKey)}
        <span aria-hidden="true">&#8594;</span>
      </a>
    </div>
  );
}
