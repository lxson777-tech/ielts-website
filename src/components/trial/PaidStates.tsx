/* The two in-between screens of paid material in the gated build: while it
   arrives through the content gate, and when it could not be fetched. The
   same calm card as every other gate screen (TrialBlock), with its own
   words: nothing here is about the trial. Presentational only. */

import { useT } from '../../lib/i18n/react';
import { signInHref } from '../../lib/auth/profile';
import { currentRoute } from '../../lib/auth/next';
import type { PackFailure } from '../../lib/trial/packs';

export function PaidLoading({ full = false }: { full?: boolean }) {
  const { t } = useT();
  return (
    <section className={`trial-ui trial-gate${full ? ' is-full' : ''}`} aria-busy="true" aria-live="polite">
      <div className="trial-card">
        <div className="trial-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="sr-only">{t('Loading…')}</p>
      </div>
    </section>
  );
}

export function PaidFailed({ reason, onRetry, full = false }: { reason: PackFailure | 'error'; onRetry: () => void; full?: boolean }) {
  const { t } = useT();
  if (reason === 'signed-out') {
    return (
      <section className={`trial-ui trial-gate${full ? ' is-full' : ''}`} aria-labelledby="paid-failed-title">
        <div className="trial-card">
          <h2 id="paid-failed-title">{t('Please sign in again')}</h2>
          <p>{t('Your session has expired. Sign in and this page opens again, with your access and your work as they were.')}</p>
          <div className="trial-actions">
            <a className="trial-btn trial-primary" href={signInHref(currentRoute())}>
              {t('Sign in')}
            </a>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className={`trial-ui trial-gate${full ? ' is-full' : ''}`} aria-labelledby="paid-failed-title" role="alert">
      <div className="trial-card">
        <h2 id="paid-failed-title">{t('This page could not be loaded just now')}</h2>
        <p>
          {reason === 'offline'
            ? t('You seem to be offline. Your access and your work are safe; try again once you are connected.')
            : t('Your access and your work are safe. Please try again in a moment.')}
        </p>
        <div className="trial-actions">
          <button type="button" className="trial-btn trial-primary" onClick={onRetry}>
            {t('Try again')}
          </button>
        </div>
      </div>
    </section>
  );
}
