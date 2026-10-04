/* The orb: the circle on the live interview screen that shows who is
   speaking, her or you.

   Alex, 4 October 2026: he tested the live site, liked this circle, and
   wants to keep it while Ms. Taylor (./ExaminerStage.tsx) waits behind the
   switch in src/lib/speaking/live/examiner-look.ts. This is the same circle
   (violet while she speaks, a green ring that follows your voice, amber while
   you prepare, ripples while she talks), rebuilt as its own component with
   three changes:

   - It is the main thing on screen: bigger, with the Part 2 cue card and the
     notes box INSIDE the stage card (beside the circle on a wide screen,
     below the status line on a phone). Nothing is sticky, so nothing can
     slide over the circle.
   - The coach and the "Stuck? Ideas" hints are one small "Tips" control that
     opens them on demand (a drawer), instead of a column beside the stage.
   - The glow is light. No blur filters and nothing large is repainted while
     it moves: the halo is a masked conic gradient that only rotates, and the
     three audio-driven layers only change transform and opacity.

   It takes the same props as ExaminerStage and the same imperative `tick()`,
   so LiveExaminer's one animation loop drives either look the same way. This
   component never re-renders for audio: tick() writes straight to the three
   layers. The written status line carries the meaning; the circle only
   illustrates it (it is aria-hidden), and the same sentence is announced once
   per scene change through a polite live region. */

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { useT } from '../../lib/i18n/react';
import { orbFrame, orbMode, smoothLevel, type OrbMode } from '../../lib/speaking/live/examiner-look';
import type { LevelSample, StageSignals } from '../../lib/speaking/live/examiner-stage';
import '../../styles/examiner-stage.css'; // the shared focus-screen rules, caption, cue card and buttons
import '../../styles/orb-stage.css';

export interface OrbStageHandle {
  /** One animation frame of audio levels. Cheap: three style writes. */
  tick(sample: LevelSample): void;
}

export interface OrbStageProps {
  signals: StageSignals;
  /** "Part 1 · Interview" and so on. */
  label: string;
  /** The interview clock, "4:05". */
  elapsed?: string;
  /** The written status line. */
  status: ReactNode;
  /** The same message as plain text without any countdown, read out once
      per scene change by screen readers (a polite live region). */
  announce?: string;
  /** Who has the turn. */
  statusTone: 'examiner' | 'student' | 'quiet';
  /** A line under the status (connecting). */
  note?: ReactNode;
  caption?: ReactNode;
  /** The cue card (with the notes box), shown beside or below the circle. */
  cueCard?: ReactNode;
  /** 0 to 1 through the preparation minute; null when not preparing. */
  prepProgress?: number | null;
  /** The student's microphone is paused (the preparation minute). */
  micPaused?: boolean;
  controls?: ReactNode;
  /** The coach and hints. When given, a small "Tips" control opens them. */
  tips?: ReactNode;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

const OrbStage = forwardRef<OrbStageHandle, OrbStageProps>(function OrbStage(props, ref) {
  const { signals, label, elapsed, status, announce, statusTone, note, caption, cueCard, prepProgress, micPaused, controls, tips } = props;
  const { t } = useT();
  const mode: OrbMode = orbMode({
    statusTone,
    stage: signals.stage,
    connecting: signals.phase === 'connecting',
    over: signals.closing,
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const coreRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const micRingRef = useRef<HTMLDivElement | null>(null);
  const smooth = useRef({ examiner: 0, student: 0 });
  const reducedRef = useRef(prefersReducedMotion());

  /* Reduced motion: the circle holds still (the CSS gives each state a fixed
     look that still shows whose turn it is). If the setting flips while the
     page is open, clear what the loop wrote so the CSS takes over. */
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      reducedRef.current = query.matches;
      if (query.matches) {
        for (const el of [coreRef.current, glowRef.current, micRingRef.current]) {
          if (el) {
            el.style.transform = '';
            el.style.opacity = '';
          }
        }
      }
    };
    onChange();
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  useImperativeHandle(ref, () => ({
    tick(sample: LevelSample) {
      if (reducedRef.current) return;
      const s = smooth.current;
      s.examiner = smoothLevel(s.examiner, sample.output, 0.22);
      s.student = smoothLevel(s.student, sample.mic, 0.25);
      const f = orbFrame(s.examiner, s.student);
      if (coreRef.current) coreRef.current.style.transform = `scale(${f.coreScale})`;
      if (glowRef.current) {
        glowRef.current.style.opacity = String(f.glowOpacity);
        glowRef.current.style.transform = `scale(${f.glowScale})`;
      }
      if (micRingRef.current) {
        micRingRef.current.style.opacity = String(f.micOpacity);
        micRingRef.current.style.transform = `scale(${f.micScale})`;
      }
    },
  }));

  /* The call opens with the stage at the top of the screen, just below the
     workspace header, wherever the page placed the examiner (the trainer
     page mounts it further down). Once, when the stage first appears. */
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

  /* The Tips drawer. Stays mounted while closed (so the coach's ticked
     boxes survive), is closed with Escape, and hands focus back to its
     button. */
  const [tipsOpen, setTipsOpen] = useState(false);
  const tipsId = useId();
  const tipsButtonRef = useRef<HTMLButtonElement | null>(null);
  const tipsCloseRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const openedOnce = useRef(false);

  /* On a wide screen the drawer opens at the right edge of the window, just
     under the Tips button, so it never hides the button, the clock or the
     circle (which sits in the middle of the card). On a phone it is a sheet
     from the bottom edge (the CSS), and nothing is set here. */
  function placeDrawer() {
    const drawer = drawerRef.current;
    const button = tipsButtonRef.current;
    if (!drawer || !button) return;
    if (!window.matchMedia('(min-width: 721px)').matches) {
      drawer.style.top = '';
      drawer.style.right = '';
      drawer.style.maxHeight = '';
      return;
    }
    const b = button.getBoundingClientRect();
    const top = Math.min(Math.max(b.bottom + 10, 96), window.innerHeight - 220);
    drawer.style.top = `${top}px`;
    drawer.style.right = '16px';
    drawer.style.maxHeight = `${Math.max(240, window.innerHeight - top - 96)}px`;
  }

  useEffect(() => {
    if (!tipsOpen) {
      if (openedOnce.current) tipsButtonRef.current?.focus({ preventScroll: true });
      return;
    }
    openedOnce.current = true;
    placeDrawer();
    tipsCloseRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTipsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', placeDrawer);
    window.addEventListener('scroll', placeDrawer, { passive: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', placeDrawer);
      window.removeEventListener('scroll', placeDrawer);
    };
  }, [tipsOpen]);

  const cueOn = Boolean(cueCard);

  return (
    <>
      <div className="es-stage ob-stage" data-cue={cueOn ? 'on' : 'off'} data-mic={micPaused ? 'paused' : 'on'}>
        <div ref={rootRef} className="ob-card" data-mode={mode}>
          <div className="ob-head">
            <span className="ob-chip">{label}</span>
            <span className="ob-head-end">
              {elapsed && <span className="ob-clock">{elapsed}</span>}
              {tips && (
                <button
                  ref={tipsButtonRef}
                  type="button"
                  className="ob-tips-btn"
                  aria-expanded={tipsOpen}
                  aria-controls={tipsId}
                  aria-label={t('Tips')}
                  onClick={() => setTipsOpen((v) => !v)}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 18h6M10 21h4" />
                    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
                  </svg>
                  <span className="ob-tips-label">{t('Tips')}</span>
                </button>
              )}
            </span>
          </div>

          <div className="ob-body">
            <div className="ob-main">
              <div className="ob-orbwrap">
                <div className="ob-orb" aria-hidden="true">
                  {/* slow-spinning aurora halo (a masked gradient: no blur) */}
                  <div className="ob-aura" />
                  {/* a second, brighter one that only shows while she speaks */}
                  <div className="ob-aura ob-aura-hot" />
                  {/* idle breathing ring */}
                  <div className="ob-breathe" />
                  {/* voice ripples while the examiner speaks */}
                  {mode === 'speaking' && (
                    <>
                      <span className="ob-ripple" />
                      <span className="ob-ripple" style={{ animationDelay: '0.6s' }} />
                      <span className="ob-ripple" style={{ animationDelay: '1.2s' }} />
                    </>
                  )}
                  {/* the student's voice: a green ring that follows the mic */}
                  <div ref={micRingRef} className="ob-micring" />
                  {/* audio-reactive glow and the glassy core */}
                  <div ref={glowRef} className="ob-glow" />
                  <div className="ob-float">
                    <div ref={coreRef} className="ob-core">
                      <div className="ob-core-icon" key={mode}>
                        {mode === 'speaking' ? <IconSpeaker /> : mode === 'prep' ? <IconPencil /> : <IconMic />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* The turn indicator: colour, dot and wording all follow the turn. */}
              <p className="ob-status" data-tone={statusTone} key={mode}>
                <span className="ob-dot" aria-hidden="true" />
                {status}
              </p>
              {/* Screen readers hear the scene change once, politely; the
                  visible line can carry a ticking countdown, so it is not the
                  live region itself. */}
              <p className="sr-only" role="status" aria-live="polite">
                {announce}
              </p>
              {note}
              {caption}
            </div>

            {cueOn && (
              <div className="ob-cuewrap">
                <div className="es-cue">
                  {cueCard}
                  {typeof prepProgress === 'number' && (
                    <span className="es-pencil" aria-hidden="true">
                      <span style={{ transform: `scaleX(${Math.max(0, Math.min(1, prepProgress))})` }} />
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {controls && <div className="es-controls ob-controls">{controls}</div>}
        </div>
      </div>

      {/* The drawer sits outside .ob-stage on purpose: that element is a
          layout container, which would otherwise pin a fixed drawer inside
          it. */}
      {tips && (
        <aside ref={drawerRef} id={tipsId} className="ob-drawer" hidden={!tipsOpen} aria-label={t('Tips')}>
          <div className="ob-drawer-head">
            <strong>{t('Tips')}</strong>
            <button ref={tipsCloseRef} type="button" className="ob-drawer-close" onClick={() => setTipsOpen(false)} aria-label={t('Close tips')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="ob-drawer-body">{tips}</div>
        </aside>
      )}
    </>
  );
});

export default OrbStage;

function IconMic() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3.5" />
    </svg>
  );
}

function IconSpeaker() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5.5 6.5 9H3v6h3.5L11 18.5z" fill="currentColor" stroke="none" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M17.5 7a7 7 0 0 1 0 10" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3.5 20.5 7 8.5 19l-4.5 1.5L5.5 16z" />
    </svg>
  );
}
