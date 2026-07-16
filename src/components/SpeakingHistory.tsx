import { useEffect, useState } from 'react';
import { getSpeakingAttempts, onProgressChange, type SpeakingAttempt } from '../lib/progress';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const MODE_LABEL: Record<SpeakingAttempt['mode'], string> = {
  part1: 'Part 1',
  part2: 'Part 2',
  part3: 'Part 3',
};

/* Band-over-time line, same visual language as ScoreHistory / WritingHistory,
   plotting each speaking attempt's overall band. */
function BandChart({ rows }: { rows: SpeakingAttempt[] }) {
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
  const y = (band: number) =>
    PAD.top + innerH - ((Math.max(yMin, Math.min(yMax, band)) - yMin) / (yMax - yMin)) * innerH;

  const path = rows.map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(r.overallBand).toFixed(1)}`).join(' ');
  const gridBands = [5, 6, 7, 8, 9];

  return (
    <figure className="mt-6 overflow-x-auto">
      <figcaption className="mb-2 text-sm font-semibold">Estimated band over attempts</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Speaking band across ${rows.length} attempts, from ${rows[0]!.overallBand} to ${rows[rows.length - 1]!.overallBand}`}
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
            <circle cx={x(i)} cy={y(r.overallBand)} r="12" fill="transparent" onMouseEnter={() => setHover(i)} />
            <circle
              cx={x(i)}
              cy={y(r.overallBand)}
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
              const ty = y(r.overallBand);
              const above = ty > 60;
              return (
                <g transform={`translate(${tx},${above ? ty - 12 : ty + 12})`}>
                  <rect x="-62" y={above ? -34 : 0} width="124" height="34" rx="6" fill="var(--color-ink)" opacity="0.92" />
                  <text x="0" y={above ? -21 : 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
                    Band {r.overallBand.toFixed(1)}
                  </text>
                  <text x="0" y={above ? -9 : 25} textAnchor="middle" fontSize="9" fill="#fff" opacity="0.75">
                    {fmtDate(r.at)}
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

export default function SpeakingHistory() {
  const [rows, setRows] = useState<SpeakingAttempt[] | null>(null);

  useEffect(() => {
    setRows(getSpeakingAttempts());
    // Stay live: drill attempts are recorded on this same page after grading.
    return onProgressChange(() => setRows(getSpeakingAttempts()));
  }, []);

  if (rows === null) return null; // pre-hydration

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface-alt p-8 text-center text-ink-muted">
        <p className="font-display font-semibold text-ink">No attempts yet</p>
        <p className="mt-1 text-sm">Finish a speaking part and your bands will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 font-semibold">Date</th>
              <th className="px-4 py-2.5 font-semibold">Part</th>
              <th className="px-4 py-2.5 font-semibold">Topic</th>
              <th className="px-4 py-2.5 font-semibold">Band</th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r, i) => (
              <tr key={i} className="border-t border-border transition-colors hover:bg-surface-alt">
                <td className="px-4 py-2.5 text-ink-muted">{fmtDate(r.at)}</td>
                <td className="px-4 py-2.5 font-medium">{MODE_LABEL[r.mode]}</td>
                <td className="px-4 py-2.5 text-ink-muted">{r.topic}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-bold text-brand">
                    {r.overallBand.toFixed(1)}
                  </span>
                  {!r.live && <span className="ml-1.5 text-xs text-ink-muted">(sample)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BandChart rows={rows} />
    </div>
  );
}
