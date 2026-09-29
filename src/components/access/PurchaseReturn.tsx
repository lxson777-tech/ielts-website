/* /plans/return?order=<id>: where the payment provider sends the student
   back. Builder A2, audit remediation F01.

   It asks the payments Worker about THIS order (GET /order/<id>, as the
   signed-in student) every two seconds for up to thirty, then says what
   happened in plain words. It never decides that a payment happened: the
   order is "paid" only when the server recorded the provider's confirmation.
   Reloading is safe, because the page only ever reads.

   On "paid" it asks for the student's access again (and nudges their other
   tabs), so the rest of the site opens without a manual refresh. */

import { useEffect, useRef, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { useTrial } from '../../lib/trial/react';
import { refreshAfterAccessChange } from '../../lib/trial/client';
import { signInHref } from '../../lib/auth/profile';
import { currentRoute } from '../../lib/auth/next';
import {
  RETURN_POLL_MS,
  formatDate,
  isOrderId,
  keepPolling,
  planTitle,
  returnView,
  type ReturnView,
} from './access-state';
import { fetchOrder } from './payments';
import { SimulatedBanner } from './AccessParts';
import '../../styles/access.css';

function orderFromAddress(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('order');
}

export default function PurchaseReturn() {
  const { t, locale } = useT();
  const trial = useTrial(30_000);
  const [orderId] = useState(orderFromAddress);
  const [view, setView] = useState<ReturnView>(() => (isOrderId(orderFromAddress()) ? { kind: 'confirming' } : { kind: 'bad-link' }));
  /** Bumped by "Check again" to start a fresh wait. */
  const [round, setRound] = useState(0);
  const [accessEndsAt, setAccessEndsAt] = useState<string | null>(null);
  const refreshed = useRef(false);

  const userId = trial.phase === 'ready' ? trial.userId : null;
  const signedOut = trial.phase === 'signed-out' || trial.phase === 'no-accounts';

  useEffect(() => {
    if (!isOrderId(orderId) || !userId) return;
    let stopped = false;
    let timer: number | undefined;
    const startedAt = Date.now();
    setView({ kind: 'confirming' });

    const look = async () => {
      const fetched = await fetchOrder(orderId.toLowerCase());
      if (stopped) return;
      const next = returnView(fetched, Date.now() - startedAt);
      setView(next);
      if (keepPolling(next)) timer = window.setTimeout(() => void look(), RETURN_POLL_MS);
    };
    void look();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId, userId, round]);

  /* Paid: ask for the student's access again, once, so Today and every
     locked page open straight away. The date shown is the account's whole
     paid access (a purchase while paid extends it), read back from the
     server; the order's own grant is the fallback. */
  useEffect(() => {
    if (view.kind !== 'paid' || refreshed.current) return;
    refreshed.current = true;
    void refreshAfterAccessChange().then((status) => {
      setAccessEndsAt(status?.paid?.endsAt ?? view.order.grant?.endsAt ?? null);
    });
  }, [view]);

  let body: React.ReactNode;
  if (view.kind === 'bad-link') {
    body = (
      <Panel
        title={t('We could not find this purchase')}
        text={t('This link does not name a purchase. Your plans and any purchases you made are in your account.')}
        primary={{ href: withBase('/plans'), label: t('Back to plans') }}
        secondary={{ href: withBase('/account#access'), label: t('Your account') }}
      />
    );
  } else if (signedOut) {
    body = (
      <Panel
        title={t('Sign in to see this purchase')}
        text={t('A purchase belongs to the account that made it. Sign in with that account and this page will check it.')}
        primary={{ href: signInHref(currentRoute()), label: t('Sign in') }}
      />
    );
  } else if (view.kind === 'confirming' || !userId) {
    body = (
      <section className="access-card access-confirming" aria-busy="true" aria-live="polite">
        <span className="access-spinner is-large" aria-hidden="true" />
        <h1>{t('Confirming your payment…')}</h1>
        <p>{t('This usually takes a few seconds. Please keep this page open.')}</p>
      </section>
    );
  } else if (view.kind === 'paid') {
    const until = accessEndsAt ?? view.order.grant?.endsAt ?? null;
    body = (
      <section className="access-card is-good" aria-labelledby="access-return-title">
        <span className="access-eyebrow">{t('Payment confirmed')}</span>
        <h1 id="access-return-title">{t('You’re in.')}</h1>
        <p>
          {until
            ? t('You have full access until {date}. Every lesson, test and practice tool is open.', { date: formatDate(until, locale) })
            : t('Your full access is open. Every lesson, test and practice tool is open.')}
        </p>
        <dl className="access-mini">
          <div>
            <dt>{t('Plan', undefined, 'purchase')}</dt>
            <dd>{t(planTitle(view.order.planId))}</dd>
          </div>
          {view.order.receiptNumber && (
            <div>
              <dt>{t('Receipt number')}</dt>
              <dd>{view.order.receiptNumber}</dd>
            </div>
          )}
        </dl>
        <div className="access-actions">
          <a className="access-buy" href={withBase('/dashboard')}>
            {t('Go to Today')}
          </a>
          <a className="trial-btn trial-quiet" href={withBase(`/account/receipt?order=${view.order.orderId}`)}>
            {t('View receipt')}
          </a>
        </div>
      </section>
    );
  } else if (view.kind === 'pending') {
    body = (
      <section className="access-card" aria-labelledby="access-return-title">
        <span className="access-eyebrow">{t(planTitle(view.order.planId))}</span>
        <h1 id="access-return-title">{t('We’re confirming your payment')}</h1>
        <p>
          {t('The payment provider has not confirmed it yet. If you paid, your access opens as soon as it does, on any device. If you closed the payment page before paying, you can start again from the plans page.')}
        </p>
        <div className="access-actions">
          <button type="button" className="access-buy" onClick={() => setRound((r) => r + 1)}>
            {t('Check again')}
          </button>
          <a className="trial-btn trial-quiet" href={withBase('/plans')}>
            {t('Back to plans')}
          </a>
        </div>
      </section>
    );
  } else if (view.kind === 'failed' || view.kind === 'cancelled') {
    body = (
      <Panel
        eyebrow={t(planTitle(view.order.planId))}
        title={view.kind === 'cancelled' ? t('You cancelled the payment') : t('Payment was not completed')}
        text={
          view.kind === 'cancelled'
            ? t('Payment was not completed. Your access has not changed.')
            : t('The payment did not go through. Your access has not changed.')
        }
        primary={{ href: withBase('/plans'), label: t('Try again') }}
        secondary={{ href: withBase('/dashboard'), label: t('Back to Today') }}
      />
    );
  } else if (view.kind === 'refunded') {
    body = (
      <Panel
        eyebrow={t(planTitle(view.order.planId))}
        title={t('This purchase was refunded')}
        text={t('The access it paid for has ended. Your results are kept.')}
        primary={{ href: withBase('/account#access'), label: t('Your account') }}
      />
    );
  } else if (view.kind === 'not-found') {
    body = (
      <Panel
        title={t('We could not find this purchase')}
        text={t('It is not on the account you are signed in with. If you bought with a different account, sign in with that one.')}
        primary={{ href: withBase('/account#access'), label: t('Your account') }}
        secondary={{ href: withBase('/plans'), label: t('Back to plans') }}
      />
    );
  } else {
    body = (
      <section className="access-card" aria-labelledby="access-return-title">
        <h1 id="access-return-title">{t('We could not check this purchase just now')}</h1>
        <p>{t('Nothing has changed on our side. If you paid, your access opens as soon as the payment is confirmed. Please try again.')}</p>
        <div className="access-actions">
          <button type="button" className="access-buy" onClick={() => setRound((r) => r + 1)}>
            {t('Try again')}
          </button>
          <a className="trial-btn trial-quiet" href={withBase('/plans')}>
            {t('Back to plans')}
          </a>
        </div>
      </section>
    );
  }

  return (
    <div className="trial-ui access-return">
      <SimulatedBanner />
      {body}
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  text,
  primary,
  secondary,
}: {
  eyebrow?: string;
  title: string;
  text: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="access-card" aria-labelledby="access-return-title">
      {eyebrow && <span className="access-eyebrow">{eyebrow}</span>}
      <h1 id="access-return-title">{title}</h1>
      <p>{text}</p>
      <div className="access-actions">
        <a className="access-buy" href={primary.href}>
          {primary.label}
        </a>
        {secondary && (
          <a className="trial-btn trial-quiet" href={secondary.href}>
            {secondary.label}
          </a>
        )}
      </div>
    </section>
  );
}
