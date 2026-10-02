/* A Listening drill's clock must outlast its own recording.
 *
 * Run on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/listening-drill-clock.test.ts
 *
 * The drill clock starts when the student begins, before they press Start
 * recording, and the paper hands itself in at zero. Until 3 October 2026
 * every Listening drill had a flat 8-minute clock, and 8 parts have a
 * recording longer than that (Test 1 Part 1 runs 8.9 minutes), so the last
 * questions of those parts could never be answered. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_LISTENING_DRILLS, ALL_READING_DRILLS } from '../src/lib/tests/drills.ts';

test('every Listening drill gives at least one minute beyond its recording', () => {
  assert.ok(ALL_LISTENING_DRILLS.length > 0);
  for (const { id, test: drill } of ALL_LISTENING_DRILLS) {
    const s = drill.parts[0]!.stimulus;
    assert.equal(s.kind, 'audio', `${id} has no audio stimulus`);
    if (s.kind !== 'audio') continue;
    assert.equal(typeof s.startSeconds, 'number', `${id} has no start time`);
    assert.equal(typeof s.endSeconds, 'number', `${id} has no end time`);
    const audioSeconds = s.endSeconds! - s.startSeconds!;
    assert.ok(
      drill.durationMinutes * 60 >= audioSeconds + 60,
      `${id}: ${drill.durationMinutes} minutes on the clock for ${(audioSeconds / 60).toFixed(1)} minutes of recording`,
    );
  }
});

test('short Listening parts keep the familiar 8-minute clock', () => {
  const short = ALL_LISTENING_DRILLS.filter(({ test: drill }) => {
    const s = drill.parts[0]!.stimulus;
    return s.kind === 'audio' && s.endSeconds! - s.startSeconds! <= 7 * 60;
  });
  assert.ok(short.length > 0);
  for (const { id, test: drill } of short) assert.equal(drill.durationMinutes, 8, id);
});

test('the drill description states the clock it really has', () => {
  for (const { id, test: drill } of ALL_LISTENING_DRILLS) {
    assert.match(drill.description, new RegExp(`about ${drill.durationMinutes} minutes`), id);
  }
});

test('Reading drills keep the exam pace of about 20 minutes a passage', () => {
  for (const { id, test: drill } of ALL_READING_DRILLS) assert.equal(drill.durationMinutes, 20, id);
});
