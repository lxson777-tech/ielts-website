/* The intake's target-band question, kept in its own file on purpose.
 *
 * WHY SEPARATE
 * Another unmerged branch (claude/ielts-platform-improvement-a44962) changes
 * how the target band is held: an account-scoped band with an explicit "not
 * chosen yet" state. Everything the intake knows about the target band, its
 * state, how it loads from the plan, the answer it contributes to a save and
 * its two fields, lives here and nowhere else in Intake.tsx, so that merge
 * replaces one file rather than threading through the whole questionnaire.
 *
 * The rules are unchanged from before: nothing is invented (an untouched
 * band is left out of the answer, so `buildGoals` keeps the previous one),
 * and a per-section minimum the student never looked at is never
 * overwritten (see perPaperMinimumsDiff in intake/logic.ts).
 */

import { useCallback, useState } from 'react';
import type { Paper } from '../../lib/learning/contracts/catalog';
import { PAPERS } from '../../lib/learning/contracts/catalog';
import type { PlanGoals } from '../../lib/learning/contracts/plan';
import { TARGET_BANDS, SKILL_TARGET_BANDS } from '../../lib/study-plan';
import { useT } from '../../lib/i18n/react';
import { nt } from '../../lib/i18n/translate';
import { inputsFromPerPaperMinimums, perPaperMinimumsDiff, type IntakeAnswers } from '../learning/intake/logic';
import { CapsuleRadioGroup, type CapsuleOption } from '../learning/intake/ui';

/* nt(): see the note on PAPER_LABEL in Intake.tsx. */
export const PAPER_LABEL: Record<Paper, string> = {
  reading: nt('Reading'),
  listening: nt('Listening'),
  writing: nt('Writing'),
  speaking: nt('Speaking'),
};

/** Options for a capsule group, with whatever the student already has
    confirmed folded in even when it is not one of the standard choices
    (an old plan can hold a band the current intake does not offer).
    Losing it silently would break "25 stays 25" for that student. */
export function withLoadedOption(standard: readonly string[], loaded: string | null): readonly string[] {
  return loaded && !standard.includes(loaded) ? [loaded, ...standard] : standard;
}

export interface TargetBandState {
  overall: string;
  setOverall: (band: string) => void;
  showPerPaper: boolean;
  setShowPerPaper: (open: boolean) => void;
  perPaper: Partial<Record<Paper, string>>;
  setPaper: (paper: Paper, band: string) => void;
  /** Fill every field from the plan's real goals. */
  load: (goals: PlanGoals) => void;
  /** This question's part of a save. Empty when nothing was chosen. */
  answers: () => Pick<IntakeAnswers, 'overallTargetBand' | 'perPaperMinimums'>;
}

export function useTargetBand(): TargetBandState {
  const [overall, setOverall] = useState('');
  const [showPerPaper, setShowPerPaper] = useState(false);
  const [perPaper, setPerPaper] = useState<Partial<Record<Paper, string>>>({});
  const [perPaperLoaded, setPerPaperLoaded] = useState<Partial<Record<Paper, string>>>({});

  const load = useCallback((goals: PlanGoals) => {
    setOverall(goals.overallTarget ? goals.overallTarget.band.toFixed(1) : '');
    const inputs = inputsFromPerPaperMinimums(goals.perPaperMinimums);
    setPerPaper(inputs);
    setPerPaperLoaded(inputs);
    setShowPerPaper(Object.keys(inputs).length > 0);
  }, []);

  return {
    overall,
    setOverall,
    showPerPaper,
    setShowPerPaper,
    perPaper,
    setPaper: (paper, band) => setPerPaper((prev) => ({ ...prev, [paper]: band })),
    load,
    answers: () => {
      const out: Pick<IntakeAnswers, 'overallTargetBand' | 'perPaperMinimums'> = {};
      if (overall) out.overallTargetBand = Number(overall);
      if (showPerPaper) out.perPaperMinimums = perPaperMinimumsDiff(perPaper, perPaperLoaded);
      return out;
    },
  };
}

export function TargetBandQuestion({
  state,
  labelledBy,
  onPick,
}: {
  state: TargetBandState;
  /** The id of the step heading when the question is shown one at a time. */
  labelledBy?: string;
  /** Called after a pointer choice, for the one-question-at-a-time flow. */
  onPick?: () => void;
}) {
  const { t } = useT();
  const options: readonly CapsuleOption<string>[] = withLoadedOption(TARGET_BANDS, state.overall || null).map((band) => ({
    value: band,
    label: t('Band {band}', { band }),
  }));
  return (
    <CapsuleRadioGroup
      legend={t('What overall band are you aiming for?')}
      labelledBy={labelledBy}
      name="intake-target-band"
      value={state.overall || null}
      onChange={state.setOverall}
      onPick={onPick}
      helper={t('This course currently covers Academic IELTS.')}
      options={options}
    />
  );
}

export function PerSectionMinimums({ state }: { state: TargetBandState }) {
  const { t } = useT();
  return (
    <details
      className="intake-details"
      open={state.showPerPaper}
      onToggle={(e) => state.setShowPerPaper(e.currentTarget.open)}
    >
      <summary>{t('Set a different minimum for each section')}</summary>
      <p className="intake-helper">
        {t(
          'Set these only if you need a minimum in every paper, for example 6.5 overall with nothing below 6.0. Leave one blank and it uses your overall target.',
        )}
      </p>
      <div className="intake-grid">
        {PAPERS.map((paper) => (
          <div key={paper} className="intake-grid-cell">
            <label htmlFor={`intake-paper-${paper}`}>{t(PAPER_LABEL[paper])}</label>
            <select
              id={`intake-paper-${paper}`}
              value={state.perPaper[paper] ?? ''}
              onChange={(e) => state.setPaper(paper, e.target.value)}
            >
              <option value="">{t('Same as target')}</option>
              {SKILL_TARGET_BANDS.map((band) => (
                <option key={band} value={band}>
                  {t('Band {band}', { band })}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </details>
  );
}
