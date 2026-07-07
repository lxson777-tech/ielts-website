/* The report screen shared by every AI-graded skill checker: band header,
   per-criterion cards with a "next band" tip, and strengths/improvements.
   Extracted from WritingTester so Writing and Speaking (and any future
   skill) render results identically instead of drifting apart. Skill-specific
   blocks (Writing's mechanics/corrections, Speaking's acoustic stats/moments)
   render via `children`, slotted between the criteria grid and the
   strengths/improvements cards. */

export interface BandReportCriterion {
  key: string;
  label: string;
  band: number;
  comment: string;
  tip?: string;
}

export interface BandReportProps {
  /** shown next to the AI/sample badge, e.g. the prompt title or topic */
  title: string;
  overallBand: number;
  live: boolean;
  /** shown only when `live` is false, explaining what the sample grader can't do */
  offlineWarning: string;
  criteria: BandReportCriterion[];
  strengths: string[];
  improvements: string[];
  children?: React.ReactNode;
}

export default function BandReport({
  title,
  overallBand,
  live,
  offlineWarning,
  criteria,
  strengths,
  improvements,
  children,
}: BandReportProps) {
  return (
    <>
      <div className="rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          {live ? '✨ AI-assessed' : 'Sample assessment (offline)'} · {title}
        </p>
        <p className="mt-2 font-display text-5xl font-extrabold text-brand">{overallBand.toFixed(1)}</p>
        <p className="mt-1 text-sm text-ink-muted">Estimated overall band</p>
        {!live && (
          <p className="mx-auto mt-3 max-w-md rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
            ⚠ {offlineWarning}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {criteria.map((c) => (
          <div key={c.key} className="flex flex-col rounded-card border border-border bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{c.label}</span>
              <span className="rounded-full bg-brand-tint px-2.5 py-0.5 font-display text-sm font-extrabold text-brand">
                {c.band.toFixed(1)}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-muted">{c.comment}</p>
            {c.tip && (
              <p className="mt-auto pt-3">
                <span className="block rounded-lg bg-brand-tint/60 px-2.5 py-1.5 text-xs text-ink">
                  <strong className="text-brand">→ Band {Math.min(9, c.band + 1)}:</strong> {c.tip}
                </span>
              </p>
            )}
          </div>
        ))}
      </div>

      {children}

      <div className="grid gap-4 sm:grid-cols-2">
        <ListCard title="✓ Strengths" items={strengths} tone="success" />
        <ListCard title="↗ Improve next" items={improvements} tone="brand" />
      </div>
    </>
  );
}

export function ListCard({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'brand' }) {
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
