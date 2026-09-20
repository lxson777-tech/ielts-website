/* Unit-level framing for Mr EZ: the "why this unit matters" intro and the
   "you just finished a unit" wrap-up. Both are pure functions over a
   student's own record, so these tests build small ProgressV1/SavedPlan
   fixtures directly rather than touching localStorage (see
   tutor-insights.test.ts for the same style).

   The two properties that matter most, same spirit as the insights tests:
   - Relevance only ever points at a lesson that is actually inside the unit
     it is attached to.
   - A tentative observation is never worded as a settled pattern. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  currentUnitId,
  readUnit,
  recentlyCompletedUnitId,
  unitFingerprint,
  unitFallbackText,
  type UnitFacts,
} from '../src/lib/tutor/units.ts';
import { readInsights } from '../src/lib/tutor/insights.ts';
import { buildCourse, courseLessonCount } from '../src/lib/course.ts';
import type { ProgressV1 } from '../src/lib/progress.ts';
import type { SavedPlan } from '../src/lib/study-plan.ts';

const LESSON_TOTAL = courseLessonCount(buildCourse());

function emptyProgress(): ProgressV1 {
  return { version: 1, lessons: {}, tests: {}, writing: {}, speaking: [], activity: {} };
}

function plan(overrides: Partial<SavedPlan> = {}): SavedPlan {
  return { targetBand: '7.0', testDate: '', createdAt: '2026-09-01T10:00:00.000Z', done: [], ...overrides };
}

function readingAttempt(at: string, byType: Record<string, { correct: number; total: number }>) {
  return { at, raw: 20, total: 40, band: 6, bandLabel: '6', secondsUsed: 3600, byType, kind: 'full' as const, skill: 'reading' as const };
}

/** Mark every lesson of a unit done, at a given instant. */
function completeUnit(progress: ProgressV1, unitId: number, at: string): void {
  const unit = buildCourse().find((m) => m.id === unitId)!;
  for (const l of unit.lessons) progress.lessons[l.key] = { completedAt: at };
}

/** The one unit (in the real curriculum) whose lessons include this key. */
function unitContaining(key: string): number {
  const unit = buildCourse().find((m) => m.lessons.some((l) => l.key === key));
  if (!unit) throw new Error(`no unit contains lesson ${key}`);
  return unit.id;
}

function insightsFor(progress: ProgressV1, p: SavedPlan | null = plan(), now?: Date) {
  return readInsights(progress, p, LESSON_TOTAL, now);
}

/* ── currentUnitId ─────────────────────────────────────────────────────── */

test('a brand-new student is at unit 1', () => {
  assert.equal(currentUnitId(emptyProgress()), 1);
});

test('finishing unit 1 moves the current unit to unit 2', () => {
  const progress = emptyProgress();
  completeUnit(progress, 1, '2026-09-10T10:00:00.000Z');
  assert.equal(currentUnitId(progress), 2);
});

test('every lesson done puts the student at unit 8, the exam-readiness unit', () => {
  const progress = emptyProgress();
  for (const unit of buildCourse()) completeUnit(progress, unit.id, '2026-09-10T10:00:00.000Z');
  assert.equal(currentUnitId(progress), 8);
});

/* ── readUnit: counts and shape ───────────────────────────────────────── */

test('readUnit counts lessons, minutes left and skills in first-appearance order', () => {
  const progress = emptyProgress();
  const modules = buildCourse();
  const unit = modules[0]!;
  // Complete the first lesson only, so both "done" and "left" are exercised.
  progress.lessons[unit.lessons[0]!.key] = { completedAt: '2026-09-10T10:00:00.000Z' };

  const facts = readUnit(unit.id, progress, plan(), insightsFor(progress))!;
  assert.ok(facts);
  assert.equal(facts.unitId, unit.id);
  assert.equal(facts.name, unit.name);
  assert.equal(facts.lessonsTotal, unit.lessons.length);
  assert.equal(facts.lessonsDone, 1);

  const expectedMinutesLeft = unit.lessons.slice(1).reduce((sum, l) => sum + (l.minutes ?? 0), 0);
  assert.equal(facts.minutesLeft, expectedMinutesLeft, 'a lesson missing `minutes` must count as 0, not break the sum');

  const expectedSkills: string[] = [];
  for (const l of unit.lessons) if (!expectedSkills.includes(l.skillLabel)) expectedSkills.push(l.skillLabel);
  assert.deepEqual(facts.skills, expectedSkills);

  assert.equal(facts.complete, false);
  assert.equal(facts.completedAt, null);
  assert.ok(facts.startedAt, 'the one completed lesson gives a startedAt');
});

test('an id outside 1..8 resolves to nothing', () => {
  const progress = emptyProgress();
  const insights = insightsFor(progress);
  assert.equal(readUnit(0, progress, plan(), insights), null);
  assert.equal(readUnit(9, progress, plan(), insights), null);
  assert.equal(readUnit(-1, progress, plan(), insights), null);
});

test('unit 1 through 7 are complete only once every one of their lessons is done', () => {
  const progress = emptyProgress();
  const unit = buildCourse()[2]!; // unit 3, arbitrary mid-course unit
  const insights = insightsFor(progress);
  assert.equal(readUnit(unit.id, progress, plan(), insights)!.complete, false);

  completeUnit(progress, unit.id, '2026-09-10T10:00:00.000Z');
  const facts = readUnit(unit.id, progress, plan(), insightsFor(progress))!;
  assert.equal(facts.complete, true);
  assert.equal(facts.completedAt, '2026-09-10T10:00:00.000Z');
});

/* ── Unit 8: extras, not lessons ──────────────────────────────────────── */

test('unit 8 counts extras from plan.doneKeys and is complete only when every extra is ticked', () => {
  const progress = emptyProgress();
  const unit8 = buildCourse().find((m) => m.id === 8)!;
  assert.ok(unit8.extras.length >= 2, 'fixture assumption: unit 8 really does have several extras');

  const insights = insightsFor(progress);
  const none = readUnit(8, progress, plan(), insights)!;
  assert.equal(none.lessonsTotal, 0);
  assert.equal(none.extrasTotal, unit8.extras.length);
  assert.equal(none.extrasDone, 0);
  assert.equal(none.complete, false);
  assert.equal(none.completedAt, null, 'unit 8 never gets a completedAt, even conceptually');

  const oneDone = readUnit(8, progress, plan({ doneKeys: [unit8.extras[0]!.key] }), insights)!;
  assert.equal(oneDone.extrasDone, 1);
  assert.equal(oneDone.complete, false);

  const allKeys = unit8.extras.map((e) => e.key);
  const allDone = readUnit(8, progress, plan({ doneKeys: allKeys }), insights)!;
  assert.equal(allDone.extrasDone, unit8.extras.length);
  assert.equal(allDone.complete, true);
  assert.equal(allDone.completedAt, null);
});

/* ── Relevance ────────────────────────────────────────────────────────── */

test('a measured reading weakness surfaces only in the unit that actually teaches it', () => {
  const progress = emptyProgress();
  progress.tests['t'] = [
    readingAttempt('2026-09-10T10:00:00.000Z', { tfng: { correct: 1, total: 5 } }),
    readingAttempt('2026-09-11T10:00:00.000Z', { tfng: { correct: 1, total: 5 } }),
  ];
  const insights = insightsFor(progress);
  const observation = insights.observations.find((o) => o.id === 'weak:reading:tfng');
  assert.ok(observation);
  assert.equal(observation.confidence, 'measured');

  const home = unitContaining('reading-tfng');
  for (const unit of buildCourse()) {
    const facts = readUnit(unit.id, progress, plan(), insights)!;
    const found = facts.relevance.find((r) => r.observationId === 'weak:reading:tfng');
    if (unit.id === home) {
      assert.ok(found, `weak:reading:tfng must show up in unit ${home}, which holds reading-tfng`);
      assert.equal(found.lessonKey, 'reading-tfng');
      assert.equal(found.confidence, 'measured');
    } else {
      assert.equal(found, undefined, `weak:reading:tfng must not show up in unit ${unit.id}`);
    }
  }
});

test('a tentative weakness keeps its tentative confidence in the unit relevance', () => {
  const progress = emptyProgress();
  progress.tests['t'] = [readingAttempt('2026-09-10T10:00:00.000Z', { tfng: { correct: 1, total: 5 } })];
  const insights = insightsFor(progress);
  const home = unitContaining('reading-tfng');
  const facts = readUnit(home, progress, plan(), insights)!;
  const found = facts.relevance.find((r) => r.observationId === 'weak:reading:tfng');
  assert.ok(found);
  assert.equal(found.confidence, 'tentative');
});

test('a writing criterion weakness attaches to a unit that actually has writing lessons', () => {
  const progress = emptyProgress();
  progress.writing['w-001'] = [
    { at: '2026-09-10T10:00:00.000Z', overallBand: 6, criteria: { taskResponse: 5, coherenceCohesion: 6, lexicalResource: 6, grammaticalRange: 6 }, wordCount: 260, live: true },
    { at: '2026-09-12T10:00:00.000Z', overallBand: 6, criteria: { taskResponse: 5, coherenceCohesion: 7, lexicalResource: 6, grammaticalRange: 6 }, wordCount: 275, live: true },
  ];
  const insights = insightsFor(progress);
  assert.ok(insights.observations.some((o) => o.id === 'criterion:writing:taskResponse' && o.confidence === 'measured'));

  const writingUnit = buildCourse().find((m) => m.lessons.some((l) => l.skill === 'writing'))!;
  const facts = readUnit(writingUnit.id, progress, plan(), insights)!;
  const found = facts.relevance.find((r) => r.observationId === 'criterion:writing:taskResponse');
  assert.ok(found, 'a unit with writing lessons must claim the writing criterion observation');
  assert.ok(writingUnit.lessons.some((l) => l.key === found.lessonKey), 'the lesson it points to is really inside that unit');
});

test('relevance is capped at three entries and never repeats a lesson', () => {
  const progress = emptyProgress();
  // Pile up several distinct reading weaknesses that all live in the same
  // unit as reading-tfng, plus a writing and a speaking gap, so there is
  // more candidate evidence than three slots.
  progress.tests['t'] = [
    readingAttempt('2026-09-10T10:00:00.000Z', {
      tfng: { correct: 1, total: 8 },
      'yes-no-notgiven': { correct: 1, total: 8 },
      mc: { correct: 1, total: 8 },
    }),
    readingAttempt('2026-09-11T10:00:00.000Z', {
      tfng: { correct: 1, total: 8 },
      'yes-no-notgiven': { correct: 1, total: 8 },
      mc: { correct: 1, total: 8 },
    }),
  ];
  const insights = insightsFor(progress);
  const home = unitContaining('reading-tfng');
  const facts = readUnit(home, progress, plan(), insights)!;
  assert.ok(facts.relevance.length <= 3);
  const lessonKeys = facts.relevance.map((r) => r.lessonKey);
  assert.equal(new Set(lessonKeys).size, lessonKeys.length, 'no lesson is named twice');
});

test('strengths and habits never appear as relevance', () => {
  const progress = emptyProgress();
  progress.tests['t'] = [
    readingAttempt('2026-09-10T10:00:00.000Z', { tfng: { correct: 5, total: 5 } }),
    readingAttempt('2026-09-11T10:00:00.000Z', { tfng: { correct: 5, total: 5 } }),
  ];
  for (let i = 1; i <= 10; i += 1) {
    progress.activity![`2026-09-${String(i).padStart(2, '0')}`] = { minutes: 20, lessons: 1, attempts: 0 };
  }
  const insights = insightsFor(progress, plan(), new Date('2026-09-12T10:00:00.000Z'));
  assert.ok(insights.observations.some((o) => o.kind === 'strength'));
  assert.ok(insights.observations.some((o) => o.kind === 'habit'));

  const home = unitContaining('reading-tfng');
  const facts = readUnit(home, progress, plan(), insights)!;
  assert.ok(!facts.relevance.some((r) => r.observationId.startsWith('strong:')));
  assert.ok(!facts.relevance.some((r) => r.observationId === 'habit:consistent'));
});

/* ── recentlyCompletedUnitId ──────────────────────────────────────────── */

test('recentlyCompletedUnitId finds a unit finished inside the window', () => {
  const progress = emptyProgress();
  completeUnit(progress, 1, '2026-09-10T10:00:00.000Z');
  const now = new Date('2026-09-12T10:00:00.000Z');
  assert.equal(recentlyCompletedUnitId(progress, now), 1);
});

test('recentlyCompletedUnitId ignores a unit finished outside the window', () => {
  const progress = emptyProgress();
  completeUnit(progress, 1, '2026-09-01T10:00:00.000Z');
  const now = new Date('2026-09-12T10:00:00.000Z');
  assert.equal(recentlyCompletedUnitId(progress, now, 7), null);
  // A wider window picks the same completion back up.
  assert.equal(recentlyCompletedUnitId(progress, now, 30), 1);
});

test('recentlyCompletedUnitId returns the most recently finished of several complete units', () => {
  const progress = emptyProgress();
  completeUnit(progress, 1, '2026-09-05T10:00:00.000Z');
  completeUnit(progress, 2, '2026-09-11T10:00:00.000Z');
  const now = new Date('2026-09-12T10:00:00.000Z');
  assert.equal(recentlyCompletedUnitId(progress, now), 2);
});

/* ── Fingerprints ─────────────────────────────────────────────────────── */

test('the intro fingerprint is unchanged by finishing a lesson inside the unit', () => {
  const progress = emptyProgress();
  progress.tests['t'] = [
    readingAttempt('2026-09-10T10:00:00.000Z', { tfng: { correct: 1, total: 5 } }),
    readingAttempt('2026-09-11T10:00:00.000Z', { tfng: { correct: 1, total: 5 } }),
  ];
  const home = unitContaining('reading-tfng');
  const insights = insightsFor(progress);
  const before = readUnit(home, progress, plan(), insights)!;
  const a = unitFingerprint(before, 'intro', '7.0');

  // Complete a different lesson in the same unit — lessonsDone changes, but
  // the relevance list and target band do not, so the intro must not move.
  const unit = buildCourse().find((m) => m.id === home)!;
  const otherLesson = unit.lessons.find((l) => l.key !== before.relevance[0]?.lessonKey) ?? unit.lessons[0]!;
  progress.lessons[otherLesson.key] = { completedAt: '2026-09-12T10:00:00.000Z' };
  const after = readUnit(home, progress, plan(), insightsFor(progress))!;
  const b = unitFingerprint(after, 'intro', '7.0');
  assert.notEqual(after.lessonsDone, before.lessonsDone);
  assert.equal(a, b, 'ticking an unrelated lesson must not invalidate the cached intro');
});

test('the intro fingerprint changes when the relevance list changes', () => {
  const progressA = emptyProgress();
  const home = unitContaining('reading-tfng');
  const factsA = readUnit(home, progressA, plan(), insightsFor(progressA))!;
  const a = unitFingerprint(factsA, 'intro', '7.0');

  const progressB = emptyProgress();
  progressB.tests['t'] = [
    readingAttempt('2026-09-10T10:00:00.000Z', { tfng: { correct: 1, total: 5 } }),
    readingAttempt('2026-09-11T10:00:00.000Z', { tfng: { correct: 1, total: 5 } }),
  ];
  const factsB = readUnit(home, progressB, plan(), insightsFor(progressB))!;
  const b = unitFingerprint(factsB, 'intro', '7.0');
  assert.notEqual(a, b);
});

test('the intro fingerprint changes when the target band changes', () => {
  const progress = emptyProgress();
  const home = unitContaining('reading-tfng');
  const facts = readUnit(home, progress, plan(), insightsFor(progress))!;
  const a = unitFingerprint(facts, 'intro', '6.5');
  const b = unitFingerprint(facts, 'intro', '8.0');
  assert.notEqual(a, b);
});

test('the wrap fingerprint changes with completedAt', () => {
  const progress = emptyProgress();
  completeUnit(progress, 1, '2026-09-10T10:00:00.000Z');
  const factsA = readUnit(1, progress, plan(), insightsFor(progress))!;
  const a = unitFingerprint(factsA, 'wrap', '7.0');

  const progress2 = emptyProgress();
  completeUnit(progress2, 1, '2026-09-15T10:00:00.000Z');
  const factsB = readUnit(1, progress2, plan(), insightsFor(progress2))!;
  const b = unitFingerprint(factsB, 'wrap', '7.0');
  assert.notEqual(a, b);
});

/* ── Fallback text ────────────────────────────────────────────────────── */

test('an intro with no relevance is silent rather than filler', () => {
  const progress = emptyProgress();
  // No plan at all: with a target band set, a brand-new student would pick
  // up "gap:<skill>" observations (no attempts yet) that DO count as
  // relevance, so this needs the true zero-evidence case, no goals either.
  const facts = readUnit(1, progress, null, insightsFor(progress, null))!;
  assert.equal(facts.relevance.length, 0, 'a brand-new student with no goal set has no evidence yet');
  assert.equal(unitFallbackText(facts, 'intro'), '');
});

test('a tentative intro is worded as one occasion, not a habit', () => {
  const progress = emptyProgress();
  progress.tests['t'] = [readingAttempt('2026-09-10T10:00:00.000Z', { tfng: { correct: 1, total: 5 } })];
  const home = unitContaining('reading-tfng');
  const facts = readUnit(home, progress, plan(), insightsFor(progress))!;
  assert.equal(facts.relevance[0]?.confidence, 'tentative');

  const text = unitFallbackText(facts, 'intro');
  assert.ok(text.length > 0);
  assert.doesNotMatch(text, /\bconsistently\b/i);
  assert.doesNotMatch(text, /\balways\b/i);
  assert.doesNotMatch(text, /\bkeep(s|ing)?\b/i);
  assert.doesNotMatch(text, /\bas a pattern\b/i);
});

test('a measured intro names the actual evidence and reads as one or two sentences', () => {
  const progress = emptyProgress();
  progress.tests['t'] = [
    readingAttempt('2026-09-10T10:00:00.000Z', { tfng: { correct: 1, total: 5 } }),
    readingAttempt('2026-09-11T10:00:00.000Z', { tfng: { correct: 1, total: 5 } }),
  ];
  const home = unitContaining('reading-tfng');
  const facts = readUnit(home, progress, plan(), insightsFor(progress))!;
  const text = unitFallbackText(facts, 'intro');
  assert.ok(text.includes(facts.relevance[0]!.evidence), 'the evidence string is quoted verbatim');
  assert.ok(text.split(/(?<=[.!?])\s+/).filter(Boolean).length <= 2);
});

test('a wrap names the next unit, gets plurals right, and never claims a band moved', () => {
  const progress = emptyProgress();
  completeUnit(progress, 1, '2026-09-10T10:00:00.000Z');
  const facts = readUnit(1, progress, plan(), insightsFor(progress))!;
  const text = unitFallbackText(facts, 'wrap');

  const nextUnit = buildCourse().find((m) => m.id === 2)!;
  assert.ok(text.includes(nextUnit.name), 'the real next unit is named');
  assert.doesNotMatch(text, /\bband\b/i, 'a wrap never claims a band moved');

  // Plural correctness at both ends: the real unit 1 has several lessons
  // (so "lessons", not "lesson")...
  assert.ok(facts.lessonsTotal > 1, 'fixture assumption: unit 1 has more than one lesson');
  assert.match(text, /\d+ lessons in/);

  // ...and a synthetic single-lesson unit must say "lesson", singular.
  const oneLessonFacts: UnitFacts = { ...facts, lessonsTotal: 1, lessonsDone: 1, name: 'Solo Unit', nextUnit: null };
  const oneLessonText = unitFallbackText(oneLessonFacts, 'wrap');
  assert.match(oneLessonText, /1 lesson in/);
  assert.doesNotMatch(oneLessonText, /1 lessons/);
  assert.match(oneLessonText, /last unit/i, 'no next unit is named plainly when there is none');
});

test('no fallback text ever contains an em dash or en dash', () => {
  const dash = /[–—]/;
  const progress = emptyProgress();
  progress.tests['t'] = [
    readingAttempt('2026-09-10T10:00:00.000Z', { tfng: { correct: 1, total: 5 } }),
    readingAttempt('2026-09-11T10:00:00.000Z', { tfng: { correct: 1, total: 5 } }),
  ];
  const home = unitContaining('reading-tfng');
  const introFacts = readUnit(home, progress, plan(), insightsFor(progress))!;
  assert.doesNotMatch(unitFallbackText(introFacts, 'intro'), dash);

  completeUnit(progress, 1, '2026-09-10T10:00:00.000Z');
  const wrapFacts = readUnit(1, progress, plan(), insightsFor(progress))!;
  assert.doesNotMatch(unitFallbackText(wrapFacts, 'wrap'), dash);
});
