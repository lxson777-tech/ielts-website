/* The deterministic layer, run in the browser.

   Everything Mr EZ says is grounded in these numbers, but the numbers do not
   need him. The dashboard can name a real weakness and a real next activity
   with no AI at all — which is exactly what it does when the tutor Worker is
   unconfigured, rate-limited, or down.

   That matters more than it sounds. It means an outage degrades the feature
   from "a tutor explains your next step" to "your next step, with a plain
   reason", not to a spinner or an apology. And it means every claim the
   model makes has a non-AI original to be checked against. */

import { getProgress } from '../progress';
import { loadStudyPlan } from '../study-plan';
import { buildCourse, courseLessonCount } from '../course';
import { t } from '../i18n/translate';
import { readInsights, type StudentInsights } from './insights';
import { recommendNext, type Recommendation } from './recommend';
import type { TutorRecommendation } from './schema';

/** Insights from this device's own stored progress and plan. */
export function localInsights(): StudentInsights {
  return readInsights(getProgress(), loadStudyPlan(), courseLessonCount(buildCourse()));
}

/** The next activity, decided by the same rules the Worker uses. */
export function localRecommendation(): Recommendation {
  return recommendNext(localInsights(), getProgress());
}

/** The recommendation in the wire shape, so the dashboard renders the AI and
    the non-AI versions through exactly one code path. */
export function toTutorRecommendation(rec: Recommendation): TutorRecommendation {
  return {
    id: rec.activity.id,
    label: rec.activity.label,
    href: rec.activity.href,
    reason: rec.fallbackReason,
    minutes: rec.activity.minutes,
  };
}

/** The welcome line when no model is answering. Deliberately plain: it never
    pretends to be Mr EZ talking, because it is not. */
export function localWelcomeText(insights: StudentInsights): string {
  if (!insights.goals.targetBand || insights.goals.guessed) {
    return t(
      'Tell me the band you need and, if you have one, your exam date. Everything I suggest gets more specific once I know what you are aiming at.',
    );
  }
  if (!insights.hasAnyResults) {
    return t(
      'You are aiming at band {band}. There are no results on record yet, so there is nothing to estimate your current level from. Here is where to start.',
      { band: insights.goals.targetBand },
    );
  }
  // measured.text/.evidence and tentative.text/.evidence come from
  // src/lib/tutor/insights.ts, which is shared with the Worker and out of
  // this batch's scope (see the i18n batch brief). They render in English
  // for a Russian student until that file gets an explicit-locale pass.
  const measured = insights.observations.find((o) => o.kind === 'weakness' && o.confidence === 'measured');
  if (measured) return `${measured.text} (${measured.evidence})`;
  const tentative = insights.observations.find((o) => o.kind === 'weakness');
  if (tentative) return `${tentative.text} (${tentative.evidence})`;
  return t('You are aiming at band {band}. Nothing in your results stands out as a weak spot yet.', {
    band: insights.goals.targetBand,
  });
}
