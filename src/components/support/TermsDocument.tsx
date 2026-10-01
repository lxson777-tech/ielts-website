import { paidPlan } from '../../lib/access/plans';
/* /terms, in plain words (Builder E, 29 September 2026; rewritten for the
   free-account model by Builder W, 1 October 2026).

   An island rather than static Astro text because its sentences carry the
   real price, read from the module the plans page uses, and a translated
   sentence with numbers in it needs t().

   Every statement is one Alex decided or the code already does:
   - the free account (Alex, 1 October 2026,
     docs/paid-access/FREE-ACCOUNT-MODEL.md): every lesson, its worked
     examples, its own short quiz and the vocabulary lists are free; in the
     gated build they need a (free) account. There is no free trial;
   - practice and guidance (Alex, 29 September and 1 October 2026): one
     price for 30 days, it simply ends, no automatic renewal, no refunds
     after purchase; buying again while access runs adds the next 30 days
     after the current ones (src/lib/access/plans.ts, PAID_ACCESS_RENEWS);
   - what 30 days include: 12 essay assessments, 6 recorded Speaking
     assessments (up to 5 minutes), 2 live interviews (up to 15 minutes),
     2 full mock exams, the placement test once per account, essays inside a
     mock or the placement counting towards the 12, Mr EZ's daily limits
     (PAID_AI_ALLOWANCE in src/lib/access/plans.ts and
     supabase/migrations/2026-09-30-profitable-offer.sql;
     tests/sales-copy.test.ts holds the sales page to the same numbers);
   - "not affiliated with IELTS": the sales page's own footer line.
   Left out until Alex decides: who runs the site (shown by itself once
   src/lib/operator.ts is published), and anything about payment providers.
   While buying is switched off (no PUBLIC_PAYMENTS_URL) a short note says
   so, because the paid terms would otherwise read as if one could buy
   today. */

import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { publishedOperator } from '../../lib/operator';
import { isTrialBuild } from '../../lib/trial/mode';
import SupportLink from './SupportLink';

const PAYMENTS_CONNECTED = !!(import.meta.env?.PUBLIC_PAYMENTS_URL as string | undefined);

export default function TermsDocument() {
  const { t, locale } = useT();
  const number = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US');
  const price = t('{amount} KZT', { amount: number.format(paidPlan('month-1')!.amount) });
  const operator = publishedOperator();
  // The gated build is the one where lessons need an account; the open site
  // (today's live site) opens them to everyone.
  const accountForLessons = isTrialBuild();

  return (
    <article className="policy">
      <header className="policy-head">
        <p className="policy-eyebrow">{t('Terms of use')}</p>
        <h1>{t('The terms, in plain words')}</h1>
        <p className="policy-lede">{t('What a free account includes, what practice and guidance add, and what happens when your access ends.')}</p>
        <p className="policy-updated">{t('Updated 1 October 2026')}</p>
      </header>

      {!PAYMENTS_CONNECTED && (
        <p className="policy-note" role="note">
          {t('Buying practice and guidance is not open yet. The terms for it below will apply once it opens.')}
        </p>
      )}

      <section className="policy-section" aria-labelledby="terms-free">
        <h2 id="terms-free">{t('Your free account')}</h2>
        <ul className="policy-list">
          <li>{t('Every lesson is free: the explanations, worked examples, each lesson’s own short quiz and the vocabulary lists.')}</li>
          {accountForLessons && <li>{t('Lessons open once you are signed in to a free account.')}</li>}
          <li>{t('Creating an account is free and needs no payment card. A free account never turns into a paid one by itself.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-access">
        <h2 id="terms-access">{t('Practice and guidance')}</h2>
        <ul className="policy-list">
          <li>{t('Practice and guidance cost {price} for 30 days, paid once.', { price })}</li>
          <li>{t('They add every practice exercise and timed test with band estimates, AI feedback on essays and recorded Speaking, live interviews with the AI examiner, full mock exams, the placement test, Mr EZ and the practice in your personal study plan.')}</li>
          <li>{t('30 days of access. It ends on its own. Nothing renews, so you are never charged automatically.')}</li>
          <li>{t('If you buy again while your access is running, the new 30 days start when the current ones end.')}</li>
          <li>{t('Payments are not refunded after purchase. Every lesson is free with an account, so you can see how the course teaches before you buy.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-ai">
        <h2 id="terms-ai">{t('What 30 days include')}</h2>
        <ul className="policy-list">
          <li>{t('12 essay assessments, 6 recorded Speaking assessments (up to 5 minutes each), 2 live interviews with feedback (up to 15 minutes each) and 2 full mock exams.')}</li>
          <li>{t('The placement test, once per account. Essays written in a mock exam or the placement test count towards the 12 essay assessments.')}</li>
          <li>{t('Unused assessments expire at the end of the 30 days. Reading and Listening practice has no limit.')}</li>
          <li>{t('Mr EZ answers up to 40 chat messages and 60 lesson-help requests a day.')}</li>
          <li>{t('Each account has a fair daily safety limit, so the service stays available for everyone. If you reach it, you can carry on the next day.')}</li>
          <li>{t('AI feedback is an estimate against the public IELTS band descriptors. It is not an official IELTS result.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-ends">
        <h2 id="terms-ends">{t('When your access ends')}</h2>
        <ul className="policy-list">
          <li>{t('Everything you saved stays on your account: your results, essays, progress and study plan.')}</li>
          <li>{t('Your lessons stay open with your free account. Practice, tests, AI feedback and Mr EZ need practice and guidance again.')}</li>
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
