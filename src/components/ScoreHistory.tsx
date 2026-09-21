import { useEffect, useState } from 'react';
import { getAttempts, onProgressChange, resetProgress, type TestAttempt } from '../lib/progress';
import { ALL_TESTS } from '../data/tests';
import { useT } from '../lib/i18n/react';

interface Row {
  testId: string;
  attempt: TestAttempt;
}

function testTitle(id: string): string {
  return ALL_TESTS.find((t) => t.id === id)?.title ?? id;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/* Single-series band-over-time line: brand hue (validated vs light surface),
   2px line, 8px markers, recessive grid, hover tooltip per point, y = 4–9. */
function BandChart({ rows, skill }: { rows: Row[]; skill: 'reading' | 'listening' }) {
  const { t, tn } = useT();
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
  // Clamp to the plotted range: bands can now come back below 4 (e.g. 3.5), and
  // an unclamped point would render below the axis.
  const y = (band: number) =>
    PAD.top + innerH - ((Math.max(yMin, Math.min(yMax, band)) - yMin) / (yMax - yMin)) * innerH;

  const path = rows.map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(r.attempt.band).toFixed(1)}`).join(' ');
  const gridBands = [5, 6, 7, 8, 9];

  return (
    <figure className="mt-6 overflow-x-auto">
      <figcaption className="mb-2 text-sm font-semibold">{t('Estimated band over attempts')}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={tn(rows.length, {
          one: 'Band score across {n} attempt, from {from} to {to}',
          other: 'Band score across {n} attempts, from {from} to {to}',
        }, { from: rows[0]!.attempt.bandLabel, to: rows[rows.length - 1]!.attempt.bandLabel })}
        className="w-full max-w-xl"
        onMouseLeave={() => setHover(null)}
      >
        {gridBands.map((b) => (
          <g key={b}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(b)}
              y2={y(b)}
              stroke="var(--color-border)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(b) + 3.5}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-ink-muted)"
            >
              {b}
            </text>
          </g>
        ))}
        <path
          d={path}
          fill="none"
          stroke={`var(--color-${skill})`}
          strokeWidth="2"
          strokeLinejoin="round"
          pathLength={1}
          className="band-chart-path"
        />
        {rows.map((r, i) => (
          <g key={i} className="band-chart-point" style={{ animationDelay: `${0.5 + i * 0.06}s` }}>
            {/* invisible enlarged hit target */}
            <circle
              cx={x(i)}
              cy={y(r.attempt.band)}
              r="12"
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            <circle
              cx={x(i)}
              cy={y(r.attempt.band)}
              r="4"
              fill={`var(--color-${skill})`}
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
              const ty = y(r.attempt.band);
              const above = ty > 60;
              return (
                <g transform={`translate(${tx},${above ? ty - 12 : ty + 12})`}>
                  <rect
                    x="-62"
                    y={above ? -34 : 0}
                    width="124"
                    height="34"
                    rx="6"
                    fill="var(--color-ink)"
                    opacity="0.92"
                  />
                  <text x="0" y={above ? -21 : 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
                    {t('Band {label} · {raw}/{total}', { label: r.attempt.bandLabel, raw: r.attempt.raw, total: r.attempt.total })}
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

export default function ScoreHistory({
  skill = 'reading',
  showReset = true,
}: {
  skill?: 'reading' | 'listening';
  showReset?: boolean;
}) {
  const { t } = useT();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    // Drills are single-passage practice, not full exams — a band estimate
    // only means something over the full 40-question mix, so keep them out
    // of the score history and band trend.
    const load = () =>
      setRows(
        getAttempts().filter(
          (r) => r.attempt.kind !== 'drill' && (r.attempt.skill ?? 'reading') === skill,
        ),
      );
    load();
    return onProgressChange(load);
  }, [skill]);

  if (rows === null) return null; // pre-hydration

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface-alt p-8 text-center text-ink-muted">
        <p className="font-display font-semibold text-ink">{t('No attempts yet')}</p>
        <p className="mt-1 text-sm">{t('Finish a {skill} test and your scores will appear here.', { skill })}</p>
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
              <th className="px-4 py-2.5 font-semibold">{t('Test')}</th>
              <th className="px-4 py-2.5 font-semibold">{t('Score')}</th>
              <th className="px-4 py-2.5 font-semibold">{t('Band')}</th>
              <th className="px-4 py-2.5 font-semibold">{t('Time used')}</th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r, i) => (
              <tr key={i} className="border-t border-border transition-colors hover:bg-surface-alt">
                <td className="px-4 py-2.5 text-ink-muted">{fmtDate(r.attempt.at)}</td>
                <td className="px-4 py-2.5 font-medium">{testTitle(r.testId)}</td>
                <td className="px-4 py-2.5">
                  {r.attempt.raw} / {r.attempt.total}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-bold text-brand">
                    {r.attempt.bandLabel}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-ink-muted">
                  {t('{minutes}m {seconds}s', { minutes: Math.floor(r.attempt.secondsUsed / 60), seconds: r.attempt.secondsUsed % 60 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BandChart rows={rows} skill={skill} />

      {showReset && <button
        type="button"
        onClick={() => {
          if (window.confirm(t('Clear all saved progress and scores on this device?'))) {
            resetProgress();
            setRows([]);
          }
        }}
        className="mt-6 text-xs font-semibold text-ink-muted underline underline-offset-2 hover:text-error"
      >
        {t('Reset all progress')}
      </button>}
    </div>
  );
}
