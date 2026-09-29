/* /terms, in plain words (Builder E, 29 September 2026).

   An island rather than static Astro text because its sentences carry the
   real numbers (trial length, allowances, prices), read from the modules
   that enforce them, and a translated sentence with numbers in it needs
   t() and tn().

   Every statement is one Alex decided or the code already does:
   - the trial: src/lib/trial/offer.ts (approved 23 and 24 September);
   - paid access: Alex, 29 September 2026: one or three months at the
     approved prices, it simply ends, no automatic renewal, no refunds after
     purchase because the trial is the chance to try, unlimited normal study
     with fair daily safety limits on AI use, results kept after it ends;
   - "not affiliated with IELTS": the sales page's own footer line.
   Left out until Alex decides: who runs the site (shown by itself once
   src/lib/operator.ts is published), and anything about payment providers.
   While buying is switched off (no PUBLIC_PAYMENTS_URL) a short note says
   so, because the paid-access terms would otherwise read as if one could
   buy today. */

import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { publishedOperator } from '../../lib/operator';
import { FULL_ACCESS_PRICES_KZT, TRIAL_HOURS, TRIAL_SPEAKING_MINUTES, TRIAL_TUTOR_PER_SECTION } from '../../lib/trial/offer';
import SupportLink from './SupportLink';

const PAYMENTS_CONNECTED = !!(import.meta.env?.PUBLIC_PAYMENTS_URL as string | undefined);

export default function TermsDocument() {
  const { t, tn, locale } = useT();
  const number = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US');
  const price = (amount: number) => t('{amount} KZT', { amount: number.format(amount) });
  const operator = publishedOperator();
  const days = Math.round(TRIAL_HOURS / 24);

  return (
    <article className="policy">
      <header className="policy-head">
        <p className="policy-eyebrow">{t('Terms of use')}</p>
        <h1>{t('The terms, in plain words')}</h1>
        <p className="policy-lede">{t('What the free trial includes, how full access works, and what happens when it ends.')}</p>
        <p className="policy-updated">{t('Updated 29 September 2026')}</p>
      </header>

      {!PAYMENTS_CONNECTED && (
        <p className="policy-note" role="note">
          {t('Buying full access is not open yet. The terms for it below will apply once it opens.')}
        </p>
      )}

      <section className="policy-section" aria-labelledby="terms-trial">
        <h2 id="terms-trial">{t('The free trial')}</h2>
        <ul className="policy-list">
          <li>
            {tn(days, {
              one: 'The trial lasts {n} day, counted from the moment you start it.',
              other: 'The trial lasts {n} days, counted from the moment you start it.',
            })}
          </li>
          <li>{t('It needs an account. It does not need a payment card, and it never turns into a paid plan by itself.')}</li>
          <li>{t('It includes a selected introduction lesson and one test in each IELTS section: Reading, Listening, Writing and Speaking.')}</li>
          <li>
            {tn(TRIAL_TUTOR_PER_SECTION, {
              one: 'Mr EZ answers up to {n} message in each section. Only answered messages count.',
              other: 'Mr EZ answers up to {n} messages in each section. Only answered messages count.',
            })}
          </li>
          <li>
            {tn(TRIAL_SPEAKING_MINUTES, {
              one: 'The Speaking test is Part 1 of the interview, about {n} minute.',
              other: 'The Speaking test is Part 1 of the interview, about {n} minutes.',
            })}
          </li>
          <li>{t('When the trial ends, your results stay saved on your account.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-access">
        <h2 id="terms-access">{t('Full access')}</h2>
        <ul className="policy-list">
          <li>
            {t('Full access opens the whole course for a fixed period: one month for {month}, or three months for {three}.', {
              month: price(FULL_ACCESS_PRICES_KZT.oneMonth),
              three: price(FULL_ACCESS_PRICES_KZT.threeMonths),
            })}
          </li>
          <li>{t('It ends automatically at the end of that period. Nothing renews, so you are never charged automatically.')}</li>
          <li>{t('Payments are not refunded after purchase. Please use the free three-day trial to decide whether the course suits you.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-ai">
        <h2 id="terms-ai">{t('Mr EZ and AI feedback')}</h2>
        <ul className="policy-list">
          <li>{t('With full access there is no monthly allowance for normal study with Mr EZ, essay feedback and Speaking feedback.')}</li>
          <li>{t('Each account has a fair daily safety limit, so the service stays available for everyone. If you reach it, you can carry on the next day.')}</li>
          <li>{t('AI feedback is an estimate against the public IELTS band descriptors. It is not an official IELTS result.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-ends">
        <h2 id="terms-ends">{t('When your access ends')}</h2>
        <ul className="policy-list">
          <li>{t('Everything you saved stays on your account: your results, essays, progress and study plan.')}</li>
          <li>{t('You can still look back at your saved work. New lessons, tests and Mr EZ replies need access again.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-about">
        <h2 id="terms-about">{t('About IELTS is EZ')}</h2>
        <ul className="policy-list">
          {operator && <li>{t('IELTS is EZ is run by {name}.', { name: operator.name })}</li>}
          <li>{t('IELTS is EZ is independent preparation. It is not affiliated with or endorsed by IELTS.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-questions">
        <h2 id="terms-questions">{t('Questions')}</h2>
        <p>{t('If anything here is unclear, ask a person through the support form. A person reads every message and replies by email.')}</p>
        <SupportLink reason="terms" lead={null} className="policy-support" />
        <p className="policy-foot">
          <a href={withBase('/privacy')}>{t('How we handle your information')}</a>
          <a href={withBase('/help')}>{t('How the platform works')}</a>
        </p>
      </section>
    </article>
  );
}
