/* "Your current approximate level" card. One estimated overall band, read
   from the same evidence policy every other surface reads
   (src/lib/learning/policy.ts), plus the per-skill breakdown it rests on and
   the honest caveats (how many papers, how much evidence, how sure).

   The estimate itself lives in src/lib/level.ts; this file only renders it,
   so the homepage strip and any future surface reuse the same numbers rather
   than each re-deriving "how good is this student" their own way.

   ONE HONEST DIFFERENCE FROM THE OLD CARD: the overall band is null more
   often now, because the policy refuses to blend four different papers into
   one number until all four qualify (see level.ts's header comment). A
   student with three good papers and one untouched used to see an "overall"
   built from the three; now they see the three, plainly, and a note about
   the fourth, never a number the policy would not stand behind. There is
   also no separate "take a reading test" style call to action any more: the
   student's plan already has one current session, chosen the same way
   everywhere else on the site, so this card points at that instead of
   inventing a second opinion. */

import { useEffect, useState } from 'react';
import { withBase } from '../lib/url';
import { onProgressChange } from '../lib/progress';
import { onLearnerRecordChange, onPersonalPlanChange } from '../lib/learning';
import {
  estimateLevel,
  bandDescriptor,
  cefrFor,
  SKILL_LABEL,
  type LevelEstimate,
  type LevelConfidence,
  type SkillLevel,
} from '../lib/level';
import { CERTAINTY_LABEL } from './reportTrends';
import { useT } from '../lib/i18n/react';
import { nt } from '../lib/i18n/translate';

const CONFIDENCE_COPY: Record<LevelConfidence, { label: string; tone: string; note: string }> = {
  none: { label: '', tone: '', note: '' },
  low: {
    label: nt('Low confidence'),
    tone: 'bg-warning-tint text-warning',
    note: nt('Based on very little practice so far, or on a self-reported score rather than something measured here. Treat this as a first impression, not a score.'),
  },
  medium: {
    label: nt('Medium confidence'),
    tone: 'bg-brand-tint text-brand',
    note: nt('A reasonable read on your level. More attempts, especially in the papers below, will sharpen it.'),
  },
  high: {
    label: nt('Good confidence'),
    tone: 'bg-success-tint text-success',
    note: nt('Built from a solid spread of recent attempts across all four papers.'),
  },
};

function TrendPill({ trend }: { trend: number }) {
  const { t } = useT();
  if (Math.abs(trend) < 0.25) {
    return <span className="text-xs font-semibold text-ink-muted">{t('→ steady')}</span>;
  }
  const up = trend > 0;
  return (
    <span className={`text-xs font-semibold ${up ? 'text-success' : 'text-warning'}`}>
      {up ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}
    </span>
  );
}

function SkillRow({ level }: { level: SkillLevel }) {
  const { t, tn } = useT();
  const accent = `var(--color-${level.skill})`;

  if (level.band === null) {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="w-20 shrink-0 text-sm font-semibold text-ink-muted">{SKILL_LABEL[level.skill]}</span>
        <span className="h-2 flex-1 rounded-full bg-surface-alt" />
        <span className="shrink-0 text-xs text-ink-muted">{t(CERTAINTY_LABEL[level.certainty])}</span>
      </div>
    );
  }

  // Bar spans bands 4-9, the range practice scores realistically fall in.
  const pct = Math.max(4, Math.min(100, ((level.band - 4) / 5) * 100));
  const selfReported = level.certainty === 'self-reported';

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-20 shrink-0 text-sm font-semibold">{SKILL_LABEL[level.skill]}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt">
        <span
          className="block h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: accent, opacity: selfReported ? 0.55 : 1 }}
        />
      </span>
      <span className="w-10 shrink-0 text-right font-display text-sm font-extrabold" style={{ color: accent }}>
        {level.band.toFixed(1)}
      </span>
      <span className="w-20 shrink-0 text-right">
        {selfReported ? (
          <span className="text-xs text-ink-muted">{t(CERTAINTY_LABEL['self-reported'])}</span>
        ) : level.trend !== null ? (
          <TrendPill trend={level.trend} />
        ) : (
          <span className="text-xs text-ink-muted">
            {tn(level.attempts, { one: '{n} try', other: '{n} tries' })}
          </span>
        )}
      </span>
    </div>
  );
}

/** Nothing measured on any paper yet. One link, to the student's own plan
    (which already has a first step chosen for them), never a second set of
    "start here" links competing with it. */
function EmptyState() {
  const { t } = useT();
  return (
    <div className="rounded-card border border-dashed border-border bg-surface-alt p-6">
      <p className="font-display font-bold">{t('Your approximate level')}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {t('Nothing measured yet. Your plan already has a first step chosen for you.')}
      </p>
      <div className="mt-4">
        <a
          href={withBase('/dashboard')}
          className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          {t("Go to today's session")}
        </a>
      </div>
    </div>
  );
}

/** Some papers measured, not all four: the honest middle state the policy
    introduces (level.ts's header comment). Shows the four skills plainly,
    with no blended headline number, and says what is still missing rather
    than inventing one. */
function PartialState({ level }: { level: LevelEstimate }) {
  const { t, tn } = useT();
  const missingList = level.missing.map((m) => SKILL_LABEL[m]).join(', ');
  return (
    <section
      className="rounded-card border border-border bg-surface p-6 shadow-card"
      aria-label={t('Your current approximate level')}
    >
      <p className="font-display font-bold">{t('Your approximate level')}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {tn(level.covered, {
          one: 'Measured on {n} of 4 papers so far. Once all four have real evidence, one overall band appears here.',
          other: 'Measured on {n} of 4 papers so far. Once all four have real evidence, one overall band appears here.',
        })}
      </p>
      <div className="mt-4 divide-y divide-border border-t border-border">
        {level.skills.map((s) => (
          <SkillRow key={s.skill} level={s} />
        ))}
      </div>
      {level.missing.length > 0 && (
        <p className="mt-3 text-xs text-ink-muted">
          {t('Still unknown: {list}.', { list: missingList })}
        </p>
      )}
      <div className="mt-4">
        <a
          href={withBase('/dashboard')}
          className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          {t("Go to today's session")}
        </a>
      </div>
    </section>
  );
}

export default function CurrentLevel() {
  const { t, tn } = useT();
  const [level, setLevel] = useState<LevelEstimate | null>(null);

  useEffect(() => {
    const read = () => setLevel(estimateLevel());
    read();
    // Stay live for evidence recorded in this tab (the new learner record,
    // and the legacy progress store some surfaces still write to directly),
    // and refresh on focus so a cloud pull in another tab (or another
    // device) shows up on return.
    const offProgress = onProgressChange(read);
    const offRecord = onLearnerRecordChange(read);
    const offPlan = onPersonalPlanChange(read);
    window.addEventListener('focus', read);
    return () => {
      offProgress();
      offRecord();
      offPlan();
      window.removeEventListener('focus', read);
    };
  }, []);

  if (level === null) return null; // pre-hydration
  if (level.overall === null) return level.covered > 0 ? <PartialState level={level} /> : <EmptyState />;

  const conf = CONFIDENCE_COPY[level.confidence];
  const weakest = level.weakest;

  // "Your true band is most likely between {low} and {high}." has bold on
  // the two numbers. t() with no vars leaves the {low}/{high} markers in
  // place (interpolate() only fills vars it's given), so we can split on
  // them by hand and re-insert <strong>, keeping the emphasis instead of
  // flattening the sentence to plain text. It still lets Russian reorder
  // the two placeholders however the translation needs.
  const rangeParts = level.range
    ? t('Your true band is most likely between {low} and {high}.').split(/(\{low\}|\{high\})/)
    : null;

  return (
    <section
      className="rounded-card border border-border bg-surface p-6 shadow-card"
      aria-label={t('Your current approximate level')}
    >
      <div className="flex flex-wrap items-start gap-6">
        {/* ── The number ── */}
        <div className="min-w-[8.5rem] text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t('Approximate level')}</p>
          <p className="band-score-pop mt-1 font-display text-5xl font-extrabold text-brand">
            {level.overall.toFixed(1)}
          </p>
          <p className="mt-1 text-sm font-semibold">{t(bandDescriptor(level.overall))}</p>
          <p className="text-xs text-ink-muted">{t('≈ CEFR {code}', { code: cefrFor(level.overall) })}</p>
        </div>

        {/* ── What it's built from ── */}
        <div className="min-w-[15rem] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${conf.tone}`}>{t(conf.label)}</span>
            <span className="text-xs text-ink-muted">
              {t('{covered} of 4 papers', { covered: level.covered })}{' '}
              · {tn(level.totalAttempts, { one: '{n} graded attempt', other: '{n} graded attempts' })}
            </span>
          </div>
          {level.range && rangeParts && (
            <p className="mt-2 text-sm text-ink-muted">
              {rangeParts.map((part, i) => {
                if (part === '{low}') return <strong key={i} className="text-ink">{level.range![0].toFixed(1)}</strong>;
                if (part === '{high}') return <strong key={i} className="text-ink">{level.range![1].toFixed(1)}</strong>;
                return <span key={i}>{part}</span>;
              })}
            </p>
          )}
          <p className="mt-1 text-xs text-ink-muted">{t(conf.note)}</p>

          <div className="mt-3 divide-y divide-border border-t border-border">
            {level.skills.map((s) => (
              <SkillRow key={s.skill} level={s} />
            ))}
          </div>
        </div>
      </div>

      {/* What to do about it: the one shared session, never a second
          opinion picked from this card alone. */}
      {weakest && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-alt px-4 py-3">
          <p className="text-sm text-ink-muted">
            {t('{skill} is holding your overall band down. Every 0.5 you gain there lifts this number.', {
              skill: SKILL_LABEL[weakest.skill],
            })}
          </p>
          <a
            href={withBase('/dashboard')}
            className="shrink-0 rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            {t("Go to today's session")}
          </a>
        </div>
      )}

      <p className="mt-3 text-xs text-ink-muted">
        {t('Estimated from your recent evidence, weighted towards your latest attempts. It is a study guide, not an official IELTS result.')}
      </p>
    </section>
  );
}
