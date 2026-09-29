/* Joining the trial: the offer, the existing sign-in, then an explicit
   start.

   The order the handoff settled: public offer -> real authentication ->
   eligibility (does this account already have a trial?) -> the student
   presses Start, having been shown the three days, the four tests and the
   per-section Mr EZ allowances. Nothing starts the clock but that press, and
   pressing it again (another device, a second sign-up email, a bookmark)
   returns the same trial rather than a new one: the database decides that.

   A student who arrives from the public questionnaire keeps their answers
   through the sign-in round trip (this tab's session storage only). They
   are sent with the start as a SUGGESTED starting point, clearly labelled,
   never as an assessed level. */

import { useEffect, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import {
  forgetQuestionnaire,
  recallQuestionnaire,
  rememberQuestionnaire,
  startTrial,
} from '../../lib/trial/client';
import {
  questionnaireFromSearch,
  TRIAL_OFFER,
  TRIAL_SUMMARY,
  TRIAL_SUMMARY_ORDER,
  TRIAL_TUTOR_PER_SECTION,
  type TrialQuestionnaire,
} from '../../lib/trial/offer';
import { useTrial } from '../../lib/trial/react';
import { msRemaining } from '../../lib/trial/status';
import { signInHref, signUpHref } from '../../lib/auth/profile';
import TrialBlock from './TrialBlock';
import { timeLeftText } from './TrialHome';

const SECTION_LABEL: Record<string, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

export default function TrialJoin() {
  const i18n = useT();
  const { t } = i18n;
  const trial = useTrial();
  const [questionnaire, setQuestionnaire] = useState<TrialQuestionnaire | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // The questionnaire, from the link or from before the sign-in round trip.
  useEffect(() => {
    const fromLink = questionnaireFromSearch(window.location.search);
    if (fromLink) rememberQuestionnaire(fromLink);
    setQuestionnaire(fromLink ?? recallQuestionnaire());
  }, []);

  async function onStart() {
    setStarting(true);
    setStartError(null);
    const result = await startTrial(questionnaire);
    if (result.ok) {
      forgetQuestionnaire();
      window.location.assign(withBase('/dashboard'));
      return;
    }
    setStarting(false);
    setStartError(
      result.reason === 'offline'
        ? t('You seem to be offline. Nothing has started: try again once you are connected.')
        : t('We could not start your trial just now. Nothing has started: please try again.'),
    );
  }

  /* What the trial includes: the one shared description (TRIAL_SUMMARY in
     src/lib/trial/offer.ts), so this page, Tests, Practice and Today can
     never promise different things (audit F03). Academic IELTS comes first,
     before any account is made. */
  const offer = (
    <ul className="trial-includes">
      {TRIAL_SUMMARY_ORDER.map((key) => (
        <li key={key}>{t(TRIAL_SUMMARY[key])}</li>
      ))}
    </ul>
  );

  const suggestion = questionnaire && (
    <p className="trial-sug">
      <b>{t('Your answers came with you')}</b>
      {t('We will suggest starting with {section}, about {minutes} minutes a day, aiming for Band {band}. It is a starting point you chose, not a level test, and you can change it.', {
        section: SECTION_LABEL[questionnaire.skill],
        minutes: questionnaire.time,
        band: questionnaire.band === '8' ? '8.0+' : Number(questionnaire.band).toFixed(1),
      })}
    </p>
  );

  const art = (
    <figure>
      <img src={withBase('/mr-ez/approved-character.png')} alt={t('Mr EZ, your AI study companion')} />
      <figcaption>{t('A little guidance, right beside you.')}</figcaption>
    </figure>
  );

  if (trial.phase === 'off') {
    return (
      <section className="trial-ui trial-join">
        <div>
          <h1>{t('The trial is not switched on here')}</h1>
          <p>{t('This site is running as the open, free version, so there is nothing to start.')}</p>
          <a className="trial-btn trial-primary" href={withBase('/dashboard')}>
            {t('Go to my dashboard')}
          </a>
        </div>
      </section>
    );
  }

  if (trial.phase === 'checking') return <TrialBlock reason="checking" title="Your 3-day trial" />;
  if (trial.phase === 'no-accounts') return <TrialBlock reason="no-accounts" title="Your 3-day trial" />;
  if (trial.phase === 'error') {
    return <TrialBlock reason={trial.failure === 'offline' ? 'error-offline' : 'error-server'} title="Your 3-day trial" />;
  }

  /* 1. The public offer, signed out. */
  if (trial.phase === 'signed-out') {
    return (
      <section className="trial-ui trial-join" aria-labelledby="trial-join-title">
        <div>
          <h1 id="trial-join-title">
            {t('Your next chapter')}
            <br />
            <em>{t('starts with a small step.')}</em>
          </h1>
          <p>{t('Try your study space for three days. No payment card needed.')}</p>
          {offer}
          {suggestion}
          <div className="trial-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            {/* The sign-up and sign-in pages bring the student back to
                /trial (after the profile page, for a new account); the
                questionnaire answers wait in this browser meanwhile. */}
            <a className="trial-btn trial-primary" href={signUpHref('/trial')}>
              {t('Create a free account')}
            </a>
            <a className="trial-btn" href={signInHref('/trial')}>
              {t('I already have an account')}
            </a>
          </div>
          <small style={{ marginTop: 16 }}>
            {t('The trial belongs to your account, so it is the same on every device and signing out never restarts it.')}
          </small>
        </div>
        {art}
      </section>
    );
  }

  const status = trial.status;
  if (!status) return <TrialBlock reason="checking" title="Your 3-day trial" />;

  /* 3. This account already has its trial. Never a second one. */
  if (status.state !== 'none') {
    const active = status.state === 'active' && msRemaining(status, trial.now) > 0;
    return (
      <section className="trial-ui trial-join">
        <div>
          <h1>{active ? t('Your trial is already running') : t('Your trial has ended')}</h1>
          <p>
            {active
              ? t('Each account has one trial, and yours started earlier. {time}', { time: timeLeftText(msRemaining(status, trial.now), i18n) })
              : t('Each account has one trial. Your results stay saved.')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {active ? (
              <a className="trial-btn trial-primary" href={withBase('/dashboard')}>
                {t('Go to my trial')}
              </a>
            ) : (
              <a className="trial-btn trial-primary" href={withBase('/plans')}>
                {t('View plans')}
              </a>
            )}
          </div>
        </div>
        {art}
      </section>
    );
  }

  /* 2. Signed in, eligible: say exactly what starts, then let them start it. */
  return (
    <section className="trial-ui trial-join" aria-labelledby="trial-start-title">
      <div>
        <h1 id="trial-start-title">{t('Before you begin')}</h1>
        <p>{t('Your three days start when you press the button below, by our clock, not your device’s.')}</p>
        <p className="trial-fine">{t(TRIAL_SUMMARY.course)}</p>
        <ol className="trial-steps">
          <li>
            <span>1</span>
            <span>{t('Three days of access, with no payment card and nothing to cancel.')}</span>
          </li>
          <li>
            <span>2</span>
            <span>
              {t(TRIAL_SUMMARY.tests)}{' '}
              {t('Once you start a section’s test, it is your test for that section. If something fails on our side, it is not used.')}
              {!TRIAL_OFFER.speaking.testEnabled && ` ${t('The Speaking test opens once its length is confirmed.')}`}
            </span>
          </li>
          <li>
            <span>3</span>
            <span>{t('{n} Mr EZ messages in each section for the whole trial. Only answered messages count, and they do not reset each day.', { n: TRIAL_TUTOR_PER_SECTION })}</span>
          </li>
        </ol>
        {suggestion}
        <p className="trial-fine">
          {t('Your trial is kept with your account, so it is the same on any device you sign in on.')}
        </p>
        <button type="button" className="trial-btn trial-primary" onClick={() => void onStart()} disabled={starting} aria-busy={starting || undefined}>
          {starting ? t('Starting your trial…') : t('Start my 3-day trial')}
        </button>
        {startError && (
          <p className="trial-notice" role="alert" style={{ marginTop: 16 }}>
            {startError}
          </p>
        )}
      </div>
      {art}
    </section>
  );
}
