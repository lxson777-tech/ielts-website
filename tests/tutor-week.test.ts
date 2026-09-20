/* Tests for the weekly review's counting layer. The one property that matters
   more than any other: nothing here is inferred, so every count is checked
   against a hand-built ProgressV1 fixture with a known answer, and every
   date placement is checked against a real, verified day-of-week rather than
   assumed. See src/lib/tutor/week.ts for why `now` and the student's UTC
   offset are always explicit parameters. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localDateKey,
  weekWindowFor,
  previousWeek,
  readWeek,
  reviewTarget,
  weekFingerprint,
  weekFallbackText,
  type WeekWindow,
} from '../src/lib/tutor/week.ts';
import type { ProgressV1 } from '../src/lib/progress.ts';
import type { SavedPlan } from '../src/lib/study-plan.ts';

/* Verified with `new Date('2026-09-DDT00:00:00Z').getUTCDay()`:
   2026-09-07 Mon, 2026-09-13 Sun, 2026-09-14 Mon, 2026-09-16 Wed,
   2026-09-20 Sun, 2026-09-21 Mon, 2026-09-27 Sun. */
const WEEK: WeekWindow = { start: '2026-09-14', end: '2026-09-20' };
const PREV_WEEK: WeekWindow = { start: '2026-09-07', end: '2026-09-13' };

function emptyProgress(): ProgressV1 {
  return { version: 1, lessons: {}, tests: {}, writing: {}, speaking: [], activity: {} };
}

function plan(overrides: Partial<SavedPlan> = {}): SavedPlan {
  return {
    targetBand: '7.0',
    testDate: '',
    createdAt: '2026-09-01T10:00:00.000Z',
    done: [],
    ...overrides,
  };
}

/* ── Week windows ─────────────────────────────────────────────────────── */

test('weekWindowFor gives the same Monday-to-Sunday window for a Monday, a Sunday and a midweek day', () => {
  const monday = weekWindowFor(new Date('2026-09-14T10:00:00Z'), 0);
  const wednesday = weekWindowFor(new Date('2026-09-16T10:00:00Z'), 0);
  const sunday = weekWindowFor(new Date('2026-09-20T10:00:00Z'), 0);
  assert.deepEqual(monday, WEEK);
  assert.deepEqual(wednesday, WEEK);
  assert.deepEqual(sunday, WEEK);
});

test('an instant at Sunday 21:00 UTC lands in the new week for a student at +300 minutes', () => {
  const instant = new Date('2026-09-20T21:00:00Z');
  // For a UTC student this is still Sunday the 20th, the last day of WEEK.
  const utcWindow = weekWindowFor(instant, 0);
  assert.deepEqual(utcWindow, WEEK);

  // Add 5 hours (UTC+5) and it's already 02:00 on Monday the 21st: a new week.
  assert.equal(localDateKey(instant, 300), '2026-09-21');
  const studentWindow = weekWindowFor(instant, 300);
  assert.equal(studentWindow.start, '2026-09-21');
  assert.equal(studentWindow.end, '2026-09-27');
  assert.notDeepEqual(studentWindow, utcWindow);
});

test('previousWeek steps back exactly seven days on both ends', () => {
  assert.deepEqual(previousWeek(WEEK), PREV_WEEK);
});

/* ── Counting ─────────────────────────────────────────────────────────── */

test('a weekdays-only plan counts 5 planned days in a full calendar week', () => {
  const facts = readWeek(emptyProgress(), plan({ studyDays: 'weekdays' }), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  assert.equal(facts.plannedDays, 5);
  assert.equal(facts.goalMinutes, 5 * 25);
});

test('a daily plan (or no plan) counts all 7 days as planned', () => {
  const withPlan = readWeek(emptyProgress(), plan({ studyDays: 'daily' }), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  const withoutPlan = readWeek(emptyProgress(), null, WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  assert.equal(withPlan.plannedDays, 7);
  assert.equal(withoutPlan.plannedDays, 7);
});

test('minutes and active days are counted only inside the window', () => {
  const progress = emptyProgress();
  progress.activity = {
    '2026-09-13': { minutes: 30, lessons: 1, attempts: 0 }, // the day before the window
    '2026-09-14': { minutes: 20, lessons: 1, attempts: 0 }, // inside
    '2026-09-18': { minutes: 15, lessons: 0, attempts: 1 }, // inside
    '2026-09-21': { minutes: 40, lessons: 1, attempts: 0 }, // the day after the window
  };
  const facts = readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  assert.equal(facts.activeDays, 2);
  assert.equal(facts.minutes, 35);
});

test('a lesson is placed by its local completion date, not its raw UTC instant', () => {
  const progress = emptyProgress();
  // 2026-09-13T21:00:00Z is Sunday in UTC (the day before WEEK) but Monday
  // the 14th (inside WEEK) for a student five hours ahead.
  progress.lessons['reading-tfng'] = { completedAt: '2026-09-13T21:00:00.000Z' };
  const atUtc = readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  const atOffset = readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 300);
  assert.equal(atUtc.lessons.length, 0);
  assert.equal(atOffset.lessons.length, 1);
  assert.equal(atOffset.lessons[0]?.key, 'reading-tfng');
});

test('an unknown lesson key falls back to the key itself rather than throwing', () => {
  const progress = emptyProgress();
  progress.lessons['not-a-real-lesson'] = { completedAt: '2026-09-15T10:00:00.000Z' };
  const facts = readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  assert.equal(facts.lessons[0]?.title, 'not-a-real-lesson');
});

test('test, writing and speaking attempts are all placed by local date and carry the right detail', () => {
  const progress = emptyProgress();
  progress.tests['t'] = [
    { at: '2026-09-15T10:00:00.000Z', raw: 26, total: 40, band: 6.5, bandLabel: '6.5', secondsUsed: 3000, kind: 'full', skill: 'reading' },
  ];
  progress.writing['w'] = [
    { at: '2026-09-16T10:00:00.000Z', overallBand: 6, criteria: {}, wordCount: 260, live: true, promptTitle: 'Remote work' },
  ];
  progress.speaking = [
    { at: '2026-09-17T10:00:00.000Z', mode: 'part1', topic: 'Hometown', overallBand: 6.5, criteria: {}, live: true },
  ];
  const facts = readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  assert.equal(facts.attempts.length, 3);
  const [reading, writing, speaking] = facts.attempts;
  assert.equal(reading?.detail, '26 of 40');
  assert.equal(writing?.detail, 'Remote work');
  assert.equal(speaking?.detail, 'Hometown');
  assert.equal(reading?.drill, false);
});

test('a reading attempt with no skill field is treated as reading, matching progress.ts convention', () => {
  const progress = emptyProgress();
  progress.tests['t'] = [
    { at: '2026-09-15T10:00:00.000Z', raw: 10, total: 40, band: 5, bandLabel: '5', secondsUsed: 1000, kind: 'full' },
  ];
  const facts = readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  assert.equal(facts.attempts[0]?.skill, 'reading');
});

/* ── Band moves ───────────────────────────────────────────────────────── */

test('a drill is flagged and never produces a bandMove on its own', () => {
  const progress = emptyProgress();
  progress.tests['drill'] = [
    { at: '2026-09-15T10:00:00.000Z', raw: 3, total: 10, band: 4, bandLabel: '4', secondsUsed: 600, kind: 'drill', skill: 'reading' },
  ];
  const facts = readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  assert.equal(facts.attempts[0]?.drill, true);
  assert.equal(facts.bandMoves.length, 0, 'a drill alone is not evidence of a band');
});

test('bandMoves report the latest full band in the window and the latest full band before it', () => {
  const progress = emptyProgress();
  progress.tests['t'] = [
    { at: '2026-09-05T10:00:00.000Z', raw: 20, total: 40, band: 6, bandLabel: '6', secondsUsed: 3000, kind: 'full', skill: 'reading' }, // before the window
    { at: '2026-09-15T10:00:00.000Z', raw: 22, total: 40, band: 6.5, bandLabel: '6.5', secondsUsed: 3000, kind: 'full', skill: 'reading' }, // inside
    { at: '2026-09-18T10:00:00.000Z', raw: 24, total: 40, band: 7, bandLabel: '7', secondsUsed: 3000, kind: 'full', skill: 'reading' }, // also inside, later
    { at: '2026-09-16T10:00:00.000Z', raw: 5, total: 10, band: 4, bandLabel: '4', secondsUsed: 600, kind: 'drill', skill: 'reading' }, // drill, ignored
  ];
  const facts = readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  const move = facts.bandMoves.find((m) => m.skill === 'reading');
  assert.ok(move);
  assert.equal(move.before, 6);
  assert.equal(move.after, 7, 'the latest full attempt in the window wins, not the first');
});

test('a skill with no full result inside the window gets no bandMove at all', () => {
  const progress = emptyProgress();
  progress.tests['t'] = [
    { at: '2026-09-05T10:00:00.000Z', raw: 20, total: 40, band: 6, bandLabel: '6', secondsUsed: 3000, kind: 'full', skill: 'reading' },
  ];
  const facts = readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  assert.equal(facts.bandMoves.length, 0);
});

/* ── Complete ─────────────────────────────────────────────────────────── */

test('a week entirely in the past is complete; the week containing `now` is not', () => {
  const past = readWeek(emptyProgress(), plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  const current = readWeek(emptyProgress(), plan(), WEEK, new Date('2026-09-16T10:00:00Z'), 0);
  assert.equal(past.complete, true);
  assert.equal(current.complete, false);
});

/* ── Review target ────────────────────────────────────────────────────── */

test('reviewTarget picks last week when it has activity', () => {
  const now = new Date('2026-09-16T10:00:00Z'); // inside WEEK
  const lastWeek = previousWeek(weekWindowFor(now, 0)); // PREV_WEEK
  const progress = emptyProgress();
  progress.activity = { [lastWeek.start]: { minutes: 20, lessons: 1, attempts: 0 } };
  const result = reviewTarget(progress, plan(), now, 0);
  assert.equal(result.mode, 'last-week');
  assert.deepEqual(result.window, lastWeek);
});

test('reviewTarget falls back to this week when last week is empty but this week has activity', () => {
  const now = new Date('2026-09-16T10:00:00Z');
  const thisWeek = weekWindowFor(now, 0);
  const progress = emptyProgress();
  progress.activity = { [thisWeek.start]: { minutes: 15, lessons: 0, attempts: 1 } };
  const result = reviewTarget(progress, plan(), now, 0);
  assert.equal(result.mode, 'this-week');
  assert.deepEqual(result.window, thisWeek);
});

test('reviewTarget is "none" when neither week has anything recorded', () => {
  const result = reviewTarget(emptyProgress(), plan(), new Date('2026-09-16T10:00:00Z'), 0);
  assert.equal(result.mode, 'none');
});

/* ── Fingerprint ──────────────────────────────────────────────────────── */

test('the fingerprint is identical for the same facts at two different `now` values', () => {
  const progress = emptyProgress();
  progress.activity = { '2026-09-15': { minutes: 20, lessons: 1, attempts: 0 } };
  const a = weekFingerprint(readWeek(progress, plan(), WEEK, new Date('2026-09-25T08:00:00Z'), 0));
  const b = weekFingerprint(readWeek(progress, plan(), WEEK, new Date('2026-09-25T22:00:00Z'), 0));
  assert.equal(a, b);
});

test('the fingerprint changes once a new lesson is recorded in the window', () => {
  const progress = emptyProgress();
  const a = weekFingerprint(readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0));
  progress.lessons['reading-tfng'] = { completedAt: '2026-09-15T10:00:00.000Z' };
  const b = weekFingerprint(readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0));
  assert.notEqual(a, b);
});

/* ── Fallback text ────────────────────────────────────────────────────── */

function hasEmOrEnDash(text: string): boolean {
  return text.includes('—') || text.includes('–');
}

test('an empty week gets a plain, kind message and no dashes', () => {
  const facts = readWeek(emptyProgress(), plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  const text = weekFallbackText(facts);
  assert.match(text, /[Nn]o study activity/);
  assert.equal(hasEmOrEnDash(text), false);
});

test('a busy week states counted facts with correct singular and plural wording', () => {
  const progress = emptyProgress();
  progress.activity = {
    '2026-09-14': { minutes: 20, lessons: 1, attempts: 0 },
    '2026-09-16': { minutes: 30, lessons: 0, attempts: 1 },
  };
  progress.lessons['reading-tfng'] = { completedAt: '2026-09-14T10:00:00.000Z' };
  progress.tests['t'] = [
    { at: '2026-09-05T10:00:00.000Z', raw: 20, total: 40, band: 6, bandLabel: '6', secondsUsed: 3000, kind: 'full', skill: 'reading' },
    { at: '2026-09-16T10:00:00.000Z', raw: 24, total: 40, band: 7, bandLabel: '7', secondsUsed: 3000, kind: 'full', skill: 'reading' },
  ];
  const facts = readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  const text = weekFallbackText(facts);

  assert.match(text, /2 days/);
  assert.match(text, /1 lesson\b/);
  assert.doesNotMatch(text, /1 lessons/);
  assert.match(text, /1 practice attempt\b/);
  assert.doesNotMatch(text, /1 practice attempts/);
  assert.match(text, /estimated Reading band this week is 7/);
  assert.match(text, /estimated 6/);
  assert.equal(hasEmOrEnDash(text), false);
});

test('plural wording is correct for more than one lesson and attempt', () => {
  const progress = emptyProgress();
  progress.lessons['a'] = { completedAt: '2026-09-14T10:00:00.000Z' };
  progress.lessons['b'] = { completedAt: '2026-09-15T10:00:00.000Z' };
  progress.tests['t'] = [
    { at: '2026-09-16T10:00:00.000Z', raw: 20, total: 40, band: 6, bandLabel: '6', secondsUsed: 3000, kind: 'full', skill: 'reading' },
    { at: '2026-09-17T10:00:00.000Z', raw: 22, total: 40, band: 6.5, bandLabel: '6.5', secondsUsed: 3000, kind: 'full', skill: 'listening' },
  ];
  const facts = readWeek(progress, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
  const text = weekFallbackText(facts);
  assert.match(text, /2 lessons/);
  assert.match(text, /2 practice attempts/);
});

/* ── Sparse data ──────────────────────────────────────────────────────── */

test('a sparse progress blob with missing activity and speaking does not throw', () => {
  const sparse = { version: 1, lessons: {}, tests: {} } as unknown as ProgressV1;
  assert.doesNotThrow(() => {
    const facts = readWeek(sparse, plan(), WEEK, new Date('2026-09-25T10:00:00Z'), 0);
    weekFallbackText(facts);
    weekFingerprint(facts);
    reviewTarget(sparse, plan(), new Date('2026-09-25T10:00:00Z'), 0);
  });
});

test('a sparse progress blob with no plan at all does not throw', () => {
  assert.doesNotThrow(() => readWeek(emptyProgress(), null, WEEK, new Date('2026-09-25T10:00:00Z'), 0));
});
