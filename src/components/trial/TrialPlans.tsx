import AssessmentBalance from '../access/AssessmentBalance';
/* Full access: the approved prices, and buying them once payment is
   connected. Builder A2, audit remediation F01.

   Monthly 10,000 KZT and three months 25,000 KZT are approved (the numbers
   live in src/lib/access/plans.ts and the database). Alex decided on 29
   September 2026 that a purchase is a fixed period that simply ends: no
   automatic renewal, no refund after purchase (the free trial is the time to
   try).

   Two states:
   - PUBLIC_PAYMENTS_URL unset (or the open site): exactly the honest page
     that was here before. The buttons are plainly unavailable and the page
     says why. Nothing pretends to sell.
   - Set, on the gated build: the student's current access at the top, a Buy
     button per plan (signed-in only), a calm "Taking you to payment" while
     the browser leaves, plain-words problems with Try again, and any
     purchase they started and did not finish. The browser only ASKS for a
     checkout; access is recorded by the server when the provider confirms
     the payment, and read back from it. */

import PurchaseTerms from '../support/PurchaseTerms';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { useTrial } from '../../lib/trial/react';
import { signInHref } from '../../lib/auth/profile';
import { hasPaidAccess } from '../../lib/trial/status';
import { AVAILABLE_PAID_PLANS, PAID_AI_ALLOWANCE, THREE_MONTH_SAVING, type PaidPlan } from '../../lib/access/plans';
import { extendedUntil, formatDate, formatMoney } from '../access/access-state';
import { PURCHASE_ENABLED } from '../access/payments';
import {
  AccessStrip,
  InterruptedPurchase,
  SimulatedBanner,
  useCheckout,
  useOrders,
  type CheckoutState,
} from '../access/AccessParts';

export default function TrialPlans() {
  return PURCHASE_ENABLED ? <PlansWithPurchase /> : <PlansNotConnected />;
}

/* ── Payment not connected (today's page, unchanged in substance) ─────── */

function PlansNotConnected() {
  const { t, locale } = useT();
  const [oneMonth] = AVAILABLE_PAID_PLANS;
  return (
    <section className="trial-ui trial-plans" aria-labelledby="trial-plans-title">
      <h1 id="trial-plans-title">{t('Keep your momentum.')}</h1>
      <p className="trial-lead">{t('Choose more time for your IELTS preparation.')}</p>
      <div className="trial-prices">
        <article>
          <h2>{t('One month')}</h2>
          <p>
            <strong>{formatMoney(oneMonth.amount, oneMonth.currency, locale)}</strong> {t('total')}
          </p>
          <small>{t('The full course and every practice test for one month.')}</small>
          <button type="button" className="trial-btn" disabled>
            {t('Payment not connected yet')}
          </button>
        </article>

      </div>
      <p className="trial-fine">
        {t('Payment not connected yet')} {t(PAID_AI_ALLOWANCE)}
      </p>
      <a className="trial-btn" href={withBase('/dashboard')}>
        {t('Back to my trial')}
      </a>
    </section>
  );
}

/* ── Payment connected ────────────────────────────────────────────────── */

function PlansWithPurchase() {
  const { t } = useT();
  const trial = useTrial(30_000);
  const orders = useOrders(trial);
  const checkout = useCheckout();
  const signedIn = trial.phase === 'ready' || trial.phase === 'error';
  const paid = trial.status ? hasPaidAccess(trial.status, trial.now) : false;

  return (
    <section className="trial-ui trial-plans access-plans" aria-labelledby="trial-plans-title">
      <SimulatedBanner />
      <AccessStrip
        trial={trial}
        aside={
          signedIn ? (
            <a className="trial-btn" href={withBase('/account#access')}>
              {t('Purchase history')}
            </a>
          ) : null
        }
      />

      <h1 id="trial-plans-title">{paid ? t('Add more time.') : t('Keep your momentum.')}</h1>
      <p className="trial-lead">{t('Choose more time for your IELTS preparation.')}</p>

      {trial.phase === 'ready' && <InterruptedPurchase trial={trial} orders={orders} checkout={checkout} />}

      {checkout.busyPlan && (
        <div className="access-redirect" role="status" aria-live="polite">
          <span className="access-spinner" aria-hidden="true" />
          <div>
            <b>{t('Taking you to payment…')}</b>
            <span>{t('This takes a few seconds. Please keep this page open.')}</span>
          </div>
        </div>
      )}

      {checkout.problem && (
        <div className="access-alert" role="alert">
          <p>{checkout.problem.message}</p>
          <button type="button" className="trial-btn" onClick={() => void checkout.buy(checkout.problem!.planId)}>
            {t('Try again')}
          </button>
        </div>
      )}

      <div className="trial-prices">
        {AVAILABLE_PAID_PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} trial={trial} checkout={checkout} />
        ))}
      </div>

      {/* The purchase facts, the Terms and Privacy links and the way to ask a
          person, in one block (Builder E's wording, Alex's 29 September
          decisions). */}
      <AssessmentBalance /><PurchaseTerms />

      <a className="trial-btn" href={withBase('/dashboard')}>
        {paid ? t('Back to Today') : t('Back to my trial')}
      </a>
    </section>
  );
}

function PlanCard({ plan, trial, checkout }: { plan: PaidPlan; trial: ReturnType<typeof useTrial>; checkout: CheckoutState }) {
  const { t, locale } = useT();
  const until = trial.status ? extendedUntil(trial.status, plan.days, trial.now) : null;
  const busy = checkout.busyPlan !== null;
  const summary =
    plan.id === 'month-3'
      ? t('Save {amount} compared with three monthly purchases.', { amount: formatMoney(THREE_MONTH_SAVING, 'KZT', locale) })
      : t(plan.summary);
  const buyLabel = plan.id === 'month-3' ? t('Buy three months') : t('Buy one month');

  let action: React.ReactNode;
  if (trial.phase === 'signed-out') {
    action = (
      <a className="access-buy" href={signInHref('/plans')}>
        {t('Sign in to buy')}
      </a>
    );
  } else {
    const ready = trial.phase === 'ready';
    action = (
      <button
        type="button"
        className="access-buy"
        disabled={!ready || busy}
        aria-busy={checkout.busyPlan === plan.id ? 'true' : undefined}
        onClick={() => void checkout.buy(plan.id)}
      >
        {checkout.busyPlan === plan.id ? t('Taking you to payment…') : buyLabel}
      </button>
    );
  }

  return (
    <article>
      <h2>{t(plan.title)}</h2>
      <p>
        <strong>{formatMoney(plan.amount, plan.currency, locale)}</strong> {t('total')}
      </p>
      <small>{summary}</small>
      {until && (
        <small className="access-extends">
          {t('Adds to your current access, which then runs until {date}.', { date: formatDate(until, locale) })}
        </small>
      )}
      {action}
    </article>
  );
}
