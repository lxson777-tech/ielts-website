import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAssessment,
  createHandler,
  resolveProvider,
  buildOpenAiRequest,
  parseOpenAiToolCall,
  computeTimingStats,
  buildTranscriptionForm,
  buildTextGradeRequest,
  buildPronunciationRequest,
  parseResponsesOutput,
  selectCandidateSpeaker,
  computeSegmentStats,
  defaultDeps,
} from '../workers/grade-speaking/src/index.ts';
import { SPEAKING_ANCHORS } from '../workers/grade-speaking/src/anchors.ts';

const PROD_ORIGIN = 'https://lxson777-tech.github.io';
const WORKER_URL = 'https://ielts-grade-speaking.example.workers.dev/';
const DUMMY_OPENAI_KEY = 'sk-test-dummy';
const DUMMY_GEMINI_KEY = 'gk-test-dummy';

// A tiny, deliberately fake base64 "clip". The handler never decodes audio
// bytes itself for the 'audio' mode / gemini path, so any non-empty
// base64-looking string exercises the same code paths a real recording
// would. The hybrid pipeline DOES decode it (to build the transcription
// upload), so it must be valid base64, and 'not-real-audio-bytes' still is.
const FAKE_CLIP_BASE64 = Buffer.from('not-real-audio-bytes').toString('base64');

function baseEnv(overrides: Record<string, unknown> = {}) {
  return {
    GEMINI_MODEL: 'gemini-3.6-flash-test',
    ALLOWED_ORIGINS: PROD_ORIGIN,
    ...overrides,
  } as never;
}

function openAiEnv(overrides: Record<string, unknown> = {}) {
  return baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY, ...overrides });
}

function geminiEnv(overrides: Record<string, unknown> = {}) {
  return baseEnv({ GRADER_PROVIDER: 'gemini', GEMINI_API_KEY: DUMMY_GEMINI_KEY, ...overrides });
}

function clip(question: string, mimeType = 'audio/mpeg') {
  return { question, audioBase64: FAKE_CLIP_BASE64, mimeType, durationMs: 4000 };
}

function interviewBody(mimeType = 'audio/mpeg') {
  return {
    kind: 'interview',
    interview: {
      transcript: [
        { role: 'examiner', text: 'Tell me about your hometown.' },
        { role: 'candidate', text: 'It is a small but lively city.' },
      ],
      audio: clip('Live session, candidate microphone recording', mimeType),
    },
  };
}

function part1Body(mimeType = 'audio/mpeg') {
  return {
    kind: 'part1',
    part1: {
      topic: 'Work and study',
      answers: [clip('Do you work or study?', mimeType), clip('What do you like about it?', mimeType)],
    },
  };
}

function req(body: unknown, opts: { origin?: string | null } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.origin !== null) headers.Origin = opts.origin ?? PROD_ORIGIN;
  return new Request(WORKER_URL, { method: 'POST', headers, body: JSON.stringify(body) });
}

interface FakeCall {
  url: string;
  method: string;
  headers: Headers;
  body: unknown;
}

interface FakeUpstream {
  status: number;
  body: unknown;
}

/** Reads a FormData body into a plain object for assertions: string fields
    come through as-is, the uploaded file comes through as a small
    descriptor (never the raw bytes, tests only need to see its shape). */
function formDataToObject(form: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    const entry = value instanceof Blob ? { isFile: true, name: (value as File).name, type: value.type } : value;
    if (key in obj) {
      const existing = obj[key];
      obj[key] = Array.isArray(existing) ? [...existing, entry] : [existing, entry];
    } else {
      obj[key] = entry;
    }
  }
  return obj;
}

/** A fake fetch that answers whichever OpenAI or Gemini endpoint the hybrid
    or single-call pipelines hit, routed by URL, and records every call it
    saw (with FormData bodies decoded) so tests can assert on request
    shape. `transcribe` may be a single upstream (reused for every call) or
    an array (consumed in call order, one per clip). */
function makeFakeFetch(opts: {
  openai?: FakeUpstream | 'network-error';
  gemini?: FakeUpstream | 'network-error';
  transcribe?: FakeUpstream | FakeUpstream[] | 'network-error';
  responses?: FakeUpstream | 'network-error';
  calls?: FakeCall[];
}) {
  const calls = opts.calls ?? [];
  let transcribeCallIndex = 0;
  return (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    let body: unknown;
    if (init?.body instanceof FormData) {
      body = formDataToObject(init.body);
    } else {
      try {
        body = init?.body ? JSON.parse(String(init.body)) : undefined;
      } catch {
        body = String(init?.body);
      }
    }
    calls.push({ url, method: (init?.method || 'GET').toUpperCase(), headers, body });

    if (url === 'https://api.openai.com/v1/audio/transcriptions') {
      const upstream = Array.isArray(opts.transcribe) ? opts.transcribe[transcribeCallIndex++] : opts.transcribe;
      if (upstream === 'network-error' || !upstream) throw new Error('network down');
      return new Response(JSON.stringify(upstream.body), { status: upstream.status });
    }
    if (url === 'https://api.openai.com/v1/responses') {
      if (opts.responses === 'network-error' || !opts.responses) throw new Error('network down');
      return new Response(JSON.stringify(opts.responses.body), { status: opts.responses.status });
    }
    if (url === 'https://api.openai.com/v1/chat/completions') {
      if (opts.openai === 'network-error' || !opts.openai) throw new Error('network down');
      return new Response(JSON.stringify(opts.openai.body), { status: opts.openai.status });
    }
    if (url.startsWith('https://generativelanguage.googleapis.com/')) {
      if (opts.gemini === 'network-error' || !opts.gemini) throw new Error('network down');
      return new Response(JSON.stringify(opts.gemini.body), { status: opts.gemini.status });
    }
    throw new Error(`FakeFetch: unexpected request ${url}`);
  }) as typeof fetch;
}

const throwingFetch = (async () => {
  throw new Error('FakeFetch: no network call was expected in this test');
}) as typeof fetch;

function assessmentPayload(overrides: Record<string, unknown> = {}) {
  const criterion = (evidence: string, band: number) => ({
    evidence,
    band,
    comment: `Comment for ${evidence}`,
    tip: `Tip for ${evidence}`,
  });
  return {
    criteria: {
      fluencyCoherence: criterion('fc', 7),
      lexicalResource: criterion('lr', 6),
      grammaticalRange: criterion('gra', 6),
      pronunciation: criterion('pron', 7),
    },
    moments: [{ quote: 'quite hectic', note: 'natural collocation' }],
    strengths: ['Good range of connectives'],
    improvements: ['Work on subordinate clauses'],
    ...overrides,
  };
}

function openAiToolCallResponse(assessment: Record<string, unknown>) {
  return {
    choices: [
      {
        message: {
          tool_calls: [{ function: { name: 'submit_assessment', arguments: JSON.stringify(assessment) } }],
        },
      },
    ],
  };
}

function geminiResponse(assessment: Record<string, unknown>) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(assessment) }] } }],
  };
}

// ---- hybrid pipeline fixtures ----

type FixtureSegment = { type?: string; text: string; speaker: string; start: number; end: number; id?: string };

/** Fixture upstream body for /v1/audio/transcriptions. Carries both the
    old `words` shape (whisper-1 path) and the new `segments` shape
    (diarized default), so the same fixture works for either
    OPENAI_TRANSCRIBE_MODEL without callers needing to know which path a
    given test exercises. Defaults to a single speaker "A" holding the
    whole `text`, which is what a single-speaker clip (or a test that
    doesn't care about diarization) looks like. */
function transcriptionUpstream(overrides: {
  text?: string;
  duration?: number;
  words?: { word: string; start: number; end: number }[];
  segments?: FixtureSegment[];
} = {}): FakeUpstream {
  const text = overrides.text ?? 'This is a sample answer with some content.';
  return {
    status: 200,
    body: {
      text,
      duration: overrides.duration ?? 12,
      words: overrides.words ?? [
        { word: 'This', start: 0.0, end: 0.3 },
        { word: 'is', start: 0.3, end: 0.5 },
        { word: 'a', start: 0.5, end: 0.6 },
        { word: 'sample', start: 0.6, end: 1.0 },
      ],
      segments: overrides.segments ?? [{ type: 'speech', text, speaker: 'A', start: 0.0, end: 10.0, id: 'seg_0' }],
    },
  };
}

function textAssessmentPayload(overrides: Record<string, unknown> = {}) {
  const criterion = (evidence: string, band: number) => ({
    evidence,
    band,
    comment: `Comment for ${evidence}`,
    tip: `Tip for ${evidence}`,
  });
  return {
    fluencyCoherence: criterion('fc', 7),
    lexicalResource: criterion('lr', 6),
    grammaticalRange: criterion('gra', 6),
    moments: [{ quote: 'quite hectic', note: 'natural collocation' }],
    strengths: ['Good range of connectives'],
    improvements: ['Work on subordinate clauses'],
    ...overrides,
  };
}

function responsesUpstream(assessment: Record<string, unknown>, status = 200): FakeUpstream {
  return {
    status,
    body: { output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(assessment) }] }] },
  };
}

function pronunciationPayload(overrides: Record<string, unknown> = {}) {
  return { evidence: 'pron', band: 7, comment: 'Comment for pron', tip: 'Tip for pron', ...overrides };
}

function pronToolCallResponse(pron: Record<string, unknown>) {
  return {
    choices: [
      { message: { tool_calls: [{ function: { name: 'submit_pronunciation', arguments: JSON.stringify(pron) } }] } },
    ],
  };
}

/** A well-formed nextBand fixture for a criterion targeting `target`. */
function nextBandPayload(target: number) {
  return {
    target,
    gap: 'You need to show more control of this feature to reach the next band.',
    actions: [{ do: 'Practice the target feature daily.', from: 'a quoted problem', to: 'the improved version' }],
  };
}

// ---- provider resolution ----

test('resolveProvider defaults to openai and rejects unknown values', () => {
  assert.equal(resolveProvider(baseEnv()), 'openai');
  assert.equal(resolveProvider(baseEnv({ GRADER_PROVIDER: 'openai' })), 'openai');
  assert.equal(resolveProvider(baseEnv({ GRADER_PROVIDER: 'gemini' })), 'gemini');
  assert.equal(resolveProvider(baseEnv({ GRADER_PROVIDER: 'anthropic' })), null);
});

test('provider defaults to openai end-to-end: a request with no GRADER_PROVIDER and no OPENAI_API_KEY is refused as unconfigured, not routed to gemini', async () => {
  const handler = createHandler({ fetch: throwingFetch });
  const res = await handler.fetch(req(interviewBody()), baseEnv());
  assert.equal(res.status, 503);
  const data = (await res.json()) as { error: string };
  assert.equal(data.error, 'The speaking grader is not configured');
});

// ---- fail closed ----

test('503 without an OpenAI key configured', async () => {
  const handler = createHandler({ fetch: throwingFetch });
  const res = await handler.fetch(req(interviewBody()), baseEnv());
  assert.equal(res.status, 503);
});

test('503 without a Gemini key configured when GRADER_PROVIDER is gemini', async () => {
  const handler = createHandler({ fetch: throwingFetch });
  const res = await handler.fetch(req(interviewBody()), baseEnv({ GRADER_PROVIDER: 'gemini' }));
  assert.equal(res.status, 503);
});

// ---- mimeType validation (openai only) ----

test('unsupported mimeType is rejected 400 with no upstream call', async () => {
  const handler = createHandler({ fetch: throwingFetch });
  const res = await handler.fetch(req(interviewBody('audio/webm')), openAiEnv());
  assert.equal(res.status, 400);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /not supported/);
});

test('gemini accepts audio/webm (no format restriction)', async () => {
  const calls: FakeCall[] = [];
  const fetchStub = makeFakeFetch({ gemini: { status: 200, body: geminiResponse(assessmentPayload()) }, calls });
  const handler = createHandler({ fetch: fetchStub });
  const res = await handler.fetch(req(interviewBody('audio/webm'), {}), geminiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
});

// ---- happy path: openai interview, default (hybrid) mode ----

test('happy interview request in the default hybrid mode makes one transcription call, one text-grading call, then one pronunciation call, in order, and assembles the site response shape', async () => {
  const calls: FakeCall[] = [];
  const fetchStub = makeFakeFetch({
    transcribe: transcriptionUpstream(),
    responses: responsesUpstream(textAssessmentPayload()),
    openai: { status: 200, body: pronToolCallResponse(pronunciationPayload()) },
    calls,
  });
  const handler = createHandler({ fetch: fetchStub });
  // Anchors off here: this test is about the call sequence and candidate
  // clip count, not about the standardisation anchors (see the dedicated
  // anchors tests below).
  const res = await handler.fetch(req(interviewBody('audio/mpeg')), openAiEnv({ GRADING_SAMPLES: '1', OPENAI_SPEAKING_ANCHORS: 'off' }));

  assert.equal(res.status, 200);
  const data = (await res.json()) as { criteria: Record<string, { band: number; comment: string; evidence?: unknown }> };
  assert.equal(data.criteria.fluencyCoherence.band, 7);
  assert.equal(data.criteria.lexicalResource.band, 6);
  assert.equal(data.criteria.grammaticalRange.band, 6);
  assert.equal(data.criteria.pronunciation.band, 7);
  assert.equal(data.criteria.fluencyCoherence.evidence, undefined);
  assert.equal(data.criteria.pronunciation.evidence, undefined);

  assert.equal(calls.length, 3);

  const transcribeCall = calls[0]!;
  assert.equal(transcribeCall.url, 'https://api.openai.com/v1/audio/transcriptions');
  assert.equal(transcribeCall.headers.get('Authorization'), `Bearer ${DUMMY_OPENAI_KEY}`);
  const transcribeBody = transcribeCall.body as Record<string, unknown>;
  assert.equal(transcribeBody.model, 'gpt-4o-transcribe-diarize');
  assert.equal(transcribeBody.response_format, 'diarized_json');

  const responsesCall = calls[1]!;
  assert.equal(responsesCall.url, 'https://api.openai.com/v1/responses');
  const responsesBody = responsesCall.body as { model: string; instructions: string; text: { format: { type: string; strict: boolean } } };
  assert.equal(responsesBody.model, 'gpt-5.6-sol');
  assert.equal(responsesBody.text.format.type, 'json_schema');
  assert.equal(responsesBody.text.format.strict, true);
  assert.match(responsesBody.instructions, /FLUENCY AND COHERENCE/);
  assert.match(responsesBody.instructions, /HOW EXAMINERS AWARD BANDS/);
  assert.equal(
    /shows all the positive features of Band 6 and some, but not all, of the positive features of Band 8\./.test(responsesBody.instructions),
    false,
  );

  const pronCall = calls[2]!;
  assert.equal(pronCall.url, 'https://api.openai.com/v1/chat/completions');
  const pronBody = pronCall.body as {
    model: string;
    tool_choice: unknown;
    messages: { role: string; content: unknown }[];
  };
  assert.equal(pronBody.model, 'gpt-audio-1.5');
  assert.deepEqual(pronBody.tool_choice, { type: 'function', function: { name: 'submit_pronunciation' } });
  assert.equal(pronBody.messages[0]!.role, 'system');
  assert.match(String(pronBody.messages[0]!.content), /PRONUNCIATION/);
  assert.match(String(pronBody.messages[0]!.content), /never penalised/);
  const userContent = pronBody.messages[1]!.content as { type: string; input_audio?: { format: string } }[];
  const audioParts = userContent.filter((p) => p.type === 'input_audio');
  assert.equal(audioParts.length, 1);
  assert.equal(audioParts[0]!.input_audio!.format, 'mp3');
});

test('hybrid: a part1 request with two clips produces two transcription calls and two input_audio parts in the pronunciation call', async () => {
  const calls: FakeCall[] = [];
  const fetchStub = makeFakeFetch({
    transcribe: [transcriptionUpstream({ text: 'Answer one.' }), transcriptionUpstream({ text: 'Answer two.' })],
    responses: responsesUpstream(textAssessmentPayload()),
    openai: { status: 200, body: pronToolCallResponse(pronunciationPayload()) },
    calls,
  });
  const handler = createHandler({ fetch: fetchStub });
  // Anchors off: this test counts candidate input_audio parts only (see
  // the dedicated anchors tests below for the anchors-on shape).
  const res = await handler.fetch(req(part1Body('audio/mpeg')), openAiEnv({ GRADING_SAMPLES: '1', OPENAI_SPEAKING_ANCHORS: 'off' }));
  assert.equal(res.status, 200);

  const transcribeCalls = calls.filter((c) => c.url === 'https://api.openai.com/v1/audio/transcriptions');
  assert.equal(transcribeCalls.length, 2);

  const pronCall = calls.find((c) => c.url === 'https://api.openai.com/v1/chat/completions')!;
  const pronBody = pronCall.body as { messages: { content: unknown }[] };
  const userContent = pronBody.messages[1]!.content as { type: string }[];
  const audioParts = userContent.filter((p) => p.type === 'input_audio');
  assert.equal(audioParts.length, 2);
});

test('hybrid: the text-grading call sees only the candidate\'s speech, not the examiner\'s question, after diarized transcription', async () => {
  const calls: FakeCall[] = [];
  const fetchStub = makeFakeFetch({
    transcribe: transcriptionUpstream({
      segments: [
        { type: 'speech', text: 'Tell me about your hometown, please.', speaker: 'A', start: 0, end: 3 },
        { type: 'speech', text: 'My hometown is a small but lively city near the mountains.', speaker: 'B', start: 3, end: 9 },
      ],
    }),
    responses: responsesUpstream(textAssessmentPayload()),
    openai: { status: 200, body: pronToolCallResponse(pronunciationPayload()) },
    calls,
  });
  const handler = createHandler({ fetch: fetchStub });
  // Anchors off: this test is about candidate/examiner separation, not the
  // standardisation anchors (see the dedicated anchors tests below).
  const res = await handler.fetch(req(interviewBody('audio/mpeg')), openAiEnv({ GRADING_SAMPLES: '1', OPENAI_SPEAKING_ANCHORS: 'off' }));
  assert.equal(res.status, 200);

  const responsesCall = calls.find((c) => c.url === 'https://api.openai.com/v1/responses')!;
  const responsesBody = responsesCall.body as { model: string; input: { content: { text: string }[] }[] };
  const userText = responsesBody.input[0]!.content[0]!.text;
  assert.match(userText, /My hometown is a small but lively city/);
  assert.equal(/Tell me about your hometown, please\./.test(userText), false);
  assert.equal(responsesBody.model, 'gpt-5.6-sol');

  const pronCall = calls.find((c) => c.url === 'https://api.openai.com/v1/chat/completions')!;
  const pronBody = pronCall.body as { messages: { content: unknown }[] };
  const pronUserContent = pronBody.messages[1]!.content as { type: string }[];
  assert.equal(pronUserContent.filter((p) => p.type === 'input_audio').length, 1);
});

test('hybrid: OPENAI_TRANSCRIBE_MODEL "whisper-1" sends the old word-timestamp transcription request instead of diarized_json', async () => {
  const calls: FakeCall[] = [];
  const fetchStub = makeFakeFetch({
    transcribe: transcriptionUpstream(),
    responses: responsesUpstream(textAssessmentPayload()),
    openai: { status: 200, body: pronToolCallResponse(pronunciationPayload()) },
    calls,
  });
  const handler = createHandler({ fetch: fetchStub });
  const res = await handler.fetch(req(interviewBody('audio/mpeg')), openAiEnv({ GRADING_SAMPLES: '1', OPENAI_TRANSCRIBE_MODEL: 'whisper-1' }));
  assert.equal(res.status, 200);

  const transcribeCall = calls[0]!;
  const transcribeBody = transcribeCall.body as Record<string, unknown>;
  assert.equal(transcribeBody.model, 'whisper-1');
  assert.equal(transcribeBody.response_format, 'verbose_json');
  assert.equal(transcribeBody['timestamp_granularities[]'], 'word');
});

test('hybrid: transcription 401 maps to a 502 "key was rejected" message', async () => {
  const fetchStub = makeFakeFetch({ transcribe: { status: 401, body: { error: { message: 'invalid_api_key' } } } });
  const handler = createHandler({ fetch: fetchStub });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 502);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /key was rejected/);
});

test('hybrid: transcription 429 maps to 429 (after exhausting retries; sleep stubbed so the test stays fast)', async () => {
  const fetchStub = makeFakeFetch({ transcribe: { status: 429, body: { error: { message: 'rate limited' } } } });
  const handler = createHandler({ fetch: fetchStub, sleep: async () => {} });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 429);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /busy right now/);
});

// ---- OpenAI retry (429 / 5xx transient failures) ----

test('hybrid: transcription 429 once then 200 succeeds, sleeping once for 15000ms', async () => {
  let transcribeCalls = 0;
  const sleeps: number[] = [];
  const fetchStub = (async (input: unknown) => {
    const url = String(input);
    if (url === 'https://api.openai.com/v1/audio/transcriptions') {
      transcribeCalls++;
      if (transcribeCalls === 1) {
        return new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429 });
      }
      return new Response(JSON.stringify(transcriptionUpstream().body), { status: 200 });
    }
    if (url === 'https://api.openai.com/v1/responses') {
      return new Response(JSON.stringify(responsesUpstream(textAssessmentPayload()).body), { status: 200 });
    }
    if (url === 'https://api.openai.com/v1/chat/completions') {
      return new Response(JSON.stringify(pronToolCallResponse(pronunciationPayload())), { status: 200 });
    }
    throw new Error(`FakeFetch: unexpected request ${url}`);
  }) as typeof fetch;
  const handler = createHandler({ fetch: fetchStub, sleep: async (ms: number) => { sleeps.push(ms); } });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 200);
  assert.equal(transcribeCalls, 2);
  assert.deepEqual(sleeps, [15000]);
});

test('hybrid: transcription 429 with a retry-after: 5 header waits 5000ms instead of the 15000ms default', async () => {
  let transcribeCalls = 0;
  const sleeps: number[] = [];
  const fetchStub = (async (input: unknown) => {
    const url = String(input);
    if (url === 'https://api.openai.com/v1/audio/transcriptions') {
      transcribeCalls++;
      if (transcribeCalls === 1) {
        return new Response(JSON.stringify({ error: { message: 'rate limited' } }), {
          status: 429,
          headers: { 'retry-after': '5' },
        });
      }
      return new Response(JSON.stringify(transcriptionUpstream().body), { status: 200 });
    }
    if (url === 'https://api.openai.com/v1/responses') {
      return new Response(JSON.stringify(responsesUpstream(textAssessmentPayload()).body), { status: 200 });
    }
    if (url === 'https://api.openai.com/v1/chat/completions') {
      return new Response(JSON.stringify(pronToolCallResponse(pronunciationPayload())), { status: 200 });
    }
    throw new Error(`FakeFetch: unexpected request ${url}`);
  }) as typeof fetch;
  const handler = createHandler({ fetch: fetchStub, sleep: async (ms: number) => { sleeps.push(ms); } });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 200);
  assert.deepEqual(sleeps, [5000]);
});

test('hybrid: three 429s in a row exhaust retries, still return the busy error, and sleep was called twice (15000 then 30000)', async () => {
  let transcribeCalls = 0;
  const sleeps: number[] = [];
  const fetchStub = (async (input: unknown) => {
    const url = String(input);
    if (url === 'https://api.openai.com/v1/audio/transcriptions') {
      transcribeCalls++;
      return new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429 });
    }
    throw new Error(`FakeFetch: unexpected request ${url}`);
  }) as typeof fetch;
  const handler = createHandler({ fetch: fetchStub, sleep: async (ms: number) => { sleeps.push(ms); } });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 429);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /busy right now/);
  assert.equal(transcribeCalls, 3);
  assert.deepEqual(sleeps, [15000, 30000]);
});

test('hybrid: transcription 400 is not retried (fetch called once, sleep never called)', async () => {
  let transcribeCalls = 0;
  const sleeps: number[] = [];
  const fetchStub = (async (input: unknown) => {
    const url = String(input);
    if (url === 'https://api.openai.com/v1/audio/transcriptions') {
      transcribeCalls++;
      return new Response(JSON.stringify({ error: { message: 'bad request' } }), { status: 400 });
    }
    throw new Error(`FakeFetch: unexpected request ${url}`);
  }) as typeof fetch;
  const handler = createHandler({ fetch: fetchStub, sleep: async (ms: number) => { sleeps.push(ms); } });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 502);
  assert.equal(transcribeCalls, 1);
  assert.deepEqual(sleeps, []);
});

test('hybrid: a 429 whose body reports insufficient_quota is not retried and maps to a 503 "temporarily unavailable" message', async () => {
  let transcribeCalls = 0;
  const sleeps: number[] = [];
  const fetchStub = (async (input: unknown) => {
    const url = String(input);
    if (url === 'https://api.openai.com/v1/audio/transcriptions') {
      transcribeCalls++;
      return new Response(
        JSON.stringify({
          error: {
            type: 'insufficient_quota',
            code: 'credit_balance_exhausted',
            message: 'You have no credits remaining to run this request.',
          },
        }),
        { status: 429 },
      );
    }
    throw new Error(`FakeFetch: unexpected request ${url}`);
  }) as typeof fetch;
  const handler = createHandler({ fetch: fetchStub, sleep: async (ms: number) => { sleeps.push(ms); } });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 503);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /temporarily unavailable/i);
  assert.equal(transcribeCalls, 1);
  assert.deepEqual(sleeps, []);
});

test('hybrid: an incomplete text-grading response (no output_text) is a 502', async () => {
  const fetchStub = makeFakeFetch({
    transcribe: transcriptionUpstream(),
    responses: { status: 200, body: { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [] } },
    openai: { status: 200, body: pronToolCallResponse(pronunciationPayload()) },
  });
  const handler = createHandler({ fetch: fetchStub });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 502);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /unusable assessment/);
});

test('hybrid: a missing pronunciation tool call is a 502', async () => {
  const fetchStub = makeFakeFetch({
    transcribe: transcriptionUpstream(),
    responses: responsesUpstream(textAssessmentPayload()),
    openai: { status: 200, body: { choices: [{ message: {} }] } },
  });
  const handler = createHandler({ fetch: fetchStub });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 502);
});

// ---- 'audio' mode: the original single-call path, kept as an option ----

test("OPENAI_SPEAKING_MODE 'audio' still takes the old single-call path and sends a correctly-shaped OpenAI call", async () => {
  const calls: FakeCall[] = [];
  const fetchStub = makeFakeFetch({
    openai: { status: 200, body: openAiToolCallResponse(assessmentPayload()) },
    calls,
  });
  const handler = createHandler({ fetch: fetchStub });
  const res = await handler.fetch(req(interviewBody('audio/mpeg')), openAiEnv({ GRADING_SAMPLES: '1', OPENAI_SPEAKING_MODE: 'audio' }));

  assert.equal(res.status, 200);
  const data = (await res.json()) as { criteria: Record<string, { band: number; comment: string; evidence?: unknown }> };
  assert.equal(data.criteria.fluencyCoherence.band, 7);
  assert.equal(data.criteria.fluencyCoherence.evidence, undefined);

  assert.equal(calls.length, 1);
  const call = calls[0]!;
  assert.equal(call.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(call.headers.get('Authorization'), `Bearer ${DUMMY_OPENAI_KEY}`);
  const body = call.body as {
    model: string;
    tool_choice: unknown;
    tools: { function: { name: string; strict: boolean } }[];
    messages: { role: string; content: unknown }[];
  };
  assert.equal(body.model, 'gpt-audio-1.5');
  assert.deepEqual(body.tool_choice, { type: 'function', function: { name: 'submit_assessment' } });
  assert.equal(body.tools[0]!.function.strict, true);
  assert.equal(body.messages[0]!.role, 'system');
  assert.match(String(body.messages[0]!.content), /IELTS SPEAKING BAND DESCRIPTORS/);

  const userContent = body.messages[1]!.content as { type: string; input_audio?: { format: string } }[];
  const audioParts = userContent.filter((p) => p.type === 'input_audio');
  assert.equal(audioParts.length, 1);
  assert.equal(audioParts[0]!.input_audio!.format, 'mp3');
});

test("OPENAI_SPEAKING_MODE 'audio': audio/wav maps to the wav format", async () => {
  const calls: FakeCall[] = [];
  const fetchStub = makeFakeFetch({ openai: { status: 200, body: openAiToolCallResponse(assessmentPayload()) }, calls });
  const handler = createHandler({ fetch: fetchStub });
  const res = await handler.fetch(req(interviewBody('audio/wav')), openAiEnv({ GRADING_SAMPLES: '1', OPENAI_SPEAKING_MODE: 'audio' }));
  assert.equal(res.status, 200);
  const body = calls[0]!.body as { messages: { content: unknown }[] };
  const userContent = body.messages[1]!.content as { type: string; input_audio?: { format: string } }[];
  const audioParts = userContent.filter((p) => p.type === 'input_audio');
  assert.equal(audioParts[0]!.input_audio!.format, 'wav');
});

test("OPENAI_SPEAKING_MODE 'audio': a missing tool call in the OpenAI response is a 502", async () => {
  const fetchStub = makeFakeFetch({ openai: { status: 200, body: { choices: [{ message: {} }] } } });
  const handler = createHandler({ fetch: fetchStub });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1', OPENAI_SPEAKING_MODE: 'audio' }));
  assert.equal(res.status, 502);
});

test("OPENAI_SPEAKING_MODE 'audio': OpenAI 429 maps to 429 (after exhausting retries; sleep stubbed so the test stays fast)", async () => {
  const fetchStub = makeFakeFetch({ openai: { status: 429, body: { error: { message: 'rate limited' } } } });
  const handler = createHandler({ fetch: fetchStub, sleep: async () => {} });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1', OPENAI_SPEAKING_MODE: 'audio' }));
  assert.equal(res.status, 429);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /busy right now/);
});

test("OPENAI_SPEAKING_MODE 'audio': OpenAI 401 maps to a 502 \"key was rejected\" message", async () => {
  const fetchStub = makeFakeFetch({ openai: { status: 401, body: { error: { message: 'invalid_api_key' } } } });
  const handler = createHandler({ fetch: fetchStub });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1', OPENAI_SPEAKING_MODE: 'audio' }));
  assert.equal(res.status, 502);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /key was rejected/);
});

// ---- gemini rollback ----

test('GRADER_PROVIDER=gemini calls the Gemini endpoint with the same rubric', async () => {
  const calls: FakeCall[] = [];
  const fetchStub = makeFakeFetch({ gemini: { status: 200, body: geminiResponse(assessmentPayload()) }, calls });
  const handler = createHandler({ fetch: fetchStub });
  const res = await handler.fetch(req(interviewBody()), geminiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 200);

  assert.equal(calls.length, 1);
  const call = calls[0]!;
  assert.match(call.url, /^https:\/\/generativelanguage\.googleapis\.com\//);
  assert.equal(call.headers.get('x-goog-api-key'), DUMMY_GEMINI_KEY);
  const body = call.body as { system_instruction: { parts: { text: string }[] } };
  assert.match(body.system_instruction.parts[0]!.text, /IELTS SPEAKING BAND DESCRIPTORS/);
});

// ---- buildOpenAiRequest ('audio' mode request builder) ----

test('a part1 request with two clips produces two input_audio parts in order, each preceded by its question text', () => {
  const body = buildOpenAiRequest(openAiEnv(), part1Body('audio/mpeg') as never);
  const userContent = (body.messages as { role: string; content: unknown }[])[1]!.content as {
    type: string;
    text?: string;
    input_audio?: { format: string };
  }[];

  // Expect: [intro text, Q1 text, Q1 audio, Q2 text, Q2 audio]
  const audioIndexes = userContent.map((p, i) => (p.type === 'input_audio' ? i : -1)).filter((i) => i !== -1);
  assert.equal(audioIndexes.length, 2);
  assert.equal(userContent[audioIndexes[0]! - 1]!.text, 'Q1: Do you work or study?');
  assert.equal(userContent[audioIndexes[1]! - 1]!.text, 'Q2: What do you like about it?');
  assert.ok(audioIndexes[0]! < audioIndexes[1]!);
});

// ---- parseOpenAiToolCall unit coverage ----

test('parseOpenAiToolCall returns null when no tool call is present', () => {
  assert.equal(parseOpenAiToolCall({ choices: [{ message: {} }] }), null);
});

test('parseOpenAiToolCall parses and validates a well-formed tool call', () => {
  const parsed = parseOpenAiToolCall(openAiToolCallResponse(assessmentPayload()));
  assert.ok(parsed);
  const criteria = (parsed as { criteria: Record<string, { band: number }> }).criteria;
  assert.equal(criteria.fluencyCoherence.band, 7);
});

// ---- computeTimingStats unit coverage ----

test('computeTimingStats: two words with a 1.2 s gap counts as one pause', () => {
  const stats = computeTimingStats(
    [
      { word: 'Hello', start: 0, end: 0.5 },
      { word: 'there', start: 1.7, end: 2.0 },
    ],
    2.0,
  );
  assert.equal(stats.pauseCount, 1);
  assert.equal(stats.longPauseCount, 0);
});

test('computeTimingStats: a 2.5 s gap is counted as 2 s or more', () => {
  const stats = computeTimingStats(
    [
      { word: 'Hello', start: 0, end: 0.5 },
      { word: 'there', start: 3.0, end: 3.3 },
    ],
    3.3,
  );
  assert.equal(stats.pauseCount, 1);
  assert.equal(stats.longPauseCount, 1);
  assert.equal(stats.longestPause, 2.5);
});

test('computeTimingStats: "um" is counted as a filled pause', () => {
  const stats = computeTimingStats(
    [
      { word: 'Well', start: 0, end: 0.3 },
      { word: 'um', start: 0.4, end: 0.6 },
      { word: 'yes', start: 0.7, end: 0.9 },
    ],
    0.9,
  );
  assert.equal(stats.filledPauses, 1);
});

test('computeTimingStats: no words returns the "no word timings available" line', () => {
  const stats = computeTimingStats([], 0);
  assert.equal(stats.line, 'no word timings available');
});

// ---- buildTranscriptionForm unit coverage ----

test('buildTranscriptionForm builds a multipart form with the model, verbose_json, word timestamps, and the clip as a file', () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const form = buildTranscriptionForm(bytes, 'audio/mpeg', 'whisper-1');
  assert.equal(form.get('model'), 'whisper-1');
  assert.equal(form.get('response_format'), 'verbose_json');
  assert.equal(form.get('timestamp_granularities[]'), 'word');
  assert.equal(typeof form.get('prompt'), 'string');
  const file = form.get('file') as File;
  assert.equal(file.name, 'clip.mp3');
  assert.equal(file.type, 'audio/mpeg');
});

test('buildTranscriptionForm names a wav clip clip.wav', () => {
  const form = buildTranscriptionForm(new Uint8Array([1]), 'audio/wav', 'whisper-1');
  const file = form.get('file') as File;
  assert.equal(file.name, 'clip.wav');
});

test('buildTranscriptionForm defaults to diarized_json with chunking_strategy auto for the diarize model, no word timestamps', () => {
  const form = buildTranscriptionForm(new Uint8Array([1, 2, 3]), 'audio/mpeg', 'gpt-4o-transcribe-diarize');
  assert.equal(form.get('model'), 'gpt-4o-transcribe-diarize');
  assert.equal(form.get('response_format'), 'diarized_json');
  assert.equal(form.get('chunking_strategy'), 'auto');
  assert.equal(form.get('timestamp_granularities[]'), null);
});

test('buildTranscriptionForm keeps the old verbose_json word-timestamp form for whisper-1, no chunking_strategy', () => {
  const form = buildTranscriptionForm(new Uint8Array([1, 2, 3]), 'audio/mpeg', 'whisper-1');
  assert.equal(form.get('response_format'), 'verbose_json');
  assert.equal(form.get('timestamp_granularities[]'), 'word');
  assert.equal(form.get('chunking_strategy'), null);
});

// ---- selectCandidateSpeaker / computeSegmentStats unit coverage ----

test('selectCandidateSpeaker: two speakers, B talks 80% of the time, picks B', () => {
  const segments = [
    { text: 'Question one', speaker: 'A', start: 0, end: 2 },
    { text: 'Answer one', speaker: 'B', start: 2, end: 10 },
    { text: 'Question two', speaker: 'A', start: 10, end: 10.5 },
    { text: 'Answer two', speaker: 'B', start: 10.5, end: 12.5 },
  ];
  assert.equal(selectCandidateSpeaker(segments as never), 'B');
});

test('selectCandidateSpeaker: a single speaker is the candidate', () => {
  const segments = [{ text: 'Just one voice throughout', speaker: 'A', start: 0, end: 5 }];
  assert.equal(selectCandidateSpeaker(segments as never), 'A');
});

test('computeSegmentStats: a 3 s gap between two candidate segments with no other speaker between counts as one long pause', () => {
  const segments = [
    { text: 'Examiner question', speaker: 'A', start: 0, end: 2 },
    { text: 'Candidate answer one', speaker: 'B', start: 2, end: 5 },
    { text: 'Candidate answer two', speaker: 'B', start: 8, end: 11 },
  ];
  const stats = computeSegmentStats(segments as never, 'B', 11);
  assert.equal(stats.longPauseCount, 1);
  assert.equal(stats.longestPause, 3);
});

test("computeSegmentStats: a gap that contains the examiner's segment is not counted as a pause", () => {
  const segments = [
    { text: 'Candidate answer one', speaker: 'B', start: 0, end: 3 },
    { text: 'Examiner follow-up', speaker: 'A', start: 3, end: 5 },
    { text: 'Candidate answer two', speaker: 'B', start: 5, end: 8 },
  ];
  const stats = computeSegmentStats(segments as never, 'B', 8);
  assert.equal(stats.longPauseCount, 0);
});

test("computeSegmentStats: words per minute is computed over the candidate's speaking time only", () => {
  const segments = [
    { text: 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty', speaker: 'A', start: 0, end: 100 },
    { text: 'six seven eight nine ten', speaker: 'B', start: 100, end: 110 },
  ];
  const stats = computeSegmentStats(segments as never, 'B', 110);
  assert.equal(stats.wordCount, 5);
  assert.equal(stats.totalSpeakingSeconds, 10);
  assert.equal(stats.wpm, 30);
});

// ---- buildTextGradeRequest / buildPronunciationRequest / parseResponsesOutput unit coverage ----

test('buildTextGradeRequest uses the text model and strict json_schema, and lists each clip label, timing line and transcript', () => {
  const body = buildTextGradeRequest(openAiEnv(), interviewBody() as never, [
    {
      label: 'Live interview recording (candidate microphone, whole session)',
      statsLine: 'speech duration 10 s, 20 words, 120 words per minute; pauses of 0.7 s or more: 1 (longest 1.0 s; 0 of 2 s or more); filled pauses (um/uh/er): 0',
      transcript: 'This is what the candidate said.',
    },
  ]);
  assert.equal(body.model, 'gpt-5.6-sol');
  assert.equal(body.store, false);
  const reasoning = body.reasoning as { effort: string };
  assert.equal(reasoning.effort, 'medium');
  const userText = (body.input as { content: { text: string }[] }[])[0]!.content[0]!.text;
  assert.match(userText, /Live interview recording/);
  assert.match(userText, /words per minute/);
  assert.match(userText, /This is what the candidate said\./);
});

test('buildPronunciationRequest sends one input_audio part per clip after a short intro text, forcing submit_pronunciation', () => {
  const clips = [clip('Q1'), clip('Q2')];
  // Anchors off: this test is about the per-clip shape, not the
  // standardisation anchors (see the dedicated anchors tests below).
  const body = buildPronunciationRequest(openAiEnv({ OPENAI_SPEAKING_ANCHORS: 'off' }), part1Body('audio/mpeg') as never, clips);
  assert.equal(body.model, 'gpt-audio-1.5');
  assert.deepEqual(body.tool_choice, { type: 'function', function: { name: 'submit_pronunciation' } });
  const messages = body.messages as { role: string; content: unknown }[];
  const userContent = messages[1]!.content as { type: string }[];
  assert.equal(userContent[0]!.type, 'text');
  assert.equal(userContent.filter((p) => p.type === 'input_audio').length, 2);
});

test("buildTextGradeRequest's json_schema requires nextBand under each of the three text criteria and a top-level actionPlan", () => {
  const body = buildTextGradeRequest(openAiEnv(), interviewBody() as never, [
    {
      label: 'Live interview recording (candidate microphone, whole session)',
      statsLine: 'speech duration 10 s, 20 words, 120 words per minute; pauses of 0.7 s or more: 0 (longest 0 s; 0 of 2 s or more); filled pauses (um/uh/er): 0',
      transcript: 'This is what the candidate said.',
    },
  ]);
  const format = body.text as { format: { schema: { properties: Record<string, { required?: string[] }>; required: string[] } } };
  const schema = format.format.schema;
  for (const key of ['fluencyCoherence', 'lexicalResource', 'grammaticalRange']) {
    const criterionSchema = schema.properties[key]!;
    assert.ok(criterionSchema.required?.includes('nextBand'), `${key} schema should require nextBand`);
  }
  assert.ok(schema.properties.actionPlan, 'schema should declare actionPlan');
  assert.ok(schema.required.includes('actionPlan'), 'actionPlan should be required');
});

test("buildPronunciationRequest's submit_pronunciation tool schema requires nextBand", () => {
  const body = buildPronunciationRequest(openAiEnv({ OPENAI_SPEAKING_ANCHORS: 'off' }), part1Body('audio/mpeg') as never, [clip('Q1')]);
  const tool = (body.tools as { function: { parameters: { required: string[]; properties: Record<string, unknown> } } }[])[0]!;
  assert.ok(tool.function.parameters.required.includes('nextBand'));
  assert.ok(tool.function.parameters.properties.nextBand);
});

test("buildOpenAiRequest ('audio' mode) submit_assessment tool schema requires nextBand per criterion and a top-level actionPlan", () => {
  const body = buildOpenAiRequest(openAiEnv(), interviewBody() as never);
  const tool = (body.tools as {
    function: { parameters: { required: string[]; properties: { criteria: { properties: Record<string, { required?: string[] }> } } } };
  }[])[0]!;
  const params = tool.function.parameters;
  assert.ok(params.required.includes('actionPlan'));
  for (const key of ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'pronunciation']) {
    assert.ok(params.properties.criteria.properties[key]!.required?.includes('nextBand'), `${key} schema should require nextBand`);
  }
});

// ---- nextBand / actionPlan: assembly, malformed input, and trimming ----

test('hybrid: nextBand from the text and pronunciation calls and actionPlan from the text call pass through for all four criteria', async () => {
  const textPayload = textAssessmentPayload({ actionPlan: ['Fluency: pause less between ideas.', 'Practice a two-minute monologue daily this week.'] });
  (textPayload as Record<string, Record<string, unknown>>).fluencyCoherence.nextBand = nextBandPayload(8);
  const pronPayload = pronunciationPayload({ nextBand: nextBandPayload(8) });

  const fetchStub = makeFakeFetch({
    transcribe: transcriptionUpstream(),
    responses: responsesUpstream(textPayload),
    openai: { status: 200, body: pronToolCallResponse(pronPayload) },
  });
  const handler = createHandler({ fetch: fetchStub });
  const res = await handler.fetch(req(interviewBody()), openAiEnv({ GRADING_SAMPLES: '1', OPENAI_SPEAKING_ANCHORS: 'off' }));
  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    criteria: Record<string, { nextBand?: { target: number; gap: string; actions: { do: string; from: string; to: string }[] } }>;
    actionPlan: string[];
  };
  assert.equal(data.criteria.fluencyCoherence.nextBand?.target, 8);
  assert.equal(data.criteria.pronunciation.nextBand?.target, 8);
  assert.equal(data.criteria.lexicalResource.nextBand, undefined);
  assert.equal(data.actionPlan.length, 2);
  assert.match(data.actionPlan[0]!, /^Fluency:/);
});

test('parseOpenAiToolCall drops a malformed nextBand without failing the rest of the assessment', () => {
  const payload = assessmentPayload();
  (payload.criteria as Record<string, Record<string, unknown>>).fluencyCoherence.nextBand = {
    target: 'not-a-number',
    gap: 'gap text',
    actions: [],
  };
  const parsed = parseOpenAiToolCall(openAiToolCallResponse(payload)) as {
    criteria: Record<string, { band: number; nextBand?: unknown }>;
  };
  assert.ok(parsed);
  assert.equal(parsed.criteria.fluencyCoherence.nextBand, undefined);
  assert.equal(parsed.criteria.fluencyCoherence.band, 7);
  assert.equal(parsed.criteria.lexicalResource.band, 6);
});

test('nextBand and actionPlan fields are trimmed to their length caps, and actions/actionPlan are capped in count', () => {
  const longDo = 'd'.repeat(400);
  const longFrom = 'f'.repeat(400);
  const longTo = 't'.repeat(400);
  const manyActions = Array.from({ length: 6 }, (_, i) => ({ do: `${longDo}-${i}`, from: longFrom, to: longTo }));
  const manyActionPlanItems = Array.from({ length: 8 }, (_, i) => `${'p'.repeat(400)}-${i}`);

  const payload = assessmentPayload({ actionPlan: manyActionPlanItems });
  (payload.criteria as Record<string, Record<string, unknown>>).fluencyCoherence.nextBand = {
    target: 12,
    gap: 'g'.repeat(600),
    actions: manyActions,
  };

  const parsed = parseOpenAiToolCall(openAiToolCallResponse(payload)) as {
    criteria: Record<string, { nextBand?: { target: number; gap: string; actions: { do: string; from: string; to: string }[] } }>;
    actionPlan: string[];
  };
  const nextBand = parsed.criteria.fluencyCoherence.nextBand!;
  assert.equal(nextBand.target, 9);
  assert.equal(nextBand.gap.length, 500);
  assert.equal(nextBand.actions.length, 4);
  for (const action of nextBand.actions) {
    assert.ok(action.do.length <= 300);
    assert.ok(action.from.length <= 300);
    assert.ok(action.to.length <= 300);
  }
  assert.equal(parsed.actionPlan.length, 6);
  for (const step of parsed.actionPlan) {
    assert.ok(step.length <= 300);
  }
});

test('parseResponsesOutput extracts JSON from output_text and returns null for an incomplete or missing output', () => {
  const ok = parseResponsesOutput({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ a: 1 }) }] }] });
  assert.deepEqual(ok, { a: 1 });
  assert.equal(parseResponsesOutput({ status: 'incomplete', output: [] }), null);
  assert.equal(parseResponsesOutput({}), null);
});

// ---- examiner standardisation anchors ----

test('anchors.ts exports six entries sorted by band with non-empty transcript and audioBase64', () => {
  assert.equal(SPEAKING_ANCHORS.length, 6);
  for (let i = 1; i < SPEAKING_ANCHORS.length; i++) {
    assert.ok(SPEAKING_ANCHORS[i]!.band > SPEAKING_ANCHORS[i - 1]!.band, 'anchors must be sorted ascending by band');
  }
  for (const anchor of SPEAKING_ANCHORS) {
    assert.equal(typeof anchor.band, 'number');
    assert.ok(anchor.transcript.length > 0);
    assert.ok(anchor.audioBase64.length > 0);
  }
});

test("buildTextGradeRequest's instructions contain EXAMINER STANDARDISATION and the band 8 anchor's transcript when anchors are on, and omit both when OPENAI_SPEAKING_ANCHORS is 'off'", () => {
  const transcripts = [
    {
      label: 'Live interview recording (candidate microphone, whole session)',
      statsLine:
        'speech duration 10 s, 20 words, 120 words per minute; pauses of 0.7 s or more: 1 (longest 1.0 s; 0 of 2 s or more); filled pauses (um/uh/er): 0',
      transcript: 'This is what the candidate said.',
    },
  ];
  const band8 = SPEAKING_ANCHORS.find((a) => a.band === 8)!;
  const band8FirstSixWords = band8.transcript.trim().split(/\s+/).slice(0, 6).join(' ');

  const onBody = buildTextGradeRequest(openAiEnv(), interviewBody() as never, transcripts);
  const onInstructions = String(onBody.instructions);
  assert.match(onInstructions, /EXAMINER STANDARDISATION/);
  assert.ok(onInstructions.includes(band8FirstSixWords), 'expected the band 8 anchor\'s opening words in the instructions');

  const offBody = buildTextGradeRequest(openAiEnv({ OPENAI_SPEAKING_ANCHORS: 'off' }), interviewBody() as never, transcripts);
  const offInstructions = String(offBody.instructions);
  assert.equal(/EXAMINER STANDARDISATION/.test(offInstructions), false);
  assert.equal(offInstructions.includes(band8FirstSixWords), false);
});

test("buildPronunciationRequest puts six reference input_audio parts (each with a matching \"examiner band\" text label) before the candidate's own audio when anchors are on, and only the candidate's parts when OPENAI_SPEAKING_ANCHORS is 'off'", () => {
  const clips = [clip('Q1'), clip('Q2')];

  const onBody = buildPronunciationRequest(openAiEnv(), part1Body('audio/mpeg') as never, clips);
  const onContent = (onBody.messages as { role: string; content: unknown }[])[1]!.content as { type: string; text?: string }[];
  const onAudioIndexes = onContent.map((p, i) => (p.type === 'input_audio' ? i : -1)).filter((i) => i !== -1);
  assert.equal(onAudioIndexes.length, 8); // 6 references + 2 candidate clips
  for (let i = 0; i < 6; i++) {
    const label = onContent[onAudioIndexes[i]! - 1]!;
    assert.equal(label.type, 'text');
    assert.match(String(label.text), /examiner band/);
  }
  // The two candidate clips come after all six reference clips.
  assert.ok(onAudioIndexes[5]! < onAudioIndexes[6]!);
  const onReferenceLabelCount = onContent.filter((p) => p.type === 'text' && /examiner band/.test(String(p.text))).length;
  assert.equal(onReferenceLabelCount, 6);

  const offBody = buildPronunciationRequest(openAiEnv({ OPENAI_SPEAKING_ANCHORS: 'off' }), part1Body('audio/mpeg') as never, clips);
  const offContent = (offBody.messages as { role: string; content: unknown }[])[1]!.content as { type: string; text?: string }[];
  assert.equal(offContent.filter((p) => p.type === 'input_audio').length, 2);
  assert.equal(offContent.filter((p) => p.type === 'text' && /examiner band/.test(String(p.text))).length, 0);
});

// sanity: defaultDeps wires the real fetch (not exercised against the network here).
// It can never be reference-equal to the bare global fetch. It's
// intentionally a wrapping arrow function (see the comment on defaultDeps:
// calling the global fetch through an object property throws "Illegal
// invocation" in the Workers runtime), so this checks delegation instead.
test('defaultDeps.fetch delegates to the global fetch', async () => {
  const original = globalThis.fetch;
  let seenInput: unknown;
  globalThis.fetch = (async (input: unknown) => {
    seenInput = input;
    return new Response('ok');
  }) as typeof fetch;
  try {
    const res = await defaultDeps.fetch('https://example.com/probe', { method: 'GET' });
    assert.equal(await res.text(), 'ok');
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(seenInput, 'https://example.com/probe');
});

test('validateAssessment replaces em and en dashes and strips model-added numbering from the action plan', () => {
  const crit = { band: 6, comment: 'Clear — mostly', tip: 'Check subject–verb agreement', nextBand: { target: 7, gap: 'g', actions: [{ do: 'Give 2–3 reasons', from: '', to: '' }] } };
  const raw = {
    criteria: { fluencyCoherence: crit, lexicalResource: crit, grammaticalRange: crit, pronunciation: crit },
    moments: [],
    strengths: [],
    improvements: [],
    actionPlan: ['1. Fluency — keep going', '2) Grammar: past simple', 'Step 3: record yourself'],
  };
  const out = validateAssessment(raw) as Record<string, any>;
  const text = JSON.stringify(out);
  assert.ok(!text.includes('\u2014') && !text.includes('\u2013'), 'no dashes survive');
  assert.equal(out.criteria.fluencyCoherence.nextBand.actions[0].do, 'Give 2-3 reasons');
  assert.deepEqual(out.actionPlan, ['Fluency, keep going', 'Grammar: past simple', 'record yourself']);
});
