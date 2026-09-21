/* /review ("Vocabulary"): a plain topic browser, replacing the flashcard-first
   landing page the owner found "weird and confusing". Pick a topic, see
   every word for it with its meaning and example, grouped the way the
   lesson itself teaches it, no flipping required. Flashcards are still
   there (VocabReview.tsx) but demoted to one quiet action at the bottom of
   a topic, not the first thing you see.

   Three views, one component, no client-side router:
     landing — every topic as a card (word count + a three-word preview)
     topic   — one topic's vocabulary, grouped into categories
     session — VocabReview.tsx's flashcard loop, filtered to that topic

   The chosen topic lives in the `topic` query string param so a link like
   /review?topic=environment (the dashboard's plan item, or anywhere else)
   opens straight into that topic. This is a static site with no routes for
   individual topics, so the param is read once on mount and kept in sync
   with history.replaceState() as the student clicks around — never
   pushState, so the browser's back button still means "leave the page",
   not "step back through topics". */

import { useEffect, useMemo, useState } from 'react';
import { withBase } from '../lib/url';
import type { VocabTopicData } from '../lib/vocab-review';
import { useT } from '../lib/i18n/react';
import VocabReview from './VocabReview';

type View = 'landing' | 'topic' | 'session';

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

export default function VocabTopics({ topics }: { topics: VocabTopicData[] }) {
  const { t, tn } = useT();
  const [view, setView] = useState<View>('landing');
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

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

  const summaries = useMemo(
    () =>
      topics.map((t) => {
        const inOrder = [...t.words, ...t.categories.flatMap((c) => c.words ?? [])];
        return { slug: t.slug, title: t.title, count: t.wordCount, preview: inOrder.slice(0, 3).map((w) => w.word) };
      }),
    [topics],
  );

  const active = useMemo(() => topics.find((t) => t.slug === activeSlug) ?? null, [topics, activeSlug]);

  function openTopic(slug: string) {
    setActiveSlug(slug);
    setView('topic');
    setUrlTopic(slug);
  }

  function backToTopics() {
    setActiveSlug(null);
    setView('landing');
    setUrlTopic(null);
  }

  if (view === 'session' && active) {
    return <VocabReview topic={active.title} onExit={() => setView('topic')} />;
  }

  if (view === 'topic' && active) {
    return (
      <div className="vocab-review-space">
        <div className="vocab-review-head">
          <p className="vocab-back-link">
            <button type="button" className="vocab-text-link" onClick={backToTopics}>
              {t('All topics')}
            </button>
          </p>
          <h1>{active.title}</h1>
        </div>

        {active.words.length > 0 && (
          <section className="vocab-topic-group">
            <h2>{t('Words and phrases')}</h2>
            <ul className="vocab-word-list">
              {active.words.map((w) => (
                <li key={w.word}>
                  <span className="vocab-word-term">{w.word}</span>
                  <span className="vocab-word-meaning">{w.meaning}</span>
                  {w.example && <span className="vocab-word-example">{w.example}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {active.categories.map((cat) => (
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
        ))}

        <div className="vocab-topic-practise">
          <button type="button" className="vocab-practise-link" onClick={() => setView('session')}>
            {t('Practise this topic with flashcards')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vocab-review-space">
      <div className="vocab-review-head">
        <p className="vocab-back-link">
          <a href={withBase('/dashboard')}>{t('Dashboard')}</a>
        </p>
        <h1>{t('Vocabulary')}</h1>
        <p>{t('Every IELTS topic, its vocabulary, meanings and examples. Pick a topic to see it all at once.')}</p>
      </div>

      <div className="vocab-topic-grid">
        {summaries.map((s) => (
          <button key={s.slug} type="button" className="vocab-topic-card" onClick={() => openTopic(s.slug)}>
            <span className="vocab-topic-card-title">{s.title}</span>
            <span className="vocab-topic-card-count">
              {tn(s.count, { one: '{n} word', other: '{n} words' })}
            </span>
            {s.preview.length > 0 && <span className="vocab-topic-card-preview">{s.preview.join(', ')}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
