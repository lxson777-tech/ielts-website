/* The week view on /start (rendered inside Course.tsx): seven columns for
   the currently-selected week of the plan schedule (src/lib/plan/schedule.ts
   getWeekPlan), with a small strip to move between weeks. Self-contained
   like PlanToday on the dashboard: renders nothing when there is
   no plan yet, so Course.tsx can mount it unconditionally. */

import { useEffect, useMemo, useState } from 'react';
import { withBase } from '../../lib/url';
import { getProgress, onProgressChange, type ProgressV1 } from '../../lib/progress';
import { onStudyPlanChange, type SavedPlan } from '../../lib/study-plan';
import { loadOrCreateStudyPlan, getWeekPlan, planItemLabel } from '../../lib/plan/schedule';
import { parseDateKey, toLocalDateKey } from '../../lib/plan/date';
import { useT } from '../../lib/i18n/react';
import { nt, type Vars } from '../../lib/i18n/translate';

const DAY_LABEL = [nt('Sun'), nt('Mon'), nt('Tue'), nt('Wed'), nt('Thu'), nt('Fri'), nt('Sat')];
const MONTH_LABEL = [
  nt('January'),
  nt('February'),
  nt('March'),
  nt('April'),
  nt('May'),
  nt('June'),
  nt('July'),
  nt('August'),
  nt('September'),
  nt('October'),
  nt('November'),
  nt('December'),
];

/** en-GB style word range for the week strip, e.g. "8 to 14 September" or,
   across a month or year boundary, "28 September to 4 October" /
   "29 December 2026 to 4 January 2027". `t` is threaded through rather than
   read from a hook here, since this is a plain helper, not a component. */
function formatWeekRange(startDate: string, endDate: string, t: (key: string, vars?: Vars) => string): string {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = t(MONTH_LABEL[start.getMonth()]!);
  const endMonth = t(MONTH_LABEL[end.getMonth()]!);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const sameMonth = startMonth === endMonth && startYear === endYear;

  if (sameMonth) return t('{startDay} to {endDay} {month}', { startDay, endDay, month: startMonth });

  if (startYear === endYear) {
    return t('{startDay} {startMonth} to {endDay} {endMonth}', { startDay, startMonth, endDay, endMonth });
  }
  return t('{startDay} {startMonth} {startYear} to {endDay} {endMonth} {endYear}', {
    startDay,
    startMonth,
    startYear,
    endDay,
    endMonth,
    endYear,
  });
}

export default function WeekView() {
  const { t } = useT();
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  useEffect(() => {
    setPlan(loadOrCreateStudyPlan());
    setProgress(getProgress());
    setReady(true);
    const offPlan = onStudyPlanChange(() => {
      setPlan(loadOrCreateStudyPlan());
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
  const focus = [...new Set(week.days.map((d) => d.focus).filter(Boolean))].map((f) => t(f!)).join(' / ');
  const longerDays = week.days.some((d) => d.items.reduce((n, i) => n + i.minutes, 0) > (plan.dailyMinutes ?? 25));

  return (
    <section className="mt-6 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6" aria-labelledby="week-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t('This week')}</p>
          <h3 id="week-heading" className="mt-1 font-display text-lg font-bold">
            {t('Week {week} of {total}', { week: week.weekNumber, total: week.totalWeeks })}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedWeek(Math.max(1, week.weekNumber - 1))}
            disabled={week.weekNumber <= 1}
            className="text-xs font-semibold text-ink-muted transition-colors hover:text-brand disabled:opacity-30 disabled:hover:text-ink-muted"
          >
            {t('Previous week')}
          </button>
          <span className="text-xs font-semibold text-ink-muted">{formatWeekRange(week.startDate, week.endDate, t)}</span>
          <button
            type="button"
            onClick={() => setSelectedWeek(Math.min(week.totalWeeks, week.weekNumber + 1))}
            disabled={week.weekNumber >= week.totalWeeks}
            className="text-xs font-semibold text-ink-muted transition-colors hover:text-brand disabled:opacity-30 disabled:hover:text-ink-muted"
          >
            {t('Next week')}
          </button>
        </div>
      </div>

      {week.totalWeeks <= 12 && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label={t('Jump to week')}>
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

      <p className="mt-4 font-semibold text-ink">{focus}</p>
      {longerDays && (
        <p className="mt-1 text-sm text-ink-muted">
          {t('Some sessions exceed your daily target. The times below include the full lessons or timed tests. Extend your plan in settings if you need a lighter pace.')}
        </p>
      )}
      <div className="plan-week-grid mt-4">
        {week.days.map((day) => {
          const isToday = day.date === todayStr;
          const label = DAY_LABEL[new Date(`${day.date}T00:00:00`).getDay()]!;
          return (
            <div key={day.date} className={`plan-week-day${isToday ? ' is-today' : ''}`}>
              <span className="plan-week-day-label">{t(label)}</span>
              <span className="plan-week-day-num">{Number(day.date.slice(-2))}</span>
              {day.items.length > 0 && <span className="text-xs text-ink-muted">{t('{n} min', { n: day.items.reduce((n, i) => n + i.minutes, 0) })}</span>}
              {day.items.length === 0 ? (
                <span className="plan-week-empty">{day.isExamLight ? t('Light review') : t('Rest')}</span>
              ) : (
                day.items.map((item) => (
                  <a
                    key={item.id}
                    href={withBase(item.href)}
                    className={`plan-week-item${item.done ? ' is-done' : ''}`}
                    title={t('{label} ({minutes} min)', { label: planItemLabel(item, t), minutes: item.minutes })}
                  >
                    <span className="plan-week-item-tick" aria-hidden="true">
                      {item.done ? '✓' : ''}
                    </span>
                    <span className="plan-week-item-label">{planItemLabel(item, t)}</span>
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
