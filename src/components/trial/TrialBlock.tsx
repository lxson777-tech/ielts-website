/* What a student sees, in the gated build, while their access is being
   checked, when it could not be checked, or instead of something their
   account does not open. One wording for lessons, tests and trainers, so the
   same situation always reads the same way.

   The free-account model (Alex, 1 October 2026; docs/paid-access/
   FREE-ACCOUNT-MODEL.md) RETIRED THE TRIAL: nothing here offers one any
   more. A free account reads every lesson; anything paid is "part of
   practice and guidance", and its button opens the upgrade pop-up
   (src/components/access/UpgradeDialog.tsx). The old trial reasons are kept
   as names so an older caller still compiles, and all read as that.

   Presentational only: the decision is made by the caller from the server's
   answer (src/lib/access/tier.ts). */

import type { ReactNode } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { refreshTrial, type TrialView } from '../../lib/trial/client';
import { paidAccessEnded } from '../../lib/trial/status';
import { signInHref, signUpHref } from '../../lib/auth/profile';
import { currentRoute } from '../../lib/auth/next';
import { openUpgrade } from '../../lib/access/upgrade';
import type { PaidFeature } from '../../lib/access/model';
import SupportLink from '../support/SupportLink'; // [E trust]

export type TrialBlockReason =
  | 'checking'
  | 'signed-out'
  | 'no-accounts'
  | 'error-offline'
  | 'error-server'
  | 'locked'
  /** Practice and guidance (paid or complimentary) has ended. Every lesson
      stays open and every result is kept. */
  | 'paid-ended'
  /* Retired with the trial; each now reads as 'locked'. */
  | 'no-trial'
  | 'ended'
  | 'speaking-unavailable'
  | 'test-used'
  | 'assessment-used'
  | 'test-other-in-progress'
  | 'test-ended';

/** The reason that comes from the account and the connection, before the
    page itself is considered. Null when the server has answered. */
export function accountBlock(trial: TrialView): TrialBlockReason | null {
  if (trial.phase === 'checking') return 'checking';
  if (trial.phase === 'signed-out') return 'signed-out';
  if (trial.phase === 'no-accounts') return 'no-accounts';
  if (trial.phase === 'error') return trial.failure === 'offline' ? 'error-offline' : 'error-server';
  if (!trial.status) return 'checking';
  return null;
}

/** True when this account had practice and guidance and it ran out. */
export function practiceEnded(trial: TrialView): boolean {
  return trial.status !== null && paidAccessEnded(trial.status, Date.now() + trial.offsetMs);
}

export default function TrialBlock({
  reason,
  title,
  feature = 'test',
  variant = 'page',
}: {
  reason: TrialBlockReason;
  /** The lesson's or test's own title, kept on screen. English registry
      text; translated here like every other title. */
  title: string;
  /** Kept for older callers; the paper name is in the title. */
  section?: string;
  /** What the locked page is part of, for the upgrade pop-up's lead. */
  feature?: PaidFeature;
  /** 'page' sits inside the workspace; 'full' fills a bare test page. */
  variant?: 'page' | 'full';
}) {
  const { t } = useT();
  const shell = `trial-ui trial-gate${variant === 'full' ? ' is-full' : ''}`;

  if (reason === 'checking') {
    return (
      <section className={shell} aria-busy="true" aria-live="polite">
        <div className="trial-card">
          <div className="trial-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="sr-only">{t('Checking your access…')}</p>
        </div>
      </section>
    );
  }

  const upgrade = (
    <button type="button" className="trial-btn trial-primary" onClick={() => openUpgrade(feature, { from: currentRoute() })}>
      {t('See what practice and guidance adds')}
    </button>
  );
  const lessons = (
    <a className="trial-btn" href={withBase('/learn')}>
      {t('Keep reading lessons')}
    </a>
  );

  let heading = '';
  let body = '';
  let actions: ReactNode = null;
  switch (reason) {
    case 'signed-out':
      heading = t('Sign in to continue');
      body = t('Your lessons, results and access belong to your account, so they are the same on every device.');
      actions = (
        <>
          {/* The sign-in page brings the student straight back here. Only
              ever shown in the browser (the server renders "checking"). */}
          <a className="trial-btn trial-primary" href={signInHref(currentRoute())}>
            {t('Sign in')}
          </a>
          <a className="trial-btn" href={signUpHref(currentRoute())}>
            {t('Create a free account')}
          </a>
        </>
      );
      break;
    case 'no-accounts':
      heading = t('Accounts are not available on this build');
      body = t('Lessons and practice need an account, and accounts are not configured here.');
      break;
    case 'error-offline':
    case 'error-server':
      heading = t('We could not check your access');
      body =
        reason === 'error-offline'
          ? t('You seem to be offline. Your access and your work are safe; this page opens again once you are connected.')
          : t('Something went wrong on our side. Your access and your work are safe. Please try again.');
      actions = (
        <button type="button" className="trial-btn trial-primary" onClick={() => void refreshTrial()}>
          {t('Try again')}
        </button>
      );
      break;
    case 'paid-ended':
      heading = t('Your practice and guidance has ended');
      body = t('Every lesson stays open, and your results are saved. Choose practice and guidance again to continue.');
      actions = (
        <>
          {upgrade}
          <a className="trial-btn" href={withBase('/report')}>
            {t('See my results')}
          </a>
        </>
      );
      break;
    case 'locked':
    default:
      heading = t('Part of practice and guidance');
      body = t('Every lesson is free with your account. Practice, tests and personal guidance come with practice and guidance.');
      actions = (
        <>
          {upgrade}
          {lessons}
        </>
      );
  }

  return (
    <section className={shell} aria-labelledby="trial-block-title">
      <div className="trial-card">
        <span className="trial-eyebrow">{t(title)}</span>
        <h2 id="trial-block-title">{heading}</h2>
        <p>{body}</p>
        {actions && <div className="trial-actions">{actions}</div>}
        {/* [E trust] a person is reachable from every locked or ended screen. */}
        <SupportLink reason={reason === 'paid-ended' ? 'trial-ended' : 'locked'} lead="hand" />
      </div>
    </section>
  );
}
