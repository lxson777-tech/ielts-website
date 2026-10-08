/* /review ("Vocabulary"). Rebuilt 8 October 2026 after the owner found the
   plain topic browser "really boring": the same three views, made into a
   place students want to come back to.

   Three views, one component, no client-side router:
     landing  the Vocabulary home: a Today strip (streak, words due, one
              button into five minutes of Spell it), the word of the day on
              a card that turns over, and every topic as an illustrated card
              with a ring of the words learnt
     topic    one topic: its picture, the three games for its words, the
              existing practice round, then its words as flip cards (or the
              old list, one tap away) and the lesson's other groups
     session  VocabReview.tsx's practice round, filtered to that topic

   The props contract is unchanged ({ topics }), so the gated build's
   PaidContent mounts this exactly as before.

   The chosen topic lives in the `topic` query string param so a link like
   /review?topic=environment (the dashboard's plan item, or anywhere else)
   opens straight into that topic. This is a static site with no routes for
   individual topics, so the param is read once on mount and kept in sync
   with history.replaceState() as the student clicks around, never
   pushState, so the browser's back button still means "leave the page",
   not "step back through topics".

   Everything about the student (streak, words due, words learnt) is read
   after mount from the stores other modules own, through
   src/lib/vocab-home.ts. Nothing here writes to them. */

import { useEffect, useMemo, useState } from 'react';
import { withBase } from '../lib/url';
import type { VocabCardState, VocabTopicData, VocabWordRow } from '../lib/vocab-review';
import { useT } from '../lib/i18n/react';
import VocabReview from './VocabReview';
import { isTrialBuild } from '../lib/trial/mode';
import {
  isRowLearnt,
  localDateKey,
  pickWordOfTheDay,
  readStreak,
  readVocabStore,
  schedulerToday,
  storeByWord,
  todayStrip,
  topicRing,
  topicWordRows,
  termVariants,
  wordOfTheDayDeck,
  type TodayStrip as TodayStripState,
  type WordOfTheDay,
} from '../lib/vocab-home';
import TodayStrip from './vocab/home/TodayStrip';
import WordOfTheDayCard from './vocab/home/WordOfTheDayCard';
import TopicCard from './vocab/home/TopicCard';
import TopicPicture from './vocab/home/TopicPicture';
import ProgressRing from './vocab/home/ProgressRing';
import FlipCard from './vocab/home/FlipCard';
import GamesRow from './vocab/home/GamesRow';
import GuessCards from './vocab/home/GuessCards';
import PartnerPicks, { playableCollocations } from './vocab/home/PartnerPicks';
import PhraseCards from './vocab/home/PhraseCards';
import { BackIcon, CardsIcon, ListIcon } from './vocab/home/icons';

type View = 'landing' | 'topic' | 'session';

const PAGE_SIZE = 12;
const EMPTY_BY_WORD: ReadonlyMap<string, VocabCardState> = new Map();

function topicFromLocation(topics: VocabTopicData[]): string | null {
  if (typeof window === 'undefined') return null;
  const slug = new URLSearchParams(window.location.search).get('topic');
  if (!slug) return null;
  return topics.some((t) => t.slug === slug) ? slug : null;
}

function setUrlTopic(slug: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set('topic', slug);
  else url.searchParams.delete('topic');
  window.history.replaceState(window.history.state, '', url);
}

/** A new view starts at its top. Instant on purpose: the site scrolls
    smoothly, and gliding up through a page that has just been replaced
    reads as a glitch, not as motion. */
function toTop(): void {
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
}

export default function VocabTopics({ topics }: { topics: VocabTopicData[] }) {
  const { t, tn } = useT();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [view, setView] = useState<View>('landing');
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [listView, setListView] = useState(false);

  // The student's own state, read after mount (localStorage is not there
  // during the server render, and the first client render must match it).
  const [byWord, setByWord] = useState<ReadonlyMap<string, VocabCardState>>(EMPTY_BY_WORD);
  const [strip, setStrip] = useState<TodayStripState | null>(null);
  const [dateKey, setDateKey] = useState<string | null>(null);

  // Read the ?topic= param once the page is live in the browser, so a link
  // straight into a topic (the dashboard's plan item, /review?topic=ai)
  // opens there instead of flashing the landing grid first.
  useEffect(() => {
    const slug = topicFromLocation(topics);
    if (slug) {
      setActiveSlug(slug);
      setView('topic');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-read whenever the student comes back from a practice round, so the
  // rings and the due count reflect what they just did.
  useEffect(() => {
    if (view === 'session') return;
    const store = readVocabStore();
    const now = new Date();
    setByWord(storeByWord(store));
    setStrip(todayStrip(store, readStreak(now), schedulerToday(now)));
    setDateKey(localDateKey(now));
  }, [view]);

  const summaries = useMemo(
    () =>
      topics.map((tp) => ({
        slug: tp.slug,
        title: tp.title,
        count: tp.wordCount,
        searchText: topicWordRows(tp).map((w) => w.word).join(' '),
      })),
    [topics],
  );

  const rings = useMemo(() => new Map(topics.map((tp) => [tp.slug, topicRing(tp, byWord)])), [topics, byWord]);

  const deck = useMemo(() => wordOfTheDayDeck(topics), [topics]);
  const wotd: WordOfTheDay | null = useMemo(() => (dateKey ? pickWordOfTheDay(deck, dateKey) : null), [deck, dateKey]);

  const active = useMemo(() => topics.find((tp) => tp.slug === activeSlug) ?? null, [topics, activeSlug]);

  function openTopic(slug: string) {
    setActiveSlug(slug);
    setView('topic');
    setUrlTopic(slug);
    toTop();
  }

  function backToTopics() {
    setActiveSlug(null);
    setView('landing');
    setUrlTopic(null);
    toTop();
  }

  if (view === 'session' && active) {
    return <VocabReview topic={active.title} onExit={() => setView('topic')} />;
  }

  if (view === 'topic' && active) {
    const ring = rings.get(active.slug) ?? topicRing(active, byWord);
    /* The flip cards are the lesson's main word table. A lesson with no
       main table (Conjunctions: every word sits in a function group) shows
       its word groups as cards instead, so every topic has cards to turn. */
    const cardGroups: { heading: string; words: VocabWordRow[] }[] =
      active.words.length > 0
        ? [{ heading: t('Words and phrases'), words: active.words }]
        : active.categories.filter((c) => c.words && c.words.length > 0).map((c) => ({ heading: c.heading, words: c.words! }));
    const restCategories = active.words.length > 0 ? active.categories : active.categories.filter((c) => !c.words);
    // Every spelling of every word this topic teaches, to mark inside its phrases.
    const topicTerms = topicWordRows(active).flatMap((w) => termVariants(w.word));

    return (
      <div className="vocab-review-space vh-topic-page">
        <p className="vocab-back-link">
          <button type="button" className="vocab-text-link vh-back" onClick={backToTopics}>
            <BackIcon />
            <span>{t('All topics')}</span>
          </button>
        </p>

        <header className="vh-topic-header">
          <TopicPicture slug={active.slug} className="vh-banner" eager />
          <div className="vh-topic-heading">
            <h1>{t(active.title)}</h1>
            <p className="vh-topic-summary">
              <ProgressRing ring={ring} size={28} />
              <span>{t('{learnt} of {total} learnt', { learnt: ring.learnt, total: ring.total })}</span>
            </p>
          </div>
        </header>

        <GamesRow topic={active.slug} />

        <div className="vocab-topic-practise vh-practise">
          <button
            type="button"
            className="vocab-practise-link"
            /* The gated build: vocabulary practice comes with practice and
               guidance, so for a free account the click guard opens the
               upgrade pop-up instead (src/lib/access/paid-guard.ts). */
            data-paid-feature={isTrialBuild() ? 'vocab-review' : undefined}
            onClick={() => setView('session')}
          >
            {t('Practise these words')}
          </button>
        </div>

        {cardGroups.map((group, gi) => (
          <section className="vocab-topic-group vh-words" key={group.heading}>
            <div className="vh-words-head">
              <h2>{group.heading}</h2>
              {gi === 0 && (
                <button type="button" className="vh-view-toggle" onClick={() => setListView((v) => !v)}>
                  {listView ? <CardsIcon /> : <ListIcon />}
                  <span>{listView ? t('Show as cards') : t('Show all as a list')}</span>
                </button>
              )}
            </div>
            {gi === 0 && !listView && <p className="vh-words-hint">{t('Tap a card to see its meaning and an example.')}</p>}
            {listView ? (
              <ul className="vocab-word-list">
                {group.words.map((w) => (
                  <li key={w.word}>
                    <span className="vocab-word-term">{w.word}</span>
                    <span className="vocab-word-meaning">{w.meaning}</span>
                    {w.example && <span className="vocab-word-example">{w.example}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="vh-flip-grid">
                {group.words.map((w) => (
                  <li key={w.word}>
                    <FlipCard word={w.word} meaning={w.meaning} example={w.example} learnt={isRowLearnt(w, byWord)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {restCategories.map((cat) => {
          /* Each lower group plays the way its content teaches: a word
             table under the main one (Go Further) becomes guess-the-word
             cards, collocations with a bold key word become pick-the-
             partner, phrase lists become copy-ready cards. Anything that
             does not fit those shapes keeps the plain list below. */
          if (cat.words && active.words.length > 0) {
            return <GuessCards key={cat.heading} heading={cat.heading} words={cat.words} />;
          }
          if (cat.items && /collocation/i.test(cat.heading) && playableCollocations(cat.items)) {
            return <PartnerPicks key={cat.heading} topic={active.slug} heading={cat.heading} items={cat.items} />;
          }
          if (cat.items && /phrase/i.test(cat.heading) && cat.items.length > 0) {
            return <PhraseCards key={cat.heading} heading={cat.heading} items={cat.items} terms={topicTerms} />;
          }
          return (
          <section className="vocab-topic-group" key={cat.heading}>
            <h2>{cat.heading}</h2>
            <ul className="vocab-simple-list">
              {cat.words
                ? cat.words.map((w) => (
                    <li key={w.word}>
                      <strong>{w.word}</strong>: {w.meaning}
                    </li>
                  ))
                : (cat.items ?? []).map((html, i) => <li key={i} dangerouslySetInnerHTML={{ __html: html }} />)}
            </ul>
          </section>
          );
        })}
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const matchingTopics = summaries.filter((s) =>
    `${s.title} ${t(s.title)} ${s.searchText}`.toLowerCase().includes(query),
  );
  return (
    <div className="vocab-review-space vh-home">
      <div className="vocab-review-head">
        <p className="vocab-back-link">
          <a href={withBase('/dashboard')}>{t('Dashboard')}</a>
        </p>
        <h1>{t('Vocabulary')}</h1>
        <p>{t('Every IELTS topic, its vocabulary, meanings and examples. Pick a topic to see it all at once.')}</p>
      </div>

      <TodayStrip state={strip} />

      <WordOfTheDayCard word={wotd} learnt={wotd ? isRowLearnt(wotd, byWord) : false} onOpenTopic={openTopic} />

      <section className="vh-topics" aria-labelledby="vh-topics-title">
        <div className="vh-topics-head">
          <h2 id="vh-topics-title">{t('Topics')}</h2>
          <p>{t('A word counts as learnt once you spell it from memory on two different days.')}</p>
        </div>

        <label className="discovery-search">
          {t('Search vocabulary topics')}
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          />
        </label>
        <p className="discovery-count" aria-live="polite">
          {Math.min(visibleCount, matchingTopics.length)} / {matchingTopics.length} {t('results shown')}
        </p>
        <div className="vh-topic-grid">
          {matchingTopics.slice(0, visibleCount).map((s, i) => (
            <TopicCard
              key={s.slug}
              slug={s.slug}
              title={s.title}
              count={s.count}
              ring={rings.get(s.slug) ?? { learnt: 0, total: s.count, fraction: 0 }}
              eager={i < 3}
              onOpen={openTopic}
            />
          ))}
        </div>
        {matchingTopics.length === 0 && <p className="discovery-empty">{t('No matches. Try another search.')}</p>}
        {matchingTopics.length > visibleCount && (
          <button type="button" className="discovery-more" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
            {t('Show more')}
          </button>
        )}
      </section>
    </div>
  );
}
