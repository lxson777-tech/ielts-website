/* Guided curriculum and calendar. Lesson ticks use existing progress keys;
   exam-readiness checklist ticks stay in the saved plan. */

import { useEffect, useMemo, useState } from 'react';
import { withBase } from '../lib/url';
import {
  saveStudyPlan,
  onStudyPlanChange,
  daysUntilTest,
  planTierFor,
  sanitiseSkillTargets,
  PLAN_TIER_LABEL,
  PLAN_SKILLS,
  PLAN_SKILL_LABEL,
  SKILL_TARGET_BANDS,
  TARGET_BANDS,
  type SavedPlan,
} from '../lib/study-plan';
import { getProgress, onProgressChange, type ProgressV1 } from '../lib/progress';
import { buildCourse, courseStatus, coursePace, isLessonDone } from '../lib/course';
import { loadOrCreateStudyPlan } from '../lib/plan/schedule';
import { getPlanSummary } from '../lib/plan/summary';
import { currentUnitId, recentlyCompletedUnitId } from '../lib/tutor/units';
import UnitNote from './tutor/UnitNote';
import WeekView from './plan/WeekView';

const DAILY_MINUTES_OPTIONS: NonNullable<SavedPlan['dailyMinutes']>[] = [15, 25, 40, 60];
const MODULES = buildCourse();

const SKILL_DOT: Record<string, string> = {
  reading: 'var(--color-reading)',
  listening: 'var(--color-listening)',
  writing: 'var(--color-writing)',
  speaking: 'var(--color-speaking)',
  vocabulary: 'var(--color-vocabulary)',
};

export default function Course({ settingsOnly = false }: { settingsOnly?: boolean }) {
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [ready, setReady] = useState(false);
  const [showEditor, setShowEditor] = useState(settingsOnly);
  const [saved, setSaved] = useState(false);
  const [targetBand, setTargetBand] = useState('6.5');
  const [testDate, setTestDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState<NonNullable<SavedPlan['dailyMinutes']>>(25);
  const [studyDays, setStudyDays] = useState<NonNullable<SavedPlan['studyDays']>>('daily');
  // Set when a saved plan predates the 2026-09 band range (it held 5.0-6.0,
  // the course now starts at 6.5): the select can't show that value since it
  // no longer has a matching option, so it's clamped to 6.5 and this drives a
  // note explaining why, right on the field, rather than silently swapping
  // the student's saved target the next time they submit the form.
  const [clampedFromBand, setClampedFromBand] = useState<string | null>(null);
  /* Per-paper minimums. '' means "no minimum of its own", which falls back to
     the overall target, so a student who does not care about per-paper floors
     never has to touch these four fields. */
  const [skillTargets, setSkillTargets] = useState<Record<string, string>>({});

  function seedEditorFields(saved: SavedPlan) {
    const savedBandValid = (TARGET_BANDS as readonly string[]).includes(saved.targetBand);
    setTargetBand(savedBandValid ? saved.targetBand : '6.5');
    setClampedFromBand(savedBandValid ? null : saved.targetBand);
    setTestDate(saved.testDate);
    setDailyMinutes(saved.dailyMinutes ?? 25);
    setStudyDays(saved.studyDays ?? 'daily');
    setSkillTargets({ ...(saved.skillTargets ?? {}) });
  }

  useEffect(() => {
    // A plan always exists from the first visit: loadOrCreateStudyPlan()
    // hands back the saved one, or fabricates and persists a default (see
    // createDefaultPlan in src/lib/plan/schedule.ts) so the course never
    // opens on a blank onboarding form.
    const initialPlan = loadOrCreateStudyPlan();
    setPlan(initialPlan);
    seedEditorFields(initialPlan);
    setProgress(getProgress());
    setReady(true);
    // Keep in step with both stores: a cloud pull can rewrite either, and
    // finishing a lesson in another tab must re-tick this list.
    const offPlan = onStudyPlanChange(() => setPlan(loadOrCreateStudyPlan()));
    const offProgress = onProgressChange(() => setProgress(getProgress()));
    return () => {
      offPlan();
      offProgress();
    };
  }, []);

  // Re-seed the editor's fields whenever the plan changes from outside (a
  // cloud pull, another tab, the initial load) while the editor itself is
  // closed - never mid-edit, that would blow away what the student just
  // typed.
  useEffect(() => {
    if (plan && !showEditor) seedEditorFields(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // Returning from a lesson is a normal back-navigation, which may be served
  // from the bfcache without remounting. Re-read on focus so the tick appears.
  useEffect(() => {
    const refresh = () => setProgress(getProgress());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  // Which unit (if any) gets a Mr EZ note, decided from the same progress
  // record the rest of the page already reads. Memoised so a re-render that
  // doesn't touch progress doesn't recompute this on every keystroke in the
  // settings form.
  const mrEzCurrentUnit = useMemo(() => currentUnitId(progress ?? getProgress()), [progress]);
  const mrEzWrapUnit = useMemo(() => recentlyCompletedUnitId(progress ?? getProgress(), new Date()), [progress]);

  if (!ready || !plan) return null; // avoid a hydration flash; plan always exists once ready
  // A stable non-null alias: the guard above narrows `plan` for this render,
  // but TypeScript won't carry that into the closures below (they could, in
  // principle, run after a later render where it's null again — it never
  // actually does, since loadOrCreateStudyPlan() always returns a plan, but
  // the alias says so in a way the type checker can verify too).
  const activePlan = plan;

  const prog = progress ?? getProgress();
  const status = courseStatus(MODULES, prog);
  const summary = getPlanSummary(activePlan);

  /* Settings, not onboarding: saving re-paces the plan in place (start date
     and doneKeys carry over unchanged, everything else is recomputed from
     the new settings) rather than gating the course behind a form. */
  function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: SavedPlan = {
      ...activePlan,
      targetBand,
      testDate,
      dailyMinutes,
      studyDays,
      skillTargets: sanitiseSkillTargets(skillTargets),
      defaulted: false,
    };
    saveStudyPlan(next);
    setPlan(next);
    setShowEditor(settingsOnly);
    setSaved(true);
  }

  function toggleExtra(key: string) {
    const current = activePlan.doneKeys ?? [];
    const doneKeys = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    const next = { ...activePlan, doneKeys };
    saveStudyPlan(next);
    setPlan(next);
  }

  const days = daysUntilTest(plan.testDate);
  const tier = planTierFor(days);
  const pace = coursePace(days, MODULES);
  const doneKeys = plan.doneKeys ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      {/* settings strip, then progress, then the week view, then the modules */}
      <div className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand">
              {PLAN_TIER_LABEL[tier]}
            </span>
            <span className="text-sm text-ink-muted">{summary.text}</span>
          </div>
          {!settingsOnly && <button
            type="button"
            onClick={() => setShowEditor((v) => !v)}
            className="shrink-0 rounded-button border border-border px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-surface-alt"
          >
            {showEditor ? 'Close' : 'Change'}
          </button>}
        </div>

        {summary.hint && !showEditor && <p className="mt-2 text-xs text-ink-muted">{summary.hint}</p>}

        {clampedFromBand && (
          <p className="mt-2 rounded-lg bg-warning-tint px-2.5 py-1.5 text-xs text-warning">
            Your saved target was Band {clampedFromBand}. The course now starts at Band 6.5, so we've set that here,
            pick a different band if you'd like.
          </p>
        )}

        {showEditor && (
          <form
            onSubmit={saveSettings}
            onChange={() => setSaved(false)}
            className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border bg-surface-alt p-3.5"
          >
            <div>
              <label className="block text-xs font-semibold" htmlFor="target-band-inline">
                Target band
              </label>
              <select
                id="target-band-inline"
                value={targetBand}
                onChange={(e) => {
                  setTargetBand(e.target.value);
                  setClampedFromBand(null); // they've made their own choice, the note no longer applies
                }}
                className="mt-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold focus:border-brand focus:outline-none"
              >
                {TARGET_BANDS.map((b) => (
                  <option key={b} value={b}>
                    Band {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold" htmlFor="test-date-inline">
                Exam date <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id="test-date-inline"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="mt-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold" htmlFor="daily-minutes-inline">
                Daily study time
              </label>
              <select
                id="daily-minutes-inline"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value) as NonNullable<SavedPlan['dailyMinutes']>)}
                className="mt-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold focus:border-brand focus:outline-none"
              >
                {DAILY_MINUTES_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} min/day
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold" htmlFor="study-days-inline">
                Study days
              </label>
              <select
                id="study-days-inline"
                value={studyDays}
                onChange={(e) => setStudyDays(e.target.value as NonNullable<SavedPlan['studyDays']>)}
                className="mt-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold focus:border-brand focus:outline-none"
              >
                <option value="daily">Every day</option>
                <option value="weekdays">Weekdays only</option>
              </select>
            </div>
            {/* Most universities ask for an overall band AND a floor in every
                paper, so one target is not enough to aim at. Left blank, a
                paper simply uses the overall target. */}
            <div className="w-full">
              <p className="text-xs font-semibold">
                Minimum in each paper <span className="font-normal text-ink-muted">(optional)</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Set these if your university asks for a minimum in every paper, for example 6.5 overall with nothing
                below 6.0. Leave one blank and it uses your target band.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PLAN_SKILLS.map((skill) => (
                  <div key={skill}>
                    <label className="block text-xs text-ink-muted" htmlFor={`skill-target-${skill}`}>
                      {PLAN_SKILL_LABEL[skill]}
                    </label>
                    <select
                      id={`skill-target-${skill}`}
                      value={skillTargets[skill] ?? ''}
                      onChange={(e) => setSkillTargets((s) => ({ ...s, [skill]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold focus:border-brand focus:outline-none"
                    >
                      <option value="">Same as target</option>
                      {SKILL_TARGET_BANDS.map((b) => (
                        <option key={b} value={b}>
                          Band {b}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="rounded-button bg-brand px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Save
            </button>
          </form>
        )}

        {saved && <p role="status" className="mt-4 text-sm font-semibold text-success">Your plan settings are saved.</p>}
        {settingsOnly && <a href={withBase('/dashboard')} className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Back to your dashboard</a>}
        {!settingsOnly && <>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span>
              {status.doneLessons} of {status.totalLessons} lessons done
            </span>
            <span>{status.percent}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-alt">
            <div
              className="bar-fill h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${status.percent}%` }}
            />
          </div>
        </div>

        {status.next ? (
          <a
            href={withBase(status.next.href)}
            className="mt-5 flex items-center justify-between gap-3 rounded-button bg-brand px-5 py-3 text-white transition-colors hover:bg-brand-hover"
          >
            <span className="min-w-0">
              <span className="block text-[0.7rem] font-bold uppercase tracking-wider opacity-80">
                {status.doneLessons === 0 ? 'Start with' : 'Continue with'} · {status.next.skillLabel}
              </span>
              <span className="block truncate font-display text-sm font-bold">{status.next.title}</span>
            </span>
          </a>
        ) : (
          <p className="mt-5 rounded-button bg-success-tint px-5 py-3 text-sm font-semibold text-success">
            Every lesson complete. Move on to Exam readiness below.
          </p>
        )}

        <p className="mt-3 text-xs text-ink-muted">
          {pace.note}
          {pace.lessonsPerWeek !== null && (
            <>
              {' '}
              <strong className="text-ink">About {pace.lessonsPerWeek} lesson{pace.lessonsPerWeek === 1 ? '' : 's'} a week.</strong>
            </>
          )}
        </p>
        </>}
      </div>

      {!settingsOnly && <>
      <p className="mt-6 text-sm text-ink-muted">Eight learning units, usually one per week. Start each paper with its overview, learn the method, then practise. Your calendar adjusts to your available dates; your completed lessons stay saved.</p>
      <WeekView />

      {/* modules */}
      <div className="mt-6 space-y-6" data-stagger>
        {MODULES.map((mod) => {
          const modDone = mod.lessons.filter((l) => isLessonDone(prog, l.key)).length;
          return (
            <section
              key={mod.id}
              id={mod.stage === 4 ? 'exam-readiness' : undefined}
              className="scroll-mt-24 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="font-display text-lg font-bold">
                  <span className="text-ink-muted">{mod.id}.</span> {mod.name}
                </h3>
                {mod.lessons.length > 0 && (
                  <span className="text-xs font-semibold text-ink-muted">
                    {modDone}/{mod.lessons.length} done
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-muted">{mod.blurb}</p>

              {mod.id === mrEzWrapUnit ? (
                <UnitNote unitId={mod.id} kind="wrap" />
              ) : mod.id === mrEzCurrentUnit && mod.id !== 8 ? (
                <UnitNote unitId={mod.id} kind="intro" />
              ) : null}

              {mod.lessons.length > 0 && (
                <ul className="mt-4 space-y-1">
                  {mod.lessons.map((lesson) => {
                    const done = isLessonDone(prog, lesson.key);
                    return (
                      <li key={lesson.key}>
                        <a
                          href={withBase(lesson.href)}
                          className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-alt"
                        >
                          <span
                            aria-hidden="true"
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold transition-colors duration-[240ms] ${
                              done ? 'bg-success text-white' : 'border border-border text-ink-muted'
                            }`}
                          >
                            {done ? (
                              <svg className="tick-svg" viewBox="0 0 24 24">
                                <polyline points="4,12.6 9.6,18.2 20,6.4" pathLength={1} />
                              </svg>
                            ) : (
                              lesson.position
                            )}
                          </span>
                          <span
                            className={`min-w-0 flex-1 truncate text-sm ${
                              done ? 'text-ink-muted line-through' : 'text-ink group-hover:text-brand'
                            }`}
                          >
                            {lesson.title}
                          </span>
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: SKILL_DOT[lesson.skill] }}
                          />
                          <span className="w-[4.5rem] shrink-0 text-right text-[0.7rem] font-semibold text-ink-muted">
                            {lesson.skillLabel}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}

              {mod.extras.length > 0 && (
                <ul className="mt-4 space-y-2.5">
                  {mod.extras.map((extra) => {
                    const checked = doneKeys.includes(extra.key);
                    return (
                      <li key={extra.key} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleExtra(extra.key)}
                          aria-label={`Mark complete: ${extra.label}`}
                          className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)] disabled:opacity-40"
                        />
                        <span className={`text-sm ${checked ? 'text-ink-muted line-through' : 'text-ink'}`}>
                          {extra.label}{' '}
                          <a href={withBase(extra.href)} className="font-semibold text-brand hover:underline">
                            Open
                          </a>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-ink-muted">
        Lessons tick themselves off when you mark them complete on the lesson page.
      </p>
      </>}
    </div>
  );
}
