/* Go Further as "guess the word": the reverse of the main cards. The front
   shows the MEANING; the student thinks of the word, then turns the card
   to see the word and its example. A quiet counter keeps track, and one
   button turns them all back. Nothing is recorded: this is low-stakes
   practice, not evidence that a word is known.

   Same card mechanics as FlipCard (one native button, aria-pressed, Enter
   and Space, crossfade under reduced motion), in the ochre stretch-set
   colouring so it reads as a different, harder set. */

import { useId, useState } from 'react';
import { useT } from '../../../lib/i18n/react';
import type { VocabWordRow } from '../../../lib/vocab-review';
import { TurnIcon } from './icons';

function GuessCard({ row, flipped, onToggle }: { row: VocabWordRow; flipped: boolean; onToggle: () => void }) {
  const { t } = useT();
  return (
    <button type="button" className={`vh-flip vh-flip--grid vh-flip--guess${flipped ? ' is-flipped' : ''}`} aria-pressed={flipped} onClick={onToggle}>
      <span className="vh-flip-inner">
        <span className="vh-flip-face vh-flip-front" aria-hidden={flipped}>
          <span className="vh-flip-turn" aria-hidden="true"><TurnIcon /></span>
          <span className="vh-guess-meaning" lang="en">{row.meaning}</span>
          <span className="vh-sr">{t('Reveal the word')}</span>
        </span>
        <span className="vh-flip-face vh-flip-back" aria-hidden={!flipped}>
          <span className="vh-flip-word" lang="en">{row.word}</span>
          {row.example && <span className="vh-flip-example" lang="en">{row.example}</span>}
        </span>
      </span>
    </button>
  );
}

export default function GuessCards({ heading, words }: { heading: string; words: VocabWordRow[] }) {
  const { t } = useT();
  const id = useId();
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(() => new Set());

  function toggle(i: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <section className="vocab-topic-group vh-guess" aria-labelledby={`${id}-h`}>
      <div className="vh-group-head">
        <h2 id={`${id}-h`}>
          <span>{heading}</span>
          <span className="vh-band-tag">{t('Band 7+')}</span>
        </h2>
        <p className="vh-group-meta">
          <span aria-live="polite">{t('{revealed} of {total} revealed', { revealed: revealed.size, total: words.length })}</span>
          {revealed.size > 0 && (
            <button type="button" className="vh-text-btn" onClick={() => setRevealed(new Set())}>
              {t('Hide all again')}
            </button>
          )}
        </p>
      </div>
      <p className="vh-words-hint">{t('Read the meaning, think of the word, then tap to check.')}</p>
      <ul className="vh-flip-grid vh-guess-grid">
        {words.map((w, i) => (
          <li key={w.word}>
            <GuessCard row={w} flipped={revealed.has(i)} onToggle={() => toggle(i)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
