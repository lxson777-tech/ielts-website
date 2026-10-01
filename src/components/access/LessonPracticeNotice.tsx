/* The quiet card at the end of a lesson, in the gated build (the
   free-account model, 1 October 2026): where to practise what the lesson
   taught. Practice and guidance goes straight to practice; a free account's
   button opens the upgrade pop-up when pressed (never on its own). Nothing
   for a visitor who is not signed in: they see the lesson's invitation, not
   the lesson. */

import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { useAccessTier, opensEverything, readsLessons } from '../../lib/access/tier';
import { openUpgrade } from '../../lib/access/upgrade';
import { currentRoute } from '../../lib/auth/next';

export default function LessonPracticeNotice() {
  const tier = useAccessTier();
  const { t } = useT();
  if (!readsLessons(tier)) return null;
  const paid = opensEverything(tier);
  return (
    <aside className="mt-8 rounded-card border border-border bg-surface-alt p-5" data-lesson-practice-notice={paid ? 'paid' : 'free'}>
      <p className="font-display font-bold">{t('Put this lesson into practice.')}</p>
      <p className="mt-2 text-sm text-ink-muted">
        {paid
          ? t('Timed tests, drills and Mr EZ are ready whenever you are.')
          : t('Practice, timed tests and feedback on your own work come with practice and guidance.')}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {paid ? (
          <a className="rounded-button bg-brand px-5 py-3 text-sm font-semibold text-white" href={withBase('/tests')}>
            {t('Open practice')}
          </a>
        ) : (
          <button
            type="button"
            className="rounded-button bg-brand px-5 py-3 text-sm font-semibold text-white"
            onClick={() => openUpgrade('drill', { from: currentRoute() })}
          >
            {t('See what practice and guidance adds')}
          </button>
        )}
      </div>
    </aside>
  );
}
