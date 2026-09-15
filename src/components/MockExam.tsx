/* Mock Exam Day: a single chained sitting — Listening, then Reading, then
   Writing, then Speaking, with no breaks — mirroring the real IELTS day as
   closely as this portal's pieces allow. Listening and Reading are the
   existing full-test TestPlayer, reused as-is in bare exam mode (see the
   onFinish prop below); Writing is new here since nothing in the app
   already does "one shared 60-minute clock across two tasks, no grading".
   Speaking (2026-09) is the live AI examiner (src/components/LiveExaminer,
   `mock` mode) embedded as the fourth stage, behind its own brief screen
   with a Skip option since it needs a microphone and, on the paid provider,
   a signed-in account — see SpeakingBriefScreen below. See
   src/lib/tests/mock.ts for the pure pair-picking logic, the official
   overall-band rounding, and the essay/attempt storage. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { PracticeTest } from '../lib/tests/schema';
import { ALL_TESTS } from '../data/tests';
import { WRITING_PROMPTS } from '../data/writing-prompts';
import type { EssayPrompt } from '../lib/writing/schema';
import { countWords } from '../lib/writing/mechanics';
import { isGraderConfigured } from '../lib/writing/grader';
import { getAttempts } from '../lib/progress';
import {
  pickDefaultPair,
  pairLabel,
  testNumber,
  nextMockId,
  saveMockAttempt,
  overallMockBand,
  type MockEssay,
} from '../lib/tests/mock';
import { withBase } from '../lib/url';
import { isAuthConfigured } from '../lib/auth/supabase';
import { onAuthChange } from '../lib/auth/session';
import { fetchLiveConfig, type LiveConfig } from '../lib/speaking/live/link';
import Html from './Html';
import TestPlayer from './TestPlayer';
import LiveExaminer from './LiveExaminer';
import AuthModal from './AuthModal';

type Stage =
  | 'start'
  | 'listening'
  | 'transition-reading'
  | 'reading'
  | 'transition-writing'
  | 'writing'
  | 'speaking-brief'
  | 'speaking'
  | 'results';

/** Result handed back by the embedded live examiner (LiveExaminer's
    `onComplete`), kept as its own type since MockAttempt only stores the
    number, not the per-criterion breakdown. */
interface SpeakingLegResult {
  overallBand: number;
  criteria: Record<string, number>;
}

interface LegResult {
  raw: number;
  total: number;
  band: number;
  bandLabel: string;
  secondsUsed: number;
}

const TASK1_ACADEMIC = WRITING_PROMPTS.filter((p) => p.task === 'task1' && p.variant !== 'letter');
const TASK2_PROMPTS = WRITING_PROMPTS.filter((p) => p.task === 'task2');
const WRITING_SECONDS = 60 * 60;
const TRANSITION_SECONDS = 60;
/** Same env var LiveExaminer.tsx reads — used here only to know whether the
    Speaking stage's brief screen has anything to gate (sign-in) or offer
    (Start) at all. */
const LIVE_EXAMINER_URL: string | undefined = import.meta.env?.PUBLIC_LIVE_EXAMINER_URL;

const asset = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${p}`;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** Icons for the "what to expect" list on the start screen, inline SVG
    (currentColor) instead of emoji so they sit quietly in text-ink-muted
    like every other icon in the workspace rather than four different
    platform emoji colours. */
function ListeningIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    </svg>
  );
}
function ReadingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21V5.5Z" />
    </svg>
  );
}
function WritingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m17 3 4 4-11.5 11.5-5 1 1-5L17 3Z" />
      <path d="m14.5 5.5 4 4" />
    </svg>
  );
}
function NoGradingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6.5 17.5 11-11" />
    </svg>
  );
}
function SpeakingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3.5" />
    </svg>
  );
}

/** One random-ish pick, stable for the lifetime of this mock sitting
    (computed once via useState's lazy initializer, not re-rolled on every
    render). A real rotation store (see src/lib/rotation.ts, used by the
    Writing Trainer/Checker) would remember picks across mocks too, but a
    mock is a rare, deliberate sitting rather than daily practice, so a
    fresh pick per sitting is the simpler and more honest behaviour here. */
function randomOf<T>(pool: T[]): T | undefined {
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;
}

export default function MockExam({ hubUrl }: { hubUrl: string }) {
  const listeningTests = useMemo(
    () => ALL_TESTS.filter((t) => t.skill === 'listening').sort((a, b) => a.id.localeCompare(b.id)),
    [],
  );
  const readingTests = useMemo(
    () => ALL_TESTS.filter((t) => t.skill === 'reading').sort((a, b) => a.id.localeCompare(b.id)),
    [],
  );
  const defaultPair = useMemo(() => pickDefaultPair(ALL_TESTS), []);

  const [stage, setStage] = useState<Stage>('start');
  const [listeningId, setListeningId] = useState(defaultPair?.listening.id ?? listeningTests[0]?.id ?? '');
  const [readingId, setReadingId] = useState(defaultPair?.reading.id ?? readingTests[0]?.id ?? '');
  const [mockId, setMockId] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [listeningResult, setListeningResult] = useState<LegResult | null>(null);
  const [readingResult, setReadingResult] = useState<LegResult | null>(null);
  const [essay1, setEssay1] = useState('');
  const [essay2, setEssay2] = useState('');
  const [writingSecondsLeft, setWritingSecondsLeft] = useState(WRITING_SECONDS);
  const [speakingResult, setSpeakingResult] = useState<SpeakingLegResult | null>(null);
  const [speakingSkipped, setSpeakingSkipped] = useState(false);
  const savedRef = useRef(false);

  const listeningTest: PracticeTest | undefined = listeningTests.find((t) => t.id === listeningId) ?? listeningTests[0];
  const readingTest: PracticeTest | undefined = readingTests.find((t) => t.id === readingId) ?? readingTests[0];

  // Stable for the sitting: the same Task 1/Task 2 pair is shown whether the
  // student is still on the start screen or deep into the Writing leg.
  const [task1Prompt] = useState<EssayPrompt | undefined>(() => randomOf(TASK1_ACADEMIC));
  const [task2Prompt] = useState<EssayPrompt | undefined>(() => randomOf(TASK2_PROMPTS));

  /* Leaving mid-mock: Listening and Reading already warn on their own (see
     TestPlayer's beforeunload effect, active for the whole time each nested
     instance is started-but-not-submitted). This covers the stages
     TestPlayer doesn't own — the transition screens, Writing, and the
     Speaking brief/interview — so the warning holds for the entire sitting
     except the start and results screens, same as a real exam has no safe
     point to just walk away. */
  useEffect(() => {
    const midMock =
      stage === 'transition-reading' ||
      stage === 'transition-writing' ||
      stage === 'writing' ||
      stage === 'speaking-brief' ||
      stage === 'speaking';
    if (!midMock) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [stage]);

  /* Writing's single 60-minute clock, running only while stage === 'writing'. */
  useEffect(() => {
    if (stage !== 'writing') return;
    const id = window.setInterval(() => {
      setWritingSecondsLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          setStage('results');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [stage]);

  /* Record the combined mock attempt exactly once, as soon as both legs'
     results and the essays are available. */
  useEffect(() => {
    if (stage !== 'results' || savedRef.current) return;
    if (!listeningResult || !readingResult || !listeningTest || !readingTest) return;
    savedRef.current = true;
    const essays: MockEssay[] = [];
    if (task1Prompt) essays.push({ promptId: task1Prompt.id, task: 'task1', text: essay1, wordCount: countWords(essay1) });
    if (task2Prompt) essays.push({ promptId: task2Prompt.id, task: 'task2', text: essay2, wordCount: countWords(essay2) });
    saveMockAttempt({
      id: mockId || nextMockId(startedAt || new Date().toISOString()),
      at: startedAt || new Date().toISOString(),
      listeningTestId: listeningTest.id,
      listeningBand: listeningResult.band,
      listeningRaw: listeningResult.raw,
      listeningTotal: listeningResult.total,
      readingTestId: readingTest.id,
      readingBand: readingResult.band,
      readingRaw: readingResult.raw,
      readingTotal: readingResult.total,
      essays,
      speakingBand: speakingResult?.overallBand,
      speakingSkipped,
      secondsUsed: listeningResult.secondsUsed + readingResult.secondsUsed + (WRITING_SECONDS - writingSecondsLeft),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function beginMock() {
    const now = new Date().toISOString();
    setMockId(nextMockId(now));
    setStartedAt(now);
    setStage('listening');
  }

  /* Developer shortcut for manual/automated verification: ?stage=speaking
     jumps straight to the Speaking brief screen with synthesized Listening,
     Reading and Writing results, skipping ~2h45 of real exam flow. Honoured
     only in dev builds — import.meta.env.DEV is statically false in a
     production build, so this whole branch is dead code there. */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (new URLSearchParams(window.location.search).get('stage') !== 'speaking') return;
    const now = new Date().toISOString();
    setMockId(nextMockId(now));
    setStartedAt(now);
    setListeningResult({ raw: 32, total: 40, band: 7, bandLabel: '7', secondsUsed: 28 * 60 });
    setReadingResult({ raw: 30, total: 40, band: 6.5, bandLabel: '6.5', secondsUsed: 58 * 60 });
    setEssay1('(dev shortcut: Task 1 left blank)');
    setEssay2('(dev shortcut: Task 2 left blank)');
    setWritingSecondsLeft(0);
    setStage('speaking-brief');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleListeningFinish() {
    if (!listeningTest) return;
    const legAttempts = getAttempts(listeningTest.id);
    const last = legAttempts[legAttempts.length - 1]?.attempt;
    if (last) {
      setListeningResult({ raw: last.raw, total: last.total, band: last.band, bandLabel: last.bandLabel, secondsUsed: last.secondsUsed });
    }
    setStage('transition-reading');
  }

  function handleReadingFinish() {
    if (!readingTest) return;
    const legAttempts = getAttempts(readingTest.id);
    const last = legAttempts[legAttempts.length - 1]?.attempt;
    if (last) {
      setReadingResult({ raw: last.raw, total: last.total, band: last.band, bandLabel: last.bandLabel, secondsUsed: last.secondsUsed });
    }
    setStage('transition-writing');
  }

  if (!listeningTest || !readingTest) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface-alt p-4 text-center">
        <p className="text-ink-muted">No practice tests are available to build a mock exam right now.</p>
      </div>
    );
  }

  if (stage === 'start') {
    return (
      <StartScreen
        hubUrl={hubUrl}
        listeningTests={listeningTests}
        readingTests={readingTests}
        listeningId={listeningId}
        readingId={readingId}
        onChangeListening={setListeningId}
        onChangeReading={setReadingId}
        pairLabelText={pairLabel(ALL_TESTS, { listening: listeningTest, reading: readingTest })}
        onStart={beginMock}
      />
    );
  }

  if (stage === 'listening') {
    return <TestPlayer key={listeningTest.id} test={listeningTest} hubUrl={hubUrl} attemptKind="full" onFinish={handleListeningFinish} />;
  }

  if (stage === 'transition-reading') {
    return (
      <TransitionScreen
        next="Reading"
        subtitle={`Reading Test ${testNumber(readingTest, readingTests)} · ${readingTest.durationMinutes} minutes`}
        onContinue={() => setStage('reading')}
      />
    );
  }

  if (stage === 'reading') {
    return <TestPlayer key={readingTest.id} test={readingTest} hubUrl={hubUrl} attemptKind="full" onFinish={handleReadingFinish} />;
  }

  if (stage === 'transition-writing') {
    return (
      <TransitionScreen
        next="Writing"
        subtitle="Task 1 and Task 2 · 60 minutes total"
        onContinue={() => setStage('writing')}
      />
    );
  }

  if (stage === 'writing') {
    return (
      <WritingLeg
        task1={task1Prompt}
        task2={task2Prompt}
        essay1={essay1}
        essay2={essay2}
        onChangeEssay1={setEssay1}
        onChangeEssay2={setEssay2}
        secondsLeft={writingSecondsLeft}
        onFinish={() => setStage('speaking-brief')}
      />
    );
  }

  if (stage === 'speaking-brief') {
    return (
      <SpeakingBriefScreen
        onStart={() => setStage('speaking')}
        onSkip={() => {
          setSpeakingSkipped(true);
          setStage('results');
        }}
      />
    );
  }

  if (stage === 'speaking') {
    return (
      <div className="screen-in min-h-dvh bg-surface-alt px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <LiveExaminer
            variant="full"
            mock
            onComplete={(result) => {
              setSpeakingResult(result);
              setStage('results');
            }}
            onAbort={() => {
              setSpeakingSkipped(true);
              setStage('results');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <ResultsScreen
      hubUrl={hubUrl}
      listeningTest={listeningTest}
      readingTest={readingTest}
      listeningResult={listeningResult}
      readingResult={readingResult}
      task1={task1Prompt}
      task2={task2Prompt}
      essay1={essay1}
      essay2={essay2}
      speakingResult={speakingResult}
      speakingSkipped={speakingSkipped}
    />
  );
}

function StartScreen({
  hubUrl,
  listeningTests,
  readingTests,
  listeningId,
  readingId,
  onChangeListening,
  onChangeReading,
  pairLabelText,
  onStart,
}: {
  hubUrl: string;
  listeningTests: PracticeTest[];
  readingTests: PracticeTest[];
  listeningId: string;
  readingId: string;
  onChangeListening: (id: string) => void;
  onChangeReading: (id: string) => void;
  pairLabelText: string;
  onStart: () => void;
}) {
  return (
    <div className="screen-in grid min-h-dvh place-items-center bg-surface-alt p-4">
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8 shadow-card-hover">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Mock Exam Day</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">A full IELTS sitting, back to back</h1>
        <p className="mt-2 text-ink-muted">
          Listening, then Reading, then Writing, then Speaking, the same order and pace as the real test day, with
          no breaks in between. About 2 hours 45 minutes for the first three papers, plus 14 minutes for Speaking.
        </p>

        <ul className="mt-6 space-y-2.5 text-sm text-ink">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted"><ListeningIcon /></span>
            <span>
              <strong>Listening</strong> (about 30 minutes, plus time at the end to check your answers). The
              recording plays <strong>once</strong>, exam conditions.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted"><ReadingIcon /></span>
            <span><strong>Reading</strong> (60 minutes), straight after.</span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted"><WritingIcon /></span>
            <span>
              <strong>Writing</strong> (60 minutes): Task 1 and Task 2 share one clock, a suggested 20 minutes on
              Task 1 and 40 on Task 2, same as the real exam.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted"><SpeakingIcon /></span>
            <span>
              <strong>Speaking</strong> (about 14 minutes): a real-time voice conversation with the AI examiner,
              Part 1 interview, Part 2 long turn, Part 3 discussion. Needs a microphone, and an account if this
              site requires one for it. You can skip this stage.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted"><NoGradingIcon /></span>
            <span>
              Listening, Reading and Speaking are graded automatically. Writing isn't graded during the mock,
              score it afterwards in the Writing Checker.
            </span>
          </li>
        </ul>

        <div className="mt-6 space-y-3 rounded-card border border-border bg-surface-alt p-4">
          <p className="text-sm font-semibold">Choose your tests</p>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-ink-muted">Listening</span>
            <select
              value={listeningId}
              onChange={(e) => onChangeListening(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium focus:border-brand"
            >
              {listeningTests.map((t) => (
                <option key={t.id} value={t.id}>
                  Listening Test {testNumber(t, listeningTests)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-ink-muted">Reading</span>
            <select
              value={readingId}
              onChange={(e) => onChangeReading(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium focus:border-brand"
            >
              {readingTests.map((t) => (
                <option key={t.id} value={t.id}>
                  Reading Test {testNumber(t, readingTests)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-ink-muted">Defaulted to the next tests you haven't taken: {pairLabelText}.</p>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <a href={hubUrl} className="inline-block px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
            Back
          </a>
          <button
            type="button"
            onClick={onStart}
            className="rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
          >
            Start Mock Exam
          </button>
        </div>
      </div>
    </div>
  );
}

/** Between-legs screen (feature spec: "Exam continues: Reading starts in 60
    seconds"). A real sitting has no break, but a screen change still needs a
    beat — the countdown is short and skippable, never a real pause. */
function TransitionScreen({ next, subtitle, onContinue }: { next: string; subtitle: string; onContinue: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(TRANSITION_SECONDS);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    const id = window.setInterval(() => {
      setSecondsLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          if (!firedRef.current) {
            firedRef.current = true;
            onContinue();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNow() {
    if (firedRef.current) return;
    firedRef.current = true;
    onContinue();
  }

  return (
    <div className="screen-in grid min-h-dvh place-items-center bg-surface-alt p-4">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-card-hover">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Exam continues</p>
        <h1 className="mt-1 font-display text-xl font-extrabold">{next} starts in {secondsLeft} seconds</h1>
        <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
        <button
          type="button"
          onClick={startNow}
          className="mt-6 rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
        >
          Start now
        </button>
      </div>
    </div>
  );
}

function WritingLeg({
  task1,
  task2,
  essay1,
  essay2,
  onChangeEssay1,
  onChangeEssay2,
  secondsLeft,
  onFinish,
}: {
  task1?: EssayPrompt;
  task2?: EssayPrompt;
  essay1: string;
  essay2: string;
  onChangeEssay1: (v: string) => void;
  onChangeEssay2: (v: string) => void;
  secondsLeft: number;
  onFinish: () => void;
}) {
  const timerWarn = secondsLeft <= 300;
  return (
    <div className="screen-in flex min-h-dvh flex-col bg-surface text-ink">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <span className="font-display text-sm font-bold">Mock Exam · Writing</span>
        <div
          className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-bold sm:gap-2 sm:px-4 ${
            timerWarn ? 'animate-pulse bg-error-tint text-error' : 'bg-surface-alt text-ink'
          }`}
          role="timer"
          aria-label="Time remaining"
        >
          <span aria-hidden="true">⏱</span>
          {fmtClock(secondsLeft)}
        </div>
        <button
          type="button"
          onClick={onFinish}
          className="shrink-0 rounded-button bg-brand px-3 py-1.5 font-display text-sm font-semibold text-white hover:bg-brand-hover sm:px-4"
        >
          Finish Writing
        </button>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-6 sm:px-6">
        <p className="rounded-card border border-border bg-surface-alt px-4 py-3 text-sm text-ink-muted">
          Suggested timing: about <strong>{task1?.suggestedMinutes ?? 20} minutes</strong> on Task 1, then{' '}
          <strong>{task2?.suggestedMinutes ?? 40} minutes</strong> on Task 2. One clock for both, split it however
          suits you, then submit when you're done or when time runs out.
        </p>

        <WritingTaskBlock label="Task 1 (Academic)" prompt={task1} value={essay1} onChange={onChangeEssay1} />
        <WritingTaskBlock label="Task 2" prompt={task2} value={essay2} onChange={onChangeEssay2} />
      </div>
    </div>
  );
}

function WritingTaskBlock({
  label,
  prompt,
  value,
  onChange,
}: {
  label: string;
  prompt?: EssayPrompt;
  value: string;
  onChange: (v: string) => void;
}) {
  const wordCount = countWords(value);
  if (!prompt) {
    return (
      <section>
        <p className="rounded-card border border-border bg-surface-alt p-4 text-sm text-ink-muted">
          No {label} prompt is available right now.
        </p>
      </section>
    );
  }
  return (
    <section>
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <span className="text-xs font-bold uppercase tracking-wider text-brand">{label} · ~{prompt.suggestedMinutes} min</span>
        <Html as="p" className="mt-2 text-[0.95rem] leading-relaxed" html={prompt.promptHtml} />
        {prompt.imageUrl && (
          <img src={asset(prompt.imageUrl)} alt="Task visual" className="mt-3 w-full rounded-lg border border-border" />
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        placeholder="Write your answer here…"
        aria-label={`${label} answer`}
        className="mt-3 w-full rounded-card border border-border bg-surface p-4 text-[0.95rem] leading-relaxed shadow-card focus:border-brand focus:outline-none"
      />
      <p className={`mt-2 text-sm font-semibold ${wordCount >= prompt.minWords ? 'text-success' : 'text-ink-muted'}`}>
        {wordCount} / {prompt.minWords}+ words
      </p>
    </section>
  );
}

/** Part 4's brief screen: the same sign-in gate the standalone live
    examiner page uses (isAuthConfigured/onAuthChange/fetchLiveConfig,
    identical to LiveExaminer's own — see its file header), reduced to just
    the decision this screen needs to make: can "Start speaking test" be
    pressed right now, or does the student need to sign in first? Either
    way "Skip speaking" stays available, so a student who'd rather not
    (no mic, no time, doesn't want to sign in) can still finish the sitting
    with three papers. */
function SpeakingBriefScreen({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [liveConfig, setLiveConfig] = useState<LiveConfig | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => onAuthChange(setUser), []);

  useEffect(() => {
    if (!LIVE_EXAMINER_URL) return;
    let cancelled = false;
    fetchLiveConfig(LIVE_EXAMINER_URL)
      .then((cfg) => {
        if (!cancelled) setLiveConfig(cfg);
      })
      .catch(() => {
        /* Can't tell yet whether sign-in is required — Start stays
           disabled until it resolves or the student skips. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const authConfigured = isAuthConfigured();
  const requiresSignIn = liveConfig?.requiresSignIn === true;
  const needsSignIn = requiresSignIn && authConfigured && !user;
  const authUnavailable = requiresSignIn && !authConfigured;
  const examinerConfigured = !!LIVE_EXAMINER_URL;
  const canStart = examinerConfigured && !needsSignIn && !authUnavailable;

  return (
    <div className="screen-in grid min-h-dvh place-items-center bg-surface-alt p-4">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-card-hover">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Part 4 of 4</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">Speaking</h1>
        <p className="mt-2 text-sm text-ink-muted">
          About 14 minutes with the AI examiner: Part 1 interview, Part 2 long turn, Part 3 discussion. You need a
          microphone and to be signed in.
        </p>

        {needsSignIn && (
          <div className="mt-5 rounded-lg bg-warning-tint px-3 py-3 text-left text-xs text-ink-muted">
            <p>Sign in to take the speaking test (this keeps the paid voice service for real students).</p>
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="mt-2 rounded-button border border-border px-4 py-1.5 text-xs font-semibold hover:bg-surface-alt"
            >
              Sign in
            </button>
          </div>
        )}
        {authUnavailable && (
          <p className="mt-5 rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
            The speaking test needs accounts to be enabled on this site.
          </p>
        )}
        {!examinerConfigured && (
          <p className="mt-5 rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
            The speaking test isn't configured on this site yet.
          </p>
        )}

        <div className="mt-7 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start speaking test
          </button>
          <button type="button" onClick={onSkip} className="px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
            Skip speaking
          </button>
        </div>

        {showAuthModal && <AuthModal initialMode="signin" onClose={() => setShowAuthModal(false)} />}
      </div>
    </div>
  );
}

function ResultsScreen({
  hubUrl,
  listeningTest,
  readingTest,
  listeningResult,
  readingResult,
  task1,
  task2,
  essay1,
  essay2,
  speakingResult,
  speakingSkipped,
}: {
  hubUrl: string;
  listeningTest: PracticeTest;
  readingTest: PracticeTest;
  listeningResult: LegResult | null;
  readingResult: LegResult | null;
  task1?: EssayPrompt;
  task2?: EssayPrompt;
  essay1: string;
  essay2: string;
  speakingResult: SpeakingLegResult | null;
  speakingSkipped: boolean;
}) {
  const graderReady = isGraderConfigured();

  /* The overall band is the official mean-of-components method (see
     overallMockBand in src/lib/tests/mock.ts), taken over whichever papers
     actually have a band: Listening and Reading always do; Speaking adds a
     third when the student took it. Writing isn't part of it — this mock,
     like the rest of the site (see the Trainer/checker split noted in
     WritingLeg above), never auto-grades essays, so there's no fourth
     number to average in. The card names exactly how many papers went in
     rather than implying a fixed four, so the figure stays honest whether
     or not Speaking was taken. */
  const bandedPapers: number[] = [];
  if (listeningResult) bandedPapers.push(listeningResult.band);
  if (readingResult) bandedPapers.push(readingResult.band);
  if (speakingResult) bandedPapers.push(speakingResult.overallBand);
  const overall = bandedPapers.length > 0 ? overallMockBand(bandedPapers) : null;
  const scoredIntro = speakingResult
    ? 'Listening, Reading and Speaking are scored automatically.'
    : speakingSkipped
      ? 'Listening and Reading are scored automatically; you skipped Speaking.'
      : 'Listening and Reading are scored automatically.';

  return (
    <div className="screen-in mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-wider text-brand">Mock Exam Day · Results</p>
      <h1 className="mt-1 font-display text-2xl font-extrabold">You've finished the sitting</h1>
      <p className="mt-2 text-ink-muted">
        {scoredIntro} Writing isn't auto-scored here, so get real feedback on your essays in the Writing Checker.
      </p>

      {overall != null && (
        <div className="mt-6 rounded-card border border-brand/25 bg-brand-tint/40 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">
            Overall band · {bandedPapers.length} {bandedPapers.length === 1 ? 'paper' : 'papers'}
          </p>
          <p className="mt-1 font-display text-4xl font-extrabold text-brand">{overall.toFixed(1)}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Mean of {speakingResult ? 'Listening, Reading and Speaking' : 'Listening and Reading'}, rounded to the
            nearest half band. Writing isn't included — it isn't graded during the mock.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ResultCard title={listeningTest.title} raw={listeningResult?.raw} total={listeningResult?.total} bandLabel={listeningResult?.bandLabel} />
        <ResultCard title={readingTest.title} raw={readingResult?.raw} total={readingResult?.total} bandLabel={readingResult?.bandLabel} />
        <WritingResultCard essay1={essay1} essay2={essay2} graderReady={graderReady} />
        <SpeakingResultCard result={speakingResult} skipped={speakingSkipped} />
      </div>

      <div className="mt-8 space-y-6">
        <h2 className="font-display text-lg font-bold">Your essays</h2>
        <EssayCard label="Task 1" prompt={task1} text={essay1} />
        <EssayCard label="Task 2" prompt={task2} text={essay2} />
      </div>

      {graderReady ? (
        <a
          href={withBase('/writing/checker')}
          className="mt-6 inline-block rounded-button bg-brand px-5 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
        >
          Get AI feedback on these essays
        </a>
      ) : (
        <p className="mt-6 rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
          AI feedback isn't available on this build. Your essays are saved on this device either way.
        </p>
      )}

      {speakingSkipped && (
        <p className="mt-6 rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
          You skipped Speaking, so it isn't in your overall band above. You can take a full Speaking test any time
          at <a href={withBase('/speaking/examiner')} className="font-semibold underline">the live AI examiner</a>.
        </p>
      )}

      <div className="mt-8">
        <a href={hubUrl} className="text-sm font-semibold text-brand hover:underline">
          Back to Tests
        </a>
      </div>
    </div>
  );
}

function ResultCard({
  title,
  raw,
  total,
  bandLabel,
}: {
  title: string;
  raw?: number;
  total?: number;
  bandLabel?: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 text-center shadow-card">
      <p className="text-sm font-semibold text-ink-muted">{title}</p>
      <p className="mt-2 font-display text-3xl font-extrabold text-brand">{bandLabel ?? '—'}</p>
      {raw != null && total != null && <p className="mt-1 text-xs text-ink-muted">{raw} / {total} correct</p>}
    </div>
  );
}

/** Writing never gets a band in the mock (see the note in ResultsScreen
    above), so this card shows what there is instead: word counts, and a
    reminder that real feedback lives one click away in the Writing
    Checker. */
function WritingResultCard({ essay1, essay2, graderReady }: { essay1: string; essay2: string; graderReady: boolean }) {
  const words = countWords(essay1) + countWords(essay2);
  return (
    <div className="rounded-card border border-border bg-surface p-5 text-center shadow-card">
      <p className="text-sm font-semibold text-ink-muted">Writing</p>
      <p className="mt-2 font-display text-3xl font-extrabold text-ink-muted">—</p>
      <p className="mt-1 text-xs text-ink-muted">
        {words} words · {graderReady ? 'score it below' : 'not scored here'}
      </p>
    </div>
  );
}

function SpeakingResultCard({ result, skipped }: { result: SpeakingLegResult | null; skipped: boolean }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 text-center shadow-card">
      <p className="text-sm font-semibold text-ink-muted">Speaking</p>
      <p className="mt-2 font-display text-3xl font-extrabold text-brand">
        {result ? result.overallBand.toFixed(1) : '—'}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{result ? 'live AI examiner' : skipped ? 'Skipped' : 'not taken'}</p>
    </div>
  );
}

function EssayCard({ label, prompt, text }: { label: string; prompt?: EssayPrompt; text: string }) {
  const wordCount = countWords(text);
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-brand">{label}</span>
        <span className="text-xs text-ink-muted">{wordCount} words</span>
      </div>
      {prompt && <Html as="p" className="mt-2 text-sm text-ink-muted" html={prompt.promptHtml} />}
      <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed">{text || <span className="text-ink-muted">(left blank)</span>}</p>
    </div>
  );
}
