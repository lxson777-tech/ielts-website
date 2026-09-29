/* Today, the lesson library and the course in the GATED build: the trial's
   version for a trial (or signed-out, or ended) account, the full product for
   a paid one.

   The gated build (PUBLIC_ACCESS_MODE=trial) shows the trial's own Today and
   library, because the personal course would recommend lessons the trial
   does not open. A paid account opens all of them (docs/paid-access/
   CONTRACT.md), so it gets the same screens the open site shows: the
   personal Today (LearningDashboard, with its session), the whole library
   (LessonLibrary) and the course (CourseGate). Their study material (the
   full learning index, the focused exercises, the vocabulary deck and, in
   Russian, their translations) arrives through the content gate first
   (src/lib/trial/packs.ts), and only then is the screen loaded, so it never
   draws a frame with the empty stand-ins. When paid access ends, the trial's
   screens return; every saved result stays.

   The switch happens here, at the page level: TrialHome and the full
   screens are used exactly as they are. */

import { useEffect, useState, type ReactElement } from 'react';
import { useT } from '../../lib/i18n/react';
import { useTrial } from '../../lib/trial/react';
import { commonPacks, loadPacks, paidNow, type PackFailure } from '../../lib/trial/packs';
import type { TrialLibrarySection } from '../../lib/trial/library';
import TrialHome, { TrialLibraryPage } from './TrialHome';
import { PaidFailed, PaidLoading } from './PaidStates';

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

export default function AccessHome({ page, sections }: { page: AccessHomePage; sections: TrialLibrarySection[] }) {
  const trial = useTrial();
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

  if (!paid) return page === 'dashboard' ? <TrialHome sections={sections} /> : <TrialLibraryPage sections={sections} />;
  if (screen) return screen;
  if (failed) return <PaidFailed reason={failed} onRetry={() => setAttempt((n) => n + 1)} />;
  return <PaidLoading />;
}
