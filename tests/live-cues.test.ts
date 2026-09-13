import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDirectorCue,
  nextStage,
  cueText,
  cueEvent,
  CueError,
  type DirectorCue,
  type SessionStage,
} from '../src/lib/speaking/live/cues.ts';

const MODES = ['full', 'part1', 'part2', 'part3'] as const;
const DRILL_MODES = ['part1', 'part2', 'part3'] as const;

// ---- parseDirectorCue: accept ----

test('parseDirectorCue accepts every well-formed cue shape', () => {
  const inputs: unknown[] = [
    { type: 'begin' },
    { type: 'part2_intro' },
    { type: 'part2_talk' },
    { type: 'part2_end', timeUp: true },
    { type: 'part2_end', timeUp: false },
    { type: 'conclude', reason: 'time' },
    { type: 'conclude', reason: 'candidate' },
    { type: 'delegation', delegationId: 'item_1' },
  ];
  for (const input of inputs) {
    const cue = parseDirectorCue(input);
    assert.deepEqual(cue, input as DirectorCue);
  }
});

test('parseDirectorCue accepts delegationId at the boundary lengths (1 and 80 chars)', () => {
  const short = parseDirectorCue({ type: 'delegation', delegationId: 'a' });
  assert.deepEqual(short, { type: 'delegation', delegationId: 'a' });
  const long = parseDirectorCue({ type: 'delegation', delegationId: 'a'.repeat(80) });
  assert.deepEqual(long, { type: 'delegation', delegationId: 'a'.repeat(80) });
});

test('parseDirectorCue accepts delegationId with letters, digits, underscore and hyphen', () => {
  const cue = parseDirectorCue({ type: 'delegation', delegationId: 'Item-9_ABC' });
  assert.deepEqual(cue, { type: 'delegation', delegationId: 'Item-9_ABC' });
});

// ---- parseDirectorCue: reject ----

test('parseDirectorCue rejects non-object input', () => {
  for (const bad of [null, undefined, 42, 'begin', ['begin'], true]) {
    assert.throws(() => parseDirectorCue(bad), CueError);
  }
});

test('parseDirectorCue rejects a missing or unknown type', () => {
  assert.throws(() => parseDirectorCue({}), CueError);
  assert.throws(() => parseDirectorCue({ type: 'fly' }), CueError);
  assert.throws(() => parseDirectorCue({ type: 'Begin' }), CueError);
  assert.throws(() => parseDirectorCue({ type: '' }), CueError);
});

test('parseDirectorCue rejects part2_end with a missing or invalid timeUp', () => {
  assert.throws(() => parseDirectorCue({ type: 'part2_end' }), CueError);
  assert.throws(() => parseDirectorCue({ type: 'part2_end', timeUp: 'yes' }), CueError);
  assert.throws(() => parseDirectorCue({ type: 'part2_end', timeUp: null }), CueError);
  assert.throws(() => parseDirectorCue({ type: 'part2_end', timeUp: 1 }), CueError);
});

test('parseDirectorCue rejects conclude with a missing or invalid reason', () => {
  assert.throws(() => parseDirectorCue({ type: 'conclude' }), CueError);
  assert.throws(() => parseDirectorCue({ type: 'conclude', reason: 'whenever' }), CueError);
  assert.throws(() => parseDirectorCue({ type: 'conclude', reason: 'Time' }), CueError);
  assert.throws(() => parseDirectorCue({ type: 'conclude', reason: 42 }), CueError);
});

test('parseDirectorCue rejects delegation with a missing, mistyped, or malformed delegationId', () => {
  assert.throws(() => parseDirectorCue({ type: 'delegation' }), CueError);
  assert.throws(() => parseDirectorCue({ type: 'delegation', delegationId: 123 }), CueError);
  assert.throws(() => parseDirectorCue({ type: 'delegation', delegationId: '' }), CueError, 'empty string is too short');
  assert.throws(
    () => parseDirectorCue({ type: 'delegation', delegationId: 'a'.repeat(81) }),
    CueError,
    'too long',
  );
  assert.throws(
    () => parseDirectorCue({ type: 'delegation', delegationId: 'bad id!' }),
    CueError,
    'spaces and punctuation are not allowed',
  );
  assert.throws(
    () => parseDirectorCue({ type: 'delegation', delegationId: 'слово' }),
    CueError,
    'non-ASCII characters are not allowed',
  );
});

// ---- nextStage: positive transitions ----

test('begin moves created to the mode-specific first stage', () => {
  assert.equal(nextStage('full', 'created', { type: 'begin' }), 'part1');
  assert.equal(nextStage('part1', 'created', { type: 'begin' }), 'part1');
  assert.equal(nextStage('part2', 'created', { type: 'begin' }), 'part2prep');
  assert.equal(nextStage('part3', 'created', { type: 'begin' }), 'part3');
});

test('part2_intro moves part1 to part2prep, full mode only', () => {
  assert.equal(nextStage('full', 'part1', { type: 'part2_intro' }), 'part2prep');
});

test('part2_talk moves part2prep to part2talk for full and part2', () => {
  assert.equal(nextStage('full', 'part2prep', { type: 'part2_talk' }), 'part2talk');
  assert.equal(nextStage('part2', 'part2prep', { type: 'part2_talk' }), 'part2talk');
});

test('part2_end moves part2talk to part3 for full, and to wrapup for part2, regardless of timeUp', () => {
  assert.equal(nextStage('full', 'part2talk', { type: 'part2_end', timeUp: true }), 'part3');
  assert.equal(nextStage('full', 'part2talk', { type: 'part2_end', timeUp: false }), 'part3');
  assert.equal(nextStage('part2', 'part2talk', { type: 'part2_end', timeUp: true }), 'wrapup');
  assert.equal(nextStage('part2', 'part2talk', { type: 'part2_end', timeUp: false }), 'wrapup');
});

test('conclude moves part1, part2prep, part2talk and part3 to wrapup, for any mode and either reason', () => {
  const concludingStages: SessionStage[] = ['part1', 'part2prep', 'part2talk', 'part3'];
  for (const mode of MODES) {
    for (const stage of concludingStages) {
      assert.equal(nextStage(mode, stage, { type: 'conclude', reason: 'time' }), 'wrapup');
      assert.equal(nextStage(mode, stage, { type: 'conclude', reason: 'candidate' }), 'wrapup');
    }
  }
});

test('delegation stays on the same stage from any stage except ended', () => {
  const stages: SessionStage[] = ['created', 'part1', 'part2prep', 'part2talk', 'part3', 'wrapup'];
  for (const mode of MODES) {
    for (const stage of stages) {
      assert.equal(nextStage(mode, stage, { type: 'delegation', delegationId: 'd1' }), stage);
    }
  }
});

// ---- nextStage: representative negatives ----

test('begin is rejected once the session has already begun, or once it has ended', () => {
  assert.equal(nextStage('full', 'part1', { type: 'begin' }), null);
  assert.equal(nextStage('full', 'wrapup', { type: 'begin' }), null);
  assert.equal(nextStage('full', 'ended', { type: 'begin' }), null);
  assert.equal(nextStage('part2', 'part2prep', { type: 'begin' }), null);
});

test('part2_intro is rejected for non-full modes and for the wrong stage', () => {
  assert.equal(nextStage('part1', 'part1', { type: 'part2_intro' }), null);
  assert.equal(nextStage('part2', 'part2prep', { type: 'part2_intro' }), null);
  assert.equal(nextStage('part3', 'part3', { type: 'part2_intro' }), null);
  assert.equal(nextStage('full', 'created', { type: 'part2_intro' }), null);
  assert.equal(nextStage('full', 'part2prep', { type: 'part2_intro' }), null);
});

test('part2_talk is rejected for part1 and part3 modes and for the wrong stage', () => {
  assert.equal(nextStage('part1', 'part2prep', { type: 'part2_talk' }), null);
  assert.equal(nextStage('part3', 'part2prep', { type: 'part2_talk' }), null);
  assert.equal(nextStage('full', 'created', { type: 'part2_talk' }), null);
  assert.equal(nextStage('part2', 'created', { type: 'part2_talk' }), null);
});

test('part2_end is rejected for part1 and part3 modes and for the wrong stage', () => {
  assert.equal(nextStage('part1', 'part2talk', { type: 'part2_end', timeUp: true }), null);
  assert.equal(nextStage('part3', 'part2talk', { type: 'part2_end', timeUp: true }), null);
  assert.equal(nextStage('full', 'part1', { type: 'part2_end', timeUp: true }), null);
  assert.equal(nextStage('part2', 'part2prep', { type: 'part2_end', timeUp: false }), null);
});

test('conclude is rejected from created, wrapup and ended', () => {
  for (const mode of MODES) {
    assert.equal(nextStage(mode, 'created', { type: 'conclude', reason: 'time' }), null);
    assert.equal(nextStage(mode, 'wrapup', { type: 'conclude', reason: 'candidate' }), null);
    assert.equal(nextStage(mode, 'ended', { type: 'conclude', reason: 'time' }), null);
  }
});

test('delegation is rejected once the session has ended', () => {
  for (const mode of MODES) {
    assert.equal(nextStage(mode, 'ended', { type: 'delegation', delegationId: 'd1' }), null);
  }
});

// ---- cueText: text facts ----

test('begin text tells the candidate to speak first, in every mode', () => {
  for (const mode of MODES) {
    assert.ok(cueText(mode, { type: 'begin' }).includes('Speak first now'), `mode ${mode}`);
  }
});

test('part2_end text for part2 with timeUp mentions the two-minute cutoff and rounding off', () => {
  const text = cueText('part2', { type: 'part2_end', timeUp: true });
  assert.ok(text.includes('Two minutes are up'));
  assert.ok(text.includes('rounding-off'));
});

test('part2_end text for full without timeUp mentions moving on to Part 3', () => {
  const text = cueText('full', { type: 'part2_end', timeUp: false });
  assert.ok(text.includes('Part 3'));
});

test('conclude text for reason time starts with the right sentence for full tests vs drills', () => {
  assert.ok(cueText('full', { type: 'conclude', reason: 'time' }).startsWith('The test time is over.'));
  for (const mode of DRILL_MODES) {
    assert.ok(
      cueText(mode, { type: 'conclude', reason: 'time' }).startsWith('The drill time is over.'),
      `mode ${mode}`,
    );
  }
});

test('conclude text for reason candidate mentions being asked to finish, in every mode', () => {
  for (const mode of MODES) {
    assert.ok(cueText(mode, { type: 'conclude', reason: 'candidate' }).includes('asked to finish'), `mode ${mode}`);
  }
});

// ---- cueEvent: shapes ----

test('every non-delegation cueEvent is a director instruction append with no delegation id', () => {
  const cues: DirectorCue[] = [
    { type: 'begin' },
    { type: 'part2_intro' },
    { type: 'part2_talk' },
    { type: 'part2_end', timeUp: true },
    { type: 'conclude', reason: 'time' },
    { type: 'conclude', reason: 'candidate' },
  ];
  for (const cue of cues) {
    const ev = cueEvent('full', cue, 'evt_1');
    assert.equal(ev.type, 'session.instructions.append');
    assert.equal(ev.delegation_id, null);
    assert.equal(ev.event_id, 'evt_1');
    assert.equal(typeof ev.content, 'string');
    assert.ok(ev.content.startsWith('[DIRECTOR] '), `content should start with [DIRECTOR]: ${ev.content}`);
  }
});

test('a delegation cueEvent is a thinking append carrying the delegation id', () => {
  const cue: DirectorCue = { type: 'delegation', delegationId: 'item_42' };
  const ev = cueEvent('full', cue, 'evt_2');
  assert.equal(ev.type, 'session.thinking.append');
  assert.equal(ev.delegation_id, 'item_42');
  assert.equal(ev.event_id, 'evt_2');
  assert.equal(typeof ev.content, 'string');
  assert.ok(ev.content.length > 0);
});
