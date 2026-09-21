/* The shared wait screen for every AI-graded feature.

   Grading really does take a minute (an essay) to five and a half minutes (a
   full mock interview), so a single frozen label read as a hang. This shows a
   percentage, a bar and the stage it is on, all driven by elapsed time
   against an honest estimate (see src/lib/grading/progress.ts for why the
   bar stops at 95% instead of pretending to finish).

   `startedAt` is passed in by the caller (ms epoch) so the bar survives any
   re-render of the parent: the clock belongs to the grading request, not to
   this component's mount. */

import { useEffect, useState } from 'react';
import {
  DEFAULT_AUDIO_SECONDS,
  OVERRUN_FRACTION,
  OVERRUN_NOTE,
  estimateSeconds,
  progressPercent,
  stageLabel,
  type GradingKind,
} from '../lib/grading/progress';
import { useT } from '../lib/i18n/react';

const TICK_MS = 200;

export default function GradingProgress({
  kind,
  audioSeconds = DEFAULT_AUDIO_SECONDS,
  startedAt,
  className = '',
}: {
  kind: GradingKind;
  audioSeconds?: number;
  startedAt: number;
  className?: string;
}) {
  const { t } = useT();
  const TASK_LABEL: Record<GradingKind, string> = {
    speaking: t('Grading your speaking'),
    writing: t('Grading your essay'),
  };
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const estimate = estimateSeconds(kind, audioSeconds);
  const elapsedMs = Math.max(0, now - startedAt);
  const percent = Math.floor(progressPercent(elapsedMs, estimate));
  const fraction = elapsedMs / 1000 / estimate;
  const label = stageLabel(kind, fraction);
  const overrun = fraction > OVERRUN_FRACTION;

  return (
    <div className={`mx-auto w-full max-w-sm text-left ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{TASK_LABEL[kind]}</span>
        <span className="font-display text-sm font-extrabold tabular-nums">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={TASK_LABEL[kind]}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-alt"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-200 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
        {label}
      </p>
      {overrun && <p className="mt-1.5 text-xs text-ink-muted/80">{t(OVERRUN_NOTE)}</p>}
    </div>
  );
}
