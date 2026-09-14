/* Mock Exam Day: a single chained sitting — Listening, then Reading, then
   Writing, with no breaks — mirroring the real IELTS day as closely as this
   portal's pieces allow. Listening and Reading are the existing full-test
   TestPlayer, reused as-is in bare exam mode (see the onFinish prop below);
   Writing is new here since nothing in the app already does "one shared
   60-minute clock across two tasks, no grading". See src/lib/tests/mock.ts
   for the pure pair-picking logic and the essay/attempt storage. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PracticeTest } from '../lib/tests/schema';
import { ALL_TESTS } from '../data/tests';
import { WRITING_PROMPTS } from '../data/writing-prompts';
import type { EssayPrompt } from '../lib/writing/schema';
import { countWords } from '../lib/writing/mechanics';
import { isGraderConfigured } from '../lib/writing/grader';
import { getAttempts } from '../lib/progress';
import { pickDefaultPair, pairLabel, testNumber, nextMockId, saveMockAttempt, type MockEssay } from '../lib/tests/mock';
import { withBase } from '../lib/url';
import Html from './Html';
import TestPlayer from './TestPlayer';

type Stage = 'start' | 'listening' | 'transition-reading' | 'reading' | 'transition-writing' | 'writing' | 'results';

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
     TestPlayer doesn't own — the two transition screens and Writing — so
     the warning holds for the entire sitting except the start and results
     screens, same as a real exam has no safe point to just walk away. */
  useEffect(() => {
    const midMock = stage === 'transition-reading' || stage === 'transition-writing' || stage === 'writing';
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
        onFinish={() => setStage('results')}
      />
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
          Listening, then Reading, then Writing, the same order and pace as the real test day, with no breaks in
          between.
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
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted"><NoGradingIcon /></span>
            <span>No AI grading during the mock, Writing is scored later, in the Writing Checker.</span>
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
          Finish Writing ➤
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
}) {
  const graderReady = isGraderConfigured();
  return (
    <div className="screen-in mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-wider text-brand">Mock Exam Day · Results</p>
      <h1 className="mt-1 font-display text-2xl font-extrabold">You've finished the sitting</h1>
      <p className="mt-2 text-ink-muted">
        Listening and Reading are scored the same way as a normal full test. Writing and Speaking aren't
        auto-scored here, so there's no single combined overall band. Get real feedback on your essays in the
        Writing Checker.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ResultCard title={listeningTest.title} raw={listeningResult?.raw} total={listeningResult?.total} bandLabel={listeningResult?.bandLabel} />
        <ResultCard title={readingTest.title} raw={readingResult?.raw} total={readingResult?.total} bandLabel={readingResult?.bandLabel} />
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
          Get AI feedback on these essays →
        </a>
      ) : (
        <p className="mt-6 rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
          AI feedback isn't available on this build. Your essays are saved on this device either way.
        </p>
      )}

      <div className="mt-8">
        <a href={hubUrl} className="text-sm font-semibold text-brand hover:underline">
          ← Back to Tests
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
