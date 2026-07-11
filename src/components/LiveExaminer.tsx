/* The live AI examiner: a full mock IELTS Speaking test as a real-time voice
   conversation. The model (via workers/live-examiner tokens) speaks and
   listens; this component is the "test director" — it owns the clock and
   injects [DIRECTOR] cues at every boundary (Part 1 over, prep minute over,
   two-minute talk over, conclude), so the exam structure never depends on
   the model's own sense of time. In parallel, a MediaRecorder keeps the
   candidate's whole mic track; when the examiner says the closing line, the
   recording + transcript go to the grade-speaking Worker for the band
   report. Visuals are deliberately minimal: a talking orb, the current
   part, the cue card when it matters. */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { SpeakingCriterionKey, SpeakingGradeResult } from '../lib/speaking/schema';
import { SPEAKING_CRITERIA } from '../lib/speaking/schema';
import { releaseMic, pickMimeType } from '../lib/speaking/recorder';
import { MicCapture, ExaminerPlayback } from '../lib/speaking/live/audio';
import { ExaminerSession, type TranscriptTurn } from '../lib/speaking/live/session';
import { buildExamPlan, buildSystemInstruction, CLOSING_PHRASE, EXAMINER_NAME, type ExamPlan } from '../lib/speaking/live/script';
import { gradeInterview, gradingAvailable } from '../lib/speaking/live/grade';
import BandReport from './BandReport';

const TOKEN_URL: string | undefined = import.meta.env?.PUBLIC_LIVE_EXAMINER_URL;

/* The exam clock (all from session start unless noted). */
const PART2_AT_MS = 5.5 * 60_000; // intro + Part 1 budget
const PREP_MS = 60_000;
const TALK_MAX_MS = 2 * 60_000; // from end of prep
const PART3_MAX_MS = 4.5 * 60_000; // from Part 3 start
const HARD_STOP_MS = 18 * 60_000; // absolute safety net
const FORCE_END_GRACE_MS = 12_000; // after asking the examiner to conclude

type Phase = 'menu' | 'connecting' | 'interview' | 'grading' | 'report' | 'error';
type Stage = 'part1' | 'part2prep' | 'part2talk' | 'part3' | 'wrapup';

export default function LiveExaminer() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [stage, setStage] = useState<Stage>('part1');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(0);
  const [caption, setCaption] = useState('');
  const [showCaptions, setShowCaptions] = useState(true);
  const [examinerTalking, setExaminerTalking] = useState(false);
  const [elapsedS, setElapsedS] = useState(0);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<SpeakingGradeResult | null>(null);
  const [finalTranscript, setFinalTranscript] = useState<TranscriptTurn[]>([]);
  const [gradeStep, setGradeStep] = useState(0);

  useEffect(() => {
    if (phase !== 'grading') return;
    setGradeStep(0);
    // Advance through the steps once, then hold on the final "comparing
    // assessments" line until the real result lands.
    const i = setInterval(() => setGradeStep((s) => Math.min(s + 1, GRADING_STEPS.length - 1)), GRADE_STEP_MS);
    return () => clearInterval(i);
  }, [phase]);

  const planRef = useRef<ExamPlan | null>(null);
  const sessionRef = useRef<ExaminerSession | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playbackRef = useRef<ExaminerPlayback | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<BlobPart[]>([]);
  const recActiveSinceRef = useRef(0);
  const recAccumMsRef = useRef(0);
  const coreRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const micRingRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const stageRef = useRef<Stage>('part1');
  const endedRef = useRef(false);
  const forceEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  };
  const every = (fn: () => void, ms: number) => {
    const i = setInterval(fn, ms);
    intervalsRef.current.push(i);
    return i;
  };

  function setStageBoth(s: Stage) {
    stageRef.current = s;
    setStage(s);
  }
  /** Reads the ref through a call so TS doesn't narrow it across awaits. */
  const stageIs = (s: Stage) => stageRef.current === s;

  /* ── session start ─────────────────────────────────────────────────── */

  async function startTest() {
    if (!TOKEN_URL) return;
    setError(null);
    setNotice(null);
    setPhase('connecting');
    endedRef.current = false;
    recChunksRef.current = [];
    recAccumMsRef.current = 0;
    setNotes('');
    setCaption('');
    setResult(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setPhase('menu');
      setError('Microphone access is required — please allow the permission and try again.');
      return;
    }
    streamRef.current = stream;

    try {
      // Audio contexts are created close to the button click so mobile
      // browsers treat them as user-initiated.
      const playback = new ExaminerPlayback();
      await playback.start();
      playbackRef.current = playback;

      const mic = new MicCapture();
      await mic.start(stream, (chunk) => sessionRef.current?.sendAudioChunk(chunk));
      micRef.current = mic;

      const mime = pickMimeType();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      rec.start(1000);
      recActiveSinceRef.current = performance.now();
      recorderRef.current = rec;

      const plan = buildExamPlan();
      planRef.current = plan;

      const session = await ExaminerSession.connect(TOKEN_URL, buildSystemInstruction(plan), {
        onAudio: (chunk) => playbackRef.current?.enqueue(chunk),
        onInterrupted: () => playbackRef.current?.flush(),
        onTranscript: onTranscriptUpdate,
        onClosed: (reason, wasClean) => {
          if (endedRef.current) return;
          // The conversation died under us — salvage a report from whatever
          // was said rather than throwing the attempt away.
          setNotice(`The connection ended early (${wasClean ? reason || 'closed' : 'network problem'}). Grading what we have…`);
          void finishTest();
        },
        onError: () => {
          /* transient — onClosed decides what actually matters */
        },
      });
      sessionRef.current = session;
    } catch (e) {
      cleanupAudio();
      setPhase('menu');
      setError(e instanceof Error ? e.message : 'Could not start the examiner session.');
      return;
    }

    setPhase('interview');
    setStageBoth('part1');
    sessionRef.current.sendDirectorNote('The candidate is seated and ready. Begin the test now with the introduction.');

    const startedAt = performance.now();
    every(() => setElapsedS(Math.round((performance.now() - startedAt) / 1000)), 1000);
    every(() => setExaminerTalking(playbackRef.current?.isSpeaking() ?? false), 250);
    startOrbLoop();

    later(() => void beginPart2(), PART2_AT_MS);
    later(() => endEarly('The test time is over.'), HARD_STOP_MS);
  }

  /* ── transcript handling (captions + closing-phrase detection) ──────── */

  const transcriptFlushRef = useRef<TranscriptTurn[] | null>(null);
  function onTranscriptUpdate(turns: TranscriptTurn[]) {
    transcriptFlushRef.current = turns;
    const lastExaminer = [...turns].reverse().find((t) => t.role === 'examiner');
    if (lastExaminer && lastExaminer.text.toLowerCase().includes(CLOSING_PHRASE) && !endedRef.current) {
      if (forceEndTimerRef.current) clearTimeout(forceEndTimerRef.current);
      setStageBoth('wrapup');
      void (async () => {
        await playbackRef.current?.waitUntilDone();
        await finishTest();
      })();
    }
  }
  useEffect(() => {
    if (phase !== 'interview') return;
    const i = setInterval(() => {
      const turns = transcriptFlushRef.current;
      if (!turns) return;
      const lastExaminer = [...turns].reverse().find((t) => t.role === 'examiner');
      if (lastExaminer) setCaption(lastExaminer.text.slice(-220));
    }, 400);
    return () => clearInterval(i);
  }, [phase]);

  /* ── the exam clock ─────────────────────────────────────────────────── */

  /** Resolves once the examiner has spoken and gone quiet again (or after
      maxMs) — used so the prep countdown starts after the cue-card intro. */
  async function waitForExaminerQuiet(maxMs: number): Promise<void> {
    const deadline = performance.now() + maxMs;
    let heardSpeech = false;
    while (performance.now() < deadline && !endedRef.current) {
      const speaking = playbackRef.current?.isSpeaking() ?? false;
      if (speaking) heardSpeech = true;
      else if (heardSpeech) return;
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  async function beginPart2() {
    if (stageRef.current !== 'part1' || endedRef.current) return;
    setStageBoth('part2prep');
    sessionRef.current?.sendDirectorNote(
      'Part 1 is over. Introduce the Part 2 cue card now exactly as scripted, ending with "Your one minute starts now." Then wait in complete silence.',
    );
    // Let the examiner finish reading the cue-card intro before the minute starts.
    await waitForExaminerQuiet(30_000);
    if (endedRef.current || !stageIs('part2prep')) return;

    if (micRef.current) micRef.current.muted = true;
    pauseRecorder();
    let left = Math.round(PREP_MS / 1000);
    setPrepSecondsLeft(left);
    const tick = every(() => {
      left -= 1;
      setPrepSecondsLeft(left);
      if (left <= 0) {
        clearInterval(tick);
        beginPart2Talk();
      }
    }, 1000);
  }

  function beginPart2Talk() {
    if (endedRef.current || stageRef.current !== 'part2prep') return;
    if (micRef.current) micRef.current.muted = false;
    resumeRecorder();
    setStageBoth('part2talk');
    sessionRef.current?.sendDirectorNote('The preparation minute is over. Invite the candidate to start speaking now.');
    later(() => beginPart3(true), TALK_MAX_MS + 15_000); // +15s for the invite itself
  }

  function beginPart3(timeUp: boolean) {
    if (endedRef.current || stageRef.current !== 'part2talk') return;
    setStageBoth('part3');
    sessionRef.current?.sendDirectorNote(
      timeUp
        ? 'Two minutes are up. If the candidate is still speaking, stop them politely ("Thank you."). Ask the rounding-off question if you have not, then begin the Part 3 discussion.'
        : 'The candidate has finished their talk. Ask the rounding-off question, then begin the Part 3 discussion.',
    );
    later(() => endEarly('The test time is over.'), PART3_MAX_MS);
  }

  function endEarly(reason: string) {
    if (endedRef.current || stageRef.current === 'wrapup') return;
    setStageBoth('wrapup');
    sessionRef.current?.sendDirectorNote(
      `${reason} Conclude the test now with the official closing line, then say nothing more.`,
    );
    // If the closing phrase never arrives (model hiccup), end anyway.
    forceEndTimerRef.current = setTimeout(() => void finishTest(), FORCE_END_GRACE_MS);
  }

  /* ── finishing & grading ───────────────────────────────────────────── */

  function pauseRecorder() {
    const rec = recorderRef.current;
    if (rec?.state === 'recording') {
      recAccumMsRef.current += performance.now() - recActiveSinceRef.current;
      rec.pause();
    }
  }
  function resumeRecorder() {
    const rec = recorderRef.current;
    if (rec?.state === 'paused') {
      rec.resume();
      recActiveSinceRef.current = performance.now();
    }
  }

  function stopRecorder(): Promise<{ blob: Blob; mimeType: string; durationMs: number }> {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        resolve({ blob: new Blob(recChunksRef.current), mimeType: pickMimeType(), durationMs: recAccumMsRef.current });
        return;
      }
      if (rec.state === 'recording') recAccumMsRef.current += performance.now() - recActiveSinceRef.current;
      rec.onstop = () =>
        resolve({
          blob: new Blob(recChunksRef.current, { type: rec.mimeType }),
          mimeType: rec.mimeType,
          durationMs: recAccumMsRef.current,
        });
      rec.stop();
    });
  }

  async function finishTest() {
    if (endedRef.current) return;
    endedRef.current = true;
    if (forceEndTimerRef.current) clearTimeout(forceEndTimerRef.current);
    timersRef.current.forEach(clearTimeout);
    intervalsRef.current.forEach(clearInterval);
    timersRef.current = [];
    intervalsRef.current = [];

    const transcript = sessionRef.current?.transcript() ?? [];
    setFinalTranscript([...transcript]);
    sessionRef.current?.close();
    sessionRef.current = null;

    const recording = await stopRecorder();
    cleanupAudio();

    if (!gradingAvailable()) {
      setPhase('error');
      setError('The interview finished, but AI grading is not configured on this site (PUBLIC_SPEAKING_GRADER_URL).');
      return;
    }
    if (recording.durationMs < 30_000 || transcript.length < 2) {
      setPhase('error');
      setError('The session ended before there was enough speech to grade. Please try again.');
      return;
    }

    setPhase('grading');
    const gradingStartedAt = performance.now();
    try {
      const graded = await gradeInterview(transcript, recording);
      // Let the criteria sequence play out in full before the reveal — a
      // report that pops in mid-"checking grammar" reads as fake.
      const minVisibleMs = GRADING_STEPS.length * GRADE_STEP_MS;
      const remaining = minVisibleMs - (performance.now() - gradingStartedAt);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      setResult(graded);
      setPhase('report');
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Grading failed.');
    }
  }

  function cleanupAudio() {
    void micRef.current?.stop();
    micRef.current = null;
    void playbackRef.current?.stop();
    playbackRef.current = null;
    if (streamRef.current) {
      releaseMic(streamRef.current);
      streamRef.current = null;
    }
    recorderRef.current = null;
  }

  function abandonToMenu() {
    endedRef.current = true;
    timersRef.current.forEach(clearTimeout);
    intervalsRef.current.forEach(clearInterval);
    timersRef.current = [];
    intervalsRef.current = [];
    if (forceEndTimerRef.current) clearTimeout(forceEndTimerRef.current);
    sessionRef.current?.close();
    sessionRef.current = null;
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    cleanupAudio();
    setPhase('menu');
    setError(null);
    setNotice(null);
  }

  useEffect(() => () => abandonToMenu(), []); // page navigation cleanup

  /* Design preview: /speaking/examiner?preview renders the interview stage
     with synthetic audio levels — no mic, no session, no API cost. The orb
     alternates between "examiner speaking" and "listening" every few
     seconds so every animation state can be reviewed. */
  const previewRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('preview')) return;
    if (params.get('preview') === 'grading') {
      setPhase('grading');
      return;
    }
    previewRef.current = true;
    planRef.current = buildExamPlan();
    setPhase('interview');
    setStageBoth('part1');
    setCaption('This is a design preview — the examiner is not connected.');
    startOrbLoop();
    every(() => setElapsedS((s) => s + 1), 1000);
    every(() => setExaminerTalking(Math.floor(performance.now() / 4500) % 2 === 0), 250);
  }, []);

  /* ── orb animation (direct DOM writes — no per-frame re-render) ───────
     Audio levels are lerp-smoothed so the orb swells with the voice instead
     of jittering per audio frame. Everything animated here and in the CSS
     below touches only transform/opacity (GPU-composited). Under
     prefers-reduced-motion the loop parks all layers at rest. */

  function startOrbLoop() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let exSmooth = 0;
    let meSmooth = 0;
    const step = () => {
      if (endedRef.current && !playbackRef.current) return;
      if (reduced) return;
      let exL = playbackRef.current?.level() ?? 0;
      let meL = micRef.current?.level() ?? 0;
      if (previewRef.current) {
        const t = performance.now();
        const talking = Math.floor(t / 4500) % 2 === 0;
        const wobble = (Math.sin(t / 90) + Math.sin(t / 41) + 2) / 4;
        exL = talking ? 0.15 + wobble * 0.5 : 0;
        meL = talking ? 0 : 0.1 + wobble * 0.45;
      }
      exSmooth += (exL - exSmooth) * 0.22;
      meSmooth += (meL - meSmooth) * 0.25;
      if (coreRef.current) coreRef.current.style.transform = `scale(${1 + exSmooth * 0.32})`;
      if (glowRef.current) {
        glowRef.current.style.opacity = String(0.35 + exSmooth * 0.65);
        glowRef.current.style.transform = `scale(${1 + exSmooth * 0.5})`;
      }
      if (micRingRef.current) {
        micRingRef.current.style.opacity = String(Math.min(1, meSmooth * 2.2));
        micRingRef.current.style.transform = `scale(${1.04 + meSmooth * 0.28})`;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ── screens ───────────────────────────────────────────────────────── */

  let content: React.ReactNode;

  if (phase === 'report' && result) {
    const m = result.mechanics;
    content = (
      <div className="space-y-6">
        <BandReport
          title="Live mock speaking test"
          overallBand={result.overallBand}
          live
          offlineWarning=""
          criteria={SPEAKING_CRITERIA.map((c) => ({
            key: c.key,
            label: c.label,
            band: result.criteria[c.key].band,
            comment: result.criteria[c.key].comment,
            tip: result.criteria[c.key].tip,
          }))}
          strengths={result.strengths}
          improvements={result.improvements}
        >
          <div className="rounded-card border border-border bg-surface p-5 shadow-card">
            <h3 className="font-display font-bold">Timing check</h3>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Stat label="Spoke for" value={`${Math.round(m.totalDurationMs / 60000)}m ${Math.round((m.totalDurationMs % 60000) / 1000)}s`} bad={m.underLength} />
              <Stat label="Silence" value={`${Math.round(m.estSilenceRatio * 100)}%`} bad={m.estSilenceRatio > 0.4} />
              <Stat label="Longest pause" value={`${(m.longestSilenceMs / 1000).toFixed(1)}s`} bad={m.longestSilenceMs > 4000} />
            </div>
          </div>

          {result.moments.length > 0 && (
            <div className="rounded-card border border-border bg-surface p-5 shadow-card">
              <h3 className="font-display font-bold">Moments from the interview</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {result.moments.map((mo, i) => (
                  <li key={i}>
                    <span className="italic text-ink-muted">&ldquo;{mo.quote}&rdquo;</span>
                    <span className="block text-ink-muted">— {mo.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {finalTranscript.length > 0 && (
            <details className="rounded-card border border-border bg-surface p-5 shadow-card">
              <summary className="cursor-pointer font-display font-bold">Full interview transcript</summary>
              <div className="mt-3 space-y-2 text-sm">
                {finalTranscript.map((t, i) => (
                  <p key={i} className={t.role === 'examiner' ? 'text-ink-muted' : ''}>
                    <strong>{t.role === 'examiner' ? EXAMINER_NAME : 'You'}:</strong> {t.text}
                  </p>
                ))}
              </div>
            </details>
          )}
        </BandReport>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={abandonToMenu}
            className="rounded-button bg-brand px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Done
          </button>
        </div>
      </div>
    );
  } else if (phase === 'menu') {
    content = (
      <div className="relative overflow-hidden rounded-card border border-border bg-surface p-8 text-center shadow-card sm:p-10">
        <span className="absolute inset-x-0 top-0 h-1 bg-[var(--skill,#0E9F6E)]" aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">Speaking · Live</p>
        <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Live Mock Test with an AI Examiner</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted sm:text-[0.95rem]">
          A real-time spoken interview — all three parts, ~12 minutes. {EXAMINER_NAME} asks questions out loud,
          listens to your answers, and follows up on what <em>you</em> say, exactly like the real test. You'll get a
          full band report at the end.
        </p>
        <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-xs text-ink-muted">
          <li>· Use headphones if you can, in a quiet room</li>
          <li>· Speak naturally — the examiner waits while you think</li>
          <li>· You can ask her to repeat or rephrase a question</li>
        </ul>
        {error && <p className="mx-auto mt-4 max-w-md rounded-lg bg-error-tint px-3 py-2 text-sm text-error">{error}</p>}
        {!TOKEN_URL && (
          <p className="mx-auto mt-4 max-w-md rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
            ⚠ The live examiner is not configured on this site yet (PUBLIC_LIVE_EXAMINER_URL).
          </p>
        )}
        <button
          type="button"
          onClick={() => void startTest()}
          disabled={!TOKEN_URL}
          className="mt-7 rounded-button bg-brand px-8 py-3 font-display text-base font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start the interview →
        </button>
      </div>
    );
  } else if (phase === 'connecting') {
    content = (
      <div className="rounded-card border border-border bg-surface p-10 text-center shadow-card">
        <p className="text-sm text-ink-muted">Connecting you to {EXAMINER_NAME}…</p>
      </div>
    );
  } else if (phase === 'grading') {
    const step = GRADING_STEPS[gradeStep % GRADING_STEPS.length]!;
    content = (
      <div className="relative overflow-hidden rounded-card border border-border bg-surface p-10 text-center shadow-card">
        <style>{LX_STYLES}</style>
        <div className="lx-ambient" aria-hidden="true" style={{ animationDuration: '18s' }} />
        <div className="relative flex flex-col items-center">
          {notice && <p className="mb-6 max-w-md rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">{notice}</p>}

          {/* equalizer — the examiner is "listening back" to the interview */}
          <div className="lx-eq" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </div>

          <p className="lx-status mt-6 min-h-6 text-sm font-semibold" key={gradeStep} aria-live="polite">
            {step.text}
          </p>

          {/* the four official criteria — the one being "checked" lights up */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SPEAKING_CRITERIA.map((c) => (
              <span
                key={c.key}
                title={c.label}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition-all duration-500 ${
                  step.crit === c.key
                    ? 'scale-110 border-brand bg-brand text-white shadow-card'
                    : 'border-border bg-surface-alt text-ink-muted'
                }`}
              >
                {c.short}
              </span>
            ))}
          </div>

          <p className="mt-6 text-xs text-ink-muted">
            Three independent assessments are compared — the median becomes your report. ~1 minute.
          </p>
        </div>
      </div>
    );
  } else if (phase === 'error') {
    content = (
      <div className="rounded-card border border-border bg-surface p-10 text-center shadow-card">
        <p className="mx-auto max-w-md rounded-lg bg-error-tint px-3 py-2 text-sm text-error">{error}</p>
        <button
          type="button"
          onClick={abandonToMenu}
          className="mt-6 rounded-button border border-border px-5 py-2 text-sm font-semibold hover:bg-surface-alt"
        >
          Back
        </button>
      </div>
    );
  } else {
  /* ── the interview screen ── */
  const cue = planRef.current?.cueCard;
  const stageLabel =
    stage === 'part1' ? 'Part 1 · Interview' :
    stage === 'part2prep' ? 'Part 2 · Preparation' :
    stage === 'part2talk' ? 'Part 2 · Your talk' :
    stage === 'part3' ? 'Part 3 · Discussion' : 'Finishing…';

  const orbMode = stage === 'part2prep' ? 'lx-prep' : examinerTalking ? 'lx-speaking' : 'lx-listening';

  content = (
    <div className="space-y-4">
      <style>{LX_STYLES}</style>
      <div className={`lx-stage relative overflow-hidden rounded-card border border-border bg-surface p-6 shadow-card ${orbMode}`}>
        {/* ambient drifting glow behind everything */}
        <div className="lx-ambient" aria-hidden="true" />

        <div className="relative flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">{stageLabel}</span>
          <span className="text-xs font-semibold tabular-nums text-ink-muted">
            {Math.floor(elapsedS / 60)}:{String(elapsedS % 60).padStart(2, '0')}
          </span>
        </div>

        {/* the orb */}
        <div className="relative mt-8 flex flex-col items-center">
          <div className="relative flex h-52 w-52 items-center justify-center">
            {/* slow-spinning aurora halo */}
            <div className="lx-aura" aria-hidden="true" />
            {/* second, brighter aurora that only shows while the examiner speaks */}
            <div className="lx-aura lx-aura-hot" aria-hidden="true" />
            {/* idle breathing ring */}
            <div className="lx-breathe" aria-hidden="true" />
            {/* voice ripples while the examiner speaks */}
            {examinerTalking && (
              <>
                <span className="lx-ripple" aria-hidden="true" />
                <span className="lx-ripple" style={{ animationDelay: '0.6s' }} aria-hidden="true" />
                <span className="lx-ripple" style={{ animationDelay: '1.2s' }} aria-hidden="true" />
              </>
            )}
            {/* mic-reactive ring (student's voice, section green) */}
            <div ref={micRingRef} className="lx-micring" aria-hidden="true" />
            {/* audio-reactive glow + glassy core */}
            <div ref={glowRef} className="lx-glow" aria-hidden="true" />
            <div className="lx-float" aria-hidden="true">
              <div ref={coreRef} className="lx-core">
                <div className="lx-core-icon" key={orbMode}>
                  {orbMode === 'lx-speaking' ? <IconSpeaker /> : orbMode === 'lx-prep' ? <IconPencil /> : <IconMic />}
                </div>
              </div>
            </div>
          </div>

          {/* turn indicator: pill color + icon + wording all flip with the turn */}
          <p
            className="lx-status mt-6 rounded-full px-4 py-1.5 text-sm font-bold"
            style={{
              background: 'color-mix(in srgb, var(--lx-hue) 13%, transparent)',
              color: 'var(--lx-hue)',
            }}
            key={orbMode}
          >
            {stage === 'part2prep' ? (
              <>
                ✍ Prepare your talk —{' '}
                <span className="lx-tick inline-block font-display text-base font-extrabold" key={prepSecondsLeft}>
                  {prepSecondsLeft}s
                </span>
              </>
            ) : examinerTalking ? (
              `${EXAMINER_NAME} is speaking — listen`
            ) : (
              'Your turn — speak'
            )}
          </p>
          {showCaptions && caption && (
            <p className="lx-caption mt-2 max-w-lg text-center text-sm italic text-ink-muted">&ldquo;{caption}&rdquo;</p>
          )}
        </div>

        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setShowCaptions((v) => !v)}
            className="rounded-button border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-alt"
          >
            {showCaptions ? 'Hide captions' : 'Show captions'}
          </button>
          {stage === 'part2prep' && (
            <button
              type="button"
              onClick={beginPart2Talk}
              className="rounded-button bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
            >
              I'm ready — start speaking →
            </button>
          )}
          {stage === 'part2talk' && (
            <button
              type="button"
              onClick={() => beginPart3(false)}
              className="rounded-button border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-alt"
            >
              I've finished my talk →
            </button>
          )}
          <button
            type="button"
            onClick={() => endEarly('The candidate has asked to finish.')}
            className="rounded-button border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-alt"
          >
            End test early
          </button>
        </div>
      </div>

      {(stage === 'part2prep' || stage === 'part2talk') && cue && (
        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Cue card</p>
          <p className="mt-2 font-semibold">{cue.topic}</p>
          <p className="mt-2 text-sm text-ink-muted">You should say:</p>
          <ul className="mt-1 space-y-1 text-sm text-ink-muted">
            {cue.bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span aria-hidden="true">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {stage === 'part2prep' && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Your notes (not graded, the examiner can't see them)…"
              className="mt-3 w-full rounded-lg border border-border bg-surface-alt p-3 text-sm focus:border-brand focus:outline-none"
            />
          )}
        </div>
      )}

      {notice && <p className="rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">{notice}</p>}
    </div>
  );
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}

/* Scoped styles for the interview stage. Only transform/opacity are
   animated (GPU-composited); hues come from the theme tokens via color-mix,
   so the orb follows the site palette. The stage mode class (lx-speaking /
   lx-listening / lx-prep) retargets --lx-hue and the loops' intensity. */
const LX_STYLES = `
.lx-stage { --lx-hue: var(--color-brand, #4f46e5); }
.lx-stage.lx-listening { --lx-hue: var(--skill, #0E9F6E); }
.lx-stage.lx-prep { --lx-hue: #d97706; }

.lx-ambient {
  position: absolute; inset: -40%; pointer-events: none;
  background:
    radial-gradient(38% 34% at 30% 35%, color-mix(in srgb, var(--lx-hue) 16%, transparent), transparent 70%),
    radial-gradient(30% 30% at 72% 60%, color-mix(in srgb, var(--lx-hue) 10%, transparent), transparent 70%);
  animation: lx-drift 26s ease-in-out infinite alternate;
  transition: background 0.8s ease;
}
@keyframes lx-drift {
  from { transform: translate3d(-2%, -1%, 0) rotate(0deg); }
  to   { transform: translate3d(2%, 2%, 0) rotate(6deg); }
}

.lx-aura {
  position: absolute; inset: -1.5rem; border-radius: 9999px; pointer-events: none;
  background: conic-gradient(
    from 0deg,
    color-mix(in srgb, var(--lx-hue) 55%, transparent),
    transparent 30%,
    color-mix(in srgb, var(--lx-hue) 35%, transparent) 55%,
    transparent 80%,
    color-mix(in srgb, var(--lx-hue) 55%, transparent)
  );
  filter: blur(18px);
  opacity: 0.5;
  animation: lx-spin 24s linear infinite;
  transition: opacity 0.6s ease;
}
.lx-aura-hot { animation-duration: 7s; animation-direction: reverse; opacity: 0; filter: blur(12px); }
.lx-speaking .lx-aura-hot { opacity: 0.75; }
@keyframes lx-spin { to { transform: rotate(360deg); } }

.lx-breathe {
  position: absolute; inset: 0.75rem; border-radius: 9999px; pointer-events: none;
  border: 1.5px solid color-mix(in srgb, var(--lx-hue) 45%, transparent);
  animation: lx-breathe 4.2s ease-in-out infinite;
}
@keyframes lx-breathe {
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50%      { transform: scale(1.06); opacity: 0.2; }
}

.lx-ripple {
  position: absolute; inset: 1.5rem; border-radius: 9999px; pointer-events: none;
  border: 2px solid color-mix(in srgb, var(--lx-hue) 60%, transparent);
  animation: lx-ripple 1.8s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
}
@keyframes lx-ripple {
  from { transform: scale(0.72); opacity: 0.8; }
  to   { transform: scale(1.45); opacity: 0; }
}

.lx-micring {
  position: absolute; inset: 2.25rem; border-radius: 9999px; pointer-events: none;
  border: 3px solid color-mix(in srgb, var(--skill, #0E9F6E) 80%, transparent);
  opacity: 0; will-change: transform, opacity;
}

.lx-glow {
  position: absolute; inset: 3rem; border-radius: 9999px; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--lx-hue) 75%, transparent), transparent 70%);
  filter: blur(14px);
  opacity: 0.35; will-change: transform, opacity;
}

.lx-float { animation: lx-float 6s ease-in-out infinite; will-change: transform; }
@keyframes lx-float {
  0%, 100% { transform: translate3d(0, -3px, 0); }
  50%      { transform: translate3d(0, 3px, 0); }
}

.lx-core {
  display: grid; place-items: center;
  height: 7rem; width: 7rem; border-radius: 9999px;
  background:
    radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.85), transparent 42%),
    radial-gradient(circle at 68% 78%, color-mix(in srgb, var(--lx-hue) 55%, transparent), transparent 60%),
    linear-gradient(145deg, color-mix(in srgb, var(--lx-hue) 92%, white), color-mix(in srgb, var(--lx-hue) 70%, black));
  box-shadow:
    inset 0 -14px 26px color-mix(in srgb, var(--lx-hue) 55%, transparent),
    0 10px 34px color-mix(in srgb, var(--lx-hue) 38%, transparent);
  transition: background 0.8s ease, box-shadow 0.8s ease;
  will-change: transform;
}

.lx-core-icon {
  color: rgba(255, 255, 255, 0.94);
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.25));
  animation: lx-fade-up 0.45s ease both;
}

.lx-eq { display: flex; align-items: center; gap: 0.4rem; height: 3.5rem; }
.lx-eq span {
  width: 0.55rem; height: 3rem; border-radius: 9999px;
  background: linear-gradient(180deg, var(--color-brand, #4f46e5), color-mix(in srgb, var(--color-brand, #4f46e5) 35%, transparent));
  transform-origin: center; will-change: transform;
  animation: lx-eq 1.1s ease-in-out infinite;
}
.lx-eq span:nth-child(2) { animation-delay: 0.14s; }
.lx-eq span:nth-child(3) { animation-delay: 0.28s; }
.lx-eq span:nth-child(4) { animation-delay: 0.42s; }
.lx-eq span:nth-child(5) { animation-delay: 0.56s; }
@keyframes lx-eq {
  0%, 100% { transform: scaleY(0.3); }
  50%      { transform: scaleY(1); }
}

.lx-status { animation: lx-fade-up 0.45s ease both; }
.lx-caption { animation: lx-fade-up 0.6s ease both; }
@keyframes lx-fade-up {
  from { transform: translate3d(0, 6px, 0); opacity: 0; }
  to   { transform: translate3d(0, 0, 0); opacity: 1; }
}

.lx-tick { animation: lx-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes lx-pop {
  from { transform: scale(1.3); }
  to   { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .lx-ambient, .lx-aura, .lx-aura-hot, .lx-breathe, .lx-ripple,
  .lx-float, .lx-status, .lx-caption, .lx-tick, .lx-eq span, .lx-core-icon { animation: none; }
  .lx-aura-hot { opacity: 0; }
  .lx-eq span { transform: scaleY(0.6); }
}
`;

/* Rotating status lines shown while the report is generated — walks through
   the four official criteria so the wait reads as work, not silence. The
   sequence always plays in full: steps advance every GRADE_STEP_MS, hold on
   the last line, and the report never appears before one complete pass. */
const GRADE_STEP_MS = 4000;
const GRADING_STEPS: { text: string; crit?: SpeakingCriterionKey }[] = [
  { text: 'Replaying your interview…' },
  { text: 'Checking Fluency & Coherence — pacing, hesitation, linking…', crit: 'fluencyCoherence' },
  { text: 'Assessing Lexical Resource — range, precision, paraphrase…', crit: 'lexicalResource' },
  { text: 'Checking Grammatical Range & Accuracy…', crit: 'grammaticalRange' },
  { text: 'Listening closely to Pronunciation — stress, rhythm, clarity…', crit: 'pronunciation' },
  { text: 'Comparing independent assessments…' },
];

function IconMic() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3.5" />
    </svg>
  );
}

function IconSpeaker() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5.5 6.5 9H3v6h3.5L11 18.5z" fill="currentColor" stroke="none" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M17.5 7a7 7 0 0 1 0 10" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3.5 20.5 7 8.5 19l-4.5 1.5L5.5 16z" />
    </svg>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 ${bad ? 'border-error/40 bg-error-tint' : 'border-border bg-surface-alt'}`}>
      <p className={`font-display text-lg font-extrabold ${bad ? 'text-error' : ''}`}>{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}
