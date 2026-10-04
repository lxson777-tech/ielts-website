/* The arithmetic behind ZoomableChart (src/components/ZoomableChart.tsx),
   kept free of the DOM so tests/chart-zoom.test.ts can pin it down.

   Model: the chart image sits in a frame exactly its own displayed size
   (w x h CSS pixels). It is drawn with `transform: translate(x, y)
   scale(s)` and transform-origin 0 0, so a point q on the unscaled image
   appears in the frame at  p = t + s * q.  Zoom never shows anything
   outside the image: at scale s the picture is s*w wide, so x may run from
   w - s*w (its right edge at the frame's right edge) to 0 (its left edge at
   the frame's left edge), and the same for y.

   Students read exact numbers off these charts (Writing Task 1), so the
   zoom stops where the picture would stop being sharp: at 1.5x the
   picture's own pixels, never beyond 4x, whichever comes first. */

export interface ZoomView {
  /** Scale, 1 = the chart as it sits in the frame. */
  s: number;
  /** Translation in frame pixels (always <= 0 on both axes). */
  x: number;
  y: number;
}

export interface FrameSize {
  w: number;
  h: number;
}

export const MIN_SCALE = 1;
/** Hard ceiling, whatever the picture's resolution. */
export const MAX_SCALE = 4;
/** A plain click (or a double tap) zooms to this, capped at the max. */
export const CLICK_SCALE = 2.5;
/** How far beyond its own pixels the picture may be enlarged. */
export const SHARPNESS_FACTOR = 1.5;
/** The smallest useful ceiling: a zoom that cannot reach this is not worth
    offering, so a picture already shown near its own size still gets it. */
export const MIN_USEFUL_MAX = 1.5;
/** One press of + or - (and one keyboard step). */
export const STEP_FACTOR = 1.5;
/** One arrow-key press pans this share of the frame. */
export const PAN_STEP_SHARE = 0.15;

export const IDENTITY: ZoomView = Object.freeze({ s: 1, x: 0, y: 0 });

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** The highest scale that keeps this picture sharp in this frame.
    `natural` is the image file's own pixel width; `displayed` the width it is
    drawn at in the frame. Unknown sizes (image not loaded yet) give the
    click scale, so the first click still does the expected thing. */
export function maxScaleFor(naturalWidth: number, displayedWidth: number): number {
  if (!(naturalWidth > 0) || !(displayedWidth > 0)) return CLICK_SCALE;
  const sharp = (naturalWidth / displayedWidth) * SHARPNESS_FACTOR;
  return clamp(sharp, MIN_USEFUL_MAX, MAX_SCALE);
}

/** The scale a plain click or double tap zooms to. */
export function clickScaleFor(maxScale: number): number {
  return Math.min(CLICK_SCALE, maxScale);
}

/** Keep the picture covering the frame: no empty margin may show. */
export function clampView(view: ZoomView, frame: FrameSize, maxScale: number): ZoomView {
  const s = clamp(view.s, MIN_SCALE, Math.max(MIN_SCALE, maxScale));
  if (s <= MIN_SCALE + 1e-6) return { s: 1, x: 0, y: 0 };
  const minX = frame.w - s * frame.w;
  const minY = frame.h - s * frame.h;
  return { s, x: clamp(view.x, minX, 0), y: clamp(view.y, minY, 0) };
}

/** Change the scale while the picture point under (px, py) stays exactly
    where it is on screen: the point clicked, pinched or scrolled over. */
export function zoomAt(
  view: ZoomView,
  nextScale: number,
  px: number,
  py: number,
  frame: FrameSize,
  maxScale: number,
): ZoomView {
  const s = clamp(nextScale, MIN_SCALE, Math.max(MIN_SCALE, maxScale));
  const qx = (px - view.x) / view.s;
  const qy = (py - view.y) / view.s;
  return clampView({ s, x: px - s * qx, y: py - s * qy }, frame, maxScale);
}

/** Desktop pan while zoomed: the pointer's position in the frame picks the
    same relative position in the picture, so whatever is under the pointer
    stays in view and the frame's corners reach the picture's corners. */
export function followPointer(scale: number, px: number, py: number, frame: FrameSize, maxScale: number): ZoomView {
  const fx = frame.w > 0 ? clamp(px / frame.w, 0, 1) : 0;
  const fy = frame.h > 0 ? clamp(py / frame.h, 0, 1) : 0;
  return clampView({ s: scale, x: -(scale - 1) * frame.w * fx, y: -(scale - 1) * frame.h * fy }, frame, maxScale);
}

/** Move the picture by (dx, dy) frame pixels (a finger drag, an arrow key). */
export function panBy(view: ZoomView, dx: number, dy: number, frame: FrameSize, maxScale: number): ZoomView {
  return clampView({ s: view.s, x: view.x + dx, y: view.y + dy }, frame, maxScale);
}

export interface PinchStart {
  view: ZoomView;
  /** Distance between the two fingers when the pinch began. */
  distance: number;
  /** Midpoint between them, in frame pixels. */
  mx: number;
  my: number;
}

/** A two-finger pinch: the scale follows the change in finger distance, and
    the picture point that was under the fingers' midpoint stays under it as
    the fingers move (so a pinch can also pan). */
export function pinchView(
  start: PinchStart,
  distance: number,
  mx: number,
  my: number,
  frame: FrameSize,
  maxScale: number,
): ZoomView {
  const ratio = start.distance > 0 ? distance / start.distance : 1;
  const s = clamp(start.view.s * ratio, MIN_SCALE, Math.max(MIN_SCALE, maxScale));
  const qx = (start.mx - start.view.x) / start.view.s;
  const qy = (start.my - start.view.y) / start.view.s;
  return clampView({ s, x: mx - s * qx, y: my - s * qy }, frame, maxScale);
}

/** Toggle used by a click and a double tap: zoom in at the point, or back
    out to the whole chart if already zoomed. */
export function toggleAt(view: ZoomView, px: number, py: number, frame: FrameSize, maxScale: number): ZoomView {
  if (view.s > MIN_SCALE + 1e-6) return { ...IDENTITY };
  return zoomAt(view, clickScaleFor(maxScale), px, py, frame, maxScale);
}

/** A step of + or -, centred on the middle of the frame. */
export function stepZoom(view: ZoomView, direction: 1 | -1, frame: FrameSize, maxScale: number): ZoomView {
  const next = direction > 0 ? view.s * STEP_FACTOR : view.s / STEP_FACTOR;
  return zoomAt(view, next, frame.w / 2, frame.h / 2, frame, maxScale);
}

/** A mouse-wheel tick (deltaY in pixels, positive = scroll down = zoom out). */
export function wheelScale(scale: number, deltaY: number): number {
  return scale * Math.exp(-deltaY * 0.0025);
}

export function isZoomed(view: ZoomView): boolean {
  return view.s > MIN_SCALE + 1e-6;
}

/** Whole per cent, as the zoom level is announced. */
export function zoomPercent(scale: number): number {
  return Math.round(scale * 100);
}
