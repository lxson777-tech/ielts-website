/* The date picker's arithmetic (src/components/plan/calendar.ts), with no
 * browser: the month grid, keyboard movement, month paging, the limits on
 * which days can be chosen, and the English and Russian words for dates.
 * The picker component itself is driven in a real browser by
 * tests/browser/i01_intake_redo.py.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addDaysIso,
  addMonthsIso,
  clampIso,
  daysFromTo,
  formatLongDate,
  formatShortDate,
  hasSelectableAfter,
  hasSelectableBefore,
  isIsoDate,
  monthGrid,
  monthTitle,
  moveFocus,
  weekdayName,
  weekdayNames,
} from '../src/components/plan/calendar.ts';

/* ── The grid ────────────────────────────────────────────────────────────── */

test('a month is six Monday-first weeks, with empty cells outside the month', () => {
  /* 1 September 2026 is a Tuesday. */
  const grid = monthGrid(2026, 8);
  assert.equal(grid.length, 6);
  assert.ok(grid.every((week) => week.length === 7));
  assert.deepEqual(grid[0].slice(0, 3), [null, '2026-09-01', '2026-09-02']);
  const days = grid.flat().filter(Boolean);
  assert.equal(days.length, 30);
  assert.equal(days[0], '2026-09-01');
  assert.equal(days.at(-1), '2026-09-30');
  /* 30 September 2026 is a Wednesday: third column. */
  assert.equal(grid[4][2], '2026-09-30');
});

test('February has 28 days, or 29 in a leap year; a month starting on Monday has no leading gap', () => {
  assert.equal(monthGrid(2027, 1).flat().filter(Boolean).length, 28);
  assert.equal(monthGrid(2028, 1).flat().filter(Boolean).length, 29);
  /* 1 February 2027 is a Monday. */
  assert.equal(monthGrid(2027, 1)[0][0], '2027-02-01');
  /* 1 November 2026 is a Sunday: the last column of the first week. */
  assert.deepEqual(monthGrid(2026, 10)[0], [null, null, null, null, null, null, '2026-11-01']);
});

/* ── Dates ───────────────────────────────────────────────────────────────── */

test('only real calendar dates are accepted', () => {
  assert.equal(isIsoDate('2026-12-03'), true);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('2026-13-01'), false);
  assert.equal(isIsoDate('3 December'), false);
  assert.equal(isIsoDate(''), false);
});

test('adding days and counting days are exact calendar days, including across a year and a leap day', () => {
  assert.equal(addDaysIso('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysIso('2028-02-28', 1), '2028-02-29');
  assert.equal(addDaysIso('2026-03-01', -1), '2026-02-28');
  assert.equal(daysFromTo('2026-09-24', '2026-12-03'), 70);
  assert.equal(daysFromTo('2026-12-03', '2026-09-24'), -70);
});

test('a month later keeps the day, or falls back to the last day of a shorter month', () => {
  assert.equal(addMonthsIso('2026-09-24', 1), '2026-10-24');
  assert.equal(addMonthsIso('2027-01-31', 1), '2027-02-28');
  assert.equal(addMonthsIso('2028-01-31', 1), '2028-02-29');
  assert.equal(addMonthsIso('2026-12-15', 1), '2027-01-15');
  assert.equal(addMonthsIso('2026-03-31', -1), '2026-02-28');
  assert.equal(addMonthsIso('2026-09-24', 12), '2027-09-24');
});

/* ── Keyboard ────────────────────────────────────────────────────────────── */

test('arrows move a day or a week, Home and End go to Monday and Sunday', () => {
  const from = '2026-09-24'; // a Thursday
  assert.equal(moveFocus(from, 'ArrowRight'), '2026-09-25');
  assert.equal(moveFocus(from, 'ArrowLeft'), '2026-09-23');
  assert.equal(moveFocus(from, 'ArrowDown'), '2026-10-01');
  assert.equal(moveFocus(from, 'ArrowUp'), '2026-09-17');
  assert.equal(moveFocus(from, 'Home'), '2026-09-21');
  assert.equal(moveFocus(from, 'End'), '2026-09-27');
  assert.equal(moveFocus('2026-09-27', 'Home'), '2026-09-21', 'Sunday belongs to the week that started on Monday');
});

test('Page Up and Page Down move a month, with Shift a year', () => {
  assert.equal(moveFocus('2026-09-24', 'PageDown'), '2026-10-24');
  assert.equal(moveFocus('2026-09-24', 'PageUp'), '2026-08-24');
  assert.equal(moveFocus('2026-09-24', 'PageDown', { shift: true }), '2027-09-24');
  assert.equal(moveFocus('2027-01-31', 'PageDown'), '2027-02-28');
});

test('the focus never lands before the earliest allowed day or after the latest', () => {
  const min = '2026-09-24';
  assert.equal(moveFocus('2026-09-24', 'ArrowLeft', { min }), min);
  assert.equal(moveFocus('2026-09-26', 'ArrowUp', { min }), min);
  assert.equal(moveFocus('2026-10-10', 'PageUp', { min }), min);
  const max = '2026-09-24';
  assert.equal(moveFocus('2026-09-24', 'ArrowRight', { max }), max);
  assert.equal(clampIso('2027-01-01', min, '2026-12-31'), '2026-12-31');
});

test('the month arrows are offered only when that month has a day that can be chosen', () => {
  assert.equal(hasSelectableBefore(2026, 8, '2026-09-24'), false, 'no going back past this month when past days are off');
  assert.equal(hasSelectableBefore(2026, 9, '2026-09-24'), true);
  assert.equal(hasSelectableBefore(2026, 8), true, 'no lower limit');
  assert.equal(hasSelectableAfter(2026, 8, '2026-09-24'), false, 'a score date cannot be in the future');
  assert.equal(hasSelectableAfter(2026, 7, '2026-09-24'), true);
});

/* ── Words, in both languages ────────────────────────────────────────────── */

test('dates are written in words, day first, in English and in Russian', () => {
  assert.equal(formatLongDate('2026-12-03', 'en'), 'Thursday, 3 December 2026');
  const ru = formatLongDate('2026-12-03', 'ru');
  assert.match(ru, /^Четверг, 3 декабря 2026/);
  assert.equal(formatShortDate('2026-12-03', 'en', '2026-09-24'), '3 December', 'no year when it is this year');
  assert.equal(formatShortDate('2027-01-15', 'en', '2026-09-24'), '15 January 2027');
  assert.equal(formatShortDate('2026-12-03', 'ru', '2026-09-24'), '3 декабря');
});

test('month titles use the standalone month name, capitalised, with no "г." in Russian', () => {
  assert.equal(monthTitle(2026, 11, 'en'), 'December 2026');
  assert.equal(monthTitle(2026, 11, 'ru'), 'Декабрь 2026');
  assert.equal(monthTitle(2027, 0, 'ru'), 'Январь 2027');
});

test('weekday names start on Monday in both languages', () => {
  assert.deepEqual(weekdayNames('en'), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const ru = weekdayNames('ru');
  assert.equal(ru.length, 7);
  assert.equal(ru[0], 'Пн');
  assert.equal(ru[6], 'Вс');
  assert.equal(weekdayName(0, 'en', 'long'), 'Sunday');
  assert.equal(weekdayName(1, 'ru', 'long'), 'Понедельник');
});
