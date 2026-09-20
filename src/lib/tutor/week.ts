/* Mr EZ's weekly review, counted rather than guessed.

   Same discipline as insights.ts: a language model writes sentences, it never
   decides what happened. Every number here comes from progress.activity,
   progress.tests, progress.writing and progress.speaking, counted against a
   fixed Monday-to-Sunday calendar week. The model is handed WeekFacts and
   told to word it; weekFallbackText is what the student sees when no model
   answers, so it has to be honest and complete on its own.

   Pure functions over a ProgressV1 blob and a SavedPlan — no localStorage, no
   `window`, no hidden Date.now() — because the same code runs in the browser
   and in the Cloudflare Worker (workers/mr-ez). `now` is always a parameter.

   Time zones: the Worker runs in UTC, students are in UTC+5, and
   progress.activity's keys are already the student's LOCAL calendar date.
   Every conversion from an instant (an ISO string like `completedAt` or `at`)
   to a calendar date goes through localDateKey(), which shifts the instant
   by the student's offset and then reads UTC fields off the shifted value —
   never the machine's own local getters. That is also why the internal
   helpers below only ever call the getUTC-prefixed getters (or setUTCDate)
   on Dates: a stray getDate() would silently reintroduce the machine's own
   time zone. */

import type { ProgressV1 } from '../progress';
import type { SavedPlan, PlanSkill } from '../study-plan';
import { PLAN_SKILLS } from '../study-plan';
import { buildCourse } from '../course';

/* ── Week windows ─────────────────────────────────────────────────────── */

/** Monday to Sunday inclusive, as local date keys. */
export interface WeekWindow {
  start: string;
  end: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD read off a Date's UTC fields. Only ever called on a Date that
    already represents the value we want in its UTC fields — either an
    instant shifted by the student's offset, or a pure calendar date built
    with Date.UTC — never on a raw instant or the machine's own clock. */
function dateKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** An instant shifted so that reading its UTC fields gives the student's
    local wall-clock values, without ever touching the machine's own time
    zone (which is what Date's plain getters would use). */
function shiftedDate(instant: Date, offsetMinutes: number): Date {
  return new Date(instant.getTime() + offsetMinutes * 60_000);
}

/** Local calendar date (YYYY-MM-DD) of an instant, for a student whose clock
    is `offsetMinutes` east of UTC. */
export function localDateKey(instant: Date, offsetMinutes: number): string {
  return dateKeyOf(shiftedDate(instant, offsetMinutes));
}

/** The Monday-to-Sunday calendar week containing `now` in the student's
    local time. */
export function weekWindowFor(now: Date, offsetMinutes: number): WeekWindow {
  const local = shiftedDate(now, offsetMinutes);
  const dow = local.getUTCDay(); // 0 = Sunday .. 6 = Saturday, in local time
  // Days to walk back from `local` to reach this week's Monday. Sunday (0)
  // is 6 days after Monday; every other day is (dow - 1) days after it.
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(local);
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { start: dateKeyOf(monday), end: dateKeyOf(sunday) };
}

/** A YYYY-MM-DD key parsed as a plain calendar date. This is pure date-key
    arithmetic (no instant, no offset), so Date.UTC is safe and carries no
    time-zone ambiguity. */
function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function previousWeek(window: WeekWindow): WeekWindow {
  const start = keyToDate(window.start);
  start.setUTCDate(start.getUTCDate() - 7);
  const end = keyToDate(window.end);
  end.setUTCDate(end.getUTCDate() - 7);
  return { start: dateKeyOf(start), end: dateKeyOf(end) };
}

function inWindow(dateKey: string, window: WeekWindow): boolean {
  return dateKey >= window.start && dateKey <= window.end;
}

/* ── Facts ────────────────────────────────────────────────────────────── */

export interface WeekLesson {
  key: string;
  title: string;
  completedAt: string;
}

export interface WeekAttempt {
  skill: PlanSkill;
  at: string; // ISO instant
  band: number; // estimated band
  /** true for a single-passage drill (TestAttempt.kind === 'drill') */
  drill: boolean;
  /** e.g. '26 of 40' for tests, the prompt title for writing, the topic for speaking */
  detail: string;
}

export interface BandMove {
  skill: PlanSkill;
  before: number | null;
  after: number;
}

export interface WeekFacts {
  window: WeekWindow;
  /** True when the whole window is in the past (window.end is before today's
      local date). */
  complete: boolean;
  /** Days in the window with any recorded activity. */
  activeDays: number;
  /** Days in the window that count as study days under plan.studyDays
      ('weekdays' = Mon to Fri only; default every day). */
  plannedDays: number;
  /** Sum of activity minutes in the window. */
  minutes: number;
  /** plannedDays * (plan.dailyMinutes ?? 25) */
  goalMinutes: number;
  /** Lessons whose completedAt falls in the window, oldest first. */
  lessons: WeekLesson[];
  /** Every test, drill, essay and speaking attempt in the window, oldest first. */
  attempts: WeekAttempt[];
  /** The same counts for the week before, for an honest comparison. */
  previous: { activeDays: number; minutes: number; lessons: number; attempts: number };
  /** Only for skills with a FULL (non-drill) result inside the window: the
      latest band inside the window (`after`) and the latest full band before
      the window started (`before`, null when there was none). */
  bandMoves: BandMove[];
  /** True when nothing at all was recorded in the window. */
  empty: boolean;
}

/** Build the lesson-key to title map once per call from the live curriculum,
    rather than hand-maintaining a second copy of it here. Falls back to the
    key itself for a lesson that no longer exists in the course (renamed or
    removed) so a past week's review never throws over stale data. */
function lessonTitles(): Map<string, string> {
  const map = new Map<string, string>();
  for (const module of buildCourse()) {
    for (const lesson of module.lessons) map.set(lesson.key, lesson.title);
  }
  return map;
}

function weekActivity(progress: ProgressV1, window: WeekWindow): { activeDays: number; minutes: number } {
  const activity = progress.activity ?? {};
  let activeDays = 0;
  let minutes = 0;
  for (const [key, row] of Object.entries(activity)) {
    if (!inWindow(key, window)) continue;
    if (row.minutes > 0 || row.lessons > 0 || row.attempts > 0) activeDays += 1;
    minutes += row.minutes ?? 0;
  }
  return { activeDays, minutes };
}

function isStudyDay(d: Date, studyDays: SavedPlan['studyDays']): boolean {
  if (studyDays !== 'weekdays') return true;
  const dow = d.getUTCDay();
  return dow >= 1 && dow <= 5;
}

function plannedDaysIn(window: WeekWindow, studyDays: SavedPlan['studyDays']): number {
  let count = 0;
  const cursor = keyToDate(window.start);
  const end = keyToDate(window.end).getTime();
  while (cursor.getTime() <= end) {
    if (isStudyDay(cursor, studyDays)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function weekLessons(
  progress: ProgressV1,
  window: WeekWindow,
  offsetMinutes: number,
  titles: Map<string, string>,
): WeekLesson[] {
  const out: WeekLesson[] = [];
  for (const [key, v] of Object.entries(progress.lessons ?? {})) {
    if (!inWindow(localDateKey(new Date(v.completedAt), offsetMinutes), window)) continue;
    out.push({ key, title: titles.get(key) ?? key, completedAt: v.completedAt });
  }
  return out.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

function weekAttempts(progress: ProgressV1, window: WeekWindow, offsetMinutes: number): WeekAttempt[] {
  const out: WeekAttempt[] = [];

  for (const attempts of Object.values(progress.tests ?? {})) {
    for (const a of attempts) {
      if (!inWindow(localDateKey(new Date(a.at), offsetMinutes), window)) continue;
      out.push({
        skill: (a.skill ?? 'reading') as PlanSkill,
        at: a.at,
        band: a.band,
        drill: a.kind === 'drill',
        detail: `${a.raw} of ${a.total}`,
      });
    }
  }

  for (const attempts of Object.values(progress.writing ?? {})) {
    for (const a of attempts) {
      if (!inWindow(localDateKey(new Date(a.at), offsetMinutes), window)) continue;
      out.push({
        skill: 'writing',
        at: a.at,
        band: a.overallBand,
        drill: false,
        detail: a.promptTitle || 'Essay',
      });
    }
  }

  for (const a of progress.speaking ?? []) {
    if (!inWindow(localDateKey(new Date(a.at), offsetMinutes), window)) continue;
    out.push({
      skill: 'speaking',
      at: a.at,
      band: a.overallBand,
      drill: false,
      detail: a.topic,
    });
  }

  return out.sort((a, b) => a.at.localeCompare(b.at));
}

interface BandPoint {
  at: string;
  band: number;
}

/** Every FULL (non-drill) graded result for one paper, oldest first. A drill
    is real evidence about a question type (see insights.ts) but not about a
    band, so it never enters a bandMove. */
function fullBandPoints(progress: ProgressV1, skill: PlanSkill): BandPoint[] {
  if (skill === 'reading' || skill === 'listening') {
    return Object.values(progress.tests ?? {})
      .flat()
      .filter((a) => (a.skill ?? 'reading') === skill && a.kind !== 'drill')
      .map((a) => ({ at: a.at, band: a.band }))
      .sort((a, b) => a.at.localeCompare(b.at));
  }
  if (skill === 'writing') {
    return Object.values(progress.writing ?? {})
      .flat()
      .map((a) => ({ at: a.at, band: a.overallBand }))
      .sort((a, b) => a.at.localeCompare(b.at));
  }
  return [...(progress.speaking ?? [])]
    .map((a) => ({ at: a.at, band: a.overallBand }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

function bandMovesFor(progress: ProgressV1, window: WeekWindow, offsetMinutes: number): BandMove[] {
  const moves: BandMove[] = [];
  for (const skill of PLAN_SKILLS) {
    const points = fullBandPoints(progress, skill);
    const inWin = points.filter((p) => inWindow(localDateKey(new Date(p.at), offsetMinutes), window));
    if (inWin.length === 0) continue; // no result this skill can honestly move on
    const before = points.filter((p) => localDateKey(new Date(p.at), offsetMinutes) < window.start);
    moves.push({
      skill,
      before: before.length ? before[before.length - 1]!.band : null,
      after: inWin[inWin.length - 1]!.band,
    });
  }
  return moves;
}

export function readWeek(
  progress: ProgressV1,
  plan: SavedPlan | null,
  window: WeekWindow,
  now: Date,
  offsetMinutes: number,
): WeekFacts {
  const today = localDateKey(now, offsetMinutes);
  const complete = window.end < today;

  const { activeDays, minutes } = weekActivity(progress, window);
  const plannedDays = plannedDaysIn(window, plan?.studyDays);
  const goalMinutes = plannedDays * (plan?.dailyMinutes ?? 25);

  const titles = lessonTitles();
  const lessons = weekLessons(progress, window, offsetMinutes, titles);
  const attempts = weekAttempts(progress, window, offsetMinutes);
  const bandMoves = bandMovesFor(progress, window, offsetMinutes);

  const prevWindow = previousWeek(window);
  const prevActivity = weekActivity(progress, prevWindow);
  const prevLessons = weekLessons(progress, prevWindow, offsetMinutes, titles).length;
  const prevAttempts = weekAttempts(progress, prevWindow, offsetMinutes).length;

  const empty = activeDays === 0 && lessons.length === 0 && attempts.length === 0;

  return {
    window,
    complete,
    activeDays,
    plannedDays,
    minutes,
    goalMinutes,
    lessons,
    attempts,
    previous: {
      activeDays: prevActivity.activeDays,
      minutes: prevActivity.minutes,
      lessons: prevLessons,
      attempts: prevAttempts,
    },
    bandMoves,
    empty,
  };
}

/** Which week the review should be about: last week if there is anything to
    say about it (a completed week is the more useful "here's how it went"),
    otherwise the week in progress if it already has something, otherwise
    nothing worth reviewing yet. */
export function reviewTarget(
  progress: ProgressV1,
  plan: SavedPlan | null,
  now: Date,
  offsetMinutes: number,
): { mode: 'last-week' | 'this-week' | 'none'; window: WeekWindow } {
  const thisWeek = weekWindowFor(now, offsetMinutes);
  const lastWeek = previousWeek(thisWeek);

  const lastWeekFacts = readWeek(progress, plan, lastWeek, now, offsetMinutes);
  if (!lastWeekFacts.empty) return { mode: 'last-week', window: lastWeek };

  const thisWeekFacts = readWeek(progress, plan, thisWeek, now, offsetMinutes);
  if (!thisWeekFacts.empty) return { mode: 'this-week', window: thisWeek };

  return { mode: 'none', window: thisWeek };
}

/** Stable short hash of everything the review depends on. Same facts, same
    string. Deliberately excludes `complete`: for the CURRENT week, that flips
    from false to true the moment the week ends even though the student did
    nothing at that instant, which is exactly the kind of "changed merely
    because time passed" the cache key must not react to. `empty` is left out
    too since it is fully determined by the fields that are included. */
export function weekFingerprint(facts: WeekFacts): string {
  const parts = [
    facts.window.start,
    facts.window.end,
    String(facts.activeDays),
    String(facts.plannedDays),
    String(facts.minutes),
    String(facts.goalMinutes),
    facts.lessons.map((l) => `${l.key}:${l.completedAt}`).join(','),
    facts.attempts.map((a) => `${a.skill}:${a.at}:${a.band}:${a.drill ? 1 : 0}`).join(','),
    `prev:${facts.previous.activeDays}:${facts.previous.minutes}:${facts.previous.lessons}:${facts.previous.attempts}`,
    facts.bandMoves.map((m) => `${m.skill}:${m.before ?? '-'}:${m.after}`).join(','),
  ];
  return fnv1a(parts.join('|'));
}

/** Small non-cryptographic hash — this is a cache key, not a secret. Copied
    from insights.ts rather than imported, so this module has no dependency
    on it beyond the shared idea. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/* ── Fallback wording ─────────────────────────────────────────────────── */

const SKILL_LABEL: Record<PlanSkill, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

/** One or two plain sentences stating the counted facts, used verbatim when
    no AI model answers. Every number here is read straight off WeekFacts:
    nothing is judged, and a single week's numbers are never called a trend
    (see the bandMoves wording below, which reports two estimated bands
    without saying whether that counts as progress). */
export function weekFallbackText(facts: WeekFacts): string {
  if (facts.empty) {
    return `No study activity was recorded for the week of ${facts.window.start} to ${facts.window.end}. That happens sometimes, and the next week is a fresh start.`;
  }

  const sentences: string[] = [];

  const dayWord = facts.activeDays === 1 ? 'day' : 'days';
  const plannedPart = facts.plannedDays > 0 ? ` out of ${facts.plannedDays} planned` : '';
  const minuteWord = facts.minutes === 1 ? 'minute' : 'minutes';
  sentences.push(
    `For the week of ${facts.window.start} to ${facts.window.end}, you studied on ${facts.activeDays} ${dayWord}${plannedPart}, for ${facts.minutes} ${minuteWord} in total.`,
  );

  if (facts.lessons.length > 0) {
    const lessonWord = facts.lessons.length === 1 ? 'lesson' : 'lessons';
    sentences.push(`You completed ${facts.lessons.length} ${lessonWord}.`);
  }

  if (facts.attempts.length > 0) {
    const attemptWord = facts.attempts.length === 1 ? 'attempt' : 'attempts';
    sentences.push(`You recorded ${facts.attempts.length} practice ${attemptWord}.`);
  }

  for (const move of facts.bandMoves) {
    const label = SKILL_LABEL[move.skill];
    if (move.before !== null) {
      sentences.push(`Your estimated ${label} band this week is ${move.after}, compared with an estimated ${move.before} before this week.`);
    } else {
      sentences.push(`Your estimated ${label} band this week is ${move.after}.`);
    }
  }

  return sentences.join(' ');
}
