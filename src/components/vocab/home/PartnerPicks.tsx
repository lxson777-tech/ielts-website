/* Key Collocations as "pick the partner". Each phrase shows a blank where
   the lesson's bold key word was, with three choices under it: the right
   word and two other key words from this topic's own collocations (the
   same three, in the same order, every visit: src/lib/vocab-home.ts
   collocationOptions). A right pick fills the blank and the choices fold
   away; a wrong one shakes softly and greys out; after a second miss the
   answer is shown. A quiet score and one reset. Nothing is recorded.

   Keyboard: the choices are ordinary buttons. When a phrase is finished
   from the keyboard, focus moves on to the next unfinished phrase so a
   keyboard user is never dropped back at the top of the page. */

import { useId, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useT } from '../../../lib/i18n/react';
import { collocationOptions, parseCollocation, type CollocationGap } from '../../../lib/vocab-home';
import { CheckIcon } from './icons';

type Status = 'open' | 'right' | 'revealed';

interface ItemState {
  status: Status;
  wrong: string[];
}

interface Row {
  html: string;
  gap: CollocationGap | null;
  options: string[];
}

/** Whether a topic's collocations can be played at all: at least two
    phrases with a key word, so every phrase has a real choice. */
export function playableCollocations(items: readonly string[]): boolean {
  return items.filter((html) => parseCollocation(html) !== null).length >= 2;
}

export default function PartnerPicks({ topic, heading, items }: { topic: string; heading: string; items: string[] }) {
  const { t } = useT();
  const id = useId();
  const listRef = useRef<HTMLOListElement>(null);

  const rows: Row[] = useMemo(() => {
    const gaps = items.map((html) => parseCollocation(html));
    const answers = gaps.filter((g): g is CollocationGap => g !== null).map((g) => g.answer);
    let k = 0;
    return items.map((html, i) => {
      const gap = gaps[i] ?? null;
      if (!gap) return { html, gap: null, options: [] };
      const options = collocationOptions(answers, k++, topic);
      return options.length >= 2 ? { html, gap, options } : { html, gap: null, options: [] };
    });
  }, [items, topic]);

  const playable = rows.filter((r) => r.gap).length;
  const fresh = () => rows.map<ItemState>(() => ({ status: 'open', wrong: [] }));
  const [state, setState] = useState<ItemState[]>(fresh);
  const [shaking, setShaking] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const score = state.filter((s, i) => rows[i]?.gap && s.status === 'right').length;
  const answered = state.filter((s, i) => rows[i]?.gap && s.status !== 'open').length;

  function focusNext(from: number) {
    const list = listRef.current;
    if (!list) return;
    const open = [...list.querySelectorAll<HTMLButtonElement>('.vh-colloc[data-open="true"] .vh-chip:not(:disabled)')];
    const after = open.find((b) => Number(b.closest<HTMLElement>('.vh-colloc')?.dataset.index) > from);
    (after ?? open[0])?.focus();
  }

  function pick(i: number, option: string, e: MouseEvent<HTMLButtonElement>) {
    const row = rows[i];
    const current = state[i];
    if (!row?.gap || !current || current.status !== 'open') return;
    const fromKeyboard = e.detail === 0;
    const right = option === row.gap.answer;
    let next: ItemState;
    if (right) {
      next = { status: 'right', wrong: current.wrong };
      // Naming the word keeps two right answers in a row from reading as
      // the same announcement (a live region ignores an unchanged text).
      setMessage(t('Correct: {answer}.', { answer: row.gap.answer }));
    } else if (current.wrong.length >= 1) {
      next = { status: 'revealed', wrong: [...current.wrong, option] };
      setMessage(t('The answer is {answer}.', { answer: row.gap.answer }));
    } else {
      next = { status: 'open', wrong: [option] };
      setMessage(t('Not quite. Try another word.'));
      setShaking(i);
      window.setTimeout(() => setShaking((s) => (s === i ? null : s)), 450);
    }
    setState((prev) => prev.map((s, j) => (j === i ? next : s)));
    if (next.status !== 'open' && fromKeyboard) window.setTimeout(() => focusNext(i), 0);
  }

  function reset() {
    setState(fresh());
    setMessage('');
  }

  return (
    <section className="vocab-topic-group vh-colloc-group" aria-labelledby={`${id}-h`}>
      <div className="vh-group-head">
        <h2 id={`${id}-h`}>{heading}</h2>
        {answered > 0 && (
          <p className="vh-group-meta">
            <span>{t('{score} of {total} right', { score, total: playable })}</span>
            <button type="button" className="vh-text-btn" onClick={reset}>
              {t('Try again')}
            </button>
          </p>
        )}
      </div>
      <p className="vh-words-hint">{t('Pick the word that completes each phrase.')}</p>
      <ol className="vh-colloc-list" ref={listRef}>
        {rows.map((row, i) => {
          const s = state[i] ?? { status: 'open' as Status, wrong: [] };
          if (!row.gap) {
            return <li key={i} className="vh-colloc is-plain" lang="en" dangerouslySetInnerHTML={{ __html: row.html }} />;
          }
          const done = s.status !== 'open';
          return (
            <li key={i} className={`vh-colloc is-${s.status}`} data-index={i} data-open={done ? 'false' : 'true'}>
              <p className="vh-colloc-phrase" lang="en">
                {row.gap.before}
                <span className={`vh-gap${done ? ' is-filled' : ''}`}>
                  {done ? (
                    <span className="vh-gap-word" key="filled">
                      {s.status === 'right' && <CheckIcon />}
                      {row.gap.answer}
                    </span>
                  ) : (
                    <span className="vh-sr">{t('blank')}</span>
                  )}
                </span>
                {row.gap.after}
              </p>
              <div className={`vh-chips-wrap${done ? ' is-collapsed' : ''}`} aria-hidden={done}>
                <div className={`vh-chips${shaking === i ? ' is-shaking' : ''}`} role="group" aria-label={t('Choose the missing word')}>
                  {row.options.map((o) => {
                    const wrong = s.wrong.includes(o);
                    return (
                      <button
                        key={o}
                        type="button"
                        className={`vh-chip${wrong ? ' is-wrong' : ''}`}
                        disabled={done || wrong}
                        tabIndex={done ? -1 : undefined}
                        onClick={(e) => pick(i, o, e)}
                        lang="en"
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="vh-sr" aria-live="polite">{message}</p>
    </section>
  );
}
