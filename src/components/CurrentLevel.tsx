/* "Your current approximate level" card. One estimated overall band built from
   every scored attempt across the four papers, plus the per-skill breakdown it
   rests on and the honest caveats (how many papers, how much evidence).

   The estimate itself lives in src/lib/level.ts; this file only renders it, so
   the homepage strip and any future surface can reuse the same numbers rather
   than each re-deriving "how good is this student" their own way. */

import { useEffect, useState } from 'react';
import { withBase } from '../lib/url';
import { onProgressChange } from '../lib/progress';
import {
  estimateLevel,
  bandDescriptor,
  cefrFor,
  SKILL_LABEL,
  SKILL_PRACTICE,
  type LevelEstimate,
  type LevelConfidence,
  type SkillLevel,
} from '../lib/level';

const CONFIDENCE_COPY: Record<LevelConfidence, { label: string; tone: string; note: string }> = {
  none: { label: '', tone: '', note: '' },
  low: {
    label: 'Low confidence',
    tone: 'bg-warning-tint text-warning',
    note: 'Based on very little practice so far. Treat this as a first impression, not a score.',
  },
  medium: {
    label: 'Medium confidence',
    tone: 'bg-brand-tint text-brand',
    note: 'A reasonable read on your level. More attempts, especially in the papers below, will sharpen it.',
  },
  high: {
    label: 'Good confidence',
    tone: 'bg-success-tint text-success',
    note: 'Built from a solid spread of recent attempts across several papers.',
  },
};

function TrendPill({ trend }: { trend: number }) {
  if (Math.abs(trend) < 0.25) {
    return <span className="text-xs font-semibold text-ink-muted">→ steady</span>;
  }
  const up = trend > 0;
  return (
    <span className={`text-xs font-semibold ${up ? 'text-success' : 'text-warning'}`}>
      {up ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}
    </span>
  );
}

function SkillRow({ level }: { level: SkillLevel }) {
  const accent = `var(--color-${level.skill})`;
  const practice = SKILL_PRACTICE[level.skill];

  if (level.band === null) {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="w-20 shrink-0 text-sm font-semibold text-ink-muted">{SKILL_LABEL[level.skill]}</span>
        <span className="h-2 flex-1 rounded-full bg-surface-alt" />
        <a
          href={withBase(practice.href)}
          className="shrink-0 text-xs font-semibold text-brand hover:text-brand-hover"
        >
          {practice.label} →
        </a>
      </div>
    );
  }

  // Bar spans bands 4-9, the range practice scores realistically fall in.
  const pct = Math.max(4, Math.min(100, ((level.band - 4) / 5) * 100));

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-20 shrink-0 text-sm font-semibold">{SKILL_LABEL[level.skill]}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt">
        <span
          className="block h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: accent }}
        />
      </span>
      <span className="w-10 shrink-0 text-right font-display text-sm font-extrabold" style={{ color: accent }}>
        {level.band.toFixed(1)}
      </span>
      <span className="w-16 shrink-0 text-right">
        {level.trend !== null ? (
          <TrendPill trend={level.trend} />
        ) : (
          <span className="text-xs text-ink-muted">
            {level.attempts} {level.attempts === 1 ? 'try' : 'tries'}
          </span>
        )}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-card border border-dashed border-border bg-surface-alt p-6">
      <p className="font-display font-bold">Your approximate level</p>
      <p className="mt-1 text-sm text-ink-muted">
        Nothing to estimate from yet. Take a practice test or get one essay or speaking answer graded, and your
        estimated band will appear here.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={withBase('/tests')}
          className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Take a reading test
        </a>
        <a
          href={withBase('/trainers/writing')}
          className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface"
        >
          Grade an essay
        </a>
        <a
          href={withBase('/trainers/speaking')}
          className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface"
        >
          Speak to the examiner
        </a>
      </div>
    </div>
  );
}

export default function CurrentLevel() {
  const [level, setLevel] = useState<LevelEstimate | null>(null);

  useEffect(() => {
    const read = () => setLevel(estimateLevel());
    read();
    // Stay live for attempts recorded in this tab, and refresh on focus so a
    // cloud pull in another tab (or another device) shows up on return.
    const off = onProgressChange(read);
    window.addEventListener('focus', read);
    return () => {
      off();
      window.removeEventListener('focus', read);
    };
  }, []);

  if (level === null) return null; // pre-hydration
  if (level.overall === null) return <EmptyState />;

  const conf = CONFIDENCE_COPY[level.confidence];
  const weakest = level.weakest;

  return (
    <section
      className="rounded-card border border-border bg-surface p-6 shadow-card"
      aria-label="Your current approximate level"
    >
      <div className="flex flex-wrap items-start gap-6">
        {/* ── The number ── */}
        <div className="min-w-[8.5rem] text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Approximate level</p>
          <p className="band-score-pop mt-1 font-display text-5xl font-extrabold text-brand">
            {level.overall.toFixed(1)}
          </p>
          <p className="mt-1 text-sm font-semibold">{bandDescriptor(level.overall)}</p>
          <p className="text-xs text-ink-muted">≈ CEFR {cefrFor(level.overall)}</p>
        </div>

        {/* ── What it's built from ── */}
        <div className="min-w-[15rem] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${conf.tone}`}>{conf.label}</span>
            <span className="text-xs text-ink-muted">
              {level.covered} of 4 papers · {level.totalAttempts} graded{' '}
              {level.totalAttempts === 1 ? 'attempt' : 'attempts'}
            </span>
          </div>
          {level.range && (
            <p className="mt-2 text-sm text-ink-muted">
              Your true band is most likely between{' '}
              <strong className="text-ink">{level.range[0].toFixed(1)}</strong> and{' '}
              <strong className="text-ink">{level.range[1].toFixed(1)}</strong>.
            </p>
          )}
          <p className="mt-1 text-xs text-ink-muted">{conf.note}</p>

          <div className="mt-3 divide-y divide-border border-t border-border">
            {level.skills.map((s) => (
              <SkillRow key={s.skill} level={s} />
            ))}
          </div>
        </div>
      </div>

      {/* ── What to do about it ── */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-alt px-4 py-3">
        <p className="text-sm text-ink-muted">
          {level.missing.length > 0 ? (
            <>
              This estimate skips{' '}
              <strong className="text-ink">
                {level.missing.map((m) => SKILL_LABEL[m]).join(', ')}
              </strong>
              . Practise {level.missing.length === 1 ? 'it' : 'them'} to get a full-exam estimate.
            </>
          ) : weakest ? (
            <>
              <strong className="text-ink">{SKILL_LABEL[weakest.skill]}</strong> is holding your overall band down.
              Every 0.5 you gain there lifts this number.
            </>
          ) : null}
        </p>
        {weakest && (
          <a
            href={withBase(SKILL_PRACTICE[level.missing[0] ?? weakest.skill].href)}
            className="shrink-0 rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            {SKILL_PRACTICE[level.missing[0] ?? weakest.skill].label}
          </a>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        Estimated from your recent practice, weighted towards your latest attempts. It is a study guide, not an
        official IELTS result.
      </p>
    </section>
  );
}
