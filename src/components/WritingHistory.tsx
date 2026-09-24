import SmoothReveal from './SmoothReveal';
import { Fragment, useEffect, useState } from 'react';
import { getWritingAttempts, onProgressChange, type WritingAttempt } from '../lib/progress';
import { WRITING_PROMPTS } from '../data/writing-prompts';
import { CRITERIA, criterionLabel } from '../lib/writing/schema';
import { WRITING_BAND_GUIDES, guideFor } from '../data/band-guides';
import { useT } from '../lib/i18n/react';
import BandReport from './BandReport';
import ExplainResult from './tutor/ExplainResult';

interface Row {
  promptId: string;
  attempt: WritingAttempt;
}

/** The title to show for a row: the title saved at grading time (so history
    reads correctly even if the prompt is later renamed or removed from the
    pool), falling back to a live lookup by id, then the id itself for
    attempts recorded before promptTitle existed and whose prompt is gone. */
function rowTitle(r: Row): string {
  return r.attempt.promptTitle ?? WRITING_PROMPTS.find((p) => p.id === r.promptId)?.title ?? r.promptId;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/* Single-series band-over-time line, same visual language as ScoreHistory's
   BandChart but plotting overallBand instead of a raw-score band. */
function BandChart({ rows }: { rows: Row[] }) {
  const { t } = useT();
  const [hover, setHover] = useState<number | null>(null);
  if (rows.length < 2) return null;

  const W = 560;
  const H = 180;
  const PAD = { top: 16, right: 16, bottom: 24, left: 34 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const yMin = 4;
  const yMax = 9;

  const x = (i: number) => PAD.left + (rows.length === 1 ? innerW / 2 : (i / (rows.length - 1)) * innerW);
  const y = (band: number) => PAD.top + innerH - ((band - yMin) / (yMax - yMin)) * innerH;

  const path = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(r.attempt.overallBand).toFixed(1)}`)
    .join(' ');
  const gridBands = [5, 6, 7, 8, 9];

  return (
    <figure className="mt-6 overflow-x-auto">
      <figcaption className="mb-2 text-sm font-semibold">{t('Estimated band over attempts')}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('Writing band across {count} attempts, from {from} to {to}', {
          count: rows.length,
          from: rows[0]!.attempt.overallBand,
          to: rows[rows.length - 1]!.attempt.overallBand,
        })}
        className="w-full max-w-xl"
        onMouseLeave={() => setHover(null)}
      >
        {gridBands.map((b) => (
          <g key={b}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(b)} y2={y(b)} stroke="var(--color-border)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(b) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-ink-muted)">
              {b}
            </text>
          </g>
        ))}
        <path
          d={path}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2"
          strokeLinejoin="round"
          pathLength={1}
          className="band-chart-path"
        />
        {rows.map((r, i) => (
          <g key={i} className="band-chart-point" style={{ animationDelay: `${0.5 + i * 0.06}s` }}>
            <circle cx={x(i)} cy={y(r.attempt.overallBand)} r="12" fill="transparent" onMouseEnter={() => setHover(i)} />
            <circle
              cx={x(i)}
              cy={y(r.attempt.overallBand)}
              r="4"
              fill="var(--color-brand)"
              stroke="var(--color-surface)"
              strokeWidth="2"
              pointerEvents="none"
            />
          </g>
        ))}
        {hover !== null && (
          <g pointerEvents="none">
            {(() => {
              const r = rows[hover]!;
              const tx = Math.min(Math.max(x(hover), PAD.left + 60), W - PAD.right - 60);
              const ty = y(r.attempt.overallBand);
              const above = ty > 60;
              return (
                <g transform={`translate(${tx},${above ? ty - 12 : ty + 12})`}>
                  <rect x="-62" y={above ? -34 : 0} width="124" height="34" rx="6" fill="var(--color-ink)" opacity="0.92" />
                  <text x="0" y={above ? -21 : 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
                    {t('Band {band}', { band: r.attempt.overallBand.toFixed(1) })}
                  </text>
                  <text x="0" y={above ? -9 : 25} textAnchor="middle" fontSize="9" fill="#fff" opacity="0.75">
                    {fmtDate(r.attempt.at)}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>
    </figure>
  );
}

export default function WritingHistory() {
  const { t } = useT();
  const [rows, setRows] = useState<Row[] | null>(null);
  // Index (within the displayed, newest-first list) of the row whose review
  // panel (essay + AI report) is expanded below it. One at a time keeps the
  // table scannable.
  const [openEssay, setOpenEssay] = useState<number | null>(null);

  useEffect(() => {
    setRows(getWritingAttempts());
    // Stay live: the trainer records the attempt on this same page right
    // after grading, and this history sits directly below the report.
    return onProgressChange(() => setRows(getWritingAttempts()));
  }, []);

  if (rows === null) return null; // pre-hydration

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface-alt p-8 text-center text-ink-muted">
        <p className="font-display font-semibold text-ink">{t('No attempts yet')}</p>
        <p className="mt-1 text-sm">{t('Check an essay and your scores will appear here.')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 font-semibold">{t('Date')}</th>
              <th className="px-4 py-2.5 font-semibold">{t('Task')}</th>
              <th className="px-4 py-2.5 font-semibold">{t('Words')}</th>
              <th className="px-4 py-2.5 font-semibold">{t('Band')}</th>
              <th className="px-4 py-2.5 font-semibold">
                <span className="sr-only">{t('Essay')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r, i) => {
              const canOpen = Boolean(r.attempt.essay || r.attempt.report);
              return (
                <Fragment key={i}>
                  <tr className="border-t border-border transition-colors hover:bg-surface-alt">
                    <td className="px-4 py-2.5 text-ink-muted">{fmtDate(r.attempt.at)}</td>
                    <td className="px-4 py-2.5 font-medium">{rowTitle(r)}</td>
                    <td className="px-4 py-2.5">{r.attempt.wordCount}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-bold text-brand">
                        {r.attempt.overallBand.toFixed(1)}
                      </span>
                      {!r.attempt.live && <span className="ml-1.5 text-xs text-ink-muted">{t('(sample)')}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {canOpen ? (
                        <button
                          type="button"
                          onClick={() => setOpenEssay(openEssay === i ? null : i)}
                          aria-expanded={openEssay === i}
                          className="whitespace-nowrap text-xs font-semibold text-brand hover:underline"
                        >
                          {openEssay === i ? t('Close') : t('Open')}
                        </button>
                      ) : (
                        // Attempts recorded before essays were saved have nothing to show.
                        <span
                          className="text-xs text-ink-muted"
                          title={t('This attempt was recorded before essays were saved.')}
                        >
                          {t('n/a')}
                        </span>
                      )}
                    </td>
                  </tr>
                  {canOpen && (
                    <tr className="bg-surface-alt/60">
                      <td colSpan={5} className="p-0">
                        <SmoothReveal open={openEssay === i}>
                          <div className="border-t border-border px-4 py-5 sm:px-6">
                            <EssayReviewPanel row={r} onClose={() => setOpenEssay(null)} />
                          </div>
                        </SmoothReveal>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <BandChart rows={rows} />
    </div>
  );
}

/** Expanded under a row: the task, the essay, and — when saved — the full AI
    report rendered exactly as WritingTester shows it right after grading,
    via the same shared <BandReport>. Attempts graded before reports were
    saved (or past the MAX_SAVED_REPORTS cap in progress.ts) fall back to
    the essay text alone with a muted note. */
function EssayReviewPanel({ row, onClose }: { row: Row; onClose: () => void }) {
  const { t } = useT();
  const { attempt } = row;
  const report = attempt.report;
  const task = attempt.task ?? 'task2';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-bold">{rowTitle(row)}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{fmtDate(attempt.at)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-button border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface"
        >
          {t('Close')}
        </button>
      </div>

      {attempt.essay && (
        <div className="rounded-card border border-border bg-surface p-4 shadow-card">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">{t('Your answer')}</p>
          <p className="max-h-80 overflow-y-auto whitespace-pre-wrap text-[0.9rem] leading-relaxed">{attempt.essay}</p>
        </div>
      )}

      {report ? (
        <BandReport
          title={rowTitle(row)}
          overallBand={attempt.overallBand}
          live={report.grader.live}
          offlineWarning={t(
            'The band scores below are illustrative, generated from mechanical signals only, without an AI examiner.',
          )}
          criteria={CRITERIA.map((c) => {
            const score = report.criteria[c.key];
            const guide = guideFor(WRITING_BAND_GUIDES[c.key], score.band);
            return {
              key: c.key,
              label: criterionLabel(c, task),
              band: score.band,
              comment: score.comment,
              tip: score.tip,
              nextBand: score.nextBand,
              guide: guide && task !== 'task1' ? { ...guide, task1Note: undefined } : guide,
            };
          })}
          strengths={report.strengths}
          improvements={report.improvements}
          actionPlan={report.actionPlan}
        >
          <div className="rounded-card border border-border bg-surface p-5 shadow-card">
            <h3 className="font-display font-bold">{t('Mechanics check')}</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <Stat label={t('Words')} value={`${report.mechanics.wordCount}`} bad={report.mechanics.underLength} />
              <Stat label={t('Sentences')} value={`${report.mechanics.sentenceCount}`} />
              <Stat
                label={t('Vocab variety')}
                value={`${Math.round(report.mechanics.lexicalDiversity * 100)}%`}
                bad={report.mechanics.lexicalDiversity < 0.42}
              />
              <Stat
                label={t('Linking words')}
                value={`${report.mechanics.linkingDevices.reduce((a, l) => a + l.count, 0)}`}
                bad={report.mechanics.linkingDevices.length === 0 && report.mechanics.sentenceCount > 3}
              />
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
              {report.mechanics.notes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>

          {report.moments.length > 0 && (
            <div className="rounded-card border border-border bg-surface p-5 shadow-card">
              <h3 className="font-display font-bold">{t('Moments from your essay')}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {report.moments.map((mo, mi) => (
                  <li key={mi}>
                    <span className="italic text-ink-muted">&ldquo;{mo.quote}&rdquo;</span>
                    <span className="block text-ink-muted">· {mo.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </BandReport>
      ) : (
        <p className="text-xs italic text-ink-muted">{t('Graded before comments were saved.')}</p>
      )}

      {/* Any past result can be explained, not only the one just graded. The
          marking is already stored, so this is a cheap tutor turn that reads
          it, never a second grading run. */}
      <ExplainResult
        attempt={{ kind: 'writing', at: attempt.at, promptId: row.promptId }}
        summary={`Estimated band ${attempt.overallBand.toFixed(1)} on ${fmtDate(attempt.at)}`}
      />
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
