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
import type { Locale } from '../i18n/locale';
import { observationEvidence, observationText, readInsights, type StudentInsights } from './insights';
import { activityLabel } from './catalog';
import { recommendNext, recommendationReason, type Recommendation } from './recommend';
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
    the non-AI versions through exactly one code path.

    `locale` is passed in rather than read here, because this module is
    called from React islands that already know the language and re-render
    when it changes. A lesson's label still arrives in English (its title
    lives in the course registry); the components run the label through t()
    when they render it, which is where the site's dictionary can be read. */
export function toTutorRecommendation(rec: Recommendation, locale: Locale = 'en'): TutorRecommendation {
  return {
    id: rec.activity.id,
    label: activityLabel(rec.activity, locale),
    href: rec.activity.href,
    reason: recommendationReason(rec, locale),
    minutes: rec.activity.minutes,
  };
}

/** The welcome line when no model is answering. Deliberately plain: it never
    pretends to be Mr EZ talking, because it is not. */
export function localWelcomeText(insights: StudentInsights, locale: Locale = 'en'): string {
  if (!insights.goals.targetBand || insights.goals.guessed) {
    return t(
      'Tell me the band you need and, if you have one, your exam date. Everything I suggest gets more specific once I know what you are aiming at.',
      undefined,
      undefined,
      locale,
    );
  }
  if (!insights.hasAnyResults) {
    return t(
      'You are aiming at band {band}. There are no results on record yet, so there is nothing to estimate your current level from. Here is where to start.',
      { band: insights.goals.targetBand },
      undefined,
      locale,
    );
  }
  /* The claim and its evidence come from src/lib/tutor/insights.ts, which
     is shared with the Worker and therefore keeps its own Russian outside
     the lazy dictionary (src/lib/tutor/ru.ts). Parentheses around the
     evidence are punctuation, not word order, so joining the two whole
     sentences this way is safe in both languages. */
  const measured = insights.observations.find((o) => o.kind === 'weakness' && o.confidence === 'measured');
  const weakness = measured ?? insights.observations.find((o) => o.kind === 'weakness');
  if (weakness) {
    return `${observationText(weakness, locale)} (${observationEvidence(weakness, locale)})`;
  }
  return t(
    'You are aiming at band {band}. Nothing in your results stands out as a weak spot yet.',
    { band: insights.goals.targetBand },
    undefined,
    locale,
  );
}
