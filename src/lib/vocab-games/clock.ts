/* A game clock that can pause: Match's running time and the sprint's
   minute. Pure, with the time handed in, so a test can wind it by hand.
   The sprint pauses it while the tab is hidden, so its minute never runs
   where the student cannot see it. */

export interface GameClock {
  startedAt: number;
  /** Set while paused. */
  pausedAt: number | null;
  /** Milliseconds spent paused before the current pause. */
  pausedTotal: number;
}

export function startClock(now: number): GameClock {
  return { startedAt: now, pausedAt: null, pausedTotal: 0 };
}

export function pauseClock(clock: GameClock, now: number): GameClock {
  return clock.pausedAt === null ? { ...clock, pausedAt: now } : clock;
}

export function resumeClock(clock: GameClock, now: number): GameClock {
  if (clock.pausedAt === null) return clock;
  return { ...clock, pausedAt: null, pausedTotal: clock.pausedTotal + (now - clock.pausedAt) };
}

export function isPaused(clock: GameClock): boolean {
  return clock.pausedAt !== null;
}

/** Milliseconds of play so far, never counting a pause. */
export function elapsedMs(clock: GameClock, now: number): number {
  const until = clock.pausedAt ?? now;
  return Math.max(0, until - clock.startedAt - clock.pausedTotal);
}

/** "0:42" or "1:05.3" style, for Match's clock (tenths only when asked). */
export function formatClock(ms: number, tenths = false): string {
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const base = `${minutes}:${String(seconds).padStart(2, '0')}`;
  return tenths ? `${base}.${totalTenths % 10}` : base;
}
