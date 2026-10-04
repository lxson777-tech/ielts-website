/* The live examiner's connection report (src/lib/speaking/live/
   connection-report.ts): WebRTC stats and reply timing, numbers only. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ConnectionMonitor,
  REPORT_VERSION,
  SLOW_REPLY_MS,
  deviceKind,
  networkType,
  sanitizeConnectionReport,
  sendConnectionReport,
  type StatLike,
} from '../src/lib/speaking/live/connection-report.ts';
import { OpenAiLiveSession, type LiveEventTransport, type LiveServerEvent } from '../src/lib/speaking/live/openai-session.ts';

/** A stats source answering a scripted list of samples, one per call. */
function scriptedStats(samples: StatLike[][]) {
  let call = 0;
  return {
    calls: () => call,
    source: {
      async getStats() {
        const stats = samples[Math.min(call, samples.length - 1)] ?? [];
        call += 1;
        return { forEach: (cb: (s: StatLike) => void) => stats.forEach(cb) };
      },
    },
  };
}

function manualTimer() {
  let fn: (() => void) | null = null;
  let cleared = false;
  return {
    setInterval: (f: () => void) => {
      fn = f;
      return 7;
    },
    clearInterval: () => {
      cleared = true;
    },
    tick: () => fn?.(),
    cleared: () => cleared,
  };
}

function sample(rtt: number, jitter: number, lost: number, received: number, levels: { in: number; out: number }, remoteLost = 0): StatLike[] {
  return [
    { type: 'candidate-pair', state: 'succeeded', nominated: true, currentRoundTripTime: rtt },
    { type: 'inbound-rtp', kind: 'audio', jitter, packetsLost: lost, packetsReceived: received, audioLevel: levels.in },
    { type: 'remote-inbound-rtp', kind: 'audio', packetsLost: remoteLost, roundTripTime: rtt },
    { type: 'media-source', kind: 'audio', audioLevel: levels.out },
    { type: 'inbound-rtp', kind: 'video', jitter: 9, packetsLost: 999 },
  ];
}

test('stats sampled every interval become round-trip, jitter, loss and audio presence', async () => {
  let clock = 0;
  const timer = manualTimer();
  const stats = scriptedStats([
    sample(0.1, 0.01, 0, 100, { in: 0, out: 0.2 }),
    sample(0.3, 0.03, 5, 495, { in: 0.4, out: 0 }, 7),
  ]);
  const monitor = new ConnectionMonitor(stats.source, {
    mode: 'full',
    device: 'phone',
    network: '3g',
    now: () => clock,
    setInterval: timer.setInterval,
    clearInterval: timer.clearInterval,
  });
  monitor.start();
  await monitor.sample();
  clock += 5000;
  await monitor.sample();
  clock = 61_400;
  const report = monitor.finish('closed')!;
  assert.ok(timer.cleared(), 'the sampling timer stops');
  assert.deepEqual(report, {
    v: REPORT_VERSION,
    mode: 'full',
    end: 'closed',
    seconds: 61,
    device: 'phone',
    network: '3g',
    samples: 2,
    rttMs: { avg: 200, max: 300 },
    jitterMs: { avg: 20, max: 30 },
    lostIn: 5,
    lossInPct: 1,
    lostOut: 7,
    audioIn: true,
    audioOut: true,
    replies: 0,
    slowReplies: 0,
    longestWaitMs: null,
  });
  assert.equal(monitor.finish('closed'), null, 'a report is finished once');
});

test('the examiner reply wait is measured on the session timeline, and only waits over three seconds count as slow', () => {
  const monitor = new ConnectionMonitor(null, { mode: 'part1', device: 'desktop', network: null, now: () => 0 });
  monitor.start();
  const said = (type: 'in' | 'out', start: number, end: number, delta = 'words the student said') =>
    monitor.observe({
      type: type === 'in' ? 'session.input_transcript.delta' : 'session.output_transcript.delta',
      start_ms: start,
      end_ms: end,
      delta,
    } as never);
  said('out', 0, 3000); // examiner asks
  said('in', 3500, 6000); // student answers
  said('in', 6000, 9000);
  said('out', 9800, 12000); // 800 ms later: fine
  said('out', 12000, 15000); // the same reply going on: not a new wait
  said('in', 15500, 20000);
  said('out', 24500, 27000); // 4.5 s: slow
  said('in', 26000, 26500); // a fragment from while the examiner was talking, arriving late
  said('out', 27000, 29000); // continuation, not a 500 ms "reply"
  said('in', 29500, 31000);
  said('out', 30500, 32000); // talking over the student: not a reply time
  const report = monitor.finish('closed')!;
  assert.equal(report.replies, 2);
  assert.equal(report.slowReplies, 1);
  assert.equal(report.longestWaitMs, 4500);
  assert.ok(4500 > SLOW_REPLY_MS);
  assert.doesNotMatch(JSON.stringify(report), /words|student said/, 'no word of the transcript is kept');
});

test('without timeline fields the wait falls back to when the events arrived', () => {
  let clock = 1000;
  const monitor = new ConnectionMonitor(null, { mode: 'part3', device: 'desktop', network: null, now: () => clock });
  monitor.start();
  monitor.observe({ type: 'session.input_transcript.delta' });
  clock += 3600;
  monitor.observe({ type: 'session.output_transcript.delta' });
  const report = monitor.finish('connection-lost')!;
  assert.equal(report.replies, 1);
  assert.equal(report.slowReplies, 1);
  assert.equal(report.longestWaitMs, 3600);
  assert.equal(report.end, 'connection-lost');
});

test('a browser whose stats call throws still reports, and the monitor never throws', async () => {
  const monitor = new ConnectionMonitor(
    {
      async getStats() {
        throw new Error('not supported');
      },
    },
    { mode: 'part2', device: 'desktop', network: null, now: () => 0, setInterval: () => 1, clearInterval: () => {} },
  );
  monitor.start();
  await monitor.sample();
  monitor.observe(null as never);
  const report = monitor.finish('page-hidden')!;
  assert.equal(report.samples, 0);
  assert.equal(report.rttMs, null);
  assert.equal(report.end, 'page-hidden');
});

test('the sanitiser keeps known fields only, clamps numbers and refuses what is not a report', () => {
  const clean = sanitizeConnectionReport({
    v: REPORT_VERSION,
    mode: 'full',
    end: 'made-up',
    seconds: 1e9,
    device: 'tablet',
    network: '5g',
    samples: -4,
    rttMs: { avg: 120.6, max: 1e9 },
    jitterMs: 'fast',
    lostIn: 3,
    lossInPct: 250,
    lostOut: null,
    audioIn: 'yes',
    audioOut: true,
    replies: 5,
    slowReplies: 1,
    longestWaitMs: 4200,
    transcript: 'private words',
    email: 'someone@example.com',
  })!;
  assert.equal(clean.end, 'other');
  assert.equal(clean.seconds, 4 * 3600);
  assert.equal(clean.device, 'desktop');
  assert.equal(clean.network, null);
  assert.equal(clean.samples, 0);
  assert.deepEqual(clean.rttMs, { avg: 121, max: 60_000 });
  assert.equal(clean.jitterMs, null);
  assert.equal(clean.lossInPct, 100);
  assert.equal(clean.audioIn, false);
  assert.equal('transcript' in clean, false);
  assert.equal('email' in clean, false);
  assert.equal(sanitizeConnectionReport({ v: 2, mode: 'full' }), null);
  assert.equal(sanitizeConnectionReport({ v: REPORT_VERSION, mode: 'karaoke' }), null);
  assert.equal(sanitizeConnectionReport([1, 2]), null);
});

test('device and network come from the screen width and navigator.connection only', () => {
  assert.equal(deviceKind(390), 'phone');
  assert.equal(deviceKind(1440), 'desktop');
  assert.equal(deviceKind(undefined), 'desktop');
  assert.equal(networkType({ connection: { effectiveType: '4g' } }), '4g');
  assert.equal(networkType({ connection: { effectiveType: 'wifi' } }), null);
  assert.equal(networkType({}), null);
  assert.equal(networkType(null), null);
});

test('the report is sent as a beacon, falls back to a keepalive fetch, and never throws', async () => {
  const report = sanitizeConnectionReport({ v: REPORT_VERSION, mode: 'part1' })!;
  const beacons: { url: string; data: unknown }[] = [];
  assert.equal(
    sendConnectionReport('https://live.example/report', report, {
      sendBeacon: (url, data) => {
        beacons.push({ url, data });
        return true;
      },
    }),
    true,
  );
  assert.equal(beacons[0]!.url, 'https://live.example/report');
  const sent = beacons[0]!.data as Blob;
  assert.equal(sent.type, 'text/plain;charset=utf-8');
  assert.deepEqual(JSON.parse(await sent.text()), report);

  const fetches: RequestInit[] = [];
  assert.equal(
    sendConnectionReport('https://live.example/report', report, {
      sendBeacon: () => false,
      fetch: (async (_url: unknown, init?: RequestInit) => {
        fetches.push(init!);
        return new Response(null, { status: 204 });
      }) as typeof fetch,
    }),
    true,
  );
  assert.equal(fetches[0]!.keepalive, true);
  assert.equal(fetches[0]!.method, 'POST');

  assert.equal(
    sendConnectionReport('https://live.example/report', report, {
      sendBeacon: () => {
        throw new Error('blocked');
      },
      fetch: (() => {
        throw new Error('offline');
      }) as never,
    }),
    false,
  );
  assert.equal(sendConnectionReport('https://live.example/report', null, {}), false);
});

class FakeTransport implements LiveEventTransport {
  private onEvent: ((ev: LiveServerEvent) => void) | null = null;
  send(): void {}
  setHandlers(h: { onEvent(ev: LiveServerEvent): void; onClose(): void }): void {
    this.onEvent = h.onEvent;
  }
  close(): void {}
  emit(ev: LiveServerEvent): void {
    this.onEvent?.(ev);
  }
}

test('the live session hands every event to its observer, and a failing observer changes nothing', async () => {
  const transport = new FakeTransport();
  const seen: string[] = [];
  const turns: number[] = [];
  const starting = OpenAiLiveSession.start(
    transport,
    { onTranscript: (t) => turns.push(t.length), onClosed() {}, onError() {} },
    {
      observer: (ev) => {
        seen.push(ev.type);
        throw new Error('observer bug');
      },
    },
  );
  transport.emit({ type: 'session.started', session: { id: 'live_1' } });
  await starting;
  transport.emit({ type: 'session.input_transcript.delta', delta: 'hello', start_ms: 0, end_ms: 400 });
  transport.emit({ type: 'session.output_transcript.delta', delta: 'hi', start_ms: 900, end_ms: 1200 });
  assert.deepEqual(seen, ['session.input_transcript.delta', 'session.output_transcript.delta']);
  assert.deepEqual(turns, [1, 2], 'the transcript is still built');
});
