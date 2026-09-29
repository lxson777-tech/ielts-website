/* What a trial student sees instead of something the trial does not open
   for them right now, and why. One wording for lessons, tests and trainers,
   so the same situation always reads the same way.

   Presentational only: the decision is made by the caller from the server's
   answer (src/lib/trial/status.ts). */

import type { ReactNode } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { refreshTrial, type TrialView } from '../../lib/trial/client';
import { hasPaidAccess, paidAccessEnded } from '../../lib/trial/status';
import { signInHref } from '../../lib/auth/profile';
import { currentRoute } from '../../lib/auth/next';
import SupportLink from '../support/SupportLink'; // [E trust]

export type TrialBlockReason =
  | 'checking'
  | 'signed-out'
  | 'no-accounts'
  | 'error-offline'
  | 'error-server'
  | 'no-trial'
  | 'locked'
  | 'ended'
  /** Paid access has ended (the account paid before). Said as it is, never
      as a trial the student may not have had. */
  | 'paid-ended'
  | 'speaking-unavailable'
  /* The section's test only. */
  | 'test-used'
  | 'test-other-in-progress'
  | 'test-ended';

/** The reason that comes from the account and the connection, before the
    page itself is considered. Null when the server has answered. An account
    with running paid access and no trial is not "no trial": it holds more
    than a trial would open (docs/paid-access/CONTRACT.md). */
export function accountBlock(trial: TrialView): TrialBlockReason | null {
  if (trial.phase === 'checking') return 'checking';
  if (trial.phase === 'signed-out') return 'signed-out';
  if (trial.phase === 'no-accounts') return 'no-accounts';
  if (trial.phase === 'error') return trial.failure === 'offline' ? 'error-offline' : 'error-server';
  if (!trial.status) return 'no-trial';
  if (trial.status.state === 'none') {
    const now = Date.now() + trial.offsetMs;
    if (paidAccessEnded(trial.status, now)) return 'paid-ended';
    if (!hasPaidAccess(trial.status, now)) return 'no-trial';
  }
  return null;
}

export default function TrialBlock({
  reason,
  title,
  section,
  variant = 'page',
}: {
  reason: TrialBlockReason;
  /** The lesson's or test's own title, kept on screen. English registry
      text; translated here like every other title. */
  title: string;
  /** The paper name, for the test sentences. Stays English in Russian. */
  section?: string;
  /** 'page' sits inside the workspace; 'full' fills a bare test page. */
  variant?: 'page' | 'full';
}) {
  const { t } = useT();

  const plans = (
    <a className="trial-btn trial-primary" href={withBase('/plans')}>
      {t('View plans')}
    </a>
  );
  const home = (
    <a className="trial-btn" href={withBase('/dashboard')}>
      {t('Back to my trial')}
    </a>
  );

  let heading = '';
  let body = '';
  let actions: ReactNode = null;
  switch (reason) {
    case 'checking':
      return (
        <section className={`trial-ui trial-gate${variant === 'full' ? ' is-full' : ''}`} aria-busy="true" aria-live="polite">
          <div className="trial-card">
            <div className="trial-skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="sr-only">{t('Checking your trial…')}</p>
          </div>
        </section>
      );
    case 'signed-out':
      heading = t('Sign in to continue your trial');
      body = t('Your trial belongs to your account, so it is the same on every device. Signing out never restarts it.');
      actions = (
        <>
          {/* The sign-in page brings the student straight back here. Only
              ever shown in the browser (the server renders "checking"). */}
          <a className="trial-btn trial-primary" href={signInHref(currentRoute())}>
            {t('Sign in')}
          </a>
          <a className="trial-btn" href={withBase('/trial')}>
            {t('New here? Start a free 3-day trial')}
          </a>
        </>
      );
      break;
    case 'no-accounts':
      heading = t('Accounts are not available on this build');
      body = t('The trial needs an account, and accounts are not configured here.');
      break;
    case 'error-offline':
    case 'error-server':
      heading = t('We could not check your trial');
      body =
        reason === 'error-offline'
          ? t('You seem to be offline. Your trial and your work are safe; this page opens again once you are connected.')
          : t('Something went wrong on our side. Your trial and your work are safe. Please try again.');
      actions = (
        <button type="button" className="trial-btn trial-primary" onClick={() => void refreshTrial()}>
          {t('Try again')}
        </button>
      );
      break;
    case 'no-trial':
      heading = t('Start your free trial to open this');
      body = t('Three days, no payment card. A selected introduction and one test in each IELTS section.');
      actions = (
        <a className="trial-btn trial-primary" href={withBase('/trial')}>
          {t('Start my free trial')}
        </a>
      );
      break;
    case 'ended':
    case 'test-ended':
      heading = t('Your trial has ended');
      body = t('New lessons, tests and Mr EZ replies are locked. Choose full access to continue learning.');
      actions = (
        <>
          {plans}
          {home}
        </>
      );
      break;
    case 'paid-ended':
      heading = t('Your full access has ended');
      body = t('Your results and your work are saved. Choose a plan to open the full course again.');
      actions = (
        <>
          {plans}
          <a className="trial-btn" href={withBase('/report')}>
            {t('See my results')}
          </a>
        </>
      );
      break;
    case 'speaking-unavailable':
      heading = t('The Speaking test is not open yet');
      body = t('We are finalising how long the trial Speaking test lasts. Your Speaking introduction lesson is ready in the meantime.');
      actions = home;
      break;
    case 'test-used':
      heading = t('You have used this section’s trial test');
      body = t('Your result is saved in your progress. The other sections still have their own test while your trial is active.');
      actions = (
        <>
          {plans}
          <a className="trial-btn" href={withBase('/report')}>
            {t('See my results')}
          </a>
        </>
      );
      break;
    case 'test-other-in-progress':
      heading = t('You have already started your {section} test', { section: section ?? '' });
      body = t('Your trial includes one test per section. Finish the one you started from your trial page.');
      actions = home;
      break;
    case 'locked':
    default:
      heading = t('Available with full access');
      body = t('Your trial includes one selected introduction and one test in each section. This page is part of the full course.');
      actions = (
        <>
          {plans}
          {home}
        </>
      );
  }

  return (
    <section className={`trial-ui trial-gate${variant === 'full' ? ' is-full' : ''}`} aria-labelledby="trial-block-title">
      <div className="trial-card">
        <span className="trial-eyebrow">{t(title)}</span>
        <h2 id="trial-block-title">{heading}</h2>
        <p>{body}</p>
        {actions && <div className="trial-actions">{actions}</div>}
        {/* [E trust] a person is reachable from every locked or ended screen. */}
        <SupportLink reason={reason === 'ended' || reason === 'test-ended' ? 'trial-ended' : 'locked'} lead="hand" />
      </div>
    </section>
  );
}
