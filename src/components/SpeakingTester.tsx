/* The speaking checker: pick a mode → read the question → record your answer
   → repeat → get a report. Two independent practice modes: "Part 1" (a
   topic's worth of short Q&A) and "Part 2 & 3" (a cue-card monologue after a
   minute's prep, then matching follow-up discussion). Grading is
   audio-native — the actual recordings go to gradeSpeaking(), never a
   transcript — so Pronunciation can be judged from what was really said. */

import { useRef, useState } from 'react';
import type { AnsweredClip, SpeakingAttempt, SpeakingGradeResult } from '../lib/speaking/schema';
import { SPEAKING_CRITERIA } from '../lib/speaking/schema';
import { SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS } from '../data/speaking-prompts';
import { nextInRotation } from '../lib/rotation';
import { requestMic, recordSegment, releaseMic, type RecordingHandle } from '../lib/speaking/recorder';
import { toAnsweredClip, gradeSpeaking } from '../lib/speaking/grader';
import BandReport from './BandReport';

type Mode = 'part1' | 'part2and3';
type Phase = 'menu' | 'asking' | 'prepping' | 'listening' | 'grading' | 'report';

interface Turn {
  question: string;
  maxMs: number;
  prepMs?: number;
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
    setMicError(null);
    let stream: MediaStream;
    try {
      stream = await requestMic();
    } catch {
      setMicError('Microphone access is required for the Speaking test — please allow the permission and try again.');
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
      cueCardRef.current = null;
      turns = topic.questions.map((q) => ({ question: q.text, maxMs: 45_000 }));
      expectedMinMsRef.current = turns.length * 15_000;
    } else {
      const id = nextInRotation('ielts.rotation.speaking-part23.v1', SPEAKING_CUE_CARDS.map((c) => c.id));
      const cue = SPEAKING_CUE_CARDS.find((c) => c.id === id) ?? SPEAKING_CUE_CARDS[0]!;
      promptTitleRef.current = cue.topic;
      setPromptTitle(cue.topic);
      cueCardRef.current = { topic: cue.topic, bullets: cue.bullets };
      turns = [
        {
          question: `${cue.topic} You should say: ${cue.bullets.join('; ')}.`,
          maxMs: 120_000,
          prepMs: 60_000,
        },
        ...cue.part3Questions.map((q) => ({ question: q.text, maxMs: 60_000 })),
      ];
      expectedMinMsRef.current = 60_000;
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
    setPhase('grading');
    const clips = clipsRef.current;
    const answered: AnsweredClip[] = await Promise.all(clips.map((c) => toAnsweredClip(c.question, c)));

    const attempt: SpeakingAttempt =
      modeRef.current === 'part1'
        ? { kind: 'part1', topic: promptTitleRef.current, answers: answered }
        : {
            kind: 'part2and3',
            cueCard: cueCardRef.current!,
            monologue: answered[0]!,
            followUps: answered.slice(1),
          };

    const graded = await gradeSpeaking(attempt, clips, expectedMinMsRef.current);
    if (streamRef.current) {
      releaseMic(streamRef.current);
      streamRef.current = null;
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
          offlineWarning="Only Fluency & Coherence has any real signal without an AI examiner (from timing alone) — Vocabulary, Grammar and Pronunciation need a model listening to your recording. Your teacher can enable AI grading."
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
                    <span className="block text-ink-muted">— {mo.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </BandReport>

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
            Choose a different part →
          </button>
        </div>
      </div>
    );
  }

  /* ── Menu screen ── */
  if (phase === 'menu') {
    return (
      <div className="screen-in space-y-4">
        <div className="relative overflow-hidden rounded-card border border-border bg-surface p-8 text-center shadow-card sm:p-10">
          <span className="absolute inset-x-0 top-0 h-1 bg-[var(--skill,#0E9F6E)]" aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">Speaking</p>
          <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Take a Speaking Test</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted sm:text-[0.95rem]">
            Pick a part. Questions are read aloud — record your answer with your microphone, and an AI examiner
            grades you on the four official IELTS Speaking criteria.
          </p>
          {micError && (
            <p className="mx-auto mt-4 max-w-md rounded-lg bg-error-tint px-3 py-2 text-sm text-error">{micError}</p>
          )}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void startMode('part1')}
              className="rounded-button bg-brand px-6 py-3 font-display text-base font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Part 1 practice →
            </button>
            <button
              type="button"
              onClick={() => void startMode('part2and3')}
              className="rounded-button border border-border px-6 py-3 font-display text-base font-bold transition-colors hover:bg-surface-alt"
            >
              Part 2 &amp; 3 practice →
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            {SPEAKING_PART1_TOPICS.length} Part 1 topics · {SPEAKING_CUE_CARDS.length} cue cards · free
          </p>
        </div>
      </div>
    );
  }

  /* ── In-progress screens: asking / prepping / listening / grading ── */
  const remainingMs = Math.max(0, (turnsRef.current[turnIndex]?.maxMs ?? 0) - elapsedMs);
  return (
    <div className="screen-in space-y-4">
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">
            {mode === 'part1' ? 'Speaking Part 1' : turnIndex === 0 ? 'Speaking Part 2' : 'Speaking Part 3'} ·{' '}
            {promptTitle}
          </span>
          <span className="text-xs font-semibold text-ink-muted">
            Question {turnIndex + 1} / {turnCount}
          </span>
        </div>
        <p className="mt-3 text-[1.05rem] font-semibold leading-relaxed">{currentQuestion}</p>
      </div>

      {phase === 'asking' && (
        <div className="screen-in rounded-card border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-ink-muted">Read the question above, then continue when you're ready.</p>
          <button
            type="button"
            onClick={confirmReady}
            className="mt-4 rounded-button bg-brand px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            {turnsRef.current[turnIndex]?.prepMs ? 'Start prep time →' : 'Start answering →'}
          </button>
        </div>
      )}

      {phase === 'prepping' && (
        <div className="screen-in space-y-3">
          <div className="rounded-card border border-border bg-surface p-6 text-center shadow-card">
            <p className="font-display text-4xl font-extrabold text-brand">{prepSecondsLeft}s</p>
            <p className="mt-1 text-sm text-ink-muted">Prep time — plan what you'll say. You can start early.</p>
            <button
              type="button"
              onClick={skipPrep}
              className="mt-4 rounded-button bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Start speaking now →
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
            Recording — {Math.ceil(remainingMs / 1000)}s left
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
        <div className="screen-in rounded-card border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-ink-muted">Grading your answer…</p>
        </div>
      )}
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
