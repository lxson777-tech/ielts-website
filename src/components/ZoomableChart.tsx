/* A Task 1 chart the student can zoom into IN PLACE, without opening it.

   Alex, 4 October 2026: "we need to add the option to zoom in on the
   picture without having to open it when clicking on it". Students read
   exact figures off these charts, and the charts are height-capped so the
   question, the chart and the answer box share one screen. So the chart
   stays in its capped frame and the zoom happens inside that frame:

   - Mouse: a click zooms in (about 2.5x) on the point clicked; while
     zoomed, moving the pointer pans so what is under it stays in view; a
     second click zooms back out. The wheel zooms only while the chart is
     already zoomed, or with Ctrl held, so ordinary page scrolling is never
     captured.
   - Touch: pinch zooms (1x to 4x), one finger drags while zoomed, a double
     tap toggles. Unzoomed, a one-finger swipe scrolls the page as usual.
   - Keyboard: the frame takes focus; + and - zoom, the arrows pan, 0 or
     Escape resets.
   - A quiet capsule in the frame's corner: zoom in and Full size (the
     larger view a click used to open); reset and zoom out join them while
     zoomed.

   The arithmetic lives in src/lib/chart-zoom.ts (unit tested). The zoom is
   a CSS transform on the image, which is drawn from the image file's own
   pixels, and it stops at 1.5x those pixels (never beyond 4x) so the
   figures stay sharp. `will-change` is set only while a gesture is under
   way: left on, the browser would keep the picture rasterised at its
   1x size and the zoomed figures would blur.

   Display only: nothing here touches the question the grader receives
   (see src/lib/writing/prompt-charts.ts). */

import { memo, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CLICK_SCALE,
  IDENTITY,
  PAN_STEP_SHARE,
  clampView,
  followPointer,
  isZoomed,
  maxScaleFor,
  panBy,
  pinchView,
  stepZoom,
  toggleAt,
  wheelScale,
  zoomAt,
  zoomPercent,
  type FrameSize,
  type PinchStart,
  type ZoomView,
} from '../lib/chart-zoom';
import { useT } from '../lib/i18n/react';
import { useHydrated } from '../lib/hydration';
import '../styles/zoomable-chart.css';

/** How the next transform change should move: a short eased step (click,
    button, key, double tap), a quick follow (pointer pan), or straight to it
    (a finger on the glass, or the wheel). */
type Motion = 'step' | 'follow' | 'direct';

const TAP_SLOP = 10;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_SLOP = 32;
const CLICK_SLOP = 6;

// Layout effects warn during the build-time render; this runs there too.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface ZoomableChartProps {
  src: string;
  alt: string;
  /** Extra class on the outer block, for a screen to set its own height cap
      through --zchart-max-h. */
  className?: string;
  /** The one-line hint under the chart. On by default. */
  hint?: boolean;
}

function ZoomableChartImpl({ src, alt, className, hint = true }: ZoomableChartProps) {
  const { t } = useT();
  const hydrated = useHydrated();
  const hintId = useId();
  const keysId = useId();

  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fullSizeRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inRef = useRef<HTMLButtonElement>(null);
  const outRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);

  const [view, setViewState] = useState<ZoomView>(IDENTITY);
  const viewRef = useRef<ZoomView>(IDENTITY);
  const [motion, setMotion] = useState<Motion>('step');
  const [active, setActive] = useState(false);
  const [maxScale, setMaxScale] = useState(CLICK_SCALE);
  const maxRef = useRef(maxScale);
  const sizeRef = useRef<FrameSize>({ w: 0, h: 0 });
  const [coarse, setCoarse] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const setView = useCallback((next: ZoomView, how: Motion) => {
    viewRef.current = next;
    setMotion(how);
    setViewState(next);
  }, []);

  /* ── Measuring: the frame is exactly the image's displayed size ────── */
  const measure = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    const changed = Math.abs(w - sizeRef.current.w) > 0.5 || Math.abs(h - sizeRef.current.h) > 0.5;
    sizeRef.current = { w, h };
    const max = maxScaleFor(img.naturalWidth, w);
    maxRef.current = max;
    setMaxScale(max);
    // A new layout (rotation, resize) starts from the whole chart again.
    if (changed && isZoomed(viewRef.current)) setView({ ...IDENTITY }, 'direct');
  }, [setView]);

  useIsoLayoutEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(img);
    return () => ro.disconnect();
  }, [measure, src]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  /* ── Polite announcement of the zoom level, only when it changes ───── */
  const announcedRef = useRef<number>(100);
  useEffect(() => {
    const pct = zoomPercent(view.s);
    if (pct === announcedRef.current) return;
    const timer = window.setTimeout(() => {
      announcedRef.current = pct;
      setAnnouncement(pct <= 100 ? t('Zoom reset: the whole chart is shown.') : t('Zoomed to {n}%', { n: pct }));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [view.s, t]);

  /* ── Geometry helpers ──────────────────────────────────────────────── */
  const pointIn = (clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: 0, y: 0 };
  };

  /* ── Mouse (and pen): click to zoom, move to pan ───────────────────── */
  const downRef = useRef<{ x: number; y: number } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    downRef.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    const down = downRef.current;
    downRef.current = null;
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP) return;
    const p = pointIn(e.clientX, e.clientY);
    setView(toggleAt(viewRef.current, p.x, p.y, sizeRef.current, maxRef.current), 'step');
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch' || !isZoomed(viewRef.current)) return;
    const p = pointIn(e.clientX, e.clientY);
    setView(followPointer(viewRef.current.s, p.x, p.y, sizeRef.current, maxRef.current), 'follow');
  }

  /* ── Wheel and touch: native listeners, because both must be able to
        cancel the page's own scrolling (React's are passive) ─────────── */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let settle = 0;
    const gestureOn = () => {
      window.clearTimeout(settle);
      setActive(true);
    };
    const gestureOff = (delay = 0) => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => setActive(false), delay);
    };

    function onWheel(e: WheelEvent) {
      const v = viewRef.current;
      // Unzoomed and no Ctrl: this is the page scrolling. Leave it alone.
      if (!isZoomed(v) && !e.ctrlKey) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      const p = pointIn(e.clientX, e.clientY);
      gestureOn();
      setView(zoomAt(v, wheelScale(v.s, dy), p.x, p.y, sizeRef.current, maxRef.current), 'direct');
      gestureOff(180);
    }

    let pinch: PinchStart | null = null;
    let pan: { x: number; y: number; view: ZoomView } | null = null;
    let tap: { x: number; y: number; at: number; moved: boolean; fingers: number } | null = null;
    let lastTap: { x: number; y: number; at: number } | null = null;

    const touchPoint = (touch: Touch) => pointIn(touch.clientX, touch.clientY);
    const pinchOf = (a: Touch, b: Touch) => {
      const pa = touchPoint(a);
      const pb = touchPoint(b);
      return { distance: Math.hypot(pa.x - pb.x, pa.y - pb.y), mx: (pa.x + pb.x) / 2, my: (pa.y + pb.y) / 2 };
    };

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length >= 2) {
        // Two fingers on the chart: this is our pinch, not the page's.
        e.preventDefault();
        const g = pinchOf(e.touches[0], e.touches[1]);
        pinch = { view: viewRef.current, ...g };
        pan = null;
        if (tap) tap.fingers = 2;
        gestureOn();
        return;
      }
      const touch = e.touches[0];
      const p = touchPoint(touch);
      tap = { x: p.x, y: p.y, at: Date.now(), moved: false, fingers: 1 };
      if (isZoomed(viewRef.current)) {
        // Zoomed: one finger moves the chart (touch-action is none here).
        e.preventDefault();
        pan = { x: p.x, y: p.y, view: viewRef.current };
        gestureOn();
      } else {
        pan = null;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (pinch && e.touches.length >= 2) {
        e.preventDefault();
        const g = pinchOf(e.touches[0], e.touches[1]);
        setView(pinchView(pinch, g.distance, g.mx, g.my, sizeRef.current, maxRef.current), 'direct');
        return;
      }
      const touch = e.touches[0];
      if (!touch) return;
      const p = touchPoint(touch);
      if (tap && Math.hypot(p.x - tap.x, p.y - tap.y) > TAP_SLOP) tap.moved = true;
      if (pan) {
        e.preventDefault();
        setView(panBy(pan.view, p.x - pan.x, p.y - pan.y, sizeRef.current, maxRef.current), 'direct');
      }
      // Otherwise: unzoomed, one finger. The page scrolls; nothing to do.
    }

    function onTouchEnd(e: TouchEvent) {
      if (pinch) {
        if (e.touches.length === 1) {
          // One finger lifted mid-pinch: carry on as a drag with the other.
          const p = touchPoint(e.touches[0]);
          pinch = null;
          pan = isZoomed(viewRef.current) ? { x: p.x, y: p.y, view: viewRef.current } : null;
          return;
        }
        if (e.touches.length === 0) {
          pinch = null;
          tap = null;
          lastTap = null;
          // A pinch that ends just above 1x settles at exactly 1x.
          if (viewRef.current.s < 1.04) setView({ ...IDENTITY }, 'step');
          gestureOff();
        }
        return;
      }
      if (e.touches.length > 0) return;
      pan = null;
      gestureOff();
      const done = tap;
      tap = null;
      if (!done || done.moved || done.fingers > 1 || Date.now() - done.at > 400) {
        lastTap = null;
        return;
      }
      const now = Date.now();
      if (lastTap && now - lastTap.at < DOUBLE_TAP_MS && Math.hypot(done.x - lastTap.x, done.y - lastTap.y) < DOUBLE_TAP_SLOP) {
        // Double tap: toggle, and keep the browser from treating it as a click.
        if (e.cancelable) e.preventDefault();
        lastTap = null;
        setView(toggleAt(viewRef.current, done.x, done.y, sizeRef.current, maxRef.current), 'step');
        return;
      }
      lastTap = { x: done.x, y: done.y, at: now };
    }

    function onTouchCancel() {
      pinch = null;
      pan = null;
      tap = null;
      gestureOff();
    }

    frame.addEventListener('wheel', onWheel, { passive: false });
    frame.addEventListener('touchstart', onTouchStart, { passive: false });
    frame.addEventListener('touchmove', onTouchMove, { passive: false });
    frame.addEventListener('touchend', onTouchEnd, { passive: false });
    frame.addEventListener('touchcancel', onTouchCancel);
    return () => {
      window.clearTimeout(settle);
      frame.removeEventListener('wheel', onWheel);
      frame.removeEventListener('touchstart', onTouchStart);
      frame.removeEventListener('touchmove', onTouchMove);
      frame.removeEventListener('touchend', onTouchEnd);
      frame.removeEventListener('touchcancel', onTouchCancel);
    };
    // pointIn reads a ref only; setView is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setView]);

  /* ── Keyboard ──────────────────────────────────────────────────────── */
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const v = viewRef.current;
    const size = sizeRef.current;
    const max = maxRef.current;
    const stepX = size.w * PAN_STEP_SHARE;
    const stepY = size.h * PAN_STEP_SHARE;
    let next: ZoomView | null = null;
    switch (e.key) {
      case '+':
      case '=':
        next = stepZoom(v, 1, size, max);
        break;
      case '-':
      case '_':
        next = stepZoom(v, -1, size, max);
        break;
      case '0':
        next = { ...IDENTITY };
        break;
      case 'Escape':
        // Unzoomed, Escape belongs to whatever else is listening.
        if (isZoomed(v)) {
          next = { ...IDENTITY };
          e.stopPropagation();
        }
        break;
      // Arrows only pan while zoomed; unzoomed they scroll the page.
      case 'ArrowLeft':
        if (isZoomed(v)) next = panBy(v, stepX, 0, size, max);
        break;
      case 'ArrowRight':
        if (isZoomed(v)) next = panBy(v, -stepX, 0, size, max);
        break;
      case 'ArrowUp':
        if (isZoomed(v)) next = panBy(v, 0, stepY, size, max);
        break;
      case 'ArrowDown':
        if (isZoomed(v)) next = panBy(v, 0, -stepY, size, max);
        break;
      default:
        return;
    }
    if (!next) return;
    e.preventDefault();
    setView(next, 'step');
  }

  /* ── Controls ──────────────────────────────────────────────────────── */
  /* Back at 1x, Reset and Zoom out hide. If one of them has the keyboard
     focus, it moves to Zoom in first, rather than dropping onto the page. */
  const keepFocus = (next: ZoomView) => {
    if (isZoomed(next) || typeof document === 'undefined') return;
    const el = document.activeElement;
    if (el && (el === resetRef.current || el === outRef.current)) inRef.current?.focus();
  };
  const zoomBy = (direction: 1 | -1) => {
    const next = stepZoom(viewRef.current, direction, sizeRef.current, maxRef.current);
    keepFocus(next);
    setView(next, 'step');
  };
  const reset = () => {
    keepFocus(IDENTITY);
    setView({ ...IDENTITY }, 'step');
  };

  /* ── The larger view (the lightbox a click used to open) ───────────── */
  const closeLightbox = useCallback(() => {
    setLightbox(false);
    // Back to the control that opened it.
    window.requestAnimationFrame(() => fullSizeRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, closeLightbox]);

  const zoomed = isZoomed(view);
  const atMax = view.s >= maxScale - 0.01;
  const transform = zoomed ? `translate(${view.x}px, ${view.y}px) scale(${view.s})` : 'none';
  const hintText = hydrated && coarse
    ? t('Pinch or double-tap the chart to zoom. Use Full size to open it larger.')
    : t('Click the chart to zoom in. Use Full size to open it larger.');

  // Keep the view inside the frame if the max shrinks under it (a resize).
  useEffect(() => {
    const clamped = clampView(viewRef.current, sizeRef.current, maxScale);
    if (clamped.s !== viewRef.current.s) setView(clamped, 'step');
  }, [maxScale, setView]);

  return (
    <div className={`zchart${className ? ` ${className}` : ''}`}>
      <div className="zchart-stage">
        <div
          ref={frameRef}
          className="zchart-frame"
          data-zoomed={zoomed ? 'true' : 'false'}
          tabIndex={0}
          role="group"
          aria-label={alt ? t('Chart: {alt}. Zoomable.', { alt }) : t('Zoomable chart')}
          aria-describedby={hint ? `${hintId} ${keysId}` : keysId}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
        >
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="zchart-img"
            data-motion={motion}
            data-active={active ? 'true' : 'false'}
            style={{ transform }}
            onLoad={measure}
          />
        </div>
        {/* At 1x only Zoom in and Full size show, so the capsule hides as
            little of the chart as possible; Reset and Zoom out join them,
            to the LEFT, once zoomed. Zoom in therefore never moves under a
            pointer pressing it again and again. */}
        <div className="zchart-controls" role="group" aria-label={t('Chart zoom')}>
          <button ref={resetRef} type="button" className="zchart-btn zchart-btn-extra" onClick={reset} hidden={!zoomed} aria-label={t('Reset zoom')} title={t('Reset zoom')}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 9.5a5.5 5.5 0 1 1 1.6 4.4" /><path d="M4.2 5.2v4.5h4.5" /></svg>
          </button>
          <button ref={outRef} type="button" className="zchart-btn zchart-btn-extra" onClick={() => zoomBy(-1)} hidden={!zoomed} aria-label={t('Zoom out')} title={t('Zoom out')}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10" /></svg>
          </button>
          <button ref={inRef} type="button" className="zchart-btn" onClick={() => zoomBy(1)} disabled={atMax} aria-label={t('Zoom in')} title={t('Zoom in')}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M10 5v10" /></svg>
          </button>
          <span className="zchart-divider" aria-hidden="true" />
          <button
            ref={fullSizeRef}
            type="button"
            className="zchart-btn"
            onClick={() => setLightbox(true)}
            aria-label={t('Full size')}
            title={t('Full size')}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4h4v4M8 16H4v-4M16 4l-5 5M4 16l5-5" /></svg>
          </button>
        </div>
      </div>
      {hint && (
        <p id={hintId} className="zchart-hint">
          {hintText}
        </p>
      )}
      <span id={keysId} className="sr-only">
        {t('Plus and minus zoom, the arrow keys move around the zoomed chart, and 0 or Escape shows the whole chart again.')}
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>

      {lightbox &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt || t('Chart, larger view')}
            className="zchart-lightbox"
            onClick={closeLightbox}
          >
            <button ref={closeRef} type="button" onClick={closeLightbox} aria-label={t('Close')} className="zchart-lightbox-close">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
            </button>
            <img src={src} alt={alt} className="zchart-lightbox-img" onClick={(e) => e.stopPropagation()} />
          </div>,
          document.body,
        )}
    </div>
  );
}

export default memo(ZoomableChartImpl);
