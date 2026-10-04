/* A short numbered path: the shape of an essay or a spoken answer, one step
   per paragraph or stage, each with its guidance always on show.

   Replaces the coach panels' old rows of a checkbox plus a fold-out. There
   is nothing to tick: in the writing coach the state comes from the essay
   itself (src/lib/writing/paragraph-progress.ts); in the speaking coach
   speech is not tracked, so every step is shown plainly.

   An ordered list, so a screen reader announces "1 of 4". The state is in
   the text as well as the colour: "Now" is visible on the current step and
   "done" is read out after a finished step's name. */

import type { ReactNode } from 'react';
import type { StepState } from '../../lib/writing/paragraph-progress';
import { useT } from '../../lib/i18n/react';
import { CheckIcon } from './CoachIcons';

export interface PathStep {
  key: string;
  /** Already translated (or a fixed English method name). */
  title: string;
  /** A quiet note beside the title, e.g. a timing. Already translated. */
  meta?: string;
  /** The step's guidance, always visible. */
  body: ReactNode;
  /** A longer extra behind one small disclosure (an example, tips). */
  more?: { label: string; content: ReactNode; open?: boolean };
  /** Omitted when nothing is tracked. */
  state?: StepState;
}

export default function StepPath({ steps, labelledBy }: { steps: PathStep[]; labelledBy?: string }) {
  const { t } = useT();
  return (
    <ol className="coach-path" aria-labelledby={labelledBy}>
      {steps.map((step, i) => {
        const state = step.state ?? 'plain';
        return (
          <li key={step.key} className="coach-step" data-state={state}>
            <span className="coach-step-mark" aria-hidden="true">
              {state === 'done' ? <CheckIcon /> : i + 1}
            </span>
            <div className="coach-step-text">
              <p className="coach-step-title">
                <span className="coach-step-name">{step.title}</span>
                {step.meta && <span className="coach-step-meta">{step.meta}</span>}
                {state === 'now' && <span className="coach-step-now">{t('Now')}</span>}
                {state === 'done' && <span className="sr-only">, {t('done')}</span>}
              </p>
              <div className="coach-step-body">{step.body}</div>
              {step.more && (
                <details className="coach-more" open={step.more.open}>
                  <summary>{step.more.label}</summary>
                  <div className="coach-more-body">{step.more.content}</div>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
