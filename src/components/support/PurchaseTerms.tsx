/* The three purchase facts, in short lines, for beside the plans (Builder
   A2 places it; Builder E owns the wording). Alex's decisions of 29
   September 2026: a fixed period that simply ends, nothing renews, no
   refunds after purchase because the free three-day trial is the chance to
   try, and fair daily limits on AI use. The full wording is on /terms. */

import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { PAID_AI_ALLOWANCE } from '../../lib/access/plans';
import SupportLink from './SupportLink';
import './support.css';

export default function PurchaseTerms({ showSupport = true }: { showSupport?: boolean }) {
  const { t } = useT();
  return (
    <aside className="purchase-terms" aria-label={t('Before you buy')}>
      <ul>
        <li>{t('30 days of access. It ends on its own. Nothing renews, so you are never charged automatically.')}</li>
        <li>{t('No refunds after purchase. The free three-day trial is your chance to try the course first.')}</li>
        {/* Accurate as built: Mr EZ and the live examiner have daily limits; essay
            and speaking grading do not (src/lib/access/plans.ts). */}
        <li>{t(PAID_AI_ALLOWANCE)}</li>
      </ul>
      <p className="purchase-terms-links">
        <a href={withBase('/terms')}>{t('Terms of use')}</a>
        <a href={withBase('/privacy')}>{t('Privacy')}</a>
      </p>
      {showSupport && <SupportLink reason="plans" lead="buy" />}
    </aside>
  );
}
