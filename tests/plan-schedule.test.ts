import { buildCourse, buildSections, courseStatus } from '../src/lib/course.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSchedule,
  markItemsDone,
  getTodayPlan,
  getWeekPlan,
  resolvePlanParams,
  createDefaultPlan,
} from '../src/lib/plan/schedule.ts';
import { getStreak, getLast14Days, isPlannedStudyDay } from '../src/lib/plan/streak.ts';
import { addDays, toLocalDateKey } from '../src/lib/plan/date.ts';
import type { SavedPlan } from '../src/lib/study-plan.ts';
import type { ProgressV1 } from '../src/lib/progress.ts';

const START = '2026-01-05'; // a Monday

function makePlan(overrides: Partial<SavedPlan> = {}): SavedPlan {
  return {
    targetBand: '6.5',
    testDate: addDays(START, 56),
    createdAt: `${START}T09:00:00.000Z`,
    startDate: START,
    done: [],
    doneKeys: [],
    ...overrides,
  };
}

function emptyProgress(): ProgressV1 {
  return { version: 1, lessons: {}, tests: {}, writing: {}, speaking: [], activity: {} };
}

test('buildSchedule places every course lesson exactly once, in course order', () => {
  const plan = makePlan();
  const days = buildSchedule(plan);
  const lessonIds = days.flatMap((d) => d.items.filter((i) => i.type === 'lesson').map((i) => i.id));
  const uniqueIds = new Set(lessonIds);
  assert.equal(uniqueIds.size, lessonIds.length, 'no lesson is scheduled twice');
  assert.deepEqual(lessonIds, buildCourse().flatMap((m) => m.lessons.map((l) => l.key)));
});

test('an ordinary study day has between 1 and 4 items', () => {
  const plan = makePlan();
  const days = buildSchedule(plan);
  for (const day of days) {
    if (day.isExamLight) continue; // light-review days can be a single item
    assert.ok(day.items.length >= 1, `day ${day.date} has fewer than 1 items`);
    assert.ok(day.items.length <= 4, `day ${day.date} has more than 4 items`);
  }
});

test('the last two study days before the exam are light review only', () => {
  const plan = makePlan();
  const days = buildSchedule(plan);
  const lightDays = days.filter((d) => d.isExamLight);
  assert.equal(lightDays.length, 2);
  for (const day of lightDays) {
    for (const item of day.items) {
      assert.ok(item.type === 'review' || item.type === 'vocab', `light day item "${item.id}" should be review/vocab, got ${item.type}`);
    }
  }
});

test('full tests follow all teaching, alternating reading and listening', () => {
  const plan = makePlan();
  const days = buildSchedule(plan);
  const testItems = days.flatMap((d) => d.items.filter((i) => i.type === 'test').map((i) => ({ week: d.weekNumber, skill: i.skill })));
  assert.ok(testItems.length > 0, 'at least one test is scheduled');
  assert.ok(testItems.every((t) => t.week === 8), 'tests belong to the final unit');
  for (let i = 1; i < testItems.length; i++) {
    assert.notEqual(testItems[i]!.skill, testItems[i - 1]!.skill, 'consecutive weekly tests alternate skill');
  }
});

test('compression: an exam a week away still schedules every lesson, never dropping one', () => {
  const plan = makePlan({ testDate: addDays(START, 6), dailyMinutes: 25 });
  const days = buildSchedule(plan);
  const totalCourseLessons = new Set(days.flatMap((d) => d.items.filter((i) => i.type === 'lesson').map((i) => i.id)));
  // Compare against an uncompressed run to make sure the lesson set itself
  // (not just its count) is identical - compression must never drop or
  // substitute a lesson, only the review/drill padding around it.
  const uncompressed = buildSchedule(makePlan());
  const uncompressedLessonIds = new Set(uncompressed.flatMap((d) => d.items.filter((i) => i.type === 'lesson').map((i) => i.id)));
  assert.deepEqual([...totalCourseLessons].sort(), [...uncompressedLessonIds].sort(), 'the exact same lessons are all still scheduled when compressed');
});

test('markItemsDone ticks a lesson once progress records it, and leaves others untouched', () => {
  const plan = makePlan();
  const days = buildSchedule(plan);
  const firstLesson = days.flatMap((d) => d.items).find((i) => i.type === 'lesson')!;
  const progress = emptyProgress();
  progress.lessons[firstLesson.id] = { completedAt: new Date().toISOString() };
  const marked = markItemsDone(days.find((d) => d.items.includes(firstLesson))!.items, progress, plan.startDate!);
  const found = marked.find((i) => i.id === firstLesson.id)!;
  assert.equal(found.done, true);
  const others = marked.filter((i) => i.id !== firstLesson.id);
  assert.ok(others.every((i) => !i.done));
});

test('getTodayPlan on day one of a fresh plan returns 1-4 items and reports on track', () => {
  const plan = makePlan();
  const progress = emptyProgress();
  const today = getTodayPlan(plan, progress, new Date(`${START}T12:00:00`));
  assert.ok(today);
  assert.equal(today!.dayNumber, 1);
  assert.ok(today!.items.length >= 1 && today!.items.length <= 4);
  assert.equal(today!.onTrack, true);
  assert.equal(today!.daysBehind, 0);
});

test('getTodayPlan flags "behind" once more than 3 past study days are left undone', () => {
  // Backdate the plan by 5 days with nothing completed: every one of those
  // days should still be sitting in the backlog.
  const plan = makePlan({ startDate: addDays(START, -5) });
  const progress = emptyProgress();
  const today = getTodayPlan(plan, progress, new Date(`${START}T12:00:00`));
  assert.ok(today);
  assert.ok(today!.daysBehind > 3, `expected more than 3 days behind, got ${today!.daysBehind}`);
  assert.ok(today!.behindMessage && today!.behindMessage.includes('days behind'));
  assert.equal(today!.onTrack, false);
});

test('a final mock follows teaching, lasts 150 minutes and links to /tests/mock', () => {
  const plan = makePlan();
  const days = buildSchedule(plan);
  const mockItems = days.flatMap((d) => d.items.filter((i) => i.type === 'mock').map((i) => ({ week: d.weekNumber, item: i })));
  assert.ok(mockItems.length > 0, 'at least one mock exam is scheduled over an 8-week plan');
  for (const { week, item } of mockItems) {
    assert.ok(week === 8, `mock exam must follow teaching, got week ${week}`);
    assert.equal(item.minutes, 150);
    assert.equal(item.href, '/tests/mock');
  }
  // Exactly one per eligible week, never doubled up on the same day.
  const weeks = mockItems.map((m) => m.week);
  assert.equal(new Set(weeks).size, weeks.length, 'at most one mock exam per week');
});

test('markItemsDone ticks a mock exam only for a "mock-" attempt on or after its own scheduled day', () => {
  const plan = makePlan();
  const days = buildSchedule(plan);
  const day = days.find((d) => d.items.some((i) => i.type === 'mock'))!;
  const mockAttempt = (at: string) => [{ at, raw: 30, total: 40, band: 6.5, bandLabel: '6.5', secondsUsed: 100 }];
  const progress = emptyProgress();

  progress.tests['mock-1'] = mockAttempt(`${addDays(day.date, -3)}T09:00:00.000Z`);
  const beforeMarked = markItemsDone(day.items, progress, plan.startDate!);
  assert.equal(beforeMarked.find((i) => i.type === 'mock')!.done, false, 'an attempt before this occurrence is not enough');

  progress.tests['mock-1'] = mockAttempt(`${day.date}T09:00:00.000Z`);
  const onDayMarked = markItemsDone(day.items, progress, plan.startDate!);
  assert.equal(onDayMarked.find((i) => i.type === 'mock')!.done, true, 'an attempt on the scheduled day ticks it');
});

test('getWeekPlan always returns exactly 7 days', () => {
  const plan = makePlan();
  const progress = emptyProgress();
  const week = getWeekPlan(plan, progress, 1);
  assert.equal(week.days.length, 7);
});

test('resolvePlanParams defaults exam date to 8 weeks after start when unset', () => {
  const plan = makePlan({ testDate: '' });
  const params = resolvePlanParams(plan);
  assert.equal(params.examDate, addDays(plan.startDate!, 56));
});

test('isPlannedStudyDay treats every day as a study day unless studyDays is weekdays', () => {
  const saturday = '2026-01-10';
  assert.equal(isPlannedStudyDay(null, saturday), true);
  assert.equal(isPlannedStudyDay({ studyDays: 'daily' } as SavedPlan, saturday), true);
  assert.equal(isPlannedStudyDay({ studyDays: 'weekdays' } as SavedPlan, saturday), false);
});

test('getLast14Days always returns 14 entries ending today', () => {
  const days = getLast14Days(null, new Date(`${START}T12:00:00`));
  assert.equal(days.length, 14);
  assert.equal(days[13]!.date, START);
});

test('getStreak with no activity logged is zero, never negative or throwing', () => {
  assert.equal(getStreak(null, new Date(`${START}T12:00:00`)), 0);
});

test('createDefaultPlan fabricates a usable plan: today as start date, no exam date, 25 min a day, marked defaulted', () => {
  const plan = createDefaultPlan();
  assert.equal(plan.startDate, toLocalDateKey(new Date()), 'start date is today, in local time, not shifted by UTC');
  assert.equal(plan.testDate, '', 'no exam date yet, so the 8-week default pace applies');
  assert.equal(plan.dailyMinutes, 25);
  assert.equal(plan.studyDays, 'daily');
  assert.equal(plan.defaulted, true);
  assert.ok(plan.targetBand, 'falls back to a target band even with no homepage pick to read (band 7.0 in the browser)');
});

test('a fresh store (a brand new student, nothing saved yet) still yields a non-empty Today', () => {
  const plan = createDefaultPlan();
  const progress = emptyProgress();
  const today = getTodayPlan(plan, progress, new Date(`${plan.startDate}T12:00:00`));
  assert.ok(today, 'Today is never null once a plan exists, default or not');
  assert.ok(today!.items.length >= 1 && today!.items.length <= 4, 'Today lists a normal day worth of items immediately, no onboarding form first');
  assert.equal(today!.dayNumber, 1);
});

test('resolvePlanParams on a defaulted plan still falls back to 25 minutes and every day', () => {
  const plan = createDefaultPlan();
  const params = resolvePlanParams(plan);
  assert.equal(params.dailyMinutes, 25);
  assert.equal(params.studyDays, 'daily');
  assert.equal(params.examDate, addDays(plan.startDate!, 56), '8-week default pace when no exam date is set');
});


test('every section starts with its overview and keeps existing completion keys', () => {
  const overviews = { speaking: 'speaking', reading: 'reading-task1', listening: 'listening', writing: 'writing', vocabulary: 'vocabulary' };
  for (const section of buildSections()) assert.equal(section.lessons[0]!.key, overviews[section.skill]);
  const modules = buildCourse();
  const keys = modules.flatMap((m) => m.lessons.map((l) => l.key));
  assert.equal(keys.length, 54);
  assert.equal(new Set(keys).size, 54);
  for (const [before, after] of [['speaking','speaking-part1'], ['speaking-part1','speaking-part2'], ['speaking-part2','speaking-part3'], ['writing-method','writing-charts'], ['writing-task2-method','writing-opinion'], ['reading-paraphrase','reading-tfng'], ['listening-part1','listening-part2'], ['listening-part2','listening-part3'], ['listening-part3','listening-part4']]) {
    assert.ok(keys.indexOf(before!) < keys.indexOf(after!), `${before} must precede ${after}`);
  }
  const progress = emptyProgress();
  progress.lessons['speaking'] = { completedAt: new Date().toISOString() };
  progress.lessons['reading-paraphrase'] = { completedAt: new Date().toISOString() };
  assert.equal(courseStatus(modules, progress).doneLessons, 2);
  assert.equal(courseStatus(modules, progress).next!.key, 'speaking-part1');
});

test('week one teaches Speaking overview before Part 1, with familiar vocabulary only', () => {
  const days = buildSchedule(makePlan()).filter((d) => d.weekNumber === 1);
  const lessons = days.flatMap((d) => d.items.filter((i) => i.type === 'lesson'));
  assert.deepEqual(lessons.map((l) => l.id), buildCourse()[0]!.lessons.map((l) => l.key));
  assert.equal(lessons[0]!.minutes, 8);
  assert.equal(lessons[1]!.minutes, 20);
  assert.ok(days.every((d) => d.focus === 'Start speaking with confidence'));
});

test('all lessons survive different deadlines and study-day preferences in the same order', () => {
  const expected = buildCourse().flatMap((m) => m.lessons.map((l) => l.key));
  for (const length of [6, 14, 28, 56, 90]) for (const studyDays of ['daily','weekdays'] as const) for (const dailyMinutes of [15,25,40,60] as const) {
    const schedule = buildSchedule(makePlan({ testDate: addDays(START,length), studyDays, dailyMinutes }));
    assert.deepEqual(schedule.flatMap((d) => d.items.filter((i) => i.type === 'lesson').map((i) => i.id)), expected, `${length} days, ${studyDays}, ${dailyMinutes} minutes`);
    const taught = new Set<string>();
    for (const day of schedule) for (const item of day.items) {
      if (item.type === 'lesson') taught.add(item.id);
      if (item.type === 'test' || item.type === 'mock' || item.type === 'drill') assert.equal(taught.size, expected.length);
      if (item.type === 'vocab') assert.ok(taught.has(`vocabulary-${item.href.split('topic=')[1]}`));
    }
  }
});
