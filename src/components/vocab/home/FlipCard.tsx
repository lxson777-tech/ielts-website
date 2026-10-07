/* A word card that turns over: the word on the front, its meaning and an
   example on the back. It is one native button, so Enter and Space flip it
   and focus is visible, and aria-pressed says which side is up. Only the
   side that is showing is read out (the other is aria-hidden).

   Both faces sit in the same grid cell, so the card is always as tall as
   its longer side and nothing jumps when it turns. With reduced motion the
   faces crossfade instead of rotating (src/styles/vocab-home.css). */

import { useState, type ReactNode } from 'react';
import { useT } from '../../../lib/i18n/react';
import { CheckIcon, TurnIcon } from './icons';

interface Props {
  word: string;
  meaning: string;
  example?: string;
  learnt?: boolean;
  /** 'feature' is the large word-of-the-day card. */
  size?: 'grid' | 'feature';
  /** Extra line under the word on the front (the word of the day's hint). */
  frontNote?: ReactNode;
}

export default function FlipCard({ word, meaning, example, learnt = false, size = 'grid', frontNote }: Props) {
  const { t } = useT();
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      className={`vh-flip vh-flip--${size}${flipped ? ' is-flipped' : ''}`}
      aria-pressed={flipped}
      onClick={() => setFlipped((f) => !f)}
    >
      <span className="vh-flip-inner">
        <span className="vh-flip-face vh-flip-front" aria-hidden={flipped}>
          {learnt && (
            <span className="vh-learnt">
              <CheckIcon />
              <span>{t('Learnt')}</span>
            </span>
          )}
          <span className="vh-flip-turn" aria-hidden="true"><TurnIcon /></span>
          <span className="vh-flip-word" lang="en">{word}</span>
          {frontNote}
          <span className="vh-sr">{t('Show the meaning')}</span>
        </span>
        <span className="vh-flip-face vh-flip-back" aria-hidden={!flipped}>
          <span className="vh-flip-back-word" lang="en">{word}</span>
          <span className="vh-flip-meaning" lang="en">{meaning}</span>
          {example && <span className="vh-flip-example" lang="en">{example}</span>}
        </span>
      </span>
    </button>
  );
}
