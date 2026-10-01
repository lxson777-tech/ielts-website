/* Pieces the purchase and access screens share. Builder A2, audit F01.

   Presentational plus two small hooks: the student's orders, and starting a
   checkout. What a student may open is never decided here: the server's
   trial status (with its `paid` key) is read through useTrial(), and orders
   come from the database as the student. */

import { useCallback, useEffect, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { refreshAfterAccessChange } from '../../lib/trial/client';
import type { TrialHookView } from '../../lib/trial/react';
import type { PaymentOrder } from '../../lib/access/plans';
import {
  accessSummary,
  checkoutProblem,
  describeAccess,
  formatDate,
  interruptedOrder,
  planTitle,
  type OrderFetch,
} from './access-state';
import { PAYMENTS_SIMULATED, PAYMENTS_URL, PURCHASE_ENABLED, fetchOrder, listOrders, readOrder, startCheckout } from './payments';
import '../../styles/access.css';

/* ── SIMULATED banner ─────────────────────────────────────────────────── */

export function SimulatedBanner() {
  const { t } = useT();
  if (!PAYMENTS_SIMULATED) return null;
  return (
    <p className="access-simulated" role="note">
      <strong>{t('SIMULATED payments')}</strong>
      <span>{t('This is a local test. No money is taken and nothing here is a real purchase.')}</span>
    </p>
  );
}

/* ── The student's access, in one strip ───────────────────────────────── */

export function AccessStrip({ trial, aside }: { trial: TrialHookView; aside?: React.ReactNode }) {
  const { t, locale } = useT();
  let title: string;
  let detail: string;
  let tone = '';
  let action: React.ReactNode = aside ?? null;
  if (trial.phase === 'checking') {
    return (
      <div className="trial-status access-strip is-checking" aria-busy="true">
        <div className="trial-skeleton" aria-hidden="true">
          <span />
          <span />
        </div>
        <p className="sr-only">{t('Checking your access…')}</p>
      </div>
    );
  }
  if (trial.phase === 'signed-out') {
    title = t('You are not signed in');
    detail = t('Sign in to buy. Your access belongs to your account and works on every device.');
  } else if (trial.phase === 'error' || trial.phase === 'no-accounts' || !trial.status) {
    title = t('We could not check your access');
    detail = t('Your purchases and your work are safe. Please try again.');
    tone = ' is-ended';
    action = (
      <button type="button" className="trial-btn" onClick={() => void refreshAfterAccessChange()}>
        {t('Try again')}
      </button>
    );
  } else {
    const summary = accessSummary(trial.status, trial.now);
    ({ title, detail } = describeAccess(summary, t, locale));
    if (summary.kind === 'paid-ended') tone = ' is-ended';
    if (summary.kind === 'paid' || summary.kind === 'complimentary') tone = ' is-paid';
  }
  return (
    <div className={`trial-status access-strip${tone}`} role="status">
      <div>
        <b>{title}</b>
        <span>{detail}</span>
      </div>
      {action}
    </div>
  );
}

/* ── The student's orders ─────────────────────────────────────────────── */

export interface OrdersState {
  orders: PaymentOrder[] | null;
  failed: boolean;
  reload: () => Promise<void>;
}

/** The signed-in student's orders, loaded when their status is known and
    again whenever that status changes (a purchase confirmed, a refund). */
export function useOrders(trial: TrialHookView): OrdersState {
  const [orders, setOrders] = useState<PaymentOrder[] | null>(null);
  const [failed, setFailed] = useState(false);
  const userId = trial.phase === 'ready' ? trial.userId : null;
  const paidKey = trial.status?.paid ? `${trial.status.paid.startsAt}|${trial.status.paid.endsAt}` : 'none';

  const reload = useCallback(async () => {
    if (!userId) return;
    const next = await listOrders();
    if (next) {
      setOrders(next);
      setFailed(false);
    } else setFailed(true);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setOrders(null);
      return;
    }
    void reload();
  }, [userId, paidKey, reload]);

  return { orders, failed, reload };
}

/* ── Starting a checkout ──────────────────────────────────────────────── */

export interface CheckoutState {
  /** The plan whose payment page is opening. */
  busyPlan: string | null;
  problem: { planId: string; message: string } | null;
  buy: (planId: string) => Promise<void>;
  clear: () => void;
}

export function useCheckout(): CheckoutState {
  const { t } = useT();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [problem, setProblem] = useState<CheckoutState['problem']>(null);

  /* Coming back with the browser's Back button restores this page as it
     was, "Taking you to payment" and all. Start fresh instead. */
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusyPlan(null);
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  const buy = useCallback(
    async (planId: string) => {
      if (!PURCHASE_ENABLED) return;
      setProblem(null);
      setBusyPlan(planId);
      const result = await startCheckout(planId);
      if (result.ok) {
        // Stay "busy" while the browser leaves for the payment page.
        window.location.assign(result.url);
        return;
      }
      setBusyPlan(null);
      setProblem({ planId, message: checkoutProblem(result.code, t) });
    },
    [t],
  );

  return { busyPlan, problem, buy, clear: () => setProblem(null) };
}

/* ── A purchase the student did not see through ───────────────────────── */

type CheckOutcome = null | 'checking' | 'still-open' | 'not-completed' | 'error';

/** "You started buying one month and did not finish": check the order
    again, or start a new payment. Shown on /plans and /account. */
export function InterruptedPurchase({
  trial,
  orders,
  onChanged,
  checkout,
}: {
  trial: TrialHookView;
  orders: OrdersState;
  onChanged?: () => void;
  checkout: CheckoutState;
}) {
  const { t, locale } = useT();
  const [outcome, setOutcome] = useState<CheckOutcome>(null);
  const [confirmed, setConfirmed] = useState<PaymentOrder | null>(null);
  const order = orders.orders ? interruptedOrder(orders.orders, trial.now) : null;

  if (confirmed) {
    return (
      <div className="access-notice is-good" role="status">
        <div>
          <b>{t('Payment confirmed')}</b>
          <span>
            {confirmed.grant
              ? t('Full access until {date}', { date: formatDate(confirmed.grant.endsAt, locale) })
              : t('Your access has been updated.')}
          </span>
        </div>
      </div>
    );
  }
  if (!order) {
    if (outcome === 'not-completed') {
      return (
        <div className="access-notice" role="status">
          <div>
            <b>{t('That payment was not completed')}</b>
            <span>{t('Your access has not changed. You can choose a plan again whenever you like.')}</span>
          </div>
        </div>
      );
    }
    return null;
  }

  async function checkAgain(id: string) {
    setOutcome('checking');
    // The Worker when it is there (it is what the return page asks); the
    // database directly otherwise, which reports the same order.
    const fetched: OrderFetch = PAYMENTS_URL ? await fetchOrder(id) : await readOrder(id);
    if (!fetched.ok) {
      setOutcome('error');
      return;
    }
    const status = fetched.order.status;
    if (status === 'paid') {
      setConfirmed(fetched.order);
      await refreshAfterAccessChange();
      await orders.reload();
      onChanged?.();
      return;
    }
    if (status === 'created' || status === 'pending') {
      setOutcome('still-open');
      return;
    }
    setOutcome('not-completed');
    await orders.reload();
  }

  const started = formatDate(order.createdAt, locale);
  const busy = outcome === 'checking' || checkout.busyPlan !== null;
  return (
    <div className="access-notice" role="region" aria-labelledby="access-interrupted-title">
      <div>
        <b id="access-interrupted-title">{t('You have an unfinished purchase')}</b>
        <span>
          {t('{plan}, started on {date}. If you closed the payment page, you can check it again or start again.', {
            plan: t(planTitle(order.planId)),
            date: started,
          })}
        </span>
        {outcome === 'still-open' && (
          <span className="access-notice-note" role="status">
            {t('We have not had a confirmation for it yet. If you already paid, give it a few minutes and check again. If you did not finish paying, start again.')}
          </span>
        )}
        {outcome === 'error' && (
          <span className="access-notice-note" role="alert">
            {t('We could not check it just now. Nothing has changed. Please try again.')}
          </span>
        )}
      </div>
      <div className="access-notice-actions">
        <button type="button" className="trial-btn" disabled={busy} onClick={() => void checkAgain(order.orderId)}>
          {outcome === 'checking' ? t('Checking…') : t('Check again')}
        </button>
        {PURCHASE_ENABLED && (
          <button type="button" className="trial-btn trial-quiet" disabled={busy} onClick={() => void checkout.buy(order.planId)}>
            {checkout.busyPlan === order.planId ? t('Taking you to payment…') : t('Start again')}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Links that sit beside every purchase ─────────────────────────────── */

export function PurchaseLinks() {
  const { t } = useT();
  return (
    <p className="access-links">
      <a href={withBase('/terms')}>{t('Terms of use')}</a>
      <span aria-hidden="true">·</span>
      <a href={withBase('/privacy')}>{t('Privacy')}</a>
    </p>
  );
}
