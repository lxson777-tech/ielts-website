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
}

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
  async setRemoteDescription(description: { type: string; sdp: string }): Promise<void> {
    this.remoteDescription = description;
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
};

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
    tracks: unknown[];
    constructor(tracks: unknown[]) {
      this.tracks = tracks;
    }
  };
  return net;
}

afterEach(() => {
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
  assert.equal(may.asked.count, 2);
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
  assert.equal(may.asked.count, 2);
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
  assert.equal(may.asked.count, 3, 'the paid path asks before anything, before the request, and once it is answered');

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
  assert.match(
    connect,
    /continueOrCancel\(opts\.mayContinue\);\n\s*const resp = await fetch\(opts\.endpoint,/,
    'the request that creates the paid voice session is not immediately preceded by the check',
  );
  assert.match(
    connect,
    /continueOrCancel\(opts\.mayContinue\);\n\s*const pc = new RTCPeerConnection\(\);/,
    'the peer connection is made without asking first',
  );
  const iceWait = connect.indexOf('await waitForIceGatheringComplete(');
  const lastCheck = connect.lastIndexOf('continueOrCancel(opts.mayContinue)', connect.indexOf('const resp = await fetch('));
  assert.ok(iceWait >= 0 && lastCheck > iceWait, 'the check comes before the connection preparation, not after it');

  const session = source('src/lib/speaking/live/session.ts');
  assert.equal((session.match(/new WebSocket\(/g) ?? []).length, 1, 'more than one place opens the Gemini socket');
  assert.equal((session.match(/\.open\(token, model, systemInstruction\)/g) ?? []).length, 1);
  assert.match(
    session,
    /continueOrCancel\(mayContinue\);\n\s*const session = new ExaminerSession\(cb\);\n\s*await session\.open\(token, model, systemInstruction\);/,
    'the Gemini socket is not immediately preceded by the check',
  );
  assert.match(
    session,
    /continueOrCancel\(mayContinue\);\n\s*const resp = await fetch\(tokenEndpoint,/,
    'the Gemini token request is not preceded by the check',
  );
  const openBody = session.slice(session.indexOf('  private open('));
  assert.ok(openBody.indexOf('new WebSocket(') > 0, 'the socket is opened somewhere other than open()');

  const linkCode = source('src/lib/speaking/live/link.ts');
  assert.match(linkCode, /ExaminerSession\.connect\([\s\S]*?\},\s*opts\.mayContinue\);/, 'the Gemini link does not pass the check through');
  assert.match(linkCode, /connectWebRtc\(\{[\s\S]*?mayContinue:\s*opts\.mayContinue,\s*\}\);/, 'the paid link does not pass the check through');
  const afterConnect = linkCode.slice(linkCode.indexOf('mayContinue: opts.mayContinue,'));
  assert.ok(
    afterConnect.indexOf('if (!mayGoOn(opts.mayContinue))') >= 0 &&
      afterConnect.indexOf('if (!mayGoOn(opts.mayContinue))') < afterConnect.indexOf('OpenAiLiveSession.start('),
    'the answered session is started without asking',
  );

  const examiner = source('src/components/LiveExaminer.tsx');
  const start = examiner.slice(examiner.indexOf('async function startTest('));
  assert.match(start, /const stillHere = \(\) => session\.live\(\);/, "the examiner's check is not its guard");
  assert.match(start, /openExaminerLink\(\{[\s\S]*?mayContinue:\s*stillHere,[\s\S]*?\}\),\s*closeConnection,\s*\)/, 'the examiner does not hand its guard to the setup');
  assert.match(start, /if \(!stillHere\(\) \|\| isLiveStartCancelled\(e\)\) \{\s*dropStart\(session, \{ stream, rec \}\);/, 'a cancelled setup could be shown as an error');
});
