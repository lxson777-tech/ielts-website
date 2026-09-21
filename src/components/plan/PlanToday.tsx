/* The "Today" mount point on /dashboard.

   Since 2026-09-22 the real work lives in src/components/learning/today/
   TodaySession.tsx: one session block reading the shared plan
   (src/lib/learning), rather than this file's old calendar list built from
   src/lib/plan/schedule.ts's getTodayPlan(). Kept as a thin wrapper, not
   folded away, so LearningDashboard.tsx's import does not have to change
   and nothing else importing "PlanToday" by name breaks. */

import TodaySession from '../learning/today/TodaySession';

export default function PlanToday() {
  return <TodaySession />;
}
