/* Streak + today's-goal strip for /dashboard. Sits right under PlanToday.
   Self-contained for the same reason PlanToday is: it reads progress.ts's
   activity log itself (via src/lib/plan/streak.ts) rather than expecting
   LearningDashboard to thread the data through. */

import { useEffect, useMemo, useState } from 'react';
import { getProgress, onProgressChange, type ProgressV1 } from '../../lib/progress';
import { loadStudyPlan, onStudyPlanChange, type SavedPlan } from '../../lib/study-plan';
import { getLast14Days, getStreak, getTodayGoalProgress } from '../../lib/plan/streak';

export default function StreakBar() {
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlan(loadStudyPlan());
    setProgress(getProgress());
    setReady(true);
    const offPlan = onStudyPlanChange(() => setPlan(loadStudyPlan()));
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

  const streak = useMemo(() => (progress ? getStreak(plan) : 0), [plan, progress]);
  const dots = useMemo(() => (progress ? getLast14Days(plan) : []), [plan, progress]);
  const goal = useMemo(() => (progress ? getTodayGoalProgress(plan) : { minutes: 0, goal: 25, percent: 0 }), [plan, progress]);

  if (!ready || !progress) return null;

  return (
    <section className="plan-streak" aria-labelledby="streak-heading">
      <div className="plan-streak-count">
        <div>
          <p className="platform-eyebrow" id="streak-heading">
            Streak
          </p>
          <strong>
            {streak} day{streak === 1 ? '' : 's'}
          </strong>
        </div>
        {streak === 0 && <p className="plan-rest-note">A rest day is fine. Your plan adjusts.</p>}
      </div>

      <div className="plan-streak-dots" role="list" aria-label="Last 14 days">
        {dots.map((d) => (
          <span
            key={d.date}
            role="listitem"
            className={`plan-streak-dot${d.met ? ' is-met' : ''}${d.planned ? '' : ' is-unplanned'}`}
            title={`${d.date}: ${d.minutes} min${d.met ? ', goal met' : ''}`}
          />
        ))}
      </div>

      <div className="plan-goal-bar">
        <div className="plan-goal-bar-track">
          <div className="plan-goal-bar-fill" style={{ width: `${goal.percent}%` }} />
        </div>
        <p className="plan-goal-bar-label">
          {goal.minutes} of {goal.goal} min today
        </p>
      </div>
    </section>
  );
}
