/* One topic's illustration (src/data/vocab-topic-art.ts). The frame holds a
   calm tinted background and a fixed aspect ratio, so the layout never
   shifts while the picture loads, and a picture that is missing or fails
   leaves the tinted frame behind rather than a broken-image icon. */

import { useEffect, useRef, useState } from 'react';
import { vocabTopicArt } from '../../../data/vocab-topic-art';
import { withBase } from '../../../lib/url';

interface Props {
  slug: string;
  className?: string;
  /** Above the fold: load straight away instead of lazily. */
  eager?: boolean;
}

export default function TopicPicture({ slug, className = '', eager = false }: Props) {
  const art = vocabTopicArt(slug);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // A picture that failed before this island hydrated never fires onError
  // for React to hear, so check once on mount as well.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <span className={`vh-pic ${className}`.trim()} data-slug={slug}>
      {art && !failed && (
        <img
          ref={ref}
          src={withBase(art.src)}
          alt={art.alt}
          width={art.width}
          height={art.height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
