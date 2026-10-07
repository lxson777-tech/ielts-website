/* One topic on the Vocabulary home: its picture, its name, how many words
   it teaches and a ring of how many of them the student has learnt. */

import { useT } from '../../../lib/i18n/react';
import type { TopicRing } from '../../../lib/vocab-home';
import ProgressRing from './ProgressRing';
import TopicPicture from './TopicPicture';

interface Props {
  slug: string;
  title: string;
  count: number;
  ring: TopicRing;
  eager?: boolean;
  onOpen: (slug: string) => void;
}

export default function TopicCard({ slug, title, count, ring, eager = false, onOpen }: Props) {
  const { t, tn } = useT();
  return (
    <button type="button" className="vh-topic" data-topic={slug} onClick={() => onOpen(slug)}>
      <TopicPicture slug={slug} className="vh-topic-pic" eager={eager} />
      <span className="vh-topic-body">
        <span className="vh-topic-title">{t(title)}</span>
        <span className="vh-topic-meta">
          <ProgressRing ring={ring} size={26} />
          <span>
            {ring.learnt > 0
              ? t('{learnt} of {total} learnt', { learnt: ring.learnt, total: ring.total })
              : tn(count, { one: '{n} word', other: '{n} words' })}
          </span>
        </span>
      </span>
    </button>
  );
}
