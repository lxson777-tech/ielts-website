/* The seam between Mr EZ's behaviour and Mr EZ's face.

   Codex owns the character design and the final artwork. Nothing in the
   tutor's logic knows what he looks like, and nothing about his looks is
   allowed to affect whether he works. This file is the only place the two
   meet.

   TO INSTALL THE APPROVED ARTWORK, one edit: fill in the paths below and set
   `hasArtwork` to true. Drop the files under `public/mr-ez/`. No component
   changes, no rebuild of anything else. If a file is missing at runtime the
   component falls back to the placeholder rather than showing a broken
   image, so a half-finished asset set never breaks a page.

   Full specification for the asset set: docs/MR-EZ-ASSET-SPEC.md. */

import type { TutorMood } from './schema';

/** Flip to true once real files exist under public/mr-ez/. Until then every
    surface renders the neutral placeholder, which is deliberately plain so
    nobody mistakes it for a design decision. */
export const hasArtwork = false;

/** One image per state. Paths are relative to the site root; the component
    applies withBase(). Leave a state empty and it falls back to `idle`. */
export const MR_EZ_ART: Record<TutorMood, string> = {
  idle: '/mr-ez/idle.svg',
  thinking: '/mr-ez/thinking.svg',
  explaining: '/mr-ez/explaining.svg',
  encouraging: '/mr-ez/encouraging.svg',
  celebrating: '/mr-ez/celebrating.svg',
  unavailable: '/mr-ez/unavailable.svg',
};

/** What each state means, so the artwork brief and the code agree on when
    each one is actually shown. These are tied to real interface events, not
    to sentiment guessed from the text. */
export const MOOD_MEANING: Record<TutorMood, string> = {
  idle: 'Resting. Nothing is happening and nothing is being waited for.',
  thinking: 'A request is genuinely in flight. Shown only between send and reply.',
  explaining: 'The reply that just arrived was an explanation. The default for an answer.',
  encouraging: 'The reply was reassurance or a nudge forward, e.g. the dashboard welcome.',
  celebrating: 'The reply is about something the student actually achieved, backed by a result on record.',
  unavailable: 'The tutor cannot be reached, is not configured, or the daily limit is spent.',
};

export function artFor(mood: TutorMood): string {
  return MR_EZ_ART[mood] || MR_EZ_ART.idle;
}
