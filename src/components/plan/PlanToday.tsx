/* The "Today" card on /dashboard: the day's study list from the plan
   schedule (src/lib/plan/schedule.ts), rolled forward with anything missed
   on earlier study days. Self-contained (reads its own plan/progress and
   subscribes to both stores) so it can sit at the top of LearningDashboard
   without that component needing to know the plan's internals. */

import { useEffect, useMemo, useState } from 'react';
import { withBase } from '../../lib/url';
import { getProgress, onProgressChange, type ProgressV1 } from '../../lib/progress';
import { loadStudyPlan, onStudyPlanChange, type SavedPlan } from '../../lib/study-plan';
import { ensurePlanStartDate, getTodayPlan, type PlanItem } from '../../lib/plan/schedule';

const TYPE_LABEL: Record<PlanItem['type'], string> = {
  lesson: 'Lesson',
  drill: 'Drill',
  test: 'Test',
  vocab: 'Vocabulary',
  review: 'Review',
};

export default function PlanToday() {
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [ready, setReady] = useState(false);
  const [dismissedBehind, setDismissedBehind] = useState(false);

  useEffect(() => {
    const saved = loadStudyPlan();
    // First render of a plan saved before this feature (or before its own
    // creation ever set one): stamp a start date onto it so the schedule
    // stays anchored, rather than recomputing "day 1" on every visit.
    setPlan(saved ? ensurePlanStartDate(saved) : null);
    setProgress(getProgress());
    setReady(true);
    const offPlan = onStudyPlanChange(() => {
      setPlan(loadStudyPlan());
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

  if (!ready) return null;

  if (!plan || !today) {
    return (
      <section className="plan-today plan-today-empty" aria-labelledby="today-heading">
        <p className="platform-eyebrow">Today</p>
        <h2 id="today-heading">Set a study plan to see today's list</h2>
        <p className="plan-rest-note">
          Tell us your target band and exam date on Start, and we'll lay out a day-by-day plan that fits around it.
        </p>
        <a className="coral-button" href={withBase('/start')}>
          Create a plan <span aria-hidden="true">→</span>
        </a>
      </section>
    );
  }

  return (
    <section className="plan-today" aria-labelledby="today-heading">
      <div className="plan-today-head">
        <div>
          <p className="platform-eyebrow">Today</p>
          <h2 id="today-heading">{today.finished ? 'Your plan is complete' : "Today's study list"}</h2>
        </div>
        <span className="plan-today-progress">
          Day {today.dayNumber} of {today.totalDays}, {today.onTrack ? 'on track' : `${today.daysBehind} day${today.daysBehind === 1 ? '' : 's'} behind`}
        </span>
      </div>

      {today.behindMessage && !dismissedBehind && (
        <div className="plan-today-behind">
          <span>{today.behindMessage}</span>
          <span className="plan-today-behind-actions">
            <a href={withBase('/start')}>
              Push back my exam date <span aria-hidden="true">→</span>
            </a>
            <button type="button" onClick={() => setDismissedBehind(true)}>
              Keep this lighter plan
            </button>
          </span>
        </div>
      )}

      {today.items.length === 0 ? (
        <p className="plan-rest-note">Nothing scheduled today. A rest day is fine, your plan adjusts.</p>
      ) : (
        <ul className="plan-item-list">
          {today.items.map((item) => (
            <li key={item.id}>
              <a
                href={withBase(item.href)}
                className={`plan-item${item.done ? ' plan-item-done' : ''}`}
                aria-label={`${item.label}, ${TYPE_LABEL[item.type]}, ${item.minutes} minutes${item.done ? ', done' : ''}`}
              >
                <span className="plan-item-tick" aria-hidden="true">
                  {item.done ? '✓' : ''}
                </span>
                {item.skill && <span className="plan-item-dot" style={{ background: `var(--color-${item.skill})` }} aria-hidden="true" />}
                <span className="plan-item-body">
                  <span className="plan-item-label">{item.label}</span>
                  <span className="plan-item-meta">
                    {TYPE_LABEL[item.type]} · {item.meta}
                  </span>
                </span>
                <span className="plan-item-minutes" aria-hidden="true">
                  {item.minutes} min
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
