/* The live interview's examiner picture switch and the orb's pure parts
   (src/lib/speaking/live/examiner-look.ts). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMINER_LOOK, orbFrame, orbMode, smoothLevel } from '../src/lib/speaking/live/examiner-look.ts';

test('the switch names a real look, and ships on the circle (Alex, 4 October 2026)', () => {
  assert.ok(['orb', 'taylor'].includes(EXAMINER_LOOK));
  assert.equal(EXAMINER_LOOK, 'orb');
});

const turn = { stage: 'part1', connecting: false, over: false } as const;

test('the circle follows the status line: she speaks, you speak, you prepare, quiet', () => {
  assert.equal(orbMode({ ...turn, statusTone: 'examiner' }), 'speaking');
  assert.equal(orbMode({ ...turn, statusTone: 'student' }), 'listening');
  assert.equal(orbMode({ ...turn, stage: 'part2prep', statusTone: 'quiet' }), 'prep');
  assert.equal(orbMode({ ...turn, stage: 'wrapup', statusTone: 'quiet' }), 'quiet');
});

test('she speaking wins over the preparation colour, so the circle never contradicts the line', () => {
  assert.equal(orbMode({ ...turn, stage: 'part2prep', statusTone: 'examiner' }), 'speaking');
});

test('connecting and the end of the test are quiet, whatever the tone says', () => {
  assert.equal(orbMode({ ...turn, connecting: true, statusTone: 'examiner' }), 'quiet');
  assert.equal(orbMode({ ...turn, over: true, statusTone: 'student' }), 'quiet');
});

test('smoothing closes a share of the gap and never overshoots', () => {
  assert.equal(smoothLevel(0, 1, 0.25), 0.25);
  assert.equal(smoothLevel(1, 1, 0.25), 1);
  let v = 0;
  for (let i = 0; i < 100; i += 1) v = smoothLevel(v, 0.6, 0.22);
  assert.ok(v <= 0.6 && v > 0.599);
});

test('the three layers rest at silence and stay inside their ranges at full level', () => {
  const rest = orbFrame(0, 0);
  assert.deepEqual(rest, { coreScale: 1, glowOpacity: 0.35, glowScale: 1, micOpacity: 0, micScale: 1.04 });
  const loud = orbFrame(1, 1);
  assert.ok(loud.glowOpacity <= 1 && loud.micOpacity <= 1);
  assert.ok(loud.coreScale <= 1.32 + 1e-9);
});
