/* A small ring: learnt words out of a topic's total. The label is spoken,
   the ring itself is only a picture of it. */

import { useT } from '../../../lib/i18n/react';
import type { TopicRing } from '../../../lib/vocab-home';

const R = 12;
const C = 2 * Math.PI * R;

export default function ProgressRing({ ring, size = 30 }: { ring: TopicRing; size?: number }) {
  const { t } = useT();
  const offset = C * (1 - ring.fraction);
  return (
    <span
      className={`vh-ring${ring.learnt > 0 ? ' has-progress' : ''}${ring.learnt >= ring.total && ring.total > 0 ? ' is-complete' : ''}`}
      role="img"
      aria-label={t('{learnt} of {total} words learnt', { learnt: ring.learnt, total: ring.total })}
    >
      <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true" focusable="false">
        <circle className="vh-ring-track" cx="15" cy="15" r={R} />
        <circle
          className="vh-ring-value"
          cx="15"
          cy="15"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform="rotate(-90 15 15)"
        />
      </svg>
    </span>
  );
}
