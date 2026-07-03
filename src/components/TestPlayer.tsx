import { useEffect, useMemo, useRef, useState } from 'react';
import type { PracticeTest, Question, QuestionGroup, TestPart } from '../lib/tests/schema';
import { bandEstimate, bandMidpoint, isCorrect, questionCount } from '../lib/tests/schema';
import { recordTestAttempt } from '../lib/progress';
import { clearSession, loadSession, saveAnswers, secondsLeft, startSession } from '../lib/test-session';

interface Props {
  test: PracticeTest;
  /** Base-prefixed URL back to the tests hub. */
  hubUrl: string;
}

/** Base-prefixed URL for images stored under /public. */
const asset = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${p}`;

interface Numbered {
  question: Question;
  group: QuestionGroup;
  part: TestPart;
  n: number;
}

function numberQuestions(test: PracticeTest): Numbered[] {
  const out: Numbered[] = [];
  let n = 0;
  for (const part of test.parts)
    for (const group of part.groups)
      for (const question of group.questions) out.push({ question, group, part, n: ++n });
  return out;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function TestPlayer({ test, hubUrl }: Props) {
  const numbered = useMemo(() => numberQuestions(test), [test]);
  const TOTAL = numbered.length;

  // Resume an in-progress session if one exists (survives refresh / tab close).
  const resumed = useMemo(
    () => (typeof window !== 'undefined' ? loadSession(test.id) : null),
    [test.id],
  );

  const [started, setStarted] = useState(() => !!resumed);
  const [answers, setAnswers] = useState<Record<string, string>>(() => resumed?.answers ?? {});
  const [submitted, setSubmitted] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() =>
    resumed ? secondsLeft(resumed) : test.durationMinutes * 60,
  );
  const [activePart, setActivePart] = useState(0);
  const [splitPct, setSplitPct] = useState(50);

  function start() {
    const s = startSession(test);
    setTimeLeft(secondsLeft(s));
    setStarted(true);
  }

  const mainRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef(false);

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const correctCount = useMemo(
    () => numbered.filter(({ question }) => isCorrect(question, answers[question.id] ?? '')).length,
    [numbered, answers],
  );

  function setAnswer(qid: string, value: string) {
    if (submittedRef.current) return;
    setAnswers((prev) => {
      const next = { ...prev };
      if (value.trim()) next[qid] = value.trim();
      else delete next[qid];
      saveAnswers(next);
      return next;
    });
  }

  function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    setShowScore(true);
    const raw = numbered.filter(({ question }) => isCorrect(question, answers[question.id] ?? '')).length;
    recordTestAttempt(test.id, {
      at: new Date().toISOString(),
      raw,
      total: TOTAL,
      band: bandMidpoint(raw, TOTAL),
      bandLabel: bandEstimate(raw, TOTAL),
      secondsUsed: test.durationMinutes * 60 - timeLeft,
    });
    clearSession(); // in-progress state done; permanent attempt kept in progress history
  }

  /* Timer — runs only once started, auto-submits at zero. */
  useEffect(() => {
    if (!started || submitted) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted]);

  /* Warn before leaving an in-progress test (can't pause). */
  useEffect(() => {
    if (!started || submitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [started, submitted]);

  /* Split-pane drag (desktop only). */
  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    const main = mainRef.current;
    if (!main) return;
    const onMove = (ev: MouseEvent) => {
      const rect = main.getBoundingClientRect();
      setSplitPct(Math.max(25, Math.min(75, ((ev.clientX - rect.left) / rect.width) * 100)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function scrollToQuestion(qid: string) {
    document.getElementById(`player-${qid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const part = test.parts[activePart]!;
  const stimulus = part.stimulus;
  const timerWarn = timeLeft <= 300 && !submitted;

  /* ── Instructions gate — timer does not run until Start ── */
  if (!started) {
    return <InstructionsScreen test={test} hubUrl={hubUrl} onStart={start} />;
  }

  return (
    <div className="flex h-dvh flex-col bg-surface text-ink">
      {/* ── Top bar ── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <a href={hubUrl} className="text-sm font-semibold text-ink-muted hover:text-ink">
          ← Tests
        </a>
        <span className="hidden truncate font-display text-sm font-bold sm:block">{test.title}</span>
        <div
          className={`mx-auto flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-sm font-bold ${
            timerWarn ? 'animate-pulse bg-error-tint text-error' : 'bg-surface-alt text-ink'
          }`}
          role="timer"
          aria-label="Time remaining"
        >
          <span aria-hidden="true">⏱</span>
          {pad(Math.floor(timeLeft / 60))}:{pad(timeLeft % 60)}
        </div>
        <button
          type="button"
          onClick={() => questionsRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="rounded-button border border-border px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-surface-alt"
        >
          Review
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitted}
          className="rounded-button bg-brand px-4 py-1.5 font-display text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Submit ➤
        </button>
      </header>

      {/* ── Main split pane ── */}
      <div
        ref={mainRef}
        className="grid min-h-0 flex-1 max-md:grid-rows-[45%_auto_1fr] md:grid-cols-[var(--split)_4px_1fr]"
        style={{ '--split': `${splitPct}%` } as React.CSSProperties}
      >
        {/* Stimulus pane */}
        <div className="min-h-0 overflow-y-auto border-b border-border bg-surface-alt md:border-b-0">
          <div className="mx-auto max-w-2xl px-5 py-6">
            {stimulus.kind === 'passage' ? (
              <>
                <p
                  className="mb-4 text-sm italic text-ink-muted"
                  dangerouslySetInnerHTML={{ __html: stimulus.instructionHtml }}
                />
                <p className="text-xs font-bold uppercase tracking-wider text-brand">{stimulus.label}</p>
                <h2 className="mb-4 mt-1 font-display text-2xl font-extrabold">{stimulus.title}</h2>
                {stimulus.paragraphs.map((p, i) => (
                  <p key={i} className="mb-4 text-[0.95rem] leading-relaxed">
                    {p.label && <strong className="mr-1 font-display">{p.label}.</strong>}
                    <span dangerouslySetInnerHTML={{ __html: p.html }} />
                  </p>
                ))}
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">{stimulus.label}</p>
                <audio controls src={stimulus.src} className="mt-3 w-full" />
                {stimulus.transcriptHtml && (
                  <details className="mt-4 rounded-card border border-border bg-surface p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-brand">Show transcript</summary>
                    <div className="mt-2 text-sm" dangerouslySetInnerHTML={{ __html: stimulus.transcriptHtml }} />
                  </details>
                )}
              </>
            )}
          </div>
        </div>

        {/* Resizer */}
        <div
          className="hidden cursor-col-resize bg-border transition-colors hover:bg-brand md:block"
          onMouseDown={startDrag}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
        />

        {/* Questions pane */}
        <div ref={questionsRef} className="min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-5 py-6">
            {part.groups.map((group) => {
              const groupQs = numbered.filter((nq) => nq.group === group);
              return (
                <div key={group.title} className="mb-8">
                  <h3 className="font-display text-lg font-bold">{group.title}</h3>
                  <p
                    className="mb-4 mt-1 text-sm text-ink-muted"
                    dangerouslySetInnerHTML={{ __html: group.instructionHtml }}
                  />
                  {group.legendHtml && (
                    <div
                      className="mb-4 rounded-card border border-border bg-surface-alt p-3 text-sm"
                      dangerouslySetInnerHTML={{ __html: group.legendHtml }}
                    />
                  )}
                  {group.type === 'diagram-labelling' && group.diagram && (
                    <DiagramFigure diagram={group.diagram} items={groupQs} answers={answers} submitted={submitted} />
                  )}
                  {groupQs.map((nq) => (
                    <QuestionItem
                      key={nq.question.id}
                      nq={nq}
                      value={answers[nq.question.id] ?? ''}
                      submitted={submitted}
                      onChange={(v) => setAnswer(nq.question.id, v)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-surface px-4 py-2">
        <div className="flex gap-1">
          {test.parts.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setActivePart(i)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                i === activePart ? 'bg-brand text-white' : 'bg-surface-alt text-ink-muted hover:text-ink'
              }`}
            >
              {p.label}
              {i === activePart && (
                <span className="ml-1 font-normal opacity-80">
                  · {answeredCount} of {TOTAL}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {numbered.map(({ question, n }) => {
            const answered = !!answers[question.id];
            const ok = submitted && isCorrect(question, answers[question.id] ?? '');
            const cls = submitted
              ? ok
                ? 'bg-success text-white'
                : 'bg-error text-white'
              : answered
                ? 'bg-brand text-white'
                : 'border border-border text-ink-muted hover:border-brand';
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => scrollToQuestion(question.id)}
                aria-label={`Go to question ${n}`}
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-colors ${cls}`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </footer>

      {/* ── Score modal ── */}
      {showScore && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-card bg-surface p-8 text-center shadow-card-hover">
            <h2 className="font-display text-xl font-extrabold">Your Score</h2>
            <p className="mt-4 font-display text-5xl font-extrabold text-brand">
              {correctCount} / {TOTAL}
            </p>
            <p className="mt-2 text-ink-muted">{Math.round((correctCount / TOTAL) * 100)}% correct</p>
            <p className="mt-3 inline-block rounded-full bg-brand-tint px-4 py-1.5 font-display font-bold text-brand">
              Estimated Band: {bandEstimate(correctCount, TOTAL)}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowScore(false)}
                className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
              >
                Review Answers
              </button>
              <a
                href={hubUrl}
                className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                More Tests
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionItem({
  nq,
  value,
  submitted,
  onChange,
}: {
  nq: Numbered;
  value: string;
  submitted: boolean;
  onChange: (v: string) => void;
}) {
  const { question: q, group, n } = nq;
  const ok = submitted && isCorrect(q, value);
  const showHint = submitted && !ok;
  const answerText = Array.isArray(q.answer) ? q.answer[0] : q.answer;

  const stateCls = submitted
    ? ok
      ? 'border-success bg-success-tint'
      : 'border-error bg-error-tint'
    : 'border-border bg-surface';

  return (
    <div id={`player-${q.id}`} className={`mb-3 rounded-card border p-4 transition-colors ${stateCls}`}>
      {group.type === 'diagram-labelling' ? (
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-tint text-xs font-bold text-brand">
            {n}
          </span>
          <input
            type="text"
            value={value}
            disabled={submitted}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Label…"
            aria-label={`Question ${n}`}
            className="w-48 rounded-lg border border-border bg-surface px-3 py-1 text-sm font-semibold focus:border-brand"
          />
          {q.textHtml && <span className="text-sm text-ink-muted" dangerouslySetInnerHTML={{ __html: q.textHtml }} />}
        </div>
      ) : group.type === 'sentence-completion' ? (
        <div className="flex items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-tint text-xs font-bold text-brand">
            {n}
          </span>
          <p className="text-[0.95rem] leading-loose">
            {q.before}{' '}
            <input
              type="text"
              value={value}
              disabled={submitted}
              onChange={(e) => onChange(e.target.value)}
              placeholder="…"
              aria-label={`Question ${n}`}
              className="mx-1 w-36 rounded-lg border border-border bg-surface px-2 py-0.5 text-center font-semibold focus:border-brand"
            />{' '}
            {q.after}
          </p>
        </div>
      ) : group.type === 'multiple-choice' ? (
        <div>
          <p className="mb-2 text-[0.95rem]">
            <strong className="mr-1">{n}.</strong>
            <span dangerouslySetInnerHTML={{ __html: q.textHtml ?? '' }} />
          </p>
          <div className="space-y-1.5">
            {(q.options ?? []).map((opt, oi) => {
              const letter = ['A', 'B', 'C', 'D'][oi]!;
              return (
                <label
                  key={letter}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    value === letter ? 'border-brand bg-brand-tint' : 'border-border hover:border-brand/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={letter}
                    checked={value === letter}
                    disabled={submitted}
                    onChange={() => onChange(letter)}
                    className="accent-[var(--color-brand)]"
                  />
                  <strong>{letter}</strong> {opt}
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <select
            value={value}
            disabled={submitted}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Question ${n}`}
            className="shrink-0 rounded-lg border border-border bg-surface px-2 py-1 text-sm font-semibold"
          >
            <option value="">—</option>
            {(group.type === 'tfng' ? ['True', 'False', 'Not Given'] : (group.options ?? [])).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <p className="text-[0.95rem]">
            <strong className="mr-1">{n}.</strong>
            <span dangerouslySetInnerHTML={{ __html: q.textHtml ?? '' }} />
          </p>
        </div>
      )}
      {showHint && (
        <p className="mt-2 pl-10 text-sm font-semibold text-success">✓ {answerText}</p>
      )}
    </div>
  );
}

/* Diagram with numbered pins, one per question in the group (in order).
   Pins recolor on submit to match each label input's correctness. */
function DiagramFigure({
  diagram,
  items,
  answers,
  submitted,
}: {
  diagram: NonNullable<QuestionGroup['diagram']>;
  items: Numbered[];
  answers: Record<string, string>;
  submitted: boolean;
}) {
  return (
    <div className="mb-4 rounded-card border border-border bg-white p-3">
      <div className="relative mx-auto max-w-md">
        <img src={asset(diagram.image)} alt={diagram.alt} className="block w-full rounded-lg" />
        {diagram.markers.map((m, i) => {
          const nq = items[i];
          if (!nq) return null;
          const answered = !!answers[nq.question.id];
          const ok = submitted && isCorrect(nq.question, answers[nq.question.id] ?? '');
          const color = submitted ? (ok ? 'bg-success' : 'bg-error') : answered ? 'bg-brand' : 'bg-ink/60';
          return (
            <span
              key={i}
              className={`absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-xs font-extrabold text-white shadow-card ${color}`}
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
              aria-hidden="true"
            >
              {nq.n}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* Full-screen instructions gate shown before the timer starts. */
function InstructionsScreen({
  test,
  hubUrl,
  onStart,
}: {
  test: PracticeTest;
  hubUrl: string;
  onStart: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface-alt p-4">
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8 shadow-card-hover">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Reading Test</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">{test.title}</h1>
        <p className="mt-2 text-ink-muted">{test.description}</p>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{test.parts.length}</p>
            <p className="text-xs text-ink-muted">passages</p>
          </div>
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{questionCount(test)}</p>
            <p className="text-xs text-ink-muted">questions</p>
          </div>
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{test.durationMinutes}</p>
            <p className="text-xs text-ink-muted">minutes</p>
          </div>
        </div>

        <ul className="mt-6 space-y-2 text-sm text-ink">
          <li className="flex gap-2"><span aria-hidden="true">⏱</span> The timer starts as soon as you begin and runs continuously.</li>
          <li className="flex gap-2"><span aria-hidden="true">🚫</span> <strong>You cannot pause.</strong> Refreshing or closing the tab will not stop the clock — you will resume with time already elapsed.</li>
          <li className="flex gap-2"><span aria-hidden="true">✍️</span> Answer all {questionCount(test)} questions across {test.parts.length} passages, then submit. It auto-submits when time runs out.</li>
          <li className="flex gap-2"><span aria-hidden="true">📊</span> You'll get a score, an estimated band, and answer review at the end.</li>
        </ul>

        <div className="mt-8 flex items-center justify-between gap-3">
          <a href={hubUrl} className="text-sm font-semibold text-ink-muted hover:text-ink">
            ← Back
          </a>
          <button
            type="button"
            onClick={onStart}
            className="rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
          >
            Start test →
          </button>
        </div>
      </div>
    </div>
  );
}
