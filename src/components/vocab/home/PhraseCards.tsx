/* Useful phrases as copy-ready quote cards. Each card's Copy button puts
   the phrase on the clipboard (without its quote marks, and with a space
   after a trailing "..." so the student can carry on typing), says
   "Copied" to a screen reader and shows a brief tick. Words this topic
   teaches (its main list and Go Further) are marked inside the phrases,
   so students see the vocabulary in use. Essay phrase groups point to the
   Writing trainer, where a copied phrase is meant to go. */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useT } from '../../../lib/i18n/react';
import { withBase } from '../../../lib/url';
import { highlightTerms, inlineHtmlToText, phraseForCopy } from '../../../lib/vocab-home';
import { CheckIcon, CopyIcon } from './icons';

/** The phrase without the quote marks the lesson wraps it in. */
function displayText(html: string): string {
  return inlineHtmlToText(html).replace(/^["“‘]+/, '').replace(/["”’]+$/, '').trim();
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Blocked (an insecure page, or permission refused): try the old way. */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

interface Props {
  heading: string;
  items: string[];
  /** This topic's words, every spelling (termVariants), for marking. */
  terms: string[];
}

export default function PhraseCards({ heading, items, terms }: Props) {
  const { t } = useT();
  const id = useId();
  const [copied, setCopied] = useState<number | null>(null);
  const [failed, setFailed] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const phrases = useMemo(
    () => items.map((html) => {
      const text = displayText(html);
      return { text, segments: highlightTerms(text, terms) };
    }),
    [items, terms],
  );
  const anyMarked = phrases.some((p) => p.segments.some((s) => s.hit));
  const forEssays = /essay/i.test(heading);

  async function copy(i: number) {
    const phrase = phrases[i];
    if (!phrase) return;
    const ok = await copyText(phraseForCopy(phrase.text));
    window.clearTimeout(timer.current);
    if (ok) {
      setCopied(i);
      setFailed(null);
      // A fresh text each time, so copying twice is announced twice.
      setMessage(`${t('Copied')}: ${phrase.text}`);
    } else {
      setFailed(i);
      setCopied(null);
      setMessage(t('Could not copy. Select the text instead.'));
    }
    timer.current = window.setTimeout(() => {
      setCopied(null);
      setFailed(null);
    }, 1800);
  }

  return (
    <section className="vocab-topic-group vh-phrases" aria-labelledby={`${id}-h`}>
      <div className="vh-group-head">
        <h2 id={`${id}-h`}>{heading}</h2>
      </div>
      {(forEssays || anyMarked) && (
        <p className="vh-words-hint vh-phrases-hint">
          {forEssays && (
            <a className="vh-hint-link" href={withBase('/trainers/writing')}>
              {t('Copy a phrase into the Writing trainer')}
            </a>
          )}
          {anyMarked && <span className="vh-hint-legend"><span className="vh-hit-swatch" aria-hidden="true" />{t('Words from this topic are marked.')}</span>}
        </p>
      )}
      <ul className="vh-phrase-grid">
        {phrases.map((p, i) => (
          <li key={i} className="vh-phrase">
            <p className="vh-phrase-text" id={`${id}-p${i}`} lang="en">
              {p.segments.map((s, k) => (s.hit ? <mark key={k} className="vh-hit">{s.text}</mark> : <span key={k}>{s.text}</span>))}
            </p>
            <button
              type="button"
              className={`vh-copy${copied === i ? ' is-copied' : ''}`}
              onClick={() => copy(i)}
              aria-describedby={`${id}-p${i}`}
            >
              {copied === i ? <CheckIcon /> : <CopyIcon />}
              <span>{copied === i ? t('Copied') : failed === i ? t('Select to copy') : t('Copy')}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="vh-sr" aria-live="polite">{message}</p>
    </section>
  );
}
