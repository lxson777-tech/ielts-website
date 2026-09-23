/* Full access: the approved prices, and nothing that pretends to sell them.

   Monthly 10,000 KZT and three months 25,000 KZT are approved. No payment
   provider, renewal, refund policy or paid AI allowance is, so there is no
   checkout, no success screen and no "coming soon" countdown: the buttons
   are plainly unavailable and the page says why. */

import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { FULL_ACCESS_PRICES_KZT } from '../../lib/trial/offer';

function tenge(amount: number): string {
  // Grouped with a comma in both languages, as the approved design shows it.
  return `₸${amount.toLocaleString('en-US')}`;
}

export default function TrialPlans() {
  const { t } = useT();
  const saving = FULL_ACCESS_PRICES_KZT.oneMonth * 3 - FULL_ACCESS_PRICES_KZT.threeMonths;
  return (
    <section className="trial-ui trial-plans" aria-labelledby="trial-plans-title">
      <h1 id="trial-plans-title">{t('Keep your momentum.')}</h1>
      <p className="trial-lead">{t('Choose more time for your IELTS preparation.')}</p>
      <div className="trial-prices">
        <article>
          <h2>{t('One month')}</h2>
          <p>
            <strong>{tenge(FULL_ACCESS_PRICES_KZT.oneMonth)}</strong> {t('total')}
          </p>
          <small>{t('The full course and every practice test for one month.')}</small>
          <button type="button" className="trial-btn" disabled>
            {t('Payment not connected yet')}
          </button>
        </article>
        <article>
          <h2>{t('Three months')}</h2>
          <p>
            <strong>{tenge(FULL_ACCESS_PRICES_KZT.threeMonths)}</strong> {t('total')}
          </p>
          <small>{t('Save {amount} compared with three monthly purchases.', { amount: tenge(saving) })}</small>
          <button type="button" className="trial-btn" disabled>
            {t('Payment not connected yet')}
          </button>
        </article>
      </div>
      <p className="trial-fine">
        {t('Buying is not open yet. Paid Mr EZ allowances and purchase terms are still being confirmed, so this page cannot take a payment and will not ask for one.')}
      </p>
      <a className="trial-btn" href={withBase('/dashboard')}>
        {t('Back to my trial')}
      </a>
    </section>
  );
}
