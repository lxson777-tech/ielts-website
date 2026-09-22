/* Mr EZ quietly proposing an alternative to today's own session step.

   Sits inside Today's active session card, under the planner's own reason
   (see TodaySession.tsx's ActiveSessionCard). The planner's choice is
   always the primary action; this asks, once per session and plan
   revision, whether the model would propose something else from the same
   eligible shortlist, and if it genuinely disagrees, shows that as an
   optional card the student may accept (through chooseObjective, inside
   ProposalCard) or ignore. Nothing is shown for a stale, rejected, or
   agreeing reply: see nextStepProposalGate.ts for the decision logic and
   MrEzWelcome.tsx's header comment for the caching pattern this reuses
   (askedRef keyed by session id and plan revision, a sessionRef so a late
   reply can tell whether it is still about the session on screen).

   Wired 2026-09-22: askNextStepProposal and the Worker task behind it
   existed and were tested, but nothing called them, so the model never
   got to propose and the disagreement it would produce never recorded for
   a real student (see workers/mr-ez tests for that recording). */

import { useEffect, useRef, useState } from 'react';
import { askNextStepProposal, isTutorConfigured, type NextStepProposalAsk } from '../../lib/tutor/client';
import { learningCatalogue } from '../../lib/learning/catalog';
import type { SharedSessionView } from '../../lib/learning';
import type { TutorRecommendation } from '../../lib/tutor/schema';
import ProposalCard from './ProposalCard';
import { reconcileProposal } from './proposalReconcile';
import { isProposalStale, shouldAskNextStepProposal, shouldShowNextStepProposal } from './nextStepProposalGate';

export interface NextStepProposalProps {
  session: SharedSessionView;
  /** Null while auth has not resolved yet, same convention as the rest of
      the tutor surfaces. */
  signedIn: boolean | null;
}

interface Shown {
  sessionId: string;
  planRevision: number;
  recommendation: TutorRecommendation;
}

/** Set by TestPlayer, MockExam and the exam-conditions writing checker
    while a timer is actually running (mrez-boundary.ts's own words: "Mr EZ
    becomes an invigilator"). Today is never itself one of those screens,
    but the same flag is read here rather than assumed false, for the same
    reason MrEzPanel.tsx reads it: a hidden check is not a boundary, and a
    tab that still has an assessment open elsewhere must not spend this
    ask either. */
function underExamNow(): boolean {
  return typeof document !== 'undefined' && document.body.dataset.examRunning === 'true';
}

export default function NextStepProposal({ session, signedIn }: NextStepProposalProps) {
  const [shown, setShown] = useState<Shown | null>(null);
  /** Session|revision pairs already asked about, successfully or not, so a
      re-render never fires the same request twice (MrEzWelcome.tsx's own
      pattern, reused here rather than duplicated with different names). */
  const askedRef = useRef(new Set<string>());
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    askedRef.current.clear();
    setShown(null);
  }, [signedIn]);

  const askKey = `${session.sessionId}|${session.planRevision}`;

  useEffect(() => {
    if (
      !shouldAskNextStepProposal({
        signedIn,
        tutorConfigured: isTutorConfigured(),
        underExam: underExamNow(),
        askKey,
        alreadyAsked: askedRef.current,
      })
    ) {
      return;
    }

    askedRef.current.add(askKey);
    const askedSessionId = session.sessionId;
    const askedPlanRevision = session.planRevision;
    let cancelled = false;

    const ask: NextStepProposalAsk = {
      versions: {
        planRevision: session.planRevision,
        evidenceVersion: session.evidenceVersion,
        indexVersion: learningCatalogue().indexVersion,
      },
      sessionId: session.sessionId,
      /* A hint and nothing more (askNextStepProposal's own doc comment):
         the Worker rebuilds the real shortlist from the student's own
         plan, so there is nothing here for the browser to duplicate. */
      candidateActivityIds: [],
      budgetMinutes: session.budgetMinutes,
      deterministicChoiceId:
        session.steps.find((step) => step.role === 'practise')?.activityId ?? session.steps[0]?.activityId ?? '',
    };

    void askNextStepProposal(ask)
      .then((reply) => {
        if (cancelled) return;
        const now = sessionRef.current;
        if (isProposalStale({ askedSessionId, askedPlanRevision, currentSessionId: now.sessionId, currentPlanRevision: now.planRevision })) {
          return;
        }
        const reconciled = reply.recommendation
          ? reconcileProposal(reply.recommendation.id, { activityId: now.activityId, objectiveScope: now.objectiveScope }, learningCatalogue()).state
          : null;
        if (!shouldShowNextStepProposal(reply.accepted, Boolean(reply.recommendation), reconciled)) return;
        setShown({ sessionId: askedSessionId, planRevision: askedPlanRevision, recommendation: reply.recommendation! });
      })
      .catch(() => {
        /* Quiet by design: this is an optional extra on top of the primary
           card, never worth a visible error. The daily-limit notice
           MrEzWelcome shows belongs to the feature that already speaks on
           every visit; this one is silent even about being silent. */
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askKey, signedIn]);

  const fresh = shown && shown.sessionId === session.sessionId && shown.planRevision === session.planRevision ? shown : null;
  if (!fresh) return null;

  return (
    <div className="today-mrez-alternative">
      <ProposalCard recommendation={fresh.recommendation} />
    </div>
  );
}
