import { useState } from 'react';
import type { PracticeQuestion, PracticeSet } from '../data/reading-practice';

/* Interactive practice exercise for reading question-type pages.
   Choice questions answer on click; text questions on Check/Enter.
   Wrong answers reveal the correct answer plus an explanation. */

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

export default function PracticeQuiz({ set }: Props) {
  // null = unanswered; otherwise the given answer (locked)
  const [given, setGiven] = useState<(string | null)[]>(() => set.questions.map(() => null));
  const [drafts, setDrafts] = useState<string[]>(() => set.questions.map(() => ''));

  const answered = given.filter((g) => g !== null).length;
  const correct = given.filter((g, i) => g !== null && isRight(set.questions[i]!, g)).length;
  const done = answered === set.questions.length;

  function lock(i: number, value: string) {
    if (given[i] !== null || !value.trim()) return;
    setGiven((prev) => prev.map((g, j) => (j === i ? value : g)));
  }

  function reset() {
    setGiven(set.questions.map(() => null));
    setDrafts(set.questions.map(() => ''));
  }

  return (
    <div className="my-6 rounded-card border border-border bg-brand-tint/40 p-5 sm:p-6">
      <h3 className="font-display text-base font-bold">{set.title}</h3>
      {set.intro && <p className="mt-1 text-sm text-ink-muted">{set.intro}</p>}

      <div className="mt-4 space-y-3">
        {set.questions.map((q, i) => {
          const g = given[i];
          const locked = g !== null;
          const right = locked && isRight(q, g);

          return (
            <div
              key={i}
              className={`rounded-xl border bg-surface p-4 transition-colors ${
                locked ? (right ? 'border-success' : 'border-error') : 'border-border'
              }`}
            >
              <p className="text-[0.95rem]">
                <strong className="mr-1.5">{i + 1}.</strong>
                {q.prompt}
              </p>

              {q.kind === 'choice' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.options!.map((opt) => {
                    const chosen = g === opt.value;
                    const isAnswer = isRight(q, opt.value);
                    let cls = 'border-border bg-surface hover:border-brand hover:bg-brand-tint';
                    if (locked) {
                      if (isAnswer) cls = 'border-success bg-success-tint text-success font-semibold';
                      else if (chosen) cls = 'border-error bg-error-tint text-error';
                      else cls = 'border-border bg-surface opacity-50';
                    }
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={locked}
                        onClick={() => lock(i, opt.value)}
                        className={`rounded-button border px-3.5 py-1.5 text-sm transition-colors ${cls} ${
                          locked ? '' : 'cursor-pointer'
                        }`}
                      >
                        {opt.label ?? opt.value}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <form
                  className="mt-3 flex flex-wrap items-center gap-2"
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
                    className={`w-56 rounded-button border px-3 py-1.5 text-sm ${
                      locked
                        ? right
                          ? 'border-success bg-success-tint text-success font-semibold'
                          : 'border-error bg-error-tint text-error'
                        : 'border-border bg-surface focus:border-brand'
                    }`}
                  />
                  {!locked && (
                    <button
                      type="submit"
                      className="rounded-button bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
                    >
                      Check
                    </button>
                  )}
                </form>
              )}

              {locked && (
                <div
                  className={`mt-3 rounded-lg px-3.5 py-2.5 text-sm ${
                    right ? 'bg-success-tint text-ink' : 'bg-error-tint text-ink'
                  }`}
                >
                  {right ? (
                    <p>
                      <strong className="text-success">✓ Correct.</strong> {q.explanation}
                    </p>
                  ) : (
                    <p>
                      <strong className="text-error">✗ Not quite.</strong>{' '}
                      <span>
                        The answer is <strong>{answerLabel(q)}</strong>. {q.explanation}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <p className="text-sm font-semibold">
          {done ? (
            <>
              Finished — {correct} / {set.questions.length} correct
              {correct === set.questions.length ? ' 🎉' : ''}
            </>
          ) : (
            <>
              {answered} of {set.questions.length} answered
              {answered > 0 && ` · ${correct} correct`}
            </>
          )}
        </p>
        {answered > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-sm font-semibold text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
