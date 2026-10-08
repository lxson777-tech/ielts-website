/* The simplified Tests page (8 October 2026): its pure decisions.
 *   - lastBands: the "Last: Band 6.5" line on the Reading / Listening tiles;
 *   - resultsState: one friendly line for a new student, otherwise which tab
 *     opens first and what each tab has to show;
 *   - unseenCheckpointLinks: the quiet "Try a paper you haven't seen" line
 *     shows a skill only when its recommended paper really is unseen;
 *   - the page itself: every destination today's page had is still there. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lastBands, resultsState, type AttemptRow } from '../src/components/tests-hub.ts';
import { unseenCheckpointLinks, type Skill } from '../src/components/learning/tests-hub-checkpoints.ts';
import type { CheckpointCandidate } from '../src/lib/learning/checkpoints.ts';
import type { TestAttempt } from '../src/lib/progress.ts';

function attempt(over: Partial<TestAttempt>): TestAttempt {
  return { at: '2026-10-01T10:00:00.000Z', raw: 30, total: 40, band: 7, bandLabel: '7.0', secondsUsed: 3000, ...over };
}
const row = (testId: string, over: Partial<TestAttempt>): AttemptRow => ({ testId, attempt: attempt(over) });

test('lastBands: the latest full paper per skill, drills ignored', () => {
  const rows = [
    row('reading-full-001', { at: '2026-10-01T10:00:00.000Z', band: 6 }),
    row('reading-full-002', { at: '2026-10-03T10:00:00.000Z', band: 6.5 }),
    row('reading-drill-1', { at: '2026-10-05T10:00:00.000Z', band: 9, kind: 'drill' }),
    row('listening-full-001', { at: '2026-10-02T10:00:00.000Z', band: 7, skill: 'listening' }),
  ];
  assert.deepEqual(lastBands(rows), { reading: '6.5', listening: '7.0' });
});

test('lastBands: an attempt without a skill is Reading; a band below the table gets no line', () => {
  assert.deepEqual(lastBands([row('reading-full-001', { band: 5.5 })]), { reading: '5.5' });
  assert.deepEqual(lastBands([row('reading-full-001', { band: 0 })]), {});
  assert.deepEqual(lastBands([]), {});
});

test('resultsState: a new student gets the one friendly line, not empty boxes', () => {
  const state = resultsState([], { reading: [], listening: [] });
  assert.equal(state.hasAny, false);
  assert.equal(state.initial, 'reading');
});

test('resultsState: counts history (full papers) and weak spots (any attempt with types) per skill', () => {
  const rows = [
    row('reading-full-001', { at: '2026-10-01T10:00:00.000Z' }),
    row('reading-drill-1', { at: '2026-10-02T10:00:00.000Z', kind: 'drill' }),
    row('listening-full-001', { at: '2026-10-04T10:00:00.000Z', skill: 'listening' }),
  ];
  const state = resultsState(rows, {
    reading: [{ type: 'tfng', correct: 3, total: 5 }],
    listening: [{ type: 'form', correct: 2, total: 4 }, { type: 'map', correct: 0, total: 0 }],
  });
  assert.equal(state.hasAny, true);
  assert.deepEqual(state.skills.reading, { history: 1, types: 1 });
  assert.deepEqual(state.skills.listening, { history: 1, types: 1 });
  assert.equal(state.initial, 'listening', 'the tab of the latest attempt opens first');
});

test('resultsState: a drill-only student still sees results (weak spots), on the right tab', () => {
  const rows = [row('listening-drill-1', { skill: 'listening', kind: 'drill' })];
  const state = resultsState(rows, { reading: [], listening: [{ type: 'form', correct: 1, total: 2 }] });
  assert.equal(state.hasAny, true);
  assert.deepEqual(state.skills.listening, { history: 0, types: 1 });
  assert.equal(state.initial, 'listening');
});

function candidate(testId: string, status: CheckpointCandidate['status']): CheckpointCandidate {
  return { testId, status, seenShare: status === 'unseen' ? 0 : 1 } as unknown as CheckpointCandidate;
}

test('unseenCheckpointLinks: one link per skill whose recommended paper is unseen', () => {
  const rankings = new Map<Skill, readonly CheckpointCandidate[]>([
    ['reading', [candidate('reading-full-004', 'unseen'), candidate('reading-full-001', 'seen')]],
    ['listening', [candidate('listening-full-002', 'unseen')]],
  ]);
  assert.deepEqual(unseenCheckpointLinks(null, rankings), [
    { skill: 'reading', testId: 'reading-full-004', fromPlan: false },
    { skill: 'listening', testId: 'listening-full-002', fromPlan: false },
  ]);
});

test('unseenCheckpointLinks: a skill with no unseen paper is left out, and with none at all the line has nothing', () => {
  const rankings = new Map<Skill, readonly CheckpointCandidate[]>([
    ['reading', [candidate('reading-full-001', 'partly-seen'), candidate('reading-full-002', 'seen')]],
    ['listening', [candidate('listening-full-002', 'unseen')]],
  ]);
  assert.deepEqual(unseenCheckpointLinks(null, rankings).map((l) => l.skill), ['listening']);
  const none = new Map<Skill, readonly CheckpointCandidate[]>([
    ['reading', [candidate('reading-full-001', 'seen')]],
    ['listening', []],
  ]);
  assert.deepEqual(unseenCheckpointLinks(null, none), []);
});

test('unseenCheckpointLinks: never points somewhere other than the plan when the plan queued a seen paper', () => {
  const rankings = new Map<Skill, readonly CheckpointCandidate[]>([
    ['reading', [candidate('reading-full-004', 'unseen'), candidate('reading-full-001', 'seen')]],
    ['listening', []],
  ]);
  const session = {
    steps: [{ role: 'assess', paper: 'reading', kind: 'full-test', activityId: 'test:reading-full-001' }],
  } as unknown as Parameters<typeof unseenCheckpointLinks>[0];
  assert.deepEqual(unseenCheckpointLinks(session, rankings), []);
  const unseenPlan = {
    steps: [{ role: 'assess', paper: 'reading', kind: 'full-test', activityId: 'test:reading-full-004' }],
  } as unknown as Parameters<typeof unseenCheckpointLinks>[0];
  assert.deepEqual(unseenCheckpointLinks(unseenPlan, rankings), [{ skill: 'reading', testId: 'reading-full-004', fromPlan: true }]);
});

test('the Tests page keeps every destination: rotation tiles, Writing, Speaking, the mock, Practice, the band guide, the credit and the list of every paper', () => {
  const page = readFileSync('src/pages/tests/index.astro', 'utf8');
  for (const needle of [
    'data-rotation-key="ielts.rotation.reading-tests.v1"',
    'data-rotation-key="ielts.rotation.listening-tests.v1"',
    "withBase('/writing/checker')",
    "withBase('/speaking/examiner')",
    "withBase('/tests/mock')",
    "withBase('/trainers')",
    "withBase('/learn/bands')",
    'https://practicepteonline.com/listening-ielts-tests/',
    '<PracticeOrTest current="tests" />',
    '<TestsHubCheckpoints client:load />',
    "withBase('/tests/all')",
  ]) {
    assert.ok(page.includes(needle), `missing: ${needle}`);
  }
  // The list of every paper moved to its own page on 8 October 2026; it keeps
  // the checkpoint badges and the Reading / Listening tabs.
  const all = readFileSync('src/pages/tests/all.astro', 'utf8');
  for (const needle of ['<TestsHubCheckpoints client:load />', 'data-checkpoint-target={test.id}', 'data-catalog-tabs', "withBase('/tests')"]) {
    assert.ok(all.includes(needle), `all papers page missing: ${needle}`);
  }
  // The gated build still guards the two rotation tiles.
  assert.equal((page.match(/data-paid-feature=\{trialBuild \? 'test' : undefined\}/g) ?? []).length, 2);
});

test('the warnings that left the Tests page are said on each start screen', () => {
  const player = readFileSync('src/components/TestPlayer.tsx', 'utf8');
  assert.match(player, /t\('The clock cannot be paused\.'\)/);
  assert.match(player, /t\('Use headphones if you can\.'\)/);
  const live = readFileSync('src/components/LiveExaminer.tsx', 'utf8');
  assert.equal((live.match(/t\('Microphone access required\.'\)/g) ?? []).length, 2);
  const writing = readFileSync('src/components/WritingTester.tsx', 'utf8');
  assert.match(writing, /A different exam-style prompt each attempt\. Just you and the question, under exam conditions\./);
});
