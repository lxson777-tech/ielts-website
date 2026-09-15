import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateSeconds,
  progressPercent,
  stageLabel,
  DEFAULT_AUDIO_SECONDS,
} from '../src/lib/grading/progress.ts';

/* The grading bar is time-driven, not request-driven: the graders say nothing
   until they are finished, so the only honest thing the UI can do is ease
   toward a ceiling it never crosses. These tests pin that contract , 0 at the
   start, never above 95, never going backwards , plus the exact stage
   thresholds, because the wording is what the student actually reads. */

test('progressPercent: 0 at 0 elapsed', () => {
  assert.equal(progressPercent(0, 60), 0);
  assert.equal(progressPercent(0, 323), 0);
});

test('progressPercent: never exceeds 95, even far past the estimate', () => {
  for (const estimate of [60, 96, 323]) {
    for (const minutes of [1, 5, 30, 600, 100000]) {
      const p = progressPercent(minutes * 60_000, estimate);
      assert.ok(p <= 95, `${p} should be <= 95 (estimate ${estimate}, ${minutes} min)`);
    }
  }
});

test('progressPercent: never decreases as elapsed grows', () => {
  for (const estimate of [60, 96, 323]) {
    let previous = -1;
    for (let elapsed = 0; elapsed <= 1_200_000; elapsed += 200) {
      const p = progressPercent(elapsed, estimate);
      assert.ok(p >= previous, `dropped from ${previous} to ${p} at ${elapsed}ms`);
      previous = p;
    }
  }
});

test('progressPercent: still visibly moving after the estimate has passed', () => {
  const atEstimate = progressPercent(60_000, 60);
  const later = progressPercent(96_000, 60);
  assert.ok(later > atEstimate);
  assert.ok(later < 95);
});

test('progressPercent: a negative or zero estimate does not produce NaN', () => {
  assert.ok(Number.isFinite(progressPercent(5_000, 0)));
  assert.ok(Number.isFinite(progressPercent(5_000, -10)));
});

test('estimateSeconds: matches the two live speaking measurements', () => {
  // 2 minutes of speech graded in ~105s; 12 minutes in ~5m22s (322s).
  assert.ok(Math.abs(estimateSeconds('speaking', 120) - 96) < 1);
  assert.ok(Math.abs(estimateSeconds('speaking', 720) - 323) < 1);
});

test('estimateSeconds: writing is a flat minute, speaking defaults to 2 minutes of audio', () => {
  assert.equal(estimateSeconds('writing'), 60);
  assert.equal(estimateSeconds('writing', 900), 60);
  assert.equal(estimateSeconds('speaking'), estimateSeconds('speaking', DEFAULT_AUDIO_SECONDS));
  assert.equal(estimateSeconds('speaking', 0), estimateSeconds('speaking', DEFAULT_AUDIO_SECONDS));
});

test('stageLabel: speaking changes at 12%, 55% and 85% of the estimate', () => {
  assert.equal(stageLabel('speaking', 0), 'Preparing your recording');
  assert.equal(stageLabel('speaking', 0.119), 'Preparing your recording');
  assert.equal(stageLabel('speaking', 0.12), 'Writing out exactly what you said');
  assert.equal(stageLabel('speaking', 0.549), 'Writing out exactly what you said');
  assert.equal(stageLabel('speaking', 0.55), 'Grading fluency, vocabulary and grammar');
  assert.equal(stageLabel('speaking', 0.849), 'Grading fluency, vocabulary and grammar');
  assert.equal(stageLabel('speaking', 0.85), 'Checking your pronunciation');
  assert.equal(stageLabel('speaking', 4), 'Checking your pronunciation');
});

test('stageLabel: writing changes at 30% and 75% of the estimate', () => {
  assert.equal(stageLabel('writing', 0), 'Reading your essay');
  assert.equal(stageLabel('writing', 0.299), 'Reading your essay');
  assert.equal(stageLabel('writing', 0.3), 'Checking it against the official band descriptors');
  assert.equal(stageLabel('writing', 0.749), 'Checking it against the official band descriptors');
  assert.equal(stageLabel('writing', 0.75), 'Writing your feedback');
  assert.equal(stageLabel('writing', 9), 'Writing your feedback');
});
