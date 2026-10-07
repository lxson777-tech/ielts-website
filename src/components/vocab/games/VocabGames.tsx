/* /review/games: three quick vocabulary games (Alex, 8 October 2026).

     ?game=match    Match pairs        six words to six meanings, timed
     ?game=sprint   60-second sprint   fill the gap, as many as you can
     ?game=spell    Spell it           type the word from its meaning
     no game        a small chooser of the three

   &topic=<slug> plays one topic's words; without it (or with a slug that
   is not a topic) the game plays a mixed set: words due for review first,
   then new words from topics the student has studied, then any.

   Free with an account and no AI: every answer is marked here, in the
   browser, and written to the same review schedule and learner record the
   practice round writes to, so the study plan and Mr EZ see it. The query
   string is read once the page is live (this is a static page), so the
   server render is only a quiet placeholder. */

import { useEffect, useState } from 'react';
import { useT } from '../../../lib/i18n/react';
import { nt } from '../../../lib/i18n/translate';
import { GAME_KINDS, parseGameParams, type GameParams } from '../../../lib/vocab-games/sets';
import { knownSlugs, topicBySlug } from './deck';
import { GAME_LINES, GAME_NAMES, GameGlyph, GameHeading, TopicSwitch, gamesHref } from './GameParts';
import MatchGame from './MatchGame';
import SprintGame from './SprintGame';
import SpellGame from './SpellGame';
import './vocab-games.css';

const GAME_META: Record<string, string> = {
  match: nt('Six pairs · against the clock'),
  sprint: nt('One minute · four choices'),
  spell: nt('Ten words · counts toward learnt'),
};

function Chooser({ topicSlug }: { topicSlug: string | null }) {
  const { t } = useT();
  const topic = topicBySlug(topicSlug);
  return (
    <div className="vg vg-chooser" data-game="chooser">
      <GameHeading title={nt('Vocabulary games')} lead={nt('Quick ways to practise your words. Each answer counts toward your study plan.')} topic={topicSlug} />
      <ul className="vg-game-cards">
        {GAME_KINDS.map((game) => (
          <li key={game}>
            <a className={`vg-game-card vg-game-card-${game}`} href={gamesHref(game, topicSlug)} data-vg-choose={game}>
              <GameGlyph game={game} />
              <span className="vg-game-card-body">
                <strong>{t(GAME_NAMES[game])}</strong>
                <span>{t(GAME_LINES[game])}</span>
                <span className="vg-game-card-meta">{t(GAME_META[game]!)}</span>
              </span>
              <span className="vg-game-card-go" aria-hidden="true">
                <svg viewBox="0 0 20 20" focusable="false">
                  <path d="M4 10h11m-4-4.5L15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <TopicSwitch game={null} topic={topic} />
    </div>
  );
}

export default function VocabGames() {
  const [params, setParams] = useState<GameParams | null>(null);

  useEffect(() => {
    setParams(parseGameParams(window.location.search, knownSlugs()));
  }, []);

  if (!params) return <div className="vg vg-loading" aria-busy="true" />;
  if (params.game === 'match') return <MatchGame topicSlug={params.topic} />;
  if (params.game === 'sprint') return <SprintGame topicSlug={params.topic} />;
  if (params.game === 'spell') return <SpellGame topicSlug={params.topic} />;
  return <Chooser topicSlug={params.topic} />;
}
