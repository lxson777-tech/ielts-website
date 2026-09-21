/* Small presentational pieces shared by both Intake variants: a real,
   keyboard-operable radio group styled as capsules, the one-question-at-a-
   time step shell for first-visit, and the honest outcome panel. Nothing
   here reads storage or the plan API — Intake.tsx hands in everything. */

import type { ReactNode } from 'react';
import type { PlanStatus } from '../../../lib/learning/contracts/plan';

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

export function OutcomePanel({
  headline,
  scopeNote,
  droppedMilestones,
  status,
}: {
  headline: string;
  scopeNote: string | null;
  droppedMilestones: readonly string[];
  status: PlanStatus;
}) {
  return (
    <div className={`intake-outcome is-${STATUS_TONE[status]}`} role="status">
      <p className="intake-outcome-headline">{headline}</p>
      {scopeNote && <p className="intake-outcome-note">{scopeNote}</p>}
      {droppedMilestones.length > 0 && (
        <ul className="intake-outcome-list">
          {droppedMilestones.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
