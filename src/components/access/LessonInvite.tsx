/* A lesson page, in the gated build, for a visitor who is not signed in:
   the lesson's title and an invitation, never the lesson (the free-account
   model, docs/paid-access/FREE-ACCOUNT-MODEL.md). The page carries no lesson
   text at all; it arrives through the content door once an account asks.

   Presentational: TrialGate decides. Sign-up and sign-in both bring the
   student straight back to this lesson. */

import { useT } from '../../lib/i18n/react';
import { signInHref, signUpHref } from '../../lib/auth/profile';
import { currentRoute } from '../../lib/auth/next';
import './upgrade.css';

export default function LessonInvite({ title, what = 'lesson' }: { title: string; what?: 'lesson' | 'page' }) {
  const { t } = useT();
  const here = currentRoute();
  if (what === 'page') {
    return (
      <section className="trial-ui trial-gate paid-locked lesson-invite" aria-labelledby="lesson-invite-title" data-lesson-invite="page">
        <div className="trial-card">
          <span className="trial-eyebrow">{t('Free with an account')}</span>
          <h2 id="lesson-invite-title">{t(title)}</h2>
          <p className="paid-locked-lead">
            {t('Create a free account to open this. Every lesson and the vocabulary lists are free with an account.')}
          </p>
          <div className="trial-actions">
            <a className="trial-btn trial-primary" href={signUpHref(here)} data-lesson-invite-signup>
              {t('Create a free account')}
            </a>
            <a className="trial-btn" href={signInHref(here)}>
              {t('Sign in')}
            </a>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="trial-ui trial-gate paid-locked lesson-invite" aria-labelledby="lesson-invite-title" data-lesson-invite>
      <div className="trial-card">
        <span className="trial-eyebrow">{t('Free lesson')}</span>
        <h2 id="lesson-invite-title">{t(title)}</h2>
        <p className="paid-locked-lead">
          {t('Create a free account to read this lesson. Every lesson is free with an account, in English and Russian, with worked examples and a short quiz.')}
        </p>
        <div className="trial-actions">
          <a className="trial-btn trial-primary" href={signUpHref(here)} data-lesson-invite-signup>
            {t('Create a free account to read this lesson')}
          </a>
          <a className="trial-btn" href={signInHref(here)}>
            {t('Sign in')}
          </a>
        </div>
      </div>
    </section>
  );
}
