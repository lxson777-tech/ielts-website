/* The live examiner's connection report (4 October 2026).

   A student said the examiner was laggy. The voice goes browser to OpenAI
   over WebRTC and never touches our Worker, so nothing on our side could
   say whether the delay was the student's network, OpenAI's reply time or
   neither. This file collects, during an OpenAI live session, a handful of
   NUMBERS about the connection, and sends one small summary to the
   live-examiner Worker's POST /report when the session ends or the page is
   hidden. The Worker logs it as one structured line and uses it for nothing
   else.

   WHAT IS COLLECTED (and nothing more):
   - WebRTC statistics from RTCPeerConnection.getStats(), sampled every five
     seconds: round-trip time, jitter, packets lost, and whether any audio
     level was seen coming in (the examiner) and going out (the microphone).
     A level is a loudness number, never the sound itself;
   - how long the session lasted;
   - how often the examiner took longer than three seconds to start
     replying after the student stopped, and the longest such wait. This is
     measured from the timing fields of the transcript events the session
     already receives (start_ms / end_ms on the session timeline); the words
     in those events are never read here;
   - phone or desktop, from the screen width only;
   - the network type when the browser offers one (navigator.connection).

   NO audio, NO words, NO names, NO session or account ids. The same
   sanitiser (sanitizeConnectionReport) runs in the Worker, so anything else
   a modified browser sends is dropped before it could be logged.

   Everything here fails silently: a browser without getStats, a stats call
   that throws, a beacon that cannot be sent. The student never sees it.

   Shared by the browser (src/lib/speaking/live/link.ts) and the Worker
   (workers/live-examiner), so no browser global is touched at module load. */

export const REPORT_VERSION = 1;
/** A reply that starts later than this after the student stopped is slow. */
export const SLOW_REPLY_MS = 3000;
export const SAMPLE_INTERVAL_MS = 5000;
/** The Worker refuses anything larger; a real report is about 400 bytes. */
export const MAX_REPORT_BYTES = 4096;

export const END_REASONS = ['closed', 'connection-lost', 'page-hidden', 'setup-failed', 'error', 'other'] as const;
export type EndReason = (typeof END_REASONS)[number];
const MODES = ['full', 'part1', 'part2', 'part3'] as const;
const NETWORK_TYPES = ['slow-2g', '2g', '3g', '4g'] as const;
export type NetworkType = (typeof NETWORK_TYPES)[number];
export type DeviceKind = 'phone' | 'desktop';

export interface Spread {
  avg: number;
  max: number;
}

export interface ConnectionReport {
  v: typeof REPORT_VERSION;
  mode: (typeof MODES)[number];
  end: EndReason;
  /** Session length in whole seconds. */
  seconds: number;
  device: DeviceKind;
  network: NetworkType | null;
  /** Stats samples taken. 0 means getStats never answered. */
  samples: number;
  rttMs: Spread | null;
  jitterMs: Spread | null;
  /** Examiner audio packets lost on the way in, and their share in percent. */
  lostIn: number | null;
  lossInPct: number | null;
  /** Microphone packets the far side reports as lost. */
  lostOut: number | null;
  /** Whether any examiner / microphone audio level was seen at all. */
  audioIn: boolean;
  audioOut: boolean;
  /** Examiner replies measured, how many started later than SLOW_REPLY_MS,
      and the longest wait. */
  replies: number;
  slowReplies: number;
  longestWaitMs: number | null;
}

/** Phone or desktop, from the screen width only (under 768 CSS pixels is a
    phone, the site's own phone-dock breakpoint). */
export function deviceKind(screenWidth: number | null | undefined): DeviceKind {
  return typeof screenWidth === 'number' && screenWidth > 0 && screenWidth < 768 ? 'phone' : 'desktop';
}

/** navigator.connection.effectiveType when the browser offers it. */
export function networkType(nav: unknown): NetworkType | null {
  const connection = (nav as { connection?: { effectiveType?: unknown } } | null | undefined)?.connection;
  const value = connection?.effectiveType;
  return typeof value === 'string' && (NETWORK_TYPES as readonly string[]).includes(value) ? (value as NetworkType) : null;
}

export interface StatLike {
  type?: unknown;
  kind?: unknown;
  mediaType?: unknown;
  [key: string]: unknown;
}

/** The one part of RTCPeerConnection this file uses. */
export interface StatsSource {
  getStats(): Promise<{ forEach(cb: (stat: StatLike) => void): void }>;
}

/** The two timing fields of a data channel event; `type` picks the side.
    The event's text (`delta`) is deliberately not part of this shape. */
export interface TimedEvent {
  type: string;
  start_ms?: unknown;
  end_ms?: unknown;
}

export interface MonitorOptions {
  mode: string;
  device: DeviceKind;
  network: NetworkType | null;
  now?: () => number;
  intervalMs?: number;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const isAudio = (s: StatLike) => s.kind === 'audio' || s.mediaType === 'audio';
/** Above this an audio level counts as "some sound": a level is 0 to 1. */
const LEVEL_FLOOR = 0.001;

class Accumulator {
  private total = 0;
  private count = 0;
  private highest = 0;
  add(value: number): void {
    this.total += value;
    this.count += 1;
    if (value > this.highest) this.highest = value;
  }
  spread(): Spread | null {
    return this.count ? { avg: Math.round(this.total / this.count), max: Math.round(this.highest) } : null;
  }
}

export class ConnectionMonitor {
  private readonly stats: StatsSource | null;
  private readonly opts: MonitorOptions;
  private readonly now: () => number;
  private timer: unknown = null;
  private startedAt: number | null = null;
  private finished = false;
  private sampling = false;

  private samples = 0;
  private rtt = new Accumulator();
  private jitter = new Accumulator();
  private lostIn: number | null = null;
  private receivedIn: number | null = null;
  private lostOut: number | null = null;
  private audioIn = false;
  private audioOut = false;

  /* Reply timing. The student's last fragment end (session timeline, and
     when that is missing the wall clock it arrived at), and whether a reply
     is awaited; the end of the examiner's last fragment, so a late-arriving
     student fragment from before the examiner spoke does not start a wait. */
  private candidateEnd: number | null = null;
  private candidateWall: number | null = null;
  private examinerEnd: number | null = null;
  private examinerWall: number | null = null;
  private awaiting = false;
  private replies = 0;
  private slowReplies = 0;
  private longestWait: number | null = null;

  constructor(stats: StatsSource | null, opts: MonitorOptions) {
    this.stats = stats;
    this.opts = opts;
    this.now = opts.now ?? Date.now;
  }

  start(): void {
    if (this.startedAt !== null || this.finished) return;
    this.startedAt = this.now();
    if (!this.stats) return;
    const every = this.opts.setInterval ?? ((fn: () => void, ms: number) => setInterval(fn, ms));
    try {
      this.timer = every(() => {
        void this.sample();
      }, this.opts.intervalMs ?? SAMPLE_INTERVAL_MS);
    } catch {
      this.timer = null;
    }
  }

  /** Feeds one data channel event. Only its type and timing are read. */
  observe(ev: TimedEvent): void {
    if (this.finished) return;
    try {
      const wall = this.now();
      const start = num(ev.start_ms);
      const end = num(ev.end_ms) ?? start;
      if (ev.type === 'session.input_transcript.delta') {
        const spokeAfterExaminer =
          end !== null && this.examinerEnd !== null ? end > this.examinerEnd : this.examinerWall === null || wall >= this.examinerWall;
        if (end !== null && (this.candidateEnd === null || end >= this.candidateEnd)) this.candidateEnd = end;
        this.candidateWall = wall;
        if (spokeAfterExaminer) this.awaiting = true;
        return;
      }
      if (ev.type === 'session.output_transcript.delta') {
        if (this.awaiting) {
          const wait =
            start !== null && this.candidateEnd !== null
              ? start - this.candidateEnd
              : this.candidateWall !== null
                ? wall - this.candidateWall
                : null;
          /* A negative wait is the examiner talking over the student; an
             absurd one is a clock problem. Neither is a reply time. */
          if (wait !== null && wait >= 0 && wait < 10 * 60_000) {
            this.replies += 1;
            if (wait > SLOW_REPLY_MS) this.slowReplies += 1;
            if (this.longestWait === null || wait > this.longestWait) this.longestWait = wait;
          }
          this.awaiting = false;
        }
        if (end !== null && (this.examinerEnd === null || end > this.examinerEnd)) this.examinerEnd = end;
        this.examinerWall = wall;
      }
    } catch {
      /* never let a report break the session */
    }
  }

  /** Takes one stats sample. Exposed for tests; the timer calls it. */
  async sample(): Promise<void> {
    if (!this.stats || this.finished || this.sampling) return;
    this.sampling = true;
    try {
      const report = await this.stats.getStats();
      if (this.finished) return;
      /* An object, not two lets: assignments inside the forEach callback
         are then visible to the type checker after it. */
      const seen: { rtt: number | null; remoteRtt: number | null } = { rtt: null, remoteRtt: null };
      report.forEach((stat) => {
        if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && (stat.nominated === true || stat.selected === true)) {
          seen.rtt = num(stat.currentRoundTripTime) ?? seen.rtt;
        } else if (stat.type === 'inbound-rtp' && isAudio(stat)) {
          const jitter = num(stat.jitter);
          if (jitter !== null) this.jitter.add(jitter * 1000);
          this.lostIn = num(stat.packetsLost) ?? this.lostIn;
          this.receivedIn = num(stat.packetsReceived) ?? this.receivedIn;
          if ((num(stat.audioLevel) ?? 0) > LEVEL_FLOOR || (num(stat.totalAudioEnergy) ?? 0) > 0) this.audioIn = true;
        } else if (stat.type === 'remote-inbound-rtp' && isAudio(stat)) {
          this.lostOut = num(stat.packetsLost) ?? this.lostOut;
          seen.remoteRtt = num(stat.roundTripTime) ?? seen.remoteRtt;
        } else if (stat.type === 'media-source' && isAudio(stat)) {
          if ((num(stat.audioLevel) ?? 0) > LEVEL_FLOOR || (num(stat.totalAudioEnergy) ?? 0) > 0) this.audioOut = true;
        }
        /* outbound-rtp is not read: packets keep flowing during silence, so
           they say nothing about whether the microphone heard anything. */
      });
      const rtt = seen.rtt ?? seen.remoteRtt;
      if (rtt !== null) this.rtt.add(rtt * 1000);
      this.samples += 1;
    } catch {
      /* a stats call that throws is a sample not taken */
    } finally {
      this.sampling = false;
    }
  }

  /** Ends the report and returns it, once; null on every later call. */
  finish(end: EndReason): ConnectionReport | null {
    if (this.finished) return null;
    this.finished = true;
    if (this.timer !== null) {
      const stop = this.opts.clearInterval ?? ((handle: unknown) => clearInterval(handle as ReturnType<typeof setInterval>));
      try {
        stop(this.timer);
      } catch {
        /* already stopped */
      }
      this.timer = null;
    }
    const startedAt = this.startedAt ?? this.now();
    const lossTotal = this.lostIn !== null && this.receivedIn !== null ? this.lostIn + this.receivedIn : 0;
    return sanitizeConnectionReport({
      v: REPORT_VERSION,
      mode: this.opts.mode,
      end,
      seconds: Math.round((this.now() - startedAt) / 1000),
      device: this.opts.device,
      network: this.opts.network,
      samples: this.samples,
      rttMs: this.rtt.spread(),
      jitterMs: this.jitter.spread(),
      lostIn: this.lostIn,
      lossInPct: lossTotal > 0 && this.lostIn !== null ? Math.round((this.lostIn / lossTotal) * 1000) / 10 : null,
      lostOut: this.lostOut,
      audioIn: this.audioIn,
      audioOut: this.audioOut,
      replies: this.replies,
      slowReplies: this.slowReplies,
      longestWaitMs: this.longestWait === null ? null : Math.round(this.longestWait),
    });
  }
}

const clamp = (v: unknown, max: number): number | null => {
  const n = num(v);
  if (n === null || n < 0) return null;
  return Math.min(Math.round(n * 10) / 10, max);
};
const count = (v: unknown, max: number): number => {
  const n = num(v);
  return n === null || n < 0 ? 0 : Math.min(Math.round(n), max);
};
function spread(v: unknown, max: number): Spread | null {
  if (typeof v !== 'object' || v === null) return null;
  const avg = clamp((v as Spread).avg, max);
  const top = clamp((v as Spread).max, max);
  return avg === null || top === null ? null : { avg: Math.round(avg), max: Math.round(top) };
}
function pick<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/** Rebuilds a report from known fields only, every number clamped, every
    string one of a fixed list. Anything else is dropped. Null when the
    object is not a report at all. Used by the browser before sending and
    by the Worker before logging, so the Worker never logs what it was sent,
    only this. */
export function sanitizeConnectionReport(raw: unknown): ConnectionReport | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== REPORT_VERSION) return null;
  const mode = pick(r.mode, MODES);
  if (!mode) return null;
  return {
    v: REPORT_VERSION,
    mode,
    end: pick(r.end, END_REASONS) ?? 'other',
    seconds: count(r.seconds, 4 * 3600),
    device: r.device === 'phone' ? 'phone' : 'desktop',
    network: pick(r.network, NETWORK_TYPES),
    samples: count(r.samples, 5000),
    rttMs: spread(r.rttMs, 60_000),
    jitterMs: spread(r.jitterMs, 60_000),
    lostIn: clamp(r.lostIn, 10_000_000),
    lossInPct: clamp(r.lossInPct, 100),
    lostOut: clamp(r.lostOut, 10_000_000),
    audioIn: r.audioIn === true,
    audioOut: r.audioOut === true,
    replies: count(r.replies, 5000),
    slowReplies: count(r.slowReplies, 5000),
    longestWaitMs: clamp(r.longestWaitMs, 600_000),
  };
}

export interface ReportSender {
  sendBeacon?: (url: string, data: Blob | string) => boolean;
  fetch?: typeof fetch;
}

/** Sends the report without waiting and without ever throwing. A beacon
    survives the page closing; a plain-text body keeps it a "simple"
    request, so no CORS preflight is needed. Falls back to a keepalive
    fetch. Resolves to whether something was handed to the browser. */
export function sendConnectionReport(endpoint: string, report: ConnectionReport | null, sender: ReportSender): boolean {
  if (!report || !endpoint) return false;
  let body: string;
  try {
    body = JSON.stringify(report);
  } catch {
    return false;
  }
  if (body.length > MAX_REPORT_BYTES) return false;
  try {
    if (sender.sendBeacon) {
      const data = typeof Blob === 'function' ? new Blob([body], { type: 'text/plain;charset=UTF-8' }) : body;
      if (sender.sendBeacon(endpoint, data)) return true;
    }
  } catch {
    /* fall through to fetch */
  }
  try {
    if (sender.fetch) {
      void sender
        .fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } })
        .catch(() => undefined);
      return true;
    }
  } catch {
    /* nothing else to try */
  }
  return false;
}
