/* The quiet frame every placement screen sits in: the wordmark, a way out
   between parts, and (while a sitting is under way) the four-part stepper.
   Presentational only. */

import type { ReactNode } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { PLACEMENT_PARTS, PLACEMENT_PART_MINUTES, type PlacementPart, type PlacementStateV1 } from '../../lib/placement/state';

/** A part's name. Paper names stay English in every language (docs/
    I18N-GUIDE.md): the student meets them in that form on the real exam. */
export const PART_NAME: Record<PlacementPart, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

export function PlacementFrame({ children, leaveLabel }: { children: ReactNode; leaveLabel?: string }) {
  const { t } = useT();
  return (
    <div className="placement">
      <header className="pl-top">
        <a className="pl-wordmark" href={withBase('/dashboard')}>
          IELTS is EZ
        </a>
        <a className="pl-leave" href={withBase('/dashboard')}>
          {leaveLabel ?? t('Back to Today')}
        </a>
      </header>
      <main className="pl-main">{children}</main>
    </div>
  );
}

export function PlacementStepper({ state }: { state: Pick<PlacementStateV1, 'outcomes'> }) {
  const { t } = useT();
  const current = PLACEMENT_PARTS.find((part) => !state.outcomes[part]);
  return (
    <ol className="pl-stepper" aria-label={t('Placement test parts')}>
      {PLACEMENT_PARTS.map((part, index) => {
        const done = Boolean(state.outcomes[part]);
        const isCurrent = part === current;
        return (
          <li
            key={part}
            className={`pl-step pl-skill-${part} ${done ? 'is-done' : isCurrent ? 'is-current' : 'is-upcoming'}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="pl-step-bar" aria-hidden="true" />
            <span className="pl-step-name">
              <span>
                {index + 1}. {PART_NAME[part]}
              </span>
              <span className="pl-step-min">{t('{n} min', { n: PLACEMENT_PART_MINUTES[part] })}</span>
            </span>
            <span className="sr-only">
              {done ? t('Done') : isCurrent ? t('Now') : t('Next')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** One part's brief: what it is, how long, and one action. */
export function PartBrief({
  part,
  index,
  lead,
  facts,
  note,
  action,
  secondary,
}: {
  part: PlacementPart;
  index: number;
  lead: string;
  facts: readonly string[];
  note?: string;
  action: ReactNode;
  secondary?: ReactNode;
}) {
  const { t } = useT();
  return (
    <section className={`pl-card pl-enter pl-skill-${part}`} aria-labelledby="pl-part-heading">
      <p className="pl-kicker">{t('Part {n} of 4', { n: index + 1 })}</p>
      <h1 id="pl-part-heading" className="pl-title">
        {PART_NAME[part]}
      </h1>
      <p className="pl-lead">{lead}</p>
      <div className="pl-facts">
        {facts.map((fact) => (
          <span key={fact} className="pl-fact">
            {fact}
          </span>
        ))}
      </div>
      {note && <p className="pl-note">{note}</p>}
      <div className="pl-actions">
        {action}
        {secondary}
      </div>
    </section>
  );
}
