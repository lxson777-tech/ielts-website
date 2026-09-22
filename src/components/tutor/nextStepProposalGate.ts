/* Pure gating for Mr EZ's next-step proposal on Today.

   askNextStepProposal (src/lib/tutor/client.ts) and the Worker task behind
   it were built and tested, but no interface ever called them: the model
   never got to propose an alternative for a real student, and the
   disagreement it would have produced never fired. NextStepProposal.tsx
   wires the call; this file is the decision logic behind it, kept apart
   from the network call and the DOM (`document.body.dataset.examRunning`)
   so both halves can be tested without either. Fixed 2026-09-22.

   WHEN TO ASK
   Once per session id and plan revision: never on a plain re-render, never
   again for the SAME session and revision once it has been asked about
   (successfully or not, the same rule MrEzWelcome.tsx's askedRef already
   follows for the welcome line). Only for a signed-in student with the
   tutor configured, and never while a timed assessment is running, the
   same boundary mrez-boundary.ts enforces for the chat panel.

   WHEN TO SHOW
   Only when the reply is accepted, names a real recommendation, AND that
   recommendation reconciles (src/components/tutor/proposalReconcile.ts) to
   a genuinely different, schedulable activity from the one the planner
   already chose: never the same activity ('matches-current', nothing to
   add over what the primary card already shows), never something
   chooseObjective cannot resolve ('unresolvable', a hub link with no exact
   activity to accept). A stale reply, one about a session or revision the
   student has since moved past, is dropped before this question is even
   asked (see isProposalStale). A rejected reply carries no recommendation
   at all, so it already reads false without a separate case. */

import type { ProposalReconciliation } from './proposalReconcile';

export interface AskGateInput {
  /** Null while auth has not resolved yet. Only `true` may ask. */
  signedIn: boolean | null;
  tutorConfigured: boolean;
  /** True while a timed assessment is actually running (TestPlayer,
      MockExam and the exam-conditions writing checker all set
      `document.body.dataset.examRunning`, mrez-boundary.ts's own words). */
  underExam: boolean;
  /** `${session.sessionId}|${session.planRevision}`. */
  askKey: string;
  /** Keys already asked about, successfully or not. */
  alreadyAsked: ReadonlySet<string>;
}

/** Whether NextStepProposal.tsx may fire askNextStepProposal right now. */
export function shouldAskNextStepProposal(input: AskGateInput): boolean {
  if (input.signedIn !== true) return false;
  if (!input.tutorConfigured) return false;
  if (input.underExam) return false;
  if (input.alreadyAsked.has(input.askKey)) return false;
  return true;
}

export interface StaleCheckInput {
  askedSessionId: string;
  askedPlanRevision: number;
  currentSessionId: string;
  currentPlanRevision: number;
}

/** True once the session the reply was asked about is no longer the one on
    screen: a step finished, a replan ran, or the student moved to a
    different objective while the request was in flight. A stale reply is
    dropped rather than shown, the same rule MrEzWelcome.tsx follows. */
export function isProposalStale(input: StaleCheckInput): boolean {
  return input.askedSessionId !== input.currentSessionId || input.askedPlanRevision !== input.currentPlanRevision;
}

/** Whether a landed, non-stale reply is worth showing at all. `accepted`
    and `hasRecommendation` come straight off the wire reply; `reconciled`
    is reconcileProposal's own verdict against the CURRENT session (by the
    time the reply lands, never the one the request was built against). */
export function shouldShowNextStepProposal(
  accepted: boolean,
  hasRecommendation: boolean,
  reconciled: ProposalReconciliation['state'] | null,
): boolean {
  return accepted && hasRecommendation && reconciled === 'reconcilable';
}
