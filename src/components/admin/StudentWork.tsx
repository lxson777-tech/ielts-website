/* One student's work, inside their row on the admin panel: every Reading and
   Listening test they took, opened question by question (the question, their
   answer, the correct answer, right or wrong, the explanation), and every
   essay they wrote with its feedback.

   The data comes from public.admin_student_work, which the database refuses
   to anyone who is not an admin (src/lib/admin.ts). The questions come from
   the site's own published file per test, fetched only when an attempt is
   opened. English only on purpose, like the rest of the admin page. */

import { useEffect, useMemo, useRef, useState } from 'react';
import PromptWithCharts from '../PromptWithCharts';
import type { EssayPrompt } from '../../lib/writing/schema';
import {
  attemptSummary,
  durationLabel,
  essayBands,
  fetchStudentWork,
  filterReview,
  loadSiteTest,
  reviewRows,
  type AdminStudentWork,
  type AdminWorkTest,
  type AdminWorkWriting,
  type AttemptSummary,
  type ReviewFilter,
  type ReviewRow,
} from '../../lib/admin';

type View = { kind: 'list' } | { kind: 'test'; eventId: string } | { kind: 'essay'; index: number };

/** How many lines each list shows before "Show all". */
const FIRST_LINES = 6;

function dayLabel(iso: string | null | undefined): string {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

function dateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function bandText(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : null;
}

function scoreText(s: AttemptSummary): string {
  return s.raw !== null && s.total !== null ? `${s.raw}/${s.total}` : 'No score';
}

function kindText(s: AttemptSummary): string {
  const paper = s.paper === 'listening' ? 'Listening' : 'Reading';
  return s.kind === 'drill' ? `${paper} drill` : paper;
}

function taskText(w: AdminWorkWriting): string {
  return w.task === 'task1' ? 'Writing Task 1' : w.task === 'task2' ? 'Writing Task 2' : 'Writing';
}

function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg className="admin-work-chev" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={back ? 'm12 5-5 5 5 5' : 'm8 5 5 5-5 5'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function StudentWork({ userId, onLoaded }: { userId: string; onLoaded?: (ok: boolean) => void }) {
  const [work, setWork] = useState<AdminStudentWork | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [lastOpened, setLastOpened] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setWork(null);
    setError(null);
    void fetchStudentWork(userId).then((result) => {
      if (cancelled) return;
      if (result.ok) setWork(result.work);
      else setError(result.message);
      onLoaded?.(result.ok);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const tests = useMemo(() => (work?.tests ?? []).map((t) => ({ raw: t, summary: attemptSummary(t) })), [work]);

  function open(next: View, key: string) {
    setLastOpened(key);
    setView(next);
  }

  if (error) {
    return (
      <section className="admin-work" aria-label="Tests and writing">
        <h3>Tests and writing</h3>
        <p className="admin-note is-flush">Couldn’t load this student’s work: {error}</p>
      </section>
    );
  }

  if (!work) {
    return (
      <section className="admin-work" aria-label="Tests and writing" aria-busy="true">
        <h3>Tests and writing</h3>
        <p className="admin-work-loading">
          <span className="admin-spinner is-small" aria-hidden="true" />
          Loading their tests and essays…
        </p>
      </section>
    );
  }

  if (view.kind === 'test') {
    const found = tests.find((t) => t.summary.eventId === view.eventId);
    if (found) return <TestAttempt test={found.raw} summary={found.summary} onBack={() => setView({ kind: 'list' })} />;
  }
  if (view.kind === 'essay') {
    const essay = work.writing[view.index];
    if (essay) return <EssayView essay={essay} onBack={() => setView({ kind: 'list' })} />;
  }

  return (
    <div className="admin-work">
      <WorkList
        title="Tests"
        empty="No Reading or Listening tests yet."
        count={tests.length}
        items={tests.map(({ summary: s }) => ({
          key: `test:${s.eventId}`,
          date: dayLabel(s.at),
          kind: kindText(s),
          title: s.title,
          meta: [scoreText(s), bandText(s.band) ? `Band ${bandText(s.band)}` : null].filter(Boolean).join(' · '),
          onOpen: () => open({ kind: 'test', eventId: s.eventId }, `test:${s.eventId}`),
        }))}
        focusKey={lastOpened}
      />
      <WorkList
        title="Writing"
        empty="No essays yet."
        count={work.writing.length}
        items={work.writing.map((w, index) => ({
          key: `essay:${index}`,
          date: dayLabel(w.at),
          kind: taskText(w),
          title: w.promptTitle || w.promptId,
          meta: [typeof w.wordCount === 'number' ? `${w.wordCount} words` : null, bandText(w.overallBand) ? `Band ${bandText(w.overallBand)}` : null]
            .filter(Boolean)
            .join(' · '),
          onOpen: () => open({ kind: 'essay', index }, `essay:${index}`),
        }))}
        focusKey={lastOpened}
      />
      <SpeakingLine speaking={work.speaking} />
    </div>
  );
}

interface WorkLine {
  key: string;
  date: string;
  kind: string;
  title: string;
  meta: string;
  onOpen: () => void;
}

function WorkList({ title, empty, count, items, focusKey }: { title: string; empty: string; count: number; items: WorkLine[]; focusKey: string | null }) {
  const focusIndex = focusKey ? items.findIndex((i) => i.key === focusKey) : -1;
  const [all, setAll] = useState(focusIndex >= FIRST_LINES);
  const shown = all ? items : items.slice(0, FIRST_LINES);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  // Coming back from an opened attempt puts the keyboard on the line it was opened from.
  useEffect(() => {
    if (focusKey) refs.current.get(focusKey)?.focus({ preventScroll: false });
  }, [focusKey]);
  const headingId = `admin-work-${title.toLowerCase()}`;
  return (
    <section className="admin-work-section" aria-labelledby={headingId}>
      <h3 id={headingId}>
        {title}
        {count > 0 && <span className="admin-work-count">{count}</span>}
      </h3>
      {items.length === 0 ? (
        <p className="admin-note is-flush">{empty}</p>
      ) : (
        <>
          <ul className="admin-work-list">
            {shown.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className="admin-work-line"
                  onClick={item.onOpen}
                  ref={(el) => {
                    if (el) refs.current.set(item.key, el);
                    else refs.current.delete(item.key);
                  }}
                >
                  <span className="admin-work-date">{item.date}</span>
                  <span className="admin-work-what">
                    <span className="admin-work-kind">{item.kind}</span>
                    <span className="admin-work-title">{item.title}</span>
                  </span>
                  <span className="admin-work-meta">{item.meta}</span>
                  <Chevron />
                </button>
              </li>
            ))}
          </ul>
          {items.length > FIRST_LINES && (
            <button type="button" className="admin-work-more" onClick={() => setAll((on) => !on)} aria-expanded={all}>
              {all ? 'Show fewer' : `Show all ${items.length}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function SpeakingLine({ speaking }: { speaking: AdminStudentWork['speaking'] }) {
  const bands = speaking.map((s) => s.overallBand).filter((b): b is number => typeof b === 'number');
  const best = bands.length ? Math.max(...bands) : null;
  return (
    <p className="admin-work-speaking">
      <span className="admin-work-speaking-label">Speaking</span>
      {speaking.length === 0
        ? 'No speaking practice yet. Only scores are kept for speaking, no recordings or transcripts.'
        : `${speaking.length === 1 ? '1 scored answer' : `${speaking.length} scored answers`}${best !== null ? `, best band ${best.toFixed(1)}` : ''}. Only scores are kept for speaking, no recordings or transcripts.`}
    </p>
  );
}

/** The heading of an opened attempt or essay, focused when it opens so the
    page reads from the top of it. */
function FocusedHead({ eyebrow, title, meta, onBack }: { eyebrow: string; title: string; meta: string[]; onBack: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);
  return (
    <header className="admin-focus-head">
      <button type="button" className="admin-button is-quiet admin-back" onClick={onBack}>
        <Chevron back />
        Back to all work
      </button>
      <p className="admin-focus-eyebrow">{eyebrow}</p>
      <h3 ref={ref} tabIndex={-1}>
        {title}
      </h3>
      <p className="admin-focus-meta">
        {meta.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </p>
    </header>
  );
}

function TestAttempt({ test, summary: s, onBack }: { test: AdminWorkTest; summary: AttemptSummary; onBack: () => void }) {
  const [site, setSite] = useState<'loading' | 'missing' | Awaited<ReturnType<typeof loadSiteTest>>>(s.hasAnswers ? 'loading' : null);
  const [filter, setFilter] = useState<ReviewFilter>('all');

  useEffect(() => {
    if (!s.hasAnswers) return;
    let cancelled = false;
    void loadSiteTest(s.testId).then((value) => {
      if (!cancelled) setSite(value ?? 'missing');
    });
    return () => {
      cancelled = true;
    };
  }, [s.testId, s.hasAnswers]);

  const rows = useMemo(
    () => (site === 'loading' ? [] : reviewRows(test.event.items ?? [], site === 'missing' ? null : site)),
    [site, test],
  );
  const right = rows.filter((r) => r.correct).length;
  const blank = rows.filter((r) => r.blank).length;
  const wrong = rows.length - right - blank;
  const shown = filterReview(rows, filter);

  const meta = [
    dateTimeLabel(s.at),
    s.raw !== null && s.total !== null ? `Score ${s.raw}/${s.total}` : null,
    bandText(s.band) ? `Band ${bandText(s.band)}` : null,
    durationLabel(s.secondsUsed) ? `Took ${durationLabel(s.secondsUsed)!.replace(/^Under/, 'under')}` : null,
  ].filter((m): m is string => !!m);

  return (
    <div className="admin-work admin-focus">
      <FocusedHead
        eyebrow={`${kindText(s)}${s.retry ? ', second go' : ''}`}
        title={s.title}
        meta={meta}
        onBack={onBack}
      />

      {!s.hasAnswers ? (
        <p className="admin-callout">Answers were not recorded for this attempt, it was taken before answers were saved. Only the score above is known.</p>
      ) : site === 'loading' ? (
        <p className="admin-work-loading">
          <span className="admin-spinner is-small" aria-hidden="true" />
          Loading the questions…
        </p>
      ) : (
        <>
          {site === 'missing' && (
            <p className="admin-callout">The question text couldn’t be loaded, so each question shows its number and the student’s answer only.</p>
          )}
          <div className="admin-review-bar">
            <p className="admin-review-tally">
              <span className="admin-tally is-right">{right} right</span>
              <span className="admin-tally is-wrong">{wrong} wrong</span>
              <span className="admin-tally is-blank">{blank} no answer</span>
            </p>
            <div className="admin-sort" role="group" aria-label="Which questions to show">
              <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                All {rows.length}
              </button>
              <button type="button" aria-pressed={filter === 'wrong'} onClick={() => setFilter('wrong')}>
                Wrong only {rows.length - right}
              </button>
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="admin-note is-flush">Every question was answered correctly.</p>
          ) : (
            <ol className="admin-q-list">
              {shown.map((row) => (
                <QuestionRow key={row.questionId} row={row} paper={s.paper} />
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

function Mark({ row }: { row: ReviewRow }) {
  const state = row.correct ? 'right' : row.blank ? 'blank' : 'wrong';
  const label = row.correct ? 'Right' : row.blank ? 'No answer' : 'Wrong';
  return (
    <span className={`admin-mark is-${state}`} title={label}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        {state === 'right' ? (
          <path d="m5 10.5 3.2 3.2L15 7" strokeLinecap="round" strokeLinejoin="round" />
        ) : state === 'wrong' ? (
          <path d="m6 6 8 8M14 6l-8 8" strokeLinecap="round" />
        ) : (
          <path d="M6 10h8" strokeLinecap="round" />
        )}
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function QuestionRow({ row, paper }: { row: ReviewRow; paper: 'reading' | 'listening' }) {
  const unit = paper === 'listening' ? 'Part' : 'Passage';
  const context = [row.part !== null ? `${unit} ${row.part}` : null, row.typeLabel].filter(Boolean).join(' · ');
  const state = row.correct ? 'right' : row.blank ? 'blank' : 'wrong';
  return (
    <li className={`admin-q is-${state}`} data-question={row.questionId}>
      <div className="admin-q-side">
        <span className="admin-q-num">{row.number ?? '?'}</span>
        <Mark row={row} />
      </div>
      <div className="admin-q-body">
        {context && <p className="admin-q-context">{context}</p>}
        <p className="admin-q-prompt">{row.prompt ?? `Question ${row.questionId}. The question text isn’t available.`}</p>
        <dl className="admin-q-answers">
          <div>
            <dt>Student’s answer</dt>
            <dd className={row.blank ? 'is-blank' : row.correct ? 'is-right' : 'is-wrong'}>{row.blank ? 'No answer' : row.given}</dd>
          </div>
          <div>
            <dt>{row.alternatives.length ? 'Accepted answers' : 'Correct answer'}</dt>
            <dd>{row.alternatives.length ? row.alternatives.join(', ') : row.answer ?? 'Not available'}</dd>
          </div>
        </dl>
        {(row.explanation || row.evidence) && (
          <details className="admin-q-why">
            <summary>Explanation</summary>
            {row.explanation && <p>{row.explanation}</p>}
            {row.evidence && (
              <blockquote>
                <span className="sr-only">From the {paper === 'listening' ? 'recording' : 'passage'}: </span>“{row.evidence}”
              </blockquote>
            )}
          </details>
        )}
      </div>
    </li>
  );
}

function EssayView({ essay: w, onBack }: { essay: AdminWorkWriting; onBack: () => void }) {
  const [prompt, setPrompt] = useState<EssayPrompt | null | 'loading'>('loading');
  useEffect(() => {
    let cancelled = false;
    // The prompt list is loaded only when an essay is opened.
    void import('../../data/writing-prompts')
      .then((mod) => {
        if (!cancelled) setPrompt(mod.getWritingPrompt(w.promptId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setPrompt(null);
      });
    return () => {
      cancelled = true;
    };
  }, [w.promptId]);

  const bands = essayBands(w);
  const report = w.report;
  const meta = [
    dateTimeLabel(w.at),
    typeof w.wordCount === 'number' ? `${w.wordCount} words` : null,
    bandText(w.overallBand) ? `Band ${bandText(w.overallBand)}` : null,
  ].filter((m): m is string => !!m);

  return (
    <div className="admin-work admin-focus">
      <FocusedHead eyebrow={taskText(w)} title={w.promptTitle || w.promptId} meta={meta} onBack={onBack} />

      <section className="admin-essay-part" aria-label="The task">
        <h4>The task</h4>
        {prompt === 'loading' ? (
          <p className="admin-note is-flush">Loading the task…</p>
        ) : prompt ? (
          <PromptWithCharts as="div" className="admin-essay-task" html={prompt.promptHtml} hint={false} />
        ) : (
          <p className="admin-note is-flush">This task is no longer in the list of writing questions.</p>
        )}
      </section>

      <section className="admin-essay-part" aria-label="The essay">
        <h4>The essay</h4>
        {w.essay?.trim() ? <div className="admin-essay-text">{w.essay}</div> : <p className="admin-note is-flush">The essay text was not saved for this attempt.</p>}
      </section>

      <section className="admin-essay-part" aria-label="Feedback">
        <h4>Feedback</h4>
        {bands.length > 0 && (
          <ul className="admin-essay-bands">
            {bands.map((b) => (
              <li key={b.key}>
                <span className="admin-essay-band-head">
                  <span>{b.label}</span>
                  <span className="admin-essay-band">{bandText(b.band) ?? 'None'}</span>
                </span>
                {b.comment && <span className="admin-essay-comment">{b.comment}</span>}
                {b.tip && <span className="admin-essay-tip">Next step: {b.tip}</span>}
              </li>
            ))}
          </ul>
        )}
        {report ? (
          <>
            <FeedbackList title="What went well" items={report.strengths} />
            <FeedbackList title="To improve" items={report.improvements} />
            <FeedbackList title="Plan" items={report.actionPlan} />
          </>
        ) : (
          <p className="admin-note is-flush">Only the bands were saved for this essay, not the written feedback.</p>
        )}
        {w.live === false && <p className="admin-note">Marked by the practice grader, not the AI examiner.</p>}
      </section>
    </div>
  );
}

function FeedbackList({ title, items }: { title: string; items?: string[] }) {
  const list = (items ?? []).filter((s) => typeof s === 'string' && s.trim());
  if (list.length === 0) return null;
  return (
    <div className="admin-essay-list">
      <h5>{title}</h5>
      <ul>
        {list.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
