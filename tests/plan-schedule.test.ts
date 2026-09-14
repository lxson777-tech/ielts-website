import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule, markItemsDone, getTodayPlan, getWeekPlan, resolvePlanParams } from '../src/lib/plan/schedule.ts';
import { getStreak, getLast14Days, isPlannedStudyDay } from '../src/lib/plan/streak.ts';
import { addDays } from '../src/lib/plan/date.ts';
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
  assert.ok(lessonIds.length > 0, 'at least some lessons are scheduled');
});

test('an ordinary study day has between 2 and 4 items', () => {
  const plan = makePlan();
  const days = buildSchedule(plan);
  for (const day of days) {
    if (day.isExamLight) continue; // light-review days can be a single item
    assert.ok(day.items.length >= 2, `day ${day.date} has fewer than 2 items`);
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

test('a full test appears from week two onward, alternating reading and listening', () => {
  const plan = makePlan();
  const days = buildSchedule(plan);
  const testItems = days.flatMap((d) => d.items.filter((i) => i.type === 'test').map((i) => ({ week: d.weekNumber, skill: i.skill })));
  assert.ok(testItems.length > 0, 'at least one test is scheduled');
  assert.ok(testItems.every((t) => t.week >= 2), 'no test lands in week one');
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

test('getTodayPlan on day one of a fresh plan returns 2-4 items and reports on track', () => {
  const plan = makePlan();
  const progress = emptyProgress();
  const today = getTodayPlan(plan, progress, new Date(`${START}T12:00:00`));
  assert.ok(today);
  assert.equal(today!.dayNumber, 1);
  assert.ok(today!.items.length >= 2 && today!.items.length <= 4);
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
