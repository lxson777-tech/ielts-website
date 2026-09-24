/* Small presentational pieces shared by both Intake variants: a real,
   keyboard-operable radio group styled as capsules or cards, the calm
   progress line for first-visit, and the honest outcome panel. Nothing
   here reads storage or the plan API — Intake.tsx hands in everything. */

import { useRef } from 'react';
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
  /** When the question is already a visible heading (one question per
      screen), the id of that heading: the group is labelled by it and no
      second, duplicate legend is drawn. */
  labelledBy?: string;
  /** Called after the student picks an option WITH A POINTER (mouse, touch
      or pen), never for arrow keys. Arrow keys move through a radio group
      one option at a time, so advancing on them would skip the student
      past the question on their first key press; keyboard users go on
      with Enter or the Next button instead. */
  onPick?: (value: T) => void;
  /** 'pills' for short labels in a row (bands, languages); 'cards' for
      options with a hint underneath, laid out as a two-column grid. */
  layout?: 'pills' | 'cards';
}

/** A real `<fieldset>` of native radio inputs, visually capsules or cards.
    Native radios give arrow-key navigation and a single Tab stop for free,
    so nothing here reaches for a custom `role="radiogroup"`. */
export function CapsuleRadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  helper,
  labelledBy,
  onPick,
  layout = 'pills',
}: CapsuleRadioGroupProps<T>) {
  /* A pointer press on an option, remembered for the click that follows it.
     `event.detail` alone is not enough: a click forwarded from a <label>
     can report 0 in some browsers even though a finger caused it. */
  const pointerAt = useRef(0);
  const helperId = helper ? `${name}-helper` : undefined;
  return (
    <fieldset
      className={`intake-field intake-field-${layout}`}
      aria-labelledby={labelledBy}
      aria-describedby={helperId}
    >
      {!labelledBy && <legend className="intake-question">{legend}</legend>}
      {helper && (
        <p className="intake-helper" id={helperId}>
          {helper}
        </p>
      )}
      <div
        className={
          layout === 'cards'
            ? `intake-card-grid${options.length === 3 ? ' is-three' : ''}`
            : 'intake-capsule-row'
        }
        role="presentation"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={layout === 'cards' ? 'intake-capsule intake-choice-card' : 'intake-capsule'}
            onPointerDown={() => {
              pointerAt.current = Date.now();
            }}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              onClick={(event) => {
                const byPointer = event.detail > 0 || Date.now() - pointerAt.current < 1000;
                pointerAt.current = 0;
                if (byPointer) onPick?.(option.value);
              }}
            />
            <span className="intake-capsule-text">
              <span className="intake-capsule-label">{option.label}</span>
              {option.hint && <span className="intake-capsule-hint">{option.hint}</span>}
            </span>
            <span className="intake-capsule-check" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
                <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A calm progress line for the one-question-at-a-time flow: a thin track
    that fills smoothly, and the step in words for everyone who cannot see
    the bar. */
export function IntakeProgress({ step, total, label }: { step: number; total: number; label: string }) {
  const pct = Math.max(0, Math.min(1, step / total)) * 100;
  return (
    <div className="intake-progress-wrap">
      <div
        className="intake-progress-track"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuetext={label}
        aria-label={label}
      >
        <span className="intake-progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <span className="intake-progress-label" aria-hidden="true">
        {label}
      </span>
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
