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
   can never interrupt the round. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getPracticeRound, getTopicCards, rate, vocabAssistanceLevel, type VocabCard } from '../lib/vocab-review';
import { buildQuestion, type PracticeQuestion } from '../lib/vocab-practice';
import { VOCABULARY_PARTS } from '../data/vocabulary';
import { getLearnerStore } from '../lib/learning/store.browser';
import SessionContinueBar from './learning/SessionContinueBar';
import { useT } from '../lib/i18n/react';
import '../styles/learning-vocab.css';

type Phase = 'loading' | 'active' | 'finished';

/** A question in the round's queue. `retry` marks the second showing of a
    word missed earlier in the same round. */
type Queued = PracticeQuestion & { retry: boolean };

const ROUND_SIZE = 10;

function newRound(topic: string): Queued[] {
  const pool = getTopicCards(topic);
  return getPracticeRound(topic, ROUND_SIZE).map((card) => ({ ...buildQuestion(card, pool), retry: false }));
}

/** The catalogue's own vocabReviewActivityId() (src/lib/learning/catalog.ts)
    produces exactly this string from a topic slug. Duplicated as a literal
    format here, rather than imported, because catalog.ts is a different
    work package's file and pulls in the generated learning index; if that
    format ever changes, this line and catalog.ts's must change together. */
function vocabActivityId(topicTitle: string): string {
  const slug = VOCABULARY_PARTS.find((p) => p.title === topicTitle)?.slug;
  return slug ? `review:vocabulary:${slug}` : 'review:vocabulary';
}

/** Writes one answered question to the shared learner record. Never lets a
    storage or sync hiccup interrupt the round: the local spaced-review
    state (rate()) is the one thing that must not be lost, and it is saved
    separately, before this is ever called. */
function recordEvidence(topicTitle: string, word: string, correct: boolean, assisted: boolean): void {
  try {
    getLearnerStore().recordVocabularyReview({
      activityId: vocabActivityId(topicTitle),
      subskill: 'recognise-meaning',
      words: [{ word, correct, direction: 'recognise' }],
      assistance: vocabAssistanceLevel(assisted),
    });
  } catch {
    /* Evidence is additional to the round, never load-bearing for it. */
  }
}

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

  const start = useCallback(() => {
    const round = newRound(topic);
    setQuestions(round);
    setRoundSize(round.length);
    setIndex(0);
    setChosen(null);
    setRightFirstTime(0);
    setMissed([]);
    setPhase(round.length ? 'active' : 'finished');
  }, [topic]);

  // Deferred to the client so the round (scheduled against localStorage)
  // matches the student's saved progress from the first render.
  useEffect(() => {
    start();
  }, [start]);

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
      if (!current || chosen !== null) return;
      const correct = option === current.card.word;
      setChosen(option);
      if (isRetry) {
        if (correct) rate(current.card.word, 'hard');
        // The answer was shown the first time round, so this go is assisted.
        recordEvidence(current.card.topic, current.card.word, correct, true);
        return;
      }
      rate(current.card.word, correct ? 'good' : 'again');
      recordEvidence(current.card.topic, current.card.word, correct, false);
      if (correct) {
        setRightFirstTime((n) => n + 1);
      } else {
        setMissed((m) => [...m, current.card]);
        // Once more at the end of the round, with the options reshuffled so
        // the right answer is not simply remembered by its position.
        const pool = getTopicCards(topic);
        setQuestions((q) => [...q, { ...buildQuestion(current.card, pool), retry: true }]);
      }
    },
    [current, chosen, isRetry, topic],
  );

  const next = useCallback(() => {
    if (index + 1 >= questions.length) {
      setPhase('finished');
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
  }, [index, questions.length]);

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

      {phase === 'loading' && <p className="vocab-hint">{t('Getting your words ready…')}</p>}

      {phase === 'active' && current && (
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

      {phase === 'finished' && (
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
