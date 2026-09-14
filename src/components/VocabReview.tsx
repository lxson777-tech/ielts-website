/* One flashcard session over a single topic's deck — the "Practise this
   topic with flashcards" action at the bottom of a topic view in
   VocabTopics.tsx. All scheduling logic (what's due, what the next interval
   would be for each rating, where lapsed words go) lives in
   src/lib/vocab-review.ts; this component only drives one session's UI:
   which card is showing, whether it's flipped, and the running queue.

   Used to be the whole /review page (topic chips, a session, a "New words
   per day" picker). The owner's feedback was that the landing experience
   was "weird and confusing" — VocabTopics.tsx is the plain topic browser
   that replaced it, and this component is now a session that always opens
   already filtered to one topic, with no chips of its own.

   "Again" doesn't leave the queue — it gets pushed back onto the end, so it
   resurfaces later in the same session rather than waiting for the next
   day, while the progress line ("N of M") grows to match. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDueCards,
  getStrugglingCards,
  getVocabSummary,
  previewIntervals,
  rate,
  type Grade,
  type StrugglingCard,
  type VocabCard,
  type VocabSummary,
} from '../lib/vocab-review';

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];
const GRADE_LABEL: Record<Grade, string> = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };
const GRADE_KEY: Record<string, Grade> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };

function formatInterval(days: number): string {
  if (days <= 0) return 'later today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? '1 month' : `${months} months`;
  const years = Math.round(days / 365);
  return years === 1 ? '1 year' : `${years} years`;
}

type Phase = 'loading' | 'active' | 'finished';

export default function VocabReview({ topic, onExit }: { topic: string; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [queue, setQueue] = useState<VocabCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [summary, setSummary] = useState<VocabSummary | null>(null);
  const [struggling, setStruggling] = useState<StrugglingCard[]>([]);

  // Deferred to the client so the deck (parsed at build time but scheduled
  // against localStorage) and the browser's stored progress agree from the
  // first render, with no server/client mismatch.
  useEffect(() => {
    setQueue(getDueCards(topic));
    setIndex(0);
    setFlipped(false);
    setSessionCount(0);
    setPhase('active');
  }, [topic]);

  const current = queue[index];

  const intervals = useMemo(() => (current ? previewIntervals(current.word) : null), [current]);

  const finishSession = useCallback(() => {
    setSummary(getVocabSummary());
    setStruggling(getStrugglingCards().filter((c) => c.topic === topic));
    setPhase('finished');
  }, [topic]);

  const handleRate = useCallback(
    (grade: Grade) => {
      if (!current) return;
      rate(current.word, grade);
      setSessionCount((n) => n + 1);
      if (grade === 'again') {
        const requeued = current;
        setQueue((q) => [...q, requeued]);
      }
      setFlipped(false);
      setIndex((i) => i + 1);
    },
    [current],
  );

  useEffect(() => {
    if (phase === 'active' && queue.length > 0 && index >= queue.length) finishSession();
  }, [phase, queue, index, finishSession]);

  useEffect(() => {
    if (phase === 'active' && queue.length === 0) finishSession();
  }, [phase, queue, finishSession]);

  useEffect(() => {
    if (phase !== 'active' || !current) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
        return;
      }
      if (flipped) {
        const grade = GRADE_KEY[e.key];
        if (grade) handleRate(grade);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, flipped, current, handleRate]);

  const restart = () => {
    setQueue(getDueCards(topic));
    setIndex(0);
    setFlipped(false);
    setSessionCount(0);
    setPhase('active');
  };

  return (
    <div className="vocab-review-space">
      <div className="vocab-review-head">
        <p className="vocab-back-link">
          <button type="button" className="vocab-text-link" onClick={onExit}>
            {topic}
          </button>
        </p>
        <h1>Flashcards</h1>
      </div>

      {phase === 'loading' && <p className="vocab-hint">Loading your deck…</p>}

      {phase === 'active' && current && (
        <>
          <p className="vocab-progress">
            {index + 1} of {queue.length}
          </p>

          <div
            className="vocab-card"
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={flipped ? `${current.word}: definition shown, tap to hide` : `${current.word}: tap or press space to reveal the definition`}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => {
              // Space is also handled by the document-level listener below (so it
              // works even when focus isn't on the card). Stop it here so a
              // focused card doesn't flip twice — once from this handler, once
              // from that one — which would cancel back out to unflipped.
              if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                e.stopPropagation();
                setFlipped((f) => !f);
              }
            }}
          >
            <span className="vocab-card-topic">{current.topic}</span>
            {!flipped ? (
              <div className="vocab-card-word" key={`${current.word}-front`}>
                {current.word}
              </div>
            ) : (
              <div className="vocab-card-back" key={`${current.word}-back`}>
                <p className="vocab-card-def">{current.definition}</p>
                {current.example && <p className="vocab-card-example">“{current.example}”</p>}
              </div>
            )}
          </div>

          {!flipped ? (
            <p className="vocab-hint">Tap the card or press space to reveal</p>
          ) : (
            <div className="vocab-ratings" role="group" aria-label="Rate how well you knew this word">
              {GRADES.map((g, i) => (
                <button key={g} type="button" className={`vocab-rating vocab-rating-${g}`} onClick={() => handleRate(g)}>
                  <span>{GRADE_LABEL[g]}</span>
                  <small>
                    {i + 1} · {formatInterval(intervals ? intervals[g] : 0)}
                  </small>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {phase === 'finished' && summary && (
        <div className="vocab-finished">
          <h2>{sessionCount > 0 ? 'Session complete' : "You're all caught up"}</h2>
          <p>
            {sessionCount > 0
              ? `You reviewed ${sessionCount} word${sessionCount === 1 ? '' : 's'} this session.`
              : `Nothing from ${topic} is due right now. Come back tomorrow for more.`}
          </p>

          <div className="vocab-summary-grid">
            <div>
              <strong>{summary.due}</strong>
              <span>Due now</span>
            </div>
            <div>
              <strong>{summary.newToday}</strong>
              <span>New left today</span>
            </div>
            <div>
              <strong>{summary.learned}</strong>
              <span>Learned</span>
            </div>
            <div>
              <strong>{summary.reviewedToday}</strong>
              <span>Reviewed today</span>
            </div>
          </div>

          {struggling.length > 0 && (
            <div className="vocab-struggle">
              <h3>Words you struggle with</h3>
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
              Review more
            </button>
            <button type="button" className="vocab-finished-secondary" onClick={onExit}>
              Back to {topic}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
