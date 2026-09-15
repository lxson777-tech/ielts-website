import { useState } from 'react';
import type { PracticeQuestion, PracticeSet, PracticeUnit } from '../data/reading-practice';

/** Base-prefixed URL for images stored under /public. */
const asset = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${p}`;

/* Interactive practice exercise for reading and listening question-type
   pages. A set is a list of `units` (see PracticeUnit in
   ../data/reading-practice.ts): each unit is one real passage (or, for
   listening, one real audio segment) immediately followed by that
   passage's own questions, so students always read/hear the material the
   question was actually written against, right next to it. Every unit is
   checked on its own ("Check answers"); explanations, evidence and (for
   listening) the transcript appear once that unit is checked. Inherits the
   ambient --skill / --skill-tint variables (reading coral / listening's
   own accent). Listening units additionally carry an optional `segment`
   (see ListeningPracticeSegment in ../data/listening-practice.ts): one
   audio clip, attribution, transcript and reference image(s), rendered by
   PracticeSegmentAudio below. */

interface Props {
  set: PracticeSet;
}

function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** A small self-contained audio clip player for a listening unit's segment:
    native controls, seeks to startSeconds on load, pauses at endSeconds
    (further seeking stays allowed, same "drill" behaviour as the Listening
    Trainer's player in TestPlayer.tsx). Shown once, above that unit's
    questions. */
function PracticeSegmentAudio({ segment }: { segment: NonNullable<PracticeUnit['segment']> }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(segment.src ? 'loading' : 'error');

  function handleLoadedMetadata(el: HTMLAudioElement) {
    setStatus('ready');
    if (segment.startSeconds != null) el.currentTime = segment.startSeconds;
  }

  function handleTimeUpdate(el: HTMLAudioElement) {
    if (segment.endSeconds != null && el.currentTime >= segment.endSeconds) el.pause();
  }

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-surface-alt">
      {segment.images && segment.images.length > 0 && (
        <div className="flex flex-wrap gap-3 border-b border-border bg-white p-3">
          {segment.images.map((img, i) => (
            <img
              key={i}
              src={asset(img.src)}
              alt={img.alt}
              className="max-h-64 rounded-lg border border-border object-contain"
            />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        {segment.src && (
          <audio
            controls
            controlsList="nodownload noplaybackrate"
            preload="metadata"
            src={asset(segment.src)}
            className="h-10 w-full min-w-0 shrink-0 sm:w-auto sm:flex-1"
            aria-label={segment.source ?? 'Listening recording'}
            onLoadedMetadata={(e) => handleLoadedMetadata(e.currentTarget)}
            onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget)}
            onError={() => setStatus('error')}
          />
        )}
        {status === 'error' && <span className="text-xs text-error">Recording unavailable.</span>}
        {segment.source && (
          <span className="shrink-0 text-xs font-semibold text-ink-muted sm:text-right">{segment.source}</span>
        )}
      </div>
      {segment.startSeconds != null && (
        <p className="px-3 pb-2 text-xs text-ink-muted">
          This clip covers {fmtClock(segment.startSeconds)} to {fmtClock(segment.endSeconds ?? segment.startSeconds)}{' '}
          of the full recording.
        </p>
      )}
    </div>
  );
}

/** The real source passage(s) a unit's questions are drawn from, shown as
    one scrollable block with its own sticky mini header (title + source
    line) so the student can always see what they're reading, and a
    "Collapse passage" control for once they no longer need it in view.
    `html` is used instead of `paragraphs` for the rare passage that is
    really a table or diagram image rather than running text. */
function UnitPassage({ passages }: { passages: NonNullable<PracticeUnit['passages']> }) {
  const [collapsed, setCollapsed] = useState(false);
  const main = passages[0]!;

  return (
    <div className="border-b border-border bg-surface p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {main.title && <p className="truncate font-display text-sm font-bold text-ink">{main.title}</p>}
          <p className="truncate text-xs text-ink-muted">{main.label}</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-[var(--skill)] hover:text-ink"
        >
          {collapsed ? 'Expand passage ↓' : 'Collapse passage ↑'}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-3 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-surface-alt">
          <div className="sticky top-0 z-10 border-b border-border bg-surface-alt/95 px-4 py-2 backdrop-blur sm:px-5">
            <p className="truncate font-display text-sm font-bold text-ink">{main.title || main.label}</p>
            {main.title && <p className="truncate text-xs text-ink-muted">{main.label}</p>}
          </div>
          <div className="p-4 text-sm leading-relaxed text-ink sm:p-5 [&_img]:mx-auto [&_img]:max-w-full [&_img]:rounded-lg [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2">
            {passages.map((p, idx) => (
              <div key={idx} className={idx > 0 ? 'mt-5 border-t border-border pt-4' : ''}>
                {idx > 0 && p.title && <p className="mb-2 font-display text-sm font-bold text-ink">{p.title}</p>}
                {p.html ? (
                  <div dangerouslySetInnerHTML={{ __html: p.html }} />
                ) : (
                  p.paragraphs?.map((para, i) => (
                    <p key={i} className="mb-3 last:mb-0">
                      {para}
                    </p>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
  if (p >= 0.8) return 'Excellent work, almost perfect! 🌟';
  if (p >= 0.6) return 'Good job! Review the explanations you missed and go again. 💪';
  if (p >= 0.4) return 'Getting there. Reread the strategy above and try again. 📖';
  return 'Tough round! Study the explanations, then hit Try again. 🔄';
}

interface UnitState {
  drafts: string[];
  checked: boolean;
}

function emptyUnitState(unit: PracticeUnit): UnitState {
  return { drafts: unit.questions.map(() => ''), checked: false };
}

function UnitBlock({
  unit,
  state,
  startIndex,
  selectNoun,
  onDraft,
  onCheck,
  onReset,
}: {
  unit: PracticeUnit;
  state: UnitState;
  startIndex: number;
  selectNoun: string;
  onDraft: (qi: number, value: string) => void;
  onCheck: () => void;
  onReset: () => void;
}) {
  const selectNounTitle = selectNoun.charAt(0).toUpperCase() + selectNoun.slice(1);
  const locked = state.checked;
  const answeredCount = state.drafts.filter((d) => d.trim() !== '').length;
  const correctCount = unit.questions.filter((q, qi) => isRight(q, state.drafts[qi]!)).length;

  return (
    <div className="border-b border-border last:border-b-0">
      {unit.passages && unit.passages.length > 0 && <UnitPassage passages={unit.passages} />}
      {unit.segment && (
        <div className="border-b border-border bg-surface p-4 sm:p-6">
          <PracticeSegmentAudio segment={unit.segment} />
        </div>
      )}

      <form
        className="space-y-4 bg-surface-alt p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!locked) onCheck();
        }}
      >
        {unit.intro && <p className="text-sm text-ink-muted">{unit.intro}</p>}

        {unit.questions.map((q, qi) => {
          const g = state.drafts[qi]!;
          const right = locked && isRight(q, g);

          return (
            <div
              key={qi}
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
                  {locked ? (right ? '✓' : '✗') : startIndex + qi + 1}
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
                    } else if (chosen) {
                      cls = 'border-[var(--skill)] bg-[var(--skill-tint)] text-ink font-semibold shadow-card';
                    }
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={locked}
                        onClick={() => onDraft(qi, opt.value)}
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
                    value={g}
                    disabled={locked}
                    onChange={(e) => onDraft(qi, e.target.value)}
                    aria-label={`${selectNoun} for ${q.prompt}`}
                    className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
                      locked
                        ? right
                          ? 'border-success bg-success-tint text-success'
                          : 'border-error bg-error-tint text-error'
                        : 'border-border bg-surface focus:border-[var(--skill,var(--color-brand))] focus:outline-none'
                    }`}
                  >
                    <option value="" disabled>
                      Choose {selectNoun}…
                    </option>
                    {q.options!.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label ?? `${selectNounTitle} ${opt.value}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mt-3 pl-11">
                  <input
                    type="text"
                    value={g}
                    disabled={locked}
                    onChange={(e) => onDraft(qi, e.target.value)}
                    placeholder="Type your answer…"
                    aria-label={`Answer to question ${startIndex + qi + 1}`}
                    className={`w-56 rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
                      locked
                        ? right
                          ? 'border-success bg-success-tint text-success'
                          : 'border-error bg-error-tint text-error line-through'
                        : 'border-border bg-surface focus:border-[var(--skill,var(--color-brand))] focus:outline-none'
                    }`}
                  />
                </div>
              )}

              {locked && (
                <div
                  className={`pq-in ml-11 mt-3 rounded-xl border-l-4 px-4 py-3 text-sm ${
                    right ? 'border-success bg-success-tint' : 'border-error bg-error-tint'
                  }`}
                >
                  {right ? (
                    <p>
                      <strong className="text-success">🎉 {PRAISE[qi % PRAISE.length]}</strong> {q.explanation}
                    </p>
                  ) : (
                    <p>
                      <strong className="text-error">💡 Not quite. The answer is “{answerLabel(q)}”.</strong>{' '}
                      {q.explanation}
                    </p>
                  )}
                  {q.source && <p className="mt-1 text-xs text-ink-muted">Source: {q.source}</p>}
                </div>
              )}
            </div>
          );
        })}

        {/* Transcript for this unit's audio, offered once the unit is
            checked so students answer from listening first. */}
        {locked && unit.segment?.transcriptHtml && (
          <details className="rounded-xl border border-border bg-surface p-4">
            <summary className="cursor-pointer font-display text-sm font-bold text-ink">
              Transcript{unit.segment.source ? ` · ${unit.segment.source}` : ''}
            </summary>
            <div
              className="mt-3 max-h-72 overflow-y-auto text-sm leading-relaxed text-ink-muted [&_.transcript-note]:mb-2 [&_.transcript-note]:text-xs [&_.transcript-note]:italic [&_.ts]:mr-1 [&_.ts]:font-mono [&_.ts]:text-xs [&_.ts]:text-ink-muted"
              dangerouslySetInnerHTML={{ __html: unit.segment.transcriptHtml }}
            />
          </details>
        )}

        {locked ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-4 py-3 text-sm">
            <span className="font-display font-bold text-ink">
              {correctCount} / {unit.questions.length} correct
            </span>
            <button
              type="button"
              onClick={onReset}
              className="font-semibold text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Try this passage again ↺
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-sm text-ink-muted">
              {answeredCount} of {unit.questions.length} answered
            </span>
            <button
              type="submit"
              disabled={answeredCount === 0}
              className="rounded-full bg-[var(--skill,var(--color-brand))] px-6 py-2 font-display text-sm font-bold text-white transition-transform hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              Check answers ✓
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default function PracticeQuiz({ set }: Props) {
  /* 'select' questions were built for Matching Headings, where the dropdown
     picks a paragraph. Matching Sentence Endings reuses the same control to
     pick an ending, so the noun is configurable and defaults to the original. */
  const selectNoun = set.selectNoun ?? 'paragraph';

  const [units, setUnits] = useState<UnitState[]>(() => set.units.map(emptyUnitState));

  const total = set.units.reduce((n, u) => n + u.questions.length, 0);
  const checkedQuestions = units.reduce((n, s, i) => (s.checked ? n + set.units[i]!.questions.length : n), 0);
  const correct = units.reduce(
    (n, s, i) => (s.checked ? n + set.units[i]!.questions.filter((q, qi) => isRight(q, s.drafts[qi]!)).length : n),
    0,
  );
  const allDone = units.every((s) => s.checked);

  function setDraft(unitIndex: number, qi: number, value: string) {
    setUnits((prev) =>
      prev.map((s, i) => (i === unitIndex ? { ...s, drafts: s.drafts.map((d, j) => (j === qi ? value : d)) } : s)),
    );
  }

  function checkUnit(unitIndex: number) {
    setUnits((prev) => prev.map((s, i) => (i === unitIndex ? { ...s, checked: true } : s)));
  }

  function resetUnit(unitIndex: number) {
    setUnits((prev) => prev.map((s, i) => (i === unitIndex ? emptyUnitState(set.units[i]!) : s)));
  }

  function resetAll() {
    setUnits(set.units.map(emptyUnitState));
  }

  let startIndex = 0;

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
          aria-valuenow={checkedQuestions}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Questions checked"
        >
          <div
            className="h-full rounded-full bg-white transition-[width] duration-500"
            style={{ width: `${(checkedQuestions / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Units: each one real passage (or audio segment) immediately
          followed by its own questions and its own Check answers. */}
      {set.units.map((unit, unitIndex) => {
        const props = {
          unit,
          state: units[unitIndex]!,
          startIndex,
          selectNoun,
          onDraft: (qi: number, value: string) => setDraft(unitIndex, qi, value),
          onCheck: () => checkUnit(unitIndex),
          onReset: () => resetUnit(unitIndex),
        };
        startIndex += unit.questions.length;
        return <UnitBlock key={unitIndex} {...props} />;
      })}

      {/* Score card, once every unit has been checked. */}
      {allDone && (
        <div className="pq-pop m-4 rounded-xl bg-gradient-to-r from-[var(--color-brand)] to-[var(--skill,var(--color-brand-hover))] p-6 text-center text-white shadow-card-hover sm:m-6">
          <p className="font-display text-4xl font-extrabold">
            {correct} / {total}
          </p>
          <p className="mt-1 text-sm text-white/90">{scoreMessage(correct, total)}</p>
          <button
            type="button"
            onClick={resetAll}
            className="mt-4 rounded-full bg-white px-6 py-2 font-display text-sm font-bold text-brand transition-transform hover:-translate-y-0.5"
          >
            Try again ↺
          </button>
        </div>
      )}
    </div>
  );
}
