/* Unit-level framing for Mr EZ: a short note at the top of the student's
   current course unit ("why this matters for you"), and a wrap-up right
   after they finish one.

   Same discipline as insights.ts: nothing factual is decided by the model.
   Every count here comes straight out of the student's own record, and the
   model is only ever handed the result to put into words. Two things this
   file is careful about because they are easy to get quietly wrong:

   - A unit's relevance has to point at a REAL lesson inside that unit, not
     just at a weak skill in general. "This unit matters because you are
     weak at True/False/Not Given" is only true of the unit that actually
     teaches True/False/Not Given.
   - The fingerprints exist so the dashboard can cache a written note and
     know when it has gone stale. Get the inputs wrong and either the note
     never updates (student reads stale advice) or it updates on every
     lesson tick (the tutor Worker gets called, and paid for, needlessly).

   Pure functions over ProgressV1 / SavedPlan / StudentInsights — no
   localStorage, no `window`, no Date.now() — so the same code runs in the
   browser and in the Cloudflare Worker. Do not import src/data/tests or
   src/lib/plan/schedule.ts here: the Worker bundles this file, and both of
   those pull in megabytes of practice-paper content it never needs. */

import { buildCourse, isLessonDone, type CourseLesson, type CourseModule } from '../course';
import { lessonForType } from './catalog';
import type { Observation, StudentInsights, Confidence } from './insights';
import type { ProgressV1 } from '../progress';
import type { SavedPlan } from '../study-plan';

/** One reason this unit matters to THIS student: an observation from their
    record tied to a lesson inside the unit. */
export interface UnitRelevance {
  observationId: string;
  confidence: Confidence;
  text: string;
  evidence: string;
  lessonKey: string;
  lessonTitle: string;
  lessonDone: boolean;
}

export interface UnitFacts {
  unitId: number;
  name: string;
  blurb: string;
  lessonsTotal: number;
  lessonsDone: number;
  minutesLeft: number;
  skills: string[];
  extrasTotal: number;
  extrasDone: number;
  complete: boolean;
  startedAt: string | null;
  completedAt: string | null;
  relevance: UnitRelevance[];
  nextUnit: { unitId: number; name: string } | null;
}

/** The unit containing the first lesson, in course order, that is not done.
    Unit 8 has no lessons at all (see course.ts), so it is only ever reached
    here once every real lesson in units 1-7 is done. */
export function currentUnitId(progress: ProgressV1): number {
  for (const unit of buildCourse()) {
    if (unit.lessons.length === 0) continue;
    if (unit.lessons.some((l) => !isLessonDone(progress, l.key))) return unit.id;
  }
  return 8;
}

/** The lesson inside `unit` that a given observation is evidence for, or
    null when the observation says nothing about this particular unit. */
function relevantLesson(o: Observation, unit: CourseModule, progress: ProgressV1): CourseLesson | null {
  if (o.id.startsWith('weak:')) {
    // weak:<skill>:<type> — the lesson that actually teaches that question
    // type, when this unit happens to be the one holding it.
    const [, skill, type] = o.id.split(':');
    if ((skill !== 'reading' && skill !== 'listening') || !type) return null;
    const activity = lessonForType(skill, type);
    if (!activity) return null;
    const key = activity.id.slice('lesson:'.length);
    return unit.lessons.find((l) => l.key === key) ?? null;
  }
  if (o.id.startsWith('criterion:') || o.id.startsWith('gap:')) {
    // criterion:<skill>:<key> or gap:<skill> — not tied to one lesson, so
    // pin it to the first lesson of that skill in the unit that is still
    // unread, or the first one at all once every lesson of that skill here
    // is already done.
    const skill = o.id.startsWith('gap:') ? o.id.slice('gap:'.length) : o.id.split(':')[1];
    const inSkill = unit.lessons.filter((l) => l.skill === skill);
    if (inSkill.length === 0) return null;
    return inSkill.find((l) => !isLessonDone(progress, l.key)) ?? inSkill[0]!;
  }
  // strong:* and habit:* are never a reason to prioritise a unit.
  return null;
}

/** Up to three reasons this unit matters, worst/most-certain evidence
    first. `insights.observations` is already ordered weakness-before-gap
    and measured-before-tentative (see insights.ts), so filtering it in
    place keeps that order rather than re-deriving it. */
function unitRelevance(unit: CourseModule, progress: ProgressV1, insights: StudentInsights): UnitRelevance[] {
  const out: UnitRelevance[] = [];
  const usedLessons = new Set<string>();
  for (const o of insights.observations) {
    if (out.length >= 3) break;
    if (o.kind !== 'weakness' && o.kind !== 'gap') continue;
    const lesson = relevantLesson(o, unit, progress);
    if (!lesson || usedLessons.has(lesson.key)) continue;
    usedLessons.add(lesson.key);
    out.push({
      observationId: o.id,
      confidence: o.confidence,
      text: o.text,
      evidence: o.evidence,
      lessonKey: lesson.key,
      lessonTitle: lesson.title,
      lessonDone: isLessonDone(progress, lesson.key),
    });
  }
  return out;
}

/** Earliest and latest of a set of ISO datetimes, or null for an empty set. */
function dateRange(dates: string[]): { min: string; max: string } | null {
  if (dates.length === 0) return null;
  let min = dates[0]!;
  let max = dates[0]!;
  for (const d of dates) {
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

export function readUnit(
  unitId: number,
  progress: ProgressV1,
  plan: SavedPlan | null,
  insights: StudentInsights,
): UnitFacts | null {
  const modules = buildCourse();
  const unit = modules[unitId - 1];
  if (unitId < 1 || unitId > 8 || !unit) return null;

  const lessonsDone = unit.lessons.filter((l) => isLessonDone(progress, l.key));
  const doneRange = dateRange(lessonsDone.map((l) => progress.lessons[l.key]!.completedAt));

  const doneKeys = new Set(plan?.doneKeys ?? []);
  const extrasDone = unit.extras.filter((e) => doneKeys.has(e.key)).length;

  const complete = unitId === 8
    ? unit.extras.length > 0 && extrasDone === unit.extras.length
    : unit.lessons.length > 0 && lessonsDone.length === unit.lessons.length;

  const skills: string[] = [];
  for (const l of unit.lessons) {
    if (!skills.includes(l.skillLabel)) skills.push(l.skillLabel);
  }

  const nextModule = modules[unitId]; // id unitId+1, 0-based index unitId
  const notDone = unit.lessons.filter((l) => !isLessonDone(progress, l.key));

  return {
    unitId: unit.id,
    name: unit.name,
    blurb: unit.blurb,
    lessonsTotal: unit.lessons.length,
    lessonsDone: lessonsDone.length,
    minutesLeft: notDone.reduce((sum, l) => sum + (l.minutes ?? 0), 0),
    skills,
    extrasTotal: unit.extras.length,
    extrasDone,
    complete,
    startedAt: doneRange?.min ?? null,
    // Unit 8 has no lessons to date, and it is only ever "complete" via
    // extras, which carry no completion timestamp — so this stays null there.
    completedAt: unitId !== 8 && complete ? doneRange!.max : null,
    relevance: unitRelevance(unit, progress, insights),
    nextUnit: nextModule ? { unitId: nextModule.id, name: nextModule.name } : null,
  };
}

/** The most recently completed unit whose completion falls inside the last
    `withinDays` days, or null when none does (including "none is complete
    yet" and "the last one to finish completed too long ago"). Unit 8 is
    never returned: it has no lessons and therefore no completedAt to judge
    recency by (see UnitFacts.completedAt). */
export function recentlyCompletedUnitId(progress: ProgressV1, now: Date, withinDays: number = 7): number | null {
  let best: { id: number; completedAt: string } | null = null;
  for (const unit of buildCourse()) {
    if (unit.id === 8 || unit.lessons.length === 0) continue;
    if (unit.lessons.some((l) => !isLessonDone(progress, l.key))) continue;
    const range = dateRange(unit.lessons.map((l) => progress.lessons[l.key]!.completedAt));
    if (!range) continue;
    const ageDays = (now.getTime() - new Date(range.max).getTime()) / 86_400_000;
    if (ageDays < 0 || ageDays > withinDays) continue;
    if (!best || range.max > best.completedAt) best = { id: unit.id, completedAt: range.max };
  }
  return best?.id ?? null;
}

export type UnitNoteKind = 'intro' | 'wrap';

/** Stable hash of what the note depends on, so the dashboard can tell when a
    cached note is still valid and skip paying for a new one.

    'intro' deliberately leaves lessonsDone out: reading a lesson inside the
    unit must not by itself invalidate the "why this unit matters" framing,
    only a change in what the record actually says about the student (the
    relevance list) or in what they are aiming at (the target band) should.
    'wrap' is only ever shown once, right after completedAt is set, so it
    only needs to track unitId and that timestamp. */
export function unitFingerprint(facts: UnitFacts, kind: UnitNoteKind, targetBand: string | null): string {
  const parts = kind === 'intro'
    ? ['intro', String(facts.unitId), targetBand ?? '-', facts.relevance.map((r) => `${r.observationId}:${r.confidence}`).join(',')]
    : ['wrap', String(facts.unitId), facts.completedAt ?? '-'];
  return fnv1a(parts.join('|'));
}

function pluralize(n: number, singular: string, plural: string = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** "This unit matters because..." — used verbatim when no model answers, so
    a signed-out student or a down/unconfigured Worker still gets a real,
    honest reason rather than silence about something the app clearly knows. */
function introText(facts: UnitFacts): string {
  const top = facts.relevance[0];
  if (!top) return '';
  // top.text already carries its own hedge (insights.ts writes tentative
  // observations as "the one time" / "not a pattern", never as a habit), so
  // this only needs to introduce it, not add a claim of its own. Fold the
  // evidence into the same sentence (drop the claim's own trailing period)
  // rather than tacking on a third one, so this stays one or two sentences.
  const claim = top.text.replace(/\.$/, '');
  return `This unit matters for you right now: ${claim} (${top.evidence}).`;
}

/** "You just finished..." — states what happened, never a band. */
function wrapText(facts: UnitFacts): string {
  const isExtrasUnit = facts.lessonsTotal === 0;
  const count = isExtrasUnit ? facts.extrasTotal : facts.lessonsTotal;
  const noun = isExtrasUnit ? pluralize(count, 'step') : pluralize(count, 'lesson');
  let text = `You finished all ${noun} in ${facts.name}.`;

  if (facts.startedAt && facts.completedAt) {
    const days = Math.round(
      (new Date(facts.completedAt).getTime() - new Date(facts.startedAt).getTime()) / 86_400_000,
    );
    if (days >= 1) text += ` That took ${pluralize(days, 'day')}.`;
  }

  text += facts.nextUnit ? ` Next up: ${facts.nextUnit.name}.` : ' That was the last unit in the course.';
  return text;
}

/** Plain sentences stating the facts, used verbatim when no AI model
    answers. See introText/wrapText for the wording rules behind each. */
export function unitFallbackText(facts: UnitFacts, kind: UnitNoteKind): string {
  return kind === 'intro' ? introText(facts) : wrapText(facts);
}

/** Small non-cryptographic hash, copied from insights.ts rather than
    imported — this is a cache key, not a secret, and it keeps this module
    free of a dependency edge that would otherwise mean nothing. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
