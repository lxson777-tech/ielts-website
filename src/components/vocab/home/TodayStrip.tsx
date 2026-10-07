/* The top of the Vocabulary home: today's streak, the words due for review,
   and one button into five minutes of Spell it (typing a word from memory
   is what makes it count as learnt). Before it has read the student's
   stores it renders the calm "new here" line, which is also what a brand
   new student sees, so nothing flickers from zeros to numbers. */

import { useT } from '../../../lib/i18n/react';
import { vocabGameHref, type TodayStrip as TodayStripState } from '../../../lib/vocab-home';
import { ArrowIcon, FlameIcon, StackIcon } from './icons';

export default function TodayStrip({ state }: { state: TodayStripState | null }) {
  const { t, tn } = useT();
  const fresh = !state || state.fresh;

  return (
    <section className="vh-today" aria-label={t('Today')}>
      {fresh ? (
        <p className="vh-today-intro">
          <strong>{t('New here?')}</strong>{' '}
          <span>{t('Five minutes a day is enough. Learn a few words, then spell them from memory.')}</span>
        </p>
      ) : (
        <ul className="vh-today-stats">
          <li>
            <span className="vh-today-icon"><FlameIcon /></span>
            {state.streak > 0 ? (
              <span>{tn(state.streak, { one: '{n} day streak', other: '{n} day streak' })}</span>
            ) : (
              <span>{t('Study today to start a streak')}</span>
            )}
          </li>
          <li>
            <span className="vh-today-icon"><StackIcon /></span>
            {state.due > 0 ? (
              <span>{tn(state.due, { one: '{n} word to review today', other: '{n} words to review today' })}</span>
            ) : (
              <span>{t('All caught up for today')}</span>
            )}
          </li>
        </ul>
      )}
      <a className="vh-today-start" href={vocabGameHref('spell')}>
        <span>{t("Start today's 5 minutes")}</span>
        <ArrowIcon />
      </a>
    </section>
  );
}
