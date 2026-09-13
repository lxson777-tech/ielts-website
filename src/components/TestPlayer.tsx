import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { PracticeTest, Question, QuestionGroup, TestPart } from '../lib/tests/schema';
import { bandEstimate, bandMidpoint, isCorrect, questionCount, scoredQuestionIds } from '../lib/tests/schema';
import { recordTestAttempt } from '../lib/progress';
import { clearSession, loadSession, saveAnswers, secondsLeft, startSession } from '../lib/test-session';
import Html from './Html';
import StrategyPanel from './StrategyPanel';

interface Props {
  test: PracticeTest;
  /** Base-prefixed URL back to the tests hub. */
  hubUrl: string;
  /** 'drill' tags the recorded attempt so it's excluded from the full-test
      band history (see progress.ts). Defaults to a full exam. */
  attemptKind?: 'full' | 'drill';
}

/** Base-prefixed URL for images stored under /public. */
const asset = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${p}`;

/** Imported question HTML stores public assets from the site root. Prefix only
    local `src="/..."` values so diagrams also resolve when Astro is hosted
    below a base path. */
function questionAssets(html: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base ? html.replace(/\bsrc=(["'])\/(?!\/)/gi, `src=$1${base}/`) : html;
}

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

function countWords(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

export default function TestPlayer({ test, hubUrl, attemptKind = 'full' }: Props) {
  const numbered = useMemo(() => numberQuestions(test), [test]);
  const TOTAL = numbered.length;
  const SCORED_TOTAL = numbered.filter(({ question }) => question.scored !== false).length;

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
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  // Mobile only: the split pane doesn't fit comfortably on a phone screen, so
  // below md the passage and questions each get the full pane one at a time,
  // switched via the tab bar right under the header.
  const [mobileView, setMobileView] = useState<'stimulus' | 'questions'>('stimulus');

  function toggleFlag(qid: string) {
    if (submittedRef.current) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  }

  /* Jump to a question card and bring it into view — used by the flag-aware
     nav circles in the footer, mirroring "skip and return" on CD-IELTS. On
     mobile the questions pane may currently be hidden (single-pane tab
     view), so switch to it first and defer the scroll a frame so it's
     scrolling a pane that's actually laid out, not a display:none one. */
  function jumpToQuestion(qid: string) {
    setMobileView('questions');
    requestAnimationFrame(() => {
      document.getElementById(`player-${qid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function start() {
    const s = startSession(test);
    setTimeLeft(secondsLeft(s));
    setStarted(true);
  }

  const mainRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null);
  const passageContentRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef(false);

  const scoredIds = useMemo(
    () => scoredQuestionIds(numbered.map(({ question }) => question), answers),
    [numbered, answers],
  );

  /* Review: find a question's supporting quote in the passage, highlight it and
     scroll it into view. Splits on "…"/"..." so multi-fragment quotes each get
     marked. */
  function locateEvidence(evidence: string) {
    const root = passageContentRef.current;
    if (!root) return;
    root.querySelectorAll('mark.ielts-evidence').forEach(unwrap);
    const fragments = evidence
      .split(/\s*(?:\.\.\.|…)\s*/)
      .map((f) => f.trim())
      .filter((f) => f.length > 2);
    let first: HTMLElement | null = null;
    for (const frag of fragments) {
      const range = findTextRange(root, frag);
      if (!range) continue;
      const m = wrapRange(range, root, 'ielts-evidence');
      if (!first) first = m;
    }
    // On mobile the stimulus pane may currently be hidden (single-pane tab
    // view) — switch to it and wait a frame so scrollIntoView runs against
    // a pane that's actually laid out, not a display:none one.
    setMobileView('stimulus');
    requestAnimationFrame(() => {
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  const correctCount = scoredIds.size;

  function setAnswer(qid: string, value: string) {
    if (submittedRef.current) return;
    setAnswers((prev) => {
      const next = { ...prev };
      // Store exactly what was typed — trimming here eats the space the
      // student just typed (controlled input), blocking multi-word answers.
      // Normalisation happens once, at scoring time (isCorrect).
      if (value) next[qid] = value;
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
    const raw = scoredIds.size;
    const byType: Record<string, { correct: number; total: number }> = {};
    for (const { question, group } of numbered) {
      if (question.scored === false) continue;
      const t = byType[group.type] ?? (byType[group.type] = { correct: 0, total: 0 });
      t.total += 1;
      if (scoredIds.has(question.id)) t.correct += 1;
    }
    recordTestAttempt(test.id, {
      at: new Date().toISOString(),
      raw,
      total: SCORED_TOTAL,
      band: bandMidpoint(raw, SCORED_TOTAL, test.skill),
      bandLabel: bandEstimate(raw, SCORED_TOTAL, test.skill),
      secondsUsed: test.durationMinutes * 60 - timeLeft,
      byType,
      kind: attemptKind,
      skill: test.skill,
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

  const part = test.parts[activePart]!;
  const stimulus = part.stimulus;
  const partItems = numbered.filter((nq) => nq.part === part);
  const partRange = partItems.length
    ? `Questions ${partItems[0]!.n}-${partItems[partItems.length - 1]!.n}`
    : 'Questions';
  const timerWarn = timeLeft <= 300 && !submitted;
  const legacyAudioPart = test.parts.find((p) => p.stimulus.kind === 'audio');
  const sharedAudioSrc = test.audioSrc ??
    (legacyAudioPart?.stimulus.kind === 'audio' ? legacyAudioPart.stimulus.src : undefined);

  /* ── Instructions gate — timer does not run until Start ── */
  if (!started) {
    return <InstructionsScreen test={test} hubUrl={hubUrl} onStart={start} attemptKind={attemptKind} />;
  }

  return (
    <div className="screen-in flex h-dvh flex-col bg-surface text-ink">
      {/* ── Top bar ── */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2.5 sm:gap-3 sm:px-4">
        <a href={hubUrl} className="shrink-0 whitespace-nowrap py-2 text-sm font-semibold text-ink-muted hover:text-ink">
          <span className="hidden sm:inline">Tests</span>
        </a>
        <span className="hidden truncate font-display text-sm font-bold md:block">{test.title}</span>
        <div
          className={`mx-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-bold sm:gap-2 sm:px-4 ${
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
          onClick={() => {
            setMobileView('questions');
            requestAnimationFrame(() => questionsRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
          }}
          className="shrink-0 rounded-button border border-border px-2.5 py-1.5 text-sm font-semibold text-ink-muted hover:bg-surface-alt sm:px-3"
        >
          Review
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitted}
          className="shrink-0 rounded-button bg-brand px-3 py-1.5 font-display text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50 sm:px-4"
        >
          Submit ➤
        </button>
      </header>

      {test.skill === 'listening' && (
        <ListeningAudio
          src={sharedAudioSrc ? asset(sharedAudioSrc) : undefined}
          attemptKind={attemptKind}
          startSeconds={stimulus.kind === 'audio' ? stimulus.startSeconds : undefined}
          endSeconds={stimulus.kind === 'audio' ? stimulus.endSeconds : undefined}
          drillPartNumber={attemptKind === 'drill' ? drillPartNumber(test.id) : null}
        />
      )}

      {/* ── Mobile pane switcher — the split pane below is too cramped on a
           phone screen, so below md each side gets the full pane, one at a
           time. ── */}
      <div className="flex shrink-0 border-b border-border md:hidden">
        <button
          type="button"
          onClick={() => setMobileView('stimulus')}
          className={`flex-1 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
            mobileView === 'stimulus' ? 'border-brand text-brand' : 'border-transparent text-ink-muted'
          }`}
        >
          {stimulus.kind === 'passage' ? '📖 Passage' : '📄 Question paper'}
        </button>
        <button
          type="button"
          onClick={() => setMobileView('questions')}
          className={`flex-1 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
            mobileView === 'questions' ? 'border-brand text-brand' : 'border-transparent text-ink-muted'
          }`}
        >
          ✍️ {stimulus.kind === 'audio' ? 'Answer sheet' : 'Questions'}{' '}
          <span className="font-normal opacity-70">
            {numbered.filter((nq) => nq.part === part && nq.question.scored !== false && answers[nq.question.id]).length}/
            {numbered.filter((nq) => nq.part === part && nq.question.scored !== false).length}
          </span>
        </button>
      </div>

      {/* ── Main split pane ── */}
      <div
        ref={mainRef}
        className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[var(--split)_4px_1fr]"
        style={{ '--split': `${splitPct}%` } as React.CSSProperties}
      >
        {/* Stimulus pane — full-height on mobile when its tab is active,
            always visible side-by-side with questions from md up. */}
        <div
          className={`min-h-0 flex-1 overflow-y-auto border-b border-border bg-surface-alt md:block md:border-b-0 ${
            mobileView === 'stimulus' ? 'block' : 'hidden'
          }`}
        >
          {stimulus.kind === 'passage' ? (
            <Highlightable key={activePart} innerRef={passageContentRef} className="mx-auto max-w-2xl px-5 py-6">
              {/* All trusted HTML here goes through <Html> (memoized) rather
                  than an inline dangerouslySetInnerHTML: the countdown
                  re-renders this whole player once a second, and an inline one
                  would re-set innerHTML on every tick — reloading images,
                  dropping the reader's text selection, and flickering. */}
              <Html as="p" className="mb-4 text-sm italic text-ink-muted" html={stimulus.instructionHtml} />
              <p className="text-xs font-bold uppercase tracking-wider text-brand">{stimulus.label}</p>
              <h2 className="mb-4 mt-1 font-display text-2xl font-extrabold">{stimulus.title}</h2>
              {stimulus.paragraphs.map((p, i) => (
                <p key={i} className="mb-4 text-[0.95rem] leading-relaxed">
                  {p.label && <strong className="mr-1 font-display">{p.label}.</strong>}
                  <Html as="span" html={p.html} />
                </p>
              ))}
            </Highlightable>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-7">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="font-display text-2xl font-extrabold">Question paper</h2>
                  <p className="mt-1 text-sm text-ink-muted">{stimulus.label}. Follow the recording and read each task carefully.</p>
                </div>
                <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand">{partRange}</span>
              </div>
              {stimulus.questionHtml ? (
                <Html className="listening-question-paper" html={questionAssets(stimulus.questionHtml)} />
              ) : (
                <p className="rounded-card border border-border bg-surface p-4 text-sm text-ink-muted">
                  The question paper for this section is unavailable.
                </p>
              )}
              {submitted && stimulus.transcriptHtml && (
                <details className="mt-7 rounded-card border border-border bg-surface p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-brand">Review transcript</summary>
                  <Html className="mt-2 text-sm" html={stimulus.transcriptHtml} />
                </details>
              )}
            </div>
          )}
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
        <div
          ref={questionsRef}
          className={`min-h-0 flex-1 overflow-y-auto md:block ${mobileView === 'questions' ? 'block' : 'hidden'}`}
        >
          <div className="mx-auto max-w-2xl px-5 py-6">
            {stimulus.kind === 'audio' && (
              <div className="mb-7 border-b border-border pb-4">
                <h2 className="font-display text-2xl font-extrabold">Answer sheet</h2>
                <p className="mt-1 text-sm text-ink-muted">{stimulus.label}. Enter answers for {partRange.toLowerCase()}.</p>
              </div>
            )}
            {part.groups.map((group, groupIndex) => {
              const groupQs = numbered.filter((nq) => nq.group === group);
              const headingId = `question-group-${activePart}-${groupIndex}`;
              return (
                <section key={group.title} aria-labelledby={headingId} className="mb-10 last:mb-2">
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
                    <h3 id={headingId} className="font-display text-lg font-bold">{group.title}</h3>
                    <Html as="p" className="max-w-md text-sm leading-relaxed text-ink-muted" html={group.instructionHtml} />
                  </div>
                  {group.legendHtml && (
                    <Html
                      className="mb-4 rounded-card border border-border bg-surface-alt p-3 text-sm"
                      html={group.legendHtml}
                    />
                  )}
                  {attemptKind === 'drill' && <StrategyPanel skill={test.skill} type={group.type} />}
                  {group.type === 'diagram-labelling' && group.diagram && (
                    <DiagramFigure diagram={group.diagram} items={groupQs} answers={answers} submitted={submitted} />
                  )}
                  {group.type === 'multiple-answer' && !group.questions.some((question) => question.multiSelect) ? (
                    <MultiAnswer group={group} slotIds={groupQs.map((nq) => nq.question.id)} answers={answers} submitted={submitted} setAnswer={setAnswer} />
                  ) : group.type === 'table-completion' && group.table ? (
                    <TableGrid
                      table={group.table}
                      items={groupQs}
                      answers={answers}
                      submitted={submitted}
                      wordLimit={group.wordLimit}
                      setAnswer={setAnswer}
                      onLocate={locateEvidence}
                    />
                  ) : (
                    groupQs.map((nq) => (
                      <QuestionItem
                        key={nq.question.id}
                        nq={nq}
                        value={answers[nq.question.id] ?? ''}
                        submitted={submitted}
                        scored={scoredIds.has(nq.question.id)}
                        onChange={(v) => setAnswer(nq.question.id, v)}
                        onLocate={locateEvidence}
                        flagged={flagged.has(nq.question.id)}
                        onToggleFlag={() => toggleFlag(nq.question.id)}
                      />
                    ))
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-surface px-4 py-2">
        <div className="flex gap-1">
          {test.parts.map((p, i) => {
            const partQs = numbered.filter((nq) => nq.part === p && nq.question.scored !== false);
            const partAnswered = partQs.filter((nq) => answers[nq.question.id]).length;
            const complete = partAnswered === partQs.length;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setActivePart(i)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  i === activePart ? 'bg-brand text-white' : 'bg-surface-alt text-ink-muted hover:text-ink'
                }`}
              >
                {p.label}
                <span className={`ml-1 font-normal ${i === activePart ? 'opacity-80' : 'opacity-60'}`}>
                  {complete && !submitted ? '✓' : `${partAnswered}/${partQs.length}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Question indicators — current passage only */}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs font-medium text-ink-muted sm:inline">{part.label}:</span>
          <div className="flex flex-wrap gap-1.5">
            {numbered
              .filter((nq) => nq.part === part)
              .map(({ question, n }) => {
                const unavailable = question.scored === false;
                const answered = !!answers[question.id];
                const ok = submitted && scoredIds.has(question.id);
                const cls = unavailable
                  ? 'bg-surface-alt text-ink-muted'
                  : submitted
                  ? ok
                    ? 'bg-success text-white'
                    : 'bg-error text-white'
                  : answered
                    ? 'bg-brand text-white'
                    : 'border border-border text-ink-muted';
                const isFlagged = flagged.has(question.id);
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => jumpToQuestion(question.id)}
                    aria-label={`Jump to question ${n}${unavailable ? ', unavailable and excluded from score' : answered ? ', answered' : ', unanswered'}${isFlagged ? ', flagged for review' : ''}`}
                    className={`relative grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-colors ${cls} ${
                      isFlagged && !submitted ? 'ring-2 ring-warning ring-offset-1 ring-offset-surface' : ''
                    }`}
                  >
                    {n}
                    {isFlagged && !submitted && (
                      <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 text-[0.6rem] leading-none">
                        🚩
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </footer>

      {/* ── Score modal ── */}
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {showScore && (
            <motion.div
              className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="w-full max-w-sm rounded-card bg-surface p-8 text-center shadow-card-hover"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <h2 className="font-display text-xl font-extrabold">Your Score</h2>
                <p className="band-score-pop mt-4 font-display text-5xl font-extrabold text-brand">
                  {correctCount} / {SCORED_TOTAL}
                </p>
                <p className="mt-2 text-ink-muted">{Math.round((correctCount / SCORED_TOTAL) * 100)}% correct</p>
                <p className="mt-3 inline-block rounded-full bg-brand-tint px-4 py-1.5 font-display font-bold text-brand">
                  Estimated Band: {bandEstimate(correctCount, SCORED_TOTAL, test.skill)}
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
}

function QuestionItem({
  nq,
  value,
  submitted,
  scored,
  onChange,
  onLocate,
  flagged,
  onToggleFlag,
}: {
  nq: Numbered;
  value: string;
  submitted: boolean;
  scored: boolean;
  onChange: (v: string) => void;
  onLocate?: (evidence: string) => void;
  flagged?: boolean;
  onToggleFlag?: () => void;
}) {
  const { question: q, group, n } = nq;
  const ok = submitted && scored;
  const showHint = submitted && !ok;
  const answerText = q.multiSelect
    ? q.multiSelect.correctValues.join(', ')
    : Array.isArray(q.answer) ? q.answer[0] : q.answer;
  const overLimit = !submitted && group.wordLimit != null && countWords(value) > group.wordLimit;

  const stateCls = submitted
    ? ok
      ? 'border-success bg-success-tint'
      : 'border-error bg-error-tint'
    : flagged
      ? 'border-warning bg-warning-tint'
      : 'border-border bg-surface';

  return (
    <div id={`player-${q.id}`} className={`relative mb-3 scroll-mt-6 rounded-card border p-4 transition-colors ${stateCls}`}>
      {!submitted && onToggleFlag && (
        <button
          type="button"
          onClick={onToggleFlag}
          aria-pressed={!!flagged}
          aria-label={flagged ? `Unflag question ${n} for review` : `Flag question ${n} for review`}
          title={flagged ? 'Unflag for review' : 'Flag for review'}
          className={`absolute right-3 top-3 text-base leading-none transition-opacity ${
            flagged ? 'opacity-100' : 'opacity-30 hover:opacity-70'
          }`}
        >
          🚩
        </button>
      )}
      {q.scored === false ? (
        <div className="flex items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-alt text-xs font-bold text-ink-muted">
            {n}
          </span>
          <p className="text-sm leading-relaxed text-ink-muted">
            This question is missing from the published source and is excluded from your score.
          </p>
        </div>
      ) : q.multiSelect ? (
        <PerQuestionMultiAnswer
          question={q}
          number={n}
          choices={group.choices ?? []}
          value={value}
          submitted={submitted}
          onChange={onChange}
        />
      ) : group.type === 'diagram-labelling' ? (
        <div>
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
            {q.textHtml && <Html as="span" className="text-sm text-ink-muted" html={q.textHtml} />}
          </div>
          {overLimit && <WordLimitWarning value={value} limit={group.wordLimit!} className="ml-10 mt-1" />}
        </div>
      ) : group.type === 'sentence-completion' || group.type === 'table-completion' ? (
        <div>
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
          {overLimit && <WordLimitWarning value={value} limit={group.wordLimit!} className="ml-10 mt-1" />}
        </div>
      ) : group.type === 'multiple-choice' ? (
        <div>
          <p className="mb-2 text-[0.95rem]">
            <strong className="mr-1">{n}.</strong>
            <Html as="span" html={q.textHtml ?? ''} />
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
                  <strong>{letter}</strong>
                  {opt.trim().toUpperCase() !== letter && <span>{opt}</span>}
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
            <option value="">(blank)</option>
            {(group.type === 'tfng'
              ? ['True', 'False', 'Not Given']
              : group.type === 'yes-no-notgiven'
                ? ['Yes', 'No', 'Not Given']
                : (group.options ?? [])
            ).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <p className="text-[0.95rem]">
            <strong className="mr-1">{n}.</strong>
            <Html as="span" html={q.textHtml ?? ''} />
          </p>
        </div>
      )}
      {submitted && (showHint || q.explanation || q.evidence) && (
        <AnswerReview q={q} ok={ok} answerText={answerText} onLocate={onLocate} className="sm:ml-10" />
      )}
    </div>
  );
}

/** Word-count nudge shown live while typing a free-text answer that has a
    stated limit (e.g. "NO MORE THAN TWO WORDS") — a nudge, not a hard block,
    since the real exam only penalises at marking time. */
function WordLimitWarning({ value, limit, className }: { value: string; limit: number; className?: string }) {
  const count = countWords(value);
  return (
    <p className={`text-xs font-semibold text-warning ${className ?? ''}`}>
      ⚠ {count} {count === 1 ? 'word' : 'words'}: limit is {limit}
    </p>
  );
}

/** Post-submit "why this is the answer" panel: correct answer, explanation,
    and the exact evidence line with a jump-to-passage button. Shared by the
    normal per-question list and the table-completion grid. */
function AnswerReview({
  q,
  ok,
  answerText,
  onLocate,
  className,
}: {
  q: Question;
  ok: boolean;
  answerText: string;
  onLocate?: (evidence: string) => void;
  className?: string;
}) {
  return (
    <div className={`mt-3 rounded-lg bg-surface/70 px-3 py-2 text-sm ${className ?? ''}`}>
      {!ok && (
        <p className="font-semibold text-success">
          ✓ Correct answer: <span className="font-bold">{answerText}</span>
        </p>
      )}
      {q.explanation && <p className="mt-0.5 text-ink-muted">{q.explanation}</p>}
      {q.evidence && (
        <div className="mt-1.5 border-l-2 border-brand/40 pl-2.5">
          <p className="italic text-ink-muted">“{q.evidence}”</p>
          {onLocate && (
            <button
              type="button"
              onClick={() => onLocate(q.evidence!)}
              className="mt-1 inline-flex items-center gap-1 py-2 -my-1 text-xs font-semibold text-brand hover:underline"
            >
              🔍 Show in passage
            </button>
          )}
        </div>
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

/* "Choose N statements" — checkbox list capped at selectCount. The chosen
   letters are written into the group's slot question ids (sorted), so scoring,
   answered-state and nav circles reuse the normal per-question machinery: each
   slot's answer is the full correct set, so a chosen letter scores iff it's in
   that set — matching IELTS marking (one mark per correct selection). */
function MultiAnswer({
  group,
  slotIds,
  answers,
  submitted,
  setAnswer,
}: {
  group: QuestionGroup;
  slotIds: string[];
  answers: Record<string, string>;
  submitted: boolean;
  setAnswer: (qid: string, value: string) => void;
}) {
  const selectCount = group.selectCount ?? slotIds.length;
  const choices = group.choices ?? [];
  const correct = new Set(
    Array.isArray(group.questions[0]?.answer) ? (group.questions[0]!.answer as string[]) : [],
  );
  const selected = slotIds.map((id) => answers[id]).filter(Boolean) as string[];
  const selectedSet = new Set(selected);

  function toggle(letter: string) {
    if (submitted) return;
    let next: string[];
    if (selectedSet.has(letter)) next = selected.filter((l) => l !== letter);
    else if (selected.length >= selectCount) return; // cap reached
    else next = [...selected, letter];
    next.sort();
    slotIds.forEach((id, i) => setAnswer(id, next[i] ?? ''));
  }

  return (
    <div id={`player-${slotIds[0]}`} className="rounded-card border border-border bg-surface p-4">
      <p className="mb-3 text-xs font-semibold text-ink-muted">
        Selected {selected.length} of {selectCount}
      </p>
      <div className="space-y-1.5">
        {choices.map((c) => {
          const chosen = selectedSet.has(c.value);
          const isCorrectChoice = correct.has(c.value);
          let cls = 'border-border hover:border-brand/50';
          if (submitted) {
            if (isCorrectChoice) cls = 'border-success bg-success-tint';
            else if (chosen) cls = 'border-error bg-error-tint';
            else cls = 'border-border opacity-50';
          } else if (chosen) {
            cls = 'border-brand bg-brand-tint';
          }
          const atCap = !chosen && selected.length >= selectCount;
          return (
            <label
              key={c.value}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${cls} ${
                atCap && !submitted ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={chosen}
                disabled={submitted || atCap}
                onChange={() => toggle(c.value)}
                className="mt-0.5 accent-[var(--color-brand)]"
              />
              <span>
                <strong className="mr-1">{c.value}</strong>
                {c.label}
              </span>
            </label>
          );
        })}
      </div>
      {submitted && group.explanationHtml && (
        <Html
          className="mt-3 rounded-lg bg-surface/70 px-3 py-2 text-sm text-ink-muted"
          html={group.explanationHtml}
        />
      )}
    </div>
  );
}

/* Table/flow-chart completion: a grid of static cells and fill-in-the-blank
   cells, one input per question in the group (in reading order, left→right
   then top→bottom — same left-to-right/top-to-bottom convention as diagram
   pins). Answer explanations render below the table, reusing AnswerReview,
   since the blanks themselves are too small to hold them. */
function TableGrid({
  table,
  items,
  answers,
  submitted,
  wordLimit,
  setAnswer,
  onLocate,
}: {
  table: NonNullable<QuestionGroup['table']>;
  items: Numbered[];
  answers: Record<string, string>;
  submitted: boolean;
  wordLimit?: number;
  setAnswer: (qid: string, value: string) => void;
  onLocate?: (evidence: string) => void;
}) {
  const byId = new Map(items.map((nq) => [nq.question.id, nq]));

  return (
    <div id={`player-${items[0]?.question.id ?? ''}`} className="mb-4 overflow-x-auto rounded-card border border-border">
      <table className="w-full border-collapse text-sm">
        {table.headerRow && (
          <thead>
            <tr className="bg-surface-alt text-left">
              {table.headerRow.map((h, i) => (
                <th key={i} className="border-b border-border px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border last:border-b-0">
              {row.map((cell, ci) => {
                if (typeof cell === 'string') {
                  return (
                    <td key={ci} className="px-3 py-2 align-top">
                      {cell}
                    </td>
                  );
                }
                const nq = byId.get(cell.questionId);
                if (!nq) return <td key={ci} className="px-3 py-2" />;
                const value = answers[nq.question.id] ?? '';
                const ok = submitted && isCorrect(nq.question, value);
                const cls = submitted
                  ? ok
                    ? 'border-success bg-success-tint'
                    : 'border-error bg-error-tint'
                  : 'border-border bg-surface';
                return (
                  <td key={ci} className="px-3 py-2 align-top">
                    <span className="mr-1.5 inline-grid h-6 w-6 place-items-center rounded-full bg-brand-tint text-xs font-bold text-brand">
                      {nq.n}
                    </span>
                    <input
                      type="text"
                      value={value}
                      disabled={submitted}
                      onChange={(e) => setAnswer(nq.question.id, e.target.value)}
                      placeholder="…"
                      aria-label={`Question ${nq.n}`}
                      className={`w-32 rounded-lg border px-2 py-0.5 text-center font-semibold focus:border-brand ${cls}`}
                    />
                    {wordLimit != null && !submitted && countWords(value) > wordLimit && (
                      <WordLimitWarning value={value} limit={wordLimit} className="mt-1" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {submitted &&
        items.map((nq) => {
          const value = answers[nq.question.id] ?? '';
          const ok = isCorrect(nq.question, value);
          const answerText = Array.isArray(nq.question.answer) ? nq.question.answer[0]! : nq.question.answer;
          if (ok && !nq.question.explanation && !nq.question.evidence) return null;
          return (
            <AnswerReview
              key={nq.question.id}
              q={nq.question}
              ok={ok}
              answerText={answerText}
              onLocate={onLocate}
              className="mx-3 my-2"
            />
          );
        })}
    </div>
  );
}

/* Wrap the current selection in <mark> elements — one per intersected text
   node — so highlighting survives inline tags (<em>, <strong>) and spans
   multiple paragraphs. Each fragment is a single text-node range, so
   surroundContents never throws on partially-selected elements. */
function wrapRange(range: Range, root: HTMLElement, className = 'ielts-hl'): HTMLElement | null {
  if (range.collapsed) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return range.intersectsNode(node) && (node.textContent ?? '').length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  let first: HTMLElement | null = null;
  for (const node of nodes) {
    if ((node.parentElement as HTMLElement | null)?.closest(`mark.${className}`)) continue;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.length;
    if (start >= end) continue;
    const r = document.createRange();
    r.setStart(node, start);
    r.setEnd(node, end);
    const mark = document.createElement('mark');
    mark.className = className;
    try {
      r.surroundContents(mark);
      if (!first) first = mark;
    } catch {
      /* skip any fragment that can't be cleanly wrapped */
    }
  }
  return first;
}

/* Char-for-char normalisation (each replacement is 1:1, so string indices are
   preserved) — lets evidence text match the passage despite curly quotes,
   dashes and non-breaking spaces. */
const normEvidence = (s: string) =>
  s
    .replace(/[’‘‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ');

/* Locate `search` inside a container's text, spanning inline tags and element
   boundaries, and return a DOM Range for it (or null if not found). */
function findTextRange(root: HTMLElement, search: string): Range | null {
  const nodes: Text[] = [];
  const starts: number[] = [];
  let full = '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    nodes.push(t);
    starts.push(full.length);
    full += t.data;
  }
  if (nodes.length === 0) return null;
  const fullNorm = normEvidence(full);
  // Try the exact quote (minus any trailing punctuation) first; if it doesn't
  // resolve — quotes sometimes end a word early or swap a trailing comma for a
  // full stop — fall back to the longest leading run of words that does.
  const cleaned = normEvidence(search).trim().replace(/[.,;:]+$/, '');
  let target = '';
  let idx = fullNorm.indexOf(cleaned);
  if (idx >= 0) {
    target = cleaned;
  } else {
    const words = cleaned.split(/\s+/);
    for (let take = words.length - 1; take >= 4; take--) {
      const cand = words.slice(0, take).join(' ').replace(/[.,;:]+$/, '');
      if (cand.length < 12) break;
      idx = fullNorm.indexOf(cand);
      if (idx >= 0) {
        target = cand;
        break;
      }
    }
  }
  if (idx < 0) return null;
  const point = (pos: number, isEnd: boolean) => {
    for (let i = 0; i < nodes.length; i++) {
      const s = starts[i]!;
      const e = s + nodes[i]!.length;
      if (isEnd ? pos <= e : pos < e)
        return { node: nodes[i]!, offset: Math.max(0, Math.min(pos - s, nodes[i]!.length)) };
    }
    const last = nodes[nodes.length - 1]!;
    return { node: last, offset: last.length };
  };
  const a = point(idx, false);
  const b = point(idx + target.length, true);
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
}

function unwrap(mark: Element) {
  const parent = mark.parentNode;
  if (!parent) return;
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
  parent.removeChild(mark);
  parent.normalize();
}

/* Passage wrapper that lets the candidate highlight text like the real
   computer-delivered IELTS: drag to select → "Highlight", click a highlight
   to remove it, or clear them all. Highlights live in the DOM for the current
   passage view (reset when switching passages). */
function Highlightable({
  className,
  children,
  innerRef,
}: {
  className?: string;
  children: React.ReactNode;
  innerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = innerRef ?? internalRef;
  const [popover, setPopover] = useState<{ x: number; y: number } | null>(null);
  const [hasHighlights, setHasHighlights] = useState(false);

  const refresh = () => setHasHighlights(!!ref.current?.querySelector('mark.ielts-hl'));

  function onMouseUp() {
    const sel = window.getSelection();
    const host = ref.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !host) return setPopover(null);
    const range = sel.getRangeAt(0);
    if (!host.contains(range.commonAncestorContainer)) return setPopover(null);
    const rect = range.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    setPopover({ x: rect.left - hostRect.left + rect.width / 2, y: rect.top - hostRect.top });
  }

  function applyHighlight() {
    const sel = window.getSelection();
    const host = ref.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !host) return;
    wrapRange(sel.getRangeAt(0), host);
    sel.removeAllRanges();
    setPopover(null);
    refresh();
  }

  function onClick(e: React.MouseEvent) {
    const mark = (e.target as HTMLElement).closest?.('mark.ielts-hl');
    if (!mark || !ref.current?.contains(mark)) return;
    unwrap(mark);
    refresh();
  }

  function clearAll() {
    ref.current?.querySelectorAll('mark.ielts-hl').forEach(unwrap);
    setHasHighlights(false);
    setPopover(null);
  }

  return (
    <div ref={ref} className={`relative ${className ?? ''}`} onMouseUp={onMouseUp} onClick={onClick}>
      <style>{`mark.ielts-hl{background-color:#fde68a;color:#1f2937;border-radius:2px;padding:0 1px;cursor:pointer}mark.ielts-evidence{background-color:#bfdbfe;color:#10243b;border-radius:2px;padding:0 1px;box-shadow:0 0 0 1px rgba(37,99,235,.35);animation:ielts-eviflash .9s ease-out}@keyframes ielts-eviflash{0%{background-color:#fde68a}100%{background-color:#bfdbfe}}`}</style>
      {hasHighlights && (
        <button
          type="button"
          onClick={clearAll}
          className="absolute right-2 top-2 z-10 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink-muted backdrop-blur hover:text-ink"
        >
          Clear highlights
        </button>
      )}
      {children}
      {popover && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={applyHighlight}
          className="absolute z-20 -translate-x-1/2 -translate-y-full rounded-full bg-ink px-3 py-1 text-xs font-bold text-white shadow-card"
          style={{ left: popover.x, top: popover.y - 6 }}
        >
          🖍 Highlight
        </button>
      )}
    </div>
  );
}

/** Drill ids are always built by drills.ts as `${sourceTestId}-drill-p${n}`,
    so the 1-based part number can be read straight off the id instead of the
    part's own (differently-worded, being renamed elsewhere) label string. */
function drillPartNumber(testId: string): number | null {
  const m = testId.match(/-drill-p(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** The shared listening recording, in one of two very different modes per
    the house rule "trainers coach with every aid, tests are bare exam
    conditions":
    - drill: full native controls (play/pause/seek/replay). If the part
      carries startSeconds it seeks there on load and shows which slice of
      the recording this drill covers; if it carries endSeconds it pauses
      there automatically (seeking further is still allowed).
    - full: bare exam conditions. A single "Start recording" button plays the
      whole recording once from the beginning; no seek bar, no pause, no
      replay, native controls are not rendered at all. */
function ListeningAudio({
  src,
  attemptKind,
  startSeconds,
  endSeconds,
  drillPartNumber: partNumber,
}: {
  src?: string;
  attemptKind: 'full' | 'drill';
  startSeconds?: number;
  endSeconds?: number;
  drillPartNumber: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(src ? 'loading' : 'error');
  const [retry, setRetry] = useState(0);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function retryLoad() {
    if (!src) return;
    setStatus('loading');
    setStarted(false);
    setEnded(false);
    setRetry((n) => n + 1);
  }

  function handleLoadedMetadata() {
    setStatus('ready');
    const el = audioRef.current;
    if (!el) return;
    setDuration(el.duration || 0);
    if (attemptKind === 'drill' && startSeconds != null) {
      el.currentTime = startSeconds;
      setCurrentTime(startSeconds);
    }
  }

  function handleTimeUpdate() {
    const el = audioRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    if (attemptKind === 'drill' && endSeconds != null && el.currentTime >= endSeconds) {
      el.pause();
    }
  }

  function startRecording() {
    setStarted(true);
    audioRef.current?.play();
  }

  const rangeNote =
    attemptKind === 'drill' && startSeconds != null
      ? `This drill covers ${partNumber != null ? `Part ${partNumber}` : 'one part'} of the recording (${fmtClock(startSeconds)} to ${fmtClock(endSeconds ?? duration)}).`
      : null;

  return (
    <section
      className="shrink-0 border-b border-border bg-surface-alt px-3 py-2.5 sm:px-4"
      aria-label="Listening recording"
      data-testid="listening-audio-player"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center">
        <div className="shrink-0 sm:w-44">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">
            {attemptKind === 'drill' ? 'Drill recording' : 'Full recording'}
          </p>
          <p className="text-xs text-ink-muted">
            {attemptKind === 'drill' ? 'Pause and replay freely' : 'Plays once, exam conditions'}
          </p>
        </div>

        {src && attemptKind === 'drill' && (
          <audio
            key={retry}
            ref={audioRef}
            controls
            controlsList="nodownload noplaybackrate"
            preload="metadata"
            src={src}
            className="h-10 w-full min-w-0 shrink-0 sm:w-auto sm:flex-1"
            aria-label="Drill recording"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onError={() => setStatus('error')}
          />
        )}

        {src && attemptKind === 'full' && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* No `controls`: bare exam conditions render only the button and
                readout below, never native seek/pause/replay affordances. */}
            <audio
              key={retry}
              ref={audioRef}
              preload="metadata"
              src={src}
              className="hidden"
              aria-hidden="true"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setEnded(true)}
              onError={() => setStatus('error')}
            />
            {!started ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={status !== 'ready'}
                className="rounded-button bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                ▶ Start recording
              </button>
            ) : (
              <span className="font-mono text-sm font-semibold text-ink" aria-live="polite">
                {ended ? 'Recording finished' : 'Recording playing'} · {fmtClock(currentTime)} / {fmtClock(duration)}
              </span>
            )}
          </div>
        )}

        {!src && <div className="flex-1" />}

        <div className="min-h-5 shrink-0 text-xs sm:w-36 sm:text-right" aria-live="polite">
          {status === 'loading' && <span className="text-ink-muted">Loading recording...</span>}
          {status === 'ready' && !started && attemptKind === 'drill' && <span className="text-success">Recording ready</span>}
          {status === 'error' && (
            <span className="text-error">
              Recording unavailable.{' '}
              {src && (
                <button type="button" onClick={retryLoad} className="font-bold underline underline-offset-2">
                  Retry
                </button>
              )}
            </span>
          )}
        </div>
      </div>
      {rangeNote && <p className="mx-auto mt-1.5 max-w-5xl text-xs text-ink-muted">{rangeNote}</p>}
    </section>
  );
}

/** A single numbered question that requires several choices and earns one
    mark only when the complete unordered set is correct. */
function PerQuestionMultiAnswer({
  question,
  number,
  choices,
  value,
  submitted,
  onChange,
}: {
  question: Question;
  number: number;
  choices: NonNullable<QuestionGroup['choices']>;
  value: string;
  submitted: boolean;
  onChange: (value: string) => void;
}) {
  const config = question.multiSelect!;
  const selected = value.split('|').filter(Boolean);
  const selectedSet = new Set(selected);
  const correctSet = new Set(config.correctValues);

  function toggle(choice: string) {
    if (submitted) return;
    const next = selectedSet.has(choice)
      ? selected.filter((value) => value !== choice)
      : selected.length < config.selectCount
        ? [...selected, choice]
        : selected;
    onChange([...next].sort().join('|'));
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4 pr-7">
        <p className="text-[0.95rem] leading-relaxed">
          <strong className="mr-1">{number}.</strong>
          <Html as="span" html={question.textHtml ?? ''} />
        </p>
        <span className="shrink-0 text-xs font-semibold text-ink-muted">
          {selected.length}/{config.selectCount} selected
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map((choice) => {
          const chosen = selectedSet.has(choice.value);
          const correct = correctSet.has(choice.value);
          const atCap = !chosen && selected.length >= config.selectCount;
          const stateClass = submitted
            ? correct
              ? 'border-success bg-success-tint'
              : chosen
                ? 'border-error bg-error-tint'
                : 'border-border opacity-55'
            : chosen
              ? 'border-brand bg-brand-tint'
              : 'border-border hover:border-brand/50';
          return (
            <label
              key={choice.value}
              className={`flex min-h-11 items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${stateClass} ${
                submitted ? 'cursor-default' : atCap ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={chosen}
                disabled={submitted || atCap}
                onChange={() => toggle(choice.value)}
                className="mt-0.5 accent-[var(--color-brand)]"
              />
              <span><strong className="mr-1">{choice.value}</strong>{choice.label}</span>
            </label>
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
  attemptKind,
}: {
  test: PracticeTest;
  hubUrl: string;
  onStart: () => void;
  attemptKind: 'full' | 'drill';
}) {
  const listening = test.skill === 'listening';
  const partLabel = listening ? 'parts' : 'passages';
  const numberedTotal = questionCount(test);
  const scoredTotal = test.parts.reduce(
    (total, part) => total + part.groups.reduce(
      (groupTotal, group) => groupTotal + group.questions.filter((question) => question.scored !== false).length,
      0,
    ),
    0,
  );
  const unavailableTotal = numberedTotal - scoredTotal;
  return (
    <div className="grid min-h-dvh place-items-center bg-surface-alt p-4">
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8 shadow-card-hover">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">
          {listening ? 'Listening Practice Test' : 'Reading Test'}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">{test.title}</h1>
        <p className="mt-2 text-ink-muted">{test.description}</p>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{test.parts.length}</p>
            <p className="text-xs text-ink-muted">{partLabel}</p>
          </div>
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{numberedTotal}</p>
            <p className="text-xs text-ink-muted">numbered questions</p>
          </div>
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{test.durationMinutes}</p>
            <p className="text-xs text-ink-muted">minutes</p>
          </div>
        </div>

        <ul className="mt-6 space-y-2.5 text-sm text-ink">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">⏱</span>
            <span>The timer starts as soon as you begin and runs continuously.</span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">🚫</span>
            <span><strong>You cannot pause.</strong> Refreshing or closing the tab will not stop the clock. You will resume with time already elapsed.</span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">✍️</span>
            <span>Answer all {scoredTotal} scored questions across {test.parts.length} {partLabel}, then submit. It auto-submits when time runs out.</span>
          </li>
          {unavailableTotal > 0 && (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="shrink-0">ℹ️</span>
              <span>{unavailableTotal} numbered question is missing from the published source and is excluded from your score.</span>
            </li>
          )}
          {listening ? (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="shrink-0">🎧</span>
              <span>
                {attemptKind === 'drill' ? (
                  <>This is a single-part drill. You can <strong>play, pause, seek and replay</strong> the recording as many times as you like while you practise.</>
                ) : (
                  <>
                    This is exam conditions: press <strong>Start recording</strong> when ready and it plays <strong>once</strong>, from the beginning, with no pausing, seeking or replaying.
                    Refreshing keeps your answers and running timer, but restarts the recording from the beginning.
                  </>
                )}
              </span>
            </li>
          ) : (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="shrink-0">🖍</span>
              <span>Select any text in a passage to <strong>highlight</strong> it, just like the real computer test. Click a highlight to remove it.</span>
            </li>
          )}
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">🚩</span>
            <span>Not sure about an answer? <strong>Flag it</strong> and jump back later using the numbered circles at the bottom.</span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">📊</span>
            <span>
              At the end you get a score, an estimated band, and a full <strong>answer review</strong>
              {listening ? ', including the transcript.' : ', with every question explained with the exact line from the passage.'}
            </span>
          </li>
        </ul>

        <div className="mt-8 flex items-center justify-between gap-3">
          <a href={hubUrl} className="inline-block px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
            Back
          </a>
          <button
            type="button"
            onClick={onStart}
            className="rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
          >
            Start test
          </button>
        </div>
      </div>
    </div>
  );
}
