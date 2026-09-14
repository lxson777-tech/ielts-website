/* The week view on /start (rendered inside Course.tsx): seven columns for
   the currently-selected week of the plan schedule (src/lib/plan/schedule.ts
   getWeekPlan), with a small strip to move between weeks. Self-contained
   like PlanToday/StreakBar on the dashboard — renders nothing when there's
   no plan yet, so Course.tsx can mount it unconditionally. */

import { useEffect, useMemo, useState } from 'react';
import { withBase } from '../../lib/url';
import { getProgress, onProgressChange, type ProgressV1 } from '../../lib/progress';
import { loadStudyPlan, onStudyPlanChange, type SavedPlan } from '../../lib/study-plan';
import { ensurePlanStartDate, getWeekPlan } from '../../lib/plan/schedule';
import { toLocalDateKey } from '../../lib/plan/date';

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeekView() {
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  useEffect(() => {
    const saved = loadStudyPlan();
    setPlan(saved ? ensurePlanStartDate(saved) : null);
    setProgress(getProgress());
    setReady(true);
    const offPlan = onStudyPlanChange(() => {
      setPlan(loadStudyPlan());
      setSelectedWeek(null);
    });
    const offProgress = onProgressChange(() => setProgress(getProgress()));
    return () => {
      offPlan();
      offProgress();
    };
  }, []);

  useEffect(() => {
    const refresh = () => setProgress(getProgress());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const week = useMemo(
    () => (plan && progress ? getWeekPlan(plan, progress, selectedWeek ?? undefined) : null),
    [plan, progress, selectedWeek],
  );

  if (!ready || !plan || !progress || !week) return null;

  const todayStr = toLocalDateKey(new Date());

  return (
    <section className="mt-6 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6" aria-labelledby="week-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">This week</p>
          <h3 id="week-heading" className="mt-1 font-display text-lg font-bold">
            Week {week.weekNumber} of {week.totalWeeks}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedWeek(Math.max(1, week.weekNumber - 1))}
            disabled={week.weekNumber <= 1}
            aria-label="Previous week"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border text-ink-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-30"
          >
            <span aria-hidden="true">&larr;</span>
          </button>
          <span className="text-xs font-semibold text-ink-muted">
            {week.startDate} &ndash; {week.endDate}
          </span>
          <button
            type="button"
            onClick={() => setSelectedWeek(Math.min(week.totalWeeks, week.weekNumber + 1))}
            disabled={week.weekNumber >= week.totalWeeks}
            aria-label="Next week"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border text-ink-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-30"
          >
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>

      {week.totalWeeks <= 12 && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Jump to week">
          {Array.from({ length: week.totalWeeks }, (_, i) => i + 1).map((w) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={w === week.weekNumber}
              onClick={() => setSelectedWeek(w)}
              className={`h-7 w-7 rounded-full text-[0.7rem] font-bold transition-colors ${
                w === week.weekNumber ? 'bg-brand text-white' : 'border border-border text-ink-muted hover:border-brand hover:text-brand'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      <div className="plan-week-grid mt-4">
        {week.days.map((day) => {
          const isToday = day.date === todayStr;
          const label = DAY_LABEL[new Date(`${day.date}T00:00:00`).getDay()];
          return (
            <div key={day.date} className={`plan-week-day${isToday ? ' is-today' : ''}`}>
              <span className="plan-week-day-label">{label}</span>
              <span className="plan-week-day-num">{Number(day.date.slice(-2))}</span>
              {day.items.length === 0 ? (
                <span className="plan-week-empty">{day.isExamLight ? 'Light review' : 'Rest'}</span>
              ) : (
                day.items.map((item) => (
                  <a
                    key={item.id}
                    href={withBase(item.href)}
                    className={`plan-week-item${item.done ? ' is-done' : ''}`}
                    title={`${item.label} (${item.minutes} min)`}
                  >
                    <span className="plan-week-item-tick" aria-hidden="true">
                      {item.done ? '✓' : ''}
                    </span>
                    <span className="plan-week-item-label">{item.label}</span>
                  </a>
                ))
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
