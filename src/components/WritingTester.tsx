/* The writing tool: start → get a rotating task → write → submit → report.
   Every start serves a different prompt (localStorage rotation) until the
   whole pool has been used, then the cycle restarts. Grading goes through
   gradeEssay() (heuristics + the active EssayGrader), so this component is
   provider-agnostic — it renders the same report whether the stub or a real
   model produced the assessment.

   Two variants, the same split Reading and Speaking already use:
   variant="trainer" is the Writing Trainer at /trainers/writing — the
   coaching playground, with the structure/language/vocab coach beside the
   editor and a "new task" reroll. variant="checker" is the Writing Checker
   at /writing/checker — exam conditions: the question, the clock, the word
   count, nothing to lean on. Both end in the same band report; coaching is
   what separates practice from a test. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EssayPrompt } from '../lib/writing/schema';
import type { GradeResult } from '../lib/writing/schema';
import { CRITERIA, criterionLabel } from '../lib/writing/schema';
import { WRITING_BAND_GUIDES, guideFor } from '../data/band-guides';
import { countWords } from '../lib/writing/mechanics';
import { gradeEssay, isGraderConfigured } from '../lib/writing/grader';
import { WRITING_PROMPTS } from '../data/writing-prompts';
import { nextInRotation } from '../lib/rotation';
import { withBase } from '../lib/url';
import { recordWritingAttempt } from '../lib/progress';
import BandReport from './BandReport';
import Html from './Html';
import WritingCoachPanel from './WritingCoachPanel';

const TASK1_PROMPTS = WRITING_PROMPTS.filter((p) => p.task === 'task1');
const TASK2_PROMPTS = WRITING_PROMPTS.filter((p) => p.task === 'task2');
/* Academic only: Task 1 is always a report on visual data (chart, graph,
   table, process, map or combination) and Task 2 is the essay pool. */

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

export default function WritingTester({ variant = 'trainer' }: { variant?: 'trainer' | 'checker' }) {
  const coached = variant === 'trainer';
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
    if (!prompt || grading || !isGraderConfigured()) return;
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
        essay,
      });
    } catch {
      // The button is disabled whenever isGraderConfigured() is false, so any
      // error reaching here happened after a real request went out - network,
      // timeout, or the Worker itself failing. Show one calm, specific
      // message rather than surfacing the raw error (which might read like a
      // permanent "not configured" state the student can't do anything about).
      setGradingError('We could not reach the grading service. Your essay is safe on this page; try again in a minute.');
    } finally {
      if (gradingIntervalRef.current) clearInterval(gradingIntervalRef.current);
      setGrading(false);
    }
  }

  /* Serve the next prompt in the given task's rotation and clear the workspace. */
  function startTask(task: 'task1' | 'task2') {
    const pool = task === 'task2' ? TASK2_PROMPTS : TASK1_PROMPTS;
    if (pool.length === 0) return; // no prompts of this kind are loaded
    const rotationKey = task === 'task2' ? 'ielts.rotation.writing-task2.v1' : 'ielts.rotation.writing-task1.v1';
    const id = nextInRotation(
      rotationKey,
      pool.map((p) => p.id),
    );
    setTaskType(task);
    setPrompt(pool.find((p) => p.id === id) ?? pool[0]);
    setEssay('');
    setResult(null);
    restartTimer();
  }

  function newTask() {
    if (essay.trim() && !window.confirm('Get a different task? Your current answer will be cleared.')) return;
    startTask(taskType!);
  }

  /* ── 1. Start screen ── */
  if (!prompt) {
    const t1Pool = TASK1_PROMPTS;
    const taskCards = [
      {
        task: 'task1' as const,
        title: 'Task 1',
        kind: 'Report',
        description: 'Describe a chart, graph, table, process or map in your own words.',
        minWords: t1Pool[0]?.minWords,
        minutes: t1Pool[0]?.suggestedMinutes,
      },
      {
        task: 'task2' as const,
        title: 'Task 2',
        kind: 'Essay',
        description: 'Write a discursive essay responding to an opinion, discussion or problem prompt.',
        minWords: TASK2_PROMPTS[0]?.minWords,
        minutes: TASK2_PROMPTS[0]?.suggestedMinutes,
      },
    ];
    return (
      <div className="screen-in relative overflow-hidden rounded-card border border-border bg-surface p-8 text-center shadow-card sm:p-10">
        <span className="absolute inset-x-0 top-0 h-1 bg-[var(--skill,#0E9F6E)]" aria-hidden="true" />
        <img
          src={withBase('/pics/writing/start-task.png')}
          alt="Hand writing an essay beside a rotating stack of task cards and a 7.5 band badge"
          className="mx-auto w-full max-w-[150px]"
          loading="lazy"
        />
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">
          {coached ? 'Writing · AI-graded' : 'Writing · Exam conditions'}
        </p>
        <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
          {coached ? 'Take a Writing Test' : 'Writing Checker'}
        </h3>
        {/* One line only — the page header above the card already explains the
            grading; repeating it here was reading as a doubled introduction. */}
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted sm:text-[0.95rem]">
          {coached
            ? 'Pick a task. A different exam-style prompt every attempt.'
            : 'Pick a task. Just you and the question, exactly like the real exam.'}
        </p>


        <div className="mx-auto mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
          {taskCards.map((t) => (
            <button
              key={t.task}
              type="button"
              onClick={() => startTask(t.task)}
              className="group flex flex-col rounded-card border border-border bg-surface-alt/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--skill,#0E9F6E)]/60 hover:shadow-card"
            >
              <span className="font-display text-lg font-extrabold">
                {t.title} <span className="font-bold text-ink-muted">· {t.kind}</span>
              </span>
              <p className="mt-1.5 flex-1 text-sm text-ink-muted">{t.description}</p>
              <span className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted">
                  {t.minWords}+ words
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted">
                  ⏱ ~{t.minutes} min
                </span>
              </span>
              <span className="mt-4 inline-flex w-full items-center justify-center rounded-button bg-[var(--skill,#0E9F6E)] px-4 py-2.5 font-display text-sm font-bold text-white transition-opacity group-hover:opacity-90">
                Start {t.title}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs text-ink-muted">
          {t1Pool.length} Task 1 prompts · {TASK2_PROMPTS.length} Task 2 prompts · free
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
          criteria={CRITERIA.map((c) => {
            const score = result.criteria[c.key];
            const guide = guideFor(WRITING_BAND_GUIDES[c.key], score.band);
            return {
              key: c.key,
              label: criterionLabel(c, prompt.task),
              band: score.band,
              comment: score.comment,
              tip: score.tip,
              nextBand: score.nextBand,
              // task1Note only applies to Task 1 Academic's Task Achievement scale
              guide: guide && prompt.task !== 'task1' ? { ...guide, task1Note: undefined } : guide,
            };
          })}
          strengths={result.strengths}
          improvements={result.improvements}
          actionPlan={result.actionPlan}
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

          {/* Moments */}
          {result.moments.length > 0 && (
            <div className="rounded-card border border-border bg-surface p-5 shadow-card">
              <h3 className="font-display font-bold">Moments from your essay</h3>
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
            onClick={() => startTask(taskType!)}
            className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Take another test
          </button>
        </div>
        <p className="text-center text-xs text-ink-muted">
          Your essay and its scores are saved.{' '}
          <a href={withBase('/account#writing')} className="font-semibold text-brand hover:underline">
            Reread it any time in My progress
          </a>
          .
        </p>
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

      <div className={`screen-in ${coached ? 'lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6' : ''}`}>
        <div className="space-y-4">
          <div className="rounded-card border border-border bg-surface p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">
                {prompt.task === 'task2' ? 'Writing Task 2' : 'Writing Task 1'}{' '}
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
                {/* Exam conditions: you get the question you're given. The
                    reroll is a practice affordance, so it's trainer-only. */}
                {coached && (
                  <button type="button" onClick={newTask} className="py-2 -my-2 text-xs font-semibold text-ink-muted hover:text-ink">
                    ↻ New task
                  </button>
                )}
              </div>
            </div>
            {/* Via <Html> (memoized), not an inline dangerouslySetInnerHTML:
                the writing clock re-renders this component every 500ms and
                every keystroke, and an inline one would reparse the prompt on
                each of those — visibly re-loading the Task 1 chart image. */}
            <Html as="p" className="mt-2 text-[0.95rem] leading-relaxed" html={prompt.promptHtml} />
          </div>

          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            rows={14}
            placeholder="Write your answer here…"
            className="w-full rounded-card border border-border bg-surface p-4 text-[0.95rem] leading-relaxed shadow-card focus:border-brand focus:outline-none"
          />

          {!isGraderConfigured() && (
            <p className="rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
              ⚠ AI feedback is not available on this build (PUBLIC_GRADER_URL is not set). You can still write and time
              yourself, but essays can't be graded here yet.
            </p>
          )}
          {gradingError && (
            <div className="rounded-card border border-error/30 bg-error-tint px-4 py-3 text-sm text-error">
              ⚠ {gradingError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${under ? 'text-ink-muted' : 'text-success'}`}>
              {wordCount} / {prompt.minWords}+ words
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={wordCount === 0 || !isGraderConfigured()}
              className="rounded-button bg-brand px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Check my essay
            </button>
          </div>
        </div>

        {/* The coach is what makes the trainer a trainer. The Checker is the
            exam: question, clock, word count, nothing to lean on. */}
        {coached && (
          <div className="mt-4 lg:sticky lg:top-24 lg:mt-0">
            <WritingCoachPanel key={prompt.id} prompt={prompt} />
          </div>
        )}
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
