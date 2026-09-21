/* The "Today" card on /dashboard: the day's study list from the plan
   schedule (src/lib/plan/schedule.ts), rolled forward with anything missed
   on earlier study days. Self-contained (reads its own plan/progress and
   subscribes to both stores) so it can sit at the top of LearningDashboard
   without that component needing to know the plan's internals. */

import { useEffect, useMemo, useState } from 'react';
import { withBase } from '../../lib/url';
import { getProgress, onProgressChange, type ProgressV1 } from '../../lib/progress';
import { onStudyPlanChange, type SavedPlan } from '../../lib/study-plan';
import { loadOrCreateStudyPlan, getTodayPlan, type PlanItem } from '../../lib/plan/schedule';
import { getPlanSummary } from '../../lib/plan/summary';
import { useT } from '../../lib/i18n/react';
import { nt } from '../../lib/i18n/translate';

const TYPE_LABEL: Record<PlanItem['type'], string> = {
  lesson: nt('Lesson'),
  drill: nt('Drill'),
  test: nt('Test'),
  vocab: nt('Vocabulary'),
  review: nt('Review'),
  mock: nt('Mock exam'),
};

export default function PlanToday() {
  const { t, tn } = useT();
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [ready, setReady] = useState(false);
  const [dismissedBehind, setDismissedBehind] = useState(false);

  useEffect(() => {
    // A plan always exists from the first visit: loadOrCreateStudyPlan()
    // hands back the saved one, or fabricates and persists a default (see
    // createDefaultPlan in src/lib/plan/schedule.ts) so Today is never
    // blank and there is no onboarding form to fill in first.
    setPlan(loadOrCreateStudyPlan());
    setProgress(getProgress());
    setReady(true);
    const offPlan = onStudyPlanChange(() => {
      setPlan(loadOrCreateStudyPlan());
      setDismissedBehind(false);
    });
    const offProgress = onProgressChange(() => setProgress(getProgress()));
    return () => {
      offPlan();
      offProgress();
    };
  }, []);

  // Returning from a lesson/test/drill page is a normal back-navigation and
  // may be served from the bfcache without remounting: re-read on focus so
  // ticks and the rolled-forward list stay current.
  useEffect(() => {
    const refresh = () => setProgress(getProgress());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const today = useMemo(() => (plan && progress ? getTodayPlan(plan, progress) : null), [plan, progress]);

  // A plan always exists once ready (see the mount effect), and getTodayPlan
  // only returns null when there is no plan, so this pair can't actually
  // split in practice — kept as a guard so TypeScript (and a future caller)
  // never has to assume it.
  if (!ready || !plan || !today) return null;

  const summary = getPlanSummary(plan);
  const next = today.items.find((item) => !item.done);

  return (
    <section className="plan-today" aria-labelledby="today-heading">
      <div className="plan-today-head">
        <h2 id="today-heading">{today.finished ? t('Your plan is complete') : t('Your next step')}</h2>
        <span className="plan-today-progress">
          {t('Day {day} of {total}', { day: today.dayNumber, total: today.totalDays })},{' '}
          {today.onTrack
            ? t('on track')
            : tn(today.daysBehind, { one: '{n} day behind', other: '{n} days behind' })}
        </span>
      </div>

      <p className="plan-today-strip">
        {summary.text}
        {summary.hint && <span className="plan-today-strip-hint"> · {summary.hint}</span>}
        <a href={withBase('/plan-settings')} className="plan-today-strip-change">
          {t('Change')}
        </a>
      </p>

      {today.behindMessage && !dismissedBehind && (
        <div className="plan-today-behind">
          <span>
            {tn(today.daysBehind, {
              one: 'You are {n} day behind, here is a lighter plan.',
              other: 'You are {n} days behind, here is a lighter plan.',
            })}
          </span>
          <span className="plan-today-behind-actions">
            <a href={withBase('/plan-settings')}>{t('Push back my exam date')}</a>
            <button type="button" onClick={() => setDismissedBehind(true)}>
              {t('Keep this lighter plan')}
            </button>
          </span>
        </div>
      )}

      {next && (
        <div className="plan-feature">
          <div className="plan-feature-meta"><span>{t(next.meta || TYPE_LABEL[next.type])}</span><span>{t('{n} min', { n: next.minutes })}</span></div>
          <h3>{t(next.label)}</h3>
          <p>{t('{type} from your personal study plan.', { type: t(TYPE_LABEL[next.type]) })}</p>
          <a className="plan-start" href={withBase(next.href)}>{t('Start {type}', { type: t(TYPE_LABEL[next.type], undefined, 'accusative').toLowerCase() })} <span aria-hidden="true">↗</span></a>
        </div>
      )}
      {today.items.length > 0 && (
        <div className="plan-list-heading">
          <h3>{t("Today's schedule")}</h3>
          <span>{t('{done} / {total} complete', { done: today.items.filter((item) => item.done).length, total: today.items.length })}</span>
        </div>
      )}
      {today.items.length === 0 ? (
        <p className="plan-rest-note">{t('Nothing scheduled today. A rest day is fine, your plan adjusts.')}</p>
      ) : (
        <ul className="plan-item-list" data-stagger>
          {today.items.map((item) => {
            const itemType = t(TYPE_LABEL[item.type]);
            const itemLabel = t(item.label);
            const ariaLabel = item.done
              ? t('{label}, {type}, {minutes} minutes, done', { label: itemLabel, type: itemType, minutes: item.minutes })
              : t('{label}, {type}, {minutes} minutes', { label: itemLabel, type: itemType, minutes: item.minutes });
            return (
              <li key={item.id}>
                <a
                  href={withBase(item.href)}
                  className={`plan-item${item.done ? ' plan-item-done' : ''}`}
                  aria-label={ariaLabel}
                >
                  {/* The tick strokes itself in when an item is marked done, and
                      the circle fills to green underneath it. */}
                  <span className="plan-item-tick" aria-hidden="true">
                    {item.done && (
                      <svg className="tick-svg" viewBox="0 0 24 24">
                        <polyline points="4,12.6 9.6,18.2 20,6.4" pathLength={1} />
                      </svg>
                    )}
                  </span>
                  {item.skill && <span className="plan-item-dot" style={{ background: `var(--color-${item.skill})` }} aria-hidden="true" />}
                  <span className="plan-item-body">
                    <span className="plan-item-label">{itemLabel}</span>
                    <span className="plan-item-meta">
                      {itemType} · {t(item.meta)}
                    </span>
                  </span>
                  <span className="plan-item-minutes" aria-hidden="true">
                    {t('{n} min', { n: item.minutes })}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
