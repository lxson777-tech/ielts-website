/**
 * Intake: the short goal and availability questions a student answers once,
 * and can revisit from the plan settings page.
 *
 * Contract between the two packages:
 * - `variant="first-visit"` is the compact version shown on Today to a student
 *   whose goals are not confirmed yet. `variant="settings"` is the full editor
 *   on the plan settings page.
 * - The component saves through `updateGoalsAndConstraints` from
 *   `src/lib/learning`, which replans. It never writes the old study plan store
 *   directly.
 * - `onDone` is called after a successful save so the host can re-read the
 *   current session. `onDefer` is called when the student chooses to answer
 *   later, which must leave a visibly provisional plan in place.
 *
 * WHY ONE COMPONENT FOR BOTH VARIANTS
 * Both ask exactly the same questions, in the same order, and both must load
 * an existing confirmed setting exactly as it is (architecture section 4.2:
 * "25 stays 25"). Keeping one set of field state and one save path is what
 * makes that guarantee automatic rather than something to keep in sync by
 * hand. `first-visit` renders one field group at a time behind a small
 * wizard shell; `settings` renders every group stacked on one page. Neither
 * variant invents a value: every field starts from `ensurePlan()`'s real
 * goals and constraints, and a field the student never touches is left out
 * of the save entirely (see `src/components/learning/intake/logic.ts`).
 */

import { useEffect, useMemo, useState } from 'react';
import { ensurePlan, updateGoalsAndConstraints } from '../../lib/learning';
import { readLearnerRecord, recordSelfReported } from '../../lib/learning/store.browser';
import type { DailyMinutes, PersonalPlanV1 } from '../../lib/learning/contracts/plan';
import type { Paper } from '../../lib/learning/contracts/catalog';
import { PAPERS } from '../../lib/learning/contracts/catalog';
import { TARGET_BANDS, SKILL_TARGET_BANDS } from '../../lib/study-plan';
import type { Locale } from '../../lib/i18n/locale';
import { LOCALE_LABEL } from '../../lib/i18n/locale';
import { useT } from '../../lib/i18n/react';
import { nt } from '../../lib/i18n/translate';
import { planOutcome } from '../../lib/plan/summary';
import {
  buildConstraints,
  buildGoals,
  examDateAnswerFrom,
  inputsFromPerPaperMinimums,
  initialDailyTimeSelection,
  INTAKE_DAILY_MINUTES,
  lighterDailyMinutes,
  needsFreshAvailabilityConfirm,
  perPaperMinimumsDiff,
  selfReportedEntryFrom,
  type IntakeAnswers,
} from '../learning/intake/logic';
import { CapsuleRadioGroup, OutcomePanel, StepShell, type CapsuleOption } from '../learning/intake/ui';
import '../../styles/learning-intake.css';

/** Options for a capsule group, with whatever the student already has
    confirmed folded in even when it is not one of the standard choices
    (an old plan can hold a target band or a daily-minutes value the current
    intake does not normally offer, e.g. 40 minutes a day from the previous
    settings form). Losing it silently would break "25 stays 25" for anyone
    who was not already on one of the offered numbers. */
function withLoadedOption(standard: readonly string[], loaded: string | null): readonly string[] {
  return loaded && !standard.includes(loaded) ? [loaded, ...standard] : standard;
}

export interface IntakeProps {
  variant: 'first-visit' | 'settings';
  onDone?: () => void;
  onDefer?: () => void;
}

const STEP_COUNT = 6;

/* nt() marks these as needing a Russian entry without translating them here
   (src/lib/i18n/dict/parts.ts style, same pattern PlanToday.tsx uses for its
   TYPE_LABEL map): the render sites below look them up dynamically
   (`t(PAPER_LABEL[paper])`), which the coverage extractor cannot follow, so
   the literal has to be captured once, here, where it is still a literal. */
const PAPER_LABEL: Record<Paper, string> = {
  reading: nt('Reading'),
  listening: nt('Listening'),
  writing: nt('Writing'),
  speaking: nt('Speaking'),
};

export default function Intake({ variant, onDone, onDefer }: IntakeProps) {
  const { t } = useT();
  const [ready, setReady] = useState(false);
  const [plan, setPlan] = useState<PersonalPlanV1 | null>(null);
  const [existingSelfReported, setExistingSelfReported] = useState<
    readonly { paper?: Paper; band: number; takenOn: string }[]
  >([]);

  const [step, setStep] = useState(1);

  const [overallTargetBand, setOverallTargetBand] = useState('');
  const [showPerPaper, setShowPerPaper] = useState(false);
  const [perPaper, setPerPaper] = useState<Partial<Record<Paper, string>>>({});
  const [perPaperLoaded, setPerPaperLoaded] = useState<Partial<Record<Paper, string>>>({});

  const [examDateInput, setExamDateInput] = useState('');
  const [examDateLoaded, setExamDateLoaded] = useState<string | null>(null);
  const [noDateConfirmed, setNoDateConfirmed] = useState(false);

  const [studyDays, setStudyDays] = useState<'daily' | 'weekdays'>('daily');

  const [dailyMinutes, setDailyMinutes] = useState<DailyMinutes>(60);
  const [loadedDailyMinutes, setLoadedDailyMinutes] = useState<DailyMinutes | null>(null);
  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(false);

  const [explanationLocale, setExplanationLocale] = useState<Locale>('en');

  const [showHardest, setShowHardest] = useState(false);
  const [hardestPaper, setHardestPaper] = useState<Paper | null>(null);

  const [showSelfReport, setShowSelfReport] = useState(false);
  const [selfBand, setSelfBand] = useState('');
  const [selfPaper, setSelfPaper] = useState<Paper | ''>('');
  const [selfDate, setSelfDate] = useState('');
  const [selfReportStatus, setSelfReportStatus] = useState<'idle' | 'saved'>('idle');

  const [saving, setSaving] = useState(false);
  const [savedPlan, setSavedPlan] = useState<PersonalPlanV1 | null>(null);
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const current = ensurePlan();
    setPlan(current);

    setOverallTargetBand(current.goals.overallTarget ? current.goals.overallTarget.band.toFixed(1) : '');

    const paperInputs = inputsFromPerPaperMinimums(current.goals.perPaperMinimums);
    setPerPaper(paperInputs);
    setPerPaperLoaded(paperInputs);
    setShowPerPaper(Object.keys(paperInputs).length > 0);

    setExamDateInput(current.goals.examDate?.date ?? '');
    setExamDateLoaded(current.goals.examDate?.date ?? null);

    setStudyDays(current.constraints.studyDays === 'weekdays' ? 'weekdays' : 'daily');

    const time = initialDailyTimeSelection(current.constraints);
    setDailyMinutes(time.minutes);
    setAvailabilityConfirmed(!time.needsConfirmation);
    if (current.constraints.regularDailyMinutesStatus === 'confirmed') {
      setLoadedDailyMinutes(current.constraints.regularDailyMinutes);
    }

    setExplanationLocale(current.constraints.explanationLocale);

    if (current.goals.selfReportedHardestPaper) {
      setShowHardest(true);
      setHardestPaper(current.goals.selfReportedHardestPaper.paper);
    }

    setExistingSelfReported(readLearnerRecord().selfReported);
    setReady(true);
  }, []);

  const needsConfirmNow = useMemo(
    () => (plan ? needsFreshAvailabilityConfirm(plan.constraints, dailyMinutes) : true),
    [plan, dailyMinutes],
  );

  if (!ready || !plan) return null;

  function chooseDailyMinutes(next: DailyMinutes) {
    setDailyMinutes(next);
    setAvailabilityConfirmed(false);
  }

  function askForLess() {
    setDailyMinutes(lighterDailyMinutes(dailyMinutes));
    setAvailabilityConfirmed(false);
  }

  function addSelfReportedScore() {
    const entry = selfReportedEntryFrom({ paper: selfPaper, bandText: selfBand, takenOn: selfDate });
    if (!entry) return;
    recordSelfReported({ ...entry, reportedAt: new Date().toISOString() });
    setExistingSelfReported(readLearnerRecord().selfReported);
    setSelfBand('');
    setSelfPaper('');
    setSelfDate('');
    setSelfReportStatus('saved');
  }

  function buildAnswers(): IntakeAnswers {
    const answers: IntakeAnswers = {
      studyDays,
      dailyMinutes,
      availabilityConfirmed,
      explanationLocale,
    };
    if (overallTargetBand) answers.overallTargetBand = Number(overallTargetBand);
    if (showPerPaper) answers.perPaperMinimums = perPaperMinimumsDiff(perPaper, perPaperLoaded);
    const examAnswer = examDateAnswerFrom({ value: examDateInput, noDateConfirmed, loadedDate: examDateLoaded });
    if (examAnswer !== undefined) answers.examDate = examAnswer;
    if (hardestPaper) answers.hardestPaper = hardestPaper;
    return answers;
  }

  function save() {
    if (!plan) return; // guarded by the ready/plan check above in practice; kept for TypeScript
    setSaving(true);
    const answers = buildAnswers();
    const goals = buildGoals(plan.goals, answers, new Date().toISOString());
    const constraints = buildConstraints(plan.constraints, answers);
    const next = updateGoalsAndConstraints({ goals, constraints });
    setPlan(next);
    setSavedPlan(next);
    setJustSaved(true);
    setSaving(false);
    if (variant === 'settings') onDone?.();
  }

  const canLeaveStep4 = !needsConfirmNow || availabilityConfirmed;

  const targetBandOptions: readonly CapsuleOption<string>[] = withLoadedOption(
    TARGET_BANDS,
    overallTargetBand || null,
  ).map((band) => ({ value: band, label: t('Band {band}', { band }) }));

  const targetBandField = (
    <CapsuleRadioGroup
      legend={t('What overall band are you aiming for?')}
      name="intake-target-band"
      value={overallTargetBand || null}
      onChange={setOverallTargetBand}
      helper={t('This course currently covers Academic IELTS.')}
      options={targetBandOptions}
    />
  );

  const perPaperField = (
    <details className="intake-details" open={showPerPaper} onToggle={(e) => setShowPerPaper(e.currentTarget.open)}>
      <summary>{t('Set a different minimum for each paper')}</summary>
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
              value={perPaper[paper] ?? ''}
              onChange={(e) => setPerPaper((prev) => ({ ...prev, [paper]: e.target.value }))}
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

  const examDateField = (
    <fieldset className="intake-field">
      <legend className="intake-question">{t('When is your exam?')}</legend>
      <div className="intake-date-row">
        <label htmlFor="intake-exam-date" className="sr-only">
          {t('Exam date')}
        </label>
        <input
          id="intake-exam-date"
          type="date"
          value={examDateInput}
          disabled={noDateConfirmed}
          onChange={(e) => {
            setExamDateInput(e.target.value);
            if (e.target.value) setNoDateConfirmed(false);
          }}
        />
        <button
          type="button"
          className={`intake-toggle-button${noDateConfirmed ? ' is-active' : ''}`}
          onClick={() => {
            setNoDateConfirmed((v) => !v);
            if (!noDateConfirmed) setExamDateInput('');
          }}
        >
          {t('I do not have a date yet')}
        </button>
      </div>
    </fieldset>
  );

  const studyDaysField = (
    <CapsuleRadioGroup
      legend={t('Which days can you study?')}
      name="intake-study-days"
      value={studyDays}
      onChange={(v) => setStudyDays(v)}
      options={[
        { value: 'daily' as const, label: t('Every day') },
        { value: 'weekdays' as const, label: t('Weekdays only') },
      ]}
    />
  );

  const dailyMinuteOptions: readonly CapsuleOption<string>[] = withLoadedOption(
    INTAKE_DAILY_MINUTES.map(String),
    loadedDailyMinutes !== null && !INTAKE_DAILY_MINUTES.includes(loadedDailyMinutes)
      ? String(loadedDailyMinutes)
      : null,
  ).map((value) => {
    const minutes = Number(value);
    return {
      value,
      label: t('{minutes} minutes', { minutes }),
      ...(minutes === 60 ? { hint: t("Your teacher's recommendation") } : {}),
    };
  });

  const dailyTimeField = (
    <div>
      <CapsuleRadioGroup
        legend={t('How long can you study each day?')}
        name="intake-daily-minutes"
        value={String(dailyMinutes)}
        onChange={(v) => chooseDailyMinutes(Number(v) as DailyMinutes)}
        helper={t(
          'On a hard day you can always ask for less time just for that day, from Today. It will not change this regular plan.',
        )}
        options={dailyMinuteOptions}
      />
      {needsConfirmNow && (
        <div className="intake-confirm">
          <p className="intake-question intake-question-small">
            {t('Can you really give {minutes} minutes most days?', { minutes: dailyMinutes })}
          </p>
          <div className="intake-confirm-actions">
            <button
              type="button"
              className={`intake-button intake-button-secondary${availabilityConfirmed ? ' is-active' : ''}`}
              onClick={() => setAvailabilityConfirmed(true)}
            >
              {t('Yes, I can commit to this')}
            </button>
            <button type="button" className="intake-button intake-button-ghost" onClick={askForLess}>
              {t("Let's be realistic")}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const languageField = (
    <CapsuleRadioGroup
      legend={t('Which language should explanations be in?')}
      name="intake-language"
      value={explanationLocale}
      onChange={(v) => setExplanationLocale(v)}
      helper={t(
        'Lessons, questions, passages and model answers always stay in English. This only changes the language Mr EZ explains things in.',
      )}
      options={(['en', 'ru'] as const).map((locale) => ({ value: locale, label: LOCALE_LABEL[locale] }))}
    />
  );

  const hardestPaperField = (
    <details className="intake-details" open={showHardest} onToggle={(e) => setShowHardest(e.currentTarget.open)}>
      <summary>{t('Tell us which paper feels hardest')}</summary>
      <CapsuleRadioGroup
        legend={t('Which paper feels hardest right now?')}
        name="intake-hardest-paper"
        value={hardestPaper}
        onChange={setHardestPaper}
        helper={t('A guess is fine. This is just a starting hint, real results replace it fast.')}
        options={PAPERS.map((paper) => ({ value: paper, label: t(PAPER_LABEL[paper]) }))}
      />
    </details>
  );

  const selfReportField = (
    <details className="intake-details" open={showSelfReport} onToggle={(e) => setShowSelfReport(e.currentTarget.open)}>
      <summary>{t('Add a recent score, if you have one')}</summary>
      <p className="intake-helper">
        {t('This is self-reported. It helps us get started, but it is never treated as a measured result.')}
      </p>
      {existingSelfReported.length > 0 && (
        <ul className="intake-selfreport-list">
          {existingSelfReported.map((score, index) => (
            <li key={index}>
              {t('Band {band}, self-reported, {date}', {
                band: score.band,
                date: score.takenOn,
              })}
              {score.paper ? ` (${t(PAPER_LABEL[score.paper])})` : ''}
            </li>
          ))}
        </ul>
      )}
      <div className="intake-selfreport-row">
        <div>
          <label htmlFor="intake-self-band">{t('Band')}</label>
          <select id="intake-self-band" value={selfBand} onChange={(e) => setSelfBand(e.target.value)}>
            <option value="">{t('Select')}</option>
            {SKILL_TARGET_BANDS.map((band) => (
              <option key={band} value={band}>
                {t('Band {band}', { band })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="intake-self-paper">{t('Paper (optional)')}</label>
          <select id="intake-self-paper" value={selfPaper} onChange={(e) => setSelfPaper(e.target.value as Paper | '')}>
            <option value="">{t('Overall')}</option>
            {PAPERS.map((paper) => (
              <option key={paper} value={paper}>
                {t(PAPER_LABEL[paper])}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="intake-self-date">{t('Date you took it')}</label>
          <input id="intake-self-date" type="date" value={selfDate} onChange={(e) => setSelfDate(e.target.value)} />
        </div>
        <button
          type="button"
          className="intake-button intake-button-secondary"
          disabled={!selfBand || !selfDate}
          onClick={addSelfReportedScore}
        >
          {t('Add this score')}
        </button>
      </div>
      {selfReportStatus === 'saved' && (
        <p role="status" className="intake-status">
          {t('Saved as self-reported.')}
        </p>
      )}
    </details>
  );

  if (variant === 'first-visit' && justSaved && savedPlan) {
    const outcome = planOutcome(savedPlan);
    return (
      <div className="intake intake-first-visit">
        <p role="status" className="intake-status">
          {t('Your plan is saved.')}
        </p>
        <OutcomePanel
          status={outcome.status}
          headline={outcome.headline}
          scopeNote={outcome.scopeNote}
          droppedMilestones={outcome.droppedMilestones}
          scopeTight={outcome.scopeTight}
        />
        <div className="intake-actions">
          <button type="button" className="intake-button intake-button-primary" onClick={() => onDone?.()}>
            {t('Continue')}
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'settings') {
    const outcome = planOutcome(plan);
    return (
      <div className="intake intake-settings">
        {justSaved && (
          <p role="status" className="intake-status">
            {t('Your changes are saved.')}
          </p>
        )}
        <OutcomePanel
          status={outcome.status}
          headline={outcome.headline}
          scopeNote={outcome.scopeNote}
          droppedMilestones={outcome.droppedMilestones}
          scopeTight={outcome.scopeTight}
        />
        <form
          className="intake-form"
          onChange={() => {setJustSaved(false);setDirty(true);}}
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <fieldset className="settings-group"><legend>{t('Your goal')}</legend>{targetBandField}{perPaperField}</fieldset>
          <fieldset className="settings-group"><legend>{t('Your schedule')}</legend>{examDateField}{studyDaysField}{dailyTimeField}</fieldset>
          <details className="support-disclosure"><summary>{t('Learning preferences')}</summary>{languageField}{hardestPaperField}{selfReportField}</details>
          {dirty && !justSaved && <p role="status" className="text-sm text-ink-muted">{t('You have unsaved changes.')}</p>}
          <div className="intake-actions">
            <button type="submit" className="intake-button intake-button-primary" disabled={saving}>
              {t('Save changes')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* first-visit: one question at a time */
  const stepContent = (() => {
    switch (step) {
      case 1:
        return (
          <>
            {targetBandField}
            {perPaperField}
          </>
        );
      case 2:
        return examDateField;
      case 3:
        return studyDaysField;
      case 4:
        return dailyTimeField;
      case 5:
        return languageField;
      default:
        return (
          <>
            {hardestPaperField}
            {selfReportField}
          </>
        );
    }
  })();

  const canGoNext = step !== 4 || canLeaveStep4;

  return (
    <div className="intake intake-first-visit">
      <StepShell step={step} total={STEP_COUNT}>
        {stepContent}
        <div className="intake-actions">
          {step > 1 && (
            <button type="button" className="intake-button intake-button-ghost" onClick={() => setStep((s) => s - 1)}>
              {t('Back')}
            </button>
          )}
          {step < STEP_COUNT ? (
            <button
              type="button"
              className="intake-button intake-button-primary"
              disabled={!canGoNext}
              onClick={() => setStep((s) => s + 1)}
            >
              {t('Next')}
            </button>
          ) : (
            <button type="button" className="intake-button intake-button-primary" disabled={saving} onClick={save}>
              {t('Save my plan')}
            </button>
          )}
        </div>
        <button type="button" className="intake-link-defer" onClick={() => onDefer?.()}>
          {t('Answer later')}
        </button>
      </StepShell>
    </div>
  );
}
