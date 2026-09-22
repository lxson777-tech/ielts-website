/* Where "next" goes after any piece of work, decided in one place.
 *
 * THE PROBLEM IT SOLVES
 * The audit found a student being offered three different next steps by
 * three screens. The rule since WP8 is that every surface READS the shared
 * session and nothing invents one. A result screen is the last place that
 * rule was still missing: a drill finished inside today's session used to
 * offer "More Tests", and a drill the student opened out of curiosity used
 * to offer the same thing, so neither of them said anything true about the
 * plan.
 *
 * THE RULE
 *   this activity is a step of today's session, and a later step is still
 *   waiting            -> continue to that step
 *   this activity is a step, and nothing is waiting
 *                      -> back to today, which will say the session is done
 *   this activity is not a step (opened voluntarily, or from the library)
 *                      -> a quiet way back to today, and NEVER a next step,
 *                         because the work is still recorded and the plan
 *                         has not changed its mind about anything
 *
 * No JSX here on purpose: see the header of ./focused-exercise.ts.
 */

import type { SharedSessionView, SharedStepView } from '../../lib/learning/adapters';

export type ContinueKind = 'next-step' | 'back-to-today' | 'voluntary';

export interface ContinueTarget {
  kind: ContinueKind;
  /** Unprefixed, the same convention as every step href: callers apply
      withBase(). */
  href: string;
  /** The English sentence on the control, also its dictionary key. */
  labelKey: string;
  /** Values for the key's placeholders, when it has any. */
  vars?: Record<string, string | number>;
  /** One quiet line above the control saying where the student is. */
  noteKey: string;
  /** The step this activity is, when it is one, so the caller can mark it
      done before moving on. */
  stepId?: string;
  /** The step being continued to, for a caller that wants its detail. */
  next?: SharedStepView;
}

/** Where the dashboard lives. One place, so a route change is one edit. */
export const TODAY_HREF = '/dashboard';

export function continueFor(
  session: SharedSessionView | null,
  activityId: string | null | undefined,
  /** True when the plan really did record a change around this piece of
   *  work, which the caller knows because it watched the history grow.
   *
   *  Without it these screens contradicted themselves: one box said what had
   *  changed in the plan and the box directly beneath it said the work had
   *  not changed today. Both sentences are about the same thing, so only one
   *  of them can be on the screen. */
  planChanged = false,
): ContinueTarget {
  const voluntary: ContinueTarget = {
    kind: 'voluntary',
    href: TODAY_HREF,
    labelKey: "Back to today's session",
    noteKey: planChanged
      ? 'This was extra practice. It has been recorded, and the plan has been worked out again around it.'
      : 'This was extra practice. It has been recorded, and it has not changed today.',
  };
  if (!session || !activityId) return voluntary;

  /* A session can name one activity twice: the recap goes back over what
     was practised, so it carries the practise step's own id. The step this
     result screen is about is therefore the first one with that id that is
     still outstanding, and the last one once they are all finished. */
  const matches = session.steps
    .map((step, position) => ({ step, position }))
    .filter((entry) => entry.step.activityId === activityId);
  if (matches.length === 0) return voluntary;
  const chosen =
    matches.find((entry) => entry.step.state !== 'done' && entry.step.state !== 'skipped') ??
    matches[matches.length - 1];
  const index = (chosen as { position: number }).position;
  const step = (chosen as { step: SharedStepView }).step;

  const next = session.steps
    .slice(index + 1)
    .find((candidate) => candidate.state !== 'done' && candidate.state !== 'skipped' && candidate.href);
  if (next) {
    return {
      kind: 'next-step',
      href: next.href as string,
      labelKey: "Continue today's session",
      noteKey: 'Next: {purpose}',
      vars: { purpose: next.purpose || next.objective },
      stepId: step.stepId,
      next,
    };
  }

  return {
    kind: 'back-to-today',
    href: TODAY_HREF,
    labelKey: 'Back to today',
    noteKey: "That was the last step of today's session.",
    stepId: step.stepId,
  };
}
