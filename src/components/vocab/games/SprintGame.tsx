/* The 60-second sprint: the word's own example sentence with the word
   gapped, four words to choose from, as many as you can in a minute.

   The rules are src/lib/vocab-games/sprint.ts; questions come from the
   practice round's builder (src/lib/vocab-practice.ts). Each word's first
   answer in a sprint is written to the student's record as recognition
   (src/lib/vocab-games/record.ts). The minute starts only when the student
   presses Start, and pauses whenever the tab is hidden, so it never runs
   where they cannot see it. Keys 1 to 4 answer. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../../lib/i18n/react';
import { nt } from '../../../lib/i18n/translate';
import type { VocabCard } from '../../../lib/vocab-review';
import type { PracticeQuestion } from '../../../lib/vocab-practice';
import {
  SPRINT_MS,
  SPRINT_REVEAL_MS,
  SPRINT_RIGHT_MS,
  answerSprint,
  newSprint,
  showsFlame,
  sprintOver,
  sprintQuestion,
  sprintTimeLeft,
  type SprintState,
} from '../../../lib/vocab-games/sprint';
import { elapsedMs, pauseClock, resumeClock, startClock, type GameClock } from '../../../lib/vocab-games/clock';
import { bestsKey, loadBestsFor, recordSprintScore, saveBestsFor, type SprintBest } from '../../../lib/vocab-games/bests';
import { recordGameRecognition } from '../../../lib/vocab-games/record';
import { minimumWords } from '../../../lib/vocab-games/sets';
import { currentOwner } from '../../../lib/store-owner';
import { buildSetFor, topicBySlug, topicPool } from './deck';
import { FlameIcon, GAME_LINES, GAME_NAMES, GameGlyph, GameHeading, OwnerNote, SignInLine, Stat, StatRow, TopicSwitch, WordReview, gamesHref } from './GameParts';
import { useGameOwner } from './useGameOwner';

type Phase = 'start' | 'play' | 'paused' | 'end';

interface Feedback {
  option: string;
  correct: boolean;
}

interface Result {
  score: number;
  bestStreak: number;
  isBest: boolean;
  previous: SprintBest | null;
}

export default function SprintGame({ topicSlug }: { topicSlug: string | null }) {
  const { t } = useT();
  const topic = topicBySlug(topicSlug);
  const [phase, setPhase] = useState<Phase>('start');
  const owner = useGameOwner(() => setPhase('start'));
  const [deck, setDeck] = useState<VocabCard[]>([]);
  const [index, setIndex] = useState(0);
  const [sprint, setSprint] = useState<SprintState>(newSprint());
  const sprintRef = useRef(sprint);
  sprintRef.current = sprint;
  const [clock, setClock] = useState<GameClock | null>(null);
  const [now, setNow] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [best, setBest] = useState<SprintBest | null>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const advanceTimer = useRef<number | null>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLHeadingElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);

  const clearAdvance = () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };
  useEffect(() => clearAdvance, []);

  useEffect(() => {
    if (phase !== 'start') return;
    const me = currentOwner();
    setBest(loadBestsFor(me).sprint[bestsKey(topicSlug)] ?? null);
    setAvailable(buildSetFor(me, 'sprint', topicSlug).length);
  }, [phase, topicSlug, owner.signedIn]);

  /* One question per position in the run, built once. */
  const question: PracticeQuestion | null = useMemo(
    () => (deck.length ? sprintQuestion(deck, index, topicPool) : null),
    [deck, index],
  );

  const start = useCallback(() => {
    clearAdvance();
    const session = owner.open();
    owner.clearNote();
    setDeck(buildSetFor(session.owner, 'sprint', topicSlug));
    setIndex(0);
    setSprint(newSprint());
    setFeedback(null);
    setResult(null);
    const at = Date.now();
    setClock(startClock(at));
    setNow(at);
    setAnnounce(t('Sprint started. One minute.'));
    setPhase('play');
  }, [owner, topicSlug, t]);

  const finish = useCallback(
    (final: SprintState) => {
      clearAdvance();
      const me = owner.ownerNow();
      let outcome: Result = { score: final.score, bestStreak: final.bestStreak, isBest: false, previous: null };
      if (me) {
        const recorded = recordSprintScore(loadBestsFor(me), bestsKey(topicSlug), final.score, new Date().toISOString());
        if (recorded.isBest) saveBestsFor(me, recorded.bests);
        outcome = { ...outcome, isBest: recorded.isBest, previous: recorded.previous };
      }
      setResult(outcome);
      setFeedback(null);
      setPhase('end');
    },
    [owner, topicSlug],
  );

  /* The minute. */
  useEffect(() => {
    if (phase !== 'play' || !clock) return;
    const id = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (sprintOver(elapsedMs(clock, at))) {
        window.clearInterval(id);
        finish(sprintRef.current);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, clock, finish]);

  /* Hidden tab: pause, and wait for the student to carry on. */
  useEffect(() => {
    function onVisibility() {
      if (document.hidden && phase === 'play') {
        clearAdvance();
        setClock((c) => (c ? pauseClock(c, Date.now()) : c));
        setFeedback(null);
        setIndex((i) => (feedback ? i + 1 : i));
        setPhase('paused');
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [phase, feedback]);

  const resume = useCallback(() => {
    setClock((c) => (c ? resumeClock(c, Date.now()) : c));
    setNow(Date.now());
    setPhase('play');
  }, []);

  useEffect(() => {
    if (phase === 'paused') resumeRef.current?.focus({ preventScroll: true });
    if (phase === 'end') endRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    if (phase === 'play' && !feedback) firstOptionRef.current?.focus({ preventScroll: true });
  }, [phase, feedback, index]);

  const choose = useCallback(
    (option: string) => {
      if (phase !== 'play' || !question || feedback || !clock) return;
      if (sprintOver(elapsedMs(clock, Date.now()))) return;
      const card = question.card;
      const answer = answerSprint(sprint, card.word, option);
      if (answer.record && !owner.claim((me) => recordGameRecognition(me, card, answer.correct, false))) return;
      setSprint(answer.state);
      setFeedback({ option, correct: answer.correct });
      setAnnounce(answer.correct ? t('Right. Score {score}.', { score: answer.state.score }) : t('The answer is “{word}”.', { word: card.word }));
      advanceTimer.current = window.setTimeout(
        () => {
          advanceTimer.current = null;
          setFeedback(null);
          setIndex((i) => i + 1);
        },
        answer.correct ? SPRINT_RIGHT_MS : SPRINT_REVEAL_MS,
      );
    },
    [phase, question, feedback, clock, sprint, owner, t],
  );

  useEffect(() => {
    if (phase !== 'play' || !question) return;
    function onKey(e: KeyboardEvent) {
      const n = Number(e.key);
      if (n >= 1 && n <= question!.options.length) {
        e.preventDefault();
        choose(question!.options[n - 1]!);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, question, choose]);

  const elapsed = clock ? elapsedMs(clock, now) : 0;
  const left = sprintTimeLeft(elapsed);
  const seconds = Math.ceil(left / 1000);
  const flame = showsFlame(sprint.streak);
  const missedCards = sprint.missed.map((w) => deck.find((c) => c.word === w)).filter((c): c is VocabCard => Boolean(c));
  const name = GAME_NAMES.sprint;

  return (
    <div className="vg vg-game vg-game-sprint" data-game="sprint" data-phase={phase}>
      <GameHeading title={name} topic={topicSlug} />
      <OwnerNote note={owner.note} />

      {phase === 'start' && (
        <section className="vg-card vg-start" aria-labelledby="vg-start-title">
          <GameGlyph game="sprint" />
          <h2 id="vg-start-title">{t(GAME_LINES.sprint)}</h2>
          <p className="vg-muted">{t('Choose the missing word. Three right in a row starts a streak. The minute starts when you press Start, and pauses if you leave the tab.')}</p>
          <TopicSwitch game="sprint" topic={topic} />
          {best && <p className="vg-best-line">{t('Your best here: {score}', { score: best.score })}</p>}
          {available !== null && available < minimumWords('sprint') ? (
            <p className="vg-muted">{t('There are not enough words here for this game. Choose another topic.')}</p>
          ) : (
            <button type="button" className="vg-btn vg-btn-primary" onClick={start} data-vg-start>
              {t('Start')}
            </button>
          )}
          <SignInLine signedIn={owner.signedIn} />
        </section>
      )}

      {(phase === 'play' || phase === 'paused') && (
        <section className="vg-play" aria-label={t(name)}>
          <div className="vg-bar">
            <span className="vg-timer" role="timer" aria-label={t('Time left')}>
              <span className="vg-timer-track" aria-hidden="true">
                <span className="vg-timer-fill" style={{ transform: `scaleX(${left / SPRINT_MS})` }} data-low={left < 10_000 || undefined} />
              </span>
              <span className="vg-timer-num" data-vg-seconds>
                {t('{s}s', { s: seconds })}
              </span>
            </span>
            <span className="vg-score" aria-label={t('Score')}>
              <span key={sprint.score} className={sprint.score ? 'vg-score-num is-bump' : 'vg-score-num'} data-vg-score>
                {sprint.score}
              </span>
            </span>
            <span className={`vg-streak${flame ? ' is-hot' : ''}`} data-vg-streak={sprint.streak}>
              {flame && <FlameIcon className="vg-flame" />}
              {t('Streak {n}', { n: sprint.streak })}
            </span>
          </div>

          {phase === 'paused' ? (
            <div className="vg-card vg-paused">
              <h2>{t('Paused')}</h2>
              <p className="vg-muted">{t('The clock stopped while you were away.')}</p>
              <button type="button" className="vg-btn vg-btn-primary" onClick={resume} ref={resumeRef}>
                {t('Carry on')}
              </button>
            </div>
          ) : (
            question && (
              <div className="vg-sprint-q" key={`${index}-${question.card.word}`}>
                {question.kind === 'gap' ? (
                  <p className="vg-sentence" lang="en">
                    {question.before}
                    <span className={`vg-gap${feedback ? (feedback.correct ? ' is-right' : ' is-revealed') : ''}`}>
                      {feedback ? question.answerText : <span className="vg-sr">{t('blank')}</span>}
                    </span>
                    {question.after}
                  </p>
                ) : (
                  <p className="vg-sentence" lang="en">
                    {question.card.definition}
                  </p>
                )}
                {question.kind === 'gap' && (
                  <p className="vg-clue">
                    <span>{t('Meaning')}</span>
                    <span lang="en">{question.card.definition}</span>
                  </p>
                )}
                <div className="vg-options" role="group" aria-label={t('Answer options')}>
                  {question.options.map((option, i) => {
                    const state = !feedback
                      ? ''
                      : option === question.card.word
                        ? ' is-right'
                        : option === feedback.option
                          ? ' is-wrong'
                          : ' is-dim';
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`vg-option${state}`}
                        onClick={() => choose(option)}
                        aria-disabled={feedback ? true : undefined}
                        ref={i === 0 ? firstOptionRef : undefined}
                        lang="en"
                      >
                        <kbd aria-hidden="true">{i + 1}</kbd>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
                {feedback && feedback.correct && (
                  <span className="vg-plus" aria-hidden="true">
                    +1
                  </span>
                )}
              </div>
            )
          )}
        </section>
      )}

      {phase === 'end' && result && (
        <section className="vg-card vg-end" aria-labelledby="vg-end-title">
          <h2 id="vg-end-title" tabIndex={-1} ref={endRef}>
            {result.isBest ? t('New personal best') : t('Time is up')}
          </h2>
          <p className="vg-end-topic">{topic ? t(topic.title) : t('Mixed set')}</p>
          <StatRow>
            <Stat label={t('Score')} value={String(result.score)} accent />
            <Stat label={t('Your best')} value={String(result.isBest ? result.score : Math.max(result.previous?.score ?? 0, result.score))} />
            <Stat label={t('Longest streak')} value={String(result.bestStreak)} />
          </StatRow>
          <WordReview title={nt('Words you missed')} cards={missedCards} />
          {!missedCards.length && result.score > 0 && <p className="vg-muted">{t('No mistakes at all. Well done.')}</p>}
          <div className="vg-actions">
            <button type="button" className="vg-btn vg-btn-primary" onClick={start}>
              {t('Play again')}
            </button>
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
