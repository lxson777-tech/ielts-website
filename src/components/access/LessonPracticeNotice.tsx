/* The quiet card at the end of a lesson, in the gated build (the
   free-account model, 1 October 2026): where to practise what the lesson
   taught. Practice and guidance goes straight to practice; a free account's
   button opens the upgrade pop-up when pressed (never on its own). Nothing
   for a visitor who is not signed in: they see the lesson's invitation, not
   the lesson.

   Free AI tries (10 October 2026): a free account that still has a free try
   of the kind this lesson teaches is offered that instead. A Writing lesson
   offers the free essay check, a Speaking lesson the free Speaking check,
   and every other lesson (Reading, Listening, Vocabulary) a free question to
   Mr EZ about this lesson. Once that one try is used, or while a timed task
   runs on the page, it is today's notice again. Which one is decided by
   lessonEndTaster (src/lib/access/taster-offers.ts). */

import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { useAccessTier, opensEverything, readsLessons } from '../../lib/access/tier';
import { openUpgrade } from '../../lib/access/upgrade';
import { openMrEz } from '../../lib/access/taster-events';
import { LESSON_END_BODY, LESSON_END_COPY, TASTER_ROUTES, lessonEndTaster } from '../../lib/access/taster-offers';
import { currentRoute } from '../../lib/auth/next';
import { ensureAccessStyles } from './access-styles';
import { useTaster } from './taster-ui';

export default function LessonPracticeNotice({ skill = '' }: { skill?: string }) {
  const tier = useAccessTier();
  const { t, tn } = useT();
  const taster = useTaster();
  if (!readsLessons(tier)) return null;
  const paid = opensEverything(tier);
  const offer = paid ? null : lessonEndTaster(skill, tier, taster.taster, taster.underExam);

  if (offer) {
    ensureAccessStyles();
    const copy = LESSON_END_COPY[offer];
    const left = taster.left(offer);
    return (
      <aside className="trial-ui taster-card taster-lesson" data-lesson-practice-notice="taster" data-lesson-taster={offer}>
        <h3>{t(copy.title)}</h3>
        <p>
          {offer === 'tutor'
            ? tn(left, {
                one: 'You have {n} free question left, and Mr EZ knows which lesson you are reading.',
                other: 'You have {n} free questions left, and Mr EZ knows which lesson you are reading.',
              })
            : t(LESSON_END_BODY[offer])}
        </p>
        <div className="taster-lesson-actions">
          {offer === 'tutor' ? (
            <button type="button" className="trial-btn trial-primary" onClick={() => openMrEz()} data-taster-use="tutor">
              {t(copy.button)}
            </button>
          ) : (
            <a className="trial-btn trial-primary" href={withBase(TASTER_ROUTES[offer])} data-taster-use={offer}>
              {t(copy.button)}
            </a>
          )}
          <button type="button" className="taster-link" onClick={() => openUpgrade('drill', { from: currentRoute() })}>
            {t('See what practice and guidance adds')}
          </button>
        </div>
      </aside>
    );
  }

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
