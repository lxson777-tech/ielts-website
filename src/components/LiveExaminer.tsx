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
import type { SpeakingGradeResult } from '../lib/speaking/schema';
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

  const planRef = useRef<ExamPlan | null>(null);
  const sessionRef = useRef<ExaminerSession | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playbackRef = useRef<ExaminerPlayback | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<BlobPart[]>([]);
  const recActiveSinceRef = useRef(0);
  const recAccumMsRef = useRef(0);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const micDotRef = useRef<HTMLDivElement | null>(null);
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
    try {
      const graded = await gradeInterview(transcript, recording);
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

  /* ── orb animation (direct DOM writes — no per-frame re-render) ─────── */

  function startOrbLoop() {
    const step = () => {
      if (endedRef.current && !playbackRef.current) return;
      const ex = playbackRef.current?.level() ?? 0;
      const me = micRef.current?.level() ?? 0;
      if (orbRef.current) orbRef.current.style.transform = `scale(${1 + ex * 0.35})`;
      if (micDotRef.current) micDotRef.current.style.transform = `scale(${1 + me * 0.9})`;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ── screens ───────────────────────────────────────────────────────── */

  if (phase === 'report' && result) {
    const m = result.mechanics;
    return (
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
  }

  if (phase === 'menu') {
    return (
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
  }

  if (phase === 'connecting') {
    return (
      <div className="rounded-card border border-border bg-surface p-10 text-center shadow-card">
        <p className="text-sm text-ink-muted">Connecting you to {EXAMINER_NAME}…</p>
      </div>
    );
  }

  if (phase === 'grading') {
    return (
      <div className="rounded-card border border-border bg-surface p-10 text-center shadow-card">
        {notice && <p className="mx-auto mb-4 max-w-md rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">{notice}</p>}
        <p className="text-sm text-ink-muted">The examiner is writing your band report — this takes about a minute…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
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
  }

  /* ── the interview screen ── */
  const cue = planRef.current?.cueCard;
  const stageLabel =
    stage === 'part1' ? 'Part 1 · Interview' :
    stage === 'part2prep' ? 'Part 2 · Preparation' :
    stage === 'part2talk' ? 'Part 2 · Your talk' :
    stage === 'part3' ? 'Part 3 · Discussion' : 'Finishing…';

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">{stageLabel}</span>
          <span className="text-xs font-semibold tabular-nums text-ink-muted">
            {Math.floor(elapsedS / 60)}:{String(elapsedS % 60).padStart(2, '0')}
          </span>
        </div>

        {/* the orb */}
        <div className="mt-6 flex flex-col items-center">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <div
              ref={orbRef}
              className={`absolute inset-0 rounded-full transition-colors duration-300 ${
                examinerTalking ? 'bg-brand/25' : 'bg-[var(--skill,#0E9F6E)]/15'
              }`}
              style={{ willChange: 'transform' }}
              aria-hidden="true"
            />
            <div
              ref={micDotRef}
              className={`h-16 w-16 rounded-full ${examinerTalking ? 'bg-brand' : 'bg-[var(--skill,#0E9F6E)]'}`}
              style={{ willChange: 'transform' }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-4 text-sm font-semibold">
            {stage === 'part2prep'
              ? `Prepare your talk — ${prepSecondsLeft}s`
              : examinerTalking
                ? `${EXAMINER_NAME} is speaking…`
                : 'Listening to you'}
          </p>
          {showCaptions && caption && (
            <p className="mt-2 max-w-lg text-center text-sm italic text-ink-muted">&ldquo;{caption}&rdquo;</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 ${bad ? 'border-error/40 bg-error-tint' : 'border-border bg-surface-alt'}`}>
      <p className={`font-display text-lg font-extrabold ${bad ? 'text-error' : ''}`}>{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}
