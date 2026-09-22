/* Which single activity to put in front of this student next.

   ONE ANSWER, THREE SURFACES. Until 2026-09-22 this file had seven rules of
   its own, and on /dashboard it ran beside two other engines that had their
   own: the course card's first unfinished lesson and Today's calendar. All
   three could name a different thing at once, which is the audit's first
   reproduced finding. This is now a VIEW of the student's one current
   session (src/lib/learning), exactly like courseStatus() and
   getTodayPlan(). The rules below choose the WORDING, not the activity.

   Still chosen in code, not by the model. The model's job is to say WHY in
   Mr EZ's voice. Two reasons for that split:

   - A link the model invents can 404. A link chosen from the catalogue
     cannot.
   - The choice has to be defensible. "Because Matching Headings is 5 of 18
     across three tests" is a rule anyone can check; "because the model felt
     like it" is not.

   Every branch below also writes a plain-language fallback reason, so when
   the tutor Worker is unconfigured, rate-limited or down, the dashboard
   still shows a real, correctly-linked recommendation with an honest
   explanation — just without Mr EZ's wording. The feature degrades to
   something useful rather than to nothing.

   PURE, BECAUSE THE WORKER RUNS IT. There is no browser store here and
   there must never be one: a Cloudflare Worker serves every student from
   one process. The browser hands its persisted plan in through the shared
   provider; the Worker has none yet, so it works the same plan out from the
   student's synced progress with the same pure functions. */

import type { ProgressV1 } from '../progress';
import type { SavedPlan } from '../study-plan';
import { buildCatalog, findActivity, type Activity } from './catalog';
import { observationEvidence, observationText, type Observation, type StudentInsights } from './insights';
import { buildCourse, courseStatus } from '../course';
import type { Locale } from '../i18n/locale';
import { tutorText, type TextVars } from './ru';
import {
  constraintsFrom,
  currentSharedSession,
  goalsFrom,
  lessonMapsFor,
  planSettingsFromSavedPlan,
  sharedSessionFrom,
  tutorActivityIdFor,
  type LegacyPlanSettings,
  type SharedSessionView,
} from '../learning/adapters';
import { learningCatalogue } from '../learning/catalog';
import type { LearningCatalogueV1 } from '../learning/contracts/catalog';
import { migrateProgress } from '../learning/migrate';
import { createInitialPlan } from '../learning/planner';
import { evaluateEvidence } from '../learning/policy';

export interface Recommendation {
  activity: Activity;
  /** The catalogue id of the session step this recommendation is a view of,
      which is the same id `courseStatus().session` and `getTodayPlan()`
      name. `activity.id` can differ: Mr EZ's catalogue is deliberately
      smaller, so one exact drill is answered with the filtered drill page
      for its question type (see tutorActivityIdFor). Null only when no
      session could be built at all. */
  plannedActivityId: string | null;
  /** The session this came from, for a surface that wants the objective,
      the counted reason or the rest of the steps. */
  session: SharedSessionView | null;
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
  from?: { session: SharedSessionView | null; plannedActivityId: string | null },
): Recommendation {
  const english: TextVars = { ...vars };
  if (because) {
    english.claim = because.text;
    english.evidence = because.evidence;
  }
  return {
    activity,
    plannedActivityId: from?.plannedActivityId ?? activity.id,
    session: from?.session ?? null,
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

/** What the caller already knows, so nothing here has to reach for storage.

    Everything is optional. The browser leaves it empty and the shared
    provider (installed by src/lib/learning) hands over the student's real,
    persisted plan. The Worker leaves it empty too and the plan is worked
    out on the spot from the same synced progress it already loaded. */
export interface RecommendContext {
  /** A session the caller has already built. Skips both lookups. */
  session?: SharedSessionView | null;
  /** The student's saved settings, when the caller has them. Without it the
      derived plan uses the recommended sixty minutes rather than the
      student's own number, which can change which activity fits the day.
      Passing it is how the Worker's answer stays identical to the
      browser's, and it stops mattering once the plan itself syncs. */
  savedPlan?: SavedPlan | null;
  /** ISO instant, and the student's own calendar date. Passed in so two
      runs over the same student give the same answer. */
  now?: string;
  today?: string;
  catalogue?: LearningCatalogueV1;
}

/** The plan worked out from what the old stores hold, for a caller with no
 *  stored plan of its own: the Mr EZ Worker, and any page that has not
 *  imported the browser entry point.
 *
 *  Nothing is stored, so it cannot drift: it is the same three pure steps
 *  the browser took (read the old stores forward, judge the evidence, plan)
 *  run again over the same inputs. */
function deriveSession(
  insights: StudentInsights,
  progress: ProgressV1,
  context: RecommendContext,
): SharedSessionView | null {
  try {
    const catalogue = context.catalogue ?? learningCatalogue();
    const fromSaved = planSettingsFromSavedPlan(context.savedPlan ?? null);
    const settings: LegacyPlanSettings = fromSaved ?? {
      targetBand: insights.goals.targetBand,
      examDate: insights.goals.examDate,
      perPaperTargets: insights.goals.perSkillTargets,
      defaulted: insights.goals.guessed,
    };
    const goals = goalsFrom(settings);
    const now = context.now ?? new Date().toISOString();
    const today = context.today ?? now.slice(0, 10);
    const maps = lessonMapsFor(catalogue);
    const record = migrateProgress(progress, context.savedPlan ?? null, maps.lessonMinutes, {
      now,
      lessonSubskills: maps.lessonSubskills,
    });
    const policy = evaluateEvidence({ record, goals, now });
    const { plan } = createInitialPlan({
      catalogue,
      record,
      policy,
      now,
      today,
      goals,
      constraints: constraintsFrom(settings),
    });
    return sharedSessionFrom({ plan, catalogue, derived: true });
  } catch {
    /* A plan that cannot be built is a reason to fall back to the library,
       never a reason to answer a student with an error. */
    return null;
  }
}

/** The weakness this session is about, when the evidence names one.
 *
 *  The planner already weighed the evidence; this is only looking for the
 *  counted sentence that goes with the choice it made, so that the reason
 *  on the card stays a checkable claim rather than a description. */
function observationFor(session: SharedSessionView, observations: Observation[]): Observation | undefined {
  const exact = observations.find(
    (o) => o.kind === 'weakness' && o.id === `weak:${session.paper}:${session.subskill}`,
  );
  if (exact) return exact;
  const step = session.current;
  if (step) {
    const byStep = observations.find((o) => o.kind === 'weakness' && o.id === `weak:${step.paper}:${step.subskill}`);
    if (byStep) return byStep;
  }
  return observations.find((o) => o.kind === 'weakness' && o.id.startsWith(`weak:${session.paper}:`));
}

/** Decide the next activity. `progress` is needed as well as `insights`
    because "have they read the lesson yet" is not an insight, it is a fact
    about one specific lesson.

    The activity is the current step of the student's one session. The rules
    below pick which of the reasons this file can write fits that step, so
    the wording keeps its counted evidence and its Russian. */
export function recommendNext(
  insights: StudentInsights,
  progress: ProgressV1,
  context: RecommendContext = {},
): Recommendation {
  const { observations } = insights;
  const session =
    context.session ?? currentSharedSession() ?? deriveSession(insights, progress, context);
  const step = session ? session.current ?? session.steps[session.steps.length - 1] ?? null : null;

  if (!session || !step) {
    /* No plan could be built at all, which means the library itself is
       unreadable. Ask for the one thing that always helps rather than
       inventing a second engine to guess with. */
    const planTool = findActivity('tool:plan') ?? buildCatalog()[0]!;
    return reason(
      planTool,
      'no-goal',
      'Setting a target band (and an exam date if you have one) is what makes every other suggestion here specific rather than generic.',
      {},
    );
  }

  const from = { session, plannedActivityId: step.activityId };
  const activity = findActivity(tutorActivityIdFor(step)) ?? findActivity('tool:plan') ?? buildCatalog()[0]!;

  // 1. The plan itself needs attention: a passed exam date, or no goal at
  //    all to pace anything against. Neither is a study activity, and
  //    neither may ever read as "course complete".
  if (step.activityId === 'tool:plan') {
    return session.targetBand === null
      ? reason(
          activity,
          'no-goal',
          'Setting a target band (and an exam date if you have one) is what makes every other suggestion here specific rather than generic.',
          {},
          undefined,
          from,
        )
      : reason(
          activity,
          'plan-date-passed',
          'The exam date on your plan has passed. Set a new date or change the goal, and the plan will rebuild around it.',
          {},
          undefined,
          from,
        );
  }

  // 2. A counted weakness behind the session's objective. The strongest
  //    reason there is, because it names what was measured, and the two
  //    wordings differ by whether the lesson has been read yet.
  const weakness = observationFor(session, observations);
  if (weakness) {
    const tentative = weakness.confidence === 'tentative';
    if (step.kind === 'lesson') {
      const rule = tentative ? 'weakness-teach-tentative' : 'weakness-teach';
      return reason(
        activity,
        rule,
        '{claim} You have not worked through the lesson on it yet ({evidence}).',
        {},
        weakness,
        from,
      );
    }
    if (activity.kind === 'drill') {
      const rule = tentative ? 'weakness-drill-tentative' : 'weakness-drill';
      return reason(
        activity,
        rule,
        '{claim} These drills are filtered to exactly that type ({evidence}).',
        {},
        weakness,
        from,
      );
    }
    return reason(
      activity,
      'weakness-criterion',
      '{claim} Another marked attempt is the fastest way to move it ({evidence}).',
      {},
      weakness,
      from,
    );
  }

  // 3. Nothing marked anywhere yet, and the plan starts with teaching. There
  //    is no evidence to point at, so naming a missing result four times
  //    over would only tell a brand new student that everything about them
  //    is unknown. FIXED 2026-09-22: this used to say "the course is
  //    ordered so each lesson builds on the last", the retired fixed-course
  //    engine's own wording, which could name a different activity than the
  //    session's real current step shown elsewhere on the same page (the
  //    bug is described in the personal learning fix round). The honest
  //    reason is what today's session itself is building towards, worded
  //    the same way rule 6 below words every other step in the session.
  if (!insights.hasAnyResults && step.kind === 'lesson') {
    return reason(
      activity,
      'session-start',
      "Nothing is on record yet, so this is where today's session starts: {objective}",
      { objective: session.objective },
      undefined,
      from,
    );
  }

  // 4. A paper they are aiming at but have never attempted. That is the
  //    usual reason the plan turns to a paper the student has not touched,
  //    and without a result there is genuinely nothing to say about it, so
  //    saying so plainly beats inventing a band.
  const gap = observations.find((o) => o.kind === 'gap' && o.id === `gap:${session.paper}`);
  if (gap) {
    return reason(activity, 'missing-paper', '{claim} One attempt gives you a starting point to work from.', {}, gap, from);
  }

  // 5. A whole paper under timing, with the library behind them.
  if (step.kind === 'full-test' && nextCourseLesson(progress) === null) {
    return reason(
      activity,
      'course-complete',
      'Every lesson is done, so the useful work now is full papers under exam timing.',
      {},
      undefined,
      from,
    );
  }

  // 6. Anything else in the session: a lesson with other work already on
  //    record behind it, practice, a check, a recap. The plan already has a
  //    counted reason for it; this names the objective it belongs to so the
  //    card is not a bare link and never disagrees with the shared session
  //    named everywhere else on the page. A lesson step used to get its own
  //    "next in the course" wording here (rule was 'course-continue');
  //    removed 2026-09-22 for the same reason as rule 3 above, since it is
  //    exactly this generic wording with nothing lesson-specific about it.
  return reason(
    activity,
    'session-step',
    "It is the next step in today's session, which is working on this: {objective}",
    { objective: session.objective },
    undefined,
    from,
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
