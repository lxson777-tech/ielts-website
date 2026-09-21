/* The audio control a Listening focused exercise plays its segment on
 * (WP18b/WP19, 2026-09-22).
 *
 * Two very different modes, the same house rule TestPlayer's ListeningAudio
 * already keeps for a full paper: trainers coach with every aid, checks are
 * bare exam conditions.
 *
 *   guided  play, pause, a scrubber that only ever covers this exercise's
 *           own segment, and a replay button. Scrubbing or replaying after
 *           playback has actually started is reported through onSeek /
 *           onReplayFromStart, so the caller can mark the affected items
 *           assisted; starting playback for the first time is not. The
 *           parent can also ask this player to jump to and play a shorter
 *           window inside the segment (playWindow, exposed by ref), for the
 *           "hear that again" control next to one item's own evidence.
 *   check   one play button, then a read-only status line. No pause, no
 *           seek, no replay, no playWindow: nothing here can call onSeek or
 *           onReplayFromStart, because there is no control that could.
 *           Playback stops itself at the end of the segment.
 *
 * The recording is never copied or re-encoded: this is a plain <audio>
 * element pointed at the same file the full paper and the drill stream
 * from, seeked to the segment's own start and stopped at its own end.
 *
 * This file has no opinion about WHAT the segment is or why it is that
 * size; that judgement lives in ./focused-exercise.ts (groupAudioWindow,
 * locateEvidenceWindow), where it can be tested with no browser.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import type { AudioSegmentWindow } from './focused-exercise';

interface Props {
  src: string;
  segment: AudioSegmentWindow;
  mode: 'guided' | 'check';
  disabled?: boolean;
  /** Fired the first time playback has actually started AND the student
      then moves the scrubber, with the second (relative to the shared
      recording, not the segment) they moved to. Never fired in check mode. */
  onSeek?: (atSeconds: number) => void;
  /** Fired when the student presses Replay, after playback has actually
      started at least once. Never fired in check mode. */
  onReplayFromStart?: () => void;
}

/** What the "hear that again" button next to one item calls. Guided mode
    only: the player jumps to `window.startSeconds` and stops itself at
    `window.endSeconds`, then returns to the exercise's own segment bound
    for ordinary play/pause/scrub. Never counted as a seek: the student
    asked for exactly this, so there is nothing to infer. */
export interface AudioSegmentPlayerHandle {
  playWindow: (window: AudioSegmentWindow) => void;
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type PlaybackState = 'ready' | 'playing' | 'paused' | 'finished';

function AudioSegmentPlayer(
  { src, segment, mode, disabled, onSeek, onReplayFromStart }: Props,
  ref: React.Ref<AudioSegmentPlayerHandle>,
) {
  const { t } = useT();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [started, setStarted] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('ready');
  const [currentTime, setCurrentTime] = useState(segment.startSeconds);
  const [retry, setRetry] = useState(0);
  /* Set the first time playback actually begins, so the programmatic seek
     onLoadedMetadata does to line the audio up on its own start second is
     never itself read as the student seeking. Same guard TestPlayer's
     ListeningAudio uses for the same reason. */
  const hasPlayedRef = useRef(false);
  /* Where playback should stop itself right now: the exercise's own
     segment end, or a shorter window's end while playWindow is active. */
  const stopAtRef = useRef(segment.endSeconds);
  const duration = Math.max(0, segment.endSeconds - segment.startSeconds);

  /* A new exercise (or, in principle, a narrower segment for the same one)
     is a fresh player, not a continuation of the last one's position. */
  useEffect(() => {
    setStatus('loading');
    setStarted(false);
    setPlaybackState('ready');
    setCurrentTime(segment.startSeconds);
    hasPlayedRef.current = false;
    stopAtRef.current = segment.endSeconds;
    setRetry((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, segment.startSeconds, segment.endSeconds]);

  function handleLoadedMetadata() {
    setStatus('ready');
    const el = audioRef.current;
    if (el) el.currentTime = segment.startSeconds;
  }

  function handleTimeUpdate() {
    const el = audioRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    if (el.currentTime >= stopAtRef.current) {
      el.pause();
      setPlaybackState('finished');
    }
  }

  function handlePlay() {
    hasPlayedRef.current = true;
    setPlaybackState('playing');
  }

  function handlePause() {
    setPlaybackState((current) => (current === 'finished' ? current : 'paused'));
  }

  function start() {
    setStarted(true);
    stopAtRef.current = segment.endSeconds;
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = segment.startSeconds;
    void el.play();
  }

  function togglePlay() {
    const el = audioRef.current;
    if (!el || status !== 'ready') return;
    if (playbackState === 'playing') {
      el.pause();
      return;
    }
    stopAtRef.current = segment.endSeconds;
    if (el.currentTime >= segment.endSeconds || el.currentTime < segment.startSeconds) {
      el.currentTime = segment.startSeconds;
    }
    void el.play();
  }

  function replayFromStart() {
    const el = audioRef.current;
    if (!el) return;
    stopAtRef.current = segment.endSeconds;
    el.currentTime = segment.startSeconds;
    setCurrentTime(segment.startSeconds);
    void el.play();
    if (hasPlayedRef.current) onReplayFromStart?.();
  }

  function seekToOffset(offsetSeconds: number) {
    const el = audioRef.current;
    const target = segment.startSeconds + offsetSeconds;
    stopAtRef.current = segment.endSeconds;
    if (el) el.currentTime = target;
    setCurrentTime(target);
    setPlaybackState((current) => (current === 'finished' ? 'paused' : current));
    if (hasPlayedRef.current) onSeek?.(target);
  }

  useImperativeHandle(
    ref,
    () => ({
      playWindow(window: AudioSegmentWindow) {
        const el = audioRef.current;
        if (!el || status !== 'ready' || mode !== 'guided') return;
        stopAtRef.current = window.endSeconds;
        el.currentTime = window.startSeconds;
        setCurrentTime(window.startSeconds);
        void el.play();
      },
    }),
    [status, mode],
  );

  const positionInSegment = Math.min(duration, Math.max(0, currentTime - segment.startSeconds));
  const positionText = clock(positionInSegment);
  const durationText = clock(duration);
  const statusText =
    status === 'error'
      ? t('Recording unavailable.')
      : playbackState === 'finished'
        ? t('Recording finished, {position} of {duration}.', { position: positionText, duration: durationText })
        : playbackState === 'playing'
          ? t('Playing, {position} of {duration}.', { position: positionText, duration: durationText })
          : started
            ? t('Paused, {position} of {duration}.', { position: positionText, duration: durationText })
            : t('Ready to play, {duration} in total.', { duration: durationText });

  const audioEl = (
    <audio
      key={retry}
      ref={audioRef}
      preload="metadata"
      src={src}
      className="focused-audio-source"
      aria-hidden="true"
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      onPlay={handlePlay}
      onPause={handlePause}
      onError={() => setStatus('error')}
    />
  );

  if (mode === 'check') {
    return (
      <div className="focused-audio focused-audio-check" data-testid="focused-audio-player">
        {audioEl}
        {!started ? (
          <button
            type="button"
            className="focused-audio-start"
            onClick={start}
            disabled={disabled || status !== 'ready'}
          >
            {t('Play the recording')}
          </button>
        ) : null}
        <p className="focused-audio-status" role="status" aria-live="polite">
          {status === 'loading' && !started ? t('Loading recording...') : statusText}
        </p>
      </div>
    );
  }

  return (
    <div className="focused-audio focused-audio-guided" data-testid="focused-audio-player">
      {audioEl}
      <div className="focused-audio-controls">
        <button
          type="button"
          className="focused-audio-toggle"
          onClick={togglePlay}
          disabled={disabled || status !== 'ready'}
          aria-label={playbackState === 'playing' ? t('Pause') : t('Play')}
        >
          <span aria-hidden="true">{playbackState === 'playing' ? '⏸' : '▶'}</span>
        </button>
        <input
          type="range"
          className="focused-audio-scrubber"
          min={0}
          max={Math.max(0.1, duration)}
          step={0.1}
          value={positionInSegment}
          disabled={disabled || status !== 'ready'}
          aria-label={t('Position in the recording')}
          onChange={(event) => seekToOffset(Number(event.target.value))}
        />
        <button
          type="button"
          className="focused-audio-replay"
          onClick={replayFromStart}
          disabled={disabled || status !== 'ready'}
        >
          {t('Replay')}
        </button>
      </div>
      <p className="focused-audio-status" role="status" aria-live="polite">
        {status === 'loading' ? t('Loading recording...') : statusText}
      </p>
    </div>
  );
}

export default forwardRef(AudioSegmentPlayer);
