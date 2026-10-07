/* The three vocabulary games for one topic. The games themselves live at
   /review/games (Builder V2); this row only links there with the topic.
   Games are free with an account, so these links carry no paid-feature
   marker. */

import { useT } from '../../../lib/i18n/react';
import { vocabGameHref } from '../../../lib/vocab-home';
import { MatchIcon, SpellIcon, SprintIcon } from './icons';

export default function GamesRow({ topic }: { topic: string }) {
  const { t } = useT();
  return (
    <section className="vh-games" aria-labelledby="vh-games-title">
      <h2 id="vh-games-title">{t('Play with these words')}</h2>
      <ul className="vh-games-list">
        <li>
          <a className="vh-game" href={vocabGameHref('match', topic)} data-game="match">
            <span className="vh-game-icon"><MatchIcon /></span>
            <span className="vh-game-text">
              <span className="vh-game-name">{t('Match pairs', undefined, 'vocab-home')}</span>
              <span className="vh-game-note">{t('Join each word to its meaning')}</span>
            </span>
          </a>
        </li>
        <li>
          <a className="vh-game" href={vocabGameHref('sprint', topic)} data-game="sprint">
            <span className="vh-game-icon"><SprintIcon /></span>
            <span className="vh-game-text">
              <span className="vh-game-name">{t('60-second sprint', undefined, 'vocab-home')}</span>
              <span className="vh-game-note">{t('As many as you can in one minute')}</span>
            </span>
          </a>
        </li>
        <li>
          <a className="vh-game" href={vocabGameHref('spell', topic)} data-game="spell">
            <span className="vh-game-icon"><SpellIcon /></span>
            <span className="vh-game-text">
              <span className="vh-game-name">{t('Spell it', undefined, 'vocab-home')}</span>
              <span className="vh-game-note">{t('Type the word from its meaning')}</span>
            </span>
          </a>
        </li>
      </ul>
    </section>
  );
}
