/* Spell it: the meaning and the example with the word gapped; the student
   types the word.

   The one game that makes words count as learnt: every answer is written
   as RECALL through the review store's own recall path
   (src/lib/vocab-games/record.ts), so two unaided right spellings on two
   different days make a word known. A letter shown by the hint, or a
   second go after the answer was shown, makes the answer assisted. Ten
   words a set; "Try again later" brings a missed word back once, at the
   end. */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useT } from '../../../lib/i18n/react';
import { nt } from '../../../lib/i18n/translate';
import { isWordKnown, readVocabStoreFor, type VocabCard } from '../../../lib/vocab-review';
import {
  checkSpelling,
  letterSlots,
  maxHints,
  newSpellQueue,
  nextHint,
  requeueForLater,
  spellOutcome,
  spellPrompt,
  spellSummary,
  type SpellItem,
  type SpellResult,
} from '../../../lib/vocab-games/spell';
import { recordSpelling } from '../../../lib/vocab-games/record';
import { minimumWords } from '../../../lib/vocab-games/sets';
import { currentOwner } from '../../../lib/store-owner';
import { buildSetFor, topicBySlug } from './deck';
import { GAME_LINES, GAME_NAMES, GameGlyph, GameHeading, OwnerNote, SignInLine, Stat, StatRow, TopicSwitch, WordReview, gamesHref } from './GameParts';
import { useGameOwner } from './useGameOwner';

type Phase = 'start' | 'play' | 'end';

interface Checked {
  correct: boolean;
}

/** The first `revealed` letters of the word, with any separators between. */
function hintPrefix(word: string, revealed: number): string {
  let letters = 0;
  let out = '';
  for (const ch of word.trim()) {
    const separator = ch === ' ' || ch === '-' || ch === "'" || ch === '’';
    if (!separator) {
      if (letters >= revealed) break;
      letters += 1;
    }
    out += ch;
  }
  return out;
}

export default function SpellGame({ topicSlug }: { topicSlug: string | null }) {
  const { t, tn } = useT();
  const topic = topicBySlug(topicSlug);
  const [phase, setPhase] = useState<Phase>('start');
  const owner = useGameOwner(() => setPhase('start'));
  const [queue, setQueue] = useState<SpellItem[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [revealed, setRevealed] = useState(0);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [results, setResults] = useState<SpellResult[]>([]);
  const [shake, setShake] = useState(false);
  const [available, setAvailable] = useState<number | null>(null);
  const [learnt, setLearnt] = useState<string[]>([]);
  const [announce, setAnnounce] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (phase !== 'start') return;
    setAvailable(buildSetFor(currentOwner(), 'spell', topicSlug).length);
  }, [phase, topicSlug, owner.signedIn]);

  const item = queue[index];
  const card = item?.card;

  const start = useCallback(() => {
    const session = owner.open();
    owner.clearNote();
    setQueue(newSpellQueue(buildSetFor(session.owner, 'spell', topicSlug)));
    setIndex(0);
    setTyped('');
    setRevealed(0);
    setChecked(null);
    setResults([]);
    setLearnt([]);
    setAnnounce('');
    setPhase('play');
  }, [owner, topicSlug]);

  useEffect(() => {
    if (phase === 'play' && !checked) inputRef.current?.focus({ preventScroll: true });
    if (phase === 'play' && checked) nextRef.current?.focus({ preventScroll: true });
    if (phase === 'end') endRef.current?.focus({ preventScroll: true });
  }, [phase, checked, index]);

  const finish = useCallback(
    (all: SpellResult[]) => {
      const me = owner.ownerNow();
      if (me) {
        const states = readVocabStoreFor(me).cards;
        const spelt = spellSummary(all).spelt;
        setLearnt(spelt.filter((word) => isWordKnown(states[word])));
      }
      setPhase('end');
    },
    [owner],
  );

  const check = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (phase !== 'play' || !item || !card || checked || !typed.trim()) return;
      const correct = checkSpelling(typed, card.word);
      const hinted = revealed > 0;
      if (!owner.claim((me) => recordSpelling(me, card, correct, hinted, item.retry))) return;
      setChecked({ correct });
      setResults((r) => [...r, { word: card.word, outcome: spellOutcome(correct, hinted, item.retry), retry: item.retry }]);
      if (!correct) {
        setShake(true);
        window.setTimeout(() => setShake(false), 460);
      }
      setAnnounce(correct ? t('Correct: {word}.', { word: card.word }) : t('Not quite. The word is “{word}”.', { word: card.word }));
    },
    [phase, item, card, checked, typed, revealed, owner, t],
  );

  const advance = useCallback(
    (again: boolean) => {
      if (!item) return;
      const nextQueue = again ? requeueForLater(queue, item) : queue;
      setQueue(nextQueue);
      if (index + 1 >= nextQueue.length) {
        finish(results);
        return;
      }
      setIndex(index + 1);
      setTyped('');
      setRevealed(0);
      setChecked(null);
    },
    [item, queue, index, results, finish],
  );

  const hint = useCallback(() => {
    if (!card || checked) return;
    const next = nextHint(card.word, revealed);
    setRevealed(next);
    const prefix = hintPrefix(card.word, next);
    setTyped((current) => (current.toLowerCase().startsWith(prefix.toLowerCase()) ? current : prefix));
    setAnnounce(t('Letter shown. This word will not count as learnt today.'));
    inputRef.current?.focus({ preventScroll: true });
  }, [card, checked, revealed, t]);

  const summary = spellSummary(results);
  const cardOf = (word: string) => queue.find((q) => q.card.word === word)?.card;
  const practiseCards = summary.practise.map(cardOf).filter((c): c is VocabCard => Boolean(c));
  const prompt = card ? spellPrompt(card) : null;
  const typedLetters = [...typed].filter((ch) => !(ch === ' ' || ch === '-' || ch === "'" || ch === '’'));
  const total = new Set(queue.map((q) => q.card.word)).size;
  const name = GAME_NAMES.spell;

  return (
    <div className="vg vg-game vg-game-spell" data-game="spell" data-phase={phase}>
      <GameHeading title={name} topic={topicSlug} />
      <OwnerNote note={owner.note} />

      {phase === 'start' && (
        <section className="vg-card vg-start" aria-labelledby="vg-start-title">
          <GameGlyph game="spell" />
          <h2 id="vg-start-title">{t(GAME_LINES.spell)}</h2>
          <p className="vg-learnt-line">{t('This game makes words count as learnt: spell a word right on two different days, with no letters shown.')}</p>
          <p className="vg-muted">{t('Ten words. Capital letters do not matter, but the spelling must be exact.')}</p>
          <TopicSwitch game="spell" topic={topic} />
          {available !== null && available < minimumWords('spell') ? (
            <p className="vg-muted">{t('There are not enough words here for this game. Choose another topic.')}</p>
          ) : (
            <button type="button" className="vg-btn vg-btn-primary" onClick={start} data-vg-start>
              {t('Start')}
            </button>
          )}
          <SignInLine signedIn={owner.signedIn} />
        </section>
      )}

      {phase === 'play' && item && card && (
        <section className="vg-play" aria-label={t(name)}>
          <div className="vg-bar">
            <span className="vg-pill">{t('{current} of {total}', { current: index + 1, total: queue.length })}</span>
            {item.retry && <span className="vg-pill is-warm">{t('Second go')}</span>}
          </div>
          <div className="vg-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${(index + (checked ? 1 : 0)) / queue.length})` }} />
          </div>

          <div className="vg-card vg-spell-card" key={`${index}-${card.word}`}>
            <p className="vg-eyebrow">{t('Meaning')}</p>
            <p className="vg-meaning" lang="en">
              {card.definition}
            </p>
            {prompt && (
              <p className="vg-sentence vg-sentence-small" lang="en">
                {prompt.before}
                <span className={`vg-gap${checked ? (checked.correct ? ' is-right' : ' is-revealed') : ''}`}>
                  {checked ? prompt.gap : <span className="vg-sr">{t('blank')}</span>}
                </span>
                {prompt.after}
              </p>
            )}
            {prompt && prompt.gap.toLowerCase() !== card.word.toLowerCase() && !checked && (
              <p className="vg-muted vg-small">{t('In the sentence the word may change a little, for example by adding -s. Type the word itself.')}</p>
            )}

            <div className={`vg-slots${shake ? ' is-shaking' : ''}${checked?.correct ? ' is-right' : ''}`} aria-hidden="true" data-vg-slots>
              {(() => {
                let k = -1;
                return letterSlots(card.word, revealed).map((slot, i) => {
                  if (slot.separator) return <span key={i} className="vg-slot is-sep">{slot.char === ' ' ? '' : slot.char}</span>;
                  k += 1;
                  const shown = checked && !checked.correct ? slot.char : (typedLetters[k] ?? '');
                  return (
                    <span key={i} className={`vg-slot${shown ? ' is-filled' : ''}${k < revealed ? ' is-hint' : ''}`}>
                      {shown}
                    </span>
                  );
                });
              })()}
            </div>
            <p className="vg-sr">{tn([...card.word].filter((c) => /[A-Za-z]/.test(c)).length, { one: '{n} letter', other: '{n} letters' })}</p>

            <form className="vg-spell-form" onSubmit={check}>
              <label className="vg-sr" htmlFor="vg-spell-input">
                {t('Type the word')}
              </label>
              <input
                id="vg-spell-input"
                ref={inputRef}
                className="vg-input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                readOnly={Boolean(checked)}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                lang="en"
                placeholder={t('Type the word')}
              />
              {!checked && (
                <div className="vg-spell-actions">
                  <button type="submit" className="vg-btn vg-btn-primary" disabled={!typed.trim()}>
                    {t('Check')}
                  </button>
                  <button type="button" className="vg-btn vg-btn-quiet" onClick={hint} disabled={revealed >= maxHints(card.word)} data-vg-hint>
                    {t('Show a letter')}
                  </button>
                </div>
              )}
            </form>
            {revealed > 0 && !checked && !item.retry && (
              <p className="vg-muted vg-small">{t('With a letter shown, this word will not count as learnt today.')}</p>
            )}

            {checked && (
              <div className={`vg-feedback${checked.correct ? ' is-right' : ' is-wrong'}`} role="status">
                <div>
                  <strong>
                    {checked.correct ? t('Correct!') : t('Not quite. The word is “{word}”.', { word: card.word })}
                  </strong>
                  {checked.correct && revealed === 0 && !item.retry && <p>{t('Spelt from memory. This counts toward learning the word.')}</p>}
                  {checked.correct && (revealed > 0 || item.retry) && <p>{t('Right, with help. Spell it with no help another time to count it as learnt.')}</p>}
                  {!checked.correct && <p lang="en">{card.example}</p>}
                </div>
                <div className="vg-feedback-actions">
                  {!checked.correct && !item.retry ? (
                    <>
                      <button type="button" className="vg-btn vg-btn-primary" onClick={() => advance(true)} ref={nextRef}>
                        {t('Try again later')}
                      </button>
                      <button type="button" className="vg-btn vg-btn-quiet" onClick={() => advance(false)}>
                        {t('Next word')}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="vg-btn vg-btn-primary" onClick={() => advance(false)} ref={nextRef}>
                      {index + 1 >= queue.length ? t('See my results') : t('Next word')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {phase === 'end' && (
        <section className="vg-card vg-end" aria-labelledby="vg-end-title">
          <h2 id="vg-end-title" tabIndex={-1} ref={endRef}>
            {t('Set complete')}
          </h2>
          <p className="vg-end-topic">{topic ? t(topic.title) : t('Mixed set')}</p>
          <StatRow>
            <Stat label={t('Spelt from memory')} value={t('{n} of {total}', { n: summary.spelt.length, total })} accent />
            <Stat label={t('To practise')} value={String(summary.practise.length)} />
            <Stat label={t('Now learnt')} value={String(learnt.length)} />
          </StatRow>
          {learnt.length > 0 && (
            <p className="vg-learnt-line">
              {tn(learnt.length, { one: '{n} word now counts as learnt:', other: '{n} words now count as learnt:' })}{' '}
              <span lang="en">{learnt.join(', ')}</span>
            </p>
          )}
          {summary.spelt.length > 0 && learnt.length < summary.spelt.length && (
            <p className="vg-muted">{t('Spell them again on another day and they count as learnt.')}</p>
          )}
          <WordReview title={nt('Words to practise')} cards={practiseCards} />
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
