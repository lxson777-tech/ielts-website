import { useState } from 'react';
import type { PracticeQuestion, PracticeSet } from '../data/reading-practice';

/** Base-prefixed URL for images stored under /public. */
const asset = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${p}`;

/* Interactive practice exercise for reading question-type pages.
   Choice questions answer on click; text questions on Check/Enter.
   Wrong answers reveal the correct answer plus an explanation.
   Inherits the ambient --skill / --skill-tint variables (reading coral). */

interface Props {
  set: PracticeSet;
}

function isRight(q: PracticeQuestion, given: string): boolean {
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const accepted = Array.isArray(q.answer) ? q.answer : [q.answer];
  return accepted.some((a) => norm(a) === norm(given));
}

function answerLabel(q: PracticeQuestion): string {
  const value = Array.isArray(q.answer) ? q.answer[0]! : q.answer;
  const opt = q.options?.find((o) => o.value === value);
  return opt?.label ?? value;
}

const PRAISE = ['Nice one!', 'Exactly right!', 'Well spotted!', 'Perfect!', 'Correct!'];

function scoreMessage(correct: number, total: number): string {
  const p = correct / total;
  if (p === 1) return 'Flawless! You have mastered this question type. 🏆';
  if (p >= 0.8) return 'Excellent work — almost perfect! 🌟';
  if (p >= 0.6) return 'Good job! Review the explanations you missed and go again. 💪';
  if (p >= 0.4) return 'Getting there — reread the strategy above and try again. 📖';
  return 'Tough round! Study the explanations, then hit Try again. 🔄';
}

export default function PracticeQuiz({ set }: Props) {
  // null = unanswered; otherwise the given answer (locked)
  const [given, setGiven] = useState<(string | null)[]>(() => set.questions.map(() => null));
  const [drafts, setDrafts] = useState<string[]>(() => set.questions.map(() => ''));

  const total = set.questions.length;
  const answered = given.filter((g) => g !== null).length;
  const correct = given.filter((g, i) => g !== null && isRight(set.questions[i]!, g)).length;
  const done = answered === total;

  function lock(i: number, value: string) {
    if (given[i] !== null || !value.trim()) return;
    setGiven((prev) => prev.map((g, j) => (j === i ? value : g)));
  }

  function reset() {
    setGiven(set.questions.map(() => null));
    setDrafts(set.questions.map(() => ''));
  }

  return (
    <div className="my-8 overflow-hidden rounded-card border border-border shadow-card">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--color-brand)] to-[var(--skill,var(--color-brand-hover))] px-5 py-4 text-white sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold sm:text-lg">🎯 {set.title}</h3>
          <span className="rounded-full bg-white/20 px-3 py-1 font-display text-xs font-bold">
            {correct} / {total} correct
          </span>
        </div>
        {set.intro && <p className="mt-1 text-sm text-white/85">{set.intro}</p>}
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/25"
          role="progressbar"
          aria-valuenow={answered}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Questions answered"
        >
          <div
            className="h-full rounded-full bg-white transition-[width] duration-500"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Labelled diagram */}
      {set.diagram && (
        <div className="border-b border-border bg-surface p-4 sm:p-6">
          <div className="relative mx-auto max-w-lg overflow-hidden rounded-xl border border-border bg-white">
            <img src={asset(set.diagram.image)} alt={set.diagram.alt} className="block w-full" />
            {set.diagram.markers.map((m, idx) => {
              const g = given[idx];
              const locked = g !== null;
              const right = locked && isRight(set.questions[idx]!, g);
              const color = !locked
                ? 'bg-[var(--skill,var(--color-brand))]'
                : right
                  ? 'bg-success'
                  : 'bg-error';
              return (
                <span
                  key={idx}
                  className={`absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white font-display text-xs font-extrabold text-white shadow-card ${color} ${
                    locked ? (right ? 'pq-pop' : 'pq-shake') : ''
                  }`}
                  style={{ left: `${m.x}%`, top: `${m.y}%` }}
                  aria-hidden="true"
                >
                  {locked ? (right ? '✓' : '✗') : idx + 1}
                </span>
              );
            })}
          </div>
          <p className="mt-2 text-center text-xs text-ink-muted">
            Match each numbered pin to a body part below.
          </p>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4 bg-surface-alt p-4 sm:p-6">
        {set.questions.map((q, i) => {
          const g = given[i];
          const locked = g !== null;
          const right = locked && isRight(q, g);

          return (
            <div
              key={i}
              className={`rounded-xl border-2 bg-surface p-4 shadow-card transition-colors ${
                locked ? (right ? 'border-success pq-pop' : 'border-error pq-shake') : 'border-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold text-white ${
                    locked ? (right ? 'bg-success' : 'bg-error') : 'bg-[var(--skill,var(--color-brand))]'
                  }`}
                >
                  {locked ? (right ? '✓' : '✗') : i + 1}
                </span>
                <p className="pt-1 text-[0.95rem] font-medium">{q.prompt}</p>
              </div>

              {q.kind === 'choice' ? (
                <div className="mt-3 flex flex-wrap gap-2 pl-11">
                  {q.options!.map((opt) => {
                    const chosen = g === opt.value;
                    const isAnswer = isRight(q, opt.value);
                    let cls =
                      'border-border bg-surface text-ink hover:-translate-y-0.5 hover:border-[var(--skill)] hover:bg-[var(--skill-tint)] hover:shadow-card';
                    if (locked) {
                      if (isAnswer) cls = 'border-success bg-success text-white font-bold shadow-card';
                      else if (chosen) cls = 'border-error bg-error text-white line-through';
                      else cls = 'border-border bg-surface opacity-40';
                    }
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={locked}
                        onClick={() => lock(i, opt.value)}
                        className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-all ${cls}`}
                      >
                        {opt.label ?? opt.value}
                      </button>
                    );
                  })}
                </div>
              ) : q.kind === 'select' ? (
                <div className="mt-3 pl-11">
                  <select
                    value={locked ? g : ''}
                    disabled={locked}
                    onChange={(e) => lock(i, e.target.value)}
                    aria-label={`Paragraph for ${q.prompt}`}
                    className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
                      locked
                        ? right
                          ? 'border-success bg-success-tint text-success'
                          : 'border-error bg-error-tint text-error'
                        : 'border-border bg-surface focus:border-[var(--skill,var(--color-brand))] focus:outline-none'
                    }`}
                  >
                    <option value="" disabled>
                      Choose paragraph…
                    </option>
                    {q.options!.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label ?? `Paragraph ${opt.value}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <form
                  className="mt-3 flex flex-wrap items-center gap-2 pl-11"
                  onSubmit={(e) => {
                    e.preventDefault();
                    lock(i, drafts[i]!);
                  }}
                >
                  <input
                    type="text"
                    value={locked ? g : drafts[i]}
                    disabled={locked}
                    onChange={(e) => setDrafts((prev) => prev.map((d, j) => (j === i ? e.target.value : d)))}
                    placeholder="Type your answer…"
                    aria-label={`Answer to question ${i + 1}`}
                    className={`w-56 rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
                      locked
                        ? right
                          ? 'border-success bg-success-tint text-success'
                          : 'border-error bg-error-tint text-error line-through'
                        : 'border-border bg-surface focus:border-[var(--skill,var(--color-brand))] focus:outline-none'
                    }`}
                  />
                  {!locked && (
                    <button
                      type="submit"
                      className="rounded-full bg-[var(--skill,var(--color-brand))] px-5 py-1.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 hover:shadow-card"
                    >
                      Check ✓
                    </button>
                  )}
                </form>
              )}

              {locked && (
                <div
                  className={`pq-in ml-11 mt-3 rounded-xl border-l-4 px-4 py-3 text-sm ${
                    right ? 'border-success bg-success-tint' : 'border-error bg-error-tint'
                  }`}
                >
                  {right ? (
                    <p>
                      <strong className="text-success">🎉 {PRAISE[i % PRAISE.length]}</strong> {q.explanation}
                    </p>
                  ) : (
                    <p>
                      <strong className="text-error">💡 Not quite — the answer is “{answerLabel(q)}”.</strong>{' '}
                      {q.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Score card */}
        {done ? (
          <div className="pq-pop rounded-xl bg-gradient-to-r from-[var(--color-brand)] to-[var(--skill,var(--color-brand-hover))] p-6 text-center text-white shadow-card-hover">
            <p className="font-display text-4xl font-extrabold">
              {correct} / {total}
            </p>
            <p className="mt-1 text-sm text-white/90">{scoreMessage(correct, total)}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-full bg-white px-6 py-2 font-display text-sm font-bold text-brand transition-transform hover:-translate-y-0.5"
            >
              Try again ↺
            </button>
          </div>
        ) : (
          answered > 0 && (
            <div className="flex items-center justify-between px-1 text-sm text-ink-muted">
              <span>
                {answered} of {total} answered
              </span>
              <button
                type="button"
                onClick={reset}
                className="font-semibold underline underline-offset-2 hover:text-ink"
              >
                Start over
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
