/* The daily study-plan schedule: given a saved plan (target band, exam date,
   daily minutes, study days) plus the course sequence, deterministically lays
   out which course items land on which calendar day, from the day the plan
   was created up to the exam.

   The schedule is derived, never stored. buildSchedule() is a pure function
   of the plan's parameters and the (also derived) course order — call it
   again and it produces exactly the same days. Only "is this item done" is
   read from progress, which is why buildSchedule() itself never touches
   progress: everything here can compute the calendar first, then layer
   completion on top. See markItemsDone() and getTodayPlan()/getWeekPlan()
   for that second step.

   Rules encoded here (see the parent feature brief for the plain-English
   version):
   - Lessons appear in course order (src/lib/course.ts), 12 minutes each.
   - A drill of the matching skill follows every two lessons (10 minutes),
     only when that skill has drills (reading/listening; writing, speaking
     and vocabulary lessons don't get one).
   - One full test a week from week two, alternating reading and listening
     (60/40 minutes), plus a short vocabulary review to round the day out.
   - Every 7th calendar day is a review day: revisit earlier lessons instead
     of taking on new ones.
   - The last two study days before the exam are light review only, no new
     material.
   - If the course can't fit before the exam at the student's daily pace,
     review days are dropped first, then drills, but every lesson still gets
     a day — see the "compressed" branch below. */

import { buildCourse, type CourseLesson } from '../course';
import type { ProgressV1 } from '../progress';
import { ALL_TESTS } from '../../data/tests';
import { ALL_READING_DRILLS, ALL_LISTENING_DRILLS, type DrillMeta } from '../tests/drills';
import type { PracticeTest } from '../tests/schema';
import { saveStudyPlan, type SavedPlan } from '../study-plan';
import { getVocabSummary } from '../vocab-review';
import { getVocabularyPart } from '../../data/vocabulary';
import { addDays, daysBetween, isWeekday, parseDateKey, toLocalDateKey } from './date';

export const DEFAULT_DAILY_MINUTES = 25;
export const DEFAULT_PLAN_WEEKS = 8;

const LESSON_MINUTES = 12;
const DRILL_MINUTES = 10;
const VOCAB_MINUTES = 5;
const REVIEW_MINUTES = 8;
const MOCK_MINUTES = 150;
const TEST_MINUTES: Record<'reading' | 'listening', number> = { reading: 60, listening: 40 };

export type PlanItemType = 'lesson' | 'drill' | 'test' | 'vocab' | 'review' | 'mock';

export interface PlanItem {
  /** Stable id. For lessons this is the progress.lessons key; for drills and
      tests it's the id progress.tests is keyed by; for review it's
      `review:<lesson key>`; for vocab it's a fixed placeholder id (there's
      nowhere to record completion yet — see `trackable` below). */
  id: string;
  type: PlanItemType;
  label: string;
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
}

export interface PlanParams {
  startDate: string;
  examDate: string;
  dailyMinutes: 15 | 25 | 40 | 60;
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

function courseLessons(): CourseLesson[] {
  return buildCourse().flatMap((m) => m.lessons);
}

function fullTests(skill: 'reading' | 'listening'): PracticeTest[] {
  return ALL_TESTS.filter((t) => t.skill === skill);
}

function lessonItem(l: CourseLesson): PlanItem {
  return { id: l.key, type: 'lesson', label: l.title, meta: l.skillLabel, href: l.href, minutes: LESSON_MINUTES, skill: l.skill, done: false, trackable: true };
}

function drillItem(d: DrillMeta, skill: 'reading' | 'listening'): PlanItem {
  return {
    id: d.id,
    type: 'drill',
    label: d.test.title,
    meta: skill === 'reading' ? 'Reading drill' : 'Listening drill',
    href: `/trainers/${skill}/${d.id}`,
    minutes: DRILL_MINUTES,
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
    meta: skill === 'reading' ? 'Full Reading test' : 'Full Listening test',
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
    label: part ? `Vocabulary: ${part.title}` : 'Vocabulary',
    meta: 'Quick recap',
    href: part ? `/review?topic=${part.slug}` : '/review',
    minutes: VOCAB_MINUTES,
    done: false,
    trackable: true,
  };
}

function mockItem(date: string): PlanItem {
  return { id: `mock:${date}`, type: 'mock', label: 'Full mock exam', meta: 'Timed, all four papers', href: '/tests/mock', minutes: MOCK_MINUTES, done: false, trackable: true };
}

function reviewItem(l: CourseLesson): PlanItem {
  return { id: `review:${l.key}`, type: 'review', label: l.title, meta: 'Review', href: l.href, minutes: REVIEW_MINUTES, skill: l.skill, done: false, trackable: true };
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
  const lessons = courseLessons();
  const totalLessons = lessons.length;
  // Vocabulary lesson keys are `vocabulary-<slug>`; course order here
  // matches src/data/vocabulary.ts's VOCABULARY_PARTS order exactly, since
  // interleaveBySkill() never reorders lessons within one skill's queue.
  const vocabTopicSlugs = lessons.filter((l) => l.skill === 'vocabulary').map((l) => l.key.replace(/^vocabulary-/, ''));

  const totalCalendarDays = Math.max(1, daysBetween(params.startDate, params.examDate));
  const allDates: string[] = Array.from({ length: totalCalendarDays }, (_, i) => addDays(params.startDate, i));
  const studyDates = allDates.filter((d) => (params.studyDays === 'weekdays' ? isWeekday(d) : true));

  // The two study days immediately before the exam are always light review,
  // never dropped even under heavy compression.
  const lightCount = Math.min(2, studyDates.length);
  const lightDates = new Set(studyDates.slice(Math.max(0, studyDates.length - lightCount)));
  const workingDates = studyDates.filter((d) => !lightDates.has(d));

  const reviewDateCount = workingDates.filter((d) => (daysBetween(params.startDate, d) + 1) % 7 === 0).length;
  const perDayLessonBudget = Math.max(1, Math.floor(params.dailyMinutes / LESSON_MINUTES));

  // Compression: work out whether every lesson can land on its own
  // reasonable slot before the light-review tail. If review days would
  // starve the lesson queue, drop them (lesson days absorb their slots). If
  // that's still not enough, drop drills too. If it's STILL not enough (an
  // exam booked in a handful of days with fifty lessons left), lessons win
  // outright: force as many per day as it takes, ignoring the usual budget.
  const lessonDaysWithReview = Math.max(1, workingDates.length - reviewDateCount);
  let allowReview = lessonDaysWithReview * perDayLessonBudget >= totalLessons;
  let allowDrills = true;
  let perDay = perDayLessonBudget;
  if (!allowReview) {
    const lessonDaysNoReview = Math.max(1, workingDates.length);
    if (lessonDaysNoReview * perDayLessonBudget < totalLessons) {
      allowDrills = false;
      perDay = Math.max(perDayLessonBudget, Math.ceil(totalLessons / lessonDaysNoReview));
    }
  }
  const compressed = perDay > perDayLessonBudget;

  // Mock exam days: once every two weeks starting week three (weeks 3, 5,
  // 7, ...), on the Sunday of that week if it's a study day, otherwise the
  // last study day of that week (e.g. Friday on a weekdays-only plan).
  // Picked from workingDates so a mock exam never lands on one of the two
  // light-review days right before the exam.
  const weekToWorkingDates = new Map<number, string[]>();
  for (const d of workingDates) {
    const wk = Math.ceil((daysBetween(params.startDate, d) + 1) / 7);
    const list = weekToWorkingDates.get(wk) ?? [];
    list.push(d);
    weekToWorkingDates.set(wk, list);
  }
  const mockDates = new Set<string>();
  for (const [wk, dates] of weekToWorkingDates) {
    if (wk < 3 || (wk - 3) % 2 !== 0) continue;
    const sunday = dates.find((d) => parseDateKey(d).getDay() === 0);
    const chosen = sunday ?? dates[dates.length - 1];
    if (chosen) mockDates.add(chosen);
  }

  let lessonPtr = 0;
  let sinceDrill = 0;
  let readingDrillPtr = 0;
  let listeningDrillPtr = 0;
  let readingTestPtr = 0;
  let listeningTestPtr = 0;
  let nextTestSkill: 'reading' | 'listening' = 'reading';
  let lastTestWeek = 0;

  const readingDrills = ALL_READING_DRILLS;
  const listeningDrills = ALL_LISTENING_DRILLS;
  const readingTests = fullTests('reading');
  const listeningTests = fullTests('listening');

  const days: PlanDay[] = [];

  for (const date of studyDates) {
    const dayNumber = daysBetween(params.startDate, date) + 1;
    const weekNumber = Math.ceil(dayNumber / 7);
    const isLight = lightDates.has(date);
    const isMock = !isLight && mockDates.has(date);
    const isReview = !isLight && !isMock && allowReview && dayNumber % 7 === 0;
    const items: PlanItem[] = [];

    if (isLight) {
      for (const l of pickReviewLessons(lessons, lessonPtr)) items.push(reviewItem(l));
      if (items.length === 0) items.push(vocabItem(dayNumber, vocabTopicSlugs));
    } else if (isMock) {
      items.push(mockItem(date));
      items.push(vocabItem(dayNumber, vocabTopicSlugs));
    } else if (isReview) {
      for (const l of pickReviewLessons(lessons, lessonPtr)) items.push(reviewItem(l));
      if (items.length < 2) items.push(vocabItem(dayNumber, vocabTopicSlugs));
    } else if (weekNumber >= 2 && weekNumber !== lastTestWeek) {
      lastTestWeek = weekNumber;
      const pool = nextTestSkill === 'reading' ? readingTests : listeningTests;
      if (pool.length > 0) {
        const ptr = nextTestSkill === 'reading' ? readingTestPtr : listeningTestPtr;
        const test = pool[ptr % pool.length]!;
        items.push(testItem(test, nextTestSkill));
        if (nextTestSkill === 'reading') readingTestPtr++;
        else listeningTestPtr++;
      }
      nextTestSkill = nextTestSkill === 'reading' ? 'listening' : 'reading';
      items.push(vocabItem(dayNumber, vocabTopicSlugs));
    } else {
      // Ordinary lesson day: fill the budget with lessons, a drill after
      // every two (when the skill has one and there's room), topped up with
      // a vocab review if the day would otherwise be a single short item.
      // `compressed` days ignore the usual 4-item and minute-budget caps for
      // lessons specifically — see the "never drop lessons" comment above
      // buildSchedule(). Everything else (drills, the item-count cap) still
      // applies, since those are exactly what compression is allowed to cut.
      let minutesUsed = 0;
      let lessonsToday = 0;
      while (lessonPtr < lessons.length && lessonsToday < perDay && (compressed || items.length < 4)) {
        const lesson = lessons[lessonPtr]!;
        items.push(lessonItem(lesson));
        minutesUsed += LESSON_MINUTES;
        lessonPtr++;
        lessonsToday++;
        sinceDrill++;
        if (allowDrills && sinceDrill >= 2 && items.length < 4) {
          const skill = lesson.skill;
          if (skill === 'reading' || skill === 'listening') {
            const drills = skill === 'reading' ? readingDrills : listeningDrills;
            if (drills.length > 0) {
              const ptr = skill === 'reading' ? readingDrillPtr : listeningDrillPtr;
              items.push(drillItem(drills[ptr % drills.length]!, skill));
              minutesUsed += DRILL_MINUTES;
              if (skill === 'reading') readingDrillPtr++;
              else listeningDrillPtr++;
            }
          }
          sinceDrill = 0;
        }
        if (!compressed && minutesUsed >= params.dailyMinutes) break;
      }
      if (items.length === 0) {
        // The course finished with days still left before the exam (no
        // lessons were added above): keep reviewing instead of showing a
        // near-empty day. Checked before the vocab top-up below, otherwise
        // that top-up fires first and this branch never gets a chance to.
        for (const l of pickReviewLessons(lessons, lessonPtr)) items.push(reviewItem(l));
        if (items.length === 0) items.push(vocabItem(dayNumber, vocabTopicSlugs));
      } else if (!compressed && items.length < 2 && items.length < 4) {
        items.push(vocabItem(dayNumber, vocabTopicSlugs));
      }
    }

    days.push({ date, dayNumber, weekNumber, isReview, isExamLight: isLight, items });
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
      return { ...item, done: Boolean(progress.lessons[refKey]) };
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
  totalDays: number;
  weekNumber: number;
  items: PlanItem[];
  onTrack: boolean;
  daysBehind: number;
  behindMessage: string | null;
  /** Past the exam date: nothing left to schedule. */
  finished: boolean;
}

/** Today's card for /dashboard: the earliest unfinished items (rolling
    forward anything missed on previous study days), capped to roughly the
    daily goal. Null when there's no plan yet — callers show the empty
    state. */
export function getTodayPlan(plan: SavedPlan | null, progress: ProgressV1, today: Date = new Date()): TodayPlan | null {
  if (!plan) return null;
  const { params, days } = scheduleWithProgress(plan, progress);
  const todayStr = toLocalDateKey(today);
  const totalDays = Math.max(1, daysBetween(params.startDate, params.examDate));
  const dayNumber = Math.min(Math.max(daysBetween(params.startDate, todayStr) + 1, 1), totalDays);
  const finished = todayStr > params.examDate;

  const past = days.filter((d) => d.date < todayStr);
  const backlog = past.flatMap((d) => d.items.filter((i) => i.trackable && !i.done));
  const daysBehind = new Set(past.filter((d) => d.items.some((i) => i.trackable && !i.done)).map((d) => d.date)).size;

  const todayDay = days.find((d) => d.date === todayStr);
  const todaysOwnItems = todayDay ? todayDay.items : [];
  const combined = [...backlog, ...todaysOwnItems.filter((i) => !backlog.some((b) => b.id === i.id))];

  const capped: PlanItem[] = [];
  let minutes = 0;
  for (const item of combined) {
    if (capped.length >= 2 && minutes >= params.dailyMinutes) break;
    if (capped.length >= 6) break;
    capped.push(item);
    minutes += item.minutes;
  }
  if (capped.length === 0 && todaysOwnItems.length > 0) capped.push(...todaysOwnItems.slice(0, 4));

  const behind = daysBehind > 3;
  return {
    date: todayStr,
    dayNumber,
    totalDays,
    weekNumber: todayDay?.weekNumber ?? Math.ceil(dayNumber / 7),
    items: capped,
    onTrack: daysBehind === 0,
    daysBehind,
    behindMessage: behind ? `You are ${daysBehind} days behind, here is a lighter plan.` : null,
    finished,
  };
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
