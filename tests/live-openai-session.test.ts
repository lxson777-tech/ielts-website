import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OpenAiLiveSession,
  type LiveEventTransport,
  type LiveServerEvent,
  type OpenAiSessionCallbacks,
} from '../src/lib/speaking/live/openai-session.ts';

class FakeTransport implements LiveEventTransport {
  sent: Record<string, unknown>[] = [];
  closed = 0;
  private onEvent: ((ev: LiveServerEvent) => void) | null = null;
  private onCloseHandler: (() => void) | null = null;

  send(event: Record<string, unknown>): void {
    this.sent.push(event);
  }

  setHandlers(h: { onEvent(ev: LiveServerEvent): void; onClose(): void }): void {
    this.onEvent = h.onEvent;
    this.onCloseHandler = h.onClose;
  }

  close(): void {
    this.closed += 1;
  }

  emit(ev: LiveServerEvent): void {
    if (!this.onEvent) throw new Error('FakeTransport: no onEvent handler registered yet');
    this.onEvent(ev);
  }

  emitClose(): void {
    if (!this.onCloseHandler) throw new Error('FakeTransport: no onClose handler registered yet');
    this.onCloseHandler();
  }
}

function makeCallbacks() {
  const transcripts: unknown[][] = [];
  const closed: { reason: string; wasClean: boolean }[] = [];
  const errors: string[] = [];
  const delegations: string[] = [];
  const cb: OpenAiSessionCallbacks = {
    onTranscript(turns) {
      // Snapshot defensively: the implementation is free to hand back the
      // same mutable array/turn objects on every call (mutating in place),
      // so a bare reference would make every recorded call look identical
      // to the latest state. Clone so each recorded call reflects the state
      // at the moment it fired.
      transcripts.push(turns.map((t) => ({ ...t })));
    },
    onClosed(reason, wasClean) {
      closed.push({ reason, wasClean });
    },
    onError(message) {
      errors.push(message);
    },
    onDelegation(delegationId) {
      delegations.push(delegationId);
    },
  };
  return { cb, transcripts, closed, errors, delegations };
}

async function startedSession(opts?: Parameters<typeof OpenAiLiveSession.start>[2]) {
  const transport = new FakeTransport();
  const { cb, transcripts, closed, errors, delegations } = makeCallbacks();
  const startPromise = OpenAiLiveSession.start(transport, cb, opts);
  transport.emit({ type: 'session.started', session: { id: 'live_abc' } });
  const session = await startPromise;
  return { session, transport, transcripts, closed, errors, delegations };
}

test('start() resolves on session.started and exposes the session id', async () => {
  const { session, transport } = await startedSession();
  assert.equal(session.sessionId, 'live_abc');
  assert.equal(transport.closed, 0);
});

test('start() rejects and closes the transport when an error event arrives before start', async () => {
  const transport = new FakeTransport();
  const { cb } = makeCallbacks();
  const startPromise = OpenAiLiveSession.start(transport, cb);
  transport.emit({ type: 'error', error: { message: 'bad request' } });
  await assert.rejects(startPromise, /bad request/);
  assert.equal(transport.closed, 1);
});

test('start() rejects and closes the transport when the transport closes before start', async () => {
  const transport = new FakeTransport();
  const { cb } = makeCallbacks();
  const startPromise = OpenAiLiveSession.start(transport, cb);
  transport.emitClose();
  await assert.rejects(startPromise);
  assert.equal(transport.closed, 1);
});

test('start() rejects and closes the transport on timeout', async () => {
  const transport = new FakeTransport();
  const { cb } = makeCallbacks();
  const startPromise = OpenAiLiveSession.start(transport, cb, { startTimeoutMs: 50 });
  await assert.rejects(startPromise);
  assert.equal(transport.closed, 1);
});

test('candidate transcript deltas are concatenated exactly with no added trimming', async () => {
  const t = await startedSession();
  t.transport.emit({ type: 'session.input_transcript.delta', delta: 'Hello ', start_ms: 0, end_ms: 500 });
  t.transport.emit({ type: 'session.input_transcript.delta', delta: 'there', start_ms: 500, end_ms: 900 });

  const last = t.transcripts.at(-1) as { role: string; text: string }[];
  assert.equal(last.length, 1);
  assert.equal(last[0].role, 'candidate');
  assert.equal(last[0].text, 'Hello there');
  assert.deepEqual(t.session.transcript(), last);
});

test('examiner transcript deltas are grouped separately from candidate deltas', async () => {
  const t = await startedSession();
  t.transport.emit({ type: 'session.output_transcript.delta', delta: 'Good afternoon.', start_ms: 0, end_ms: 800 });
  t.transport.emit({ type: 'session.input_transcript.delta', delta: 'Hi.', start_ms: 900, end_ms: 1200 });

  const turns = t.session.transcript();
  assert.equal(turns.length, 2);
  assert.equal(turns[0].role, 'examiner');
  assert.equal(turns[0].text, 'Good afternoon.');
  assert.equal(turns[1].role, 'candidate');
  assert.equal(turns[1].text, 'Hi.');
});

test('(a) candidate/examiner/candidate produces three turns in chronological order, since a delta only ever joins the LAST turn overall', async () => {
  const t = await startedSession({ turnGapMs: 1500 });
  // Candidate turn 1
  t.transport.emit({ type: 'session.input_transcript.delta', delta: 'I think', start_ms: 0, end_ms: 500 });
  // Examiner speaks in between: becomes the new last turn overall.
  t.transport.emit({ type: 'session.output_transcript.delta', delta: 'Mm.', start_ms: 600, end_ms: 900 });
  // Candidate continues, but the LAST turn overall is now the examiner's, a
  // different role, so this must start a brand-new turn rather than
  // reopening the earlier candidate turn.
  t.transport.emit({ type: 'session.input_transcript.delta', delta: ' that is true', start_ms: 1200, end_ms: 1800 });

  const turns = t.session.transcript();
  assert.equal(turns.length, 3);
  assert.equal(turns[0].role, 'candidate');
  assert.equal(turns[0].text, 'I think');
  assert.equal(turns[1].role, 'examiner');
  assert.equal(turns[1].text, 'Mm.');
  assert.equal(turns[2].role, 'candidate');
  assert.equal(turns[2].text, ' that is true');
});

test('(b) an interruption mid-sentence produces three turns in arrival order: examiner, candidate, examiner', async () => {
  const t = await startedSession({ turnGapMs: 1500 });
  t.transport.emit({ type: 'session.output_transcript.delta', delta: 'Can you tell me', start_ms: 0, end_ms: 2000 });
  t.transport.emit({ type: 'session.input_transcript.delta', delta: 'Sorry?', start_ms: 1500, end_ms: 1700 });
  t.transport.emit({ type: 'session.output_transcript.delta', delta: ' about your job?', start_ms: 2000, end_ms: 2500 });

  const turns = t.session.transcript();
  assert.equal(turns.length, 3);
  assert.equal(turns[0].role, 'examiner');
  assert.equal(turns[0].text, 'Can you tell me');
  assert.equal(turns[1].role, 'candidate');
  assert.equal(turns[1].text, 'Sorry?');
  assert.equal(turns[2].role, 'examiner');
  assert.equal(turns[2].text, ' about your job?');
});

test('(c) same-role consecutive deltas within turnGapMs still merge into one turn', async () => {
  const t = await startedSession({ turnGapMs: 1500 });
  t.transport.emit({ type: 'session.input_transcript.delta', delta: 'I think', start_ms: 0, end_ms: 500 });
  t.transport.emit({ type: 'session.input_transcript.delta', delta: ' that is true', start_ms: 1200, end_ms: 1800 });

  const turns = t.session.transcript();
  assert.equal(turns.length, 1);
  assert.equal(turns[0].role, 'candidate');
  assert.equal(turns[0].text, 'I think that is true');
});

test('(d) same-role consecutive deltas beyond turnGapMs split into separate turns', async () => {
  const t = await startedSession({ turnGapMs: 200 });
  t.transport.emit({ type: 'session.input_transcript.delta', delta: 'First.', start_ms: 0, end_ms: 500 });
  t.transport.emit({ type: 'session.input_transcript.delta', delta: 'Second.', start_ms: 5000, end_ms: 5500 });

  const turns = t.session.transcript();
  assert.equal(turns.length, 2);
  assert.equal(turns[0].text, 'First.');
  assert.equal(turns[1].text, 'Second.');
});

test('onTranscript fires after each delta with the current turns array', async () => {
  const t = await startedSession();
  t.transport.emit({ type: 'session.input_transcript.delta', delta: 'A', start_ms: 0, end_ms: 100 });
  t.transport.emit({ type: 'session.input_transcript.delta', delta: 'B', start_ms: 100, end_ms: 200 });
  assert.equal(t.transcripts.length, 2);
  assert.equal((t.transcripts[0] as { text: string }[])[0].text, 'A');
  assert.equal((t.transcripts[1] as { text: string }[])[0].text, 'AB');
});

test('a delegation.created event targeting the client calls onDelegation and sends nothing on the transport', async () => {
  const t = await startedSession();
  const sentBefore = t.transport.sent.length;
  t.transport.emit({ type: 'session.delegation.created', delegation: { id: 'del_1', target: 'client' } });

  assert.deepEqual(t.delegations, ['del_1']);
  assert.equal(t.transport.sent.length, sentBefore, 'the session must not answer the delegation itself');
});

test('an error event after start calls onError and keeps the session open', async () => {
  const t = await startedSession();
  t.transport.emit({ type: 'error', error: { message: 'transient glitch' } });
  assert.deepEqual(t.errors, ['transient glitch']);
  assert.equal(t.transport.closed, 0);
});

test('session.closed with reason "expired" reports wasClean false', async () => {
  const t = await startedSession();
  t.transport.emit({ type: 'session.closed', reason: 'expired', usage: { seconds: 10 } });
  assert.equal(t.closed.length, 1);
  assert.equal(t.closed[0].reason, 'expired');
  assert.equal(t.closed[0].wasClean, false);
});

test('session.closed with reason "remote_hangup" reports wasClean true', async () => {
  const t = await startedSession();
  t.transport.emit({ type: 'session.closed', reason: 'remote_hangup', usage: { seconds: 20 } });
  assert.equal(t.closed.length, 1);
  assert.equal(t.closed[0].reason, 'remote_hangup');
  assert.equal(t.closed[0].wasClean, true);
});

test('session.closed with reason "close_requested" (unsolicited) reports wasClean true and onClosed fires exactly once', async () => {
  const t = await startedSession();
  t.transport.emit({ type: 'session.closed', reason: 'close_requested', usage: { seconds: 5 } });
  assert.equal(t.closed.length, 1);
  assert.equal(t.closed[0].wasClean, true);
});

test('usageSeconds() reflects the latest session.usage.updated event, null before any', async () => {
  const t = await startedSession();
  assert.equal(t.session.usageSeconds(), null);
  t.transport.emit({ type: 'session.usage.updated', usage: { seconds: 37 } });
  assert.equal(t.session.usageSeconds(), 37);
  t.transport.emit({ type: 'session.usage.updated', usage: { seconds: 41 } });
  assert.equal(t.session.usageSeconds(), 41);
});

test('setMicMuted sends the mute and unmute event types', async () => {
  const t = await startedSession();
  t.session.setMicMuted(true);
  t.session.setMicMuted(false);
  const types = t.transport.sent.filter((s) => typeof s.event_id === 'string').map((s) => s.type);
  assert.ok(types.includes('session.input_audio.mute'));
  assert.ok(types.includes('session.input_audio.unmute'));
});

test('close() sends session.close, resolves on session.closed, and does not also call onClosed', async () => {
  const t = await startedSession();
  const closePromise = t.session.close();
  assert.ok(t.transport.sent.some((s) => s.type === 'session.close'));
  t.transport.emit({ type: 'session.closed', reason: 'close_requested', usage: { seconds: 42 } });
  const result = await closePromise;
  assert.deepEqual(result, { finalized: true, reason: 'close_requested', usageSeconds: 42 });
  assert.equal(t.transport.closed, 1);
  assert.equal(t.closed.length, 0, 'onClosed must not fire for a close we requested');
});

test('close() resolves not-finalized on timeout when nothing arrives, and still closes the transport', async () => {
  const t = await startedSession({ closeTimeoutMs: 50 });
  const result = await t.session.close();
  assert.equal(result.finalized, false);
  assert.equal(t.transport.closed, 1);
});

test('calling close() twice returns the same result without sending a second session.close', async () => {
  const t = await startedSession();
  const first = t.session.close();
  t.transport.emit({ type: 'session.closed', reason: 'close_requested', usage: { seconds: 7 } });
  const firstResult = await first;
  const closeCount = t.transport.sent.filter((s) => s.type === 'session.close').length;

  const secondResult = await t.session.close();
  assert.deepEqual(secondResult, firstResult);
  assert.equal(
    t.transport.sent.filter((s) => s.type === 'session.close').length,
    closeCount,
    'a second session.close must not be sent',
  );
});

test('transport onClose after start (no session.closed, no requested close) reports connection lost once', async () => {
  const t = await startedSession();
  t.transport.emitClose();
  assert.equal(t.closed.length, 1);
  assert.deepEqual(t.closed[0], { reason: 'connection lost', wasClean: false });
  // The peer connection must be released as well, not just reported.
  assert.ok(t.transport.closed >= 1, 'transport.close() must run after a lost connection');

  // A second emitClose (or any further activity) must not fire onClosed again.
  t.transport.emitClose();
  assert.equal(t.closed.length, 1);
});

test('after connection-lost, setMicMuted is a no-op that does not throw or send', async () => {
  const t = await startedSession();
  t.transport.emitClose();
  const sentBefore = t.transport.sent.length;
  assert.doesNotThrow(() => t.session.setMicMuted(true));
  assert.equal(t.transport.sent.length, sentBefore);
});
