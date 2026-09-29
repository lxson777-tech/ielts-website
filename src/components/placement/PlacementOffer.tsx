/* The placement test's one calm card on Today, and its quiet link on the
   study plan settings page.

   Today (variant "card"): shown once the intake is answered or put off, and
   only while the account has not taken the placement (./placement-offer.ts
   decides). Signed out, it is an invitation to sign in instead, the same
   window Mr EZ and the live examiner open. "Not now" hides it for a week and
   changes nothing else: the staged short samples go on exactly as before.

   Settings (variant "link"): one line and a link, or the way back to the
   results once the test has been taken. */

import { useEffect, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { deviceStorage, onOwnerChange, currentOwner, ownerNamespace } from '../../lib/store-owner';
import { onLearnerRecordChange, readLearnerRecord } from '../../lib/learning/store.browser';
import { PLACEMENT_TOTAL_MINUTES } from '../../data/placement';
import { currentPlacementPart, readPlacementState } from '../../lib/placement/state';
import { placementTaken } from '../../lib/placement/results';
import { signInHref } from '../../lib/auth/profile';
import { currentRoute } from '../../lib/auth/next';
import { isTrialBuild } from '../../lib/trial/mode';
import { placementOfferView, readOfferDismissal, writeOfferDismissal, type PlacementOfferView } from './placement-offer';
import '../../styles/placement.css';

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface Snapshot {
  ns: string;
  signedIn: boolean;
  taken: boolean;
  inProgress: boolean;
  dismissedOn: string | null;
}

function snapshot(): Snapshot {
  const owner = currentOwner();
  const ns = ownerNamespace(owner);
  const storage = deviceStorage();
  const state = readPlacementState(storage, ns);
  return {
    ns,
    signedIn: owner.kind === 'user',
    taken: placementTaken(readLearnerRecord()),
    inProgress: state !== null && currentPlacementPart(state) !== 'done',
    dismissedOn: readOfferDismissal(storage, ns),
  };
}

export default function PlacementOffer({
  variant = 'card',
  intakeShowing = false,
  sessionReady = false,
}: {
  variant?: 'card' | 'link';
  intakeShowing?: boolean;
  /** Today has an active session under this card, so the invitation can
      say that the session is ready whether or not the test is taken. */
  sessionReady?: boolean;
}) {
  const { t } = useT();
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const read = () => setSnap(snapshot());
    read();
    const offOwner = onOwnerChange(read);
    const offRecord = onLearnerRecordChange(read);
    window.addEventListener('focus', read);
    return () => {
      offOwner();
      offRecord();
      window.removeEventListener('focus', read);
    };
  }, []);

  // The placement test comes with a subscription, not the trial.
  if (!snap || isTrialBuild()) return null;

  if (variant === 'link') {
    if (!snap.signedIn) return null;
    return (
      <section className="pl-offer" aria-labelledby="pl-offer-link-heading">
        <p className="pl-kicker">{t('Placement test')}</p>
        <h2 id="pl-offer-link-heading" className="pl-offer-title">
          {snap.taken && !snap.inProgress ? t('Your placement results') : t('Take the {n}-minute placement test', { n: PLACEMENT_TOTAL_MINUTES })}
        </h2>
        <p className="pl-offer-lead">
          {snap.taken && !snap.inProgress
            ? t('What your one sitting found in each paper, and what your plan did with it.')
            : t('One sitting, taken once, so your plan starts from real evidence about all four papers instead of guessing.')}
        </p>
        <div className="pl-offer-actions">
          <a className="pl-offer-primary" href={withBase('/placement')}>
            {snap.taken && !snap.inProgress
              ? t('See my results')
              : snap.inProgress
                ? t('Carry on with the placement test')
                : t('Take the placement test')}
          </a>
        </div>
      </section>
    );
  }

  const view: PlacementOfferView = placementOfferView({
    intakeShowing,
    signedIn: snap.signedIn,
    taken: snap.taken,
    inProgress: snap.inProgress,
    dismissedOn: snap.dismissedOn,
    today: localToday(),
  });
  if (view === 'hidden') return null;

  function notNow() {
    writeOfferDismissal(deviceStorage(), snap!.ns, localToday());
    setSnap(snapshot());
  }

  /* Compact on Today (audit 2026-09-29, F12). The placement offer used to be
     a full card with its own filled button above the day's session, so a
     phone showed two equally loud next steps and pushed the session's Start
     below the first screen. Now it is an invitation: its title, one sentence
     saying how it relates to today's work, a quiet outlined button and
     "Not now". The session's Start stays the one filled button on the
     screen, which in Russian at 390x844 now sits inside the first screen.
     What the test covers (the four parts and their minutes, and that the
     result is an estimate, not a band) is on the placement introduction,
     the page this button opens, before anything starts. It is still
     paid-only (hidden in the trial build, above) and still one sitting:
     nothing about the test itself changed. */
  return (
    <section className="pl-offer pl-offer-compact pl-enter" aria-labelledby="pl-offer-heading" data-placement-offer={view}>
      <h2 id="pl-offer-heading" className="pl-offer-title">
        {view === 'resume'
          ? t('Your placement test is waiting')
          : t('Take the {n}-minute placement test', { n: PLACEMENT_TOTAL_MINUTES })}
      </h2>
      <p className="pl-offer-lead">
        {view === 'sign-in'
          ? t('Sign in first: the placement test saves its results to your account and uses the AI examiner.')
          : view === 'resume'
            ? t('Carry on where you stopped. Your plan uses the result to decide where to start.')
            : sessionReady
              ? t("It tailors your plan to all four papers. Today's session below is ready either way.")
              : t('It tailors your plan to all four papers, so your next sessions start from real evidence.')}
      </p>
      <div className="pl-offer-actions">
        {view === 'sign-in' ? (
          <a className="pl-offer-secondary" href={signInHref(currentRoute())}>
            {t('Sign in')}
          </a>
        ) : (
          <a className="pl-offer-secondary" href={withBase('/placement')}>
            {view === 'resume' ? t('Carry on with the placement test') : t('Take the placement test')}
          </a>
        )}
        {view !== 'resume' && (
          <button type="button" className="pl-offer-quiet" onClick={notNow}>
            {t('Not now')}
          </button>
        )}
      </div>
    </section>
  );
}
