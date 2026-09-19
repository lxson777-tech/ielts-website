/* The speaking checker: pick a mode → read the question → record your answer
   → repeat → get a report. Three independent practice modes: "Part 1" (a
   topic's worth of short Q&A), "Part 2" (a cue-card monologue after a
   minute's prep), and "Part 3" (the follow-up discussion for a cue card's
   theme). Each in-progress screen shows a structure cheat-sheet (A.R.E. /
   PEEL / OREO) so students can check it while prepping or answering. Grading
   is audio-native — the actual recordings go to gradeSpeaking(), never a
   transcript — so Pronunciation can be judged from what was really said. */

import { useRef, useState } from 'react';
import type { AnsweredClip, SpeakingAttempt, SpeakingGradeResult, TopicVocab } from '../lib/speaking/schema';
import { SPEAKING_CRITERIA } from '../lib/speaking/schema';
import { SPEAKING_BAND_GUIDES, guideFor } from '../data/band-guides';
import { SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS } from '../data/speaking-prompts';
import type { StructureMethod } from '../data/speaking-structure-guides';
import { nextInRotation } from '../lib/rotation';
import { requestMic, recordSegment, releaseMic, type RecordingHandle } from '../lib/speaking/recorder';
import { toAnsweredClip, gradeSpeaking, isSpeakingGraderConfigured } from '../lib/speaking/grader';
import { recordSpeakingAttempt } from '../lib/progress';
import BandReport from './BandReport';
import SpeakingCoachPanel from './SpeakingCoachPanel';
import SpeakingPartCards from './SpeakingPartCards';
import IdeaHints from './IdeaHints';
import GradingProgress from './GradingProgress';
import ExplainResult from './tutor/ExplainResult';

type Mode = 'part1' | 'part2' | 'part3';
type Phase = 'menu' | 'asking' | 'prepping' | 'listening' | 'grading' | 'report';

const STRUCTURE_METHOD: Record<Mode, StructureMethod> = { part1: 'ARE', part2: 'PEEL', part3: 'OREO' };
const MODE_LABEL: Record<Mode, string> = { part1: 'Speaking Part 1', part2: 'Speaking Part 2', part3: 'Speaking Part 3' };

interface Turn {
  question: string;
  maxMs: number;
  prepMs?: number;
  isMonologue?: boolean;
  /** tap-to-reveal idea angles for this question (from the prompt bank) */
  ideas?: string[];
}

interface CollectedClip {
  question: string;
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export default function SpeakingTester() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [promptTitle, setPromptTitle] = useState('');
  const [phase, setPhase] = useState<Phase>('menu');
  const [turnIndex, setTurnIndex] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [notes, setNotes] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [result, setResult] = useState<SpeakingGradeResult | null>(null);
  /* Identity of the recorded attempt, so "ask Mr EZ to explain this" points
     at marking that already happened rather than sending the clip again. */
  const [attemptAt, setAttemptAt] = useState<string | null>(null);
  const [vocab, setVocab] = useState<TopicVocab[] | undefined>(undefined);
  // The grading wait: when the request went out, and how much speech it has
  // to work through. Both feed the honest progress bar.
  const [gradingStartedAt, setGradingStartedAt] = useState(0);
  const [gradingAudioSeconds, setGradingAudioSeconds] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<RecordingHandle | null>(null);
  const clipsRef = useRef<CollectedClip[]>([]);
  const turnsRef = useRef<Turn[]>([]);
  const cueCardRef = useRef<{ topic: string; bullets: string[] } | null>(null);
  const expectedMinMsRef = useRef(0);
  const modeRef = useRef<Mode | null>(null);
  const promptTitleRef = useRef('');
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prepResolveRef = useRef<(() => void) | null>(null);
  const readyResolveRef = useRef<(() => void) | null>(null);

  async function startMode(m: Mode) {
    if (!isSpeakingGraderConfigured()) return; // the start cards are disabled for this too; belt and braces
    setMicError(null);
    let stream: MediaStream;
    try {
      stream = await requestMic();
    } catch {
      setMicError('Microphone access is required for the Speaking test. Please allow the permission and try again.');
      return;
    }
    streamRef.current = stream;
    clipsRef.current = [];
    modeRef.current = m;
    setMode(m);
    setResult(null);

    let turns: Turn[];
    if (m === 'part1') {
      const id = nextInRotation('ielts.rotation.speaking-part1.v1', SPEAKING_PART1_TOPICS.map((t) => t.id));
      const topic = SPEAKING_PART1_TOPICS.find((t) => t.id === id) ?? SPEAKING_PART1_TOPICS[0]!;
      promptTitleRef.current = topic.topic;
      setPromptTitle(topic.topic);
      setVocab(topic.vocab);
      cueCardRef.current = null;
      turns = topic.questions.map((q) => ({ question: q.text, maxMs: 45_000, ideas: q.ideas }));
      expectedMinMsRef.current = turns.length * 15_000;
    } else {
      const id = nextInRotation('ielts.rotation.speaking-part23.v1', SPEAKING_CUE_CARDS.map((c) => c.id));
      const cue = SPEAKING_CUE_CARDS.find((c) => c.id === id) ?? SPEAKING_CUE_CARDS[0]!;
      promptTitleRef.current = cue.topic;
      setPromptTitle(cue.topic);
      setVocab(cue.vocab);
      cueCardRef.current = { topic: cue.topic, bullets: cue.bullets };
      if (m === 'part2') {
        turns = [
          {
            question: `${cue.topic} You should say: ${cue.bullets.join('; ')}.`,
            maxMs: 120_000,
            prepMs: 60_000,
            isMonologue: true,
            ideas: cue.ideas,
          },
        ];
        expectedMinMsRef.current = 60_000;
      } else {
        turns = cue.part3Questions.map((q) => ({ question: q.text, maxMs: 60_000, ideas: q.ideas }));
        expectedMinMsRef.current = turns.length * 20_000;
      }
    }
    turnsRef.current = turns;
    setTurnCount(turns.length);
    await beginTurn(0);
  }

  async function beginTurn(i: number) {
    const turn = turnsRef.current[i];
    if (!turn) {
      await finishAndGrade();
      return;
    }
    setTurnIndex(i);
    setCurrentQuestion(turn.question);
    setElapsedMs(0);
    setPhase('asking');
    await waitUntilReady();
    if (turn.prepMs) {
      setNotes('');
      setPhase('prepping');
      await runPrepCountdown(turn.prepMs);
    }
    beginRecording(turn.maxMs);
  }

  function waitUntilReady(): Promise<void> {
    return new Promise((resolve) => {
      readyResolveRef.current = resolve;
    });
  }

  function confirmReady() {
    readyResolveRef.current?.();
    readyResolveRef.current = null;
  }

  function runPrepCountdown(prepMs: number): Promise<void> {
    return new Promise((resolve) => {
      prepResolveRef.current = resolve;
      const totalSeconds = Math.round(prepMs / 1000);
      setPrepSecondsLeft(totalSeconds);
      const interval = setInterval(() => {
        setPrepSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(interval);
            prepResolveRef.current = null;
            resolve();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    });
  }

  function skipPrep() {
    prepResolveRef.current?.();
    prepResolveRef.current = null;
  }

  function beginRecording(maxMs: number) {
    if (!streamRef.current) return;
    setPhase('listening');
    recordingRef.current = recordSegment(streamRef.current, { maxMs });
    const startedAt = performance.now();
    elapsedTimerRef.current = setInterval(() => setElapsedMs(performance.now() - startedAt), 200);
    // recordSegment() auto-stops itself at maxMs; this just makes sure the UI
    // advances even if the student never taps "Stop answering".
    autoAdvanceTimerRef.current = setTimeout(() => void stopAnswering(), maxMs + 100);
  }

  async function stopAnswering() {
    const handle = recordingRef.current;
    if (!handle) return;
    recordingRef.current = null;
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

    const seg = await handle.stop();
    const turn = turnsRef.current[turnIndex]!;
    clipsRef.current.push({ question: turn.question, blob: seg.blob, mimeType: seg.mimeType, durationMs: seg.durationMs });
    await beginTurn(turnIndex + 1);
  }

  async function finishAndGrade() {
    const recordedMs = clipsRef.current.reduce((sum, c) => sum + c.durationMs, 0);
    setGradingAudioSeconds(recordedMs / 1000);
    setGradingStartedAt(Date.now());
    setPhase('grading');
    try {
      await runGrading();
    } catch {
      // Without this, any failure in the pipeline (audio decode, blob
      // conversion, grading) left the student stuck on "Grading…" forever.
      if (streamRef.current) {
        releaseMic(streamRef.current);
        streamRef.current = null;
      }
      // isSpeakingGraderConfigured() gates the Start cards, so any failure
      // reaching here happened after a real request went out — network,
      // timeout, or the Worker itself failing, not a missing config.
      setMicError('We could not reach the grading service. Please try again in a minute.');
      setPhase('menu');
    }
  }

  async function runGrading() {
    const clips = clipsRef.current;
    const answered: AnsweredClip[] = await Promise.all(clips.map((c) => toAnsweredClip(c.question, c)));

    const monologueIdx = turnsRef.current.findIndex((t) => t.isMonologue);
    const attempt: SpeakingAttempt =
      modeRef.current === 'part1'
        ? { kind: 'part1', topic: promptTitleRef.current, answers: answered }
        : {
            kind: 'part2and3',
            cueCard: cueCardRef.current!,
            monologue: monologueIdx >= 0 ? answered[monologueIdx] : undefined,
            followUps: answered.filter((_, i) => i !== monologueIdx),
          };

    const graded = await gradeSpeaking(attempt, clips, expectedMinMsRef.current);
    if (streamRef.current) {
      releaseMic(streamRef.current);
      streamRef.current = null;
    }
    // Persist to the on-device history so speaking shows a band-over-time trend
    // like reading and writing already do (previously it was never recorded).
    const gradedMode = modeRef.current;
    if (gradedMode) {
      const at = new Date().toISOString();
      setAttemptAt(at);
      recordSpeakingAttempt({
        at,
        mode: gradedMode,
        topic: promptTitleRef.current,
        overallBand: graded.overallBand,
        criteria: Object.fromEntries(SPEAKING_CRITERIA.map((c) => [c.key, graded.criteria[c.key].band])),
        live: graded.grader.live,
      });
    }
    setResult(graded);
    setPhase('report');
  }

  function backToMenu() {
    if (recordingRef.current) void recordingRef.current.stop();
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (streamRef.current) {
      releaseMic(streamRef.current);
      streamRef.current = null;
    }
    setMode(null);
    setPhase('menu');
    setResult(null);
  }

  /* ── Report screen ── */
  if (phase === 'report' && result) {
    const m = result.mechanics;
    return (
      <div className="screen-in space-y-6">
        <BandReport
          title={promptTitle}
          overallBand={result.overallBand}
          live={result.grader.live}
          offlineWarning="Only Fluency & Coherence has any real signal without an AI examiner (from timing alone). Vocabulary, Grammar and Pronunciation need a model listening to your recording. Your teacher can enable AI grading."
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
            <h3 className="font-display font-bold">Timing check</h3>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Stat label="Spoke for" value={`${Math.round(m.totalDurationMs / 1000)}s`} bad={m.underLength} />
              <Stat label="Silence" value={`${Math.round(m.estSilenceRatio * 100)}%`} bad={m.estSilenceRatio > 0.4} />
              <Stat label="Longest pause" value={`${(m.longestSilenceMs / 1000).toFixed(1)}s`} bad={m.longestSilenceMs > 4000} />
            </div>
            {m.notes.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
                {m.notes.map((n) => (
                  <li key={n} className="flex gap-2">
                    <span aria-hidden="true">·</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {result.moments.length > 0 && (
            <div className="rounded-card border border-border bg-surface p-5 shadow-card">
              <h3 className="font-display font-bold">Moments from your answer</h3>
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
        </BandReport>

        {attemptAt && (
          <ExplainResult
            attempt={{ kind: 'speaking', at: attemptAt }}
            summary={`Estimated band ${result.overallBand.toFixed(1)}`}
          />
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void startMode(mode!)}
            className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
          >
            ↻ Practice this part again
          </button>
          <button
            type="button"
            onClick={backToMenu}
            className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Choose a different part
          </button>
        </div>
      </div>
    );
  }

  /* ── Menu screen ── */
  if (phase === 'menu') {
    return (
      <div className="screen-in space-y-4">
        <div className="speaking-choice">
          <span className="absolute inset-x-0 top-0 h-1 bg-[var(--skill,#0E9F6E)]" aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">Speaking</p>
          <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Choose your speaking practice</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted sm:text-[0.95rem]">
            Pick a part. Each question appears on screen, you record your answer with your microphone, and an AI
            examiner grades you on the four official IELTS Speaking criteria. A coach panel with the answer
            structure, useful phrases, and topic vocabulary stays beside you.
          </p>
          {micError && (
            <p className="mx-auto mt-4 max-w-md rounded-lg bg-error-tint px-3 py-2 text-sm text-error">{micError}</p>
          )}
          {!isSpeakingGraderConfigured() && (
            <p className="mx-auto mt-4 max-w-md rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
              ⚠ AI feedback is not available on this build (PUBLIC_SPEAKING_GRADER_URL is not set).
            </p>
          )}
          <SpeakingPartCards onStart={(m) => void startMode(m)} disabled={!isSpeakingGraderConfigured()} />
          <p className="mt-4 text-xs text-ink-muted">
            {SPEAKING_PART1_TOPICS.length} Part 1 topics · {SPEAKING_CUE_CARDS.length} cue cards · free
          </p>
        </div>
      </div>
    );
  }

  /* ── In-progress screens: asking / prepping / listening / grading ── */
  const remainingMs = Math.max(0, (turnsRef.current[turnIndex]?.maxMs ?? 0) - elapsedMs);
  const currentIdeas = turnsRef.current[turnIndex]?.ideas;
  return (
    <div className="screen-in lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4">
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">
            {MODE_LABEL[mode!]} · {promptTitle}
          </span>
          <span className="text-xs font-semibold text-ink-muted">
            Question {turnIndex + 1} / {turnCount}
          </span>
        </div>
        <p className="mt-3 text-[1.05rem] font-semibold leading-relaxed">{currentQuestion}</p>
        {currentIdeas && currentIdeas.length > 0 && (
          <div className="mt-3">
            <IdeaHints key={turnIndex} ideas={currentIdeas} />
          </div>
        )}
      </div>

      {phase === 'asking' && (
        <div className="screen-in rounded-card border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-ink-muted">Read the question above, then continue when you're ready.</p>
          <button
            type="button"
            onClick={confirmReady}
            className="mt-4 rounded-button bg-brand px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            {turnsRef.current[turnIndex]?.prepMs ? 'Start prep time' : 'Start answering'}
          </button>
        </div>
      )}

      {phase === 'prepping' && (
        <div className="screen-in space-y-3">
          <div className="rounded-card border border-border bg-surface p-6 text-center shadow-card">
            <p className="font-display text-4xl font-extrabold text-brand">{prepSecondsLeft}s</p>
            <p className="mt-1 text-sm text-ink-muted">Prep time: plan what you'll say. You can start early.</p>
            <button
              type="button"
              onClick={skipPrep}
              className="mt-4 rounded-button bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Start speaking now
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Optional notes (not graded)…"
            className="w-full rounded-card border border-border bg-surface p-3 text-sm shadow-card focus:border-brand focus:outline-none"
          />
        </div>
      )}

      {phase === 'listening' && (
        <div className="screen-in rounded-card border border-border bg-surface p-6 text-center shadow-card">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-error">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-error" aria-hidden="true" />
            Recording: {Math.ceil(remainingMs / 1000)}s left
          </p>
          <button
            type="button"
            onClick={() => void stopAnswering()}
            className="mt-4 rounded-button bg-brand px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Stop answering
          </button>
        </div>
      )}

      {phase === 'grading' && (
        <div className="screen-in rounded-card border border-border bg-surface p-6 shadow-card">
          <GradingProgress kind="speaking" audioSeconds={gradingAudioSeconds} startedAt={gradingStartedAt} />
        </div>
      )}
    </div>

    {/* The coach: remounts per question so the stage checklist starts fresh
        for every answer (one A.R.E./OREO pass per question). */}
    <div className="mt-4 lg:sticky lg:top-20 lg:mt-0">
      <SpeakingCoachPanel key={`${promptTitle}-${turnIndex}`} method={STRUCTURE_METHOD[mode!]} vocab={vocab} />
    </div>
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
