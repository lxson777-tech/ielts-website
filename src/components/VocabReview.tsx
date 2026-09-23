/* One practice round over a single topic: the "Practise these words"
   action at the bottom of a topic view in VocabTopics.tsx.

   Replaced the self-graded flashcards. Those showed a word, flipped to the
   definition, and then asked the student to rate their own memory as
   Again / Hard / Good / Easy with captions like "3 · 6 days". The owner
   found it confusing, and nothing on screen explained what the ratings
   were for. A round is now ten real questions that the site marks:

     - the word's example sentence with the word missing, its meaning as a
       clue, and four words from the same topic to choose from;
     - instant right or wrong, with the finished sentence shown either way;
     - a word missed once comes back at the end of the round;
     - a result screen listing the words to look at again.

   Question building lives in src/lib/vocab-practice.ts. Which words go in
   a round, and the spacing that brings them back on later days, is still
   src/lib/vocab-review.ts: an answer is recorded there exactly as a rating
   used to be (right first time = "good", missed = "again", right on the
   second go = "hard"), so progress saved under the old flashcards keeps
   working and the daily plan's vocabulary count is unchanged. That store is
   keyed per owner (src/lib/store-owner.ts), so a second student on the same
   browser never inherits the first one's schedule.

   Every answer also writes one event on the shared learner record via
   recordVocabularyReview(), so the plan can see what was actually
   answered, not just opened. Picking the missing word from four is
   recognition, not recall, so it is recorded as direction 'recognise' and
   never counts toward a word being "known" (isWordKnown() in
   vocab-review.ts needs unassisted recall on two different days). A second
   go at a missed word comes after the answer was shown, so it is recorded
   as assisted. The spaced-review state is saved first; the evidence write
   can never interrupt the round.

   WHOSE ROUND IT IS (the follow-up to R2B-01, 23 September 2026). A round
   belongs to the student on the page when it started (./vocab-round-owner.ts):
   every answer is claimed at the click and written under that student
   through writers that take the owner, and when the page changes hands the
   screen hands over to a fresh round from the incoming student's own
   schedule, with one calm line saying why. */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VocabCard } from '../lib/vocab-review';
import { getTopicCards } from '../lib/vocab-review';
import { buildQuestion } from '../lib/vocab-practice';
import { onOwnerChange } from '../lib/store-owner';
import SessionContinueBar from './learning/SessionContinueBar';
import {
  EXERCISE_OWNER_CHANGED_NOTE,
  claimExerciseCheck,
  exerciseIsCurrent,
  type ExerciseSession,
} from './learning/exercise-owner';
import { openVocabRound, recordVocabAnswer, vocabActivityId, type Queued } from './vocab-round-owner';
import { useT } from '../lib/i18n/react';
import '../styles/learning-vocab.css';

type Phase = 'loading' | 'active' | 'finished';

export default function VocabReview({ topic, onExit }: { topic: string; onExit: () => void }) {
  const { t } = useT();
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<Queued[]>([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [roundSize, setRoundSize] = useState(0);
  const [rightFirstTime, setRightFirstTime] = useState(0);
  const [missed, setMissed] = useState<VocabCard[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  /* Whose round this screen holds (./vocab-round-owner.ts): bound when the
     round starts, and moved to the incoming student only by handOver below.
     State, so every render's questions and the student they are answered
     for belong together; the ref is for the owner-change listener. */
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const sessionRef = useRef<ExerciseSession | null>(null);
  /* The one calm line after the page changed hands. */
  const [ownerNote, setOwnerNote] = useState<string | null>(null);
  /* True when this tab missed an account change and refused a click: the
     round leaves the screen until the tab hears who is here. */
  const [withheld, setWithheld] = useState(false);

  /** A round for the owner on the page right now, from their own
      schedule. Touches only refs and setters, so the owner-change listener
      can call it from any render. */
  const begin = useCallback(() => {
    const opened = openVocabRound(topic);
    const round = opened.questions;
    sessionRef.current = opened.session;
    setSession(opened.session);
    setWithheld(false);
    setQuestions(round);
    setRoundSize(round.length);
    setIndex(0);
    setChosen(null);
    setRightFirstTime(0);
    setMissed([]);
    setPhase(round.length ? 'active' : 'finished');
  }, [topic]);

  const start = useCallback(() => {
    begin();
    setOwnerNote(null);
  }, [begin]);

  /* The page changed hands, here or in another tab. Every answer of the
     outgoing student's round was written at its own click, under them, so
     nothing of theirs is lost; none of it stays on screen. The incoming
     student gets a fresh round from their own schedule, and one calm line
     saying why. */
  const handOver = useCallback(() => {
    begin();
    setOwnerNote(EXERCISE_OWNER_CHANGED_NOTE);
  }, [begin]);

  /* This tab missed the account change: it still names the previous
     student, but this device's account session is somebody else's
     (claimExerciseCheck said 'device-changed'). Nothing is written, and the
     round leaves the screen until this tab hears who is here, when the
     listener below hands over. */
  const withhold = useCallback(() => {
    setWithheld(true);
    setOwnerNote(EXERCISE_OWNER_CHANGED_NOTE);
  }, []);

  // Deferred to the client so the round (scheduled against localStorage)
  // matches the student's saved progress from the first render.
  useEffect(() => {
    start();
  }, [start]);

  /* A sign-out, sign-in or account switch, from this tab or another. The
     same owner being told its stores changed (the anonymous-work claim)
     replaces nothing. */
  useEffect(() => {
    const stop = onOwnerChange(() => {
      if (sessionRef.current === null || exerciseIsCurrent(sessionRef.current)) return;
      handOver();
    });
    return () => {
      stop();
    };
  }, [handOver]);

  /** True while this render's round is the one on screen. A handler from a
      render made before a hand-over (the gap between the hand-over and the
      next render) must not answer one student's question for the next. */
  const live = session !== null && session === sessionRef.current && !withheld;

  const current = questions[index];
  const answered = chosen !== null;
  const isRetry = current?.retry ?? false;

  // Once an answer is marked: scroll only as far as needed to bring the
  // result and Next into view (on a phone they start below the fold; its
  // scroll-margin keeps them clear of the tab bar and the Mr EZ button),
  // with keyboard focus on Next. Focus goes first: in Chrome a focus()
  // call cancels a smooth scroll already under way, even with
  // preventScroll. autoFocus alone scrolled the finished sentence off the
  // top of a phone screen.
  useEffect(() => {
    if (chosen === null) return;
    nextRef.current?.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [chosen]);

  const choose = useCallback(
    (option: string) => {
      if (!current || chosen !== null || !live) return;
      /* Accepted only for the student whose round this is, bound to them at
         the click. A refusal writes nothing and hands over, or takes the
         round off the screen. */
      const claim = claimExerciseCheck(session);
      if ('refused' in claim) {
        if (claim.refused === 'owner-changed') handOver();
        else withhold();
        return;
      }
      try {
        const correct = option === current.card.word;
        setChosen(option);
        setOwnerNote(null);
        /* Written under the student the round was started for (the claim
           refuses anybody else), through writers that take that owner. */
        recordVocabAnswer(claim.binding.owner, current.card, correct, isRetry);
        if (isRetry) return;
        if (correct) {
          setRightFirstTime((n) => n + 1);
        } else {
          setMissed((m) => [...m, current.card]);
          // Once more at the end of the round, with the options reshuffled so
          // the right answer is not simply remembered by its position.
          const pool = getTopicCards(topic);
          setQuestions((q) => [...q, { ...buildQuestion(current.card, pool), retry: true }]);
        }
      } finally {
        claim.binding.cancel();
      }
    },
    [current, chosen, isRetry, topic, live, session, handOver, withhold],
  );

  const next = useCallback(() => {
    if (!live) return;
    if (index + 1 >= questions.length) {
      setPhase('finished');
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
  }, [index, questions.length, live]);

  useEffect(() => {
    if (phase !== 'active' || !current) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (!answered) {
        const n = Number(e.key);
        if (n >= 1 && n <= current!.options.length) choose(current!.options[n - 1]!);
      } else if (e.key === 'Enter' && target?.tagName !== 'BUTTON') {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, current, answered, choose, next]);

  const isLast = index + 1 >= questions.length;
  const wasCorrect = answered && current ? chosen === current.card.word : false;
  const formChanged =
    current?.kind === 'gap' && current.answerText !== undefined && current.answerText.toLowerCase() !== current.card.word.toLowerCase();

  return (
    <div className="vocab-review-space">
      <div className="vocab-review-head">
        <p className="vocab-back-link">
          <button type="button" className="vocab-text-link" onClick={onExit}>
            {topic}
          </button>
        </p>
        <h1>{t('Practice')}</h1>
      </div>

      {ownerNote && (
        <p className="vocab-hint" role="status">
          {t(ownerNote)}
        </p>
      )}

      {phase === 'loading' && <p className="vocab-hint">{t('Getting your words ready…')}</p>}

      {!withheld && phase === 'active' && current && (
        <>
          <div className="vocab-round-progress" aria-hidden="true">
            <span style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
          </div>
          <p className="vocab-progress">{t('{current} of {total}', { current: index + 1, total: questions.length })}</p>

          <div className="vocab-question" key={`${index}-${current.card.word}`}>
            <p className="vocab-question-label">
              {current.kind === 'gap'
                ? t('Choose the word that completes the sentence.')
                : t('Choose the word that matches this meaning.')}
            </p>

            {current.kind === 'gap' ? (
              <>
                <p className="vocab-question-sentence">
                  {current.before}
                  <span className={`vocab-gap${answered ? (wasCorrect ? ' is-right' : ' is-revealed') : ''}`}>
                    {answered ? current.answerText : <span className="sr-only">{t('blank')}</span>}
                  </span>
                  {current.after}
                </p>
                <p className="vocab-question-clue">
                  <span>{t('Meaning')}</span>
                  {current.card.definition}
                </p>
                {formChanged && !answered && (
                  <p className="vocab-question-note">{t('The word may change a little to fit, for example by adding -s.')}</p>
                )}
              </>
            ) : (
              <p className="vocab-question-sentence">{current.card.definition}</p>
            )}
          </div>

          <div className="vocab-options" role="group" aria-label={t('Answer options')}>
            {current.options.map((option, i) => {
              const state = !answered
                ? ''
                : option === current.card.word
                  ? ' is-right'
                  : option === chosen
                    ? ' is-wrong'
                    : ' is-dim';
              return (
                <button
                  key={option}
                  type="button"
                  className={`vocab-option${state}`}
                  onClick={() => choose(option)}
                  disabled={answered}
                  aria-pressed={option === chosen}
                >
                  <kbd aria-hidden="true">{i + 1}</kbd>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {answered && (
            <div className={`vocab-feedback${wasCorrect ? ' is-right' : ' is-wrong'}`} role="status" ref={feedbackRef}>
              <div>
                <strong>{wasCorrect ? t('Correct!') : t('Not quite. The answer is “{word}”.', { word: current.card.word })}</strong>
                {current.kind === 'meaning' && current.card.example && <p>“{current.card.example}”</p>}
                {!wasCorrect && !isRetry && <p>{t('This word will come back at the end of the round.')}</p>}
              </div>
              <button type="button" className="vocab-next" onClick={next} ref={nextRef}>
                {isLast ? t('See my results') : t('Next')}
              </button>
            </div>
          )}
        </>
      )}

      {!withheld && phase === 'finished' && (
        <div className="vocab-finished">
          <h2>{t('Round complete')}</h2>
          {roundSize > 0 && (
            <p className="vocab-score">
              {t('{score} of {total} right first time', { score: rightFirstTime, total: roundSize })}
            </p>
          )}

          {missed.length > 0 ? (
            <div className="vocab-struggle">
              <h3>{t('Words to look at again')}</h3>
              <ul>
                {missed.map((c) => (
                  <li key={c.word}>
                    <strong>{c.word}</strong>
                    <span>{c.definition}</span>
                    {c.example && <em>“{c.example}”</em>}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            roundSize > 0 && <p className="vocab-finished-note">{t('Every word right first time. Well done.')}</p>
          )}

          <div className="vocab-finished-actions">
            <button type="button" onClick={start}>
              {t('Practise another round')}
            </button>
            <button type="button" className="vocab-finished-secondary" onClick={onExit}>
              {t('Back to {topic}', { topic })}
            </button>
          </div>
          <p className="vocab-hint">{t('Words you miss come back sooner. Words you know come back less often.')}</p>

          <div className="vocab-session-continue-wrap">
            <SessionContinueBar activityId={vocabActivityId(topic)} />
          </div>
        </div>
      )}
    </div>
  );
}
