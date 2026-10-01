/* What a paid page shows, in the gated build, to an account without
   practice and guidance: the page's own title, one calm sentence, and a
   button that opens the upgrade pop-up (the free-account model,
   docs/paid-access/FREE-ACCOUNT-MODEL.md). Reached by a direct link or a
   new tab; a click inside the site opens the pop-up before getting here.

   Presentational: the caller decides from the account (src/lib/access/
   tier.ts). Also used for "Your practice and guidance has ended", with
   every lesson and result still there. */

import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { signInHref } from '../../lib/auth/profile';
import { currentRoute } from '../../lib/auth/next';
import { openUpgrade } from '../../lib/access/upgrade';
import { UPGRADE_REASON } from '../../lib/access/upgrade';
import type { PaidFeature } from '../../lib/access/model';
import SupportLink from '../support/SupportLink';
import './upgrade.css';

export default function PaidLocked({
  feature,
  title,
  ended = false,
  signedOut = false,
  variant = 'page',
}: {
  feature: PaidFeature;
  /** The page's own title (English registry text, translated here). */
  title: string;
  /** Practice and guidance was running and has ended. */
  ended?: boolean;
  signedOut?: boolean;
  variant?: 'page' | 'full';
}) {
  const { t } = useT();
  return (
    <section
      className={`trial-ui trial-gate paid-locked${variant === 'full' ? ' is-full' : ''}`}
      aria-labelledby="paid-locked-title"
      data-paid-locked={feature}
    >
      <div className="trial-card">
        <span className="trial-eyebrow">{t(title)}</span>
        <h2 id="paid-locked-title">
          {ended ? t('Your practice and guidance has ended') : t('Part of practice and guidance')}
        </h2>
        <p className="paid-locked-lead">
          {ended
            ? t('Every lesson stays open, and your results are saved. Choose practice and guidance again to continue.')
            : t(UPGRADE_REASON[feature])}
        </p>
        <div className="trial-actions">
          <button
            type="button"
            className="trial-btn trial-primary"
            onClick={() => openUpgrade(feature, { from: currentRoute() })}
            data-paid-locked-open
          >
            {t('See what practice and guidance adds')}
          </button>
          {signedOut ? (
            <a className="trial-btn" href={signInHref(currentRoute())}>
              {t('Sign in')}
            </a>
          ) : (
            <a className="trial-btn" href={withBase('/learn')}>
              {t('Keep reading lessons')}
            </a>
          )}
        </div>
        <SupportLink reason="locked" lead="hand" />
      </div>
    </section>
  );
}
