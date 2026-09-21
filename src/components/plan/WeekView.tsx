/* The rolling schedule on /start ("Your route", rendered inside Course.tsx).
   Since 2026-09-22 this reads the plan's own rolling schedule
   (`PersonalPlanV1.schedule`, about a week, today first) instead of the old
   fixed eight-week calendar `getWeekPlan()` used to build from
   src/lib/plan/schedule.ts. There is no "previous/next week" strip any
   more: the plan only ever carries the near week ahead (architecture
   section 2.5, SCHEDULE_HORIZON_DAYS), and further-out plans are milestones,
   not a calendar nobody could keep.

   Today's own column uses the live session steps (roles, done state, real
   links), the same ones TodaySession shows, so this can never disagree with
   Today. Later days show what the plan currently expects, resolved from the
   catalogue: a plan, not a promise, which is why they are shown but not
   linked as though they were today's task. */

import { useEffect, useState } from 'react';
import { withBase } from '../../lib/url';
import { findActivity } from '../../lib/learning/catalog';
import { ensureLearningWired, getCurrentSession, onLearnerRecordChange, onPersonalPlanChange, readPersonalPlan, type SharedSessionView } from '../../lib/learning';
import type { PersonalPlanV1, ScheduledDay } from '../../lib/learning/contracts/plan';
import { useT } from '../../lib/i18n/react';
import { nt } from '../../lib/i18n/translate';

const DAY_LABEL = [nt('Sun'), nt('Mon'), nt('Tue'), nt('Wed'), nt('Thu'), nt('Fri'), nt('Sat')];

const KIND_LABEL: Partial<Record<ScheduledDay['kind'], string>> = {
  rest: nt('Rest'),
  'light-review': nt('Light review'),
  'exam-day': nt('Exam day'),
  assessment: nt('Timed practice'),
};

ensureLearningWired();

export default function WeekView() {
  const { t } = useT();
  const [plan, setPlan] = useState<PersonalPlanV1 | null>(null);
  const [session, setSession] = useState<SharedSessionView | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = () => {
    try {
      setSession(getCurrentSession());
      setPlan(readPersonalPlan());
    } catch {
      setSession(null);
      setPlan(null);
    }
    setReady(true);
  };

  useEffect(() => {
    refresh();
    const offRecord = onLearnerRecordChange(refresh);
    const offPlan = onPersonalPlanChange(refresh);
    return () => {
      offRecord();
      offPlan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready || !plan || plan.schedule.length === 0) return null;

  return (
    <section className="mt-6 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6" aria-labelledby="week-heading">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t('The week ahead')}</p>
        <h3 id="week-heading" className="mt-1 font-display text-lg font-bold">
          {t('Your rolling schedule')}
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          {t('Every day within its own time budget. Only today is fixed; the rest adjusts as you go.')}
        </p>
      </div>

      <div className="plan-week-grid mt-4">
        {plan.schedule.map((day) => (
          <WeekDay key={day.date} day={day} isToday={session ? day.date === session.date : false} session={session} />
        ))}
      </div>
    </section>
  );
}

function WeekDay({ day, isToday, session }: { day: ScheduledDay; isToday: boolean; session: SharedSessionView | null }) {
  const { t } = useT();
  const label = DAY_LABEL[new Date(`${day.date}T00:00:00`).getDay()]!;
  const kindLabel = KIND_LABEL[day.kind];

  return (
    <div className={`plan-week-day${isToday ? ' is-today' : ''}`}>
      <span className="plan-week-day-label">{t(label)}</span>
      <span className="plan-week-day-num">{Number(day.date.slice(-2))}</span>
      {day.budgetMinutes > 0 && <span className="text-xs text-ink-muted">{t('{n} min', { n: day.budgetMinutes })}</span>}
      {day.activityIds.length === 0 ? (
        <span className="plan-week-empty">{kindLabel ? t(kindLabel) : t('Rest')}</span>
      ) : isToday && session ? (
        session.steps.map((step) => (
          <a
            key={step.stepId}
            href={withBase(step.href ?? '/dashboard')}
            className={`plan-week-item${step.state === 'done' ? ' is-done' : ''}`}
            title={t('{label} ({minutes} min)', { label: step.purpose, minutes: step.minutes })}
          >
            <span className="plan-week-item-tick" aria-hidden="true">{step.state === 'done' ? '✓' : ''}</span>
            <span className="plan-week-item-label">{step.purpose}</span>
          </a>
        ))
      ) : (
        day.activityIds.map((id) => {
          const activity = findActivity(id);
          if (!activity) return null;
          return (
            <span key={id} className="plan-week-item" title={activity.objective}>
              <span className="plan-week-item-tick" aria-hidden="true" />
              <span className="plan-week-item-label">{t(activity.objective)}</span>
            </span>
          );
        })
      )}
    </div>
  );
}
