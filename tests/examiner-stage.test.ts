/* Ms. Taylor's frames (src/lib/speaking/live/examiner-stage.ts): which
   picture is on screen, given the test stage, who is speaking and the audio
   levels. Pure, so the clock and the random numbers are fixed here. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BLINK_EVERY_MAX_MS,
  BLINK_EVERY_MIN_MS,
  BLINK_MS,
  GLANCE_MAX_MS,
  MIN_FRAME_MS,
  PAUSE_AFTER_MS,
  PREVIEW_CYCLE_MS,
  SCENE_FRAME,
  createFrameDriver,
  mouthFrame,
  pickScene,
  previewSample,
  sceneBreathes,
  type LevelSample,
  type StageSignals,
} from '../src/lib/speaking/live/examiner-stage.ts';
import { EXAMINER_FRAMES, type ExaminerFrame } from '../src/lib/speaking/live/examiner-art.ts';

const base: StageSignals = {
  phase: 'interview',
  stage: 'part1',
  prepRunning: false,
  closing: false,
  finished: false,
  roundingOff: false,
};
const sig = (over: Partial<StageSignals> = {}): StageSignals => ({ ...base, ...over });

/** Runs a driver at 60 frames a second through `ms`, returning every frame. */
function run(
  driver: ReturnType<typeof createFrameDriver>,
  signals: StageSignals,
  from: number,
  ms: number,
  sample: (now: number) => Omit<LevelSample, 'now'>,
) {
  const frames: { now: number; frame: ExaminerFrame; scene: string; mic: number }[] = [];
  for (let now = from; now < from + ms; now += 1000 / 60) {
    const s = driver.step(signals, { now, ...sample(now) });
    frames.push({ now, frame: s.frame, scene: s.scene, mic: s.mic });
  }
  return frames;
}

const quiet = () => ({ output: 0, mic: 0, speaking: false });

test('every scene rests on a frame the artwork contract defines', () => {
  for (const frame of Object.values(SCENE_FRAME)) assert.ok(EXAMINER_FRAMES.includes(frame), frame);
});

test('the scene follows the test stage and who is speaking', () => {
  assert.equal(pickScene(sig({ phase: 'connecting' }), false, false), 'connecting');
  assert.equal(pickScene(sig({ phase: 'connecting' }), true, false), 'connecting');
  assert.equal(pickScene(sig(), true, false), 'speaking');
  assert.equal(pickScene(sig(), false, false), 'your-turn');
  assert.equal(pickScene(sig(), false, true), 'pause');
  assert.equal(pickScene(sig({ stage: 'part2prep' }), true, false), 'speaking', 'she reads the cue card out');
  assert.equal(pickScene(sig({ stage: 'part2prep', prepRunning: true }), false, false), 'prep');
  assert.equal(pickScene(sig({ stage: 'part2prep', prepRunning: true }), false, true), 'prep', 'no glance while she writes');
  assert.equal(pickScene(sig({ stage: 'part2talk' }), false, false), 'talk');
  assert.equal(pickScene(sig({ stage: 'part2talk' }), false, true), 'pause');
  assert.equal(pickScene(sig({ stage: 'part3' }), false, false), 'discussion');
  assert.equal(pickScene(sig({ stage: 'part3' }), true, false), 'speaking');
  assert.equal(pickScene(sig({ stage: 'part3' }), false, true), 'pause');
});

test('finishing, the closing line and the end', () => {
  assert.equal(pickScene(sig({ stage: 'wrapup' }), false, false), 'finishing');
  assert.equal(pickScene(sig({ stage: 'wrapup' }), true, false), 'speaking');
  assert.equal(pickScene(sig({ stage: 'wrapup', roundingOff: true }), false, false), 'your-turn', 'a Part 2 drill still asks one question');
  assert.equal(pickScene(sig({ stage: 'wrapup', closing: true }), true, false), 'speaking', 'her closing line still moves her mouth');
  assert.equal(pickScene(sig({ stage: 'wrapup', closing: true }), false, false), 'closed');
  assert.equal(pickScene(sig({ stage: 'part1', closing: true, finished: true }), true, false), 'closed', 'nothing is said after the finish begins');
  assert.equal(SCENE_FRAME.closed, 'close');
  assert.equal(SCENE_FRAME.connecting, 'greet');
  assert.equal(SCENE_FRAME.prep, 'write');
  assert.equal(SCENE_FRAME.discussion, 'lean');
  assert.equal(SCENE_FRAME.pause, 'glance');
});

test('only the listening scenes breathe', () => {
  assert.equal(sceneBreathes('your-turn'), true);
  assert.equal(sceneBreathes('talk'), true);
  assert.equal(sceneBreathes('discussion'), true);
  for (const s of ['connecting', 'speaking', 'pause', 'prep', 'finishing', 'closed'] as const) assert.equal(sceneBreathes(s), false, s);
});

test('mouth bands map a smoothed level to the four mouth frames', () => {
  assert.equal(mouthFrame(0), 'listen');
  assert.equal(mouthFrame(0.05), 'listen');
  assert.equal(mouthFrame(0.1), 'speak1');
  assert.equal(mouthFrame(0.2), 'speak2');
  assert.equal(mouthFrame(0.5), 'speak3');
  assert.equal(mouthFrame(1), 'speak3');
});

test('while she speaks the mouth follows her voice, all four frames, at most twelve changes a second', () => {
  const driver = createFrameDriver({ reducedMotion: false, random: () => 0.5 });
  // A slow swell first: every band is crossed slowly enough to show.
  const swell = run(driver, sig(), 0, 4000, (now) => ({ output: Math.abs(Math.sin(now / 640)) * 0.5, mic: 0, speaking: true }));
  const seen = new Set(swell.map((f) => f.frame));
  for (const f of ['listen', 'speak1', 'speak2', 'speak3'] as const) assert.ok(seen.has(f), `saw ${f}`);
  // Then syllable-fast speech, which the limit has to hold back.
  const frames = run(driver, sig(), 4000, 6000, (now) => ({ output: Math.abs(Math.sin(now / 60)) * 0.6, mic: 0, speaking: true }));
  for (const f of frames) assert.equal(f.scene, 'speaking');
  let changes = 0;
  let last: (typeof frames)[number] | null = null;
  let lastChangeAt = -Infinity;
  for (const f of frames) {
    if (last && f.frame !== last.frame) {
      changes += 1;
      assert.ok(f.now - lastChangeAt >= MIN_FRAME_MS - 0.001, `changes ${Math.round(f.now - lastChangeAt)} ms apart`);
      lastChangeAt = f.now;
    }
    last = f;
  }
  assert.ok(changes <= 12 * 6 + 1, `${changes} changes in six seconds`);
  assert.ok(changes > 12, 'and it really does move');
});

test('a single noisy audio frame does not open her mouth (smoothing)', () => {
  const driver = createFrameDriver({ reducedMotion: false, random: () => 0.5 });
  run(driver, sig(), 0, 500, () => ({ output: 0, mic: 0, speaking: true }));
  const spike = driver.step(sig(), { now: 600, output: 0.12, mic: 0, speaking: true });
  assert.equal(spike.frame, 'listen');
});

test('on your turn she listens and blinks every four to six seconds', () => {
  const values = [0, 1, 0.5, 0.25];
  let i = 0;
  const driver = createFrameDriver({ reducedMotion: false, random: () => values[i++ % values.length]! });
  const frames = run(driver, sig(), 0, 30_000, quiet);
  const blinkStarts: number[] = [];
  frames.forEach((f, k) => {
    if (f.frame === 'blink' && frames[k - 1]?.frame !== 'blink') blinkStarts.push(f.now);
  });
  assert.ok(blinkStarts.length >= 5 && blinkStarts.length <= 8, `${blinkStarts.length} blinks in 30 s`);
  for (let k = 1; k < blinkStarts.length; k++) {
    const gap = blinkStarts[k]! - blinkStarts[k - 1]!;
    assert.ok(gap >= BLINK_EVERY_MIN_MS - 20 && gap <= BLINK_EVERY_MAX_MS + 120, `blink gap ${Math.round(gap)} ms`);
  }
  for (const f of frames) assert.ok(f.frame === 'listen' || f.frame === 'blink', f.frame);
  const blinkFrames = frames.filter((f) => f.frame === 'blink').length;
  assert.ok(blinkFrames <= blinkStarts.length * Math.ceil((BLINK_MS + MIN_FRAME_MS) / (1000 / 60)), 'blinks are short');
});

test('the pause after the student stops: a glance, then back to listening if she still has not replied', () => {
  const driver = createFrameDriver({ reducedMotion: false, random: () => 0.99 });
  // The student answers for two seconds.
  run(driver, sig(), 0, 2000, () => ({ output: 0, mic: 0.4, speaking: false }));
  // Just stopped: still listening.
  const soon = run(driver, sig(), 2000, 300, quiet);
  assert.ok(soon.every((f) => f.frame === 'listen'), 'not straight away');
  const later = run(driver, sig(), 2300, 1500, quiet);
  assert.ok(later.some((f) => f.frame === 'glance' && f.scene === 'pause'), 'glances down');
  // Long silence: the student is thinking, she looks back up.
  const thinking = run(driver, sig(), 3800, PAUSE_AFTER_MS + GLANCE_MAX_MS, quiet);
  assert.equal(thinking.at(-1)!.frame, 'listen');
  // Her voice starts: the turn is over, and the next quiet is not a pause.
  run(driver, sig(), 9000, 1000, () => ({ output: 0.3, mic: 0, speaking: true }));
  const afterHer = run(driver, sig(), 10_000, 2000, quiet);
  assert.ok(afterHer.every((f) => f.frame !== 'glance'), 'no glance without an answer');
});

test('a cough or a short noise is not an answer: no glance', () => {
  const driver = createFrameDriver({ reducedMotion: false, random: () => 0.99 });
  run(driver, sig(), 0, 200, () => ({ output: 0, mic: 0.5, speaking: false }));
  const after = run(driver, sig(), 200, 2500, quiet);
  assert.ok(after.every((f) => f.frame !== 'glance'));
});

test('Part 2: she writes during the minute, listens during the talk; Part 3: she leans in', () => {
  const driver = createFrameDriver({ reducedMotion: false, random: () => 0.5 });
  const prep = run(driver, sig({ stage: 'part2prep', prepRunning: true }), 0, 1000, quiet);
  assert.equal(prep.at(-1)!.frame, 'write');
  const talk = run(driver, sig({ stage: 'part2talk' }), 1000, 1000, () => ({ output: 0, mic: 0.3, speaking: false }));
  assert.equal(talk.at(-1)!.frame, 'listen');
  assert.ok(talk.at(-1)!.mic > 0.2, 'the student mic level reaches the indicator');
  run(driver, sig({ stage: 'part2talk' }), 2000, 1000, () => ({ output: 0.3, mic: 0, speaking: true }));
  const discussion = run(driver, sig({ stage: 'part3' }), 3000, 1000, quiet);
  assert.equal(discussion.at(-1)!.frame, 'lean');
});

test('connecting greets; the end closes the folder and stays closed', () => {
  const driver = createFrameDriver({ reducedMotion: false, random: () => 0.5 });
  assert.equal(run(driver, sig({ phase: 'connecting' }), 0, 500, quiet).at(-1)!.frame, 'greet');
  const closingLine = run(driver, sig({ stage: 'wrapup', closing: true }), 500, 1000, () => ({ output: 0.4, mic: 0, speaking: true }));
  assert.ok(closingLine.some((f) => f.frame.startsWith('speak')));
  const closed = run(driver, sig({ stage: 'wrapup', closing: true, finished: true }), 1500, 2000, quiet);
  assert.ok(closed.slice(10).every((f) => f.frame === 'close'));
});

test('reduced motion: one open mouth while she speaks, no blinks, slower changes', () => {
  const driver = createFrameDriver({ reducedMotion: true, random: () => 0 });
  const speaking = run(driver, sig(), 0, 3000, (now) => ({ output: Math.abs(Math.sin(now / 130)) * 0.6, mic: 0, speaking: true }));
  assert.ok(speaking.slice(20).every((f) => f.frame === 'speak2'), 'a single speak2');
  const listening = run(driver, sig(), 3000, 20_000, quiet);
  assert.ok(listening.slice(20).every((f) => f.frame === 'listen'), 'no blinks');
});

test('nothing reacts to the quality of an answer: the driver is never given the words', () => {
  const source = fs.readFileSync(new URL('../src/lib/speaking/live/examiner-stage.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /transcript|caption|overallBand|criteria|score/i);
});

test('the design preview cycles through her speech, the answer and the pause', () => {
  const driver = createFrameDriver({ reducedMotion: false, random: () => 0.5 });
  const frames = run(driver, sig(), 0, PREVIEW_CYCLE_MS * 2, (now) => {
    const { output, mic, speaking } = previewSample(now);
    return { output, mic, speaking };
  });
  const scenes = new Set(frames.map((f) => f.scene));
  for (const s of ['speaking', 'your-turn', 'pause']) assert.ok(scenes.has(s), s);
  const seen = new Set(frames.map((f) => f.frame));
  for (const f of ['speak1', 'speak2', 'speak3', 'listen', 'glance'] as const) assert.ok(seen.has(f), f);
});
