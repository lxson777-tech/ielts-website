/* Word of the day: one word per calendar day from the real deck (see
   pickWordOfTheDay in src/lib/vocab-home.ts), shown large; tapping turns it
   over to the meaning and an example. Beside it, on wider screens, the
   picture of the word's topic, which opens that topic.

   The date is the student's own, so it is only known in the browser: the
   card renders nothing until mount, and the space it will take is held by
   the min-height in the stylesheet so the page does not jump. */

import { useT } from '../../../lib/i18n/react';
import type { WordOfTheDay } from '../../../lib/vocab-home';
import FlipCard from './FlipCard';
import TopicPicture from './TopicPicture';
import { ArrowIcon } from './icons';

interface Props {
  word: WordOfTheDay | null;
  learnt: boolean;
  onOpenTopic: (slug: string) => void;
}

export default function WordOfTheDayCard({ word, learnt, onOpenTopic }: Props) {
  const { t } = useT();
  return (
    <section className="vh-wotd" aria-labelledby="vh-wotd-title">
      <div className="vh-wotd-main">
        <div className="vh-wotd-head">
          <h2 id="vh-wotd-title">{t('Word of the day')}</h2>
          {word && (
            <button type="button" className="vh-wotd-topic" onClick={() => onOpenTopic(word.topicSlug)}>
              <span>{t(word.topicTitle)}</span>
              <ArrowIcon />
            </button>
          )}
        </div>
        {word ? (
          <FlipCard
            key={word.word}
            size="feature"
            word={word.word}
            meaning={word.meaning}
            example={word.example}
            learnt={learnt}
            frontNote={<span className="vh-flip-hint" aria-hidden="true">{t('Tap to see the meaning')}</span>}
          />
        ) : (
          <div className="vh-flip vh-flip--feature vh-flip--placeholder" aria-hidden="true" />
        )}
      </div>
      {word && (
        <button
          type="button"
          className="vh-wotd-pic"
          onClick={() => onOpenTopic(word.topicSlug)}
          aria-label={t('Open the topic {topic}', { topic: t(word.topicTitle) })}
        >
          <TopicPicture slug={word.topicSlug} eager />
        </button>
      )}
    </section>
  );
}
