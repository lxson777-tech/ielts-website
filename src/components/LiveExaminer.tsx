/* The live AI examiner: a mock IELTS Speaking test as a real-time voice
   conversation. The model (via workers/live-examiner tokens) speaks and
   listens; this component is the "test director" — it owns the clock and
   injects [DIRECTOR] cues at every boundary (Part 1 over, prep minute over,
   two-minute talk over, conclude), so the exam structure never depends on
   the model's own sense of time. In parallel, a MediaRecorder keeps the
   candidate's whole mic track; when the examiner says the closing line, the
   recording + transcript go to the grade-speaking Worker for the band
   report. Visuals are deliberately minimal: a talking orb, the current
   part, the cue card when it matters.

   Two variants share everything above. variant="full" is the complete
   three-part test on /speaking/examiner; variant="drills" is the Speaking
   Trainer on /trainers/speaking — the same live conversation scoped to a
   single part (with the structure cheat-sheet on screen, and each attempt
   saved to the speaking score history).

   A third mode (2026-09), `mock`, embeds the same full test as the fourth
   stage of Mock Exam Day (src/components/MockExam.tsx). MockExam owns its
   own brief screen with "Start speaking test" / "Skip speaking" (mirroring
   the sign-in gate below) and only mounts this component once the student
   presses Start, so in `mock` mode the component skips its own menu
   screen — no heading, no description, straight to `startTest('full')` —
   and reports back through two callbacks instead of sitting on its own
   report/menu screens: `onComplete` once grading finishes (MockExam then
   swaps straight to its combined results screen, same as the Listening,
   Reading and Writing legs already do), or `onAbort` if the session ends
   without a report (mic/connection failure, or the student navigating away
   mid-interview — "End test early" is not an abort, it still grades and
   completes normally, same as the standalone examiner). Everything else —
   clock, stages, recorder, grading, `?preview` — is untouched. */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { User } from '@supabase/supabase-js';
import type { CueCard, SpeakingGradeResult, TopicVocab } from '../lib/speaking/schema';
import { SPEAKING_CRITERIA } from '../lib/speaking/schema';
import { releaseMic, pickMimeType } from '../lib/speaking/recorder';
import { openExaminerLink, fetchLiveConfig, type ExaminerLink, type LiveConfig } from '../lib/speaking/live/link';
import type { TranscriptTurn } from '../lib/speaking/live/session';
import type { DirectorCue } from '../lib/speaking/live/cues';
import {
  buildExamPlan,
  buildSystemInstruction,
  buildDrillPlan,
  buildDrillSystemInstruction,
  planRequestFor,
  CLOSING_PHRASE,
  EXAMINER_NAME,
  type DrillMode,
} from '../lib/speaking/live/script';
import { gradeInterview, gradingAvailable, FULL_TEST_EXPECTED_MIN_MS } from '../lib/speaking/live/grade';
import { recordSpeakingAttempt } from '../lib/progress';
import { isAuthConfigured } from '../lib/auth/supabase';
import { onAuthChange, getAccessToken } from '../lib/auth/session';
import { SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS } from '../data/speaking-prompts';
import type { StructureMethod } from '../data/speaking-structure-guides';
import { SPEAKING_BAND_GUIDES, guideFor } from '../data/band-guides';
import { useT } from '../lib/i18n/react';
import BandReport from './BandReport';
import GradingProgress from './GradingProgress';
import SpeakingCoachPanel from './SpeakingCoachPanel';
import SpeakingPartCards from './SpeakingPartCards';
import IdeaHints from './IdeaHints';
import AuthModal from './AuthModal';

const TOKEN_URL: string | undefined = import.meta.env?.PUBLIC_LIVE_EXAMINER_URL;

/* The exam clock (all from session start unless noted). */
const PART2_AT_MS = 5.5 * 60_000; // intro + Part 1 budget
const PREP_MS = 60_000;
const TALK_MAX_MS = 2 * 60_000; // from end of prep
const PART3_MAX_MS = 4.5 * 60_000; // from Part 3 start
const HARD_STOP_MS = 18 * 60_000; // absolute safety net
const FORCE_END_GRACE_MS = 12_000; // after asking the examiner to conclude

/* Single-part drills run the same clock, scaled to one part. */
const DRILL_MAX_MS = 4.5 * 60_000; // part1/part3 question time before conclude
const DRILL_HARD_STOP_MS = 8 * 60_000;
const PART2_WRAPUP_FALLBACK_MS = 75_000; // rounding-off Q&A + closing line budget

/** Minimum candidate-speech length a serious attempt has, per session shape. */
const DRILL_EXPECTED_MIN_MS: Record<DrillMode, number> = {
  part1: 2 * 60_000,
  part2: 60_000,
  part3: 2 * 60_000,
};
/** One-line session description for the grading prompt. */
const DRILL_GRADE_SCOPE: Record<DrillMode, string> = {
  part1: 'a Part 1 IELTS Speaking practice drill (short interview questions on one topic only — there was no Part 2 or Part 3)',
  part2: 'a Part 2 IELTS Speaking practice drill (one cue-card talk with a rounding-off question — there was no Part 1 or Part 3)',
  part3: 'a Part 3 IELTS Speaking practice drill (abstract discussion questions only — there was no Part 1 or Part 2)',
};
const DRILL_METHOD: Record<DrillMode, StructureMethod> = { part1: 'ARE', part2: 'PEEL', part3: 'OREO' };

type Phase = 'menu' | 'connecting' | 'interview' | 'grading' | 'report' | 'error';
type Stage = 'part1' | 'part2prep' | 'part2talk' | 'part3' | 'wrapup';
type LiveMode = 'full' | DrillMode;

/** variant="full": the complete three-part mock test (/speaking/examiner).
    variant="drills": the same live examiner scoped to a single part, with a
    Part 1/2/3 picker menu (/trainers/speaking). `mock`, `onComplete` and
    `onAbort` are for the Mock Exam Day embed — see the file header. */
export default function LiveExaminer({
  variant = 'full',
  mock = false,
  onComplete,
  onAbort,
}: {
  variant?: 'full' | 'drills';
  mock?: boolean;
  onComplete?: (result: { overallBand: number; criteria: Record<string, number> }) => void;
  onAbort?: () => void;
}) {
  const { t, tn } = useT();
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
  // The grading wait: when the request went out, and how long the recording
  // is. Both feed the honest progress bar.
  const [gradingStartedAt, setGradingStartedAt] = useState(0);
  const [gradingAudioSeconds, setGradingAudioSeconds] = useState(0);
  const [liveConfig, setLiveConfig] = useState<LiveConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  /* ── sign-in gate (openai only) ───────────────────────────────────────
     The paid OpenAI path requires a signed-in student; Gemini stays free
     and unauthenticated. requiresSignIn comes from the Worker, not a local
     guess, so this tracks whatever the currently-configured provider needs. */
  useEffect(() => onAuthChange(setUser), []);
  const requiresSignIn = liveConfig?.requiresSignIn === true;
  const authConfigured = isAuthConfigured();
  const needsSignIn = requiresSignIn && authConfigured && !user;
  const authUnavailable = requiresSignIn && !authConfigured;

  /** What the UI needs after setup: the on-screen cue card, plus the drawn
      topic's vocabulary for the drills' coach panel. */
  const planRef = useRef<{ cueCard?: CueCard; vocab?: TopicVocab[] } | null>(null);
  const modeRef = useRef<LiveMode>('full');
  const titleRef = useRef(t('Live mock speaking test'));
  const linkRef = useRef<ExaminerLink | null>(null);
  const startingRef = useRef(false);
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
  /* mock embed bookkeeping: guards startTest('full') firing more than once
     on mount, and tells the unmount cleanup below whether onComplete already
     ran (so it doesn't also report an abort for a normal finish). */
  const mockAutoStartedRef = useRef(false);
  const mockCompletedRef = useRef(false);

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

  /* ── provider config ────────────────────────────────────────────────
     Which link (Gemini or OpenAI) this site is wired to, fetched once from
     the token Worker. Not fetched in ?preview mode, since preview never
     opens a real connection. A failure here does not block starting the
     test: startTest re-fetches so a transient error can be retried. */
  useEffect(() => {
    if (!TOKEN_URL) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('preview')) return;
    let cancelled = false;
    fetchLiveConfig(TOKEN_URL)
      .then((cfg) => {
        if (!cancelled) setLiveConfig(cfg);
      })
      .catch((e) => {
        if (!cancelled) setConfigError(e instanceof Error ? e.message : t('Could not reach the live examiner service.'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Mock embed: skip the own-menu screen entirely and start the interview
     the moment the config fetch above has settled (success or failure) —
     MockExam's brief screen already showed the "Start speaking test"
     control and the sign-in gate, so by the time this component mounts the
     student has already chosen to start. If it turns out sign-in is (still)
     required and missing — a race with the brief screen's own check, or the
     Worker isn't configured at all — abort back to MockExam rather than
     showing a menu this mode never renders. */
  useEffect(() => {
    if (!mock || mockAutoStartedRef.current) return;
    if (!TOKEN_URL) {
      mockAutoStartedRef.current = true;
      onAbort?.();
      return;
    }
    if (liveConfig === null && !configError) return; // config fetch still in flight
    if (needsSignIn || authUnavailable) {
      mockAutoStartedRef.current = true;
      onAbort?.();
      return;
    }
    mockAutoStartedRef.current = true;
    void startTest('full');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mock, liveConfig, configError, needsSignIn, authUnavailable]);

  /* session start */

  async function startTest(m: LiveMode = 'full') {
    if (!TOKEN_URL) return;
    if (needsSignIn || authUnavailable) return;
    if (startingRef.current || !(phase === 'menu' || phase === 'report' || phase === 'error')) return;
    startingRef.current = true;
    modeRef.current = m;
    setError(null);
    setNotice(null);
    setPhase('connecting');
    endedRef.current = false;
    recChunksRef.current = [];
    recAccumMsRef.current = 0;
    setNotes('');
    setCaption('');
    setResult(null);

    let config = liveConfig;
    if (!config) {
      try {
        config = await fetchLiveConfig(TOKEN_URL);
        setLiveConfig(config);
        setConfigError(null);
      } catch (e) {
        startingRef.current = false;
        setPhase(mock ? 'error' : 'menu');
        setError(e instanceof Error ? e.message : t('Could not reach the live examiner service.'));
        return;
      }
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // Mono: the Live API gets one channel anyway; asking for it up front
        // lets the device apply its voice processing to the right signal.
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch {
      startingRef.current = false;
      setPhase(mock ? 'error' : 'menu');
      setError(t('Microphone access is required. Please allow the permission and try again.'));
      return;
    }
    streamRef.current = stream;

    try {
      const mime = pickMimeType();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      rec.start(1000);
      recActiveSinceRef.current = performance.now();
      recorderRef.current = rec;

      const provider = config.provider;
      let instruction: string;
      let request: ReturnType<typeof planRequestFor>;
      if (m === 'full') {
        const plan = buildExamPlan();
        planRef.current = { cueCard: plan.cueCard };
        titleRef.current = t('Live mock speaking test');
        instruction = buildSystemInstruction(plan, provider);
        request = planRequestFor(plan);
      } else {
        const plan = buildDrillPlan(m);
        planRef.current = { cueCard: plan.cueCard, vocab: plan.part1Topic?.vocab ?? plan.cueCard?.vocab };
        titleRef.current = plan.title;
        instruction = buildDrillSystemInstruction(plan, provider);
        request = planRequestFor(plan);
      }

      const accessToken = await getAccessToken();

      linkRef.current = await openExaminerLink({
        endpoint: TOKEN_URL,
        config,
        stream,
        plan: request,
        instruction,
        mode: m,
        accessToken,
        cb: {
          onTranscript: onTranscriptUpdate,
          onClosed: (reason, wasClean) => {
            if (endedRef.current) return;
            // The conversation died under us — salvage a report from whatever
            // was said rather than throwing the attempt away.
            const reasonText = wasClean ? reason || t('closed') : t('network problem');
            setNotice(t('The connection ended early ({reason}). Grading what we have…', { reason: reasonText }));
            void finishTest();
          },
          onError: () => {
            /* transient — onClosed decides what actually matters */
          },
        },
      });
    } catch (e) {
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
      cleanupAudio();
      startingRef.current = false;
      setPhase(mock ? 'error' : 'menu');
      setError(e instanceof Error ? e.message : t('Could not start the examiner session.'));
      return;
    }

    startingRef.current = false;
    setPhase('interview');

    const startedAt = performance.now();
    every(() => setElapsedS(Math.round((performance.now() - startedAt) / 1000)), 1000);
    every(() => setExaminerTalking(linkRef.current?.isSpeaking() ?? false), 250);
    startOrbLoop();

    if (m === 'full') {
      setStageBoth('part1');
      void linkRef.current?.direct({ type: 'begin' });
      later(() => void beginPart2(), PART2_AT_MS);
      later(() => endEarly('time'), HARD_STOP_MS);
    } else if (m === 'part1') {
      setStageBoth('part1');
      void linkRef.current?.direct({ type: 'begin' });
      later(() => endEarly('time'), DRILL_MAX_MS);
      later(() => endEarly('time'), DRILL_HARD_STOP_MS);
    } else if (m === 'part2') {
      // Straight to the cue card: same prep → talk flow as the full test.
      void startPart2Flow({ type: 'begin' });
      later(() => endEarly('time'), DRILL_HARD_STOP_MS);
    } else {
      setStageBoth('part3');
      void linkRef.current?.direct({ type: 'begin' });
      later(() => endEarly('time'), DRILL_MAX_MS);
      later(() => endEarly('time'), DRILL_HARD_STOP_MS);
    }
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
        await linkRef.current?.waitUntilQuiet();
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
      const speaking = linkRef.current?.isSpeaking() ?? false;
      if (speaking) heardSpeech = true;
      else if (heardSpeech) return;
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  async function beginPart2() {
    if (stageRef.current !== 'part1' || endedRef.current) return;
    await startPart2Flow({ type: 'part2_intro' });
  }

  /** Cue-card intro → prep minute → talk. Shared by the full test (after
      Part 1) and the Part 2 drill (right after the greeting). */
  async function startPart2Flow(cue: DirectorCue) {
    if (endedRef.current) return;
    setStageBoth('part2prep');
    void linkRef.current?.direct(cue);
    // Let the examiner finish reading the cue-card intro before the minute starts.
    await waitForExaminerQuiet(30_000);
    if (endedRef.current || !stageIs('part2prep')) return;

    linkRef.current?.setMicMuted(true);
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
    linkRef.current?.setMicMuted(false);
    resumeRecorder();
    setStageBoth('part2talk');
    void linkRef.current?.direct({ type: 'part2_talk' });
    later(() => beginPart3(true), TALK_MAX_MS + 15_000); // +15s for the invite itself
  }

  function beginPart3(timeUp: boolean) {
    if (endedRef.current || stageRef.current !== 'part2talk') return;

    // Part 2 drill: there is no Part 3, rounding-off question, then conclude.
    if (modeRef.current === 'part2') {
      setStageBoth('wrapup');
      void linkRef.current?.direct({ type: 'part2_end', timeUp });
      // If the closing line never comes (model hiccup), end anyway.
      forceEndTimerRef.current = setTimeout(() => void finishTest(), PART2_WRAPUP_FALLBACK_MS);
      return;
    }

    setStageBoth('part3');
    void linkRef.current?.direct({ type: 'part2_end', timeUp });
    later(() => endEarly('time'), PART3_MAX_MS);
  }

  function endEarly(reason: 'time' | 'candidate') {
    if (endedRef.current || stageRef.current === 'wrapup') return;
    setStageBoth('wrapup');
    void linkRef.current?.direct({ type: 'conclude', reason });
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

    const transcript = linkRef.current?.transcript() ?? [];
    setFinalTranscript([...transcript]);
    const link = linkRef.current;
    linkRef.current = null;
    if (link) await link.close();

    const recording = await stopRecorder();
    cleanupAudio();

    if (!gradingAvailable()) {
      setPhase('error');
      setError(
        t('The interview finished, but AI grading is not configured on this site ({envVar}).', {
          envVar: 'PUBLIC_SPEAKING_GRADER_URL',
        }),
      );
      return;
    }
    if (recording.durationMs < 30_000 || transcript.length < 2) {
      setPhase('error');
      setError(t('The session ended before there was enough speech to grade. Please try again.'));
      return;
    }

    setGradingAudioSeconds(recording.durationMs / 1000);
    setGradingStartedAt(Date.now());
    setPhase('grading');
    const m = modeRef.current;
    try {
      const graded = await gradeInterview(
        transcript,
        recording,
        m === 'full'
          ? { expectedMinMs: FULL_TEST_EXPECTED_MIN_MS }
          : { expectedMinMs: DRILL_EXPECTED_MIN_MS[m], scope: DRILL_GRADE_SCOPE[m] },
      );
      // Drills feed the same band-over-time history as the recorded checker did.
      if (m !== 'full') {
        recordSpeakingAttempt({
          at: new Date().toISOString(),
          mode: m,
          topic: titleRef.current,
          overallBand: graded.overallBand,
          criteria: Object.fromEntries(SPEAKING_CRITERIA.map((c) => [c.key, graded.criteria[c.key].band])),
          live: true,
        });
      }
      setResult(graded);
      setPhase('report');
      // Mock embed: report straight back to MockExam instead of waiting on a
      // "Done" click — it swaps to its own combined results screen the
      // moment this fires (same beat as the Listening/Reading/Writing legs),
      // so in practice this component's own report screen never gets a
      // chance to paint. mockCompletedRef tells the unmount cleanup below
      // this was a real finish, not an abort.
      if (mock) {
        mockCompletedRef.current = true;
        onComplete?.({
          overallBand: graded.overallBand,
          criteria: Object.fromEntries(SPEAKING_CRITERIA.map((c) => [c.key, graded.criteria[c.key].band])),
        });
      }
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : t('Grading failed.'));
    }
  }

  function cleanupAudio() {
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
    const link = linkRef.current;
    linkRef.current = null;
    void link?.close();
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    cleanupAudio();
    setPhase('menu');
    setError(null);
    setNotice(null);
  }

  useEffect(
    () => () => {
      // Mock embed: a teardown that isn't the completion path above (the
      // student navigated away, or MockExam itself unmounted this component
      // for some other reason) is exactly what onAbort is for.
      if (mock && !mockCompletedRef.current) onAbort?.();
      abandonToMenu();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  ); // page navigation cleanup

  /* Design preview: /speaking/examiner?preview renders the interview stage
     with synthetic audio levels — no mic, no session, no API cost. The orb
     alternates between "examiner speaking" and "listening" every few
     seconds so every animation state can be reviewed. */
  const previewRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('preview')) return;
    if (params.get('preview') === 'grading') {
      setGradingStartedAt(Date.now());
      setGradingAudioSeconds(720);
      setPhase('grading');
      return;
    }
    previewRef.current = true;
    const previewPlan = buildExamPlan();
    const isPart2Preview = params.get('preview') === 'part2';
    // In the drills variant, preview as a drill so the coach panel renders
    // too — with the vocab a real drill of that mode would draw (Part 1 from
    // the topic, Part 2 from the cue card), or the preview misrepresents it.
    if (variant === 'drills') modeRef.current = isPart2Preview ? 'part2' : 'part1';
    planRef.current = {
      cueCard: previewPlan.cueCard,
      vocab: isPart2Preview ? previewPlan.cueCard.vocab : previewPlan.part1Topics[0]?.vocab,
    };
    setPhase('interview');
    if (isPart2Preview) {
      // ?preview=part2 renders the cue-card stage (card + prep notes + orb).
      setStageBoth('part2prep');
      setPrepSecondsLeft(47);
    } else {
      setStageBoth('part1');
    }
    setCaption(t('This is a design preview. The examiner is not connected.'));
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
      if (endedRef.current && !linkRef.current) return;
      if (reduced) return;
      let exL = linkRef.current?.outputLevel() ?? 0;
      let meL = linkRef.current?.micLevel() ?? 0;
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

  if (mock && phase === 'menu') {
    // The mock embed's own "Start speaking test" already happened on
    // MockExam's brief screen; this is only the brief window before the
    // auto-start effect above has a config to act on (or decides to abort).
    // No heading, no description, no button — those all belong to the
    // brief screen, not here.
    content = (
      <div className="rounded-card border border-border bg-surface p-10 text-center shadow-card">
        <p className="text-sm text-ink-muted">{t('Preparing the speaking test…')}</p>
      </div>
    );
  } else if (phase === 'report' && result) {
    const m = result.mechanics;
    content = (
      <div className="space-y-6">
        <BandReport
          title={titleRef.current}
          overallBand={result.overallBand}
          live
          offlineWarning=""
          criteria={SPEAKING_CRITERIA.map((c) => {
            const score = result.criteria[c.key];
            return {
              key: c.key,
              label: c.label,
              band: score.band,
              comment: score.comment,
              tip: score.tip,
              nextBand: score.nextBand,
              guide: guideFor(SPEAKING_BAND_GUIDES[c.key], score.band),
            };
          })}
          strengths={result.strengths}
          improvements={result.improvements}
          actionPlan={result.actionPlan}
        >
          <div className="rounded-card border border-border bg-surface p-5 shadow-card">
            <h3 className="font-display font-bold">{t('Timing check')}</h3>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Stat
                label={t('Spoke for')}
                value={`${Math.round(m.totalDurationMs / 60000)}m ${Math.round((m.totalDurationMs % 60000) / 1000)}s`}
                bad={m.underLength}
              />
              <Stat label={t('Silence')} value={`${Math.round(m.estSilenceRatio * 100)}%`} bad={m.estSilenceRatio > 0.4} />
              <Stat
                label={t('Longest pause')}
                value={`${(m.longestSilenceMs / 1000).toFixed(1)}s`}
                bad={m.longestSilenceMs > 4000}
              />
            </div>
          </div>

          {result.moments.length > 0 && (
            <div className="rounded-card border border-border bg-surface p-5 shadow-card">
              <h3 className="font-display font-bold">{t('Moments from the interview')}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {result.moments.map((mo, i) => (
                  <li key={i}>
                    <span className="italic text-ink-muted">&ldquo;{mo.quote}&rdquo;</span>
                    <span className="block text-ink-muted">· {mo.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {finalTranscript.length > 0 && (
            <details className="rounded-card border border-border bg-surface p-5 shadow-card">
              <summary className="cursor-pointer font-display font-bold">{t('Full interview transcript')}</summary>
              <div className="mt-3 space-y-2 text-sm">
                {finalTranscript.map((turn, i) => (
                  <p key={i} className={turn.role === 'examiner' ? 'text-ink-muted' : ''}>
                    <strong>{turn.role === 'examiner' ? EXAMINER_NAME : t('You')}:</strong> {turn.text}
                  </p>
                ))}
              </div>
            </details>
          )}
        </BandReport>

        {/* Mock embed: onComplete already fired above, in the same tick as
            setPhase('report') — MockExam swaps to its own results screen
            before this ever paints, so there's nothing for a button here to
            do. */}
        {!mock && (
          <div className="flex flex-wrap justify-center gap-3">
            {variant === 'drills' && modeRef.current !== 'full' && (
              <button
                type="button"
                onClick={() => void startTest(modeRef.current)}
                className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
              >
                ↻ {t('Practice this part again')}
              </button>
            )}
            <button
              type="button"
              onClick={abandonToMenu}
              className="rounded-button bg-brand px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              {variant === 'drills' ? t('Choose a different part') : t('Done')}
            </button>
          </div>
        )}
      </div>
    );
  } else if (phase === 'menu') {
    content = (
      <div className="relative overflow-hidden rounded-card border border-border bg-surface p-8 text-center shadow-card sm:p-10">
        <span className="absolute inset-x-0 top-0 h-1 bg-[var(--skill,#0E9F6E)]" aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">Speaking · {t('Live')}</p>
        <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
          {variant === 'drills' ? t('Practice One Part with the AI Examiner') : t('Live Mock Test with an AI Examiner')}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted sm:text-[0.95rem]">
          {variant === 'drills'
            ? t(
                "Pick a part. {name} asks questions out loud, listens to your answers, and follows up on what you say, exactly like the real test, just one part at a time. A coach panel with the answer structure, useful phrases, and topic vocabulary stays beside you, and you'll get a band report at the end.",
                { name: EXAMINER_NAME },
              )
            : t(
                "A real-time spoken interview, all three parts, ~12 minutes. {name} asks questions out loud, listens to your answers, and follows up on what you say, exactly like the real test. You'll get a full band report at the end.",
                { name: EXAMINER_NAME },
              )}
        </p>
        <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-xs text-ink-muted">
          <li>· {t('Use headphones if you can, in a quiet room')}</li>
          <li>· {t('Speak naturally, the examiner waits while you think')}</li>
          <li>· {t('You can ask her to repeat a question, and in Part 3 to rephrase it, exactly as in the real test')}</li>
        </ul>
        {needsSignIn && (
          <div className="mx-auto mt-4 max-w-md rounded-lg bg-warning-tint px-3 py-3 text-xs text-ink-muted">
            <p>{t('Sign in to use the live examiner (this keeps the paid voice service for real students).')}</p>
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="mt-2 rounded-button border border-border px-4 py-1.5 text-xs font-semibold hover:bg-surface-alt"
            >
              {t('Sign in')}
            </button>
          </div>
        )}
        {authUnavailable && (
          <p className="mx-auto mt-4 max-w-md rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
            {t('The live examiner needs accounts to be enabled on this site.')}
          </p>
        )}
        {error && <p className="mx-auto mt-4 max-w-md rounded-lg bg-error-tint px-3 py-2 text-sm text-error">{error}</p>}
        {configError && (
          <p className="mx-auto mt-4 max-w-md rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
            {t('The live examiner service could not be reached: {error}. You can still try to start.', {
              error: configError,
            })}
          </p>
        )}
        {!TOKEN_URL && (
          <p className="mx-auto mt-4 max-w-md rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
            ⚠{' '}
            {t('The live examiner is not configured on this site yet ({envVar}).', {
              envVar: 'PUBLIC_LIVE_EXAMINER_URL',
            })}
          </p>
        )}
        {variant === 'drills' ? (
          <>
            <SpeakingPartCards onStart={(m) => void startTest(m)} disabled={!TOKEN_URL || needsSignIn || authUnavailable} />
            <p className="mt-4 text-xs text-ink-muted">
              {tn(SPEAKING_PART1_TOPICS.length, { one: '{n} Part 1 topic', other: '{n} Part 1 topics' })} ·{' '}
              {tn(SPEAKING_CUE_CARDS.length, { one: '{n} cue card', other: '{n} cue cards' })} · {t('free')}
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void startTest()}
            disabled={!TOKEN_URL || needsSignIn || authUnavailable}
            className="mt-7 rounded-button bg-brand px-8 py-3 font-display text-base font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('Start the interview')}
          </button>
        )}
        {showAuthModal && <AuthModal initialMode="signin" onClose={() => setShowAuthModal(false)} />}
      </div>
    );
  } else if (phase === 'connecting') {
    content = (
      <div className="rounded-card border border-border bg-surface p-10 text-center shadow-card">
        <p className="text-sm text-ink-muted">{t('Connecting you to {name}…', { name: EXAMINER_NAME })}</p>
      </div>
    );
  } else if (phase === 'grading') {
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

          <GradingProgress
            kind="speaking"
            audioSeconds={gradingAudioSeconds}
            startedAt={gradingStartedAt}
            className="mt-7"
          />

          <p className="mt-6 text-xs text-ink-muted">
            {t('Three independent assessments are compared, and the median becomes your report.')}
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
          onClick={() => (mock ? onAbort?.() : abandonToMenu())}
          className="mt-6 rounded-button border border-border px-5 py-2 text-sm font-semibold hover:bg-surface-alt"
        >
          {t('Back')}
        </button>
      </div>
    );
  } else {
  /* ── the interview screen ── */
  const cue = planRef.current?.cueCard;
  /* Drills get the coach beside the stage; the full mock test stays
     exam-clean, no coaching aids, like the real thing. */
  const drillMethod = variant === 'drills' && modeRef.current !== 'full' ? DRILL_METHOD[modeRef.current] : null;
  const stageLabel =
    stage === 'part1' ? t('Part 1 · Interview') :
    stage === 'part2prep' ? t('Part 2 · Preparation') :
    stage === 'part2talk' ? t('Part 2 · Your talk') :
    stage === 'part3' ? t('Part 3 · Discussion') : t('Finishing…');

  const orbMode = stage === 'part2prep' ? 'lx-prep' : examinerTalking ? 'lx-speaking' : 'lx-listening';

  // Like the paper card in the real exam: on screen for ALL of Part 2 —
  // preparation, the talk, and (in the Part 2 drill) the rounding-off
  // question. Rendered above the orb and sticky, so it can't scroll away
  // while the student is talking.
  const showCueCard =
    !!cue &&
    (stage === 'part2prep' || stage === 'part2talk' || (stage === 'wrapup' && modeRef.current === 'part2'));

  content = (
    <div className={drillMethod ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4' : ''}>
    <div className="space-y-4">
      <style>{LX_STYLES}</style>

      {showCueCard && cue && (
        <div className="sticky top-20 z-10 rounded-card border border-border bg-surface p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t('Cue card')}</p>
          <p className="mt-2 font-semibold">{cue.topic}</p>
          <p className="mt-2 text-sm text-ink-muted">{t('You should say:')}</p>
          <ul className="mt-1 space-y-1 text-sm text-ink-muted">
            {cue.bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span aria-hidden="true">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {drillMethod && cue.ideas && cue.ideas.length > 0 && (
            <div className="mt-3">
              <IdeaHints ideas={cue.ideas} label={t('Stuck? Ideas for this card')} />
            </div>
          )}
          {stage === 'part2prep' && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("Your notes (not graded, the examiner can't see them)…")}
              className="mt-3 w-full rounded-lg border border-border bg-surface-alt p-3 text-sm focus:border-brand focus:outline-none"
            />
          )}
        </div>
      )}

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
                ✍ {t('Prepare your talk:')}{' '}
                <span className="lx-tick inline-block font-display text-base font-extrabold" key={prepSecondsLeft}>
                  {prepSecondsLeft}s
                </span>
              </>
            ) : examinerTalking ? (
              t('{name} is speaking: listen', { name: EXAMINER_NAME })
            ) : (
              t('Your turn: speak')
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
            {showCaptions ? t('Hide captions') : t('Show captions')}
          </button>
          {stage === 'part2prep' && (
            <button
              type="button"
              onClick={beginPart2Talk}
              className="rounded-button bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
            >
              {t("I'm ready, start speaking")}
            </button>
          )}
          {stage === 'part2talk' && (
            <button
              type="button"
              onClick={() => beginPart3(false)}
              className="rounded-button border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-alt"
            >
              {t("I've finished my talk")}
            </button>
          )}
          <button
            type="button"
            onClick={() => endEarly('candidate')}
            className="rounded-button border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-alt"
          >
            {t('End test early')}
          </button>
        </div>
      </div>

      {notice && <p className="rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">{notice}</p>}
    </div>

    {/* Drills keep a coach beside the stage: a structure to follow, phrases
        to reach for, topic vocab to drop in. That coaching aid is what
        distinguishes practice from the mock test. */}
    {drillMethod && (
      <div className="mt-4 lg:sticky lg:top-20 lg:mt-0">
        <SpeakingCoachPanel method={drillMethod} vocab={planRef.current?.vocab} />
      </div>
    )}
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
