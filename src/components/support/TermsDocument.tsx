/* /terms, in plain words (Builder E, 29 September 2026; rewritten for the
   free-account model by Builder W, 1 October 2026; the public offer for the
   paid site by Builder L, 2 October 2026).

   An island rather than static Astro text because its sentences carry the
   real price, the days and the included assessments, read from the modules
   the plans page uses, and a translated sentence with numbers in it needs
   t(). Nothing here re-types a number: the price and the days are the plan
   on sale (src/lib/access/plans.ts, held to the database by
   tests/paid-sql.test.ts), the assessments are PAID_ALLOWANCE
   (src/lib/trial/status.ts), and the refund example is worked out by
   refundExample() (src/lib/legal/refund.ts).

   TWO DOCUMENTS, chosen by the build:

   - The gated build (PUBLIC_ACCESS_MODE=trial, the paid site): a PUBLIC
     OFFER agreement, as Kazakh law expects of a site that sells (Civil Code
     Art. 395 p.5 and 396 p.3; Trade Rules p.189; the research in
     docs/legal/KZ-WEBSITE-REQUIREMENTS-2026-10-02.md, section 2). It names
     the seller (only through legalDetail(), src/lib/operator.ts; a detail
     Alex has not filled in shows as a marked placeholder here), what is
     sold, how the agreement is made, the refund rule of
     docs/legal/BUILD-PLAN-2026-10-02.md with its worked example, complaints
     within 10 calendar days, the consumer protection authority (confirmed on
     gov.kz, 2 October 2026) and the right to go to court, the AI in the
     service, the age rule and how the offer may change. Its version is
     OFFER_VERSION (src/lib/legal/offer.ts).
   - The open build (today's live site, which sells nothing): the free-site
     terms as they were, with one change: the old "not refunded after
     purchase" line now says what the refund rule gives.

   Every statement is one Alex decided or the code already does:
   - the free account (Alex, 1 October 2026,
     docs/paid-access/FREE-ACCOUNT-MODEL.md): every lesson, its worked
     examples, its own short quiz and the vocabulary lists are free; in the
     gated build they need a (free) account. There is no free trial;
   - practice and guidance (Alex, 29 September and 1 October 2026): one
     price for 30 days, it simply ends, no automatic renewal; buying again
     while access runs adds the next 30 days after the current ones
     (PAID_ACCESS_RENEWS); access starts when the payment is confirmed (the
     payments Worker grants it on the provider's signed confirmation);
   - refunds (Alex, 2 October 2026, replacing "no refunds after purchase"):
     the unused share, the larger of days started and assessments used;
   - a receipt for each paid purchase on the Account page (Receipt.tsx);
   - Mr EZ's daily limits and the fair daily safety limit (the Workers'
     settings; the sales page states the same);
   - a person reviews an AI result on request through the support form
     (reason `ai-review`, Builder C);
   - "not affiliated with IELTS": the sales page's own footer line.
   While buying is switched off (no PUBLIC_PAYMENTS_URL) a short note says
   so, because the paid terms would otherwise read as if one could buy
   today. */

import { useT } from '../../lib/i18n/react';
import { intlLocale } from '../../lib/i18n/locale';
import { withBase } from '../../lib/url';
import { publishedOperator } from '../../lib/operator';
import { isTrialBuild } from '../../lib/trial/mode';
import { AVAILABLE_PAID_PLANS } from '../../lib/access/plans';
import { PAID_ALLOWANCE } from '../../lib/trial/status';
import { COMPLAINT_ANSWER_DAYS, REFUND_COUNTED_ASSESSMENTS, REFUND_WORKING_DAYS, refundExample } from '../../lib/legal/refund';
import { CONSUMER_AUTHORITY, OFFER_VERSION, formatVersion, sellerEmail } from '../../lib/legal/offer';
import { SUPPORT_ENABLED } from '../../lib/support';
import SupportLink from './SupportLink';
import SellerDetails, { SellerValue } from '../legal/SellerDetails';
import '../../styles/legal.css';

const PAYMENTS_CONNECTED = !!(import.meta.env?.PUBLIC_PAYMENTS_URL as string | undefined);

export default function TermsDocument() {
  return isTrialBuild() ? <OfferDocument /> : <OpenSiteTerms />;
}

function usePrice() {
  const { t, locale } = useT();
  const number = new Intl.NumberFormat(intlLocale(locale, 'en-US'));
  return (amount: number) => t('{amount} KZT', { amount: number.format(amount) });
}

/* ── The paid site: the public offer ───────────────────────────────────── */

function OfferDocument() {
  const { t, locale } = useT();
  const money = usePrice();
  const plan = AVAILABLE_PAID_PLANS[0]!;
  const price = money(plan.amount);
  const days = plan.days;
  const ex = refundExample();
  const email = sellerEmail(true);
  const refundHref = withBase('/support?reason=refund');
  const reviewHref = withBase('/support?reason=ai-review');

  return (
    <article className="policy">
      <header className="policy-head">
        <p className="policy-eyebrow">{t('Public offer')}</p>
        <h1>{t('The agreement for practice and guidance')}</h1>
        <p className="policy-lede">
          {t('This page is a public offer: the seller’s proposal to anyone who wants practice and guidance on IELTS is EZ. Paying for it means you accept everything on this page, so please read it before you buy.')}
        </p>
        <p className="policy-updated">{t('Version of {date}', { date: formatVersion(OFFER_VERSION, locale) })}</p>
      </header>

      {!PAYMENTS_CONNECTED && (
        <p className="policy-note" role="note">
          {t('Buying practice and guidance is not open yet. The terms for it below will apply once it opens.')}
        </p>
      )}

      <section className="policy-section" aria-labelledby="terms-seller">
        <h2 id="terms-seller">{t('1. Who sells')}</h2>
        <p>{t('IELTS is EZ is run and sold by a sole trader registered in Kazakhstan:')}</p>
        <SellerDetails />
        <ul className="policy-list" style={{ marginTop: 16 }}>
          <li>{t('IELTS is EZ is independent preparation. It is not affiliated with or endorsed by IELTS.')}</li>
          <li>{t('It is private preparation for the IELTS test, not an official or state-recognised course.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-sold">
        <h2 id="terms-sold">{t('2. What is sold')}</h2>
        <p>{t('Practice and guidance: {days} days of access for {price}, paid once.', { days, price })}</p>
        <ul className="policy-list">
          <li>{t('Every practice exercise and timed test, with band estimates. Reading and Listening practice has no limit.')}</li>
          <li>
            {t('{essays} essay assessments, {speaking} recorded Speaking assessments (up to 5 minutes each) and {live} live interviews with the AI examiner, with feedback (up to 15 minutes each).', {
              essays: PAID_ALLOWANCE.writing,
              speaking: PAID_ALLOWANCE.speaking,
              live: PAID_ALLOWANCE.live,
            })}
          </li>
          <li>{t('{mock} full mock exams, and the placement test once per account. Essays written in a mock exam or the placement test count towards the essay assessments.', { mock: PAID_ALLOWANCE.mock })}</li>
          <li>{t('Mr EZ, your personal AI tutor, and the practice in your personal study plan.')}</li>
          <li>{t('Mr EZ answers up to 40 chat messages and 60 lesson-help requests a day.')}</li>
          <li>{t('Each account has a fair daily safety limit, so the service stays available for everyone. If you reach it, you can carry on the next day.')}</li>
          <li>{t('Unused assessments expire at the end of the {days} days.', { days })}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-free">
        <h2 id="terms-free">{t('3. What stays free')}</h2>
        <ul className="policy-list">
          <li>{t('Every lesson is free: the explanations, worked examples, each lesson’s own short quiz and the vocabulary lists.')}</li>
          <li>{t('Lessons open once you are signed in to a free account.')}</li>
          <li>{t('Creating an account is free and needs no payment card. A free account never turns into a paid one by itself.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-made">
        <h2 id="terms-made">{t('4. How the agreement is made')}</h2>
        <ul className="policy-list">
          <li>{t('You accept this offer by paying for practice and guidance on the Plans page. The agreement is made when your payment is confirmed.')}</li>
          <li>{t('Your access starts as soon as the payment is confirmed. If you already have access, the new {days} days start when your current ones end.', { days })}</li>
          <li>{t('You pay on the payment company’s own page. Your card details never reach this site.')}</li>
          <li>{t('A receipt for each payment is on your Account page, together with the date your access ends.')}</li>
          <li>{t('{days} days of access. It ends on its own. Nothing renews, so you are never charged automatically.', { days })}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-refund" id="refunds">
        <h2 id="terms-refund">{t('5. Refunds')}</h2>
        <ul className="policy-list">
          <li>{t('You can ask for a refund at any time during your {days} days.', { days })}</li>
          <li>
            {t('We pay back the share of the price you have not used. The used share is the larger of two: the days of access that have started, out of {days}, and the AI assessments you have used (essays, recorded Speaking and live interviews), out of the {included} your purchase includes.', {
              days,
              included: REFUND_COUNTED_ASSESSMENTS,
            })}
          </li>
          <li>{t('The refund is the price multiplied by the unused share, rounded down to whole tenge.')}</li>
        </ul>
        <div className="legal-example">
          <h3>{t('An example')}</h3>
          <ol>
            <li>{t('Day {day} of {days}: {percent}% of the days have started.', { day: ex.daysStarted, days: ex.days, percent: ex.daysPercent })}</li>
            <li>{t('{used} of {included} assessments used: {percent}%.', { used: ex.used, included: ex.included, percent: ex.usedAssessmentsPercent })}</li>
            <li>{t('The larger share, {percent}%, counts as used.', { percent: ex.usedPercent })}</li>
            <li>{t('Refund: {percent}% of {price}, which is {refund}.', { percent: ex.refundPercent, price: money(ex.price), refund: money(ex.refund) })}</li>
          </ol>
        </div>
        <ul className="policy-list">
          <li>{t('When the refund is made, your access and any assessments left on it end. Everything you saved stays on your account, and your lessons stay open.')}</li>
          <li>{t('The money goes back to the card or account you paid with, within {n} working days of your request being accepted. Your bank may take a few more days to show it.', { n: REFUND_WORKING_DAYS })}</li>
          <li>{t('Once your {days} days have ended, there is nothing left to refund.', { days })}</li>
        </ul>
        <h3>{t('How to ask for a refund')}</h3>
        <ul className="policy-list">
          {SUPPORT_ENABLED && (
            <li>
              {t('Through the support form:')} <a href={refundHref}>{t('ask for a refund')}</a>
            </li>
          )}
          {email && (
            <li>
              {t('Or by email to the seller:')} <SellerValue {...email} />
            </li>
          )}
          <li>{t('Please give the email address of your account, so we can find your purchase.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-complaints">
        <h2 id="terms-complaints">{t('6. Questions and complaints')}</h2>
        <ul className="policy-list">
          <li>{t('Write to us through the support form or by email. A person reads every message and replies by email.')}</li>
          <li>{t('We answer every complaint in writing, with our reasons, within {n} calendar days.', { n: COMPLAINT_ANSWER_DAYS })}</li>
          <li>
            {t('If you are not satisfied with our answer, you can turn to the consumer protection authority:')}{' '}
            <a href={CONSUMER_AUTHORITY.url} target="_blank" rel="noopener noreferrer">
              {t(CONSUMER_AUTHORITY.name)}
            </a>
          </li>
          <li>{t('You also have the right to go to court.')}</li>
        </ul>
        <SupportLink reason="terms" lead={null} className="policy-support" />
      </section>

      <section className="policy-section" aria-labelledby="terms-ai">
        <h2 id="terms-ai">{t('7. Artificial intelligence (AI)')}</h2>
        <ul className="policy-list">
          <li>{t('The feedback on essays and recorded Speaking, Mr EZ and the live examiner are AI. The live examiner’s voice is an AI voice, not a real person.')}</li>
          <li>{t('AI band scores are estimates against the public IELTS band descriptors. They are not official IELTS results and do not guarantee your test score.')}</li>
          <li>
            {t('If you disagree with an AI result, a person will review it on request.')}
            {SUPPORT_ENABLED && (
              <>
                {' '}
                <a href={reviewHref}>{t('Ask for a review')}</a>
              </>
            )}
          </li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-age">
        <h2 id="terms-age">{t('8. Students under 18')}</h2>
        <ul className="policy-list">
          <li>{t('If you are under 18, a parent or guardian must agree to the purchase. Please read this page with them before you buy.')}</li>
          <li>{t('The profile of a student under 18 also asks for a parent or guardian’s details and agreement.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-changes">
        <h2 id="terms-changes">{t('9. Changes to this offer')}</h2>
        <ul className="policy-list">
          <li>{t('The seller may update this offer. The version date at the top of this page shows which version is in force.')}</li>
          <li>{t('A purchase follows the version in force on the day you paid. A change never raises the price of a purchase already made and never takes away what it includes.')}</li>
        </ul>
      </section>

      <section className="policy-section" aria-labelledby="terms-ends">
        <h2 id="terms-ends">{t('10. When your access ends')}</h2>
        <ul className="policy-list">
          <li>{t('Everything you saved stays on your account: your results, essays, progress and study plan.')}</li>
          <li>{t('Your lessons stay open with your free account. Practice, tests, AI feedback and Mr EZ need practice and guidance again.')}</li>
        </ul>
        <p className="policy-foot">
          <a href={withBase('/privacy')}>{t('How we handle your information')}</a>
          <a href={withBase('/help')}>{t('How the platform works')}</a>
        </p>
      </section>
    </article>
  );
}

/* ── The open site: the free-site terms ────────────────────────────────── */

function OpenSiteTerms() {
  const { t } = useT();
  const money = usePrice();
  const plan = AVAILABLE_PAID_PLANS[0]!;
  const price = money(plan.amount);
  const operator = publishedOperator();

  return (
    <article className="policy">
      <header className="policy-head">
        <p className="policy-eyebrow">{t('Terms of use')}</p>
        <h1>{t('The terms, in plain words')}</h1>
        <p className="policy-lede">{t('What a free account includes, what practice and guidance add, and what happens when your access ends.')}</p>
        <p className="policy-updated">{t('Updated 2 October 2026')}</p>
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
          <li>{t('You can ask for a refund at any time during the 30 days. We pay back the share you have not used.')}</li>
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
