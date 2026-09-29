/**
 * Intake: the short goal and availability questions a student answers once,
 * and can revisit from the plan settings page.
 *
 * Contract between the two packages:
 * - `variant="first-visit"` is the one-question-per-screen version shown on
 *   Today to a student whose goals are not confirmed yet. `variant="settings"`
 *   is the full editor on the plan settings page, every question on one form.
 * - The component saves through `updateGoalsAndConstraints` from
 *   `src/lib/learning`, which replans. It never writes the old study plan store
 *   directly.
 * - `onDone` is called after a successful save so the host can re-read the
 *   current session. `onDefer` is called when the student chooses to answer
 *   later, which must leave a visibly provisional plan in place.
 *
 * WHY ONE COMPONENT FOR BOTH VARIANTS
 * Both ask exactly the same questions and both must load an existing
 * confirmed setting exactly as it is (architecture section 4.2: "25 stays
 * 25"). One set of field state and one save path makes that automatic.
 * Neither variant invents a value: every field starts from `ensurePlan()`'s
 * real goals and constraints, and a field the student never touches is left
 * out of the save entirely (see `src/components/learning/intake/logic.ts`).
 *
 * THE REDO OF 24 SEPTEMBER 2026 (Alex: "make it feel more smooth")
 * - One question per screen, a thin progress line, and a short fade-and-slide
 *   between screens (forward and back), switched off under reduced motion.
 * - Single-choice screens move on by themselves a beat after a choice made
 *   with a pointer, so the choice is visibly selected first. Arrow keys never
 *   move on (see CapsuleRadioGroup); Enter does, and so does Next, which is
 *   always there. Back is always there.
 * - Focus moves to each new screen's heading, so a screen reader announces
 *   the question.
 * - Study days gain "Every other day" (a real schedule rule, see isStudyDay in
 *   planner.ts) and "Choose my days" (the existing custom days).
 * - The native date input is replaced by ./DatePicker in the site's style.
 * - The last screen is a summary of the answers, each with a way back to
 *   change it, before "Save my plan".
 * - The target-band question lives in ./IntakeTargetBand, see why there.
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ensurePlan, updateGoalsAndConstraints } from '../../lib/learning';
import { readLearnerRecord, recordSelfReported } from '../../lib/learning/store.browser';
import type { DailyMinutes, PersonalPlanV1 } from '../../lib/learning/contracts/plan';
import type { Paper } from '../../lib/learning/contracts/catalog';
import { PAPERS } from '../../lib/learning/contracts/catalog';
import { SKILL_TARGET_BANDS } from '../../lib/study-plan';
import type { Locale } from '../../lib/i18n/locale';
import { LOCALE_LABEL } from '../../lib/i18n/locale';
import { useT } from '../../lib/i18n/react';
import { planOutcome } from '../../lib/plan/summary';
import { todayKey } from '../../lib/plan/date';
import {
  buildConstraints,
  buildGoals,
  examDateAnswerFrom,
  initialDailyTimeSelection,
  initialStudyDaysSelection,
  INTAKE_DAILY_MINUTES,
  lighterDailyMinutes,
  needsFreshAvailabilityConfirm,
  selfReportedEntryFrom,
  WEEKDAYS_MONDAY_FIRST,
  type IntakeAnswers,
  type StudyDaysChoice,
  type Weekday,
} from '../learning/intake/logic';
import { CapsuleRadioGroup, IntakeProgress, OutcomePanel, type CapsuleOption } from '../learning/intake/ui';
import DatePicker from './DatePicker';
import { formatLongDate, formatShortDate, weekdayName } from './calendar';
import {
  PAPER_LABEL,
  PerSectionMinimums,
  TargetBandQuestion,
  useTargetBand,
  withLoadedOption,
} from './IntakeTargetBand';
import '../../styles/learning-intake.css';

export interface IntakeProps {
  variant: 'first-visit' | 'settings';
  onDone?: () => void;
  onDefer?: () => void;
}

type StepId = 'target' | 'exam' | 'days' | 'time' | 'language' | 'extras' | 'review';
const STEPS: readonly StepId[] = ['target', 'exam', 'days', 'time', 'language', 'extras', 'review'];

/** How long a picked option stays on screen, visibly selected, before the
    next question slides in. Long enough to see the choice land, short
    enough not to feel like waiting. */
const ADVANCE_DELAY_MS = 420;
/** The outgoing half of a step change. The incoming half is CSS only. */
const LEAVE_MS = 150;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function Intake({ variant, onDone, onDefer }: IntakeProps) {
  const { t, locale } = useT();
  const calLocale = locale === 'ru' ? 'ru' : 'en';
  const [ready, setReady] = useState(false);
  const [plan, setPlan] = useState<PersonalPlanV1 | null>(null);
  const [today] = useState(() => todayKey());
  const [existingSelfReported, setExistingSelfReported] = useState<
    readonly { paper?: Paper; band: number; takenOn: string }[]
  >([]);

  /* ── Answers ─────────────────────────────────────────────────────────── */

  const target = useTargetBand();

  const [examDateInput, setExamDateInput] = useState('');
  const [examDateLoaded, setExamDateLoaded] = useState<string | null>(null);
  const [noDateConfirmed, setNoDateConfirmed] = useState(false);

  const [studyDays, setStudyDays] = useState<StudyDaysChoice>('daily');
  const [customDays, setCustomDays] = useState<Weekday[]>([]);
  const [loadedStudyDays, setLoadedStudyDays] = useState<{ choice: StudyDaysChoice; customDays: Weekday[] } | null>(
    null,
  );

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

  /* ── One question per screen ─────────────────────────────────────────── */

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [leaving, setLeaving] = useState(false);
  /* Set when the student jumped back from the summary to change one answer:
     moving on from that screen returns straight to the summary. */
  const [returnToReview, setReturnToReview] = useState(false);
  const advanceTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const movedByStudent = useRef(false);
  /* The latest `next`, for the delayed auto-advance: the timer must act on
     what is on screen when it fires (a confirmation just given, say), not
     on the render that started it. */
  const nextRef = useRef<() => void>(() => {});

  useEffect(() => {
    const current = ensurePlan();
    setPlan(current);

    target.load(current.goals);

    setExamDateInput(current.goals.examDate?.date ?? '');
    setExamDateLoaded(current.goals.examDate?.date ?? null);

    const days = initialStudyDaysSelection(current.constraints);
    setStudyDays(days.choice);
    setCustomDays(days.customDays);
    setLoadedStudyDays(days);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* A new screen: its heading takes the focus, so the question is what a
     screen reader says next, and the card is scrolled into view on a phone.
     Not on the first render, which must never steal focus from the page. */
  useEffect(() => {
    if (!movedByStudent.current) return;
    const heading = headingRef.current;
    if (!heading) return;
    heading.focus({ preventScroll: true });
    const rect = heading.getBoundingClientRect();
    if (rect.top < 80 || rect.top > window.innerHeight * 0.6) {
      heading.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [stepIndex]);

  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    },
    [],
  );

  const needsConfirmNow = useMemo(
    () => (plan ? needsFreshAvailabilityConfirm(plan.constraints, dailyMinutes) : true),
    [plan, dailyMinutes],
  );

  if (!ready || !plan) return null;
  const loadedPlan = plan;

  /* ── Answer helpers ──────────────────────────────────────────────────── */

  function chooseDailyMinutes(next: DailyMinutes) {
    setDailyMinutes(next);
    setAvailabilityConfirmed(false);
  }

  function askForLess() {
    setDailyMinutes(lighterDailyMinutes(dailyMinutes));
    setAvailabilityConfirmed(false);
  }

  function toggleCustomDay(day: Weekday) {
    setCustomDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
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

  /** Study days are sent only when the student actually changed them, so a
      plan's days (and an "every other day" plan's starting day) survive a
      save that was about something else, byte for byte. */
  function studyDaysAnswer(): Pick<IntakeAnswers, 'studyDays' | 'customStudyDays' | 'alternateAnchor'> {
    const loaded = loadedStudyDays;
    const sortedNow = [...customDays].sort((a, b) => a - b);
    const sortedLoaded = [...(loaded?.customDays ?? [])].sort((a, b) => a - b);
    const unchanged =
      loaded !== null &&
      loaded.choice === studyDays &&
      (studyDays !== 'custom' ||
        (sortedNow.length === sortedLoaded.length && sortedNow.every((d, i) => d === sortedLoaded[i])));
    if (unchanged) return {};
    if (studyDays === 'custom') return { studyDays, customStudyDays: sortedNow };
    if (studyDays === 'alternate') return { studyDays, alternateAnchor: today };
    return { studyDays };
  }

  function buildAnswers(): IntakeAnswers {
    const answers: IntakeAnswers = {
      ...studyDaysAnswer(),
      dailyMinutes,
      availabilityConfirmed,
      explanationLocale,
      ...target.answers(),
    };
    const examAnswer = examDateAnswerFrom({ value: examDateInput, noDateConfirmed, loadedDate: examDateLoaded });
    if (examAnswer !== undefined) answers.examDate = examAnswer;
    if (hardestPaper) answers.hardestPaper = hardestPaper;
    return answers;
  }

  function save() {
    setSaving(true);
    const answers = buildAnswers();
    const goals = buildGoals(loadedPlan.goals, answers, new Date().toISOString());
    const constraints = buildConstraints(loadedPlan.constraints, answers);
    const next = updateGoalsAndConstraints({ goals, constraints });
    setPlan(next);
    setSavedPlan(next);
    setJustSaved(true);
    setSaving(false);
    /* The saved answers are the new "loaded" state: a second save on the
       settings page compares against them, not against the first load. */
    const days = initialStudyDaysSelection(next.constraints);
    setLoadedStudyDays(days);
    setExamDateLoaded(next.goals.examDate?.date ?? null);
    setNoDateConfirmed(false);
    if (next.constraints.regularDailyMinutesStatus === 'confirmed') {
      setLoadedDailyMinutes(next.constraints.regularDailyMinutes);
    }
    if (variant === 'settings') onDone?.();
  }

  /* ── Wording shared by the fields and the summary ────────────────────── */

  const studyDaysLabel: Record<StudyDaysChoice, string> = {
    daily: t('Every day'),
    alternate: t('Every other day'),
    weekdays: t('Weekdays'),
    custom: t('Choose my days'),
  };

  function customDaysText(days: readonly Weekday[]): string {
    return WEEKDAYS_MONDAY_FIRST.filter((d) => days.includes(d))
      .map((d) => weekdayName(d, calLocale, 'short'))
      .join(', ');
  }

  /** The day "every other day" counts from: the plan's own, when it is
      already on that rhythm and the student left it alone, else today. */
  const alternateStart =
    studyDays === 'alternate' && plan.constraints.studyDays === 'alternate' && plan.constraints.alternateAnchor
      ? plan.constraints.alternateAnchor
      : today;

  /* ── The fields ──────────────────────────────────────────────────────── */

  const firstVisit = variant === 'first-visit';
  const headingId = 'intake-step-heading';
  const labelledBy = firstVisit ? headingId : undefined;

  const examDateField = (
    <div className={firstVisit ? 'intake-exam' : 'intake-field intake-exam'}>
      {!firstVisit && (
        <p className="intake-question" id="intake-exam-question">
          {t('When is your exam?')}
        </p>
      )}
      <p className="intake-helper">{t('Pick the day of your test. You can change it later in plan settings.')}</p>
      <div className="intake-date-row">
        <DatePicker
          id="intake-exam-date"
          value={examDateInput}
          today={today}
          min={today}
          placeholder={t('Choose a date')}
          labelledBy={firstVisit ? headingId : 'intake-exam-question'}
          showCountdown
          onChange={(iso) => {
            setExamDateInput(iso);
            setNoDateConfirmed(false);
            if (!firstVisit) setJustSaved(false);
          }}
        />
        <button
          type="button"
          className={`intake-toggle-button${noDateConfirmed ? ' is-active' : ''}`}
          aria-pressed={noDateConfirmed}
          onClick={(event) => {
            const next = !noDateConfirmed;
            setNoDateConfirmed(next);
            if (next) setExamDateInput('');
            if (!firstVisit) setJustSaved(false);
            if (next && firstVisit && event.detail > 0) scheduleAdvance();
          }}
        >
          {t('I do not have a date yet')}
        </button>
      </div>
    </div>
  );

  const studyDaysField = (
    <div className={firstVisit ? '' : 'intake-field intake-field-group'}>
      <CapsuleRadioGroup
        legend={t('Which days can you study?')}
        labelledBy={labelledBy}
        name="intake-study-days"
        layout="cards"
        value={studyDays}
        onChange={(v) => setStudyDays(v)}
        onPick={(v) => {
          if (v !== 'custom') scheduleAdvance();
        }}
        options={[
          { value: 'daily' as const, label: studyDaysLabel.daily, hint: t('Seven days a week') },
          {
            value: 'alternate' as const,
            label: studyDaysLabel.alternate,
            hint:
              alternateStart === today
                ? t('Study today, rest tomorrow, and so on')
                : t('Counting from {date}', { date: formatShortDate(alternateStart, calLocale, today) }),
          },
          { value: 'weekdays' as const, label: studyDaysLabel.weekdays, hint: t('Monday to Friday') },
          { value: 'custom' as const, label: studyDaysLabel.custom, hint: t('Pick the days that suit you') },
        ]}
      />
      {studyDays === 'custom' && (
        <div className="intake-weekdays" role="group" aria-label={t('Your study days')}>
          {WEEKDAYS_MONDAY_FIRST.map((day) => {
            const on = customDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                className={`intake-weekday${on ? ' is-on' : ''}`}
                aria-pressed={on}
                aria-label={weekdayName(day, calLocale, 'long')}
                onClick={() => {
                  toggleCustomDay(day);
                  if (!firstVisit) setJustSaved(false);
                }}
              >
                {weekdayName(day, calLocale, 'short')}
              </button>
            );
          })}
        </div>
      )}
      {studyDays === 'custom' && customDays.length === 0 && (
        <p className="intake-helper intake-helper-tight">{t('Choose at least one day.')}</p>
      )}
    </div>
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
    <div className={firstVisit ? '' : 'intake-field intake-field-group'}>
      <CapsuleRadioGroup
        legend={t('How long can you study each day?')}
        labelledBy={labelledBy}
        name="intake-daily-minutes"
        layout="cards"
        value={String(dailyMinutes)}
        onChange={(v) => chooseDailyMinutes(Number(v) as DailyMinutes)}
        onPick={(v) => {
          /* Only a choice that needs no fresh "can you really" answer may
             move on by itself. Otherwise the confirmation below must be
             answered first: sixty minutes is advice, never applied
             silently. */
          if (!needsFreshAvailabilityConfirm(loadedPlan.constraints, Number(v) as DailyMinutes)) scheduleAdvance();
        }}
        helper={t(
          'On a hard day you can always ask for less time just for that day, from Today. It will not change this regular plan.',
        )}
        options={dailyMinuteOptions}
      />
      {needsConfirmNow && (
        <div className={`intake-confirm${availabilityConfirmed ? ' is-confirmed' : ''}`}>
          <p className="intake-question intake-question-small">
            {t('Can you really give {minutes} minutes most days?', { minutes: dailyMinutes })}
          </p>
          <div className="intake-confirm-actions">
            <button
              type="button"
              className={`intake-button intake-button-secondary${availabilityConfirmed ? ' is-active' : ''}`}
              aria-pressed={availabilityConfirmed}
              onClick={(event) => {
                setAvailabilityConfirmed(true);
                if (!firstVisit) setJustSaved(false);
                if (firstVisit && event.detail > 0) scheduleAdvance();
              }}
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
      labelledBy={labelledBy}
      name="intake-language"
      value={explanationLocale}
      onChange={(v) => setExplanationLocale(v)}
      onPick={() => scheduleAdvance()}
      helper={t(
        'Lessons, questions, passages and model answers always stay in English. This only changes the language Mr EZ explains things in.',
      )}
      options={(['en', 'ru'] as const).map((l) => ({ value: l, label: LOCALE_LABEL[l] }))}
    />
  );

  const hardestPaperOptions = PAPERS.map((paper) => ({ value: paper, label: t(PAPER_LABEL[paper]) }));

  /* On the settings page the optional question stays behind a disclosure,
     as before; one question per screen shows it as that screen's question. */
  const hardestPaperField = firstVisit ? (
    <CapsuleRadioGroup
      legend={t('Which section feels hardest right now?')}
      labelledBy={labelledBy}
      name="intake-hardest-paper"
      value={hardestPaper}
      onChange={setHardestPaper}
      helper={t('A guess is fine. This is just a starting hint, real results replace it fast.')}
      options={hardestPaperOptions}
    />
  ) : (
    <details className="intake-details" open={showHardest} onToggle={(e) => setShowHardest(e.currentTarget.open)}>
      <summary>{t('Tell us which section feels hardest')}</summary>
      <CapsuleRadioGroup
        legend={t('Which section feels hardest right now?')}
        name="intake-hardest-paper"
        value={hardestPaper}
        onChange={setHardestPaper}
        helper={t('A guess is fine. This is just a starting hint, real results replace it fast.')}
        options={hardestPaperOptions}
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
          <label htmlFor="intake-self-paper">{t('Section (optional)')}</label>
          <select id="intake-self-paper" value={selfPaper} onChange={(e) => setSelfPaper(e.target.value as Paper | '')}>
            <option value="">{t('Overall')}</option>
            {PAPERS.map((paper) => (
              <option key={paper} value={paper}>
                {t(PAPER_LABEL[paper])}
              </option>
            ))}
          </select>
        </div>
        <div className="intake-selfreport-date">
          <span className="intake-selfreport-label" id="intake-self-date-label">
            {t('Date you took it')}
          </span>
          <DatePicker
            id="intake-self-date"
            value={selfDate}
            today={today}
            max={today}
            placeholder={t('Choose a date')}
            labelledBy="intake-self-date-label"
            onChange={setSelfDate}
          />
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

  /* ── After a first-visit save ────────────────────────────────────────── */

  if (firstVisit && justSaved && savedPlan) {
    const outcome = planOutcome(savedPlan);
    return (
      <div className="intake intake-first-visit">
        <div className="intake-stage is-forward">
          <p role="status" className="intake-status intake-status-saved">
            <span className="intake-status-tick" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
                <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
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
      </div>
    );
  }

  /* ── Settings: every question on one form ────────────────────────────── */

  if (!firstVisit) {
    const outcome = planOutcome(plan);
    const canSave = !(studyDays === 'custom' && customDays.length === 0);
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
            if (canSave) save();
          }}
        >
          <fieldset className="settings-group"><legend>{t('Your goal')}</legend><TargetBandQuestion state={target} /><PerSectionMinimums state={target} /></fieldset>
          <fieldset className="settings-group"><legend>{t('Your schedule')}</legend>{examDateField}{studyDaysField}{dailyTimeField}</fieldset>
          <details className="support-disclosure"><summary>{t('Learning preferences')}</summary>{languageField}{hardestPaperField}{selfReportField}</details>
          {dirty && !justSaved && <p role="status" className="text-sm text-ink-muted">{t('You have unsaved changes.')}</p>}
          <div className="intake-actions">
            <button type="submit" className="intake-button intake-button-primary" disabled={saving || !canSave}>
              {t('Save changes')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ── First visit: one question per screen ────────────────────────────── */

  const step = STEPS[stepIndex] ?? 'review';
  const reviewIndex = STEPS.indexOf('review');

  function goTo(index: number, dir: 'forward' | 'back') {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    movedByStudent.current = true;
    setDirection(dir);
    if (prefersReducedMotion()) {
      setLeaving(false);
      setStepIndex(index);
      return;
    }
    setLeaving(true);
    leaveTimer.current = window.setTimeout(() => {
      leaveTimer.current = null;
      setLeaving(false);
      setStepIndex(index);
    }, LEAVE_MS);
  }

  const canLeaveTime = !needsConfirmNow || availabilityConfirmed;
  const canGoNext =
    (step !== 'time' || canLeaveTime) && (step !== 'days' || studyDays !== 'custom' || customDays.length > 0);

  function next() {
    if (!canGoNext) return;
    if (returnToReview) {
      setReturnToReview(false);
      goTo(reviewIndex, 'forward');
      return;
    }
    goTo(Math.min(stepIndex + 1, STEPS.length - 1), 'forward');
  }

  function back() {
    setReturnToReview(false);
    goTo(Math.max(stepIndex - 1, 0), 'back');
  }

  /** Move on by itself, a beat after a pointer choice. The check runs when
      the beat is over, against what is on screen then. */
  function scheduleAdvance() {
    if (!firstVisit) return;
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(
      () => {
        advanceTimer.current = null;
        nextRef.current();
      },
      prefersReducedMotion() ? 120 : ADVANCE_DELAY_MS,
    );
  }

  nextRef.current = next;

  function change(stepId: StepId) {
    setReturnToReview(true);
    goTo(STEPS.indexOf(stepId), 'back');
  }

  /* Enter moves on from anywhere on a screen except a control that has its
     own meaning for Enter (a button, a link, a select, a text box, the
     calendar). */
  function onStageKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' || event.defaultPrevented) return;
    const el = event.target as HTMLElement;
    if (el.closest('button, a, select, textarea, summary, .dp, input:not([type=radio])')) return;
    if (step === 'review') return;
    event.preventDefault();
    next();
  }

  /* ── The summary ─────────────────────────────────────────────────────── */

  const examAnswer = examDateAnswerFrom({ value: examDateInput, noDateConfirmed, loadedDate: examDateLoaded });
  const examIso = examAnswer === undefined ? null : examAnswer;
  const band = target.overall;

  const headlineParts: string[] = [];
  if (band && examIso) headlineParts.push(t('Band {band} by {date}', { band, date: formatShortDate(examIso, calLocale, today) }));
  else if (band && examAnswer === null) headlineParts.push(t('Band {band}, no exam date yet', { band }));
  else if (band) headlineParts.push(t('Band {band}', { band }));
  else if (examIso) headlineParts.push(t('Exam on {date}', { date: formatShortDate(examIso, calLocale, today) }));
  headlineParts.push(
    studyDays === 'daily'
      ? t('every day')
      : studyDays === 'alternate'
        ? t('every other day')
        : studyDays === 'weekdays'
          ? t('on weekdays')
          : t('on {days}', { days: customDaysText(customDays) }),
  );
  headlineParts.push(t('{minutes} minutes a day', { minutes: dailyMinutes }));
  const headline = headlineParts.join(', ');
  const headlineText = headline.charAt(0).toLocaleUpperCase() + headline.slice(1);

  const reviewRows: { id: StepId; label: string; value: string }[] = [
    { id: 'target', label: t('Target'), value: band ? t('Band {band}', { band }) : t('Not chosen yet') },
    {
      id: 'exam',
      label: t('Exam date'),
      value: examIso ? formatLongDate(examIso, calLocale) : examAnswer === null ? t('No date yet') : t('Not chosen yet'),
    },
    {
      id: 'days',
      label: t('Study days'),
      value:
        studyDays === 'alternate'
          ? t('Every other day, starting {date}', { date: formatShortDate(alternateStart, calLocale, today) })
          : studyDays === 'custom'
            ? customDaysText(customDays)
            : studyDaysLabel[studyDays],
    },
    { id: 'time', label: t('Time each day'), value: t('{minutes} minutes', { minutes: dailyMinutes }) },
    { id: 'language', label: t('Explanations in'), value: LOCALE_LABEL[explanationLocale] },
    {
      id: 'extras',
      label: t('Hardest section'),
      value: hardestPaper ? t(PAPER_LABEL[hardestPaper]) : t('Not chosen yet'),
    },
  ];

  const questionFor: Record<StepId, string> = {
    target: t('What overall band are you aiming for?'),
    exam: t('When is your exam?'),
    days: t('Which days can you study?'),
    time: t('How long can you study each day?'),
    language: t('Which language should explanations be in?'),
    extras: t('Which section feels hardest right now?'),
    review: t('Here is your plan'),
  };

  let body: ReactNode;
  switch (step) {
    case 'target':
      body = (
        <>
          <TargetBandQuestion
            state={target}
            labelledBy={headingId}
            onPick={() => {
              if (!target.showPerPaper) scheduleAdvance();
            }}
          />
          <PerSectionMinimums state={target} />
        </>
      );
      break;
    case 'exam':
      body = examDateField;
      break;
    case 'days':
      body = studyDaysField;
      break;
    case 'time':
      body = dailyTimeField;
      break;
    case 'language':
      body = languageField;
      break;
    case 'extras':
      body = (
        <>
          <p className="intake-optional">{t('Optional')}</p>
          {hardestPaperField}
          {selfReportField}
        </>
      );
      break;
    default:
      body = (
        <div className="intake-review">
          <p className="intake-review-headline">{headlineText}</p>
          <dl className="intake-review-list">
            {reviewRows.map((row) => (
              <div key={row.id} className="intake-review-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
                <button type="button" className="intake-review-change" onClick={() => change(row.id)}>
                  {t('Change')}
                  <span className="sr-only"> {row.label}</span>
                </button>
              </div>
            ))}
          </dl>
        </div>
      );
  }

  const isReview = step === 'review';
  const progressLabel = isReview
    ? t('Last step: check your answers')
    : t('Question {n} of {total}', { n: stepIndex + 1, total: STEPS.length - 1 });

  return (
    <div className="intake intake-first-visit">
      <IntakeProgress step={stepIndex + 1} total={STEPS.length} label={progressLabel} />
      <div
        key={stepIndex}
        className={`intake-stage is-${direction}${leaving ? ' is-leaving' : ''}`}
        onKeyDown={onStageKeyDown}
        data-step={step}
      >
        <h3 className="intake-question intake-step-heading" id={headingId} ref={headingRef} tabIndex={-1}>
          {questionFor[step]}
        </h3>
        {body}
        <div className="intake-actions">
          {stepIndex > 0 && (
            <button type="button" className="intake-button intake-button-ghost intake-button-back" onClick={back}>
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
                <path d="M10 3.5L5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('Back')}
            </button>
          )}
          <span className="intake-actions-spacer" />
          {isReview ? (
            <button type="button" className="intake-button intake-button-primary" disabled={saving} onClick={save}>
              {t('Save my plan')}
            </button>
          ) : (
            <button type="button" className="intake-button intake-button-primary" disabled={!canGoNext} onClick={next}>
              {returnToReview ? t('Back to summary') : t('Next')}
            </button>
          )}
        </div>
      </div>
      <button type="button" className="intake-link-defer" onClick={() => onDefer?.()}>
        {t('Answer later')}
      </button>
    </div>
  );
}
