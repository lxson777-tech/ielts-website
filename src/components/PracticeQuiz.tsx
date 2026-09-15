import { Fragment, useEffect, useRef, useState } from 'react';
import type { PracticeQuestion, PracticeSet } from '../data/reading-practice';

/** Base-prefixed URL for images stored under /public. */
const asset = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${p}`;

/* Interactive practice exercise for reading and listening question-type
   pages. Choice questions answer on click; text questions on Check/Enter.
   Wrong answers reveal the correct answer plus an explanation. Inherits the
   ambient --skill / --skill-tint variables (reading coral / listening's own
   accent). Listening sets additionally carry an optional `segments` array
   (see ListeningPracticeSegment in ../data/listening-practice.ts): one audio
   clip, attribution, transcript and reference image(s) per source group,
   rendered above that group's questions by PracticeSegmentAudio below. */

interface Props {
  set: PracticeSet;
}

function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** A small self-contained audio clip player for one segment of a listening
    practice set: native controls, seeks to startSeconds on load, pauses at
    endSeconds (further seeking stays allowed, same "drill" behaviour as the
    Listening Trainer's player in TestPlayer.tsx). Shown once, right above
    the first question that belongs to this segment. */
function PracticeSegmentAudio({ segment }: { segment: NonNullable<PracticeSet['segments']>[number] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(segment.src ? 'loading' : 'error');

  function handleLoadedMetadata() {
    setStatus('ready');
    const el = audioRef.current;
    if (el && segment.startSeconds != null) el.currentTime = segment.startSeconds;
  }

  // The browser can fire the native `loadedmetadata` event before React
  // finishes hydrating this island (a cached recording loads almost
  // instantly), so the seek-to-startSeconds handler above never runs. Catch
  // that case on mount by checking readyState directly instead of relying
  // solely on the event.
  useEffect(() => {
    const el = audioRef.current;
    if (el && el.readyState >= 1) handleLoadedMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTimeUpdate() {
    const el = audioRef.current;
    if (el && segment.endSeconds != null && el.currentTime >= segment.endSeconds) el.pause();
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
            ref={audioRef}
            controls
            controlsList="nodownload noplaybackrate"
            preload="metadata"
            src={asset(segment.src)}
            className="h-10 w-full min-w-0 shrink-0 sm:w-auto sm:flex-1"
            aria-label={segment.source ?? 'Listening recording'}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
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

export default function PracticeQuiz({ set }: Props) {
  /* 'select' questions were built for Matching Headings, where the dropdown
     picks a paragraph. Matching Sentence Endings reuses the same control to
     pick an ending, so the noun is configurable and defaults to the original. */
  const selectNoun = set.selectNoun ?? 'paragraph';
  const selectNounTitle = selectNoun.charAt(0).toUpperCase() + selectNoun.slice(1);
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

      {/* Real source passage(s)/table/diagram the questions below are drawn
          from. Shown as scrollable boxes so long passages don't push the
          questions far down the page. `html` is used for the rare group
          that is a real table or diagram image rather than running text. */}
      {set.passages && set.passages.length > 0 && (
        <div className="space-y-4 border-b border-border bg-surface p-4 sm:p-6">
          {set.passages.map((p, idx) => (
            <div key={idx}>
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-ink-muted">{p.label}</p>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-surface-alt p-4 text-sm leading-relaxed text-ink [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_img]:mx-auto [&_img]:max-w-full [&_img]:rounded-lg">
                {p.title && <p className="mb-2 font-display text-sm font-bold text-ink">{p.title}</p>}
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
            </div>
          ))}
        </div>
      )}

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
          const segment = q.segment != null ? set.segments?.[q.segment] : undefined;
          const isNewSegment = segment && q.segment !== set.questions[i - 1]?.segment;

          return (
            <Fragment key={i}>
              {isNewSegment && <PracticeSegmentAudio segment={segment} />}
              <div
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
                      <strong className="text-error">💡 Not quite. The answer is “{answerLabel(q)}”.</strong>{' '}
                      {q.explanation}
                    </p>
                  )}
                  {q.source && <p className="mt-1 text-xs text-ink-muted">Source: {q.source}</p>}
                </div>
              )}
              </div>
            </Fragment>
          );
        })}

        {/* Transcripts for any audio segment(s) above, offered once the set
            is finished so students answer from listening first. */}
        {done &&
          set.segments?.some((s) => s.transcriptHtml) &&
          set.segments.map(
            (s, i) =>
              s.transcriptHtml && (
                <details key={i} className="rounded-xl border border-border bg-surface p-4">
                  <summary className="cursor-pointer font-display text-sm font-bold text-ink">
                    Transcript{s.source ? ` · ${s.source}` : ''}
                  </summary>
                  <div
                    className="mt-3 max-h-72 overflow-y-auto text-sm leading-relaxed text-ink-muted [&_.ts]:mr-1 [&_.ts]:font-mono [&_.ts]:text-xs [&_.ts]:text-ink-muted [&_.transcript-note]:mb-2 [&_.transcript-note]:text-xs [&_.transcript-note]:italic"
                    dangerouslySetInnerHTML={{ __html: s.transcriptHtml }}
                  />
                </details>
              ),
          )}

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
