/* Small presentational pieces shared by both Intake variants: a real,
   keyboard-operable radio group styled as capsules, the one-question-at-a-
   time step shell for first-visit, and the honest outcome panel. Nothing
   here reads storage or the plan API — Intake.tsx hands in everything. */

import type { ReactNode } from 'react';
import { useT } from '../../../lib/i18n/react';
import type { PlanStatus } from '../../../lib/learning/contracts/plan';
import ScopeNote from '../ScopeNote';

export interface CapsuleOption<T extends string> {
  value: T;
  label: string;
  /** Small print under the option, e.g. "the teacher's recommendation". */
  hint?: string;
}

interface CapsuleRadioGroupProps<T extends string> {
  legend: string;
  name: string;
  options: readonly CapsuleOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** One line under the question, above the options. */
  helper?: string;
}

/** A real `<fieldset><legend>` of native radio inputs, visually capsules.
    Native radios give arrow-key navigation and a single Tab stop for free,
    so nothing here reaches for a custom `role="radiogroup"`. */
export function CapsuleRadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  helper,
}: CapsuleRadioGroupProps<T>) {
  return (
    <fieldset className="intake-field">
      <legend className="intake-question">{legend}</legend>
      {helper && <p className="intake-helper">{helper}</p>}
      <div className="intake-capsule-row" role="presentation">
        {options.map((option) => (
          <label key={option.value} className="intake-capsule">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="intake-capsule-label">{option.label}</span>
            {option.hint && <span className="intake-capsule-hint">{option.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function StepShell({
  step,
  total,
  children,
}: {
  step: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <div className="intake-step">
      <div
        className="intake-progress"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Step ${step} of ${total}`}
      >
        {Array.from({ length: total }).map((_, index) => (
          <span
            key={index}
            className={index < step ? 'is-done' : index === step - 1 ? 'is-current' : ''}
          />
        ))}
      </div>
      {children}
    </div>
  );
}

const STATUS_TONE: Record<PlanStatus, 'neutral' | 'caution' | 'good'> = {
  'on-track': 'neutral',
  'provisional-no-date': 'neutral',
  recovering: 'caution',
  'date-passed': 'caution',
  'exam-imminent': 'caution',
  'goal-met': 'good',
};

/** The honest statement of what the saved plan can and cannot do.
 *
 * Three things here are deliberate, all from the 22 September 2026 review of
 * the running site:
 *
 * - The scope note goes through the SHARED `ScopeNote` component, the same
 *   one Today and the Course page use, so one plan reads the same way on all
 *   three surfaces: first sentence plainly, the rest behind "and n more".
 *   It keeps this panel's own paragraph class, so the style is unchanged.
 *   Before this, the planner's 548-character note was dumped here in full.
 * - What had to be dropped is secondary detail, so it sits behind a closed
 *   `<details>` whose summary says what it is and how many items, the same
 *   way the rest of the intake collapses anything optional.
 * - `role="status"` is on the headline only, not the whole panel. The
 *   headline is the sentence that has to be announced when a plan is saved;
 *   making the disclosure part of a live region would re-announce the note
 *   and the whole list every time the student opened or closed it.
 */
export function OutcomePanel({
  headline,
  scopeNote,
  droppedMilestones,
  status,
  scopeTight = false,
}: {
  headline: string;
  scopeNote: string | null;
  droppedMilestones: readonly string[];
  status: PlanStatus;
  /** From `planOutcome`: the planner had to leave real work out, or the exam
      is inside its short-deadline window. A plan like that is not a neutral
      one even while its status is 'on-track'. */
  scopeTight?: boolean;
}) {
  const { tn } = useT();
  const tone = STATUS_TONE[status] === 'neutral' && scopeTight ? 'caution' : STATUS_TONE[status];
  return (
    <div className={`intake-outcome is-${tone}`}>
      <p className="intake-outcome-headline" role="status">
        {headline}
      </p>
      <ScopeNote note={scopeNote} className="intake-outcome-note" />
      {droppedMilestones.length > 0 && (
        <details className="intake-outcome-dropped">
          <summary>
            {tn(droppedMilestones.length, {
              one: 'What will not fit before the exam ({n} thing)',
              other: 'What will not fit before the exam ({n} things)',
            })}
          </summary>
          <ul className="intake-outcome-list">
            {droppedMilestones.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
