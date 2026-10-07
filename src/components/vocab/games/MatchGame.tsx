/* Match pairs: six words, six meanings, against the clock.

   The rules are src/lib/vocab-games/match.ts. Every pair settled or missed
   is written to the student's record as recognition, the way a practice
   round answer is (src/lib/vocab-games/record.ts). The clock starts only
   when the student presses Start, and the best time per topic is kept on
   this device for that student (src/lib/vocab-games/bests.ts).

   Keyboard: every tile is a button (Tab, then Enter or Space); the chosen
   tile is marked pressed, and a polite live region says what happened. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../../lib/i18n/react';
import { nt } from '../../../lib/i18n/translate';
import type { VocabCard } from '../../../lib/vocab-review';
import { isTileDone, matchFinished, matchRecording, newMatchBoard, pressTile, type MatchState, type MatchTile } from '../../../lib/vocab-games/match';
import { elapsedMs, formatClock, startClock, type GameClock } from '../../../lib/vocab-games/clock';
import { bestsKey, loadBestsFor, recordMatchTime, saveBestsFor, type MatchBest } from '../../../lib/vocab-games/bests';
import { recordGameRecognition } from '../../../lib/vocab-games/record';
import { minimumWords } from '../../../lib/vocab-games/sets';
import { currentOwner } from '../../../lib/store-owner';
import { buildSetFor, nextTopic, topicBySlug } from './deck';
import { GAME_LINES, GAME_NAMES, GameGlyph, GameHeading, OwnerNote, SignInLine, Stat, StatRow, TopicSwitch, WordReview, gamesHref } from './GameParts';
import { useGameOwner } from './useGameOwner';

type Phase = 'start' | 'play' | 'end';

interface Result {
  ms: number;
  mistakes: number;
  isBest: boolean;
  previous: MatchBest | null;
}

export default function MatchGame({ topicSlug }: { topicSlug: string | null }) {
  const { t, tn } = useT();
  const topic = topicBySlug(topicSlug);
  const [phase, setPhase] = useState<Phase>('start');
  const owner = useGameOwner(() => setPhase('start'));
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [board, setBoard] = useState<MatchState | null>(null);
  const [clock, setClock] = useState<GameClock | null>(null);
  const [now, setNow] = useState(0);
  const [shaking, setShaking] = useState<string[]>([]);
  const [justMatched, setJustMatched] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [best, setBest] = useState<MatchBest | null>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const firstTileRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLHeadingElement>(null);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  /* What the start card shows: the student's best here, and whether there
     are enough words to play. Read on the client, for the student here. */
  useEffect(() => {
    if (phase !== 'start') return;
    const me = currentOwner();
    setBest(loadBestsFor(me).match[bestsKey(topicSlug)] ?? null);
    setAvailable(buildSetFor(me, 'match', topicSlug).length);
  }, [phase, topicSlug, owner.signedIn]);

  const start = useCallback(() => {
    const session = owner.open();
    owner.clearNote();
    const set = buildSetFor(session.owner, 'match', topicSlug);
    setCards(set);
    setBoard(newMatchBoard(set));
    setClock(startClock(Date.now()));
    setNow(Date.now());
    setResult(null);
    setShaking([]);
    setJustMatched(null);
    setAnnounce(t('Game started. Choose a word, then its meaning.'));
    setPhase('play');
  }, [owner, topicSlug, t]);

  useEffect(() => {
    if (phase === 'play') firstTileRef.current?.focus({ preventScroll: true });
    if (phase === 'end') endRef.current?.focus({ preventScroll: true });
  }, [phase]);

  /* The running clock. */
  useEffect(() => {
    if (phase !== 'play') return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [phase]);

  const byWord = useMemo(() => new Map(cards.map((c) => [c.word, c] as const)), [cards]);

  const finish = useCallback(
    (finalBoard: MatchState, ms: number) => {
      const me = owner.ownerNow();
      let outcome: Result = { ms, mistakes: finalBoard.mistakes, isBest: false, previous: null };
      if (me) {
        const recorded = recordMatchTime(loadBestsFor(me), bestsKey(topicSlug), ms, finalBoard.mistakes, new Date().toISOString());
        if (recorded.isBest) saveBestsFor(me, recorded.bests);
        outcome = { ...outcome, isBest: recorded.isBest, previous: recorded.previous };
      }
      setResult(outcome);
      setPhase('end');
    },
    [owner, topicSlug],
  );

  const press = useCallback(
    (tile: MatchTile) => {
      if (phase !== 'play' || !board || !clock) return;
      const { state: next, event } = pressTile(board, tile.id);
      if (event.kind === 'ignored') return;
      const write = matchRecording(event);
      if (write) {
        const card = byWord.get(write.word);
        if (card && !owner.claim((me) => recordGameRecognition(me, card, write.correct, write.retry))) return;
      }
      setBoard(next);
      if (event.kind === 'select') setAnnounce(t('Chosen: {text}', { text: event.tile.text }));
      if (event.kind === 'deselect') setAnnounce(t('Choice cleared.'));
      if (event.kind === 'miss') {
        setShaking(event.tiles);
        later(() => setShaking([]), 460);
        setAnnounce(t('Not a pair. Try again.'));
      }
      if (event.kind === 'match') {
        setJustMatched(event.word);
        later(() => setJustMatched((w) => (w === event.word ? null : w)), 520);
        const left = next.words.length - next.done.length;
        setAnnounce(
          left
            ? tn(left, { one: 'Matched: {word}. {n} pair left.', other: 'Matched: {word}. {n} pairs left.' }, { word: event.word })
            : t('Matched: {word}. All pairs done.', { word: event.word }),
        );
        if (matchFinished(next)) {
          const ms = elapsedMs(clock, Date.now());
          later(() => finish(next, ms), 560);
        }
      }
    },
    [phase, board, clock, byWord, owner, t, tn, finish],
  );

  const name = GAME_NAMES.match;
  const elapsed = clock ? elapsedMs(clock, now) : 0;
  const nextUp = nextTopic('match', topicSlug);
  const missedCards = (board?.missed ?? []).map((w) => byWord.get(w)).filter((c): c is VocabCard => Boolean(c));

  function renderTile(tile: MatchTile, index: number) {
    if (!board) return null;
    const done = isTileDone(board, tile);
    const selected = board.selected === tile.id;
    const cls = [
      'vg-tile',
      tile.side === 'word' ? 'vg-tile-word' : 'vg-tile-meaning',
      selected ? 'is-selected' : '',
      done ? 'is-done' : '',
      done && justMatched === tile.word ? 'is-popping' : '',
      shaking.includes(tile.id) ? 'is-shaking' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <li key={tile.id}>
        <button
          type="button"
          ref={index === 0 && tile.side === 'word' ? firstTileRef : undefined}
          className={cls}
          aria-pressed={selected}
          aria-disabled={done || undefined}
          tabIndex={done ? -1 : 0}
          onClick={() => press(tile)}
          lang="en"
          data-tile={tile.id}
        >
          <span>{tile.text}</span>
          {done && (
            <svg className="vg-tile-check" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </li>
    );
  }

  return (
    <div className="vg vg-game vg-game-match" data-game="match" data-phase={phase}>
      <GameHeading title={name} topic={topicSlug} />
      <OwnerNote note={owner.note} />

      {phase === 'start' && (
        <section className="vg-card vg-start" aria-labelledby="vg-start-title">
          <GameGlyph game="match" />
          <h2 id="vg-start-title">{t(GAME_LINES.match)}</h2>
          <p className="vg-muted">{t('Tap a word, then its meaning, in either order. The clock starts when you press Start.')}</p>
          <TopicSwitch game="match" topic={topic} />
          {best && (
            <p className="vg-best-line">
              {t('Your best here: {time}', { time: formatClock(best.ms, true) })}
            </p>
          )}
          {available !== null && available < minimumWords('match') ? (
            <p className="vg-muted">{t('There are not enough words here for this game. Choose another topic.')}</p>
          ) : (
            <button type="button" className="vg-btn vg-btn-primary" onClick={start} data-vg-start>
              {t('Start')}
            </button>
          )}
          <SignInLine signedIn={owner.signedIn} />
        </section>
      )}

      {phase === 'play' && board && (
        <section className="vg-play" aria-label={t(name)}>
          <div className="vg-bar">
            <span className="vg-clock" aria-label={t('Time')}>
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <circle cx="10" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 7.5V11l2.2 1.6M8 2.8h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span data-vg-clock>{formatClock(elapsed)}</span>
            </span>
            <span className="vg-pill">{t('{done} of {total} pairs', { done: board.done.length, total: board.words.length })}</span>
            <span className={`vg-pill${board.mistakes ? ' is-warm' : ''}`}>
              {tn(board.mistakes, { one: '{n} mistake', other: '{n} mistakes' })}
            </span>
          </div>
          <div className="vg-board">
            <div className="vg-col">
              <h2 className="vg-col-label">{t('Words')}</h2>
              <ul className="vg-tiles vg-tiles-words">{board.words.map((tile, i) => renderTile(tile, i))}</ul>
            </div>
            <div className="vg-col">
              <h2 className="vg-col-label">{t('Meanings')}</h2>
              <ul className="vg-tiles vg-tiles-meanings">{board.meanings.map((tile, i) => renderTile(tile, i))}</ul>
            </div>
          </div>
        </section>
      )}

      {phase === 'end' && result && (
        <section className="vg-card vg-end" aria-labelledby="vg-end-title">
          <h2 id="vg-end-title" tabIndex={-1} ref={endRef}>
            {result.isBest ? t('New personal best') : t('All pairs matched')}
          </h2>
          <p className="vg-end-topic">{topic ? t(topic.title) : t('Mixed set')}</p>
          <StatRow>
            <Stat label={t('Time')} value={formatClock(result.ms, true)} accent />
            <Stat label={t('Mistakes')} value={String(result.mistakes)} />
            <Stat
              label={t('Your best')}
              value={formatClock(result.isBest ? result.ms : (result.previous?.ms ?? result.ms), true)}
            />
          </StatRow>
          {result.isBest && result.previous && (
            <p className="vg-muted">{t('Your previous best was {time}.', { time: formatClock(result.previous.ms, true) })}</p>
          )}
          <WordReview title={nt('Words to look at again')} cards={missedCards} />
          {!missedCards.length && <p className="vg-muted">{t('Every pair right first time. Well done.')}</p>}
          <div className="vg-actions">
            <button type="button" className="vg-btn vg-btn-primary" onClick={start}>
              {t('Play again')}
            </button>
            {nextUp && (
              <a className="vg-btn vg-btn-secondary" href={gamesHref('match', nextUp.slug)}>
                {t('Next topic: {topic}', { topic: t(nextUp.title) })}
              </a>
            )}
            <a className="vg-btn vg-btn-quiet" href={gamesHref(null, topicSlug)}>
              {t('All games')}
            </a>
          </div>
          <SignInLine signedIn={owner.signedIn} />
        </section>
      )}

      <p className="vg-sr" aria-live="polite" data-vg-live>
        {announce}
      </p>
    </div>
  );
}
