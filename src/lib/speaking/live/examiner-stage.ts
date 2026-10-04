/* Which picture of Ms. Taylor is on screen, decided from what the live
   session already exposes (Alex, 4 October 2026).

   The interview screen (src/components/speaking/ExaminerStage.tsx) asks this
   module about sixty times a second, from the examiner's existing animation
   loop, and writes the answer straight to the page: React never re-renders
   for a mouth movement. Everything here is pure (the clock and the random
   numbers come in from outside), so the whole behaviour is pinned by
   tests/examiner-stage.test.ts.

   Two layers.
   1. pickScene: WHAT is happening (connecting, she is speaking, your turn,
      the short pause after you stop, the Part 2 minute, your two-minute talk,
      the Part 3 discussion, finishing, closed). It reads the test stage and
      who is speaking, never what was said: nothing here reacts to the
      quality of an answer, and nothing can.
   2. createFrameDriver: WHICH FRAME shows that scene, moment to moment. Her
      mouth follows her voice level in four bands (smoothed, and at most
      twelve changes a second), she blinks every four to six seconds while
      she listens, and she glances at her notes in the pause between your
      answer and her reply.

   Reduced motion (prefers-reduced-motion): no blinks, no breathing and no
   crossfades (the stage swaps frames instantly), and while she speaks the
   mouth holds ONE open frame (`speak2`) instead of following her voice.
   The scene still changes, so the picture always matches who has the turn,
   but nothing flickers. */

import type { ExaminerFrame } from './examiner-art';

/** The test's own stage, as LiveExaminer.tsx keeps it. */
export type TestStage = 'part1' | 'part2prep' | 'part2talk' | 'part3' | 'wrapup';

export type ExaminerScene =
  | 'connecting' // joining the call
  | 'speaking' // her voice is playing
  | 'your-turn' // she is listening to you
  | 'pause' // you stopped a moment ago and she has not replied yet
  | 'prep' // the Part 2 preparation minute: she writes
  | 'talk' // your Part 2 talk: she listens
  | 'discussion' // Part 3: she leans in slightly
  | 'finishing' // the test is being concluded, before the closing line
  | 'closed'; // the closing line has been said: folder closed

/** What the screen knows about the test right now (changes a few times a
    minute, not every frame). */
export interface StageSignals {
  phase: 'connecting' | 'interview';
  stage: TestStage;
  /** The Part 2 preparation minute is counting down. */
  prepRunning: boolean;
  /** The closing line was heard, or the finish has begun. */
  closing: boolean;
  /** The finish has begun (the connection is being closed): nothing more
      will be said. */
  finished: boolean;
  /** A Part 2 drill's rounding-off question is still being asked and
      answered, so `wrapup` is still a conversation. */
  roundingOff: boolean;
}

/** What the audio says right now (every animation frame). */
export interface LevelSample {
  /** performance.now() */
  now: number;
  /** Her output loudness, 0 to 1. */
  output: number;
  /** The student's microphone loudness, 0 to 1. */
  mic: number;
  /** The link's own "examiner audio is playing" flag. */
  speaking: boolean;
}

/* ── tuning ──────────────────────────────────────────────────────────── */

/** At most twelve frame changes a second. */
export const MIN_FRAME_MS = Math.ceil(1000 / 12);
/** Reduced motion: no faster than four changes a second. */
export const REDUCED_MIN_FRAME_MS = 250;
/** Smoothing per sample (about 60 a second): a mouth that follows syllables,
    not individual audio frames. */
const OUTPUT_SMOOTHING = 0.35;
const MIC_SMOOTHING = 0.3;
/** Smoothed output level bands for the mouth. */
export const MOUTH_BANDS = { closed: 0.06, slight: 0.16, open: 0.3 } as const;
/** The student counts as speaking above this smoothed mic level. */
export const MIC_SPEECH_LEVEL = 0.08;
/** The student must have spoken this long in the turn for a pause to count. */
export const MIN_ANSWER_MS = 600;
/** Quiet this long after the student's speech before she glances down. */
export const PAUSE_AFTER_MS = 700;
/** She looks back up after this long, if she has still not replied (the
    student may simply be thinking). */
export const GLANCE_MAX_MS = 3500;
/** Blinks while she listens: every four to six seconds, randomised. */
export const BLINK_EVERY_MIN_MS = 4000;
export const BLINK_EVERY_MAX_MS = 6000;
/** While she speaks, an occasional blink, less often. */
export const SPEAK_BLINK_MIN_MS = 3500;
export const SPEAK_BLINK_MAX_MS = 7000;
export const BLINK_MS = 140;

/* ── 1. the scene ────────────────────────────────────────────────────── */

/** Pure. `inPause`: the student has just stopped (see the driver). */
export function pickScene(signals: StageSignals, examinerSpeaking: boolean, inPause: boolean): ExaminerScene {
  if (signals.phase === 'connecting') return 'connecting';
  if (signals.finished) return 'closed';
  if (signals.closing) return examinerSpeaking ? 'speaking' : 'closed';
  if (examinerSpeaking) return 'speaking';
  switch (signals.stage) {
    case 'part2prep':
      return signals.prepRunning ? 'prep' : inPause ? 'pause' : 'your-turn';
    case 'part2talk':
      return inPause ? 'pause' : 'talk';
    case 'part3':
      return inPause ? 'pause' : 'discussion';
    case 'wrapup':
      if (signals.roundingOff) return inPause ? 'pause' : 'your-turn';
      return 'finishing';
    default:
      return inPause ? 'pause' : 'your-turn';
  }
}

/** The resting frame of each scene (before blinks and mouth movement). */
export const SCENE_FRAME: Readonly<Record<ExaminerScene, ExaminerFrame>> = {
  connecting: 'greet',
  speaking: 'listen',
  'your-turn': 'listen',
  pause: 'glance',
  prep: 'write',
  talk: 'listen',
  discussion: 'lean',
  finishing: 'glance',
  closed: 'close',
};

/** Scenes in which she blinks (only over `listen`, the frame `blink` is
    aligned with). */
const BLINKING_SCENES: ReadonlySet<ExaminerScene> = new Set(['your-turn', 'talk', 'speaking']);

/** Scenes in which the portrait breathes (a 1 to 2 percent scale, CSS). */
export function sceneBreathes(scene: ExaminerScene): boolean {
  return scene === 'your-turn' || scene === 'talk' || scene === 'discussion';
}

/** The mouth frame for a smoothed output level. Pure. */
export function mouthFrame(level: number): ExaminerFrame {
  if (level < MOUTH_BANDS.closed) return 'listen';
  if (level < MOUTH_BANDS.slight) return 'speak1';
  if (level < MOUTH_BANDS.open) return 'speak2';
  return 'speak3';
}

/* ── 2. the frame, moment to moment ──────────────────────────────────── */

export interface FrameState {
  scene: ExaminerScene;
  frame: ExaminerFrame;
  /** Smoothed student mic level, 0 to 1, for the quiet level indicator. */
  mic: number;
  /** The student is speaking right now (smoothed). */
  studentSpeaking: boolean;
}

export interface FrameDriver {
  step(signals: StageSignals, sample: LevelSample): FrameState;
}

export interface FrameDriverOptions {
  reducedMotion: boolean;
  /** 0 to 1, Math.random in the page; fixed in tests. */
  random?: () => number;
}

export function createFrameDriver({ reducedMotion, random = Math.random }: FrameDriverOptions): FrameDriver {
  let out = 0;
  let mic = 0;
  let frame: ExaminerFrame | null = null;
  let lastChangeAt = -Infinity;
  /* The student's turn: how long they have spoken since she last spoke,
     and when they were last heard. */
  let answerMs = 0;
  let lastLoudAt = -Infinity;
  let lastSampleAt: number | null = null;
  /* Blinks. */
  let nextBlinkAt: number | null = null;
  let blinkUntil = -Infinity;

  const between = (min: number, max: number) => min + random() * (max - min);

  return {
    step(signals, sample) {
      const { now } = sample;
      const dt = lastSampleAt === null ? 0 : Math.max(0, Math.min(250, now - lastSampleAt));
      lastSampleAt = now;

      out += (sample.output - out) * OUTPUT_SMOOTHING;
      mic += (sample.mic - mic) * MIC_SMOOTHING;
      const studentSpeaking = mic > MIC_SPEECH_LEVEL;

      /* Her voice starts a new turn: whatever the student said is over. */
      if (sample.speaking) answerMs = 0;
      else if (studentSpeaking) {
        answerMs += dt;
        lastLoudAt = now;
      }
      const quietFor = now - lastLoudAt;
      const inPause =
        !sample.speaking && answerMs >= MIN_ANSWER_MS && quietFor >= PAUSE_AFTER_MS && quietFor < PAUSE_AFTER_MS + GLANCE_MAX_MS;

      const scene = pickScene(signals, sample.speaking, inPause);

      let want: ExaminerFrame = SCENE_FRAME[scene];
      if (scene === 'speaking') {
        want = reducedMotion ? 'speak2' : mouthFrame(out);
      }

      /* Blinks: only where `blink` lines up with the frame on screen (the
         resting `listen`, or a closed mouth while she speaks), never under
         reduced motion. */
      if (!reducedMotion && BLINKING_SCENES.has(scene)) {
        const speakingScene = scene === 'speaking';
        if (nextBlinkAt === null) {
          nextBlinkAt = now + (speakingScene ? between(SPEAK_BLINK_MIN_MS, SPEAK_BLINK_MAX_MS) : between(BLINK_EVERY_MIN_MS, BLINK_EVERY_MAX_MS));
        }
        if (now >= nextBlinkAt && want === 'listen') {
          blinkUntil = now + BLINK_MS;
          nextBlinkAt = now + (speakingScene ? between(SPEAK_BLINK_MIN_MS, SPEAK_BLINK_MAX_MS) : between(BLINK_EVERY_MIN_MS, BLINK_EVERY_MAX_MS));
        }
        if (now < blinkUntil && want === 'listen') want = 'blink';
      } else {
        nextBlinkAt = null;
        blinkUntil = -Infinity;
      }

      /* At most twelve changes a second (four under reduced motion). A
         change of scene that is not a mouth movement is held to the same
         limit, which only ever delays it by a few frames. */
      const minGap = reducedMotion ? REDUCED_MIN_FRAME_MS : MIN_FRAME_MS;
      if (frame === null || (want !== frame && now - lastChangeAt >= minGap)) {
        if (want !== frame) lastChangeAt = now;
        frame = want;
      }

      return { scene, frame, mic: Math.min(1, mic), studentSpeaking };
    },
  };
}

/* ── the design preview ──────────────────────────────────────────────── */

/** ?preview on /speaking/examiner: synthetic levels so every state can be
    reviewed without a microphone, a session or any cost. A 9.5 second
    cycle: she speaks for 4.5 s, the student answers for 3 s, then 2 s of
    quiet (the glance) before she speaks again. */
export const PREVIEW_CYCLE_MS = 9500;

export function previewSample(now: number, mode: 'conversation' | 'prep' | 'talk' = 'conversation'): LevelSample {
  /* The preparation minute is silent (her mic is off, his is muted); the
     two-minute talk is the student speaking throughout. */
  if (mode === 'prep') return { now, output: 0, mic: 0, speaking: false };
  if (mode === 'talk') {
    const w = (Math.sin(now / 110) + Math.sin(now / 47) + 2) / 4;
    return { now, output: 0, mic: 0.1 + w * 0.4, speaking: false };
  }
  const t = now % PREVIEW_CYCLE_MS;
  const wobble = (Math.sin(now / 90) + Math.sin(now / 41) + 2) / 4;
  /* Syllables: short dips between words, so all four mouth bands show. */
  const syllable = Math.abs(Math.sin(now / 130));
  if (t < 4500) return { now, output: 0.04 + syllable * (0.2 + wobble * 0.3), mic: 0, speaking: true };
  if (t < 7500) return { now, output: 0, mic: 0.12 + wobble * 0.4, speaking: false };
  return { now, output: 0, mic: 0, speaking: false };
}
