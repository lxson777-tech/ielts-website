/* Ms. Taylor, the live examiner, drawn (Alex, 4 October 2026).

   The contract between the artwork and the interview screen. The screen
   (src/components/speaking/ExaminerStage.tsx) shows one frame at a time and
   crossfades between them; it never generates or edits an image at runtime.
   The brief for the artwork is docs/MS-TAYLOR-ASSET-SPEC.md.

   Until `hasExaminerArtwork` is true the screen draws its own simple
   placeholder, so the interview works and can be tested before the art
   arrives. A frame file that fails to load falls back to the placeholder too,
   so a partial set is safe to commit.

   Ms. Taylor is the examiner, not the tutor: she is neutral, never praises or
   frowns at an answer, and never reacts to its quality. Mr EZ appears only on
   the result screen. */

export type ExaminerFrame =
  /* Same framing, pixel-aligned with each other (edited from `listen`). */
  | 'listen'   // neutral, eyes open, mouth closed: the resting frame
  | 'blink'    // identical to listen, eyes closed
  | 'speak1'   // mouth slightly open
  | 'speak2'   // mouth open
  | 'speak3'   // mouth more open (a vowel)
  /* Same framing, not necessarily pixel-aligned. */
  | 'glance'   // eyes down to her notes: the pause before she replies
  | 'write'    // looking down, pen moving on the notepad: Part 2 preparation
  | 'lean'     // slightly forward, attentive: Part 3 discussion
  | 'greet'    // joining the call: a small polite nod, mouth closed
  | 'close';   // folder closed, a single nod: the end of the test

/** The frames that must line up pixel for pixel, so the mouth and eyes can
    change without the face jumping. */
export const ALIGNED_FRAMES: readonly ExaminerFrame[] = ['listen', 'blink', 'speak1', 'speak2', 'speak3'];

export const EXAMINER_FRAMES: readonly ExaminerFrame[] = [
  'listen', 'blink', 'speak1', 'speak2', 'speak3', 'glance', 'write', 'lean', 'greet', 'close',
];

/** Square canvas, transparent background; the card behind her is drawn by CSS. */
export const EXAMINER_ART_SIZE = 768;

/** Flip to true once every file in EXAMINER_ART exists in public/ms-taylor/. */
export const hasExaminerArtwork = false;

/** Paths relative to the site base (the screen runs them through withBase). */
export const EXAMINER_ART: Readonly<Record<ExaminerFrame, string>> = {
  listen: '/ms-taylor/listen.webp',
  blink: '/ms-taylor/blink.webp',
  speak1: '/ms-taylor/speak1.webp',
  speak2: '/ms-taylor/speak2.webp',
  speak3: '/ms-taylor/speak3.webp',
  glance: '/ms-taylor/glance.webp',
  write: '/ms-taylor/write.webp',
  lean: '/ms-taylor/lean.webp',
  greet: '/ms-taylor/greet.webp',
  close: '/ms-taylor/close.webp',
};

/** The examiner's name as students see it. */
export const EXAMINER_NAME = 'Ms. Taylor';
