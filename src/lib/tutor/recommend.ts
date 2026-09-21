/* Which single activity to put in front of this student next.

   Chosen in code, not by the model. The model's job is to say WHY in Mr EZ's
   voice; this decides WHAT. Two reasons for that split:

   - A link the model invents can 404. A link chosen from the catalogue
     cannot.
   - The choice has to be defensible. "Because Matching Headings is 5 of 18
     across three tests" is a rule anyone can check; "because the model felt
     like it" is not.

   Every branch below also writes a plain-language fallback reason, so when
   the tutor Worker is unconfigured, rate-limited or down, the dashboard
   still shows a real, correctly-linked recommendation with an honest
   explanation — just without Mr EZ's wording. The feature degrades to
   something useful rather than to nothing. */

import type { ProgressV1 } from '../progress';
import { buildCatalog, findActivity, lessonForType, practiseActivity, type Activity } from './catalog';
import { observationEvidence, observationText, type Observation, type StudentInsights } from './insights';
import { buildCourse, courseStatus } from '../course';
import type { Locale } from '../i18n/locale';
import { tutorText, type TextVars } from './ru';

export interface Recommendation {
  activity: Activity;
  /** Deterministic explanation in ENGLISH, used verbatim when no model
      answers and the student reads English. For any other language call
      recommendationReason(), which rebuilds it from `template` and `vars`
      (plus the observation, whose own wording is language-dependent). */
  fallbackReason: string;
  /** The whole-sentence English template `fallbackReason` came from, which
      is also its key in src/lib/tutor/ru.ts. */
  template: string;
  vars: TextVars;
  /** Which rule fired, for tests and for the Worker's own logging. */
  rule: string;
  /** The observation behind it, when there was one — this is what the model
      is told to build its wording on. */
  because?: Observation;
}

/** The reason, in the student's language.

    `{claim}` and `{evidence}` are whole translated sentences in their own
    right, dropped into a whole translated sentence. That is the one kind of
    composition Russian survives: never a fragment beside a fragment. */
export function recommendationReason(rec: Recommendation, locale: Locale): string {
  if (locale === 'en') return rec.fallbackReason;
  const vars: TextVars = { ...rec.vars };
  if (rec.because) {
    vars.claim = observationText(rec.because, locale);
    vars.evidence = observationEvidence(rec.because, locale);
  }
  return tutorText(locale, rec.template, vars);
}

/** Build a recommendation, rendering its English reason eagerly and keeping
    what is needed to render it again in another language. */
function reason(
  activity: Activity,
  rule: string,
  template: string,
  vars: TextVars,
  because?: Observation,
): Recommendation {
  const english: TextVars = { ...vars };
  if (because) {
    english.claim = because.text;
    english.evidence = because.evidence;
  }
  return {
    activity,
    rule,
    because,
    template,
    vars,
    fallbackReason: tutorText('en', template, english),
  };
}

/** The first course lesson this student has not completed, as an activity. */
function nextCourseLesson(progress: ProgressV1): Activity | null {
  const status = courseStatus(buildCourse(), progress);
  if (!status.next) return null;
  return findActivity(`lesson:${status.next.key}`) ?? null;
}

/** For a measured weakness in a question type: teach it first if the lesson
    is unread, otherwise drill it. Reading about a type you have never been
    taught beats grinding questions on it. */
function forTypeWeakness(observation: Observation, progress: ProgressV1): Recommendation | null {
  const [, skill, type] = observation.id.split(':');
  if (skill !== 'reading' && skill !== 'listening') return null;
  if (!type) return null;

  const lesson = lessonForType(skill, type);
  const lessonKey = lesson?.id.slice('lesson:'.length);
  const lessonDone = lessonKey ? Boolean(progress.lessons?.[lessonKey]) : true;

  if (lesson && !lessonDone) {
    return reason(
      lesson,
      'weakness-teach',
      '{claim} You have not worked through the lesson on it yet ({evidence}).',
      {},
      observation,
    );
  }

  const drill = practiseActivity(`practise:${skill}:${type}`);
  if (!drill) return null;
  return reason(
    drill,
    'weakness-drill',
    '{claim} These drills are filtered to exactly that type ({evidence}).',
    {},
    observation,
  );
}

/** Decide the next activity. `progress` is needed as well as `insights`
    because "have they read the lesson yet" is not an insight, it is a fact
    about one specific lesson. */
export function recommendNext(insights: StudentInsights, progress: ProgressV1): Recommendation {
  const { goals, observations } = insights;

  // 1. No goal at all. Everything downstream depends on knowing what they
  //    are aiming at, so that is the first ask — and we never guess a band
  //    on their behalf.
  if (!goals.targetBand || goals.guessed) {
    const plan = findActivity('tool:plan');
    if (plan) {
      return reason(
        plan,
        'no-goal',
        'Setting a target band (and an exam date if you have one) is what makes every other suggestion here specific rather than generic.',
        {},
      );
    }
  }

  // 2. A measured weakness beats everything else: it is the highest-value
  //    thing they could do, and it is backed by counted evidence.
  const measuredWeakness = observations.find((o) => o.kind === 'weakness' && o.confidence === 'measured');
  if (measuredWeakness) {
    const fromType = forTypeWeakness(measuredWeakness, progress);
    if (fromType) return fromType;
    const activity = measuredWeakness.activityId ? findActivity(measuredWeakness.activityId) : undefined;
    if (activity) {
      return reason(
        activity,
        'weakness-criterion',
        '{claim} Another marked attempt is the fastest way to move it ({evidence}).',
        {},
        measuredWeakness,
      );
    }
  }

  // 3. Nothing marked at all yet: start the course at the beginning. This
  //    deliberately sits ABOVE the missing-paper rule below. Every paper is
  //    "missing" for a brand-new student, so checking that first would send
  //    someone who has done nothing straight into a sixty-minute timed exam,
  //    which is the worst possible first suggestion.
  if (!insights.hasAnyResults) {
    const lesson = nextCourseLesson(progress);
    if (lesson) {
      return reason(
        lesson,
        'course-start',
        'The course is ordered so each lesson builds on the last, and this is where you are up to.',
        {},
      );
    }
  }

  // 4. A paper they are aiming at but have never attempted, when they HAVE
  //    worked on others. Without a result there is genuinely nothing to say
  //    about that paper, and saying so plainly is better than inventing a
  //    band.
  const gap = observations.find((o) => o.kind === 'gap');
  if (gap?.activityId) {
    const activity = findActivity(gap.activityId);
    if (activity) {
      return reason(activity, 'missing-paper', '{claim} One attempt gives you a starting point to work from.', {}, gap);
    }
  }

  // 5. Tentative weakness: worth naming, but the wording must not pretend
  //    it is settled.
  const tentative = observations.find((o) => o.kind === 'weakness' && o.confidence === 'tentative');
  if (tentative) {
    const fromType = forTypeWeakness(tentative, progress);
    if (fromType) return { ...fromType, rule: `${fromType.rule}-tentative` };
  }

  // 6. Keep moving through the course.
  const lesson = nextCourseLesson(progress);
  if (lesson) {
    return reason(
      lesson,
      'course-continue',
      'Next in the course, which is ordered so each lesson builds on the one before.',
      {},
    );
  }

  // 7. Course finished: the remaining work is exam conditions.
  const mock = findActivity('test:mock') ?? buildCatalog()[0]!;
  return reason(
    mock,
    'course-complete',
    'Every lesson is done, so the useful work now is full papers under exam timing.',
    {},
  );
}

/** The handful of activities worth offering the model as alternatives, so a
    recommendation it writes about is always one of a small, real set. Keeps
    the prompt short: the full catalogue is hundreds of entries. */
export function shortlist(insights: StudentInsights, progress: ProgressV1, chosen: Activity): Activity[] {
  const out = new Map<string, Activity>();
  out.set(chosen.id, chosen);

  for (const o of insights.observations.slice(0, 4)) {
    if (!o.activityId) continue;
    const a = findActivity(o.activityId);
    if (a) out.set(a.id, a);
  }
  const next = nextCourseLesson(progress);
  if (next) out.set(next.id, next);
  for (const id of ['trainer:writing', 'trainer:speaking', 'review:vocabulary', 'test:reading', 'test:listening']) {
    const a = findActivity(id);
    if (a) out.set(a.id, a);
  }
  return [...out.values()].slice(0, 10);
}
