/* The pieces the three games share: the page heading, the topic chooser
   with its pictures, the start and end cards, the sign-in line and the
   list of words to look at again. Presentational only. */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useT } from '../../../lib/i18n/react';
import { nt } from '../../../lib/i18n/translate';
import { withBase } from '../../../lib/url';
import { isAuthConfigured } from '../../../lib/auth/supabase';
import { signInHref } from '../../../lib/auth/profile';
import { currentRoute } from '../../../lib/auth/next';
import { vocabTopicArt } from '../../../data/vocab-topic-art';
import { gameQuery, type GameKind } from '../../../lib/vocab-games/sets';
import type { VocabCard } from '../../../lib/vocab-review';
import { playableTopics, type GameTopic } from './deck';

export const GAME_NAMES: Record<GameKind, string> = {
  match: nt('Match pairs'),
  sprint: nt('60-second sprint'),
  spell: nt('Spell it'),
};

export const GAME_LINES: Record<GameKind, string> = {
  match: nt('Pair six words with their meanings, as fast as you can.'),
  sprint: nt('Fill the gap in each sentence. One minute, as many as you can.'),
  spell: nt('Read the meaning, then type the word from memory.'),
};

export function gamesHref(game: GameKind | null, topic: string | null): string {
  return `${withBase('/review/games')}${gameQuery(game, topic)}`;
}

/* ── Icons (decorative) ─────────────────────────────────────────────────── */

export function FlameIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12.6 2.4c.3 2.6-.9 4.3-2.3 5.9C8.8 10 7.2 11.8 7.2 14.6A4.9 4.9 0 0 0 12 19.6a4.9 4.9 0 0 0 4.8-5c0-1.6-.6-2.9-1.4-4 .1 1.3-.4 2.4-1.4 2.9.5-3.5-.6-7.6-1.4-11.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function GameGlyph({ game }: { game: GameKind }) {
  if (game === 'match') {
    return (
      <span className="vg-glyph vg-glyph-match" aria-hidden="true">
        <span />
        <span />
        <i />
      </span>
    );
  }
  if (game === 'sprint') {
    return (
      <span className="vg-glyph vg-glyph-sprint" aria-hidden="true">
        <span />
      </span>
    );
  }
  return (
    <span className="vg-glyph vg-glyph-spell" aria-hidden="true">
      <span>a</span>
      <span>b</span>
      <span />
    </span>
  );
}

/* ── Heading ────────────────────────────────────────────────────────────── */

export function GameHeading({ title, lead, topic }: { title: string; lead?: string; topic: string | null }) {
  const { t } = useT();
  return (
    <header className="vg-head">
      <nav className="vg-crumbs" aria-label={t('Breadcrumb')}>
        <a href={withBase(topic ? `/review?topic=${encodeURIComponent(topic)}` : '/review')}>{t('Vocabulary')}</a>
        <span aria-hidden="true">/</span>
        <a href={gamesHref(null, topic)}>{t('Games')}</a>
      </nav>
      <h1>{t(title)}</h1>
      {lead && <p className="vg-lead">{t(lead)}</p>}
    </header>
  );
}

/* ── The topic chooser ──────────────────────────────────────────────────── */

function TopicPicture({ slug }: { slug: string }) {
  const art = vocabTopicArt(slug);
  const [failed, setFailed] = useState(false);
  if (!art || failed) return <span className="vg-topic-art vg-topic-art-empty" aria-hidden="true" />;
  return (
    <img
      className="vg-topic-art"
      src={withBase(art.src)}
      alt=""
      width={art.width}
      height={art.height}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/** The words a game is playing with: a topic, or the mixed set, and a
    button that opens the topic grid. Each topic is a plain link, so the
    choice survives a reload and the back button. */
export function TopicSwitch({ game, topic }: { game: GameKind | null; topic: GameTopic | null }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const topics = playableTopics(game ?? 'sprint');

  useEffect(() => {
    if (open) gridRef.current?.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true });
  }, [open]);

  return (
    <div className="vg-topic-switch">
      <div className="vg-topic-current">
        {topic ? <TopicPicture slug={topic.slug} /> : <span className="vg-topic-art vg-topic-art-mixed" aria-hidden="true" />}
        <div>
          <span className="vg-eyebrow">{t('Words')}</span>
          <strong>{topic ? t(topic.title) : t('Mixed set')}</strong>
          {!topic && <span className="vg-topic-sub">{t('Words due for review first, then new ones')}</span>}
        </div>
        <button type="button" className="vg-btn vg-btn-quiet" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? t('Close') : t('Choose a topic')}
        </button>
      </div>
      {open && (
        <div className="vg-topic-grid" ref={gridRef}>
          <ul>
            <li>
              <a className={`vg-topic${topic ? '' : ' is-current'}`} href={gamesHref(game, null)} aria-current={topic ? undefined : 'true'}>
                <span className="vg-topic-art vg-topic-art-mixed" aria-hidden="true" />
                <span>{t('Mixed set')}</span>
              </a>
            </li>
            {topics.map((item) => (
              <li key={item.slug}>
                <a
                  className={`vg-topic${topic?.slug === item.slug ? ' is-current' : ''}`}
                  href={gamesHref(game, item.slug)}
                  aria-current={topic?.slug === item.slug ? 'true' : undefined}
                >
                  <TopicPicture slug={item.slug} />
                  <span>{t(item.title)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Lines ──────────────────────────────────────────────────────────────── */

export function SignInLine({ signedIn }: { signedIn: boolean }) {
  const { t } = useT();
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!signedIn && isAuthConfigured()), [signedIn]);
  if (!show) return null;
  return (
    <p className="vg-signin">
      {t('Your progress is kept on this device only.')}{' '}
      <a href={signInHref(currentRoute())}>{t('Sign in to keep it everywhere')}</a>
    </p>
  );
}

export function OwnerNote({ note }: { note: string | null }) {
  const { t } = useT();
  if (!note) return null;
  return (
    <p className="vg-note" role="status">
      {t(note)}
    </p>
  );
}

export function WordReview({ title, cards }: { title: string; cards: readonly VocabCard[] }) {
  const { t } = useT();
  if (!cards.length) return null;
  return (
    <section className="vg-review" aria-label={t(title)}>
      <h2>{t(title)}</h2>
      <ul>
        {cards.map((card) => (
          <li key={card.word}>
            <strong lang="en">{card.word}</strong>
            <span lang="en">{card.definition}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <dl className="vg-stats">{children}</dl>;
}

export function Stat({ label, value, accent = false }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className={`vg-stat${accent ? ' is-accent' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
