/* The live examiner's session setup asks before it opens a paid voice
 * session (finding R2D-01 of the Codex inspection of 1701b97, the part inside
 * the connection setup).
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/live-start-cancel.test.ts
 *
 * WHY THIS FILE EXISTS
 * The examiner's start (src/components/LiveExaminer.tsx) asks after each of
 * its own waits whether it may go on (guardSessionStart, proven in
 * tests/delayed-grade-owner.test.ts section 8). One window was out of its
 * sight: inside the setup, the connection prepares itself for up to ten
 * seconds AFTER the sign-in token has been read and then sends the request
 * that creates the paid voice session; on the Gemini rollback an ephemeral
 * token is requested and then the voice socket is opened. A switch or an
 * unmount in there still let the request (or the socket) out. The setup now
 * takes the examiner's own check (src/lib/speaking/live/start-check.ts) and
 * asks it immediately before that request and that socket. This file drives
 * the setup through exactly those windows.
 *
 * WHAT IS SIMULATED, AND WHAT IS NOT
 * Simulated: everything the setup talks to. The peer connection, its data
 * channel, the Gemini socket, the audio contexts and every network request
 * are this file's own stand-ins, put on globalThis for one test at a time and
 * taken away after it. No browser, microphone, Worker or voice service is
 * involved, nothing is sent anywhere and nothing is paid for. The setup code
 * itself (connectWebRtc, ExaminerSession.connect, openExaminerLink) and the
 * examiner's guard (guardSessionStart, openSpeakingAttempt, the owner) are
 * the shipping code. Every id, token, address and student is SYNTHETIC.
 *
 * AND THE HANDLE (finding R2E-01, Codex inspection of c4a7793), section 5
 * below. The check above came too late once the session request had been
 * ANSWERED: the answer was applied (so the examiner's audio track arrived
 * and was played) before anything asked again, and the twenty-second wait
 * for the session to start could not be reached by the screen at all. The
 * setup now also takes the screen's StartHandle, asks immediately before the
 * answer is applied and inside every callback that could start something,
 * and ends at the Worker every session it created and did not hand over.
 * Section 5 drives SUCCESSFUL delayed answers and handshakes, not only
 * refusals: the answer is applied by the stand-in peer exactly as a real
 * one would be, the examiner's track arrives, and playback starts (a stand-in
 * audio element whose play() the test holds), so each let-go below happens
 * at a point where, before the fix, the connection was up and its audio was
 * playing.
 */

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* A browser store, in a few lines (the owner module reads it)          */
/* ------------------------------------------------------------------ */

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const storage = memoryStorage();
(globalThis as Record<string, unknown>).window = {
  get localStorage() {
    return storage;
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
};

const storeOwner = await import('../src/lib/store-owner.ts');
const speaking = await import('../src/components/speaking-attempt-owner.ts');
const link = await import('../src/lib/speaking/live/link.ts');
const webrtc = await import('../src/lib/speaking/live/openai-session.ts');
const gemini = await import('../src/lib/speaking/live/session.ts');
const check = await import('../src/lib/speaking/live/start-check.ts');

/* Every test has a time limit. Node's test runner waits for ever on a test
   whose promise never settles, and that is exactly what a setup that sent
   its request anyway looks like here (nobody answers it): without a limit a
   regression would hang the whole suite instead of failing by name. */
const LIMIT_MS = 10_000;

const A = storeOwner.userOwner('SYNTHETIC-STUDENT-A');
const B = storeOwner.userOwner('SYNTHETIC-STUDENT-B');

/* ------------------------------------------------------------------ */
/* The setup's surroundings, all this file's own                        */
/* ------------------------------------------------------------------ */

type Listener = (event?: unknown) => void;

class Listeners {
  map = new Map<string, Listener[]>();
  add(type: string, fn: Listener): void {
    const list = this.map.get(type) ?? [];
    list.push(fn);
    this.map.set(type, list);
  }
  remove(type: string, fn: Listener): void {
    this.map.set(
      type,
      (this.map.get(type) ?? []).filter((each) => each !== fn),
    );
  }
  fire(type: string, event?: unknown): void {
    for (const fn of [...(this.map.get(type) ?? [])]) fn(event);
  }
}

/** The data channel the setup opens on the peer connection. */
class FakeChannel {
  readyState = 'connecting';
  closes = 0;
  sent: string[] = [];
  listeners = new Listeners();
  addEventListener(type: string, fn: Listener): void {
    this.listeners.add(type, fn);
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.closes += 1;
    this.readyState = 'closed';
  }
  /** OpenAI's side of the channel, played by this file. */
  deliver(event: Record<string, unknown>): void {
    this.readyState = 'open';
    this.listeners.fire('message', { data: JSON.stringify(event) });
  }
  /** The channel closing under the setup (R2E-01). */
  fireClose(): void {
    this.readyState = 'closed';
    this.listeners.fire('close');
  }
}

/** The examiner's audio track as it arrives on the connection. */
function remoteTrack() {
  const track = {
    kind: 'audio',
    readyState: 'live' as 'live' | 'ended',
    stop() {
      track.readyState = 'ended';
    },
  };
  return track;
}
type RemoteTrack = ReturnType<typeof remoteTrack>;

/** RTCPeerConnection. Its connection preparation (ICE gathering) is
    finished by the test, by hand, at the moment the test chooses. */
class FakePeer {
  static made: FakePeer[] = [];
  iceGatheringState = 'new';
  connectionState = 'new';
  localDescription: { type: string; sdp: string } | null = null;
  remoteDescription: { type: string; sdp: string } | null = null;
  closes = 0;
  tracksAdded: unknown[] = [];
  channels: FakeChannel[] = [];
  listeners = new Listeners();
  gatheringStarted: Promise<void>;
  markGathering: () => void = () => {};
  constructor() {
    FakePeer.made.push(this);
    this.gatheringStarted = new Promise<void>((resolve) => {
      this.markGathering = resolve;
    });
  }
  addEventListener(type: string, fn: Listener): void {
    this.listeners.add(type, fn);
  }
  removeEventListener(type: string, fn: Listener): void {
    this.listeners.remove(type, fn);
  }
  addTrack(track: unknown): void {
    this.tracksAdded.push(track);
  }
  createDataChannel(): FakeChannel {
    const channel = new FakeChannel();
    this.channels.push(channel);
    return channel;
  }
  async createOffer(): Promise<{ type: string; sdp: string }> {
    return { type: 'offer', sdp: 'SYNTHETIC-offer-sdp' };
  }
  async setLocalDescription(description: { type: string; sdp: string }): Promise<void> {
    this.localDescription = description;
    this.iceGatheringState = 'gathering';
    this.markGathering();
  }
  /** The connection has finished preparing itself. */
  finishGathering(): void {
    this.iceGatheringState = 'complete';
    this.listeners.fire('icegatheringstatechange');
  }
  /** R2E-01: how often an answer was applied, the examiner's tracks that
      arrived, whether the next answer brings one (a browser fires the track
      callback from inside setRemoteDescription, before it resolves), and a
      hook the test runs inside that call, before the track arrives. */
  remoteCalls = 0;
  remoteTracks: RemoteTrack[] = [];
  trackOnAnswer = false;
  whileApplying: (() => void) | null = null;
  async setRemoteDescription(description: { type: string; sdp: string }): Promise<void> {
    this.remoteCalls += 1;
    this.remoteDescription = description;
    this.whileApplying?.();
    if (this.trackOnAnswer) this.deliverTrack();
  }
  /** The examiner's audio track arriving on the connection. */
  deliverTrack(): RemoteTrack {
    const track = remoteTrack();
    this.remoteTracks.push(track);
    this.listeners.fire('track', { track });
    return track;
  }
  close(): void {
    this.closes += 1;
    this.connectionState = 'closed';
  }
}

/** The Gemini socket. It never connects anywhere. */
class FakeSocket {
  static OPEN = 1;
  static made: FakeSocket[] = [];
  readyState = 0;
  url: string;
  sent: string[] = [];
  closes = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => unknown) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string; wasClean: boolean }) => void) | null = null;
  constructor(url: string) {
    this.url = url;
    FakeSocket.made.push(this);
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.closes += 1;
    this.readyState = 3;
  }
  /** Gemini's side of the socket, played by this file. */
  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: Record<string, unknown>): void {
    void this.onmessage?.({ data: JSON.stringify(message) });
  }
}

/** Just enough of an audio node for the examiner's audio pieces. */
function fakeNode() {
  return {
    fftSize: 0,
    frequencyBinCount: 16,
    gain: { value: 1 },
    port: { onmessage: null as unknown },
    connect: (next: unknown) => next,
    disconnect() {},
    getByteTimeDomainData() {},
    getByteFrequencyData() {},
  };
}

class FakeAudioContext {
  static made: FakeAudioContext[] = [];
  state = 'running';
  sampleRate: number;
  currentTime = 0;
  destination = {};
  audioWorklet = { addModule: async () => {} };
  constructor(options?: { sampleRate?: number }) {
    this.sampleRate = options?.sampleRate ?? 48000;
    FakeAudioContext.made.push(this);
  }
  async resume(): Promise<void> {}
  async close(): Promise<void> {
    this.state = 'closed';
  }
  createAnalyser() {
    return fakeNode();
  }
  createGain() {
    return fakeNode();
  }
  createMediaStreamSource() {
    return fakeNode();
  }
}

/** The hidden audio element the paid path plays the examiner through
    (RemoteAudioOutput). Its play() can be HELD, as a browser holds it until
    the stream has data: that is the "playback initialisation pending"
    window. pause() rejects a held play(), as a browser's does. */
class FakeAudio {
  static made: FakeAudio[] = [];
  static hold = false;
  autoplay = false;
  srcObject: unknown = null;
  paused = true;
  plays = 0;
  waiting: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
  constructor() {
    FakeAudio.made.push(this);
  }
  play(): Promise<void> {
    this.plays += 1;
    this.paused = false;
    if (!FakeAudio.hold) return Promise.resolve();
    return new Promise<void>((resolve, reject) => this.waiting.push({ resolve, reject }));
  }
  pause(): void {
    this.paused = true;
    const waiting = this.waiting.splice(0);
    waiting.forEach((each) => each.reject(new Error('SYNTHETIC AbortError: paused while starting')));
  }
  /** The stream has data: a held play() goes on. */
  letPlay(): void {
    const waiting = this.waiting.splice(0);
    waiting.forEach((each) => each.resolve());
  }
  /** Playing now, from the page's point of view. */
  playing(): boolean {
    return !this.paused && this.srcObject !== null;
  }
}

class FakeWorkletNode {
  port = { onmessage: null as unknown };
  connect(next: unknown) {
    return next;
  }
  disconnect() {}
}

/** The student's microphone: the component's own, which the setup must
    send on the peer connection but never stop itself. */
function syntheticMicrophone() {
  const tracks = [0].map(() => {
    const track = {
      kind: 'audio',
      enabled: true,
      readyState: 'live' as 'live' | 'ended',
      stop() {
        track.readyState = 'ended';
      },
    };
    return track;
  });
  return {
    tracks,
    getAudioTracks: () => tracks,
    getTracks: () => tracks,
  };
}

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
}

/** Every request the setup makes, answered by the test. */
function network() {
  const calls: Call[] = [];
  const waiting: Array<{ call: Call; answer: (response: Response) => void }> = [];
  const fetchStandIn = (url: string | URL, init?: RequestInit): Promise<Response> => {
    const call: Call = {
      url: String(url),
      method: init?.method ?? 'GET',
      headers: (init?.headers as Record<string, string>) ?? {},
      body: typeof init?.body === 'string' ? init.body : undefined,
    };
    calls.push(call);
    return new Promise<Response>((answer) => waiting.push({ call, answer }));
  };
  return {
    calls,
    fetch: fetchStandIn,
    /** Answer the oldest request still waiting. */
    answer(status: number, body: unknown): Call {
      const next = waiting.shift();
      assert.ok(next, 'no request is waiting to be answered');
      next.answer(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
      return next.call;
    },
    waitingCount: () => waiting.length,
  };
}
type Network = ReturnType<typeof network>;

const ENDPOINT = 'https://SYNTHETIC-examiner.invalid';
const SESSION_REQUEST = `${ENDPOINT}/`;
const END_REQUEST = `${ENDPOINT}/end`;
const SESSION_ANSWER = {
  provider: 'openai',
  session: { id: 'SYNTHETIC-session-id' },
  transport: { type: 'webrtc', sdp: 'SYNTHETIC-answer-sdp' },
  model: 'SYNTHETIC-no-model',
};
const PLAN = { mode: 'full', part1TopicIds: ['SYNTHETIC-topic'], cueCardId: 'SYNTHETIC-card' } as unknown as Parameters<
  typeof webrtc.connectWebRtc
>[0]['plan'];

const originals = {
  fetch: globalThis.fetch,
  RTCPeerConnection: (globalThis as Record<string, unknown>).RTCPeerConnection,
  WebSocket: (globalThis as Record<string, unknown>).WebSocket,
  AudioContext: (globalThis as Record<string, unknown>).AudioContext,
  AudioWorkletNode: (globalThis as Record<string, unknown>).AudioWorkletNode,
  MediaStream: (globalThis as Record<string, unknown>).MediaStream,
  Audio: (globalThis as Record<string, unknown>).Audio,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
};

/* The playback's level poll is a setInterval: every one still running is
   counted, so a playback left behind by a let-go start is measured, and
   cleared after each test so it can never keep the runner alive. */
const liveIntervals = new Set<unknown>();

/** Put this file's stand-ins in place for one test. */
function surroundings(): Network {
  const net = network();
  FakePeer.made = [];
  FakeSocket.made = [];
  FakeAudioContext.made = [];
  const g = globalThis as Record<string, unknown>;
  g.fetch = net.fetch;
  g.RTCPeerConnection = FakePeer;
  g.WebSocket = FakeSocket;
  g.AudioContext = FakeAudioContext;
  g.AudioWorkletNode = FakeWorkletNode;
  g.MediaStream = class {
    tracks: Array<{ stop(): void }>;
    constructor(tracks: Array<{ stop(): void }>) {
      this.tracks = tracks;
    }
    getTracks() {
      return this.tracks;
    }
  };
  FakeAudio.made = [];
  FakeAudio.hold = false;
  g.Audio = FakeAudio;
  liveIntervals.clear();
  g.setInterval = (run: () => void, ms?: number) => {
    const handle = originals.setInterval(run, ms);
    liveIntervals.add(handle);
    return handle;
  };
  g.clearInterval = (handle: ReturnType<typeof setInterval> | undefined) => {
    liveIntervals.delete(handle);
    originals.clearInterval(handle);
  };
  return net;
}

afterEach(() => {
  for (const handle of liveIntervals) originals.clearInterval(handle as ReturnType<typeof setInterval>);
  liveIntervals.clear();
  const g = globalThis as Record<string, unknown>;
  for (const [name, value] of Object.entries(originals)) {
    if (value === undefined) delete g[name];
    else g[name] = value;
  }
});

/** Let the setup run until `ready` holds (it only ever waits on this
    file's own stand-ins, so a handful of turns is plenty). */
async function until(ready: () => boolean, what: string): Promise<void> {
  for (let turn = 0; turn < 200 && !ready(); turn += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.ok(ready(), `the setup never reached: ${what}`);
}

/** A question that says yes until `refuse()` is called, and counts how
    often it was asked. */
function question() {
  let allowed = true;
  const asked = { count: 0 };
  return {
    asked,
    ask: () => {
      asked.count += 1;
      return allowed;
    },
    refuse: () => {
      allowed = false;
    },
  };
}

function sessionRequests(net: Network): Call[] {
  return net.calls.filter((call) => call.url === SESSION_REQUEST && call.method === 'POST');
}

const noCallbacks = {
  onTranscript() {},
  onClosed() {},
  onError() {},
};

/* ------------------------------------------------------------------ */
/* 1. The paid path's connection setup (connectWebRtc)                  */
/* ------------------------------------------------------------------ */

test('R2D-01 setup: a switch while the connection prepares itself sends no session request; the peer connection and its data channel are closed', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const may = question();
  const microphone = syntheticMicrophone();
  const connecting = webrtc.connectWebRtc({
    endpoint: SESSION_REQUEST,
    stream: microphone as unknown as MediaStream,
    plan: PLAN,
    accessToken: 'SYNTHETIC-token-of-A',
    onRemoteStream() {},
    mayContinue: may.ask,
  });
  const outcome = connecting.then(
    () => 'opened',
    (error: unknown) => error,
  );
  const peer = FakePeer.made[0];
  assert.ok(peer, 'no peer connection was made');
  await peer.gatheringStarted;
  assert.equal(peer.tracksAdded.length, 1, 'the microphone track was not put on the connection');

  /* The account changes (or the screen goes) while the connection is still
     preparing itself. Then the preparation finishes. */
  may.refuse();
  peer.finishGathering();

  const result = await outcome;
  assert.ok(check.isLiveStartCancelled(result), `the setup did not report itself cancelled: ${String(result)}`);
  assert.equal(sessionRequests(net).length, 0, 'the request that creates a paid voice session was sent');
  assert.equal(net.calls.length, 0, 'the setup sent something');
  assert.equal(peer.closes, 1, 'the peer connection was left open');
  assert.equal(peer.channels[0]?.closes, 1, 'the data channel was left open');
  assert.equal(peer.remoteDescription, null);
  assert.equal(may.asked.count, 2, 'the setup asked at the wrong points (before anything, and before the request)');
  assert.equal(microphone.tracks[0]?.readyState, 'live', "the setup stopped the component's own microphone");
});

test('R2D-01 setup: a no before anything is made opens no peer connection at all', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  await assert.rejects(
    webrtc.connectWebRtc({
      endpoint: SESSION_REQUEST,
      stream: syntheticMicrophone() as unknown as MediaStream,
      plan: PLAN,
      accessToken: 'SYNTHETIC-token-of-A',
      onRemoteStream() {},
      mayContinue: () => false,
    }),
    (error: unknown) => check.isLiveStartCancelled(error),
  );
  assert.equal(FakePeer.made.length, 0, 'a peer connection was made for a start that had been let go');
  assert.equal(net.calls.length, 0);
});

test('R2D-01 setup: a yes goes on exactly as before: one session request with the offer, the plan and the token, and the answer applied', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const may = question();
  const connecting = webrtc.connectWebRtc({
    endpoint: SESSION_REQUEST,
    stream: syntheticMicrophone() as unknown as MediaStream,
    plan: PLAN,
    accessToken: 'SYNTHETIC-token-of-A',
    onRemoteStream() {},
    mayContinue: may.ask,
  });
  const peer = FakePeer.made[0]!;
  await peer.gatheringStarted;
  peer.finishGathering();
  await until(() => net.waitingCount() === 1, 'the session request');
  const request = net.answer(201, SESSION_ANSWER);
  const opened = await connecting;

  assert.equal(request.url, SESSION_REQUEST);
  assert.equal(request.method, 'POST');
  assert.equal(request.headers.Authorization, 'Bearer SYNTHETIC-token-of-A');
  assert.deepEqual(JSON.parse(request.body ?? '{}'), { sdp: 'SYNTHETIC-offer-sdp', plan: PLAN });
  assert.deepEqual(peer.remoteDescription, { type: 'answer', sdp: 'SYNTHETIC-answer-sdp' });
  assert.equal(opened.sessionId, 'SYNTHETIC-session-id');
  assert.equal(peer.closes, 0, 'a start that may go on had its connection closed');
  /* Before anything, before the request (R2D-01), and immediately before
     and after the answer is applied (R2E-01). */
  assert.equal(may.asked.count, 4);
  opened.transport.close();
  assert.equal(peer.closes, 1);
});

test('R2D-01 setup: with no check given, the connection setup is unchanged', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const connecting = webrtc.connectWebRtc({
    endpoint: SESSION_REQUEST,
    stream: syntheticMicrophone() as unknown as MediaStream,
    plan: PLAN,
    accessToken: 'SYNTHETIC-token-of-A',
    onRemoteStream() {},
  });
  const peer = FakePeer.made[0]!;
  await peer.gatheringStarted;
  peer.finishGathering();
  await until(() => net.waitingCount() === 1, 'the session request');
  net.answer(201, SESSION_ANSWER);
  const opened = await connecting;
  assert.equal(opened.sessionId, 'SYNTHETIC-session-id');
  assert.equal(sessionRequests(net).length, 1);
});

/* ------------------------------------------------------------------ */
/* 2. The Gemini rollback (ExaminerSession.connect)                     */
/* ------------------------------------------------------------------ */

test('R2D-01 setup: on the Gemini rollback, a switch during the token request opens no socket', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const may = question();
  const connecting = gemini.ExaminerSession.connect(SESSION_REQUEST, 'SYNTHETIC instruction', { ...noCallbacks, onAudio() {}, onInterrupted() {} }, may.ask);
  const outcome = connecting.then(
    () => 'opened',
    (error: unknown) => error,
  );
  await until(() => net.waitingCount() === 1, 'the token request');
  assert.equal(net.calls[0]?.method, 'POST');

  may.refuse();
  net.answer(200, { token: 'SYNTHETIC-not-a-token', model: 'SYNTHETIC-no-model' });

  const result = await outcome;
  assert.ok(check.isLiveStartCancelled(result), `the setup did not report itself cancelled: ${String(result)}`);
  assert.equal(FakeSocket.made.length, 0, 'the voice socket was opened for a start that had been let go');
  assert.equal(may.asked.count, 2, 'the setup asked at the wrong points (before the token, and before the socket)');
});

test('R2D-01 setup: on the Gemini rollback, a no before the token request asks for nothing', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  await assert.rejects(
    gemini.ExaminerSession.connect(SESSION_REQUEST, 'SYNTHETIC instruction', { ...noCallbacks, onAudio() {}, onInterrupted() {} }, () => false),
    (error: unknown) => check.isLiveStartCancelled(error),
  );
  assert.equal(net.calls.length, 0, 'a token was requested for a start that had been let go');
  assert.equal(FakeSocket.made.length, 0);
});

test('R2D-01 setup: on the Gemini rollback, a yes opens the socket with the token and sends the setup, as before', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const may = question();
  const connecting = gemini.ExaminerSession.connect(SESSION_REQUEST, 'SYNTHETIC instruction', { ...noCallbacks, onAudio() {}, onInterrupted() {} }, may.ask);
  await until(() => net.waitingCount() === 1, 'the token request');
  net.answer(200, { token: 'SYNTHETIC-not-a-token', model: 'SYNTHETIC-no-model' });
  await until(() => FakeSocket.made.length === 1, 'the socket');
  const socket = FakeSocket.made[0]!;
  assert.match(socket.url, /access_token=SYNTHETIC-not-a-token/);
  socket.open();
  assert.equal(socket.sent.length, 1, 'the setup frame was not sent');
  assert.equal(JSON.parse(socket.sent[0]!).setup.model, 'models/SYNTHETIC-no-model');
  socket.receive({ setupComplete: {} });
  const session = await connecting;
  /* Before the token and before the socket (R2D-01), then in the open
     callback before the setup is sent and in the message callback before
     the setup is taken as complete (R2E-01). */
  assert.equal(may.asked.count, 4);
  session.close();
  assert.equal(socket.closes, 1);
});

/* ------------------------------------------------------------------ */
/* 3. Through the link, with the examiner's own guard passed in          */
/* ------------------------------------------------------------------ */

function liveConfig(provider: 'openai' | 'gemini') {
  return { provider, model: 'SYNTHETIC-no-model', backendModel: null, requiresSignIn: provider === 'openai' };
}

function linkOptions(provider: 'openai' | 'gemini', mayContinue: (() => boolean) | undefined, microphone = syntheticMicrophone()) {
  return {
    endpoint: ENDPOINT,
    config: liveConfig(provider),
    stream: microphone as unknown as MediaStream,
    plan: PLAN,
    instruction: 'SYNTHETIC instruction',
    mode: 'full' as const,
    accessToken: provider === 'openai' ? 'SYNTHETIC-token-of-A' : null,
    cb: noCallbacks,
    mayContinue,
  };
}

/** The mock embed's start, as the examiner makes it: numbered, bound to
    the student on the page, no attempt. */
function mockStart() {
  const generations = speaking.sessionGenerations();
  const binding = storeOwner.bindToCurrentOwner();
  const session = speaking.guardSessionStart({ generations, binding, attempt: null });
  return { generations, binding, session };
}

test('R2D-01 link: the examiner guard, passed through, stops the paid request when the mock is taken away while the connection prepares', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  storeOwner.setCurrentOwner(A);
  const { generations, binding, session } = mockStart();
  const microphone = syntheticMicrophone();

  /* Exactly the examiner's own call: the guard's step around the link,
     with the guard's own question handed in. */
  const opened = session.step(link.openExaminerLink(linkOptions('openai', () => session.live(), microphone)), speaking.closeConnection);
  await until(() => FakePeer.made.length === 1, 'the peer connection');
  const peer = FakePeer.made[0]!;
  await peer.gatheringStarted;

  /* MockExam takes the examiner away (the account changed on another tab). */
  storeOwner.setCurrentOwner(B);
  generations.unmount();
  binding.cancel();
  peer.finishGathering();

  assert.equal(await opened, null, 'the examiner would have been handed a link, or an error to show');
  assert.equal(sessionRequests(net).length, 0, 'the request that creates a paid voice session was sent');
  assert.equal(net.calls.length, 0);
  assert.equal(peer.closes, 1, 'the peer connection was left open');
  assert.equal(peer.channels[0]?.closes, 1, 'the data channel was left open');
  assert.ok(FakeAudioContext.made.length >= 1);
  assert.ok(
    FakeAudioContext.made.every((context) => context.state === 'closed'),
    "the link's audio pieces were left running",
  );
  /* The microphone itself is the component's: its dropStart releases it
     (tests/delayed-grade-owner.test.ts pins that), never the link. */
  assert.equal(microphone.tracks[0]?.readyState, 'live');
});

test('R2D-01 link: on the standalone page, an account switch while the connection prepares sends no paid request and ends the attempt', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  storeOwner.setCurrentOwner(A);
  const generations = speaking.sessionGenerations();
  const left: string[] = [];
  const attempt = speaking.openSpeakingAttempt({ onOwnerLeft: (stage) => left.push(stage) });
  const session = speaking.guardSessionStart({ generations, binding: attempt.binding, attempt });

  const opened = session.step(link.openExaminerLink(linkOptions('openai', () => session.live())), speaking.closeConnection);
  await until(() => FakePeer.made.length === 1, 'the peer connection');
  const peer = FakePeer.made[0]!;
  await peer.gatheringStarted;

  storeOwner.setCurrentOwner(B);
  peer.finishGathering();

  assert.equal(await opened, null);
  assert.equal(sessionRequests(net).length, 0, 'the request that creates a paid voice session was sent after the switch');
  assert.equal(peer.closes, 1);
  assert.deepEqual(left, ['open'], 'the attempt was not ended by the switch');
  assert.equal(attempt.stage(), 'suspended');
});

test('R2D-01 link: let go while the session request is out, the answered session is not used: the peer closes at once and the session is ended at the Worker', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const may = question();
  const opening = link.openExaminerLink(linkOptions('openai', may.ask));
  const outcome = opening.then(
    () => 'opened',
    (error: unknown) => error,
  );
  await until(() => FakePeer.made.length === 1, 'the peer connection');
  const peer = FakePeer.made[0]!;
  await peer.gatheringStarted;
  peer.finishGathering();
  await until(() => net.waitingCount() === 1, 'the session request');

  /* The request is out (so the session will exist, and its first seconds
     are billed whatever happens); the start is let go before it answers. */
  may.refuse();
  net.answer(201, SESSION_ANSWER);

  const result = await outcome;
  assert.ok(check.isLiveStartCancelled(result), `the link did not report itself cancelled: ${String(result)}`);
  assert.equal(sessionRequests(net).length, 1);
  assert.equal(peer.closes, 1, 'the peer connection was kept for a start that had been let go');
  const ends = net.calls.filter((call) => call.url === END_REQUEST);
  assert.equal(ends.length, 1, 'the session was not ended at the Worker');
  assert.deepEqual(JSON.parse(ends[0]!.body ?? '{}'), { sessionId: 'SYNTHETIC-session-id' });
  assert.equal(ends[0]!.headers.Authorization, 'Bearer SYNTHETIC-token-of-A');
  assert.deepEqual(peer.channels[0]?.sent, [], 'something was sent on the data channel');
  assert.ok(FakeAudioContext.made.every((context) => context.state === 'closed'));
});

test('R2D-01 link: a yes on the paid path opens the link exactly as before, and its close ends the session at the Worker', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const may = question();
  const opening = link.openExaminerLink(linkOptions('openai', may.ask));
  await until(() => FakePeer.made.length === 1, 'the peer connection');
  const peer = FakePeer.made[0]!;
  await peer.gatheringStarted;
  peer.finishGathering();
  await until(() => net.waitingCount() === 1, 'the session request');
  net.answer(201, SESSION_ANSWER);
  await until(() => peer.remoteDescription !== null, 'the answer applied');
  /* A few turns for the link to ask its question and start listening for
     the session to begin. */
  for (let turn = 0; turn < 5; turn += 1) await new Promise((resolve) => setImmediate(resolve));
  peer.channels[0]!.deliver({ type: 'session.started', session: { id: 'SYNTHETIC-session-id' } });
  const opened = await opening;
  assert.equal(opened.provider, 'openai');
  assert.equal(sessionRequests(net).length, 1);
  assert.equal(peer.closes, 0);
  /* The link before its meter; the connection before anything, before the
     request, and before and after the answer is applied; the link once the
     connection is handed over; the session start before it waits and before
     it accepts session.started (R2D-01 and R2E-01). */
  assert.equal(may.asked.count, 8, 'the paid path asks at the wrong points');

  const closing = opened.close();
  peer.channels[0]!.deliver({ type: 'session.closed', reason: 'close_requested' });
  await closing;
  assert.equal(net.calls.filter((call) => call.url === END_REQUEST).length, 1);
});

test('R2D-01 link: the examiner guard, passed through, stops the Gemini socket when the start is let go during the token request', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  storeOwner.setCurrentOwner(A);
  const { generations, binding, session } = mockStart();
  const opened = session.step(link.openExaminerLink(linkOptions('gemini', () => session.live())), speaking.closeConnection);
  await until(() => net.waitingCount() === 1, 'the token request');

  generations.unmount();
  binding.cancel();
  net.answer(200, { token: 'SYNTHETIC-not-a-token', model: 'SYNTHETIC-no-model' });

  assert.equal(await opened, null);
  assert.equal(FakeSocket.made.length, 0, 'the voice socket was opened for a start that had been let go');
  assert.ok(FakeAudioContext.made.length >= 2, 'the Gemini link did not set up its playback and capture');
  assert.ok(
    FakeAudioContext.made.every((context) => context.state === 'closed'),
    "the link's playback or capture was left running",
  );
});

test('R2D-01 check: no question means yes, and a question that fails counts as no', { timeout: LIMIT_MS }, () => {
  assert.equal(check.mayGoOn(undefined), true);
  assert.equal(check.mayGoOn(() => true), true);
  assert.equal(check.mayGoOn(() => false), false);
  assert.equal(
    check.mayGoOn(() => {
      throw new Error('SYNTHETIC failure inside the check');
    }),
    false,
  );
  assert.throws(() => check.continueOrCancel(() => false), (error: unknown) => check.isLiveStartCancelled(error));
  assert.doesNotThrow(() => check.continueOrCancel(undefined));
  assert.equal(check.isLiveStartCancelled(new Error('SYNTHETIC unrelated failure')), false);
});

/* ------------------------------------------------------------------ */
/* 4. The source: both session-creating calls are preceded by the check  */
/* ------------------------------------------------------------------ */

const here = path.dirname(fileURLToPath(import.meta.url));
function source(relative: string): string {
  return fs.readFileSync(path.join(here, '..', relative), 'utf8').replace(/\r\n/g, '\n');
}

test('R2D-01 source: the session request and the Gemini socket are each immediately preceded by the check, and the examiner hands its guard in', { timeout: LIMIT_MS }, () => {
  const openai = source('src/lib/speaking/live/openai-session.ts');
  const connect = openai.slice(openai.indexOf('export async function connectWebRtc('));
  assert.equal((connect.match(/\bfetch\(/g) ?? []).length, 1, 'connectWebRtc makes more than one request');
  assert.match(connect, /const watch = watchStart\(opts\.mayContinue, opts\.handle\);/, 'the setup does not watch the question and the handle');
  assert.match(
    connect,
    /watch\.check\(\);\n\s*const answered = \(async \(\) => \{\n\s*const resp = await fetch\(opts\.endpoint,/,
    'the request that creates the paid voice session is not immediately preceded by the check',
  );
  assert.match(
    connect,
    /watch\.check\(\);\n\s*const pc = new RTCPeerConnection\(\);/,
    'the peer connection is made without asking first',
  );
  const iceWait = connect.indexOf('waitForIceGatheringComplete(pc,');
  const lastCheck = connect.lastIndexOf('watch.check()', connect.indexOf('const resp = await fetch('));
  assert.ok(iceWait >= 0 && lastCheck > iceWait, 'the check comes before the connection preparation, not after it');

  const session = source('src/lib/speaking/live/session.ts');
  assert.equal((session.match(/new WebSocket\(/g) ?? []).length, 1, 'more than one place opens the Gemini socket');
  assert.equal((session.match(/\.open\(token, model, systemInstruction, /g) ?? []).length, 1);
  assert.match(
    session,
    /watch\.check\(\);\n\s*const session = new ExaminerSession\(cb\);\n\s*await session\.open\(token, model, systemInstruction, watch,/,
    'the Gemini socket is not immediately preceded by the check',
  );
  assert.match(
    session,
    /watch\.check\(\);\n\s*const resp = await watch\.wait\(fetch\(tokenEndpoint,/,
    'the Gemini token request is not preceded by the check',
  );
  const openBody = session.slice(session.indexOf('  private open('));
  assert.ok(openBody.indexOf('new WebSocket(') > 0, 'the socket is opened somewhere other than open()');

  const linkCode = source('src/lib/speaking/live/link.ts');
  assert.match(
    linkCode,
    /ExaminerSession\.connect\([\s\S]*?\},\s*opts\.mayContinue,\s*\{ handle: opts\.handle \},\s*\);/,
    'the Gemini link does not pass the check and the handle through',
  );
  assert.match(
    linkCode,
    /connectWebRtc\(\{[\s\S]*?mayContinue:\s*opts\.mayContinue,\s*handle:\s*opts\.handle,\s*onSessionUnused:\s*endAtWorker,\s*\}\);/,
    'the paid link does not pass the check and the handle through, or does not end an unused session',
  );
  const afterConnect = linkCode.slice(linkCode.indexOf('onSessionUnused: endAtWorker,'));
  assert.ok(
    afterConnect.indexOf('watch.check();') >= 0 && afterConnect.indexOf('watch.check();') < afterConnect.indexOf('OpenAiLiveSession.start('),
    'the answered session is started without asking',
  );

  const examiner = source('src/components/LiveExaminer.tsx');
  const start = examiner.slice(examiner.indexOf('async function startTest('));
  assert.match(start, /const stillHere = \(\) => session\.live\(\);/, "the examiner's check is not its guard");
  assert.match(start, /openExaminerLink\(\{[\s\S]*?mayContinue:\s*stillHere,[\s\S]*?\}\),\s*closeConnection,\s*\)/, 'the examiner does not hand its guard to the setup');
  assert.match(start, /if \(!stillHere\(\) \|\| isLiveStartCancelled\(e\)\) \{\s*dropStart\(session, \{ stream, rec \}\);/, 'a cancelled setup could be shown as an error');
});

/* ------------------------------------------------------------------ */
/* 5. R2E-01: a SUCCESSFUL delayed connection, the handle, every failure */
/* ------------------------------------------------------------------ */

/* WHAT IS DIFFERENT HERE
   Sections 1 to 3 let the start go BEFORE the paid session request, or
   refused it. Here the request SUCCEEDS: the stand-in peer applies the
   answer exactly as a browser would, the examiner's track arrives from
   inside that call (as a browser fires it), and the playback starts on a
   stand-in audio element whose play() can be held. The start is then let go
   at the points finding R2E-01 names: after the answer arrived but before it
   was applied, inside the track callback, while the session is starting
   (the old twenty-second window), and while the playback is still starting.
   A let-go comes two ways, as it does on the page: the handle, pulled by the
   screen's own teardown (a switch the screen heard of, an unmount, a newer
   start), and the question, for a switch that reached no listener. */

const END_BODY = { sessionId: 'SYNTHETIC-session-id' };

function endRequests(net: Network): Call[] {
  return net.calls.filter((call) => call.url === END_REQUEST && call.method === 'POST');
}

/** A few turns, for whatever a release left to finish. */
async function settleTurns(turns = 10): Promise<void> {
  for (let turn = 0; turn < turns; turn += 1) await new Promise((resolve) => setImmediate(resolve));
}

/** The paid link, driven to its session request (held). */
async function linkToSessionRequest(net: Network): Promise<FakePeer> {
  await until(() => FakePeer.made.length === 1, 'the peer connection');
  const peer = FakePeer.made[0]!;
  await peer.gatheringStarted;
  peer.finishGathering();
  await until(() => net.waitingCount() === 1, 'the session request');
  return peer;
}

/** The paid link, driven past a SUCCESSFUL session request: the answer is
    applied (bringing the examiner's track when asked to), and the link is
    waiting for the session to start, the window that used to last twenty
    seconds with nothing able to reach it. */
async function linkToSessionStart(net: Network, withTrack = true): Promise<FakePeer> {
  const peer = await linkToSessionRequest(net);
  peer.trackOnAnswer = withTrack;
  net.answer(201, SESSION_ANSWER);
  await until(() => peer.remoteDescription !== null, 'the answer applied');
  await settleTurns(5);
  return peer;
}

function everyContextClosed(): boolean {
  return FakeAudioContext.made.every((context) => context.state === 'closed');
}

test('R2E-01 setup: an answer that arrives after the page changed hands is never applied; the peer closes and the created session is reported so it can be ended', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const may = question();
  const unused: string[] = [];
  const connecting = webrtc.connectWebRtc({
    endpoint: SESSION_REQUEST,
    stream: syntheticMicrophone() as unknown as MediaStream,
    plan: PLAN,
    accessToken: 'SYNTHETIC-token-of-A',
    onRemoteStream() {},
    mayContinue: may.ask,
    onSessionUnused: (id: string) => unused.push(id),
  });
  const outcome = connecting.then(
    () => 'opened',
    (error: unknown) => error,
  );
  const peer = FakePeer.made[0]!;
  await peer.gatheringStarted;
  peer.finishGathering();
  await until(() => net.waitingCount() === 1, 'the session request');

  /* The request SUCCEEDS (the session exists), and the page changes hands
     before the setup has applied the answer. */
  net.answer(201, SESSION_ANSWER);
  may.refuse();

  const result = await outcome;
  assert.ok(check.isLiveStartCancelled(result), `the setup did not report itself cancelled: ${String(result)}`);
  assert.equal(peer.remoteCalls, 0, 'the answer was applied for a start that had been let go (audio could flow)');
  assert.equal(peer.remoteDescription, null);
  assert.equal(peer.closes, 1, 'the peer connection was left open');
  assert.equal(peer.channels[0]?.closes, 1, 'the data channel was left open');
  assert.deepEqual(unused, ['SYNTHETIC-session-id'], 'the session the request created was not reported for ending');
});

test('R2E-01 setup: the handle pulled while the session request is out closes the peer AT ONCE; the late answer is never applied, and its session is reported the moment it answers', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const handle = check.startHandle();
  const unused: string[] = [];
  const connecting = webrtc.connectWebRtc({
    endpoint: SESSION_REQUEST,
    stream: syntheticMicrophone() as unknown as MediaStream,
    plan: PLAN,
    accessToken: 'SYNTHETIC-token-of-A',
    onRemoteStream() {},
    handle,
    onSessionUnused: (id: string) => unused.push(id),
  });
  const outcome = connecting.then(
    () => 'opened',
    (error: unknown) => error,
  );
  const peer = FakePeer.made[0]!;
  await peer.gatheringStarted;
  peer.finishGathering();
  await until(() => net.waitingCount() === 1, 'the session request');

  handle.pull();
  /* Measured in the same turn as the pull, not after some wait. */
  assert.equal(peer.closes, 1, 'the pull did not close the peer connection at once');
  assert.equal(peer.channels[0]?.closes, 1, 'the pull did not close the data channel at once');

  /* The setup gives up without waiting for its request... */
  const result = await outcome;
  assert.ok(check.isLiveStartCancelled(result), `the setup did not report itself cancelled: ${String(result)}`);
  /* ...which is left to finish, never aborted: an aborted request could
     leave a session nobody knows the id of. */
  assert.equal(net.waitingCount(), 1, 'the session request was dropped, so its session could never be ended');
  assert.deepEqual(unused, []);

  net.answer(201, SESSION_ANSWER);
  await until(() => unused.length === 1, 'the late session reported');
  assert.deepEqual(unused, ['SYNTHETIC-session-id']);
  assert.equal(peer.remoteCalls, 0, 'the late answer was applied');
});

test('R2E-01 setup: the handle pulled while the connection prepares itself rejects at once, without waiting for the preparation to end', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const handle = check.startHandle();
  const connecting = webrtc.connectWebRtc({
    endpoint: SESSION_REQUEST,
    stream: syntheticMicrophone() as unknown as MediaStream,
    plan: PLAN,
    accessToken: 'SYNTHETIC-token-of-A',
    onRemoteStream() {},
    handle,
    /* Longer than this test's limit: waiting for it would fail by name. */
    iceTimeoutMs: 60_000,
  });
  const peer = FakePeer.made[0]!;
  await peer.gatheringStarted;
  handle.pull();
  assert.equal(peer.closes, 1, 'the pull did not close the peer connection at once');
  await assert.rejects(connecting, (error: unknown) => check.isLiveStartCancelled(error));
  assert.equal(net.calls.length, 0, 'a request was sent after the pull');
});

test('R2E-01 setup: a switch while the answer is being applied: the track callback asks first, stops the examiner track and passes nothing on to be played', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const may = question();
  const played: unknown[] = [];
  const unused: string[] = [];
  const connecting = webrtc.connectWebRtc({
    endpoint: SESSION_REQUEST,
    stream: syntheticMicrophone() as unknown as MediaStream,
    plan: PLAN,
    accessToken: 'SYNTHETIC-token-of-A',
    onRemoteStream: (stream: unknown) => played.push(stream),
    mayContinue: may.ask,
    onSessionUnused: (id: string) => unused.push(id),
  });
  const outcome = connecting.then(
    () => 'opened',
    (error: unknown) => error,
  );
  const peer = FakePeer.made[0]!;
  await peer.gatheringStarted;
  peer.finishGathering();
  await until(() => net.waitingCount() === 1, 'the session request');
  /* The page changes hands INSIDE the answer being applied, just before the
     examiner's track arrives (a browser fires it from inside that call). */
  peer.trackOnAnswer = true;
  peer.whileApplying = () => may.refuse();
  net.answer(201, SESSION_ANSWER);

  const result = await outcome;
  assert.ok(check.isLiveStartCancelled(result), `the setup did not report itself cancelled: ${String(result)}`);
  assert.equal(peer.remoteTracks.length, 1, 'the stand-in never delivered the track');
  assert.equal(played.length, 0, 'the examiner track was passed on to be played after the switch');
  assert.equal(peer.remoteTracks[0]?.readyState, 'ended', 'the examiner track was left running');
  assert.equal(peer.closes, 1);
  assert.deepEqual(unused, ['SYNTHETIC-session-id']);
});

test('R2E-01 link: the handle pulled while the session is starting (answer applied, examiner audio still starting to play) closes the peer and stops the audio AT ONCE, not after twenty seconds, and ends the session at the Worker', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  FakeAudio.hold = true; // the playback's start stays pending: "playback initialisation"
  const handle = check.startHandle();
  const opening = link.openExaminerLink({ ...linkOptions('openai', undefined), handle });
  const outcome = opening.then(
    () => 'opened',
    (error: unknown) => error,
  );
  const peer = await linkToSessionStart(net);
  const audio = FakeAudio.made[0];
  assert.ok(audio, 'the examiner audio never started (the stand-in track did not reach the playback)');
  assert.equal(audio.playing(), true);
  assert.equal(endRequests(net).length, 0);

  handle.pull();
  /* All of it in the same turn as the pull. */
  assert.equal(peer.closes, 1, 'the peer connection was left open after the pull');
  assert.equal(peer.channels[0]?.closes, 1, 'the data channel was left open after the pull');
  assert.equal(audio.playing(), false, 'the examiner audio went on playing after the pull');
  assert.equal(audio.srcObject, null, 'the playback element kept the examiner stream');
  assert.equal(endRequests(net).length, 1, 'the paid session was not ended at the Worker at the pull');
  assert.deepEqual(JSON.parse(endRequests(net)[0]!.body ?? '{}'), END_BODY);
  assert.equal(endRequests(net)[0]!.headers.Authorization, 'Bearer SYNTHETIC-token-of-A');

  const result = await outcome;
  assert.ok(check.isLiveStartCancelled(result), `the link did not report itself cancelled: ${String(result)}`);
  /* The playback's start carried on after the pull (its held play() was
     refused by the pause): what it made afterwards is released as well. */
  await settleTurns();
  assert.ok(FakeAudioContext.made.length >= 1);
  assert.ok(everyContextClosed(), 'an audio context made after the pull was left running');
  assert.equal(liveIntervals.size, 0, "the playback's level poll was left running");
  assert.equal(audio.playing(), false);
  assert.deepEqual(peer.channels[0]?.sent, [], 'something was sent on the data channel');
  assert.equal(endRequests(net).length, 1, 'the session was ended more than once');
});

test('R2E-01 link: an examiner track that arrives after the let-go starts no playback, and is stopped', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const handle = check.startHandle();
  const opening = link.openExaminerLink({ ...linkOptions('openai', undefined), handle });
  const outcome = opening.then(
    () => 'opened',
    (error: unknown) => error,
  );
  /* The answer is applied without a track this time; the track comes late. */
  const peer = await linkToSessionStart(net, false);
  handle.pull();
  const late = peer.deliverTrack();
  assert.equal(FakeAudio.made.length, 0, 'a playback element was made for a start that had been let go');
  assert.equal(late.readyState, 'ended', 'the late examiner track was left running');
  assert.ok(check.isLiveStartCancelled(await outcome));
  assert.equal(endRequests(net).length, 1);
});

test('R2E-01 link: a switch that reached no listener: a late examiner track plays nothing, the session.started that follows is not accepted, and the session is ended at the Worker', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const may = question();
  const opening = link.openExaminerLink(linkOptions('openai', may.ask));
  const outcome = opening.then(
    () => 'opened',
    (error: unknown) => error,
  );
  const peer = await linkToSessionStart(net, false);
  may.refuse();
  const late = peer.deliverTrack();
  assert.equal(FakeAudio.made.length, 0, 'the examiner audio was played after the switch');
  assert.equal(late.readyState, 'ended');
  /* OpenAI says the session has started: the start asks before accepting. */
  peer.channels[0]!.deliver({ type: 'session.started', session: { id: 'SYNTHETIC-session-id' } });
  const result = await outcome;
  assert.ok(check.isLiveStartCancelled(result), `the link was handed over after the switch: ${String(result)}`);
  assert.equal(peer.closes, 1);
  assert.equal(endRequests(net).length, 1, 'the session was not ended at the Worker');
});

test('R2E-01 link: the session start timing out ends the session at the Worker', { timeout: LIMIT_MS }, async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const net = surroundings();
  const opening = link.openExaminerLink(linkOptions('openai', undefined));
  const outcome = opening.then(
    () => 'opened',
    (error: unknown) => error,
  );
  const peer = await linkToSessionStart(net);
  assert.equal(endRequests(net).length, 0);
  /* Nothing more comes from OpenAI for twenty seconds. */
  t.mock.timers.tick(20_000);
  const result = await outcome;
  assert.ok(result instanceof Error && /Timed out waiting for the examiner session to start/.test(result.message), String(result));
  assert.equal(peer.closes, 1);
  assert.equal(endRequests(net).length, 1, 'a session that timed out was left open at the Worker');
  assert.deepEqual(JSON.parse(endRequests(net)[0]!.body ?? '{}'), END_BODY);
  await settleTurns();
  assert.ok(everyContextClosed());
  assert.equal(liveIntervals.size, 0);
});

test('R2E-01 link: an error from the service before the session starts ends the session at the Worker', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const opening = link.openExaminerLink(linkOptions('openai', undefined));
  const outcome = opening.then(
    () => 'opened',
    (error: unknown) => error,
  );
  const peer = await linkToSessionStart(net);
  peer.channels[0]!.deliver({ type: 'error', error: { message: 'SYNTHETIC service failure' } });
  const result = await outcome;
  assert.ok(result instanceof Error && result.message === 'SYNTHETIC service failure', String(result));
  assert.equal(peer.closes, 1);
  assert.equal(endRequests(net).length, 1, 'a session that failed was left open at the Worker');
  await settleTurns();
  assert.ok(everyContextClosed());
  assert.equal(liveIntervals.size, 0);
});

test('R2E-01 link: the connection closing before the session starts ends the session at the Worker', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const opening = link.openExaminerLink(linkOptions('openai', undefined));
  const outcome = opening.then(
    () => 'opened',
    (error: unknown) => error,
  );
  const peer = await linkToSessionStart(net);
  peer.channels[0]!.fireClose();
  const result = await outcome;
  assert.ok(result instanceof Error && /closed before the examiner session started/.test(result.message), String(result));
  assert.equal(endRequests(net).length, 1, 'a session whose connection closed was left open at the Worker');
});

test('R2E-01 session start: a session.started after the question said no is not accepted, and a pull rejects at once', { timeout: LIMIT_MS }, async () => {
  function transport() {
    const record = {
      closes: 0,
      handlers: null as { onEvent(ev: Record<string, unknown> & { type: string }): void; onClose(): void } | null,
      send() {},
      setHandlers(h: { onEvent(ev: Record<string, unknown> & { type: string }): void; onClose(): void }) {
        record.handlers = h;
      },
      close() {
        record.closes += 1;
      },
    };
    return record;
  }

  const first = transport();
  const may = question();
  const starting = webrtc.OpenAiLiveSession.start(first, noCallbacks, { mayContinue: may.ask, startTimeoutMs: 60_000 });
  may.refuse();
  first.handlers!.onEvent({ type: 'session.started', session: { id: 'SYNTHETIC-session-id' } });
  await assert.rejects(starting, (error: unknown) => check.isLiveStartCancelled(error));
  assert.equal(first.closes, 1, 'the transport of a start that was let go was left open');

  const second = transport();
  const handle = check.startHandle();
  const waiting = webrtc.OpenAiLiveSession.start(second, noCallbacks, { handle, startTimeoutMs: 60_000 });
  handle.pull();
  assert.equal(second.closes, 1, 'the pull did not close the transport at once');
  /* Rejected without waiting for the sixty seconds (this test's limit is ten). */
  await assert.rejects(waiting, (error: unknown) => check.isLiveStartCancelled(error));
});

test('R2E-01 Gemini: a socket that opens after the page changed hands sends no setup and is closed', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const may = question();
  const connecting = gemini.ExaminerSession.connect(SESSION_REQUEST, 'SYNTHETIC instruction', { ...noCallbacks, onAudio() {}, onInterrupted() {} }, may.ask);
  const outcome = connecting.then(
    () => 'opened',
    (error: unknown) => error,
  );
  await until(() => net.waitingCount() === 1, 'the token request');
  net.answer(200, { token: 'SYNTHETIC-not-a-token', model: 'SYNTHETIC-no-model' });
  await until(() => FakeSocket.made.length === 1, 'the socket');
  const socket = FakeSocket.made[0]!;

  /* The switch comes after the socket was made, before it opens. */
  may.refuse();
  socket.open();

  assert.equal(socket.sent.length, 0, 'the setup was sent on a socket whose start had been let go');
  assert.equal(socket.closes, 1, 'the socket was left open');
  const result = await outcome;
  assert.ok(check.isLiveStartCancelled(result), `the setup did not report itself cancelled: ${String(result)}`);
});

test('R2E-01 Gemini: the handle pulled while the socket is connecting closes it at once and nothing is ever sent on it', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const handle = check.startHandle();
  const connecting = gemini.ExaminerSession.connect(
    SESSION_REQUEST,
    'SYNTHETIC instruction',
    { ...noCallbacks, onAudio() {}, onInterrupted() {} },
    undefined,
    { handle },
  );
  const outcome = connecting.then(
    () => 'opened',
    (error: unknown) => error,
  );
  await until(() => net.waitingCount() === 1, 'the token request');
  net.answer(200, { token: 'SYNTHETIC-not-a-token', model: 'SYNTHETIC-no-model' });
  await until(() => FakeSocket.made.length === 1, 'the socket');
  const socket = FakeSocket.made[0]!;

  handle.pull();
  assert.equal(socket.closes, 1, 'the pull did not close the socket at once');
  socket.open();
  assert.equal(socket.sent.length, 0, 'the setup was sent after the pull');
  const result = await outcome;
  assert.ok(check.isLiveStartCancelled(result), `the setup did not report itself cancelled: ${String(result)}`);
});

test('R2E-01 Gemini: the setup wait has an end: no setupComplete in time closes the socket and fails the start', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  let closedReports = 0;
  const connecting = gemini.ExaminerSession.connect(
    SESSION_REQUEST,
    'SYNTHETIC instruction',
    {
      ...noCallbacks,
      onAudio() {},
      onInterrupted() {},
      onClosed() {
        closedReports += 1;
      },
    },
    undefined,
    { setupTimeoutMs: 40 },
  );
  const outcome = connecting.then(
    () => 'opened',
    (error: unknown) => error,
  );
  await until(() => net.waitingCount() === 1, 'the token request');
  net.answer(200, { token: 'SYNTHETIC-not-a-token', model: 'SYNTHETIC-no-model' });
  await until(() => FakeSocket.made.length === 1, 'the socket');
  const socket = FakeSocket.made[0]!;
  socket.open();
  assert.equal(socket.sent.length, 1, 'the setup was not sent');

  /* Gemini never answers the setup. */
  const result = await outcome;
  assert.ok(result instanceof Error && /Timed out waiting for the examiner session to start/.test(result.message), String(result));
  assert.equal(socket.closes, 1, 'the socket of a setup that timed out was left open');
  assert.equal(closedReports, 0, 'a start that failed reported a closed session as well');
});

test('R2E-01 Gemini link: the handle pulled during the token request stops the playback and the capture at once, and no socket follows', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  const handle = check.startHandle();
  const opening = link.openExaminerLink({ ...linkOptions('gemini', undefined), handle });
  const outcome = opening.then(
    () => 'opened',
    (error: unknown) => error,
  );
  await until(() => net.waitingCount() === 1, 'the token request');
  assert.ok(FakeAudioContext.made.length >= 2, 'the Gemini link did not set up its playback and capture');
  handle.pull();
  assert.ok(everyContextClosed(), "the link's playback or capture was left running after the pull");
  const result = await outcome;
  assert.ok(check.isLiveStartCancelled(result), String(result));
  net.answer(200, { token: 'SYNTHETIC-not-a-token', model: 'SYNTHETIC-no-model' });
  await settleTurns();
  assert.equal(FakeSocket.made.length, 0, 'a socket was opened after the pull');
});

test('R2E-01 guard: a start handle is pulled the moment its number goes stale (a newer start, a teardown, the unmount), and a release registered late runs at once', { timeout: LIMIT_MS }, () => {
  storeOwner.setCurrentOwner(A);
  const generations = speaking.sessionGenerations();
  const binding = storeOwner.bindToCurrentOwner();
  const pulls: string[] = [];

  const first = speaking.guardSessionStart({ generations, binding, attempt: null });
  first.handle.onLetGo(() => pulls.push('first'));
  assert.equal(first.handle.letGo(), false);
  /* A newer start. */
  const second = speaking.guardSessionStart({ generations, binding, attempt: null });
  assert.deepEqual(pulls, ['first']);
  assert.equal(first.handle.letGo(), true);
  first.handle.onLetGo(() => pulls.push('first, late'));
  assert.deepEqual(pulls, ['first', 'first, late'], 'a release registered after the pull did not run at once');

  second.handle.onLetGo(() => pulls.push('second'));
  const takenBack = second.handle.onLetGo(() => pulls.push('second, taken back'));
  takenBack();
  /* A teardown (Back, a switch, dropStart) moves the number on. */
  generations.next();
  assert.deepEqual(pulls, ['first', 'first, late', 'second']);

  const third = speaking.guardSessionStart({ generations, binding, attempt: null });
  third.handle.onLetGo(() => pulls.push('third'));
  generations.unmount();
  assert.deepEqual(pulls, ['first', 'first, late', 'second', 'third']);
  assert.equal(third.handle.letGo(), true);
  binding.cancel();
});

test('R2E-01 link through the examiner guard: the mock is taken away while its session is starting: the peer closes at once and the session is ended at the Worker', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  storeOwner.setCurrentOwner(A);
  const { generations, binding, session } = mockStart();
  FakeAudio.hold = true;
  /* Exactly the examiner's own call, with its guard's question AND handle. */
  const opened = session.step(
    link.openExaminerLink({ ...linkOptions('openai', () => session.live()), handle: session.handle }),
    speaking.closeConnection,
  );
  const peer = await linkToSessionStart(net);
  const audio = FakeAudio.made[0]!;
  assert.equal(audio.playing(), true);

  /* MockExam takes the examiner away (the account changed on another tab). */
  storeOwner.setCurrentOwner(B);
  generations.unmount();
  binding.cancel();
  assert.equal(peer.closes, 1, 'the unmount did not reach the connection still coming up');
  assert.equal(audio.playing(), false, 'the examiner audio went on playing behind the stopped mock');
  assert.equal(endRequests(net).length, 1, 'the paid session was not ended at the Worker');

  assert.equal(await opened, null, 'the examiner would have been handed a link, or an error to show');
  await settleTurns();
  assert.ok(everyContextClosed());
  assert.equal(liveIntervals.size, 0);
});

test('R2E-01 link through the examiner guard: on the standalone page a switch that reaches the attempt closes the connection while its request is out; the successful late answer is never applied and its session is ended', { timeout: LIMIT_MS }, async () => {
  const net = surroundings();
  storeOwner.setCurrentOwner(A);
  const generations = speaking.sessionGenerations();
  /* The screen's own teardown at a switch (leaveForOwnerChange) moves the
     start number on first; that is all this stand-in for it does. */
  const attempt = speaking.openSpeakingAttempt({ onOwnerLeft: () => void generations.next() });
  const session = speaking.guardSessionStart({ generations, binding: attempt.binding, attempt });
  const opened = session.step(
    link.openExaminerLink({ ...linkOptions('openai', () => session.live()), handle: session.handle }),
    speaking.closeConnection,
  );
  const peer = await linkToSessionRequest(net);

  storeOwner.setCurrentOwner(B);
  assert.equal(attempt.stage(), 'suspended');
  assert.equal(peer.closes, 1, 'the switch did not reach the connection still coming up');
  assert.equal(await opened, null);

  /* The request then SUCCEEDS, late. */
  peer.trackOnAnswer = true;
  net.answer(201, SESSION_ANSWER);
  await until(() => endRequests(net).length === 1, 'the late session ended at the Worker');
  assert.deepEqual(JSON.parse(endRequests(net)[0]!.body ?? '{}'), END_BODY);
  assert.equal(peer.remoteCalls, 0, 'the late answer was applied after the switch');
  assert.equal(FakeAudio.made.length, 0, 'the examiner audio was played after the switch');
});

test('R2E-01 source: the answer is applied only after a check, every callback asks, every failure ends the session, and the examiner hands its handle in', { timeout: LIMIT_MS }, () => {
  const openai = source('src/lib/speaking/live/openai-session.ts');
  const connect = openai.slice(openai.indexOf('export async function connectWebRtc('));
  assert.match(
    connect,
    /watch\.check\(\);\n\s*await watch\.wait\(pc\.setRemoteDescription\(/,
    'the remote answer is not immediately preceded by the check',
  );
  assert.equal((connect.match(/setRemoteDescription\(/g) ?? []).length, 1, 'the answer is applied in more than one place');
  const trackCallback = connect.slice(connect.indexOf("pc.addEventListener('track'"), connect.indexOf('opts.onRemoteStream(') + 1);
  assert.match(trackCallback, /if \(torndown \|\| !watch\.going\(\)\) \{[\s\S]*?e\.track\.stop\(\);[\s\S]*?return;/, 'the track callback plays without asking');
  assert.match(connect, /watch\.onLetGo\(teardown\);/, 'a pull does not close the connection');
  assert.match(connect, /catch \(err\) \{\s*gaveUp = true;\s*teardown\(\);\s*watch\.done\(\);\s*reportUnused\(\);/, 'a failed setup does not report its session');

  const start = openai.slice(openai.indexOf('  static start('), openai.indexOf('  private attach('));
  assert.match(start, /onEvent\(ev\) \{\s*if \(settled\) return;[\s\S]*?if \(!watch\.going\(\)\) \{\s*cancelled\(\);/, 'the session start acts on the channel without asking');
  assert.match(start, /watch\.onLetGo\(cancelled\);/, 'a pull does not reach the session start');

  const session = source('src/lib/speaking/live/session.ts');
  const onOpen = session.slice(session.indexOf('ws.onopen = () => {'), session.indexOf('ws.send('));
  assert.match(onOpen, /if \(settled \|\| !watch\.going\(\)\) \{\s*cancelled\(\);\s*return;/, 'the Gemini open callback sends the setup without asking');
  assert.match(session, /timer = setTimeout\(\(\) => \{\s*fail\(new Error\('Timed out waiting for the examiner session to start\.'\)\);/, 'the Gemini setup wait has no end');
  assert.match(session, /watch\.onLetGo\(cancelled\);/, 'a pull does not close the Gemini socket');

  const linkCode = source('src/lib/speaking/live/link.ts');
  const paid = linkCode.slice(linkCode.indexOf('async function openOpenAiLink('));
  const release = paid.slice(paid.indexOf('const release = (): Promise<void> => {'), paid.indexOf('watch.onLetGo(() => {'));
  assert.match(release, /peer\.transport\.close\(\);\s*endAtWorker\(peer\.sessionId\);/, 'letting go does not end a created session at the Worker');
  assert.match(paid, /\} catch \(err\) \{[\s\S]*?watch\.done\(\);\s*await release\(\);\s*throw err;/, 'a failure of the paid setup does not release (and end) what it made');
  assert.match(paid, /onRemoteStream: \(stream\) => \{[\s\S]*?if \(released \|\| !watch\.going\(\)\) \{\s*stopTracks\(stream\);\s*return;/, 'the examiner audio is played without asking');

  const owner = source('src/components/speaking-attempt-owner.ts');
  assert.match(owner, /onLetGo: \(release\) => generations\.whenStale\(generation, release\)/, "the start's handle is not pulled by its number going stale");

  const examiner = source('src/components/LiveExaminer.tsx');
  const startTest = examiner.slice(examiner.indexOf('async function startTest('));
  assert.match(startTest, /openExaminerLink\(\{[\s\S]*?mayContinue:\s*stillHere,[\s\S]*?handle:\s*session\.handle,[\s\S]*?\}\),\s*closeConnection,\s*\)/, 'the examiner does not hand its handle to the setup');
});
