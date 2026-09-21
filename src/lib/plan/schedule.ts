/* Calendar follows the taught curriculum, not a random rotation of skills.
   Completion stays in the existing progress store.

   buildSchedule() and getWeekPlan() still lay the whole library out over the
   days available, which is what /start's week view shows. getTodayPlan(),
   below, no longer does: since 2026-09-22 it is a view of the ONE current
   session in the student's plan (src/lib/learning), which is also what the
   course card and Mr EZ read. That is what stopped the three of them naming
   three different activities on the same screen. */
import { buildCourse, type CourseLesson } from '../course';
import type { ProgressV1 } from '../progress';
import { ALL_TESTS } from '../../data/tests';
import { ALL_READING_DRILLS, ALL_LISTENING_DRILLS, type DrillMeta } from '../tests/drills';
import type { PracticeTest, TranslatableText } from '../tests/schema';
import { loadStudyPlan, saveStudyPlan, loadHomeTargetBand, type SavedPlan } from '../study-plan';
import { getVocabSummary } from '../vocab-review';
import { getVocabularyPart } from '../../data/vocabulary';
import { addDays, daysBetween, isWeekday, parseDateKey, toLocalDateKey } from './date';
import { nt } from '../i18n/translate';
/* Importing the browser entry point is what installs the shared-session
   provider, so any page that shows Today also gives the course card and Mr
   EZ the same session to read. This module is browser-only already (it
   imports 3.7 MiB of papers), so it is the right place to do it; nothing
   under src/lib/learning may import it back. The named import is there so
   no bundler can decide the module is unused and drop the wiring with it. */
import { ensureLearningWired } from '../learning';
import {
  constraintsFrom,
  currentSharedSession,
  goalsFrom,
  legacyItemType,
  lessonMapsFor,
  planSettingsFromSavedPlan,
  sharedSessionFrom,
  type SharedSessionView,
  type SharedStepView,
} from '../learning/adapters';
import { learningCatalogue } from '../learning/catalog';
import type { PlanStatus } from '../learning/contracts/plan';
import { migrateProgress } from '../learning/migrate';
import { createInitialPlan } from '../learning/planner';
import { evaluateEvidence } from '../learning/policy';

export const DEFAULT_DAILY_MINUTES = 25;
export const DEFAULT_PLAN_WEEKS = 8;

const LESSON_MINUTES = 12;
const VOCAB_MINUTES = 5;
const REVIEW_MINUTES = 8;
const MOCK_MINUTES = 150;
const TEST_MINUTES: Record<'reading' | 'listening', number> = { reading: 60, listening: 40 };

export type PlanItemType = 'lesson' | 'drill' | 'test' | 'vocab' | 'review' | 'mock';

export interface PlanItem {
  /** Vocabulary items only: the topic title on its own, so the label can be
      shown in the student's language. See planItemLabel(). */
  topic?: string;
  /** Stable id. In buildSchedule() and getWeekPlan() this is still what it
      always was: the progress.lessons key for a lesson, the progress.tests
      key for a drill or test, `review:<lesson key>` for a review.
      In getTodayPlan() it is the SESSION STEP id, because one session can
      hold the same activity twice (practise it, then recap it) and a list
      with two identical ids is a bug waiting to happen. Use `activityId`
      when you want the catalogue id. */
  id: string;
  /** Today's list only: the catalogue id, which is the id courseStatus and
      recommendNext name for the same step. */
  activityId?: string;
  /** Today's list only: the session step this came from, for marking it
      started or done (see markStepDone in src/lib/learning). */
  stepId?: string;
  type: PlanItemType;
  label: string;
  /** Set only when `label` was composed rather than written out (a drill's
      name is built from a part label and a passage title), so the label has
      a dictionary key of its own plus the values to fill in. planItemLabel()
      prefers this when it is there. */
  labelText?: TranslatableText;
  /** Short line under the label, e.g. "Reading" or "Full Listening test". */
  meta: string;
  /** Unprefixed path — callers apply withBase(), same convention as
      CourseLesson.href and everywhere else in this codebase. */
  href: string;
  minutes: number;
  skill?: CourseLesson['skill'];
  done: boolean;
  /** False for items with no per-occurrence completion signal to check.
      Currently always true: vocabulary review reads getVocabSummary() (a
      single global "today" flag, not tied to one scheduled day) and mock
      exams read progress.tests for a 'mock-' attempt, both in
      markItemsDone() below. Kept as a field, rather than assumed, so a
      future item type with no completion source yet can opt out of the
      "behind" backlog the same way vocab review used to. */
  trackable: boolean;
}

export interface PlanDay {
  date: string; // YYYY-MM-DD
  dayNumber: number; // 1-based from the plan's start date
  weekNumber: number; // 1-based
  isReview: boolean;
  isExamLight: boolean;
  items: PlanItem[];
  focus?: string;
}

export interface PlanParams {
  startDate: string;
  examDate: string;
  /** 90 was added on 2026-09-22 alongside SavedPlan.dailyMinutes, so a
      student who really does study an hour and a half is scheduled for an
      hour and a half rather than quietly rounded down to an hour. */
  dailyMinutes: 15 | 25 | 40 | 60 | 90;
  studyDays: 'daily' | 'weekdays';
}

/** Fill in every optional plan field with its default, without touching
    storage. Pure — safe to call on every render. */
export function resolvePlanParams(plan: SavedPlan): PlanParams {
  const startDate = plan.startDate || (plan.createdAt ? plan.createdAt.slice(0, 10) : toLocalDateKey(new Date()));
  let examDate = plan.testDate || addDays(startDate, DEFAULT_PLAN_WEEKS * 7);
  if (daysBetween(startDate, examDate) < 1) examDate = addDays(startDate, 7); // guard against a past/same-day date
  const dailyMinutes = (plan.dailyMinutes ?? DEFAULT_DAILY_MINUTES) as PlanParams['dailyMinutes'];
  const studyDays = plan.studyDays ?? 'daily';
  return { startDate, examDate, dailyMinutes, studyDays };
}

/** Stamp `startDate` onto a plan that predates this feature (or was created
    before its first schedule render), so the schedule stays anchored to
    when the student actually started rather than drifting on every visit.
    A no-op, and side-effect free, once the plan already has one. */
export function ensurePlanStartDate(plan: SavedPlan): SavedPlan {
  if (plan.startDate) return plan;
  const startDate = plan.createdAt ? plan.createdAt.slice(0, 10) : toLocalDateKey(new Date());
  const next: SavedPlan = { ...plan, startDate };
  saveStudyPlan(next);
  return next;
}

/** Build a fresh default plan for a student who has never saved one: start
    date is today (persisted immediately, see loadOrCreateStudyPlan, so it
    never drifts on a later visit), target band is whatever the homepage
    hero already picked or 7.0, no exam date (the 8-week default pace this
    module already falls back to), 25 minutes a day, every day. Marked
    `defaulted` so the settings strip can offer a quiet hint instead of
    treating this guess as a choice the student actually made. Pure — call
    loadOrCreateStudyPlan() to also persist it. */
export function createDefaultPlan(): SavedPlan {
  return {
    targetBand: loadHomeTargetBand() ?? '7.0',
    testDate: '',
    createdAt: new Date().toISOString(),
    startDate: toLocalDateKey(new Date()),
    dailyMinutes: DEFAULT_DAILY_MINUTES,
    studyDays: 'daily',
    done: [],
    doneKeys: [],
    defaulted: true,
  };
}

/** Load the saved plan, or create and persist a default one (see
    createDefaultPlan) so Today, the streak, the week view and the
    dashboard cards all work from the very first visit — no onboarding
    form, ever. An old plan that predates the startDate field still gets
    one stamped on, via ensurePlanStartDate, the same as a brand new
    default plan already has. SSR-safe: returns an unpersisted default
    without touching storage when there is no window. */
export function loadOrCreateStudyPlan(): SavedPlan {
  const existing = loadStudyPlan();
  if (existing) return ensurePlanStartDate(existing);
  const created = createDefaultPlan();
  if (typeof window !== 'undefined') saveStudyPlan(created);
  return created;
}

function courseLessons(): CourseLesson[] {
  return buildCourse().flatMap((m) => m.lessons);
}

function fullTests(skill: 'reading' | 'listening'): PracticeTest[] {
  return ALL_TESTS.filter((t) => t.skill === skill);
}

function lessonItem(l: CourseLesson): PlanItem {
  return { id: l.key, type: 'lesson', label: l.title, meta: l.skillLabel, href: l.href, minutes: l.minutes ?? LESSON_MINUTES, skill: l.skill, done: false, trackable: true };
}

function drillItem(d: DrillMeta, skill: 'reading' | 'listening'): PlanItem {
  return {
    id: d.id,
    type: 'drill',
    label: d.test.title,
    labelText: d.test.titleText,
    meta: skill === 'reading' ? nt('Reading drill') : nt('Listening drill'),
    href: `/trainers/${skill}/${d.id}`,
    minutes: d.test.durationMinutes,
    skill,
    done: false,
    trackable: true,
  };
}

function testItem(t: PracticeTest, skill: 'reading' | 'listening'): PlanItem {
  return {
    id: t.id,
    type: 'test',
    label: t.title,
    meta: skill === 'reading' ? nt('Full Reading test') : nt('Full Listening test'),
    href: `/tests/${t.id}`,
    minutes: TEST_MINUTES[skill],
    skill,
    done: false,
    trackable: true,
  };
}

/** The day's vocabulary item: cycles through the course's vocabulary
    lessons in course order (one per scheduled day, wrapping), naming and
    linking straight to that day's topic on /review — `Vocabulary:
    Environment & Ecology` -> `/review?topic=environment` — so opening it
    lands directly in the relevant topic instead of the plain hub. Falls
    back to the generic label/link on the (should-never-happen) chance the
    course has no vocabulary lessons at all. */
function vocabItem(dayNumber: number, vocabTopicSlugs: string[]): PlanItem {
  const slug = vocabTopicSlugs.length ? vocabTopicSlugs[(dayNumber - 1) % vocabTopicSlugs.length]! : null;
  const part = slug ? getVocabularyPart(slug) : undefined;
  return {
    id: 'vocab-review',
    type: 'vocab',
    // The English label stays a plain string so nothing that reads it changes.
    // `topic` carries the topic title on its own, so planItemLabel() below can
    // translate the prefix and the topic separately: the coverage test can only
    // see static literals, and a composite `Vocabulary: ${title}` is not one.
    label: part ? `Vocabulary: ${part.title}` : nt('Vocabulary'),
    topic: part?.title,
    meta: nt('Quick recap'),
    href: part ? `/review?topic=${part.slug}` : '/review',
    minutes: VOCAB_MINUTES,
    done: false,
    trackable: true,
  };
}

function mockItem(date: string): PlanItem {
  return { id: `mock:${date}`, type: 'mock', label: nt('Full mock exam'), meta: nt('Timed, all four papers'), href: '/tests/mock', minutes: MOCK_MINUTES, done: false, trackable: true };
}

function reviewItem(l: CourseLesson): PlanItem {
  return { id: `review:${l.key}`, type: 'review', label: l.title, meta: nt('Review'), href: l.href, minutes: REVIEW_MINUTES, skill: l.skill, done: false, trackable: true };
}

/** Up to two earlier lessons to revisit on a review day, picked with a
    little spacing (a week-old and a few-days-old lesson) rather than just
    the two most recent, so review actually reaches back instead of
    repeating what was just covered. */
function pickReviewLessons(lessons: CourseLesson[], upTo: number): CourseLesson[] {
  const idxs = [upTo - 6, upTo - 3].filter((i) => i >= 0 && i < upTo);
  const unique = [...new Set(idxs)];
  if (unique.length === 0 && upTo > 0) unique.push(upTo - 1);
  return unique.map((i) => lessons[i]!);
}

/** The full day-by-day schedule from the plan's start date up to (but not
    including) the exam date itself — sitting the exam isn't a study day.
    Items are NOT marked done here; pair with markItemsDone() for that. */
export function buildSchedule(plan: SavedPlan): PlanDay[] {
  const params = resolvePlanParams(plan);
  const modules = buildCourse();
  const lessons = courseLessons();
  const totalCalendarDays = Math.max(1, daysBetween(params.startDate, params.examDate));
  const dates = Array.from({ length: totalCalendarDays }, (_, i) => addDays(params.startDate, i))
    .filter((d) => params.studyDays !== 'weekdays' || isWeekday(d));
  const lightDates = new Set(dates.slice(-Math.min(2, dates.length)));
  const workingDates = dates.filter((d) => !lightDates.has(d));
  const taught: CourseLesson[] = [];
  const days: PlanDay[] = [];

  function recap(): PlanItem[] {
    const earlier = pickReviewLessons(taught, taught.length).map(reviewItem);
    // Recaps are practice prompts, not new completion requirements or overdue work.
    return earlier.map((item) => ({ ...item, trackable: false }));
  }
  function vocabulary(dayNumber: number): PlanItem | null {
    const topics = taught.filter((l) => l.key.startsWith('vocabulary-')).map((l) => l.key.slice(11));
    return topics.length ? { ...vocabItem(dayNumber, topics), trackable: false } : null;
  }
  function addDay(date: string, items: PlanItem[], focus: string, isReview = false) {
    const dayNumber = daysBetween(params.startDate, date) + 1;
    days.push({ date, dayNumber, weekNumber: Math.ceil(dayNumber / 7), isReview,
      isExamLight: lightDates.has(date), items, focus });
  }
  function teach(unitLessons: CourseLesson[], unitDates: string[], focus: string) {
    let ptr = 0;
    // Reserve a consolidation day only when every lesson has a teaching day.
    const lessonDays = unitDates.length > unitLessons.length ? unitDates.length - 1 : unitDates.length;
    for (let index = 0; index < unitDates.length; index++) {
      const date = unitDates[index]!;
      const dayNumber = daysBetween(params.startDate, date) + 1;
      const items: PlanItem[] = [];
      const remainingDays = Math.max(1, lessonDays - index);
      const minimum = Math.ceil((unitLessons.length - ptr) / remainingDays);
      let minutes = 0;
      // Never hide a lesson when dates are tight. Show the true workload in the UI.
      while (ptr < unitLessons.length && index < lessonDays) {
        const next = unitLessons[ptr]!;
        const duration = next.minutes ?? LESSON_MINUTES;
        if (items.length >= minimum && minutes + duration > params.dailyMinutes) break;
        items.push(lessonItem(next));
        taught.push(next);
        minutes += duration;
        ptr++;
      }
      const isReview = items.length === 0;
      if (isReview) items.push(...recap());
      const words = vocabulary(dayNumber);
      if (words && items.reduce((n, i) => n + i.minutes, 0) + words.minutes <= params.dailyMinutes) items.push(words);
      addDay(date, items, focus, isReview);
    }
  }

  if (workingDates.length < modules.length) {
    // Very short deadlines cannot honestly contain eight weekly units.
    teach(lessons, workingDates, nt('Condensed course: follow the lesson order'));
  } else {
    // Eight equal blocks of study days. At the default daily pace, unit 1 is week 1.
    for (let index = 0; index < modules.length - 1; index++) {
      const start = Math.floor(index * dates.length / modules.length);
      const end = Math.min(Math.floor((index + 1) * dates.length / modules.length), workingDates.length);
      teach(modules[index]!.lessons, workingDates.slice(start, end), modules[index]!.name);
    }
    const examDates = workingDates.slice(Math.floor(7 * dates.length / modules.length));
    const reading = fullTests('reading')[0];
    const listening = fullTests('listening')[0];
    examDates.forEach((date, index) => {
      let items: PlanItem[];
      if (index === 0 && reading) items = [testItem(reading, 'reading')];
      else if (index === Math.max(1, Math.floor((examDates.length - 1) / 2)) && listening) items = [testItem(listening, 'listening')];
      else if (examDates.length >= 3 && index === examDates.length - 1) items = [mockItem(date)];
      else {
        items = recap();
        const skill = index % 2 === 0 ? 'listening' : 'reading';
        const pool = skill === 'reading' ? ALL_READING_DRILLS : ALL_LISTENING_DRILLS;
        const drill = pool[Math.floor(index / 2) % pool.length];
        if (drill && index > 4) items = [drillItem(drill, skill)];
      }
      addDay(date, items, modules[7]!.name, items.every((i) => i.type === 'review'));
    });
  }
  for (const date of dates.filter((d) => lightDates.has(d))) {
    const items = recap();
    if (!items.length) items.push({ ...reviewItem(lessons[0]!), label: nt('Gently review the Speaking overview'), trackable: false });
    addDay(date, items, nt('Light review before your exam'), true);
  }
  return days;
}

/** Layer completion onto a day's items from the progress store. A lesson is
    done when progress.lessons has its key; a review item reuses that same
    check against the lesson it points at. A drill or test is done when an
    attempt with that id exists on or after the plan's start date (so a test
    sat before the plan even began doesn't retroactively tick a scheduled
    repeat of it). Vocabulary review reads getVocabSummary() (src/lib/vocab-
    review.ts) instead of progress, since its store is separate. A mock exam
    is done when any progress.tests attempt whose id starts with 'mock-'
    lands on or after that occurrence's own scheduled day. */
export function markItemsDone(items: PlanItem[], progress: ProgressV1, startDate: string): PlanItem[] {
  const cutoff = parseDateKey(startDate).getTime();
  return items.map((item) => {
    if (item.type === 'lesson') return { ...item, done: Boolean(progress.lessons[item.id]) };
    if (item.type === 'review') {
      const refKey = item.id.startsWith('review:') ? item.id.slice('review:'.length) : item.id;
      return { ...item, done: item.trackable && Boolean(progress.lessons[refKey]) };
    }
    if (item.type === 'drill' || item.type === 'test') {
      const attempts = progress.tests[item.id] ?? [];
      const done = attempts.some((a) => new Date(a.at).getTime() >= cutoff);
      return { ...item, done };
    }
    if (item.type === 'vocab') {
      const summary = getVocabSummary();
      const done = summary.reviewedToday > 0 || (summary.due === 0 && summary.newToday === 0);
      return { ...item, done };
    }
    if (item.type === 'mock') {
      // Recurring item: each occurrence's own scheduled day (encoded in its
      // id, "mock:<date>") is the cutoff, not the plan's overall startDate —
      // otherwise a mock sat before a later occurrence would retroactively
      // tick it, the same trap markItemsDone's own startDate param exists to
      // avoid for drills/tests.
      const occurredOn = item.id.startsWith('mock:') ? item.id.slice('mock:'.length) : startDate;
      const mockCutoff = parseDateKey(occurredOn).getTime();
      const done = Object.entries(progress.tests).some(
        ([id, attempts]) => id.startsWith('mock-') && attempts.some((a) => new Date(a.at).getTime() >= mockCutoff),
      );
      return { ...item, done };
    }
    return item;
  });
}

function scheduleWithProgress(plan: SavedPlan, progress: ProgressV1): { params: PlanParams; days: PlanDay[] } {
  const params = resolvePlanParams(plan);
  const days = buildSchedule(plan).map((d) => ({ ...d, items: markItemsDone(d.items, progress, params.startDate) }));
  return { params, days };
}

export interface TodayPlan {
  date: string;
  dayNumber: number;
  /** Study days from the start to the exam. Zero when there is no exam date:
      a plan with no date paces itself provisionally and no longer invents a
      deadline eight weeks out. Read `status` before showing "day X of Y". */
  totalDays: number;
  weekNumber: number;
  items: PlanItem[];
  onTrack: boolean;
  daysBehind: number;
  behindMessage: string | null;
  /** ALWAYS false since 2026-09-22.
      A passed exam date used to set this true while introductory lessons
      were still outstanding, and the card rendered it as "Your plan is
      complete" (the audit's fifth reproduced finding). A date in the past
      is now `status: 'date-passed'`, which asks for a new date or a new
      goal. The field is kept so no caller breaks; read `status`. */
  finished: boolean;
  /** How the plan as a whole should be presented: on-track,
      provisional-no-date, recovering, date-passed, exam-imminent or
      goal-met. */
  status: PlanStatus;
  /** The shared session this list is a view of, when one is available. */
  session: SharedSessionView | null;
  /** The id of the one next activity, the same id `courseStatus().session`
      and `recommendNext()` name. */
  nextActivityId: string | null;
  /** The session's one objective and the counted reason behind it. */
  objective: string | null;
  reason: string | null;
  /** What honestly will not fit in the time left, when the planner had to
      leave real work out. Never a promise about a band. */
  scopeNote: string | null;
}

/** A title for one step, from the real registries where there is one.
 *
 *  The learning catalogue stores an objective sentence rather than a title,
 *  because titles live in the registries and get translated by the site's
 *  own dictionary. So the lesson, drill, test and vocabulary titles are
 *  looked up here, where all four are already imported, and anything else
 *  falls back to the activity's own honest sentence. */
function stepTitle(step: SharedStepView): { label: string; labelText?: TranslatableText; topic?: string } {
  if (step.lessonKey) {
    const lesson = courseLessons().find((l) => l.key === step.lessonKey);
    if (lesson) return { label: lesson.title };
  }
  if (step.activityId.startsWith('drill:')) {
    const id = step.activityId.slice('drill:'.length);
    const drill = [...ALL_READING_DRILLS, ...ALL_LISTENING_DRILLS].find((d) => d.id === id);
    if (drill) return { label: drill.test.title, labelText: drill.test.titleText };
  }
  if (step.activityId.startsWith('test:')) {
    const test = ALL_TESTS.find((t) => t.id === step.activityId.slice('test:'.length));
    if (test) return { label: test.title };
  }
  if (step.activityId.startsWith('review:vocabulary:')) {
    const part = getVocabularyPart(step.activityId.slice('review:vocabulary:'.length));
    if (part) return { label: `Vocabulary: ${part.title}`, topic: part.title };
  }
  return { label: step.objective };
}

/** The four paper names stay English wherever they appear, the same rule
    src/lib/tutor/ru.ts states: a student has to recognise these exact words
    on the real paper. Deliberately not wrapped for translation. */
const SKILL_META: Record<string, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

function stepItem(step: SharedStepView): PlanItem {
  const type = legacyItemType(step);
  const title = stepTitle(step);
  return {
    /* The step id, so one session that practises a drill and then recaps it
       does not produce two items with the same id. */
    id: step.stepId,
    activityId: step.activityId,
    stepId: step.stepId,
    type,
    label: title.label,
    labelText: title.labelText,
    topic: title.topic,
    meta: step.paper ? SKILL_META[step.paper] ?? nt('Practice') : nt('Practice'),
    href: step.href ?? '/dashboard',
    minutes: step.minutes,
    skill: step.paper,
    /* Completion comes from the session's own step state now, not from
       re-deriving it per item type, so a step the student finished stays
       finished through a refresh. */
    done: step.state === 'done' || step.state === 'skipped',
    trackable: true,
  };
}

/** Today's card for /dashboard: the steps of the student's one current
 *  session, in order, with the step they are on first.
 *
 *  Three things changed on 2026-09-22 and all three were audit findings.
 *  There is no rolled-forward backlog: missed days rebuild the plan from
 *  where the student actually is (see `status: 'recovering'`) instead of
 *  stacking old days on top of today. The list is the session, so it can
 *  never exceed the daily budget. And a passed exam date is `date-passed`,
 *  never `finished`.
 *
 *  Null only when there is genuinely nothing to show: no plan wired up and
 *  no saved settings to work one out from. Callers show the empty state. */
export function getTodayPlan(plan: SavedPlan | null, progress: ProgressV1, today: Date = new Date()): TodayPlan | null {
  ensureLearningWired();
  const session = currentSharedSession() ?? deriveSession(plan, progress, today);
  if (!session) return null;

  const todayStr = toLocalDateKey(today);
  const startDate = plan?.startDate || session.date;
  const dayNumber = Math.max(daysBetween(startDate, todayStr) + 1, 1);
  const totalDays = session.examDate ? Math.max(1, daysBetween(startDate, session.examDate)) : 0;

  /* The step the student is on comes first; everything already finished
     stays visible underneath so the hour reads as one session. */
  const ordered = [
    ...session.steps.filter((step) => step.state !== 'done' && step.state !== 'skipped'),
    ...session.steps.filter((step) => step.state === 'done' || step.state === 'skipped'),
  ];

  const daysBehind = session.missedStudyDays;
  return {
    date: todayStr,
    dayNumber,
    totalDays,
    weekNumber: Math.ceil(dayNumber / 7),
    items: ordered.map(stepItem),
    onTrack: daysBehind === 0,
    daysBehind,
    behindMessage:
      session.planStatus === 'recovering'
        ? `You missed ${daysBehind} study days, so today was rebuilt from where you are. Nothing has been stacked on it.`
        : null,
    finished: false,
    status: session.planStatus,
    session,
    nextActivityId: session.activityId,
    objective: session.objective,
    reason: session.reason,
    scopeNote: session.scopeNote,
  };
}

/** A session worked out on the spot, for a page that has not wired the
 *  learning layer up yet and for a server render.
 *
 *  The same three pure steps the Mr EZ Worker takes: read the old stores
 *  forward into a learner record, judge the evidence, plan. It is not
 *  stored, so it cannot drift from the real plan; it is simply the same
 *  answer computed again. */
function deriveSession(plan: SavedPlan | null, progress: ProgressV1, today: Date): SharedSessionView | null {
  if (!plan) return null;
  try {
    const settings = planSettingsFromSavedPlan(plan);
    const goals = goalsFrom(settings);
    const now = today.toISOString();
    const catalogue = learningCatalogue();
    const maps = lessonMapsFor(catalogue);
    const record = migrateProgress(progress, plan, maps.lessonMinutes, {
      now,
      lessonSubskills: maps.lessonSubskills,
    });
    const policy = evaluateEvidence({ record, goals, now });
    const { plan: personal } = createInitialPlan({
      catalogue,
      record,
      policy,
      now,
      today: toLocalDateKey(today),
      goals,
      constraints: constraintsFrom(settings),
    });
    return sharedSessionFrom({ plan: personal, catalogue, derived: true });
  } catch {
    /* A plan that cannot be built is not a reason to break the dashboard. */
    return null;
  }
}

export interface WeekView {
  weekNumber: number;
  totalWeeks: number;
  startDate: string;
  endDate: string;
  days: PlanDay[]; // always exactly 7 entries, Monday-anchored from the plan's own start weekday
}

/** The seven-day window for /start's week view. `weekNumber` is 1-based and
    clamped to the plan's actual length; omit it to get the week containing
    `today`. Days outside any study day (a rest day, or the exam date and
    beyond) still get an entry so the grid always has 7 columns — just with
    no items. */
export function getWeekPlan(plan: SavedPlan, progress: ProgressV1, weekNumber?: number, today: Date = new Date()): WeekView {
  const { params, days } = scheduleWithProgress(plan, progress);
  const totalDays = Math.max(1, daysBetween(params.startDate, params.examDate));
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const todayDayNumber = Math.min(Math.max(daysBetween(params.startDate, toLocalDateKey(today)) + 1, 1), totalDays);
  const currentWeek = Math.ceil(todayDayNumber / 7);
  const week = Math.min(Math.max(weekNumber ?? currentWeek, 1), totalWeeks);

  const byDate = new Map(days.map((d) => [d.date, d]));
  const weekStartDate = addDays(params.startDate, (week - 1) * 7);
  const weekDays: PlanDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStartDate, i);
    const existing = byDate.get(date);
    if (existing) {
      weekDays.push(existing);
      continue;
    }
    weekDays.push({ date, dayNumber: daysBetween(params.startDate, date) + 1, weekNumber: week, isReview: false, isExamLight: false, items: [] });
  }
  return { weekNumber: week, totalWeeks, startDate: weekStartDate, endDate: addDays(weekStartDate, 6), days: weekDays };
}


/** The label to SHOW for a plan item, in the student's language. Takes the
    translator as an argument so this module stays free of React and of any
    locale of its own. */
export function planItemLabel(
  item: Pick<PlanItem, 'label' | 'topic' | 'labelText'>,
  t: (text: string, vars?: Record<string, string | number>) => string,
): string {
  if (item.topic) return t('Vocabulary: {topic}', { topic: t(item.topic) });
  // A composed label (a drill) carries its own key and values; everything
  // else is written out, so the English label IS the key.
  if (item.labelText) return t(item.labelText.key, item.labelText.vars);
  return t(item.label);
}
