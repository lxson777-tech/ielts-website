/* The date picker's arithmetic, with no React and no DOM, so
 * tests/date-picker.test.ts can pin it directly.
 *
 * Every date here is a plain local calendar key, yyyy-mm-dd, the same shape
 * the plan stores for an exam date (PlanGoals.examDate.date). Keys are read
 * at UTC midnight internally, which makes every step exactly one calendar
 * day long whatever the student's clock does around daylight saving. No
 * function here ever reads the current time: "today" is always passed in.
 *
 * Weeks start on Monday, in both English and Russian, the way a calendar is
 * read in Kazakhstan.
 */

import { intlLocale as sharedIntlLocale } from '../../lib/i18n/locale';

export type IsoDate = string;

const DAY_MS = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = ISO_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const parsed = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return (
    parsed.getUTCFullYear() === Number(y) && parsed.getUTCMonth() === Number(m) - 1 && parsed.getUTCDate() === Number(d)
  );
}

function toUtc(iso: IsoDate): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function fromUtc(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function isoFromParts(year: number, monthIndex: number, day: number): IsoDate {
  return fromUtc(new Date(Date.UTC(year, monthIndex, day)));
}

export function partsOf(iso: IsoDate): { year: number; monthIndex: number; day: number; weekday: number } {
  const d = toUtc(iso);
  return { year: d.getUTCFullYear(), monthIndex: d.getUTCMonth(), day: d.getUTCDate(), weekday: d.getUTCDay() };
}

export function addDaysIso(iso: IsoDate, days: number): IsoDate {
  return fromUtc(new Date(toUtc(iso).getTime() + days * DAY_MS));
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** The same day of the month `months` months away, pulled back to the last
    day when that month is shorter (31 January + 1 month is 28 or 29
    February, never 3 March). */
export function addMonthsIso(iso: IsoDate, months: number): IsoDate {
  const { year, monthIndex, day } = partsOf(iso);
  const target = new Date(Date.UTC(year, monthIndex + months, 1));
  const y = target.getUTCFullYear();
  const m = target.getUTCMonth();
  return isoFromParts(y, m, Math.min(day, daysInMonth(y, m)));
}

/** Whole days from `from` to `to`, negative when `to` is earlier. */
export function daysFromTo(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / DAY_MS);
}

/** Plain string comparison works for yyyy-mm-dd, and is what this uses. */
export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b;
}

export function clampIso(iso: IsoDate, min?: IsoDate, max?: IsoDate): IsoDate {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

/** Monday = 0 ... Sunday = 6. */
function mondayIndex(weekday: number): number {
  return (weekday + 6) % 7;
}

/** One month as six weeks of seven cells, Monday first. A cell outside the
 *  month is `null`: the grid shows it as an empty square, which keeps the
 *  grid the same height every month (no jump when paging) without offering
 *  a neighbouring month's days as if they belonged to this one. */
export function monthGrid(year: number, monthIndex: number): (IsoDate | null)[][] {
  const first = isoFromParts(year, monthIndex, 1);
  const lead = mondayIndex(partsOf(first).weekday);
  const total = daysInMonth(year, monthIndex);
  const weeks: (IsoDate | null)[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const row: (IsoDate | null)[] = [];
    for (let col = 0; col < 7; col += 1) {
      const dayNumber = week * 7 + col - lead + 1;
      row.push(dayNumber >= 1 && dayNumber <= total ? isoFromParts(year, monthIndex, dayNumber) : null);
    }
    weeks.push(row);
  }
  return weeks;
}

export type CalendarKey =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown';

export const CALENDAR_KEYS: readonly CalendarKey[] = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
];

/** Where the keyboard focus goes from `iso` for one key, the standard
 *  date-grid pattern: arrows move a day or a week, Home and End go to the
 *  start and end of the week, Page Up and Page Down move a month (a year
 *  with Shift). The result is kept inside [min, max], so the focus can never
 *  land on a day the student is not allowed to choose. */
export function moveFocus(iso: IsoDate, key: CalendarKey, opts: { shift?: boolean; min?: IsoDate; max?: IsoDate } = {}): IsoDate {
  let next: IsoDate;
  switch (key) {
    case 'ArrowLeft':
      next = addDaysIso(iso, -1);
      break;
    case 'ArrowRight':
      next = addDaysIso(iso, 1);
      break;
    case 'ArrowUp':
      next = addDaysIso(iso, -7);
      break;
    case 'ArrowDown':
      next = addDaysIso(iso, 7);
      break;
    case 'Home':
      next = addDaysIso(iso, -mondayIndex(partsOf(iso).weekday));
      break;
    case 'End':
      next = addDaysIso(iso, 6 - mondayIndex(partsOf(iso).weekday));
      break;
    case 'PageUp':
      next = addMonthsIso(iso, opts.shift ? -12 : -1);
      break;
    case 'PageDown':
      next = addMonthsIso(iso, opts.shift ? 12 : 1);
      break;
  }
  return clampIso(next, opts.min, opts.max);
}

/** Whether the month before `year/monthIndex` has any day on or after `min`,
    i.e. whether the "previous month" arrow should be offered at all. */
export function hasSelectableBefore(year: number, monthIndex: number, min?: IsoDate): boolean {
  if (!min) return true;
  const lastOfPrevious = isoFromParts(year, monthIndex, 0);
  return lastOfPrevious >= min;
}

export function hasSelectableAfter(year: number, monthIndex: number, max?: IsoDate): boolean {
  if (!max) return true;
  const firstOfNext = isoFromParts(year, monthIndex + 1, 1);
  return firstOfNext <= max;
}

/* ── Words ─────────────────────────────────────────────────────────────────
   Month and weekday names come from Intl.DateTimeFormat in the site's own
   language rather than from the dictionary: the browser already knows both
   languages' calendars, including Russian's two month forms ("декабрь" on
   its own, "3 декабря" in a date). Every formatter is pinned to UTC because
   the keys above are UTC midnights. */

export type CalendarLocale = 'en' | 'ru' | 'kk';

function intlLocale(locale: CalendarLocale): string {
  /* en-GB, not en-US: "3 December 2026", day first, the way Alex's students
     write a date. Kazakh uses kk-KZ where the browser has it. */
  return sharedIntlLocale(locale, 'en-GB');
}

function capitalise(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text;
}

/** "December 2026" / "Декабрь 2026". Russian Intl would write
    "декабрь 2026 г." for month-and-year, so the title is assembled from the
    standalone month name and the year instead. */
export function monthTitle(year: number, monthIndex: number, locale: CalendarLocale): string {
  const month = new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  );
  return `${capitalise(month)} ${year}`;
}

/** Seven short weekday names, Monday first: "Mon".."Sun" / "Пн".."Вс". */
export function weekdayNames(locale: CalendarLocale, style: 'short' | 'long' = 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { weekday: style, timeZone: 'UTC' });
  /* 2024-01-01 was a Monday. */
  return Array.from({ length: 7 }, (_, i) => capitalise(fmt.format(new Date(Date.UTC(2024, 0, 1 + i)))));
}

/** The name of one weekday by its JavaScript number (0 is Sunday). */
export function weekdayName(weekday: number, locale: CalendarLocale, style: 'short' | 'long' = 'short'): string {
  return weekdayNames(locale, style)[mondayIndex(weekday)] ?? '';
}

/** "Thursday, 3 December 2026" / "Четверг, 3 декабря 2026 г." */
export function formatLongDate(iso: IsoDate, locale: CalendarLocale): string {
  const text = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toUtc(iso));
  return capitalise(text);
}

/** "3 December", with the year only when it is not `todayIso`'s year. */
export function formatShortDate(iso: IsoDate, locale: CalendarLocale, todayIso?: IsoDate): string {
  const sameYear = todayIso ? partsOf(iso).year === partsOf(todayIso).year : false;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(toUtc(iso));
}
