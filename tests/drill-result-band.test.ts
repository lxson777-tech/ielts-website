/* A drill result never shows an IELTS band (platform audit 2026-09-23, Stage 5:
 * "avoid presenting a short drill as an official IELTS score"). A drill is one
 * passage or one recording, far too few questions for the band table.
 * Browser proof: drill 0/13 shows the "too short" line, a full paper keeps its
 * estimated band, in English and Russian. This pins the source so the band
 * cannot quietly return to the drill modal, and that full papers keep it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(import.meta.dirname, '..', 'src', 'components', 'TestPlayer.tsx'), 'utf8');

test('the score modal shows the band only for a full paper', () => {
  const at = source.indexOf("t('Estimated Band: {band}'");
  assert.ok(at > 0, 'the full-paper band line is still there');
  /* 2400 characters: the drill branch now also says why a full paper taken
     with help has no band (practice settings, 9 October 2026). */
  const before = source.slice(Math.max(0, at - 2400), at);
  assert.match(before, /attemptKind === 'drill' \?/, 'the band is inside the drill/full branch');
  assert.match(before, /A single drill is too short to estimate a band\./, 'the drill branch says why there is no band');
});

test('the drill band is still kept out of every place that compares bands', () => {
  for (const file of ['src/lib/progress.ts', 'src/components/ScoreHistory.tsx', 'src/lib/tutor/insights.ts']) {
    const text = readFileSync(join(import.meta.dirname, '..', ...file.split('/')), 'utf8');
    assert.match(text, /kind !== 'drill'/, file);
  }
});
