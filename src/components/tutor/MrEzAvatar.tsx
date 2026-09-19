/* Mr EZ's face — a REPLACEABLE PLACEHOLDER.

   Codex owns the character design and the final artwork. What is drawn below
   is deliberately the plainest thing that can hold five expressions: a
   rounded capsule, two eyes, one mouth, in the workspace's existing forest
   ink and terracotta. It is not a proposal. Nobody should mistake it for
   one.

   How the real art arrives: drop the files into `public/mr-ez/` and set
   `hasArtwork = true` in src/lib/tutor/avatar.ts. This component then renders
   those images instead, with the same states, the same sizes and the same
   animation rules. If an image fails to load it falls straight back to the
   placeholder, so an incomplete asset set can never leave a blank square on
   the page. See docs/MR-EZ-ASSET-SPEC.md for the full brief.

   Animation: the states are separate prepared frames, not per-interaction
   generation. Movement between them is CSS only (a breathe, a think-bob, a
   celebrate-pop) and every one of them is switched off under
   prefers-reduced-motion, where the state still changes but nothing moves. */

import { useState } from 'react';
import { withBase } from '../../lib/url';
import { artFor, hasArtwork } from '../../lib/tutor/avatar';
import type { TutorMood } from '../../lib/tutor/schema';

export interface MrEzAvatarProps {
  mood: TutorMood;
  /** Rendered size in px. The spec's three sizes are 28 (inline), 44 (panel
      header and launcher) and 88 (dashboard welcome). */
  size?: number;
  /** Decorative in most places: the surrounding text already says what is
      happening, so a second announcement is noise for a screen reader. */
  label?: string;
}

export default function MrEzAvatar({ mood, size = 44, label }: MrEzAvatarProps) {
  const [artBroken, setArtBroken] = useState(false);
  const showArt = hasArtwork && !artBroken;

  return (
    <span
      className={`mrez-avatar is-${mood}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-mood={mood}
    >
      {showArt ? (
        <img src={withBase(artFor(mood))} alt="" width={size} height={size} onError={() => setArtBroken(true)} />
      ) : (
        <PlaceholderFace mood={mood} />
      )}
    </span>
  );
}

/* The placeholder itself. One shape, five expressions, driven entirely by
   which eyes and mouth are drawn — no separate illustrations to keep in
   step. viewBox is 64x64 so it scales cleanly at every size in the spec. */
function PlaceholderFace({ mood }: { mood: TutorMood }) {
  const asleep = mood === 'unavailable';
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <rect className="mrez-body" x="8" y="10" width="48" height="48" rx="22" />
      {/* A single antenna, so "top of the head" is unambiguous at 28px. */}
      <path className="mrez-antenna" d="M32 10V4" strokeLinecap="round" />
      <circle className="mrez-antenna-tip" cx="32" cy="3" r="2.6" />

      {asleep ? (
        <>
          <path className="mrez-eye-line" d="M20 31h8" strokeLinecap="round" />
          <path className="mrez-eye-line" d="M36 31h8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle className="mrez-eye" cx="24" cy="31" r="3.6" />
          <circle className="mrez-eye" cx="40" cy="31" r="3.6" />
        </>
      )}

      {mood === 'thinking' && (
        <g className="mrez-think-dots">
          <circle cx="26" cy="45" r="2" />
          <circle cx="32" cy="45" r="2" />
          <circle cx="38" cy="45" r="2" />
        </g>
      )}
      {mood === 'explaining' && <path className="mrez-mouth" d="M25 44h14" strokeLinecap="round" />}
      {(mood === 'idle' || mood === 'encouraging') && (
        <path className="mrez-mouth" d="M25 43c3 3.5 11 3.5 14 0" strokeLinecap="round" fill="none" />
      )}
      {mood === 'celebrating' && (
        <>
          <path className="mrez-mouth" d="M24 42c3.5 6 12.5 6 16 0z" />
          <path className="mrez-spark" d="M12 20l1.6 3.4L17 25l-3.4 1.6L12 30l-1.6-3.4L7 25l3.4-1.6z" />
          <path className="mrez-spark" d="M52 34l1.2 2.6L56 38l-2.8 1.2L52 42l-1.2-2.8L48 38l2.8-1.4z" />
        </>
      )}
      {asleep && <path className="mrez-mouth" d="M27 44h10" strokeLinecap="round" />}
    </svg>
  );
}
