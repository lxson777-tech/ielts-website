/* "Start Here" course. Takes a target band and a test date, then lays out the
   site's 44 lessons as one ordered path grouped into four modules, with a
   Continue button that always points at the next unfinished lesson.

   This replaces the old study-plan builder, which generated a hand-written
   list of ~13 generic steps ("Study the Reading Overview") that restated the
   lesson catalogue and drifted whenever a lesson was added. The modules now
   come from src/lib/course.ts, which is derived from the part registries.

   Two different kinds of row, deliberately:
   - Lesson rows are links whose tick is READ from progress.lessons. You mark a
     lesson complete on the lesson page itself, exactly as before, so there is
     one place completion is recorded and lessons finished before starting the
     course are already ticked here.
   - Exam-readiness rows are checkboxes, because nothing in the progress store
     records "I sat a mock". Those ticks are stored in the plan's doneKeys. */

import { useEffect, useState } from 'react';
import { withBase } from '../lib/url';
import {
  loadStudyPlan,
  saveStudyPlan,
  onStudyPlanChange,
  daysUntilTest,
  planTierFor,
  PLAN_TIER_LABEL,
  type SavedPlan,
} from '../lib/study-plan';
import { getProgress, onProgressChange, type ProgressV1 } from '../lib/progress';
import { buildCourse, courseStatus, coursePace, isLessonDone } from '../lib/course';
import { toLocalDateKey } from '../lib/plan/date';
import WeekView from './plan/WeekView';

const TARGET_BANDS = ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0'];
const DAILY_MINUTES_OPTIONS: NonNullable<SavedPlan['dailyMinutes']>[] = [15, 25, 40, 60];
const MODULES = buildCourse();

const SKILL_DOT: Record<string, string> = {
  reading: 'var(--color-reading)',
  listening: 'var(--color-listening)',
  writing: 'var(--color-writing)',
  speaking: 'var(--color-speaking)',
  vocabulary: 'var(--color-vocabulary)',
};

export default function Course() {
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [ready, setReady] = useState(false);
  const [targetBand, setTargetBand] = useState('6.5');
  const [testDate, setTestDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState<NonNullable<SavedPlan['dailyMinutes']>>(25);
  const [studyDays, setStudyDays] = useState<NonNullable<SavedPlan['studyDays']>>('daily');

  useEffect(() => {
    const saved = loadStudyPlan();
    if (saved) {
      setPlan(saved);
      setTargetBand(saved.targetBand);
      setTestDate(saved.testDate);
      setDailyMinutes(saved.dailyMinutes ?? 25);
      setStudyDays(saved.studyDays ?? 'daily');
    }
    setProgress(getProgress());
    setReady(true);
    // Keep in step with both stores: a cloud pull can rewrite either, and
    // finishing a lesson in another tab must re-tick this list.
    const offPlan = onStudyPlanChange(() => setPlan(loadStudyPlan()));
    const offProgress = onProgressChange(() => setProgress(getProgress()));
    return () => {
      offPlan();
      offProgress();
    };
  }, []);

  // Returning from a lesson is a normal back-navigation, which may be served
  // from the bfcache without remounting. Re-read on focus so the tick appears.
  useEffect(() => {
    const refresh = () => setProgress(getProgress());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  if (!ready) return null; // avoid a hydration flash

  const prog = progress ?? getProgress();
  const status = courseStatus(MODULES, prog);
  // A student who worked through lessons from /learn before ever visiting
  // /start has already started, even with no saved plan. Showing them a
  // blank onboarding form would bury that progress, so only someone with
  // zero completed lessons and no plan sees it; everyone else sees the
  // course itself; with an inline strip asking for a target when there's
  // no plan yet.
  const hasProgress = status.doneLessons > 0;

  function startCourse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: SavedPlan = {
      targetBand,
      testDate,
      createdAt: new Date().toISOString(),
      startDate: plan?.startDate ?? toLocalDateKey(new Date()),
      dailyMinutes,
      studyDays,
      done: [],
      doneKeys: plan?.doneKeys ?? [],
    };
    saveStudyPlan(next);
    setPlan(next);
  }

  function toggleExtra(key: string) {
    if (!plan) return;
    const current = plan.doneKeys ?? [];
    const doneKeys = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    const next = { ...plan, doneKeys };
    saveStudyPlan(next);
    setPlan(next);
  }

  /* ── Start screen: only for a genuinely new student ── */
  if (!plan && !hasProgress) {
    return (
      <form
        onSubmit={startCourse}
        className="mx-auto max-w-xl rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
      >
        <h2 className="font-display text-xl font-extrabold">Start the course</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Every lesson on the site, in the order that works. Two quick questions and we'll set your pace.
        </p>

        <label className="mt-6 block text-sm font-semibold" htmlFor="target-band">
          What band are you aiming for?
        </label>
        <select
          id="target-band"
          value={targetBand}
          onChange={(e) => setTargetBand(e.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 font-semibold focus:border-brand focus:outline-none"
        >
          {TARGET_BANDS.map((b) => (
            <option key={b} value={b}>
              Band {b}
            </option>
          ))}
        </select>

        <label className="mt-5 block text-sm font-semibold" htmlFor="test-date">
          When is your test? <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="test-date"
          type="date"
          value={testDate}
          onChange={(e) => setTestDate(e.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 font-semibold focus:border-brand focus:outline-none"
        />
        <p className="mt-1.5 text-xs text-ink-muted">
          No date yet? Leave it blank and work through at your own pace.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold" htmlFor="daily-minutes">
              Daily study time
            </label>
            <select
              id="daily-minutes"
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(Number(e.target.value) as NonNullable<SavedPlan['dailyMinutes']>)}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 font-semibold focus:border-brand focus:outline-none"
            >
              {DAILY_MINUTES_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor="study-days">
              Study days
            </label>
            <select
              id="study-days"
              value={studyDays}
              onChange={(e) => setStudyDays(e.target.value as NonNullable<SavedPlan['studyDays']>)}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 font-semibold focus:border-brand focus:outline-none"
            >
              <option value="daily">Every day</option>
              <option value="weekdays">Weekdays only</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="mt-7 w-full rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-brand-hover"
        >
          Start my course
        </button>
      </form>
    );
  }

  /* ── The course, with or without a saved plan yet ── */
  const days = plan ? daysUntilTest(plan.testDate) : null;
  const tier = planTierFor(days);
  const pace = coursePace(days, MODULES);
  const doneKeys = plan?.doneKeys ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      {/* summary header */}
      <div className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        {plan ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand">
              {PLAN_TIER_LABEL[tier]}
            </span>
            <span className="text-sm text-ink-muted">
              Target <strong className="text-ink">Band {plan.targetBand}</strong>
              {days !== null && (
                <>
                  {' '}· <strong className="text-ink">{days}</strong> day{days === 1 ? '' : 's'} to go
                </>
              )}
            </span>
          </div>
        ) : (
          <form
            onSubmit={startCourse}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border bg-surface-alt p-3.5"
          >
            <div className="w-full basis-full">
              <p className="text-sm font-bold">Set your target band and exam date</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                You've already completed {status.doneLessons} lesson{status.doneLessons === 1 ? '' : 's'}. Add your
                target so the course can pace the rest for you.
              </p>
            </div>
            <label className="sr-only" htmlFor="target-band-inline">
              Target band
            </label>
            <select
              id="target-band-inline"
              value={targetBand}
              onChange={(e) => setTargetBand(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold focus:border-brand focus:outline-none"
            >
              {TARGET_BANDS.map((b) => (
                <option key={b} value={b}>
                  Band {b}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="test-date-inline">
              Test date (optional)
            </label>
            <input
              id="test-date-inline"
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold focus:border-brand focus:outline-none"
            />
            <label className="sr-only" htmlFor="daily-minutes-inline">
              Daily study time
            </label>
            <select
              id="daily-minutes-inline"
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(Number(e.target.value) as NonNullable<SavedPlan['dailyMinutes']>)}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold focus:border-brand focus:outline-none"
            >
              {DAILY_MINUTES_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} min/day
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="study-days-inline">
              Study days
            </label>
            <select
              id="study-days-inline"
              value={studyDays}
              onChange={(e) => setStudyDays(e.target.value as NonNullable<SavedPlan['studyDays']>)}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold focus:border-brand focus:outline-none"
            >
              <option value="daily">Every day</option>
              <option value="weekdays">Weekdays only</option>
            </select>
            <button
              type="submit"
              className="rounded-button bg-brand px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Set plan
            </button>
          </form>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span>
              {status.doneLessons} of {status.totalLessons} lessons done
            </span>
            <span>{status.percent}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
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
            Every lesson complete. Move on to Exam readiness below. 🎉
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
      </div>

      <WeekView />

      {/* modules */}
      <div className="mt-6 space-y-6">
        {MODULES.map((mod) => {
          const modDone = mod.lessons.filter((l) => isLessonDone(prog, l.key)).length;
          const optional = mod.stage > pace.focusThrough && mod.stage !== 4;
          return (
            <section
              key={mod.stage}
              id={mod.stage === 4 ? 'exam-readiness' : undefined}
              className="scroll-mt-24 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="font-display text-lg font-bold">
                  <span className="text-ink-muted">{mod.stage}.</span> {mod.name}
                </h3>
                {mod.lessons.length > 0 && (
                  <span className="text-xs font-semibold text-ink-muted">
                    {modDone}/{mod.lessons.length} done
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-muted">{mod.blurb}</p>
              {optional && (
                <p className="mt-2 rounded-lg bg-surface-alt px-3 py-2 text-xs text-ink-muted">
                  Optional at your pace: with {days} days left, prioritise the earlier modules and Exam readiness.
                </p>
              )}

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
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold ${
                              done ? 'bg-success text-white' : 'border border-border text-ink-muted'
                            }`}
                          >
                            {done ? '✓' : lesson.position}
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
                          disabled={!plan}
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          Lessons tick themselves off when you mark them complete on the lesson page.
        </p>
        {plan && (
          <button
            type="button"
            onClick={() => setPlan(null)}
            className="-my-2 py-2 text-xs font-semibold text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            Change my target or test date
          </button>
        )}
      </div>
    </div>
  );
}
