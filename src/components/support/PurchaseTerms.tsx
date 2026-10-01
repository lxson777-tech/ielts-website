/* The purchase facts, in short lines, for beside the plans (Builder A2
   places it; the wording is the website's, Builder W since 1 October 2026).
   Alex's decisions of 29 September and 1 October 2026: a fixed 30 days that
   simply end, nothing renews, no refunds after purchase (every lesson is
   free with an account, which is the chance to see the course first; there
   is no trial), the included assessments and fair daily limits on AI use.
   The same facts, in full, are on /terms (TermsDocument.tsx). */

import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import SupportLink from './SupportLink';
import './support.css';

export default function PurchaseTerms({ showSupport = true }: { showSupport?: boolean }) {
  const { t } = useT();
  return (
    <aside className="purchase-terms" aria-label={t('Before you buy')}>
      <ul>
        <li>{t('30 days of access. It ends on its own. Nothing renews, so you are never charged automatically.')}</li>
        <li>{t('Payments are not refunded after purchase. Every lesson is free with an account, so you can see how the course teaches before you buy.')}</li>
        <li>{t('12 essay assessments, 6 recorded Speaking assessments (up to 5 minutes each), 2 live interviews with feedback (up to 15 minutes each) and 2 full mock exams.')}</li>
        <li>{t('The placement test, once per account. Essays written in a mock exam or the placement test count towards the 12 essay assessments.')}</li>
        <li>{t('Unused assessments expire at the end of the 30 days. Reading and Listening practice has no limit.')}</li>
        <li>{t('Mr EZ answers up to 40 chat messages and 60 lesson-help requests a day.')}</li>
      </ul>
      <p className="purchase-terms-links">
        <a href={withBase('/terms')}>{t('Terms of use')}</a>
        <a href={withBase('/privacy')}>{t('Privacy')}</a>
      </p>
      {showSupport && <SupportLink reason="plans" lead="buy" />}
    </aside>
  );
}
