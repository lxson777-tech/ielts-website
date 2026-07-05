/* The essay checker: pick a prompt → write → submit → feedback report.
   Grading goes through gradeEssay() (heuristics + the active EssayGrader),
   so this component is provider-agnostic — it renders the same report
   whether the stub or a real model produced the assessment. */

import { useMemo, useState } from 'react';
import type { EssayPrompt } from '../lib/writing/schema';
import type { GradeResult } from '../lib/writing/schema';
import { CRITERIA, criterionLabel } from '../lib/writing/schema';
import { countWords } from '../lib/writing/mechanics';
import { gradeEssay } from '../lib/writing/grader';
import { WRITING_PROMPTS } from '../data/writing-prompts';

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
      setResult(await gradeEssay({ prompt, essay }));
    } finally {
      setGrading(false);
    }
  }

  function reset() {
    setPrompt(null);
    setEssay('');
    setResult(null);
  }

  /* ── 1. Prompt picker ── */
  if (!prompt) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {WRITING_PROMPTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPrompt(p)}
            className="group flex flex-col rounded-card border border-border bg-surface p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">
              {p.task === 'task2' ? 'Task 2 · Essay' : 'Task 1 · Report/Letter'} · {p.variant}
            </span>
            <span className="mt-2 font-display text-lg font-bold">{p.title}</span>
            <span
              className="mt-2 line-clamp-3 text-sm text-ink-muted"
              dangerouslySetInnerHTML={{ __html: p.promptHtml }}
            />
            <span className="mt-4 border-t border-border pt-3 text-xs font-semibold text-ink-muted">
              {p.minWords}+ words · ~{p.suggestedMinutes} min
              <span className="float-right font-bold text-[var(--skill,#0E9F6E)] opacity-0 transition-opacity group-hover:opacity-100">
                Write →
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  /* ── 3. Feedback report ── */
  if (result) {
    const m = result.mechanics;
    return (
      <div className="space-y-6">
        {/* Band header */}
        <div className="rounded-card border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            {result.grader.live ? '✨ AI-assessed' : 'Sample assessment (offline)'} · {prompt.title}
          </p>
          <p className="mt-2 font-display text-5xl font-extrabold text-brand">
            {result.overallBand.toFixed(1)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">Estimated overall band</p>
          {!result.grader.live && (
            <p className="mx-auto mt-3 max-w-md rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
              ⚠ The band scores below are illustrative — generated from mechanical signals only,
              without an AI examiner. Your teacher can enable AI grading.
            </p>
          )}
        </div>

        {/* 4 criteria */}
        <div className="grid gap-4 sm:grid-cols-2">
          {CRITERIA.map((c) => {
            const s = result.criteria[c.key];
            return (
              <div key={c.key} className="rounded-card border border-border bg-surface p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{criterionLabel(c, prompt.task)}</span>
                  <span className="rounded-full bg-brand-tint px-2.5 py-0.5 font-display text-sm font-extrabold text-brand">
                    {s.band.toFixed(1)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">{s.comment}</p>
              </div>
            );
          })}
        </div>

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

        {/* Strengths / improvements */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ListCard title="✓ Strengths" items={result.strengths} tone="success" />
          <ListCard title="↗ Improve next" items={result.improvements} tone="brand" />
        </div>

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
            onClick={reset}
            className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Try another prompt
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
          <button type="button" onClick={reset} className="text-xs font-semibold text-ink-muted hover:text-ink">
            ← Change prompt
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

function ListCard({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'brand' }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h3 className={`font-display font-bold ${tone === 'success' ? 'text-success' : 'text-brand'}`}>{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
        {items.map((s) => (
          <li key={s} className="flex gap-2">
            <span aria-hidden="true">·</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
