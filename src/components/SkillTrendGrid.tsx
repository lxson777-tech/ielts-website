/* Four separate skill panels for the progress report: Reading, Listening,
   Writing and Speaking, each showing what is currently known about THAT
   paper alone. Replaces the single line that used to join every paper's
   scores into one chronological trend (ProgressReport.tsx before
   2026-09-22), which is exactly the audit's complaint about that page
   (architecture section 1.3): a Reading band and a Writing band are not
   points on the same scale, and joining them drew a trajectory that meant
   nothing.

   Every number here comes from `skillTrendPanels` (./reportTrends.ts),
   which reads nothing but the one evidence policy's output. A paper with no
   evidence renders its unknown state, never a zero. */

import { useT, type Translator } from '../lib/i18n/react';
import type { SkillTrendPanel } from './reportTrends';
import { CERTAINTY_LABEL, FRESHNESS_NONE_TEXT, freshnessMessage, trendDirectionKey } from './reportTrends';
import '../styles/learning-progress.css';

const PAPER_LABEL: Record<SkillTrendPanel['paper'], string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

/** The freshness line. Three separate, literal `tn()` calls rather than one
    call fed a variable: tests/i18n.test.ts's coverage scanner only finds a
    counted phrase from a `{ one, other }` object literal sitting inside the
    `tn()` call itself (see freshnessMessage's doc comment in
    reportTrends.ts), so each state's forms have to be written out here. */
function freshnessLine(panel: SkillTrendPanel, t: Translator['t'], tn: Translator['tn']): string {
  const message = freshnessMessage(panel.freshness);
  if (message.kind === 'none') return t(FRESHNESS_NONE_TEXT);
  if (message.kind === 'fresh') return tn(message.days, { one: 'Checked {n} day ago', other: 'Checked {n} days ago' });
  if (message.kind === 'ageing') return tn(message.days, { one: 'Last checked {n} day ago', other: 'Last checked {n} days ago' });
  return tn(message.days, { one: 'Stale, last checked {n} day ago', other: 'Stale, last checked {n} days ago' });
}

function SkillTrendCard({ panel }: { panel: SkillTrendPanel }) {
  const { t, tn } = useT();
  const direction = trendDirectionKey(panel.trend);

  return (
    <div className={`skill-trend-card skill-${panel.paper}`}>
      <div className="skill-trend-head">
        {/* Reading/Listening/Writing/Speaking are protected paper names and
            are never translated (docs/I18N-GUIDE.md), matching SKILL_LABEL
            just above in this file's parent. */}
        <span className="skill-trend-paper">{PAPER_LABEL[panel.paper]}</span>
        <span className={`skill-trend-certainty is-${panel.certainty}`}>{t(CERTAINTY_LABEL[panel.certainty])}</span>
      </div>

      {panel.band !== null && panel.range ? (
        <p className="skill-trend-band">
          {t('{low} to {high}', { low: panel.range[0].toFixed(1), high: panel.range[1].toFixed(1) })}
          <span className="unit">{t('band')}</span>
          {direction && <span className="unit">({t(direction)})</span>}
        </p>
      ) : (
        <p className="skill-trend-unknown">
          {panel.certainty === 'self-reported'
            ? t('Self-reported only, not measured here yet.')
            : t('Not measured yet.')}
        </p>
      )}

      <div className="skill-trend-meta">
        <span>{freshnessLine(panel, t, tn)}</span>
        <span>
          {tn(panel.studiedOccasions, { one: '{n} lesson or drill studied', other: '{n} lessons or drills studied' })}
        </span>
        {panel.requiredBand !== null && (
          <span className={panel.meetsRequirement ? 'is-met' : 'is-short'}>
            {panel.meetsRequirement
              ? t('Meets your target of band {band}', { band: panel.requiredBand })
              : t('Needs band {band} for your target', { band: panel.requiredBand })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SkillTrendGrid({ panels }: { panels: readonly SkillTrendPanel[] }) {
  const { t } = useT();
  return (
    <div>
      <p className="mb-3 text-xs text-ink-muted">
        {t('Each skill is its own estimate. They are never averaged into one line, because a Reading band and a Writing band are not the same scale.')}
      </p>
      <div className="skill-trend-grid">
        {panels.map((panel) => (
          <SkillTrendCard key={panel.paper} panel={panel} />
        ))}
      </div>
    </div>
  );
}
