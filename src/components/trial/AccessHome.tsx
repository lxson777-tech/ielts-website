/* Today and the course in the GATED build (the free-account model, Alex,
   1 October 2026; docs/paid-access/FREE-ACCOUNT-MODEL.md).

   - Practice and guidance (paid or complimentary) gets the same screens the
     open site shows: the personal Today (LearningDashboard, with its
     session) and the course (CourseGate). Their study material (the full
     learning index, the focused exercises, the vocabulary deck and, in
     Russian, their translations) arrives through the content gate first
     (src/lib/trial/packs.ts), and only then is the screen loaded, so it never
     draws a frame with the empty stand-ins.
   - A free account (or one whose practice and guidance ended) gets Today as
     its course and next lessons, with one calm card about practice and
     guidance (FreeHome), and the course map by section (CourseSections).
   - A visitor who is not signed in gets an invitation to create a free
     account; the course map lists every lesson by title.

   The trial's own Today, library and course were retired with the trial. */

import { useEffect, useState, type ReactElement } from 'react';
import { useT } from '../../lib/i18n/react';
import { useTrial } from '../../lib/trial/react';
import { commonPacks, loadPacks, paidNow, type PackFailure } from '../../lib/trial/packs';
import { browserTier } from '../../lib/access/tier';
import { PaidFailed, PaidLoading } from './PaidStates';
import TrialBlock, { accountBlock } from './TrialBlock';
import FreeHome from '../access/FreeHome';
import LessonInvite from '../access/LessonInvite';
import CourseSections from '../CourseSections';

export type AccessHomePage = 'dashboard' | 'learn' | 'start';

function CourseHeader() {
  const { t } = useT();
  return (
    <header className="hub-heading">
      <div>
        <h1>{t('The IELTS course')}</h1>
        <p>
          {t(
            "Every lesson on the site, in an order that builds. Tell us your target band and test date, and we'll set your pace and keep a Continue button on the next lesson you haven't finished.",
          )}
        </p>
      </div>
    </header>
  );
}

async function fullScreen(page: AccessHomePage): Promise<ReactElement> {
  if (page === 'dashboard') {
    const { default: LearningDashboard } = await import('../LearningDashboard');
    return <LearningDashboard />;
  }
  if (page === 'learn') {
    const { default: LessonLibrary } = await import('../LessonLibrary');
    return <LessonLibrary />;
  }
  const { default: CourseGate } = await import('../CourseGate');
  return (
    <div className="platform-hub mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <CourseHeader />
      <CourseGate />
    </div>
  );
}

/** The course map for anyone without practice and guidance. */
function CourseMap({ signedOut }: { signedOut: boolean }) {
  return (
    <div className="platform-hub mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <CourseHeader />
      {signedOut && <LessonInvite title="The IELTS course" what="page" />}
      <CourseSections />
    </div>
  );
}

export default function AccessHome({ page }: { page: AccessHomePage; sections?: unknown }) {
  const trial = useTrial();
  const tier = browserTier(trial, trial.now);
  const paid = paidNow(trial, trial.now);
  const [attempt, setAttempt] = useState(0);
  const [screen, setScreen] = useState<ReactElement | null>(null);
  const [failed, setFailed] = useState<PackFailure | 'error' | null>(null);

  useEffect(() => {
    if (!paid) {
      setScreen(null);
      setFailed(null);
      return;
    }
    let live = true;
    setFailed(null);
    void (async () => {
      const packs = await loadPacks([...commonPacks(), 'focused-exercises', 'vocabulary']);
      if (!live) return;
      if (!packs.ok) return setFailed(packs.reason);
      try {
        const element = await fullScreen(page);
        if (live) setScreen(element);
      } catch {
        if (live) setFailed('error');
      }
    })();
    return () => {
      live = false;
    };
  }, [paid, page, attempt]);

  if (!paid) {
    if (tier === 'signed-out' && trial.phase !== 'no-accounts') {
      /* Today and Course for a visitor: the course map, which carries its own
         sign-up invitation followed by every lesson title, so a visitor sees
         what a free account opens (free-account verification, 1 October
         2026, finding 5). Each title still opens only the invitation. */
      return <CourseMap signedOut />;
    }
    const account = accountBlock(trial);
    if (account === 'checking') return <PaidLoading />;
    if (account) return <TrialBlock reason={account} title={page === 'dashboard' ? 'Today' : 'The IELTS course'} />;
    return page === 'dashboard' ? <FreeHome ended={tier === 'paid-ended'} /> : <CourseMap signedOut={false} />;
  }
  if (screen) return screen;
  if (failed) return <PaidFailed reason={failed} onRetry={() => setAttempt((n) => n + 1)} />;
  return <PaidLoading />;
}
