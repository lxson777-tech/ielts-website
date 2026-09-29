/* /account/receipt?order=<id>: a clean, printable receipt for one paid
   order. Builder A2, audit remediation F01.

   Read from the database as the signed-in student (access_order), so a
   receipt for someone else's order simply does not exist here. A refunded
   order keeps its receipt and says it was refunded. An order paid through
   the SIMULATED provider says so in the receipt itself, because no money
   moved.

   The seller's name and details: NOT shown. Alex has not published operator
   details yet (29 September 2026), and nothing may be invented.
   TODO(Builder E / orchestrator): once src/lib/operator.ts exists, render
   its seller name and details in the marked block below, and only from it. */

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { onAccountChange } from '../../lib/auth/lifecycle';
import { isAuthConfigured } from '../../lib/auth/supabase';
import { signInHref } from '../../lib/auth/profile';
import { currentRoute } from '../../lib/auth/next';
import { isOrderId, receiptFor, receiptRows, type OrderFetch } from './access-state';
import { readOrder } from './payments';
import '../../styles/access.css';

export default function Receipt() {
  const { t, locale } = useT();
  const [orderId] = useState(() => new URLSearchParams(window.location.search).get('order'));
  const [user, setUser] = useState<User | null>(null);
  const [known, setKnown] = useState(false);
  const [fetched, setFetched] = useState<OrderFetch | null>(null);
  const [round, setRound] = useState(0);

  useEffect(
    () =>
      onAccountChange((state) => {
        setUser(state.user);
        setKnown(state.known || !isAuthConfigured());
      }),
    [],
  );

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId || !isOrderId(orderId)) return;
    let stopped = false;
    setFetched(null);
    void readOrder(orderId.toLowerCase()).then((result) => {
      if (!stopped) setFetched(result);
    });
    return () => {
      stopped = true;
    };
  }, [userId, orderId, round]);

  const back = (
    <a className="trial-btn trial-quiet" href={withBase('/account#access')}>
      {t('Back to your account')}
    </a>
  );

  let content: React.ReactNode;
  if (!isOrderId(orderId)) {
    content = <Message title={t('We could not find this receipt')} text={t('This link does not name a purchase.')} action={back} />;
  } else if (!known) {
    content = <Loading />;
  } else if (!user) {
    content = (
      <Message
        title={t('Sign in to see this receipt')}
        text={t('A receipt belongs to the account that made the purchase.')}
        action={
          <a className="access-buy" href={signInHref(currentRoute())}>
            {t('Sign in')}
          </a>
        }
      />
    );
  } else if (!fetched) {
    content = <Loading />;
  } else if (!fetched.ok) {
    content =
      fetched.code === 'not-found' ? (
        <Message
          title={t('We could not find this receipt')}
          text={t('It is not on the account you are signed in with.')}
          action={back}
        />
      ) : (
        <Message
          title={t('We could not load this receipt just now')}
          text={t('Nothing has changed. Please try again.')}
          action={
            <button type="button" className="access-buy" onClick={() => setRound((r) => r + 1)}>
              {t('Try again')}
            </button>
          }
        />
      );
  } else {
    const receipt = receiptFor(fetched.order);
    if (!receipt) {
      content = (
        <Message
          title={t('There is no receipt for this purchase')}
          text={t('A receipt is issued once a payment is confirmed. This purchase was not paid.')}
          action={back}
        />
      );
    } else {
      const rows = receiptRows(receipt, t, locale);
      content = (
        <>
          <article className="access-receipt" aria-labelledby="access-receipt-title">
            {receipt.simulated && (
              <p className="access-simulated is-receipt" role="note">
                <strong>{t('SIMULATED payment')}</strong>
                <span>{t('No money was taken. This receipt is a local test, not a real one.')}</span>
              </p>
            )}
            <header>
              <span className="access-eyebrow">IELTS is EZ</span>
              <h1 id="access-receipt-title">{t('Receipt')}</h1>
              {receipt.status === 'refunded' && <p className="access-receipt-refunded">{t('This purchase was refunded.')}</p>}
            </header>
            <dl>
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              {user.email && (
                <div>
                  <dt>{t('Account')}</dt>
                  <dd>{user.email}</dd>
                </div>
              )}
            </dl>
            {/* SELLER BLOCK: intentionally empty. Render the seller's name and
                details here ONLY from src/lib/operator.ts (Builder E) once it
                exists. Never type them in here. */}
          </article>
          <div className="access-actions access-no-print">
            <button type="button" className="access-buy" onClick={() => window.print()}>
              {t('Print or save as PDF')}
            </button>
            {back}
          </div>
        </>
      );
    }
  }

  return <div className="trial-ui access-receipt-page">{content}</div>;
}

function Loading() {
  const { t } = useT();
  return (
    <section className="access-card" aria-busy="true">
      <div className="trial-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="sr-only">{t('Loading…')}</p>
    </section>
  );
}

function Message({ title, text, action }: { title: string; text: string; action: React.ReactNode }) {
  return (
    <section className="access-card" aria-labelledby="access-receipt-message">
      <h1 id="access-receipt-message">{title}</h1>
      <p>{text}</p>
      <div className="access-actions">{action}</div>
    </section>
  );
}
