/* One flashcard session over a single topic's deck: the "Practise this
   topic with flashcards" action at the bottom of a topic view in
   VocabTopics.tsx. All scheduling logic (what's due, what the next interval
   would be for each rating, which of the three modes a card is ready for)
   lives in src/lib/vocab-review.ts; this component drives one session's UI
   only: which card is showing, which mode it is in, and the running queue.

   THREE MODES, chosen per card by src/lib/vocab-review.ts's
   chooseReviewMode() rather than picked here:
     recognise: the original mode. Word on the front, tap or press space to
       reveal the definition, then rate yourself (Again/Hard/Good/Easy).
       Unchanged: same card, same four buttons, same rate() call.
     recall: the meaning is shown; type the English word (checked leniently
       for case and spacing, never auto-corrected) or reveal it. A revealed
       answer always counts as assisted.
     use: write your own sentence with the word. A modest mechanical check
       (the word or a simple inflection, and a sensible minimum length) has
       to pass before you compare your sentence with the lesson's real
       example and rate yourself honestly. No AI, no grammar judgement.

   A word only becomes "known" for planning purposes after unassisted
   correct RECALL on two separate days (see isWordKnown() in
   vocab-review.ts). Recognising a definition, however many times, never
   promotes a word on its own.

   Every rated card writes two things: the local spaced-review state (via
   rate()/recordReviewOutcome(), exactly as before: same store, same
   format), and one event on the shared learner record via
   recordVocabularyReview(), so the plan can see what was actually
   recalled, not just opened.

   "Again" (recognise) and an incorrect/assisted answer (recall, use) don't
   leave the queue: they get pushed back onto the end, so they resurface
   later in the same session rather than waiting for the next day, while the
   progress line ("N of M") grows to match. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  checkRecallAnswer,
  checkSentenceUsage,
  getDueCardsWithModes,
  getStrugglingCards,
  getVocabSummary,
  MIN_SENTENCE_WORDS,
  previewIntervals,
  rate,
  recordReviewOutcome,
  vocabAssistanceLevel,
  type Grade,
  type ReviewMode,
  type StrugglingCard,
  type VocabCard,
  type VocabSummary,
} from '../lib/vocab-review';
import { VOCABULARY_PARTS } from '../data/vocabulary';
import { getLearnerStore } from '../lib/learning/store.browser';
import SessionContinueBar from './learning/SessionContinueBar';
import { useT, type Translator } from '../lib/i18n/react';
import { nt } from '../lib/i18n/translate';
import '../styles/learning-vocab.css';

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];
const GRADE_LABEL: Record<Grade, string> = { again: nt('Again'), hard: nt('Hard'), good: nt('Good'), easy: nt('Easy') };
const GRADE_KEY: Record<string, Grade> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };

const MODE_LABEL: Record<ReviewMode, string> = {
  recognise: nt('Recognise'),
  recall: nt('Recall'),
  use: nt('Use it'),
};

/** The catalogue's own vocabReviewActivityId() (src/lib/learning/catalog.ts)
    produces exactly this string from a topic slug. Duplicated as a literal
    format here, rather than imported, because catalog.ts is a different
    work package's file and pulls in the generated learning index; if that
    format ever changes, this line and catalog.ts's must change together. */
function vocabActivityId(topicTitle: string): string {
  const slug = VOCABULARY_PARTS.find((p) => p.title === topicTitle)?.slug;
  return slug ? `review:vocabulary:${slug}` : 'review:vocabulary';
}

/** Writes one review pass to the shared learner record. Never lets a
    storage or sync hiccup interrupt the session: the local spaced-review
    state (rate()/recordReviewOutcome()) is the one thing that must not be
    lost, and it is saved separately, before this is ever called. */
function recordEvidence(topicTitle: string, mode: ReviewMode, word: string, correct: boolean, assisted: boolean): void {
  try {
    getLearnerStore().recordVocabularyReview({
      activityId: vocabActivityId(topicTitle),
      subskill: mode === 'recognise' ? 'recognise-meaning' : mode === 'recall' ? 'recall-from-meaning' : 'use-in-a-sentence',
      words: [{ word, correct, direction: mode }],
      assistance: vocabAssistanceLevel(assisted),
    });
  } catch {
    /* Evidence is additional to the session, never load-bearing for it. */
  }
}

/** "Good: 4 days" style captions under each rating button. Takes the
    translator functions as parameters (rather than importing t/tn at module
    scope) because this is a plain helper called from render, not a hook. */
function formatInterval(days: number, t: Translator['t'], tn: Translator['tn']): string {
  if (days <= 0) return t('later today');
  if (days < 30) return tn(days, { one: '{n} day', other: '{n} days' }, { n: days });
  const months = Math.round(days / 30);
  if (months < 12) return tn(months, { one: '{n} month', other: '{n} months' }, { n: months });
  const years = Math.round(days / 365);
  return tn(years, { one: '{n} year', other: '{n} years' }, { n: years });
}

/** How many days from today (YYYY-MM-DD) until `due` (YYYY-MM-DD). */
function daysUntil(due: string, today: string): number {
  const ms = new Date(`${due}T00:00:00.000Z`).getTime() - new Date(`${today}T00:00:00.000Z`).getTime();
  return Math.round(ms / 86_400_000);
}

/** A plain-language line about when today's reviewed words come back, from
    the due dates recordReviewOutcome()/rate() actually returned this
    session (never a guess), and never shown when nothing was reviewed. */
function nextReviewLine(dueDates: string[], t: Translator['t'], tn: Translator['tn']): string | null {
  if (dueDates.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const earliest = [...dueDates].sort()[0]!;
  const days = daysUntil(earliest, today);
  if (days <= 0) return t('Some of today’s words are already due again.');
  if (days === 1) return t('The next of today’s words comes back tomorrow.');
  return tn(
    days,
    { one: 'The next of today’s words comes back in {n} day.', other: 'The next of today’s words comes back in {n} days.' },
    { n: days },
  );
}

type Phase = 'loading' | 'active' | 'finished';
type QueueItem = { card: VocabCard; mode: ReviewMode };

export default function VocabReview({ topic, onExit }: { topic: string; onExit: () => void }) {
  const { t, tn } = useT();
  const [phase, setPhase] = useState<Phase>('loading');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [modeCounts, setModeCounts] = useState<Record<ReviewMode, number>>({ recognise: 0, recall: 0, use: 0 });
  const [dueDates, setDueDates] = useState<string[]>([]);
  const [summary, setSummary] = useState<VocabSummary | null>(null);
  const [struggling, setStruggling] = useState<StrugglingCard[]>([]);

  // Recall mode's own transient state.
  const [recallInput, setRecallInput] = useState('');
  const [recallResult, setRecallResult] = useState<{ correct: boolean; assisted: boolean } | null>(null);

  // Use-in-a-sentence mode's own transient state.
  const [sentenceInput, setSentenceInput] = useState('');
  const [sentenceError, setSentenceError] = useState<string | null>(null);
  const [sentenceStage, setSentenceStage] = useState<'writing' | 'compare'>('writing');

  // Deferred to the client so the deck (parsed at build time but scheduled
  // against localStorage) and the browser's stored progress agree from the
  // first render, with no server/client mismatch.
  useEffect(() => {
    setQueue(getDueCardsWithModes(topic));
    setIndex(0);
    setSessionCount(0);
    setModeCounts({ recognise: 0, recall: 0, use: 0 });
    setDueDates([]);
    setPhase('active');
  }, [topic]);

  const current = queue[index];

  // Every per-card control resets when the card (or its mode) changes, so a
  // requeued word never opens already answered or half-typed into.
  useEffect(() => {
    setRevealed(false);
    setRecallInput('');
    setRecallResult(null);
    setSentenceInput('');
    setSentenceError(null);
    setSentenceStage('writing');
  }, [current?.card.word, current?.mode]);

  const intervals = useMemo(
    () => (current && current.mode === 'recognise' ? previewIntervals(current.card.word) : null),
    [current],
  );

  const finishSession = useCallback(() => {
    setSummary(getVocabSummary());
    setStruggling(getStrugglingCards().filter((c) => c.topic === topic));
    setPhase('finished');
  }, [topic]);

  const advance = useCallback(
    (requeue: boolean) => {
      if (requeue && current) setQueue((q) => [...q, current]);
      setIndex((i) => i + 1);
    },
    [current],
  );

  const noteOutcome = useCallback((mode: ReviewMode, due: string | undefined) => {
    setSessionCount((n) => n + 1);
    setModeCounts((m) => ({ ...m, [mode]: m[mode] + 1 }));
    if (due) setDueDates((d) => [...d, due]);
  }, []);

  const handleRecognise = useCallback(
    (grade: Grade) => {
      if (!current) return;
      const next = rate(current.card.word, grade);
      const correct = grade !== 'again';
      recordEvidence(current.card.topic, 'recognise', current.card.word, correct, false);
      noteOutcome('recognise', next?.due);
      advance(grade === 'again');
    },
    [current, advance, noteOutcome],
  );

  const submitRecall = useCallback(() => {
    if (!current) return;
    setRecallResult({ correct: checkRecallAnswer(recallInput, current.card.word), assisted: false });
  }, [current, recallInput]);

  const revealRecall = useCallback(() => {
    setRecallResult({ correct: false, assisted: true });
  }, []);

  const commitRecall = useCallback(() => {
    if (!current || !recallResult) return;
    const next = recordReviewOutcome(current.card.word, 'recall', recallResult.correct, recallResult.assisted);
    recordEvidence(current.card.topic, 'recall', current.card.word, recallResult.correct, recallResult.assisted);
    noteOutcome('recall', next?.due);
    advance(!recallResult.correct || recallResult.assisted);
  }, [current, recallResult, advance, noteOutcome]);

  const submitSentence = useCallback(() => {
    if (!current) return;
    const result = checkSentenceUsage(sentenceInput, current.card.word);
    if (!result.passes) {
      setSentenceError(
        !result.mentionsWord
          ? t('Try to use the word itself, or a simple form of it.')
          : t('A little more. Aim for at least {n} words.', { n: MIN_SENTENCE_WORDS }),
      );
      return;
    }
    setSentenceError(null);
    setSentenceStage('compare');
  }, [current, sentenceInput, t]);

  const commitSentence = useCallback(
    (usedWell: boolean) => {
      if (!current) return;
      const next = recordReviewOutcome(current.card.word, 'use', usedWell, false);
      recordEvidence(current.card.topic, 'use', current.card.word, usedWell, false);
      noteOutcome('use', next?.due);
      advance(!usedWell);
    },
    [current, advance, noteOutcome],
  );

  useEffect(() => {
    if (phase === 'active' && queue.length > 0 && index >= queue.length) finishSession();
  }, [phase, queue, index, finishSession]);

  useEffect(() => {
    if (phase === 'active' && queue.length === 0) finishSession();
  }, [phase, queue, finishSession]);

  // Recognise mode's own keyboard handling: space flips, 1-4 rates once
  // flipped. Left untouched from before, only now gated to recognise so it
  // never steals keystrokes from the recall/use text inputs.
  useEffect(() => {
    if (phase !== 'active' || !current || current.mode !== 'recognise') return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setRevealed((f) => !f);
        return;
      }
      if (revealed) {
        const grade = GRADE_KEY[e.key];
        if (grade) handleRecognise(grade);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, revealed, current, handleRecognise]);

  const restart = () => {
    setQueue(getDueCardsWithModes(topic));
    setIndex(0);
    setSessionCount(0);
    setModeCounts({ recognise: 0, recall: 0, use: 0 });
    setDueDates([]);
    setPhase('active');
  };

  const nextLine = nextReviewLine(dueDates, t, tn);
  const modeBreakdown = (['recall', 'use', 'recognise'] as ReviewMode[])
    .filter((mode) => modeCounts[mode] > 0)
    .map((mode) => ({ mode, count: modeCounts[mode], label: t(MODE_LABEL[mode]) }));

  return (
    <div className="vocab-review-space">
      <div className="vocab-review-head">
        <p className="vocab-back-link">
          <button type="button" className="vocab-text-link" onClick={onExit}>
            {topic}
          </button>
        </p>
        <h1>{t('Flashcards')}</h1>
      </div>

      {phase === 'loading' && <p className="vocab-hint">{t('Loading your deck…')}</p>}

      {phase === 'active' && current && (
        <>
          <div className="vocab-mode-row">
            <p className="vocab-progress">{t('{current} of {total}', { current: index + 1, total: queue.length })}</p>
            <span className={`vocab-mode-badge vocab-mode-${current.mode}`}>{t(MODE_LABEL[current.mode])}</span>
          </div>

          {current.mode === 'recognise' && (
            <>
              <div
                className="vocab-card"
                role="button"
                tabIndex={0}
                aria-pressed={revealed}
                aria-label={
                  revealed
                    ? t('{word}: definition shown, tap to hide', { word: current.card.word })
                    : t('{word}: tap or press space to reveal the definition', { word: current.card.word })
                }
                onClick={() => setRevealed((f) => !f)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
                    e.preventDefault();
                    e.stopPropagation();
                    setRevealed((f) => !f);
                  }
                }}
              >
                <span className="vocab-card-topic">{current.card.topic}</span>
                {!revealed ? (
                  <div className="vocab-card-word" key={`${current.card.word}-front`}>
                    {current.card.word}
                  </div>
                ) : (
                  <div className="vocab-card-back" key={`${current.card.word}-back`}>
                    <p className="vocab-card-def">{current.card.definition}</p>
                    {current.card.example && <p className="vocab-card-example">“{current.card.example}”</p>}
                  </div>
                )}
              </div>

              {!revealed ? (
                <p className="vocab-hint">{t('Tap the card or press space to reveal')}</p>
              ) : (
                <div className="vocab-ratings" role="group" aria-label={t('Rate how well you knew this word')}>
                  {GRADES.map((g, i) => (
                    <button key={g} type="button" className={`vocab-rating vocab-rating-${g}`} onClick={() => handleRecognise(g)}>
                      <span>{t(GRADE_LABEL[g])}</span>
                      <small>
                        {i + 1} · {formatInterval(intervals ? intervals[g] : 0, t, tn)}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {current.mode === 'recall' && (
            <div className="vocab-card vocab-card-static">
              <span className="vocab-card-topic">{current.card.topic}</span>
              <p className="vocab-card-def vocab-recall-prompt">{current.card.definition}</p>

              {!recallResult ? (
                <form
                  className="vocab-recall-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitRecall();
                  }}
                >
                  <label className="vocab-sr-only" htmlFor="vocab-recall-input">
                    {t('Type the English word')}
                  </label>
                  <input
                    id="vocab-recall-input"
                    className="vocab-text-input"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={recallInput}
                    onChange={(e) => setRecallInput(e.target.value)}
                    placeholder={t('Type the English word')}
                  />
                  <div className="vocab-recall-actions">
                    <button type="submit" className="vocab-primary-action">
                      {t('Check')}
                    </button>
                    <button type="button" className="vocab-text-link" onClick={revealRecall}>
                      {t("I don’t know, show me")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="vocab-recall-result">
                  <p className={recallResult.correct ? 'vocab-outcome-good' : 'vocab-outcome-again'}>
                    {recallResult.correct ? t('Correct.') : t('Not quite.')}
                  </p>
                  <p className="vocab-card-word vocab-recall-answer">{current.card.word}</p>
                  {current.card.example && <p className="vocab-card-example">“{current.card.example}”</p>}
                  <button
                    type="button"
                    className="vocab-primary-action"
                    onClick={commitRecall}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRecall();
                    }}
                  >
                    {t('Next')}
                  </button>
                </div>
              )}
            </div>
          )}

          {current.mode === 'use' && (
            <div className="vocab-card vocab-card-static">
              <span className="vocab-card-topic">{current.card.topic}</span>
              <p className="vocab-card-word vocab-use-word">{current.card.word}</p>
              <p className="vocab-card-def">{current.card.definition}</p>

              {sentenceStage === 'writing' ? (
                <form
                  className="vocab-recall-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitSentence();
                  }}
                >
                  <label className="vocab-sr-only" htmlFor="vocab-sentence-input">
                    {t('Write your own sentence using this word')}
                  </label>
                  <input
                    id="vocab-sentence-input"
                    className="vocab-text-input"
                    type="text"
                    value={sentenceInput}
                    onChange={(e) => setSentenceInput(e.target.value)}
                    placeholder={t('Write a sentence with this word')}
                  />
                  {sentenceError && (
                    <p className="vocab-outcome-again vocab-sentence-error" role="alert">
                      {sentenceError}
                    </p>
                  )}
                  <div className="vocab-recall-actions">
                    <button type="submit" className="vocab-primary-action">
                      {t('Check')}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="vocab-recall-result">
                  <p className="vocab-hint">{t('Your sentence:')}</p>
                  <p className="vocab-card-example vocab-sentence-own">“{sentenceInput}”</p>
                  <p className="vocab-hint">{t('The lesson’s own example:')}</p>
                  {current.card.example && <p className="vocab-card-example">“{current.card.example}”</p>}
                  <p className="vocab-hint vocab-self-rate-prompt">{t('Did you use it well?')}</p>
                  <div className="vocab-recall-actions">
                    <button type="button" className="vocab-primary-action" onClick={() => commitSentence(true)}>
                      {t('Yes, I used it well')}
                    </button>
                    <button type="button" className="vocab-text-link" onClick={() => commitSentence(false)}>
                      {t('Not quite, I’ll review it')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {phase === 'finished' && summary && (
        <div className="vocab-finished">
          <h2>{sessionCount > 0 ? t('Session complete') : t("You're all caught up")}</h2>
          <p>
            {sessionCount > 0
              ? tn(sessionCount, {
                  one: 'You reviewed {n} word this session.',
                  other: 'You reviewed {n} words this session.',
                })
              : t('Nothing from {topic} is due right now. Come back tomorrow for more.', { topic })}
          </p>

          {modeBreakdown.length > 1 && (
            <ul className="vocab-mode-breakdown">
              {modeBreakdown.map(({ mode, count, label }) => (
                <li key={mode}>
                  <strong>{count}</strong>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          )}

          {nextLine && <p className="vocab-next-review">{nextLine}</p>}

          <div className="vocab-summary-grid">
            <div>
              <strong>{summary.due}</strong>
              <span>{t('Due now')}</span>
            </div>
            <div>
              <strong>{summary.newToday}</strong>
              <span>{t('New left today')}</span>
            </div>
            <div>
              <strong>{summary.learned}</strong>
              <span>{t('Learned')}</span>
            </div>
            <div>
              <strong>{summary.reviewedToday}</strong>
              <span>{t('Reviewed today')}</span>
            </div>
          </div>

          {struggling.length > 0 && (
            <div className="vocab-struggle">
              <h3>{t('Words you struggle with')}</h3>
              <ul>
                {struggling.map((c) => (
                  <li key={c.word}>
                    <strong>{c.word}</strong>
                    <span>{c.definition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="vocab-finished-actions">
            <button type="button" onClick={restart}>
              {t('Review more')}
            </button>
            <button type="button" className="vocab-finished-secondary" onClick={onExit}>
              {t('Back to {topic}', { topic })}
            </button>
          </div>

          <div className="vocab-session-continue-wrap">
            <SessionContinueBar activityId={vocabActivityId(topic)} />
          </div>
        </div>
      )}
    </div>
  );
}
