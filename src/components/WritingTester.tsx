/* The writing checker: start → get a rotating task → write → submit → report.
   Every start serves a different prompt (localStorage rotation) until the
   whole pool has been used, then the cycle restarts. Grading goes through
   gradeEssay() (heuristics + the active EssayGrader), so this component is
   provider-agnostic — it renders the same report whether the stub or a real
   model produced the assessment. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EssayPrompt } from '../lib/writing/schema';
import type { GradeResult } from '../lib/writing/schema';
import { CRITERIA, criterionLabel } from '../lib/writing/schema';
import { countWords } from '../lib/writing/mechanics';
import { gradeEssay } from '../lib/writing/grader';
import { WRITING_PROMPTS } from '../data/writing-prompts';
import { nextInRotation } from '../lib/rotation';
import { withBase } from '../lib/url';
import { recordWritingAttempt } from '../lib/progress';
import BandReport from './BandReport';
import WritingCoachPanel from './WritingCoachPanel';

const TASK1_PROMPTS = WRITING_PROMPTS.filter((p) => p.task === 'task1');
const TASK2_PROMPTS = WRITING_PROMPTS.filter((p) => p.task === 'task2');
/* Task 1 splits into two non-overlapping pools: GT is always a letter,
   Academic is everything else (chart/graph/table/process/map/combination).
   Task 2 is one shared essay pool — real IELTS GT and Academic Task 2 use
   the same skill and near-identical topics, so splitting it would just
   fragment an already-small pool for no real benefit. */
const ACADEMIC_TASK1_PROMPTS = TASK1_PROMPTS.filter((p) => p.variant !== 'letter');
const GT_TASK1_PROMPTS = TASK1_PROMPTS.filter((p) => p.variant === 'letter');

type Module = 'academic' | 'general';

/* Fake-but-honest progress steps shown while the real request is in flight —
   ticks forward on a timer, independent of the actual grading call, so it
   never has to lie about real completion (it just stops advancing past the
   last step until the response actually arrives). */
const GRADING_STEPS = [
  'Reading your essay…',
  'Checking grammar, vocabulary & coherence…',
  'Scoring against the 4 official IELTS criteria…',
  'Writing your feedback…',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function WritingTester() {
  const [module, setModule] = useState<Module>('academic');
  const [taskType, setTaskType] = useState<'task1' | 'task2' | null>(null);
  const [prompt, setPrompt] = useState<EssayPrompt | null>(null);
  const [essay, setEssay] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [gradingStep, setGradingStep] = useState(0);
  const gradingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed time — starts the moment the task begins, exactly like the real
  // exam clock (it doesn't wait for the first keystroke).
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerStartedRef = useRef(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (gradingIntervalRef.current) clearInterval(gradingIntervalRef.current);
    };
  }, []);

  /* Clears any running timer and starts a fresh one from 0, right away. */
  function restartTimer() {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerStartedRef.current = true;
    setElapsedMs(0);
    const startedAt = performance.now();
    timerIntervalRef.current = setInterval(() => setElapsedMs(performance.now() - startedAt), 500);
  }

  const wordCount = useMemo(() => countWords(essay), [essay]);

  async function submit() {
    if (!prompt || grading) return;
    setGrading(true);
    setGradingStep(0);
    setGradingError(null);
    gradingIntervalRef.current = setInterval(() => {
      setGradingStep((s) => (s < GRADING_STEPS.length - 1 ? s + 1 : s));
    }, 1600);
    try {
      const graded = await gradeEssay({ prompt, essay });
      setResult(graded);
      const criteria: Record<string, number> = {};
      for (const key of Object.keys(graded.criteria)) criteria[key] = graded.criteria[key as keyof typeof graded.criteria].band;
      recordWritingAttempt(prompt.id, {
        at: new Date().toISOString(),
        overallBand: graded.overallBand,
        criteria,
        wordCount,
        live: graded.grader.live,
      });
    } catch (err) {
      setGradingError(err instanceof Error ? err.message : 'Something went wrong while grading your essay.');
    } finally {
      if (gradingIntervalRef.current) clearInterval(gradingIntervalRef.current);
      setGrading(false);
    }
  }

  /* Serve the next prompt in the given task's rotation and clear the workspace.
     Task 1's pool (and rotation) depends on the module; Task 2 is shared. */
  function startTask(task: 'task1' | 'task2', mod: Module) {
    const pool = task === 'task2' ? TASK2_PROMPTS : mod === 'general' ? GT_TASK1_PROMPTS : ACADEMIC_TASK1_PROMPTS;
    const rotationKey = task === 'task2' ? 'ielts.rotation.writing-task2.v1' : `ielts.rotation.writing-task1-${mod}.v1`;
    const id = nextInRotation(
      rotationKey,
      pool.map((p) => p.id),
    );
    setTaskType(task);
    setModule(mod);
    setPrompt(pool.find((p) => p.id === id) ?? pool[0]);
    setEssay('');
    setResult(null);
    restartTimer();
  }

  function newTask() {
    if (essay.trim() && !window.confirm('Get a different task? Your current answer will be cleared.')) return;
    startTask(taskType!, module);
  }

  /* ── 1. Start screen ── */
  if (!prompt) {
    return (
      <div className="screen-in relative overflow-hidden rounded-card border border-border bg-surface p-8 text-center shadow-card sm:p-10">
        <span className="absolute inset-x-0 top-0 h-1 bg-[var(--skill,#0E9F6E)]" aria-hidden="true" />
        <img
          src={withBase('/pics/writing/start-task.png')}
          alt="Hand writing an essay beside a rotating stack of task cards and a 7.5 band badge"
          className="mx-auto w-full max-w-[160px]"
          loading="lazy"
        />
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">Writing</p>
        <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Take a Writing Test</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted sm:text-[0.95rem]">
          Pick a module, then a task. You'll get an exam-style prompt, a different one every time,
          until you've written them all. An AI examiner grades your answer on the four official IELTS criteria.
        </p>

        <div className="mx-auto mt-6 inline-flex rounded-button border border-border bg-surface-alt/60 p-1">
          <button
            type="button"
            onClick={() => setModule('academic')}
            className={`rounded-button px-4 py-1.5 text-sm font-semibold transition-colors ${
              module === 'academic' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Academic
          </button>
          <button
            type="button"
            onClick={() => setModule('general')}
            className={`rounded-button px-4 py-1.5 text-sm font-semibold transition-colors ${
              module === 'general' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            General Training
          </button>
        </div>

        <div className="mx-auto mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => startTask('task1', module)}
            className="group flex flex-col items-center rounded-card border border-border bg-surface-alt/60 p-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-card sm:items-start sm:text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-white">
              1
            </span>
            <h4 className="mt-3 font-display text-lg font-bold">Task 1</h4>
            <p className="mt-1 text-sm text-ink-muted">
              {module === 'general'
                ? 'Write a formal, semi-formal or informal letter.'
                : 'Describe a chart, graph, table, process or map.'}{' '}
              {(module === 'general' ? GT_TASK1_PROMPTS : ACADEMIC_TASK1_PROMPTS)[0]?.minWords}+ words ·
              ~{(module === 'general' ? GT_TASK1_PROMPTS : ACADEMIC_TASK1_PROMPTS)[0]?.suggestedMinutes} min.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 font-display text-sm font-bold text-brand transition-transform group-hover:translate-x-0.5">
              Start Task 1 →
            </span>
          </button>
          <button
            type="button"
            onClick={() => startTask('task2', module)}
            className="group flex flex-col items-center rounded-card border border-border bg-surface-alt/60 p-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-card sm:items-start sm:text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-white">
              2
            </span>
            <h4 className="mt-3 font-display text-lg font-bold">Task 2</h4>
            <p className="mt-1 text-sm text-ink-muted">
              Write a discursive essay responding to a prompt. {TASK2_PROMPTS[0]?.minWords}+ words ·
              ~{TASK2_PROMPTS[0]?.suggestedMinutes} min.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 font-display text-sm font-bold text-brand transition-transform group-hover:translate-x-0.5">
              Start Task 2 →
            </span>
          </button>
        </div>

        <p className="mt-5 text-xs text-ink-muted">
          {module === 'general' ? GT_TASK1_PROMPTS.length : ACADEMIC_TASK1_PROMPTS.length} Task 1 prompts ·{' '}
          {TASK2_PROMPTS.length} Task 2 prompts (shared with Academic) · free
        </p>
      </div>
    );
  }

  /* ── 2b. Grading in progress ── */
  if (grading) {
    return (
      <div className="screen-in relative overflow-hidden rounded-card border border-border bg-surface p-10 text-center shadow-card">
        <span className="absolute inset-x-0 top-0 h-1 bg-[var(--skill,#0E9F6E)]" aria-hidden="true" />
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <span
            className="absolute inset-0 animate-spin rounded-full border-4 border-[var(--skill,#0E9F6E)]/15 border-t-[var(--skill,#0E9F6E)]"
            style={{ animationDuration: '1.1s' }}
            aria-hidden="true"
          />
          <span className="text-3xl" aria-hidden="true">
            📝
          </span>
        </div>
        <h3 className="mt-6 font-display text-xl font-extrabold">Grading your essay…</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
          Our AI examiner is reading your response against the official IELTS band descriptors.
        </p>
        <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left">
          {GRADING_STEPS.map((step, i) => {
            const done = i < gradingStep;
            const active = i === gradingStep;
            return (
              <li key={step} className="flex items-center gap-2.5 text-sm">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold transition-colors ${
                    done
                      ? 'bg-[var(--skill,#0E9F6E)] text-white'
                      : active
                        ? 'border-2 border-[var(--skill,#0E9F6E)] text-[var(--skill,#0E9F6E)]'
                        : 'border border-border text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  {done ? '✓' : active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--skill,#0E9F6E)]" /> : '○'}
                </span>
                <span className={done || active ? 'text-ink' : 'text-ink-muted'}>{step}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  /* ── 3. Feedback report ── */
  if (result) {
    const m = result.mechanics;
    return (
      <div className="screen-in space-y-6">
        <BandReport
          title={prompt.title}
          overallBand={result.overallBand}
          live={result.grader.live}
          offlineWarning="The band scores below are illustrative, generated from mechanical signals only, without an AI examiner. Your teacher can enable AI grading."
          criteria={CRITERIA.map((c) => ({
            key: c.key,
            label: criterionLabel(c, prompt.task),
            band: result.criteria[c.key].band,
            comment: result.criteria[c.key].comment,
            tip: result.criteria[c.key].tip,
          }))}
          strengths={result.strengths}
          improvements={result.improvements}
        >
          {/* Instant mechanics */}
          <div className="rounded-card border border-border bg-surface p-5 shadow-card">
            <h3 className="font-display font-bold">Mechanics check</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <Stat label="Words" value={`${m.wordCount}`} bad={m.underLength} />
              <Stat label="Sentences" value={`${m.sentenceCount}`} />
              <Stat label="Vocab variety" value={`${Math.round(m.lexicalDiversity * 100)}%`} bad={m.lexicalDiversity < 0.42} />
              <Stat label="Linking words" value={`${m.linkingDevices.reduce((a, l) => a + l.count, 0)}`} bad={m.linkingDevices.length === 0 && m.sentenceCount > 3} />
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
              {m.notes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Corrections */}
          {result.corrections.length > 0 && (
            <div className="rounded-card border border-border bg-surface p-5 shadow-card">
              <h3 className="font-display font-bold">Corrections</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {result.corrections.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-error-tint px-1.5 py-0.5 font-semibold text-error line-through">
                      {c.original}
                    </span>
                    <span aria-hidden="true">→</span>
                    <span className="rounded bg-success-tint px-1.5 py-0.5 font-semibold text-success">{c.fix}</span>
                    <span className="text-ink-muted">· {c.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </BandReport>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setResult(null)}
            className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
          >
            ✎ Revise this essay
          </button>
          <button
            type="button"
            onClick={() => startTask(taskType!, module)}
            className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Take another test →
          </button>
        </div>
      </div>
    );
  }

  /* ── 2. Editor ── */
  const under = wordCount < prompt.minWords;
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const timerOvertime = elapsedMs >= prompt.suggestedMinutes * 60_000;
  return (
    <>
      {/* Floating clock — rendered as a sibling of (not nested inside)
          .screen-in on purpose: that div's entrance animation ends with
          animation-fill-mode: both holding `transform: translateY(0)`, and
          ANY transform on an ancestor — even the identity one — creates a
          new containing block for `position: fixed` descendants, which
          would silently rebase this box to .screen-in's own edges instead
          of the viewport. Nested there, it can never actually reach the
          real margin beside the card and always overlaps the prompt text.
          Only safe once the viewport is wide enough that the max-w-4xl
          card's side margin clears the clock's own width (~135px plus its
          right-6 offset), which is xl. Below xl: it renders inline in the
          card header instead. */}
      {timerStartedRef.current && (
        <div
          className={`fixed right-3 top-20 z-50 hidden flex-col items-center rounded-card border-2 bg-surface px-4 py-3 shadow-card-hover xl:flex xl:right-6 ${
            timerOvertime ? 'border-error' : 'border-brand'
          }`}
          title={timerOvertime ? 'Over the suggested time' : 'Time spent writing'}
        >
          <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${timerOvertime ? 'text-error' : 'text-ink-muted'}`}>
            {timerOvertime ? '⚠ Overtime' : '⏱ Writing time'}
          </span>
          <span className={`font-mono text-3xl font-extrabold tabular-nums leading-tight xl:text-4xl ${timerOvertime ? 'text-error' : 'text-ink'}`}>
            {pad(Math.floor(totalSeconds / 60))}:{pad(totalSeconds % 60)}
          </span>
          <span className="text-[0.65rem] text-ink-muted">of ~{prompt.suggestedMinutes} min</span>
        </div>
      )}

      <div className="screen-in lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
        <div className="space-y-4">
          <div className="rounded-card border border-border bg-surface p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">
                {prompt.task === 'task2'
                  ? 'Writing Task 2'
                  : `Writing Task 1 (${module === 'general' ? 'General Training' : 'Academic'})`}{' '}
                · ~{prompt.suggestedMinutes} min
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {timerStartedRef.current && (
                  <span
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs font-bold tabular-nums xl:hidden ${
                      timerOvertime ? 'border-error text-error' : 'border-border text-ink'
                    }`}
                    title={timerOvertime ? 'Over the suggested time' : 'Time spent writing'}
                  >
                    {timerOvertime ? '⚠' : '⏱'} {pad(Math.floor(totalSeconds / 60))}:{pad(totalSeconds % 60)}
                  </span>
                )}
                <button type="button" onClick={newTask} className="text-xs font-semibold text-ink-muted hover:text-ink">
                  ↻ New task
                </button>
              </div>
            </div>
            <p className="mt-2 text-[0.95rem] leading-relaxed" dangerouslySetInnerHTML={{ __html: prompt.promptHtml }} />
          </div>

          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            rows={14}
            placeholder="Write your answer here…"
            className="w-full rounded-card border border-border bg-surface p-4 text-[0.95rem] leading-relaxed shadow-card focus:border-brand focus:outline-none"
          />

          {gradingError && (
            <div className="rounded-card border border-error/30 bg-error-tint px-4 py-3 text-sm text-error">
              ⚠ Couldn't grade your essay. {gradingError.replace(/\.?$/, '.')} Please try again in a moment.
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${under ? 'text-ink-muted' : 'text-success'}`}>
              {wordCount} / {prompt.minWords}+ words
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={wordCount === 0}
              className="rounded-button bg-brand px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Check my essay
            </button>
          </div>
        </div>

        <div className="mt-4 lg:sticky lg:top-24 lg:mt-0">
          <WritingCoachPanel key={prompt.id} prompt={prompt} />
        </div>
      </div>
    </>
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
