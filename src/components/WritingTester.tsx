/* The essay checker: start → get a rotating task → write → submit → report.
   Every start serves a different prompt (localStorage rotation) until the
   whole pool has been used, then the cycle restarts. Grading goes through
   gradeEssay() (heuristics + the active EssayGrader), so this component is
   provider-agnostic — it renders the same report whether the stub or a real
   model produced the assessment. */

import { useMemo, useState } from 'react';
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

export default function WritingTester() {
  const [prompt, setPrompt] = useState<EssayPrompt | null>(null);
  const [essay, setEssay] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);

  const wordCount = useMemo(() => countWords(essay), [essay]);

  async function submit() {
    if (!prompt || grading) return;
    setGrading(true);
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
    } finally {
      setGrading(false);
    }
  }

  /* Serve the next prompt in the rotation and clear the workspace. */
  function startTask() {
    const id = nextInRotation(
      'ielts.rotation.writing-prompts.v1',
      WRITING_PROMPTS.map((p) => p.id),
    );
    setPrompt(WRITING_PROMPTS.find((p) => p.id === id) ?? WRITING_PROMPTS[0]);
    setEssay('');
    setResult(null);
  }

  function newTask() {
    if (essay.trim() && !window.confirm('Get a different task? Your current answer will be cleared.')) return;
    startTask();
  }

  /* ── 1. Start screen ── */
  if (!prompt) {
    return (
      <div className="relative overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <span className="absolute inset-x-0 top-0 h-1 bg-[var(--skill,#0E9F6E)]" aria-hidden="true" />
        <div className="grid items-center gap-8 p-8 sm:p-10 md:grid-cols-[1fr_minmax(0,280px)]">
          <div className="text-center md:text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">Writing</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Take a Writing Test</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted sm:text-[0.95rem] md:mx-0">
              You'll get an exam-style task — a different one every time, until you've written them all.
              An AI examiner grades your answer on the four official IELTS criteria.
            </p>
            <button
              type="button"
              onClick={startTask}
              className="mt-7 rounded-button bg-brand px-8 py-3 font-display text-lg font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Start a task →
            </button>
            <p className="mt-3 text-xs text-ink-muted">
              {WRITING_PROMPTS.length} tasks in rotation · essays and letters · free
            </p>
          </div>
          <img
            src={withBase('/pics/writing/start-task.png')}
            alt="Hand writing an essay beside a rotating stack of task cards and a 7.5 band badge"
            className="mx-auto -order-1 w-full max-w-[240px] md:order-none md:max-w-[280px]"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  /* ── 3. Feedback report ── */
  if (result) {
    const m = result.mechanics;
    return (
      <div className="space-y-6">
        <BandReport
          title={prompt.title}
          overallBand={result.overallBand}
          live={result.grader.live}
          offlineWarning="The band scores below are illustrative — generated from mechanical signals only, without an AI examiner. Your teacher can enable AI grading."
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
                    <span className="text-ink-muted">— {c.reason}</span>
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
            onClick={startTask}
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
  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">
            {prompt.task === 'task2' ? 'Writing Task 2' : 'Writing Task 1'} · ~{prompt.suggestedMinutes} min
          </span>
          <button type="button" onClick={newTask} className="text-xs font-semibold text-ink-muted hover:text-ink">
            ↻ New task
          </button>
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

      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${under ? 'text-ink-muted' : 'text-success'}`}>
          {wordCount} / {prompt.minWords}+ words
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={grading || wordCount === 0}
          className="rounded-button bg-brand px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {grading ? 'Checking…' : 'Check my essay'}
        </button>
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
