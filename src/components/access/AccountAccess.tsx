/* "Your access" on /account. Builder A2, audit remediation F01.

   The student's access right now and when it ends (from the server's trial
   status and its `paid` key), what full access includes, any purchase they
   started and did not finish, and every purchase with its status and a
   receipt. Only on the gated build (PUBLIC_ACCESS_MODE=trial); the open site
   sells nothing and shows nothing here. */

import { useEffect, useRef } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { useTrial } from '../../lib/trial/react';
import { ACCESS_MODE } from '../../lib/trial/mode';
import { PAID_AI_ALLOWANCE } from '../../lib/access/plans';
import { accessSummary, formatDate, formatMoney, hasReceipt, orderStatusLabel, planTitle } from './access-state';
import { AccessStrip, InterruptedPurchase, useCheckout, useOrders } from './AccessParts';

export default function AccountAccess() {
  if (ACCESS_MODE !== 'trial') return null;
  return <AccountAccessInner />;
}

function AccountAccessInner() {
  const { t, locale } = useT();
  const trial = useTrial(30_000);
  const orders = useOrders(trial);
  const checkout = useCheckout();
  const scrolled = useRef(false);
  /* /account#access (from /plans and the return page): the section appears
     only once the account is known, after the browser has already tried to
     jump to it, so jump once it is there. */
  const visible = trial.phase === 'ready' || trial.phase === 'error' || trial.phase === 'checking';
  useEffect(() => {
    if (!visible || scrolled.current || window.location.hash !== '#access') return;
    scrolled.current = true;
    document.getElementById('access')?.scrollIntoView({ block: 'start' });
  }, [visible]);
  if (trial.phase === 'signed-out' || trial.phase === 'no-accounts' || trial.phase === 'off') return null;

  const summary = trial.status ? accessSummary(trial.status, trial.now) : null;
  const cta =
    summary?.kind === 'paid' ? t('Add more time') : summary?.kind === 'paid-ended' ? t('Buy access again') : t('View plans');

  return (
    <section id="access" className="acct-settings access-account" aria-labelledby="access-account-title">
      <div className="acct-settings-head">
        <div>
          <h2 id="access-account-title">{t('Your access')}</h2>
          <p>{t('What your account can open, and every purchase you have made.')}</p>
        </div>
      </div>

      <div className="acct-panel trial-ui access-account-panel">
        <AccessStrip
          trial={trial}
          aside={
            <a className="access-buy is-compact" href={withBase('/plans')}>
              {cta}
            </a>
          }
        />
        <p className="access-includes">
          <span>{t('Full access includes')}</span> {t('The full course and every practice test.')} {t(PAID_AI_ALLOWANCE)}
        </p>

        {trial.phase === 'ready' && <InterruptedPurchase trial={trial} orders={orders} checkout={checkout} />}
        {checkout.problem && (
          <div className="access-alert" role="alert">
            <p>{checkout.problem.message}</p>
          </div>
        )}

        <h3 className="access-history-title">{t('Purchase history')}</h3>
        {orders.failed && !orders.orders ? (
          <div className="access-alert" role="alert">
            <p>{t('We could not load your purchases just now. Please try again.')}</p>
            <button type="button" className="trial-btn" onClick={() => void orders.reload()}>
              {t('Try again')}
            </button>
          </div>
        ) : orders.orders === null ? (
          <div className="trial-skeleton" aria-hidden="true">
            <span />
            <span />
          </div>
        ) : orders.orders.length === 0 ? (
          <p className="access-empty">{t('No purchases yet.')}</p>
        ) : (
          <ul className="access-history">
            {orders.orders.map((order) => (
              <li key={order.orderId} data-status={order.status}>
                <div className="access-history-main">
                  <b>{t(planTitle(order.planId))}</b>
                  <span>{formatDate(order.paidAt ?? order.createdAt, locale)}</span>
                </div>
                <span className="access-history-amount">{formatMoney(order.amount, order.currency, locale)}</span>
                <span className={`access-badge is-${order.status}`}>{t(orderStatusLabel(order.status))}</span>
                <span className="access-history-receipt">
                  {hasReceipt(order) ? (
                    <a href={withBase(`/account/receipt?order=${order.orderId}`)}>{t('Receipt')}</a>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
