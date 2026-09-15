import test from 'node:test';
import assert from 'node:assert/strict';
import { overallMockBand } from '../src/lib/tests/mock.ts';

/* The official IELTS overall-band method: mean of the component bands,
   rounded to the nearest half band, with .25 rounding up to the next half
   band and .75 rounding up to the next whole band. A mean of half-band
   scores can only ever land on a whole number or on .25/.5/.75 (each
   component is itself a multiple of 0.5, so the sum over N components is a
   multiple of 0.5 and the mean a multiple of 0.5/N) — these tests exercise
   both fractions directly, for four components (the full sitting: Listening,
   Reading, Writing, Speaking) and for three (Speaking skipped). */

test('overallMockBand: four components, mean ending in .25 rounds up to the next half band', () => {
  // (5.5 + 6 + 6.5 + 7) / 4 = 6.25 -> 6.5
  assert.equal(overallMockBand([5.5, 6, 6.5, 7]), 6.5);
});

test('overallMockBand: four components, mean ending in .75 rounds up to the next whole band', () => {
  // (6 + 6.5 + 7 + 7.5) / 4 = 6.75 -> 7
  assert.equal(overallMockBand([6, 6.5, 7, 7.5]), 7);
});

test('overallMockBand: four components, mean already a half band is unchanged', () => {
  // (6 + 6.5 + 7 + 7.5) / 4 is covered above; a case that lands exactly on
  // a half band with no rounding decision to make:
  // (6 + 6 + 7 + 7) / 4 = 6.5
  assert.equal(overallMockBand([6, 6, 7, 7]), 6.5);
});

test('overallMockBand: four components, mean already a whole band is unchanged', () => {
  // (6 + 6 + 6 + 6) / 4 = 6
  assert.equal(overallMockBand([6, 6, 6, 6]), 6);
});

test('overallMockBand: three components (Speaking skipped), mean ending in .25 rounds up to the next half band', () => {
  // (6 + 6 + 6.75) / 3 = 6.25 -> 6.5
  assert.equal(overallMockBand([6, 6, 6.75]), 6.5);
});

test('overallMockBand: three components (Speaking skipped), mean ending in .75 rounds up to the next whole band', () => {
  // (6.5 + 6.75 + 7) / 3 = 6.75 -> 7
  assert.equal(overallMockBand([6.5, 6.75, 7]), 7);
});

test('overallMockBand: three components, mean already a half band is unchanged', () => {
  // (6 + 6.5 + 7) / 3 = 6.5
  assert.equal(overallMockBand([6, 6.5, 7]), 6.5);
});

test('overallMockBand: two components (the pre-Speaking Listening+Reading pair) still works', () => {
  // (6.5 + 7) / 2 = 6.75 -> 7
  assert.equal(overallMockBand([6.5, 7]), 7);
});

test('overallMockBand: empty input returns 0 rather than NaN', () => {
  assert.equal(overallMockBand([]), 0);
});
