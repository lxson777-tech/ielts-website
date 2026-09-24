/* The lesson library lists every lesson once, and a skill filter shows only
 * that skill with a count equal to what is shown. Platform audit 2026-09-23:
 * each paper's introduction was listed twice under one React key, so the
 * Reading filter reported 14 lessons over 18 cards, four of them other
 * papers' overviews left on screen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { libraryEntries, filterLibrary } from '../src/lib/lesson-library.ts';
import { LESSONS, SKILLS } from '../src/data/lessons.ts';
import { buildCourse } from '../src/lib/course.ts';

const entries = libraryEntries();

test('every lesson appears exactly once, keyed and linked uniquely', () => {
  const keys = entries.map((entry) => entry.key);
  assert.equal(new Set(keys).size, keys.length, 'duplicate keys');
  const hrefs = entries.map((entry) => entry.href);
  assert.equal(new Set(hrefs).size, hrefs.length, 'duplicate links');
  const courseKeys = buildCourse().flatMap((module) => module.lessons.map((lesson) => lesson.key));
  const expected = new Set([...LESSONS.map((lesson) => lesson.slug), ...courseKeys]);
  assert.deepEqual(new Set(keys), expected, 'a lesson was dropped or invented');
});

test('each paper introduction is one overview entry, listed first', () => {
  const overviews = entries.filter((entry) => entry.overview);
  assert.deepEqual(overviews.map((entry) => entry.key), LESSONS.map((lesson) => lesson.slug));
  assert.deepEqual(entries.slice(0, LESSONS.length).map((entry) => entry.overview), LESSONS.map(() => true));
});

test('a skill filter shows only that skill, with its own introduction', () => {
  for (const { id } of SKILLS) {
    const shown = filterLibrary(entries, id, '');
    assert.ok(shown.length > 0, id);
    assert.ok(shown.every((entry) => entry.skill === id), `${id} shows another paper`);
    assert.equal(shown.filter((entry) => entry.overview).length, 1, `${id} introductions`);
  }
  assert.equal(filterLibrary(entries, 'all', '').length, entries.length);
});

test('search narrows within the chosen skill and ignores surrounding spaces', () => {
  const reading = filterLibrary(entries, 'reading', '  heading ');
  assert.ok(reading.length > 0);
  assert.ok(reading.every((entry) => entry.skill === 'reading'));
  assert.equal(filterLibrary(entries, 'reading', 'zzzz-no-such-lesson').length, 0);
});
