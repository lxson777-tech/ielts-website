/* Ms. Taylor on the live interview screen (Alex, 4 October 2026).

   Replaces the glossy talking ball. A quiet video-call card: her tile on one
   side, yours on the other, the written status and the captions underneath.
   She is shown as ONE prepared frame at a time (the contract is
   src/lib/speaking/live/examiner-art.ts), crossfaded when the scene changes
   and swapped instantly for mouth movements, which line up pixel for pixel.

   Which frame, and when, is decided by src/lib/speaking/live/examiner-stage.ts.
   This component never re-renders for it: LiveExaminer's existing animation
   loop calls `tick()` on the handle every frame, and the frame, the scene,
   the active-speaker outline and the microphone bars are written straight
   to the page only when they change.

   Until the real artwork exists (`hasExaminerArtwork`), and whenever a frame
   fails to load, the tile draws a plain line portrait made here. It is a
   placeholder and looks like one, on purpose.

   Accessibility: the portrait, the microphone bars, the pencil line and the
   two-minute ring are decorative (aria-hidden). Everything they show is also
   in the written status line, which is the same text the old screen showed,
   so meaning never depends on motion. Under prefers-reduced-motion there is
   no breathing, no nod and no crossfade, and while she speaks her mouth
   holds one open frame (see examiner-stage.ts). */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type RefObject } from 'react';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import {
  ALIGNED_FRAMES,
  EXAMINER_ART,
  EXAMINER_FRAMES,
  EXAMINER_NAME,
  hasExaminerArtwork,
  type ExaminerFrame,
} from '../../lib/speaking/live/examiner-art';
import {
  createFrameDriver,
  pickScene,
  sceneBreathes,
  SCENE_FRAME,
  type ExaminerScene,
  type FrameDriver,
  type LevelSample,
  type StageSignals,
} from '../../lib/speaking/live/examiner-stage';
import '../../styles/examiner-stage.css';

export interface ExaminerStageHandle {
  /** One animation frame of audio levels. Cheap: writes to the page only
      when something visible changes. */
  tick(sample: LevelSample): void;
}

export interface ExaminerStageProps {
  signals: StageSignals;
  /** "Part 1 · Interview" and so on. */
  label: string;
  /** The interview clock, "4:05". */
  elapsed?: string;
  /** The written status line (the same sentences as before). */
  status: ReactNode;
  /** The same message as plain text without any countdown, read out once
      per scene change by screen readers (a polite live region). */
  announce?: string;
  /** Who has the turn, for the status dot only. */
  statusTone: 'examiner' | 'student' | 'quiet';
  /** A line under the status (connecting). */
  note?: ReactNode;
  caption?: ReactNode;
  /** The cue card, handed across to the student's side in Part 2. */
  cueCard?: ReactNode;
  /** 0 to 1 through the preparation minute; null when not preparing. */
  prepProgress?: number | null;
  /** The two-minute talk is running. */
  talkRing?: boolean;
  /** The student's microphone is paused (the preparation minute). */
  micPaused?: boolean;
  controls?: ReactNode;
}

const BARS = 4;
const CROSSFADE_MS = 240;

let preloaded = false;
/** Fetches every frame once per page, so the first crossfade never waits on
    the network. Called when an interview starts connecting. */
export function preloadExaminerArt(): void {
  if (preloaded || !hasExaminerArtwork || typeof Image === 'undefined') return;
  preloaded = true;
  for (const frame of EXAMINER_FRAMES) {
    const img = new Image();
    img.decoding = 'async';
    img.src = withBase(EXAMINER_ART[frame]);
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

const ExaminerStage = forwardRef<ExaminerStageHandle, ExaminerStageProps>(function ExaminerStage(props, ref) {
  const { signals, label, elapsed, status, announce, statusTone, note, caption, cueCard, prepProgress, talkRing, micPaused, controls } = props;
  const { t } = useT();
  const [artBroken, setArtBroken] = useState(false);
  const useArt = hasExaminerArtwork && !artBroken;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const figureRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const imgRefs = useRef<Partial<Record<ExaminerFrame, HTMLImageElement | null>>>({});
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const reducedRef = useRef(false);
  const driverRef = useRef<FrameDriver | null>(null);
  const signalsRef = useRef(signals);
  signalsRef.current = signals;
  const useArtRef = useRef(useArt);
  useArtRef.current = useArt;
  const shown = useRef<{
    frame: ExaminerFrame | null;
    scene: ExaminerScene | null;
    speaker: string;
    bars: number;
  }>({ frame: null, scene: null, speaker: '', bars: -1 });
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!driverRef.current) {
    reducedRef.current = prefersReducedMotion();
    driverRef.current = createFrameDriver({ reducedMotion: reducedRef.current });
  }

  /** Puts one frame on screen. Mouth and blink frames (pixel-aligned) swap
      instantly; any other change crossfades, the new frame fading in OVER
      the old one so the transparent artwork never shows through itself. */
  function applyFrame(frame: ExaminerFrame) {
    const prev = shown.current.frame;
    if (prev === frame) return;
    shown.current.frame = frame;
    if (rootRef.current) rootRef.current.dataset.frame = frame;
    if (!useArtRef.current) {
      svgRef.current?.setAttribute('data-frame', frame);
      return;
    }
    const imgs = imgRefs.current;
    const next = imgs[frame];
    if (!next) return;
    const instant =
      reducedRef.current || prev === null || (ALIGNED_FRAMES.includes(frame) && ALIGNED_FRAMES.includes(prev));
    if (fadeTimer.current) {
      clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }
    const hideOthers = () => {
      for (const f of EXAMINER_FRAMES) {
        const el = imgs[f];
        if (!el || f === shown.current.frame) continue;
        el.classList.remove('is-on', 'is-top');
      }
    };
    if (instant) {
      next.classList.add('is-on', 'is-top', 'no-fade');
      hideOthers();
      return;
    }
    for (const f of EXAMINER_FRAMES) imgs[f]?.classList.remove('is-top');
    next.classList.remove('no-fade');
    next.classList.add('is-top', 'is-on');
    fadeTimer.current = setTimeout(hideOthers, CROSSFADE_MS + 40);
  }

  function applyScene(scene: ExaminerScene) {
    if (shown.current.scene === scene) return;
    const before = shown.current.scene;
    shown.current.scene = scene;
    const root = rootRef.current;
    if (!root) return;
    root.dataset.scene = scene;
    root.dataset.breathe = sceneBreathes(scene) && !reducedRef.current ? 'on' : 'off';
    /* One polite nod on joining the call and once at the end. */
    if (!reducedRef.current && (scene === 'closed' || (scene === 'connecting' && before === null))) {
      const fig = figureRef.current;
      if (fig) {
        fig.classList.remove('is-nod');
        void fig.offsetWidth; // restart the animation
        fig.classList.add('is-nod');
      }
    }
  }

  function applyLevels(speaker: string, mic: number) {
    const root = rootRef.current;
    if (root && shown.current.speaker !== speaker) {
      shown.current.speaker = speaker;
      root.dataset.speaker = speaker;
    }
    const lit = Math.min(BARS, Math.round(Math.sqrt(Math.min(1, mic / 0.5)) * BARS));
    if (lit !== shown.current.bars) {
      shown.current.bars = lit;
      barRefs.current.forEach((bar, i) => bar?.classList.toggle('is-lit', i < lit));
    }
  }

  useImperativeHandle(ref, () => ({
    tick(sample: LevelSample) {
      const state = driverRef.current!.step(signalsRef.current, sample);
      applyScene(state.scene);
      applyFrame(state.frame);
      applyLevels(sample.speaking ? 'examiner' : state.studentSpeaking ? 'student' : '', state.mic);
    },
  }));

  /* Scenes nobody ticks for: joining the call (the loop starts once the
     interview has), and the end (the loop stops with the connection). */
  useEffect(() => {
    if (signals.phase !== 'connecting' && !signals.finished) return;
    const scene = pickScene(signals, false, false);
    applyScene(scene);
    applyFrame(SCENE_FRAME[scene]);
    applyLevels('', 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals.phase, signals.finished]);

  /* The artwork arrived or broke: show the current frame in the new mode. */
  useEffect(() => {
    const frame = shown.current.frame;
    shown.current.frame = null;
    if (frame) applyFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useArt]);

  useEffect(
    () => () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    [],
  );

  /* The call opens with the stage at the top of the screen, just below the
     workspace header (which stays on screen), wherever the page placed the
     examiner: the trainer page mounts it further down, and the menu it
     replaces was long. So on a phone the stage, the caption and the buttons
     are all in view. Once, when the stage first appears. */
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const el = rootRef.current;
      if (!el) return;
      const headerBottom = Math.max(0, document.querySelector('.ws-header')?.getBoundingClientRect().bottom ?? 0);
      const top = el.getBoundingClientRect().top - headerBottom;
      if (top >= 0 && top < 120) return;
      window.scrollTo({ top: Math.max(0, window.scrollY + top - 8), behavior: reducedRef.current ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const cueOn = Boolean(cueCard);

  return (
    <div className="es-stage" data-cue={cueOn ? 'on' : 'off'} data-mic={micPaused ? 'paused' : 'on'}>
      <div ref={rootRef} className="es-card" data-scene="" data-breathe="off" data-speaker="" data-art={useArt ? 'drawn' : 'placeholder'}>
        <div className="es-head">
          <span className="es-chip">{label}</span>
          {elapsed && <span className="es-clock">{elapsed}</span>}
        </div>

        <div className="es-call">
          {/* Her tile. Decorative: the status line says the same thing. */}
          <div className="es-tile es-tile-her" aria-hidden="true">
            <div className="es-breathe">
              <div ref={figureRef} className="es-figure" onAnimationEnd={() => figureRef.current?.classList.remove('is-nod')}>
                {useArt ? (
                  EXAMINER_FRAMES.map((frame) => (
                    <img
                      key={frame}
                      ref={(el) => {
                        imgRefs.current[frame] = el;
                      }}
                      className="es-frame"
                      src={withBase(EXAMINER_ART[frame])}
                      alt=""
                      width={768}
                      height={768}
                      decoding="async"
                      draggable={false}
                      onError={() => setArtBroken(true)}
                    />
                  ))
                ) : (
                  <PlaceholderPortrait svgRef={svgRef} />
                )}
              </div>
            </div>
            <span className="es-nameplate">
              <strong>{EXAMINER_NAME}</strong>
              <span>{t('Examiner')}</span>
            </span>
          </div>

          {/* The student's side: their tile, and in Part 2 the cue card she
              hands across. */}
          <div className="es-side">
            <div className="es-tile es-tile-you" aria-hidden="true">
              <span className="es-you-avatar">
                {talkRing && (
                  <svg className="es-ring" viewBox="0 0 64 64">
                    <circle className="es-ring-track" cx="32" cy="32" r="30" />
                    <circle className="es-ring-fill" cx="32" cy="32" r="30" pathLength={100} />
                  </svg>
                )}
                <svg className="es-you-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="12" cy="9" r="3.6" />
                  <path d="M5.5 19.5c1.2-3.3 3.6-5 6.5-5s5.3 1.7 6.5 5" />
                </svg>
              </span>
              <span className="es-you-text">
                <strong>{t('You')}</strong>
                <span className="es-mic">
                  <span className="es-bars">
                    {Array.from({ length: BARS }, (_, i) => (
                      <span
                        key={i}
                        ref={(el) => {
                          barRefs.current[i] = el;
                        }}
                      />
                    ))}
                  </span>
                  {micPaused ? t('Microphone paused while you prepare') : t('Microphone on')}
                </span>
              </span>
            </div>

            {cueOn && (
              <div className="es-cue">
                {cueCard}
                {typeof prepProgress === 'number' && (
                  <span className="es-pencil" aria-hidden="true">
                    <span style={{ transform: `scaleX(${Math.max(0, Math.min(1, prepProgress))})` }} />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="es-under">
          <p className="es-status" data-tone={statusTone}>
            <span className="es-dot" aria-hidden="true" />
            <span>{status}</span>
          </p>
          {/* Screen readers hear the scene change once, politely; the visible
              line above can carry a ticking countdown, so it is not the live
              region itself. */}
          <p className="sr-only" role="status" aria-live="polite">
            {announce}
          </p>
          {note}
          {caption}
          {controls && <div className="es-controls">{controls}</div>}
        </div>
      </div>
    </div>
  );
});

export default ExaminerStage;

/* The placeholder: a plain line portrait, until the artwork arrives. One
   drawing; the frame on the root decides which eyes, which mouth, which
   props and which slight pose show (examiner-stage.css). Same square framing
   as the artwork: head and shoulders, the desk edge at the bottom. */
function PlaceholderPortrait({ svgRef }: { svgRef: RefObject<SVGSVGElement | null> }) {
  return (
    <svg ref={svgRef} className="es-ph" viewBox="0 0 320 320" data-frame="listen" focusable="false">
      <g className="ph-figure">
        {/* hair behind the face */}
        <path
          className="ph-hair"
          d="M114 182 C100 138 104 82 160 78 C216 82 220 138 206 182 C199 189 191 184 192 170 L128 170 C129 184 121 189 114 182 Z"
        />
        {/* jacket, blouse, neck */}
        <path className="ph-skin" d="M147 168 L147 200 L173 200 L173 168 Z" />
        <path className="ph-top" d="M128 206 L160 252 L192 206 Z" />
        <path
          className="ph-jacket"
          d="M54 300 C56 250 86 220 130 206 L160 252 L190 206 C234 220 264 250 266 300 Z"
        />
        <path className="ph-line ph-thin" d="M130 206 L146 258 L160 252 M190 206 L174 258 L160 252" />
        <g className="ph-head">
          <ellipse className="ph-skin" cx="160" cy="132" rx="38" ry="46" />
          <path
            className="ph-hair"
            d="M122 124 C124 98 142 86 162 86 C184 86 198 100 199 124 C188 108 172 103 157 104 C142 106 131 113 122 124 Z"
          />
          <path className="ph-line ph-thin" d="M137 121 q8 -5 16 -1 M167 120 q8 -4 16 1" />
          <g className="ph-eyes-open">
            <path className="ph-line ph-thin" d="M138 131 q7 -5 14 0 M168 131 q7 -5 14 0" />
            <circle className="ph-ink" cx="145" cy="134" r="3.3" />
            <circle className="ph-ink" cx="175" cy="134" r="3.3" />
          </g>
          <g className="ph-eyes-closed">
            <path className="ph-line ph-thin" d="M138 134 q7 4 14 0 M168 134 q7 4 14 0" />
          </g>
          <g className="ph-eyes-down">
            <path className="ph-line ph-thin" d="M138 135 q7 -3 14 0 M168 135 q7 -3 14 0" />
            <circle className="ph-ink" cx="145" cy="138.5" r="2.3" />
            <circle className="ph-ink" cx="175" cy="138.5" r="2.3" />
          </g>
          <path className="ph-line ph-thin" d="M160 138 q-4 13 1 16 q3 1 5 -1" />
          <path className="ph-line ph-m0" d="M150 163 q10 4 20 0" />
          <ellipse className="ph-mouth ph-m1" cx="160" cy="163" rx="6.5" ry="2.4" />
          <ellipse className="ph-mouth ph-m2" cx="160" cy="163.5" rx="7.5" ry="4.4" />
          <ellipse className="ph-mouth ph-m3" cx="160" cy="164.5" rx="8" ry="6.6" />
        </g>
      </g>
      {/* the desk edge, her notepad and pen, the folder */}
      <rect className="ph-desk" x="0" y="286" width="320" height="34" />
      <path className="ph-line ph-desk-edge" d="M0 286 H320" />
      <g className="ph-pad">
        <rect className="ph-paper" x="196" y="291" width="72" height="18" rx="2" />
        <path className="ph-line ph-faint" d="M204 297 H258 M204 303 H246" />
      </g>
      <path className="ph-line ph-pen" d="M178 304 L214 294" />
      <g className="ph-hand">
        <path className="ph-line ph-pen-held" d="M211 303 L236 285" />
        <path className="ph-skin" d="M216 300 c3 -7 12 -9 19 -5 c5 3 5 8 1 10 c-6 3 -15 2 -20 -5 z" />
      </g>
      <g className="ph-folder">
        <rect x="102" y="290" width="116" height="20" rx="3" />
        <path className="ph-line ph-thin" d="M112 290 v-4 h26 v4" />
      </g>
    </svg>
  );
}
